// Verity Up To Space 3D: Game flow: loading levels, flight updates, launching, crashes and victory.

// --- INITIALIZATION ---
function loadLevel(idx) {
  idx = Math.min(Math.max(0, idx), LEVELS.length - 1);
  if (!isUnlocked(idx)) return;
  currentLevelIndex = idx;
  const rawLvl = LEVELS[currentLevelIndex];
  // Clone deeply to allow modifications (e.g. collected beacons, dynamic orbits)
  currentLevel = JSON.parse(JSON.stringify(rawLvl));

  document.getElementById('levelTitle').textContent = currentLevel.title;
  document.getElementById('missionCounter').textContent = `${currentLevelIndex + 1} / ${LEVELS.length}`;
  document.getElementById('hintText').textContent = currentLevel.hint;

  renderLevelBar();
  renderMissionLog();
  buildLevelScene();
  cancelAutopilot();
  aim = { set: false, angle: 0, power: 0 };
  probe.trail = [];
  ghostTrail = [];
  resetProbeToEarth();
  document.getElementById('victoryModal').classList.add('hidden');
  Verity.event('mission', { number: currentLevelIndex + 1 });
}

function resetProbeToEarth() {
  const earthPos = getCoords(currentLevel.earth);
  // Keep the last flight as a faint ghost path; the aim is kept so the shot can be tweaked
  if (probe.trail.length > 1) ghostTrail = probe.trail;
  probe.x = earthPos.x;
  probe.y = earthPos.y;
  probe.vx = 0;
  probe.vy = 0;
  probe.trail = [];
  probe.alive = true;
  probe.fuelSpent = 0;
  flightTimer = 0;
  maxBoostMultiplier = 1.0;
  launchDeltaVUsed = 0;
  gameState = 'AIMING';
  isAiming = false;

  // Reset beacons collected for this attempt
  currentLevel.beacons.forEach(b => b.collected = false);

  updateTelemetryUI();
}

// --- PARTICLES & FX ---
function spawnThrustParticles(x, y, vx, vy, count = 3, color = '#38bdf8') {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x,
      y: y,
      vx: -vx * 0.4 + (Math.random() - 0.5) * 1.5,
      vy: -vy * 0.4 + (Math.random() - 0.5) * 1.5,
      size: Math.random() * 2.8 + 1.2,
      life: 1.0,
      decay: Math.random() * 0.04 + 0.02,
      color: color
    });
  }
}

function spawnExplosion(x, y, color = '#f97316') {
  for (let i = 0; i < 35; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 4.5 + 0.8;
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: Math.random() * 3.5 + 1.5,
      life: 1.0,
      decay: Math.random() * 0.025 + 0.015,
      color: i % 2 === 0 ? color : '#fde047'
    });
  }
}

function spawnCaptureRipples(x, y) {
  for (let i = 0; i < 25; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3.0 + 1.0;
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: Math.random() * 2.5 + 1,
      life: 1.0,
      decay: 0.02,
      color: '#34d399'
    });
  }
}

// --- GAME LOOP & UPDATES ---
function updateGame(dt) {
  tickCount++;
  // 1. Orbit animation for moons and patrolling asteroids
  advanceOrbits(1);

  // 2. Flight Dynamics
  if (gameState === 'FLYING' && probe.alive) {
    flightTimer += dt;

    // Gravity calculation
    const grav = calculateGravityAt(probe.x, probe.y);
    const prevSpeed = Math.hypot(probe.vx, probe.vy);

    probe.vx += grav.ax * TIME_STEP;
    probe.vy += grav.ay * TIME_STEP;
    probe.x += probe.vx * TIME_STEP;
    probe.y += probe.vy * TIME_STEP;

    const currentSpeed = Math.hypot(probe.vx, probe.vy);

    // Detect Slingshot Velocity Gain
    if (currentSpeed > prevSpeed + 0.04 && grav.closestBody && grav.minDistanceToBody < grav.closestBody.radius * 3.8) {
      const ratio = (currentSpeed / (launchDeltaVUsed || 1));
      if (ratio > maxBoostMultiplier) {
        maxBoostMultiplier = parseFloat(ratio.toFixed(2));
        sfx.playGravityBoost();
        spawnThrustParticles(probe.x, probe.y, probe.vx, probe.vy, 4, '#a855f7');
      }
    }

    // Add to historical trail
    probe.trail.push({ x: probe.x, y: probe.y });
    if (probe.trail.length > probe.maxTrail) {
      probe.trail.shift();
    }

    // Engine exhaust glow
    if (Math.random() > 0.4) {
      spawnThrustParticles(probe.x, probe.y, probe.vx, probe.vy, 1, '#38bdf8');
    }

    // Check Beacon Collections
    currentLevel.beacons.forEach(beacon => {
      if (!beacon.collected) {
        const bPos = getCoords(beacon);
        if (Math.hypot(probe.x - bPos.x, probe.y - bPos.y) < probe.radius + 14) {
          beacon.collected = true;
          sfx.playBeacon();
          spawnCaptureRipples(bPos.x, bPos.y);
        }
      }
    });

    // Check Collision: Earth
    const earthPos = getCoords(currentLevel.earth);
    if (Math.hypot(probe.x - earthPos.x, probe.y - earthPos.y) <= currentLevel.earth.radius) {
      triggerCrash("Probe crashed into Earth's atmosphere.", { body: 'Earth' });
    }

    // Check Collision: Planets
    currentLevel.bodies.forEach(b => {
      const bPos = getBodyPos(b);
      if (Math.hypot(probe.x - bPos.x, probe.y - bPos.y) <= b.radius) {
        triggerCrash(`Surface impact on ${b.name}!`, { body: b.name });
      }
    });

    // Check Collision: Hazards (Asteroids/Debris)
    currentLevel.hazards.forEach(hz => {
      const hzPos = getBodyPos(hz);
      if (Math.hypot(probe.x - hzPos.x, probe.y - hzPos.y) <= hz.radius + probe.radius) {
        triggerCrash(`Destroyed by collision with ${hz.name}!`, { hazard: true, body: hz.name });
      }
    });

    // Check Target Orbital Capture
    const tgtPos = getCoords(currentLevel.target);
    const distToTarget = Math.hypot(probe.x - tgtPos.x, probe.y - tgtPos.y);

    if (distToTarget <= currentLevel.target.captureRadius) {
      // If speed is not excessively hypersonic, captured!
      if (currentSpeed < 14) {
        triggerVictory();
      } else {
        // Speed too high to enter stable orbit
        document.getElementById('hintText').textContent = "Hyperbolic escape velocity! Speed too high for orbital capture.";
      }
    }

    // Check Out of Bounds
    if (isOutOfBounds(probe.x, probe.y)) {
      triggerLost("Deep space drift. Probe lost into the cosmic void.");
    }

    updateTelemetryUI();
  }

  // 3. Update particle dynamics
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= p.decay;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function triggerCrash(reason, what) {
  const first = probe.alive; // several collisions can register in the same frame; Verity comments once
  probe.alive = false;
  gameState = 'CRASHED';
  sfx.playCrash();
  spawnExplosion(probe.x, probe.y, '#ef4444');
  document.getElementById('hintText').textContent = `CRITICAL FAILURE: ${reason} Press RESET (R) to retry.`;
  if (first) Verity.event(what && what.hazard ? 'hazard' : 'crash', what);
}

function triggerLost(reason) {
  const first = probe.alive;
  probe.alive = false;
  gameState = 'LOST';
  document.getElementById('hintText').textContent = reason + " Press RESET (R) to aim again.";
  if (first) Verity.event('lost');
}

function triggerVictory() {
  const first = probe.alive;
  if (tutorial.active) {
    // Verity's demo flight: celebrate, but don't score or unlock anything
    gameState = 'CAPTURED';
    probe.alive = false;
    sfx.playVictory();
    const tp = getCoords(currentLevel.target);
    spawnCaptureRipples(tp.x, tp.y);
    tutorial.onCapture();
    return;
  }
  gameState = 'CAPTURED';
  probe.alive = false;
  sfx.playVictory();
  const tgtPos = getCoords(currentLevel.target);
  spawnCaptureRipples(tgtPos.x, tgtPos.y);

  // Score Calculation
  const beaconsCollected = currentLevel.beacons.filter(b => b.collected).length;
  const totalBeacons = currentLevel.beacons.length;
  const fuelRemainingPct = Math.max(0, Math.round(100 - (launchDeltaVUsed / MAX_DELTA_V) * 100));

  // 1 star: capture. 2 stars: at least half the beacons. 3 stars: every beacon.
  let starsCount = 1;
  if (beaconsCollected >= Math.ceil(totalBeacons / 2)) starsCount = 2;
  if (beaconsCollected === totalBeacons) starsCount = 3;

  const wasUnlocked = progress.unlocked;
  recordCompletion(starsCount);
  const isLast = currentLevelIndex === LEVELS.length - 1;
  const nextBtn = document.getElementById('modalNextBtn');
  nextBtn.textContent = isLast ? 'MISSION LOG' : 'NEXT MISSION';
  let desc = 'Telemetry confirms safe insertion into target orbital capture envelope.';
  if (isLast) desc = `All ${LEVELS.length} missions complete. You reached the edge of the solar system!`;
  else if (progress.unlocked > wasUnlocked) desc += ` Mission ${String(currentLevelIndex + 2).padStart(2, '0')} unlocked.`;
  document.getElementById('victoryDesc').textContent = desc;

  document.getElementById('metricTime').textContent = `${flightTimer.toFixed(1)}s`;
  document.getElementById('metricFuel').textContent = `${fuelRemainingPct}% fuel left`;
  document.getElementById('metricBoost').textContent = `${maxBoostMultiplier.toFixed(2)}x Multiplier`;
  document.getElementById('metricBeacons').textContent = `${beaconsCollected} / ${totalBeacons}`;

  let starIcons = '';
  for (let s = 0; s < 3; s++) {
    starIcons += s < starsCount ? '★' : '<span class="text-slate-700">★</span>';
  }
  document.getElementById('starContainer').innerHTML = starIcons;

  document.getElementById('victoryModal').classList.remove('hidden');
  if (first) {
    if (isLast) Verity.event('finale');
    else Verity.event('victory', { stars: starsCount });
  }
}

function updateTelemetryUI() {
  const curSpeed = (Math.hypot(probe.vx, probe.vy) * 2.8).toFixed(1);
  document.getElementById('telemetrySpeed').textContent = `${curSpeed} km/s`;
  document.getElementById('telemetryBoost').textContent = `${maxBoostMultiplier.toFixed(1)}x`;

  const fuelSpentFraction = Math.min(1, launchDeltaVUsed / MAX_DELTA_V);
  const fuelPercent = Math.max(0, Math.round((1 - fuelSpentFraction) * 100));
  document.getElementById('fuelBar').style.width = `${fuelPercent}%`;
  document.getElementById('fuelVal').textContent = `${fuelPercent}%`;

  const collected = currentLevel.beacons.filter(b => b.collected).length;
  document.getElementById('telemetryTokens').textContent = `${collected} / ${currentLevel.beacons.length}`;
}

function launch(byAutopilot) {
  if (gameState !== 'AIMING' || !aim.set) return;
  const av = getAimVector();
  const lp = getLaunchPoint(av.angle);
  probe.x = lp.x;
  probe.y = lp.y;
  probe.vx = av.vx;
  probe.vy = av.vy;
  probe.trail = [{ x: probe.x, y: probe.y }];
  probe.alive = true;
  launchDeltaVUsed = av.thrustPower;
  chaseDir.set(av.vx, -av.vy, 0).normalize();

  gameState = 'FLYING';
  sfx.playLaunch();
  spawnThrustParticles(probe.x, probe.y, probe.vx, probe.vy, 18, '#38bdf8');
  document.getElementById('hintText').textContent = "Probe in flight! Monitoring orbital telemetry & gravitational forces...";
  if (!byAutopilot) Verity.event('launch'); // Verity already commented when the autopilot started
}
