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
| Pick mission | Mission buttons | `1` `2` `3` |
| Sound on/off | **SFX** button | `M` |

## Missions

1. **Lunar Slingshot**: Swing behind the moving Moon to more than double your speed (2.16x on the best route).
2. **Mars Insertion**: Thread an asteroid field, including a drifting rock, and arrive slowly enough for Mars to capture you.
3. **The Grand Tour**: Jupiter bends everything. Steal speed from Ganymede (1.75x) to reach Europa Base.

Stars: 1 for any capture, 2 for half the beacons or good fuel, 3 for every beacon **and** the fuel goal. On missions 1 and 3 the fuel goal is only reachable with a gravity assist.

## How it works

- **Physics (`js/physics.js`)**: Every planet and moon pulls the probe with acceleration = mass / distance², softened near the center. A fixed time step (1/120 s, semi-implicit Euler) keeps every run deterministic, so the prediction and the real flight match exactly.
- **Real gravity assists**: A still planet gives back exactly the speed you gain falling in. A *moving* moon can hand you some of its own speed. The "slingshot" number is speed leaving a moon's zone divided by speed entering it.
- **3D engine (`js/engine3d.js`)**: A small engine written for this project, with no libraries: an orbit camera, perspective projection, mouse picking on the orbital plane, and flat-shaded meshes (asteroids, beacons, the probe, the station).
- **Planets (`js/planets.js`)**: Surfaces are generated from 3D noise at load time (oceans, clouds, Jupiter's bands and Great Red Spot). Every frame, each planet is ray-cast pixel by pixel and lit by the Sun, so you see them rotate with day and night sides.
- **Spacetime grid**: The grid under the board sinks into a well under every mass (depth follows the gravitational potential), so you can see why paths bend.
- **Sound (`js/sound.js`)**: Synthesized live with the Web Audio API. No audio files.

## Level checker

```
node tools/check-levels.js
```

For each mission this flies the autopilot route and checks it gets 3 stars, checks the route still works with the aim half a degree off, and scans thousands of launches at several moon positions to make sure there is always a way to win. GitHub runs it automatically on every push (see `.github/workflows/check-levels.yml`). If you edit `js/levels.js`, run it before committing.

## Project structure

```
index.html              page layout and HUD
css/style.css           styles
js/physics.js           gravity, flight steps, collisions, scoring (runs in Node too)
js/levels.js            the three missions
js/engine3d.js          camera, projection, meshes
js/planets.js           procedural planet textures and sphere renderer
js/sound.js             sound effects
js/game.js              game loop, input, rendering, HUD
tools/check-levels.js   proves every mission is beatable
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
