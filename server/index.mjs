#!/usr/bin/env node
/**
 * Standalone production server for the game + agent bridge.
 *
 *   npm run build
 *   AGENT_LLM_API_KEY=... npm run serve
 *
 * In development, Vite mounts the same API handler, so `npm run dev` is enough.
 */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApiHandler } from './handler.mjs';

for (const file of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(file);
    break;
  } catch {
    // optional
  }
}

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const dist = resolve(root, 'dist');
const api = createApiHandler();
const port = Number(process.env.PORT || 8787);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

async function serveStatic(req, res) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  let file = resolve(dist, `.${pathname}`);
  if (file !== dist && !file.startsWith(`${dist}${sep}`)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }
  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error('not a file');
  } catch {
    // SPA fallback; only for routes without a file extension.
    if (extname(pathname)) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    file = resolve(dist, 'index.html');
    try {
      await stat(file);
    } catch {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('dist/ is missing. Run `npm run build` first.');
      return;
    }
  }

  const info = await stat(file);
  res.statusCode = 200;
  res.setHeader('Content-Type', MIME[extname(file)] || 'application/octet-stream');
  res.setHeader('Content-Length', info.size);
  res.setHeader('Cache-Control', file.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable');
  createReadStream(file).pipe(res);
}

const server = createServer((req, res) => {
  const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
  if (pathname.startsWith('/api/') || pathname === '/health') {
    void api(req, res);
    return;
  }
  void serveStatic(req, res);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`MULIN NIGHTFALL · http://127.0.0.1:${port}`);
  console.log('Agent bridge mounted at /api/health');
  if (!process.env.AGENT_LLM_API_KEY && !process.env.QINIU_MAAS_API_KEY && process.env.AGENT_LLM_MOCK !== '1') {
    console.log('No AGENT_LLM_API_KEY set — the game will use local rule-based speech.');
  }
});
