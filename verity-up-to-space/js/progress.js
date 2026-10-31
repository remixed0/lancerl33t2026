// Verity Up To Space 3D: Campaign progress (unlocks, best stars), level bar and mission log sidebar.

// --- CAMPAIGN PROGRESS (unlocks + best stars, kept in this browser) ---
const PROGRESS_KEY = 'lagrangeHop.progress.v1';
let progress = { unlocked: 0, best: LEVELS.map(() => 0) };

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY));
    if (saved && Array.isArray(saved.best)) {
      progress.unlocked = Math.min(Math.max(0, saved.unlocked | 0), LEVELS.length - 1);
      progress.best = LEVELS.map((_, i) => saved.best[i] | 0);
    }
  } catch (e) { /* storage unavailable: play without saving */ }
}

function saveProgress() {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch (e) { /* ignore */ }
}

function isUnlocked(idx) {
  return idx <= progress.unlocked;
}

function recordCompletion(stars) {
  progress.best[currentLevelIndex] = Math.max(progress.best[currentLevelIndex], stars);
  if (currentLevelIndex + 1 < LEVELS.length) {
    progress.unlocked = Math.max(progress.unlocked, currentLevelIndex + 1);
  }
  saveProgress();
  renderLevelBar();
  renderMissionLog();
}

function missionName(lvl) {
  return lvl.title.replace(/^MISSION \d+:\s*/, '');
}

function starString(n) {
  return '★'.repeat(n) + '☆'.repeat(3 - n);
}

function renderLevelBar() {
  const bar = document.getElementById('levelBar');
  bar.innerHTML = '';
  LEVELS.forEach((lvl, i) => {
    const btn = document.createElement('button');
    const unlocked = isUnlocked(i);
    const done = progress.best[i] > 0;
    let cls = 'w-8 py-1 rounded-lg text-[11px] font-orbitron font-bold transition ';
    if (i === currentLevelIndex) cls += 'bg-cyan-400 text-slate-950 shadow-md';
    else if (!unlocked) cls += 'bg-slate-900 text-slate-600 cursor-not-allowed';
    else if (done) cls += 'bg-emerald-900/70 text-emerald-300 hover:bg-emerald-800';
    else cls += 'bg-slate-800 text-slate-300 hover:bg-slate-700';
    btn.className = cls;
    btn.textContent = unlocked ? String(i + 1).padStart(2, '0') : '🔒';
    btn.title = unlocked ? missionName(lvl) : `Locked: complete mission ${String(i).padStart(2, '0')} first`;
    btn.disabled = !unlocked;
    btn.addEventListener('click', () => { sfx.init(); loadLevel(i); });
    bar.appendChild(btn);
  });
}

function renderMissionLog() {
  const list = document.getElementById('missionList');
  list.innerHTML = '';
  const completed = progress.best.filter(s => s > 0).length;
  const totalStars = progress.best.reduce((a, b) => a + b, 0);
  document.getElementById('logSummary').textContent = `${completed} / ${LEVELS.length} missions complete`;
  document.getElementById('logStars').textContent = `★ ${totalStars} / ${LEVELS.length * 3} stars`;
  document.getElementById('logProgressBar').style.width = `${(completed / LEVELS.length) * 100}%`;

  LEVELS.forEach((lvl, i) => {
    const unlocked = isUnlocked(i);
    const stars = progress.best[i];
    const current = i === currentLevelIndex;
    let status, statusCls, border;
    if (!unlocked) {
      status = '🔒 LOCKED'; statusCls = 'text-slate-500'; border = 'border-slate-800 opacity-60';
    } else if (stars > 0) {
      status = 'COMPLETE'; statusCls = 'text-emerald-400'; border = 'border-emerald-500/40 hover:border-emerald-400';
    } else {
      status = 'READY'; statusCls = 'text-cyan-300'; border = 'border-cyan-500/40 hover:border-cyan-300';
    }
    if (current) border += ' ring-1 ring-cyan-400 bg-cyan-950/40';

    const li = document.createElement('li');
    li.innerHTML = `
      <button class="w-full text-left p-3 rounded-xl border bg-slate-950/60 transition ${border} ${unlocked ? '' : 'cursor-not-allowed'}" ${unlocked ? '' : 'disabled'}>
        <div class="flex items-center justify-between gap-2">
          <span class="text-[10px] font-orbitron font-bold text-slate-500">MISSION ${String(i + 1).padStart(2, '0')}${current ? ' · NOW PLAYING' : ''}</span>
          <span class="text-[10px] font-mono-tech ${statusCls}">${status}</span>
        </div>
        <div class="font-orbitron font-bold text-xs text-white mt-1">${missionName(lvl)}</div>
        <div class="text-[11px] font-mono-tech text-slate-400 mt-1 leading-snug">${unlocked ? lvl.subtitle : `Complete mission ${String(i).padStart(2, '0')} to unlock.`}</div>
        <div class="text-sm mt-1 ${stars > 0 ? 'text-amber-400' : 'text-slate-700'}">${starString(stars)}</div>
      </button>`;
    if (unlocked) {
      li.querySelector('button').addEventListener('click', () => {
        sfx.init();
        loadLevel(i);
        closeMissionLog();
      });
    }
    list.appendChild(li);
  });
}

function openMissionLog() {
  renderMissionLog();
  document.getElementById('missionLog').classList.remove('-translate-x-full');
  document.getElementById('missionLog').setAttribute('aria-hidden', 'false');
  document.getElementById('missionLogBackdrop').classList.remove('hidden');
  music.muffle(true);
}

function closeMissionLog() {
  document.getElementById('missionLog').classList.add('-translate-x-full');
  document.getElementById('missionLog').setAttribute('aria-hidden', 'true');
  document.getElementById('missionLogBackdrop').classList.add('hidden');
  music.muffle(false);
}
