# BIG-B // SMASH ULTIMATE-STYLE FIGHTER
A work-in-progress platform fighter inspired by Super Smash Bros. Ultimate, starring our original character: **BIG-B (Kage.EXE)**.

Built in pure HTML5 Canvas + vanilla JavaScript — no frameworks, no build step required. Runs 100% client-side, just open `index.html` in a browser.

---

## Project Structure (GitHub Ready)
```
bigb-smash/
├── index.html              # Main game shell (final engine entry)
├── bigb-lab.html           # Character lab / move viewer / design tool
├── README.md               # This file
├── src/                    # Core source code (modular files, split for safety)
│   ├── bigb.js             # BIG-B character rig, renderer, palettes, FX system
│   ├── moves.js            # Full moveset data, frame data, pose keyframes
│   ├── smoke.js            # Smoke / particle system
│   ├── svgshot.js          # Screenshot / debug utilities
│   ├── animation-data.json # Original exported move timing data
│   └── shell.html          # Lab UI shell
└── assets/                 # All reference art / character assets
    ├── character.png       # Main 3D character reference
    ├── moves/              # Screenshots of every core move (lab captures)
    ├── moves-art/          # Promo art for Final Smash / Special moves
    ├── alts/               # Alternate costume skins (8 total):
    │   ├── alt-02-oni-crimson.jpg
    │   ├── alt-03-ghost-protocol.jpg
    │   ├── alt-04-acid-matrix.jpg
    │   ├── alt-06-static-glitch.jpg
    │   ├── alt-07-blood-moon.jpg
    │   └── alt-08-prototype-zero.jpg
    └── rig/                # Rig reference (muscle / bone breakdown)
```

---

## Character: BIG-B (Kage.EXE)
**Archetype:** Balanced sword/gun hybrid — mix of Shulk / Joker / Mii Gunner
- Katana + Revolver weapon set
- Cyberpunk / cowboy techwear aesthetic, LED mask
- 8 alternate costumes including Blood Moon, Ghost Protocol, Acid Matrix, Prototype Zero, Oni Crimson, Static Glitch
- Glitch / cyber / neon visual effects, afterimages, energy slashes

## Current Implemented Moveset
### Ground Moves
- Jab, Ftilt, Dash Attack, FSmash
- Derived (planned): Utilt, Dtilt, USmash, DSmash

### Aerials
- Nair, Dair (meteor spike)
- Derived (planned): Fair, Bair, Uair

### Specials
- **Neutral B: Trick Shot** (revolver ricochet shots)
- **Side B: Blink Fang** (teleport dash slash)
- **Up B: Ghost Line** (tether recovery / upward slash)
- **Down B: Parry / Firewall Counter**

### Other
- Jump, Double Jump
- Taunt
- **Final Smash: Neon Blade Overload** (full screen katana slash, glitch burst)
- Planned: Grab + Throws, Shield, Air Dodge, Ledge Mechanics

---

## Technical Notes
- Rendering: Canvas 2D, DPR-aware, procedural vector drawing (no sprite sheets yet)
- Physics: Percent-based knockback, hitstun, coyote time
- FX: Particle system, afterimages, energy trails, screen shake
- Frame data: Stored per-move in ms, converted to 60fps frames
- No external dependencies — works offline
