NEON CLASH 3D — v3.0 "ULTIMATE" ART PASS
======================================
A neon/synthwave platform fighter (Smash-style) that runs entirely in the browser.
No install, no internet needed: just open index.html in Chrome, Edge or Firefox.

V3 — WHAT CHANGED (the whole cast was rebuilt)
  · SURFACES INSTEAD OF BLOCKS. Every fighter is built from a deliberate material
    language (SURF/surf()): fabric, vinyl, painted armour, machined steel, rubber,
    hard-light. Roughness/metalness/specular are authored per part, so armour is
    glossy, cloth is matte, blades are mirrors. Edges are bevelled: no more raw
    boxes standing in for shoulders, hands or shoulders.
  · REAL PROPORTIONS. A shared humanoid skeleton with long legs, a real neck,
    shaped jaw, tapered upper arms/forearms, deltoids, elbows, wrists, proper
    fists, thighs, knees, calves and shoes with toe caps. Bigger heads for a
    readable silhouette, per-character build profiles for all four fighters.
  · DRAWING MATCHES THE HITBOX. The old build drew every fighter at 1.3x with no
    relation to its collision box, so weapons swept through heads without ever
    connecting. Fighters are now measured off the finished rig (buildDims) and
    scaled to fit inside the box the game collides against, hitboxes are bound to
    the posed frame (hitX/hitY), and Vector's data-blade EXTENDS through a swing
    so the plasma on screen is as long as the hitbox that lands.
  · ANIMATION PASS. Stride cycle with hip bob and torso lean, arc-following air
    poses, breathing idle with weight shift, a flinch/recoil pose for hitstun,
    weapon-arm guard so arms stop flailing, and per-character secondary motion:
    Kage's sash, Vector's coat tails + containment rings, Pulse's thrusters and
    spinning coils, Blip's halo and orbiting shards.
  · FEEL. Motion trails smeared along a blade's last two frames, a live weapon
    glow that lights the blade up when an attack is about to connect, per-fighter
    key light + face light, brighter neon rims, tighter/telephoto match camera
    (fov 41), tighter arena so the duel fills the frame.
  · GLOW-UP. Shields are character-specific (hex circuit panel, mecha curtain,
    star bubble). Pulse is no longer a recoloured Samus: sealed under-suit, chest
    reactor, layered pauldrons, swept-crest helmet, backpack thrusters and a
    three-barrel cannon on accelerator coils. Vector is a cyber-ronin with a
    plasma emitter and coat tails. Blip has a visible star-core, antenna, arc
    smile and a rocket gravity hammer. Kage keeps every piece of the original
    design pack and gains shoulder caps, a crowned hat, a jaw wrap and a knee.

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

  VECTOR, PULSE and BLIP are no longer placeholders. Each one has a full art pass
  (described above) and four tournament palettes cycled with C on the select screen:
    VECTOR  DEFAULT / CYBER SAKURA / SHOGUN GOLD / VOID SPECTER
    PULSE   DEFAULT / PHAZON COBALT / FUSION MAGENTA / STEALTH TITAN
    BLIP    DEFAULT / STARLIGHT PINK / MINT COMET / SOLAR NOVA
  KAGE.EXE keeps his seven-palette pack from the original design sheet.

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
    raster.py         renders it to PNG (four views per fighter, smooth-shaded)
    scene_raster.py   raycast-free software render of the live match scene
    roster-v1.png     v1 cast,  roster-v2.png v2 cast
    roster-v3.png     the V3 art pass (all four fighters, four views each)
    bigb-ingame.png   BIG-B captured in-game through the real game camera
    kage-costumes.png all seven KAGE.EXE palettes
    kage-costumes.png all seven KAGE.EXE palettes
  Usage:
    cd devtools && node harness.js            # full match test
    cd devtools && PLAN=kit node harness.js   # move-by-move test
    cd devtools && ALTS=1 node export.js kage geom.json   # then raster.py geom.json out.png
