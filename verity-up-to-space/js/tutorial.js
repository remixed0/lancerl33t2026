// Verity Up To Space 3D: Tutorial. Verity flies mission 1 himself while explaining it (recorded lines,
// glowing markers on Earth, the target, the beacons and the Moon), then glides to the
// bottom-right corner and hands mission 1 to the player. Offered on the first visit;
// the TUTORIAL button replays it. Esc or SKIP ends it early.

const tutorial = (() => {
  const SEEN_KEY = 'lagrangeHopTutorialSeen';
  const dock = document.getElementById('verityDock');
  const card = document.getElementById('tutorialCard');
  const bar = document.getElementById('tutorialBar');
  const layer = document.getElementById('tutorialMarks');
  let active = false;
  let runId = 0;
  let returnTo = 0;
  let marks = [];
  let captured = false;

  function seen() { try { return localStorage.getItem(SEEN_KEY) === '1'; } catch (e) { return false; } }
  function markSeen() { try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* storage off */ } }

  // --- Glowing markers that follow things in the 3D scene ---
  function point(targets) {
    layer.textContent = '';
    marks = targets.map((t) => {
      const el = document.createElement('div');
      el.className = 'tut-mark';
      el.style.setProperty('--size', (t.size || 70) + 'px');
      const label = document.createElement('span');
      label.textContent = t.label;
      el.append(label);
      layer.append(el);
      return { el, get: t.get };
    });
  }
  function placeMarks() {
    if (!active) return;
    requestAnimationFrame(placeMarks);
    marks.forEach((m) => {
      const p = m.get();
      const v = toScene(p.x, p.y).project(camera);
      const x = (v.x + 1) / 2 * window.innerWidth;
      const y = (1 - v.y) / 2 * window.innerHeight;
      m.el.style.transform = `translate(${x}px, ${y}px)`;
    });
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const current = (id) => active && runId === id; // false once skipped or restarted

  // Wait until check() returns something truthy (or time runs out / the tutorial ends)
  async function until(check, timeoutMs, id) {
    const end = performance.now() + timeoutMs;
    while (current(id) && performance.now() < end) {
      const v = check();
      if (v) return v;
      await sleep(100);
    }
    return null;
  }

  async function say(group, id) {
    await Verity.line(group);
    return current(id);
  }

  // --- The tutorial ---
  async function start() {
    if (active) return;
    card.classList.add('hidden');
    const id = ++runId;
    active = true;
    captured = false;
    Verity.quiet = true;
    returnTo = currentLevelIndex;
    sfx.init();
    document.body.classList.add('tutorial');
    dock.classList.add('Verity-tutorial');
    bar.classList.remove('hidden');
    document.getElementById('victoryModal').classList.add('hidden');
    document.getElementById('manualModal').classList.add('hidden');
    loadLevel(0);
    placeMarks();
    await Verity.ready;

    const moon = () => currentLevel.bodies.find((b) => b.name === 'Moon') || currentLevel.bodies[0];
    if (!await say('tut_intro', id)) return;
    point([{ label: 'EARTH', size: 96, get: () => getCoords(currentLevel.earth) }]);
    if (!await say('tut_earth', id)) return;
    point([{ label: 'TARGET', size: 120, get: () => getCoords(currentLevel.target) }]);
    if (!await say('tut_target', id)) return;
    point(currentLevel.beacons.map((b, i) => ({ label: 'BEACON ' + (i + 1), size: 54, get: () => getCoords(b) })));
    if (!await say('tut_beacons', id)) return;
    point([{ label: 'MOON', size: 80, get: () => getBodyPos(moon()) }]);
    if (!await say('tut_moon', id)) return;
    point([]);

    for (let attempt = 0; attempt < 2 && current(id); attempt++) {
      captured = false;
      resetProbeToEarth();
      probe.trail = [];
      ghostTrail = [];
      startAutopilot(); // Verity uses the autopilot: it finds a 3-star route and launches at the next window
      if (attempt === 0 && !await say('tut_aim', id)) return;
      if (!await until(() => gameState === 'FLYING', 40000, id)) { if (current(id)) break; return; }

      let launchLineDone = false;
      Verity.line('tut_launch').then(() => { launchLineDone = true; });
      let assistSaid = false;
      const result = await until(() => {
        if (!assistSaid && launchLineDone && gameState === 'FLYING' && maxBoostMultiplier >= 1.15) {
          assistSaid = true;
          Verity.line('tut_assist');
        }
        if (captured) return 'CAPTURED';
        if (gameState === 'CRASHED' || gameState === 'LOST') return gameState;
        return null;
      }, 60000, id);
      if (!current(id)) return;

      if (result === 'CAPTURED') {
        await sleep(900);
        if (!await say('tut_win', id)) return;
        if (!await say('tut_help', id)) return;
        finish();
        return;
      }
      if (attempt === 0 && !await say('tut_retry', id)) return;
    }
    finish();
  }

  // Back to normal play: Verity glides to the bottom-right corner, the player gets their mission
  function finish() {
    if (!active) return;
    active = false;
    runId++;
    markSeen();
    point([]);
    cancelAutopilot();
    Verity.quiet = false;
    document.body.classList.remove('tutorial');
    bar.classList.add('hidden');
    dock.classList.remove('Verity-tutorial');
    document.getElementById('victoryModal').classList.add('hidden');
    probe.trail = [];
    ghostTrail = [];
    loadLevel(returnTo); // Verity gives that mission's briefing
  }

  function skip() {
    if (!active) return;
    Verity.stop();
    finish();
    Verity.line('tut_skip');
  }

  // Called by triggerVictory() while the tutorial runs: Verity's capture doesn't count as a completed mission
  function onCapture() { captured = true; }

  // --- First visit: offer the tutorial ---
  if (!seen()) Verity.quiet = true; // keep the opening briefing for after the choice
  window.addEventListener('load', () => {
    if (!seen()) card.classList.remove('hidden');
  });
  document.getElementById('tutStartBtn').addEventListener('click', start);
  document.getElementById('tutSkipBtn').addEventListener('click', () => {
    card.classList.add('hidden');
    markSeen();
    Verity.quiet = false;
    Verity.event('mission', { number: currentLevelIndex + 1 });
  });
  document.getElementById('tutBarSkip').addEventListener('click', skip);
  document.getElementById('btnTutorial').addEventListener('click', start);

  return {
    start, skip, onCapture,
    get active() { return active; }
  };
})();
