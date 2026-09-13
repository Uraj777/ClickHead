import express from 'express';
import path from 'path';
import http from 'http';
import https from 'https';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// List of realistic modern user agents
const USER_AGENTS = [
  {
    name: 'Chrome 128 (Windows 11)',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    secChUa: '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
    platform: '"Windows"',
  },
  {
    name: 'Chrome 128 (macOS Sonoma)',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    secChUa: '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
    platform: '"macOS"',
  },
  {
    name: 'Safari 17.5 (macOS Sonoma)',
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
    secChUa: '',
    platform: '"macOS"',
  },
  {
    name: 'Firefox 129 (Windows 11)',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:129.0) Gecko/20100101 Firefox/129.0',
    secChUa: '',
    platform: '"Windows"',
  },
  {
    name: 'Edge 128 (Windows 11)',
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0',
    secChUa: '"Chromium";v="128", "Microsoft Edge";v="128", "Not;A=Brand";v="24"',
    platform: '"Windows"',
  },
  {
    name: 'Safari 17.5 (iPhone iOS 17.5)',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    secChUa: '',
    platform: '"iOS"',
  },
  {
    name: 'Chrome 128 (Android 14)',
    ua: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.88 Mobile Safari/537.36',
    secChUa: '"Chromium";v="128", "Google Chrome";v="128", "Not;A=Brand";v="24"',
    platform: '"Android"',
  },
];

// Diurnal hourly human traffic curve weights (Hour 0 to Hour 23)
const DIURNAL_WEIGHTS = [
  0.020, 0.015, 0.012, 0.010, 0.012, 0.020, // 00:00 - 05:00 Night
  0.035, 0.048, 0.058, 0.062, 0.065, 0.068, // 06:00 - 11:00 Morning
  0.066, 0.069, 0.073, 0.075, 0.072, 0.068, // 12:00 - 17:00 Afternoon Peak
  0.065, 0.060, 0.052, 0.042, 0.032, 0.021, // 18:00 - 23:00 Evening
];

// Active running tasks map for stop/abort functionality
const activeSessions = new Map<string, { abort: () => void }>();

// In-memory view counter state for live testing
interface VisitRecord {
  id: number;
  timestamp: string;
  userAgent: string;
  referer: string;
  ip: string;
  path: string;
  secChUa?: string;
}

let serverViewCounter = 0;
const recentVisits: VisitRecord[] = [];

// API: Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// API: Record view / hit (Supports GET and POST for Go CLI and Web tests)
app.all(['/api/test/visit', '/api/test-counter', '/api/counter'], (req, res) => {
  serverViewCounter++;
  const visit: VisitRecord = {
    id: serverViewCounter,
    timestamp: new Date().toISOString(),
    userAgent: (req.headers['user-agent'] as string) || 'Unknown User-Agent',
    referer: (req.headers['referer'] as string) || 'Direct Visit (No Referer)',
    ip: req.ip || (req.socket.remoteAddress as string) || '127.0.0.1',
    path: req.originalUrl || req.url,
    secChUa: (req.headers['sec-ch-ua'] as string) || undefined,
  };

  recentVisits.unshift(visit);
  if (recentVisits.length > 200) {
    recentVisits.pop();
  }

  // If request is from browser expecting HTML, or curl expecting text/json
  if (req.accepts('html') && !req.accepts('json')) {
    res.redirect('/test-page');
    return;
  }

  res.json({
    success: true,
    totalViews: serverViewCounter,
    currentVisit: visit,
    message: `View successfully registered (#${serverViewCounter})`,
  });
});

// API: Get view count stats
app.get('/api/test/stats', (req, res) => {
  res.json({
    totalViews: serverViewCounter,
    recentVisits: recentVisits.slice(0, 50),
    lastVisit: recentVisits[0] || null,
  });
});

// API: Reset view counter
app.post('/api/test/reset', (req, res) => {
  serverViewCounter = 0;
  recentVisits.length = 0;
  res.json({
    success: true,
    totalViews: 0,
    message: 'View counter reset to 0',
  });
});

// API: Batch simulate hits (e.g. inject 10, 50, 100 hits directly)
app.all('/api/test/batch-visit', (req, res) => {
  const count = Math.min(500, Math.max(1, parseInt(req.body?.count || (req.query?.count as string), 10) || 50));
  const created: VisitRecord[] = [];
  
  for (let i = 0; i < count; i++) {
    serverViewCounter++;
    const uaObj = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    const referers = [
      'https://www.google.com/search?q=organic+traffic+test',
      'https://t.co/xyz789',
      'https://www.bing.com/search',
      'https://news.ycombinator.com/',
      'Direct Visit (Bookmark/Direct Type)',
    ];
    const ref = referers[Math.floor(Math.random() * referers.length)];
    const visit: VisitRecord = {
      id: serverViewCounter,
      timestamp: new Date(Date.now() - (count - i) * 150).toISOString(),
      userAgent: uaObj.ua,
      referer: ref,
      ip: `198.51.100.${Math.floor(Math.random() * 250) + 1}`,
      path: '/api/test/visit',
      secChUa: uaObj.secChUa,
    };
    recentVisits.unshift(visit);
    created.push(visit);
  }

  if (recentVisits.length > 200) {
    recentVisits.length = 200;
  }

  res.json({
    success: true,
    added: count,
    totalViews: serverViewCounter,
    recentVisits: recentVisits.slice(0, 50),
    message: `Registered ${count} views successfully. Total views is now ${serverViewCounter}.`,
  });
});

// Standalone Independent Test Page (100% independent from main React app)
app.get('/test-page', (req, res) => {
  serverViewCounter++;
  const visit: VisitRecord = {
    id: serverViewCounter,
    timestamp: new Date().toISOString(),
    userAgent: (req.headers['user-agent'] as string) || 'Browser Visit',
    referer: (req.headers['referer'] as string) || 'Direct Navigation',
    ip: req.ip || (req.socket.remoteAddress as string) || '127.0.0.1',
    path: '/test-page',
    secChUa: (req.headers['sec-ch-ua'] as string) || undefined,
  };
  recentVisits.unshift(visit);
  if (recentVisits.length > 200) recentVisits.pop();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ClickHead &bull; Standalone View Counter Test Page</title>
  <style>
    :root {
      --bg: #07110C;
      --card-bg: #0C1A12;
      --border: #1E3E2B;
      --accent: #B4F82C;
      --text: #E8EDE0;
      --text-muted: #9BB0A3;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem 1rem;
    }
    .container {
      width: 100%;
      max-width: 800px;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: #152E20;
      color: var(--accent);
      border: 1px solid #27533B;
      padding: 0.35rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      font-family: monospace;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      align-self: flex-start;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      background: var(--accent);
      border-radius: 50%;
      box-shadow: 0 0 8px var(--accent);
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }
    .card {
      background: var(--card-bg);
      border: 2px solid var(--border);
      border-radius: 1.5rem;
      padding: 2rem;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    }
    .counter-display {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 2.5rem 1rem;
      background: #050C08;
      border: 2px solid var(--border);
      border-radius: 1.25rem;
      margin: 1.5rem 0;
    }
    .counter-label {
      font-size: 0.85rem;
      font-weight: 800;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.15em;
      margin-bottom: 0.5rem;
      font-family: monospace;
    }
    .counter-number {
      font-size: 5rem;
      font-weight: 900;
      color: var(--accent);
      font-family: monospace;
      line-height: 1;
      letter-spacing: -0.05em;
      text-shadow: 0 0 30px rgba(180, 248, 44, 0.25);
    }
    .counter-sub {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 0.75rem;
      font-family: monospace;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      justify-content: center;
    }
    button, .btn-link {
      background: #112419;
      color: var(--text);
      border: 1px solid var(--border);
      padding: 0.75rem 1.25rem;
      border-radius: 0.75rem;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.15s ease;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-family: monospace;
    }
    button:hover, .btn-link:hover {
      background: #183624;
      color: #fff;
      border-color: var(--accent);
    }
    button.btn-accent {
      background: var(--accent);
      color: #000;
      border-color: var(--accent);
      font-weight: 900;
    }
    button.btn-accent:hover {
      background: #C8FF47;
    }
    .logs-box {
      background: #050C08;
      border: 1px solid var(--border);
      border-radius: 1rem;
      padding: 1rem;
      max-height: 280px;
      overflow-y: auto;
      font-family: monospace;
      font-size: 0.75rem;
    }
    .log-item {
      padding: 0.5rem;
      border-bottom: 1px solid #112419;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .log-item:last-child { border-bottom: none; }
    .log-header {
      display: flex;
      justify-content: space-between;
      color: var(--accent);
      font-weight: 700;
    }
    .log-ua {
      color: var(--text-muted);
      word-break: break-all;
    }
    .target-url-box {
      background: #07110C;
      border: 1px dashed var(--border);
      border-radius: 0.75rem;
      padding: 0.75rem 1rem;
      font-family: monospace;
      font-size: 0.8rem;
      color: var(--accent);
      word-break: break-all;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">
      <div class="pulse-dot"></div>
      STANDALONE TEST BENCH &bull; 100% INDEPENDENT
    </div>

    <div class="card">
      <h1 style="font-size: 1.5rem; font-weight: 900; text-transform: uppercase; letter-spacing: -0.02em;">
        Live View Count Target Page
      </h1>
      <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.25rem;">
        This page runs independently. Persistent view counts are stored in browser localStorage & synchronized with incoming HTTP requests.
      </p>

      <div class="counter-display">
        <div class="counter-label">Total Verified Views</div>
        <div class="counter-number" id="view-count-number">${serverViewCounter}</div>
        <div class="counter-sub" id="counter-storage-status">Saved in Browser LocalStorage + Server State</div>
      </div>

      <div style="margin-bottom: 1.25rem;">
        <div style="font-size: 0.75rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem; font-family: monospace;">
          Target Endpoint for Load Testing / Go Script:
        </div>
        <div class="target-url-box">
          <span id="target-endpoint-url"></span>
          <button onclick="copyTargetUrl()" style="padding: 0.35rem 0.65rem; font-size: 0.7rem;">Copy</button>
        </div>
      </div>

      <div class="actions">
        <button class="btn-accent" onclick="manualIncrement()">+1 View (Simulate Visit)</button>
        <button onclick="refreshStats()">Sync & Refresh</button>
        <button onclick="resetCounter()" style="color: #f87171; border-color: #7f1d1d;">Reset to 0</button>
        <a href="/" class="btn-link">&larr; Open ClickHead App</a>
      </div>
    </div>

    <div class="card" style="padding: 1.5rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h2 style="font-size: 1rem; font-weight: 800; text-transform: uppercase; font-family: monospace;">
          Real-Time HTTP Request Stream (<span id="visit-count-badge">${recentVisits.length}</span>)
        </h2>
        <span style="font-size: 0.75rem; color: var(--text-muted); font-family: monospace;">Auto-polling active</span>
      </div>

      <div class="logs-box" id="logs-container">
        ${recentVisits.map(v => `
          <div class="log-item">
            <div class="log-header">
              <span>View #${v.id} &bull; ${v.path}</span>
              <span>${v.timestamp.substring(11, 19)}</span>
            </div>
            <div class="log-ua">${v.userAgent}</div>
            <div style="font-size: 0.7rem; color: #6b8f78;">Referer: ${v.referer}</div>
          </div>
        `).join('')}
      </div>
    </div>
  </div>

  <script>
    const STORAGE_KEY = 'clickhead_persistent_view_count';
    const ENDPOINT = window.location.origin + '/api/test/visit';
    document.getElementById('target-endpoint-url').innerText = ENDPOINT;

    // LocalStorage initialization
    let localCount = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
    const serverCount = ${serverViewCounter};
    const finalCount = Math.max(localCount, serverCount);
    localStorage.setItem(STORAGE_KEY, String(finalCount));
    document.getElementById('view-count-number').innerText = finalCount;

    function copyTargetUrl() {
      navigator.clipboard.writeText(ENDPOINT);
      alert('Copied endpoint URL to clipboard: ' + ENDPOINT);
    }

    async function manualIncrement() {
      try {
        const res = await fetch('/api/test/visit');
        const data = await res.json();
        const updated = Math.max(data.totalViews, (parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10) + 1));
        localStorage.setItem(STORAGE_KEY, String(updated));
        document.getElementById('view-count-number').innerText = updated;
        refreshStats();
      } catch (err) {
        let count = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10) + 1;
        localStorage.setItem(STORAGE_KEY, String(count));
        document.getElementById('view-count-number').innerText = count;
      }
    }

    async function resetCounter() {
      if (!confirm('Reset view counter back to 0?')) return;
      localStorage.setItem(STORAGE_KEY, '0');
      try {
        await fetch('/api/test/reset', { method: 'POST' });
      } catch (e) {}
      document.getElementById('view-count-number').innerText = '0';
      document.getElementById('logs-container').innerHTML = '<div style="color: #6b8f78; padding: 1rem; text-align: center;">Counter reset to 0. Waiting for visits...</div>';
      document.getElementById('visit-count-badge').innerText = '0';
    }

    async function refreshStats() {
      try {
        const res = await fetch('/api/test/stats');
        const data = await res.json();
        const local = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
        const maxVal = Math.max(local, data.totalViews);
        localStorage.setItem(STORAGE_KEY, String(maxVal));
        document.getElementById('view-count-number').innerText = maxVal;
        document.getElementById('visit-count-badge').innerText = data.recentVisits.length;

        const container = document.getElementById('logs-container');
        if (data.recentVisits.length === 0) {
          container.innerHTML = '<div style="color: #6b8f78; padding: 1rem; text-align: center;">No visits logged yet. Send requests from ClickHead or Go CLI!</div>';
        } else {
          container.innerHTML = data.recentVisits.map(v => \`
            <div class="log-item">
              <div class="log-header">
                <span>View #\${v.id} &bull; \${v.path}</span>
                <span>\${v.timestamp.substring(11, 19)}</span>
              </div>
              <div class="log-ua">\${v.userAgent}</div>
              <div style="font-size: 0.7rem; color: #6b8f78;">Referer: \${v.referer}</div>
            </div>
          \`).join('');
        }
      } catch (err) {
        console.error('Stats poll failed', err);
      }
    }

    // Auto-poll stats every 1.5 seconds
    setInterval(refreshStats, 1500);
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});


// API: Dedicated Jetpack Pixel Dispatcher Test Endpoint
app.get('/api/test/jetpack-beacon', async (req, res) => {
  const blogId = (req.query.blogId as string) || '175376211';
  const postId = (req.query.postId as string) || '0';
  const host = (req.query.host as string) || 'bankingdigests.com';
  const referer = (req.query.referer as string) || 'https://www.google.com/search?q=banking+fraud+guide';

  const pixelUrl = `https://pixel.wp.com/g.gif?v=wpcom-no-pv&j=1%3A13.8&blog=${blogId}&post=${postId}&host=${encodeURIComponent(host)}&ref=${encodeURIComponent(referer)}&rand=${Math.random()}&baba=${Math.random().toString(36).substring(2, 9)}`;

  try {
    const start = performance.now();
    const resp = await fetch(pixelUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer': `https://${host}/`,
      }
    });
    const durationMs = Math.round(performance.now() - start);
    res.json({
      status: 'ok',
      jetpackPixelStatus: resp.status,
      durationMs,
      pixelUrl,
      blogId,
      postId,
      host,
      message: `Jetpack pixel successfully dispatched to Automattic server (HTTP ${resp.status})`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Abort an active traffic session
app.post('/api/traffic/stop', (req, res) => {
  const { sessionId } = req.body;
  if (sessionId && activeSessions.has(sessionId)) {
    activeSessions.get(sessionId)?.abort();
    activeSessions.delete(sessionId);
    res.json({ success: true, message: 'Session aborted' });
  } else {
    res.json({ success: false, message: 'Session not found or already completed' });
  }
});

// API: Real Server-Side Concurrent HTTP Traffic Stream (SSE)
app.get('/api/traffic/stream', async (req, res) => {
  const targetUrl = (req.query.targetUrl as string) || 'https://httpbin.org/get';
  const subPathsRaw = (req.query.subPaths as string) || '';
  const enableMultiPage = req.query.enableMultiPage === 'true';
  const totalRequests = Math.min(2000, Math.max(1, parseInt(req.query.totalRequests as string, 10) || 20));
  const concurrency = Math.min(50, Math.max(1, parseInt(req.query.concurrency as string, 10) || 3));
  let delayMs = Math.max(0, parseInt(req.query.delayMs as string, 10) || 1000);
  let jitterMs = Math.max(0, parseInt(req.query.jitterMs as string, 10) || 500);
  const distributionMinutes = Math.max(0, parseInt(req.query.distributionMinutes as string, 10) || 0);
  const useDiurnal = req.query.useDiurnal === 'true';
  const referer = (req.query.referer as string) || '';
  const timeoutSeconds = Math.max(1, parseInt(req.query.timeoutSeconds as string, 10) || 10);
  const sessionId = (req.query.sessionId as string) || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const enableWordPressTracking = req.query.enableWordPressTracking === 'true' || targetUrl.includes('bankingdigests');
  const userJetpackBlogId = (req.query.jetpackBlogId as string) || '';
  const userWpPostId = (req.query.wpPostId as string) || '';

  // Parse subPaths
  const subPaths: string[] = [];
  if (subPathsRaw) {
    for (const p of subPathsRaw.split(',')) {
      const trimmed = p.trim();
      if (trimmed) {
        subPaths.push(trimmed.startsWith('/') || trimmed.startsWith('http') ? trimmed : `/${trimmed}`);
      }
    }
  }
  if (subPaths.length === 0) {
    subPaths.push('/');
  }

  // If time distribution window is set (> 0 minutes), compute realistic human interval
  if (distributionMinutes > 0) {
    let effectiveViewsPerHour = totalRequests / (distributionMinutes / 60);
    
    if (useDiurnal && distributionMinutes >= 60) {
      const currentHour = new Date().getHours();
      const hourWeight = DIURNAL_WEIGHTS[currentHour];
      const viewsThisHour = Math.max(1, totalRequests * hourWeight * (24 / (distributionMinutes / 60)));
      effectiveViewsPerHour = viewsThisHour;
    }
    
    const avgIntervalSec = Math.max(0.5, (3600 / Math.max(1, effectiveViewsPerHour)) * concurrency);
    delayMs = Math.round(avgIntervalSec * 1000);
    jitterMs = Math.round(delayMs * 0.35); // 35% natural jitter
  }

  // Support relative targetUrl or local URLs
  let effectiveTarget = targetUrl;
  if (effectiveTarget.startsWith('/')) {
    effectiveTarget = `http://127.0.0.1:3000${effectiveTarget}`;
  }

  // Validate URL format
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(effectiveTarget);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      res.status(400).json({ error: 'URL must use http or https protocol' });
      return;
    }
  } catch (err) {
    res.status(400).json({ error: 'Invalid URL format' });
    return;
  }

  // Set headers for Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  let isAborted = false;
  const abortSession = () => {
    isAborted = true;
  };

  activeSessions.set(sessionId, { abort: abortSession });
  req.on('close', () => {
    isAborted = true;
    activeSessions.delete(sessionId);
  });

  const sendSSE = (event: string, data: any) => {
    if (res.writableEnded) return;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  sendSSE('init', {
    sessionId,
    targetUrl,
    totalRequests,
    concurrency,
    delayMs,
    jitterMs,
    distributionMinutes,
    useDiurnal,
    referer,
  });

  // Custom HTTP/HTTPS agents with connection pooling
  const httpAgent = new http.Agent({ keepAlive: true, maxSockets: concurrency * 4 });
  const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: concurrency * 4, rejectUnauthorized: false });

  // Telemetry state
  let totalSent = 0;
  let completed = 0;
  let successful = 0;
  let redirects = 0;
  let clientErrors = 0;
  let serverErrors = 0;
  let networkErrors = 0;
  let totalBytes = 0;
  const latencies: number[] = [];
  const startTime = Date.now();

  const getAggregated = () => {
    const elapsedSeconds = Math.max(0.001, (Date.now() - startTime) / 1000);
    const sorted = [...latencies].sort((a, b) => a - b);
    const count = sorted.length;
    return {
      totalSent,
      completed,
      successful,
      redirects,
      clientErrors,
      serverErrors,
      networkErrors,
      totalBytes,
      elapsedSeconds,
      currentRps: completed / elapsedSeconds,
      avgRps: completed / elapsedSeconds,
      avgDurationMs: count > 0 ? Math.round(sorted.reduce((a, b) => a + b, 0) / count) : 0,
      minDurationMs: count > 0 ? sorted[0] : 0,
      maxDurationMs: count > 0 ? sorted[count - 1] : 0,
      p50Ms: count > 0 ? sorted[Math.floor(count * 0.5)] : 0,
      p90Ms: count > 0 ? sorted[Math.floor(count * 0.9)] : 0,
      p95Ms: count > 0 ? sorted[Math.floor(count * 0.95)] : 0,
      p99Ms: count > 0 ? sorted[Math.floor(count * 0.99)] : 0,
    };
  };

  // Job queue for workers
  const jobQueue: number[] = Array.from({ length: totalRequests }, (_, i) => i + 1);
  let jobIndex = 0;

  // Single HTTP Request Executor executed natively in Node.js
  const executeSingleRequest = async (workerId: number, reqId: number): Promise<void> => {
    const uaObj = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    const reqStart = performance.now();
    const timestamp = Date.now();

    const headers: Record<string, string> = {
      'User-Agent': uaObj.ua,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'cross-site',
      'Sec-Fetch-User': '?1',
    };

    if (uaObj.secChUa) {
      headers['sec-ch-ua'] = uaObj.secChUa;
      headers['sec-ch-ua-mobile'] = '?0';
      headers['sec-ch-ua-platform'] = uaObj.platform;
    }

    if (referer) {
      headers['Referer'] = referer;
    }

    let statusCode = 0;
    let bytesRead = 0;
    let isSuccess = false;
    let errorMsg: string | undefined;

    let requestUrl = effectiveTarget;
    if (enableMultiPage && subPaths.length > 1) {
      const chosenPath = subPaths[Math.floor(Math.random() * subPaths.length)];
      if (chosenPath.startsWith('http')) {
        requestUrl = chosenPath;
      } else {
        requestUrl = `${effectiveTarget.replace(/\/+$/, '')}${chosenPath}`;
      }
    }

    // Route test endpoint requests directly to internal localhost to ensure 100% reliable local hit delivery
    if (
      requestUrl.includes('/api/test/visit') ||
      requestUrl.includes('/test-page') ||
      requestUrl.includes('/api/test-counter') ||
      requestUrl.includes('/api/counter')
    ) {
      try {
        const u = new URL(requestUrl);
        requestUrl = `http://127.0.0.1:3000${u.pathname}${u.search}`;
      } catch (e) {
        requestUrl = 'http://127.0.0.1:3000/api/test/visit';
      }
    }

    let extraLogInfo = '';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutSeconds * 1000);

      const fetchPromise = fetch(requestUrl, {
        method: 'GET',
        headers,
        redirect: 'follow',
        signal: controller.signal,
      });

      const response = await fetchPromise;
      clearTimeout(timeoutId);

      statusCode = response.status;
      const arrayBuf = await response.arrayBuffer();
      bytesRead = arrayBuf.byteLength || 0;
      isSuccess = statusCode >= 200 && statusCode < 400;

      // Handle WordPress & Jetpack Pixel Tracking for ANY page or site
      if (isSuccess && (enableWordPressTracking || requestUrl.includes('wp-content') || requestUrl.includes('wp-admin') || bytesRead > 500)) {
        try {
          const htmlSnippet = Buffer.from(arrayBuf.slice(0, 50000)).toString('utf-8');
          const targetHost = new URL(requestUrl).hostname;
          
          // 1. Universal Jetpack Blog ID Auto-Detection
          let blogId = userJetpackBlogId;
          if (!blogId) {
            const blogMatch = 
              htmlSnippet.match(/stats\.wp\.com\/e-.*?[?&]blog=(\d+)/i) || 
              htmlSnippet.match(/pixel\.wp\.com\/g\.gif\?[^"']*?[?&]blog=(\d+)/i) || 
              htmlSnippet.match(/['"]blog['"]\s*:\s*['"]?(\d+)/i) ||
              htmlSnippet.match(/name=['"](?:jetpack-site-id|jetpack-boost-site-id)['"]\s+content=['"](\d+)['"]/i) ||
              htmlSnippet.match(/data-blog=['"](\d+)['"]/i);
            if (blogMatch && blogMatch[1]) {
              blogId = blogMatch[1];
            }
          }

          // 2. Universal WordPress Post ID Auto-Detection
          let postId = userWpPostId;
          if (!postId) {
            const postMatch = 
              htmlSnippet.match(/class="[^"]*postid-(\d+)/i) || 
              htmlSnippet.match(/data-post-id=['"](\d+)['"]/i) || 
              htmlSnippet.match(/[?&]p=(\d+)/i) || 
              htmlSnippet.match(/['"]post['"]\s*:\s*['"]?(\d+)/i) ||
              htmlSnippet.match(/<link\s+rel=['"]shortlink['"]\s+href=['"][^'"]*?[?&]p=(\d+)['"]/i);
            if (postMatch && postMatch[1]) {
              postId = postMatch[1];
            }
          }

          // 3. Dispatch real Jetpack Tracking Pixel to Automattic Analytics
          if (blogId) {
            const randSeed = Math.random();
            const babaSeed = Math.random().toString(36).substring(2, 9);
            const pixelUrl = `https://pixel.wp.com/g.gif?v=wpcom-no-pv&j=1%3A13.8&blog=${blogId}&post=${postId || '0'}&host=${encodeURIComponent(targetHost)}&ref=${encodeURIComponent(referer || 'https://www.google.com/search?q=' + encodeURIComponent(targetHost))}&rand=${randSeed}&baba=${babaSeed}`;
            
            fetch(pixelUrl, {
              headers: {
                'User-Agent': uaObj.ua,
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Referer': requestUrl,
              }
            }).catch(() => {});

            extraLogInfo = ` + Jetpack Pixel (Blog: ${blogId}${postId ? `, Post: ${postId}` : ''})`;
          }

          // 4. Dispatch WP-PostViews / Post Views Counter AJAX hit if applicable
          if (postId) {
            fetch(`https://${targetHost}/wp-admin/admin-ajax.php`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'User-Agent': uaObj.ua,
                'Referer': requestUrl,
                'X-Requested-With': 'XMLHttpRequest'
              },
              body: `action=postviews&postviews_id=${postId}`
            }).catch(() => {});
          }
        } catch (wpErr) {
          // Non-blocking WordPress tracking fallback
        }
      }
    } catch (err: any) {
      isSuccess = false;
      if (err.name === 'AbortError') {
        errorMsg = 'Timeout reached';
      } else {
        errorMsg = err.message || 'Connection failed';
      }
    }

    const durationMs = Math.max(1, Math.round(performance.now() - reqStart));

    totalSent++;
    completed++;
    totalBytes += bytesRead;

    if (isSuccess) {
      if (statusCode >= 300 && statusCode < 400) {
        redirects++;
      } else {
        successful++;
      }
      latencies.push(durationMs);
    } else {
      if (statusCode >= 400 && statusCode < 500) {
        clientErrors++;
      } else if (statusCode >= 500) {
        serverErrors++;
      } else {
        networkErrors++;
      }
    }

    const metric = {
      id: reqId,
      workerId,
      url: requestUrl,
      statusCode,
      durationMs,
      timestamp,
      success: isSuccess,
      error: errorMsg,
      userAgent: uaObj.name,
      bytesReceived: bytesRead,
    };

    const aggregated = getAggregated();

    sendSSE('metric', {
      metric,
      aggregated,
      log: {
        timestamp: new Date(timestamp).toISOString().substring(11, 23),
        level: isSuccess ? 'SUCCESS' : 'ERROR',
        workerId,
        statusCode,
        latencyMs: durationMs,
        message: isSuccess
          ? `[Worker ${String(workerId).padStart(2, '0')}] #${String(reqId).padStart(4, '0')} HTTP ${statusCode}${extraLogInfo} in ${durationMs}ms | ${uaObj.name} | ${requestUrl}`
          : `[Worker ${String(workerId).padStart(2, '0')}] #${String(reqId).padStart(4, '0')} FAIL (${errorMsg || `HTTP ${statusCode}`}) in ${durationMs}ms | ${requestUrl}`,
      },
    });
  };

  // Worker routine
  const runWorker = async (workerId: number) => {
    while (!isAborted) {
      let currentReqId: number | null = null;
      if (jobIndex < jobQueue.length) {
        currentReqId = jobQueue[jobIndex];
        jobIndex++;
      } else {
        break;
      }

      // Pacing & Jitter delay
      if (delayMs > 0) {
        const jitter = jitterMs > 0 ? Math.random() * jitterMs : 0;
        const sleepTime = delayMs + jitter;
        await new Promise((r) => setTimeout(r, sleepTime));
      }

      if (isAborted) break;

      await executeSingleRequest(workerId, currentReqId);
    }
  };

  // Launch worker pool
  const workers: Promise<void>[] = [];
  for (let w = 1; w <= concurrency; w++) {
    workers.push(runWorker(w));
  }

  await Promise.all(workers);

  const finalAggregated = getAggregated();
  sendSSE('complete', {
    finalMetrics: finalAggregated,
    message: `Completed ${completed} requests in ${finalAggregated.elapsedSeconds.toFixed(2)}s.`,
  });

  activeSessions.delete(sessionId);
  res.end();
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

startServer();
