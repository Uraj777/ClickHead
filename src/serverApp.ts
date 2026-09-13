import express from 'express';

export const app = express();
app.use(express.json({ limit: '64kb' }));

interface VisitRecord { id: number; timestamp: string; userAgent: string; referer: string; ip: string; path: string; }

let serverViewCounter = 0;
const recentVisits: VisitRecord[] = [];

const recordVisit = (req: express.Request): VisitRecord => {
  serverViewCounter += 1;
  const visit: VisitRecord = {
    id: serverViewCounter,
    timestamp: new Date().toISOString(),
    userAgent: req.get('user-agent') || 'Unknown User-Agent',
    referer: req.get('referer') || 'Direct Visit (No Referer)',
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    path: req.originalUrl || req.url,
  };
  recentVisits.unshift(visit);
  if (recentVisits.length > 200) recentVisits.length = 200;
  return visit;
};

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.post('/api/test/visit', (req, res) => {
  const visit = recordVisit(req);
  res.json({ success: true, totalViews: serverViewCounter, currentVisit: visit });
});

app.get('/api/test/stats', (_req, res) => {
  res.json({ totalViews: serverViewCounter, recentVisits: recentVisits.slice(0, 50), lastVisit: recentVisits[0] || null });
});

app.post('/api/test/reset', (_req, res) => {
  serverViewCounter = 0;
  recentVisits.length = 0;
  res.json({ success: true, totalViews: 0 });
});

app.post('/api/test/batch-visit', (req, res) => {
  const count = Math.min(500, Math.max(1, Number.parseInt(String(req.body?.count ?? '50'), 10) || 50));
  const created: VisitRecord[] = [];
  for (let i = 0; i < count; i += 1) created.push(recordVisit(req));
  res.json({ success: true, added: count, totalViews: serverViewCounter, recentVisits: created.slice(0, 50) });
});

app.get('/test-page', (req, res) => {
  recordVisit(req);
  res.type('html').send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ClickHead · Standalone View Counter Test</title><style>:root{color-scheme:dark;--bg:#07110C;--card:#0C1A12;--border:#1E3E2B;--accent:#B4F82C;--text:#E8EDE0;--muted:#9BB0A3}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:var(--bg);color:var(--text);font-family:Inter,system-ui,sans-serif;display:grid;place-items:center;padding:24px}.card{width:min(760px,100%);background:var(--card);border:1px solid var(--border);border-radius:24px;padding:32px;box-shadow:0 24px 70px #0008}h1{margin:0;font-size:clamp(24px,4vw,42px)}p{color:var(--muted);line-height:1.6}.count{text-align:center;margin:28px 0;padding:30px;border:1px solid var(--border);border-radius:18px;background:#050C08}.count strong{display:block;font:900 clamp(64px,12vw,112px)/1 ui-monospace,monospace;color:var(--accent)}button,a{border:1px solid var(--border);background:#112419;color:var(--text);border-radius:12px;padding:12px 16px;text-decoration:none;font-weight:700;cursor:pointer}button.primary{background:var(--accent);color:#000}.actions{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}</style></head><body><main class="card"><h1>Standalone View Counter</h1><p>This page verifies that HTTP requests reach a controlled ClickHead test endpoint. It does not emulate or disguise human traffic.</p><section class="count"><span>Recorded test hits</span><strong id="count">0</strong></section><div class="actions"><button class="primary" onclick="hit()">Record one test hit</button><button onclick="refresh()">Refresh</button><button onclick="resetCount()">Reset</button><a href="/">Open ClickHead</a></div></main><script>async function refresh(){try{const r=await fetch('/api/test/stats');const d=await r.json();document.getElementById('count').textContent=d.totalViews}catch(e){console.error(e)}}async function hit(){await fetch('/api/test/visit',{method:'POST'});refresh()}async function resetCount(){await fetch('/api/test/reset',{method:'POST'});refresh()}refresh();setInterval(refresh,1500);</script></body></html>`);
});
