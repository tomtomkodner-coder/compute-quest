// Shopping Mall (official map) — a bright two-level indoor mall around a glass barrel-vault skylight atrium.
// Ground floor: atrium with paint-splash floor art, criss-cross escalator pairs with glass balustrades, painted
// pillars, a giant glossy balloon sculpture in a round planter, a tiered handbag display, planters with benches,
// directory totems, kiosks and floor merchandise; a food court (three fast-food stalls incl. BURGER BLAST, 24 tables
// with clutter), and shops: TUNE TOWN (instruments), MODA LUNA (fashion: racks, mannequin clusters, fitting rooms),
// STEP UP (shoes & bags), TOY PLANET (giant teddy, ball pit), PIXEL PALACE (arcade), FRESH MART (grocery) and VOLTEX
// (electronics). Upper floor: a gallery ring with glass railings, a café kiosk, massage chairs, vending machines,
// luggage and lounge props and window displays of eight more shops. Hunters enter from the south entrance hall.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import * as T from "../textures";
import type { PaintTex } from "../textures";
import * as M from "./tex/mall";
import { Kit, grid, type Mat, type World } from "./kit";
import { Life, drawChameleon } from "./tex/life";

type G = THREE.BufferGeometry;
type V3t = [number, number, number];
const V3 = THREE.Vector3;
const PI = Math.PI;

// layout constants
const X0 = -28, X1 = 28, Z0 = -24, Z1 = 24;
const CH = 4.2; // ground-floor ceiling (slab underside)
const FL = 5.0; // upper-floor level
const RF = 10.0; // upper-floor ceiling (roof slab underside)
const VX = 10, VZ = 7; // atrium void half extents
const UX = 16, UZ = 14; // upper gallery half extents (upper shopfront lines)

// ---------------------------------------------------------------- geometry helpers
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
function bgeo(w: number, h: number, d: number) {
  const min = Math.min(w, h, d), max = Math.max(w, h, d);
  if (min < 0.04 || max > 4.5) return new THREE.BoxGeometry(w, h, d);
  return chamferGeo(w, h, d, Math.min(0.03, min * 0.18));
}
function place(geo: G, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, s?: V3t) {
  const m = new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new V3(...(s ?? [1, 1, 1])));
  return geo.applyMatrix4(m);
}
/** stick between two points (box or cylinder) */
function beam(a: V3t, b: V3t, w: number, d: number, round = false, seg = 8) {
  const va = new V3(...a), vb = new V3(...b);
  const len = va.distanceTo(vb);
  const geo = round ? new THREE.CylinderGeometry(w / 2, w / 2, len, seg, 1, true) : bgeo(w, len, d);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), vb.clone().sub(va).normalize()));
  const c = va.add(vb).multiplyScalar(0.5);
  geo.translate(c.x, c.y, c.z);
  return geo;
}
function lathe(pts: [number, number][], seg = 20) {
  return new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg);
}
function tubeGeo(pts: V3t[], r: number, seg = 24, radial = 8, closed = false) {
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
/** remaps the UVs of a geometry into atlas cell (cx, cy) of an n x n atlas (cy counted from the top) */
function cellUV(geo: G, cx: number, cy: number, n: number) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (cx + uv.getX(i)) / n, 1 - (cy + 1) / n + uv.getY(i) / n);
  uv.needsUpdate = true;
  return geo;
}
function mergeG(geos: G[]) {
  const clean = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  for (const g of clean) for (const key of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(key)) g.deleteAttribute(key);
  return mergeGeometries(clean, false)!;
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
  }
  flush(k: Kit) {
    for (const [m, geos] of this.map) if (geos.length) k.merged(geos, m, { noShadow: this.noShadow.has(m) });
    this.map.clear();
  }
}
type It = { pos: V3t; rotY?: number; rotX?: number; rotZ?: number; scale?: V3t };
/** instanced props, one InstancedMesh per (shape, colour) so the eyedropper samples the real colour */
class Inst {
  private defs = new Map<string, { geo: G; mat: (c: string) => Mat; lists: Map<string, It[]>; noShadow: boolean }>();
  def(key: string, geo: G, mat: (c: string) => Mat, noShadow = false) { this.defs.set(key, { geo, mat, lists: new Map(), noShadow }); }
  add(key: string, color: string, it: It) {
    const d = this.defs.get(key);
    if (!d) throw new Error("inst " + key);
    let l = d.lists.get(color);
    if (!l) { l = []; d.lists.set(color, l); }
    l.push(it);
  }
  flush(k: Kit) {
    for (const d of this.defs.values()) for (const [c, l] of d.lists) if (l.length) k.instances(d.geo, d.mat(c), l, { noShadow: d.noShadow });
  }
}
/** local frame for rotated furniture: local +z = front */
function fr(x: number, z: number, ry: number) {
  const c = Math.cos(ry), s = Math.sin(ry);
  return {
    ry,
    pt: (lx: number, lz: number): [number, number] => [x + lx * c + lz * s, z - lx * s + lz * c],
    put: (geo: G, lx: number, ly: number, lz: number, rx = 0, r2 = 0, rz = 0, sc?: V3t) => {
      place(geo, lx, ly, lz, rx, r2, rz, sc);
      geo.rotateY(ry);
      geo.translate(x, 0, z);
      return geo;
    },
  };
}

// ---------------------------------------------------------------- prop templates
function tshirtShape() {
  const s = new THREE.Shape();
  s.moveTo(-0.2, 0); s.lineTo(0.2, 0); s.lineTo(0.2, 0.44); s.lineTo(0.29, 0.37); s.lineTo(0.35, 0.49); s.lineTo(0.2, 0.62);
  s.lineTo(0.07, 0.63); s.quadraticCurveTo(0, 0.57, -0.07, 0.63); s.lineTo(-0.2, 0.62); s.lineTo(-0.35, 0.49); s.lineTo(-0.29, 0.37); s.lineTo(-0.2, 0.44); s.closePath();
  return s;
}
function dressShape() {
  const s = new THREE.Shape();
  s.moveTo(-0.3, 0); s.lineTo(0.3, 0); s.lineTo(0.14, 0.62); s.lineTo(0.16, 0.9); s.lineTo(0.07, 0.95); s.quadraticCurveTo(0, 0.9, -0.07, 0.95); s.lineTo(-0.16, 0.9); s.lineTo(-0.14, 0.62); s.closePath();
  return s;
}
/** garment hanging from a rail: origin = hook point, plane faces local ±x after rotY(PI/2) */
function garmentGeo(shape: THREE.Shape, h: number) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: false, curveSegments: 3 });
  g.translate(0, -h - 0.06, -0.015);
  g.rotateY(PI / 2);
  return g;
}
function mannequinGeo(pose: number) {
  const P: G[] = [];
  P.push(place(new THREE.SphereGeometry(0.105, 14, 10), 0, 1.63, 0, 0, 0, 0, [0.92, 1.14, 1]));
  P.push(place(new THREE.CylinderGeometry(0.042, 0.05, 0.12, 10), 0, 1.5, 0));
  P.push(place(lathe([[0.001, 0.88], [0.14, 0.9], [0.165, 0.99], [0.135, 1.13], [0.15, 1.26], [0.185, 1.37], [0.17, 1.44], [0.09, 1.49], [0.001, 1.5]], 14), 0, 0, 0, 0, 0, 0, [1, 1, 0.62]));
  for (const s of [-1, 1]) {
    P.push(place(new THREE.CapsuleGeometry(0.068, 0.34, 3, 10), s * 0.085, 0.7, 0, 0, 0, s * 0.03));
    P.push(place(new THREE.CapsuleGeometry(0.052, 0.34, 3, 10), s * 0.095, 0.3, 0));
    P.push(place(bgeo(0.09, 0.06, 0.22), s * 0.1, 0.03, 0.05));
    const raised = pose === 2 && s > 0, hip = pose === 1 && s > 0;
    if (raised) {
      P.push(place(new THREE.CapsuleGeometry(0.045, 0.2, 3, 8), 0.25, 1.54, 0, 0, 0, -0.34));
      P.push(place(new THREE.CapsuleGeometry(0.04, 0.2, 3, 8), 0.315, 1.82, 0, 0, 0, -0.1));
    } else if (hip) {
      P.push(place(new THREE.CapsuleGeometry(0.045, 0.2, 3, 8), 0.28, 1.25, 0, 0, 0, 0.55));
      P.push(place(new THREE.CapsuleGeometry(0.04, 0.14, 3, 8), 0.275, 1.05, 0, 0, 0, -0.88));
    } else {
      P.push(place(new THREE.CapsuleGeometry(0.045, 0.24, 3, 8), s * 0.215, 1.24, 0, 0, 0, s * 0.15));
      P.push(place(new THREE.CapsuleGeometry(0.04, 0.24, 3, 8), s * 0.245, 0.95, 0.02, 0, 0, s * 0.06));
    }
  }
  return mergeG(P);
}
function guitarBodyGeo() {
  const ys = [0, 0.03, 0.1, 0.2, 0.3, 0.34, 0.4, 0.48, 0.54, 0.56];
  const ws = [0.02, 0.12, 0.185, 0.2, 0.155, 0.13, 0.14, 0.15, 0.1, 0.02];
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  for (let i = 0; i < ys.length; i++) s.lineTo(ws[i], ys[i]);
  for (let i = ys.length - 1; i >= 0; i--) s.lineTo(-ws[i], ys[i]);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 1 });
  g.translate(0, 0, -0.04);
  return g;
}
function guitarNeckGeo() {
  return mergeG([place(bgeo(0.05, 0.5, 0.025), 0, 0.81, 0.02), place(bgeo(0.085, 0.17, 0.022), 0, 1.14, 0.015), place(new THREE.CylinderGeometry(0.045, 0.045, 0.01, 14), 0, 0.3, 0.052, PI / 2)]);
}
function chairShellGeo() {
  return mergeG([place(bgeo(0.43, 0.045, 0.42), 0, 0.45, 0), place(bgeo(0.43, 0.36, 0.035), 0, 0.68, -0.2, -0.1)]);
}
function chairLegGeo() {
  const P: G[] = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push(beam([sx * 0.18, 0, sz * 0.17], [sx * 0.17, 0.44, sz * 0.16], 0.024, 0.024, true, 6));
  return mergeG(P);
}
function bagGeo() {
  return mergeG([place(bgeo(0.42, 0.32, 0.14), 0, 0.16, 0), place(new THREE.TorusGeometry(0.1, 0.012, 6, 14, PI), 0, 0.32, 0)]);
}
function cabinetGeo() {
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.lineTo(0.85, 0); s.lineTo(0.85, 0.92); s.lineTo(0.62, 1.06); s.lineTo(0.56, 1.06); s.lineTo(0.62, 1.78); s.lineTo(0.66, 1.96); s.lineTo(0, 1.96); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.74, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 1 });
  g.translate(-0.425, 0, -0.37);
  g.rotateY(-PI / 2);
  return g;
}

// ---------------------------------------------------------------- the map
export function buildMall(): World {
  const k = new Kit(CH, 3.3);
  const B = new Batch();
  const I = new Inst();
  const rng = M.rng;

  // ---------- materials (created once)
  const cache = new Map<string, Mat>();
  const sc = (c: string, rough = 0.6, metal = 0) => {
    const key = `s|${c}|${rough}|${metal}`;
    let m = cache.get(key);
    if (!m) { m = k.mat(null, c, [1, 1], { roughness: rough, metalness: metal }); cache.set(key, m); }
    return m;
  };
  const tm = (tkey: string, make: () => PaintTex, c = "#ffffff", o: { rough?: number; metal?: number; bump?: number; emissive?: number } = {}) => {
    const key = `t|${tkey}|${c}|${o.rough}|${o.metal}|${o.bump}|${o.emissive}`;
    let m = cache.get(key);
    if (!m) {
      m = k.mat(k.tex(tkey, make), c, [1, 1], { roughness: o.rough ?? 0.7, metalness: o.metal ?? 0, bump: o.bump ?? 0.4, ...(o.emissive ? { emissive: "#ffffff", emissiveIntensity: o.emissive } : {}) });
      cache.set(key, m);
    }
    return m;
  };
  const em = (c: string, i = 1.4) => {
    const key = `e|${c}|${i}`;
    let m = cache.get(key);
    if (!m) { m = k.mat(null, c, [1, 1], { emissive: c, emissiveIntensity: i, roughness: 0.5 }); cache.set(key, m); }
    return m;
  };
  const glass = (c: string, op: number) => {
    const g = k.mat(null, c, [1, 1], { transparent: true, roughness: 0.04, metalness: 0.2 });
    g.m.opacity = op;
    g.m.alphaTest = 0;
    g.m.depthWrite = false;
    B.noShadow.add(g);
    return g;
  };
  const signMat = (name: string, tag: string, bg: string, fg: string, accent: string) =>
    tm(`mall.sign.${name}`, () => M.sign(name, tag, bg, fg, accent, "bold 92px 'Trebuchet MS', 'Arial Black', sans-serif", 512, 96), "#ffffff", { rough: 0.4, bump: 0, emissive: 0.55 });

  const mFloor = tm("mall.porc", () => M.porcelain("#e8e5e0", "#bdb4a8", 3), "#ffffff", { rough: 0.16, bump: 0.2 });
  const mPlaster = tm("mall.plaster", () => M.paint("#f2eee8", 2), "#ffffff", { rough: 0.85, bump: 0.15 });
  const mWallWarm = tm("mall.plaster", () => M.paint("#f2eee8", 2), "#eadfce", { rough: 0.85, bump: 0.15 });
  const mCeil = tm("mall.ceil", M.ceilingTiles, "#ffffff", { rough: 0.9, bump: 0.3 });
  const mCeilDark = tm("mall.ceil", M.ceilingTiles, "#3a3346", { rough: 0.9, bump: 0.3 });
  const mStone = tm("mall.stone", () => T.marble("#ebe4d8", "#b8ac9a", 7), "#ffffff", { rough: 0.3, bump: 0.2 });
  const mSteel = tm("mall.brushed", () => M.brushed(), "#ffffff", { rough: 0.32, metal: 0.85, bump: 0.08 });
  const mBronze = tm("mall.brushed", () => M.brushed(), "#dcc39a", { rough: 0.3, metal: 0.8, bump: 0.08 });
  const mDark = sc("#2a2c30", 0.45, 0.6);
  const mBlack = sc("#151515", 0.3, 0);
  const mChrome = sc("#eeeeee", 0.12, 1);
  const mCopper = sc("#b98a5a", 0.3, 0.75);
  const mGlass = glass("#dff0f4", 0.14);
  const mGlassDark = glass("#5c7480", 0.4);
  const mWood = tm("mall.wood", () => T.wood("#b98150", "#7c4f2a", 3), "#ffffff", { rough: 0.42, bump: 0.5 });
  const mWoodDark = tm("mall.woodDark", () => T.wood("#6e4727", "#3c2412", 5), "#ffffff", { rough: 0.45, bump: 0.5 });
  const mLam = tm("mall.lam", () => M.laminate("#c8a27a", 5), "#ffffff", { rough: 0.45, bump: 0.35 });
  const mLamDark = tm("mall.lamDark", () => M.laminate("#86603f", 8), "#ffffff", { rough: 0.45, bump: 0.35 });
  const mSoil = tm("mall.soil", () => M.speckle("#3a2a1f", 0.2, 4), "#ffffff", { rough: 1, bump: 0.6 });
  const mPlanter = tm("mall.planter", () => M.splashWall("#8c8781", 2), "#ffffff", { rough: 0.7, bump: 0.15 });
  const mPillar = tm("mall.pillar", () => M.splashPillar(4), "#ffffff", { rough: 0.5, bump: 0 });
  const mCard = tm("mall.card", () => M.speckle("#b88a57", 0.1, 6), "#ffffff", { rough: 0.9, bump: 0.3 });
  const mFascia = sc("#3a3c41", 0.5, 0.2);
  const mCove = em("#ffd49a", 1.8);
  const mLight = em("#fff6e4", 2.2);
  const mWhite = sc("#f4f2ee", 0.4);
  const mRubber = sc("#141414", 0.7);

  // instanced shapes
  const plainMat = (rough = 0.55, metal = 0) => (c: string) => sc(c, rough, metal);
  const fabricMat = (c: string) => tm("mall.fabric", () => M.fabric(), c, { rough: 0.9, bump: 0.35 });
  const leafMat = (c: string) => tm("mall.leaves", T.leaves, c, { rough: 0.8, bump: 0.9 });
  I.def("bush", new THREE.IcosahedronGeometry(0.5, 1), leafMat);
  I.def("flower", new THREE.IcosahedronGeometry(0.035, 0), plainMat(0.6), true);
  I.def("shirt", garmentGeo(tshirtShape(), 0.63), fabricMat);
  I.def("dress", garmentGeo(dressShape(), 0.95), fabricMat);
  I.def("folded", bgeo(0.34, 0.05, 0.28), fabricMat);
  I.def("mq0", mannequinGeo(0), plainMat(0.28));
  I.def("mq1", mannequinGeo(1), plainMat(0.28));
  I.def("mq2", mannequinGeo(2), plainMat(0.28));
  I.def("skirt", lathe([[0.3, 0.52], [0.24, 0.7], [0.17, 0.92], [0.001, 0.93]], 16), fabricMat);
  I.def("gtrBody", guitarBodyGeo(), plainMat(0.25, 0.1));
  I.def("gtrNeck", guitarNeckGeo(), () => mWoodDark);
  I.def("chairShell", chairShellGeo(), plainMat(0.45));
  I.def("chairLeg", chairLegGeo(), () => mDark);
  I.def("bag", bagGeo(), plainMat(0.5));
  I.def("tray", bgeo(0.42, 0.025, 0.3), plainMat(0.4));
  I.def("cup", lathe([[0.001, 0], [0.034, 0], [0.046, 0.16], [0.001, 0.16]], 12), plainMat(0.4));
  I.def("bun", mergeG([place(new THREE.SphereGeometry(0.06, 12, 6, 0, PI * 2, 0, PI / 2), 0, 0.035, 0, 0, 0, 0, [1, 0.7, 1]), place(new THREE.CylinderGeometry(0.058, 0.058, 0.02, 12), 0, 0.01, 0)]), plainMat(0.6));
  I.def("patty", new THREE.CylinderGeometry(0.062, 0.062, 0.018, 12), plainMat(0.8));
  I.def("fries", mergeG([place(bgeo(0.08, 0.1, 0.05), 0, 0.05, 0)]), plainMat(0.5));
  I.def("friesTop", bgeo(0.07, 0.05, 0.04), plainMat(0.8));
  I.def("shoeUp", mergeG([place(bgeo(0.22, 0.08, 0.095), -0.02, 0.075, 0), place(bgeo(0.1, 0.05, 0.09), -0.07, 0.125, 0)]), plainMat(0.55));
  I.def("shoeSole", bgeo(0.28, 0.035, 0.1), plainMat(0.6));
  I.def("shoeBox", bgeo(0.34, 0.13, 0.22), (c) => tm("mall.shoebox", M.shoeBox, c, { rough: 0.8, bump: 0.1 }));
  I.def("giftBox", bgeo(0.24, 0.2, 0.24), plainMat(0.6));
  I.def("ball", new THREE.IcosahedronGeometry(0.08, 1), plainMat(0.35));
  I.def("fruit", new THREE.IcosahedronGeometry(0.045, 1), plainMat(0.45));
  I.def("can", new THREE.CylinderGeometry(0.035, 0.035, 0.12, 10), (c) => tm("mall.label", () => M.label(3), c, { rough: 0.35, metal: 0.5, bump: 0 }));
  I.def("bottle", lathe([[0.001, 0], [0.04, 0], [0.042, 0.02], [0.042, 0.17], [0.02, 0.23], [0.014, 0.28], [0.001, 0.28]], 10), plainMat(0.2));
  for (let i = 0; i < 8; i++) I.def(`pkg${i}`, cellUV(new THREE.BoxGeometry(0.16, 0.24, 0.28), i % 4, Math.floor(i / 4) + (i >= 4 ? 1 : 0), 4), () => tm("mall.pkg", M.packages, "#ffffff", { rough: 0.6, bump: 0 }));
  for (let i = 0; i < 8; i++) I.def(`toy${i}`, cellUV(new THREE.BoxGeometry(0.34, 0.34, 0.26), i % 4, Math.floor(i / 4) * 2, 4), () => tm("mall.toys", M.toyBoxes, "#ffffff", { rough: 0.6, bump: 0 }));
  for (let i = 0; i < 4; i++) I.def(`tv${i}`, cellUV(new THREE.PlaneGeometry(1.14, 0.64), i % 2, Math.floor(i / 2), 2), () => tm("mall.screens", M.screens, "#ffffff", { rough: 0.2, bump: 0, emissive: 0.9 }), true);
  for (let i = 0; i < 4; i++) I.def(`game${i}`, cellUV(new THREE.PlaneGeometry(0.58, 0.46), i % 2, Math.floor(i / 2), 2), () => tm("mall.games", M.gameScreens, "#ffffff", { rough: 0.2, bump: 0, emissive: 1.0 }), true);
  I.def("cab", cabinetGeo(), plainMat(0.4, 0.1));
  I.def("marq", bgeo(0.72, 0.22, 0.1), (c) => em(c, 1.2), true);
  I.def("button", new THREE.CylinderGeometry(0.022, 0.022, 0.02, 10), (c) => em(c, 0.8), true);
  I.def("downlight", new THREE.CylinderGeometry(0.11, 0.11, 0.03, 14), () => mLight, true);
  I.def("escTread", new THREE.BoxGeometry(0.3464, 0.04, 1.0), () => tm("mall.escstep", M.escStep, "#ffffff", { rough: 0.4, metal: 0.6, bump: 0.3 }));
  I.def("escRiser", new THREE.BoxGeometry(0.02, 0.2, 1.0), () => sc("#2b2d31", 0.5, 0.6));
  I.def("box", bgeo(1, 1, 1), (c) => tm("mall.card", () => M.speckle("#b88a57", 0.1, 6), c, { rough: 0.9, bump: 0.3 }));
  I.def("cube", bgeo(1, 1, 1), plainMat(0.5));
  I.def("pouf", new THREE.CylinderGeometry(0.34, 0.34, 0.42, 20), (c) => tm("mall.fabric", () => M.fabric(), c, { rough: 0.9, bump: 0.35 }));

  // ---------- readable signs / notes / labels (one atlas, merged)
  const life = new Life(k, 2468);
  const lr = rng(97531);
  const boxLabels = [
    life.label({ text: "MALL STOCK", sub: "aisle 4 - do not stack > 3", bg: "#ffffff", fg: "#1d3557", stripe: "#1d3557", px: [200, 120] }),
    life.label({ text: "FRAGILE", sub: "glassware", bg: "#f4efe2", fg: "#c0231d", border: "#c0231d", px: [200, 110] }),
    life.label({ text: "AUTUMN SALE", sub: "window display", bg: "#fff3e0", fg: "#e76f51", border: "#e76f51", px: [200, 110] }),
    life.label({ text: "T. KODNER", sub: "Mall Management", bg: "#fbf6e6", fg: "#222", border: "#222", px: [200, 110] }),
  ];
  // ---------- small helpers
  const col = (x1: number, x2: number, z1: number, z2: number, top: number, bottom = 0, st = true) =>
    k.collider(Math.min(x1, x2), Math.max(x1, x2), Math.min(z1, z2), Math.max(z1, z2), bottom, top, st);
  const rcol = (x: number, z: number, ry: number, hw: number, hd: number, top: number, bottom = 0, st = true) => {
    const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry));
    const ex = hw * c + hd * s, ez = hw * s + hd * c;
    k.collider(x - ex, x + ex, z - ez, z + ez, bottom, top, st);
  };
  const bx = (m: Mat, w: number, h: number, d: number, x: number, y: number, z: number, unit?: number, ry = 0) => B.add(m, place(bgeo(w, h, d), x, y + h / 2, z, 0, ry, 0), unit);
  const sbx = (m: Mat, w: number, h: number, d: number, x: number, y: number, z: number, unit?: number, st = true) => { bx(m, w, h, d, x, y, z, unit); col(x - w / 2, x + w / 2, z - d / 2, z + d / 2, y + h, y, st); };
  const slab = (m: Mat, x1: number, x2: number, y1: number, y2: number, z1: number, z2: number, unit?: number, collide = false, st = true) => {
    B.add(m, place(new THREE.BoxGeometry(x2 - x1, y2 - y1, z2 - z1), (x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2), unit);
    if (collide) col(x1, x2, z1, z2, y2, y1, st);
  };
  const cyl = (m: Mat, rt: number, rb: number, h: number, x: number, y: number, z: number, seg = 20) => B.add(m, place(new THREE.CylinderGeometry(rt, rb, h, seg), x, y + h / 2, z));
  /** plane facing direction ry (0 = +z) */
  const panel = (m: Mat, w: number, h: number, x: number, y: number, z: number, ry: number) => B.add(m, place(new THREE.PlaneGeometry(w, h), x, y, z, 0, ry, 0));
  const downlights = (x1: number, x2: number, z1: number, z2: number, y: number, step: number) => {
    for (let x = x1 + step / 2; x < x2; x += step) for (let z = z1 + step / 2; z < z2; z += step) I.add("downlight", "#fff", { pos: [x, y - 0.012, z] });
  };

  // ================================================================ STRUCTURE
  // ground floor
  slab(mFloor, X0, X1, -0.2, 0, Z0, Z1, 2.4);
  // paint-splash floor art (patches aligned to the 1.2 m tile grid)
  const splashPatch = (x1: number, z1: number, seed: number, cols: string[], y = 0) => {
    const m = tm(`mall.splash${seed}`, () => M.splashFloor(seed, cols, 0.55, 8), "#ffffff", { rough: 0.16, bump: 0 });
    const g = new THREE.PlaneGeometry(9.6, 9.6);
    g.rotateX(-PI / 2);
    B.add(m, place(g, x1 + 4.8, y + 0.004, z1 + 4.8));
  };
  splashPatch(-9.6, -7.2, 1, ["#f39ab4", "#35c3cf", "#f6cf3f"]);
  splashPatch(0, -2.4, 2, ["#f39ab4", "#f6cf3f", "#35c3cf"]);
  splashPatch(-19.2, 3.6, 3, ["#35c3cf", "#f6cf3f", "#f39ab4"]);
  splashPatch(7.2, -14.4, 5, ["#f39ab4", "#4aa8e8", "#f6cf3f"]);
  splashPatch(-7.2, 7.2, 6, ["#f6cf3f", "#f39ab4", "#35c3cf"]);

  // outer walls
  slab(mWallWarm, X0 - 0.3, X0, 0, CH, Z0, Z1, 2.5, true, false);
  slab(mWallWarm, X1, X1 + 0.3, 0, CH, Z0, Z1, 2.5, true, false);
  slab(mWallWarm, X0, X1, 0, CH, Z1, Z1 + 0.3, 2.5, true, false);
  slab(mWallWarm, X0, -4, 0, CH, Z0 - 0.3, Z0, 2.5, true, false);
  slab(mWallWarm, 4, X1, 0, CH, Z0 - 0.3, Z0, 2.5, true, false);
  // shop partitions
  const partX = (x: number, z1: number, z2: number) => slab(mWallWarm, x - 0.12, x + 0.12, 0, CH, z1, z2, 2.5, true, false);
  const partZ = (z: number, x1: number, x2: number) => slab(mWallWarm, x1, x2, 0, CH, z - 0.12, z + 0.12, 2.5, true, false);
  partX(-14, 14, Z1); partX(4, 14, Z1); partX(16, 14, Z1);
  partZ(6, 16, X1); partZ(-14, 16, X1);
  partX(-4, Z0, -14); partX(4, Z0, -14);
  // skirting along the outer walls
  for (const [x1, x2, z1, z2] of [[X0, X0 + 0.04, Z0, Z1], [X1 - 0.04, X1, Z0, Z1], [X0, X1, Z1 - 0.04, Z1]] as [number, number, number, number][]) slab(mDark, x1, x2, 0, 0.1, z1, z2);

  /** storefront: glazing + mullions + fascia with an illuminated sign. axis "x": line = z, running along x */
  const front = (axis: "x" | "z", line: number, a1: number, a2: number, doors: [number, number][], inward: 1 | -1, sign: Mat | null, y0 = 0, topY = CH, winTop = 3.3, fascia: Mat = mFascia) => {
    const P = (a: number, y: number, off: number, w: number, h: number, d: number, m: Mat, unit?: number) => {
      if (axis === "x") B.add(m, place(new THREE.BoxGeometry(w, h, d), a, y + h / 2, line + off), unit);
      else B.add(m, place(new THREE.BoxGeometry(d, h, w), line + off, y + h / 2, a), unit);
    };
    const C = (s: number, e: number, bottom: number, top: number, t = 0.12) => { if (axis === "x") col(s, e, line - t, line + t, top, bottom, false); else col(line - t, line + t, s, e, top, bottom, false); };
    const segs: [number, number][] = [];
    let cur = a1;
    for (const [c, w] of [...doors].sort((p, q) => p[0] - q[0])) {
      if (c - w / 2 > cur + 0.01) segs.push([cur, c - w / 2]);
      cur = c + w / 2;
      P(c - w / 2, y0, 0, 0.1, winTop - y0, 0.16, mDark);
      P(c + w / 2, y0, 0, 0.1, winTop - y0, 0.16, mDark);
      C(c - w / 2, c + w / 2, winTop, topY);
    }
    if (a2 > cur + 0.01) segs.push([cur, a2]);
    for (const [s, e] of segs) {
      const len = e - s, n = Math.max(1, Math.round(len / 2.2));
      P((s + e) / 2, y0 + 0.15, 0, len, winTop - y0 - 0.15, 0.025, mGlass);
      P((s + e) / 2, y0, 0, len, 0.15, 0.12, mDark);
      for (let i = 0; i <= n; i++) P(s + (len * i) / n, y0, 0, 0.06, winTop - y0, 0.1, mDark);
      C(s, e, y0, topY);
    }
    P((a1 + a2) / 2, winTop - 0.08, 0, a2 - a1, 0.08, 0.12, mDark);
    P((a1 + a2) / 2, winTop, -inward * 0.05, a2 - a1, topY - winTop, 0.36, fascia);
    if (sign) {
      const sh = Math.min(1.2, topY - winTop - 0.28), sw = (sh * 512) / 96;
      const off = -inward * 0.235, yc = (winTop + topY) / 2;
      const ry = axis === "x" ? (inward < 0 ? 0 : PI) : inward < 0 ? PI / 2 : -PI / 2;
      const signs = (a2 - a1) > sw * 2.4 ? [a1 + (a2 - a1) * 0.28, a1 + (a2 - a1) * 0.72] : [(a1 + a2) / 2];
      for (const a of signs) {
        if (axis === "x") panel(sign, sw, sh, a, yc, line + off, ry);
        else panel(sign, sw, sh, line + off, yc, a, ry);
      }
    }
  };
  const S = {
    tune: signMat("TUNE TOWN", "GUITARS · PIANOS · DRUMS", "#1f2a44", "#ffd166", "#ef476f"),
    moda: signMat("MODA LUNA", "WOMEN · MEN · KIDS", "#f5efe6", "#2b2b2b", "#c9a36a"),
    step: signMat("STEP UP", "SHOES & BAGS", "#e85d3a", "#ffffff", "#ffd166"),
    toy: signMat("TOY PLANET", "PLAY MORE!", "#3a86ff", "#ffffff", "#ffbe0b"),
    pixel: signMat("PIXEL PALACE", "ARCADE · PRIZES", "#1b1033", "#39e0ff", "#ff3fa4"),
    fresh: signMat("FRESH MART", "GROCERY · DAILY DEALS", "#2d6a4f", "#ffffff", "#b7e4c7"),
    volt: signMat("VOLTEX", "ELECTRONICS", "#101820", "#4cc9f0", "#f72585"),
    mall: signMat("CHAMELEON MALL", "SHOP · EAT · HIDE", "#ffffff", "#2a9d8f", "#f39ab4"),
  };
  front("x", 14, -28, -14, [[-21, 4]], 1, S.tune);
  front("x", 14, -14, 4, [[-5, 5]], 1, S.moda);
  front("x", 14, 4, 16, [[10, 4]], 1, S.step);
  front("z", 16, 6, 14, [[10, 4]], 1, S.toy);
  front("z", 16, -14, 6, [[-4, 8]], 1, S.pixel);
  front("x", -14, -28, -4, [[-21, 3], [-10, 4]], -1, S.fresh);
  front("x", -14, 4, 16, [[10, 4]], -1, S.volt);
  // entrance portal fascia
  slab(mFascia, -4, 4, 3.3, CH, -14.2, -13.8);
  panel(S.mall, 6.2, 0.75, 0, 3.75, -13.78, 0);
  panel(S.mall, 6.2, 0.75, 0, 3.75, -14.22, PI);

  // shop floors & ceilings
  const shopFloor = (m: Mat, x1: number, x2: number, z1: number, z2: number, unit: number) => {
    const g = new THREE.PlaneGeometry(x2 - x1, z2 - z1);
    g.rotateX(-PI / 2);
    B.add(m, place(g, (x1 + x2) / 2, 0.006, (z1 + z2) / 2), unit);
  };
  const shopCeil = (m: Mat, x1: number, x2: number, z1: number, z2: number) => {
    const g = new THREE.PlaneGeometry(x2 - x1, z2 - z1);
    g.rotateX(PI / 2);
    B.add(m, place(g, (x1 + x2) / 2, CH - 0.01, (z1 + z2) / 2), 2.4);
    downlights(x1, x2, z1, z2, CH - 0.01, 2.4);
  };
  const mVinyl = tm("mall.vinyl", () => M.vinylTiles("#e3e1da", "#d2cfc6"), "#ffffff", { rough: 0.35, bump: 0.2 });
  const mVinylGrey = tm("mall.vinyl", () => M.vinylTiles("#e3e1da", "#d2cfc6"), "#b9bcc2", { rough: 0.35, bump: 0.2 });
  const mPlay = tm("mall.playcarpet", M.playCarpet, "#ffffff", { rough: 0.95, bump: 0.5 });
  const mArcadeFloor = tm("mall.arcadecarpet", M.arcadeCarpet, "#ffffff", { rough: 0.95, bump: 0.5 });
  shopFloor(mLamDark, -28, -14, 14, 24, 3);
  shopFloor(mLam, -14, 4, 14, 24, 3);
  shopFloor(mLam, 4, 16, 14, 24, 3);
  shopFloor(mPlay, 16, 28, 6, 24, 3);
  shopFloor(mArcadeFloor, 16, 28, -14, 6, 3);
  shopFloor(mVinyl, -28, -4, -24, -14, 1.2);
  shopFloor(mVinylGrey, 4, 28, -24, -14, 1.2);
  for (const [x1, x2, z1, z2] of [[-28, -14, 14, 24], [-14, 4, 14, 24], [4, 16, 14, 24], [16, 28, 6, 24], [-28, -4, -24, -14], [4, 28, -24, -14]] as [number, number, number, number][]) shopCeil(mCeil, x1, x2, z1, z2);
  {
    const g = new THREE.PlaneGeometry(12, 20);
    g.rotateX(PI / 2);
    B.add(mCeilDark, place(g, 22, CH - 0.01, -4), 2.4);
  }

  // mid slab (ground floor ceiling / upper floor), 0.6 m thick so it casts the sun's shadow
  const ring = (x1: number, x2: number, z1: number, z2: number, vx: number, vz: number): [number, number, number, number][] => [
    [x1, x2, z1, -vz], [x1, x2, vz, z2], [x1, -vx, -vz, vz], [vx, x2, -vz, vz],
  ];
  for (const [x1, x2, z1, z2] of ring(X0, X1, Z0, Z1, VX, VZ)) { slab(mPlaster, x1, x2, CH, FL - 0.2, z1, z2, 3); col(x1, x2, z1, z2, FL, CH, true); }
  for (const [x1, x2, z1, z2] of ring(-UX - 0.2, UX + 0.2, -UZ - 0.2, UZ + 0.2, VX, VZ)) slab(mFloor, x1, x2, FL - 0.2, FL, z1, z2, 2.4);
  downlights(-16, 16, -14, -VZ, CH - 0.01, 3); downlights(-16, 16, VZ, 14, CH - 0.01, 3);
  downlights(-16, -VX, -VZ, VZ, CH - 0.01, 3); downlights(VX, 16, -VZ, VZ, CH - 0.01, 3);
  downlights(-4, 4, -24, -14, CH - 0.01, 2.5);
  downlights(-28, -16, -14, 14, CH - 0.01, 3);
  // void edge: stone band + warm cove light
  for (const [x1, x2, z1, z2] of [[-VX, VX, -VZ - 0.06, -VZ], [-VX, VX, VZ, VZ + 0.06], [-VX - 0.06, -VX, -VZ, VZ], [VX, VX + 0.06, -VZ, VZ]] as [number, number, number, number][]) {
    slab(mStone, x1, x2, CH - 0.05, FL + 0.02, z1, z2);
  }
  for (const [x1, x2, z1, z2] of [[-VX, VX, -VZ, -VZ + 0.1], [-VX, VX, VZ - 0.1, VZ], [-VX, -VX + 0.1, -VZ, VZ], [VX - 0.1, VX, -VZ, VZ]] as [number, number, number, number][]) {
    slab(mCove, x1 + (x2 - x1 > 1 ? 0 : 0), x2, CH - 0.12, CH - 0.04, z1, z2);
  }

  // upper floor shopfronts (closed glass, shallow lit window displays behind)
  const U = {
    luxe: signMat("LUXE BAGS", "LEATHER GOODS", "#111111", "#e9c46a", "#e9c46a"),
    optix: signMat("OPTIX", "EYEWEAR", "#ffffff", "#1d3557", "#e63946"),
    book: signMat("BOOK NOOK", "BOOKS · COMICS", "#6b3e26", "#fdf0d5", "#e9c46a"),
    sport: signMat("SPORT ZONE", "RUN · KICK · JUMP", "#0b3d91", "#ffffff", "#ffbe0b"),
    candy: signMat("CANDY CLOUD", "SWEETS", "#ff8fab", "#ffffff", "#8ecae6"),
    cine: signMat("MEGA SCREEN", "CINEMA", "#2b0f3a", "#ffd166", "#ef476f"),
    pets: signMat("PET PALS", "PET SUPPLIES", "#2a9d8f", "#ffffff", "#e9c46a"),
    home: signMat("HOME HAVEN", "LIVING · DECOR", "#e9e2d4", "#5e503f", "#a98467"),
    bean: signMat("BEAN & BUN", "COFFEE · BAKERY", "#3b2418", "#f3e9d2", "#c8a165"),
  };
  const WT = FL + 3.1;
  front("x", UZ, -UX, -5, [], 1, U.luxe, FL, RF, WT);
  front("x", UZ, -5, 5, [], 1, U.optix, FL, RF, WT);
  front("x", UZ, 5, UX, [], 1, U.book, FL, RF, WT);
  front("x", -UZ, -UX, -4, [], -1, U.sport, FL, RF, WT);
  front("x", -UZ, -4, 4, [], -1, U.cine, FL, RF, WT);
  front("x", -UZ, 4, UX, [], -1, U.candy, FL, RF, WT);
  front("z", UX, -UZ, 0, [], 1, U.pets, FL, RF, WT);
  front("z", UX, 0, UZ, [], 1, U.home, FL, RF, WT);
  front("z", -UX, -UZ, UZ, [], -1, U.bean, FL, RF, WT);
  // display niches behind the upper glazing
  const niche = (axis: "x" | "z", line: number, a1: number, a2: number, inward: 1 | -1) => {
    const d = 1.3;
    if (axis === "x") {
      slab(mWallWarm, a1, a2, FL, WT + 0.1, line + inward * d, line + inward * (d + 0.1), 2.5);
      slab(mStone, a1, a2, FL - 0.2, FL + 0.05, Math.min(line, line + inward * d), Math.max(line, line + inward * d), 2);
      slab(mLight, a1, a2, WT - 0.04, WT, line + inward * (d - 0.3), line + inward * (d - 0.1));
    } else {
      slab(mWallWarm, line + inward * d, line + inward * (d + 0.1), FL, WT + 0.1, a1, a2, 2.5);
      slab(mStone, Math.min(line, line + inward * d), Math.max(line, line + inward * d), FL - 0.2, FL + 0.05, a1, a2, 2);
      slab(mLight, line + inward * (d - 0.3), line + inward * (d - 0.1), WT - 0.04, WT, a1, a2);
    }
  };
  niche("x", UZ, -UX, UX, 1); niche("x", -UZ, -UX, UX, -1); niche("z", UX, -UZ, UZ, 1); niche("z", -UX, -UZ, UZ, -1);

  // roof slab over the gallery + skylight vault over the void
  for (const [x1, x2, z1, z2] of ring(-UX - 0.3, UX + 0.3, -UZ - 0.3, UZ + 0.3, VX, VZ)) { slab(mPlaster, x1, x2, RF, RF + 0.6, z1, z2, 3); col(x1, x2, z1, z2, RF + 0.6, RF, true); }
  downlights(-16, 16, -14, -VZ, RF, 3); downlights(-16, 16, VZ, 14, RF, 3);
  downlights(-16, -VX, -VZ, VZ, RF, 3); downlights(VX, 16, -VZ, VZ, RF, 3);
  for (const [x1, x2, z1, z2] of [[-VX, VX, -VZ - 0.3, -VZ], [-VX, VX, VZ, VZ + 0.3], [-VX - 0.3, -VX, -VZ, VZ], [VX, VX + 0.3, -VZ, VZ]] as [number, number, number, number][])
    slab(mWhite, x1, x2, RF - 0.2, RF + 0.9, z1, z2);
  {
    const rise = 3, R = (VZ * VZ + rise * rise) / (2 * rise), yc = RF + 0.9 + rise - R, half = Math.asin(VZ / R);
    const vault = new THREE.CylinderGeometry(R, R, 2 * VX, 40, 1, true, PI / 2 - half, 2 * half);
    vault.rotateZ(PI / 2);
    B.add(mGlass, place(vault, 0, yc, 0));
    const arc = (x: number, n = 24): V3t[] => Array.from({ length: n + 1 }, (_, i) => { const a = -half + (2 * half * i) / n; return [x, yc + R * Math.cos(a), R * Math.sin(a)]; });
    for (let x = -VX; x <= VX + 0.01; x += 2) B.add(mWhite, tubeGeo(arc(x), 0.07, 24, 6));
    for (let i = 0; i <= 8; i++) {
      const a = -half + (2 * half * i) / 8;
      B.add(mWhite, beam([-VX, yc + R * Math.cos(a), R * Math.sin(a)], [VX, yc + R * Math.cos(a), R * Math.sin(a)], 0.08, 0.08));
    }
    for (const sx of [-1, 1]) {
      const sh = new THREE.Shape();
      sh.moveTo(-VZ, 0);
      for (let i = 0; i <= 24; i++) { const a = -half + (2 * half * i) / 24; sh.lineTo(R * Math.sin(a), R * Math.cos(a) - (R - rise)); }
      sh.lineTo(VZ, 0);
      const g = new THREE.ShapeGeometry(sh, 8);
      g.rotateY(PI / 2);
      B.add(mGlass, place(g, sx * VX, RF + 0.9, 0));
      for (let z = -6; z <= 6; z += 2) {
        const top = yc + Math.sqrt(R * R - z * z);
        B.add(mWhite, beam([sx * VX, RF + 0.9, z], [sx * VX, top, z], 0.06, 0.06));
      }
    }
  }

  // columns: stone round-cornered, two painted splash pillars like the reference
  const column = (x: number, z: number, s: number, painted: boolean) => {
    if (painted) {
      B.add(mPillar, place(new THREE.BoxGeometry(s, CH, s), x, CH / 2, z));
      B.add(mPillar, place(new THREE.BoxGeometry(s, RF - FL, s), x, (FL + RF) / 2, z));
      slab(mStone, x - s / 2 - 0.02, x + s / 2 + 0.02, CH, FL, z - s / 2 - 0.02, z + s / 2 + 0.02);
    } else {
      B.add(mStone, place(new THREE.BoxGeometry(s, RF, s), x, RF / 2, z), 2);
      slab(mDark, x - s / 2 - 0.02, x + s / 2 + 0.02, 0, 0.12, z - s / 2 - 0.02, z + s / 2 + 0.02);
      slab(mDark, x - s / 2 - 0.02, x + s / 2 + 0.02, FL, FL + 0.12, z - s / 2 - 0.02, z + s / 2 + 0.02);
    }
    col(x - s / 2, x + s / 2, z - s / 2, z + s / 2, RF, 0, false);
  };
  column(VX + 0.8, -VZ - 0.8, 1.5, true);
  column(-VX - 0.8, VZ + 0.8, 1.5, true);
  column(-VX - 0.6, -VZ - 0.6, 1.0, false);
  column(VX + 0.6, VZ + 0.6, 1.0, false);
  column(0, -VZ - 0.6, 1.0, false);
  column(0, VZ + 0.6, 1.0, false);
  column(-VX - 0.6, 0, 1.0, false);
  column(VX + 0.6, 0, 1.0, false);

  // glass railings around the void on the upper floor
  const railing = (x1: number, z1: number, x2: number, z2: number) => {
    const len = Math.hypot(x2 - x1, z2 - z1), n = Math.max(1, Math.round(len / 1.5));
    const alongX = Math.abs(x2 - x1) > Math.abs(z2 - z1);
    const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
    const G2 = (w: number, h: number, t: number, y: number, m: Mat) => B.add(m, place(new THREE.BoxGeometry(alongX ? w : t, h, alongX ? t : w), cx, y + h / 2, cz));
    G2(len, 0.95, 0.02, FL + 0.1, mGlass);
    G2(len, 0.1, 0.1, FL, mSteel);
    G2(len, 0.05, 0.09, FL + 1.05, mDark);
    for (let i = 0; i <= n; i++) {
      const t = i / n, px = x1 + (x2 - x1) * t, pz = z1 + (z2 - z1) * t;
      B.add(mDark, place(new THREE.BoxGeometry(0.05, 1.05, 0.05), px, FL + 0.525, pz));
    }
    col(Math.min(x1, x2) - 0.06, Math.max(x1, x2) + 0.06, Math.min(z1, z2) - 0.06, Math.max(z1, z2) + 0.06, FL + 1.1, FL, true);
  };
  railing(-VX, -VZ + 0.05, VX, -VZ + 0.05);
  railing(-VX, VZ - 0.05, VX, VZ - 0.05);
  railing(VX - 0.05, -VZ, VX - 0.05, -6.35);
  railing(VX - 0.05, -3.4, VX - 0.05, VZ);
  railing(-VX + 0.05, -VZ, -VX + 0.05, 3.4);
  railing(-VX + 0.05, 6.35, -VX + 0.05, VZ);

  // ================================================================ ESCALATORS
  const escalatorPair = (zs: number[], dir: 1 | -1, xTop: number) => {
    const N = 25, rise = FL / N, run = rise / Math.tan(PI / 6), L = N * run, W = 1.0;
    const xA = xTop - dir * L;
    const X = (u: number) => xA + dir * u;
    const zmin = Math.min(...zs) - W / 2 - 0.2, zmax = Math.max(...zs) + W / 2 + 0.2;
    // truss (bronze brushed steel)
    const ts = new THREE.Shape();
    const tp: [number, number][] = [[-1.2, 0], [1.2 / Math.tan(PI / 6) + 0.3, 0], [L, FL - 1.2], [L, FL - 0.06], [0, -0.06]];
    ts.moveTo(dir * tp[0][0], tp[0][1]);
    for (const [u, y] of tp.slice(1)) ts.lineTo(dir * u, y);
    ts.closePath();
    const tg = new THREE.ExtrudeGeometry(ts, { depth: zmax - zmin, bevelEnabled: false });
    B.add(mBronze, place(tg, xA, 0, zmin), 3);
    B.add(mSteel, place(new THREE.BoxGeometry(1.25, 0.03, zmax - zmin), X(-0.62), 0.015, (zmin + zmax) / 2));
    for (const zc of zs) {
      for (let i = 0; i < N; i++) {
        const u0 = i * run, top = (i + 1) * rise;
        I.add("escTread", "#fff", { pos: [X(u0 + run / 2), top - 0.02, zc] });
        I.add("escRiser", "#fff", { pos: [X(u0), top - rise / 2, zc] });
        col(X(u0), X(u0 + run), zc - W / 2 - 0.12, zc + W / 2 + 0.12, top, 0, true);
      }
      for (const s of [-1, 1]) {
        const zb = zc + s * (W / 2 + 0.1);
        const band = (pts: [number, number][], depth: number, m: Mat) => {
          const sh = new THREE.Shape();
          sh.moveTo(dir * pts[0][0], pts[0][1]);
          for (const [u, y] of pts.slice(1)) sh.lineTo(dir * u, y);
          sh.closePath();
          const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false });
          B.add(m, place(g, xA, 0, zb - depth / 2));
        };
        band([[-1.0, 0.16], [0, 0.16], [L, FL + 0.16], [L + 0.9, FL + 0.16], [L + 0.9, FL + 1.0], [L, FL + 1.0], [0, 1.0], [-1.0, 1.0]], 0.02, mGlass);
        band([[-1.1, 0], [0, 0], [L, FL], [L + 1.0, FL], [L + 1.0, FL + 0.17], [L, FL + 0.17], [0, 0.17], [-1.1, 0.17]], 0.16, mSteel);
        const hr: V3t[] = [[X(-1.15), 0.9, zb], [X(-1.05), 1.04, zb], [X(0), 1.04, zb], [X(L), FL + 1.04, zb], [X(L + 0.95), FL + 1.04, zb], [X(L + 1.05), FL + 0.9, zb]];
        for (let i = 0; i < hr.length - 1; i++) B.add(mRubber, beam(hr[i], hr[i + 1], 0.07, 0.07, true, 8));
      }
    }
  };
  escalatorPair([-5.55, -4.2], 1, VX);
  escalatorPair([4.2, 5.55], -1, -VX);

  // ================================================================ PROP BUILDERS
  const bushes = (x1: number, x2: number, z1: number, z2: number, y: number, seed: number, dens = 1.4, flowers = true) => {
    const r = rng(seed);
    const n = Math.max(2, Math.round((x2 - x1) * (z2 - z1) * dens));
    const greens = ["#ffffff", "#d8efc0", "#b9dc98"];
    for (let i = 0; i < n; i++) {
      const s = 0.55 + r() * 0.5;
      const px = x1 + 0.25 + r() * (x2 - x1 - 0.5), pz = z1 + 0.25 + r() * (z2 - z1 - 0.5);
      I.add("bush", greens[i % 3], { pos: [px, y + s * 0.35, pz], scale: [s, s * (0.75 + r() * 0.3), s], rotY: r() * 6 });
      if (flowers && r() < 0.6) for (let f = 0; f < 4; f++) { const a = r() * 6.28, rr = s * 0.42; I.add("flower", r() < 0.8 ? "#fbfaf4" : "#f7c6d9", { pos: [px + Math.cos(a) * rr, y + s * 0.35 + s * 0.25 + r() * 0.1, pz + Math.sin(a) * rr] }); }
    }
  };
  const tree = (x: number, z: number, y: number, h: number, seed: number) => {
    const r = rng(seed);
    B.add(mWoodDark, tubeGeo([[x, y, z], [x + 0.05, y + h * 0.4, z + 0.03], [x - 0.04, y + h * 0.75, z]], 0.07, 10, 6));
    for (let i = 0; i < 6; i++) {
      const a = r() * 6.28, rr = 0.4 + r() * 0.5, s = 0.9 + r() * 0.6;
      I.add("bush", i % 2 ? "#e6f5d6" : "#ffffff", { pos: [x + Math.cos(a) * rr, y + h * (0.65 + r() * 0.3), z + Math.sin(a) * rr], scale: [s * 1.4, s * 1.1, s * 1.4], rotY: r() * 6 });
    }
  };
  const planter = (x: number, z: number, w: number, d: number, h: number, seed: number, trees = 0, y = 0) => {
    B.add(mPlanter, place(new THREE.BoxGeometry(w, h, d), x, y + h / 2, z), 2.2);
    for (const [px, pz, pw, pd] of [[x, z - d / 2 + 0.04, w, 0.08], [x, z + d / 2 - 0.04, w, 0.08], [x - w / 2 + 0.04, z, 0.08, d], [x + w / 2 - 0.04, z, 0.08, d]] as [number, number, number, number][])
      B.add(mCopper, place(new THREE.BoxGeometry(pw + 0.02, 0.04, pd + 0.02), px, y + h + 0.02, pz));
    B.add(mSoil, place(new THREE.BoxGeometry(w - 0.16, 0.04, d - 0.16), x, y + h - 0.04, z));
    bushes(x - w / 2, x + w / 2, z - d / 2, z + d / 2, y + h - 0.05, seed);
    for (let i = 0; i < trees; i++) tree(x + (trees > 1 ? (i / (trees - 1) - 0.5) * (w - 1.2) : 0), z, y + h, y > 1 ? 3.2 : 3.4, seed + i * 7);
    col(x - w / 2, x + w / 2, z - d / 2, z + d / 2, y + h, y, true);
  };
  const bench = (x: number, z: number, ry: number, y = 0, L = 1.8) => {
    const f = fr(x, z, ry);
    for (let i = 0; i < 4; i++) B.add(mWood, f.put(bgeo(L, 0.035, 0.085), 0, y + 0.44, -0.16 + i * 0.105));
    for (let i = 0; i < 3; i++) B.add(mWood, f.put(bgeo(L, 0.085, 0.03), 0, y + 0.6 + i * 0.11, -0.25 - i * 0.02, -0.18));
    for (const s of [-1, 1]) {
      const lx = s * (L / 2 - 0.18);
      B.add(mBlack, f.put(bgeo(0.06, 0.44, 0.06), lx, y + 0.22, 0.16, 0.12));
      B.add(mBlack, f.put(bgeo(0.06, 0.9, 0.06), lx, y + 0.42, -0.22, -0.2));
      B.add(mBlack, f.put(bgeo(0.06, 0.05, 0.5), lx, y + 0.41, -0.02));
      B.add(mBlack, f.put(bgeo(0.06, 0.04, 0.45), lx, y + 0.64, 0.02));
    }
    rcol(x, z, ry, L / 2, 0.3, y + 0.47, y, true);
  };
  const directory = (x: number, z: number, ry: number, y = 0) => {
    const f = fr(x, z, ry);
    const mDir = tm("mall.dir", M.directory, "#ffffff", { rough: 0.3, bump: 0, emissive: 0.6 });
    B.add(mFascia, f.put(bgeo(0.95, 2.3, 0.26), 0, y + 1.15, 0));
    for (const s of [0, PI]) B.add(mDir, f.put(new THREE.PlaneGeometry(0.8, 1.6), 0, y + 1.3, 0, 0, s, 0, [1, 1, 1]).translate(0, 0, 0));
    B.add(em("#2a9d8f", 1.0), f.put(bgeo(0.95, 0.2, 0.28), 0, y + 2.4, 0));
    rcol(x, z, ry, 0.48, 0.14, y + 2.5, y, true);
  };
  // the directory plane must sit on both faces: rebuild with offsets
  const dirFace = (x: number, z: number, ry: number, y = 0) => {
    const f = fr(x, z, ry);
    const mDir = tm("mall.dir", M.directory, "#ffffff", { rough: 0.3, bump: 0, emissive: 0.6 });
    B.add(mDir, f.put(new THREE.PlaneGeometry(0.8, 1.6), 0, y + 1.3, 0.135));
    B.add(mDir, f.put(new THREE.PlaneGeometry(0.8, 1.6), 0, y + 1.3, -0.135, 0, PI, 0));
  };
  void directory;
  const totem = (x: number, z: number, ry: number, y = 0) => {
    const f = fr(x, z, ry);
    B.add(mFascia, f.put(bgeo(0.95, 2.3, 0.26), 0, y + 1.15, 0));
    B.add(em("#2a9d8f", 1.0), f.put(bgeo(0.97, 0.22, 0.28), 0, y + 2.41, 0));
    dirFace(x, z, ry, y);
    rcol(x, z, ry, 0.48, 0.14, y + 2.52, y, true);
  };
  const clothingRack = (x: number, z: number, ry: number, seed: number, len = 1.6, dress = false) => {
    const f = fr(x, z, ry), r = rng(seed);
    for (const s of [-1, 1]) {
      B.add(mChrome, f.put(new THREE.CylinderGeometry(0.018, 0.018, 1.45, 8), s * len / 2, 0.73, 0));
      B.add(mChrome, f.put(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 8), s * len / 2, 0.03, 0, PI / 2));
    }
    B.add(mChrome, f.put(new THREE.CylinderGeometry(0.016, 0.016, len, 8), 0, 1.45, 0, 0, 0, PI / 2));
    const pal = [["#e76f51", "#f4a261", "#e9c46a", "#2a9d8f", "#264653"], ["#ffffff", "#f1faee", "#a8dadc", "#457b9d", "#1d3557"], ["#ffafcc", "#cdb4db", "#bde0fe", "#ffc8dd", "#a2d2ff"], ["#222222", "#6c757d", "#adb5bd", "#e63946", "#f8f9fa"]][seed % 4];
    const n = Math.floor(len / 0.075);
    for (let i = 0; i < n; i++) {
      const lx = -len / 2 + 0.06 + (i * (len - 0.12)) / (n - 1);
      const [px, pz] = f.pt(lx, 0);
      I.add(dress && i % 2 ? "dress" : "shirt", pal[Math.floor(r() * pal.length)], { pos: [px, 1.45, pz], rotY: ry + (r() - 0.5) * 0.15 });
    }
    rcol(x, z, ry, len / 2 + 0.05, 0.3, 1.5, 0, true);
  };
  const roundRack = (x: number, z: number, seed: number) => {
    const r = rng(seed);
    B.add(mChrome, place(new THREE.TorusGeometry(0.6, 0.016, 6, 32), x, 1.35, z, PI / 2));
    B.add(mChrome, place(new THREE.CylinderGeometry(0.025, 0.025, 1.35, 8), x, 0.675, z));
    B.add(mChrome, place(new THREE.CylinderGeometry(0.35, 0.38, 0.03, 20), x, 0.015, z));
    for (const a of [0, PI / 2, PI, -PI / 2]) B.add(mChrome, beam([x, 1.35, z], [x + Math.cos(a) * 0.6, 1.35, z + Math.sin(a) * 0.6], 0.02, 0.02, true, 6));
    const pal = ["#e63946", "#f1faee", "#457b9d", "#ffb703", "#8338ec", "#06d6a0"];
    const c0 = pal[seed % pal.length], c1 = pal[(seed + 2) % pal.length];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * PI * 2;
      I.add("shirt", r() < 0.5 ? c0 : c1, { pos: [x + Math.cos(a) * 0.6, 1.35, z + Math.sin(a) * 0.6], rotY: -a });
    }
    col(x - 0.8, x + 0.8, z - 0.8, z + 0.8, 1.4, 0, true);
  };
  const mannequin = (x: number, z: number, ry: number, y: number, pose: number, color: string, skirt?: string) => {
    I.add(`mq${pose}`, color, { pos: [x, y, z], rotY: ry });
    if (skirt) I.add("skirt", skirt, { pos: [x, y, z], rotY: ry });
  };
  const podium = (x: number, z: number, w: number, d: number, h: number, m: Mat = mWhite) => sbx(m, w, h, d, x, 0, z);
  const foldTable = (x: number, z: number, ry: number, seed: number) => {
    const f = fr(x, z, ry), r = rng(seed);
    B.add(mWood, f.put(bgeo(1.6, 0.06, 0.9), 0, 0.78, 0));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.add(mWoodDark, f.put(bgeo(0.07, 0.75, 0.07), sx * 0.72, 0.375, sz * 0.38));
    B.add(mWood, f.put(bgeo(1.45, 0.03, 0.78), 0, 0.2, 0));
    const pal = ["#f1faee", "#e63946", "#457b9d", "#2a9d8f", "#e9c46a", "#264653", "#ffafcc"];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
      const c = pal[Math.floor(r() * pal.length)], h = 3 + Math.floor(r() * 5);
      for (let s = 0; s < h; s++) { const [px, pz] = f.pt(-0.56 + i * 0.37, -0.2 + j * 0.4); I.add("folded", c, { pos: [px, 0.835 + s * 0.05, pz], rotY: ry + (r() - 0.5) * 0.08 }); }
    }
    rcol(x, z, ry, 0.8, 0.45, 0.81, 0, true);
  };
  const tableSet = (x: number, z: number, ry: number, seed: number, round = false, y = 0) => {
    const r = rng(seed);
    const f = fr(x, z, ry);
    if (round) B.add(mWhite, place(new THREE.CylinderGeometry(0.45, 0.45, 0.04, 28), x, y + 0.73, z));
    else B.add(mLam, f.put(bgeo(0.9, 0.04, 0.9), 0, y + 0.73, 0));
    B.add(mDark, place(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 10), x, y + 0.36, z));
    B.add(mDark, place(new THREE.CylinderGeometry(0.28, 0.3, 0.03, 18), x, y + 0.015, z));
    const cc = ["#e63946", "#f4a261", "#2a9d8f", "#ffb703", "#f1faee", "#118ab2"][seed % 6];
    const nChairs = round ? 3 : 4;
    for (let i = 0; i < nChairs; i++) {
      const a = ry + (i / nChairs) * PI * 2 + (r() - 0.5) * 0.25;
      const d = 0.62 + r() * 0.08;
      const ox = Math.sin(a) * d, oz = Math.cos(a) * d;
      const cry = Math.atan2(-ox, -oz) + (r() - 0.5) * 0.3;
      I.add("chairShell", cc, { pos: [x + ox, y, z + oz], rotY: cry });
      I.add("chairLeg", "#000", { pos: [x + ox, y, z + oz], rotY: cry });
      col(x + ox - 0.22, x + ox + 0.22, z + oz - 0.22, z + oz + 0.22, y + 0.45, y, true);
    }
    // clutter
    const items = Math.floor(r() * 4);
    for (let i = 0; i < items; i++) {
      const [px, pz] = f.pt((r() - 0.5) * 0.5, (r() - 0.5) * 0.5);
      const t = y + 0.75;
      const kind = r();
      if (kind < 0.4) {
        I.add("tray", ["#d62828", "#f77f00", "#2a9d8f"][i % 3], { pos: [px, t + 0.0125, pz], rotY: r() * 3 });
        I.add("bun", "#d99a4e", { pos: [px - 0.08, t + 0.045, pz], rotY: 0 });
        I.add("patty", "#5a2e14", { pos: [px - 0.08, t + 0.05, pz] });
        I.add("fries", "#d62828", { pos: [px + 0.1, t + 0.025, pz + 0.05], rotY: r() });
        I.add("friesTop", "#f6c533", { pos: [px + 0.1, t + 0.13, pz + 0.05], rotY: r() });
      } else if (kind < 0.8) {
        I.add("cup", ["#e63946", "#ffffff", "#ffb703", "#118ab2"][i % 4], { pos: [px, t, pz] });
      } else {
        I.add("bun", "#d99a4e", { pos: [px, t, pz] });
      }
    }
    col(x - 0.46, x + 0.46, z - 0.46, z + 0.46, y + 0.77, y, true);
  };
  const cartonStack = (x: number, z: number, seed: number, w = 1.2, d = 1.0, levels = 3) => {
    const r = rng(seed);
    B.add(mWood, place(bgeo(w, 0.14, d), x, 0.07, z));
    let y = 0.14;
    for (let l = 0; l < levels; l++) {
      const bw = 0.4 + r() * 0.2, bh = 0.3 + r() * 0.2, bd = 0.35 + r() * 0.2;
      for (let bxp = -w / 2 + bw / 2; bxp <= w / 2 - bw / 2 + 0.01; bxp += bw + 0.01)
        for (let bzp = -d / 2 + bd / 2; bzp <= d / 2 - bd / 2 + 0.01; bzp += bd + 0.01)
          if (l < levels - 1 || r() < 0.7) {
            const bry = (r() - 0.5) * 0.08;
            I.add("box", ["#ffffff", "#e8dcc8", "#f4efe6"][Math.floor(r() * 3)], { pos: [x + bxp, y + bh / 2, z + bzp], scale: [bw, bh, bd], rotY: bry });
            B.add(mTape, place(new THREE.BoxGeometry(0.07, 0.004, bd + 0.004), x + bxp, y + bh + 0.002, z + bzp, 0, bry, 0));
            for (const side of [-1, 1]) if (Math.abs(bzp + side * bd / 2) > d / 2 - 0.02 && lr() < 0.7) life.wall(boxLabels[Math.floor(lr() * boxLabels.length)], x + bxp + side * Math.sin(bry) * (bd / 2 + 0.004), y + bh * 0.5, z + bzp + side * Math.cos(bry) * (bd / 2 + 0.004), Math.min(0.2, bw * 0.45), bry + (side < 0 ? PI : 0), (lr() - 0.5) * 0.1);
          }
      y += bh;
    }
    col(x - w / 2, x + w / 2, z - d / 2, z + d / 2, y, 0, true);
  };
  const binLabel = life.label({ text: "\u267b RECYCLE", sub: "cans - bottles - paper", bg: "#2a9d8f", fg: "#ffffff", px: [200, 120] });
  const mTape = sc("#c9a867", 0.35);
  const trash = (x: number, z: number, y = 0) => {
    B.add(mSteel, place(lathe([[0.001, 0], [0.22, 0], [0.24, 0.8], [0.25, 0.85], [0.001, 0.86]], 20), x, y, z));
    B.add(mSteel, place(lathe([[0.001, 0.85], [0.26, 0.85], [0.26, 0.9], [0.2, 1.0], [0.001, 1.02]], 20), x, y, z));
    for (const s2 of [0, PI]) B.add(mBlack, place(new THREE.BoxGeometry(0.2, 0.08, 0.02), x + Math.sin(s2) * 0.215, y + 0.92, z + Math.cos(s2) * 0.215, -0.55 * Math.cos(s2), s2, 0));
    B.add(mBlack, place(new THREE.CylinderGeometry(0.262, 0.262, 0.06, 20, 1, true), x, y + 0.08, z));
    for (const s2 of [0, PI]) life.wall(binLabel, x + Math.sin(s2) * 0.232, y + 0.55, z + Math.cos(s2) * 0.232, 0.2, s2);
    col(x - 0.25, x + 0.25, z - 0.25, z + 0.25, y + 0.86, y, true);
  };
  const potPlant = (x: number, z: number, s: number, seed: number, y = 0) => {
    B.add(mBlack, place(lathe([[0.001, 0], [0.26 * s, 0], [0.32 * s, 0.55 * s], [0.34 * s, 0.6 * s], [0.001, 0.6 * s]], 20), x, y, z));
    const r = rng(seed);
    for (let i = 0; i < 4; i++) I.add("bush", "#ffffff", { pos: [x + (r() - 0.5) * 0.3 * s, y + 0.8 * s + i * 0.25 * s, z + (r() - 0.5) * 0.3 * s], scale: [0.7 * s, 0.9 * s, 0.7 * s], rotY: r() * 6 });
    col(x - 0.34 * s, x + 0.34 * s, z - 0.34 * s, z + 0.34 * s, y + 0.6 * s, y, true);
  };
  const wallShelf = (axis: "x" | "z", line: number, a1: number, a2: number, inward: 1 | -1, levels: number[], depth = 0.4, y0 = 0, m: Mat = mWhite) => {
    const L = a2 - a1, c = (a1 + a2) / 2, off = line + inward * depth / 2;
    const top = levels[levels.length - 1] + 0.05;
    for (const y of levels) {
      if (axis === "x") B.add(m, place(bgeo(L, 0.035, depth), c, y0 + y, off)); else B.add(m, place(bgeo(depth, 0.035, L), off, y0 + y, c));
    }
    for (let a = a1; a <= a2 + 0.01; a += L / Math.max(1, Math.round(L / 1.2))) {
      if (axis === "x") B.add(m, place(bgeo(0.035, top, depth), a, y0 + top / 2, off)); else B.add(m, place(bgeo(depth, top, 0.035), off, y0 + top / 2, a));
    }
    if (axis === "x") col(a1, a2, line, line + inward * depth, y0 + top, y0, true); else col(line, line + inward * depth, a1, a2, y0 + top, y0, true);
  };

  // ================================================================ ATRIUM (ground floor)
  // giant glossy balloon sculpture in a round planter
  {
    const x = -5.3, z = -0.6;
    B.add(mPlanter, place(new THREE.CylinderGeometry(2.1, 2.1, 0.7, 48), x, 0.35, z), 2.2);
    B.add(mCopper, place(new THREE.TorusGeometry(2.08, 0.035, 6, 48), x, 0.71, z, PI / 2));
    B.add(mSoil, place(new THREE.CylinderGeometry(2.0, 2.0, 0.04, 40), x, 0.68, z));
    const r = rng(41);
    for (let i = 0; i < 26; i++) {
      const a = r() * 6.28, rr = 0.9 + r() * 0.9, s = 0.55 + r() * 0.45;
      I.add("bush", ["#ffffff", "#d8efc0"][i % 2], { pos: [x + Math.cos(a) * rr, 0.68 + s * 0.35, z + Math.sin(a) * rr], scale: [s, s * 0.85, s], rotY: r() * 6 });
      if (r() < 0.7) for (let f = 0; f < 3; f++) I.add("flower", "#fbfaf4", { pos: [x + Math.cos(a) * rr + (r() - 0.5) * 0.4, 0.68 + s * 0.7, z + Math.sin(a) * rr + (r() - 0.5) * 0.4] });
    }
    const teal = sc("#2cb5c4", 0.12, 0.15), mag = sc("#b5286e", 0.14, 0.15), pink = sc("#f090b4", 0.14, 0.1);
    B.add(mChrome, place(new THREE.CylinderGeometry(0.1, 0.14, 8.6, 12), x, 4.3, z));
    B.add(teal, place(new THREE.SphereGeometry(1.45, 36, 24), x + 0.2, 5.6, z));
    B.add(pink, place(new THREE.SphereGeometry(0.85, 28, 18), x + 1.3, 2.6, z + 0.8));
    B.add(teal, place(new THREE.SphereGeometry(0.6, 24, 16), x - 1.1, 7.9, z - 0.4));
    const helix: V3t[] = [];
    for (let i = 0; i <= 40; i++) { const t = i / 40, a = t * PI * 3.2; helix.push([x + Math.cos(a) * 1.6, 1.6 + t * 6.8, z + Math.sin(a) * 1.6]); }
    B.add(mag, tubeGeo(helix, 0.38, 120, 14));
    B.add(teal, place(new THREE.TorusGeometry(1.2, 0.34, 14, 36), x - 0.3, 8.6, z + 0.3, 1.1, 0.4));
    B.add(mag, place(new THREE.TorusGeometry(0.9, 0.3, 14, 32), x + 1.0, 3.9, z - 0.9, 0.3, 1.2));
    col(x - 1.5, x + 1.5, z - 1.5, z + 1.5, 0.7, 0, true);
    col(x - 0.15, x + 0.15, z - 0.15, z + 0.15, 8.6, 0.7, true);
    col(x - 1.2, x + 1.6, z - 1.2, z + 1.2, 7.0, 4.3, true);
    col(x + 0.6, x + 2.0, z + 0.1, z + 1.5, 3.4, 1.8, true);
  }
  // tiered round handbag display
  {
    const x = 5.4, z = 0.4;
    const r = rng(52);
    cyl(mWood, 2.0, 2.0, 0.34, x, 0, z, 48);
    cyl(mBlack, 1.86, 1.86, 0.08, x, 0.34, z, 48);
    cyl(mWood, 1.95, 1.95, 0.06, x, 0.42, z, 48);
    cyl(mWhite, 1.2, 1.2, 1.08, x, 0.48, z, 40);
    cyl(mWood, 1.72, 1.72, 0.12, x, 1.56, z, 44);
    cyl(mWhite, 1.02, 1.02, 0.88, x, 1.68, z, 36);
    cyl(mWood, 1.5, 1.5, 0.12, x, 2.56, z, 40);
    cyl(mWhite, 0.8, 0.8, 0.7, x, 2.68, z, 32);
    cyl(mBlack, 0.85, 0.75, 0.5, x, 3.38, z, 32);
    for (let i = 0; i < 6; i++) { const a = r() * 6.28; I.add("bush", "#ffffff", { pos: [x + Math.cos(a) * 0.4, 4.05 + r() * 0.3, z + Math.sin(a) * 0.4], scale: [0.8, 1.1, 0.8], rotY: r() * 6 }); }
    const bagCols = ["#8fd1b5", "#f08a8a", "#f3eee4", "#3d4e6b", "#6e7f96", "#e0b84a"];
    for (let i = 0; i < 14; i++) { const a = (i / 14) * PI * 2; I.add("bag", bagCols[i % bagCols.length], { pos: [x + Math.cos(a) * 1.58, 0.48, z + Math.sin(a) * 1.58], rotY: -a + PI / 2 }); }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * PI * 2;
      if (i % 3 === 0) I.add("bag", "#34507d", { pos: [x + Math.cos(a) * 1.4, 1.68, z + Math.sin(a) * 1.4], rotY: -a + PI / 2, scale: [1.3, 1.1, 1.8] });
      else for (let s = 0; s < 2; s++) I.add("giftBox", "#efe7d8", { pos: [x + Math.cos(a) * 1.4, 1.78 + s * 0.2, z + Math.sin(a) * 1.4], rotY: -a });
    }
    for (let i = 0; i < 10; i++) { const a = (i / 10) * PI * 2; I.add("bag", i % 2 ? "#d9b441" : "#c9a33a", { pos: [x + Math.cos(a) * 1.18, 2.68, z + Math.sin(a) * 1.18], rotY: -a + PI / 2, scale: [1.1, 1.2, 1.3] }); }
    col(x - 1.6, x + 1.6, z - 1.6, z + 1.6, 0.44, 0, true);
    col(x - 1.4, x + 1.4, z - 1.4, z + 1.4, 1.68, 0, true);
    col(x - 1.1, x + 1.1, z - 1.1, z + 1.1, 2.68, 0, true);
    col(x - 0.8, x + 0.8, z - 0.8, z + 0.8, 3.88, 0, true);
  }
  // planters with benches around the concourse
  planter(-12.6, -10.8, 4.2, 1.3, 0.8, 11, 1);
  bench(-12.6, -9.65, 0);
  planter(12.6, -10.8, 4.2, 1.3, 0.8, 12, 1);
  bench(12.6, -9.65, 0);
  planter(-5.2, 10.6, 4.6, 1.3, 0.8, 13, 1);
  bench(-5.2, 9.45, PI);
  planter(5.2, 10.6, 4.6, 1.3, 0.8, 14, 1);
  bench(5.2, 9.45, PI);
  planter(13.2, 2.2, 1.3, 4.0, 0.8, 15, 1);
  bench(12.05, 2.2, -PI / 2);
  // directory totems and kiosk carts
  totem(-6.2, -13.2, 0);
  totem(7.0, -13.2, 0);
  totem(-11.2, 9.2, PI / 2);
  const kiosk = (x: number, z: number, ry: number, seed: number, stripe: string) => {
    const f = fr(x, z, ry), r = rng(seed);
    B.add(mWood, f.put(bgeo(1.9, 0.9, 0.95), 0, 0.5, 0));
    B.add(mWhite, f.put(bgeo(2.0, 0.05, 1.05), 0, 0.975, 0));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.add(mChrome, f.put(new THREE.CylinderGeometry(0.02, 0.02, 1.3, 8), sx * 0.92, 1.65, sz * 0.46));
    B.add(sc(stripe, 0.8), f.put(bgeo(2.2, 0.12, 1.25), 0, 2.33, 0));
    B.add(sc("#ffffff", 0.8), f.put(bgeo(2.1, 0.06, 1.15), 0, 2.42, 0));
    for (const wx of [-1, 1]) for (const sz of [-1, 1]) B.add(mDark, f.put(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 12), wx * 0.75, 0.1, sz * 0.4, PI / 2));
    for (let i = 0; i < 10; i++) { const [px, pz] = f.pt(-0.8 + (i % 5) * 0.4, -0.25 + Math.floor(i / 5) * 0.5); I.add("giftBox", ["#f72585", "#4cc9f0", "#ffd166", "#06d6a0"][Math.floor(r() * 4)], { pos: [px, 1.1, pz], rotY: ry, scale: [0.8, 0.5, 0.8] }); }
    rcol(x, z, ry, 1.0, 0.55, 1.0, 0, true);
    rcol(x, z, ry, 1.1, 0.62, 2.48, 2.27, true);
  };
  kiosk(13.0, 10.6, PI / 2, 61, "#f39ab4");
  kiosk(-13.0, -3.0, PI / 2, 62, "#35c3cf");
  // floor merchandise
  cartonStack(-1.2, 11.8, 71, 1.2, 1.0, 3);
  cartonStack(1.2, 12.0, 72, 1.0, 1.0, 2);
  cartonStack(14.3, -12.6, 73, 1.2, 1.0, 3);
  {
    const sale = tm("mall.sale", () => M.poster("SALE", "UP TO 70%", "#e63946", "#ffffff"), "#ffffff", { rough: 0.5, bump: 0 });
    for (const [x, z, ry] of [[0, 10.9, PI], [14.3, -11.95, 0], [-8.4, -13.3, 0]] as [number, number, number][]) {
      const f = fr(x, z, ry);
      B.add(mChrome, f.put(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 8), 0, 0.6, 0));
      B.add(mChrome, f.put(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 16), 0, 0.01, 0));
      B.add(sale, f.put(new THREE.PlaneGeometry(0.5, 0.75), 0, 1.45, 0.012));
      B.add(sale, f.put(new THREE.PlaneGeometry(0.5, 0.75), 0, 1.45, -0.012, 0, PI));
    }
  }
  trash(-8.2, -8.2); trash(8.4, -8.1); trash(-10.8, 11.8); trash(10.9, 12.2);
  potPlant(-9.2, -13.2, 1.3, 81); potPlant(9.0, -13.3, 1.3, 82); potPlant(15.3, -2.6, 1.2, 83); potPlant(15.3, 13.2, 1.2, 84);

  // ================================================================ FOOD COURT (west)
  const stall = (z1: number, z2: number, name: string, tag: string, bg: string, accent: string, seed: number) => {
    const W = z2 - z1, zc = (z1 + z2) / 2;
    const mTile = tm(`mall.tile.${seed}`, () => T.tiles("#fbfaf7", bg, 8, "rgba(0,0,0,0.18)"), "#ffffff", { rough: 0.25, bump: 0.35 });
    B.add(mTile, place(new THREE.PlaneGeometry(W, CH), X0 + 0.01, CH / 2, zc, 0, PI / 2), 1.6);
    // counter with a gap for staff
    const c1 = z1 + 1.7, c2 = z2 - 0.2;
    const mFront = sc(bg, 0.5);
    B.add(mFront, place(bgeo(0.85, 1.0, c2 - c1), -24.85, 0.5, (c1 + c2) / 2));
    B.add(mSteel, place(bgeo(1.0, 0.05, c2 - c1 + 0.1), -24.85, 1.02, (c1 + c2) / 2));
    B.add(sc(accent, 0.4), place(new THREE.BoxGeometry(0.02, 0.18, c2 - c1), -24.41, 0.75, (c1 + c2) / 2));
    col(-25.3, -24.4, c1, c2, 1.05, 0, true);
    // kitchen line
    B.add(mSteel, place(bgeo(0.8, 0.9, W - 0.4), X0 + 0.45, 0.45, zc));
    col(X0, X0 + 0.85, z1 + 0.2, z2 - 0.2, 0.92, 0, true);
    B.add(mSteel, place(bgeo(0.9, 0.6, W - 0.6), X0 + 0.45, 2.3, zc));
    B.add(mBlack, place(new THREE.BoxGeometry(0.6, 0.04, 1.2), X0 + 0.45, 0.92, zc - W / 4));
    for (let i = 0; i < 2; i++) B.add(mDark, place(bgeo(0.5, 0.16, 0.4), X0 + 0.45, 0.98, zc + 0.5 + i * 0.5));
    // menu boards
    const mMenu = tm(`mall.menu.${seed}`, () => M.fastMenu(name, "#1b1b1b", accent, seed), "#ffffff", { rough: 0.3, bump: 0, emissive: 0.85 });
    for (let i = 0; i < 3; i++) {
      const zz = zc + (i - 1) * (W / 3.2);
      B.add(mBlack, place(new THREE.BoxGeometry(0.06, 1.05, 2.1), X0 + 0.95, 3.2, zz));
      panel(mMenu, 2.0, 1.0, X0 + 0.99, 3.2, zz, PI / 2);
    }
    // canopy with sign
    const mSign = signMat(name, tag, bg, "#ffffff", accent);
    B.add(sc(bg, 0.5), place(new THREE.BoxGeometry(0.4, CH - 3.1, W), -24.3, (3.1 + CH) / 2, zc));
    panel(mSign, Math.min(W - 0.6, 4.6), 0.86, -24.09, (3.1 + CH) / 2, zc, PI / 2);
    // registers, trays, cups, soda fountain
    for (const dz of [-1.2, 1.4]) {
      B.add(mDark, place(bgeo(0.3, 0.12, 0.35), -24.85, 1.05, zc + dz));
      B.add(mBlack, place(bgeo(0.04, 0.26, 0.34), -24.85, 1.2, zc + dz, 0, 0, 0.35));
    }
    for (let i = 0; i < 6; i++) I.add("tray", accent, { pos: [-24.7, 1.06 + i * 0.026, c2 - 0.4] });
    for (let i = 0; i < 4; i++) I.add("cup", i % 2 ? "#ffffff" : accent, { pos: [-24.6, 1.045, zc - 0.2 + i * 0.1] });
    B.add(mSteel, place(bgeo(0.6, 0.75, 0.9), X0 + 0.45, 0.92, z2 - 1.0));
    col(X0, X0 + 0.9, z2 - 1.5, z2 - 0.5, 1.7, 0, true);
  };
  // dividers between stalls
  for (const z of [-13.9, -4.6, 4.6, 13.9]) slab(mWallWarm, X0, -24.1, 0, CH, z - 0.1, z + 0.1, 2.5, true, false);
  stall(-13.8, -4.7, "BURGER BLAST", "BURGERS · FRIES · SHAKES", "#d62828", "#f6c533", 1);
  stall(-4.5, 4.5, "NOODLE NOVA", "RAMEN · WOK · DUMPLINGS", "#1d3557", "#e63946", 2);
  stall(4.7, 13.8, "TACO TORNADO", "TACOS · BURRITOS", "#2a9d8f", "#ffb703", 3);
  // giant burger statue in front of BURGER BLAST
  {
    const x = -22.8, z = -9.6;
    const bun = sc("#d8913a", 0.35), patty = sc("#5a2e14", 0.7), lettuce = sc("#6fbf3a", 0.6), cheese = sc("#f6c533", 0.4);
    cyl(mDark, 0.7, 0.75, 0.3, x, 0, z, 28);
    B.add(bun, place(new THREE.CylinderGeometry(0.62, 0.58, 0.18, 28), x, 0.39, z));
    B.add(patty, place(new THREE.CylinderGeometry(0.66, 0.66, 0.18, 28), x, 0.57, z));
    B.add(cheese, place(new THREE.BoxGeometry(1.15, 0.03, 1.15), x, 0.67, z, 0, 0.4, 0));
    B.add(lettuce, place(new THREE.CylinderGeometry(0.72, 0.7, 0.06, 20), x, 0.71, z));
    B.add(bun, place(new THREE.SphereGeometry(0.64, 28, 14, 0, PI * 2, 0, PI / 2), x, 0.74, z, 0, 0, 0, [1, 0.72, 1]));
    col(x - 0.7, x + 0.7, z - 0.7, z + 0.7, 1.2, 0, true);
  }
  // tables
  {
    let s = 100;
    for (const x of [-21.4, -18.2, -15.0, -11.8]) for (const z of [-11.2, -7.6, -4.0, 4.0, 7.6, 11.2]) {
      if (x === -21.4 && z === -11.2) continue;
      tableSet(x, z, (s % 3) * 0.3, s, s % 4 === 1);
      s++;
    }
    planter(-17.6, 0, 8.0, 1.3, 0.75, 17, 2);
    bench(-17.6, 1.15, PI);
    bench(-17.6, -1.15, 0);
  }
  // tray return + bins
  sbx(mWoodDark, 1.6, 1.05, 0.6, -12.0, 0, -13.5);
  trash(-14.2, -13.4); trash(-14.2, 13.4);

  // ================================================================ TUNE TOWN (instruments, NW)
  {
    const r = rng(200);
    const mSlat = tm("mall.slat", () => M.slatwall("#2b2d33"), "#ffffff", { rough: 0.7, bump: 0.4 });
    B.add(mSlat, place(new THREE.PlaneGeometry(13.4, CH - 0.1), -21, CH / 2, Z1 - 0.01, 0, PI), 2);
    const gcols = ["#b5332e", "#d68a2c", "#1b1b1b", "#f4f1e8", "#2c5aa0", "#6b3a1e", "#16867a", "#f2c14e"];
    for (let row = 0; row < 2; row++) for (let i = 0; i < 22; i++) {
      const x = -27.2 + i * 0.58;
      const y = 0.95 + row * 1.45;
      I.add("gtrBody", gcols[Math.floor(r() * gcols.length)], { pos: [x, y, Z1 - 0.12], rotY: PI });
      I.add("gtrNeck", "#000", { pos: [x, y, Z1 - 0.12], rotY: PI });
    }
    col(-28, -14, Z1 - 0.25, Z1, 3.7, 0, true);
    // guitars on floor stands
    for (let i = 0; i < 7; i++) {
      const x = -19 + i * 0.62, z = 15.6;
      I.add("gtrBody", gcols[(i * 3) % gcols.length], { pos: [x, 0.12, z], rotY: 0, rotX: -0.18 });
      I.add("gtrNeck", "#000", { pos: [x, 0.12, z], rotY: 0, rotX: -0.18 });
      B.add(mBlack, beam([x - 0.15, 0, z + 0.1], [x, 0.4, z - 0.05], 0.025, 0.025, true, 6));
      B.add(mBlack, beam([x + 0.15, 0, z + 0.1], [x, 0.4, z - 0.05], 0.025, 0.025, true, 6));
      B.add(mBlack, beam([x, 0, z - 0.25], [x, 0.4, z - 0.05], 0.025, 0.025, true, 6));
    }
    col(-19.4, -14.9, 15.2, 16.0, 1.3, 0, true);
    // upright pianos along the west wall
    const mPiano = sc("#0d0d0d", 0.15, 0.1);
    const mKeys = tm("mall.keys", M.pianoKeys, "#ffffff", { rough: 0.3, bump: 0 });
    for (const z of [16.4, 19.4]) {
      B.add(mPiano, place(bgeo(0.62, 1.28, 1.52), X0 + 0.35, 0.64, z));
      B.add(mPiano, place(bgeo(0.3, 0.1, 1.52), X0 + 0.8, 0.68, z));
      B.add(mKeys, place(new THREE.PlaneGeometry(1.4, 0.2), X0 + 0.82, 0.735, z, -PI / 2, 0, PI / 2));
      for (const s of [-1, 1]) B.add(mPiano, place(bgeo(0.06, 0.68, 0.06), X0 + 0.9, 0, z + s * 0.7).translate(0, 0.34, 0));
      B.add(mPiano, place(bgeo(0.36, 0.5, 0.8), X0 + 1.45, 0.25, z));
      col(X0, X0 + 0.95, z - 0.76, z + 0.76, 1.28, 0, true);
      col(X0 + 1.27, X0 + 1.63, z - 0.4, z + 0.4, 0.5, 0, true);
    }
    // grand piano
    {
      const x = -18.4, z = 20.2, ry = 0.5;
      const f = fr(x, z, ry);
      const sh = new THREE.Shape();
      sh.moveTo(-0.75, -0.9); sh.lineTo(0.75, -0.9); sh.lineTo(0.75, 0.2); sh.bezierCurveTo(0.75, 0.9, 0.2, 0.7, 0.05, 1.2); sh.bezierCurveTo(-0.2, 1.7, -0.75, 1.3, -0.75, 0.9); sh.closePath();
      const body = new THREE.ExtrudeGeometry(sh, { depth: 0.32, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1, curveSegments: 12 });
      body.rotateX(PI / 2);
      B.add(mPiano, f.put(body, 0, 0.98, 0));
      const lid = new THREE.ExtrudeGeometry(sh, { depth: 0.025, bevelEnabled: false, curveSegments: 12 });
      lid.rotateX(PI / 2);
      lid.translate(0.75, 0, 0);
      lid.rotateZ(0.6);
      lid.translate(-0.75, 0, 0);
      B.add(mPiano, f.put(lid, 0, 1.02, 0));
      B.add(mPiano, f.put(bgeo(1.5, 0.12, 0.32), 0, 0.72, -1.05));
      B.add(mKeys, f.put(new THREE.PlaneGeometry(1.4, 0.2), 0, 0.785, -1.1, -PI / 2));
      for (const [lx, lz] of [[-0.65, -0.8], [0.65, -0.8], [-0.4, 1.1]] as [number, number][]) B.add(mPiano, f.put(lathe([[0.05, 0], [0.07, 0.3], [0.06, 0.66], [0.001, 0.67]], 12), lx, 0, lz));
      B.add(mPiano, f.put(bgeo(0.8, 0.48, 0.36), 0, 0.24, -1.6));
      rcol(x, z, ry, 0.8, 1.0, 0.98, 0, true);
      const [bx0, bz0] = f.pt(0, -1.6);
      col(bx0 - 0.4, bx0 + 0.4, bz0 - 0.3, bz0 + 0.3, 0.48, 0, true);
    }
    // drum kit on a riser
    {
      const x = -24.2, z = 21.4;
      sbx(sc("#7a1f2b", 0.9), 2.6, 0.22, 2.2, x, 0, z);
      const shell = sc("#c1121f", 0.25, 0.4), head = sc("#f4f1e8", 0.6), brass = sc("#d4a441", 0.25, 0.9);
      const y = 0.22;
      B.add(shell, place(new THREE.CylinderGeometry(0.3, 0.3, 0.42, 24), x, y + 0.3, z, PI / 2));
      B.add(head, place(new THREE.CylinderGeometry(0.29, 0.29, 0.43, 24, 1, true), x, y + 0.3, z, PI / 2).scale(1, 1, 1));
      for (const [dx, dy, dz, rr, hh] of [[-0.25, 0.78, -0.05, 0.14, 0.2], [0.25, 0.78, -0.05, 0.15, 0.22], [0.6, 0.45, 0.2, 0.2, 0.32], [-0.5, 0.55, 0.35, 0.18, 0.14]] as [number, number, number, number, number][]) {
        B.add(shell, place(new THREE.CylinderGeometry(rr, rr, hh, 20), x + dx, y + dy, z + dz, 0.2));
        B.add(head, place(new THREE.CylinderGeometry(rr * 0.98, rr * 0.98, 0.01, 20), x + dx, y + dy + hh / 2, z + dz, 0.2));
        B.add(mChrome, beam([x + dx, y, z + dz], [x + dx, y + dy - hh / 2, z + dz], 0.025, 0.025, true, 6));
      }
      for (const [dx, dy, dz] of [[-0.8, 1.2, -0.1], [0.8, 1.3, -0.2], [-0.75, 0.9, 0.5]] as V3t[]) {
        B.add(brass, place(new THREE.CylinderGeometry(0.24, 0.24, 0.01, 24), x + dx, y + dy, z + dz, 0.15));
        B.add(mChrome, beam([x + dx, y, z + dz], [x + dx, y + dy, z + dz], 0.02, 0.02, true, 6));
      }
      B.add(mBlack, place(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 16), x, y + 0.5, z + 0.75));
      B.add(mChrome, beam([x, y, z + 0.75], [x, y + 0.46, z + 0.75], 0.03, 0.03, true, 6));
      col(x - 0.9, x + 0.9, z - 0.4, z + 0.5, y + 1.0, 0, true);
    }
    // amplifier stacks along the east wall
    const mGrill = tm("mall.grill", () => M.fabric("#303030", 9), "#ffffff", { rough: 0.95, bump: 0.6 });
    for (let i = 0; i < 4; i++) {
      const z = 15.6 + i * 1.1, h = 1 + (i % 3);
      for (let j = 0; j < h; j++) {
        B.add(mBlack, place(bgeo(0.36, 0.52, 0.7), -14.35, 0.26 + j * 0.53, z));
        B.add(mGrill, place(new THREE.PlaneGeometry(0.62, 0.36), -14.535, 0.24 + j * 0.53, z, 0, -PI / 2));
        B.add(sc("#d4a441", 0.3, 0.9), place(new THREE.BoxGeometry(0.01, 0.05, 0.5), -14.535, 0.47 + j * 0.53, z));
      }
      col(-14.55, -14.15, z - 0.36, z + 0.36, 0.53 * h, 0, true);
    }
    // keyboards on stands
    for (const [x, z] of [[-22.4, 17.0], [-22.4, 18.6]] as [number, number][]) {
      B.add(mBlack, place(bgeo(1.2, 0.1, 0.35), x, 0.82, z));
      B.add(mKeys, place(new THREE.PlaneGeometry(1.1, 0.16), x, 0.875, z + 0.06, -PI / 2));
      for (const s of [-1, 1]) { B.add(mBlack, beam([x - 0.4, 0, z + s * 0.2], [x + 0.4, 0.8, z - s * 0.2], 0.03, 0.03, true, 6)); B.add(mBlack, beam([x + 0.4, 0, z + s * 0.2], [x - 0.4, 0.8, z - s * 0.2], 0.03, 0.03, true, 6)); }
      col(x - 0.6, x + 0.6, z - 0.2, z + 0.2, 0.88, 0, true);
    }
    // counter
    sbx(mWoodDark, 2.2, 1.05, 0.7, -16.4, 0, 22.6);
    B.add(mDark, place(bgeo(0.35, 0.3, 0.05), -16.4, 1.2, 22.5));
  }

  // ================================================================ MODA LUNA (fashion)
  {
    const mqW = "#f3f0ea", mqB = "#2b2b2b", mqT = "#e2cdb4";
    // window podiums with mannequin clusters
    podium(-10.8, 15.0, 5.6, 1.2, 0.3);
    podium(0.9, 15.0, 5.6, 1.2, 0.3);
    const wm: [number, number, number, number, string, string | undefined][] = [
      [-12.8, 15.0, 0.3, 0, mqW, "#e76f51"], [-11.6, 14.9, -0.2, 1, mqW, undefined], [-10.2, 15.1, 0.2, 2, mqB, "#f4f1de"], [-8.8, 14.9, -0.3, 0, mqW, "#2a9d8f"],
      [-1.2, 15.0, 0.25, 1, mqW, "#ffafcc"], [0.2, 14.9, -0.1, 0, mqT, undefined], [1.6, 15.1, 0.3, 2, mqW, "#bde0fe"], [3.0, 14.95, -0.2, 0, mqB, "#e9c46a"],
    ];
    for (const [x, z, ry, pose, c, sk] of wm) mannequin(x, z, ry, 0.3, pose, c, sk);
    // central mannequin cluster
    B.add(mWhite, place(new THREE.CylinderGeometry(1.5, 1.5, 0.25, 40), -5, 0.125, 19.4));
    col(-6.1, -3.9, 18.3, 20.5, 0.25, 0, true);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2 + 0.3, rr = i === 5 ? 0 : 0.95;
      mannequin(-5 + Math.cos(a) * rr, 19.4 + Math.sin(a) * rr, -a + PI / 2 + 0.4, 0.25, i % 3, [mqW, mqW, mqT, mqW, mqB, mqW][i], i % 2 ? ["#e63946", "#457b9d", "#f1faee"][i % 3] : undefined);
    }
    col(-6.1, -3.9, 18.3, 20.5, 2.0, 0.25, true);
    // racks
    clothingRack(-11.2, 17.6, 0, 1); clothingRack(-11.2, 19.4, 0, 2, 1.6, true); clothingRack(-8.3, 17.6, 0, 3); clothingRack(-8.3, 19.4, 0, 0, 1.6, true);
    clothingRack(-1.6, 21.6, PI / 2, 2); clothingRack(0.4, 21.6, PI / 2, 1, 1.6, true);
    roundRack(-8.6, 22.2, 1); roundRack(-1.6, 18.2, 3); roundRack(1.4, 18.2, 4);
    foldTable(-5.0, 16.4, 0, 21);
    // wall rail along the north wall with side-hung garments
    {
      const r = rng(230);
      B.add(mChrome, place(new THREE.CylinderGeometry(0.018, 0.018, 11, 8), -6.4, 1.8, Z1 - 0.35, 0, 0, PI / 2));
      const pal = ["#e63946", "#f1faee", "#a8dadc", "#457b9d", "#1d3557", "#ffb703", "#fb8500", "#8ecae6"];
      for (let i = 0; i < 130; i++) { const x = -11.8 + i * 0.083; I.add(i % 5 === 0 ? "dress" : "shirt", pal[Math.floor(r() * pal.length)], { pos: [x, 1.8, Z1 - 0.35], rotY: (r() - 0.5) * 0.2 }); }
      col(-12, -0.8, Z1 - 0.7, Z1, 1.85, 0, true);
    }
    // fitting rooms
    {
      const mCurtain = tm("mall.fabric", () => M.fabric(), "#9d4edd", { rough: 0.9, bump: 0.35 });
      for (const z of [19.6, 21.0, 22.4, 23.8]) slab(mWhite, -14, -12.4, 0, 2.3, z - 0.05, z + 0.05, 2, true, true);
      slab(mWhite, -12.45, -12.35, 2.2, 2.3, 19.6, 23.8);
      for (const z of [20.3, 21.7, 23.1]) {
        B.add(mCurtain, place(new THREE.PlaneGeometry(0.8, 2.0), -12.4, 1.1, z - 0.3, 0, PI / 2));
        B.add(sc("#c9b79c", 0.2, 0.8), place(new THREE.PlaneGeometry(0.5, 1.2), -13.87, 1.2, z, 0, PI / 2));
        B.add(mWood, place(bgeo(0.35, 0.05, 0.9), -13.7, 0.45, z));
      }
    }
    // cubby shelves on the east wall with folded clothes
    wallShelf("z", 4 - 0.12, 15.0, 22.6, -1, [0.4, 0.8, 1.2, 1.6, 2.0], 0.45, 0, mWood);
    {
      const r = rng(240);
      const pal = ["#f1faee", "#e63946", "#457b9d", "#2a9d8f", "#e9c46a", "#264653", "#ffafcc", "#adb5bd"];
      for (const y of [0.42, 0.82, 1.22, 1.62, 2.02]) for (let z = 15.3; z < 22.4; z += 0.4) { const c = pal[Math.floor(r() * pal.length)]; for (let s = 0; s < 3 + Math.floor(r() * 3); s++) I.add("folded", c, { pos: [3.62, y + 0.03 + s * 0.05, z], rotY: PI / 2 }); }
    }
    // cash desk
    sbx(mWhite, 2.6, 1.0, 0.7, 1.9, 0, 23.1);
    B.add(mWood, place(bgeo(2.7, 0.05, 0.8), 1.9, 1.0, 23.1));
    B.add(mBlack, place(bgeo(0.35, 0.28, 0.05), 1.4, 1.2, 23.0, -0.2));
    for (let i = 0; i < 4; i++) I.add("bag", ["#f5efe6", "#c9a36a"][i % 2], { pos: [2.4 + i * 0.12, 1.025, 23.1], rotY: PI / 2, scale: [0.8, 0.9, 0.8] });
    // dress forms
    for (const [x, z] of [[-2.8, 16.0], [-7.2, 21.2]] as [number, number][]) {
      B.add(mBlack, place(lathe([[0.001, 0.95], [0.13, 0.97], [0.15, 1.05], [0.12, 1.18], [0.14, 1.3], [0.17, 1.42], [0.12, 1.5], [0.03, 1.55], [0.001, 1.56]], 16), x, 0, z, 0, 0, 0, [1, 1, 0.7]));
      B.add(mChrome, place(new THREE.CylinderGeometry(0.015, 0.015, 0.95, 8), x, 0.475, z));
      B.add(mChrome, place(new THREE.CylinderGeometry(0.2, 0.22, 0.02, 16), x, 0.01, z));
      col(x - 0.2, x + 0.2, z - 0.2, z + 0.2, 1.56, 0, true);
    }
    potPlant(-13.3, 15.2, 1.1, 250);
  }

  // ================================================================ STEP UP (shoes & bags)
  {
    const r = rng(300);
    const shoeCols = ["#ffffff", "#e63946", "#1d3557", "#2a9d8f", "#f4a261", "#222222", "#ffafcc", "#8d99ae", "#ffd166"];
    wallShelf("x", Z1 - 0.12, 4.3, 15.7, -1, [0.3, 0.7, 1.1, 1.5, 1.9, 2.3], 0.4, 0, mWhite);
    for (const y of [0.32, 0.72, 1.12, 1.52, 1.92, 2.32]) for (let x = 4.6; x < 15.5; x += 0.36) {
      const c = shoeCols[Math.floor(r() * shoeCols.length)];
      I.add("shoeUp", c, { pos: [x, y, Z1 - 0.32], rotY: PI / 2 + (r() - 0.5) * 0.2 });
      I.add("shoeSole", "#f4f1e8", { pos: [x, y + 0.0175, Z1 - 0.32], rotY: PI / 2 });
    }
    // bags on the east wall
    B.add(mSlatGet(), place(new THREE.PlaneGeometry(9.4, 3.4), 16 - 0.13, 1.8, 19, 0, -PI / 2), 2);
    for (let row = 0; row < 3; row++) for (let i = 0; i < 12; i++) I.add("bag", ["#3d4e6b", "#8fd1b5", "#f08a8a", "#f3eee4", "#6e4727", "#111111", "#e0b84a"][(i + row * 3) % 7], { pos: [15.72, 0.7 + row * 0.9, 14.8 + i * 0.72], rotY: -PI / 2 });
    col(15.5, 16, 14.4, 23.6, 2.8, 0, true);
    // display tables with shoes
    for (const [x, z] of [[7.4, 18.6], [11.8, 18.6]] as [number, number][]) {
      sbx(mWood, 1.8, 0.5, 0.9, x, 0, z);
      for (let i = 0; i < 8; i++) { const c = shoeCols[Math.floor(r() * shoeCols.length)]; I.add("shoeUp", c, { pos: [x - 0.7 + (i % 4) * 0.45, 0.5, z - 0.2 + Math.floor(i / 4) * 0.4], rotY: r() * 6 }); }
    }
    // poufs
    for (const [x, z, c] of [[9.6, 17.0, "#d4a373"], [9.6, 20.2, "#6d597a"], [6.2, 21.6, "#d4a373"], [13.6, 16.6, "#6d597a"]] as [number, number, string][]) { I.add("pouf", c, { pos: [x, 0.21, z] }); col(x - 0.34, x + 0.34, z - 0.34, z + 0.34, 0.42, 0, true); }
    // shoe box towers
    for (const [x, z, n] of [[13.6, 21.4, 9], [14.1, 20.6, 6], [5.4, 16.0, 8], [5.0, 16.9, 5]] as [number, number, number][]) {
      for (let i = 0; i < n; i++) I.add("shoeBox", ["#ffffff", "#e7e3da", "#f4d6c6"][i % 3], { pos: [x, 0.065 + i * 0.13, z], rotY: (r() - 0.5) * 0.2 });
      col(x - 0.2, x + 0.2, z - 0.14, z + 0.14, n * 0.13, 0, true);
    }
    // window shoe pyramids
    podium(6.0, 14.9, 3.4, 1.0, 0.25);
    podium(14.0, 14.9, 3.4, 1.0, 0.25);
    for (const x0 of [6.0, 14.0]) for (let l = 0; l < 3; l++) {
      B.add(mWhite, place(bgeo(2.4 - l * 0.7, 0.3, 0.6), x0, 0.25 + l * 0.3 + 0.15, 14.95));
      for (let i = 0; i < 5 - l * 2; i++) I.add("shoeUp", shoeCols[(i + l * 2) % shoeCols.length], { pos: [x0 - 0.9 + l * 0.35 + i * 0.45, 0.55 + l * 0.3, 14.95], rotY: 0.4 });
    }
    col(4.3, 15.7, 14.4, 15.45, 1.15, 0, true);
    // mirror
    B.add(sc("#c9d6df", 0.05, 1.0), place(new THREE.PlaneGeometry(0.6, 1.7), 4.14, 1.0, 20.5, 0, PI / 2));
    // counter
    sbx(mWhite, 0.7, 1.0, 2.0, 5.0, 0, 20.6);
  }

  // ================================================================ TOY PLANET
  {
    const r = rng(400);
    // giant teddy bear
    {
      const x = 19.8, z = 9.8;
      const fur = tm("mall.fabric", () => M.fabric(), "#b07a45", { rough: 0.95, bump: 0.35 }), furL = tm("mall.fabric", () => M.fabric(), "#e8cfa9", { rough: 0.95, bump: 0.35 });
      B.add(fur, place(new THREE.SphereGeometry(0.95, 28, 20), x, 0.95, z, 0, 0, 0, [1, 1.05, 0.9]));
      B.add(furL, place(new THREE.SphereGeometry(0.6, 20, 14), x - 0.55, 0.95, z, 0, 0, 0, [0.5, 1, 0.9]));
      B.add(fur, place(new THREE.SphereGeometry(0.66, 28, 20), x, 2.35, z));
      B.add(furL, place(new THREE.SphereGeometry(0.28, 18, 12), x - 0.58, 2.22, z, 0, 0, 0, [0.7, 0.8, 1]));
      B.add(mBlack, place(new THREE.SphereGeometry(0.07, 12, 8), x - 0.78, 2.3, z));
      for (const s of [-1, 1]) {
        B.add(mBlack, place(new THREE.SphereGeometry(0.06, 12, 8), x - 0.56, 2.52, z + s * 0.24));
        B.add(fur, place(new THREE.SphereGeometry(0.24, 16, 12), x, 2.9, z + s * 0.5));
        B.add(furL, place(new THREE.SphereGeometry(0.14, 12, 8), x - 0.12, 2.9, z + s * 0.5));
        B.add(fur, place(new THREE.CapsuleGeometry(0.28, 0.6, 4, 14), x - 0.2, 1.5, z + s * 0.95, s * 0.5, 0, 0.3));
        B.add(fur, place(new THREE.CapsuleGeometry(0.32, 0.5, 4, 14), x - 0.7, 0.35, z + s * 0.5, 0, 0, PI / 2));
        B.add(furL, place(new THREE.CylinderGeometry(0.26, 0.26, 0.04, 16), x - 1.12, 0.35, z + s * 0.5, 0, 0, PI / 2));
      }
      B.add(sc("#e63946", 0.6), place(new THREE.TorusGeometry(0.42, 0.07, 8, 24), x, 1.75, z, PI / 2));
      col(x - 1.2, x + 0.95, z - 1.25, z + 1.25, 1.9, 0, true);
      col(x - 0.66, x + 0.66, z - 0.66, z + 0.66, 3.0, 1.9, true);
    }
    // gondolas with toy boxes
    const toyGondola = (x1: number, x2: number, z: number, seed: number) => {
      const rr = rng(seed), L = x2 - x1, xc = (x1 + x2) / 2;
      B.add(mWhite, place(bgeo(L, 1.55, 0.06), xc, 0.775, z));
      B.add(mDark, place(bgeo(L, 0.1, 0.9), xc, 0.05, z));
      for (const y of [0.1, 0.55, 1.0]) for (const s of [-1, 1]) {
        B.add(mWhite, place(bgeo(L, 0.03, 0.42), xc, y, z + s * 0.24));
        for (let x = x1 + 0.2; x < x2 - 0.15; x += 0.36) I.add(`toy${Math.floor(rr() * 8)}`, "#fff", { pos: [x, y + 0.187, z + s * 0.3], rotY: s > 0 ? 0 : PI });
      }
      B.add(sc("#ffbe0b", 0.5), place(bgeo(L, 0.18, 0.1), xc, 1.6, z));
      col(x1, x2, z - 0.46, z + 0.46, 1.7, 0, true);
    };
    toyGondola(19.2, 26.4, 16.0, 401);
    toyGondola(19.2, 26.4, 19.6, 402);
    wallShelf("x", Z1 - 0.12, 16.4, 27.6, -1, [0.1, 0.55, 1.0, 1.45, 1.9], 0.45, 0, mWhite);
    for (const y of [0.1, 0.55, 1.0, 1.45, 1.9]) for (let x = 16.7; x < 27.4; x += 0.36) I.add(`toy${Math.floor(r() * 8)}`, "#fff", { pos: [x, y + 0.187, Z1 - 0.32], rotY: PI });
    wallShelf("z", X1 - 0.12, 7.0, 13.4, -1, [0.1, 0.55, 1.0, 1.45], 0.45, 0, mWhite);
    for (const y of [0.1, 0.55, 1.0, 1.45]) for (let z = 7.3; z < 13.2; z += 0.36) I.add(`toy${Math.floor(r() * 8)}`, "#fff", { pos: [X1 - 0.32, y + 0.187, z], rotY: -PI / 2 });
    // ball pit
    {
      const x = 24.6, z = 10.2;
      const pad = sc("#ff006e", 0.7);
      for (const [px, pz, w, d] of [[x, z - 1.45, 3.0, 0.2], [x, z + 1.45, 3.0, 0.2], [x - 1.4, z, 0.2, 2.7], [x + 1.4, z, 0.2, 2.7]] as [number, number, number, number][]) B.add(pad, place(bgeo(w, 0.6, d), px, 0.3, pz));
      col(x - 1.5, x + 1.5, z - 1.55, z + 1.55, 0.6, 0, true);
      B.add(sc("#3a86ff", 0.7), place(new THREE.BoxGeometry(2.6, 0.3, 2.7), x, 0.15, z));
      const bc = ["#ff006e", "#3a86ff", "#ffbe0b", "#06d6a0", "#8338ec", "#ffffff"];
      for (let i = 0; i < 230; i++) I.add("ball", bc[i % bc.length], { pos: [x - 1.2 + r() * 2.4, 0.36 + r() * 0.18, z - 1.25 + r() * 2.5] });
    }
    // giant foam blocks
    for (const [x, y, z, s, c] of [[17.4, 0, 22.0, 0.8, "#ff006e"], [18.3, 0, 22.2, 0.8, "#ffbe0b"], [17.8, 0.8, 22.1, 0.8, "#3a86ff"], [18.9, 0, 21.3, 0.6, "#06d6a0"]] as [number, number, number, number, string][]) {
      I.add("cube", c, { pos: [x, y + s / 2, z], scale: [s, s, s], rotY: r() * 0.4 });
      col(x - s / 2, x + s / 2, z - s / 2, z + s / 2, y + s, y, true);
    }
    // kiddie ride-on car
    {
      const x = 23.2, z = 13.0;
      B.add(sc("#e63946", 0.25, 0.2), place(new THREE.CapsuleGeometry(0.45, 0.9, 6, 16), x, 0.62, z, 0, 0, PI / 2, [1, 0.8, 1]));
      B.add(sc("#ffffff", 0.2), place(new THREE.SphereGeometry(0.35, 16, 10, 0, PI * 2, 0, PI / 2), x - 0.1, 0.9, z));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.add(mBlack, place(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 16), x + sx * 0.5, 0.2, z + sz * 0.4, PI / 2));
      sbx(sc("#ffbe0b", 0.4), 1.9, 0.08, 1.3, x, 0, z);
      col(x - 0.9, x + 0.9, z - 0.5, z + 0.5, 1.1, 0, true);
    }
    // plush pile
    for (let i = 0; i < 30; i++) I.add("ball", ["#ffc8dd", "#bde0fe", "#fff3b0", "#caffbf"][i % 4], { pos: [26.6 + r() * 0.8, 0.1 + r() * 0.6, 15.2 + r() * 2.2], scale: [2.2, 2.0, 2.2] });
    col(26.4, 27.6, 15.0, 17.6, 0.8, 0, true);
    sbx(sc("#8338ec", 0.4), 2.2, 1.0, 0.7, 18.2, 0, 23.0);
  }

  // ================================================================ PIXEL PALACE (arcade)
  {
    const r = rng(500);
    const cabCols = ["#d62246", "#1b6ef3", "#171717", "#f7b32b", "#6b2fb3", "#0fa36b"];
    const marqCols = ["#ff3fa4", "#39e0ff", "#ffe23f", "#7cff5a", "#ff7e3f"];
    const cabinet = (x: number, z: number, ry: number) => {
      const f = fr(x, z, ry);
      const c = cabCols[Math.floor(r() * cabCols.length)];
      I.add("cab", c, { pos: [x, 0, z], rotY: ry });
      const [sx, sz] = f.pt(0, 0.23);
      I.add(`game${Math.floor(r() * 4)}`, "#fff", { pos: [sx, 1.42, sz], rotY: ry, rotX: -0.12 });
      const [mx, mz] = f.pt(0, 0.19);
      I.add("marq", marqCols[Math.floor(r() * marqCols.length)], { pos: [mx, 1.84, mz], rotY: ry });
      for (let b = 0; b < 4; b++) { const [bx0, bz0] = f.pt(-0.15 + b * 0.1, 0.33); I.add("button", marqCols[b % marqCols.length], { pos: [bx0, 1.07, bz0], rotY: ry }); }
      const [jx, jz] = f.pt(0.22, 0.33);
      B.add(mBlack, place(new THREE.CylinderGeometry(0.01, 0.01, 0.1, 6), jx, 1.11, jz));
      B.add(sc("#e63946", 0.3), place(new THREE.SphereGeometry(0.03, 10, 8), jx, 1.17, jz));
      rcol(x, z, ry, 0.38, 0.43, 1.96, 0, true);
    };
    for (let z = -8.2; z <= 1.6; z += 0.82) cabinet(X1 - 0.56, z, -PI / 2);
    for (let z = -10.0; z <= 1.5; z += 0.82) { cabinet(22.6, z, -PI / 2); cabinet(23.5, z, PI / 2); }
    // claw machines
    for (let i = 0; i < 4; i++) {
      const x = 17.3 + i * 1.02, z = 5.0;
      const c = ["#ff3fa4", "#39e0ff", "#ffe23f", "#7cff5a"][i];
      B.add(sc(c, 0.3, 0.1), place(bgeo(0.95, 0.85, 0.95), x, 0.425, z));
      B.add(mGlass, place(new THREE.BoxGeometry(0.93, 1.0, 0.93), x, 1.35, z));
      B.add(sc(c, 0.3, 0.1), place(bgeo(0.97, 0.32, 0.97), x, 2.01, z));
      B.add(em(c, 0.9), place(new THREE.BoxGeometry(0.8, 0.2, 0.02), x, 2.01, z - 0.49));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.add(mChrome, place(new THREE.BoxGeometry(0.03, 1.0, 0.03), x + sx * 0.46, 1.35, z + sz * 0.46));
      B.add(mChrome, tubeGeo([[x, 1.85, z], [x, 1.6, z], [x + 0.05, 1.5, z]], 0.012, 8, 5));
      for (let b = 0; b < 16; b++) I.add("ball", ["#ffc8dd", "#bde0fe", "#fff3b0", "#caffbf", "#ffadad"][b % 5], { pos: [x - 0.35 + r() * 0.7, 0.93 + r() * 0.2, z - 0.35 + r() * 0.7], scale: [1.3, 1.3, 1.3] });
      col(x - 0.49, x + 0.49, z - 0.49, z + 0.49, 2.17, 0, true);
    }
    // air hockey
    {
      const x = 19.6, z = -11.0;
      B.add(sc("#1b6ef3", 0.4), place(bgeo(2.3, 0.72, 1.25), x, 0.36, z));
      B.add(em("#bde0fe", 0.5), place(new THREE.BoxGeometry(2.1, 0.02, 1.05), x, 0.74, z));
      B.add(sc("#ff3fa4", 0.4), place(new THREE.BoxGeometry(0.02, 0.021, 1.05), x, 0.75, z));
      for (const s of [-1, 1]) { B.add(mWhite, place(bgeo(2.3, 0.08, 0.1), x, 0.76, z + s * 0.58)); B.add(sc("#e63946", 0.3), place(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 14), x + s * 0.8, 0.79, z)); }
      col(x - 1.15, x + 1.15, z - 0.63, z + 0.63, 0.84, 0, true);
    }
    // dance machine
    {
      const x = 24.6, z = -12.6;
      const mArrow = tm("mall.arrows", () => T.checker("#39e0ff", "#1a1a2e", 3), "#ffffff", { rough: 0.3, bump: 0, emissive: 0.4 });
      B.add(mDark, place(bgeo(2.6, 0.2, 1.3), x, 0.1, z + 0.3));
      for (const s of [-0.65, 0.65]) B.add(mArrow, place(new THREE.PlaneGeometry(1.1, 1.1), x + s, 0.205, z + 0.3, -PI / 2));
      B.add(sc("#6b2fb3", 0.3, 0.2), place(bgeo(2.6, 2.3, 0.6), x, 1.15, z - 0.6));
      I.add("game3", "#fff", { pos: [x, 1.5, z - 0.29], scale: [2.6, 2.2, 1] });
      B.add(em("#ff3fa4", 1.2), place(new THREE.BoxGeometry(2.6, 0.2, 0.1), x, 2.2, z - 0.28));
      for (const s of [-1, 1]) B.add(mChrome, beam([x + s * 1.2, 0.2, z + 0.9], [x + s * 1.2, 1.2, z + 0.9], 0.04, 0.04, true, 8));
      B.add(mChrome, beam([x - 1.2, 1.2, z + 0.9], [x + 1.2, 1.2, z + 0.9], 0.04, 0.04, true, 8));
      col(x - 1.3, x + 1.3, z - 0.95, z - 0.25, 2.3, 0, true);
      col(x - 1.3, x + 1.3, z - 0.35, z + 0.95, 0.2, 0, true);
    }
    // basketball machines along the partition
    for (const x of [23.0, 24.4, 25.8]) {
      const z = 4.4;
      B.add(sc("#f77f00", 0.4), place(bgeo(1.2, 0.9, 2.6), x, 0.45, z));
      B.add(mGlass, place(new THREE.BoxGeometry(1.16, 1.4, 2.4), x, 1.6, z + 0.05));
      B.add(sc("#ffffff", 0.3), place(bgeo(1.1, 0.8, 0.05), x, 2.25, z + 1.28));
      B.add(sc("#e63946", 0.4, 0.5), place(new THREE.TorusGeometry(0.22, 0.015, 6, 20), x, 1.95, z + 1.02, PI / 2));
      for (let b = 0; b < 5; b++) I.add("ball", "#f77f00", { pos: [x - 0.3 + b * 0.15, 0.98, z - 0.9], scale: [1.4, 1.4, 1.4] });
      col(x - 0.6, x + 0.6, z - 1.3, z + 1.3, 2.3, 0, true);
    }
    // neon ceiling strips
    for (const [z, c] of [[-8, "#ff3fa4"], [-3, "#39e0ff"], [2, "#ff3fa4"]] as [number, string][]) slab(em(c, 1.8), 17, 27.5, CH - 0.06, CH - 0.02, z - 0.03, z + 0.03);
    // change machine
    sbx(sc("#ffe23f", 0.4), 0.7, 1.7, 0.6, 16.8, 0, -13.3);
  }

  // ================================================================ FRESH MART (grocery)
  {
    const r = rng(600);
    const gondola = (x: number, z1: number, z2: number, seed: number) => {
      const rr = rng(seed), L = z2 - z1, zc = (z1 + z2) / 2;
      B.add(mWhite, place(bgeo(0.06, 1.85, L), x, 0.925, zc));
      B.add(mDark, place(bgeo(0.95, 0.12, L), x, 0.06, zc));
      const levels = [0.12, 0.52, 0.92, 1.32];
      for (const y of levels) for (const s of [-1, 1]) {
        B.add(mWhite, place(bgeo(0.44, 0.03, L), x + s * 0.25, y, zc));
        B.add(sc("#f6cf3f", 0.5), place(new THREE.BoxGeometry(0.01, 0.04, L), x + s * 0.475, y - 0.01, zc));
        let z = z1 + 0.1;
        while (z < z2 - 0.12) {
          const kind = rr();
          if (kind < 0.55) {
            const cell = Math.floor(rr() * 8), n = 2 + Math.floor(rr() * 3);
            for (let i = 0; i < n && z < z2 - 0.1; i++, z += 0.17) I.add(`pkg${cell}`, "#fff", { pos: [x + s * 0.28, y + 0.135, z], rotY: s > 0 ? PI / 2 : -PI / 2 });
          } else if (kind < 0.8) {
            const c = ["#e63946", "#1d3557", "#2a9d8f", "#ffb703", "#f1faee"][Math.floor(rr() * 5)], n = 3 + Math.floor(rr() * 3);
            for (let i = 0; i < n && z < z2 - 0.08; i++, z += 0.075) for (const d of [0.15, 0.3]) I.add("can", c, { pos: [x + s * d, y + 0.075, z] });
          } else {
            const c = ["#8ecae6", "#ffafcc", "#f4a261", "#90be6d", "#ffffff"][Math.floor(rr() * 5)], n = 3 + Math.floor(rr() * 3);
            for (let i = 0; i < n && z < z2 - 0.08; i++, z += 0.09) for (const d of [0.15, 0.32]) I.add("bottle", c, { pos: [x + s * d, y + 0.015, z] });
          }
          z += 0.04;
        }
      }
      B.add(sc("#2d6a4f", 0.5), place(bgeo(0.12, 0.3, L), x, 2.0, zc));
      col(x - 0.48, x + 0.48, z1, z2, 1.85, 0, true);
    };
    for (const [i, x] of [-25.6, -22.8, -20.0, -17.2, -14.4].entries()) gondola(x, -21.6, -18.2, 601 + i);
    // coolers along the back wall
    {
      const x1 = -27.8, x2 = -12.6;
      B.add(mWhite, place(new THREE.BoxGeometry(x2 - x1, 2.2, 0.85), (x1 + x2) / 2, 1.1, Z0 + 0.43));
      B.add(em("#f4fbff", 0.6), place(new THREE.PlaneGeometry(x2 - x1 - 0.2, 1.8), (x1 + x2) / 2, 1.15, Z0 + 0.87));
      B.add(mGlass, place(new THREE.BoxGeometry(x2 - x1, 1.9, 0.02), (x1 + x2) / 2, 1.15, Z0 + 0.9));
      for (let x = x1; x <= x2 + 0.01; x += (x2 - x1) / 12) B.add(mSteel, place(new THREE.BoxGeometry(0.05, 1.9, 0.05), x, 1.15, Z0 + 0.9));
      for (const y of [0.4, 0.85, 1.3, 1.75]) for (let x = x1 + 0.15; x < x2 - 0.1; x += 0.1) I.add("bottle", ["#e63946", "#f1faee", "#90be6d", "#ffb703", "#8ecae6"][Math.floor((x - x1) / 1.3 + y * 3) % 5], { pos: [x, y, Z0 + 0.72] });
      B.add(sc("#2d6a4f", 0.5), place(new THREE.BoxGeometry(x2 - x1, 0.3, 0.1), (x1 + x2) / 2, 2.4, Z0 + 0.8));
      col(x1, x2, Z0, Z0 + 0.92, 2.2, 0, true);
    }
    // produce crates
    const fruitCols = ["#d62828", "#f77f00", "#90be6d", "#ffd60a", "#6a994e", "#9d0208"];
    for (const [i, [x, z]] of ([[-11.2, -22.2], [-9.4, -22.2], [-7.6, -22.2], [-10.3, -18.6], [-8.1, -18.6], [-5.9, -18.6]] as [number, number][]).entries()) {
      B.add(mWood, place(bgeo(1.6, 0.75, 1.0), x, 0.375, z));
      B.add(mWoodDark, place(bgeo(1.62, 0.12, 1.02), x, 0.7, z));
      const c = fruitCols[i % fruitCols.length];
      for (let a = 0; a < 14; a++) for (let b = 0; b < 8; b++) if ((a + b) % 2 === 0 || r() < 0.5) I.add("fruit", c, { pos: [x - 0.72 + a * 0.11 + (r() - 0.5) * 0.02, 0.8 + r() * 0.04, z - 0.4 + b * 0.11] });
      col(x - 0.8, x + 0.8, z - 0.5, z + 0.5, 0.85, 0, true);
    }
    // bread rack on the east wall
    wallShelf("z", -4 - 0.12, -23.4, -16.4, -1, [0.3, 0.75, 1.2, 1.65], 0.5, 0, mWood);
    for (const y of [0.3, 0.75, 1.2, 1.65]) for (let z = -23.2; z < -16.6; z += 0.28) I.add("bun", "#c68b4b", { pos: [-4.45, y + 0.02, z], scale: [2.2, 1.6, 1.6] });
    // checkouts
    for (const x of [-13.0, -11.0]) {
      B.add(mWhite, place(bgeo(0.7, 0.9, 2.0), x, 0.45, -16.3));
      B.add(mBlack, place(new THREE.BoxGeometry(0.5, 0.02, 1.4), x, 0.91, -16.6));
      B.add(mDark, place(bgeo(0.3, 0.2, 0.3), x, 0.9, -15.6));
      B.add(mBlack, place(bgeo(0.04, 0.26, 0.32), x - 0.1, 1.2, -15.55, 0, 0, 0.3));
      B.add(sc("#2d6a4f", 0.5), place(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 8), x + 0.3, 1.5, -15.4));
      B.add(em("#b7e4c7", 1.0), place(bgeo(0.25, 0.25, 0.05), x + 0.3, 2.2, -15.4));
      col(x - 0.35, x + 0.35, -17.3, -15.3, 0.92, 0, true);
    }
    // can pyramid promo
    {
      const x = -7.2, z = -15.8;
      for (let l = 0; l < 6; l++) for (let i = 0; i < 6 - l; i++) for (let j = 0; j < 6 - l; j++) I.add("can", l % 2 ? "#e63946" : "#ffb703", { pos: [x - 0.2 + i * 0.075 + l * 0.037, 0.06 + l * 0.12, z - 0.2 + j * 0.075 + l * 0.037] });
      col(x - 0.25, x + 0.25, z - 0.25, z + 0.25, 0.72, 0, true);
    }
    // shopping carts
    const mCage = k.mat(k.tex("bars", T.bars), "#dcdcdc", [3, 2], { transparent: true, metalness: 0.7, roughness: 0.35 });
    for (let i = 0; i < 3; i++) {
      const x = -5.2, z = -15.4 - i * 0.35;
      B.add(mCage, place(new THREE.BoxGeometry(0.55, 0.45, 0.85), x, 0.8, z - 0.5));
      B.add(mChrome, beam([x - 0.28, 1.05, z - 0.05], [x + 0.28, 1.05, z - 0.05], 0.025, 0.025, true, 6));
      B.add(mChrome, beam([x, 0.12, z - 0.9], [x, 0.58, z - 0.9], 0.02, 0.02, true, 6));
      for (const sx of [-1, 1]) for (const sz of [-0.9, -0.1]) B.add(mBlack, place(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 10), x + sx * 0.22, 0.06, z + sz, 0, 0, PI / 2));
    }
    col(-5.5, -4.9, -17.0, -14.8, 1.1, 0, true);
    void r;
  }

  // ================================================================ VOLTEX (electronics)
  {
    const r = rng(700);
    // TV wall
    for (let row = 0; row < 3; row++) for (let i = 0; i < 14; i++) {
      const x = 5.6 + i * 1.55, y = 1.25 + row * 0.9, z = Z0 + 0.1;
      B.add(mBlack, place(bgeo(1.22, 0.72, 0.05), x, y, z));
      I.add(`tv${Math.floor(r() * 4)}`, "#fff", { pos: [x, y, z + 0.027] });
    }
    // display tables with laptops
    for (const [x, z] of [[7.6, -18.4], [11.6, -18.4], [15.6, -18.4], [19.6, -18.4], [9.6, -21.4], [13.6, -21.4]] as [number, number][]) {
      B.add(mWhite, place(bgeo(2.0, 0.08, 1.0), x, 0.86, z));
      B.add(mWood, place(bgeo(1.9, 0.82, 0.9), x, 0.41, z));
      for (let i = 0; i < 4; i++) {
        const lx = x - 0.72 + i * 0.48;
        B.add(sc("#c0c4ca", 0.3, 0.8), place(bgeo(0.34, 0.02, 0.24), lx, 0.91, z + 0.1));
        B.add(sc("#c0c4ca", 0.3, 0.8), place(bgeo(0.34, 0.22, 0.015), lx, 1.02, z - 0.03, -0.25));
        I.add(`tv${Math.floor(r() * 4)}`, "#fff", { pos: [lx, 1.025, z - 0.02], rotX: -0.25, scale: [0.27, 0.3, 1] });
      }
      col(x - 1.0, x + 1.0, z - 0.5, z + 0.5, 0.9, 0, true);
    }
    // appliances along the east wall
    for (let i = 0; i < 9; i++) {
      const z = -23.3 + i * 0.95, x = X1 - 0.4;
      if (i % 3 === 2) {
        B.add(sc("#d7dade", 0.25, 0.8), place(bgeo(0.72, 1.85, 0.75), x, 0.925, z));
        B.add(mChrome, place(new THREE.BoxGeometry(0.03, 0.8, 0.03), x - 0.39, 1.1, z + 0.3));
        col(x - 0.37, x + 0.37, z - 0.38, z + 0.38, 1.85, 0, true);
      } else {
        B.add(mWhite, place(bgeo(0.62, 0.86, 0.62), x, 0.43, z));
        B.add(mChrome, place(new THREE.TorusGeometry(0.2, 0.03, 8, 24), x - 0.31, 0.45, z, 0, PI / 2));
        B.add(mGlassDark, place(new THREE.CircleGeometry(0.19, 20), x - 0.315, 0.45, z, 0, -PI / 2));
        B.add(mDark, place(new THREE.BoxGeometry(0.02, 0.08, 0.5), x - 0.31, 0.78, z));
        col(x - 0.31, x + 0.31, z - 0.31, z + 0.31, 0.86, 0, true);
      }
    }
    // speakers
    for (let i = 0; i < 4; i++) {
      const x = 4.5, z = -22.8 + i * 1.0;
      B.add(mBlack, place(bgeo(0.3, 1.1, 0.35), x, 0.55, z));
      for (const y of [0.3, 0.65, 0.9]) B.add(mDark, place(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 16), x + 0.16, y, z, 0, 0, PI / 2));
      col(x - 0.15, x + 0.15, z - 0.18, z + 0.18, 1.1, 0, true);
    }
    // demo sofa facing the TV wall
    {
      const x = 22.4, z = -21.6;
      const mSofa = tm("mall.fabric", () => M.fabric(), "#5c677d", { rough: 0.95, bump: 0.35 });
      B.add(mSofa, place(bgeo(2.2, 0.42, 0.9), x, 0.21, z));
      B.add(mSofa, place(bgeo(2.2, 0.5, 0.22), x, 0.62, z + 0.36));
      for (const s of [-1, 1]) B.add(mSofa, place(bgeo(0.22, 0.62, 0.9), x + s * 1.0, 0.31, z));
      col(x - 1.1, x + 1.1, z - 0.45, z + 0.45, 0.62, 0, true);
    }
    // gaming chairs
    for (const [x, z, c] of [[25.2, -17.4, "#e63946"], [23.6, -17.4, "#222222"]] as [number, number, string][]) {
      const m = sc(c, 0.4);
      B.add(m, place(bgeo(0.52, 0.12, 0.5), x, 0.5, z));
      B.add(m, place(bgeo(0.52, 0.8, 0.12), x, 0.95, z + 0.25, 0.12));
      B.add(mBlack, place(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8), x, 0.25, z));
      B.add(mBlack, place(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 5), x, 0.05, z));
      col(x - 0.28, x + 0.28, z - 0.28, z + 0.28, 0.56, 0, true);
    }
    sbx(sc("#101820", 0.4), 2.4, 1.0, 0.7, 6.4, 0, -15.3);
    B.add(sc("#4cc9f0", 0.3), place(new THREE.BoxGeometry(2.4, 0.06, 0.02), 6.4, 0.7, -14.94));
  }

  // ================================================================ ENTRANCE HALL (hunters enter here)
  {
    // glass doors + exterior
    B.add(mGlass, place(new THREE.BoxGeometry(6, 3.0, 0.03), 0, 1.5, Z0 - 0.15));
    for (let x = -3; x <= 3.01; x += 1.5) B.add(mDark, place(new THREE.BoxGeometry(0.08, 3.0, 0.12), x, 1.5, Z0 - 0.15));
    B.add(mDark, place(new THREE.BoxGeometry(6, 0.1, 0.14), 0, 3.0, Z0 - 0.15));
    for (const x of [-0.75, 0.75]) B.add(mChrome, place(new THREE.CylinderGeometry(0.018, 0.018, 1.0, 8), x, 1.1, Z0 - 0.05));
    slab(mFascia, -4, 4, 3.0, CH, Z0 - 0.3, Z0);
    col(-4, 4, Z0 - 0.3, Z0, CH, 0, false);
    B.add(tm("mall.outside", M.outside, "#ffffff", { rough: 1, bump: 0, emissive: 0.9 }), place(new THREE.PlaneGeometry(9, 4.5), 0, 2.0, Z0 - 1.6));
    slab(mDark, -3, 3, 0, 0.02, Z0, Z0 + 2.2);
    // side walls clad in stone to 2.4 m
    for (const s of [-1, 1]) {
      B.add(mStone, place(new THREE.BoxGeometry(0.04, 2.4, 9.6), s * 3.86, 1.2, -19), 2);
      bench(s * 3.4, -19.8, s < 0 ? PI / 2 : -PI / 2);
      potPlant(s * 3.3, -22.8, 1.2, 900 + (s > 0 ? 1 : 0));
      potPlant(s * 3.3, -16.8, 1.0, 910 + (s > 0 ? 1 : 0));
    }
    totem(-2.9, -15.0, PI / 2);
    // ATM + stroller corral
    { const f = fr(3.5, -22.1, -PI / 2), body = sc("#1d3557", 0.4);
      B.add(body, f.put(bgeo(0.72, 1.05, 0.55), 0, 0.525, 0));
      B.add(body, f.put(bgeo(0.72, 0.75, 0.3), 0, 1.4, -0.12));
      B.add(sc("#12213a", 0.3), f.put(bgeo(0.74, 0.08, 0.6), 0, 1.07, 0.02, -0.25));
      B.add(em("#8ecae6", 0.7), f.put(new THREE.PlaneGeometry(0.36, 0.27), 0, 1.42, 0.035, -0.12));
      B.add(mSteel, f.put(bgeo(0.28, 0.05, 0.2), 0, 1.12, 0.2, -0.25));
      for (let i = 0; i < 12; i++) B.add(mChrome, f.put(bgeo(0.05, 0.015, 0.04), -0.06 + (i % 3) * 0.06, 1.14, 0.14 + Math.floor(i / 3) * 0.045, -0.25));
      B.add(mBlack, f.put(new THREE.BoxGeometry(0.12, 0.012, 0.02), 0.22, 1.2, 0.03));
      B.add(mBlack, f.put(new THREE.BoxGeometry(0.26, 0.03, 0.02), 0, 0.85, 0.28));
      B.add(em("#2a9d8f", 1.0), f.put(bgeo(0.74, 0.14, 0.32), 0, 1.84, -0.12));
      col(3.2, 3.8, -22.45, -21.75, 1.9, 0, true);
      const [lx, lz] = f.pt(0, 0.036); life.wall(life.label({ text: "ATM", sub: "cash 24/7 - Kodner Bank", bg: "#2a9d8f", fg: "#ffffff", px: [256, 96] }), lx - 0.0, 1.84, lz, 0.5, -PI / 2);
    }
  }

  // ================================================================ LIFE: signs, notices, receipts
  {
    const L = (id: number, x: number, y: number, z: number, w: number, ry: number, tilt = 0) => life.wall(id, x, y, z, w, ry, tilt);
    // entrance hall: opening hours + lost & found board on the stone walls
    B.add(mDark, place(bgeo(0.03, 0.9, 0.7), -3.83, 1.65, -21.2));
    L(life.poster({ title: "WELCOME", sub: "Opening hours", body: "Mon - Fri  10:00 - 21:00\nSat - Sun  10:00 - 22:00\nFood Court until 23:00\nMall manager: Tom Kodner", bg: "#1d3557", fg: "#ffffff", accent: "#2a9d8f", style: "notice", art: (g, w, h) => drawChameleon(g, w * 0.5, h * 0.55, h * 0.6, "#2a9d8f"), wear: 0.02 }), -3.81, 1.65, -21.2, 0.6, PI / 2);
    B.add(mWood, place(bgeo(0.03, 0.8, 1.2), 3.83, 1.55, -17.6));
    B.add(tm("mall.cork", () => T.noise("#b98a55", 0.25, 5, 3000), "#ffffff", { rough: 0.95, bump: 0.6 }), place(new THREE.PlaneGeometry(1.1, 0.7), 3.814, 1.95, -17.6, 0, -PI / 2));
    L(life.label({ text: "LOST & FOUND", sub: "ask at the information desk", bg: "#ffffff", fg: "#1d3557", border: "#1d3557", px: [300, 110] }), 3.812, 2.2, -17.6, 0.5, -PI / 2);
    L(life.note({ text: "FOUND: one red glove (left). Info desk.", color: "#fff27a", pin: "#e63946" }), 3.81, 1.85, -18.0, 0.16, -PI / 2, 0.08);
    L(life.note({ text: "LOST my mum near the escalators - Timmy (6)", color: "#ffd1dc", pin: "#118ab2" }), 3.81, 1.82, -17.6, 0.16, -PI / 2, -0.06);
    L(life.note({ text: "Tom Kodner: your car keys are at the Info desk!", color: "#c9f2c7", pin: "#ffb703" }), 3.81, 1.87, -17.2, 0.16, -PI / 2, 0.04);
    L(life.photo({ caption: "found: this cat?", art: (g, w, h) => { g.fillStyle = "#cfd8dc"; g.fillRect(0, 0, w, h); g.fillStyle = "#f4a261"; g.beginPath(); g.ellipse(w / 2, h * 0.65, w * 0.26, h * 0.26, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(w / 2, h * 0.36, w * 0.18, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(w * 0.36, h * 0.28); g.lineTo(w * 0.4, h * 0.1); g.lineTo(w * 0.47, h * 0.24); g.moveTo(w * 0.64, h * 0.28); g.lineTo(w * 0.6, h * 0.1); g.lineTo(w * 0.53, h * 0.24); g.fill(); } }), 3.81, 1.6, -17.85, 0.13, -PI / 2, 0.1);
    // food court: tray-return sign, employee of the month, receipts & a newspaper on the tables
    L(life.label({ text: "PLEASE RETURN YOUR TRAY", sub: "thank you!", bg: "#ffffff", fg: "#d62828", border: "#d62828", px: [320, 110] }), -12.0, 0.75, -13.195, 0.7, 0);
    B.add(sc("#c9a227", 0.3, 0.8), place(bgeo(0.46, 0.56, 0.03), -24.2, 1.95, -13.79));
    L(life.certificate({ title: "EMPLOYEE OF THE MONTH", name: "Tom Kodner", body: "Burger Blast - September 2026\nfastest fries in the whole mall", sign: "The Manager", px: [300, 362] }), -24.2, 1.95, -13.77, 0.4, 0);
    const rc = [
      life.receipt({ title: "BURGER BLAST", lines: [["Blast Burger", "6.50"], ["Large Fries", "3.20"], ["Cola", "2.10"]], total: "11.80", foot: "Thank you, Tom! Come again" }),
      life.receipt({ title: "NOODLE NOVA", lines: [["Ramen (spicy)", "8.90"], ["Gyoza x6", "4.50"], ["Green Tea", "1.90"]], total: "15.30", foot: "table 12 - staff: K." }),
      life.receipt({ title: "TACO TORNADO", lines: [["Taco x3", "7.50"], ["Nachos", "4.00"], ["Horchata", "2.60"]], total: "14.10", foot: "have a spicy day!" }),
    ];
    [[-21.4, -7.6], [-18.2, 4.0], [-15.0, -11.2], [-11.8, 7.6], [-15.0, 11.2]].forEach(([x, z], i) => life.flat(rc[i % 3], x + 0.24, 0.752, z - 0.26, 0.09, lr() * 6));
    life.flat(life.news({ name: "Mall Weekly", headline: "BIGGEST AUTUMN SALE EVER", sub: "Manager Tom Kodner: 'Everything must go - even the balloon sculpture'", photo: (g, w, h) => { g.fillStyle = "#9a948a"; g.fillRect(0, 0, w, h); for (let i = 0; i < 6; i++) { g.fillStyle = ["#e63946", "#ffb703", "#118ab2"][i % 3]; g.globalAlpha = 0.55; g.beginPath(); g.arc(w * (0.25 + (i % 3) * 0.25), h * (0.35 + Math.floor(i / 3) * 0.3), h * 0.18, 0, Math.PI * 2); g.fill(); } g.globalAlpha = 1; } }), -18.2 - 0.2, 0.752, -4.0 + 0.1, 0.34, 0.4);
    // kiosk carts: price boards
    for (const [kx, kz, t] of [[13.0, 10.6, "GIFT CORNER"], [-13.0, -3.0, "PHONE CASES"]] as [number, number, string][]) {
      const id = life.label({ text: t, sub: t === "GIFT CORNER" ? "handmade by Tom Kodner - from 5.00" : "all models - 2 for 15.00", bg: "#ffffff", fg: "#1d3557", border: "#f39ab4", px: [300, 110] });
      L(id, kx + 0.478, 0.7, kz, 0.6, PI / 2); L(id, kx - 0.478, 0.7, kz, 0.6, -PI / 2);
    }
    // wet-floor caution A-frame sign in the atrium
    { const x = 3.6, z = -6.2, ry = 0.5;
      const f = fr(x, z, ry), yel = sc("#f6c533", 0.35);
      for (const s2 of [-1, 1]) B.add(yel, f.put(bgeo(0.3, 0.62, 0.015), 0, 0.3, s2 * 0.1, -s2 * 0.3));
      B.add(yel, f.put(bgeo(0.1, 0.05, 0.05), 0, 0.64, 0));
      const cau = life.custom(160, 320, (g, w, h) => {
        g.fillStyle = "#f6c533"; g.fillRect(0, 0, w, h);
        g.fillStyle = "#111"; g.font = "bold 30px Arial,sans-serif"; g.textAlign = "center"; g.fillText("CAUTION", w / 2, 44);
        g.beginPath(); g.moveTo(w / 2, 70); g.lineTo(w * 0.85, 170); g.lineTo(w * 0.15, 170); g.closePath(); g.lineWidth = 8; g.strokeStyle = "#111"; g.stroke();
        g.beginPath(); g.arc(w / 2 + 6, 104, 8, 0, Math.PI * 2); g.fill(); g.lineWidth = 6; g.beginPath(); g.moveTo(w / 2 + 4, 114); g.lineTo(w / 2 - 6, 140); g.lineTo(w / 2 - 22, 156); g.moveTo(w / 2 - 6, 140); g.lineTo(w / 2 + 14, 156); g.moveTo(w / 2, 122); g.lineTo(w / 2 + 20, 128); g.stroke();
        g.font = "bold 26px Arial,sans-serif"; g.fillText("WET", w / 2, 220); g.fillText("FLOOR", w / 2, 252); g.font = "16px Arial,sans-serif"; g.fillText("PISO MOJADO", w / 2, 290); g.textAlign = "left";
      });
      for (const s2 of [-1, 1]) { const [px, pz] = f.pt(0, s2 * 0.11); life.put(cau, px, 0.32, pz, 0.26, { ry: ry + (s2 < 0 ? PI : 0), rx: -0.3, h: 0.54 }); }
      col(x - 0.2, x + 0.2, z - 0.2, z + 0.2, 0.65, 0, false);
    }
  }
  life.finish();

  // ================================================================ UPPER FLOOR PROPS
  {
    const y = FL;
    const r = rng(1000);
    // planters and benches around the gallery
    planter(-6.0, -11.6, 4.0, 1.2, 0.7, 1001, 0, y);
    bench(-6.0, -10.5, 0, y);
    planter(6.0, 11.6, 4.0, 1.2, 0.7, 1002, 0, y);
    bench(6.0, 10.5, PI, y);
    planter(13.6, 5.8, 1.2, 3.2, 0.7, 1003, 1, y);
    planter(-13.6, -5.8, 1.2, 3.2, 0.7, 1004, 1, y);
    for (const [x, z, ry] of [[-4.0, -7.9, PI], [4.0, -7.9, PI], [-4.0, 7.9, 0], [4.0, 7.9, 0], [-10.9, -3.0, -PI / 2], [10.9, 3.0, PI / 2]] as [number, number, number][]) bench(x, z, ry, y);
    // café kiosk BEAN & BUN (west gallery)
    {
      const x = -13.8, z = 0;
      B.add(mWood, place(bgeo(1.0, 1.05, 4.6), x, y + 0.525, z));
      B.add(mStone, place(bgeo(1.2, 0.06, 4.8), x, y + 1.05, z));
      B.add(mGlass, place(new THREE.BoxGeometry(0.5, 0.4, 1.4), x + 0.2, y + 1.28, z - 1.2));
      for (let i = 0; i < 10; i++) I.add("bun", ["#c68b4b", "#e9c46a", "#7f4f24"][i % 3], { pos: [x + 0.05 + (i % 2) * 0.2, y + 1.1, z - 1.7 + Math.floor(i / 2) * 0.24], scale: [1.4, 1.2, 1.4] });
      B.add(mSteel, place(bgeo(0.5, 0.45, 0.6), x - 0.1, y + 1.3, z + 1.1));
      B.add(mBlack, place(bgeo(0.3, 0.1, 0.5), x - 0.1, y + 1.55, z + 1.1));
      for (let i = 0; i < 5; i++) I.add("cup", "#ffffff", { pos: [x + 0.35, y + 1.08, z + 0.2 + i * 0.12] });
      const mMenu = tm("mall.cafemenu", M.menu, "#ffffff", { rough: 0.4, bump: 0, emissive: 0.7 });
      B.add(mMenu, place(new THREE.PlaneGeometry(2.4, 1.2), -UX + 0.02, y + 2.4, z, 0, PI / 2));
      col(x - 0.6, x + 0.6, z - 2.4, z + 2.4, y + 1.08, y, true);
      for (const [tx, tz] of [[-12.4, -4.6], [-14.4, -4.6], [-12.6, 9.0], [-14.4, 11.2], [-12.2, 12.4]] as [number, number][]) tableSet(tx, tz, 0.3, Math.floor(r() * 100), true, y);
    }
    // east gallery: massage chairs, vending machines, claw machine
    for (let i = 0; i < 3; i++) {
      const x = 15.2, z = -1.8 + i * 1.2;
      const m = sc("#3b3b3b", 0.35);
      B.add(m, place(bgeo(0.9, 0.55, 0.8), x, y + 0.275, z));
      B.add(m, place(bgeo(0.3, 1.2, 0.8), x + 0.35, y + 0.6, z, 0, 0, -0.25));
      for (const s of [-1, 1]) B.add(sc("#8d99ae", 0.3, 0.4), place(bgeo(0.8, 0.3, 0.15), x - 0.05, y + 0.65, z + s * 0.4));
      B.add(m, place(bgeo(0.4, 0.35, 0.5), x - 0.6, y + 0.18, z, 0, 0, 0.5));
      col(x - 0.8, x + 0.5, z - 0.45, z + 0.45, y + 0.9, y, true);
    }
    for (const [i, c] of ["#e63946", "#1d3557"].entries()) {
      const x = 15.3, z = -7.6 - i * 1.0;
      B.add(sc(c, 0.35), place(bgeo(0.8, 1.9, 0.9), x, y + 0.95, z));
      B.add(mGlass, place(new THREE.BoxGeometry(0.02, 1.2, 0.6), x - 0.41, y + 1.2, z - 0.08));
      B.add(em("#fff6e4", 0.5), place(new THREE.PlaneGeometry(0.58, 1.18), x - 0.4, y + 1.2, z - 0.08, 0, -PI / 2));
      for (let a = 0; a < 5; a++) for (let b = 0; b < 4; b++) I.add("can", ["#ffb703", "#e63946", "#2a9d8f", "#f1faee"][b], { pos: [x - 0.25, y + 0.72 + a * 0.23, z - 0.3 + b * 0.14] });
      col(x - 0.4, x + 0.4, z - 0.45, z + 0.45, y + 1.9, y, true);
    }
    // north gallery: luggage display, lounge bean bags, photo booth
    {
      for (const [x, z, c, h] of [[-13.0, 12.8, "#e63946", 0.7], [-12.4, 12.9, "#1d3557", 0.62], [-11.8, 12.8, "#ffb703", 0.55], [-13.0, 12.1, "#2a9d8f", 0.55]] as [number, number, string, number][]) {
        B.add(sc(c, 0.25, 0.15), place(bgeo(0.46, h, 0.28), x, y + h / 2 + 0.04, z));
        B.add(mChrome, beam([x - 0.08, y + h, z], [x - 0.08, y + h + 0.35, z], 0.015, 0.015, true, 6));
        B.add(mChrome, beam([x + 0.08, y + h, z], [x + 0.08, y + h + 0.35, z], 0.015, 0.015, true, 6));
        B.add(mBlack, beam([x - 0.1, y + h + 0.35, z], [x + 0.1, y + h + 0.35, z], 0.03, 0.03, true, 6));
        col(x - 0.23, x + 0.23, z - 0.14, z + 0.14, y + h + 0.04, y, true);
      }
      for (const [x, z, c] of [[-1.6, 11.8, "#f39ab4"], [-0.2, 12.4, "#35c3cf"], [1.0, 11.6, "#f6cf3f"]] as [number, number, string][]) {
        B.add(tm("mall.fabric", () => M.fabric(), c, { rough: 0.95, bump: 0.35 }), place(new THREE.SphereGeometry(0.5, 20, 14), x, y + 0.32, z, 0, 0, 0, [1, 0.65, 1]));
        col(x - 0.45, x + 0.45, z - 0.45, z + 0.45, y + 0.6, y, true);
      }
      // photo booth
      const x = 11.6, z = 12.6;
      B.add(sc("#ffbe0b", 0.4), place(bgeo(1.6, 2.2, 1.3), x, y + 1.1, z));
      B.add(tm("mall.fabric", () => M.fabric(), "#e63946", { rough: 0.9, bump: 0.35 }), place(new THREE.PlaneGeometry(0.7, 1.6), x - 0.3, y + 1.0, z - 0.66, 0, PI));
      B.add(tm("mall.photo", () => M.poster("PHOTO", "4 SHOTS", "#ffbe0b", "#1d3557"), "#ffffff", { rough: 0.4, bump: 0 }), place(new THREE.PlaneGeometry(0.5, 0.75), x + 0.45, y + 1.3, z - 0.66, 0, PI));
      col(x - 0.8, x + 0.8, z - 0.65, z + 0.65, y + 2.2, y, true);
    }
    // south gallery: sneaker pop-up stand, stroller, clothing rack
    {
      const x = 8.0, z = -11.6;
      B.add(sc("#0b3d91", 0.4), place(bgeo(2.4, 0.9, 1.0), x, y + 0.45, z));
      for (let i = 0; i < 8; i++) I.add("shoeUp", ["#ffffff", "#e63946", "#ffbe0b", "#222222"][i % 4], { pos: [x - 1.0 + i * 0.28, y + 0.9, z + (i % 2 ? 0.2 : -0.2)], rotY: 0.3 });
      col(x - 1.2, x + 1.2, z - 0.5, z + 0.5, y + 0.95, y, true);
      const rr = (px: number, pz: number, ry: number, seed: number) => {
        const f = fr(px, pz, ry), ro = rng(seed);
        for (const s of [-1, 1]) B.add(mChrome, f.put(new THREE.CylinderGeometry(0.018, 0.018, 1.45, 8), s * 0.8, y + 0.73, 0));
        B.add(mChrome, f.put(new THREE.CylinderGeometry(0.016, 0.016, 1.6, 8), 0, y + 1.45, 0, 0, 0, PI / 2));
        for (let i = 0; i < 20; i++) { const [gx, gz] = f.pt(-0.72 + i * 0.076, 0); I.add("shirt", ["#0b3d91", "#ffbe0b", "#ffffff", "#e63946"][Math.floor(ro() * 4)], { pos: [gx, y + 1.45, gz], rotY: ry }); }
        rcol(px, pz, ry, 0.85, 0.3, y + 1.5, y, true);
      };
      rr(-12.4, -11.0, PI / 2, 1101);
      rr(-1.0, -12.2, 0, 1102);
    }
    // hanging sale banners in the atrium
    {
      const bn = [
        tm("mall.ban1", () => M.poster("SUMMER", "SALE", "#f39ab4", "#ffffff"), "#ffffff", { rough: 0.8, bump: 0 }),
        tm("mall.ban2", () => M.poster("NEW", "ARRIVALS", "#35c3cf", "#ffffff"), "#ffffff", { rough: 0.8, bump: 0 }),
        tm("mall.ban3", () => M.poster("-50%", "EVERYTHING", "#f6cf3f", "#1d3557"), "#ffffff", { rough: 0.8, bump: 0 }),
      ];
      for (const [i, [x, z, ry]] of ([[-6, -VZ - 0.2, 0], [6, VZ + 0.2, PI], [-3, VZ + 0.2, PI], [3, -VZ - 0.2, 0]] as [number, number, number][]).entries()) {
        const f = fr(x, z, ry);
        B.add(bn[i % 3], f.put(new THREE.BoxGeometry(1.4, 2.1, 0.01), 0, RF - 1.4, 0));
        B.add(mChrome, f.put(new THREE.CylinderGeometry(0.02, 0.02, 1.5, 8), 0, RF - 0.33, 0, 0, 0, PI / 2));
        for (const s of [-1, 1]) B.add(mChrome, f.put(new THREE.CylinderGeometry(0.004, 0.004, 0.35, 4), s * 0.7, RF - 0.16, 0));
      }
    }
    // round ducts along the upper ceiling
    for (const z of [-10.5, 10.5]) {
      B.add(mSteel, place(new THREE.CylinderGeometry(0.32, 0.32, 30, 16, 1, true), 0, RF - 0.45, z, 0, 0, PI / 2));
      for (let x = -13.5; x <= 13.5; x += 4.5) B.add(mDark, place(new THREE.CylinderGeometry(0.2, 0.25, 0.14, 14), x, RF - 0.83, z));
    }
    totem(12.4, -8.2, 0, y);
    trash(-10.9, 7.9, y); trash(10.9, -7.9, y);
    potPlant(-15.3, -13.3, 1.2, 1200, y); potPlant(15.3, 13.3, 1.2, 1201, y); potPlant(15.3, -13.3, 1.2, 1202, y); potPlant(-15.3, 13.3, 1.2, 1203, y);
    // window displays in the upper niches
    const nm: [number, number, number, number, string][] = [];
    for (let x = -14.5; x < 15; x += 2.3) { nm.push([x, UZ + 0.7, PI, Math.floor(r() * 3), ["#f3f0ea", "#2b2b2b", "#e2cdb4"][Math.floor(r() * 3)]]); nm.push([x + 0.9, -UZ - 0.7, 0, Math.floor(r() * 3), ["#f3f0ea", "#2b2b2b", "#e2cdb4"][Math.floor(r() * 3)]]); }
    for (const [x, z, ry, pose, c] of nm) mannequin(x, z, ry, FL + 0.05, pose, c, r() < 0.5 ? ["#e76f51", "#2a9d8f", "#ffafcc", "#bde0fe"][Math.floor(r() * 4)] : undefined);
    for (let z = -13; z < 13.5; z += 1.6) {
      I.add("bag", ["#3d4e6b", "#8fd1b5", "#f08a8a", "#e0b84a"][Math.floor(r() * 4)], { pos: [UX + 0.7, FL + 0.6, z], rotY: -PI / 2 });
      B.add(mWhite, place(bgeo(0.5, 0.55, 0.5), UX + 0.7, FL + 0.3, z));
      for (let i = 0; i < 3; i++) I.add("giftBox", ["#ffd166", "#ef476f", "#06d6a0"][i], { pos: [-UX - 0.7, FL + 0.15 + i * 0.2, z], rotY: r() });
    }
  }

  // ---------- rooms (first match wins)
  k.room("Entrance Hall", -4, 4, -24, -14);
  k.room("Fresh Mart Grocery", -28, -4, -24, -14);
  k.room("Voltex Electronics", 4, 28, -24, -14);
  k.room("Pixel Palace Arcade", 16, 28, -14, 6);
  k.room("Toy Planet", 16, 28, 6, 24);
  k.room("Step Up Shoes & Bags", 4, 16, 14, 24);
  k.room("Moda Luna Fashion", -14, 4, 14, 24);
  k.room("Tune Town Music", -28, -14, 14, 24);
  k.room("Food Court", -28, -16, -14, 14);
  k.room("Skylight Atrium", -VX, VX, -VZ, VZ);
  k.room("Mall Concourse", -16, 16, -14, 14);

  B.flush(k);
  I.flush(k);

  function mSlatGet() { return tm("mall.slatLight", () => M.slatwall("#e9e4dc"), "#ffffff", { rough: 0.7, bump: 0.4 }); }

  const hiderSpawns: THREE.Vector3[] = [];
  for (const z of [-11.9, -10.3, -8.7]) for (let i = 0; i < 8; i++) hiderSpawns.push(new THREE.Vector3(-6.3 + i * 1.8, 0, z));

  return k.finish({
    id: "mall",
    name: "Shopping Mall",
    bounds: { minX: X0 + 0.2, maxX: X1 - 0.2, minZ: Z0 + 0.2, maxZ: Z1 - 0.2 },
    hunterSpawns: grid(0, -21, 9),
    hiderSpawns,
    preview: { pos: [-9.2, 1.7, -11.6], look: [6, 4.2, 3], fov: 66 },
    lighting: {
      sky: "#e2ecf4",
      hemi: ["#fff8ee", "#b8aa96", 0.7],
      sun: { color: "#fff0d8", int: 2.8, pos: [7, 30, 11] },
      points: [
        { pos: [-20, 3.6, 0], color: "#ffd9a8", int: 45, dist: 18 },
        { pos: [-6, 3.6, 19], color: "#ffe6c8", int: 40, dist: 18 },
        { pos: [22, 3.4, -4], color: "#b58cff", int: 40, dist: 16 },
        { pos: [-16, 3.6, -19], color: "#eef4ff", int: 45, dist: 18 },
        { pos: [16, 3.6, -19], color: "#e8f0ff", int: 40, dist: 18 },
        { pos: [0, 8.8, 0], color: "#fff2dc", int: 80, dist: 30 },
      ],
      exposure: 1.05,
      env: 0.75,
      hdri: "lobby",
    },
  });
}
