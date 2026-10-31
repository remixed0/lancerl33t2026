// Verity Up To Space 3D: Background music. Loops assets/spaceverity.mp3 through Web Audio:
// source -> low-pass filter (muffled while the Mission Log is open) -> duck gain (dips while Verity talks)
// -> volume (follows the SFX ON/OFF button). Starts on the first click or key press (browser autoplay rules).

const music = (() => {
  const SRC = 'assets/spaceverity.mp3';
  const VOLUME = 0.35;         // music level under the synthesized sound effects
  const DUCK_LEVEL = 0.25;     // fraction of VOLUME kept while Verity talks
  const OPEN_HZ = 20000;       // low-pass fully open
  const MUFFLED_HZ = 450;      // low-pass while the level select is open

  let ctx = null, filter = null, duckGain = null, volume = null;
  let started = false, loading = false;
  let ducked = false, muffled = false;
  let duckTimer = 0;

  function build() {
    sfx.init();
    ctx = sfx.ctx;
    if (!ctx) return false;
    filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.7;
    filter.frequency.value = muffled ? MUFFLED_HZ : Math.min(OPEN_HZ, ctx.sampleRate / 2);
    duckGain = ctx.createGain();
    duckGain.gain.value = ducked ? DUCK_LEVEL : 1;
    volume = ctx.createGain();
    volume.gain.value = 0;
    filter.connect(duckGain);
    duckGain.connect(volume);
    volume.connect(ctx.destination);
    return true;
  }

  // Smoothly move an AudioParam (setTargetAtTime: timeConstant ~ a third of the fade time)
  function glide(param, value, seconds) {
    const now = ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.setTargetAtTime(value, now, seconds / 3);
  }

  async function start() {
    if (started || loading) return;
    loading = true;
    try {
      if (!ctx && !build()) return;
      const res = await fetch(SRC);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const buffer = await ctx.decodeAudioData(await res.arrayBuffer());
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true; // buffer looping is gapless, unlike <audio loop>
      source.connect(filter);
      source.start();
      started = true;
      glide(volume.gain, sfx.enabled ? VOLUME : 0, 2.5); // fade in
    } catch (e) {
      console.warn('Music unavailable:', e.message || e); // e.g. opened from file://, where fetch is blocked
    } finally {
      loading = false;
    }
  }

  // The first click / key press unlocks audio: start the music then
  ['pointerdown', 'keydown', 'touchstart'].forEach((type) => {
    window.addEventListener(type, start, { passive: true });
  });

  // Pause everything while the tab is hidden; resume when it comes back (if the player had audio running)
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else if (started) ctx.resume();
  });

  return {
    /** Dip the music while Verity talks. safetyMs restores it if her "done" message never arrives. */
    duck(on, safetyMs = 0) {
      ducked = on;
      clearTimeout(duckTimer);
      if (on && safetyMs) duckTimer = setTimeout(() => this.duck(false), safetyMs);
      if (duckGain) glide(duckGain.gain, on ? DUCK_LEVEL : 1, on ? 0.4 : 1.2);
    },
    /** Muffle the music (low-pass) while the level select / Mission Log is open. */
    muffle(on) {
      muffled = on;
      if (filter) glide(filter.frequency, on ? MUFFLED_HZ : Math.min(OPEN_HZ, ctx.sampleRate / 2), on ? 0.35 : 0.6);
    },
    /** Follow the SFX ON/OFF button. */
    setEnabled(on) {
      if (volume) glide(volume.gain, on ? VOLUME : 0, 0.3);
    },
    /** Current levels, for debugging from the console: music.state() */
    state() {
      return {
        started, ducked, muffled,
        volume: volume ? +volume.gain.value.toFixed(3) : null,
        duck: duckGain ? +duckGain.gain.value.toFixed(3) : null,
        cutoffHz: filter ? Math.round(filter.frequency.value) : null,
        context: ctx ? ctx.state : null
      };
    },
    start
  };
})();
