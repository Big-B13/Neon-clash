/* Headless smoke test for the Big-B rig + all move data.
   Run: node test/smoke.js
   Catches: NaN joints, NaN draw args, throwing event handlers, bad env usage. */
const fs = require('fs'), path = require('path');
const vm = require('vm');

const sandbox = { Math, console, performance: { now: () => Date.now() } };
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of ['src/bigb.js', 'src/moves.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), sandbox, { filename: f });
}
const { BIGB, BIGB_MOVES } = sandbox;

/* ---------------------------------------------------- mock 2D context ----- */
let nanArgs = 0, calls = 0;
function guard(name) {
  return (...a) => {
    calls++;
    for (const v of a) {
      if (typeof v === 'number' && !Number.isFinite(v)) {
        nanArgs++; console.error('  !! NaN in ctx.' + name, a);
      }
    }
  };
}
const ctxMethods = ['save', 'restore', 'translate', 'rotate', 'scale', 'clearRect', 'fillRect', 'strokeRect',
  'beginPath', 'closePath', 'moveTo', 'lineTo', 'arc', 'arcTo', 'ellipse', 'quadraticCurveTo', 'bezierCurveTo',
  'fill', 'stroke', 'clip', 'roundRect', 'fillText', 'strokeText', 'setTransform'];
const mockCtx = {};
ctxMethods.forEach(m => mockCtx[m] = guard(m));
const props = ['fillStyle', 'strokeStyle', 'lineWidth', 'lineCap', 'lineJoin', 'globalAlpha',
  'globalCompositeOperation', 'shadowColor', 'shadowBlur', 'font', 'textAlign', 'textBaseline'];
props.forEach(p => mockCtx[p] = '');
mockCtx.measureText = () => ({ width: 10 });

/* ------------------------------------------------------------ rig test ---- */
console.log('— rig —');
const BASE = BIGB_MOVES.BASE_POSE;
const J = BIGB.solve(BASE);
let bad = 0;
Object.keys(J).forEach(k => {
  const v = J[k];
  if (v && typeof v.x === 'number') {
    if (!Number.isFinite(v.x) || !Number.isFinite(v.y)) { bad++; console.error('  NaN joint:', k); }
  }
});
console.log(`  joints solved: ${Object.keys(J).length}, NaN: ${bad}`);
const height = -J.head.y + BASE.hipY;
console.log(`  hip ${BASE.hipY} → head centre y ${J.head.y.toFixed(1)} (character ≈ ${(BASE.hipY - J.head.y + 25).toFixed(0)}px tall with hat)`);

/* full-frame draw of every costume */
const state = { t: 0, scarfPts: null };
for (const co of BIGB.COSTUMES) {
  BIGB.drawBigB(mockCtx, Object.assign({}, BASE), co, null, state, { t: 100, dt: 16, scale: 1, q: 'high' });
}
console.log(`  drew all ${BIGB.COSTUMES.length} costumes, ctx calls ${calls}, NaN args ${nanArgs}`);

/* ---------------------------------------------------------- move sweep ---- */
console.log('— moves —');
const EASE = {
  linear: t => t, inOut: t => 0.5 - 0.5 * Math.cos(Math.PI * t),
  outCubic: t => 1 - Math.pow(1 - t, 3), inCubic: t => t * t * t,
  outBack: t => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
};
const events = { hits: 0, fx: 0, sounds: 0 };
function mockEnv(pose) {
  const env = {
    P: pose, pal: BIGB.COSTUMES[0], dummy: { x: 720, chestY: 448, dmg: 0 },
    tether: { x: 525, y: 250 },
    get J() { const j = BIGB.solve(pose); const o = {}; Object.keys(j).forEach(k => { const v = j[k]; if (v && typeof v.x === 'number') o[k] = { x: v.x + pose.x, y: v.y + pose.y }; }); return o; },
    hit(d, k, l) { if (!Number.isFinite(d)) throw new Error('hit dmg NaN'); events.hits++; },
    shoot() { events.fx++; }, trip() { }, bounce() { }, throwOut() { }, grab() { },
    setTimer(ms, fn) { events.fx++; }, shake() { }, flash() { }, slow() { },
    afterimage() { events.fx++; }, glitchSplit() { events.fx++; },
    voidOn() { }, voidOff() { }, bones: false
  };
  env.fx = new Proxy({}, { get: () => (...a) => { events.fx++; a.forEach(v => { if (typeof v === 'number' && !Number.isFinite(v)) throw new Error('fx NaN arg'); }); } });
  env.sfx = new Proxy({}, { get: () => () => { events.sounds++; } });
  return env;
}
const NUMK = BIGB.NUMK, OBJK = BIGB.OBJK;
let tested = 0, failures = 0;
for (const [groupId, ids] of BIGB_MOVES.ORDER) {
  for (const id of ids) {
    const def = BIGB_MOVES.MOVES[id];
    if (!def) { console.error('  missing move def:', id); failures++; continue; }
    let pose = BIGB.clonePose(BASE), start = BIGB.clonePose(BASE);
    try {
      for (let i = 0; i < def.steps.length; i++) {
        const s = def.steps[i];
        start = BIGB.clonePose(pose);
        if (s.pose) {
          if (s.pose.kat !== undefined) pose.kat = s.pose.kat;
          if (s.pose.guns !== undefined) pose.guns = s.pose.guns;
        }
        if (s.on) s.on(mockEnv(pose));
        // sample the whole step at 4 points
        for (const frac of [0.25, 0.5, 0.75, 1]) {
          const k = frac, ez = (EASE[s.e || 'inOut'] || EASE.inOut)(k), b = s.pose || {};
          NUMK.forEach(key => { const tv = b[key] !== undefined ? b[key] : start[key]; pose[key] = BIGB.lerp(start[key], tv, ez); });
          OBJK.forEach(key => { for (const j in start[key]) { const tv = (b[key] && b[key][j] !== undefined) ? b[key][j] : start[key][j]; pose[key][j] = BIGB.lerp(start[key][j], tv, ez); } });
          if (s.ev) s.ev.forEach(e => { if (k >= e[0]) e[1](mockEnv(pose)); });
          if (s.tick) s.tick(16, k, mockEnv(pose));
          const JJ = BIGB.solve(pose);
          Object.keys(JJ).forEach(kk => { const v = JJ[kk]; if (v && typeof v.x === 'number' && (!Number.isFinite(v.x) || !Number.isFinite(v.y))) throw new Error('NaN joint ' + kk + ' in ' + id); });
          BIGB.drawBigB(mockCtx, pose, BIGB.COSTUMES[0], null, { t: 0, scarfPts: null }, { t: 200, dt: 16, scale: 1, q: 'high' });
        }
      }
      tested++;
    } catch (e) {
      failures++; console.error('  ✗ ' + id + ': ' + e.message);
    }
  }
}
console.log(`  moves exercised: ${tested}, failures: ${failures}`);
console.log(`  hit events fired: ${events.hits}, fx calls: ${events.fx}, sound calls: ${events.sounds}`);
console.log(`  total ctx calls: ${calls}, NaN args: ${nanArgs}`);

/* -------------------------------------------------------- frame budget ---- */
const t0 = process.hrtime.bigint();
const frames = 600;
for (let i = 0; i < frames; i++) {
  const p = BIGB.clonePose(BASE);
  p.tA = 5 + Math.sin(i / 20) * 8;
  p.aR.u = 16 + Math.sin(i / 13) * 40;
  BIGB.drawBigB(mockCtx, p, BIGB.COSTUMES[0], null, state, { t: i * 16, dt: 16, scale: 1 });
}
const ms = Number(process.hrtime.bigint() - t0) / 1e6;
console.log(`— perf — ${frames} rig draws in ${ms.toFixed(1)}ms → ${(ms / frames).toFixed(3)}ms/draw (logic only, no GPU)`);

const ok = failures === 0 && nanArgs === 0 && bad === 0;
console.log(ok ? '\nALL CHECKS PASSED' : '\nCHECKS FAILED');
process.exit(ok ? 0 : 1);
