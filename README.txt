NEON CLASH 3D — v1.0
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

ROSTER
  MARIO      all-rounder. Bouncing Fireball, Super Jump Punch, spinning double jump,
             highest jump in the game.
  LINK       greatsword zoner. Longest melee reach with visible slash arcs,
             Hero's Bow, Spin Attack recovery.
  SAMUS      gunner. Every normal fires the arm cannon; hold G to charge a
             Charge Shot (up to 20%), Screw Attack recovery.
  KIRBY      floaty. Six jumps, Hammer (18%, hardest single hit),
             Final Cutter with a landing shockwave.
  GRENINJA   ninja. Throws Water Shuriken with its normals, fastest runner,
             steerable Hydro Pump recovery.
  LITTLE MAC boxer. Fastest hands on the floor, Smash Hook on G that becomes the
             24% KO PUNCH once the gold meter fills. Rising Uppercut recovery.
