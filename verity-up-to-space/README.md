# Verity Up To Space — game folder

This folder contains the original Verity Up To Space game build. It is now served as the **🚀 Game** tab of the combined site at the repo root (`index.html`). The site also includes the **👽 Verity** tab (3D alien webcam mirror) and the **💬 Prompt Verity** tab (chat with a local Ollama model).

## Game

- **Verity Up To Space** – an Angry Birds‑style gravity‑assist puzzle. Drag back from Earth to launch a probe, slingshot around the Moon / Mars / Jupiter, collect beacons, avoid hazards, and reach the green capture zone.
- **8 missions** with ratings (1★ capture, 2★ at least half the beacons, 3★ every beacon). Progress is saved in the browser.
- **Verity** the alien co‑pilot: a 3D alien head in an iframe who speaks pre‑recorded voice lines on game events and flies the optional tutorial (Mission 1). She has 57 voice lines (MP3s in `verity-up-to-space/verity/audio/`) and speaks when missions start, crashes, captures, and during the tutorial.
- **Tutorial**: on first visit a **MEET VERITY** card offers the tutorial (**▶ WATCH VERITY FLY** or **SKIP**); the **TUTORIAL** button in the top bar replays it. Verity flies mission 1 herself while 12 recorded tutorial lines explain it, with glowing markers on Earth, the target, beacons and the Moon. After the tutorial she glides to the bottom‑right corner, controls unlock and mission 1 starts for real.
- **Controls**:
  - Drag from Earth and release to launch.
  - Bottom aim bar: **ANGLE** and **Δv** sliders with ‹ › buttons for 0.1 steps (Shift‑click = 1.0), fuel left, the predicted outcome (capture, beacons, stars or crash), and buttons:
    - **AIM: QUICK / PRECISE** (`P`): precise mode doesn't launch on release; fine‑tune with arrow keys (Shift = 4×), then **LAUNCH** or `Space`.
    - **AUTOPILOT** (`A`): searches angle/power for the best route at the next launch window and flies it.
    - **RESET** (`R`, also **RESET PROBE** in the top bar): back to Earth; the last flight stays as a faint ghost path.
  - Predicted path: glowing dots ending in a green ring (capture), red ✕ (crash) or grey dot (miss); beacons it will collect light up cyan.
  - **CAM** button or `C` key cycles TOP / CHASE / ISO camera views.
  - Background music starts on the first click or key press. It fades down while Verity talks and is muffled (low-pass) while the Mission Log is open. **SFX ON/OFF** mutes it along with the sound effects and Verity.
  - Object names are hidden to reduce clutter; `L` toggles them.
  - Moons and some asteroids move (patrol routes are drawn as faint red dashed circles), so launch timing matters; the preview and autopilot account for it.
  - Click the mission panel (top left) to open the **Mission Log**: every mission's status and best stars. `Esc` closes it.

## Files

```
index.html              page markup (HUD, aim bar, sidebar, modals) + script tags
css/style.css           custom styles (layout utilities come from Tailwind)
js/config.js            constants, shared game state and NASA mission data
js/sound.js             synthesized sound effects
js/music.js             background music: loops assets/spaceverity.mp3, ducks while Verity talks, low-pass while the Mission Log is open
js/levels.js            the eight missions (edit here to change layouts)
js/world.js             coordinates, map edges, orbit movement, world <-> 3D conversion
js/physics.js           gravity, trajectory prediction, launch‑aim maths
js/planets.js           planet / Earth / relay station models, shaders and textures
js/scene.js             Three.js scene setup, level building, per‑frame sync
js/camera.js            TOP / CHASE / ISO cameras
js/progress.js          unlocks, best stars, level bar, mission log sidebar
js/verity.js            Verity the alien co‑pilot: sends her game events, shows her speech bubble
js/game.js              level loading, flight updates, launch, crash and victory
js/autopilot.js         launch‑window route search
js/ui.js                aim bar, sliders, buttons, modals, resize
js/input.js             mouse, touch and keyboard controls
js/tutorial.js          Verity's Mission 1 tutorial
js/main.js              main loop and start‑up (loaded last)
verity/                 Verity herself: 3D alien head + 57 voice lines (shown in an iframe)
assets/Voyager.glb      NASA Voyager model used for the probe (NASA's CDN is the fallback)
assets/spaceverity.mp3  background music (gapless loop, 56 s)
```

## Tutorial

On the first visit a **MEET VERITY** card offers the tutorial (**▶ WATCH VERITY FLY** or **SKIP**); the **TUTORIAL** button in the top bar replays it. Verity flies mission 1 herself while 12 recorded tutorial lines explain it, with glowing markers on what she's talking about:

1. Introduces herself.
2. **Earth**: launch by dragging backward like a slingshot.
3. **The target**: fly into the green ring gently to be captured.
4. **The beacons**: collect them all for three stars.
5. **The Moon**: it moves; fly close behind it for a free gravity assist.
6. Aims (the dotted prediction line appears), launches, and captures with all beacons. She comments on the slingshot if she gets one, and retries once if something goes wrong.
7. Hands over: "Your turn now", plus a tip about Autopilot.

Then Verity glides to the **bottom‑right corner** (smaller, above the mission bar, out of the way), the controls unlock and mission 1 starts for real. During the tutorial the player's controls are locked except the camera (`C`), labels (`L`) and sound; **SKIP** or `Esc` ends it early. Verity's demo capture doesn't count as a completed mission.

## Campaign

8 missions, each unlocked by completing the one before (progress is saved in the browser; **Reset Progress** is at the bottom of the Mission Log):

1. Lunar Slingshot: one moving moon
2. Mars Insertion: asteroid field
3. Venus Swing‑By: heavy planet, scattered debris
4. Asteroid Belt Run: thread a 6‑rock belt, two dwarf planets
5. The Grand Tour: Jupiter + orbiting Ganymede and Io
6. Saturn Ring Dive: ringed Saturn, two counter‑orbiting moons, ring debris
7. Ice Giant Relay: Uranus, Neptune, orbiting Triton and Titania
8. Heliopause Gauntlet: three giants, Titan and Io, 8 Kuiper objects, smallest dock

Rating: 1★ capture, 2★ at least half the beacons, 3★ every beacon. Beacons were placed along simulated winning paths, so every mission has a verified 3‑star shot.

## Changes from the original 2D build

- Physics run in a fixed 1600×900 world, so window size no longer changes trajectories.
- Gravity retuned: at full strength Earth's escape velocity (~149) dwarfed the max launch Δv (9.8), so every launch crashed. Earth is now a launch pad (`EARTH_GRAVITY_SCALE = 0`) and planets use `BODY_GRAVITY_SCALE = 0.025`.
- Probe launches from Earth's surface, not its centre.
- Trajectory preview is 1500 steps (`PREDICTION_STEPS`), uses the same map edges as the real flight, advances orbiting moons in lockstep with the flight, and stops at hazards.
- Fuel no longer carries over between missions.

## Site integration

This folder is served as the **🚀 Game** tab of the combined site. The site also provides:

- **👽 Verity** tab – 3D alien head with webcam mirror and voice settings (served from `alien-head-3d/`).
- **💬 Prompt Verity** tab – chat with Verity via a local Ollama model (`qwen2.5-coder:32b` at `http://127.0.0.1:11434/v1`). She replies in character and speaks the reply aloud; falls back to canned lines if Ollama is offline.

## Running locally

Serve the **repo root** over HTTP (browsers block Verity's voice and the Voyager model on `file://` pages):

- `python3 -m http.server 8000` from the repo root, then open `http://127.0.0.1:8000/` for the full site or `http://127.0.0.1:8000/verity-up-to-space/` for the game alone.
- Windows: double-click `Play Verity Up To Space.bat` in this folder to serve just the game.
- Docker: `docker build -t verity . && docker run -p 8080:80 verity`, then open `http://127.0.0.1:8080/`.

File names are case-sensitive on Linux servers: keep paths in lowercase (`verity/`, `js/verity.js`).