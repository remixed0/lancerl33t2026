// Lagrange Hop 3D: World coordinates, orbit movement and world <-> 3D scene conversion.

// --- WORLD <-> SCENE COORDINATES ---
function getCoords(obj) {
  return {
    x: obj.x * WORLD_W,
    y: obj.y * WORLD_H
  };
}

// The probe counts as lost this far outside the world rectangle (shared by the flight and the preview)
const LOST_MARGIN = 200;
function isOutOfBounds(x, y) {
  return x < -LOST_MARGIN || x > WORLD_W + LOST_MARGIN || y < -LOST_MARGIN || y > WORLD_H + LOST_MARGIN;
}

// Everything with an orbitCenter (moons and patrolling asteroids) moves orbitSpeed radians per tick
function orbiters() {
  return currentLevel.bodies.concat(currentLevel.hazards).filter(o => o.orbitCenter && o.orbitSpeed);
}
function advanceOrbits(ticks) {
  orbiters().forEach(o => { o.angle = (o.angle || 0) + o.orbitSpeed * ticks; });
}

// Works for planets, moons and hazards: orbiting objects circle orbitCenter, others stay put
function getBodyPos(b) {
  return b.orbitCenter
    ? {
        x: (b.orbitCenter.x * WORLD_W) + Math.cos(b.angle || 0) * b.orbitRadius,
        y: (b.orbitCenter.y * WORLD_H) + Math.sin(b.angle || 0) * b.orbitRadius
      }
    : getCoords(b);
}

// World y grows downward (screen convention); scene y grows upward.
function toScene(x, y, z = 0) {
  return new THREE.Vector3(x - WORLD_W / 2, -(y - WORLD_H / 2), z);
}

function writeScene(arr, i, x, y) {
  arr[i * 3] = x - WORLD_W / 2;
  arr[i * 3 + 1] = -(y - WORLD_H / 2);
  arr[i * 3 + 2] = 0;
}
