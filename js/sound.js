let audioCtx = null;

function getAudioContextClass() {
  if (typeof AudioContext !== "undefined") return AudioContext;
  if (typeof window !== "undefined" && window.AudioContext) return window.AudioContext;
  if (typeof window !== "undefined" && window.webkitAudioContext) return window.webkitAudioContext;
  return null;
}

function getAudioContext() {
  if (!audioCtx) {
    const Ctx = getAudioContextClass();
    if (!Ctx) return null;
    try {
      audioCtx = new Ctx();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Call once from inside a real user-gesture handler (e.g. the wheel's click
// listener) so the AudioContext is unlocked before later async tick sounds
// try to play from inside the animation loop.
export function unlockAudio() {
  getAudioContext();
}

function playTone(freq, startOffset, duration, type, gainPeak) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(ctx.destination);

  const startTime = ctx.currentTime + startOffset;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

export function playTick() {
  playTone(900, 0, 0.06, "square", 0.15);
}

export function playWin() {
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((freq, i) => playTone(freq, i * 0.12, 0.25, "triangle", 0.2));
}
