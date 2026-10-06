/* In-game capture harness.
   Loads the REAL game, drives actual gameplay inputs, and at the peak of each
   action exports the whole scene (stage + backdrop + both fighters, with their
   live animation poses applied by syncModel) plus the live game camera.
   Output feeds scene_raster.py, which software-renders it to PNG. */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const REPO = process.env.REPO || path.resolve(__dirname, '..');
const GAME = process.env.GAME || path.join(REPO, 'index.html');
const THREE_SRC = path.join(REPO, 'three.min.js');
const OUT = process.env.OUT || '/tmp/scene.json';

const html = fs.readFileSync(GAME, 'utf8');
const blocks = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const gameSrc = blocks[blocks.length - 1];

const noop = () => {};
function ctx2d() {
  const t = { canvas: { width: 1280, height: 720 }, measureText: () => ({ width: 12 }),
    createLinearGradient: () => ({ addColorStop: noop }), createRadialGradient: () => ({ addColorStop: noop }),
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(4, (w | 0) * (h | 0) * 4)), width: w | 0, height: h | 0 }),
    putImageData: noop };
  return new Proxy(t, {
    get: (o, k) => (k in o ? o[k] : (typeof k === 'string' && /^(fillStyle|strokeStyle|font|globalAlpha|lineWidth|shadowBlur|shadowColor|globalCompositeOperation|textAlign|textBaseline|lineCap|lineJoin)$/.test(k) ? '' : noop)),
    set: (o, k, v) => { o[k] = v; return true; } });
}
function el(id) {
  return { id, style: { setProperty: noop }, innerHTML: '', textContent: '', width: 1280, height: 720, className: '',
    classList: { _s: new Set(), toggle(c, on) { on === undefined ? (this._s.has(c) ? this._s.delete(c) : this._s.add(c)) : (on ? this._s.add(c) : this._s.delete(c)); }, add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); } },
    getContext: () => ctx2d(), appendChild: noop, addEventListener: noop, setAttribute: noop };
}
const els = new Map();
const listeners = { keydown: [], keyup: [], blur: [], resize: [] };
const sandbox = {
  console, Math, Date, JSON, Object, Array, String, Number, Boolean, Error, RegExp, Function,
  Float32Array, Uint8Array, Uint16Array, Uint32Array, Int8Array, Int16Array, Int32Array,
  Uint8ClampedArray, Set, Map, Promise, Symbol, TypeError, parseInt, parseFloat, isNaN, isFinite,
  Infinity, NaN, setTimeout, clearTimeout, setInterval, clearInterval,
  performance: { now: () => sandbox.__t }, __t: 0,
  devicePixelRatio: 1, innerWidth: 1280, innerHeight: 720,
  requestAnimationFrame: (fn) => { sandbox.__raf = fn; return 1; }, cancelAnimationFrame: noop,
  addEventListener: (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); },
  removeEventListener: noop,
  document: { getElementById: (id) => { if (!els.has(id)) els.set(id, el(id)); return els.get(id); },
    createElement: (tag) => el(tag), createElementNS: () => el('ns'), body: el('body'), documentElement: el('html'),
    addEventListener: noop, querySelector: () => null, querySelectorAll: () => [] },
  location: { href: 'file:///game.html', search: '' }, navigator: { userAgent: 'node' },
};
sandbox.self = sandbox; sandbox.window = sandbox; sandbox.globalThis = sandbox;
const ctx = vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(THREE_SRC, 'utf8'), ctx, { filename: 'three.min.js' });
vm.runInContext('if (typeof THREE === "undefined" && self.THREE) { var THREE = self.THREE; }', ctx);
vm.runInContext(`
  THREE.WebGLRenderer = function () {
    this.shadowMap = { enabled: false, type: 0 };
    this.domElement = document.createElement('canvas');
    this.setPixelRatio = function(){}; this.setSize = function(){}; this.setClearColor = function(){};
    this.render = function(){}; this.compile = function(){};
    this.info = { render: { calls: 0 }, memory: {} };
    this.capabilities = { isWebGL2: true, getMaxAnisotropy: function(){ return 1; } };
  };
`, ctx, { filename: 'renderer-stub' });

try { vm.runInContext(gameSrc, ctx, { filename: 'game.js' }); }
catch (e) { console.error('LOAD ERROR:', e.stack ? e.stack.split('\n').slice(0, 6).join('\n') : e); process.exit(1); }

/* ---- scene collector: same colour/emissive model as the character exporter ---- */
vm.runInContext(`
__collect = function (root) {
  const tris = [], markers = [], lines = [], points = [];
  root.updateMatrixWorld(true);
  root.traverse(function (o) {
    if (o.visible === false) return;
    let par = o.parent, vis = true;
    while (par) { if (par.visible === false) { vis = false; break; } par = par.parent; }
    if (!vis) return;
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    const p = new THREE.Vector3();
    if (o.isLineSegments || o.isLine) {
      const g2 = o.geometry;
      if (!g2 || !g2.attributes || !g2.attributes.position) return;
      const pa = g2.attributes.position, ia = g2.index;
      const ca = g2.attributes.color;
      const cnt = ia ? ia.count : pa.count;
      const base = m && m.color ? [m.color.r, m.color.g, m.color.b] : [1, 1, 1];
      const op = (m && m.opacity !== undefined) ? m.opacity : 1;
      for (let i = 0; i + 1 < cnt; i += 2) {
        const seg = [];
        const cols = [];
        for (let k = 0; k < 2; k++) {
          const vi = ia ? ia.getX(i + k) : (i + k);
          p.set(pa.getX(vi), pa.getY(vi), pa.getZ(vi)).applyMatrix4(o.matrixWorld);
          seg.push([p.x, p.y, p.z]);
          cols.push(ca ? [ca.getX(vi), ca.getY(vi), ca.getZ(vi)] : base);
        }
        lines.push({ p: seg, c: cols[0], o: op });
      }
      return;
    }
    if (o.isPoints) {
      const g3 = o.geometry;
      if (!g3 || !g3.attributes || !g3.attributes.position) return;
      const pa2 = g3.attributes.position;
      const base2 = m && m.color ? [m.color.r, m.color.g, m.color.b] : [1, 1, 1];
      for (let i = 0; i < pa2.count; i += 1) {
        p.set(pa2.getX(i), pa2.getY(i), pa2.getZ(i)).applyMatrix4(o.matrixWorld);
        points.push({ p: [p.x, p.y, p.z], c: base2,
          s: (m && m.size !== undefined) ? m.size : 0.3,
          o: (m && m.opacity !== undefined) ? m.opacity : 1 });
      }
      return;
    }
    if (!o.isMesh) return;
    const g = o.geometry;
    if (!g || !g.attributes || !g.attributes.position) return;
    if (m && m.map) {                       // textured: the sun disc, or additive FX sprites
      o.getWorldPosition(p);
      const par2 = g.parameters || {};
      const ws = new THREE.Vector3(); o.getWorldScale(ws);
      markers.push({ pos: [p.x, p.y, p.z],
                     w: (par2.width || 1) * ws.x, h: (par2.height || 1) * ws.y,
                     c: m.color ? [m.color.r, m.color.g, m.color.b] : [1, 1, 1],
                     op: (m.opacity !== undefined) ? m.opacity : 1,
                     add: !!(m.blending === THREE.AdditiveBlending),
                     spin: o.rotation.z });
      return;
    }
    const pos = g.attributes.position, nrm = g.attributes.normal, idx = g.index, n = idx ? idx.count : pos.count;
    const nm = new THREE.Matrix3().getNormalMatrix(o.matrixWorld);
    const col = m && m.color ? [m.color.r, m.color.g, m.color.b] : [1,1,1];
    const emi = m && m.emissive ? [m.emissive.r, m.emissive.g, m.emissive.b] : [0,0,0];
    const rough = (m && m.roughness !== undefined) ? m.roughness : 0.45;
    const metal = (m && m.metalness !== undefined) ? m.metalness : 0.25;
    for (let i = 0; i < n; i += 3) {
      const t = [], vn = [];
      for (let k = 0; k < 3; k++) {
        const vi = idx ? idx.getX(i + k) : (i + k);
        p.set(pos.getX(vi), pos.getY(vi), pos.getZ(vi)).applyMatrix4(o.matrixWorld);
        t.push([p.x, p.y, p.z]);
        if (nrm) {
          const nv = new THREE.Vector3(nrm.getX(vi), nrm.getY(vi), nrm.getZ(vi)).applyMatrix3(nm).normalize();
          vn.push([nv.x, nv.y, nv.z]);
        }
      }
      tris.push({ p: t, vn: vn.length === 3 ? vn : null, c: col, e: emi,
        r: rough, m: metal,
        ei: (m && m.emissiveIntensity !== undefined) ? m.emissiveIntensity : 0,
        o: (m && m.opacity !== undefined) ? m.opacity : 1,
        tr: !!(m && m.transparent), ad: !!(m && m.blending === THREE.AdditiveBlending),
        ba: !!(m && m.isMeshBasicMaterial) });
    }
  });
  return { tris: tris, markers: markers, lines: lines, points: points };
};
__heroCam = function (tx, ty, dist, height, side) {
  camera.position.set(tx + (side === undefined ? 1.5 : side), height, dist);
  camera.lookAt(tx, ty, 0);
  camera.updateMatrixWorld(true);
};
__camera = function () {
  return { p: [camera.position.x, camera.position.y, camera.position.z],
           q: [camera.quaternion.x, camera.quaternion.y, camera.quaternion.z, camera.quaternion.w],
           fov: camera.fov, aspect: camera.aspect };
};
`, ctx, { filename: 'collector' });

const G = (expr) => vm.runInContext(expr, ctx);
const timers = [];
const schedule = (frames, fn) => timers.push({ at: ctx.__frameCount + frames, fn });
function key(k, type) {
  const ev = { key: k, code: /^[0-9]$/.test(k) ? 'Digit' + k : k, preventDefault: noop, repeat: false };
  (listeners[type] || []).forEach(fn => { try { fn(ev); } catch (e) {} });
}
const tap = (k, gap = 5) => { key(k, 'keydown'); schedule(gap, () => key(k, 'keyup')); };
let frames = 0;
const STEP = 1000 / 60;
const errors = [];
function step(n = 1) {
  for (let i = 0; i < n; i++) {
    sandbox.__t += STEP; frames++; ctx.__frameCount = frames;
    for (let j = timers.length - 1; j >= 0; j--) if (timers[j].at <= frames) { const t = timers[j]; timers.splice(j, 1); t.fn(); }
    const raf = sandbox.__raf; sandbox.__raf = null;
    if (!raf) return;
    try { raf(); } catch (e) { errors.push((e.stack || e.message).split('\n').slice(0, 2).join(' | ')); }
  }
}
const TRI_SIZE = Number(process.env.TRI || 0);   // optional triangle budget trim

/* ---- boot into a duel ---- */
step(2);
tap('Enter'); step(20);
G(`mode='2p';selCursor=[0,1];startMatch();`); step(30);
G('countT=0;');

/* place both fighters on the main platform, 150px apart, facing off */
const STAGE_SETUP = `
  players[0].x=560;players[0].y=548;players[0].face=1;players[0].invuln=0;players[0].dead=0;
  players[1].x=710;players[1].y=548;players[1].face=-1;players[1].invuln=0;players[1].dead=0;
  players.forEach(p=>{p.cpu=false;p.vx=0;p.vy=0;p.percent=0;p.attack=null;p.cool=0;p.hitstun=0;p.ko=0;
    p.gunT=0;p.spin360=0;p.showGuns=false;p.model.visible=true;});
`;

const shots = [];
function shot(name, label, setup, framesToPeak, prep, close) {
  G(STAGE_SETUP);
  if (prep) G(prep);
  if (close && close.solo === true) {
    G(`players[1].x=1180;players[1].y=548;players[1].face=-1;`);   // out of the shot
    G(`players[0].face=1;`);
  }
  step(3);
  if (setup) { setup(); }
  step(framesToPeak);
  if (close && close.solo === 'after') {
    G(`players[1].x=1180;players[1].y=548;players[1].model.visible=false;`);
  }
  if (close) {                                   // cinematic close-up of the hero
    const hx = G('players[0].wx'), hy = G('players[0].wy');   // world: feet on the deck
    const cd = close.dist || 6;
    const side = close.side === undefined ? cd * 0.92 : close.side;   // 3/4 view of the face
    G(`__heroCam(${hx}, ${(hy + 1.28).toFixed(2)}, ${cd}, ${(hy + 1.75).toFixed(2)}, ${side.toFixed(2)})`);
    G('players[0].model.userData.aura.material.opacity=0.02; players[0].model.userData.disc.material.opacity=0.10;');
    if (close.clean !== false) {
      G(`sun.visible=false; skyline.visible=false; shards.visible=false; horizonGlow.visible=false;
         motes.geo.attributes.position.needsUpdate=true;`);
      G('scene.traverse(o=>{ if(o.isPoints) o.visible=false; });');
    }
  }
  const scene = G('__collect(scene)');
  const cam = G('__camera()');
  shots.push({ name, label, tris: scene.tris, markers: scene.markers, lines: scene.lines,
               points: scene.points, camera: cam });
  console.log(`${label.padEnd(30)} tris=${scene.tris.length} lines=${scene.lines.length} pts=${scene.points.length} cam=[${cam.p.map(v => v.toFixed(1)).join(', ')}]`);
  // let everything settle before the next shot, and put the skybox back
  G(`sun.visible=true; skyline.visible=true; shards.visible=true; horizonGlow.visible=true;
     scene.traverse(o=>{ if(o.isPoints) o.visible=true; });`);
  G('players.forEach(p=>{p.attack=null;p.hitstun=0;p.cool=0;p.percent=0;p.ko=0;p.model.rotation.set(0,0,0);});');
  step(6);
}

/* ---- the shots: wide gameplay framing, then clean hero portraits ---- */
shot('faceoff', 'IN-GAME — FACE-OFF', null, 46);

/* portraits: Kage alone, facing camera */
shot('portrait-idle', 'BIG-B — IDLE', null, 40, null, { dist: 4.7, solo: true });
shot('portrait-run', 'BIG-B — RUNNING', () => { key('d', 'keydown'); }, 30,
     null, { dist: 5.2, side: 2.6, solo: true });
G("keys['d']=false;");
shot('portrait-jab', 'BIG-B — KATANA JAB', () => { tap('f'); }, 6, null, { dist: 5.0, solo: true });
shot('portrait-trick', 'BIG-B — TRICK SHOT', () => { tap('g'); }, 5, null, { dist: 4.4, solo: true });
shot('portrait-blink', 'BIG-B — BLINK FANG', () => { key('w', 'keydown'); tap('g'); schedule(4, () => key('w', 'keyup')); }, 7,
     null, { dist: 5.0, side: -4.6, solo: 'after' });
shot('portrait-ultimate', 'BIG-B — FINAL SMASH', () => { G('players[0].ko=100;'); step(2); tap('g'); }, 20,
     null, { dist: 5.0, solo: true });
shot('air-jump', 'AIR — SASH + BLADE', () => {
  G('players[0].x=470;players[0].y=430;players[0].onGround=false;players[0].vy=-2;players[0].jumpsLeft=1;');
  tap('f');
}, 7, null, { dist: 5.4, side: 3.0, solo: true });

const out = { shots, size: { w: Number(process.env.W || 1000), h: Number(process.env.H || 620) } };
fs.writeFileSync(OUT, JSON.stringify(out));
console.log('\nwrote', OUT, '| shots:', shots.length, '| errors:', errors.length);
if (errors.length) console.log(errors.slice(0, 5).join('\n'));
