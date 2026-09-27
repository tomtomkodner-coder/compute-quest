// School — a Japanese high school on a late afternoon. A long glossy corridor (vinyl tiles, mint wainscot, shoe
// lockers, stainless water fountain with lemon soap, class signs, framed masterpieces) links two classrooms
// (2-A, 2-B: 30 steel-frame desks + chairs, platform + lectern, chalk blackboards, cork notice boards, back cubby
// lockers stuffed with bags, curtains, goldfish tank), a music room (grand piano, marimba, drum kit, timpani,
// guitars, music stands, chairs on a carpet), a science lab (black-top benches with sinks and goosenecks, stools,
// beakers/flasks, glass cabinets, fume hood, skeleton model), a small gym (maple floor with court lines, hoop,
// stage with curtains, wall bars, mats, vaulting box, ball carts) and the entrance (genkan) with rows of getabako.
// The low sun comes through the south windows. Hunters appear at the entrance.
import * as THREE from "three";
import * as T from "../textures";
import * as S from "./tex/school";
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
  if (min < 0.03 || max > 4.5) return new THREE.BoxGeometry(w, h, d);
  const key = `${w.toFixed(3)},${h.toFixed(3)},${d.toFixed(3)}`;
  let g = chamferCache.get(key);
  if (!g) { g = chamferGeo(w, h, d, Math.min(0.018, min * 0.2)); chamferCache.set(key, g); }
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
  const geo = round ? new THREE.CylinderGeometry(r, r, len, seg, 1, true) : boxGeo(r * 2, len, r * 2);
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

export function buildSchool(): World {
  chamferCache.clear();
  const H = 3.2, DOOR = 2.3, GH = 7;
  const k = new Kit(H, DOOR);
  const kmat = k.mat.bind(k);
  k.mat = (ptex, color, repeat, extra = {}) => {
    if (ptex && (extra.bump ?? (extra.transparent ? 0 : 0.55)) > 0) S.fastNormal(ptex);
    return kmat(ptex, color, repeat, extra);
  };
  const B = new Batch();
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pick = <X,>(a: X[]) => a[Math.floor(rnd() * a.length)];
  const rr = (a: number, b: number) => a + rnd() * (b - a);

  // ---------- materials ----------
  const tPlaster = k.tex("sc-plaster", () => S.plaster("#f1eee6"));
  const tGrainL = k.tex("sc-grainL", () => S.grain("#d3b07c", 3));
  const tGrainM = k.tex("sc-grainM", () => S.grain("#a5743f", 5));
  const tGrainD = k.tex("sc-grainD", () => S.grain("#6a3f22", 7));
  const tCurtain = k.tex("sc-curtain", S.curtain);
  const tVinyl = k.tex("sc-vinyl", () => S.vinyl("#c6ccc2", 3));
  const mPlaster = k.mat(tPlaster, "#ffffff", [1, 1], { roughness: 0.88, bump: 0.18 });
  const mMint = k.mat(tPlaster, "#b5c9ba", [1, 1], { roughness: 0.55, bump: 0.15 });
  const mGymWall = k.mat(tPlaster, "#e9e4d6", [1, 1], { roughness: 0.9, bump: 0.18 });
  const mSkirt = k.mat(null, "#56615c", [1, 1], { roughness: 0.4 });
  const mCeil = k.mat(k.tex("sc-acoustic", S.acoustic), "#ffffff", [1, 1], { roughness: 0.95, bump: 0.3 });
  const mFloorClass = k.mat(k.tex("sc-oak", () => S.strips("#b78d5c", 12, 5)), "#ffffff", [1, 1], { roughness: 0.32, bump: 0.35 });
  const mFloorMusic = k.mat(k.tex("sc-oakd", () => S.strips("#946438", 12, 8)), "#ffffff", [1, 1], { roughness: 0.3, bump: 0.35 });
  const mFloorCorr = k.mat(tVinyl, "#ffffff", [1, 1], { roughness: 0.1, bump: 0.12 });
  const mFloorLab = k.mat(k.tex("sc-vinylg", () => S.vinyl("#aeb4b8", 7)), "#ffffff", [1, 1], { roughness: 0.18, bump: 0.12 });
  const mFloorGym = k.mat(k.tex("sc-maple", () => S.strips("#d9b27a", 9, 9, 0.2)), "#ffffff", [1, 1], { roughness: 0.2, bump: 0.25 });
  const mGranite = k.mat(k.tex("sc-granite", S.granite), "#ffffff", [1, 1], { roughness: 0.35, bump: 0.35 });
  const mWoodL = k.mat(tGrainL, "#ffffff", [1, 1], { roughness: 0.5, bump: 0.25 });
  const mWoodM = k.mat(tGrainM, "#ffffff", [1, 1], { roughness: 0.45, bump: 0.3 });
  const mWoodD = k.mat(tGrainD, "#ffffff", [1, 1], { roughness: 0.4, bump: 0.3 });
  const mDeskTop = k.mat(tGrainL, "#f2dcb8", [1, 1], { roughness: 0.42, bump: 0.15 });
  const mAlu = k.mat(null, "#b9bdc0", [1, 1], { metalness: 0.85, roughness: 0.32 });
  const mSteel = k.mat(null, "#8f969b", [1, 1], { metalness: 0.75, roughness: 0.38 });
  const mSteelDark = k.mat(null, "#3a4045", [1, 1], { metalness: 0.6, roughness: 0.45 });
  const mStainless = k.mat(null, "#d5d9db", [1, 1], { metalness: 0.95, roughness: 0.18 });
  const mTray = k.mat(null, "#7f8589", [1, 1], { metalness: 0.4, roughness: 0.5 });
  const mCabGrey = k.mat(k.tex("sc-wornG", () => S.wornPaint("#b5b8b1", 1)), "#ffffff", [1, 1], { metalness: 0.35, roughness: 0.45, bump: 0.25 });
  const mCream = k.mat(k.tex("sc-wornC", () => S.wornPaint("#e3dfd1", 2)), "#ffffff", [1, 1], { metalness: 0.25, roughness: 0.45, bump: 0.25 });
  const mBoardFrame = k.mat(null, "#a7abad", [1, 1], { metalness: 0.8, roughness: 0.35 });
  const mCork = k.mat(k.tex("sc-cork", () => S.cork(4)), "#ffffff", [1, 1], { roughness: 0.95, bump: 0.35 });
  const mCork2 = mCork;
  const mCurtain = k.mat(tCurtain, "#ffffff", [3, 3], { roughness: 1, bump: 0.25 });
  mCurtain.m.side = THREE.DoubleSide;
  const mStageCurtain = k.mat(tCurtain, "#8a1a26", [4, 4], { roughness: 0.9, bump: 0.3 });
  mStageCurtain.m.side = THREE.DoubleSide;
  const mGlass = k.mat(null, "#dcebee", [1, 1], { roughness: 0.04, metalness: 0.1 });
  Object.assign(mGlass.m, { transparent: true, opacity: 0.16, depthWrite: false });
  B.noShadow.add(mGlass);
  const mGlassWare = k.mat(null, "#e8f6f8", [1, 1], { roughness: 0.03, metalness: 0.05 });
  Object.assign(mGlassWare.m, { transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide });
  const mFluoro = k.mat(null, "#ffffff", [1, 1], { emissive: "#fff7e6", emissiveIntensity: 2.4, roughness: 0.5 });
  B.noShadow.add(mFluoro);
  const mFixture = k.mat(null, "#e9e9e4", [1, 1], { roughness: 0.4, metalness: 0.3 });
  const mWhiteP = k.mat(null, "#efeee8", [1, 1], { roughness: 0.45 });
  const mBlackP = k.mat(null, "#1b1c1f", [1, 1], { roughness: 0.4 });
  const mRedP = k.mat(null, "#c7282a", [1, 1], { roughness: 0.35 });
  const mBlueP = k.mat(null, "#2b58b0", [1, 1], { roughness: 0.4 });
  const mGreenP = k.mat(null, "#3b8f4c", [1, 1], { roughness: 0.45 });
  const mYellowP = k.mat(null, "#e9c23a", [1, 1], { roughness: 0.4 });
  const mOrange = k.mat(null, "#e2601f", [1, 1], { roughness: 0.35, metalness: 0.3 });
  const mRubber = k.mat(null, "#202022", [1, 1], { roughness: 0.8 });
  const mPaper = k.mat(null, "#f5f3ec", [1, 1], { roughness: 0.85 });
  const mInst = k.mat(null, "#ffffff", [1, 1], { roughness: 0.6 }); // instance-coloured props
  const mFabric = k.mat(k.tex("sc-fab", () => T.noise("#ffffff", 0.12, 5, 3000)), "#ffffff", [1, 1], { roughness: 0.95, bump: 0.5 });
  const mPiano = k.mat(null, "#0b0b0d", [1, 1], { roughness: 0.07, metalness: 0.15 });
  const mKeys = k.mat(k.tex("sc-keys", S.pianoKeys), "#ffffff", [1, 1], { roughness: 0.25, bump: 0 });
  const mBrass = k.mat(null, "#caa04a", [1, 1], { metalness: 0.95, roughness: 0.28 });
  const mCopper = k.mat(null, "#b8703c", [1, 1], { metalness: 0.95, roughness: 0.3 });
  const mDrumHead = k.mat(null, "#efebe0", [1, 1], { roughness: 0.6 });
  const mDrumShell = k.mat(null, "#962029", [1, 1], { roughness: 0.18, metalness: 0.25 });
  const mLabTop = k.mat(null, "#1b1d20", [1, 1], { roughness: 0.22 });
  const mLabCab = k.mat(k.tex("sc-wornL", () => S.wornPaint("#d8dad4", 3)), "#ffffff", [1, 1], { roughness: 0.55, bump: 0.2 });
  const mBone = k.mat(null, "#e9e1cb", [1, 1], { roughness: 0.55 });
  const mMatBlue = k.mat(k.tex("sc-matb", () => S.gymMat("#2b59a6")), "#ffffff", [1, 1], { roughness: 0.55, bump: 0.4 });
  const mMatGreen = k.mat(k.tex("sc-matg", () => S.gymMat("#4f7f55")), "#ffffff", [1, 1], { roughness: 0.6, bump: 0.4 });
  const mCanvas = k.mat(tCurtain, "#f6f2e8", [1, 1], { roughness: 0.85, bump: 0.4 });
  const mBasket = k.mat(k.tex("sc-bball", S.basketball), "#ffffff", [1, 1], { roughness: 0.6, bump: 0.5 });
  const mVolley = k.mat(k.tex("sc-vball", S.volleyball), "#ffffff", [1, 1], { roughness: 0.45, bump: 0.1 });
  const mNet = k.mat(k.tex("sc-net", S.netTex), "#ffffff", [2, 1], { transparent: true, roughness: 0.9 });
  const mLineW = k.mat(null, "#f3f2ec", [1, 1], { roughness: 0.25 });
  const mLineY = k.mat(null, "#e3b52a", [1, 1], { roughness: 0.25 });
  const mLineG = k.mat(null, "#2f8a55", [1, 1], { roughness: 0.25 });
  const mSand = k.mat(k.tex("sc-sand", S.sand), "#ffffff", [1, 1], { roughness: 1, bump: 0.6 });
  const mGrass = k.mat(k.tex("sc-grass", S.grass), "#ffffff", [1, 1], { roughness: 1, bump: 0.6 });
  const mLeaves = k.mat(k.tex("leaves", T.leaves), "#9fc27a", [2, 2], { roughness: 0.9, bump: 0.7 });
  const mTrunk = k.mat(tGrainD, "#8d7560", [1, 3], { roughness: 0.9, bump: 0.8 });
  const mRoof = k.mat(null, "#6a6c6e", [1, 1], { roughness: 0.9 });
  const mOuterWall = k.mat(tPlaster, "#d9d4c8", [1, 1], { roughness: 0.9, bump: 0.2 });
  const mTileWall = k.mat(k.tex("whiteTile", T.whiteTile), "#ffffff", [1, 1], { roughness: 0.15, bump: 0.25 });
  const mPosters = k.mat(k.tex("sc-posters", S.posters), "#ffffff", [1, 1], { roughness: 0.7, bump: 0 });
  const mPeriodic = k.mat(k.tex("sc-periodic", S.periodic), "#ffffff", [1, 1], { roughness: 0.6, bump: 0 });
  const mClock = k.mat(k.tex("sc-clock", S.clockFace), "#ffffff", [1, 1], { roughness: 0.3, bump: 0 });
  const mExit = k.mat(k.tex("sc-exit", S.exitSign), "#ffffff", [1, 1], { emissive: "#ffffff", emissiveIntensity: 0.9, bump: 0 });
  const mBooks = k.mat(k.tex("books", T.books), "#ffffff", [1, 1], { roughness: 0.8, bump: 0.3 });
  const mCovers = k.mat(k.tex("sc-covers", S.covers), "#ffffff", [1, 1], { roughness: 0.7, bump: 0 });
  const mCarpet = k.mat(tCurtain, "#8a3238", [8, 8], { roughness: 1, bump: 0.6 });
  const mCardboard = k.mat(tCurtain, "#c29a66", [1, 1], { roughness: 0.9, bump: 0.3 });
  const mTerracotta = k.mat(null, "#a55a3a", [1, 1], { roughness: 0.8 });
  const mSoil = k.mat(null, "#3e2c1e", [1, 1], { roughness: 1 });
  const mWater = k.mat(null, "#8fc6d4", [1, 1], { roughness: 0.05, metalness: 0.1 });
  Object.assign(mWater.m, { transparent: true, opacity: 0.45, depthWrite: false });
  const mGold = k.mat(null, "#d8b04c", [1, 1], { metalness: 0.95, roughness: 0.22 });
  const mDarkInside = k.mat(null, "#1a1a1c", [1, 1], { roughness: 0.9 });
  const mRedLamp = k.mat(null, "#ff3a2a", [1, 1], { emissive: "#ff2a1a", emissiveIntensity: 1.6 });
  const mScreen = k.mat(null, "#0e1114", [1, 1], { roughness: 0.12, metalness: 0.2 });

  const boardMats = { math: k.mat(k.tex("sc-bmath", () => S.blackboard("math")), "#fff", [1, 1], { roughness: 0.85, bump: 0 }), eng: k.mat(k.tex("sc-beng", () => S.blackboard("eng")), "#fff", [1, 1], { roughness: 0.85, bump: 0 }), music: k.mat(k.tex("sc-bmus", () => S.blackboard("music")), "#fff", [1, 1], { roughness: 0.85, bump: 0 }), lab: k.mat(k.tex("sc-blab", () => S.blackboard("lab")), "#fff", [1, 1], { roughness: 0.85, bump: 0 }) };

  // ---- desks, chairs, papers, dirt ----
  const mDeskTops = [0, 1, 2, 3].map((v) => k.mat(k.tex("sc-desk" + v, () => S.deskTop(v)), "#ffffff", [1, 1], { roughness: 0.45, bump: 0.22 }));
  const mDeskUnder = k.mat(tGrainL, "#c9b08a", [1, 1], { roughness: 0.7, bump: 0.2 });
  const mBand = k.mat(null, "#5a4632", [1, 1], { roughness: 0.4 });
  const mDeskFrame = k.mat(null, "#9aa3a0", [1, 1], { metalness: 0.7, roughness: 0.4 });
  const mPly = k.mat(k.tex("sc-ply", S.plywood), "#ffffff", [1, 1], { roughness: 0.5, bump: 0.2 });
  const mPapers = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => k.mat(k.tex("sc-paper" + i, () => S.paper(i)), "#ffffff", [1, 1], { roughness: 0.85, bump: 0 }));
  for (const m of mPapers) m.m.side = THREE.DoubleSide;
  const mNotebook = k.mat(k.tex("sc-notebooks", S.notebooks), "#ffffff", [1, 1], { roughness: 0.6, bump: 0 });
  const mTags = k.mat(k.tex("sc-tags", S.nameTags), "#ffffff", [1, 1], { roughness: 0.7, bump: 0 });
  const decal = (t: ReturnType<typeof S.dirt>) => {
    const m = k.mat(t, "#ffffff", [1, 1], { roughness: 0.9, bump: 0 });
    Object.assign(m.m, { transparent: true, depthWrite: false, alphaTest: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    B.noShadow.add(m);
    return m;
  };
  const mDustCorner = decal(k.tex("sc-dirt0", () => S.dirt(0)));
  const mDustLine = decal(k.tex("sc-dirt1", () => S.dirt(1)));
  const mScuffFloor = decal(k.tex("sc-dirt2", () => S.dirt(2)));
  const mScuffWall = decal(k.tex("sc-dirt3", () => S.dirt(3)));
  const mDeskMat = k.mat(null, "#3f6b52", [1, 1], { roughness: 0.65 });
  const mCoffee = k.mat(null, "#3a2414", [1, 1], { roughness: 0.15 });
  const mChalkFloor = decal(k.tex("sc-dirt4", () => S.dirt(4)));
  mChalkFloor.m.opacity = 0.45;
  const mMottoA = k.mat(k.tex("sc-motto-a", () => S.motto("ביחד מצליחים!", "כיתה ט'3 - המחנכת: מירי")), "#ffffff", [1, 1], { roughness: 0.7, bump: 0 });
  const mMottoB = k.mat(k.tex("sc-motto-b", () => S.motto("לומדים באהבה", "כיתה ט'4 - המחנך: אבי")), "#ffffff", [1, 1], { roughness: 0.7, bump: 0 });
  const mMopHead = k.mat(k.tex("sc-fab", () => T.noise("#ffffff", 0.12, 5, 3000)), "#b8b0a0", [2, 2], { roughness: 1, bump: 0.6 });
  const mChalkDust = k.mat(null, "#f4f4ee", [1, 1], { roughness: 1 });
  Object.assign(mChalkDust.m, { transparent: true, opacity: 0.45, depthWrite: false });
  B.noShadow.add(mChalkDust);

  // instanced lists
  const boxI = new IList(new THREE.BoxGeometry(1, 1, 1), mInst); // books, erasers, boxes
  const bagI = new IList(chamferGeo(1, 1, 1, 0.12), mFabric); // school bags
  const shoeBody = new THREE.BoxGeometry(0.085, 0.055, 0.22);
  const shoePair = mergeG([place(shoeBody.clone(), -0.052, 0.028, 0), place(shoeBody.clone(), 0.052, 0.028, 0)]);
  const toePair = mergeG([place(new THREE.BoxGeometry(0.088, 0.04, 0.07), -0.052, 0.02, -0.08), place(new THREE.BoxGeometry(0.088, 0.04, 0.07), 0.052, 0.02, -0.08)]);
  const shoeI = new IList(shoePair, mInst);
  const toeI = new IList(toePair, mInst);
  const ballB = new IList(new THREE.SphereGeometry(0.12, 16, 10), mBasket);
  const ballV = new IList(new THREE.SphereGeometry(0.105, 16, 10), mVolley);
  const leafI = new IList(new THREE.IcosahedronGeometry(1, 1), mLeaves);
  const glassI = new IList(latheG([[0.001, 0], [0.04, 0], [0.042, 0.004], [0.042, 0.11], [0.047, 0.118]], 14), mGlassWare, true);
  const flaskI = new IList(latheG([[0.001, 0], [0.06, 0], [0.062, 0.01], [0.02, 0.12], [0.017, 0.17], [0.02, 0.175]], 14), mGlassWare, true);
  const bottleI = new IList(latheG([[0.001, 0], [0.04, 0], [0.042, 0.01], [0.042, 0.12], [0.02, 0.16], [0.015, 0.2], [0.017, 0.21]], 10), mInst);
  const liquidI = new IList(new THREE.CylinderGeometry(1, 1, 1, 12), mInst, true);
  const cylI = new IList(new THREE.CylinderGeometry(1, 1, 1, 12), mInst); // pencils, chalk, umbrellas, cans
  const gumI = new IList(new THREE.SphereGeometry(1, 8, 5), k.mat(null, "#ffffff", [1, 1], { roughness: 0.3 }), true);
  const crumbI = new IList(new THREE.BoxGeometry(1, 1, 1), mInst, true);
  const hexI = new IList(new THREE.CylinderGeometry(1, 1, 1, 6), mInst, true);
  const tipI = new IList(new THREE.ConeGeometry(1, 1, 6), mInst, true);
  const paperBallI = new IList((() => {
    const g = new THREE.IcosahedronGeometry(1, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const d = 0.78 + 0.28 * Math.sin(x * 9.1 + y * 5.3) * Math.cos(z * 7.7 - x * 3.1);
      p.setXYZ(i, x * d, y * d, z * d);
    }
    g.computeVertexNormals();
    return g;
  })(), mPaper);
  const tagLists = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => new IList(uvPlane(0.1, 0.03, [(i % 4) / 4, 0.5 - Math.floor(i / 4) * 0.5, 0.25, 0.5]), mTags, true));
  const tagI = { add: (x: number, y: number, z: number, s: V3t = [1, 1, 1], _c?: string, ry = 0) => tagLists[Math.floor(rnd() * 8)].add(x, y, z, s, undefined, ry) };
  const gumCols = ["#f07aa8", "#f59ac0", "#7fd08a", "#6fb0f0", "#d9d0c4", "#e86a9a", "#b8e070"];
  const penCols = ["#e6c640", "#e6c640", "#3a6fd8", "#d83a3a", "#2f9a4e", "#222226", "#f08a2a"];
  const nbCols = ["#2d5aa0", "#c43d3d", "#3a8a4f", "#e7b93a", "#7b4ba6", "#e07a2c", "#2f9ab0", "#d8d4c6"];
  // school chair: bent plywood seat (dished, rolled front edge) + curved backrest on a bent steel-tube frame
  const chairParts = (() => {
    const seat = new THREE.BoxGeometry(0.4, 0.013, 0.38, 8, 1, 6);
    const sp = seat.attributes.position;
    for (let i = 0; i < sp.count; i++) {
      const x = sp.getX(i), zz = sp.getZ(i);
      let dy = 0.016 * (x / 0.2) ** 2 + 0.008 * (zz / 0.19) ** 2;
      if (zz < -0.12) dy -= ((-zz - 0.12) / 0.07) ** 2 * 0.03;
      sp.setY(i, sp.getY(i) + dy);
    }
    seat.computeVertexNormals();
    seat.translate(0, 0.43, 0);
    const back = new THREE.BoxGeometry(0.38, 0.17, 0.013, 8, 1, 1);
    const bp = back.attributes.position;
    for (let i = 0; i < bp.count; i++) bp.setZ(i, bp.getZ(i) - 0.035 * (bp.getX(i) / 0.19) ** 2);
    back.computeVertexNormals();
    back.rotateX(0.12);
    back.translate(0, 0.68, 0.215);
    const steel: G[] = [], feet: G[] = [];
    for (const s of [-1, 1]) {
      const x = s * 0.185;
      steel.push(tubeG([[x, 0.012, -0.165], [x, 0.2, -0.168], [x, 0.39, -0.17], [x, 0.415, -0.135], [x, 0.418, 0.1]], 0.011, 10, 6));
      steel.push(tubeG([[x, 0.012, 0.2], [x, 0.2, 0.188], [x, 0.41, 0.175], [x, 0.6, 0.195], [x, 0.77, 0.23]], 0.011, 10, 6));
      steel.push(beam([x, 0.13, -0.166], [x, 0.13, 0.19], 0.008, 6));
      steel.push(place(new THREE.BoxGeometry(0.03, 0.1, 0.01), x * 0.96, 0.68, 0.206 - 0.004 * s * 0, 0.12));
      feet.push(place(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 8), x, 0.01, -0.165), place(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 8), x, 0.01, 0.2));
    }
    steel.push(beam([-0.185, 0.405, 0.12], [0.185, 0.405, 0.12], 0.009, 6), beam([-0.185, 0.405, -0.12], [0.185, 0.405, -0.12], 0.009, 6));
    return { wood: mergeG([seat, back]), steel: mergeG(steel), feet: mergeG(feet) };
  })();
  // school desk shared parts (local frame, student at +z)
  const deskParts = (() => {
    const bx0 = (w: number, h: number, d: number, x: number, y: number, z: number) => place(boxGeo(w, h, d), x, y + h / 2, z);
    const under = [bx0(0.63, 0.02, 0.43, 0, 0.678, 0)];
    const band: G[] = [], frame: G[] = [], shelf: G[] = [], feet: G[] = [];
    for (const s of [-1, 1]) {
      band.push(new THREE.BoxGeometry(0.654, 0.026, 0.012).translate(0, 0.688, s * 0.221), new THREE.BoxGeometry(0.012, 0.026, 0.43).translate(s * 0.321, 0.688, 0));
      for (const sz of [-1, 1]) {
        frame.push(place(new THREE.CylinderGeometry(0.013, 0.013, 0.66, 8, 1, true), s * 0.295, 0.34, sz * 0.19));
        feet.push(place(new THREE.CylinderGeometry(0.016, 0.016, 0.02, 8), s * 0.295, 0.01, sz * 0.19));
      }
      frame.push(beam([s * 0.295, 0.09, -0.19], [s * 0.295, 0.09, 0.19], 0.009, 6), bx0(0.02, 0.03, 0.4, s * 0.295, 0.645, 0));
      frame.push(tubeG([[s * 0.33, 0.645, 0.03], [s * 0.35, 0.635, 0.03], [s * 0.356, 0.605, 0.03], [s * 0.346, 0.59, 0.03]], 0.004, 8, 4));
      shelf.push(new THREE.BoxGeometry(0.008, 0.1, 0.33).translate(s * 0.28, 0.605, -0.035));
    }
    frame.push(beam([-0.295, 0.09, -0.19], [0.295, 0.09, -0.19], 0.009, 6));
    shelf.push(new THREE.BoxGeometry(0.56, 0.008, 0.33).translate(0, 0.559, -0.035), new THREE.BoxGeometry(0.56, 0.1, 0.008).translate(0, 0.605, -0.2));
    return { under: mergeG(under), band: mergeG(band), frame: mergeG(frame), shelf: mergeG(shelf), feet: mergeG(feet) };
  })();
  const deskUnderI = new IList(deskParts.under, mDeskUnder);
  const deskBandI = new IList(deskParts.band, mBand);
  const deskFrameI = new IList(deskParts.frame, mDeskFrame);
  const deskShelfI = new IList(deskParts.shelf, mTray);
  const deskFootI = new IList(deskParts.feet, mRubber, true);
  const chairWoodI = new IList(chairParts.wood, mPly);
  const chairSteelI = new IList(chairParts.steel, mSteel);
  const chairFootI = new IList(chairParts.feet, mRubber, true);

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
    /** instance at local position */
    inst(l: IList, lx: number, ly: number, lz: number, s: V3t, color?: string, ry = 0, rx = 0, rz = 0) {
      const [x, z] = this.pt(lx, lz);
      l.add(x, ly, z, s, color, this.ry + ry, rx, rz);
    }
  }
  const W = new Fr(0, 0, 0); // world frame
  const bx = (m: Mat, w: number, h: number, d: number, x: number, y: number, z: number, ry = 0) => W.box(m, w, h, d, x, y, z, 0, ry);
  const slab = (m: Mat, x1: number, x2: number, y1: number, y2: number, z1: number, z2: number, unit: number) => {
    const g = new THREE.BoxGeometry(x2 - x1, y2 - y1, z2 - z1);
    g.translate((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
    return B.add(m, g, unit);
  };
  const flat = (m: Mat, x1: number, x2: number, z1: number, z2: number, y = 0.002) => {
    const g = new THREE.PlaneGeometry(x2 - x1, z2 - z1);
    g.rotateX(-Math.PI / 2);
    g.translate((x1 + x2) / 2, y, (z1 + z2) / 2);
    return B.add(m, g);
  };
  /** vertical plane facing direction ry (0 = +z) with uv crop; y = centre */
  const panel = (m: Mat, w: number, h: number, x: number, y: number, z: number, ry: number, uv?: [number, number, number, number]) => {
    const g = new THREE.PlaneGeometry(w, h);
    if (uv) { const a = g.attributes.uv; for (let i = 0; i < a.count; i++) a.setXY(i, uv[0] + a.getX(i) * uv[2], uv[1] + a.getY(i) * uv[3]); }
    g.rotateY(ry);
    g.translate(x, y, z);
    return B.add(m, g);
  };

  // ---------- walls ----------
  type Hole = { c: number; w: number; y0: number; y1: number; win?: boolean; bars?: number };
  type Wains = { side: number; h: number; m: Mat };
  const TH = 0.3;
  function wall(axis: "x" | "z", at: number, a1: number, a2: number, h: number, m: Mat, holes: Hole[] = [], opt: { skirt?: number; wains?: Wains[]; unit?: number } = {}) {
    const unit = opt.unit ?? 2;
    const put = (s1: number, s2: number, y0: number, y1: number) => {
      if (s2 - s1 < 0.005 || y1 - y0 < 0.005) return;
      const g = axis === "x" ? new THREE.BoxGeometry(s2 - s1, y1 - y0, TH) : new THREE.BoxGeometry(TH, y1 - y0, s2 - s1);
      g.translate(axis === "x" ? (s1 + s2) / 2 : at, (y0 + y1) / 2, axis === "x" ? at : (s1 + s2) / 2);
      B.add(m, g, unit);
      if (axis === "x") k.collider(s1, s2, at - TH / 2, at + TH / 2, y0, y1, y1 < 1.3);
      else k.collider(at - TH / 2, at + TH / 2, s1, s2, y0, y1, y1 < 1.3);
      if (y0 > 0.001) return;
      // skirting + wainscot on the faces
      for (const side of [-1, 1]) {
        if (opt.skirt !== undefined && opt.skirt !== 0 && opt.skirt !== side) continue;
        const off = at + side * (TH / 2 + 0.008);
        const wn = opt.wains?.find((q) => q.side === side);
        if (wn) {
          const hh = Math.min(wn.h, y1);
          const g2 = axis === "x" ? new THREE.BoxGeometry(s2 - s1, hh, 0.012) : new THREE.BoxGeometry(0.012, hh, s2 - s1);
          g2.translate(axis === "x" ? (s1 + s2) / 2 : off, hh / 2, axis === "x" ? off : (s1 + s2) / 2);
          B.add(wn.m, g2, 2);
          if (hh < y1 - 0.05) {
            const g3 = axis === "x" ? new THREE.BoxGeometry(s2 - s1, 0.04, 0.03) : new THREE.BoxGeometry(0.03, 0.04, s2 - s1);
            g3.translate(axis === "x" ? (s1 + s2) / 2 : at + side * (TH / 2 + 0.015), hh, axis === "x" ? at + side * (TH / 2 + 0.015) : (s1 + s2) / 2);
            B.add(wn.m === mWoodL ? mWoodM : mSkirt, g3);
          }
        }
        const g4 = axis === "x" ? new THREE.BoxGeometry(s2 - s1, 0.1, 0.02) : new THREE.BoxGeometry(0.02, 0.1, s2 - s1);
        g4.translate(axis === "x" ? (s1 + s2) / 2 : at + side * (TH / 2 + 0.01), 0.05, axis === "x" ? at + side * (TH / 2 + 0.01) : (s1 + s2) / 2);
        B.add(mSkirt, g4);
      }
    };
    let cur = a1;
    for (const o of [...holes].sort((p, q) => p.c - q.c)) {
      const s1 = o.c - o.w / 2, s2 = o.c + o.w / 2;
      put(cur, s1, 0, h);
      put(s1, s2, 0, o.y0);
      put(s1, s2, o.y1, h);
      if (o.win) windowFrame(axis, at, o);
      else doorTrim(axis, at, o);
      cur = s2;
    }
    put(cur, a2, 0, h);
  }
  function windowFrame(axis: "x" | "z", at: number, o: Hole) {
    const f = new Fr(axis === "x" ? o.c : at, axis === "x" ? at : o.c, axis === "x" ? 0 : Math.PI / 2);
    const w = o.w, hh = o.y1 - o.y0;
    f.box(mAlu, w, 0.05, 0.1, 0, o.y0, 0);
    f.box(mAlu, w, 0.05, 0.1, 0, o.y1 - 0.05, 0);
    f.box(mAlu, 0.05, hh, 0.1, -w / 2 + 0.025, o.y0, 0);
    f.box(mAlu, 0.05, hh, 0.1, w / 2 - 0.025, o.y0, 0);
    const n = o.bars ?? Math.max(2, Math.round(w / 0.9));
    for (let i = 1; i < n; i++) f.box(mAlu, 0.045, hh - 0.08, 0.05, -w / 2 + (i * w) / n, o.y0 + 0.04, (i % 2 ? 1 : -1) * 0.02);
    if (hh > 1.4) f.box(mAlu, w - 0.08, 0.04, 0.06, 0, o.y1 - 0.5, 0);
    f.geo(mGlass, new THREE.BoxGeometry(w - 0.06, hh - 0.06, 0.01), 0, o.y0 + hh / 2, 0);
    f.col(-w / 2, w / 2, -TH / 2, TH / 2, o.y0, o.y1, false);
    if (o.y0 > 0.3) for (const s of [-1, 1]) f.box(mAlu, w, 0.025, 0.08, 0, o.y0 - 0.02, s * (TH / 2 + 0.03));
  }
  function doorTrim(axis: "x" | "z", at: number, o: Hole) {
    const f = new Fr(axis === "x" ? o.c : at, axis === "x" ? at : o.c, axis === "x" ? 0 : Math.PI / 2);
    const w = o.w;
    for (const s of [-1, 1]) f.box(mAlu, 0.06, o.y1, TH + 0.04, s * (w / 2 - 0.03), 0, 0);
    f.box(mAlu, w, 0.06, TH + 0.04, 0, o.y1 - 0.06, 0);
    f.box(mSteelDark, w - 0.1, 0.012, TH, 0, 0, 0);
  }
  /** sliding classroom door leaf (open, parked against the wall on side sd) */
  function slidingDoor(x: number, z: number, sd: number) {
    const f = new Fr(x, z + sd * 0.19, 0);
    f.box(mWoodM, 0.95, 2.22, 0.04, 0, 0.02, 0);
    f.geo(mGlass, new THREE.BoxGeometry(0.62, 0.7, 0.012), 0, 1.65, sd * 0.021);
    f.box(mAlu, 0.64, 0.03, 0.05, 0, 1.28, 0);
    f.box(mAlu, 0.64, 0.03, 0.05, 0, 1.99, 0);
    f.box(mStainless, 0.03, 0.14, 0.05, -0.4, 0.95, 0);
  }

  // ---------- floors / ceilings / roof ----------
  slab(mFloorClass, -24, 0, -0.2, 0, 0, 10, 0.9);
  slab(mFloorMusic, 0, 11, -0.2, 0, 0, 10, 0.9);
  slab(mFloorLab, 11, 24, -0.2, 0, 0, 10, 0.9);
  slab(mFloorCorr, -24, 24, -0.2, 0, -3, 0, 0.9);
  slab(mFloorGym, -24, -4, -0.2, 0, -20, -3, 1.0);
  slab(mGranite, -4, 11, -0.2, 0, -14, -10.8, 0.8);
  slab(mFloorCorr, -4, 11, -0.2, 0, -10.8, -3, 0.9);
  // outside ground
  slab(mSand, -80, 80, -0.4, -0.03, -80, 80, 3);
  slab(mGrass, 11.15, 24, -0.2, -0.01, -13.85, -3.15, 2);
  for (const [x1, x2, z1, z2, hh] of [[-24, 24, 0, 10, H], [-24, 24, -3, 0, H], [-4, 11, -14, -3, H]] as number[][]) slab(mCeil, x1, x2, hh, hh + 0.12, z1, z2, 1.2);
  slab(k.mat(null, "#e4e2da", [1, 1], { roughness: 0.9 }), -24, -4, GH, GH + 0.12, -20, -3, 2);
  // roofs (thick → they cast the sun's shadow so light only enters through windows)
  slab(mRoof, -24.4, 24.4, H + 0.14, H + 0.9, -2.95, 10.4, 4);
  slab(mRoof, -3.95, 11.2, H + 0.14, H + 0.9, -14.2, -2.95, 4);
  slab(mRoof, -24.4, -3.8, GH + 0.14, GH + 0.9, -20.4, -2.8, 4);

  // ---------- walls ----------
  const winS = (c: number, w: number): Hole => ({ c, w, y0: 0.85, y1: 2.75, win: true });
  wall("x", 10, -24.15, 24.15, H, mPlaster, [-21.9, -18, -14.1, -9.9, -6, -2.1, 13.5, 17.5, 21.5].map((c) => winS(c, 3.4)).concat([2.3, 5.5, 8.7].map((c) => winS(c, 2.8))), { skirt: -1 });
  const door = (c: number, w = 1.4, y1 = DOOR): Hole => ({ c, w, y0: 0, y1 });
  const tran = (c: number, w: number): Hole => ({ c, w, y0: 2.45, y1: 2.95, win: true, bars: Math.round(w / 1.2) });
  wall("x", 0, -24, 24, H, mPlaster, [door(-22.4), door(-13.4), tran(-17.9, 7), door(-10.4), door(-1.4), tran(-5.9, 7), door(1.6), door(8), tran(4.8, 4.8), door(12.6), door(21.4), tran(17, 7.2)], { wains: [{ side: -1, h: 1.0, m: mMint }] });
  wall("x", -3, -24.15, -4, GH, mGymWall, [door(-20, 2), door(-8, 2)], { wains: [{ side: 1, h: 1.0, m: mMint }, { side: -1, h: 2.4, m: mWoodL }] });
  wall("x", -3, -4, 11, H, mPlaster, [door(0.5, 5, 2.6), door(7.5, 5, 2.6)], { wains: [{ side: 1, h: 1.0, m: mMint }] });
  wall("x", -3, 11, 24.15, H, mPlaster, [{ c: 12.8, w: 3, y0: 1.0, y1: 2.7, win: true }, { c: 16.2, w: 3, y0: 1.0, y1: 2.7, win: true }, { c: 19.6, w: 3, y0: 1.0, y1: 2.7, win: true }, { c: 22.8, w: 1.8, y0: 1.0, y1: 2.7, win: true }], { wains: [{ side: 1, h: 1.0, m: mMint }] });
  const winG = (c: number, w: number): Hole => ({ c, w, y0: 4.2, y1: 6.2, win: true });
  wall("z", -24, -20.15, -3, GH, mGymWall, [winG(-18, 2.2), winG(-15.2, 2.2), winG(-7.8, 2.2), winG(-5, 2.2)], { skirt: 1, wains: [{ side: 1, h: 2.4, m: mWoodL }] });
  wall("z", -24, -3, 0, H, mPlaster, [{ c: -1.5, w: 2, y0: 0.9, y1: 2.7, win: true }], { skirt: 1, wains: [{ side: 1, h: 1.0, m: mMint }] });
  wall("z", -24, 0, 10.15, H, mPlaster, [], { skirt: 1 });
  wall("z", 24, -3, 0, H, mPlaster, [{ c: -1.5, w: 2, y0: 0.9, y1: 2.7, win: true }], { skirt: -1, wains: [{ side: -1, h: 1.0, m: mMint }] });
  wall("z", 24, 0, 10.15, H, mPlaster, [], { skirt: -1 });
  wall("z", -12, 0.15, 9.85, H, mPlaster);
  wall("z", 0, 0.15, 9.85, H, mPlaster);
  wall("z", 11, 0.15, 9.85, H, mPlaster);
  wall("z", -4, -20.15, -3.15, GH, mGymWall, [], { wains: [{ side: -1, h: 2.4, m: mWoodL }] });
  wall("z", 11, -14, -3.15, H, mPlaster, [{ c: -8.5, w: 3, y0: 1.0, y1: 2.6, win: true }], { skirt: -1 });
  wall("x", -14, -4, 11.15, H, mPlaster, [{ c: -1.4, w: 2.4, y0: 0.9, y1: 2.6, win: true }, { c: 4, w: 6, y0: 0, y1: 2.6, win: true, bars: 4 }, { c: 9.2, w: 2.4, y0: 0.9, y1: 2.6, win: true }], { skirt: 1 });
  wall("x", -20, -24.15, -3.85, GH, mGymWall, [winG(-21.2, 2.4), winG(-17.6, 2.4), winG(-14, 2.4), winG(-10.4, 2.4), winG(-6.8, 2.4)], { skirt: 1, wains: [{ side: 1, h: 2.4, m: mWoodL }] });
  // outer facade parapet & outdoor block colliders
  k.collider(-3.85, 24.2, -22, -14.15, 0, 3, false);
  k.collider(11.15, 24.2, -14.15, -3.15, 0, 3, false);

  // sliding doors of the rooms (parked open on the room side)
  for (const [c, sd] of [[-22.4, 1], [-13.4, 1], [-10.4, 1], [-1.4, 1], [1.6, 1], [8, 1], [12.6, 1], [21.4, 1]]) slidingDoor(c + (c === -13.4 || c === -1.4 || c === 8 || c === 21.4 ? -0.95 : 0.95), 0, sd);

  // ---------- fluorescent ceiling panels ----------
  const troffer = (x: number, z: number, y: number, along: "x" | "z" = "x") => {
    const f = new Fr(x, z, along === "x" ? 0 : Math.PI / 2);
    f.box(mFixture, 1.26, 0.05, 0.34, 0, y - 0.05, 0);
    f.box(mFluoro, 1.18, 0.02, 0.26, 0, y - 0.07, 0);
  };
  for (const x0 of [-24, -12]) for (const dx of [3, 6.3, 9.6]) for (const z of [2.3, 5, 7.7]) troffer(x0 + dx, z, H);
  for (const dx of [2.8, 5.8, 8.6]) for (const z of [2.6, 6.2]) troffer(dx, z, H);
  for (const dx of [14.2, 17.6, 21]) for (const z of [2.6, 5, 7.4]) troffer(dx, z, H);
  for (let x = -22.5; x < 24; x += 3.2) troffer(x, -1.5, H);
  for (const x of [-1, 3.5, 8]) for (const z of [-11.8, -8.2, -5]) troffer(x, z, H);

  // ---------- signs ----------
  const signMats = new Map<string, Mat>();
  const signMat = (t: string) => {
    let m = signMats.get(t);
    if (!m) { m = k.mat(k.tex("sc-sign-" + t, () => T.signboard("#f7f6f0", "#1d2b4a", t, 256, 80)), "#ffffff", [1, 1], { roughness: 0.5, bump: 0 }); signMats.set(t, m); }
    return m;
  };
  /** plate sticking out of a wall (seen along the corridor); ry = wall normal direction */
  const plate = (t: string, x: number, z: number, nz: number) => {
    const zc = z + nz * 0.38;
    bx(mAlu, 0.035, 0.24, 0.66, x, 2.5, zc);
    panel(signMat(t), 0.6, 0.19, x + 0.019, 2.62, zc, Math.PI / 2);
    panel(signMat(t), 0.6, 0.19, x - 0.019, 2.62, zc, -Math.PI / 2);
  };
  plate("2年A組", -22.4, -0.15, -1);
  plate("2年B組", -10.4, -0.15, -1);
  plate("音楽室", 1.6, -0.15, -1);
  plate("理科室", 12.6, -0.15, -1);
  plate("体育館", -20, -2.85, 1);
  plate("体育館", -8, -2.85, 1);
  plate("昇降口", 4, -2.85, 1);

  // ---------- helpers: clocks, paintings, posters, plants ----------
  const clock = (x: number, y: number, z: number, ry: number, r = 0.17) => {
    const f = new Fr(x, z, ry);
    f.geo(mWhiteP, new THREE.CylinderGeometry(r, r, 0.05, 24), 0, y, 0.025, Math.PI / 2);
    f.geo(mClock, new THREE.CircleGeometry(r * 0.9, 24), 0, y, 0.052);
  };
  const usedPaint = new Set<number>();
  const paintMats = new Map<number, Mat>();
  const painting = (x: number, y: number, z: number, ry: number, w: number, h: number, sd: number) => {
    const pi = pickPainting(w / h, usedPaint, sd);
    let pm = paintMats.get(pi);
    if (!pm) { pm = k.mat(realPaintingTex(pi), "#fff", [1, 1], { roughness: 0.6, bump: 0 }); paintMats.set(pi, pm); }
    const pa = PAINTINGS[pi].w / PAINTINGS[pi].h, fa = w / h;
    const uw = pa > fa ? fa / pa : 1, vh = pa > fa ? 1 : pa / fa;
    const f = new Fr(x, z, ry);
    const fw = 0.07;
    f.box(mGold, w + fw * 2, fw, 0.05, 0, y - h / 2 - fw, 0.025);
    f.box(mGold, w + fw * 2, fw, 0.05, 0, y + h / 2, 0.025);
    f.box(mGold, fw, h, 0.05, -w / 2 - fw / 2, y - h / 2, 0.025);
    f.box(mGold, fw, h, 0.05, w / 2 + fw / 2, y - h / 2, 0.025);
    const g = new THREE.PlaneGeometry(w, h);
    const a = g.attributes.uv;
    for (let i = 0; i < a.count; i++) a.setXY(i, (1 - uw) / 2 + a.getX(i) * uw, (1 - vh) / 2 + a.getY(i) * vh);
    f.geo(pm, g, 0, y, 0.02);
    f.box(mWhiteP, 0.26, 0.07, 0.006, 0, y - h / 2 - 0.2, 0.004);
  };
  const poster = (cell: number, x: number, y: number, z: number, ry: number, s = 0.55) => {
    const cx = cell % 2, cy = Math.floor(cell / 2);
    const f = new Fr(x, z, ry);
    f.geo(mPosters, uvPlane(s, s, [cx / 2, (1 - cy) / 2, 0.5, 0.5]), 0, y, 0.012);
  };
  function uvPlane(w: number, h: number, uv: [number, number, number, number]) {
    const g = new THREE.PlaneGeometry(w, h);
    const a = g.attributes.uv;
    for (let i = 0; i < a.count; i++) a.setXY(i, uv[0] + a.getX(i) * uv[2], uv[1] + a.getY(i) * uv[3]);
    return g;
  }
  const pot = (x: number, z: number, s = 1, y = 0) => {
    B.add(mTerracotta, place(latheG([[0.001, 0], [0.11 * s, 0], [0.15 * s, 0.26 * s], [0.165 * s, 0.28 * s], [0.14 * s, 0.28 * s], [0.001, 0.27 * s]], 16), x, y, z));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + rnd();
      const d = i ? 0.1 * s : 0;
      leafI.add(x + Math.cos(a) * d, y + (0.42 + rnd() * 0.2) * s + (i ? 0 : 0.18 * s), z + Math.sin(a) * d, [0.16 * s, 0.2 * s, 0.16 * s], pick(["#8cb36a", "#a3c77e", "#7aa65a"]), rnd() * 6);
    }
    if (s > 1.4) k.collider(x - 0.2 * s, x + 0.2 * s, z - 0.2 * s, z + 0.2 * s, y, y + 0.7 * s, true);
  };
  const extinguisher = (x: number, z: number) => {
    B.add(mRedP, place(latheG([[0.001, 0], [0.08, 0], [0.085, 0.02], [0.085, 0.45], [0.06, 0.52], [0.02, 0.55], [0.001, 0.56]], 16), x, 0, z));
    B.add(mBlackP, beam([x, 0.55, z], [x + 0.08, 0.6, z], 0.015, 6));
    B.add(mBlackP, tubeG([[x + 0.03, 0.54, z], [x + 0.1, 0.45, z + 0.04], [x + 0.09, 0.2, z + 0.08]], 0.012, 10, 5));
  };
  const trashBin = (x: number, z: number, col: Mat, lab = true) => {
    B.add(col, place(latheG([[0.001, 0.01], [0.16, 0.01], [0.19, 0.55], [0.2, 0.56], [0.18, 0.56], [0.16, 0.05]], 18), x, 0, z));
    if (lab) B.add(mRubber, place(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 18), x, 0.01, z));
    k.collider(x - 0.2, x + 0.2, z - 0.2, z + 0.2, 0, 0.56, true);
  };
  const tree = (x: number, z: number, s = 1) => {
    B.add(mTrunk, place(new THREE.CylinderGeometry(0.12 * s, 0.2 * s, 3 * s, 10), x, 1.5 * s, z));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      leafI.add(x + Math.cos(a) * 1.1 * s, (3 + rnd() * 1.4) * s, z + Math.sin(a) * 1.1 * s, [1.3 * s, 1.1 * s, 1.3 * s], pick(["#6f9a4a", "#5c8a3c", "#7ea858"]), rnd() * 6);
    }
    leafI.add(x, 4.6 * s, z, [1.4 * s, 1.2 * s, 1.4 * s], "#6f9a4a");
  };

  // ---------- student furniture ----------
  const bagCols = ["#1e2638", "#23262c", "#2b3a5c", "#3d2a22", "#5a1f24", "#2a4a3a"];
  const bookCols = ["#2d5aa0", "#c43d3d", "#3a8a4f", "#e7c23a", "#7b4ba6", "#e07a2c", "#2f9ab0", "#f2f0e8", "#3a3a3a"];
  /** blackboard chalk tray: chalk sticks (whole + broken), felt erasers, a chalk box and a film of chalk dust */
  function boardTray(f: Fr, n: number, floorY = 0.182) {
    f.geo(mChalkDust, new THREE.PlaneGeometry(5.2, 0.075).rotateX(-Math.PI / 2), 0, 0.8315, 0.075);
    for (let i = 0; i < n; i++) f.inst(cylI, rr(-2.4, 2.4), 0.8375, rr(0.06, 0.1), [0.0065, rnd() < 0.4 ? rr(0.015, 0.035) : rr(0.05, 0.075), 0.0065], pick(["#f4f4ee", "#f4f4ee", "#f4f4ee", "#f2d64a", "#ef8fa0", "#8fc8f0"]), rr(0, 3), 0, Math.PI / 2);
    for (const [e, a] of [[-1.6, 0.1], [0.9, -0.2]]) {
      f.inst(boxI, e, 0.836, 0.075, [0.13, 0.012, 0.05], "#d6d2c8", a);
      f.inst(boxI, e, 0.857, 0.075, [0.128, 0.03, 0.048], pick(["#2f3a4a", "#3a5a8a", "#7a2a2a"]), a);
      f.inst(boxI, e, 0.873, 0.075, [0.05, 0.004, 0.035], "#e8e4d6", a);
    }
    f.inst(boxI, 2.2, 0.855, 0.075, [0.1, 0.05, 0.06], "#f2f0ea", 0.2);
    f.geo(mChalkFloor, flatUV(4.6, 0.5, [0, 0, 1.7, 1]), 0, floorY, 0.3);
  }
  /** dust in the corners and along the skirting, grey shoe/chair scuffs on the walls above the skirting, floor scuffs */
  function dirtRoom(x1: number, x2: number, z1: number, z2: number, scuffs = 6, wallScuff = true) {
    const a1 = x1 + 0.15, a2 = x2 - 0.15, b1 = z1 + 0.15, b2 = z2 - 0.15;
    const fl = (m: Mat, w: number, d: number, x: number, z: number, ry: number, uv: [number, number, number, number] = [0, 0, 1, 1], y = 0.003) =>
      B.add(m, place(flatUV(w, d, uv), x, y, z, 0, ry));
    const cs = 0.7;
    fl(mDustCorner, cs, cs, a2 - cs / 2, b1 + cs / 2, 0); fl(mDustCorner, cs, cs, a1 + cs / 2, b1 + cs / 2, Math.PI / 2);
    fl(mDustCorner, cs, cs, a1 + cs / 2, b2 - cs / 2, Math.PI); fl(mDustCorner, cs, cs, a2 - cs / 2, b2 - cs / 2, -Math.PI / 2);
    const lw = 0.1;
    fl(mDustLine, a2 - a1, lw, (a1 + a2) / 2, b1 + lw / 2, 0, [0, 0, (a2 - a1) / 1.5, 1]);
    fl(mDustLine, a2 - a1, lw, (a1 + a2) / 2, b2 - lw / 2, Math.PI, [0, 0, (a2 - a1) / 1.5, 1]);
    fl(mDustLine, b2 - b1, lw, a1 + lw / 2, (b1 + b2) / 2, Math.PI / 2, [0, 0, (b2 - b1) / 1.5, 1]);
    fl(mDustLine, b2 - b1, lw, a2 - lw / 2, (b1 + b2) / 2, -Math.PI / 2, [0, 0, (b2 - b1) / 1.5, 1]);
    for (let i = 0; i < scuffs; i++) fl(mScuffFloor, rr(0.8, 1.4), rr(0.8, 1.4), rr(a1 + 1, a2 - 1), rr(b1 + 1, b2 - 1), rr(0, 6), [0, 0, 1, 1], 0.0025 + i * 0.0002);
    if (!wallScuff) return;
    const off = 0.163, hh = 0.4, yc = 0.1 + hh / 2;
    const wl = (w: number, x: number, z: number, ry: number) => B.add(mScuffWall, place(uvPlane(w, hh, [rnd(), 0, w / 3, 1]), x, yc, z, 0, ry));
    wl(a2 - a1, (a1 + a2) / 2, b1 - 0.15 + off, 0); wl(a2 - a1, (a1 + a2) / 2, b2 + 0.15 - off, Math.PI);
    wl(b2 - b1, a1 - 0.15 + off, (b1 + b2) / 2, Math.PI / 2); wl(b2 - b1, a2 + 0.15 - off, (b1 + b2) / 2, -Math.PI / 2);
  }
  /** things kids dropped on the floor: pencils, erasers, paper balls, a sheet, eraser crumbs */
  function litter(x1: number, x2: number, z1: number, z2: number, n: number) {
    for (let i = 0; i < n; i++) {
      const x = rr(x1, x2), z = rr(z1, z2), q = rnd();
      if (q < 0.3) pencil(W, x, 0, z, rr(0, 6));
      else if (q < 0.45) eraser(W, x, 0, z);
      else if (q < 0.75) { const rb = rr(0.025, 0.04); paperBallI.add(x, rb * 0.85, z, [rb, rb, rb], pick(["#f6f4ec", "#f4f0e0", "#eef2f8"]), rr(0, 6), rr(0, 6)); }
      else if (q < 0.85) sheet(W, pick([0, 1, 2, 3, 4, 5, 6, 8]), x, 0.004, z, rr(0, 6));
      else for (let c = 0; c < 8; c++) crumbI.add(x + rr(-0.08, 0.08), 0.0013, z + rr(-0.08, 0.08), [rr(0.003, 0.007), 0.0025, rr(0.002, 0.004)], pick(["#8a8078", "#e8a0a8", "#9a9290"]), rr(0, 3));
    }
  }
  function desk(x: number, z: number, ry: number) {
    const f = new Fr(x, z, ry);
    const v = Math.floor(rnd() * 4);
    // wood-grain top (graffiti texture, readable from the student side) + plastic edge banding
    f.geo(mDeskTops[v], flatUV(0.63, 0.43, [0, 0, 1, 1]), 0, 0.6985, 0);
    // under-board, edge banding, steel frame, shelf and hooks: shared geometry, one instance each (tinted per desk)
    deskUnderI.add(x, 0, z, [1, 1, 1], pick(["#ffffff", "#f2e6d4", "#e8dccb"]), ry);
    deskBandI.add(x, 0, z, [1, 1, 1], pick(["#ffffff", "#d8c8b0", "#b8a890"]), ry);
    deskFrameI.add(x, 0, z, [1, 1, 1], pick(["#ffffff", "#e0e8e4", "#c8d4d0", "#f0ece0"]), ry);
    deskShelfI.add(x, 0, z, [1, 1, 1], pick(["#ffffff", "#e6e6e6", "#d0d4d8"]), ry);
    deskFootI.add(x, 0, z, [1, 1, 1], undefined, ry);
    f.col(-0.33, 0.33, -0.23, 0.23, 0, 0.7);
    // shelf contents
    const q0 = rnd();
    if (q0 < 0.55) for (let b = 0; b < 1 + Math.floor(rnd() * 3); b++) f.inst(boxI, rr(-0.1, 0.1), 0.565 + b * 0.022, rr(-0.08, 0), [0.19, 0.02, 0.26], pick(bookCols), rr(-0.25, 0.25));
    else if (q0 < 0.75) f.inst(paperBallI, rr(-0.15, 0.15), 0.59, rr(-0.1, 0.05), [0.03, 0.03, 0.03], "#f4f2ea", rr(0, 6), rr(0, 6));
    // chewing gum stuck under the top / under the shelf (students' secret stash)
    const ng = rnd() < 0.8 ? 1 + Math.floor(rnd() * 3) : 0;
    for (let i = 0; i < ng; i++) f.inst(gumI, rr(-0.29, 0.29), 0.675, rr(0.155, 0.205), [rr(0.008, 0.014), 0.005, rr(0.007, 0.012)], pick(gumCols), rr(0, 3));
    if (rnd() < 0.3) f.inst(gumI, rr(-0.24, 0.24), 0.553, rr(-0.15, 0.1), [0.01, 0.004, 0.009], pick(gumCols));
    if (rnd() < 0.15) f.inst(gumI, rr(-0.25, 0.25), 0.699, rr(-0.18, 0.18), [0.011, 0.003, 0.009], pick(gumCols), rr(0, 3));
    // side hook with a hanging school bag (and sometimes a gym bag on the other hook)
    const qb = rnd();
    if (qb < 0.5) {
      const col = pick(bagCols);
      f.inst(bagI, 0.405, 0.39, 0.03, [0.1, 0.3, 0.34], col, rr(-0.05, 0.05));
      for (const sz of [-1, 1]) f.geo(mBlackP, tubeG([[0.35, 0.6, 0.03], [0.375, 0.57, 0.03 + sz * 0.06], [0.4, 0.545, 0.03 + sz * 0.11]], 0.006, 6, 4));
      if (rnd() < 0.5) { f.inst(gumI, 0.46, 0.47, 0.03 + rr(-0.1, 0.1), [0.022, 0.022, 0.022], pick(["#f5c21a", "#e8584f", "#6fb0f0", "#f07aa8"])); }
    } else if (qb < 0.7) f.inst(bagI, 0.38, 0.17, rr(-0.1, 0.1), [0.14, 0.34, 0.3], pick(bagCols), rr(-0.2, 0.2), 0, -0.25);
    if (rnd() < 0.3) {
      f.inst(bagI, -0.37, 0.47, 0.03, [0.04, 0.2, 0.17], pick(["#e84a7a", "#3a8fd8", "#f2c23c", "#4fb06a"]));
      f.geo(mSteel, tubeG([[-0.346, 0.59, 0.03], [-0.36, 0.575, 0.0], [-0.37, 0.57, 0.03]], 0.003, 6, 3));
    }
    // things on the top
    const r = rnd();
    const top = 0.7;
    if (r < 0.3) {
      const nb = Math.floor(rnd() * 8);
      const a = rr(-0.3, 0.3), lx = rr(-0.14, 0.1), lz = rr(-0.07, 0.05);
      f.inst(boxI, lx, top + 0.004, lz, [0.17, 0.008, 0.24], nbCols[nb], a);
      f.geo(mNotebook, flatUV(0.17, 0.24, [(nb % 4) / 4, 0.5 - Math.floor(nb / 4) * 0.5, 0.25, 0.5]), lx, top + 0.0085, lz, 0, a);
      sheet(f, pick([0, 1, 2, 3, 4, 5, 6, 8]), 0.15, top + 0.002, rr(-0.05, 0.05), rr(-0.3, 0.3));
      pencil(f, rr(-0.2, 0.2), top, rr(0.1, 0.17), rr(-0.5, 0.5));
    } else if (r < 0.62) {
      sheet(f, pick([0, 1, 2, 3, 4, 5, 6, 8]), rr(-0.08, 0.08), top + 0.002, rr(-0.04, 0.03), rr(-0.25, 0.25));
      if (rnd() < 0.4) sheet(f, pick([0, 1, 2, 3, 4, 5, 6, 8]), rr(-0.15, 0.15), top + 0.003, rr(-0.06, 0.02), rr(-0.4, 0.4));
      pencil(f, rr(-0.2, 0.2), top + 0.004, rr(0.08, 0.17), rr(-0.5, 0.5));
      if (rnd() < 0.6) eraser(f, rr(-0.25, 0.25), top, rr(0.1, 0.18));
    } else if (r < 0.75) {
      f.inst(boxI, rr(-0.18, 0.18), top + 0.02, rr(0.05, 0.12), [0.2, 0.04, 0.06], pick(["#3a6fd8", "#e04a7a", "#2f2f2f", "#f0c030", "#8a4ad0"]), rr(-0.4, 0.4));
      pencil(f, rr(-0.2, 0.2), top, rr(-0.1, 0.0), rr(-0.5, 0.5));
    }
    if (rnd() < 0.45) for (let i = 0; i < 6; i++) f.inst(crumbI, rr(-0.2, 0.2), top + 0.0015, rr(0.02, 0.18), [rr(0.003, 0.007), 0.0025, rr(0.002, 0.004)], pick(["#8a8078", "#e8a0a8", "#9a9290"]), rr(0, 3));
  }
  /** a sheet of Hebrew-handwritten paper lying flat (local frame) */
  function sheet(f: Fr, kind: number, lx: number, ly: number, lz: number, rot: number, s = 1) {
    const g = new THREE.PlaneGeometry(0.21 * s, 0.294 * s);
    g.rotateX(-Math.PI / 2);
    f.geo(mPapers[kind], g, lx, ly, lz, 0, rot);
  }
  function flatUV(w: number, h: number, uv: [number, number, number, number]) {
    const g = uvPlane(w, h, uv);
    g.rotateX(-Math.PI / 2);
    return g;
  }
  function pencil(f: Fr, lx: number, ly: number, lz: number, rot: number) {
    const col = pick(penCols);
    const [x, z] = f.pt(lx, lz);
    const a = f.ry + rot;
    const dx = Math.cos(a), dz = -Math.sin(a);
    hexI.add(x, ly + 0.0036, z, [0.0036, 0.15, 0.0036], col, a, 0, Math.PI / 2);
    tipI.add(x - dx * 0.087, ly + 0.0036, z - dz * 0.087, [0.0036, 0.024, 0.0036], "#e8c9a0", a, 0, Math.PI / 2);
    if (rnd() < 0.5) cylI.add(x + dx * 0.08, ly + 0.0036, z + dz * 0.08, [0.0037, 0.012, 0.0037], "#f09aa8", 0, 0, 0);
  }
  function eraser(f: Fr, lx: number, ly: number, lz: number) {
    f.inst(boxI, lx, ly + 0.006, lz, [0.042, 0.012, 0.02], pick(["#f2f0ea", "#f5a0b0", "#9ad0f0", "#f2f0ea"]), rr(0, 3));
  }
  function chair(x: number, z: number, ry: number, flipY = -1) {
    const fl = flipY >= 0;
    const tint = pick(["#ffffff", "#f6e6ce", "#ead2ae", "#fff3e2", "#e2c49a", "#f0d8b8"]);
    const st = pick(["#ffffff", "#e6ebe8", "#d4d9d6"]);
    const y = fl ? flipY + 0.437 : 0, rz = fl ? Math.PI : 0;
    chairWoodI.add(x, y, z, [1, 1, 1], tint, ry, 0, rz);
    chairSteelI.add(x, y, z, [1, 1, 1], st, ry, 0, rz);
    chairFootI.add(x, y, z, [1, 1, 1], undefined, ry, 0, rz);
    if (fl) return;
    const f = new Fr(x, z, ry);
    if (rnd() < 0.4) f.inst(gumI, rr(-0.15, 0.15), 0.418, rr(-0.12, 0.1), [rr(0.008, 0.013), 0.005, rr(0.008, 0.012)], pick(gumCols), rr(0, 3));
    f.col(-0.21, 0.21, -0.2, 0.23, 0, 0.84);
  }

  // ---------- classroom ----------
  function classroom(x0: number, kind: "math" | "eng", label: string, sd: number) {
    seed = sd;
    k.room(label, x0, x0 + 12, 0, 10);
    // blackboard on the front wall (x0)
    const bxw = x0 + 0.15;
    const f = new Fr(bxw, 5, Math.PI / 2); // local +z = +x (into room), local x = -z
    f.box(mBoardFrame, 5.32, 1.32, 0.03, 0, 0.79, 0.015);
    f.geo(boardMats[kind], new THREE.PlaneGeometry(5.2, 1.2), 0, 1.45, 0.035);
    f.box(mBoardFrame, 5.3, 0.05, 0.1, 0, 0.78, 0.07);
    f.box(mBoardFrame, 5.3, 0.03, 0.02, 0, 0.81, 0.12);
    boardTray(f, 12);
    // clock, speaker, TV, class motto
    clock(bxw, 2.6, 5, Math.PI / 2);
    f.box(mWhiteP, 0.36, 0.26, 0.14, 1.9, 2.5, 0.07);
    f.box(mBlackP, 0.3, 0.2, 0.01, 1.9, 2.53, 0.145);
    f.box(mWhiteP, 1.6, 0.34, 0.005, -1.7, 2.45, 0.003);
    f.geo(kind === "math" ? mMottoA : mMottoB, new THREE.PlaneGeometry(1.56, 0.33), -1.7, 2.62, 0.0065);
    const tv = new Fr(x0 + 0.55, 0.75, Math.PI * 0.75);
    tv.box(mBlackP, 0.95, 0.58, 0.07, 0, 2.2, 0);
    tv.box(mScreen, 0.88, 0.5, 0.005, 0, 2.24, 0.037);
    tv.box(mSteelDark, 0.06, 0.06, 0.45, 0, 2.45, -0.25);
    // teaching platform + lectern
    bx(mWoodM, 1.1, 0.18, 5.8, x0 + 0.7, 0, 5);
    k.collider(x0 + 0.15, x0 + 1.25, 2.1, 7.9, 0, 0.18, true);
    const lec = new Fr(x0 + 0.85, 5, Math.PI / 2);
    lec.box(mWoodM, 0.9, 0.92, 0.46, 0, 0.18, 0);
    lec.box(mWoodL, 0.98, 0.03, 0.54, 0, 1.1, 0);
    lec.box(mWoodD, 0.8, 0.5, 0.005, 0, 0.45, 0.232);
    lec.col(-0.49, 0.49, -0.27, 0.27, 0, 1.13);
    lec.inst(boxI, -0.2, 1.14, 0, [0.22, 0.02, 0.3], "#1f3f7a", 0.1);
    lec.inst(boxI, 0.25, 1.15, 0.05, [0.12, 0.04, 0.08], "#f2f2ea");
    B.add(mGlassWare, lec.put(latheG([[0.001, 0], [0.04, 0], [0.05, 0.08], [0.03, 0.2], [0.035, 0.22]], 12), 0.36, 1.13, -0.12));
    for (let i = 0; i < 3; i++) leafI.add(...(() => { const [a, b] = lec.pt(0.36 + (i - 1) * 0.04, -0.12); return [a, 1.42 + i * 0.02, b] as V3t; })(), [0.05, 0.05, 0.05], pick(["#e8584f", "#f2c23c", "#f0f0ea"]));
    // teacher's steel desk by the window (worn grey paint, green desk mat, drawers with handles, marking pile)
    const td = new Fr(x0 + 2.2, 8.8, Math.PI);
    td.box(mCabGrey, 1.2, 0.03, 0.7, 0, 0.7, 0);
    td.box(mBand, 1.21, 0.012, 0.71, 0, 0.695, 0);
    td.box(mDeskMat, 0.95, 0.004, 0.52, -0.06, 0.73, -0.02);
    td.box(mCabGrey, 0.4, 0.68, 0.66, 0.38, 0.02, 0);
    for (let i = 0; i < 3; i++) {
      td.box(mCream, 0.38, 0.2, 0.012, 0.38, 0.06 + i * 0.22, -0.335);
      td.box(mStainless, 0.14, 0.018, 0.025, 0.38, 0.2 + i * 0.22, -0.35);
      td.box(mWhiteP, 0.06, 0.025, 0.003, 0.38, 0.12 + i * 0.22, -0.342);
    }
    td.box(mCream, 0.66, 0.1, 0.012, -0.2, 0.58, -0.335);
    td.box(mStainless, 0.18, 0.016, 0.022, -0.2, 0.62, -0.35);
    td.box(mCabGrey, 0.03, 0.7, 0.66, -0.57, 0, 0);
    td.box(mCabGrey, 1.1, 0.4, 0.02, 0, 0.3, 0.32);
    td.geo(mRubber, new THREE.BoxGeometry(0.4, 0.02, 0.66), 0.38, 0.01, 0);
    td.col(-0.6, 0.6, -0.35, 0.35, 0, 0.73);
    // laptop
    td.box(mBlackP, 0.34, 0.02, 0.24, -0.25, 0.734, -0.05);
    td.box(mBlackP, 0.34, 0.22, 0.01, -0.25, 0.744, 0.07, -0.25);
    td.box(mScreen, 0.3, 0.18, 0.003, -0.25, 0.765, 0.063, -0.25);
    // pile of worksheets to mark (top one graded) + red pen, attendance book, pencil cup, mug, stapler
    td.inst(boxI, 0.3, 0.749, -0.02, [0.21, 0.03, 0.297], "#f4f2ea", 0.08);
    sheet(td, 0, 0.3, 0.7652, -0.02, 0.08 + Math.PI);
    sheet(td, 1, 0.12, 0.735, 0.1, 0.5 + Math.PI);
    pencil(td, 0.25, 0.766, 0.05, 0.9);
    td.inst(boxI, 0.02, 0.742, -0.2, [0.24, 0.02, 0.32], "#1f3f7a", 0.05);
    td.geo(mNotebook, flatUV(0.2, 0.28, [0, 0.5, 0.25, 0.5]), 0.02, 0.7525, -0.2, 0, 0.05 + Math.PI);
    B.add(mSteelDark, td.put(latheG([[0.001, 0], [0.035, 0], [0.036, 0.1], [0.033, 0.1], [0.032, 0.005], [0.001, 0.005]], 14), 0.5, 0.732, 0.2));
    for (let i = 0; i < 5; i++) { const [px, pz] = td.pt(0.5 + rr(-0.015, 0.015), 0.2 + rr(-0.015, 0.015)); cylI.add(px, 0.8, pz, [0.004, 0.15, 0.004], pick(penCols), 0, rr(-0.2, 0.2), rr(-0.2, 0.2)); }
    B.add(mWhiteP, td.put(latheG([[0.001, 0], [0.04, 0], [0.042, 0.1], [0.038, 0.1], [0.036, 0.008], [0.001, 0.008]], 16), 0.46, 0.732, -0.22));
    B.add(mWhiteP, td.put(new THREE.TorusGeometry(0.025, 0.007, 6, 12), 0.505, 0.785, -0.22, 0, 0, 0));
    B.add(mCoffee, td.put(new THREE.CircleGeometry(0.036, 14).rotateX(-Math.PI / 2), 0.46, 0.815, -0.22));
    td.box(mRedP, 0.16, 0.035, 0.04, -0.4, 0.734, 0.2, 0, 0.3);
    chair(...td.pt(0, -0.6), 0);
    // student desks: 6 rows × 5 columns
    const flipRow = kind === "eng" ? 4 : -1;
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
      const dx = x0 + 3.8 + i * 1.2 + rr(-0.04, 0.04), dz = 2.0 + j * 1.5 + rr(-0.04, 0.04), ry = Math.PI / 2 + rr(-0.05, 0.05);
      desk(dx, dz, ry);
      if (i === flipRow) { chair(dx, dz, ry, 0.7); k.collider(dx - 0.25, dx + 0.25, dz - 0.25, dz + 0.25, 0.7, 1.58, true); continue; }
      const out = i < 4 && rnd() < 0.3 ? rr(0.08, 0.2) : 0;
      chair(dx + 0.5 + out, dz + rr(-0.05, 0.05), ry + (out ? rr(-0.35, 0.35) : 0));
    }
    // back cubby lockers (x0+12 wall)
    const lx = x0 + 11.85 - 0.21;
    const lz1 = 1.3, lz2 = 8.9, cols = 19, rows = 3, LH = 1.25;
    const cw = (lz2 - lz1) / cols;
    const L = new Fr(lx, (lz1 + lz2) / 2, -Math.PI / 2); // local +z = -x (facing the room)
    const LW = lz2 - lz1;
    L.box(mWoodL, LW, 0.02, 0.42, 0, 0, 0);
    L.box(mWoodM, LW, 0.08, 0.02, 0, 0, 0.2);
    for (let r2 = 1; r2 <= rows; r2++) L.box(mWoodL, LW, 0.025, 0.42, 0, 0.08 + (r2 * (LH - 0.08)) / rows - 0.025, 0);
    L.box(mWoodL, LW + 0.04, 0.03, 0.44, 0, LH, 0);
    for (let c = 0; c <= cols; c++) L.box(mWoodL, 0.02, LH - 0.08, 0.42, -LW / 2 + c * cw, 0.08, 0);
    L.box(mWoodD, LW, LH, 0.01, 0, 0, -0.205);
    L.col(-LW / 2 - 0.02, LW / 2 + 0.02, -0.22, 0.22, 0, LH + 0.03);
    const rowH = (LH - 0.08) / rows;
    for (let c = 0; c < cols; c++) for (let r2 = 0; r2 < rows; r2++) {
      const cx = -LW / 2 + (c + 0.5) * cw, cy = 0.08 + r2 * rowH;
      const q = rnd();
      if (q < 0.45) L.inst(bagI, cx, cy + 0.15, 0.02, [0.3, 0.28, 0.14], pick(bagCols), rr(-0.1, 0.1));
      else if (q < 0.65) L.inst(bagI, cx, cy + 0.1, 0.03, [0.3, 0.18, 0.3], pick(["#2e5fb0", "#c8c8c0", "#3d3d42", "#7a2430", "#e7e2d2"]));
      else if (q < 0.85) for (let b = 0; b < 4; b++) L.inst(boxI, cx - 0.12 + b * 0.05 + rr(-0.005, 0.005), cy + 0.13 + rr(0, 0.02), 0.03, [0.04, 0.25 + rr(-0.02, 0.02), 0.21], pick(bookCols));
      tagI.add(...(() => { const [a, b] = L.pt(cx, 0.215); return [a, cy - 0.01, b] as V3t; })(), [1, 1, 1], undefined, -Math.PI / 2);
    }
    // things on the lockers
    L.box(mCardboard, 0.5, 0.32, 0.36, -2.6, LH + 0.03, 0, 0, 0.1);
    L.box(mCardboard, 0.4, 0.25, 0.3, -2.5, LH + 0.35, 0, 0, -0.2);
    const [gx, gz] = L.pt(-1.2, 0);
    B.add(mBlueP, place(new THREE.SphereGeometry(0.15, 20, 14), gx, LH + 0.35, gz));
    B.add(mBrass, place(new THREE.TorusGeometry(0.17, 0.008, 6, 24, Math.PI), gx, LH + 0.35, gz, 0, 0.4, 0));
    B.add(mWoodD, place(new THREE.CylinderGeometry(0.06, 0.09, 0.14, 14), gx, LH + 0.1, gz));
    L.inst(ballV, 0.4, LH + 0.135, 0, [1, 1, 1], "#ffffff");
    pot(...L.pt(1.8, 0), 1, LH + 0.03);
    L.box(mPaper, 0.3, 0.1, 0.22, 3.0, LH + 0.03, 0, 0, 0.2);
    L.box(mGold, 0.18, 0.03, 0.12, 2.2, LH + 0.03, 0);
    B.add(mGold, L.put(latheG([[0.001, 0], [0.04, 0], [0.012, 0.04], [0.012, 0.12], [0.06, 0.18], [0.07, 0.28], [0.001, 0.26]], 16), 2.2, LH + 0.06, 0));
    // notice board above
    const nb = new Fr(x0 + 11.85, 5, -Math.PI / 2);
    nb.box(mWoodM, 5.2, 1.2, 0.03, 0, 1.5, 0.015);
    nb.geo(sd % 2 ? mCork : mCork2, new THREE.PlaneGeometry(5.05, 1.05), 0, 2.1, 0.033);
    // cleaning locker + brooms, bins
    const cl = new Fr(x0 + 11.6, 0.65, -Math.PI / 2);
    cl.box(mCabGrey, 0.88, 1.8, 0.45, 0, 0, 0);
    cl.box(mCream, 0.4, 1.7, 0.01, -0.21, 0.05, 0.228);
    cl.box(mCream, 0.4, 1.7, 0.01, 0.21, 0.05, 0.228);
    for (const s of [-1, 1]) cl.box(mSteelDark, 0.02, 0.12, 0.02, s * 0.03, 0.95, 0.24);
    cl.box(mSteelDark, 0.3, 0.04, 0.005, 0.2, 1.55, 0.235);
    for (const sx of [-0.21, 0.21]) for (let v = 0; v < 5; v++) cl.box(mDarkInside, 0.22, 0.012, 0.004, sx, 1.45 + v * 0.035, 0.234);
    for (const sx of [-0.21, 0.21]) for (let v = 0; v < 3; v++) cl.box(mDarkInside, 0.22, 0.012, 0.004, sx, 0.15 + v * 0.035, 0.234);
    cl.geo(mPapers[5], new THREE.PlaneGeometry(0.15, 0.21), 0.21, 1.1, 0.236, 0, 0, 0.06);
    B.add(mMopHead, place(new THREE.CylinderGeometry(0.02, 0.12, 0.18, 10), x0 + 11.25, 0.09, 1.35));
    B.add(mWoodL, beam([x0 + 11.25, 0.15, 1.35], [x0 + 11.72, 1.4, 1.3], 0.012, 6));
    cl.col(-0.44, 0.44, -0.23, 0.26, 0, 1.8);
    trashBin(x0 + 0.45, 9.05, mBlueP);
    trashBin(x0 + 0.45, 9.5, mGreenP);
    // front-side small cork board + cabinet
    const fb = new Fr(x0 + 0.15, 8.9, Math.PI / 2);
    fb.box(mWoodM, 1.3, 1.0, 0.03, 0, 1.2, 0.015);
    fb.geo(mCork, uvPlane(1.2, 0.9, [0.1, 0, 0.25, 1]), 0, 1.7, 0.033);
    const fc = new Fr(x0 + 0.4, 1.3, Math.PI / 2);
    fc.box(mWoodL, 1.2, 0.9, 0.45, 0, 0, 0);
    fc.box(mWoodM, 0.58, 0.8, 0.01, -0.3, 0.05, 0.228);
    fc.box(mWoodM, 0.58, 0.8, 0.01, 0.3, 0.05, 0.228);
    for (const sx of [-0.04, 0.04]) fc.box(mStainless, 0.015, 0.1, 0.02, sx, 0.5, 0.24);
    fc.geo(mTags, uvPlane(0.16, 0.05, [0.25, 0.5, 0.25, 0.5]), -0.3, 0.75, 0.2345);
    fc.col(-0.6, 0.6, -0.23, 0.23, 0, 0.9);
    for (let b = 0; b < 10; b++) fc.inst(boxI, -0.5 + b * 0.05, 0.9 + 0.12, 0, [0.04, 0.24 + rr(-0.03, 0.03), 0.18], pick(bookCols));
    fc.inst(boxI, 0.35, 0.92, 0, [0.3, 0.04, 0.22], "#f5f3ec");
    // windows: sill board, curtains, rail, sill props
    bx(mWoodL, 12 - 0.3, 0.035, 0.16, x0 + 6, 0.83, 9.77);
    for (const wc of [-21.9, -18, -14.1].map((c) => c + (x0 + 24))) {
      bx(mAlu, 3.6, 0.035, 0.05, wc, 2.9, 9.73);
      const half = wc === x0 + 6 && kind === "eng";
      curtainPanel(wc - 1.5, 9.62, half ? 1.3 : 0.55, 2.0, 0.93);
      curtainPanel(wc + 1.5, 9.62, 0.55, 2.0, 0.93);
    }
    // goldfish tank + pots on the sill
    const tk = new Fr(x0 + (kind === "math" ? 8.2 : 4.6), 9.72, 0);
    tk.geo(mGlassWare, new THREE.BoxGeometry(0.5, 0.3, 0.26), 0, 0.85 + 0.15, 0);
    tk.geo(mWater, new THREE.BoxGeometry(0.48, 0.24, 0.24), 0, 0.85 + 0.125, 0);
    tk.box(mBlackP, 0.52, 0.02, 0.28, 0, 1.15, 0);
    tk.box(mSand, 0.46, 0.03, 0.22, 0, 0.855, 0);
    for (let i = 0; i < 3; i++) tk.inst(bagI, rr(-0.15, 0.15), 1.0 + rr(-0.05, 0.05), rr(-0.06, 0.06), [0.05, 0.025, 0.018], "#f07a1e", rr(0, 3));
    for (const px of [1.2, 3.1, 10.5]) pot(x0 + px, 9.73, 0.55, 0.865);
    dirtRoom(x0, x0 + 12, 0, 10, 7);
    litter(x0 + 3.2, x0 + 11, 1.2, 9.2, 16);
    // gum stuck on the floor + under the window sill
    for (let i = 0; i < 5; i++) gumI.add(rr(x0 + 2, x0 + 11), 0.0015, rr(1, 9), [rr(0.01, 0.015), 0.0025, rr(0.01, 0.014)], pick(["#8a8078", "#6a6660", "#c890a0"]), rr(0, 3));
    for (let i = 0; i < 4; i++) gumI.add(rr(x0 + 1, x0 + 11), 0.826, 9.74, [0.01, 0.005, 0.009], pick(gumCols));
  }
  function curtainPanel(x: number, z: number, w: number, h: number, yTop: number) {
    const n = 18;
    const g = new THREE.PlaneGeometry(w, h, n, 1);
    const p = g.attributes.position;
    const folds = Math.max(3, Math.round(w / 0.12));
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) / w + 0.5) * folds * Math.PI) * 0.045);
    g.computeVertexNormals();
    g.translate(x, yTop + 1.95 - h / 2, z);
    B.add(mCurtain, g);
  }

  classroom(-24, "math", "Class 2-A", 21);
  classroom(-12, "eng", "Class 2-B", 57);

  // ---------- corridor ----------
  k.room("Corridor", -24, 24, -3, 0);
  dirtRoom(-24, 24, -3, 0, 14, false);
  seed = 91;
  painting(-19.5, 1.55, -0.16, Math.PI, 0.9, 0.7, 1);
  painting(-16.4, 1.55, -0.16, Math.PI, 0.7, 0.9, 2);
  painting(-7.5, 1.55, -0.16, Math.PI, 1.0, 0.75, 3);
  painting(-4.4, 1.55, -0.16, Math.PI, 0.7, 0.9, 4);
  painting(3.4, 1.55, -0.16, Math.PI, 0.9, 0.7, 5);
  painting(6.2, 1.55, -0.16, Math.PI, 0.7, 0.9, 6);
  poster(1, 14.3, 1.5, -0.16, Math.PI);
  poster(3, 20.4, 1.5, -0.16, Math.PI);
  const cb = new Fr(17.2, -0.15, Math.PI);
  cb.box(mWoodM, 3.1, 1.1, 0.03, 0, 1.05, 0.015);
  cb.geo(mCork2, uvPlane(3.0, 1.0, [0.2, 0, 0.6, 1]), 0, 1.6, 0.033);
  clock(-10.4 + 1.5, 2.75, -0.16, Math.PI, 0.15);
  // corridor shoe lockers (getabako) along the gym wall
  getabako(-14, -2.85 + 0.2, 9.0, 4, 31, 1.3, false, mWoodL, 0, 0.36);
  // water fountain
  fountain(14.8, -2.85);
  // bench, bins, extinguishers, fire hydrant box
  const bn = new Fr(20.2, -2.6, 0);
  bn.box(mWoodL, 1.8, 0.04, 0.36, 0, 0.4, 0);
  for (const s of [-0.8, 0.8]) bn.box(mSteel, 0.04, 0.4, 0.3, s, 0, 0);
  bn.col(-0.9, 0.9, -0.18, 0.18, 0, 0.44);
  trashBin(22.6, -2.6, mBlueP);
  trashBin(23.1, -2.6, mYellowP);
  trashBin(23.6, -2.6, mGreenP);
  extinguisher(-23.6, -0.45);
  extinguisher(23.6, -0.45);
  extinguisher(-6.6, -2.7);
  const hy = new Fr(4, -2.85, 0);
  hy.box(mRedP, 0.7, 0.9, 0.12, 0, 0.9, 0.06);
  hy.box(mDarkInside, 0.66, 0.02, 0.01, 0, 1.35, 0.125);
  hy.geo(mRedLamp, new THREE.SphereGeometry(0.05, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0, 1.9, 0.05, Math.PI / 2);
  hy.col(-0.35, 0.35, 0, 0.12, 0, 1.8, true);
  panel(mExit, 0.5, 0.25, 23.84, 2.6, -1.5, -Math.PI / 2);
  panel(mExit, 0.5, 0.25, -23.84, 2.6, -1.5, Math.PI / 2);
  pot(-23.4, -2.5, 1.5);
  // boxes at the west end
  bx(mCardboard, 0.6, 0.45, 0.45, -21.9, 0, -2.55);
  bx(mCardboard, 0.5, 0.35, 0.4, -21.9, 0.45, -2.55, 0.2);
  k.collider(-22.2, -21.6, -2.8, -2.3, 0, 0.8, true);

  // ---------- getabako ----------
  /** shoe locker unit along X (len), cubbies facing +z (and −z if double) */
  function getabako(x: number, z: number, len: number, rows: number, cols: number, hgt: number, dbl: boolean, m: Mat, ry = 0, depth = 0.36) {
    const f = new Fr(x, z, ry);
    const d = dbl ? depth * 2 : depth;
    const zc = dbl ? 0 : 0;
    const rowH = (hgt - 0.1) / rows;
    f.box(m, len + 0.04, 0.03, d + 0.02, 0, hgt - 0.03, zc);
    f.box(mWoodD, len, 0.1, d - 0.04, 0, 0, zc);
    for (let r2 = 0; r2 < rows; r2++) f.box(m, len, 0.02, d, 0, 0.1 + r2 * rowH - 0.01, zc);
    const cw = len / cols;
    for (let c = 0; c <= cols; c++) f.box(m, c % cols === 0 ? 0.03 : 0.015, hgt - 0.1, d, -len / 2 + c * cw, 0.1, zc);
    f.box(mWoodD, len, hgt - 0.1, 0.012, 0, 0.1, dbl ? 0 : -depth / 2 + 0.006);
    f.col(-len / 2 - 0.02, len / 2 + 0.02, -d / 2 - 0.01, d / 2 + 0.01, 0, hgt, true);
    for (const side of dbl ? [1, -1] : [1]) for (let c = 0; c < cols; c++) for (let r2 = 0; r2 < rows; r2++) {
      const lx = -len / 2 + (c + 0.5) * cw, ly = 0.1 + r2 * rowH + 0.01;
      const lz = dbl ? side * depth * 0.5 : 0;
      const [wx, wz] = f.pt(lx, lz + side * 0.03);
      const yaw = ry + (side > 0 ? 0 : Math.PI);
      if (rnd() < 0.72) {
        const outdoor = rnd() < 0.35;
        shoeI.add(wx, ly, wz, [1, 1, 1], outdoor ? pick(["#2a2a2e", "#f2f2ee", "#1e2a4a", "#6b5a4a"]) : "#f4f3ee", yaw);
        toeI.add(wx, ly, wz, [1, 1, 1], outdoor ? pick(["#f2f2ee", "#2a2a2e", "#c83030"]) : pick(["#2a4fb0", "#2a4fb0", "#c83030", "#2d8a48"]), yaw);
      }
      if (rnd() < 0.08) { const [bx2, bz2] = f.pt(lx, lz); boxI.add(bx2, ly + 0.1, bz2, [cw * 0.7, 0.18, depth * 0.6], pick(bagCols), yaw); }
      const [tx, tz] = f.pt(lx, lz + side * (depth * 0.5 - 0.005) * (dbl ? 1 : 1) + (dbl ? 0 : depth / 2 - depth * 0.5));
      tagI.add(tx, ly - 0.005, tz, [cw * 2.5, 1, 1], undefined, yaw);
    }
  }

  function fountain(xc: number, zw: number) {
    const f = new Fr(xc, zw, 0); // local +z = into corridor
    const Lf = 3.2, D = 0.55;
    f.box(mStainless, Lf, 0.62, D, 0, 0, D / 2 + 0.02);
    f.box(mStainless, Lf, 0.04, 0.06, 0, 0.72, D - 0.01);
    f.box(mStainless, Lf, 0.14, 0.02, 0, 0.62, D - 0.03);
    f.box(mStainless, Lf - 0.1, 0.02, D - 0.1, 0, 0.62, D / 2);
    for (const s of [-1, 1]) f.box(mStainless, 0.04, 0.16, D, s * (Lf / 2 - 0.02), 0.62, D / 2 + 0.02);
    f.box(mStainless, Lf, 0.3, 0.05, 0, 0.62, 0.05);
    f.geo(mTileWall, uvBox(Lf + 0.3, 0.22, 0.02, 0.4), 0, 0.89, 0.012);
    f.col(-Lf / 2, Lf / 2, 0, D + 0.05, 0, 0.78, true);
    for (let i = 0; i < 5; i++) {
      const lx = -1.28 + i * 0.64;
      const [ax, az] = f.pt(lx, 0.1);
      B.add(mStainless, tubeG([[ax, 0.8, az], [ax, 0.9, az + 0.05], [ax, 0.86, az + 0.16]], 0.012, 10, 6));
      B.add(mStainless, place(new THREE.CylinderGeometry(0.018, 0.018, 0.05, 10), ax, 0.93, az + 0.02));
      if (i % 2 === 0) {
        B.add(mYellowP, place(new THREE.SphereGeometry(0.04, 12, 8), ax, 0.72, az + 0.16, 0, 0, 0, [1, 1.2, 1]));
        B.add(mOrange, tubeG([[ax, 0.86, az + 0.16], [ax + 0.01, 0.78, az + 0.17], [ax, 0.74, az + 0.16]], 0.004, 8, 4));
      }
    }
  }
  function uvBox(w: number, h: number, d: number, unit: number) {
    const g = new THREE.BoxGeometry(w, h, d);
    const a = g.attributes.uv;
    for (let i = 0; i < a.count; i++) a.setXY(i, (a.getX(i) * w) / unit, (a.getY(i) * h) / unit);
    return g;
  }

  // ---------- music room ----------
  seed = 131;
  k.room("Music Room", 0, 11, 0, 10);
  dirtRoom(0, 11, 0, 10, 3);
  {
    const f = new Fr(0.15, 5, Math.PI / 2);
    f.box(mBoardFrame, 5.32, 1.32, 0.03, 0, 0.79, 0.015);
    f.geo(boardMats.music, new THREE.PlaneGeometry(5.2, 1.2), 0, 1.45, 0.035);
    f.box(mBoardFrame, 5.3, 0.05, 0.1, 0, 0.78, 0.07);
    boardTray(f, 6, 0.018);
    clock(0.15, 2.6, 5, Math.PI / 2);
    poster(0, 0.16, 1.6, 8.6, Math.PI / 2, 0.7);
    // carpet
    B.add(mCarpet, place(new THREE.BoxGeometry(6.6, 0.014, 6.2), 6.3, 0.007, 4.7), 0);
    // grand piano
    grandPiano(1.3, 8.4);
    // chairs facing the board
    for (let i = 0; i < 4; i++) for (let j = 0; j < 6; j++) chair(4.2 + i * 1.25 + rr(-0.05, 0.05), 2.2 + j * 0.95 + rr(-0.04, 0.04), Math.PI / 2 + rr(-0.08, 0.08));
    // music stands
    for (const [sx, sz] of [[3.0, 2.6], [3.0, 4.2], [3.0, 5.8], [3.25, 6.9]]) musicStand(sx, sz, -Math.PI / 2);
    // instrument cabinet on the east wall
    const cab = new Fr(10.85 - 0.23, 5.2, -Math.PI / 2);
    const CW = 3.4;
    cab.box(mWoodM, CW, 0.03, 0.46, 0, 0, 0);
    cab.box(mWoodM, CW, 0.03, 0.46, 0, 1.97, 0);
    for (const s of [-1, 0, 1]) cab.box(mWoodM, 0.03, 2.0, 0.46, s * (CW / 2 - 0.015), 0, 0);
    for (let r2 = 1; r2 < 4; r2++) cab.box(mWoodM, CW, 0.025, 0.44, 0, r2 * 0.5, 0);
    cab.box(mWoodD, CW, 2.0, 0.01, 0, 0, -0.225);
    cab.col(-CW / 2, CW / 2, -0.23, 0.23, 0, 2.0);
    for (let r2 = 0; r2 < 4; r2++) {
      let cx = -CW / 2 + 0.08;
      while (cx < CW / 2 - 0.3) {
        const q = rnd(), y = r2 * 0.5 + 0.03;
        if (q < 0.35) { cab.inst(boxI, cx + 0.2, y + 0.06, 0, [0.4, 0.12, 0.3], pick(["#2f5fbf", "#1d1d20", "#d23a3a"])); cx += 0.45; }
        else if (q < 0.6) { for (let b = 0; b < 6; b++) cab.inst(cylI, cx + b * 0.045, y + 0.16, 0.05, [0.014, 0.32, 0.014], pick(["#f0e8d4", "#8a5a3a"]), 0, 0.15); cx += 0.3; }
        else if (q < 0.8) { cab.inst(boxI, cx + 0.12, y + 0.2, 0, [0.22, 0.4, 0.34], pick(["#262629", "#3a2a22"])); cx += 0.28; }
        else { for (let b = 0; b < 7; b++) cab.inst(boxI, cx + b * 0.035, y + 0.14, 0.02, [0.03, 0.28, 0.22], pick(bookCols)); cx += 0.3; }
      }
    }
    // marimba by the windows
    marimba(9.2, 9.25);
    // drum kit near the back door
    drumKit(9.9, 1.9);
    // timpani
    timpani(6.6, 9.2, 0.38);
    timpani(7.5, 9.25, 0.33);
    // guitars leaning on the wall
    guitar(10.7, 7.4, -Math.PI / 2, "#c98a4a");
    guitar(10.7, 7.95, -Math.PI / 2, "#7a3a1e");
    // speakers + stereo cabinet
    for (const z of [0.6, 9.4]) { const sp = new Fr(0.35, z, Math.PI / 2); sp.box(mBlackP, 0.4, 0.6, 0.3, 0, 2.3, 0); sp.geo(mRubber, new THREE.CircleGeometry(0.13, 20), 0, 2.52, 0.152); }
    const st = new Fr(0.4, 1.3, Math.PI / 2);
    st.box(mWoodD, 1.3, 0.75, 0.45, 0, 0, 0);
    st.box(mBlackP, 0.5, 0.12, 0.35, -0.2, 0.75, 0);
    st.box(mSteelDark, 0.45, 0.08, 0.3, 0.35, 0.75, 0);
    st.col(-0.65, 0.65, -0.23, 0.23, 0, 0.87);
    // curtains
    bx(mWoodL, 10.7, 0.035, 0.16, 5.5, 0.83, 9.77);
    for (const wc of [2.3, 5.5, 8.7]) { bx(mAlu, 3.0, 0.035, 0.05, wc, 2.9, 9.73); curtainPanel(wc - 1.2, 9.62, 0.5, 2.0, 0.93); curtainPanel(wc + 1.2, 9.62, 0.5, 2.0, 0.93); }
    // perforated acoustic wall panels on the corridor wall
    const mPerf = k.mat(k.tex("sc-perf", () => T.dots("#ece8dc", "#b5ae9c", 12)), "#ffffff", [4, 2], { roughness: 0.9, bump: 0.4 });
    for (const px of [3.3, 5.6]) panel(mPerf, 2.1, 1.2, px, 1.5, 0.16, 0);
  }

  function grandPiano(xs: number, zk: number) {
    const sh = new THREE.Shape();
    sh.moveTo(0, 0); sh.lineTo(1.48, 0); sh.lineTo(1.48, 0.45);
    sh.bezierCurveTo(1.48, 0.95, 0.95, 0.95, 0.8, 1.45);
    sh.bezierCurveTo(0.7, 1.8, 0.45, 1.92, 0.2, 1.9);
    sh.quadraticCurveTo(0, 1.88, 0, 1.6);
    sh.lineTo(0, 0);
    const body = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 1, curveSegments: 18 });
    body.rotateX(-Math.PI / 2); // shape y → -z, depth → +y
    body.translate(xs, 0.62, zk);
    B.add(mPiano, body);
    const lid = new THREE.ExtrudeGeometry(sh, { depth: 0.018, bevelEnabled: false, curveSegments: 18 });
    lid.rotateX(-Math.PI / 2);
    lid.rotateZ(0.55);
    lid.translate(xs, 0.94, zk);
    B.add(mPiano, lid);
    B.add(mSteelDark, beam([xs + 1.15, 0.94, zk - 0.9], [xs + 0.99, 1.52, zk - 0.9], 0.01, 6));
    // legs
    for (const [lx, lz] of [[0.12, -0.12], [1.36, -0.12], [0.45, -1.72]]) B.add(mPiano, place(latheG([[0.001, 0], [0.04, 0], [0.05, 0.05], [0.04, 0.1], [0.055, 0.5], [0.07, 0.62], [0.001, 0.62]], 12), xs + lx, 0, zk + lz));
    for (const [lx, lz] of [[0.12, -0.12], [1.36, -0.12], [0.45, -1.72]]) B.add(mBrass, place(new THREE.CylinderGeometry(0.035, 0.035, 0.04, 10), xs + lx, 0.02, zk + lz));
    // keyboard
    B.add(mPiano, place(boxGeo(1.48, 0.12, 0.28), xs + 0.74, 0.68, zk + 0.13));
    for (const s of [0.06, 1.42]) B.add(mPiano, place(boxGeo(0.12, 0.1, 0.28), xs + s, 0.79, zk + 0.13));
    B.add(mKeys, place(new THREE.PlaneGeometry(1.24, 0.15).rotateX(-Math.PI / 2), xs + 0.74, 0.745, zk + 0.18));
    B.add(mKeys, place(new THREE.PlaneGeometry(1.24, 0.02), xs + 0.74, 0.735, zk + 0.255));
    const kw = 1.24 / 52;
    for (let i = 0; i < 51; i++) { const n = i % 7; if (n === 2 || n === 6) continue; boxI.add(xs + 0.12 + (i + 1) * kw, 0.755, zk + 0.14, [0.012, 0.018, 0.09], "#141416"); }
    B.add(mPiano, place(boxGeo(1.26, 0.07, 0.05), xs + 0.74, 0.79, zk + 0.08));
    B.add(mPiano, place(boxGeo(0.8, 0.28, 0.015), xs + 0.74, 1.02, zk - 0.02, -0.25));
    B.add(mBrass, place(boxGeo(0.2, 0.03, 0.08), xs + 0.74, 0.08, zk - 0.02));
    B.add(mPiano, place(boxGeo(0.14, 0.5, 0.04), xs + 0.74, 0.35, zk - 0.05));
    k.collider(xs, xs + 1.5, zk - 1.93, zk + 0.28, 0, 0.94, true);
    // bench
    const bf = new Fr(xs + 0.74, zk + 0.72, 0);
    bf.box(mBlackP, 0.8, 0.09, 0.36, 0, 0.44, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) bf.box(mPiano, 0.05, 0.44, 0.05, sx * 0.35, 0, sz * 0.14);
    bf.col(-0.4, 0.4, -0.18, 0.18, 0, 0.53);
    bf.inst(boxI, -0.1, 0.545, 0, [0.24, 0.015, 0.32], "#f2efe0", 0.2);
  }
  function musicStand(x: number, z: number, ry: number) {
    const f = new Fr(x, z, ry);
    f.cyl(mBlackP, 0.008, 0.008, 1.05, 0, 0, 0, 6);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; f.geo(mBlackP, beam([0, 0.3, 0], [Math.cos(a) * 0.25, 0, Math.sin(a) * 0.25], 0.007, 5)); }
    f.box(mBlackP, 0.5, 0.32, 0.01, 0, 0.98, 0.02, -0.35);
    f.box(mBlackP, 0.5, 0.03, 0.05, 0, 0.97, 0.06);
    if (rnd() < 0.8) for (const s of [-1, 1]) f.geo(mPapers[7], new THREE.PlaneGeometry(0.2, 0.28), s * 0.102, 1.142, 0.027, -0.35, s * 0.03);
  }
  function marimba(x: number, z: number) {
    const f = new Fr(x, z, 0);
    const Lm = 2.1;
    for (const s of [-1, 1]) { f.box(mRosewoodFrame(), 0.08, 0.85, 0.7, s * Lm / 2, 0, 0); f.box(mRubber, 0.1, 0.05, 0.1, s * Lm / 2, 0, 0.3); f.box(mRubber, 0.1, 0.05, 0.1, s * Lm / 2, 0, -0.3); }
    f.box(mRosewoodFrame(), Lm, 0.05, 0.05, 0, 0.8, 0.3);
    f.box(mRosewoodFrame(), Lm, 0.05, 0.05, 0, 0.8, -0.3);
    f.box(mSteelDark, Lm, 0.03, 0.03, 0, 0.3, 0);
    const n = 30;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), lx = -Lm / 2 + 0.08 + t * (Lm - 0.16);
      const bl = 0.5 - t * 0.26;
      const [wx, wz] = f.pt(lx, 0);
      boxI.add(wx, 0.87, wz, [0.052, 0.022, bl], "#6a3520");
      cylI.add(wx, 0.84 - (0.45 - t * 0.35) / 2, wz + 0.02, [0.022, 0.45 - t * 0.35, 0.022], "#c5a24c");
    }
    f.col(-Lm / 2 - 0.05, Lm / 2 + 0.05, -0.36, 0.36, 0, 0.9);
  }
  function mRosewoodFrame() { return mWoodD; }
  function drumKit(x: number, z: number) {
    const f = new Fr(x, z, -Math.PI / 2); // drummer at local +z (towards +x)... faces the room (−x)
    f.geo(mDrumShell, new THREE.CylinderGeometry(0.28, 0.28, 0.4, 24), 0, 0.3, -0.1, Math.PI / 2);
    for (const s of [-1, 1]) f.geo(mDrumHead, new THREE.CircleGeometry(0.27, 24), 0, 0.3, -0.1 + s * 0.203, s > 0 ? 0 : Math.PI);
    f.geo(mDrumShell, new THREE.CylinderGeometry(0.15, 0.15, 0.16, 20), -0.18, 0.7, -0.1, 0.35);
    f.geo(mDrumShell, new THREE.CylinderGeometry(0.16, 0.16, 0.18, 20), 0.18, 0.7, -0.1, 0.35);
    f.geo(mDrumShell, new THREE.CylinderGeometry(0.2, 0.2, 0.32, 20), 0.5, 0.32, 0.2);
    f.geo(mDrumHead, new THREE.CylinderGeometry(0.2, 0.2, 0.005, 20), 0.5, 0.485, 0.2);
    f.geo(mStainless, new THREE.CylinderGeometry(0.18, 0.18, 0.12, 20), -0.35, 0.62, 0.3);
    f.geo(mDrumHead, new THREE.CylinderGeometry(0.18, 0.18, 0.005, 20), -0.35, 0.68, 0.3);
    f.geo(mSteel, beam([-0.35, 0, 0.3], [-0.35, 0.56, 0.3], 0.01, 6));
    for (const [cx, cy, cz, r] of [[-0.6, 0.95, 0.15, 0.18], [-0.45, 1.35, -0.3, 0.22], [0.55, 1.4, -0.2, 0.24]]) {
      f.geo(mSteel, beam([cx, 0, cz], [cx, cy, cz], 0.01, 6));
      f.geo(mBrass, latheG([[0.001, 0.02], [0.03, 0.02], [0.04, 0.01], [r, 0]], 20), cx, cy, cz);
      if (r < 0.2) f.geo(mBrass, latheG([[0.001, -0.02], [0.03, -0.02], [0.04, -0.01], [r, 0]], 20), cx, cy - 0.03, cz, Math.PI);
    }
    f.geo(mRubber, new THREE.CylinderGeometry(0.17, 0.17, 0.08, 16), 0, 0.5, 0.6);
    f.geo(mSteel, beam([0, 0, 0.6], [0, 0.46, 0.6], 0.02, 6));
    f.col(-0.8, 0.8, -0.4, 0.8, 0, 0.62);
  }
  function timpani(x: number, z: number, r: number) {
    B.add(mCopper, place(latheG([[0.001, 0], [r * 0.4, 0.02], [r * 0.85, 0.12], [r, 0.3], [r * 1.02, 0.4], [r * 1.02, 0.44], [0.001, 0.44]], 26), x, 0.35, z));
    B.add(mDrumHead, place(new THREE.CylinderGeometry(r * 0.98, r * 0.98, 0.005, 26), x, 0.795, z));
    B.add(mSteel, place(new THREE.TorusGeometry(r * 1.02, 0.012, 6, 26), x, 0.79, z, Math.PI / 2));
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; B.add(mSteel, beam([x + Math.cos(a) * r * 0.6, 0.4, z + Math.sin(a) * r * 0.6], [x + Math.cos(a) * r * 0.9, 0, z + Math.sin(a) * r * 0.9], 0.015, 6)); }
    k.collider(x - r, x + r, z - r, z + r, 0, 0.8, true);
  }
  function guitar(x: number, z: number, ry: number, col: string) {
    const f = new Fr(x, z, ry);
    const pts: THREE.Vector2[] = [];
    const wAt = (y: number) => Math.max(Math.sqrt(Math.max(0, 0.19 * 0.19 - y * y)), Math.sqrt(Math.max(0, 0.145 * 0.145 - (y - 0.26) * (y - 0.26))));
    const N = 22;
    for (let i = 0; i <= N; i++) { const y = -0.19 + (i / N) * 0.595; pts.push(new THREE.Vector2(wAt(y) * 0.98 + 0.001, y)); }
    for (let i = N; i >= 0; i--) { const y = -0.19 + (i / N) * 0.595; pts.push(new THREE.Vector2(-wAt(y) * 0.98 - 0.001, y)); }
    const shp = new THREE.Shape(pts);
    const bm = k.mat(null, col, [1, 1], { roughness: 0.2, metalness: 0.1 });
    const lean = -0.22;
    const body = new THREE.ExtrudeGeometry(shp, { depth: 0.1, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 1, curveSegments: 8 });
    body.translate(0, 0.19, -0.05);
    body.rotateX(lean);
    f.geo(bm, body, 0, 0.05, 0.12);
    const hole = new THREE.CircleGeometry(0.05, 16); hole.translate(0, 0.44, 0.058); hole.rotateX(lean);
    f.geo(mBlackP, hole, 0, 0.05, 0.12);
    const neck = boxGeo(0.05, 0.5, 0.03); neck.translate(0, 0.84, 0.03); neck.rotateX(lean);
    f.geo(mWoodD, neck, 0, 0.05, 0.12);
    const head = boxGeo(0.08, 0.17, 0.02); head.translate(0, 1.17, 0.02); head.rotateX(lean);
    f.geo(mWoodD, head, 0, 0.05, 0.12);
    f.box(mBlackP, 0.3, 0.05, 0.3, 0, 0, 0.12);
    f.col(-0.2, 0.2, -0.1, 0.35, 0, 1.2, false);
  }

  // ---------- science lab ----------
  seed = 177;
  k.room("Science Lab", 11, 24, 0, 10);
  dirtRoom(11, 24, 0, 10, 5);
  litter(14, 23, 1, 9, 6);
  {
    const f = new Fr(11.15, 5, Math.PI / 2);
    f.box(mBoardFrame, 5.32, 1.32, 0.03, 0, 0.79, 0.015);
    f.geo(boardMats.lab, new THREE.PlaneGeometry(5.2, 1.2), 0, 1.45, 0.035);
    f.box(mBoardFrame, 5.3, 0.05, 0.1, 0, 0.78, 0.07);
    boardTray(f, 8, 0.004);
    clock(11.15, 2.6, 5, Math.PI / 2);
    // periodic table on the corridor wall
    const pt = new Fr(17, 0.15, 0);
    pt.box(mAlu, 2.1, 1.1, 0.02, 0, 1.05, 0.01);
    pt.geo(mPeriodic, new THREE.PlaneGeometry(2.0, 1.0), 0, 1.6, 0.022);
    poster(2, 14.6, 1.6, 0.16, 0, 0.6);
    // demo bench
    labBench(13.0, 5.0, Math.PI / 2, 2.4, 0.9, true);
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) labBench(16.4 + i * 4.2, 3.0 + j * 4.0, 0, 2.2, 1.2, false);
    // glass cabinets on the east wall
    for (let i = 0; i < 3; i++) glassCabinet(23.85 - 0.23, 2.9 + i * 2.2, -Math.PI / 2);
    // fume hood
    const fh = new Fr(23.85 - 0.45, 0.95, -Math.PI / 2);
    fh.box(mLabCab, 1.3, 0.85, 0.85, 0, 0, 0);
    fh.box(mLabTop, 1.32, 0.04, 0.87, 0, 0.85, 0);
    fh.box(mLabCab, 1.3, 0.95, 0.85, 0, 1.55, 0);
    for (const s of [-1, 1]) fh.box(mLabCab, 0.08, 0.7, 0.85, s * 0.61, 0.89, 0);
    fh.box(mDarkInside, 1.14, 0.66, 0.02, 0, 0.89, -0.4);
    fh.geo(mGlass, new THREE.BoxGeometry(1.12, 0.45, 0.01), 0, 1.35, 0.42);
    fh.box(mAlu, 1.14, 0.04, 0.04, 0, 1.1, 0.42);
    fh.box(mLabCab, 0.4, 0.25, 0.4, 0.3, 2.5, -0.1);
    fh.col(-0.65, 0.65, -0.43, 0.43, 0, 2.5, true);
    { const [gx2, gz2] = fh.pt(-0.2, -0.1); glassI.add(gx2, 0.89, gz2, [1.5, 1.5, 1.5]); }
    // skeleton in the front corner
    skeleton(12.1, 8.9, Math.PI / 2 + 0.4);
    // sink counter under the windows
    const sc = new Fr(18.4, 9.55, Math.PI);
    sc.box(mLabCab, 9.6, 0.8, 0.58, 0, 0, 0);
    sc.box(mLabTop, 9.7, 0.05, 0.62, 0, 0.8, 0);
    for (let i = -4; i <= 4; i++) sc.box(mCabGrey, 0.005, 0.7, 0.01, i * 1.06, 0.05, -0.292);
    for (let i = -4; i < 4; i++) sc.box(mStainless, 0.12, 0.02, 0.02, i * 1.06 + 0.53, 0.68, -0.3);
    for (const sx of [-3, 0, 3]) {
      sc.box(mStainless, 0.55, 0.02, 0.4, sx, 0.82, 0);
      sc.box(mDarkInside, 0.48, 0.005, 0.33, sx, 0.84, 0);
      const [ax, az] = sc.pt(sx, 0.2);
      B.add(mStainless, tubeG([[ax, 0.84, az], [ax, 1.18, az], [ax, 1.25, az - 0.08], [ax, 1.12, az - 0.2]].map(([a, b, c]) => [a, b, c] as V3t), 0.012, 16, 6));
    }
    sc.col(-4.85, 4.85, -0.31, 0.31, 0, 0.85, true);
    for (let i = 0; i < 8; i++) { const [a, b] = sc.pt(-4.4 + i * 1.1 + rr(-0.2, 0.2), rr(-0.1, 0.1)); (rnd() < 0.5 ? glassI : flaskI).add(a, 0.85, b, [1, 1, 1]); }
    extinguisher(11.45, 1.6);
    B.add(mRedP, place(latheG([[0.001, 0], [0.13, 0], [0.15, 0.3], [0.001, 0.3]], 16), 11.5, 0, 1.05));
    B.add(mSand, place(new THREE.CylinderGeometry(0.14, 0.14, 0.01, 16), 11.5, 0.28, 1.05));
    // curtains
    for (const wc of [13.5, 17.5, 21.5]) { bx(mAlu, 3.6, 0.035, 0.05, wc, 2.9, 9.73); curtainPanel(wc - 1.5, 9.62, 0.55, 2.0, 0.93); curtainPanel(wc + 1.5, 9.62, 0.55, 2.0, 0.93); }
  }
  function labBench(x: number, z: number, ry: number, Lb: number, Db: number, demo: boolean) {
    const f = new Fr(x, z, ry);
    f.box(mLabCab, Lb - 0.1, 0.72, Db - 0.1, 0, 0.08, 0);
    f.box(mRubber, Lb - 0.16, 0.08, Db - 0.16, 0, 0, 0);
    f.box(mLabTop, Lb, 0.05, Db, 0, 0.8, 0);
    const nd = Math.round(Lb / 0.55);
    for (const s of [-1, 1]) for (let i = 1; i < nd; i++) f.box(mCabGrey, 0.006, 0.66, 0.01, -Lb / 2 + 0.05 + (i * (Lb - 0.1)) / nd, 0.11, s * (Db / 2 - 0.05));
    for (const s of [-1, 1]) for (let i = 0; i < nd; i++) f.box(mStainless, 0.1, 0.02, 0.02, -Lb / 2 + 0.05 + ((i + 0.5) * (Lb - 0.1)) / nd, 0.7, s * (Db / 2 - 0.04));
    // sink + gooseneck + gas taps
    f.box(mStainless, 0.46, 0.02, 0.36, demo ? 0.7 : 0, 0.83, 0);
    f.box(mDarkInside, 0.4, 0.005, 0.3, demo ? 0.7 : 0, 0.852, 0);
    const [gx, gz] = f.pt(demo ? 0.7 : 0, demo ? -0.3 : 0.22);
    const dir = f.pt(demo ? 0.7 : 0, demo ? -0.1 : 0.05);
    B.add(mStainless, tubeG([[gx, 0.85, gz], [gx, 1.2, gz], [(gx * 2 + dir[0]) / 3, 1.27, (gz * 2 + dir[1]) / 3], [dir[0], 1.12, dir[1]]], 0.012, 16, 6));
    for (const s of [-1, 1]) {
      const [tx, tz] = f.pt(s * 0.35 + (demo ? 0.7 : 0), demo ? -0.3 : 0);
      B.add(mBrass, place(new THREE.CylinderGeometry(0.015, 0.02, 0.08, 8), tx, 0.89, tz));
      B.add(mYellowP, place(boxGeo(0.06, 0.015, 0.02), tx, 0.94, tz));
    }
    f.col(-Lb / 2, Lb / 2, -Db / 2, Db / 2, 0, 0.85, true);
    // glassware & gear on top
    const items = demo ? 6 : 4;
    for (let i = 0; i < items; i++) {
      const lx = rr(-Lb / 2 + 0.2, Lb / 2 - 0.2), lz = (rnd() < 0.5 ? -1 : 1) * rr(0.25, Db / 2 - 0.12);
      if (Math.abs(lx - (demo ? 0.7 : 0)) < 0.35 && Math.abs(lz) < 0.3) continue;
      const [ix, iz] = f.pt(lx, lz);
      const q = rnd(), col = pick(["#4aa3e0", "#e8584f", "#7ad06a", "#f2d24a", "#b070e0"]);
      if (q < 0.4) { glassI.add(ix, 0.825, iz, [1.3, 1.3, 1.3]); liquidI.add(ix, 0.825 + 0.04, iz, [0.05, 0.075, 0.05], col); }
      else if (q < 0.7) { flaskI.add(ix, 0.825, iz, [1.2, 1.2, 1.2]); liquidI.add(ix, 0.825 + 0.025, iz, [0.06, 0.045, 0.06], col); }
      else if (q < 0.85) {
        B.add(mWoodL, place(boxGeo(0.25, 0.05, 0.07), ix, 0.9, iz, 0, ry));
        for (let t = 0; t < 5; t++) { const [ttx, ttz] = f.pt(lx - 0.1 + t * 0.05, lz); cylI.add(ttx, 0.93, ttz, [0.008, 0.14, 0.008], t % 2 ? col : "#dff0f4"); }
        for (const s of [-1, 1]) { const [px2, pz2] = f.pt(lx + s * 0.11, lz); B.add(mWoodL, place(boxGeo(0.02, 0.1, 0.06), px2, 0.875, pz2, 0, ry)); }
      } else microscope(ix, iz, ry + rr(-0.5, 0.5));
    }
    // stools
    if (!demo) for (const s of [-1, 1]) for (const t of [-0.55, 0.55]) { const [sx, sz] = f.pt(t + rr(-0.08, 0.08), s * (Db / 2 + 0.36 + rr(-0.05, 0.08))); stool(sx, sz); }
    else chair(...f.pt(0, -0.8), ry);
  }
  function stool(x: number, z: number) {
    B.add(mWoodL, place(latheG([[0.001, 0], [0.16, 0], [0.165, 0.02], [0.155, 0.04], [0.001, 0.04]], 20), x, 0.58, z));
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.785; B.add(mSteel, beam([x + Math.cos(a) * 0.11, 0.58, z + Math.sin(a) * 0.11], [x + Math.cos(a) * 0.17, 0, z + Math.sin(a) * 0.17], 0.011, 6)); }
    B.add(mSteel, place(new THREE.TorusGeometry(0.145, 0.009, 5, 18), x, 0.22, z, Math.PI / 2));
    k.collider(x - 0.17, x + 0.17, z - 0.17, z + 0.17, 0, 0.62, true);
  }
  function microscope(x: number, z: number, ry: number) {
    const f = new Fr(x, z, ry);
    f.box(mBlackP, 0.12, 0.03, 0.16, 0, 0.825, 0);
    f.box(mWhiteP, 0.04, 0.2, 0.04, 0, 0.855, -0.05, 0.2);
    f.box(mWhiteP, 0.08, 0.01, 0.08, 0, 0.93, 0.01);
    f.cyl(mBlackP, 0.018, 0.018, 0.14, 0, 0.98, 0.0, 10, -0.5);
    f.cyl(mSteel, 0.012, 0.012, 0.03, 0, 0.94, 0.02, 8);
  }
  function glassCabinet(x: number, z: number, ry: number) {
    const f = new Fr(x, z, ry);
    const Wc = 2.1, Hc = 2.0, Dc = 0.44;
    f.box(mCabGrey, Wc, 0.85, Dc, 0, 0, 0);
    for (const s of [-1, 1]) f.box(mCream, Wc / 2 - 0.03, 0.75, 0.01, s * Wc / 4, 0.05, Dc / 2 + 0.003);
    f.box(mCabGrey, Wc, 0.03, Dc, 0, Hc - 0.03, 0);
    for (const s of [-1, 1]) f.box(mCabGrey, 0.03, Hc - 0.85, Dc, s * (Wc / 2 - 0.015), 0.85, 0);
    f.box(mCream, Wc, Hc - 0.85, 0.01, 0, 0.85, -Dc / 2 + 0.005);
    for (let r2 = 1; r2 < 3; r2++) f.geo(mGlassWare, new THREE.BoxGeometry(Wc - 0.06, 0.01, Dc - 0.04), 0, 0.85 + r2 * 0.38, 0);
    for (const s of [-1, 1]) {
      f.geo(mGlass, new THREE.BoxGeometry(Wc / 2 - 0.04, Hc - 0.9, 0.008), s * Wc / 4, 0.85 + (Hc - 0.85) / 2, Dc / 2 - 0.01 + s * 0.012);
      f.box(mAlu, Wc / 2, 0.03, 0.03, s * Wc / 4, 0.85, Dc / 2 - 0.01);
      f.box(mAlu, 0.03, Hc - 0.85, 0.03, s * (Wc / 2 - 0.02), 0.85, Dc / 2 - 0.01);
    }
    f.box(mAlu, 0.04, Hc - 0.85, 0.04, 0, 0.85, Dc / 2 - 0.01);
    f.col(-Wc / 2, Wc / 2, -Dc / 2, Dc / 2 + 0.02, 0, Hc, true);
    for (let r2 = 0; r2 < 3; r2++) {
      const y = 0.855 + r2 * 0.38;
      for (let i = 0; i < 9; i++) {
        const lx = -Wc / 2 + 0.15 + i * 0.22 + rr(-0.04, 0.04), lz = rr(-0.1, 0.1);
        const [ix, iz] = f.pt(lx, lz);
        const q = rnd();
        if (q < 0.45) bottleI.add(ix, y, iz, [1, rr(0.8, 1.2), 1], pick(["#6b3a16", "#7a4a1e", "#d8e8ea", "#2a4a8a", "#d8e8ea"]));
        else if (q < 0.7) glassI.add(ix, y, iz, [1.4, 1.2, 1.4]);
        else if (q < 0.85) flaskI.add(ix, y, iz, [1.1, 1.1, 1.1]);
        else { B.add(mGlassWare, place(new THREE.CylinderGeometry(0.06, 0.06, 0.2, 14), ix, y + 0.1, iz)); liquidI.add(ix, y + 0.07, iz, [0.055, 0.14, 0.055], "#d8d090"); }
      }
    }
  }
  function skeleton(x: number, z: number, ry: number) {
    const f = new Fr(x, z, ry);
    // stand
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.785; f.geo(mSteelDark, beam([0, 0.08, 0], [Math.cos(a) * 0.3, 0.05, Math.sin(a) * 0.3], 0.015, 6)); f.geo(mRubber, new THREE.SphereGeometry(0.03, 8, 6), Math.cos(a) * 0.3, 0.03, Math.sin(a) * 0.3); }
    f.geo(mSteel, beam([0, 0.05, -0.12], [0, 0.95, -0.12], 0.012, 6));
    f.geo(mSteel, beam([0, 0.95, -0.12], [0, 0.97, -0.02], 0.012, 6));
    const bone = (a: V3t, b: V3t, r: number) => f.geo(mBone, beam(a, b, r, 7));
    const jointB = (p: V3t, r: number) => f.geo(mBone, new THREE.SphereGeometry(r, 8, 6), ...p);
    // skull + jaw
    f.geo(mBone, new THREE.SphereGeometry(1, 18, 14).scale(0.085, 0.105, 0.1), 0, 1.62, 0.01);
    // eyes / nose
    for (const s of [-1, 1]) f.geo(mDarkInside, new THREE.SphereGeometry(0.022, 8, 6), s * 0.032, 1.63, 0.085);
    f.geo(mDarkInside, new THREE.SphereGeometry(0.012, 6, 4), 0, 1.595, 0.095);
    f.box(mBone, 0.09, 0.04, 0.08, 0, 1.52, 0.04);
    // spine
    for (let i = 0; i < 18; i++) { const y = 0.97 + i * 0.028; f.geo(mBone, new THREE.CylinderGeometry(0.02, 0.02, 0.018, 8), 0, y, -0.03 + Math.sin(i * 0.35) * 0.015); }
    // ribs
    for (let i = 0; i < 9; i++) {
      const y = 1.2 + i * 0.028, rw = 0.1 + Math.sin((i / 8) * Math.PI * 0.8 + 0.4) * 0.05, rd = 0.08 + i * 0.003;
      for (const s of [-1, 1]) f.geo(mBone, tubeG([[0, y + 0.01, -0.03], [s * rw * 0.8, y + 0.01, -0.05], [s * rw, y - 0.02, 0.02], [s * rw * 0.7, y - 0.04, rd * 0.8], [s * 0.02, y - 0.03, rd]], 0.007, 10, 4));
    }
    f.box(mBone, 0.03, 0.18, 0.015, 0, 1.24, 0.085);
    // pelvis
    f.geo(mBone, new THREE.TorusGeometry(0.1, 0.03, 6, 14), 0, 0.97, 0, Math.PI / 2 - 0.3, 0, 0);
    // clavicles + arms
    for (const s of [-1, 1]) {
      bone([s * 0.02, 1.47, 0.06], [s * 0.18, 1.48, 0], 0.008);
      jointB([s * 0.19, 1.46, 0], 0.028);
      bone([s * 0.19, 1.46, 0], [s * 0.23, 1.18, 0.0], 0.014);
      jointB([s * 0.23, 1.18, 0], 0.02);
      bone([s * 0.23, 1.18, 0], [s * 0.26, 0.93, 0.05], 0.009);
      bone([s * 0.245, 1.18, 0], [s * 0.275, 0.93, 0.03], 0.008);
      f.geo(mBone, new THREE.SphereGeometry(1, 8, 6).scale(0.02, 0.06, 0.035), s * 0.27, 0.87, 0.04);
      for (let d = 0; d < 4; d++) bone([s * 0.27, 0.84, 0.02 + d * 0.015], [s * 0.275, 0.78, 0.02 + d * 0.015], 0.004);
      // legs
      jointB([s * 0.09, 0.92, 0.01], 0.03);
      bone([s * 0.09, 0.92, 0.01], [s * 0.1, 0.5, 0.01], 0.017);
      jointB([s * 0.1, 0.5, 0.02], 0.028);
      bone([s * 0.1, 0.5, 0.01], [s * 0.1, 0.1, 0], 0.014);
      bone([s * 0.125, 0.48, 0], [s * 0.125, 0.1, -0.01], 0.007);
      f.box(mBone, 0.06, 0.035, 0.2, s * 0.1, 0.06, 0.06);
    }
    f.col(-0.32, 0.32, -0.32, 0.32, 0, 1.72, false);
  }

  // ---------- gym ----------
  seed = 211;
  k.room("Gym", -24, -4, -20, -3);
  {
    // court lines
    const line = (m: Mat, x1: number, x2: number, z1: number, z2: number) => B.add(m, place(new THREE.PlaneGeometry(x2 - x1, z2 - z1).rotateX(-Math.PI / 2), (x1 + x2) / 2, 0.003, (z1 + z2) / 2));
    B.noShadow.add(mLineW); B.noShadow.add(mLineY); B.noShadow.add(mLineG);
    const rect = (m: Mat, x1: number, x2: number, z1: number, z2: number, t = 0.05) => { line(m, x1, x2, z1, z1 + t); line(m, x1, x2, z2 - t, z2); line(m, x1, x1 + t, z1, z2); line(m, x2 - t, x2, z1, z2); };
    const ring = (m: Mat, x: number, z: number, r: number, a0 = 0, al = Math.PI * 2) => B.add(m, place(new THREE.RingGeometry(r - 0.05, r, 48, 1, a0, al).rotateX(-Math.PI / 2), x, 0.004, z));
    const cz = -11.5;
    rect(mLineW, -23.3, -9.3, -18.6, -4.4);
    line(mLineW, -16.33, -16.27, -18.6, -4.4);
    ring(mLineW, -16.3, cz, 1.8);
    rect(mLineW, -23.3, -17.5, cz - 2.45, cz + 2.45);
    ring(mLineW, -17.5, cz, 1.8, -Math.PI / 2, Math.PI);
    ring(mLineW, -21.9, cz, 6.75, -Math.PI / 2 + 0.25, Math.PI - 0.5);
    rect(mLineY, -21.5, -11.1, -16.1, -6.9);
    line(mLineY, -16.33, -16.27, -16.1, -6.9);
    rect(mLineG, -22.6, -16.6, -18.2, -13.2, 0.04);
    // hoop on the west wall
    const hp = new Fr(-23.85, cz, Math.PI / 2);
    for (const s of [-1, 1]) {
      hp.box(mSteelDark, 0.08, 0.08, 1.0, s * 0.5, 3.3, 0.5);
      hp.geo(mSteelDark, beam([s * 0.5, 2.4, 0.02], [s * 0.5, 3.3, 0.95], 0.03, 6, false));
      hp.box(mSteelDark, 0.12, 1.5, 0.05, s * 0.5, 2.3, 0.025);
    }
    hp.box(mWhiteP, 1.8, 1.05, 0.04, 0, 2.9, 1.0);
    hp.box(mRedP, 0.59, 0.04, 0.01, 0, 3.0, 1.025);
    hp.box(mRedP, 0.59, 0.04, 0.01, 0, 3.41, 1.025);
    for (const s of [-1, 1]) hp.box(mRedP, 0.04, 0.45, 0.01, s * 0.275, 3.0, 1.025);
    hp.box(mRedP, 1.8, 0.05, 0.012, 0, 3.9, 1.026); hp.box(mRedP, 1.8, 0.05, 0.012, 0, 2.9, 1.026);
    hp.box(mMatBlue, 1.8, 0.1, 0.08, 0, 2.8, 1.0);
    hp.geo(mOrange, new THREE.TorusGeometry(0.23, 0.01, 6, 28), 0, 3.05, 1.27, Math.PI / 2);
    hp.box(mOrange, 0.14, 0.04, 0.05, 0, 3.02, 1.05);
    hp.geo(mNet, latheG([[0.225, 0], [0.19, -0.2], [0.15, -0.4]], 18), 0, 3.05, 1.27);
    // stage (east end)
    const sx1 = -8, sz1 = -17.5, sz2 = -5.5, SH = 1.1;
    slab(mWoodM, sx1, -4.15, 0, SH, sz1, sz2, 1.2);
    slab(k.mat(k.tex("sc-oakd", () => S.strips("#946438", 12, 8)), "#ffffff", [1, 1], { roughness: 0.35, bump: 0.35 }), sx1 - 0.02, -4.15, SH, SH + 0.02, sz1, sz2, 1);
    k.collider(sx1, -4.15, sz1, sz2, 0, SH + 0.02, true);
    for (let i = 0; i < 6; i++) { const zc = sz1 + 1 + i * 2; bx(mWoodL, 1.8, 0.8, 0.02, sx1 - 0.01, 0.12, zc, Math.PI / 2); bx(mSteelDark, 0.4, 0.04, 0.03, sx1 - 0.03, 0.8, zc, Math.PI / 2); }
    for (let i = 0; i < 4; i++) { const hgt = (i + 1) * 0.22; bx(mWoodM, 0.34, hgt, 1.4, sx1 - 0.17 - (3 - i) * 0.34, 0, sz2 - 0.9); k.collider(sx1 - 0.34 - (3 - i) * 0.34, sx1 - (3 - i) * 0.34, sz2 - 1.6, sz2 - 0.2, 0, hgt, true); }
    // proscenium + curtains
    for (const z of [sz1 - 0.3, sz2 + 0.3]) { bx(mGymWall, 0.5, GH, 0.6, sx1 + 0.25, 0, z); k.collider(sx1, sx1 + 0.5, z - 0.3, z + 0.3, 0, GH, false); }
    bx(mGymWall, 0.5, 1.6, sz2 - sz1 + 1.2, sx1 + 0.25, GH - 1.6, (sz1 + sz2) / 2);
    const cz2 = (sz1 + sz2) / 2;
    const stageCurtain = (zc: number, w: number, h: number, y: number) => {
      const g = new THREE.PlaneGeometry(w, h, 30, 1);
      const p = g.attributes.position;
      const folds = Math.round(w / 0.18);
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) / w + 0.5) * folds * Math.PI) * 0.07);
      g.computeVertexNormals();
      g.rotateY(Math.PI / 2);
      g.translate(sx1 + 0.6, y, zc);
      B.add(mStageCurtain, g);
    };
    stageCurtain(sz1 + 1.1, 2.0, 4.3, SH + 2.15);
    stageCurtain(sz2 - 1.1, 2.0, 4.3, SH + 2.15);
    stageCurtain(cz2, sz2 - sz1, 0.8, GH - 2.0);
    // stage props: podium, flag stand, folded tables
    const pd = new Fr(-6.2, cz2, -Math.PI / 2);
    pd.box(mWoodD, 1.0, 1.0, 0.55, 0, SH + 0.02, 0);
    pd.box(mWoodM, 1.1, 0.04, 0.62, 0, SH + 1.02, 0);
    pd.col(-0.55, 0.55, -0.31, 0.31, SH, SH + 1.06, true);
    B.add(mGold, place(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 16), -6.2, SH + 1.07, cz2));
    for (let i = 0; i < 5; i++) bx(mWoodL, 0.05, 0.75, 1.8, -4.5 - i * 0.07, SH + 0.02, sz1 + 1.4, 0);
    k.collider(-4.9, -4.3, sz1 + 0.5, sz1 + 2.3, SH, SH + 0.77, true);
    B.add(mSteel, beam([-4.6, SH, sz2 - 1.5], [-4.6, SH + 2.4, sz2 - 1.5], 0.015, 6));
    const mFlag = k.mat(null, "#f6f4ee", [1, 1], { roughness: 0.8 });
    mFlag.m.side = THREE.DoubleSide;
    B.add(mFlag, place(new THREE.PlaneGeometry(0.9, 0.6).rotateY(Math.PI / 2), -4.6, SH + 2.05, sz2 - 1.05));
    B.add(mRedP, place(new THREE.CircleGeometry(0.17, 20).rotateY(-Math.PI / 2), -4.63, SH + 2.05, sz2 - 1.05));
    clock(-7.99, 6.0, cz2, -Math.PI / 2, 0.3);
    // wall bars (rokuboku) on the north wall
    for (let i = 0; i < 6; i++) {
      const px = -15 + i * 0.9;
      bx(mWoodM, 0.09, 3.2, 0.09, px, 0, -19.85 + 0.2);
      for (let j = 0; j < 14; j++) cylI.add(px + 0.45, 0.25 + j * 0.21, -19.85 + 0.2, [0.018, 0.82, 0.018], "#c9a06a", 0, 0, Math.PI / 2);
    }
    bx(mWoodM, 0.09, 3.2, 0.09, -15 + 6 * 0.9 - 0.9 + 0.9, 0, -19.85 + 0.2);
    k.collider(-15.05, -9.5, -19.85, -19.55, 0, 3.2, true);
    // mats along the north wall
    for (let i = 0; i < 7; i++) { bx(mMatBlue, 1.9, 0.06, 1.2, -21.5 + rr(-0.03, 0.03), i * 0.06, -18.9 + rr(-0.03, 0.03), rr(-0.02, 0.02)); }
    k.collider(-22.45, -20.55, -19.5, -18.3, 0, 0.42, true);
    for (let i = 0; i < 3; i++) bx(mMatGreen, 2.0, 0.3, 1.0, -18.9, i * 0.3, -19.2);
    k.collider(-19.9, -17.9, -19.7, -18.7, 0, 0.9, true);
    bx(mMatBlue, 1.9, 0.06, 1.2, -21.2, 0, -5.4, 0.1);
    bx(mMatBlue, 1.2, 1.9, 0.06, -23.6, 0, -16.2, Math.PI / 2 - 0.25);
    k.collider(-23.85, -23.2, -16.9, -15.5, 0, 1.9, true);
    // vaulting box + springboard
    const vb = new Fr(-13.2, -5.4, 0);
    for (let i = 0; i < 6; i++) {
      const Lv = 1.0 - i * 0.03, Dv = 0.6 - i * 0.02, y = i * 0.17;
      if (i < 5) {
        vb.box(mWoodL, Lv, 0.17, Dv, 0, y, 0);
        for (const s of [-1, 1]) vb.box(mDarkInside, 0.22, 0.05, 0.01, 0, y + 0.06, s * (Dv / 2 + 0.001));
      } else { vb.box(mWoodL, Lv, 0.08, Dv, 0, y, 0); vb.box(mCanvas, Lv - 0.02, 0.09, Dv - 0.02, 0, y + 0.08, 0); }
    }
    vb.col(-0.5, 0.5, -0.3, 0.3, 0, 1.02, true);
    const spr = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(1.1, 0), new THREE.Vector2(1.1, 0.2), new THREE.Vector2(0, 0.05)]);
    const sg = new THREE.ExtrudeGeometry(spr, { depth: 0.6, bevelEnabled: false });
    sg.translate(-15.2, 0, -5.7);
    B.add(mWoodM, sg);
    B.add(mRubber, place(new THREE.BoxGeometry(1.05, 0.005, 0.56).rotateZ(Math.atan2(0.15, 1.1)), -14.65, 0.13, -5.4));
    k.collider(-15.2, -14.1, -5.7, -5.1, 0, 0.2, true);
    // ball carts
    const cart = (x: number, z: number, list: IList, n: number) => {
      const f = new Fr(x, z, 0);
      const Wc = 0.9, Dc = 0.6, Hc = 0.85;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { f.geo(mSteel, beam([sx * Wc / 2, 0.08, sz * Dc / 2], [sx * Wc / 2, Hc, sz * Dc / 2], 0.012, 6)); f.geo(mRubber, new THREE.CylinderGeometry(0.04, 0.04, 0.03, 10), sx * Wc / 2, 0.04, sz * Dc / 2, Math.PI / 2); }
      for (const y of [0.1, 0.45, Hc]) for (const sz of [-1, 1]) { f.geo(mSteel, beam([-Wc / 2, y, sz * Dc / 2], [Wc / 2, y, sz * Dc / 2], 0.01, 5)); f.geo(mSteel, beam([sz * Wc / 2, y, -Dc / 2], [sz * Wc / 2, y, Dc / 2], 0.01, 5)); }
      for (let i = 1; i < 6; i++) for (const sz of [-1, 1]) f.geo(mSteel, beam([-Wc / 2 + i * Wc / 6, 0.1, sz * Dc / 2], [-Wc / 2 + i * Wc / 6, Hc, sz * Dc / 2], 0.005, 4));
      f.box(mSteel, Wc, 0.02, Dc, 0, 0.1, 0);
      const r = list === ballB ? 0.12 : 0.105;
      let c = 0;
      for (let ly = 0; ly < 4 && c < n; ly++) for (let ix = 0; ix < 3 && c < n; ix++) for (let iz = 0; iz < 2 && c < n; iz++, c++) f.inst(list, -0.28 + ix * 0.28 + rr(-0.03, 0.03), 0.23 + ly * 0.2 + rr(0, 0.03), -0.14 + iz * 0.28 + rr(-0.02, 0.02), [1, 1, 1], "#ffffff", rr(0, 6), rr(0, 3));
      f.col(-Wc / 2, Wc / 2, -Dc / 2, Dc / 2, 0, Hc, true);
    };
    cart(-23.2, -3.55, ballB, 20);
    cart(-22.1, -3.55, ballV, 18);
    for (const [x, z] of [[-19.5, -7.6], [-9.6, -15.1], [-11.9, -4.2]]) ballB.add(x, 0.12, z, [1, 1, 1], "#ffffff", rnd() * 6);
    ballV.add(-8.9, 0.105, -4.1, [1, 1, 1], "#ffffff");
    // benches along the south wall
    for (const bxx of [-17, -13.2]) {
      const f = new Fr(bxx, -3.55, 0);
      f.box(mWoodL, 3.4, 0.05, 0.24, 0, 0.36, 0);
      for (const s of [-1.5, 0, 1.5]) f.box(mWoodM, 0.06, 0.36, 0.3, s, 0, 0);
      f.col(-1.7, 1.7, -0.15, 0.15, 0, 0.41, true);
    }
    // high-bay lamps + steel trusses
    for (const lx of [-20.5, -16, -11.5]) for (const lz of [-16.5, -11.5, -6.5]) {
      B.add(mFixture, place(latheG([[0.02, 0.36], [0.12, 0.3], [0.28, 0.08], [0.3, 0]], 18), lx, GH - 0.9, lz));
      B.add(mFluoro, place(new THREE.CircleGeometry(0.27, 18).rotateX(Math.PI / 2), lx, GH - 0.905, lz));
      B.add(mSteelDark, beam([lx, GH - 0.55, lz], [lx, GH, lz], 0.01, 5));
    }
    for (const tx of [-20, -16, -12, -8]) { slab(mSteelDark, tx - 0.12, tx + 0.12, GH - 0.5, GH, -19.85, -3.15, 2); }
    // wall clock + score board
    clock(-14, 5.2, -3.16, Math.PI, 0.3);
    const sb = new Fr(-9.7, -8.2, -Math.PI / 2);
    for (const s of [-1, 1]) sb.geo(mSteel, beam([s * 0.35, 0, -0.3], [s * 0.35, 1.2, 0], 0.012, 6));
    for (const s of [-1, 1]) sb.geo(mSteel, beam([s * 0.35, 0, 0.3], [s * 0.35, 1.2, 0], 0.012, 6));
    sb.box(mWhiteP, 0.8, 0.5, 0.02, 0, 0.7, 0.16);
    sb.box(mRedP, 0.3, 0.36, 0.01, -0.2, 0.77, 0.172);
    sb.box(mBlueP, 0.3, 0.36, 0.01, 0.2, 0.77, 0.172);
    sb.col(-0.4, 0.4, -0.32, 0.32, 0, 1.2, true);
    // volleyball net poles resting in the corner
    for (const s of [0, 1]) B.add(mSteel, beam([-4.5 - s * 0.15, 0, -18.6], [-4.35 - s * 0.15, 2.6, -18.3], 0.04, 12));
  }

  // ---------- entrance ----------
  seed = 263;
  k.room("Entrance", -4, 11, -14, -3);
  {
    for (const gz of [-9.6, -7.0, -4.4]) {
      getabako(-1.1, gz, 5.0, 5, 16, 1.75, true, mCream, 0, 0.36);
      getabako(8.1, gz, 5.0, 5, 16, 1.75, true, mCream, 0, 0.36);
    }
    // duckboards (sunoko)
    for (const sx of [-1.1, 8.1]) for (let i = 0; i < 12; i++) bx(mWoodL, 0.08, 0.03, 1.1, sx - 2.4 + i * 0.42, 0, -10.35 - 0.2, 0);
    bx(mWoodL, 5.0, 0.06, 0.06, -1.1, 0, -10.75); bx(mWoodL, 5.0, 0.06, 0.06, 8.1, 0, -10.75);
    // doorstep line + drain grate
    bx(mStainless, 6, 0.01, 0.2, 4, 0, -13.7);
    // umbrella stands
    for (const ux of [0.6, 7.4]) {
      const f = new Fr(ux, -13.35, 0);
      f.box(mStainless, 1.1, 0.04, 0.3, 0, 0.5, 0);
      f.box(mStainless, 1.1, 0.03, 0.3, 0, 0, 0);
      for (const s of [-1, 1]) f.box(mStainless, 0.03, 0.5, 0.3, s * 0.54, 0, 0);
      for (let i = 0; i < 7; i++) if (rnd() < 0.7) f.inst(cylI, -0.45 + i * 0.15, 0.45, rr(-0.05, 0.05), [0.025, 0.9, 0.025], pick(["#1c2a4a", "#e8e4dc", "#c83030", "#2a2a2e", "#3a8a4f"]), 0, rr(-0.08, 0.08), rr(-0.08, 0.08));
      f.col(-0.56, 0.56, -0.16, 0.16, 0, 0.55, true);
    }
    // trophy case against the west wall
    const tc = new Fr(-3.85 + 0.25, -12.4, Math.PI / 2);
    tc.box(mWoodD, 1.8, 0.8, 0.46, 0, 0, 0);
    tc.box(mWoodD, 1.8, 0.05, 0.46, 0, 1.9, 0);
    for (const s of [-1, 1]) tc.box(mWoodD, 0.04, 1.1, 0.46, s * 0.88, 0.8, 0);
    tc.box(k.mat(null, "#7a1c24", [1, 1], { roughness: 0.9 }), 1.72, 1.1, 0.01, 0, 0.8, -0.22);
    tc.geo(mGlassWare, new THREE.BoxGeometry(1.72, 0.01, 0.4), 0, 1.3, 0);
    tc.geo(mGlass, new THREE.BoxGeometry(1.72, 1.08, 0.01), 0, 1.35, 0.225);
    tc.col(-0.9, 0.9, -0.23, 0.24, 0, 1.95, true);
    for (const [lx, ly, s] of [[-0.6, 0.8, 1.2], [-0.2, 0.8, 1.6], [0.25, 0.8, 1.0], [0.62, 0.8, 1.3], [-0.45, 1.31, 0.9], [0.1, 1.31, 1.1], [0.55, 1.31, 0.8]] as V3t[]) {
      tc.geo(mWoodD, boxGeo(0.12 * s, 0.05, 0.12 * s), lx, ly + 0.025, 0);
      tc.geo(mGold, latheG([[0.001, 0], [0.04 * s, 0], [0.012 * s, 0.03 * s], [0.012 * s, 0.1 * s], [0.07 * s, 0.14 * s], [0.08 * s, 0.26 * s], [0.001, 0.24 * s]], 16), lx, ly + 0.05, 0);
    }
    tc.box(mGold, 0.3, 0.36, 0.02, 0.1, 1.33, -0.18);
    // bench + visitor slipper rack + lost & found box
    const bn2 = new Fr(10.5, -12.6, -Math.PI / 2);
    bn2.box(mWoodL, 1.6, 0.05, 0.4, 0, 0.4, 0);
    for (const s of [-0.7, 0.7]) bn2.box(mWoodM, 0.06, 0.4, 0.36, s, 0, 0);
    bn2.col(-0.8, 0.8, -0.2, 0.2, 0, 0.45, true);
    const sr = new Fr(10.6, -11.0, -Math.PI / 2);
    for (let r2 = 0; r2 < 4; r2++) { sr.box(mWoodM, 1.0, 0.02, 0.3, 0, 0.2 + r2 * 0.28, 0); for (let i = 0; i < 4; i++) sr.inst(boxI, -0.36 + i * 0.24, 0.24 + r2 * 0.28, 0, [0.2, 0.04, 0.26], pick(["#2c4a8a", "#6a2a3a", "#2a5a3a"])); }
    for (const s of [-1, 1]) sr.box(mWoodM, 0.03, 1.2, 0.3, s * 0.5, 0, 0);
    sr.col(-0.52, 0.52, -0.16, 0.16, 0, 1.2, true);
    bx(mCardboard, 0.45, 0.5, 0.6, 10.55, 0, -5.7);
    bx(mPaper, 0.01, 0.12, 0.36, 10.55 - 0.23, 0.3, -5.7);
    // plants, clock, painting, notice
    pot(1.0 - 0.2, -12.6, 1.6);
    pot(7.2 + 0.2, -12.6, 1.6);
    clock(4, 2.85, -13.84, 0, 0.2);
    painting(10.84, 2.4, -5.4, -Math.PI / 2, 1.0, 0.75, 9);
    const en = new Fr(-3.84, -8.0, Math.PI / 2);
    en.box(mWoodM, 1.6, 1.0, 0.03, 0, 1.85, 0.015);
    en.geo(mCork, uvPlane(1.5, 0.9, [0.55, 0, 0.3, 1]), 0, 2.35, 0.033);
    poster(1, -3.84, 2.3, -5.2, Math.PI / 2, 0.6);
    // glass doors: push bars
    for (let i = 0; i < 4; i++) bx(mStainless, 1.1, 0.04, 0.05, 1.75 + i * 1.5, 1.0, -13.8);
    // outside: canopy, path, gate, trees
    slab(k.mat(null, "#8a8c8e", [1, 1], { roughness: 0.6, metalness: 0.3 }), -1, 9, 2.9, 3.05, -17.5, -14.15, 4);
    for (const px of [-0.6, 8.6]) B.add(mSteel, place(new THREE.CylinderGeometry(0.08, 0.08, 2.9, 12), px, 1.45, -17.2));
    slab(mGranite, 1, 7, -0.03, 0.0, -30, -14.15, 0.8);
    for (const gx of [-1, 9]) slab(mOuterWall, gx - 0.4, gx + 0.4, 0, 1.8, -31, -30.2, 2);
    for (const [tx, tz] of [[-6, -24], [13, -26], [-2, -34], [18, -20], [26, -30]]) tree(tx, tz, 1.1);
  }

  // ---------- courtyard (visual, blocked) ----------
  tree(17.5, -8.5, 1.0);
  for (const [fx, fz] of [[13.2, -5.2], [21.6, -5.2], [13.2, -11.6], [21.6, -11.6]]) {
    slab(mOuterWall, fx - 1.2, fx + 1.2, 0, 0.35, fz - 0.6, fz + 0.6, 1);
    slab(mSoil, fx - 1.1, fx + 1.1, 0.35, 0.37, fz - 0.5, fz + 0.5, 1);
    for (let i = 0; i < 14; i++) leafI.add(fx + rr(-1, 1), 0.42, fz + rr(-0.4, 0.4), [0.1, 0.08, 0.1], pick(["#e84a5a", "#f2c23c", "#f08ab0", "#ffffff", "#6a9a4a", "#6a9a4a"]));
  }
  // ---------- schoolyard outside the south windows ----------
  for (let i = 0; i < 9; i++) tree(-26 + i * 6.6 + rr(-1, 1), 34 + rr(-1, 1.5), rr(1.0, 1.3));
  for (let x = -40; x <= 40; x += 2.5) B.add(mSteel, place(new THREE.CylinderGeometry(0.03, 0.03, 2.0, 6), x, 1.0, 30));
  B.add(mSteel, place(new THREE.BoxGeometry(80, 0.05, 0.05), 0, 1.95, 30));
  B.add(mSteel, place(new THREE.BoxGeometry(80, 0.05, 0.05), 0, 0.1, 30));
  for (const gx of [-6, 6]) { B.add(mWhiteP, place(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 8), gx - 3.66 + 3.66, 1.2, 40)); }
  B.add(mWhiteP, place(new THREE.BoxGeometry(12, 0.08, 0.08), 0, 2.4, 40));
  for (let i = 0; i < 7; i++) slab(mOuterWall, -45 + i * 14, -45 + i * 14 + 10, 0, rr(6, 12), 50, 58, 4);

  // ---------- flush ----------
  B.flush(k);
  for (const l of [boxI, bagI, shoeI, toeI, ...tagLists, ballB, ballV, leafI, glassI, flaskI, bottleI, liquidI, cylI, gumI, crumbI, hexI, tipI, paperBallI, chairWoodI, chairSteelI, chairFootI, deskUnderI, deskBandI, deskFrameI, deskShelfI, deskFootI]) l.flush(k);

  // hider spawns: centre of the gym
  const hiders: THREE.Vector3[] = [];
  for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) hiders.push(new THREE.Vector3(-18.5 + i * 1.4, 0, -13.6 + j * 1.4));
  const hunters: THREE.Vector3[] = [];
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) hunters.push(new THREE.Vector3(3 + i * 1.0, 0, -13.1 + j * 0.9));

  return k.finish({
    id: "school", name: "School",
    bounds: { minX: -23.85, maxX: 23.85, minZ: -19.85, maxZ: 9.85 },
    hunterSpawns: hunters, hiderSpawns: hiders,
    preview: { pos: [-12.9, 2.45, 0.9], look: [-21.5, 1.0, 6.8], fov: 62 },
    lighting: {
      sky: "#b9d0e4",
      hemi: ["#f4efe4", "#7b6e5c", 0.6],
      sun: { color: "#ffd29c", int: 3.4, pos: [-26, 17, 36] },
      points: [
        { pos: [-18, 2.7, 5], color: "#f4f6ff", int: 22, dist: 14 },
        { pos: [-6, 2.7, 5], color: "#f4f6ff", int: 22, dist: 14 },
        { pos: [5.5, 2.7, 5], color: "#fff1dc", int: 20, dist: 13 },
        { pos: [17.5, 2.7, 5], color: "#f4f6ff", int: 22, dist: 14 },
        { pos: [-14, 5.8, -11.5], color: "#fff4e2", int: 45, dist: 22 },
        { pos: [3.5, 2.7, -6.5], color: "#f4f6ff", int: 22, dist: 16 },
      ],
      exposure: 1.0,
      env: 0.55,
      hdri: "hall",
    },
  });
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
