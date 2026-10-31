# Verity — Alien Head 3D

A 3D alien head that copies your face through your webcam. She blinks, smiles, frowns, raises her brow ridges, opens her mouth, puckers, puffs her cheeks and turns her head when you do. Her antennae wobble when you move and glow a different color for each mood (happy, surprised, grumpy, sad, kissy, wink, puffed up).

She also **talks** in a high-pitched voice: she greets you, reacts out loud to your expressions ("Ooh, a smile!"), and says anything you type into the box. Her mouth moves with the words.

## Pages

This repository now serves a **single tabbed site** at the repo root (`index.html`) with three sections:

- **🚀 Game** – Verity Up To Space, a gravity‑assist puzzle game (8 missions, Verity co‑pilot, tutorial).
- **👽 Verity** – The 3D alien webcam mirror (face tracking, expressions, voice settings).
- **💬 Prompt Verity** – Chat with Verity via a local Ollama model (`qwen2.5-coder:32b` at `http://127.0.0.1:11434/v1`). She replies in character and speaks the reply aloud. Falls back to canned lines if Ollama is offline.

## Run it

- **GitHub Pages (easiest to share):** repo → **Settings** → **Pages** → deploy from the `main` branch, `/ (root)`. Open the link it gives you.
- **VS Code:** install the **Live Server** extension, right‑click `index.html` → **Open with Live Server**.
- **Double‑click `index.html`:** the site always works. Chrome usually allows the camera from a local file; if not, use one of the options above.

`assistant.html` (moved into the new site as the **Prompt Verity** tab) needs no camera and works the same way.

## Controls

| Button | What it does |
| --- | --- |
| **Start / Stop camera** | Turns face tracking on or off |
| **Mirror** | On: the alien acts like your reflection (wink your left eye, its eye on the left closes). Off: it faces you like another person would |
| **Preview** | Shows your camera picture in the corner |
| **Voice: on / off** | Mutes or unmutes Verity |
| **Voice settings** | Voice engine, ElevenLabs key and voice, pitch, speed, volume, and whether she reacts to your expressions |
| **Speak** | Verity says whatever you typed (up to 300 characters) |

## The voice

- **ElevenLabs** (natural voices, uses your ElevenLabs credits): create an API key at elevenlabs.io → *Developers → API Keys* (a key limited to Text to Speech is safest) and paste it into **Voice settings**. Your voices load into the list. The key is saved only in your browser and sent only to ElevenLabs. **Never put the key in the code or commit it to GitHub.**
- **Browser voice** (free): used when there is no ElevenLabs key.
- **High pitch:** ElevenLabs has no pitch control, so the page asks for slower speech and plays it back faster, which raises the pitch while keeping your chosen speed.
- **Lip sync:** the mouth follows the loudness of the ElevenLabs audio. The browser voice can't be measured, so the mouth just flaps while it talks.
- Each line is generated once per voice setting and reused, so repeated reactions don't cost extra credits.

## Privacy

Your video never leaves your computer. Face tracking runs inside the browser with WebAssembly. The page only downloads the tracking library and model; it never uploads anything.

## How it works

- **Face tracking (`js/face-tracker.js`)**: [MediaPipe Face Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker) gives 52 expression scores per frame (`eyeBlinkLeft`, `mouthSmileRight`, `jawOpen`, `browInnerUp`, ...) plus a head‑pose matrix. Instead of trusting which side "Left" means, it checks the blink scores against how open each eye actually is in the picture.
- **Mapping (`js/main.js`)**: turns those scores into Verity's expression channels and head turn, flipping sides for mirror mode, and picks a mood from them.
- **The alien (`js/alien-head.js`)**: built from [three.js](https://threejs.org) shapes. The skull is a stretched sphere, the eyes are squashed to blink, and the lips are rebuilt every frame from the expression. Everything is smoothed so it moves naturally.
- **The assistant (`assistant/alien-assistant.js`)**: injects its own corner widget, lazily loads three.js, `js/alien-head.js` and `js/voice.js`, then listens for clicks, focus changes, form submits, scrolling, copy events, idle/visibility changes, rage clicks and `window.onerror`. It speaks through the same `AlienVoice` API and stores its own display preferences.

## Project structure

```
index.html                tabbed site shell (Game / Verity / Prompt Verity)
css/style.css             shared site styles
site/prompt.js            Prompt Verity chat + Ollama API
site/site.css             tab and chat layout styles
js/alien-head.js          the 3D alien and its expressions (shared by both pages)
js/face-tracker.js        webcam + MediaPipe face tracking
js/voice.js               the alien's voice (ElevenLabs or browser speech) and lip sync (shared)
js/main.js                scene, demo mode, face‑to‑alien mapping, reactions
assistant/alien-assistant.js   the widget: loader, reactions, settings panel
assistant/alien-assistant.css  widget styles (all scoped to .aa-root)
```

Both pages use the same `js/alien-head.js` and `js/voice.js`; the widget loads them itself with relative `../js/` URLs.