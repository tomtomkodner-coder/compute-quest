// Cold Storage textures + small shared geometry helpers (also used by the Brick Loft map).
// Everything is drawn on 2D canvases; every generator stays well under 60 ms.
import * as THREE from "three";
import { makeTex, type PaintTex } from "../../textures";
import type { Kit, Mat } from "../kit";

export type G = CanvasRenderingContext2D;
export type BG = THREE.BufferGeometry;
export type V3t = [number, number, number];
const V3 = THREE.Vector3;
export const SANS = `"Helvetica Neue", Arial, "Liberation Sans", sans-serif`;

// ------------------------------------------------------------------ canvas helpers
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
export function specks(g: G, w: number, h: number, r: () => number, n: number, amt: number, sw = 1, sh = 1) {
  const Q = 4;
  const buckets: number[][] = Array.from({ length: Q * 2 + 1 }, () => []);
  for (let i = 0; i < n; i++) buckets[Math.round((r() - 0.5) * 2 * Q) + Q].push(r() * w, r() * h);
  buckets.forEach((b, bi) => {
    if (!b.length) return;
    const v = ((bi - Q) / Q) * amt;
    g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
    for (let i = 0; i < b.length; i += 2) g.fillRect(b[i], b[i + 1], sw, sh);
  });
}
export function blotches(g: G, w: number, h: number, r: () => number, n: number, amt: number, rad: number, col?: string) {
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
export function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}
export function hexShade(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return "#" + ((c(n >> 16) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).padStart(6, "0");
}
/** thin wandering crack line */
export function crack(g: G, r: () => number, x: number, y: number, len: number, a = 0.35) {
  g.strokeStyle = `rgba(20,20,20,${a})`;
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x, y);
  let ang = r() * Math.PI * 2;
  for (let i = 0; i < len; i++) { ang += (r() - 0.5) * 0.9; x += Math.cos(ang) * 4; y += Math.sin(ang) * 4; g.lineTo(x, y); }
  g.stroke();
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
/** make Kit.mat use the fast normal-map generator */
export function patchKit(k: Kit) {
  const kmat = k.mat.bind(k);
  k.mat = (ptex, color, repeat, extra = {}) => {
    if (ptex && (extra.bump ?? (extra.transparent ? 0 : 0.55)) > 0) fastNormal(ptex);
    return kmat(ptex, color, repeat, extra);
  };
}
/** a translucent decal material (grime, frost, stains): soft alpha, no depth write */
export function decalMat(k: Kit, t: PaintTex, color = "#ffffff", opacity = 1, rough = 0.9) {
  const m = k.mat(t, color, [1, 1], { transparent: true, roughness: rough, bump: 0 });
  Object.assign(m.m, { alphaTest: 0.02, depthWrite: false, opacity, side: THREE.FrontSide, polygonOffset: true, polygonOffsetFactor: -2 });
  return m;
}

// ------------------------------------------------------------------ geometry helpers
/** bevelled box with a flat 45° chamfer (44 tris); per-face 0..1 UVs */
export function chamferGeo(w: number, h: number, d: number, r: number) {
  const a = w / 2, b = h / 2, c = d / 2, A = a - r, B = b - r, C = c - r;
  const Pt: number[] = [];
  type P3 = [number, number, number];
  const tri = (p: P3, q: P3, t: P3) => {
    const ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2], vx = t[0] - p[0], vy = t[1] - p[1], vz = t[2] - p[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (nx * (p[0] + q[0] + t[0]) + ny * (p[1] + q[1] + t[1]) + nz * (p[2] + q[2] + t[2]) < 0) Pt.push(...p, ...t, ...q);
    else Pt.push(...p, ...q, ...t);
  };
  const quad = (p: P3, q: P3, t: P3, u: P3) => { tri(p, q, t); tri(p, t, u); };
  for (const s of [-1, 1]) {
    quad([s * a, -B, -C], [s * a, B, -C], [s * a, B, C], [s * a, -B, C]);
    quad([-A, s * b, -C], [A, s * b, -C], [A, s * b, C], [-A, s * b, C]);
    quad([-A, -B, s * c], [A, -B, s * c], [A, B, s * c], [-A, B, s * c]);
  }
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    quad([sx * a, sy * B, -C], [sx * A, sy * b, -C], [sx * A, sy * b, C], [sx * a, sy * B, C]);
    for (const sz of [-1, 1]) tri([sx * a, sy * B, sz * C], [sx * A, sy * b, sz * C], [sx * A, sy * B, sz * c]);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) quad([sx * a, -B, sz * C], [sx * a, B, sz * C], [sx * A, B, sz * c], [sx * A, -B, sz * c]);
  for (const sy of [-1, 1]) for (const sz of [-1, 1]) quad([-A, sy * b, sz * C], [A, sy * b, sz * C], [A, sy * B, sz * c], [-A, sy * B, sz * c]);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(Pt, 3));
  const NN = new Float32Array(Pt.length);
  for (let i = 0; i < Pt.length; i += 3) {
    const ox = Pt[i] - Math.max(-A, Math.min(A, Pt[i])), oy = Pt[i + 1] - Math.max(-B, Math.min(B, Pt[i + 1])), oz = Pt[i + 2] - Math.max(-C, Math.min(C, Pt[i + 2]));
    const il = 1 / (Math.hypot(ox, oy, oz) || 1);
    NN[i] = ox * il; NN[i + 1] = oy * il; NN[i + 2] = oz * il;
  }
  g.setAttribute("normal", new THREE.BufferAttribute(NN, 3));
  const uv = new Float32Array((Pt.length / 3) * 2);
  for (let i = 0; i < Pt.length / 3; i++) {
    const x = Pt[i * 3], y = Pt[i * 3 + 1], z = Pt[i * 3 + 2];
    const ax = Math.abs(NN[i * 3]), ay = Math.abs(NN[i * 3 + 1]), az = Math.abs(NN[i * 3 + 2]);
    if (ax >= ay && ax >= az) { uv[i * 2] = (NN[i * 3] > 0 ? -z : z) / d + 0.5; uv[i * 2 + 1] = y / h + 0.5; }
    else if (ay >= az) { uv[i * 2] = x / w + 0.5; uv[i * 2 + 1] = z / d + 0.5; }
    else { uv[i * 2] = (NN[i * 3 + 2] > 0 ? x : -x) / w + 0.5; uv[i * 2 + 1] = y / h + 0.5; }
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}
const chamferCache = new Map<string, BG>();
export function resetGeoCache() { chamferCache.clear(); }
export function boxGeo(w: number, h: number, d: number) {
  const min = Math.min(w, h, d), max = Math.max(w, h, d);
  if (min < 0.03 || max > 4.5) return new THREE.BoxGeometry(w, h, d);
  const key = `${w.toFixed(3)},${h.toFixed(3)},${d.toFixed(3)}`;
  let g = chamferCache.get(key);
  if (!g) { g = chamferGeo(w, h, d, Math.min(0.018, min * 0.2)); chamferCache.set(key, g); }
  return g.clone();
}
export function place(geo: BG, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, s?: V3t) {
  const m = new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new V3(...(s ?? [1, 1, 1])));
  return geo.applyMatrix4(m);
}
/** stick between two points */
export function beam(a: V3t, b: V3t, r: number, seg = 8, round = true) {
  const va = new V3(...a), vb = new V3(...b);
  const len = va.distanceTo(vb);
  const geo = round ? new THREE.CylinderGeometry(r, r, len, seg, 1, true) : boxGeo(r * 2, len, r * 2);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), vb.clone().sub(va).normalize()));
  const c = va.add(vb).multiplyScalar(0.5);
  geo.translate(c.x, c.y, c.z);
  return geo;
}
export function latheG(pts: [number, number][], seg = 20) {
  return new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg);
}
export function tubeG(pts: V3t[], r: number, seg = 24, radial = 8, closed = false) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new V3(...p)), closed, "centripetal"), seg, r, radial, closed);
}
export function worldUV(geo: BG, unit: number) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  if (!uv || !n) return geo;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ay >= ax && ay >= az) uv.setXY(i, p.getX(i) / unit, p.getZ(i) / unit);
    else if (ax >= az) uv.setXY(i, p.getZ(i) / unit, p.getY(i) / unit);
    else uv.setXY(i, p.getX(i) / unit, p.getY(i) / unit);
  }
  uv.needsUpdate = true;
  return geo;
}
/** minimal non-indexed merge (position/normal/uv) */
export function mergeG(geos: BG[]) {
  const gs = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  let n = 0;
  for (const g of gs) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  let o = 0;
  for (const g of gs) {
    pos.set(g.attributes.position.array as Float32Array, o * 3);
    nor.set(g.attributes.normal.array as Float32Array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array as Float32Array, o * 2);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return out;
}
/** merges every geometry of one material into one mesh */
export class Batch {
  private map = new Map<Mat, BG[]>();
  noShadow = new Set<Mat>();
  add(m: Mat, geo: BG, unit?: number) {
    if (unit) worldUV(geo, unit);
    let l = this.map.get(m);
    if (!l) { l = []; this.map.set(m, l); }
    l.push(geo);
    return geo;
  }
  flush(k: Kit) {
    for (const [m, geos] of this.map) if (geos.length) k.merged(geos, m, { noShadow: this.noShadow.has(m) });
    this.map.clear();
  }
}
export type Inst = { pos: V3t; rotX?: number; rotY?: number; rotZ?: number; scale?: V3t; color?: string };
export class IList {
  list: Inst[] = [];
  constructor(public geo: BG, public mat: Mat, public noShadow = false) {}
  add(x: number, y: number, z: number, s: V3t = [1, 1, 1], color?: string, ry = 0, rx = 0, rz = 0) {
    this.list.push({ pos: [x, y, z], scale: s, color, rotY: ry, rotX: rx, rotZ: rz });
  }
  flush(k: Kit) { if (this.list.length) k.instances(this.geo, this.mat, this.list, { noShadow: this.noShadow }); }
}
/** local placement frame (origin x,z; rotation ry about Y). Local +z = "front". */
export class Fr {
  c: number; s: number;
  constructor(public k: Kit, public B: Batch, public x: number, public z: number, public ry = 0) { this.c = Math.cos(ry); this.s = Math.sin(ry); }
  pt(lx: number, lz: number): [number, number] { return [this.x + lx * this.c + lz * this.s, this.z - lx * this.s + lz * this.c]; }
  put(geo: BG, lx: number, ly: number, lz: number, rx = 0, ry = 0, rz = 0) {
    place(geo, lx, ly, lz, rx, ry, rz);
    geo.applyMatrix4(new THREE.Matrix4().makeRotationY(this.ry));
    geo.translate(this.x, 0, this.z);
    return geo;
  }
  /** box; ly = bottom */
  box(m: Mat, w: number, h: number, d: number, lx: number, ly: number, lz: number, rx = 0, ry = 0, rz = 0) { return this.B.add(m, this.put(boxGeo(w, h, d), lx, ly + h / 2, lz, rx, ry, rz)); }
  cyl(m: Mat, rt: number, rb: number, h: number, lx: number, ly: number, lz: number, seg = 14, rx = 0, rz = 0) { return this.B.add(m, this.put(new THREE.CylinderGeometry(rt, rb, h, seg), lx, ly + h / 2, lz, rx, 0, rz)); }
  geo(m: Mat, g: BG, lx = 0, ly = 0, lz = 0, rx = 0, ry = 0, rz = 0) { return this.B.add(m, this.put(g, lx, ly, lz, rx, ry, rz)); }
  /** stick between local points */
  bar(m: Mat, a: V3t, b: V3t, r: number, seg = 8, round = true) { return this.B.add(m, this.put(beam(a, b, r, seg, round), 0, 0, 0)); }
  /** vertical plane facing local +z; ly = centre */
  plane(m: Mat, w: number, h: number, lx: number, ly: number, lz: number, ry = 0, uv?: [number, number, number, number]) {
    const g = new THREE.PlaneGeometry(w, h);
    if (uv) { const a = g.attributes.uv; for (let i = 0; i < a.count; i++) a.setXY(i, uv[0] + a.getX(i) * uv[2], uv[1] + a.getY(i) * uv[3]); }
    return this.B.add(m, this.put(g, lx, ly, lz, 0, ry, 0));
  }
  col(lx1: number, lx2: number, lz1: number, lz2: number, bottom: number, top: number, standable = true) {
    const xs: number[] = [], zs: number[] = [];
    for (const [a, b] of [[lx1, lz1], [lx2, lz1], [lx1, lz2], [lx2, lz2]]) { const [x, z] = this.pt(a, b); xs.push(x); zs.push(z); }
    this.k.collider(Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs), bottom, top, standable);
  }
  inst(l: IList, lx: number, ly: number, lz: number, s: V3t, color?: string, ry = 0, rx = 0, rz = 0) {
    const [x, z] = this.pt(lx, lz);
    l.add(x, ly, z, s, color, this.ry + ry, rx, rz);
  }
}

// ------------------------------------------------------------------ generic sign / label
export type SignOpt = { bg: string; fg: string; lines: string[]; w?: number; h?: number; border?: string; stripe?: string; icon?: "snow" | "bolt" | "fire" | "arrow" | "hand" | "cross" | "exit" | "none"; bold?: boolean; wear?: number };
export const signTex = (o: SignOpt) =>
  makeTex(o.w ?? 256, o.h ?? 128, (g, w, h) => {
    const r = rng(o.lines.join("").length * 13 + 7);
    g.fillStyle = o.bg;
    g.fillRect(0, 0, w, h);
    if (o.stripe) {
      g.fillStyle = o.stripe;
      for (let x = -h; x < w + h; x += 28) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 14, 0); g.lineTo(x + 14 - h * 0.2, h * 0.2); g.lineTo(x - h * 0.2, h * 0.2); g.fill(); }
      g.fillStyle = o.bg;
    }
    if (o.border) { g.strokeStyle = o.border; g.lineWidth = Math.max(3, h * 0.05); g.strokeRect(h * 0.05, h * 0.05, w - h * 0.1, h - h * 0.1); }
    let x0 = w / 2;
    const icon = o.icon ?? "none";
    if (icon !== "none") {
      const cx = h * 0.5, cy = h * 0.5, s = h * 0.3;
      g.fillStyle = o.fg; g.strokeStyle = o.fg; g.lineWidth = Math.max(2, s * 0.14); g.lineCap = "round";
      if (icon === "snow") { for (let i = 0; i < 3; i++) { const a = (i * Math.PI) / 3; g.beginPath(); g.moveTo(cx - Math.cos(a) * s, cy - Math.sin(a) * s); g.lineTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s); g.stroke(); } }
      else if (icon === "bolt") { g.beginPath(); g.moveTo(cx + s * 0.2, cy - s); g.lineTo(cx - s * 0.5, cy + s * 0.1); g.lineTo(cx, cy + s * 0.1); g.lineTo(cx - s * 0.2, cy + s); g.lineTo(cx + s * 0.5, cy - s * 0.15); g.lineTo(cx, cy - s * 0.15); g.closePath(); g.fill(); }
      else if (icon === "fire") { g.beginPath(); g.moveTo(cx, cy - s); g.quadraticCurveTo(cx + s, cy, cx + s * 0.4, cy + s); g.lineTo(cx - s * 0.4, cy + s); g.quadraticCurveTo(cx - s, cy, cx, cy - s); g.fill(); }
      else if (icon === "arrow") { g.beginPath(); g.moveTo(cx - s, cy - s * 0.3); g.lineTo(cx, cy - s * 0.3); g.lineTo(cx, cy - s); g.lineTo(cx + s, cy); g.lineTo(cx, cy + s); g.lineTo(cx, cy + s * 0.3); g.lineTo(cx - s, cy + s * 0.3); g.fill(); }
      else if (icon === "hand") { g.beginPath(); g.arc(cx, cy + s * 0.2, s * 0.6, 0, Math.PI * 2); g.fill(); for (let i = 0; i < 4; i++) g.fillRect(cx - s * 0.55 + i * s * 0.3, cy - s, s * 0.22, s); }
      else if (icon === "cross") { g.fillRect(cx - s * 0.25, cy - s, s * 0.5, s * 2); g.fillRect(cx - s, cy - s * 0.25, s * 2, s * 0.5); }
      else if (icon === "exit") { g.beginPath(); g.arc(cx + s * 0.1, cy - s * 0.75, s * 0.22, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(cx, cy - s * 0.4); g.lineTo(cx - s * 0.1, cy + s * 0.2); g.lineTo(cx - s * 0.6, cy + s); g.moveTo(cx - s * 0.1, cy + s * 0.2); g.lineTo(cx + s * 0.5, cy + s * 0.9); g.moveTo(cx, cy - s * 0.3); g.lineTo(cx + s * 0.6, cy - s * 0.1); g.moveTo(cx, cy - s * 0.3); g.lineTo(cx - s * 0.6, cy); g.stroke(); }
      x0 = h + (w - h) / 2;
    }
    const n = o.lines.length;
    const avail = icon !== "none" ? w - h * 1.1 : w * 0.9;
    g.fillStyle = o.fg;
    g.textAlign = "center";
    g.textBaseline = "middle";
    o.lines.forEach((s, i) => {
      let size = Math.min((h * 0.78) / n, h * 0.45) * (i === 0 ? 1 : 0.82);
      g.font = `${o.bold === false ? "" : "bold "}${size}px ${SANS}`;
      const mw = g.measureText(s).width;
      if (mw > avail) { size *= avail / mw; g.font = `${o.bold === false ? "" : "bold "}${size}px ${SANS}`; }
      g.fillText(s, x0, h * ((i + 0.5) / n) * (n > 1 ? 0.92 : 1) + (n > 1 ? h * 0.04 : 0));
    });
    const wear = o.wear ?? 0.5;
    specks(g, w, h, r, 900, 0.12 * wear, 1, 1);
    blotches(g, w, h, r, 5, 0.12 * wear, h * 0.4, "60,50,40");
  });

// ------------------------------------------------------------------ cold storage textures
/** grey-green glazed wall tile with an embossed concentric-square pattern (4×4 tiles; tile ≈ 0.2 m → unit 0.8) */
export const csTile = (base = "#9fb0a6", seed = 3) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    const t = w / 4;
    g.fillStyle = "#7c8680";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const x = i * t, y = j * t;
      g.fillStyle = shade(base, 0.92 + r() * 0.14);
      g.fillRect(x + 2, y + 2, t - 3, t - 3);
      for (let q = 1; q <= 3; q++) {
        const m = q * 7;
        g.strokeStyle = `rgba(255,255,255,${0.16 - q * 0.02})`;
        g.lineWidth = 2;
        g.strokeRect(x + m, y + m, t - m * 2, t - m * 2);
        g.strokeStyle = `rgba(0,0,0,${0.12 - q * 0.015})`;
        g.lineWidth = 1.5;
        g.strokeRect(x + m + 2, y + m + 2, t - m * 2, t - m * 2);
      }
      g.fillStyle = "rgba(255,255,255,0.18)";
      g.fillRect(x + 2, y + 2, t - 3, 2);
      if (r() < 0.12) crack(g, r, x + r() * t, y + r() * t, 6, 0.3);
    }
    blotches(g, w, h, r, 14, 0.07, 40, "70,65,40");
    specks(g, w, h, r, 2500, 0.08);
    // drips / streaks
    for (let i = 0; i < 10; i++) { const x = r() * w, y = r() * h; g.fillStyle = `rgba(80,70,40,${0.05 + r() * 0.08})`; g.fillRect(x, y, 1.5, 20 + r() * 60); }
  });
/** worn epoxy / concrete floor with seams, stains, tyre marks (512, unit ≈ 4 m) */
export const csFloor = (base = "#8b9191", seed = 5) =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 30, 0.09, 90);
    blotches(g, w, h, r, 14, 0.12, 40, "40,35,25");
    specks(g, w, h, r, 16000, 0.09);
    specks(g, w, h, r, 1500, 0.14, 2, 2);
    // saw-cut joints (2 m slabs)
    g.fillStyle = "rgba(20,20,20,0.5)";
    g.fillRect(0, h / 2, w, 2); g.fillRect(w / 2, 0, 2, h); g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h);
    g.fillStyle = "rgba(255,255,255,0.12)";
    g.fillRect(0, h / 2 + 2, w, 1); g.fillRect(w / 2 + 2, 0, 1, h);
    for (let i = 0; i < 7; i++) crack(g, r, r() * w, r() * h, 10 + r() * 20, 0.25);
    // tyre marks
    g.lineCap = "round";
    for (let i = 0; i < 5; i++) {
      g.strokeStyle = `rgba(15,15,15,${0.05 + r() * 0.06})`;
      g.lineWidth = 10 + r() * 6;
      g.beginPath();
      const x = r() * w, y = r() * h;
      g.moveTo(x, y);
      g.bezierCurveTo(x + (r() - 0.5) * 400, y + (r() - 0.5) * 400, x + (r() - 0.5) * 400, y + (r() - 0.5) * 400, x + (r() - 0.5) * 500, y + (r() - 0.5) * 500);
      g.stroke();
    }
  });
/** white ribbed insulated sandwich panel (vertical seams every 1 m; unit 2 m) */
export const csPanel = (base = "#e9ecec", seed = 7) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) { g.fillStyle = "rgba(0,0,0,0.05)"; g.fillRect(x, 0, 3, h); g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(x + 3, 0, 1, h); }
    for (const x of [0, w / 2]) { g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(x, 0, 2, h); g.fillStyle = "rgba(255,255,255,0.5)"; g.fillRect(x + 2, 0, 1, h); }
    for (let i = 0; i < 18; i++) { const x = (i % 2 ? w / 2 : 0) + 6, y = r() * h; g.fillStyle = "rgba(0,0,0,0.25)"; g.beginPath(); g.arc(x, y, 1.5, 0, Math.PI * 2); g.fill(); }
    blotches(g, w, h, r, 12, 0.05, 50, "90,90,70");
    specks(g, w, h, r, 1500, 0.05);
  });
/** painted concrete block (0.4 × 0.2 m blocks, 2×4 per texture → unit 0.8) */
export const csBlock = (base = "#b9bdb5", seed = 9) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = shade(base, 0.8);
    g.fillRect(0, 0, w, h);
    const bw = w / 2, bh = h / 4;
    for (let j = 0; j < 4; j++) for (let i = -1; i < 2; i++) {
      const x = i * bw + (j % 2 ? bw / 2 : 0), y = j * bh;
      g.fillStyle = shade(base, 0.95 + r() * 0.08);
      g.fillRect(x + 3, y + 3, bw - 5, bh - 5);
    }
    specks(g, w, h, r, 6000, 0.1, 1, 1);
    specks(g, w, h, r, 800, 0.12, 2, 2);
    blotches(g, w, h, r, 10, 0.06, 50, "60,55,40");
  });
/** brushed stainless steel */
export const csSteel = (seed = 11) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#c7cbce";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { const y = r() * h; g.fillStyle = r() < 0.5 ? `rgba(255,255,255,${r() * 0.12})` : `rgba(0,0,0,${r() * 0.08})`; g.fillRect(r() * w - 60, y, 40 + r() * 160, 1); }
    blotches(g, w, h, r, 8, 0.06, 40);
    for (let i = 0; i < 12; i++) { g.strokeStyle = `rgba(0,0,0,${0.05 + r() * 0.06})`; g.lineWidth = 1; g.beginPath(); const x = r() * w, y = r() * h; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 60, y + (r() - 0.5) * 20); g.stroke(); }
  });
/** painted metal with scuffs and rust (grey base, tint via material colour) */
export const csPaintMetal = (seed = 13, rust = 1) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#e4e4e4";
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 12, 0.08, 50);
    specks(g, w, h, r, 3000, 0.07);
    for (let i = 0; i < 24 * rust; i++) {
      const x = r() * w, y = r() * h, rr = 2 + r() * 10;
      const gr = g.createRadialGradient(x, y, 0, x, y, rr);
      gr.addColorStop(0, "rgba(110,50,20,0.8)"); gr.addColorStop(0.6, "rgba(140,70,30,0.35)"); gr.addColorStop(1, "rgba(140,70,30,0)");
      g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
      if (r() < 0.4) { g.fillStyle = "rgba(110,55,25,0.25)"; g.fillRect(x - 1, y, 2, 10 + r() * 40); }
    }
    for (let i = 0; i < 30; i++) { g.strokeStyle = `rgba(60,60,60,${0.1 + r() * 0.2})`; g.lineWidth = 1; g.beginPath(); const x = r() * w, y = r() * h; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 30, y + (r() - 0.5) * 8); g.stroke(); }
  });
/** marbled raw meat (red flesh, white fat seams) */
export const csMeat = (seed = 17) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#b8343a";
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 30, 0.25, 40, "120,20,30");
    blotches(g, w, h, r, 20, 0.2, 30, "230,120,120");
    g.lineCap = "round";
    for (let i = 0; i < 26; i++) {
      g.strokeStyle = `rgba(245,230,215,${0.5 + r() * 0.4})`;
      g.lineWidth = 1 + r() * 5;
      g.beginPath();
      let x = r() * w, y = r() * h;
      g.moveTo(x, y);
      for (let s = 0; s < 6; s++) { x += (r() - 0.5) * 50; y += (r() - 0.5) * 50; g.lineTo(x, y); }
      g.stroke();
    }
    // fat cap band
    const gr = g.createLinearGradient(0, 0, 0, 40);
    gr.addColorStop(0, "rgba(245,232,215,0.95)"); gr.addColorStop(1, "rgba(245,232,215,0)");
    g.fillStyle = gr; g.fillRect(0, 0, w, 40);
    specks(g, w, h, r, 2500, 0.1);
  });
/** pig-skin / carcass surface: pale pink with fat, a few purple inspection stamps */
export const csCarcass = (seed = 19) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#e7b3a6";
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 26, 0.2, 45, "200,90,90");
    blotches(g, w, h, r, 18, 0.25, 35, "250,235,220");
    for (let i = 0; i < 16; i++) { g.strokeStyle = `rgba(190,90,90,${0.05 + r() * 0.08})`; g.lineWidth = 6 + r() * 10; g.beginPath(); const y = r() * h; g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + (r() - 0.5) * 30, w * 0.6, y + (r() - 0.5) * 30, w, y + (r() - 0.5) * 20); g.stroke(); }
    g.strokeStyle = "rgba(90,40,140,0.55)"; g.lineWidth = 3;
    for (let i = 0; i < 3; i++) { const x = 40 + r() * 170, y = 40 + r() * 170; g.beginPath(); g.ellipse(x, y, 11, 7, 0, 0, Math.PI * 2); g.stroke(); g.font = `bold 7px ${SANS}`; g.fillStyle = "rgba(90,40,140,0.55)"; g.textAlign = "center"; g.fillText("EC 04", x, y + 2.5); }
    specks(g, w, h, r, 2000, 0.08);
  });
/** cut face of a carcass half: dark red muscle, cream rib bones, fat rim (UV: x across, y up) */
export const csRibs = (seed = 20) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#f1e2cf";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#b0383a";
    g.beginPath(); g.ellipse(w / 2, h / 2, w * 0.42, h * 0.48, 0, 0, Math.PI * 2); g.fill();
    blotches(g, w, h, r, 24, 0.25, 26, "90,10,20");
    blotches(g, w, h, r, 14, 0.2, 20, "220,110,110");
    // spine (vertical) + ribs (curved, horizontal)
    g.fillStyle = "rgba(232,214,200,0.8)";
    g.fillRect(w * 0.42, h * 0.06, w * 0.08, h * 0.88);
    for (let y = h * 0.28; y < h * 0.86; y += 13 + r() * 3) {
      g.strokeStyle = `rgba(236,208,196,${0.45 + r() * 0.25})`;
      g.lineWidth = 3 + r() * 2;
      g.beginPath(); g.moveTo(w * 0.46, y); g.quadraticCurveTo(w * 0.7, y + 4, w * 0.86, y + 10 + r() * 6); g.stroke();
      g.beginPath(); g.moveTo(w * 0.46, y); g.quadraticCurveTo(w * 0.25, y + 4, w * 0.14, y + 10 + r() * 6); g.stroke();
    }
    for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(250,238,222,${0.3 + r() * 0.4})`; g.fillRect(r() * w, r() * h, 2 + r() * 8, 1 + r() * 2); }
    specks(g, w, h, r, 2500, 0.1);
  });
/** corrugated cardboard box with printed label (per-face UV) */
export const csCarton = (kind: "beef" | "poultry" | "fish" | "fries" | "plain", seed = 23) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    const white = kind === "poultry" || kind === "fish";
    g.fillStyle = white ? "#e8e6df" : "#b58c5c";
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 10, 0.08, 50, white ? "150,150,140" : "90,60,30");
    specks(g, w, h, r, 3000, 0.06);
    // tape strip
    g.fillStyle = white ? "rgba(200,200,190,0.8)" : "rgba(170,125,70,0.85)";
    g.fillRect(w / 2 - 18, 0, 36, h);
    g.fillStyle = "rgba(255,255,255,0.12)";
    g.fillRect(w / 2 - 18, 0, 36, 3);
    if (kind === "plain") return;
    const col = { beef: "#8e1d20", poultry: "#1f4f9a", fish: "#0f6a7a", fries: "#b8211c" }[kind];
    const title = { beef: "BEEF CUTS", poultry: "CHICKEN", fish: "FISH FILLET", fries: "FRIES 2.5KG" }[kind];
    g.fillStyle = col;
    g.fillRect(20, 60, w - 40, 52);
    g.fillStyle = "#fff";
    g.font = `bold 30px ${SANS}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(title, w / 2, 87, w - 60);
    g.fillStyle = col;
    g.font = `bold 20px ${SANS}`;
    g.fillText("KEEP FROZEN  -18°C", w / 2, 136, w - 50);
    g.font = `15px ${SANS}`;
    g.fillText(`NET WT ${10 + Math.floor(r() * 15)} KG   LOT ${Math.floor(1000 + r() * 8999)}`, w / 2, 164, w - 50);
    // barcode
    g.fillStyle = "#fff"; g.fillRect(60, 180, 136, 44);
    g.fillStyle = "#111";
    for (let x = 66; x < 190; x += 2 + Math.floor(r() * 3)) g.fillRect(x, 184, 1 + Math.floor(r() * 2), 32);
    // arrows
    g.fillStyle = col;
    for (const ax of [28, w - 44]) { g.beginPath(); g.moveTo(ax + 8, 14); g.lineTo(ax + 16, 28); g.lineTo(ax, 28); g.fill(); g.fillRect(ax + 6, 28, 4, 14); }
  });
/** frost overlay: soft white alpha, strongest along the bottom edge (v=0) */
export const csFrost = (seed = 29) =>
  makeTex(256, 128, (g, w, h) => {
    const r = rng(seed);
    const id = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const f = y / h; // canvas y down = v up? canvas row 0 = top = v 1
      const base = Math.pow(f, 1.6);
      const n = r();
      id.data[i] = 235; id.data[i + 1] = 243; id.data[i + 2] = 250;
      id.data[i + 3] = Math.max(0, Math.min(255, (base * 0.9 + (n - 0.5) * 0.35) * 255));
    }
    g.putImageData(id, 0, 0);
    g.globalCompositeOperation = "source-over";
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.4})`; const x = r() * w; g.fillRect(x, h * (0.4 + r() * 0.6), 1, 3 + r() * 20); }
  });
/** dirt / grime overlay for wall bases & corners (dark, strongest at v=0) */
export const csGrime = (seed = 31, col = "40,34,24") =>
  makeTex(256, 64, (g, w, h) => {
    const r = rng(seed);
    const gr = g.createLinearGradient(0, h, 0, 0);
    gr.addColorStop(0, `rgba(${col},0.75)`); gr.addColorStop(0.35, `rgba(${col},0.35)`); gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) { const x = r() * w; g.fillStyle = `rgba(${col},${0.1 + r() * 0.25})`; g.fillRect(x, h * (0.3 + r() * 0.5), 1 + r() * 2, h); }
    blotches(g, w, h, r, 10, 0.25, 20, col);
  });
/** floor stain decal (round, soft) */
export const csStain = (seed = 37, col = "60,45,30") =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(seed);
    for (let i = 0; i < 9; i++) {
      const x = w / 2 + (r() - 0.5) * 50, y = h / 2 + (r() - 0.5) * 50, rr = 12 + r() * 30;
      const gr = g.createRadialGradient(x, y, 0, x, y, rr);
      gr.addColorStop(0, `rgba(${col},${0.25 + r() * 0.3})`); gr.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }
  });
/** wire shelf mesh (alpha grid) */
export const csWire = () =>
  makeTex(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = "#e6e8ea";
    for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 2, h);
    for (let y = 0; y < h; y += 32) g.fillRect(0, y, w, 3);
  });
/** plastic crate side with slots (greyscale, tint per instance) */
export const csCrate = () =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(41);
    g.fillStyle = "#e8e8e8";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#6a6a6a";
    for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) g.fillRect(12 + i * 22, 30 + j * 44, 14, 34);
    g.fillStyle = "#555"; g.fillRect(40, 8, 48, 12);
    g.fillStyle = "rgba(255,255,255,0.4)"; g.fillRect(0, 0, w, 3); g.fillRect(0, h - 4, w, 4);
    specks(g, w, h, r, 800, 0.08);
  });
/** pallet wood (light pine, nails, dirt) */
export const csPallet = (seed = 43) =>
  makeTex(256, 64, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#c7a577";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { g.fillStyle = r() < 0.6 ? `rgba(110,70,30,${0.08 + r() * 0.12})` : `rgba(255,240,210,${0.1})`; const y = r() * h; g.fillRect(0, y, w, 1 + r()); }
    blotches(g, w, h, r, 8, 0.2, 25, "70,50,30");
    g.fillStyle = "#333";
    for (const x of [10, w / 2, w - 12]) for (const y of [h * 0.3, h * 0.7]) g.fillRect(x, y, 3, 3);
    specks(g, w, h, r, 1200, 0.08);
  });
/** stretch wrap (glossy translucent film with wrinkles) */
export const csWrap = () =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(47);
    g.fillStyle = "rgba(230,240,245,0.35)";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.4})`; g.fillRect(0, r() * h, w, 1 + r() * 3); }
    for (let i = 0; i < 12; i++) { g.strokeStyle = `rgba(255,255,255,${0.2 + r() * 0.3})`; g.beginPath(); const y = r() * h; g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y - 10, w * 0.6, y + 10, w, y); g.stroke(); }
  });
/** fan guard (alpha: concentric rings + spokes) */
export const csFanGuard = () =>
  makeTex(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = "#dcdcdc";
    g.lineWidth = 2.5;
    for (let rr = 10; rr < 64; rr += 7) { g.beginPath(); g.arc(64, 64, rr, 0, Math.PI * 2); g.stroke(); }
    for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 4; g.beginPath(); g.moveTo(64 - Math.cos(a) * 62, 64 - Math.sin(a) * 62); g.lineTo(64 + Math.cos(a) * 62, 64 + Math.sin(a) * 62); g.stroke(); }
    g.fillStyle = "#dcdcdc"; g.beginPath(); g.arc(64, 64, 9, 0, Math.PI * 2); g.fill();
  });
/** yellow / black hazard stripes */
export const csHazard = () =>
  makeTex(128, 32, (g, w, h) => {
    const r = rng(53);
    g.fillStyle = "#e8b818"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#1a1a1a";
    for (let x = -h; x < w + h; x += 32) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 16, h); g.lineTo(x + 16 + h, 0); g.lineTo(x + h, 0); g.fill(); }
    specks(g, w, h, r, 600, 0.2, 1, 1);
    blotches(g, w, h, r, 4, 0.2, 14, "50,40,20");
  });
/** roll-up steel shutter (horizontal slats) */
export const csShutter = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(59);
    g.fillStyle = "#9aa3a8"; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) {
      const gr = g.createLinearGradient(0, y, 0, y + 16);
      gr.addColorStop(0, "rgba(255,255,255,0.3)"); gr.addColorStop(0.5, "rgba(0,0,0,0)"); gr.addColorStop(0.9, "rgba(0,0,0,0.25)"); gr.addColorStop(1, "rgba(0,0,0,0.5)");
      g.fillStyle = gr; g.fillRect(0, y, w, 16);
    }
    blotches(g, w, h, r, 14, 0.1, 40, "90,70,50");
    specks(g, w, h, r, 2500, 0.08);
  });
/** strip curtain PVC (translucent blue-ish, faint ribs) */
export const csStrip = () =>
  makeTex(64, 128, (g, w, h) => {
    g.fillStyle = "rgba(205,225,235,0.55)"; g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(255,255,255,0.5)"; g.fillRect(4, 0, 3, h); g.fillRect(w - 8, 0, 3, h);
    g.fillStyle = "rgba(120,130,120,0.35)"; g.fillRect(0, h - 20, w, 20);
  });
/** clipboard / paper forms */
export const csPaper = (seed = 61) =>
  makeTex(128, 160, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#f4f2ea"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#222"; g.font = `bold 11px ${SANS}`; g.fillText("TEMP LOG", 10, 18);
    g.strokeStyle = "rgba(40,60,120,0.5)"; g.lineWidth = 1;
    for (let y = 30; y < h - 8; y += 9) { g.beginPath(); g.moveTo(8, y); g.lineTo(w - 8, y); g.stroke(); }
    g.beginPath(); g.moveTo(44, 26); g.lineTo(44, h - 8); g.moveTo(84, 26); g.lineTo(84, h - 8); g.stroke();
    g.fillStyle = "rgba(20,40,140,0.8)"; g.font = `9px ${SANS}`;
    for (let y = 37; y < h - 10; y += 9) if (r() < 0.8) { g.fillText(`${6 + Math.floor(r() * 12)}:${r() < 0.5 ? "00" : "30"}`, 12, y); g.fillText(`-${18 + Math.floor(r() * 7)}°`, 52, y); g.fillText("ok", 92, y); }
  });
/** whiteboard with delivery schedule */
export const csWhiteboard = () =>
  makeTex(256, 160, (g, w, h) => {
    const r = rng(67);
    g.fillStyle = "#f3f5f4"; g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 8, 0.05, 40, "120,130,160");
    g.textBaseline = "alphabetic";
    g.fillStyle = "#1d3fa0"; g.font = `bold 18px ${SANS}`; g.fillText("DELIVERIES", 12, 24);
    g.font = `13px ${SANS}`;
    const rows = [["MON", "Beef x12 pal", "#1d3fa0"], ["TUE", "Poultry x8", "#1d3fa0"], ["WED", "FISH - late!", "#c0262b"], ["THU", "Fries x20", "#1d3fa0"], ["FRI", "DEFROST RM 3", "#1a7a3a"]];
    rows.forEach(([d, t, c], i) => { g.fillStyle = c; g.fillText(d, 14, 48 + i * 22); g.fillText(t, 64, 48 + i * 22); });
    g.strokeStyle = "#c0262b"; g.lineWidth = 2; g.beginPath(); g.ellipse(200, 120, 40, 22, 0, 0, Math.PI * 2); g.stroke();
    g.fillStyle = "#c0262b"; g.font = `bold 13px ${SANS}`; g.fillText("-25°C!!", 176, 125);
  });
/** electrical panel door: grey with warning label + vents */
export const csPanelDoor = (label: string) =>
  makeTex(128, 256, (g, w, h) => {
    const r = rng(label.length * 5 + 71);
    g.fillStyle = "#b9bdb9"; g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(0,0,0,0.3)"; for (let y = h - 60; y < h - 20; y += 6) g.fillRect(24, y, w - 48, 3);
    g.fillStyle = "#f2c21b"; g.beginPath(); g.moveTo(w / 2, 22); g.lineTo(w / 2 + 26, 66); g.lineTo(w / 2 - 26, 66); g.closePath(); g.fill();
    g.fillStyle = "#111"; g.beginPath(); g.moveTo(w / 2 + 3, 34); g.lineTo(w / 2 - 7, 52); g.lineTo(w / 2, 52); g.lineTo(w / 2 - 3, 62); g.lineTo(w / 2 + 8, 46); g.lineTo(w / 2 + 1, 46); g.fill();
    g.fillStyle = "#f4f4f0"; g.fillRect(14, 80, w - 28, 36);
    g.fillStyle = "#111"; g.font = `bold 13px ${SANS}`; g.textAlign = "center"; g.fillText(label, w / 2, 103, w - 32);
    blotches(g, w, h, r, 8, 0.08, 30, "70,60,40");
    specks(g, w, h, r, 1500, 0.07);
  });
/** round thermometer dial / temp display */
export const csDial = () =>
  makeTex(128, 128, (g, w, h) => {
    g.fillStyle = "#f5f5f0"; g.beginPath(); g.arc(64, 64, 62, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#222"; g.lineWidth = 2;
    for (let i = 0; i <= 12; i++) { const a = Math.PI * 0.75 + (i / 12) * Math.PI * 1.5; g.beginPath(); g.moveTo(64 + Math.cos(a) * 50, 64 + Math.sin(a) * 50); g.lineTo(64 + Math.cos(a) * 58, 64 + Math.sin(a) * 58); g.stroke(); }
    g.fillStyle = "#2a6fd0"; g.beginPath(); g.moveTo(64, 64); g.arc(64, 64, 44, Math.PI * 0.75, Math.PI * 1.35); g.fill();
    g.fillStyle = "#222"; g.font = `bold 14px ${SANS}`; g.textAlign = "center"; g.fillText("°C", 64, 98);
    g.strokeStyle = "#c01818"; g.lineWidth = 3; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 - 36, 64 + 8); g.stroke();
  });
/** digital temperature readout (dark LCD with red digits) */
export const csLcd = (txt: string) =>
  makeTex(128, 48, (g, w, h) => {
    g.fillStyle = "#101512"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#ff3b2a"; g.font = `bold 30px "Courier New", monospace`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, w / 2, h / 2 + 1);
  });

/** paper note / letter / label with left-aligned lines (first line bold); `hand` = handwriting-style ink */
export const csNote = (o: { lines: string[]; bg?: string; fg?: string; w?: number; h?: number; ruled?: boolean; hand?: boolean; title?: string; stripe?: string }) =>
  makeTex(o.w ?? 256, o.h ?? 320, (g, w, h) => {
    const r = rng(o.lines.join("").length * 17 + 5);
    g.fillStyle = o.bg ?? "#f4efe2";
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 4, 0.06, w * 0.4, "120,100,70");
    const pad = w * 0.08;
    let y = pad;
    if (o.stripe) { g.fillStyle = o.stripe; g.fillRect(0, 0, w, h * 0.12); y = h * 0.12 + pad * 0.6; }
    if (o.title) {
      g.fillStyle = o.stripe ? "#ffffff" : (o.fg ?? "#222222");
      g.font = `bold ${h * 0.07}px ${SANS}`; g.textBaseline = "middle"; g.textAlign = "left";
      g.fillText(o.title, pad, o.stripe ? h * 0.06 : y + h * 0.035, w - pad * 2);
      if (!o.stripe) y += h * 0.1;
    }
    const n = o.lines.length;
    const lh = Math.min(h * 0.11, (h - y - pad) / Math.max(n, 1));
    if (o.ruled) { g.strokeStyle = "rgba(90,120,170,0.35)"; g.lineWidth = 1; for (let yy = y + lh * 0.95; yy < h - 4; yy += lh) { g.beginPath(); g.moveTo(0, yy); g.lineTo(w, yy); g.stroke(); } }
    g.fillStyle = o.fg ?? (o.hand ? "#1d2b6b" : "#222222");
    g.textAlign = "left"; g.textBaseline = "middle";
    o.lines.forEach((s, i) => {
      const bold = i === 0 && !o.hand && !o.title;
      g.font = `${o.hand ? "italic " : bold ? "bold " : ""}${lh * (o.hand ? 0.72 : 0.62)}px ${o.hand ? `"Comic Sans MS", "Segoe Print", cursive, ${SANS}` : SANS}`;
      g.save();
      g.translate(pad, y + lh * (i + 0.5));
      if (o.hand) g.rotate((r() - 0.5) * 0.03);
      g.fillText(s, 0, 0, w - pad * 2);
      g.restore();
    });
    specks(g, w, h, r, 500, 0.06);
  });
