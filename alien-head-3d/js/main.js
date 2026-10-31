/*
 * Alien Head 3D — scene, camera button, and turning face data into
 * alien expressions. Without a camera the alien runs a demo and follows
 * the mouse.
 */
(function () {
  'use strict';

  const T = window.THREE;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------- Scene ----------
  const canvas = $('scene');
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = T.ACESFilmicToneMapping;
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(32, 1, 0.1, 200);

  scene.add(new T.HemisphereLight(0xcffafe, 0x1e1b4b, 1.1));
  const key = new T.DirectionalLight(0xffffff, 2.6);
  key.position.set(-2.5, 3, 4);
  scene.add(key);
  const rim = new T.DirectionalLight(0x67e8f9, 3);
  rim.position.set(3, 1.5, -3);
  scene.add(rim);
  const rim2 = new T.DirectionalLight(0xa855f7, 2);
  rim2.position.set(-3, -1, -2.5);
  scene.add(rim2);

  (function stars() {
    const n = 1400, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, r = 30 + Math.random() * 40, s = Math.sqrt(1 - u * u);
      pos.set([s * Math.cos(t) * r, u * r, -Math.abs(s * Math.sin(t) * r) - 10], i * 3);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3));
    scene.add(new T.Points(g, new T.PointsMaterial({ color: 0xffffff, size: 0.14, transparent: true, opacity: 0.8 })));
  })();

  const alien = new window.AlienHead(scene);

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Fit about 5.4 units of height, or 3.8 of width on narrow screens,
    // aimed low so the head sits above the controls at the bottom
    const half = Math.tan((camera.fov * Math.PI) / 360);
    const dist = Math.max(2.7 / half, 1.9 / (half * camera.aspect));
    camera.position.set(0, -0.2, dist);
    camera.lookAt(0, -0.45, 0);
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // ---------- Settings ----------
  function load(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v === '1'; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, v ? '1' : '0'); } catch (e) { /* storage off */ } }
  let mirror = load('alienMirror', true);
  let preview = load('alienPreview', false);

  // ---------- Face data -> alien expression ----------
  const eul = new T.Euler(0, 0, 0, 'YXZ');
  const mat = new T.Matrix4();
  const quat = new T.Quaternion();
  const v1 = new T.Vector3(), v2 = new T.Vector3();

  function fromFace(face) {
    const s = face.shapes;
    const g = (n) => s[n] || 0;
    // The person's own [left, right] value for a blendshape pair
    const own = (n) => face.ownLeftIsLeft ? [g(n + 'Left'), g(n + 'Right')] : [g(n + 'Right'), g(n + 'Left')];
    // ...and on which side of the screen to show it. In a mirror your left is on the left.
    const lr = (n) => { const o = own(n); return mirror ? o : [o[1], o[0]]; };
    const dir = mirror ? -1 : 1; // screen x direction of the person's own left

    const blink = lr('eyeBlink').map((v) => clamp((v - 0.15) / 0.45, 0, 1));
    const [wideL, wideR] = lr('eyeWide');
    const [squintL, squintR] = lr('eyeSquint');
    const [browOuterL, browOuterR] = lr('browOuterUp');
    const [browDownL, browDownR] = lr('browDown');
    const [smileL, smileR] = lr('mouthSmile');
    const [frownL, frownR] = lr('mouthFrown');
    const [stretchL, stretchR] = lr('mouthStretch');
    const lookIn = own('eyeLookIn'), lookOut = own('eyeLookOut');
    const lookOwnLeft = (lookOut[0] + lookIn[1] - lookIn[0] - lookOut[1]) / 2;
    const lookUp = (g('eyeLookUpLeft') + g('eyeLookUpRight') - g('eyeLookDownLeft') - g('eyeLookDownRight')) / 2;
    const mouthSide = own('mouth'); // mouthLeft / mouthRight

    const out = {
      blinkL: blink[0], blinkR: blink[1], wideL, wideR, squintL, squintR,
      browInnerUp: g('browInnerUp'), browOuterL, browOuterR, browDownL, browDownR,
      jawOpen: g('jawOpen'), smileL, smileR, frownL, frownR, stretchL, stretchR,
      pucker: g('mouthPucker'), funnel: g('mouthFunnel'), mouthShift: dir * (mouthSide[0] - mouthSide[1]),
      upperUp: (g('mouthUpperUpLeft') + g('mouthUpperUpRight')) / 2,
      lowerDown: (g('mouthLowerDownLeft') + g('mouthLowerDownRight')) / 2,
      cheekPuff: g('cheekPuff'),
      gazeX: dir * lookOwnLeft * 1.6, gazeY: lookUp * 1.6
    };

    if (face.matrix) {
      // Head pose in camera space (x = right of the raw image, y up, z toward
      // the camera). Turning to your own left points the nose to the right of
      // the raw image, so yaw and roll flip with the mirror like everything else.
      mat.fromArray(face.matrix);
      mat.decompose(v1, quat, v2);
      eul.setFromQuaternion(quat, 'YXZ');
      out.pitch = clamp(eul.x, -0.8, 0.8);
      out.yaw = clamp(dir * eul.y, -1, 1);
      out.roll = clamp(dir * eul.z, -0.8, 0.8);
    }
    return out;
  }

  // ---------- Idle and demo (no face) ----------
  const DEMO = [
    { name: 'neutral', e: {} },
    { name: 'happy', e: { smileL: 0.9, smileR: 0.9, squintL: 0.3, squintR: 0.3 } },
    { name: 'surprised', e: { jawOpen: 0.75, browInnerUp: 0.9, browOuterL: 0.8, browOuterR: 0.8, wideL: 0.8, wideR: 0.8, funnel: 0.3 } },
    { name: 'angry', e: { browDownL: 0.9, browDownR: 0.9, frownL: 0.5, frownR: 0.5, squintL: 0.5, squintR: 0.5, stretchL: 0.4, stretchR: 0.4 } },
    { name: 'kissy', e: { pucker: 0.95, squintL: 0.2, squintR: 0.2 } },
    { name: 'wink', e: { blinkR: 1, smileL: 0.6, smileR: 0.8, squintR: 0.4 } },
    { name: 'sad', e: { browInnerUp: 0.9, frownL: 0.8, frownR: 0.8, gazeY: -0.6 } },
    { name: 'puffed', e: { cheekPuff: 1, pucker: 0.3, wideL: 0.3, wideR: 0.3 } }
  ];
  const pointer = { x: 0, y: 0 };
  window.addEventListener('pointermove', (ev) => {
    pointer.x = (ev.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (ev.clientY / window.innerHeight) * 2 - 1;
  });
  let nextBlink = 1;

  function idle(time, demo) {
    const out = {};
    if (demo) Object.assign(out, DEMO[Math.floor(time / 2.6) % DEMO.length].e);
    // Look toward the mouse, with a gentle sway
    out.yaw = pointer.x * 0.5 + Math.sin(time * 0.5) * 0.08;
    out.pitch = pointer.y * 0.3 + Math.sin(time * 0.37) * 0.04;
    out.roll = Math.sin(time * 0.43) * 0.05;
    if (out.gazeX === undefined) out.gazeX = pointer.x * 0.8;
    if (out.gazeY === undefined) out.gazeY = -pointer.y * 0.6;
    if (time > nextBlink) nextBlink = time + 2.5 + Math.random() * 3;
    if (nextBlink - time > 2.35 && nextBlink - time < 2.5) { out.blinkL = 1; out.blinkR = 1; }
    return out;
  }

  // ---------- Mood ----------
  const MOODS = {
    neutral: '😐 Neutral', happy: '😄 Happy', surprised: '😲 Surprised', angry: '😠 Grumpy',
    sad: '😢 Sad', kissy: '😘 Kissy', wink: '😉 Wink', puffed: '🐡 Puffed up'
  };
  function moodOf(e) {
    const smile = ((e.smileL || 0) + (e.smileR || 0)) / 2;
    const frown = ((e.frownL || 0) + (e.frownR || 0)) / 2;
    const down = ((e.browDownL || 0) + (e.browDownR || 0)) / 2;
    if ((e.jawOpen || 0) > 0.45 && (e.browInnerUp || 0) > 0.25) return 'surprised';
    if (Math.abs((e.blinkL || 0) - (e.blinkR || 0)) > 0.6) return 'wink';
    if (smile > 0.45) return 'happy';
    if ((e.pucker || 0) > 0.55 && (e.cheekPuff || 0) < 0.5) return 'kissy';
    if ((e.cheekPuff || 0) > 0.45) return 'puffed';
    if (down > 0.35) return 'angry';
    if (frown > 0.3 || ((e.browInnerUp || 0) > 0.5 && smile < 0.1)) return 'sad';
    return 'neutral';
  }

  // ---------- UI ----------
  const video = $('video');
  const tracker = new window.FaceTracker(video);
  let lastFaceAt = -10;
  let faceTarget = null;
  let mood = '';
  let moodLabel = '';
  let forced = null; // test hook: AlienMirror.force({ smileL: 1, ... })
  let speechFace = null;
  let speechFaceUntil = 0;

  function status(text) { $('status').textContent = text; }
  function renderButtons() {
    $('camBtn').textContent = tracker.running ? 'Stop camera' : 'Start camera';
    $('camBtn').classList.toggle('primary', !tracker.running);
    $('mirrorBtn').textContent = 'Mirror: ' + (mirror ? 'on' : 'off');
    $('previewBtn').textContent = 'Preview: ' + (preview ? 'on' : 'off');
    video.classList.toggle('hidden', !(preview && tracker.running));
  }

  async function startCamera() {
    const btn = $('camBtn');
    btn.disabled = true;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('This browser can\'t use the camera here. Open the page from https:// or localhost.');
      }
      status('Asking for camera access…');
      await tracker.startCamera();
      if (!tracker.landmarker) {
        status('Loading face tracker (about 13 MB, first time only)…');
        await tracker.load();
      }
      status('Tracking. Make faces at the alien!');
    } catch (e) {
      tracker.stopCamera();
      const denied = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
      status(denied ? 'Camera blocked. Allow camera access in the address bar, then try again.'
        : e && e.name === 'NotFoundError' ? 'No camera found.'
          : 'Could not start: ' + (e && e.message ? e.message : e));
    }
    btn.disabled = false;
    renderButtons();
  }

  $('camBtn').addEventListener('click', () => {
    if (tracker.running) {
      tracker.stopCamera();
      faceTarget = null;
      status('Camera off. Demo mode.');
      renderButtons();
    } else {
      startCamera();
    }
  });
  $('mirrorBtn').addEventListener('click', () => { mirror = !mirror; save('alienMirror', mirror); renderButtons(); });
  $('previewBtn').addEventListener('click', () => { preview = !preview; save('alienPreview', preview); renderButtons(); });
  renderButtons();

  // ---------- Voice ----------
  const voice = window.AlienVoice;
  const vs = voice.settings;
  const LINES = {
    greet: ["Greetings, Earthling! Make a face and I'll copy it.", 'Oh, hello there! I can see you now. Let us make faces together!'],
    happy: ["Ooh, a smile! Earthlings are adorable when they're happy.", 'That smile could power a whole starship!', 'Happy face detected. My antennae are glowing!'],
    surprised: ['Whoa! What did you see? A comet?', "Surprised? Me too. I'm always surprised.", 'Eyebrows up, mouth open. Classic Earthling shock!'],
    angry: ['Uh oh, grumpy face. Did someone steal your space snacks?', 'Easy there, Earthling. Deep breaths.', 'Such a fierce frown! I am trembling in my antennae.'],
    sad: ["Aww, don't be sad. Want to see my antennae wiggle?", 'Sad face detected. Sending you a cosmic hug!'],
    kissy: ['Mwah! Right back at you, Earthling.', 'Kissy face! On my planet that means hello.'],
    wink: ['Did you just wink at me? Smooth.', 'Wink detected. Your secret is safe with me.'],
    puffed: ['Puffy cheeks! Are you holding your breath in space?', 'You look like a pufferfish from planet Earth!']
  };
  // The warrior sprinkles in a little Klingon: nuqneH ("what do you want?", the
  // usual greeting) and Qapla' ("success!").
  const WARRIOR_LINES = {
    greet: ['nuqneH! I see you, Earthling. Show me your warrior face!', 'Greetings, Earthling. Today is a glorious day to make faces!'],
    happy: ["Qapla'! Your smile brings honor to your house!", "A warrior's grin! Glorious!"],
    surprised: ['You look startled, Earthling. A warrior fears nothing!', 'What is it? An enemy ship? Raise the shields!'],
    angry: ['Yes! That is the face of a true warrior!', "Magnificent fury! Qapla'!"],
    sad: ['Do not weep, Earthling. Sing a battle song instead!', 'Even the mightiest warrior has dark days. Rise again!'],
    kissy: ['Hah! Even warriors need love.', 'A kiss before battle? Bold!'],
    wink: ['A wink? Cunning, like a true strategist.', 'I see your secret plan, Earthling.'],
    puffed: ['You fill your lungs for a battle cry! Let it out!', 'Puffed up like a warrior ready to charge!']
  };
  const TEST_LINES = {
    squeaky: 'Greetings, Earthling! This is my voice. Do you like it?',
    warrior: "nuqneH! I am the alien warrior. Today we make faces with honor. Qapla'!",
    robot: 'Beep boop. Greetings, Earthling. Facial scan complete.',
    custom: 'Greetings, Earthling! This is my voice. Do you like it?'
  };
  // Character presets: voice names to look for (best first), pitch, speed and effect
  const PRESETS = {
    squeaky: { find: ['jessica', 'lily', 'laura', 'alice'], pitch: 1.5, speed: 1.0, effect: 'none' },
    warrior: { find: ['fierce warrior', 'harry', 'callum', 'george', 'roger', 'charlie'], pitch: 0.7, speed: 0.95, effect: 'growl' },
    robot: { find: ['river', 'will', 'liam', 'brian', 'eric'], pitch: 0.95, speed: 0.95, effect: 'robot' }
  };
  const lines = () => (vs.preset === 'warrior' ? WARRIOR_LINES : LINES);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  let greeted = false;
  let reactMood = 'neutral';
  let reactSince = 0;
  let lastReactAt = -100;

  // Say something about a new expression once it has been held for a moment.
  function maybeReact(m, time, seeing) {
    if (!seeing || !vs.enabled) return;
    if (!greeted) { greeted = true; lastReactAt = time; voice.speak(pick(lines().greet)); return; }
    if (m !== reactMood) { reactMood = m; reactSince = time; return; }
    if (!vs.reactions || m === 'neutral' || voice.speaking()) return;
    if (time - reactSince > 0.8 && time - lastReactAt > 7) {
      lastReactAt = time;
      reactSince = Infinity; // once per held expression
      voice.speak(pick(lines()[m]));
    }
  }

  function renderVoice() {
    $('muteBtn').textContent = vs.enabled ? '🔊 Voice: on' : '🔇 Voice: off';
    $('vOn').checked = vs.enabled;
    $('vReact').checked = vs.reactions;
    $('vEngine').value = vs.engine;
    $('vPreset').value = vs.preset;
    $('vEffect').value = vs.effect;
    $('vPitch').value = vs.pitch;
    $('vSpeed').value = vs.speed;
    $('vVol').value = vs.volume;
    $('vPitchOut').textContent = vs.pitch.toFixed(2) + 'x';
    $('vSpeedOut').textContent = vs.speed.toFixed(2) + 'x';
    $('vVolOut').textContent = Math.round(vs.volume * 100) + '%';
    const eleven = vs.engine === 'eleven';
    $('vKeyRow').classList.toggle('hidden', !eleven);
    $('vVoiceRow').classList.toggle('hidden', !eleven);
  }
  function setVoice(changes) {
    Object.assign(vs, changes);
    voice.save();
    renderVoice();
  }

  async function loadVoices() {
    const sel = $('vVoice');
    if (!vs.apiKey) { sel.innerHTML = '<option value="">Add a key to load voices</option>'; return; }
    $('vStatus').textContent = 'Key saved. Loading your ElevenLabs voices…';
    let list;
    try {
      list = await voice.listVoices();
      $('vStatus').textContent = 'Key works! ' + list.length + ' voices loaded. Press Test voice.';
    } catch (e) {
      // A key without "Voices: read" can still speak with ElevenLabs' standard voices
      list = voice.STANDARD_VOICES;
      $('vStatus').textContent = /voices_read/.test(e.message)
        ? "Key saved. It can't list your own voices, so here are ElevenLabs' standard voices. Press Test voice! (To see all your voices, give the key the \"Voices: read\" permission.)"
        : e.message + ' Showing ElevenLabs standard voices instead. Press Test voice to check the key.';
    }
    sel.textContent = '';
    list.forEach((v) => sel.add(new Option(v.name, v.id)));
    if (!list.some((v) => v.id === vs.voiceId) && list.length) { vs.voiceId = list[0].id; voice.save(); }
    sel.value = vs.voiceId;
  }

  voice.onError((m) => { $('vStatus').textContent = m + ' Using the browser voice for now.'; status(m); });
  $('muteBtn').addEventListener('click', () => { setVoice({ enabled: !vs.enabled }); if (!vs.enabled) voice.stop(); });
  $('voiceBtn').addEventListener('click', () => {
    const panel = $('voicePanel');
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
      $('vKey').value = vs.apiKey;
      if (vs.apiKey && $('vVoice').options.length < 2) loadVoices();
    }
  });
  $('vClose').addEventListener('click', () => $('voicePanel').classList.add('hidden'));
  $('vTest').addEventListener('click', async () => {
    if ($('vKey').value.trim() !== vs.apiKey) saveKey();
    $('vStatus').textContent = voice.usingEleven ? 'Asking ElevenLabs…' : 'Using the free browser voice (no ElevenLabs key saved).';
    const ok = await voice.speak(TEST_LINES[vs.preset] || TEST_LINES.squeaky, true);
    if (ok && voice.usingEleven) $('vStatus').textContent = 'ElevenLabs voice working!';
  });
  $('vOn').addEventListener('change', (ev) => { setVoice({ enabled: ev.target.checked }); if (!vs.enabled) voice.stop(); });
  $('vReact').addEventListener('change', (ev) => setVoice({ reactions: ev.target.checked }));
  $('vEngine').addEventListener('change', (ev) => { setVoice({ engine: ev.target.value }); if (ev.target.value === 'eleven') loadVoices(); });
  // Save the key on paste, on leaving the box, on Enter, or with the button
  function saveKey() {
    const key = $('vKey').value.replace(/[\s"'`]/g, '');
    $('vKey').value = key;
    if (key === vs.apiKey) { if (key) loadVoices(); return; }
    setVoice({ apiKey: key, voiceId: '' });
    if (!key) { $('vStatus').textContent = 'Key removed. Using the browser voice.'; loadVoices(); return; }
    if (!/^sk_/.test(key)) $('vStatus').textContent = 'Saved, but ElevenLabs keys usually start with "sk_". Check you copied the whole key.';
    loadVoices();
  }
  $('vKey').addEventListener('change', saveKey);
  $('vKey').addEventListener('paste', () => setTimeout(saveKey, 0));
  $('vKey').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); saveKey(); } });
  $('vKeySave').addEventListener('click', saveKey);
  $('vVoice').addEventListener('change', (ev) => setVoice({ voiceId: ev.target.value, preset: 'custom' }));
  $('vEffect').addEventListener('change', (ev) => setVoice({ effect: ev.target.value, preset: 'custom' }));
  [['vPitch', 'pitch'], ['vSpeed', 'speed'], ['vVol', 'volume']].forEach(([id, key]) => {
    $(id).addEventListener('input', (ev) => setVoice(key === 'volume' ? { volume: Number(ev.target.value) } : { [key]: Number(ev.target.value), preset: 'custom' }));
  });
  // Picking a character sets pitch, speed, effect and the closest-matching voice
  $('vPreset').addEventListener('change', (ev) => {
    const name = ev.target.value;
    const p = PRESETS[name];
    if (!p) { setVoice({ preset: name }); return; }
    const opts = [...$('vVoice').options].filter((o) => o.value);
    let match = null;
    for (const want of p.find) {
      match = opts.find((o) => o.text.toLowerCase().includes(want));
      if (match) break;
    }
    setVoice({ preset: name, pitch: p.pitch, speed: p.speed, effect: p.effect, voiceId: match ? match.value : vs.voiceId });
    if (match) $('vVoice').value = match.value;
    $('vStatus').textContent = (match ? 'Voice: ' + match.text.split(' - ')[0] + '. ' : '') + 'Press Test voice!';
  });
  $('sayForm').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const text = $('sayText').value.trim();
    if (text) voice.speak(text, true);
  });
  renderVoice();

  // ---------- Verity's reactions to the page ----------
  const PAGE_LINES = {
    button: ['Ooh, you pressed {label}!', '{label}? Good choice!', 'Click! {label} it is.'],
    link: ['Off to {label}? Have a safe trip!', 'Ooh, a link! {label} looks interesting.'],
    toggle: ['{state} {label}. Got it!'],
    focus: ['Typing time! What will you put in {label}?'],
    typed: ['Nice typing! {label} is looking good.', 'Done with {label}? Looks great from here.'],
    submit: ['Form sent! Woohoo!', "Submitted! You're on a roll."],
    rage: ['Whoa, easy there! Is something not working?', 'So many clicks! Want me to call tech support on my planet?'],
    bottom: ['You made it all the way to the bottom! Impressive scrolling.'],
    copy: ['Copying that? Smart move, Earthling.'],
    idle: ["Still there, Earthling? I'm getting lonely."],
    back: ['Welcome back! I missed you.'],
    error: ["Uh oh, something broke on this page. Don't worry, it wasn't you!"]
  };
  const REACT_FACE = {
    button: { smileL: 0.8, smileR: 0.8, squintL: 0.25, squintR: 0.25 },
    link: { jawOpen: 0.4, browInnerUp: 0.8, wideL: 0.6, wideR: 0.6 },
    toggle: { smileL: 0.7, smileR: 0.7 },
    focus: { browInnerUp: 0.4, smileL: 0.4, smileR: 0.4 },
    typed: { smileL: 0.7, smileR: 0.7, squintL: 0.2, squintR: 0.2 },
    submit: { smileL: 0.9, smileR: 0.9, squintL: 0.3, squintR: 0.3 },
    rage: { jawOpen: 0.5, browInnerUp: 0.9, wideL: 0.7, wideR: 0.7 },
    bottom: { jawOpen: 0.35, browInnerUp: 0.7, wideL: 0.5, wideR: 0.5 },
    copy: { blinkR: 1, smileL: 0.5, smileR: 0.7 },
    idle: { browInnerUp: 0.7, frownL: 0.5, frownR: 0.5 },
    back: { smileL: 0.8, smileR: 0.8 },
    error: { browInnerUp: 0.8, frownL: 0.6, frownR: 0.6 }
  };
  const IMPORTANT = new Set(['submit', 'rage', 'error']);
  let lastSpokeAt = -100;
  let lastActivity = performance.now() / 1000;
  let idleSaid = false;
  let hiddenAt = 0;
  let bottomSaid = false;
  const recentClicks = [];
  const typedFields = new WeakSet();
  const typingTimers = new WeakMap();

  function veritySay(text, moodName) {
    const line = String(text || '').trim();
    if (!line) return;
    const m = moodName && REACT_FACE[moodName] ? moodName : 'happy';
    speechFace = REACT_FACE[m];
    speechFaceUntil = performance.now() / 1000 + 3.2;
    alien.setMood(m === 'sad' ? 'sad' : m === 'surprised' ? 'surprised' : m === 'wink' ? 'wink' : m === 'angry' ? 'angry' : 'happy');
    voice.speak(line, true);
  }

  function react(event, data) {
    if (!vs.enabled) return;
    const t = performance.now() / 1000;
    const important = IMPORTANT.has(event);
    if (!important && (t - lastSpokeAt < 7 || voice.speaking())) return;
    const set = PAGE_LINES[event];
    if (!set) return;
    lastSpokeAt = t;
    const line = pick(set).replace(/\{(\w+)\}/g, (m, k) => (data && data[k]) || '');
    const moodName = event === 'rage' ? 'surprised' : event === 'idle' || event === 'error' ? 'sad' : event === 'copy' ? 'wink' : 'happy';
    veritySay(line.charAt(0).toUpperCase() + line.slice(1), moodName);
  }

  function activity() { lastActivity = performance.now() / 1000; idleSaid = false; }

  function cleanLabel(s) {
    return String(s || '').replace(/\s+/g, ' ').trim().slice(0, 40) || 'that';
  }

  function fieldName(el) {
    const lab = (el.labels && el.labels[0] && el.labels[0].textContent) ||
      el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.name || 'that field';
    return cleanLabel(lab.replace(/[*:]/g, ''));
  }

  // Ignore Verity's own controls so they don't talk over the person using them
  function ownControl(el) {
    return !!(el && el.closest && (el.closest('#voicePanel') || el.closest('#sayForm') || el.closest('#pgSay')));
  }

  document.addEventListener('click', (ev) => {
    activity();
    if (ownControl(ev.target)) return;
    const t = performance.now() / 1000;
    recentClicks.push({ t, x: ev.clientX, y: ev.clientY });
    while (recentClicks.length && t - recentClicks[0].t > 1.5) recentClicks.shift();
    if (recentClicks.length >= 4 && recentClicks.every((c) => Math.hypot(c.x - ev.clientX, c.y - ev.clientY) < 60)) {
      recentClicks.length = 0;
      react('rage');
      return;
    }
    const el = ev.target.closest('a[href], button, [role="button"], input[type="submit"], input[type="button"], input[type="checkbox"], input[type="radio"], summary');
    if (!el) return;
    if (el.matches('input[type="checkbox"], input[type="radio"]')) {
      react('toggle', { label: fieldName(el), state: el.checked ? 'Checked' : 'Unchecked' });
    } else if (el.matches('a[href]')) {
      react('link', { label: cleanLabel(el.getAttribute('aria-label') || el.textContent) });
    } else if (!el.matches('[type="submit"]') && !(el.tagName === 'BUTTON' && el.form && el.type === 'submit')) {
      react('button', { label: cleanLabel(el.getAttribute('aria-label') || el.textContent || el.value) });
    }
  }, true);

  document.addEventListener('focusin', (ev) => {
    const el = ev.target;
    if (ownControl(el) || !el.matches || !el.matches('input:not([type="password"]):not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]), textarea')) return;
    if (!typedFields.has(el)) react('focus', { label: fieldName(el) });
  });
  document.addEventListener('input', (ev) => {
    activity();
    const el = ev.target;
    if (ownControl(el) || !el.matches || !el.matches('input:not([type="password"]), textarea')) return;
    clearTimeout(typingTimers.get(el));
    typingTimers.set(el, setTimeout(() => {
      if (typedFields.has(el)) return;
      typedFields.add(el);
      react('typed', { label: fieldName(el) });
    }, 1500));
  });
  document.addEventListener('submit', (ev) => { if (!ownControl(ev.target)) react('submit'); }, true);
  document.addEventListener('copy', () => { activity(); react('copy'); });

  window.addEventListener('pointermove', activity, { passive: true });
  window.addEventListener('keydown', activity);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = performance.now() / 1000; voice.stop(); }
    else if (hiddenAt && performance.now() / 1000 - hiddenAt > 8) { lastSpokeAt = -100; react('back'); }
  });
  window.addEventListener('error', () => react('error'));
  window.addEventListener('unhandledrejection', () => react('error'));
  setInterval(() => {
    if (!document.hidden && !idleSaid && performance.now() / 1000 - lastActivity > 45) { idleSaid = true; react('idle'); }
  }, 5000);

  // ---------- Playground drawer ----------
  const playground = $('playground');
  playground.addEventListener('scroll', () => {
    activity();
    if (playground.scrollHeight < playground.clientHeight + 120) return;
    const atBottom = playground.scrollTop + playground.clientHeight >= playground.scrollHeight - 40;
    if (atBottom && !bottomSaid) { bottomSaid = true; react('bottom'); }
    if (playground.scrollTop < playground.scrollHeight / 3) bottomSaid = false;
  }, { passive: true });

  function openPlayground() {
    playground.classList.remove('hidden');
    $('playgroundBtn').setAttribute('aria-expanded', 'true');
  }
  function closePlayground() {
    playground.classList.add('hidden');
    $('playgroundBtn').setAttribute('aria-expanded', 'false');
  }
  $('playgroundBtn').addEventListener('click', () => {
    if (playground.classList.contains('hidden')) openPlayground(); else closePlayground();
  });
  $('pgClose').addEventListener('click', closePlayground);
  $('pgForm').addEventListener('submit', (ev) => {
    ev.preventDefault();
    $('pgNote').textContent = 'Message "sent" (this demo sends nothing).';
    ev.target.reset();
  });
  $('pgBreak').addEventListener('click', () => {
    setTimeout(() => { throw new Error('Demo error: something broke on purpose'); }, 0);
  });
  $('pgSay').addEventListener('click', () => {
    veritySay('The page asked me to say this. Hello from the code!', 'happy');
  });

  // The site shell (Prompt Verity tab) talks to the head through postMessage
  window.addEventListener('message', (ev) => {
    const d = ev.data;
    if (!d || d.type !== 'verity-say') return;
    veritySay(d.text, d.mood);
  });

  window.Verity = {
    say: veritySay,
    react,
    openPlayground,
    closePlayground,
    get speaking() { return voice.speaking(); }
  };

  // ---------- Loop ----------
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const time = now / 1000;

    if (tracker.running) {
      const face = tracker.detect(now);
      if (face) { faceTarget = fromFace(face); lastFaceAt = time; }
      else if (face === null && time - lastFaceAt > 0.6) faceTarget = null;
    }
    const seeing = tracker.running && faceTarget && time - lastFaceAt < 0.6;
    const speech = speechFace && time < speechFaceUntil ? speechFace : null;
    let target = forced || speech || (seeing ? faceTarget : idle(time, !tracker.running));

    const m = moodOf(target);
    if (m !== mood) { mood = m; alien.setMood(m); }
    const label = (seeing ? '' : tracker.running ? 'Looking for you… ' : 'Demo: ') + MOODS[m];
    if (label !== moodLabel) { moodLabel = label; $('mood').textContent = label; }
    maybeReact(m, time, seeing);

    // Move the mouth with the voice (on top of whatever the face is doing)
    const talk = voice.level(time);
    if (talk > 0) {
      target = Object.assign({}, target, {
        jawOpen: Math.max(target.jawOpen || 0, talk * 0.75),
        funnel: Math.max(target.funnel || 0, talk * 0.25),
        pucker: (target.pucker || 0) * (1 - talk)
      });
    }

    alien.update(target, dt, time);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Small hook for testing from the console
  window.AlienMirror = {
    alien, tracker, fromFace, DEMO,
    force(e) { forced = e || null; },
    get mirror() { return mirror; }
  };
})();
