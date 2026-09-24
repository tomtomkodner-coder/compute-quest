// Greece (Santorini) textures: lime-washed plaster, white-outlined flagstones, pebble mosaic, louvred blue shutters,
// planked doors, volcanic cliff strata, sea ripples, thatch, sail cloth, café signs, check tablecloth, bougainvillea.
import { makeTex } from "../../textures";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
type C = CanvasRenderingContext2D;
function blotches(g: C, w: number, h: number, r: () => number, n: number, col: string, amax: number, smax = 40) {
  for (let i = 0; i < n; i++) {
    g.globalAlpha = r() * amax;
    g.fillStyle = col;
    g.beginPath();
    g.ellipse(r() * w, r() * h, 6 + r() * smax, 4 + r() * smax * 0.6, r() * 3, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
}
function speckle(g: C, w: number, h: number, r: () => number, n: number, a: number) {
  for (let i = 0; i < n; i++) {
    const v = (r() - 0.5) * a * 2;
    g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(40,40,50,${-v})`;
    g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
  }
}

/** lime-washed plaster: soft trowel unevenness, faint drips (white or pastel) */
export const plaster = (base = "#f3f0ea", seed = 1) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 60, "#c9c2b6", 0.06, 50);
    blotches(g, w, h, r, 50, "#ffffff", 0.1, 40);
    for (let i = 0; i < 40; i++) { // trowel arcs
      g.strokeStyle = `rgba(150,140,125,${0.04 + r() * 0.05})`; g.lineWidth = 1 + r() * 2;
      g.beginPath(); const x = r() * w, y = r() * h, rad = 20 + r() * 50; g.arc(x, y, rad, r() * 6, r() * 6 + 1.2); g.stroke();
    }
    speckle(g, w, h, r, 1800, 0.05);
  });

/** Santorini paving: irregular grey-beige flagstones with thick white-painted joints. 512 = 3m */
export const flagstone = (seed = 2, stone = "#a79e92") =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#f2efe8"; g.fillRect(0, 0, w, h);
    const rows = [0, 70, 150, 215, 300, 370, 445, 512];
    const base = [parseInt(stone.slice(1, 3), 16), parseInt(stone.slice(3, 5), 16), parseInt(stone.slice(5, 7), 16)];
    for (let i = 0; i < rows.length - 1; i++) {
      const y0 = rows[i], y1 = rows[i + 1];
      let x = r() * 50;
      while (x < w + 80) {
        const bw = 55 + r() * 95;
        const t = (r() - 0.5) * 30;
        for (const ox of [0, -w]) {
          g.fillStyle = `rgb(${base[0] + t},${base[1] + t},${base[2] + t * 0.9})`;
          g.beginPath();
          const j = () => (r() - 0.5) * 8;
          g.moveTo(x + ox + 6 + j(), y0 + 6 + j());
          g.lineTo(x + ox + bw - 6 + j(), y0 + 6 + j());
          g.lineTo(x + ox + bw - 6 + j(), y1 - 6 + j());
          g.lineTo(x + ox + 6 + j(), y1 - 6 + j());
          g.closePath();
          g.fill();
        }
        x += bw;
      }
    }
    blotches(g, w, h, r, 60, "#6d665e", 0.08, 40);
    speckle(g, w, h, r, 7000, 0.1);
  });

/** pebble mosaic for the plaza: light field with dark pebble waves and rosettes. 512 = 4m */
export const pebbles = (seed = 3) =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#cfc6b8"; g.fillRect(0, 0, w, h);
    const peb = (x: number, y: number, s: number, dark: boolean) => {
      const t = (r() - 0.5) * 30;
      g.fillStyle = dark ? `rgb(${60 + t},${62 + t},${66 + t})` : `rgb(${225 + t * 0.5},${220 + t * 0.5},${210 + t * 0.5})`;
      g.beginPath(); g.ellipse(x, y, s, s * (0.55 + r() * 0.3), r() * 3, 0, Math.PI * 2); g.fill();
      g.fillStyle = "rgba(0,0,0,0.18)"; g.beginPath(); g.ellipse(x + 1, y + 1.5, s, s * 0.5, 0, 0, Math.PI); g.fill();
    };
    for (let y = 4; y < h; y += 9) for (let x = 4 + ((y / 9) % 2) * 4; x < w; x += 9) {
      const d = Math.min(Math.hypot(x - 128, y - 128), Math.hypot(x - 384, y - 384), Math.hypot(x - 384, y - 128), Math.hypot(x - 128, y - 384));
      const wave = Math.sin(x / 40 + Math.sin(y / 60) * 2) > 0.85;
      const ring = (d > 60 && d < 76) || (d < 18) || (d > 36 && d < 44 && Math.floor(Math.atan2(y - 128, x - 128) * 4) % 2 === 0);
      peb(x + (r() - 0.5) * 3, y + (r() - 0.5) * 3, 3.6 + r() * 1.2, ring || wave);
    }
  });

/** louvred shutter / door leaf. 128x256 */
export const shutter = (col = "#1f5fae", seed = 4) =>
  makeTex(128, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = col; g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 10, w, 10); g.fillRect(0, 0, 10, h); g.fillRect(w - 10, 0, 10, h); g.fillRect(0, h / 2 - 5, w, 10);
    g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect(10, 10, w - 20, 2); g.fillRect(10, h / 2 + 5, w - 20, 2);
    for (let y = 16; y < h - 12; y += 9) {
      if (Math.abs(y - h / 2) < 8) continue;
      g.fillStyle = "rgba(0,0,0,0.32)"; g.fillRect(12, y + 5, w - 24, 3);
      g.fillStyle = "rgba(255,255,255,0.22)"; g.fillRect(12, y, w - 24, 2);
    }
    blotches(g, w, h, r, 16, "#ffffff", 0.08, 14); // chipped paint
    speckle(g, w, h, r, 500, 0.08);
  });

/** planked door with a lintel panel */
export const door = (col = "#1f5fae", seed = 5) =>
  makeTex(128, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = col; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 21) { g.fillStyle = "rgba(0,0,0,0.3)"; g.fillRect(x, 0, 2, h); g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(x + 2, 0, 1, h); }
    g.fillStyle = "rgba(0,0,0,0.25)"; for (const y of [40, 150, 230]) g.fillRect(6, y, w - 12, 10);
    g.fillStyle = "#1a2433"; g.fillRect(24, 12, w - 48, 22); // small window
    g.strokeStyle = "rgba(255,255,255,0.4)"; g.lineWidth = 2; g.strokeRect(24, 12, w - 48, 22);
    g.fillStyle = "#c9a44a"; g.beginPath(); g.arc(w - 18, h * 0.55, 4, 0, Math.PI * 2); g.fill();
    blotches(g, w, h, r, 14, "#ffffff", 0.07, 14);
  });

/** volcanic caldera cliff: red / black / cream strata, eroded */
export const cliff = (seed = 6) =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(seed);
    const bands = ["#6e3a2a", "#3b2c28", "#9a5a3c", "#c8b49a", "#5a2f25", "#2d2624", "#8c6a52", "#b4876a"];
    let y = 0;
    while (y < h) {
      const bh = 12 + r() * 50;
      g.fillStyle = bands[Math.floor(r() * bands.length)];
      g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x / 50 + y) * 4 + (r() - 0.5) * 3);
      for (let x = w; x >= 0; x -= 16) g.lineTo(x, y + bh + Math.sin(x / 40 + y) * 5);
      g.fill();
      y += bh * 0.85;
    }
    for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(20,12,10,${0.2 + r() * 0.3})`; g.lineWidth = 1 + r() * 3; g.beginPath(); let x = r() * w, yy = r() * h; g.moveTo(x, yy); for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 20; yy += 10 + r() * 30; g.lineTo(x, yy); } g.stroke(); }
    blotches(g, w, h, r, 60, "#1c1412", 0.2, 30);
    speckle(g, w, h, r, 6000, 0.15);
  });

/** sea: deep blue with ripple lines (drives the normal map) */
export const sea = (seed = 7) =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#1d4e78"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const x = r() * w, y = r() * h, l = 8 + r() * 26;
      g.strokeStyle = r() < 0.5 ? "rgba(255,255,255,0.14)" : "rgba(0,10,30,0.25)"; g.lineWidth = 1 + r() * 1.5;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 2, x + l, y); g.stroke();
    }
  });

/** straw thatch for the windmill cap */
export const thatch = (seed = 8) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#8f7a52"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1500; i++) {
      g.strokeStyle = ["#b39a66", "#6b5a3a", "#cdb785", "#7d6844"][Math.floor(r() * 4)]; g.lineWidth = 1 + r();
      const x = r() * w, y = r() * h;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y + 14 + r() * 14); g.stroke();
    }
    for (let y = 0; y < h; y += 32) { g.fillStyle = "rgba(40,30,15,0.3)"; g.fillRect(0, y, w, 3); }
  });

/** canvas sail cloth with seams */
export const sailcloth = () =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(9);
    g.fillStyle = "#efe9dc"; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) { g.fillStyle = "rgba(120,100,70,0.2)"; g.fillRect(x, 0, 1.5, h); }
    blotches(g, w, h, r, 20, "#b8ab90", 0.12, 20);
  });

/** café / shop sign with a painted frame */
export const sign = (bg: string, fg: string, text: string, sub = "") =>
  makeTex(256, 96, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = fg; g.lineWidth = 5; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `bold ${sub ? 40 : 50}px Georgia, "Times New Roman", serif`;
    g.fillText(text, w / 2, sub ? h * 0.42 : h / 2 + 2);
    if (sub) { g.font = `italic 20px Georgia, serif`; g.fillText(sub, w / 2, h * 0.78); }
  });

/** chalk menu board */
export const menuBoard = () =>
  makeTex(128, 192, (g, w, h) => {
    const r = rng(10);
    g.fillStyle = "#6b4a2e"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#23282a"; g.fillRect(8, 8, w - 16, h - 16);
    g.fillStyle = "rgba(255,255,255,0.85)"; g.font = "bold 18px Georgia, serif"; g.textAlign = "center";
    g.fillText("MENU", w / 2, 32);
    g.font = "12px Georgia, serif"; g.textAlign = "left";
    const items = ["Frappé", "Greek coffee", "Souvlaki", "Moussaka", "Horiatiki", "Baklava", "Ouzo"];
    items.forEach((t, i) => { g.fillText(t, 16, 58 + i * 17); g.fillText((2 + Math.floor(r() * 12)) + "€", w - 36, 58 + i * 17); });
    g.strokeStyle = "rgba(255,255,255,0.5)"; g.beginPath(); g.moveTo(20, 40); g.lineTo(w - 20, 40); g.stroke();
  });

/** blue / white check tablecloth */
export const check = (a = "#2b6cb8", b = "#ffffff") =>
  makeTex(128, 128, (g, w, h) => {
    g.fillStyle = b; g.fillRect(0, 0, w, h);
    g.fillStyle = a; g.globalAlpha = 0.55;
    for (let i = 0; i < 8; i += 2) { g.fillRect(i * 16, 0, 16, h); g.fillRect(0, i * 16, w, 16); }
    g.globalAlpha = 1;
  });

/** rush seat weave for taverna chairs */
export const rush = () =>
  makeTex(64, 64, (g, w, h) => {
    const r = rng(11);
    g.fillStyle = "#b89a5e"; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 4) { g.fillStyle = `rgba(${r() < 0.5 ? "90,70,30" : "230,210,160"},0.35)`; g.fillRect(0, y, w, 2); }
  });

/** bougainvillea: magenta bracts over leaves (opaque blob texture) */
export const bougainvillea = (seed = 12, alpha = false) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    if (alpha) g.clearRect(0, 0, w, h);
    else { g.fillStyle = "#3e6b2c"; g.fillRect(0, 0, w, h); }
    const n = alpha ? 700 : 900;
    for (let i = 0; i < n; i++) {
      const x = r() * w, y = alpha ? Math.pow(r(), 0.7) * h : r() * h;
      if (alpha && Math.abs(x - w / 2) > (w / 2) * (0.35 + 0.65 * (1 - y / h)) + 10) continue;
      const leaf = r() < 0.3;
      g.fillStyle = leaf ? ["#3e6b2c", "#4f7f35", "#2f5623"][Math.floor(r() * 3)] : ["#d6247f", "#e8389a", "#b81a6b", "#f25cae", "#c2206f"][Math.floor(r() * 5)];
      g.beginPath();
      if (leaf) g.ellipse(x, y, 5 + r() * 4, 2.5 + r() * 2, r() * 3, 0, Math.PI * 2);
      else { for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2 + r(); g.moveTo(x, y); g.ellipse(x + Math.cos(a) * 3, y + Math.sin(a) * 3, 4, 2.6, a, 0, Math.PI * 2); } }
      g.fill();
    }
  });

/** olive / ficus foliage */
export const foliage = (seed = 13) =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#4b6a3a"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { g.fillStyle = ["#5d7d45", "#3a5a2c", "#7a9a5c", "#48683a"][Math.floor(r() * 4)]; g.beginPath(); g.ellipse(r() * w, r() * h, 4 + r() * 3, 2 + r() * 2, r() * 3, 0, Math.PI * 2); g.fill(); }
  });

/** weathered wood (pergola beams, tables) */
export const wood = (base = "#8a6a48", seed = 14) =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(${r() < 0.5 ? "40,25,10" : "255,230,190"},${0.08 + r() * 0.1})`; g.lineWidth = 1 + r(); const y = r() * h; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + (r() - 0.5) * 8, w * 0.6, y + (r() - 0.5) * 8, w, y); g.stroke(); }
  });

/** terracotta with a lime-wash rim */
export const terracotta = (seed = 15) =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#b8643c"; g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 30, "#7e3c22", 0.15, 20);
    blotches(g, w, h, r, 20, "#e3c2a2", 0.15, 20);
    speckle(g, w, h, r, 900, 0.1);
  });

/** bell tower bronze patina */
export const patina = () =>
  makeTex(64, 64, (g, w, h) => {
    const r = rng(16);
    g.fillStyle = "#8a6a3a"; g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 20, "#4f8a76", 0.4, 10);
  });

/** icon/painted panel for the church doorway lunette */
export const lunette = () =>
  makeTex(128, 64, (g, w, h) => {
    g.fillStyle = "#1f5fae"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#d9b25a"; g.beginPath(); g.arc(w / 2, h, h * 0.8, Math.PI, 0); g.fill();
    g.fillStyle = "#f3e7c8"; g.beginPath(); g.arc(w / 2, h * 0.55, 10, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#8e2a20"; g.fillRect(w / 2 - 14, h * 0.7, 28, h * 0.3);
  });
