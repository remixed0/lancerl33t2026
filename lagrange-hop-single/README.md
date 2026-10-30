# Lagrange Hop — single-file 3D build

Angry Birds-style gravity-assist puzzle. Drag back from Earth to launch a probe, slingshot around the Moon / Mars / Jupiter, collect beacons, avoid hazards, and reach the green capture zone.

- `index.html` — Three.js (r128) 3D version. Open it in a browser; no build step.
- `lagrange_hop_2d_original.html` — the original 2D Canvas version, kept for reference.

## Controls
- Drag from Earth and release to launch.
- **CAM** button or `C` key cycles TOP / CHASE / ISO camera views.

## Changes from the 2D original
- Physics run in a fixed 1600×900 world, so window size no longer changes trajectories.
- Gravity retuned: at full strength Earth's escape velocity (~149) dwarfed the max launch Δv (9.8), so every launch crashed. Earth is now a launch pad (`EARTH_GRAVITY_SCALE = 0`) and planets use `BODY_GRAVITY_SCALE = 0.025`.
- Probe launches from Earth's surface, not its centre.
- Trajectory preview is 600 steps, advances orbiting moons in lockstep with the flight, and stops at hazards.
- Fuel no longer carries over between missions.

## Known issue
Beacon/planet layouts were designed for the old gravity; at the new strength a full 3-star run (all beacons) may not be reachable. Levels need retuning.
