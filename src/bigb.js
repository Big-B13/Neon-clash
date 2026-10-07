/* ============================================================================
   BIG-B — CHARACTER RIG / RENDERER / FX
   ----------------------------------------------------------------------------
   Portable module. No DOM dependencies beyond a 2D canvas context, so the same
   file drives the design lab AND the in-game fighters next.

   Conventions (matches the original animation-data.json rig spec):
     - side view, facing +X, canvas y-down
     - angle 0 = straight down, 90 = forward, 180 = up
     - character origin (pose.x, pose.y) = ground point under the feet
     - bones are rigid segments; hips lead, chest follows, head last
   ========================================================================== */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------------ math -- */
  const rad = d => d * Math.PI / 180;
  const dir = (a, l) => ({ x: Math.sin(rad(a)) * l, y: Math.cos(rad(a)) * l });
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const TAU = Math.PI * 2;

  function shade(hex, amt) {
    if (hex[0] !== '#' || hex.length < 7) return hex;
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (amt < 0) { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
    else { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
    const h = v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0');
    return '#' + h(r) + h(g) + h(b);
  }
  function mix(a, b, t) {
    const na = parseInt(a.slice(1), 16), nb = parseInt(b.slice(1), 16);
    const ch = s => [(s >> 16) & 255, (s >> 8) & 255, s & 255];
    const A = ch(na), B = ch(nb);
    const h = v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0');
    return '#' + h(lerp(A[0], B[0], t)) + h(lerp(A[1], B[1], t)) + h(lerp(A[2], B[2], t));
  }

  /* -------------------------------------------------------------- costumes -- */
  /* 8 alt costumes from the smash card. Palettes sampled from the alt renders
     where they exist; invented (and flagged) where they don't yet.            */
  const COSTUMES = [
    {
      id: 'neon-default', name: '01 · NEON DEFAULT', rendered: true,
      hoodie: '#e8e6e1', shirt: '#f6f5f2', vest: '#191b21', strap: '#2b2f38',
      shorts: '#1b1d23', shortsTrim: '#26292f', tights: '#171a20',
      shoe: '#1a1c22', sole: '#eceae4', hat: '#16181d', hatBand: '#0f1115',
      glove: '#14161b', neck: '#101216', belt: '#0f1116', buckle: '#c9ccd2',
      led: '#ffb347', trim: '#ffb347', blade: '#eafcff', bladeGlow: '#00f0ff',
      scarf: '#15171c', sheath: '#20505f', gun: '#2b2f38', emblem: '#00f0ff',
      fx: '#00f0ff', fx2: '#ff2d78'
    },
    {
      id: 'oni-crimson', name: '02 · ONI CRIMSON', rendered: true,
      hoodie: '#7e1d26', shirt: '#8c2029', vest: '#141216', strap: '#2a2126',
      shorts: '#151317', shortsTrim: '#241a1e', tights: '#141216',
      shoe: '#17151a', sole: '#8e1f2a', hat: '#15131a', hatBand: '#3d1219',
      glove: '#121016', neck: '#0e0c11', belt: '#0e0c11', buckle: '#b03030',
      led: '#ff2b2b', trim: '#ff3b30', blade: '#ffdcd6', bladeGlow: '#ff3326',
      scarf: '#121016', sheath: '#5c1418', gun: '#2a2126', emblem: '#ff2b2b',
      fx: '#ff3326', fx2: '#ff9d3d'
    },
    {
      id: 'ghost-protocol', name: '03 · GHOST PROTOCOL', rendered: true,
      hoodie: '#dfe2e6', shirt: '#eef0f2', vest: '#c3c7ce', strap: '#a8adb6',
      shorts: '#b8bcc3', shortsTrim: '#9aa0a8', tights: '#9ba1a9',
      shoe: '#c6cad0', sole: '#f0f1f3', hat: '#c9ccd2', hatBand: '#9aa0a8',
      glove: '#b3b8bf', neck: '#8f949c', belt: '#a8adb6', buckle: '#eef0f2',
      led: '#cfe9f2', trim: '#9fd8e8', blade: '#ffffff', bladeGlow: '#a9e6ff',
      scarf: '#b9bec5', sheath: '#8fb6c4', gun: '#a8adb6', emblem: '#a9e6ff',
      fx: '#a9e6ff', fx2: '#dfe2e6'
    },
    {
      id: 'acid-matrix', name: '04 · ACID MATRIX', rendered: true,
      hoodie: '#151914', shirt: '#1a1f18', vest: '#0e110d', strap: '#233018',
      shorts: '#11150f', shortsTrim: '#1d2517', tights: '#0f130e',
      shoe: '#131711', sole: '#2b3a1c', hat: '#12160f', hatBand: '#1f2b12',
      glove: '#0f130e', neck: '#0b0e09', belt: '#0b0e09', buckle: '#39ff5a',
      led: '#39ff5a', trim: '#39ff5a', blade: '#dcffe4', bladeGlow: '#39ff5a',
      scarf: '#0f130e', sheath: '#1f3a1c', gun: '#233018', emblem: '#39ff5a',
      fx: '#39ff5a', fx2: '#b6ff3d'
    },
    {
      id: 'corporate-bounty', name: '05 · CORPORATE BOUNTY', rendered: false,
      hoodie: '#3b4048', shirt: '#d9d5cc', vest: '#23262c', strap: '#14161a',
      shorts: '#1d2026', shortsTrim: '#2a2e36', tights: '#1a1c22',
      shoe: '#191b20', sole: '#d9d5cc', hat: '#1a1c22', hatBand: '#6b4a1f',
      glove: '#161719', neck: '#111317', belt: '#14161a', buckle: '#d4a24a',
      led: '#ffd166', trim: '#d4a24a', blade: '#fff6dc', bladeGlow: '#ffd166',
      scarf: '#23262c', sheath: '#4a3a1f', gun: '#2a2e36', emblem: '#ffd166',
      fx: '#ffd166', fx2: '#c96f2a'
    },
    {
      id: 'static-glitch', name: '06 · STATIC GLITCH', rendered: true,
      hoodie: '#38e8e0', shirt: '#f2fbfb', vest: '#7a2fa0', strap: '#4b1f66',
      shorts: '#2f8f9e', shortsTrim: '#a02fb8', tights: '#1c4a55',
      shoe: '#1d6f7a', sole: '#e9f7fa', hat: '#8a2fb8', hatBand: '#ff2d9b',
      glove: '#1a1b22', neck: '#12131a', belt: '#12131a', buckle: '#95d1de',
      led: '#95d1de', trim: '#ff2d9b', blade: '#ffffff', bladeGlow: '#5df3ff',
      scarf: '#2b1050', sheath: '#1c6a7a', gun: '#4b1f66', emblem: '#ff2d9b',
      fx: '#5df3ff', fx2: '#ff2d9b'
    },
    {
      id: 'blood-moon', name: '07 · BLOOD MOON', rendered: true,
      hoodie: '#3a1d22', shirt: '#4a2027', vest: '#241a1d', strap: '#150f11',
      shorts: '#2b1418', shortsTrim: '#3d1c22', tights: '#191114',
      shoe: '#160f11', sole: '#3a1d22', hat: '#1a1215', hatBand: '#5c1a1f',
      glove: '#120d0f', neck: '#0d090a', belt: '#120d0f', buckle: '#8e2020',
      led: '#ff2b2b', trim: '#8e2020', blade: '#ff9a9a', bladeGlow: '#ff1a1a',
      scarf: '#150f11', sheath: '#4a1a1a', gun: '#241a1d', emblem: '#ff2b2b',
      fx: '#ff1a1a', fx2: '#ff6b3d'
    },
    {
      id: 'prototype-zero', name: '08 · PROTOTYPE ZERO', rendered: true,
      hoodie: '#b4b3b8', shirt: '#c8c7cc', vest: '#8f8e94', strap: '#75747a',
      shorts: '#a3a2a8', shortsTrim: '#8b8a90', tights: '#8f8e94',
      shoe: '#adacb2', sole: '#d6d5da', hat: '#9a999f', hatBand: '#75747a',
      glove: '#8b8a90', neck: '#75747a', belt: '#75747a', buckle: '#c8c7cc',
      led: '#e6e6ea', trim: '#c8c7cc', blade: '#f2f2f4', bladeGlow: '#d6d5da',
      scarf: '#9a999f', sheath: '#8b8a90', gun: '#8f8e94', emblem: '#c8c7cc',
      fx: '#d6d5da', fx2: '#ffffff'
    }
  ];

  /* Ghost / afterimage palette: everything one colour. */
  function ghostPal(color, glow) {
    const o = {};
    COSTUMES[0] && Object.keys(COSTUMES[0]).forEach(k => { if (typeof COSTUMES[0][k] === 'string' && COSTUMES[0][k][0] === '#') o[k] = color; });
    o.led = glow || color; o.bladeGlow = glow || color; o.blade = glow || color;
    o.emblem = glow || color; o.fx = glow || color;
    return o;
  }

  /* ---------------------------------------------------------------- solve -- */
  /* Joint solver. Fed the same pose keys as animation-data.json + the lab. */
  const PROPORTION = {
    hipToChest: 32, hipToShoulder: 46, hipToNeck: 52, hipToHead: 68,
    upperArm: 25, foreArm: 25, thigh: 30, shin: 30, headR: 13,
    shoulderSpread: 5.5, blade: 92, bladeGrip: 9
  };

  function rotv(v, deg) {
    const c = Math.cos(rad(deg)), s = Math.sin(rad(deg));
    return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
  }

  function solve(p) {
    const U = { x: Math.sin(rad(p.tA)), y: -Math.cos(rad(p.tA)) };  // torso up
    const F = { x: Math.cos(rad(p.tA)), y: Math.sin(rad(p.tA)) };   // torso forward
    const hip = { x: 0, y: -p.hipY };
    const at = (a, fw) => ({ x: hip.x + U.x * a + F.x * fw, y: hip.y + U.y * a + F.y * fw });

    const chest = at(PROPORTION.hipToChest, 0);
    const sh = at(PROPORTION.hipToShoulder, 0);
    const neck = at(PROPORTION.hipToNeck, 0);
    const head = { x: neck.x + rotv({ x: U.x * 16, y: U.y * 16 }, p.headA).x,
                   y: neck.y + rotv({ x: U.x * 16, y: U.y * 16 }, p.headA).y };

    const shL = at(PROPORTION.hipToShoulder, -PROPORTION.shoulderSpread);
    const shR = at(PROPORTION.hipToShoulder, PROPORTION.shoulderSpread);

    const elbow = (s, a) => ({ x: s.x + dir(a.u, PROPORTION.upperArm).x, y: s.y + dir(a.u, PROPORTION.upperArm).y });
    const hand = (e, a) => ({ x: e.x + dir(a.f, PROPORTION.foreArm).x, y: e.y + dir(a.f, PROPORTION.foreArm).y });
    const knee = l => ({ x: hip.x + dir(l.h, PROPORTION.thigh).x, y: hip.y + dir(l.h, PROPORTION.thigh).y });
    const ankle = (k, l) => ({ x: k.x + dir(l.k, PROPORTION.shin).x, y: k.y + dir(l.k, PROPORTION.shin).y });

    const elbL = elbow(shL, p.aL), handL = hand(elbL, p.aL);
    const elbR = elbow(shR, p.aR), handR = hand(elbR, p.aR);
    const kneeL = knee(p.lL), ankL = ankle(kneeL, p.lL);
    const kneeR = knee(p.lR), ankR = ankle(kneeR, p.lR);

    // Feet flatten as they approach the ground. Reads as weight.
    const footA = (ank, l) => {
      const h = clamp((0 - ank.y) / 26, 0, 1);        // 0 = planted, 1 = high
      return lerp(90, l.k + 14, h);
    };

    return {
      U, F, hip, chest, sh, neck, head, shL, shR,
      elbL, handL, elbR, handR, kneeL, ankL, kneeR, ankR,
      footAL: footA(ankL, p.lL), footAR: footA(ankR, p.lR)
    };
  }

  /* ----------------------------------------------------------- primitives -- */
  function seg(c, a, b, w1, w2, col) {
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L;
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(a.x + nx * w1 / 2, a.y + ny * w1 / 2);
    c.lineTo(b.x + nx * w2 / 2, b.y + ny * w2 / 2);
    c.lineTo(b.x - nx * w2 / 2, b.y - ny * w2 / 2);
    c.lineTo(a.x - nx * w1 / 2, a.y - ny * w1 / 2);
    c.closePath(); c.fill();
    c.beginPath(); c.arc(a.x, a.y, w1 / 2, 0, TAU); c.fill();
    c.beginPath(); c.arc(b.x, b.y, w2 / 2, 0, TAU); c.fill();
  }
  function poly(c, pts, fill, stroke, lw) {
    c.beginPath();
    pts.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y));
    c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); }
  }
  function rrect(c, x, y, w, h, r, fill, stroke, lw) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); }
  }
  function strokeLine(c, a, b, col, w, cap) {
    c.beginPath();
    c.moveTo(a.x, a.y); c.lineTo(b.x, b.y);
    c.strokeStyle = col; c.lineWidth = w; c.lineCap = cap || 'round'; c.stroke();
  }
  function glow(c, col, blur, fn) {
    c.save();
    c.shadowColor = col; c.shadowBlur = blur;
    fn();
    c.restore();
  }

  /* ------------------------------------------------------- LED mask plate -- */
  /* The mask is rigid per the rig spec — it never deforms, only the head
     rotates. LEDs are a dot matrix: eye rings + a wide grin.                 */
  const GRIN = (() => {
    const rows = [[7, -3.4, 1.15], [8, -0.6, 1.25], [7, 2.1, 1.15], [5, 4.6, 0.95], [3, 6.9, 0.8]];
    const pts = [];
    rows.forEach(([n, y, sc]) => {
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
        pts.push({ x: t * 7.4 * sc, y: y + Math.abs(t) * Math.abs(t) * 1.5, r: 0.86 * sc + 0.16 });
      }
    });
    return pts;
  })();

  function drawMask(c, pal, o) {
    const flare = o.overclock ? 1 : 0;
    // mask shell
    poly(c, [
      { x: -11.5, y: -3.5 }, { x: -12.5, y: 5.5 }, { x: -7, y: 13.5 },
      { x: 0, y: 16 }, { x: 7.5, y: 12.5 }, { x: 12, y: 4 },
      { x: 12.5, y: -4.5 }, { x: 8, y: -11 }, { x: -4, y: -12.5 }, { x: -10.5, y: -9 }
    ], o.maskFill, shade(o.maskFill, 0.22), 1);
    // brow / hood shadow
    poly(c, [{ x: -12, y: -3 }, { x: 12.5, y: -4.5 }, { x: 10, y: -10.5 }, { x: -4, y: -12 }], shade(o.maskFill, -0.35));

    const led = pal.led;
    c.save();
    c.shadowColor = pal.led; c.shadowBlur = (o.overclock ? 22 : 12) * (o.q === 'low' ? 0.4 : 1);
    c.fillStyle = led; c.strokeStyle = led;

    // eye: front = ring with a hot core, far = tight dot cluster (asymmetric = readable)
    const ex = 5.4, ey = -2.2;
    c.lineWidth = 1.9;
    c.beginPath(); c.arc(ex, ey, 3.5, 0, TAU); c.stroke();
    c.beginPath(); c.arc(ex, ey, 1.35, 0, TAU); c.fill();
    // far eye
    for (let i = 0; i < 5; i++) {
      const a = -1.6 + i * 0.8;
      c.beginPath();
      c.arc(-6.2 + Math.cos(a) * 2.0, ey + Math.sin(a) * 2.0, 0.85, 0, TAU);
      c.fill();
    }
    // grin matrix
    GRIN.forEach(d => {
      c.beginPath();
      c.arc(d.x + 0.6, d.y + 0.4, d.r * (flare ? 1.12 : 1), 0, TAU);
      c.fill();
    });
    if (o.overclock) {
      // scanline sweep
      const sy = -12 + ((o.t * 0.11) % 28);
      c.globalAlpha = 0.55;
      c.fillRect(-13, sy, 26, 1.1);
      c.globalAlpha = 1;
    }
    c.restore();

    // panel seams
    strokeLine(c, { x: -11, y: 6 }, { x: -3, y: 7.5 }, shade(o.maskFill, 0.3), 0.8);
    strokeLine(c, { x: 2, y: 8.5 }, { x: 9.5, y: 6 }, shade(o.maskFill, 0.3), 0.8);
    // cheek vent
    for (let i = 0; i < 3; i++) strokeLine(c, { x: 8.2 - i * 0.4, y: 10.2 + i * 1.1 }, { x: 11.6, y: 9.6 + i * 1.1 }, shade(o.maskFill, -0.3), 0.7);
  }

  /* --------------------------------------------------------------- weapons -- */
  function drawKatana(c, pal, grip, ang, o, len) {
    const L = len || PROPORTION.blade;
    const tip = { x: grip.x + dir(ang, L).x, y: grip.y + dir(ang, L).y };
    const butt = { x: grip.x - dir(ang, 17).x, y: grip.y - dir(ang, 17).y };
    const guard = dir(ang + 90, 4.6);

    // scabbard-side of the grip: tsuka wrap
    seg(c, butt, grip, 4.6, 4.2, shade(pal.vest, -0.25));
    // diamond wrap pattern
    c.save();
    c.strokeStyle = shade(pal.led, 0.1); c.lineWidth = 0.9; c.globalAlpha = 0.85;
    for (let i = 0; i < 5; i++) {
      const t0 = i / 5, t1 = (i + 0.5) / 5;
      const a = { x: lerp(butt.x, grip.x, t0), y: lerp(butt.y, grip.y, t0) };
      const b = { x: lerp(butt.x, grip.x, t1), y: lerp(butt.y, grip.y, t1) };
      c.beginPath(); c.moveTo(a.x + guard.x, a.y + guard.y); c.lineTo(b.x - guard.x, b.y - guard.y); c.stroke();
      c.beginPath(); c.moveTo(a.x - guard.x, a.y - guard.y); c.lineTo(b.x + guard.x, b.y + guard.y); c.stroke();
    }
    c.restore();
    // tsuba
    strokeLine(c, { x: grip.x + guard.x, y: grip.y + guard.y }, { x: grip.x - guard.x, y: grip.y - guard.y }, pal.trim, 3.2);
    // blade glow + core
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.shadowColor = pal.bladeGlow; c.shadowBlur = o.overclock ? 26 : 15;
    strokeLine(c, grip, tip, pal.bladeGlow, o.overclock ? 6.4 : 4.6);
    c.restore();
    strokeLine(c, grip, tip, pal.blade, 2.1);
    // edge highlight (front of blade)
    if (o.q !== 'low') {
      const nrm = { x: Math.cos(rad(ang + 90)) * 0.9, y: -Math.sin(rad(ang + 90)) * 0.9 };
      strokeLine(c, { x: grip.x + nrm.x, y: grip.y + nrm.y }, { x: tip.x + nrm.x, y: tip.y + nrm.y }, '#ffffff', 0.7);
    }
  }

  function drawSheath(c, pal, hip, F) {
    const a = 202;
    const s0 = { x: hip.x - 10, y: hip.y - 1 };
    const s1 = { x: s0.x + dir(a, 78).x, y: s0.y + dir(a, 78).y };
    seg(c, s0, s1, 5.6, 4.2, pal.sheath);
    strokeLine(c, s0, { x: s0.x + dir(a, 10).x, y: s0.y + dir(a, 10).y }, pal.trim, 3.4);
    // strap loop
    c.strokeStyle = shade(pal.strap, -0.2); c.lineWidth = 1.6;
    c.beginPath();
    c.arc(s0.x + dir(a, 26).x, s0.y + dir(a, 26).y, 4.2, 0, TAU);
    c.stroke();
  }

  function drawRevolver(c, pal, hand, fAng, o) {
    const b = dir(fAng, 17);
    const up = { x: Math.cos(rad(fAng)) * 1, y: -Math.sin(rad(fAng)) * 1 };
    c.save();
    c.translate(hand.x, hand.y);
    c.rotate(rad(fAng - 90));
    // barrel
    rrect(c, -2.4, -17, 4.8, 13, 1.6, pal.gun);
    // cylinder
    c.beginPath(); c.arc(0, -5.4, 4.1, 0, TAU); c.fillStyle = shade(pal.gun, 0.18); c.fill();
    c.strokeStyle = pal.trim; c.lineWidth = 1; c.stroke();
    // frame + grip
    rrect(c, -3.4, -6, 6.8, 9, 1.6, shade(pal.gun, -0.15));
    rrect(c, -3.0, 1.5, 5.4, 9.5, 2.2, shade(pal.vest, -0.35));
    // muzzle trim
    strokeLine(c, { x: -2.4, y: -16 }, { x: 2.4, y: -16 }, pal.trim, 1.4);
    c.restore();
  }

  /* ---------------------------------------------------------------- scarf -- */
  function updateScarf(st, j, dt) {
    const sway = Math.sin(st.t * 0.0032) * 1;
    const targets = [];
    const base = { x: j.neck.x - j.F.x * 3, y: j.neck.y - j.F.y * 3 };
    let a = 158 + sway * 20 - (st.leanPx || 0);
    let px = base;
    for (let i = 0; i < 3; i++) {
      const len = 17 + i * 3;
      const ang = a + sway * 9 * (i + 1);
      const p = { x: px.x + dir(ang, len).x, y: px.y + dir(ang, len).y };
      targets.push(p); px = p;
      a = ang - 12;
    }
    if (!st.scarfPts) st.scarfPts = targets.map(p => ({ x: p.x, y: p.y }));
    const k = 1 - Math.pow(0.0009, dt / 1000);
    for (let i = 0; i < 3; i++) {
      st.scarfPts[i].x = lerp(st.scarfPts[i].x, targets[i].x, k * (1 - i * 0.14));
      st.scarfPts[i].y = lerp(st.scarfPts[i].y, targets[i].y, k * (1 - i * 0.14));
    }
    return { base, pts: st.scarfPts };
  }

  function drawScarf(c, pal, s) {
    const pts = [s.base, ...s.pts];
    const w = [7.5, 6.6, 5.4, 4.2];
    c.save();
    for (let i = 0; i < pts.length - 1; i++) {
      seg(c, pts[i], pts[i + 1], w[i], w[i + 1], i === 0 ? pal.scarf : shade(pal.scarf, -0.08));
    }
    // trailing ribbon
    const last = pts[pts.length - 1];
    const prev = pts[pts.length - 2];
    const dx = last.x - prev.x, dy = last.y - prev.y, L = Math.hypot(dx, dy) || 1;
    poly(c, [
      last,
      { x: last.x + dx / L * 16 + -dy / L * 7, y: last.y + dy / L * 16 + dx / L * 7 },
      { x: last.x + dx / L * 24 - -dy / L * 5, y: last.y + dy / L * 24 + dx / L * 5 },
      { x: last.x + dx / L * 14 - -dy / L * 2.5, y: last.y + dy / L * 14 + dx / L * 2.5 }
    ], shade(pal.scarf, -0.12));
    c.restore();
  }

  /* ----------------------------------------------------------------- shoe -- */
  function drawShoe(c, pal, ankle, fAng, far) {
    const shoe = far ? shade(pal.shoe, -0.22) : pal.shoe;
    const sole = far ? shade(pal.sole, -0.18) : pal.sole;
    c.save();
    c.translate(ankle.x, ankle.y);
    c.rotate(rad(fAng - 90));
    // sole (chunky — the silhouette signature)
    rrect(c, -8.5, -1.5, 25, 6.6, 3.2, sole);
    rrect(c, -8.5, 3.2, 25, 2.2, 1.1, shade(sole, -0.3));
    // upper
    rrect(c, -7.5, -9.5, 21, 9, 3.6, shoe);
    // toe cap
    c.beginPath(); c.arc(11.5, -2.2, 3.6, -1.4, 1.4); c.fillStyle = shade(shoe, 0.16); c.fill();
    // ankle collar
    rrect(c, -8.6, -12.5, 12, 6, 2.4, shade(shoe, 0.1));
    // laces
    c.strokeStyle = shade(pal.sole, -0.05); c.lineWidth = 0.9;
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(-4.5 + i * 3.4, -9.2 + i * 0.2);
      c.lineTo(1.2 + i * 3.4, -6.2 + i * 0.2);
      c.stroke();
    }
    // accent swoosh
    c.strokeStyle = pal.trim; c.lineWidth = 1.1; c.globalAlpha = 0.9;
    c.beginPath(); c.moveTo(-6, -3.2); c.quadraticCurveTo(4, -5.4, 12, -4.2); c.stroke();
    c.restore();
  }

  /* ------------------------------------------------------------- main draw -- */
  function drawBigB(ctx, pose, pal, J, state, o) {
    o = o || {};
    const c = ctx;
    const t = o.t || 0;
    const q = o.q || 'high';
    pal = pal || COSTUMES[0];
    J = J || solve(pose);
    state = state || {};

    const depth = (col, amt) => shade(col, amt);
    const farT = depth(pal.tights, -0.24), farH = depth(pal.hoodie, -0.26);
    const farS = depth(pal.shoe, -0.24);

    ctx.save();
    ctx.globalAlpha = pose.alpha === undefined ? 1 : pose.alpha;
    ctx.translate(pose.x, pose.y);
    // whole-body rotation about hip height
    ctx.translate(0, -90); ctx.rotate(rad(pose.rot || 0)); ctx.translate(0, 90);
    if (o.scale && o.scale !== 1) ctx.scale(o.scale, o.scale);
    ctx.lineJoin = 'round';

    /* ---- ground shadow is drawn by the caller (world space) ---- */

    /* ---- scarf (behind everything) ---- */
    state.leanPx = (pose.vx || 0) * 0.06;
    const scarf = updateScarf(state, J, o.dt || 16);
    drawScarf(c, pal, scarf);

    /* ---- FAR limbs ---- */
    seg(c, J.hip, J.kneeL, 12, 10.4, farT);
    seg(c, J.kneeL, J.ankL, 9.6, 7.4, farT);
    // far knee pad
    c.beginPath(); c.arc(J.kneeL.x, J.kneeL.y, 4.6, 0, TAU); c.fillStyle = depth(pal.shortsTrim, -0.1); c.fill();
    drawShoe(c, pal, J.ankL, J.footAL, true);
    seg(c, J.shL, J.elbL, 10.5, 9.5, farH);
    seg(c, J.elbL, J.handL, 9, 6.4, farH);
    c.beginPath(); c.arc(J.handL.x, J.handL.y, 3.6, 0, TAU); c.fillStyle = depth(pal.glove, -0.2); c.fill();

    /* ---- sheathed katana ---- */
    if (pose.kat === 'hip') drawSheath(c, pal, J.hip, J.F);

    /* ---- hood behind head/shoulders ---- */
    const hoodC = { x: J.neck.x - J.U.x * 6, y: J.neck.y - J.U.y * 6 };
    c.save();
    c.beginPath();
    c.ellipse(hoodC.x - J.F.x * 7, hoodC.y - J.F.y * 7, 13.5, 11.5, rad(pose.tA - 90), 0, TAU);
    c.fillStyle = depth(pal.hoodie, -0.34); c.fill();
    c.restore();

    /* ---- shorts / pelvis block ---- */
    const sp = (a, fw) => ({ x: J.hip.x + J.U.x * a + J.F.x * fw, y: J.hip.y + J.U.y * a + J.F.y * fw });
    poly(c, [sp(-4, -16), sp(-4, 16), sp(24, 17.5), sp(28, 8), sp(28, -8), sp(24, -17.5)], pal.shorts);
    // cargo pockets + strap
    const pocket = (a, fw, w, h) => {
      const p = sp(a, fw);
      c.save();
      c.translate(p.x, p.y); c.rotate(rad(pose.tA));
      rrect(c, -w / 2, -h / 2, w, h, 1.6, pal.shortsTrim);
      strokeLine(c, { x: -w / 2, y: -h / 2 + 1.2 }, { x: w / 2, y: -h / 2 + 1.2 }, shade(pal.strap, -0.1), 1.1);
      c.restore();
    };
    pocket(14, 15, 8, 9.5); pocket(22, 15.5, 6, 5);
    pocket(14, -15, 7, 8);
    // hem shadow
    strokeLine(c, sp(27, -17), sp(27, 17), depth(pal.shorts, -0.3), 1.4);

    /* ---- torso: hoodie shell ---- */
    poly(c, [sp(0, -14.5), sp(30, -15.5), sp(46, -12), sp(52, -6), sp(52, 6), sp(46, 12), sp(30, 15.5), sp(0, 14.5)], pal.hoodie);
    // hoodie hem peeking below the vest
    poly(c, [sp(-1, -15), sp(8, -15.4), sp(8, 15.4), sp(-1, 15)], depth(pal.hoodie, 0.06));
    strokeLine(c, sp(-1, -15), sp(-1, 15), depth(pal.hoodie, -0.22), 1.2);

    /* ---- shirt V + tie ---- */
    poly(c, [sp(44, -8), sp(52, -6), sp(52, 6), sp(44, 8), sp(30, 2), sp(30, -2)], pal.shirt);
    // collar
    poly(c, [sp(48, -7), sp(53, -5.5), sp(50, -1), sp(46, -3)], depth(pal.shirt, 0.12));
    poly(c, [sp(48, 7), sp(53, 5.5), sp(50, 1), sp(46, 3)], depth(pal.shirt, 0.12));
    // tie
    poly(c, [sp(50, -2.4), sp(50, 2.4), sp(34, 3.4), sp(34, -3.4)], depth(pal.vest, -0.45));
    poly(c, [sp(51.5, -3), sp(51.5, 3), sp(47, 2.4), sp(47, -2.4)], depth(pal.vest, -0.6));

    /* ---- vest (V-neck cut reveals shirt + tie) ---- */
    const Vb = sp(31, 0);
    poly(c, [
      sp(-2, -15.5), sp(30, -16), sp(46, -12.5), sp(48, -3),
      Vb, sp(48, 3), sp(46, 12.5), sp(30, 16), sp(-2, 15.5)
    ], pal.vest);
    // vest edges
    strokeLine(c, sp(30, -16), sp(-2, -15.5), depth(pal.vest, 0.25), 1.2);
    strokeLine(c, sp(46, -12.5), sp(48, -3), pal.trim, 1.1);
    strokeLine(c, sp(46, 12.5), sp(48, 3), shade(pal.trim, -0.2), 1.1);
    // buttons
    [12, 20, 27].forEach(a => { const p = sp(a, 8.5); c.beginPath(); c.arc(p.x, p.y, 1.1, 0, TAU); c.fillStyle = pal.buckle; c.fill(); });
    // chest pouches
    [38, 29].forEach((a, i) => {
      const p = sp(a, 11 + i * 1.5);
      c.save(); c.translate(p.x, p.y); c.rotate(rad(pose.tA));
      rrect(c, -4.6, -3.6, 9.2, 7.2, 1.4, depth(pal.vest, -0.3));
      strokeLine(c, { x: -4.6, y: -3.6 }, { x: 4.6, y: -3.6 }, shade(pal.strap, 0.05), 1);
      strokeLine(c, { x: 0, y: -3.6 }, { x: 0, y: 3.6 }, shade(pal.strap, -0.1), 0.8);
      c.restore();
    });
    // shoulder harness straps
    strokeLine(c, sp(45, -13), sp(4, 14), pal.strap, 4.4);
    strokeLine(c, sp(45, 13), sp(4, -14), depth(pal.strap, 0.12), 4.4);
    strokeLine(c, sp(45, -13), sp(4, 14), depth(pal.strap, -0.3), 1.2);
    // belt
    strokeLine(c, sp(3, -14), sp(3, 14), pal.belt, 6);
    c.beginPath(); c.arc(sp(3, 6).x, sp(3, 6).y, 2.6, 0, TAU); c.fillStyle = pal.buckle; c.fill();
    // emblem
    glow(c, pal.emblem, 12, () => {
      c.beginPath();
      const e = sp(40, -6);
      c.arc(e.x, e.y, 2.9, 0, TAU);
      c.fillStyle = pal.emblem; c.fill();
    });

    /* ---- NEAR leg ---- */
    seg(c, J.hip, J.kneeR, 12.6, 10.8, pal.tights);
    seg(c, J.kneeR, J.ankR, 9.8, 7.6, pal.tights);
    // tights seam highlight
    strokeLine(c, { x: lerp(J.hip.x, J.kneeR.x, 0.5) + 3, y: lerp(J.hip.y, J.kneeR.y, 0.5) },
      { x: lerp(J.kneeR.x, J.ankR.x, 0.6) + 2.4, y: lerp(J.kneeR.y, J.ankR.y, 0.6) },
      shade(pal.tights, 0.16), 1.1);
    // knee pad
    c.save();
    c.beginPath(); c.arc(J.kneeR.x, J.kneeR.y, 5.2, 0, TAU);
    c.fillStyle = pal.shortsTrim; c.fill();
    c.strokeStyle = pal.trim; c.lineWidth = 1.1; c.stroke();
    c.restore();
    drawShoe(c, pal, J.ankR, J.footAR, false);

    /* ---- NEAR arm ---- */
    seg(c, J.shR, J.elbR, 11.5, 10.2, pal.hoodie);
    seg(c, J.elbR, J.handR, 9.6, 7, pal.hoodie);
    // sleeve cuff
    const cuff = { x: lerp(J.elbR.x, J.handR.x, 0.78), y: lerp(J.elbR.y, J.handR.y, 0.78) };
    seg(c, cuff, J.handR, 7.6, 7, shade(pal.hoodie, -0.12));
    // glove
    c.beginPath(); c.arc(J.handR.x, J.handR.y, 3.9, 0, TAU); c.fillStyle = pal.glove; c.fill();
    strokeLine(c, { x: J.handR.x - 3, y: J.handR.y - 2.4 }, { x: J.handR.x + 3, y: J.handR.y - 2.4 }, pal.trim, 0.9);
    // forearm wrap (grapple gauntlet)
    const wrap = { x: lerp(J.elbR.x, J.handR.x, 0.42), y: lerp(J.elbR.y, J.handR.y, 0.42) };
    seg(c, wrap, { x: lerp(J.elbR.x, J.handR.x, 0.62), y: lerp(J.elbR.y, J.handR.y, 0.62) }, 10.4, 10, pal.strap);

    /* ---- head ---- */
    const hx = J.head.x, hy = J.head.y;
    c.save();
    c.translate(hx, hy);
    c.rotate(rad(pose.tA + pose.headA));
    // neck
    seg(c, { x: 0, y: 12 }, { x: 0, y: 22 }, 7.5, 8.5, pal.neck);
    drawMask(c, pal, { overclock: o.overclock, t: t, q: q, maskFill: mix(shade(pal.vest, -0.2), '#14161c', 0.55) });
    c.restore();

    /* ---- hood collar (in front of the neck, under the chin) ---- */
    c.save();
    const hc = { x: J.neck.x + J.U.x * 2, y: J.neck.y + J.U.y * 2 };
    c.beginPath();
    c.ellipse(hc.x - J.F.x * 2, hc.y - J.F.y * 2, 11, 8, rad(pose.tA - 90), 0, TAU);
    c.fillStyle = depth(pal.hoodie, -0.14); c.fill();
    c.restore();

    /* ---- cowboy hat ---- */
    c.save();
    c.translate(J.head.x, J.head.y - 4);
    c.rotate(rad(pose.tA + pose.headA));
    // brim
    c.save();
    c.rotate(rad(-6));
    c.beginPath(); c.ellipse(1, -6, 26, 7.2, 0, 0, TAU); c.fillStyle = pal.hat; c.fill();
    c.beginPath(); c.ellipse(1, -7.6, 24, 5.6, 0, 0, TAU); c.fillStyle = shade(pal.hat, 0.12); c.fill();
    c.beginPath(); c.ellipse(1, -5.2, 25, 6.4, 0, 0, TAU); c.fillStyle = shade(pal.hat, -0.22); c.fill();
    c.beginPath(); c.ellipse(1, -6, 26, 7.2, 0, 0, TAU); c.fillStyle = pal.hat; c.globalAlpha = 0.9; c.fill(); c.globalAlpha = 1;
    c.restore();
    // crown
    c.beginPath();
    c.moveTo(-12, -6);
    c.bezierCurveTo(-13, -21, -6, -25, 0, -25);
    c.bezierCurveTo(7, -25, 13, -20, 13.5, -6);
    c.closePath();
    c.fillStyle = pal.hat; c.fill();
    // crown pinch
    c.beginPath();
    c.moveTo(-8, -21);
    c.quadraticCurveTo(0, -16.5, 8.5, -20.5);
    c.quadraticCurveTo(0, -25.5, -8, -21);
    c.fillStyle = shade(pal.hat, 0.1); c.fill();
    // band + emblem
    rrect(c, -12.4, -10.4, 26, 4.2, 1.4, pal.hatBand);
    glow(c, pal.trim, 6, () => {
      c.beginPath(); c.arc(1, -8.3, 1.5, 0, TAU); c.fillStyle = pal.trim; c.fill();
    });
    // tiny skull-ish glyph badges
    c.fillStyle = shade(pal.buckle, 0.1);
    c.fillRect(-7.5, -9.6, 1.5, 1.5);
    c.fillRect(5.4, -9.6, 1.5, 1.5);
    c.restore();

    /* ---- hand weapon ---- */
    if (pose.guns) {
      drawRevolver(c, pal, J.handL, pose.aL.f, o);
      drawRevolver(c, pal, J.handR, pose.aR.f, o);
    } else if (pose.kat !== 'hip') {
      const grip = { x: J.handR.x + dir(pose.kB, 7).x, y: J.handR.y + dir(pose.kB, 7).y };
      drawKatana(c, pal, grip, pose.kB, o);
    }

    ctx.restore();

    /* ---- joystick-visible joints for FX (world space) ---- */
    return {
      handL: { x: pose.x + J.handL.x, y: pose.y + J.handL.y },
      handR: { x: pose.x + J.handR.x, y: pose.y + J.handR.y },
      chest: { x: pose.x + J.chest.x, y: pose.y + J.chest.y },
      head: { x: pose.x + J.head.x, y: pose.y + J.head.y },
      hip: { x: pose.x + J.hip.x, y: pose.y + J.hip.y },
      bladeTip: { x: pose.x + J.handR.x + dir(pose.kB, PROPORTION.blade + 7).x,
                  y: pose.y + J.handR.y + dir(pose.kB, PROPORTION.blade + 7).y }
    };
  }

  /* -------------------------------------------------------------------- FX -- */
  function FX() {
    const items = [];
    const add = o => { items.push(o); return o; };
    const api = {
      items,
      clear() { items.length = 0; },
      update(dt) {
        for (let i = items.length - 1; i >= 0; i--) {
          const f = items[i];
          f.t = (f.t || 0) + dt;
          if (f.update) f.update(dt, f);
          if (f.t >= f.life) items.splice(i, 1);
        }
      },
      draw(c) { items.forEach(f => f.draw && f.draw(c, f)); },

      slash(x, y, r, a0, a1, col, w, life) {
        return add({
          kind: 'slash', x, y, r, a0, a1, col, w, life: life || 300, t: 0,
          draw(c, f) {
            const k = f.t / f.life;
            const e = 1 - Math.pow(1 - k, 2.2);
            const cx = f.a0 + (f.a1 - f.a0) * e * 0.35;
            const cxp = f.a0 + (f.a1 - f.a0) * clamp(e * 1.25, 0, 1);
            const p0 = { x: f.x + Math.sin(rad(cx)) * f.r, y: f.y + Math.cos(rad(cx)) * f.r };
            const p1 = { x: f.x + Math.sin(rad(cxp)) * f.r, y: f.y + Math.cos(rad(cxp)) * f.r };
            const large = Math.abs(cxp - cx) > 180 ? 1 : 0, sweep = cxp > cx ? 1 : 0;
            c.save();
            c.globalAlpha = (1 - k) * 0.95;
            c.globalCompositeOperation = 'lighter';
            c.strokeStyle = f.col; c.lineWidth = f.w * (1 - k * 0.55); c.lineCap = 'round';
            c.shadowColor = f.col; c.shadowBlur = 14;
            c.beginPath();
            c.arc(f.x, f.y, f.r, rad(cx - 90), rad(cxp - 90), sweep === 0);
            c.stroke();
            c.restore();
          }
        });
      },
      tracer(a, b, col, life) {
        return add({
          life: life || 260, t: 0, col,
          draw(c, f) {
            const k = f.t / f.life;
            c.save();
            c.globalAlpha = 1 - k; c.globalCompositeOperation = 'lighter';
            c.strokeStyle = f.col; c.lineWidth = 2.4 * (1 - k) + 0.6; c.lineCap = 'round';
            c.shadowColor = f.col; c.shadowBlur = 12;
            c.beginPath(); c.moveTo(a.x, a.y);
            c.lineTo(lerp(a.x, b.x, clamp(k * 3, 0, 1)), lerp(a.y, b.y, clamp(k * 3, 0, 1)));
            c.stroke(); c.restore();
          }
        });
      },
      muzzle(x, y, ang, col) {
        return add({
          life: 150, t: 0,
          draw(c, f) {
            const k = f.t / f.life;
            c.save();
            c.translate(x, y); c.rotate(rad(ang - 90));
            c.globalAlpha = 1 - k; c.globalCompositeOperation = 'lighter';
            c.shadowColor = col; c.shadowBlur = 16;
            c.fillStyle = col;
            c.beginPath(); c.moveTo(0, 0); c.lineTo(19 * (1 - k), -4.4); c.lineTo(14 * (1 - k), 0); c.lineTo(19 * (1 - k), 4.4); c.closePath(); c.fill();
            c.beginPath(); c.arc(0, 0, 4.6 * (1 - k * 0.5), 0, TAU); c.fill();
            c.restore();
          }
        });
      },
      spark(x, y, col, n, spread) {
        for (let i = 0; i < (n || 6); i++) {
          const a = Math.random() * TAU, d = (spread || 24) * (0.4 + Math.random());
          const ex = x + Math.cos(a) * d, ey = y + Math.sin(a) * d;
          add({
            life: 260 + Math.random() * 140, t: 0,
            draw(c, f) {
              const k = f.t / f.life;
              c.save(); c.globalAlpha = 1 - k;
              c.strokeStyle = col; c.lineWidth = 1.8; c.lineCap = 'round';
              c.shadowColor = col; c.shadowBlur = 8;
              c.beginPath(); c.moveTo(lerp(x, ex, clamp(k * 1.8, 0, 1)), lerp(y, ey, clamp(k * 1.8, 0, 1)));
              c.lineTo(lerp(x, ex, clamp(k * 1.8 + 0.16, 0, 1)), lerp(y, ey, clamp(k * 1.8 + 0.16, 0, 1)));
              c.stroke(); c.restore();
            }
          });
        }
      },
      dust(x, y, col) {
        for (let i = 0; i < 5; i++) {
          const ex = x + (Math.random() - 0.5) * 40, ey = y - Math.random() * 12;
          add({
            life: 520, t: 0,
            draw(c, f) {
              const k = f.t / f.life;
              c.save();
              c.globalAlpha = 0.5 * (1 - k);
              c.beginPath();
              c.arc(lerp(x, ex, k), lerp(y, ey, k), 2.6 + k * 7, 0, TAU);
              c.fillStyle = col; c.fill(); c.restore();
            }
          });
        }
      },
      ring(x, y, col, maxR) {
        return add({
          life: 420, t: 0,
          draw(c, f) {
            const k = f.t / f.life;
            c.save();
            c.globalAlpha = (1 - k) * 0.9;
            c.strokeStyle = col; c.lineWidth = 3 * (1 - k) + 0.8;
            c.shadowColor = col; c.shadowBlur = 12;
            c.beginPath(); c.arc(x, y, (maxR || 44) * (1 - Math.pow(1 - k, 2)), 0, TAU); c.stroke();
            c.restore();
          }
        });
      },
      hex(x, y, col, life) {
        return add({
          life: life || 1400, t: 0,
          draw(c, f) {
            const k = f.t / f.life;
            const pulse = 1 + Math.sin(f.t * 0.02) * 0.03;
            c.save();
            c.globalAlpha = (1 - k) * 0.95;
            c.strokeStyle = col; c.lineWidth = 2.4;
            c.shadowColor = col; c.shadowBlur = 18;
            c.beginPath();
            for (let i = 0; i < 6; i++) {
              const a = 60 * i - 30;
              const p = { x: x + Math.sin(rad(a)) * 34 * pulse, y: y + Math.cos(rad(a)) * 42 * pulse };
              i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y);
            }
            c.closePath(); c.stroke();
            c.globalAlpha = (1 - k) * 0.18; c.fillStyle = col; c.fill();
            // inner circuit
            c.globalAlpha = (1 - k) * 0.6; c.lineWidth = 1;
            for (let i = 0; i < 3; i++) {
              c.beginPath();
              c.moveTo(x - 22 + i * 14, y - 30);
              c.lineTo(x - 22 + i * 14, y + 4);
              c.lineTo(x - 8 + i * 14, y + 16);
              c.stroke();
            }
            c.restore();
          }
        });
      },
      text(x, y, str, col, size, life) {
        return add({
          life: life || 900, t: 0,
          draw(c, f) {
            const k = f.t / f.life;
            c.save();
            c.globalAlpha = clamp(1 - Math.pow(k, 2.4), 0, 1);
            c.textAlign = 'center';
            c.font = 'italic 900 ' + (size || 16) + 'px "Arial Black", Impact, sans-serif';
            c.fillStyle = col;
            c.shadowColor = col; c.shadowBlur = 12;
            c.fillText(str, x, y - k * 26);
            c.restore();
          }
        });
      },
      speedlines(x, y, col, n) {
        for (let i = 0; i < (n || 8); i++) {
          const yy = y - 20 - Math.random() * 130;
          const x0 = x - 40 - Math.random() * 60, x1 = x + 60 + Math.random() * 90;
          add({
            life: 280, t: 0,
            draw(c, f) {
              const k = f.t / f.life;
              c.save();
              c.globalAlpha = 0.55 * (1 - k);
              c.strokeStyle = col; c.lineWidth = 1.4;
              c.beginPath(); c.moveTo(x0, yy); c.lineTo(x1, yy); c.stroke();
              c.restore();
            }
          });
        }
      },
      beam(x1, y1, x2, y2, col, life) {
        return add({
          life: life || 900, t: 0,
          draw(c, f) {
            const k = f.t / f.life;
            const grow = clamp(k * 7, 0, 1);
            c.save();
            c.globalAlpha = (1 - k) * 0.9;
            c.globalCompositeOperation = 'lighter';
            c.strokeStyle = col; c.lineWidth = 2.2;
            c.shadowColor = col; c.shadowBlur = 14;
            c.beginPath(); c.moveTo(x1, y1);
            c.lineTo(lerp(x1, x2, grow), lerp(y1, y2, grow));
            c.stroke(); c.restore();
          }
        });
      },
      orb(x1, y1, x2, y2, col, life) {
        return add({
          life: life || 700, t: 0,
          draw(c, f) {
            const k = f.t / f.life;
            const ex = lerp(x1, x2, k), ey = lerp(y1, y2, k) - Math.sin(k * Math.PI) * 34;
            c.save();
            c.shadowColor = col; c.shadowBlur = 20;
            c.fillStyle = col;
            c.beginPath(); c.arc(ex, ey, 8, 0, TAU); c.fill();
            c.restore();
          }
        });
      },
      glitch(x, y, w, h, colA, colB, n) {
        for (let i = 0; i < (n || 7); i++) {
          const bx = x - (w || 60) / 2 + Math.random() * (w || 60);
          const by = y - (h || 140) + Math.random() * (h || 140);
          const bw = 6 + Math.random() * 22, bh = 3 + Math.random() * 5;
          add({
            life: 300 + Math.random() * 160, t: 0,
            draw(c, f) {
              const k = f.t / f.life;
              c.save();
              c.globalAlpha = (1 - k) * 0.9;
              c.fillStyle = Math.random() > 0.5 ? colA : colB;
              c.fillRect(bx, by, bw, bh);
              c.restore();
            }
          });
        }
      }
    };
    return api;
  }

  /* ------------------------------------------------------- pose utilities -- */
  const NUMK = ['x', 'y', 'hipY', 'tA', 'headA', 'alpha', 'rot', 'kB', 'vx'];
  const OBJK = ['aL', 'aR', 'lL', 'lR'];
  function clonePose(p) {
    const c = {};
    NUMK.forEach(k => c[k] = p[k]);
    OBJK.forEach(k => c[k] = Object.assign({}, p[k]));
    c.kat = p.kat; c.guns = p.guns; c.overclock = p.overclock;
    return c;
  }

  global.BIGB = {
    rad, dir, clamp, lerp, shade, mix,
    COSTUMES, ghostPal, PROPORTION,
    solve, drawBigB, FX, clonePose, NUMK, OBJK, updateScarf, drawScarf
  };
})(typeof window !== 'undefined' ? window : globalThis);
