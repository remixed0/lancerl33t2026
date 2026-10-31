// Lagrange Hop 3D: Three.js scene: setup, building each level, and syncing it every frame.

// --- THREE.JS SCENE ---
let renderer, labelRenderer, scene, camera;
let levelGroup;
let levelObjects = null;
let probeGroup, trailLine, ghostLine, predPoints, predEnd, aimArrow, cordLine, reticle, aimLabel, particlePoints;
let ghostTrail = [];   // previous flight, drawn faintly for comparison
let prediction = null; // latest predicted path + outcome while aiming
const PRED_DOTS = Math.ceil((PREDICTION_STEPS + 2) / 2); // every other predicted point becomes a dot
let glowTexture;
const raycaster = new THREE.Raycaster();
const orbitalPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const colorCache = {};

const CAM_MODES = ['TOP', 'CHASE', 'ISO'];
let camMode = 'TOP';
const camLook = new THREE.Vector3();
const chaseDir = new THREE.Vector3(1, 0, 0);

function cachedColor(hex) {
  if (!colorCache[hex]) colorCache[hex] = new THREE.Color(hex);
  return colorCache[hex];
}

function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

// Object names are hidden by default to keep the scene clean; L toggles them (see .show-labels)
function makeLabel(text, color = '#e2e8f0', size = 11, objectLabel = true) {
  const div = document.createElement('div');
  div.className = objectLabel ? 'scene-label object-label' : 'scene-label';
  div.textContent = text;
  div.style.color = color;
  div.style.fontSize = `${size}px`;
  return new THREE.CSS2DObject(div);
}

function makeGlowSprite(color, scale, opacity = 1) {
  const mat = new THREE.SpriteMaterial({
    map: glowTexture,
    color: new THREE.Color(color),
    transparent: true,
    opacity: opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(scale, scale, 1);
  return sprite;
}

// Closed circle on the orbital plane; dashed lines need explicit line distances
function makeCircleLine(radius, color, opacity, dashed, dashSize = 4, gapSize = 6) {
  const pts = [];
  const segs = 96;
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = dashed
    ? new THREE.LineDashedMaterial({ color, transparent: true, opacity, dashSize, gapSize, depthWrite: false })
    : new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  const line = new THREE.Line(geo, mat);
  if (dashed) line.computeLineDistances();
  return line;
}

function makeDynamicLine(maxPoints, material, withColors = false) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxPoints * 3), 3));
  if (withColors) geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(maxPoints * 3), 3));
  geo.setDrawRange(0, 0);
  const line = new THREE.Line(geo, material);
  line.frustumCulled = false;
  return line;
}

function initScene() {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x030712, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  labelRenderer = new THREE.CSS2DRenderer();
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  const lr = labelRenderer.domElement;
  lr.style.position = 'absolute';
  lr.style.top = '0';
  lr.style.left = '0';
  lr.style.pointerEvents = 'none';
  lr.style.zIndex = '5';
  document.body.insertBefore(lr, canvas.nextSibling);

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x030712, 0.00012);

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 15000);

  glowTexture = makeGlowTexture();

  // Lighting: soft ambient + a "sun" casting shadows onto the orbital plane
  scene.add(new THREE.AmbientLight(0xffffff, 0.42));
  const sun = new THREE.DirectionalLight(0xfff7ed, 1.05);
  sun.position.set(-700, 500, 1400);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -1100; sc.right = 1100; sc.top = 800; sc.bottom = -800;
  sc.near = 10; sc.far = 4000;
  scene.add(sun);
  scene.add(sun.target);

  // Orbital plane reference grid + shadow catcher just below it
  const grid = new THREE.GridHelper(2600, 52, 0x0e7490, 0x1e293b);
  grid.rotation.x = Math.PI / 2;
  grid.position.z = -45;
  grid.material.transparent = true;
  grid.material.opacity = 0.22;
  grid.material.depthWrite = false;
  scene.add(grid);

  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(2600, 1800),
    new THREE.ShadowMaterial({ opacity: 0.35, depthWrite: false }) // must not hide the star layers behind it
  );
  shadowPlane.position.z = -44;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  // Layered starfield: a far shell plus nearer slabs behind the orbital plane,
  // so camera moves (CHASE / ISO) produce visible parallax depth
  const tints = [new THREE.Color('#ffffff'), new THREE.Color('#bae6fd'), new THREE.Color('#fde68a'), new THREE.Color('#e9d5ff'), new THREE.Color('#fecaca')];
  function addStarLayer(count, place, materialOpts, minB, maxB) {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      place(v);
      pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
      const t = tints[i % tints.length];
      const b = minB + Math.random() * (maxB - minB);
      col[i * 3] = t.r * b; col[i * 3 + 1] = t.g * b; col[i * 3 + 2] = t.b * b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial(Object.assign({
      vertexColors: true, depthWrite: false, transparent: true
    }, materialOpts)));
    pts.frustumCulled = false;
    scene.add(pts);
  }
  const slab = (spreadX, spreadY, zNear, zFar) => v => v.set(
    (Math.random() * 2 - 1) * spreadX,
    (Math.random() * 2 - 1) * spreadY,
    -(zNear + Math.random() * (zFar - zNear))
  );
  // Far shell surrounding everything
  addStarLayer(6000, v => {
    const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = 5000 + Math.random() * 2500;
    const s = Math.sqrt(1 - u * u);
    v.set(r * s * Math.cos(th), r * s * Math.sin(th), r * u);
  }, { size: 1.8, sizeAttenuation: false, fog: false }, 0.35, 1.0);
  // Deep field: thousands of stars at varied distances behind the plane
  addStarLayer(5000, slab(3400, 2400, 400, 3400), { size: 11, map: glowTexture, blending: THREE.AdditiveBlending }, 0.45, 1.0);
  // Mid field
  addStarLayer(2500, slab(2200, 1500, 150, 600), { size: 6, map: glowTexture, blending: THREE.AdditiveBlending }, 0.3, 0.8);
  // Near dust just under the plane: faint, drifts fastest when the camera moves
  addStarLayer(1200, slab(1500, 1000, 60, 160), { size: 3.5, map: glowTexture, blending: THREE.AdditiveBlending }, 0.15, 0.45);

  // Faint nebula clouds far behind for colour depth
  const nebulaColors = ['#7c3aed', '#0e7490', '#be185d', '#1d4ed8', '#0f766e'];
  nebulaColors.forEach((c, i) => {
    const neb = makeGlowSprite(c, 2200 + Math.random() * 1600, 0.09);
    neb.position.set((Math.random() * 2 - 1) * 2600, (Math.random() * 2 - 1) * 1700, -2600 - i * 300);
    scene.add(neb);
  });

  levelGroup = new THREE.Group();
  scene.add(levelGroup);

  // Probe vessel: core cone pointing +X, solar array, science dish, engine glow
  probeGroup = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.ConeGeometry(4.5, 13, 10),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4, metalness: 0.5, emissive: 0x334155, emissiveIntensity: 0.4 })
  );
  core.rotation.z = -Math.PI / 2;
  core.castShadow = true;
  const panels = new THREE.Mesh(
    new THREE.BoxGeometry(5, 24, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.7, emissive: 0x0c4a6e, emissiveIntensity: 0.5 })
  );
  panels.position.x = -1;
  panels.castShadow = true;
  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(2, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
  );
  dish.position.set(2, 0, 3);
  const engineGlow = makeGlowSprite('#38bdf8', 22, 0.9);
  engineGlow.position.x = -8;
  probeGroup.add(core, panels, dish, engineGlow);
  // These low-poly parts stay as a fallback until the NASA Voyager GLB loads.
  probeGroup.userData.lowPoly = [core, panels, dish];
  probeGroup.scale.setScalar(1.25);
  probeGroup.visible = false;
  scene.add(probeGroup);

  // Flight trail: brightens toward the probe; keeps the whole flight
  trailLine = makeDynamicLine(probe.maxTrail, new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
  }), true);
  scene.add(trailLine);

  // Ghost of the previous flight (faint dashed grey) to compare attempts
  ghostLine = makeDynamicLine(probe.maxTrail, new THREE.LineDashedMaterial({
    color: 0x94a3b8, dashSize: 4, gapSize: 5, transparent: true, opacity: 0.3, depthWrite: false
  }));
  ghostLine.geometry.setAttribute('lineDistance', new THREE.BufferAttribute(new Float32Array(probe.maxTrail), 1));
  scene.add(ghostLine);

  // Predicted path: glowing dots that fade along the path
  const predGeo = new THREE.BufferGeometry();
  predGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PRED_DOTS * 3), 3));
  predGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(PRED_DOTS * 3), 3));
  predGeo.setDrawRange(0, 0);
  predPoints = new THREE.Points(predGeo, new THREE.PointsMaterial({
    size: 13, map: glowTexture, vertexColors: true, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  predPoints.frustumCulled = false;
  scene.add(predPoints);

  // Outcome marker at the end of the prediction: green ring / red X / grey dot
  predEnd = new THREE.Group();
  const ring = makeCircleLine(9, 0x34d399, 1, false);
  const xMat = new THREE.LineBasicMaterial({ color: 0xf43f5e });
  const xGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-8, -8, 0), new THREE.Vector3(8, 8, 0),
    new THREE.Vector3(8, -8, 0), new THREE.Vector3(-8, 8, 0)
  ]);
  const cross = new THREE.LineSegments(xGeo, xMat);
  const missDot = new THREE.Mesh(new THREE.SphereGeometry(3, 10, 8), new THREE.MeshBasicMaterial({ color: 0x94a3b8 }));
  predEnd.add(ring, cross, missDot);
  predEnd.userData = { ring, cross, missDot };
  predEnd.visible = false;
  scene.add(predEnd);

  // Launch arrow from Earth's surface: direction = aim, length = power
  aimArrow = new THREE.Group();
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.95 });
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(1, 3, 1.5), arrowMat);
  const head = new THREE.Mesh(new THREE.ConeGeometry(6, 12, 12), arrowMat);
  head.rotation.z = -Math.PI / 2; // cone points +X
  aimArrow.add(shaft, head);
  aimArrow.userData = { shaft, head };
  aimArrow.visible = false;
  scene.add(aimArrow);

  // Slingshot rubber band + pull reticle
  cordLine = makeDynamicLine(2, new THREE.LineBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.85 }));
  scene.add(cordLine);
  reticle = new THREE.Mesh(new THREE.SphereGeometry(6, 14, 10), new THREE.MeshBasicMaterial({ color: 0xf43f5e }));
  reticle.visible = false;
  aimLabel = makeLabel('', '#f43f5e', 12, false);
  aimLabel.position.set(40, 14, 0);
  reticle.add(aimLabel);
  scene.add(reticle);

  // Particles: one pooled Points cloud; fading by darkening colour under additive blending
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_PARTICLES * 3), 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MAX_PARTICLES * 3), 3));
  pGeo.setDrawRange(0, 0);
  particlePoints = new THREE.Points(pGeo, new THREE.PointsMaterial({
    size: 7, map: glowTexture, vertexColors: true, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  particlePoints.frustumCulled = false;
  scene.add(particlePoints);

  snapCamera();

  // NASA Voyager 3D model (real spacecraft). Bundled locally in assets/, with NASA's CDN as a fallback.
  const loader = new THREE.GLTFLoader();
  const VOYAGER_CDN = 'https://assets.science.nasa.gov/content/dam/science/psd/solar/2023/09/v/Voyager.glb?emrc=6ae51305aee47';

  function mountVoyager(gltf) {
    const model = gltf.scene;
    model.name = 'Voyager';
    // Rotate to match the core's orientation (-Math.PI/2 on Z) so that when the probe
    // group rotates to face the velocity vector, the Voyager points in the launch direction.
    // Done before measuring so the centring below uses the rotated bounds.
    model.rotation.z = -Math.PI / 2;
    model.updateMatrixWorld(true);
    // Normalise scale and centre so it replaces the low-poly stand-in at the same visual size.
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    model.scale.setScalar((probe.radius * 7) / maxDim);
    model.updateMatrixWorld(true);
    box.setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    probeGroup.add(model);
    probeGroup.userData.lowPoly.forEach((part) => { part.visible = false; });
  }

  loader.load('assets/Voyager.glb', mountVoyager, undefined, () => {
    console.warn('Local Voyager model unavailable; loading from NASA CDN');
    loader.load(VOYAGER_CDN, mountVoyager, undefined, (err) => {
      console.warn('Voyager GLTF failed to load; keeping the low-poly probe', err);
    });
  });
}

function clearLevelGroup() {
  while (levelGroup.children.length) {
    const child = levelGroup.children[0];
    levelGroup.remove(child);
    child.traverse(o => {
      // r128 CSS2DRenderer leaves label elements in the DOM after removal
      if (o.isCSS2DObject && o.element.parentNode) o.element.parentNode.removeChild(o.element);
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const map = o.material.map;
        if (map && !isSharedTexture(map)) map.dispose();
        o.material.dispose();
      }
    });
  }
}

function buildLevelScene() {
  clearLevelGroup();
  const lvl = currentLevel;
  levelObjects = { earth: null, aimRing: null, bodies: [], target: null, targetRing: null, targetCore: null, beacons: [], hazards: [], gasMaterials: [] };

  // Earth (launch base)
  const earthGroup = new THREE.Group();
  const earth = makeEarth(lvl.earth);
  earthGroup.add(earth.globe);
  earthGroup.add(makeGlowSprite('#38bdf8', lvl.earth.radius * 3.0, 0.3));
  const earthLabel = makeLabel('EARTH (BASE)', '#bae6fd');
  earthLabel.position.set(0, -(lvl.earth.radius + 16), 0);
  earthGroup.add(earthLabel);
  const aimRing = makeCircleLine(lvl.earth.radius + 10, 0x38bdf8, 0.55, true, 4, 4);
  earthGroup.add(aimRing);
  earthGroup.position.copy(toScene(getCoords(lvl.earth).x, getCoords(lvl.earth).y));
  levelGroup.add(earthGroup);
  levelObjects.earth = { group: earthGroup, mesh: earth.surface, clouds: earth.clouds };
  levelObjects.aimRing = aimRing;

  // Celestial bodies with gravity well contours and orbit tracks
  lvl.bodies.forEach(b => {
    const group = new THREE.Group();
    const planet = makePlanet(b);
    const mesh = planet.mesh;
    group.add(planet.group);
    if (planet.gasMaterial) levelObjects.gasMaterials.push(planet.gasMaterial);
    group.add(makeGlowSprite(b.color, b.radius * 3.6, 0.3));
    for (let ring = 1; ring <= 3; ring++) {
      group.add(makeCircleLine(b.radius + ring * 28, 0x38bdf8, 0.32 / ring, true));
    }
    const label = makeLabel(b.name);
    label.position.set(0, -(b.radius + 14), 0);
    group.add(label);
    levelGroup.add(group);

    if (b.orbitCenter) {
      const track = makeCircleLine(b.orbitRadius, 0xffffff, 0.1, false);
      const oc = toScene(b.orbitCenter.x * WORLD_W, b.orbitCenter.y * WORLD_H);
      track.position.copy(oc);
      levelGroup.add(track);
    }
    levelObjects.bodies.push({ data: b, group, mesh });
  });

  // Target capture envelope
  const t = lvl.target;
  const tGroup = new THREE.Group();
  const tRing = makeCircleLine(t.captureRadius, new THREE.Color(t.color), 0.95, true, 6, 6);
  tGroup.add(tRing);
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(t.captureRadius, 64),
    new THREE.MeshBasicMaterial({ map: glowTexture, color: new THREE.Color(t.color), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  tGroup.add(disc);
  const tInner = makeCircleLine(t.captureRadius * 0.6, new THREE.Color(t.color), 0.35, true, 2, 5);
  tGroup.add(tInner);
  // A relay station sits in open space; when the target is a planet's orbit (Mars) the planet is the centrepiece
  const onPlanet = lvl.bodies.some(b => !b.orbitCenter && Math.hypot(b.x - t.x, b.y - t.y) < 0.01);
  let tCore = null, tBeacon = null;
  if (!onPlanet) {
    const st = makeStation(t.color, t.radius * 0.7);
    tCore = st.station;
    tBeacon = st.beacon;
    tGroup.add(tCore);
    tGroup.add(makeGlowSprite(t.color, t.radius * 3.4, 0.55));
  }
  const tLabel = makeLabel(t.name.toUpperCase(), '#6ee7b7', 10);
  tLabel.position.set(0, t.captureRadius + 10, 0);
  tGroup.add(tLabel);
  tGroup.position.copy(toScene(getCoords(t).x, getCoords(t).y));
  levelGroup.add(tGroup);
  levelObjects.target = tGroup;
  levelObjects.targetRing = tRing;
  levelObjects.targetInner = tInner;
  levelObjects.targetCore = tCore;
  levelObjects.targetBeacon = tBeacon;

  // Hazards: lumpy faceted asteroids
  lvl.hazards.forEach(hz => {
    const geo = new THREE.IcosahedronGeometry(hz.radius, 1);
    const pos = geo.attributes.position;
    const jitter = {};
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const key = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
      if (jitter[key] === undefined) jitter[key] = 0.75 + Math.random() * 0.45;
      v.multiplyScalar(jitter[key]);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    const rockTex = getRockTexture('asteroid');
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: '#b8aea4', map: rockTex, bumpMap: rockTex, bumpScale: 0.8, roughness: 0.95, flatShading: true
    }));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    const group = new THREE.Group();
    group.add(mesh);
    const p = getBodyPos(hz);
    group.position.copy(toScene(p.x, p.y));
    levelGroup.add(group);

    if (!hz.hideLabel) {
      const label = makeLabel(hz.name, '#a8a29e', 9);
      label.position.set(0, -(hz.radius + 12), 0);
      group.add(label);
    }
    // Patrolling asteroids show their path so players can time a gap
    if (hz.orbitCenter) {
      const track = makeCircleLine(hz.orbitRadius, 0xf87171, 0.18, true, 3, 6);
      track.position.copy(toScene(hz.orbitCenter.x * WORLD_W, hz.orbitCenter.y * WORLD_H));
      levelGroup.add(track);
    }
    levelObjects.hazards.push({ data: hz, group, mesh, spin: 0.2 + Math.random() * 0.5 });
  });

  // Science beacons
  lvl.beacons.forEach((bc, idx) => {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(8),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.4, transparent: true })
    );
    mesh.castShadow = true;
    const glow = makeGlowSprite('#facc15', 34, 0.6);
    const label = makeLabel(`BEACON ${idx + 1}`, '#fde047', 9);
    label.position.set(0, 18, 0);
    // Pickup ring: dim gold normally, bright cyan when the predicted path will collect it
    const pickup = makeCircleLine(probe.radius + 14, 0xfacc15, 0.35, false);
    group.add(mesh, glow, label, pickup);
    const p = getCoords(bc);
    group.position.copy(toScene(p.x, p.y));
    levelGroup.add(group);
    levelObjects.beacons.push({ data: bc, mesh, glow, label, pickup, phase: idx });
  });
}

function syncScene(now, dt) {
  const t = now * 0.001;

  // Bodies follow their (possibly orbiting) positions and spin on their axes
  levelObjects.bodies.forEach(o => {
    const p = getBodyPos(o.data);
    o.group.position.copy(toScene(p.x, p.y));
    o.mesh.rotation.y += dt * 0.35;
  });
  levelObjects.earth.mesh.rotation.y += dt * 0.25;
  levelObjects.earth.clouds.rotation.y += dt * 0.33; // clouds drift slightly faster than the surface

  // Earth prompt ring pulses while waiting for input
  const aimRing = levelObjects.aimRing;
  aimRing.visible = gameState === 'AIMING' && !aim.set;
  const pulse = 1 + Math.sin(now * 0.006) * 4 / (currentLevel.earth.radius + 10);
  aimRing.scale.set(pulse, pulse, 1);

  // Capture zone: outer ring pulses and turns one way, inner ring the other
  const tp = 1 + Math.sin(t * 3) * 0.03;
  levelObjects.targetRing.scale.set(tp, tp, 1);
  levelObjects.targetRing.rotation.z -= dt * 0.35;
  levelObjects.targetInner.rotation.z += dt * 0.5;
  if (levelObjects.targetCore) {
    levelObjects.targetCore.rotation.z = t * 0.5;
    levelObjects.targetBeacon.material.emissiveIntensity = 0.6 + 0.6 * Math.max(0, Math.sin(t * 4));
  }

  levelObjects.gasMaterials.forEach(m => { m.uniforms.time.value += dt; });

  levelObjects.hazards.forEach(h => {
    if (h.data.orbitCenter) {
      const p = getBodyPos(h.data);
      h.group.position.copy(toScene(p.x, p.y));
    }
    h.mesh.rotation.x += dt * h.spin;
    h.mesh.rotation.y += dt * h.spin * 0.7;
  });

  levelObjects.beacons.forEach((b, i) => {
    const willHit = gameState === 'AIMING' && prediction && prediction.hits.has(i);
    b.pickup.visible = !b.data.collected;
    b.pickup.material.color.set(willHit ? 0x38bdf8 : 0xfacc15);
    b.pickup.material.opacity = willHit ? 0.95 : 0.35;
    if (b.data.collected) {
      b.mesh.material.opacity = 0.15;
      b.mesh.scale.setScalar(0.6);
      b.glow.visible = false;
      b.label.element.style.opacity = '0';
    } else {
      const s = 1 + Math.sin(now * 0.005 + b.phase) * 0.25;
      b.mesh.material.opacity = 1;
      b.mesh.scale.setScalar(s);
      b.mesh.rotation.z += dt * 1.6;
      b.mesh.rotation.x = Math.sin(t + b.phase) * 0.5;
      b.glow.visible = true;
      b.label.element.style.opacity = '1';
    }
  });

  // Aim: launch arrow, slingshot cord while dragging, and the predicted path
  const showAim = gameState === 'AIMING' && aim.set;
  const dragging = showAim && isAiming;
  predPoints.visible = predEnd.visible = aimArrow.visible = showAim;
  cordLine.visible = reticle.visible = aimLabel.visible = dragging;
  prediction = null;
  if (showAim) {
    const earthPos = getCoords(currentLevel.earth);
    const av = getAimVector();

    // Arrow from Earth's surface; length shows power
    const len = 12 + aim.power * 60;
    const base = getLaunchPoint(aim.angle);
    aimArrow.position.copy(toScene(base.x, base.y, 2));
    aimArrow.rotation.z = -aim.angle;
    aimArrow.userData.shaft.scale.x = len;
    aimArrow.userData.shaft.position.x = len / 2;
    aimArrow.userData.head.position.x = len + 5;

    if (dragging) {
      const dp = aimDragPoint();
      const cordArr = cordLine.geometry.attributes.position.array;
      writeScene(cordArr, 0, earthPos.x, earthPos.y);
      writeScene(cordArr, 1, dp.x, dp.y);
      cordLine.geometry.attributes.position.needsUpdate = true;
      cordLine.geometry.setDrawRange(0, 2);
      reticle.position.copy(toScene(dp.x, dp.y));
      aimLabel.element.textContent = `Δv: ${av.thrustPower.toFixed(1)} km/s`;
    }

    // While the autopilot waits for its launch window, preview the path from that future moment
    const ahead = autopilot && autopilot.phase === 'wait' ? Math.max(0, autopilot.launchTick - tickCount) : 0;
    prediction = calculatePredictiveTrajectory(base.x, base.y, av.vx, av.vy, PREDICTION_STEPS, ahead);
    const pts = prediction.points;

    // Glowing dots on every other point, fading toward the end of the path
    const pArr = predPoints.geometry.attributes.position.array;
    const cArr = predPoints.geometry.attributes.color.array;
    const cyan = cachedColor('#38bdf8');
    let n = 0;
    for (let i = 1; i < pts.length && n < PRED_DOTS; i += 2, n++) {
      writeScene(pArr, n, pts[i].x, pts[i].y);
      const f = 1 - i / pts.length;
      const a = 0.25 + 0.75 * f;
      cArr[n * 3] = cyan.r * a; cArr[n * 3 + 1] = cyan.g * a; cArr[n * 3 + 2] = cyan.b * a;
    }
    predPoints.geometry.attributes.position.needsUpdate = true;
    predPoints.geometry.attributes.color.needsUpdate = true;
    predPoints.geometry.setDrawRange(0, n);

    // Outcome marker: pulsing green ring = capture, red X = crash, grey dot = miss
    const last = pts[pts.length - 1];
    predEnd.position.copy(toScene(last.x, last.y, 1));
    const { ring, cross, missDot } = predEnd.userData;
    ring.visible = prediction.end === 'capture';
    cross.visible = prediction.end === 'crash';
    missDot.visible = !ring.visible && !cross.visible;
    ring.scale.setScalar(1 + Math.sin(t * 6) * 0.15);
  }

  // Ghost of the previous flight
  const gPos = ghostLine.geometry.attributes.position.array;
  const gDist = ghostLine.geometry.attributes.lineDistance.array;
  let gAcc = 0;
  for (let i = 0; i < ghostTrail.length; i++) {
    writeScene(gPos, i, ghostTrail[i].x, ghostTrail[i].y);
    if (i > 0) gAcc += Math.hypot(ghostTrail[i].x - ghostTrail[i - 1].x, ghostTrail[i].y - ghostTrail[i - 1].y);
    gDist[i] = gAcc;
  }
  ghostLine.geometry.attributes.position.needsUpdate = true;
  ghostLine.geometry.attributes.lineDistance.needsUpdate = true;
  ghostLine.geometry.setDrawRange(0, ghostTrail.length > 1 ? ghostTrail.length : 0);

  // Live flight trail, brightening toward the probe
  const trail = probe.trail;
  const tPos = trailLine.geometry.attributes.position.array;
  const tCol = trailLine.geometry.attributes.color.array;
  const trailColor = cachedColor('#38bdf8');
  for (let i = 0; i < trail.length; i++) {
    writeScene(tPos, i, trail[i].x, trail[i].y);
    const a = 0.15 + 0.85 * (i / trail.length);
    tCol[i * 3] = trailColor.r * a;
    tCol[i * 3 + 1] = trailColor.g * a;
    tCol[i * 3 + 2] = trailColor.b * a;
  }
  trailLine.geometry.attributes.position.needsUpdate = true;
  trailLine.geometry.attributes.color.needsUpdate = true;
  trailLine.geometry.setDrawRange(0, trail.length > 1 ? trail.length : 0);

  // Particles
  const pPos = particlePoints.geometry.attributes.position.array;
  const pCol = particlePoints.geometry.attributes.color.array;
  const count = Math.min(particles.length, MAX_PARTICLES);
  for (let i = 0; i < count; i++) {
    const p = particles[particles.length - count + i];
    writeScene(pPos, i, p.x, p.y);
    const c = cachedColor(p.color);
    const l = Math.max(0, p.life);
    pCol[i * 3] = c.r * l;
    pCol[i * 3 + 1] = c.g * l;
    pCol[i * 3 + 2] = c.b * l;
  }
  particlePoints.geometry.attributes.position.needsUpdate = true;
  particlePoints.geometry.attributes.color.needsUpdate = true;
  particlePoints.geometry.setDrawRange(0, count);

  // Probe vessel
  probeGroup.visible = probe.alive && gameState !== 'AIMING';
  if (probeGroup.visible) {
    probeGroup.position.copy(toScene(probe.x, probe.y));
    probeGroup.rotation.z = Math.atan2(-probe.vy, probe.vx);
  }
}
