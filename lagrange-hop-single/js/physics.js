// Lagrange Hop 3D: N-body gravity, trajectory prediction and launch-aim maths.

// --- PHYSICS ENGINE: N-BODY GRAVITATIONAL ACCELERATION ---
function calculateGravityAt(x, y, ignoreBodies = []) {
  let ax = 0;
  let ay = 0;
  let minDistanceToBody = Infinity;
  let closestBody = null;

  // 1. Earth Gravity
  const earthPos = getCoords(currentLevel.earth);
  const dxE = earthPos.x - x;
  const dyE = earthPos.y - y;
  const distSqE = dxE * dxE + dyE * dyE;
  const distE = Math.sqrt(distSqE);
  if (distE > 5 && EARTH_GRAVITY_SCALE > 0) {
    const fE = (G_CONSTANT * currentLevel.earth.mass * EARTH_GRAVITY_SCALE) / Math.max(distSqE, 400);
    ax += (dxE / distE) * fE;
    ay += (dyE / distE) * fE;
  }

  // 2. Celestial Planetary Bodies
  currentLevel.bodies.forEach(b => {
    const bPos = getBodyPos(b);

    const dx = bPos.x - x;
    const dy = bPos.y - y;
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq);

    if (dist < minDistanceToBody) {
      minDistanceToBody = dist;
      closestBody = b;
    }

    // Softened gravity to avoid infinite acceleration singularity at center
    const softenedDistSq = Math.max(distSq, b.radius * b.radius * 0.85);
    const f = (G_CONSTANT * b.mass * BODY_GRAVITY_SCALE) / softenedDistSq;
    ax += (dx / dist) * f;
    ay += (dy / dist) * f;
  });

  return { ax, ay, minDistanceToBody, closestBody };
}

// --- REAL-TIME TRAJECTORY PREDICTION ---
function calculatePredictiveTrajectory(startX, startY, initVx, initVy, maxSteps = PREDICTION_STEPS, aheadTicks = 0, keepPoints = true) {
  const points = [];
  let simX = startX;
  let simY = startY;
  let simVx = initVx;
  let simVy = initVy;

  points.push({ x: simX, y: simY });

  // Advance orbiting moons in lockstep with the flight (one orbit tick per physics step),
  // then restore them, so the preview matches what will actually happen.
  // aheadTicks shifts the start, to predict a launch that happens later (autopilot launch windows).
  const movers = orbiters();
  const savedAngles = movers.map(o => o.angle);
  advanceOrbits(aheadTicks);

  let end = 'miss', reason = '';
  const hits = new Set(); // indices of beacons this path collects
  const earthPos = getCoords(currentLevel.earth);
  const tgtPos = getCoords(currentLevel.target);

  for (let step = 0; step < maxSteps; step++) {
    advanceOrbits(1);

    // Gravitational step
    const grav = calculateGravityAt(simX, simY);
    simVx += grav.ax * TIME_STEP;
    simVy += grav.ay * TIME_STEP;
    simX += simVx * TIME_STEP;
    simY += simVy * TIME_STEP;

    if (keepPoints) points.push({ x: simX, y: simY });

    currentLevel.beacons.forEach((bc, i) => {
      if (bc.collected || hits.has(i)) return;
      const bp = getCoords(bc);
      if (Math.hypot(simX - bp.x, simY - bp.y) < probe.radius + 14) hits.add(i);
    });

    // Check if path collides with Earth
    if (step > 4 && Math.hypot(earthPos.x - simX, earthPos.y - simY) <= currentLevel.earth.radius) {
      end = 'crash'; reason = 'Earth impact'; break;
    }

    // Check if path collides with planets
    const body = currentLevel.bodies.find(b => {
      const bPos = getBodyPos(b);
      return Math.hypot(bPos.x - simX, bPos.y - simY) <= b.radius;
    });
    if (body) { end = 'crash'; reason = `Impact on ${body.name}`; break; }

    // Check if path collides with hazards
    const hz = currentLevel.hazards.find(h => {
      const hzPos = getBodyPos(h);
      return Math.hypot(hzPos.x - simX, hzPos.y - simY) <= h.radius + probe.radius;
    });
    if (hz) { end = 'crash'; reason = `Collision with ${hz.name}`; break; }

    // Check target encounter (same speed limit as the real capture)
    if (Math.hypot(tgtPos.x - simX, tgtPos.y - simY) <= currentLevel.target.captureRadius) {
      if (Math.hypot(simVx, simVy) < 14) { end = 'capture'; break; }
      end = 'fast'; reason = 'Too fast to capture';
    }

    // Check out of bounds
    if (simX < -150 || simX > WORLD_W + 150 || simY < -150 || simY > WORLD_H + 150) {
      end = 'miss'; reason = 'Drifts out of the system'; break;
    }
  }
  movers.forEach((o, i) => { o.angle = savedAngles[i]; });
  if (!keepPoints) points.push({ x: simX, y: simY });
  return { points, end, reason, hits };
}

// --- LAUNCH AIM ---
function getAimVector() {
  const thrustPower = aim.power * MAX_DELTA_V;
  return { thrustPower, angle: aim.angle, vx: Math.cos(aim.angle) * thrustPower, vy: Math.sin(aim.angle) * thrustPower };
}

// Slingshot: pulling back from Earth to point p aims the opposite way, harder the further you pull
function setAimFromPoint(p) {
  const e = getCoords(currentLevel.earth);
  const dx = e.x - p.x, dy = e.y - p.y;
  const dist = Math.hypot(dx, dy);
  aim.angle = Math.atan2(dy, dx);
  aim.power = Math.min(dist, MAX_LAUNCH_PULL) / MAX_LAUNCH_PULL;
  aim.set = aim.power >= MIN_AIM_POWER;
}

// Where the slingshot cord would be pulled to for the current aim
function aimDragPoint() {
  const e = getCoords(currentLevel.earth);
  const pull = aim.power * MAX_LAUNCH_PULL;
  return { x: e.x - Math.cos(aim.angle) * pull, y: e.y - Math.sin(aim.angle) * pull };
}

// Probe leaves from Earth's surface along the launch heading, not from its centre
function getLaunchPoint(angle) {
  const earthPos = getCoords(currentLevel.earth);
  const r = currentLevel.earth.radius + 6;
  return { x: earthPos.x + Math.cos(angle) * r, y: earthPos.y + Math.sin(angle) * r };
}
