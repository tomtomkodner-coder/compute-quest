// Canvas textures for the School map: glossy vinyl corridor tiles, oak strip / maple gym flooring, plaster,
// acoustic ceiling tiles, chalk blackboards, cork notice boards, curtains, periodic table, posters, piano keys,
// gym mats, balls, basketball net, stone entrance tiles, schoolyard sand / grass, clock face, exit sign.
import * as THREE from "three";
import { makeTex, type PaintTex } from "../../textures";

type G = CanvasRenderingContext2D;
const JP = `"Hiragino Sans", "Noto Sans CJK JP", "WenQuanYi Zen Hei", "Yu Gothic", sans-serif`;
const HAND = `"Hiragino Maru Gothic ProN", "Noto Sans CJK JP", "WenQuanYi Zen Hei", sans-serif`;

export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** fine speckle noise, bucketed by alpha for speed */
function specks(g: G, w: number, h: number, r: () => number, n: number, amt: number, sw = 1, sh = 1) {
  const Q = 5;
  const buckets: number[][] = Array.from({ length: Q * 2 + 1 }, () => []);
  for (let i = 0; i < n; i++) buckets[Math.round((r() - 0.5) * 2 * Q) + Q].push(r() * w, r() * h);
  buckets.forEach((b, bi) => {
    if (!b.length) return;
    const v = ((bi - Q) / Q) * amt;
    g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
    for (let i = 0; i < b.length; i += 2) g.fillRect(b[i], b[i + 1], sw, sh);
  });
}
function blotches(g: G, w: number, h: number, r: () => number, n: number, amt: number, rad: number, col?: string) {
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h, rr = rad * (0.4 + r());
    const c = col ?? (r() < 0.5 ? "0,0,0" : "255,255,255");
    const a = amt * (0.3 + r() * 0.7);
    for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) {
      const cx = x + ox, cy = y + oy;
      if (cx + rr < 0 || cx - rr > w || cy + rr < 0 || cy - rr > h) continue;
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rr);
      gr.addColorStop(0, `rgba(${c},${a})`);
      gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr;
      g.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
    }
  }
}
function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

/** Fast Sobel normal map stored on t.normal (Kit.mat() reuses it) */
export function fastNormal(t: PaintTex): THREE.CanvasTexture {
  if (t.normal) return t.normal;
  const w = t.canvas.width, h = t.canvas.height;
  const src = (t.data ?? t.ctx.getImageData(0, 0, w, h)).data;
  const n = w * h;
  const lum = new Float32Array(n);
  for (let i = 0, j = 0; i < n; i++, j += 4) lum[i] = (src[j] * 0.3 + src[j + 1] * 0.59 + src[j + 2] * 0.11) / 255;
  const out = new Uint8Array(n * 4);
  const k = 2.2;
  for (let y = 0; y < h; y++) {
    const ym = ((y - 1 + h) % h) * w, y0 = y * w, yp = ((y + 1) % h) * w;
    let o = (h - 1 - y) * w * 4;
    for (let x = 0; x < w; x++, o += 4) {
      const xm = x === 0 ? w - 1 : x - 1, xp = x === w - 1 ? 0 : x + 1;
      const dx = (lum[ym + xp] + 2 * lum[y0 + xp] + lum[yp + xp] - lum[ym + xm] - 2 * lum[y0 + xm] - lum[yp + xm]) * k;
      const dy = (lum[yp + xm] + 2 * lum[yp + x] + lum[yp + xp] - lum[ym + xm] - 2 * lum[ym + x] - lum[ym + xp]) * k;
      const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      out[o] = (-dx * inv * 0.5 + 0.5) * 255;
      out[o + 1] = (dy * inv * 0.5 + 0.5) * 255;
      out[o + 2] = (inv * 0.5 + 0.5) * 255;
      out[o + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(out, w, h, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  t.normal = tex as unknown as THREE.CanvasTexture;
  return t.normal;
}

/** glossy vinyl floor tiles, 2×2 tiles per texture (1 tile ≈ 0.45 m → unit 0.9) */
export const vinyl = (base = "#c9cec3", seed = 3) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    const t = w / 2;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      g.fillStyle = shade(base, 0.96 + r() * 0.08);
      g.fillRect(i * t, j * t, t, t);
    }
    specks(g, w, h, r, 5000, 0.12, 1, 1);
    specks(g, w, h, r, 700, 0.18, 2, 2);
    blotches(g, w, h, r, 10, 0.05, 40);
    g.strokeStyle = "rgba(0,0,0,0.025)";
    g.lineWidth = 3;
    for (let i = 0; i < 4; i++) { g.beginPath(); const x = r() * w, y = r() * h; g.arc(x, y, 20 + r() * 50, r() * 6, r() * 6 + 0.8); g.stroke(); }
    g.fillStyle = "rgba(40,40,30,0.3)";
    g.fillRect(0, 0, w, 1); g.fillRect(0, t, w, 1); g.fillRect(0, 0, 1, h); g.fillRect(t, 0, 1, h);
    g.fillStyle = "rgba(255,255,255,0.2)";
    g.fillRect(0, 1, w, 1); g.fillRect(0, t + 1, w, 1); g.fillRect(1, 0, 1, h); g.fillRect(t + 1, 0, 1, h);
  });

/** wooden strip flooring: boards along U with staggered joints and grain */
export const strips = (base: string, n = 12, seed = 5, joint = 0.35) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    const bh = h / n;
    for (let i = 0; i < n; i++) {
      const y = i * bh;
      g.fillStyle = shade(base, 0.86 + r() * 0.24);
      g.fillRect(0, y, w, bh);
      for (let l = 0; l < 7; l++) {
        const yy = y + r() * bh, a = 0.04 + r() * 0.1, ph = r() * 6, amp = r() * 1.5;
        g.fillStyle = r() < 0.6 ? `rgba(60,30,10,${a})` : `rgba(255,240,210,${a})`;
        for (let x = 0; x < w; x += 16) g.fillRect(x, yy + Math.sin(x * 0.03 + ph) * amp, 16, 1);
      }
      if (r() < 0.25) { g.fillStyle = "rgba(60,30,10,0.25)"; g.beginPath(); g.ellipse(r() * w, y + bh / 2, 5, bh * 0.25, 0, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = "rgba(30,15,5,0.45)";
      g.fillRect(0, y, w, 1);
      const j = r() * w;
      g.fillRect(j, y, 1, bh);
      if (r() < joint) g.fillRect((j + w / 2) % w, y, 1, bh);
    }
    specks(g, w, h, r, 1500, 0.06);
  });

/** matt plaster / painted wall (unit ≈ 2 m) */
export const plaster = (base = "#eeebe3", seed = 2) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 22, 0.05, 60);
    specks(g, w, h, r, 5000, 0.05);
    specks(g, w, h, r, 500, 0.08, 2, 1);
  });

/** acoustic ceiling tiles in a light T-bar grid (2×2 tiles, unit 1.2 m) */
export const acoustic = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(9);
    g.fillStyle = "#ecebe6";
    g.fillRect(0, 0, w, h);
    specks(g, w, h, r, 2500, 0.18, 1, 1);
    g.fillStyle = "rgba(60,55,45,0.35)";
    for (let i = 0; i < 700; i++) { const x = r() * w, y = r() * h; g.fillRect(x, y, 1 + r() * 2.5, 1); }
    blotches(g, w, h, r, 6, 0.04, 50);
    const t = w / 2;
    for (const p of [0, t]) {
      g.fillStyle = "#d9d7d0";
      g.fillRect(p, 0, 3, h); g.fillRect(0, p, w, 3);
      g.fillStyle = "rgba(0,0,0,0.18)";
      g.fillRect(p + 3, 0, 1, h); g.fillRect(0, p + 3, w, 1);
    }
  });

type BoardKind = "math" | "eng" | "music" | "lab";
/** green chalkboard (5.2 m × 1.2 m) with Hebrew chalk handwriting, eraser swipes, ghost writing and chalk dust */
export const blackboard = (kind: BoardKind) =>
  makeTex(1024, 256, (g, w, h) => {
    const r = rng(kind.length * 7 + (kind === "math" ? 1 : kind === "lab" ? 5 : 3));
    g.fillStyle = "#2a4434";
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 30, 0.07, 90, "215,228,215");
    blotches(g, w, h, r, 12, 0.08, 60, "10,20,14");
    // eraser swipes: broad back-and-forth strokes of chalk haze
    g.lineCap = "round"; g.lineJoin = "round";
    for (let i = 0; i < 12; i++) {
      g.strokeStyle = `rgba(215,228,215,${0.03 + r() * 0.05})`;
      g.lineWidth = 26 + r() * 26;
      const x0 = r() * w, y0 = 20 + r() * (h - 40), n = 3 + Math.floor(r() * 4), dx = 30 + r() * 50;
      g.beginPath(); g.moveTo(x0, y0);
      for (let s = 1; s <= n; s++) g.lineTo(x0 + (s % 2 ? dx : 0) + (r() - 0.5) * 20, y0 + s * (6 + r() * 10));
      g.stroke();
    }
    // chalk layer on a temp canvas (so we can erode it into chalky grain)
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const c = cv.getContext("2d", { willReadFrequently: true })!;
    const W = "rgba(244,244,236,0.95)", Y = "rgba(250,226,110,0.95)", P = "rgba(250,150,170,0.95)", B = "rgba(140,205,250,0.95)";
    const t = (s: string, xr: number, y: number, size: number, col = W, o: HandOpt = {}) => hand(c, s, xr, y, size, col, r, { jit: 0.7, ...o });
    const ln = (pts: [number, number][], col = W, lw = 2.6) => scrib(c, pts, r, col, lw, 1.2);
    /** chemistry formula: odd parts are subscripts */
    const sub = (parts: string[], x: number, y: number, size: number, col: string) => {
      parts.forEach((p, i) => { x = t(p, x, y + (i % 2 ? size * 0.25 : 0), i % 2 ? size * 0.6 : size, col, { ltr: true, gap: 0.05 }); });
    };
    // ghost of yesterday's lesson, badly erased
    t("להביא מחוגה", 800, 250, 22, W, { alpha: 0.12 }); t("חזרה - שברים", 800, 150, 30, W, { alpha: 0.1 }); t("1/2 + 1/3", 470, 70, 28, W, { alpha: 0.1 });
    // right column: date + duty students (separated by a line)
    t(kind === "eng" ? "כיתה ט'4" : "כיתה ט'3", 1008, 40, 34, Y, { bold: true }); ln([[850, 50], [1008, 49]], Y, 2.4);
    t("יום חמישי", 1004, 86, 26); t("25.9.25", 920, 116, 24, W, { ltr: true });
    t("תורנים:", 1004, 164, 24, Y); t(kind === "eng" ? "דנה" : "תום", 990, 196, 24); t("יוסי", 990, 228, 24);
    ln([[828, 14], [826, 120], [829, 240]], "rgba(244,244,236,0.6)", 2);
    if (kind === "math") {
      t("שיעור מתמטיקה", 800, 44, 42, Y, { bold: true }); ln([[560, 56], [690, 54], [800, 57]], Y, 3);
      let x = t("תרגיל 1:", 800, 96, 30); t("5 + 7 = 12", x - 6, 96, 30, W, { ltr: false });
      x = t("תרגיל 2:", 800, 136, 30); t("3x + 4 = 19", x - 6, 136, 30, B);
      t("3x = 15   →   x = 5", 680, 172, 28, B);
      scrib(c, circ(648, 164, 40, 18, 18, -0.4, Math.PI * 2 - 0.2), r, P, 2.4, 1.5);
      t("לא לשכוח שיעורי בית!", 800, 226, 34, P, { bold: true });
      c.strokeStyle = P; c.lineWidth = 2.4; c.strokeRect(470, 192, 340, 46);
      t("עמ׳ 42, תרגילים 1-6", 455, 100, 26);
      // Pythagoras triangle
      ln([[70, 196], [230, 196], [70, 72], [70, 196]], W, 3);
      ln([[70, 178], [88, 178], [88, 196]], W, 2);
      t("a", 44, 142, 28, W, { ltr: true }); t("b", 140, 226, 28, W, { ltr: true }); t("c", 160, 126, 28, W, { ltr: true });
      t("a² + b² = c²", 250, 240, 30, Y, { ltr: true });
      t("משפט פיתגורס", 300, 44, 30, Y); ln([[140, 54], [300, 53]], Y, 2);
      // small graph
      ln([[340, 200], [452, 200]], W, 2); ln([[356, 212], [356, 124]], W, 2);
      t("x", 452, 214, 20, W, { ltr: true }); t("y", 362, 132, 20, W, { ltr: true });
      const p: [number, number][] = [];
      for (let i = 0; i <= 14; i++) { const xx = -0.5 + i * 0.3; p.push([356 + xx * 20, 196 - (xx - 2) * (xx - 2) * 5 - 6]); }
      scrib(c, p, r, P, 2.4, 0.6);
    } else if (kind === "eng") {
      t("שיעור אנגלית", 800, 44, 42, Y, { bold: true }); ln([[590, 56], [800, 55]], Y, 3);
      t("Lesson 7 - Past Tense", 300, 44, 34, W, { ltr: true });
      t("I played football yesterday.", 300, 94, 30, W, { ltr: true });
      t("She went to Eilat last week.", 300, 136, 30, W, { ltr: true });
      ln([[330, 104], [410, 102]], P, 2.4); ln([[375, 146], [435, 145]], P, 2.4);
      t("go → went   see → saw   eat → ate", 300, 184, 26, B, { ltr: true });
      t("שיעורי בית: עמ׳ 62", 800, 100, 30, P);
      t("בוחן מילים ביום שני!", 800, 150, 30);
      t("לקרוא בקול 3 פעמים", 800, 200, 28, Y); star(c, 820 - 330, 190, 12, Y, r);
    } else if (kind === "music") {
      c.strokeStyle = "rgba(244,244,236,0.85)"; c.lineWidth = 1.6;
      for (const sy of [30, 128]) for (let l = 0; l < 5; l++) ln([[30, sy + l * 13], [800, sy + l * 13 + (r() - 0.5) * 2]], "rgba(244,244,236,0.8)", 1.6);
      const notes = [3, 5, 4, 6, 7, 5, 3, 2, 4, 6, 8, 7, 5, 4, 3, 1, 2, 4, 5, 3];
      c.fillStyle = W;
      notes.forEach((n, i) => {
        for (const sy of [30, 128]) {
          const x = 110 + i * 34, y = sy + 52 - n * 6.5;
          c.beginPath(); c.ellipse(x, y, 7, 5, -0.4, 0, Math.PI * 2); c.fill();
          c.fillRect(x + 5, y - 34, 2, 34);
        }
      });
      for (const sy of [30, 128]) { // hand-drawn treble clef
        const p: [number, number][] = [];
        for (let i = 0; i <= 40; i++) { const a = i * 0.32, d = 3 + i * 0.4; p.push([62 + Math.cos(a) * d * 0.8, sy + 34 + Math.sin(a) * d]); }
        p.push([70, sy - 14], [58, sy - 6], [66, sy + 70], [58, sy + 66]);
        ln(p, W, 2.6);
      }
      t("דו רה מי פה סול לה סי דו", 800, 118, 24, B);
      t("מקהלה - חזרה ביום רביעי", 800, 246, 32, Y);
      t("שיר השבוע: ״בשנה הבאה״", 430, 246, 28, P);
    } else {
      t("שיעור כימיה: חמצון וחיזור", 800, 44, 40, Y, { bold: true }); ln([[430, 56], [800, 55]], Y, 3);
      sub(["2H", "2", " + O", "2", " → 2H", "2", "O"], 520, 104, 34, W);
      sub(["2CuO + C → 2Cu + CO", "2"], 460, 156, 32, B);
      t("חובה להרכיב משקפי מגן!", 800, 222, 34, P, { bold: true }); ln([[470, 232], [800, 234]], P, 2.6);
      // flask on a burner
      ln([[180, 40], [180, 110], [130, 210], [260, 210], [210, 110], [210, 40]], W, 3);
      ln([[150, 170], [240, 170]], B, 2.4);
      ln([[170, 236], [195, 214], [220, 236]], Y, 3);
      t("חימום", 330, 200, 28);
      ln([[320, 190], [270, 205]], W, 2);
    }
    // erode the chalk: grainy strokes
    c.globalCompositeOperation = "destination-out";
    c.fillStyle = "rgba(0,0,0,0.6)";
    for (let i = 0; i < 16000; i++) c.fillRect(r() * w, r() * h, 1 + r(), 1);
    g.globalAlpha = 0.25; g.drawImage(cv, 1, 1); g.globalAlpha = 1; // soft chalk halo
    g.drawImage(cv, 0, 0);
    // smudge where a hand wiped through the writing
    for (let i = 0; i < 3; i++) { g.strokeStyle = "rgba(42,68,52,0.55)"; g.lineWidth = 8 + r() * 8; const x = 100 + r() * 700, y = 40 + r() * 170; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 30 + r() * 30, y + 6); g.stroke(); }
    // chalk dust settling at the bottom (tray) and fingerprints
    const gr = g.createLinearGradient(0, h - 50, 0, h);
    gr.addColorStop(0, "rgba(230,236,228,0)"); gr.addColorStop(1, "rgba(230,236,228,0.22)");
    g.fillStyle = gr; g.fillRect(0, h - 50, w, 50);
    blotches(g, w, h, r, 10, 0.06, 18, "235,240,232");
    specks(g, w, h, r, 3000, 0.12);
  });

/** cork notice board (≈5 m × 1 m) with pinned Hebrew notes, timetable, kids' drawings, tape and pushpins */
export const cork = (seed = 4) =>
  makeTex(1024, 208, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#b98a58";
    g.fillRect(0, 0, w, h);
    specks(g, w, h, r, 16000, 0.25, 1, 1);
    specks(g, w, h, r, 2500, 0.2, 2, 2);
    blotches(g, w, h, r, 10, 0.08, 60);
    // old pin holes + torn paper corners left behind
    for (let i = 0; i < 90; i++) { g.fillStyle = "rgba(40,25,10,0.6)"; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
    for (let i = 0; i < 6; i++) { g.fillStyle = "rgba(245,242,230,0.9)"; const x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 6 + r() * 6, y + r() * 3); g.lineTo(x + r() * 3, y + 5 + r() * 5); g.fill(); }
    const pap = ["#fbfaf4", "#fdf3c8", "#e6f1fb", "#fbe5ec", "#eaf6e2", "#ffffff"];
    const pinC = ["#e33", "#36e", "#fc2", "#2c5", "#f6a", "#fff"];
    type Note = (pw: number, ph: number) => void;
    const x0 = (pw: number) => pw / 2 - 6; // right edge inside note (local coords, centred)
    const notes: [number, number, Note][] = [
      [124, 188, (pw, ph) => { // class list
        hand(g, "רשימת תלמידי ט'3", x0(pw), -ph / 2 + 18, 15, RED, r, { bold: true }); underline(g, -pw / 2 + 10, x0(pw), -ph / 2 + 22, RED, r, 1);
        ["אביב לוי", "גל שמעוני", "דנה כהן", "יוסי אברהם", "מיכל פרץ", "נועה ביטון", "עומר דהן", "שירה מזרחי", "תום קודנר", "אורי גולן"].forEach((n, i) => {
          const y = -ph / 2 + 38 + i * 15;
          const xe = hand(g, `${i + 1}.`, x0(pw), y, 11, BLACK, r, { jit: 0.5 });
          hand(g, n, xe - 2, y, 11, n === "תום קודנר" ? BLUE : BLACK, r, { jit: 0.5, bold: n === "תום קודנר" });
          if (n === "תום קודנר") star(g, -pw / 2 + 14, y - 4, 5, "#e0a010", r);
        });
        hand(g, "המחנכת: מירי", x0(pw), ph / 2 - 6, 11, BLUE, r);
      }],
      [120, 150, (pw, ph) => { // timetable
        hand(g, "מערכת שעות", x0(pw), -ph / 2 + 20, 17, BLUE, r);
        g.strokeStyle = "rgba(40,40,60,0.6)"; g.lineWidth = 1;
        for (let i = 0; i <= 5; i++) { g.beginPath(); g.moveTo(-pw / 2 + 6, -ph / 2 + 30 + i * 21); g.lineTo(pw / 2 - 6, -ph / 2 + 30 + i * 21); g.stroke(); }
        for (let j = 0; j <= 4; j++) { g.beginPath(); g.moveTo(-pw / 2 + 6 + j * 27, -ph / 2 + 30); g.lineTo(-pw / 2 + 6 + j * 27, -ph / 2 + 135); g.stroke(); }
        const cells = ["חשבון", "עברית", "מדעים", "ספורט", "אנגלית", "תנ״ך", "מוזיקה", "חשבון"];
        for (let i = 0; i < 16; i++) hand(g, cells[(i * 3 + 1) % 8], -pw / 2 + 31 + (i % 4) * 27, -ph / 2 + 46 + Math.floor(i / 4) * 21, 7.5, BLACK, r, { jit: 0.4 });
      }],
      [96, 120, (pw, ph) => { // kid drawing: house + sun
        hatch(g, () => { g.beginPath(); g.arc(-pw / 2 + 22, -ph / 2 + 22, 12, 0, Math.PI * 2); }, -pw / 2 + 10, -ph / 2 + 10, 24, 24, "#f5c21a", r, 2);
        hatch(g, () => { g.beginPath(); g.rect(-20, -5, 44, 40); }, -20, -5, 44, 40, "#f08a3a", r, 2);
        hatch(g, () => { g.beginPath(); g.moveTo(-26, -4); g.lineTo(2, -30); g.lineTo(30, -4); g.closePath(); }, -26, -30, 56, 26, "#c82828", r, 2);
        hatch(g, () => { g.beginPath(); g.rect(-pw / 2, 36, pw, 24); }, -pw / 2, 36, pw, 24, "#4cae3a", r, 3, 1.2);
        hand(g, "הבית שלי", x0(pw), ph / 2 - 6, 13, "#c2338a", r);
      }],
      [110, 90, (pw, ph) => { // class trip flyer
        g.fillStyle = "#2a8a4a"; g.fillRect(-pw / 2, -ph / 2, pw, 24);
        hand(g, "טיול שנתי!", x0(pw), -ph / 2 + 18, 18, "#fff", r, { bold: true });
        hand(g, "יום ראשון 8:00", x0(pw), -ph / 2 + 44, 13, BLACK, r); hand(g, "להביא כובע ומים", x0(pw), -ph / 2 + 62, 13, BLACK, r);
        hand(g, "אישור הורים!", x0(pw), -ph / 2 + 82, 13, RED, r);
      }],
      [88, 110, (pw, ph) => { // stick-figure family drawing
        for (const [fx, s, col] of [[-22, 1, "#2a5ad0"], [0, 1.1, "#c2338a"], [22, 0.7, "#e07a2c"]] as [number, number, string][]) {
          scrib(g, circ(fx, -20 * s, 7 * s, 7 * s, 10), r, "#222", 1.4, 0.4);
          scrib(g, [[fx, -13 * s], [fx, 14 * s]], r, col, 2.4, 0.6); scrib(g, [[fx - 10 * s, -4 * s], [fx + 10 * s, -4 * s]], r, col, 2, 0.6);
          scrib(g, [[fx, 14 * s], [fx - 6 * s, 30 * s]], r, "#222", 1.6, 0.5); scrib(g, [[fx, 14 * s], [fx + 6 * s, 30 * s]], r, "#222", 1.6, 0.5);
        }
        hand(g, "המשפחה שלי", x0(pw), -ph / 2 + 16, 13, "#2a5ad0", r);
        heart(g, 30, ph / 2 - 14, 7, "#e33", r, true);
      }],
      [104, 128, (pw, ph) => { // cleaning duty list
        hand(g, "תורנות ניקיון", x0(pw), -ph / 2 + 18, 15, RED, r);
        ["א׳ - דנה ויוסי", "ב׳ - נועה ואיתי", "ג׳ - מיכל ועומר", "ד׳ - שירה ואורי", "ה׳ - כולם!"].forEach((s, i) => hand(g, s, x0(pw), -ph / 2 + 40 + i * 18, 12, BLACK, r));
      }],
      [80, 80, (pw) => { // birthday card
        hand(g, "מזל טוב", x0(pw), -14, 16, "#c2338a", r, { bold: true }); hand(g, "נועה! 10", x0(pw), 6, 14, BLUE, r);
        for (let i = 0; i < 5; i++) { g.fillStyle = ["#e33", "#fc2", "#36e", "#2c5", "#f6a"][i]; g.beginPath(); g.ellipse(-26 + i * 13, 26, 5, 6, 0, 0, Math.PI * 2); g.fill(); }
      }],
      [100, 130, (pw, ph) => { // rainbow + flower drawing
        const cols = ["#e33", "#f80", "#fc2", "#3b3", "#36e", "#839"];
        cols.forEach((cc, i) => scrib(g, circ(0, 10, 40 - i * 5, 34 - i * 5, 18, Math.PI, Math.PI * 2), r, cc, 3.2, 0.5));
        flower(g, -26, 34, 8, "#c2338a", r);
        hand(g, "קשת בענן", x0(pw), ph / 2 - 8, 13, BLACK, r);
      }],
      [96, 70, (pw) => { // note
        hand(g, "מבחן בתנ״ך", x0(pw), -14, 16, BLUE, r); hand(g, "ביום שלישי!!", x0(pw), 8, 15, RED, r); underline(g, -30, 40, 12, RED, r, 1.2);
      }],
      [92, 100, (pw, ph) => { // cat drawing
        scrib(g, circ(0, 8, 20, 17, 16), r, "#555", 2, 0.6);
        scrib(g, [[-18, -2], [-14, -22], [-6, -8]], r, "#555", 2, 0.6); scrib(g, [[18, -2], [14, -22], [6, -8]], r, "#555", 2, 0.6);
        g.fillStyle = "#3a8a4f"; g.fillRect(-9, 2, 4, 4); g.fillRect(6, 2, 4, 4);
        for (const s of [-1, 1]) for (const d of [-3, 3]) scrib(g, [[s * 6, 14 + d * 0.3], [s * 26, 12 + d]], r, "#555", 1, 0.3);
        hand(g, "החתול מיצי", x0(pw), ph / 2 - 8, 13, "#e07a2c", r);
      }],
      [112, 96, (pw, ph) => { // basketball club
        hand(g, "חוג כדורסל", x0(pw), -ph / 2 + 20, 17, "#e07a2c", r, { bold: true });
        hand(g, "ימי ב׳ ו-ד׳ באולם", x0(pw), -ph / 2 + 44, 13, BLACK, r); hand(g, "בשעה 14:30", x0(pw), -ph / 2 + 62, 13, BLACK, r);
        g.fillStyle = "#e07a2c"; g.beginPath(); g.arc(-pw / 2 + 20, ph / 2 - 20, 11, 0, Math.PI * 2); g.fill();
        g.strokeStyle = "#222"; g.lineWidth = 1; g.beginPath(); g.arc(-pw / 2 + 20, ph / 2 - 20, 11, 0, Math.PI * 2); g.moveTo(-pw / 2 + 9, ph / 2 - 20); g.lineTo(-pw / 2 + 31, ph / 2 - 20); g.stroke();
      }],
    ];
    let x = w - 10;
    let ni = 0;
    while (x > 70) {
      const [pw0, ph0, draw] = notes[ni++ % notes.length];
      const pw = pw0 * (0.95 + r() * 0.1), ph = Math.min(h - 20, ph0 * (0.95 + r() * 0.1));
      const y = 8 + r() * (h - ph - 16);
      const cx = x - pw / 2, cy = y + ph / 2;
      g.save();
      g.translate(cx, cy);
      g.rotate((r() - 0.5) * 0.12);
      g.fillStyle = "rgba(0,0,0,0.28)"; g.fillRect(-pw / 2 + 2, -ph / 2 + 3, pw, ph);
      g.fillStyle = pap[Math.floor(r() * pap.length)]; g.fillRect(-pw / 2, -ph / 2, pw, ph);
      // curled / dog-eared corner
      g.fillStyle = "rgba(0,0,0,0.12)"; g.beginPath(); g.moveTo(pw / 2, ph / 2 - 10); g.lineTo(pw / 2 - 10, ph / 2); g.lineTo(pw / 2, ph / 2); g.fill();
      draw(pw, ph);
      if (r() < 0.35) { g.fillStyle = "rgba(250,245,210,0.55)"; g.save(); g.rotate(-0.3); g.fillRect(-12, -ph / 2 - 6, 24, 10); g.restore(); }
      else {
        const pc = pinC[Math.floor(r() * pinC.length)];
        g.fillStyle = "rgba(0,0,0,0.35)"; g.beginPath(); g.arc(1.5, -ph / 2 + 7.5, 4, 0, Math.PI * 2); g.fill();
        g.fillStyle = pc; g.beginPath(); g.arc(0, -ph / 2 + 6, 4, 0, Math.PI * 2); g.fill();
        g.fillStyle = "rgba(255,255,255,0.6)"; g.fillRect(-1.8, -ph / 2 + 3.8, 1.6, 1.6);
      }
      g.restore();
      x -= pw + 8 + r() * 16;
    }
    g.fillStyle = "#8e6a3c"; g.fillRect(0, 0, w, 3); g.fillRect(0, h - 3, w, 3);
  });
/** cream curtain fabric: fine weave + hem */
export const curtain = () =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(11);
    g.fillStyle = "#f1e9d4";
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 2) { g.fillStyle = `rgba(120,100,60,${0.03 + r() * 0.04})`; g.fillRect(x, 0, 1, h); }
    for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(255,255,255,${0.04 + r() * 0.05})`; g.fillRect(0, y, w, 1); }
    specks(g, w, h, r, 800, 0.06);
  });

/** periodic table poster */
export const periodic = () =>
  makeTex(512, 256, (g, w, h) => {
    g.fillStyle = "#f7f5ee";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#1c2a4a";
    g.font = `bold 18px ${PRINT}`;
    g.direction = "rtl"; g.textAlign = "right"; g.fillText("הטבלה המחזורית של היסודות", w - 16, 24); g.direction = "ltr"; g.textAlign = "left";
    g.font = "10px sans-serif";
    g.fillText("PERIODIC TABLE OF THE ELEMENTS", 16, 22);
    const sym = "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn".split(" ");
    const pos: [number, number][] = [];
    pos.push([0, 0], [17, 0]);
    for (const p of [1, 2]) { pos.push([0, p], [1, p]); for (let c = 12; c < 18; c++) pos.push([c, p]); }
    for (const p of [3, 4, 5]) for (let c = 0; c < 18; c++) { if (p === 5 && c === 2) { pos.push([2, 5]); continue; } pos.push([c, p]); }
    const cw = 26, ch = 30, ox = 20, oy = 36;
    const col = (c: number, p: number) => (c === 0 && p > 0 ? "#f4b0a0" : c === 1 ? "#f7d59a" : c >= 2 && c <= 11 ? "#f3e7a2" : c === 17 ? "#b9d8f2" : c === 16 ? "#c9ecc0" : c >= 12 && c + p >= 17 ? "#d8c8ee" : "#bfe6e0");
    pos.forEach(([c, p], i) => {
      if (i >= sym.length) return;
      const x = ox + c * cw, y = oy + p * ch;
      g.fillStyle = i === 0 ? "#f4b0a0" : col(c, p);
      g.fillRect(x, y, cw - 2, ch - 2);
      g.fillStyle = "#222";
      g.font = "bold 11px sans-serif";
      g.fillText(sym[i], x + 4, y + 20);
      g.font = "6px sans-serif";
      g.fillText(String(i + 1), x + 2, y + 7);
    });
    for (let rr = 0; rr < 2; rr++) for (let c = 0; c < 15; c++) { g.fillStyle = rr ? "#f0c8e0" : "#f8d8c0"; g.fillRect(ox + (c + 2) * cw, oy + 6.4 * ch + rr * ch, cw - 2, ch - 2); }
  });

/** 2×2 atlas of school posters: 0 note-values chart, 1 "don't run in the hallway", 2 lab safety, 3 hand washing */
export const posters = () =>
  makeTex(256, 256, (g) => {
    const rt = (t: string, x: number, y: number) => { g.save(); g.direction = "rtl"; g.textAlign = "right"; g.fillText(t, x, y); g.restore(); };
    const cell = (cx: number, cy: number, bg: string, f: (x: number, y: number) => void) => {
      g.fillStyle = bg; g.fillRect(cx * 128, cy * 128, 128, 128);
      g.save(); f(cx * 128, cy * 128); g.restore();
    };
    cell(0, 0, "#fbf7ea", (x, y) => {
      g.fillStyle = "#223"; g.font = `bold 15px ${PRINT}`; rt("תווים ומשכים", x + 118, y + 20);
      for (let i = 0; i < 4; i++) {
        const nx = x + 20 + i * 28, ny = y + 60;
        g.beginPath(); g.ellipse(nx, ny, 6, 4.5, -0.4, 0, Math.PI * 2);
        i === 0 ? (g.lineWidth = 2, g.stroke()) : g.fill();
        if (i > 0) g.fillRect(nx + 5, ny - 26, 1.6, 26);
        if (i > 1) g.fillRect(nx + 5, ny - 26, 8, 3);
        if (i > 2) g.fillRect(nx + 5, ny - 20, 8, 3);
      }
      g.font = `9px ${PRINT}`; rt("שלם  רבע  שמינית  16", x + 124, y + 84);
      g.fillStyle = "#c33"; g.fillRect(x + 10, y + 100, 108, 14); g.fillStyle = "#fff"; rt("מרגישים את הקצב!", x + 110, y + 111);
    });
    cell(1, 0, "#fff3d6", (x, y) => {
      g.fillStyle = "#d93a2b"; g.beginPath(); g.arc(x + 64, y + 54, 34, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(x + 64, y + 54, 27, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#222"; g.beginPath(); g.arc(x + 62, y + 36, 5, 0, Math.PI * 2); g.fill();
      g.fillRect(x + 58, y + 41, 6, 20);
      g.lineWidth = 4; g.strokeStyle = "#222"; g.beginPath(); g.moveTo(x + 61, y + 60); g.lineTo(x + 50, y + 76); g.moveTo(x + 61, y + 60); g.lineTo(x + 72, y + 74); g.moveTo(x + 60, y + 46); g.lineTo(x + 76, y + 52); g.stroke();
      g.strokeStyle = "#d93a2b"; g.lineWidth = 6; g.beginPath(); g.moveTo(x + 42, y + 32); g.lineTo(x + 86, y + 76); g.stroke();
      g.fillStyle = "#222"; g.font = `bold 15px ${PRINT}`; rt("לא רצים במסדרון!", x + 118, y + 112);
    });
    cell(0, 1, "#e9f4fb", (x, y) => {
      g.fillStyle = "#1f5da8"; g.fillRect(x, y, 128, 26);
      g.fillStyle = "#fff"; g.font = `bold 14px ${PRINT}`; rt("כללי בטיחות במעבדה", x + 120, y + 18);
      g.fillStyle = "#223"; g.font = `11px ${PRINT}`;
      ["1. מרכיבים משקפי מגן", "2. לא רצים", "3. זהירות מאש", "4. מסדרים בסוף"].forEach((s, i) => rt(s, x + 118, y + 46 + i * 20));
    });
    cell(1, 1, "#eefbea", (x, y) => {
      g.fillStyle = "#2f9a4e"; g.font = `bold 15px ${PRINT}`; rt("שוטפים ידיים!", x + 112, y + 22);
      g.fillStyle = "#f2c9a6";
      g.beginPath(); g.ellipse(x + 50, y + 70, 18, 26, -0.3, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(x + 78, y + 70, 18, 26, 0.3, 0, Math.PI * 2); g.fill();
      g.fillStyle = "rgba(120,190,255,0.7)";
      for (let i = 0; i < 10; i++) { g.beginPath(); g.arc(x + 30 + i * 8, y + 50 + (i % 3) * 18, 4, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = "#335"; g.font = `10px ${PRINT}`; rt("עם סבון 30 שניות", x + 108, y + 116);
    });
  });

/** piano keyboard (52 white keys) */
export const pianoKeys = () =>
  makeTex(512, 32, (g, w, h) => {
    g.fillStyle = "#f6f3ea";
    g.fillRect(0, 0, w, h);
    const kw = w / 52;
    g.fillStyle = "rgba(0,0,0,0.35)";
    for (let i = 1; i < 52; i++) g.fillRect(Math.round(i * kw), 0, 1, h);
    g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(0, h - 3, w, 3);
  });

/** blue vinyl gym mat with stitched seams */
export const gymMat = (base = "#2a5aa8") =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(6);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 8, 0.08, 30);
    specks(g, w, h, r, 1200, 0.08);
    g.fillStyle = "rgba(0,0,0,0.3)";
    for (const p of [0, 64]) { g.fillRect(p, 0, 2, h); g.fillRect(0, p, w, 2); }
    g.fillStyle = "rgba(255,255,255,0.35)";
    for (let i = 0; i < h; i += 6) { g.fillRect(4, i, 1, 3); g.fillRect(68, i, 1, 3); g.fillRect(i, 4, 3, 1); g.fillRect(i, 68, 3, 1); }
  });

/** basketball: orange pebbled leather with black seams (sphere UV) */
export const basketball = () =>
  makeTex(128, 64, (g, w, h) => {
    const r = rng(8);
    g.fillStyle = "#d86a22";
    g.fillRect(0, 0, w, h);
    specks(g, w, h, r, 2500, 0.15);
    g.fillStyle = "#1b120c";
    g.fillRect(0, h / 2 - 1, w, 2);
    for (const x of [0, w / 4, w / 2, (3 * w) / 4]) g.fillRect(x, 0, 2, h);
  });
/** volleyball: curved yellow / blue / white panels */
export const volleyball = () =>
  makeTex(128, 64, (g, w, h) => {
    const cols = ["#f4f4f0", "#f2c623", "#1f4fb4"];
    for (let i = 0; i < 6; i++) { g.fillStyle = cols[i % 3]; g.beginPath(); g.moveTo(0, (i * h) / 6); for (let x = 0; x <= w; x += 8) g.lineTo(x, (i * h) / 6 + Math.sin(x * 0.1) * 3); g.lineTo(w, h); g.lineTo(0, h); g.fill(); }
  });

/** diamond mesh (basketball net / wire mesh), transparent background */
export const netTex = () =>
  makeTex(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = "#f4f4f4";
    g.lineWidth = 3;
    for (let i = -w; i < w * 2; i += 16) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke();
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i - h, h); g.stroke();
    }
  });

/** grey granite entrance tiles (2×2 tiles, unit 0.8 m) */
export const granite = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(12);
    const t = w / 2;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { g.fillStyle = shade("#8c8b87", 0.94 + r() * 0.1); g.fillRect(i * t, j * t, t, t); }
    specks(g, w, h, r, 9000, 0.3, 1, 1);
    specks(g, w, h, r, 1600, 0.35, 2, 2);
    g.fillStyle = "rgba(20,20,20,0.5)";
    g.fillRect(0, 0, w, 2); g.fillRect(0, t, w, 2); g.fillRect(0, 0, 2, h); g.fillRect(t, 0, 2, h);
  });

/** schoolyard sand */
export const sand = () =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(14);
    g.fillStyle = "#b9a07a";
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 10, 0.08, 25);
    specks(g, w, h, r, 2500, 0.2, 1, 1);
    specks(g, w, h, r, 250, 0.25, 2, 2);
  });
/** lawn grass */
export const grass = () =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(15);
    g.fillStyle = "#58793a";
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 10, 0.1, 20);
    for (let i = 0; i < 1400; i++) { g.fillStyle = r() < 0.5 ? "rgba(140,180,80,0.5)" : "rgba(30,50,20,0.5)"; g.fillRect(r() * w, r() * h, 1, 2 + r() * 3); }
  });

/** wall clock face */
export const clockFace = () =>
  makeTex(128, 128, (g, w) => {
    const c = w / 2;
    g.fillStyle = "#fbfbf7"; g.fillRect(0, 0, w, w);
    g.fillStyle = "#222";
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2, L = i % 5 ? 4 : 10;
      g.save(); g.translate(c, c); g.rotate(a); g.fillRect(-(i % 5 ? 0.8 : 2), -58, i % 5 ? 1.6 : 4, L); g.restore();
    }
    g.font = "bold 14px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    for (let i = 1; i <= 12; i++) { const a = (i / 12) * Math.PI * 2; g.fillText(String(i), c + Math.sin(a) * 38, c - Math.cos(a) * 38); }
    g.lineCap = "round";
    const hand = (a: number, L: number, lw: number, col = "#222") => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.sin(a) * L, c - Math.cos(a) * L); g.stroke(); };
    hand(((3 + 25 / 60) / 12) * Math.PI * 2, 28, 5);
    hand((25 / 60) * Math.PI * 2, 44, 3.5);
    hand((41 / 60) * Math.PI * 2, 48, 1.4, "#c22");
  });

/** green emergency exit sign */
export const exitSign = () =>
  makeTex(128, 64, (g, w, h) => {
    g.fillStyle = "#1c9a4c"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#f4fff6"; g.fillRect(6, 6, 48, h - 12);
    g.fillStyle = "#1c9a4c"; g.beginPath(); g.arc(34, 18, 5, 0, Math.PI * 2); g.fill();
    g.lineWidth = 5; g.strokeStyle = "#1c9a4c"; g.lineCap = "round";
    g.beginPath(); g.moveTo(32, 26); g.lineTo(26, 40); g.lineTo(18, 48); g.moveTo(26, 40); g.lineTo(34, 48); g.moveTo(30, 30); g.lineTo(40, 34); g.moveTo(30, 30); g.lineTo(20, 32); g.stroke();
    g.fillStyle = "#f4fff6"; g.font = `bold 20px ${JP}`; g.fillText("非常口", 58, 40);
  });

/** wood grain for furniture (along U) */
export const grain = (base: string, seed = 3) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let l = 0; l < 70; l++) {
      const yy = r() * h, a = 0.03 + r() * 0.09, ph = r() * 6, amp = 1 + r() * 4;
      g.fillStyle = r() < 0.65 ? `rgba(70,35,10,${a})` : `rgba(255,240,210,${a})`;
      const th = 1 + r() * 2;
      for (let x = 0; x < w; x += 8) g.fillRect(x, yy + Math.sin(x * 0.025 + ph) * amp, 8, th);
    }
    specks(g, w, h, r, 1500, 0.05);
  });

/** simple printed book cover / notebook atlas: 4 columns of colours with a title band */
export const covers = () =>
  makeTex(256, 64, (g, w, h) => {
    const cols = ["#2d5aa0", "#c43d3d", "#3a8a4f", "#e7c23a", "#7b4ba6", "#e07a2c", "#2f9ab0", "#f2f0e8"];
    cols.forEach((c, i) => {
      const x = i * 32;
      g.fillStyle = c; g.fillRect(x, 0, 32, h);
      g.fillStyle = "rgba(255,255,255,0.85)"; g.fillRect(x + 5, 10, 22, 12);
      g.fillStyle = "rgba(0,0,0,0.5)"; g.fillRect(x + 8, 14, 16, 2); g.fillRect(x + 8, 18, 10, 2);
      g.fillStyle = "rgba(0,0,0,0.2)"; g.fillRect(x, 0, 2, h);
    });
  });

// =====================================================================================================
// Hebrew handwriting, papers, desk graffiti, chalk, dirt decals
// =====================================================================================================
export const HEB = `"Gveret Levin", "Amatic SC", "Karantina", cursive`;
const PRINT = `"Noto Sans Hebrew", sans-serif`;
const HAS_HEB = /[֐-׿]/;
type HandOpt = { rot?: number; jit?: number; alpha?: number; font?: string; bold?: boolean; gap?: number; ltr?: boolean };

/** handwritten line. RTL (default): words laid right→left from xr, right-aligned. ltr: left→right from xr.
 *  Per-word baseline / rotation / ink jitter. Returns the far x of the line. */
export function hand(g: G, s: string, xr: number, y: number, size: number, col: string, r: () => number, o: HandOpt = {}) {
  const jit = o.jit ?? 1;
  g.save();
  g.font = `${o.bold ? "bold " : ""}${size}px ${o.font ?? HEB}`;
  g.fillStyle = col;
  g.textBaseline = "alphabetic";
  const base = o.rot ?? 0;
  const dir = o.ltr ? 1 : -1;
  let x = xr, yy = y;
  // RTL line: keep runs of non-Hebrew tokens (numbers, formulas) together so they read left→right
  const toks: string[] = [];
  for (const w of s.split(/ +/)) {
    const last = toks[toks.length - 1];
    if (!o.ltr && w && last && !HAS_HEB.test(w) && !HAS_HEB.test(last)) toks[toks.length - 1] = last + " " + w;
    else toks.push(w);
  }
  if (!o.ltr) for (let i = 0; i < toks.length; i++) { const m = /^([^\u0590-\u05FF]*?)([:.,!?]+)$/.exec(toks[i]); if (m && m[1] && !HAS_HEB.test(toks[i])) toks[i] = m[2] + m[1]; }
  for (const w of toks) {
    if (!w) { x += dir * size * 0.3; continue; }
    const heb = HAS_HEB.test(w);
    g.direction = heb ? "rtl" : "ltr";
    g.textAlign = o.ltr ? "left" : "right";
    const ww = g.measureText(w).width;
    g.save();
    g.translate(x, yy + (r() - 0.5) * size * 0.16 * jit);
    g.rotate(base + (r() - 0.5) * 0.1 * jit);
    g.globalAlpha = (o.alpha ?? 0.92) * (0.82 + r() * 0.18);
    g.fillText(w, 0, 0);
    g.restore();
    const adv = ww + size * (o.gap ?? 0.3) * (0.8 + r() * 0.5);
    x += dir * adv;
    yy += dir * adv * Math.sin(base);
  }
  g.restore();
  return x;
}
/** draws non-Hebrew text strictly left→right glyph by glyph (no bidi reordering / mirroring) */
function ltrText(g: G, s: string, x: number, y: number) {
  for (const ch of s) { g.fillText(ch, x, y); x += g.measureText(ch).width; }
}
/** wobbly hand-drawn polyline */
function scrib(g: G, pts: [number, number][], r: () => number, col: string, lw: number, j = 0.8, close = false) {
  g.strokeStyle = col; g.lineWidth = lw; g.lineCap = "round"; g.lineJoin = "round";
  g.beginPath();
  pts.forEach(([x, y], i) => { const px = x + (r() - 0.5) * j, py = y + (r() - 0.5) * j; i ? g.lineTo(px, py) : g.moveTo(px, py); });
  if (close) g.closePath();
  g.stroke();
}
function circ(cx: number, cy: number, rx: number, ry: number, n = 18, a0 = 0, a1 = Math.PI * 2): [number, number][] {
  const p: [number, number][] = [];
  for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  return p;
}
function check(g: G, x: number, y: number, s: number, col: string, r: () => number) { scrib(g, [[x, y], [x + s * 0.35, y + s * 0.4], [x + s, y - s * 0.55]], r, col, Math.max(1.5, s * 0.14), 1); }
function cross(g: G, x: number, y: number, s: number, col: string, r: () => number) { scrib(g, [[x, y], [x + s, y + s]], r, col, 2, 1); scrib(g, [[x + s, y], [x, y + s]], r, col, 2, 1); }
function heart(g: G, x: number, y: number, s: number, col: string, r: () => number, fill = false) {
  const p: [number, number][] = [];
  for (let i = 0; i <= 20; i++) { const t = (i / 20) * Math.PI * 2; p.push([x + s * 0.06 * 16 * Math.sin(t) ** 3, y - s * 0.06 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]); }
  if (fill) { g.fillStyle = col; g.beginPath(); p.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); g.fill(); }
  else scrib(g, p, r, col, Math.max(1.2, s * 0.1), 0.6);
}
function star(g: G, x: number, y: number, s: number, col: string, r: () => number) {
  const p: [number, number][] = [];
  for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + i * ((Math.PI * 4) / 5); p.push([x + Math.cos(a) * s, y + Math.sin(a) * s]); }
  scrib(g, p, r, col, Math.max(1.2, s * 0.12), 0.8);
}
function smiley(g: G, x: number, y: number, s: number, col: string, r: () => number) {
  scrib(g, circ(x, y, s, s, 20), r, col, Math.max(1.3, s * 0.1), 0.6);
  g.fillStyle = col; g.fillRect(x - s * 0.4, y - s * 0.35, s * 0.16, s * 0.25); g.fillRect(x + s * 0.25, y - s * 0.35, s * 0.16, s * 0.25);
  scrib(g, circ(x, y + s * 0.05, s * 0.55, s * 0.45, 10, 0.3, Math.PI - 0.3), r, col, Math.max(1.2, s * 0.1), 0.4);
}
function spiral(g: G, x: number, y: number, s: number, col: string, r: () => number) {
  const p: [number, number][] = [];
  for (let i = 0; i < 40; i++) { const a = i * 0.45, d = (i / 40) * s; p.push([x + Math.cos(a) * d, y + Math.sin(a) * d]); }
  scrib(g, p, r, col, 1.3, 0.4);
}
function flower(g: G, x: number, y: number, s: number, col: string, r: () => number) {
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; scrib(g, circ(x + Math.cos(a) * s * 0.55, y + Math.sin(a) * s * 0.55, s * 0.35, s * 0.35, 10), r, col, 1.3, 0.4); }
  scrib(g, circ(x, y, s * 0.22, s * 0.22, 8), r, col, 1.3, 0.3);
  scrib(g, [[x, y + s * 0.9], [x + s * 0.1, y + s * 2.2]], r, col, 1.3, 0.5);
}
function underline(g: G, x1: number, x2: number, y: number, col: string, r: () => number, lw = 1.5, wavy = false) {
  const p: [number, number][] = [];
  for (let x = x1; x <= x2; x += 6) p.push([x, y + (wavy ? Math.sin(x * 0.25) * 2 : 0) + (r() - 0.5)]);
  scrib(g, p, r, col, lw, 0.6);
}
/** crayon/marker hatch fill inside a path */
function hatch(g: G, path: () => void, x: number, y: number, w: number, h: number, col: string, r: () => number, lw = 3, ang = 0.6) {
  g.save(); path(); g.clip();
  g.strokeStyle = col; g.lineWidth = lw; g.globalAlpha = 0.8;
  const d = Math.max(w, h) * 1.5;
  for (let t = -d; t < d; t += lw * 0.9) {
    g.beginPath();
    g.moveTo(x + w / 2 + t - Math.cos(ang) * d, y + h / 2 - Math.sin(ang) * d + (r() - 0.5) * 3);
    g.lineTo(x + w / 2 + t + Math.cos(ang) * d, y + h / 2 + Math.sin(ang) * d);
    g.stroke();
  }
  g.restore();
}
function paperBase(g: G, w: number, h: number, r: () => number, tone = "#f8f6ee") {
  g.fillStyle = tone; g.fillRect(0, 0, w, h);
  blotches(g, w, h, r, 6, 0.035, 60, "120,100,60");
  specks(g, w, h, r, 900, 0.035);
}
function ruled(g: G, w: number, h: number, top: number, gap: number, margin = true, col = "rgba(90,140,200,0.45)") {
  g.fillStyle = col;
  for (let y = top; y < h - 8; y += gap) g.fillRect(0, Math.round(y), w, 1);
  if (margin) { g.fillStyle = "rgba(220,70,80,0.55)"; g.fillRect(w - 44, 0, 1.4, h); }
}
function grid(g: G, w: number, h: number, s: number) {
  g.fillStyle = "rgba(90,140,190,0.28)";
  for (let y = 0; y < h; y += s) g.fillRect(0, y, w, 1);
  for (let x = 0; x < w; x += s) g.fillRect(x, 0, 1, h);
}
function crease(g: G, w: number, h: number, y: number) {
  const gr = g.createLinearGradient(0, y - 4, 0, y + 4);
  gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.45, "rgba(0,0,0,0.07)"); gr.addColorStop(0.55, "rgba(255,255,255,0.35)"); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.fillRect(0, y - 4, w, 8);
}
function tornRight(g: G, w: number, h: number, r: () => number) {
  // spiral-notebook tear on the right (binding side of a Hebrew notebook)
  g.fillStyle = "rgba(0,0,0,0)";
  g.save(); g.globalCompositeOperation = "destination-out";
  g.beginPath(); g.moveTo(w, 0);
  for (let y = 0; y <= h; y += 4) g.lineTo(w - 3 - r() * 4 - (y % 16 < 4 ? 3 : 0), y);
  g.lineTo(w, h); g.closePath(); g.fill();
  g.restore();
  g.fillStyle = "rgba(140,130,110,0.25)";
  for (let y = 8; y < h; y += 16) g.fillRect(w - 16, y, 5, 5);
}

const BLUE = "#1d3f9a", BLACK = "#1b1b22", PENCIL = "rgba(70,70,76,0.8)", RED = "#d0202a", PINK = "#c2338a", GREEN = "#1f7a3a";
/** a sheet of paper with Hebrew handwriting. 0 math homework · 1 reading test · 2 history notes · 3 kid's drawing ·
 *  4 squared maths (pencil) · 5 note to a friend · 6 dictation */
export const paper = (kind: number) =>
  makeTex(320, 448, (g, w, h) => {
    const r = rng(101 + kind * 17);
    const R = w - 54; // text right edge (margin on the right)
    if (kind === 0) {
      paperBase(g, w, h, r); ruled(g, w, h, 92, 26); tornRight(g, w, h, r);
      hand(g, "שם: תום קודנר  כיתה: ט'3", R, 30, 19, BLUE, r); hand(g, "25.9", 70, 30, 17, BLUE, r, { ltr: true });
      hand(g, "שיעורי בית - מתמטיקה", R - 10, 70, 24, BLUE, r); underline(g, 60, R - 10, 76, BLUE, r);
      const ex = ["5 + 7 = 12", "9 + 8 = 17", "24 - 9 = 15", "6 × 7 = 42", "56 : 8 = 7", "13 + 29 = 41", "100 - 37 = 63"];
      ex.forEach((e, i) => {
        const y = 113 + i * 26 * 1.5;
        const xe = hand(g, `תרגיל ${i + 1}:`, R, y, 19, BLUE, r);
        hand(g, e, xe - 4, y, 19, BLUE, r, { ltr: false });
        if (i === 5) { cross(g, 22, y - 14, 12, RED, r); hand(g, "42", 48, y + 16, 16, RED, r, { ltr: true }); }
        else check(g, 20, y - 6, 16, RED, r);
      });
      // grade
      scrib(g, circ(62, 404, 40, 26, 22, -0.3, Math.PI * 2 + 0.2), r, RED, 2.2, 1);
      hand(g, "95", 44, 414, 30, RED, r, { ltr: true, bold: true });
      hand(g, "כל הכבוד!", 230, 420, 22, RED, r); smiley(g, 250, 400, 11, RED, r);
    } else if (kind === 1) {
      // maths test - Tom Kodner, 9th grade class 3 - 100
      paperBase(g, w, h, r, "#f9f9f5");
      g.fillStyle = "#222"; g.font = `bold 20px ${PRINT}`; g.direction = "rtl"; g.textAlign = "right";
      g.fillText("מבחן במתמטיקה", w - 20, 34);
      g.font = `12px ${PRINT}`; g.fillText("שם: ____________   כיתה: ______", w - 20, 58);
      g.strokeStyle = "#333"; g.lineWidth = 1; g.strokeRect(12, 12, w - 24, 56);
      hand(g, "תום קודנר", w - 50, 55, 18, BLUE, r); hand(g, "ט'3", 128, 55, 18, BLUE, r);
      const q = ["1. פתור את המשוואה: 2x + 6 = 20", "2. חשב: (3 + 5) × 4", "3. מצא את היתר במשולש ישר זווית", "4. פשט: 3a + 2b - a + 4b"];
      const a = ["2x = 14  →  x = 7", "8 × 4 = 32", "6² + 8² = 100  →  c = 10", "2a + 6b"];
      q.forEach((t, i) => {
        const y = 100 + i * 82;
        g.fillStyle = "#222"; g.font = `13px ${PRINT}`; g.direction = "rtl"; g.textAlign = "right";
        const [heb, fx] = t.split(": ");
        g.fillText(heb + ":", w - 20, y);
        if (fx) { const hw = g.measureText(heb + ":").width; g.save(); g.direction = "ltr"; g.textAlign = "left"; ltrText(g, fx, w - 26 - hw - g.measureText(fx).width, y); g.restore(); }
        g.fillStyle = "rgba(0,0,0,0.35)"; for (let l = 0; l < 2; l++) g.fillRect(20, y + 24 + l * 24, w - 40, 1);
        hand(g, a[i], w - 60, y + 24, 19, BLUE, r, { rot: -0.01 });
        check(g, 18, y + 12, 16, RED, r); hand(g, "25/25", 70, y + 52, 13, RED, r, { ltr: true });
      });
      scrib(g, circ(60, 408, 44, 28, 22, -0.3, Math.PI * 2 + 0.2), r, RED, 2.4, 1);
      hand(g, "100", 32, 420, 32, RED, r, { ltr: true, bold: true });
      hand(g, "מצוין תום!", w - 30, 414, 24, RED, r); star(g, 150, 400, 10, RED, r); star(g, 128, 420, 7, RED, r);
    } else if (kind === 2) {
      paperBase(g, w, h, r); ruled(g, w, h, 70, 24);
      hand(g, "תום ק. ט'3", R, 22, 15, BLACK, r); hand(g, "סיכום - היסטוריה", R, 52, 25, BLACK, r); underline(g, 110, R, 58, BLACK, r, 1.8, true);
      const L = ["• המהפכה התעשייתית התחילה", "  באנגליה במאה ה-18", "• המצאת מכונת הקיטור", "• אנשים עברו מהכפר לעיר", "• עבודה במפעלים - גם ילדים!", "• רכבות ופסי ברזל", "לשאול את המורה על המבחן"];
      L.forEach((s, i) => hand(g, s, R - (s.startsWith("  ") ? 14 : 0), 88 + i * 24 * 1.5, 18, BLACK, r));
      g.fillStyle = BLACK; g.fillRect(90, 88 + 3 * 36 - 7, 70, 1.6); // crossed-out word
      g.fillRect(92, 88 + 3 * 36 - 4, 66, 1.4);
      flower(g, 34, 120, 12, BLUE, r); star(g, 30, 220, 11, BLACK, r); spiral(g, 34, 300, 14, BLUE, r);
      heart(g, 36, 380, 16, RED, r); hand(g, "ד+י", 50, 386, 14, RED, r, { ltr: false });
      // cube doodle
      scrib(g, [[240, 380], [280, 380], [280, 420], [240, 420], [240, 380], [256, 366], [296, 366], [280, 380]], r, BLACK, 1.2, 0.5);
      scrib(g, [[296, 366], [296, 406], [280, 420]], r, BLACK, 1.2, 0.5);
    } else if (kind === 3) {
      paperBase(g, w, h, r, "#fcfbf7");
      const sky = () => { g.beginPath(); g.rect(0, 0, w, 250); };
      hatch(g, sky, 0, 0, w, 250, "rgba(120,180,240,0.35)", r, 5, 0.1);
      // sun
      hatch(g, () => { g.beginPath(); g.arc(50, 50, 30, 0, Math.PI * 2); }, 20, 20, 60, 60, "#f5c21a", r, 3);
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; scrib(g, [[50 + Math.cos(a) * 36, 50 + Math.sin(a) * 36], [50 + Math.cos(a) * 52, 50 + Math.sin(a) * 52]], r, "#f0a010", 3, 1.5); }
      // cloud
      for (const [cx, cy] of [[200, 50], [222, 42], [244, 52]]) hatch(g, () => { g.beginPath(); g.arc(cx, cy, 16, 0, Math.PI * 2); }, cx - 16, cy - 16, 32, 32, "rgba(255,255,255,0.9)", r, 3);
      // grass
      hatch(g, () => { g.beginPath(); g.rect(0, 330, w, 118); }, 0, 330, w, 118, "#4cae3a", r, 4, 1.2);
      for (let x = 4; x < w; x += 7) scrib(g, [[x, 334], [x + 3, 318 - r() * 8]], r, "#2f8a28", 2, 1);
      // house
      hatch(g, () => { g.beginPath(); g.rect(150, 230, 120, 105); }, 150, 230, 120, 105, "#f08a3a", r, 3);
      hatch(g, () => { g.beginPath(); g.moveTo(140, 232); g.lineTo(210, 170); g.lineTo(280, 232); g.closePath(); }, 140, 170, 140, 62, "#c82828", r, 3);
      hatch(g, () => { g.beginPath(); g.rect(195, 280, 30, 55); }, 195, 280, 30, 55, "#6a3a1a", r, 3);
      hatch(g, () => { g.beginPath(); g.rect(160, 248, 26, 24); }, 160, 248, 26, 24, "#7fc8f0", r, 2);
      scrib(g, [[150, 230], [270, 230], [270, 335], [150, 335], [150, 230]], r, "#222", 2, 1.5);
      // two stick figures
      for (const [fx, s, col] of [[70, 1.1, "#c2338a"], [110, 0.75, "#2a5ad0"]] as [number, number, string][]) {
        scrib(g, circ(fx, 262 - 20 * s, 12 * s, 12 * s, 14), r, "#222", 2, 0.8);
        hatch(g, () => { g.beginPath(); g.moveTo(fx, 262 - 8 * s); g.lineTo(fx - 16 * s, 262 + 40 * s); g.lineTo(fx + 16 * s, 262 + 40 * s); g.closePath(); }, fx - 16, 250, 32, 60, col, r, 3);
        scrib(g, [[fx - 22 * s, 262 + 6 * s], [fx, 262], [fx + 22 * s, 262 + 6 * s]], r, "#222", 2, 1);
        scrib(g, [[fx - 7 * s, 262 + 40 * s], [fx - 9 * s, 262 + 64 * s]], r, "#222", 2, 1);
        scrib(g, [[fx + 7 * s, 262 + 40 * s], [fx + 9 * s, 262 + 64 * s]], r, "#222", 2, 1);
      }
      hand(g, "אמא ואני", w - 20, 130, 30, "#c2338a", r, { bold: true });
      hand(g, "יובל, כיתה ב׳", w - 14, 432, 18, "#222", r);
    } else if (kind === 4) {
      paperBase(g, w, h, r, "#f7f7f2"); grid(g, w, h, 16);
      hand(g, "תרגול - תום", R + 20, 34, 22, PENCIL, r);
      const col = (x: number, y: number, a: string, b: string, op: string, res: string) => {
        hand(g, a, x, y, 20, PENCIL, r, { ltr: true, gap: 0.1 }); hand(g, op + " " + b, x - 14, y + 22, 20, PENCIL, r, { ltr: true, gap: 0.1 });
        g.fillStyle = PENCIL; g.fillRect(x - 16, y + 30, 58, 1.8);
        hand(g, res, x, y + 52, 20, PENCIL, r, { ltr: true, gap: 0.1 });
      };
      col(210, 80, "347", "285", "+", "632"); col(90, 80, "905", "468", "-", "437"); col(210, 200, "63", "12", "×", "756");
      hand(g, "1/2 + 1/4 = 3/4", 40, 214, 19, PENCIL, r, { ltr: true });
      hand(g, "2/3 = 4/6", 40, 244, 19, PENCIL, r, { ltr: true });
      // ruler triangle
      g.strokeStyle = PENCIL; g.lineWidth = 1.3; g.beginPath(); g.moveTo(60, 400); g.lineTo(200, 400); g.lineTo(60, 300); g.closePath(); g.stroke();
      g.strokeRect(60, 388, 12, 12);
      hand(g, "5 ס״מ", 150, 420, 15, PENCIL, r); hand(g, "?", 150, 344, 20, PENCIL, r);
      hand(g, "לבדוק!", R + 10, 400, 18, PENCIL, r, { rot: -0.15 });
      blotches(g, w, h, r, 4, 0.06, 26, "80,80,80"); // eraser smudges
    } else if (kind === 5) {
      paperBase(g, w, h, r, "#fbf6ea"); ruled(g, w, h, 60, 28, false, "rgba(170,120,200,0.35)");
      crease(g, w, h, h / 2); g.save(); g.translate(w / 2, 0); g.rotate(0); g.fillStyle = "rgba(0,0,0,0.04)"; g.fillRect(-1, 0, 2, h); g.restore();
      hand(g, "תום!!", w - 20, 50, 30, PINK, r, { bold: true });
      hand(g, "אל תשכח את", w - 24, 110, 22, PINK, r); hand(g, "השיעורי בית!", w - 24, 140, 22, PINK, r);
      hand(g, "באים אליי אחרי בית הספר?", w - 24, 190, 18, PINK, r);
      hand(g, "כן", w - 50, 230, 22, PINK, r); g.strokeStyle = PINK; g.lineWidth = 1.6; g.strokeRect(w - 94, 212, 22, 22); hand(g, "לא", w - 150, 230, 22, PINK, r); g.strokeRect(w - 200, 212, 22, 22);
      check(g, w - 92, 226, 20, BLUE, r);
      hand(g, "(תסמן!)", w - 30, 270, 18, PINK, r);
      hand(g, "ותביא את המחברת מחר", w - 24, 310, 18, PINK, r);
      hand(g, "ממני, נועה", w - 60, 380, 22, PINK, r);
      heart(g, 70, 370, 22, PINK, r, true); heart(g, 110, 330, 12, PINK, r); heart(g, 40, 300, 10, RED, r); star(g, 60, 90, 10, PINK, r);
    } else if (kind === 8) {
      paperBase(g, w, h, r, "#f9f9f5");
      g.fillStyle = "#222"; g.font = `bold 20px ${PRINT}`; g.direction = "rtl"; g.textAlign = "right";
      g.fillText("מבחן בהבנת הנקרא", w - 20, 34);
      g.font = `12px ${PRINT}`; g.fillText("שם: ____________   כיתה: ______", w - 20, 58);
      g.strokeStyle = "#333"; g.lineWidth = 1; g.strokeRect(12, 12, w - 24, 56);
      hand(g, "איתי", w - 60, 55, 17, PENCIL, r); hand(g, "ה׳ 2", 110, 55, 16, PENCIL, r);
      const q = ["1. לאן הלכה הילדה בבוקר?", "2. מה מצא הכלב ליד העץ?", "3. למה הילדה הייתה עצובה?", "4. מה לדעתך יקרה בסוף?"];
      const a = ["היא הלכה אל היער עם הכלב שלה.", "הוא מצא קופסה ישנה.", "כי היא איבדה את הכובע.", "אני חושב שהם ימצאו את הדרך."];
      q.forEach((s, i) => {
        const y = 100 + i * 82;
        g.fillStyle = "#222"; g.font = `13px ${PRINT}`; g.direction = "rtl"; g.textAlign = "right"; g.fillText(s, w - 20, y);
        g.fillStyle = "rgba(0,0,0,0.35)"; for (let l = 0; l < 2; l++) g.fillRect(20, y + 24 + l * 24, w - 40, 1);
        hand(g, a[i], w - 26, y + 22, 17, PENCIL, r, { rot: -0.01 });
        if (i === 2) { underline(g, 150, 240, y + 26, RED, r, 1.6); hand(g, "?", 130, y + 24, 20, RED, r); }
        else check(g, 18, y + 12, 14, RED, r);
      });
      g.fillStyle = "rgba(90,90,90,0.12)"; g.beginPath(); g.ellipse(210, 280, 30, 8, 0.2, 0, Math.PI * 2); g.fill(); // erased spot
      hand(g, "78", 34, 430, 34, RED, r, { ltr: true, bold: true });
      hand(g, "יש מקום לשיפור", w - 30, 430, 20, RED, r);
    } else if (kind === 7) {
      // photocopied sheet music with pencil notes
      paperBase(g, w, h, r, "#f4f3ee");
      g.fillStyle = "#222"; g.font = `bold 20px ${PRINT}`; g.direction = "rtl"; g.textAlign = "right"; g.fillText("שיר השבוע - מקהלה", w - 20, 36);
      g.font = `11px ${PRINT}`; g.fillText("קול ראשון / קול שני", w - 20, 54); g.direction = "ltr"; g.textAlign = "left";
      for (let st = 0; st < 7; st++) {
        const y0 = 80 + st * 52;
        g.fillStyle = "#333"; for (let l = 0; l < 5; l++) g.fillRect(16, y0 + l * 6, w - 32, 1);
        for (let n = 0; n < 12; n++) { const x = 40 + n * 22 + (r() - 0.5) * 3, y = y0 + 24 - Math.floor(r() * 9) * 3; g.beginPath(); g.ellipse(x, y, 3.6, 2.6, -0.4, 0, Math.PI * 2); g.fill(); g.fillRect(x + 3, y - 16, 1, 16); }
        g.fillStyle = "#555"; g.font = `9px ${PRINT}`; g.direction = "rtl"; g.textAlign = "right"; g.fillText(["לה לה לה, לה לה לה", "דו רה מי, מי רה דו", "לה לה לה לה לה", "פזמון: פעמיים"][st % 4], w - 20, y0 + 42); g.direction = "ltr"; g.textAlign = "left";
      }
      hand(g, "לנשום כאן!", 150, 128, 16, PENCIL, r, { rot: -0.1 }); scrib(g, circ(200, 180, 30, 12, 16), r, PENCIL, 1.3, 0.8);
      hand(g, "p", 60, 240, 20, PENCIL, r, { ltr: true }); hand(g, "f", 240, 344, 22, PENCIL, r, { ltr: true });
    } else {
      paperBase(g, w, h, r); ruled(g, w, h, 90, 30); tornRight(g, w, h, r);
      hand(g, "תום קודנר", 150, 30, 16, BLUE, r); hand(g, "הכתבה", R - 60, 56, 30, BLUE, r); underline(g, 150, R - 50, 62, BLUE, r, 1.6);
      const words = ["שולחן", "מחברת", "עיפרון", "חלון", "ילדים", "ספריה", "כדור", "שמש", "תלמידה", "חבר"];
      words.forEach((s, i) => {
        const y = 116 + i * 30;
        const xe = hand(g, `${i + 1}.`, R, y, 18, BLUE, r);
        hand(g, i === 5 ? "סיפריה" : i === 8 ? "תלמדה" : s, xe - 8, y, 20, BLUE, r);
        if (i === 5 || i === 8) { g.fillStyle = RED; g.fillRect(xe - 90, y - 8, 76, 1.8); hand(g, s, xe - 104, y - 2, 18, RED, r); }
        else check(g, 30, y - 6, 12, RED, r);
      });
      hand(g, "8/10", 40, 60, 26, RED, r, { ltr: true, bold: true });
      hand(g, "טוב מאוד!", 150, 440, 20, RED, r);
    }
  });

/** exercise-book covers atlas: 4×2 covers (128×180 each) with a Hebrew label (subject + name) */
export const notebooks = () =>
  makeTex(512, 360, (g) => {
    const r = rng(77);
    const cols = ["#2d5aa0", "#c43d3d", "#3a8a4f", "#e7b93a", "#7b4ba6", "#e07a2c", "#2f9ab0", "#d8d4c6"];
    const subj = ["מתמטיקה", "עברית", "מדעים", "תנ״ך", "אנגלית", "היסטוריה", "גאוגרפיה", "ספרות"];
    const names = ["תום קודנר", "תום קודנר", "נועה", "תום קודנר", "מיכל", "תום קודנר", "שירה", "אורי"];
    for (let i = 0; i < 8; i++) {
      const x = (i % 4) * 128, y = Math.floor(i / 4) * 180;
      g.fillStyle = cols[i]; g.fillRect(x, y, 128, 180);
      blotches(g, 128, 180, r, 4, 0.08, 40); // (tile-local blotches land anywhere; cheap wear)
      g.fillStyle = "rgba(0,0,0,0.18)"; g.fillRect(x + 118, y, 10, 180); // spine on the right
      g.fillStyle = "#faf8f0"; g.fillRect(x + 14, y + 40, 96, 60);
      g.strokeStyle = "rgba(0,0,0,0.3)"; g.lineWidth = 1; g.strokeRect(x + 17, y + 43, 90, 54);
      g.fillStyle = "rgba(0,0,0,0.3)"; g.fillRect(x + 22, y + 70, 80, 1); g.fillRect(x + 22, y + 90, 80, 1);
      hand(g, subj[i], x + 100, y + 66, 20, BLUE, r);
      hand(g, names[i], x + 100, y + 88, 15, BLUE, r); hand(g, "ט'3", x + 34, y + 88, 13, BLUE, r);
      // stickers / doodles / worn corners
      if (i % 3 === 0) star(g, x + 30, y + 140, 10, "#fff", r);
      if (i % 3 === 1) heart(g, x + 40, y + 145, 14, "#f6d", r, true);
      if (i % 3 === 2) smiley(g, x + 36, y + 142, 12, "#ffe23a", r);
      g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(x, y + 176, 128, 4); g.fillRect(x, y, 3, 180);
    }
  });

/** cubby / shoe-locker name tags atlas (2×4 cells) */
export const TAG_NAMES = ["תום ק.", "יוסי", "נועה", "איתי", "מיכל", "עומר", "שירה", "אורי"];
export const nameTags = () =>
  makeTex(256, 64, (g) => {
    const r = rng(33);
    for (let i = 0; i < 8; i++) {
      const x = (i % 4) * 64, y = Math.floor(i / 4) * 32;
      g.fillStyle = ["#fbfaf2", "#fdf3c8", "#e8f2fb", "#fbe6ee"][i % 4]; g.fillRect(x, y, 64, 32);
      g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(x, y, 64, 1); g.fillRect(x, y + 31, 64, 1);
      hand(g, TAG_NAMES[i], x + 58, y + 24, 20, i % 3 ? BLUE : BLACK, r, { jit: 0.5 });
    }
  });

/** school-desk top: light wood grain with pencil scribbles, doodles, carved initials, scratches, ink, gum, crumbs */
export const deskTop = (v: number) =>
  makeTex(320, 224, (g, w, h) => {
    const r = rng(500 + v * 31);
    const base = ["#d8b784", "#d2ad76", "#dcbd8e", "#cfa66e"][v % 4];
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let l = 0; l < 60; l++) {
      const yy = r() * h, a = 0.03 + r() * 0.08, ph = r() * 6, amp = 1 + r() * 3;
      g.fillStyle = r() < 0.65 ? `rgba(90,50,15,${a})` : `rgba(255,240,210,${a})`;
      const th = 1 + r() * 2;
      for (let x = 0; x < w; x += 8) g.fillRect(x, yy + Math.sin(x * 0.02 + ph) * amp, 8, th);
    }
    // hand wear (darker, greasy) near the student edge (bottom of the texture = +z side)
    const gr = g.createLinearGradient(0, h * 0.6, 0, h);
    gr.addColorStop(0, "rgba(80,50,20,0)"); gr.addColorStop(1, "rgba(80,50,20,0.16)");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 5, 0.06, 40, "70,45,20");
    // scratches
    for (let i = 0; i < 26; i++) {
      const x = r() * w, y = r() * h, a = r() * Math.PI, L = 10 + r() * 50;
      g.strokeStyle = r() < 0.6 ? `rgba(255,245,225,${0.25 + r() * 0.3})` : `rgba(60,35,15,${0.2 + r() * 0.2})`;
      g.lineWidth = 0.6 + r() * 0.6;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke();
    }
    const carve = (s: string, x: number, y: number, size: number, rot: number) => {
      // carved = dark groove + light lip offset
      g.save(); g.translate(x, y); g.rotate(rot);
      hand(g, s, 0, 1.2, size, "rgba(255,238,200,0.5)", r, { jit: 0.4, bold: true, font: PRINT });
      hand(g, s, 0, 0, size, "rgba(70,40,15,0.75)", r, { jit: 0.4, bold: true, font: PRINT });
      g.restore();
    };
    const pencil = "rgba(60,60,68,0.55)", pen = "rgba(30,50,150,0.6)";
    if (v === 0) {
      carve("ד.כ", 290, 60, 26, -0.1); carve("2025", 80, 200, 20, 0.05);
      { const xe = hand(g, "מיכל", 300, 150, 22, pen, r, { rot: 0.06 }); heart(g, xe - 10, 142, 9, pen, r); hand(g, "יוסי", xe - 24, 152, 22, pen, r, { rot: 0.06 }); }
      scrib(g, [[40, 40], [60, 20], [80, 42], [100, 18], [120, 40], [140, 22]], r, pencil, 1.5, 1); // zigzag scribble
      // tic-tac-toe
      for (const d of [0, 1]) { g.fillStyle = pencil; g.fillRect(40 + 14 + d * 14, 80, 1.3, 42); g.fillRect(40, 80 + 14 + d * 14, 42, 1.3); }
      cross(g, 44, 84, 8, pencil, r); scrib(g, circ(61, 101, 5, 5, 10), r, pencil, 1.3, 0.3); cross(g, 72, 112, 8, pencil, r);
    } else if (v === 1) {
      carve("א+ש", 160, 100, 30, 0.2);
      hand(g, "משעמם!!!", 300, 40, 20, pencil, r, { rot: -0.05 });
      smiley(g, 60, 60, 14, pen, r); star(g, 250, 180, 10, pencil, r); star(g, 270, 170, 6, pencil, r);
      hand(g, "5+7=12", 60, 190, 16, pencil, r, { ltr: true });
      // ink blot
      g.fillStyle = "rgba(20,40,140,0.55)"; g.beginPath(); g.ellipse(120, 170, 7, 5, 0.3, 0, Math.PI * 2); g.fill();
    } else if (v === 2) {
      carve("מ.ל", 70, 50, 22, -0.25); heart(g, 250, 112, 16, "rgba(70,40,15,0.7)", r); heart(g, 250, 113, 16, "rgba(255,238,200,0.35)", r);
      spiral(g, 300 - 40, 50, 16, pencil, r); flower(g, 60, 150, 11, pen, r);
      hand(g, "מבחן ביום ג׳", 300, 200, 18, pencil, r);
      for (let i = 0; i < 5; i++) scrib(g, [[140 + i * 4, 60], [150 + i * 4, 95]], r, pencil, 1.1, 1); // hatch doodle
    } else {
      carve("ת.ק", 280, 180, 24, 0.1);
      hand(g, "תום היה כאן", 300, 50, 20, pen, r, { rot: 0.04 });
      heart(g, 60, 70, 16, "rgba(200,40,60,0.6)", r); scrib(g, circ(170, 130, 30, 22, 26), r, pencil, 1.2, 1.5); // compass circle
      g.fillStyle = "rgba(40,20,5,0.8)"; g.beginPath(); g.arc(170, 130, 1.6, 0, Math.PI * 2); g.fill();
      scrib(g, [[30, 190], [90, 176], [120, 196], [170, 180]], r, "rgba(210,40,40,0.5)", 1.4, 1.5);
    }
    // bottle ring stain
    if (v % 2 === 0) { g.strokeStyle = "rgba(90,60,30,0.2)"; g.lineWidth = 2; g.beginPath(); g.arc(210 - v * 20, 60 + v * 30, 16, 0.3, Math.PI * 1.8); g.stroke(); }
    // chewing gum stuck on top (1 per desk variant, different colours)
    const gum = ["#f07aa8", "#7fd08a", "#6fb0f0", "#e8a0c8"][v];
    const gx = 40 + r() * 240, gy = 30 + r() * 160;
    g.fillStyle = "rgba(0,0,0,0.25)"; g.beginPath(); g.ellipse(gx + 1, gy + 1.5, 6.5, 5, r(), 0, Math.PI * 2); g.fill();
    g.fillStyle = gum; g.beginPath(); g.ellipse(gx, gy, 6, 4.6, r(), 0, Math.PI * 2); g.fill();
    g.fillStyle = "rgba(255,255,255,0.45)"; g.beginPath(); g.ellipse(gx - 1.5, gy - 1.5, 2, 1.2, 0.4, 0, Math.PI * 2); g.fill();
    // eraser crumbs
    for (let i = 0; i < 20; i++) { g.fillStyle = r() < 0.5 ? "rgba(120,110,110,0.5)" : "rgba(230,150,160,0.6)"; const x = 80 + r() * 160, y = 60 + r() * 120; g.fillRect(x, y, 2 + r() * 2, 1 + r() * 1.5); }
    // edge darkening
    g.strokeStyle = "rgba(60,35,10,0.3)"; g.lineWidth = 4; g.strokeRect(0, 0, w, h);
    specks(g, w, h, r, 1200, 0.05);
  });

/** bent plywood (seat / backrest): fine face veneer grain */
export const plywood = () =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(41);
    g.fillStyle = "#e0bd88"; g.fillRect(0, 0, w, h);
    for (let l = 0; l < 40; l++) {
      const yy = r() * h, a = 0.04 + r() * 0.08, ph = r() * 6;
      g.fillStyle = r() < 0.6 ? `rgba(110,60,20,${a})` : `rgba(255,240,210,${a})`;
      for (let x = 0; x < w; x += 4) g.fillRect(x, yy + Math.sin(x * 0.05 + ph) * 2, 4, 1 + r());
    }
    for (let i = 0; i < 10; i++) { g.strokeStyle = `rgba(255,245,225,${0.2 + r() * 0.3})`; g.lineWidth = 0.6; const x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 30, y + (r() - 0.5) * 12); g.stroke(); }
    specks(g, w, h, r, 600, 0.05);
  });

/** painted steel with worn/chipped paint, scratches, rust spots, grime near the floor (v=0 = bottom) */
export const wornPaint = (base: string, seed = 1) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(300 + seed);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 14, 0.05, 50);
    specks(g, w, h, r, 2500, 0.05);
    // chips showing grey primer / bare metal
    for (let i = 0; i < 60; i++) {
      const edge = r() < 0.75;
      const x = edge ? (r() < 0.5 ? r() * 6 : w - r() * 6) : r() * w, y = r() * h;
      const s = 0.6 + r() * (edge ? 2.5 : 1.2);
      g.fillStyle = r() < 0.7 ? "rgba(120,124,128,0.9)" : "rgba(90,70,50,0.8)";
      g.beginPath(); g.ellipse(x, y, s, s * (0.5 + r()), r() * 3, 0, Math.PI * 2); g.fill();
    }
    // horizontal kick scratches low, vertical scratches around the middle
    for (let i = 0; i < 40; i++) {
      const y = h - r() * h * 0.35, x = r() * w;
      g.strokeStyle = r() < 0.5 ? "rgba(255,255,255,0.28)" : "rgba(40,40,40,0.28)"; g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + 10 + r() * 40, y + (r() - 0.5) * 4); g.stroke();
    }
    // rust dots + streaks
    for (let i = 0; i < 10; i++) { const x = r() * w, y = h * 0.7 + r() * h * 0.3; g.fillStyle = "rgba(140,70,30,0.45)"; g.fillRect(x, y, 2, 2); g.fillStyle = "rgba(140,70,30,0.12)"; g.fillRect(x, y, 1.5, 8 + r() * 14); }
    // grime near the floor + fingerprints around the middle
    const gr = g.createLinearGradient(0, h * 0.75, 0, h);
    gr.addColorStop(0, "rgba(50,40,30,0)"); gr.addColorStop(1, "rgba(50,40,30,0.3)");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    blotches(g, w, h * 0.6, r, 8, 0.05, 10, "60,50,40");
  });

/** hand-lettered class motto banner */
export const motto = (text: string, sub: string) =>
  makeTex(512, 112, (g, w, h) => {
    const r = rng(61);
    g.fillStyle = "#fbf7ea"; g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 4, 0.04, 60, "120,100,60");
    const cols = ["#d23b3b", "#2b62b8", "#2a8a4a", "#e08a1a", "#8a3ab8"];
    let x = w - 24;
    for (const word of text.split(" ")) x = hand(g, word, x, 62, 44, cols[Math.floor(r() * cols.length)], r, { bold: true, gap: 0.3 });
    hand(g, sub, w - 30, 98, 22, "#444", r);
    for (let i = 0; i < 8; i++) star(g, 20 + r() * 110, 20 + r() * 70, 5 + r() * 5, cols[i % 5], r);
    g.strokeStyle = "#d23b3b"; g.lineWidth = 4; g.strokeRect(4, 4, w - 8, h - 8);
  });

/** soft dust / grime decal: 0 corner dust (quarter radial), 1 dust line along the skirting, 2 shoe scuffs (floor),
 *  3 wall scuffs above the skirting (chair bumps, shoe marks) — alpha texture */
export const dirt = (kind: number) =>
  makeTex(kind === 3 ? 512 : 256, kind === 3 ? 64 : kind === 1 ? 32 : kind === 4 ? 64 : 256, (g, w, h) => {
    const r = rng(900 + kind);
    g.clearRect(0, 0, w, h);
    if (kind === 0) {
      const gr = g.createRadialGradient(w, 0, 0, w, 0, w);
      gr.addColorStop(0, "rgba(80,70,55,0.55)"); gr.addColorStop(0.35, "rgba(90,80,65,0.25)"); gr.addColorStop(1, "rgba(90,80,65,0)");
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 500; i++) { const a = r() * Math.PI / 2, d = Math.pow(r(), 2) * w * 0.8; g.fillStyle = `rgba(${60 + r() * 60},${55 + r() * 50},${45 + r() * 40},${0.3 + r() * 0.4})`; g.fillRect(w - Math.cos(a) * d, Math.sin(a) * d, 1 + r() * 2, 1 + r() * 2); }
      // a few hair / fluff strands
      for (let i = 0; i < 8; i++) { const x = w - r() * 60, y = r() * 60; scrib(g, [[x, y], [x - 6 - r() * 10, y + r() * 8], [x - 10 - r() * 14, y + r() * 14]], r, "rgba(70,65,60,0.45)", 0.8, 1); }
    } else if (kind === 1) {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, "rgba(80,70,55,0.45)"); gr.addColorStop(1, "rgba(80,70,55,0)");
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(70,62,50,${0.2 + r() * 0.4})`; g.fillRect(r() * w, Math.pow(r(), 2) * h, 1 + r() * 2, 1); }
    } else if (kind === 4) {
      // chalk dust on the floor under the board (white, patchy, densest near the wall = v 1)
      blotches(g, w, h * 0.6, r, 18, 0.35, 22, "245,245,238");
      for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(245,245,238,${0.2 + r() * 0.5})`; g.fillRect(r() * w, Math.pow(r(), 2) * h, 1, 1); }
    } else if (kind === 2) {
      for (let i = 0; i < 26; i++) {
        const x = r() * w, y = r() * h, a = r() * Math.PI, L = 10 + r() * 30;
        g.strokeStyle = `rgba(20,18,16,${0.25 + r() * 0.35})`; g.lineWidth = 1 + r() * 3; g.lineCap = "round";
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * L * 0.5 + (r() - 0.5) * 8, y + Math.sin(a) * L * 0.5 + (r() - 0.5) * 8, x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke();
      }
      blotches(g, w, h, r, 6, 0.12, 30, "60,50,40");
    } else {
      const gr = g.createLinearGradient(0, h, 0, 0);
      gr.addColorStop(0, "rgba(60,50,40,0.28)"); gr.addColorStop(0.5, "rgba(60,50,40,0.06)"); gr.addColorStop(1, "rgba(60,50,40,0)");
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      // sparse clusters of black shoe marks, low on the wall
      for (let c = 0; c < 5; c++) {
        const cx = r() * w, cy = h * (0.5 + r() * 0.4), n = 1 + Math.floor(r() * 4);
        for (let i = 0; i < n; i++) {
          const x = cx + (r() - 0.5) * 30, y = cy + (r() - 0.5) * 14, L = 4 + r() * 18, a = (r() - 0.5) * 0.8;
          g.strokeStyle = `rgba(25,22,20,${0.15 + r() * 0.35})`;
          g.lineWidth = 0.8 + r() * 2; g.lineCap = "round";
          g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + L / 2, y - 2 + r() * 4, x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke();
        }
      }
      blotches(g, w, h, r, 5, 0.08, 14, "50,40,30");
    }
  });
