# Lagrange Hop — single-file 3D build

Angry Birds-style gravity-assist puzzle. Drag back from Earth to launch a probe, slingshot around the Moon / Mars / Jupiter, collect beacons, avoid hazards, and reach the green capture zone.

- `index.html` — Three.js (r128) 3D version. Open it in a browser; no build step.
- `lagrange_hop_2d_original.html` — the original 2D Canvas version, kept for reference.
- `assets/Voyager.glb` — NASA's real Voyager spacecraft model, used for the probe (NASA's CDN is the fallback).

## File layout
Plain HTML, CSS and JavaScript: no modules, imports or build tools. The scripts are normal `<script>` tags that share global variables, so **the load order in `index.html` matters**: each file can use anything defined by the files above it.

```
index.html          page markup (HUD, aim bar, sidebar, modals) + script tags
css/style.css       custom styles (layout utilities come from Tailwind)
js/config.js        constants (gravity, world size, launch limits), shared game state and NASA mission data
js/sound.js         synthesized sound effects
js/levels.js        the 8 missions (edit here to change layouts)
js/world.js         coordinates, map edges, orbit movement, world <-> 3D conversion
js/physics.js       gravity, trajectory prediction, launch-aim maths
js/planets.js       planet / Earth / relay station models, shaders and textures
js/scene.js         Three.js scene setup, level building, per-frame sync
js/camera.js        TOP / CHASE / ISO cameras
js/progress.js      unlocks, best stars, level bar, mission log sidebar
js/bob.js           Bob the alien co-pilot: sends him game events, shows his speech bubble
js/game.js          level loading, flight updates, launch, crash and victory
js/autopilot.js     launch-window route search
js/ui.js            aim bar, sliders, buttons, modals, resize
js/input.js         mouse, touch and keyboard
js/tutorial.js      tutorial: Bob flies mission 1 while explaining it
js/main.js          main loop and start-up (loaded last)
bob/                Bob himself: 3D alien head + 57 voice lines (shown in an iframe)
assets/Voyager.glb  NASA Voyager model used for the probe
```

## Tutorial
On the first visit a **MEET BOB** card offers the tutorial (**▶ WATCH BOB FLY** or **SKIP**); the **TUTORIAL** button in the top bar replays it. Bob, bigger in the bottom-left corner, flies mission 1 himself while 12 recorded tutorial lines explain it, with glowing markers on what he's talking about:

1. Introduces himself.
2. **Earth**: launch by dragging backward like a slingshot.
3. **The target**: fly into the green ring gently to be captured.
4. **The beacons**: collect them all for three stars.
5. **The Moon**: it moves; fly close behind it for a free gravity assist.
6. Aims (the dotted prediction line appears), launches, and captures with all beacons. He comments on the slingshot if he gets one, and retries once if something goes wrong.
7. Hands over: "Your turn now", plus a tip about Autopilot.

Then Bob glides to the **bottom-right corner** (smaller, above the mission bar, out of the way), the controls unlock and mission 1 starts for real. During the tutorial the player's controls are locked except the camera (`C`), labels (`L`) and sound; **SKIP** or `Esc` ends it early. Bob's demo capture doesn't count as a completed mission.

## Bob, the alien co-pilot
A 3D alien head in the bottom-right corner, above the mission bar. He has no buttons and takes no input: he floats, blinks and looks around, and **speaks only when something happens in the game**, playing a pre-recorded MP3 (`bob/audio/`) with his mouth moving, a matching face and a speech bubble:

| Game event | Bob says |
| --- | --- |
| A mission loads | that mission's briefing (missions 1-8) |
| Crash into Earth, the Moon, Mars, Venus, Jupiter, Saturn or Neptune | a line about that body |
| Crash into any other body | a general planet crash line |
| Hit an asteroid or debris | a hazard line |
| Probe drifts off the map | a lost-in-space line |
| 3rd crash in a row (and every other one after) | a streak line |
| Launch (now and then) | a launch line |
| Autopilot starts | an autopilot line |
| Mission captured (1-2★ / 3★) | a victory line / a 3-star line |
| Mission 8 captured | the finale |
| Sitting at the launch pad for 45 s | an idle line |

The **SFX** button mutes his voice too (the speech bubble still shows). Browsers allow sound only after the first click, so a briefing that loads before then is replayed on that click. The game calls `bob.event(...)` from `js/game.js` and `js/autopilot.js`; `js/bob.js` passes it to `bob/` with `postMessage`. Bob's source project: https://github.com/imatsko-pcc/alien-head-3d

## AI co-pilot
The **🤖 AI** button opens a chat panel wired to a local Ollama model (`qwen2.5-coder:32b` at `http://127.0.0.1:11434/v1`). Ask it about the current mission, gravity assists or the NASA mission data in `js/config.js`. If Ollama is not running, the panel reports that the co-pilot is offline and the game keeps working normally.

## Controls
- Drag from Earth and release to launch.
- Bottom aim bar: **ANGLE** and **Δv sliders** with ‹ › buttons for 0.1 steps (Shift-click = 1.0), fuel left, the predicted outcome (capture, beacons, stars or crash), and buttons:
  - **AIM: QUICK / PRECISE** (`P`): precise mode doesn't launch on release; fine-tune with arrow keys (Shift = 4×), then **LAUNCH** or `Space`.
  - **AUTOPILOT** (`A`): searches angle/power for the best route at the next launch window and flies it.
  - **RESET** (`R`, also **RESET PROBE** in the top bar): back to Earth; the last flight stays as a faint ghost path.
- Predicted path: glowing dots ending in a green ring (capture), red ✕ (crash) or grey dot (miss); beacons it will collect light up cyan.
- **CAM** button or `C` key cycles TOP / CHASE / ISO camera views.
- Object names are hidden to reduce clutter; `L` toggles them.
- Moons and some asteroids move (patrol routes are drawn as faint red dashed circles), so launch timing matters; the preview and autopilot account for it.
- Click the mission panel (top left) to open the **Mission Log**: every mission's status and best stars. `Esc` closes it.

## Campaign
8 missions, each unlocked by completing the one before (progress is saved in the browser; **Reset Progress** is at the bottom of the Mission Log):

1. Lunar Slingshot: one moving moon
2. Mars Insertion: asteroid field
3. Venus Swing-By: heavy planet, scattered debris
4. Asteroid Belt Run: thread a 6-rock belt, two dwarf planets
5. The Grand Tour: Jupiter + orbiting Ganymede and Io
6. Saturn Ring Dive: ringed Saturn, two counter-orbiting moons, ring debris
7. Ice Giant Relay: Uranus, Neptune, orbiting Triton and Titania
8. Heliopause Gauntlet: three giants, Titan and Io, 8 Kuiper objects, smallest dock

Rating: 1★ capture, 2★ at least half the beacons, 3★ every beacon. Beacons were placed along simulated winning paths, so every mission has a verified 3-star shot.

## Changes from the 2D original
- Physics run in a fixed 1600×900 world, so window size no longer changes trajectories.
- Gravity retuned: at full strength Earth's escape velocity (~149) dwarfed the max launch Δv (9.8), so every launch crashed. Earth is now a launch pad (`EARTH_GRAVITY_SCALE = 0`) and planets use `BODY_GRAVITY_SCALE = 0.025`.
- Probe launches from Earth's surface, not its centre.
- Trajectory preview is 1500 steps (`PREDICTION_STEPS`), uses the same map edges as the real flight, advances orbiting moons in lockstep with the flight, and stops at hazards.
- Fuel no longer carries over between missions.
