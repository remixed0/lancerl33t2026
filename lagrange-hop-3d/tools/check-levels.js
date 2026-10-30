#!/usr/bin/env node
/*
 * Level checker: proves every mission can be beaten.
 *
 *   node tools/check-levels.js
 *
 * For each mission it:
 *   1. flies the autopilot shot and checks it is a 3-star capture,
 *   2. checks the shot still works if the aim is 0.5 degrees off
 *      (so a human can actually hit it),
 *   3. scans launch angles and speeds at several moon positions and
 *      counts how many shots reach the target at all.
 * Exit code 1 if any mission fails, so it works in CI.
 */
'use strict';
const path = require('path');
const P = require(path.join(__dirname, '..', 'js', 'physics.js'));
const LEVELS = require(path.join(__dirname, '..', 'js', 'levels.js'));

const RAD = Math.PI / 180;
let failed = false;

function orbitPeriod(level) {
  const periods = level.bodies.concat(level.hazards).filter((b) => b.orbit).map((b) => b.orbit.period);
  return periods.length ? Math.max(...periods) : 0;
}

LEVELS.forEach((level, i) => {
  const ap = level.autopilot;
  const lines = [];
  let ok = true;

  // 1. Autopilot shot
  const run = P.simulate(level, ap.deg * RAD, ap.speed, ap.t0, {});
  const s = run.state;
  const starCount = run.end.type === 'capture' ? P.stars(level, ap.speed, run.beaconCount) : 0;
  lines.push(
    `autopilot: ${run.end.type}, ${run.beaconCount}/${level.beacons.length} beacons, ` +
    `fuel ${P.fuelLeft(ap.speed)}%, slingshot ${s.maxBoost.toFixed(2)}x, ` +
    `${(s.t - ap.t0).toFixed(1)} s, ${starCount} stars`
  );
  if (starCount !== 3) ok = false;

  // 2. Tolerance: half a degree either way should still capture
  [-0.5, 0.5].forEach((d) => {
    const r = P.simulate(level, (ap.deg + d) * RAD, ap.speed, ap.t0, {});
    if (r.end.type !== 'capture') {
      ok = false;
      lines.push(`aim ${d > 0 ? '+' : ''}${d} deg: ${r.end.type} (too tight)`);
    }
  });

  // 3. Coverage scan
  const period = orbitPeriod(level);
  const phases = period ? 6 : 1;
  const winsPerPhase = [];
  for (let k = 0; k < phases; k++) {
    const t0 = period ? (period * k) / phases : 0;
    let wins = 0;
    for (let deg = 0; deg < 360; deg += 2) {
      for (let sp = 4; sp <= P.MAX_SPEED; sp += 0.5) {
        if (P.simulate(level, deg * RAD, sp, t0, {}).end.type === 'capture') wins++;
      }
    }
    winsPerPhase.push(wins);
  }
  const minWins = Math.min(...winsPerPhase);
  lines.push(`winning shots per moon position: ${winsPerPhase.join(', ')}`);
  if (minWins === 0) {
    ok = false;
    lines.push('some launch times have NO winning shot');
  }

  console.log(`${ok ? 'PASS' : 'FAIL'}  ${level.title}`);
  lines.forEach((l) => console.log('      ' + l));
  if (!ok) failed = true;
});

process.exit(failed ? 1 : 0);
