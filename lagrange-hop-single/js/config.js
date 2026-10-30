// Lagrange Hop 3D: Game constants and shared game state (loaded first: other files read these).

// --- GAME CONSTANTS & STATE ---
const G_CONSTANT = 3400; // Gravitational constant scaled for world-unit dynamics
const MAX_LAUNCH_PULL = 180; // world units
const MAX_DELTA_V = 9.8;
const PREDICTION_STEPS = 1500; // long enough to show slow, low-fuel routes all the way to the target
const TIME_STEP = 0.35;
// Playtest tuning: at full strength Earth's escape velocity (~149) dwarfs MAX_DELTA_V and
// every launch fell back. Earth acts as a launch pad; planets keep 2.5% of G so all missions are solvable.
const EARTH_GRAVITY_SCALE = 0;
const BODY_GRAVITY_SCALE = 0.025;

// Fixed world space: physics no longer depends on window size.
// Level coordinates are fractions of this rectangle; it lives on the Z = 0 orbital plane.
const WORLD_W = 1600;
const WORLD_H = 900;
const MAX_PARTICLES = 800;

const canvas = document.getElementById('gameCanvas');

let currentLevelIndex = 0;
let gameState = 'AIMING'; // 'AIMING', 'FLYING', 'CAPTURED', 'CRASHED', 'LOST'
let flightTimer = 0;
let maxBoostMultiplier = 1.0;
let launchDeltaVUsed = 0;

// Slingshot aim. angle is the launch heading in world coords (y down); power is 0..1 of MAX_DELTA_V.
// Set by dragging, fine-tuned with arrow keys in precise mode, or chosen by the autopilot.
let isAiming = false; // pointer is currently dragging from Earth
let aim = { set: false, angle: 0, power: 0 };
const MIN_AIM_POWER = 16 / MAX_LAUNCH_PULL; // shorter pulls are treated as accidental taps
const POWER_STEP = 0.1 / (MAX_DELTA_V * 2.8); // one arrow-key press = 0.1 km/s as shown in the HUD
let tickCount = 0; // physics/orbit ticks since load (one per frame); autopilot launch windows use it
let precise = false;  // precise mode: releasing the drag does not launch
let autopilot = null; // { phase: 'search' | 'wait', ... } while the autopilot is working

// Particle pool for exhaust and impacts
let particles = [];

// Probe entity
let probe = {
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  radius: 4.5,
  trail: [],
  maxTrail: 1600,
  alive: true,
  fuelSpent: 0
};
