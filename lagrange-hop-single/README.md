# Lagrange Hop — single-file 3D build

Angry Birds-style gravity-assist puzzle. Drag back from Earth to launch a probe, slingshot around the Moon / Mars / Jupiter, collect beacons, avoid hazards, and reach the green capture zone.

- `index.html` — Three.js (r128) 3D version. Open it in a browser; no build step.
- `lagrange_hop_2d_original.html` — the original 2D Canvas version, kept for reference.

## File layout
Plain HTML, CSS and JavaScript: no modules, imports or build tools. The scripts are normal `<script>` tags that share global variables, so **the load order in `index.html` matters**: each file can use anything defined by the files above it.

```
index.html          page markup (HUD, aim bar, sidebar, modals) + script tags
css/style.css       custom styles (layout utilities come from Tailwind)
js/config.js        constants (gravity, world size, launch limits) and shared game state
js/sound.js         synthesized sound effects
js/levels.js        the 8 missions (edit here to change layouts)
js/world.js         coordinates, orbit movement, world <-> 3D conversion
js/physics.js       gravity, trajectory prediction, launch-aim maths
js/planets.js       planet / Earth / relay station models, shaders and textures
js/scene.js         Three.js scene setup, level building, per-frame sync
js/camera.js        TOP / CHASE / ISO cameras
js/progress.js      unlocks, best stars, level bar, mission log sidebar
js/game.js          level loading, flight updates, launch, crash and victory
js/autopilot.js     launch-window route search
js/ui.js            aim bar, sliders, buttons, modals, resize
js/input.js         mouse, touch and keyboard
js/main.js          main loop and start-up (loaded last)
```

## Controls
- Drag from Earth and release to launch.
- Bottom aim bar: **ANGLE** and **Δv sliders** with ‹ › buttons for 0.1 steps (Shift-click = 1.0), fuel left, the predicted outcome (capture, beacons, stars or crash), and buttons:
  - **AIM: QUICK / PRECISE** (`P`): precise mode doesn't launch on release; fine-tune with arrow keys (Shift = 4×), then **LAUNCH** or `Space`.
  - **AUTOPILOT** (`A`): searches angle/power for the best route at the next launch window and flies it.
  - **RESET** (`R`): back to Earth; the last flight stays as a faint ghost path.
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
5. The Grand Tour: Jupiter + orbiting Ganymede
6. Saturn Ring Dive: ringed Saturn, two counter-orbiting moons, ring debris
7. Ice Giant Relay: Uranus, Neptune, orbiting Triton
8. Heliopause Gauntlet: three giants, Io, 8 Kuiper objects, smallest dock

Rating: 1★ capture, 2★ at least half the beacons, 3★ every beacon. Beacons were placed along simulated winning paths, so every mission has a verified 3-star shot.

## Changes from the 2D original
- Physics run in a fixed 1600×900 world, so window size no longer changes trajectories.
- Gravity retuned: at full strength Earth's escape velocity (~149) dwarfed the max launch Δv (9.8), so every launch crashed. Earth is now a launch pad (`EARTH_GRAVITY_SCALE = 0`) and planets use `BODY_GRAVITY_SCALE = 0.025`.
- Probe launches from Earth's surface, not its centre.
- Trajectory preview is 600 steps, advances orbiting moons in lockstep with the flight, and stops at hazards.
- Fuel no longer carries over between missions.
