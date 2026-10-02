// Indoor Country (屋内カントリー): a huge indoor hall dressed as a farm, as in the real game.
// Walls painted as a teal sky mural with cartoon clouds and green hills, fluffy cotton clouds hanging from a dark
// ceiling with small rectangular lights, a mown-stripe grass carpet, red barns with white X doors, white fences,
// round and rectangular hay bales, Holstein cow cut-outs on yellow A-frame stands (some fallen over), hopper silos,
// green IBC totes, pallets, a pumpkin patch with soil ridges, a mud mound, a blue/white hot-air balloon and
// red/white circus tents. Hunters enter from the big sliding door on the south wall.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import * as T from "../textures";
import * as C from "./tex/country";
import { Kit, type Mat, type World } from "./kit";
import { Life, drawChameleon } from "./tex/life";

// ---------------------------------------------------------------------------------------------
// Local batching helper: every piece is pre-transformed and merged per material (few draw calls).
type BO = { rx?: number; ry?: number; rz?: number; solid?: boolean; stand?: boolean; uv?: number; world?: boolean; flat?: boolean; su?: number; sv?: number };
function boxUV(g: THREE.BufferGeometry, unit: number, ou = 0, ov = 0) {
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u: number, v: number;
    if (ax >= ay && ax >= az) { u = p.getZ(i); v = p.getY(i); }
    else if (ay >= az) { u = p.getX(i); v = p.getZ(i); }
    else { u = p.getX(i); v = p.getY(i); }
    uv.setXY(i, u / unit + ou, v / unit + ov);
  }
  uv.needsUpdate = true;
}
function scaleUV(g: THREE.BufferGeometry, su: number, sv: number) {
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
}
class Batch {
  private lists = new Map<Mat, THREE.BufferGeometry[]>();
  private flags = new Map<Mat, { noShadow?: boolean }>();
  private rnd = C.rng(99);
  constructor(private k: Kit) {}
  opt(m: Mat, f: { noShadow?: boolean }) { this.flags.set(m, f); }
  geo(m: Mat, g: THREE.BufferGeometry, x: number, y: number, z: number, o: BO = {}) {
    if (o.uv && !o.world) boxUV(g, o.uv, this.rnd(), this.rnd());
    if (o.su || o.sv) scaleUV(g, o.su ?? 1, o.sv ?? 1);
    const e = new THREE.Euler(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0, "YXZ");
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(e), new THREE.Vector3(1, 1, 1)));
    if (o.uv && o.world) boxUV(g, o.uv);
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
  /** box, y = bottom */
  box(m: Mat, w: number, h: number, d: number, x: number, y: number, z: number, o: BO = {}) {
    const mn = Math.min(w, h, d), mx = Math.max(w, h, d);
    const g = o.flat || mn < 0.06 || mx > 4.5 ? new THREE.BoxGeometry(w, h, d) : new RoundedBoxGeometry(w, h, d, 1, Math.min(0.03, mn * 0.2));
    return this.geo(m, g, x, y + h / 2, z, o);
  }
  cyl(m: Mat, rt: number, rb: number, h: number, x: number, y: number, z: number, o: BO & { seg?: number; open?: boolean } = {}) {
    return this.geo(m, new THREE.CylinderGeometry(rt, rb, h, o.seg ?? 16, 1, o.open), x, y + h / 2, z, o);
  }
  /** cylinder between two points */
  rod(m: Mat, r: number, a: [number, number, number], b: [number, number, number], seg = 8) {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
    const len = va.distanceTo(vb);
    const g = new THREE.CylinderGeometry(r, r, len, seg, 1, true);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
    g.applyMatrix4(new THREE.Matrix4().compose(va.clone().add(vb).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
    let l = this.lists.get(m);
    if (!l) this.lists.set(m, (l = []));
    l.push(g);
    return g;
  }
  /** square beam between two points (lumber, stand legs) */
  beam(m: Mat, s: number, a: [number, number, number], b: [number, number, number]) {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
    const len = va.distanceTo(vb);
    const g = new THREE.BoxGeometry(s, len, s);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
    boxUV(g, 0.5, this.rnd(), this.rnd());
    g.applyMatrix4(new THREE.Matrix4().compose(va.clone().add(vb).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
    let l = this.lists.get(m);
    if (!l) this.lists.set(m, (l = []));
    l.push(g);
    return g;
  }
  flush() {
    for (const [m, l] of this.lists) if (l.length) this.k.merged(l, m, { noShadow: this.flags.get(m)?.noShadow });
    this.lists.clear();
  }
}
// ---------------------------------------------------------------------------------------------

type P = C.Pts;
// Holstein side silhouette (head to the right, 4 legs, tail on the left)
const COW: P = [[0.08, 0.8], [0.25, 0.845], [0.45, 0.83], [0.62, 0.845], [0.7, 0.87], [0.755, 0.905], [0.77, 0.975], [0.8, 0.99], [0.815, 0.935],
  [0.84, 0.95], [0.855, 1.0], [0.875, 0.955], [0.93, 0.925], [0.975, 0.84], [1.0, 0.72], [0.995, 0.64], [0.95, 0.61], [0.9, 0.62], [0.85, 0.66], [0.8, 0.6], [0.755, 0.48],
  [0.75, 0.06], [0.745, 0.0], [0.685, 0.0], [0.68, 0.3], [0.645, 0.3], [0.64, 0.0], [0.58, 0.0], [0.585, 0.33],
  [0.46, 0.335], [0.42, 0.3], [0.385, 0.245], [0.345, 0.24], [0.315, 0.29], [0.3, 0.33],
  [0.285, 0.32], [0.28, 0.0], [0.22, 0.0], [0.215, 0.28], [0.19, 0.28], [0.185, 0.0], [0.125, 0.0], [0.12, 0.4],
  [0.09, 0.58], [0.075, 0.66], [0.045, 0.52], [0.035, 0.38], [0.005, 0.37], [0.015, 0.5], [0.05, 0.76]];

/** ribbed pumpkin (10 ribs, matches the pumpkinSkin texture) */
function pumpkinGeo(r: number, squash = 0.78) {
  const g = new THREE.SphereGeometry(r, 30, 12);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x);
    const s = 0.9 + 0.1 * Math.abs(Math.cos(a * 5));
    const dip = Math.max(0, y / r) ** 6 * 0.25; // sunken top around the stem
    p.setXYZ(i, x * s, y * squash - dip * r, z * s);
  }
  g.computeVertexNormals();
  return g;
}
/** lumpy cotton cloud puff */
function puffGeo(r: number, seed: number) {
  const g = new THREE.SphereGeometry(r, 16, 11);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = 1 + 0.07 * Math.sin(x * 9 + seed) * Math.sin(y * 11 + seed * 2) + 0.05 * Math.sin(z * 13 + x * 5 + seed);
    p.setXYZ(i, x * n, y * n * (y < 0 ? 0.75 : 1), z * n);
  }
  g.computeVertexNormals();
  return g;
}

export function buildCountry(): World {
  const __t: [string, number][] = [["start", performance.now()]];
  const WH = 8;
  const k = new Kit(WH, 4.5);
  const B = new Batch(k);
  const __mt: [string, number][] = [];
  { const om = k.mat.bind(k); let n = 0; k.mat = (...a: Parameters<Kit["mat"]>) => { const t0 = performance.now(); const r = om(...a); __mt.push([String(n++), Math.round(performance.now() - t0)]); return r; }; }
  (globalThis as unknown as { __ctM: unknown }).__ctM = __mt;
  const rnd = C.rng(2024);
  const X0 = -20, X1 = 20, Z0 = -15, Z1 = 15;
  const life = new Life(k, 1952);
  const lr = C.rng(5151);

  // ---------- materials ----------
  const grass = k.mat(k.tex("c-grass", C.grassStripes), "#fff", [1, 1], { roughness: 0.95, bump: 0.7 });
  const muralA = k.mat(k.tex("c-tmural3", () => C.tealMural(3)), "#fff", [1, 1], { roughness: 0.92, bump: 0 });
  const muralB = k.mat(k.tex("c-tmural7", () => C.tealMural(7)), "#fff", [1, 1], { roughness: 0.92, bump: 0 });
  const wallBack = k.mat(null, "#1f8f93", [1, 1], { roughness: 0.95 });
  const ceilM = k.mat(k.tex("c-ceil", C.darkCeiling), "#fff", [1, 1], { roughness: 0.9, bump: 0 });
  const cornice = k.mat(null, "#2c2f28", [1, 1], { roughness: 0.8 });
  const lightM = k.mat(null, "#ffffff", [1, 1], { emissive: "#fff8ec", emissiveIntensity: 2.4 });
  const lightFrame = k.mat(null, "#9a9c96", [1, 1], { metalness: 0.6, roughness: 0.4 });
  const straw = k.mat(k.tex("c-straw", () => C.straw(8, 0)), "#fff", [1, 1], { roughness: 1, bump: 1.1 });
  const strawR = k.mat(k.tex("c-straw", () => C.straw(8, 0)), "#f2e6c8", [1, 1], { roughness: 1, bump: 1.1 });
  const baleEnd = k.mat(k.tex("c-baleend", C.baleEnd), "#fff", [1, 1], { roughness: 1, bump: 1.0 });
  const twine = k.mat(null, "#6b5a3a", [1, 1], { roughness: 0.9 });
  const barnBoards = k.mat(k.tex("c-barnb", () => C.barnBoards(5)), "#fff", [1, 1], { roughness: 0.75, bump: 0.7 });
  const white = k.mat(k.tex("c-white", C.whitePaint), "#fff", [1, 1], { roughness: 0.6, bump: 0 });
  const roofM = k.mat(k.tex("c-roof", () => T.stripes(["#8d9296", "#7a7f83"], true)), "#fff", [1, 1], { metalness: 0.55, roughness: 0.45, bump: 0.5 });
  const glass = k.mat(null, "#22303a", [1, 1], { roughness: 0.15, metalness: 0.4 });
  const yellowWood = k.mat(k.tex("c-ylum", C.yellowLumber), "#fff", [1, 1], { roughness: 0.7, bump: 0 });
  const ply = k.mat(null, "#d8b886", [1, 1], { roughness: 0.8 });
  const cowM = k.mat(k.tex("c-holst5", () => C.holsteinArt(COW, 5)), "#fff", [1, 1], { roughness: 0.6, bump: 0 });
  const cowM2 = cowM;
  const pumpO = k.mat(k.tex("c-pumpO", () => C.pumpkinSkin("#e8741a", "rgba(140,50,0,0.55)", 11)), "#fff", [1, 1], { roughness: 0.45, bump: 0.35 });
  const pumpY = k.mat(k.tex("c-pumpY", () => C.pumpkinSkin("#eac023", "rgba(150,110,0,0.5)", 13)), "#fff", [1, 1], { roughness: 0.45, bump: 0.35 });
  const stem = k.mat(null, "#5f5a2a", [1, 1], { roughness: 0.8 });
  const soil = k.mat(k.tex("c-soil", C.soil), "#fff", [1, 1], { roughness: 1, bump: 1.0 });
  const paleStraw = k.mat(k.tex("c-pstraw", C.paleStraw), "#fff", [1, 1], { roughness: 1, bump: 1.0 });
  const dirt = k.mat(k.tex("c-dirt", C.dirt), "#fff", [1, 1], { roughness: 1, bump: 1.2 });
  const corr = k.mat(k.tex("c-corr", C.corrugated), "#fff", [1, 1], { metalness: 0.75, roughness: 0.38, bump: 0.9 });
  const steel = k.mat(null, "#6e7378", [1, 1], { metalness: 0.85, roughness: 0.4 });
  const darkSteel = k.mat(null, "#3a3d40", [1, 1], { metalness: 0.8, roughness: 0.45 });
  const ibcM = k.mat(k.tex("c-ibc", C.ibc), "#fff", [1, 1], { roughness: 0.5, metalness: 0.3, bump: 0 });
  const tankTop = k.mat(null, "#e6ece6", [1, 1], { roughness: 0.4 });
  const palletM = k.mat(k.tex("c-pallet", () => C.boards("#c6a372", 23, 0.45)), "#fff", [1, 1], { roughness: 0.85, bump: 0.8 });
  const crateM = k.mat(k.tex("c-pallet", () => C.boards("#c6a372", 23, 0.45)), "#e0b98a", [1, 1], { roughness: 0.8, bump: 0.8 });
  const greenCrate = k.mat(k.tex("c-pallet", () => C.boards("#c6a372", 23, 0.45)), "#5fae4a", [1, 1], { roughness: 0.6, bump: 0.6 });
  const galv = k.mat(k.tex("c-galv", C.galvanized), "#fff", [1, 1], { metalness: 0.85, roughness: 0.38, bump: 0.2 });
  const water = k.mat(null, "#5f7d78", [1, 1], { roughness: 0.08, metalness: 0.3 });
  const goreBlue = k.mat(k.tex("c-goreB", () => C.gores("#2446a8", "#f2f2f0", 8)), "#fff", [1, 1], { roughness: 0.55, bump: 0 });
  const goreRed = k.mat(k.tex("c-goreR", () => C.gores("#c8231e", "#f4f2ee", 8)), "#fff", [1, 1], { roughness: 0.55, bump: 0 });
  const wicker = k.mat(k.tex("c-wicker", C.wicker), "#fff", [1, 1], { roughness: 0.9, bump: 1.0 });
  const leather = k.mat(null, "#5a3620", [1, 1], { roughness: 0.6 });
  const rope = k.mat(null, "#c9b48a", [1, 1], { roughness: 0.9 });
  const tentM = k.mat(k.tex("c-tent", C.tentStripes), "#fff", [1, 1], { roughness: 0.8, bump: 0 });
  const gold = k.mat(null, "#d8a23a", [1, 1], { metalness: 0.9, roughness: 0.3 });
  const cloudM = k.mat(k.tex("c-cotton", () => T.noise("#f4f4f1", 0.05, 17, 1200)), "#fff", [1, 1], { roughness: 1, bump: 0.5 });
  const wire = k.mat(null, "#222", [1, 1], { roughness: 0.6 });
  const tableWood = k.mat(k.tex("c-pallet", () => C.boards("#c6a372", 23, 0.45)), "#8c6446", [1, 1], { roughness: 0.6, bump: 0.8 });
  const blueSack = k.mat(k.tex("c-bsack", () => T.noise("#3b7fb4", 0.12, 5, 1500)), "#fff", [1, 1], { roughness: 0.7, bump: 0.6 });
  const gasM = k.mat(null, "#d9dcdc", [1, 1], { metalness: 0.4, roughness: 0.35 });
  const redM = k.mat(null, "#b3261e", [1, 1], { roughness: 0.5, metalness: 0.2 });
  const doorM = k.mat(k.tex("c-door", () => T.shutter()), "#d6d9d6", [1, 1], { metalness: 0.4, roughness: 0.5, bump: 0.5 });
  const rubber = k.mat(null, "#1b1b1b", [1, 1], { roughness: 0.9 });
  for (const m of [muralA, muralB, wallBack, ceilM, lightM, cornice, lightFrame, wire]) B.opt(m, { noShadow: true });

  __t.push(["mats", performance.now()]);
  // world-space helpers
  const loc = (x: number, z: number, ry: number, lx: number, lz: number): [number, number] =>
    [x + lx * Math.cos(ry) + lz * Math.sin(ry), z - lx * Math.sin(ry) + lz * Math.cos(ry)];
  /** colliders approximating a thin rotated wall between two points */
  const lineCol = (x1: number, z1: number, x2: number, z2: number, th: number, bottom: number, top: number, stand = false) => {
    const len = Math.hypot(x2 - x1, z2 - z1), n = Math.max(1, Math.ceil(len / 0.5));
    if (Math.abs(x2 - x1) < 0.01 || Math.abs(z2 - z1) < 0.01) {
      k.collider(Math.min(x1, x2) - th / 2, Math.max(x1, x2) + th / 2, Math.min(z1, z2) - th / 2, Math.max(z1, z2) + th / 2, bottom, top, stand);
      return;
    }
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, cx = x1 + (x2 - x1) * t, cz = z1 + (z2 - z1) * t, hs = len / n / 2 * 0.75 + th / 2;
      k.collider(cx - hs, cx + hs, cz - hs, cz + hs, bottom, top, stand);
    }
  };
  const rotCol = (x: number, z: number, ry: number, w: number, d: number, bottom: number, top: number, stand = true) => {
    const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry));
    const hx = (w * c + d * s) / 2, hz = (w * s + d * c) / 2;
    k.collider(x - hx * 0.92, x + hx * 0.92, z - hz * 0.92, z + hz * 0.92, bottom, top, stand);
  };

  // ---------- shell: grass carpet, mural walls, dark ceiling with small lights ----------
  k.floor(X0, X1, Z0, Z1, grass, 4);
  const muralWall = (m: Mat, len: number, x: number, z: number, ry: number) => {
    const g = new THREE.PlaneGeometry(len, WH);
    scaleUV(g, len / 16, 1);
    B.geo(m, g, x, WH / 2, z, { ry });
  };
  muralWall(muralA, X1 - X0, 0, Z0 + 0.01, 0);
  muralWall(muralB, X1 - X0, 0, Z1 - 0.01, Math.PI);
  muralWall(muralB, Z1 - Z0, X0 + 0.01, 0, Math.PI / 2);
  muralWall(muralA, Z1 - Z0, X1 - 0.01, 0, -Math.PI / 2);
  B.box(wallBack, X1 - X0 + 0.6, WH, 0.3, 0, 0, Z0 - 0.15, { flat: true });
  B.box(wallBack, X1 - X0 + 0.6, WH, 0.3, 0, 0, Z1 + 0.15, { flat: true });
  B.box(wallBack, 0.3, WH, Z1 - Z0, X0 - 0.15, 0, 0, { flat: true });
  B.box(wallBack, 0.3, WH, Z1 - Z0, X1 + 0.15, 0, 0, { flat: true });
  k.collider(X0 - 1, X1 + 1, Z1, Z1 + 1, 0, WH, false);
  k.collider(X0 - 1, X1 + 1, Z0 - 1, Z0, 0, WH, false);
  k.collider(X0 - 1, X0, Z0, Z1, 0, WH, false);
  k.collider(X1, X1 + 1, Z0, Z1, 0, WH, false);
  // dark cornice band where the mural meets the ceiling
  B.box(cornice, X1 - X0, 0.35, 0.12, 0, WH - 0.35, Z0 + 0.06, { flat: true });
  B.box(cornice, X1 - X0, 0.35, 0.12, 0, WH - 0.35, Z1 - 0.06, { flat: true });
  B.box(cornice, 0.12, 0.35, Z1 - Z0, X0 + 0.06, WH - 0.35, 0, { flat: true });
  B.box(cornice, 0.12, 0.35, Z1 - Z0, X1 - 0.06, WH - 0.35, 0, { flat: true });
  k.ceiling(X0, X1, Z0, Z1, ceilM, WH, 4);
  // small rectangular ceiling lights
  for (let x = -17.5; x <= 17.6; x += 5) for (let z = -12; z <= 12.1; z += 4) {
    const ox = (Math.round(z / 4) % 2) * 1.2;
    B.box(lightFrame, 1.5, 0.06, 0.55, x + ox, WH - 0.06, z, { flat: true });
    B.box(lightM, 1.36, 0.02, 0.42, x + ox, WH - 0.075, z, { flat: true });
  }
  // a few dark ducts / beams under the ceiling (real hall has a plain dark deck)
  for (const z of [-7.5, 7.5]) B.box(cornice, X1 - X0, 0.3, 0.3, 0, WH - 0.45, z, { flat: true });

  // ---------- south entrance: big sliding door ----------
  const DX = 0, DW = 5, DH = 4.4;
  B.box(doorM, DW / 2, DH, 0.1, DX - DW / 4, 0, Z1 - 0.1, { flat: true, uv: 1.2 });
  B.box(doorM, DW / 2, DH, 0.1, DX + DW / 4 + 0.05, 0, Z1 - 0.16, { flat: true, uv: 1.2 });
  B.box(darkSteel, DW + 1.2, 0.2, 0.2, DX, DH, Z1 - 0.12, { flat: true });
  for (const s of [-1, 1]) B.box(darkSteel, 0.18, DH, 0.2, DX + s * (DW / 2 + 0.1), 0, Z1 - 0.1, { flat: true });
  for (const s of [-1, 1]) B.box(darkSteel, 0.06, 0.4, 0.06, DX + s * 0.3, 1.1, Z1 - 0.25, { flat: true });

  // ---------- prop builders ----------
  /** rectangular straw bale with twine; y = bottom */
  const bale = (x: number, y: number, z: number, ry = 0, s = 1) => {
    const w = 1.15 * s, h = 0.55 * s, d = 0.7 * s;
    B.geo(rnd() < 0.5 ? straw : strawR, new RoundedBoxGeometry(w, h, d, 1, 0.07), x, y + h / 2, z, { ry, uv: 0.9 });
    for (const t of [-0.3, 0.3]) {
      const [tx, tz] = loc(x, z, ry, t * w, 0);
      B.geo(twine, new THREE.BoxGeometry(0.025, h + 0.012, d + 0.012), tx, y + h / 2, tz, { ry });
    }
    rotCol(x, z, ry, w, d, y, y + h, true);
  };
  /** round bale; standing = axis vertical */
  const roundBale = (x: number, z: number, ry: number, standing = false, r = 0.8, L = 1.2, y0 = 0) => {
    const side = new THREE.CylinderGeometry(r, r, L, 28, 1, true);
    const c1 = new THREE.CircleGeometry(r * 0.99, 28), c2 = new THREE.CircleGeometry(r * 0.99, 28);
    c1.rotateX(-Math.PI / 2); c1.translate(0, L / 2, 0);
    c2.rotateX(Math.PI / 2); c2.translate(0, -L / 2, 0);
    scaleUV(side, 4 * r, 1.2 * L);
    const o = standing ? { ry } : { ry, rx: Math.PI / 2 };
    const cy = y0 + (standing ? L / 2 : r);
    B.geo(straw, side, x, cy, z, o);
    B.geo(baleEnd, c1, x, cy, z, o);
    B.geo(baleEnd, c2, x, cy, z, o);
    if (standing) k.collider(x - r * 0.85, x + r * 0.85, z - r * 0.85, z + r * 0.85, y0, y0 + L, true);
    else {
      rotCol(x, z, ry, 2 * r * 0.9, L, y0, y0 + r * 1.1, true);
      rotCol(x, z, ry, 2 * r * 0.55, L, y0, y0 + r * 2, true);
    }
  };
  /** white 3-rail fence */
  const fence = (x1: number, z1: number, x2: number, z2: number) => {
    const len = Math.hypot(x2 - x1, z2 - z1), ry = Math.atan2(x2 - x1, z2 - z1) - Math.PI / 2;
    const n = Math.max(1, Math.round(len / 2.2));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      B.box(white, 0.13, 1.25, 0.13, x1 + (x2 - x1) * t, 0, z1 + (z2 - z1) * t, { ry, uv: 0.6, flat: true });
      B.box(white, 0.16, 0.03, 0.16, x1 + (x2 - x1) * t, 1.25, z1 + (z2 - z1) * t, { ry, flat: true });
    }
    for (const y of [0.3, 0.65, 1.0]) {
      const [cx, cz] = loc((x1 + x2) / 2, (z1 + z2) / 2, ry, 0, 0.085);
      B.geo(white, new THREE.BoxGeometry(len + 0.1, 0.17, 0.045), cx, y, cz, { ry, uv: 0.8 });
    }
    lineCol(x1, z1, x2, z2, 0.16, 0, 1.25);
  };
  const pumpkin = (x: number, z: number, r: number, m: Mat, y = 0, tilt = 0) => {
    B.geo(m, pumpkinGeo(r), x, y + r * 0.74, z, { ry: rnd() * 6, rz: tilt });
    B.geo(stem, new THREE.CylinderGeometry(r * 0.07, r * 0.11, r * 0.4, 7), x + Math.sin(-tilt) * r * 0.7, y + r * 1.5, z, { rz: (rnd() - 0.5) * 0.5 + tilt });
    if (r > 0.25) k.collider(x - r * 0.8, x + r * 0.8, z - r * 0.8, z + r * 0.8, y, y + r * 1.45, true);
  };
  /** Holstein cow cut-out on two yellow A-frame stands; fallen = lying on its back side on the grass */
  const cow = (x: number, z: number, ry: number, s = 1, o: { flip?: boolean; fallen?: boolean; art?: Mat } = {}) => {
    const W = 2.3 * s, H = 1.6 * s, th = 0.03;
    const sx = o.flip ? -1 : 1;
    const art = o.art ?? cowM;
    const shape = new THREE.Shape(COW.map(([u, v]) => new THREE.Vector2((u - 0.5) * W * sx, v * H)));
    const fallen = !!o.fallen;
    // local frame: standee plane XY, stand behind (−z). Fallen: rotate so the board lies face-up.
    const place = (g: THREE.BufferGeometry, m: Mat) => {
      if (fallen) { g.rotateX(-Math.PI / 2); g.translate(0, 0.07, H * 0.5); }
      B.geo(m, g, x, 0, z, { ry });
    };
    const body = new THREE.ExtrudeGeometry(shape, { depth: th, bevelEnabled: false, curveSegments: 4 });
    body.translate(0, 0, -th / 2);
    scaleUV(body, 1 / 1.2, 1 / 1.2);
    place(body, ply);
    for (const back of [false, true]) {
      const f = new THREE.ShapeGeometry(shape, 4);
      const uv = f.attributes.uv, p = f.attributes.position;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) * sx) / W + 0.5, p.getY(i) / H);
      if (back) f.rotateY(Math.PI);
      f.translate(0, 0, back ? -th / 2 - 0.002 : th / 2 + 0.002);
      place(f, back ? cowM2 : art);
    }
    // A-frame stands (yellow lumber): two splayed legs + spreader, and a rail under the belly
    const stand: THREE.BufferGeometry[] = [];
    const bm = (a: [number, number, number], b: [number, number, number], sz = 0.06) => {
      const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
      const g = new THREE.BoxGeometry(sz, va.distanceTo(vb), sz);
      boxUV(g, 0.5, rnd(), rnd());
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize()));
      g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
      stand.push(g);
    };
    const top = H * 0.5, zc = -th / 2 - 0.04;
    for (const lx of [-0.26 * W, 0.22 * W]) {
      bm([lx, top, zc], [lx, 0, zc + 0.42]);
      bm([lx, top, zc], [lx, 0, zc - 0.5]);
      bm([lx, top * 0.35, zc + 0.27], [lx, top * 0.35, zc - 0.33], 0.045);
    }
    bm([-0.3 * W, top - 0.03, zc], [0.26 * W, top - 0.03, zc], 0.07);
    for (const g of stand) {
      if (fallen) { g.translate(0, 0, 0); g.rotateX(-1.2); g.translate(0.2, 0.05, -0.3); }
      B.geo(yellowWood, g, x, 0, z, { ry });
    }
    if (fallen) {
      const [cx, cz] = loc(x, z, ry, 0, H * 0.5);
      rotCol(cx, cz, ry, W, H, 0, 0.12, true);
    } else {
      const [ax, az] = loc(x, z, ry, -W * 0.48, -0.05), [bx, bz] = loc(x, z, ry, W * 0.48, -0.05);
      lineCol(ax, az, bx, bz, 0.35, 0, H * 0.95);
    }
  };
  /** barn with a gambrel roof; front faces +z. open = walk-in with a hay loft */
  const barn = (cx: number, zb: number, W: number, D: number, open: boolean) => {
    const wh = 3.4, zf = zb + D, rl = wh + W * 0.28, rt = wh + W * 0.42;
    const prof: [number, number][] = [[-W / 2, 0], [W / 2, 0], [W / 2, wh], [W * 0.34, rl], [0, rt], [-W * 0.34, rl], [-W / 2, wh]];
    const shp = (pts: [number, number][]) => new THREE.Shape(pts.map(([a, b]) => new THREE.Vector2(a, b)));
    const dw = open ? 2.8 : 2.9, dh = 3.0;
    if (!open) {
      B.geo(barnBoards, new THREE.ExtrudeGeometry(shp(prof), { depth: D, bevelEnabled: false }), cx, 0, zb, { uv: 1.5, world: true });
      k.collider(cx - W / 2, cx + W / 2, zb, zf, 0, wh, true);
    } else {
      const t = 0.2;
      B.geo(barnBoards, new THREE.ExtrudeGeometry(shp(prof), { depth: t, bevelEnabled: false }), cx, 0, zb, { uv: 1.5, world: true });
      const upper: [number, number][] = [[-W / 2, dh], [W / 2, dh], ...prof.slice(2)];
      B.geo(barnBoards, new THREE.ExtrudeGeometry(shp(upper), { depth: t, bevelEnabled: false }), cx, 0, zf - t, { uv: 1.5, world: true });
      const sw = (W - dw) / 2;
      for (const s of [-1, 1]) {
        B.box(barnBoards, sw, dh, t, cx + s * (dw / 2 + sw / 2), 0, zf - t / 2, { flat: true, uv: 1.5, world: true, solid: true });
        B.box(barnBoards, t, wh, D - 2 * t, cx + s * (W / 2 - t / 2), 0, zb + D / 2, { flat: true, uv: 1.5, world: true, solid: true });
      }
      k.collider(cx - W / 2, cx + W / 2, zb, zb + t, 0, wh, false);
      k.collider(cx - dw / 2, cx + dw / 2, zf - t, zf, dh, wh, true);
      // hay loft inside (back half) with posts and a ladder
      const ly = 2.3, lz0 = zb + t, lz1 = zb + 2.2;
      B.box(tableWood, W - 2 * t, 0.12, lz1 - lz0, cx, ly, (lz0 + lz1) / 2, { flat: true, uv: 1 });
      k.collider(cx - W / 2, cx + W / 2, lz0, lz1, ly, ly + 0.12, true);
      for (const s of [-1, 1]) B.box(tableWood, 0.16, ly, 0.16, cx + s * (W / 2 - 0.5), 0, lz1 - 0.1, { uv: 0.6 });
      k.collider(cx - W / 2 + 0.4, cx - W / 2 + 0.6, lz1 - 0.2, lz1, 0, ly, false);
      k.collider(cx + W / 2 - 0.6, cx + W / 2 - 0.4, lz1 - 0.2, lz1, 0, ly, false);
      for (const s of [-1, 1]) B.box(tableWood, 0.06, 2.6, 0.06, cx + 0.8 + s * 0.22, 0, lz1 + 0.35, { rx: -0.15, flat: true });
      for (let y = 0.3; y < 2.5; y += 0.3) B.box(tableWood, 0.5, 0.04, 0.05, cx + 0.8, y, lz1 + 0.37 - y * 0.15, { flat: true });
      bale(cx - 1.6, ly + 0.12, zb + 0.9, 0.05); bale(cx - 0.3, ly + 0.12, zb + 0.8, -0.04); bale(cx + 1.4, ly + 0.12, zb + 0.9, 0.1);
      bale(cx - 1.1, ly + 0.67, zb + 0.85, 0.02);
      bale(cx - 1.8, 0, zb + 2.9, Math.PI / 2); bale(cx - 1.8, 0, zb + 4.1, Math.PI / 2 + 0.05); bale(cx - 1.8, 0.55, zb + 3.5, Math.PI / 2 - 0.05);
      B.cyl(galv, 0.17, 0.14, 0.32, cx + 1.9, 0, zb + 3.6, { seg: 16, open: true });
      B.cyl(water, 0.16, 0.16, 0.01, cx + 1.9, 0.26, zb + 3.6, { seg: 16 });
    }
    // roof collider steps (bottom above head inside an open barn)
    k.collider(cx - W * 0.4, cx + W * 0.4, zb, zf, wh, rl, true);
    k.collider(cx - W * 0.2, cx + W * 0.2, zb, zf, rl, rt - 0.2, true);
    // gambrel roof panels (grey metal) + ridge cap
    const pan = (x1: number, y1: number, x2: number, y2: number, ext: number) => {
      const L = Math.hypot(x2 - x1, y2 - y1) + ext, a = Math.atan2(y2 - y1, x2 - x1);
      const nx = -Math.sin(a) * 0.06, ny = Math.cos(a) * 0.06;
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      B.geo(roofM, new THREE.BoxGeometry(L, 0.1, D + 0.5), cx + mx + nx, my + ny, zb + D / 2 + 0.25, { rz: a, uv: 0.5, world: true });
    };
    pan(W / 2 + 0.25, wh - 0.18, W * 0.34, rl, 0);
    pan(W * 0.34, rl, 0, rt, 0.05);
    pan(-W / 2 - 0.25, wh - 0.18, -W * 0.34, rl, 0);
    pan(-W * 0.34, rl, 0, rt, 0.05);
    B.box(roofM, 0.3, 0.12, D + 0.5, cx, rt + 0.02, zb + D / 2 + 0.25, { flat: true });
    // white trim: corner boards, eave band, gable edges
    const zt = zf + 0.03;
    for (const s of [-1, 1]) B.box(white, 0.2, wh, 0.06, cx + s * (W / 2 - 0.1), 0, zt, { flat: true, uv: 1 });
    B.box(white, W, 0.16, 0.06, cx, wh - 0.2, zt, { flat: true, uv: 1 });
    const edge = (x1: number, y1: number, x2: number, y2: number) => {
      const L = Math.hypot(x2 - x1, y2 - y1), a = Math.atan2(y2 - y1, x2 - x1);
      B.geo(white, new THREE.BoxGeometry(L + 0.1, 0.2, 0.07), cx + (x1 + x2) / 2, (y1 + y2) / 2 - 0.1, zt + 0.01, { rz: a, uv: 1 });
    };
    edge(W / 2, wh, W * 0.34, rl); edge(W * 0.34, rl, 0, rt); edge(-W / 2, wh, -W * 0.34, rl); edge(-W * 0.34, rl, 0, rt);
    /** red panel with white frame and white X */
    const xPanel = (px: number, y0: number, w: number, h: number, z: number, withBoards = true) => {
      if (withBoards) B.box(barnBoards, w, h, 0.07, px, y0, z, { flat: true, uv: 1.5, world: true });
      const f = 0.14;
      for (const [bw, bh, bx, by] of [[w, f, 0, h - f], [w, f, 0, 0], [f, h, -w / 2 + f / 2, 0], [f, h, w / 2 - f / 2, 0]] as const)
        B.box(white, bw, bh, 0.05, px + bx, y0 + by, z + 0.055, { flat: true, uv: 1 });
      const dx = w - 2 * f, dy = h - 2 * f, L = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      for (const s of [-1, 1]) B.geo(white, new THREE.BoxGeometry(L, f * 0.9, 0.045), px, y0 + h / 2, z + 0.055, { rz: s * a, uv: 1 });
    };
    if (!open) {
      for (const s of [-1, 1]) xPanel(cx + s * dw / 4, 0.02, dw / 2, dh, zf + 0.04);
      B.box(darkSteel, dw + 1.4, 0.1, 0.08, cx, dh + 0.08, zf + 0.12, { flat: true });
    } else {
      B.box(darkSteel, W - 0.4, 0.1, 0.08, cx, dh + 0.08, zf + 0.12, { flat: true });
      for (const s of [-1, 1]) xPanel(cx + s * (dw / 2 + dw / 4 - 0.1), 0.02, dw / 2, dh, zf + 0.1);
      k.collider(cx - W / 2, cx - dw / 2 + 0.1, zf, zf + 0.25, 0, dh, false);
      k.collider(cx + dw / 2 - 0.1, cx + W / 2, zf, zf + 0.25, 0, dh, false);
    }
    // hayloft door with X in the gable + two small windows
    xPanel(cx, wh + 0.25, 1.3, 1.3, zf + 0.01);
    for (const s of [-1, 1]) {
      const wx = cx + s * (W / 2 - 0.85);
      B.box(glass, 0.62, 0.62, 0.03, wx, 2.0, zf + 0.02, { flat: true });
      for (const [bw, bh, bx, by] of [[0.8, 0.1, 0, 0.62], [0.8, 0.1, 0, -0.1], [0.1, 0.82, -0.36, -0.1], [0.1, 0.82, 0.36, -0.1], [0.05, 0.62, 0, 0], [0.62, 0.05, 0, 0.29]] as const)
        B.box(white, bw, bh, 0.05, wx + bx, 2.0 + by, zf + 0.05, { flat: true, uv: 1 });
    }
  };
  /** hopper silo on legs with a caged ladder */
  const silo = (x: number, z: number, R = 1.35, H = 3.6, ladderSide = 0) => {
    const y0 = 2.5;
    B.geo(corr, new THREE.CylinderGeometry(R, R, H, 32, 1, true), x, y0 + H / 2, z, { su: 3, sv: H / 1.6 });
    B.geo(corr, new THREE.CylinderGeometry(R, 0.22, 1.5, 32, 1, true), x, y0 - 0.75, z, { su: 3, sv: 1 });
    B.geo(galv, new THREE.ConeGeometry(R + 0.08, 0.9, 32, 1, true), x, y0 + H + 0.45, z, {});
    B.cyl(darkSteel, 0.25, 0.25, 0.2, x, y0 + H + 0.8, z, { seg: 12 });
    B.cyl(darkSteel, 0.2, 0.2, 0.3, x, y0 - 1.75, z, { seg: 12 });
    for (const yy of [y0, y0 + H]) B.geo(steel, new THREE.TorusGeometry(R + 0.02, 0.04, 6, 32), x, yy, z, { rx: Math.PI / 2 });
    // legs + cross braces
    const legs: [number, number][] = [];
    for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2; legs.push([x + Math.cos(a) * (R - 0.05), z + Math.sin(a) * (R - 0.05)]); }
    for (const [lx, lz] of legs) {
      B.box(darkSteel, 0.14, y0 + 0.2, 0.14, lx, 0, lz, { flat: true });
      B.box(darkSteel, 0.35, 0.03, 0.35, lx, 0, lz, { flat: true });
      k.collider(lx - 0.1, lx + 0.1, lz - 0.1, lz + 0.1, 0, y0, false);
    }
    for (let i = 0; i < 4; i++) {
      const [ax, az] = legs[i], [bx, bz] = legs[(i + 1) % 4];
      B.rod(darkSteel, 0.025, [ax, 0.3, az], [bx, y0 - 0.2, bz], 6);
      B.rod(darkSteel, 0.025, [bx, 0.3, bz], [ax, y0 - 0.2, az], 6);
    }
    k.collider(x - R * 0.9, x + R * 0.9, z - R * 0.9, z + R * 0.9, y0 - 1.3, y0 + H + 0.5, true);
    // caged ladder
    const a = ladderSide, lx = x + Math.cos(a) * (R + 0.2), lz = z + Math.sin(a) * (R + 0.2);
    const tx = -Math.sin(a), tz = Math.cos(a);
    for (const s of [-1, 1]) B.rod(steel, 0.022, [lx + tx * s * 0.22, 0, lz + tz * s * 0.22], [lx + tx * s * 0.22, y0 + H + 0.9, lz + tz * s * 0.22], 6);
    for (let y = 0.3; y < y0 + H + 0.8; y += 0.3) B.rod(steel, 0.015, [lx - tx * 0.22, y, lz - tz * 0.22], [lx + tx * 0.22, y, lz + tz * 0.22], 5);
    for (let y = 2.2; y < y0 + H + 0.8; y += 0.8) B.geo(steel, new THREE.TorusGeometry(0.36, 0.015, 4, 16, Math.PI), lx, y, lz, { rx: Math.PI / 2, rz: 0, ry: -a + Math.PI / 2 });
    k.collider(lx - 0.3, lx + 0.3, lz - 0.3, lz + 0.3, 0, y0 + H + 0.9, false);
  };
  /** green IBC tote on its pallet */
  const ibc = (x: number, y: number, z: number, ry = 0) => {
    const w = 1.2, h = 1.1, d = 1.0;
    B.box(palletM, w, 0.14, d, x, y, z, { ry, uv: 0.6 });
    B.geo(ibcM, new THREE.BoxGeometry(w - 0.02, h, d - 0.02), x, y + 0.14 + h / 2, z, { ry, uv: 1.1 });
    B.cyl(tankTop, 0.16, 0.16, 0.08, x, y + 0.14 + h, z, { seg: 14 });
    const [vx, vz] = loc(x, z, ry, 0, d / 2 + 0.05);
    B.cyl(darkSteel, 0.06, 0.06, 0.14, vx, y + 0.22, vz, { rx: Math.PI / 2, seg: 10 });
    rotCol(x, z, ry, w, d, y, y + 0.14 + h, true);
  };
  /** wooden pallet; y = bottom */
  const pallet = (x: number, y: number, z: number, ry = 0) => {
    for (const lz of [-0.36, 0, 0.36]) { const [px, pz] = loc(x, z, ry, 0, lz); B.geo(palletM, new THREE.BoxGeometry(1.2, 0.08, 0.1), px, y + 0.04, pz, { ry, uv: 0.6 }); }
    for (let i = 0; i < 5; i++) { const [px, pz] = loc(x, z, ry, -0.5 + i * 0.25, 0); B.geo(palletM, new THREE.BoxGeometry(0.16, 0.025, 0.84), px, y + 0.095, pz, { ry, uv: 0.6 }); }
    for (let i = 0; i < 7; i++) { const [px, pz] = loc(x, z, ry, 0, -0.39 + i * 0.13); B.geo(palletM, new THREE.BoxGeometry(1.2, 0.02, 0.1), px, y + 0.118, pz, { ry, uv: 0.6 }); }
  };
  const crateLabels = [0, 1, 2].map((i) => life.label({ text: ["KODNER FARM", "APPLES", "EGGS - FRAGILE"][i], sub: ["produce - grade A", "Red Delicious 18 kg", "handle with care"][i], bg: "#f6f1e2", fg: ["#1f5a2e", "#b01818", "#8a5a1a"][i], border: ["#1f5a2e", "#b01818", "#8a5a1a"][i], px: [200, 110] }));
  const crate = (x: number, y: number, z: number, ry: number, m = crateM, w = 0.6, h = 0.4, d = 0.45) => {
    B.box(m, w - 0.03, h - 0.06, d - 0.03, x, y + 0.03, z, { ry, uv: 0.4 });
    B.box(m, w, 0.06, d, x, y + h - 0.06, z, { ry, uv: 0.4 });
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) { const [px, pz] = loc(x, z, ry, lx * (w / 2 - 0.04), lz * (d / 2 - 0.04)); B.box(m, 0.07, 0.05, 0.07, px, y, pz, { ry, flat: true }); }
    for (const sd of [-1, 1]) {
      const [hx, hz] = loc(x, z, ry, sd * (w / 2 - 0.012), 0); B.box(darkSteel, 0.012, 0.05, Math.min(0.16, d * 0.35), hx, y + h - 0.13, hz, { ry, flat: true });
      for (let r2 = 0; r2 < 3; r2++) { const [sx2, sz2] = loc(x, z, ry, 0, sd * (d / 2 - 0.012)); B.box(tableWood, w * 0.9, 0.03, 0.014, sx2, y + 0.1 + r2 * (h - 0.25) / 3, sz2, { ry, flat: true }); }
    }
    if (lr() < 0.8) { const [lx2, lz2] = loc(x, z, ry, 0, d / 2 + 0.003); life.wall(crateLabels[Math.floor(lr() * 3)], lx2, y + h - 0.19, lz2, Math.min(0.24, w * 0.4), ry); }
    rotCol(x, z, ry, w, d, y, y + h, true);
  };
  const bucket = (x: number, z: number, y = 0) => {
    B.geo(galv, new THREE.LatheGeometry([[0, 0.01], [0.15, 0], [0.19, 0.34], [0.2, 0.35], [0.185, 0.35], [0.175, 0.33], [0.14, 0.03], [0, 0.03]].map(([a, b]) => new THREE.Vector2(a, b)), 20), x, y, z);
    B.geo(steel, new THREE.TorusGeometry(0.19, 0.006, 4, 16, Math.PI), x, y + 0.36, z, { rx: -0.4 });
  };
  /** hot-air balloon: striped envelope on ropes above a wicker basket */
  const balloon = (x: number, z: number, m: Mat, s = 1, by = 0) => {
    const prof: [number, number][] = [[0.42, 0], [0.7, 0.35], [1.25, 1.0], [1.7, 1.7], [1.95, 2.4], [2.0, 2.85], [1.9, 3.35], [1.6, 3.85], [1.1, 4.25], [0.45, 4.45], [0.0, 4.5]];
    const ey = by + 1.9 * s;
    const env = new THREE.LatheGeometry(prof.map(([r, h]) => new THREE.Vector2(r * s, h * s)), 40);
    B.geo(m, env, x, ey, z, {});
    const inner = new THREE.LatheGeometry(prof.slice(0, 3).map(([r, h]) => new THREE.Vector2(r * s * 0.99, h * s)), 20);
    inner.scale(-1, 1, 1);
    B.geo(m, inner, x, ey, z, {});
    B.geo(leather, new THREE.TorusGeometry(0.42 * s, 0.035, 6, 24), x, ey, z, { rx: Math.PI / 2 });
    // basket
    const bw = 1.0 * s, bh = 0.95 * s;
    B.box(wicker, bw, bh, bw, x, by, z, { uv: 0.5 });
    B.geo(leather, new THREE.TorusGeometry(bw * 0.62, 0.05, 6, 4), x, by + bh, z, { rx: Math.PI / 2, rz: Math.PI / 4 });
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + i * Math.PI / 2;
      const px = x + Math.cos(a) * bw * 0.62, pz = z + Math.sin(a) * bw * 0.62;
      B.rod(rope, 0.015, [px, by + bh, pz], [x + Math.cos(a) * 0.42 * s, ey, z + Math.sin(a) * 0.42 * s], 4);
      B.rod(darkSteel, 0.018, [x + Math.cos(a) * bw * 0.4, by + bh, z + Math.sin(a) * bw * 0.4], [x + Math.cos(a) * 0.2, by + bh + 0.6 * s, z + Math.sin(a) * 0.2], 5);
    }
    B.cyl(steel, 0.18, 0.2, 0.3, x, by + bh + 0.55 * s, z, { seg: 14 });
    k.collider(x - bw / 2, x + bw / 2, z - bw / 2, z + bw / 2, by, by + bh, true);
    const R = 1.75 * s;
    k.collider(x - R * 0.7, x + R * 0.7, z - R * 0.7, z + R * 0.7, ey + 1.0 * s, ey + 4.4 * s, true);
  };
  /** red/white circus tent */
  const tent = (x: number, z: number, r: number, h: number) => {
    B.geo(tentM, new THREE.CylinderGeometry(r, r * 1.02, h, 32, 1, true), x, h / 2, z, { su: Math.round(r * 2.5), sv: 1 });
    const roof = new THREE.ConeGeometry(r * 1.12, r * 1.05, 32, 1, true);
    scaleUV(roof, Math.round(r * 2.5), 1);
    B.geo(tentM, roof, x, h + r * 0.52, z, {});
    // scalloped valance
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      B.geo(i % 2 ? white : redM, new THREE.CircleGeometry(0.2, 8, Math.PI, Math.PI), x + Math.cos(a) * r * 1.1, h - 0.02, z + Math.sin(a) * r * 1.1, { ry: -a + Math.PI / 2 });
    }
    B.cyl(gold, 0.03, 0.03, 0.5, x, h + r * 1.02, z, { seg: 6 });
    B.geo(gold, new THREE.SphereGeometry(0.1, 12, 8), x, h + r * 1.05 + 0.5, z, {});
    B.cyl(gold, r * 1.02, r * 1.04, 0.08, x, 0, z, { seg: 32 });
    k.collider(x - r * 0.9, x + r * 0.9, z - r * 0.9, z + r * 0.9, 0, h, true);
    k.collider(x - r * 0.45, x + r * 0.45, z - r * 0.45, z + r * 0.45, h, h + r * 0.6, true);
  };
  /** cotton cloud hanging on wires */
  const cloud = (x: number, y: number, z: number, s: number, ry: number) => {
    const n = 7 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const t = (i / (n - 1)) * 2 - 1;
      const r = (0.5 + (1 - Math.abs(t)) * 0.4 + rnd() * 0.15) * s;
      const [px, pz] = loc(x, z, ry, t * 1.7 * s, (rnd() - 0.5) * 1.0 * s);
      B.geo(cloudM, puffGeo(r, i * 3.1 + x), px, y + (rnd() - 0.5) * 0.2 * s, pz, { ry: rnd() * 6, su: 2, sv: 2 });
    }
    for (let i = 0; i < 4; i++) {
      const t = (i / 3) * 1.2 - 0.6;
      const r = (0.55 + rnd() * 0.25) * s;
      const [px, pz] = loc(x, z, ry, t * 1.6 * s + (rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.6 * s);
      B.geo(cloudM, puffGeo(r, i * 5.7 + z), px, y + (0.55 + (0.6 - Math.abs(t)) * 0.5) * s, pz, { ry: rnd() * 6, su: 2, sv: 2 });
    }
    for (const t of [-0.8, 0.8]) {
      const [px, pz] = loc(x, z, ry, t * s, 0);
      B.rod(wire, 0.006, [px, y + 0.6 * s, pz], [px, WH, pz], 3);
    }
  };

  __t.push(["shell+defs", performance.now()]);
  // ---------- NORTH: barns, pumpkin patch ----------
  barn(-6, Z0, 7, 5, false);
  barn(10.5, Z0, 6.4, 5.4, true);
  // pumpkin patch beside the closed barn: soil / straw ridges inside a white fence
  const PX0 = -1.6, PX1 = 4.8, PZ0 = -13.8, PZ1 = -9.2;
  for (let i = 0; i < 7; i++) {
    const zz = PZ0 + 0.35 + i * 0.65, m = i % 2 ? soil : paleStraw;
    const g = new THREE.CylinderGeometry(0.33, 0.33, PX1 - PX0 - 0.4, 14, 1);
    g.scale(1, 1, 0.55);
    B.geo(m, g, (PX0 + PX1) / 2, 0, zz, { rz: Math.PI / 2, su: 1, sv: 5 });
  }
  k.collider(PX0 + 0.2, PX1 - 0.2, PZ0, PZ1 - 0.2, 0, 0.18, true);
  const pk: [number, number, number, boolean][] = [[-0.8, -13.4, 0.42, false], [0.4, -12.8, 0.34, true], [1.6, -13.4, 0.46, false], [3.2, -13.3, 0.4, true], [4.1, -12.6, 0.35, false],
    [-0.6, -11.5, 0.38, true], [0.9, -11.6, 0.5, false], [2.4, -12.0, 0.33, false], [3.6, -11.3, 0.44, true], [-0.2, -10.1, 0.36, false], [1.8, -10.3, 0.42, true], [3.1, -9.9, 0.32, false], [4.2, -10.2, 0.38, false]];
  for (const [x, z, r, y] of pk) pumpkin(x, z, r, y ? pumpY : pumpO, 0.14, (rnd() - 0.5) * 0.15);
  fence(PX0 - 0.1, PZ1 + 0.2, 0.9, PZ1 + 0.2);
  fence(2.5, PZ1 + 0.2, PX1 + 0.1, PZ1 + 0.2);
  fence(PX1 + 0.1, PZ1 + 0.2, PX1 + 0.1, PZ0 - 1.1);
  // hay + milk bucket against the closed barn front
  bale(-8.6, 0, -9.3, 0.05); bale(-8.4, 0.55, -9.35, -0.08); bale(-3.4, 0, -9.3, -0.04);
  roundBale(-1.0, -8.2, 0.4, true, 0.75, 1.15);
  bucket(-7.2, -9.1);

  // ---------- NW: silos, IBC totes, mud mound ----------
  silo(-17.6, -12.4, 1.35, 3.4, 0);
  silo(-14.2, -12.9, 1.2, 3.0, Math.PI / 2);
  ibc(-18.9, 0, -8.6, Math.PI / 2); ibc(-18.9, 0, -7.4, Math.PI / 2); ibc(-18.9, 1.25, -8.0, Math.PI / 2 + 0.05);
  bucket(-17.9, -6.6);
  // mud mound with a wheelbarrow-ish crate and gas cylinder
  const mud = new THREE.SphereGeometry(2.1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const mp = mud.attributes.position;
  for (let i = 0; i < mp.count; i++) {
    const x = mp.getX(i), z = mp.getZ(i);
    mp.setY(i, mp.getY(i) * 0.2 * (1 + 0.15 * Math.sin(x * 3) * Math.cos(z * 2.5)));
    mp.setX(i, x * (1 + 0.08 * Math.sin(z * 2)));
  }
  mud.computeVertexNormals();
  B.geo(dirt, mud, -13.4, 0, -6.8, { su: 3, sv: 2 });
  k.collider(-15, -11.8, -8.2, -5.4, 0, 0.42, true);
  fence(-15.8, -4.4, -10.8, -4.4);
  crate(-12.6, 0.3, -7.2, 0.3, crateM, 0.9, 0.5, 0.6);
  // gas cylinder
  B.geo(gasM, new THREE.LatheGeometry([[0, 0], [0.16, 0], [0.16, 0.7], [0.12, 0.8], [0.05, 0.84], [0.05, 0.92], [0, 0.92]].map(([a, b]) => new THREE.Vector2(a, b)), 20), -16.4, 0, -9.9);
  B.geo(redM, new THREE.TorusGeometry(0.09, 0.02, 6, 12), -16.4, 0.95, -9.9, { rx: Math.PI / 2 });
  k.collider(-16.6, -16.2, -10.1, -9.7, 0, 0.95, false);

  // ---------- NE: blue/white hot-air balloon ----------
  balloon(17.4, -11.6, goreBlue, 1, 0);
  for (let i = 0; i < 3; i++) pallet(15.3, i * 0.14, -8.4, 0.1);
  crate(15.3, 0.42, -8.4, 0.15, greenCrate, 0.7, 0.45, 0.5);
  bale(18.8, 0, -7.6, Math.PI / 2);

  // ---------- WEST: cow pasture ----------
  fence(X0 + 0.1, -3.4, -9.6, -3.4);
  fence(-9.6, -3.4, -9.6, 0.6);
  fence(-9.6, 3.4, -9.6, 7.2);
  fence(-9.6, 7.2, X0 + 0.1, 7.2);
  cow(-16.2, -0.6, 0.3);
  cow(-12.6, 2.2, -0.5, 1.05, { flip: true, art: cowM2 });
  cow(-17.2, 4.4, 2.9, 0.95);
  cow(-12.8, -1.8, 1.1, 1, { fallen: true });
  // trough + round bales + hay rack
  B.geo(galv, new THREE.CylinderGeometry(0.35, 0.3, 2.2, 18, 1, false, 0, Math.PI), -18.6, 0.5, 1.6, { rx: Math.PI / 2, rz: Math.PI, uv: 0.9 });
  B.geo(galv, new THREE.CylinderGeometry(0.35, 0.35, 0.02, 18, 1, false, 0, Math.PI), -18.6, 0.5, 0.5, { rx: Math.PI / 2, rz: Math.PI });
  B.geo(galv, new THREE.CylinderGeometry(0.35, 0.35, 0.02, 18, 1, false, 0, Math.PI), -18.6, 0.5, 2.7, { rx: Math.PI / 2, rz: Math.PI });
  for (const sx of [-1, 1]) B.geo(galv, new THREE.CylinderGeometry(0.025, 0.025, 2.24, 8), -18.6 + sx * 0.35, 0.5, 1.6, { rx: Math.PI / 2 });
  for (const lz of [0.7, 2.5]) for (const sx of [-1, 1]) B.box(darkSteel, 0.04, 0.3, 0.04, -18.6 + sx * 0.2, 0, lz, { flat: true });
  B.box(water, 0.58, 0.02, 2.08, -18.6, 0.49, 1.6, { flat: true });
  k.collider(-18.95, -18.25, 0.5, 2.7, 0, 0.55, true);
  roundBale(-14.6, 6.0, 0.1, false, 0.8, 1.2);
  roundBale(-11.6, 5.8, 0.4, true, 0.8, 1.2);
  bucket(-15.2, 2.9);

  // ---------- CENTRE: big hay stack (round bales on rectangular bales) ----------
  const HX = -3.4, HZ = -1.6;
  for (let i = 0; i < 4; i++) bale(HX - 1.8 + i * 1.2, 0, HZ, 0);
  for (let i = 0; i < 4; i++) bale(HX - 1.8 + i * 1.2, 0, HZ - 0.72, 0);
  for (let i = 0; i < 3; i++) roundBale(HX - 1.2 + i * 1.2, HZ - 0.36, 0, true, 0.62, 1.05, 0.55);
  bale(HX - 1.6, 0, HZ + 1.3, 0.1); bale(HX - 1.5, 0.55, HZ + 1.3, 0.02); bale(HX - 0.3, 0, HZ + 1.35, -0.06);
  bale(HX + 1.9, 0, HZ + 1.4, Math.PI / 2 + 0.2);
  // green bin boxes behind the stack (like the green crates in the real hall)
  for (let i = 0; i < 2; i++) crate(HX + 3.2 + i * 0.75, 0, HZ - 1.2, 0, greenCrate, 0.7, 0.7, 0.7);
  crate(HX + 3.55, 0.7, HZ - 1.2, 0.05, greenCrate, 0.7, 0.7, 0.7);
  cow(-7.4, 2.8, 0.7, 1, {});
  // yellow lumber pile + pallets near the centre fence
  for (let i = 0; i < 2; i++) pallet(2.8, i * 0.14, -3.2, -0.2);
  for (let i = 0; i < 6; i++) B.box(yellowWood, 2.4, 0.08, 0.2, 2.8 + (i % 3 - 1) * 0.22 * Math.cos(0.2), 0.28 + Math.floor(i / 3) * 0.085, -3.2 + (i % 3 - 1) * 0.22, { ry: -0.2, uv: 0.5 });
  rotCol(2.8, -3.2, -0.2, 2.4, 0.9, 0, 0.46, true);
  fence(0.2, -5.4, 6.4, -5.4);
  // huge lying round bale
  roundBale(6.4, -1.6, 0.35, false, 1.2, 1.6);

  // ---------- EAST: circus tents + red balloon ----------
  tent(15.2, -2.8, 1.3, 1.7);
  tent(17.9, 0.4, 1.4, 1.8);
  tent(14.4, 1.9, 1.2, 1.6);
  balloon(17.2, 7.2, goreRed, 0.8, 0);
  B.geo(blueSack, new RoundedBoxGeometry(1.1, 0.25, 0.7, 2, 0.1), 12.6, 0.12, -1.0, { ry: 0.3, uv: 0.5 });

  // ---------- SOUTH-EAST: hay pyramid, pumpkin table, cows by the fence ----------
  for (let i = 0; i < 4; i++) bale(10.2 + i * 1.2, 0, 12.6, 0);
  for (let i = 0; i < 4; i++) bale(10.2 + i * 1.2, 0, 13.35, 0);
  for (let i = 0; i < 3; i++) bale(10.8 + i * 1.2, 0.55, 13.0, 0.03);
  for (let i = 0; i < 2; i++) bale(11.4 + i * 1.2, 1.1, 13.0, -0.04);
  bale(12.0, 1.65, 13.0, 0.08);
  // wooden table with stacked pumpkins
  const TX = 7.4, TZ = 13.4;
  B.box(tableWood, 1.8, 0.08, 0.9, TX, 0.82, TZ, { uv: 0.8 });
  for (const s2 of [-1, 1]) {
    for (const lz of [-1, 1]) B.geo(tableWood, new THREE.BoxGeometry(0.07, 0.9, 0.07), TX + s2 * 0.72, 0.41, TZ + lz * 0.22, { rx: lz * 0.28, uv: 0.5 });
    B.box(tableWood, 0.07, 0.07, 0.8, TX + s2 * 0.72, 0.72, TZ, { uv: 0.5 });
    B.box(tableWood, 0.07, 0.06, 0.62, TX + s2 * 0.72, 0.2, TZ, { uv: 0.5 });
  }
  B.box(tableWood, 1.5, 0.07, 0.07, TX, 0.2, TZ, { uv: 0.5 });
  k.collider(TX - 0.9, TX + 0.9, TZ - 0.45, TZ + 0.45, 0.8, 0.9, true);
  pumpkin(TX - 0.4, TZ, 0.36, pumpO, 0.9); pumpkin(TX + 0.45, TZ + 0.05, 0.3, pumpY, 0.9); pumpkin(TX - 0.38, TZ, 0.26, pumpO, 1.42);
  pumpkin(TX + 1.5, TZ + 0.2, 0.42, pumpO); pumpkin(TX - 1.4, TZ + 0.1, 0.36, pumpY);
  fence(4.0, 8.4, 11.2, 8.4);
  cow(8.2, 9.6, Math.PI + 0.15, 1, { art: cowM2 });
  cow(11.8, 10.2, -0.3, 0.95, { flip: true });
  cow(14.6, 9.6, 0.4, 1, { fallen: true });

  // ---------- SOUTH-WEST: pallets, IBC totes, crates, fence, cows ----------
  for (let i = 0; i < 4; i++) pallet(-17.8, i * 0.14, 13.6, 0);
  for (let i = 0; i < 3; i++) pallet(-16.4, i * 0.14, 13.7, 0.1);
  k.collider(-18.4, -15.8, 13.1, 14.2, 0, 0.56, true);
  ibc(-14.4, 0, 13.9, 0); ibc(-13.1, 0, 13.9, 0.03); ibc(-13.75, 1.25, 13.9, 0.02);
  crate(-18.2, 0, 11.6, 0.2, crateM, 0.7, 0.45, 0.5); crate(-18.0, 0.45, 11.7, -0.1, crateM, 0.7, 0.45, 0.5);
  crate(-11.4, 0, 13.8, 0, greenCrate, 0.7, 0.7, 0.7); crate(-10.6, 0, 13.9, 0.1, greenCrate, 0.7, 0.7, 0.7);
  fence(-9.0, 10.0, -3.6, 10.0);
  fence(-9.0, 10.0, -9.0, 12.0);
  cow(-6.4, 11.6, Math.PI - 0.2, 1);
  cow(-14.6, 9.8, 0.2, 0.9, { flip: true, art: cowM2 });
  roundBale(-3.0, 12.8, 1.2, false, 0.8, 1.2);
  bucket(-5.0, 13.9); bucket(-4.6, 14.1);
  B.geo(blueSack, new RoundedBoxGeometry(1.0, 0.24, 0.65, 2, 0.1), -8.0, 0.12, 13.7, { ry: -0.2, uv: 0.5 });
  roundBale(4.4, 13.6, 0, true, 0.75, 1.15);

  // ---------- LIFE: signs, letters, notes ----------
  {
    const L = (id: number, x: number, y: number, z: number, w: number, ry: number, tilt = 0) => life.wall(id, x, y, z, w, ry, tilt);
    // barn name board in the gable of the closed barn + hay loft sign on the open barn
    B.box(tableWood, 2.3, 0.62, 0.05, -6, 3.62, -10.0, { flat: true, uv: 0.8 });
    L(life.plate({ text: "KODNER FARM", sub: "est. 1952 - fresh eggs & pumpkins", style: "wood", px: [420, 110] }), -6, 3.93, -9.97, 2.2, 0);
    L(life.label({ text: "NO SMOKING", sub: "hay loft - fire risk", bg: "#ffffff", fg: "#b01818", border: "#b01818", wear: 0.4 }), 13.72, 2.0, -11.0, 0.55, Math.PI / 2);
    L(life.graffiti({ text: "T.K. \u2665 Bessie", color: "#f2f2ea", style: "chalk", px: [300, 110] }), 7.28, 1.3, -12.2, 0.9, -Math.PI / 2, 0.05);
    // welcome sign on two posts facing the entrance
    { const x = -2.8, z = 8.6;
      for (const s2 of [-1, 1]) B.box(tableWood, 0.1, 1.9, 0.1, x + s2 * 0.75, 0, z, { uv: 0.5 });
      B.box(tableWood, 1.8, 0.62, 0.05, x, 1.2, z + 0.06, { uv: 0.8 });
      k.collider(x - 0.85, x + 0.85, z - 0.08, z + 0.12, 0, 1.9, false);
      L(life.plate({ text: "WELCOME TO", sub: "INDOOR COUNTRY - please close all gates", style: "wood", px: [420, 130] }), x, 1.51, z + 0.09, 1.7, 0);
    }
    // mailbox on a post near the entrance with a letter sticking out
    { const x = 5.8, z = 10.8;
      B.box(tableWood, 0.1, 1.05, 0.1, x, 0, z, { uv: 0.5 });
      B.geo(redM, new THREE.CylinderGeometry(0.16, 0.16, 0.5, 16, 1, false, 0, Math.PI), x, 1.13, z, { rx: Math.PI / 2, rz: -Math.PI / 2 });
      B.box(redM, 0.32, 0.12, 0.5, x, 1.02, z, { uv: 0.5 });
      B.box(darkSteel, 0.02, 0.2, 0.05, x + 0.17, 1.12, z - 0.12, { flat: true });
      k.collider(x - 0.17, x + 0.17, z - 0.26, z + 0.26, 0, 1.3, false);
      L(life.label({ text: "T. KODNER", sub: "Kodner Farm", bg: "#ffffff", fg: "#222", px: [200, 90] }), x + 0.162, 1.03, z, 0.2, Math.PI / 2);
      life.put(life.custom(256, 160, (g, w, h) => { g.fillStyle = "#efe4c8"; g.fillRect(0, 0, w, h); g.fillStyle = "#1d2a66"; g.font = "italic 22px 'Comic Sans MS',cursive"; g.fillText("Mr. Tom Kodner", 40, 90); g.font = "16px 'Comic Sans MS',cursive"; g.fillText("Kodner Farm, Indoor Country", 40, 116); g.fillStyle = "#c0392b"; g.fillRect(w - 52, 12, 36, 42); }), x, 1.26, z + 0.3, 0.16, { rx: -1.2 });
    }
    // pumpkin stand chalkboard on the table
    B.box(tableWood, 0.62, 0.46, 0.04, TX + 0.2, 0.86, TZ - 0.36, { rx: 0.15, uv: 0.8 });
    life.put(life.menu({ title: "PUMPKINS", sub: "picked this morning", items: [["small", "2.00"], ["big", "5.00"], ["3 for", "5.00"], ["giant", "ask Tom"]], style: "chalk", px: [256, 190] }), TX + 0.2, 1.09, TZ - 0.387, 0.56, { rx: 0.15, h: 0.4 });
    // pasture: gate sign on the fence, notes on the IBC totes
    L(life.label({ text: "COW PASTURE", sub: "please close the gate - T. Kodner", bg: "#f6f1e2", fg: "#1f5a2e", border: "#1f5a2e", wear: 0.3 }), -9.52, 0.82, 5.0, 0.6, Math.PI / 2);
    L(life.note({ text: "WATER for cows only! do not drink", color: "#fff27a", tape: true }), -14.4, 0.7, 13.9 - 0.505, 0.16, Math.PI, 0.06);
    // circus poster on a post near the tents
    { const x = 12.6, z = 0.4;
      B.box(tableWood, 0.1, 2.2, 0.1, x, 0, z, { uv: 0.5 });
      B.box(tableWood, 0.66, 0.9, 0.03, x, 1.1, z + 0.065, { uv: 0.8 });
      k.collider(x - 0.1, x + 0.1, z - 0.1, z + 0.1, 0, 2.2, false);
      L(life.poster({ title: "CIRCUS!", sub: "TONIGHT 7 PM", body: "the amazing hiding chameleons\nring-master Tom Kodner", bg: "#b01818", fg: "#ffffff", accent: "#f2c230", style: "retro", art: (g, w, h) => drawChameleon(g, w * 0.5, h * 0.55, h * 0.7, "#f2c230"), wear: 0.3 }), x, 1.55, z + 0.082, 0.6, 0);
    }
    // farm newspaper on a hay bale + a note on the balloon pallets
    life.flat(life.news({ name: "Farm Weekly", headline: "KODNER PUMPKIN WINS BLUE RIBBON", sub: "a 212 kg giant from the Indoor Country patch", photo: (g, w, h) => { g.fillStyle = "#9a948a"; g.fillRect(0, 0, w, h); g.fillStyle = "#5a554c"; g.beginPath(); g.ellipse(w * 0.5, h * 0.62, w * 0.3, h * 0.32, 0, 0, Math.PI * 2); g.fill(); g.fillRect(w * 0.48, h * 0.2, w * 0.04, h * 0.14); } }), HX - 0.3, 0.55, HZ + 1.35, 0.4, -0.06 + 0.2);
    L(life.note({ text: "Balloon rides SAT 10am - ask Tom!", color: "#aee4ff", tape: true }), 15.3, 0.64, -8.4 + 0.255, 0.16, 0, -0.05);
  }

  __t.push(["props", performance.now()]);
  // ---------- hanging cotton clouds ----------
  const clouds: [number, number, number, number, number][] = [[-12, 5.6, -8, 1.1, 0.2], [-2, 6.0, -6, 1.0, -0.3], [6, 5.5, -7.5, 1.2, 0.1], [15, 6.1, -4.5, 0.9, 0.5],
    [-15, 5.8, 2, 1.0, -0.2], [-4, 5.4, 4, 1.15, 0.4], [4.5, 6.2, 2, 0.9, 0], [12, 5.7, 3.5, 1.1, -0.4], [-10, 6.0, 11, 1.0, 0.3], [1, 5.8, 10, 1.05, -0.1], [11, 6.1, 11.5, 0.95, 0.2]];
  for (const [x, y, z, s, r] of clouds) cloud(x, y, z, s, r);

  __t.push(["clouds", performance.now()]);
  B.flush();
  __t.push(["flush", performance.now()]);
  (globalThis as unknown as { __ctT: unknown }).__ctT = __t.map(([n, t], i) => [n, Math.round(t - (i ? __t[i - 1][1] : t))]);

  k.room("Red Barn", 7.3, 13.7, Z0, -9.6);
  k.room("Pumpkin Patch", PX0, PX1, PZ0, PZ1 + 0.3);
  k.room("Silos", X0, -11, Z0, -4.4);
  k.room("Balloon Corner", 14.5, X1, Z0, -6);
  k.room("Cow Pasture", X0, -9.6, -3.4, 7.2);
  k.room("Circus Tents", 12, X1, -5, 4.5);
  k.room("Haystack", -7, 0.5, -3.5, 0.5);
  k.room("Entrance", -5, 5, 10, Z1);
  k.room("Indoor Country", X0, X1, Z0, Z1);

  // hider spawns: open grass east of centre
  const hiders: THREE.Vector3[] = [];
  for (let i = 0; i < 24; i++) hiders.push(new THREE.Vector3(1.2 + (i % 6) * 1.2, 0, 2.6 + Math.floor(i / 6) * 1.2));
  const hunters: THREE.Vector3[] = [];
  for (let i = 0; i < 9; i++) hunters.push(new THREE.Vector3(DX - 1.3 + (i % 3) * 1.3, 0, 13.6 - Math.floor(i / 3) * 1.2));

  return k.finish({
    id: "country", name: "Indoor Country",
    bounds: { minX: X0 + 0.2, maxX: X1 - 0.2, minZ: Z0 + 0.2, maxZ: Z1 - 0.2 },
    hunterSpawns: hunters, hiderSpawns: hiders,
    preview: { pos: [-2, 3.2, 13], look: [4, 2.2, -8], fov: 64 },
    lighting: {
      sky: "#20231f",
      hemi: ["#eafcf6", "#4d7a33", 0.35],
      sun: { color: "#fff5e4", int: 1.9, pos: [9, 30, 15] },
      points: [
        { pos: [-11, 7.2, -7], color: "#fff4e2", int: 20, dist: 24 },
        { pos: [9, 7.2, -7], color: "#fff4e2", int: 20, dist: 24 },
        { pos: [-11, 7.2, 6], color: "#fff4e2", int: 18, dist: 24 },
        { pos: [9, 7.2, 6], color: "#fff4e2", int: 18, dist: 24 },
        { pos: [0, 7.2, 0], color: "#fff8ee", int: 15, dist: 22 },
        { pos: [0, 7.2, 12], color: "#fff8ee", int: 13, dist: 20 },
      ],
      exposure: 0.92,
      hdri: "studio",
      env: 0.45,
    },
  });
}
