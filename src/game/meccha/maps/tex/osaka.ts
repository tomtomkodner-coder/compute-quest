// Canvas textures for the Osaka map: grimy arcade paving, cracked asphalt, stained concrete, mosaic facade tiles,
// rusty roll-down shutters, corrugated iron, Japanese shop signs (horizontal / vertical / neon), vending-machine
// fronts, drugstore shelves, noren curtains, flyers, windows, canal stone, oil-drum rust, manholes and menus.
import { makeTex } from "../../textures";

export function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const JP = `"IPAPGothic", "IPAGothic", "Hiragino Sans", "Noto Sans CJK JP", "WenQuanYi Zen Hei", sans-serif`;

function grime(g: CanvasRenderingContext2D, w: number, h: number, r: () => number, n: number, a = 0.12, dark = "20,16,10") {
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h, rad = 10 + r() * 60;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, `rgba(${dark},${a * r()})`);
    gr.addColorStop(1, `rgba(${dark},0)`);
    g.fillStyle = gr;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
}
function speck(g: CanvasRenderingContext2D, w: number, h: number, r: () => number, n: number, a = 0.15) {
  for (let i = 0; i < n; i++) { g.fillStyle = r() < 0.5 ? `rgba(0,0,0,${r() * a})` : `rgba(255,255,255,${r() * a * 0.7})`; g.fillRect(r() * w, r() * h, 1 + r() * 1.5, 1 + r() * 1.5); }
}
/** vertical rain streaks */
function streaks(g: CanvasRenderingContext2D, w: number, h: number, r: () => number, n: number, a = 0.18) {
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h * 0.4, len = 40 + r() * h * 0.7;
    const gr = g.createLinearGradient(0, y, 0, y + len);
    gr.addColorStop(0, `rgba(30,24,18,${a * r()})`);
    gr.addColorStop(1, "rgba(30,24,18,0)");
    g.fillStyle = gr;
    g.fillRect(x, y, 2 + r() * 5, len);
  }
}

/** arcade floor: two-tone interlocking pavers with a pattern band, grimy */
export const osPaving = () =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(11);
    g.fillStyle = "#6d675f";
    g.fillRect(0, 0, w, h);
    const s = 64;
    for (let y = 0; y < h / s; y++)
      for (let x = 0; x < w / s; x++) {
        const band = x === 3 || x === 4;
        const base = band ? ((x + y) % 2 ? [150, 92, 70] : [196, 176, 140]) : (x + y) % 2 ? [170, 160, 146] : [152, 144, 132];
        const v = (r() - 0.5) * 18;
        g.fillStyle = `rgb(${base[0] + v},${base[1] + v},${base[2] + v})`;
        g.fillRect(x * s + 2, y * s + 2, s - 4, s - 4);
        g.fillStyle = "rgba(255,255,255,0.08)";
        g.fillRect(x * s + 2, y * s + 2, s - 4, 3);
      }
    grime(g, w, h, r, 60, 0.35);
    speck(g, w, h, r, 5000, 0.2);
    // gum spots & stains
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(40,36,30,${0.3 + r() * 0.3})`; g.beginPath(); g.arc(r() * w, r() * h, 1.5 + r() * 3, 0, 6.3); g.fill(); }
  });

/** cracked asphalt with patches and faded paint */
export const osAsphalt = () =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(23);
    g.fillStyle = "#4b4a4a";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { const v = 50 + r() * 60; g.fillStyle = `rgba(${v},${v},${v - 4},0.5)`; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
    // patches
    for (let i = 0; i < 5; i++) { g.fillStyle = `rgba(${40 + r() * 20},${40 + r() * 20},${42 + r() * 20},0.7)`; g.fillRect(r() * w, r() * h, 60 + r() * 120, 40 + r() * 90); }
    grime(g, w, h, r, 40, 0.35, "10,10,10");
    // cracks
    g.strokeStyle = "rgba(15,15,15,0.8)";
    for (let i = 0; i < 14; i++) {
      g.lineWidth = 1 + r() * 1.5;
      let x = r() * w, y = r() * h;
      g.beginPath(); g.moveTo(x, y);
      for (let j = 0; j < 8; j++) { x += (r() - 0.5) * 50; y += (r() - 0.5) * 50; g.lineTo(x, y); }
      g.stroke();
    }
  });

/** stained concrete / mortar wall */
export const osConcrete = (base = "#8e8a82", seed = 4) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    speck(g, w, h, r, 4000, 0.2);
    grime(g, w, h, r, 30, 0.3);
    streaks(g, w, h, r, 30, 0.25);
    // formwork tie holes
    for (let y = 32; y < h; y += 128) for (let x = 32; x < w; x += 128) { g.fillStyle = "rgba(0,0,0,0.35)"; g.beginPath(); g.arc(x, y, 4, 0, 6.3); g.fill(); }
  });

/** small mosaic facade tiles */
export const osMosaic = (a: string, b: string, seed = 5) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#77736b";
    g.fillRect(0, 0, w, h);
    const s = 16;
    for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) {
      g.fillStyle = r() < 0.5 ? a : b;
      g.globalAlpha = 0.8 + r() * 0.2;
      g.fillRect(x + 1, y + 1, s - 2, s - 2);
    }
    g.globalAlpha = 1;
    streaks(g, w, h, r, 20, 0.3);
    grime(g, w, h, r, 20, 0.2);
  });

/** roll-down shutter: horizontal slats, rust bleeding, stickers */
export const osShutter = (seed = 3, tint = "#9aa0a3") =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = tint;
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 10) {
      const gr = g.createLinearGradient(0, y, 0, y + 10);
      gr.addColorStop(0, "rgba(255,255,255,0.28)");
      gr.addColorStop(0.5, "rgba(0,0,0,0)");
      gr.addColorStop(0.85, "rgba(0,0,0,0.3)");
      gr.addColorStop(1, "rgba(0,0,0,0.5)");
      g.fillStyle = gr;
      g.fillRect(0, y, w, 10);
    }
    // rust
    for (let i = 0; i < 25; i++) {
      const x = r() * w, y = r() * h, len = 20 + r() * 90;
      const gr = g.createLinearGradient(0, y, 0, y + len);
      gr.addColorStop(0, `rgba(130,60,20,${0.3 + r() * 0.4})`);
      gr.addColorStop(1, "rgba(130,60,20,0)");
      g.fillStyle = gr;
      g.fillRect(x, y, 3 + r() * 10, len);
    }
    grime(g, w, h, r, 20, 0.35);
    speck(g, w, h, r, 1500, 0.2);
    // stickers / tags
    for (let i = 0; i < 3; i++) { g.fillStyle = ["#f4f1e8", "#f0d64a", "#e25b45"][i]; g.save(); g.translate(r() * w, 40 + r() * (h - 80)); g.rotate((r() - 0.5) * 0.3); g.fillRect(0, 0, 18 + r() * 20, 12 + r() * 18); g.restore(); }
  });

/** rusty corrugated iron sheet (vertical ribs) */
export const osCorrugated = (base = "#8a8f8c", seed = 8) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) {
      const gr = g.createLinearGradient(x, 0, x + 16, 0);
      gr.addColorStop(0, "rgba(0,0,0,0.3)");
      gr.addColorStop(0.5, "rgba(255,255,255,0.25)");
      gr.addColorStop(1, "rgba(0,0,0,0.3)");
      g.fillStyle = gr;
      g.fillRect(x, 0, 16, h);
    }
    for (let i = 0; i < 30; i++) {
      const x = r() * w, y = r() * h, rad = 10 + r() * 40;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, `rgba(140,65,25,${0.4 + r() * 0.4})`);
      gr.addColorStop(1, "rgba(140,65,25,0)");
      g.fillStyle = gr;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    streaks(g, w, h, r, 20, 0.35);
  });

export type SignOpts = { vertical?: boolean; border?: string; sub?: string; neon?: boolean; font?: number; w?: number; h?: number; worn?: number; seed?: number };
/** Japanese shop sign: bg, fg text, optional border & sub line; vertical = top-to-bottom characters */
export const osSign = (text: string, bg: string, fg: string, o: SignOpts = {}) => {
  const W = o.w ?? (o.vertical ? 96 : 384), H = o.h ?? (o.vertical ? 384 : 128);
  return makeTex(W, H, (g, w, h) => {
    const r = rng(o.seed ?? text.length * 7 + 1);
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    if (o.border) { g.strokeStyle = o.border; g.lineWidth = Math.max(4, Math.min(w, h) * 0.06); g.strokeRect(g.lineWidth, g.lineWidth, w - g.lineWidth * 2, h - g.lineWidth * 2); }
    g.fillStyle = fg;
    g.textAlign = "center";
    g.textBaseline = "middle";
    if (o.neon) { g.shadowColor = fg; g.shadowBlur = 14; }
    const chars = [...text];
    if (o.vertical) {
      const n = chars.length + (o.sub ? 1 : 0);
      const fs = Math.min(w * 0.72, (h * 0.86) / n);
      g.font = `bold ${fs}px ${JP}`;
      chars.forEach((c, i) => g.fillText(c, w / 2, h * 0.07 + fs * (i + 0.5)));
      if (o.sub) { g.font = `bold ${fs * 0.45}px ${JP}`; g.fillText(o.sub, w / 2, h * 0.07 + fs * (chars.length + 0.5)); }
    } else {
      const fs = o.font ?? Math.min(h * (o.sub ? 0.56 : 0.7), (w * 0.86) / Math.max(1, chars.length));
      g.font = `bold ${fs}px ${JP}`;
      g.fillText(text, w / 2, o.sub ? h * 0.42 : h / 2 + 2);
      if (o.sub) { g.font = `bold ${h * 0.2}px ${JP}`; g.fillText(o.sub, w / 2, h * 0.82); }
    }
    g.shadowBlur = 0;
    const worn = o.worn ?? 0.5;
    if (worn > 0) {
      grime(g, w, h, r, 14, 0.3 * worn);
      streaks(g, w, h, r, 8, 0.25 * worn);
      speck(g, w, h, r, 500, 0.2 * worn);
    }
  });
};

/** vending machine front: drink rows, buttons, coin slot, lit panel */
export const osVending = (body: string, seed = 2) =>
  makeTex(256, 512, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = body;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#e9f4ff";
    g.fillRect(14, 20, w - 28, 280);
    const cols = ["#d9262b", "#1f6fd1", "#f0b31d", "#2fa34a", "#e8e8e8", "#6b3a1f", "#ff7a1a", "#1d1d1d"];
    for (let row = 0; row < 4; row++) {
      g.fillStyle = "rgba(0,0,0,0.12)";
      g.fillRect(14, 20 + row * 70 + 58, w - 28, 12);
      for (let i = 0; i < 7; i++) {
        const x = 22 + i * 31, y = 20 + row * 70 + 8;
        g.fillStyle = cols[Math.floor(r() * cols.length)];
        g.beginPath(); g.roundRect(x, y + 6, 22, 44, 5); g.fill();
        g.fillStyle = "rgba(255,255,255,0.45)"; g.fillRect(x + 4, y + 10, 4, 34);
        g.fillStyle = "#dddddd"; g.fillRect(x + 5, y, 12, 7);
        g.fillStyle = r() < 0.3 ? "#ff3b30" : "#1f6fd1"; g.fillRect(x + 2, y + 54, 18, 6);
      }
    }
    g.fillStyle = "#1a1a1a";
    g.fillRect(24, 320, 90, 40);
    g.fillStyle = "#4cff6a"; g.font = "bold 22px monospace"; g.fillText("150", 40, 348);
    g.fillStyle = "#c9c9c9"; g.fillRect(150, 318, 50, 70);
    g.fillStyle = "#333"; g.fillRect(170, 330, 8, 26);
    g.fillStyle = "#222"; g.fillRect(24, 420, w - 48, 60);
    g.fillStyle = "rgba(255,255,255,0.15)"; g.fillRect(24, 420, w - 48, 8);
    grime(g, w, h, r, 20, 0.25);
    speck(g, w, h, r, 800, 0.15);
  });

/** shop shelf of products (drugstore / convenience) */
export const osGoods = (seed = 6) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#e8e4dc";
    g.fillRect(0, 0, w, h);
    const cols = ["#e63946", "#f1c40f", "#3498db", "#2ecc71", "#ffffff", "#ff8fab", "#9b59b6", "#f39c12", "#1abc9c", "#34495e"];
    for (let row = 0; row < 4; row++) {
      let x = 2;
      while (x < w - 4) {
        const bw = 10 + r() * 22, bh = 30 + r() * 28;
        g.fillStyle = cols[Math.floor(r() * cols.length)];
        g.fillRect(x, row * 64 + 60 - bh, bw - 2, bh);
        g.fillStyle = "rgba(255,255,255,0.6)"; g.fillRect(x + 2, row * 64 + 60 - bh + 6, bw - 6, 5);
        g.fillStyle = "rgba(0,0,0,0.2)"; g.fillRect(x + bw - 4, row * 64 + 60 - bh, 2, bh);
        x += bw;
      }
      g.fillStyle = "#b9b4aa"; g.fillRect(0, row * 64 + 58, w, 6);
      g.fillStyle = "#ffe14d"; for (let i = 0; i < 5; i++) g.fillRect(8 + i * 50, row * 64 + 58, 18, 6);
    }
  });

/** noren curtain: split cloth with text */
export const osNoren = (text: string, bg: string, fg = "#ffffff") =>
  makeTex(256, 128, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = fg;
    g.font = `bold ${h * 0.46}px ${JP}`;
    g.textAlign = "center"; g.textBaseline = "middle";
    const chars = [...text];
    chars.forEach((c, i) => g.fillText(c, (w / chars.length) * (i + 0.5), h * 0.45));
    g.fillStyle = "rgba(0,0,0,0.5)";
    for (let i = 1; i < chars.length; i++) g.fillRect((w / chars.length) * i - 2, h * 0.18, 4, h);
    g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(0, 0, w, 10);
  });

/** wall of torn flyers and posters */
export const osFlyers = (seed = 9) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#8b857a";
    g.fillRect(0, 0, w, h);
    const cols = ["#f4efe1", "#f7d046", "#e04a3a", "#3b7dd8", "#f19ac0", "#ffffff", "#8fd16a"];
    const words = ["大安売", "特価", "募集", "祭", "激安", "営業中", "貸店舗", "閉店"];
    for (let i = 0; i < 26; i++) {
      g.save();
      g.translate(r() * w, r() * h);
      g.rotate((r() - 0.5) * 0.25);
      const pw = 30 + r() * 50, ph = 40 + r() * 60;
      g.fillStyle = cols[Math.floor(r() * cols.length)];
      g.fillRect(-pw / 2, -ph / 2, pw, ph);
      g.fillStyle = r() < 0.5 ? "#222" : "#c0392b";
      g.font = `bold ${pw * 0.28}px ${JP}`;
      g.textAlign = "center";
      g.fillText(words[Math.floor(r() * words.length)], 0, -ph * 0.1);
      g.fillRect(-pw * 0.35, ph * 0.12, pw * 0.7, 3); g.fillRect(-pw * 0.35, ph * 0.24, pw * 0.5, 3);
      g.restore();
    }
    grime(g, w, h, r, 20, 0.35);
    streaks(g, w, h, r, 16, 0.3);
  });

/** upper-floor window: frame, glass with reflection, curtain or blinds; lit variants */
export const osWindow = (seed = 1, lit = false) =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#b8b8b0";
    g.fillRect(0, 0, w, h);
    g.fillStyle = lit ? "#ffd89a" : "#3e4a55";
    g.fillRect(10, 10, w - 20, h - 20);
    if (r() < 0.6) { g.fillStyle = lit ? "rgba(255,240,200,0.8)" : "rgba(210,200,180,0.7)"; for (let y = 12; y < h - 12; y += 6) g.fillRect(10, y, w - 20, 3.5); }
    else { g.fillStyle = lit ? "rgba(255,170,110,0.7)" : "rgba(140,120,100,0.6)"; g.fillRect(10, 10, 34, h - 20); g.fillRect(w - 44, 10, 34, h - 20); }
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, "rgba(255,255,255,0.25)"); gr.addColorStop(0.5, "rgba(255,255,255,0)"); gr.addColorStop(1, "rgba(255,255,255,0.1)");
    g.fillStyle = gr; g.fillRect(10, 10, w - 20, h - 20);
    g.fillStyle = "#9c9c94"; g.fillRect(w / 2 - 2, 10, 4, h - 20);
    g.fillStyle = "rgba(0,0,0,0.3)"; g.fillRect(6, h - 12, w - 12, 5);
  });

/** canal embankment stone blocks */
export const osStone = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(31);
    g.fillStyle = "#5a5a55";
    g.fillRect(0, 0, w, h);
    const bh = 32;
    for (let y = 0; y < h; y += bh) {
      const off = (y / bh) % 2 ? 32 : 0;
      for (let x = -64; x < w; x += 64) {
        const v = 90 + r() * 40;
        g.fillStyle = `rgb(${v},${v - 2},${v - 8})`;
        g.fillRect(x + off + 2, y + 2, 60, bh - 4);
      }
    }
    speck(g, w, h, r, 3000, 0.25);
    grime(g, w, h, r, 20, 0.3, "20,40,20");
  });

/** rusty oil drum / painted steel */
export const osDrum = (base: string, seed = 12) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      const x = r() * w, y = r() * h, rad = 6 + r() * 36;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, `rgba(120,55,20,${0.5 + r() * 0.4})`);
      gr.addColorStop(1, "rgba(120,55,20,0)");
      g.fillStyle = gr;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    streaks(g, w, h, r, 18, 0.35);
    speck(g, w, h, r, 1200, 0.25);
  });

/** manhole cover (circle in the middle) */
export const osManhole = () =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(41);
    g.fillStyle = "#3b3a38";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#5e5b55"; g.lineWidth = 3;
    for (let i = 1; i < 6; i++) { g.beginPath(); g.arc(w / 2, h / 2, i * 11, 0, 6.3); g.stroke(); }
    for (let a = 0; a < 12; a++) { g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w / 2 + Math.cos(a * 0.52) * 60, h / 2 + Math.sin(a * 0.52) * 60); g.stroke(); }
    speck(g, w, h, r, 800, 0.3);
  });

/** menu board (price list) */
export const osMenu = (title: string, seed = 3) =>
  makeTex(128, 192, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#1d2a22";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#8a6a3a"; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = "#fff8e0";
    g.font = `bold 22px ${JP}`;
    g.textAlign = "center";
    g.fillText(title, w / 2, 32);
    g.font = `16px ${JP}`;
    g.textAlign = "left";
    const items = ["焼", "並", "大", "特", "盛", "汁"];
    for (let i = 0; i < 6; i++) { g.fillStyle = r() < 0.3 ? "#ffd166" : "#fff8e0"; g.fillText(items[i] + "・・・" + (300 + Math.floor(r() * 8) * 50), 14, 62 + i * 21); }
  });

/** water: dark green murky with ripples */
export const osWater = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(51);
    g.fillStyle = "#2c3a33";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) {
      g.strokeStyle = `rgba(${r() < 0.5 ? "120,150,130" : "10,20,15"},${0.15 + r() * 0.2})`;
      g.lineWidth = 1 + r() * 2;
      const x = r() * w, y = r() * h, l = 10 + r() * 40;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y + (r() - 0.5) * 6, x + l, y); g.stroke();
    }
  });

/** paper lantern (chochin): red with black text band */
export const osLantern = (text: string, base = "#d8262b") =>
  makeTex(128, 128, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(0,0,0,0.18)";
    for (let y = 0; y < h; y += 8) g.fillRect(0, y, w, 2);
    g.fillStyle = "#111";
    g.font = `bold 44px ${JP}`;
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(text, w * 0.25, h / 2);
    g.fillText(text, w * 0.75, h / 2);
    g.fillRect(0, 0, w, 12); g.fillRect(0, h - 12, w, 12);
  });

/** beer-crate plastic with holes */
export const osCrate = (base: string) =>
  makeTex(128, 128, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(0,0,0,0.45)";
    for (let y = 0; y < 3; y++) for (let x = 0; x < 4; x++) { g.beginPath(); g.roundRect(8 + x * 30, 14 + y * 36, 22, 26, 6); g.fill(); }
    g.fillStyle = "rgba(255,255,255,0.15)"; g.fillRect(0, 0, w, 6);
  });

/** cardboard */
export const osCardboard = () =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(61);
    g.fillStyle = "#b08a5a";
    g.fillRect(0, 0, w, h);
    speck(g, w, h, r, 900, 0.15);
    g.fillStyle = "rgba(160,120,70,0.7)"; g.fillRect(0, h / 2 - 8, w, 16);
    g.fillStyle = "rgba(40,30,20,0.6)"; g.font = "bold 14px sans-serif"; g.fillText("FRAGILE", 20, 30);
    grime(g, w, h, r, 8, 0.3);
  });

/** distant building facade: window grid, some lit */
export const osTower = (base: string, seed = 71) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const lit = r() < 0.3;
      g.fillStyle = lit ? (r() < 0.5 ? "#ffd58a" : "#dff0ff") : `rgb(${40 + r() * 20},${48 + r() * 20},${58 + r() * 20})`;
      g.fillRect(x * 64 + 10, y * 64 + 14, 44, 36);
      g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(x * 64 + 8, y * 64 + 50, 48, 4);
    }
    streaks(g, w, h, r, 20, 0.3);
    grime(g, w, h, r, 10, 0.2);
  });

/** okonomiyaki top: sauce, mayo zigzag, aonori, bonito */
export const osOkonomi = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(81);
    g.fillStyle = "#5a2a12";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#fff6d8"; g.lineWidth = 7; g.lineJoin = "round";
    for (let k = 0; k < 2; k++) { g.beginPath(); for (let i = 0; i <= 12; i++) { const x = 20 + i * 18, y = (i % 2 ? 60 : 196); k ? g.lineTo(y, x) : g.lineTo(x, y); } g.stroke(); }
    for (let i = 0; i < 500; i++) { g.fillStyle = r() < 0.7 ? "#3f7d2a" : "#d9a066"; g.fillRect(r() * w, r() * h, 2 + r() * 3, 2 + r() * 2); }
  });

/** takoyaki griddle top: rows of half-sphere pits with balls */
export const osGriddle = () =>
  makeTex(256, 128, (g, w, h) => {
    g.fillStyle = "#2a2622";
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < 3; y++) for (let x = 0; x < 7; x++) {
      const cx = 20 + x * 36, cy = 22 + y * 40;
      g.fillStyle = "#b8702e"; g.beginPath(); g.arc(cx, cy, 15, 0, 6.3); g.fill();
      g.fillStyle = "#5a2a12"; g.beginPath(); g.arc(cx, cy - 2, 10, 0, 6.3); g.fill();
      g.fillStyle = "#f4efe0"; g.fillRect(cx - 8, cy - 4, 16, 2);
      g.fillStyle = "#3f7d2a"; g.fillRect(cx - 3, cy + 2, 3, 2);
    }
  });
