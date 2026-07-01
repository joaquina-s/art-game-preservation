// revenant — interface preview (front-end only).
// Nothing is preserved here. On "preserve", the interface runs a staged
// sequence and reveals a pre-authored, illustrative edition for the chosen
// input type. All output below is sample data.

const $ = (sel) => document.querySelector(sel);
const ARCHIVE_KEY = 'revenant.archive.v2';

// ── pre-authored sample editions ────────────────────────────────────────────
// One per input type. Web takes the "working" path (a self-contained copy that
// runs); engine builds take the "diagnosis" path (read + risk report, with the
// rebuilt environment marked as the frontier).
const SAMPLES = {
  web: {
    type: 'web',
    kind: 'web / webgl',
    path: 'working',
    title: 'One More Sim',
    artist: 'Joaquina Salgado',
    source: 'https://onemoresim.example',
    runtime: 'Three.js r158 · WebGL2',
    origState: 'runs offline · self-contained',
    origSub: 'the self-contained copy — it runs with no servers',
    built: [
      ['Engine / runtime', 'Three.js r158 (WebGL2)'],
      ['Libraries', 'Howler.js, Tween.js, Stats.js'],
      ['Browser APIs', 'WebGL2, Web Audio, Gamepad, Pointer Lock'],
      ['Assets', 'GLB models, KTX2 textures, OGG audio'],
    ],
    deps: [
      { host: 'unpkg.com/three@0.158', status: 'localized', note: 'copied into the edition' },
      { host: 'fonts.gstatic.com', status: 'localized', note: 'copied into the edition' },
      { host: 'cdnjs.cloudflare.com/howler', status: 'lost', note: 'returns 403 — gone, flagged' },
      { host: 'scores.onemoresim.live', status: 'lost', note: 'server offline — live leaderboard' },
    ],
    resources: { captured: 41, localized: 39, lost: 2 },
    risk: {
      level: 'fragile',
      report:
        'The copy runs offline. Two dependencies are already gone: the Howler CDN (403) ' +
        'and the live leaderboard server. The first is localized from cache; the second has ' +
        'no copy left and is marked for reconstruction.',
    },
    recollection: {
      lead:
        'The self-contained copy keeps running with no servers at all. The live leaderboard ' +
        'it once talked to is gone; the AI reconstructs a stand-in from captured data so the ' +
        'screen fills again, bounded by the score below.',
      provenance: [
        { part: 'world & core loop', origin: 'captured' },
        { part: 'audio & assets', origin: 'captured' },
        { part: 'live leaderboard', origin: 'reconstructed' },
      ],
    },
    score: {
      sacred: 'The exact feel of the jump and the fog. Framerate above 50.',
      mutable: 'The leaderboard backend. The ad-hoc network code.',
      rebuild: 'Reconstruct a plausible leaderboard from captured scores. Never invent new levels.',
    },
  },

  unreal: {
    type: 'unreal',
    kind: 'unreal engine build',
    path: 'diagnosis',
    title: 'Drowned World',
    artist: 'Joaquina Salgado',
    source: 'DrownedWorld.uproject',
    runtime: 'Unreal Engine 5.3.2',
    origState: 'needs its original toolchain',
    origSub: 'the build exactly as delivered',
    built: [
      ['Engine', 'Unreal Engine 5.3.2'],
      ['Render features', 'Nanite, Lumen (SW + HW), Virtual Shadow Maps'],
      ['Plugins', 'Niagara, MetaSounds, Water, Chaos Physics'],
      ['Gameplay', 'Custom C++ module, Blueprint graphs'],
    ],
    deps: [
      { host: 'Online Subsystem: Steam', status: 'risk', note: 'account + Steam runtime required' },
      { host: 'Wwise (Audiokinetic)', status: 'risk', note: 'proprietary middleware, versioned' },
      { host: 'NVIDIA DLSS plugin', status: 'risk', note: 'vendor + driver dependent' },
      { host: 'Chaos / PhysX', status: 'localized', note: 'engine-bundled' },
    ],
    risk: {
      level: 'critical',
      report:
        'Runs only on the UE 5.3 toolchain with a GPU that supports Shader Model 6. Lumen and ' +
        'Nanite need hardware that will age out. The Steam Online Subsystem and DLSS are ' +
        'vendor-locked and can be deprecated. Keeping the binary alone will not keep this running.',
    },
    recollection: {
      lead:
        'Rebuilding the environment this build needs — the UE 5.3 toolchain, the render ' +
        'features, the vendor SDKs — so it launches on hardware that has not shipped yet. ' +
        'Today revenant delivers the diagnosis; the reconstruction is what this accelerator builds.',
      provenance: [
        { part: 'build & assets', origin: 'captured' },
        { part: 'engine toolchain', origin: 'reconstructed' },
        { part: 'render features (Nanite / Lumen)', origin: 'reconstructed' },
        { part: 'Steam / DLSS SDKs', origin: 'reconstructed' },
      ],
    },
    score: {
      sacred: 'The Lumen lighting mood. The underwater physics feel.',
      mutable: 'The exact GPU vendor path. DLSS can be swapped for a generic upscaler.',
      rebuild: 'Rebuild the runtime so it launches. Keep render output within a visible tolerance.',
    },
  },

  unity: {
    type: 'unity',
    kind: 'unity build',
    path: 'diagnosis',
    title: 'Neon Tide',
    artist: 'Joaquina Salgado',
    source: 'NeonTide (Unity project)',
    runtime: 'Unity 2022.3.18 LTS',
    origState: 'needs its original toolchain',
    origSub: 'the build exactly as delivered',
    built: [
      ['Engine', 'Unity 2022.3.18 LTS'],
      ['Render features', 'Universal Render Pipeline (URP), Shader Graph, post-processing'],
      ['Packages', 'Cinemachine, Input System, TextMeshPro, Addressables'],
      ['Scripting', 'C# · IL2CPP backend'],
    ],
    deps: [
      { host: 'Addressables remote catalog', status: 'risk', note: 'content served from a live CDN' },
      { host: 'Unity Analytics / Ads SDK', status: 'risk', note: 'phones home to Unity endpoints' },
      { host: 'FMOD Studio', status: 'risk', note: 'proprietary audio middleware' },
      { host: 'Steamworks.NET', status: 'risk', note: 'account + Steam runtime' },
    ],
    risk: {
      level: 'critical',
      report:
        'The IL2CPP build is tied to its platform toolchain and target. Addressables pulls ' +
        'content from a remote catalog that will go dark; the Analytics / Ads SDK calls ' +
        'endpoints that can be retired. URP and Shader Graph are versioned to this editor. ' +
        'The binary alone will not survive its services.',
    },
    recollection: {
      lead:
        'Rebuilding what the project depends on outside itself — the Addressables catalog, the ' +
        'retired SDK endpoints, the exact editor and render pipeline — so it runs without the ' +
        'services it was born into. Today revenant delivers the diagnosis; the reconstruction ' +
        'is what this accelerator builds.',
      provenance: [
        { part: 'scenes & assets', origin: 'captured' },
        { part: 'Addressables content', origin: 'reconstructed' },
        { part: 'analytics / ads endpoints', origin: 'reconstructed' },
        { part: 'editor + URP toolchain', origin: 'reconstructed' },
      ],
    },
    score: {
      sacred: 'The neon palette and the tide timing.',
      mutable: 'The ad / analytics layer — remove it. Remote content can be baked in.',
      rebuild: 'Bake Addressables content locally. Stub the dead SDKs. Do not alter the scenes.',
    },
  },
};

const SCORE_FIELDS = [
  { id: 'sacred', label: 'sacred', prompt: 'What must never change?' },
  { id: 'mutable', label: 'may change', prompt: 'What may change to keep it alive?' },
  { id: 'rebuild', label: 'rebuild limit', prompt: 'How far may the recollection rebuild what is lost?' },
];

let currentType = 'web';
let lastResult = null;

// ── boot ──────────────────────────────────────────────────────────────────
function boot() {
  try { buildEffects(); } catch (e) { console.warn('effects skipped:', e); }
  document.querySelectorAll('.type').forEach((b) =>
    b.addEventListener('click', () => selectType(b.dataset.type)));
  $('#buildfile').addEventListener('change', onBuildFile);
  $('#preserve-form').addEventListener('submit', onSubmit);
  $('#another-btn').addEventListener('click', resetToForm);
  $('#download-passport').addEventListener('click', downloadPassport);
  selectType('web');
  renderArchive();
  maybeDeepLink();
}

// A shareable link straight to a sample edition, e.g. ...#sample=unreal.
// Renders the pre-authored edition immediately, skipping the animation.
async function maybeDeepLink() {
  const m = /[#?&]sample=(web|unreal|unity)/.exec(location.hash + location.search);
  if (!m) return;
  const s = SAMPLES[m[1]];
  selectType(s.type);
  const short = (await sha256Hex(`${s.type}|${s.title}|${s.source}`)).slice(0, 10);
  const result = { ...s, signature: short };
  lastResult = result;
  renderResult(result);
  saveToArchive(result);
  renderArchive();
}

// ── type selection ──────────────────────────────────────────────────────────
function selectType(type) {
  currentType = type in SAMPLES ? type : 'web';
  const s = SAMPLES[currentType];
  document.querySelectorAll('.type').forEach((b) =>
    b.setAttribute('aria-pressed', String(b.dataset.type === currentType)));

  const isWeb = currentType === 'web';
  $('#field-url').hidden = !isWeb;
  $('#field-drop').hidden = isWeb;

  // Prefill the form with the sample so it reads as authored, still editable.
  $('#title').placeholder = s.title;
  $('#artist').placeholder = s.artist;
  $('#url').placeholder = isWeb ? 'https://your-art-game.example' : '';
  $('#drop-sample').textContent = s.source;
  $('#drop-title').textContent = 'drop a build folder';
  $('#buildfile').value = '';
  $('#form-hint').textContent = '';
}

// A chosen file only updates the displayed name — its bytes are not read.
function onBuildFile(e) {
  const f = e.target.files && e.target.files[0];
  $('#drop-title').textContent = f ? `loaded · ${f.name}` : 'drop a build folder';
}

// ── submit / staged sequence ────────────────────────────────────────────────
async function onSubmit(e) {
  e.preventDefault();
  const s = SAMPLES[currentType];
  $('#form-hint').textContent = '';

  // Web wants a URL; if given, it must look like one. Everything else is sample.
  const typedUrl = $('#url').value.trim();
  if (currentType === 'web' && typedUrl && !/^https?:\/\//i.test(typedUrl)) {
    $('#form-hint').textContent = 'A URL should start with http:// or https:// — or leave it blank to load the sample.';
    return;
  }

  const title = $('#title').value.trim() || s.title;
  const artist = $('#artist').value.trim() || s.artist;
  const source = currentType === 'web' ? (typedUrl || s.source) : s.source;
  const short = (await sha256Hex(`${currentType}|${title}|${source}|${Date.now()}`)).slice(0, 10);

  const result = { ...s, title, artist, source, signature: short };

  $('#descend-btn').disabled = true;
  $('#result').hidden = true;
  $('#descent').hidden = false;
  resetStages();

  const choreography = runDescent();
  await choreography;

  lastResult = result;
  markAllStagesDone();
  await wait(420);
  $('#descent').hidden = true;
  $('#descend-btn').disabled = false;
  renderResult(result);
  saveToArchive(result);
  renderArchive();
  $('#result').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetStages() {
  document.querySelectorAll('.stages li').forEach((li) => li.classList.remove('active', 'done'));
  $('#diver').style.top = '0px';
}

function diverTo(li) {
  if (li) $('#diver').style.top = `${li.offsetTop + li.offsetHeight / 2 - 6}px`;
}

async function runDescent() {
  const stages = [...document.querySelectorAll('.stages li')];
  for (let i = 0; i < stages.length; i++) {
    stages.forEach((li, j) => li.classList.toggle('done', j < i));
    stages[i].classList.add('active');
    diverTo(stages[i]);
    await wait(680 + Math.random() * 460);
  }
}

function markAllStagesDone() {
  const stages = [...document.querySelectorAll('.stages li')];
  stages.forEach((li) => { li.classList.remove('active'); li.classList.add('done'); });
  diverTo(stages[stages.length - 1]);
}

// ── render the preserved edition ────────────────────────────────────────────
function renderResult(r) {
  $('#result').hidden = false;
  $('#result').dataset.path = r.path;
  $('#res-title').textContent = r.title;
  $('#res-artist').textContent = r.artist;
  $('#res-kind').textContent = r.kind;
  $('#res-hash').textContent = r.signature;
  $('#res-hash-2').textContent = r.signature;

  const risk = $('#res-risk');
  risk.textContent = riskLabel(r.risk.level);
  risk.className = 'risk-badge ' + r.risk.level;

  // the original — the captured object at a glance
  $('#orig-sub').textContent = r.origSub;
  const origKv = r.type === 'web'
    ? [['runtime', r.runtime], ['state', r.origState]]
    : [['engine', r.runtime], ['state', r.origState]];
  fillKv('#orig-kv', origKv);

  // the recollection — rebuilt by AI, the frontier
  $('#rec-copy').textContent = r.recollection.lead;
  const prov = $('#rec-prov');
  prov.innerHTML = '';
  for (const p of r.recollection.provenance) {
    const li = document.createElement('li');
    li.className = p.origin === 'captured' ? 'orig' : 'ai';
    li.innerHTML = `<span class="prov-dot"></span><span class="prov-part">${esc(p.part)}</span><span class="prov-tag">${p.origin === 'captured' ? 'original' : 'reconstructed'}</span>`;
    prov.appendChild(li);
  }

  // the passport — the deep read
  fillKv('#pp-built', r.built);
  const res = $('#pp-res');
  if (r.resources) {
    res.hidden = false;
    res.textContent = `${r.resources.captured} files captured · ${r.resources.localized} localized into the edition · ${r.resources.lost} gone, flagged`;
  } else {
    res.hidden = true;
  }
  const list = $('#deps-list');
  list.innerHTML = '';
  for (const d of r.deps) {
    const li = document.createElement('li');
    li.className = 'dep ' + d.status;
    li.innerHTML = `<span class="dep-dot"></span><span class="dep-host">${esc(d.host)}</span><span class="dep-note">${esc(d.note)}</span>`;
    list.appendChild(li);
  }
  $('#pp-risk').innerHTML = `${esc(r.risk.report)}<span class="cursor"></span>`;

  // the score — editable, prefilled to read as authored
  const grid = $('#score-grid');
  grid.innerHTML = '';
  for (const f of SCORE_FIELDS) {
    const div = document.createElement('div');
    div.className = 'cq';
    div.innerHTML =
      `<label for="cq-${f.id}">${f.label}</label>` +
      `<p class="cq-prompt">${f.prompt}</p>` +
      `<textarea id="cq-${f.id}" data-id="${f.id}" rows="2"></textarea>`;
    grid.appendChild(div);
    div.querySelector('textarea').value = r.score[f.id] || '';
  }
}

function fillKv(sel, pairs) {
  const dl = $(sel);
  dl.innerHTML = '';
  for (const [dt, dd] of pairs) {
    const t = document.createElement('dt');
    t.textContent = dt;
    const d = document.createElement('dd');
    d.textContent = dd;
    dl.append(t, d);
  }
}

// ── archive (localStorage) ───────────────────────────────────────────────────
function loadArchive() {
  try { return JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]'); }
  catch { return []; }
}

function saveToArchive(r) {
  const archive = loadArchive();
  archive.unshift({
    title: r.title, artist: r.artist, kind: r.kind,
    signature: r.signature, level: r.risk.level, at: new Date().toISOString(),
  });
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive.slice(0, 60)));
}

function renderArchive() {
  const archive = loadArchive();
  const reef = $('#reef');
  reef.innerHTML = '';
  $('#archive-count').textContent = archive.length
    ? `${archive.length} edition${archive.length === 1 ? '' : 's'} · sample`
    : 'empty so far';
  if (!archive.length) {
    reef.innerHTML = '<p class="reef-empty">No editions yet. Preserve one above.</p>';
    return;
  }
  for (const w of archive) {
    const node = document.createElement('div');
    node.className = 'node';
    node.innerHTML =
      `<span class="node-sig" aria-hidden="true"></span>` +
      `<span class="node-title">${esc(w.title)}</span>` +
      `<span class="node-artist">${esc(w.artist)} · ${esc(w.kind)}</span>` +
      `<span class="node-hash">signature ${esc(w.signature)}</span>`;
    reef.appendChild(node);
  }
}

// ── actions ──────────────────────────────────────────────────────────────────
function downloadPassport() {
  if (!lastResult) return;
  const r = lastResult;
  const passport = {
    _note: 'Sample edition from the revenant interface preview. Not a real preservation.',
    title: r.title, artist: r.artist, type: r.kind, source: r.source,
    signature: r.signature,
    builtOn: Object.fromEntries(r.built),
    dependencies: r.deps,
    resources: r.resources || null,
    obsolescenceRisk: r.risk,
    recollection: r.recollection,
    score: collectScore(),
  };
  const blob = new Blob([JSON.stringify(passport, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `passport-${(r.title || 'work').toLowerCase().replace(/\s+/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function collectScore() {
  const out = {};
  document.querySelectorAll('#score-grid textarea').forEach((t) => {
    if (t.value.trim()) out[t.dataset.id] = t.value.trim();
  });
  return out;
}

function resetToForm() {
  $('#result').hidden = true;
  $('#bay').scrollIntoView({ behavior: 'smooth' });
}

// ── helpers ──────────────────────────────────────────────────────────────────
function riskLabel(level) {
  return { stable: 'stable', fragile: 'fragile', critical: 'high risk' }[level] || level;
}
async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ── corecore textures: only the ones the page actually uses ──────────────────
function buildEffects() {
  // top marquee — duplicate the unit so translateX(-50%) loops seamlessly
  document.querySelectorAll('.marquee-track').forEach((t) => {
    const msg = (t.dataset.marquee || t.textContent || '').trim();
    const unit = `${esc(msg)} <span class="amp">&amp;&amp;&amp;</span> `;
    t.innerHTML = unit.repeat(6) + unit.repeat(6);
  });
  // vertical ticker — duplicated list for a seamless loop
  document.querySelectorAll('[data-ticker]').forEach((t) => {
    const items = ['the last server is dying', 'flash † 2021', 'geocities † 2009', '404 not found', 'wss:// closed', 'keep it running', 'dead.link/'];
    const html = items.map((x) => `<div>${esc(x)} <span class="hl">&amp;&amp;</span></div>`).join('');
    t.innerHTML = html + html;
  });
}

boot();
