# Lagrange Hop 3D

**A 3D gravity-assist puzzle.** Launch a space probe from Earth, slingshot around moving moons, collect science beacons, and slide into orbit at your target using as little fuel as possible.

The glowing dotted line predicts your exact future path. It is computed with the same N-body physics as the real flight, including where the moons *will be*, so it shifts every moment as they orbit. Finding the right moment to launch is part of the puzzle, just like real launch windows.

Built for a space-themed hackathon (October 2026).

## Run it

No install and no build step. It is plain HTML, CSS and JavaScript.

- **Quickest:** double-click `index.html`. It opens in your browser.
- **In VS Code:** open this folder (*File → Open Folder*), install the **Live Server** extension (VS Code will suggest it), then right-click `index.html` → **Open with Live Server**. The page reloads every time you save.
- **Any terminal:** `python3 -m http.server 8000`, then open http://localhost:8000

Works on desktop and phones (touch to aim, drag to rotate, pinch to zoom).

## Controls

| Action | Mouse / touch | Keyboard |
| --- | --- | --- |
| Aim and launch | Press on Earth, drag backward, release | |
| Rotate camera | Drag empty space | |
| Zoom | Scroll / pinch | |
| Precise aim mode | **AIM** button | `P`, then arrows to fine-tune (Shift = bigger steps), `Space` to launch |
| Autopilot (flies a 3-star route) | **AUTOPILOT** button | `A` |
| Top / 3D view | **3D VIEW** button | `V` |
| Time warp 1x / 2x / 4x | **WARP** button | `W` |
| Reset probe | **RESET** button | `R` |
| Pick mission | Mission buttons | `1`–`8` |
| Tutorial (Bob flies Mission 1) | **TUTORIAL** button | |
| AI co-pilot chat | **🤖 AI** button | |
| Sound on/off | **SFX** button | `M` |

## Missions

1. **Lunar Slingshot**: swing behind the moving Moon to reach the Deep Space Relay.
2. **Mars Insertion**: thread an asteroid field and arrive slowly enough for Mars to capture you.
3. **Venus Swing-by**: use Venus to bend a steep climb toward the Mercury transfer orbit.
4. **Asteroid Belt Run**: thread a gap in the main belt, using Vesta and Ceres to steer.
5. **The Grand Tour**: double assist between Jupiter and Ganymede to reach Europa.
6. **Saturn Ring Dive**: dive past Saturn's ring debris while Titan and Enceladus tug at your path.
7. **Ice Giant Relay**: chain assists off Uranus and Neptune to reach the Kuiper Gateway.
8. **Heliopause Gauntlet**: three giants, a moving moon and a crowded debris field guard the edge of the solar system.

Stars: 1 for any capture, 2 for half the beacons, 3 for every beacon.

## How it works

- **Physics (`js/physics.js`)**: gravity, flight steps, collisions and scoring. Planet and moon pull is softened near the centre, and a fixed time step keeps runs deterministic so the prediction and the real flight match.
- **Jolt physics (`js/physics.js`)**: the JoltPhysics.js WebAssembly build is initialised for rigid-body simulation, with a gravity fallback when WASM is unavailable.
- **3D engine (`js/scene.js`, `js/camera.js`, `js/world.js`)**: Three.js renders the scene, orbit camera, CSS2D labels and the flight trail.
- **Planets (`js/planets.js`)**: procedural surfaces and lighting for Earth, the Moon and the other bodies.
- **NASA data**: `js/config.js` carries public NASA mission metadata, and the probe uses NASA's real Voyager 3D model (`assets/Voyager.glb`, with NASA's CDN as a fallback).
- **Bob the co-pilot (`js/bob.js`, `js/tutorial.js`, `bob/`)**: a 3D alien head in an iframe who speaks recorded lines on game events and flies the optional Mission 1 tutorial.
- **AI co-pilot (`js/ui.js`)**: an optional chat panel that talks to a local Ollama model about the mission, slingshots and NASA data.
- **Sound (`js/sound.js`)**: synthesized live with the Web Audio API. No audio files.

## Project structure

```
index.html              page layout and HUD
css/style.css           styles
js/config.js            constants, shared state and NASA mission data
js/physics.js           gravity, flight steps, collisions, scoring
js/levels.js            the eight missions
js/world.js             world <-> scene coordinate helpers
js/scene.js             Three.js scene, Voyager model, probe and effects
js/camera.js            orbit camera
js/planets.js           procedural planet surfaces
js/sound.js             synthesized sound effects
js/game.js              game loop, collisions, scoring, HUD
js/autopilot.js         route search and autopilot flight
js/ui.js                HUD wiring and AI co-pilot chat
js/input.js             mouse, touch and keyboard controls
js/bob.js               Bob event bridge (iframe messaging)
js/tutorial.js          Bob's Mission 1 tutorial
js/progress.js          unlocks and saved progress
js/main.js              boot
bob/                    Bob: 3D alien head, voice lines and audio
assets/Voyager.glb      NASA Voyager model (local copy)
```

## Put it on GitHub

**From VS Code (easiest):**

1. Open the folder in VS Code.
2. Click the **Source Control** icon in the left bar (the branching icon).
3. Click **Publish to GitHub**, sign in if asked, and choose **public** (judges need to see it).
4. VS Code creates the repo, makes the first commit, and pushes it.

**From a terminal:**

```
git init
git add .
git commit -m "Lagrange Hop 3D"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/lagrange-hop-3d.git
git push -u origin main
```

(Create the empty repo on github.com first, without a README.)

## Get a live link (GitHub Pages)

1. On GitHub, open the repo → **Settings** → **Pages**.
2. Under *Build and deployment*, set **Source** to *Deploy from a branch*, pick **main** and **/ (root)**, and click **Save**.
3. After about a minute your game is live at `https://YOUR-USERNAME.github.io/lagrange-hop-3d/`. Put that link on Devpost.
