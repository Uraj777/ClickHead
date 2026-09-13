import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { app } from './src/serverApp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const isDevelopment = process.env.NODE_ENV !== 'production';

async function startServer() {
  if (isDevelopment) {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
  }
  app.listen(PORT, () => console.log(`ClickHead server listening on http://localhost:${PORT}`));
}

if (!process.env.VERCEL) startServer().catch((error) => { console.error(error); process.exit(1); });
