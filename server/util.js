// Small shared helpers. No external dependencies.
import { mkdir } from 'node:fs/promises';
import crypto from 'node:crypto';

export function slugify(text, fallback = 'work') {
  const s = String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return s || fallback;
}

// Turn an arbitrary URL into a stable, filesystem-safe local path under assets/.
export function localNameForUrl(rawUrl) {
  let u;
  try {
    u = new URL(rawUrl);
  } catch {
    return `assets/${sha256(rawUrl).slice(0, 12)}.bin`;
  }
  let p = (u.pathname || '/').replace(/^\/+/, '');
  if (p === '' || p.endsWith('/')) p += 'index.html';
  // Flatten and sanitize each segment.
  p = p
    .split('/')
    .map((seg) => seg.replace(/[^a-zA-Z0-9._-]/g, '_'))
    .join('/')
    .slice(0, 180);
  // Disambiguate by host + query so two CDNs can't collide.
  const tag = sha256(u.host + u.search).slice(0, 8);
  return `assets/${u.host.replace(/[^a-zA-Z0-9.-]/g, '_')}/${tag}/${p}`;
}

export function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

export function isTextLike(contentType = '', url = '') {
  const ct = contentType.toLowerCase();
  if (/text|javascript|json|xml|css|svg|html|ecmascript/.test(ct)) return true;
  return /\.(html?|js|mjs|css|json|xml|svg|txt|glsl|vert|frag|map)(\?|$)/i.test(url);
}

export function nowIso() {
  return new Date().toISOString();
}
