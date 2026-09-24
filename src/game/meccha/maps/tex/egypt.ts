// Egypt textures: sandstone ashlar, carved + painted hieroglyph reliefs (drawn procedurally), column bands,
// papyrus capitals, star ceilings, paving, sand ripples, gold, nemes stripes, winged sun disk, chest panels.
import { makeTex } from "../../textures";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
type C = CanvasRenderingContext2D;

function speckle(g: C, w: number, h: number, r: () => number, n: number, a: number) {
  for (let i = 0; i < n; i++) {
    const v = (r() - 0.5) * a * 2;
    g.fillStyle = v > 0 ? `rgba(255,245,225,${v})` : `rgba(60,35,10,${-v})`;
    g.fillRect(r() * w, r() * h, 1 + r() * 2.5, 1 + r() * 2.5);
  }
}
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

// ---------------- hieroglyphs ----------------
// Each glyph is drawn inside a box (x,y = top-left, s = size) as a silhouette path using the current fillStyle.
const GLYPHS: ((g: C, s: number) => void)[] = [
  // 0 vulture / bird standing
  (g, s) => {
    g.beginPath(); g.ellipse(s * 0.5, s * 0.5, s * 0.3, s * 0.17, -0.25, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(s * 0.2, s * 0.28, s * 0.1, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(s * 0.1, s * 0.26); g.lineTo(s * 0.0, s * 0.33); g.lineTo(s * 0.12, s * 0.33); g.fill();
    g.beginPath(); g.moveTo(s * 0.72, s * 0.52); g.lineTo(s * 0.98, s * 0.72); g.lineTo(s * 0.7, s * 0.66); g.fill();
    g.fillRect(s * 0.38, s * 0.62, s * 0.05, s * 0.34); g.fillRect(s * 0.52, s * 0.62, s * 0.05, s * 0.34);
    g.fillRect(s * 0.3, s * 0.93, s * 0.32, s * 0.05);
  },
  // 1 reed leaf
  (g, s) => {
    g.beginPath(); g.moveTo(s * 0.45, s * 0.98); g.quadraticCurveTo(s * 0.25, s * 0.5, s * 0.55, s * 0.02); g.quadraticCurveTo(s * 0.7, s * 0.5, s * 0.58, s * 0.98); g.fill();
    g.fillRect(s * 0.36, s * 0.72, s * 0.14, s * 0.04);
  },
  // 2 forearm
  (g, s) => {
    g.beginPath(); g.moveTo(s * 0.02, s * 0.55); g.lineTo(s * 0.7, s * 0.45); g.lineTo(s * 0.98, s * 0.4); g.lineTo(s * 0.96, s * 0.56); g.lineTo(s * 0.7, s * 0.6); g.lineTo(s * 0.02, s * 0.68); g.fill();
  },
  // 3 water ripple (zigzag)
  (g, s) => {
    g.lineWidth = s * 0.08; g.lineJoin = "miter";
    for (const yy of [0.35, 0.65]) {
      g.beginPath();
      for (let i = 0; i <= 8; i++) g.lineTo(s * (0.04 + i * 0.115), s * (yy + (i % 2 ? -0.07 : 0.07)));
      g.strokeStyle = g.fillStyle as string; g.stroke();
    }
  },
  // 4 mouth
  (g, s) => { g.beginPath(); g.ellipse(s * 0.5, s * 0.5, s * 0.45, s * 0.14, 0, 0, Math.PI * 2); g.fill(); },
  // 5 bread loaf
  (g, s) => { g.beginPath(); g.moveTo(s * 0.15, s * 0.75); g.arc(s * 0.5, s * 0.75, s * 0.35, Math.PI, 0); g.closePath(); g.fill(); },
  // 6 horned viper
  (g, s) => {
    g.lineWidth = s * 0.1; g.lineCap = "round"; g.strokeStyle = g.fillStyle as string;
    g.beginPath(); g.moveTo(s * 0.05, s * 0.75); g.bezierCurveTo(s * 0.35, s * 0.55, s * 0.55, s * 0.95, s * 0.85, s * 0.6); g.stroke();
    g.beginPath(); g.arc(s * 0.85, s * 0.52, s * 0.1, 0, Math.PI * 2); g.fill();
    g.fillRect(s * 0.8, s * 0.3, s * 0.04, s * 0.15); g.fillRect(s * 0.9, s * 0.3, s * 0.04, s * 0.15);
  },
  // 7 owl
  (g, s) => {
    g.beginPath(); g.ellipse(s * 0.5, s * 0.6, s * 0.24, s * 0.34, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(s * 0.5, s * 0.24, s * 0.17, 0, Math.PI * 2); g.fill();
    g.fillRect(s * 0.34, s * 0.9, s * 0.32, s * 0.06);
  },
  // 8 ankh
  (g, s) => {
    g.lineWidth = s * 0.1; g.strokeStyle = g.fillStyle as string;
    g.beginPath(); g.ellipse(s * 0.5, s * 0.22, s * 0.14, s * 0.18, 0, 0, Math.PI * 2); g.stroke();
    g.fillRect(s * 0.2, s * 0.4, s * 0.6, s * 0.1); g.fillRect(s * 0.45, s * 0.4, s * 0.1, s * 0.58);
  },
  // 9 eye
  (g, s) => {
    g.beginPath(); g.ellipse(s * 0.5, s * 0.42, s * 0.4, s * 0.16, 0, 0, Math.PI * 2); g.fill();
    g.fillRect(s * 0.1, s * 0.2, s * 0.8, s * 0.06);
    g.beginPath(); g.moveTo(s * 0.45, s * 0.55); g.lineTo(s * 0.38, s * 0.95); g.lineTo(s * 0.46, s * 0.95); g.lineTo(s * 0.53, s * 0.58); g.fill();
    g.lineWidth = s * 0.06; g.strokeStyle = g.fillStyle as string;
    g.beginPath(); g.moveTo(s * 0.62, s * 0.56); g.quadraticCurveTo(s * 0.7, s * 0.9, s * 0.88, s * 0.82); g.stroke();
  },
  // 10 sun disk
  (g, s) => {
    g.lineWidth = s * 0.1; g.strokeStyle = g.fillStyle as string;
    g.beginPath(); g.arc(s * 0.5, s * 0.5, s * 0.32, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(s * 0.5, s * 0.5, s * 0.08, 0, Math.PI * 2); g.fill();
  },
  // 11 seated man
  (g, s) => {
    g.beginPath(); g.arc(s * 0.5, s * 0.15, s * 0.12, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(s * 0.38, s * 0.28); g.lineTo(s * 0.62, s * 0.28); g.lineTo(s * 0.62, s * 0.62); g.lineTo(s * 0.9, s * 0.64); g.lineTo(s * 0.9, s * 0.96); g.lineTo(s * 0.3, s * 0.96); g.lineTo(s * 0.34, s * 0.5); g.fill();
    g.fillRect(s * 0.6, s * 0.36, s * 0.28, s * 0.07);
  },
  // 12 basket
  (g, s) => { g.beginPath(); g.moveTo(s * 0.05, s * 0.5); g.lineTo(s * 0.95, s * 0.5); g.quadraticCurveTo(s * 0.9, s * 0.9, s * 0.5, s * 0.9); g.quadraticCurveTo(s * 0.1, s * 0.9, s * 0.05, s * 0.5); g.fill(); },
  // 13 folded cloth / tall
  (g, s) => { g.fillRect(s * 0.38, s * 0.06, s * 0.24, s * 0.9); g.fillRect(s * 0.3, s * 0.06, s * 0.4, s * 0.1); },
  // 14 lion lying
  (g, s) => {
    g.beginPath(); g.ellipse(s * 0.45, s * 0.62, s * 0.38, s * 0.14, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(s * 0.8, s * 0.46, s * 0.13, 0, Math.PI * 2); g.fill();
    g.fillRect(s * 0.68, s * 0.7, s * 0.3, s * 0.07);
    g.lineWidth = s * 0.05; g.strokeStyle = g.fillStyle as string;
    g.beginPath(); g.moveTo(s * 0.08, s * 0.6); g.quadraticCurveTo(s * 0.0, s * 0.3, s * 0.12, s * 0.3); g.stroke();
  },
  // 15 djed pillar
  (g, s) => {
    g.fillRect(s * 0.4, s * 0.2, s * 0.2, s * 0.78);
    for (let i = 0; i < 4; i++) g.fillRect(s * 0.22, s * (0.08 + i * 0.1), s * 0.56, s * 0.06);
  },
  // 16 scarab
  (g, s) => {
    g.beginPath(); g.ellipse(s * 0.5, s * 0.58, s * 0.2, s * 0.28, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(s * 0.5, s * 0.24, s * 0.1, 0, Math.PI * 2); g.fill();
    g.lineWidth = s * 0.05; g.strokeStyle = g.fillStyle as string;
    for (const sx of [-1, 1]) for (const yy of [0.45, 0.62, 0.8]) { g.beginPath(); g.moveTo(s * 0.5, s * yy); g.lineTo(s * (0.5 + sx * 0.42), s * (yy + 0.06)); g.stroke(); }
  },
  // 17 feather
  (g, s) => { g.beginPath(); g.moveTo(s * 0.5, s * 0.98); g.quadraticCurveTo(s * 0.3, s * 0.4, s * 0.56, s * 0.02); g.quadraticCurveTo(s * 0.72, s * 0.3, s * 0.56, s * 0.98); g.fill(); },
  // 18 foot / leg
  (g, s) => { g.fillRect(s * 0.4, s * 0.05, s * 0.14, s * 0.8); g.beginPath(); g.moveTo(s * 0.38, s * 0.8); g.lineTo(s * 0.9, s * 0.86); g.lineTo(s * 0.9, s * 0.96); g.lineTo(s * 0.38, s * 0.96); g.fill(); },
  // 19 cobra
  (g, s) => {
    g.beginPath(); g.ellipse(s * 0.45, s * 0.36, s * 0.13, s * 0.26, 0.1, 0, Math.PI * 2); g.fill();
    g.lineWidth = s * 0.1; g.lineCap = "round"; g.strokeStyle = g.fillStyle as string;
    g.beginPath(); g.moveTo(s * 0.45, s * 0.6); g.quadraticCurveTo(s * 0.5, s * 0.92, s * 0.9, s * 0.88); g.stroke();
  },
  // 20 falcon
  (g, s) => {
    g.beginPath(); g.moveTo(s * 0.3, s * 0.25); g.quadraticCurveTo(s * 0.8, s * 0.3, s * 0.8, s * 0.7); g.lineTo(s * 0.95, s * 0.92); g.lineTo(s * 0.55, s * 0.8); g.quadraticCurveTo(s * 0.3, s * 0.6, s * 0.3, s * 0.25); g.fill();
    g.beginPath(); g.arc(s * 0.3, s * 0.22, s * 0.12, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(s * 0.2, s * 0.2); g.lineTo(s * 0.08, s * 0.3); g.lineTo(s * 0.22, s * 0.3); g.fill();
    g.fillRect(s * 0.45, s * 0.8, s * 0.05, s * 0.16);
  },
  // 21 ripple bar / sky
  (g, s) => { g.fillRect(s * 0.05, s * 0.4, s * 0.9, s * 0.18); g.fillRect(s * 0.05, s * 0.58, s * 0.08, s * 0.2); g.fillRect(s * 0.87, s * 0.58, s * 0.08, s * 0.2); },
  // 22 wavy-edged hill
  (g, s) => { g.beginPath(); g.moveTo(s * 0.05, s * 0.85); g.arc(s * 0.25, s * 0.7, s * 0.2, Math.PI, 0); g.arc(s * 0.5, s * 0.6, s * 0.2, Math.PI, 0); g.arc(s * 0.75, s * 0.7, s * 0.2, Math.PI, 0); g.lineTo(s * 0.95, s * 0.85); g.fill(); },
];

/** draws glyph #i at (x,y) size s as sunk relief: dark shadow edge, fill, light rim */
function glyph(g: C, i: number, x: number, y: number, s: number, fill: string, carve = true) {
  const f = GLYPHS[i % GLYPHS.length];
  if (carve) {
    g.save(); g.translate(x + s * 0.04, y + s * 0.04); g.fillStyle = "rgba(40,22,8,0.55)"; f(g, s); g.restore();
    g.save(); g.translate(x - s * 0.02, y - s * 0.02); g.fillStyle = "rgba(255,240,210,0.35)"; f(g, s); g.restore();
  }
  g.save(); g.translate(x, y); g.fillStyle = fill; g.strokeStyle = fill; f(g, s); g.restore();
}

function cartouche(g: C, x: number, y: number, w: number, h: number, r: () => number, ink: string, paint: string[] | null) {
  g.lineWidth = Math.max(2, w * 0.07);
  g.strokeStyle = "rgba(40,22,8,0.6)";
  g.beginPath(); g.roundRect(x + 1.5, y + 1.5, w, h, w / 2); g.stroke();
  g.strokeStyle = ink;
  g.beginPath(); g.roundRect(x, y, w, h, w / 2); g.stroke();
  g.fillStyle = ink; g.fillRect(x - w * 0.1, y + h + 2, w * 1.2, w * 0.1);
  const n = Math.max(2, Math.floor(h / (w * 0.72)));
  for (let i = 0; i < n; i++) glyph(g, Math.floor(r() * GLYPHS.length), x + w * 0.18, y + w * 0.2 + i * ((h - w * 0.4) / n), w * 0.64, paint ? paint[Math.floor(r() * paint.length)] : ink);
}

/** vertical text column: glyphs stacked between incised lines */
function textColumn(g: C, x: number, y: number, w: number, h: number, r: () => number, ink: string, paint: string[] | null) {
  g.fillStyle = "rgba(50,28,10,0.45)";
  g.fillRect(x, y, 2, h); g.fillRect(x + w, y, 2, h);
  g.fillStyle = "rgba(255,240,210,0.25)";
  g.fillRect(x + 2, y, 1, h); g.fillRect(x + w + 2, y, 1, h);
  let yy = y + 4;
  while (yy < y + h - w * 0.5) {
    const s = w * (0.62 + r() * 0.22);
    if (r() < 0.12 && yy + w * 2 < y + h) { cartouche(g, x + w * 0.2, yy, w * 0.6, w * 1.9, r, ink, paint); yy += w * 2.2; continue; }
    const half = r() < 0.25;
    if (half) {
      glyph(g, Math.floor(r() * GLYPHS.length), x + w * 0.1, yy, w * 0.42, paint ? paint[Math.floor(r() * paint.length)] : ink);
      glyph(g, Math.floor(r() * GLYPHS.length), x + w * 0.52, yy, w * 0.42, paint ? paint[Math.floor(r() * paint.length)] : ink);
      yy += w * 0.5;
    } else {
      glyph(g, Math.floor(r() * GLYPHS.length), x + (w - s) / 2 + 1, yy, s, paint ? paint[Math.floor(r() * paint.length)] : ink);
      yy += s + w * 0.08;
    }
  }
}

/** striding figure in profile (offering bearer / priest / god), feet at (x, y), height h, facing right */
function figure(g: C, x: number, y: number, h: number, r: () => number, ink: string, skin: string | null, kilt: string | null, wig: string | null, variant: number) {
  const u = h / 10;
  const draw = (dx: number, dy: number, col: string | null, all: string | null) => {
    const c = (p: string | null) => (all ?? p ?? col ?? ink);
    g.save();
    g.translate(x + dx, y + dy);
    // legs
    g.fillStyle = c(skin);
    g.beginPath(); g.moveTo(-u * 0.4, -u * 4.4); g.lineTo(-u * 1.5, 0); g.lineTo(-u * 0.9, 0); g.lineTo(u * 0.1, -u * 4.0); g.fill();
    g.beginPath(); g.moveTo(-u * 0.1, -u * 4.4); g.lineTo(u * 1.2, 0); g.lineTo(u * 1.8, 0); g.lineTo(u * 0.5, -u * 4.4); g.fill();
    g.fillRect(-u * 1.8, -u * 0.25, u * 1.2, u * 0.25); g.fillRect(u * 1.1, -u * 0.25, u * 1.3, u * 0.25);
    // torso
    g.beginPath(); g.moveTo(-u * 0.7, -u * 4.8); g.lineTo(-u * 1.1, -u * 7.8); g.lineTo(u * 1.2, -u * 7.8); g.lineTo(u * 0.6, -u * 4.8); g.fill();
    // arms
    if (variant % 3 === 0) { // carrying offering tray above
      g.fillRect(u * 0.8, -u * 7.6, u * 0.4, u * 1.4);
      g.beginPath(); g.moveTo(u * 1.0, -u * 6.4); g.lineTo(u * 2.4, -u * 7.0); g.lineTo(u * 2.4, -u * 7.5); g.lineTo(u * 1.2, -u * 7.1); g.fill();
      g.fillRect(u * 1.8, -u * 9.8, u * 1.4, u * 2.6);
    } else if (variant % 3 === 1) { // arms forward (adoration)
      g.beginPath(); g.moveTo(u * 0.9, -u * 7.5); g.lineTo(u * 2.8, -u * 7.9); g.lineTo(u * 2.9, -u * 7.5); g.lineTo(u * 0.9, -u * 6.9); g.fill();
      g.beginPath(); g.moveTo(u * 0.8, -u * 7.0); g.lineTo(u * 2.6, -u * 6.8); g.lineTo(u * 2.6, -u * 6.4); g.lineTo(u * 0.8, -u * 6.4); g.fill();
    } else { // staff + ankh
      g.fillRect(-u * 1.0, -u * 7.4, u * 0.35, u * 2.8);
      g.fillRect(u * 0.9, -u * 7.5, u * 1.6, u * 0.35);
      g.fillRect(u * 2.3, -u * 10.4, u * 0.22, u * 10.4);
    }
    // kilt
    g.fillStyle = c(kilt);
    g.beginPath(); g.moveTo(-u * 0.9, -u * 5.0); g.lineTo(u * 0.8, -u * 5.0); g.lineTo(u * 1.6, -u * 3.4); g.lineTo(-u * 1.0, -u * 3.3); g.fill();
    // head
    g.fillStyle = c(skin);
    g.beginPath(); g.ellipse(u * 0.35, -u * 8.75, u * 0.62, u * 0.78, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(u * 0.8, -u * 8.9); g.lineTo(u * 1.25, -u * 8.5); g.lineTo(u * 0.8, -u * 8.3); g.fill();
    // wig / headdress
    g.fillStyle = c(wig);
    if (variant % 4 === 3) { // animal-headed god: tall ears
      g.beginPath(); g.moveTo(-u * 0.1, -u * 9.3); g.lineTo(u * 0.1, -u * 10.6); g.lineTo(u * 0.4, -u * 9.3); g.fill();
      g.beginPath(); g.moveTo(u * 0.7, -u * 8.8); g.lineTo(u * 1.7, -u * 8.5); g.lineTo(u * 0.7, -u * 8.2); g.fill();
    }
    g.beginPath(); g.moveTo(-u * 0.4, -u * 9.5); g.quadraticCurveTo(u * 0.6, -u * 9.9, u * 0.8, -u * 9.1); g.lineTo(u * 0.1, -u * 8.8); g.lineTo(u * 0.0, -u * 7.5); g.lineTo(-u * 0.6, -u * 7.6); g.fill();
    g.restore();
  };
  draw(u * 0.25, u * 0.25, null, "rgba(40,22,8,0.5)");
  draw(-u * 0.12, -u * 0.12, null, "rgba(255,240,210,0.28)");
  draw(0, 0, null, null);
  void r;
}

function stoneBase(g: C, w: number, h: number, r: () => number, base: string, joints: boolean, course = 64) {
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  blotches(g, w, h, r, 70, "#7a5a36", 0.08, 60);
  blotches(g, w, h, r, 40, "#fff0d0", 0.07, 50);
  speckle(g, w, h, r, 3500, 0.1);
  if (joints) {
    for (let y = 0; y < h; y += course) {
      g.fillStyle = "rgba(70,45,20,0.28)"; g.fillRect(0, y, w, 2);
      let x = r() * 80;
      while (x < w) { g.fillRect(x, y, 2, course); x += 90 + r() * 140; }
    }
  }
}

// ---------------- public textures ----------------

/** big sandstone ashlar blocks (walls, pylons). 512px = 4m → 0.5m courses */
export const sandstone = (base = "#cfa877", seed = 3) =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#8e6c46";
    g.fillRect(0, 0, w, h);
    const ch = 64;
    for (let row = 0; row < h / ch; row++) {
      const n = 3 + Math.floor(r() * 3);
      const cuts: number[] = [];
      let acc = 0;
      for (let i = 0; i < n; i++) { const v = 0.6 + r(); cuts.push(v); acc += v; }
      let x = r() * w;
      for (const c of cuts) {
        const bw = (c / acc) * w;
        const tone = (r() - 0.5) * 22;
        for (const ox of [0, -w]) {
          const X = x + ox;
          const col = `rgb(${hexR(base) + tone},${hexG(base) + tone * 0.9},${hexB(base) + tone * 0.7})`;
          g.fillStyle = col;
          g.fillRect(X + 2, row * ch + 2, bw - 3, ch - 3);
          // bevel light/dark
          g.fillStyle = "rgba(255,240,215,0.18)"; g.fillRect(X + 2, row * ch + 2, bw - 3, 3);
          g.fillStyle = "rgba(60,35,12,0.18)"; g.fillRect(X + 2, row * ch + ch - 5, bw - 3, 3);
        }
        x += bw;
      }
      if (x > w) x -= w;
    }
    blotches(g, w, h, r, 90, "#6b4b2a", 0.09, 45);
    blotches(g, w, h, r, 50, "#f6e2bb", 0.08, 45);
    speckle(g, w, h, r, 9000, 0.12);
    // chipped corners / erosion pits
    for (let i = 0; i < 80; i++) {
      g.fillStyle = `rgba(80,50,20,${0.2 + r() * 0.3})`;
      g.beginPath(); g.ellipse(r() * w, Math.floor(r() * 8) * ch + (r() < 0.5 ? 3 : ch - 3), 2 + r() * 7, 1.5 + r() * 4, r() * 3, 0, Math.PI * 2); g.fill();
    }
    // weathering streaks
    for (let i = 0; i < 26; i++) {
      const x = r() * w, y = r() * h;
      const grd = g.createLinearGradient(x, y, x, y + 90);
      grd.addColorStop(0, "rgba(90,60,30,0.14)"); grd.addColorStop(1, "rgba(90,60,30,0)");
      g.fillStyle = grd; g.fillRect(x, y, 3 + r() * 6, 90);
    }
  });

function hexR(c: string) { return parseInt(c.slice(1, 3), 16); }
function hexG(c: string) { return parseInt(c.slice(3, 5), 16); }
function hexB(c: string) { return parseInt(c.slice(5, 7), 16); }

const PAINT = ["#2d5a9a", "#a8412c", "#3f8a6a", "#c7902e", "#1f2b3a"];
const PAINT_FADED = ["#5d7ea8", "#a86a52", "#6f9a7e", "#c9a45c", "#5b5046"];

/** carved relief wall: 4m tile, dado, procession register, glyph columns, frieze. painted = colourful tomb version */
export const relief = (seed = 1, painted = false, base = "#d4b183") =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(seed);
    stoneBase(g, w, h, r, painted ? "#e2cfa6" : base, !painted);
    const ink = painted ? "#2a2018" : "#8c6a44";
    const pal = painted ? PAINT : null;
    // frieze at top (khekher knots) 0..48
    const fy = 10;
    g.fillStyle = painted ? "#2d5a9a" : "rgba(95,65,35,0.5)";
    g.fillRect(0, fy + 40, w, 5);
    for (let x = 0; x < w; x += 22) {
      const col = painted ? ["#a8412c", "#2d5a9a", "#3f8a6a"][Math.floor(x / 22) % 3] : "rgba(110,75,40,0.55)";
      g.fillStyle = "rgba(40,22,8,0.4)"; g.fillRect(x + 7, fy + 2, 10, 38);
      g.fillStyle = col;
      g.beginPath(); g.ellipse(x + 11, fy + 8, 6, 7, 0, 0, Math.PI * 2); g.fill();
      g.fillRect(x + 7, fy + 12, 8, 26);
      g.fillStyle = painted ? "#e2cfa6" : "rgba(230,205,160,0.4)"; g.fillRect(x + 9, fy + 22, 4, 3);
    }
    // text columns register 56..190
    const tY = 58, tH = 130;
    const colW = 28;
    for (let x = 4; x + colW < w; x += colW + 4) textColumn(g, x, tY, colW, tH, r, ink, pal);
    g.fillStyle = painted ? "#a8412c" : "rgba(95,65,35,0.5)"; g.fillRect(0, tY + tH + 4, w, 5);
    // procession register 200..450
    const baseY = 448;
    g.fillStyle = painted ? "#c7902e" : "rgba(95,65,35,0.45)"; g.fillRect(0, baseY + 2, w, 5);
    let x = 30;
    let v = Math.floor(r() * 4);
    while (x < w - 60) {
      if (r() < 0.3) {
        // offering table with goods
        g.fillStyle = painted ? "#a8412c" : ink;
        g.fillRect(x - 12, baseY - 70, 34, 5); g.fillRect(x + 1, baseY - 70, 6, 70);
        for (let i = 0; i < 4; i++) glyph(g, [5, 12, 1, 17][i], x - 14 + i * 9, baseY - 96 + (i % 2) * 6, 16, painted ? pal![i % pal!.length] : ink);
        x += 52;
      } else {
        const hh = 200 + r() * 26;
        figure(g, x + 20, baseY, hh, r, ink, painted ? "#a4552f" : null, painted ? "#f1ead8" : null, painted ? "#1f2b3a" : null, v++);
        // short caption column above the reach of the figure
        for (let i = 0; i < 3; i++) glyph(g, Math.floor(r() * GLYPHS.length), x + 58, baseY - 220 + i * 22, 18, painted ? pal![Math.floor(r() * pal!.length)] : ink);
        x += 88;
      }
    }
    // dado bottom 456..512
    g.fillStyle = painted ? "#6b3b25" : "rgba(90,60,30,0.28)";
    g.fillRect(0, 458, w, 54);
    if (painted) { g.fillStyle = "#c7902e"; g.fillRect(0, 458, w, 5); g.fillStyle = "#2d5a9a"; g.fillRect(0, 466, w, 4); }
    speckle(g, w, h, r, 4000, 0.09);
    // damage: flaked areas where paint & surface lost
    for (let i = 0; i < 14; i++) {
      g.fillStyle = painted ? `rgba(215,190,150,${0.5 + r() * 0.4})` : `rgba(180,145,100,${0.25 + r() * 0.3})`;
      g.beginPath(); g.ellipse(r() * w, r() * h, 8 + r() * 26, 5 + r() * 16, r() * 3, 0, Math.PI * 2); g.fill();
    }
  });

/** column shaft wrap (repeat 4 around, 1 along height). leaves at the base, glyph columns, bands under the capital */
export const columnBand = (seed = 4) =>
  makeTex(256, 512, (g, w, h) => {
    const r = rng(seed);
    stoneBase(g, w, h, r, "#d2ae7f", false);
    const ink = "#86633f";
    // bands at top (canvas top = top of shaft)
    for (let i = 0; i < 5; i++) {
      g.fillStyle = i % 2 ? "rgba(60,90,140,0.35)" : "rgba(150,70,40,0.35)";
      g.fillRect(0, 8 + i * 9, w, 5);
      g.fillStyle = "rgba(40,22,8,0.35)"; g.fillRect(0, 13 + i * 9, w, 1.5);
    }
    // cartouche frieze
    for (let x = 12; x < w; x += 64) cartouche(g, x + 8, 60, 26, 66, r, ink, PAINT_FADED);
    // glyph columns
    for (let x = 4; x < w - 30; x += 42) textColumn(g, x, 140, 34, 250, r, ink, r() < 0.5 ? PAINT_FADED : null);
    // base leaves (triangles)
    for (let x = -16; x < w + 16; x += 32) {
      g.fillStyle = "rgba(40,22,8,0.4)";
      g.beginPath(); g.moveTo(x + 2, h - 8); g.lineTo(x + 18, h - 100); g.lineTo(x + 34, h - 8); g.fill();
      g.fillStyle = "rgba(90,120,90,0.45)";
      g.beginPath(); g.moveTo(x, h - 10); g.lineTo(x + 16, h - 102); g.lineTo(x + 32, h - 10); g.fill();
      g.fillStyle = "rgba(230,210,170,0.3)"; g.fillRect(x + 15, h - 90, 2, 78);
    }
    g.fillStyle = "rgba(60,35,12,0.35)"; g.fillRect(0, h - 10, w, 10);
    blotches(g, w, h, r, 30, "#c9a877", 0.35, 22);
  });

/** papyrus bell capital: stalk ribs + painted triangles */
export const capital = (seed = 6) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    stoneBase(g, w, h, r, "#d3b082", false);
    for (let x = 0; x < w; x += 16) {
      g.fillStyle = "rgba(60,110,90,0.4)"; g.fillRect(x + 3, 0, 8, h);
      g.fillStyle = "rgba(40,22,8,0.3)"; g.fillRect(x + 11, 0, 2, h);
    }
    for (let x = -16; x < w + 16; x += 32) {
      g.fillStyle = "rgba(45,90,154,0.5)";
      g.beginPath(); g.moveTo(x, h); g.lineTo(x + 16, h * 0.45); g.lineTo(x + 32, h); g.fill();
      g.fillStyle = "rgba(168,65,44,0.45)";
      g.beginPath(); g.moveTo(x + 6, h); g.lineTo(x + 16, h * 0.7); g.lineTo(x + 26, h); g.fill();
    }
    for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? "rgba(168,65,44,0.5)" : "rgba(45,90,154,0.5)"; g.fillRect(0, 6 + i * 8, w, 4); }
    blotches(g, w, h, r, 30, "#d8b98a", 0.4, 20);
    speckle(g, w, h, r, 2000, 0.1);
  });

/** architrave / lintel band with a single line of glyphs */
export const glyphBand = (seed = 8) =>
  makeTex(512, 128, (g, w, h) => {
    const r = rng(seed);
    stoneBase(g, w, h, r, "#cfa877", false);
    g.fillStyle = "rgba(60,35,12,0.35)"; g.fillRect(0, 14, w, 3); g.fillRect(0, h - 17, w, 3);
    let x = 8;
    while (x < w - 30) {
      if (r() < 0.12) { g.save(); g.translate(x, h / 2 + 24); g.rotate(-Math.PI / 2); cartouche(g, 0, 0, 44, 80, r, "#86633f", PAINT_FADED); g.restore(); x += 96; continue; }
      glyph(g, Math.floor(r() * GLYPHS.length), x, 32, 60, r() < 0.4 ? PAINT_FADED[Math.floor(r() * 5)] : "#86633f");
      x += 64;
    }
  });

/** blue ceiling with yellow five-point stars */
export const starCeiling = (seed = 9) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#1d2f55";
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 40, "#0d1830", 0.3, 50);
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        const cx = x * 32 + 16 + (y % 2) * 16, cy = y * 32 + 16;
        g.fillStyle = r() < 0.15 ? "rgba(230,200,120,0.4)" : "#e6c26a";
        g.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 3.5 : 9;
          g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
        }
        g.fill();
      }
    // flaked plaster showing sandstone
    for (let i = 0; i < 10; i++) { g.fillStyle = `rgba(190,150,105,${0.5 + r() * 0.4})`; g.beginPath(); g.ellipse(r() * w, r() * h, 6 + r() * 22, 4 + r() * 12, r() * 3, 0, Math.PI * 2); g.fill(); }
    speckle(g, w, h, r, 1500, 0.1);
  });

/** stone floor slabs with sand in the joints. 512 = 4m */
export const paving = (seed = 5) =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#b9955f";
    g.fillRect(0, 0, w, h);
    const rows = [0, 96, 208, 300, 416, 512];
    for (let i = 0; i < rows.length - 1; i++) {
      let x = r() * 60;
      const y0 = rows[i], y1 = rows[i + 1];
      while (x < w + 60) {
        const bw = 90 + r() * 120;
        const t = (r() - 0.5) * 26;
        for (const ox of [0, -w]) {
          g.fillStyle = `rgb(${196 + t},${166 + t * 0.9},${122 + t * 0.7})`;
          g.fillRect(x + ox + 2, y0 + 2, bw - 4, y1 - y0 - 4);
        }
        x += bw;
      }
    }
    blotches(g, w, h, r, 80, "#6e5030", 0.1, 50);
    blotches(g, w, h, r, 60, "#f0d9ac", 0.1, 40);
    speckle(g, w, h, r, 9000, 0.12);
    // cracks
    g.strokeStyle = "rgba(60,38,15,0.45)"; g.lineWidth = 1.2;
    for (let i = 0; i < 12; i++) { g.beginPath(); let x = r() * w, y = r() * h; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 40; y += (r() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); }
    // sand drifts on top
    for (let i = 0; i < 18; i++) { g.fillStyle = `rgba(222,188,130,${0.25 + r() * 0.3})`; g.beginPath(); g.ellipse(r() * w, r() * h, 20 + r() * 50, 10 + r() * 20, r() * 3, 0, Math.PI * 2); g.fill(); }
  });

/** wind-rippled sand */
export const sand = (seed = 2, base = "#d8b27a") =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 40, "#b88d55", 0.12, 50);
    blotches(g, w, h, r, 40, "#f2d5a0", 0.12, 50);
    for (let i = 0; i < 26; i++) {
      const y0 = (i / 26) * h + r() * 4;
      g.strokeStyle = "rgba(150,110,60,0.22)"; g.lineWidth = 1.6;
      g.beginPath();
      for (let x = 0; x <= w; x += 8) g.lineTo(x, y0 + Math.sin((x / w) * Math.PI * 4 + i) * 3);
      g.stroke();
      g.strokeStyle = "rgba(255,240,210,0.2)"; g.lineWidth = 1;
      g.beginPath();
      for (let x = 0; x <= w; x += 8) g.lineTo(x, y0 + 2 + Math.sin((x / w) * Math.PI * 4 + i) * 3);
      g.stroke();
    }
    speckle(g, w, h, r, 5000, 0.12);
  });

/** hammered gold (greyscale detail; material colour gives the gold) */
export const hammered = (seed = 3) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#e8e2d4";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) {
      const x = r() * w, y = r() * h, s = 3 + r() * 7;
      const grd = g.createRadialGradient(x - s * 0.3, y - s * 0.3, 0, x, y, s);
      grd.addColorStop(0, "rgba(255,255,255,0.35)"); grd.addColorStop(1, "rgba(120,100,70,0.12)");
      g.fillStyle = grd; g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill();
    }
  });

/** nemes headdress stripes (gold / lapis) */
export const nemes = (a = "#d9a93a", b = "#1f3f86") =>
  makeTex(128, 128, (g, w, h) => {
    for (let y = 0; y < h; y += 16) { g.fillStyle = a; g.fillRect(0, y, w, 9); g.fillStyle = b; g.fillRect(0, y + 9, w, 7); }
    g.fillStyle = "rgba(0,0,0,0.15)"; for (let y = 9; y < h; y += 16) g.fillRect(0, y, w, 1);
  });

/** winged sun disk on gold with lapis/carnelian inlay (throne back, door lintels) */
export const wingedDisk = () =>
  makeTex(512, 256, (g, w, h) => {
    const r = rng(14);
    g.fillStyle = "#d8a93c";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(255,240,190,${r() * 0.15})`; g.fillRect(r() * w, r() * h, 2, 2); }
    g.strokeStyle = "#8a5f16"; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16);
    // checker border
    for (let x = 16; x < w - 16; x += 16) { g.fillStyle = (x / 16) % 2 ? "#1f3f86" : "#a8412c"; g.fillRect(x, 16, 16, 12); g.fillRect(x, h - 28, 16, 12); }
    const cx = w / 2, cy = h * 0.46;
    // wings: rows of feathers
    for (const sx of [-1, 1]) {
      for (let row = 0; row < 4; row++) {
        const len = 190 - row * 28;
        for (let i = 0; i < 12; i++) {
          const t = i / 11;
          const x = cx + sx * (38 + t * len);
          const y = cy - 10 + row * 13 + t * t * 26;
          g.fillStyle = ["#1f3f86", "#3f8a9a", "#a8412c", "#1f3f86"][row];
          g.beginPath(); g.ellipse(x, y, 9, 6, sx * 0.25, 0, Math.PI * 2); g.fill();
          g.strokeStyle = "#f1d37a"; g.lineWidth = 1.2; g.stroke();
        }
      }
    }
    // sun disk + cobras
    g.fillStyle = "#b8321f"; g.beginPath(); g.arc(cx, cy - 4, 34, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#f1d37a"; g.lineWidth = 4; g.stroke();
    for (const sx of [-1, 1]) { g.fillStyle = "#1f3f86"; g.beginPath(); g.ellipse(cx + sx * 42, cy + 18, 8, 18, 0, 0, Math.PI * 2); g.fill(); }
    // cartouche band below
    for (let i = 0; i < 6; i++) glyph(g, (i * 5 + 3) % GLYPHS.length, cx - 150 + i * 52, cy + 44, 34, i % 2 ? "#1f3f86" : "#6b3b12", false);
  });

/** painted chest side: checker border and central glyph panel */
export const chestPanel = (seed = 10) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#6b3f22"; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) for (let y = 0; y < 2; y++) { g.fillStyle = (x / 16 + y) % 2 ? "#1f3f86" : "#d8a93c"; g.fillRect(x, 8 + y * 12, 16, 12); g.fillRect(x, h - 32 + y * 12, 16, 12); }
    g.fillStyle = "#e7d7b0"; g.fillRect(16, 40, w - 32, h - 80);
    for (let i = 0; i < 3; i++) figure(g, 60 + i * 64, h - 48, 118, r, "#2a2018", "#a4552f", "#f1ead8", "#1f2b3a", i + 1);
    for (let x = 22; x < w - 20; x += 22) glyph(g, Math.floor(r() * GLYPHS.length), x, 46, 18, PAINT[Math.floor(r() * 5)], false);
    speckle(g, w, h, r, 1500, 0.1);
  });

/** dark stone (basalt / black granite) */
export const basalt = (base = "#1d1b1a", seed = 12) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) { const v = r(); g.fillStyle = v > 0.8 ? "rgba(200,190,170,0.18)" : "rgba(0,0,0,0.25)"; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
    blotches(g, w, h, r, 20, "#4a4038", 0.15, 40);
  });

/** red granite (colossi) */
export const granite = (seed = 13) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#9a5b45"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 7000; i++) { const v = r(); g.fillStyle = v > 0.7 ? "rgba(40,25,25,0.45)" : v > 0.45 ? "rgba(230,190,170,0.35)" : "rgba(120,60,45,0.4)"; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 2); }
    blotches(g, w, h, r, 20, "#5a3528", 0.15, 40);
  });

/** wood grain (cedar / ebony) */
export const woodGrain = (base = "#6b4527", seed = 15) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      g.strokeStyle = `rgba(${r() < 0.5 ? "40,20,5" : "255,220,170"},${0.06 + r() * 0.1})`;
      g.lineWidth = 1 + r() * 2;
      const y = r() * h;
      g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + (r() - 0.5) * 16, w * 0.7, y + (r() - 0.5) * 16, w, y); g.stroke();
    }
    speckle(g, w, h, r, 1200, 0.08);
  });

/** woven reed / basket */
export const weave = (base = "#b88f52", seed = 16) =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) {
      const o = ((x + y) / 8) % 2;
      g.fillStyle = o ? "rgba(255,230,180,0.25)" : "rgba(60,35,10,0.25)";
      g.fillRect(x + 1, y + 1, 6, 6);
    }
    speckle(g, w, h, r, 600, 0.1);
  });

/** palm bark rings */
export const palmBark = () =>
  makeTex(128, 256, (g, w, h) => {
    const r = rng(17);
    g.fillStyle = "#7a5a3a"; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 12) {
      g.fillStyle = "rgba(40,25,10,0.5)"; g.fillRect(0, y, w, 3);
      g.fillStyle = "rgba(200,160,110,0.25)"; g.fillRect(0, y + 3, w, 2);
      for (let x = 0; x < w; x += 16) { g.fillStyle = `rgba(50,30,12,${r() * 0.3})`; g.beginPath(); g.moveTo(x, y + 12); g.lineTo(x + 8, y); g.lineTo(x + 16, y + 12); g.fill(); }
    }
  });

/** palm frond with leaflets (alpha) */
export const frond = () =>
  makeTex(256, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = "#5b6a2a"; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
    for (let x = 6; x < w - 4; x += 5) {
      const l = (h / 2 - 2) * Math.sin((x / w) * Math.PI * 0.9 + 0.2);
      for (const s of [-1, 1]) {
        g.strokeStyle = x % 10 ? "#6f8a34" : "#5a7428"; g.lineWidth = 2.2;
        g.beginPath(); g.moveTo(x, h / 2); g.lineTo(x + 10, h / 2 + s * l); g.stroke();
      }
    }
  });

/** god-ray gradient (bright centre fading to the bottom) */
export const rayGrad = () =>
  makeTex(64, 128, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, "rgba(255,220,160,1)");
    grd.addColorStop(0.7, "rgba(255,200,130,0.45)");
    grd.addColorStop(1, "rgba(255,190,120,0)");
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    const s = g.createLinearGradient(0, 0, w, 0);
    s.addColorStop(0, "rgba(0,0,0,1)"); s.addColorStop(0.25, "rgba(0,0,0,0)"); s.addColorStop(0.75, "rgba(0,0,0,0)"); s.addColorStop(1, "rgba(0,0,0,1)");
    g.globalCompositeOperation = "destination-out"; g.fillStyle = s; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = "source-over";
  });

/** linen wrapping (mummy) */
export const linen = () =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(19);
    g.fillStyle = "#c9b48c"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) { g.save(); g.translate(0, i * 6); g.rotate((r() - 0.5) * 0.4); g.fillStyle = `rgba(${r() < 0.5 ? "90,70,40" : "240,225,190"},${0.15 + r() * 0.2})`; g.fillRect(-20, 0, w + 40, 3 + r() * 3); g.restore(); }
    speckle(g, w, h, r, 800, 0.1);
  });

/** terracotta pottery with painted bands */
export const pottery = (seed = 20) =>
  makeTex(128, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#b2643a"; g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 20, "#7a3f22", 0.2, 30);
    for (const y of [60, 70, 150]) { g.fillStyle = "#2a1a12"; g.fillRect(0, y, w, 4); }
    for (let x = 0; x < w; x += 16) { g.fillStyle = "#e3cfa8"; g.beginPath(); g.moveTo(x, 82); g.lineTo(x + 8, 96); g.lineTo(x + 16, 82); g.fill(); }
    speckle(g, w, h, r, 1500, 0.12);
  });

/** alabaster (canopic jars) with a text column */
export const alabaster = (seed = 21) =>
  makeTex(128, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#e9dcc0"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 12; i++) { g.strokeStyle = `rgba(190,160,110,${0.15 + r() * 0.2})`; g.lineWidth = 1 + r() * 3; g.beginPath(); let y = r() * h; g.moveTo(0, y); for (let x = 0; x <= w; x += 16) { y += (r() - 0.5) * 12; g.lineTo(x, y); } g.stroke(); }
    textColumn(g, w * 0.36, 40, 30, 190, r, "#3a5f9a", null);
  });
