# Verity Up To Space

A combined site with three tabbed sections:

- **🚀 Game** – Verity Up To Space, a gravity‑assist puzzle game. Drag back from Earth to launch a probe, slingshot around the Moon / Mars / Jupiter, collect beacons, avoid hazards, and reach the green capture zone. Eight missions with ratings (1★ capture, 2★ at least half the beacons, 3★ every beacon). Verity the alien co‑pilot speaks pre‑recorded lines on game events and flies the optional tutorial.

- **👽 Verity** – A 3D alien head that copies your facial expressions through your webcam. Turn on your webcam and she blinks, smiles, frowns, raises her brow ridges, opens her mouth, puckers, puffs her cheeks and turns her head when you do. Her antennae wobble when you move and glow a different color for each mood. She also talks: greets you, reacts to expressions, and says anything you type. No camera? She runs a demo of her expressions and follows your mouse.

- **💬 Prompt Verity** – Open a chat panel that asks a local Ollama model (`qwen2.5-coder:32b` at `http://127.0.0.1:11434/v1`) for an in‑character reply, then speaks it aloud. If Ollama is not running, Verity replies with a canned line. The chat remembers a short history and stays in character (playful, cosmic, encouraging, concise, 1‑3 short sentences). You can ask about the game, slingshots, NASA data, or anything else.

## Server

The site is served by nginx:

- **Port 8080** – `verity-up-to-space/` – the game.
- **Port 8081** – `alien-head-3d/` – Verity and the Prompt Verity tab.

Open `http://127.0.0.1:8080/` for the game, or `http://127.0.0.1:8081/` for the Verity site.

## Quick start

1. Double‑click `index.html` (repo root) – the tabbed site opens in your browser.
2. Click the **🚀 Game** tab to play Verity Up To Space.
3. Click the **👽 Verity** tab to see the 3D alien mirror and open voice settings.
4. Click the **💬 Prompt Verity** tab to chat with Verity via Ollama.

## Files

```
index.html                tabbed site shell (Game / Verity / Prompt Verity)
css/style.css             shared site styles
site/prompt.js            Prompt Verity chat + Ollama API
site/site.css             tab and chat layout styles
verity-up-to-space/       legacy Verity Up To Space build (game only)
alien-head-3d/            3D alien head + webcam mirror + assistant widget
```

## Controls (Game)

- Drag from Earth and release to launch.
- Bottom aim bar: **ANGLE** and **Δv** sliders with ‹ › buttons for 0.1 steps (Shift‑click = 1.0), fuel left, the predicted outcome (capture, beacons, stars or crash), and buttons:
  - **AIM: QUICK / PRECISE** (`P`): precise mode doesn't launch on release; fine‑tune with arrow keys (Shift = 4×), then **LAUNCH** or `Space`.
  - **AUTOPILOT** (`A`): searches angle/power for the best route at the next launch window and flies it.
  - **RESET** (`R`): back to Earth; the last flight stays as a faint ghost path.
- Predicted path: glowing dots ending in a green ring (capture), red ✕ (crash) or grey dot (miss); beacons it will collect light up cyan.
- **CAM** button or `C` key cycles TOP / CHASE / ISO camera views.
- Object names are hidden to reduce clutter; `L` toggles them.
- Moons and some asteroids move (patrol routes are drawn as faint red dashed circles), so launch timing matters; the preview and autopilot account for it.
- Click the mission panel (top left) to open the **Mission Log**: every mission's status and best stars. `Esc` closes it.

## Controls (Verity)

- **Start / Stop camera** – turns face tracking on or off.
- **Mirror** – On: alien acts like your reflection; Off: faces you like another person would.
- **Preview** – Shows your camera picture in the corner.
- **Voice: on / off** – Mutes or unmutes Verity.
- **Voice settings** – Voice engine, ElevenLabs key and voice, pitch, speed, volume, and whether she reacts to your expressions.
- **Speak** – Verity says whatever you typed (up to 300 characters).

## Controls (Prompt Verity)

- Type a prompt in the input field and press **SEND**.
- Verity sends the prompt to the local Ollama model and displays her reply.
- If Ollama is offline, she replies with a canned line.
- Press **✕** to close the chat and return to the Verity tab.

## Tutorial (Game)

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
5. The Grand Tour: Jupiter + orbiting Ganymede
6. Saturn Ring Dive: ringed Saturn, two counter‑orbiting moons, ring debris
7. Ice Giant Relay: Uranus, Neptune, orbiting Triton
8. Heliopause Gauntlet: three giants, Io, 8 Kuiper objects, smallest dock

Rating: 1★ capture, 2★ at least half the beacons, 3★ every beacon. Beacons were placed along simulated winning paths, so every mission has a verified 3‑star shot.

## Changes from the original 2D build

- Physics run in a fixed 1600×900 world, so window size no longer changes trajectories.
- Gravity retuned: at full strength Earth's escape velocity (~149) dwarfed the max launch Δv (9.8), so every launch crashed. Earth is now a launch pad (`EARTH_GRAVITY_SCALE = 0`) and planets use `BODY_GRAVITY_SCALE = 0.025`.
- Probe launches from Earth's surface, not its centre.
- Trajectory preview is 600 steps, advances orbiting moons in lockstep with the flight, and stops at hazards.
- Fuel no longer carries over between missions.