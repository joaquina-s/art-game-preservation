// Deterministic stack detection. This is the part that does NOT depend on AI:
// it reads the captured code and tells you what the work is made of and what is
// going to rot first. AI (optional) only writes prose on top of this.

const ENGINE_SIGNS = [
  { name: 'Unity (WebGL)', re: /createunityinstance|unityloader|\.unityweb|unitywebgl|\/Build\/[^"']*\.loader\.js/i, kind: 'engine' },
  { name: 'Godot (HTML5)', re: /godot|\.pck["']|engine\.js["'][^>]*godot/i, kind: 'engine' },
  { name: 'Three.js', re: /three(\.module)?(\.min)?\.js|\bTHREE\./, kind: 'engine' },
  { name: 'Babylon.js', re: /babylon(\.min)?\.js|\bBABYLON\./, kind: 'engine' },
  { name: 'PlayCanvas', re: /playcanvas|\bpc\.Application\b/i, kind: 'engine' },
  { name: 'Phaser', re: /phaser(\.min)?\.js|\bPhaser\./, kind: 'engine' },
  { name: 'PixiJS', re: /pixi(\.min)?\.js|\bPIXI\./, kind: 'engine' },
  { name: 'p5.js', re: /p5(\.min)?\.js|\bnew p5\(/, kind: 'engine' },
  { name: 'Construct', re: /c2runtime|c3runtime/i, kind: 'engine' },
  { name: 'Emscripten / WASM build', re: /emscripten|asm\.js|Module\[["']asm/i, kind: 'engine' },
  { name: 'Twine / Harlowe', re: /tw-story|harlowe|twine/i, kind: 'engine' },
  { name: 'Bitsy', re: /bitsy/i, kind: 'engine' },
  { name: 'PuzzleScript', re: /puzzlescript/i, kind: 'engine' },
];

const LIB_SIGNS = [
  { name: 'Howler.js (audio)', re: /howler(\.min)?\.js|\bHowl\(/ },
  { name: 'Tone.js (audio)', re: /tone(\.min)?\.js|\bTone\./ },
  { name: 'GSAP (animation)', re: /gsap|TweenMax|TweenLite/ },
  { name: 'Matter.js (physics)', re: /matter(\.min)?\.js|\bMatter\./ },
  { name: 'Cannon.js (physics)', re: /cannon(\.min)?\.js|\bCANNON\./ },
  { name: 'Socket.IO (networking)', re: /socket\.io/i },
  { name: 'jQuery', re: /jquery(\.min)?\.js|\bjQuery\b/ },
  { name: 'React', re: /react(\.min|\.production)?\.js|ReactDOM/ },
  { name: 'Vue', re: /vue(\.min|\.global)?\.js|\bVue\.createApp/ },
];

const API_SIGNS = [
  { name: 'WebGL', re: /getcontext\(\s*["'](webgl|experimental-webgl)["']/i, risk: 'low' },
  { name: 'WebGL2', re: /getcontext\(\s*["']webgl2["']/i, risk: 'low' },
  { name: 'Web Audio', re: /\b(audiocontext|webkitAudioContext)\b/i, risk: 'low' },
  { name: 'Gamepad API', re: /getgamepads|gamepadconnected/i, risk: 'medium' },
  { name: 'WebXR / VR', re: /navigator\.xr|requestSession|webvr|vrdisplay/i, risk: 'high' },
  { name: 'WebAssembly', re: /webassembly\.|instantiateStreaming|\.wasm["']/i, risk: 'medium' },
  { name: 'WebSocket (live data)', re: /new WebSocket\(|wss?:\/\//i, risk: 'high' },
  { name: 'WebRTC', re: /RTCPeerConnection|getUserMedia/i, risk: 'high' },
  { name: 'Pointer Lock', re: /requestPointerLock/i, risk: 'low' },
  { name: 'Fullscreen', re: /requestFullscreen/i, risk: 'low' },
  { name: 'localStorage / save state', re: /localStorage|indexedDB/i, risk: 'low' },
  { name: 'Service Worker', re: /serviceWorker\.register/i, risk: 'medium' },
];

// Things that are already dead or dying — high obsolescence risk if present.
const DEAD_TECH = [
  { name: 'Adobe Flash (.swf)', re: /\.swf["']|application\/x-shockwave-flash/i },
  { name: 'Java Applet', re: /<applet|application\/x-java-applet/i },
  { name: 'Silverlight', re: /silverlight|\.xap["']/i },
  { name: 'Unity Web Player (pre-WebGL)', re: /unityobject|unity web player/i },
  { name: 'VRML', re: /\.wrl["']|x-world\/x-vrml/i },
];

function scanList(list, text) {
  const out = [];
  for (const item of list) {
    if (item.re.test(text)) out.push(item);
  }
  return out;
}

export function detect(resources, sourceUrl) {
  const textBlob = resources
    .filter((r) => r.ok && r.text)
    .map((r) => r.text)
    .join('\n');

  const engines = scanList(ENGINE_SIGNS, textBlob).map((e) => e.name);
  const libraries = scanList(LIB_SIGNS, textBlob).map((l) => l.name);
  const apis = scanList(API_SIGNS, textBlob);
  const deadTech = scanList(DEAD_TECH, textBlob).map((d) => d.name);

  // External dependencies = captured-from-another-host + everything at risk.
  const externalDeps = resources
    .filter((r) => r.external)
    .map((r) => {
      let host = '';
      try {
        host = new URL(r.url).host;
      } catch {
        host = '(invalid)';
      }
      let risk = 'medium'; // external but captured: medium — it lived elsewhere
      let note = 'External resource, now copied locally.';
      if (!r.ok) {
        risk = 'high';
        note =
          r.reason === 'blocked'
            ? 'Blocked (403) at capture time — the original is already unreachable.'
            : r.reason === 'timeout'
              ? 'Timed out — the host may be gone.'
              : `Failed (${r.reason}) — this dependency is dead or dying.`;
      }
      return { url: r.url, host, ok: r.ok, status: r.status, risk, note };
    });

  // Compose an overall risk level.
  const captured = resources.filter((r) => r.ok).length;
  const atRisk = resources.filter((r) => r.risk).length;
  const highApi = apis.filter((a) => a.risk === 'high').length;
  let level = 'stable';
  if (atRisk > 0 || highApi > 0 || deadTech.length > 0) level = 'fragile';
  if (deadTech.length > 0 || (atRisk > 0 && externalDeps.some((d) => !d.ok))) level = 'critical';

  return {
    engine: engines[0] || 'Custom / unidentified web runtime',
    engines,
    libraries,
    browserApis: apis.map((a) => ({ name: a.name, risk: a.risk })),
    deadTech,
    externalDependencies: externalDeps,
    counts: { captured, atRisk, total: resources.length },
    riskLevel: level,
  };
}
