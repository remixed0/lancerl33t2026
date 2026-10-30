// Lagrange Hop 3D: Camera modes: TOP, CHASE and ISO.

// --- CAMERA RIG ---
function topDistance() {
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const dH = (WORLD_H / 2) / tanHalf;
  const dW = (WORLD_W / 2) / (tanHalf * camera.aspect);
  return Math.max(dH, dW) * 1.04;
}

function getCameraGoal() {
  const d = topDistance();
  if (camMode === 'CHASE' && gameState !== 'AIMING') {
    const p = toScene(probe.x, probe.y);
    const sp = Math.hypot(probe.vx, probe.vy);
    if (probe.alive && sp > 0.05) {
      chaseDir.lerp(new THREE.Vector3(probe.vx / sp, -probe.vy / sp, 0), 0.08).normalize();
    }
    return {
      pos: p.clone().addScaledVector(chaseDir, -170).add(new THREE.Vector3(0, 0, 95)),
      look: p.clone().addScaledVector(chaseDir, 140),
      up: new THREE.Vector3(0, 0, 1),
      rate: 6
    };
  }
  if (camMode === 'ISO' || camMode === 'CHASE') {
    // CHASE falls back to ISO framing while aiming
    const tilt = THREE.MathUtils.degToRad(52);
    const di = d * 1.08;
    return {
      pos: new THREE.Vector3(0, -di * Math.sin(tilt) - 60, di * Math.cos(tilt)),
      look: new THREE.Vector3(0, -60, 0),
      up: new THREE.Vector3(0, 0, 1),
      rate: 3.5
    };
  }
  return {
    pos: new THREE.Vector3(0, 0, d),
    look: new THREE.Vector3(0, 0, 0),
    up: new THREE.Vector3(0, 1, 0),
    rate: 3.5
  };
}

function snapCamera() {
  const goal = getCameraGoal();
  camera.position.copy(goal.pos);
  camera.up.copy(goal.up);
  camLook.copy(goal.look);
  camera.lookAt(camLook);
}

function updateCamera(dt) {
  const goal = getCameraGoal();
  const k = 1 - Math.exp(-dt * goal.rate);
  camera.position.lerp(goal.pos, k);
  camera.up.lerp(goal.up, k).normalize();
  camLook.lerp(goal.look, k);
  camera.lookAt(camLook);
}

function cycleCamera() {
  camMode = CAM_MODES[(CAM_MODES.indexOf(camMode) + 1) % CAM_MODES.length];
  document.getElementById('camLabel').textContent = `CAM: ${camMode}`;
}
