/* Headless integration harness: runs the REAL game script (from index.html)
   inside a Node sandbox with a stubbed DOM / WebGL, drives synthetic keyboard
   input, and reports whether matches actually play out. */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const REPO = process.env.REPO || path.resolve(__dirname, '..');
const GAME = process.env.GAME || path.join(REPO, 'index.html');
const THREE_SRC = path.join(REPO, 'three.min.js');

const html = fs.readFileSync(GAME, 'utf8');

/* ---------- extract the game script (the last <script> block) ---------- */
const blocks = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
if (!blocks.length) throw new Error('no inline script found');
const gameSrc = blocks[blocks.length - 1];

/* ---------- stubs ---------- */
const noop = () => {};
function ctx2d() {
  const target = {
    canvas: { width: 1280, height: 720 },
    measureText: () => ({ width: 12 }),
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    createPattern: () => ({}),
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(4, (w | 0) * (h | 0) * 4)), width: w | 0, height: h | 0 }),
    putImageData: noop,
  };
  return new Proxy(target, {
    get: (t, k) => (k in t ? t[k] : (typeof k === 'string' && /^(fillStyle|strokeStyle|font|globalAlpha|lineWidth|shadowBlur|shadowColor|globalCompositeOperation|lineCap|lineJoin|textAlign|textBaseline|filter|miterLimit)$/.test(k) ? '' : noop)),
    set: (t, k, v) => { t[k] = v; return true; },
  });
}
function el(id) {
  const e = {
    id, style: { setProperty: noop, removeProperty: noop }, innerHTML: '', textContent: '',
    width: 1280, height: 720, className: '',
    classList: { _s: new Set(), toggle(c, on) { on === undefined ? (this._s.has(c) ? this._s.delete(c) : this._s.add(c)) : (on ? this._s.add(c) : this._s.delete(c)); }, add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); } },
    getContext: () => ctx2d(), getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }),
    appendChild: noop, addEventListener: noop, removeEventListener: noop, setAttribute: noop,
  };
  return e;
}
const els = new Map();
const listeners = { keydown: [], keyup: [], blur: [], resize: [] };

const sandbox = {
  console, Math, Date, JSON, Object, Array, String, Number, Boolean, Error, RegExp, Function,
  Float32Array, Uint8Array, Uint16Array, Uint32Array, Int8Array, Int16Array, Int32Array,
  Uint8ClampedArray, Set, Map, Promise, Symbol, TypeError, parseInt, parseFloat, isNaN, isFinite,
  Infinity, NaN, undefined: undefined, setTimeout, clearTimeout, setInterval, clearInterval,
  performance: { now: () => sandbox.__t },
  __t: 0,
  devicePixelRatio: 1, innerWidth: 1280, innerHeight: 720,
  requestAnimationFrame: (fn) => { sandbox.__raf = fn; return 1; },
  cancelAnimationFrame: noop,
  addEventListener: (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); },
  removeEventListener: noop,
  document: {
    getElementById: (id) => { if (!els.has(id)) els.set(id, el(id)); return els.get(id); },
    createElement: (tag) => (tag === 'canvas' ? el('canvas') : el(tag)),
    createElementNS: () => el('ns'),
    body: el('body'), documentElement: el('html'),
    addEventListener: noop,
    querySelector: () => null, querySelectorAll: () => [],
  },
  location: { href: 'file:///game.html', search: '' },
  navigator: { userAgent: 'node-harness' },
};
sandbox.self = sandbox; sandbox.window = sandbox; sandbox.globalThis = sandbox;

const ctx = vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(THREE_SRC, 'utf8'), ctx, { filename: 'three.min.js' });
vm.runInContext('if (typeof THREE === "undefined" && self.THREE) { var THREE = self.THREE; }', ctx);
// swap the real WebGL renderer for a stub
vm.runInContext(`
  var __RealRenderer = THREE.WebGLRenderer;
  THREE.WebGLRenderer = function () {
    this.shadowMap = { enabled: false, type: 0 };
    this.domElement = document.createElement('canvas');
    this.setPixelRatio = function(){}; this.setSize = function(){}; this.setClearColor = function(){};
    this.render = function(){ this.__frames = (this.__frames||0)+1; };
    this.compile = function(){};
    this.info = { render: { calls: 0 }, memory: {} };
    this.capabilities = { isWebGL2: true, getMaxAnisotropy: function(){ return 1; } };
  };
`, ctx, { filename: 'renderer-stub' });

/* ---------- run the game ---------- */
let errors = [];
try {
  vm.runInContext(gameSrc, ctx, { filename: 'game.js' });
} catch (e) {
  console.error('LOAD ERROR:', e && e.stack ? e.stack.split('\n').slice(0, 6).join('\n') : e);
  process.exit(1);
}

/* ---------- synthetic input ---------- */
function key(k, type) {
  const ev = { key: k, code: /^[0-9]$/.test(k) ? 'Digit' + k : k, preventDefault: noop, repeat: false };
  (listeners[type] || []).forEach(fn => { try { fn(ev); } catch (e) { errors.push('handler(' + type + '):' + e.message); } });
}
const tap = (k, gap = 6) => { key(k, 'keydown'); schedule(gap, () => key(k, 'keyup')); };
const timers = [];
function schedule(frames, fn) { timers.push({ at: ctx.__frameCount + frames, fn }); }

/* ---------- frame driver ---------- */
const STEP = 1000 / 60;
let frames = 0;
ctx.__frameCount = 0;

function step(n = 1) {
  for (let i = 0; i < n; i++) {
    sandbox.__t += STEP;
    frames++; ctx.__frameCount = frames;
    for (let j = timers.length - 1; j >= 0; j--) if (timers[j].at <= frames) { const t = timers[j]; timers.splice(j, 1); t.fn(); }
    const raf = sandbox.__raf; sandbox.__raf = null;
    if (!raf) { errors.push('no rAF scheduled at frame ' + frames); return; }
    try { raf(); } catch (e) { errors.push('frame ' + frames + ': ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)); if (errors.length > 25) return; }
  }
}

/* ---------- scripted session ---------- */
const G = (expr) => vm.runInContext(expr, ctx);

const plan = process.env.PLAN || 'match';
const report = { frames: 0, errors: [], scene: '', percent: [], stocks: [], winner: null, maxCombo: 0, kos: 0, hitTextsSeen: 0 };

step(2);
report.scene = G('sceneName');

// title -> select
tap('Enter'); step(20);
report.scene = G('sceneName');

// lock in both fighters, then start using the roster index env
const p1 = Number(process.env.P1 || 0), p2 = Number(process.env.P2 || 1);
G(`selCursor[0]=${p1};refreshSelect();`);
tap('f'); step(12);
G(`selCursor[1]=${p2};refreshSelect();`);
tap('f'); step(12);
tap('Enter'); step(30);
report.scene = G('sceneName');

if (plan === 'match') {
  // make P1 CPU-driven too and run a full match
  G('players[0].cpu=true; players[0].spdMul=0.85; players[0].aiTimer=0;');
  let prevStocks = [3, 3];
  let prevPercent = [0, 0];
  for (let f = 0; f < 9000; f++) {
    step(1);
    const st = G('[players[0].stocks,players[1].stocks]');
    const pc = G('[Math.round(players[0].percent),Math.round(players[1].percent)]');
    const cmb = G('Math.max(players[0].combo||0,players[1].combo||0)');
    if (cmb > report.maxCombo) report.maxCombo = cmb;
    report.hitTextsSeen += G('hitTexts.length');
    report.kos += G('koFlash>0.5?1:0') ? 0 : 0;
    if (st[0] !== prevStocks[0] || st[1] !== prevStocks[1]) {
      report.kos++;
      prevStocks = st;
      console.log(`  frame ${f}: KO -> stocks ${st[0]}-${st[1]} (percent ${pc[0]}% / ${pc[1]}%)`);
    }
    prevPercent = pc;
    if (G('sceneName') === 'results') { report.winner = G('winner? winner.d.name : null'); break; }
    report.frames = f;
  }
  report.percent = G('[Math.round(players[0].percent),Math.round(players[1].percent)]');
  report.stocks = G('[players[0].stocks,players[1].stocks]');
  report.scene = G('sceneName');
  report.modelPos = G('players.map(p=>[p.model.position.x.toFixed(2),p.model.position.y.toFixed(2),p.model.visible])');
}

/* ---------- per-move smoke test ---------- */
if (plan === 'moves') {
  G('players[0].cpu=false; players[1].cpu=false;');
  const defs = G('ROSTER.map(r=>r.id)');
  const idx = p1;
  G(`selCursor=[${idx},${idx}]`);
  const moves = [];
  // enumerate attack routes
  for (const [name, keys] of [['jab', ['f']], ['upF', ['w', 'f']], ['downF', ['s', 'f']], ['special', ['g']], ['upG', ['w', 'g']]]) {
    // reset the match cleanly
    G('players.forEach(p=>{p.x=470+p.idx*120;p.y=300;p.vx=0;p.vy=0;p.percent=0;p.attack=null;p.cool=0;p.hitstun=0;p.dead=0;p.stocks=3;p.model.visible=true;});');
    for (const k of keys) key(k, 'keydown');
    step(2);
    for (const k of keys) key(k, 'keyup');
    step(70);
    moves.push({ name, ok: !errors.length, attacked: G('true') });
  }
  report.moves = moves;
}


/* ---------- per-character move kit test: every move must actually connect ---------- */
if (plan === 'kit') {
  const moves = [
    { name: 'jab (F)',        keys: ['f'],        frames: 40 },
    { name: 'up-F (W+F)',     keys: ['w', 'f'],   frames: 40 },
    { name: 'down-F (S+F)',   keys: ['s', 'f'],   frames: 40 },
    { name: 'big G',          keys: ['g'],        frames: 60 },
    { name: 'recovery (W+G)', keys: ['w', 'g'],   frames: 60 },
  ];
  const roster = G('ROSTER.map(r=>r.id)');
  const results = [];
  for (let ri = 0; ri < roster.length; ri++) {
    for (const mv of moves) {
      // fresh clean state: P1 and P2 stand 60px apart on the main platform
      G(`mode='2p';selCursor=[${ri},${(ri + 1) % roster.length}];startMatch();`);
      step(2);
      G(`countT=0;`);
      G(`players[0].x=600;players[0].y=548;players[0].face=1;players[0].percent=0;players[0].stocks=3;
         players[1].x=650;players[1].y=548;players[1].face=-1;players[1].percent=0;players[1].stocks=3;
         players[0].invuln=0;players[1].invuln=0;players[0].dead=0;players[1].dead=0;
         players[0].attack=null;players[0].cool=0;players[0].hitstun=0;players[0].vx=0;players[0].vy=0;
         players[1].attack=null;players[1].cool=0;players[1].hitstun=0;players[1].vx=0;players[1].vy=0;
         players[0].model.scale.setScalar(players[0].bodyScale*1.3);`);
      step(2);
      const before = G('[players[1].percent, players[1].x, players[1].y]');
      const beforeSelf = G('[players[0].x, players[0].y]');
      for (const k of mv.keys) key(k, 'keydown');
      step(4);
      for (const k of mv.keys) key(k, 'keyup');
      // sample every frame: peak damage dealt, peak knockback speed, stocks lost
      let peak = 0, peakKb = 0, stocks0 = G('players[1].stocks');
      for (let f = 0; f < mv.frames; f++) {
        step(1);
        const st = G('[players[1].percent, Math.abs(players[1].vx)+Math.abs(players[1].vy), players[1].stocks]');
        if (st[0] > peak) peak = st[0];
        if (st[1] > peakKb) peakKb = st[1];
        if (st[2] !== stocks0) { stocks0 = st[2]; }
      }
      const after = G('[players[1].percent, players[1].x, players[1].y]');
      const afterSelf = G('[players[0].x, players[0].y]');
      const dmg = +peak.toFixed(1);
      const kb = +peakKb.toFixed(1);
      const selfMoved = +Math.hypot(afterSelf[0] - beforeSelf[0], afterSelf[1] - beforeSelf[1]).toFixed(1);
      results.push({ char: roster[ri], move: mv.name, dmg, kb, selfMoved, stocksLost: 3 - stocks0 });
      console.log(`${roster[ri].padEnd(8)} ${mv.name.padEnd(14)} peakDmg=${String(dmg).padStart(5)}  peakKnockback=${String(kb).padStart(6)}  selfMove=${String(selfMoved).padStart(6)}  KOs=${3 - stocks0}`);
    }
  }
  const noDmg = results.filter(r => r.dmg <= 0 && r.selfMoved < 4);
  const whiffed = results.filter(r => r.dmg <= 0);
  console.log('\nMOVES THAT CONNECTED:', results.filter(r => r.dmg > 0).length, '/', results.length);
  console.log('DEAD MOVES:', noDmg.length ? JSON.stringify(noDmg) : 'none');
  console.log('HARNESS ERRORS:', errors.length);
  process.exit(0);
}

report.errors = errors.slice(0, 30);
console.log(JSON.stringify(report, null, 2));
