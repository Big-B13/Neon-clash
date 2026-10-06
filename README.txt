NEON CLASH 3D — v2.0
====================
A neon/synthwave platform fighter (Smash-style) that runs entirely in the browser.
No install, no internet needed: just open index.html in Chrome, Edge or Firefox.

WHAT'S NEW IN V2
  - Brand-new original cast led by BIG-B (see ROSTER below).
  - Procedural sound: every jump, hit, shield, KO and menu blip is synthesised
    live with the Web Audio API. Press M to mute. No audio files, still offline.
  - Juiced-up presentation: impact star bursts, directional screen shake, camera
    punch-in, KO slow-motion, landing dust, charge trails, hit-stop.
  - Round countdown (3-2-1-GO), GAME banner, richer HUD for chargeable specials.
  - Deeper arena: parallax skyline, drifting motes, floating shards, horizon glow
    and a chasing light pulse along the platform edges.
  - 4 fighters now, with a 4-column select screen and per-character move names.

FILES
  index.html     the whole game (3D scene, physics, AI, UI)
  three.min.js   Three.js r149, vendored locally so the game works offline

RULES
  Damage % + knockback scaling, 3 stocks each, ring-out past the blast zones.
  Modes: 1 PLAYER vs CPU (easy / normal / hard) or LOCAL 2 PLAYER on one keyboard.

CONTROLS
  Player 1     A D move | SPACE jump (x2) | W aim up | S down / drop through
               F light attack | G big attack | H shield
  Player 2     <- -> move | NUM 0 jump (x2) | UP aim | DOWN down / drop through
               NUM 1 light attack | NUM 2 big attack | NUM 3 shield

  F F F        3-hit combo string
  W + F        uppercut / launcher
  S + F        down attack (low sweep on the ground, spike in the air)
  G            the character's big signature attack
  W + G        recovery special (use it to get back on stage)
  down on a small side platform  drop through it (the main stage never drops)
  fall next to the stage edge    grab the ledge, then jump or hold inward to climb
  ESC          pause menu (resume / rematch / character select / quit)
  M            mute / unmute audio

ROSTER (all original characters)
  BIG-B      ★ flagship. Super-heavy powerhouse. Biggest body in the game,
             hardest single hits, B-CHARGE that plows through everything on the
             ground, ROCKET UPPERCUT recovery, and a charged B-BREAKER heavy.
  VECTOR     sword zoner. Data-blade with long visible slash arcs, long-range
             edge shot, spinning RISING EDGE recovery.
  PULSE      gunner. Every normal fires the arm cannon; hold G to bank a charged
             PULSE BEAM, JET BURN recovery.
  BLIP       floaty multi-jump. Six jumps, slow drift, GRAV HAMMER special,
             ARC JUMP recovery.

  VECTOR, PULSE and BLIP are clearly-labelled PLACEHOLDER slots: they are fully
  playable and exercise every archetype in the engine (sword arcs, gunner
  projectiles, floaty multi-jump), but they are standing in until the final cast
  is designed. BIG-B is the finished flagship build.

DEV TOOLS (not needed to play)
  devtools/  headless harnesses used to verify the game outside a browser.
             export.js  + raster.py  render the real character models to PNG
             harness.js runs full CPU-vs-CPU matches and reports errors
             Usage: REPO=/path npm-free node devtools/harness.js
