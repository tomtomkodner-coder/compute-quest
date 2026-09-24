// Web Audio API helpers — Kahoot-style punchy SFX, no external files
let ctx: AudioContext | null = null;
let masterMuted = false;

function getCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  // resume on user gesture (autoplay policy)
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

let masterVolume = 1;
/** עוצמה כללית 0..1 (מתפריט ההגדרות) */
export function setVolume(v: number) {
  masterVolume = Math.max(0, Math.min(1, v));
}

/** פרץ רעש מסונן (יריות, קליקים, התזות) */
export function playNoise(duration = 0.2, volume = 0.2, freq = 2000, type: BiquadFilterType = "lowpass", delay = 0) {
  if (masterMuted) return;
  const ac = getCtx();
  if (!ac) return;
  const len = Math.max(1, Math.floor(ac.sampleRate * duration));
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  const g = ac.createGain();
  g.gain.value = volume * masterVolume;
  src.connect(f).connect(g).connect(ac.destination);
  src.start(ac.currentTime + delay);
}

export function setMuted(v: boolean) {
  masterMuted = v;
  if (v) stopMusic();
}

export function playTone(freq: number, duration = 0.15, type: OscillatorType = "square", volume = 0.15) {
  if (masterMuted) return;
  const ac = getCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(Math.max(0.0001, volume * masterVolume), ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + duration);
}

// Kahoot-style "ding!" — bright triangle chord, fast attack
export function sfxCorrect() {
  if (masterMuted) return;
  playTone(784, 0.12, "triangle", 0.22);   // G5
  setTimeout(() => playTone(1047, 0.14, "triangle", 0.22), 80);  // C6
  setTimeout(() => playTone(1568, 0.22, "triangle", 0.22), 170); // G6
}

// Kahoot-style "buzz!" — descending sawtooth
export function sfxWrong() {
  if (masterMuted) return;
  playTone(330, 0.18, "sawtooth", 0.22);
  setTimeout(() => playTone(220, 0.22, "sawtooth", 0.22), 120);
  setTimeout(() => playTone(146, 0.28, "sawtooth", 0.2), 260);
}

export function sfxClick() {
  playTone(900, 0.05, "triangle", 0.12);
}

export function sfxTick() {
  playTone(1400, 0.04, "square", 0.06);
}

export function sfxSkip() {
  playTone(520, 0.08, "triangle", 0.12);
  setTimeout(() => playTone(380, 0.1, "triangle", 0.12), 60);
}

export function sfxWin() {
  const notes = [523, 659, 784, 1047, 1319, 1568];
  notes.forEach((n, i) => setTimeout(() => playTone(n, 0.22, "triangle", 0.2), i * 110));
}

// Background music loop — soft chiptune
let musicInterval: number | null = null;
let musicStep = 0;
export function startMusic() {
  if (masterMuted) return;
  if (musicInterval) return;
  const ac = getCtx();
  if (!ac) return;
  const bass = [110, 110, 146, 130];
  const lead = [220, 277, 330, 415, 330, 277, 220, 277];
  musicInterval = window.setInterval(() => {
    if (masterMuted) return;
    if (musicStep % 4 === 0) playTone(bass[(musicStep / 4) % bass.length], 0.3, "triangle", 0.04);
    playTone(lead[musicStep % lead.length], 0.12, "square", 0.02);
    musicStep++;
  }, 220);
}

export function stopMusic() {
  if (musicInterval) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
}
