# Alien Head 3D

A 3D alien head that copies your face. Turn on your webcam and it blinks, smiles, frowns, raises its brow ridges, opens its mouth, puckers, puffs its cheeks and turns its head when you do. Its antennae wobble when you move and glow a different color for each mood (happy, surprised, grumpy, sad, kissy, wink, puffed up).

It also **talks** in a high-pitched voice: it greets you, reacts out loud to your expressions ("Ooh, a smile!"), and says anything you type into the box. Its mouth moves with the words.

No camera? It runs a demo of its expressions and follows your mouse.

The project also contains **Alien Assistant**: the same alien, embedded as a widget that lives in the corner of a page and comments out loud on what you do. Open `assistant.html` for its demo page, or click **🤖 Assistant demo** on the main page.

## Run it

Plain HTML, CSS and JavaScript. No install and no build step.

Browsers only allow the camera on `https://` pages or on `localhost`, so:

- **GitHub Pages (easiest to share):** repo → **Settings** → **Pages** → deploy from the `main` branch, `/ (root)`. Open the link it gives you.
- **VS Code:** install the **Live Server** extension, right-click `index.html` → **Open with Live Server**.
- **Double-click `index.html`:** the demo always works. Chrome usually allows the camera from a local file too; if it doesn't, use one of the options above.

`assistant.html` needs no camera and works the same way.

Click **Start camera** and allow access. The first time, the face tracker downloads about 13 MB.

## Controls

| Button | What it does |
| --- | --- |
| **Start / Stop camera** | Turns face tracking on or off |
| **Mirror** | On: the alien acts like your reflection (wink your left eye, its eye on the left closes). Off: it faces you like another person would |
| **Preview** | Shows your camera picture in the corner |
| **Voice: on / off** | Mutes or unmutes the alien |
| **Voice settings** | Voice engine, ElevenLabs key and voice, pitch, speed, volume, and whether it reacts to your expressions |
| **Speak** | The alien says whatever you typed (up to 300 characters) |

## The voice

- **ElevenLabs** (natural voices, uses your ElevenLabs credits): create an API key at elevenlabs.io → *Developers → API Keys* (a key limited to Text to Speech is safest) and paste it into **Voice settings**. Your voices load into the list. The key is saved only in your browser and sent only to ElevenLabs. **Never put the key in the code or commit it to GitHub.**
- **Browser voice** (free): used when there is no ElevenLabs key.
- **High pitch:** ElevenLabs has no pitch control, so the page asks it for slower speech and plays it back faster, which raises the pitch while keeping your chosen speed.
- **Lip sync:** the mouth follows the loudness of the ElevenLabs audio. The browser voice can't be measured, so the mouth just flaps while it talks.
- Each line is generated once per voice setting and reused, so repeated reactions don't cost extra credits.

## Privacy

Your video never leaves your computer. Face tracking runs inside the browser with WebAssembly. The page only downloads the tracking library and model; it never uploads anything.

## Alien Assistant

`assistant.html` is a demo page for the widget version of the same alien. The little alien sits in the corner, watches what you do and comments out loud: clicks, form fields, scrolling, copying, idling, leaving the tab and coming back, rage clicks and page errors. It never reads what you type, only which field you used, and it ignores password fields.

### Add it to any page

Copy the `assistant/` folder next to your page and add one tag before `</body>`:

```html
<script src="assistant/alien-assistant.js" defer></script>
```

It loads three.js from a CDN and reuses this project's `js/alien-head.js` and `js/voice.js`, so there is only one copy of the head and the voice code. Your page's scripts can make it talk too:

```js
AlienAssistant.say('Your order is on its way!', 'happy'); // moods: happy, surprised, sad, wink, angry
AlienAssistant.openSettings();
```

### Settings (the ⚙ next to the alien)

- **Speak out loud** and **Show speech bubbles** (either one alone works too: bubbles only, or voice only)
- **How chatty:** Quiet (only important things), Normal, or Chatty
- **React when I…** clicks, typing, scrolling and copying, idling and leaving the tab
- **Character:** 👽 Squeaky alien, ⚔️ Warrior alien (Klingon-style, deep voice with a growl), 🤖 Robot alien, or Custom
- **Voice engine, ElevenLabs API key, Voice, Effect, Pitch, Speed, Volume**
- **Corner:** bottom right or bottom left

The 🔊 button mutes it, and the − button hides it (a small 👽 button brings it back). Everything works with the keyboard; **Esc** closes the settings. Settings are remembered in your browser under the `alienAssistant` key; the voice settings are shared with the main page (`alienHeadVoice`).

## How it works

- **Face tracking (`js/face-tracker.js`)**: [MediaPipe Face Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker) gives 52 expression scores per frame (`eyeBlinkLeft`, `mouthSmileRight`, `jawOpen`, `browInnerUp`, ...) plus a head-pose matrix. Instead of trusting which side "Left" means, it checks the blink scores against how open each eye actually is in the picture.
- **Mapping (`js/main.js`)**: turns those scores into the alien's expression channels and head turn, flipping sides for mirror mode, and picks a mood from them.
- **The alien (`js/alien-head.js`)**: built from [three.js](https://threejs.org) shapes. The skull is a stretched sphere, the eyes are squashed to blink, and the lips are rebuilt every frame from the expression. Everything is smoothed so it moves naturally.
- **The assistant (`assistant/alien-assistant.js`)**: injects its own corner widget, lazily loads three.js, `js/alien-head.js` and `js/voice.js`, then listens for clicks, focus changes, form submits, scrolling, copy events, idle/visibility changes, rage clicks and `window.onerror`. It speaks through the same `AlienVoice` API and stores its own display preferences.

## Project structure

```
index.html                webcam app: page and buttons
assistant.html            Alien Assistant demo page
css/style.css             webcam app styles
css/demo.css              assistant demo page styles
js/alien-head.js          the 3D alien and its expressions (shared by both pages)
js/face-tracker.js        webcam + MediaPipe face tracking
js/voice.js               the alien's voice (ElevenLabs or browser speech) and lip sync (shared)
js/main.js                scene, demo mode, face-to-alien mapping, reactions
assistant/alien-assistant.js   the widget: loader, reactions, settings panel
assistant/alien-assistant.css  widget styles (all scoped to .aa-root)
```

Both pages use the same `js/alien-head.js` and `js/voice.js`; the widget loads them itself with relative `../js/` URLs.
