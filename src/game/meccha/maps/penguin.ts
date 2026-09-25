// Penguin Hotel — a dark-blue hotel: grand two-storey atrium (giant blue plush penguin on a round "BIG PEN" pedestal,
// crystal chandeliers, balloon arches, bunting, pennants, a wooden gallery balcony on three sides with two staircases),
// an entrance lobby with reception, a U of diamond-lattice hallways with glossy blue/white checker floors, luggage
// carts and gold penguin busts, and six rooms (bedrooms with herringbone parquet and blue stripe wallpaper, the plush
// room with the teal armchair, a lounge and a storage room). Plush penguins with X eyes everywhere.
// Hunters appear in the entrance lobby (south) when the search starts.
import * as THREE from "three";
import * as T from "../textures";
import * as P from "./tex/penguin";
import { Kit, grid, type Mat, type World } from "./kit";

type G = THREE.BufferGeometry;
type V3t = [number, number, number];
const V3 = THREE.Vector3;

/** bevelled box with a flat 45° chamfer (44 tris instead of RoundedBox's 300) */
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
function boxGeo(w: number, h: number, d: number) {
  const min = Math.min(w, h, d), max = Math.max(w, h, d);
  if (min < 0.04 || max > 4.5) return new THREE.BoxGeometry(w, h, d);
  return chamferGeo(w, h, d, Math.min(0.03, min * 0.18));
}
function place(geo: G, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, s?: V3t) {
  const m = new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new V3(...(s ?? [1, 1, 1])));
  return geo.applyMatrix4(m);
}
/** stick between two points (box or open cylinder) */
function beam(a: V3t, b: V3t, w: number, d: number, round = false, seg = 8) {
  const va = new V3(...a), vb = new V3(...b);
  const len = va.distanceTo(vb);
  const geo = round ? new THREE.CylinderGeometry(w / 2, w / 2, len, seg, 1, true) : boxGeo(w, len, d);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), vb.clone().sub(va).normalize()));
  const c = va.add(vb).multiplyScalar(0.5);
  geo.translate(c.x, c.y, c.z);
  return geo;
}
function lathe(pts: [number, number][], seg = 20) {
  return new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg);
}
function tubeGeo(pts: V3t[], r: number, seg = 24, radial = 6, closed = false) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new V3(...p)), closed, "centripetal"), seg, r, radial, closed);
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
/** merges every geometry of one material into one mesh */
class Batch {
  private map = new Map<Mat, G[]>();
  add(m: Mat, geo: G, unit?: number) {
    if (unit) worldUV(geo, unit);
    let l = this.map.get(m);
    if (!l) { l = []; this.map.set(m, l); }
    l.push(geo);
  }
  flush(k: Kit) {
    for (const [m, geos] of this.map) if (geos.length) k.merged(geos, m);
    this.map.clear();
  }
}
/** local frame for rotated furniture: local +z = "front" */
class Frame {
  constructor(public x: number, public z: number, public ry: number) {}
  pt(lx: number, lz: number): [number, number] {
    const c = Math.cos(this.ry), s = Math.sin(this.ry);
    return [this.x + lx * c + lz * s, this.z - lx * s + lz * c];
  }
  put(geo: G, lx: number, ly: number, lz: number, rx = 0, ry = 0, rz = 0) {
    place(geo, lx, ly, lz, rx, ry, rz);
    geo.applyMatrix4(new THREE.Matrix4().makeRotationY(this.ry));
    geo.translate(this.x, 0, this.z);
    return geo;
  }
  col(k: Kit, lx1: number, lx2: number, lz1: number, lz2: number, bottom: number, top: number, standable = true) {
    const xs: number[] = [], zs: number[] = [];
    for (const [a, b] of [[lx1, lz1], [lx2, lz1], [lx1, lz2], [lx2, lz2]]) {
      const [x, z] = this.pt(a, b);
      xs.push(x); zs.push(z);
    }
    k.collider(Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs), bottom, top, standable);
  }
}
type Inst = { pos: V3t; rotX?: number; rotY?: number; rotZ?: number; scale?: V3t; color?: string };
const qTmp = new THREE.Quaternion(), qTmp2 = new THREE.Quaternion(), eTmp = new THREE.Euler();
/** yaw (world Y) applied after a local tilt (rx, rz) → XYZ Euler for Kit.instances */
function yawTilt(ry: number, rx = 0, rz = 0): [number, number, number] {
  qTmp.setFromEuler(new THREE.Euler(rx, 0, rz));
  qTmp2.setFromAxisAngle(new V3(0, 1, 0), ry).multiply(qTmp);
  eTmp.setFromQuaternion(qTmp2, "XYZ");
  return [eTmp.x, eTmp.y, eTmp.z];
}
/** instanced ellipsoids in LOD tiers by size (balloons, eggs, bulbs) */
class Spheres {
  static tiers: [number, number, number][] = [[0.35, 14, 10], [0.12, 10, 7], [0.03, 7, 5], [0, 5, 3]];
  lists: Inst[][] = Spheres.tiers.map(() => []);
  add(x: number, y: number, z: number, sx: number, sy: number, sz: number, col: string, rx = 0, ry = 0, rz = 0) {
    const r = Math.max(sx, sy, sz);
    const t = Spheres.tiers.findIndex(([mr]) => r >= mr);
    this.lists[t].push({ pos: [x, y, z], rotX: rx, rotY: ry, rotZ: rz, scale: [sx, sy, sz], color: col });
  }
  flush(k: Kit, m: Mat) {
    this.lists.forEach((l, i) => {
      if (l.length) k.instances(new THREE.SphereGeometry(1, Spheres.tiers[i][1], Spheres.tiers[i][2]), m, l, { noShadow: i >= 2 });
    });
  }
}
/** a multi-part template drawn with one InstancedMesh per part (plush penguins) */
class Tpl {
  list: { pos: V3t; rot: [number, number, number]; s: number; cols: string[] }[] = [];
  constructor(public parts: { geo: G; mat: Mat; col: number; shadow?: boolean }[]) {}
  add(x: number, y: number, z: number, ry: number, s: number, cols: string[], rx = 0, rz = 0) {
    this.list.push({ pos: [x, y, z], rot: yawTilt(ry, rx, rz), s, cols });
  }
  flush(k: Kit) {
    if (!this.list.length) return;
    for (const p of this.parts)
      k.instances(p.geo, p.mat, this.list.map((it) => ({ pos: it.pos, rotX: it.rot[0], rotY: it.rot[1], rotZ: it.rot[2], scale: [it.s, it.s, it.s] as V3t, color: it.cols[p.col] })), { noShadow: p.shadow === false });
  }
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

/** plush penguin parts, ~1 m tall at scale 1 (front = +z). armsUp: flippers raised (the giant statue) */
function plushGeos(seg: number, armsUp = false) {
  const sph = (ws: number, hs: number, x: number, y: number, z: number, sx: number, sy: number, sz: number, rx = 0, ry = 0, rz = 0) =>
    place(new THREE.SphereGeometry(1, ws, hs), x, y, z, rx, ry, rz, [sx, sy, sz]);
  const body = lathe([[0, 0], [0.2, 0.005], [0.31, 0.06], [0.37, 0.19], [0.37, 0.34], [0.32, 0.5], [0.22, 0.6], [0.08, 0.66], [0, 0.67]], seg);
  const head = sph(seg, Math.round(seg * 0.7), 0, 0.84, 0.01, 0.27, 0.25, 0.26);
  const fl = [-1, 1].map((s) => armsUp
    ? sph(Math.max(6, seg >> 1), 6, s * 0.44, 0.78, 0.02, 0.075, 0.3, 0.16, 0, 0, s * 2.2)
    : sph(Math.max(6, seg >> 1), 5, s * 0.36, 0.4, 0, 0.07, 0.25, 0.15, 0, 0, s * 0.35));
  const belly = sph(seg, Math.round(seg * 0.6), 0, 0.34, 0.12, 0.29, 0.3, 0.27);
  const face = sph(seg, Math.round(seg * 0.6), 0, 0.82, 0.14, 0.19, 0.15, 0.13);
  const beak = sph(Math.max(8, seg >> 1), 5, 0, 0.77, 0.27, 0.14, 0.055, 0.12);
  const feet = [-1, 1].map((s) => sph(Math.max(7, seg >> 1), 5, s * 0.14, 0.035, 0.2, 0.12, 0.045, 0.17, 0, s * 0.3, 0));
  const eyes = [-1, 1].map((s) => place(new THREE.CylinderGeometry(0.07, 0.07, 0.03, Math.max(10, seg)), s * 0.1, 0.9, 0.235, Math.PI / 2 - 0.25, 0, 0).rotateY(0));
  // rotate the eye discs to follow the head curvature
  eyes.forEach((g, i) => { const s = i ? 1 : -1; g.translate(-s * 0.1, -0.9, -0.235); g.rotateY(s * 0.42); g.translate(s * 0.1, 0.9, 0.235); });
  const xs: G[] = [];
  for (const s of [-1, 1]) for (const a of [-1, 1]) {
    const g = new THREE.BoxGeometry(0.1, 0.018, 0.012);
    g.rotateZ(a * Math.PI / 4);
    g.rotateX(-0.25);
    g.rotateY(s * 0.42);
    g.translate(s * 0.105, 0.905, 0.258);
    xs.push(g);
  }
  return { body, head, fl, belly, face, beak, feet, eyes, xs };
}

export function buildPenguin(): World {
  const WING_H = 3.6, ATR_H = 10, LOBBY_H = 4.2, DOOR_H = 2.4, BAL_Y = 4.5;
  const k = new Kit(WING_H, DOOR_H);
  const kmat = k.mat.bind(k);
  k.mat = (ptex, color, repeat, extra = {}) => {
    if (ptex && (extra.bump ?? (extra.transparent ? 0 : 0.55)) > 0) P.fastNormal(ptex);
    return kmat(ptex, color, repeat, extra);
  };
  const b = new Batch();
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pick = <X,>(a: X[]) => a[Math.floor(rnd() * a.length)];

  // ---------- materials ----------
  const tKnit = k.tex("ph-knit", () => P.knit());
  const tTwill = k.tex("ph-twill", () => P.twill());
  const tWoodD = k.tex("ph-woodd", () => P.grain("#43291a", 5));
  const mStripe = k.mat(k.tex("ph-stripe", () => P.stripeWall()), "#fff", [1, 1], { roughness: 0.8, bump: 0.25 });
  const mLattice = k.mat(k.tex("ph-lattice", () => P.latticeWall()), "#fff", [1, 1], { roughness: 0.75, bump: 0.35 });
  const mChkHall = k.mat(k.tex("ph-chk", () => P.checker("#e9eef5", "#2c5594")), "#fff", [1, 1], { roughness: 0.14, bump: 0.15 });
  const mChkAtr = k.mat(k.tex("ph-chka", () => P.checker("#8c95a5", "#232b42", "rgba(20,24,36,0.6)", 5)), "#fff", [1, 1], { roughness: 0.1, bump: 0.15 });
  const mHerr = k.mat(k.tex("ph-herr", () => P.herringbone()), "#fff", [1, 1], { roughness: 0.42, bump: 0.5 });
  const mPlank = k.mat(k.tex("ph-plank", () => P.planks()), "#fff", [1, 1], { roughness: 0.5, bump: 0.55 });
  const mWood = k.mat(k.tex("ph-wood", () => P.grain("#6b4529", 3)), "#fff", [1, 1], { roughness: 0.45, bump: 0.45 });
  const mWoodDark = k.mat(tWoodD, "#fff", [1, 1], { roughness: 0.4, bump: 0.45 });
  const mKnit = k.mat(tKnit, "#fff", [1, 1], { roughness: 1, bump: 0.6 });
  const mKnitStatue = k.mat(tKnit, "#3b55d8", [6, 6], { roughness: 1, bump: 1.0 });
  const mKnitStatueW = k.mat(tKnit, "#e9eefb", [6, 6], { roughness: 1, bump: 1.0 });
  const mKnitStatueO = k.mat(tKnit, "#f09a2a", [3, 3], { roughness: 0.9, bump: 0.6 });
  const mShirt = k.mat(k.tex("ph-shirt", P.shirt), "#fff", [2, 1], { roughness: 1, bump: 0.5 });
  const mTeal = k.mat(tTwill, "#1b97c2", [1, 1], { roughness: 1, bump: 0.8 });
  const mSofa = k.mat(tTwill, "#e4e6ea", [1, 1], { roughness: 1, bump: 0.7 });
  const mCloth = k.mat(tTwill, "#f4f5f7", [1, 1], { roughness: 0.95, bump: 0.15 });
  const mMattress = k.mat(tTwill, "#8f939c", [1, 1], { roughness: 1, bump: 0.5 });
  const mPillow = k.mat(tTwill, "#f2f2f4", [1, 1], { roughness: 1, bump: 0.3 });
  const mDice = k.mat(k.tex("ph-dice", () => P.dice()), "#fff", [1, 1], { roughness: 0.6, bump: 0.3 });
  const mRug = k.mat(k.tex("ph-rug", P.penguinRug), "#fff", [1, 1], { roughness: 1, bump: 0.7 });
  const mBlanket = k.mat(k.tex("ph-blanket", P.blanket), "#fff", [1, 1], { roughness: 0.95, bump: 0.4 });
  const mBanner = k.mat(k.tex("ph-banner", () => P.banner("PEN")), "#fff", [1, 1], { roughness: 0.8, bump: 0.2 });
  mBanner.m.side = THREE.DoubleSide;
  const mPlaque = k.mat(k.tex("ph-plaque", () => P.plaque("BIG PEN")), "#fff", [2, 1], { roughness: 0.4, bump: 0.2 });
  const mRock = k.mat(k.tex("ph-rock", P.rock), "#fff", [1, 1], { roughness: 0.9, bump: 1.0 });
  const mCard = k.mat(k.tex("ph-card", P.cardboard), "#fff", [1, 1], { roughness: 0.9, bump: 0.3 });
  const mBeach = k.mat(k.tex("ph-beach", () => T.stripes(["#f4f4f4", "#2464d8", "#f4f4f4", "#7cc0ff", "#f4f4f4", "#2464d8"], true)), "#fff", [1, 1], { roughness: 0.3, bump: 0 });
  const mCeilW = k.mat(null, "#dfe4ec", [1, 1], { roughness: 0.9 });
  const mCeilWood = k.mat(tWoodD, "#fff", [1, 1], { roughness: 0.5, bump: 0.45 });
  const mGold = k.mat(null, "#d8ad4c", [1, 1], { metalness: 0.95, roughness: 0.28 });
  const mBlackMetal = k.mat(null, "#1c1d21", [1, 1], { metalness: 0.7, roughness: 0.35 });
  const mSteel = k.mat(null, "#b9bec6", [1, 1], { metalness: 0.9, roughness: 0.3 });
  const mRed = k.mat(null, "#c3151f", [1, 1], { roughness: 0.3 });
  const mRope = k.mat(null, "#b3121c", [1, 1], { roughness: 0.7 });
  const mVase = k.mat(null, "#1a2a9a", [1, 1], { roughness: 0.1, metalness: 0.15 });
  const mPorcelain = k.mat(null, "#f1f1ee", [1, 1], { roughness: 0.2 });
  const mSuitcase = k.mat(null, "#2d3656", [1, 1], { roughness: 0.55 });
  const mSuitTrim = k.mat(null, "#c79a63", [1, 1], { roughness: 0.5 });
  const mDoor = k.mat(tWoodD, "#3a4666", [1, 1], { roughness: 0.45, bump: 0.2 });
  const mCrystal = k.mat(k.tex("ph-crystal", P.crystal), "#ffffff", [5, 3], { roughness: 0.08, metalness: 0.4, emissive: "#9fcfff", emissiveIntensity: 0.6, bump: 0.6 });
  const mBulb = k.mat(null, "#fff6e0", [1, 1], { emissive: "#ffe9b8", emissiveIntensity: 2.4 });
  const mShade = k.mat(null, "#f4f7fb", [1, 1], { roughness: 0.6, emissive: "#dff0ff", emissiveIntensity: 0.9 });
  const mGlossy = k.mat(null, "#ffffff", [1, 1], { roughness: 0.16 });
  const mFoil = k.mat(null, "#ffffff", [1, 1], { metalness: 0.9, roughness: 0.18 });
  const mCandle = k.mat(null, "#ffffff", [1, 1], { roughness: 0.5 });
  const mEye = k.mat(null, "#f3f3f0", [1, 1], { roughness: 0.35 });
  const mInk = k.mat(null, "#15161a", [1, 1], { roughness: 0.6 });
  const mFlag = k.mat(null, "#ffffff", [1, 1], { roughness: 0.8 });
  mFlag.m.side = THREE.DoubleSide;
  const mString = k.mat(null, "#e8e8e8", [1, 1], { roughness: 0.8 });

  const glossy = new Spheres(); // balloons, eggs
  const foil = new Spheres();
  const beach = new Spheres();
  const bulbs = new Spheres();
  const candles: Inst[] = [];
  const dice: Inst[] = [];
  const boxes: Inst[] = [];
  const balusters: Inst[] = [];
  const flags: Inst[] = [];

  // ---------- plush penguins ----------
  const pg = plushGeos(12);
  const plushStd = new Tpl([
    { geo: mergeG([pg.body, pg.head, ...pg.fl]), mat: mKnit, col: 0 },
    { geo: mergeG([pg.belly, pg.face]), mat: mKnit, col: 1 },
    { geo: mergeG([pg.beak, ...pg.feet]), mat: mKnit, col: 2 },
    { geo: mergeG(pg.eyes), mat: mEye, col: 3, shadow: false },
    { geo: mergeG(pg.xs), mat: mInk, col: 4, shadow: false },
  ]);
  const pg2 = plushGeos(12);
  const plushStriped = new Tpl([
    { geo: pg2.body, mat: mShirt, col: 1 },
    { geo: mergeG([pg2.head, ...pg2.fl]), mat: mKnit, col: 0 },
    { geo: pg2.face, mat: mKnit, col: 3 },
    { geo: mergeG([pg2.beak, ...pg2.feet]), mat: mKnit, col: 2 },
    { geo: mergeG(pg2.eyes), mat: mEye, col: 1, shadow: false },
    { geo: mergeG(pg2.xs), mat: mInk, col: 4, shadow: false },
  ]);
  const PLUSH = { blue: "#2f49d0", violet: "#4b3fd6", green: "#27b53a", red: "#d42128", black: "#24252b", navy: "#233078", sky: "#5f9be6" };
  const plushCols = [PLUSH.blue, PLUSH.blue, PLUSH.violet, PLUSH.green, PLUSH.red, PLUSH.black, PLUSH.navy, PLUSH.sky];
  /** plush penguin; s ≈ height in metres. rx < 0: lying on its back; rz: leaning sideways */
  const plushie = (x: number, y: number, z: number, s: number, ry = rnd() * 6.28, col = pick(plushCols), solid = s >= 0.5, rx = 0, rz = 0) => {
    const yy = y + (rx ? 0.3 * s * Math.abs(Math.sin(rx)) : 0) + (rz ? 0.1 * s : 0);
    plushStd.add(x, yy, z, ry, s, [col, "#f4f2ec", "#f2a124", "#f4f4f0", "#1b1b1f"], rx, rz);
    if (solid) k.collider(x - 0.32 * s, x + 0.32 * s, z - 0.32 * s, z + 0.32 * s, y, y + s * (rx ? 0.55 : 0.95), true);
  };
  const stripey = (x: number, y: number, z: number, s: number, ry = rnd() * 6.28, solid = s >= 0.5) => {
    plushStriped.add(x, y, z, ry, s, [pick(["#26282e", "#2a2c34", "#3a3024"]), "#ffffff", "#f2a124", "#2bc0b4", "#1b1b1f"]);
    if (solid) k.collider(x - 0.32 * s, x + 0.32 * s, z - 0.32 * s, z + 0.32 * s, y, y + s * 0.95, true);
  };

  // ---------- balloons ----------
  const BAL = ["#1d5fe0", "#2f8ff0", "#f5a623", "#1d5fe0", "#f7f7f7", "#43b4f5", "#1936b8"];
  const SILVER = "#dcdfe4";
  const balloon = (x: number, y: number, z: number, r: number, col: string, isFoil = false) =>
    (isFoil ? foil : glossy).add(x, y, z, r, r * 1.12, r, col);
  /** balloon arch standing on the floor: from a to b (x,z), apex height h */
  const balloonArch = (ax: number, az: number, bx: number, bz: number, h: number) => {
    const cx = (ax + bx) / 2, cz = (az + bz) / 2, half = Math.hypot(bx - ax, bz - az) / 2;
    const ux = (bx - ax) / (2 * half), uz = (bz - az) / (2 * half);
    const n = 24;
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * Math.PI;
      const px = cx - ux * Math.cos(t) * half, pz = cz - uz * Math.cos(t) * half, py = 0.3 + Math.sin(t) * (h - 0.6);
      for (let j = 0; j < 4; j++) {
        const a = j * (Math.PI / 2) + i * 0.7;
        const off = 0.2;
        const col = (i * 4 + j) % 9 === 0 ? SILVER : pick(["#1d5fe0", "#2f8ff0", "#f5a623", "#1d5fe0", "#43b4f5", "#1936b8"]);
        balloon(px - uz * Math.cos(a) * off, py + Math.sin(a) * off * 0.8, pz + ux * Math.cos(a) * off, 0.2 + rnd() * 0.06, col, col === SILVER);
      }
    }
    for (const [x, z] of [[ax, az], [bx, bz]]) k.collider(x - 0.35, x + 0.35, z - 0.35, z + 0.35, 0, 1.2, true);
  };
  /** column of big stacked balloons (around a pillar) */
  const balloonStack = (x: number, z: number, h: number, r = 0.42) => {
    for (let y = r; y < h; y += r * 1.5) {
      for (let j = 0; j < 3; j++) {
        const a = j * 2.1 + y;
        const col = pick(["#1d5fe0", "#2f8ff0", "#1d5fe0", SILVER, "#f5a623"]);
        balloon(x + Math.cos(a) * r * 0.75, y, z + Math.sin(a) * r * 0.75, r * (0.85 + rnd() * 0.25), col, col === SILVER);
      }
    }
    k.collider(x - r * 1.4, x + r * 1.4, z - r * 1.4, z + r * 1.4, 0, h, true);
  };
  /** egg-shaped balloon lying on the floor */
  const egg = (x: number, z: number, s = 1) => {
    const col = pick(["#1ec8d8", "#e53ab8", "#e8f02a", "#35d0e8", "#f048c0"]);
    glossy.add(x, 0.26 * s, z, 0.22 * s, 0.27 * s, 0.22 * s, col, (rnd() - 0.5) * 0.6, 0, (rnd() - 0.5) * 0.6);
  };
  const beachBall = (x: number, y: number, z: number, r = 0.3) => beach.add(x, y + r, z, r, r, r, "#ffffff", rnd() * 3, rnd() * 3, rnd() * 3);
  const bunch = (x: number, y: number, z: number, n = 5, h = 1.6) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd();
      const rr = 0.12 + rnd() * 0.2;
      const bx = x + Math.cos(a) * rr, by = y + h + rnd() * 0.4, bz = z + Math.sin(a) * rr;
      const col = pick(BAL);
      balloon(bx, by, bz, 0.2, col, col === "#f7f7f7");
      b.add(mString, beam([bx, by - 0.22, bz], [x, y + 0.05, z], 0.006, 0.006, true, 3));
    }
    glossy.add(x, y + 0.04, z, 0.06, 0.04, 0.06, "#c9ced4");
  };

  // ---------- walls ----------
  type Op = [number, number, number?, number?];
  const pieces = (a1: number, a2: number, h: number, ops: Op[]) => {
    const out: [number, number, number, number][] = [];
    let cur = a1;
    for (const [oc, ow, oy0 = 0, oy1 = DOOR_H] of [...ops].sort((p, q) => p[0] - q[0])) {
      const s = Math.max(a1, oc - ow / 2), e = Math.min(a2, oc + ow / 2);
      if (e <= a1 || s >= a2) continue;
      if (s > cur + 0.01) out.push([cur, s, 0, h]);
      if (oy0 > 0.01) out.push([s, e, 0, oy0]);
      if (h - oy1 > 0.01) out.push([s, e, oy1, h]);
      cur = e;
    }
    if (a2 > cur + 0.01) out.push([cur, a2, 0, h]);
    return out;
  };
  /** wall along an axis ("x": runs along x at z=c). mA covers it; mB (optional) skins the +side (side=+1) or -side */
  const wall = (axis: "x" | "z", c: number, a1: number, a2: number, h: number, ops: Op[], mA: Mat, uA: number, mB?: Mat, uB = uA, side = 1, t = 0.3) => {
    for (const [p1, p2, y0, y1] of pieces(a1, a2, h, ops)) {
      const len = p2 - p1, mid = (p1 + p2) / 2, hh = y1 - y0;
      b.add(mA, axis === "x" ? place(new THREE.BoxGeometry(len, hh, t), mid, y0 + hh / 2, c) : place(new THREE.BoxGeometry(t, hh, len), c, y0 + hh / 2, mid), uA);
      if (mB) {
        const pl = new THREE.PlaneGeometry(len, hh);
        const o = c + side * (t / 2 + 0.004);
        if (axis === "x") b.add(mB, place(pl, mid, y0 + hh / 2, o, 0, side > 0 ? 0 : Math.PI, 0), uB);
        else b.add(mB, place(pl, o, y0 + hh / 2, mid, 0, side > 0 ? Math.PI / 2 : -Math.PI / 2, 0), uB);
      }
      if (axis === "x") k.collider(p1, p2, c - t / 2, c + t / 2, y0, y1, false);
      else k.collider(c - t / 2, c + t / 2, p1, p2, y0, y1, false);
    }
  };
  /** strip (baseboard, cornice) along one side of a wall, skipping openings */
  const band = (axis: "x" | "z", c: number, a1: number, a2: number, y0: number, y1: number, ops: Op[], mat: Mat, depth: number, side: number, unit?: number) => {
    let cur = a1;
    const segs: [number, number][] = [];
    for (const [oc, ow, oy0 = 0, oy1 = DOOR_H] of [...ops].sort((p, q) => p[0] - q[0])) {
      if (oy1 <= y0 || oy0 >= y1) continue;
      const s = oc - ow / 2, e = oc + ow / 2;
      if (e <= a1 || s >= a2) continue;
      if (s > cur) segs.push([cur, s]);
      cur = Math.max(cur, e);
    }
    if (a2 > cur) segs.push([cur, a2]);
    for (const [p1, p2] of segs) {
      const len = p2 - p1, mid = (p1 + p2) / 2, hh = y1 - y0;
      const off = c + side * (0.15 + depth / 2);
      b.add(mat, axis === "x" ? place(new THREE.BoxGeometry(len, hh, depth), mid, y0 + hh / 2, off) : place(new THREE.BoxGeometry(depth, hh, len), off, y0 + hh / 2, mid), unit);
    }
  };
  /** wooden door casing on both faces of a wall */
  const casing = (axis: "x" | "z", c: number, oc: number, ow: number, mat: Mat, top = DOOR_H) => {
    const d = 0.4;
    for (const s of [-1, 1]) {
      const a = oc + s * (ow / 2 + 0.05);
      b.add(mat, axis === "x" ? place(new THREE.BoxGeometry(0.12, top, d), a, top / 2, c) : place(new THREE.BoxGeometry(d, top, 0.12), c, top / 2, a), 1);
    }
    b.add(mat, axis === "x" ? place(new THREE.BoxGeometry(ow + 0.24, 0.14, d), oc, top + 0.07, c) : place(new THREE.BoxGeometry(d, 0.14, ow + 0.24), c, top + 0.07, oc), 1);
  };
  /** arched opening: wall-coloured spandrels + wooden arch ring & jambs (opening top = top) */
  const archOpening = (axis: "x" | "z", c: number, oc: number, ow: number, top: number, wallMat: Mat) => {
    const r = ow / 2, t = 0.32;
    const sp = new THREE.Shape();
    sp.moveTo(-r, 0); sp.lineTo(-r, r); sp.lineTo(r, r); sp.lineTo(r, 0);
    sp.absarc(0, 0, r, 0, Math.PI, false);
    const spg = new THREE.ExtrudeGeometry(sp, { depth: t, bevelEnabled: false, curveSegments: 10 });
    spg.translate(0, 0, -t / 2);
    const ring = new THREE.Shape();
    ring.absarc(0, 0, r + 0.14, 0, Math.PI, false);
    ring.lineTo(-r, 0);
    ring.absarc(0, 0, r, Math.PI, 0, true);
    ring.lineTo(r + 0.14, 0);
    const rg = new THREE.ExtrudeGeometry(ring, { depth: t + 0.1, bevelEnabled: false, curveSegments: 12 });
    rg.translate(0, 0, -(t + 0.1) / 2);
    const y = top - r;
    const ry = axis === "x" ? 0 : Math.PI / 2;
    const [x, z] = axis === "x" ? [oc, c] : [c, oc];
    b.add(wallMat, place(spg, x, y, z, 0, ry, 0), 0.7);
    b.add(mWoodDark, place(rg, x, y, z, 0, ry, 0), 1);
    for (const s of [-1, 1]) {
      const a = oc + s * (r + 0.07);
      b.add(mWoodDark, axis === "x" ? place(boxGeo(0.14, y, t + 0.1), a, y / 2, c) : place(boxGeo(t + 0.1, y, 0.14), c, y / 2, a), 1);
    }
  };
  /** closed decorative panel door on a wall face (dark navy with gold mouldings) */
  const closedDoor = (axis: "x" | "z", c: number, oc: number, side: number, w = 1.1, h = 2.3) => {
    const f = new Frame(axis === "x" ? oc : c + side * 0.15, axis === "x" ? c + side * 0.15 : oc, axis === "x" ? (side > 0 ? 0 : Math.PI) : side > 0 ? Math.PI / 2 : -Math.PI / 2);
    b.add(mDoor, f.put(boxGeo(w, h, 0.06), 0, h / 2, 0.03), 1);
    b.add(mWoodDark, f.put(new THREE.BoxGeometry(w + 0.24, 0.12, 0.08), 0, h + 0.06, 0.04), 1);
    for (const s of [-1, 1]) b.add(mWoodDark, f.put(new THREE.BoxGeometry(0.12, h + 0.12, 0.08), s * (w / 2 + 0.06), (h + 0.12) / 2, 0.04), 1);
    const pw = w - 0.3;
    for (const [py, ph] of [[0.25, 0.55], [0.95, 0.55], [1.65, 0.45]]) {
      const cy = py + ph / 2;
      b.add(mGold, f.put(new THREE.BoxGeometry(pw, 0.03, 0.02), 0, cy - ph / 2, 0.065));
      b.add(mGold, f.put(new THREE.BoxGeometry(pw, 0.03, 0.02), 0, cy + ph / 2, 0.065));
      for (const s of [-1, 1]) b.add(mGold, f.put(new THREE.BoxGeometry(0.03, ph, 0.02), s * pw / 2, cy, 0.065));
    }
    b.add(mGold, f.put(new THREE.SphereGeometry(0.035, 8, 6), w / 2 - 0.12, 1.05, 0.1));
  };
  /** wall sconce: wooden arm + glowing white shade (local +z = out of the wall) */
  const sconce = (x: number, z: number, ry: number, y = 1.9) => {
    const f = new Frame(x, z, ry);
    b.add(mWoodDark, f.put(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 8), 0, y - 0.1, 0.015, Math.PI / 2, 0, 0));
    b.add(mWoodDark, f.put(new THREE.CylinderGeometry(0.018, 0.018, 0.24, 6), 0, y - 0.05, 0.13, 0.9, 0, 0));
    b.add(mShade, f.put(lathe([[0.1, 0], [0.13, 0.04], [0.14, 0.2], [0.1, 0.22]], 10), 0, y, 0.2));
  };
  /** gold picture frame (empty) or oval frame on a wall face */
  const goldFrame = (x: number, y: number, z: number, ry: number, w: number, h: number, oval = false) => {
    const f = new Frame(x, z, ry);
    if (oval) {
      const g = new THREE.TorusGeometry(0.5, 0.05, 5, 22);
      g.scale(w, h, 1);
      b.add(mGold, f.put(g, 0, y, 0.05));
    } else {
      for (const s of [-1, 1]) {
        b.add(mGold, f.put(boxGeo(w, 0.08, 0.05), 0, y + s * (h / 2), 0.04));
        b.add(mGold, f.put(boxGeo(0.08, h, 0.05), s * (w / 2), y, 0.04));
      }
    }
  };

  // ---------- layout ----------
  // outer walls x=±20, z=±13.4. Rooms x ±(12.6..20). Hallways x ±(9.8..12.6) and north z -13.4..-10.6.
  // Atrium x -9.8..9.8, z -10.6..6 (10 m high, balcony at 4.5 on W/N/E). Lobby x -9.8..9.8, z 6..13.4.
  const XO = 20, XH = 12.6, XA = 9.8, ZN = -13.4, ZS = 13.4, ZA = -10.6, ZL = 6;
  const roomZ: [number, number, number][] = [[ZN, -4.4, -9], [-4.4, 4.4, 0], [4.4, ZS, 9]]; // z1, z2, door centre
  const roomDoorOps: Op[] = roomZ.map(([, , d]) => [d, 1.8] as Op);
  const atrSideOps: Op[] = [[-8, 2.2, 0, 3.2], [-2.5, 2.2, 0, 3.2]];
  const lobbySideOps: Op[] = [[9.5, 2.0, 0, 2.6]];
  const atrNorthOps: Op[] = [[-4, 2.2, 0, 3.2], [4, 2.2, 0, 3.2]];
  const lobbyOpen: Op = [0, 7, 0, 3.8];

  for (const [z, h] of [[ZN, WING_H], [ZS, LOBBY_H]]) {
    wall("x", z, -XO - 0.15, -XH, WING_H, [], mStripe, 0.6);
    wall("x", z, -XH, XH, h, [], mLattice, 0.7);
    wall("x", z, XH, XO + 0.15, WING_H, [], mStripe, 0.6);
  }
  for (const sx of [-1, 1]) {
    wall("z", sx * XO, ZN, ZS, WING_H, [], mStripe, 0.6);
    // hallway/room wall: lattice on the hallway side, stripe on the room side
    wall("z", sx * XH, ZN + 0.15, ZS - 0.15, WING_H, roomDoorOps, mLattice, 0.7, mStripe, 0.6, sx);
    for (const z of [-4.4, 4.4]) wall("x", z, Math.min(sx * XO, sx * XH) + 0.15, Math.max(sx * XO, sx * XH) - 0.15, WING_H, [], mStripe, 0.6);
    wall("z", sx * XA, ZA, ZL, ATR_H, atrSideOps, mLattice, 0.7);
    wall("z", sx * XA, ZL, ZS - 0.15, LOBBY_H, lobbySideOps, mLattice, 0.7);
    for (const [zc, w, , top] of atrSideOps) archOpening("z", sx * XA, zc, w, top!, mLattice);
    for (const [zc, w] of lobbySideOps) casing("z", sx * XA, zc, w, mWoodDark, 2.6);
    for (const [zc, w] of roomDoorOps) casing("z", sx * XH, zc, w, mWoodDark);
  }
  wall("x", ZA, -XA + 0.15, XA - 0.15, ATR_H, atrNorthOps, mLattice, 0.7);
  for (const [xc, w, , top] of atrNorthOps) archOpening("x", ZA, xc, w, top!, mLattice);
  wall("x", ZL, -XA + 0.15, XA - 0.15, ATR_H, [lobbyOpen], mLattice, 0.7);
  {
    const [, w, , top] = lobbyOpen;
    for (const s of [-1, 1]) b.add(mWoodDark, place(boxGeo(0.45, top!, 0.5), s * (w / 2 + 0.2), top! / 2, ZL), 1);
    b.add(mWoodDark, place(new THREE.BoxGeometry(w + 0.9, 0.35, 0.5), 0, top! + 0.17, ZL), 1);
  }

  // ---------- floors & ceilings ----------
  const floor = (x1: number, x2: number, z1: number, z2: number, m: Mat, unit: number, y = 0) =>
    b.add(m, place(new THREE.BoxGeometry(x2 - x1, 0.1, z2 - z1), (x1 + x2) / 2, y - 0.05, (z1 + z2) / 2), unit);
  const ceil = (x1: number, x2: number, z1: number, z2: number, m: Mat, h: number, unit = 2) =>
    b.add(m, place(new THREE.BoxGeometry(x2 - x1, 0.2, z2 - z1), (x1 + x2) / 2, h + 0.1, (z1 + z2) / 2), unit);
  floor(-XA, XA, ZA, ZL, mChkAtr, 1.3);
  floor(-XA, XA, ZL, ZS, mChkHall, 0.8);
  floor(-XH, XH, ZN, ZA, mChkHall, 0.8);
  for (const sx of [-1, 1]) floor(Math.min(sx * XA, sx * XH), Math.max(sx * XA, sx * XH), ZA, ZS, mChkHall, 0.8);
  ceil(-XO, XO, ZN, ZA, mCeilW, WING_H);
  for (const sx of [-1, 1]) ceil(Math.min(sx * XA, sx * XO), Math.max(sx * XA, sx * XO), ZA, ZS, mCeilW, WING_H);
  ceil(-XA, XA, ZL, ZS, mCeilW, LOBBY_H);
  ceil(-XA, XA, ZA, ZL, mCeilWood, ATR_H, 2.5);
  for (let x = -7.5; x <= 7.6; x += 2.5) b.add(mCeilWood, place(new THREE.BoxGeometry(0.3, 0.4, ZL - ZA), x, ATR_H - 0.2, (ZA + ZL) / 2), 1.5);
  for (let z = ZA + 2.1; z < ZL; z += 2.1) b.add(mCeilWood, place(new THREE.BoxGeometry(2 * XA, 0.4, 0.3), 0, ATR_H - 0.2, z), 1.5);

  // hallway trims: dark baseboard + cornice
  const hallTrim = (axis: "x" | "z", c: number, a1: number, a2: number, ops: Op[], side: number, h = WING_H) => {
    band(axis, c, a1, a2, 0, 0.16, ops, mWoodDark, 0.03, side, 1);
    band(axis, c, a1, a2, h - 0.14, h, [], mWoodDark, 0.08, side, 1);
  };
  hallTrim("x", ZN, -XH, XH, [], 1);
  hallTrim("x", ZA, -XH, -XA, [], -1);
  hallTrim("x", ZA, XA, XH, [], -1);
  hallTrim("x", ZA, -XA, XA, atrNorthOps, -1);
  for (const sx of [-1, 1]) {
    hallTrim("z", sx * XH, ZA, ZS, roomDoorOps, -sx);
    hallTrim("z", sx * XA, ZA, ZS, [...atrSideOps, ...lobbySideOps], sx);
    band("z", sx * XA, ZA, ZS, 0, 0.18, [...atrSideOps, ...lobbySideOps], mWoodDark, 0.03, -sx, 1);
  }
  band("x", ZS, -XO, XO, 0, 0.18, [], mWoodDark, 0.03, -1, 1);
  band("x", ZL, -XA, XA, 0, 0.18, [lobbyOpen], mWoodDark, 0.03, 1, 1);
  band("x", ZL, -XA, XA, 0, 0.18, [lobbyOpen], mWoodDark, 0.03, -1, 1);
  band("x", ZA, -XA, XA, 0, 0.18, atrNorthOps, mWoodDark, 0.03, 1, 1);

  k.room("Entrance Lobby", -XA, XA, ZL, ZS);
  k.room("Grand Atrium", -XA, XA, ZA, ZL);
  k.room("North Hallway", -XH, XH, ZN, ZA);
  k.room("West Hallway", -XH, -XA, ZA, ZS);
  k.room("East Hallway", XA, XH, ZA, ZS);

  // ---------- furniture builders (y = floor level `y0`) ----------
  const dresser = (x: number, z: number, ry: number, w = 1.4, h = 0.95, d = 0.5, cols = 2, rows = 3) => {
    const f = new Frame(x, z, ry);
    b.add(mWood, f.put(boxGeo(w, h - 0.1, d), 0, 0.1 + (h - 0.1) / 2, 0), 0.8);
    b.add(mWoodDark, f.put(boxGeo(w - 0.04, 0.1, d - 0.04), 0, 0.05, 0), 0.8);
    b.add(mWood, f.put(boxGeo(w + 0.05, 0.04, d + 0.04), 0, h - 0.02, 0.01), 0.8);
    const dw = (w - 0.08) / cols, dh = (h - 0.22) / rows;
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      const cx = -w / 2 + 0.04 + dw * (c + 0.5), cy = 0.14 + dh * (r + 0.5);
      b.add(mWood, f.put(boxGeo(dw - 0.03, dh - 0.03, 0.03), cx, cy, d / 2 + 0.01), 0.6);
      b.add(mSteel, f.put(new THREE.BoxGeometry(0.12, 0.015, 0.02), cx, cy + dh * 0.15, d / 2 + 0.035));
    }
    f.col(k, -w / 2, w / 2, -d / 2, d / 2, 0, h, true);
  };
  const roundTable = (x: number, z: number, r = 0.42, h = 0.72, cloth = false, y0 = 0) => {
    if (cloth) {
      b.add(mCloth, place(lathe([[r + 0.1, 0.02], [r + 0.05, 0.3], [r + 0.02, h - 0.04], [r, h], [0, h + 0.01]], 14), x, y0, z), 0.6);
    } else {
      b.add(mWood, place(new THREE.CylinderGeometry(r, r, 0.04, 20), x, y0 + h - 0.02, z), 0.6);
      b.add(mWoodDark, place(lathe([[0.2, 0], [0.2, 0.03], [0.05, 0.08], [0.045, 0.35], [0.07, 0.45], [0.04, 0.6], [0.06, h - 0.04]], 10), x, y0, z), 0.5);
    }
    k.collider(x - r * 0.8, x + r * 0.8, z - r * 0.8, z + r * 0.8, y0, y0 + h, true);
  };
  const candleCluster = (x: number, y: number, z: number, n = 5) => {
    for (let i = 0; i < n; i++) {
      const a = rnd() * 6.28, rr = rnd() * 0.12;
      const h = 0.12 + rnd() * 0.16;
      candles.push({ pos: [x + Math.cos(a) * rr, y + h / 2, z + Math.sin(a) * rr], scale: [1, h, 1], rotY: rnd(), color: pick(["#e8454c", "#4d87d8", "#f2f2f2", "#f2cf3a", "#dfe7f2"]) });
    }
  };
  const vase = (x: number, y: number, z: number, s = 1, m: Mat = mVase) => {
    b.add(m, place(lathe([[0, 0], [0.14, 0], [0.16, 0.04], [0.24, 0.3], [0.26, 0.5], [0.2, 0.75], [0.12, 0.92], [0.1, 1.02], [0.14, 1.1], [0.13, 1.12]].map(([r, h]) => [r * s, h * s] as [number, number]), 18), x, y, z));
    k.collider(x - 0.2 * s, x + 0.2 * s, z - 0.2 * s, z + 0.2 * s, y, y + 1.1 * s, true);
  };
  const goldBust = (x: number, y: number, z: number, ry: number, s = 1) => {
    const f = new Frame(x, z, ry);
    b.add(mGold, f.put(lathe([[0, 0], [0.2, 0], [0.2, 0.05], [0.14, 0.09], [0.12, 0.16], [0.17, 0.26], [0.2, 0.32], [0, 0.34]].map(([r, h]) => [r * s, h * s] as [number, number]), 16), 0, y, 0));
    b.add(mGold, f.put(place(new THREE.SphereGeometry(0.22 * s, 16, 12), 0, 0, 0, 0, 0, 0, [1, 1.05, 1.1]), 0, y + 0.5 * s, 0));
    b.add(mGold, f.put(new THREE.ConeGeometry(0.075 * s, 0.42 * s, 10), 0, y + 0.47 * s, 0.34 * s, Math.PI / 2 + 0.15, 0, 0));
    k.collider(x - 0.22 * s, x + 0.22 * s, z - 0.22 * s, z + 0.22 * s, y, y + 0.72 * s, true);
  };
  const luggageCart = (x: number, z: number, ry: number, load = 2) => {
    const f = new Frame(x, z, ry);
    const L = 1.2, W = 0.65;
    b.add(mRed, f.put(boxGeo(W, 0.06, L), 0, 0.2, 0));
    b.add(mGold, f.put(boxGeo(W + 0.04, 0.05, L + 0.04), 0, 0.15, 0));
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      b.add(mBlackMetal, f.put(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 10), sx * (W / 2 - 0.08), 0.06, sz * (L / 2 - 0.1), 0, 0, Math.PI / 2));
    // two tall hoops (gold tubes)
    for (const sz of [-1, 1]) {
      const pts: V3t[] = [];
      const hw = W / 2 - 0.03;
      pts.push([-hw, 0.22, 0], [-hw, 1.2, 0]);
      for (let i = 1; i < 6; i++) { const t = (i / 6) * Math.PI; pts.push([-Math.cos(t) * hw, 1.2 + Math.sin(t) * 0.55, 0]); }
      pts.push([hw, 1.2, 0], [hw, 0.22, 0]);
      b.add(mGold, f.put(tubeGeo(pts, 0.022, 24, 5), 0, 0, sz * (L / 2 - 0.04)));
    }
    b.add(mGold, f.put(new THREE.CylinderGeometry(0.02, 0.02, L - 0.08, 6), 0, 1.75, 0, Math.PI / 2, 0, 0));
    for (const sx of [-1, 1]) b.add(mGold, f.put(new THREE.CylinderGeometry(0.015, 0.015, L - 0.08, 6), sx * (W / 2 - 0.03), 0.9, 0, Math.PI / 2, 0, 0));
    b.add(mGold, f.put(new THREE.SphereGeometry(0.06, 10, 8), 0, 1.83, 0));
    let y = 0.23;
    for (let i = 0; i < load; i++) {
      const h = 0.26 + rnd() * 0.08, w = W - 0.12 - rnd() * 0.08, l = 0.75 + rnd() * 0.25;
      b.add(mSuitcase, f.put(boxGeo(w, h, l), 0, y + h / 2, (rnd() - 0.5) * 0.1));
      b.add(mSuitTrim, f.put(new THREE.BoxGeometry(w + 0.01, 0.03, l + 0.01), 0, y + h - 0.03, 0));
      y += h + 0.005;
    }
    f.col(k, -W / 2, W / 2, -L / 2, L / 2, 0, y, true);
    return y;
  };
  const armchair = (x: number, z: number, ry: number, m: Mat = mTeal, s = 1, y0 = 0) => {
    const f = new Frame(x, z, ry);
    const W = 1.0 * s, D = 0.9 * s;
    b.add(m, f.put(boxGeo(W - 0.3 * s, 0.22 * s, D - 0.2 * s), 0, y0 + 0.3 * s, 0.05 * s), 0.5);
    b.add(m, f.put(boxGeo(W, 0.22 * s, D), 0, y0 + 0.16 * s, 0), 0.5);
    b.add(m, f.put(boxGeo(W, 0.7 * s, 0.22 * s), 0, y0 + 0.62 * s, -D / 2 + 0.1 * s, -0.22, 0, 0), 0.5);
    for (const sx of [-1, 1]) b.add(m, f.put(boxGeo(0.2 * s, 0.34 * s, D), sx * (W / 2 - 0.1 * s), y0 + 0.43 * s, 0.02 * s, 0, 0, sx * 0.15), 0.5);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(mWoodDark, f.put(new THREE.CylinderGeometry(0.03, 0.02, 0.08, 6), sx * (W / 2 - 0.08), y0 + 0.02, sz * (D / 2 - 0.08)));
    f.col(k, -W / 2, W / 2, -D / 2, D / 2, y0, y0 + 0.42 * s, true);
    f.col(k, -W / 2, W / 2, -D / 2, -D / 2 + 0.25 * s, y0, y0 + 0.95 * s, true);
  };
  const sofa = (x: number, z: number, ry: number, L = 2.0, m: Mat = mSofa, y0 = 0) => {
    const f = new Frame(x, z, ry);
    const D = 0.85;
    b.add(mWoodDark, f.put(boxGeo(L, 0.12, D - 0.05), 0, y0 + 0.1, 0), 0.6);
    b.add(m, f.put(boxGeo(L - 0.3, 0.2, D - 0.2), 0, y0 + 0.28, 0.05), 0.5);
    b.add(m, f.put(boxGeo(L, 0.55, 0.2), 0, y0 + 0.55, -D / 2 + 0.1, -0.12, 0, 0), 0.5);
    for (const sx of [-1, 1]) b.add(m, f.put(boxGeo(0.17, 0.5, D), sx * (L / 2 - 0.085), y0 + 0.4, 0), 0.5);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(mWoodDark, f.put(new THREE.CylinderGeometry(0.03, 0.02, 0.06, 6), sx * (L / 2 - 0.08), y0 + 0.02, sz * (D / 2 - 0.08)));
    f.col(k, -L / 2, L / 2, -D / 2, D / 2, y0, y0 + 0.4, true);
    f.col(k, -L / 2, L / 2, -D / 2, -D / 2 + 0.25, y0, y0 + 0.82, true);
  };
  const bed = (x: number, z: number, ry: number, W = 1.5, L = 2.1) => {
    const f = new Frame(x, z, ry); // head at local -z
    b.add(mMattress, f.put(boxGeo(W, 0.26, L), 0, 0.42, 0), 0.5);
    b.add(mBlanket, f.put(boxGeo(W + 0.06, 0.06, L * 0.62), 0, 0.57, L * 0.17), 0.9);
    for (const s of [-1, 1]) b.add(mBlanket, f.put(boxGeo(0.02, 0.3, L * 0.62), s * (W / 2 + 0.03), 0.42, L * 0.17), 0.9);
    for (const s of [-0.25, 0.25]) b.add(mPillow, f.put(boxGeo(W * 0.42, 0.14, 0.4), s * W, 0.62, -L / 2 + 0.3, -0.25, 0, 0), 0.5);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const hh = sz < 0 ? 1.15 : 0.75;
      b.add(mBlackMetal, f.put(new THREE.CylinderGeometry(0.03, 0.03, hh, 8), sx * (W / 2 + 0.03), hh / 2, sz * (L / 2 + 0.02)));
      b.add(mBlackMetal, f.put(new THREE.SphereGeometry(0.05, 8, 6), sx * (W / 2 + 0.03), hh + 0.03, sz * (L / 2 + 0.02)));
    }
    for (const sz of [-1, 1]) {
      const hh = sz < 0 ? 1.1 : 0.7;
      for (const y of [0.3, hh - 0.05]) b.add(mBlackMetal, f.put(new THREE.CylinderGeometry(0.018, 0.018, W + 0.06, 6), 0, y, sz * (L / 2 + 0.02), 0, 0, Math.PI / 2));
      for (let i = 1; i < 9; i++) b.add(mBlackMetal, f.put(new THREE.CylinderGeometry(0.011, 0.011, hh - 0.35, 4), -W / 2 + (W * i) / 9, 0.3 + (hh - 0.35) / 2, sz * (L / 2 + 0.02)));
    }
    for (const sx of [-1, 1]) b.add(mBlackMetal, f.put(new THREE.BoxGeometry(0.03, 0.1, L), sx * (W / 2 + 0.03), 0.3, 0));
    f.col(k, -W / 2 - 0.05, W / 2 + 0.05, -L / 2, L / 2, 0, 0.6, true);
  };
  const coatStand = (x: number, z: number) => {
    b.add(mWood, place(new THREE.CylinderGeometry(0.025, 0.03, 1.8, 6), x, 0.9, z));
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      b.add(mWood, beam([x, 0.5, z], [x + Math.cos(a) * 0.35, 0.0, z + Math.sin(a) * 0.35], 0.03, 0.03, true, 5));
      b.add(mWood, beam([x, 1.6, z], [x + Math.cos(a + 0.8) * 0.2, 1.72, z + Math.sin(a + 0.8) * 0.2], 0.025, 0.025, true, 5));
    }
    k.collider(x - 0.15, x + 0.15, z - 0.15, z + 0.15, 0, 1.8, false);
  };
  const fireExt = (x: number, z: number) => {
    b.add(mRed, place(lathe([[0, 0], [0.09, 0], [0.09, 0.5], [0.06, 0.58], [0.02, 0.62]], 12), x, 0, z));
    b.add(mBlackMetal, place(new THREE.BoxGeometry(0.14, 0.03, 0.03), x, 0.64, z));
    b.add(mBlackMetal, tubeGeo([[x, 0.6, z], [x + 0.08, 0.5, z + 0.04], [x + 0.1, 0.25, z + 0.06]], 0.012, 8, 4));
  };
  const redBin = (x: number, z: number) => {
    b.add(mRed, place(lathe([[0, 0], [0.19, 0], [0.22, 0.5], [0.23, 0.52], [0, 0.52]], 20), x, 0, z));
    k.collider(x - 0.2, x + 0.2, z - 0.2, z + 0.2, 0, 0.52, true);
  };
  const floorLamp = (x: number, z: number) => {
    b.add(mBlackMetal, place(new THREE.CylinderGeometry(0.16, 0.18, 0.04, 14), x, 0.02, z));
    b.add(mBlackMetal, place(lathe([[0.02, 0], [0.02, 0.4], [0.04, 0.45], [0.02, 0.5], [0.02, 1.5]], 6), x, 0, z));
    b.add(mShade, place(lathe([[0.28, 0], [0.18, 0.3], [0.17, 0.31]], 16), x, 1.45, z));
  };
  const tableLamp = (x: number, y: number, z: number) => {
    b.add(mGold, place(lathe([[0.08, 0], [0.1, 0.02], [0.03, 0.08], [0.02, 0.3]], 10), x, y, z));
    b.add(mShade, place(lathe([[0.16, 0], [0.11, 0.18], [0.1, 0.19]], 12), x, y + 0.25, z));
  };
  const rug = (x: number, z: number, r = 1.2, ry = 0) => {
    const g = new THREE.CircleGeometry(r, 16);
    g.rotateX(-Math.PI / 2);
    g.rotateY(ry);
    b.add(mRug, place(g, x, 0.014, z));
    b.add(mRug, place(new THREE.CylinderGeometry(r, r + 0.01, 0.014, 16, 1, true), x, 0.007, z, 0, ry, 0));
  };
  const diceAt = (x: number, y: number, z: number, s: number, ry = rnd() * 1.5, solid = true) => {
    dice.push({ pos: [x, y + s / 2, z], rotY: ry, scale: [s, s, s] });
    if (solid) k.collider(x - s * 0.6, x + s * 0.6, z - s * 0.6, z + s * 0.6, y, y + s, true);
  };
  const boxStack = (x: number, z: number, ry: number, n: number) => {
    let y = 0;
    for (let i = 0; i < n; i++) {
      const w = 0.5 + rnd() * 0.25, h = 0.35 + rnd() * 0.2, d = 0.45 + rnd() * 0.2;
      boxes.push({ pos: [x + (rnd() - 0.5) * 0.08, y + h / 2, z + (rnd() - 0.5) * 0.08], rotY: ry + (rnd() - 0.5) * 0.25, scale: [w, h, d] });
      y += h;
    }
    k.collider(x - 0.4, x + 0.4, z - 0.4, z + 0.4, 0, y, true);
  };
  const consoleTable = (x: number, z: number, ry: number, L = 1.6, D = 0.5, h = 0.8) => {
    const f = new Frame(x, z, ry);
    b.add(mWood, f.put(boxGeo(L, 0.05, D), 0, h - 0.025, 0), 0.8);
    b.add(mWood, f.put(boxGeo(L - 0.1, 0.1, D - 0.06), 0, h - 0.1, 0), 0.8);
    b.add(mWood, f.put(boxGeo(L - 0.1, 0.03, D - 0.08), 0, 0.14, 0), 0.8);
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      b.add(mWoodDark, f.put(lathe([[0.035, 0], [0.045, 0.1], [0.03, 0.2], [0.05, 0.35], [0.03, 0.55], [0.04, h - 0.15]], 8), sx * (L / 2 - 0.06), 0, sz * (D / 2 - 0.05)));
    f.col(k, -L / 2, L / 2, -D / 2, D / 2, 0, h, true);
  };
  const armor = (x: number, z: number, ry: number, m: Mat) => {
    const f = new Frame(x, z, ry);
    b.add(mWoodDark, f.put(boxGeo(0.7, 0.12, 0.5), 0, 0.06, 0), 1);
    for (const s of [-1, 1]) {
      b.add(m, f.put(lathe([[0.08, 0], [0.09, 0.3], [0.07, 0.45], [0.09, 0.52], [0.1, 0.9]], 10), s * 0.12, 0.12, 0));
      b.add(m, f.put(place(new THREE.SphereGeometry(0.1, 8, 6), 0, 0, 0, 0, 0, 0, [0.9, 0.5, 1.5]), s * 0.12, 0.14, 0.05));
      b.add(m, f.put(new THREE.SphereGeometry(0.12, 10, 8), s * 0.3, 1.52, 0));
      b.add(m, f.put(lathe([[0.07, 0], [0.09, 0.3], [0.07, 0.55]], 8), s * 0.34, 0.95, 0.02, 0, 0, s * 0.12));
      b.add(m, f.put(new THREE.SphereGeometry(0.06, 8, 6), s * 0.36, 0.95, 0.03));
    }
    b.add(m, f.put(lathe([[0.18, 0], [0.24, 0.1], [0.2, 0.3], [0.26, 0.55], [0.3, 0.62], [0.15, 0.68]], 14), 0, 1.0, 0));
    b.add(m, f.put(lathe([[0.2, 0], [0.22, 0.12], [0.2, 0.15]], 14), 0, 0.95, 0));
    b.add(m, f.put(lathe([[0.1, 0], [0.14, 0.04], [0.15, 0.2], [0.12, 0.32], [0, 0.36]], 14), 0, 1.7, 0));
    b.add(mBlackMetal, f.put(new THREE.BoxGeometry(0.2, 0.03, 0.02), 0, 1.84, 0.14));
    f.col(k, -0.4, 0.4, -0.25, 0.25, 0, 2.05, true);
  };

  // ---------- ATRIUM ----------
  const SX = 0, SZ = -2.5;
  {
    // pedestal: wooden drum with a gold "BIG PEN" band and a rock top
    const pr = 2.1;
    b.add(mWoodDark, place(new THREE.CylinderGeometry(pr, pr + 0.05, 0.62, 32, 1, true), SX, 0.31, SZ), 1);
    k.add(new THREE.CylinderGeometry(pr + 0.012, pr + 0.012, 0.3, 32, 1, true), mPlaque, [SX, 0.33, SZ], { noShadow: true });
    b.add(mGold, place(new THREE.TorusGeometry(pr + 0.02, 0.025, 4, 40), SX, 0.62, SZ, Math.PI / 2, 0, 0));
    b.add(mGold, place(new THREE.TorusGeometry(pr + 0.05, 0.025, 4, 40), SX, 0.04, SZ, Math.PI / 2, 0, 0));
    const rockG = lathe([[pr - 0.02, 0], [pr - 0.1, 0.12], [1.7, 0.28], [1.2, 0.4], [0.6, 0.45], [0, 0.46]], 28);
    const pa = rockG.attributes.position;
    for (let i = 0; i < pa.count; i++) {
      const y = pa.getY(i);
      if (y > 0.05) {
        const f = 1 + Math.sin(pa.getX(i) * 5.1) * Math.cos(pa.getZ(i) * 4.3) * 0.06;
        pa.setXYZ(i, pa.getX(i) * f, y + Math.sin(pa.getX(i) * 7 + pa.getZ(i) * 5) * 0.05, pa.getZ(i) * f);
      }
    }
    rockG.computeVertexNormals();
    b.add(mRock, place(rockG, SX, 0.62, SZ), 1);
    k.collider(SX - pr * 0.9, SX + pr * 0.9, SZ - pr * 0.9, SZ + pr * 0.9, 0, 0.7, true);
    k.collider(SX - 1.5, SX + 1.5, SZ - 1.5, SZ + 1.5, 0, 1.0, true);
    // the giant blue plush penguin, flippers up
    const S = 4.3, st = plushGeos(28, true), y0 = 1.02;
    const put = (g: G) => place(g, SX, y0, SZ, 0, 0.35, 0, [S, S, S]);
    k.merged([put(st.body), put(st.head), ...st.fl.map(put)], mKnitStatue);
    k.merged([put(st.belly), put(st.face)], mKnitStatueW);
    k.merged([put(st.beak), ...st.feet.map(put)], mKnitStatueO);
    k.merged(st.eyes.map(put), mEye);
    k.merged(st.xs.map(put), mInk);
    k.collider(SX - 1.3, SX + 1.3, SZ - 1.3, SZ + 1.3, 1.0, y0 + S * 0.7, true);
    k.collider(SX - 0.9, SX + 0.9, SZ - 0.9, SZ + 0.9, 1.0, y0 + S * 1.08, true);
    // velvet rope stanchions
    const n = 10, rr = 2.75;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.3, a2 = ((i + 1) / n) * Math.PI * 2 + 0.3;
      const x = SX + Math.cos(a) * rr, z = SZ + Math.sin(a) * rr;
      b.add(mGold, place(lathe([[0.14, 0], [0.14, 0.03], [0.03, 0.06], [0.025, 0.95], [0.045, 0.98], [0.03, 1.04], [0, 1.05]], 10), x, 0, z));
      k.collider(x - 0.1, x + 0.1, z - 0.1, z + 0.1, 0, 1.05, false);
      if (i % 5 === 1) continue; // gaps to walk in
      const x2 = SX + Math.cos(a2) * rr, z2 = SZ + Math.sin(a2) * rr;
      b.add(mRope, tubeGeo([[x, 0.92, z], [(x + x2) / 2, 0.72, (z + z2) / 2], [x2, 0.92, z2]], 0.025, 10, 5));
    }
  }
  // wooden posts under the balcony edge (with gold trim)
  const BW = 6.65, BN = -7.45, BS = 1; // balcony inner edges: x=±BW, z=BN; W/E balconies end at z=BS
  const posts: [number, number][] = [[-BW, BS], [-BW, -3.2], [-BW, BN], [-2.2, BN], [2.2, BN], [BW, BN], [BW, -3.2], [BW, BS]];
  for (const [x, z] of posts) {
    b.add(mWood, place(boxGeo(0.4, BAL_Y - 0.3, 0.4), x, (BAL_Y - 0.3) / 2, z), 1.2);
    b.add(mGold, place(new THREE.BoxGeometry(0.46, 0.05, 0.46), x, 0.2, z));
    b.add(mGold, place(new THREE.BoxGeometry(0.46, 0.05, 0.46), x, BAL_Y - 0.5, z));
    k.collider(x - 0.2, x + 0.2, z - 0.2, z + 0.2, 0, BAL_Y - 0.3, false);
  }
  const slab = (x1: number, x2: number, z1: number, z2: number) => {
    b.add(mPlank, place(new THREE.BoxGeometry(x2 - x1, 0.06, z2 - z1), (x1 + x2) / 2, BAL_Y - 0.03, (z1 + z2) / 2), 2.2);
    b.add(mWoodDark, place(new THREE.BoxGeometry(x2 - x1, 0.24, z2 - z1), (x1 + x2) / 2, BAL_Y - 0.18, (z1 + z2) / 2), 2);
    k.collider(x1, x2, z1, z2, BAL_Y - 0.3, BAL_Y, true);
  };
  slab(-XA + 0.15, -BW + 0.2, ZA + 0.15, BS + 0.2);
  slab(BW - 0.2, XA - 0.15, ZA + 0.15, BS + 0.2);
  slab(-BW + 0.2, BW - 0.2, ZA + 0.15, BN + 0.2);
  for (const [a, c] of [[[-BW, BAL_Y - 0.25, BS + 0.2], [-BW, BAL_Y - 0.25, BN]], [[BW, BAL_Y - 0.25, BS + 0.2], [BW, BAL_Y - 0.25, BN]], [[-BW, BAL_Y - 0.25, BN], [BW, BAL_Y - 0.25, BN]]] as [V3t, V3t][])
    b.add(mWood, beam(a, c, 0.3, 0.45), 1);
  // railings (turned balusters, handrail, newel posts)
  const railLine = (ax: number, az: number, bx: number, bz: number, y0 = BAL_Y, y1 = BAL_Y) => {
    const len = Math.hypot(bx - ax, bz - az), n = Math.max(2, Math.round(len / 0.26));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      balusters.push({ pos: [ax + (bx - ax) * t, y0 + (y1 - y0) * t, az + (bz - az) * t] });
    }
    b.add(mWoodDark, beam([ax, y0 + 0.95, az], [bx, y1 + 0.95, bz], 0.09, 0.12), 1);
    b.add(mWoodDark, beam([ax, y0 + 0.06, az], [bx, y1 + 0.06, bz], 0.07, 0.09), 1);
    for (const [x, y, z] of [[ax, y0, az], [bx, y1, bz]]) {
      b.add(mWoodDark, place(boxGeo(0.16, 1.15, 0.16), x, y + 0.575, z), 1);
      b.add(mWoodDark, place(boxGeo(0.2, 0.06, 0.2), x, y + 1.17, z), 1);
    }
    if (y0 === y1) k.collider(Math.min(ax, bx) - 0.06, Math.max(ax, bx) + 0.06, Math.min(az, bz) - 0.06, Math.max(az, bz) + 0.06, y0, y0 + 1.0, false);
  };
  const SW = 1.8; // stair width
  railLine(-BW, BS + 0.1, -BW, BN);
  railLine(-BW, BN, -2.2, BN);
  railLine(-2.2, BN, 2.2, BN);
  railLine(2.2, BN, BW, BN);
  railLine(BW, BN, BW, BS + 0.1);
  railLine(-XA + 0.15 + SW, BS + 0.1, -BW, BS + 0.1);
  railLine(XA - 0.15 - SW, BS + 0.1, BW, BS + 0.1);
  // staircases along the W and E walls: bottom at the lobby wall (z=ZL), top at the balcony (z=BS)
  for (const sx of [-1, 1]) {
    const xa = sx * (XA - 0.15), xb = sx * (XA - 0.15 - SW);
    const x1 = Math.min(xa, xb), x2 = Math.max(xa, xb), xc = (x1 + x2) / 2;
    const N = 15, rise = BAL_Y / N, run = (ZL - 0.15 - BS - 0.2) / N;
    for (let i = 0; i < N; i++) {
      const zHi = ZL - 0.15 - i * run, zLo = zHi - run, top = (i + 1) * rise;
      b.add(mPlank, place(new THREE.BoxGeometry(SW, 0.05, run + 0.03), xc, top - 0.025, (zHi + zLo) / 2 - 0.015), 2.2);
      b.add(mWoodDark, place(new THREE.BoxGeometry(SW, rise, 0.03), xc, top - rise / 2, zHi - 0.015), 1);
      k.collider(x1, x2, zLo, zHi, 0, top, true);
    }
    const sh = new THREE.Shape();
    sh.moveTo(ZL - 0.15, 0); sh.lineTo(ZL - 0.15, rise + 0.2); sh.lineTo(BS + 0.2, BAL_Y + 0.2); sh.lineTo(BS + 0.2, 0); sh.lineTo(ZL - 0.15, 0);
    const sg = new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: false });
    sg.rotateY(-Math.PI / 2);
    sg.translate(sx < 0 ? xb + 0.1 : xb, 0, 0);
    b.add(mWood, sg, 1);
    railLine(xb - sx * 0.05, ZL - 0.4, xb - sx * 0.05, BS + 0.25, rise * 2, BAL_Y);
  }
  // sconces
  for (const sx of [-1, 1]) {
    for (const z of [-5.25, 0.2]) sconce(sx * (XA - 0.15), z, sx < 0 ? Math.PI / 2 : -Math.PI / 2, 2.2);
    for (const z of [-7.5, -2.5]) sconce(sx * (XA - 0.15), z, sx < 0 ? Math.PI / 2 : -Math.PI / 2, 6.6);
  }
  for (const x of [-7, 0, 7]) sconce(x, ZA + 0.15, 0, 2.3);
  for (const x of [-6, -2, 2, 6]) sconce(x, ZA + 0.15, 0, 6.6);
  // pennant banners hanging from the balcony fascia
  const pennant = (x: number, z: number, ry: number) => {
    b.add(mBanner, place(new THREE.PlaneGeometry(0.62, 2.0), x, BAL_Y - 1.4, z, 0, ry, 0));
    b.add(mGold, place(new THREE.CylinderGeometry(0.02, 0.02, 0.75, 6), x, BAL_Y - 0.38, z, 0, ry, Math.PI / 2));
  };
  for (const z of [-0.8, -5.4]) { pennant(-BW + 0.28, z, Math.PI / 2); pennant(BW - 0.28, z, -Math.PI / 2); }
  for (const x of [-4.4, 0, 4.4]) pennant(x, BN + 0.28, 0);
  // bunting strings
  const buntLine = (a: V3t, c: V3t, sag: number) => {
    const pts: V3t[] = [];
    const n = 12;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push([a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, a[2] + (c[2] - a[2]) * t]);
    }
    b.add(mString, tubeGeo(pts, 0.008, 20, 3));
    const len = Math.hypot(c[0] - a[0], c[2] - a[2]);
    const ry = Math.atan2(-(c[2] - a[2]), c[0] - a[0]);
    const m = Math.floor(len / 0.34);
    for (let i = 1; i < m; i++) {
      const t = i / m;
      flags.push({ pos: [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, a[2] + (c[2] - a[2]) * t], rotY: ry, color: i % 2 ? "#a9d8f7" : "#f5f8fb" });
    }
  };
  buntLine([-BW, BAL_Y + 1.0, -1.2], [BW, BAL_Y + 1.0, -1.2], 0.9);
  buntLine([-BW, BAL_Y + 1.0, -5.5], [BW, BAL_Y + 1.0, -5.5], 0.9);
  buntLine([-BW, BAL_Y + 1.0, BN], [-BW, BAL_Y + 1.0, BS], 0.5);
  buntLine([BW, BAL_Y + 1.0, BN], [BW, BAL_Y + 1.0, BS], 0.5);
  buntLine([-3.4, 3.7, ZL - 0.2], [3.4, 3.7, ZL - 0.2], 0.4);
  // crystal chandeliers
  const chandelier = (x: number, z: number, yb: number, s = 1) => {
    b.add(mGold, place(new THREE.CylinderGeometry(0.012, 0.012, ATR_H - (yb + 1.65 * s), 4), x, (ATR_H + yb + 1.65 * s) / 2, z));
    b.add(mCrystal, place(lathe([[0, 0], [0.12, 0.05], [0.3, 0.28], [0.5, 0.65], [0.66, 0.95], [0.7, 1.02], [0.52, 1.08], [0.36, 1.25], [0.42, 1.4], [0.22, 1.56], [0, 1.65]].map(([r, h]) => [r * s, h * s] as [number, number]), 14), x, yb, z));
    for (const [r, h, n] of [[0.71, 1.0, 14], [0.46, 0.55, 10], [0.42, 1.38, 8]] as [number, number, number][]) {
      b.add(mGold, place(new THREE.TorusGeometry(r * s, 0.03 * s, 4, 20), x, yb + h * s, z, Math.PI / 2, 0, 0));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        bulbs.add(x + Math.cos(a) * r * s, yb + (h + 0.07) * s, z + Math.sin(a) * r * s, 0.045 * s, 0.07 * s, 0.045 * s, "#ffffff");
      }
    }
  };
  chandelier(-3.6, -5.6, 5.9);
  chandelier(3.6, -5.6, 5.9);
  chandelier(-3.6, 1.2, 6.1);
  chandelier(3.6, 1.2, 6.1);
  // balloons crowding the atrium ceiling
  for (let i = 0; i < 170; i++) {
    const x = -XA + 0.5 + rnd() * (2 * XA - 1), z = ZA + 0.5 + rnd() * (ZL - ZA - 1);
    const col = pick(["#1d5fe0", "#1936b8", "#2f8ff0", "#f5a623", "#1d5fe0", SILVER]);
    balloon(x, ATR_H - 0.55 - rnd() * 0.5, z, 0.32 + rnd() * 0.08, col, col === SILVER);
  }
  balloonArch(-5.3, -5.9, -5.3, -0.9, 4.2);
  balloonArch(5.3, -5.9, 5.3, -0.9, 4.2);
  balloonArch(-3.2, 5.4, 3.2, 5.4, 3.7);
  balloonStack(-BW - 0.1, -3.2, 3.8);
  balloonStack(BW + 0.1, -3.2, 3.8);
  balloonStack(-2.2, BN - 0.1, 3.2, 0.36);
  // floor clutter: eggs, beach balls, dice, plushes
  for (const [x, z] of [[-4.6, 3.1], [-5.1, 3.6], [-4.2, 3.9], [4.8, -6.9], [5.6, -6.7], [-5.9, -6.6], [-4.8, -6.9], [5.4, 3.2], [4.7, 3.8], [-1.3, -7.0], [1.6, -6.9]] as [number, number][]) egg(x, z, 0.9 + rnd() * 0.4);
  for (const [x, z] of [[-6.0, 2.2], [-5.4, 2.6], [-6.1, 3.0]] as [number, number][]) beachBall(x, 0, z, 0.3);
  beachBall(-5.85, 0.5, 2.6, 0.26);
  k.collider(-6.4, -5.1, 1.9, 3.3, 0, 0.6, true);
  plushie(3.7, 0, 2.6, 0.7, 2.2, PLUSH.violet, true, -1.35);
  plushie(-3.3, 0, -6.8, 0.6, 0.6, PLUSH.blue, true, 0, 0.5);
  diceAt(5.6, 0, 2.3, 0.7, 0.3);
  // under the balconies
  armor(-8.9, -9.8, 0.4, mGold);
  armor(8.9, -9.8, -0.4, mBlackMetal);
  sofa(XA - 0.6, -5.2, -Math.PI / 2, 2.1);
  plushie(XA - 0.6, 0.4, -5.8, 0.42, -Math.PI / 2, PLUSH.sky, false);
  plushie(XA - 0.6, 0.4, -4.7, 0.42, -Math.PI / 2, PLUSH.blue, false);
  vase(XA - 0.55, 0, -6.6, 1.2);
  vase(-XA + 0.55, 0, -4.1, 1.3);
  vase(-XA + 0.55, 0, -6.5, 1.0);
  luggageCart(-XA + 0.75, -5.3, 0.1, 3);
  {
    // buffet table against the north wall
    const zb = ZA + 0.75;
    b.add(mCloth, place(boxGeo(4.0, 0.8, 0.9), 0, 0.4, zb), 0.6);
    b.add(mCloth, place(boxGeo(4.06, 0.04, 0.96), 0, 0.8, zb), 0.6);
    k.collider(-2.0, 2.0, zb - 0.45, zb + 0.45, 0, 0.82, true);
    candleCluster(-1.3, 0.82, zb, 6);
    candleCluster(1.2, 0.82, zb - 0.05, 5);
    goldBust(0.1, 0.82, zb - 0.05, 0.3, 0.8);
    plushie(-0.6, 0.82, zb + 0.1, 0.36, 0.2, PLUSH.red, false);
    plushie(0.8, 0.82, zb + 0.1, 0.34, -0.3, PLUSH.green, false);
  }

  // ---------- BALCONY (2nd floor) ----------
  const Y = BAL_Y;
  roundTable(-8.1, -1.0, 0.62, 0.75, true, Y);
  candleCluster(-8.2, Y + 0.76, -1.0, 6);
  roundTable(8.1, -6.0, 0.62, 0.75, true, Y);
  candleCluster(8.0, Y + 0.76, -6.0, 5);
  sofa(-4.4, ZA + 0.65, 0, 2.2, mSofa, Y);
  sofa(4.2, ZA + 0.65, 0, 2.2, mSofa, Y);
  plushie(-4.9, Y + 0.4, ZA + 0.7, 0.45, 0, PLUSH.blue, false);
  plushie(-4.0, Y + 0.4, ZA + 0.7, 0.45, 0, PLUSH.red, false);
  plushie(4.4, Y + 0.4, ZA + 0.7, 0.45, 0.2, PLUSH.green, false);
  diceAt(-7.2, Y, -9.4, 0.8, 0.2);
  diceAt(-8.9, Y, -8.3, 0.6, 0.7);
  b.add(mWood, place(boxGeo(0.6, 0.95, 0.6), 8.5, Y + 0.475, -2.2), 0.8);
  k.collider(8.2, 8.8, -2.5, -1.9, Y, Y + 0.95, true);
  goldBust(8.5, Y + 0.95, -2.2, -Math.PI / 2, 1.2);
  vase(9.0, Y, -9.9, 1.0);
  plushie(-9.0, Y, -6.3, 0.8, Math.PI / 2, PLUSH.navy);
  plushie(1.0, Y, -9.8, 0.7, 0.3, PLUSH.sky);
  stripey(-1.2, Y, -10.0, 0.6, 0.2);
  armchair(8.8, -8.2, -Math.PI / 2 - 0.3, mTeal, 1, Y);
  bunch(-9.2, Y, -10.0, 6, 1.5);
  bunch(9.2, Y, 0.4, 5, 1.4);
  for (let i = 0; i < 3; i++) b.add(mSuitcase, place(boxGeo(0.7 - i * 0.08, 0.26, 0.5), -8.6, Y + 0.13 + i * 0.27, -7.0, 0, 0.2 * i, 0));
  k.collider(-9.0, -8.2, -7.35, -6.65, Y, Y + 0.8, true);

  // ---------- LOBBY ----------
  {
    closedDoor("x", ZS, -0.62, -1, 1.2, 2.8);
    closedDoor("x", ZS, 0.62, -1, 1.2, 2.8);
    // reception desk along the east side (front faces -x)
    const f = new Frame(7.4, 10.2, -Math.PI / 2);
    b.add(mWood, f.put(boxGeo(3.4, 1.0, 0.7), 0, 0.5, 0), 0.8);
    b.add(mWoodDark, f.put(boxGeo(3.5, 0.06, 0.85), 0, 1.03, 0.05), 0.8);
    for (let i = 0; i < 5; i++) b.add(mWoodDark, f.put(boxGeo(0.5, 0.7, 0.03), -1.35 + i * 0.68, 0.5, 0.36), 0.6);
    for (let i = 0; i < 5; i++) b.add(mGold, f.put(new THREE.BoxGeometry(0.52, 0.03, 0.02), -1.35 + i * 0.68, 0.87, 0.38));
    f.col(k, -1.75, 1.75, -0.35, 0.47, 0, 1.06, true);
    const [bx, bz] = f.pt(-0.8, 0.1);
    b.add(mGold, place(new THREE.SphereGeometry(0.07, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), bx, 1.06, bz));
    const [gx, gz] = f.pt(0.9, 0);
    goldBust(gx, 1.06, gz, -Math.PI / 2, 0.8);
    const [px, pz] = f.pt(0.2, 0);
    plushie(px, 1.06, pz, 0.35, -Math.PI / 2, PLUSH.black, false);
    b.add(mWoodDark, place(boxGeo(0.06, 1.1, 2.4), XA - 0.2, 1.8, 10.8), 1);
    for (let i = 0; i < 12; i++) b.add(mGold, place(new THREE.BoxGeometry(0.03, 0.08, 0.04), XA - 0.25, 1.5 + (i % 3) * 0.3, 9.9 + Math.floor(i / 3) * 0.55));
    luggageCart(-7.6, 11.9, 0.3, 3);
    luggageCart(-8.7, 7.4, Math.PI / 2, 2);
    vase(-3.2, 0, 12.9, 1.2);
    vase(3.2, 0, 12.9, 1.2);
    bunch(-2.2, 0, 12.8, 6, 1.7);
    bunch(2.2, 0, 12.8, 6, 1.7);
    rug(0, 9.6, 1.5);
    plushie(-5.2, 0, 12.7, 0.9, Math.PI, PLUSH.blue);
    plushie(-4.3, 0, 12.8, 0.6, Math.PI + 0.3, PLUSH.green);
    stripey(-6.1, 0, 12.8, 0.6, Math.PI - 0.2);
    diceAt(5.0, 0, 12.7, 0.7);
    diceAt(5.1, 0.7, 12.7, 0.45, 0.8, false);
    for (const x of [-6, 6]) for (const z of [7.6, 11.6]) sconce(x < 0 ? -XA + 0.15 : XA - 0.15, z, x < 0 ? Math.PI / 2 : -Math.PI / 2, 2.1);
    goldFrame(-5.5, 2.3, ZS - 0.15, Math.PI, 1.3, 0.9);
    goldFrame(5.5, 2.3, ZS - 0.15, Math.PI, 0.8, 1.0, true);
    for (const x of [-4.5, 0, 4.5]) {
      const yb = LOBBY_H - 1.0;
      b.add(mGold, place(new THREE.CylinderGeometry(0.01, 0.01, 0.4, 4), x, LOBBY_H - 0.2, 9.6));
      b.add(mCrystal, place(lathe([[0, 0], [0.1, 0.05], [0.3, 0.3], [0.38, 0.45], [0.2, 0.55], [0.1, 0.6], [0, 0.62]], 12), x, yb, 9.6));
      b.add(mGold, place(new THREE.TorusGeometry(0.38, 0.02, 4, 16), x, yb + 0.45, 9.6, Math.PI / 2, 0, 0));
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; bulbs.add(x + Math.cos(a) * 0.38, yb + 0.5, 9.6 + Math.sin(a) * 0.38, 0.035, 0.055, 0.035, "#fff"); }
    }
  }

  // ---------- HALLWAYS ----------
  for (const x of [-10.5, -6.5, 0, 6.5, 10.5]) closedDoor("x", ZN, x, 1);
  for (const x of [-8.5, -3.2, 3.2, 8.5]) sconce(x, ZN + 0.15, 0, 1.9);
  for (const x of [-8.5, 3.2]) sconce(x, ZA - 0.15, Math.PI, 1.9);
  dresser(-3.2, ZN + 0.4, 0, 1.4, 0.95, 0.46);
  goldBust(-3.2, 0.95, ZN + 0.4, 0.2, 1.0);
  dresser(8.5, ZN + 0.4, 0, 1.2, 0.95, 0.46);
  plushie(8.2, 0.95, ZN + 0.45, 0.45, 0.1, PLUSH.green, false);
  vase(8.9, 0.95, ZN + 0.4, 0.5);
  luggageCart(2.6, ZA - 0.6, Math.PI / 2, 2);
  boxStack(-8.4, ZA - 0.45, 0.2, 2);
  plushie(-11.9, 0, ZN + 0.5, 0.8, 0.8, PLUSH.blue);
  plushie(12.0, 0, ZN + 0.5, 0.6, -0.8, PLUSH.red);
  bunch(-12.0, 0, ZN + 1.3, 5, 1.4);
  fireExt(5.2, ZN + 0.25);
  for (const sx of [-1, 1]) {
    const wx = sx * (XH - 0.15), ix = sx * (XA + 0.15);
    const ryW = sx < 0 ? Math.PI / 2 : -Math.PI / 2; // on the room wall, facing into the hallway
    for (const z of [-11.8, -4.5, 4.5, 12.4]) sconce(wx, z, ryW, 1.9);
    for (const z of [-5.25, 6.8]) sconce(ix, z, -ryW, 1.9);
    dresser(sx * (XH - 0.4), -4.5, ryW, 1.3, 0.95, 0.46);
    goldBust(sx * (XH - 0.4), 0.95, -4.5, ryW, 1.0);
    luggageCart(sx * (XA + 0.55), 4.4, 0.05, 2);
    luggageCart(sx * (XH - 0.55), 12.2, -0.1, 3);
    boxStack(sx * (XA + 0.5), -8.6, 0.2, 2);
    vase(sx * (XH - 0.35), 4.3, 0.9);
    plushie(sx * (XA + 0.45), 0, -9.6, 0.7, -ryW, sx < 0 ? PLUSH.black : PLUSH.violet);
    fireExt(sx * (XA + 0.3), 0.8);
    goldFrame(wx, 2.4, -1.8, ryW, 0.8, 0.6);
    goldFrame(ix, 2.4, 2.5, -ryW, 0.6, 0.8, true);
  }

  // ---------- ROOMS ----------
  type Kind = "bed" | "plush" | "twin" | "storage" | "lounge" | "bed2";
  const kinds: Record<string, Kind> = { "-1,0": "bed", "-1,1": "plush", "-1,2": "twin", "1,0": "storage", "1,1": "lounge", "1,2": "bed2" };
  const names: Record<Kind, string> = { bed: "Bedroom 201", plush: "Plush Room", twin: "Twin Room 203", storage: "Storage Room", lounge: "Lounge", bed2: "Bedroom 205" };
  for (const sx of [-1, 1]) roomZ.forEach(([z1r, z2r, dz], ri) => {
    const kind = kinds[`${sx},${ri}`];
    const xo = sx * (XO - 0.15), xi = sx * (XH + 0.15); // inner faces of the outer and hallway walls
    const x1 = Math.min(xo, xi), x2 = Math.max(xo, xi);
    const z1 = z1r + 0.15, z2 = z2r - 0.15, zc = (z1 + z2) / 2;
    k.room(names[kind], x1, x2, z1, z2);
    floor(x1, x2, z1, z2, kind === "storage" ? mChkHall : mHerr, kind === "storage" ? 0.8 : 1.4);
    const ops: Op[] = [[dz, 1.8]];
    band("z", sx * XO, z1, z2, 0, 0.14, [], mWood, 0.03, -sx, 1);
    band("z", sx * XH, z1, z2, 0, 0.14, ops, mWood, 0.03, sx, 1);
    band("x", z1r, x1, x2, 0, 0.14, [], mWood, 0.03, 1, 1);
    band("x", z2r, x1, x2, 0, 0.14, [], mWood, 0.03, -1, 1);
    band("z", sx * XO, z1, z2, WING_H - 0.12, WING_H, [], mWoodDark, 0.07, -sx, 1);
    band("z", sx * XH, z1, z2, WING_H - 0.12, WING_H, [], mWoodDark, 0.07, sx, 1);
    band("x", z1r, x1, x2, WING_H - 0.12, WING_H, [], mWoodDark, 0.07, 1, 1);
    band("x", z2r, x1, x2, WING_H - 0.12, WING_H, [], mWoodDark, 0.07, -1, 1);
    // open door leaf swung back against the room wall
    const ds = ri === 2 ? -1 : 1;
    b.add(mDoor, place(boxGeo(0.05, DOOR_H - 0.05, 0.9), xi + sx * 0.04, (DOOR_H - 0.05) / 2, dz + ds * 1.36), 1);
    b.add(mShade, place(new THREE.SphereGeometry(0.3, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), (x1 + x2) / 2, WING_H - 0.02, zc, Math.PI, 0, 0, [1, 0.35, 1]));
    const u = (d: number) => xo - sx * d; // distance from the outer wall → world x
    const ryIn = -sx * Math.PI / 2; // facing away from the outer wall
    const wallF = sx < 0 ? Math.PI / 2 : -Math.PI / 2;
    goldFrame(xo, 2.3, zc - 1.8, wallF, 1.0, 0.75);
    goldFrame(xo, 2.3, zc + 1.8, wallF, 0.7, 0.9, true);
    goldFrame((x1 + x2) / 2 - 1, 2.4, z1, 0, 0.9, 0.7);
    goldFrame((x1 + x2) / 2 + 1.2, 2.2, z2, Math.PI, 0.6, 0.8, true);
    const nearWallZ = ri === 0 ? z1 : z2; // wall away from the door
    const zFar = ri === 0 ? 1 : -1; // direction from that wall into the room
    if (kind === "bed" || kind === "bed2") {
      bed(u(1.25), zc - 1.0 * zFar, ryIn, 1.5, 2.1);
      for (const s of [-1, 1]) {
        const nz = zc - 1.0 * zFar + s * 1.12;
        dresser(u(0.3), nz, ryIn, 0.5, 0.6, 0.42, 1, 2);
        if (s > 0) tableLamp(u(0.3), 0.6, nz);
      }
      dresser(u(4.5), nearWallZ + zFar * 0.3, zFar > 0 ? 0 : Math.PI, 1.5, 0.95, 0.5);
      plushie(u(4.9), 0.95, nearWallZ + zFar * 0.3, 0.45, zFar > 0 ? 0 : Math.PI, PLUSH.blue, false);
      plushie(u(4.3), 0.95, nearWallZ + zFar * 0.33, 0.4, zFar > 0 ? 0.3 : Math.PI - 0.3, PLUSH.navy, false, 0, 0.6);
      vase(u(3.95), 0.95, nearWallZ + zFar * 0.3, 0.7, mPorcelain);
      rug(u(4.3), zc + zFar * 0.6, 1.2);
      diceAt(u(4.6), 0, zc + zFar * 2.0, 0.65);
      consoleTable(u(6.8), zc + zFar * 1.8, -ryIn, 1.6, 0.5, 0.8);
      candleCluster(u(6.8), 0.8, zc + zFar * 1.5, 7);
      stripey(u(6.8), 0.14, zc + zFar * 2.2, 0.42, -ryIn, false);
      stripey(u(6.8), 0.14, zc + zFar * 1.6, 0.4, -ryIn + 0.2, false);
      fireExt(u(6.8), dz - zFar * 1.4);
      coatStand(u(5.7), ri === 0 ? z2 - 0.5 : z1 + 0.5);
      redBin(u(2.6), nearWallZ + zFar * 0.4);
      if (kind === "bed2") {
        armchair(u(3.4), zc + zFar * 2.6, Math.PI + 0.5 * sx, mTeal);
        plushie(u(2.2), 0, zc + zFar * 3.2, 0.9, zFar > 0 ? Math.PI : 0, PLUSH.red);
      }
    } else if (kind === "twin") {
      for (const s of [-1, 1]) bed(u(1.25), zc + s * 1.6, ryIn, 1.2, 2.0);
      dresser(u(0.3), zc, ryIn, 0.5, 0.6, 0.42, 1, 2);
      vase(u(0.3), 0.6, zc, 0.55);
      plushie(u(1.4), 0.6, zc - 1.6, 0.45, ryIn, PLUSH.green, false);
      plushie(u(1.4), 0.6, zc + 1.6, 0.45, ryIn, PLUSH.red, false);
      dresser(u(4.6), z2 - 0.3, Math.PI, 1.5, 0.95, 0.5);
      goldBust(u(4.6), 0.95, z2 - 0.3, Math.PI, 0.9);
      rug(u(4.4), zc - 0.4, 1.3);
      diceAt(u(5.0), 0, zc + 1.8, 0.7, 0.4);
      diceAt(u(5.4), 0, zc + 1.0, 0.45, 1.1);
      roundTable(u(5.9), z1 + 1.2, 0.42, 0.72);
      plushie(u(5.9), 0.72, z1 + 1.2, 0.42, 0, PLUSH.violet, false);
      stripey(u(3.4), 0, z1 + 0.6, 0.6, 0);
      coatStand(u(6.7), z2 - 0.5);
      redBin(u(3.2), z2 - 0.4);
    } else if (kind === "plush") {
      armchair(u(3.6), zc + 0.8, Math.PI + 0.5 * -sx, mTeal, 1.25);
      rug(u(3.4), zc - 1.0, 1.3);
      diceAt(u(3.0), 0, zc - 0.6, 0.62, 0.3);
      diceAt(u(4.6), 0, zc + 0.2, 0.5, 0.9);
      for (const zz of [z1 + 1.1, z2 - 1.3]) {
        roundTable(u(0.8), zz, 0.5, 0.72);
        plushie(u(0.8), 0.72, zz, 0.55, ryIn, pick([PLUSH.blue, PLUSH.violet]), false);
      }
      stripey(u(0.5), 0, zc + 0.3, 0.7, ryIn);
      stripey(u(0.5), 0, zc - 0.6, 0.55, ryIn + 0.3);
      plushie(u(1.4), 0, zc - 0.2, 1.0, ryIn + 0.2, PLUSH.violet);
      for (let i = 0; i < 7; i++) plushie(u(1.6 + (i % 4) * 0.55), 0, z1 + 0.5 + Math.floor(i / 4) * 0.6, 0.45 + rnd() * 0.2, rnd() * 6, pick([PLUSH.blue, PLUSH.sky, PLUSH.blue, PLUSH.black]), true, i % 3 === 0 ? -1.3 : 0);
      glossy.add(u(2.4), 0.2, z1 + 1.4, 0.3, 0.2, 0.25, "#e83fb2");
      const top = luggageCart(u(5.6), z2 - 0.9, Math.PI / 2, 0);
      plushie(u(5.6), top, z2 - 0.9, 0.5, Math.PI / 2 * sx, PLUSH.blue, false, -1.5);
      dresser(u(6.6), zc - 2.2, -ryIn, 1.2, 1.1, 0.55);
      plushie(u(6.6), 1.1, zc - 2.3, 0.75, -ryIn, PLUSH.blue, false);
      floorLamp(u(0.4), z1 + 2.4);
      floorLamp(u(2.2), z2 - 0.4);
      coatStand(u(2.5), z1 + 0.35);
    } else if (kind === "storage") {
      for (let i = 0; i < 6; i++) boxStack(u(0.5 + (i % 3) * 0.85), z1 + 0.5 + Math.floor(i / 3) * 0.85, rnd(), 2 + (i % 2));
      for (let i = 0; i < 3; i++) boxStack(u(0.5), zc + 0.6 + i * 0.85, rnd(), 1 + (i % 3));
      luggageCart(u(3.6), z2 - 0.8, 0.3, 3);
      luggageCart(u(5.0), z2 - 0.9, -0.2, 1);
      diceAt(u(4.2), 0, z1 + 0.6, 0.8, 0.2);
      diceAt(u(4.25), 0.8, z1 + 0.6, 0.5, 0.7, false);
      diceAt(u(5.1), 0, z1 + 0.55, 0.6, 1.2);
      for (let i = 0; i < 5; i++) plushie(u(2.6 + rnd() * 1.5), 0, zc - 0.5 + rnd() * 1.6, 0.4 + rnd() * 0.3, rnd() * 6, pick(plushCols), true, rnd() < 0.4 ? -1.3 : 0);
      bunch(u(0.5), 0, zc - 0.3, 7, 1.6);
      bunch(u(6.4), 0, z1 + 0.5, 6, 1.5);
      for (let i = 0; i < 8; i++) egg(u(1.8 + rnd() * 1.4), z1 + 2.2 + rnd() * 1.0);
      fireExt(u(6.8), dz - 1.3);
      redBin(u(6.7), z2 - 0.4);
    } else if (kind === "lounge") {
      sofa(u(0.55), zc, ryIn, 2.4);
      plushie(u(0.55), 0.4, zc - 0.6, 0.45, ryIn, PLUSH.blue, false);
      plushie(u(0.55), 0.4, zc + 0.1, 0.5, ryIn, PLUSH.red, false);
      roundTable(u(2.3), zc + 1.9, 0.45, 0.72);
      plushie(u(2.3), 0.72, zc + 1.9, 0.5, ryIn, PLUSH.green, false);
      plushie(u(2.0), 0, zc + 1.0, 0.55, ryIn, PLUSH.black);
      roundTable(u(3.4), zc, 0.6, 0.74, true);
      candleCluster(u(3.4), 0.76, zc, 6);
      armchair(u(4.8), zc - 1.2, -ryIn + 0.4 * sx);
      armchair(u(4.8), zc + 1.2, -ryIn - 0.4 * sx);
      vase(u(0.4), 0, z1 + 0.4, 1.2);
      vase(u(0.4), 0, z2 - 0.4, 1.2);
      armor(u(6.6), z1 + 0.5, 0, mGold);
      rug(u(3.4), zc, 1.6);
      stripey(u(6.3), 0, z2 - 0.5, 0.6, Math.PI);
      bunch(u(6.5), 0, z2 - 1.3, 6, 1.6);
      floorLamp(u(0.4), zc + 1.6);
    }
  });

  // ---------- flush instances ----------
  plushStd.flush(k);
  plushStriped.flush(k);
  glossy.flush(k, mGlossy);
  foil.flush(k, mFoil);
  beach.flush(k, mBeach);
  bulbs.flush(k, mBulb);
  if (candles.length) k.instances(new THREE.CylinderGeometry(0.03, 0.03, 1, 6), mCandle, candles);
  if (dice.length) k.instances(chamferGeo(1, 1, 1, 0.06), mDice, dice);
  if (boxes.length) k.instances(new THREE.BoxGeometry(1, 1, 1), mCard, boxes);
  if (balusters.length) k.instances(lathe([[0.04, 0], [0.04, 0.12], [0.028, 0.18], [0.05, 0.36], [0.03, 0.62], [0.035, 0.78], [0.04, 0.9]], 7), mWoodDark, balusters);
  if (flags.length) {
    const fg = new THREE.BufferGeometry();
    fg.setAttribute("position", new THREE.Float32BufferAttribute([-0.13, 0, 0, 0.13, 0, 0, 0, -0.26, 0], 3));
    fg.setAttribute("normal", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
    fg.setAttribute("uv", new THREE.Float32BufferAttribute([0, 1, 1, 1, 0.5, 0], 2));
    k.instances(fg, mFlag, flags, { noShadow: true });
  }
  b.flush(k);

  // ---------- spawns ----------
  const bounds = { minX: -XO + 0.25, maxX: XO - 0.25, minZ: ZN + 0.15, maxZ: ZS - 0.15 };
  const hiders: THREE.Vector3[] = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const r = i % 2 ? 3.9 : 4.5;
    hiders.push(new V3(SX + Math.cos(a) * r, 0, SZ + Math.sin(a) * r * 0.95));
  }
  const blockedAt = (px: number, pz: number) => {
    const x = bounds.minX + (Math.floor((px - bounds.minX) / 0.5) + 0.5) * 0.5, z = bounds.minZ + (Math.floor((pz - bounds.minZ) / 0.5) + 0.5) * 0.5;
    return k.obstacles.some((o) => o.top > 0.46 && o.bottom < 1.6 && x > o.minX - 0.45 && x < o.maxX + 0.45 && z > o.minZ - 0.45 && z < o.maxZ + 0.45);
  };
  for (const v of hiders) {
    if (!blockedAt(v.x, v.z)) continue;
    const r = Math.hypot(v.x - SX, v.z - SZ), a0 = Math.atan2(v.z - SZ, v.x - SX);
    search: for (let i = 1; i < 40; i++) for (const sg of [1, -1]) for (const dr of [0, -0.4, 0.4, 0.8]) {
      const a = a0 + sg * i * 0.03, rr = r + dr;
      const x = SX + Math.cos(a) * rr, z = SZ + Math.sin(a) * rr;
      if (!blockedAt(x, z)) { v.set(x, 0, z); break search; }
    }
  }
  return k.finish({
    id: "penguin", name: "Penguin Hotel",
    bounds,
    hunterSpawns: grid(0, 8.5, 9, 1.2),
    hiderSpawns: hiders,
    preview: { pos: [7.6, 6.4, 3.4], look: [-1.0, 3.0, -4.5], fov: 64 },
    lighting: {
      sky: "#101a33",
      hemi: ["#c9dcff", "#3a3024", 0.55],
      sun: { color: "#fff1dc", int: 2.2, pos: [8, 34, 10] },
      points: [
        { pos: [-3.6, 6.3, -5.6], color: "#ffe6bc", int: 26, dist: 16 },
        { pos: [3.6, 6.3, -5.6], color: "#ffe6bc", int: 26, dist: 16 },
        { pos: [0, 6.5, 1.2], color: "#ffe6bc", int: 30, dist: 18 },
        { pos: [0, 3.4, 9.6], color: "#ffe2b0", int: 16, dist: 14 },
        { pos: [-16.3, 3.0, 0], color: "#ffe6c4", int: 16, dist: 16 },
        { pos: [16.3, 3.0, 0], color: "#ffe6c4", int: 16, dist: 16 },
      ],
      exposure: 1.05,
      env: 0.45,
      hdri: "hall",
    },
  });
}
