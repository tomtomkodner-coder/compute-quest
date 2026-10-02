// Deep Sea (深海): a sunlit sea floor in a rocky canyon. Rippled sand with caustic light pools and god rays, a sunken
// plaza with a marble UNICORN STATUE on a plinth ringed by broken columns, a SHIPWRECK you can walk into (planked hull
// with a smashed side, broken deck, masts, a fallen mainmast ramp, barrels, chests, cannons, anchor), a KELP forest,
// a CORAL reef (brain, staghorn, table, fan, tube and pillar corals, anemones with clownfish), a pearl garden with
// GIANT CLAMS, JELLYFISH drifting overhead, schools of tropical FISH, starfish, urchins, shells and bubbles.
// Hunters arrive through the ruined stone gate in the south when the search starts.
import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import * as D from "./tex/deepsea";
import { Kit, boxGeo, ring, type Mat, type World } from "./kit";
import { Life, SERIF } from "./tex/life";

type G = THREE.BufferGeometry;
type V3t = [number, number, number];
const V3 = THREE.Vector3;
const PI = Math.PI;

// ---------------------------------------------------------------------------------------------
// geometry helpers
function xf(g: G, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, s: V3t = [1, 1, 1]) {
  g.applyMatrix4(new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), new V3(...s)));
  return g;
}
function lathe(pts: [number, number][], seg = 24) {
  return new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(Math.max(0, r), h)), seg);
}
function orient(g: G, a: THREE.Vector3, b: THREE.Vector3) {
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), b.clone().sub(a).normalize()));
  const c = a.clone().add(b).multiplyScalar(0.5);
  g.translate(c.x, c.y, c.z);
  return g;
}
/** tapered cylinder from a (radius r0) to b (radius r1) */
function rod(a: V3t | THREE.Vector3, b: V3t | THREE.Vector3, r0: number, r1: number, seg = 8, open = false) {
  const va = Array.isArray(a) ? new V3(...a) : a.clone(), vb = Array.isArray(b) ? new V3(...b) : b.clone();
  return orient(new THREE.CylinderGeometry(r1, r0, va.distanceTo(vb), seg, 1, open), va, vb);
}
/** capsule between two points; sz squashes it along world Z before orienting (limbs lying in an XY plane) */
function capsule(a: V3t, b: V3t, r: number, sz = 1, seg = 14, cap = 5) {
  const va = new V3(...a), vb = new V3(...b);
  const g = new THREE.CapsuleGeometry(r, Math.max(0.001, va.distanceTo(vb)), cap, seg);
  g.scale(1, 1, sz);
  return orient(g, va, vb);
}
function tube(pts: V3t[], r: number, tubular = 24, radial = 6) {
  const c = new THREE.CatmullRomCurve3(pts.map((p) => new V3(...p)), false, "centripetal");
  return new THREE.TubeGeometry(c, tubular, r, radial, false);
}
function sphere(r: number, x: number, y: number, z: number, ws = 12, hs = 8, s: V3t = [1, 1, 1]) {
  return xf(new THREE.SphereGeometry(r, ws, hs), x, y, z, 0, 0, 0, s);
}
function merge(parts: G[]) {
  const clean = parts.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(n.attributes)) if (!["position", "normal", "uv", "color"].includes(k)) n.deleteAttribute(k);
    return n;
  });
  return mergeGeometries(clean, false)!;
}
/** world-space box projection of UVs (so textures keep a real-world scale on merged pieces) */
function boxUV(g: G, unit: number) {
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  if (!uv || !n) return g;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ay >= ax && ay >= az) uv.setXY(i, p.getX(i) / unit, p.getZ(i) / unit);
    else if (ax >= az) uv.setXY(i, p.getZ(i) / unit, p.getY(i) / unit);
    else uv.setXY(i, p.getX(i) / unit, p.getY(i) / unit);
  }
  uv.needsUpdate = true;
  return g;
}
function paint(g: G, col: string | ((y: number, i: number) => THREE.Color)) {
  const n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    if (typeof col === "string") c.set(col);
    else c.copy(col(g.attributes.position.getY(i), i));
    a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(a, 3));
  return g;
}

class Batch {
  private lists = new Map<Mat, G[]>();
  private flags = new Map<Mat, { noShadow?: boolean }>();
  constructor(private k: Kit) {}
  opt(m: Mat, f: { noShadow?: boolean }) { this.flags.set(m, f); }
  add(m: Mat, g: G, uv?: number) {
    if (uv) boxUV(g, uv);
    let l = this.lists.get(m);
    if (!l) this.lists.set(m, (l = []));
    l.push(g);
    return g;
  }
  box(m: Mat, w: number, h: number, d: number, x: number, y: number, z: number, o: { rx?: number; ry?: number; rz?: number; uv?: number } = {}) {
    return this.add(m, xf(boxGeo(w, h, d), x, y + h / 2, z, o.rx, o.ry, o.rz), o.uv);
  }
  flush() {
    for (const [m, l] of this.lists) if (l.length) this.k.merged(l, m, { noShadow: this.flags.get(m)?.noShadow });
    this.lists.clear();
  }
}

/** local frame (position + yaw) for props built in their own coordinates */
class Frame {
  constructor(public x: number, public z: number, public ry: number, public y = 0) {}
  pt(lx: number, lz: number): [number, number] {
    const c = Math.cos(this.ry), s = Math.sin(this.ry);
    return [this.x + lx * c + lz * s, this.z - lx * s + lz * c];
  }
  put(g: G) {
    g.applyMatrix4(new THREE.Matrix4().makeRotationY(this.ry));
    g.translate(this.x, this.y, this.z);
    return g;
  }
  box(k: Kit, lx1: number, lx2: number, lz1: number, lz2: number, bottom: number, top: number, standable = true) {
    const xs: number[] = [], zs: number[] = [];
    for (const [a, b] of [[lx1, lz1], [lx2, lz1], [lx1, lz2], [lx2, lz2]]) {
      const [x, z] = this.pt(a, b);
      xs.push(x); zs.push(z);
    }
    k.collider(Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs), this.y + bottom, this.y + top, standable);
  }
}

/** lumpy boulder: displaced icosphere, flattened underside, planar UVs */
function rockGeo(seed: number, detail = 3, flat = -0.35) {
  const r = D.rng(seed);
  let g: G = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute("normal");
  g.deleteAttribute("uv");
  g = mergeVertices(g);
  const waves = Array.from({ length: 7 }, (_, i) => ({ d: new V3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), f: 1.5 + r() * (2 + i), a: 0.16 / (1 + i * 0.45), p: r() * 6.28 }));
  const p = g.attributes.position;
  const v = new V3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    let d = 1;
    for (const w of waves) d += Math.sin(v.dot(w.d) * w.f + w.p) * w.a;
    v.multiplyScalar(d);
    if (v.y < flat) v.y = flat + (v.y - flat) * 0.25;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[i * 2] = (p.getX(i) + p.getZ(i) * 0.5) * 0.9; uv[i * 2 + 1] = (p.getY(i) + p.getZ(i) * 0.6) * 0.9; }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.translate(0, -flat * 0.9, 0);
  return g;
}

// ---------------------------------------------------------------------------------------------
export function buildDeepSea(): World {
  const k = new Kit(8, 3);
  let TT = performance.now();
  const TM: string[] = [];
  const lap = (n: string) => { const t = performance.now(); TM.push(`${n}:${Math.round(t - TT)}`); TT = t; };
  const b = new Batch(k);
  const R = D.rng(4242);
  const rr = (a: number, c: number) => a + R() * (c - a);
  const pick = <X,>(a: X[]) => a[Math.floor(R() * a.length)];
  const deco = new Set<THREE.Object3D>(); // pure light effects: not paintable / sampled surfaces

  // ---------- materials ----------
  const mSand = k.mat(k.tex("ds-sand", () => D.sand(3)), "#fff", [1, 1], { roughness: 0.95, bump: 0.7 });
  const mRock = k.mat(k.tex("ds-rock", () => D.rock("#6f6d64", 4, 0.45)), "#fff", [1, 1], { roughness: 0.92, bump: 1.0 });
  const mCliff = k.mat(k.tex("ds-cliff", () => D.rock("#5a605c", 9, 0.6)), "#fff", [2, 2], { roughness: 0.95, bump: 1.1 });
  const mHull = k.mat(k.tex("ds-hull", () => D.hullPlanks(5)), "#fff", [1, 1], { roughness: 0.85, bump: 0.9 });
  mHull.m.side = THREE.DoubleSide;
  const mDeck = k.mat(k.tex("ds-deck", () => D.hullPlanks(8, "#6a543c")), "#fff", [1, 1], { roughness: 0.85, bump: 0.9 });
  const mTimber = k.mat(k.tex("ds-deck", () => D.hullPlanks(8, "#6a543c")), "#8d7a64", [1, 1], { roughness: 0.85, bump: 0.8 });
  const mBarrel = k.mat(k.tex("ds-barrel", () => D.barrel(6)), "#fff", [1, 1], { roughness: 0.8, bump: 0.7 });
  const mChest = k.mat(k.tex("ds-chest", () => D.chest(14)), "#fff", [1, 1], { roughness: 0.75, bump: 0.6 });
  const mIron = k.mat(null, "#2f302f", [1, 1], { metalness: 0.75, roughness: 0.6 });
  const mRust = k.mat(k.tex("ds-rust", () => D.rock("#6b4a36", 17, 0.2)), "#fff", [1, 1], { metalness: 0.5, roughness: 0.75, bump: 0.6 });
  const mGold = k.mat(null, "#e2b64a", [1, 1], { metalness: 1, roughness: 0.28, emissive: "#6b4a10", emissiveIntensity: 0.25 });
  const mMarble = k.mat(k.tex("ds-marble", () => D.marble(7)), "#fff", [1, 1], { roughness: 0.45, bump: 0.2 });
  const mStone = k.mat(k.tex("ds-stone", () => D.marble(21, "#b9b3a3")), "#fff", [1, 1], { roughness: 0.8, bump: 0.6 });
  const mPaving = k.mat(k.tex("ds-paving", () => D.paving(8)), "#fff", [1, 1], { roughness: 0.9, bump: 0.8 });
  const mPlaque = k.mat(k.tex("ds-plaque", () => D.plaque("THE SEA UNICORN", "guardian of the sunken city")), "#fff", [1, 1], { roughness: 0.7, bump: 0.5 });
  const mRope = k.mat(k.tex("ds-rope", () => D.barrel(33)), "#c9b48a", [1, 1], { roughness: 0.95, bump: 0.4 });
  const mSail = k.mat(k.tex("ds-sail", () => D.sail(13)), "#fff", [1, 1], { transparent: true, roughness: 0.95 });
  const mBrain = k.mat(k.tex("ds-brain", () => D.brainCoral(9)), "#fff", [3, 3], { roughness: 0.8, bump: 1.2 });
  const mPolyp = k.mat(k.tex("ds-polyp", () => D.polyps(10)), "#fff", [2, 2], { roughness: 0.75, bump: 0.9 });
  const mFan = k.mat(k.tex("ds-fan", () => D.fanLace(11)), "#fff", [1, 1], { transparent: true, roughness: 0.8 });
  const mKelp = k.mat(k.tex("ds-kelp", () => D.kelpBlade(12)), "#fff", [1, 1], { transparent: true, roughness: 0.7 });
  const mStalk = k.mat(null, "#6e6424", [1, 1], { roughness: 0.7 });
  const mGrass = k.mat(null, "#ffffff", [1, 1], { roughness: 0.75 });
  mGrass.m.side = THREE.DoubleSide;
  const mAnem = k.mat(null, "#ffffff", [1, 1], { roughness: 0.55, emissive: "#301020", emissiveIntensity: 0.3 });
  mAnem.m.vertexColors = true;
  const mShellWhite = k.mat(k.tex("ds-shell", () => D.marble(31, "#efe6da", false)), "#fff", [1, 1], { roughness: 0.4, bump: 0.5 });
  const mMantle = k.mat(k.tex("ds-mantle", () => D.polyps(44)), "#6b5bff", [2, 2], { roughness: 0.35, emissive: "#3a2aff", emissiveIntensity: 0.35, bump: 0.5 });
  const mPearl = k.mat(null, "#fbf7f2", [1, 1], { roughness: 0.08, metalness: 0.25, emissive: "#cfe8ff", emissiveIntensity: 0.35 });
  const mStar = k.mat(k.tex("ds-polyp", () => D.polyps(10)), "#fff", [4, 4], { roughness: 0.7, bump: 1.0 });
  const mUrchin = k.mat(null, "#2a1830", [1, 1], { roughness: 0.4 });
  const mGlowWarm = k.mat(null, "#ffe2a8", [1, 1], { emissive: "#ffb24a", emissiveIntensity: 2.4 });
  const mLanternGlass = k.mat(null, "#ffd79a", [1, 1], { roughness: 0.1, emissive: "#ff9a30", emissiveIntensity: 1.2 });
  const mInst = k.mat(null, "#ffffff", [1, 1], { roughness: 0.6 });

  const glass = (m: Mat, op: number) => { m.m.transparent = true; m.m.opacity = op; m.m.alphaTest = 0; m.m.depthWrite = false; m.m.side = THREE.DoubleSide; return m; };
  const mJelly = glass(k.mat(k.tex("ds-jelly", D.jellyBell), "#fff", [1, 1], { roughness: 0.15, emissive: "#ffffff", emissiveIntensity: 0.55, bump: 0 }), 0.55);
  const mTentacle = glass(k.mat(null, "#ffd6f2", [1, 1], { roughness: 0.3, emissive: "#ff7fd0", emissiveIntensity: 0.7 }), 0.6);
  const mBubble = glass(k.mat(null, "#dff6ff", [1, 1], { roughness: 0.02, metalness: 0.3, emissive: "#6fc6e8", emissiveIntensity: 0.35 }), 0.38);
  const mSnow = k.mat(null, "#cfefff", [1, 1], { emissive: "#bfe8ff", emissiveIntensity: 0.6 });
  /** light-only overlay: emissive colour masked by the texture's brightness */
  const lightMat = (tex: D.FishKind | string, make: () => ReturnType<typeof D.causticPool>, col: string, op: number, rep: [number, number] = [1, 1]) => {
    const pt = k.tex(tex, make);
    const t = pt.texture.clone();
    t.repeat.set(...rep);
    t.needsUpdate = true;
    const m = new THREE.MeshStandardMaterial({ color: "#000000", emissive: col, emissiveMap: t, alphaMap: t, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide, roughness: 1 });
    m.polygonOffset = true;
    m.polygonOffsetFactor = -2;
    return { m, ptex: null, repeat: rep } as Mat;
  };
  const mCausticTile = lightMat("ds-caus-tile", () => D.causticPool(2, false), "#9ff4ff", 0.35, [12, 10]);
  const mPool = lightMat("ds-caus-pool", () => D.causticPool(1, true), "#b8fbff", 0.85);
  const mRay = lightMat("ds-ray", D.lightRay, "#8fe8ff", 0.22);
  const decoAdd = (g: G, m: Mat, p: V3t, rotY = 0, rotX = 0) => {
    const mesh = k.add(g, m, p, { rotY, rotX, noShadow: true });
    mesh.receiveShadow = false;
    deco.add(mesh);
    return mesh;
  };

  lap("mats");
  // ---------- layout ----------
  const X0 = -24, X1 = 24, Z0 = -20, Z1 = 20;
  const PX = 2, PZ = 1.5; // plaza / statue centre
  const life = new Life(k, 1717);
  const crateStencils = ["RUM", "GUNPOWDER", "KODNER & CO."].map((t) => life.graffiti({ text: t, color: "#1e140c", style: "stencil", px: [320, 110], drip: false, font: SERIF }));
  let crateN = 0;
  const GX = 2, GZ = 17.6; // ruined gate (hunter entrance)
  const taken: [number, number, number][] = []; // keep-out circles for random scatter
  const keep = (x: number, z: number, r: number) => taken.push([x, z, r]);
  const free = (x: number, z: number, r: number) => taken.every(([a, c, d]) => Math.hypot(a - x, c - z) > d + r);

  // ---------- floor, dunes, light ----------
  k.floor(X0 - 12, X1 + 12, Z0 - 12, Z1 + 12, mSand, 3.2);
  decoAdd(new THREE.PlaneGeometry(X1 - X0 + 6, Z1 - Z0 + 6), mCausticTile, [0, 0.025, 0], 0, -PI / 2);
  const pool = (x: number, z: number, r: number) => decoAdd(new THREE.CircleGeometry(r, 40), mPool, [x, 0.035, z], R() * 6, -PI / 2);
  const dune = (x: number, z: number, sx: number, sz: number, h: number, ry = 0) =>
    b.add(mSand, xf(new THREE.SphereGeometry(1, 28, 8, 0, PI * 2, 0, PI / 2), x, -0.02, z, 0, ry, 0, [sx, h, sz]), 3.2);

  // ---------- rocks ----------
  const rockGeos = [rockGeo(11, 3), rockGeo(23, 3), rockGeo(37, 3, -0.2), rockGeo(51, 3, -0.5)];
  const cliffGeos = [rockGeo(61, 4, -0.6), rockGeo(73, 4, -0.4), rockGeo(89, 4, -0.7)];
  const rocks: { pos: V3t; rotY: number; scale: V3t; color?: string }[][] = rockGeos.map(() => []);
  const cliffs: { pos: V3t; rotY: number; scale: V3t; color?: string }[][] = cliffGeos.map(() => []);
  const rockTint = ["#ffffff", "#e9eef0", "#f2ece2", "#dfe6e2", "#c9cfd0"];
  /** boulder with radius ~s (footprint), height h */
  const boulder = (x: number, z: number, s: number, h: number, solid = true) => {
    const gi = Math.floor(R() * rockGeos.length);
    rocks[gi].push({ pos: [x, -0.05, z], rotY: R() * 6.28, scale: [s * rr(0.85, 1.15), h / 1.3, s * rr(0.85, 1.15)], color: pick(rockTint) });
    if (solid) k.collider(x - s * 0.82, x + s * 0.82, z - s * 0.82, z + s * 0.82, 0, h * 0.92, true);
    keep(x, z, s);
  };
  // canyon walls around the arena (big lumpy cliffs half outside the bounds)
  const cliffAt = (x: number, z: number, s: number, h: number) => {
    const gi = Math.floor(R() * cliffGeos.length);
    cliffs[gi].push({ pos: [x, -0.3, z], rotY: R() * 6.28, scale: [s, h / 1.4, s * rr(0.8, 1.2)], color: pick(rockTint) });
  };
  for (let x = X0 - 2; x <= X1 + 2; x += rr(4.5, 6.5)) {
    cliffAt(x, Z0 - 3.2 - R(), rr(4.5, 6), rr(7, 14));
    if (Math.abs(x - GX) > 4.5) cliffAt(x, Z1 + 3.2 + R(), rr(4.5, 6), rr(7, 13));
  }
  for (let z = Z0 + 2; z <= Z1 - 2; z += rr(4.5, 6.5)) {
    cliffAt(X0 - 3.2 - R(), z, rr(4.5, 6), rr(8, 15));
    cliffAt(X1 + 3.2 + R(), z, rr(4.5, 6), rr(8, 15));
  }
  // behind the gate: a darker cleft between two tall pinnacles
  cliffAt(GX - 5.8, Z1 + 3.4, 4.2, 15);
  cliffAt(GX + 5.8, Z1 + 3.4, 4.2, 16);
  cliffAt(GX, Z1 + 7.5, 5, 18);

  // =============================================================================================
  // SUNKEN PLAZA + UNICORN STATUE
  // =============================================================================================
  {
    keep(PX, PZ, 8.6);
    const pave = new THREE.CircleGeometry(7.2, 48);
    b.add(mPaving, xf(pave, PX, 0.03, PZ, -PI / 2, 0, 0));
    boxUV(pave, 3.0);
    // a raised ring kerb (broken in places)
    for (let i = 0; i < 28; i++) {
      if (i % 9 === 4 || i % 7 === 2) continue;
      const a = (i / 28) * PI * 2;
      b.box(mStone, 1.45, 0.22, 0.45, PX + Math.cos(a) * 7.35, -0.02, PZ + Math.sin(a) * 7.35, { ry: -a + PI / 2, rz: (R() - 0.5) * 0.08, uv: 0.8 });
    }
    pool(PX, PZ, 7.5);
    // plinth
    const f = new Frame(PX, PZ, 0);
    b.box(mStone, 3.9, 0.35, 2.7, PX, 0, PZ, { uv: 1.2 });
    b.box(mMarble, 3.3, 0.9, 2.15, PX, 0.35, PZ, { uv: 1.2 });
    b.box(mStone, 3.55, 0.18, 2.4, PX, 1.25, PZ, { uv: 1.2 });
    k.collider(PX - 1.95, PX + 1.95, PZ - 1.35, PZ + 1.35, 0, 0.35, true);
    k.collider(PX - 1.78, PX + 1.78, PZ - 1.2, PZ + 1.2, 0, 1.43, true);
    k.add(new THREE.PlaneGeometry(2.2, 0.68), mPlaque, [PX, 0.8, PZ + 1.08], { noShadow: true });
    // barnacles / coral creeping over the plinth
    for (let i = 0; i < 26; i++) {
      const side = Math.floor(R() * 4);
      const u = rr(-1, 1);
      const x = side < 2 ? PX + u * 1.6 : PX + (side === 2 ? -1.66 : 1.66);
      const z = side < 2 ? PZ + (side === 0 ? -1.09 : 1.09) : PZ + u * 1.05;
      if (side === 1 && Math.abs(u) < 0.75) continue;
      b.add(mPolyp, sphere(rr(0.04, 0.09), x, rr(0.1, 0.7), z, 8, 6, [1, 0.6, 1]));
    }
    // ---- the unicorn (life-size horse x1.35, built from capsules), facing the gate (+Z) ----
    const S = 1.35, top = 1.43;
    const parts: G[] = [];
    const L = (a: V3t, c: V3t, r: number, sz = 1) => parts.push(capsule(a, c, r, sz, 14));
    const Bl = (x: number, y: number, z: number, r: number, s: V3t) => parts.push(sphere(r, x, y, z, 18, 12, s));
    L([-0.5, 1.26, 0], [0.5, 1.3, 0], 0.37, 0.82);
    Bl(0.55, 1.3, 0, 0.41, [1.05, 1, 0.8]);
    Bl(-0.58, 1.33, 0, 0.42, [1.05, 1, 0.86]);
    L([0.6, 1.42, 0], [0.86, 1.86, 0], 0.25, 0.72);
    L([0.84, 1.8, 0], [1.02, 2.12, 0], 0.18, 0.75);
    L([1.02, 2.14, 0], [1.38, 1.84, 0], 0.13, 0.78);
    Bl(1.03, 2.05, 0, 0.16, [1, 1, 0.7]);
    Bl(1.41, 1.8, 0, 0.105, [1, 0.95, 0.85]);
    for (const s of [-1, 1]) parts.push(rod([0.98, 2.24, s * 0.06], [0.93, 2.42, s * 0.075], 0.05, 0.008, 8));
    // legs: front-left raised, others standing
    L([0.58, 1.06, 0.17], [0.8, 0.82, 0.19], 0.095, 1);
    L([0.8, 0.82, 0.19], [0.68, 0.52, 0.2], 0.065, 1);
    parts.push(xf(new THREE.CylinderGeometry(0.07, 0.085, 0.1, 12), 0.66, 0.46, 0.2, 0, 0, 0.9));
    L([0.58, 1.06, -0.17], [0.6, 0.52, -0.17], 0.095, 1);
    L([0.6, 0.52, -0.17], [0.61, 0.1, -0.17], 0.062, 1);
    parts.push(xf(new THREE.CylinderGeometry(0.07, 0.085, 0.1, 12), 0.61, 0.05, -0.17));
    for (const s of [-1, 1]) {
      L([-0.6, 1.18, s * 0.19], [-0.72, 0.68, s * 0.19], 0.145, 0.9);
      L([-0.72, 0.68, s * 0.19], [-0.64, 0.1, s * 0.19], 0.064, 1);
      parts.push(xf(new THREE.CylinderGeometry(0.07, 0.085, 0.1, 12), -0.64, 0.05, s * 0.19));
    }
    // flowing tail and mane
    for (let i = 0; i < 4; i++) {
      const o = (i - 1.5) * 0.035;
      parts.push(tube([[-0.92, 1.42, o], [-1.1, 1.38, o * 1.5], [-1.2, 1.1, o * 2 + 0.03], [-1.18, 0.75, o * 3 + 0.06], [-1.25, 0.45, o * 3.5]], 0.05 - i * 0.004, 20, 6));
    }
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      const x = 0.66 + t * 0.36, y = 1.72 + t * 0.52;
      Bl(x - 0.08, y, 0, 0.1 - t * 0.02, [1.5, 0.7, 0.5]);
      parts.push(tube([[x - 0.06, y, 0.03], [x - 0.14, y - 0.12, 0.1], [x - 0.12, y - 0.3, 0.14]], 0.03, 8, 5));
    }
    Bl(1.05, 2.28, 0, 0.07, [1.6, 0.8, 0.9]); // forelock
    const statue = merge(parts);
    b.add(mMarble, f.put(xf(statue, 0, top, 0, 0, -PI / 2, 0, [S, S, S])));
    // spiral horn (gold)
    const horn = lathe([[0.05, 0], [0.045, 0.1], [0.036, 0.25], [0.024, 0.4], [0.012, 0.52], [0, 0.6]], 16);
    const hp = horn.attributes.position;
    for (let i = 0; i < hp.count; i++) {
      const x = hp.getX(i), y = hp.getY(i), z = hp.getZ(i);
      const a = Math.atan2(z, x), k2 = 1 + 0.18 * Math.sin(a * 2 + y * 38);
      hp.setXYZ(i, x * k2, y, z * k2);
    }
    horn.computeVertexNormals();
    const hb = new V3(1.12, 2.22, 0), hd = new V3(0.62, 0.78, 0).normalize();
    horn.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), hd));
    horn.translate(hb.x, hb.y, hb.z);
    b.add(mGold, f.put(xf(horn, 0, top, 0, 0, -PI / 2, 0, [S, S, S])));
    // colliders: body and neck (standable on the back)
    k.collider(PX - 0.45, PX + 0.45, PZ - 1.35, PZ + 1.35, top + 0.95 * S, top + 1.62 * S, true);
    k.collider(PX - 0.3, PX + 0.3, PZ + 0.8, PZ + 1.6, top + 1.5 * S, top + 2.3 * S, true);
    // broken columns around the plaza
    const colAt = (a: number, h: number) => {
      const x = PX + Math.cos(a) * 8.1, z = PZ + Math.sin(a) * 8.1;
      b.add(mStone, xf(lathe([[0.62, 0], [0.62, 0.22], [0.5, 0.3], [0.46, 0.38]], 28), x, 0, z), 1.1);
      const shaft = new THREE.CylinderGeometry(0.4, 0.44, h, 20, 1);
      const sp = shaft.attributes.position;
      const ph = R() * 6, tilt = rr(0.1, 0.3);
      for (let i = 0; i < sp.count; i++) {
        if (sp.getY(i) < h / 2 - 0.001) continue;
        const ax = sp.getX(i), az = sp.getZ(i);
        const a = Math.atan2(az, ax);
        sp.setY(i, h / 2 - (Math.hypot(ax, az) > 0.01 ? tilt * (1 + Math.cos(a + ph)) + 0.08 * Math.abs(Math.sin(a * 5 + ph)) : tilt * 0.9));
      }
      shaft.computeVertexNormals();
      b.add(mMarble, xf(shaft, x, 0.38 + h / 2, z));
      k.collider(x - 0.5, x + 0.5, z - 0.5, z + 0.5, 0, 0.38 + h + 0.1, true);
      for (let i = 0; i < 5; i++) b.add(mPolyp, sphere(rr(0.05, 0.12), x + Math.cos(i * 1.3) * 0.43, rr(0.5, h), z + Math.sin(i * 1.3) * 0.43, 8, 6, [1, 0.6, 1]));
    };
    colAt(-PI * 0.8, 3.8); colAt(-PI * 0.6, 2.1); colAt(-PI * 0.2, 4.6); colAt(PI * 0.05, 1.4); colAt(PI * 0.3, 3.2); colAt(PI * 0.72, 2.6); colAt(PI * 0.95, 4.2);
    // a toppled column lying across the kerb
    for (const [cx, cz, ry, len] of [[PX + 8.5, PZ + 5.8, 0.6, 4.2], [PX - 9.3, PZ + 3.2, -0.35, 3.4]] as [number, number, number, number][]) {
      b.add(mMarble, xf(new THREE.CylinderGeometry(0.42, 0.42, len, 20), cx, 0.42, cz, 0, ry, PI / 2), 0);
      const dx = Math.cos(-ry) * len / 2, dz = Math.sin(-ry) * len / 2;
      for (let i = 0; i <= 6; i++) {
        const t = i / 6 - 0.5;
        const x = cx + dx * t * 2, z = cz + dz * t * 2;
        k.collider(x - 0.42, x + 0.42, z - 0.42, z + 0.42, 0, 0.84, true);
      }
      keep(cx, cz, len / 2 + 0.5);
    }
  }

  lap("plaza");
  // =============================================================================================
  // SHIPWRECK (north-west)
  // =============================================================================================
  const SX0 = -21.2, SL = 18.2, SZ = -11.2, SB = 3.15, SH = 3.2, BURY = 1.6;
  const taper = (t: number) => (t < 0.36 ? Math.pow(Math.sin((Math.max(0, t) / 0.36) * PI / 2), 0.62) : 1 - 0.13 * ((t - 0.36) / 0.64) ** 2);
  const sheer = (t: number) => (t < 0.3 ? 0.75 * (1 - t / 0.3) ** 2 : 0);
  const jag = (t: number) => Math.abs(Math.sin(t * 91) * 0.6 + Math.sin(t * 217 + 1) * 0.4);
  const topAt = (t: number) => {
    let y = SH + sheer(t);
    if (t > 0.6) y -= ((t - 0.6) / 0.4) * 1.9 + jag(t) * 0.45;
    return y;
  };
  const sect = (y: number) => {
    const q = Math.min(1, Math.max(0, (y + BURY) / (SH + BURY + 0.6)));
    return 0.28 + 0.72 * Math.pow(Math.sin((q * PI) / 2), 0.45);
  };
  const hw = (t: number, y: number) => SB * taper(t) * sect(y);
  const tOf = (x: number) => (x - SX0) / SL;
  type Hole = { s: number; x1: number; x2: number; y0: number; y1: number };
  const holes: Hole[] = [
    { s: 1, x1: -13.4, x2: -7.7, y0: -2, y1: 2.45 },
    { s: -1, x1: -9.6, x2: -6.9, y0: -2, y1: 1.9 },
    { s: -1, x1: -17.2, x2: -16.5, y0: 1.35, y1: 1.95 },
    { s: -1, x1: -14.6, x2: -13.9, y0: 1.35, y1: 1.95 },
    { s: 1, x1: -17.4, x2: -16.7, y0: 1.35, y1: 1.95 },
  ];
  const inHole = (x: number, y: number, s: number) =>
    holes.some((h) => {
      if (h.s !== s) return false;
      const big = h.y0 < 0;
      const j = big ? 0.35 : 0;
      const x1 = h.x1 + j * Math.abs(Math.sin(y * 7.3 + h.x1)), x2 = h.x2 - j * Math.abs(Math.sin(y * 5.1 + h.x2));
      const y1 = h.y1 + (big ? 0.45 * Math.sin(x * 3.7) * Math.sin(x * 1.3 + 2) : 0);
      return x > x1 && x < x2 && y > h.y0 && y < y1;
    });
  {
    // ---- hull shell (parametric, both sides) ----
    const NU = 92, NV = 22;
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    for (const s of [1, -1]) {
      const base = pos.length / 3;
      for (let i = 0; i <= NU; i++) {
        const t = i / NU, yt = topAt(t);
        for (let j = 0; j <= NV; j++) {
          const y = -BURY + (j / NV) * (yt + BURY);
          const x = SX0 + t * SL, z = SZ + s * hw(t, y);
          pos.push(x, y, z);
          uv.push(x / 2.3, y / 2.4);
        }
      }
      for (let i = 0; i < NU; i++)
        for (let j = 0; j < NV; j++) {
          const a = base + i * (NV + 1) + j, bq = a + NV + 1;
          const cx = (pos[a * 3] + pos[bq * 3]) / 2, cy = (pos[a * 3 + 1] + pos[(a + 1) * 3 + 1]) / 2;
          if (inHole(cx, cy, s)) continue;
          if (s > 0) idx.push(a, bq, a + 1, bq, bq + 1, a + 1);
          else idx.push(a, a + 1, bq, bq, a + 1, bq + 1);
        }
    }
    const hull = new THREE.BufferGeometry();
    hull.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    hull.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    hull.setIndex(idx);
    hull.computeVertexNormals();
    k.add(hull, mHull, [0, 0, 0]);
    // gunwale rail + wale strakes (fore part, intact), keel stem at the bow
    for (const s of [1, -1]) {
      const rail: V3t[] = [], wale: V3t[] = [];
      for (let t = 0.004; t <= 0.61; t += 0.03) {
        rail.push([SX0 + t * SL, topAt(t) + 0.03, SZ + s * (hw(t, topAt(t)) + 0.03)]);
        wale.push([SX0 + t * SL, 2.2, SZ + s * (hw(t, 2.2) + 0.05)]);
      }
      b.add(mTimber, tube(rail, 0.1, 48, 6));
      b.add(mTimber, tube(wale.filter((p) => !inHole(p[0], 2.2, s) && !inHole(p[0] + 0.3, 2.2, s)), 0.07, 40, 6));
    }
    b.add(mTimber, tube([[SX0 + 0.3, -0.6, SZ], [SX0 - 0.05, 1.5, SZ], [SX0 - 0.1, 3.4, SZ], [SX0 + 0.1, 4.25, SZ]], 0.17, 20, 8));
    b.add(mTimber, rod([SX0 + 0.1, 3.9, SZ], [SX0 - 2.2, 5.3, SZ], 0.16, 0.1, 10)); // bowsprit
    // ribs visible inside
    for (let t = 0.12; t < 0.99; t += 0.052) {
      if (R() < 0.12) continue;
      for (const s of [1, -1]) {
        const pts: V3t[] = [];
        const yt = topAt(t) - (t > 0.6 ? 0.3 + R() * 0.6 : 0.1);
        for (let y = 0; y <= yt; y += 0.45) pts.push([SX0 + t * SL, y, SZ + s * (hw(t, y) - 0.1)]);
        if (pts.length > 2) b.add(mTimber, tube(pts, 0.085, 10, 5));
      }
    }
    // lower deck planking (sand-covered, missing boards)
    for (let zz = -2.1; zz <= 2.1; zz += 0.27) {
      let x = SX0 + 2.2;
      while (x < SX0 + SL - 0.5) {
        const len = rr(0.8, 3.2);
        const xe = Math.min(x + len, SX0 + SL - 0.4);
        const tm = tOf((x + xe) / 2);
        if (R() > 0.22 && Math.abs(zz) < hw(tOf(x), 0) - 0.25 && Math.abs(zz) < hw(tm, 0) - 0.25) b.box(mDeck, xe - x - 0.03, 0.05, 0.25, (x + xe) / 2, 0.02, SZ + zz, { ry: (R() - 0.5) * 0.04, uv: 1.2 });
        x = xe + (R() < 0.2 ? rr(0.3, 1.0) : 0.02);
      }
    }
    // upper deck (fore half) — planks with broken ends
    const DY = 2.92;
    const deckEnd: number[] = [];
    for (let zz = -2.95; zz <= 2.95; zz += 0.26) {
      let ts = 0.02;
      while (ts < 0.4 && hw(ts, DY) - 0.12 < Math.abs(zz)) ts += 0.005;
      if (ts >= 0.4) continue;
      const xe = SX0 + SL * rr(0.44, 0.53);
      const xs = SX0 + ts * SL;
      deckEnd.push(xe);
      b.box(mDeck, xe - xs, 0.08, 0.24, (xs + xe) / 2, DY, SZ + zz, { uv: 1.2 });
    }
    const minEnd = Math.min(...deckEnd);
    for (let x = SX0 + 0.8; x < minEnd - 0.2; x += 0.8) {
      const w2 = hw(tOf(x), DY) - 0.25;
      if (w2 > 0.3) k.collider(x - 0.4, x + 0.4, SZ - w2, SZ + w2, DY - 0.1, DY + 0.08, true);
    }
    // deck beams across the open aft part (some missing)
    for (let x = minEnd + 0.4; x < SX0 + SL - 1; x += 1.25) {
      const t = tOf(x), yt = topAt(t);
      if (yt < DY + 0.05 || R() < 0.25) continue;
      const w2 = hw(t, DY) - 0.05;
      const cut = R() < 0.35 ? rr(0.4, 1.6) : 0;
      b.box(mTimber, 0.22, 0.2, w2 * 2 - cut, x, DY - 0.2, SZ + cut / 2 * (R() < 0.5 ? 1 : -1), { uv: 1 });
      k.collider(x - 0.11, x + 0.11, SZ - w2 + cut, SZ + w2, DY - 0.2, DY, true);
    }
    // ---- hull wall colliders ----
    for (let x = SX0 + 0.25; x < SX0 + SL; x += 0.5) {
      const t = tOf(x), yt = topAt(t);
      const wIn = hw(t, 0), wOut = hw(t, yt) + 0.06;
      if (t < 0.1) { k.collider(x - 0.25, x + 0.25, SZ - wOut, SZ + wOut, 0, yt, false); continue; }
      for (const s of [1, -1]) {
        const z1 = SZ + s * (wIn - 0.12), z2 = SZ + s * wOut;
        const h = holes.find((hh) => hh.s === s && hh.y0 < 0 && x > hh.x1 - 0.1 && x < hh.x2 + 0.1);
        const bottom = h ? h.y1 + 0.2 : 0;
        if (yt > bottom) k.collider(x - 0.25, x + 0.25, Math.min(z1, z2), Math.max(z1, z2), bottom, yt, false);
      }
    }
    // splintered plank ends around the big breach
    for (let i = 0; i < 14; i++) {
      const x = rr(-13.2, -7.9), y = rr(0.3, 2.4);
      if (inHole(x, y, 1) && R() < 0.6) continue;
      const t = tOf(x);
      b.box(mTimber, rr(0.4, 1.1), 0.05, 0.22, x, y, SZ + hw(t, y) + 0.05, { ry: rr(-0.5, 0.5), rz: rr(-0.6, 0.6), uv: 1 });
    }
    // ---- masts ----
    const fmX = SX0 + SL * 0.25;
    b.add(mTimber, rod([fmX, -0.2, SZ], [fmX, 8.2, SZ], 0.27, 0.2, 14));
    b.add(mTimber, xf(new THREE.ConeGeometry(0.2, 0.6, 14, 1), fmX, 8.45, SZ, 0.25, 0, 0.3));
    b.add(mTimber, rod([fmX, 3.05, SZ - 0.35], [fmX, 3.05, SZ + 0.35], 0.36, 0.36, 14)); // mast partner
    k.collider(fmX - 0.28, fmX + 0.28, SZ - 0.28, SZ + 0.28, 0, 8.3, true);
    // yard (tilted) with torn sail
    const ya: V3t = [fmX + 0.3, 6.9, SZ - 2.5], yb: V3t = [fmX + 0.3, 6.3, SZ + 2.6];
    b.add(mTimber, rod(ya, yb, 0.11, 0.1, 10));
    const sailG = new THREE.PlaneGeometry(4.8, 3.2, 8, 6);
    const sp = sailG.attributes.position;
    for (let i = 0; i < sp.count; i++) sp.setZ(i, Math.sin((sp.getX(i) / 4.8 + 0.5) * PI) * 0.35 + Math.sin(sp.getY(i) * 2) * 0.08);
    sailG.computeVertexNormals();
    k.add(sailG, mSail, [fmX + 0.45, 4.95, SZ], { rotY: PI / 2, rotX: 0, rotZ: 0.12 });
    // rigging ropes from the mast top to the rails
    for (const s of [1, -1]) for (const dx of [-1.2, 0.6]) {
      const t = tOf(fmX + dx);
      b.add(mRope, tube([[fmX, 7.8, SZ], [fmX + dx * 0.6, 5.3, SZ + s * 1.4], [fmX + dx, topAt(t), SZ + s * hw(t, topAt(t))]], 0.025, 12, 4));
    }
    // mizzen stump in the stern
    const mzX = SX0 + SL * 0.88;
    b.add(mTimber, rod([mzX, -0.2, SZ], [mzX, 1.9, SZ], 0.24, 0.22, 12));
    b.add(mTimber, xf(new THREE.ConeGeometry(0.22, 0.5, 12, 1), mzX, 2.1, SZ, 0.4, 0, -0.2));
    k.collider(mzX - 0.25, mzX + 0.25, SZ - 0.25, SZ + 0.25, 0, 2.1, true);
    // fallen mainmast: leans on the broken starboard rail and runs down onto the sand (a ramp onto the wreck)
    const mA = new V3(-6.4, 2.72, SZ + hw(tOf(-6.4), 2.5) - 0.2), mB = new V3(-0.8, 0.3, -4.6);
    const dir = mB.clone().sub(mA).normalize();
    const mTop = mA.clone().addScaledVector(dir, -2.4);
    b.add(mTimber, rod(mTop, mB, 0.3, 0.27, 16));
    b.add(mTimber, xf(new THREE.ConeGeometry(0.3, 0.7, 16, 1), mB.x + dir.x * 0.25, mB.y, mB.z + dir.z * 0.25, 0, Math.atan2(dir.x, dir.z), PI / 2 + 0.2));
    b.add(mRope, xf(new THREE.TorusGeometry(0.33, 0.05, 6, 20), (mA.x + mB.x) / 2, (mA.y + mB.y) / 2, (mA.z + mB.z) / 2, 0, Math.atan2(dir.x, dir.z), 0));
    const run = Math.hypot(mB.x - mA.x, mB.z - mA.z);
    for (let d = 0; d <= run; d += 0.32) {
      const p = mA.clone().lerp(mB, d / run);
      k.collider(p.x - 0.26, p.x + 0.26, p.z - 0.26, p.z + 0.26, Math.max(0, p.y - 0.3), p.y + 0.28, true);
    }
    // a broken yard + sail scrap on the sand next to it
    b.add(mTimber, rod([0.2, 0.12, -7.8], [-3.6, 0.12, -5.9], 0.1, 0.1, 10));
    // ---- anchor on the sand at the bow ----
    {
      const af = new Frame(-19.6, -4.6, 0.5);
      const sh = new THREE.Shape();
      sh.moveTo(-0.08, 2.2); sh.lineTo(0.08, 2.2); sh.lineTo(0.08, 0.45);
      sh.quadraticCurveTo(0.7, 0.45, 1.05, 1.0); sh.lineTo(1.3, 0.9); sh.lineTo(1.1, 1.35);
      sh.quadraticCurveTo(0.7, 0.2, 0, 0.12);
      sh.quadraticCurveTo(-0.7, 0.2, -1.1, 1.35); sh.lineTo(-1.3, 0.9); sh.lineTo(-1.05, 1.0);
      sh.quadraticCurveTo(-0.7, 0.45, -0.08, 0.45); sh.closePath();
      const ag = new THREE.ExtrudeGeometry(sh, { depth: 0.16, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1, curveSegments: 10 });
      ag.translate(0, 0, -0.08);
      boxUV(ag, 1);
      b.add(mRust, af.put(xf(ag, 0, 0.12, 0, -1.25, 0, 0.12)));
      b.add(mRust, af.put(xf(new THREE.TorusGeometry(0.16, 0.04, 8, 16), 0, 0.2, -2.35, PI / 2, 0, 0)));
      b.add(mTimber, af.put(rod([-1.1, 0.35, -1.95], [1.1, 0.6, -1.95], 0.1, 0.1, 10)));
      af.box(k, -1.3, 1.3, -2.2, 0.4, 0, 0.55, true);
      keep(-19.6, -4.6, 2.2);
      // chain to the hawse hole
      const chainPts: V3t[] = [];
      const [ax, az] = af.pt(0, -2.4);
      const hx = SX0 + 1.2, hz = SZ + hw(tOf(hx), 2.4) + 0.05;
      for (let i = 0; i <= 26; i++) {
        const t = i / 26;
        chainPts.push([ax + (hx - ax) * t + Math.sin(t * 9) * 0.25, Math.max(0.06, 2.4 * t * t * t), az + (hz - az) * t]);
      }
      const links = chainPts.map((p, i) => {
        const n = chainPts[Math.min(i + 1, chainPts.length - 1)], q = chainPts[Math.max(0, i - 1)];
        return { pos: p, rotY: Math.atan2(n[0] - q[0], n[2] - q[2]), rotZ: i % 2 ? PI / 2 : 0, scale: [1, 1, 1] as V3t };
      });
      k.instances(xf(new THREE.TorusGeometry(0.1, 0.03, 6, 12), 0, 0, 0, 0, PI / 2, 0, [1, 1, 1.6]), mRust, links);
    }
    k.room("Shipwreck", SX0, SX0 + SL, SZ - 3.4, SZ + 3.4);
    keep(-12, SZ, 4);
    keep(-7, SZ, 4.2);
    keep(-17, SZ, 4.2);
    keep(-3.3, SZ, 3.6);
    keep(-3.4, -5.9, 1.4);
    keep(-1.4, -5.1, 1.2);
    // sand drifts against the hull
    for (const s of [1, -1]) for (let x = SX0 + 2; x < SX0 + SL - 1; x += 3.2) dune(x, SZ + s * (hw(tOf(x), 0) + 0.8), 2.2, 1.1, rr(0.18, 0.3));
  }

  lap("ship");
  // ---------- props: barrels, crates, chests, cannons, lanterns ----------
  const barrelG = lathe([[0.25, 0], [0.29, 0.1], [0.315, 0.3], [0.32, 0.45], [0.315, 0.6], [0.29, 0.8], [0.25, 0.9]], 20);
  const barrelLid = xf(new THREE.CircleGeometry(0.25, 20), 0, 0.9, 0, -PI / 2, 0, 0);
  const barrelBase = xf(new THREE.CircleGeometry(0.25, 20), 0, 0, 0, PI / 2, 0, 0);
  const barrelGeo = merge([barrelG, barrelLid, barrelBase]);
  const barrels: { pos: V3t; rotY?: number; rotX?: number; rotZ?: number; color?: string }[] = [];
  const barrel = (x: number, z: number, lying = false, y = 0) => {
    if (lying) {
      const ry = R() * 6.28;
      barrels.push({ pos: [x - Math.sin(ry) * 0.45, y + 0.3, z - Math.cos(ry) * 0.45], rotY: ry, rotX: PI / 2, color: pick(["#ffffff", "#e0d6c8", "#cfd8c8"]) });
      k.collider(x - 0.45, x + 0.45, z - 0.45, z + 0.45, y, y + 0.6, true);
    } else {
      barrels.push({ pos: [x, y, z], rotY: R() * 6, rotZ: (R() - 0.5) * 0.08, color: pick(["#ffffff", "#e0d6c8", "#d6dccf"]) });
      k.collider(x - 0.31, x + 0.31, z - 0.31, z + 0.31, y, y + 0.9, true);
    }
  };
  const crate = (x: number, z: number, s: number, ry: number, y = 0) => {
    b.box(mDeck, s - 0.04, s - 0.04, s - 0.04, x, y + 0.02, z, { ry, uv: 0.9 });
    for (const cx of [-1, 1]) for (const cz of [-1, 1]) { const lx = cx * (s / 2 - 0.035), lz = cz * (s / 2 - 0.035); b.box(mTimber, 0.07, s, 0.07, x + lx * Math.cos(ry) + lz * Math.sin(ry), y, z - lx * Math.sin(ry) + lz * Math.cos(ry), { ry, uv: 0.8 }); }
    { const id = crateStencils[crateN++ % crateStencils.length]; for (const f of [1, -1]) life.wall(id, x + Math.sin(ry) * f * (s / 2 + 0.035), y + s * 0.35, z + Math.cos(ry) * f * (s / 2 + 0.035), s * 0.62, ry + (f < 0 ? PI : 0), 0.04); }
    for (const dz of [-1, 1]) b.box(mTimber, s * 1.02, 0.08, 0.06, x + Math.sin(ry) * dz * s * 0.5, y + s * 0.5, z + Math.cos(ry) * dz * s * 0.5, { ry, rz: 0.78, uv: 0.8 });
    k.collider(x - s * 0.62, x + s * 0.62, z - s * 0.62, z + s * 0.62, y, y + s, true);
  };
  const chest = (x: number, z: number, ry: number, open: boolean, gold = true) => {
    const f = new Frame(x, z, ry);
    b.add(mChest, f.put(xf(boxGeo(0.95, 0.5, 0.6), 0, 0.25, 0)));
    const lid = new THREE.CylinderGeometry(0.3, 0.3, 0.95, 16, 1, false, 0, PI);
    if (open) b.add(mChest, f.put(xf(lid, 0, 0.5 + 0.3, -0.3 - 0.02, -1.9, 0, PI / 2)));
    else b.add(mChest, f.put(xf(lid, 0, 0.5, 0, PI / 2, 0, PI / 2)));
    b.add(mGold, f.put(xf(boxGeo(0.14, 0.18, 0.04), 0, 0.42, 0.31)));
    if (open && gold) {
      b.add(mGold, f.put(xf(new THREE.SphereGeometry(0.42, 16, 8, 0, PI * 2, 0, PI / 2), 0, 0.46, 0, 0, 0, 0, [1.05, 0.35, 0.65])));
      for (let i = 0; i < 3; i++) b.add(mGold, f.put(xf(lathe([[0.05, 0], [0.02, 0.02], [0.015, 0.1], [0.06, 0.16], [0.07, 0.24], [0.064, 0.24], [0.02, 0.15], [0, 0.14]], 14), -0.3 + i * 0.28, 0.55, (R() - 0.5) * 0.2, 0, 0, (R() - 0.5) * 0.6)));
    }
    f.box(k, -0.5, 0.5, -0.32, 0.32, 0, open ? 0.62 : 0.8, true);
  };
  const cannon = (x: number, z: number, ry: number, y = 0, carriage = true) => {
    const f = new Frame(x, z, ry, y);
    const barrelC = lathe([[0.0, -0.05], [0.12, -0.05], [0.16, 0.02], [0.2, 0.1], [0.19, 0.4], [0.16, 1.2], [0.15, 1.45], [0.18, 1.5], [0.18, 1.6], [0.1, 1.6], [0.09, 1.2]], 18);
    b.add(mIron, f.put(xf(barrelC, 0, carriage ? 0.55 : 0.2, carriage ? -0.6 : -0.8, PI / 2 - (carriage ? 0.06 : 0), 0, 0)));
    b.add(mIron, f.put(xf(new THREE.SphereGeometry(0.08, 10, 8), 0, carriage ? 0.55 : 0.2, carriage ? -0.7 : -0.9)));
    if (carriage) {
      for (const s of [-1, 1]) {
        b.add(mTimber, f.put(xf(boxGeo(0.1, 0.42, 1.1), s * 0.2, 0.33, -0.2)));
        for (const dz of [-0.55, 0.2]) b.add(mTimber, f.put(xf(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 14), s * 0.3, 0.16, dz, 0, 0, PI / 2)));
      }
      b.add(mTimber, f.put(xf(boxGeo(0.5, 0.1, 1.1), 0, 0.12, -0.2)));
      f.box(k, -0.4, 0.4, -0.8, 0.9, 0, 0.75, true);
    } else f.box(k, -0.25, 0.25, -0.9, 0.9, 0, 0.4, true);
  };
  const lantern = (x: number, y: number, z: number) => {
    b.add(mIron, xf(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6), x, y + 0.42, z));
    b.add(mIron, xf(new THREE.ConeGeometry(0.16, 0.14, 8), x, y + 0.26, z));
    b.add(mLanternGlass, xf(new THREE.CylinderGeometry(0.1, 0.1, 0.24, 8), x, y + 0.07, z));
    b.add(mGlowWarm, sphere(0.05, x, y + 0.07, z, 8, 6));
    b.add(mIron, xf(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 8), x, y - 0.06, z));
  };
  {
    // inside the wreck
    const f0 = SZ;
    barrel(-15.6, f0 + 1.3); barrel(-15.0, f0 + 1.6); barrel(-15.3, f0 + 0.9, false); barrel(-15.25, f0 + 1.3, false, 0.9);
    barrel(-12.6, f0 - 1.5, true); barrel(-11.8, f0 - 1.6);
    crate(-17.8, f0 - 0.9, 0.7, 0.2); crate(-17.9, f0 + 0.2, 0.6, 0.5); crate(-17.8, f0 - 0.7, 0.5, 0.9, 0.7);
    cannon(-16.85, f0 - 1.35, PI, 0);
    cannon(-14.25, f0 - 1.5, PI, 0);
    cannon(-17.05, f0 + 1.35, 0, 0);
    chest(-10.2, f0 + 0.2, -0.3, true);
    chest(-5.2, f0 - 0.6, 1.2, false);
    lantern(-12.6, 2.1, f0);
    b.add(mIron, rod([-12.6, 2.6, f0], [-12.6, 2.72, f0], 0.012, 0.012, 4));
    b.add(mRope, xf(new THREE.TorusGeometry(0.28, 0.07, 8, 20), -8.6, 0.08, f0 - 1.2, PI / 2, 0, 0));
    b.add(mRope, xf(new THREE.TorusGeometry(0.2, 0.06, 8, 18), -8.6, 0.2, f0 - 1.2, PI / 2, 0, 0));
    // hammock-like table knocked over
    b.box(mDeck, 1.4, 0.08, 0.8, -6.5, 0.4, f0 + 0.9, { rz: 1.2, uv: 1 });
    b.box(mTimber, 0.08, 0.7, 0.08, -6.2, 0.02, f0 + 0.6, { rz: 1.4 });
    // on deck: barrels and a crate
    barrel(-18.2, f0 + 0.8, false, 2.98); barrel(-17.6, f0 + 1.1, true, 2.98); crate(-14.2, f0 - 1.2, 0.8, 0.3, 2.98);
    // scattered around the wreck on the sand
    barrel(-2.2, -8.6, true); barrel(-1.2, -9.8, false); barrel(-5.8, -3.4, true);
    barrel(-19.3, -15.4); barrel(-18.6, -15.9, true);
    crate(-4.1, -15.9, 0.8, 0.7); crate(-3.2, -16.2, 0.55, 0.2);
    chest(-2.4, -13.6, 0.8, true);
    cannon(-6.2, -16.1, 1.1, 0, false);
    cannon(0.5, -9.6, -0.4, 0, false);
    // cannonball pile
    const balls: { pos: V3t }[] = [];
    for (let l = 0; l < 3; l++) for (let i = 0; i < 3 - l; i++) for (let j = 0; j < 3 - l; j++) balls.push({ pos: [-7.8 + i * 0.22 + l * 0.11, 0.11 + l * 0.18, -15.5 + j * 0.22 + l * 0.11] });
    k.instances(new THREE.SphereGeometry(0.11, 10, 8), mIron, balls);
    for (const [x, z] of [[-4.1, -15.9], [-2.4, -13.6], [-6.2, -16.1], [0.5, -9.6], [-7.6, -15.3], [-1.2, -9.8], [-2.2, -8.6], [-5.8, -3.4], [-19, -15.6]] as [number, number][]) keep(x, z, 1.2);
    // gold coins spilling from the chest
    const coins: { pos: V3t; rotX: number; rotZ: number; rotY: number }[] = [];
    for (let i = 0; i < 90; i++) {
      const a = R() * 6.28, d = Math.pow(R(), 1.6) * 1.6;
      coins.push({ pos: [-2.4 + Math.cos(a) * d + 0.5, 0.02 + R() * 0.03, -13.6 + Math.sin(a) * d + 0.4], rotX: (R() - 0.5) * 0.6, rotZ: (R() - 0.5) * 0.6, rotY: R() * 6 });
    }
    k.instances(new THREE.CylinderGeometry(0.035, 0.035, 0.008, 10), mGold, coins, { noShadow: true });
  }

  // =============================================================================================
  // RUINED GATE (south) — hunter entrance
  // =============================================================================================
  {
    for (const s of [-1, 1]) {
      const x = GX + s * 2.8;
      b.box(mStone, 1.4, 0.4, 1.4, x, 0, GZ, { uv: 1 });
      b.add(mMarble, xf(new THREE.CylinderGeometry(0.5, 0.55, 4.6, 22), x, 2.7, GZ), 0);
      b.box(mStone, 1.3, 0.35, 1.3, x, 5.0, GZ, { uv: 1 });
      k.collider(x - 0.7, x + 0.7, GZ - 0.7, GZ + 0.7, 0, 5.35, true);
      for (let i = 0; i < 8; i++) b.add(mPolyp, sphere(rr(0.06, 0.14), x + Math.cos(i) * 0.52, rr(0.5, 4.5), GZ + Math.sin(i) * 0.52, 8, 6, [1, 0.6, 1]));
    }
    // lintel, cracked, one end slipped
    b.box(mStone, 3.2, 0.6, 1.1, GX - 1.0, 5.35, GZ, { rz: 0.02, uv: 1.2 });
    b.box(mStone, 2.9, 0.6, 1.1, GX + 2.1, 5.2, GZ + 0.05, { rz: -0.12, uv: 1.2 });
    k.collider(GX - 3.4, GX + 3.4, GZ - 0.55, GZ + 0.55, 5.3, 5.95, true);
    // fallen block
    b.box(mStone, 1.2, 0.6, 0.9, GX + 5.2, 0, GZ - 1.8, { ry: 0.5, rz: 0.1, uv: 1.2 });
    k.collider(GX + 4.5, GX + 5.9, GZ - 2.4, GZ - 1.2, 0, 0.62, true);
    keep(GX, GZ - 2.2, 3.4);
    keep(GX, GZ, 4.2);
    pool(GX, GZ - 3, 4.2);
    k.room("Ruined Gate", GX - 6, GX + 6, 13, Z1);
  }

  // =============================================================================================
  // PEARL GARDEN — giant clams (north-middle)
  // =============================================================================================
  const bubbles: { pos: V3t; scale: V3t }[] = [];
  const bubbleColumn = (x: number, y: number, z: number, h: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const s = 0.03 + t * 0.06 + R() * 0.03;
      bubbles.push({ pos: [x + Math.sin(i * 1.7) * 0.15 * (1 + t * 2), y + t * h + R() * 0.2, z + Math.cos(i * 2.3) * 0.15 * (1 + t * 2)], scale: [s, s * 0.85, s] });
    }
  };
  {
    const valve = (up: boolean) => {
      const g = new THREE.SphereGeometry(1, 40, 10, 0, PI * 2, up ? 0 : PI / 2, PI / 2);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const a = Math.atan2(z, x);
        const rib = 1 + 0.07 * Math.abs(Math.sin(a * 5));
        const lip = Math.abs(y) < 0.2 ? 0.12 * Math.sin(a * 10) * (0.2 - Math.abs(y)) * 5 : 0;
        p.setXYZ(i, x * rib, y + lip * (up ? -1 : 1), z * rib);
      }
      g.computeVertexNormals();
      return g;
    };
    const lower = valve(false), upper = valve(true);
    const clam = (x: number, z: number, s: number, ry: number) => {
      const f = new Frame(x, z, ry);
      b.add(mShellWhite, f.put(xf(lower.clone(), 0, 0.5 * s, 0, 0, 0, 0, [1.4 * s, 0.5 * s, 1.0 * s])));
      // upper valve hinged at the back (-Z), opened ~50°
      const up = upper.clone();
      xf(up, 0, 0, 1.0, 0, 0, 0);
      xf(up, 0, 0, 0, -0.85, 0, 0);
      xf(up, 0, 0, -1.0, 0, 0, 0);
      b.add(mShellWhite, f.put(xf(up, 0, 0.5 * s, 0, 0, 0, 0, [1.4 * s, 0.55 * s, 1.0 * s])));
      b.add(mMantle, f.put(xf(new THREE.SphereGeometry(1, 32, 8, 0, PI * 2, 0, PI / 2), 0, 0.42 * s, 0.02, 0, 0, 0, [1.28 * s, 0.14 * s, 0.9 * s])));
      b.add(mPearl, f.put(sphere(0.28 * s, 0, 0.72 * s, 0.15 * s, 24, 16)));
      f.box(k, -1.3 * s, 1.3 * s, -0.95 * s, 0.95 * s, 0, 0.5 * s + 0.08, true);
      keep(x, z, 1.6 * s);
      bubbleColumn(x + Math.sin(ry) * 0.3, 1.1 * s, z + 0.2, rr(6, 10), 14);
    };
    clam(5.8, -14.5, 1.35, 0.35);
    clam(9.6, -11.6, 0.95, -0.6);
    clam(2.6, -17.1, 0.8, 0.2);
    clam(-12.4, 8.2, 0.9, 2.4);
    clam(15.8, 9.6, 1.0, -2.2);
    pool(6.4, -13.8, 5);
    k.room("Pearl Garden", 0, 11, Z0, -8.5);
  }

  lap("props");
  // =============================================================================================
  // CORAL
  // =============================================================================================
  const coralCols = ["#ff7f50", "#b565d8", "#ff5c8a", "#f5d142", "#5ec8e5", "#ff9f40", "#e84a5f", "#9be15d"];
  // branching coral generator
  const branchCoral = (seed: number, splits: number, depth: number, spread: number) => {
    const r = D.rng(seed);
    const parts: G[] = [];
    const grow = (p: THREE.Vector3, d: THREE.Vector3, len: number, rad: number, lvl: number) => {
      const e = p.clone().addScaledVector(d, len);
      parts.push(rod(p, e, rad, rad * 0.78, 5, true));
      if (lvl >= depth) { parts.push(new THREE.SphereGeometry(rad * 0.85, 5, 3).translate(e.x, e.y, e.z)); return; }
      for (let i = 0; i < splits; i++) {
        const nd = d.clone().add(new V3((r() - 0.5) * spread, (r() - 0.1) * 0.5, (r() - 0.5) * spread)).normalize();
        grow(e, nd, len * (0.72 + r() * 0.2), rad * 0.74, lvl + 1);
      }
    };
    for (let i = 0; i < 3; i++) grow(new V3((r() - 0.5) * 0.1, 0, (r() - 0.5) * 0.1), new V3((r() - 0.5) * 0.8, 1, (r() - 0.5) * 0.8).normalize(), 0.34, 0.055, 0);
    const g = merge(parts);
    boxUV(g, 0.5);
    return g;
  };
  const stagGeo = branchCoral(5, 2, 3, 1.3);
  const bushGeo = branchCoral(9, 3, 2, 1.9);
  const tableGeo = lathe([[0.07, 0], [0.09, 0.2], [0.14, 0.3], [0.5, 0.36], [0.95, 0.4], [1.02, 0.47], [0.98, 0.5], [0.5, 0.45], [0.12, 0.42], [0, 0.43]], 28);
  const brainGeo = new THREE.SphereGeometry(1, 24, 8, 0, PI * 2, 0, PI / 2);
  const tubeCluster = (() => {
    const parts: G[] = [];
    const r = D.rng(77);
    for (let i = 0; i < 5; i++) {
      const h = 0.45 + r() * 0.8, rad = 0.08 + r() * 0.06;
      const t = lathe([[rad * 0.8, 0], [rad, h * 0.5], [rad * 1.15, h], [rad * 0.85, h], [rad * 0.7, h * 0.3]], 12);
      const a = i * 1.3;
      xf(t, Math.cos(a) * 0.14 * (i ? 1 : 0), 0, Math.sin(a) * 0.14 * (i ? 1 : 0), (r() - 0.5) * 0.35, 0, (r() - 0.5) * 0.35);
      parts.push(t);
    }
    return merge(parts);
  })();
  const pillarCluster = (() => {
    const parts: G[] = [];
    const r = D.rng(99);
    for (let i = 0; i < 7; i++) {
      const h = 0.6 + r() * 1.3, a = r() * 6.28, d = i ? 0.12 + r() * 0.22 : 0;
      parts.push(capsule([Math.cos(a) * d, 0, Math.sin(a) * d], [Math.cos(a) * d * 1.2, h, Math.sin(a) * d * 1.2], 0.08 + r() * 0.04, 1, 8, 2));
    }
    const g = merge(parts);
    boxUV(g, 0.4);
    return g;
  })();
  const fanGeo = (() => {
    const g = new THREE.PlaneGeometry(1, 1, 4, 4);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) + 0.5) * PI) * 0.08);
    g.translate(0, 0.5, 0);
    g.computeVertexNormals();
    return g;
  })();
  const anemGeo = (() => {
    const parts: G[] = [];
    const r = D.rng(123);
    const col = new THREE.CylinderGeometry(0.16, 0.2, 0.22, 14, 1);
    col.translate(0, 0.11, 0);
    paint(col, "#8a4a5a");
    parts.push(col);
    const tip = new THREE.Color("#fff4f8"), base = new THREE.Color("#ff8fc0");
    for (let i = 0; i < 44; i++) {
      const a = i * 2.39996, d = Math.sqrt(i / 44) * 0.16;
      const L = 0.2 + r() * 0.14;
      const bx = Math.cos(a) * d, bz = Math.sin(a) * d;
      const out = new V3(Math.cos(a) * (0.3 + d * 3), 1, Math.sin(a) * (0.3 + d * 3)).normalize();
      const t = rod(new V3(bx, 0.21, bz), new V3(bx + out.x * L, 0.21 + out.y * L, bz + out.z * L), 0.018, 0.008, 5, true);
      paint(t, (y) => base.clone().lerp(tip, Math.min(1, Math.max(0, (y - 0.22) / (L * 0.8)))));
      parts.push(t);
    }
    return merge(parts);
  })();
  const urchinGeo = (() => {
    const parts: G[] = [new THREE.SphereGeometry(0.12, 10, 8)];
    const ico = new THREE.IcosahedronGeometry(0.12, 1);
    const p = ico.attributes.position;
    const seen = new Set<string>();
    for (let i = 0; i < p.count; i++) {
      const v = new V3().fromBufferAttribute(p, i);
      const key = v.toArray().map((n) => n.toFixed(3)).join();
      if (seen.has(key)) continue;
      seen.add(key);
      parts.push(rod(v.clone().multiplyScalar(0.9), v.clone().multiplyScalar(2.9), 0.012, 0.002, 4, true));
    }
    const g = merge(parts);
    g.translate(0, 0.1, 0);
    return g;
  })();
  const starGeo = (() => {
    const sh = new THREE.Shape();
    for (let i = 0; i <= 10; i++) {
      const a = (i / 10) * PI * 2 + PI / 2, r = i % 2 ? 0.07 : 0.2;
      if (i === 0) sh.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else sh.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.02, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2, curveSegments: 4 });
    g.rotateX(-PI / 2);
    g.translate(0, 0.02, 0);
    return g;
  })();
  const shellGeo = (() => {
    const g = lathe([[0, 0], [0.06, 0.02], [0.1, 0.06], [0.09, 0.12], [0.06, 0.18], [0.03, 0.24], [0, 0.3]], 14);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); const s = 1 + 0.15 * Math.sin(y * 60); p.setX(i, p.getX(i) * s); p.setZ(i, p.getZ(i) * s); }
    g.computeVertexNormals();
    g.rotateZ(PI / 2 - 0.2);
    g.translate(0.1, 0.07, 0);
    return g;
  })();

  type Inst = { pos: V3t; rotX?: number; rotY?: number; rotZ?: number; scale?: V3t; color?: string };
  const stag: Inst[] = [], bush: Inst[] = [], tables: Inst[] = [], brains: Inst[] = [], tubes: Inst[] = [], pillars: Inst[] = [], fans: Inst[] = [], anems: Inst[] = [], urchins: Inst[] = [], stars: Inst[] = [], shells: Inst[] = [];
  const coralAt = (x: number, y: number, z: number, s: number, kind = Math.floor(R() * 7)) => {
    const c = pick(coralCols), ry = R() * 6.28;
    if (kind === 0) stag.push({ pos: [x, y, z], rotY: ry, scale: [s * 1.5, s * 1.5, s * 1.5], color: c });
    else if (kind === 1) bush.push({ pos: [x, y, z], rotY: ry, scale: [s * 1.6, s * 1.4, s * 1.6], color: c });
    else if (kind === 2) { tables.push({ pos: [x, y, z], rotY: ry, scale: [s * 0.9, s * 0.9, s * 0.9], color: pick(["#9fd8b0", "#c2b6ff", "#f2c28a", "#8fd0e8"]) }); if (y < 0.1 && s > 0.8) k.collider(x - 0.6 * s, x + 0.6 * s, z - 0.6 * s, z + 0.6 * s, 0, 0.47 * s * 0.9, true); }
    else if (kind === 3) { brains.push({ pos: [x, y - 0.05, z], rotY: ry, scale: [s * 0.55, s * 0.4, s * 0.55], color: pick(["#f2a0b6", "#d9e27a", "#e8c07a", "#a8e0c8", "#f7d0a0"]) }); if (y < 0.1) k.collider(x - 0.45 * s, x + 0.45 * s, z - 0.45 * s, z + 0.45 * s, 0, s * 0.38, true); }
    else if (kind === 4) tubes.push({ pos: [x, y, z], rotY: ry, scale: [s, s, s], color: pick(["#9a5cff", "#ffcf3a", "#ff7a3a", "#ff5fa8", "#54d0ff"]) });
    else if (kind === 5) pillars.push({ pos: [x, y, z], rotY: ry, scale: [s, s, s], color: pick(["#f0e2c0", "#ffd9a8", "#d8f0e0"]) });
    else fans.push({ pos: [x, y, z], rotY: ry, rotZ: (R() - 0.5) * 0.3, scale: [s * 1.5, s * 1.4, 1], color: pick(["#ff4a6e", "#b25cff", "#ffb03a", "#ff6ad5", "#ffe14a"]) });
  };
  const anemone = (x: number, y: number, z: number, s: number, col = pick(["#ffffff", "#ffd0f0", "#c8ffd8", "#fff0b0", "#d8c8ff"])) => {
    anems.push({ pos: [x, y, z], rotY: R() * 6, scale: [s, s, s], color: col });
  };
  const scatterSmall = (x: number, z: number, r: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const a = R() * 6.28, d = R() * r, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      const q = R();
      if (q < 0.4) stars.push({ pos: [px, 0.0, pz], rotY: R() * 6, scale: [rr(0.8, 1.6), 1, rr(0.8, 1.6)].map((v, j) => (j === 1 ? 1 : v)) as V3t, color: pick(["#ff6a3a", "#ff3a5c", "#ffb03a", "#6a8aff", "#c05cff"]) });
      else if (q < 0.65) urchins.push({ pos: [px, 0, pz], rotY: R() * 6, scale: [rr(0.7, 1.3), rr(0.7, 1.1), rr(0.7, 1.3)] as V3t, color: pick(["#ffffff", "#9a6aa0", "#606080"]) });
      else shells.push({ pos: [px, 0, pz], rotY: R() * 6, scale: [rr(1, 2), rr(1, 2), rr(1, 2)] as V3t, color: pick(["#ffe0d0", "#f8c8a8", "#fff4e8", "#e8b0b8"]) });
    }
  };

  lap("coralgeo");
  // ---- the reef (east) ----
  {
    const reefRocks: [number, number, number, number][] = [];
    for (let i = 0; i < 400 && reefRocks.length < 18; i++) {
      const x = rr(10, 22.5), z = rr(-18.5, 17.5), s = rr(1.0, 2.3);
      if (!free(x, z, s + 1.3)) continue;
      const h = rr(0.9, 2.4);
      boulder(x, z, s, h);
      reefRocks.push([x, z, s, h]);
    }
    // corals crowning the rocks and carpeting the sand between
    for (const [x, z, s, h] of reefRocks) {
      const n = 3 + Math.floor(R() * 4);
      for (let i = 0; i < n; i++) {
        const a = R() * 6.28, d = R() * s * 0.55;
        coralAt(x + Math.cos(a) * d, h * (0.82 - d / s * 0.35), z + Math.sin(a) * d, rr(0.5, 1.0));
      }
      if (R() < 0.6) fans.push({ pos: [x + s * 0.4, h * 0.6, z], rotY: R() * 6, scale: [rr(1.2, 2.2), rr(1.2, 2), 1], color: pick(["#ff4a6e", "#b25cff", "#ffb03a"]) });
      if (R() < 0.4) anemone(x - s * 0.3, h * 0.78, z + s * 0.2, rr(0.8, 1.2));
    }
    for (let i = 0, n = 0; i < 700 && n < 60; i++) {
      const x = rr(8.5, 23), z = rr(-19, 18.5);
      if (!free(x, z, 0.9)) continue;
      n++;
      const kind = Math.floor(R() * 7);
      const s = rr(0.6, 1.4);
      coralAt(x, 0, z, s, kind);
      keep(x, z, kind === 2 || kind === 3 ? 0.7 * s + 0.9 : 0.8);
    }
    for (const [x, z] of [[12.5, -6.5], [18.4, 3.2], [13.8, 12.8], [20.5, -14.2], [10.8, 5.2]] as [number, number][]) {
      if (free(x, z, 0.4)) { anemone(x, 0, z, rr(1.2, 1.7)); keep(x, z, 1.2); }
    }
    pool(15, -3, 5.5); pool(17, 10, 4.5); pool(15.5, -14, 4.5);
    scatterSmall(15, 0, 9, 40);
    k.room("Coral Reef", 8.5, X1, Z0, Z1);
  }

  // ---- kelp forest (south-west) ----
  const kelpStalks: G[] = [];
  const blades: Inst[] = [];
  const floats: Inst[] = [];
  {
    for (let i = 0, n = 0; i < 500 && n < 30; i++) {
      const x = rr(-22.5, -2.5), z = rr(2.2, 18.8);
      if (!free(x, z, 1.1) || (x > -4.5 && z < 9)) continue;
      n++;
      keep(x, z, 0.8);
      const H = rr(6, 11), lean = rr(0.6, 1.4), ph = R() * 6;
      const pts: V3t[] = [];
      for (let j = 0; j <= 8; j++) {
        const t = j / 8;
        pts.push([x + Math.sin(t * 3 + ph) * 0.25 * t + lean * t * t, t * H, z + Math.cos(t * 2.4 + ph) * 0.3 * t]);
      }
      kelpStalks.push(tube(pts, 0.035, 28, 5));
      const curve = new THREE.CatmullRomCurve3(pts.map((p) => new V3(...p)));
      for (let y = 0.5; y < H - 0.2; y += rr(0.35, 0.55)) {
        const p = curve.getPoint(y / H);
        const side = R() * 6.28;
        blades.push({ pos: [p.x, p.y, p.z], rotY: side, rotZ: rr(0.35, 0.8) * (R() < 0.5 ? 1 : -1), scale: [rr(0.8, 1.2), rr(0.8, 1.3), 1], color: pick(["#ffffff", "#e8f0c8", "#f0e0b0", "#d8e8b8"]) });
        if (R() < 0.6) floats.push({ pos: [p.x, p.y, p.z], scale: [0.045, 0.06, 0.045] });
      }
      const tp = curve.getPoint(1);
      for (let j = 0; j < 5; j++) blades.push({ pos: [tp.x, tp.y, tp.z], rotY: j * 1.25 + R(), rotZ: rr(1.0, 1.5), scale: [1.1, rr(1.2, 1.6), 1], color: "#f0e8c0" });
    }
    // rocks and sea grass meadow among the kelp
    for (let i = 0, n = 0; i < 300 && n < 9; i++) {
      const x = rr(-22, -4), z = rr(3, 18);
      if (!free(x, z, 2)) continue;
      n++;
      boulder(x, z, rr(0.8, 1.6), rr(0.6, 1.5));
      if (R() < 0.6) anemone(x + 0.3, 0.9, z, 0.9);
    }
    pool(-13, 11, 5);
    pool(-8, 16, 3.5);
    k.room("Kelp Forest", X0, -2, 2, Z1);
  }
  // sea grass everywhere in soft patches
  const grass: Inst[] = [];
  const grassPatch = (x: number, z: number, r: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const a = R() * 6.28, d = Math.sqrt(R()) * r;
      grass.push({ pos: [x + Math.cos(a) * d, 0, z + Math.sin(a) * d], rotY: R() * 6.28, rotZ: (R() - 0.5) * 0.5, scale: [1, rr(0.6, 1.6), 1], color: pick(["#4f8a3a", "#6fa04a", "#3f7a4a", "#8aa84a", "#5f9a5a"]) });
    }
  };
  for (const [x, z, r, n] of [[-14, 8, 4, 160], [-6, 13, 3, 90], [-19, 15, 3, 80], [-10, 3.5, 2.5, 70], [9, -4, 2.2, 50], [-3, 10, 2, 50], [6, 12, 2.2, 60], [-6, -17, 2.4, 60], [11, -18, 2, 40], [-21, -1, 2, 40]] as [number, number, number, number][]) grassPatch(x, z, r, n);

  // ---- open sand between areas: loose rocks, coral heads, starfish ----
  for (let i = 0, n = 0; i < 500 && n < 16; i++) {
    const x = rr(-22, 22), z = rr(-18.5, 18.5);
    if (!free(x, z, 2.2)) continue;
    n++;
    const s = rr(0.6, 1.5);
    boulder(x, z, s, rr(0.5, 1.4));
    if (R() < 0.7) coralAt(x, s * 0.7, z, rr(0.4, 0.8));
  }
  for (let i = 0, n = 0; i < 500 && n < 26; i++) {
    const x = rr(-22, 22), z = rr(-18.5, 18.5);
    if (!free(x, z, 1)) continue;
    n++;
    const kind = Math.floor(R() * 7);
    const s = rr(0.6, 1.2);
    coralAt(x, 0, z, s, kind);
    keep(x, z, 1.1);
  }
  anemone(-1.2, 0, -12.6, 1.4); anemone(6.5, 0, 9.2, 1.3); anemone(-4.4, 0, 6.2, 1.2); anemone(10.4, 0, -8.2, 1.2);
  scatterSmall(PX, PZ, 7, 14);
  scatterSmall(-10, 10, 7, 20);
  scatterSmall(4, -13, 5, 16);
  scatterSmall(-12, -4, 6, 14);
  // rocks framing the plaza edge (low, climbable)
  boulder(PX - 7.9, PZ - 5.8, 1.2, 1.1); boulder(PX + 9.5, PZ - 3.4, 1.1, 0.9);

  lap("scatter");
  // =============================================================================================
  // FISH
  // =============================================================================================
  type Prof = [number, number][];
  const fishGeo = (prof: Prof, hs: number, ws: number, dorsal: [number, number][], anal: [number, number][], tail: [number, number][]) => {
    const body = lathe(prof.map(([x, r]) => [r, x] as [number, number]), 12);
    body.rotateZ(-PI / 2);
    body.scale(1, hs, ws);
    const fins: G[] = [];
    const fin = (pts: [number, number][], below: boolean) => {
      const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: false, curveSegments: 6 });
      g.translate(0, 0, -0.006);
      const p = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, below ? 0.25 : 0.75, Math.min(0.98, Math.max(0.02, p.getX(i))));
      fins.push(g);
    };
    fin(dorsal, false);
    if (anal.length) fin(anal, true);
    fin(tail, false);
    // pectoral fins
    for (const s of [-1, 1]) {
      const g = new THREE.CircleGeometry(0.06, 8, 0, PI);
      g.scale(1.6, 1, 1);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.25, 0.7);
      xf(g, 0.62, -0.02 * hs, s * 0.09 * ws * 1.8, 0, s * 0.5, PI);
      fins.push(g);
    }
    const g = merge([body, ...fins]);
    return g;
  };
  const rAt = (prof: Prof, x: number) => {
    for (let i = 1; i < prof.length; i++) if (x <= prof[i][0]) { const [x0, r0] = prof[i - 1], [x1, r1] = prof[i]; return r0 + ((r1 - r0) * (x - x0)) / (x1 - x0); }
    return 0;
  };
  const species: Record<D.FishKind, G> = {} as Record<D.FishKind, G>;
  {
    const clownP: Prof = [[0, 0.03], [0.08, 0.07], [0.25, 0.14], [0.5, 0.18], [0.72, 0.17], [0.88, 0.12], [0.97, 0.06], [1, 0]];
    const up = (p: Prof, hs: number, x: number) => rAt(p, x) * hs * 0.85;
    species.clown = fishGeo(clownP, 1.05, 0.55,
      [[0.25, up(clownP, 1.05, 0.25)], [0.35, up(clownP, 1.05, 0.35) + 0.1], [0.5, up(clownP, 1.05, 0.5) + 0.06], [0.62, up(clownP, 1.05, 0.62) + 0.1], [0.75, up(clownP, 1.05, 0.75)]],
      [[0.2, -up(clownP, 1.05, 0.2)], [0.3, -up(clownP, 1.05, 0.3) - 0.08], [0.45, -up(clownP, 1.05, 0.45)]],
      [[0.06, 0.03], [-0.12, 0.13], [-0.16, 0], [-0.12, -0.13], [0.06, -0.03]]);
    const tangP: Prof = [[0, 0.03], [0.1, 0.08], [0.3, 0.2], [0.55, 0.26], [0.75, 0.22], [0.9, 0.13], [1, 0]];
    species.blueTang = fishGeo(tangP, 1.2, 0.34,
      [[0.1, up(tangP, 1.2, 0.1)], [0.3, up(tangP, 1.2, 0.3) + 0.08], [0.6, up(tangP, 1.2, 0.6) + 0.07], [0.8, up(tangP, 1.2, 0.8)]],
      [[0.1, -up(tangP, 1.2, 0.1)], [0.3, -up(tangP, 1.2, 0.3) - 0.07], [0.55, -up(tangP, 1.2, 0.55)]],
      [[0.05, 0.03], [-0.18, 0.2], [-0.12, 0], [-0.18, -0.2], [0.05, -0.03]]);
    const discP: Prof = [[0, 0.03], [0.1, 0.1], [0.3, 0.27], [0.5, 0.32], [0.72, 0.27], [0.88, 0.15], [1, 0]];
    species.yellowTang = fishGeo(discP, 1.35, 0.26,
      [[0.1, up(discP, 1.35, 0.1)], [0.3, up(discP, 1.35, 0.3) + 0.12], [0.6, up(discP, 1.35, 0.6) + 0.06], [0.72, up(discP, 1.35, 0.72)]],
      [[0.1, -up(discP, 1.35, 0.1)], [0.3, -up(discP, 1.35, 0.3) - 0.12], [0.6, -up(discP, 1.35, 0.6)]],
      [[0.05, 0.03], [-0.14, 0.14], [-0.1, 0], [-0.14, -0.14], [0.05, -0.03]]);
    species.angel = fishGeo(discP, 1.3, 0.24,
      [[0.1, up(discP, 1.3, 0.1)], [-0.08, up(discP, 1.3, 0.3) + 0.3], [0.35, up(discP, 1.3, 0.35) + 0.12], [0.7, up(discP, 1.3, 0.7)]],
      [[0.1, -up(discP, 1.3, 0.1)], [-0.06, -up(discP, 1.3, 0.3) - 0.28], [0.35, -up(discP, 1.3, 0.35) - 0.1], [0.62, -up(discP, 1.3, 0.62)]],
      [[0.05, 0.03], [-0.13, 0.12], [-0.15, 0], [-0.13, -0.12], [0.05, -0.03]]);
    const bfP: Prof = [[0, 0.03], [0.12, 0.12], [0.35, 0.28], [0.55, 0.3], [0.75, 0.22], [0.9, 0.1], [0.97, 0.05], [1, 0]];
    species.butterfly = fishGeo(bfP, 1.25, 0.25,
      [[0.1, up(bfP, 1.25, 0.1)], [0.25, up(bfP, 1.25, 0.25) + 0.1], [0.55, up(bfP, 1.25, 0.55) + 0.05], [0.72, up(bfP, 1.25, 0.72)]],
      [[0.1, -up(bfP, 1.25, 0.1)], [0.25, -up(bfP, 1.25, 0.25) - 0.1], [0.5, -up(bfP, 1.25, 0.5)]],
      [[0.05, 0.03], [-0.12, 0.1], [-0.13, 0], [-0.12, -0.1], [0.05, -0.03]]);
    const parP: Prof = [[0, 0.04], [0.1, 0.09], [0.3, 0.17], [0.55, 0.2], [0.78, 0.18], [0.92, 0.13], [0.99, 0.07], [1, 0]];
    species.parrot = fishGeo(parP, 1.1, 0.5,
      [[0.15, up(parP, 1.1, 0.15)], [0.25, up(parP, 1.1, 0.25) + 0.06], [0.7, up(parP, 1.1, 0.7) + 0.05], [0.8, up(parP, 1.1, 0.8)]],
      [[0.15, -up(parP, 1.1, 0.15)], [0.25, -up(parP, 1.1, 0.25) - 0.06], [0.45, -up(parP, 1.1, 0.45)]],
      [[0.06, 0.04], [-0.18, 0.2], [-0.12, 0], [-0.18, -0.2], [0.06, -0.04]]);
  }
  const fishInst: Record<D.FishKind, Inst[]> = { clown: [], blueTang: [], yellowTang: [], angel: [], butterfly: [], parrot: [] };
  const fish = (kind: D.FishKind, x: number, y: number, z: number, len: number, heading: number, col = "#ffffff") => {
    // body is modelled nose = +X, centred at x 0..1 → shift so the fish is centred on (x,y,z)
    const c = Math.cos(heading), s = Math.sin(heading);
    fishInst[kind].push({ pos: [x - c * len * 0.5, y, z + s * len * 0.5], rotY: heading, rotZ: (R() - 0.5) * 0.25, scale: [len, len, len], color: col });
  };
  const school = (kind: D.FishKind, cx: number, cy: number, cz: number, n: number, rad: number, len: number, heading: number, ringy = false) => {
    for (let i = 0; i < n; i++) {
      const a = R() * 6.28, d = Math.cbrt(R()) * rad;
      const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, y = cy + (R() - 0.5) * rad * 0.6;
      const h = ringy ? -a + PI : heading + (R() - 0.5) * 0.35;
      fish(kind, x, y, z, len * rr(0.85, 1.15), h, pick(["#ffffff", "#f4f4ff", "#fff4ea"]));
    }
  };
  school("blueTang", 15, 3.6, -4, 28, 3.2, 0.34, 0.6);
  school("yellowTang", 12.5, 2.4, 8, 24, 2.6, 0.3, -2.4);
  school("butterfly", 18.5, 2.0, -12, 14, 2.0, 0.28, 2.0);
  school("yellowTang", -12, 3.2, 12, 18, 2.8, 0.3, 1.2);
  school("blueTang", PX, 7.2, PZ, 46, 4.2, 0.26, 0, true);
  school("butterfly", -11, 1.5, SZ + 0.2, 10, 2.0, 0.24, 3.0);
  school("angel", 4.5, 2.4, -6.2, 5, 2.5, 0.42, 1.0);
  school("angel", -2, 2.8, 8, 4, 2, 0.44, -1.2);
  school("parrot", 17, 1.4, 4, 5, 3, 0.75, -0.8);
  school("parrot", -18, 1.6, 6, 3, 2, 0.8, 2.2);
  school("yellowTang", 6, 4.5, -15, 12, 2.4, 0.3, 0.2);
  for (const a of anems) for (let i = 0; i < 2 + Math.floor(R() * 2); i++) {
    const ang = R() * 6.28;
    fish("clown", a.pos[0] + Math.cos(ang) * 0.35, a.pos[1] + 0.35 + R() * 0.25, a.pos[2] + Math.sin(ang) * 0.35, 0.2, R() * 6.28);
  }
  // a few big, slow fish hovering above head height (climbable)
  const bigFish = (kind: D.FishKind, x: number, y: number, z: number, len: number, h: number) => {
    fish(kind, x, y, z, len, h);
    k.collider(x - len * 0.35, x + len * 0.35, z - len * 0.35, z + len * 0.35, y - len * 0.15, y + len * 0.2, true);
  };
  bigFish("parrot", 13.8, 2.6, -9.5, 1.6, 0.4);
  bigFish("angel", PX - 4.6, 2.9, PZ + 3.8, 1.1, -0.6);
  bigFish("yellowTang", -8.5, 2.5, 6.5, 1.0, 2.8);
  bigFish("butterfly", 8.2, 2.3, 13.6, 0.9, -2.0);
  for (const kind of Object.keys(fishInst) as D.FishKind[]) {
    if (!fishInst[kind].length) continue;
    const m = k.mat(k.tex(`ds-fish-${kind}`, () => D.fishSkin(kind)), "#fff", [1, 1], { roughness: 0.35, bump: 0.15 });
    m.m.side = THREE.DoubleSide;
    k.instances(species[kind], m, fishInst[kind]);
  }

  lap("fish");
  // =============================================================================================
  // JELLYFISH
  // =============================================================================================
  const bells: Inst[] = [];
  const cores: Inst[] = [];
  const tentacles: G[] = [];
  const jellyfish = (x: number, y: number, z: number, s: number, col: string) => {
    bells.push({ pos: [x, y, z], rotY: R() * 6, rotZ: (R() - 0.5) * 0.3, scale: [s, s * 0.85, s], color: col });
    cores.push({ pos: [x, y + 0.25 * s, z], scale: [s * 0.45, s * 0.3, s * 0.45], color: col });
    for (let i = 0; i < 4; i++) {
      const a = i * PI / 2 + 0.4;
      const pts: V3t[] = [];
      for (let j = 0; j <= 6; j++) {
        const t = j / 6;
        pts.push([x + Math.cos(a + t * 3) * s * (0.12 + t * 0.12), y - t * s * 1.6, z + Math.sin(a + t * 3) * s * (0.12 + t * 0.12)]);
      }
      tentacles.push(tube(pts, s * 0.05, 18, 5));
    }
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * PI * 2;
      const L = s * rr(2.2, 3.4), ph = R() * 6;
      const pts: V3t[] = [];
      for (let j = 0; j <= 7; j++) {
        const t = j / 7;
        pts.push([x + Math.cos(a) * s * 0.85 * (1 - t * 0.3) + Math.sin(t * 5 + ph) * 0.12 * s, y - 0.02 - t * L, z + Math.sin(a) * s * 0.85 * (1 - t * 0.3) + Math.cos(t * 4 + ph) * 0.12 * s]);
      }
      tentacles.push(tube(pts, s * 0.012, 16, 3));
    }
  };
  const jellyCols = ["#ffb8ec", "#c8b8ff", "#9fe8ff", "#ffd0a8", "#ff9fd8"];
  for (const [x, y, z, s] of [
    [-12, 6.5, 10, 0.9], [-16, 4.8, 14.5, 0.7], [-8, 8, 6, 1.1], [-18.5, 7.5, 4.5, 0.6],
    [PX + 4, 5.8, PZ - 3, 0.8], [PX - 3, 7.8, PZ + 2, 1.3], [PX + 1, 4.2, PZ + 5, 0.55],
    [6, 5.5, -12, 0.8], [3, 7.5, -16, 0.7], [16, 6.5, 2, 1.0], [19, 4.5, -8, 0.6], [-13, 7.0, SZ, 0.9], [8, 4, 12, 0.6], [-4, 5, -2.5, 0.5],
  ] as [number, number, number, number][]) jellyfish(x, y, z, s, pick(jellyCols));
  const bellGeo = lathe([[0.9, -0.08], [1.0, 0.02], [0.98, 0.25], [0.86, 0.52], [0.62, 0.78], [0.32, 0.94], [0, 1.0]], 24);
  k.instances(bellGeo, mJelly, bells, { noShadow: true });
  k.instances(new THREE.SphereGeometry(1, 14, 10), glass(k.mat(null, "#ffffff", [1, 1], { emissive: "#ff9ae0", emissiveIntensity: 1.1, roughness: 0.3 }), 0.7), cores, { noShadow: true });
  k.merged(tentacles, mTentacle, { noShadow: true });

  // =============================================================================================
  // flush instanced sets
  // =============================================================================================
  rockGeos.forEach((g, i) => rocks[i].length && k.instances(g, mRock, rocks[i]));
  cliffGeos.forEach((g, i) => cliffs[i].length && k.instances(g, mCliff, cliffs[i]));
  if (barrels.length) k.instances(barrelGeo, mBarrel, barrels);
  const mCoral = k.mat(k.tex("ds-polyp", () => D.polyps(10)), "#fff", [2, 2], { roughness: 0.7, bump: 0.9 });
  if (stag.length) k.instances(stagGeo, mCoral, stag);
  if (bush.length) k.instances(bushGeo, mCoral, bush);
  if (tables.length) k.instances(tableGeo, mPolyp, tables);
  if (brains.length) k.instances(brainGeo, mBrain, brains);
  if (tubes.length) k.instances(tubeCluster, mPolyp, tubes);
  if (pillars.length) k.instances(pillarCluster, mCoral, pillars);
  if (fans.length) k.instances(fanGeo, mFan, fans);
  if (anems.length) k.instances(anemGeo, mAnem, anems);
  if (urchins.length) k.instances(urchinGeo, mUrchin, urchins, { noShadow: true });
  if (stars.length) k.instances(starGeo, mStar, stars, { noShadow: true });
  if (shells.length) k.instances(shellGeo, mShellWhite, shells, { noShadow: true });
  k.merged(kelpStalks, mStalk);
  {
    const bg = new THREE.PlaneGeometry(0.26, 1.25, 1, 6);
    const p = bg.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 0.625; p.setZ(i, y * y * 0.12 + Math.sin(y * 5) * 0.03); p.setY(i, y); }
    bg.computeVertexNormals();
    k.instances(bg, mKelp, blades);
  }
  k.instances(new THREE.SphereGeometry(1, 8, 6), k.mat(null, "#8a7a2a", [1, 1], { roughness: 0.4 }), floats, { noShadow: true });
  {
    const gg = new THREE.PlaneGeometry(0.045, 0.55, 1, 4);
    const p = gg.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 0.275; p.setY(i, y); p.setZ(i, y * y * 0.35); p.setX(i, p.getX(i) * (1 - y / 0.6)); }
    gg.computeVertexNormals();
    k.instances(gg, mGrass, grass, { noShadow: true });
  }
  // bubbles rising from vents and clams
  for (const [x, z] of [[PX + 3.5, PZ - 2.8], [-6, 14], [12, -16], [20, 6], [-15, -16.5], [-3, 3]] as [number, number][]) bubbleColumn(x, 0.1, z, rr(5, 9), 16);
  bubbleColumn(-12.6, 1.5, SZ + 1.8, 6, 10);
  const bubbleMesh = k.instances(new THREE.SphereGeometry(1, 8, 5), mBubble, bubbles, { noShadow: true });
  deco.add(bubbleMesh);
  // marine snow
  const snow: Inst[] = [];
  for (let i = 0; i < 380; i++) snow.push({ pos: [rr(-23, 23), rr(0.5, 12), rr(-19, 19)], scale: [1, 1, 1] });
  deco.add(k.instances(new THREE.IcosahedronGeometry(0.018, 0), mSnow, snow, { noShadow: true }));
  // god rays
  for (const [x, z, w] of [[PX + 1, PZ, 5.5], [-12, 10, 4], [15, -3, 5], [-10, SZ + 2, 3.5], [6, -14, 3.5], [GX, 14, 3.5]] as [number, number, number][]) {
    for (const ry of [0, PI / 2]) {
      const g = new THREE.PlaneGeometry(w, 18);
      decoAdd(g, mRay, [x - 1.2, 9, z - 0.8], ry + 0.3, 0).rotation.set(0.08, ry + 0.3, 0.1);
    }
  }
  lap("inst");
  // ---------- LIFE: the wreck's name, a captain's log, a message in a bottle ----------
  {
    const nm = life.graffiti({ text: "THE TOM KODNER", sub: "PORT OF LIVERPOOL", color: "#e8d9a0", style: "stencil", px: [512, 170], drip: false, font: SERIF });
    const t = tOf(-18.4), side = hw(t, 2.15);
    life.wall(nm, -18.4, 2.15, SZ + side + 0.05, 2.3, 0.08);
    life.wall(nm, -18.4, 2.15, SZ - side - 0.05, 2.3, PI - 0.08);
    // captain's log open on a barrel head inside the wreck
    life.flat(life.letter({ head: "CAPTAIN'S LOG", body: "Day 41. The unicorn statue was right where Tom Kodner's map said. Storm tonight. We lost the mast. If anyone finds this ship, the gold is in the chest by the bow.", sign: "- Capt. Barnacle", hand: true, paper: "#d8c9a0", age: 0.9, date: "1717" }), -15.25, 1.8, SZ + 1.3, 0.22, PI / 2 + 0.2);
    // treasure map pinned to the hull wall inside
    life.wall(life.custom(300, 220, (g, w, h, r) => {
      g.fillStyle = "#d9c38e"; g.fillRect(0, 0, w, h);
      g.fillStyle = "rgba(120,80,30,0.3)"; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(r() * w, r() * h, 20 + r() * 40, 0, Math.PI * 2); g.fill(); }
      g.strokeStyle = "#5a3a18"; g.lineWidth = 3; g.beginPath(); g.moveTo(40, 170); g.bezierCurveTo(80, 60, 160, 200, 200, 90); g.bezierCurveTo(220, 60, 250, 70, 260, 50); g.setLineDash([8, 8]); g.stroke(); g.setLineDash([]);
      g.strokeStyle = "#a01818"; g.lineWidth = 6; g.beginPath(); g.moveTo(248, 38); g.lineTo(272, 62); g.moveTo(272, 38); g.lineTo(248, 62); g.stroke();
      g.fillStyle = "#3a2410"; g.font = `bold 20px ${SERIF}`; g.fillText("KODNER'S MAP", 20, 30); g.font = `italic 14px ${SERIF}`; g.fillText("unicorn  \u2192  reef  \u2192  X", 20, 205);
    }), -15.3, 1.6, SZ - hw(tOf(-15.3), 1.6) + 0.16, 0.5, 0, 0.05);
    // message in a bottle on the sand near the gate + its letter
    const glassB = k.mat(null, "#7fc8a0", [1, 1], { roughness: 0.08, metalness: 0.1 });
    b.add(glassB, xf(lathe([[0.001, 0], [0.06, 0], [0.065, 0.02], [0.065, 0.2], [0.03, 0.26], [0.02, 0.33], [0.024, 0.34], [0.001, 0.34]], 14), -2.2, 0.065, 11.8, 0, 0, PI / 2));
    life.flat(life.letter({ to: "Dear Tom Kodner,", body: "If you are reading this, you found the sunken city! Follow the unicorn's gaze to the reef. Beware of the jellyfish - they hide better than we do.", sign: "- a friend, 1717", hand: true, paper: "#e8dcb8", age: 0.7 }), -1.75, 0.02, 12.05, 0.2, 0.6, 0.006);
    // diving club warning board at the gate
    { const x = GX + 4.4, z = GZ - 0.9;
      b.box(mTimber, 0.1, 1.5, 0.1, x, 0, z, { uv: 0.8 });
      b.box(mDeck, 0.9, 0.6, 0.05, x, 1.1, z - 0.07, { uv: 0.8 });
      k.collider(x - 0.1, x + 0.1, z - 0.1, z + 0.1, 0, 1.7, false);
      life.wall(life.label({ text: "DIVERS", sub: "do not feed the jellyfish - T. Kodner Diving Club", bg: "#f2e8c8", fg: "#1a4a6a", border: "#1a4a6a", px: [320, 200], wear: 0.6 }), x, 1.4, z - 0.1, 0.84, PI);
    }
  }
  life.finish();
  b.flush();
  lap("flush");
  console.warn("DSTIME " + TM.join(" "));

  // pure light effects must not be paint/eyedropper targets
  k.surfaces = k.surfaces.filter((s) => !deco.has(s));
  k.room("Sunken Plaza", PX - 9, PX + 9, PZ - 9, PZ + 9);

  const hiders = [...ring(PX, PZ, 4.3, 12), ...ring(PX, PZ, 5.6, 12).map((v) => v.sub(new V3(PX, 0, PZ)).applyAxisAngle(new V3(0, 1, 0), PI / 12).add(new V3(PX, 0, PZ)))];
  const hunters = Array.from({ length: 9 }, (_, i) => new V3(GX + ((i % 3) - 1) * 1.2, 0, GZ - 3.2 - Math.floor(i / 3) * 1.2));
  return k.finish({
    id: "deepsea", name: "Deep Sea",
    bounds: { minX: X0 + 0.5, maxX: X1 - 0.5, minZ: Z0 + 0.5, maxZ: Z1 - 0.5 },
    hunterSpawns: hunters, hiderSpawns: hiders,
    preview: { pos: [PX + 9.5, 5.2, PZ + 12.5], look: [PX - 4, 2.2, PZ - 5], fov: 62 },
    lighting: {
      sky: "#0a4a66",
      hemi: ["#6cc8ea", "#10303c", 0.75],
      sun: { color: "#bff0ff", int: 2.3, pos: [6, 30, 7] },
      fog: ["#0a4a66", 7, 52],
      points: [
        { pos: [6, 1.8, -13.8], color: "#a8ecff", int: 14, dist: 12 },
        { pos: [-12, 5.5, 10], color: "#ff86dc", int: 16, dist: 15 },
        { pos: [-12.6, 2.0, SZ], color: "#ffb050", int: 12, dist: 9 },
        { pos: [PX, 2.4, PZ + 5], color: "#8ff7ff", int: 14, dist: 12 },
        { pos: [16, 4, -2], color: "#7fffd0", int: 16, dist: 18 },
        { pos: [GX, 3.5, GZ - 3], color: "#bfe9ff", int: 10, dist: 14 },
      ],
      exposure: 1.1,
      env: 0.35,
      hdri: "night",
    },
  });
}
