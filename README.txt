NEON CLASH 3D — v2.0
====================
A neon/synthwave platform fighter (Smash-style) that runs entirely in the browser.
No install, no internet needed: just open index.html in Chrome, Edge or Firefox.

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
  C            on the character-select screen: cycle alternate costumes

ROSTER (all original characters)
  KAGE.EXE   ★ flagship (Big-B's character). Cyber cowboy ninja: bladed right hand,
             twin revolvers in the left. Fast and slippery.
               · KATANA  — long glowing cyan arcs on every blade normal; forward
                 tilt paints a full ring, down-air is a somersaulting plunge spike
               · TRICK SHOT (G)   — both revolvers out with a showman 360 spin,
                 two tracer shots; blade is holstered while the guns are up
               · BLINK FANG (W+G) — blinks through the gap and reappears BEHIND the
                 opponent facing them, then cuts on the way out
               · FINAL SMASH      — fill the meter, press G: screen-warping
                 glitchbuster flurry, the strongest single hit in the game
               · masks: amber LED eyes + pixel-dot grin that flickers and flares;
                 four sash ribbons that stream with his movement; hard-light hex
                 circuit shield instead of a bubble
             ALT COSTUMES (C to cycle): DEFAULT, ONI CRIMSON, GHOST PROTOCOL,
             ACID MATRIX, BLOOD MOON, STATIC GLITCH, PROTOTYPE ZERO

  VECTOR     sword zoner. Data-blade with long visible arcs, edge shot, rising-edge recovery.
  PULSE      gunner. Every normal fires the arm cannon; hold G to charge the pulse beam.
  BLIP       floaty multi-jump. Six jumps, slow drift, grav hammer, arc-jump recovery.

  VECTOR, PULSE and BLIP are clearly-labelled PLACEHOLDER slots: fully playable and
  they cover the remaining engine archetypes, but they stand in until the rest of the
  cast is designed. KAGE.EXE is the finished flagship build.

  BALANCE NOTE: across 27 CPU-vs-CPU test matches KAGE.EXE wins clearly more than his
  share (he is the flagship, but he is probably still a little strong); PULSE is the
  weakest of the four. All of it is tunable in the ROSTER block of index.html —
  weight/speed/jump and the four normals + special per character.

ENGINE
  Procedural audio (Web Audio API) — every jump, hit, shield, KO and menu blip is
  synthesised live. No audio files. M mutes.
  Feel: impact star-bursts, directional screen shake, camera punch-in, KO
  slow-motion, hit-stop, landing dust, charge trails.
  Flow: 3-2-1-GO countdown, GAME banner, HUD meters with ready labels.
  Arena: parallax skyline, drifting motes, floating shards, horizon glow, chasing
  light pulse along the platform edges.
  Rigs: per-character proportions, so silhouettes differ by build, not just scale.

DEV TOOLS (not needed to play)
  devtools/  headless harnesses used to verify the game outside a browser:
    harness.js        PLAN=match (default) full CPU-vs-CPU matches, reports errors
                      PLAN=kit   hits every move of every character, reports damage
                      PLAN=kage  KAGE.EXE signature-move assertions
    export.js         pulls the REAL buildFighter() output out of index.html
    raster.py         renders it to PNG (four views per fighter)
    roster-v1.png     the v1 cast, v2 cast, and KAGE.EXE costume sheets
    kage-costumes.png all seven KAGE.EXE palettes
  Usage:
    cd devtools && node harness.js            # full match test
    cd devtools && PLAN=kit node harness.js   # move-by-move test
    cd devtools && ALTS=1 node export.js kage geom.json   # then raster.py geom.json out.png
