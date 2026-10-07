/* ============================================================================
   svgshot.js — offline renderer for the Big-B rig.

   Implements enough of the Canvas2D API to record the rig's draw calls into
   SVG, then shells out to ImageMagick to rasterise a PNG. Lets us verify the
   character art without a browser, and doubles as an asset exporter
   (character-select portraits, move stills, sprite sheets).

   Usage:
     node tools/svgshot.js out.png --pose idle --costume 1 --scale 1.6
     node tools/svgshot.js out.png --move fsmash --at 1300 --costume 3
     node tools/svgshot.js sheet.png --montage
   ========================================================================== */
'use strict';
const fs = require('fs'), path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const sandbox = { Math, console, performance: { now: () => Date.now() } };
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of ['src/bigb.js', 'src/moves.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
}
const { BIGB, BIGB_MOVES } = sandbox;

/* ------------------------------------------------------------- recorder --- */
const N = v => Math.round(v * 100) / 100;

class SvgCtx {
  constructor() {
    this.parts = [];
    this.filters = new Map();
    this.stack = [];
    this.m = [1, 0, 0, 1, 0, 0];
    this.path = '';
    this.cur = null;
    this.sub = null;
    this.props = {
      fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, lineCap: 'butt', lineJoin: 'miter',
      globalAlpha: 1, globalCompositeOperation: 'source-over', shadowColor: '', shadowBlur: 0,
      font: '10px sans-serif', textAlign: 'start', textBaseline: 'alphabetic'
    };
  }
  save() { this.stack.push(this.m.slice()); }
  restore() { if (this.stack.length) this.m = this.stack.pop(); }
  setTransform(a, b, c, d, e, f) { this.m = [a, b, c, d, e, f]; }
  translate(x, y) { this._mul([1, 0, 0, 1, x, y]); }
  scale(x, y) { this._mul([x, 0, 0, y, 0, 0]); }
  rotate(a) { const c = Math.cos(a), s = Math.sin(a); this._mul([c, s, -s, c, 0, 0]); }
  _mul(n) {
    const m = this.m;
    this.m = [
      m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
      m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
      m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]
    ];
  }
  _p(x, y) { const m = this.m; return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; }
  _t() { return `matrix(${this.m.map(N).join(' ')})`; }
  get _style() { return `transform="${this._t()}"`; }
  _attrs(extra) {
    const p = this.props;
    const out = [];
    if (p.globalAlpha !== 1) out.push(`opacity="${N(p.globalAlpha)}"`);
    if (p.globalCompositeOperation === 'lighter') out.push('style="mix-blend-mode:screen"');
    if (extra) out.push(extra);
    return out.join(' ');
  }
  _glowFilter() {
    const p = this.props;
    if (!p.shadowBlur || !p.shadowColor || p.shadowColor === 'rgba(0,0,0,0)') return '';
    const key = `${p.shadowColor}_${Math.round(p.shadowBlur)}`;
    if (!this.filters.has(key)) {
      const id = 'gl' + this.filters.size;
      const sd = Math.max(0.6, p.shadowBlur / 3).toFixed(2);
      this.filters.set(key, {
        id,
        markup: `<filter id="${id}" x="-90%" y="-90%" width="280%" height="280%">` +
          `<feGaussianBlur stdDeviation="${sd}" result="b"/>` +
          `<feFlood flood-color="${p.shadowColor}" result="c"/>` +
          `<feComposite in="c" in2="b" operator="in" result="cb"/>` +
          `<feMerge><feMergeNode in="cb"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`
      });
    }
    return `filter="url(#${this.filters.get(key).id})"`;
  }
  /* --- paths --- */
  beginPath() { this.path = ''; this.cur = null; this.sub = null; }
  closePath() { if (this.path) this.path += 'Z'; this.cur = this.sub; }
  moveTo(x, y) { this.path += `M${N(x)} ${N(y)}`; this.cur = [x, y]; this.sub = [x, y]; }
  lineTo(x, y) { this.path += `L${N(x)} ${N(y)}`; this.cur = [x, y]; }
  quadraticCurveTo(cx, cy, x, y) { this.path += `Q${N(cx)} ${N(cy)} ${N(x)} ${N(y)}`; this.cur = [x, y]; }
  bezierCurveTo(a, b, c, d, x, y) { this.path += `C${N(a)} ${N(b)} ${N(c)} ${N(d)} ${N(x)} ${N(y)}`; this.cur = [x, y]; }
  _arc(x, y, r, a0, a1, ccw) {
    const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
    const sweep = ccw ? 0 : 1;
    const sx = x + Math.cos(a0) * r, sy = y + Math.sin(a0) * r;
    const ex = x + Math.cos(a1) * r, ey = y + Math.sin(a1) * r;
    this.path += `A${N(r)} ${N(r)} 0 ${large} ${sweep} ${N(ex)} ${N(ey)}`;
    this.cur = [ex, ey];
    return [sx, sy];
  }
  arc(x, y, r, a0, a1, ccw) {
    const sx = x + Math.cos(a0) * r, sy = y + Math.sin(a0) * r;
    if (!this.cur) this.moveTo(sx, sy); else this.lineTo(sx, sy);
    this._arc(x, y, r, a0, a1, ccw);
  }
  arcTo(x1, y1, x2, y2, r) {
    const p0 = this.cur || [x1, y1];
    let a1 = Math.atan2(p0[1] - y1, p0[0] - x1);
    let a2 = Math.atan2(y2 - y1, x2 - x1);
    let da = a2 - a1;
    while (da < -Math.PI) da += Math.PI * 2;
    while (da > Math.PI) da -= Math.PI * 2;
    const d = Math.abs(r / Math.tan(da / 2));
    const t1 = [x1 + Math.cos(a1) * d, y1 + Math.sin(a1) * d];
    const t2 = [x1 + Math.cos(a2) * d, y1 + Math.sin(a2) * d];
    this.path += `L${N(t1[0])} ${N(t1[1])}`;
    const large = Math.abs(da) > Math.PI ? 1 : 0;
    const sweep = da > 0 ? 1 : 0;
    this.path += `A${N(r)} ${N(r)} 0 ${large} ${sweep} ${N(t2[0])} ${N(t2[1])}`;
    this.cur = t2;
  }
  ellipse(cx, cy, rx, ry, rot, a0, a1, ccw) {
    this.parts.push(`<ellipse cx="${N(cx)}" cy="${N(cy)}" rx="${N(rx)}" ry="${N(ry)}" ` +
      `transform="${this._t()} rotate(${N(rot * 180 / Math.PI)} ${N(cx)} ${N(cy)})" ` +
      `fill="${this.props.fillStyle}" stroke="none" ${this._attrs()} ${this._glowFilter()}/>`);
    this.path = '';
  }
  roundRect(x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
  }
  _fillStroke() {
    const p = this.props, out = [];
    out.push(`fill="${p.fillStyle === 'none' ? 'none' : p.fillStyle}"`);
    out.push(`stroke="${p.strokeStyle === 'none' ? 'none' : p.strokeStyle}"`);
    out.push(`stroke-width="${N(p.lineWidth)}"`);
    out.push(`stroke-linecap="${p.lineCap}" stroke-linejoin="${p.lineJoin}"`);
    return out.join(' ');
  }
  fill() {
    if (!this.path) return;
    this.parts.push(`<path d="${this.path}" transform="${this._t()}" fill="${this.props.fillStyle}" ` +
      `stroke="none" ${this._attrs()} ${this._glowFilter()}/>`);
  }
  stroke() {
    if (!this.path) return;
    this.parts.push(`<path d="${this.path}" transform="${this._t()}" fill="none" ` +
      `stroke="${this.props.strokeStyle}" stroke-width="${N(this.props.lineWidth)}" ` +
      `stroke-linecap="${this.props.lineCap}" stroke-linejoin="${this.props.lineJoin}" ` +
      `${this._attrs()} ${this._glowFilter()}/>`);
  }
  fillRect(x, y, w, h) {
    this.parts.push(`<rect x="${N(x)}" y="${N(y)}" width="${N(w)}" height="${N(h)}" transform="${this._t()}" ` +
      `fill="${this.props.fillStyle}" ${this._attrs()} ${this._glowFilter()}/>`);
  }
  clearRect() { }
  strokeRect(x, y, w, h) {
    this.parts.push(`<rect x="${N(x)}" y="${N(y)}" width="${N(w)}" height="${N(h)}" transform="${this._t()}" ` +
      `fill="none" stroke="${this.props.strokeStyle}" stroke-width="${N(this.props.lineWidth)}" ${this._attrs()}/>`);
  }
  fillText(str, x, y) {
    const anchor = this.props.textAlign === 'center' ? 'middle' : this.props.textAlign === 'right' ? 'end' : 'start';
    this.parts.push(`<text x="${N(x)}" y="${N(y)}" transform="${this._t()}" fill="${this.props.fillStyle}" ` +
      `font-family="Arial Black, Impact, sans-serif" font-size="${this._fs()}px" font-weight="900" font-style="italic" ` +
      `text-anchor="${anchor}" ${this._attrs()} ${this._glowFilter()}>${escapeXml(str)}</text>`);
  }
  strokeText() { }
  _fs() { const m = /(\d+(?:\.\d+)?)px/.exec(this.props.font); return m ? m[1] : 12; }
  measureText() { return { width: 10 }; }
  clip() { }
  /* gradients: returned object is used as a fillStyle; flatten to a mid colour */
  createLinearGradient() { return { addColorStop() { } }; }
  createRadialGradient() { return { addColorStop() { } }; }
  toSvg(w, h, bg) {
    const defs = this.filters.size ? `<defs>${[...this.filters.values()].join('')}</defs>` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
      (bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : '') + defs + this.parts.join('') + `</svg>`;
  }
}
function escapeXml(s) { return String(s).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])); }

/* Canvas2D lets you assign styling straight onto the context — proxy those
   assignments through to our props bag so the recorder sees them. */
['fillStyle', 'strokeStyle', 'lineWidth', 'lineCap', 'lineJoin', 'globalAlpha',
  'globalCompositeOperation', 'shadowColor', 'shadowBlur', 'font', 'textAlign', 'textBaseline'
].forEach(p => {
  Object.defineProperty(SvgCtx.prototype, p, {
    get() { return this.props[p]; },
    set(v) { this.props[p] = (v && typeof v === 'object') ? '#888' : v; }
  });
});

/* ---------------------------------------------------------------- scene --- */
const stageBg = (w, h) => `
<rect width="${w}" height="${h}" fill="#070b14"/>
<circle cx="${w * 0.82}" cy="${h * 0.16}" r="30" fill="#cfe8f2" opacity="0.85"/>
<rect y="${h * 0.62}" width="${w}" height="${h * 0.38}" fill="#080e1c"/>
<rect y="${h * 0.62}" width="${w}" height="3" fill="#00f0ff" opacity="0.35"/>
<path d="M0 ${h * 0.62} L${w} ${h * 0.62}" stroke="#00f0ff" stroke-width="2" opacity="0.5" fill="none"/>`;

function poseAt(moveId, atMs, costumeIdx) {
  const def = BIGB_MOVES.MOVES[moveId];
  let pose = BIGB.clonePose(BIGB_MOVES.BASE_POSE);
  if (!def) return pose;
  let t = 0;
  let start = BIGB.clonePose(pose);
  for (let i = 0; i < def.steps.length; i++) {
    const s = def.steps[i];
    start = BIGB.clonePose(pose);
    if (s.pose) {
      if (s.pose.kat !== undefined) pose.kat = s.pose.kat;
      if (s.pose.guns !== undefined) pose.guns = s.pose.guns;
    }
    if (atMs <= t + s.d) {
      const EASE = { linear: x => x, inOut: x => 0.5 - 0.5 * Math.cos(Math.PI * x), outCubic: x => 1 - Math.pow(1 - x, 3), inCubic: x => x * x * x, outBack: x => 1 + 2.9 * Math.pow(x - 1, 3) + 1.9 * Math.pow(x - 1, 2) };
      const k = BIGB.clamp((atMs - t) / s.d, 0, 1), ez = (EASE[s.e || 'inOut'] || EASE.inOut)(k), b = s.pose || {};
      BIGB.NUMK.forEach(key => { const tv = b[key] !== undefined ? b[key] : start[key]; pose[key] = BIGB.lerp(start[key], tv, ez); });
      BIGB.OBJK.forEach(key => { for (const j in start[key]) { const tv = (b[key] && b[key][j] !== undefined) ? b[key][j] : start[key][j]; pose[key][j] = BIGB.lerp(start[key][j], tv, ez); } });
      return pose;
    }
    const k = 1, ez = 1, b = s.pose || {};
    BIGB.NUMK.forEach(key => { const tv = b[key] !== undefined ? b[key] : start[key]; pose[key] = BIGB.lerp(start[key], tv, ez); });
    BIGB.OBJK.forEach(key => { for (const j in start[key]) { const tv = (b[key] && b[key][j] !== undefined) ? b[key][j] : start[key][j]; pose[key][j] = BIGB.lerp(start[key][j], tv, ez); } });
    t += s.d;
  }
  return pose;
}

function shot(out, opts) {
  const W = opts.w || 520, H = opts.h || 620;
  const c = new SvgCtx();
  const pose = poseAt(opts.move || 'idle', opts.at || 0);
  const scale = opts.scale || 1.5;
  // reposition so the character is centred in frame
  const fitScale = scale;
  pose.x = pose.x - 340;       // relative to centre
  pose.y = pose.y - 520;
  const cx = W / 2, cy = H * 0.62;
  const costume = BIGB.COSTUMES[opts.costume || 0];
  const moveX = cx + pose.x * fitScale;
  const moveY = cy + pose.y * fitScale;
  pose.x = moveX; pose.y = moveY;

  c.save();
  c.translate(0, 0);
  BIGB.drawBigB(c, pose, costume, null, { t: opts.t || 0, scarfPts: null }, { t: opts.t || 0, dt: 16, scale: fitScale, q: 'high' });
  c.restore();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${[...c.filters.values()].join('')}</defs>
  ${opts.bg === false ? '' : stageBg(W, H)}
  ${c.parts.join('')}
  <text x="14" y="${H - 14}" fill="#7d8ba1" font-family="Consolas,monospace" font-size="12">${escapeXml(costume.name)} — ${escapeXml(opts.move || 'idle')} @ ${opts.at || 0}ms</text>
  </svg>`;
  const svgPath = out + '.svg';
  fs.writeFileSync(svgPath, svg);
  execFileSync('magick', [svgPath, out], { stdio: 'inherit' });
  return out;
}

/* ------------------------------------------------------------------ cli ---- */
function arg(name, def) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 ? process.argv[i + 1] : def;
}
if (require.main === module) {
  const out = process.argv[2] || 'shot.png';
  shot(out, {
    move: arg('move', 'idle'),
    at: parseInt(arg('at', '0'), 10),
    costume: parseInt(arg('costume', '0'), 10),
    scale: parseFloat(arg('scale', '1.5')),
    w: parseInt(arg('w', '520'), 10),
    h: parseInt(arg('h', '620'), 10)
  });
  console.log('wrote', out);
}

module.exports = { SvgCtx, shot, poseAt };
