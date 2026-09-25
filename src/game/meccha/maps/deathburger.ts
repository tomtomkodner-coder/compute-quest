// Death Burger (デスバーガー): an abandoned, creepy night-time fast-food amusement park.
// A red/white striped board fence with string lights rings the park; dark trees loom outside.
// South: the entrance arch (hunters enter here). Centre: the stone-paved plaza with the "DEATH BURGER" marquee sign on
// weathered yellow/white planks, a giant soda cup and balloons, a white picket fence and the waving "P" clown mascot
// statue (parody burger mascot). West-front: the burger-monster tower with its giant eyeball, lantern and tentacles.
// East: the chicken carousel crowned by a creepy bug. North: the Death Burger diner (front counter, kitchen line,
// dining booths on the terrace, eyeball-burger roof sign). West: a stage with a row of clown mascots, the circus cage
// wagon, a birdcage and a pumpkin patch. A backlit menu board stands at the east boundary.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import * as T from "../textures";
import * as D from "./tex/deathburger";
import { Kit, type Mat, type World } from "./kit";

type G = THREE.BufferGeometry;
type V3t = [number, number, number];
const V3 = THREE.Vector3;
const PI = Math.PI;

// ---------------------------------------------------------------------------------------------
// batching: everything is merged per material → few draw calls
function worldUV(g: G, uu: number, vu: number) {
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u: number, v: number;
    if (ax >= ay && ax >= az) { u = p.getZ(i) / uu; v = p.getY(i) / vu; }
    else if (ay >= az) { u = p.getX(i) / uu; v = p.getZ(i) / uu; }
    else { u = p.getX(i) / uu; v = p.getY(i) / vu; }
    uv.setXY(i, u, v);
  }
  uv.needsUpdate = true;
}
function scaleUV(g: G, su: number, sv: number) {
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
}
type BO = { flat?: boolean; rx?: number; ry?: number; rz?: number; s?: number | V3t; solid?: boolean; stand?: boolean; wuv?: [number, number]; su?: number; sv?: number };
class Batch {
  private lists = new Map<Mat, G[]>();
  private flags = new Map<Mat, boolean>();
  parent: THREE.Matrix4 | null = null;
  constructor(private k: Kit) {}
  noShadow(m: Mat) { this.flags.set(m, true); }
  geo(m: Mat, g: G, x: number, y: number, z: number, o: BO = {}) {
    if (o.su || o.sv) scaleUV(g, o.su ?? 1, o.sv ?? 1);
    const e = new THREE.Euler(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0, "YXZ");
    const sc = typeof o.s === "number" ? new V3(o.s, o.s, o.s) : o.s ? new V3(...o.s) : new V3(1, 1, 1);
    g.applyMatrix4(new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(e), sc));
    if (this.parent) g.applyMatrix4(this.parent);
    if (o.wuv) worldUV(g, o.wuv[0], o.wuv[1]);
    if (o.solid) {
      g.computeBoundingBox();
      const b = g.boundingBox!;
      this.k.collider(b.min.x, b.max.x, b.min.z, b.max.z, b.min.y, b.max.y, !!o.stand);
    }
    let l = this.lists.get(m);
    if (!l) this.lists.set(m, (l = []));
    l.push(g);
    return g;
  }
  geoM(m: Mat, g: G, mat: THREE.Matrix4) {
    g.applyMatrix4(mat);
    return this.geo(m, g, 0, 0, 0);
  }
  /** box, y = bottom */
  box(m: Mat, w: number, h: number, d: number, x: number, y: number, z: number, o: BO = {}) {
    const mn = Math.min(w, h, d), mx = Math.max(w, h, d);
    const g = o.flat || mn < 0.05 || mx > 6 ? new THREE.BoxGeometry(w, h, d) : new RoundedBoxGeometry(w, h, d, 1, Math.min(0.03, mn * 0.2));
    return this.geo(m, g, x, y + h / 2, z, o);
  }
  cyl(m: Mat, rt: number, rb: number, h: number, x: number, y: number, z: number, o: BO & { seg?: number; open?: boolean } = {}) {
    return this.geo(m, new THREE.CylinderGeometry(rt, rb, h, o.seg ?? 20, 1, o.open), x, y + h / 2, z, o);
  }
  lathe(m: Mat, pts: [number, number][], x: number, y: number, z: number, o: BO & { seg?: number } = {}) {
    return this.geo(m, new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(Math.max(0, r), h)), o.seg ?? 24), x, y, z, o);
  }
  sphere(m: Mat, r: number, x: number, y: number, z: number, o: BO & { ws?: number; hs?: number } = {}) {
    return this.geo(m, new THREE.SphereGeometry(r, o.ws ?? 16, o.hs ?? 12), x, y, z, o);
  }
  tube(m: Mat, pts: V3t[], r: number, o: { seg?: number; rs?: number; closed?: boolean; su?: number; sv?: number } = {}) {
    const c = new THREE.CatmullRomCurve3(pts.map((p) => new V3(...p)), !!o.closed, "centripetal");
    return this.geo(m, new THREE.TubeGeometry(c, o.seg ?? Math.max(8, pts.length * 6), r, o.rs ?? 8, !!o.closed), 0, 0, 0, { su: o.su, sv: o.sv });
  }
  /** cylinder / capsule between two points */
  rod(m: Mat, r: number, a: V3t, b: V3t, seg = 8, capsule = false) {
    const va = new V3(...a), vb = new V3(...b);
    const len = va.distanceTo(vb);
    const g = capsule ? new THREE.CapsuleGeometry(r, Math.max(0.001, len - 2 * r), 3, seg) : new THREE.CylinderGeometry(r, r, len, seg, 1);
    const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), vb.clone().sub(va).normalize());
    g.applyMatrix4(new THREE.Matrix4().compose(va.clone().add(vb).multiplyScalar(0.5), q, new V3(1, 1, 1)));
    return this.geo(m, g, 0, 0, 0);
  }
  cone(m: Mat, r: number, h: number, x: number, y: number, z: number, o: BO = {}) {
    return this.geo(m, new THREE.ConeGeometry(r, h, 12), x, y + h / 2, z, o);
  }
  flush() {
    for (const [m, l] of this.lists) if (l.length) this.k.merged(l, m, { noShadow: this.flags.get(m) });
    this.lists.clear();
  }
}

/** tapered tube (tentacles, horns): radius goes from r0 at the start to r1 at the end */
function taperTube(pts: V3t[], r0: number, r1: number, seg = 40, rs = 12) {
  const c = new THREE.CatmullRomCurve3(pts.map((p) => new V3(...p)), false, "centripetal");
  const g = new THREE.TubeGeometry(c, seg, 1, rs, false);
  const p = g.attributes.position;
  const cen = new V3(), v = new V3();
  for (let i = 0; i <= seg; i++) {
    c.getPointAt(i / seg, cen);
    const t = i / seg;
    const rad = r1 + (r0 - r1) * Math.pow(1 - t, 1.25);
    for (let j = 0; j <= rs; j++) {
      const idx = i * (rs + 1) + j;
      v.fromBufferAttribute(p, idx).sub(cen).multiplyScalar(rad).add(cen);
      p.setXYZ(idx, v.x, v.y, v.z);
    }
  }
  g.computeVertexNormals();
  return { g, curve: c, normals: g.normals };
}

/** ribbed pumpkin body of radius 1 (flattened), grooves line up with dbPumpkin's rib lines */
function pumpkinGeo(ribs = 8) {
  const g = new THREE.SphereGeometry(1, 32, 16);
  const p = g.attributes.position;
  const v = new V3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const phi = Math.atan2(v.z, v.x);
    const f = 1 - 0.09 * (1 + Math.cos(ribs * phi)) * 0.5;
    const top = v.y > 0.75 ? (v.y - 0.75) * 0.9 : 0;
    p.setXYZ(i, v.x * f, v.y * 0.72 - top * 0.5, v.z * f);
  }
  g.computeVertexNormals();
  return g;
}

/** matrix: position + yaw + uniform scale */
function place(x: number, y: number, z: number, ry = 0, s = 1) {
  return new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new V3(s, s, s));
}

export function buildDeathBurger(): World {
  const k = new Kit(3.2, 2.6);
  const B = new Batch(k);
  const rnd = D.dbRng(1234);
  const R = (a: number, b: number) => a + rnd() * (b - a);

  // ------------------------------------------------------------------------------------------- materials
  const tx = <T2 extends () => T.PaintTex>(key: string, f: T2) => k.tex("db_" + key, f);
  const mGrass = k.mat(tx("grass", D.dbGrass), "#fff", [1, 1], { roughness: 0.95, bump: 0.5 });
  const mStone = k.mat(tx("stone", D.dbStone), "#fff", [1, 1], { roughness: 0.88, bump: 0.8 });
  const mFence = k.mat(tx("fence", () => D.dbPlank("#b3261f|#e2dccb", 3, 2)), "#fff", [1, 1], { roughness: 0.85, bump: 0.6 });
  const mPlankY = k.mat(tx("plankY", () => D.dbPlank("#e2b61e", 5)), "#fff", [1, 1], { roughness: 0.8, bump: 0.55 });
  const mPlankW = k.mat(tx("plankW", () => D.dbPlank("#e8e2d0", 7)), "#fff", [1, 1], { roughness: 0.8, bump: 0.55 });
  const mPicket = k.mat(tx("picket", () => D.dbPlank("#f2f0ea", 9)), "#fff", [1, 1], { roughness: 0.55, bump: 0 });
  const lettersTex = tx("letters", D.dbLetters);
  const mLetters = k.mat(lettersTex, "#fff", [1, 1], { transparent: true, roughness: 0.5, metalness: 0.4, emissive: "#ffffff", emissiveIntensity: 0.45 });
  const mLettersBack = k.mat(lettersTex, "#2a1a10", [1, 1], { transparent: true, roughness: 0.7 });
  const mBadge = k.mat(tx("badge", D.dbBurgerBadge), "#fff", [1, 1], { metalness: 0.45, roughness: 0.55, bump: 0 });
  const mRustDark = k.mat(tx("rustDark", () => D.dbRust("#4a3a30", 3)), "#fff", [1, 1], { metalness: 0.5, roughness: 0.6, bump: 0 });
  const mGold = k.mat(tx("gold", () => D.dbRust("#b8913e", 6)), "#fff", [1, 1], { metalness: 0.75, roughness: 0.4, bump: 0 });
  const mRedPaint = k.mat(tx("redPaint", () => D.dbRust("#a8231d", 7)), "#fff", [1, 1], { metalness: 0.15, roughness: 0.5, bump: 0 });
  const mBluePlastic = k.mat(null, "#1f57d4", [1, 1], { roughness: 0.3 });
  const mWhitePlastic = k.mat(null, "#f3efe6", [1, 1], { roughness: 0.38 });
  const mYellowPlastic = k.mat(null, "#ffb11c", [1, 1], { roughness: 0.35 });
  const mSleeve = k.mat(tx("sleeve", () => D.dbStripes("#f6ad17", "#f4f0e4", 2)), "#fff", [1, 1], { roughness: 0.4, bump: 0 });
  const mSleeveR = k.mat(tx("sleeveR", () => D.dbStripes("#c8241c", "#f4f0e4", 3)), "#fff", [1, 1], { roughness: 0.4, bump: 0 });
  const mSleeveG = k.mat(tx("sleeveG", () => D.dbStripes("#3a9a3a", "#f4f0e4", 4)), "#fff", [1, 1], { roughness: 0.4, bump: 0 });
  const mHair = k.mat(tx("hair", () => T.noise("#f6b122", 0.15, 5, 2000)), "#fff", [1, 1], { roughness: 0.6, bump: 0 });
  const mHairR = k.mat(tx("hairR", () => T.noise("#d8421c", 0.15, 6, 2000)), "#fff", [1, 1], { roughness: 0.6, bump: 0 });
  const mOrange = k.mat(null, "#f0861a", [1, 1], { roughness: 0.35 });
  const mBlack = k.mat(null, "#141212", [1, 1], { roughness: 0.4 });
  const mShoe = k.mat(null, "#7a1a16", [1, 1], { roughness: 0.3 });
  const mSuitR = k.mat(null, "#b8231c", [1, 1], { roughness: 0.35 });
  const mSuitP = k.mat(null, "#6a2ca0", [1, 1], { roughness: 0.35 });
  const mSuitG = k.mat(null, "#2e8a3a", [1, 1], { roughness: 0.35 });
  const mBulb = k.mat(null, "#fff2c0", [1, 1], { emissive: "#ffc860", emissiveIntensity: 2.4, roughness: 0.3 });
  const mBulbR = k.mat(null, "#ff9a8a", [1, 1], { emissive: "#ff3a2a", emissiveIntensity: 2.2, roughness: 0.3 });
  const mBulbG = k.mat(null, "#a8ffb0", [1, 1], { emissive: "#40ff70", emissiveIntensity: 2.0, roughness: 0.3 });
  const mBulbB = k.mat(null, "#a8c8ff", [1, 1], { emissive: "#4a8aff", emissiveIntensity: 2.2, roughness: 0.3 });
  const mLantern = k.mat(null, "#ffe7a0", [1, 1], { emissive: "#ffb640", emissiveIntensity: 2.0, roughness: 0.2 });
  const mLampGreen = k.mat(tx("lampGreen", () => D.dbRust("#2e4a34", 9)), "#fff", [1, 1], { metalness: 0.6, roughness: 0.45, bump: 0 });
  const mCable = k.mat(null, "#1a1816", [1, 1], { roughness: 0.7 });
  const mChicken = k.mat(tx("chicken", () => T.noise("#efe9dc", 0.1, 8, 1800)), "#fff", [1, 1], { roughness: 0.5, bump: 0 });
  const mComb = k.mat(null, "#cc1f18", [1, 1], { roughness: 0.4 });
  const mBun = k.mat(tx("bun", D.dbBun), "#fff", [1, 1], { roughness: 0.55, bump: 0.5 });
  const mPatty = k.mat(tx("patty", () => T.noise("#4a2a18", 0.25, 7, 3000)), "#fff", [1, 1], { roughness: 0.8, bump: 0 });
  const mCheese = k.mat(null, "#f5c01c", [1, 1], { roughness: 0.4 });
  const mLettuce = k.mat(tx("lettuce", () => T.noise("#5ea235", 0.2, 3, 1500)), "#fff", [1, 1], { roughness: 0.55, bump: 0 });
  const mTomato = k.mat(null, "#c8241a", [1, 1], { roughness: 0.3 });
  const mEye = k.mat(tx("eye", D.dbEye), "#fff", [1, 1], { roughness: 0.22, bump: 0 });
  const mPumpkin = k.mat(tx("pumpkin", () => D.dbPumpkin(8)), "#fff", [1, 1], { roughness: 0.5, bump: 0 });
  const mStem = k.mat(null, "#5a4a22", [1, 1], { roughness: 0.8 });
  const mTentacle = k.mat(tx("tentacle", D.dbTentacle), "#fff", [1, 1], { roughness: 0.35, bump: 0 });
  const mSucker = k.mat(null, "#f2b8a6", [1, 1], { roughness: 0.4 });
  const balloonCols = ["#d8231c", "#f5c81c", "#2aa84a", "#f2efe8", "#e0701a"];
  const mBalloons = balloonCols.map((c) => k.mat(null, c, [1, 1], { roughness: 0.22 }));
  const mBark = k.mat(tx("bark", () => T.noise("#2a211a", 0.25, 2, 2500)), "#fff", [1, 1], { roughness: 0.95, bump: 0 });
  const mLeaves = k.mat(tx("leaves", T.leaves), "#3a4a2a", [2, 2], { roughness: 0.95, bump: 0 });
  const mDiner = k.mat(tx("diner", D.dbDinerFloor), "#fff", [1, 1], { roughness: 0.45, bump: 0.2 });
  const mTileWall = k.mat(tx("tileWall", D.dbWallTile), "#fff", [1, 1], { roughness: 0.4, bump: 0.5 });
  const mSteel = k.mat(tx("steel", () => T.noise("#a4a8aa", 0.1, 4, 1500)), "#fff", [1, 1], { metalness: 0.85, roughness: 0.35, bump: 0 });
  const mGrill = k.mat(tx("grillTop", () => T.bars()), "#2a2624", [4, 4], { metalness: 0.7, roughness: 0.5, bump: 0 });
  const mVinyl = k.mat(tx("vinyl", () => T.noise("#9e1f1a", 0.12, 11, 1500)), "#fff", [1, 1], { roughness: 0.4, bump: 0 });
  const mTableTop = k.mat(tx("tableTop", () => T.noise("#e4ddce", 0.08, 12, 1200)), "#fff", [1, 1], { roughness: 0.35, bump: 0 });
  const mRoof = k.mat(tx("roof", () => T.concrete("#3a3632", 8)), "#fff", [1, 1], { roughness: 0.9, bump: 0 });
  const mAwning = k.mat(tx("awning", () => D.dbStripes("#b3221c", "#e8e0cc", 5)), "#fff", [1, 1], { roughness: 0.7, bump: 0 });
  const mMenu = k.mat(tx("menu", D.dbMenu), "#fff", [1, 1], { roughness: 0.4, emissive: "#ffffff", emissiveIntensity: 0.55, bump: 0 });
  const mPBadge = k.mat(tx("pbadge", D.dbPBadge), "#fff", [1, 1], { transparent: true, roughness: 0.35 });
  const mWoodDark = k.mat(tx("woodDark", () => T.wood("#4a3222", "#2a1a10", 4)), "#fff", [1, 1], { roughness: 0.8, bump: 0.8 });
  const mDeck = k.mat(tx("deck", () => T.wood("#7a5a3a", "#3a2616", 6)), "#fff", [2, 2], { roughness: 0.75, bump: 0.8 });
  const mCrate = k.mat(tx("crate", T.crate), "#b8a890", [1, 1], { roughness: 0.85, bump: 0 });
  const mGlassDark = k.mat(null, "#0e1216", [1, 1], { roughness: 0.1, metalness: 0.3 });
  const mFluo = k.mat(null, "#fff6e0", [1, 1], { emissive: "#ffe8c0", emissiveIntensity: 1.6 });
  const mOil = k.mat(null, "#3a2a10", [1, 1], { roughness: 0.1, metalness: 0.2 });
  for (const m of [mBulb, mBulbR, mBulbG, mBulbB, mCable, mLantern]) B.noShadow(m);

  // ------------------------------------------------------------------------------------------- ground
  const FX = 22, FZ = 20; // fence lines
  k.floor(-46, 46, -44, 44, mGrass, 2.5);
  // irregular stone paving slabs with grass in the gaps (instanced, one draw call)
  {
    const list: { pos: V3t; rotY: number; scale: V3t; color: string }[] = [];
    const paved = (x: number, z: number) =>
      (x > -19.5 && x < 19.5 && z > -12 && z < 19.4) || (Math.abs(x) < 2.8 && z > 19 && z < 23);
    const step = 0.95;
    for (let z = -12; z < 23; z += step)
      for (let x = -19.5; x < 19.5; x += step) {
        if (!paved(x, z)) continue;
        const edge = Math.min(x + 19.5, 19.5 - x, z + 12);
        if (rnd() < (edge < 2.5 ? 0.3 : 0.06)) continue;
        const sx = R(0.72, 0.9), sz = R(0.72, 0.9);
        const t = Math.floor(R(118, 168));
        list.push({ pos: [x + R(-0.06, 0.06), 0.0, z + R(-0.06, 0.06)], rotY: R(-0.07, 0.07), scale: [sx, 1, sz], color: `rgb(${t},${t - 2},${t - 8})` });
      }
    const slab = new THREE.BoxGeometry(1, 0.05, 1);
    k.instances(slab, mStone, list, { noShadow: true });
  }

  // ------------------------------------------------------------------------------------------- perimeter fence
  // red/white weathered board fence, with posts and top rail; gate gap at the south
  const fenceH = 3.2;
  const fenceSeg = (x1: number, z1: number, x2: number, z2: number) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const alongX = Math.abs(z2 - z1) < 0.01;
    const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
    if (alongX) B.box(mFence, len, fenceH, 0.12, cx, 0, cz, { flat: true, wuv: [0.9, fenceH], solid: true });
    else B.box(mFence, 0.12, fenceH, len, cx, 0, cz, { flat: true, wuv: [0.9, fenceH], solid: true });
    // posts + rails every 3 m
    const n = Math.max(1, Math.round(len / 3));
    for (let i = 0; i <= n; i++) {
      const px = x1 + ((x2 - x1) * i) / n, pz = z1 + ((z2 - z1) * i) / n;
      B.box(mWoodDark, 0.16, fenceH + 0.15, 0.16, px, 0, pz);
    }
    const ins = 0.12;
    const nx = alongX ? 0 : -Math.sign(cx) * ins, nz = alongX ? -Math.sign(cz) * ins : 0;
    if (alongX) { B.box(mWoodDark, len, 0.1, 0.06, cx + nx, 2.6, cz + nz, { flat: true }); B.box(mWoodDark, len, 0.1, 0.06, cx + nx, 0.5, cz + nz, { flat: true }); }
    else { B.box(mWoodDark, 0.06, 0.1, len, cx + nx, 2.6, cz + nz, { flat: true }); B.box(mWoodDark, 0.06, 0.1, len, cx + nx, 0.5, cz + nz, { flat: true }); }
  };
  fenceSeg(-FX, -FZ, FX, -FZ);
  fenceSeg(-FX, -FZ, -FX, FZ);
  fenceSeg(FX, -FZ, FX, FZ);
  fenceSeg(-FX, FZ, -3.2, FZ);
  fenceSeg(3.2, FZ, FX, FZ);

  // ------------------------------------------------------------------------------------------- string lights helper
  const bulbGeo = new THREE.SphereGeometry(0.055, 8, 6);
  const bulbLists = new Map<Mat, { pos: V3t }[]>();
  const addBulb = (m: Mat, p: V3t) => { let l = bulbLists.get(m); if (!l) bulbLists.set(m, (l = [])); l.push({ pos: p }); };
  const cableBulbs = [mBulb, mBulb, mBulbR, mBulb, mBulbG, mBulb, mBulbB];
  const stringLight = (a: V3t, b: V3t, sag: number, spacing = 0.6, cols = cableBulbs) => {
    const pts: V3t[] = [];
    const n = 10;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t]);
    }
    B.tube(mCable, pts, 0.012, { seg: 20, rs: 4 });
    const len = Math.hypot(b[0] - a[0], b[2] - a[2]);
    const nb = Math.max(2, Math.floor(len / spacing));
    for (let i = 1; i < nb; i++) {
      const t = i / nb;
      addBulb(cols[i % cols.length], [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t) - 0.07, a[2] + (b[2] - a[2]) * t]);
    }
  };
  // along the fence top (inside), swagged between posts
  {
    const warm = [mBulb];
    const run = (x1: number, z1: number, x2: number, z2: number) => {
      const len = Math.hypot(x2 - x1, z2 - z1);
      const n = Math.max(1, Math.round(len / 3));
      for (let i = 0; i < n; i++) {
        const ax = x1 + ((x2 - x1) * i) / n, az = z1 + ((z2 - z1) * i) / n;
        const bx = x1 + ((x2 - x1) * (i + 1)) / n, bz = z1 + ((z2 - z1) * (i + 1)) / n;
        stringLight([ax, 3.05, az], [bx, 3.05, bz], 0.35, 0.55, warm);
      }
    };
    const o = 0.2;
    run(-FX + o, -FZ + o, FX - o, -FZ + o);
    run(-FX + o, -FZ + o, -FX + o, FZ - o);
    run(FX - o, -FZ + o, FX - o, FZ - o);
    run(-FX + o, FZ - o, -3.2, FZ - o);
    run(3.2, FZ - o, FX - o, FZ - o);
  }

  // ------------------------------------------------------------------------------------------- lamp posts with lanterns
  const lantern = (x: number, y: number, z: number, s = 1) => {
    B.box(mLampGreen, 0.34 * s, 0.05 * s, 0.34 * s, x, y, z);
    B.box(mLantern, 0.26 * s, 0.38 * s, 0.26 * s, x, y + 0.05 * s, z, { flat: true });
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B.box(mLampGreen, 0.035 * s, 0.4 * s, 0.035 * s, x + dx * 0.14 * s, y + 0.04 * s, z + dz * 0.14 * s, { flat: true });
    B.lathe(mLampGreen, [[0.22 * s, 0], [0.24 * s, 0.03 * s], [0.12 * s, 0.14 * s], [0.03 * s, 0.2 * s], [0, 0.24 * s]], x, y + 0.43 * s, z, { seg: 4, ry: PI / 4 });
  };
  const lampPost = (x: number, z: number, h = 3.4) => {
    B.lathe(mLampGreen, [[0.2, 0], [0.2, 0.12], [0.13, 0.18], [0.1, 0.5], [0.07, 0.6], [0.06, h - 0.1], [0.09, h]], x, 0, z, { seg: 12 });
    k.collider(x - 0.15, x + 0.15, z - 0.15, z + 0.15, 0, h, true);
    lantern(x, h, z, 1.1);
  };
  const posts: V3t[] = [[-9.5, 0, 14.5], [9.5, 0, 14.5], [-9.5, 0, 4.5], [9.5, 0, 4.5], [-14.5, 0, -9.5], [18.5, 0, -6.5], [-16.5, 0, 7.5], [11, 0, -12.8]];
  for (const p of posts) lampPost(p[0], p[2]);
  stringLight([-9.5, 3.3, 14.5], [9.5, 3.3, 14.5], 0.9, 0.5);
  stringLight([-9.5, 3.3, 4.5], [9.5, 3.3, 4.5], 0.9, 0.5);
  stringLight([-9.5, 3.3, 14.5], [-9.5, 3.3, 4.5], 0.6, 0.5);
  stringLight([9.5, 3.3, 14.5], [9.5, 3.3, 4.5], 0.6, 0.5);
  stringLight([-9.5, 3.3, 14.5], [9.5, 3.3, 4.5], 1.1, 0.5);

  // ------------------------------------------------------------------------------------------- entrance arch (south)
  {
    const gz = FZ;
    for (const s of [-1, 1]) {
      const x = s * 3.2;
      // striped post: stacked red/white bands
      for (let i = 0; i < 8; i++) B.cyl(i % 2 ? mWhitePlastic : mRedPaint, 0.3, 0.3, 0.55, x, i * 0.55, gz, { seg: 16 });
      B.sphere(mGold, 0.36, x, 4.62, gz);
      k.collider(x - 0.35, x + 0.35, gz - 0.35, gz + 0.35, 0, 4.4, true);
    }
    // top board with marquee letters
    B.box(mRedPaint, 6.9, 1.0, 0.2, 0, 3.55, gz, { flat: true });
    B.box(mGold, 7.0, 0.08, 0.26, 0, 3.52, gz, { flat: true });
    B.box(mGold, 7.0, 0.08, 0.26, 0, 4.52, gz, { flat: true });
    for (const side of [-1, 1]) {
      const pl = new THREE.PlaneGeometry(4.2, 1.0);
      B.geo(mLetters, pl, 0, 4.05, gz + side * 0.13, { ry: side > 0 ? 0 : PI });
    }
    for (let i = 0; i <= 22; i++) { addBulb(mBulb, [-3.4 + (6.8 * i) / 22, 3.47, gz - 0.16]); addBulb(mBulb, [-3.4 + (6.8 * i) / 22, 4.6, gz - 0.16]); }
    // hanging lanterns
    for (const s of [-1, 1]) { B.rod(mLampGreen, 0.02, [s * 2.4, 3.5, gz - 0.1], [s * 2.4, 3.2, gz - 0.1]); lantern(s * 2.4, 2.72, gz - 0.1, 0.9); }
  }

  // ------------------------------------------------------------------------------------------- tentacles
  const tentacle = (x: number, z: number, ry: number, s: number, curl = 1) => {
    const base: V3t[] = [[0, -0.2, 0], [0.15, 0.8, 0.1], [0.05, 1.7, 0.35], [-0.35 * curl, 2.45, 0.3], [-0.6 * curl, 2.9, -0.15], [-0.45 * curl, 3.2, -0.55], [-0.1 * curl, 3.15, -0.6]];
    const M = place(x, 0, z, ry, s);
    const pts = base.map((p) => new V3(...p).applyMatrix4(M).toArray() as V3t);
    const { g, curve, normals } = taperTube(pts, 0.34 * s, 0.035 * s, 48, 14);
    B.geo(mTentacle, g, 0, 0, 0);
    // suckers along the inner side
    for (let i = 3; i < 26; i += 2) {
      const t = i / 48;
      const c = curve.getPointAt(t);
      const nrm = normals[i];
      const rad = 0.035 * s + (0.34 * s - 0.035 * s) * Math.pow(1 - t, 1.25);
      const p = c.clone().addScaledVector(nrm, -rad * 0.92);
      const sg = new THREE.SphereGeometry(rad * 0.38, 10, 6);
      sg.scale(1, 1, 0.45);
      sg.lookAt(nrm.clone().negate());
      B.geo(mSucker, sg, p.x, p.y, p.z);
    }
    k.collider(x - 0.35 * s, x + 0.35 * s, z - 0.35 * s, z + 0.35 * s, 0, 2.2 * s, false);
  };

  // ------------------------------------------------------------------------------------------- burger monster (eyeball burger)
  /** burger in local coords facing +z: base at y=0, radius ~1.7 (before scale), eyeball bulging out of the top bun */
  const burger = (M: THREE.Matrix4, plinth: boolean) => {
    B.parent = M;
    let y = 0;
    if (plinth) {
      B.cyl(mStone, 1.75, 1.85, 0.45, 0, 0, 0, { seg: 28 });
      y = 0.45;
    }
    B.lathe(mBun, [[0, 0], [1.45, 0], [1.6, 0.12], [1.62, 0.4], [1.5, 0.6], [0, 0.6]], 0, y, 0, { seg: 32 });
    y += 0.6;
    B.cyl(mPatty, 1.72, 1.7, 0.5, 0, y, 0, { seg: 32 });
    y += 0.5;
    // cheese: stepped slices hanging over the rim
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2 + 0.3;
      B.box(mCheese, 0.75, 0.12, 0.75, Math.sin(a) * 1.5, y - 0.02, Math.cos(a) * 1.5, { ry: a + PI / 4 });
      B.box(mCheese, 0.3, 0.35, 0.08, Math.sin(a) * 1.85, y - 0.3, Math.cos(a) * 1.85, { ry: a });
    }
    B.cyl(mCheese, 1.62, 1.62, 0.1, 0, y, 0, { seg: 32 });
    y += 0.1;
    // frilly lettuce
    const lt = new THREE.TorusGeometry(1.68, 0.16, 8, 48);
    const lp = lt.attributes.position;
    for (let i = 0; i < lp.count; i++) {
      const vx = lp.getX(i), vy = lp.getY(i), vz = lp.getZ(i);
      const a = Math.atan2(vy, vx);
      lp.setZ(i, vz + Math.sin(a * 14) * 0.07);
    }
    lt.computeVertexNormals();
    B.geo(mLettuce, lt, 0, y + 0.05, 0, { rx: PI / 2 });
    B.cyl(mTomato, 1.58, 1.58, 0.22, 0, y + 0.05, 0, { seg: 32 });
    y += 0.27;
    // top bun dome
    const dome: [number, number][] = [];
    for (let i = 0; i <= 12; i++) { const a = (i / 12) * (PI / 2); dome.push([1.7 * Math.cos(a) + (i === 0 ? 0.02 : 0), 1.6 * Math.sin(a)]); }
    B.lathe(mBun, dome, 0, y, 0, { seg: 36 });
    // marquee bulbs along the rim and along the front meridians
    B.parent = null;
    const bp = (lx: number, ly: number, lz: number, m = mBulb) => { const v = new V3(lx, ly, lz).applyMatrix4(M); addBulb(m, [v.x, v.y, v.z]); };
    for (let i = 0; i < 40; i++) { const a = (i / 40) * PI * 2; bp(Math.sin(a) * 1.74, y + 0.05, Math.cos(a) * 1.74); }
    for (const ang of [-0.9, 0.9]) for (let i = 1; i < 11; i++) { const a = (i / 12) * (PI / 2); const r = 1.74 * Math.cos(a); bp(Math.sin(ang) * r, y + 1.63 * Math.sin(a), Math.cos(ang) * r); }
    B.parent = M;
    // eyeball bursting from the front of the bun, with a bun "eyelid"
    B.sphere(mEye, 0.95, 0, y + 0.55, 1.15, { ws: 32, hs: 20 });
    const lid = new THREE.TorusGeometry(0.98, 0.14, 8, 24, PI);
    B.geo(mBun, lid, 0, y + 0.55, 1.18, { rx: -0.25 });
    B.parent = null;
    return y + 1.6;
  };
  // the big burger tower at the west side of the plaza
  {
    const tX = -8.6, tZ = 8.6, ry = 0.75;
    const M = place(tX, 0, tZ, ry, 1);
    const top = burger(M, true);
    k.collider(tX - 1.75, tX + 1.75, tZ - 1.75, tZ + 1.75, 0, top, true);
    // lantern on a bracket
    const lp = new V3(-1.2, 2.9, 1.55).applyMatrix4(M);
    const la = new V3(-0.6, 3.2, 1.0).applyMatrix4(M);
    B.rod(mLampGreen, 0.03, [la.x, la.y, la.z], [lp.x, lp.y + 0.55, lp.z]);
    lantern(lp.x, lp.y, lp.z, 1.3);
    tentacle(tX + 1.2, tZ - 1.6, 2.2, 1.15);
    tentacle(tX - 0.9, tZ + 1.9, 0.4, 0.9, -1);
    tentacle(tX - 1.6, tZ - 1.5, -1.8, 1.3);
  }
  tentacle(-4.6, 18.4, 0.5, 1.0);
  tentacle(4.6, 18.4, -0.4, 1.05, -1);
  tentacle(19.2, 7.5, -2.0, 1.4);
  tentacle(-19.4, -10.5, 1.2, 1.5, -1);
  tentacle(14.5, -14.5, 3.0, 1.2);
  tentacle(-12.5, -11.2, 0.2, 0.9);

  // balloon clusters
  const cluster = (x0: number, y0: number, z0: number, n: number, rad = 0.26) => {
    for (let b = 0; b < n; b++) {
      const a = rnd() * PI * 2, rr = R(0, 0.45), yy = R(-0.2, 0.45);
      const bx = x0 + Math.cos(a) * rr, bz = z0 + Math.sin(a) * rr, by = y0 + yy;
      const m = mBalloons[b % mBalloons.length];
      const g = new THREE.SphereGeometry(rad, 16, 12);
      B.geo(m, g, bx, by, bz, { s: [1, 1.12, 1] });
      B.cyl(m, 0.02, 0.05, 0.06, bx, by - rad * 1.12 - 0.05, bz, { seg: 6 });
      B.tube(mCable, [[bx, by - rad * 1.12 - 0.05, bz], [(bx + x0) / 2 + 0.05, (by + y0) / 2 - 0.4, (bz + z0) / 2], [x0, y0 - 0.9, z0]], 0.006, { seg: 6, rs: 3 });
    }
  };
  // ------------------------------------------------------------------------------------------- DEATH BURGER sign
  {
    const sz = 2.0;
    // weathered planks of varying height, alternating yellow / white
    let x = -4.6;
    let i = 0;
    while (x < 3.0) {
      const w = R(0.46, 0.58);
      const h = R(3.25, 3.65);
      B.box(i % 2 ? mPlankW : mPlankY, w - 0.02, h, 0.08, x + w / 2, 0, sz, { rz: R(-0.012, 0.012) });
      x += w;
      i++;
    }
    // back frame
    B.box(mWoodDark, 7.6, 0.12, 0.1, -0.8, 0.6, sz - 0.1, { flat: true });
    B.box(mWoodDark, 7.6, 0.12, 0.1, -0.8, 2.6, sz - 0.1, { flat: true });
    for (const px of [-4.2, -1.6, 1.0, 2.7]) B.box(mWoodDark, 0.12, 3.1, 0.12, px, 0, sz - 0.18);
    k.collider(-4.7, 3.1, sz - 0.3, sz + 0.1, 0, 3.3, true);
    // marquee letters with a dark back layer for depth
    const lw = 4.8, lh = 2.4;
    B.geo(mLettersBack, new THREE.PlaneGeometry(lw, lh), -1.55, 1.75, sz + 0.07);
    B.geo(mLettersBack, new THREE.PlaneGeometry(lw, lh), -1.55, 1.75, sz + 0.1);
    B.geo(mLetters, new THREE.PlaneGeometry(lw, lh), -1.55, 1.75, sz + 0.13);
    // rusty burger badge
    const bd = new THREE.CylinderGeometry(0.72, 0.72, 0.1, 32);
    B.geo(mBadge, bd, 1.55, 2.25, sz + 0.12, { rx: PI / 2, ry: 0 });
    B.cyl(mRustDark, 0.75, 0.75, 0.06, 1.55, 2.25, sz + 0.07, { rx: PI / 2 });
    // leaning planks on the right (second board group)
    let x2 = 3.6;
    for (let j = 0; j < 5; j++) {
      const w = R(0.45, 0.55), h = R(2.6, 3.1);
      B.box(j % 2 ? mPlankW : mPlankY, w - 0.02, h, 0.08, x2 + w / 2, 0, sz - 0.6 - j * 0.12, { ry: -0.28, rz: R(-0.06, 0.06) });
      x2 += w * 0.96;
    }
    k.collider(3.5, 6.2, sz - 1.3, sz - 0.3, 0, 3.0, true);
    // giant soda cup on a post behind the sign
    const cx = 1.3, cz = sz - 0.9;
    B.cyl(mRustDark, 0.08, 0.08, 3.4, cx, 0, cz, { seg: 10 });
    B.lathe(mRedPaint, [[0, 0], [0.45, 0], [0.62, 1.6], [0.66, 1.65], [0, 1.65]], cx, 3.4, cz, { seg: 28 });
    B.lathe(mPlankW, [[0.5, 0.35], [0.56, 0.9], [0.585, 1.05], [0.53, 1.05]], cx, 3.4, cz, { seg: 28 });
    B.lathe(mWhitePlastic, [[0, 1.65], [0.68, 1.65], [0.66, 1.75], [0.4, 1.82], [0, 1.83]], cx, 3.4, cz, { seg: 28 });
    B.tube(mSleeveR, [[cx + 0.1, 5.1, cz], [cx + 0.14, 5.8, cz + 0.05], [cx + 0.3, 6.1, cz + 0.12]], 0.07, { su: 6, seg: 16 });
    cluster(-3.1, 4.0, sz - 0.05, 9);
    cluster(0.8, 3.75, sz - 0.1, 5);
    cluster(5.0, 3.6, sz - 1.0, 6);
  }

  // ------------------------------------------------------------------------------------------- white picket fence
  const picket = (x1: number, z1: number, x2: number, z2: number) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const ry = -Math.atan2(z2 - z1, x2 - x1);
    const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
    const dx = (x2 - x1) / len, dz = (z2 - z1) / len;
    const n = Math.max(1, Math.round(len / 1.8));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      B.box(mPicket, 0.12, 1.15, 0.12, x1 + (x2 - x1) * t, 0, z1 + (z2 - z1) * t, { ry });
      B.box(mPicket, 0.15, 0.04, 0.15, x1 + (x2 - x1) * t, 1.15, z1 + (z2 - z1) * t, { ry });
    }
    for (const y of [0.3, 0.62, 0.94]) B.box(mPicket, len, 0.14, 0.05, cx - dz * 0.07, y, cz + dx * 0.07, { ry });
    k.collider(Math.min(x1, x2) - 0.08, Math.max(x1, x2) + 0.08, Math.min(z1, z2) - 0.08, Math.max(z1, z2) + 0.08, 0, 1.15, true);
  };
  picket(-4.8, 5.4, 1.6, 5.4);
  picket(1.6, 5.4, 2.4, 4.6);
  picket(-12.5, 16.2, -9.2, 16.2);
  picket(10.2, 16.4, 13.8, 16.4);
  picket(-6, -7.4, -2.0, -7.4);
  picket(2.0, -7.4, 6.0, -7.4);

  // ------------------------------------------------------------------------------------------- clown mascots
  type ClownOpt = { suit: Mat; sleeve: Mat; hair: Mat; raise: boolean; hip?: boolean; badge?: boolean };
  const hand = (wrist: THREE.Vector3, dir: THREE.Vector3, side: THREE.Vector3, up: boolean, glove: Mat) => {
    const d = dir.clone().normalize(), sd = side.clone().normalize();
    const fz = new V3().crossVectors(sd, d).normalize();
    const basis = new THREE.Matrix4().makeBasis(sd, d, fz);
    const palmC = wrist.clone().addScaledVector(d, 0.07);
    const pg = new THREE.SphereGeometry(0.065, 12, 8);
    pg.scale(1.05, 1.1, 0.55);
    pg.applyMatrix4(basis);
    B.geo(glove, pg, palmC.x, palmC.y, palmC.z);
    B.rod(glove, 0.045, wrist.clone().addScaledVector(d, -0.05).toArray() as V3t, wrist.clone().addScaledVector(d, 0.03).toArray() as V3t, 10);
    const fl = up ? [0.2, 0.22, 0.21, 0.18] : [0.13, 0.15, 0.14, 0.12];
    for (let f = 0; f < 4; f++) {
      const off = (f - 1.5) * 0.034;
      const spread = up ? (f - 1.5) * 0.22 : (f - 1.5) * 0.08;
      const fd = d.clone().multiplyScalar(Math.cos(spread)).addScaledVector(sd, Math.sin(spread));
      const a = palmC.clone().addScaledVector(sd, off).addScaledVector(d, 0.04);
      const b = a.clone().addScaledVector(fd, fl[f]);
      B.rod(glove, 0.018, a.toArray() as V3t, b.toArray() as V3t, 8, true);
    }
    const ta = palmC.clone().addScaledVector(sd, -0.06);
    const tb = ta.clone().addScaledVector(sd, -0.1).addScaledVector(d, 0.06).addScaledVector(fz, 0.03);
    B.rod(glove, 0.02, ta.toArray() as V3t, tb.toArray() as V3t, 8, true);
  };
  /** statue/mascot in local units (height ≈1.85), placed by M (position, yaw, scale) */
  const clown = (M: THREE.Matrix4, o: ClownOpt) => {
    B.parent = M;
    // shoes, socks, legs
    for (const s of [-1, 1]) {
      B.sphere(mShoe, 0.12, s * 0.12, 0.07, 0.05, { s: [1, 0.62, 1.7] });
      B.tube(o.sleeve, [[s * 0.12, 0.08, 0], [s * 0.12, 0.26, 0]], 0.068, { su: 2, seg: 4, rs: 14 });
      B.cyl(o.suit, 0.125, 0.1, 0.62, s * 0.125, 0.24, 0, { seg: 16 });
    }
    // torso (jumpsuit)
    B.lathe(o.suit, [[0.0, 0.76], [0.19, 0.78], [0.25, 0.9], [0.265, 1.08], [0.25, 1.26], [0.21, 1.38], [0.14, 1.45], [0.0, 1.47]], 0, 0, 0, { s: [1, 1, 0.76], seg: 28 });
    B.box(mYellowPlastic, 0.028, 0.6, 0.02, 0, 0.8, 0.195, { flat: true, rx: -0.05 });
    for (const s of [-1, 1]) B.box(mYellowPlastic, 0.13, 0.025, 0.02, s * 0.13, 0.98, 0.19, { flat: true, rz: s * 0.45, ry: s * 0.35 });
    if (o.badge !== false) {
      const c = new THREE.CircleGeometry(0.058, 24);
      B.geo(mPBadge, c, 0.11, 1.25, 0.182, { ry: 0.45, rx: -0.15 });
    }
    // collar, neck, head
    B.geo(mWhitePlastic, new THREE.TorusGeometry(0.1, 0.035, 8, 20), 0, 1.45, 0, { rx: PI / 2 });
    B.cyl(mWhitePlastic, 0.075, 0.085, 0.14, 0, 1.44, 0, { seg: 14 });
    B.sphere(mWhitePlastic, 0.2, 0, 1.72, 0.01, { s: [0.95, 1.15, 0.95], ws: 24, hs: 18 });
    // face: eyes, brows, nose/mouth
    for (const s of [-1, 1]) {
      B.sphere(mBlack, 0.021, s * 0.06, 1.765, 0.178, { s: [1, 1.3, 0.6], ws: 10, hs: 8 });
      B.tube(mBlack, [[s * 0.028, 1.81, 0.178], [s * 0.065, 1.828, 0.172], [s * 0.105, 1.81, 0.155]], 0.009, { seg: 6, rs: 4 });
    }
    B.sphere(mOrange, 0.07, 0, 1.63, 0.16, { s: [1.2, 0.6, 0.75], ws: 14, hs: 8 });
    B.sphere(mOrange, 0.028, 0, 1.69, 0.185, { ws: 10, hs: 8 });
    // hair: puffy clumps around the back and the sides
    for (let i = 0; i < 12; i++) {
      const a = 0.9 + (i / 11) * (PI * 2 - 1.8);
      const yy = 1.78 + Math.sin(i * 1.7) * 0.05;
      B.sphere(o.hair, 0.1 + (i % 3) * 0.012, Math.sin(a) * 0.17, yy, Math.cos(a) * 0.15 - 0.01, { ws: 12, hs: 9 });
    }
    for (let i = 0; i < 5; i++) B.sphere(o.hair, 0.11, (i - 2) * 0.07, 1.9 - Math.abs(i - 2) * 0.02, -0.02 + (i % 2) * 0.05, { ws: 12, hs: 9 });
    // arms
    const sh: V3t[] = [[-0.26, 1.33, 0], [0.26, 1.33, 0]];
    const arm = (side: number, raise: boolean, hip: boolean) => {
      const s0 = sh[side > 0 ? 1 : 0];
      let el: V3t, wr: V3t;
      if (raise) { el = [side * 0.46, 1.5, 0.06]; wr = [side * 0.52, 1.88, 0.1]; }
      else if (hip) { el = [side * 0.46, 1.1, -0.06]; wr = [side * 0.3, 0.92, 0.1]; }
      else { el = [side * 0.33, 1.05, 0.02]; wr = [side * 0.35, 0.8, 0.08]; }
      B.tube(o.sleeve, [s0, el, wr], 0.082, { su: 5, seg: 20, rs: 14 });
      B.sphere(o.suit, 0.085, s0[0], s0[1], s0[2], { ws: 12, hs: 10 });
      const w = new V3(...wr), e = new V3(...el);
      const dir = w.clone().sub(e);
      hand(w, dir, raise ? new V3(side, 0, 0) : new V3(0, 0, 1).cross(dir).multiplyScalar(-side), raise, mBluePlastic);
    };
    arm(1, o.raise, false);
    arm(-1, false, o.hip ?? true);
    B.parent = null;
  };
  // the big waving statue in the plaza
  {
    const cx = 4.3, cz = 4.6, ry = -0.35;
    B.box(mStone, 1.3, 0.3, 1.3, cx, 0, cz, { ry });
    k.collider(cx - 0.75, cx + 0.75, cz - 0.75, cz + 0.75, 0, 0.3, true);
    clown(place(cx, 0.3, cz, ry, 1.62), { suit: mBluePlastic, sleeve: mSleeve, hair: mHair, raise: true, hip: true });
    k.collider(cx - 0.55, cx + 0.55, cz - 0.4, cz + 0.4, 0.3, 3.2, true);
  }
  // the clown row on the west stage
  {
    const sx = -20.4;
    B.box(mDeck, 2.2, 0.4, 13, sx, 0, 0, { solid: true, stand: true, wuv: [1.2, 1.2] });
    B.box(mRedPaint, 0.08, 0.4, 13.05, sx + 1.12, 0, 0, { flat: true });
    // backdrop curtain boards
    for (let i = 0; i < 13; i++) B.box(i % 2 ? mPlankW : mFence, 0.06, 2.9, 1.0, -21.7, 0.4, -6 + i, { flat: true });
    const opts: ClownOpt[] = [
      { suit: mSuitR, sleeve: mSleeve, hair: mHairR, raise: false, hip: false },
      { suit: mBluePlastic, sleeve: mSleeveR, hair: mHair, raise: true, hip: false },
      { suit: mSuitP, sleeve: mSleeveG, hair: mHairR, raise: false, hip: true },
      { suit: mSuitG, sleeve: mSleeveR, hair: mHair, raise: true, hip: true },
      { suit: mSuitR, sleeve: mSleeveG, hair: mHair, raise: false, hip: false },
    ];
    opts.forEach((o, i) => {
      const z = -5 + i * 2.5;
      clown(place(sx - 0.1, 0.4, z, PI / 2 + R(-0.25, 0.25), 0.78), o);
      k.collider(sx - 0.45, sx + 0.3, z - 0.35, z + 0.35, 0.4, 0.4 + 1.5, true);
    });
    stringLight([-21.6, 3.2, -6.5], [-21.6, 3.2, 6.5], 0.5, 0.45, [mBulbR, mBulb, mBulbB]);
    for (const z of [-6.3, 6.3]) { B.cyl(mWoodDark, 0.08, 0.08, 3.2, -19.5, 0.4, z, { seg: 8 }); }
    stringLight([-19.5, 3.55, -6.3], [-19.5, 3.55, 6.3], 0.7, 0.45, [mBulbR, mBulbG, mBulb]);
  }

  // ------------------------------------------------------------------------------------------- chicken carousel (east)
  {
    const cx = 13, cz = -2, Rr = 4.6;
    // platform (low, steppable)
    B.cyl(mDeck, Rr, Rr, 0.3, cx, 0, cz, { seg: 40 });
    B.cyl(mRedPaint, Rr + 0.05, Rr + 0.05, 0.2, cx, 0.02, cz, { seg: 40, open: true });
    k.collider(cx - Rr, cx + Rr, cz - Rr, cz + Rr, 0, 0.3, true);
    for (let i = 0; i < 48; i++) { const a = (i / 48) * PI * 2; addBulb(mBulb, [cx + Math.cos(a) * (Rr + 0.08), 0.15, cz + Math.sin(a) * (Rr + 0.08)]); }
    // centre column with mirror panels
    B.cyl(mGold, 0.8, 0.9, 0.5, cx, 0.3, cz, { seg: 24 });
    B.cyl(mRedPaint, 0.72, 0.72, 3.0, cx, 0.8, cz, { seg: 12 });
    for (let i = 0; i < 12; i++) { const a = (i / 12) * PI * 2 + PI / 12; B.box(mGlassDark, 0.3, 2.2, 0.02, cx + Math.cos(a) * 0.72, 1.1, cz + Math.sin(a) * 0.72, { ry: -a + PI / 2, flat: true }); }
    k.collider(cx - 0.9, cx + 0.9, cz - 0.9, cz + 0.9, 0, 3.8, true);
    // canopy: drum with bulbs, striped cone roof, finial
    const ch = 3.8;
    B.cyl(mGold, Rr + 0.3, Rr + 0.3, 0.7, cx, ch, cz, { seg: 40, open: true });
    B.cyl(mRedPaint, Rr + 0.25, Rr + 0.25, 0.05, cx, ch, cz, { seg: 40 });
    for (let i = 0; i < 64; i++) { const a = (i / 64) * PI * 2; for (const yy of [ch + 0.15, ch + 0.55]) addBulb(i % 4 === 0 ? mBulbR : mBulb, [cx + Math.cos(a) * (Rr + 0.33), yy, cz + Math.sin(a) * (Rr + 0.33)]); }
    // scalloped valance
    for (let i = 0; i < 24; i++) { const a = (i / 24) * PI * 2; const g = new THREE.CircleGeometry(0.55, 12, 0, PI); B.geo(i % 2 ? mWhitePlastic : mRedPaint, g, cx + Math.cos(a) * (Rr + 0.31), ch + 0.02, cz + Math.sin(a) * (Rr + 0.31), { ry: -a + PI / 2, rz: PI }); }
    B.cyl(mRedPaint, Rr + 0.3, Rr + 0.3, 0.04, cx, ch + 0.66, cz, { seg: 40 });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * PI * 2;
      B.rod(mGold, 0.04, [cx + Math.cos(a) * 0.7, ch - 0.04, cz + Math.sin(a) * 0.7], [cx + Math.cos(a) * (Rr + 0.2), ch - 0.04, cz + Math.sin(a) * (Rr + 0.2)], 6);
      for (let j = 1; j < 7; j++) { const rr = 0.7 + ((Rr - 0.5) * j) / 7; addBulb(j % 3 ? mBulb : mBulbR, [cx + Math.cos(a) * rr, ch - 0.11, cz + Math.sin(a) * rr]); }
    }
    const cone = new THREE.ConeGeometry(Rr + 0.6, 2.2, 32, 1, true);
    scaleUV(cone, 8, 1);
    B.geo(mAwning, cone, cx, ch + 0.7 + 1.1, cz);
    B.cyl(mGold, 0.12, 0.2, 0.6, cx, ch + 2.8, cz, { seg: 12 });
    B.sphere(mGold, 0.22, cx, ch + 3.5, cz);
    // the creepy bug crowning the carousel
    const by = ch + 3.05;
    B.sphere(mPatty, 0.75, cx, by + 0.55, cz, { s: [1.2, 0.8, 1] });
    B.sphere(mTomato, 0.4, cx + 0.7, by + 0.7, cz, { s: [1, 0.9, 1] });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      const { g } = taperTube([[cx + ca * 0.6, by + 0.6, cz + sa * 0.6], [cx + ca * 1.3, by + 1.4, cz + sa * 1.3], [cx + ca * 1.8, by + 1.9, cz + sa * 1.8], [cx + ca * 2.1, by + 1.6, cz + sa * 2.1]], 0.09, 0.02, 16, 6);
      B.geo(mComb, g, 0, 0, 0);
    }
    // swirl marks on the bug
    B.tube(mComb, [[cx - 0.2, by + 0.95, cz + 0.62], [cx + 0.1, by + 1.05, cz + 0.55], [cx + 0.15, by + 0.8, cz + 0.68], [cx - 0.1, by + 0.72, cz + 0.72]], 0.03, { seg: 16, rs: 5 });
    // chickens on golden poles
    const chicken = (x: number, y: number, z: number, ry: number) => {
      const M = place(x, y, z, ry, 1);
      B.parent = M;
      B.sphere(mChicken, 0.42, 0, 0, 0, { s: [0.8, 0.72, 1.15], ws: 20, hs: 14 });
      B.sphere(mChicken, 0.2, 0, 0.42, 0.42, { ws: 16, hs: 12 });
      B.cyl(mChicken, 0.13, 0.2, 0.3, 0, 0.12, 0.36, { rx: 0.5, seg: 12 });
      B.cone(mCheese, 0.07, 0.16, 0, 0.4, 0.66);
      for (let i = 0; i < 3; i++) B.sphere(mComb, 0.065, 0, 0.6 + (i === 1 ? 0.03 : 0), 0.36 + i * 0.07, { ws: 10, hs: 8 });
      B.sphere(mComb, 0.05, 0, 0.3, 0.6, { s: [0.7, 1.4, 0.7], ws: 10, hs: 8 });
      for (const s of [-1, 1]) {
        B.sphere(mBlack, 0.03, s * 0.12, 0.47, 0.54, { ws: 8, hs: 6 });
        B.sphere(mChicken, 0.26, s * 0.3, 0.02, -0.05, { s: [0.35, 0.8, 1.2], ws: 14, hs: 10 });
      }
      for (let i = 0; i < 3; i++) B.sphere(mChicken, 0.2, (i - 1) * 0.1, 0.22 - Math.abs(i - 1) * 0.05, -0.48, { s: [0.45, 1.25, 0.9], rx: -0.6, rz: (i - 1) * 0.35, ws: 12, hs: 8 });
      B.box(mVinyl, 0.36, 0.08, 0.4, 0, 0.28, -0.05, { rx: 0.08 });
      for (const s of [-1, 1]) B.rod(mCheese, 0.025, [s * 0.1, -0.25, 0.05], [s * 0.12, -0.5, 0.12]);
      B.parent = null;
    };
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2 + 0.2;
      const r = i % 2 ? 3.4 : 2.4;
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      const y = 1.25 + (i % 3) * 0.15;
      B.cyl(mGold, 0.035, 0.035, ch - 0.3, x, 0.3, z, { seg: 10 });
      for (const yy of [1.8, 2.5]) B.sphere(mGold, 0.06, x, y + (yy - 1.25) * 0.5, z, { ws: 8, hs: 6 });
      chicken(x, y, z, -a + PI); // tangent-facing ride direction
      k.collider(x - 0.38, x + 0.38, z - 0.38, z + 0.38, 0.3, y + 0.62, true);
    }
    cluster(cx + Rr + 0.2, ch + 1.0, cz + 3.0, 5, 0.22);
  }

  // ------------------------------------------------------------------------------------------- Death Burger diner (north)
  {
    const x1 = -9, x2 = 9, zb = -19.7, zf = -12.5, H = 4;
    const wT = 0.25;
    // floor + roof
    B.box(mDiner, x2 - x1, 0.03, zf - zb, 0, 0, (zb + zf) / 2, { flat: true, wuv: [1.6, 1.6] });
    B.box(mRoof, x2 - x1 + 0.6, 0.3, zf - zb + 0.8, 0, H, (zb + zf) / 2 + 0.2, { flat: true, solid: true, stand: true, wuv: [3, 3] });
    B.box(mRedPaint, x2 - x1 + 0.7, 0.35, 0.1, 0, H - 0.05, zf + 0.62, { flat: true });
    // back and side walls (tile inside, striped boards outside)
    B.box(mTileWall, x2 - x1, H, wT, 0, 0, zb + wT / 2, { flat: true, solid: true, wuv: [2, 2] });
    const sideDoorZ = -15.8, sdw = 2.0;
    for (const sx of [x1, x2]) {
      const inner = sx + (sx < 0 ? wT / 2 : -wT / 2);
      const za = zb, zbDoor = sideDoorZ - sdw / 2, zcDoor = sideDoorZ + sdw / 2;
      if (sx > 0) {
        B.box(mFence, wT, H, zbDoor - za, inner, 0, (za + zbDoor) / 2, { flat: true, solid: true, wuv: [0.9, 3.2] });
        B.box(mFence, wT, H, zf - zcDoor, inner, 0, (zcDoor + zf) / 2, { flat: true, solid: true, wuv: [0.9, 3.2] });
        B.box(mFence, wT, H - 2.4, sdw, inner, 2.4, sideDoorZ, { flat: true, solid: true, wuv: [0.9, 3.2] });
      } else B.box(mFence, wT, H, zf - za, inner, 0, (za + zf) / 2, { flat: true, solid: true, wuv: [0.9, 3.2] });
    }
    // front wall: door at x=-6.5 (w 2), serving window x -1.5..5.5 (y 1.05..2.5)
    const fz = zf - wT / 2;
    const seg = (a: number, b: number, y0: number, y1: number) => B.box(mFence, b - a, y1 - y0, wT, (a + b) / 2, y0, fz, { flat: true, solid: true, wuv: [0.9, 3.2] });
    seg(x1, -7.5, 0, H);
    seg(-7.5, -5.5, 2.4, H);
    seg(-5.5, -1.5, 0, H);
    seg(-1.5, 5.5, 0, 1.05);
    seg(-1.5, 5.5, 2.5, H);
    seg(5.5, x2, 0, H);
    // yellow trim band + sign letters on the facade
    B.box(mCheese, x2 - x1 + 0.1, 0.18, 0.06, 0, 2.95, zf + 0.02, { flat: true });
    B.geo(mLetters, new THREE.PlaneGeometry(4.4, 2.2), -3.5, 3.55, zf + 0.9, {});
    B.box(mRedPaint, 4.6, 1.2, 0.12, -3.5, 4.3, zf + 0.62, { flat: true });
    // window frame + counter
    B.box(mSteel, 7.1, 0.08, 0.45, 2, 1.02, fz, { flat: true });
    B.box(mSteel, 7.1, 0.08, wT + 0.04, 2, 2.47, fz, { flat: true });
    B.box(mTableTop, 7.0, 0.06, 0.8, 2, 1.0, zf - 0.75);
    B.box(mRedPaint, 7.0, 1.0, 0.6, 2, 0, zf - 0.8, { solid: true, stand: true });
    // cash registers
    for (const rx of [0, 3.8]) { B.box(mBlack, 0.4, 0.22, 0.35, rx, 1.06, zf - 0.8); B.box(mGlassDark, 0.3, 0.2, 0.04, rx, 1.28, zf - 0.72, { rx: -0.4 }); }
    // door frame
    B.box(mWoodDark, 0.12, 2.4, 0.35, -7.5, 0, fz, { flat: true });
    B.box(mWoodDark, 0.12, 2.4, 0.35, -5.5, 0, fz, { flat: true });
    B.box(mWoodDark, 2.12, 0.12, 0.35, -6.5, 2.4, fz, { flat: true });
    // kitchen line along the back wall
    const kz = zb + 0.6;
    B.box(mSteel, 2.2, 0.9, 0.8, -6.8, 0, kz, { solid: true, stand: true });
    B.box(mGrill, 2.0, 0.04, 0.7, -6.8, 0.9, kz, { flat: true });
    B.box(mSteel, 2.2, 0.9, 0.08, -6.8, 0.9, kz - 0.36, { flat: true });
    for (const fx of [-4.9, -4.1]) {
      B.box(mSteel, 0.75, 0.95, 0.8, fx, 0, kz, { solid: true, stand: true });
      B.box(mOil, 0.5, 0.02, 0.5, fx, 0.95, kz);
      B.box(mSteel, 0.36, 0.1, 0.28, fx, 1.05, kz, { flat: true });
      B.rod(mBlack, 0.015, [fx, 1.1, kz + 0.14], [fx, 1.25, kz + 0.4]);
    }
    B.box(mSteel, 5.0, 0.9, 0.8, -0.6, 0, kz, { solid: true, stand: true });
    B.box(mSteel, 5.0, 0.04, 0.4, -0.6, 1.8, zb + 0.4, { flat: true });
    for (let i = 0; i < 10; i++) B.cyl(i % 3 ? mRedPaint : mCheese, 0.07, 0.07, 0.22, -2.8 + i * 0.45, 1.84, zb + 0.4, { seg: 10 });
    // tall fridge + shelves
    B.box(mSteel, 1.3, 2.2, 0.8, 3.0, 0, kz, { solid: true, stand: true });
    B.box(mBlack, 0.03, 1.5, 0.03, 2.45, 0.5, kz + 0.41, { flat: true });
    for (let j = 0; j < 3; j++) B.box(mWoodDark, 1.8, 0.05, 0.5, 5.6, 0.4 + j * 0.7, kz - 0.1, { flat: true });
    k.collider(4.7, 6.5, kz - 0.35, kz + 0.15, 0, 1.9, true);
    for (let i = 0; i < 9; i++) B.box(mCrate, 0.45, 0.35, 0.4, 4.95 + (i % 3) * 0.6, 0.45 + Math.floor(i / 3) * 0.7, kz - 0.1, { ry: R(-0.1, 0.1) });
    // hanging menu boards above the kitchen, facing the window
    for (const [mx, w] of [[-0.8, 3.0], [2.6, 3.0]] as [number, number][]) {
      B.box(mBlack, w + 0.12, 1.62, 0.08, mx, 2.35, zb + 0.35, { flat: true });
      B.geo(mMenu, new THREE.PlaneGeometry(w, 1.5), mx, 3.16, zb + 0.4);
    }
    // fluorescent ceiling fixtures
    for (const fx of [-5, 0, 5]) B.box(mFluo, 1.4, 0.06, 0.25, fx, H - 0.1, -16, { flat: true });
    // booths on the terrace in front of the diner
    const booth = (bx: number, bz: number) => {
      B.cyl(mSteel, 0.05, 0.05, 0.72, bx, 0, bz, { seg: 10 });
      B.cyl(mSteel, 0.3, 0.3, 0.03, bx, 0, bz, { seg: 16 });
      B.box(mTableTop, 1.3, 0.05, 0.8, bx, 0.72, bz);
      B.box(mRedPaint, 1.32, 0.03, 0.82, bx, 0.7, bz, { flat: true });
      k.collider(bx - 0.65, bx + 0.65, bz - 0.4, bz + 0.4, 0, 0.77, true);
      for (const s of [-1, 1]) {
        const sx = bx + s * 1.05;
        B.box(mVinyl, 0.55, 0.45, 1.4, sx, 0, bz, { solid: true, stand: true });
        B.box(mVinyl, 0.2, 0.75, 1.4, sx + s * 0.27, 0.45, bz, { solid: true, stand: true });
        B.box(mSteel, 0.6, 0.06, 1.44, sx, 0, bz, { flat: true });
      }
    };
    booth(-2.8, -9.8);
    booth(6.8, -9.8);
    booth(1.6, -9.3);
    // awning over the terrace
    for (const ax of [-8.6, -4.0, 3.9, 8.6]) B.cyl(mSteel, 0.05, 0.05, 2.9, ax, 0, -8.2, { seg: 10 });
    const aw = new THREE.PlaneGeometry(17.6, 4.4, 1, 1);
    scaleUV(aw, 18, 1);
    B.geo(mAwning, aw, 0, 3.2, -10.3, { rx: -PI / 2 + 0.2 });
    const awBack = new THREE.PlaneGeometry(17.6, 4.4, 1, 1);
    scaleUV(awBack, 18, 1);
    B.geo(mAwning, awBack, 0, 3.2 - 0.005, -10.3, { rx: PI / 2 + 0.2 });
    // scalloped valance along the awning front
    for (let i = 0; i < 22; i++) { const g = new THREE.CircleGeometry(0.4, 10, 0, PI); B.geo(i % 2 ? mWhitePlastic : mRedPaint, g, -8.4 + i * 0.8, 2.77, -8.16, { rz: PI }); }
    // trash cans by the terrace
    for (const [tx2, tz2] of [[-8.3, -8.8], [8.4, -11.2], [-3.2, 17.6], [3.4, 17.6], [18.2, 12.8]]) {
      B.lathe(mLampGreen, [[0, 0], [0.3, 0], [0.33, 0.1], [0.33, 0.9], [0.36, 0.95], [0.34, 1.0], [0, 1.02]], tx2, 0, tz2, { seg: 18 });
      k.collider(tx2 - 0.35, tx2 + 0.35, tz2 - 0.35, tz2 + 0.35, 0, 1.02, true);
    }
    // eyeball-burger sign on the roof
    const sM = place(4.5, H + 2.3, zf + 0.3, 0.15, 0.62);
    B.cyl(mRustDark, 0.1, 0.12, 2.3, 4.5, H + 0.15, zf + 0.3, { seg: 10 });
    for (const s of [-1, 1]) B.rod(mRustDark, 0.04, [4.5 + s * 1.0, H + 0.15, zf + 0.3], [4.5, H + 1.9, zf + 0.3]);
    burger(sM, false);
    k.room("Death Burger Diner", x1, x2, zb, zf);
    k.room("Diner Terrace", x1, x2, -12.5, -7.4);
  }

  // ------------------------------------------------------------------------------------------- circus cage wagon + birdcage + pumpkins (west)
  {
    const wx = -14.5, wz = 11.5, ry = 0.25;
    const M = place(wx, 0, wz, ry, 1);
    B.parent = M;
    const L = 3.4, Wd = 1.7;
    B.box(mRedPaint, L, 0.3, Wd, 0, 0.7, 0);
    B.box(mRedPaint, L + 0.2, 0.25, Wd + 0.2, 0, 2.95, 0);
    B.box(mGold, L + 0.26, 0.06, Wd + 0.26, 0, 2.92, 0, { flat: true });
    B.lathe(mRedPaint, [[0, 0], [Wd / 2 + 0.1, 0], [Wd / 2 + 0.05, 0.12], [0, 0.35]], 0, 3.2, 0, { seg: 4, ry: PI / 4, s: [L / Wd, 1, 1] });
    for (const [px, pz] of [[-L / 2, -Wd / 2], [L / 2, -Wd / 2], [-L / 2, Wd / 2], [L / 2, Wd / 2]]) {
      B.box(mRedPaint, 0.16, 1.95, 0.16, px, 1.0, pz);
      B.sphere(mGold, 0.14, px, 3.34, pz);
    }
    for (let i = 1; i < 12; i++) for (const pz of [-Wd / 2, Wd / 2]) B.cyl(mGold, 0.025, 0.025, 1.95, -L / 2 + (L * i) / 12, 1.0, pz, { seg: 6 });
    for (let i = 1; i < 6; i++) B.cyl(mGold, 0.025, 0.025, 1.95, -L / 2, 1.0, -Wd / 2 + (Wd * i) / 6, { seg: 6 });
    B.box(mPlankW, 0.06, 1.95, Wd, L / 2, 1.0, 0, { flat: true });
    B.box(mWoodDark, L - 0.1, 0.02, Wd - 0.1, 0, 1.0, 0, { flat: true });
    for (const [px, pz] of [[-1.1, -Wd / 2 - 0.1], [1.1, -Wd / 2 - 0.1], [-1.1, Wd / 2 + 0.1], [1.1, Wd / 2 + 0.1]]) {
      B.geo(mWoodDark, new THREE.TorusGeometry(0.42, 0.05, 6, 24), px, 0.47, pz);
      B.cyl(mGold, 0.08, 0.08, 0.1, px, 0.42, pz, { rx: PI / 2, seg: 10 });
      for (let s = 0; s < 6; s++) { const a = (s / 6) * PI; B.box(mWoodDark, 0.04, 0.8, 0.03, px, 0.07, pz, { rz: a, flat: true }); }
    }
    B.rod(mWoodDark, 0.05, [-L / 2, 0.6, 0], [-L / 2 - 1.3, 0.1, 0]);
    B.parent = null;
    const c = Math.cos(ry), s = Math.sin(ry);
    const hx = Math.abs(c) * (L / 2 + 0.1) + Math.abs(s) * (Wd / 2 + 0.1), hz = Math.abs(s) * (L / 2 + 0.1) + Math.abs(c) * (Wd / 2 + 0.1);
    k.collider(wx - hx, wx + hx, wz - hz, wz + hz, 0, 3.2, true);
    cluster(wx + 1.3, 4.2, wz - 0.6, 6, 0.24);
    k.room("Circus Wagon", -19.5, -10, 8, 19.5);
  }
  {
    // birdcage
    const bx = -10.6, bz = 14.2;
    B.cyl(mRustDark, 0.45, 0.5, 0.08, bx, 0, bz, { seg: 16 });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * PI * 2;
      const pts: V3t[] = [[bx + Math.cos(a) * 0.45, 0.08, bz + Math.sin(a) * 0.45], [bx + Math.cos(a) * 0.46, 0.8, bz + Math.sin(a) * 0.46], [bx + Math.cos(a) * 0.3, 1.18, bz + Math.sin(a) * 0.3], [bx, 1.3, bz]];
      B.tube(mRustDark, pts, 0.012, { seg: 12, rs: 4 });
    }
    B.geo(mRustDark, new THREE.TorusGeometry(0.46, 0.015, 4, 24), bx, 0.5, bz, { rx: PI / 2 });
    B.geo(mRustDark, new THREE.TorusGeometry(0.1, 0.015, 4, 12), bx, 1.38, bz);
    k.collider(bx - 0.48, bx + 0.48, bz - 0.48, bz + 0.48, 0, 1.3, true);
  }
  // pumpkins
  {
    const pg = pumpkinGeo(8);
    const pumpkin = (x: number, z: number, r: number) => {
      B.geo(mPumpkin, pg.clone(), x, r * 0.7, z, { s: r, ry: R(0, PI) });
      B.cyl(mStem, 0.06 * r * 1.4, 0.09 * r * 1.4, 0.25 * r, x, r * 1.25, z, { seg: 7, rz: R(-0.3, 0.3) });
      if (r > 0.45) k.collider(x - r * 0.9, x + r * 0.9, z - r * 0.9, z + r * 0.9, 0, r * 1.4, true);
    };
    const list: [number, number, number][] = [
      [-6.6, 16.6, 0.9], [-5.4, 17.8, 0.45], [-7.6, 17.9, 0.35], [-16.8, 16.8, 0.7], [-18.2, 15.4, 0.45], [-12.2, 17.8, 0.55],
      [-17.8, 8.2, 0.38], [16.6, 15.8, 0.8], [18.2, 17.2, 0.45], [7.4, 18.2, 0.55], [-2.8, 6.4, 0.32], [6.2, 3.3, 0.5],
      [18.8, -8.8, 0.6], [20.2, -1.5, 0.75], [19.6, 0.2, 0.4], [-1.5, -16.5, 0.5], [-14.8, -3.5, 0.6], [14.2, 18.0, 0.5], [-20.3, -17.5, 0.8], [-10.8, -8.2, 0.5], [11.8, -9.4, 0.4], [-6.2, 2.8, 0.42], [-19.2, 9.6, 0.5], [9.8, -16.8, 0.7],
    ];
    for (const [x, z, r] of list) pumpkin(x, z, r);
  }

  // ------------------------------------------------------------------------------------------- menu board at the boundary (east)
  {
    const mx = 20.6, mz = 12;
    for (const s of [-1, 1]) B.box(mRustDark, 0.14, 3.4, 0.14, mx + 0.05, 0, mz + s * 1.7);
    B.box(mBlack, 0.16, 1.9, 3.5, mx, 1.4, mz, { flat: true });
    B.geo(mMenu, new THREE.PlaneGeometry(3.3, 1.7), mx - 0.09, 2.35, mz, { ry: -PI / 2 });
    B.box(mRedPaint, 0.2, 0.3, 3.6, mx, 3.3, mz, { flat: true });
    for (let i = 0; i <= 14; i++) addBulb(mBulb, [mx - 0.12, 3.45, mz - 1.75 + (3.5 * i) / 14]);
    k.collider(mx - 0.1, mx + 0.15, mz - 1.8, mz + 1.8, 0, 3.4, true);
    // crates and a barrel by the menu
    B.box(mCrate, 0.8, 0.8, 0.8, 19.8, 0, 9.4, { solid: true, stand: true, ry: 0.1 });
    B.box(mCrate, 0.7, 0.7, 0.7, 19.9, 0.8, 9.4, { solid: true, stand: true, ry: -0.2 });
    B.box(mCrate, 0.8, 0.8, 0.8, 20.6, 0, 8.3, { solid: true, stand: true, ry: 0.05 });
    k.room("Menu Board", 17, 21.6, 8, 16);
  }

  // ------------------------------------------------------------------------------------------- dark trees outside the fence
  {
    const trees: [number, number, number][] = [];
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * PI * 2 + R(-0.08, 0.08);
      const rx = 27 + R(0, 6), rz = 25 + R(0, 6);
      trees.push([Math.cos(a) * rx, Math.sin(a) * rz, R(0.8, 1.3)]);
    }
    for (const [x, z, s] of trees) {
      if (Math.abs(x) < 5 && z > 20) continue;
      B.cyl(mBark, 0.25 * s, 0.4 * s, 6 * s, x, 0, z, { seg: 8 });
      for (let j = 0; j < 3; j++) B.sphere(mLeaves, R(2.2, 3.2) * s, x + R(-1.2, 1.2), 6 * s + R(0, 2.5), z + R(-1.2, 1.2), { ws: 10, hs: 8 });
    }
    // trees seen through the gate
    for (const [x, z] of [[-5, 30], [4, 32], [0, 36]]) {
      B.cyl(mBark, 0.3, 0.45, 6, x, 0, z, { seg: 8 });
      B.sphere(mLeaves, 3, x, 7, z, { ws: 10, hs: 8 });
    }
  }

  // ------------------------------------------------------------------------------------------- scattered clutter
  {
    // crates near the carousel and the wagon
    for (const [x, z, s] of [[20.4, -3.4, 0.9], [20.5, -4.4, 0.7], [-14.2, -17.8, 0.9], [15.8, -18.6, 0.8], [17.8, 4.8, 0.8], [18.6, 4.4, 0.6], [-11.8, 9.6, 0.7], [-17.6, -9.2, 0.8], [-16.9, -9.6, 0.6]] as V3t[]) B.box(mCrate, s, s, s, x, 0, z, { solid: true, stand: true, ry: R(-0.3, 0.3) });
    // small balloon cluster tied to the entrance
    cluster(-14.5, 4.6, -9.5, 5, 0.24);
    cluster(18.5, 4.6, -6.5, 5, 0.24);
    cluster(-3.1, 5.2, FZ - 0.4, 5, 0.24);
    cluster(3.1, 5.2, FZ - 0.4, 5, 0.24);
  }

  // ------------------------------------------------------------------------------------------- more park furniture
  {
    // ticket booth by the entrance (east)
    const tbx = 7.2, tbz = 17.6;
    B.box(mFence, 2.0, 2.6, 1.6, tbx, 0, tbz, { wuv: [0.9, 3.2] });
    B.box(mGlassDark, 1.2, 0.8, 0.04, tbx, 1.1, tbz - 0.81, { flat: true });
    B.box(mTableTop, 1.4, 0.06, 0.35, tbx, 1.05, tbz - 0.95);
    B.box(mRedPaint, 2.3, 0.2, 1.9, tbx, 2.6, tbz);
    B.cone(mAwning, 1.5, 1.0, tbx, 2.8, tbz, { ry: PI / 4, s: [1, 1, 0.85] });
    B.sphere(mGold, 0.12, tbx, 3.85, tbz);
    B.geo(mLetters, new THREE.PlaneGeometry(1.6, 0.8), tbx, 2.2, tbz - 0.82, { ry: PI });
    B.geo(mLetters, new THREE.PlaneGeometry(1.6, 0.8), tbx, 2.2, tbz - 0.815, {});
    k.collider(tbx - 1.05, tbx + 1.05, tbz - 1.0, tbz + 0.85, 0, 2.8, true);
    // benches
    const bench = (x: number, z: number, ry: number) => {
      const M = place(x, 0, z, ry);
      B.parent = M;
      for (let i = 0; i < 3; i++) B.box(mDeck, 1.6, 0.04, 0.12, 0, 0.44, -0.16 + i * 0.15, { flat: true });
      for (let i = 0; i < 2; i++) B.box(mDeck, 1.6, 0.1, 0.03, 0, 0.62 + i * 0.16, -0.27, { rx: -0.12, flat: true });
      for (const sx of [-0.7, 0.7]) { B.box(mLampGreen, 0.05, 0.44, 0.45, sx, 0, 0, { flat: true }); B.box(mLampGreen, 0.05, 0.5, 0.05, sx, 0.44, -0.28, { flat: true }); }
      B.parent = null;
      const c = Math.abs(Math.cos(ry)), sn = Math.abs(Math.sin(ry));
      const hx = c * 0.8 + sn * 0.3, hz = sn * 0.8 + c * 0.3;
      k.collider(x - hx, x + hx, z - hz, z + hz, 0, 0.46, true);
    };
    bench(-11.5, 4.5, PI / 2);
    bench(11.6, 12.5, -PI / 2);
    bench(-4.0, -5.8, PI);
    bench(15.2, 8.8, PI);
    bench(-15.5, -13.8, 0.3);
    // giant fries carton (climbable)
    {
      const fx = 16.2, fz = 13.6;
      B.lathe(mRedPaint, [[0, 0], [0.75, 0], [0.95, 1.6], [0.9, 1.62], [0, 1.62]], fx, 0, fz, { seg: 4, ry: PI / 4, s: [1, 1, 0.7] });
      const fries: { pos: V3t; rx: number; rz: number; h: number }[] = [];
      for (let i = 0; i < 26; i++) fries.push({ pos: [fx + R(-0.6, 0.6), 1.4, fz + R(-0.38, 0.38)], rx: R(-0.25, 0.25), rz: R(-0.3, 0.3), h: R(0.8, 1.4) });
      for (const f of fries) B.box(mCheese, 0.13, f.h, 0.13, f.pos[0], f.pos[1], f.pos[2], { rx: f.rx, rz: f.rz });
      B.geo(mPBadge, new THREE.CircleGeometry(0.35, 24), fx, 0.9, fz - 0.62, { ry: PI, rx: 0.1 });
      k.collider(fx - 0.9, fx + 0.9, fz - 0.65, fz + 0.65, 0, 2.4, true);
    }
    // abandoned food cart near the carousel
    {
      const M = place(17.2, 0, -12.2, 0.4);
      B.parent = M;
      B.box(mSteel, 2.0, 0.9, 1.0, 0, 0.35, 0);
      B.box(mRedPaint, 2.02, 0.2, 1.02, 0, 0.9, 0, { flat: true });
      for (const sx of [-0.9, 0.9]) B.cyl(mSteel, 0.03, 0.03, 1.4, sx, 1.25, 0.45, { seg: 8 });
      B.box(mAwning, 2.3, 0.05, 1.3, 0, 2.62, 0.1, { rx: 0.15, flat: true });
      B.geo(mWoodDark, new THREE.TorusGeometry(0.33, 0.05, 6, 20), -0.6, 0.35, 0.55);
      B.geo(mWoodDark, new THREE.TorusGeometry(0.33, 0.05, 6, 20), -0.6, 0.35, -0.55);
      B.box(mLantern, 0.8, 0.5, 0.5, 0.2, 1.25, 0, { flat: true });
      B.rod(mSteel, 0.03, [1.0, 0.8, 0], [1.6, 0.9, 0]);
      B.parent = null;
      k.collider(16.0, 18.4, -13.2, -11.2, 0, 1.25, true);
    }
    // bare dead trees inside the park
    const deadTree = (x: number, z: number, s: number, seed: number) => {
      const rr = D.dbRng(seed);
      const { g } = taperTube([[x, 0, z], [x + 0.2 * s, 2 * s, z], [x - 0.1 * s, 4 * s, z + 0.2 * s], [x + 0.1 * s, 5.2 * s, z]], 0.32 * s, 0.08 * s, 20, 10);
      B.geo(mBark, g, 0, 0, 0);
      for (let i = 0; i < 7; i++) {
        const a = rr() * PI * 2, y0 = (2.2 + rr() * 2.8) * s, l = (1.2 + rr() * 1.6) * s;
        const p0: V3t = [x, y0, z];
        const p1: V3t = [x + Math.cos(a) * l * 0.5, y0 + l * 0.35, z + Math.sin(a) * l * 0.5];
        const p2: V3t = [x + Math.cos(a + 0.4) * l, y0 + l * 0.5 + rr() * 0.4, z + Math.sin(a + 0.4) * l];
        B.geo(mBark, taperTube([p0, p1, p2], 0.1 * s, 0.015 * s, 10, 6).g, 0, 0, 0);
      }
      k.collider(x - 0.3 * s, x + 0.3 * s, z - 0.3 * s, z + 0.3 * s, 0, 4 * s, true);
    };
    deadTree(-17.8, -16.5, 1.1, 3);
    deadTree(18.5, -17.0, 1.0, 5);
    deadTree(19.2, 3.0, 0.9, 7);
    deadTree(-18.6, 17.4, 1.0, 9);
    // barrels
    for (const [x, z] of [[-12.8, -15.5], [-13.6, -16.2], [12.8, -17.6], [-20.4, 12.8]]) {
      B.lathe(mRustDark, [[0, 0], [0.3, 0], [0.34, 0.2], [0.35, 0.45], [0.34, 0.7], [0.3, 0.9], [0, 0.9]], x, 0, z, { seg: 16 });
      k.collider(x - 0.35, x + 0.35, z - 0.35, z + 0.35, 0, 0.9, true);
    }
  }
  // sky: dark forest canopy dome (no fog, not paintable)
  {
    const dm = k.mat(tx("canopy", D.dbNightCanopy), "#000", [1, 1], { emissive: "#ffffff", emissiveIntensity: 1.0, bump: 0 });
    dm.m.side = THREE.BackSide;
    dm.m.fog = false;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(85, 32, 16, 0, PI * 2, 0, PI * 0.62), dm.m);
    dome.position.y = -6;
    k.group.add(dome);
  }

  // ------------------------------------------------------------------------------------------- flush
  for (const [m, l] of bulbLists) k.instances(bulbGeo, m, l, { noShadow: true });
  B.flush();

  k.room("Entrance", -10, 10, 15, 20);
  k.room("Sign Plaza", -10, 10, -7.4, 15);
  k.room("Chicken Carousel", 7, 21.6, -8, 8);
  k.room("Clown Stage", -21.6, -17, -7, 7);

  // spawns
  const hunters: THREE.Vector3[] = [];
  for (let i = 0; i < 9; i++) hunters.push(new V3(((i % 3) - 1) * 1.3, 0, 15.8 + Math.floor(i / 3) * 1.2));
  const hiders: THREE.Vector3[] = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) hiders.push(new V3(-5.9 + c * 2.36, 0, 8.2 + r * 1.35));

  return k.finish({
    id: "deathburger", name: "Death Burger",
    bounds: { minX: -FX + 0.4, maxX: FX - 0.4, minZ: -FZ + 0.4, maxZ: FZ - 0.4 },
    hunterSpawns: hunters, hiderSpawns: hiders,
    preview: { pos: [-1.6, 2.0, 13.8], look: [0.4, 2.2, 2.5], fov: 62 },
    lighting: {
      sky: "#06070c",
      hemi: ["#46527a", "#241a12", 0.6],
      sun: { color: "#9fb4e8", int: 0.75, pos: [-12, 26, 14] },
      fog: ["#0a0c14", 22, 70],
      points: [
        { pos: [0, 3.0, 16.5], color: "#ffb04a", int: 16, dist: 13 },
        { pos: [-0.8, 3.2, 6.2], color: "#ffd26a", int: 18, dist: 11 },
        { pos: [13, 3.3, -2], color: "#ffc860", int: 28, dist: 12 },
        { pos: [0, 3.2, -14.5], color: "#ff4a30", int: 18, dist: 12 },
        { pos: [-17.5, 3.0, 0], color: "#b04aff", int: 16, dist: 11 },
        { pos: [-12.5, 2.4, 13], color: "#3aff9a", int: 12, dist: 10 },
      ],
      exposure: 1.2,
      hdri: "night",
      env: 0.35,
    },
  });
}
