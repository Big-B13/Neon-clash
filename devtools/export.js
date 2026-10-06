/* Character preview harness: runs the REAL buildFighter() code from the game
   through real three.js in Node, then dumps a triangle soup for rasterizing. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO = process.env.REPO || path.resolve(__dirname, '..');
const HTML = process.env.GAME || path.join(REPO, 'index.html');
const THREE_SRC = path.join(REPO, 'three.min.js');

const html = fs.readFileSync(HTML, 'utf8');

/* ---- brace-matched extraction of a top-level function/const block ---- */
function grabByBrace(src, startMarker) {
  const i = src.indexOf(startMarker);
  if (i < 0) throw new Error('marker not found: ' + startMarker);
  let j = src.indexOf('{', i), depth = 0, k = j;
  for (; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}') { depth--; if (depth === 0) break; }
  }
  return src.slice(i, k + 1);
}
function grabArray(src, marker) {
  const i = src.indexOf(marker);
  if (i < 0) throw new Error('array marker not found: ' + marker);
  const s = src.indexOf('[', i);
  let depth = 0, k = s;
  for (; k < src.length; k++) {
    if (src[k] === '[') depth++;
    else if (src[k] === ']') { depth--; if (depth === 0) break; }
  }
  return src.slice(s, k + 1);
}

const matFn = grabByBrace(html, 'function mat(color,emis,ei)');
/* the shared material-preset block the whole cast is built from */
const surfSrc = (() => {
  try {
    const i = html.indexOf('const SURF=');
    const k = html.indexOf('function surf(', i);
    if (i < 0 || k < 0) return '';
    return html.slice(i, k) + grabByBrace(html, 'function surf(');
  } catch (e) { return ''; }
})();
const letterFn = '';
const bEmblemFn = (() => { try { return grabByBrace(html, 'function makeBEmblem('); } catch (e) { return ''; } })();
const buildFn = grabByBrace(html, 'function buildFighter(d,scale)');
const rosterSrc = grabArray(html, 'const ROSTER=');
const extraBuilt = (() => { try { return html.slice(html.indexOf('const BUILDS='), html.indexOf('const BUILDS=') + 4000); } catch (e) { return ''; } })();

/* ---- minimal DOM stub so three.js UMD loads outside a browser ---- */
const sandbox = {
  console, Math, Date, JSON, Object, Array, String, Number, Boolean, Error,
  Float32Array, Uint8Array, Uint16Array, Uint32Array, Int8Array, Int16Array, Int32Array, Set, Map, Promise,
  self: null, window: null,
  document: {
    createElementNS: () => ({ style: {} , getContext: () => null }),
    createElement: (t) => {
      if (t === 'canvas') {
        return {
          width: 1, height: 1, style: {},
          getContext: () => ({
            fillStyle: '', globalCompositeOperation: '', font: '',
            createLinearGradient: () => ({ addColorStop() {} }),
            createRadialGradient: () => ({ addColorStop() {} }),
            fillRect() {}, clearRect() {}, beginPath() {}, arc() {}, fill() {}, stroke() {}, moveTo() {}, lineTo() {}, closePath() {},
            strokeText() {}, fillText() {}, measureText: () => ({ width: 10 }), translate() {}, rotate() {}, scale() {},
            save() {}, restore() {}, translate() {}, rotate() {}, scale() {}, clip() {}, drawImage() {},
            getImageData: () => ({ data: new Uint8ClampedArray(4) }),
          }),
        };
      }
      return { style: {}, appendChild() {}, classList: { toggle() {}, add() {}, remove() {} } };
    },
    getElementById: () => null,
  },
};
sandbox.self = sandbox; sandbox.window = sandbox;
sandbox.globalThis = sandbox;

const ctx = vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(THREE_SRC, 'utf8'), ctx, { filename: 'three.min.js' });
vm.runInContext('var __out={};', ctx);

// provide THREE globally inside sandbox (UMD may attach to module.exports or self)
sandbox.THREE = sandbox.THREE || (sandbox.exports && sandbox.exports.THREE) || null;
vm.runInContext('if(typeof THREE==="undefined"&&typeof self.THREE!=="undefined")var THREE=self.THREE;', ctx);

const prelude = `
var THREE = self.THREE || THREE;
`;
vm.runInContext(prelude, ctx, { filename: 'prelude' });

vm.runInContext(`__out.ROSTER = ${rosterSrc};`, ctx, { filename: 'roster' });
vm.runInContext(matFn, ctx, { filename: 'mat' });
if (surfSrc) vm.runInContext(surfSrc, ctx, { filename: 'surf' });
if (letterFn) vm.runInContext(letterFn, ctx, { filename: 'letterTex' });
if (bEmblemFn) vm.runInContext(bEmblemFn, ctx, { filename: 'makeBEmblem' });
vm.runInContext(buildFn, ctx, { filename: 'buildFighter' });
vm.runInContext('__out.buildFighter = buildFighter;', ctx);
vm.runInContext('__out.THREE = THREE;', ctx);
const THREE = ctx.__out.THREE;

const { ROSTER, buildFighter } = ctx.__out;

/* ---- flatten a built model into world-space triangles ---- */
function collect(model) {
  model.updateMatrixWorld(true);
  const tris = [];
  model.traverse((o) => {
    if (!o.isMesh || o.visible === false) return;
    // an invisible parent hides the whole subtree (traverse still descends into it)
    for (let par = o.parent; par; par = par.parent) if (par.visible === false) return;
    // skip invisible-by-flag placeholders
    const g = o.geometry;
    if (!g || !g.attributes || !g.attributes.position) return;
    const pos = g.attributes.position;
    const nrm = g.attributes.normal;
    const idx = g.index;
    const n = idx ? idx.count : pos.count;
    const m = o.matrixWorld;
    const nm = new THREE.Matrix3().getNormalMatrix(m);
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    const col = mat && mat.color ? [mat.color.r, mat.color.g, mat.color.b] : [1, 1, 1];
    const emi = mat && mat.emissive ? [mat.emissive.r, mat.emissive.g, mat.emissive.b] : [0, 0, 0];
    const ei = (mat && mat.emissiveIntensity !== undefined) ? mat.emissiveIntensity : 0;
    const op = (mat && mat.opacity !== undefined) ? mat.opacity : 1;
    const rough = (mat && mat.roughness !== undefined) ? mat.roughness : 0.45;
    const metal = (mat && mat.metalness !== undefined) ? mat.metalness : 0.25;
    const transparent = !!(mat && mat.transparent);
    const additive = !!(mat && mat.blending === THREE.AdditiveBlending);
    const basic = !!(mat && mat.isMeshBasicMaterial);
    for (let i = 0; i < n; i += 3) {
      const t = [], vn = [];
      for (let k = 0; k < 3; k++) {
        const vi = idx ? idx.getX(i + k) : (i + k);
        const p = new THREE.Vector3(pos.getX(vi), pos.getY(vi), pos.getZ(vi)).applyMatrix4(m);
        t.push([p.x, p.y, p.z]);
        if (nrm) {
          const nv = new THREE.Vector3(nrm.getX(vi), nrm.getY(vi), nrm.getZ(vi)).applyMatrix3(nm).normalize();
          vn.push([nv.x, nv.y, nv.z]);
        }
      }
      tris.push({ p: t, vn: vn.length === 3 ? vn : null, c: col, e: emi, ei, o: op,
                  r: rough, m: metal, tr: transparent, ad: additive, ba: basic,
                  name: o.name || '', sc: o.scale.x });
    }
  });
  return tris;
}

const which = process.argv[2] || 'all';
const out = {};
const expand = [];
for (const def of ROSTER) {
  expand.push({ def, key: def.id });
  if (process.env.ALTS && def.alts) {
    def.alts.forEach((a, i) => {
      if (i === 0) return;
      expand.push({ def: Object.assign({}, def, a.c, { altName: a.name, altIndex: i }), key: def.id + '#' + a.name });
    });
  }
}
for (const item of expand) {
  const def = item.def;
  if (which !== 'all' && def.id !== which) continue;
  try {
    const m = buildFighter(def);
    out[item.key] = { def: { id: def.id, name: def.altName || def.name, c1: def.c1, glow: def.glow,
                             c2: def.c2, skin: def.skin, tag: def.tag }, tris: collect(m) };
  } catch (e) {
    out[item.key] = { def: { id: def.id, name: item.key }, error: e.message, tris: [] };
  }
}
fs.writeFileSync(process.argv[3] || '/tmp/preview/geom.json', JSON.stringify(out));
const summary = Object.entries(out).map(([k, v]) => `${k}:${v.tris ? v.tris.length : 0}${v.error ? ' ERR ' + v.error : ''}`).join('  ');
console.log('exported', summary);
