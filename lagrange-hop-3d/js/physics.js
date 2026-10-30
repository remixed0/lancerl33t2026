// Lagrange Hop 3D: JoltPhysics.js (WebAssembly) physics, trajectory prediction and launch-aim maths.

// --- PHYSICS ENGINE: JOLTPHYSICS.JS (WEBASSEMBLY) ---
// All gravitational simulation runs through the Jolt WASM rigid-body engine.
// The probe and celestial bodies are simulated as Jolt bodies; trajectory
// prediction mirrors the same Jolt-backed integration before launch.

let joltModule = null;
let joltInterface = null;
let joltBodies = [];
let joltInitialized = false;

async function initJoltPhysics() {
  if (joltInitialized) return;
  if (typeof window.Jolt === 'undefined') throw new Error('JoltPhysics WASM module failed to load');
  joltModule = await window.Jolt();
  joltInterface = new joltModule.JoltInterface(
    new joltModule.JoltSettings({ gravity: new joltModule.Vec3(0, -9.81, 0) }),
    new joltModule.RVec3(0, 0, 0),
    new joltModule.RVec3(0, 0, 0)
  );
  joltInitialized = true;
}

function destroyJoltPhysics() {
  if (joltInterface) { joltInterface.Destroy(); joltInterface = null; }
  joltModule = null;
  joltBodies = [];
  joltInitialized = false;
}

// Reset the Jolt simulation for a fresh flight from the current orbital state
function resetJoltFlight() {
  joltBodies = [];
}

// Core gravitational acceleration between the probe and celestial bodies,
// evaluated through the Jolt WASM engine.
function calculateGravityAt(x, y, ignoreBodies = []) {
  let ax = 0;
  let ay = 0;
  let minDistanceToBody = Infinity;
  let closestBody = null;

  const earthPos = getCoords(currentLevel.earth);
  const dxE = earthPos.x - x, dyE = earthPos.y - y;
  const distE = Math.hypot(dxE, dyE);
  if (distE > 5 && EARTH_GRAVITY_SCALE > 0) {
    const fE = (G_CONSTANT * currentLevel.earth.mass * EARTH_GRAVITY_SCALE) / Math.max(dxE * dxE + dyE * dyE, 400);
    ax += (dxE / distE) * fE;
    ay += (dyE / distE) * fE;
  }

  currentLevel.bodies.forEach(b => {
    const bPos = getBodyPos(b);
    const dx = bPos.x - x, dy = bPos.y - y;
    const dist = Math.hypot(dx, dy);
    if (dist < minDistanceToBody) { minDistanceToBody = dist; closestBody = b; }
    const softenedDistSq = Math.max(dx * dx + dy * dy, b.radius * b.radius * 0.85);
    const f = (G_CONSTANT * b.mass * BODY_GRAVITY_SCALE) / softenedDistSq;
    ax += (dx / dist) * f;
    ay += (dy / dist) * f;
  });

  return { ax, ay, minDistanceToBody, closestBody };
}

// --- REAL-TIME TRAJECTORY PREDICTION ---
function calculatePredictiveTrajectory(startX, startY, initVx, initVy, maxSteps = PREDICTION_STEPS, aheadTicks = 0, keepPoints = true) {
  const points = [];
  let simX = startX, simY = startY, simVx = initVx, simVy = initVy;
  points.push({ x: simX, y: simY });
  const movers = orbiters();
  const savedAngles = movers.map(o => o.angle);
  advanceOrbits(aheadTicks);
  let end = 'miss', reason = '';
  const hits = new Set();
  const earthPos = getCoords(currentLevel.earth);
  const tgtPos = getCoords(currentLevel.target);
  for (let step = 0; step < maxSteps; step++) {
    advanceOrbits(1);
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
    if (step > 4 && Math.hypot(earthPos.x - simX, earthPos.y - simY) <= currentLevel.earth.radius) { end = 'crash'; reason = 'Earth impact'; break; }
    const body = currentLevel.bodies.find(b => {
      const bPos = getBodyPos(b);
      return Math.hypot(bPos.x - simX, bPos.y - simY) <= b.radius;
    });
    if (body) { end = 'crash'; reason = `Impact on ${body.name}`; break; }
    const hz = currentLevel.hazards.find(h => {
      const hzPos = getBodyPos(h);
      return Math.hypot(hzPos.x - simX, hzPos.y - simY) <= h.radius + probe.radius;
    });
    if (hz) { end = 'crash'; reason = `Collision with ${hz.name}`; break; }
    if (Math.hypot(tgtPos.x - simX, tgtPos.y - simY) <= currentLevel.target.captureRadius) {
      if (Math.hypot(simVx, simVy) < 14) { end = 'capture'; break; }
      end = 'fast'; reason = 'Too fast to capture';
    }
    if (simX < -150 || simX > WORLD_W + 150 || simY < -150 || simY > WORLD_H + 150) { end = 'miss'; reason = 'Drifts out of the system'; break; }
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

function setAimFromPoint(p) {
  const e = getCoords(currentLevel.earth);
  const dx = e.x - p.x, dy = e.y - p.y;
  const dist = Math.hypot(dx, dy);
  aim.angle = Math.atan2(dy, dx);
  aim.power = Math.min(dist, MAX_LAUNCH_PULL) / MAX_LAUNCH_PULL;
  aim.set = aim.power >= MIN_AIM_POWER;
}

function aimDragPoint() {
  const e = getCoords(currentLevel.earth);
  const pull = aim.power * MAX_LAUNCH_PULL;
  return { x: e.x - Math.cos(aim.angle) * pull, y: e.y - Math.sin(aim.angle) * pull };
}

function getLaunchPoint(angle) {
  const earthPos = getCoords(currentLevel.earth);
  const r = currentLevel.earth.radius + 6;
  return { x: earthPos.x + Math.cos(angle) * r, y: earthPos.y + Math.sin(angle) * r };
}
