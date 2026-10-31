// Verity Up To Space 3D: Verity, the alien co-pilot. She lives in verity/ (shown in an iframe in the bottom bar)
// and speaks pre-recorded lines only when game events happen. game.js, autopilot.js and ui.js call Verity.event(...).

const Verity = (() => {
  const frame = document.getElementById('verityFrame');
  const bubble = document.getElementById('verityBubble');
  const queue = []; // events sent before Verity has loaded
  let ready = false;
  let hideTimer = 0;
  let quiet = false;      // the tutorial switches off Verity's normal comments while it runs
  const waiting = [];     // { group, resolve } for line() calls waiting for a line to finish
  let readyResolve;
  const readyPromise = new Promise((r) => { readyResolve = r; });

  function send(msg) {
    msg.type = 'Verity';
    if (ready && frame && frame.contentWindow) frame.contentWindow.postMessage(msg, '*');
    else queue.push(msg);
  }

  function hideBubble(delay) {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => bubble.classList.remove('show'), delay);
  }

  window.addEventListener('message', (ev) => {
    if (!frame || ev.source !== frame.contentWindow) return;
    const d = ev.data || {};
    if (d.type === 'Verity-ready') {
      ready = true;
      send({ event: 'mute', muted: !sfx.enabled });
      queue.splice(0).forEach(send);
      readyResolve();
    } else if (d.type === 'Verity-line') {
      bubble.textContent = d.text;
      bubble.classList.add('show');
      hideBubble(Math.max(4000, d.text.length * 75) + 4000); // fallback if 'Verity-done' never comes
      music.duck(true, Math.max(4000, d.text.length * 75) + 2000); // same kind of fallback for the music
    } else if (d.type === 'Verity-done') {
      hideBubble(1500);
      music.duck(false);
      for (let i = waiting.length - 1; i >= 0; i--) {
        if (waiting[i].group === d.group) waiting.splice(i, 1)[0].resolve(true);
      }
    }
  });

  // Browsers block sound until the first click or key press; let Verity know once that happens
  ['pointerdown', 'keydown', 'touchstart'].forEach((type) => {
    window.addEventListener(type, () => send({ event: 'unlock' }), { passive: true });
  });

  // Idle: the player has been sitting at the launch pad for a while
  let lastInput = performance.now();
  let idleSaid = false;
  ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'].forEach((type) => {
    window.addEventListener(type, () => { lastInput = performance.now(); idleSaid = false; }, { passive: true });
  });
  setInterval(() => {
    const modalOpen = !document.getElementById('victoryModal').classList.contains('hidden') ||
      !document.getElementById('manualModal').classList.contains('hidden');
    if (!idleSaid && !quiet && gameState === 'AIMING' && !autopilot && !modalOpen && !document.hidden &&
        performance.now() - lastInput > 45000) {
      idleSaid = true;
      send({ event: 'idle' });
    }
  }, 2000);

  return {
    /** Tell Verity something happened, e.g. Verity.event('crash', { body: 'Moon' }). Ignored while quiet. */
    event(name, detail) { if (!quiet) send(Object.assign({ event: name }, detail || {})); },
    mute(muted) { send({ event: 'mute', muted }); },
    /** Say one specific line now; resolves when it has finished (or after a safety timeout). */
    line(group, timeoutMs = 15000) {
      return new Promise((resolve) => {
        const entry = { group, resolve };
        waiting.push(entry);
        setTimeout(() => { const i = waiting.indexOf(entry); if (i >= 0) { waiting.splice(i, 1); resolve(false); } }, timeoutMs);
        send({ event: 'line', group });
      });
    },
    stop() { send({ event: 'stop' }); hideBubble(0); music.duck(false); },
    set quiet(v) { quiet = !!v; },
    get quiet() { return quiet; },
    ready: readyPromise
  };
})();
