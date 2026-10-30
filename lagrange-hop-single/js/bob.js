// Lagrange Hop 3D: Bob, the alien co-pilot. He lives in bob/ (shown in an iframe in the bottom bar)
// and speaks pre-recorded lines only when game events happen. game.js, autopilot.js and ui.js call bob.event(...).

const bob = (() => {
  const frame = document.getElementById('bobFrame');
  const bubble = document.getElementById('bobBubble');
  const queue = []; // events sent before Bob has loaded
  let ready = false;
  let hideTimer = 0;

  function send(msg) {
    msg.type = 'bob';
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
    if (d.type === 'bob-ready') {
      ready = true;
      send({ event: 'mute', muted: !sfx.enabled });
      queue.splice(0).forEach(send);
    } else if (d.type === 'bob-line') {
      bubble.textContent = d.text;
      bubble.classList.add('show');
      hideBubble(Math.max(4000, d.text.length * 75) + 4000); // fallback if 'bob-done' never comes
    } else if (d.type === 'bob-done') {
      hideBubble(1500);
    }
  });

  // Browsers block sound until the first click or key press; let Bob know once that happens
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
    if (!idleSaid && gameState === 'AIMING' && !autopilot && !modalOpen && !document.hidden &&
        performance.now() - lastInput > 45000) {
      idleSaid = true;
      send({ event: 'idle' });
    }
  }, 2000);

  return {
    /** Tell Bob something happened, e.g. bob.event('crash', { body: 'Moon' }). */
    event(name, detail) { send(Object.assign({ event: name }, detail || {})); },
    mute(muted) { send({ event: 'mute', muted }); }
  };
})();
