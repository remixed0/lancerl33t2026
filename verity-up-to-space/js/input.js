// Verity Up To Space 3D: Mouse, touch and keyboard input.

// --- INPUT EVENT HANDLING (MOUSE & TOUCH) ---
// Raycast the pointer onto the Z = 0 orbital plane and convert to world coordinates
function screenToWorld(clientX, clientY) {
  const ndc = new THREE.Vector2(
    (clientX / window.innerWidth) * 2 - 1,
    -(clientY / window.innerHeight) * 2 + 1
  );
  raycaster.setFromCamera(ndc, camera);
  const hit = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(orbitalPlane, hit)) return null;
  return { x: hit.x + WORLD_W / 2, y: -hit.y + WORLD_H / 2 };
}

function handlePointerDown(clientX, clientY) {
  sfx.init();
  if (gameState !== 'AIMING' || tutorial.active) return; // Verity is flying during the tutorial

  const w = screenToWorld(clientX, clientY);
  if (!w) return;
  const earthPos = getCoords(currentLevel.earth);
  const dist = Math.hypot(w.x - earthPos.x, w.y - earthPos.y);

  // Start drag if clicking reasonably near Earth
  if (dist <= currentLevel.earth.radius * 2.5) {
    cancelAutopilot();
    isAiming = true;
    setAimFromPoint(w);
  }
}

function handlePointerMove(clientX, clientY) {
  if (!isAiming) return;
  const w = screenToWorld(clientX, clientY);
  if (!w) return;
  setAimFromPoint(w);
}

function handlePointerUp() {
  if (!isAiming) return;
  isAiming = false;
  // Quick mode launches on release; precise mode waits for LAUNCH / Space
  if (!precise) launch();
}


// Mouse Listeners (down on the canvas so HUD clicks never start a drag)
canvas.addEventListener('mousedown', (e) => handlePointerDown(e.clientX, e.clientY));
window.addEventListener('mousemove', (e) => handlePointerMove(e.clientX, e.clientY));
window.addEventListener('mouseup', handlePointerUp);

// Touch Listeners
canvas.addEventListener('touchstart', (e) => {
  if (e.touches.length > 0) {
    handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
  }
}, { passive: false });

window.addEventListener('touchmove', (e) => {
  if (e.touches.length > 0 && isAiming) {
    e.preventDefault();
    handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
  }
}, { passive: false });

window.addEventListener('touchend', handlePointerUp);

window.addEventListener('keydown', (e) => {
  const k = e.key;
  // During the tutorial Verity is flying: only Esc (skip), C (camera) and L (labels) work
  if (tutorial.active) {
    if (k === 'Escape') tutorial.skip();
    else if (k === 'c' || k === 'C') cycleCamera();
    else if (k === 'l' || k === 'L') document.body.classList.toggle('show-labels');
    return;
  }
  // A focused slider already handles arrows itself, and a focused button handles Space/Enter
  const tag = e.target.tagName;
  // Typing in a text box (the AI chat) must not trigger game shortcuts
  if (tag === 'TEXTAREA' || e.target.isContentEditable || (tag === 'INPUT' && e.target.type !== 'range')) return;
  if (tag === 'INPUT' && k.startsWith('Arrow')) return;
  if (tag === 'BUTTON' && (k === ' ' || k === 'Enter')) return;
  const step = e.shiftKey ? 4 : 1;
  const canTune = gameState === 'AIMING' && aim.set;
  if (k === 'c' || k === 'C') cycleCamera();
  else if (k === 'l' || k === 'L') document.body.classList.toggle('show-labels');
  else if (k === ' ' || k === 'Enter') { e.preventDefault(); sfx.init(); if (!autopilot) launch(); }
  // Arrow keys fine-tune the aim: left/right = 0.1° (screen counter-clockwise / clockwise), up/down = 0.1 km/s
  else if (k === 'ArrowLeft' && canTune) { e.preventDefault(); cancelAutopilot(); aim.angle -= 0.1 * step * Math.PI / 180; }
  else if (k === 'ArrowRight' && canTune) { e.preventDefault(); cancelAutopilot(); aim.angle += 0.1 * step * Math.PI / 180; }
  else if (k === 'ArrowUp' && canTune) { e.preventDefault(); cancelAutopilot(); aim.power = Math.min(1, aim.power + POWER_STEP * step); }
  else if (k === 'ArrowDown' && canTune) { e.preventDefault(); cancelAutopilot(); aim.power = Math.max(MIN_AIM_POWER, aim.power - POWER_STEP * step); }
  else if (k === 'p' || k === 'P') togglePrecise();
  else if (k === 'a' || k === 'A') { sfx.init(); autopilot ? cancelAutopilot() : startAutopilot(); }
  else if (k === 'r' || k === 'R') resetFromUi();
});
