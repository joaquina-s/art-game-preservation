// Orchestrates the whole descent: capture -> self-contain -> detect -> passport
// -> contract -> manifest (heartbeat). Returns a summary the interface draws.

import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { capture, selfContain } from './capture.js';
import { detect } from './detect.js';
import { buildPassport, passportToMarkdown } from './passport.js';
import { buildContract, contractToMarkdown } from './contract.js';
import { buildManifest } from './manifest.js';
import { enrichNarrative } from './ai.js';
import { slugify, ensureDir, nowIso, sha256 } from './util.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const EDITIONS_DIR = path.join(__dirname, '..', 'editions');

export async function preserve({ url, title, artist, answers = {} }, onProgress = () => {}) {
  if (!url || !/^https?:\/\//i.test(url)) {
    throw new Error('Necesito una URL http(s) válida de la obra.');
  }
  const capturedAt = nowIso();
  const slug = `${slugify(title || new URL(url).host)}-${sha256(url + capturedAt).slice(0, 6)}`;
  const editionDir = path.join(EDITIONS_DIR, slug);
  await ensureDir(editionDir);

  // 1. Descend: capture the work and everything it loads.
  onProgress({ phase: 'capture', message: 'Bajando hasta la obra…' });
  const cap = await capture(url, editionDir, onProgress);

  // 2. Release: cut it loose from the dead servers.
  onProgress({ phase: 'release', message: 'Soltándola de los servidores muertos…' });
  const { rewritten } = await selfContain(editionDir, cap.resources);

  // 3. Read: deterministic stack detection + risk report.
  onProgress({ phase: 'read', message: 'Leyendo su cuerpo…' });
  const detection = detect(cap.resources, url);

  // Optional AI prose on top of the deterministic facts.
  const aiNarrative = await enrichNarrative({ title, artist, detection });

  const passport = buildPassport({
    title,
    artist,
    sourceUrl: url,
    detection,
    capturedAt,
    narrative: aiNarrative || undefined,
  });

  const contract = buildContract({ title, artist, answers, capturedAt });

  // 4. Seal: write artifacts, then hash everything into the heartbeat.
  onProgress({ phase: 'seal', message: 'Sellando el latido…' });
  await writeFile(path.join(editionDir, 'passport.json'), JSON.stringify(passport, null, 2), 'utf8');
  await writeFile(path.join(editionDir, 'passport.md'), passportToMarkdown(passport), 'utf8');
  await writeFile(path.join(editionDir, 'contract.json'), JSON.stringify(contract, null, 2), 'utf8');
  await writeFile(path.join(editionDir, 'contract.md'), contractToMarkdown(contract), 'utf8');

  const manifest = await buildManifest(editionDir, {
    title: passport.title,
    artist: passport.artist,
    sourceUrl: url,
    aiEnriched: Boolean(aiNarrative),
  });

  // Strip in-memory text bodies before returning to the client.
  const resources = cap.resources.map(({ text, ...r }) => r);

  return {
    slug,
    editionDir,
    capturedAt,
    rewritten,
    passport,
    contract,
    manifest,
    heartbeat: manifest.heartbeat,
    resources,
    aiEnriched: Boolean(aiNarrative),
    // Path the static server can serve the playable, self-contained edition from.
    playableUrl: `/editions/${slug}/index.html`,
  };
}
