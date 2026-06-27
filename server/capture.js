// Capture engine: fetches a web artwork and every asset it depends on, so the
// work survives the death of the servers and CDNs it was born against.
//
// Key design rule (a real bug we hit in an earlier prototype): a failed or
// blocked response (403/404/timeout) must NOT be saved as if it were the asset.
// It is recorded instead as a dependency "at risk". That honesty is the product.

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { localNameForUrl, ensureDir, isTextLike, sha256 } from './util.js';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const MAX_RESOURCES = 300;
const MAX_TOTAL_BYTES = 200 * 1024 * 1024; // 200 MB safety cap
const FETCH_TIMEOUT_MS = 20000;

const ASSET_EXT = /\.(js|mjs|css|json|wasm|data|bin|png|jpe?g|gif|webp|svg|ico|mp3|ogg|wav|m4a|glb|gltf|bin|woff2?|ttf|otf|glsl|vert|frag|map|unityweb)(\?|#|$)/i;

async function fetchWithTimeout(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'User-Agent': UA, Accept: '*/*' },
    });
  } finally {
    clearTimeout(t);
  }
}

// Pull referenced URLs out of a text document (HTML / CSS / JS).
function extractRefs(text, baseUrl, isHtml) {
  const refs = new Set();
  const add = (raw) => {
    if (!raw) return;
    raw = raw.trim().replace(/^['"]|['"]$/g, '');
    if (!raw || raw.startsWith('data:') || raw.startsWith('#')) return;
    if (/^(javascript|mailto|tel|blob):/i.test(raw)) return;
    refs.add(raw);
  };

  if (isHtml) {
    const attrRe =
      /<(?:script|link|img|source|audio|video|track|embed|iframe)\b[^>]*?\b(?:src|href|data-src)\s*=\s*(["'])(.*?)\1/gi;
    let m;
    while ((m = attrRe.exec(text))) add(m[2]);
  }

  // url(...) in CSS / inline styles.
  let m2;
  const urlRe = /url\(\s*(["']?)([^"')]+)\1\s*\)/gi;
  while ((m2 = urlRe.exec(text))) add(m2[2]);

  // Bare asset-looking strings inside scripts/json (Unity .data, .wasm, shaders…).
  let m3;
  const strRe = /(["'`])([^"'`\s]+?\.(?:wasm|data|unityweb|json|glb|gltf|bin|png|jpe?g|ogg|mp3|wav|glsl|vert|frag|css|js|mjs))(\?[^"'`]*)?\1/gi;
  while ((m3 = strRe.exec(text))) add(m3[2] + (m3[3] || ''));

  // Resolve all against the document base.
  const out = [];
  for (const r of refs) {
    try {
      out.push(new URL(r, baseUrl).href);
    } catch {
      /* ignore unresolvable */
    }
  }
  return out;
}

/**
 * Capture a web artwork into an edition directory.
 * @returns {Promise<{ resources: Array, baseUrl: string, originHost: string }>}
 */
export async function capture(sourceUrl, editionDir, onProgress = () => {}) {
  const start = new URL(sourceUrl);
  const originHost = start.host;
  const assetsRoot = path.join(editionDir, 'assets');
  await ensureDir(editionDir);

  const resources = [];
  const seen = new Set();
  const queue = [{ url: start.href, depth: 0, isEntry: true }];
  let totalBytes = 0;

  while (queue.length && resources.length < MAX_RESOURCES) {
    const { url, depth, isEntry } = queue.shift();
    if (seen.has(url)) continue;
    seen.add(url);

    let res;
    try {
      res = await fetchWithTimeout(url);
    } catch (err) {
      resources.push({
        url,
        ok: false,
        status: 0,
        risk: true,
        reason: err.name === 'AbortError' ? 'timeout' : 'unreachable',
        external: new URL(url).host !== originHost,
        bytes: 0,
      });
      continue;
    }

    const status = res.status;
    const contentType = res.headers.get('content-type') || '';
    const external = new URL(url).host !== originHost;

    if (!res.ok) {
      // Do NOT persist error bodies. Flag as an at-risk dependency.
      resources.push({
        url,
        ok: false,
        status,
        risk: true,
        reason: status === 403 ? 'blocked' : `http_${status}`,
        external,
        contentType,
        bytes: 0,
      });
      continue;
    }

    const buf = Buffer.from(await res.arrayBuffer());
    totalBytes += buf.length;
    if (totalBytes > MAX_TOTAL_BYTES) {
      resources.push({ url, ok: false, status, risk: true, reason: 'size_cap', external, bytes: buf.length });
      break;
    }

    const local = isEntry ? 'index.html' : localNameForUrl(url);
    const abs = path.join(editionDir, local);
    await ensureDir(path.dirname(abs));
    await writeFile(abs, buf);

    const textLike = isTextLike(contentType, url);
    const text = textLike ? buf.toString('utf8') : null;

    resources.push({
      url,
      ok: true,
      status,
      external,
      contentType,
      bytes: buf.length,
      local,
      sha256: sha256(buf),
      isEntry: !!isEntry,
      text, // kept in-memory for detection + rewrite; stripped before serialization
    });

    onProgress({ phase: 'capture', captured: resources.filter((r) => r.ok).length, url });

    // Discover more references from text resources (one extra level of depth).
    if (text && depth < 2) {
      const isHtml = /html/.test(contentType) || isEntry;
      for (const ref of extractRefs(text, url, isHtml)) {
        if (seen.has(ref)) continue;
        if (!isEntry && !ASSET_EXT.test(ref)) continue; // only chase real assets past entry
        queue.push({ url: ref, depth: depth + 1, isEntry: false });
      }
    }
  }

  return { resources, baseUrl: start.href, originHost };
}

/**
 * Rewrite the entry HTML so every captured external reference points at its
 * local copy. Dead dependencies are left untouched (and flagged elsewhere).
 */
export async function selfContain(editionDir, resources) {
  const entry = resources.find((r) => r.isEntry && r.ok);
  if (!entry || !entry.text) return { rewritten: 0 };

  let html = entry.text;
  let rewritten = 0;
  const start = new URL(entry.url);

  for (const r of resources) {
    if (!r.ok || r.isEntry || !r.local) continue;
    // Compute the relative path from the edition root (entry lives at root).
    const rel = r.local.split(path.sep).join('/');
    const candidates = new Set([r.url]);
    try {
      // Also rewrite the path-relative and root-relative forms.
      const u = new URL(r.url);
      candidates.add(u.pathname + u.search);
      if (u.host === start.host) candidates.add(u.pathname);
    } catch {
      /* ignore */
    }
    for (const c of candidates) {
      if (c && html.includes(c)) {
        html = html.split(c).join(rel);
        rewritten++;
      }
    }
  }

  await writeFile(path.join(editionDir, 'index.html'), html, 'utf8');
  entry.text = html; // keep in sync for any later use
  return { rewritten };
}
