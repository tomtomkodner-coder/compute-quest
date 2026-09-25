// Greece (ギリシャ): a Santorini-style hillside village on a caldera cliff at sunset.
// North → south: the cliff-edge promenade (white parapet over the sea, a blue-domed chapel with a bell tower, a café
// under a bougainvillea pergola, statues, benches, binoculars) → a row of white houses with blue doors, shutters,
// balconies and roof-top chimney clusters → the central plaza with a stepped circular pit (rim + tiers + a statue
// fountain), Greek columns and an olive tree → side quarters with lanes and sunset alley nooks → stair terraces up to
// an upper terrace with the big blue-domed church, more houses, a windmill, and a second terrace above. Beyond: the
// village climbing the hill, the caldera rim, the sea with sail boats, islands, and the Acropolis on the horizon.
// Hunters appear at the east end of the promenade (the path up from the old port).
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import * as T from "../textures";
import * as G from "./tex/greece";
import { Kit, type Mat, type World } from "./kit";

type Geo = THREE.BufferGeometry;
type V3t = [number, number, number];
type Inst = { pos: V3t; rotY?: number; rotX?: number; rotZ?: number; scale?: V3t; color?: string };
const V3 = THREE.Vector3;
const PI = Math.PI;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _one = new V3(1, 1, 1), _p = new V3();
function place(geo: Geo, x: number, y: number, z: number, ry = 0, rx = 0, rz = 0): Geo {
  _e.set(rx, ry, rz, "YXZ");
  _q.setFromEuler(_e);
  _p.set(x, y, z);
  _m4.compose(_p, _q, _one);
  geo.applyMatrix4(_m4);
  return geo;
}
/** world-space planar UVs (dominant normal axis) so merged plaster keeps a real-world texture scale */
function uvw(geo: Geo, unit = 2.5): Geo {
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
/** plain box, y = bottom */
const box = (w: number, h: number, d: number, x: number, y: number, z: number, ry = 0) => place(new THREE.BoxGeometry(w, h, d), x, y + h / 2, z, ry);
/** rounded box, y = bottom */
const rbox = (w: number, h: number, d: number, x: number, y: number, z: number, ry = 0, r = 0.06) =>
  place(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, Math.min(w, h, d) * 0.3)), x, y + h / 2, z, ry);
const cylG = (rt: number, rb: number, h: number, x: number, y: number, z: number, seg = 20, open = false) =>
  place(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), x, y + h / 2, z);
const latheG = (pts: [number, number][], seg = 24) => new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg);
function tubeG(pts: V3t[], r: number, seg = 10, rad = 8) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new V3(...p))), seg, r, rad, false);
}
/** fluted column shaft (vertices pushed in along 20 flutes) */
function fluted(rt: number, rb: number, h: number, flutes = 20) {
  const g = new THREE.CylinderGeometry(rt, rb, h, flutes * 3, 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z);
    if (r < 1e-4) continue;
    const a = Math.atan2(x, z);
    const f = 1 - 0.06 * (0.5 + 0.5 * Math.cos(a * flutes));
    p.setX(i, x * f);
    p.setZ(i, z * f);
  }
  g.computeVertexNormals();
  return g;
}
/** flat annular sector (normal up); angle a measured from +z towards +x */
function ringTop(ri: number, ro: number, y: number, a0: number, a1: number, seg: number): Geo {
  const pos: number[] = [], nor: number[] = [], uv: number[] = [];
  const P = (a: number, r: number) => { const x = r * Math.sin(a), z = r * Math.cos(a); pos.push(x, y, z); nor.push(0, 1, 0); uv.push(x / 2.5, z / 2.5); };
  for (let s = 0; s < seg; s++) {
    const aA = a0 + ((a1 - a0) * s) / seg, aB = a0 + ((a1 - a0) * (s + 1)) / seg;
    P(aA, ri); P(aA, ro); P(aB, ri);
    P(aA, ro); P(aB, ro); P(aB, ri);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  return g;
}
/** curved wall sector facing outwards (or inwards) */
function ringWall(r: number, y0: number, y1: number, a0: number, a1: number, seg: number, inward: boolean): Geo {
  const pos: number[] = [], nor: number[] = [], uv: number[] = [];
  const P = (a: number, y: number) => { const s = Math.sin(a), c = Math.cos(a); pos.push(r * s, y, r * c); nor.push(inward ? -s : s, 0, inward ? -c : c); uv.push((a * r) / 2.5, y / 2.5); };
  for (let s = 0; s < seg; s++) {
    const aA = a0 + ((a1 - a0) * s) / seg, aB = a0 + ((a1 - a0) * (s + 1)) / seg;
    if (!inward) { P(aA, y0); P(aB, y0); P(aA, y1); P(aB, y0); P(aB, y1); P(aA, y1); }
    else { P(aA, y0); P(aA, y1); P(aB, y0); P(aB, y0); P(aA, y1); P(aB, y1); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

/** flat convex polygon on the ground (normal up, world UVs) */
function flatPoly(pts: [number, number][], y: number, unit = 3): Geo {
  const pos: number[] = [], nor: number[] = [], uv: number[] = [];
  for (let i = 1; i < pts.length - 1; i++) {
    let a = pts[0], b = pts[i], c = pts[i + 1];
    const cy = (b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]);
    if (cy < 0) [b, c] = [c, b];
    for (const q of [a, b, c]) { pos.push(q[0], y, q[1]); nor.push(0, 1, 0); uv.push(q[0] / unit, q[1] / unit); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

class Batch {
  private m = new Map<Mat, Geo[]>();
  add(mat: Mat, g: Geo) {
    let a = this.m.get(mat);
    if (!a) this.m.set(mat, (a = []));
    a.push(g);
    return g;
  }
  flush(k: Kit, noShadow: Set<Mat>) {
    for (const [mat, gs] of this.m) if (gs.length) k.merged(gs, mat, { noShadow: noShadow.has(mat) });
    this.m.clear();
  }
}

type Face = 0 | 1 | 2 | 3; // 0 = south (+z), 1 = east (+x), 2 = north (-z), 3 = west (-x)
interface FaceT { cx: number; cz: number; rot: number; len: number; nx: number; nz: number; ux: number; uz: number }
function faceOf(x1: number, x2: number, z1: number, z2: number, f: Face): FaceT {
  const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
  if (f === 0) return { cx, cz: z2, rot: 0, len: x2 - x1, nx: 0, nz: 1, ux: 1, uz: 0 };
  if (f === 1) return { cx: x2, cz, rot: PI / 2, len: z2 - z1, nx: 1, nz: 0, ux: 0, uz: -1 };
  if (f === 2) return { cx, cz: z1, rot: PI, len: x2 - x1, nx: 0, nz: -1, ux: -1, uz: 0 };
  return { cx: x1, cz, rot: -PI / 2, len: z2 - z1, nx: -1, nz: 0, ux: 0, uz: 1 };
}
/** local (u along face, y, out of face) → world */
function onF(F: FaceT, geo: Geo, u: number, y: number, out: number) {
  geo.translate(u, y, out);
  return place(geo, F.cx, 0, F.cz, F.rot);
}

interface HouseOpt {
  y?: number; mat?: Mat; dome?: number; domeAt?: [number, number]; chim?: number; door?: Face[]; glow?: Face[]; balc?: Face;
  stair?: { f: Face; dir: 1 | -1 }; noWin?: Face[]; shut?: Mat; dr?: Mat; parapet?: boolean; gable?: Face; boug?: Face[]; cross?: boolean;
}

export function buildGreece(): World {
  const k = new Kit(6, 2.3);
  const B = new Batch();
  const R = rng(20260925);
  const rr = (a: number, b: number) => a + R() * (b - a);

  // ---------------- materials ----------------
  const tPl = k.tex("gr-plaster", () => G.plaster("#f4f1ea", 1));
  const mWhite = k.mat(tPl, "#ffffff", [1, 1], { roughness: 0.92, bump: 0.35 });
  const mCream = k.mat(tPl, "#f4e6c9", [1, 1], { roughness: 0.92, bump: 0.35 });
  const mOchre = k.mat(tPl, "#ecc690", [1, 1], { roughness: 0.92, bump: 0.35 });
  const mRose = k.mat(tPl, "#f0cfc2", [1, 1], { roughness: 0.92, bump: 0.35 });
  const mWarm = k.mat(tPl, "#e9e3d8", [1, 1], { roughness: 0.92, bump: 0.35 });
  const mBlue = k.mat(tPl, "#2f68d4", [1, 1], { roughness: 0.42, bump: 0.2 });
  const mBlueDeep = k.mat(tPl, "#2152b0", [1, 1], { roughness: 0.6, bump: 0.2 });
  const mFlag = k.mat(k.tex("gr-flag", () => G.flagstone(2, "#b3a795")), "#ffffff", [1, 1], { roughness: 0.88, bump: 0.8 });
  const mPebble = k.mat(k.tex("gr-peb", () => G.pebbles(3)), "#ffffff", [1, 1], { roughness: 0.8, bump: 1.0 });
  const mCap = k.mat(k.tex("gr-cap", () => T.noise("#d6cfc2", 0.1, 4, 1600)), "#ffffff", [1, 1], { roughness: 0.85, bump: 0.5 });
  const mShutter = k.mat(k.tex("gr-shut", () => G.shutter("#1f5fae", 4)), "#ffffff", [1, 1], { roughness: 0.6, bump: 0.5 });
  const mShutterT = k.mat(k.tex("gr-shut2", () => G.shutter("#1f8e9e", 5)), "#ffffff", [1, 1], { roughness: 0.6, bump: 0.5 });
  const mDoor = k.mat(k.tex("gr-door", () => G.door("#1f5fae", 5)), "#ffffff", [1, 1], { roughness: 0.6, bump: 0.5 });
  const mDoorT = k.mat(k.tex("gr-door2", () => G.door("#1d8a9c", 6)), "#ffffff", [1, 1], { roughness: 0.6, bump: 0.5 });
  const mDoorR = k.mat(k.tex("gr-door3", () => G.door("#8e2f24", 7)), "#ffffff", [1, 1], { roughness: 0.6, bump: 0.5 });
  const mGlass = k.mat(null, "#1a2230", [1, 1], { roughness: 0.12, metalness: 0.4 });
  const mGlowWin = k.mat(null, "#ffd49a", [1, 1], { emissive: "#ffb45c", emissiveIntensity: 1.2, roughness: 0.5 });
  const mDoorGlow = k.mat(k.tex("gr-dglow", G.doorGlow), "#ffffff", [1, 1], { emissive: "#ffffff", emissiveIntensity: 1.5, bump: 0 });
  const mRail = k.mat(null, "#1d4d9e", [1, 1], { roughness: 0.4, metalness: 0.6 });
  const mIron = k.mat(null, "#28282c", [1, 1], { roughness: 0.45, metalness: 0.7 });
  const mBrass = k.mat(null, "#c9a24c", [1, 1], { roughness: 0.3, metalness: 0.9 });
  const mLamp = k.mat(null, "#ffe2a8", [1, 1], { emissive: "#ffc46e", emissiveIntensity: 2.2 });
  const mWood = k.mat(k.tex("gr-wood", () => G.wood("#8a6a48", 14)), "#ffffff", [1, 1], { roughness: 0.8, bump: 0.9 });
  const mBark = k.mat(k.tex("gr-bark", () => G.wood("#5d4a36", 21)), "#ffffff", [1, 1], { roughness: 0.95, bump: 1.1 });
  const mMarble = k.mat(k.tex("gr-marble", () => T.marble("#efeae0", "#b9b1a2", 7)), "#ffffff", [1, 1], { roughness: 0.38, bump: 0.25 });
  const mGlaze = k.mat(k.tex("gr-glaze", () => G.glaze(23)), "#ffffff", [1, 1], { roughness: 0.28, bump: 0.3 });
  const mTerra = k.mat(k.tex("gr-terra", () => G.terracotta(15)), "#ffffff", [1, 1], { roughness: 0.85, bump: 0.5 });
  const mSoil = k.mat(null, "#4a3626", [1, 1], { roughness: 1 });
  const mLeaf = k.mat(k.tex("gr-leafc", () => G.leafCard(21)), "#ffffff", [1, 1], { transparent: true, roughness: 0.6 });
  const mBougC = k.mat(k.tex("gr-bougc", () => G.bougCard(22)), "#ffffff", [1, 1], { transparent: true, roughness: 0.7 });
  const mPetal = k.mat(null, "#d8288a", [1, 1], { roughness: 0.7 });
  const mCypress = k.mat(k.tex("gr-fol", () => G.foliage(13)), "#7d9a66", [1, 1], { roughness: 0.9, bump: 1.0 });
  const mCliff = k.mat(k.tex("gr-cliff", () => G.cliff(6)), "#ffffff", [1, 1], { roughness: 0.95, bump: 1.0 });
  const mSea = k.mat(k.tex("gr-sea", () => G.seaBright(24)), "#ffffff", [1, 1], { roughness: 0.2, metalness: 0.1, bump: 0.5 });
  const mRock = k.mat(k.tex("gr-rock", () => T.noise("#b6a58a", 0.16, 11, 2200)), "#ffffff", [1, 1], { roughness: 0.95, bump: 0.9 });
  const mFarRock = k.mat(null, "#8f8a86", [1, 1], { roughness: 1 });
  const mTemple = k.mat(null, "#eadcc3", [1, 1], { roughness: 0.7 });
  const mFarWhite = k.mat(null, "#f1ede6", [1, 1], { roughness: 0.9 });
  const mSail = k.mat(k.tex("gr-sail", G.sailcloth), "#ffffff", [1, 1], { roughness: 0.8, bump: 0.2 });
  const mHull = k.mat(null, "#f4f4f2", [1, 1], { roughness: 0.4 });
  const mCheck = k.mat(k.tex("gr-check", () => G.check("#2b6cb8", "#ffffff")), "#ffffff", [1, 1], { roughness: 0.85, bump: 0.2 });
  const mRush = k.mat(k.tex("gr-rush", G.rush), "#ffffff", [1, 1], { roughness: 0.9, bump: 0.8 });
  const mChair = k.mat(null, "#2a63b8", [1, 1], { roughness: 0.55 });
  const mCushion = k.mat(k.tex("gr-cush", () => T.noise("#2d63c2", 0.08, 5, 900)), "#ffffff", [1, 1], { roughness: 0.95, bump: 0.3 });
  const mBronze = k.mat(k.tex("gr-patina", G.patina), "#ffffff", [1, 1], { roughness: 0.4, metalness: 0.8, bump: 0.3 });
  const mThatch = k.mat(k.tex("gr-thatch", () => G.thatch(8)), "#ffffff", [1, 1], { roughness: 1, bump: 1.0 });
  const mWater = k.mat(null, "#3f8fc2", [1, 1], { roughness: 0.08, metalness: 0.3 });
  const mDark = k.mat(null, "#1b1714", [1, 1], { roughness: 1 });
  const mSignCafe = k.mat(k.tex("gr-signcafe", () => G.sign("#1f5fae", "#ffffff", "KAFENEIO", "since 1920")), "#ffffff", [1, 1], { roughness: 0.6, bump: 0 });
  const mSignTav = k.mat(k.tex("gr-signtav", () => G.sign("#f4efe4", "#1f5fae", "TAVERNA", "Oia")), "#ffffff", [1, 1], { roughness: 0.6, bump: 0 });
  const mMenu = k.mat(k.tex("gr-menu", G.menuBoard), "#ffffff", [1, 1], { roughness: 0.8, bump: 0 });
  const noShadow = new Set<Mat>([mSea, mFarRock, mTemple, mFarWhite, mGlass, mGlowWin, mDoorGlow, mPetal, mRock, mCliff]);

  const leaves: Inst[] = [];
  const bougs: Inst[] = [];
  const petals: Inst[] = [];

  // ---------------- small builders ----------------
  const colF = (F: FaceT, u0: number, u1: number, o0: number, o1: number, yb: number, yt: number, st = true) => {
    const xs = [u0, u1].flatMap((u) => [o0, o1].map((o) => F.cx + F.ux * u + F.nx * o));
    const zs = [u0, u1].flatMap((u) => [o0, o1].map((o) => F.cz + F.uz * u + F.nz * o));
    k.collider(Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs), yb, yt, st);
  };
  const leafBlob = (x: number, y: number, z: number, rx: number, ry: number, rz: number, n: number, s: number, color = "#ffffff") => {
    for (let i = 0; i < n; i++) {
      const u = R() * 2 - 1, v = R() * 2 - 1, w = R() * 2 - 1;
      if (u * u + v * v + w * w > 1) { i--; continue; }
      const sc = s * rr(0.75, 1.3);
      leaves.push({ pos: [x + u * rx, y + v * ry, z + w * rz], rotY: R() * PI * 2, rotX: rr(-0.9, 0.9), rotZ: rr(-0.6, 0.6), scale: [sc, sc, sc], color });
    }
  };
  const bougBlob = (x: number, y: number, z: number, rx: number, ry: number, rz: number, n: number, s = 1, petalsN = 12, groundY = 0) => {
    for (let i = 0; i < n; i++) {
      const u = R() * 2 - 1, v = R() * 2 - 1, w = R() * 2 - 1;
      if (u * u + v * v + w * w > 1) { i--; continue; }
      const sc = s * rr(0.7, 1.25);
      bougs.push({ pos: [x + u * rx, y + v * ry, z + w * rz], rotY: R() * PI * 2, rotX: rr(-1, 1), rotZ: rr(-0.7, 0.7), scale: [sc, sc, sc] });
    }
    for (let i = 0; i < petalsN; i++) {
      const a = R() * PI * 2, d = Math.sqrt(R()) * (rx + 0.8);
      petals.push({ pos: [x + Math.cos(a) * d, groundY + 0.012, z + Math.sin(a) * d], rotY: R() * PI, rotX: -PI / 2, scale: [rr(0.7, 1.3), 1, 1] });
    }
  };

  const potProfile: [number, number][] = [[0.01, 0], [0.25, 0], [0.3, 0.03], [0.4, 0.17], [0.47, 0.38], [0.48, 0.55], [0.43, 0.72], [0.34, 0.84], [0.31, 0.88], [0.36, 0.9], [0.4, 0.95], [0.38, 1.0], [0.31, 1.0], [0.29, 0.94]];
  function pot(x: number, z: number, s: number, y = 0, plant: "ficus" | "olive" | "boug" | "none" = "ficus", mat: Mat = mGlaze) {
    B.add(mat, place(latheG(potProfile.map(([r, h]) => [r * s, h * s]), 28), x, y, z, R() * 6));
    B.add(mSoil, place(new THREE.CircleGeometry(0.3 * s, 14).rotateX(-PI / 2), x, y + 0.93 * s, z));
    k.collider(x - 0.46 * s, x + 0.46 * s, z - 0.46 * s, z + 0.46 * s, y, y + s);
    if (plant === "ficus") {
      for (let i = 0; i < 3; i++) {
        const a = i * 2.1 + R();
        B.add(mBark, tubeG([[x, y + 0.9 * s, z], [x + Math.cos(a) * 0.1 * s, y + 1.5 * s, z + Math.sin(a) * 0.1 * s], [x + Math.cos(a) * 0.25 * s, y + 2.1 * s, z + Math.sin(a) * 0.25 * s]], 0.022 * s, 6, 5));
      }
      leafBlob(x, y + 1.95 * s, z, 0.62 * s, 0.55 * s, 0.62 * s, Math.round(46 * s), 0.46 * s);
      if (R() < 0.5) bougBlob(x + 0.2, y + 1.7 * s, z, 0.25, 0.25, 0.25, 4, 0.6, 3, y);
    } else if (plant === "olive") {
      B.add(mBark, tubeG([[x, y + 0.9 * s, z], [x + 0.05, y + 1.3 * s, z], [x - 0.05, y + 1.6 * s, z + 0.04]], 0.03 * s, 6, 5));
      leafBlob(x, y + 1.75 * s, z, 0.55 * s, 0.4 * s, 0.55 * s, Math.round(34 * s), 0.36 * s, "#b9c8a0");
    } else if (plant === "boug") {
      bougBlob(x, y + 1.35 * s, z, 0.55 * s, 0.4 * s, 0.55 * s, Math.round(30 * s), 0.5 * s, 10, y);
    }
  }
  function amphora(x: number, z: number, s: number, y = 0, ry = 0, tilt = 0) {
    const g = latheG([[0.01, 0], [0.08, 0], [0.12, 0.08], [0.22, 0.32], [0.23, 0.45], [0.18, 0.62], [0.08, 0.74], [0.07, 0.86], [0.1, 0.9], [0.09, 0.93], [0.06, 0.9]].map(([r, h]) => [r * s, h * s]), 20);
    B.add(mTerra, place(g, x, y, z, ry, 0, tilt));
    k.collider(x - 0.25 * s, x + 0.25 * s, z - 0.25 * s, z + 0.25 * s, y, y + 0.9 * s);
  }
  function statue(x: number, z: number, ry: number, y = 0, pose = 0) {
    B.add(mMarble, rbox(0.95, 0.14, 0.95, x, y, z, ry, 0.03));
    B.add(mMarble, rbox(0.78, 0.95, 0.78, x, y + 0.14, z, ry, 0.03));
    B.add(mMarble, rbox(0.95, 0.12, 0.95, x, y + 1.09, z, ry, 0.03));
    const b = y + 1.21;
    const parts: Geo[] = [];
    parts.push(place(new THREE.CylinderGeometry(0.075, 0.055, 0.86, 10), -0.1, 0.43, 0));
    parts.push(place(new THREE.CylinderGeometry(0.075, 0.055, 0.86, 10), 0.12, 0.44, 0.06, 0, 0.12, 0.08));
    parts.push(place(new THREE.BoxGeometry(0.1, 0.06, 0.24), -0.1, 0.03, 0.06), place(new THREE.BoxGeometry(0.1, 0.06, 0.24), 0.15, 0.03, 0.14));
    parts.push(place(new THREE.SphereGeometry(1, 14, 10).scale(0.19, 0.14, 0.13), 0, 0.92, 0));
    parts.push(place(latheG([[0.15, 0], [0.17, 0.12], [0.19, 0.3], [0.22, 0.43], [0.19, 0.5], [0.09, 0.56], [0.05, 0.6]], 14).scale(1, 1, 0.62), 0, 0.92, 0));
    parts.push(place(new THREE.CylinderGeometry(0.048, 0.055, 0.12, 10), 0, 1.52, 0));
    parts.push(place(new THREE.SphereGeometry(0.11, 14, 10).scale(0.9, 1.1, 1), 0, 1.66, 0.01));
    parts.push(tubeG([[-0.22, 1.39, 0], [-0.27, 1.12, 0.02], [-0.29, 0.86, 0.06]], 0.042, 8, 6));
    if (pose === 0) parts.push(tubeG([[0.22, 1.39, 0], [0.31, 1.55, 0.1], [0.13, 1.67, 0.15]], 0.042, 8, 6));
    else if (pose === 1) parts.push(tubeG([[0.22, 1.39, 0], [0.34, 1.16, -0.05], [0.2, 0.98, 0.04]], 0.042, 8, 6));
    else parts.push(tubeG([[0.22, 1.39, 0], [0.4, 1.62, 0.05], [0.46, 1.9, 0.08]], 0.042, 8, 6));
    for (const g of parts) B.add(mMarble, place(g, x, b, z, ry));
    k.collider(x - 0.48, x + 0.48, z - 0.48, z + 0.48, y, y + 1.21);
    k.collider(x - 0.3, x + 0.3, z - 0.3, z + 0.3, y + 1.21, y + 2.95);
  }
  function column(x: number, z: number, h: number, r = 0.3, y = 0, capital = true, mat: Mat = mMarble) {
    B.add(mat, place(latheG([[r * 1.4, 0], [r * 1.4, 0.12], [r * 1.25, 0.16], [r * 1.18, 0.24], [r * 1.03, 0.3], [0.01, 0.3]], 32), x, y, z));
    const sh = h - 0.3 - (capital ? 0.46 : 0);
    B.add(mat, place(fluted(r * 0.86, r, sh), x, y + 0.3 + sh / 2, z));
    if (capital) {
      B.add(mat, place(latheG([[r * 0.86, 0], [r * 0.95, 0.06], [r * 1.3, 0.2], [r * 1.36, 0.26], [0.01, 0.26]], 32), x, y + 0.3 + sh, z));
      B.add(mat, rbox(r * 2.9, 0.2, r * 2.9, x, y + h - 0.2, z, 0, 0.02));
    } else {
      B.add(mat, place(new THREE.CircleGeometry(r * 0.86, 24).rotateX(-PI / 2), x, y + 0.3 + sh, z));
    }
    const cr = capital ? r * 1.45 : r * 1.4;
    k.collider(x - cr, x + cr, z - cr, z + cr, y, y + h);
  }
  function drum(x: number, z: number, r: number, len: number, ry: number) {
    B.add(mMarble, place(fluted(r, r, len).rotateZ(PI / 2), x, r, z, ry));
    const ex = Math.abs(Math.cos(ry)) * len / 2 + r, ez = Math.abs(Math.sin(ry)) * len / 2 + r;
    k.collider(x - ex, x + ex, z - ez, z + ez, 0, 2 * r);
  }
  function bench(x: number, z: number, len: number, alongX: boolean, y = 0) {
    const w = alongX ? len : 0.52, d = alongX ? 0.52 : len;
    B.add(mWhite, uvw(rbox(w, 0.42, d, x, y, z, 0, 0.05)));
    B.add(mCushion, rbox(w - 0.08, 0.08, d - 0.08, x, y + 0.42, z, 0, 0.04));
    k.collider(x - w / 2, x + w / 2, z - d / 2, z + d / 2, y, y + 0.5);
  }
  function chair(x: number, z: number, ry: number, y = 0) {
    const parts: Geo[] = [];
    for (const [a, b] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) parts.push(box(0.04, 0.45, 0.04, a, 0, b));
    parts.push(box(0.04, 0.5, 0.04, -0.19, 0.45, 0.19), box(0.04, 0.5, 0.04, 0.19, 0.45, 0.19));
    parts.push(box(0.42, 0.06, 0.03, 0, 0.7, 0.19), box(0.42, 0.06, 0.03, 0, 0.88, 0.19));
    parts.push(box(0.42, 0.03, 0.03, 0, 0.18, -0.19), box(0.42, 0.03, 0.03, 0, 0.18, 0.19));
    for (const g of parts) B.add(mChair, place(g, x, y, z, ry));
    B.add(mRush, place(box(0.42, 0.05, 0.42, 0, 0.44, 0), x, y, z, ry));
    k.collider(x - 0.26, x + 0.26, z - 0.26, z + 0.26, y, y + 0.49);
  }
  function table(x: number, z: number, y = 0, chairs = 4) {
    B.add(mIron, cylG(0.24, 0.26, 0.04, x, y, z, 18));
    B.add(mIron, cylG(0.03, 0.03, 0.72, x, y, z, 8));
    B.add(mCheck, cylG(0.47, 0.5, 0.26, x, y + 0.5, z, 24, true));
    B.add(mCheck, place(new THREE.CircleGeometry(0.47, 24).rotateX(-PI / 2), x, y + 0.762, z));
    k.collider(x - 0.5, x + 0.5, z - 0.5, z + 0.5, y, y + 0.76);
    for (let i = 0; i < chairs; i++) {
      const a = (i / chairs) * PI * 2 + 0.4;
      chair(x + Math.sin(a) * 0.82, z + Math.cos(a) * 0.82, a + PI, y);
    }
  }
  function lampPost(x: number, z: number, y = 0) {
    B.add(mIron, cylG(0.12, 0.16, 0.3, x, y, z, 12));
    B.add(mIron, cylG(0.045, 0.055, 2.7, x, y, z, 10));
    B.add(mIron, place(new THREE.ConeGeometry(0.2, 0.18, 4), x, y + 3.3, z, PI / 4));
    B.add(mLamp, box(0.2, 0.3, 0.2, x, y + 2.92, z));
    B.add(mIron, box(0.26, 0.04, 0.26, x, y + 2.9, z));
    k.collider(x - 0.16, x + 0.16, z - 0.16, z + 0.16, y, y + 3.3, false);
  }
  function wallLamp(F: FaceT, u: number, y: number) {
    B.add(mIron, onF(F, new THREE.BoxGeometry(0.04, 0.04, 0.3), u, y + 0.35, 0.15));
    B.add(mLamp, onF(F, new THREE.BoxGeometry(0.16, 0.24, 0.16), u, y + 0.18, 0.3));
    B.add(mIron, onF(F, new THREE.ConeGeometry(0.14, 0.12, 4).rotateY(PI / 4), u, y + 0.36, 0.3));
  }
  function chimney(x: number, y: number, z: number, s: number, mw: Mat) {
    B.add(mw, uvw(rbox(0.46 * s, 0.9 * s, 0.46 * s, x, y, z, 0, 0.05)));
    B.add(mDark, box(0.3 * s, 0.16 * s, 0.3 * s, x, y + 0.9 * s, z));
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B.add(mw, box(0.07 * s, 0.17 * s, 0.07 * s, x + a * 0.19 * s, y + 0.9 * s, z + b * 0.19 * s));
    B.add(mw, uvw(rbox(0.62 * s, 0.08 * s, 0.62 * s, x, y + 1.07 * s, z, 0, 0.02)));
    B.add(mw, place(new THREE.ConeGeometry(0.34 * s, 0.26 * s, 4), x, y + 1.28 * s, z, PI / 4));
    k.collider(x - 0.31 * s, x + 0.31 * s, z - 0.31 * s, z + 0.31 * s, y, y + 1.15 * s);
  }
  function dome(x: number, y: number, z: number, r: number, cross = true, mat: Mat = mBlue) {
    B.add(mWhite, uvw(cylG(r * 1.02, r * 1.05, 0.55, x, y, z, 32)));
    B.add(mWhite, uvw(cylG(r * 1.09, r * 1.09, 0.12, x, y + 0.5, z, 32)));
    B.add(mat, place(new THREE.SphereGeometry(r, 32, 12, 0, PI * 2, 0, PI / 2), x, y + 0.6, z));
    // lantern + cross
    B.add(mWhite, cylG(r * 0.13, r * 0.15, r * 0.22, x, y + 0.6 + r * 0.96, z, 12));
    B.add(mat, place(new THREE.SphereGeometry(r * 0.14, 12, 6, 0, PI * 2, 0, PI / 2), x, y + 0.6 + r * 1.17, z));
    if (cross) {
      const cy = y + 0.6 + r * 1.3;
      B.add(mWhite, box(0.07, 0.62, 0.07, x, cy, z));
      B.add(mWhite, box(0.36, 0.07, 0.07, x, cy + 0.36, z));
    }
    k.collider(x - r * 0.75, x + r * 0.75, z - r * 0.75, z + r * 0.75, y, y + 0.6 + r * 0.66);
  }
  function bell(x: number, y: number, z: number, s = 1) {
    B.add(mBronze, place(latheG([[0.01, 0.36], [0.07, 0.36], [0.1, 0.3], [0.12, 0.12], [0.18, 0.02], [0.19, 0]].map(([r, h]) => [r * s, h * s]), 16), x, y - 0.36 * s, z));
    B.add(mIron, box(0.04, 0.12 * s, 0.04, x, y, z));
  }
  /** a white bell gable (campanile wall) with two arched openings, standing on a roof edge */
  function gable(F: FaceT, u: number, y: number, mw: Mat) {
    const w = 2.4, h = 2.6;
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h - 0.5); s.quadraticCurveTo(w / 2, h, 0, h + 0.25); s.quadraticCurveTo(-w / 2, h, -w / 2, h - 0.5); s.lineTo(-w / 2, 0);
    for (const cx of [-0.55, 0.55]) {
      const hole = new THREE.Path();
      hole.moveTo(cx - 0.32, 0.55); hole.lineTo(cx + 0.32, 0.55); hole.lineTo(cx + 0.32, 1.55); hole.absarc(cx, 1.55, 0.32, 0, PI, false); hole.lineTo(cx - 0.32, 0.55);
      s.holes.push(hole);
    }
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.36, bevelEnabled: false, curveSegments: 10 });
    g.translate(0, 0, -0.18);
    B.add(mw, uvw(onF(F, g, u, y, -0.25)));
    for (const cx of [-0.55, 0.55]) {
      const gb = latheG([[0.01, 0.36], [0.07, 0.36], [0.1, 0.3], [0.12, 0.12], [0.18, 0.02], [0.19, 0]], 16);
      B.add(mBronze, onF(F, gb, u + cx, y + 1.3, -0.25));
    }
    B.add(mWhite, onF(F, new THREE.BoxGeometry(0.06, 0.5, 0.06), u, y + h + 0.5, -0.25));
    B.add(mWhite, onF(F, new THREE.BoxGeometry(0.3, 0.06, 0.06), u, y + h + 0.62, -0.25));
    colF(F, u - w / 2, u + w / 2, -0.43, -0.07, y, y + h);
  }

  // ---------------- facades ----------------
  function windowAt(F: FaceT, yb: number, u: number, shut: Mat, mw: Mat) {
    const ww = 0.78, wh = 1.12;
    const glow = R() < 0.16;
    B.add(glow ? mGlowWin : mGlass, onF(F, new THREE.PlaneGeometry(ww, wh), u, yb + wh / 2, 0.012));
    B.add(mw, uvw(onF(F, new THREE.BoxGeometry(ww + 0.26, 0.1, 0.1), u, yb + wh + 0.05, 0.04)));
    B.add(mw, uvw(onF(F, new THREE.BoxGeometry(ww + 0.34, 0.07, 0.22), u, yb - 0.035, 0.1)));
    for (const sg of [-1, 1]) B.add(mw, uvw(onF(F, new THREE.BoxGeometry(0.1, wh, 0.1), u + sg * (ww / 2 + 0.05), yb + wh / 2, 0.04)));
    const style = R();
    if (style < 0.55) {
      // open shutters folded flat against the wall
      for (const sg of [-1, 1]) B.add(shut, onF(F, new THREE.BoxGeometry(ww / 2 + 0.02, wh, 0.035), u + sg * (ww / 2 + 0.1 + (ww / 2 + 0.02) / 2), yb + wh / 2, 0.03));
    } else if (style < 0.8) {
      // closed shutters in the recess
      for (const sg of [-1, 1]) B.add(shut, onF(F, new THREE.BoxGeometry(ww / 2 - 0.01, wh - 0.02, 0.035), u + sg * (ww / 4), yb + wh / 2, 0.03));
    } else {
      // painted muntins
      B.add(mRail, onF(F, new THREE.BoxGeometry(0.035, wh, 0.03), u, yb + wh / 2, 0.02));
      B.add(mRail, onF(F, new THREE.BoxGeometry(ww, 0.035, 0.03), u, yb + wh * 0.62, 0.02));
    }
  }
  const glowSpots: V3t[] = [];
  function doorAt(F: FaceT, y0: number, u: number, glow: boolean, dm: Mat, mw: Mat) {
    const dw = 1.2, dh = 2.3;
    if (glow) {
      B.add(mDoorGlow, onF(F, new THREE.PlaneGeometry(dw, dh), u, y0 + dh / 2, 0.012));
      // opened leaf folded against the wall
      B.add(dm, onF(F, new THREE.BoxGeometry(dw * 0.5, dh, 0.05), u + dw / 2 + 0.16 + dw * 0.25, y0 + dh / 2, 0.035));
      glowSpots.push([F.cx + F.ux * u + F.nx * 1.2, y0 + 1.8, F.cz + F.uz * u + F.nz * 1.2]);
    } else B.add(dm, onF(F, new THREE.BoxGeometry(dw, dh, 0.06), u, y0 + dh / 2, 0.02));
    for (const sg of [-1, 1]) B.add(mw, uvw(onF(F, new THREE.BoxGeometry(0.14, dh + 0.16, 0.13), u + sg * (dw / 2 + 0.07), y0 + (dh + 0.16) / 2, 0.05)));
    B.add(mw, uvw(onF(F, new THREE.BoxGeometry(dw + 0.44, 0.18, 0.15), u, y0 + dh + 0.09, 0.06)));
    B.add(mWarm, uvw(onF(F, new THREE.BoxGeometry(dw + 0.5, 0.12, 0.42), u, y0 + 0.06, 0.2)));
    if (R() < 0.6) wallLamp(F, u + dw / 2 + 0.4, y0 + 2.3);
  }
  function balcony(F: FaceT, y0: number, u: number, bw: number, mw: Mat, iron: boolean) {
    const yb = y0 + 2.8, dep = 1.05;
    B.add(mw, uvw(onF(F, new RoundedBoxGeometry(bw, 0.16, dep, 2, 0.03), u, yb + 0.08, dep / 2)));
    for (const sg of [-1, 1]) B.add(mw, uvw(onF(F, new THREE.BoxGeometry(0.16, 0.34, dep - 0.1), u + sg * (bw / 2 - 0.2), yb - 0.17, (dep - 0.1) / 2)));
    colF(F, u - bw / 2, u + bw / 2, 0, dep, yb, yb + 0.16);
    const top = yb + 0.16;
    if (iron) {
      const n = Math.round(bw / 0.16);
      for (let i = 0; i <= n; i++) B.add(mRail, onF(F, new THREE.BoxGeometry(0.025, 0.9, 0.025), u - bw / 2 + 0.05 + (i * (bw - 0.1)) / n, top + 0.45, dep - 0.06));
      for (const sg of [-1, 1]) for (let i = 1; i < 6; i++) B.add(mRail, onF(F, new THREE.BoxGeometry(0.025, 0.9, 0.025), u + sg * (bw / 2 - 0.05), top + 0.45, (i * (dep - 0.06)) / 6));
      B.add(mRail, onF(F, new THREE.BoxGeometry(bw, 0.05, 0.05), u, top + 0.92, dep - 0.06));
      B.add(mRail, onF(F, new THREE.BoxGeometry(bw, 0.03, 0.03), u, top + 0.1, dep - 0.06));
      for (const sg of [-1, 1]) B.add(mRail, onF(F, new THREE.BoxGeometry(0.05, 0.05, dep), u + sg * (bw / 2 - 0.05), top + 0.92, dep / 2));
    } else {
      B.add(mw, uvw(onF(F, new THREE.BoxGeometry(bw, 0.9, 0.14), u, top + 0.45, dep - 0.07)));
      for (const sg of [-1, 1]) B.add(mw, uvw(onF(F, new THREE.BoxGeometry(0.14, 0.9, dep - 0.14), u + sg * (bw / 2 - 0.07), top + 0.45, (dep - 0.14) / 2)));
      B.add(mCap, uvw(onF(F, new THREE.BoxGeometry(bw + 0.04, 0.05, 0.18), u, top + 0.9, dep - 0.07), 1.2));
    }
    colF(F, u - bw / 2, u + bw / 2, dep - 0.12, dep, top, top + 0.95, false);
    // french door onto the balcony
    B.add(R() < 0.5 ? mDoor : mDoorT, onF(F, new THREE.BoxGeometry(1.0, 1.9, 0.06), u, top + 0.95, 0.02));
    for (const sg of [-1, 1]) B.add(mw, uvw(onF(F, new THREE.BoxGeometry(0.12, 2.0, 0.12), u + sg * 0.56, top + 1.0, 0.05)));
    B.add(mw, uvw(onF(F, new THREE.BoxGeometry(1.36, 0.14, 0.14), u, top + 2.0, 0.06)));
    if (R() < 0.6) { pot(u * F.ux + F.cx + F.nx * 0.6 + F.ux * (bw / 2 - 0.35), F.cz + F.uz * u + F.nz * 0.6 + F.uz * (bw / 2 - 0.35), 0.45, top, "boug", mTerra); }
  }
  function stairs(F: FaceT, y0: number, h: number, dir: 1 | -1, mw: Mat) {
    const n = Math.ceil(h / 0.26), rise = h / n;
    const tr = Math.max(0.24, Math.min(0.3, (F.len - 0.5) / n));
    const us = -dir * (F.len / 2 - 0.2);
    for (let i = 1; i <= n; i++) {
      const ua = us + dir * (i - 1) * tr, ub = us + dir * i * tr;
      const top = y0 + rise * i;
      const g = onF(F, new THREE.BoxGeometry(tr, top - y0, 1.0), (ua + ub) / 2, (top + y0) / 2, 0.5);
      B.add(mw, uvw(g));
      B.add(mCap, uvw(onF(F, new THREE.BoxGeometry(tr + 0.01, 0.04, 1.02), (ua + ub) / 2, top - 0.015, 0.5), 1.2));
      colF(F, Math.min(ua, ub), Math.max(ua, ub), 0, 1.0, y0, top);
      B.add(mw, uvw(onF(F, new THREE.BoxGeometry(tr, top - y0 + 0.8, 0.14), (ua + ub) / 2, (top + 0.8 + y0) / 2, 1.07)));
    }
  }

  function house(x1: number, x2: number, z1: number, z2: number, h: number, o: HouseOpt = {}) {
    const y0 = o.y ?? 0, w = x2 - x1, d = z2 - z1, cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
    const mw = o.mat ?? mWhite;
    B.add(mw, uvw(rbox(w, h, d, cx, y0, cz, 0, 0.16)));
    k.collider(x1, x2, z1, z2, y0, y0 + h);
    const top = y0 + h;
    B.add(mw, uvw(box(w + 0.12, 0.14, d + 0.12, cx, top - 0.5, cz)));
    if (o.parapet !== false) {
      const t = 0.22, ph = 0.34;
      B.add(mw, uvw(box(w, ph, t, cx, top, z1 + t / 2)));
      B.add(mw, uvw(box(w, ph, t, cx, top, z2 - t / 2)));
      B.add(mw, uvw(box(t, ph, d - 2 * t, x1 + t / 2, top, cz)));
      B.add(mw, uvw(box(t, ph, d - 2 * t, x2 - t / 2, top, cz)));
      B.add(mCap, uvw(box(w + 0.02, 0.04, 0.26, cx, top + ph, z1 + 0.11), 1.2));
      B.add(mCap, uvw(box(w + 0.02, 0.04, 0.26, cx, top + ph, z2 - 0.11), 1.2));
    }
    const floors = h >= 5.5 ? 2 : 1;
    for (const f of [0, 1, 2, 3] as Face[]) {
      if (o.noWin?.includes(f)) continue;
      const F = faceOf(x1, x2, z1, z2, f);
      const n = Math.max(1, Math.floor((F.len - 0.6) / 2.4));
      const isDoor = !!(o.door?.includes(f) || o.glow?.includes(f));
      const doorSlot = isDoor ? Math.floor(n / 2) : -1;
      const hasBalc = o.balc === f && floors >= 2;
      const stairF = o.stair?.f === f;
      for (let fl = 0; fl < floors; fl++)
        for (let i = 0; i < n; i++) {
          const u = (i - (n - 1) / 2) * (F.len / n);
          if (fl === 0 && i === doorSlot) { doorAt(F, y0, u, !!o.glow?.includes(f), o.dr ?? mDoor, mw); continue; }
          if (stairF) continue;
          if (hasBalc && fl === 1 && Math.abs(u) < 1.6) continue;
          if (R() < 0.18) continue;
          windowAt(F, y0 + (fl ? 3.6 : 1.05), u, o.shut ?? mShutter, mw);
        }
      if (hasBalc) balcony(F, y0, 0, Math.min(3.0, F.len - 1.2), mw, R() < 0.6);
      if (stairF) stairs(F, y0, h, o.stair!.dir, mw);
      if (o.gable === f) gable(F, 0, top, mw);
      if (o.boug?.includes(f)) {
        const u = rr(-F.len / 3, F.len / 3);
        const px = F.cx + F.ux * u + F.nx * 0.35, pz = F.cz + F.uz * u + F.nz * 0.35;
        B.add(mBark, tubeG([[px, y0, pz], [px + F.ux * 0.2, y0 + 1.2, pz], [px - F.ux * 0.1, y0 + 2.2, pz], [px + F.ux * 0.4, y0 + Math.min(h, 3.2) - 0.1, pz]], 0.06, 12, 6));
        k.collider(px - 0.12, px + 0.12, pz - 0.12, pz + 0.12, y0, y0 + 2.2, false);
        const by = y0 + Math.min(h, 3.3) - 0.2;
        bougBlob(F.cx + F.ux * u + F.nx * 0.45, by, F.cz + F.uz * u + F.nz * 0.45, 1.1 * Math.abs(F.ux) + 0.45, 0.7, 1.1 * Math.abs(F.uz) + 0.45, 70, 0.62, 30, y0);
        bougBlob(F.cx + F.ux * (u + 0.5) + F.nx * 0.3, by - 0.9, F.cz + F.uz * (u + 0.5) + F.nz * 0.3, 0.45 * Math.abs(F.ux) + 0.3, 0.6, 0.45 * Math.abs(F.uz) + 0.3, 24, 0.55, 0, y0);
      }
    }
    // roof: dome, chimney cluster
    let dx = 0, dz = 0;
    if (o.dome) {
      [dx, dz] = o.domeAt ?? [0, 0];
      dome(cx + dx, top, cz + dz, o.dome, o.cross !== false);
    }
    const nc = o.chim ?? 0;
    for (let i = 0; i < nc; i++) {
      let px = 0, pz = 0;
      for (let t = 0; t < 12; t++) {
        px = cx + rr(-w / 2 + 0.7, w / 2 - 0.7);
        pz = cz + rr(-d / 2 + 0.7, d / 2 - 0.7);
        if (!o.dome || Math.hypot(px - cx - dx, pz - cz - dz) > o.dome + 0.9) break;
      }
      chimney(px, top, pz, rr(0.85, 1.25), mw);
      if (i === 0 && nc > 1) { chimney(px + 0.6, top, pz + rr(-0.2, 0.2), rr(0.7, 1.0), mw); i++; }
    }
  }
  /** background house (no collider, simple detail) */
  function farHouse(x: number, z: number, w: number, d: number, h: number, y: number, domeR = 0, mat: Mat = mFarWhite, seed = 0) {
    B.add(mat, box(w, h, d, x, y, z));
    B.add(mat, box(w + 0.1, 0.12, d + 0.1, x, y + h - 0.45, z));
    const nWin = Math.max(1, Math.floor(w / 2.4));
    for (let i = 0; i < nWin; i++) {
      const u = x - w / 2 + (i + 0.5) * (w / nWin);
      if ((i + seed) % 3 === 1) B.add(R() < 0.5 ? mDoor : mShutter, box(0.9, 1.9, 0.05, u, y, z - d / 2 - 0.02));
      else B.add(R() < 0.12 ? mGlowWin : mGlass, place(new THREE.PlaneGeometry(0.75, 1.0), u, y + h * 0.5, z - d / 2 - 0.01, PI));
    }
    const nW2 = Math.max(1, Math.floor(d / 2.6));
    for (let i = 0; i < nW2; i++) {
      const v = z - d / 2 + (i + 0.5) * (d / nW2);
      B.add(mGlass, place(new THREE.PlaneGeometry(0.75, 1.0), x - w / 2 - 0.01, y + h * 0.5, v, -PI / 2));
      B.add(mGlass, place(new THREE.PlaneGeometry(0.75, 1.0), x + w / 2 + 0.01, y + h * 0.5, v, PI / 2));
    }
    if (domeR) {
      B.add(mFarWhite, cylG(domeR, domeR, 0.5, x, y + h, z, 20));
      B.add(mBlue, place(new THREE.SphereGeometry(domeR, 20, 8, 0, PI * 2, 0, PI / 2), x, y + h + 0.5, z));
    }
  }

  // =====================================================================
  // GROUND, TERRACES, CLIFF
  // =====================================================================
  const EDGE = -30.45; // cliff edge (north)
  B.add(mFlag, uvw(box(124, 0.2, 12 - EDGE + 0.4, 0, -0.2, (12 + EDGE) / 2 - 0.2), 3));
  // L1 terrace (y 2.4) and L2 terrace (y 4.8)
  const L1 = 2.4, L2 = 4.8;
  B.add(mWarm, uvw(box(124, L1, 24, 0, 0, 24)));
  B.add(mFlag, uvw(place(new THREE.PlaneGeometry(124, 24).rotateX(-PI / 2), 0, L1 + 0.004, 24), 3));
  k.collider(-62, 62, 12, 36, 0, L1);
  for (const [a, b] of [[-62, -5], [5, 62]]) {
    B.add(mWarm, uvw(box(b - a, L2, 13, (a + b) / 2, 0, 29.5)));
    B.add(mFlag, uvw(place(new THREE.PlaneGeometry(b - a, 13).rotateX(-PI / 2), (a + b) / 2, L2 + 0.004, 29.5), 3));
    k.collider(a, b, 23, 36, 0, L2);
  }
  // stone plinth course along retaining walls
  B.add(mCap, uvw(box(124, 0.35, 0.12, 0, 0, 11.98), 1.5));
  // parapets on the terrace edges with stair openings
  function parapetX(z: number, x1: number, x2: number, y: number, gaps: number[], hgt = 0.9) {
    const cuts = [x1, ...gaps.flatMap((g) => [g - 1.62, g + 1.62]), x2];
    for (let i = 0; i < cuts.length; i += 2) {
      const a = cuts[i], b = cuts[i + 1];
      if (b - a < 0.1) continue;
      B.add(mWhite, uvw(box(b - a, hgt, 0.3, (a + b) / 2, y, z)));
      B.add(mCap, uvw(box(b - a + 0.04, 0.05, 0.36, (a + b) / 2, y + hgt, z), 1.2));
      k.collider(a, b, z - 0.15, z + 0.15, y, y + hgt + 0.05);
    }
  }
  parapetX(12.15, -40, 40, L1, [-24, 0, 24]);
  parapetX(23.15, -40, -5, L2, [-8]);
  parapetX(23.15, 5, 40, L2, [8]);
  // stairs L0 → L1 and L1 → L2
  function flight(xc: number, zTop: number, yBase: number, n: number, rise: number, tread: number, width: number) {
    for (let i = 1; i <= n; i++) {
      const z0 = zTop - (n + 1 - i) * tread;
      const top = yBase + rise * i;
      B.add(mWarm, uvw(box(width, top - yBase, zTop - z0, xc, yBase, (z0 + zTop) / 2)));
      B.add(mCap, uvw(box(width + 0.01, 0.04, tread + 0.02, xc, top - 0.03, z0 + tread / 2), 1.2));
      k.collider(xc - width / 2, xc + width / 2, z0, zTop, yBase, top);
    }
    const zb = zTop - n * tread;
    for (const sg of [-1, 1]) {
      const x = xc + sg * (width / 2 + 0.14);
      for (let i = 1; i <= n; i++) {
        const z0 = zTop - (n + 1 - i) * tread;
        const top = yBase + rise * i + 0.85;
        B.add(mWhite, uvw(box(0.28, top - yBase, tread, x, yBase, z0 + tread / 2)));
        k.collider(x - 0.14, x + 0.14, z0, z0 + tread, yBase, top);
      }
      B.add(mWhite, uvw(rbox(0.4, 1.1, 0.4, x, yBase, zb - 0.2, 0, 0.05)));
      k.collider(x - 0.2, x + 0.2, zb - 0.4, zb, yBase, yBase + 1.1);
      pot(x, zb - 0.95, 0.75, yBase, R() < 0.5 ? "ficus" : "boug");
    }
  }
  flight(-24, 12, 0, 8, 0.3, 0.35, 3.2);
  flight(0, 12, 0, 8, 0.3, 0.35, 3.6);
  flight(24, 12, 0, 8, 0.3, 0.35, 3.2);
  flight(-8, 23, L1, 8, 0.3, 0.33, 3.0);
  flight(8, 23, L1, 8, 0.3, 0.33, 3.0);

  // cliff-edge parapet (north)
  B.add(mWhite, uvw(box(70, 1.0, 0.5, 0, 0, -30.0)));
  B.add(mCap, uvw(box(70.04, 0.06, 0.6, 0, 1.0, -30.0), 1.2));
  k.collider(-35, 35, -30.25, -29.75, 0, 1.06);

  // cliff face down to the sea, curving away as the caldera rim
  const SEA = -19;
  const zEdge = (x: number) => EDGE - Math.pow(Math.max(0, Math.abs(x) - 36), 2) / 45;
  {
    const nx = 90, ny = 10, pos: number[] = [], uv: number[] = [];
    const rowPts: V3t[][] = [];
    for (let j = 0; j <= ny; j++) {
      const row: V3t[] = [];
      const t = j / ny;
      for (let i = 0; i <= nx; i++) {
        const x = -170 + (340 * i) / nx;
        const ze = zEdge(x);
        const n = Math.sin(x * 0.37 + j * 1.7) * 1.2 + Math.sin(x * 0.11 - j) * 2.0;
        const y = j === 0 ? 0.02 : -((SEA + 1) * -1) * Math.pow(t, 1.15) + Math.sin(x * 0.5 + j) * 0.4;
        const z = ze - (j === 0 ? 0 : 1.5 + 11 * Math.pow(t, 0.8) + n * t);
        row.push([x, j === ny ? SEA - 1 : y, z]);
      }
      rowPts.push(row);
    }
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const a = rowPts[j][i], b = rowPts[j][i + 1], c = rowPts[j + 1][i], d = rowPts[j + 1][i + 1];
        for (const p of [a, b, c, b, d, c]) { pos.push(...p); uv.push(p[0] / 9, p[1] / 9); }
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    B.add(mCliff, g);
    // cliff-top ground outside the playable strip (caldera rim both sides)
    for (const sg of [-1, 1]) {
      for (let x = 34; x < 170; x += 8) {
        const x1 = x + 8;
        B.add(mFlag, flatPoly([[sg * x, zEdge(x)], [sg * x1, zEdge(x1)], [sg * x1, EDGE + 0.2], [sg * x, EDGE + 0.2]], -0.004));
      }
      B.add(mFlag, flatPoly([[sg * 62, EDGE], [sg * 170, EDGE], [sg * 170, 40], [sg * 62, 40]], 0.0));
    }
  }
  // sea, islands, boats
  {
    const sea = place(new THREE.CircleGeometry(230, 48).rotateX(-PI / 2), 0, SEA, -40);
    const uv = sea.attributes.uv, p = sea.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 7, p.getZ(i) / 7);
    B.add(mSea, sea);
    const isle = (x: number, z: number, sx: number, sy: number, sz: number, m: Mat) => B.add(m, place(new THREE.SphereGeometry(1, 28, 10, 0, PI * 2, 0, PI / 2).scale(sx, sy, sz), x, SEA - 0.5, z));
    isle(-60, -120, 38, 9, 22, mFarRock); // Nea Kameni
    isle(-130, -150, 60, 22, 30, mFarRock);
    isle(-10, -185, 70, 16, 18, mFarRock);
    isle(120, -150, 40, 12, 22, mFarRock);
    const boat = (x: number, z: number, s: number, ry: number) => {
      const hs = new THREE.Shape();
      hs.moveTo(-3 * s, -0.9 * s); hs.lineTo(2.2 * s, -0.9 * s); hs.quadraticCurveTo(3.4 * s, -0.5 * s, 3.6 * s, 0); hs.quadraticCurveTo(3.4 * s, 0.5 * s, 2.2 * s, 0.9 * s); hs.lineTo(-3 * s, 0.9 * s); hs.lineTo(-3 * s, -0.9 * s);
      const hull = new THREE.ExtrudeGeometry(hs, { depth: 0.9 * s, bevelEnabled: false, curveSegments: 6 }).rotateX(-PI / 2);
      B.add(mHull, place(hull, x, SEA - 0.3, z, ry));
      B.add(mHull, place(new THREE.CylinderGeometry(0.06 * s, 0.08 * s, 8 * s, 6), 0.4 * s, SEA + 4 * s, 0, 0).applyMatrix4(new THREE.Matrix4().makeRotationY(ry)).translate(x, 0, z));
      const ss = new THREE.Shape();
      ss.moveTo(0, 0); ss.lineTo(2.6 * s, 0); ss.lineTo(0, 7 * s); ss.lineTo(0, 0);
      const sail = new THREE.ShapeGeometry(ss);
      B.add(mSail, place(sail, 0.5 * s, SEA + 1.2 * s, 0).applyMatrix4(new THREE.Matrix4().makeRotationY(ry)).translate(x, 0, z));
      const s2 = new THREE.ShapeGeometry(ss).rotateY(PI);
      B.add(mSail, place(s2, 0.5 * s, SEA + 1.2 * s, 0).applyMatrix4(new THREE.Matrix4().makeRotationY(ry)).translate(x, 0, z));
    };
    boat(-22, -75, 1.0, 0.4);
    boat(-42, -110, 1.1, -0.3);
    boat(12, -62, 0.9, 1.2);
    boat(40, -95, 1.0, 2.6);
    boat(-80, -95, 1.2, 0.9);
  }
  // Acropolis on its rock across the water (north-east)
  {
    const AX = 58, AZ = -168, TOP = 11;
    const hill = new THREE.SphereGeometry(1, 40, 18, 0, PI * 2, 0, PI / 2).scale(62, 34, 44);
    const p = hill.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      let y = p.getY(i) + Math.sin(x * 0.21) * 1.5 + Math.cos(z * 0.3) * 1.2;
      y = Math.min(y, TOP - SEA);
      p.setY(i, y);
    }
    hill.computeVertexNormals();
    const uvh = hill.attributes.uv;
    for (let i = 0; i < uvh.count; i++) uvh.setXY(i, p.getX(i) / 6, p.getY(i) / 6);
    B.add(mRock, place(hill, AX, SEA, AZ));
    // fortification wall
    B.add(mTemple, box(56, 6, 2, AX, TOP - 5.5, AZ + 17));
    B.add(mTemple, box(2, 6, 30, AX - 27, TOP - 5.5, AZ + 3));
    B.add(mTemple, box(2, 6, 30, AX + 27, TOP - 5.5, AZ + 3));
    // Parthenon
    const PX = AX + 6, PZ = AZ + 2, pw = 34, pd = 15;
    for (let s = 0; s < 3; s++) B.add(mTemple, box(pw + 2 - s * 0.8, 0.4, pd + 2 - s * 0.8, PX, TOP + s * 0.4, PZ));
    const cb = TOP + 1.2, ch = 5.2;
    const cols: Inst[] = [];
    for (let i = 0; i < 17; i++) for (const zz of [-pd / 2 + 0.6, pd / 2 - 0.6]) cols.push({ pos: [PX - pw / 2 + 0.6 + (i * (pw - 1.2)) / 16, cb + ch / 2, PZ + zz] });
    for (let i = 1; i < 7; i++) for (const xx of [-pw / 2 + 0.6, pw / 2 - 0.6]) cols.push({ pos: [PX + xx, cb + ch / 2, PZ - pd / 2 + 0.6 + (i * (pd - 1.2)) / 7] });
    // Erechtheion + Propylaea colonnades
    for (let i = 0; i < 6; i++) cols.push({ pos: [AX - 14 + i * 1.6, TOP + 0.4 + 2, AZ - 4], scale: [0.8, 0.77, 0.8] });
    for (let i = 0; i < 6; i++) cols.push({ pos: [AX - 22, TOP + 0.4 + 2, AZ + 2 + i * 1.8], scale: [0.8, 0.77, 0.8] });
    k.instances(new THREE.CylinderGeometry(0.42, 0.5, ch, 12), mTemple, cols, { noShadow: true });
    B.add(mTemple, box(pw, 1.5, pd, PX, cb + ch, PZ));
    const ped = new THREE.Shape();
    ped.moveTo(-pd / 2, 0); ped.lineTo(pd / 2, 0); ped.lineTo(0, 1.9); ped.lineTo(-pd / 2, 0);
    for (const sx of [-1, 1]) B.add(mTemple, place(new THREE.ExtrudeGeometry(ped, { depth: 0.6, bevelEnabled: false }), PX + sx * (pw / 2 - 0.3), cb + ch + 1.5, PZ, PI / 2));
    B.add(mTemple, box(pw * 0.55, 1.2, pd * 0.7, PX + 3, cb + ch + 1.5, PZ));
    B.add(mTemple, box(10, 3.6, 5, AX - 10, TOP, AZ - 7));
    B.add(mTemple, box(9, 1, 5.5, AX - 10, TOP + 4.2, AZ - 3.5));
    B.add(mTemple, box(3, 4.4, 12, AX - 22, TOP, AZ + 6.5));
    // city on the lower slopes + cypresses
    const town: Inst[] = [];
    for (let i = 0; i < 90; i++) {
      const a = rr(-PI * 0.95, PI * 0.95), rad = rr(0.78, 1.05);
      const x = AX + Math.sin(a) * 62 * rad * 1.05, z = AZ + Math.cos(a) * 44 * rad * 1.05;
      if (z < AZ - 10) continue;
      const hy = SEA + Math.max(0, 34 * Math.sqrt(Math.max(0, 1 - rad * rad * 0.9))) * 0.5;
      town.push({ pos: [x, hy + 1.5, z], rotY: rr(-0.3, 0.3), scale: [rr(3, 7), rr(3, 6), rr(3, 6)] });
    }
    k.instances(new THREE.BoxGeometry(1, 1, 1), mFarWhite, town, { noShadow: true });
    const cyp: Inst[] = [];
    for (let i = 0; i < 24; i++) {
      const a = rr(-1.4, 1.4), rad = rr(0.45, 0.75);
      cyp.push({ pos: [AX + Math.sin(a) * 62 * rad, SEA + 34 * Math.sqrt(1 - rad * rad) - 1, AZ + Math.cos(a) * 44 * rad], scale: [1, rr(0.8, 1.3), 1] });
    }
    k.instances(latheG([[0.01, 0], [0.9, 0.5], [1.1, 2.5], [0.8, 5], [0.3, 7.2], [0.01, 8]], 8), mCypress, cyp, { noShadow: true });
  }

  // =====================================================================
  // PROMENADE (north, y 0)
  // =====================================================================
  // chapel with the big blue dome and a bell tower at the cliff corner
  house(-34.2, -27.4, -29.75, -23.5, 5.0, { dome: 2.3, door: [], glow: [0, 1], noWin: [2, 3], chim: 0 });
  {
    // bell tower
    const tx1 = -27.4, tx2 = -25.2, tz1 = -26.2, tz2 = -23.5;
    B.add(mWhite, uvw(rbox(tx2 - tx1, 6.0, tz2 - tz1, (tx1 + tx2) / 2, 0, (tz1 + tz2) / 2, 0, 0.1)));
    k.collider(tx1, tx2, tz1, tz2, 0, 6.0);
    const bx = (tx1 + tx2) / 2, bz = (tz1 + tz2) / 2;
    for (const [dx, dz] of [[-0.85, -1.15], [0.85, -1.15], [-0.85, 1.15], [0.85, 1.15]]) B.add(mWhite, uvw(rbox(0.4, 2.1, 0.4, bx + dx, 6.0, bz + dz, 0, 0.05)));
    B.add(mWhite, uvw(rbox(tx2 - tx1 + 0.2, 0.3, tz2 - tz1 + 0.2, bx, 8.1, bz, 0, 0.05)));
    bell(bx, 7.7, bz, 1.6);
    dome(bx, 8.4, bz, 0.95, true);
    k.collider(tx1, tx2, tz1, tz2, 6.0, 8.4);
    for (const f of [0, 2] as Face[]) windowAt(faceOf(tx1, tx2, tz1, tz2, f), 3.4, 0, mShutter, mWhite);
  }
  // church forecourt props
  pot(-33.0, -22.3, 1.0, 0, "ficus");
  bench(-28.0, -21.3, 2.0, true);
  statue(-24.6, -28.9, PI + 0.5, 0, 0); // looking out to sea
  bench(-21.5, -29.2, 2.2, true);
  pot(-19.2, -29.15, 1.15, 0, "ficus");
  // binoculars
  {
    const x = -16.8, z = -29.1;
    B.add(mIron, cylG(0.08, 0.12, 1.1, x, 0, z, 12));
    B.add(mRail, place(new THREE.CylinderGeometry(0.11, 0.11, 0.42, 14).rotateX(PI / 2), x - 0.09, 1.28, z, 0));
    B.add(mRail, place(new THREE.CylinderGeometry(0.11, 0.11, 0.42, 14).rotateX(PI / 2), x + 0.09, 1.28, z, 0));
    B.add(mIron, box(0.3, 0.16, 0.22, x, 1.08, z));
    k.collider(x - 0.25, x + 0.25, z - 0.25, z + 0.25, 0, 1.4, false);
  }
  column(-13.6, -29.15, 3.2, 0.3, 0, true);
  pot(-11.6, -29.15, 0.9, 0, "boug");
  statue(4.0, -28.95, PI - 0.3, 0, 2);
  pot(2.0, -29.1, 1.2, 0, "ficus");
  pot(6.2, -29.15, 0.8, 0, "olive");
  bench(9.2, -29.2, 2.2, true);
  column(12.0, -29.15, 3.2, 0.3, 0, true);
  // café under a bougainvillea pergola (east promenade)
  {
    const x1 = 14.0, x2 = 23.6, z1 = -29.4, z2 = -23.4;
    const posts: [number, number][] = [];
    for (const x of [x1, (x1 + x2) / 2, x2]) for (const z of [z1, z2]) posts.push([x, z]);
    for (const [x, z] of posts) {
      B.add(mWhite, uvw(rbox(0.36, 2.7, 0.36, x, 0, z, 0, 0.05)));
      k.collider(x - 0.18, x + 0.18, z - 0.18, z + 0.18, 0, 2.7, false);
    }
    for (const z of [z1, z2]) B.add(mWood, box(x2 - x1 + 0.6, 0.18, 0.16, (x1 + x2) / 2, 2.7, z));
    for (let x = x1 - 0.2; x <= x2 + 0.2; x += 0.55) B.add(mWood, box(0.08, 0.1, z2 - z1 + 0.6, x, 2.88, (z1 + z2) / 2));
    k.collider(x1 - 0.3, x2 + 0.3, z1 - 0.3, z2 + 0.3, 2.7, 2.98);
    for (let i = 0; i < 6; i++) bougBlob(rr(x1, x2), 3.05, rr(z1, z2), 1.4, 0.35, 1.2, 40, 0.65, 22, 0);
    B.add(mBark, tubeG([[x2 + 0.3, 0, z2 - 0.2], [x2 + 0.1, 1.2, z2 - 0.1], [x2 + 0.25, 2.2, z2 - 0.3], [x2 - 0.2, 2.95, z2 - 0.6]], 0.07, 12, 6));
    for (const [x, z] of [[16.0, -27.6], [19.0, -27.9], [21.9, -27.4], [16.9, -25.0], [20.4, -25.1]]) table(x, z, 0, R() < 0.5 ? 3 : 4);
    // menu board
    B.add(mWood, place(new THREE.BoxGeometry(0.7, 1.1, 0.05), 13.6, 0.95, -23.2, 0.2, -0.12));
    B.add(mMenu, place(new THREE.PlaneGeometry(0.62, 1.0), 13.6, 0.95, -23.17, 0.2, -0.12));
    k.collider(13.2, 14.0, -23.5, -22.9, 0, 1.5, false);
  }
  lampPost(-8.0, -29.2);
  lampPost(26.5, -29.2);
  pot(28.4, -29.1, 1.0, 0, "ficus");
  bench(31.3, -29.2, 2.0, true);
  // east entrance: arch gate towards the old-port stair
  {
    const ax = 33.9;
    B.add(mWhite, uvw(rbox(0.6, 3.6, 1.0, ax, 0, -29.3, 0, 0.05)));
    B.add(mWhite, uvw(rbox(0.6, 3.6, 1.0, ax, 0, -21.6, 0, 0.05)));
    const s = new THREE.Shape();
    s.moveTo(-4.4, 0); s.lineTo(-3.4, 0); s.quadraticCurveTo(-3.4, 0.9, 0, 1.0); s.quadraticCurveTo(3.4, 0.9, 3.4, 0); s.lineTo(4.4, 0); s.lineTo(4.4, 1.3); s.lineTo(-4.4, 1.3); s.lineTo(-4.4, 0);
    B.add(mWhite, uvw(place(new THREE.ExtrudeGeometry(s, { depth: 0.6, bevelEnabled: false, curveSegments: 10 }).translate(0, 0, -0.3), ax, 3.6, -25.45, PI / 2)));
    gable(faceOf(ax - 0.3, ax + 0.3, -29.8, -21.1, 1), 0, 4.9, mWhite);
    k.collider(ax - 0.3, ax + 0.3, -29.8, -28.8, 0, 4.9);
    k.collider(ax - 0.3, ax + 0.3, -22.1, -21.1, 0, 4.9);
    k.collider(ax - 0.3, ax + 0.3, -28.8, -22.1, 3.6, 4.9);
    // stair descending towards the port (outside the play area)
    for (let i = 1; i <= 12; i++) B.add(mWarm, uvw(box(0.4, 0.3, 6.6, ax + 0.1 + i * 0.4, -0.3 * i, -25.45)));
    farHouse(40.5, -25.5, 5, 8, 4, -3.6, 0, mFarWhite, 1);
  }

  // =====================================================================
  // ROW A: houses along the promenade (z -21 … -14)
  // =====================================================================
  house(-30, -24.5, -21, -14.5, 6.2, { dome: 1.5, chim: 0, door: [2], balc: 3, noWin: [], boug: [2] });
  house(-21.5, -14.5, -21, -15, 3.4, { chim: 3, glow: [2], stair: { f: 2, dir: 1 }, mat: mCream, dr: mDoorT, shut: mShutterT });
  house(-11.5, -4.5, -21, -14, 6.2, { chim: 2, glow: [2], balc: 3, boug: [1] });
  house(4.5, 11.5, -21, -14, 4.0, { dome: 1.8, glow: [3], gable: 2, noWin: [] });
  house(14.5, 21.5, -21, -15, 6.6, { chim: 3, door: [2], balc: 3, mat: mWhite, dr: mDoorR });
  house(24.5, 30, -21, -14.5, 3.6, { chim: 2, glow: [3], stair: { f: 2, dir: 1 }, mat: mOchre });
  // café sign on the pergola house, taverna sign
  B.add(mSignCafe, place(new THREE.PlaneGeometry(2.0, 0.75), 18.0, 5.2, -21.02, PI));
  B.add(mSignTav, place(new THREE.PlaneGeometry(1.8, 0.68), -8.0, 5.0, -21.02, PI));
  // alley props (keep one side of each alley clear)
  pot(-22.1, -18.0, 0.8, 0, "boug");
  amphora(-24.0, -15.4, 1.0, 0, 0, 0.0);
  pot(-12.0, -19.8, 0.7, 0, "ficus", mTerra);
  bench(12.0, -17.5, 1.8, false);
  pot(22.0, -16.0, 0.9, 0, "ficus");
  pot(33.0, -18.0, 1.0, 0, "olive");
  // the main lane (x -4.5 … 4.5): stepped planter terraces + a stone arch
  {
    for (const sx of [-1, 1]) {
      const x = sx * 3.55;
      B.add(mWhite, uvw(rbox(1.8, 0.4, 3.2, x, 0, -18.2, 0, 0.05)));
      B.add(mWhite, uvw(rbox(1.1, 0.8, 1.6, x + sx * 0.35, 0, -19.0, 0, 0.05)));
      k.collider(x - 0.9, x + 0.9, -19.8, -16.6, 0, 0.4);
      k.collider(x + sx * 0.35 - 0.55, x + sx * 0.35 + 0.55, -19.8, -18.2, 0, 0.8);
      pot(x + sx * 0.35, -19.0, 0.7, 0.8, sx < 0 ? "boug" : "ficus", mTerra);
      pot(x - sx * 0.2, -17.2, 0.55, 0.4, "olive", mGlaze);
    }
    // arch over the lane
    const s = new THREE.Shape();
    s.moveTo(-4.5, 0); s.lineTo(-3.4, 0); s.lineTo(-3.4, 2.4); s.quadraticCurveTo(-3.2, 3.4, 0, 3.45); s.quadraticCurveTo(3.2, 3.4, 3.4, 2.4); s.lineTo(3.4, 0); s.lineTo(4.5, 0); s.lineTo(4.5, 3.9); s.lineTo(-4.5, 3.9); s.lineTo(-4.5, 0);
    B.add(mWhite, uvw(place(new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: false, curveSegments: 12 }).translate(0, 0, -0.25), 0, 0, -14.3)));
    k.collider(-4.5, -3.4, -14.55, -14.05, 0, 3.9);
    k.collider(3.4, 4.5, -14.55, -14.05, 0, 3.9);
    k.collider(-3.4, 3.4, -14.55, -14.05, 3.2, 3.9);
    bell(0, 3.3, -14.3, 1.0);
    bougBlob(-3.6, 3.9, -14.3, 1.2, 0.45, 0.6, 50, 0.6, 20, 0);
  }

  // =====================================================================
  // CENTRAL PLAZA with the stepped pit
  // =====================================================================
  const PCX = 0, PCZ = -1.5;
  B.add(mPebble, uvw(place(new THREE.PlaneGeometry(26, 20).rotateX(-PI / 2), 0, 0.006, -1.0), 4));
  // white painted border
  for (const [w, d, x, z] of [[26.3, 0.15, 0, -11.07], [26.3, 0.15, 0, 9.07], [0.15, 20.3, -13.07, -1], [0.15, 20.3, 13.07, -1]] as [number, number, number, number][])
    B.add(mWarm, box(w, 0.02, d, x, 0, z));
  {
    const bands = [{ ri: 6.6, ro: 7.2, h: 0.4 }, { ri: 6.0, ro: 6.6, h: 0.8 }, { ri: 5.2, ro: 6.0, h: 1.2 }, { ri: 4.6, ro: 5.2, h: 0.8 }, { ri: 4.0, ro: 4.6, h: 0.4 }];
    const gap = 0.33, a0 = gap, a1 = PI * 2 - gap, seg = 72;
    for (const b of bands) {
      const top = ringTop(b.ri, b.ro, b.h, a0, a1, seg);
      B.add(b.h > 1 ? mCap : mWhite, place(top, PCX, 0, PCZ));
      // cap stones on each tier edge
      B.add(mCap, place(ringTop(b.ro - 0.001, b.ro + 0.03, b.h + 0.005, a0, a1, seg), PCX, 0, PCZ));
      for (const sg of [-1, 1]) {
        const a = sg * gap;
        const rm = (b.ri + b.ro) / 2;
        const pl = new THREE.PlaneGeometry(b.ro - b.ri, b.h);
        const th = sg > 0 ? Math.atan2(-Math.cos(a), Math.sin(a)) : Math.atan2(Math.cos(a), -Math.sin(a));
        B.add(mWhite, uvw(place(pl, PCX + rm * Math.sin(a), b.h / 2, PCZ + rm * Math.cos(a), th)));
      }
    }
    const walls: [number, number, number, boolean][] = [[7.2, 0, 0.4, false], [6.6, 0.4, 0.8, false], [6.0, 0.8, 1.2, false], [5.2, 0.8, 1.2, true], [4.6, 0.4, 0.8, true], [4.0, 0, 0.4, true]];
    for (const [r, y0, y1, inw] of walls) B.add(mWhite, place(ringWall(r, y0, y1, a0, a1, seg, inw), PCX, 0, PCZ));
    // colliders sampled from the tier profile
    const hAt = (x: number, z: number) => {
      const dx = x - PCX, dz = z - PCZ, r = Math.hypot(dx, dz);
      if (Math.abs(Math.atan2(dx, dz)) < gap) return 0;
      for (const b of bands) if (r >= b.ri && r < b.ro) return b.h;
      return 0;
    };
    const st = 0.3;
    for (let z = PCZ - 7.2; z < PCZ + 7.2; z += st) {
      let runH = 0, runX = 0;
      for (let x = PCX - 7.35; x <= PCX + 7.35 + st; x += st) {
        const hh = x > PCX + 7.35 ? 0 : hAt(x + st / 2, z + st / 2);
        if (hh !== runH) {
          if (runH > 0) k.collider(runX, x, z, z + st, 0, runH);
          runH = hh; runX = x;
        }
      }
    }
    // fountain + statue at the bottom of the pit
    B.add(mMarble, place(latheG([[1.35, 0], [1.4, 0.05], [1.4, 0.5], [1.3, 0.55], [1.22, 0.5], [1.22, 0.2], [0.01, 0.2]], 40), PCX, 0, PCZ));
    B.add(mWater, place(new THREE.CircleGeometry(1.22, 32).rotateX(-PI / 2), PCX, 0.42, PCZ));
    k.collider(PCX - 1.4, PCX + 1.4, PCZ - 1.4, PCZ + 1.4, 0, 0.55);
    statue(PCX, PCZ, PI * 0.15, 0.45, 1);
    // pots on the inner bench tier
    for (const a of [1.2, 2.3, 3.5, 4.4, 5.3]) pot(PCX + Math.sin(a) * 4.3, PCZ + Math.cos(a) * 4.3, 0.55, 0.4, a > 3 ? "ficus" : "boug", a > 3 ? mGlaze : mTerra);
    for (const a of [0.9, 2.0, 3.1, 4.2, 5.4]) amphora(PCX + Math.sin(a) * 5.6, PCZ + Math.cos(a) * 5.6, 0.8, 1.2, a, 0);
  }
  // plaza corners: columns, a ruined gateway, drums, statues, olive tree
  column(-11.3, -9.6, 3.6, 0.32);
  column(-9.3, -9.6, 2.1, 0.32, 0, false);
  drum(-9.8, -7.9, 0.3, 0.9, 0.6);
  {
    column(8.6, -9.6, 4.0, 0.32);
    column(11.6, -9.6, 4.0, 0.32);
    B.add(mMarble, rbox(4.2, 0.55, 0.9, 10.1, 4.0, -9.6, 0, 0.04));
    k.collider(8.0, 12.2, -10.05, -9.15, 4.0, 4.55);
  }
  statue(-11.4, 7.6, -PI * 0.75, 0, 0);
  pot(-9.6, 8.2, 1.1, 0, "ficus");
  {
    // olive tree in a round planter (east of the pit)
    const x = 10.8, z = 3.2;
    B.add(mWhite, uvw(cylG(1.25, 1.3, 0.45, x, 0, z, 32)));
    B.add(mCap, cylG(1.3, 1.3, 0.05, x, 0.45, z, 32));
    B.add(mSoil, place(new THREE.CircleGeometry(1.15, 24).rotateX(-PI / 2), x, 0.46, z));
    k.collider(x - 1.3, x + 1.3, z - 1.3, z + 1.3, 0, 0.5);
    B.add(mBark, tubeG([[x, 0.4, z], [x + 0.2, 1.2, z - 0.1], [x - 0.1, 1.9, z + 0.15], [x + 0.3, 2.6, z]], 0.16, 14, 8));
    B.add(mBark, tubeG([[x + 0.0, 1.9, z + 0.1], [x - 0.7, 2.6, z + 0.4], [x - 1.2, 3.1, z + 0.3]], 0.07, 8, 6));
    B.add(mBark, tubeG([[x + 0.2, 2.2, z], [x + 0.9, 2.8, z - 0.5], [x + 1.3, 3.2, z - 0.6]], 0.07, 8, 6));
    k.collider(x - 0.3, x + 0.3, z - 0.3, z + 0.3, 0.5, 2.6, false);
    leafBlob(x, 3.3, z, 2.0, 0.9, 1.8, 260, 0.5, "#b3c49b");
  }
  statue(11.4, 7.6, PI * 0.8, 0, 2);
  pot(9.6, 8.2, 0.9, 0, "boug");
  pot(-3.4, 8.1, 0.9, 0, "olive");
  pot(3.4, 8.1, 0.9, 0, "olive");
  lampPost(-12.2, -3.0);
  lampPost(12.2, -6.8);
  bench(-12.4, 1.0, 2.2, false);
  bench(12.4, -2.0, 1.6, false);

  // =====================================================================
  // WEST QUARTER (x -34 … -13)
  // =====================================================================
  house(-35.5, -26, -11, -5, 4.0, { chim: 2, glow: [0], door: [1], mat: mWhite });
  house(-23, -16, -11, -4, 6.0, { dome: 1.4, domeAt: [-1.8, 0.8], chim: 2, door: [1], balc: 2, shut: mShutterT });
  house(-35.5, -28, -2, 5, 5.8, { dome: 1.7, glow: [1], boug: [2], mat: mWhite });
  house(-25, -16, -1, 5, 3.6, { chim: 3, glow: [2], stair: { f: 0, dir: -1 }, mat: mRose, dr: mDoorT });
  // café shutters facing the plaza (west lane)
  {
    const F = faceOf(-23, -16, -11, -4, 1);
    for (const u of [-2.3, 2.3]) {
      B.add(mShutter, onF(F, new THREE.BoxGeometry(1.5, 1.6, 0.05), u, 1.9, 0.03));
      B.add(mWhite, uvw(onF(F, new THREE.BoxGeometry(1.8, 0.1, 0.3), u, 1.05, 0.15)));
      B.add(mCheck, onF(F, new THREE.BoxGeometry(1.8, 0.02, 0.8), u, 2.9, 0.4));
    }
    bench(-15.4, -9.8, 1.6, false);
  }
  // sunset nook (dead end facing the low sun, west)
  {
    B.add(mWhite, uvw(rbox(1.2, 2.6, 3.2, -34.2, 0, -3.5, 0, 0.05)));
    k.collider(-34.8, -33.6, -5, -2, 0, 2.6);
    bench(-30.5, -2.55, 2.4, true);
    pot(-33.0, -4.3, 0.9, 0, "ficus");
    pot(-27.4, -2.6, 0.7, 0, "boug", mTerra);
    bougBlob(-31.0, 3.0, -2.25, 1.6, 0.6, 0.45, 70, 0.6, 26, 0);
    amphora(-33.1, -2.6, 0.9, 0, 0.5, 0.25);
    wallLamp(faceOf(-35.5, -28, -2, 5, 2), 2.0, 2.2);
  }
  // lane furniture
  pot(-25.55, -8.0, 0.8, 0, "ficus", mTerra);
  amphora(-27.7, 0.5, 0.9, 0, 1, 0);
  statue(-17.4, 7.2, PI * 0.9, 0, 1);
  pot(-30.5, 8.0, 1.0, 0, "ficus");
  pot(-19.8, 7.0, 0.8, 0, "boug");
  table(-29.0, 9.4, 0, 3);
  bench(-33.3, 9.0, 2.4, false);

  // =====================================================================
  // EAST QUARTER (x 13 … 34)
  // =====================================================================
  house(16, 23, -11, -5, 3.8, { chim: 2, glow: [3], stair: { f: 0, dir: 1 }, mat: mWhite });
  house(26, 35.5, -11, -4, 6.2, { dome: 1.6, domeAt: [-1.5, 0], chim: 2, door: [3], balc: 2, dr: mDoorR });
  house(16, 22, -1, 5, 5.6, { chim: 1, glow: [3], balc: 0, boug: [3], mat: mCream });
  house(25, 35.5, -1, 6, 4.0, { chim: 3, door: [2], glow: [3], mat: mWhite, shut: mShutterT });
  // taverna tables in the sunset nook (east)
  {
    bench(30.5, -1.26, 2.4, true);
    pot(33.0, -2.5, 0.9, 0, "ficus");
    bougBlob(30.5, 3.2, -1.3, 1.8, 0.6, 0.5, 70, 0.6, 26, 0);
    wallLamp(faceOf(25, 35.5, -1, 6, 2), -3.0, 2.2);
  }
  pot(24.5, -8.0, 0.9, 0, "boug");
  amphora(24.65, 1.2, 1.0, 0, 0.3, 0);
  amphora(24.7, 2.0, 0.8, 0, 1.2, 0.2);
  table(29.0, 9.4, 0, 3);
  statue(17.4, 7.2, PI * 1.1, 0, 0);
  pot(30.5, 8.0, 1.0, 0, "ficus");
  table(20.2, 8.6, 0, 3);
  bench(33.3, 9.0, 2.4, false);
  pot(14.8, 0.2, 0.7, 0, "olive", mTerra);

  // =====================================================================
  // UPPER TERRACE L1 (y 2.4) and L2 (y 4.8)
  // =====================================================================
  house(-35.5, -28, 14.5, 23, 4.0, { y: L1, chim: 2, glow: [2], mat: mWhite });
  house(-21, -15, 15, 21, 5.8, { y: L1, dome: 1.5, door: [2], balc: 1, boug: [2] });
  house(-13.5, -10.5, 14.5, 19, 3.2, { y: L1, glow: [2], chim: 1, mat: mOchre });
  house(10.5, 13.5, 14.5, 19, 3.2, { y: L1, door: [2], chim: 2, mat: mWhite });
  house(15, 21, 15, 21, 4.4, { y: L1, chim: 3, glow: [2], mat: mCream });
  house(27, 35.5, 14.5, 22, 5.8, { y: L1, dome: 1.6, door: [2], balc: 3, boug: [2] });
  // the big blue-domed church (landmark)
  house(-5, 5, 16, 27, 6.4, { y: L1, dome: 3.1, domeAt: [0, 1.0], glow: [2], gable: 2, noWin: [], chim: 0 });
  house(-5, 5, 27, 35, 5.0, { y: L1, chim: 3, noWin: [0], mat: mWhite });
  {
    // church forecourt steps & props
    B.add(mWarm, uvw(box(4.2, 0.2, 1.2, 0, L1, 15.4)));
    k.collider(-2.1, 2.1, 14.8, 16, L1, L1 + 0.2);
    pot(-3.6, 14.2, 1.0, L1, "ficus");
    pot(3.6, 14.2, 1.0, L1, "ficus");
    for (const x of [-4.6, 4.6]) column(x, 13.2, 3.4, 0.28, L1, true);
  }
  // L1 walkway props
  bench(-8.0, 13.3, 2.4, true, L1);
  pot(-25.5, 14.2, 0.9, L1, "boug");
  statue(-27.4, 13.6, PI, L1, 2);
  pot(-22.5, 22.0, 1.0, L1, "ficus");
  bench(8.0, 13.3, 2.4, true, L1);
  pot(25.5, 14.2, 0.9, L1, "boug");
  table(24.0, 17.5, L1, 3);
  pot(22.5, 22.0, 1.0, L1, "olive");
  lampPost(-15.8, 13.2, L1);
  lampPost(15.8, 13.2, L1);
  // cypresses behind
  for (const [x, z, s] of [[-24.5, 21.5, 1.0], [-26.0, 21.7, 0.8], [23.2, 20.5, 1.1], [6.0, 19.2, 0.9], [-6.0, 19.2, 0.85]] as V3t[]) {
    B.add(mCypress, place(latheG([[0.01, 0], [0.45, 0.3], [0.62, 1.6], [0.55, 3.2], [0.32, 4.6], [0.01, 5.6]].map(([r, h]) => [r * s, h * s]), 12), x, L1, z));
    k.collider(x - 0.5 * s, x + 0.5 * s, z - 0.5 * s, z + 0.5 * s, L1, L1 + 5.4 * s, false);
  }
  // L2 houses
  house(-35.5, -26, 24.6, 32, 5.2, { y: L2, dome: 1.7, glow: [2], chim: 2 });
  house(-22, -14, 25.2, 32, 4.2, { y: L2, chim: 3, door: [2], balc: 2, mat: mRose });
  house(-12, -6, 25.4, 32, 3.6, { y: L2, glow: [2], chim: 2 });
  house(6, 12, 25.4, 32, 3.8, { y: L2, door: [2], chim: 2, mat: mCream });
  house(14, 21, 25.2, 32, 5.4, { y: L2, dome: 1.4, glow: [2], balc: 2 });
  pot(-24.0, 24.0, 0.9, L2, "ficus");
  pot(-13.0, 24.1, 0.8, L2, "boug", mTerra);
  bench(-18.0, 24.2, 2.2, true, L2);
  statue(12.8, 24.1, PI, L2, 0);
  // windmill (L2 east)
  {
    const x = 28.5, z = 28.0, y = L2;
    B.add(mWhite, uvw(cylG(2.0, 2.35, 6.5, x, y, z, 32)));
    k.collider(x - 2.1, x + 2.1, z - 2.1, z + 2.1, y, y + 6.5);
    B.add(mThatch, place(new THREE.ConeGeometry(2.25, 1.9, 28), x, y + 7.45, z));
    B.add(mWood, place(new THREE.CylinderGeometry(0.14, 0.14, 1.6, 10).rotateX(PI / 2), x - 0.4, y + 6.9, z - 2.3, 0.3));
    const hub = new V3(x - 0.65, y + 6.9, z - 3.0);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2 + 0.2;
      const spar = new THREE.BoxGeometry(0.08, 5.2, 0.08).translate(0, 2.6, 0).rotateZ(a);
      B.add(mWood, place(spar, hub.x, hub.y, hub.z, 0.3));
      const ss = new THREE.Shape(); ss.moveTo(0, 0.6); ss.lineTo(0, 5.1); ss.lineTo(1.3, 4.6); ss.lineTo(0, 0.6);
      const sail = new THREE.ShapeGeometry(ss).rotateZ(a);
      B.add(mSail, place(sail, hub.x, hub.y, hub.z, 0.3));
    }
    doorAt(faceOf(x - 2.0, x + 2.0, z - 2.0, z + 2.0, 2), y, 0, false, mDoor, mWhite);
    windowAt(faceOf(x - 2.0, x + 2.0, z - 2.0, z + 2.0, 3), y + 3.6, 0, mShutter, mWhite);
  }

  // =====================================================================
  // BACKGROUND: the village climbing the hill (south), neighbouring rooftops (east/west)
  // =====================================================================
  {
    let seed = 0;
    for (let row = 0; row < 5; row++) {
      const zc = 38 + row * 6.5, y = 4.8 + row * 2.6;
      B.add(mFarWhite, box(150, y + 0.1, 6.5, 0, -0.2, zc + 1));
      for (let x = -70 + (row % 2) * 4; x < 70; x += rr(6, 10)) {
        const w = rr(4, 7.5), d = rr(4, 6), h = rr(3, 6.5);
        farHouse(x, zc, w, d, h, y, R() < 0.25 ? rr(1.1, 1.8) : 0, R() < 0.2 ? mCream : mFarWhite, seed++);
      }
    }
    // east & west neighbours inside the rim
    for (const sg of [-1, 1]) {
      for (let z = -24; z < 34; z += rr(7, 10)) {
        const x = sg * rr(38.5, 41), w = rr(4, 6), d = rr(5, 7);
        const y = z > 23 ? L2 : z > 12 ? L1 : 0;
        farHouse(x, z, w, d, rr(3.5, 7), y, R() < 0.3 ? 1.4 : 0, mFarWhite, seed++);
        farHouse(sg * rr(46, 52), z + 3, w, d, rr(3.5, 8), y, R() < 0.3 ? 1.6 : 0, R() < 0.3 ? mOchre : mFarWhite, seed++);
      }
      // along the caldera rim
      for (let x = 44; x < 150; x += rr(7, 12)) {
        const ze = zEdge(x);
        farHouse(sg * x, ze + rr(4, 8), rr(4, 7), rr(4, 6), rr(3, 6), 0, R() < 0.3 ? rr(1.2, 1.8) : 0, mFarWhite, seed++);
        farHouse(sg * (x + 3), ze + rr(12, 20), rr(4, 7), rr(4, 6), rr(3, 6), 0, 0, R() < 0.2 ? mRose : mFarWhite, seed++);
        if (R() < 0.6) farHouse(sg * (x + 1), ze - 3.5, rr(3, 5), 3, rr(3, 4), -rr(3, 6), 0, mFarWhite, seed++);
      }
    }
  }

  // ---------------- instanced foliage & petals ----------------
  if (leaves.length) k.instances(new THREE.PlaneGeometry(0.42, 0.42), mLeaf, leaves);
  if (bougs.length) k.instances(new THREE.PlaneGeometry(0.42, 0.42), mBougC, bougs);
  if (petals.length) k.instances(new THREE.PlaneGeometry(0.07, 0.05), mPetal, petals, { noShadow: true });
  B.flush(k, noShadow);

  // ---------------- spawns ----------------
  const hiders: THREE.Vector3[] = [];
  for (let j = 0; j < 3; j++) for (let i = 0; i < 8; i++) hiders.push(new V3(-10.2 + i * 1.45, 0, -27.3 + j * 1.45));
  const hunters: THREE.Vector3[] = [];
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) hunters.push(new V3(30.6 + i * 1.2, 0, -26.8 + j * 1.3));

  k.room("Cliff Promenade", -34, 34, -30, -21);
  k.room("Chapel", -34.2, -25.2, -29.8, -23.5);
  k.room("Café Pergola", 13.5, 24, -29.8, -23);
  k.room("Pit Plaza", -13, 13, -11, 9.2);
  k.room("West Lanes", -34, -13, -14, 12);
  k.room("East Lanes", 13, 34, -14, 12);
  k.room("Upper Terrace", -34, 34, 12, 23);
  k.room("High Terrace", -34, 34, 23, 30);

  return k.finish({
    id: "greece", name: "Greece",
    bounds: { minX: -33.6, maxX: 33.6, minZ: -29.6, maxZ: 29.6 },
    hunterSpawns: hunters,
    hiderSpawns: hiders,
    preview: { pos: [-14, 13.5, 27], look: [12, 0, -40], fov: 62 },
    lighting: {
      sky: "#9fc3e6",
      hemi: ["#cfe0f5", "#b08c68", 0.45],
      sun: { color: "#ffc88e", int: 2.9, pos: [-32, 19, -26] },
      fog: ["#bcd0e2", 70, 330],
      points: [
        { pos: [-29.5, 2.2, -22.0], color: "#ffb35c", int: 6, dist: 7 },
        { pos: [18.8, 2.4, -26.4], color: "#ffbf6e", int: 8, dist: 10 },
        { pos: [-30.5, 2.2, -2.6], color: "#ffb35c", int: 6, dist: 7 },
        { pos: [30.0, 2.2, -2.2], color: "#ffb35c", int: 6, dist: 7 },
        { pos: [0, 4.6, 14.6], color: "#ffb35c", int: 7, dist: 8 },
        { pos: [-8.0, 2.2, -22.0], color: "#ffb35c", int: 6, dist: 7 },
      ],
      exposure: 1.0,
      env: 0.55,
      hdri: "sky",
      hdriBackground: 0.02,
      envRotation: 0,
    },
  });
}
