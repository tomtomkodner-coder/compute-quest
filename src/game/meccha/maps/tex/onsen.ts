// Canvas textures for the Hot Spring Inn (onsen ryokan at dusk): tatami, shoji paper, fusuma, earthen plaster, dark
// corridor planks, hinoki, wood ceiling, kawara roof tiles, rock, raked gravel, moss, bath mosaic, slate, hot water,
// steam puffs, noren curtain, paper lanterns, bamboo, bamboo fence, maple and pine foliage, hanging scroll, zabuton,
// lockers, shoe boxes, vending machine, ping-pong top, rattan, gold screen and small wooden signs.
import { makeTex } from "../../textures";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const JP = `"IPAPGothic", "IPAGothic", "Noto Serif CJK JP", "Noto Sans CJK JP", "Hiragino Mincho ProN", "WenQuanYi Zen Hei", serif`;
type C2 = CanvasRenderingContext2D;
const TAU = Math.PI * 2;

function speck(g: C2, w: number, h: number, r: () => number, n: number, a = 0.15) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = r() < 0.5 ? `rgba(0,0,0,${r() * a})` : `rgba(255,255,255,${r() * a * 0.7})`;
    g.fillRect(r() * w, r() * h, 1 + r() * 1.5, 1 + r() * 1.5);
  }
}
function blotch(g: C2, w: number, h: number, r: () => number, n: number, a: number, col: string, max = 50) {
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h, rad = 8 + r() * max;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, `rgba(${col},${a * r()})`);
    gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
}
/** wood grain streaks along x inside a rect */
function grain(g: C2, x: number, y: number, w: number, h: number, r: () => number, n: number, col: string) {
  g.strokeStyle = col;
  for (let i = 0; i < n; i++) {
    g.lineWidth = 0.6 + r() * 1.2;
    const yy = y + r() * h;
    g.beginPath();
    g.moveTo(x, yy);
    const a = (r() - 0.5) * 3;
    g.bezierCurveTo(x + w * 0.33, yy + a, x + w * 0.66, yy - a, x + w, yy + (r() - 0.5) * 2);
    g.stroke();
  }
}

/** two tatami mats (0.9 × 1.8 m each) = 1.8 × 1.8 m; the black heri borders run along the long edges */
export const onTatami = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(3);
    for (let m = 0; m < 2; m++) {
      const x0 = m * 128;
      const base = [178 + r() * 10, 176 + r() * 10, 112 + r() * 10];
      g.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
      g.fillRect(x0, 0, 128, h);
      for (let y = 0; y < h; y += 2) {
        const v = (r() - 0.5) * 26;
        g.fillStyle = `rgba(${base[0] + v},${base[1] + v},${base[2] + v * 0.6},0.8)`;
        g.fillRect(x0, y, 128, 1.2);
      }
      for (let x = x0 + 12; x < x0 + 116; x += 12) { g.fillStyle = "rgba(60,60,20,0.12)"; g.fillRect(x, 0, 1, h); }
      g.fillStyle = "#1d241e";
      g.fillRect(x0, 0, 9, h);
      g.fillRect(x0 + 119, 0, 9, h);
      g.fillStyle = "rgba(255,255,255,0.08)";
      g.fillRect(x0 + 3, 0, 1, h);
      g.fillRect(x0 + 122, 0, 1, h);
      g.fillStyle = "rgba(50,40,10,0.35)";
      g.fillRect(x0, 0, 128, 1);
    }
    blotch(g, w, h, r, 8, 0.1, "90,70,20");
  });

/** shoji panel: paper with a kumiko lattice, frame and a wooden kick board at the bottom (one panel 0.9 × 2.3 m) */
export const onShoji = () =>
  makeTex(128, 320, (g, w, h) => {
    const r = rng(5);
    g.fillStyle = "#efe6d2";
    g.fillRect(0, 0, w, h);
    speck(g, w, h, r, 500, 0.06);
    for (let i = 0; i < 30; i++) { g.strokeStyle = "rgba(180,160,120,0.12)"; g.lineWidth = 0.6; g.beginPath(); const x = r() * w, y = r() * h; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 20, y + (r() - 0.5) * 20); g.stroke(); }
    const wood = "#9b7650";
    g.fillStyle = wood;
    const cols = 4, rows = 7, top = 8, bot = h - 52;
    for (let c = 0; c <= cols; c++) g.fillRect(Math.round(8 + (c * (w - 16)) / cols) - 1, top, 3, bot - top);
    for (let rr = 0; rr <= rows; rr++) g.fillRect(8, Math.round(top + (rr * (bot - top)) / rows) - 1, w - 16, 3);
    g.fillStyle = "#7a5634";
    g.fillRect(0, 0, 8, h); g.fillRect(w - 8, 0, 8, h); g.fillRect(0, 0, w, 8);
    g.fillRect(0, bot, w, h - bot);
    grain(g, 0, bot, w, h - bot, r, 12, "rgba(50,30,15,0.35)");
    g.fillStyle = "rgba(255,230,190,0.15)"; g.fillRect(0, bot, w, 2);
  });

/** fusuma sliding door: cream paper painted with misty mountains, round pull */
export const onFusuma = () =>
  makeTex(128, 320, (g, w, h) => {
    const r = rng(9);
    g.fillStyle = "#e7dcc3";
    g.fillRect(0, 0, w, h);
    speck(g, w, h, r, 400, 0.06);
    for (let k = 0; k < 3; k++) {
      g.fillStyle = `rgba(${90 - k * 20},${100 - k * 15},${95 - k * 10},${0.18 + k * 0.1})`;
      g.beginPath();
      const by = 150 + k * 45;
      g.moveTo(0, h);
      for (let x = 0; x <= w; x += 8) g.lineTo(x, by - Math.abs(Math.sin(x * 0.03 + k * 2)) * 50 - r() * 6);
      g.lineTo(w, h);
      g.fill();
    }
    g.fillStyle = "rgba(200,160,70,0.35)";
    for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(r() * w, 30 + r() * 90, 20 + r() * 20, 5, 0, 0, TAU); g.fill(); }
    g.fillStyle = "#3a2717";
    g.fillRect(0, 0, 5, h); g.fillRect(w - 5, 0, 5, h); g.fillRect(0, 0, w, 5); g.fillRect(0, h - 5, w, 5);
    g.fillStyle = "#2a2a2a"; g.beginPath(); g.arc(w - 18, h * 0.5, 7, 0, TAU); g.fill();
    g.fillStyle = "#b28a3c"; g.beginPath(); g.arc(w - 18, h * 0.5, 5, 0, TAU); g.fill();
  });

/** earthen plaster (tsuchikabe), warm beige with sand specks */
export const onPlaster = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(12);
    g.fillStyle = "#c9b393";
    g.fillRect(0, 0, w, h);
    blotch(g, w, h, r, 30, 0.12, "120,90,60");
    blotch(g, w, h, r, 20, 0.1, "255,240,210");
    for (let i = 0; i < 2600; i++) { const v = r(); g.fillStyle = v < 0.5 ? `rgba(90,60,30,${0.2 + r() * 0.2})` : `rgba(255,240,215,${0.15 + r() * 0.2})`; g.fillRect(r() * w, r() * h, 1, 1); }
    for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(170,140,90,0.6)"; g.fillRect(r() * w, r() * h, 3 + r() * 5, 1); }
  });

/** planks (0.16 m wide boards, 1 texture = 1 m), dark or light */
export const onPlanks = (dark: boolean, seed = 4) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    const n = 6, bh = h / n;
    for (let i = 0; i < n; i++) {
      const v = (r() - 0.5) * 22;
      const [a, b, c] = dark ? [78 + v, 50 + v * 0.7, 30 + v * 0.5] : [214 + v, 176 + v, 128 + v * 0.7];
      g.fillStyle = `rgb(${a},${b},${c})`;
      g.fillRect(0, i * bh, w, bh);
      grain(g, 0, i * bh, w, bh, r, 16, dark ? "rgba(25,12,5,0.35)" : "rgba(140,95,50,0.28)");
      if (r() < 0.5) { g.fillStyle = dark ? "rgba(20,10,5,0.4)" : "rgba(120,80,40,0.3)"; g.beginPath(); g.ellipse(r() * w, i * bh + bh / 2, 5, 3, 0, 0, TAU); g.fill(); }
      g.fillStyle = dark ? "rgba(10,5,2,0.8)" : "rgba(90,60,30,0.45)";
      g.fillRect(0, i * bh, w, 1.5);
      const jx = r() * w;
      g.fillRect(jx, i * bh, 1.5, bh);
    }
  });

/** wood ceiling boards with battens (sao-buchi) */
export const onCeiling = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(21);
    for (let i = 0; i < 4; i++) {
      const v = (r() - 0.5) * 14;
      g.fillStyle = `rgb(${176 + v},${140 + v},${98 + v})`;
      g.fillRect(i * 64, 0, 64, h);
      g.save(); g.translate(i * 64, 0); g.rotate(Math.PI / 2); grain(g, 0, -64, h, 64, r, 10, "rgba(110,70,35,0.3)"); g.restore();
    }
    g.fillStyle = "#4b3120";
    for (let y = 0; y < h; y += 64) g.fillRect(0, y, w, 7);
    g.fillStyle = "rgba(255,230,190,0.2)";
    for (let y = 0; y < h; y += 64) g.fillRect(0, y + 7, w, 1);
  });

/** grey kawara roof tiles in rows */
export const onKawara = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(31);
    g.fillStyle = "#34373c";
    g.fillRect(0, 0, w, h);
    const cw = 32, rh = 32;
    for (let y = 0; y < h; y += rh)
      for (let x = 0; x < w; x += cw) {
        const v = 70 + r() * 20;
        const gr = g.createLinearGradient(x, 0, x + cw, 0);
        gr.addColorStop(0, `rgb(${v - 30},${v - 28},${v - 24})`);
        gr.addColorStop(0.5, `rgb(${v + 10},${v + 12},${v + 16})`);
        gr.addColorStop(1, `rgb(${v - 30},${v - 28},${v - 24})`);
        g.fillStyle = gr;
        g.fillRect(x, y, cw, rh - 3);
        g.fillStyle = "rgba(0,0,0,0.5)"; g.fillRect(x, y + rh - 4, cw, 4);
      }
    speck(g, w, h, r, 600, 0.15);
  });

/** weathered granite/andesite rock */
export const onRock = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(41);
    g.fillStyle = "#6d6862";
    g.fillRect(0, 0, w, h);
    blotch(g, w, h, r, 40, 0.3, "40,38,36");
    blotch(g, w, h, r, 30, 0.2, "160,150,138");
    blotch(g, w, h, r, 10, 0.25, "70,90,50", 30);
    for (let i = 0; i < 3000; i++) { const v = 60 + r() * 120; g.fillStyle = `rgba(${v},${v - 4},${v - 8},0.5)`; g.fillRect(r() * w, r() * h, 1 + r(), 1 + r()); }
    g.strokeStyle = "rgba(20,18,15,0.5)";
    for (let i = 0; i < 10; i++) { g.lineWidth = 0.6 + r(); g.beginPath(); let x = r() * w, y = r() * h; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 40; y += (r() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); }
  });

/** raked gravel with parallel grooves */
export const onGravel = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(11);
    g.fillStyle = "#b5b0a4";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 3200; i++) { const v = 130 + r() * 110; g.fillStyle = `rgba(${v},${v - 2},${v - 8},0.75)`; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
    for (let y = 0; y < h; y += 16) {
      const gr = g.createLinearGradient(0, y, 0, y + 16);
      gr.addColorStop(0, "rgba(0,0,0,0.25)"); gr.addColorStop(0.35, "rgba(0,0,0,0)"); gr.addColorStop(0.7, "rgba(255,255,255,0.15)"); gr.addColorStop(1, "rgba(0,0,0,0.2)");
      g.fillStyle = gr; g.fillRect(0, y, w, 16);
    }
  });

/** moss / low garden grass */
export const onMoss = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(17);
    g.fillStyle = "#4b5e2c";
    g.fillRect(0, 0, w, h);
    blotch(g, w, h, r, 30, 0.35, "30,45,15");
    blotch(g, w, h, r, 30, 0.25, "120,140,60");
    for (let i = 0; i < 3500; i++) { const v = r(); g.fillStyle = v < 0.5 ? `rgba(30,45,15,0.5)` : `rgba(${110 + r() * 50},${140 + r() * 40},${50 + r() * 30},0.5)`; g.fillRect(r() * w, r() * h, 1, 1 + r() * 2); }
  });

/** small square mosaic tiles (bath walls/floors), 16 × 16 per texture */
export const onMosaic = (a: string, b: string, seed = 51) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#c9ccc8";
    g.fillRect(0, 0, w, h);
    const s = 16;
    for (let y = 0; y < h; y += s)
      for (let x = 0; x < w; x += s) {
        g.fillStyle = r() < 0.55 ? a : b;
        g.fillRect(x + 1, y + 1, s - 2, s - 2);
        g.fillStyle = `rgba(${r() < 0.5 ? "0,0,0" : "255,255,255"},${r() * 0.12})`;
        g.fillRect(x + 1, y + 1, s - 2, s - 2);
        g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect(x + 2, y + 2, s - 6, 1);
      }
  });

/** dark slate floor slabs (bath + deck), 2 × 2 per texture */
export const onSlate = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(61);
    g.fillStyle = "#1c1d1e";
    g.fillRect(0, 0, w, h);
    const s = 128;
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 2; x++) {
        const v = 58 + r() * 14;
        g.fillStyle = `rgb(${v},${v},${v + 2})`;
        g.fillRect(x * s + 2, y * s + 2, s - 4, s - 4);
      }
    blotch(g, w, h, r, 20, 0.2, "20,20,20");
    speck(g, w, h, r, 1600, 0.18);
  });

/** irregular stone paving (flagstones) */
export const onFlagstone = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(71);
    g.fillStyle = "#3b3935";
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        const v = 120 + r() * 40;
        g.fillStyle = `rgb(${v},${v - 5},${v - 12})`;
        g.beginPath();
        const cx = x * 64 + 32 + (r() - 0.5) * 8, cy = y * 64 + 32 + (r() - 0.5) * 8;
        for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU; const rad = 25 + r() * 6; g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); }
        g.fill();
      }
    speck(g, w, h, r, 1800, 0.2);
    blotch(g, w, h, r, 14, 0.18, "30,30,20");
  });

/** hot spring water: soft ripples and highlights (tinted by the material colour) */
export const onWater = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(81);
    g.fillStyle = "#c8c8c8";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      const x = r() * w, y = r() * h, rw = 20 + r() * 60, rh = 4 + r() * 10;
      for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) {
        g.strokeStyle = `rgba(255,255,255,${0.15 + r() * 0.25})`;
        g.lineWidth = 1 + r() * 2;
        g.beginPath(); g.ellipse(x + dx, y + dy, rw, rh, 0, 0, TAU); g.stroke();
      }
    }
    blotch(g, w, h, r, 20, 0.2, "60,60,60");
  });

/** a soft steam puff (alpha) */
export const onSteam = () =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(91);
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 12; i++) {
      const x = w / 2 + (r() - 0.5) * 50, y = h / 2 + (r() - 0.5) * 60, rad = 18 + r() * 26;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, "rgba(255,255,255,0.35)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    }
  });

/** noren curtain: indigo (or crimson) cloth with a white 湯 character and two slits (alpha) */
export const onNoren = (bg: string, text = "湯") =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(101);
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(0,0,0,${r() * 0.08})`; g.fillRect(0, y, w, 1); }
    g.fillStyle = "rgba(255,255,255,0.9)";
    g.font = `bold 130px ${JP}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, w / 2, h * 0.52);
    g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(0, 0, w, 14);
    g.clearRect(w / 3 - 2, 22, 4, h);
    g.clearRect((2 * w) / 3 - 2, 22, 4, h);
  });

/** paper lantern skin: warm paper with bamboo ribs and a band top/bottom (v = height) */
export const onLantern = (paper: string, text = "") =>
  makeTex(256, 128, (g, w, h) => {
    const r = rng(111);
    g.fillStyle = paper;
    g.fillRect(0, 0, w, h);
    speck(g, w, h, r, 300, 0.08);
    g.fillStyle = "rgba(90,40,10,0.35)";
    for (let y = 8; y < h - 8; y += 9) g.fillRect(0, y, w, 1.5);
    g.fillStyle = "#1c1410";
    g.fillRect(0, 0, w, 7); g.fillRect(0, h - 7, w, 7);
    if (text) {
      g.fillStyle = "rgba(20,10,5,0.85)";
      g.font = `bold 58px ${JP}`;
      g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(text, w * 0.25, h / 2);
      g.fillText(text, w * 0.75, h / 2);
    }
  });

/** bamboo culm skin (u around, v along height, nodes every quarter) */
export const onBamboo = (dry = false) =>
  makeTex(128, 256, (g, w, h) => {
    const r = rng(dry ? 122 : 121);
    const base = dry ? [178, 150, 92] : [92, 128, 52];
    g.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 2) { const v = (r() - 0.5) * 24; g.fillStyle = `rgba(${base[0] + v},${base[1] + v},${base[2] + v},0.6)`; g.fillRect(x, 0, 2, h); }
    const gr = g.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, "rgba(0,0,0,0.12)"); gr.addColorStop(0.4, "rgba(255,255,230,0.14)"); gr.addColorStop(1, "rgba(0,0,0,0.12)");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 64) {
      g.fillStyle = "rgba(40,40,10,0.55)"; g.fillRect(0, y, w, 3);
      g.fillStyle = "rgba(255,255,220,0.35)"; g.fillRect(0, y + 3, w, 2);
    }
    blotch(g, w, h, r, 8, 0.15, "60,50,20", 20);
  });

/** fence of vertical dry bamboo with black ties (1 texture = 1.2 m) */
export const onBambooFence = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(131);
    g.fillStyle = "#2a2014";
    g.fillRect(0, 0, w, h);
    const cw = 16;
    for (let x = 0; x < w; x += cw) {
      const v = (r() - 0.5) * 30;
      const gr = g.createLinearGradient(x, 0, x + cw, 0);
      gr.addColorStop(0, `rgb(${120 + v},${96 + v},${56 + v})`);
      gr.addColorStop(0.45, `rgb(${196 + v},${168 + v},${110 + v})`);
      gr.addColorStop(1, `rgb(${110 + v},${86 + v},${50 + v})`);
      g.fillStyle = gr;
      g.fillRect(x + 1, 0, cw - 2, h);
      const off = r() * 80;
      for (let y = off; y < h; y += 90) { g.fillStyle = "rgba(60,40,15,0.6)"; g.fillRect(x + 1, y, cw - 2, 2); }
    }
    for (const y of [60, 190]) {
      g.fillStyle = "#6e5430"; g.fillRect(0, y, w, 10);
      g.fillStyle = "rgba(255,240,200,0.2)"; g.fillRect(0, y, w, 2);
      for (let x = 8; x < w; x += 32) { g.fillStyle = "#141010"; g.fillRect(x, y - 3, 5, 16); }
    }
  });

/** foliage clumps with alpha: maple (red/orange stars) or pine (needle tufts) */
export const onFoliage = (kind: "maple" | "maple2" | "pine" | "shrub") =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(kind === "maple" ? 141 : kind === "maple2" ? 142 : kind === "pine" ? 143 : 144);
    g.clearRect(0, 0, w, h);
    const cols = kind === "maple" ? ["#b8200e", "#d23a12", "#9e1508", "#e0561a", "#c42a10"]
      : kind === "maple2" ? ["#e0761c", "#d8a020", "#c65414", "#e89030", "#b83c10"]
      : kind === "pine" ? ["#243a1e", "#2f4a24", "#1c3018", "#3a5a2a"]
      : ["#2f5a22", "#3e6e2a", "#264c1c", "#4f7e34"];
    const n = kind === "pine" ? 260 : 340;
    for (let i = 0; i < n; i++) {
      const a = r() * TAU, d = Math.sqrt(r()) * 110;
      const x = w / 2 + Math.cos(a) * d, y = h / 2 + Math.sin(a) * d;
      g.fillStyle = cols[Math.floor(r() * cols.length)];
      if (kind === "pine") {
        g.strokeStyle = g.fillStyle; g.lineWidth = 1.4;
        for (let k = 0; k < 7; k++) { const b = r() * TAU; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(b) * 10, y + Math.sin(b) * 10); g.stroke(); }
      } else if (kind === "shrub") {
        g.beginPath(); g.ellipse(x, y, 5, 3, r() * 3, 0, TAU); g.fill();
      } else {
        const s = 5 + r() * 4, rot = r() * TAU;
        g.beginPath();
        for (let k = 0; k < 10; k++) { const b = rot + (k / 10) * TAU; const rad = k % 2 === 0 ? s : s * 0.45; g.lineTo(x + Math.cos(b) * rad, y + Math.sin(b) * rad); }
        g.fill();
      }
    }
  });

/** tree bark */
export const onBark = () =>
  makeTex(128, 256, (g, w, h) => {
    const r = rng(151);
    g.fillStyle = "#3e3024";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 220; i++) { const v = 40 + r() * 50; g.fillStyle = `rgba(${v},${v * 0.8},${v * 0.6},0.7)`; g.fillRect(r() * w, r() * h, 2 + r() * 4, 10 + r() * 30); }
    g.strokeStyle = "rgba(10,8,5,0.6)";
    for (let i = 0; i < 14; i++) { g.lineWidth = 1 + r(); g.beginPath(); const x = r() * w; g.moveTo(x, 0); g.bezierCurveTo(x + 8, h / 3, x - 8, (2 * h) / 3, x + (r() - 0.5) * 10, h); g.stroke(); }
  });

/** hanging scroll: brocade mount + ink landscape with a red seal */
export const onScroll = (seed = 1) =>
  makeTex(128, 320, (g, w, h) => {
    const r = rng(160 + seed);
    g.fillStyle = seed % 2 ? "#5a4a2e" : "#3d4a3a";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 200; i++) { g.fillStyle = "rgba(200,170,90,0.2)"; g.fillRect(r() * w, r() * h, 2, 2); }
    g.fillStyle = "#e9e0c8";
    g.fillRect(12, 50, w - 24, h - 100);
    const x0 = 12, y0 = 50, pw = w - 24, ph = h - 100;
    g.save(); g.beginPath(); g.rect(x0, y0, pw, ph); g.clip();
    if (seed % 2) {
      for (let k = 0; k < 3; k++) {
        g.fillStyle = `rgba(30,30,30,${0.15 + k * 0.18})`;
        g.beginPath(); g.moveTo(x0, y0 + ph);
        for (let x = 0; x <= pw; x += 4) g.lineTo(x0 + x, y0 + ph * (0.35 + k * 0.18) - Math.sin(x * 0.07 + k) * 18 - r() * 4);
        g.lineTo(x0 + pw, y0 + ph); g.fill();
      }
    } else {
      g.strokeStyle = "rgba(20,20,20,0.85)"; g.lineWidth = 3;
      g.beginPath(); g.moveTo(x0 + 20, y0 + ph); g.bezierCurveTo(x0 + 30, y0 + ph * 0.6, x0 + 60, y0 + ph * 0.5, x0 + 70, y0 + 30); g.stroke();
      g.lineWidth = 1.5;
      for (let i = 0; i < 14; i++) { const y = y0 + 40 + r() * ph * 0.6; g.beginPath(); g.moveTo(x0 + 40 + r() * 20, y); g.lineTo(x0 + 70 + r() * 20, y - 10 - r() * 10); g.stroke(); }
      g.fillStyle = "#b41e14"; g.beginPath(); g.arc(x0 + 30, y0 + 40, 9, 0, TAU); g.fill();
    }
    g.restore();
    g.fillStyle = "#b41e14"; g.fillRect(x0 + pw - 16, y0 + ph - 26, 9, 12);
    g.fillStyle = "#1c140c"; g.fillRect(0, 0, w, 6); g.fillRect(0, h - 10, w, 10);
  });

/** zabuton / futon fabric with a small repeating kikko pattern */
export const onFabric = (bg: string, fg: string, seed = 171) =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = fg; g.lineWidth = 1.2;
    for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 ? 8 : 0; x < w + 16; x += 16) { g.beginPath(); g.arc(x, y, 7, 0, TAU); g.stroke(); }
    for (let yy = 0; yy < h; yy += 2) { g.fillStyle = `rgba(0,0,0,${r() * 0.06})`; g.fillRect(0, yy, w, 1); }
  });

/** grid of lockers or shoe boxes with number plates (cols × rows cells) */
export const onLockers = (wood: string, cols: number, rows: number, seed = 181) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#2a1c12";
    g.fillRect(0, 0, w, h);
    const cw = w / cols, ch = h / rows;
    let n = 1 + Math.floor(r() * 20);
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const v = (r() - 0.5) * 16;
        g.fillStyle = wood;
        g.fillRect(x * cw + 2, y * ch + 2, cw - 4, ch - 4);
        g.fillStyle = `rgba(${v > 0 ? "255,255,255" : "0,0,0"},${Math.abs(v) / 100})`;
        g.fillRect(x * cw + 2, y * ch + 2, cw - 4, ch - 4);
        grain(g, x * cw + 2, y * ch + 2, cw - 4, ch - 4, r, 5, "rgba(60,35,15,0.25)");
        g.fillStyle = "#f1ead8"; g.fillRect(x * cw + cw / 2 - 9, y * ch + 6, 18, 11);
        g.fillStyle = "#222"; g.font = `bold 9px ${JP}`; g.textAlign = "center"; g.textBaseline = "middle";
        g.fillText(String(n++), x * cw + cw / 2, y * ch + 12);
        g.fillStyle = "#b8a060"; g.fillRect(x * cw + cw / 2 - 3, y * ch + ch - 16, 6, 9);
        g.fillStyle = "#6a4c24"; g.fillRect(x * cw + cw / 2 - 1, y * ch + ch - 14, 2, 5);
      }
  });

/** drinks vending machine front */
export const onVending = (body: string) =>
  makeTex(256, 512, (g, w, h) => {
    const r = rng(191);
    g.fillStyle = body;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#e8eef0";
    g.fillRect(14, 20, w - 28, 300);
    const cans = ["#d8261c", "#1b5fb8", "#f0c020", "#2a9a3a", "#f07a1a", "#ffffff", "#7a3ab0", "#e8e0c0"];
    for (let row = 0; row < 4; row++) {
      for (let c = 0; c < 7; c++) {
        const x = 24 + c * 31, y = 34 + row * 72;
        g.fillStyle = cans[Math.floor(r() * cans.length)];
        g.fillRect(x, y, 22, 44);
        g.fillStyle = "rgba(255,255,255,0.45)"; g.fillRect(x + 3, y + 2, 4, 40);
        g.fillStyle = "rgba(0,0,0,0.3)"; g.fillRect(x, y + 14, 22, 5);
        g.fillStyle = "#222"; g.fillRect(x, y + 50, 22, 9);
        g.fillStyle = r() < 0.2 ? "#ff3020" : "#40ff60"; g.fillRect(x + 8, y + 52, 6, 5);
      }
    }
    g.fillStyle = "#1a1a1a"; g.fillRect(24, 340, 100, 40);
    g.fillStyle = "#40ff80"; g.font = "bold 22px monospace"; g.fillText("¥160", 34, 368);
    g.fillStyle = "#bbb"; g.fillRect(160, 336, 60, 60);
    g.fillStyle = "#333"; g.fillRect(186, 346, 8, 30);
    g.fillStyle = "#111"; g.fillRect(24, 420, w - 48, 64);
    g.fillStyle = "#333"; g.fillRect(30, 426, w - 60, 52);
  });

/** ping-pong table top: dark green with white lines */
export const onPingPong = () =>
  makeTex(256, 128, (g, w, h) => {
    const r = rng(201);
    g.fillStyle = "#1f5a3c";
    g.fillRect(0, 0, w, h);
    speck(g, w, h, r, 500, 0.08);
    g.fillStyle = "#f4f4f0";
    g.fillRect(0, 0, w, 4); g.fillRect(0, h - 4, w, 4); g.fillRect(0, 0, 4, h); g.fillRect(w - 4, 0, 4, h);
    g.fillRect(0, h / 2 - 1, w, 2);
  });

/** rattan weave (baskets, massage chair footrest, changing-room mat) */
export const onRattan = () =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(211);
    g.fillStyle = "#6a4a26";
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8)
      for (let x = 0; x < w; x += 8) {
        const v = (r() - 0.5) * 20;
        g.fillStyle = `rgb(${190 + v},${150 + v},${96 + v})`;
        if (((x + y) / 8) % 2) g.fillRect(x + 1, y + 2, 6, 4);
        else g.fillRect(x + 2, y + 1, 4, 6);
      }
  });

/** gold folding screen (byobu) with a pine painting */
export const onByobu = () =>
  makeTex(512, 256, (g, w, h) => {
    const r = rng(221);
    for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 32) {
      const v = (r() - 0.5) * 20;
      g.fillStyle = `rgb(${206 + v},${168 + v},${82 + v * 0.5})`;
      g.fillRect(x, y, 32, 32);
    }
    g.strokeStyle = "#3a2a18"; g.lineWidth = 9;
    g.beginPath(); g.moveTo(80, h); g.bezierCurveTo(120, 160, 60, 110, 180, 70); g.bezierCurveTo(260, 40, 320, 90, 420, 60); g.stroke();
    for (let i = 0; i < 18; i++) {
      const x = 120 + r() * 320, y = 40 + r() * 90;
      g.fillStyle = r() < 0.5 ? "#23402a" : "#2e5534";
      g.beginPath(); g.ellipse(x, y, 30 + r() * 20, 10 + r() * 6, (r() - 0.5) * 0.4, 0, TAU); g.fill();
    }
    g.fillStyle = "rgba(0,0,0,0.25)";
    for (let k = 1; k < 6; k++) g.fillRect((k * w) / 6 - 1, 0, 2, h);
    g.fillStyle = "#1a120c"; g.fillRect(0, 0, w, 6); g.fillRect(0, h - 6, w, 6);
  });

/** wooden sign board with vertical or horizontal kanji text */
export const onSign = (text: string, bg = "#6b4a2c", fg = "#f4ead2", vertical = false) =>
  makeTex(vertical ? 64 : 256, vertical ? 256 : 64, (g, w, h) => {
    const r = rng(231 + text.length);
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    grain(g, 0, 0, w, h, r, 10, "rgba(0,0,0,0.25)");
    g.strokeStyle = "rgba(0,0,0,0.5)"; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
    g.fillStyle = fg;
    g.textAlign = "center"; g.textBaseline = "middle";
    if (vertical) {
      const chars = [...text];
      const fs = Math.min(48, (h - 20) / chars.length);
      g.font = `bold ${fs}px ${JP}`;
      chars.forEach((c, i) => g.fillText(c, w / 2, 12 + fs / 2 + i * fs));
    } else {
      g.font = `bold ${Math.min(40, (w - 20) / Math.max(1, text.length) * 1.3)}px ${JP}`;
      g.fillText(text, w / 2, h / 2 + 2);
    }
  });

/** simple TV/arcade screen glow */
export const onScreen = () =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(241);
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "#1b2a6a"); gr.addColorStop(1, "#070a1a");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 20; i++) { g.fillStyle = ["#ff4a4a", "#ffd23a", "#4aff8a", "#4ad2ff"][i % 4]; g.fillRect(10 + r() * 100, 20 + r() * 80, 6, 6); }
    g.fillStyle = "#fff"; g.font = "bold 14px monospace"; g.fillText("HI 09900", 18, 16);
    for (let y = 0; y < h; y += 3) { g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(0, y, w, 1); }
  });

/** dusk sky dome: indigo zenith → violet → glowing orange horizon, with thin pink cloud streaks */
export const onSky = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(251);
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "#10163a");
    gr.addColorStop(0.25, "#27306a");
    gr.addColorStop(0.38, "#5a4a86");
    gr.addColorStop(0.45, "#b0708a");
    gr.addColorStop(0.49, "#f0a070");
    gr.addColorStop(0.505, "#ffc890");
    gr.addColorStop(0.53, "#3a2e3a");
    gr.addColorStop(1, "#141018");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      const y = h * (0.3 + r() * 0.17), x = r() * w, len = 30 + r() * 90, th = 1 + r() * 3;
      const warm = y > h * 0.4;
      for (const dx of [-w, 0, w]) {
        const cg = g.createLinearGradient(x + dx, 0, x + dx + len, 0);
        const c = warm ? "255,170,140" : "190,140,190";
        cg.addColorStop(0, `rgba(${c},0)`); cg.addColorStop(0.5, `rgba(${c},${0.25 + r() * 0.3})`); cg.addColorStop(1, `rgba(${c},0)`);
        g.fillStyle = cg;
        g.fillRect(x + dx, y, len, th);
      }
    }
    for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.5})`; g.fillRect(r() * w, r() * h * 0.22, 1, 1); }
  });
