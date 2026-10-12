// Meeting Room — a loft-style office floor in an old brick warehouse on a sunny afternoon. Oiled oak floors,
// whitewashed brick walls, a dark wood-slat ceiling with black spiral ducts and big steel factory windows looking out
// over the city. Areas: a glass-walled conference room (black Crittall partitions, 7 m walnut table, 14 office chairs,
// wall TV, whiteboard, credenza), an open-plan cubicle maze on grey carpet tiles (quads of desks with screens,
// monitors, keyboards, drawers, sticky notes, mugs, cables), a print corner (copiers, filing cabinets, paper boxes),
// the reception (slatted oak desk in front of a moss wall with the company logo, waiting area, glass entrance),
// a lounge (chesterfield sofas, pallet coffee table on a marble rug, foosball, red beanbags, ceiling fan, bookshelf
// divider, real masterpieces on the brick) and a kitchenette (subway tiles, coffee machine, fridge, vending machine,
// water cooler, bistro tables). Hunters come in through the glass entrance at the reception.
import * as THREE from "three";
import * as T from "../textures";
import * as M from "./tex/meeting";
import { PAINTINGS, pickPainting, realPaintingTex } from "../paintings";
import { Kit, type Mat, type World } from "./kit";

type G = THREE.BufferGeometry;
type V3t = [number, number, number];
const V3 = THREE.Vector3;

/** bevelled box with a flat 45° chamfer (44 tris) */
function chamferGeo(w: number, h: number, d: number, r: number) {
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
    if (ax >= ay && ax >= az) { uv[i * 2] = z / d + 0.5; uv[i * 2 + 1] = y / h + 0.5; }
    else if (ay >= az) { uv[i * 2] = x / w + 0.5; uv[i * 2 + 1] = z / d + 0.5; }
    else { uv[i * 2] = x / w + 0.5; uv[i * 2 + 1] = y / h + 0.5; }
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}
const chamferCache = new Map<string, G>();
function boxGeo(w: number, h: number, d: number) {
  const min = Math.min(w, h, d), max = Math.max(w, h, d);
  if (min < 0.012 || max > 4.5) return new THREE.BoxGeometry(w, h, d);
  const key = `${w.toFixed(3)},${h.toFixed(3)},${d.toFixed(3)}`;
  let g = chamferCache.get(key);
  if (!g) { g = chamferGeo(w, h, d, Math.min(0.016, min * 0.2)); chamferCache.set(key, g); }
  return g.clone();
}
function place(geo: G, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, s?: V3t) {
  const m = new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new V3(...(s ?? [1, 1, 1])));
  return geo.applyMatrix4(m);
}
/** stick between two points */
function beam(a: V3t, b: V3t, r: number, seg = 8, round = true) {
  const va = new V3(...a), vb = new V3(...b);
  const len = va.distanceTo(vb);
  const geo = round ? new THREE.CylinderGeometry(r, r, len, seg, 1, true) : new THREE.BoxGeometry(r * 2, len, r * 2);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), vb.clone().sub(va).normalize()));
  const c = va.add(vb).multiplyScalar(0.5);
  geo.translate(c.x, c.y, c.z);
  return geo;
}
function latheG(pts: [number, number][], seg = 20) {
  return new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg);
}
function tubeG(pts: V3t[], r: number, seg = 24, radial = 6, closed = false) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new V3(...p)), closed, "centripetal"), seg, r, radial, closed);
}
function uvPlane(w: number, h: number, uv: [number, number, number, number]) {
  const g = new THREE.PlaneGeometry(w, h);
  const a = g.attributes.uv;
  for (let i = 0; i < a.count; i++) a.setXY(i, uv[0] + a.getX(i) * uv[2], uv[1] + a.getY(i) * uv[3]);
  return g;
}
function worldUV(geo: G, unit: number) {
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
function mergeG(geos: G[]) {
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
class Batch {
  private map = new Map<Mat, G[]>();
  noShadow = new Set<Mat>();
  add(m: Mat, geo: G, unit?: number) {
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
type Inst = { pos: V3t; rotX?: number; rotY?: number; rotZ?: number; scale?: V3t; color?: string };
class IList {
  list: Inst[] = [];
  constructor(public geo: G, public mat: Mat, public noShadow = false) {}
  add(x: number, y: number, z: number, s: V3t = [1, 1, 1], color?: string, ry = 0, rx = 0, rz = 0) {
    this.list.push({ pos: [x, y, z], scale: s, color, rotY: ry, rotX: rx, rotZ: rz });
  }
  flush(k: Kit) { if (this.list.length) k.instances(this.geo, this.mat, this.list, { noShadow: this.noShadow }); }
}

export function buildMeeting(): World {
  chamferCache.clear();
  const H = 3.8, DOOR = 2.3;
  const X1 = -20, X2 = 20, Z1 = -14, Z2 = 14;
  const k = new Kit(H, DOOR);
  const kmat = k.mat.bind(k);
  k.mat = (ptex, color, repeat, extra = {}) => {
    if (ptex && (extra.bump ?? (extra.transparent ? 0 : 0.55)) > 0) M.fastNormal(ptex);
    return kmat(ptex, color, repeat, extra);
  };
  const B = new Batch();
  let seed = 23;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pick = <X,>(a: X[]) => a[Math.floor(rnd() * a.length)];
  const rr = (a: number, b: number) => a + rnd() * (b - a);

  // ---------- materials ----------
  const tGrainW = k.tex("mt-walnut", () => M.grain("#5a3a24", 3));
  const tGrainO = k.tex("mt-oak", () => M.grain("#c49a66", 5));
  const tGrainB = k.tex("mt-birch", () => M.grain("#dcc39a", 7, 50));
  const tFabric = k.tex("mt-fabric", () => M.fabric(3, 205));
  const tPlaster = k.tex("mt-plaster", () => M.plaster("#efece5"));
  const mFloor = k.mat(k.tex("mt-planks", () => M.planks("#a8743f", 5)), "#ffffff", [1, 1], { roughness: 0.32, bump: 0.45 });
  const mFloorDark = k.mat(k.tex("mt-planksD", () => M.planks("#7a5230", 9)), "#ffffff", [1, 1], { roughness: 0.3, bump: 0.45 });
  const mCarpet = k.mat(k.tex("mt-carpet", () => M.carpet("#6d7075", 4)), "#ffffff", [1, 1], { roughness: 1, bump: 0.7 });
  const mBrick = k.mat(k.tex("mt-brick", () => M.brick(7, true)), "#ffffff", [1, 1], { roughness: 0.92, bump: 1.0 });
  const mPlaster = k.mat(tPlaster, "#ffffff", [1, 1], { roughness: 0.9, bump: 0.2 });
  const mPlasterG = k.mat(tPlaster, "#c9ccc8", [1, 1], { roughness: 0.9, bump: 0.2 });
  const mSlats = k.mat(k.tex("mt-slats", () => M.slats(12)), "#e8c9a4", [1, 1], { roughness: 0.7, bump: 0.6 });
  const mSkirt = k.mat(k.tex("mt-scuffs", M.scuffs), "#ffffff", [1, 1], { roughness: 0.5, bump: 0.2 });
  const mWalnut = k.mat(tGrainW, "#ffffff", [1, 1], { roughness: 0.35, bump: 0.3 });
  const mOak = k.mat(tGrainO, "#ffffff", [1, 1], { roughness: 0.45, bump: 0.3 });
  const mBirch = k.mat(tGrainB, "#ffffff", [1, 1], { roughness: 0.4, bump: 0.2 });
  const mDeskTop = k.mat(tGrainB, "#f4ead8", [1, 1], { roughness: 0.35, bump: 0.12 });
  const mSteelBlack = k.mat(null, "#1d1e20", [1, 1], { metalness: 0.7, roughness: 0.42 });
  const mAlu = k.mat(null, "#b9bdc0", [1, 1], { metalness: 0.85, roughness: 0.32 });
  const mChrome = k.mat(null, "#dfe2e4", [1, 1], { metalness: 1, roughness: 0.12 });
  const mSteel = k.mat(null, "#8f969b", [1, 1], { metalness: 0.75, roughness: 0.38 });
  const mStainless = k.mat(null, "#cfd3d5", [1, 1], { metalness: 0.95, roughness: 0.2 });
  const mGlass = k.mat(null, "#dbe8ec", [1, 1], { roughness: 0.03, metalness: 0.1 });
  Object.assign(mGlass.m, { transparent: true, opacity: 0.14, depthWrite: false });
  B.noShadow.add(mGlass);
  const mBlackP = k.mat(null, "#18191b", [1, 1], { roughness: 0.4 });
  const mGreyP = k.mat(null, "#6d7176", [1, 1], { roughness: 0.45 });
  const mWhiteP = k.mat(null, "#eeeeea", [1, 1], { roughness: 0.4 });
  const mCreamP = k.mat(null, "#e6e1d4", [1, 1], { roughness: 0.45 });
  const mRedP = k.mat(null, "#c32a26", [1, 1], { roughness: 0.35 });
  const mRubber = k.mat(null, "#202022", [1, 1], { roughness: 0.85 });
  const mInst = k.mat(null, "#ffffff", [1, 1], { roughness: 0.55 }); // instance-coloured props
  const mInstGloss = k.mat(null, "#ffffff", [1, 1], { roughness: 0.2 });
  const mFabric = k.mat(tFabric, "#ffffff", [1, 1], { roughness: 0.95, bump: 0.5 });
  const mPaper = k.mat(null, "#f5f3ec", [1, 1], { roughness: 0.85 });
  const mScreenOff = k.mat(null, "#0c0e11", [1, 1], { roughness: 0.1, metalness: 0.3 });
  const mScreens = k.mat(k.tex("mt-screens", M.screens), "#ffffff", [1, 1], { roughness: 0.25, emissive: "#ffffff", emissiveIntensity: 0.85, bump: 0 });
  const mLampE = k.mat(null, "#ffffff", [1, 1], { emissive: "#fff3dc", emissiveIntensity: 2.6, roughness: 0.5 });
  const mFluoro = k.mat(null, "#ffffff", [1, 1], { emissive: "#f4f7ff", emissiveIntensity: 2.2, roughness: 0.5 });
  B.noShadow.add(mLampE); B.noShadow.add(mFluoro);
  const mSky = k.mat(k.tex("mt-sky", () => M.skyline(13)), "#ffffff", [1, 1], { emissive: "#ffffff", emissiveIntensity: 0.9, bump: 0, roughness: 1 });
  const mSky2 = k.mat(k.tex("mt-sky2", () => M.skyline(31)), "#ffffff", [1, 1], { emissive: "#ffffff", emissiveIntensity: 0.8, bump: 0, roughness: 1 });
  B.noShadow.add(mSky); B.noShadow.add(mSky2);
  const mDust = k.mat(k.tex("mt-dust", M.dust), "#ffffff", [1, 1], { bump: 0, roughness: 1 });
  Object.assign(mDust.m, { transparent: true, depthWrite: false, alphaTest: 0, polygonOffset: true, polygonOffsetFactor: -2 });
  B.noShadow.add(mDust);
  const mStain = k.mat(k.tex("mt-stain", () => M.stain(3)), "#ffffff", [1, 1], { bump: 0, roughness: 0.9 });
  Object.assign(mStain.m, { transparent: true, depthWrite: false, alphaTest: 0, polygonOffset: true, polygonOffsetFactor: -2 });
  B.noShadow.add(mStain);
  const mRing = k.mat(k.tex("mt-ring", M.ring), "#ffffff", [1, 1], { bump: 0, roughness: 0.6 });
  Object.assign(mRing.m, { transparent: true, depthWrite: false, alphaTest: 0, polygonOffset: true, polygonOffsetFactor: -2 });
  B.noShadow.add(mRing);

  // ---------- local frame ----------
  class Fr {
    c: number; s: number;
    constructor(public x: number, public z: number, public ry: number) { this.c = Math.cos(ry); this.s = Math.sin(ry); }
    pt(lx: number, lz: number): [number, number] { return [this.x + lx * this.c + lz * this.s, this.z - lx * this.s + lz * this.c]; }
    put(geo: G, lx: number, ly: number, lz: number, rx = 0, ry = 0, rz = 0) {
      place(geo, lx, ly, lz, rx, ry, rz);
      geo.applyMatrix4(new THREE.Matrix4().makeRotationY(this.ry));
      geo.translate(this.x, 0, this.z);
      return geo;
    }
    box(m: Mat, w: number, h: number, d: number, lx: number, ly: number, lz: number, rx = 0, ry = 0, rz = 0) { return B.add(m, this.put(boxGeo(w, h, d), lx, ly + h / 2, lz, rx, ry, rz)); }
    cyl(m: Mat, rt: number, rb: number, h: number, lx: number, ly: number, lz: number, seg = 14, rx = 0, rz = 0) { return B.add(m, this.put(new THREE.CylinderGeometry(rt, rb, h, seg), lx, ly + h / 2, lz, rx, 0, rz)); }
    geo(m: Mat, g: G, lx = 0, ly = 0, lz = 0, rx = 0, ry = 0, rz = 0) { return B.add(m, this.put(g, lx, ly, lz, rx, ry, rz)); }
    col(lx1: number, lx2: number, lz1: number, lz2: number, bottom: number, top: number, standable = true) {
      const xs: number[] = [], zs: number[] = [];
      for (const [a, b] of [[lx1, lz1], [lx2, lz1], [lx1, lz2], [lx2, lz2]]) { const [x, z] = this.pt(a, b); xs.push(x); zs.push(z); }
      k.collider(Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs), bottom, top, standable);
    }
    inst(l: IList, lx: number, ly: number, lz: number, s: V3t, color?: string, ry = 0, rx = 0, rz = 0) {
      const [x, z] = this.pt(lx, lz);
      l.add(x, ly, z, s, color, this.ry + ry, rx, rz);
    }
  }
  const W = new Fr(0, 0, 0);
  const slab = (m: Mat, x1: number, x2: number, y1: number, y2: number, z1: number, z2: number, unit: number) => {
    const g = new THREE.BoxGeometry(x2 - x1, y2 - y1, z2 - z1);
    g.translate((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
    return B.add(m, g, unit);
  };
  const flat = (m: Mat, x1: number, x2: number, z1: number, z2: number, y = 0.003, ry = 0) => {
    const g = new THREE.PlaneGeometry(x2 - x1, z2 - z1);
    g.rotateX(-Math.PI / 2);
    if (ry) g.rotateY(ry);
    g.translate((x1 + x2) / 2, y, (z1 + z2) / 2);
    return B.add(m, g);
  };
  /** vertical plane facing direction ry (0 = +z); y = centre */
  const panel = (m: Mat, w: number, h: number, x: number, y: number, z: number, ry: number, uv?: [number, number, number, number]) => {
    const g = uv ? uvPlane(w, h, uv) : new THREE.PlaneGeometry(w, h);
    g.rotateY(ry);
    g.translate(x, y, z);
    return B.add(m, g);
  };

  // ---------- walls ----------
  type Hole = { c: number; w: number; y0: number; y1: number; win?: boolean };
  const TH = 0.3;
  const dustStrip = (axis: "x" | "z", at: number, s1: number, s2: number, side: number) => {
    const g = new THREE.PlaneGeometry(s2 - s1, 0.35);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * (s2 - s1) / 1.5);
    g.rotateX(-Math.PI / 2);
    // v=1 (top of plane) must be next to the wall
    if (axis === "x") { if (side > 0) g.rotateY(Math.PI); g.translate((s1 + s2) / 2, 0.004, at + side * (TH / 2 + 0.175)); }
    else { g.rotateY(side > 0 ? Math.PI / 2 : -Math.PI / 2); g.translate(at + side * (TH / 2 + 0.175), 0.004, (s1 + s2) / 2); }
    B.add(mDust, g);
  };
  function wall(axis: "x" | "z", at: number, a1: number, a2: number, h: number, m: Mat, holes: Hole[] = [], opt: { skirt?: number; unit?: number; noDust?: boolean } = {}) {
    const unit = opt.unit ?? 2;
    const put = (s1: number, s2: number, y0: number, y1: number) => {
      if (s2 - s1 < 0.005 || y1 - y0 < 0.005) return;
      const g = axis === "x" ? new THREE.BoxGeometry(s2 - s1, y1 - y0, TH) : new THREE.BoxGeometry(TH, y1 - y0, s2 - s1);
      g.translate(axis === "x" ? (s1 + s2) / 2 : at, (y0 + y1) / 2, axis === "x" ? at : (s1 + s2) / 2);
      B.add(m, g, unit);
      if (axis === "x") k.collider(s1, s2, at - TH / 2, at + TH / 2, y0, y1, y1 < 1.3);
      else k.collider(at - TH / 2, at + TH / 2, s1, s2, y0, y1, y1 < 1.3);
      if (y0 > 0.001) return;
      for (const side of [-1, 1]) {
        if (opt.skirt !== undefined && opt.skirt !== 0 && opt.skirt !== side) continue;
        const g4 = axis === "x" ? new THREE.BoxGeometry(s2 - s1, 0.12, 0.02) : new THREE.BoxGeometry(0.02, 0.12, s2 - s1);
        g4.translate(axis === "x" ? (s1 + s2) / 2 : at + side * (TH / 2 + 0.01), 0.06, axis === "x" ? at + side * (TH / 2 + 0.01) : (s1 + s2) / 2);
        B.add(mSkirt, g4, 1.6);
        if (!opt.noDust && y1 > 0.5) dustStrip(axis, at, s1, s2, side);
      }
    };
    let cur = a1;
    for (const o of [...holes].sort((p, q) => p.c - q.c)) {
      const s1 = o.c - o.w / 2, s2 = o.c + o.w / 2;
      put(cur, s1, 0, h);
      put(s1, s2, 0, o.y0);
      put(s1, s2, o.y1, h);
      if (o.win) factoryWindow(axis, at, o);
      else doorTrim(axis, at, o);
      cur = s2;
    }
    put(cur, a2, 0, h);
  }
  /** black steel factory window with small panes, deep sill */
  function factoryWindow(axis: "x" | "z", at: number, o: Hole) {
    const f = new Fr(axis === "x" ? o.c : at, axis === "x" ? at : o.c, axis === "x" ? 0 : Math.PI / 2);
    const w = o.w, hh = o.y1 - o.y0;
    f.box(mSteelBlack, w, 0.06, 0.08, 0, o.y0, 0);
    f.box(mSteelBlack, w, 0.06, 0.08, 0, o.y1 - 0.06, 0);
    f.box(mSteelBlack, 0.06, hh, 0.08, -w / 2 + 0.03, o.y0, 0);
    f.box(mSteelBlack, 0.06, hh, 0.08, w / 2 - 0.03, o.y0, 0);
    const nx = Math.max(2, Math.round(w / 0.55)), ny = Math.max(3, Math.round(hh / 0.5));
    for (let i = 1; i < nx; i++) f.geo(mSteelBlack, new THREE.BoxGeometry(0.028, hh - 0.1, 0.04), -w / 2 + (i * w) / nx, o.y0 + hh / 2, 0);
    for (let j = 1; j < ny; j++) f.geo(mSteelBlack, new THREE.BoxGeometry(w - 0.1, 0.028, 0.04), 0, o.y0 + (j * hh) / ny, 0);
    f.geo(mGlass, new THREE.BoxGeometry(w - 0.06, hh - 0.06, 0.01), 0, o.y0 + hh / 2, 0);
    f.col(-w / 2, w / 2, -TH / 2, TH / 2, o.y0, o.y1, false);
    // sill (inside, painted plaster)
    f.box(mPlaster, w + 0.1, 0.05, TH + 0.08, 0, o.y0 - 0.05, 0);
    // reveal
    f.box(mPlaster, w, 0.02, TH, 0, o.y1, 0);
  }
  function doorTrim(axis: "x" | "z", at: number, o: Hole) {
    const f = new Fr(axis === "x" ? o.c : at, axis === "x" ? at : o.c, axis === "x" ? 0 : Math.PI / 2);
    const w = o.w;
    for (const s of [-1, 1]) f.box(mSteelBlack, 0.07, o.y1, TH + 0.04, s * (w / 2 - 0.035), 0, 0);
    f.box(mSteelBlack, w, 0.07, TH + 0.04, 0, o.y1 - 0.07, 0);
    f.box(mSteel, w - 0.14, 0.012, TH, 0, 0, 0);
  }

  // ---------- floors / ceiling / roof ----------
  slab(mFloor, X1, X2, -0.2, 0, Z1, Z2, 1.6);
  const carpet = (x1: number, x2: number, z1: number, z2: number) => slab(mCarpet, x1, x2, 0, 0.012, z1, z2, 1.0);
  carpet(-7.4, X2, Z1, -2.6);
  slab(mFloorDark, X1, -8, 0.0, 0.006, Z1, -3, 1.6); // conference room: darker oak
  slab(mSlats, X1, X2, H, H + 0.1, Z1, Z2, 1.2);
  slab(k.mat(null, "#3a3634", [1, 1], { roughness: 0.9 }), X1 - 0.5, X2 + 0.5, H + 0.1, H + 0.9, Z1 - 0.5, Z2 + 0.5, 4); // roof

  // ---------- outer walls ----------
  const winN = (c: number, w = 2.6): Hole => ({ c, w, y0: 0.9, y1: 3.3, win: true });
  wall("x", Z1, X1 - 0.15, X2 + 0.15, H, mBrick, [winN(-17.2), winN(-10.8), winN(-4.2), winN(1.8), winN(7.8), winN(13.8), winN(18.2, 2.2)], { skirt: 1 });
  wall("x", Z2, X1 - 0.15, X2 + 0.15, H, mBrick, [winN(-17.4, 2.4), winN(-11, 2.4), { c: 14.5, w: 2.4, y0: 0, y1: DOOR + 0.3 }], { skirt: -1 });
  wall("z", X1, Z1, Z2, H, mBrick, [], { skirt: 1 });
  wall("z", X2, Z1, Z2, H, mBrick, [], { skirt: -1 });
  // city outside
  panel(mSky, 70, 26, 0, 8, Z1 - 9, 0, [0, 0, 1, 1]);
  panel(mSky2, 70, 26, 0, 8, Z2 + 9, Math.PI, [0, 0, 1, 1]);
  slab(k.mat(null, "#9a9690", [1, 1], { roughness: 0.9 }), -40, 40, -0.6, -0.2, -24, 24, 4);

  // ---------- ceiling: steel beams + spiral ducts ----------
  for (const bz of [-8.5, -3, 2.5, 8]) {
    slab(mSteelBlack, X1, X2, H - 0.32, H - 0.3, bz - 0.09, bz + 0.09, 2);
    slab(mSteelBlack, X1, X2, H - 0.3, H, bz - 0.012, bz + 0.012, 2);
    slab(mSteelBlack, X1, X2, H - 0.02, H, bz - 0.09, bz + 0.09, 2);
  }
  const mDuct = k.mat(k.tex("mt-duct", () => T.stripes(["#26282b", "#1b1c1e"], true)), "#ffffff", [40, 1], { metalness: 0.6, roughness: 0.45, bump: 0.4 });
  for (const dz of [-5.7, 5.3]) {
    const g = new THREE.CylinderGeometry(0.28, 0.28, X2 - X1 - 0.4, 20, 1, true);
    g.rotateZ(Math.PI / 2);
    g.translate(0, H - 0.62, dz);
    B.add(mDuct, g);
    for (let x = X1 + 1.5; x < X2 - 1; x += 3) {
      B.add(mSteelBlack, place(new THREE.TorusGeometry(0.29, 0.012, 5, 20), x, H - 0.62, dz, 0, Math.PI / 2, 0));
      B.add(mSteelBlack, place(new THREE.BoxGeometry(0.012, 0.34, 0.012), x, H - 0.17, dz));
    }
    // diffusers
    for (let x = X1 + 4; x < X2 - 2; x += 6) B.add(mSteel, place(new THREE.CylinderGeometry(0.12, 0.16, 0.12, 14), x, H - 0.96, dz));
  }

  // lamps are placed by the areas; they register here
  const lights: { pos: V3t; color: string; int: number; dist: number }[] = [];

  // ---------- prop materials ----------
  const mKeyboard = k.mat(k.tex("mt-kb", M.keyboard), "#ffffff", [1, 1], { roughness: 0.5, bump: 0.3 });
  const mPapers = k.mat(k.tex("mt-papers", M.papers), "#ffffff", [1, 1], { roughness: 0.85, bump: 0 });
  const mSticky = k.mat(k.tex("mt-sticky", M.sticky), "#ffffff", [1, 1], { roughness: 0.8, bump: 0 });
  mSticky.m.side = THREE.DoubleSide;
  const mPosters = k.mat(k.tex("mt-posters", M.posters), "#ffffff", [1, 1], { roughness: 0.5, bump: 0 });
  const mNames = k.mat(k.tex("mt-names", M.names), "#ffffff", [1, 1], { roughness: 0.4, bump: 0 });
  const mPhotos = k.mat(k.tex("mt-photos", M.photos), "#ffffff", [1, 1], { roughness: 0.3, bump: 0 });
  const mClock = k.mat(k.tex("mt-clock", M.clockFace), "#ffffff", [1, 1], { roughness: 0.3, bump: 0 });
  const mCalendar = k.mat(k.tex("mt-cal", M.calendar), "#ffffff", [1, 1], { roughness: 0.7, bump: 0 });
  const mNotice = k.mat(k.tex("mt-notice", M.notice), "#ffffff", [1, 1], { roughness: 0.7, bump: 0 });
  const mBinders = k.mat(k.tex("mt-binders", M.binders), "#ffffff", [1, 1], { roughness: 0.6, bump: 0.3 });
  const mBooks = k.mat(k.tex("books", T.books), "#ffffff", [1, 1], { roughness: 0.8, bump: 0.3 });
  const mTv = k.mat(k.tex("mt-tv", M.tvSlide), "#ffffff", [1, 1], { roughness: 0.2, emissive: "#ffffff", emissiveIntensity: 0.9, bump: 0 });
  const mLeather = k.mat(k.tex("mt-leather", () => M.leather("#8a4a24", 8)), "#ffffff", [1, 1], { roughness: 0.45, bump: 0.9 });
  const mLeatherP = k.mat(k.tex("mt-leatherP", () => M.leatherPlain("#8a4a24", 9)), "#ffffff", [1, 1], { roughness: 0.42, bump: 0.5 });
  const mLeatherBlk = k.mat(k.tex("mt-leatherB", () => M.leatherPlain("#2a2624", 4)), "#ffffff", [1, 1], { roughness: 0.4, bump: 0.5 });
  const mPallet = k.mat(k.tex("mt-pallet", M.pallet), "#ffffff", [1, 1], { roughness: 0.85, bump: 0.8 });
  const mSubway = k.mat(k.tex("mt-subway", M.subway), "#ffffff", [1, 1], { roughness: 0.15, bump: 0.35 });
  const mRug = k.mat(k.tex("mt-rug", M.rugMarble), "#ffffff", [1, 1], { roughness: 0.95, bump: 0.5 });
  const mMoss = k.mat(k.tex("mt-moss", M.moss), "#ffffff", [1, 1], { roughness: 1, bump: 1.2 });
  const mLogo = k.mat(k.tex("mt-logo", M.logo), "#ffffff", [1, 1], { transparent: true, roughness: 0.4, bump: 0 });
  const mVending = k.mat(k.tex("mt-vending", M.vending), "#ffffff", [1, 1], { roughness: 0.2, emissive: "#ffffff", emissiveIntensity: 0.55, bump: 0 });
  const mPitch = k.mat(k.tex("mt-pitch", M.pitch), "#ffffff", [1, 1], { roughness: 0.8, bump: 0.2 });
  const mLeaves = k.mat(k.tex("leaves", T.leaves), "#ffffff", [1, 1], { roughness: 0.8, bump: 0.6 });
  const mSoil = k.mat(null, "#3a2a1c", [1, 1], { roughness: 1 });
  const mConcrete = k.mat(k.tex("mt-conc", () => T.concrete("#a9a59c", 3)), "#ffffff", [1, 1], { roughness: 0.8, bump: 0.4 });
  const mCeramic = k.mat(null, "#f2f0ea", [1, 1], { roughness: 0.18 });
  const mCoffee = k.mat(null, "#2a170c", [1, 1], { roughness: 0.1 });
  const mWater = k.mat(null, "#a8d4ea", [1, 1], { roughness: 0.05, metalness: 0.1 });
  Object.assign(mWater.m, { transparent: true, opacity: 0.55, depthWrite: false });
  B.noShadow.add(mWater);
  const mCardboard = k.mat(k.tex("mt-card", () => T.noise("#b89066", 0.1, 7, 2500)), "#ffffff", [1, 1], { roughness: 0.9, bump: 0.3 });
  const mPartFab = k.mat(tFabric, "#ffffff", [5, 4], { roughness: 0.95, bump: 0.6 });
  const mBrass = k.mat(null, "#c9a24e", [1, 1], { metalness: 0.95, roughness: 0.28 });
  const mGold = k.mat(null, "#b8923e", [1, 1], { metalness: 0.9, roughness: 0.3 });
  const boards = {
    roadmap: k.mat(k.tex("mt-wb-road", () => M.whiteboard("roadmap")), "#ffffff", [1, 1], { roughness: 0.15, bump: 0 }),
    brainstorm: k.mat(k.tex("mt-wb-brain", () => M.whiteboard("brainstorm")), "#ffffff", [1, 1], { roughness: 0.15, bump: 0 }),
    sprint: k.mat(k.tex("mt-wb-sprint", () => M.whiteboard("sprint")), "#ffffff", [1, 1], { roughness: 0.15, bump: 0 }),
    erased: k.mat(k.tex("mt-wb-erased", () => M.whiteboard("erased")), "#ffffff", [1, 1], { roughness: 0.15, bump: 0 }),
  };
  const signMat = (key: string, text: string, bg: string, fg: string, sub = "", w = 256, h = 80) =>
    k.mat(k.tex("mt-sign-" + key, () => M.sign(text, bg, fg, sub, w, h)), "#ffffff", [1, 1], { roughness: 0.4, bump: 0 });

  // ---------- instanced props ----------
  const chairFab = (() => {
    const seatG = place(chamferGeo(0.5, 0.08, 0.48, 0.03), 0, 0.48, 0.02);
    const sh = new THREE.Shape();
    const R = 0.55, t = 0.06, a = 0.46, cz = -0.27 + R;
    sh.absarc(0, 0, R, -Math.PI / 2 - a, -Math.PI / 2 + a, false);
    sh.absarc(0, 0, R - t, -Math.PI / 2 + a, -Math.PI / 2 - a, true);
    const back = new THREE.ExtrudeGeometry(sh, { depth: 0.46, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2, curveSegments: 10 });
    // shape plane XY → rotate so the extrusion goes up; shape y becomes z
    back.rotateX(Math.PI / 2);
    back.translate(0, 1.06, cz);
    return mergeG([seatG, back]);
  })();
  const chairBlk = (() => {
    const parts: G[] = [];
    parts.push(place(new THREE.CylinderGeometry(0.045, 0.055, 0.07, 12), 0, 0.1, 0));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3;
      const ex = Math.cos(a) * 0.3, ez = Math.sin(a) * 0.3;
      parts.push(beam([0, 0.1, 0], [ex, 0.065, ez], 0.02, 6));
      parts.push(place(new THREE.SphereGeometry(0.028, 8, 6), ex, 0.03, ez));
      parts.push(place(new THREE.BoxGeometry(0.02, 0.05, 0.03), ex, 0.055, ez));
    }
    parts.push(place(new THREE.CylinderGeometry(0.022, 0.022, 0.3, 10), 0, 0.28, 0));
    parts.push(place(new THREE.CylinderGeometry(0.032, 0.032, 0.14, 10), 0, 0.18, 0));
    parts.push(place(new THREE.BoxGeometry(0.3, 0.03, 0.3), 0, 0.43, 0));
    parts.push(beam([0, 0.43, -0.12], [0, 0.46, -0.27], 0.022, 6));
    parts.push(place(new THREE.BoxGeometry(0.06, 0.26, 0.025), 0, 0.6, -0.285));
    for (const s of [-1, 1]) {
      parts.push(beam([s * 0.14, 0.44, -0.04], [s * 0.26, 0.45, -0.04], 0.014, 6));
      parts.push(beam([s * 0.26, 0.45, -0.04], [s * 0.26, 0.64, -0.03], 0.016, 6));
      parts.push(place(chamferGeo(0.06, 0.03, 0.26, 0.012), s * 0.26, 0.655, 0.0));
    }
    return mergeG(parts);
  })();
  const chairFI = new IList(chairFab, mFabric);
  const chairBI = new IList(chairBlk, mBlackP);
  const chairPal = ["#3a3f47", "#2d3440", "#474b52", "#27425e", "#5a2f33", "#34373b", "#3f4a3a"];
  /** office chair; ry = direction the sitter faces (0 = +z) */
  const chair = (x: number, z: number, ry: number, color?: string, coll = true) => {
    chairFI.add(x, 0, z, [1, 1, 1], color ?? pick(chairPal), ry);
    chairBI.add(x, 0, z, [1, 1, 1], undefined, ry);
    if (coll) k.collider(x - 0.24, x + 0.24, z - 0.24, z + 0.24, 0, 0.52, true);
  };
  const mugG = mergeG([latheG([[0.001, 0], [0.038, 0], [0.041, 0.005], [0.042, 0.095], [0.037, 0.095], [0.036, 0.012], [0.001, 0.012]], 16), place(new THREE.TorusGeometry(0.025, 0.007, 6, 12, Math.PI), 0.042, 0.05, 0, 0, 0, -Math.PI / 2)]);
  const mugI = new IList(mugG, mInstGloss);
  const coffeeI = new IList(new THREE.CircleGeometry(0.036, 12).rotateX(-Math.PI / 2), mCoffee, true);
  const mugPal = ["#f2f0ea", "#f2f0ea", "#1d3f7a", "#c32a26", "#2a2a2a", "#e0b020", "#3a8a5a", "#f08aa0"];
  const mug = (x: number, y: number, z: number, full = true, col?: string) => {
    const ry = rnd() * 6.28;
    mugI.add(x, y, z, [1, 1, 1], col ?? pick(mugPal), ry);
    if (full) coffeeI.add(x, y + 0.075, z, [1, 1, 1], undefined, ry);
    if (rnd() < 0.45) B.add(mRing, place(new THREE.PlaneGeometry(0.1, 0.1).rotateX(-Math.PI / 2), x + rr(-0.08, 0.08), y + 0.002, z + rr(-0.08, 0.08), 0, rnd() * 6, 0));
  };
  const stickyI = new IList(new THREE.PlaneGeometry(0.076, 0.076), mSticky, true);
  const stickyPal = ["#ffe766", "#ffe766", "#ffb3cf", "#9fe3ff", "#b8f28a", "#ffc36b"];
  /** sticky note on a vertical surface facing ry */
  const tStickyT = k.tex("mt-stickyT", M.stickyText);
  const stickyMats = stickyPal.map((c) => { const m = k.mat(tStickyT, c, [1, 1], { roughness: 0.8, bump: 0 }); B.noShadow.add(m); return m; });
  const STK = (i: number): [number, number, number, number] => [(i % 4) / 4, 1 - (Math.floor(i / 4) + 1) / 4, 0.25, 0.25];
  /** readable sticky note on a vertical surface facing ry */
  const sticky = (x: number, y: number, z: number, ry: number, cell = -1) => {
    const g = uvPlane(0.076, 0.076, STK(cell >= 0 ? cell : Math.floor(rnd() * 16)));
    g.rotateZ(rr(-0.2, 0.2)); g.rotateY(ry);
    const o = new V3(Math.sin(ry), 0, Math.cos(ry)).multiplyScalar(0.002);
    g.translate(x + o.x, y, z + o.z);
    B.add(pick(stickyMats), g);
  };
  const stickyFlat = (x: number, y: number, z: number, cell = -1) => {
    const g = uvPlane(0.076, 0.076, STK(cell >= 0 ? cell : Math.floor(rnd() * 16)));
    g.rotateX(-Math.PI / 2); g.rotateY(rnd() * 6);
    g.translate(x, y, z);
    B.add(pick(stickyMats), g);
  };
  const mDocs = k.mat(k.tex("mt-docs", M.docs), "#ffffff", [1, 1], { roughness: 0.85, bump: 0 });
  /** readable A4 page: which 0 = memo from Tom Kodner, 1 = letter to Tom Kodner */
  const docFlat = (x: number, y: number, z: number, which: number, ry = 0) => {
    const g = uvPlane(0.21, 0.297, [which * 0.5, 0, 0.5, 1]);
    g.rotateX(-Math.PI / 2); g.rotateY(ry); g.translate(x, y + 0.0025, z);
    B.add(mDocs, g);
  };
  const docWall = (x: number, y: number, z: number, which: number, ry: number, tilt = 0) => {
    const g = uvPlane(0.21, 0.297, [which * 0.5, 0, 0.5, 1]);
    g.rotateZ(tilt); g.rotateY(ry);
    g.translate(x + Math.sin(ry) * 0.003, y, z + Math.cos(ry) * 0.003);
    B.add(mDocs, g);
  };
  const boxI = new IList(new THREE.BoxGeometry(1, 1, 1), mInst);
  const cboxI = new IList(chamferGeo(1, 1, 1, 0.03), mCardboard);
  const leafI = new IList(new THREE.IcosahedronGeometry(1, 1), mLeaves);
  const bladeI = new IList((() => { const g = new THREE.ConeGeometry(0.04, 1, 4, 1); g.translate(0, 0.5, 0); g.scale(1, 1, 0.25); return g; })(), mLeaves);
  const bottleG = latheG([[0.001, 0], [0.032, 0], [0.034, 0.01], [0.034, 0.17], [0.018, 0.2], [0.014, 0.23], [0.016, 0.24], [0.001, 0.245]], 12);
  const bottleI = new IList(bottleG, mInstGloss);
  const penI = new IList(new THREE.CylinderGeometry(0.005, 0.005, 0.14, 6), mInst);
  const ILISTS: IList[] = [chairFI, chairBI, mugI, coffeeI, stickyI, boxI, cboxI, leafI, bladeI, bottleI, penI];

  // ---------- helpers ----------
  const PAPER = (c: number): [number, number, number, number] => [(c % 4) / 4, 1 - (Math.floor(c / 4) + 1) / 2, 0.25, 0.5];
  /** flat sheet(s) of paper on a surface */
  const paper = (x: number, y: number, z: number, n = 1, cell = -1) => {
    for (let i = 0; i < n; i++) {
      const g = uvPlane(0.21, 0.297, PAPER(cell >= 0 ? cell : Math.floor(rnd() * 8)));
      g.rotateX(-Math.PI / 2);
      g.rotateY(rnd() * 0.8 - 0.4 + (rnd() < 0.3 ? Math.PI / 2 : 0));
      g.translate(x + rr(-0.03, 0.03), y + 0.002 + i * 0.0015, z + rr(-0.03, 0.03));
      B.add(mPapers, g);
    }
  };
  const SCREEN = (c: number): [number, number, number, number] => [(c % 4) / 4, 1 - (Math.floor(c / 4) + 1) / 4, 0.25, 0.25];
  let screenN = 0;
  /** desktop monitor at local frame; screen faces +z */
  const monitor = (f: Fr, lx: number, ly: number, lz: number, ry = 0, w = 0.56) => {
    const g = new Fr(...f.pt(lx, lz), f.ry + ry);
    const h = w * 0.58;
    g.box(mBlackP, 0.24, 0.015, 0.18, 0, ly, 0);
    g.box(mBlackP, 0.05, 0.28, 0.03, 0, ly, -0.05);
    g.box(mBlackP, w, h, 0.028, 0, ly + 0.16, -0.03);
    g.box(mBlackP, w * 0.5, h * 0.55, 0.05, 0, ly + 0.16 + h * 0.22, -0.065);
    g.geo(mScreens, uvPlane(w - 0.025, h - 0.03, SCREEN(screenN++ % 16)), 0, ly + 0.16 + h / 2 + 0.004, -0.015);
    // cable down the back
    const [ax, az] = g.pt(0, -0.09), [bx, bz] = g.pt(0.05, -0.2);
    B.add(mRubber, tubeG([[ax, ly + 0.25, az], [ax, ly + 0.05, az], [bx, ly + 0.01, bz], [bx, ly - 0.25, bz + 0.02], [bx + 0.05, 0.02, bz]], 0.006, 16, 4));
    if (rnd() < 0.55) for (let i = 0; i < 1 + Math.floor(rnd() * 3); i++) {
      const [sx, sz] = g.pt(w / 2 - 0.05 - i * 0.07 * (rnd() < 0.5 ? 1 : 0) , 0.001 - 0.015);
      sticky(sx, ly + 0.16 + h - 0.04 - (i % 2) * 0.09, sz, g.ry);
    }
  };
  const keyboard = (f: Fr, lx: number, ly: number, lz: number, ry = 0) => {
    const g = new Fr(...f.pt(lx, lz), f.ry + ry);
    g.box(mKeyboard, 0.44, 0.02, 0.14, 0, ly, 0, 0.05);
    g.geo(mBlackP, new THREE.SphereGeometry(0.03, 10, 6).scale(0.8, 0.45, 1.3), 0.32, ly + 0.012, 0.02);
    g.box(mGreyP, 0.22, 0.004, 0.19, 0.33, ly, 0.02);
  };
  const lathePot = (x: number, y: number, z: number, s: number, m: Mat) => {
    B.add(m, place(latheG([[0.001, 0], [0.12 * s, 0], [0.15 * s, 0.3 * s], [0.16 * s, 0.32 * s], [0.14 * s, 0.32 * s], [0.001, 0.3 * s]], 18), x, y, z));
    B.add(mSoil, place(new THREE.CircleGeometry(0.14 * s, 14).rotateX(-Math.PI / 2), x, y + 0.3 * s, z));
  };
  const leafPal = ["#6f9a4a", "#5a8a3c", "#88b060", "#4a7a34"];
  /** potted plant: kind 0 = bushy, 1 = snake plant, 2 = small desk plant, 3 = tall fiddle-leaf */
  const plant = (x: number, z: number, s = 1, kind = 0, y = 0, potM: Mat = mConcrete) => {
    lathePot(x, y, z, s, potM);
    const top = y + 0.3 * s;
    if (kind === 1) {
      for (let i = 0; i < 11; i++) bladeI.add(x + rr(-0.06, 0.06) * s, top, z + rr(-0.06, 0.06) * s, [s * rr(1, 1.4), s * rr(0.45, 0.8), s], pick(["#3e6a2e", "#5a8a3c", "#6f8a3a"]), rnd() * 6, rr(-0.18, 0.18), rr(-0.18, 0.18));
    } else if (kind === 3) {
      B.add(mOak, beam([x, top, z], [x + 0.03, top + 1.1 * s, z - 0.02], 0.018 * s, 6));
      for (let i = 0; i < 16; i++) {
        const a = rnd() * 6.28, hh = top + (0.5 + rnd() * 0.75) * s, d = (0.1 + rnd() * 0.22) * s;
        leafI.add(x + Math.cos(a) * d, hh, z + Math.sin(a) * d, [0.13 * s, 0.03 * s, 0.1 * s], pick(leafPal), a, rr(-0.5, 0.5), rr(-0.5, 0.5));
      }
      k.collider(x - 0.2 * s, x + 0.2 * s, z - 0.2 * s, z + 0.2 * s, y, y + 0.32 * s, true);
    } else {
      const n = kind === 2 ? 6 : 14;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 6.28 + rnd(), d = (i ? rr(0.05, 0.16) : 0) * s;
        leafI.add(x + Math.cos(a) * d, top + (0.15 + rnd() * 0.3) * s, z + Math.sin(a) * d, [0.15 * s, 0.13 * s, 0.15 * s], pick(leafPal), rnd() * 6);
      }
      if (s > 1.2) k.collider(x - 0.18 * s, x + 0.18 * s, z - 0.18 * s, z + 0.18 * s, y, y + 0.6 * s, true);
    }
  };
  const bin = (x: number, z: number, y = 0) => {
    B.add(mSteelBlack, place(latheG([[0.001, 0.005], [0.12, 0.005], [0.14, 0.36], [0.145, 0.365], [0.135, 0.365], [0.115, 0.02]], 16), x, y, z));
    if (rnd() < 0.6) B.add(mPaper, place(new THREE.IcosahedronGeometry(0.05, 0), x + rr(-0.04, 0.04), y + 0.33, z + rr(-0.04, 0.04)));
  };
  const clock = (x: number, y: number, z: number, ry: number, r = 0.18) => {
    const f = new Fr(x, z, ry);
    f.geo(mSteelBlack, new THREE.CylinderGeometry(r, r, 0.05, 28), 0, y, 0.025, Math.PI / 2);
    f.geo(mClock, new THREE.CircleGeometry(r * 0.9, 28), 0, y, 0.052);
  };
  const usedPaint = new Set<number>();
  const paintMats = new Map<number, Mat>();
  /** framed real painting (thin black loft frame with white passe-partout) */
  const painting = (x: number, y: number, z: number, ry: number, w: number, h: number, sd: number, frame: Mat = mSteelBlack) => {
    const pi = pickPainting(w / h, usedPaint, sd);
    usedPaint.add(pi);
    let pm = paintMats.get(pi);
    if (!pm) { pm = k.mat(realPaintingTex(pi), "#fff", [1, 1], { roughness: 0.6, bump: 0 }); paintMats.set(pi, pm); }
    const pa = PAINTINGS[pi].w / PAINTINGS[pi].h, fa = w / h;
    const uw = pa > fa ? fa / pa : 1, vh = pa > fa ? 1 : pa / fa;
    const f = new Fr(x, z, ry);
    const fw = 0.05, mat = 0.07;
    const W2 = w + mat * 2, H2 = h + mat * 2;
    f.box(frame, W2 + fw * 2, fw, 0.04, 0, y - H2 / 2 - fw, 0.02);
    f.box(frame, W2 + fw * 2, fw, 0.04, 0, y + H2 / 2, 0.02);
    f.box(frame, fw, H2, 0.04, -W2 / 2 - fw / 2, y - H2 / 2, 0.02);
    f.box(frame, fw, H2, 0.04, W2 / 2 + fw / 2, y - H2 / 2, 0.02);
    f.geo(mWhiteP, new THREE.PlaneGeometry(W2, H2), 0, y, 0.012);
    f.geo(pm, uvPlane(w, h, [(1 - uw) / 2, (1 - vh) / 2, uw, vh]), 0, y, 0.016);
  };
  const POSTER = (i: number): [number, number, number, number] => [(i % 2) / 2, 1 - (Math.floor(i / 2) + 1) / 2, 0.5, 0.5];
  const poster = (i: number, x: number, y: number, z: number, ry: number, s = 0.6) => {
    const f = new Fr(x, z, ry);
    f.box(mSteelBlack, s * 0.8 + 0.04, s + 0.04, 0.02, 0, y - s / 2 - 0.02, 0.01);
    f.geo(mPosters, uvPlane(s * 0.8, s, POSTER(i)), 0, y, 0.022);
  };
  /** framed wall sign */
  const wallSign = (m: Mat, w: number, h: number, x: number, y: number, z: number, ry: number) => {
    const f = new Fr(x, z, ry);
    f.box(mSteelBlack, w + 0.03, h + 0.03, 0.02, 0, y - h / 2 - 0.015, 0.01);
    f.geo(m, new THREE.PlaneGeometry(w, h), 0, y, 0.022);
  };
  /** stain decal on the floor */
  const floorStain = (x: number, z: number, s: number, y = 0.004) => {
    B.add(mStain, place(new THREE.PlaneGeometry(s, s).rotateX(-Math.PI / 2), x, y, z, 0, rnd() * 6, 0));
  };
  /** ceiling-hung linear LED pendant */
  const linearPendant = (x: number, z: number, len: number, y: number, ry = 0) => {
    const f = new Fr(x, z, ry);
    f.box(mSteelBlack, len, 0.07, 0.1, 0, y, 0);
    f.geo(mLampE, new THREE.PlaneGeometry(len - 0.04, 0.07).rotateX(Math.PI / 2), 0, y - 0.002, 0);
    for (const s of [-1, 1]) f.geo(mSteelBlack, new THREE.CylinderGeometry(0.003, 0.003, H - y - 0.07, 4), s * (len / 2 - 0.1), (H + y + 0.07) / 2, 0);
  };
  /** industrial dome pendant (black enamel shade, glowing bulb) */
  const domePendant = (x: number, z: number, y: number, r = 0.22, shade: Mat = mSteelBlack) => {
    B.add(shade, place(latheG([[0.02, 0.26 * r / 0.22], [0.05, 0.25 * r / 0.22], [0.07, 0.2 * r / 0.22], [r * 0.8, 0.07], [r, 0], [r - 0.005, 0]], 24), x, y, z));
    B.add(mLampE, place(new THREE.SphereGeometry(0.055, 12, 8), x, y + 0.05, z));
    B.add(mRubber, place(new THREE.CylinderGeometry(0.004, 0.004, H - y - 0.26, 4), x, (H + y + 0.26) / 2, z));
    B.add(mSteelBlack, place(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 12), x, H - 0.01, z));
  };
  /** recessed / surface fluorescent troffer */
  const troffer = (x: number, z: number, ry = 0, y = H - 0.36) => {
    const f = new Fr(x, z, ry);
    f.box(mWhiteP, 1.24, 0.06, 0.32, 0, y, 0);
    f.geo(mFluoro, new THREE.PlaneGeometry(1.18, 0.26).rotateX(Math.PI / 2), 0, y - 0.002, 0);
    for (const s of [-1, 1]) f.geo(mSteel, new THREE.CylinderGeometry(0.003, 0.003, H - y - 0.06, 4), s * 0.5, (H + y + 0.06) / 2, 0);
  };
  /** book row on a shelf (spine texture strip) */
  const bookRow = (f: Fr, lx: number, ly: number, lz: number, w: number, h = 0.26, m: Mat = mBooks) => {
    const g = uvPlane(w, h, [rnd(), Math.floor(rnd() * 4) / 4 + 0.005, w / 1.1, 0.235]);
    f.geo(m, g, lx, ly + h / 2, lz);
    f.box(mPaper, w, h - 0.01, 0.16, lx, ly, lz - 0.085);
  };

  // ---------- more materials ----------
  const mFrost = k.mat(null, "#f4f6f6", [1, 1], { roughness: 0.6 });
  Object.assign(mFrost.m, { transparent: true, opacity: 0.45, depthWrite: false });
  B.noShadow.add(mFrost);
  const mGreenP = k.mat(null, "#2f8a4a", [1, 1], { roughness: 0.4 });
  const mBlueP = k.mat(null, "#2552a8", [1, 1], { roughness: 0.4 });
  const mTerracotta = k.mat(null, "#a85a3a", [1, 1], { roughness: 0.8 });
  const mInstB = [k.mat(null, "#2a64b8", [1, 1], { roughness: 0.45 }), k.mat(null, "#3a8a4a", [1, 1], { roughness: 0.45 }), k.mat(null, "#e4b82a", [1, 1], { roughness: 0.45 })];
  const mGlassBowl = k.mat(null, "#eaf4f6", [1, 1], { roughness: 0.04, metalness: 0.05 });
  Object.assign(mGlassBowl.m, { transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide });
  const mGlassJar = mGlassBowl;
  const mShade = k.mat(tFabric, "#efe6d2", [2, 1], { roughness: 0.9, bump: 0.3, emissive: "#ffd9a0", emissiveIntensity: 0.25 });
  mShade.m.side = THREE.DoubleSide;
  const mMat = k.mat(k.tex("mt-coir", () => T.noise("#4a4038", 0.2, 11, 5000)), "#ffffff", [4, 3], { roughness: 1, bump: 0.9 });
  const mExit = k.mat(k.tex("mt-exit", () => M.sign("EXIT", "#1f8a3a", "#ffffff", "", 128, 42)), "#ffffff", [1, 1], { emissive: "#ffffff", emissiveIntensity: 1.0, bump: 0 });
  const mTile = k.mat(k.tex("mt-tile", () => T.tiles("#d8d4cb", "#cdc8bd", 4, "rgba(60,50,40,0.35)")), "#d6d0c4", [1, 1], { roughness: 0.22, bump: 0.35 });
  const mCab = k.mat(tGrainB, "#6d7d68", [1, 1], { roughness: 0.45, bump: 0.12 });
  const mSinkDark = k.mat(null, "#9aa0a4", [1, 1], { metalness: 0.9, roughness: 0.35 });
  const mFruitR = k.mat(null, "#c8322a", [1, 1], { roughness: 0.35 });
  const mFruitY = k.mat(null, "#e8c030", [1, 1], { roughness: 0.4 });
  const mCork = k.mat(k.tex("mt-cork", M.cork), "#ffffff", [1, 1], { roughness: 0.95, bump: 0.5 });
  const mRadiator = k.mat(null, "#e9e6de", [1, 1], { roughness: 0.4, metalness: 0.2 });
  const mBean = k.mat(tFabric, "#c0262a", [3, 3], { roughness: 0.9, bump: 0.7 });
  const mMarble = k.mat(k.tex("mt-marble", () => T.marble("#f0ece4", "#b8b0a2", 5)), "#ffffff", [1, 1], { roughness: 0.2, bump: 0.2 });
  const cushI = new IList(new THREE.SphereGeometry(1, 14, 10), mFabric);
  ILISTS.push(cushI);

  // ---------- furniture builders ----------
  /** chesterfield sofa / armchair; frame +z = the direction the sitter faces */
  function chesterfield(x: number, z: number, ry: number, seats: number, mT: Mat = mLeather, mP: Mat = mLeatherP) {
    const f = new Fr(x, z, ry);
    const w = seats * 0.66 + 0.5, d = 0.92;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) f.geo(mWalnut, latheG([[0.001, 0], [0.035, 0], [0.05, 0.05], [0.045, 0.1], [0.001, 0.1]], 12), sx * (w / 2 - 0.1), 0, sz * (d / 2 - 0.1));
    boxU(f, mP, 0.6, w, 0.24, d, 0, 0.1, 0);
    for (let i = 0; i < seats; i++) B.add(mP, f.put(chamferGeo(0.645, 0.13, 0.64, 0.045), -w / 2 + 0.25 + (i + 0.5) * 0.66, 0.405, 0.12), 0.6);
    boxU(f, mT, 0.5, w - 0.04, 0.42, 0.22, 0, 0.34, -d / 2 + 0.12);
    f.geo(mT, new THREE.CylinderGeometry(0.11, 0.11, w - 0.04, 18).rotateZ(Math.PI / 2), 0, 0.77, -d / 2 + 0.12);
    for (const s of [-1, 1]) {
      boxU(f, mT, 0.5, 0.22, 0.36, d - 0.04, s * (w / 2 - 0.11), 0.34, 0);
      f.geo(mT, new THREE.CylinderGeometry(0.125, 0.125, d - 0.02, 18).rotateX(Math.PI / 2), s * (w / 2 - 0.1), 0.69, 0.01);
    }
    for (let i = 0; i < Math.min(seats, 2); i++) {
      const [a, b] = f.pt((i ? 1 : -1) * (w / 2 - 0.42), -d / 2 + 0.3);
      cushI.add(a, 0.62, b, [0.21, 0.19, 0.07], pick(["#d8cdb4", "#3a5a6a", "#b8633a", "#6a7a5a"]), f.ry + rr(-0.2, 0.2), -0.25, rr(-0.3, 0.3));
    }
    f.col(-w / 2, w / 2, -d / 2, d / 2, 0, 0.47, true);
    f.col(-w / 2, w / 2, -d / 2, -d / 2 + 0.24, 0, 0.88, true);
  }
  const armchair = (x: number, z: number, ry: number, mT: Mat, mP: Mat) => chesterfield(x, z, ry, 1, mT, mP);
  function sideTable(x: number, z: number, r: number) {
    B.add(mWalnut, place(new THREE.CylinderGeometry(r, r, 0.03, 24), x, 0.575, z));
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; B.add(mSteelBlack, beam([x + Math.cos(a) * r * 0.75, 0, z + Math.sin(a) * r * 0.75], [x + Math.cos(a) * r * 0.3, 0.56, z + Math.sin(a) * r * 0.3], 0.012, 6)); }
    paper(x - 0.03, 0.59, z, 2, 1);
    k.collider(x - r, x + r, z - r, z + r, 0, 0.59, true);
  }
  function palletTable(x: number, z: number) {
    const f = new Fr(x, z, 0.04);
    for (let p = 0; p < 2; p++) {
      const y = 0.05 + p * 0.13;
      for (let i = 0; i < 5; i++) boxU(f, mPallet, 1.0, 1.2, 0.02, 0.12, 0, y + 0.1, -0.33 + i * 0.165);
      for (const lz of [-0.33, 0, 0.33]) for (const lx of [-0.52, 0, 0.52]) boxU(f, mPallet, 1.0, 0.14, 0.08, 0.1, lx, y + 0.02, lz);
      for (const lx of [-0.52, 0, 0.52]) boxU(f, mPallet, 1.0, 0.1, 0.02, 0.8, lx, y, 0);
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) f.geo(mRubber, new THREE.CylinderGeometry(0.025, 0.025, 0.03, 10).rotateZ(Math.PI / 2), sx * 0.5, 0.03, sz * 0.32);
    f.geo(mGlass, new THREE.BoxGeometry(1.2, 0.012, 0.8), 0, 0.327, 0);
    f.col(-0.6, 0.6, -0.4, 0.4, 0, 0.33, true);
    // decor
    f.box(mSteelBlack, 0.4, 0.02, 0.26, -0.25, 0.334, 0.05);
    const [a, b] = f.pt(-0.3, 0.05);
    B.add(mCeramic, place(new THREE.CylinderGeometry(0.04, 0.04, 0.08, 14), a, 0.355, b));
    B.add(mLampE, place(new THREE.CylinderGeometry(0.003, 0.003, 0.012, 4), a, 0.44, b));
    plant(...f.pt(-0.15, 0.08), 0.32, 2, 0.354, mCeramic);
    paper(...(([p, q]) => [p, 0.334, q] as V3t)(f.pt(0.3, -0.1)), 3, 1);
    B.add(mMarble, place(latheG([[0.001, 0], [0.05, 0], [0.12, 0.05], [0.13, 0.06], [0.12, 0.06], [0.045, 0.01], [0.001, 0.01]], 20), ...(([p, q]) => [p, 0.333, q] as V3t)(f.pt(0.3, 0.18))));
    mug(...(([p, q]) => [p, 0.333, q] as V3t)(f.pt(0.05, -0.22)), true, "#f2f0ea");
  }
  function arcLamp(x: number, z: number, tx: number, tz: number) {
    B.add(mMarble, place(new THREE.CylinderGeometry(0.17, 0.18, 0.07, 24), x, 0.035, z));
    const dx = tx - x, dz = tz - z;
    B.add(mChrome, tubeG([[x, 0.07, z], [x, 1.2, z], [x + dx * 0.2, 1.95, z + dz * 0.2], [x + dx * 0.65, 2.15, z + dz * 0.65], [tx, 1.95, tz]], 0.014, 40, 8));
    B.add(mSteelBlack, place(latheG([[0.02, 0.24], [0.05, 0.22], [0.14, 0.08], [0.2, 0], [0.195, 0]], 24), tx, 1.72, tz));
    B.add(mLampE, place(new THREE.SphereGeometry(0.05, 10, 6), tx, 1.78, tz));
    k.collider(x - 0.18, x + 0.18, z - 0.18, z + 0.18, 0, 0.08, true);
  }
  function foosball(x: number, z: number) {
    const f = new Fr(x, z, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) f.box(mBlackP, 0.08, 0.66, 0.08, sx * 0.6, 0, sz * 0.3);
    f.box(mBlackP, 1.2, 0.04, 0.04, 0, 0.18, 0.3); f.box(mBlackP, 1.2, 0.04, 0.04, 0, 0.18, -0.3);
    f.box(mWhiteP, 1.44, 0.04, 0.78, 0, 0.64, 0);
    for (const s of [-1, 1]) {
      f.box(mWhiteP, 1.44, 0.26, 0.03, 0, 0.64, s * 0.375);
      f.box(mRedP, 1.44, 0.03, 0.035, 0, 0.72, s * 0.375);
      f.box(mWhiteP, 0.03, 0.26, 0.72, s * 0.705, 0.64, 0);
      f.box(mBlackP, 0.02, 0.06, 0.2, s * 0.69, 0.68, 0);
    }
    f.geo(mPitch, new THREE.PlaneGeometry(1.38, 0.72).rotateX(-Math.PI / 2), 0, 0.685, 0);
    const team = [0, 0, 1, 0, 1, 0, 1, 1];
    const cnt = [1, 2, 3, 5, 5, 3, 2, 1];
    for (let r = 0; r < 8; r++) {
      const lx = -0.6 + r * (1.2 / 7);
      const side = team[r] ? 1 : -1;
      f.geo(mChrome, new THREE.CylinderGeometry(0.008, 0.008, 1.3, 8).rotateX(Math.PI / 2), lx, 0.82, side * 0.12);
      f.geo(mBlackP, new THREE.CylinderGeometry(0.018, 0.018, 0.12, 10).rotateX(Math.PI / 2), lx, 0.82, side * 0.72);
      const pm = team[r] ? mBlueP : mRedP;
      for (let i = 0; i < cnt[r]; i++) {
        const pz = cnt[r] === 1 ? 0 : -0.26 + (i * 0.52) / (cnt[r] - 1);
        f.box(pm, 0.03, 0.1, 0.05, lx, 0.72, pz);
        f.geo(mCreamP, new THREE.SphereGeometry(0.018, 8, 6), lx, 0.84, pz);
      }
    }
    f.geo(mWhiteP, new THREE.SphereGeometry(0.017, 10, 8), 0.12, 0.703, 0.05);
    f.col(-0.72, 0.72, -0.39, 0.39, 0, 0.9, true);
  }
  function beanBag(x: number, z: number, s: number) {
    B.add(mBean, place(latheG([[0.001, 0], [0.38, 0.01], [0.46, 0.12], [0.44, 0.3], [0.34, 0.45], [0.2, 0.52], [0.08, 0.5], [0.001, 0.47]], 22), x, 0, z, rr(-0.08, 0.08), rnd() * 6, rr(-0.08, 0.08), [s, s * rr(0.85, 1), s * rr(0.9, 1.05)]));
    k.collider(x - 0.4 * s, x + 0.4 * s, z - 0.4 * s, z + 0.4 * s, 0, 0.5 * s, true);
  }
  function ceilingFan(x: number, z: number) {
    B.add(mSteelBlack, place(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 16), x, H - 0.025, z));
    B.add(mSteelBlack, place(new THREE.CylinderGeometry(0.015, 0.015, 0.45, 8), x, H - 0.27, z));
    B.add(mSteelBlack, place(latheG([[0.02, 0.14], [0.09, 0.12], [0.13, 0.06], [0.13, 0.02], [0.08, 0], [0.001, 0]], 20), x, H - 0.62, z));
    B.add(mLampE, place(new THREE.SphereGeometry(0.1, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), x, H - 0.62, z));
    const blades: G[] = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      blades.push(place(chamferGeo(0.62, 0.012, 0.14, 0.005), Math.cos(a) * 0.47, 0, -Math.sin(a) * 0.47, 0.12, a, 0));
      blades.push(place(new THREE.BoxGeometry(0.2, 0.014, 0.04), Math.cos(a) * 0.17, 0.01, -Math.sin(a) * 0.17, 0, a, 0));
    }
    const mesh = k.add(mergeG(blades), mWalnut, [x, H - 0.5, z]);
    mesh.userData.spin = { axis: [0, 1, 0], speed: 2.4 };
  }
  function coatStand(x: number, z: number) {
    B.add(mWalnut, place(latheG([[0.001, 0], [0.22, 0], [0.22, 0.03], [0.05, 0.05], [0.02, 0.08], [0.001, 0.08]], 20), x, 0, z));
    B.add(mWalnut, place(new THREE.CylinderGeometry(0.018, 0.022, 1.75, 10), x, 0.95, z));
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; B.add(mBrass, beam([x, 1.62, z], [x + Math.cos(a) * 0.14, 1.72, z + Math.sin(a) * 0.14], 0.008, 6)); }
    B.add(mCoat, place(latheG([[0.001, 0.72], [0.16, 0.7], [0.19, 0.4], [0.17, 0.1], [0.12, 0], [0.001, 0.02]], 14), x + 0.1, 0.95, z, 0.05, 0.3, -0.1, [1, 1, 0.55]));
    B.add(mScarf, place(new THREE.TorusGeometry(0.07, 0.03, 6, 12), x - 0.1, 1.6, z, 1.2, 0, 0.2));
    k.collider(x - 0.2, x + 0.2, z - 0.2, z + 0.2, 0, 1.8, false);
  }
  function espresso(x: number, y: number, z: number) {
    const f = new Fr(x, z, Math.PI / 2);
    f.box(mStainless, 0.42, 0.4, 0.4, 0, y, -0.02);
    f.box(mBlackP, 0.4, 0.1, 0.02, 0, y + 0.26, 0.19);
    for (const s of [-1, 1]) {
      f.geo(mChrome, new THREE.CylinderGeometry(0.035, 0.03, 0.05, 12), s * 0.1, y + 0.23, 0.2);
      f.geo(mBlackP, beam([s * 0.1, y + 0.21, 0.24], [s * 0.1, y + 0.2, 0.36], 0.012, 6));
    }
    f.box(mSteel, 0.4, 0.03, 0.16, 0, y, 0.24);
    f.geo(mChrome, beam([0.18, y + 0.3, 0.2], [0.2, y + 0.12, 0.28], 0.006, 6));
    for (let i = 0; i < 4; i++) { const [a, b] = f.pt(-0.13 + i * 0.085, -0.05); mugI.add(a, y + 0.4, b, [0.75, 0.6, 0.75], "#f2f0ea", rnd() * 6); }
  }
  function dishRack(x: number, y: number, z: number) {
    const f = new Fr(x, z, Math.PI / 2);
    f.box(mChrome, 0.42, 0.012, 0.3, 0, y, 0);
    for (const s of [-1, 1]) f.box(mChrome, 0.42, 0.1, 0.008, 0, y, s * 0.15);
    for (let i = 0; i < 5; i++) f.geo(mCeramic, new THREE.CylinderGeometry(0.11, 0.11, 0.012, 20).rotateX(Math.PI / 2).rotateY(Math.PI / 2), -0.16 + i * 0.05, y + 0.12, -0.05);
    for (let i = 0; i < 3; i++) f.geo(mGlassBowl, latheG([[0.001, 0], [0.032, 0], [0.036, 0.11], [0.034, 0.11], [0.03, 0.005]], 12), 0.08 + i * 0.08, y + 0.012, 0.08);
  }
  function bistro(tx: number, tz: number) {
    B.add(mOak, place(new THREE.CylinderGeometry(0.4, 0.4, 0.035, 28), tx, 0.735, tz), 0.8);
    B.add(mSteelBlack, place(new THREE.CylinderGeometry(0.035, 0.035, 0.7, 10), tx, 0.37, tz));
    B.add(mSteelBlack, place(new THREE.CylinderGeometry(0.24, 0.26, 0.03, 20), tx, 0.015, tz));
    k.collider(tx - 0.4, tx + 0.4, tz - 0.4, tz + 0.4, 0, 0.75, true);
    const a0 = rnd() * 6;
    for (let i = 0; i < 3; i++) {
      const a = a0 + (i / 3) * Math.PI * 2;
      const cx = tx + Math.sin(a) * 0.7, cz = tz + Math.cos(a) * 0.7;
      woodChair(cx, cz, a + Math.PI + rr(-0.3, 0.3));
    }
    mug(tx + rr(-0.15, 0.15), 0.752, tz + rr(-0.15, 0.15));
    if (rnd() < 0.7) paper(tx + rr(-0.2, 0.2), 0.752, tz + rr(-0.2, 0.2), 1);
  }
  /** bentwood-style café chair; ry = facing direction */
  function woodChair(x: number, z: number, ry: number) {
    const f = new Fr(x, z, ry);
    boxU(f, mOak, 0.8, 0.42, 0.03, 0.4, 0, 0.44, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) f.geo(mSteelBlack, beam([sx * 0.17, 0, sz * 0.17], [sx * 0.18, 0.44, sz * 0.17], 0.012, 6));
    for (const sx of [-1, 1]) f.geo(mSteelBlack, beam([sx * 0.18, 0.47, -0.18], [sx * 0.19, 0.86, -0.22], 0.012, 6));
    const sh = new THREE.Shape();
    sh.absarc(0, 0, 0.36, -Math.PI / 2 - 0.55, -Math.PI / 2 + 0.55, false);
    sh.absarc(0, 0, 0.34, -Math.PI / 2 + 0.55, -Math.PI / 2 - 0.55, true);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: false, curveSegments: 8 });
    g.rotateX(Math.PI / 2);
    g.translate(0, 0.88, -0.22 + 0.36);
    f.geo(mOak, g);
    f.col(-0.21, 0.21, -0.21, 0.21, 0, 0.47, true);
  }
  function mobileBoard(x: number, z: number, ry: number, m: Mat) {
    const f = new Fr(x, z, ry);
    f.box(mAlu, 1.84, 1.14, 0.03, 0, 0.73, 0);
    f.geo(m, new THREE.PlaneGeometry(1.8, 1.1), 0, 1.3, 0.017);
    f.geo(mWhiteP, new THREE.PlaneGeometry(1.8, 1.1), 0, 1.3, -0.017, 0, Math.PI);
    for (const s of [-1, 1]) {
      f.box(mAlu, 0.04, 1.9, 0.04, s * 0.95, 0.05, 0);
      f.box(mAlu, 0.05, 0.04, 0.6, s * 0.95, 0.05, 0);
      for (const e of [-1, 1]) f.geo(mBlackP, new THREE.SphereGeometry(0.03, 8, 6), s * 0.95, 0.03, e * 0.27);
    }
    f.box(mAlu, 1.0, 0.025, 0.07, 0, 0.72, 0.04);
    f.geo(mBlueP, new THREE.CylinderGeometry(0.009, 0.009, 0.13, 8), -0.2, 0.755, 0.05, 0, 0, Math.PI / 2);
    f.geo(mRedP, new THREE.CylinderGeometry(0.009, 0.009, 0.13, 8), -0.02, 0.755, 0.05, 0, 0, Math.PI / 2);
    f.col(-0.98, 0.98, -0.3, 0.3, 0, 1.95, true);
  }
  function waterCooler(x: number, z: number, ry: number) {
    const f = new Fr(x, z, ry);
    f.box(mWhiteP, 0.32, 0.98, 0.32, 0, 0, 0);
    f.box(mGreyP, 0.2, 0.2, 0.02, 0, 0.66, 0.155);
    f.geo(mRedP, new THREE.CylinderGeometry(0.012, 0.012, 0.03, 8).rotateX(Math.PI / 2), -0.05, 0.84, 0.17);
    f.geo(mBlueP, new THREE.CylinderGeometry(0.012, 0.012, 0.03, 8).rotateX(Math.PI / 2), 0.05, 0.84, 0.17);
    f.box(mGreyP, 0.2, 0.02, 0.1, 0, 0.62, 0.18);
    f.geo(mWater, latheG([[0.001, 0], [0.04, 0], [0.05, 0.05], [0.14, 0.09], [0.14, 0.44], [0.12, 0.49], [0.001, 0.5]], 20), 0, 0.98, 0);
    f.geo(mWhiteP, new THREE.CylinderGeometry(0.035, 0.035, 0.36, 12), 0.2, 0.4, 0.05);
    f.col(-0.2, 0.25, -0.17, 0.17, 0, 1.48, true);
  }
  function extinguisher(x: number, z: number) {
    B.add(mRedP, place(latheG([[0.001, 0], [0.075, 0], [0.08, 0.02], [0.08, 0.46], [0.055, 0.53], [0.02, 0.56], [0.001, 0.57]], 16), x, 0.04, z));
    B.add(mBlackP, beam([x, 0.6, z], [x + 0.08, 0.64, z], 0.014, 6));
    B.add(mBlackP, tubeG([[x + 0.03, 0.6, z], [x + 0.1, 0.5, z + 0.04], [x + 0.09, 0.22, z + 0.08]], 0.011, 10, 5));
    B.add(mBlackP, place(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 16), x, 0.02, z));
  }
  /** open shelf unit; frame +z = front. content: books, binders, plants, boxes */
  function shelfUnit(f: Fr, w: number, h: number, d: number, n: number, binders = false, twoSided = false) {
    for (const s of [-1, 1]) for (const e of [-1, 1]) f.box(mSteelBlack, 0.03, h, 0.03, s * (w / 2 - 0.015), 0, e * (d / 2 - 0.015));
    for (const s of [-1, 1]) for (let j = 0; j < 3; j++) f.box(mSteelBlack, 0.02, 0.02, d, s * (w / 2 - 0.015), 0.1 + j * (h - 0.2) / 2, 0);
    const gap = (h - 0.08) / n;
    for (let j = 0; j <= n; j++) boxU(f, mOak, 1.0, w - 0.02, 0.03, d, 0, 0.06 + j * gap - 0.03 * (j === n ? 1 : 0), 0);
    for (let j = 0; j < n; j++) {
      const y = 0.09 + j * gap;
      let lx = -w / 2 + 0.05;
      while (lx < w / 2 - 0.2) {
        const r = rnd();
        const seg = rr(0.25, 0.55);
        if (lx + seg > w / 2 - 0.05) break;
        if (r < (binders ? 0.7 : 0.45)) {
          if (binders) { f.geo(mBinders, uvPlane(seg, gap - 0.08, [rnd(), 0, seg / 0.7, 1]), lx + seg / 2, y + (gap - 0.08) / 2, d / 2 - 0.03); f.box(mInst, seg, gap - 0.09, d - 0.1, lx + seg / 2, y, -0.02); }
          else bookRow(f, lx + seg / 2, y, d / 2 - 0.03, seg, Math.min(0.28, gap - 0.06));
          if (twoSided) { const g = new Fr(...f.pt(lx + seg / 2, -d / 2 + 0.03), f.ry + Math.PI); g.geo(mBooks, uvPlane(seg, Math.min(0.28, gap - 0.06), [rnd(), Math.floor(rnd() * 4) / 4 + 0.005, seg / 1.1, 0.235]), 0, y + Math.min(0.28, gap - 0.06) / 2, 0); }
        } else if (r < 0.62) {
          const [a, b] = f.pt(lx + 0.12, 0);
          plant(a, b, 0.4, rnd() < 0.5 ? 2 : 1, y, pick([mCeramic, mConcrete, mTerracotta]));
          lx += 0.25; continue;
        } else if (r < 0.78) {
          const [a, b] = f.pt(lx + 0.14, 0);
          cboxI.add(a, y + 0.1, b, [0.26, 0.2, Math.min(0.3, d - 0.06)], undefined, f.ry + rr(-0.1, 0.1));
          lx += 0.3; continue;
        } else if (r < 0.9) {
          const [a, b] = f.pt(lx + 0.1, 0);
          B.add(pick([mCeramic, mBlackP, mTerracotta, mGold]), place(latheG([[0.001, 0], [0.05, 0], [0.07, 0.08], [0.05, 0.16], [0.03, 0.2], [0.035, 0.22], [0.001, 0.22]], 16), a, y, b, 0, 0, 0, [1, rr(0.8, 1.3), 1]));
          lx += 0.22; continue;
        } else {
          // stack of lying books
          for (let i = 0; i < 4; i++) { const [a, b] = f.pt(lx + 0.12, rr(-0.02, 0.02)); boxI.add(a, y + 0.02 + i * 0.035, b, [0.22, 0.034, 0.16], pick(["#1d3f7a", "#b02a2a", "#2a6a3a", "#e0b020", "#303030", "#e8e8e0"]), f.ry + rr(-0.2, 0.2)); }
          lx += 0.28; continue;
        }
        lx += seg + 0.02;
      }
    }
    f.col(-w / 2, w / 2, -d / 2, d / 2, 0, h, true);
  }
  function copier(x: number, z: number, ry: number, broken: boolean) {
    const f = new Fr(x, z, ry);
    f.box(mCreamP, 0.62, 0.56, 0.64, 0, 0.04, 0);
    f.box(mBlackP, 0.6, 0.04, 0.6, 0, 0, 0);
    for (let i = 0; i < 3; i++) { f.box(mWhiteP, 0.6, 0.16, 0.015, 0, 0.07 + i * 0.17, 0.32); f.box(mGreyP, 0.18, 0.02, 0.02, 0, 0.19 + i * 0.17, 0.335); }
    f.box(mWhiteP, 0.62, 0.42, 0.62, 0, 0.6, 0);
    f.box(mGreyP, 0.5, 0.012, 0.3, 0.02, 0.75, 0.28);
    paper(...(([a, b]) => [a, 0.765, b] as V3t)(f.pt(0.02, 0.26)), 3);
    f.box(mCreamP, 0.62, 0.07, 0.6, 0, 1.02, -0.01);
    f.box(mGreyP, 0.46, 0.1, 0.36, -0.04, 1.09, -0.08);
    f.box(mBlackP, 0.26, 0.03, 0.14, 0.15, 1.02, 0.32, -0.5);
    f.geo(mScreens, uvPlane(0.14, 0.08, SCREEN(3)), 0.1, 1.07, 0.39, -0.5 - Math.PI / 2 + Math.PI / 2 - 0.9);
    if (broken) f.geo(mPapers, uvPlane(0.21, 0.297, PAPER(7)), 0, 0.85, 0.312);
    f.col(-0.31, 0.31, -0.32, 0.4, 0, 1.12, true);
    for (let i = 0; i < 3; i++) cboxI.add(...(([a, b]) => [a, 0.14 + i * 0.28, b] as V3t)(f.pt(0.62, 0.0)), [0.42, 0.28, 0.3], undefined, f.ry + rr(-0.08, 0.08));
    k.collider(...(() => { const [a, b] = f.pt(0.62, 0); return [a - 0.22, a + 0.22, b - 0.22, b + 0.22] as [number, number, number, number]; })(), 0, 0.84, true);
  }
  const mCoat = k.mat(tFabric, "#3a3f4a", [2, 2], { roughness: 0.95, bump: 0.5 });
  const mScarf = k.mat(tFabric, "#b8433a", [2, 2], { roughness: 0.95, bump: 0.5 });

  const boxU = (f: Fr, m: Mat, unit: number, w: number, h: number, d: number, lx: number, ly: number, lz: number, rx = 0, ry = 0, rz = 0) =>
    B.add(m, f.put(boxGeo(w, h, d), lx, ly + h / 2, lz, rx, ry, rz), unit);

  // ---------- glass partitions (black steel Crittall style) ----------
  function glassWall(axis: "x" | "z", at: number, a1: number, a2: number, doors: [number, number][] = []) {
    const f = axis === "x" ? new Fr(0, at, 0) : new Fr(at, 0, -Math.PI / 2);
    const segs: [number, number][] = [];
    let cur = a1;
    for (const [c, w] of [...doors].sort((p, q) => p[0] - q[0])) { segs.push([cur, c - w / 2]); cur = c + w / 2; }
    segs.push([cur, a2]);
    for (const [s1, s2] of segs) {
      const len = s2 - s1;
      if (len < 0.05) continue;
      const n = Math.max(1, Math.round(len / 1.05));
      for (let i = 0; i <= n; i++) f.geo(mSteelBlack, new THREE.BoxGeometry(0.05, H, 0.07), s1 + (i * len) / n, H / 2, 0);
      for (const [y, hh] of [[0, 0.12], [1.05, 0.035], [2.35, 0.05], [H - 0.05, 0.05]] as [number, number][]) f.geo(mSteelBlack, new THREE.BoxGeometry(len, hh, 0.06), (s1 + s2) / 2, y + hh / 2, 0);
      for (let i = 0; i < n; i++) f.geo(mSteelBlack, new THREE.BoxGeometry(0.025, 1.2, 0.035), s1 + ((i + 0.5) * len) / n, 1.7, 0);
      f.geo(mGlass, new THREE.BoxGeometry(len, H - 0.12, 0.012), (s1 + s2) / 2, (H + 0.12) / 2, 0);
      // frosted manifestation band
      f.geo(mFrost, new THREE.PlaneGeometry(len, 0.12), (s1 + s2) / 2, 1.45, 0.008);
      f.geo(mFrost, new THREE.PlaneGeometry(len, 0.12), (s1 + s2) / 2, 1.45, -0.008, 0, Math.PI);
      f.col(s1, s2, -0.05, 0.05, 0, H, false);
    }
    for (const [c, w] of doors) {
      f.geo(mSteelBlack, new THREE.BoxGeometry(w, 0.07, 0.07), c, DOOR + 0.035, 0);
      f.geo(mGlass, new THREE.BoxGeometry(w, H - DOOR - 0.07, 0.012), c, (H + DOOR + 0.07) / 2, 0);
      f.geo(mSteelBlack, new THREE.BoxGeometry(w, 0.05, 0.06), c, 2.35 + 0.025 + 0.3, 0);
    }
  }
  /** swung-open glass door leaf; hinge at local (hx, 0) of a frame, opening towards +z local */
  const glassLeaf = (x: number, z: number, ry: number, w = 0.8) => {
    const f = new Fr(x, z, ry);
    f.box(mSteelBlack, 0.05, DOOR - 0.02, 0.045, 0, 0.01, 0.025);
    f.box(mSteelBlack, 0.05, DOOR - 0.02, 0.045, 0, 0.01, w - 0.025);
    f.box(mSteelBlack, 0.05, 0.12, w, 0, 0.01, w / 2);
    f.box(mSteelBlack, 0.05, 0.05, w, 0, DOOR - 0.06, w / 2);
    f.box(mSteelBlack, 0.04, 0.035, w, 0, 1.05, w / 2);
    f.geo(mGlass, new THREE.BoxGeometry(0.012, DOOR - 0.15, w - 0.05), 0, DOOR / 2 + 0.04, w / 2);
    f.geo(mChrome, new THREE.CylinderGeometry(0.014, 0.014, 0.9, 10), 0.07, 1.1, w - 0.1);
  };

  // =====================================================================================
  // CONFERENCE ROOM  (x -20..-8, z -14..-3)
  // =====================================================================================
  glassWall("x", -3, -20, -8, [[-10.3, 1.7]]);
  glassWall("z", -8, -14, -3);
  glassLeaf(-11.15, -3.05, 0, 0.82);
  glassLeaf(-9.45, -3.05, 0, 0.82);
  k.room("Conference Room", -20, -8, -14, -3);
  wallSign(signMat("board", "BOARDROOM", "#1b1c1f", "#f2efe6", "MEETING ROOM 1", 256, 80), 0.5, 0.16, -11.6, 1.75, -2.95, 0);
  {
    const f = new Fr(-14, -8.5, 0);
    // walnut slab table on black sled legs
    boxU(f, mWalnut, 1.2, 6.4, 0.05, 1.5, 0, 0.7, 0);
    f.box(mSteelBlack, 5.6, 0.06, 0.06, 0, 0.64, 0);
    for (const s of [-1, 1]) {
      const lx = s * 2.5;
      for (const zz of [-0.55, 0.55]) f.box(mSteelBlack, 0.07, 0.64, 0.07, lx, 0.02, zz);
      f.box(mSteelBlack, 0.08, 0.04, 1.3, lx, 0, 0);
      f.box(mSteelBlack, 0.08, 0.05, 1.3, lx, 0.63, 0);
    }
    // cable port, spine and cables
    f.box(mSteelBlack, 0.34, 0.012, 0.14, 0, 0.75, 0);
    f.cyl(mSteelBlack, 0.04, 0.04, 0.64, 0.4, 0, 0.1, 12);
    for (let i = 0; i < 3; i++) B.add(mRubber, tubeG([[-14 + 0.05 * i, 0.76, -8.5], [-14 + 0.1 + 0.05 * i, 0.9, -8.5 + 0.2 - i * 0.2], [-14 - 0.4 - i * 0.6, 0.77, -8.5 + 0.25 - i * 0.25]], 0.005, 16, 4));
    f.col(-3.2, 3.2, -0.75, 0.75, 0, 0.75, true);
    // chairs
    for (let i = 0; i < 6; i++) {
      const x = -14 + (i - 2.5) * 1.02;
      chair(x + rr(-0.06, 0.06), -8.5 - 1.08 - rr(0, 0.15), rr(-0.25, 0.25), "#2a2c30");
      chair(x + rr(-0.06, 0.06), -8.5 + 1.08 + rr(0, 0.15), Math.PI + rr(-0.25, 0.25), "#2a2c30");
    }
    chair(-17.75, -8.5, Math.PI / 2, "#2a2c30");
    chair(-10.2, -8.3, -Math.PI / 2 + 0.3, "#2a2c30");
    // on the table: notepads, pens, laptops, bottles, glasses, mugs, phone
    for (let i = 0; i < 6; i++) for (const s of [-1, 1]) {
      const x = -14 + (i - 2.5) * 1.02, z = -8.5 + s * 0.5;
      if (rnd() < 0.35) {
        const g = new Fr(x, z, s < 0 ? 0 : Math.PI);
        g.box(mGreyP, 0.32, 0.012, 0.22, 0, 0.75, 0);
        g.box(mKeyboard, 0.28, 0.002, 0.1, 0, 0.762, 0.02);
        g.geo(mGreyP, new THREE.BoxGeometry(0.32, 0.21, 0.008), 0, 0.762 + 0.1, -0.11 - 0.03, -0.25);
        g.geo(mScreens, uvPlane(0.29, 0.18, SCREEN(screenN++ % 16)), 0, 0.762 + 0.1, -0.11 - 0.03 + 0.005, -0.25);
      } else {
        paper(x, 0.75, z, 1 + Math.floor(rnd() * 3));
        penI.add(x + 0.14, 0.756, z, [1, 1, 1], pick(["#1d3f9a", "#111", "#c2272d"]), rnd() * 3, Math.PI / 2);
      }
      if (rnd() < 0.5) mug(x + 0.3, 0.75, z - s * 0.1);
      else if (rnd() < 0.6) bottleI.add(x - 0.32, 0.75, z - s * 0.12, [1, 1, 1], pick(["#bfe3f5", "#9fd0ea", "#dfeff5"]));
    }
    // conference phone
    f.geo(mBlackP, latheG([[0.001, 0], [0.13, 0], [0.14, 0.01], [0.12, 0.04], [0.04, 0.05], [0.001, 0.05]], 3), 0, 0.75, 0);
    for (let i = 0; i < 4; i++) mugI.add(-14 + 1.2 + i * 0.09, 0.75, -8.5 + 0.12, [0.9, 1.1, 0.9], "#dfeff5");
    // TV + credenza on the west wall
    const tv = new Fr(-19.85, -8.5, Math.PI / 2);
    tv.box(mBlackP, 2.0, 1.16, 0.06, 0, 1.0, 0.04);
    tv.geo(mTv, new THREE.PlaneGeometry(1.94, 1.1), 0, 1.58, 0.072);
    boxU(tv, mWalnut, 1.2, 2.4, 0.62, 0.46, 0, 0.14, 0.26);
    for (let i = 0; i < 4; i++) {
      tv.box(mWalnut, 0.58, 0.56, 0.02, -0.9 + i * 0.6, 0.17, 0.49);
      tv.box(mBrass, 0.012, 0.18, 0.02, -0.9 + i * 0.6 + (i % 2 ? -0.24 : 0.24), 0.35, 0.51);
    }
    for (const s of [-1, 1]) for (const zz of [0.08, 0.44]) tv.geo(mSteelBlack, beam([s * 1.1, 0, zz], [s * 1.1, 0.14, zz], 0.018, 6));
    tv.col(-1.2, 1.2, 0, 0.5, 0, 0.76, true);
    plant(...tv.pt(-0.9, 0.26), 0.55, 0, 0.76, mCeramic);
    bookRow(tv, 0.55, 0.76, 0.35, 0.4, 0.24);
    B.add(mBlackP, place(new THREE.BoxGeometry(0.3, 0.06, 0.12), ...(([a, b]) => [a, 0.8, b] as V3t)(tv.pt(0, 0.22))));
    B.add(mRubber, tubeG([[-19.8, 1.0, -8.3], [-19.78, 0.85, -8.2], [-19.74, 0.77, -8.1]], 0.008, 10, 4));
    // whiteboard between the windows
    const wbf = new Fr(-14, -13.85, 0);
    wbf.box(mAlu, 2.5, 1.3, 0.03, 0, 0.9, 0.015);
    wbf.geo(boards.roadmap, new THREE.PlaneGeometry(2.42, 1.22), 0, 1.55, 0.032);
    wbf.box(mAlu, 1.2, 0.03, 0.08, 0, 0.87, 0.06);
    for (let i = 0; i < 4; i++) wbf.geo(i === 0 ? mRedP : i === 1 ? mBlackP : i === 2 ? mGreenP : mBlueP, new THREE.CylinderGeometry(0.009, 0.009, 0.13, 8), -0.4 + i * 0.05, 0.915, 0.07, 0, 0, Math.PI / 2);
    wbf.box(mBlackP, 0.13, 0.04, 0.05, 0.3, 0.9, 0.07);
    clock(-14, 3.05, -13.85, 0);
    // mobile whiteboard in the corner
    mobileBoard(-9.1, -12.6, -Math.PI / 2 - 0.55, boards.brainstorm);
    plant(-19.3, -13.3, 1.4, 3, 0, mConcrete);
    plant(-8.6, -3.6, 1.3, 0, 0, mConcrete);
    plant(-19.3, -3.7, 1.1, 1, 0, mCeramic);
    linearPendant(-15.6, -8.5, 2.6, 2.45);
    linearPendant(-12.4, -8.5, 2.6, 2.45);
    lights.push({ pos: [-14, 2.4, -8.5], color: "#fff0dc", int: 48, dist: 18 });
    floorStain(-12.8, -10.4, 0.6);
    floorStain(-16.5, -6.2, 0.45);
  }

  // =====================================================================================
  // CUBICLES (open office on carpet tiles, x -7.4..16, z -14..-2.6)
  // =====================================================================================
  k.room("Cubicles", -7.4, 16, -14, -2.6);
  const partI = new IList(chamferGeo(1, 1, 1, 0.01), mPartFab);
  ILISTS.push(partI);
  const partPal = ["#8a9199", "#6f7f8f", "#4f6a78", "#9a8f7c", "#707a6a", "#7f7a8c"];
  let nameN = 0;
  /** one workstation: frame local +z = where the worker sits, spine at lz = -0.4 */
  const workstation = (x: number, z: number, ry: number) => {
    const f = new Fr(x, z, ry);
    boxU(f, mDeskTop, 1.4, 1.56, 0.03, 0.78, 0, 0.69, 0);
    f.box(mSteelBlack, 1.56, 0.012, 0.78, 0, 0.678, 0);
    for (const s of [-1, 1]) {
      for (const zz of [-0.3, 0.3]) f.box(mSteelBlack, 0.045, 0.66, 0.045, s * 0.72, 0.03, zz);
      f.box(mSteelBlack, 0.05, 0.03, 0.66, s * 0.72, 0, 0);
      f.box(mSteelBlack, 0.05, 0.04, 0.66, s * 0.72, 0.66, 0);
    }
    f.box(mSteelBlack, 1.38, 0.28, 0.012, 0, 0.36, -0.33);
    // pedestal with 3 drawers
    const px = 0.5;
    f.box(mCreamP, 0.42, 0.56, 0.56, px, 0.08, -0.06);
    let yy = 0.09;
    for (const hh of [0.13, 0.13, 0.28]) {
      f.box(mWhiteP, 0.405, hh - 0.012, 0.018, px, yy, 0.23);
      f.box(mAlu, 0.16, 0.014, 0.022, px, yy + hh - 0.05, 0.245);
      yy += hh;
    }
    for (const sx of [-0.17, 0.17]) for (const sz of [-0.28, 0.16]) f.geo(mBlackP, new THREE.SphereGeometry(0.025, 8, 6), px + sx, 0.03, sz);
    // monitors
    if (rnd() < 0.35) { monitor(f, -0.3, 0.72, -0.2, 0.18, 0.5); monitor(f, 0.26, 0.72, -0.2, -0.18, 0.5); }
    else monitor(f, rr(-0.1, 0.1), 0.72, -0.2);
    keyboard(f, rr(-0.12, 0.02), 0.72, 0.13, rr(-0.1, 0.1));
    // desk clutter
    const [mx, mz] = f.pt(0.58, 0.14);
    if (rnd() < 0.75) mug(mx, 0.72, mz);
    const [px2, pz2] = f.pt(-0.56, rr(-0.05, 0.15));
    if (rnd() < 0.7) paper(px2, 0.72, pz2, 1 + Math.floor(rnd() * 4));
    if (rnd() < 0.35) { const [a, b] = f.pt(-0.62, -0.26); plant(a, b, 0.42, 2, 0.72, pick([mCeramic, mConcrete, mTerracotta])); }
    else if (rnd() < 0.5) { const g = new Fr(...f.pt(-0.6, -0.25), f.ry + 0.35); g.box(mBlackP, 0.12, 0.16, 0.012, 0, 0.72, 0, -0.15); g.geo(mPhotos, uvPlane(0.1, 0.075, [Math.floor(rnd() * 4) / 4, 0, 0.25, 1]).rotateX(-0.15), 0, 0.8, 0.012); }
    if (rnd() < 0.6) { const [a, b] = f.pt(0.35, -0.3); B.add(mSteelBlack, place(latheG([[0.001, 0], [0.035, 0], [0.036, 0.1], [0.032, 0.1], [0.031, 0.006], [0.001, 0.006]], 12), a, 0.72, b)); for (let i = 0; i < 3; i++) penI.add(a + rr(-0.012, 0.012), 0.8, b + rr(-0.012, 0.012), [1, 1, 1], pick(["#1d3f9a", "#111", "#c2272d", "#e0b020"]), 0, rr(-0.2, 0.2), rr(-0.2, 0.2)); }
    if (rnd() < 0.3) { const [a, b] = f.pt(-0.3, 0.2); for (let i = 0; i < 3; i++) stickyFlat(a + rr(-0.08, 0.08), 0.722 + i * 0.0005, b + rr(-0.05, 0.05)); }
    if (rnd() < 0.25) { const [a, b] = f.pt(0.62, -0.1); bottleI.add(a, 0.72, b, [1, 1, 1], pick(["#bfe3f5", "#e04a3a", "#3a8a5a", "#2a2a2a"])); }
    if (rnd() < 0.2) { const g = new Fr(...f.pt(-0.45, -0.22), f.ry + 0.5); g.cyl(mBlackP, 0.07, 0.08, 0.02, 0, 0.72, 0); g.geo(mBlackP, beam([0, 0.74, 0], [0.02, 1.08, -0.05], 0.01, 6)); g.geo(mBlackP, beam([0.02, 1.08, -0.05], [0.18, 1.1, 0.08], 0.01, 6)); g.geo(mBlackP, latheG([[0.02, 0.07], [0.06, 0.03], [0.075, 0], [0.07, 0]], 14), 0.18, 1.02, 0.08); g.geo(mLampE, new THREE.CircleGeometry(0.06, 12).rotateX(Math.PI / 2), 0.18, 1.021, 0.08); }
    // desk name plate (tent) facing the aisle
    {
      const n = nameN % 16;
      const g = new Fr(...f.pt(0.3, 0.33), f.ry);
      g.geo(mBlackP, new THREE.BoxGeometry(0.2, 0.055, 0.03), 0, 0.748, 0, -0.35);
      g.geo(mNames, uvPlane(0.19, 0.047, [(n % 2) / 2, 1 - (Math.floor(n / 2) + 1) / 8, 0.5, 0.125]), 0, 0.748, 0.0163, -0.35);
      if (n === 0) {
        const [a, b] = f.pt(-0.3, 0.12);
        docFlat(a, 0.72, b, 0, f.ry + 0.15);
        const [a2, b2] = f.pt(-0.5, 0.0);
        docFlat(a2, 0.7215, b2, 1, f.ry - 0.3);
        const [a3, b3] = f.pt(0.1, -0.37);
        sticky(a3, 1.05, b3, f.ry, 4);
      } else if (rnd() < 0.18) { const [a, b] = f.pt(-0.45, 0.1); docFlat(a, 0.7225, b, 0, f.ry + rr(-0.4, 0.4)); }
    }
    // chair + bin
    const [cx, cz] = f.pt(rr(-0.2, 0.2), rr(0.6, 0.72));
    chair(cx, cz, f.ry + Math.PI + rr(-0.6, 0.6));
    const [bx, bz] = f.pt(-0.55, -0.12);
    bin(bx, bz);
    // sticky notes + a name plate on the spine
    for (let i = 0; i < Math.floor(rnd() * 4); i++) { const [a, b] = f.pt(rr(-0.7, 0.7), -0.37); sticky(a, rr(0.95, 1.18), b, f.ry); }
    if (rnd() < 0.35) { const [a, b] = f.pt(rr(-0.5, 0.5), -0.372); const g = new Fr(a, b, f.ry); g.geo(mCalendar, new THREE.PlaneGeometry(0.2, 0.25), 0, 1.0, 0); }
    if (rnd() < 0.4) { const [a, b] = f.pt(-0.3 + rr(-0.2, 0.2), -0.373); const g = new Fr(a, b, f.ry); g.geo(mPapers, uvPlane(0.21, 0.297, PAPER(Math.floor(rnd() * 8))), 0, 1.02, 0, 0, 0, rr(-0.08, 0.08)); }
    return nameN++;
  };
  const pod = (cx: number, cz: number) => {
    const col = pick(partPal);
    partI.add(cx, 0.625, cz, [3.24, 1.25, 0.05], col);
    B.add(mAlu, place(new THREE.BoxGeometry(3.26, 0.02, 0.06), cx, 1.26, cz));
    for (const sx of [-1.6, 0, 1.6]) {
      const hh = sx === 0 ? 1.08 : 1.2;
      partI.add(cx + sx, hh / 2, cz, [0.05, hh, 1.66], col);
      B.add(mAlu, place(new THREE.BoxGeometry(0.06, 0.02, 1.68), cx + sx, hh + 0.01, cz));
      for (const e of [-1, 1]) B.add(mAlu, place(new THREE.BoxGeometry(0.06, hh, 0.02), cx + sx, hh / 2, cz + e * 0.83));
      k.collider(cx + sx - 0.03, cx + sx + 0.03, cz - 0.83, cz + 0.83, 0, hh, true);
      if (sx !== 0) for (const e of [-1, 1]) {
        const n = (nameN + 3 + (sx > 0 ? 2 : 0) + (e > 0 ? 1 : 0)) % 16;
        const g = new Fr(cx + sx + Math.sign(sx) * 0.027, cz + e * 0.42, Math.sign(sx) * Math.PI / 2);
        g.geo(mNames, uvPlane(0.24, 0.06, [(n % 2) / 2, 1 - (Math.floor(n / 2) + 1) / 8, 0.5, 0.125]), 0, 1.05, 0);
      }
    }
    k.collider(cx - 1.62, cx + 1.62, cz - 0.83, cz + 0.83, 0, 0.74, true);
    k.collider(cx - 1.62, cx + 1.62, cz - 0.03, cz + 0.03, 0, 1.25, true);
    for (const s of [-1, 1]) for (const i of [-0.5, 0.5]) workstation(cx + i * 1.6, cz + s * 0.43, s > 0 ? 0 : Math.PI);
    // things stored on the partition tops
    if (rnd() < 0.6) cboxI.add(cx + rr(-1.2, 1.2), 1.25 + 0.14, cz, [0.42, 0.28, 0.32], undefined, rr(-0.2, 0.2));
    if (rnd() < 0.5) plant(cx + rr(-1, 1), cz, 0.45, 1, 1.26, mCeramic);
  };
  for (const cz of [-11.6, -6.6]) for (const cx of [-2.4, 2.8, 8.0, 13.2]) pod(cx, cz);
  for (const x of [-2.4, 0.2, 2.8, 5.4, 8.0, 10.6, 13.2]) for (const z of [-12.9, -9.1, -4.3]) troffer(x, z, 0);
  lights.push({ pos: [0.2, 3.36, -9.1], color: "#f2f5ff", int: 48, dist: 18 });
  lights.push({ pos: [10.6, 3.36, -9.1], color: "#f2f5ff", int: 48, dist: 18 });
  mobileBoard(-5.9, -10.6, Math.PI / 2, boards.sprint);
  mobileBoard(10.6, -3.5, 0.12, boards.erased);
  // carpet edge trim + stains
  B.add(mAlu, place(new THREE.BoxGeometry(23.4, 0.014, 0.05), 4.3, 0.007, -2.6));
  for (let i = 0; i < 9; i++) floorStain(rr(-6, 15), rr(-13, -3), rr(0.3, 0.7), 0.016);
  // filing cabinets along the north wall (west end)
  for (let i = 0; i < 5; i++) {
    const f = new Fr(-7.2 + i * 0.5, -13.55, 0);
    const tall = i % 2 === 0 ? 1.32 : 1.02;
    f.box(mGreyP, 0.47, tall, 0.62, 0, 0, 0);
    const nd = tall > 1.1 ? 4 : 3;
    for (let d = 0; d < nd; d++) {
      const y = 0.04 + d * ((tall - 0.06) / nd);
      f.box(mSteel, 0.44, (tall - 0.06) / nd - 0.015, 0.015, 0, y, 0.315);
      f.box(mChrome, 0.12, 0.018, 0.025, 0, y + (tall - 0.06) / nd - 0.08, 0.33);
      f.geo(mPaper, new THREE.PlaneGeometry(0.08, 0.035), 0, y + (tall - 0.06) / nd - 0.04, 0.3235);
    }
    f.col(-0.235, 0.235, -0.31, 0.31, 0, tall, true);
    if (i === 1) plant(-7.2 + i * 0.5, -13.55, 0.55, 0, tall, mCeramic);
    if (i === 3) { const g = new Fr(-7.2 + i * 0.5, -13.55, 0); g.geo(mBinders, uvPlane(0.44, 0.3, [0, 0, 0.6, 1]), 0, tall + 0.15, 0.1); g.box(mInst, 0.44, 0.3, 0.2, 0, tall, 0); }
    if (i === 0 || i === 4) cboxI.add(-7.2 + i * 0.5, tall + 0.15, -13.55, [0.44, 0.3, 0.5], undefined, rr(-0.1, 0.1));
  }
  waterCooler(-7.45, -6.2, Math.PI / 2);
  plant(-7.3, -3.2, 1.2, 3, 0, mConcrete);
  extinguisher(-7.6, -9.8);
  poster(0, -7.83, 1.7, -11.2, Math.PI / 2 + Math.PI, 0.65);

  // manager's office (glass box in the NE corner)
  glassWall("x", -8.5, 16, 20, [[17.2, 1.5]]);
  glassWall("z", 16, -14, -8.5);
  glassLeaf(16.45, -8.45, 0, 0.72);
  k.room("Manager's Office", 16, 20, -14, -8.5);
  wallSign(signMat("mgr", "MANAGER", "#1b1c1f", "#f2efe6", "please knock", 256, 80), 0.36, 0.11, 16.3, 1.75, -8.44, 0);
  {
    const f = new Fr(18.75, -11.3, -Math.PI / 2); // faces -x (towards the door)
    boxU(f, mWalnut, 1.2, 1.8, 0.05, 0.85, 0, 0.7, 0);
    for (const s of [-1, 1]) boxU(f, mWalnut, 1.2, 0.05, 0.7, 0.8, s * 0.87, 0, 0);
    boxU(f, mWalnut, 1.2, 1.7, 0.45, 0.02, 0, 0.22, -0.38);
    monitor(f, 0.1, 0.75, -0.18, 0, 0.62);
    keyboard(f, 0, 0.75, 0.14);
    paper(...(([a, b]) => [a, 0.75, b] as V3t)(f.pt(-0.6, 0.1)), 3);
    mug(...(([a, b]) => [a, 0.75, b] as V3t)(f.pt(0.6, 0.15)), true, "#1d3f7a");
    { const [a, b] = f.pt(-0.35, -0.05); docFlat(a, 0.75, b, 1, f.ry + Math.PI + 0.1); const [a2, b2] = f.pt(0.45, -0.15); docFlat(a2, 0.75, b2, 0, f.ry + Math.PI - 0.2); }
    f.col(-0.92, 0.92, -0.43, 0.43, 0, 0.75, true);
    chair(...f.pt(0, -0.72), f.ry, "#2a2624");
    for (const s of [-1, 1]) { const [a, b] = f.pt(s * 0.5, 0.82); chair(a, b, f.ry + Math.PI + s * 0.2, "#5a2f33"); }
    // bookshelf on the east wall
    const sh = new Fr(19.64, -11.3, -Math.PI / 2);
    shelfUnit(sh, 2.4, 2.1, 0.36, 5);
    painting(19.84, 2.85, -11.3, -Math.PI / 2, 1.1, 0.8, 11);
    plant(19.4, -13.4, 1.2, 3, 0, mConcrete);
    domePendant(18.6, -11.3, 2.5, 0.26);
  }
  // print corner (east end)
  k.room("Print Corner", 16, 20, -8.5, -2.6);
  {
    for (const [z, oo] of [[-7.4, false], [-5.7, true]] as [number, boolean][]) copier(19.35, z, -Math.PI / 2, oo);
    const sh = new Fr(19.64, -3.6, -Math.PI / 2);
    shelfUnit(sh, 1.6, 1.8, 0.4, 4, true);
    for (let i = 0; i < 6; i++) cboxI.add(17.4 + (i % 3) * 0.44, 0.14 + Math.floor(i / 3) * 0.28, -3.1, [0.42, 0.28, 0.3], undefined, rr(-0.05, 0.05));
    k.collider(17.15, 18.5, -3.3, -2.9, 0, 0.56, true);
    wallSign(signMat("print", "PRINT & COPY", "#e0602a", "#ffffff", "please collect your prints", 256, 80), 0.9, 0.28, 19.83, 2.4, -6.5, -Math.PI / 2);
    // shredder + recycling
    const f = new Fr(16.35, -5.9, Math.PI / 2);
    f.box(mBlackP, 0.4, 0.62, 0.3, 0, 0, 0);
    f.box(mGreyP, 0.42, 0.06, 0.32, 0, 0.62, 0);
    f.col(-0.2, 0.2, -0.15, 0.15, 0, 0.68, true);
    for (let i = 0; i < 3; i++) { const g = new Fr(16.4, -7.25 + i * 0.42, Math.PI / 2); g.box(mInstB[i], 0.38, 0.72, 0.38, 0, 0, 0); g.geo(mPaper, new THREE.PlaneGeometry(0.2, 0.08), 0, 0.5, 0.195); }
    k.collider(16.2, 16.6, -7.45, -6.2, 0, 0.72, true);
    extinguisher(16.3, -3.0);
  }

  // =====================================================================================
  // RECEPTION (x 8..20, z 2..14)
  // =====================================================================================
  k.room("Reception", 8.6, 20, 2, 14);
  {
    // moss feature wall with logo
    const f = new Fr(14, 3.4, 0);
    boxU(f, mWalnut, 1.2, 7.2, 3.1, 0.34, 0, 0, 0);
    f.geo(mMoss, uvPlane(6.9, 2.8, [0, 0, 6.9 / 1.5, 2.8 / 1.5]), 0, 1.6, 0.172);
    f.geo(mLogo, new THREE.PlaneGeometry(3.6, 1.125), 0, 2.05, 0.19);
    f.geo(mOak, uvPlane(6.9, 2.8, [0, 0, 2.8 / 1.2, 6.9 / 1.2]), 0, 1.6, -0.172, 0, Math.PI);
    f.col(-3.6, 3.6, -0.17, 0.17, 0, 3.1, true);
    for (const x of [-2.6, 0, 2.6]) { f.geo(mSteelBlack, latheG([[0.001, 0], [0.05, 0], [0.06, 0.1], [0.03, 0.12], [0.001, 0.12]], 12), x, 3.1, 0.35, -2.2); }
    // reception desk: slatted oak front, white high counter, work surface behind
    const d = new Fr(14, 6.3, 0); // front faces +z (visitors come from the south)
    d.box(mBlackP, 3.6, 0.08, 0.7, 0, 0, 0);
    for (let i = 0; i < 44; i++) d.box(mOak, 0.055, 1.0, 0.04, -1.78 + i * 0.0825, 0.08, 0.33);
    for (const s of [-1, 1]) { for (let i = 0; i < 9; i++) d.box(mOak, 0.04, 1.0, 0.055, s * 1.78, 0.08, 0.3 - i * 0.075); }
    boxU(d, mCreamP, 2, 3.7, 0.04, 0.42, 0, 1.08, 0.2);
    boxU(d, mOak, 1.4, 3.5, 0.03, 0.62, 0, 0.72, -0.1);
    d.box(mBlackP, 3.5, 0.95, 0.03, 0, 0.1, 0.3);
    d.col(-1.85, 1.85, -0.4, 0.42, 0, 1.12, true);
    monitor(d, -0.5, 0.75, -0.05, Math.PI, 0.56);
    keyboard(d, -0.5, 0.75, -0.28, Math.PI);
    // desk phone
    d.box(mBlackP, 0.2, 0.05, 0.18, 0.6, 0.75, -0.2, -0.2);
    d.box(mBlackP, 0.2, 0.04, 0.05, 0.6, 0.8, -0.13);
    mug(...(([a, b]) => [a, 0.75, b] as V3t)(d.pt(0.2, -0.3)), true, "#c32a26");
    paper(...(([a, b]) => [a, 0.75, b] as V3t)(d.pt(1.1, -0.2)), 3);
    { const [a, b] = d.pt(0.8, -0.28); docFlat(a, 0.752, b, 1, d.ry + Math.PI + 0.2); }
    { const [a, b] = d.pt(-1.2, -0.15); stickyFlat(a, 0.751, b, 1); stickyFlat(a + 0.1, 0.7515, b, 11); }
    // on the counter: bell, visitor book, candy bowl, plant, card holder
    const [bx1, bz1] = d.pt(0.9, 0.2);
    B.add(mBrass, place(latheG([[0.001, 0], [0.05, 0], [0.045, 0.02], [0.03, 0.045], [0.006, 0.06], [0.004, 0.07], [0.001, 0.07]], 16), bx1, 1.12, bz1));
    d.box(mBlackP, 0.34, 0.02, 0.24, -0.2, 1.12, 0.2, 0, 0.1);
    d.geo(mPapers, uvPlane(0.3, 0.2, PAPER(6)).rotateX(-Math.PI / 2), -0.2, 1.142, 0.2, 0, 0.1);
    penI.add(...(([a, b]) => [a, 1.15, b] as V3t)(d.pt(-0.02, 0.22)), [1, 1, 1], "#111", 0.4, Math.PI / 2);
    const [cb1, cb2] = d.pt(-1.2, 0.2);
    B.add(mGlassBowl, place(latheG([[0.001, 0], [0.05, 0], [0.1, 0.05], [0.11, 0.08], [0.105, 0.08], [0.095, 0.05], [0.045, 0.006], [0.001, 0.006]], 18), cb1, 1.12, cb2));
    for (let i = 0; i < 12; i++) boxI.add(cb1 + rr(-0.06, 0.06), 1.14 + rr(0, 0.03), cb2 + rr(-0.06, 0.06), [0.025, 0.018, 0.035], pick(["#e8402a", "#f0c020", "#2a70d0", "#30a050", "#f080a0"]), rnd() * 6);
    plant(...d.pt(1.5, 0.2), 0.4, 1, 1.12, mCeramic);
    wallSign(signMat("wel", "WELCOME", "#f2efe6", "#1b1c1f", "please sign in at the desk", 256, 80), 0.36, 0.11, 13.4, 1.16, 6.72, -0.1);
    chair(14.1, 5.2, 0.2, "#2a2c30");
    chair(12.9, 5.4, 0.6, "#474b52");
    for (const x of [12.8, 14, 15.2]) domePendant(x, 6.3, 2.55, 0.2, mBrass);
    lights.push({ pos: [14, 2.52, 6.3], color: "#ffe6c4", int: 44, dist: 18 });
    // waiting area
    for (const z of [8.4, 10.8]) armchair(18.95, z, -Math.PI / 2, mLeatherBlk, mLeatherBlk);
    sideTable(19.1, 9.6, 0.26);
    plant(19.35, 12.9, 1.5, 3, 0, mConcrete);
    plant(19.4, 7.2, 1.0, 1, 0, mCeramic);
    painting(19.85, 1.85, 9.6, -Math.PI / 2, 1.2, 0.9, 5);
    // entrance: glass double doors, mat, EXIT sign, coat stand, umbrella stand
    for (const s of [-1, 1]) {
      const g = new Fr(14.5 + s * 0.6, 13.93, 0);
      g.box(mSteelBlack, 1.18, 0.1, 0.05, 0, 0, 0);
      g.box(mSteelBlack, 1.18, 0.06, 0.05, 0, DOOR - 0.06, 0);
      for (const e of [-1, 1]) g.box(mSteelBlack, 0.06, DOOR, 0.05, e * 0.56, 0, 0);
      g.geo(mGlass, new THREE.BoxGeometry(1.1, DOOR - 0.15, 0.012), 0, DOOR / 2 + 0.02, 0);
      g.geo(mChrome, new THREE.CylinderGeometry(0.016, 0.016, 1.1, 10), -s * 0.44, 1.15, -0.07);
      g.geo(mChrome, beam([-s * 0.44, 0.7, -0.07], [-s * 0.44, 0.7, -0.02], 0.01, 6));
      g.geo(mChrome, beam([-s * 0.44, 1.6, -0.07], [-s * 0.44, 1.6, -0.02], 0.01, 6));
    }
    k.collider(13.3, 15.7, 13.85, 14.1, 0, DOOR, false);
    flat(mMat, 13.4, 15.6, 12.2, 13.8, 0.01);
    const ex = new Fr(14.5, 13.84, Math.PI);
    ex.box(mWhiteP, 0.4, 0.16, 0.05, 0, DOOR + 0.28, 0);
    ex.geo(mExit, new THREE.PlaneGeometry(0.36, 0.12), 0, DOOR + 0.36, 0.027);
    coatStand(9.6, 13.2);
    B.add(mSteelBlack, place(latheG([[0.001, 0], [0.12, 0], [0.12, 0.5], [0.115, 0.5], [0.115, 0.01], [0.001, 0.01]], 16), 10.3, 0, 13.4));
    for (let i = 0; i < 2; i++) B.add(i ? mRedP : mBlackP, beam([10.3 + (i - 0.5) * 0.08, 0.1, 13.4], [10.3 + (i - 0.5) * 0.18, 0.85, 13.45], 0.016, 8));
    clock(14.5, 3.1, 13.84, Math.PI, 0.22);
    floorStain(12.5, 11.6, 0.5);
    floorStain(16.4, 12.8, 0.4);
  }

  // =====================================================================================
  // LOUNGE (x -6..8.4, z 2..14)
  // =====================================================================================
  k.room("Lounge", -7.8, 8.6, 2, 14);
  {
    B.add(mRug, place(new THREE.BoxGeometry(5.2, 0.014, 4.0), 1, 0.007, 9.6));
    chesterfield(1, 12.95, Math.PI, 3);
    armchair(-2.2, 9.7, Math.PI / 2, mLeather, mLeatherP);
    armchair(4.2, 9.7, -Math.PI / 2, mLeather, mLeatherP);
    palletTable(1, 9.7);
    // side tables + lamp
    sideTable(-0.9, 13.2, 0.24);
    sideTable(2.9, 13.2, 0.24);
    const lampX = 2.9, lampZ = 13.2;
    B.add(mBrass, place(new THREE.CylinderGeometry(0.012, 0.012, 0.4, 8), lampX, 0.8, lampZ));
    B.add(mShade, place(latheG([[0.13, 0], [0.09, 0.2], [0.088, 0.2]], 20), lampX, 0.9, lampZ));
    B.add(mLampE, place(new THREE.SphereGeometry(0.04, 10, 6), lampX, 0.98, lampZ));
    arcLamp(-1.3, 12.9, 0.7, 10.6);
    // foosball table
    foosball(5.3, 4.3);
    // communal hot-desk bench with stools and laptops
    {
      const f = new Fr(-1.4, 4.6, 0);
      boxU(f, mOak, 1.4, 3.8, 0.05, 0.95, 0, 0.72, 0);
      for (const s2 of [-1, 1]) for (const e of [-1, 1]) {
        f.geo(mSteelBlack, beam([s2 * 1.75, 0, e * 0.4], [s2 * 1.72, 0.72, e * 0.3], 0.012, 6));
        f.geo(mSteelBlack, beam([s2 * 1.75, 0, e * 0.4], [s2 * 1.78, 0.72, e * 0.3 - e * 0.2], 0.012, 6));
      }
      f.col(-1.9, 1.9, -0.48, 0.48, 0, 0.77, true);
      for (let i = 0; i < 3; i++) for (const e of [-1, 1]) {
        const lx = -1.2 + i * 1.2;
        const [sx, sz] = f.pt(lx + rr(-0.1, 0.1), e * 0.78);
        B.add(mWalnut, place(latheG([[0.001, 0], [0.17, 0], [0.18, 0.03], [0.16, 0.05], [0.001, 0.05]], 20), sx, 0.46, sz));
        for (let l = 0; l < 4; l++) { const a = l * Math.PI / 2 + 0.6; B.add(mSteelBlack, beam([sx + Math.cos(a) * 0.1, 0.46, sz + Math.sin(a) * 0.1], [sx + Math.cos(a) * 0.17, 0, sz + Math.sin(a) * 0.17], 0.011, 6)); }
        k.collider(sx - 0.17, sx + 0.17, sz - 0.17, sz + 0.17, 0, 0.51, true);
        const g = new Fr(...f.pt(lx, e * 0.22), e > 0 ? Math.PI : 0);
        if (rnd() < 0.6) {
          g.box(mAlu, 0.32, 0.012, 0.22, 0, 0.77, 0);
          g.box(mKeyboard, 0.28, 0.002, 0.1, 0, 0.782, 0.02);
          g.geo(mAlu, new THREE.BoxGeometry(0.32, 0.21, 0.008), 0, 0.782 + 0.1, -0.14, -0.25);
          g.geo(mScreens, uvPlane(0.29, 0.18, SCREEN(screenN++ % 16)), 0, 0.782 + 0.1, -0.135, -0.25);
        } else paper(...(([a, b]) => [a, 0.77, b] as V3t)(g.pt(0, 0)), 2);
        if (rnd() < 0.6) mug(...(([a, b]) => [a, 0.77, b] as V3t)(g.pt(0.3, 0.1)));
      }
      plant(-1.4, 4.6, 0.5, 1, 0.77, mConcrete);
      for (const lx of [-1.2, 0, 1.2]) domePendant(-1.4 + lx, 4.6, 2.3, 0.18);
    }
    // bean bags
    for (const [bx, bz, s] of [[-4.6, 12.6, 1], [-5.0, 10.9, 0.9], [6.9, 12.7, 1.05]] as [number, number, number][]) beanBag(bx, bz, s);
    // ceiling fan with light kit
    ceilingFan(1, 9.7);
    lights.push({ pos: [1, 3.05, 9.7], color: "#ffe9cc", int: 44, dist: 18 });
    // paintings
    painting(1, 2.0, 13.85, Math.PI, 1.3, 0.95, 1);
    painting(-1.6, 1.95, 13.85, Math.PI, 0.6, 0.8, 2);
    painting(3.6, 1.95, 13.85, Math.PI, 0.6, 0.8, 3);
    painting(-7.84, 1.9, 9.6, Math.PI / 2, 1.5, 1.0, 4);
    poster(1, -7.84, 1.7, 6.3, Math.PI / 2, 0.7);
    poster(2, 6.2, 1.7, 13.84, Math.PI, 0.7);
    // bookshelf divider between lounge and reception
    for (let i = 0; i < 4; i++) {
      const f = new Fr(8.4, 5.6 + i * 1.5 + 0.75, Math.PI / 2);
      shelfUnit(f, 1.5, 2.0, 0.4, 5, false, true);
    }
    plant(-5.3, 3.2, 1.3, 3, 0, mConcrete);
    plant(7.6, 13.3, 1.2, 0, 0, mTerracotta);
    plant(-5.4, 13.35, 1.0, 1, 0, mCeramic);
    floorStain(-3.4, 7.2, 0.5);
    floorStain(5.8, 8.8, 0.35);
    floorStain(0.4, 5.3, 0.6);
  }

  // =====================================================================================
  // KITCHENETTE (x -20..-8, z 2..14)
  // =====================================================================================
  k.room("Kitchen", -20, -7.8, 2, 14);
  wall("z", -8, 5.2, Z2, H, mBrick, [], {});
  slab(mTile, X1, -8.15, 0, 0.008, 2.6, Z2, 1.2);
  {
    // counter along the west wall
    const f = new Fr(-19.85, 7.4, Math.PI / 2); // local +z = into the room (+x), lx along -z... (x = along wall)
    const L = 7.6;
    f.box(mBlackP, L, 0.1, 0.56, 0, 0, 0.3);
    boxU(f, mCab, 1, L, 0.78, 0.6, 0, 0.1, 0.3);
    const nd = 12;
    for (let i = 0; i < nd; i++) {
      const lx = -L / 2 + (i + 0.5) * (L / nd);
      if (Math.abs(lx - 1.6) < 0.35) continue; // dishwasher slot below
      f.box(mCab, L / nd - 0.012, 0.76, 0.02, lx, 0.11, 0.605);
      f.box(mBrass, 0.2, 0.014, 0.024, lx, 0.8, 0.625);
    }
    f.box(mStainless, 0.6, 0.76, 0.02, 1.6, 0.11, 0.605);
    f.box(mBlackP, 0.5, 0.05, 0.02, 1.6, 0.78, 0.617);
    boxU(f, mOak, 1.2, L + 0.04, 0.04, 0.64, 0, 0.88, 0.32);
    f.col(-L / 2, L / 2, 0, 0.64, 0, 0.92, true);
    // backsplash + open shelves
    f.geo(mSubway, uvPlane(L, 0.7, [0, 0, L / 0.6, 0.7 / 0.6]), 0, 1.27, 0.012);
    for (const y of [1.72, 2.12]) {
      boxU(f, mWalnut, 1.2, L - 1.2, 0.035, 0.26, -0.6, y, 0.13);
      for (const lx of [-3.9, -1.0, 2.6]) f.box(mSteelBlack, 0.03, 0.08, 0.2, lx, y - 0.08, 0.1);
    }
    for (let i = 0; i < 14; i++) mugI.add(...(([a, b]) => [a, 1.755, b] as V3t)(f.pt(-4 + i * 0.22, 0.14)), [1, 1, 1], pick(mugPal), rnd() * 6);
    for (let i = 0; i < 8; i++) { const [a, b] = f.pt(-3.8 + i * 0.3, 0.14); B.add(mGlassJar, place(latheG([[0.001, 0], [0.055, 0], [0.058, 0.02], [0.058, 0.2], [0.04, 0.22], [0.001, 0.22]], 14), a, 2.155, b)); boxI.add(a, 2.16, b, [0.07, 0.12 + rnd() * 0.05, 0.07], pick(["#6a3a1a", "#e8e0c8", "#c9a060", "#3a2a1a", "#f0f0ea"])); }
    for (let i = 0; i < 6; i++) { const [a, b] = f.pt(0.4 + i * 0.03, 0.14); B.add(mCeramic, place(new THREE.CylinderGeometry(0.12, 0.1, 0.012, 18), a, 2.16 + 0.1 + i * 0.013, b, Math.PI / 2 - 0.2, f.ry, 0)); }
    // sink + tap + dish rack
    const [sx, sz] = f.pt(-1.2, 0.3);
    B.add(mStainless, place(new THREE.BoxGeometry(0.4, 0.004, 0.72), sx, 0.922, sz, 0, 0, 0));
    B.add(mSinkDark, place(new THREE.BoxGeometry(0.34, 0.004, 0.62), sx + 0.0, 0.926, sz));
    B.add(mChrome, tubeG([[sx - 0.22, 0.92, sz], [sx - 0.22, 1.2, sz], [sx - 0.18, 1.3, sz], [sx - 0.08, 1.26, sz], [sx - 0.06, 1.18, sz]], 0.013, 20, 8));
    B.add(mChrome, place(new THREE.CylinderGeometry(0.025, 0.028, 0.05, 12), sx - 0.22, 0.945, sz));
    bottleI.add(sx - 0.24, 0.92, sz + 0.2, [1.1, 0.9, 1.1], "#3fae6a");
    { const [a, b] = f.pt(-0.3, 0.3); dishRack(a, 0.92, b); }
    // coffee machine, grinder, kettle, microwave, toaster, fruit bowl
    { const [a, b] = f.pt(0.6, 0.3); espresso(a, 0.92, b); }
    { const [a, b] = f.pt(1.25, 0.28); B.add(mBlackP, place(new THREE.BoxGeometry(0.18, 0.28, 0.24), a, 1.06, b)); B.add(mGlassJar, place(latheG([[0.04, 0], [0.09, 0.14], [0.085, 0.14]], 14), a, 1.2, b)); boxI.add(a, 1.21, b, [0.1, 0.07, 0.1], "#3a2210"); }
    { const [a, b] = f.pt(-2.1, 0.3); B.add(mStainless, place(latheG([[0.001, 0], [0.09, 0], [0.095, 0.02], [0.085, 0.2], [0.05, 0.24], [0.001, 0.25]], 18), a, 0.92, b)); B.add(mBlackP, place(new THREE.TorusGeometry(0.06, 0.012, 6, 12, Math.PI), a + 0.0, 1.17, b, 0, f.ry, 0)); }
    { const [a, b] = f.pt(2.6, 0.32); const mw = new Fr(a, b, f.ry); mw.box(mBlackP, 0.52, 0.3, 0.4, 0, 0.92, 0); mw.geo(mScreenOff, new THREE.PlaneGeometry(0.34, 0.22), -0.06, 1.07, 0.201); mw.box(mSteel, 0.1, 0.24, 0.01, 0.19, 0.95, 0.2); }
    { const [a, b] = f.pt(3.3, 0.3); const t2 = new Fr(a, b, f.ry); t2.box(mRedP, 0.28, 0.18, 0.16, 0, 0.92, 0); }
    { const [a, b] = f.pt(-3.0, 0.32); B.add(mWalnut, place(latheG([[0.001, 0], [0.08, 0], [0.16, 0.06], [0.17, 0.08], [0.16, 0.08], [0.07, 0.012], [0.001, 0.012]], 18), a, 0.92, b)); for (let i = 0; i < 6; i++) B.add(i < 3 ? mFruitR : mFruitY, place(new THREE.SphereGeometry(0.04, 10, 8), a + rr(-0.07, 0.07), 0.98 + (i > 3 ? 0.04 : 0), b + rr(-0.07, 0.07))); }
    { const [a, b] = f.pt(-3.55, 0.12); B.add(mPaper, place(new THREE.CylinderGeometry(0.06, 0.06, 0.26, 14), a, 1.05, b)); }
    // notice + calendar
    { const [a, b] = f.pt(-1.2, 0.014); const g = new Fr(a, b, f.ry); g.geo(mNotice, new THREE.PlaneGeometry(0.42, 0.3), 0, 1.35, 0.002); }
    for (let i = 0; i < 4; i++) mug(...(([a, b]) => [a, 0.92, b] as V3t)(f.pt(-0.8 + rr(-0.15, 0.4), rr(0.35, 0.55))), rnd() < 0.5);
    // fridge
    const fr = new Fr(-19.45, 12.5, Math.PI / 2);
    fr.box(mStainless, 0.82, 1.92, 0.72, 0, 0, 0);
    fr.box(mStainless, 0.8, 1.22, 0.02, 0, 0.66, 0.37);
    fr.box(mStainless, 0.8, 0.62, 0.02, 0, 0.02, 0.37);
    fr.box(mBlackP, 0.82, 0.02, 0.02, 0, 0.645, 0.372);
    for (const [y0, h0] of [[0.9, 0.7], [0.2, 0.35]]) fr.box(mChrome, 0.025, h0, 0.03, -0.34, y0, 0.4);
    fr.col(-0.41, 0.41, -0.36, 0.38, 0, 1.92, true);
    { const [a, b] = fr.pt(0.1, 0.382); const g = new Fr(a, b, fr.ry); g.geo(mPhotos, uvPlane(0.12, 0.09, [0.25, 0, 0.25, 1]), 0, 1.45, 0); g.geo(mPhotos, uvPlane(0.12, 0.09, [0.75, 0, 0.25, 1]), 0.14, 1.3, 0, 0, 0, 0.1); g.geo(mCalendar, new THREE.PlaneGeometry(0.22, 0.28), -0.1, 1.15, 0); }
    { const [a, b] = fr.pt(-0.2, 0.382); docWall(a, 1.55, b, 0, fr.ry, 0.04); }
    for (let i = 0; i < 4; i++) { const [a, b] = fr.pt(rr(-0.3, 0.3), 0.383); sticky(a, rr(1.0, 1.7), b, fr.ry); }
    cboxI.add(-19.45, 1.92 + 0.15, 12.5, [0.5, 0.3, 0.4], undefined, 0.2);
    // recycling bins
    for (let i = 0; i < 3; i++) { const g = new Fr(-19.5, 2.95 + i * 0.4, Math.PI / 2); g.box(mInstB[i], 0.36, 0.7, 0.4, 0, 0, 0); g.geo(mPaper, new THREE.PlaneGeometry(0.2, 0.08), 0, 0.5, 0.205); }
    k.collider(-19.75, -19.25, 2.75, 3.95, 0, 0.72, true);
    // bistro tables + chairs
    for (const [tx, tz] of [[-16, 5.9], [-16, 10.6], [-13.2, 8.25]] as [number, number][]) {
      bistro(tx, tz);
      domePendant(tx, tz, 2.35, 0.2);
    }
    lights.push({ pos: [-13.2, 2.35, 8.25], color: "#ffe6c4", int: 44, dist: 18 });
    // vending machine + water cooler against the partition
    {
      const v = new Fr(-8.58, 12.6, -Math.PI / 2);
      v.box(mBlackP, 0.95, 1.85, 0.8, 0, 0, 0);
      v.geo(mVending, new THREE.PlaneGeometry(0.9, 1.78), 0, 0.95, 0.401);
      v.col(-0.475, 0.475, -0.4, 0.4, 0, 1.85, true);
      waterCooler(-8.5, 10.9, -Math.PI / 2);
      extinguisher(-8.3, 6.0);
      // cork notice board: memo from Tom Kodner, supplier letter, stickies, calendar
      const cb = new Fr(-8.15, 8.4, -Math.PI / 2);
      cb.box(mOak, 1.5, 1.0, 0.03, 0, 1.05, 0.015);
      cb.geo(mCork, uvPlane(1.42, 0.92, [0, 0, 1.42 / 0.6, 0.92 / 0.6]), 0, 1.55, 0.032);
      { const [a, b] = cb.pt(-0.45, 0.034); docWall(a, 1.62, b, 0, cb.ry, 0.03); }
      { const [a, b] = cb.pt(-0.12, 0.034); docWall(a, 1.58, b, 1, cb.ry, -0.04); }
      const nt = cb.pt(0.3, 0.035);
      { const g = new Fr(nt[0], nt[1], cb.ry); g.geo(mNotice, new THREE.PlaneGeometry(0.34, 0.24), 0, 1.78, 0); g.geo(mCalendar, new THREE.PlaneGeometry(0.2, 0.25), 0.25, 1.4, 0); }
      for (let i = 0; i < 6; i++) { const [a, b] = cb.pt(0.15 + (i % 3) * 0.1, 0.036); sticky(a, 1.3 + Math.floor(i / 3) * 0.1, b, cb.ry, [0, 2, 6, 8, 12, 15][i]); }
      for (const [lx, ly] of [[-0.45, 1.75], [-0.12, 1.72], [0.3, 1.89]]) { const [a, b] = cb.pt(lx, 0.04); B.add(mRedP, place(new THREE.SphereGeometry(0.008, 6, 4), a, ly, b)); }
      wallSign(signMat("kit", "KITCHEN", "#1b1c1f", "#f2efe6", "coffee · snacks · water", 256, 80), 0.7, 0.22, -8.0, 2.9, 5.05, Math.PI);
    }
    for (let i = 0; i < 5; i++) floorStain(rr(-18.5, -10), rr(3.5, 13), rr(0.3, 0.6), 0.012);
  }

  // =====================================================================================
  // AISLE (z -2.6..2), west part in front of the conference room
  // =====================================================================================
  k.room("Office Aisle", -20, 20, -2.6, 2);
  painting(-19.84, 1.8, -0.4, Math.PI / 2, 1.0, 1.3, 7);
  plant(-19.3, 1.4, 1.3, 0, 0, mTerracotta);
  coatStand(-19.35, -2.2);
  plant(7.3, 1.5, 1.2, 3, 0, mConcrete);
  plant(15.5, 1.5, 1.0, 1, 0, mCeramic);
  poster(3, 19.84, 1.7, -0.3, -Math.PI / 2, 0.7);
  clock(19.84, 2.6, 0.9, -Math.PI / 2);
  for (const x of [-16, -12, -4, 1, 6, 11, 16]) troffer(x, -0.3, Math.PI / 2);
  // radiators under the north windows
  for (const wx of [-17.2, -10.8, -4.2, 1.8, 7.8, 13.8, 18.2]) {
    const n = 20;
    for (let i = 0; i < n; i++) B.add(mRadiator, place(new THREE.BoxGeometry(0.05, 0.56, 0.1), wx - 0.7 + (i * 1.4) / (n - 1), 0.4, -13.75));
    B.add(mRadiator, place(new THREE.CylinderGeometry(0.02, 0.02, 1.48, 8).rotateZ(Math.PI / 2), wx, 0.66, -13.75));
    B.add(mRadiator, place(new THREE.CylinderGeometry(0.02, 0.02, 1.48, 8).rotateZ(Math.PI / 2), wx, 0.16, -13.75));
    for (const s of [-1, 1]) B.add(mRadiator, place(new THREE.CylinderGeometry(0.018, 0.018, 0.12, 8), wx + s * 0.75, 0.06, -13.75));
    k.collider(wx - 0.75, wx + 0.75, -13.85, -13.68, 0, 0.7, true);
  }

  // ---------- flush ----------
  B.flush(k);
  for (const l of ILISTS) l.flush(k);

  const hiders: THREE.Vector3[] = [];
  for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) hiders.push(new THREE.Vector3(-3.6 + i * 1.3, 0, -1.55 + j * 1.05));
  const hunters: THREE.Vector3[] = [];
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) hunters.push(new THREE.Vector3(13.5 + i * 1.0, 0, 11.4 + j * 0.8));

  return k.finish({
    id: "meeting", name: "Meeting Room",
    bounds: { minX: X1 + 0.16, maxX: X2 - 0.16, minZ: Z1 + 0.16, maxZ: Z2 - 0.16 },
    hunterSpawns: hunters, hiderSpawns: hiders,
    preview: { pos: [-5.2, 2.2, 12.6], look: [2, 0.9, 5], fov: 60 },
    lighting: {
      sky: "#cfd8e0",
      hemi: ["#f4efe6", "#8a7660", 0.85],
      sun: { color: "#ffdcae", int: 2.8, pos: [-14, 15, -30] },
      points: lights,
      exposure: 1.15,
      env: 0.75,
      hdri: "lobby",
    },
  });
}
