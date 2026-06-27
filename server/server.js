// Zero-dependency HTTP server: serves the interface (static files) and exposes
// the preservation API. Uses only Node built-ins so it runs with a single
// command — `node server/server.js` — no npm install required.

import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { preserve, EDITIONS_DIR } from './pipeline.js';
import { detectDrift } from './manifest.js';
import { aiEnabled } from './ai.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const WEB = path.join(ROOT, 'web');
const PORT = process.env.PORT || 5000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.data': 'application/octet-stream',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Cache-Control': 'no-cache', ...headers });
  res.end(body);
}

function sendJson(res, status, obj) {
  send(res, status, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8' });
}

async function readBody(req, limit = 1 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > limit) reject(new Error('payload too large'));
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

// Safe static file serving — confined to allowed roots, no path traversal.
async function serveStatic(res, urlPath) {
  let rel = decodeURIComponent(urlPath.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';

  let baseDir = WEB;
  if (rel.startsWith('/editions/')) {
    baseDir = ROOT;
  }
  const abs = path.normalize(path.join(baseDir, rel));
  const allowed = abs.startsWith(WEB) || abs.startsWith(EDITIONS_DIR);
  if (!allowed) return send(res, 403, 'Forbidden');

  try {
    const st = await stat(abs);
    if (st.isDirectory()) return serveStatic(res, path.posix.join(rel, 'index.html'));
    const buf = await readFile(abs);
    const ext = path.extname(abs).toLowerCase();
    send(res, 200, buf, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  } catch {
    send(res, 404, 'Not found');
  }
}

const server = http.createServer(async (req, res) => {
  const { method } = req;
  const url = req.url || '/';

  // --- API ---
  if (url === '/api/health') {
    return sendJson(res, 200, { ok: true, ai: aiEnabled(), version: '0.1.0' });
  }

  if (url === '/api/preserve' && method === 'POST') {
    try {
      const body = JSON.parse((await readBody(req)) || '{}');
      const result = await preserve({
        url: body.url,
        title: body.title,
        artist: body.artist,
        answers: body.answers || {},
      });
      return sendJson(res, 200, { ok: true, result });
    } catch (err) {
      console.error('[revenant] preserve failed:', err);
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  if (url.startsWith('/api/drift/') && method === 'GET') {
    try {
      const slug = url.replace('/api/drift/', '').replace(/[^a-z0-9-]/gi, '');
      const drift = await detectDrift(path.join(EDITIONS_DIR, slug));
      return sendJson(res, 200, { ok: true, drift });
    } catch (err) {
      return sendJson(res, 404, { ok: false, error: err.message });
    }
  }

  // --- Static ---
  if (method === 'GET') return serveStatic(res, url);
  send(res, 405, 'Method not allowed');
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ╭───────────────────────────────────────────────╮');
  console.log('  │  revenant — art game preservation              │');
  console.log(`  │  abierto en  http://localhost:${PORT}              │`);
  console.log(`  │  IA: ${aiEnabled() ? 'activada (ANTHROPIC_API_KEY)   ' : 'desactivada (modo determinista)'} │`);
  console.log('  ╰───────────────────────────────────────────────╯');
  console.log('');
  console.log('  Dejá esta ventana abierta. Para frenar: Ctrl+C');
  console.log('');
});
