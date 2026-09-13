import express from 'express';
const app = express();
app.get('/', (_req, res) => { res.setHeader('Content-Type', 'text/event-stream'); res.end('event: ready\ndata: {"ok":true}\n\n'); });
export default app;
