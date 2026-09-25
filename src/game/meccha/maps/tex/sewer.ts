// Sewer textures (Canvas): wet stained concrete, grimy brick, dirty tiles, rust, corrugated metal, grates,
// murky water, oil drums, sandbags, hazard stripes and two distinct graffiti sets.
import { makeTex } from "../../textures";

export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
type G = CanvasRenderingContext2D;
function speckle(g: G, w: number, h: number, r: () => number, n: number, a: number, size = 2) {
  for (let i = 0; i < n; i++) {
    const v = (r() - 0.5) * 2 * a;
    g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
    g.fillRect(r() * w, r() * h, 1 + r() * size, 1 + r() * size);
  }
}
function blotches(g: G, w: number, h: number, r: () => number, n: number, col: string, amin: number, amax: number, smin: number, smax: number) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = col.replace("A", String(amin + r() * (amax - amin)));
    g.beginPath();
    g.ellipse(r() * w, r() * h, smin + r() * (smax - smin), (smin + r() * (smax - smin)) * 0.6, r() * 3, 0, Math.PI * 2);
    g.fill();
  }
}
function drips(g: G, w: number, h: number, r: () => number, n: number, col: string) {
  for (let i = 0; i < n; i++) {
    const x = r() * w, y0 = r() * h * 0.5, len = 20 + r() * h * 0.6;
    const gr = g.createLinearGradient(0, y0, 0, y0 + len);
    gr.addColorStop(0, col.replace("A", "0"));
    gr.addColorStop(0.3, col.replace("A", String(0.12 + r() * 0.2)));
    gr.addColorStop(1, col.replace("A", "0"));
    g.fillStyle = gr;
    g.fillRect(x, y0, 1 + r() * 4, len);
  }
}
/** darker, greener grime towards the bottom (v = 0 at floor when world-mapped) */
function bottomGrime(g: G, w: number, h: number, frac: number, col: string) {
  const gr = g.createLinearGradient(0, h * (1 - frac), 0, h);
  gr.addColorStop(0, col.replace("A", "0"));
  gr.addColorStop(1, col.replace("A", "0.55"));
  g.fillStyle = gr;
  g.fillRect(0, h * (1 - frac), w, h * frac);
}

/** poured concrete wall: formwork panel lines, tie holes, stains, drips, grime at the bottom */
export const concreteWall = (seed = 1, base = "#6f716a") =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 90, "rgba(0,0,0,A)", 0.03, 0.1, 6, 40);
    blotches(g, w, h, r, 40, "rgba(255,255,255,A)", 0.02, 0.05, 6, 30);
    drips(g, w, h, r, 40, "rgba(20,22,15,A)");
    drips(g, w, h, r, 10, "rgba(120,70,30,A)");
    // formwork joints + tie holes
    g.fillStyle = "rgba(0,0,0,0.3)";
    g.fillRect(0, h / 2, w, 2); g.fillRect(w / 2, 0, 2, h);
    for (const [x, y] of [[w / 4, h / 4], [(3 * w) / 4, h / 4], [w / 4, (3 * h) / 4], [(3 * w) / 4, (3 * h) / 4]]) {
      g.fillStyle = "rgba(0,0,0,0.55)"; g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill();
    }
    speckle(g, w, h, r, 2200, 0.08);
    bottomGrime(g, w, h, 0.25, "rgba(35,45,20,A)");
  });

/** wet concrete walkway floor with puddle darkening and cracks */
export const concreteFloor = (seed = 2) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#5f605a";
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 60, "rgba(10,12,8,A)", 0.05, 0.2, 10, 45);
    blotches(g, w, h, r, 30, "rgba(60,70,40,A)", 0.05, 0.15, 5, 25);
    g.strokeStyle = "rgba(0,0,0,0.45)";
    g.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      let x = r() * w, y = r() * h;
      g.moveTo(x, y);
      for (let k = 0; k < 8; k++) { x += (r() - 0.5) * 30; y += (r() - 0.5) * 30; g.lineTo(x, y); }
      g.stroke();
    }
    speckle(g, w, h, r, 3000, 0.1);
    g.fillStyle = "rgba(0,0,0,0.35)";
    g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h);
  });

export const brick = (seed = 3, base = "#6a3b2c") =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#3a3630";
    g.fillRect(0, 0, w, h);
    const rows = 8, bw = w / 4, bh = h / rows;
    for (let y = 0; y < rows; y++)
      for (let x = -1; x < 5; x++) {
        const l = 0.75 + r() * 0.4;
        const bx = x * bw + (y % 2) * (bw / 2) + 2, by = y * bh + 2;
        g.fillStyle = base;
        g.globalAlpha = 1;
        g.fillRect(bx, by, bw - 4, bh - 4);
        g.fillStyle = `rgba(${r() < 0.3 ? "30,20,15" : "255,220,200"},${Math.abs(l - 1) * 0.6})`;
        g.fillRect(bx, by, bw - 4, bh - 4);
        g.fillStyle = "rgba(0,0,0,0.25)";
        g.fillRect(bx, by + bh - 7, bw - 4, 3);
        g.fillStyle = "rgba(255,255,255,0.07)";
        g.fillRect(bx, by, bw - 4, 2);
      }
    blotches(g, w, h, r, 30, "rgba(0,0,0,A)", 0.08, 0.25, 10, 40);
    drips(g, w, h, r, 35, "rgba(10,10,5,A)");
    drips(g, w, h, r, 10, "rgba(200,200,180,A)");
    speckle(g, w, h, r, 1800, 0.08);
    bottomGrime(g, w, h, 0.3, "rgba(25,35,15,A)");
  });

/** old white subway tiles, grout grime, a few broken tiles */
export const tiles = (seed = 4, base = "#cfd1c4") =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#4b4a40";
    g.fillRect(0, 0, w, h);
    const tw = w / 4, th = h / 8;
    for (let y = 0; y < 8; y++)
      for (let x = -1; x < 5; x++) {
        const bx = x * tw + (y % 2) * (tw / 2) + 1.5, by = y * th + 1.5;
        if (r() < 0.04) { g.fillStyle = "#3c3a33"; g.fillRect(bx, by, tw - 3, th - 3); continue; }
        g.fillStyle = base;
        g.fillRect(bx, by, tw - 3, th - 3);
        g.fillStyle = `rgba(${r() < 0.5 ? "120,110,70" : "255,255,255"},${0.05 + r() * 0.12})`;
        g.fillRect(bx, by, tw - 3, th - 3);
        g.fillStyle = "rgba(255,255,255,0.25)";
        g.fillRect(bx + 2, by + 2, tw - 8, 2);
      }
    drips(g, w, h, r, 50, "rgba(60,50,20,A)");
    blotches(g, w, h, r, 25, "rgba(50,45,20,A)", 0.05, 0.18, 8, 36);
    speckle(g, w, h, r, 1200, 0.06);
    bottomGrime(g, w, h, 0.35, "rgba(40,45,20,A)");
  });

/** heavy rust with some remaining paint (pipes, drums) */
export const rust = (seed = 5, paint: string | null = "#4d5a4a", paintAmt = 0.45) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#6b3517";
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 90, "rgba(150,70,25,A)", 0.2, 0.5, 4, 26);
    blotches(g, w, h, r, 60, "rgba(40,18,8,A)", 0.2, 0.5, 3, 18);
    if (paint) {
      g.fillStyle = paint;
      for (let i = 0; i < 40 * paintAmt; i++) {
        g.globalAlpha = 0.8;
        g.beginPath();
        const x = r() * w, y = r() * h, s = 12 + r() * 40;
        g.moveTo(x, y);
        for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2; g.lineTo(x + Math.cos(a) * s * (0.5 + r() * 0.6), y + Math.sin(a) * s * (0.5 + r() * 0.6)); }
        g.fill();
      }
      g.globalAlpha = 1;
    }
    drips(g, w, h, r, 30, "rgba(90,40,10,A)");
    speckle(g, w, h, r, 2400, 0.12);
  });

/** painted pipe with streaks (less rusty) */
export const paintedMetal = (base: string, seed = 6) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 40, "rgba(0,0,0,A)", 0.05, 0.14, 6, 30);
    blotches(g, w, h, r, 25, "rgba(120,55,20,A)", 0.2, 0.5, 2, 12);
    drips(g, w, h, r, 30, "rgba(90,40,10,A)");
    speckle(g, w, h, r, 1600, 0.08);
  });

/** corrugated metal sheet (vertical ribs) */
export const corrugated = (seed = 7, base = "#7d837f") =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    const n = 8;
    for (let x = 0; x < w; x++) {
      const s = Math.sin((x / w) * Math.PI * 2 * n);
      const l = 0.55 + s * 0.35;
      g.fillStyle = `rgb(${Math.round(125 * l + 40)},${Math.round(131 * l + 40)},${Math.round(127 * l + 40)})`;
      g.fillRect(x, 0, 1, h);
    }
    g.globalCompositeOperation = "multiply";
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = "source-over";
    blotches(g, w, h, r, 50, "rgba(120,50,15,A)", 0.15, 0.45, 4, 26);
    drips(g, w, h, r, 40, "rgba(80,35,10,A)");
    speckle(g, w, h, r, 1500, 0.08);
    bottomGrime(g, w, h, 0.3, "rgba(40,30,10,A)");
  });

/** transparent steel grate (alpha-tested) */
export const grate = () =>
  makeTex(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const n = 8, s = w / n;
    g.fillStyle = "#3b3c3a";
    for (let i = 0; i < n; i++) { g.fillRect(i * s, 0, 4, h); g.fillRect(0, i * s, w, 4); }
    g.fillStyle = "#5a5c58";
    for (let i = 0; i < n; i++) { g.fillRect(i * s, 0, 1, h); g.fillRect(0, i * s, w, 1); }
    g.fillStyle = "rgba(110,50,20,0.7)";
    const r = rng(8);
    for (let i = 0; i < 40; i++) g.fillRect(Math.floor(r() * n) * s, r() * h, 4, 3 + r() * 8);
  });

/** diamond checker plate */
export const checkerPlate = () =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(9);
    g.fillStyle = "#555853";
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16)
      for (let x = 0; x < w; x += 16) {
        g.save(); g.translate(x + 8 + ((y / 16) % 2) * 0, y + 8); g.rotate(((x + y) / 16) % 2 ? 0.8 : -0.8);
        g.fillStyle = "#777a74"; g.fillRect(-6, -1.5, 12, 3);
        g.fillStyle = "#2d2e2b"; g.fillRect(-6, 1.5, 12, 1);
        g.restore();
      }
    blotches(g, w, h, r, 20, "rgba(100,45,15,A)", 0.2, 0.5, 3, 12);
    speckle(g, w, h, r, 600, 0.08);
  });

/** murky green stagnant water with floating scum */
export const water = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(10);
    g.fillStyle = "#2a3319";
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 80, "rgba(70,85,35,A)", 0.1, 0.35, 8, 40);
    blotches(g, w, h, r, 50, "rgba(10,15,5,A)", 0.1, 0.3, 8, 40);
    for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(${120 + r() * 60},${130 + r() * 50},${70},${0.3 + r() * 0.3})`; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 2); }
    g.strokeStyle = "rgba(150,160,100,0.12)";
    g.lineWidth = 2;
    for (let i = 0; i < 12; i++) { g.beginPath(); const y = r() * h; g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + 10, w * 0.6, y - 10, w, y); g.stroke(); }
  });

/** channel walls: slime/algae line */
export const slime = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(11);
    g.fillStyle = "#4e5140";
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 80, "rgba(40,60,20,A)", 0.2, 0.5, 5, 30);
    blotches(g, w, h, r, 40, "rgba(15,20,8,A)", 0.2, 0.4, 5, 30);
    drips(g, w, h, r, 40, "rgba(90,110,40,A)");
    speckle(g, w, h, r, 2000, 0.1);
  });

/** oil drum paint: coloured with scratches, rust at edges, a band label */
export const drum = (base: string, seed = 12, band: string | null = null, label = true) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    if (band) { g.fillStyle = band; g.fillRect(0, h * 0.36, w, h * 0.28); }
    blotches(g, w, h, r, 30, "rgba(0,0,0,A)", 0.05, 0.15, 6, 26);
    blotches(g, w, h, r, 45, "rgba(110,50,15,A)", 0.12, 0.35, 2, 10);
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "rgba(90,40,12,0.6)"); gr.addColorStop(0.1, "rgba(90,40,12,0)");
    gr.addColorStop(0.9, "rgba(90,40,12,0)"); gr.addColorStop(1, "rgba(60,30,10,0.8)");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    if (label) {
      g.fillStyle = "rgba(240,235,220,0.8)";
      g.fillRect(w * 0.1, h * 0.42, w * 0.3, h * 0.16);
      g.fillStyle = "#222";
      g.font = "bold 18px monospace";
      g.fillText("OIL", w * 0.16, h * 0.53);
    }
    g.strokeStyle = "rgba(230,220,200,0.35)";
    for (let i = 0; i < 20; i++) { g.lineWidth = 0.6; g.beginPath(); const x = r() * w, y = r() * h; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 30, y + (r() - 0.5) * 8); g.stroke(); }
    speckle(g, w, h, r, 1200, 0.08);
  });

export const burlap = (base = "#8c7a55", seed = 13) =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 3) { g.fillStyle = `rgba(0,0,0,${0.12 + r() * 0.1})`; g.fillRect(0, y, w, 1); }
    for (let x = 0; x < w; x += 3) { g.fillStyle = `rgba(0,0,0,${0.1 + r() * 0.08})`; g.fillRect(x, 0, 1, h); }
    blotches(g, w, h, r, 14, "rgba(30,25,10,A)", 0.1, 0.3, 6, 24);
    speckle(g, w, h, r, 500, 0.1);
  });

export const hazard = () =>
  makeTex(128, 32, (g, w, h) => {
    const r = rng(14);
    g.fillStyle = "#e0b21a";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#1a1a1a";
    for (let x = -h; x < w + h; x += 32) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 16, h); g.lineTo(x + 16 + h, 0); g.lineTo(x + h, 0); g.fill(); }
    blotches(g, w, h, r, 20, "rgba(40,30,10,A)", 0.2, 0.5, 2, 8);
    speckle(g, w, h, r, 400, 0.12);
  });

export const sign = (text: string, bg: string, fg: string, sub = "") =>
  makeTex(256, 128, (g, w, h) => {
    const r = rng(text.length * 13);
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = fg;
    g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `bold ${sub ? 50 : 60}px Arial, sans-serif`;
    g.fillText(text, w / 2, sub ? h * 0.42 : h / 2);
    if (sub) { g.font = "bold 20px Arial, sans-serif"; g.fillText(sub, w / 2, h * 0.76); }
    blotches(g, w, h, r, 30, "rgba(60,30,10,A)", 0.1, 0.4, 3, 18);
    drips(g, w, h, r, 20, "rgba(30,20,5,A)");
    speckle(g, w, h, r, 900, 0.1);
  });

// ---------------- graffiti (transparent decals) ----------------
function bubbleText(g: G, text: string, x: number, y: number, size: number, fill: string | CanvasGradient, outline: string, shadow: string, rot = 0) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.font = `900 ${size}px Impact, "Arial Black", sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.lineJoin = "round";
  g.strokeStyle = shadow; g.lineWidth = size * 0.28;
  g.strokeText(text, size * 0.06, size * 0.06);
  g.strokeStyle = outline; g.lineWidth = size * 0.2;
  g.strokeText(text, 0, 0);
  g.fillStyle = fill;
  g.fillText(text, 0, 0);
  g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = size * 0.03;
  g.strokeText(text, -size * 0.02, -size * 0.03);
  g.restore();
}
function paintDrips(g: G, x0: number, x1: number, y: number, col: string, r: () => number, n: number) {
  g.fillStyle = col;
  for (let i = 0; i < n; i++) { const x = x0 + r() * (x1 - x0); g.fillRect(x, y, 2 + r() * 2, 8 + r() * 30); }
}
function tag(g: G, x: number, y: number, s: number, col: string, r: () => number) {
  g.strokeStyle = col; g.lineWidth = 2 + r() * 2.5; g.lineCap = "round";
  g.beginPath(); g.moveTo(x, y);
  let cx = x;
  for (let k = 0; k < 7; k++) { cx += s * (0.3 + r() * 0.4); g.quadraticCurveTo(cx - s * 0.3, y - s * (0.4 + r() * 0.8), cx, y + (r() - 0.5) * s * 0.4); }
  g.stroke();
  g.beginPath(); g.moveTo(x - 4, y + s * 0.4); g.lineTo(cx + 6, y + s * 0.3); g.stroke();
}

/** graffiti set A: bubble throw-ups in pink / cyan / yellow + tags */
export const graffitiA = (seed = 21) =>
  makeTex(512, 256, (g, w, h) => {
    const r = rng(seed);
    g.clearRect(0, 0, w, h);
    const gr1 = g.createLinearGradient(0, 60, 0, 170);
    gr1.addColorStop(0, "#ff5fa8"); gr1.addColorStop(1, "#b31f6b");
    bubbleText(g, "DRIP", 150, 115, 96, gr1, "#111", "#2de0e8", -0.06);
    paintDrips(g, 80, 220, 150, "#b31f6b", r, 7);
    const gr2 = g.createLinearGradient(0, 120, 0, 220);
    gr2.addColorStop(0, "#ffe34a"); gr2.addColorStop(1, "#ff8b1f");
    bubbleText(g, "RATZ", 380, 150, 84, gr2, "#1a1a1a", "#7a2bd8", 0.05);
    paintDrips(g, 320, 440, 185, "#ff8b1f", r, 6);
    for (let i = 0; i < 5; i++) tag(g, 20 + r() * (w - 140), 30 + r() * (h - 50), 12 + r() * 10, ["#111", "#f2f2f2", "#2de0e8", "#ff3b3b"][i % 4], r);
    g.fillStyle = "#f2f2f2"; g.font = "bold 22px 'Comic Sans MS', cursive";
    g.fillText("hide here →", 300, 235);
    // star + crown
    g.strokeStyle = "#ffe34a"; g.lineWidth = 4;
    g.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 2.513; g.lineTo(470 + Math.cos(a) * 22, 50 + Math.sin(a) * 22); } g.closePath(); g.stroke();
  });

/** graffiti set B: angular wildstyle, green/orange/purple, stencil rat, arrows, smiley */
export const graffitiB = (seed = 33) =>
  makeTex(512, 256, (g, w, h) => {
    const r = rng(seed);
    g.clearRect(0, 0, w, h);
    // wildstyle block letters with arrows
    g.save(); g.translate(40, 60); g.transform(1, -0.08, 0.25, 1, 0, 0);
    g.font = "900 110px Impact, 'Arial Black', sans-serif";
    g.lineJoin = "miter";
    g.strokeStyle = "#0d0d0d"; g.lineWidth = 22; g.strokeText("SEWR", 0, 100);
    const gr = g.createLinearGradient(0, 20, 0, 110);
    gr.addColorStop(0, "#9dff3a"); gr.addColorStop(0.5, "#27c95a"); gr.addColorStop(1, "#0e7a4a");
    g.fillStyle = gr; g.fillText("SEWR", 0, 100);
    g.strokeStyle = "#ff7a1a"; g.lineWidth = 5; g.strokeText("SEWR", 0, 100);
    g.restore();
    g.fillStyle = "#ff7a1a";
    for (const [x, y, a] of [[300, 40, 0.3], [30, 180, 2.8], [250, 190, -0.4]] as const) {
      g.save(); g.translate(x, y); g.rotate(a);
      g.beginPath(); g.moveTo(0, -6); g.lineTo(40, -6); g.lineTo(40, -16); g.lineTo(62, 0); g.lineTo(40, 16); g.lineTo(40, 6); g.lineTo(0, 6); g.fill();
      g.restore();
    }
    // stencil rat
    g.fillStyle = "#101010";
    g.beginPath(); g.ellipse(420, 170, 45, 24, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(466, 160, 20, 14, 0.3, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(480, 150); g.lineTo(500, 160); g.lineTo(482, 168); g.fill();
    g.beginPath(); g.arc(456, 144, 8, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#101010"; g.lineWidth = 4;
    g.beginPath(); g.moveTo(376, 175); g.bezierCurveTo(340, 190, 330, 150, 300, 160); g.stroke();
    for (const x of [395, 440]) g.fillRect(x, 188, 6, 14);
    // purple smiley
    g.strokeStyle = "#a347ff"; g.lineWidth = 6;
    g.beginPath(); g.arc(440, 60, 34, 0, Math.PI * 2); g.stroke();
    g.fillStyle = "#a347ff"; g.fillRect(428, 48, 5, 12); g.fillRect(448, 48, 5, 12);
    g.beginPath(); g.arc(440, 64, 18, 0.3, Math.PI - 0.3); g.stroke();
    paintDrips(g, 410, 470, 94, "#a347ff", r, 4);
    for (let i = 0; i < 4; i++) tag(g, 30 + r() * 300, 200 + r() * 40, 11 + r() * 6, ["#f2f2f2", "#ff7a1a", "#101010"][i % 3], r);
    g.fillStyle = "#f2f2f2"; g.font = "bold 20px monospace"; g.fillText("B-2 ZONE", 150, 30);
  });

// ================= v2 textures (rebuilt Sewer) =================
function blob(g: G, x: number, y: number, s: number, r: () => number, n = 11) {
  g.beginPath();
  for (let k = 0; k <= n; k++) {
    const a = (k / n) * Math.PI * 2;
    const rr = s * (0.55 + r() * 0.6);
    if (k === 0) g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
}

/** red sewer brick, 1 m tile: 4 bricks wide, 12 courses, light mortar, varied faces, soot */
export const redBrick = (seed = 3, base: [number, number, number] = [128, 58, 40], mortar = "#8a8272") =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = mortar;
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, r, 1500, 0.12);
    const rows = 12, cols = 4, bw = w / cols, bh = h / rows;
    for (let y = 0; y < rows; y++)
      for (let x = -1; x <= cols; x++) {
        const bx = x * bw + (y % 2) * (bw / 2) + 2, by = y * bh + 2;
        const v = 0.7 + r() * 0.5;
        const t = r();
        const cr = Math.round(base[0] * v * (t < 0.15 ? 0.7 : 1)), cg = Math.round(base[1] * v), cb = Math.round(base[2] * v);
        g.fillStyle = `rgb(${cr},${cg},${cb})`;
        g.fillRect(bx, by, bw - 4, bh - 4);
        for (let k = 0; k < 6; k++) {
          g.fillStyle = `rgba(${r() < 0.5 ? "20,10,5" : "200,120,90"},${0.08 + r() * 0.12})`;
          g.fillRect(bx + r() * (bw - 10), by + r() * (bh - 6), 3 + r() * 14, 2 + r() * 5);
        }
        g.fillStyle = "rgba(0,0,0,0.3)";
        g.fillRect(bx, by + bh - 6, bw - 4, 2);
        g.fillStyle = "rgba(255,230,210,0.12)";
        g.fillRect(bx, by, bw - 4, 1.5);
      }
    blotches(g, w, h, r, 22, "rgba(15,10,5,A)", 0.06, 0.18, 10, 40);
    drips(g, w, h, r, 18, "rgba(15,12,8,A)");
    speckle(g, w, h, r, 1600, 0.07);
  });

/** blue-grey wet concrete slab (one slab per tile) with stains, cracks, chipped edges */
export const slab = (seed = 2, base = "#5d6570") =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 50, "rgba(15,18,22,A)", 0.05, 0.2, 10, 50);
    blotches(g, w, h, r, 30, "rgba(200,210,220,A)", 0.04, 0.12, 6, 30);
    blotches(g, w, h, r, 14, "rgba(90,70,45,A)", 0.05, 0.14, 8, 30);
    g.strokeStyle = "rgba(10,10,12,0.3)";
    for (let i = 0; i < 2; i++) {
      g.lineWidth = 0.8;
      g.beginPath();
      let x = r() * w, y = r() * h;
      g.moveTo(x, y);
      for (let k = 0; k < 7; k++) { x += (r() - 0.5) * 40; y += (r() - 0.5) * 40; g.lineTo(x, y); }
      g.stroke();
    }
    speckle(g, w, h, r, 3500, 0.12);
    g.fillStyle = "rgba(0,0,0,0.4)";
    g.fillRect(0, 0, w, 3); g.fillRect(0, 0, 3, h);
    g.fillStyle = "rgba(255,255,255,0.12)";
    g.fillRect(0, h - 2, w, 2); g.fillRect(w - 2, 0, 2, h);
  });

/** poured concrete (walkways, arch stones, platforms) */
export const concrete2 = (seed = 1, base = "#6c6e69") =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 80, "rgba(0,0,0,A)", 0.03, 0.1, 6, 40);
    blotches(g, w, h, r, 40, "rgba(255,255,255,A)", 0.02, 0.06, 6, 30);
    drips(g, w, h, r, 30, "rgba(20,22,15,A)");
    speckle(g, w, h, r, 1600, 0.13, 2);
  });

/** muddy brown sewer water with lighter mud crusts */
export const mudWater = (seed = 10) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#735a33";
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 30, "rgba(50,35,15,A)", 0.1, 0.3, 10, 40);
    for (let i = 0; i < 16; i++) {
      const x = r() * w, y = r() * h, s = 5 + r() * 16;
      g.fillStyle = "rgba(40,28,12,0.55)";
      blob(g, x + 2, y + 2, s * 1.05, r); g.fill();
      g.fillStyle = `rgba(${150 + r() * 30},${125 + r() * 25},${90 + r() * 20},${0.55 + r() * 0.3})`;
      blob(g, x, y, s, r); g.fill();
      g.fillStyle = "rgba(90,70,40,0.4)";
      blob(g, x + 3, y + 1, s * 0.5, r); g.fill();
    }
    for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(230,210,170,${0.2 + r() * 0.4})`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
    speckle(g, w, h, r, 2000, 0.06);
  });

/** black corrugated flexible duct: ribs along U (tube length) */
export const duct = () =>
  makeTex(128, 64, (g, w, h) => {
    const r = rng(71);
    for (let x = 0; x < w; x++) {
      const s = Math.sin((x / w) * Math.PI * 2 * 8);
      const l = Math.round(18 + (s > 0 ? s : s * 0.6) * 22);
      g.fillStyle = `rgb(${l},${l},${l + 2})`;
      g.fillRect(x, 0, 1, h);
    }
    speckle(g, w, h, r, 300, 0.06);
  });

/** orange/white diagonal stripes (the big lying striped tank) */
export const stripeTank = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(15);
    g.fillStyle = "#e9e4da";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#d8531f";
    for (let x = -h; x < w + h; x += 64) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 32, h); g.lineTo(x + 32 + h, 0); g.lineTo(x + h, 0); g.fill(); }
    blotches(g, w, h, r, 30, "rgba(70,40,15,A)", 0.1, 0.3, 3, 16);
    speckle(g, w, h, r, 900, 0.08);
  });

/** grey metal locker front: vents, handle, dents */
export const locker = (base = "#6f767a", seed = 17) =>
  makeTex(128, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(0,0,0,0.45)";
    g.fillRect(0, 0, 3, h); g.fillRect(w - 3, 0, 3, h); g.fillRect(0, 0, w, 3); g.fillRect(0, h - 3, w, 3);
    for (let i = 0; i < 6; i++) { g.fillStyle = "rgba(0,0,0,0.6)"; g.fillRect(w * 0.25, 20 + i * 9, w * 0.5, 4); g.fillStyle = "rgba(255,255,255,0.2)"; g.fillRect(w * 0.25, 24 + i * 9, w * 0.5, 1); }
    for (let i = 0; i < 6; i++) { g.fillStyle = "rgba(0,0,0,0.6)"; g.fillRect(w * 0.25, h - 76 + i * 9, w * 0.5, 4); }
    g.fillStyle = "#2b2d2e"; g.fillRect(w * 0.78, h * 0.45, 8, 28);
    g.fillStyle = "rgba(255,255,255,0.3)"; g.fillRect(w * 0.78, h * 0.45, 2, 28);
    blotches(g, w, h, r, 20, "rgba(0,0,0,A)", 0.05, 0.14, 4, 20);
    blotches(g, w, h, r, 16, "rgba(120,60,20,A)", 0.15, 0.4, 2, 8);
    speckle(g, w, h, r, 900, 0.07);
  });

/** cardboard with blue packing tape and a barcode label */
export const cardboard = (seed = 51) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#b8895a";
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 4) { g.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.03})`; g.fillRect(x, 0, 2, h); }
    g.fillStyle = "#2d5fc4"; g.fillRect(0, h * 0.45, w, h * 0.1);
    g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect(0, h * 0.46, w, 3);
    g.fillStyle = "#f2f0ea"; g.fillRect(w * 0.1, h * 0.12, w * 0.34, h * 0.16);
    g.fillStyle = "#222";
    for (let i = 0; i < 18; i++) g.fillRect(w * 0.12 + i * 4.2, h * 0.15, 1 + (i % 3), h * 0.08);
    blotches(g, w, h, r, 18, "rgba(80,50,20,A)", 0.05, 0.15, 6, 30);
    speckle(g, w, h, r, 700, 0.06);
  });

/** painted window: blue sky + clouds in a white 4-pane frame (pink room decor) */
export const skyWindow = () =>
  makeTex(256, 320, (g, w, h) => {
    const r = rng(81);
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "#3d8be0"); gr.addColorStop(1, "#8cc4f2");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 7; i++) {
      const cx = r() * w, cy = 40 + r() * (h - 80);
      g.fillStyle = "rgba(255,255,255,0.85)";
      for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse(cx + (r() - 0.5) * 50, cy + (r() - 0.5) * 12, 12 + r() * 16, 7 + r() * 7, 0, 0, Math.PI * 2); g.fill(); }
    }
    g.fillStyle = "#f4f1ec";
    g.fillRect(0, 0, w, 12); g.fillRect(0, h - 12, w, 12); g.fillRect(0, 0, 12, h); g.fillRect(w - 12, 0, 12, h);
    g.fillRect(w / 2 - 6, 0, 12, h); g.fillRect(0, h * 0.5 - 6, w, 12);
    speckle(g, w, h, r, 500, 0.05);
  });

/** fabric weave (tablecloth, cushions, trolley bag) */
export const fabric = (base = "#8a1030", seed = 91) =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(0,0,0,${0.04 + r() * 0.05})`; g.fillRect(0, y, w, 1); }
    for (let x = 0; x < w; x += 2) { g.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.03})`; g.fillRect(x, 0, 1, h); }
    blotches(g, w, h, r, 10, "rgba(0,0,0,A)", 0.05, 0.12, 6, 20);
    speckle(g, w, h, r, 400, 0.06);
  });

/** wood planks (chairs, shelves, pallets, crates) */
export const planks = (base = "#9b6a3a", seed = 101) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) {
      const y0 = (i * h) / 4;
      g.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.08})`;
      g.fillRect(0, y0, w, h / 4);
      g.fillStyle = "rgba(30,15,5,0.55)";
      g.fillRect(0, y0, w, 2);
      for (let k = 0; k < 9; k++) {
        g.strokeStyle = `rgba(60,30,10,${0.1 + r() * 0.12})`;
        g.lineWidth = 1;
        g.beginPath();
        const y = y0 + r() * (h / 4);
        g.moveTo(0, y);
        g.bezierCurveTo(w * 0.3, y + r() * 6 - 3, w * 0.6, y + r() * 6 - 3, w, y);
        g.stroke();
      }
    }
    speckle(g, w, h, r, 700, 0.06);
  });

/** grimy white plastic (IBC tanks, canisters) */
export const plastic = (base = "#e6e6e0", seed = 111) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 30, "rgba(90,80,50,A)", 0.04, 0.14, 8, 40);
    drips(g, w, h, r, 30, "rgba(80,70,40,A)");
    speckle(g, w, h, r, 700, 0.05);
  });

/** transparent diamond steel mesh (alpha-tested) */
export const meshGrid = () =>
  makeTex(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = "#8d9296";
    g.lineWidth = 3;
    for (let i = -8; i <= 8; i++) {
      g.beginPath(); g.moveTo(i * 16, 0); g.lineTo(i * 16 + h, h); g.stroke();
      g.beginPath(); g.moveTo(i * 16 + h, 0); g.lineTo(i * 16, h); g.stroke();
    }
    g.fillStyle = "#6b7074";
    g.fillRect(0, 0, w, 5); g.fillRect(0, 0, 5, h);
  });

function bubble2(g: G, text: string, x: number, y: number, size: number, fill: string | CanvasGradient, outline: string, shadow: string, rot = 0) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.font = `900 ${size}px Impact, "Arial Black", sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.lineJoin = "round";
  g.strokeStyle = shadow; g.lineWidth = size * 0.3;
  g.strokeText(text, size * 0.07, size * 0.07);
  g.strokeStyle = outline; g.lineWidth = size * 0.2;
  g.strokeText(text, 0, 0);
  g.fillStyle = fill;
  g.fillText(text, 0, 0);
  g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = size * 0.03;
  g.strokeText(text, -size * 0.02, -size * 0.03);
  g.restore();
}

/** white/yellow bubble letters ("HEY") + red glowing outline letters */
export const graffitiBubble = (seed = 27) =>
  makeTex(512, 256, (g, w, h) => {
    const r = rng(seed);
    g.clearRect(0, 0, w, h);
    const gr = g.createLinearGradient(0, 120, 0, 240);
    gr.addColorStop(0, "#fffbe8"); gr.addColorStop(0.55, "#fff1a0"); gr.addColorStop(1, "#f2c21a");
    bubble2(g, "HEY", 140, 180, 120, gr, "#111", "#444", -0.05);
    g.save();
    g.translate(360, 70);
    g.font = "900 70px Impact, 'Arial Black', sans-serif";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.shadowColor = "#ff3a1a"; g.shadowBlur = 14;
    g.strokeStyle = "#ff5a2a"; g.lineWidth = 7;
    g.strokeText("SMIL", 0, 0);
    g.strokeText("OK!", 0, 80);
    g.shadowBlur = 0;
    g.strokeStyle = "#ffd0b0"; g.lineWidth = 2;
    g.strokeText("SMIL", 0, 0);
    g.strokeText("OK!", 0, 80);
    g.restore();
    g.fillStyle = "#111";
    for (let i = 0; i < 6; i++) g.fillRect(250 + r() * 200, 200 + r() * 40, 20 + r() * 30, 3);
  });

/** neon green block letters with a purple zig-zag underline */
export const graffitiNeon = (seed = 41) =>
  makeTex(512, 256, (g, w, h) => {
    const r = rng(seed);
    g.clearRect(0, 0, w, h);
    g.save();
    g.translate(30, 30);
    g.transform(1, 0, -0.12, 1, 0, 0);
    g.font = "900 130px Impact, 'Arial Black', sans-serif";
    g.textBaseline = "top";
    g.fillStyle = "#1c3a10"; g.fillText("LUSH", 8, 8);
    g.fillStyle = "#39ff2a"; g.fillText("LUSH", 0, 0);
    g.fillStyle = "#c8ffb0"; g.fillRect(40, 30, 300, 6);
    g.restore();
    g.fillStyle = "#39ff2a";
    for (let i = 0; i < 10; i++) { const x = 40 + r() * 320; g.fillRect(x, 160, 3 + r() * 2, 8 + r() * 26); }
    g.strokeStyle = "#6a2bff"; g.lineWidth = 16; g.lineJoin = "miter";
    g.beginPath(); g.moveTo(30, 205);
    for (let i = 0; i < 12; i++) g.lineTo(60 + i * 36, i % 2 ? 195 : 240);
    g.stroke();
    g.fillStyle = "#6a2bff"; g.fillRect(40, 178, 420, 10);
  });

/** blue neon snake squiggle with rings (Basin wall) */
export const graffitiSnake = () =>
  makeTex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.lineCap = "round"; g.lineJoin = "round";
    const path = () => {
      g.beginPath();
      g.moveTo(40, 40);
      g.lineTo(200, 40); g.arc(200, 80, 40, -Math.PI / 2, Math.PI / 2);
      g.lineTo(56, 120); g.arc(56, 160, 40, -Math.PI / 2, Math.PI / 2, true);
      g.lineTo(220, 200);
    };
    g.strokeStyle = "#0f1a7a"; g.lineWidth = 34; path(); g.stroke();
    g.strokeStyle = "#2a3bff"; g.lineWidth = 26; path(); g.stroke();
    g.strokeStyle = "#8aa0ff"; g.lineWidth = 4; path(); g.stroke();
    g.strokeStyle = "#dfe6ff"; g.lineWidth = 2;
    for (const [y, x0] of [[40, 50], [120, 60], [200, 60]] as const) for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(x0 + i * 26, y, 6, 0, Math.PI * 2); g.stroke(); }
    g.fillStyle = "#ffd21a"; g.beginPath(); g.ellipse(228, 22, 16, 10, 0.2, 0, Math.PI * 2); g.fill();
  });

/** rainbow bands for a RingGeometry (planar UVs, centre at 0.5,0.5; ring 0.62..1.6 of outer radius 1.6) */
export const rainbow = () =>
  makeTex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const cols = ["#e8342f", "#f08a1f", "#f5d21e", "#3db843", "#2d8fe0", "#4a3fc0", "#9a3fc8"];
    const R = w / 2;
    for (let i = 0; i < cols.length; i++) {
      const ro = R * (1 - (i * (1 - 0.62 / 1.6)) / cols.length), ri = R * (1 - ((i + 1) * (1 - 0.62 / 1.6)) / cols.length);
      g.fillStyle = cols[i];
      g.beginPath(); g.arc(w / 2, h / 2, ro, 0, Math.PI * 2); g.arc(w / 2, h / 2, ri, 0, Math.PI * 2, true); g.fill();
    }
  });
