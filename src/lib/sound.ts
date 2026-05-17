// Web Audio API helpers — no external files needed
let ctx: AudioContext | null = null;

function getCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
}

export function playTone(freq: number, duration = 0.15, type: OscillatorType = "square", volume = 0.15) {
  const ac = getCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = volume;
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + duration);
}

export function sfxCorrect() {
  playTone(660, 0.1, "square");
  setTimeout(() => playTone(880, 0.15, "square"), 90);
  setTimeout(() => playTone(1320, 0.2, "square"), 200);
}

export function sfxWrong() {
  playTone(200, 0.2, "sawtooth", 0.2);
  setTimeout(() => playTone(110, 0.3, "sawtooth", 0.2), 150);
}

export function sfxClick() {
  playTone(800, 0.05, "square", 0.1);
}

export function sfxTick() {
  playTone(1200, 0.03, "square", 0.05);
}

export function sfxWin() {
  const notes = [523, 659, 784, 1047, 1319];
  notes.forEach((n, i) => setTimeout(() => playTone(n, 0.2, "square", 0.18), i * 120));
}

// Background music loop — simple chiptune arpeggio
let musicInterval: number | null = null;
let musicStep = 0;
export function startMusic() {
  if (musicInterval) return;
  const ac = getCtx();
  if (!ac) return;
  const bass = [110, 110, 146, 130];
  const lead = [220, 277, 330, 415, 330, 277, 220, 277];
  musicInterval = window.setInterval(() => {
    const a = getCtx();
    if (!a) return;
    // bass
    if (musicStep % 4 === 0) playTone(bass[(musicStep / 4) % bass.length], 0.3, "triangle", 0.05);
    // lead
    playTone(lead[musicStep % lead.length], 0.12, "square", 0.025);
    musicStep++;
  }, 220);
}

export function stopMusic() {
  if (musicInterval) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
}
