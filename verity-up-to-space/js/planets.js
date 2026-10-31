// Verity Up To Space 3D: Planet, Earth and relay-station models (shaders, procedural textures, glow).

// ---------- Planet look: gas giants are animated shaders, rocky worlds get noise textures ----------
// tilt: how far the pole leans toward the camera (radians), so the top view shows bands / rings in 3D.
// atmo: rim + halo glow colour (null = airless, faint halo only).
const PLANET_STYLES = {
  Moon:      { kind: 'rock', paint: 'moon',     atmo: null,      tilt: 0.3 },
  Mars:      { kind: 'rock', paint: 'mars',     atmo: '#ff9f6e', tilt: 0.45 },
  Vesta:     { kind: 'rock', paint: 'asteroid', atmo: null,      tilt: 0.3 },
  Ceres:     { kind: 'rock', paint: 'asteroid', atmo: null,      tilt: 0.3 },
  Ganymede:  { kind: 'rock', paint: 'ganymede', atmo: null,      tilt: 0.3 },
  Io:        { kind: 'rock', paint: 'io',       atmo: '#ffd27a', tilt: 0.3 },
  Enceladus: { kind: 'rock', paint: 'icy',      atmo: '#cfeaff', tilt: 0.3 },
  Triton:    { kind: 'rock', paint: 'icy',      atmo: '#ffd6e0', tilt: 0.3 },
  Phobos:    { kind: 'rock', paint: 'asteroid', atmo: null,      tilt: 0.3 },
  Deimos:    { kind: 'rock', paint: 'asteroid', atmo: null,      tilt: 0.3 },
  Titania:   { kind: 'rock', paint: 'icy',      atmo: null,      tilt: 0.3 },
  Venus:   { kind: 'gas', atmo: '#ffe2a0', tilt: 0.3,
             gas: { c1: '#ecd9a4', c2: '#cfae74', c3: '#f8f0d8', bands: 5, turb: 7, flow: 0.12, spot: 0 } },
  Titan:   { kind: 'gas', atmo: '#ffb060', tilt: 0.3,
             gas: { c1: '#d98c3a', c2: '#b8702c', c3: '#eeb066', bands: 4, turb: 2.5, flow: 0.05, spot: 0 } },
  Jupiter: { kind: 'gas', atmo: '#ffd2a0', tilt: 0.4,
             gas: { c1: '#efdcbc', c2: '#b37b52', c3: '#f7efe2', bands: 14, turb: 3.4, flow: 0.07, spot: 1 } },
  // Pole leans sideways (yaw) as well, so the rings read as an open ellipse in both TOP and ISO views
  Saturn:  { kind: 'gas', atmo: '#ffe6b0', tilt: Math.PI / 2, yaw: 1.0,
             gas: { c1: '#eedcab', c2: '#c8a26a', c3: '#f7ecd2', bands: 18, turb: 1.6, flow: 0.05, spot: 0 } },
  Uranus:  { kind: 'gas', atmo: '#a6f2ff', tilt: 1.35,
             gas: { c1: '#a6e8ee', c2: '#86d0da', c3: '#d2f6f8', bands: 8, turb: 1.2, flow: 0.03, spot: 0 } },
  Neptune: { kind: 'gas', atmo: '#6fa4ff', tilt: 0.45,
             gas: { c1: '#4677e6', c2: '#2a50b6', c3: '#8fb4ff', bands: 10, turb: 2.8, flow: 0.09, spot: 0.8, spotColor: '#1a2f78' } }
};

const SUN_DIR = new THREE.Vector3(-700, 500, 1400).normalize(); // matches the directional light

const GAS_VERTEX = `
  varying vec3 vPos;
  varying vec3 vN;
  varying vec3 vView;
  void main() {
    vPos = position;
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vView = cameraPosition - wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;

// Banded cloud deck: zonal jets flow in alternating directions by latitude, with
// turbulent noise distorting the band edges, plus an optional drifting storm spot
const GAS_FRAGMENT = `
  uniform float time;
  uniform vec3 c1, c2, c3, atmo, spotColor, sunDir;
  uniform float bands, turb, flow, spot;
  varying vec3 vPos;
  varying vec3 vN;
  varying vec3 vView;
  float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float noise(vec3 x) {
    vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
  void main() {
    vec3 p = normalize(vPos);
    float lat = asin(clamp(p.y, -1.0, 1.0));
    float lon = atan(p.z, p.x);
    float l2 = lon + time * flow * sin(lat * bands * 0.5);
    vec3 q = vec3(cos(l2) * cos(lat), sin(lat), sin(l2) * cos(lat));
    float n = fbm(q * 3.0 + vec3(0.0, 0.0, time * 0.03));
    float w = fbm(q * 7.0 - vec3(time * 0.05));
    float b = sin(lat * bands + (n - 0.5) * turb + (w - 0.5) * turb * 0.5);
    vec3 col = mix(c1, c2, smoothstep(-0.5, 0.5, b));
    col = mix(col, c3, smoothstep(0.55, 0.8, n) * 0.6);
    if (spot > 0.0) {
      float dl = (lat + 0.38) / 0.11;
      float dlon = atan(sin(l2 - 1.2), cos(l2 - 1.2)) / 0.28;
      col = mix(col, spotColor, smoothstep(1.0, 0.15, dl * dl + dlon * dlon) * spot);
    }
    vec3 nn = normalize(vN);
    float ndl = max(dot(nn, sunDir), 0.0);
    col *= 0.1 + 0.95 * pow(ndl, 0.8);
    float rim = pow(1.0 - max(dot(nn, normalize(vView)), 0.0), 3.0);
    col += atmo * rim * 0.7 * (0.3 + ndl);
    gl_FragColor = vec4(col, 1.0);
  }`;

// Rocky surfaces painted from the same seamless sphere noise as Earth
const ROCK_PAINTERS = {
  moon(x, y, z) {
    let v = 0.55 + (fbm(x * 3, y * 3, z * 3, 5) - 0.5) * 0.7;
    if (fbm(x * 1.3 + 5, y * 1.3, z * 1.3, 3) > 0.55) v -= 0.18;  // dark maria
    v += craterNoise(x, y, z, 7) * 0.25;
    const g = Math.max(0, Math.min(1, v)) * 230;
    return [g, g, g * 1.02];
  },
  mars(x, y, z, lat) {
    const n = fbm(x * 2.5 + 3, y * 2.5, z * 2.5, 5);
    let c = [150 + 70 * n, 60 + 50 * n, 30 + 30 * n];
    if (fbm(x * 1.5 + 9, y * 1.5, z * 1.5, 3) > 0.58) c = [c[0] * 0.65, c[1] * 0.6, c[2] * 0.6];
    if (Math.abs(lat) > 1.3) c = [240, 230, 225];
    return c;
  },
  asteroid(x, y, z) {
    const v = 0.5 + (fbm(x * 4 + 7, y * 4, z * 4, 5) - 0.5) * 0.8 + craterNoise(x, y, z, 9) * 0.3;
    const g = Math.max(0, Math.min(1, v));
    return [g * 165, g * 150, g * 135];
  },
  ganymede(x, y, z) {
    const n = fbm(x * 3 + 20, y * 3, z * 3, 5);
    const c = n > 0.5 ? [175, 165, 175] : [110, 100, 115];
    const k = craterNoise(x, y, z, 5) * 40;
    return c.map(v => v + k);
  },
  icy(x, y, z) {
    const n = fbm(x * 3 + 60, y * 3, z * 3, 4);
    const line = Math.abs(Math.sin(x * 7 + fbm(x * 6, y * 6, z * 6, 2) * 6));
    const crack = line < 0.08 ? 0.62 : 1;
    return [(215 + n * 35) * crack, (220 + n * 30) * crack, (232 + n * 20) * crack];
  },
  io(x, y, z) {
    const n = fbm(x * 3 + 30, y * 3, z * 3, 5);
    let c = [230 - n * 40, 200 - n * 30, 70 + n * 30];
    const v = noise3(x * 6 + 50, y * 6, z * 6);
    if (v > 0.82) c = [60, 35, 20];        // volcanic vents
    else if (v > 0.74) c = [200, 90, 40];  // lava flows
    return c;
  }
};

function craterNoise(x, y, z, scale) {
  const n = noise3(x * scale + 100, y * scale, z * scale);
  if (n > 0.9) return -0.6;
  if (n > 0.86) return 0.4;
  return 0;
}

const rockTextureCache = {};
function getRockTexture(paint) {
  if (rockTextureCache[paint]) return rockTextureCache[paint];
  const W = 384, H = 192;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(W, H);
  const painter = ROCK_PAINTERS[paint] || ROCK_PAINTERS.moon;
  for (let j = 0; j < H; j++) {
    const lat = Math.PI / 2 - (j + 0.5) / H * Math.PI;
    const cl = Math.cos(lat), y = Math.sin(lat);
    for (let i = 0; i < W; i++) {
      const lon = (i + 0.5) / W * Math.PI * 2 - Math.PI;
      const col = painter(cl * Math.sin(lon), y, cl * Math.cos(lon), lat, lon);
      const k = (j * W + i) * 4;
      img.data[k] = col[0]; img.data[k + 1] = col[1]; img.data[k + 2] = col[2]; img.data[k + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  rockTextureCache[paint] = new THREE.CanvasTexture(c);
  return rockTextureCache[paint];
}

function isSharedTexture(map) {
  if (!map) return false;
  if (map === glowTexture) return true;
  if (earthTextures && (map === earthTextures.surface || map === earthTextures.clouds)) return true;
  return Object.values(rockTextureCache).includes(map);
}

// Returns { group, mesh, gasMaterial } — group carries the axial tilt, mesh spins inside it
function makePlanet(b) {
  const style = PLANET_STYLES[b.name] || { kind: 'rock', paint: 'moon', atmo: null, tilt: 0.3 };
  const group = new THREE.Group();
  group.rotation.order = 'YXZ'; // tilt the pole toward the camera first, then swing it sideways
  group.rotation.x = style.tilt;
  group.rotation.y = style.yaw || 0;
  let mesh, gasMaterial = null;
  if (style.kind === 'gas') {
    const g = style.gas;
    gasMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: Math.random() * 100 },
        c1: { value: new THREE.Color(g.c1) }, c2: { value: new THREE.Color(g.c2) }, c3: { value: new THREE.Color(g.c3) },
        atmo: { value: new THREE.Color(style.atmo) },
        spotColor: { value: new THREE.Color(g.spotColor || '#c45a3c') },
        sunDir: { value: SUN_DIR },
        bands: { value: g.bands }, turb: { value: g.turb }, flow: { value: g.flow }, spot: { value: g.spot }
      },
      vertexShader: GAS_VERTEX,
      fragmentShader: GAS_FRAGMENT
    });
    mesh = new THREE.Mesh(new THREE.SphereGeometry(b.radius, 64, 48), gasMaterial);
  } else {
    const tex = getRockTexture(style.paint);
    mesh = new THREE.Mesh(
      new THREE.SphereGeometry(b.radius, 48, 32),
      new THREE.MeshStandardMaterial({ map: tex, bumpMap: tex, bumpScale: 0.6, roughness: 0.95, metalness: 0 })
    );
  }
  mesh.castShadow = true;
  mesh.receiveShadow = style.kind !== 'gas';
  group.add(mesh);

  if (style.atmo) {
    group.add(makeAtmosphere(b.radius * 1.02, style.atmo, false, 0.8));
    group.add(makeAtmosphere(b.radius * 1.22, style.atmo, true, 0.9));
  }

  if (b.rings) {
    // Banded rings with a Cassini-style gap, lying in the planet's equatorial plane
    const ringCol = new THREE.Color(b.color).lerp(new THREE.Color('#fef3c7'), 0.55);
    [[1.25, 1.55, 0.45], [1.6, 1.98, 0.7], [2.04, 2.3, 0.35]].forEach(([r0, r1, op]) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(b.radius * r0, b.radius * r1, 96),
        new THREE.MeshStandardMaterial({ color: ringCol, transparent: true, opacity: op, side: THREE.DoubleSide, roughness: 0.9, depthWrite: false })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.receiveShadow = true;
      group.add(ring);
    });
  }
  return { group, mesh, gasMaterial };
}

// ---------- Earth model (procedural, ported from the teammate canvas build) ----------
// 3D value noise sampled on the unit sphere, so the texture wraps with no seams
function noiseHash(x, y, z) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return (h & 0xffff) / 0xffff;
}
function noise3(x, y, z) {
  const sm = t => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = sm(x - xi), yf = sm(y - yi), zf = sm(z - zi);
  const c = (dx, dy, dz) => noiseHash(xi + dx, yi + dy, zi + dz);
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), xf), lerp(c(0, 1, 0), c(1, 1, 0), xf), yf),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), xf), lerp(c(0, 1, 1), c(1, 1, 1), xf), yf),
    zf
  );
}
function fbm(x, y, z, octaves) {
  let v = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    v += noise3(x * f, y * f, z * f) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return v / norm;
}

// Equirectangular surface + separate cloud layer; built once and reused
let earthTextures = null;
function getEarthTextures() {
  if (earthTextures) return earthTextures;
  const W = 512, H = 256;
  const surf = document.createElement('canvas');
  const cloud = document.createElement('canvas');
  surf.width = cloud.width = W;
  surf.height = cloud.height = H;
  const sImg = surf.getContext('2d').createImageData(W, H);
  const cImg = cloud.getContext('2d').createImageData(W, H);
  const lerp = (a, b, t) => a + (b - a) * t;
  for (let j = 0; j < H; j++) {
    const lat = Math.PI / 2 - (j + 0.5) / H * Math.PI;
    const cl = Math.cos(lat), y = Math.sin(lat), alat = Math.abs(lat);
    for (let i = 0; i < W; i++) {
      const lon = (i + 0.5) / W * Math.PI * 2 - Math.PI;
      const x = cl * Math.sin(lon), z = cl * Math.cos(lon);
      const n = fbm(x * 2.2 + 11, y * 2.2, z * 2.2, 5);
      let c;
      if (alat > 1.22) c = [235, 242, 250];                                   // ice caps
      else if (n > 0.53) {
        const t = Math.min(1, (n - 0.53) * 6);
        c = alat > 0.9 ? [150, 160, 140] : [lerp(64, 150, t), lerp(140, 120, t), lerp(60, 70, t)]; // land
      } else {
        const d = Math.min(1, (0.53 - n) * 5);
        c = [lerp(40, 14, d), lerp(110, 50, d), lerp(190, 140, d)];          // ocean
      }
      const k = (j * W + i) * 4;
      sImg.data[k] = c[0]; sImg.data[k + 1] = c[1]; sImg.data[k + 2] = c[2]; sImg.data[k + 3] = 255;
      const cv = fbm(x * 3 + 40, y * 3, z * 3, 4);
      cImg.data[k] = cImg.data[k + 1] = cImg.data[k + 2] = 255;
      cImg.data[k + 3] = cv > 0.56 ? Math.min(0.85, (cv - 0.56) * 4) * 255 : 0;
    }
  }
  surf.getContext('2d').putImageData(sImg, 0, 0);
  cloud.getContext('2d').putImageData(cImg, 0, 0);
  earthTextures = { surface: new THREE.CanvasTexture(surf), clouds: new THREE.CanvasTexture(cloud) };
  return earthTextures;
}

// Fresnel atmosphere: inner rim tint (front faces) + soft outer halo (back faces)
function makeAtmosphere(radius, color, backSide, strength = 1) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(radius, 48, 32),
    new THREE.ShaderMaterial({
      uniforms: { glowColor: { value: new THREE.Color(color).multiplyScalar(strength) } },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: backSide ? `
        uniform vec3 glowColor;
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          // Back faces: -dot is 0 at the halo's outer edge and grows toward the planet's limb,
          // so the glow is strongest next to the planet and fades smoothly to nothing
          float x = clamp(-dot(vNormal, vView), 0.0, 1.0);
          float a = pow(x, 2.0) * 1.5;
          gl_FragColor = vec4(glowColor, a);
        }` : `
        uniform vec3 glowColor;
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          float rim = 1.0 - max(dot(vNormal, vView), 0.0);
          gl_FragColor = vec4(glowColor, pow(rim, 3.0) * 0.9);
        }`,
      side: backSide ? THREE.BackSide : THREE.FrontSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    })
  );
}

function makeEarth(data) {
  const tex = getEarthTextures();
  const r = data.radius;
  const globe = new THREE.Group();
  globe.rotation.z = 0.41; // axial tilt
  const surface = new THREE.Mesh(
    new THREE.SphereGeometry(r, 64, 48),
    new THREE.MeshStandardMaterial({ map: tex.surface, roughness: 0.75, metalness: 0.0, emissive: 0x0b2440, emissiveIntensity: 0.35 })
  );
  surface.castShadow = true;
  surface.receiveShadow = true;
  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(r * 1.025, 64, 48),
    new THREE.MeshStandardMaterial({ map: tex.clouds, transparent: true, depthWrite: false, roughness: 1 })
  );
  globe.add(surface, clouds);
  globe.add(makeAtmosphere(r * 1.03, '#6eb4ff', false));
  globe.add(makeAtmosphere(r * 1.28, '#5aa8ff', true));
  return { globe, surface, clouds };
}

// ---------- Relay station (ported from the teammate mesh: core, solar wings, boom, beacon) ----------
function makeStation(color, scale) {
  const g = new THREE.Group();
  const part = (w, h, d, x, y, z, col, emissive) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.45, metalness: 0.55, emissive: col, emissiveIntensity: emissive })
    );
    m.position.set(x, y, z);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  // Axes: x across, y along the boom, z out of the orbital plane (toward a TOP camera)
  part(1.1, 1.1, 1.1, 0, 0, 0, 0xdce4ec, 0.2);           // core
  part(1.8, 0.8, 0.08, 1.6, 0, 0, 0x286edc, 0.35);       // solar wing
  part(1.8, 0.8, 0.08, -1.6, 0, 0, 0x286edc, 0.35);      // solar wing
  part(0.36, 1.6, 0.36, 0, 1.4, 0, 0xc8d2dc, 0.1);       // docking boom
  const beacon = part(0.24, 0.24, 0.7, 0, 0, 0.9, new THREE.Color(color).getHex(), 1.0); // beacon light
  g.scale.setScalar(scale);
  g.rotation.order = 'ZXY'; // rotation.z spins it about the plane normal; x is a fixed tilt
  g.rotation.x = 0.3;
  return { station: g, beacon };
}
