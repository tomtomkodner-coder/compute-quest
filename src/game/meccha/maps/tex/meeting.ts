// Canvas textures for the Meeting Room map (loft-style office): oak planks, whitewashed brick with plaster patches,
// carpet tiles, dark wood-slat ceiling, fabric weave, tufted chesterfield leather, whiteboards with marker notes,
// sticky notes, printed papers, monitor screens, keyboards, city skyline, moss wall, signs, posters, stains.
import * as THREE from "three";
import { makeTex, type PaintTex } from "../../textures";

type G = CanvasRenderingContext2D;
const SANS = `"Helvetica Neue", "Arial", "DejaVu Sans", sans-serif`;
const HAND = `"Segoe Print", "Bradley Hand", "Comic Sans MS", "Chalkboard", "DejaVu Sans", cursive`;

export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

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
function rrect(g: G, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
/** wobbly hand-drawn line */
function scrib(g: G, x1: number, y1: number, x2: number, y2: number, r: () => number, j = 1.2) {
  g.beginPath();
  g.moveTo(x1, y1);
  const n = 6;
  for (let i = 1; i <= n; i++) g.lineTo(x1 + ((x2 - x1) * i) / n + (r() - 0.5) * j, y1 + ((y2 - y1) * i) / n + (r() - 0.5) * j);
  g.stroke();
}

/** fast Sobel normal map stored on t.normal (Kit.mat() reuses it) */
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

// ---------------------------------------------------------------- surfaces

/** oiled oak planks along U, 9 boards per tile (tile ≈ 1.6 m), with joints, knots, scuffs and wear */
export const planks = (base = "#a8743f", seed = 5) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    const n = 9, bh = h / n;
    for (let i = 0; i < n; i++) {
      const y = i * bh;
      const j = r() * w;
      g.fillStyle = shade(base, 0.8 + r() * 0.34);
      g.fillRect(0, y, w, bh);
      g.fillStyle = shade(base, 0.8 + r() * 0.34);
      g.fillRect(j, y, w - j, bh);
      for (let l = 0; l < 9; l++) {
        const yy = y + r() * bh, a = 0.04 + r() * 0.1, ph = r() * 6, amp = r() * 2;
        g.fillStyle = r() < 0.65 ? `rgba(60,28,8,${a})` : `rgba(255,236,200,${a * 0.8})`;
        for (let x = 0; x < w; x += 8) g.fillRect(x, yy + Math.sin(x * 0.03 + ph) * amp, 8, 1 + (r() < 0.2 ? 1 : 0));
      }
      if (r() < 0.1) { g.fillStyle = "rgba(55,25,8,0.3)"; g.beginPath(); g.ellipse(r() * w, y + bh / 2, 4 + r() * 4, bh * 0.22, 0, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = "rgba(25,12,4,0.6)";
      g.fillRect(0, y, w, 1.5);
      g.fillRect(j, y, 1.5, bh);
      if (r() < 0.5) g.fillRect((j + w / 2) % w, y, 1.5, bh);
    }
    blotches(g, w, h, r, 10, 0.08, 45);
    g.strokeStyle = "rgba(30,15,5,0.12)";
    g.lineWidth = 1;
    for (let i = 0; i < 26; i++) { const x = r() * w, y = r() * h, l = 6 + r() * 30, a = r() * 6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    specks(g, w, h, r, 2500, 0.07);
  });

/** whitewashed red brick (tile = 2 m wide, 8×24 bricks) with lime-plaster patches */
export const brick = (seed = 7, plaster = true) =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#b9b0a3";
    g.fillRect(0, 0, w, h);
    specks(g, w, h, r, 5000, 0.12);
    const cols = 8, rows = 24, bw = w / cols, bh = h / rows;
    const tones = ["#9a4a32", "#a8553a", "#8e4330", "#b0613f", "#83402d", "#a04c36", "#b86a4a", "#7a3a2a"];
    for (let j = 0; j < rows; j++) {
      const off = j % 2 ? bw / 2 : 0;
      for (let i = -1; i < cols; i++) {
        const x = i * bw + off + 1.5, y = j * bh + 1.5;
        g.fillStyle = tones[Math.floor(r() * tones.length)];
        g.fillRect(x, y, bw - 3.5, bh - 3.2);
        g.fillStyle = `rgba(255,255,255,${r() * 0.12})`;
        g.fillRect(x, y, bw - 3.5, 2);
        g.fillStyle = `rgba(0,0,0,${0.08 + r() * 0.14})`;
        g.fillRect(x, y + bh - 5.5, bw - 3.5, 2);
        if (r() < 0.25) { g.fillStyle = "rgba(30,15,10,0.18)"; g.fillRect(x + r() * bw * 0.6, y + 2, 6 + r() * 12, bh - 7); }
      }
    }
    specks(g, w, h, r, 9000, 0.14, 1, 1);
    blotches(g, w, h, r, 26, 0.22, 40, "235,228,215"); // whitewash residue
    blotches(g, w, h, r, 10, 0.12, 60, "20,10,5");
    if (plaster) {
      // soft lime-wash residue that follows the mortar joints, plus a couple of faded patches
      blotches(g, w, h, r, 7, 0.32, 110, "232,226,214");
      g.fillStyle = "rgba(236,230,218,0.22)";
      for (let j = 0; j < rows; j++) if (r() < 0.5) g.fillRect(r() * w * 0.5, j * bh - 1.5, w * (0.2 + r() * 0.5), 3);
      specks(g, w, h, r, 2000, 0.06);
    }
  });

/** matt painted plaster (unit ≈ 2 m) */
export const plaster = (base = "#efece5", seed = 2) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 22, 0.045, 60);
    specks(g, w, h, r, 5000, 0.045);
    specks(g, w, h, r, 500, 0.07, 2, 1);
  });

/** grey loop-pile carpet tiles, 2×2 per texture (tile 0.5 m → unit 1.0), quarter-turned */
export const carpet = (base = "#6d7075", seed = 4) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    const t = w / 2;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      g.fillStyle = shade(base, 0.94 + r() * 0.12);
      g.fillRect(i * t, j * t, t, t);
      const vert = (i + j) % 2 === 0;
      for (let l = 0; l < 90; l++) {
        g.fillStyle = r() < 0.5 ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.06)";
        const p = r() * t;
        if (vert) g.fillRect(i * t + p, j * t, 1, t);
        else g.fillRect(i * t, j * t + p, t, 1);
      }
    }
    specks(g, w, h, r, 9000, 0.16, 1, 1);
    specks(g, w, h, r, 800, 0.12, 2, 2);
    blotches(g, w, h, r, 5, 0.06, 40, "40,30,20");
    g.fillStyle = "rgba(0,0,0,0.25)";
    g.fillRect(0, 0, w, 1); g.fillRect(0, t, w, 1); g.fillRect(0, 0, 1, h); g.fillRect(t, 0, 1, h);
  });

/** dark wood ceiling slats along U (tile 1.2 m, 10 slats) */
export const slats = (seed = 12) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    const n = 10, bh = h / n;
    for (let i = 0; i < n; i++) {
      const y = i * bh;
      g.fillStyle = shade("#6b4428", 0.78 + r() * 0.35);
      g.fillRect(0, y, w, bh);
      for (let l = 0; l < 6; l++) {
        const yy = y + r() * bh, a = 0.05 + r() * 0.12, ph = r() * 6;
        g.fillStyle = r() < 0.7 ? `rgba(40,18,5,${a})` : `rgba(255,220,170,${a * 0.6})`;
        for (let x = 0; x < w; x += 8) g.fillRect(x, yy + Math.sin(x * 0.02 + ph) * 1.5, 8, 1);
      }
      g.fillStyle = "rgba(10,5,2,0.8)";
      g.fillRect(0, y, w, 3);
      g.fillStyle = "rgba(255,230,190,0.12)";
      g.fillRect(0, y + 3, w, 1);
      g.fillStyle = "rgba(10,5,2,0.6)";
      g.fillRect(r() * w, y, 2, bh);
    }
    specks(g, w, h, r, 1500, 0.06);
  });

/** fine woven fabric (unit ≈ 0.3 m); tinted by material/instance colour */
export const fabric = (seed = 3, lum = 205) =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(seed);
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const weave = ((x >> 1) + (y >> 1)) % 2 ? 12 : -12;
      const v = lum + weave + (r() - 0.5) * 34;
      const i = (y * w + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(0, Math.min(255, v));
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    blotches(g, w, h, r, 6, 0.05, 30);
  });

/** chesterfield tufted leather: diamond buttons (tile ≈ 0.5 m), warm cognac tones */
export const leather = (base = "#8a4a24", seed = 8) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 30, 0.18, 30, "40,15,5");
    blotches(g, w, h, r, 20, 0.14, 26, "230,170,110");
    const s = w / 4;
    const pts: [number, number][] = [];
    for (let j = 0; j <= 4; j++) for (let i = 0; i <= 4; i++) pts.push([i * s + (j % 2 ? s / 2 : 0), j * s]);
    for (const [x, y] of pts) {
      // puffy highlight between buttons
      const gr = g.createRadialGradient(x + s / 2, y + s / 2, 2, x + s / 2, y + s / 2, s * 0.62);
      gr.addColorStop(0, "rgba(255,200,150,0.18)");
      gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr;
      g.fillRect(x, y, s, s);
    }
    g.strokeStyle = "rgba(25,8,2,0.55)";
    g.lineWidth = 2;
    for (const [x, y] of pts) {
      for (const [dx, dy] of [[s / 2, s / 2], [-s / 2, s / 2]]) { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + dx / 2 + (r() - 0.5) * 4, y + dy / 2, x + dx, y + dy); g.stroke(); }
    }
    for (const [x, y] of pts) {
      g.fillStyle = "rgba(20,6,2,0.8)";
      g.beginPath(); g.arc(x, y, 4.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = "rgba(255,200,150,0.35)";
      g.beginPath(); g.arc(x - 1, y - 1, 1.6, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = "rgba(255,210,160,0.08)";
    for (let i = 0; i < 60; i++) { const x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 20, y + (r() - 0.5) * 8); g.stroke(); }
    specks(g, w, h, r, 3000, 0.08);
  });

/** smooth leather (armrests, office chairs) */
export const leatherPlain = (base = "#8a4a24", seed = 9) =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 20, 0.2, 20, "40,15,5");
    blotches(g, w, h, r, 14, 0.12, 18, "240,180,120");
    specks(g, w, h, r, 2500, 0.1);
  });

/** straight wood grain for furniture (along U) */
export const grain = (base: string, seed = 3, lines = 70) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let l = 0; l < lines; l++) {
      const yy = r() * h, a = 0.03 + r() * 0.09, ph = r() * 6, amp = 1 + r() * 4;
      g.fillStyle = r() < 0.65 ? `rgba(60,30,10,${a})` : `rgba(255,240,210,${a})`;
      const th = 1 + r() * 2;
      for (let x = 0; x < w; x += 8) g.fillRect(x, yy + Math.sin(x * 0.025 + ph) * amp, 8, th);
    }
    specks(g, w, h, r, 1500, 0.05);
  });

/** pallet wood: rough planks with nails */
export const pallet = () =>
  makeTex(256, 128, (g, w, h) => {
    const r = rng(31);
    g.fillStyle = "#c9ad85";
    g.fillRect(0, 0, w, h);
    for (let l = 0; l < 60; l++) {
      const yy = r() * h, a = 0.05 + r() * 0.12;
      g.fillStyle = r() < 0.7 ? `rgba(90,60,30,${a})` : `rgba(255,245,220,${a})`;
      for (let x = 0; x < w; x += 8) g.fillRect(x, yy + Math.sin(x * 0.04 + l) * 2, 8, 1);
    }
    blotches(g, w, h, r, 10, 0.15, 25, "80,50,25");
    g.fillStyle = "#3a3a3a";
    for (const x of [12, w - 12]) for (const y of [h * 0.3, h * 0.7]) { g.beginPath(); g.arc(x, y, 2.5, 0, Math.PI * 2); g.fill(); }
    specks(g, w, h, r, 2000, 0.1);
  });

/** subway tile backsplash (tile 0.6 m: 4×8 tiles) */
export const subway = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(17);
    g.fillStyle = "#c9c6bf";
    g.fillRect(0, 0, w, h);
    const cols = 4, rows = 8, tw = w / cols, th = h / rows;
    for (let j = 0; j < rows; j++) for (let i = -1; i < cols; i++) {
      const x = i * tw + (j % 2 ? tw / 2 : 0) + 2, y = j * th + 2;
      const gr = g.createLinearGradient(x, y, x, y + th - 4);
      const v = 238 + Math.floor(r() * 12);
      gr.addColorStop(0, `rgb(${v},${v},${v - 4})`);
      gr.addColorStop(1, `rgb(${v - 14},${v - 14},${v - 18})`);
      g.fillStyle = gr;
      rrect(g, x, y, tw - 4, th - 4, 3);
      g.fill();
    }
    blotches(g, w, h, r, 4, 0.05, 50, "120,100,60");
  });

/** dark rug with pale marble veins (like the reference lounge rug) */
export const rugMarble = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(23);
    g.fillStyle = "#23262a";
    g.fillRect(0, 0, w, h);
    specks(g, w, h, r, 9000, 0.12);
    g.lineCap = "round";
    for (let v = 0; v < 12; v++) {
      g.strokeStyle = `rgba(215,210,200,${0.25 + r() * 0.4})`;
      g.lineWidth = 0.6 + r() * 2.2;
      let x = r() * w, y = r() * h, a = r() * 6;
      g.beginPath(); g.moveTo(x, y);
      for (let s = 0; s < 30; s++) { a += (r() - 0.5) * 0.9; x += Math.cos(a) * 9; y += Math.sin(a) * 9; g.lineTo(x, y); }
      g.stroke();
    }
    g.strokeStyle = "rgba(200,190,170,0.6)";
    g.lineWidth = 5;
    g.strokeRect(10, 10, w - 20, h - 20);
    g.lineWidth = 1.5;
    g.strokeRect(20, 20, w - 40, h - 40);
  });

/** green preserved-moss wall */
export const moss = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(41);
    g.fillStyle = "#2f4a1f";
    g.fillRect(0, 0, w, h);
    const cols = ["#4f7a2b", "#6a9636", "#3d6423", "#86ad45", "#2c4a1a", "#5d8a30", "#9bbf5a"];
    for (let i = 0; i < 1400; i++) {
      const x = r() * w, y = r() * h, rad = 2 + r() * 7;
      g.fillStyle = cols[Math.floor(r() * cols.length)];
      g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
    }
    specks(g, w, h, r, 6000, 0.2, 1, 1);
  });

// ---------------------------------------------------------------- office stuff

type Board = "roadmap" | "brainstorm" | "sprint" | "erased";
/** whiteboard with marker notes (board ≈ 2.4 × 1.2 m) */
export const whiteboard = (kind: Board) =>
  makeTex(512, 256, (g, w, h) => {
    const r = rng(kind.length * 97 + 3);
    g.fillStyle = "#f6f7f5";
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 14, 0.035, 50, "120,130,150"); // ghosting
    g.lineCap = "round";
    g.lineJoin = "round";
    const pen = (c: string, lw = 2.4) => { g.strokeStyle = c; g.fillStyle = c; g.lineWidth = lw; };
    const txt = (s: string, x: number, y: number, size: number, c: string, rot = 0) => {
      g.save(); g.translate(x, y); g.rotate(rot + (r() - 0.5) * 0.03); g.fillStyle = c; g.font = `bold ${size}px ${HAND}`; g.fillText(s, 0, 0); g.restore();
    };
    const note = (x: number, y: number, c: string, s: string) => {
      g.save(); g.translate(x, y); g.rotate((r() - 0.5) * 0.12);
      g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(2, 3, 44, 40);
      g.fillStyle = c; g.fillRect(0, 0, 44, 40);
      g.fillStyle = "rgba(0,0,0,0.06)"; g.fillRect(0, 0, 44, 9);
      g.fillStyle = "#2a2a35"; g.font = `bold 9px ${HAND}`;
      s.split("|").forEach((l, i) => g.fillText(l, 4, 20 + i * 10));
      g.restore();
    };
    if (kind === "roadmap") {
      txt("Q3 ROADMAP", 20, 36, 28, "#1d3f9a");
      pen("#1d3f9a", 2); scrib(g, 20, 44, 200, 46, r);
      pen("#222", 2);
      for (const x of [175, 340]) scrib(g, x, 58, x + 2, h - 12, r, 2);
      ["TO DO", "DOING", "DONE!"].forEach((s, i) => txt(s, 30 + i * 165, 76, 17, ["#c2272d", "#e08a00", "#1f8a3a"][i]));
      const nc = ["#ffe766", "#ffb3cf", "#9fe3ff", "#b8f28a", "#ffc36b"];
      const items = ["new|login page", "fix bug|#482", "team|lunch?", "API v2", "review|designs", "hire|intern", "launch|beta!", "QA pass", "docs"];
      items.forEach((s, i) => note(24 + (i % 3) * 165 + (Math.floor(i / 3) % 2) * 58 + (r() - 0.5) * 8, 92 + Math.floor(i / 3) * 52, nc[i % nc.length], s));
      txt("deadline: FRI 3pm !!", 350, 240, 15, "#c2272d");
    } else if (kind === "brainstorm") {
      txt("NEW PRODUCT IDEAS", 150, 38, 26, "#222");
      pen("#1d3f9a", 3);
      g.beginPath(); g.ellipse(256, 128, 70, 32, 0, 0, Math.PI * 2); g.stroke();
      txt("CUSTOMERS", 205, 135, 18, "#1d3f9a");
      const spokes: [number, number, string, string][] = [[80, 80, "faster app", "#c2272d"], [70, 190, "lower price?", "#1f8a3a"], [430, 75, "better UX", "#1f8a3a"], [440, 200, "mobile first", "#c2272d"], [256, 235, "AI assistant??", "#7a2ca0"]];
      for (const [x, y, s, c] of spokes) {
        pen(c, 2);
        scrib(g, 256 + (x - 256) * 0.32, 128 + (y - 128) * 0.35, x + (x > 256 ? -10 : 40), y - 6, r, 2);
        txt(s, x - 40, y, 16, c);
      }
      pen("#222", 1.6);
      scrib(g, 20, 238, 110, 238, r);
      txt("vote by Thu", 22, 232, 13, "#222");
      note(430, 110, "#ffe766", "+1|love it");
    } else if (kind === "sprint") {
      txt("SPRINT 42", 24, 36, 26, "#c2272d");
      txt("burndown", 30, 64, 14, "#222");
      pen("#222", 2);
      scrib(g, 40, 80, 40, 220, r); scrib(g, 40, 220, 250, 220, r);
      pen("#1d3f9a", 2.5);
      g.beginPath(); g.moveTo(40, 90);
      for (let i = 1; i <= 10; i++) g.lineTo(40 + i * 21, 90 + i * 12 + (r() - 0.3) * 18);
      g.stroke();
      pen("#999", 1.2); scrib(g, 40, 90, 250, 215, r);
      txt("GOALS", 290, 70, 20, "#1d3f9a");
      ["- ship search v2", "- fix printer (again)", "- 99.9% uptime", "- demo on Friday", "- clean the fridge"].forEach((s, i) => txt(s, 290, 100 + i * 26, 15, i === 4 ? "#1f8a3a" : "#222"));
      pen("#1f8a3a", 2.5);
      for (const i of [0, 2]) scrib(g, 282, 95 + i * 26, 290, 100 + i * 26, r);
    } else {
      blotches(g, w, h, r, 40, 0.07, 30, "60,80,140");
      pen("rgba(40,60,130,0.25)", 3);
      for (let i = 0; i < 16; i++) scrib(g, r() * w, r() * h, r() * w, r() * h, r, 30);
      txt("DO NOT ERASE!!", 110, 110, 34, "#c2272d", -0.03);
      pen("#c2272d", 3); scrib(g, 105, 122, 400, 118, r);
      txt("marketing plan -> ask Dana", 120, 170, 17, "#1d3f9a");
      txt("wifi: guest / coffee123", 300, 235, 13, "#222");
    }
    // tray shadow at bottom
    const gr = g.createLinearGradient(0, h - 10, 0, h);
    gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,0.1)");
    g.fillStyle = gr; g.fillRect(0, h - 10, w, 10);
  });

/** sticky note with scribbles (tinted by instance colour) */
export const sticky = () =>
  makeTex(64, 64, (g, w, h) => {
    const r = rng(5);
    g.fillStyle = "#fafaf6";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(0,0,0,0.06)"; g.fillRect(0, 0, w, 12);
    g.strokeStyle = "rgba(30,30,60,0.75)";
    g.lineWidth = 2;
    for (let i = 0; i < 4; i++) scrib(g, 6, 22 + i * 10, 20 + r() * 36, 22 + i * 10 + (r() - 0.5) * 3, r, 3);
    g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(w - 3, 0, 3, h); g.fillRect(0, h - 3, w, 3);
  });

/** atlas of printed A4 pages, 4×2 cells of 128×180 */
export const papers = () =>
  makeTex(512, 360, (g) => {
    const r = rng(19);
    const cw = 128, ch = 180;
    const titles = ["MEETING AGENDA", "Q3 REPORT", "INVOICE #2291", "MEMO", "SALES FIGURES", "PROJECT PLAN", "TIMESHEET", "NOTICE"];
    for (let c = 0; c < 8; c++) {
      const x = (c % 4) * cw, y = Math.floor(c / 4) * ch;
      g.fillStyle = c === 7 ? "#fff7d6" : "#fbfbf8";
      g.fillRect(x, y, cw, ch);
      g.fillStyle = "#1a2a4a";
      g.font = `bold 10px ${SANS}`;
      g.fillText(titles[c], x + 10, y + 20);
      g.fillStyle = "#999"; g.fillRect(x + 10, y + 25, cw - 20, 1);
      g.fillStyle = "rgba(40,40,50,0.8)";
      g.font = `5px ${SANS}`;
      if (c === 1 || c === 4) {
        // chart
        for (let b = 0; b < 6; b++) { const bh = 12 + r() * 38; g.fillStyle = ["#2d6cc0", "#e07a2c", "#3a9a4f"][b % 3]; g.fillRect(x + 16 + b * 16, y + 86 - bh, 10, bh); }
        g.fillStyle = "#333"; g.fillRect(x + 12, y + 86, cw - 24, 1);
      }
      if (c === 2 || c === 6) {
        g.strokeStyle = "rgba(0,0,0,0.3)";
        for (let row = 0; row < 12; row++) { g.strokeRect(x + 10, y + 34 + row * 9, cw - 20, 9); }
        g.fillStyle = "rgba(40,40,50,0.8)";
        for (let row = 0; row < 12; row++) { g.fillRect(x + 13, y + 38 + row * 9, 30 + r() * 20, 2); g.fillRect(x + cw - 34, y + 38 + row * 9, 18, 2); }
      }
      const start = c === 1 || c === 4 ? 96 : c === 2 || c === 6 ? 150 : 36;
      for (let l = start; l < ch - 14; l += 7) {
        if (r() < 0.12) continue;
        g.fillRect(x + 10, y + l, (cw - 20) * (0.55 + r() * 0.45), 2);
      }
      if (c === 0) { g.fillStyle = "#1a2a4a"; g.font = `bold 7px ${SANS}`; ["1. Welcome", "2. Q3 numbers", "3. Roadmap", "4. AOB"].forEach((s, i) => g.fillText(s, x + 12, y + 44 + i * 14)); }
      if (c === 7) { g.fillStyle = "#c2272d"; g.font = `bold 14px ${SANS}`; g.fillText("OUT OF", x + 20, y + 70); g.fillText("ORDER", x + 22, y + 90); }
      g.fillStyle = "rgba(0,0,0,0.08)"; g.fillRect(x + cw - 1, y, 1, ch); g.fillRect(x, y + ch - 1, cw, 1);
    }
  });

/** monitor screens atlas: 4×4 cells of 128×72 */
export const screens = () =>
  makeTex(512, 288, (g) => {
    const r = rng(29);
    const cw = 128, ch = 72;
    for (let c = 0; c < 16; c++) {
      const x = (c % 4) * cw, y = Math.floor(c / 4) * ch;
      g.save();
      g.beginPath(); g.rect(x, y, cw, ch); g.clip();
      const kind = c % 8;
      if (kind === 0) { // spreadsheet
        g.fillStyle = "#fff"; g.fillRect(x, y, cw, ch);
        g.fillStyle = "#1f7a44"; g.fillRect(x, y, cw, 8);
        g.strokeStyle = "#d4d8dc";
        for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(x + i * 16, y + 8); g.lineTo(x + i * 16, y + ch); g.stroke(); }
        for (let j = 0; j < 10; j++) { g.beginPath(); g.moveTo(x, y + 12 + j * 6); g.lineTo(x + cw, y + 12 + j * 6); g.stroke(); }
        g.fillStyle = "#333";
        for (let j = 0; j < 9; j++) for (let i = 0; i < 7; i++) if (r() < 0.75) g.fillRect(x + 2 + i * 16, y + 14 + j * 6, 6 + r() * 8, 2);
      } else if (kind === 1) { // code editor
        g.fillStyle = "#1e1f26"; g.fillRect(x, y, cw, ch);
        g.fillStyle = "#2b2d38"; g.fillRect(x, y, 22, ch);
        const cols = ["#c792ea", "#82aaff", "#c3e88d", "#f78c6c", "#89ddff", "#dcdcdc"];
        for (let j = 0; j < 16; j++) { let xx = x + 26 + (j % 4 === 0 ? 0 : 6 + (j % 3) * 5); for (let t = 0; t < 4; t++) { const lw = 4 + r() * 16; g.fillStyle = cols[Math.floor(r() * cols.length)]; g.fillRect(xx, y + 3 + j * 4.3, lw, 2); xx += lw + 3; } }
      } else if (kind === 2) { // email
        g.fillStyle = "#f3f5f8"; g.fillRect(x, y, cw, ch);
        g.fillStyle = "#2f63c8"; g.fillRect(x, y, cw, 9);
        g.fillStyle = "#e3e8ef"; g.fillRect(x, y + 9, 30, ch);
        for (let j = 0; j < 9; j++) { g.fillStyle = j === 1 ? "#dbe7ff" : "#fff"; g.fillRect(x + 32, y + 11 + j * 6.6, cw - 34, 6); g.fillStyle = "#333"; g.fillRect(x + 35, y + 13 + j * 6.6, 20, 1.5); g.fillStyle = "#888"; g.fillRect(x + 60, y + 13 + j * 6.6, 50 * r() + 10, 1.5); }
      } else if (kind === 3) { // dashboard
        g.fillStyle = "#15202e"; g.fillRect(x, y, cw, ch);
        for (let b = 0; b < 8; b++) { const bh = 8 + r() * 30; g.fillStyle = "#3ea0ff"; g.fillRect(x + 8 + b * 8, y + 60 - bh, 5, bh); }
        g.fillStyle = "#ffb13d"; g.beginPath(); g.moveTo(x + 102, y + 36); g.arc(x + 102, y + 36, 16, 0, 4.1); g.fill();
        g.fillStyle = "#44d18a"; g.beginPath(); g.moveTo(x + 102, y + 36); g.arc(x + 102, y + 36, 16, 4.1, Math.PI * 2); g.fill();
        g.fillStyle = "#fff"; g.font = `bold 7px ${SANS}`; g.fillText("KPI  +12%", x + 8, y + 10);
      } else if (kind === 4) { // slide
        g.fillStyle = "#fdfdfd"; g.fillRect(x, y, cw, ch);
        g.fillStyle = "#e0602a"; g.fillRect(x, y, 6, ch);
        g.fillStyle = "#222"; g.font = `bold 11px ${SANS}`; g.fillText("Q3 RESULTS", x + 14, y + 22);
        g.fillStyle = "#666"; for (let j = 0; j < 4; j++) g.fillRect(x + 16, y + 32 + j * 8, 60 + r() * 30, 2);
      } else if (kind === 5) { // video call
        g.fillStyle = "#202124"; g.fillRect(x, y, cw, ch);
        for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) {
          const tx = x + 3 + i * 41.5, ty = y + 3 + j * 34;
          g.fillStyle = ["#5a6b7a", "#7a5a4a", "#4a6a5a", "#6a5a7a", "#7a7a5a", "#4a5a7a"][i + j * 3]; g.fillRect(tx, ty, 39, 31);
          g.fillStyle = ["#e8c4a0", "#8d5a3a", "#f0d0b0", "#c09070"][Math.floor(r() * 4)];
          g.beginPath(); g.arc(tx + 19.5, ty + 13, 6, 0, Math.PI * 2); g.fill();
          g.fillRect(tx + 11, ty + 21, 17, 10);
        }
      } else if (kind === 6) { // calendar
        g.fillStyle = "#fff"; g.fillRect(x, y, cw, ch);
        g.fillStyle = "#555"; g.fillRect(x, y, cw, 8);
        const ev = ["#4285f4", "#34a853", "#fbbc05", "#ea4335", "#9c27b0"];
        for (let i = 0; i < 5; i++) for (let e = 0; e < 3; e++) if (r() < 0.7) { g.fillStyle = ev[Math.floor(r() * 5)]; g.fillRect(x + 4 + i * 25, y + 12 + r() * 48, 22, 5 + r() * 10); }
        g.strokeStyle = "#ddd"; for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(x + 2 + i * 25, y + 8); g.lineTo(x + 2 + i * 25, y + ch); g.stroke(); }
      } else { // wallpaper
        const gr = g.createLinearGradient(x, y, x, y + ch);
        gr.addColorStop(0, ["#ff9a5a", "#3a6fd0", "#6a3fa0", "#2aa0a0"][c % 4]); gr.addColorStop(1, ["#5a2a6a", "#9ad0ff", "#ff7aa0", "#0a3040"][c % 4]);
        g.fillStyle = gr; g.fillRect(x, y, cw, ch);
        g.fillStyle = "rgba(10,20,40,0.6)";
        g.beginPath(); g.moveTo(x, y + ch); g.lineTo(x + 30, y + 40); g.lineTo(x + 55, y + 55); g.lineTo(x + 85, y + 30); g.lineTo(x + cw, y + 50); g.lineTo(x + cw, y + ch); g.fill();
        g.fillStyle = "rgba(255,255,255,0.8)"; for (let i = 0; i < 6; i++) g.fillRect(x + 4, y + 4 + i * 9, 6, 6);
      }
      // taskbar
      if (kind !== 4) { g.fillStyle = "rgba(20,24,30,0.85)"; g.fillRect(x, y + ch - 4, cw, 4); }
      g.restore();
    }
  });

/** big TV slide in the conference room */
export const tvSlide = () =>
  makeTex(512, 288, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, "#14315e"); gr.addColorStop(1, "#0b1830");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = "#ff8a3d"; g.fillRect(40, 60, 8, 90);
    g.fillStyle = "#fff"; g.font = `bold 44px ${SANS}`; g.fillText("Q3 KICK-OFF", 62, 100);
    g.font = `22px ${SANS}`; g.fillStyle = "#c9d6ee"; g.fillText("Welcome, team! Coffee is in the kitchen.", 62, 138);
    const r = rng(3);
    for (let b = 0; b < 7; b++) { const bh = 20 + r() * 70; g.fillStyle = b === 6 ? "#ff8a3d" : "#4c8fe8"; g.fillRect(70 + b * 40, 260 - bh, 26, bh); }
    g.fillStyle = "#8fa6c9"; g.font = `16px ${SANS}`; g.fillText("Revenue +18% YoY", 360, 250);
  });

/** keyboard top */
export const keyboard = () =>
  makeTex(128, 48, (g, w, h) => {
    g.fillStyle = "#2a2c30"; g.fillRect(0, 0, w, h);
    for (let row = 0; row < 5; row++) for (let i = 0; i < 15; i++) {
      const kw = row === 4 && i > 3 && i < 10 ? 0 : 6.6;
      if (!kw) continue;
      g.fillStyle = "#3d4046"; g.fillRect(3 + i * 7.6, 4 + row * 8.2, kw, 6.8);
      g.fillStyle = "#4a4d54"; g.fillRect(3 + i * 7.6, 4 + row * 8.2, kw, 1.5);
    }
    g.fillStyle = "#3d4046"; g.fillRect(3 + 4 * 7.6, 4 + 4 * 8.2, 7.6 * 6 - 1, 6.8);
  });

/** cityscape seen through the windows (daylight) */
export const skyline = (seed = 13) =>
  makeTex(512, 256, (g, w, h) => {
    const r = rng(seed);
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "#7fb2e6"); gr.addColorStop(0.55, "#cfe2f2"); gr.addColorStop(1, "#e9eef0");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(255,255,255,0.7)";
    for (let i = 0; i < 6; i++) { const x = r() * w, y = 20 + r() * 60; for (let b = 0; b < 5; b++) { g.beginPath(); g.ellipse(x + b * 14, y + (r() - 0.5) * 6, 18, 8, 0, 0, Math.PI * 2); g.fill(); } }
    // far layer
    for (let x = 0; x < w;) {
      const bw = 20 + r() * 40, bh = 60 + r() * 90;
      g.fillStyle = `rgb(${150 + r() * 20},${168 + r() * 20},${185 + r() * 15})`;
      g.fillRect(x, h - 60 - bh, bw, bh + 60);
      x += bw + 2;
    }
    // near layer with windows
    for (let x = -10; x < w;) {
      const bw = 40 + r() * 70, bh = 50 + r() * 110;
      const base = [[196, 184, 168], [140, 150, 160], [175, 110, 90], [215, 210, 200], [110, 120, 135]][Math.floor(r() * 5)];
      g.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
      const top = h - bh;
      g.fillRect(x, top, bw, bh);
      g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(x + bw - 4, top, 4, bh);
      for (let yy = top + 8; yy < h - 6; yy += 11) for (let xx = x + 5; xx < x + bw - 8; xx += 10) {
        g.fillStyle = r() < 0.15 ? "rgba(255,240,200,0.9)" : `rgba(${60 + r() * 40},${90 + r() * 40},${120 + r() * 40},0.85)`;
        g.fillRect(xx, yy, 6, 7);
      }
      if (r() < 0.3) { g.fillStyle = "#555"; g.fillRect(x + bw * 0.3, top - 10, 12, 10); }
      x += bw + 4 + r() * 10;
    }
  });

/** simple sign: text on a colour plate */
export const sign = (text: string, bg: string, fg: string, sub = "", w = 256, h = 80) =>
  makeTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = fg;
    g.textAlign = "center";
    let size = Math.round(h * (sub ? 0.38 : 0.5));
    g.font = `bold ${size}px ${SANS}`;
    while (g.measureText(text).width > w * 0.9 && size > 8) { size -= 2; g.font = `bold ${size}px ${SANS}`; }
    g.fillText(text, w / 2, sub ? h * 0.5 : h * 0.66);
    if (sub) { g.font = `${Math.round(h * 0.2)}px ${SANS}`; g.fillText(sub, w / 2, h * 0.82); }
  });

/** company logo in white letters on a transparent background (for the moss wall) */
export const logo = () =>
  makeTex(512, 160, (g, w) => {
    g.clearRect(0, 0, w, 160);
    g.fillStyle = "#ffffff";
    g.textAlign = "center";
    let fs = 72;
    g.font = `bold ${fs}px ${SANS}`;
    while (g.measureText("MEETING ROOM").width > w * 0.9 && fs > 20) { fs -= 3; g.font = `bold ${fs}px ${SANS}`; }
    g.fillText("MEETING ROOM", w / 2, 78);
    g.font = `26px ${SANS}`;
    g.fillText("C O .   —   est. 2019", w / 2, 128);
    g.fillRect(60, 96, w - 120, 3);
  });

/** motivational posters atlas 2×2 (cells 128×160) */
export const posters = () =>
  makeTex(256, 320, (g) => {
    const items: [string, string, string, string][] = [["TEAMWORK", "together we ship", "#2a4f7a", "#f0a040"], ["SYNERGY", "it's a real word", "#3a2a5a", "#e05a8a"], ["FOCUS", "one tab at a time", "#1f4a3a", "#9ad05a"], ["COFFEE", "fuel for ideas", "#4a2a1a", "#f0c070"]];
    items.forEach(([t, s, bg, ac], i) => {
      const x = (i % 2) * 128, y = Math.floor(i / 2) * 160;
      g.fillStyle = "#111"; g.fillRect(x, y, 128, 160);
      const gr = g.createLinearGradient(x, y + 8, x, y + 110);
      gr.addColorStop(0, ac); gr.addColorStop(1, bg);
      g.fillStyle = gr; g.fillRect(x + 8, y + 8, 112, 100);
      g.fillStyle = "rgba(0,0,0,0.5)";
      g.beginPath(); g.moveTo(x + 8, y + 108); g.lineTo(x + 40, y + 60); g.lineTo(x + 62, y + 80); g.lineTo(x + 90, y + 45); g.lineTo(x + 120, y + 90); g.lineTo(x + 120, y + 108); g.fill();
      g.fillStyle = "#fff"; g.textAlign = "center";
      g.font = `bold 17px ${SANS}`; g.fillText(t, x + 64, y + 130);
      g.font = `9px ${SANS}`; g.fillText(s, x + 64, y + 146);
      g.textAlign = "left";
    });
  });

/** kitchen notice sheet */
export const notice = () =>
  makeTex(256, 180, (g, w, h) => {
    g.fillStyle = "#fffdf4"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#c2272d"; g.textAlign = "center";
    g.font = `bold 26px ${SANS}`; g.fillText("PLEASE WASH", w / 2, 42); g.fillText("YOUR MUGS!", w / 2, 74);
    g.fillStyle = "#222"; g.font = `16px ${SANS}`; g.fillText("Your mother doesn't work here.", w / 2, 108);
    g.fillText("Fridge is cleaned every Friday.", w / 2, 132);
    g.font = `italic 13px ${SANS}`; g.fillText("— The Management", w / 2, 160);
  });

/** wall calendar */
export const calendar = () =>
  makeTex(128, 160, (g, w) => {
    g.fillStyle = "#fff"; g.fillRect(0, 0, w, 160);
    const gr = g.createLinearGradient(0, 0, 0, 70);
    gr.addColorStop(0, "#6aa0d8"); gr.addColorStop(1, "#2a5a3a");
    g.fillStyle = gr; g.fillRect(4, 4, w - 8, 66);
    g.fillStyle = "#c2272d"; g.font = `bold 11px ${SANS}`; g.fillText("SEPTEMBER 2026", 10, 84);
    g.strokeStyle = "#bbb";
    for (let j = 0; j < 5; j++) for (let i = 0; i < 7; i++) g.strokeRect(6 + i * 16.5, 90 + j * 13, 16.5, 13);
    g.fillStyle = "#444"; g.font = `7px ${SANS}`;
    for (let d = 1; d <= 30; d++) { const c = (d + 1) % 7, rrw = Math.floor((d + 1) / 7); g.fillText(String(d), 8 + c * 16.5, 98 + rrw * 13); }
    g.strokeStyle = "#c2272d"; g.lineWidth = 1.5; g.beginPath(); g.arc(14 + 6 * 16.5 - 8, 94 + 3 * 13, 7, 0, Math.PI * 2); g.stroke();
  });

/** binders on a shelf: spines with labels */
export const binders = () =>
  makeTex(256, 128, (g, w, h) => {
    const r = rng(37);
    const cols = ["#1d3f7a", "#b02a2a", "#2a6a3a", "#e0b020", "#303030", "#6a3a8a", "#e8e8e0", "#2a7aa0"];
    const labels = ["2024", "HR", "TAX", "Q1", "Q2", "Q3", "LEGAL", "IT", "SALES", "2025", "MISC", "OPS"];
    let x = 0, i = 0;
    while (x < w) {
      const bw = 18 + r() * 8;
      g.fillStyle = cols[Math.floor(r() * cols.length)]; g.fillRect(x, 0, bw - 1, h);
      g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(x + 1, 0, 2, h);
      g.fillStyle = "#f4f2ea"; g.fillRect(x + 3, 20, bw - 7, 34);
      g.fillStyle = "#222"; g.save(); g.translate(x + bw / 2 + 2, 52); g.rotate(-Math.PI / 2); g.font = `bold 9px ${SANS}`; g.fillText(labels[i++ % labels.length], 0, 0); g.restore();
      g.fillStyle = "#111"; g.beginPath(); g.arc(x + bw / 2, h - 26, 3.5, 0, Math.PI * 2); g.fill();
      x += bw;
    }
  });

/** vending machine front */
export const vending = () =>
  makeTex(256, 512, (g, w, h) => {
    const r = rng(43);
    g.fillStyle = "#15171b"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#c2272d"; g.fillRect(0, 0, w, 56);
    g.fillStyle = "#fff"; g.font = `bold 34px ${SANS}`; g.fillText("SNACKS", 20, 40);
    g.fillStyle = "#23262c"; g.fillRect(12, 66, 170, 380);
    const pc = ["#e8402a", "#f0c020", "#2a70d0", "#30a050", "#f080a0", "#8a4a20", "#f0f0f0", "#7a30a0"];
    for (let row = 0; row < 6; row++) {
      for (let i = 0; i < 5; i++) {
        const c = pc[Math.floor(r() * pc.length)];
        g.fillStyle = c; rrect(g, 18 + i * 33, 76 + row * 62, 26, 44, 4); g.fill();
        g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(22 + i * 33, 84 + row * 62, 18, 6);
      }
      g.fillStyle = "#777"; g.fillRect(14, 124 + row * 62, 166, 3);
      g.fillStyle = "#cfcfcf"; for (let i = 0; i < 5; i++) g.fillRect(24 + i * 33, 128 + row * 62, 14, 5);
    }
    g.fillStyle = "#2c3036"; g.fillRect(192, 66, 54, 200);
    g.fillStyle = "#6aff9a"; g.fillRect(198, 76, 42, 18);
    g.fillStyle = "#999"; for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) g.fillRect(200 + i * 13, 106 + j * 14, 10, 10);
    g.fillStyle = "#050505"; g.fillRect(24, 460, 150, 40);
  });

/** foosball pitch */
export const pitch = () =>
  makeTex(256, 128, (g, w, h) => {
    const r = rng(3);
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#2f7a3a" : "#348441"; g.fillRect((i * w) / 8, 0, w / 8, h); }
    specks(g, w, h, r, 1500, 0.08);
    g.strokeStyle = "#f2f2f2"; g.lineWidth = 2.5;
    g.strokeRect(6, 6, w - 12, h - 12);
    g.beginPath(); g.moveTo(w / 2, 6); g.lineTo(w / 2, h - 6); g.stroke();
    g.beginPath(); g.arc(w / 2, h / 2, 18, 0, Math.PI * 2); g.stroke();
    g.strokeRect(6, h / 2 - 28, 26, 56); g.strokeRect(w - 32, h / 2 - 28, 26, 56);
  });

/** round clock face */
export const clockFace = () =>
  makeTex(128, 128, (g, w, h) => {
    g.fillStyle = "#fbfbf8"; g.fillRect(0, 0, w, h);
    g.translate(w / 2, h / 2);
    g.fillStyle = "#222";
    for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2; const big = i % 5 === 0; g.save(); g.rotate(a); g.fillRect(-(big ? 2 : 0.7), -58, big ? 4 : 1.4, big ? 10 : 4); g.restore(); }
    g.font = `bold 13px ${SANS}`; g.textAlign = "center";
    for (let n = 1; n <= 12; n++) { const a = (n / 12) * Math.PI * 2; g.fillText(String(n), Math.sin(a) * 38, -Math.cos(a) * 38 + 5); }
    g.lineCap = "round";
    g.lineWidth = 4; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.sin(5.2) * 26, -Math.cos(5.2) * 26); g.stroke();
    g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.sin(1.2) * 40, -Math.cos(1.2) * 40); g.stroke();
    g.strokeStyle = "#c2272d"; g.lineWidth = 1; g.beginPath(); g.moveTo(0, 8); g.lineTo(Math.sin(3.4) * 44, -Math.cos(3.4) * 44); g.stroke();
  });

/** desk photo frames atlas (4 small photos, 64×48 each in a 256×48 strip) */
export const photos = () =>
  makeTex(256, 48, (g) => {
    const r = rng(47);
    const skies = [["#ff9a5a", "#5a2a6a"], ["#7fc0ff", "#e0f0ff"], ["#9ad0ff", "#3a8a4a"], ["#f0e0c0", "#c09060"]];
    for (let i = 0; i < 4; i++) {
      const x = i * 64;
      const gr = g.createLinearGradient(0, 0, 0, 48);
      gr.addColorStop(0, skies[i][0]); gr.addColorStop(1, skies[i][1]);
      g.fillStyle = gr; g.fillRect(x, 0, 64, 48);
      if (i === 0) { g.fillStyle = "#ffd070"; g.beginPath(); g.arc(x + 32, 30, 8, 0, Math.PI * 2); g.fill(); g.fillStyle = "#2a3a5a"; g.fillRect(x, 32, 64, 16); }
      if (i === 2) { g.fillStyle = "#2a5a2a"; g.beginPath(); g.moveTo(x, 48); g.lineTo(x + 22, 18); g.lineTo(x + 40, 34); g.lineTo(x + 52, 22); g.lineTo(x + 64, 48); g.fill(); }
      const n = i === 3 ? 1 : 2 + Math.floor(r() * 2);
      for (let p = 0; p < n; p++) {
        const px = x + 14 + p * (40 / n) + r() * 4;
        g.fillStyle = "rgba(20,20,30,0.85)";
        g.beginPath(); g.arc(px, 24, 4.5, 0, Math.PI * 2); g.fill();
        g.fillRect(px - 5, 29, 10, 16);
      }
      if (i === 3) { g.fillStyle = "#8a5a2a"; g.beginPath(); g.ellipse(x + 40, 36, 14, 8, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(x + 52, 28, 6, 0, Math.PI * 2); g.fill(); }
      g.strokeStyle = "#fff"; g.lineWidth = 3; g.strokeRect(x + 1.5, 1.5, 61, 45);
    }
  });

// ---------------------------------------------------------------- decals (used with alpha blending)

/** coffee-cup ring stain */
export const ring = () =>
  makeTex(64, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const r = rng(9);
    for (let i = 0; i < 3; i++) {
      g.strokeStyle = `rgba(95,55,25,${0.35 + r() * 0.3})`;
      g.lineWidth = 1.5 + r() * 2.5;
      g.beginPath(); g.arc(32 + (r() - 0.5) * 4, 32 + (r() - 0.5) * 4, 22 + r() * 5, r() * 6, r() * 6 + 4 + r() * 2); g.stroke();
    }
    const gr = g.createRadialGradient(32, 32, 4, 32, 32, 24);
    gr.addColorStop(0, "rgba(110,70,30,0.12)"); gr.addColorStop(1, "rgba(110,70,30,0)");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });

/** blotchy floor stain (coffee / dirt) */
export const stain = (seed = 3) =>
  makeTex(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const r = rng(seed);
    for (let i = 0; i < 14; i++) {
      const x = 64 + (r() - 0.5) * 60, y = 64 + (r() - 0.5) * 60, rad = 8 + r() * 26;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, `rgba(60,40,20,${0.2 + r() * 0.25})`);
      gr.addColorStop(1, "rgba(60,40,20,0)");
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    g.strokeStyle = "rgba(50,30,15,0.25)"; g.lineWidth = 1.2;
    g.beginPath(); g.arc(64, 64, 34 + r() * 10, 0, Math.PI * 1.6); g.stroke();
  });

/** dust / dirt gradient for the floor along the skirting (u along the wall, v away from it) */
export const dust = () =>
  makeTex(128, 32, (g, w, h) => {
    const r = rng(15);
    const gr = g.createLinearGradient(0, h, 0, 0);
    gr.addColorStop(0, "rgba(40,32,22,0.55)"); gr.addColorStop(0.5, "rgba(40,32,22,0.15)"); gr.addColorStop(1, "rgba(40,32,22,0)");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 200; i++) { g.fillStyle = `rgba(30,25,20,${r() * 0.3})`; g.fillRect(r() * w, h - r() * r() * h, 1, 1); }
  });

/** scuff marks for skirting boards / walls (chair bumps) */
export const scuffs = () =>
  makeTex(256, 32, (g, w, h) => {
    g.fillStyle = "#2a2b2d"; g.fillRect(0, 0, w, h);
    const r = rng(21);
    for (let i = 0; i < 40; i++) {
      g.strokeStyle = `rgba(${r() < 0.5 ? "200,200,200" : "0,0,0"},${0.1 + r() * 0.25})`;
      g.lineWidth = 0.5 + r() * 1.5;
      const x = r() * w, y = r() * h;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + 6 + r() * 20, y + (r() - 0.5) * 4); g.stroke();
    }
    g.fillStyle = "rgba(255,255,255,0.08)"; g.fillRect(0, 0, w, 2);
  });

/** cubicle name plates atlas: 2×8 cells of 128×32 */
export const names = () =>
  makeTex(256, 256, (g) => {
    const list = ["TOM KODNER", "A. PATEL", "M. GARCIA", "K. TANAKA", "L. COHEN", "S. MÜLLER", "D. KIM", "R. SILVA", "E. BROWN", "N. ROSSI", "T. NGUYEN", "P. DUBOIS", "H. SATO", "O. LEVI", "C. JONES", "VACANT"];
    list.forEach((s, i) => {
      const x = (i % 2) * 128, y = Math.floor(i / 2) * 32;
      g.fillStyle = "#2b2f36"; g.fillRect(x, y, 128, 32);
      g.fillStyle = "#c8ccd2"; g.fillRect(x + 2, y + 2, 124, 28);
      g.fillStyle = "#1a1d22"; g.font = `bold 15px ${SANS}`; g.textAlign = "center"; g.fillText(s, x + 64, y + 22); g.textAlign = "left";
    });
  });

/** readable sticky notes atlas: 4×4 cells of 64 px, dark handwriting on white (tinted by the material colour) */
export const STICKY_TEXT = [
  ["call Dana", "re: budget"], ["LUNCH", "12:30 !!"], ["backup the", "server!"], ["standup", "9:30 daily"],
  ["Tom: ask IT", "about VPN"], ["fix bug", "#482"], ["buy milk", "+ coffee"], ["DON'T", "FORGET!"],
  ["demo", "Fri 3pm"], ["pay", "invoice"], ["mom's", "birthday"], ["ext. 214", "(Sara)"],
  ["wifi pwd:", "coffee123"], ["TODO:", "slides"], ["review", "PR #77"], [":)", "thanks!"],
];
export const stickyText = () =>
  makeTex(256, 256, (g) => {
    const r = rng(77);
    STICKY_TEXT.forEach(([a, b], i) => {
      const x = (i % 4) * 64, y = Math.floor(i / 4) * 64;
      g.fillStyle = "#fbfbf6"; g.fillRect(x, y, 64, 64);
      g.fillStyle = "rgba(0,0,0,0.07)"; g.fillRect(x, y, 64, 10);
      g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(x + 61, y, 3, 64); g.fillRect(x, y + 61, 64, 3);
      g.fillStyle = i % 5 === 3 ? "#b0201e" : "#1b2a6a";
      g.textAlign = "center";
      for (const [t, yy] of [[a, 30], [b, 48]] as [string, number][]) {
        let fs = 15;
        g.font = `bold ${fs}px ${HAND}`;
        while (g.measureText(t).width > 58 && fs > 8) { fs--; g.font = `bold ${fs}px ${HAND}`; }
        g.save(); g.translate(x + 32, y + yy); g.rotate((r() - 0.5) * 0.08); g.fillText(t, 0, 0); g.restore();
      }
      g.textAlign = "left";
    });
  });

/** two readable A4 pages side by side (256×362 each): a memo from Tom Kodner and a letter */
export const docs = () =>
  makeTex(512, 362, (g) => {
    const page = (x: number) => { g.fillStyle = "#fcfbf7"; g.fillRect(x, 0, 256, 362); g.fillStyle = "rgba(0,0,0,0.08)"; g.fillRect(x + 255, 0, 1, 362); };
    const lines = (x: number, y: number, arr: string[], size = 10, col = "#222", lh = 14) => {
      g.fillStyle = col; g.font = `${size}px ${SANS}`;
      arr.forEach((t, i) => g.fillText(t, x, y + i * lh));
    };
    // memo
    page(0);
    g.fillStyle = "#1a2a4a"; g.font = `bold 30px ${SANS}`; g.fillText("MEMO", 18, 44);
    g.fillStyle = "#e0602a"; g.fillRect(18, 52, 220, 3);
    g.fillStyle = "#222"; g.font = `bold 11px ${SANS}`;
    ["FROM:", "TO:", "DATE:", "RE:"].forEach((t, i) => g.fillText(t, 18, 76 + i * 16));
    lines(64, 76, ["Tom Kodner, Office Manager", "All staff", "September 26, 2026", "Friday demo + kitchen rules"], 11, "#222", 16);
    g.fillStyle = "#999"; g.fillRect(18, 132, 220, 1);
    lines(18, 152, [
      "Hi team,",
      "",
      "The client demo is on Friday at 3 pm in",
      "the Boardroom. Please keep the meeting",
      "room tidy and book it in the calendar.",
      "",
      "Kitchen: label your food and wash your",
      "mugs. The fridge is emptied every Friday.",
      "",
      "Printer 2 is OUT OF ORDER again - use",
      "Printer 1 until IT fixes it.",
      "",
      "Thanks for all the hard work!",
    ], 10, "#222", 13);
    g.fillStyle = "#1b2a6a"; g.font = `italic bold 18px ${HAND}`; g.fillText("Tom Kodner", 22, 336);
    // letter
    page(256);
    g.fillStyle = "#2a6a4a"; g.font = `bold 14px ${SANS}`; g.fillText("GREENLEAF SUPPLY CO.", 274, 34);
    lines(274, 48, ["12 Harbour Street, Springfield"], 8, "#666");
    g.fillStyle = "#2a6a4a"; g.fillRect(274, 56, 220, 1.5);
    lines(274, 80, ["Mr. Tom Kodner", "Meeting Room Co.", "Warehouse Lofts, 3rd floor"], 10, "#222", 13);
    lines(274, 136, [
      "Dear Mr. Kodner,",
      "",
      "Thank you for your order of 40 office",
      "chairs and 12 desk plants. Delivery is",
      "planned for Monday morning between",
      "9 and 11 am.",
      "",
      "Please make sure the freight elevator",
      "is available. Invoice #2291 is enclosed.",
      "",
      "Kind regards,",
    ], 10, "#222", 13);
    g.fillStyle = "#1b2a6a"; g.font = `italic bold 16px ${HAND}`; g.fillText("Linda Park", 278, 300);
    lines(278, 316, ["Linda Park, Sales"], 9, "#444");
  });

/** cork board texture */
export const cork = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(61);
    g.fillStyle = "#b58a5a"; g.fillRect(0, 0, w, h);
    specks(g, w, h, r, 9000, 0.25, 2, 2);
    blotches(g, w, h, r, 12, 0.12, 40);
  });
