# CLAUDE.md

Context for Claude Code sessions working on this repo (shared between contributors).

## What this is
A static site (LancerHacks 2026), no build step, plain HTML/CSS/JS:
- `index.html` + `site/` — tabbed shell: 🚀 Game / 👽 Verity / 💬 Prompt Verity. `site/prompt.js` lazy-loads the iframes and runs the Prompt Verity chat.
- `verity-up-to-space/` — the game (formerly "Lagrange Hop", folder `lagrange-hop-single/`). Gravity-assist puzzle, 8 missions, Three.js r128 from CDN.
  - `verity/` — the co-pilot alien (formerly "Bob") in an iframe: `js/lines.js` (57 lines) ↔ `audio/*.mp3`.
  - Scripts are classic `<script>` tags sharing globals; **load order in `index.html` matters**.
- `alien-head-3d/` — Verity webcam mirror + Alien Assistant widget (the old `assistant.html` demo is now the 🧪 Playground drawer).
- `lines.csv` — voice-line script; every row must match a file in `verity-up-to-space/verity/audio/` and the text in `lines.js`.

## Conventions
- **Paths are case-sensitive in production (Linux/nginx).** macOS hides case bugs. Keep file and folder names lowercase (`verity/`, `js/verity.js`) and references identical. The global object is `Verity`; CSS classes are `Verity-dock` / `Verity-bubble` / `Verity-tutorial` and message types `'Verity'`, `'Verity-ready'`, `'Verity-line'`, `'Verity-done'`. They are consistent, so leave them as they are.
- Verity is **she/her** in UI text, comments and docs.
- Don't name a top-level variable `history`, `location`, `name`, etc. in page scripts (`site/prompt.js` once shadowed `window.history` and broke the tabs; the chat array is `chatHistory`).
- Physics is plain JS (`calculateGravityAt` in `js/physics.js`). The old "JoltPhysics" code was dead and its CDN package 404'd; it was removed, so don't re-add it.
- "Lost in space" margin is one constant, `LOST_MARGIN` / `isOutOfBounds()` in `js/world.js`, shared by the flight and the preview.
- Level data (`js/levels.js`): moons take position from `orbitCenter` + `orbitRadius` + `angle`, and their `x`/`y` equals the orbit centre. `patrol()` rocks circle their own `x`/`y`. Planet looks in `js/planets.js` `PLANET_STYLES` are keyed by body **name**, so renaming a body means renaming its style entry too.
- Reset wording everywhere: **RESET** / **RESET PROBE**, key `R`.

## Deploy / test
- `Dockerfile`: nginx:1.27-alpine, explicit `COPY` of `index.html`, `site/`, `verity-up-to-space/`, `alien-head-3d/`, port 80. `.dockerignore` strips docs, launchers and dev files. Run with `docker build -t verity . && docker run -p 8080:80 verity`.
- Local: `python3 -m http.server 8000` from the repo root.
- Before pushing, test on a **case-sensitive** server serving only the files the Dockerfile copies, and load `/` in a browser. Check the game loads, `Verity.ready` resolves, all three tabs work, there are no 404s and no uncaught errors. A plain `http.server` on macOS won't catch case bugs.
- Production needs HTTPS (webcam). The AI chats call Ollama at `http://127.0.0.1:11434` on the *visitor's* machine, so most visitors get offline/canned replies. That is expected.

## Branch state (2026-10-30)
- `lagrange-hop-single-file` has everything on `main` + `add-docker` (incl. fb15541), plus the Voyager centring fix, game/layout fixes and production fixes. PR open into `main`.
- `add-docker` (remote) = `main` = fb15541. Local `stash@{0}` on remixed0's machine is obsolete; its `prompt.js` change would break the tabs.

## Known open items
- `verity/audio/tut_intro.mp3` still says "I'm Bob" while the subtitle says "I'm Verity". It needs re-recording.
- Verity's `mission_8` line says "a moving moon" (there are two) and the Saturn crash line mentions rings (ring debris actually triggers the hazard line). Both are audio, so the text can't change without re-recording.
- Docker image not yet built and tested (daemon wasn't running).
- Not visually verified: Voyager nose direction (`js/scene.js` `mountVoyager`), and whether Verity's dock (bottom-right) covers Mission 7's target on small screens.
