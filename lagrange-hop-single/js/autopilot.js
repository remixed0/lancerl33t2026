// Lagrange Hop 3D: Autopilot: searches upcoming launch windows for the best route and flies it.

// --- AUTOPILOT: searches launch angle/power for the best route at an upcoming launch window ---
const AUTOPILOT_LEAD_TICKS = 180;   // launch window opens this many frames after the search starts
const AUTOPILOT_FLIGHT_STEPS = 3000;

function scoreShot(angle, power, ahead) {
  const tp = power * MAX_DELTA_V;
  const lp = getLaunchPoint(angle);
  const r = calculatePredictiveTrajectory(lp.x, lp.y, Math.cos(angle) * tp, Math.sin(angle) * tp, AUTOPILOT_FLIGHT_STEPS, ahead, false);
  if (r.end !== 'capture') return -1;
  return r.hits.size * 10 + (1 - power); // most beacons first, then least fuel
}

const AUTOPILOT_WINDOWS = 8;        // compare this many upcoming launch windows (stops early on a perfect route)...
const AUTOPILOT_WINDOW_GAP = 120;   // ...spaced this many frames apart

function coarseShots() {
  const shots = [];
  for (let d = 0; d < 360; d += 1) for (let p = 3; p <= 10; p++) shots.push([d * Math.PI / 180, p / 10]);
  return shots;
}

function startAutopilot(lead = AUTOPILOT_LEAD_TICKS) {
  if (gameState !== 'AIMING') return;
  autopilot = {
    phase: 'search', lead, window: 0, windowStart: tickCount + lead,
    launchTick: tickCount + lead, shots: coarseShots(), idx: 0,
    best: null, top: [], refined: false, overall: null
  };
  document.getElementById('autoBtn').classList.add('auto-active');
  document.getElementById('hintText').textContent = 'Autopilot computing routes for the next launch windows...';
  bob.event('autopilot');
}

function cancelAutopilot() {
  if (!autopilot) return;
  autopilot = null;
  document.getElementById('autoBtn').classList.remove('auto-active');
}

function lockAutopilotRoute(ap) {
  aim = { set: true, angle: ap.overall.angle, power: ap.overall.power };
  ap.launchTick = ap.overall.launchTick;
  ap.phase = 'wait';
  document.getElementById('hintText').textContent = 'Autopilot locked a route. Launching when the window opens...';
}

// Runs a slice of the search each frame so the game keeps animating
function updateAutopilot() {
  if (!autopilot) return;
  if (gameState !== 'AIMING') { cancelAutopilot(); return; }
  const ap = autopilot;
  if (ap.phase === 'search') {
    const ahead = ap.launchTick - tickCount;
    // Ran out of time (slow device): if a route is already in hand for a later window keep it, else start over with more lead
    if (ahead <= 0) {
      if (ap.overall && ap.overall.launchTick > tickCount + 30) { lockAutopilotRoute(ap); return; }
      startAutopilot(Math.min(720, ap.lead * 2));
      return;
    }
    const deadline = performance.now() + 9;
    while (ap.idx < ap.shots.length && performance.now() < deadline) {
      const [a, p] = ap.shots[ap.idx++];
      const s = scoreShot(a, p, ahead);
      if (s < 0) continue;
      const shot = { angle: a, power: p, score: s, launchTick: ap.launchTick };
      if (!ap.best || s > ap.best.score) ap.best = shot;
      if (!ap.refined) ap.top = ap.top.concat(shot).sort((x, y) => y.score - x.score).slice(0, 5);
    }
    if (ap.idx < ap.shots.length) return;
    if (ap.best && !ap.refined) {
      // Second pass: fine grid around the five best coarse shots (narrow 3-star routes hide between grid lines)
      ap.refined = true;
      ap.idx = 0;
      ap.shots = [];
      ap.top.forEach(c => {
        for (let dd = -1; dd <= 1.001; dd += 0.25) {
          for (let dp = -0.1; dp <= 0.1001; dp += 0.025) {
            const p = c.power + dp;
            if (p >= MIN_AIM_POWER && p <= 1) ap.shots.push([c.angle + dd * Math.PI / 180, p]);
          }
        }
      });
      return;
    }
    // Window finished: keep the best route across windows; stop early once every beacon is collected
    if (ap.best && (!ap.overall || ap.best.score > ap.overall.score)) ap.overall = ap.best;
    const perfect = ap.overall && Math.floor(ap.overall.score / 10) === currentLevel.beacons.length;
    if (perfect || ap.window + 1 >= AUTOPILOT_WINDOWS) {
      if (ap.overall) { lockAutopilotRoute(ap); return; }
      document.getElementById('hintText').textContent = 'Autopilot: no route in these windows, trying later ones...';
      startAutopilot(ap.lead);
      return;
    }
    ap.window++;
    ap.launchTick = ap.windowStart + ap.window * AUTOPILOT_WINDOW_GAP;
    ap.shots = coarseShots();
    ap.idx = 0;
    ap.best = null;
    ap.top = [];
    ap.refined = false;
  } else if (ap.phase === 'wait' && tickCount >= ap.launchTick) {
    cancelAutopilot();
    launch(true);
  }
}
