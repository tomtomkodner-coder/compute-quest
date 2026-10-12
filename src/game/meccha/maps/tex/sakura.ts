// Canvas textures for the Cherry Blossom Garden: spring lawn with fallen petals, raked gravel, flagstone paving,
// blossom clumps (transparent), petal scatter decals, cherry bark with lenticels, granite, moss, tatami, shoji paper,
// kawara roof tiles, pond water, blue hanami tarp, paper lanterns, bamboo and wooden English signs.
import { makeTex } from "../../textures";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
type C2 = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const SERIF = `Georgia, "Times New Roman", "DejaVu Serif", serif`;
const SANS = `"Helvetica Neue", Arial, "DejaVu Sans", sans-serif`;

function blotch(g: C2, w: number, h: number, r: () => number, n: number, a: number, col: string, max = 40) {
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h, rad = 6 + r() * max;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, `rgba(${col},${a * (0.4 + r() * 0.6)})`);
    gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
}
function speck(g: C2, w: number, h: number, r: () => number, n: number, a = 0.15) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = r() < 0.5 ? `rgba(0,0,0,${r() * a})` : `rgba(255,255,255,${r() * a})`;
    g.fillRect(r() * w, r() * h, 1 + r(), 1 + r());
  }
}
/** a single 5-petal sakura flower */
function flower(g: C2, x: number, y: number, s: number, col: string, rot: number, centre = "#c2185b") {
  g.fillStyle = col;
  for (let k = 0; k < 5; k++) {
    const a = rot + (k / 5) * TAU;
    g.beginPath();
    g.ellipse(x + Math.cos(a) * s * 0.55, y + Math.sin(a) * s * 0.55, s * 0.5, s * 0.36, a, 0, TAU);
    g.fill();
  }
  g.fillStyle = centre;
  g.beginPath(); g.arc(x, y, s * 0.2, 0, TAU); g.fill();
}
const PINKS = ["#ffd6de", "#ffc6d3", "#fbb4c6", "#ffe6ec", "#f7a3b9", "#fff0f3", "#f5b0c2"];

/** spring lawn: fresh green blades, clover, a few fallen petals (1 texture ≈ 2 m) */
export const skGrass = (seed = 3, petals = 60) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#6f9a3e";
    g.fillRect(0, 0, w, h);
    blotch(g, w, h, r, 22, 0.22, "150,180,70", 50);
    blotch(g, w, h, r, 16, 0.18, "40,70,20", 45);
    for (let i = 0; i < 1700; i++) {
      const x = r() * w, y = r() * h, l = 3 + r() * 5;
      const v = r();
      g.strokeStyle = v < 0.3 ? "#557f2a" : v < 0.6 ? "#86b04a" : v < 0.85 ? "#6a9636" : "#a4c65e";
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 2, y - l); g.stroke();
    }
    for (let i = 0; i < petals; i++) { g.fillStyle = PINKS[Math.floor(r() * PINKS.length)]; g.beginPath(); g.ellipse(r() * w, r() * h, 2.6, 1.7, r() * TAU, 0, TAU); g.fill(); }
  });

/** raked white gravel (lines along u), 1 texture ≈ 1.5 m */
export const skGravel = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(11);
    g.fillStyle = "#cfc9bc";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) {
      const v = 150 + r() * 90;
      g.fillStyle = `rgb(${v},${v * 0.97},${v * 0.9})`;
      g.fillRect(r() * w, r() * h, 1.5 + r() * 2, 1.5 + r() * 2);
    }
    for (let y = 0; y < h; y += 16) {
      g.fillStyle = "rgba(60,50,40,0.22)"; g.fillRect(0, y + 11, w, 3);
      g.fillStyle = "rgba(255,255,255,0.22)"; g.fillRect(0, y + 3, w, 3);
    }
    blotch(g, w, h, r, 10, 0.08, "90,80,60", 40);
  });

/** irregular granite flagstone paving with mossy joints (1 texture ≈ 2.4 m) */
export const skFlag = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(21);
    g.fillStyle = "#5d6a44";
    g.fillRect(0, 0, w, h);
    const rows = 4;
    for (let j = 0; j < rows; j++) {
      let x = -r() * 30;
      const y0 = (j * h) / rows;
      while (x < w) {
        const sw = 40 + r() * 50;
        const v = 140 + r() * 40;
        g.fillStyle = `rgb(${v},${v * 0.97},${v * 0.9})`;
        g.beginPath();
        const pad = 3;
        g.moveTo(x + pad + r() * 3, y0 + pad + r() * 3);
        g.lineTo(x + sw - pad - r() * 3, y0 + pad + r() * 3);
        g.lineTo(x + sw - pad - r() * 3, y0 + h / rows - pad - r() * 3);
        g.lineTo(x + pad + r() * 3, y0 + h / rows - pad - r() * 3);
        g.closePath(); g.fill();
        x += sw;
      }
    }
    speck(g, w, h, r, 3000, 0.2);
    blotch(g, w, h, r, 16, 0.12, "60,70,40", 30);
    for (let i = 0; i < 40; i++) { g.fillStyle = PINKS[Math.floor(r() * PINKS.length)]; g.beginPath(); g.ellipse(r() * w, r() * h, 2.4, 1.6, r() * TAU, 0, TAU); g.fill(); }
  });

/** blossom texture on transparent background: dense small flowers + buds + dark twigs.
 *  full = 1 covers the whole square (for puff meshes), 0 = round clump (for cards) */
export const skBlossom = (seed = 31, tint = 0, full = 0, bg = "") =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.clearRect(0, 0, w, h);
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
    g.strokeStyle = "#4a2e26"; g.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const x0 = r() * w, y0 = r() * h; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + (r() - 0.5) * 90, y0 + (r() - 0.5) * 90, x0 + (r() - 0.5) * 160, y0 + (r() - 0.5) * 160); g.stroke(); }
    const pal = tint ? ["#ffffff", "#fff3f5", "#ffe8ed", "#ffdbe3", "#fbeff1"] : PINKS;
    const n = full ? 560 : 340;
    for (let i = 0; i < n; i++) {
      let x: number, y: number, d: number;
      if (full) { x = r() * w; y = r() * h; d = 0; }
      else { const a = r() * TAU; d = Math.pow(r(), 0.6) * 118; x = w / 2 + Math.cos(a) * d; y = h / 2 + Math.sin(a) * d * 0.9; }
      flower(g, x, y, 5 + r() * 3.4, pal[Math.floor(r() * pal.length)], r() * TAU, r() < 0.5 ? "#d4506e" : "#b8304e");
    }
    // soft warm shading for volume
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "rgba(255,250,240,0.12)"); gr.addColorStop(1, "rgba(150,50,60,0.2)");
    g.globalCompositeOperation = "source-atop"; g.fillStyle = gr; g.fillRect(0, 0, w, h); g.globalCompositeOperation = "source-over";
    for (let i = 0; i < 50; i++) { g.fillStyle = r() < 0.5 ? "#e8607e" : "#8fae5a"; g.beginPath(); g.ellipse(r() * w, r() * h, 1.8, 2.8, r() * 3, 0, TAU); g.fill(); }
  });

/** transparent petal scatter (fallen petals on paths, pond, grass) */
export const skPetals = (seed = 41, n = 420) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      const a = r() * TAU, d = Math.pow(r(), 0.8) * 124;
      const px = w / 2 + Math.cos(a) * d, py = h / 2 + Math.sin(a) * d;
      g.fillStyle = PINKS[Math.floor(r() * PINKS.length)];
      g.beginPath(); g.ellipse(px, py, 3.4, 2.2, r() * TAU, 0, TAU); g.fill();
      if (i % 3 === 0) { g.fillStyle = "rgba(200,60,110,0.35)"; g.fillRect(px - 1, py - 0.5, 2, 1); }
    }
  });

/** cherry bark: dark purplish brown with horizontal lenticel bands (u around, v up) */
export const skBark = () =>
  makeTex(128, 256, (g, w, h) => {
    const r = rng(51);
    g.fillStyle = "#4a3431";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { const v = 50 + r() * 50; g.fillStyle = `rgba(${v + 10},${v * 0.72},${v * 0.66},0.6)`; g.fillRect(r() * w, r() * h, 6 + r() * 20, 2 + r() * 4); }
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${170 + r() * 40},${140 + r() * 30},${120},0.5)`; g.fillRect(r() * w, r() * h, 5 + r() * 12, 1.5); }
    g.strokeStyle = "rgba(20,10,10,0.5)"; g.lineWidth = 1;
    for (let i = 0; i < 26; i++) { const y = r() * h; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + (r() - 0.5) * 6); g.stroke(); }
    blotch(g, w, h, r, 10, 0.25, "70,90,50", 20); // lichen
  });

/** granite (stone lanterns, bridge stones, rocks) */
export const skGranite = (base = "#9a968c", seed = 61) =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    speck(g, w, h, r, 2200, 0.2);
    blotch(g, w, h, r, 12, 0.2, "60,70,35", 26);
    blotch(g, w, h, r, 8, 0.15, "30,30,30", 22);
  });

/** moss / ground cover */
export const skMoss = () =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(71);
    g.fillStyle = "#4b6b2a";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) { const v = r(); g.fillStyle = v < 0.4 ? "#3d5a22" : v < 0.75 ? "#5c7e32" : "#7a9a40"; g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 1.6, 0, TAU); g.fill(); }
  });

/** tatami mat: woven rush with a dark cloth border along one edge */
export const skTatami = () =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(81);
    g.fillStyle = "#c9bf7c";
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) { const v = 180 + r() * 40; g.fillStyle = `rgba(${v},${v * 0.95},${v * 0.55},0.6)`; g.fillRect(0, y, w, 1); }
    g.fillStyle = "#2c3a2a"; g.fillRect(0, 0, 8, h); g.fillRect(w - 8, 0, 8, h);
    speck(g, w, h, r, 300, 0.1);
  });

/** shoji: white paper in a thin wooden lattice */
export const skShoji = () =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(91);
    g.fillStyle = "#f3eee0";
    g.fillRect(0, 0, w, h);
    blotch(g, w, h, r, 6, 0.08, "180,160,110", 30);
    g.fillStyle = "#8a6a44";
    for (let x = 0; x <= w; x += 32) g.fillRect(x - 2, 0, 4, h);
    for (let y = 0; y <= h; y += 42) g.fillRect(0, y - 2, w, 4);
  });

/** kawara roof tiles: rows of rounded tiles (u along eave, v up the slope) */
export const skRoof = () =>
  makeTex(256, 128, (g, w, h) => {
    const r = rng(101);
    g.fillStyle = "#3e434a";
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) {
      const gr = g.createLinearGradient(x, 0, x + 16, 0);
      gr.addColorStop(0, "#2a2e33"); gr.addColorStop(0.5, "#6b727a"); gr.addColorStop(1, "#2a2e33");
      g.fillStyle = gr; g.fillRect(x + 1, 0, 14, h);
    }
    for (let y = 0; y < h; y += 32) { g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(0, y, w, 3); }
    blotch(g, w, h, r, 10, 0.15, "90,110,60", 20);
    speck(g, w, h, r, 700, 0.12);
  });

/** pond water: murky green-blue with ripples (tiles) */
export const skWater = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(111);
    g.fillStyle = "#3f6f6a";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const x = r() * w, y = r() * h, rad = 8 + r() * 30;
      g.strokeStyle = `rgba(${r() < 0.5 ? "200,235,230" : "20,50,50"},${0.12 + r() * 0.15})`;
      g.lineWidth = 1 + r() * 2;
      for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) { g.beginPath(); g.ellipse(x + ox, y + oy, rad, rad * 0.6, r() * 0.3, 0, TAU); g.stroke(); }
    }
  });

/** blue hanami tarp: crinkled plastic with a woven grid */
export const skTarp = () =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(121);
    g.fillStyle = "#2f6fd0";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(255,255,255,0.08)";
    for (let x = 0; x < w; x += 4) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let i = 0; i < 26; i++) { g.strokeStyle = `rgba(${r() < 0.5 ? "0,0,40" : "255,255,255"},0.18)`; g.lineWidth = 1 + r() * 2; g.beginPath(); g.moveTo(r() * w, r() * h); g.lineTo(r() * w, r() * h); g.stroke(); }
    g.fillStyle = "#e8e8e8"; g.fillRect(0, 0, w, 4); g.fillRect(0, h - 4, w, 4); g.fillRect(0, 0, 4, h); g.fillRect(w - 4, 0, 4, h);
  });

/** paper lantern (chochin): ribs, colour, a painted sakura crest (u around) */
export const skLantern = (bg = "#e8433a", fg = "#ffffff") =>
  makeTex(128, 128, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(0,0,0,0.22)";
    for (let y = 4; y < h; y += 9) g.fillRect(0, y, w, 1.5);
    g.fillStyle = "#1a1a1a"; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 10, w, 10);
    flower(g, w * 0.25, h / 2, 16, fg, 0.3, bg);
    flower(g, w * 0.75, h / 2, 16, fg, 0.9, bg);
  });

/** bamboo culm: green with nodes (v up) */
export const skBamboo = () =>
  makeTex(64, 256, (g, w, h) => {
    const r = rng(131);
    const gr = g.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, "#4f7a2a"); gr.addColorStop(0.45, "#8cb050"); gr.addColorStop(1, "#4a7026");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 64) { g.fillStyle = "#c8c080"; g.fillRect(0, y, w, 3); g.fillStyle = "rgba(0,0,0,0.3)"; g.fillRect(0, y + 3, w, 2); }
    for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(230,230,180,0.2)"; g.fillRect(r() * w, r() * h, 1, 10 + r() * 20); }
  });

/** wooden sign board with carved English text */
export const skSign = (lines: string[], bg = "#6b4a2e", fg = "#fbeede", w = 256, h = 128, border = "#3a2616") =>
  makeTex(w, h, (g) => {
    const r = rng(lines.join("").length * 13 + 7);
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(0,0,0,0.18)"; g.lineWidth = 1;
    for (let y = 2; y < h; y += 5) { g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + (r() - 0.5) * 6, w * 0.7, y + (r() - 0.5) * 6, w, y); g.stroke(); }
    g.strokeStyle = border; g.lineWidth = Math.max(4, h * 0.05); g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth);
    g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle";
    const n = lines.length;
    const fs = Math.min(h * (n > 1 ? 0.3 : 0.44), (w * 1.55) / Math.max(...lines.map((l) => l.length)));
    g.font = `bold ${fs}px ${n > 2 ? SANS : SERIF}`;
    lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (n - 1) / 2) * fs * 1.15));
    flower(g, h * 0.16, h * 0.2, h * 0.07, "#f7a5c0", 0.4);
    flower(g, w - h * 0.16, h * 0.2, h * 0.07, "#f7a5c0", 1.1);
  });

/** red felt (nodate bench / picnic cushion) */
export const skFelt = (base = "#c8242c", seed = 141) =>
  makeTex(64, 64, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    speck(g, w, h, r, 900, 0.14);
  });

/** far mountains band (transparent above the ridge): layered blue ridges with snow caps */
export const skMountains = () =>
  makeTex(512, 128, (g, w, h) => {
    const r = rng(151);
    g.clearRect(0, 0, w, h);
    const layers = [["#8fb0cf", 0.25], ["#6f93b8", 0.45], ["#56799e", 0.62]] as [string, number][];
    for (const [c, base] of layers) {
      g.fillStyle = c;
      g.beginPath(); g.moveTo(0, h);
      let y = h * base + 10;
      const pts: [number, number][] = [];
      for (let x = 0; x <= w; x += 8) { y += (r() - 0.5) * 16; y = Math.max(h * (base - 0.2), Math.min(h * (base + 0.2), y)); pts.push([x, y]); g.lineTo(x, y); }
      g.lineTo(w, h); g.closePath(); g.fill();
      if (base < 0.5) { g.fillStyle = "rgba(255,255,255,0.75)"; for (const [x, yy] of pts) if (yy < h * (base - 0.08)) g.fillRect(x - 3, yy, 7, 3 + r() * 3); }
    }
  });

/** paper note / letter / slip: optional bold title, handwritten-style lines, ruled paper, pin or fold */
export const skNote = (title: string, lines: string[], paper = "#f6f0e0", ink = "#2a2440", w = 256, h = 256, ruled = true) =>
  makeTex(w, h, (g) => {
    const r = rng(title.length * 31 + lines.length * 7);
    g.fillStyle = paper; g.fillRect(0, 0, w, h);
    blotch(g, w, h, r, 5, 0.06, "120,90,40", 40);
    const n = lines.length + (title ? 1.4 : 0);
    const lh = Math.min(h * 0.13, (h * 0.86) / Math.max(1, n));
    if (ruled) { g.fillStyle = "rgba(90,120,180,0.25)"; for (let y = h * 0.07 + lh * (title ? 1.4 : 0) + lh * 0.85; y < h; y += lh) g.fillRect(w * 0.04, y, w * 0.92, 1); }
    let y = h * 0.07;
    g.textBaseline = "top"; g.fillStyle = ink;
    if (title) {
      g.textAlign = "center";
      g.font = `bold ${lh * 0.95}px ${SANS}`;
      g.fillText(title, w / 2, y, w * 0.9);
      y += lh * 1.4;
    }
    g.textAlign = "left";
    g.font = `italic ${lh * 0.72}px ${SERIF}`;
    for (const l of lines) { g.fillText(l, w * 0.07, y + lh * 0.12, w * 0.88); y += lh; }
    g.fillStyle = "rgba(0,0,0,0.08)"; g.fillRect(w - 18, 0, 18, 18);
  });
