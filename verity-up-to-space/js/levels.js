// Verity Up To Space 3D: The 8 missions: planets, moons, hazards, beacons and targets.

// Level helpers: asteroids, and debris placed on a ring around a planet (world-fraction coords)
function rock(x, y, radius, name) {
  return { x, y, radius, color: '#78716c', name };
}
// Debris that orbits a planet (cx, cy) at ringRadius world units, starting at the given angles
function debrisRing(cx, cy, ringRadius, angles, radius, name, speed = 0) {
  return angles.map((a, i) => Object.assign(rock(
    cx + Math.cos(a) * ringRadius / WORLD_W,
    cy + Math.sin(a) * ringRadius / WORLD_H,
    radius, `${name} ${i + 1}`
  ), speed ? { orbitCenter: { x: cx, y: cy }, orbitRadius: ringRadius, orbitSpeed: speed, angle: a } : {}));
}
// A rock that circles its own spot (radius in world units, speed in radians per frame): a moving obstacle
function patrol(r, orbitRadius, speed, angle = 0) {
  return Object.assign(r, { orbitCenter: { x: r.x, y: r.y }, orbitRadius, orbitSpeed: speed, angle });
}

// --- LEVEL DEFINITIONS (ordered easiest -> hardest; each unlocks the next) ---
const LEVELS = [
  {
    title: "MISSION 01: LUNAR SLINGSHOT",
    subtitle: "Harness the Moon's gravity well to slingshot towards the Deep Space Relay.",
    hint: "Pull back from Earth. Bend your trajectory curve around the Moon for a free gravity boost!",
    earth: { x: 0.16, y: 0.52, radius: 26, color: '#38bdf8', mass: 85, name: 'Earth' },
    bodies: [
      { name: "Moon", x: 0.52, y: 0.48, radius: 14, mass: 22, color: '#cbd5e1',
        orbitCenter: { x: 0.52, y: 0.52 }, orbitRadius: 28, orbitSpeed: 0.008, angle: 0 }
    ],
    target: { name: "Deep Space Relay", x: 0.88, y: 0.28, radius: 16, captureRadius: 46, color: '#34d399' },
    beacons: [
      { x: 0.34, y: 0.424, collected: false },
      { x: 0.517, y: 0.347, collected: false },
      { x: 0.699, y: 0.309, collected: false }
    ],
    hazards: []
  },
  {
    title: "MISSION 02: MARS INSERTION",
    subtitle: "Navigate the asteroid field and enter the Mars capture envelope.",
    hint: "Deimos and a drifting asteroid are moving. Watch the preview and time your launch.",
    earth: { x: 0.14, y: 0.72, radius: 26, color: '#38bdf8', mass: 85, name: 'Earth' },
    bodies: [
      { name: "Mars", x: 0.82, y: 0.32, radius: 20, mass: 42, color: '#fb923c' },
      { name: "Deimos", x: 0.82, y: 0.32, radius: 7, mass: 4, color: '#a8a29e',
        orbitCenter: { x: 0.82, y: 0.32 }, orbitRadius: 80, orbitSpeed: 0.012, angle: 2.5 }
    ],
    target: { name: "Mars Orbital Station", x: 0.82, y: 0.32, radius: 20, captureRadius: 54, color: '#fb923c' },
    beacons: [
      { x: 0.277, y: 0.636, collected: false },
      { x: 0.411, y: 0.554, collected: false },
      { x: 0.571, y: 0.458, collected: false }
    ],
    hazards: [
      rock(0.46, 0.66, 14, 'Debris A'),
      rock(0.49, 0.46, 16, 'Debris B'),
      rock(0.54, 0.24, 15, 'Debris C'),
      patrol(rock(0.68, 0.16, 12, 'Asteroid Ceres'), 30, 0.02)
    ]
  },
  {
    title: "MISSION 03: VENUS SWING-BY",
    subtitle: "Use Venus to bend a steep climb toward the Mercury transfer orbit.",
    hint: "Skim Venus to bend upward for free. Two debris rocks patrol, so time your launch.",
    earth: { x: 0.12, y: 0.76, radius: 26, color: '#38bdf8', mass: 85, name: 'Earth' },
    bodies: [
      { name: "Venus", x: 0.44, y: 0.46, radius: 22, mass: 70, color: '#fcd34d' }
    ],
    target: { name: "Mercury Transfer Orbit", x: 0.86, y: 0.24, radius: 14, captureRadius: 44, color: '#34d399' },
    beacons: [
      { x: 0.267, y: 0.506, collected: false },
      { x: 0.461, y: 0.295, collected: false },
      { x: 0.669, y: 0.252, collected: false }
    ],
    hazards: [
      rock(0.28, 0.36, 14, 'Solar Debris'),
      patrol(rock(0.62, 0.72, 14, 'Comet Fragment'), 45, 0.015),
      patrol(rock(0.70, 0.44, 12, 'Debris Field'), 30, -0.02, 1.5)
    ]
  },
  {
    title: "MISSION 04: ASTEROID BELT RUN",
    subtitle: "Thread a gap in the main belt, using Vesta and Ceres to steer.",
    hint: "Two belt rocks drift back and forth. Launch when the gap you want is open.",
    earth: { x: 0.10, y: 0.50, radius: 25, color: '#38bdf8', mass: 85, name: 'Earth' },
    bodies: [
      { name: "Vesta", x: 0.30, y: 0.24, radius: 15, mass: 40, color: '#a8a29e' },
      { name: "Ceres", x: 0.70, y: 0.78, radius: 16, mass: 45, color: '#94a3b8' }
    ],
    target: { name: "Belt Outpost", x: 0.88, y: 0.40, radius: 15, captureRadius: 42, color: '#2dd4bf' },
    beacons: [
      { x: 0.278, y: 0.51, collected: false },
      { x: 0.425, y: 0.486, collected: false },
      { x: 0.569, y: 0.446, collected: false },
      { x: 0.712, y: 0.417, collected: false }
    ],
    hazards: [
      rock(0.49, 0.16, 14, 'Belt Rock 1'),
      patrol(rock(0.52, 0.29, 15, 'Belt Rock 2'), 28, 0.018),
      rock(0.48, 0.42, 13, 'Belt Rock 3'),
      rock(0.51, 0.56, 16, 'Belt Rock 4'),
      patrol(rock(0.50, 0.69, 14, 'Belt Rock 5'), 28, -0.018, 2),
      rock(0.53, 0.83, 13, 'Belt Rock 6')
    ]
  },
  {
    title: "MISSION 05: THE GRAND TOUR",
    subtitle: "Double gravity assist: slingshot between Jupiter and Ganymede to reach Europa.",
    hint: "Ganymede and Io both orbit Jupiter. Wait for a clean launch window.",
    earth: { x: 0.12, y: 0.5, radius: 25, color: '#38bdf8', mass: 80, name: 'Earth' },
    bodies: [
      { name: "Jupiter", x: 0.48, y: 0.5, radius: 36, mass: 145, color: '#f59e0b', texture: 'bands' },
      { name: "Ganymede", x: 0.48, y: 0.22, radius: 12, mass: 20, color: '#a78bfa',
        orbitCenter: { x: 0.48, y: 0.5 }, orbitRadius: 105, orbitSpeed: 0.012, angle: 1.5 },
      { name: "Io", x: 0.48, y: 0.5, radius: 8, mass: 8, color: '#fde047',
        orbitCenter: { x: 0.48, y: 0.5 }, orbitRadius: 62, orbitSpeed: 0.02, angle: 0 }
    ],
    target: { name: "Europa Research Base", x: 0.88, y: 0.5, radius: 18, captureRadius: 46, color: '#2dd4bf' },
    beacons: [
      { x: 0.263, y: 0.696, collected: false },
      { x: 0.424, y: 0.804, collected: false },
      { x: 0.6, y: 0.787, collected: false },
      { x: 0.748, y: 0.678, collected: false }
    ],
    hazards: [
      rock(0.64, 0.46, 11, 'Radiation Belt'),
      rock(0.34, 0.70, 13, 'Space Junk'),
      patrol(rock(0.30, 0.30, 12, 'Trojan Asteroid'), 35, 0.012)
    ]
  },
  {
    title: "MISSION 06: SATURN RING DIVE",
    subtitle: "Dive past Saturn's ring debris while Titan and Enceladus tug at your path.",
    hint: "Moons and ring debris orbit Saturn. Watch the preview and time your launch.",
    earth: { x: 0.10, y: 0.80, radius: 25, color: '#38bdf8', mass: 85, name: 'Earth' },
    bodies: [
      { name: "Saturn", x: 0.50, y: 0.48, radius: 30, mass: 120, color: '#eab308', texture: 'bands', rings: true },
      { name: "Titan", x: 0.50, y: 0.48, radius: 12, mass: 22, color: '#fb923c',
        orbitCenter: { x: 0.50, y: 0.48 }, orbitRadius: 150, orbitSpeed: 0.009, angle: 3.6 },
      { name: "Enceladus", x: 0.50, y: 0.48, radius: 8, mass: 8, color: '#e0f2fe',
        orbitCenter: { x: 0.50, y: 0.48 }, orbitRadius: 78, orbitSpeed: -0.016, angle: 0.5 }
    ],
    target: { name: "Titan Relay Station", x: 0.88, y: 0.18, radius: 14, captureRadius: 40, color: '#34d399' },
    beacons: [
      { x: 0.223, y: 0.559, collected: false },
      { x: 0.343, y: 0.362, collected: false },
      { x: 0.512, y: 0.208, collected: false },
      { x: 0.692, y: 0.171, collected: false }
    ],
    hazards: debrisRing(0.50, 0.48, 112, [0.4, 1.5, 2.6, 4.0, 5.3], 11, 'Ring Debris', 0.006)
  },
  {
    title: "MISSION 07: ICE GIANT RELAY",
    subtitle: "Chain assists off Uranus and Neptune to reach the Kuiper Gateway.",
    hint: "Two ice giants, two moving moons and patrolling debris. Timing is everything.",
    earth: { x: 0.08, y: 0.24, radius: 24, color: '#38bdf8', mass: 85, name: 'Earth' },
    bodies: [
      { name: "Uranus", x: 0.36, y: 0.64, radius: 24, mass: 85, color: '#67e8f9', texture: 'bands' },
      { name: "Neptune", x: 0.66, y: 0.34, radius: 24, mass: 90, color: '#3b82f6', texture: 'bands' },
      { name: "Triton", x: 0.66, y: 0.34, radius: 9, mass: 10, color: '#cbd5e1',
        orbitCenter: { x: 0.66, y: 0.34 }, orbitRadius: 62, orbitSpeed: 0.014, angle: 2.0 },
      { name: "Nereid", x: 0.36, y: 0.64, radius: 7, mass: 6, color: '#cbd5e1',
        orbitCenter: { x: 0.36, y: 0.64 }, orbitRadius: 70, orbitSpeed: -0.012, angle: 1.0 }
    ],
    target: { name: "Kuiper Gateway", x: 0.90, y: 0.78, radius: 14, captureRadius: 38, color: '#2dd4bf' },
    beacons: [
      { x: 0.24, y: 0.301, collected: false },
      { x: 0.367, y: 0.372, collected: false },
      { x: 0.482, y: 0.473, collected: false },
      { x: 0.629, y: 0.616, collected: false },
      { x: 0.754, y: 0.696, collected: false }
    ],
    hazards: [
      rock(0.22, 0.46, 14, 'Centaur 1'),
      rock(0.50, 0.20, 15, 'Centaur 2'),
      patrol(rock(0.52, 0.52, 13, 'Centaur 3'), 40, 0.016),
      patrol(rock(0.80, 0.60, 14, 'Centaur 4'), 30, -0.02),
      rock(0.62, 0.80, 13, 'Centaur 5')
    ]
  },
  {
    title: "MISSION 08: HELIOPAUSE GAUNTLET",
    subtitle: "Three giants, a moving moon and a crowded debris field guard the edge of the solar system.",
    hint: "The final run. Every gravity well matters. Use the preview and trust the math.",
    earth: { x: 0.07, y: 0.50, radius: 24, color: '#38bdf8', mass: 85, name: 'Earth' },
    bodies: [
      { name: "Saturn", x: 0.28, y: 0.26, radius: 26, mass: 100, color: '#eab308', texture: 'bands', rings: true },
      { name: "Titan", x: 0.28, y: 0.26, radius: 9, mass: 12, color: '#fb923c',
        orbitCenter: { x: 0.28, y: 0.26 }, orbitRadius: 70, orbitSpeed: 0.012, angle: 3.0 },
      { name: "Jupiter", x: 0.52, y: 0.68, radius: 34, mass: 110, color: '#f59e0b', texture: 'bands' },
      { name: "Io", x: 0.52, y: 0.68, radius: 9, mass: 10, color: '#fde047',
        orbitCenter: { x: 0.52, y: 0.68 }, orbitRadius: 85, orbitSpeed: 0.015, angle: 4.5 },
      { name: "Neptune", x: 0.76, y: 0.30, radius: 22, mass: 80, color: '#3b82f6', texture: 'bands' }
    ],
    target: { name: "Heliopause Probe Dock", x: 0.93, y: 0.62, radius: 13, captureRadius: 36, color: '#34d399' },
    beacons: [
      { x: 0.262, y: 0.485, collected: false },
      { x: 0.42, y: 0.382, collected: false },
      { x: 0.566, y: 0.271, collected: false },
      { x: 0.72, y: 0.204, collected: false },
      { x: 0.875, y: 0.382, collected: false }
    ],
    hazards: [
      rock(0.18, 0.72, 13, 'Kuiper Object 1'),
      patrol(rock(0.38, 0.48, 14, 'Kuiper Object 2'), 40, 0.015),
      rock(0.42, 0.16, 13, 'Kuiper Object 3'),
      patrol(rock(0.63, 0.44, 14, 'Kuiper Object 4'), 35, -0.018),
      rock(0.66, 0.15, 12, 'Kuiper Object 5'),
      rock(0.88, 0.34, 13, 'Kuiper Object 6'),
      patrol(rock(0.74, 0.84, 14, 'Kuiper Object 7'), 30, 0.02),
      rock(0.30, 0.86, 12, 'Kuiper Object 8')
    ]
  }
];

let currentLevel = null;
