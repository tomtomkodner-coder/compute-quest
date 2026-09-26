// Canvas textures for the Amusement Park map (colourful daytime theme park): concrete pavers, red herringbone brick,
// lawn, striped canvas (awnings / canopies), scalloped valances, fountain water, painted booth boards, glossy steel
// bumper-car floor, popcorn, cotton candy, the carousel's mirrored column, the shooting-gallery backdrop and parody signs.
import { makeTex } from "../../textures";

export function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
type C2 = CanvasRenderingContext2D;

function speck(g: C2, w: number, h: number, r: () => number, n: number, a = 0.15) {
  for (let i = 0; i < n; i++) { g.fillStyle = r() < 0.5 ? `rgba(0,0,0,${r() * a})` : `rgba(255,255,255,${r() * a * 0.7})`; g.fillRect(r() * w, r() * h, 1 + r() * 1.5, 1 + r() * 1.5); }
}
function grime(g: C2, w: number, h: number, r: () => number, n: number, a = 0.12, dark = "20,16,10") {
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h, rad = 10 + r() * 50;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, `rgba(${dark},${a * r()})`);
    gr.addColorStop(1, `rgba(${dark},0)`);
    g.fillStyle = gr;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
}
const FONT = `"M PLUS Rounded 1c", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif`;

/** light concrete pavers (4×4 slabs per tile, running bond) */
export const amPavers = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(3);
    g.fillStyle = "#8f8a80";
    g.fillRect(0, 0, w, h);
    const s = 64;
    for (let y = 0; y < 4; y++)
      for (let x = -1; x < 5; x++) {
        const off = (y % 2) * 32;
        const v = 188 + r() * 26, t = (r() - 0.5) * 10;
        g.fillStyle = `rgb(${v + t},${v - 4},${v - 14 - t})`;
        g.fillRect(x * s + off + 2, y * s + 2, s - 4, s - 4);
        g.fillStyle = "rgba(255,255,255,0.10)"; g.fillRect(x * s + off + 3, y * s + 3, s - 6, 2);
        g.fillStyle = "rgba(0,0,0,0.10)"; g.fillRect(x * s + off + 3, y * s + s - 5, s - 6, 2);
      }
    speck(g, w, h, r, 1100, 0.16);
    grime(g, w, h, r, 12, 0.18);
  });

/** red basket-weave brick paving */
export const amBrick = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(7);
    g.fillStyle = "#7c5a4c";
    g.fillRect(0, 0, w, h);
    const u = 16; // basket-weave: 2u cells, each two bricks of 2u × u
    for (let i = 0; i < w / (2 * u); i++)
      for (let j = 0; j < h / (2 * u); j++)
        for (let k = 0; k < 2; k++) {
          const v = r();
          g.fillStyle = `rgb(${150 + v * 50},${58 + v * 30},${44 + v * 22})`;
          const x = i * 2 * u, y = j * 2 * u;
          if ((i + j) % 2) g.fillRect(x + 1.2, y + k * u + 1.2, 2 * u - 2.4, u - 2.4);
          else g.fillRect(x + k * u + 1.2, y + 1.2, u - 2.4, 2 * u - 2.4);
        }
    speck(g, w, h, r, 1800, 0.18);
    grime(g, w, h, r, 12, 0.2);
  });

export const amGrass = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(5);
    g.fillStyle = "#4f7d2e";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      const x = r() * w, y = r() * h, rad = 20 + r() * 50;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, r() < 0.5 ? "rgba(120,160,60,0.35)" : "rgba(40,70,25,0.35)");
      gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    for (let i = 0; i < 1300; i++) {
      const x = r() * w, y = r() * h, l = 3 + r() * 6, v = r();
      g.strokeStyle = `rgba(${60 + v * 90},${110 + v * 80},${30 + v * 40},0.8)`;
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y - l); g.stroke();
    }
  });

/** striped canvas (n stripe pairs across u), faint weave */
export const amStripe = (a: string, b: string, n = 4, seed = 1) =>
  makeTex(256, 128, (g, w, h) => {
    const r = rng(seed);
    const sw = w / (n * 2);
    for (let i = 0; i < n * 2; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(i * sw, 0, sw + 0.5, h); }
    for (let y = 0; y < h; y += 2) { g.fillStyle = "rgba(0,0,0,0.05)"; g.fillRect(0, y, w, 1); }
    for (let x = 0; x < w; x += 2) { g.fillStyle = "rgba(255,255,255,0.04)"; g.fillRect(x, 0, 1, h); }
    for (let i = 0; i < 5; i++) {
      const y = r() * h;
      const gr = g.createLinearGradient(0, y - 20, 0, y + 20);
      gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.5, "rgba(40,30,20,0.07)"); gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr; g.fillRect(0, y - 20, w, 40);
    }
  });

/** scalloped valance: stripes with a round-scalloped bottom edge (alpha) and a gold trim line */
export const amValance = (a: string, b: string, n = 4, trim = "#f2c14e") =>
  makeTex(256, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const sw = w / (n * 2);
    g.save();
    g.beginPath();
    g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w, h * 0.55);
    for (let i = n * 2 - 1; i >= 0; i--) g.arc(i * sw + sw / 2, h * 0.55, sw / 2, 0, Math.PI, false);
    g.closePath();
    g.clip();
    for (let i = 0; i < n * 2; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(i * sw, 0, sw + 0.5, h); }
    g.fillStyle = trim; g.fillRect(0, 4, w, 6);
    g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(0, 10, w, 2);
    g.restore();
  });

/** fountain water: ripples and caustic glints */
export const amWater = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(9);
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, "#3d8fb0"); gr.addColorStop(1, "#2f7aa0");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const x = r() * w, y = r() * h, rx = 10 + r() * 30;
      g.strokeStyle = `rgba(210,240,255,${0.12 + r() * 0.25})`;
      g.lineWidth = 1 + r() * 2;
      g.beginPath(); g.ellipse(x, y, rx, rx * 0.35, 0, 0, Math.PI * 2); g.stroke();
      // wrap copies so tiling is seamless
      g.beginPath(); g.ellipse(x - w, y, rx, rx * 0.35, 0, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.ellipse(x, y - h, rx, rx * 0.35, 0, 0, Math.PI * 2); g.stroke();
    }
    speck(g, w, h, r, 600, 0.2);
  });

/** falling water sheet (streaks, alpha) */
export const amFall = () =>
  makeTex(128, 256, (g, w, h) => {
    const r = rng(12);
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) {
      const x = r() * w, y = r() * h, l = 20 + r() * 80;
      g.fillStyle = `rgba(${200 + r() * 55},${230 + r() * 25},255,${0.35 + r() * 0.5})`;
      g.fillRect(x, y, 1 + r() * 3, l);
      g.fillRect(x, y - h, 1 + r() * 3, l);
    }
  });

/** painted wooden boards (vertical planks), worn */
export const amBoards = (base: string, seed = 1, plank = 32) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += plank) {
      g.fillStyle = `rgba(${r() < 0.5 ? "0,0,0" : "255,255,255"},${r() * 0.07})`;
      g.fillRect(x, 0, plank, h);
      g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(x, 0, 2, h);
      g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(x + 2, 0, 1, h);
      for (let k = 0; k < 6; k++) {
        g.strokeStyle = `rgba(60,40,20,${0.05 + r() * 0.07})`;
        g.lineWidth = 1;
        g.beginPath();
        const px = x + 4 + r() * (plank - 8);
        g.moveTo(px, 0);
        for (let y = 0; y <= h; y += 16) g.lineTo(px + Math.sin(y * 0.05 + k) * 2, y);
        g.stroke();
      }
      // wear on plank edges
      for (let k = 0; k < 14; k++) { g.fillStyle = `rgba(150,110,70,${0.2 + r() * 0.3})`; g.fillRect(x + (r() < 0.5 ? 2 : plank - 5), r() * h, 3, 2 + r() * 10); }
    }
    grime(g, w, h, r, 10, 0.15);
    speck(g, w, h, r, 900, 0.1);
  });

/** polished steel plate floor (bumper cars) with seams and scuffs */
export const amSteelFloor = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(15);
    g.fillStyle = "#565d66";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const v = (r() - 0.5) * 16;
      g.fillStyle = `rgb(${88 + v},${96 + v},${106 + v})`;
      g.fillRect(i * 128 + 2, j * 128 + 2, 124, 124);
    }
    for (let i = 0; i < 70; i++) {
      g.strokeStyle = `rgba(${r() < 0.5 ? "20,20,24" : "200,210,220"},${0.06 + r() * 0.12})`;
      g.lineWidth = 0.5 + r() * 1.5;
      const x = r() * w, y = r() * h, a = r() * Math.PI * 2, l = 20 + r() * 80;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + 10, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    // rivets
    g.fillStyle = "#3a3f46";
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) for (const [a, b] of [[8, 8], [120, 8], [8, 120], [120, 120], [64, 8], [8, 64], [120, 64], [64, 120]]) { g.beginPath(); g.arc(i * 128 + a, j * 128 + b, 2.2, 0, Math.PI * 2); g.fill(); }
    speck(g, w, h, r, 1200, 0.1);
  });

export const amPopcorn = () =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(19);
    g.fillStyle = "#e8c778";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 420; i++) {
      const x = r() * w, y = r() * h, s = 3 + r() * 5;
      g.fillStyle = r() < 0.2 ? "#d9a441" : `rgb(${245 + r() * 10},${232 + r() * 20},${196 + r() * 40})`;
      g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill();
      g.fillStyle = "rgba(0,0,0,0.12)"; g.beginPath(); g.arc(x + 1, y + 1.5, s * 0.5, 0, Math.PI * 2); g.fill();
    }
  });

export const amFluff = (base: string, seed = 4) =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) {
      const x = r() * w, y = r() * h, s = 4 + r() * 12;
      const gr = g.createRadialGradient(x, y, 0, x, y, s);
      gr.addColorStop(0, `rgba(255,255,255,${0.1 + r() * 0.2})`);
      gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.fillRect(x - s, y - s, s * 2, s * 2);
    }
    speck(g, w, h, r, 300, 0.06);
  });

/** carousel central column: gilded frames around mirror panels on red */
export const amMirrorPanel = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(23);
    g.fillStyle = "#a3202b";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2; i++) {
      const x = 16 + i * 128, y = 20, pw = 96, ph = 216;
      g.fillStyle = "#d9a93b";
      g.beginPath(); g.roundRect(x - 6, y - 6, pw + 12, ph + 12, 30); g.fill();
      g.fillStyle = "#8a6414"; g.beginPath(); g.roundRect(x - 2, y - 2, pw + 4, ph + 4, 26); g.fill();
      const gr = g.createLinearGradient(x, y, x + pw, y + ph);
      gr.addColorStop(0, "#e8f0f4"); gr.addColorStop(0.45, "#9fb1bd"); gr.addColorStop(0.55, "#f4f8fa"); gr.addColorStop(1, "#7c8e9a");
      g.fillStyle = gr; g.beginPath(); g.roundRect(x, y, pw, ph, 24); g.fill();
      for (let k = 0; k < 8; k++) { g.fillStyle = `rgba(255,255,255,${0.1 + r() * 0.2})`; g.fillRect(x + r() * pw, y + r() * ph, 2, 20 + r() * 40); }
    }
    g.fillStyle = "#f2c14e";
    for (let x = 8; x < w; x += 16) { g.beginPath(); g.arc(x, 6, 3, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(x, h - 6, 3, 0, Math.PI * 2); g.fill(); }
  });

/** shooting gallery back wall: sky blue with clouds, stars and rows of ducks */
export const amGalleryBack = () =>
  makeTex(256, 128, (g, w, h) => {
    const r = rng(29);
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "#2b5fb8"); gr.addColorStop(1, "#6fb5e8");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) { g.fillStyle = "rgba(255,255,255,0.8)"; const x = r() * w, y = 10 + r() * 50; g.beginPath(); g.arc(x, y, 8, 0, Math.PI * 2); g.arc(x + 10, y - 4, 10, 0, Math.PI * 2); g.arc(x + 22, y, 8, 0, Math.PI * 2); g.fill(); }
    for (let i = 0; i < 10; i++) {
      const x = r() * w, y = r() * h * 0.6, s = 5 + r() * 4;
      g.fillStyle = "#ffd84a";
      g.beginPath();
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? s * 0.45 : s; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      g.fill();
    }
    // water waves bottom
    g.fillStyle = "#1f4d99";
    g.fillRect(0, h - 26, w, 26);
    g.fillStyle = "#86c9f0";
    for (let x = 0; x < w; x += 16) { g.beginPath(); g.arc(x + 8, h - 26, 8, Math.PI, 0); g.fill(); }
  });

/** red/white bullseye target */
export const amTarget = () =>
  makeTex(128, 128, (g, w) => {
    const c = w / 2;
    for (let i = 6; i > 0; i--) { g.fillStyle = i % 2 ? "#d62828" : "#fafafa"; g.beginPath(); g.arc(c, c, (i / 6) * c, 0, Math.PI * 2); g.fill(); }
  });

/** stone curb / fountain rim */
export const amStone = (base = "#cfc8bb", seed = 31) =>
  makeTex(256, 128, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 64) { g.fillStyle = "rgba(0,0,0,0.22)"; g.fillRect(x, 0, 2, h); }
    speck(g, w, h, r, 1200, 0.2);
    grime(g, w, h, r, 10, 0.18);
  });

export const amSoil = () =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(33);
    g.fillStyle = "#4a3222";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { const v = r(); g.fillStyle = `rgba(${90 + v * 60},${60 + v * 40},${35 + v * 20},0.8)`; g.fillRect(r() * w, r() * h, 1 + r() * 4, 1 + r() * 2); }
  });

/** pastel checker tiles (teacup ride platform) */
export const amPastelTiles = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(37);
    const cols = ["#f7c9d9", "#fff4d6", "#c9e8f7", "#fff4d6"];
    const s = 32;
    for (let y = 0; y < h / s; y++) for (let x = 0; x < w / s; x++) {
      g.fillStyle = cols[(x + y) % 2 === 0 ? (y % 2) * 2 : 1 + ((x + 1) % 2) * 2];
      g.fillRect(x * s, y * s, s, s);
      g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(x * s + 2, y * s + 2, s - 4, 2);
    }
    g.strokeStyle = "rgba(120,100,90,0.35)"; g.lineWidth = 1.5;
    for (let i = 0; i <= w; i += s) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
    speck(g, w, h, r, 700, 0.08);
    grime(g, w, h, r, 8, 0.1);
  });

/** teacup body: white porcelain with a coloured band and polka dots */
export const amCupPaint = (band: string, dot: string) =>
  makeTex(256, 128, (g, w, h) => {
    g.fillStyle = "#fbf8f2";
    g.fillRect(0, 0, w, h);
    g.fillStyle = band;
    g.fillRect(0, h * 0.62, w, h * 0.38);
    g.fillStyle = "#e7b949";
    g.fillRect(0, h * 0.58, w, 5);
    g.fillRect(0, h - 8, w, 4);
    g.fillStyle = dot;
    for (let x = 0; x < 8; x++) for (let y = 0; y < 2; y++) { g.beginPath(); g.arc(x * 32 + 16 + y * 16, 18 + y * 26, 7, 0, Math.PI * 2); g.fill(); }
  });

/** rubber (tyres, bumpers) */
export const amRubber = () =>
  makeTex(128, 64, (g, w, h) => {
    const r = rng(41);
    g.fillStyle = "#1c1c1f";
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 8) { g.fillStyle = "rgba(255,255,255,0.05)"; g.fillRect(x, 0, 3, h); }
    speck(g, w, h, r, 400, 0.12);
  });

/** Carnival sign: rounded panel, border, marquee bulbs, bold text. */
export const amSign = (text: string, bg: string, fg: string, w = 512, h = 128, bulbs = true, sub = "") =>
  makeTex(w, h, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, bg); gr.addColorStop(1, shade(bg, -0.25));
    g.fillStyle = "#3a1d0e"; g.fillRect(0, 0, w, h);
    g.fillStyle = gr; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, h * 0.18); g.fill();
    g.strokeStyle = "#f6d36b"; g.lineWidth = 6; g.beginPath(); g.roundRect(14, 14, w - 28, h - 28, h * 0.14); g.stroke();
    if (bulbs) {
      g.fillStyle = "#fff5c8";
      const n = Math.floor(w / 28);
      for (let i = 0; i < n; i++) { const x = 20 + (i * (w - 40)) / (n - 1); g.beginPath(); g.arc(x, 9, 4, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(x, h - 9, 4, 0, Math.PI * 2); g.fill(); }
    }
    g.textAlign = "center"; g.textBaseline = "middle";
    const fs = Math.floor(h * (sub ? 0.46 : 0.56));
    g.font = `900 ${fs}px ${FONT}`;
    let tw = g.measureText(text).width;
    const maxW = w - 60;
    if (tw > maxW) { g.font = `900 ${Math.floor((fs * maxW) / tw)}px ${FONT}`; tw = maxW; }
    const ty = sub ? h * 0.42 : h / 2 + 2;
    g.lineWidth = Math.max(4, h * 0.06); g.strokeStyle = "#2a130a"; g.lineJoin = "round"; g.strokeText(text, w / 2, ty);
    g.fillStyle = fg; g.fillText(text, w / 2, ty);
    if (sub) { g.font = `700 ${Math.floor(h * 0.2)}px ${FONT}`; g.fillStyle = "#fff6dc"; g.fillText(sub, w / 2, h * 0.76); }
  });

function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f))));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/** price board / menu (small text lines) */
export const amMenu = (title: string, lines: string[], bg = "#26211d", fg = "#ffe9b0") =>
  makeTex(256, 256, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#d9a93b"; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `900 34px ${FONT}`; g.fillText(title, w / 2, 40);
    g.font = `700 24px ${FONT}`;
    lines.forEach((l, i) => { g.textAlign = "left"; g.fillStyle = "#ffffff"; g.fillText(l, 22, 92 + i * 38); g.textAlign = "right"; g.fillStyle = fg; g.fillText(`${(i + 2) * 50}¢`, w - 22, 92 + i * 38); });
  });

/** park map / poster board */
export const amParkMap = () =>
  makeTex(256, 192, (g, w, h) => {
    const r = rng(51);
    g.fillStyle = "#8fcf6a"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#f3e2b8"; g.lineWidth = 10;
    g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2, 20); g.moveTo(20, h / 2); g.lineTo(w - 20, h / 2); g.stroke();
    const cols = ["#e63946", "#f4a261", "#2a9d8f", "#457b9d", "#e9c46a", "#b56576"];
    for (let i = 0; i < 9; i++) { g.fillStyle = cols[i % cols.length]; g.beginPath(); g.arc(20 + r() * (w - 40), 20 + r() * (h - 40), 8 + r() * 10, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = "#1d3557"; g.fillRect(0, 0, w, 26);
    g.fillStyle = "#fff"; g.font = `900 18px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("PARK MAP", w / 2, 14);
  });

/** metal lattice (roller coaster / canopy truss) with alpha */
export const amLattice = () =>
  makeTex(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = "#ffffff"; g.lineWidth = 10;
    g.strokeRect(5, 5, w - 10, h - 10);
    g.lineWidth = 7;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke();
  });
