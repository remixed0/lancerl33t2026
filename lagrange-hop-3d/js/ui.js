// Lagrange Hop 3D: HUD: aim bar (sliders, prediction text), buttons, modals and window resize.

// --- AIM PANEL (bottom bar) ---
// Angles are shown compass-style: 0° = right, counter-clockwise positive on screen.
// aim.angle is in world coords (y down), so screen degrees = -aim.angle.
const KM_PER_POWER = MAX_DELTA_V * 2.8; // HUD km/s at full power
const angleSlider = document.getElementById('angleSlider');
const dvSlider = document.getElementById('dvSlider');
dvSlider.min = (MIN_AIM_POWER * KM_PER_POWER).toFixed(1);
dvSlider.max = KM_PER_POWER.toFixed(1);
let sliderDragging = false;

function aimScreenDegrees() {
  let deg = (-aim.angle * 180 / Math.PI) % 360;
  if (deg < 0) deg += 360;
  return deg;
}

function setAimFromControls(deg, kms) {
  if (gameState !== 'AIMING') return;
  cancelAutopilot();
  const power = Math.min(1, Math.max(MIN_AIM_POWER, kms / KM_PER_POWER));
  aim = { set: true, angle: -((deg % 360 + 360) % 360) * Math.PI / 180, power };
}

angleSlider.addEventListener('input', () => setAimFromControls(+angleSlider.value, aim.set ? aim.power * KM_PER_POWER : +dvSlider.value));
dvSlider.addEventListener('input', () => setAimFromControls(aim.set ? aimScreenDegrees() : +angleSlider.value, +dvSlider.value));
[angleSlider, dvSlider].forEach(s => s.addEventListener('pointerdown', () => { sliderDragging = true; sfx.init(); }));
window.addEventListener('pointerup', () => { sliderDragging = false; });

document.querySelectorAll('.step-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    sfx.init();
    const amt = (e.shiftKey ? 1 : 0.1) * Number(btn.dataset.dir);
    const deg = aim.set ? aimScreenDegrees() : +angleSlider.value;
    const kms = aim.set ? aim.power * KM_PER_POWER : +dvSlider.value;
    if (btn.dataset.step === 'angle') setAimFromControls(deg + amt, kms);
    else setAimFromControls(deg, kms + amt);
  });
});

function updateAimPanel() {
  const angleEl = document.getElementById('aimAngle');
  const speedEl = document.getElementById('aimSpeed');
  const fuelEl = document.getElementById('aimFuel');
  const pt = document.getElementById('predictText');
  if (aim.set) {
    const deg = aimScreenDegrees();
    angleEl.textContent = `${deg.toFixed(1)}°`;
    speedEl.textContent = `${(aim.power * KM_PER_POWER).toFixed(1)} km/s`;
    fuelEl.textContent = `${Math.round((1 - aim.power) * 100)}%`;
    // Keep sliders in step with dragging / keys / autopilot, unless the user is holding one
    if (!sliderDragging) {
      angleSlider.value = deg.toFixed(1);
      dvSlider.value = (aim.power * KM_PER_POWER).toFixed(1);
    }
  } else {
    angleEl.textContent = speedEl.textContent = fuelEl.textContent = '—';
  }
  const lockSliders = gameState !== 'AIMING';
  angleSlider.disabled = dvSlider.disabled = lockSliders;

  let text = 'Drag from Earth to aim', cls = '';
  if (gameState === 'FLYING') {
    text = 'In flight';
  } else if (gameState !== 'AIMING') {
    text = 'Press RESET to fly again';
  } else if (autopilot && autopilot.phase === 'search') {
    const pct = Math.round(100 * autopilot.idx / autopilot.shots.length);
    text = `AUTOPILOT: checking launch window ${autopilot.window + 1}/${AUTOPILOT_WINDOWS}${autopilot.refined ? ' (refining)' : ''}... ${pct}%`;
    cls = 'predict-auto';
  } else if (autopilot && autopilot.phase === 'wait') {
    const wait = Math.max(0, (autopilot.launchTick - tickCount) / 60);
    const n = prediction ? prediction.hits.size : 0;
    text = `AUTOPILOT: launch window in ${wait.toFixed(1)} s · ${n}/${currentLevel.beacons.length} beacons`;
    cls = 'predict-auto';
  } else if (prediction) {
    const total = currentLevel.beacons.length;
    const n = prediction.hits.size;
    if (prediction.end === 'capture') {
      const stars = n === total ? 3 : n >= Math.ceil(total / 2) ? 2 : 1;
      text = `PREDICTED: CAPTURE · ${n}/${total} beacons · ${starString(stars)}`;
      cls = 'predict-good';
    } else if (prediction.end === 'crash') {
      text = `PREDICTED: ${prediction.reason.toUpperCase()}`;
      cls = 'predict-bad';
    } else {
      text = `PREDICTED: MISSES TARGET${prediction.reason ? ' · ' + prediction.reason.toUpperCase() : ''}`;
    }
  }
  pt.textContent = text;
  pt.className = `text-[11px] min-h-[15px] ${cls || 'text-slate-400'}`;

  const launchBtn = document.getElementById('launchBtn');
  launchBtn.disabled = !(gameState === 'AIMING' && aim.set && !autopilot);
  launchBtn.classList.toggle('pulse', !launchBtn.disabled && precise);
}

function togglePrecise() {
  precise = !precise;
  const btn = document.getElementById('preciseBtn');
  btn.textContent = precise ? 'AIM: PRECISE' : 'AIM: QUICK';
  btn.classList.toggle('active', precise);
  document.getElementById('hintText').textContent = precise
    ? 'Precise aim: drag to set, arrow keys to fine-tune (Shift = faster), then LAUNCH or Space.'
    : currentLevel.hint;
}

function resetFromUi() {
  sfx.init();
  cancelAutopilot();
  resetProbeToEarth();
  document.getElementById('victoryModal').classList.add('hidden');
  document.getElementById('hintText').textContent = currentLevel.hint;
}

// --- AI CO-PILOT CHATBOX STATE ---
const aiChatPanel = document.getElementById('aiChatPanel');
const aiChatLog = document.getElementById('aiChatLog');
const aiChatForm = document.getElementById('aiChatForm');
const aiChatInput = document.getElementById('aiChatInput');
const aiChatClose = document.getElementById('aiChatClose');
let aiChatOpen = false;
let aiChatBusy = false;

function aiChatAddMsg(role, text) {
  const el = document.createElement('div');
  el.className = `flex gap-1.5 ${role === 'user' ? 'justify-end' : 'justify-start'}`;
  const bubble = document.createElement('div');
  bubble.className = `max-w-[85%] px-2 py-1.5 rounded-lg text-[11px] leading-snug ${role === 'user' ? 'bg-cyan-500/20 text-cyan-100' : 'bg-slate-800 text-slate-200'}`;
  bubble.textContent = text;
  el.appendChild(bubble);
  aiChatLog.appendChild(el);
  aiChatLog.scrollTop = aiChatLog.scrollHeight;
}

async function aiChatSend(text) {
  if (aiChatBusy) return;
  aiChatBusy = true;
  aiChatAddMsg('user', text);
  const thinkIdx = aiChatLog.children.length;
  aiChatAddMsg('ai', '…thinking');
  try {
    const res = await fetch('http://127.0.0.1:11434/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5-coder:32b',
        messages: [
          { role: 'system', content: 'You are the Lagrange Hop AI co-pilot. You help the player plan gravity-assist slingshots, interpret telemetry, and reference NASA mission data.' },
          { role: 'user', content: text }
        ]
      })
    });
    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content || 'No response.';
    aiChatLog.children[thinkIdx].children[0].textContent = reply;
  } catch (e) {
    aiChatLog.children[thinkIdx].children[0].textContent = 'Co-pilot offline (Ollama). Start it with `ollama serve`.';
  } finally { aiChatBusy = false; }
}

function openAiChat() {
  aiChatOpen = true;
  aiChatPanel.classList.remove('hidden');
  if (aiChatLog.children.length === 0) aiChatAddMsg('ai', 'Co-pilot online. Ask me about the mission, slingshots, or NASA data.');
  aiChatInput.focus();
}
function closeAiChat() {
  aiChatOpen = false;
  aiChatPanel.classList.add('hidden');
}

document.getElementById('aiChatForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('aiChatInput');
  const text = (input.value || '').trim();
  if (!text) return;
  aiChatAddMsg('user', text);
  input.value = '';
  aiChatSend(text);
});
document.getElementById('aiChatClose').addEventListener('click', () => { aiChatOpen = false; aiChatPanel.classList.add('hidden'); });

// --- UI BUTTON WIRING ---
document.getElementById('btnCam').addEventListener('click', () => {
  sfx.init();
  cycleCamera();
});
document.getElementById('btnAiChat').addEventListener('click', () => {
  sfx.init();
  aiChatOpen ? closeAiChat() : openAiChat();
});

document.getElementById('btnReset').addEventListener('click', resetFromUi);
document.getElementById('aimResetBtn').addEventListener('click', resetFromUi);
document.getElementById('preciseBtn').addEventListener('click', togglePrecise);
document.getElementById('launchBtn').addEventListener('click', () => { sfx.init(); launch(); });
document.getElementById('autoBtn').addEventListener('click', () => {
  sfx.init();
  autopilot ? cancelAutopilot() : startAutopilot();
});

// Mission log sidebar
document.getElementById('btnMissionLog').addEventListener('click', () => {
  sfx.init();
  openMissionLog();
});
document.getElementById('closeLogBtn').addEventListener('click', closeMissionLog);
document.getElementById('missionLogBackdrop').addEventListener('click', closeMissionLog);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMissionLog();
});

// Two-step reset so a single misclick can't wipe progress
const resetBtn = document.getElementById('resetProgressBtn');
let resetArmed = false;
resetBtn.addEventListener('click', () => {
  if (!resetArmed) {
    resetArmed = true;
    resetBtn.textContent = 'CLICK AGAIN TO ERASE ALL PROGRESS';
    setTimeout(() => { resetArmed = false; resetBtn.textContent = 'RESET PROGRESS'; }, 3000);
    return;
  }
  resetArmed = false;
  resetBtn.textContent = 'RESET PROGRESS';
  progress = { unlocked: 0, best: LEVELS.map(() => 0) };
  saveProgress();
  loadLevel(0);
});

document.getElementById('modalRetryBtn').addEventListener('click', () => {
  resetProbeToEarth();
  document.getElementById('victoryModal').classList.add('hidden');
});

document.getElementById('modalNextBtn').addEventListener('click', () => {
  if (currentLevelIndex === LEVELS.length - 1) {
    document.getElementById('victoryModal').classList.add('hidden');
    openMissionLog();
  } else {
    loadLevel(currentLevelIndex + 1);
  }
});

// Manual Modal controls
const manualModal = document.getElementById('manualModal');
document.getElementById('btnHelp').addEventListener('click', () => {
  sfx.init();
  manualModal.classList.remove('hidden');
});
document.getElementById('closeManualBtn').addEventListener('click', () => {
  manualModal.classList.add('hidden');
});
document.getElementById('startFromManualBtn').addEventListener('click', () => {
  manualModal.classList.add('hidden');
});

// Audio Mute Toggle
const btnAudio = document.getElementById('btnAudioToggle');
const audioLabel = document.getElementById('audioLabel');
btnAudio.addEventListener('click', () => {
  sfx.init();
  sfx.enabled = !sfx.enabled;
  audioLabel.textContent = sfx.enabled ? 'SFX ON' : 'SFX OFF';
  btnAudio.classList.toggle('text-slate-500', !sfx.enabled);
  bob.mute(!sfx.enabled); // the sound toggle mutes Bob's voice too
});

// Handle Window Resize
window.addEventListener('resize', () => {
  if (!renderer) return; // resize can fire before window.onload builds the scene
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});
