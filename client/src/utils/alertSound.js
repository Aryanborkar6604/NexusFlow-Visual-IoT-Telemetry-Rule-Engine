// Web Audio API synthesizer for industrial alert beep notifications (zero external asset dependencies)

let audioCtx = null;
let lastBeepAt = 0;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      audioCtx = new AudioCtx();
    }
  }
  return audioCtx;
}

/**
 * Unlocks / resumes the browser AudioContext on user gesture.
 */
export async function unlockAlertAudio() {
  const ctx = getAudioContext();
  if (!ctx) return false;

  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      return false;
    }
  }
  return ctx.state === 'running';
}

// Automatically unlock audio on first user interaction anywhere in the app
if (typeof window !== 'undefined') {
  const unlockOnce = () => {
    unlockAlertAudio().then((ok) => {
      if (ok) {
        window.removeEventListener('pointerdown', unlockOnce);
        window.removeEventListener('keydown', unlockOnce);
      }
    });
  };
  window.addEventListener('pointerdown', unlockOnce, { passive: true });
  window.addEventListener('keydown', unlockOnce, { passive: true });
}

function scheduleTone(ctx, { freq, startOffset, duration, volume = 0.14, type = 'sine' }) {
  const startTime = ctx.currentTime + startOffset;
  const endTime = startTime + duration;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  // Smooth attack & exponential release to prevent speaker clicks/pops
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.012);
  gain.gain.setValueAtTime(volume, Math.max(startTime + 0.015, endTime - 0.035));
  gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(endTime + 0.01);
}

/**
 * Plays a crisp dual-tone alert beep ("beep-beep") on incoming anomaly alerts.
 */
export async function playAlertBeep({ force = false } = {}) {
  const now = Date.now();
  if (!force && now - lastBeepAt < 800) {
    return false;
  }

  const ctx = getAudioContext();
  if (!ctx) return false;

  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      return false;
    }
  }

  if (ctx.state !== 'running') {
    return false;
  }

  lastBeepAt = now;

  // Dual-tone industrial alert cadence: 880Hz -> 1046.5Hz
  scheduleTone(ctx, { freq: 880, startOffset: 0, duration: 0.11, volume: 0.14, type: 'triangle' });
  scheduleTone(ctx, { freq: 1046.5, startOffset: 0.16, duration: 0.15, volume: 0.16, type: 'triangle' });

  return true;
}

/**
 * Plays a short single confirmation beep when audio alerts are enabled.
 */
export async function playConfirmBeep() {
  const ctx = getAudioContext();
  if (!ctx) return false;

  await unlockAlertAudio();
  if (ctx.state !== 'running') return false;

  scheduleTone(ctx, { freq: 784, startOffset: 0, duration: 0.08, volume: 0.1, type: 'sine' });
  return true;
}
