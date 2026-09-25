// Art Museum — canvas textures + a small batching toolkit ("Art") shared with the Art Gallery map.
// Everything is merged into ONE mesh per material (few draw calls), textured surfaces get world-scale UVs.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { makeTex, type PaintTex } from "../../textures";
import { PAINTINGS, pickPainting, realPaintingTex } from "../../paintings";
import type { Kit, Mat } from "../kit";

export type { PaintTex };
export type V3 = [number, number, number];
type G = CanvasRenderingContext2D;

// ---------------------------------------------------------------- texture helpers
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
export function specks(g: G, w: number, h: number, r: () => number, n: number, amt: number, size = 2) {
  const Q = 10;
  const buckets: number[][] = Array.from({ length: Q * 2 + 1 }, () => []);
  for (let i = 0; i < n; i++) {
    const v = (r() - 0.5) * 2;
    buckets[Math.round(v * Q) + Q].push(r() * w, r() * h, 1 + r() * size);
  }
  buckets.forEach((b, bi) => {
    if (!b.length) return;
    const v = ((bi - Q) / Q) * amt;
    g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
    for (let i = 0; i < b.length; i += 3) g.fillRect(b[i], b[i + 1], b[i + 2], b[i + 2]);
  });
}
export function blotches(g: G, w: number, h: number, r: () => number, n: number, amt: number, rad: number, dark = 0.5) {
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h, rr = rad * (0.4 + r());
    const a = amt * (0.3 + r() * 0.7);
    const col = r() < dark ? "0,0,0" : "255,255,255";
    for (const ox of [-w, 0, w])
      for (const oy of [-h, 0, h]) {
        const cx = x + ox, cy = y + oy;
        if (cx + rr < 0 || cx - rr > w || cy + rr < 0 || cy - rr > h) continue;
        const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rr);
        gr.addColorStop(0, `rgba(${col},${a})`);
        gr.addColorStop(1, `rgba(${col},0)`);
        g.fillStyle = gr;
        g.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
      }
  }
}
/** fast Sobel normal map (DataTexture) — set on the PaintTex so Kit.mat reuses it */
export function fastNormal(t: PaintTex): THREE.Texture {
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
  return tex;
}
const shade = (base: string, dl: number) => {
  const c = new THREE.Color(base);
  c.offsetHSL(0, 0, dl);
  return `#${c.getHexString()}`;
};

// ---------------------------------------------------------------- textures
/** polished marble tiles: n×n tiles per texture, each with its own vein direction */
export const marbleTiles = (base: string, vein: string, n = 2, seed = 3, grout = "rgba(60,50,40,0.35)", alt?: string, size = 256) =>
  makeTex(size, size, (g, w, h) => {
    const r = rng(seed);
    const s = w / n;
    for (let ty = 0; ty < n; ty++)
      for (let tx = 0; tx < n; tx++) {
        g.save();
        g.beginPath();
        g.rect(tx * s, ty * s, s, s);
        g.clip();
        const b = alt && (tx + ty) % 2 ? alt : base;
        g.fillStyle = shade(b, (r() - 0.5) * 0.04);
        g.fillRect(tx * s, ty * s, s, s);
        blotchesIn(g, tx * s, ty * s, s, r, 4, 0.06);
        const ang = r() * Math.PI;
        for (let i = 0; i < 9; i++) {
          g.strokeStyle = vein;
          g.globalAlpha = 0.12 + r() * 0.4;
          g.lineWidth = (0.5 + r() * 2.2) * (s / 256);
          g.beginPath();
          let x = tx * s + r() * s, y = ty * s + r() * s;
          const dx = Math.cos(ang), dy = Math.sin(ang);
          x -= dx * s; y -= dy * s;
          g.moveTo(x, y);
          for (let k = 0; k < 16; k++) {
            x += dx * s * 0.14 + (r() - 0.5) * s * 0.06;
            y += dy * s * 0.14 + (r() - 0.5) * s * 0.06;
            g.lineTo(x, y);
          }
          g.stroke();
        }
        g.globalAlpha = 1;
        g.restore();
      }
    g.strokeStyle = grout;
    g.lineWidth = 2;
    for (let i = 0; i <= n; i++) {
      g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke();
      g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke();
    }
  });
function blotchesIn(g: G, x0: number, y0: number, s: number, r: () => number, n: number, amt: number) {
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * s, y = y0 + r() * s, rr = s * (0.15 + r() * 0.35);
    const gr = g.createRadialGradient(x, y, 0, x, y, rr);
    const c = r() < 0.5 ? "0,0,0" : "255,255,255";
    gr.addColorStop(0, `rgba(${c},${amt})`);
    gr.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = gr;
    g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
}
/** warm stucco / plaster wall */
export const plaster = (base: string, seed = 7, amt = 0.07) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 26, amt, 40);
    specks(g, w, h, r, 2600, amt * 0.9, 2);
  });
/** herringbone oak parquet */
export const parquet = (a: string, b: string, seed = 5) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#3a2616";
    g.fillRect(0, 0, w, h);
    const W = 16, L = 128;
    for (let row = 0; row < h / W; row++) {
      const off = Math.floor(r() * L);
      for (let k = -1; k < w / L + 1; k++) {
        const x = off + k * L;
        g.fillStyle = shade(r() < 0.5 ? a : b, (r() - 0.5) * 0.05);
        for (const ox of [0, -w, w]) {
          g.fillRect(x + ox, row * W, L - 1.2, W - 1.2);
        }
        g.fillStyle = "rgba(60,35,15,0.14)";
        const ly = row * W + 3 + r() * 9;
        for (const ox of [0, -w, w]) g.fillRect(x + ox + 3, ly, L - 8, 1);
      }
    }
    blotches(g, w, h, r, 8, 0.05, 30);
    specks(g, w, h, r, 900, 0.05, 1);
  });
/** plain wood grain (benches, wainscot, display bases) */
export const woodGrain = (base: string, line: string, seed = 2) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      g.strokeStyle = line;
      g.globalAlpha = 0.08 + r() * 0.25;
      g.lineWidth = 0.5 + r() * 2;
      const y0 = r() * h, a = 2 + r() * 5, ph = r() * 6;
      g.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const y = y0 + Math.sin((x / w) * Math.PI * 2 + ph) * a;
        if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    }
    g.globalAlpha = 1;
    specks(g, w, h, r, 800, 0.05, 1);
  });
/** ornate frame moulding: scrolls, rosettes and a bead row (tiles in both directions) */
export const ornament = (base: string, hi: string, lo: string, seed = 11) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 16, 0.12, 30);
    // scroll waves
    for (const [y0, amp, lw, col] of [[64, 22, 9, lo], [64, 22, 5, hi], [192, 22, 9, lo], [192, 22, 5, hi]] as const) {
      g.strokeStyle = col;
      g.lineWidth = lw;
      g.beginPath();
      for (let x = -8; x <= w + 8; x += 4) {
        const y = y0 + Math.sin((x / w) * Math.PI * 4) * amp;
        if (x === -8) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    }
    // curls
    g.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      for (const y0 of [64, 192]) {
        const cx = i * 64 + 32, cy = y0 + (i % 2 ? -26 : 26);
        g.strokeStyle = hi;
        g.beginPath();
        g.arc(cx, cy, 11, 0, Math.PI * 1.6);
        g.stroke();
        g.fillStyle = hi;
        g.beginPath(); g.arc(cx, cy, 4, 0, Math.PI * 2); g.fill();
      }
    }
    // bead rows
    for (const y of [0, 128]) {
      g.fillStyle = lo;
      g.fillRect(0, y - 9, w, 18);
      for (let x = 4; x < w; x += 16) {
        const gr = g.createRadialGradient(x + 2, y - 2, 1, x + 4, y, 7);
        gr.addColorStop(0, "#fff6d0");
        gr.addColorStop(0.35, hi);
        gr.addColorStop(1, lo);
        g.fillStyle = gr;
        g.beginPath(); g.arc(x + 4, y, 6, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = lo;
      g.fillRect(0, h - 9, w, 9);
    }
    specks(g, w, h, r, 1200, 0.08, 2);
  });
/** fabric / velvet / leather — fine noise */
export const fabric = (base: string, seed = 13, amt = 0.1) =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 10, amt, 22);
    specks(g, w, h, r, 1800, amt, 1);
  });
/** column fluting (native cylinder UVs: u goes around) */
export const flutes = (base: string, n = 20) =>
  makeTex(256, 64, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    const s = w / n;
    for (let i = 0; i < n; i++) {
      const gr = g.createLinearGradient(i * s, 0, (i + 1) * s, 0);
      gr.addColorStop(0, "rgba(255,255,255,0.25)");
      gr.addColorStop(0.15, "rgba(0,0,0,0.05)");
      gr.addColorStop(0.5, "rgba(0,0,0,0.28)");
      gr.addColorStop(0.85, "rgba(0,0,0,0.05)");
      gr.addColorStop(1, "rgba(255,255,255,0.25)");
      g.fillStyle = gr;
      g.fillRect(i * s, 0, s, h);
    }
  });
/** soft radial light pool (additive decal) */
export const glowTex = () =>
  makeTex(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const gr = g.createRadialGradient(w / 2, h * 0.42, 2, w / 2, h / 2, w / 2);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.45, "rgba(255,255,255,0.55)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });
/** little wall label with lines of "text" */
export const placard = () =>
  makeTex(128, 80, (g, w, h) => {
    g.fillStyle = "#f3efe6";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#2a2622";
    g.fillRect(10, 12, 80, 7);
    g.fillStyle = "#6a655d";
    for (let i = 0; i < 5; i++) g.fillRect(10, 28 + i * 9, 60 + ((i * 37) % 45), 4);
  });
/** text sign, native UVs */
export const sign = (bg: string, fg: string, text: string, w = 512, h = 128, font = "bold 64px Georgia, serif", border?: string) =>
  makeTex(w, h, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    if (border) { g.strokeStyle = border; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16); }
    g.fillStyle = fg;
    g.font = font;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, w / 2, h / 2 + 2);
  });
/** museum floor-plan / info board */
export const infoBoard = () =>
  makeTex(256, 320, (g, w, h) => {
    g.fillStyle = "#1d2a33";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#e9e2cf";
    g.font = "bold 26px Georgia, serif";
    g.textAlign = "center";
    g.fillText("FLOOR GUIDE", w / 2, 40);
    const cols = ["#c96d4a", "#6d9ac9", "#86b26b", "#d8b24c", "#9a7bc0", "#666"];
    const rooms = [[20, 70, 70, 90], [95, 70, 66, 90], [166, 70, 70, 90], [20, 165, 70, 80], [95, 165, 66, 60], [166, 165, 70, 80]];
    rooms.forEach(([x, y, rw, rh], i) => { g.fillStyle = cols[i]; g.fillRect(x, y, rw, rh); });
    g.fillStyle = "#e9e2cf";
    g.fillRect(95, 230, 66, 20);
    g.font = "15px sans-serif";
    g.textAlign = "left";
    ["1F  Grand Hall", "W   World Paintings", "E   Meccha Exhibit", "N   World Miniatures"].forEach((t, i) => g.fillText(t, 24, 272 + i * 14));
  });

// ---------------------------------------------------------------- batching toolkit
export type PO = { rx?: number; ry?: number; rz?: number; q?: THREE.Quaternion; s?: V3; uv?: [number, number, number, number]; solid?: boolean; stand?: boolean };
type Buf = { unit: number; shadow: boolean; geos: THREE.BufferGeometry[] };
export type Style = "gold" | "dark" | "black" | "bronze";

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();

const geoCache = new Map<string, THREE.BufferGeometry>();
function cached(key: string, make: () => THREE.BufferGeometry) {
  let g = geoCache.get(key);
  if (!g) {
    const m = make();
    g = m.index ? m.toNonIndexed() : m;
    for (const a of Object.keys(g.attributes)) if (a !== "position" && a !== "normal" && a !== "uv") g.deleteAttribute(a);
    if (geoCache.size > 3000) geoCache.clear();
    geoCache.set(key, g);
  }
  return g;
}
const q3 = (v: number) => Math.round(v * 1000);
export function rboxGeo(w: number, h: number, d: number, round = true) {
  const min = Math.min(w, h, d);
  if (!round || min < 0.07) return cached(`b${q3(w)},${q3(h)},${q3(d)}`, () => new THREE.BoxGeometry(w, h, d));
  return cached(`r${q3(w)},${q3(h)},${q3(d)}`, () => new RoundedBoxGeometry(w, h, d, 1, Math.min(0.025, min * 0.2)));
}
/** rectangular ring (frame moulding) in XY, back at z=0, front at z=depth(+bevel) */
export function ringGeo(ow: number, oh: number, iw: number, ih: number, depth: number, bevel: number) {
  return cached(`ring${q3(ow)},${q3(oh)},${q3(iw)},${q3(ih)},${q3(depth)},${q3(bevel)}`, () => {
    const sh = new THREE.Shape();
    sh.moveTo(-ow / 2, -oh / 2); sh.lineTo(ow / 2, -oh / 2); sh.lineTo(ow / 2, oh / 2); sh.lineTo(-ow / 2, oh / 2); sh.lineTo(-ow / 2, -oh / 2);
    const hole = new THREE.Path();
    hole.moveTo(-iw / 2, -ih / 2); hole.lineTo(-iw / 2, ih / 2); hole.lineTo(iw / 2, ih / 2); hole.lineTo(iw / 2, -ih / 2); hole.lineTo(-iw / 2, -ih / 2);
    sh.holes.push(hole);
    const b = Math.max(0.002, bevel);
    const geo = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelSize: b * 0.8, bevelThickness: b, bevelSegments: 2, curveSegments: 1 });
    geo.translate(0, 0, b);
    return geo;
  });
}
/** cached primitive geometries (keyed by their parameters) */
export const cyGeo = (rt: number, rb: number, h: number, seg: number) => cached(`c${q3(rt)},${q3(rb)},${q3(h)},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg));
export const spGeo = (r: number, ws: number, hs: number) => cached(`s${q3(r)},${ws},${hs}`, () => new THREE.SphereGeometry(r, ws, hs));
export const plGeo = (w: number, h: number) => cached(`p${q3(w)},${q3(h)}`, () => new THREE.PlaneGeometry(w, h));

export class Art {
  k: Kit;
  bufs = new Map<Mat, Buf>();
  decals: { geos: THREE.BufferGeometry[]; mat: THREE.Material }[] = [];
  xf = new THREE.Matrix4();
  private stack: THREE.Matrix4[] = [];
  used = new Set<number>();
  paintMats = new Map<number, Mat>();
  seed = 0;
  // shared prop materials
  gold!: Mat; goldHi!: Mat; goldDark!: Mat; darkFrame!: Mat; bronzeFrame!: Mat; blackFrame!: Mat; liner!: Mat;
  brass!: Mat; chrome!: Mat; blackMetal!: Mat; lens!: Mat; velvet!: Mat; leather!: Mat; benchWood!: Mat; plinthWhite!: Mat;
  placardM!: Mat; glass!: Mat; stoneWhite!: Mat; ceilMetal!: Mat; ceilLens!: Mat;
  glowMat: THREE.MeshBasicMaterial;

  constructor(k: Kit) {
    this.k = k;
    const PL = k.tex("art_plasterN", () => plaster("#e9e9e9", 61, 0.075));
    const FB = k.tex("art_fabricN", () => fabric("#e2e2e2", 83, 0.11));
    const orn = k.tex("artOrnGold", () => ornament("#b58a3a", "#f0cf7a", "#6e4c1c", 11));
    const ornDark = k.tex("artOrnDark", () => ornament("#3b2d20", "#b8914a", "#1c140d", 12));
    const ornBronze = k.tex("artOrnBronze", () => ornament("#5a4630", "#a48a5e", "#2a2016", 14));
    this.gold = this.M(orn, "#ffffff", 0.32, { metalness: 0.85, roughness: 0.38, bump: 1.1 });
    this.goldHi = this.M(orn, "#fff0c0", 0.18, { metalness: 0.95, roughness: 0.28, bump: 1.3 });
    this.goldDark = this.M(null, "#8a6428", 0, { metalness: 0.9, roughness: 0.42 });
    this.darkFrame = this.M(ornDark, "#ffffff", 0.3, { metalness: 0.35, roughness: 0.5, bump: 1.1 });
    this.bronzeFrame = this.M(ornBronze, "#ffffff", 0.3, { metalness: 0.55, roughness: 0.45, bump: 1.1 });
    this.blackFrame = this.M(null, "#16130f", 0, { roughness: 0.45 });
    this.liner = this.M(FB, "#eadcc0", 0.4, { roughness: 0.9, bump: 0.3 });
    this.brass = this.M(null, "#c79a4a", 0, { metalness: 1, roughness: 0.3 });
    this.chrome = this.M(null, "#d8dadc", 0, { metalness: 1, roughness: 0.18 });
    this.blackMetal = this.M(null, "#1d1d1f", 0, { metalness: 0.6, roughness: 0.4 });
    this.lens = this.M(null, "#fff6dc", 0, { emissive: "#fff2d0", emissiveIntensity: 2.2, roughness: 0.3 });
    this.ceilMetal = this.M(null, "#26262a", 0, { metalness: 0.6, roughness: 0.4 });
    this.ceilLens = this.M(null, "#fff6dc", 0, { emissive: "#fff2d0", emissiveIntensity: 2.5, roughness: 0.3 });
    this.velvet = this.M(FB, "#a0182a", 0.3, { roughness: 0.85, bump: 0.4 });
    this.leather = this.M(FB, "#302a26", 0.35, { roughness: 0.55, bump: 0.35 });
    this.benchWood = this.M(k.tex("artWalnut", () => woodGrain("#5a3a22", "#2a180c", 4)), "#ffffff", 1.0, { roughness: 0.5, bump: 0.5 });
    this.plinthWhite = this.M(PL, "#fffbf2", 1.2, { roughness: 0.7, bump: 0.2 });
    this.stoneWhite = this.M(PL, "#fffdf6", 0.6, { roughness: 0.5, bump: 0.25 });
    this.placardM = this.M(k.tex("artPlacard", placard), "#ffffff", 0, { roughness: 0.6, bump: 0 });
    this.glass = this.M(null, "#cfe6ee", 0, { roughness: 0.05, metalness: 0.1, shadow: false });
    Object.assign(this.glass.m, { transparent: true, opacity: 0.22, depthWrite: false });
    const gt = glowTex();
    this.glowMat = new THREE.MeshBasicMaterial({ map: gt.texture, color: "#ffe2b0", transparent: true, opacity: 0.3, depthWrite: false, toneMapped: false });
  }

  /** material registered for batching. unit>0: world-space UVs with that many metres per texture tile; 0 = native UVs */
  M(tex: PaintTex | null, color: string, unit: number, o: { metalness?: number; roughness?: number; emissive?: string; emissiveIntensity?: number; bump?: number; shadow?: boolean } = {}) {
    if (tex && (o.bump ?? 0.55) > 0) fastNormal(tex);
    const m = this.k.mat(tex, color, [1, 1], o);
    this.bufs.set(m, { unit, shadow: o.shadow ?? true, geos: [] });
    return m;
  }
  /** material of a real painting (cached) */
  paintMat(i: number) {
    let m = this.paintMats.get(i);
    if (!m) { m = this.M(realPaintingTex(i), "#ffffff", 0, { roughness: 0.6, bump: 0 }); this.paintMats.set(i, m); }
    return m;
  }

  at(x: number, y: number, z: number, ry: number, fn: () => void) {
    this.stack.push(this.xf.clone());
    _m.makeRotationY(ry).setPosition(x, y, z);
    this.xf.multiply(_m);
    fn();
    this.xf = this.stack.pop()!;
  }

  put(m: Mat, geo: THREE.BufferGeometry, x: number, y: number, z: number, o: PO = {}) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (geo.index || Object.keys(g.attributes).length > 3) for (const key of Object.keys(g.attributes)) if (key !== "position" && key !== "normal" && key !== "uv") g.deleteAttribute(key);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (o.q) _q.copy(o.q);
    else { _e.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0); _q.setFromEuler(_e); }
    _m.compose(_v.set(x, y, z), _q, o.s ? _s.set(o.s[0], o.s[1], o.s[2]) : _s.set(1, 1, 1));
    _m.premultiply(this.xf);
    g.applyMatrix4(_m);
    const b = this.bufs.get(m);
    if (!b) throw new Error("unregistered material");
    const P = g.attributes.position.array as Float32Array;
    const cnt = P.length / 3;
    if (b.unit > 0) {
      const uv = new Float32Array(cnt * 2);
      const inv = 1 / b.unit;
      for (let t = 0; t < cnt; t += 3) {
        const o = t * 3;
        const e1x = P[o + 3] - P[o], e1y = P[o + 4] - P[o + 1], e1z = P[o + 5] - P[o + 2];
        const e2x = P[o + 6] - P[o], e2y = P[o + 7] - P[o + 1], e2z = P[o + 8] - P[o + 2];
        const ax = Math.abs(e1y * e2z - e1z * e2y), ay = Math.abs(e1z * e2x - e1x * e2z), az = Math.abs(e1x * e2y - e1y * e2x);
        const mode = ay >= ax && ay >= az ? 0 : ax >= az ? 1 : 2;
        for (let j = t; j < t + 3; j++) {
          const px = P[j * 3], py = P[j * 3 + 1], pz = P[j * 3 + 2];
          if (mode === 0) { uv[j * 2] = px * inv; uv[j * 2 + 1] = pz * inv; }
          else if (mode === 1) { uv[j * 2] = pz * inv; uv[j * 2 + 1] = py * inv; }
          else { uv[j * 2] = px * inv; uv[j * 2 + 1] = py * inv; }
        }
      }
      g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    } else if (!g.attributes.uv) {
      g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(cnt * 2), 2));
    } else if (o.uv) {
      const U = g.attributes.uv.array as Float32Array;
      for (let i = 0; i < U.length; i += 2) { U[i] = o.uv[0] + U[i] * o.uv[2]; U[i + 1] = o.uv[1] + U[i + 1] * o.uv[3]; }
    }
    b.geos.push(g);
    if (o.solid) {
      g.computeBoundingBox();
      const bb = g.boundingBox!;
      this.k.collider(bb.min.x, bb.max.x, bb.min.z, bb.max.z, bb.min.y, bb.max.y, o.stand ?? true);
    }
    return g;
  }

  // ---- primitives (y = bottom unless noted)
  box(m: Mat, w: number, h: number, d: number, x: number, y: number, z: number, o: PO & { sharp?: boolean } = {}) {
    return this.put(m, rboxGeo(w, h, d, !o.sharp), x, y + h / 2, z, o);
  }
  boxC(m: Mat, w: number, h: number, d: number, x: number, y: number, z: number, o: PO & { sharp?: boolean } = {}) {
    return this.put(m, rboxGeo(w, h, d, !o.sharp), x, y, z, o);
  }
  cyl(m: Mat, rt: number, rb: number, h: number, x: number, y: number, z: number, seg = 20, o: PO = {}) {
    return this.put(m, cyGeo(rt, rb, h, seg), x, y + h / 2, z, o);
  }
  cylC(m: Mat, rt: number, rb: number, h: number, x: number, y: number, z: number, seg = 20, o: PO = {}) {
    return this.put(m, cyGeo(rt, rb, h, seg), x, y, z, o);
  }
  sph(m: Mat, r: number, x: number, y: number, z: number, o: PO = {}, ws = 18, hs = 12) {
    return this.put(m, spGeo(r, ws, hs), x, y, z, o);
  }
  lathe(m: Mat, pts: [number, number][], x: number, y: number, z: number, seg = 24, o: PO = {}) {
    return this.put(m, new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg), x, y, z, o);
  }
  torus(m: Mat, R: number, r: number, x: number, y: number, z: number, o: PO = {}, arc = Math.PI * 2, ts = 32) {
    return this.put(m, new THREE.TorusGeometry(R, r, 8, ts, arc), x, y, z, o);
  }
  tube(m: Mat, pts: V3[], r: number, seg = 16, rs = 8) {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, "centripetal");
    return this.put(m, new THREE.TubeGeometry(curve, seg, r, rs, false), 0, 0, 0);
  }
  /** flat plane facing +z; y = centre */
  plane(m: Mat, w: number, h: number, x: number, y: number, z: number, o: PO = {}) {
    return this.put(m, plGeo(w, h), x, y, z, o);
  }
  col(minX: number, maxX: number, minZ: number, maxZ: number, bottom: number, top: number, stand = true) {
    this.k.collider(minX, maxX, minZ, maxZ, bottom, top, stand);
  }
  /** additive light pool on a surface (not pickable): plane facing +z in the current frame; y = centre */
  glow(w: number, h: number, x: number, y: number, z: number, o: PO = {}, mat: THREE.Material = this.glowMat) {
    const g = new THREE.PlaneGeometry(w, h);
    if (o.q) _q.copy(o.q);
    else { _e.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0); _q.setFromEuler(_e); }
    _m.compose(_v.set(x, y, z), _q, _s.set(1, 1, 1));
    _m.premultiply(this.xf);
    g.applyMatrix4(_m);
    let d = this.decals.find((dd) => dd.mat === mat);
    if (!d) { d = { geos: [], mat }; this.decals.push(d); }
    d.geos.push(g.toNonIndexed());
  }

  // ---- composite props
  /** framed real painting on a wall. Current frame: wall surface at z=0, facing +z; (x,y) = centre of the canvas */
  painting(x: number, y: number, z: number, ry: number, w: number, h: number, style: Style = "gold", o: { idx?: number; light?: boolean; glow?: boolean; label?: boolean; frame?: number } = {}) {
    const i = o.idx ?? pickPainting(w / h, this.used, this.seed++ * 5);
    if (o.idx !== undefined) this.used.add(o.idx);
    const pm = this.paintMat(i);
    const pa = PAINTINGS[i].w / PAINTINGS[i].h, fa = w / h;
    const uw = pa > fa ? fa / pa : 1, vh = pa > fa ? 1 : pa / fa;
    const F = o.frame ?? (style === "black" ? 0.05 : Math.min(0.36, Math.max(0.12, 0.08 + 0.055 * Math.max(w, h))));
    const outer = style === "gold" ? this.gold : style === "dark" ? this.darkFrame : style === "bronze" ? this.bronzeFrame : this.blackFrame;
    const bead = style === "black" ? this.blackFrame : this.goldHi;
    this.at(x, y, z, ry, () => {
      if (style === "black") {
        this.put(this.blackFrame, ringGeo(w + 2 * F, h + 2 * F, w - 0.01, h - 0.01, 0.04, 0.008), 0, 0, 0, { solid: y - h / 2 < 1.6 });
        this.put(this.liner, ringGeo(w + 0.02, h + 0.02, w - 0.005, h - 0.005, 0.01, 0.002), 0, 0, 0.004);
      } else {
        this.put(outer, ringGeo(w + 2 * F, h + 2 * F, w + F * 0.8, h + F * 0.8, 0.05, Math.min(0.035, F * 0.18)), 0, 0, 0, { solid: y - h / 2 < 1.6 });
        this.put(bead, ringGeo(w + F * 0.95, h + F * 0.95, w + F * 0.5, h + F * 0.5, 0.075, 0.018), 0, 0, 0);
        this.put(style === "gold" ? this.gold : this.goldDark, ringGeo(w + F * 0.55, h + F * 0.55, w - 0.012, h - 0.012, 0.04, 0.012), 0, 0, 0);
        // back board so no wall shows through bevel gaps
        this.box(this.goldDark, w + F * 1.6, h + F * 1.6, 0.02, 0, -(h + F * 1.6) / 2, 0.01, { sharp: true });
      }
      this.plane(pm, w, h, 0, 0, 0.03, { uv: [(1 - uw) / 2, (1 - vh) / 2, uw, vh] });
      if (o.label !== false) {
        const ly = Math.min(1.45 - y, -h / 2 - F - 0.25);
        this.box(this.placardM, 0.24, 0.15, 0.012, w / 2 + F + 0.3, ly - 0.075, 0.006, { sharp: true });
      }
      if (o.light) {
        const ty = h / 2 + F + 0.1;
        this.box(this.brass, 0.1, 0.05, 0.03, 0, ty - 0.025, 0.015);
        this.tube(this.brass, [[0, ty, 0.02], [0, ty + 0.12, 0.12], [0, ty + 0.1, 0.24]], 0.012, 8, 6);
        const L = Math.min(1.4, w * 0.55);
        this.cylC(this.brass, 0.035, 0.035, L, 0, ty + 0.08, 0.26, 14, { rz: Math.PI / 2 });
        this.box(this.lens, L - 0.04, 0.01, 0.03, 0, ty + 0.04, 0.27, { sharp: true });
      }
      if (o.glow === true) this.glow((w + 2 * F) * 1.7, (h + 2 * F) * 1.55, 0, h * 0.06, 0.003);
    });
    return i;
  }
  /** ceiling spotlight can aimed at a target (world coords in current frame) */
  spot(x: number, y: number, z: number, tx: number, ty: number, tz: number, m: Mat = this.ceilMetal) {
    const dir = new THREE.Vector3(tx - x, ty - y, tz - z).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
    this.cylC(m, 0.012, 0.012, 0.18, x, y - 0.09, z, 6);
    const c = new THREE.Vector3(x, y - 0.22, z);
    this.put(m, new THREE.CylinderGeometry(0.085, 0.07, 0.24, 16), c.x, c.y, c.z, { q });
    const lp = c.clone().addScaledVector(dir, 0.121);
    this.put(this.ceilLens, new THREE.CylinderGeometry(0.06, 0.06, 0.01, 16), lp.x, lp.y, lp.z, { q });
  }
  /** track rail on the ceiling with n spotlights aimed at a wall line */
  track(x1: number, z1: number, x2: number, z2: number, y: number, targets: V3[]) {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const ry = Math.atan2(-(z2 - z1), x2 - x1);
    this.boxC(this.ceilMetal, len, 0.04, 0.05, (x1 + x2) / 2, y - 0.02, (z1 + z2) / 2, { ry, sharp: true });
    for (const t of targets) {
      // closest point on the rail to the target
      const dx = x2 - x1, dz = z2 - z1;
      const s = Math.max(0.03, Math.min(0.97, ((t[0] - x1) * dx + (t[2] - z1) * dz) / (len * len)));
      this.spot(x1 + dx * s, y - 0.04, z1 + dz * s, t[0], t[1], t[2]);
    }
  }
  /** museum bench (leather cushion on walnut frame); y = 0; long axis = x in local frame */
  bench(x: number, z: number, ry = 0, L = 1.8, cushion: Mat = this.leather) {
    this.at(x, 0, z, ry, () => {
      this.box(cushion, L, 0.1, 0.48, 0, 0.36, 0);
      this.box(this.benchWood, L + 0.04, 0.05, 0.52, 0, 0.31, 0);
      for (const sx of [-1, 1]) {
        this.box(this.benchWood, 0.07, 0.31, 0.46, sx * (L / 2 - 0.12), 0, 0);
        this.box(this.chrome, 0.08, 0.015, 0.47, sx * (L / 2 - 0.12), 0, 0, { sharp: true });
      }
      this.box(this.benchWood, L - 0.3, 0.05, 0.05, 0, 0.1, 0);
    });
    const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry));
    const hx = (L / 2) * c + 0.26 * s, hz = (L / 2) * s + 0.26 * c;
    this.col(x - hx, x + hx, z - hz, z + hz, 0, 0.46, true);
  }
  /** velvet rope line through posts (world coords in current frame) */
  ropeLine(pts: [number, number][], rope: Mat = this.velvet, post: Mat = this.brass) {
    for (const [x, z] of pts) {
      this.lathe(post, [[0.001, 0], [0.17, 0], [0.17, 0.02], [0.12, 0.05], [0.03, 0.07], [0.022, 0.1], [0.022, 0.92], [0.035, 0.94], [0.03, 0.97], [0.001, 0.975]], x, 0, z, 20);
      this.sph(post, 0.045, x, 1.0, z, {}, 14, 10);
      this.col(x - 0.12, x + 0.12, z - 0.12, z + 0.12, 0, 1.02, false);
    }
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      const mid: V3 = [(ax + bx) / 2, 0.66, (az + bz) / 2];
      this.tube(rope, [[ax, 0.9, az], [ax + (bx - ax) * 0.25, 0.73, az + (bz - az) * 0.25], mid, [ax + (bx - ax) * 0.75, 0.73, az + (bz - az) * 0.75], [bx, 0.9, bz]], 0.022, 24, 8);
    }
  }
  /** classic plinth with base + cap mouldings; returns top height */
  plinth(x: number, z: number, w: number, h: number, d = w, m: Mat = this.plinthWhite, ry = 0) {
    this.at(x, 0, z, ry, () => {
      this.box(m, w + 0.08, 0.08, d + 0.08, 0, 0, 0);
      this.box(m, w, h - 0.14, d, 0, 0.08, 0);
      this.box(m, w + 0.06, 0.06, d + 0.06, 0, h - 0.06, 0);
    });
    const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry));
    const hx = ((w + 0.08) / 2) * c + ((d + 0.08) / 2) * s, hz = ((w + 0.08) / 2) * s + ((d + 0.08) / 2) * c;
    this.col(x - hx, x + hx, z - hz, z + hz, 0, h, true);
    return h;
  }
  /** round drum plinth */
  drum(x: number, z: number, r: number, h: number, m: Mat = this.plinthWhite) {
    this.lathe(m, [[0.001, 0], [r + 0.05, 0], [r + 0.05, 0.08], [r, 0.1], [r, h - 0.08], [r + 0.04, h - 0.06], [r + 0.04, h], [0.001, h]], x, 0, z, 32);
    this.col(x - r * 0.9, x + r * 0.9, z - r * 0.9, z + r * 0.9, 0, h, true);
    return h;
  }
  /** fluted classical column (floor to h) */
  column(x: number, z: number, h: number, r: number, shaft: Mat, stone: Mat) {
    this.box(stone, r * 2.5, 0.3, r * 2.5, x, 0, z);
    this.lathe(stone, [[r * 1.18, 0], [r * 1.18, 0.06], [r * 1.25, 0.1], [r * 1.18, 0.16], [r * 1.05, 0.2], [r * 1.1, 0.25], [r, 0.3]], x, 0.3, z, 28);
    this.cyl(shaft, r * 0.92, r, h - 1.3, x, 0.6, z, 28);
    const t = h - 0.7;
    this.lathe(stone, [[r * 0.92, 0], [r * 1.0, 0.06], [r * 0.92, 0.1], [r * 1.05, 0.25], [r * 1.35, 0.42], [r * 1.4, 0.45]], x, t, z, 28);
    this.box(stone, r * 2.9, 0.25, r * 2.9, x, h - 0.25, z);
    this.col(x - r * 1.25, x + r * 1.25, z - r * 1.25, z + r * 1.25, 0, h, false);
  }
  /** potted plant (ficus-like ball of leaves) */
  plant(x: number, z: number, s: number, pot: Mat, leaf: Mat, leaf2: Mat, r = rng(Math.floor(x * 31 + z * 17))) {
    this.lathe(pot, [[0.001, 0], [0.18 * s, 0], [0.22 * s, 0.06 * s], [0.28 * s, 0.5 * s], [0.31 * s, 0.56 * s], [0.29 * s, 0.58 * s], [0.001, 0.57 * s]], x, 0, z, 18);
    this.cyl(this.benchWood, 0.02 * s, 0.03 * s, 0.9 * s, x, 0.55 * s, z, 6);
    for (let i = 0; i < 16; i++) {
      const a = r() * Math.PI * 2, e = r() * 0.9;
      const rr = 0.35 * s * (0.6 + r() * 0.5);
      this.sph(i % 2 ? leaf : leaf2, 0.22 * s, x + Math.cos(a) * rr * Math.cos(e), (1.35 + Math.sin(e) * 0.35 + (r() - 0.5) * 0.2) * s, z + Math.sin(a) * rr * Math.cos(e), { s: [1, 0.6, 1.2], ry: a }, 8, 6);
    }
    this.col(x - 0.3 * s, x + 0.3 * s, z - 0.3 * s, z + 0.3 * s, 0, 0.58 * s, true);
  }
  /** ceiling slab (bottom at y) with rectangular holes [x1,x2,z1,z2] */
  slab(m: Mat, x1: number, x2: number, z1: number, z2: number, y: number, holes: [number, number, number, number][] = [], t = 0.3) {
    const xs = [...new Set([x1, x2, ...holes.flatMap((h) => [h[0], h[1]])])].sort((a, b) => a - b);
    const zs = [...new Set([z1, z2, ...holes.flatMap((h) => [h[2], h[3]])])].sort((a, b) => a - b);
    for (let j = 0; j + 1 < zs.length; j++) {
      let run: number | null = null;
      for (let i = 0; i + 1 < xs.length; i++) {
        const cx = (xs[i] + xs[i + 1]) / 2, cz = (zs[j] + zs[j + 1]) / 2;
        const inHole = holes.some((h) => cx > h[0] && cx < h[1] && cz > h[2] && cz < h[3]);
        if (!inHole && run === null) run = xs[i];
        if ((inHole || i + 2 === xs.length) && run !== null) {
          const end = inHole ? xs[i] : xs[i + 1];
          this.box(m, end - run, t, zs[j + 1] - zs[j], (run + end) / 2, y, (zs[j] + zs[j + 1]) / 2, { sharp: true });
          run = null;
        }
      }
    }
  }
  /** skylight above a slab hole: light well, glass and muntins */
  skylight(x1: number, x2: number, z1: number, z2: number, y: number, well: Mat, frame: Mat, depth = 0.9, nx = 3, nz = 2) {
    const w = x2 - x1, d = z2 - z1, cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
    this.box(well, w + 0.24, depth, 0.12, cx, y, z1 - 0.06, { sharp: true });
    this.box(well, w + 0.24, depth, 0.12, cx, y, z2 + 0.06, { sharp: true });
    this.box(well, 0.12, depth, d, x1 - 0.06, y, cz, { sharp: true });
    this.box(well, 0.12, depth, d, x2 + 0.06, y, cz, { sharp: true });
    const top = y + depth;
    this.box(this.glass, w, 0.02, d, cx, top - 0.02, cz, { sharp: true });
    for (let i = 1; i < nx; i++) this.box(frame, 0.06, 0.1, d, x1 + (w * i) / nx, top - 0.12, cz, { sharp: true });
    for (let j = 1; j < nz; j++) this.box(frame, w, 0.1, 0.06, cx, top - 0.12, z1 + (d * j) / nz, { sharp: true });
    this.box(frame, w, 0.1, 0.08, cx, top - 0.12, z1 + 0.04, { sharp: true });
    this.box(frame, w, 0.1, 0.08, cx, top - 0.12, z2 - 0.04, { sharp: true });
    this.box(frame, 0.08, 0.1, d, x1 + 0.04, top - 0.12, cz, { sharp: true });
    this.box(frame, 0.08, 0.1, d, x2 - 0.04, top - 0.12, cz, { sharp: true });
    // roof cap around the well so no sky leaks at the edges
    this.box(well, w + 0.6, 0.1, 0.3, cx, top, z1 - 0.15, { sharp: true });
    this.box(well, w + 0.6, 0.1, 0.3, cx, top, z2 + 0.15, { sharp: true });
  }

  /** wall along local X with doors; local +z face = side `pos`, -z face = side `neg`. Use wallX/wallZ. */
  private wallLocal(x1: number, x2: number, doors: Door[], neg: Side, pos: Side, h: number, th: number) {
    const ds = [...doors].sort((a, b) => a[0] - b[0]);
    const segs: [number, number][] = [];
    let cur = x1;
    for (const [c, w] of ds) { if (c - w / 2 - cur > 0.01) segs.push([cur, c - w / 2]); cur = c + w / 2; }
    if (x2 - cur > 0.01) segs.push([cur, x2]);
    const half = th / 2;
    for (const [side, sgn] of [[neg, -1], [pos, 1]] as const) {
      const zc = (sgn * half) / 2;
      for (const [a, b] of segs) {
        this.box(side.m, b - a, h, half, (a + b) / 2, 0, zc, { sharp: true, solid: true, stand: false });
        if (side.wains) {
          const wh = side.wainsH ?? 1.1;
          this.box(side.wains, b - a, wh, 0.03, (a + b) / 2, 0, sgn * (half + 0.015), { sharp: true });
          this.box(side.wains, b - a, 0.06, 0.06, (a + b) / 2, wh - 0.03, sgn * (half + 0.03), {});
          for (let px = a + 0.9; px < b - 0.5; px += 1.2) this.box(side.wains, 0.06, wh - 0.3, 0.012, px, 0.2, sgn * (half + 0.036), { sharp: true });
        }
        if (side.base) this.box(side.base, b - a, side.baseH ?? 0.16, 0.045, (a + b) / 2, 0, sgn * (half + 0.022), { sharp: true });
        if (side.dado) this.box(side.dado, b - a, 0.05, 0.03, (a + b) / 2, side.dadoY ?? 0.95, sgn * (half + 0.015), {});
        if (side.crown) {
          this.box(side.crown, b - a, 0.2, 0.05, (a + b) / 2, side.top - 0.2, sgn * (half + 0.025), { sharp: true });
          this.box(side.crown, b - a, 0.07, 0.11, (a + b) / 2, side.top - 0.07, sgn * (half + 0.055), { sharp: true });
          this.box(side.crown, b - a, 0.04, 0.08, (a + b) / 2, side.top - 0.26, sgn * (half + 0.04), {});
        }
      }
      for (const [c, w, dh0] of ds) {
        const dh = dh0 ?? 3.2;
        this.box(side.m, w, h - dh, half, c, dh, zc, { sharp: true, solid: true, stand: false });
        if (side.crown) {
          this.box(side.crown, w, 0.2, 0.05, c, side.top - 0.2, sgn * (half + 0.025), { sharp: true });
          this.box(side.crown, w, 0.07, 0.11, c, side.top - 0.07, sgn * (half + 0.055), { sharp: true });
          this.box(side.crown, w, 0.04, 0.08, c, side.top - 0.26, sgn * (half + 0.04), {});
        }
        if (side.casing) {
          for (const sx of [-1, 1]) this.box(side.casing, 0.16, dh + 0.08, 0.05, c + sx * (w / 2 + 0.08), 0, sgn * (half + 0.025));
          this.box(side.casing, w + 0.48, 0.2, 0.07, c, dh + 0.04, sgn * (half + 0.035));
        }
      }
    }
    // door reveals (jamb linings)
    for (const [c, w, dh0] of ds) {
      const dh = dh0 ?? 3.2;
      const lin = pos.casing ?? pos.m;
      for (const sx of [-1, 1]) this.box(lin, 0.03, dh, th + 0.02, c + sx * (w / 2 - 0.015), 0, 0, { sharp: true });
      this.box(lin, w, 0.03, th + 0.02, c, dh - 0.03, 0, { sharp: true });
    }
  }
  /** wall at z (along x). south = +z face, north = -z face */
  wallX(z: number, x1: number, x2: number, doors: Door[], north: Side, south: Side, h: number, th = 0.3) {
    this.at(0, 0, z, 0, () => this.wallLocal(x1, x2, doors, north, south, h, th));
  }
  /** wall at x (along z). east = +x face, west = -x face */
  wallZ(x: number, z1: number, z2: number, doors: Door[], west: Side, east: Side, h: number, th = 0.3) {
    // rotY(-PI/2): local (u,0,v) -> world (x - v, 0, u): local +z face = world -x (west)
    this.at(x, 0, 0, -Math.PI / 2, () => this.wallLocal(z1, z2, doors, east, west, h, th));
  }

  flush() {
    for (const [m, b] of this.bufs) {
      if (!b.geos.length) continue;
      this.k.merged(b.geos, m, { noShadow: !b.shadow });
    }
    for (const d of this.decals) {
      const geo = mergeSimple(d.geos);
      const mesh = new THREE.Mesh(geo, d.mat);
      mesh.renderOrder = 2;
      this.k.group.add(mesh);
    }
  }
}
export type Door = [number, number, number?];
export type Side = { m: Mat; top: number; wains?: Mat; wainsH?: number; base?: Mat; baseH?: number; crown?: Mat; casing?: Mat; dado?: Mat; dadoY?: number };

function mergeSimple(geos: THREE.BufferGeometry[]) {
  let n = 0;
  for (const g of geos) n += g.attributes.position.count;
  const p = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  let o = 0;
  for (const g of geos) {
    p.set(g.attributes.position.array as Float32Array, o * 3);
    uv.set(g.attributes.uv.array as Float32Array, o * 2);
    o += g.attributes.position.count;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(p, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.computeBoundingSphere();
  return geo;
}
