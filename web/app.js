// revenant — interface logic.
// Works in two modes:
//   • live  — a backend is running (node server/server.js): real preservation.
//   • demo  — no backend (e.g. GitHub Pages): the full experience with sample data.

const $ = (sel) => document.querySelector(sel);
const ARCHIVE_KEY = 'revenant.archive.v1';

const CONTRACT_QUESTIONS = [
  { id: 'essence', label: 'La esencia', prompt: '¿Qué es esta obra, en una frase?' },
  { id: 'feel', label: 'El feel', prompt: 'El control, el peso, la jank. ¿Qué se siente igual?' },
  { id: 'tempo', label: 'El tempo', prompt: '¿El ritmo es sagrado? Framerate, latencia, velocidad.' },
  { id: 'atmosphere', label: 'La atmósfera', prompt: 'Estética, sonido, luz, grano.' },
  { id: 'sacred', label: 'Lo sagrado', prompt: '¿Qué NO se toca nunca?' },
  { id: 'mutable', label: 'Lo que puede cambiar', prompt: '¿Qué es accesorio?' },
  { id: 'ai_bounds', label: 'Límite de la IA', prompt: '¿Hasta dónde puede reconstruir la IA lo perdido?' },
];

let LIVE = false;

// ── boot ──────────────────────────────────────────────────────────────────
async function boot() {
  renderContractQuestions();
  renderArchive();
  try { buildEffects(); } catch (e) { console.warn('effects skipped:', e); }
  $('#preserve-form').addEventListener('submit', onSubmit);
  $('#another-btn').addEventListener('click', resetToForm);
  $('#download-passport').addEventListener('click', downloadPassport);
  await probeBackend();
}

async function probeBackend() {
  const pill = $('#mode-pill');
  try {
    const r = await fetch('/api/health', { cache: 'no-store' });
    if (!r.ok) throw new Error();
    const h = await r.json();
    LIVE = true;
    pill.classList.add('live');
    $('#mode-text').textContent = h.ai ? 'motor + IA' : 'motor activo';
  } catch {
    LIVE = false;
    pill.classList.add('demo');
    $('#mode-text').textContent = 'modo demo';
  }
}

// ── submit / descent ─────────────────────────────────────────────────────
let lastResult = null;

async function onSubmit(e) {
  e.preventDefault();
  const url = $('#url').value.trim();
  const title = $('#title').value.trim();
  const artist = $('#artist').value.trim();
  $('#form-hint').textContent = '';

  if (!/^https?:\/\//i.test(url)) {
    $('#form-hint').textContent = 'Pegá una URL que empiece con http:// o https://';
    return;
  }

  $('#descend-btn').disabled = true;
  $('#result').hidden = true;
  $('#descent').hidden = false;
  resetStages();

  // The visual descent and the real work run together; we reveal when both finish.
  const minChoreography = runDescent();
  const work = LIVE
    ? preserveLive({ url, title, artist })
    : preserveDemo({ url, title, artist });

  let result;
  try {
    [result] = await Promise.all([work, minChoreography]);
  } catch (err) {
    $('#descent').hidden = true;
    $('#descend-btn').disabled = false;
    $('#form-hint').textContent = 'No se pudo preservar: ' + (err.message || err);
    return;
  }

  lastResult = result;
  markAllStagesDone();
  await wait(450);
  $('#descent').hidden = true;
  $('#descend-btn').disabled = false;
  renderResult(result);
  saveToArchive(result);
  renderArchive();
  $('#result').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

const STAGES = ['capture', 'release', 'read', 'seal'];

function resetStages() {
  document.querySelectorAll('.stages li').forEach((li) => li.classList.remove('active', 'done'));
  $('#diver').style.top = '0%';
}

async function runDescent() {
  const lis = [...document.querySelectorAll('.stages li')];
  for (let i = 0; i < STAGES.length; i++) {
    lis.forEach((li, j) => li.classList.toggle('done', j < i));
    lis[i].classList.add('active');
    $('#diver').style.top = `${(i / (STAGES.length - 1)) * 100}%`;
    await wait(700 + Math.random() * 500);
  }
}

function markAllStagesDone() {
  document.querySelectorAll('.stages li').forEach((li) => {
    li.classList.remove('active');
    li.classList.add('done');
  });
  $('#diver').style.top = '100%';
}

// ── live preservation (backend) ────────────────────────────────────────────
async function preserveLive({ url, title, artist }) {
  const r = await fetch('/api/preserve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, title, artist }),
  });
  const data = await r.json();
  if (!data.ok) throw new Error(data.error || 'fallo del motor');
  return normalize(data.result, false);
}

// ── demo preservation (no backend) ─────────────────────────────────────────
async function preserveDemo({ url, title, artist }) {
  await wait(300);
  const host = safeHost(url);
  const hash = await sha256Hex(`${url}|${title}|${Date.now()}`);
  const bpm = 40 + (parseInt(hash.slice(0, 4), 16) % 57);

  // Plausible, clearly-illustrative sample for an art game.
  const engines = ['Three.js', 'Unity (WebGL)', 'p5.js', 'PixiJS'];
  const engine = engines[parseInt(hash.slice(4, 6), 16) % engines.length];
  const deps = [
    { host: 'unpkg.com', ok: true, risk: 'medium', note: 'External — copiada local.' },
    { host: 'cdnjs.cloudflare.com', ok: false, risk: 'high', note: 'Bloqueada (403) — ya inalcanzable.' },
  ];
  const apis = [
    { name: 'WebGL', risk: 'low' },
    { name: 'WebGL2', risk: 'low' },
    { name: 'Web Audio', risk: 'low' },
    { name: 'Gamepad API', risk: 'medium' },
  ];

  return normalize(
    {
      slug: 'demo',
      capturedAt: new Date().toISOString(),
      heartbeat: { root: hash, short: hash.slice(0, 12), bpm },
      passport: {
        title: title || host,
        artist: artist || 'Artista desconocida',
        sourceUrl: url,
        riskLevel: 'fragile',
        stack: { engine, libraries: ['Howler.js'], browserApis: apis, deadTech: [] },
        externalDependencies: deps,
        resources: { captured: 7, atRisk: 1, total: 8 },
        narrative:
          `${title || 'Esta obra'} corre sobre ${engine} en el navegador. Una de sus ` +
          `dependencias (cdnjs) ya está bloqueada: fue la primera en pudrirse. El resto se ` +
          `bajó local, así que la obra ya no depende de que esos servidores sigan vivos. ` +
          `(Datos de ejemplo — corré el motor local para preservar de verdad.)`,
      },
      playableUrl: null,
    },
    true
  );
}

// Normalize live/demo into one shape the renderer uses.
function normalize(res, isDemo) {
  const p = res.passport;
  return {
    slug: res.slug,
    isDemo,
    capturedAt: res.capturedAt,
    title: p.title,
    artist: p.artist,
    sourceUrl: p.sourceUrl,
    riskLevel: p.riskLevel,
    engine: p.stack.engine,
    libraries: p.stack.libraries || [],
    browserApis: p.stack.browserApis || [],
    deadTech: p.stack.deadTech || [],
    deps: p.externalDependencies || [],
    resources: p.resources,
    narrative: p.narrative,
    heartbeat: res.heartbeat,
    playableUrl: res.playableUrl,
    passport: p,
  };
}

// ── render result ──────────────────────────────────────────────────────────
function renderResult(r) {
  $('#result').hidden = false;
  $('#res-title').textContent = r.title;
  $('#res-artist').textContent = r.artist + (r.isDemo ? ' · ejemplo' : '');
  $('#res-hash').textContent = r.heartbeat.short;
  $('#res-bpm').textContent = r.heartbeat.bpm;

  const risk = $('#res-risk');
  risk.textContent = riskLabel(r.riskLevel);
  risk.className = 'risk-badge ' + r.riskLevel;

  const rotting = r.riskLevel === 'critical' || r.deps.some((d) => !d.ok);
  $('#heart').classList.toggle('rotting', rotting);
  document.documentElement.style.setProperty('--beat', (60 / r.heartbeat.bpm).toFixed(2) + 's');

  $('#pp-engine').textContent = r.engine;
  $('#pp-libs').textContent = r.libraries.length ? r.libraries.join(', ') : '—';
  $('#pp-apis').textContent = r.browserApis.length
    ? r.browserApis.map((a) => a.name).join(', ')
    : '—';
  $('#pp-res').textContent = `${r.resources.captured} capturados · ${r.resources.atRisk} en riesgo · ${r.resources.total} total`;
  $('#pp-narrative').textContent = r.narrative;

  const list = $('#deps-list');
  list.innerHTML = '';
  if (!r.deps.length) {
    list.innerHTML = '<li class="dep alive"><span class="dep-dot"></span><span class="dep-host">Ya era autocontenida</span></li>';
  }
  for (const d of r.deps) {
    const li = document.createElement('li');
    li.className = 'dep ' + (d.ok ? 'alive' : 'dead');
    li.innerHTML = `<span class="dep-dot"></span><span class="dep-host">${esc(d.host)}</span><span class="dep-note">${esc(d.note || (d.ok ? 'viva' : 'muerta'))}</span>`;
    list.appendChild(li);
  }

  const play = $('#play-link');
  if (r.playableUrl) {
    play.hidden = false;
    play.href = r.playableUrl;
  } else {
    play.hidden = true;
  }
}

// ── contract ────────────────────────────────────────────────────────────────
function renderContractQuestions() {
  const wrap = $('#contract-questions');
  wrap.innerHTML = '';
  for (const q of CONTRACT_QUESTIONS) {
    const div = document.createElement('div');
    div.className = 'cq';
    div.innerHTML = `<label for="cq-${q.id}">${q.label}</label><p class="cq-prompt">${q.prompt}</p><textarea id="cq-${q.id}" data-id="${q.id}" rows="2"></textarea>`;
    wrap.appendChild(div);
  }
}

function collectContractAnswers() {
  const answers = {};
  document.querySelectorAll('#contract-questions textarea').forEach((t) => {
    if (t.value.trim()) answers[t.dataset.id] = t.value.trim();
  });
  return answers;
}

// ── archive (localStorage) ───────────────────────────────────────────────────
function loadArchive() {
  try {
    return JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveToArchive(r) {
  const archive = loadArchive();
  archive.unshift({
    title: r.title,
    artist: r.artist,
    sourceUrl: r.sourceUrl,
    short: r.heartbeat.short,
    bpm: r.heartbeat.bpm,
    riskLevel: r.riskLevel,
    rotting: r.riskLevel === 'critical' || r.deps.some((d) => !d.ok),
    capturedAt: r.capturedAt,
  });
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive.slice(0, 60)));
}

function renderArchive() {
  const archive = loadArchive();
  const reef = $('#reef');
  reef.innerHTML = '';
  $('#archive-count').textContent = archive.length
    ? `${archive.length} obra${archive.length === 1 ? '' : 's'} latiendo`
    : 'vacío todavía';
  if (!archive.length) {
    reef.innerHTML = '<p class="reef-empty">Todavía no trajiste ninguna obra. Empezá arriba.</p>';
    return;
  }
  for (const w of archive) {
    const node = document.createElement('div');
    node.className = 'node' + (w.rotting ? ' rotting' : '');
    node.style.setProperty('--beat', (60 / (w.bpm || 60)).toFixed(2) + 's');
    node.innerHTML = `<span class="node-beat"></span><span class="node-title">${esc(w.title)}</span><span class="node-artist">${esc(w.artist)}</span><span class="node-hash">${esc(w.short)} · ${w.bpm} bpm</span>`;
    node.title = w.sourceUrl;
    node.addEventListener('click', () => window.open(w.sourceUrl, '_blank', 'noopener'));
    reef.appendChild(node);
  }
}

// ── misc ────────────────────────────────────────────────────────────────────
function downloadPassport() {
  if (!lastResult) return;
  const blob = new Blob([JSON.stringify(lastResult.passport, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `passport-${(lastResult.title || 'obra').toLowerCase().replace(/\s+/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function resetToForm() {
  $('#result').hidden = true;
  $('#bay').scrollIntoView({ behavior: 'smooth' });
  $('#url').focus();
}

function riskLabel(level) {
  return { stable: 'estable', fragile: 'frágil', critical: 'crítica' }[level] || level;
}
function safeHost(url) {
  try { return new URL(url).host; } catch { return 'obra'; }
}
async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ── corecore effects: generate the repetitive / textural content ───────────
function buildEffects() {
  // marquees — duplicate the unit so translateX(-50%) loops seamlessly
  document.querySelectorAll('.marquee-track').forEach((t) => {
    const msg = (t.dataset.marquee || t.textContent || '').trim();
    const unit = `${esc(msg)} <span class="amp">&amp;&amp;&amp;</span> `;
    const half = unit.repeat(6);
    t.innerHTML = half + half;
  });
  // echo / stack — copies rising behind a front layer, every 3rd in red
  document.querySelectorAll('.echo').forEach((e) => {
    const word = e.dataset.text || e.textContent.trim() || 'echo';
    const n = parseInt(e.dataset.echo || '10', 10);
    e.textContent = '';
    for (let i = n; i >= 1; i--) {
      const s = document.createElement('span');
      s.className = 'layer';
      s.textContent = word;
      s.style.transform = `translate(${(i * 0.05).toFixed(2)}em, ${(i * 0.09).toFixed(2)}em)`;
      s.style.opacity = Math.max(0.05, 0.5 - i / (n * 2.2)).toFixed(2);
      if (i % 3 === 0) s.style.color = 'var(--red)';
      e.appendChild(s);
    }
    const front = document.createElement('span');
    front.textContent = word;
    e.appendChild(front);
  });
  // hex / data textures
  document.querySelectorAll('[data-hex]').forEach((h) => {
    h.innerHTML = genHex(240);
  });
  // ampersand ornament rules
  document.querySelectorAll('.amp-rule').forEach((a) => {
    a.textContent = (a.dataset.amp || '&').repeat(300);
  });
}

function genHex(n) {
  const frag = ['https://', 'revenant.dead/', '404/', 'GET ', 'wss://', 'sha256:', '0xDEAD', 'cdn.cache/', '/editions/', 'beat=', 'null ', 'undefined ', '%E2%98%A0', '</body>', 'dead.link/'];
  let out = '';
  for (let i = 0; i < n; i++) {
    const f = frag[(Math.random() * frag.length) | 0];
    const h = Math.random().toString(16).slice(2, 10);
    const chunk = `${f}${h} `;
    out += Math.random() < 0.12 ? `<span class="hl">${chunk}</span>` : chunk;
  }
  return out;
}

boot();
