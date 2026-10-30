// Lagrange Hop 3D: Main loop and start-up (loaded last).

// --- MAIN TICK LOOP ---
let lastTime = performance.now();
function gameLoop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  updateAutopilot();
  updateGame(dt);
  syncScene(now, dt);
  updateAimPanel();
  updateCamera(dt);
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);

  requestAnimationFrame(gameLoop);
}

// Initialize Game on Load
window.onload = function () {
  initScene();
  loadProgress();
  loadLevel(progress.unlocked); // resume at the furthest unlocked mission
  requestAnimationFrame(gameLoop);
};
