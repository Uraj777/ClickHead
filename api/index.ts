import express from 'express';

const app = express();
app.get('/api/health', (_req, res) => res.json({ status: 'ok', runtime: 'vercel' }));

export default app;
