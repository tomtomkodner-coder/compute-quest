// Penguin Hotel (ペンギンホテル): מלון חורף מפואר בכחול. אולם נשפים מרכזי בגובה כפול עם פסל פינגווין ענק
// מתחת לכיפת זכוכית, יציע (מזנין) בצורת U עם מדרגות ומעקות, מסדרונות צרים משני הצדדים, חדרי שינה (מיטות, כריות),
// חדרי רחצה מבריקים עם אמבטיות וברווזי גומי, מסעדה, חנות מזכרות — ובכל מקום בובות פינגווין, בלונים ופסלי קרמיקה.
// הציידים מופיעים בכניסה הראשית (דרום) כשהחיפוש מתחיל.
import * as THREE from "three";
import * as T from "../textures";
import * as P from "./tex/penguin";
import * as L from "./tex/lobby";
import { Kit, boxGeo, grid, ring, type Mat, type World } from "./kit";

type G = THREE.BufferGeometry;
type V3t = [number, number, number];
const V3 = THREE.Vector3;

function place(geo: G, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, s?: V3t) {
  const m = new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new V3(...(s ?? [1, 1, 1])));
  return geo.applyMatrix4(m);
}
function beam(a: V3t, b: V3t, w: number, d: number, round = false) {
  const va = new V3(...a), vb = new V3(...b);
  const len = va.distanceTo(vb);
  const geo = round ? new THREE.CylinderGeometry(w / 2, w / 2, len, 10) : boxGeo(w, len, d);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), vb.clone().sub(va).normalize()));
  const c = va.add(vb).multiplyScalar(0.5);
  geo.translate(c.x, c.y, c.z);
  return geo;
}
function lathe(pts: [number, number][], seg = 28) {
  return new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg);
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
/** מסגרת מקומית לרהיטים/חדרים מסובבים */
class Frame {
  constructor(public x: number, public z: number, public ry: number) {}
  pt(lx: number, lz: number): [number, number] {
    const c = Math.cos(this.ry), s = Math.sin(this.ry);
    return [this.x + lx * c + lz * s, this.z - lx * s + lz * c];
  }
  sub(lx: number, lz: number, lry: number) {
    const [x, z] = this.pt(lx, lz);
    return new Frame(x, z, this.ry + lry);
  }
  put(geo: G, lx: number, ly: number, lz: number, rx = 0, ry = 0, rz = 0) {
    place(geo, lx, ly, lz, rx, ry, rz);
    geo.applyMatrix4(new THREE.Matrix4().makeRotationY(this.ry));
    geo.translate(this.x, 0, this.z);
    return geo;
  }
  box(k: Kit, lx1: number, lx2: number, lz1: number, lz2: number, bottom: number, top: number, standable = true) {
    const xs: number[] = [], zs: number[] = [];
    for (const [a, b] of [[lx1, lz1], [lx2, lz1], [lx1, lz2], [lx2, lz2]]) {
      const [x, z] = this.pt(a, b);
      xs.push(x); zs.push(z);
    }
    k.collider(Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs), bottom, top, standable);
  }
}

type Inst = { pos: V3t; rotX?: number; rotY?: number; rotZ?: number; scale?: V3t; color?: string };
/** אוסף מופעים של כדורים (בובות, בלונים, ברווזים, קישוטים) — הכול בקריאת ציור אחת לכל חומר ורמת פירוט */
class Spheres {
  /** LOD tiers by the part's real size: [min radius (m), width segs, height segs] */
  static tiers: [number, number, number][] = [[0.2, 14, 10], [0.07, 10, 7], [0.025, 7, 5], [0, 5, 4]];
  static geos = new Map<number, THREE.SphereGeometry>();
  lists: Inst[][] = Spheres.tiers.map(() => []);
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  add(x: number, y: number, z: number, ry: number, s: number, parts: [number, number, number, number, number, number, number, string, number][]) {
    const qy = new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), ry);
    for (const [ox, oy, oz, sx, sy, sz, rz, col] of parts) {
      const o = new V3(ox * s, oy * s, oz * s).applyQuaternion(qy);
      this.q.setFromAxisAngle(new V3(0, 0, 1), rz).premultiply(qy);
      this.e.setFromQuaternion(this.q, "XYZ");
      const r = Math.max(sx, sy, sz) * s;
      const t = Spheres.tiers.findIndex(([mr]) => r >= mr);
      this.lists[t].push({ pos: [x + o.x, y + o.y, z + o.z], rotX: this.e.x, rotY: this.e.y, rotZ: this.e.z, scale: [sx * s, sy * s, sz * s], color: col });
    }
  }
  flush(k: Kit, m: Mat) {
    this.lists.forEach((l, i) => {
      if (!l.length) return;
      let g = Spheres.geos.get(i);
      if (!g) { g = new THREE.SphereGeometry(1, Spheres.tiers[i][1], Spheres.tiers[i][2]); Spheres.geos.set(i, g); }
      k.instances(g, m, l, { noShadow: i >= 2 });
    });
  }
}

export function buildPenguin(): World {
  const WING_H = 4.2, BALL_H = 9, DOOR_H = 2.5;
  const k = new Kit(WING_H, DOOR_H);
  const b = new Batch();
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pick = <X,>(a: X[]) => a[Math.floor(rnd() * a.length)];

  // ---------- חומרים ----------
  const mBallFloor = k.mat(k.tex("ph-mchk", () => P.marbleChecker("#eef0f2", "#4f78a3")), "#fff", [1, 1], { roughness: 0.16, bump: 0.12 });
  const mMedal = k.mat(k.tex("ph-medal", P.medallion), "#fff", [1, 1], { roughness: 0.16, bump: 0.1 });
  const mDamask = k.mat(k.tex("ph-damask", () => P.damask()), "#fff", [1, 1], { roughness: 0.75, bump: 0.3 });
  const mMarble = k.mat(k.tex("ph-marble", () => P.marble()), "#fff", [1, 1], { roughness: 0.2, bump: 0.1 });
  const mMarbleBlue = k.mat(k.tex("ph-marbleb", () => P.marble("#3f6b98", "#b7cde4", 8)), "#fff", [1, 1], { roughness: 0.2, bump: 0.1 });
  const mGold = k.mat(null, "#caa24c", [1, 1], { metalness: 0.9, roughness: 0.3 });
  const mChrome = k.mat(null, "#e3e7ec", [1, 1], { metalness: 1, roughness: 0.12 });
  const mTrim = k.mat(null, "#f3f5f7", [1, 1], { roughness: 0.4 });
  const mCorr = k.mat(k.tex("ph-corr", () => P.stripeWall("#d4e6f3", "#c4dbed")), "#fff", [1, 1], { roughness: 0.85, bump: 0.2 });
  const mRoomWall = k.mat(k.tex("ph-roomw", () => P.stripeWall("#eaf1f7", "#dfe9f2")), "#fff", [1, 1], { roughness: 0.85, bump: 0.2 });
  const mPengWall = k.mat(k.tex("penguinPattern", T.penguinPattern), "#fff", [1, 1], { roughness: 0.85, bump: 0.2 });
  const mRestWall = k.mat(k.tex("ph-restw", () => P.stripeWall("#f1e9da", "#e8dcc6")), "#fff", [1, 1], { roughness: 0.85, bump: 0.2 });
  const mShopWall = k.mat(k.tex("ph-shopw", () => P.stripeWall("#fde7ef", "#f7d9e5")), "#fff", [1, 1], { roughness: 0.85, bump: 0.2 });
  const mWainNavy = k.mat(k.tex("ph-wain", () => L.wainscot("#23406b")), "#fff", [1, 1], { roughness: 0.5, bump: 0.8 });
  const mBathWall = k.mat(k.tex("ph-btile", () => P.bathTile()), "#fff", [1, 1], { roughness: 0.06, bump: 0.35 });
  const mSpaWall = k.mat(k.tex("ph-stile", () => P.bathTile("#e6f2fb", "#2f6db0", 8)), "#fff", [1, 1], { roughness: 0.06, bump: 0.35 });
  const mMosaic = k.mat(k.tex("ph-mosaic", P.mosaic), "#fff", [1, 1], { roughness: 0.12, bump: 0.3 });
  const mCarpet = k.mat(k.tex("ph-carpet", () => P.carpet()), "#fff", [1, 1], { roughness: 1, bump: 0.45 });
  const mRoomCarpet = k.mat(k.tex("ph-rcarpet", () => P.plush("#8ea6c0", 9)), "#fff", [1, 1], { roughness: 1, bump: 0.5 });
  const mSuiteCarpet = k.mat(k.tex("ph-scarpet", () => P.plush("#c9d6e3", 4)), "#fff", [1, 1], { roughness: 1, bump: 0.5 });
  const mOak = k.mat(k.tex("ph-oak", () => L.oakPlanks("#9d7552", 7, 8)), "#fff", [1, 1], { roughness: 0.45, bump: 0.45 });
  const mCeil = k.mat(k.tex("ph-ceil", () => L.plaster("#f6f7f8", 3)), "#fff", [1, 1], { roughness: 0.95, bump: 0.12 });
  const mCeilBall = k.mat(k.tex("ph-ceilb", () => L.plaster("#eef3f8", 5)), "#fff", [1, 1], { roughness: 0.9, bump: 0.12 });
  const mWalnut = k.mat(k.tex("ph-walnut", () => T.wood("#5e3d24", "#3d2715", 6)), "#fff", [1, 1], { roughness: 0.5, bump: 0.6 });
  const mWhiteWood = k.mat(k.tex("ph-wwood", () => T.wood("#f1f1ee", "#dcdcd6", 3)), "#fff", [1, 1], { roughness: 0.45, bump: 0.3 });
  const mNavyVelvet = k.mat(k.tex("ph-vnavy", () => P.velvet("#1f3868", 2)), "#fff", [1, 1], { roughness: 0.95, bump: 0.3 });
  const mIceVelvet = k.mat(k.tex("ph-vice", () => P.velvet("#8cc2e6", 5)), "#fff", [1, 1], { roughness: 0.95, bump: 0.3 });
  const mCream = k.mat(k.tex("ph-cream", () => L.weave("#efe9dd", 6)), "#fff", [1, 1], { roughness: 0.95, bump: 0.3 });
  const mDuvet = k.mat(k.tex("ph-duvet", () => P.duvet()), "#fff", [1, 1], { roughness: 0.95, bump: 0.5 });
  const mThrow = k.mat(k.tex("ph-throw", () => P.throwBlanket()), "#fff", [1, 1], { roughness: 0.95, bump: 0.3 });
  const mPillow = k.mat(null, "#fbfbfd", [1, 1], { roughness: 0.95 });
  const mCloth = k.mat(k.tex("ph-cloth", () => L.weave("#fafafa", 2)), "#fff", [1, 1], { roughness: 0.9, bump: 0.2 });
  const mPorcelain = k.mat(null, "#fbfcfd", [1, 1], { roughness: 0.08 });
  const mWater = k.mat(null, "#9fd8f2", [1, 1], { roughness: 0.03, metalness: 0.1, emissive: "#3a8fc0", emissiveIntensity: 0.15 });
  const mMirror = k.mat(null, "#eef3f7", [1, 1], { metalness: 1, roughness: 0.03 });
  const mGlow = k.mat(null, "#fff5e0", [1, 1], { emissive: "#ffe0a8", emissiveIntensity: 2.2 });
  const mShade = k.mat(k.tex("ph-shade", () => L.weave("#f3ead8", 8)), "#fff", [1, 1], { emissive: "#ffcf8a", emissiveIntensity: 0.4, bump: 0.2 });
  const mView = k.mat(k.tex("ph-view", P.winterView), "#fff", [1, 1], { emissive: "#ffffff", emissiveIntensity: 0.95, bump: 0 });
  const mGlass = k.mat(null, "#dff1ff", [1, 1], { transparent: true, roughness: 0.05, emissive: "#d8ecff", emissiveIntensity: 0.9 });
  const mBlack = k.mat(null, "#15171b", [1, 1], { roughness: 0.18, metalness: 0.2 });
  const mLeaf = k.mat(null, "#ffffff", [1, 1], { roughness: 0.6 });
  const mFir = k.mat(k.tex("leaves", T.leaves), "#7fa88a", [2, 2], { roughness: 0.9, bump: 0.6 });
  const mSoil = k.mat(k.tex("ph-soil", () => T.noise("#3a2a1e", 0.2, 5, 2000)), "#fff", [1, 1], { bump: 0.6 });
  const mGlossyInst = k.mat(null, "#ffffff", [1, 1], { roughness: 0.14 });
  const mPlushInst = k.mat(k.tex("ph-plushfab", () => P.plush("#ffffff", 3)), "#fff", [1, 1], { roughness: 1, bump: 0.35 });
  const mFoilInst = k.mat(null, "#ffffff", [1, 1], { metalness: 0.85, roughness: 0.2 });
  const mString = k.mat(null, "#f2f2f2", [1, 1], { roughness: 0.6 });
  const mSuitcase = [k.mat(null, "#c0392b", [1, 1], { roughness: 0.3 }), k.mat(null, "#2e86c1", [1, 1], { roughness: 0.3 }), k.mat(null, "#f4d03f", [1, 1], { roughness: 0.3 }), k.mat(null, "#5d6d7e", [1, 1], { roughness: 0.3 })];

  const glossy = new Spheres(); // בלונים, ברווזים, פסלי קרמיקה, קישוטי עץ
  const plush = new Spheres(); // בובות פינגווין
  const foil = new Spheres(); // בלוני נייר כסף
  const strings: Inst[] = [];
  const leaves: Inst[] = [];

  // ---------- חלקי דמויות ----------
  type Part = [number, number, number, number, number, number, number, string, number];
  const penguinParts = (D: string, W = "#f7f5ef", O = "#f2a33a", K = "#101114"): Part[] => [
    [0, 0.42, 0, 0.34, 0.42, 0.3, 0, D, 1],
    [0, 0.4, 0.1, 0.27, 0.33, 0.22, 0, W, 1],
    [0, 0.84, 0.02, 0.23, 0.21, 0.22, 0, D, 1],
    [0, 0.82, 0.12, 0.15, 0.12, 0.12, 0, W, 0],
    [-0.075, 0.87, 0.215, 0.028, 0.034, 0.02, 0, K, 0],
    [0.075, 0.87, 0.215, 0.028, 0.034, 0.02, 0, K, 0],
    [0, 0.8, 0.25, 0.05, 0.035, 0.085, 0, O, 0],
    [-0.3, 0.5, 0, 0.07, 0.24, 0.14, -0.42, D, 0],
    [0.3, 0.5, 0, 0.07, 0.24, 0.14, 0.42, D, 0],
    [-0.11, 0.03, 0.14, 0.1, 0.04, 0.13, 0, O, 0],
    [0.11, 0.03, 0.14, 0.1, 0.04, 0.13, 0, O, 0],
  ];
  const plushCols = ["#1f2d44", "#18191d", "#6c7886", "#86b9de", "#2b4f86", "#1f2d44"];
  /** בובת פינגווין; s = גובה במטרים בערך */
  const plushie = (x: number, y: number, z: number, s: number, ry = rnd() * 6.28, col = pick(plushCols), solid = s >= 0.45) => {
    plush.add(x, y, z, ry, s, penguinParts(col));
    if (solid) k.collider(x - 0.3 * s, x + 0.3 * s, z - 0.3 * s, z + 0.3 * s, y, y + s * 0.95, true);
  };
  /** פסל פינגווין מקרמיקה מבריקה */
  const ceramic = (x: number, y: number, z: number, s: number, ry = 0, style = 0) => {
    const D = ["#1d4f9c", "#f5f6f7", "#233a5e", "#7fb3dd"][style % 4];
    const W = style % 4 === 1 ? "#1d4f9c" : "#fbfbfb";
    glossy.add(x, y, z, ry, s, penguinParts(D, W, "#e8b64a", "#0b0c10"));
  };
  const duckParts: Part[] = [
    [0, 0.045, 0, 0.075, 0.045, 0.058, 0, "#ffd21f", 1],
    [0, 0.07, -0.06, 0.03, 0.03, 0.028, 0.5, "#ffd21f", 0],
    [0, 0.11, 0.035, 0.04, 0.04, 0.04, 0, "#ffd21f", 1],
    [0, 0.104, 0.077, 0.026, 0.011, 0.024, 0, "#f47c20", 0],
    [-0.02, 0.123, 0.067, 0.007, 0.008, 0.006, 0, "#111111", 0],
    [0.02, 0.123, 0.067, 0.007, 0.008, 0.006, 0, "#111111", 0],
  ];
  /** ברווז גומי; s = קנה מידה (1 = 12 ס"מ) */
  const duck = (x: number, y: number, z: number, s = 1, ry = rnd() * 6.28) => glossy.add(x, y, z, ry, s, duckParts);
  const balloonCols = ["#e63946", "#3a86ff", "#ffbe0b", "#8ecae6", "#ffffff", "#ff70a6", "#1d4f9c", "#70e000", "#9b5de5"];
  /** בלון על חוט; anchor = נקודת הקשירה */
  const balloon = (x: number, y: number, z: number, anchor: V3t | null, col = pick(balloonCols), isFoil = false, s = 1) => {
    const parts: Part[] = [
      [0, 0, 0, 0.24, 0.28, 0.24, 0, col, 1],
      [0, -0.29, 0, 0.03, 0.035, 0.03, 0, col, 0],
    ];
    (isFoil ? foil : glossy).add(x, y, z, 0, s, parts);
    const top: V3t = [x, y - 0.31 * s, z];
    const bot: V3t = anchor ?? [x + (rnd() - 0.5) * 0.2, y - 0.31 * s - 0.9, z + (rnd() - 0.5) * 0.2];
    const d = new V3(bot[0] - top[0], bot[1] - top[1], bot[2] - top[2]);
    const len = d.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), d.normalize());
    const e = new THREE.Euler().setFromQuaternion(q, "XYZ");
    strings.push({ pos: [(top[0] + bot[0]) / 2, (top[1] + bot[1]) / 2, (top[2] + bot[2]) / 2], rotX: e.x, rotY: e.y, rotZ: e.z, scale: [1, len, 1] });
  };
  /** צרור בלונים קשור לנקודה */
  const bunch = (x: number, y: number, z: number, n = 5, h = 1.7) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd();
      const rr = 0.15 + rnd() * 0.25;
      balloon(x + Math.cos(a) * rr, y + h + rnd() * 0.5, z + Math.sin(a) * rr, [x, y, z], undefined, rnd() < 0.2);
    }
    glossy.add(x, y + 0.03, z, 0, 1, [[0, 0, 0, 0.05, 0.03, 0.05, 0, "#c0c4c8", 0]]);
  };

  // ---------- קירות ----------
  type Op = [number, number, number?, number?];
  /** קיר לאורך ציר: axis x = קיר שמשתרע לאורך x ב־z=c. ops = פתחים [מרכז, רוחב, תחתית, עליון] */
  const wallRun = (axis: "x" | "z", c: number, a1: number, a2: number, h: number, ops: Op[], mat: Mat, unit: number, thick = 0.3, off = 0, solid = true) => {
    const pieces: [number, number, number, number][] = [];
    let cur = a1;
    for (const [oc, ow, oy0 = 0, oy1 = DOOR_H] of [...ops].sort((p, q) => p[0] - q[0])) {
      const s = Math.max(a1, oc - ow / 2), e = Math.min(a2, oc + ow / 2);
      if (e <= a1 || s >= a2) continue;
      if (s > cur + 0.01) pieces.push([cur, s, 0, h]);
      if (oy0 > 0.01) pieces.push([s, e, 0, oy0]);
      if (h - oy1 > 0.01) pieces.push([s, e, oy1, h]);
      cur = e;
    }
    if (a2 > cur + 0.01) pieces.push([cur, a2, 0, h]);
    for (const [p1, p2, y0, y1] of pieces) {
      const len = p2 - p1, mid = (p1 + p2) / 2, hh = y1 - y0;
      const geo = axis === "x" ? new THREE.BoxGeometry(len, hh, thick) : new THREE.BoxGeometry(thick, hh, len);
      const [x, z] = axis === "x" ? [mid, c + off] : [c + off, mid];
      b.add(mat, place(geo, x, y0 + hh / 2, z), unit);
      if (solid) {
        if (axis === "x") k.collider(p1, p2, c - thick / 2, c + thick / 2, y0, y1, false);
        else k.collider(c - thick / 2, c + thick / 2, p1, p2, y0, y1, false);
      }
    }
  };
  /** ציפוי דק על צד אחד של קיר (טפט/אריחים שונים לכל חדר) */
  const skin = (axis: "x" | "z", c: number, a1: number, a2: number, h: number, ops: Op[], mat: Mat, unit: number, side: number) =>
    wallRun(axis, c, a1, a2, h, ops, mat, unit, 0.02, side * 0.16, false);
  /** פס (חיפוי, פנל, כרכוב) לאורך קיר, בצד אחד, עם דילוג על פתחים */
  const band = (axis: "x" | "z", c: number, a1: number, a2: number, y0: number, y1: number, ops: Op[], mat: Mat, depth: number, side: number, unit?: number) => {
    let cur = a1;
    const segs: [number, number][] = [];
    for (const [oc, ow, oy0 = 0, oy1 = DOOR_H] of [...ops].sort((p, q) => p[0] - q[0])) {
      if (oy1 <= y0 || oy0 >= y1) continue;
      const s = oc - ow / 2 - 0.08, e = oc + ow / 2 + 0.08;
      if (e <= a1 || s >= a2) continue;
      if (s > cur) segs.push([cur, s]);
      cur = Math.max(cur, e);
    }
    if (a2 > cur) segs.push([cur, a2]);
    for (const [p1, p2] of segs) {
      const len = p2 - p1, mid = (p1 + p2) / 2, hh = y1 - y0;
      const off = c + side * (0.15 + depth / 2);
      const geo = axis === "x" ? new THREE.BoxGeometry(len, hh, depth) : new THREE.BoxGeometry(depth, hh, len);
      b.add(mat, place(geo, axis === "x" ? mid : off, y0 + hh / 2, axis === "x" ? off : mid), unit);
    }
  };
  /** משקוף סביב פתח (שני הצדדים) */
  const casing = (axis: "x" | "z", c: number, oc: number, ow: number, mat: Mat, top = DOOR_H) => {
    const d = 0.38;
    for (const s of [-1, 1]) {
      const a = oc + s * (ow / 2 + 0.05);
      b.add(mat, axis === "x" ? place(new THREE.BoxGeometry(0.1, top, d), a, top / 2, c) : place(new THREE.BoxGeometry(d, top, 0.1), c, top / 2, a));
    }
    b.add(mat, axis === "x" ? place(new THREE.BoxGeometry(ow + 0.2, 0.12, d), oc, top + 0.06, c) : place(new THREE.BoxGeometry(d, 0.12, ow + 0.2), c, top + 0.06, oc));
  };
  /** חלון בקיר חיצוני: מסגרת, אדן, זכוכית ונוף שלג מאחור */
  const windowAt = (axis: "x" | "z", c: number, oc: number, ow: number, y0: number, y1: number, side: number, curtains: Mat | null) => {
    const outer = c - side * 0.35;
    const hh = y1 - y0;
    if (axis === "z") k.add(new THREE.PlaneGeometry(ow + 0.4, hh + 0.4), mView, [outer, (y0 + y1) / 2, oc], { rotY: side > 0 ? Math.PI / 2 : -Math.PI / 2, noShadow: true });
    else k.add(new THREE.PlaneGeometry(ow + 0.4, hh + 0.4), mView, [oc, (y0 + y1) / 2, outer], { rotY: side > 0 ? 0 : Math.PI, noShadow: true });
    const fr = (w: number, h: number, d: number, a: number, y: number, o: number) =>
      b.add(mTrim, axis === "z" ? place(new THREE.BoxGeometry(d, h, w), c + side * o, y, a) : place(new THREE.BoxGeometry(w, h, d), a, y, c + side * o));
    fr(ow + 0.3, 0.07, 0.42, oc, y0 - 0.035, 0.08);
    fr(ow + 0.3, 0.12, 0.34, oc, y1 + 0.06, 0);
    for (const s of [-1, 1]) fr(0.12, hh, 0.34, oc + s * (ow / 2 + 0.06), (y0 + y1) / 2, 0);
    fr(0.06, hh, 0.06, oc, (y0 + y1) / 2, 0);
    for (let y = y0 + hh / 3; y < y1 - 0.1; y += hh / 3) fr(ow, 0.05, 0.06, oc, y, 0);
    if (curtains) {
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
        const a = oc + s * (ow / 2 + 0.22 + i * 0.13);
        const g = new THREE.CylinderGeometry(0.075, 0.085, y1 + 0.35, 10, 1, false, 0, Math.PI);
        b.add(curtains, axis === "z" ? place(g, c + side * 0.3, (y1 + 0.35) / 2, a, 0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0) : place(g, a, (y1 + 0.35) / 2, c + side * 0.3, 0, side > 0 ? Math.PI : 0, 0), 1);
      }
      b.add(mGold, axis === "z" ? place(new THREE.CylinderGeometry(0.02, 0.02, ow + 1.2, 8), c + side * 0.3, y1 + 0.38, oc, Math.PI / 2, 0, 0) : place(new THREE.CylinderGeometry(0.02, 0.02, ow + 1.2, 8), oc, y1 + 0.38, c + side * 0.3, 0, 0, Math.PI / 2));
    }
  };

  // ---- תוכנית ----
  // אולם: x -11..11, z -7..17 (גובה 9). מסדרונות: x ±(11..13.4). חדרים: x ±(13.4..22). מסעדה: x -11..11, z -17..-7.
  const WX = [-22, -13.4, -11], EX = [22, 13.4, 11];
  const dZ = { r1: -10.5, r2: -5.5, r3: 1.5, r4: 9.5 };
  const eDoor = { r1: -15, r2: -5.5, r3: -0.2, r4: 8.1 };
  const corrOpsW: Op[] = [[dZ.r1, 1.3], [dZ.r2, 1.3], [dZ.r3, 1.3], [dZ.r4, 1.3]];
  const corrOpsE: Op[] = [[eDoor.r1, 1.3], [eDoor.r2, 1.3], [eDoor.r3, 1.3], [eDoor.r4, 1.3]];
  const ballOpsSide: Op[] = [[0, 2.2], [10.5, 2.2]];
  const restOpsSide: Op[] = [[-12, 1.6]];
  const northOps: Op[] = [[-3.5, 2.4], [3.5, 2.4]];
  const entrance: Op = [0, 3.2, 0, 3.4];
  const southBallOps: Op[] = [entrance, [-6.5, 2.4, 1.0, 6.6], [6.5, 2.4, 1.0, 6.6]];
  const winW = (z: number): Op => [z, 1.8, 0.9, 2.6];
  const westWinOps: Op[] = [winW(-13.5), [-5.5, 1.0, 1.5, 2.4], winW(2), winW(12.5)];
  const eastWinOps: Op[] = [winW(-12), [-5.5, 1.0, 1.5, 2.4], winW(2), winW(11)];
  const restWinOps: Op[] = [[-7, 2.2, 0.9, 3.0], [0, 2.2, 0.9, 3.0], [7, 2.2, 0.9, 3.0]];
  const southWingW: Op[] = [[-17.7, 1.8, 0.9, 2.6]];
  const southWingE: Op[] = [[17.7, 1.8, 0.9, 2.6]];

  // קירות חיצוניים
  wallRun("x", -17, -22.15, 22.15, WING_H, restWinOps, mCorr, 1.3);
  wallRun("x", 17, -11, 11, BALL_H, southBallOps, mDamask, 1.1);
  wallRun("x", 17, -22.15, -11, WING_H, southWingW, mCorr, 1.3);
  wallRun("x", 17, 11, 22.15, WING_H, southWingE, mCorr, 1.3);
  wallRun("z", -22, -17, 17, WING_H, westWinOps, mCorr, 1.3);
  wallRun("z", 22, -17, 17, WING_H, eastWinOps, mCorr, 1.3);
  // קירות האולם
  for (const sx of [-1, 1]) {
    wallRun("z", sx * 11, -7, 17, BALL_H, ballOpsSide, mDamask, 1.1);
    wallRun("z", sx * 11, -17, -7, WING_H, restOpsSide, mCorr, 1.3);
    wallRun("z", sx * 13.4, -17, 17, WING_H, sx < 0 ? corrOpsW : corrOpsE, mCorr, 1.3);
    // מחיצות בין החדרים
    for (const z of [-8.5, -2.5, 6.5]) wallRun("x", z, sx < 0 ? -22 : 13.4, sx < 0 ? -13.4 : 22, WING_H, [], mRoomWall, 1.3);
  }
  wallRun("x", -7, -11, 11, BALL_H, northOps, mDamask, 1.1);
  // ציפוי המסעדה בצד הצפוני של קיר האולם ובצדדים
  skin("x", -7, -10.85, 10.85, WING_H, northOps, mRestWall, 1.3, -1);
  for (const sx of [-1, 1]) skin("z", sx * 11, -16.85, -7.15, WING_H, restOpsSide, mRestWall, 1.3, -sx);
  skin("x", -17, -10.85, 10.85, WING_H, restWinOps, mRestWall, 1.3, 1);

  // ---- חדרים בכנפיים ----
  type RoomDef = { name: string; side: number; z1: number; z2: number; wall: Mat; floor: Mat; floorUnit: number; kind: "bed" | "twin" | "bath" | "spa" | "shop" | "suite" };
  const roomsDef: RoomDef[] = [
    { name: "Bedroom 101", side: -1, z1: -17, z2: -8.5, wall: mRoomWall, floor: mRoomCarpet, floorUnit: 1.5, kind: "bed" },
    { name: "Bathroom 102", side: -1, z1: -8.5, z2: -2.5, wall: mBathWall, floor: mMosaic, floorUnit: 0.9, kind: "bath" },
    { name: "Bedroom 103", side: -1, z1: -2.5, z2: 6.5, wall: mPengWall, floor: mRoomCarpet, floorUnit: 1.5, kind: "bed" },
    { name: "Twin Room 104", side: -1, z1: 6.5, z2: 17, wall: mRoomWall, floor: mSuiteCarpet, floorUnit: 1.5, kind: "twin" },
    { name: "Penguin Suite", side: 1, z1: -17, z2: -8.5, wall: mPengWall, floor: mSuiteCarpet, floorUnit: 1.5, kind: "suite" },
    { name: "Spa Bathroom", side: 1, z1: -8.5, z2: -2.5, wall: mSpaWall, floor: mMosaic, floorUnit: 0.9, kind: "spa" },
    { name: "Gift Shop", side: 1, z1: -2.5, z2: 6.5, wall: mShopWall, floor: mOak, floorUnit: 1.6, kind: "shop" },
    { name: "Bedroom 105", side: 1, z1: 6.5, z2: 17, wall: mRoomWall, floor: mRoomCarpet, floorUnit: 1.5, kind: "bed" },
  ];
  const corrOf = (side: number) => (side < 0 ? corrOpsW : corrOpsE);
  const winOf = (side: number) => (side < 0 ? westWinOps : eastWinOps);
  for (const r of roomsDef) {
    const xo = r.side * 22, xi = r.side * 13.4; // קיר חיצוני / קיר מסדרון
    const x1 = Math.min(xo, xi) + 0.15, x2 = Math.max(xo, xi) - 0.15;
    const z1 = r.z1 + (r.z1 === -17 ? 0.15 : 0.15), z2 = r.z2 - 0.15;
    const unit = r.wall === mBathWall || r.wall === mSpaWall ? 1.2 : r.wall === mPengWall ? 1.0 : 1.3;
    const bath = r.kind === "bath" || r.kind === "spa";
    // ציפוי 4 הקירות
    skin("z", xo, z1, z2, WING_H, winOf(r.side), r.wall, unit, -r.side);
    skin("z", xi, z1, z2, WING_H, corrOf(r.side), r.wall, unit, r.side);
    skin("x", r.z1, x1, x2, WING_H, r.z1 === -17 ? [] : [], r.wall, unit, 1);
    skin("x", r.z2, x1, x2, WING_H, r.z2 === 17 ? (r.side < 0 ? southWingW : southWingE) : [], r.wall, unit, -1);
    b.add(r.floor, place(new THREE.BoxGeometry(x2 - x1, 0.1, z2 - z1), (x1 + x2) / 2, -0.05, (z1 + z2) / 2), r.floorUnit);
    b.add(mCeil, place(new THREE.BoxGeometry(x2 - x1 + 0.3, 0.2, z2 - z1 + 0.3), (x1 + x2) / 2, WING_H + 0.1, (z1 + z2) / 2), 3);
    k.room(r.name, x1, x2, z1, z2);
    // פנלים ופס עליון (לא בחדרי רחצה)
    if (!bath) {
      band("z", xo, z1, z2, 0, 0.14, winOf(r.side), mTrim, 0.03, -r.side);
      band("z", xi, z1, z2, 0, 0.14, corrOf(r.side), mTrim, 0.03, r.side);
      band("x", r.z1, x1, x2, 0, 0.14, [], mTrim, 0.03, 1);
      band("x", r.z2, x1, x2, 0, 0.14, r.z2 === 17 ? (r.side < 0 ? southWingW : southWingE) : [], mTrim, 0.03, -1);
      for (const [ax, c, s] of [["z", xo, -r.side], ["z", xi, r.side], ["x", r.z1, 1], ["x", r.z2, -1]] as const) {
        const a1 = ax === "z" ? z1 : x1, a2 = ax === "z" ? z2 : x2;
        b.add(mTrim, ax === "z" ? place(new THREE.BoxGeometry(0.1, 0.12, a2 - a1), c + s * 0.2, WING_H - 0.06, (a1 + a2) / 2) : place(new THREE.BoxGeometry(a2 - a1, 0.12, 0.1), (a1 + a2) / 2, WING_H - 0.06, c + s * 0.2));
      }
    }
    // חלונות
    for (const op of winOf(r.side)) if (op[0] > z1 && op[0] < z2) windowAt("z", xo, op[0], op[1], op[2]!, op[3]!, -r.side, bath ? null : r.kind === "shop" ? mShade : mCream);
    if (r.z2 === 17) { const op = (r.side < 0 ? southWingW : southWingE)[0]; windowAt("x", 17, op[0], op[1], op[2]!, op[3]!, -1, mCream); }
  }

  // ---- מסדרונות ----
  for (const sx of [-1, 1]) {
    const x1 = Math.min(sx * 11, sx * 13.4) + 0.15, x2 = Math.max(sx * 11, sx * 13.4) - 0.15;
    const cx = (x1 + x2) / 2;
    b.add(mCarpet, place(new THREE.BoxGeometry(x2 - x1, 0.1, 33.7), cx, -0.05, 0), 1.0);
    b.add(mCeil, place(new THREE.BoxGeometry(x2 - x1 + 0.3, 0.2, 34), cx, WING_H + 0.1, 0), 3);
    k.room(sx < 0 ? "West Hallway" : "East Hallway", x1, x2, -16.85, 16.85);
    const cOps = corrOf(sx);
    const bOps: Op[] = [...ballOpsSide, ...restOpsSide];
    // חיפוי נייבי תחתון, פסים, פנלים
    band("z", sx * 13.4, -16.85, 16.85, 0, 1.0, cOps, mWainNavy, 0.03, -sx, 1);
    band("z", sx * 11, -16.85, 16.85, 0, 1.0, bOps, mWainNavy, 0.03, sx, 1);
    for (const [c, s, ops] of [[sx * 13.4, -sx, cOps], [sx * 11, sx, bOps]] as const) {
      band("z", c, -16.85, 16.85, 0.98, 1.05, ops, mTrim, 0.06, s);
      band("z", c, -16.85, 16.85, 0, 0.14, ops, mTrim, 0.05, s);
      band("z", c, -16.85, 16.85, WING_H - 0.14, WING_H, [], mTrim, 0.1, s);
    }
    for (const [zc, w] of cOps) {
      casing("z", sx * 13.4, zc, w, mWhiteWood);
      // שלט מספר החדר
      const num = roomsDef.find((r) => r.side === sx && zc > r.z1 && zc < r.z2)!;
      const label = num.name.replace(/[^0-9]/g, "") || (num.kind === "suite" ? "SUITE" : num.kind === "spa" ? "SPA" : "SHOP");
      k.add(new THREE.BoxGeometry(0.34, 0.14, 0.012), k.mat(P.sign(label, 256, 96), "#fff", [1, 1], { roughness: 0.4, metalness: 0.3, bump: 0 }), [sx * 13.4 - sx * 0.165, 1.65, zc + (w / 2 + 0.35)], { rotY: sx < 0 ? Math.PI / 2 : -Math.PI / 2, noShadow: true });
      // דלת פתוחה לתוך החדר
      const hx = sx * 13.4 + sx * 0.18;
      b.add(mWhiteWood, place(boxGeo(0.05, DOOR_H - 0.03, w - 0.06), hx + sx * 0.02, (DOOR_H - 0.03) / 2, zc, 0, 0, 0), 1);
      void hx;
    }
    for (const [zc, w] of bOps) casing("z", sx * 11, zc, w, mWhiteWood);
    // מנורות קיר
    for (let z = -14; z <= 15; z += 4.3) {
      const wx = sx * 13.4 - sx * 0.2;
      b.add(mGold, place(new THREE.CylinderGeometry(0.05, 0.05, 0.22, 12), wx, 2.2, z, 0, 0, Math.PI / 2));
      b.add(mShade, place(lathe([[0.14, 0], [0.09, 0.2]], 20), wx - sx * 0.06, 2.25, z));
      b.add(mGlow, place(new THREE.SphereGeometry(0.04, 8, 6), wx - sx * 0.06, 2.32, z));
    }
    // שולחנות קונסולה עם פסלי קרמיקה ובובות
    for (const z of [-7.8, 4.8, 14.2]) {
      const tx = sx * 11 + sx * 0.38;
      b.add(mWhiteWood, place(boxGeo(0.4, 0.05, 1.1), tx, 0.8, z), 1);
      for (const dz of [-0.48, 0.48]) b.add(mGold, place(new THREE.CylinderGeometry(0.02, 0.015, 0.78, 8), tx, 0.39, z + dz));
      k.collider(tx - 0.2, tx + 0.2, z - 0.55, z + 0.55, 0, 0.83, true);
      ceramic(tx, 0.83, z - 0.2, 0.5, sx < 0 ? Math.PI / 2 : -Math.PI / 2, Math.floor(rnd() * 4));
      duck(tx, 0.83, z + 0.3, 1.3, sx < 0 ? Math.PI / 2 : -Math.PI / 2);
    }
    // עגלת שירות / צמח / בובה גדולה
    plushie(sx * 13.4 - sx * 0.45, 0, -1.6, 0.7, sx < 0 ? Math.PI / 2 : -Math.PI / 2);
    bunch(sx * 13.4 - sx * 0.4, 0, -2.4, 4, 1.4);
    plantPot(sx * 13.4 - sx * 0.45, 12.2, 0.9);
    plantPot(sx * 13.4 - sx * 0.45, -16.2, 0.9);
  }

  // ---------- צמח בעציץ ----------
  function plantPot(x: number, z: number, s = 1) {
    const pr = 0.26 * s, ph = 0.5 * s;
    b.add(mPorcelain, place(lathe([[0, 0], [pr * 0.75, 0], [pr, ph * 0.85], [pr * 1.06, ph], [pr * 0.95, ph]]), x, 0, z));
    b.add(mSoil, place(new THREE.CircleGeometry(pr * 0.94, 18), x, ph * 0.95, z, -Math.PI / 2, 0, 0));
    k.collider(x - pr, x + pr, z - pr, z + pr, 0, ph, true);
    const cols = ["#2f6b2f", "#3d7f36", "#27572a", "#4b8d3e"];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + rnd() * 0.3;
      const L2 = (0.45 + rnd() * 0.25) * s;
      leaves.push({ pos: [x + Math.cos(a) * L2 * 0.45, ph + L2 * 0.45 + rnd() * 0.25 * s, z + Math.sin(a) * L2 * 0.45], rotY: -a, rotZ: 0.6 + rnd() * 0.5, scale: [L2 * 0.5, 0.012, 0.08 * s], color: pick(cols) });
    }
  }

  // ---------- אולם הנשפים ----------
  k.room("Entrance", -10.85, 10.85, 11.5, 16.85);
  k.room("Grand Ballroom", -10.85, 10.85, -6.85, 11.5);
  k.room("Restaurant", -10.85, 10.85, -16.85, -7.15);
  // רצפה + מדליון מתחת לפסל
  const SX = 0, SZ = 3.5;
  b.add(mBallFloor, place(new THREE.BoxGeometry(21.7, 0.1, 23.7), 0, -0.05, 5), 1.2);
  k.add(new THREE.CircleGeometry(3.9, 64), mMedal, [SX, 0.004, SZ], { rotX: -Math.PI / 2, noShadow: true });
  // שטיח כניסה כחול
  k.add(new THREE.BoxGeometry(2.2, 0.014, 9.2), k.fit(mCarpet, 2.2, 9.2, 1.0), [0, 0.007, 12.2], { noShadow: true });
  // תקרה עם פתח לכיפה
  const hole = { x1: -4, x2: 4, z1: -0.5, z2: 7.5 };
  const cy = BALL_H;
  b.add(mCeilBall, place(new THREE.BoxGeometry(22.3, 0.3, hole.z1 + 7.15), 0, cy + 0.15, (-7.15 + hole.z1) / 2), 3);
  b.add(mCeilBall, place(new THREE.BoxGeometry(22.3, 0.3, 17.15 - hole.z2), 0, cy + 0.15, (17.15 + hole.z2) / 2), 3);
  b.add(mCeilBall, place(new THREE.BoxGeometry(hole.x1 + 11.15, 0.3, hole.z2 - hole.z1), (-11.15 + hole.x1) / 2, cy + 0.15, (hole.z1 + hole.z2) / 2), 3);
  b.add(mCeilBall, place(new THREE.BoxGeometry(11.15 - hole.x2, 0.3, hole.z2 - hole.z1), (11.15 + hole.x2) / 2, cy + 0.15, (hole.z1 + hole.z2) / 2), 3);
  // קורות תקרה מקורות (קסטות)
  for (const x of [-8, -4, 4, 8]) b.add(mCeilBall, place(new THREE.BoxGeometry(0.35, 0.45, 23.7), x, cy - 0.22, 5), 3);
  for (const z of [-3.5, -0.5, 7.5, 11.5, 14.5]) b.add(mCeilBall, place(new THREE.BoxGeometry(21.7, 0.45, 0.35), 0, cy - 0.22, z), 3);
  // כיפת זכוכית + צלעות
  const domeR = 4.2;
  k.add(new THREE.SphereGeometry(domeR, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), mGlass, [SX, cy + 0.3, SZ], { noShadow: true, scale: [1, 0.55, 1] });
  b.add(mTrim, place(new THREE.CylinderGeometry(domeR + 0.1, domeR + 0.1, 0.35, 40, 1, true), SX, cy + 0.45, SZ));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const pts: V3t[] = [];
    for (let t = 0; t <= 8; t++) {
      const th = (t / 8) * (Math.PI / 2);
      pts.push([SX + Math.cos(a) * Math.cos(th) * domeR, cy + 0.3 + Math.sin(th) * domeR * 0.55 - 0.02, SZ + Math.sin(a) * Math.cos(th) * domeR]);
    }
    k.tube(pts, 0.05, mTrim);
  }
  // שוליים לפתח הכיפה (מרובע→עיגול)
  b.add(mCeilBall, place(new THREE.BoxGeometry(hole.x2 - hole.x1, 0.3, 0.3), SX, cy + 0.15, hole.z1 + 0.15), 3);
  // חיפוי שיש, פנלים וכרכוב זהוב על קירות האולם
  const ballWalls: ["x" | "z", number, number, number, number, Op[]][] = [
    ["z", -11, -6.85, 16.85, 1, ballOpsSide], ["z", 11, -6.85, 16.85, -1, ballOpsSide],
    ["x", -7, -10.85, 10.85, 1, northOps], ["x", 17, -10.85, 10.85, -1, southBallOps],
  ];
  for (const [ax, c, a1, a2, s, ops] of ballWalls) {
    band(ax, c, a1, a2, 0, 1.25, ops, mMarble, 0.04, s, 1.5);
    band(ax, c, a1, a2, 1.25, 1.33, ops, mGold, 0.07, s);
    band(ax, c, a1, a2, 0, 0.16, ops, mMarbleBlue, 0.07, s, 1);
    band(ax, c, a1, a2, 4.3, 4.45, [], mGold, 0.06, s);
    band(ax, c, a1, a2, BALL_H - 0.35, BALL_H, [], mTrim, 0.2, s);
    band(ax, c, a1, a2, BALL_H - 0.5, BALL_H - 0.35, [], mGold, 0.1, s);
    for (const op of ops) if (op[2] === undefined || op[2] === 0) casing(ax, c, op[0], op[1], mMarble, op[3] ?? DOOR_H);
  }
  // חלונות גבוהים ודלתות זכוכית בכניסה
  for (const s of [-1, 1]) windowAt("x", 17, s * 6.5, 2.4, 1.0, 6.6, -1, mNavyVelvet);
  {
    const [, ew, , eh] = entrance;
    k.add(new THREE.PlaneGeometry(ew + 0.6, (eh ?? 3.4) + 0.4), mView, [0, (eh ?? 3.4) / 2, 17.35], { rotY: Math.PI, noShadow: true });
    for (const s of [-1, 1]) {
      // כנפי דלת זכוכית במסגרת זהב
      b.add(mGold, place(new THREE.BoxGeometry(0.08, 3.2, 0.1), s * 1.55, 1.6, 16.95));
      b.add(mGold, place(new THREE.BoxGeometry(0.06, 3.2, 0.1), s * 0.04, 1.6, 16.95));
      b.add(mGold, place(new THREE.BoxGeometry(1.5, 0.12, 0.1), s * 0.8, 0.06, 16.95));
      b.add(mGold, place(new THREE.BoxGeometry(1.5, 0.08, 0.1), s * 0.8, 3.2, 16.95));
      b.add(mGold, place(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 8), s * 0.22, 1.2, 16.85));
    }
    b.add(mGold, place(new THREE.BoxGeometry(3.4, 0.2, 0.2), 0, 3.4, 16.95));
    k.add(new THREE.BoxGeometry(3.6, 0.5, 0.05), k.mat(P.sign("PENGUIN HOTEL", 512, 96), "#fff", [1, 1], { roughness: 0.35, metalness: 0.4, bump: 0 }), [0, 4.05, 16.82], { rotY: Math.PI, noShadow: true });
    k.add(new THREE.BoxGeometry(2.4, 0.02, 1.2), k.mat(k.tex("ph-mat", () => P.plush("#20344f", 12)), "#fff", [2, 1], { roughness: 1, bump: 0.6 }), [0, 0.01, 16.1], { noShadow: true });
  }

  // ---------- פסל הפינגווין הענק ----------
  {
    const y0 = 0.62, S = 4.8;
    k.lathe([[0, 0], [2.55, 0], [2.55, 0.1], [2.42, 0.16], [2.42, 0.48], [2.55, 0.54], [2.55, y0], [0, y0]], SX, 0, SZ, mMarble, { seg: 64 });
    b.add(mGold, place(new THREE.TorusGeometry(2.43, 0.035, 8, 64), SX, 0.32, SZ, Math.PI / 2, 0, 0));
    for (let i = -3; i <= 3; i++) {
      const w = 2.55 * 2 / 7, za = SZ + (i - 0.5) * w, zb = SZ + (i + 0.5) * w;
      const zz = Math.max(Math.abs(za - SZ), Math.abs(zb - SZ));
      const hw = Math.sqrt(Math.max(0, 2.55 * 2.55 - zz * zz)) + (i === 0 ? 0 : 0.18);
      k.collider(SX - hw, SX + hw, za, zb, 0, y0, true);
    }
    const blk = k.mat(null, "#15181f", [1, 1], { roughness: 0.22, metalness: 0.05 });
    const wht = k.mat(null, "#f6f6f2", [1, 1], { roughness: 0.25 });
    const org = k.mat(null, "#f0a32a", [1, 1], { roughness: 0.3, metalness: 0.2 });
    const yel = k.mat(null, "#f7c948", [1, 1], { roughness: 0.3 });
    const red = k.mat(null, "#c62828", [1, 1], { roughness: 0.35 });
    const sph = (m: Mat, ox: number, oy: number, oz: number, sx: number, sy: number, sz: number, rz = 0, rx = 0) =>
      k.add(statueSph, m, [SX + ox * S, y0 + oy * S, SZ + oz * S], { scale: [sx * S, sy * S, sz * S], rotZ: rz, rotX: rx });
    sph(blk, 0, 0.42, 0, 0.34, 0.42, 0.3, 0, -0.06);
    sph(wht, 0, 0.4, 0.085, 0.28, 0.35, 0.23, 0, -0.06);
    sph(blk, 0, 0.84, 0.0, 0.23, 0.21, 0.22);
    sph(wht, 0, 0.815, 0.11, 0.16, 0.125, 0.125);
    for (const s of [-1, 1]) {
      sph(yel, s * 0.17, 0.77, 0.08, 0.06, 0.07, 0.06);
      sph(blk, s * 0.075, 0.87, 0.2, 0.03, 0.036, 0.022);
      k.add(new THREE.SphereGeometry(1, 12, 8), wht, [SX + s * 0.068 * S, y0 + 0.885 * S, SZ + 0.215 * S], { scale: [0.009 * S, 0.009 * S, 0.006 * S] });
      sph(blk, s * 0.3, 0.52, -0.01, 0.07, 0.25, 0.15, s * 0.45);
      sph(org, s * 0.11, 0.02, 0.15, 0.1, 0.035, 0.14);
    }
    sph(org, 0, 0.795, 0.25, 0.05, 0.033, 0.09, 0, 0.15);
    // פפיון אדום
    for (const s of [-1, 1]) k.add(new THREE.ConeGeometry(0.06 * S, 0.12 * S, 16), red, [SX + s * 0.06 * S, y0 + 0.66 * S, SZ + 0.235 * S], { rotZ: s * Math.PI / 2, scale: [1, 1, 0.5] });
    sph(red, 0, 0.66, 0.24, 0.025, 0.025, 0.02);
    // כובע צילינדר קטן
    k.cyl(0.1 * S, 0.1 * S, 0.12 * S, SX, y0 + 1.03 * S, SZ + 0.01 * S, blk, false, 32);
    k.cyl(0.16 * S, 0.16 * S, 0.012 * S, SX, y0 + 1.025 * S, SZ + 0.01 * S, blk, false, 32);
    k.cyl(0.102 * S, 0.102 * S, 0.025 * S, SX, y0 + 1.04 * S, SZ + 0.01 * S, k.mat(null, "#3b7dd8", [1, 1], { roughness: 0.4 }), false, 32);
    k.collider(SX - 1.5, SX + 1.5, SZ - 1.35, SZ + 1.5, y0, y0 + 0.7 * S, true);
    k.collider(SX - 1.1, SX + 1.1, SZ - 1.0, SZ + 1.2, y0, y0 + 1.06 * S, true);
    // בובות על המדף של הבסיס
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.2;
      if (Math.abs(Math.sin(a)) > 0.93 && Math.cos(a) < 0) continue;
      plushie(SX + Math.cos(a) * 2.05, y0, SZ + Math.sin(a) * 2.05, 0.32 + rnd() * 0.18, -a + Math.PI / 2 + Math.PI, undefined, false);
    }
    // צרורות בלונים סביב הבסיס
    for (const a of [0.8, 2.35, 3.9, 5.5]) bunch(SX + Math.cos(a) * 2.75, 0, SZ + Math.sin(a) * 2.75, 6, 2.2);
  }

  // ---------- יציע (מזנין) + מדרגות + מעקות ----------
  const MZ = 4.0;
  const mz = { n1: -6.85, n2: -3.5, side: 8.0, sEnd: 3.0 };
  {
    const slab = (x1: number, x2: number, z1: number, z2: number) => {
      b.add(mCeilBall, place(new THREE.BoxGeometry(x2 - x1, 0.32, z2 - z1), (x1 + x2) / 2, MZ - 0.16, (z1 + z2) / 2), 3);
      b.add(mCarpet, place(new THREE.BoxGeometry(x2 - x1, 0.02, z2 - z1), (x1 + x2) / 2, MZ + 0.005, (z1 + z2) / 2), 1.0);
      k.collider(x1, x2, z1, z2, MZ - 0.32, MZ, true);
      b.add(mGold, place(new THREE.BoxGeometry(x2 - x1 + 0.02, 0.08, z2 - z1 + 0.02), (x1 + x2) / 2, MZ - 0.36, (z1 + z2) / 2));
    };
    slab(-10.85, 10.85, mz.n1, mz.n2);
    slab(-10.85, -mz.side, mz.n2, mz.sEnd);
    slab(mz.side, 10.85, mz.n2, mz.sEnd);
    // עמודים מתחת לשפה
    const colAt: [number, number][] = [[-8, -3.5], [-4, -3.5], [0, -3.5], [4, -3.5], [8, -3.5], [-8, 0], [8, 0], [-8, 3.0], [8, 3.0]];
    for (const [x, z] of colAt) {
      b.add(mMarble, place(lathe([[0.36, 0], [0.36, 0.12], [0.3, 0.2], [0.26, 0.3], [0.24, 3.3], [0.3, 3.4], [0.36, 3.52], [0.36, 3.68]], 28), x, 0, z), 1.2);
      b.add(mGold, place(new THREE.TorusGeometry(0.25, 0.03, 8, 28), x, 3.3, z, Math.PI / 2, 0, 0));
      b.add(mGold, place(new THREE.TorusGeometry(0.28, 0.03, 8, 28), x, 0.22, z, Math.PI / 2, 0, 0));
      k.collider(x - 0.3, x + 0.3, z - 0.3, z + 0.3, 0, 3.68, true);
    }
    // מעקות: עמודונים (מופע אחד) + מאחז יד זהוב
    const balGeo = lathe([[0.05, 0], [0.05, 0.06], [0.03, 0.12], [0.045, 0.35], [0.025, 0.6], [0.04, 0.78], [0.05, 0.84]], 8);
    const bal: Inst[] = [];
    const rail = (ax: "x" | "z", c: number, a1: number, a2: number) => {
      const n = Math.round(Math.abs(a2 - a1) / 0.22);
      for (let i = 0; i <= n; i++) {
        const a = a1 + ((a2 - a1) * i) / n;
        bal.push({ pos: ax === "x" ? [a, MZ, c] : [c, MZ, a] });
      }
      const len = Math.abs(a2 - a1), mid = (a1 + a2) / 2;
      b.add(mWalnut, ax === "x" ? place(boxGeo(len + 0.1, 0.07, 0.12), mid, MZ + 0.87, c) : place(boxGeo(0.12, 0.07, len + 0.1), c, MZ + 0.87, mid), 1);
      b.add(mWhiteWood, ax === "x" ? place(boxGeo(len, 0.05, 0.09), mid, MZ + 0.03, c) : place(boxGeo(0.09, 0.05, len), c, MZ + 0.03, mid), 1);
      if (ax === "x") k.collider(Math.min(a1, a2), Math.max(a1, a2), c - 0.08, c + 0.08, MZ, MZ + 0.92, false);
      else k.collider(c - 0.08, c + 0.08, Math.min(a1, a2), Math.max(a1, a2), MZ, MZ + 0.92, false);
    };
    rail("x", mz.n2 + 0.06, -8.0, 8.0);
    rail("z", -mz.side + 0.06, -3.5, mz.sEnd);
    rail("z", mz.side - 0.06, -3.5, mz.sEnd);
    rail("x", mz.sEnd - 0.06, -9.1, -8.0);
    rail("x", mz.sEnd - 0.06, 8.0, 9.1);
    // מדרגות לאורך הקירות הצדדיים (16 מדרגות, 25 ס"מ)
    const stepN = 16, rise = MZ / stepN, tread = 0.4, zTop = mz.sEnd;
    const risers: Inst[] = [], runners: Inst[] = [], nosing: Inst[] = [];
    for (const sx of [-1, 1]) {
      const xa = sx * 10.85, xb = sx * 9.15, xc = (xa + xb) / 2, w = Math.abs(xa - xb);
      for (let i = 0; i < stepN; i++) {
        const top = rise * (stepN - i);
        const za = zTop + i * tread, zb = za + tread;
        risers.push({ pos: [xc, top / 2, (za + zb) / 2], scale: [w, top, tread] });
        runners.push({ pos: [xc, top + 0.008, (za + zb) / 2], scale: [w * 0.72, 0.016, tread] });
        nosing.push({ pos: [xc, top - 0.015, zb - 0.02], scale: [w, 0.05, 0.06] });
        k.collider(Math.min(xa, xb), Math.max(xa, xb), za, zb, 0, top, true);
        // עמודון מעקה בכל מדרגה
        bal.push({ pos: [xb - sx * 0.06, top, (za + zb) / 2] });
        bal.push({ pos: [xb - sx * 0.06, top, (za + zb) / 2 + 0.2] });
      }
      const zb = zTop + stepN * tread;
      b.add(mWalnut, beam([xb - sx * 0.06, MZ + 0.87, zTop], [xb - sx * 0.06, rise + 0.87, zb - tread / 2], 0.12, 0.07), 1);
      b.add(mGold, place(new THREE.SphereGeometry(0.1, 16, 12), xb - sx * 0.06, rise + 1.0, zb - 0.1));
      b.add(mWalnut, place(boxGeo(0.16, rise + 0.95, 0.16), xb - sx * 0.06, (rise + 0.95) / 2, zb - 0.1), 1);
    }
    k.instances(new THREE.BoxGeometry(1, 1, 1), mMarble, risers);
    k.instances(new THREE.BoxGeometry(1, 1, 1), mNavyVelvet, runners, { noShadow: true });
    k.instances(new THREE.BoxGeometry(1, 1, 1), mGold, nosing, { noShadow: true });
    k.instances(balGeo, mWhiteWood, bal);
  }

  // ---------- נברשות ----------
  const chandelier = (x: number, y: number, z: number, s = 1) => {
    b.add(mGold, place(new THREE.CylinderGeometry(0.02, 0.02, BALL_H - y, 6), x, (BALL_H + y) / 2, z));
    b.add(mGold, place(new THREE.TorusGeometry(0.9 * s, 0.035, 8, 36), x, y, z, Math.PI / 2, 0, 0));
    b.add(mGold, place(new THREE.TorusGeometry(0.55 * s, 0.03, 8, 28), x, y + 0.45, z, Math.PI / 2, 0, 0));
    b.add(mGold, place(lathe([[0, 0], [0.12, 0.05], [0.18, 0.3], [0.06, 0.7], [0.03, 0.9]], 18), x, y - 0.3, z));
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      b.add(mGlow, place(new THREE.CylinderGeometry(0.025, 0.025, 0.16, 8), x + Math.cos(a) * 0.9 * s, y + 0.1, z + Math.sin(a) * 0.9 * s));
      b.add(mGlow, place(new THREE.SphereGeometry(0.05, 8, 6), x + Math.cos(a) * 0.9 * s, y + 0.22, z + Math.sin(a) * 0.9 * s));
      b.add(mGlass, place(new THREE.OctahedronGeometry(0.06, 0), x + Math.cos(a + 0.26) * 0.9 * s, y - 0.2, z + Math.sin(a + 0.26) * 0.9 * s, 0, 0, 0, [1, 1.8, 1]));
      if (i % 2 === 0) b.add(mGlow, place(new THREE.SphereGeometry(0.045, 8, 6), x + Math.cos(a) * 0.55 * s, y + 0.55, z + Math.sin(a) * 0.55 * s));
    }
  };
  chandelier(-6.5, 6.6, 4);
  chandelier(6.5, 6.6, 4);
  chandelier(0, 6.8, 12.8, 1.1);

  // ---------- עץ אשוח מקושט ----------
  const firTree = (x: number, y: number, z: number, h: number) => {
    b.add(mWalnut, place(new THREE.CylinderGeometry(0.12 * h / 3, 0.15 * h / 3, 0.5, 12), x, y + 0.25, z), 1);
    const tiers = 5;
    for (let i = 0; i < tiers; i++) {
      const t = i / tiers;
      const r = (1 - t) * h * 0.33 + 0.15;
      const hh = h * 0.32;
      b.add(mFir, place(new THREE.ConeGeometry(r, hh, 20, 1, true), x, y + 0.4 + t * h * 0.78 + hh / 2, z), 1.2);
      for (let j = 0; j < 7; j++) {
        const a = rnd() * Math.PI * 2;
        glossy.add(x + Math.cos(a) * r * 0.82, y + 0.45 + t * h * 0.78 + hh * 0.2, z + Math.sin(a) * r * 0.82, 0, 1, [[0, 0, 0, 0.08, 0.08, 0.08, 0, pick(["#d62828", "#ffd166", "#3a86ff", "#e0e1dd", "#8ecae6"]), 0]]);
      }
    }
    b.add(mGold, place(new THREE.OctahedronGeometry(0.22, 0), x, y + h + 0.3, z, 0, 0, 0, [1, 1.3, 0.4]));
    k.collider(x - h * 0.22, x + h * 0.22, z - h * 0.22, z + h * 0.22, y, y + h, true);
    // מתנות
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3, d = h * 0.3 + 0.2, s = 0.3 + rnd() * 0.3;
      const gx = x + Math.cos(a) * d, gz = z + Math.sin(a) * d;
      const gm = pick(mSuitcase);
      b.add(gm, place(boxGeo(s, s * 0.8, s), gx, y + s * 0.4, gz, 0, a, 0));
      b.add(mGold, place(new THREE.BoxGeometry(s + 0.01, s * 0.8 + 0.01, 0.05), gx, y + s * 0.4, gz, 0, a, 0));
      b.add(mGold, place(new THREE.BoxGeometry(0.05, s * 0.8 + 0.01, s + 0.01), gx, y + s * 0.4, gz, 0, a, 0));
    }
  };
  firTree(-8.2, 0, 14.6, 4.6);
  firTree(8.8, MZ, -5.3, 2.6);

  // ---------- דלפק קבלה (מזרח הכניסה) ----------
  {
    const f = new Frame(8.1, 14.6, -Math.PI / 2); // חזית לכיוון מערב
    b.add(mWalnut, f.put(boxGeo(3.6, 1.05, 0.7), 0, 0.525, 0), 1);
    b.add(mMarble, f.put(boxGeo(3.75, 0.06, 0.85), 0, 1.08, 0.04), 1.5);
    b.add(mGold, f.put(boxGeo(3.62, 0.05, 0.02), 0, 0.9, 0.36));
    b.add(mGold, f.put(boxGeo(3.62, 0.05, 0.02), 0, 0.15, 0.36));
    for (let i = -1; i <= 1; i++) b.add(mNavyVelvet, f.put(boxGeo(1.0, 0.55, 0.02), i * 1.15, 0.52, 0.36), 1);
    f.box(k, -1.88, 1.88, -0.4, 0.46, 0, 1.11, true);
    // פעמון, מחשב, ספר אורחים
    const [bx, bz] = f.pt(0.9, 0.1);
    b.add(mGold, place(new THREE.SphereGeometry(0.07, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), bx, 1.11, bz));
    b.add(mGold, place(new THREE.CylinderGeometry(0.09, 0.09, 0.015, 16), bx, 1.115, bz));
    const [mx2, mz2] = f.pt(-0.8, -0.15);
    b.add(mBlack, place(boxGeo(0.55, 0.36, 0.04), mx2, 1.4, mz2, 0, -Math.PI / 2 + Math.PI, 0));
    b.add(mBlack, place(new THREE.CylinderGeometry(0.03, 0.08, 0.2, 10), mx2, 1.2, mz2));
    ceramic(...(f.pt(-1.6, 0.15).flatMap((v, i) => (i === 0 ? [v, 1.11] : [v])) as [number, number, number]), 0.45, Math.PI / 2 * -1 + Math.PI, 0);
    duck(...(f.pt(0.4, 0.2).flatMap((v, i) => (i === 0 ? [v, 1.11] : [v])) as [number, number, number]), 1.6, -Math.PI / 2);
    // ארון מפתחות על הקיר מאחור
    b.add(mWalnut, place(boxGeo(0.35, 2.2, 3.2), 10.65, 1.1 + 0.6, 14.6), 1);
    const holes: Inst[] = [];
    for (let r = 0; r < 6; r++) for (let c = 0; c < 9; c++) holes.push({ pos: [10.47, 0.95 + r * 0.33, 13.3 + c * 0.325], scale: [0.02, 0.26, 0.26], color: (r + c) % 3 ? "#1d1a17" : "#caa24c" });
    k.instances(new THREE.BoxGeometry(1, 1, 1), k.mat(null, "#ffffff", [1, 1], { roughness: 0.6 }), holes, { noShadow: true });
    k.collider(10.45, 10.85, 13, 16.2, 0, 2.8, false);
    k.add(new THREE.BoxGeometry(0.04, 0.5, 2.6), k.mat(P.sign("RECEPTION", 512, 96), "#fff", [1, 1], { roughness: 0.4, metalness: 0.3, bump: 0 }), [10.8, 3.35, 14.6], { noShadow: true });
    bunch(...(f.pt(1.7, 0.2).flatMap((v, i) => (i === 0 ? [v, 1.11] : [v])) as [number, number, number]), 5, 1.2);
    plushie(9.6, 0, 16.1, 0.9, Math.PI);
  }

  // ---------- עגלת מזוודות ומזוודות ----------
  {
    const cx = 3.6, cz = 15.3;
    b.add(mGold, place(boxGeo(1.6, 0.06, 0.8), cx, 0.28, cz));
    for (const s of [-1, 1]) {
      b.add(mGold, place(new THREE.CylinderGeometry(0.025, 0.025, 1.7, 10), cx + s * 0.75, 1.13, cz));
      for (const t of [-1, 1]) b.add(mBlack, place(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 14), cx + s * 0.7, 0.08, cz + t * 0.35, Math.PI / 2, 0, 0));
    }
    b.add(mGold, place(new THREE.TorusGeometry(0.75, 0.025, 8, 24, Math.PI), cx, 1.98, cz));
    const sc: [number, number, number, number][] = [[0.9, 0.6, 0.28, 0], [0.7, 0.5, 0.25, 1], [0.55, 0.4, 0.22, 2]];
    let yy = 0.31;
    sc.forEach(([w, h, d, m], i) => {
      b.add(mSuitcase[m], place(boxGeo(w, d, h), cx - 0.2 + i * 0.1, yy + d / 2, cz, 0, i * 0.2, 0));
      yy += d;
    });
    b.add(mSuitcase[3], place(boxGeo(0.45, 0.65, 0.25), cx + 0.5, 0.31 + 0.325, cz + 0.1));
    k.collider(cx - 0.8, cx + 0.8, cz - 0.4, cz + 0.4, 0, 1.0, true);
    plushie(cx - 0.35, yy, cz, 0.35, Math.PI, "#86b9de", false);
    b.add(mSuitcase[1], place(boxGeo(0.45, 0.7, 0.28), -3.4, 0.35, 15.8, 0, 0.3, 0));
    k.collider(-3.7, -3.1, 15.6, 16.0, 0, 0.7, true);
  }
  // קשת בלונים מעל הכניסה
  for (let i = 0; i <= 26; i++) {
    const t = (i / 26) * Math.PI;
    const x = Math.cos(t) * 2.3, y = Math.sin(t) * 3.7;
    for (const dz of [0, 0.3]) {
      const col = balloonCols[(i + (dz ? 1 : 0)) % 4 === 0 ? 4 : (i % 2 ? 1 : 6)];
      glossy.add(x + (dz ? 0.1 : 0), y + 0.2, 16.35 - dz, 0, 1, [[0, 0, 0, 0.22, 0.24, 0.22, 0, col, 1]]);
    }
  }

  // ---------- שולחנות נשף עם בלונים ----------
  const chairMat = mIceVelvet;
  const partyChair = (x: number, z: number, ry: number, fab: Mat) => {
    const f = new Frame(x, z, ry);
    b.add(fab, f.put(boxGeo(0.46, 0.09, 0.46), 0, 0.46, 0), 0.5);
    b.add(fab, f.put(boxGeo(0.44, 0.55, 0.07), 0, 0.8, -0.2, -0.08), 0.5);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(mGold, f.put(new THREE.CylinderGeometry(0.018, 0.014, 0.44, 8), sx * 0.19, 0.22, sz * 0.19));
    f.box(k, -0.23, 0.23, -0.24, 0.23, 0, 0.5, true);
  };
  const roundTable = (x: number, z: number, r = 0.8, chairs = 5, fab = chairMat, y = 0) => {
    b.add(mCloth, place(lathe([[0, 0.76], [r + 0.06, 0.76], [r + 0.1, 0.72], [r + 0.16, 0.3], [r + 0.2, 0.02], [r + 0.19, 0]].reverse().map(([a, h]) => [a, h] as [number, number]).reverse(), 40), x, y, z), 0.6);
    b.add(mCloth, place(new THREE.CircleGeometry(r + 0.06, 40), x, y + 0.762, z, -Math.PI / 2, 0, 0), 0.6);
    k.collider(x - r - 0.15, x + r + 0.15, z - r - 0.15, z + r + 0.15, y, y + 0.77, true);
    for (let i = 0; i < chairs; i++) {
      const a = (i / chairs) * Math.PI * 2 + 0.3;
      partyChair(x + Math.cos(a) * (r + 0.55), z + Math.sin(a) * (r + 0.55), Math.PI / 2 - a + Math.PI, fab);
    }
    // מרכז שולחן: אגרטל, צלחות
    b.add(mPorcelain, place(lathe([[0, 0], [0.08, 0], [0.11, 0.1], [0.06, 0.25], [0.08, 0.32]], 20), x, y + 0.77, z));
    for (let i = 0; i < chairs; i++) {
      const a = (i / chairs) * Math.PI * 2 + 0.3;
      b.add(mPorcelain, place(new THREE.CylinderGeometry(0.13, 0.1, 0.02, 20), x + Math.cos(a) * (r - 0.22), y + 0.775, z + Math.sin(a) * (r - 0.22)));
    }
    bunch(x, y + 0.77, z, 5, 1.3);
  };
  roundTable(-6.2, 10.6);
  roundTable(6.0, 10.2);
  roundTable(-5.6, -1.2, 0.7, 4, mNavyVelvet);
  roundTable(5.6, -1.4, 0.7, 4, mNavyVelvet);

  // ---------- ספות בכניסה / מתחת ליציע ----------
  const sofa = (x: number, z: number, ry: number, len: number, n: number, fab: Mat, y = 0) => {
    const f = new Frame(x, z, ry);
    b.add(fab, f.put(boxGeo(len, 0.26, 0.86), 0, y + 0.22, 0), 0.5);
    for (let i = 0; i < n; i++) {
      const cx = -len / 2 + (len / n) * (i + 0.5);
      b.add(fab, f.put(boxGeo(len / n - 0.02, 0.15, 0.68), cx, y + 0.425, 0.08), 0.5);
      b.add(fab, f.put(boxGeo(len / n - 0.04, 0.42, 0.17), cx, y + 0.64, -0.24, -0.14), 0.5);
    }
    b.add(fab, f.put(boxGeo(len + 0.02, 0.56, 0.18), 0, y + 0.63, -0.35), 0.5);
    for (const s of [-1, 1]) b.add(fab, f.put(boxGeo(0.18, 0.62, 0.86), s * (len / 2 + 0.09), y + 0.4, 0), 0.5);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(mGold, f.put(new THREE.CylinderGeometry(0.025, 0.018, 0.09, 10), sx * (len / 2 + 0.12), y + 0.045, sz * 0.36));
    f.box(k, -len / 2 - 0.18, len / 2 + 0.18, -0.25, 0.43, y, y + 0.5, true);
    f.box(k, -len / 2 - 0.18, len / 2 + 0.18, -0.44, -0.25, y, y + 0.91, true);
    return f;
  };
  // מתחת ליציע (מערב/מזרח)
  for (const sx of [-1, 1]) {
    sofa(sx * 10.25, -1.9, sx < 0 ? Math.PI / 2 : -Math.PI / 2, 1.9, 3, mNavyVelvet);
    sofa(sx * 9.3, 2.1, Math.PI, 0.75, 1, mIceVelvet);
    b.add(mMarble, place(new THREE.CylinderGeometry(0.45, 0.45, 0.05, 32), sx * 9.1, 0.45, -1.9), 1);
    b.add(mGold, place(new THREE.CylinderGeometry(0.05, 0.12, 0.43, 12), sx * 9.1, 0.215, -1.9));
    k.collider(sx * 9.1 - 0.45, sx * 9.1 + 0.45, -2.35, -1.45, 0, 0.48, true);
    plushie(sx * 10.2, 0.52, -2.5, 0.42, sx < 0 ? Math.PI / 2 : -Math.PI / 2, undefined, false);
    plushie(sx * 10.2, 0.52, -1.3, 0.34, sx < 0 ? Math.PI / 2 : -Math.PI / 2, "#86b9de", false);
    duck(sx * 9.1, 0.475, -1.8, 1.4);
    ceramic(sx * 10.0, 0, -6.1, 1.1, sx < 0 ? Math.PI / 4 : -Math.PI / 4, sx < 0 ? 0 : 1);
    k.collider(sx * 10.0 - 0.35, sx * 10.0 + 0.35, -6.45, -5.75, 0, 1.05, true);
  }
  // פסלי קרמיקה על כנים ליד הכניסה
  for (const s of [-1, 1]) {
    const x = s * 4.3, z = 16.2;
    b.add(mMarbleBlue, place(boxGeo(0.6, 0.9, 0.6), x, 0.45, z), 1);
    b.add(mGold, place(boxGeo(0.66, 0.05, 0.66), x, 0.92, z));
    k.collider(x - 0.3, x + 0.3, z - 0.3, z + 0.3, 0, 0.95, true);
    ceramic(x, 0.95, z, 0.85, Math.PI, s < 0 ? 1 : 0);
  }
  // בובות ענק ובלונים באולם
  plushie(-9.9, 0, 11.2, 1.3, Math.PI / 2 + 0.3, "#1f2d44");
  plushie(-3.4, 0, 13.3, 0.55, Math.PI * 0.9);
  plushie(-2.9, 0, 13.7, 0.4, Math.PI * 1.1, "#86b9de");
  plushie(9.4, 0, 7.4, 1.1, -Math.PI / 2, "#6c7886");
  plushie(8.6, 0, 11.9, 0.5, -Math.PI / 2 - 0.4);
  plushie(-8.9, 0, 5.2, 0.6, Math.PI / 2 + 0.6, "#86b9de");
  bunch(-9.9, 0, 12.4, 7, 2.4);
  bunch(9.2, 0, 6.3, 6, 2.2);
  bunch(-2.9, 0, 15.9, 5, 1.8);
  // בלונים שנתקעו בתקרה
  for (let i = 0; i < 46; i++) {
    let x = -10 + rnd() * 20, z = -6 + rnd() * 22;
    if (x > -4.3 && x < 4.3 && z > -0.8 && z < 7.8) x += x < 0 ? -4.5 : 4.5;
    const hs = rnd() < 0.3 ? 0 : 1;
    balloon(x, BALL_H - 0.75 - rnd() * 0.3 + 0.0 * hs, z, [x + (rnd() - 0.5) * 0.4, BALL_H - 2.3 - rnd() * 1.2, z + (rnd() - 0.5) * 0.4], undefined, rnd() < 0.15);
  }

  // ---------- על היציע: פסנתר כנף, ספות, שולחן ----------
  {
    const px = -5.2, pz = -5.3;
    const pf = new Frame(px, pz, 0.4);
    const shape = new THREE.Shape();
    shape.moveTo(-0.75, 0); shape.lineTo(0.75, 0); shape.lineTo(0.75, 0.9);
    shape.bezierCurveTo(0.75, 1.7, 0.1, 1.5, -0.1, 2.0);
    shape.bezierCurveTo(-0.3, 2.3, -0.75, 2.2, -0.75, 1.8);
    shape.closePath();
    const bodyG = new THREE.ExtrudeGeometry(shape, { depth: 0.32, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2, curveSegments: 20 });
    bodyG.rotateX(Math.PI / 2);
    b.add(mBlack, pf.put(bodyG, 0, MZ + 1.0, -1.0));
    const lid = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false, curveSegments: 20 });
    lid.rotateX(Math.PI / 2);
    b.add(mBlack, pf.put(lid, 0, MZ + 1.02, -1.0, -0.55, 0, 0));
    for (const [lx, lz] of [[-0.65, -0.9], [0.65, -0.9], [0, 0.8]]) b.add(mBlack, pf.put(new THREE.CylinderGeometry(0.05, 0.04, 0.68, 12), lx, MZ + 0.34, lz));
    b.add(mWhiteWood, pf.put(boxGeo(1.4, 0.03, 0.16), 0, MZ + 0.72, -1.07));
    const keys: Inst[] = [];
    for (let i = 0; i < 26; i++) {
      const [kx, kz] = pf.pt(-0.65 + i * 0.052, -1.07);
      keys.push({ pos: [kx, MZ + 0.745, kz], rotY: 0.4, scale: [0.028, 0.012, 0.08] });
    }
    k.instances(new THREE.BoxGeometry(1, 1, 1), mBlack, keys, { noShadow: true });
    pf.box(k, -0.8, 0.8, -1.1, 1.2, MZ, MZ + 1.05, true);
    const bf = pf.sub(0, -1.6, 0);
    b.add(mBlack, bf.put(boxGeo(0.8, 0.08, 0.36), 0, MZ + 0.48, 0));
    for (const sx of [-1, 1]) b.add(mBlack, bf.put(boxGeo(0.06, 0.44, 0.3), sx * 0.34, MZ + 0.22, 0));
    bf.box(k, -0.4, 0.4, -0.18, 0.18, MZ, MZ + 0.52, true);
    plushie(...(pf.pt(0.4, 0.2).flatMap((v, i) => (i === 0 ? [v, MZ + 1.05] : [v])) as [number, number, number]), 0.35, 0.4 + Math.PI);
    sofa(3.8, -6.1, 0, 2.2, 3, mIceVelvet, MZ);
    sofa(1.2, -5.2, Math.PI / 2, 0.75, 1, mNavyVelvet, MZ);
    b.add(mMarble, place(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 32), 3.8, MZ + 0.42, -4.9), 1);
    b.add(mGold, place(new THREE.CylinderGeometry(0.05, 0.14, 0.4, 12), 3.8, MZ + 0.2, -4.9));
    k.collider(3.3, 4.3, -5.4, -4.4, MZ, MZ + 0.45, true);
    plushie(3.2, MZ + 0.5, -6.1, 0.45, 0.1);
    plushie(4.4, MZ + 0.5, -6.1, 0.4, -0.2, "#86b9de");
    duck(3.8, MZ + 0.445, -4.9, 1.8);
    bunch(-9.6, MZ, -6.3, 6, 1.9);
    bunch(6.3, MZ, -6.4, 5, 1.8);
    bunch(-9.4, MZ, 2.3, 5, 1.6);
    plushie(-9.8, MZ, -1.2, 0.9, Math.PI / 2, "#2b4f86");
    plushie(9.6, MZ, 1.2, 0.8, -Math.PI / 2);
    for (let i = 0; i < 5; i++) plushie(-1.2 + i * 0.55, MZ, -6.5, 0.3 + rnd() * 0.25, rnd() - 0.5, undefined, false);
    ceramic(9.9, MZ, -3.0, 0.9, -Math.PI / 2, 2);
    ceramic(-10.1, MZ, 1.2, 0.7, Math.PI / 2, 3);
  }

  // ---------- חדרים ----------
  const nightstand = (f: Frame, lx: number, lz: number) => {
    b.add(mWhiteWood, f.put(boxGeo(0.5, 0.55, 0.42), lx, 0.275, lz), 0.8);
    b.add(mWhiteWood, f.put(boxGeo(0.44, 0.18, 0.02), lx, 0.4, lz + 0.215), 0.8);
    b.add(mGold, f.put(new THREE.SphereGeometry(0.02, 8, 6), lx, 0.4, lz + 0.235));
    b.add(mPorcelain, f.put(lathe([[0, 0], [0.08, 0], [0.1, 0.12], [0.06, 0.26], [0.02, 0.32]], 18), lx, 0.55, lz));
    b.add(mShade, f.put(lathe([[0.17, 0], [0.12, 0.2]], 20), lx, 0.82, lz));
    b.add(mGlow, f.put(new THREE.SphereGeometry(0.04, 8, 6), lx, 0.88, lz));
    f.box(k, lx - 0.25, lx + 0.25, lz - 0.21, lz + 0.21, 0, 0.56, true);
  };
  const bed = (f: Frame, lx: number, lz: number, w: number, L2: number, throwM: Mat, head: Mat) => {
    const zc = lz;
    b.add(mWalnut, f.put(boxGeo(w + 0.1, 0.28, L2 + 0.05), lx, 0.24, zc), 1);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(mWalnut, f.put(boxGeo(0.08, 0.1, 0.08), lx + sx * w / 2, 0.05, zc + sz * L2 / 2), 1);
    b.add(mPillow, f.put(boxGeo(w, 0.24, L2), lx, 0.5, zc));
    b.add(mDuvet, f.put(boxGeo(w + 0.08, 0.1, L2 * 0.74), lx, 0.66, zc + L2 * 0.13), 0.8);
    for (const sx of [-1, 1]) b.add(mDuvet, f.put(boxGeo(0.04, 0.36, L2 * 0.74), lx + sx * (w / 2 + 0.06), 0.49, zc + L2 * 0.13), 0.8);
    b.add(mDuvet, f.put(boxGeo(w + 0.12, 0.36, 0.04), lx, 0.49, zc + L2 / 2 + 0.03), 0.8);
    b.add(throwM, f.put(boxGeo(w + 0.16, 0.035, 0.6), lx, 0.72, zc + L2 / 2 - 0.3), 0.9);
    b.add(throwM, f.put(boxGeo(w + 0.16, 0.3, 0.035), lx, 0.58, zc + L2 / 2 + 0.06), 0.9);
    const np = w > 1.2 ? 2 : 1;
    for (let i = 0; i < np; i++) {
      const px = lx + (np === 1 ? 0 : (i - 0.5) * (w / 2));
      b.add(mPillow, f.put(boxGeo(Math.min(0.72, w - 0.1), 0.18, 0.42), px, 0.76, zc - L2 / 2 + 0.3, -0.35));
    }
    b.add(mIceVelvet, f.put(boxGeo(0.42, 0.34, 0.12), lx, 0.8, zc - L2 / 2 + 0.55, -0.3), 0.5);
    b.add(head, f.put(boxGeo(w + 0.24, 1.25, 0.14), lx, 0.62 + 0.1, zc - L2 / 2 - 0.08), 0.5);
    b.add(mGold, f.put(boxGeo(w + 0.28, 0.05, 0.16), lx, 1.37, zc - L2 / 2 - 0.08));
    f.box(k, lx - w / 2 - 0.08, lx + w / 2 + 0.08, zc - L2 / 2, zc + L2 / 2 + 0.06, 0, 0.72, true);
    f.box(k, lx - w / 2 - 0.12, lx + w / 2 + 0.12, zc - L2 / 2 - 0.16, zc - L2 / 2, 0, 1.4, true);
  };
  const wardrobe = (f: Frame, lx: number, lz: number) => {
    b.add(mWhiteWood, f.put(boxGeo(0.62, 2.2, 1.3), lx, 1.1, lz), 0.8);
    b.add(mWhiteWood, f.put(boxGeo(0.02, 1.95, 0.6), lx - 0.32, 1.1, lz - 0.32), 0.8);
    b.add(mWhiteWood, f.put(boxGeo(0.02, 1.95, 0.6), lx - 0.32, 1.1, lz + 0.32), 0.8);
    for (const s of [-1, 1]) b.add(mGold, f.put(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8), lx - 0.345, 1.15, lz + s * 0.05));
    f.box(k, lx - 0.31, lx + 0.31, lz - 0.65, lz + 0.65, 0, 2.2, true);
  };
  const desk = (f: Frame, lx: number, lz: number) => {
    b.add(mWalnut, f.put(boxGeo(0.6, 0.04, 1.3), lx, 0.75, lz), 1);
    for (const s of [-1, 1]) for (const t of [-1, 1]) b.add(mWalnut, f.put(boxGeo(0.05, 0.73, 0.05), lx + t * 0.25, 0.365, lz + s * 0.6), 1);
    b.add(mWalnut, f.put(boxGeo(0.5, 0.14, 0.9), lx, 0.64, lz), 1);
    f.box(k, lx - 0.3, lx + 0.3, lz - 0.65, lz + 0.65, 0, 0.77, true);
    partyChair(...f.pt(lx + 0.6, lz), f.ry - Math.PI / 2, mNavyVelvet);
    const [dx, dz] = f.pt(lx - 0.05, lz - 0.35);
    b.add(mGold, place(new THREE.CylinderGeometry(0.08, 0.1, 0.02, 14), dx, 0.78, dz));
    b.add(mShade, place(lathe([[0.12, 0], [0.08, 0.14]], 16), dx, 1.12, dz));
    b.add(mGold, place(new THREE.CylinderGeometry(0.01, 0.01, 0.34, 6), dx, 0.95, dz));
  };
  const rug = (f: Frame, lx: number, lz: number, w: number, d: number, m: Mat) => b.add(m, f.put(new THREE.BoxGeometry(w, 0.012, d), lx, 0.006, lz), 1.4);
  const rugM = k.mat(k.tex("ph-rug", () => L.modernRug("#e9eef3", "#1f3b68", "#7fb3dd")), "#fff", [1, 1], { roughness: 1, bump: 0.3 });
  const rugPink = k.mat(k.tex("ph-rugp", () => L.modernRug("#fbeff3", "#e07a9c", "#9ad0ec")), "#fff", [1, 1], { roughness: 1, bump: 0.3 });

  const bathtub = (f: Frame, lx: number, lz: number, nDucks = 4) => {
    const g = lathe([[0.0, 0], [0.3, 0.01], [0.36, 0.16], [0.4, 0.44], [0.43, 0.5], [0.38, 0.5], [0.34, 0.44], [0.3, 0.2], [0.0, 0.14]], 32);
    g.scale(2.1, 1, 1);
    b.add(mPorcelain, f.put(g, lx, 0.14, lz));
    b.add(mWater, f.put(new THREE.CircleGeometry(1, 32).scale(0.7, 0.33, 1), lx, 0.52, lz, -Math.PI / 2, 0, 0));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(mGold, f.put(new THREE.SphereGeometry(0.06, 10, 8), lx + sx * 0.6, 0.08, lz + sz * 0.22, 0, 0, 0));
    b.add(mChrome, f.put(beam([0, 0.55, 0], [0, 0.95, 0.0], 0.04, 0.04, true), lx - 0.85, 0, lz));
    b.add(mChrome, f.put(beam([0, 0.95, 0], [0.18, 0.95, 0], 0.035, 0.035, true), lx - 0.85, 0, lz));
    f.box(k, lx - 0.9, lx + 0.9, lz - 0.43, lz + 0.43, 0, 0.64, true);
    for (let i = 0; i < nDucks; i++) {
      const [dx, dz] = f.pt(lx - 0.45 + (i / Math.max(1, nDucks - 1)) * 0.9, lz + (rnd() - 0.5) * 0.3);
      duck(dx, 0.5, dz, 1 + rnd() * 0.3);
    }
    const [ex, ez] = f.pt(lx + 0.8, lz - 0.3);
    duck(ex, 0.64, ez, 1.1);
  };
  const toilet = (f: Frame, lx: number, lz: number) => {
    b.add(mPorcelain, f.put(lathe([[0.12, 0], [0.14, 0.05], [0.12, 0.2], [0.2, 0.36], [0.2, 0.4], [0, 0.4]], 24).scale(1, 1, 1.25), lx, 0, lz + 0.05));
    b.add(mPorcelain, f.put(boxGeo(0.42, 0.4, 0.18), lx, 0.62, lz - 0.2), 0.5);
    b.add(mPorcelain, f.put(boxGeo(0.44, 0.04, 0.2), lx, 0.84, lz - 0.2));
    b.add(mChrome, f.put(boxGeo(0.06, 0.02, 0.02), lx - 0.12, 0.8, lz - 0.1));
    f.box(k, lx - 0.22, lx + 0.22, lz - 0.3, lz + 0.3, 0, 0.42, true);
  };
  const vanity = (f: Frame, lx: number, lz: number, w: number) => {
    b.add(mWhiteWood, f.put(boxGeo(w, 0.8, 0.55), lx, 0.4, lz), 0.8);
    b.add(mMarble, f.put(boxGeo(w + 0.04, 0.05, 0.58), lx, 0.825, lz), 1.2);
    const n = Math.max(1, Math.round(w / 1.1));
    for (let i = 0; i < n; i++) {
      const sx = lx - w / 2 + (w / n) * (i + 0.5);
      b.add(mPorcelain, f.put(lathe([[0.0, 0], [0.18, 0.02], [0.22, 0.12], [0.2, 0.12], [0.16, 0.04], [0, 0.04]], 24), sx, 0.85, lz + 0.02));
      b.add(mChrome, f.put(beam([0, 0.85, -0.2], [0, 1.08, -0.2], 0.03, 0.03, true), sx, 0, lz));
      b.add(mChrome, f.put(beam([0, 1.08, -0.2], [0, 1.05, -0.05], 0.025, 0.025, true), sx, 0, lz));
    }
    b.add(mMirror, f.put(boxGeo(w - 0.1, 1.0, 0.03), lx, 1.75, lz - 0.28));
    b.add(mGold, f.put(boxGeo(w - 0.02, 1.06, 0.02), lx, 1.75, lz - 0.295));
    f.box(k, lx - w / 2, lx + w / 2, lz - 0.28, lz + 0.29, 0, 0.85, true);
    const [tx, tz] = f.pt(lx + w / 2 - 0.2, lz);
    duck(tx, 0.85, tz, 1.2);
  };
  const towels = (f: Frame, lx: number, lz: number, n: number) => {
    const cols = ["#ffffff", "#9fd3ef", "#1f4fa0", "#ffffff"];
    b.add(mWhiteWood, f.put(boxGeo(0.9, 1.6, 0.4), lx, 0.8, lz), 0.8);
    for (let s = 0; s < 3; s++) for (let i = 0; i < n; i++) b.add(k.mat(null, cols[(s + i) % 4], [1, 1], { roughness: 1 }), f.put(boxGeo(0.36, 0.08, 0.3), lx - 0.2 + (i % 2) * 0.4, 1.63 + 0.0 + Math.floor(i / 2) * 0.085 + s * 0.0, lz), 0.5);
    f.box(k, lx - 0.45, lx + 0.45, lz - 0.2, lz + 0.2, 0, 1.8, true);
  };
  const shelf = (f: Frame, lx: number, lz: number, w: number) => {
    b.add(mWhiteWood, f.put(boxGeo(w, 2.1, 0.45), lx, 1.05, lz - 0.02), 0.8);
    for (let i = 0; i < 4; i++) {
      const y = 0.45 + i * 0.5;
      for (let j = 0; j < Math.floor(w / 0.42); j++) {
        const [px, pz] = f.pt(lx - w / 2 + 0.25 + j * 0.42, lz + 0.18);
        if ((i + j) % 3 === 0) duck(px, y, pz, 1.8, f.ry);
        else plushie(px, y, pz, 0.28 + rnd() * 0.08, f.ry + (rnd() - 0.5) * 0.4, undefined, false);
      }
    }
    f.box(k, lx - w / 2, lx + w / 2, lz - 0.25, lz + 0.22, 0, 2.1, true);
  };

  for (const r of roomsDef) {
    // מסגרת מקומית: דלת בקיר +x המקומי. במערב ry=0, במזרח ry=π
    const x1 = r.side < 0 ? -21.85 : 13.55, x2 = r.side < 0 ? -13.55 : 21.85;
    const cx = (x1 + x2) / 2, cz = (r.z1 + r.z2) / 2;
    const f = new Frame(cx, cz, r.side < 0 ? 0 : Math.PI);
    const W = x2 - x1, D = r.z2 - r.z1 - 0.3;
    if (r.kind === "bed" || r.kind === "twin" || r.kind === "suite") {
      const head = r.kind === "suite" ? mIceVelvet : mNavyVelvet;
      if (r.kind === "twin") {
        bed(f, -1.9, -D / 2 + 1.2, 1.1, 2.0, mThrow, head);
        bed(f, 0.6, -D / 2 + 1.2, 1.1, 2.0, mThrow, head);
        nightstand(f, -0.65, -D / 2 + 0.35);
        nightstand(f, 1.55, -D / 2 + 0.35);
        rug(f, -0.65, -D / 2 + 1.8, 3.4, 2.4, rugM);
      } else {
        const w = r.kind === "suite" ? 2.0 : 1.7;
        bed(f, -0.6, -D / 2 + 1.25, w, 2.1, r.kind === "suite" ? mThrow : mThrow, head);
        nightstand(f, -0.6 - w / 2 - 0.45, -D / 2 + 0.35);
        nightstand(f, -0.6 + w / 2 + 0.45, -D / 2 + 0.35);
        rug(f, -0.6, -D / 2 + 1.7, w + 1.4, 2.6, r.kind === "suite" ? rugPink : rugM);
      }
      wardrobe(f, W / 2 - 0.35, -D / 2 + 0.9);
      desk(f, -W / 2 + 0.35, 1.2);
      // כורסה + מנורת רצפה בפינה
      const af = f.sub(-W / 2 + 0.75, D / 2 - 0.8, Math.PI * 0.75);
      sofa(af.x, af.z, af.ry, 0.72, 1, r.kind === "suite" ? mNavyVelvet : mIceVelvet);
      // קונסולת טלוויזיה מול המיטה
      b.add(mWhiteWood, f.put(boxGeo(1.6, 0.6, 0.45), -0.4, 0.3, D / 2 - 0.3), 0.8);
      b.add(mBlack, f.put(boxGeo(1.3, 0.75, 0.05), -0.4, 1.25, D / 2 - 0.12));
      b.add(mBlack, f.put(boxGeo(0.3, 0.03, 0.2), -0.4, 0.615, D / 2 - 0.3));
      f.box(k, -1.2, 0.4, D / 2 - 0.52, D / 2 - 0.08, 0, 0.6, true);
      // בובות, בלונים, ברווזים, מזוודה
      const bedZ = -D / 2 + 1.25;
      const pts: [number, number][] = r.kind === "twin" ? [[-1.9, bedZ - 0.2], [0.6, bedZ - 0.2]] : [[-1.0, bedZ - 0.3], [-0.2, bedZ - 0.3]];
      for (const [px, pz] of pts) plushie(...(f.pt(px, pz).flatMap((v, i) => (i === 0 ? [v, 0.72] : [v])) as [number, number, number]), 0.42, f.ry + (rnd() - 0.5) * 0.6, undefined, false);
      const [fx, fz] = f.pt(-0.6 + 0.9, bedZ + 1.1);
      bunch(fx, 0.62, fz, 4, 1.3);
      const [tvx, tvz] = f.pt(0.2, D / 2 - 0.3);
      duck(tvx, 0.6, tvz, 1.5, f.ry + Math.PI);
      const [lx2, lz2] = f.pt(W / 2 - 0.5, 0.3);
      b.add(mSuitcase[Math.floor(rnd() * 4)], place(boxGeo(0.45, 0.7, 0.26), lx2, 0.35, lz2, 0, f.ry + 0.2, 0));
      k.collider(lx2 - 0.3, lx2 + 0.3, lz2 - 0.3, lz2 + 0.3, 0, 0.7, true);
      const [gx, gz] = f.pt(-W / 2 + 1.2, D / 2 - 1.8);
      plushie(gx, 0, gz, r.kind === "suite" ? 1.5 : 0.8, f.ry + Math.PI * 0.8, r.kind === "suite" ? "#86b9de" : undefined);
      if (r.kind === "suite") {
        for (let i = 0; i < 6; i++) plushie(...(f.pt(1.4 + (i % 3) * 0.35, D / 2 - 1.2 - Math.floor(i / 3) * 0.4).flatMap((v, j) => (j === 0 ? [v, 0] : [v])) as [number, number, number]), 0.35 + rnd() * 0.15, f.ry + Math.PI, undefined, false);
        const [bx2, bz2] = f.pt(1.2, 0.3);
        bunch(bx2, 0, bz2, 8, 2.1);
        const [cx2, cz2] = f.pt(W / 2 - 0.6, D / 2 - 0.7);
        ceramic(cx2, 0, cz2, 1.0, f.ry + Math.PI * 1.25, 3);
        k.collider(cx2 - 0.35, cx2 + 0.35, cz2 - 0.35, cz2 + 0.35, 0, 0.95, true);
      }
    } else if (r.kind === "bath" || r.kind === "spa") {
      if (r.kind === "bath") {
        bathtub(f, -1.2, -D / 2 + 0.6, 4);
        toilet(f, -W / 2 + 0.45, D / 2 - 0.9 + 0.3);
        vanity(f.sub(0, 0, Math.PI), -0.6, -(D / 2 - 0.35), 2.2);
        towels(f, W / 2 - 0.6, -D / 2 + 0.25, 4);
        plushie(...(f.pt(-W / 2 + 0.5, -D / 2 + 0.5).flatMap((v, i) => (i === 0 ? [v, 0] : [v])) as [number, number, number]), 0.5, f.ry + 0.5, "#86b9de");
        k.add(new THREE.BoxGeometry(1.2, 0.01, 0.7), k.mat(null, "#9fd3ef", [1, 1], { roughness: 1 }), [...(f.pt(-1.2, -D / 2 + 1.35).flatMap((v, i) => (i === 0 ? [v, 0.005] : [v])) as [number, number, number])], { rotY: f.ry, noShadow: true });
      } else {
        bathtub(f, -1.8, -D / 2 + 0.6, 5);
        bathtub(f, 1.0, -D / 2 + 0.6, 3);
        towels(f, W / 2 - 0.6, D / 2 - 0.25, 5);
        vanity(f.sub(0, 0, Math.PI), -1.0, -(D / 2 - 0.35), 3.0);
        // ברווז גומי ענק + פסל קרמיקה
        const [gx, gz] = f.pt(-W / 2 + 0.8, D / 2 - 1.8);
        duck(gx, 0, gz, 6, f.ry + 0.4);
        k.collider(gx - 0.45, gx + 0.45, gz - 0.45, gz + 0.45, 0, 0.75, true);
        const [cx2, cz2] = f.pt(W / 2 - 0.7, -D / 2 + 0.6);
        ceramic(cx2, 0, cz2, 0.8, f.ry + Math.PI * 0.75, 0);
        k.collider(cx2 - 0.3, cx2 + 0.3, cz2 - 0.3, cz2 + 0.3, 0, 0.78, true);
        for (let i = 0; i < 8; i++) {
          const [dx, dz] = f.pt(-1.5 + rnd() * 2.8, -0.2 + rnd() * 0.8);
          duck(dx, 0, dz, 1.2 + rnd() * 0.6);
        }
      }
    } else if (r.kind === "shop") {
      shelf(f.sub(0, -D / 2 + 0.25, 0), 0, 0, 3.4);
      shelf(f.sub(-W / 2 + 0.25, 0.4, Math.PI / 2), 0, 0, 3.0);
      shelf(f.sub(1.7, D / 2 - 0.25, Math.PI), 0, 0, 2.6);
      // דלפק
      const cf = f.sub(0.9, 1.2, 0);
      b.add(mWalnut, cf.put(boxGeo(1.8, 1.0, 0.6), 0, 0.5, 0), 1);
      b.add(mMarble, cf.put(boxGeo(1.9, 0.05, 0.7), 0, 1.02, 0), 1.2);
      cf.box(k, -0.95, 0.95, -0.35, 0.35, 0, 1.05, true);
      const [rx, rz] = cf.pt(-0.5, 0);
      b.add(mBlack, place(boxGeo(0.35, 0.2, 0.3), rx, 1.15, rz));
      for (let i = 0; i < 3; i++) {
        const [sx, sz] = cf.pt(0.2 + i * 0.25, 0.05);
        b.add(mGlass, place(new THREE.SphereGeometry(0.09, 16, 12), sx, 1.2, sz));
        b.add(mGold, place(new THREE.CylinderGeometry(0.08, 0.09, 0.08, 16), sx, 1.09, sz));
        plush.add(sx, 1.14, sz, f.ry, 0.12, penguinParts("#1f2d44"));
      }
      // ערימת בובות ענק ובלונים
      for (let i = 0; i < 9; i++) {
        const [px, pz] = f.pt(-1.2 + (i % 3) * 0.5 + (rnd() - 0.5) * 0.2, -0.7 + Math.floor(i / 3) * 0.5);
        plushie(px, Math.floor(i / 3) === 1 ? 0 : 0, pz, 0.5 + rnd() * 0.3, f.ry + Math.PI + (rnd() - 0.5), undefined, true);
      }
      for (const [bx2, bz2] of [[-2.5, 2.8], [2.8, -2.0], [2.6, 3.4]] as [number, number][]) {
        const [x, z] = f.pt(bx2, bz2);
        bunch(x, 0, z, 7, 2.0);
      }
      const [gx, gz] = f.pt(2.6, 0.6);
      plushie(gx, 0, gz, 1.6, f.ry - Math.PI / 2, "#18191d");
    }
  }

  // ---------- מסעדה ----------
  {
    b.add(mOak, place(new THREE.BoxGeometry(21.7, 0.1, 9.7), 0, -0.05, -12), 1.6);
    b.add(mCeil, place(new THREE.BoxGeometry(22, 0.2, 10), 0, WING_H + 0.1, -12), 3);
    // חיפוי נייבי + פס + כרכוב
    const rw: ["x" | "z", number, number, number, number, Op[]][] = [
      ["x", -7, -10.85, 10.85, -1, northOps], ["x", -17, -10.85, 10.85, 1, restWinOps],
      ["z", -11, -16.85, -7.15, 1, restOpsSide], ["z", 11, -16.85, -7.15, -1, restOpsSide],
    ];
    for (const [ax, c, a1, a2, s, ops] of rw) {
      band(ax, c, a1, a2, 0, 1.0, ops, mWainNavy, 0.03, s, 1);
      band(ax, c, a1, a2, 0.98, 1.05, ops, mTrim, 0.06, s);
      band(ax, c, a1, a2, WING_H - 0.16, WING_H, [], mTrim, 0.12, s);
      for (const op of ops) if (!op[2]) casing(ax, c, op[0], op[1], mWhiteWood);
    }
    for (const op of restWinOps) windowAt("x", -17, op[0], op[1], op[2]!, op[3]!, 1, mNavyVelvet);
    for (const [x, z] of [[-7.4, -10], [-7.4, -13.4], [0, -10.2], [0, -13.4], [7.4, -10], [7.4, -13.4]] as [number, number][]) {
      roundTable(x, z, 0.65, 4, mNavyVelvet);
      b.add(mGold, place(new THREE.CylinderGeometry(0.008, 0.008, 1.5, 6), x, WING_H - 0.75, z));
      b.add(mGlass, place(new THREE.SphereGeometry(0.22, 20, 14), x, WING_H - 1.6, z));
      b.add(mGlow, place(new THREE.SphereGeometry(0.08, 10, 8), x, WING_H - 1.6, z));
    }
    // מזנון ארוך עם עוגה, פסל קרח ומגשים
    const bz = -16.2;
    b.add(mCloth, place(boxGeo(9, 0.92, 0.9), 0, 0.46, bz), 0.6);
    b.add(mNavyVelvet, place(boxGeo(9.04, 0.2, 0.92), 0, 0.72, bz), 0.5);
    k.collider(-4.5, 4.5, bz - 0.45, bz + 0.45, 0, 0.93, true);
    for (let i = 0; i < 6; i++) {
      const x = -3.8 + i * 1.5;
      if (i === 2 || i === 3) continue;
      b.add(mChrome, place(boxGeo(0.9, 0.12, 0.5), x, 0.98, bz));
      b.add(mChrome, place(new THREE.SphereGeometry(0.3, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), x, 1.04, bz, 0, 0, 0, [1.4, 0.6, 0.8]));
    }
    // עוגת קומות
    const cakeM = k.mat(null, "#fbf7f2", [1, 1], { roughness: 0.5 });
    b.add(cakeM, place(lathe([[0, 0], [0.4, 0], [0.4, 0.25], [0.3, 0.25], [0.3, 0.47], [0.2, 0.47], [0.2, 0.65], [0, 0.65]], 32), -0.8, 0.93, bz));
    b.add(k.mat(null, "#7fb3dd", [1, 1], { roughness: 0.4 }), place(new THREE.TorusGeometry(0.4, 0.03, 8, 32), -0.8, 0.95, bz, Math.PI / 2, 0, 0));
    plush.add(-0.8, 1.58, bz, 0, 0.18, penguinParts("#18191d"));
    // פסל קרח של פינגווין
    const ice = new Spheres();
    ice.add(0.9, 0.93, bz, 0, 0.9, penguinParts("#cfeaff", "#e8f6ff", "#bfe3ff", "#9fd0f5"));
    ice.flush(k, k.mat(null, "#ffffff", [1, 1], { roughness: 0.05, emissive: "#9fd6ff", emissiveIntensity: 0.25 }));
    // עגלת קינוחים/עציצים
    plantPot(-10.2, -16.2, 1.1);
    plantPot(10.2, -16.2, 1.1);
    plantPot(-10.2, -7.8, 1.0);
    plantPot(10.2, -7.8, 1.0);
    plushie(-4.4, 0, -8.0, 0.8, Math.PI);
    bunch(4.8, 0, -8.0, 6, 1.9);
    ceramic(-9.9, 0, -12, 0.9, Math.PI / 2, 1);
    k.collider(-10.2, -9.6, -12.3, -11.7, 0, 0.9, true);
  }

  // ---------- סיום: מופעים ----------
  glossy.flush(k, mGlossyInst);
  plush.flush(k, mPlushInst);
  foil.flush(k, mFoilInst);
  if (strings.length) k.instances(new THREE.CylinderGeometry(0.004, 0.004, 1, 4), mString, strings, { noShadow: true });
  if (leaves.length) k.instances(new THREE.SphereGeometry(1, 8, 6), mLeaf, leaves);
  b.flush(k);

  // ---------- נקודות הופעה ----------
  const hiders = [...ring(SX, SZ, 5.0, 12), ...ring(SX, SZ, 6.2, 12).map((v) => v.sub(new V3(SX, 0, SZ)).applyAxisAngle(new V3(0, 1, 0), Math.PI / 12).add(new V3(SX, 0, SZ)))];
  return k.finish({
    id: "penguin", name: "Penguin Hotel",
    bounds: { minX: -21.8, maxX: 21.8, minZ: -16.8, maxZ: 16.8 },
    hunterSpawns: grid(0, 14.0, 9, 1.1),
    hiderSpawns: hiders,
    preview: { pos: [8.5, 6.2, 15.8], look: [-1.5, 2.6, 1.0], fov: 62 },
    lighting: {
      sky: "#dbeaf5",
      hemi: ["#eef5ff", "#8193a8", 0.5],
      sun: { color: "#fff4e4", int: 3.0, pos: [-9, 30, 12] },
      points: [
        { pos: [-6.5, 6.2, 4], color: "#ffe2b0", int: 22, dist: 18 },
        { pos: [6.5, 6.2, 4], color: "#ffe2b0", int: 22, dist: 18 },
        { pos: [0, 6.3, 12.8], color: "#ffe2b0", int: 20, dist: 16 },
        { pos: [0, 3.4, -12], color: "#ffd9a0", int: 16, dist: 14 },
        { pos: [-17.7, 3.3, -3], color: "#ffe6c4", int: 14, dist: 16 },
        { pos: [17.7, 3.3, -3], color: "#ffe6c4", int: 14, dist: 16 },
      ],
      exposure: 1.0,
      env: 0.5,
      hdri: "hall",
    },
  });
}
