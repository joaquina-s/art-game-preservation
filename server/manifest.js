// The manifest hashes every file in the edition and folds those hashes into a
// single root hash: the heartbeat. It is what proves the work has not drifted,
// and it is what you would anchor to a chain to mint the "token-heartbeat".

import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { sha256 } from './util.js';

async function walk(dir, base = dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...(await walk(full, base)));
    } else if (e.isFile()) {
      const rel = path.relative(base, full).split(path.sep).join('/');
      out.push(rel);
    }
  }
  return out;
}

// Build a manifest for everything under editionDir EXCEPT the manifest itself.
export async function buildManifest(editionDir, meta = {}) {
  const files = (await walk(editionDir)).filter((f) => f !== 'manifest.json').sort();
  const entries = [];
  let totalBytes = 0;
  for (const rel of files) {
    const buf = await readFile(path.join(editionDir, rel));
    totalBytes += buf.length;
    entries.push({ path: rel, sha256: sha256(buf), bytes: buf.length });
  }
  // Root hash: deterministic fold over "path:hash" lines.
  const fold = entries.map((e) => `${e.path}:${e.sha256}`).join('\n');
  const root = sha256(fold);

  const manifest = {
    spec: 'revenant-manifest/1',
    createdAt: new Date().toISOString(),
    ...meta,
    fileCount: entries.length,
    totalBytes,
    heartbeat: {
      root,
      short: root.slice(0, 12),
      // A stable, human-felt rhythm derived from the hash (40–96 bpm).
      bpm: 40 + (parseInt(root.slice(0, 4), 16) % 57),
    },
    files: entries,
  };
  await writeFile(path.join(editionDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  return manifest;
}

// Compare the current state of an edition against its stored manifest.
export async function detectDrift(editionDir) {
  const manifestPath = path.join(editionDir, 'manifest.json');
  const prev = JSON.parse(await readFile(manifestPath, 'utf8'));
  const prevMap = new Map(prev.files.map((f) => [f.path, f.sha256]));

  const files = (await walk(editionDir)).filter((f) => f !== 'manifest.json');
  const nowMap = new Map();
  for (const rel of files) {
    const buf = await readFile(path.join(editionDir, rel));
    nowMap.set(rel, sha256(buf));
  }

  const changed = [];
  const removed = [];
  const added = [];
  for (const [p, h] of prevMap) {
    if (!nowMap.has(p)) removed.push(p);
    else if (nowMap.get(p) !== h) changed.push(p);
  }
  for (const p of nowMap.keys()) {
    if (!prevMap.has(p)) added.push(p);
  }

  const fold = [...nowMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([p, h]) => `${p}:${h}`)
    .join('\n');
  const root = sha256(fold);
  const intact = root === prev.heartbeat.root;

  return {
    intact,
    previousRoot: prev.heartbeat.root,
    currentRoot: root,
    changed,
    removed,
    added,
  };
}
