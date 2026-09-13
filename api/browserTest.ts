import fs from 'node:fs';
import dns from 'node:dns/promises';

export interface BrowserTestEvent {
  type: 'status' | 'request' | 'console' | 'complete' | 'error';
  message?: string;
  data?: Record<string, unknown>;
}

export interface BrowserTestResult {
  targetUrl: string;
  finalUrl: string;
  title: string;
  pageLoaded: boolean;
  loadTimeMs: number;
  wordpressDetected: boolean;
  jetpack: { status: 'detected' | 'installed-no-request' | 'not-detected'; requests: number; scriptRequests: number };
  googleAnalytics: { status: 'detected' | 'installed-no-request' | 'not-detected'; requests: number; scriptRequests: number };
  otherAnalytics: string[];
  requestsObserved: number;
  consoleErrors: number;
  blockedRequests: number;
  notes: string[];
}

const PRIVATE_HOST_CACHE = new Map<string, boolean>();

function isPrivateAddress(address: string): boolean {
  const normalized = address.replace(/^::ffff:/, '').toLowerCase();
  const ipv4 = normalized.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b, c, d] = ipv4.slice(1).map(Number);
    if ([a, b, c, d].some((part) => part > 255)) return true;
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  return normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80:');
}

async function isPublicHost(hostname: string): Promise<boolean> {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || isPrivateAddress(host)) return false;
  if (PRIVATE_HOST_CACHE.has(host)) return !PRIVATE_HOST_CACHE.get(host);
  try {
    const addresses = await dns.lookup(host, { all: true });
    const blocked = !addresses.length || addresses.some((entry) => isPrivateAddress(entry.address));
    PRIVATE_HOST_CACHE.set(host, blocked);
    return !blocked;
  } catch {
    PRIVATE_HOST_CACHE.set(host, true);
    return false;
  }
}

function isJetpackRequest(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'stats.wp.com' || parsed.hostname === 'pixel.wp.com' || (parsed.hostname.endsWith('.wordpress.com') && /\/stats\//i.test(parsed.pathname));
  } catch { return false; }
}

function isJetpackScript(url: string): boolean {
  try { const parsed = new URL(url); return parsed.hostname === 'stats.wp.com' && /\.(js|mjs)(\?|$)/i.test(parsed.pathname); } catch { return false; }
}

function isGoogleAnalyticsRequest(url: string): boolean {
  try {
    const parsed = new URL(url);
    return /(^|\.)google-analytics\.com$/i.test(parsed.hostname) || /(^|\.)analytics\.google\.com$/i.test(parsed.hostname);
  } catch { return false; }
}

function isGoogleAnalyticsScript(url: string): boolean {
  try {
    const parsed = new URL(url);
    return /(^|\.)googletagmanager\.com$/i.test(parsed.hostname) && /gtag|gtm|analytics/i.test(parsed.pathname + parsed.search);
  } catch { return false; }
}

function otherAnalyticsProvider(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    if (host.includes('plausible.io') || host.includes('plausible')) return 'Plausible';
    if (host.includes('matomo') || path.endsWith('/matomo.php')) return 'Matomo';
    if (host.includes('segment.io') || host.includes('segment.com')) return 'Segment';
    if (host.includes('mixpanel.com')) return 'Mixpanel';
    if (host.includes('amplitude.com')) return 'Amplitude';
    if (host.includes('clarity.ms')) return 'Microsoft Clarity';
    if (host.includes('hotjar.com')) return 'Hotjar';
    if (host.includes('heap.io') || host.includes('heapanalytics.com')) return 'Heap';
    return null;
  } catch { return null; }
}

function localChromePath(): string | undefined {
  const candidates = [
    process.env.CHROME_EXECUTABLE_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined,
    process.platform === 'win32' ? 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe' : undefined,
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean) as string[];
  return candidates.find((candidate) => fs.existsSync(candidate));
}

async function launchBrowser() {
  const [{ default: puppeteer }, { default: chromium }] = await Promise.all([
    import('puppeteer-core'),
    import('@sparticuz/chromium-min'),
  ]);

  const executablePath = localChromePath();
  if (executablePath) {
    return puppeteer.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  }

  const packUrl = process.env.CHROMIUM_PACK_URL || 'https://github.com/Sparticuz/chromium/releases/download/v153.0.0/chromium-v153.0.0-pack.tar';
  const remoteExecutable = await chromium.executablePath(packUrl);
  return puppeteer.launch({
    headless: 'shell',
    executablePath: remoteExecutable,
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
  });
}

export async function runBrowserTest(rawTarget: string, emit: (event: BrowserTestEvent) => void): Promise<BrowserTestResult> {
  let target: URL;
  try { target = new URL(rawTarget); } catch { throw new Error('Invalid target URL.'); }
  if (!['http:', 'https:'].includes(target.protocol)) throw new Error('Target must use HTTP or HTTPS.');
  if (target.username || target.password) throw new Error('Credential-bearing target URLs are not supported.');
  if (!(await isPublicHost(target.hostname))) throw new Error('Target must resolve to a public address.');

  const startedAt = Date.now();
  let browser: Awaited<ReturnType<typeof launchBrowser>> | undefined;
  const requests = new Set<string>();
  const jetpackRequests = new Set<string>();
  const jetpackScripts = new Set<string>();
  const gaRequests = new Set<string>();
  const gaScripts = new Set<string>();
  const otherProviders = new Set<string>();
  let consoleErrors = 0;
  let blockedRequests = 0;
  let pageLoaded = false;
  let finalUrl = target.toString();
  let title = '';
  let wordpressDetected = false;

  try {
    emit({ type: 'status', message: 'Starting Chromium browser…' });
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.setRequestInterception(true);

    page.on('request', async (request) => {
      const url = request.url();
      let allowed = true;
      try {
        const parsed = new URL(url);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') allowed = await isPublicHost(parsed.hostname);
        else if (!['about:', 'data:', 'blob:'].includes(parsed.protocol)) allowed = false;
      } catch { allowed = false; }

      if (!allowed) {
        blockedRequests += 1;
        emit({ type: 'request', message: `Blocked private or unsupported request: ${url}` });
        request.abort().catch(() => undefined);
        return;
      }

      requests.add(url);
      const jetpack = isJetpackRequest(url);
      const jetpackScript = isJetpackScript(url);
      const ga = isGoogleAnalyticsRequest(url);
      const gaScript = isGoogleAnalyticsScript(url);
      const other = otherAnalyticsProvider(url);
      if (jetpack) jetpackRequests.add(url);
      if (jetpackScript) jetpackScripts.add(url);
      if (ga) gaRequests.add(url);
      if (gaScript) gaScripts.add(url);
      if (other) otherProviders.add(other);
      if (jetpack || ga || other) emit({ type: 'request', message: `Analytics request: ${new URL(url).hostname}`, data: { url, provider: jetpack ? 'Jetpack' : ga ? 'Google Analytics' : other } });
      request.continue().catch(() => undefined);
    });

    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors += 1;
        emit({ type: 'console', message: message.text() });
      }
    });

    emit({ type: 'status', message: 'Opening target page…' });
    try {
      await page.goto(target.toString(), { waitUntil: 'domcontentloaded', timeout: 12000 });
      pageLoaded = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Navigation failed';
      if (!/timeout/i.test(message)) throw error;
      emit({ type: 'status', message: 'Page is still loading; continuing verification…' });
      pageLoaded = true;
    }

    finalUrl = page.url();
    title = await page.title().catch(() => '');
    wordpressDetected = await page.evaluate(() => {
      const generator = document.querySelector('meta[name="generator"]')?.getAttribute('content') || '';
      const html = document.documentElement.innerHTML.slice(0, 250000);
      return /wordpress/i.test(generator) || /(?:wp-content|wp-includes|wp-json)/i.test(html);
    }).catch(() => false);

    emit({ type: 'status', message: 'Waiting for page analytics to fire…' });
    await new Promise((resolve) => setTimeout(resolve, 3500));

    const installedSignals = await page.evaluate(() => {
      const scripts = Array.from(document.scripts).map((script) => script.src).filter(Boolean);
      const html = document.documentElement.innerHTML.slice(0, 300000);
      return {
        jetpack: scripts.some((src) => /stats\.wp\.com|pixel\.wp\.com/i.test(src)) || /stats\.wp\.com|pixel\.wp\.com/i.test(html),
        google: scripts.some((src) => /googletagmanager\.com|google-analytics\.com|gtag\(/i.test(src)) || /googletagmanager\.com|google-analytics\.com|gtag\(/i.test(html),
      };
    }).catch(() => ({ jetpack: false, google: false }));

    const jetpackStatus = jetpackRequests.size ? 'detected' : installedSignals.jetpack ? 'installed-no-request' : 'not-detected';
    const gaStatus = gaRequests.size ? 'detected' : installedSignals.google ? 'installed-no-request' : 'not-detected';
    const notes: string[] = [];
    if (jetpackStatus === 'detected') notes.push('Jetpack Stats made a browser request to WordPress.com infrastructure.');
    else if (jetpackStatus === 'installed-no-request') notes.push('Jetpack signals were found in the page, but no tracking request was observed during the test window.');
    if (gaStatus === 'detected') notes.push('Google Analytics made a browser request during the test.');
    else if (gaStatus === 'installed-no-request') notes.push('Google Analytics signals were found, but no collection request was observed during the test window.');
    if (!jetpackRequests.size && !gaRequests.size && otherProviders.size === 0) notes.push('No supported analytics network request was observed. Consent, blockers, configuration, or delayed tracking can cause this.');
    notes.push('This test verifies browser-side analytics execution; it does not manufacture or guarantee an analytics view.');

    const result: BrowserTestResult = {
      targetUrl: target.toString(),
      finalUrl,
      title,
      pageLoaded,
      loadTimeMs: Date.now() - startedAt,
      wordpressDetected,
      jetpack: { status: jetpackStatus, requests: jetpackRequests.size, scriptRequests: jetpackScripts.size },
      googleAnalytics: { status: gaStatus, requests: gaRequests.size, scriptRequests: gaScripts.size },
      otherAnalytics: [...otherProviders],
      requestsObserved: requests.size,
      consoleErrors,
      blockedRequests,
      notes,
    };
    emit({ type: 'complete', data: result as unknown as Record<string, unknown> });
    return result;
  } finally {
    if (browser) await browser.close().catch(() => undefined);
  }
}
