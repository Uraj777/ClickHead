import express from 'express';
import { runBrowserTest } from './browserTest';

const app = express();

app.get('/', async (req, res) => {
  const targetUrl = String(req.query.targetUrl || '').trim();
  if (!targetUrl) { res.status(400).json({ error: 'A target URL is required.' }); return; }
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  let closed = false;
  req.on('close', () => { closed = true; });
  const send = (event: string, data: unknown) => { if (!closed && !res.writableEnded) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); };
  try {
    const result = await runBrowserTest(targetUrl, (event) => { if (event.type !== 'complete') send(event.type, event); });
    if (!closed) send('complete', result);
  } catch (error) {
    send('error', { message: error instanceof Error ? error.message : 'Browser test failed.' });
  } finally {
    if (!res.writableEnded) res.end();
  }
});

export default app;
