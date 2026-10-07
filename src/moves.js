/* ============================================================================
   BIG-B — MOVE LIBRARY
   ----------------------------------------------------------------------------
   Every entry: label (UI), group, dmg readout, phases (design/README data),
   and steps (keyframes) consumed by the pose engine in the lab shell.

   Steps ported 1:1 from the original animation-data.json timings for the
   moves that had stills. Entries marked derived:true are authored from the
   smash-card descriptions because no still was produced for them (utilt,
   dtilt, usmash, dsmash, fair, bair, uair, grab + throws).
   ========================================================================== */
(function (global) {
  'use strict';

  const st = (pose, d, o) => Object.assign({ pose: pose, d: d }, o || {});
  const BASE_X = 340, GROUND = 520;

  const MOVES = {
    /* --------------------------------------------------------- movement -- */
    idle: {
      label: 'IDLE', group: 'MOVEMENT', name: 'Idle — Neon Stance',
      dmg: '—', loop: true, phases: [['breathe-in', 950], ['breathe-out', 950]],
      steps: [
        st({ tA: 7, hipY: 58.5, aL: { u: -15, f: 15 }, aR: { u: 19, f: 47 } }, 950),
        st({ tA: 3.5, hipY: 60, aL: { u: -20, f: 9 }, aR: { u: 13, f: 41 } }, 950)
      ]
    },
    run: {
      label: 'RUN', group: 'MOVEMENT', name: 'Run — Dash Protocol',
      dmg: '—', loop: true, phases: [['stride-A', 130], ['pass', 130], ['stride-B', 130], ['pass-2', 130]],
      steps: [
        st({ tA: 15, hipY: 52, headA: -8, vx: 320, aL: { u: -52, f: 12 }, aR: { u: 64, f: 96 }, lL: { h: -45, k: 66 }, lR: { h: 55, k: 8 }, kB: 82 }, 130,
          { e: 'linear', tick: (dt, k, env) => { if (Math.random() < dt / 90) env.fx.dust(env.P.x - 10, GROUND, '#5a6a80'); } }),
        st({ tA: 14, hipY: 55, headA: -8, vx: 320, aL: { u: -12, f: 18 }, aR: { u: 20, f: 60 }, lL: { h: -10, k: 16 }, lR: { h: 22, k: 66 }, kB: 82 }, 130, { e: 'linear' }),
        st({ tA: 15, hipY: 52, headA: -8, vx: 320, aL: { u: 64, f: 96 }, aR: { u: -52, f: 12 }, lL: { h: 55, k: 8 }, lR: { h: -45, k: 66 }, kB: 82 }, 130,
          { e: 'linear', tick: (dt, k, env) => { if (Math.random() < dt / 90) env.fx.dust(env.P.x - 10, GROUND, '#5a6a80'); } }),
        st({ tA: 14, hipY: 55, headA: -8, vx: 320, aL: { u: 20, f: 60 }, aR: { u: -12, f: 18 }, lL: { h: 22, k: 66 }, lR: { h: -10, k: 16 }, kB: 82 }, 130, { e: 'linear' })
      ]
    },
    jump: {
      label: 'JUMP', group: 'MOVEMENT', name: 'Jump — Wire Assist',
      dmg: '—', phases: [['crouch', 140], ['launch', 180], ['rise+apex', 190], ['fall', 200], ['land', 110], ['recover', 180]],
      steps: [
        st({ hipY: 40, tA: 10, aL: { u: -55, f: -15 }, aR: { u: -30, f: 15 }, lL: { h: -30, k: 58 }, lR: { h: 32, k: 62 } }, 140),
        st({ y: 428, hipY: 64, tA: 2, aL: { u: 150, f: 170 }, aR: { u: 130, f: 158 }, lL: { h: -24, k: 10 }, lR: { h: 18, k: 2 }, kB: 150 }, 180,
          { e: 'inCubic', on: (env) => { env.sfx.whoosh(); env.fx.ring(env.P.x, GROUND, env.pal.trim, 40); } }),
        st({ y: 382, hipY: 56, tA: 6, lL: { h: -32, k: 48 }, lR: { h: 36, k: 52 }, aL: { u: 120, f: 140 }, aR: { u: 100, f: 120 } }, 190),
        st({ y: 520, hipY: 62, tA: 8, lL: { h: -26, k: 8 }, lR: { h: 22, k: 2 }, aL: { u: 60, f: 30 }, aR: { u: 40, f: 60 }, kB: 100 }, 200, { e: 'inCubic' }),
        st({ hipY: 44, tA: 12, lL: { h: -30, k: 56 }, lR: { h: 34, k: 60 }, aL: { u: -30, f: 10 }, aR: { u: 10, f: 40 } }, 110,
          { on: (env) => { env.fx.dust(BASE_X, GROUND, '#5a6a80'); env.sfx.land(); } }),
        st({}, 180)
      ]
    },

    /* ----------------------------------------------------------- ground -- */
    jab: {
      label: 'JAB', group: 'GROUND', name: 'Jab — Street Format',
      dmg: '1.8 / 2.0 / 4.5%', phases: [['hit-1 elbow', 85], ['hit-2 revolver-butt', 95], ['wind-spin', 60], ['finisher slash', 110], ['recover', 220]],
      steps: [
        st({ x: 356, tA: 9, aL: { u: 78, f: 85 }, aR: { u: -32, f: 28 }, lL: { h: -18, k: 8 }, lR: { h: 20, k: 6 } }, 85,
          { e: 'outCubic', on: (env) => { env.sfx.whoosh(); env.fx.spark(env.J.handL.x, env.J.handL.y, '#9fefff', 4); env.hit(1.8, 3); } }),
        st({ tA: 11, aL: { u: 20, f: 40 }, aR: { u: 82, f: 150 }, kB: 60 }, 95,
          { e: 'outCubic', on: (env) => { env.sfx.click(); env.fx.spark(env.J.handR.x, env.J.handR.y, '#ffd166', 4); env.hit(2, 3); } }),
        st({ tA: -11, aR: { u: 120, f: 170 }, kB: 210 }, 60, { e: 'outCubic' }),
        st({ tA: 17, aR: { u: 58, f: 70 }, kB: 28, lL: { h: -24, k: 10 }, lR: { h: 28, k: 8 } }, 110,
          { e: 'outCubic', on: (env) => { env.sfx.slash(); env.fx.slash(env.P.x + 56, env.P.y - 96, 86, -60, 120, env.pal.fx, 7); env.hit(4.5, 14); } }),
        st({}, 220)
      ]
    },
    ftilt: {
      label: 'F-TILT', group: 'GROUND', name: 'F-Tilt — Neon Fang',
      dmg: '9% (12% tipper)', phases: [['windup', 130], ['thrust', 100], ['hold', 70], ['recover', 230]],
      steps: [
        st({ x: 336, tA: 0, aR: { u: 8, f: -28 }, kB: 152, aL: { u: -30, f: 20 } }, 130),
        st({ x: 372, tA: 13, aR: { u: 88, f: 92 }, kB: 90, aL: { u: -55, f: -20 }, lL: { h: -20, k: 8 }, lR: { h: 30, k: 10 } }, 100,
          { e: 'outCubic', on: (env) => { env.sfx.slash(); env.fx.slash(env.P.x + 70, env.P.y - 92, 98, -25, 60, '#9fefff', 8); env.fx.slash(env.P.x + 130, env.P.y - 92, 26, 0, 360, '#fff', 5); env.hit(9, 18, 'TIPPER'); } }),
        st({ x: 368, tA: 13, aR: { u: 90, f: 92 }, kB: 90 }, 70),
        st({}, 230)
      ]
    },
    utilt: {
      label: 'U-TILT', group: 'GROUND', derived: true, name: 'U-Tilt — Rising Byte',
      dmg: '7%', phases: [['dip', 90], ['rise', 110], ['recover', 200]],
      steps: [
        st({ hipY: 48, tA: 8, aR: { u: 104, f: 130 }, kB: 158, aL: { u: -34, f: 6 }, lL: { h: -24, k: 50 }, lR: { h: 28, k: 52 } }, 90),
        st({ hipY: 66, tA: -8, headA: -7, aR: { u: 186, f: 202 }, kB: 152, aL: { u: -48, f: -14 }, lL: { h: -12, k: 4 }, lR: { h: 12, k: 2 } }, 110,
          { e: 'outCubic', on: (env) => { env.sfx.slash(); env.fx.slash(env.P.x + 16, env.P.y - 132, 92, -30, 190, env.pal.fx, 7); env.hit(7, 16, 'JUGGLE'); } }),
        st({}, 200)
      ]
    },
    dtilt: {
      label: 'D-TILT', group: 'GROUND', derived: true, name: 'D-Tilt — Sweep Protocol',
      dmg: '6% (trips)', phases: [['dip', 80], ['sweep', 120], ['recover', 210]],
      steps: [
        st({ hipY: 40, tA: 8, aR: { u: 58, f: 78 }, kB: 124, lL: { h: -34, k: 60 }, lR: { h: 36, k: 62 } }, 80),
        st({ hipY: 34, tA: 11, aR: { u: 98, f: 102 }, kB: 98, aL: { u: 30, f: 60 }, lL: { h: -42, k: 72 }, lR: { h: 44, k: 70 } }, 120,
          { e: 'outCubic', on: (env) => { env.sfx.slash(); env.fx.slash(env.P.x + 40, env.P.y - 22, 78, -10, 130, env.pal.fx, 6); env.hit(6, 14, 'TRIP'); env.trip(); } }),
        st({}, 210)
      ]
    },
    dashattack: {
      label: 'DASH ATTACK', group: 'GROUND', name: 'Dash Attack — Wire Slide',
      dmg: '9%', phases: [['drop', 120], ['slide', 340], ['rise', 120], ['recover', 240]],
      steps: [
        st({ hipY: 33, tA: -13, headA: 6, kat: 'hip', aL: { u: 64, f: 118 }, aR: { u: 54, f: 108 }, lL: { h: 72, k: 6 }, lR: { h: 48, k: 34 } }, 120, { e: 'outCubic' }),
        st({ x: 520, hipY: 31, tA: -14, headA: 6, vx: 420, aL: { u: 64, f: 120 }, aR: { u: 54, f: 110 }, lL: { h: 74, k: 4 }, lR: { h: 50, k: 32 } }, 340,
          {
            e: 'linear',
            on: (env) => { env.sfx.dash(); env.fx.beam(env.P.x + 10, env.P.y - 26, env.P.x + 96, env.P.y - 22, env.pal.fx, 700); },
            tick: (dt, k, env) => {
              if (Math.random() < dt / 50) env.fx.spark(env.P.x + 20 + Math.random() * 70, env.P.y - 20, env.pal.fx, 2, 14);
            },
            ev: [[0.45, (env) => { env.sfx.slash(); env.fx.slash(env.P.x + 80, env.P.y - 24, 60, -80, 80, env.pal.fx, 6); env.hit(9, 20, 'TRIP'); env.trip(); }]]
          }),
        st({ x: 528, hipY: 34, tA: -8, kat: 'hip' }, 120),
        st({ kat: 'hand' }, 240)
      ]
    },
    fsmash: {
      label: 'F-SMASH', group: 'GROUND', name: 'F-Smash — Iai: Overclock Draw',
      dmg: '22 / 30% tipper', phases: [['sheath', 210], ['charge', 760], ['strike', 105], ['follow-through', 280], ['re-sheath', 230], ['recover', 200]],
      steps: [
        st({ hipY: 45, tA: 3, headA: 5, kat: 'hip', aR: { u: -24, f: 58 }, aL: { u: -14, f: 18 }, lL: { h: -26, k: 48 }, lR: { h: 30, k: 52 } }, 210, { on: (env) => env.sfx.click() }),
        st({ hipY: 43, tA: 1, headA: 6, kat: 'hip' }, 760,
          {
            e: 'linear',
            on: (env) => env.sfx.charge(),
            tick: (dt, k, env) => {
              if (Math.random() < dt / 110) env.fx.spark(env.P.x - 20 + Math.random() * 40, env.P.y - 110 + Math.random() * 60, env.pal.fx, 2, 16);
              if (Math.random() < dt / 260) env.sfx.charge();
            }
          }),
        st({ x: 396, tA: 24, headA: -6, kat: 'hand', aR: { u: 82, f: 95 }, kB: 66, aL: { u: -60, f: -25 }, lL: { h: -30, k: 10 }, lR: { h: 40, k: 14 } }, 105,
          {
            e: 'outCubic', on: (env) => {
              env.sfx.slash(); env.sfx.boom(); env.shake(); env.fx.speedlines(env.P.x, env.P.y, '#fff', 9); env.flash();
              env.fx.slash(env.P.x + 62, env.P.y - 96, 128, -150, 70, '#ffffff', 12);
              env.fx.slash(env.P.x + 62, env.P.y - 96, 128, -150, 70, env.pal.fx, 6);
              env.hit(30, 95, 'TIPPER!');
            }
          }),
        st({ x: 400, tA: 27, kB: 58, aR: { u: 86, f: 96 } }, 280),
        st({ tA: 8, kat: 'hip', aR: { u: -20, f: 50 }, aL: { u: -16, f: 16 } }, 230, { on: (env) => env.sfx.click() }),
        st({ kat: 'hand' }, 200)
      ]
    },
    usmash: {
      label: 'U-SMASH', group: 'GROUND', derived: true, name: 'U-Smash — Rising Storm',
      dmg: '17%', phases: [['charge', 420], ['flip', 110], ['spiral slash', 130], ['recover', 260]],
      steps: [
        st({ hipY: 44, tA: 7, kat: 'hip', aR: { u: -30, f: 22 }, kB: 168, aL: { u: -20, f: 14 }, lL: { h: -26, k: 50 }, lR: { h: 30, k: 54 } }, 420,
          { e: 'linear', on: (env) => env.sfx.charge(), tick: (dt, k, env) => { if (Math.random() < dt / 140) env.fx.spark(env.P.x + Math.random() * 40 - 20, env.P.y - 60, env.pal.fx, 2, 18); } }),
        st({ y: 498, hipY: 58, tA: -14, kat: 'hand', aR: { u: 170, f: 186 }, kB: 160, lL: { h: -32, k: 58 }, lR: { h: 36, k: 60 } }, 110, { e: 'outCubic', on: (env) => env.sfx.whoosh() }),
        st({ y: 470, hipY: 70, tA: -24, headA: -8, aR: { u: 196, f: 210 }, kB: 170, aL: { u: 150, f: 176 } }, 130,
          {
            e: 'outCubic', on: (env) => {
              env.sfx.slash(); env.fx.slash(env.P.x + 6, env.P.y - 128, 118, -70, 240, env.pal.fx, 9);
              env.fx.slash(env.P.x + 6, env.P.y - 128, 60, 0, 360, '#fff', 4);
              env.hit(17, 42, 'ANTI-AIR');
            }
          }),
        st({ y: GROUND, hipY: 50, tA: 8 }, 260)
      ]
    },
    dsmash: {
      label: 'D-SMASH', group: 'GROUND', derived: true, name: 'D-Smash — Firewall Break',
      dmg: '15 / 13%', phases: [['charge', 300], ['360° sweep', 140], ['recover', 280]],
      steps: [
        st({ hipY: 44, tA: 4, kat: 'hip', aR: { u: -22, f: 30 }, kB: 150, aL: { u: -16, f: 20 }, lL: { h: -24, k: 48 }, lR: { h: 28, k: 52 } }, 300,
          { e: 'linear', on: (env) => env.sfx.charge() }),
        st({ hipY: 36, tA: 10, kat: 'hand', aR: { u: 96, f: 100 }, kB: 94, aL: { u: 40, f: 70 }, lL: { h: -42, k: 74 }, lR: { h: 44, k: 72 } }, 140,
          {
            e: 'outCubic', on: (env) => {
              env.sfx.slash(); env.fx.slash(env.P.x, env.P.y - 18, 104, -20, 170, env.pal.fx, 8);
              env.fx.slash(env.P.x, env.P.y - 18, 104, 150, 350, env.pal.fx2, 6);
              env.fx.beam(env.P.x - 70, env.P.y - 16, env.P.x + 70, env.P.y - 16, env.pal.fx, 500);
              env.hit(15, 30, 'ROLL CATCH');
            }
          }),
        st({}, 280)
      ]
    },

    /* ---------------------------------------------------------- aerials -- */
    nair: {
      label: 'N-AIR', group: 'AERIAL', name: 'N-Air — Data Halo',
      dmg: '10% (multi-hit)', resetRot: true, phases: [['rise', 190], ['spin', 520], ['land', 130], ['recover', 200]],
      steps: [
        st({ y: 400, hipY: 56, tA: 4, aL: { u: 150, f: 170 }, aR: { u: 150, f: 170 }, kB: 190, lL: { h: -36, k: 64 }, lR: { h: 40, k: 58 } }, 190,
          { e: 'inCubic', on: (env) => env.sfx.whoosh() }),
        st({ rot: 360, y: 386, hipY: 54, aL: { u: 160, f: 180 }, aR: { u: 160, f: 180 }, kB: 200 }, 520,
          {
            e: 'linear',
            tick: (dt, k, env) => { if (Math.random() < dt / 110) env.afterimage(); },
            ev: [
              [0.25, (env) => { env.fx.slash(env.P.x, env.P.y - 90, 78, 0, 180, env.pal.fx, 6); env.sfx.slash(); env.hit(4, 6); }],
              [0.55, (env) => { env.fx.slash(env.P.x, env.P.y - 90, 78, 180, 360, env.pal.fx, 6); env.sfx.slash(); env.hit(4, 6); }],
              [0.85, (env) => { env.fx.slash(env.P.x, env.P.y - 90, 78, 0, 180, '#9fefff', 5); env.hit(2, 4); }]
            ]
          }),
        st({ y: GROUND, rot: 360, hipY: 44, tA: 10, lL: { h: -30, k: 56 }, lR: { h: 34, k: 60 }, aL: { u: -20, f: 20 }, aR: { u: 20, f: 50 }, kB: 110 }, 130,
          { e: 'inCubic', on: (env) => { env.fx.dust(env.P.x, GROUND, '#5a6a80'); env.sfx.land(); } }),
        st({ rot: 360 }, 200)
      ]
    },
    fair: {
      label: 'F-AIR', group: 'AERIAL', derived: true, name: 'F-Air — Cross Cut',
      dmg: '3 + 8%', phases: [['hop', 70], ['knee', 90], ['slash', 110], ['recover', 240]],
      steps: [
        st({ y: 470, hipY: 56, tA: 8, aR: { u: 120, f: 130 }, aL: { u: 40, f: 60 }, lL: { h: -30, k: 50 }, lR: { h: 34, k: 54 } }, 70),
        st({ y: 466, hipY: 56, tA: 14, aL: { u: 96, f: 100 }, aR: { u: 20, f: 40 } }, 90,
          { e: 'outCubic', on: (env) => { env.sfx.whoosh(); env.hit(3, 6, 'HIT 1'); } }),
        st({ y: 462, hipY: 56, tA: 16, aR: { u: 98, f: 102 }, kB: 96 }, 110,
          { e: 'outCubic', on: (env) => { env.sfx.slash(); env.fx.slash(env.P.x + 60, env.P.y - 92, 92, -40, 70, env.pal.fx, 7); env.hit(8, 22, 'DRAG'); } }),
        st({ y: GROUND }, 240)
      ]
    },
    bair: {
      label: 'B-AIR', group: 'AERIAL', derived: true, name: 'B-Air — Backdraft',
      dmg: '11%', phases: [['turn', 90], ['point-blank shot', 100], ['recoil drift', 130], ['recover', 220]],
      steps: [
        st({ y: 460, hipY: 56, tA: -10, headA: 8, guns: true, kat: 'hip', aL: { u: 170, f: 190 }, aR: { u: 146, f: 168 }, lL: { h: -28, k: 48 }, lR: { h: 32, k: 52 } }, 90),
        st({ y: 458, tA: -13, aR: { u: 186, f: 202 } }, 100,
          {
            e: 'outCubic', on: (env) => {
              env.sfx.shot(); env.fx.muzzle(env.J.handR.x, env.J.handR.y, env.P.aR.f, '#ffd166');
              env.fx.tracer(env.J.handR.x, env.J.handR.y, env.P.x - 120, env.P.y - 92, '#ffd166');
              env.hit(11, 26, 'BACK SHOT');
            }
          }),
        st({ x: 360, tA: -7, guns: false, kat: 'hand' }, 130),
        st({ y: GROUND }, 220)
      ]
    },
    dair: {
      label: 'D-AIR', group: 'AERIAL', name: 'D-Air — Guillotine Drop',
      dmg: '13% SPIKE', resetRot: true, phases: [['stall-rise', 230], ['hang', 200], ['plunge', 120], ['impact', 110], ['recover', 260]],
      steps: [
        st({ y: 336, hipY: 56, tA: 2, aR: { u: 148, f: 168 }, kB: 182, aL: { u: 120, f: 150 }, lL: { h: -34, k: 60 }, lR: { h: 38, k: 56 } }, 230,
          { e: 'inCubic', on: (env) => env.sfx.whoosh() }),
        st({ y: 330, hipY: 54, tA: 6, aR: { u: 160, f: 180 }, kB: 200 }, 200),
        st({ y: 520, hipY: 58, tA: -4, aR: { u: 4, f: 6 }, kB: 2, aL: { u: 170, f: 180 }, lL: { h: -16, k: 4 }, lR: { h: 14, k: 2 } }, 120,
          { e: 'inCubic', tick: (dt, k, env) => { if (Math.random() < dt / 40) env.afterimage(); } }),
        st({ y: 520, hipY: 40, tA: 6, aR: { u: 14, f: 10 }, kB: 16, lL: { h: -28, k: 54 }, lR: { h: 32, k: 58 } }, 110,
          { on: (env) => { env.sfx.boom(); env.shake(); env.fx.ring(env.P.x, GROUND - 4, env.pal.fx, 60); env.fx.dust(env.P.x, GROUND - 4, '#5a6a80'); env.hit(13, 26, 'SPIKE'); } }),
        st({}, 260)
      ]
    },
    uair: {
      label: 'U-AIR', group: 'AERIAL', derived: true, name: 'U-Air — Flip Byte',
      dmg: '9%', resetRot: true, phases: [['tuck', 90], ['somersault', 140], ['blade arc', 100], ['recover', 230]],
      steps: [
        st({ y: 430, hipY: 56, tA: 6, aR: { u: 150, f: 170 }, aL: { u: 130, f: 155 }, lL: { h: -40, k: 70 }, lR: { h: 44, k: 66 } }, 90),
        st({ rot: 190, y: 426, tA: -6, aR: { u: 176, f: 190 }, kB: 182 }, 140, { e: 'linear' }),
        st({ rot: 300, y: 424, tA: -10, aR: { u: 194, f: 206 }, kB: 176 }, 100,
          { e: 'outCubic', on: (env) => { env.sfx.slash(); env.fx.slash(env.P.x, env.P.y - 118, 86, -60, 210, env.pal.fx, 7); env.hit(9, 20, 'JUGGLE'); } }),
        st({ rot: 360, y: GROUND }, 230)
      ]
    },

    /* ---------------------------------------------------------- specials -- */
    neutralb: {
      label: 'B · TRICK SHOT', group: 'SPECIALS', name: 'Neutral B — Trick Shot',
      dmg: '1.8×4 taps / 1.2×6 fan', phases: [['draw', 190], ['taps', 400], ['fan-fire', 360], ['reload', 320], ['holster', 210]],
      steps: [
        st({ hipY: 54, tA: 9, guns: true, kat: 'hip', aL: { u: 80, f: 88 }, aR: { u: 74, f: 84 }, lL: { h: -20, k: 8 }, lR: { h: 24, k: 8 } }, 190,
          { on: (env) => { env.sfx.click(); env.sfx.click(); } }),
        st({ aL: { u: 84, f: 94 } }, 100, { ev: [[0.15, (env) => env.shoot('L', 1.8, 6)]] }),
        st({ aR: { u: 78, f: 90 } }, 100, { ev: [[0.15, (env) => env.shoot('R', 1.8, 6)]] }),
        st({ aL: { u: 82, f: 90 } }, 100, { ev: [[0.15, (env) => env.shoot('L', 1.8, 6)]] }),
        st({ aR: { u: 76, f: 88 } }, 100, { ev: [[0.15, (env) => env.shoot('R', 1.8, 6)]] }),
        st({ tA: 11, aL: { u: 86, f: 96 }, aR: { u: 82, f: 94 }, hipY: 52 }, 130, { on: (env) => env.sfx.zip() }),
        st({ tA: 12 }, 70, { ev: [[0.2, (env) => env.shoot('L', 1.2, 26, '#ffb347')]] }),
        st({}, 60, { ev: [[0.2, (env) => env.shoot('R', 1.2, 26, '#ffb347')]] }),
        st({}, 60, { ev: [[0.2, (env) => env.shoot('L', 1.2, 26, '#ffb347')]] }),
        st({}, 60, { ev: [[0.2, (env) => env.shoot('R', 1.2, 26, '#ffb347')]] }),
        st({}, 60, { ev: [[0.2, (env) => env.shoot('L', 1.2, 26, '#ffb347')]] }),
        st({}, 60, { ev: [[0.2, (env) => { env.shoot('R', 1.2, 26, '#ffb347'); env.shake(3); }]] }),
        st({ tA: 6, aL: { u: -70, f: 130 }, aR: { u: -60, f: 120 } }, 150, { on: (env) => env.sfx.zip() }),
        st({ tA: 8, aL: { u: 80, f: 88 }, aR: { u: 74, f: 84 } }, 170,
          { on: (env) => { env.sfx.click(); env.fx.text(env.P.x, env.P.y - 160, 'RELOADED', env.pal.fx, 13); } }),
        st({ guns: false, kat: 'hand' }, 210)
      ]
    },
    sideb: {
      label: 'B→ · BLINK FANG', group: 'SPECIALS', name: 'Side B — Blink Fang',
      dmg: '12%', phases: [['windup', 130], ['vanish', 60], ['dash', 150], ['reappear', 90], ['recover', 400]],
      steps: [
        st({ hipY: 41, tA: 11, aL: { u: -42, f: -5 }, aR: { u: 22, f: 64 }, kB: 60, lL: { h: -28, k: 54 }, lR: { h: 32, k: 58 } }, 130,
          { on: (env) => env.sfx.charge() }),
        st({ alpha: 0.15, tA: 14 }, 60, { on: (env) => { env.glitchSplit(); env.sfx.dash(); } }),
        st({ x: 640, alpha: 0.15, tA: 16, aR: { u: 60, f: 70 }, kB: 40 }, 150,
          {
            e: 'linear',
            tick: (dt, k, env) => { if (Math.random() < dt / 24) env.afterimage(env.pal.fx); },
            ev: [[0.55, (env) => { env.fx.slash(env.dummy.x, env.dummy.chestY, 90, -120, 100, env.pal.fx2, 8); env.hit(12, 30); env.sfx.slash(); }]]
          }),
        st({ x: 644, alpha: 1, tA: 18, aR: { u: 64, f: 74 }, kB: 44, lL: { h: -26, k: 12 }, lR: { h: 34, k: 14 } }, 90,
          { e: 'outCubic', on: (env) => { env.glitchSplit(); env.fx.slash(env.P.x + 30, env.P.y - 92, 92, -110, 90, env.pal.fx, 8); env.sfx.slash(); env.fx.spark(env.P.x + 40, env.P.y - 92, '#fff', 6); } }),
        st({ tA: 14 }, 160),
        st({ tA: 6, aR: { u: 16, f: 44 }, kB: 118 }, 240)
      ]
    },
    upb: {
      label: 'B↑ · GHOST LINE', group: 'SPECIALS', name: 'Up B — Ghost Line',
      dmg: '8% rising slash', resetRot: true, phases: [['aim', 150], ['fire-wire', 90], ['yank', 240], ['rising-slash', 120], ['flip-down', 330], ['land', 110], ['recover', 200]],
      steps: [
        st({ hipY: 50, tA: 6, aR: { u: 132, f: 142 }, kB: 210, aL: { u: -30, f: 30 } }, 150),
        st({ aR: { u: 150, f: 150 } }, 90,
          { on: (env) => { env.sfx.zip(); env.fx.beam(env.P.x + 30, env.P.y - 150, env.tether.x, env.tether.y, '#cfe8f2', 900); env.fx.ring(env.tether.x, env.tether.y, '#cfe8f2', 30); } }),
        st({ x: 500, y: 272, hipY: 56, tA: -4, aR: { u: 150, f: 158 }, aL: { u: 140, f: 152 }, lL: { h: -22, k: 42 }, lR: { h: 26, k: 46 } }, 240,
          { e: 'inCubic', tick: (dt, k, env) => { if (Math.random() < dt / 40) env.afterimage(); } }),
        st({ x: 520, y: 262, hipY: 52, tA: 4, aR: { u: 120, f: 130 }, kB: 60 }, 120,
          { on: (env) => { env.sfx.slash(); env.fx.slash(env.P.x + 10, env.P.y - 70, 86, -30, 140, '#9fefff', 7); env.hit(8, 12, 'RISE'); } }),
        st({ x: 548, y: GROUND, rot: 360, hipY: 60, tA: 6, aR: { u: 20, f: 60 }, kB: 110, lL: { h: -20, k: 8 }, lR: { h: 22, k: 6 } }, 330,
          { e: 'inCubic', tick: (dt, k, env) => { if (Math.random() < dt / 60) env.afterimage(); } }),
        st({ rot: 360, hipY: 44, lL: { h: -28, k: 54 }, lR: { h: 32, k: 58 } }, 110,
          { on: (env) => { env.fx.dust(env.P.x, GROUND, '#5a6a80'); env.sfx.land(); } }),
        st({ rot: 0 }, 200)
      ]
    },
    downb: {
      label: 'B↓ · FIREWALL PARRY', group: 'SPECIALS', name: 'Down B — Firewall Parry',
      dmg: '1.3× reflected / 16 riposte', phases: [['stance', 180], ['window', 560], ['parry-flash', 60], ['riposte', 120], ['follow-through', 240], ['recover', 260]],
      steps: [
        st({ hipY: 48, tA: -4, headA: 4, aL: { u: 56, f: 136 }, aR: { u: 44, f: -42 }, kB: 166, lL: { h: -22, k: 48 }, lR: { h: 26, k: 50 } }, 180,
          { on: (env) => { env.sfx.zip(); env.fx.hex(env.P.x + 6, env.P.y - 80, env.pal.fx, 1600); } }),
        st({}, 560,
          {
            on: (env) => {
              env.fx.orb(env.dummy.x - 20, env.dummy.chestY - 20, env.P.x + 34, env.P.y - 88, env.pal.fx2, 780);
              env.setTimer(720, () => {
                env.slow(520, 0.16); env.flash(); env.sfx.parry();
                env.fx.slash(env.P.x + 20, env.P.y - 90, 70, -120, 120, env.pal.fx, 9);
                env.fx.text(env.P.x + 10, env.P.y - 170, 'PARRY!', env.pal.fx, 20);
              });
            }
          }),
        st({}, 240),
        st({ x: 520, tA: 20, aR: { u: 86, f: 92 }, kB: 74, aL: { u: -58, f: -24 }, lL: { h: -28, k: 10 }, lR: { h: 38, k: 14 } }, 120,
          {
            e: 'outCubic', on: (env) => {
              env.sfx.slash(); env.sfx.boom(); env.shake();
              env.fx.slash(env.P.x + 60, env.P.y - 92, 110, -140, 60, '#ffffff', 10);
              env.hit(16, 60, 'RIPOSTE');
              env.fx.orb(env.P.x + 90, env.P.y - 92, env.dummy.x, env.dummy.chestY, env.pal.fx, 420);
              env.setTimer(430, () => { env.hit(8, 10); env.sfx.shot(); });
            }
          }),
        st({ x: 516, tA: 22, aR: { u: 88, f: 92 }, kB: 70 }, 240),
        st({ tA: 6, aR: { u: 16, f: 44 }, kB: 118 }, 260)
      ]
    },

    /* ------------------------------------------------------------ grabs -- */
    grab: {
      label: 'GRAB', group: 'GRABS', derived: true, name: 'Grab — Wire Snare',
      dmg: 'grab', phases: [['reach', 120], ['hold', 400], ['recover', 200]],
      steps: [
        st({ hipY: 52, tA: 10, aL: { u: 78, f: 96 }, aR: { u: 40, f: 62 }, kB: 140 }, 120,
          { e: 'outCubic', on: (env) => { env.sfx.zip(); env.fx.beam(env.J.handL.x, env.J.handL.y, env.dummy.x, env.dummy.chestY, '#cfe8f2', 400); env.grab(); } }),
        st({ tA: 8 }, 400, { tick: (dt, k, env) => { if (Math.random() < dt / 90) env.fx.spark(env.dummy.x, env.dummy.chestY, '#cfe8f2', 2, 16); } }),
        st({}, 200)
      ]
    },
    fthrow: {
      label: 'F-THROW', group: 'GRABS', derived: true, name: 'F-Throw — Point-Blank',
      dmg: '9%', phases: [['release', 90], ['recover', 200]],
      steps: [
        st({ tA: 12, guns: true, kat: 'hip', aL: { u: 84, f: 92 }, aR: { u: 78, f: 88 } }, 90,
          { e: 'outCubic', on: (env) => { env.sfx.shot(); env.shake(4); env.fx.muzzle(env.J.handL.x, env.J.handL.y, env.P.aL.f, '#ffd166'); env.fx.tracer(env.J.handL.x, env.J.handL.y, env.dummy.x, env.dummy.chestY, '#ffd166'); env.hit(9, 40, 'THROW'); env.throwOut(1); } }),
        st({ guns: false, kat: 'hand' }, 200)
      ]
    },
    bthrow: {
      label: 'B-THROW', group: 'GRABS', derived: true, name: 'B-Throw — Wire Slam',
      dmg: '10% (kills ~140% at ledge)', phases: [['swing', 120], ['recover', 220]],
      steps: [
        st({ tA: -16, aR: { u: 190, f: 202 }, kB: 176, aL: { u: 150, f: 176 } }, 120,
          { e: 'outCubic', on: (env) => { env.sfx.slash(); env.shake(5); env.fx.beam(env.P.x + 10, env.P.y - 96, env.dummy.x, env.dummy.chestY, '#cfe8f2', 360); env.fx.slash(env.dummy.x, env.dummy.chestY, 96, -190, -20, env.pal.fx, 8); env.hit(10, 52, 'KILL THROW'); env.throwOut(-1); } }),
        st({}, 220)
      ]
    },
    uthrow: {
      label: 'U-THROW', group: 'GRABS', derived: true, name: 'U-Throw — Toss & Rise',
      dmg: '8% (combo starter)', phases: [['toss', 110], ['recover', 210]],
      steps: [
        st({ hipY: 64, tA: -8, aR: { u: 180, f: 196 }, kB: 170, aL: { u: 166, f: 188 } }, 110,
          { e: 'outCubic', on: (env) => { env.sfx.slash(); env.fx.slash(env.P.x + 10, env.P.y - 126, 84, -40, 180, env.pal.fx, 7); env.hit(8, 30, 'COMBO'); env.throwOut(2); } }),
        st({}, 210)
      ]
    },
    dthrow: {
      label: 'D-THROW', group: 'GRABS', derived: true, name: 'D-Throw — Ground Slam',
      dmg: '7% (true → F-Tilt at low %)', phases: [['slam', 120], ['recover', 210]],
      steps: [
        st({ hipY: 42, tA: 10, aR: { u: 62, f: 72 }, kB: 62, aL: { u: 50, f: 78 }, lL: { h: -30, k: 54 }, lR: { h: 34, k: 58 } }, 120,
          { e: 'outCubic', on: (env) => { env.sfx.boom(); env.shake(4); env.fx.dust(env.dummy.x, GROUND, '#5a6a80'); env.fx.ring(env.dummy.x, GROUND - 6, env.pal.fx, 46); env.hit(7, 10, 'SLAM'); env.bounce(); env.throwOut(0); } }),
        st({}, 210)
      ]
    },

    /* ---------------------------------------------------------- finisher -- */
    finalsmash: {
      label: '★ FINAL SMASH', group: 'FINISHER · STYLE', final: true, name: 'Final Smash — System Purge',
      dmg: '≈35% total', phases: [['charge', 240], ['lock-on', 560], ['blink-combo', 390], ['volley', 420], ['finisher', 110], ['hold', 300], ['exit', 500]],
      steps: [
        st({ hipY: 42, tA: 4, kat: 'hip', aR: { u: -22, f: 56 }, aL: { u: -14, f: 16 } }, 240,
          { on: (env) => { env.voidOn('// SYSTEM PURGE //', 'INITIATING'); env.sfx.charge(); } }),
        st({}, 560, { on: (env) => { env.voidOn('// TARGET ACQUIRED //', 'BIG-B — ONLINE'); env.sfx.dash(); } }),
        st({ x: 600, tA: 18, kat: 'hand', aR: { u: 70, f: 80 }, kB: 50, alpha: 1 }, 130,
          { on: (env) => { env.afterimage(env.pal.fx); env.fx.slash(env.dummy.x, env.dummy.chestY, 100, 60, 200, env.pal.fx, 8); env.sfx.slash(); env.hit(5, 0); } }),
        st({ x: 836, tA: 18, aR: { u: 70, f: 80 }, kB: 130 }, 130,
          { on: (env) => { env.afterimage(env.pal.fx2); env.fx.slash(env.dummy.x, env.dummy.chestY, 100, -160, 20, env.pal.fx2, 8); env.sfx.slash(); env.hit(5, 0); } }),
        st({ x: 614, tA: 20, aR: { u: 90, f: 95 }, kB: 60 }, 130,
          { on: (env) => { env.afterimage('#9fefff'); env.fx.slash(env.dummy.x, env.dummy.chestY, 110, -90, 90, '#9fefff', 8); env.sfx.slash(); env.hit(5, 0); } }),
        st({ x: 640, tA: 10, guns: true, aL: { u: 86, f: 94 }, aR: { u: 80, f: 90 } }, 420,
          {
            on: (env) => env.sfx.zip(),
            tick: (dt, k, env) => {
              if (Math.random() < dt / 70) {
                const h = Math.random() > 0.5 ? env.J.handL : env.J.handR;
                env.fx.muzzle(h.x, h.y, 90, '#ffd166');
                env.fx.tracer(h.x, h.y, env.dummy.x + (Math.random() - 0.5) * 36, env.dummy.chestY + (Math.random() - 0.5) * 30, '#ffd166');
                env.sfx.shot(); env.hit(1.5, 0);
              }
            }
          }),
        st({ x: 520, tA: 26, kat: 'hand', aR: { u: 84, f: 96 }, kB: 62, aL: { u: -60, f: -26 } }, 110,
          {
            e: 'outCubic', on: (env) => {
              env.voidOn('CONNECTION TERMINATED.', '');
              env.flash(); env.sfx.boom(); env.sfx.slash(); env.shake(9); env.slow(400, 0.3);
              env.fx.slash(env.dummy.x - 40, env.dummy.chestY, 190, -150, 70, '#ffffff', 14);
              env.fx.slash(env.dummy.x - 40, env.dummy.chestY, 190, -150, 70, env.pal.fx2, 8);
              env.fx.speedlines(env.dummy.x, env.dummy.chestY, '#fff', 12);
              env.hit(35, 130, 'PURGE');
            }
          }),
        st({ x: 516, tA: 28, kB: 56 }, 300),
        st({ tA: 6, kat: 'hip', aR: { u: -20, f: 50 }, aL: { u: -16, f: 16 } }, 240, { on: (env) => { env.sfx.click(); env.voidOff(); } }),
        st({ kat: 'hand' }, 260)
      ]
    },
    taunt: {
      label: 'TAUNT', group: 'FINISHER · STYLE', name: 'Taunt — “Too Slow.”',
      dmg: '—', phases: [['present', 170], ['spin-L', 170], ['spin-R', 170], ['holster-flip', 370]],
      steps: [
        st({ hipY: 56, tA: 2, guns: true, kat: 'hip', aL: { u: -20, f: 10 }, aR: { u: -16, f: 8 } }, 170,
          { on: (env) => { env.sfx.click(); env.fx.text(env.P.x + 10, env.P.y - 168, 'TOO SLOW.', env.pal.fx2, 16); } }),
        st({ aL: { u: 120, f: 150 }, aR: { u: -90, f: -40 } }, 170),
        st({ aL: { u: -90, f: -40 }, aR: { u: 120, f: 150 } }, 170, { on: (env) => env.sfx.click() }),
        st({ aL: { u: -20, f: 10 }, aR: { u: -16, f: 8 } }, 170, { on: (env) => env.sfx.click() }),
        st({ guns: false, kat: 'hand', aR: { u: 16, f: 44 } }, 200, { on: (env) => env.sfx.click() })
      ]
    },
    __return: {
      label: '', noHome: true, hidden: true, name: 'Return to centre', desc: '',
      steps: [
        st({ x: BASE_X, hipY: 52, tA: 14, headA: -8, vx: 260, aL: { u: -40, f: 20 }, aR: { u: 40, f: 80 }, lL: { h: -40, k: 50 }, lR: { h: 40, k: 20 }, kB: 90 }, 430,
          { e: 'inOut', tick: (dt, k, env) => { if (Math.random() < dt / 100) env.fx.dust(env.P.x + 14, GROUND, '#5a6a80'); } }),
        st({}, 200)
      ]
    }
  };

  const ORDER = [
    ['MOVEMENT', ['idle', 'run', 'jump']],
    ['GROUND', ['jab', 'ftilt', 'utilt', 'dtilt', 'dashattack', 'fsmash', 'usmash', 'dsmash']],
    ['AERIAL', ['nair', 'fair', 'bair', 'uair', 'dair']],
    ['SPECIALS', ['neutralb', 'sideb', 'upb', 'downb']],
    ['GRABS', ['grab', 'fthrow', 'bthrow', 'uthrow', 'dthrow']],
    ['FINISHER · STYLE', ['finalsmash', 'taunt']]
  ];

  global.BIGB_MOVES = { MOVES, ORDER, BASE_X, GROUND, BASE_POSE: {
    x: BASE_X, y: GROUND, hipY: 60, tA: 5, headA: -2, alpha: 1, rot: 0, kB: 118,
    kat: 'hand', guns: false, vx: 0,
    aL: { u: -18, f: 12 }, aR: { u: 16, f: 44 }, lL: { h: -12, k: 6 }, lR: { h: 14, k: 4 }
  } };
})(typeof window !== 'undefined' ? window : globalThis);
