import express from 'express';
import dns from 'dns/promises';
import net from 'net';

export const app = express();

const isDevelopment = process.env.NODE_ENV !== 'production';

app.use(express.json({ limit: '64kb' }));

interface VisitRecord { id: number; timestamp: string; userAgent: string; referer: string; ip: string; path: string; }
interface ActiveSession { abort: () => void; }

let serverViewCounter = 0;
const recentVisits: VisitRecord[] = [];
const activeSessions = new Map<string, ActiveSession>();

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

function isPrivateAddress(address: string): boolean {
  const normalized = address.replace(/^::ffff:/, '').toLowerCase();
  if (net.isIPv4(normalized)) {
    const [a, b] = normalized.split('.').map(Number);
    return a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  if (net.isIPv6(normalized)) return normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80:');
  return false;
}

async function validateTarget(raw: string): Promise<URL> {
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error('Invalid target URL.'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Target must use HTTP or HTTPS.');
  if (url.username || url.password) throw new Error('Credential-bearing target URLs are not supported.');
  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    if (!isDevelopment) throw new Error('Local targets are disabled in production.');
    return url;
  }
  if (net.isIP(hostname)) {
    if (isPrivateAddress(hostname) && !isDevelopment) throw new Error('Private-network targets are disabled in production.');
    return url;
  }
  const addresses = await dns.lookup(hostname, { all: true });
  if (!addresses.length) throw new Error('Target hostname did not resolve.');
  if (!isDevelopment && addresses.some((entry) => isPrivateAddress(entry.address))) throw new Error('Targets resolving to private or local networks are disabled in production.');
  return url;
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.all(['/api/test/visit', '/api/test-counter', '/api/counter'], (req, res) => {
  const visit = recordVisit(req);
  if (req.accepts('html') && !req.accepts('json')) { res.redirect('/test-page'); return; }
  res.json({ success: true, totalViews: serverViewCounter, currentVisit: visit });
});

app.get('/api/test/stats', (_req, res) => res.json({ totalViews: serverViewCounter, recentVisits: recentVisits.slice(0, 50), lastVisit: recentVisits[0] || null }));
app.post('/api/test/reset', (_req, res) => { serverViewCounter = 0; recentVisits.length = 0; res.json({ success: true, totalViews: 0 }); });
app.post('/api/test/batch-visit', (req, res) => {
  const count = Math.min(500, Math.max(1, Number.parseInt(String(req.body?.count ?? req.query.count ?? '50'), 10) || 50));
  const created: VisitRecord[] = [];
  for (let i = 0; i < count; i += 1) { const visit = recordVisit(req); visit.path = '/api/test/visit'; created.push(visit); }
  res.json({ success: true, added: count, totalViews: serverViewCounter, recentVisits: created.slice(0, 50) });
});

app.get('/test-page', (req, res) => {
  recordVisit(req);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ClickHead · Standalone View Counter Test</title><style>:root{color-scheme:dark;--bg:#07110C;--card:#0C1A12;--border:#1E3E2B;--accent:#B4F82C;--text:#E8EDE0;--muted:#9BB0A3}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:var(--bg);color:var(--text);font-family:Inter,system-ui,sans-serif;display:grid;place-items:center;padding:24px}.card{width:min(760px,100%);background:var(--card);border:1px solid var(--border);border-radius:24px;padding:32px;box-shadow:0 24px 70px #0008}h1{margin:0;font-size:clamp(24px,4vw,42px)}p{color:var(--muted);line-height:1.6}.count{text-align:center;margin:28px 0;padding:30px;border:1px solid var(--border);border-radius:18px;background:#050C08}.count strong{display:block;font:900 clamp(64px,12vw,112px)/1 ui-monospace,monospace;color:var(--accent)}button,a{border:1px solid var(--border);background:#112419;color:var(--text);border-radius:12px;padding:12px 16px;text-decoration:none;font-weight:700;cursor:pointer}button.primary{background:var(--accent);color:#000}.actions{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}</style></head><body><main class="card"><h1>Standalone View Counter</h1><p>This page verifies that HTTP requests reach a controlled ClickHead test endpoint. It does not emulate or disguise human traffic.</p><section class="count"><span>Recorded test hits</span><strong id="count">0</strong></section><div class="actions"><button class="primary" onclick="hit()">Record one test hit</button><button onclick="refresh()">Refresh</button><button onclick="resetCount()">Reset</button><a href="/">Open ClickHead</a></div></main><script>async function refresh(){try{const r=await fetch('/api/test/stats');const d=await r.json();document.getElementById('count').textContent=d.totalViews}catch(e){console.error(e)}}async function hit(){await fetch('/api/test/visit',{method:'POST'});refresh()}async function resetCount(){await fetch('/api/test/reset',{method:'POST'});refresh()}refresh();setInterval(refresh,1500);</script></body></html>`;
  res.type('html').send(html);
});

app.post('/api/traffic/stop', (req, res) => {
  const sessionId = String(req.body?.sessionId || '');
  const session = activeSessions.get(sessionId);
  if (!session) { res.json({ success: false, message: 'Session not found or already completed' }); return; }
  session.abort(); activeSessions.delete(sessionId); res.json({ success: true, message: 'Session aborted' });
});

app.get('/api/traffic/stream', async (req, res) => {
  const targetRaw = String(req.query.targetUrl || '').trim();
  if (!targetRaw) { res.status(400).json({ error: 'A target URL is required.' }); return; }
  let target: URL;
  try { target = await validateTarget(targetRaw); } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid target.' }); return; }
  const totalRequests = Math.min(2000, Math.max(1, Number.parseInt(String(req.query.totalRequests || '20'), 10) || 20));
  const concurrency = Math.min(50, Math.max(1, Number.parseInt(String(req.query.concurrency || '3'), 10) || 3));
  const delayMs = Math.max(0, Number.parseInt(String(req.query.delayMs || '1000'), 10) || 1000);
  const jitterMs = Math.max(0, Number.parseInt(String(req.query.jitterMs || '500'), 10) || 500);
  const timeoutMs = Math.min(120000, Math.max(1000, (Number.parseInt(String(req.query.timeoutSeconds || '10'), 10) || 10) * 1000));
  const subPaths = String(req.query.subPaths || '/').split(',').map((value) => value.trim()).filter(Boolean);
  const enableMultiPage = req.query.enableMultiPage === 'true';
  const sessionId = String(req.query.sessionId || `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  res.setHeader('Content-Type', 'text/event-stream'); res.setHeader('Cache-Control', 'no-cache, no-transform'); res.setHeader('Connection', 'keep-alive'); res.flushHeaders?.();
  let aborted = false; const abort = () => { aborted = true; }; activeSessions.set(sessionId, { abort }); req.on('close', () => { aborted = true; activeSessions.delete(sessionId); });
  const send = (event: string, data: unknown) => { if (!res.writableEnded) res.write(`event: ${event}\\ndata: ${JSON.stringify(data)}\\n\\n`); };
  const metrics = { totalSent: 0, completed: 0, successful: 0, redirects: 0, clientErrors: 0, serverErrors: 0, networkErrors: 0, totalBytes: 0, elapsedSeconds: 0, currentRps: 0, avgRps: 0, avgDurationMs: 0, minDurationMs: 0, maxDurationMs: 0, p50Ms: 0, p90Ms: 0, p95Ms: 0, p99Ms: 0 };
  const latencies: number[] = []; const startedAt = Date.now();
  const snapshot = () => { const sorted = [...latencies].sort((a,b)=>a-b); const elapsedSeconds=Math.max(.001,(Date.now()-startedAt)/1000); const percentile=(p:number)=>sorted.length?sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))]:0; metrics.elapsedSeconds=elapsedSeconds; metrics.currentRps=metrics.completed/elapsedSeconds; metrics.avgRps=metrics.completed/elapsedSeconds; metrics.avgDurationMs=sorted.length?Math.round(sorted.reduce((a,b)=>a+b,0)/sorted.length):0; metrics.minDurationMs=sorted[0]||0; metrics.maxDurationMs=sorted[sorted.length-1]||0; metrics.p50Ms=percentile(.5); metrics.p90Ms=percentile(.9); metrics.p95Ms=percentile(.95); metrics.p99Ms=percentile(.99); return {...metrics}; };
  send('init',{sessionId,targetUrl:target.toString(),totalRequests,concurrency,delayMs,jitterMs});
  let nextId=0;
  const runWorker=async(workerId:number)=>{ while(!aborted){ const requestId=nextId++; if(requestId>=totalRequests)return; if(delayMs>0&&requestId>0){const jitter=jitterMs>0?Math.floor(Math.random()*(jitterMs+1)):0;await new Promise(r=>setTimeout(r,delayMs+jitter));} if(aborted)return; let requestUrl=new URL(target.toString()); if(enableMultiPage&&subPaths.length){const selected=subPaths[requestId%subPaths.length]; requestUrl=selected.startsWith('http://')||selected.startsWith('https://')?new URL(selected):new URL(selected.startsWith('/')?selected:`/${selected}`,target);} const started=performance.now(); let statusCode=0,bytesReceived=0,success=false,error=''; try{const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);try{const response=await fetch(requestUrl,{signal:controller.signal,redirect:'follow',headers:{'User-Agent':'ClickHeadLoadTest/1.0','Accept':'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8'}});statusCode=response.status;bytesReceived=(await response.arrayBuffer()).byteLength;success=response.ok;}finally{clearTimeout(timer);}}catch(err){error=err instanceof Error?err.message:'Request failed';} const durationMs=Math.max(1,Math.round(performance.now()-started));metrics.totalSent++;metrics.completed++;metrics.totalBytes+=bytesReceived;if(success)metrics.successful++;if(statusCode>=300&&statusCode<400)metrics.redirects++;else if(statusCode>=400&&statusCode<500)metrics.clientErrors++;else if(statusCode>=500)metrics.serverErrors++;else if(!success)metrics.networkErrors++;if(success)latencies.push(durationMs);send('metric',{metric:{id:requestId+1,workerId,url:requestUrl.toString(),statusCode,durationMs,timestamp:Date.now(),success,error:error||undefined,userAgent:'ClickHeadLoadTest/1.0',bytesReceived},aggregated:snapshot(),log:{timestamp:new Date().toISOString().substring(11,23),level:success?'SUCCESS':'ERROR',workerId,statusCode,latencyMs:durationMs,message:success?`[Worker ${String(workerId).padStart(2,'0')}] #${String(requestId+1).padStart(4,'0')} HTTP ${statusCode} in ${durationMs}ms | ${requestUrl}`:`[Worker ${String(workerId).padStart(2,'0')}] #${String(requestId+1).padStart(4,'0')} FAIL (${error||`HTTP ${statusCode}`}) in ${durationMs}ms | ${requestUrl}`}}); } };
  try { await Promise.all(Array.from({length:Math.min(concurrency,totalRequests)},(_,i)=>runWorker(i+1))); send('complete',{finalMetrics:snapshot(),message:aborted?`Stopped after ${metrics.completed} requests.`:`Completed ${metrics.completed} requests.`}); } finally { activeSessions.delete(sessionId); if(!res.writableEnded)res.end(); }
});
