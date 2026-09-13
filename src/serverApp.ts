import express from 'express';
import dns from 'dns/promises';
import net from 'net';

export const app = express();
app.use(express.json({ limit: '64kb' }));

interface VisitRecord { id: number; timestamp: string; userAgent: string; referer: string; ip: string; path: string; }
let serverViewCounter = 0;
const recentVisits: VisitRecord[] = [];
const recordVisit = (req: express.Request): VisitRecord => {
  serverViewCounter += 1;
  const visit: VisitRecord = { id: serverViewCounter, timestamp: new Date().toISOString(), userAgent: req.get('user-agent') || 'Unknown User-Agent', referer: req.get('referer') || 'Direct Visit (No Referer)', ip: req.ip || req.socket.remoteAddress || 'unknown', path: req.originalUrl || req.url };
  recentVisits.unshift(visit);
  if (recentVisits.length > 200) recentVisits.length = 200;
  return visit;
};

function isPrivateAddress(address: string): boolean {
  const normalized = address.replace(/^::ffff:/, '').toLowerCase();
  if (net.isIPv4(normalized)) { const [a, b] = normalized.split('.').map(Number); return a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168); }
  if (net.isIPv6(normalized)) return normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80:');
  return false;
}

async function validateTarget(raw: string): Promise<URL> {
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Target must use HTTP or HTTPS.');
  if (url.username || url.password) throw new Error('Credential-bearing target URLs are not supported.');
  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) throw new Error('Local targets are disabled in production.');
  if (net.isIP(hostname)) { if (isPrivateAddress(hostname)) throw new Error('Private-network targets are disabled.'); return url; }
  const addresses = await dns.lookup(hostname, { all: true });
  if (!addresses.length || addresses.some((entry) => isPrivateAddress(entry.address))) throw new Error('Target resolves to a private or local network.');
  return url;
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.post('/api/test/visit', (req, res) => res.json({ success: true, totalViews: serverViewCounter, currentVisit: recordVisit(req) }));
app.get('/api/test/stats', (_req, res) => res.json({ totalViews: serverViewCounter, recentVisits: recentVisits.slice(0, 50), lastVisit: recentVisits[0] || null }));
app.post('/api/test/reset', (_req, res) => { serverViewCounter = 0; recentVisits.length = 0; res.json({ success: true, totalViews: 0 }); });
app.post('/api/test/batch-visit', (req, res) => { const count = Math.min(500, Math.max(1, Number.parseInt(String(req.body?.count ?? '50'), 10) || 50)); const created: VisitRecord[] = []; for (let i = 0; i < count; i += 1) created.push(recordVisit(req)); res.json({ success: true, added: count, totalViews: serverViewCounter, recentVisits: created.slice(0, 50) }); });

app.get('/test-page', (req, res) => { recordVisit(req); res.type('html').send('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ClickHead · Standalone View Counter Test</title></head><body style="font-family:system-ui;background:#07110C;color:#E8EDE0;min-height:100vh;display:grid;place-items:center"><main><h1>Standalone View Counter</h1><p>Controlled HTTP test endpoint.</p><button onclick="fetch(\'/api/test/visit\',{method:\'POST\'}).then(refresh)">Record test hit</button><strong id="count" style="display:block;font-size:72px">0</strong><script>async function refresh(){const r=await fetch(\'/api/test/stats\');document.getElementById(\'count\').textContent=(await r.json()).totalViews}refresh();</script></main></body></html>'); });

// Keep the validator referenced in this module so the production function bundle includes it.
void validateTarget;
