// Indoor Country (屋内カントリー): a farm built as a MOVIE SET inside a sound stage.
// Plywood cut-out standees (cows, chickens, trees, clouds, sun, barn façade — with visible plywood edges and
// 2x4 back braces weighted by sandbags) mixed with real props (hay bales, crops, pumpkins, fences, crates,
// wheelbarrow, tools). Huge painted sky murals on the walls, red barn doors, hanging clouds, and the studio's
// lighting trusses and roof beams overhead (climbable). Hunters enter from the stage door (backstage, south).
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import * as T from "../textures";
import * as C from "./tex/country";
import { Kit, type Mat, type World } from "./kit";

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
  flush() {
    for (const [m, l] of this.lists) if (l.length) this.k.merged(l, m, { noShadow: this.flags.get(m)?.noShadow });
    this.lists.clear();
  }
}
// ---------------------------------------------------------------------------------------------

type P = C.Pts;
const COW: P = [[0.08, 0.8], [0.25, 0.845], [0.45, 0.83], [0.62, 0.845], [0.7, 0.87], [0.755, 0.905], [0.77, 0.975], [0.8, 0.99], [0.815, 0.935],
  [0.84, 0.95], [0.855, 1.0], [0.875, 0.955], [0.93, 0.925], [0.975, 0.84], [1.0, 0.72], [0.995, 0.64], [0.95, 0.61], [0.9, 0.62], [0.85, 0.66], [0.8, 0.6], [0.755, 0.48],
  [0.75, 0.06], [0.745, 0.0], [0.685, 0.0], [0.68, 0.3], [0.645, 0.3], [0.64, 0.0], [0.58, 0.0], [0.585, 0.33],
  [0.46, 0.335], [0.42, 0.3], [0.385, 0.245], [0.345, 0.24], [0.315, 0.29], [0.3, 0.33],
  [0.285, 0.32], [0.28, 0.0], [0.22, 0.0], [0.215, 0.28], [0.19, 0.28], [0.185, 0.0], [0.125, 0.0], [0.12, 0.4],
  [0.09, 0.58], [0.075, 0.66], [0.045, 0.52], [0.035, 0.38], [0.005, 0.37], [0.015, 0.5], [0.05, 0.76]];
const HEN: P = [[0.05, 0.86], [0.12, 0.7], [0.18, 0.73], [0.26, 0.64], [0.45, 0.62], [0.57, 0.71], [0.6, 0.84], [0.62, 0.93], [0.66, 0.9], [0.69, 0.99], [0.73, 0.92], [0.77, 0.97], [0.8, 0.88],
  [0.84, 0.84], [0.97, 0.78], [0.85, 0.74], [0.84, 0.68], [0.8, 0.63], [0.77, 0.66], [0.76, 0.58], [0.8, 0.45], [0.74, 0.3], [0.62, 0.22], [0.58, 0.21], [0.58, 0.04], [0.64, 0.0], [0.52, 0.0],
  [0.54, 0.21], [0.44, 0.21], [0.42, 0.04], [0.47, 0.0], [0.36, 0.0], [0.38, 0.2], [0.25, 0.26], [0.12, 0.4], [0.02, 0.6], [0.0, 0.76]];
const PIG: P = [[0.08, 0.62], [0.15, 0.8], [0.35, 0.88], [0.6, 0.88], [0.72, 0.85], [0.76, 0.97], [0.83, 0.87], [0.9, 0.78], [0.97, 0.7], [1.0, 0.55], [0.97, 0.47], [0.9, 0.45],
  [0.86, 0.4], [0.82, 0.28], [0.8, 0.0], [0.72, 0.0], [0.71, 0.22], [0.64, 0.2], [0.63, 0.0], [0.55, 0.0], [0.54, 0.18], [0.36, 0.18], [0.35, 0.0], [0.27, 0.0], [0.26, 0.2], [0.2, 0.22],
  [0.19, 0.0], [0.11, 0.0], [0.1, 0.3], [0.05, 0.45], [0.0, 0.55], [0.02, 0.62]];
const BARN: P = [[0, 0], [0.31, 0], [0.31, 0.55], [0.69, 0.55], [0.69, 0], [1, 0], [1, 0.56], [0.9, 0.8], [0.5, 1], [0.1, 0.8], [0, 0.56]];
function treePts(): P {
  const p: P = [[0.43, 0], [0.57, 0], [0.56, 0.36]];
  for (let a = -62; a <= 242; a += 3) {
    const t = (a * Math.PI) / 180, rr = 0.9 + 0.1 * Math.abs(Math.sin(t * 5));
    p.push([0.5 + 0.48 * rr * Math.cos(t), 0.66 + 0.33 * rr * Math.sin(t)]);
  }
  p.push([0.44, 0.36]);
  return p;
}
/** outline from the upper/lower envelope of circles (clouds, bushes); returns normalised points + size */
function blobPts(circles: [number, number, number][], flatBottom: number | null): { pts: P; w: number; h: number } {
  const x0 = Math.min(...circles.map(([x, , r]) => x - r)) + 0.001, x1 = Math.max(...circles.map(([x, , r]) => x + r)) - 0.001;
  const top: [number, number][] = [], bot: [number, number][] = [];
  const N = 60;
  for (let i = 0; i <= N; i++) {
    const x = x0 + ((x1 - x0) * i) / N;
    let yt = -1e9, yb = 1e9;
    for (const [cx, cy, r] of circles) if (Math.abs(x - cx) < r) { const d = Math.sqrt(r * r - (x - cx) ** 2); yt = Math.max(yt, cy + d); yb = Math.min(yb, cy - d); }
    if (flatBottom !== null) yb = Math.max(yb, flatBottom);
    if (yt < yb) yt = yb + 0.01;
    top.push([x, yt]); bot.push([x, yb]);
  }
  const all = [...bot, ...top.reverse()];
  const ys = all.map((p) => p[1]);
  const y0 = Math.min(...ys), y1 = Math.max(...ys);
  return { pts: all.map(([x, y]) => [(x - x0) / (x1 - x0), (y - y0) / (y1 - y0)]), w: x1 - x0, h: y1 - y0 };
}
function starPts(n: number, inner: number): P {
  const p: P = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2, r = i % 2 ? inner : 1;
    p.push([0.5 + 0.5 * r * Math.cos(a), 0.5 + 0.5 * r * Math.sin(a)]);
  }
  return p;
}
/** ribbed pumpkin */
function pumpkinGeo(r: number) {
  const g = new THREE.SphereGeometry(r, 20, 12);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x);
    const s = 0.9 + 0.1 * Math.abs(Math.cos(a * 4));
    p.setXYZ(i, x * s, y * 0.72 - (Math.abs(y) < r * 0.2 ? 0 : 0), z * s);
  }
  g.computeVertexNormals();
  return g;
}

export function buildCountry(): World {
  const k = new Kit(11, 5.5);
  const B = new Batch(k);
  const rnd = C.rng(2024);
  const X0 = -17, X1 = 17, Z0 = -13, Z1 = 13, WH = 11;

  // ---------- materials ----------
  const ply = k.mat(k.tex("c-ply", () => C.plywood(1)), "#fff", [1, 1], { bump: 0.5, roughness: 0.8 });
  const lumber = k.mat(k.tex("c-lumber", () => C.lumber(3)), "#fff", [1, 1], { bump: 0.6 });
  const studioFloor = k.mat(k.tex("c-sfloor", C.studioFloor), "#fff", [1, 1], { roughness: 0.45, bump: 0.2 });
  const blackWall = k.mat(k.tex("c-black", C.blackWall), "#fff", [1, 1], { roughness: 0.95, bump: 0.3 });
  const mural = k.mat(k.tex("c-mural", () => C.skyMural(12)), "#fff", [1, 1], { roughness: 0.9, bump: 0.15 });
  const mural2 = k.mat(k.tex("c-mural2", () => C.skyMural(27)), "#fff", [1, 1], { roughness: 0.9, bump: 0.15 });
  const turf = k.mat(k.tex("c-turf", C.turf), "#fff", [1, 1], { roughness: 0.95, bump: 0.6 });
  const dirt = k.mat(k.tex("c-dirt", C.dirt), "#fff", [1, 1], { roughness: 1, bump: 0.8 });
  const soil = k.mat(k.tex("c-soil", C.soil), "#fff", [1, 1], { roughness: 1, bump: 0.9 });
  const straw = k.mat(k.tex("c-straw", () => C.straw(8, 0)), "#fff", [1, 1], { roughness: 1, bump: 1.1 });
  const strawLoose = k.mat(k.tex("c-straw2", () => C.straw(14, 0.8)), "#e8d6a0", [1, 1], { roughness: 1, bump: 0.9 });
  const baleEnd = k.mat(k.tex("c-baleend", C.baleEnd), "#fff", [1, 1], { roughness: 1, bump: 1.0 });
  const twine = k.mat(null, "#6b5a3a", [1, 1], { roughness: 0.9 });
  const barnBoards = k.mat(k.tex("c-barnb", () => C.barnBoards(5)), "#fff", [1, 1], { roughness: 0.75, bump: 0.7 });
  const whiteTrim = k.mat(k.tex("c-whiteb", () => C.boards("#efeadf", 6, 0.2)), "#fff", [1, 1], { roughness: 0.7, bump: 0.35 });
  const fenceWood = k.mat(k.tex("c-fence", () => C.boards("#b08a5c", 11, 0.6)), "#fff", [1, 1], { roughness: 0.85, bump: 0.8 });
  const coopWood = k.mat(k.tex("c-coop", () => C.boards("#e7c96a", 13, 0.35)), "#fff", [1, 1], { roughness: 0.8, bump: 0.5 });
  const greenWood = k.mat(k.tex("c-greenb", () => C.boards("#4f7d5a", 15, 0.4)), "#fff", [1, 1], { roughness: 0.8, bump: 0.5 });
  const bedWood = k.mat(k.tex("c-bedw", () => C.boards("#8a6440", 19, 0.5)), "#fff", [1, 1], { roughness: 0.85, bump: 0.9 });
  const crate = k.mat(k.tex("c-crate", () => C.crate(17)), "#fff", [1, 1], { roughness: 0.8, bump: 0.7 });
  const burlap = k.mat(k.tex("c-burlap", () => C.burlap()), "#fff", [1, 1], { roughness: 1, bump: 0.9 });
  const sandbag = k.mat(k.tex("c-sandbag", () => C.burlap("#5d5a4e", 73)), "#fff", [1, 1], { roughness: 1, bump: 0.8 });
  const galv = k.mat(k.tex("c-galv", C.galvanized), "#fff", [1, 1], { metalness: 0.85, roughness: 0.38, bump: 0.2 });
  const steel = k.mat(null, "#3b3d40", [1, 1], { metalness: 0.85, roughness: 0.4 });
  const trussMetal = k.mat(null, "#b8bcc0", [1, 1], { metalness: 0.9, roughness: 0.32 });
  const roofSteel = k.mat(null, "#2f3134", [1, 1], { metalness: 0.7, roughness: 0.55 });
  const roofDeck = k.mat(k.tex("c-deck", () => T.stripes(["#2a2b2e", "#1f2023"], true)), "#fff", [1, 1], { roughness: 0.8, bump: 0.6 });
  const lampBody = k.mat(null, "#1a1a1c", [1, 1], { metalness: 0.5, roughness: 0.5 });
  const lens = k.mat(null, "#fff4d6", [1, 1], { emissive: "#ffe7b0", emissiveIntensity: 3 });
  const softbox = k.mat(null, "#ffffff", [1, 1], { emissive: "#fff6e8", emissiveIntensity: 1.6 });
  const pumpkinA = k.mat(k.tex("c-pumpk", () => T.noise("#e8761c", 0.08, 5, 900)), "#fff", [1, 1], { roughness: 0.55, bump: 0.3 });
  const pumpkinB = k.mat(k.tex("c-pumpk", () => T.noise("#e8761c", 0.08, 5, 900)), "#ffb070", [1, 1], { roughness: 0.55, bump: 0.3 });
  const pumpkinW = k.mat(null, "#efe7d2", [1, 1], { roughness: 0.6 });
  const stem = k.mat(null, "#5a6b2e", [1, 1], { roughness: 0.8 });
  const leafy = k.mat(k.tex("c-leafy", () => C.leafy("#7db34c")), "#fff", [1, 1], { roughness: 0.7, bump: 0.5 });
  const leafyDark = k.mat(k.tex("c-leafy2", () => C.leafy("#3f7a2f", 93)), "#fff", [1, 1], { roughness: 0.7, bump: 0.5 });
  const carrot = k.mat(null, "#ef7a1a", [1, 1], { roughness: 0.6 });
  const tomato = k.mat(null, "#d8322a", [1, 1], { roughness: 0.35 });
  const apple = k.mat(null, "#b9272b", [1, 1], { roughness: 0.4 });
  const corn = k.mat(null, "#f2c53d", [1, 1], { roughness: 0.6 });
  const cornLeaf = k.mat(null, "#6f9a3a", [1, 1], { roughness: 0.7 });
  const cornStalk = k.mat(null, "#b3ae63", [1, 1], { roughness: 0.8 });
  const redPaint = k.mat(null, "#b3261e", [1, 1], { roughness: 0.5, metalness: 0.2 });
  const greenMetal = k.mat(null, "#2f6b3b", [1, 1], { roughness: 0.45, metalness: 0.5 });
  const rubber = k.mat(null, "#1b1b1b", [1, 1], { roughness: 0.9 });
  const canvasBlack = k.mat(k.tex("c-canvas", () => C.burlap("#2a2a2a", 75)), "#fff", [1, 1], { roughness: 0.95, bump: 0.4 });
  const flight = k.mat(k.tex("c-flight", C.flightCase), "#fff", [1, 1], { roughness: 0.6, bump: 0.3 });
  const tapeY = k.mat(null, "#e6c229", [1, 1], { roughness: 0.6 });
  const tapeW = k.mat(null, "#e8e8e8", [1, 1], { roughness: 0.6 });
  const water = k.mat(null, "#6d8f9a", [1, 1], { roughness: 0.08, metalness: 0.3 });
  const plaid = k.mat(k.tex("c-plaid", () => T.checker("#b3261e", "#5a1410", 8)), "#fff", [1, 1], { roughness: 0.9, bump: 0.3 });
  const denim = k.mat(k.tex("c-denim", () => T.noise("#3e5a86", 0.12, 7, 1800)), "#fff", [1, 1], { roughness: 0.9, bump: 0.4 });
  const hatStraw = k.mat(k.tex("c-hat", () => C.straw(21, 1.57)), "#f0dc9a", [1, 1], { roughness: 1, bump: 0.6 });
  const awning = k.mat(k.tex("c-awning", () => T.stripes(["#d23b33", "#f5f1e6"], true)), "#fff", [1, 1], { roughness: 0.85, bump: 0.2 });
  const onAir = k.mat(null, "#ff3030", [1, 1], { emissive: "#ff2020", emissiveIntensity: 2.5 });
  const screen = k.mat(k.tex("c-screen", () => C.skyMural(40)), "#fff", [1, 1], { emissive: "#ffffff", emissiveIntensity: 0.8, bump: 0 });
  const signFresh = k.mat(k.tex("c-sfresh", () => C.signText("FRESH", "#f5ecd2", "#2f6b3b")), "#fff", [1, 1], { roughness: 0.8, bump: 0.2 });
  const signStage = k.mat(k.tex("c-sstage", () => C.signText("STAGE 4", "#e6c229", "#151515")), "#fff", [1, 1], { roughness: 0.6, bump: 0.1 });
  const signBack = k.mat(k.tex("c-sback", () => C.signText("BARN - A", "#d8b886", "#3a2a18", 256, 96, "bold 44px monospace")), "#fff", [1, 1], { roughness: 0.8, bump: 0.2 });
  const clapperM = k.mat(k.tex("c-clap", C.clapper), "#fff", [1, 1], { roughness: 0.6, bump: 0 });
  const paintCan = k.mat(null, "#9aa0a6", [1, 1], { metalness: 0.8, roughness: 0.35 });
  const blueTarp = k.mat(k.tex("c-tarp", () => T.noise("#2f5fa8", 0.1, 9, 1200)), "#fff", [1, 1], { roughness: 0.6, bump: 0.4 });
  const cable = k.mat(null, "#111", [1, 1], { roughness: 0.7 });
  const chain = k.mat(null, "#6b6e72", [1, 1], { metalness: 0.9, roughness: 0.4 });
  const ladderAl = k.mat(null, "#c4c8cc", [1, 1], { metalness: 0.8, roughness: 0.35 });
  const orangeCase = k.mat(null, "#d9661e", [1, 1], { roughness: 0.5 });
  const cream = k.mat(null, "#efe6cf", [1, 1], { roughness: 0.6 });
  B.opt(lens, { noShadow: true });
  B.opt(softbox, { noShadow: true });
  B.opt(mural, { noShadow: true });
  B.opt(mural2, { noShadow: true });
  B.opt(blackWall, { noShadow: true });
  B.opt(roofDeck, { noShadow: true });
  B.opt(roofSteel, { noShadow: true });
  B.opt(turf, { noShadow: true });
  B.opt(dirt, { noShadow: true });
  B.opt(tapeY, { noShadow: true });
  B.opt(tapeW, { noShadow: true });

  // standee art materials
  const cowM = k.mat(k.tex("c-cowart", () => C.cowArt(COW)), "#fff", [1, 1], { roughness: 0.7, bump: 0.25 });
  const henM = k.mat(k.tex("c-henart", () => C.chickenArt(HEN, true)), "#fff", [1, 1], { roughness: 0.7, bump: 0.25 });
  const roosterM = k.mat(k.tex("c-roosart", () => C.chickenArt(HEN, false)), "#fff", [1, 1], { roughness: 0.7, bump: 0.25 });
  const TREE = treePts();
  const treeM = k.mat(k.tex("c-treeart", () => C.treeArt(TREE, 1, false)), "#fff", [1, 1], { roughness: 0.75, bump: 0.25 });
  const appleTreeM = k.mat(k.tex("c-atreeart", () => C.treeArt(TREE, 4, true)), "#fff", [1, 1], { roughness: 0.75, bump: 0.25 });
  const CLOUD = blobPts([[-0.95, 0.45, 0.42], [-0.4, 0.72, 0.6], [0.3, 0.78, 0.64], [0.95, 0.5, 0.46], [0.0, 0.35, 0.4]], 0.18);
  const cloudM = k.mat(k.tex("c-cloudart", () => C.cloudArt(CLOUD.pts)), "#fff", [1, 1], { roughness: 0.85, bump: 0.2 });
  const CLOUD2 = blobPts([[-0.6, 0.4, 0.4], [0.0, 0.62, 0.55], [0.62, 0.42, 0.42]], 0.12);
  const cloud2M = k.mat(k.tex("c-cloudart2", () => C.cloudArt(CLOUD2.pts)), "#fff", [1, 1], { roughness: 0.85, bump: 0.2 });
  const SUN = starPts(12, 0.74);
  const sunM = k.mat(k.tex("c-sunart", () => C.sunArt(SUN)), "#fff", [1, 1], { roughness: 0.7, bump: 0.2 });
  const BUSH = blobPts([[-0.7, 0.3, 0.38], [-0.2, 0.5, 0.5], [0.4, 0.45, 0.48], [0.9, 0.28, 0.34]], 0);
  const bushM = k.mat(k.tex("c-bushart", () => C.bushArt(BUSH.pts)), "#fff", [1, 1], { roughness: 0.8, bump: 0.25 });
  const pigM = k.mat(k.tex("c-pigart", () => C.pigArt(PIG)), "#fff", [1, 1], { roughness: 0.7, bump: 0.25 });
  const barnM = k.mat(k.tex("c-barnart", () => C.barnFrontArt(BARN)), "#fff", [1, 1], { roughness: 0.72, bump: 0.45 });

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

  /** plywood cut-out standee: painted front, raw ply edge + back, optional 2x4 braces with sandbags */
  const cutout = (pts: P, art: Mat, W: number, H: number, x: number, z: number, ry: number, o: { y?: number; braces?: boolean; both?: boolean; th?: number; solid?: boolean; flip?: boolean } = {}) => {
    const th = o.th ?? 0.03, y = o.y ?? 0;
    const sx = o.flip ? -1 : 1;
    const shape = new THREE.Shape(pts.map(([u, v]) => new THREE.Vector2((u - 0.5) * W * sx, v * H)));
    const body = new THREE.ExtrudeGeometry(shape, { depth: th, bevelEnabled: false, curveSegments: 4 });
    body.translate(0, 0, -th / 2);
    B.geo(ply, body, x, y, z, { ry, su: 1 / 1.2, sv: 1 / 1.2 });
    const face = (back: boolean) => {
      const f = new THREE.ShapeGeometry(shape, 4);
      const uv = f.attributes.uv, p = f.attributes.position;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) * sx) / W + 0.5, p.getY(i) / H);
      if (back) f.rotateY(Math.PI);
      f.translate(0, 0, back ? -th / 2 - 0.003 : th / 2 + 0.003);
      B.geo(art, f, x, y, z, { ry });
    };
    face(false);
    if (o.both) face(true);
    if (o.solid !== false) {
      const [ax, az] = loc(x, z, ry, -W / 2, 0), [bx, bz] = loc(x, z, ry, W / 2, 0);
      lineCol(ax, az, bx, bz, 0.12, y, y + H);
    }
    if (o.braces !== false && y === 0) {
      const n = Math.max(1, Math.round(W / 1.6));
      for (let i = 0; i < n; i++) {
        const lx = n === 1 ? 0 : (-W / 2 + W * 0.2) + ((W * 0.6) / (n - 1)) * i;
        const sh = H * 0.72, d = Math.min(1.1, sh * 0.55), lz = -th / 2 - 0.045;
        const [px, pz] = loc(x, z, ry, lx, lz);
        B.box(lumber, 0.045, sh, 0.09, px, 0, pz, { ry, uv: 0.8 });
        const ang = Math.atan2(d, sh * 0.85);
        const L = Math.hypot(d, sh * 0.85);
        const [kx, kz] = loc(x, z, ry, lx + 0.05, lz - d / 2 - 0.02);
        B.geo(lumber, new THREE.BoxGeometry(0.045, L, 0.09), kx, (sh * 0.85) / 2, kz, { ry, rx: ang, uv: 0.8 });
        const [fx, fz] = loc(x, z, ry, lx, lz - d - 0.1);
        B.geo(sandbag, new RoundedBoxGeometry(0.5, 0.16, 0.3, 2, 0.07), fx, 0.08, fz, { ry: ry + 0.2, uv: 0.5 });
      }
    }
  };

  // ---------- shell: studio walls, floor, murals, roof ----------
  k.floor(X0, X1, Z0, Z1, studioFloor, 3);
  const doorX = -6, doorW = 5.2, doorH = 5.6;
  B.box(blackWall, 41, WH, 0.3, 0, 0, Z0 - 0.15, { flat: true, uv: 3, world: true });
  B.box(blackWall, 0.3, WH, 30.6, X0 - 0.15, 0, 0, { flat: true, uv: 3, world: true });
  B.box(blackWall, 0.3, WH, 30.6, X1 + 0.15, 0, 0, { flat: true, uv: 3, world: true });
  // south wall with the stage door
  const sw1 = doorX - doorW / 2 - X0, sw2 = X1 - (doorX + doorW / 2);
  B.box(blackWall, sw1, WH, 0.3, X0 + sw1 / 2, 0, Z1 + 0.15, { flat: true, uv: 3, world: true });
  B.box(blackWall, sw2, WH, 0.3, X1 - sw2 / 2, 0, Z1 + 0.15, { flat: true, uv: 3, world: true });
  B.box(blackWall, doorW, WH - doorH, 0.3, doorX, doorH, Z1 + 0.15, { flat: true, uv: 3, world: true });
  k.collider(X0 - 1, X1 + 1, Z1, Z1 + 1, 0, WH, false);
  k.collider(X0 - 1, X1 + 1, Z0 - 1, Z0, 0, WH, false);
  k.collider(X0 - 1, X0, Z0, Z1, 0, WH, false);
  k.collider(X1, X1 + 1, Z0, Z1, 0, WH, false);
  // dark corridor beyond the door + sliding door leaf (half open)
  B.box(blackWall, doorW + 1, doorH + 0.5, 0.2, doorX, 0, Z1 + 3.2, { flat: true, uv: 3, world: true });
  B.box(blackWall, 0.2, doorH + 0.5, 3, doorX - doorW / 2 - 0.3, 0, Z1 + 1.7, { flat: true, uv: 3, world: true });
  B.box(blackWall, 0.2, doorH + 0.5, 3, doorX + doorW / 2 + 0.3, 0, Z1 + 1.7, { flat: true, uv: 3, world: true });
  const doorLeaf = k.mat(k.tex("c-doorleaf", () => T.shutter()), "#8a8f94", [1, 1], { metalness: 0.6, roughness: 0.5, bump: 0.5 });
  B.box(doorLeaf, 3.4, doorH + 0.2, 0.12, doorX + doorW / 2 + 0.3, 0, Z1 - 0.12, { flat: true, uv: 1.2 });
  B.box(steel, 9, 0.15, 0.15, doorX + 1.5, doorH + 0.3, Z1 - 0.12, { flat: true });
  B.box(steel, 0.2, doorH, 0.2, doorX - doorW / 2 - 0.1, 0, Z1 - 0.05, { flat: true });
  B.box(steel, 0.2, doorH, 0.2, doorX + doorW / 2 + 0.1, 0, Z1 - 0.05, { flat: true });
  B.box(tapeY, doorW, 0.01, 0.12, doorX, 0, Z1 - 0.3, { flat: true });
  // STAGE sign + ON AIR light above the door
  k.panel(1.8, 0.64, doorX, doorH + 0.9, Z1 - 0.01, signStage, Math.PI);
  B.box(lampBody, 0.8, 0.32, 0.14, doorX + 2.3, doorH + 0.75, Z1 - 0.07, { flat: true });
  B.box(onAir, 0.7, 0.24, 0.02, doorX + 2.3, doorH + 0.79, Z1 - 0.15, { flat: true });
  // murals: north full, west/east over the set area (z < 9)
  const muralPlane = (m: Mat, w: number, h: number, x: number, z: number, ry: number, u: number) => {
    const g = new THREE.PlaneGeometry(w, h);
    scaleUV(g, u, 1);
    B.geo(m, g, x, h / 2, z, { ry });
  };
  muralPlane(mural, 40, 9, 0, Z0 + 0.01, 0, 2);
  muralPlane(mural2, 24, 9, X0 + 0.01, -3, Math.PI / 2, 1.2);
  muralPlane(mural, 24, 9, X1 - 0.01, -3, -Math.PI / 2, 1.2);
  // mural flats' top batten + floor kick board
  B.box(lumber, 40, 0.14, 0.06, 0, 9, Z0 + 0.04, { flat: true, uv: 1 });
  B.box(lumber, 0.06, 0.14, 24, X0 + 0.04, 9, -3, { flat: true, uv: 1 });
  B.box(lumber, 0.06, 0.14, 24, X1 - 0.04, 9, -3, { flat: true, uv: 1 });
  // roof: steel deck + I-beams + purlins
  k.ceiling(X0, X1, Z0, Z1, roofDeck, WH, 1.2);
  for (let x = -17.5; x <= 17.6; x += 5) {
    B.box(roofSteel, 0.3, 0.04, 30, x, WH - 0.62, 0, { flat: true });
    B.box(roofSteel, 0.3, 0.04, 30, x, WH - 0.06, 0, { flat: true });
    B.box(roofSteel, 0.03, 0.54, 30, x, WH - 0.58, 0, { flat: true });
  }
  for (let z = -12; z <= 12.1; z += 6) B.box(roofSteel, 40, 0.16, 0.12, 0, WH - 0.2, z, { flat: true });

  // ---------- floors: turf set area, dirt paths, backstage tape marks ----------
  const SETZ = 9.2;
  B.box(turf, 39.9, 0.03, SETZ - Z0, 0, 0, (Z0 + SETZ) / 2, { flat: true, uv: 2.2, world: true });
  // turf seams (rolls)
  for (let x = -16; x <= 16; x += 4) B.box(dirt, 0.02, 0.031, SETZ - Z0, x, 0, (Z0 + SETZ) / 2, { flat: true });
  const path = (x1: number, z1: number, x2: number, z2: number, w: number) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    B.geo(dirt, new THREE.BoxGeometry(w, 0.02, len), (x1 + x2) / 2, 0.04, (z1 + z2) / 2, { ry: Math.atan2(x2 - x1, z2 - z1), uv: 2, world: true });
  };
  path(-6, 9.2, -2, 2, 2.6);
  path(-2, 2, 1, -9.4, 2.6);
  path(-18.5, 1.2, 18.5, 1.2, 2.4);
  B.geo(dirt, new THREE.CylinderGeometry(4.2, 4.2, 0.02, 32), 0, 0.045, 0.6, { uv: 2, world: true });
  // backstage gaffer tape: marks + edge line of the set
  B.box(tapeW, 39.8, 0.005, 0.06, 0, 0, SETZ + 0.05, { flat: true });
  for (const [x, z] of [[-1, 11.5], [3, 12.2], [7.5, 11], [-12, 11.8], [11, 12.8]]) {
    B.box(tapeY, 0.35, 0.005, 0.06, x, 0, z, { flat: true, ry: 0.4 });
    B.box(tapeY, 0.35, 0.005, 0.06, x, 0, z, { flat: true, ry: 0.4 + Math.PI / 2 });
  }

  // ---------- small prop builders ----------
  const bale = (x: number, y: number, z: number, ry = 0) => {
    const w = 1.0, h = 0.45, d = 0.5;
    B.geo(straw, new RoundedBoxGeometry(w, h, d, 2, 0.06), x, y + h / 2, z, { ry, uv: 0.9 });
    for (const t of [-0.28, 0.28]) {
      const [tx, tz] = loc(x, z, ry, t, 0);
      B.geo(twine, new THREE.BoxGeometry(0.025, h + 0.012, d + 0.012), tx, y + h / 2, tz, { ry });
    }
    const c = Math.abs(Math.cos(ry)) > 0.7;
    const hw = (c ? w : d) / 2, hd = (c ? d : w) / 2;
    k.collider(x - hw, x + hw, z - hd, z + hd, y, y + h, true);
  };
  const roundBale = (x: number, z: number, ry: number, standing = false) => {
    const r = 0.72, L = 1.2;
    const side = new THREE.CylinderGeometry(r, r, L, 24, 1, true);
    const c1 = new THREE.CircleGeometry(r * 0.99, 24), c2 = new THREE.CircleGeometry(r * 0.99, 24);
    c1.rotateX(-Math.PI / 2); c1.translate(0, L / 2, 0);
    c2.rotateX(Math.PI / 2); c2.translate(0, -L / 2, 0);
    scaleUV(side, 4, 1.2);
    const o = standing ? { ry } : { ry, rx: Math.PI / 2 };
    const cy = standing ? L / 2 : r;
    B.geo(straw, side, x, cy, z, o);
    B.geo(baleEnd, c1, x, cy, z, o);
    B.geo(baleEnd, c2, x, cy, z, o);
    const hx = standing ? r : Math.abs(Math.cos(ry)) > 0.7 ? r : L / 2;
    const hz = standing ? r : Math.abs(Math.cos(ry)) > 0.7 ? L / 2 : r;
    k.collider(x - hx * 0.9, x + hx * 0.9, z - hz * 0.9, z + hz * 0.9, 0, standing ? L : r * 2, true);
  };
  const fence = (x1: number, z1: number, x2: number, z2: number, m = fenceWood) => {
    const len = Math.hypot(x2 - x1, z2 - z1), ry = Math.atan2(x2 - x1, z2 - z1) - Math.PI / 2;
    const n = Math.max(1, Math.round(len / 2));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      B.box(m, 0.11, 1.15, 0.11, x1 + (x2 - x1) * t, 0, z1 + (z2 - z1) * t, { ry, uv: 0.6 });
    }
    for (const y of [0.35, 0.7, 1.0]) B.geo(m, new THREE.BoxGeometry(len, 0.12, 0.035), (x1 + x2) / 2, y, (z1 + z2) / 2, { ry, uv: 0.8 });
    lineCol(x1, z1, x2, z2, 0.14, 0, 1.15);
  };
  const crateBox = (x: number, y: number, z: number, ry: number, fill: Mat | null, w = 0.6, h = 0.34, d = 0.42) => {
    B.box(crate, w, h, d, x, y, z, { ry, uv: 0.34 });
    if (fill) {
      for (let i = 0; i < 6; i++) {
        const [fx, fz] = loc(x, z, ry, (i % 3 - 1) * w * 0.3, (Math.floor(i / 3) - 0.5) * d * 0.45);
        B.geo(fill, new THREE.SphereGeometry(0.075, 10, 8), fx, y + h + 0.02, fz);
      }
    }
    const c = Math.abs(Math.cos(ry)) > 0.7;
    k.collider(x - (c ? w : d) / 2, x + (c ? w : d) / 2, z - (c ? d : w) / 2, z + (c ? d : w) / 2, y, y + h, true);
  };
  const pumpkin = (x: number, z: number, r: number, m: Mat, y = 0) => {
    B.geo(m, pumpkinGeo(r), x, y + r * 0.7, z, { ry: rnd() * 3 });
    B.cyl(stem, 0.02 + r * 0.04, 0.035 + r * 0.06, r * 0.35, x, y + r * 1.3, z, { seg: 6, rz: (rnd() - 0.5) * 0.5 });
    if (r > 0.28) k.collider(x - r * 0.85, x + r * 0.85, z - r * 0.85, z + r * 0.85, y, y + r * 1.4, true);
  };
  const sack = (x: number, z: number, ry: number, y = 0, m = burlap) => {
    const g = new THREE.SphereGeometry(0.3, 14, 10);
    g.scale(1, 1.35, 0.7);
    B.geo(m, g, x, y + 0.38, z, { ry, uv: 0.4 });
    B.cyl(m, 0.06, 0.13, 0.14, x, y + 0.72, z, { seg: 8 });
    k.collider(x - 0.28, x + 0.28, z - 0.28, z + 0.28, y, y + 0.85, false);
  };
  const milkCan = (x: number, z: number) => {
    B.geo(galv, new THREE.LatheGeometry([[0, 0], [0.17, 0], [0.18, 0.02], [0.18, 0.45], [0.15, 0.52], [0.09, 0.58], [0.09, 0.66], [0.11, 0.67], [0.11, 0.7], [0, 0.72]].map(([a, b]) => new THREE.Vector2(a, b)), 20), x, 0, z);
    k.collider(x - 0.18, x + 0.18, z - 0.18, z + 0.18, 0, 0.72, false);
  };
  const tool = (kind: "fork" | "shovel" | "rake", x: number, z: number, ry: number, lean: number) => {
    const L = 1.5;
    const [hx, hz] = loc(x, z, ry, 0, 0);
    B.geo(lumber, new THREE.CylinderGeometry(0.018, 0.018, L, 6), hx, L / 2 * Math.cos(lean) + 0.05, hz, { ry, rx: lean, su: 0.1 });
    // head at the bottom end
    const bx = hx - Math.sin(ry) * Math.sin(lean) * 0, bz = hz;
    if (kind === "shovel") B.geo(steel, new THREE.BoxGeometry(0.22, 0.28, 0.02), bx, 0.16, bz, { ry, rx: lean });
    else if (kind === "fork") for (let i = -1; i <= 1; i++) B.geo(steel, new THREE.CylinderGeometry(0.008, 0.004, 0.3, 4), bx + Math.cos(ry) * i * 0.05, 0.16, bz - Math.sin(ry) * i * 0.05, { ry, rx: lean });
    else B.geo(steel, new THREE.BoxGeometry(0.4, 0.04, 0.05), bx, 0.08, bz, { ry, rx: lean });
  };
  const fresnel = (x: number, y: number, z: number, ry: number, tilt: number) => {
    // hanging stage light: clamp, yoke, can, lens
    B.box(lampBody, 0.08, 0.2, 0.08, x, y - 0.2, z, { flat: true });
    B.geo(lampBody, new THREE.TorusGeometry(0.2, 0.018, 6, 12, Math.PI), x, y - 0.22, z, { ry, rx: Math.PI });
    const can = new THREE.CylinderGeometry(0.15, 0.17, 0.42, 14);
    B.geo(lampBody, can, x, y - 0.42, z, { ry, rx: tilt });
    const l = new THREE.CircleGeometry(0.14, 14);
    l.rotateX(Math.PI / 2);
    l.translate(0, -0.215, 0);
    B.geo(lens, l, x, y - 0.42, z, { ry, rx: tilt });
  };
  const truss = (x1: number, z1: number, x2: number, z2: number, y: number) => {
    // 4-chord box truss (0.4 m) with zig-zag lacing; standable collider on top
    const s = 0.2, along = Math.abs(x2 - x1) > Math.abs(z2 - z1);
    const len = along ? Math.abs(x2 - x1) : Math.abs(z2 - z1);
    const P = (t: number, a: number, b: number): [number, number, number] =>
      along ? [Math.min(x1, x2) + t, y + b, z1 + a] : [x1 + a, y + b, Math.min(z1, z2) + t];
    const corners: [number, number][] = [[-s, 0], [s, 0], [s, 2 * s], [-s, 2 * s]];
    for (const [a, b] of corners) B.rod(trussMetal, 0.025, P(0, a, b), P(len, a, b), 8);
    const step = 0.5;
    for (let t = 0; t < len - 0.01; t += step) {
      for (let f = 0; f < 4; f++) {
        const [a1, b1] = corners[f], [a2, b2] = corners[(f + 1) % 4];
        B.rod(trussMetal, 0.011, P(t, a1, b1), P(t + step, a2, b2), 5);
      }
    }
    if (along) k.collider(Math.min(x1, x2), Math.max(x1, x2), z1 - s, z1 + s, y, y + 2 * s, true);
    else k.collider(x1 - s, x1 + s, Math.min(z1, z2), Math.max(z1, z2), y, y + 2 * s, true);
  };

  // ---------- lighting rig: trusses, chain hoists, fresnels ----------
  const TY = 7.6;
  for (const z of [-8, -1, 6]) truss(X0 + 0.2, z, X1 - 0.2, z, TY);
  for (const x of [-10, 10]) truss(x, Z0 + 0.3, x, 11.5, TY + 0.42);
  for (const z of [-8, -1, 6]) for (const x of [-15, -5, 5, 15]) {
    B.rod(chain, 0.015, [x, TY + 0.4, z], [x, WH - 0.62, z], 4);
    B.box(steel, 0.18, 0.28, 0.14, x, TY + 1.6, z, { flat: true });
  }
  const lampSpots: [number, number, number, number][] = [];
  for (const z of [-8, -1, 6]) for (let x = -17; x <= 17; x += 4.25) {
    const ry = rnd() * 0.6 - 0.3 + (z > 0 ? Math.PI : 0);
    fresnel(x + (rnd() - 0.5), TY, z + 0.3, ry, 0.35 + rnd() * 0.3);
    lampSpots.push([x, TY - 0.6, z, ry]);
  }
  // cables draped along the trusses
  for (const z of [-8, -1, 6]) B.geo(cable, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 12 }, (_, i) => new THREE.Vector3(-19 + i * 3.45, TY - 0.05 - (i % 2) * 0.18, z - 0.25))), 60, 0.02, 5), 0, 0, 0);

  // ---------- BARN façade (north centre) with red barn doors ----------
  const BW = 11, BH = 8, BZ = -9.5;
  cutout(BARN, barnM, BW, BH, 0, BZ, 0, { braces: false, th: 0.05 });
  // 3D trim around the door opening and eaves
  B.box(whiteTrim, 0.18, 4.45, 0.08, -2.17, 0, BZ + 0.06, { uv: 1 });
  B.box(whiteTrim, 0.18, 4.45, 0.08, 2.17, 0, BZ + 0.06, { uv: 1 });
  B.box(whiteTrim, 4.52, 0.2, 0.08, 0, 4.35, BZ + 0.06, { uv: 1 });
  // sliding track + two red door leaves (left closed, right slid open)
  B.box(steel, 8.6, 0.1, 0.08, 0.8, 4.62, BZ + 0.16, { flat: true });
  const barnDoor = (cx: number) => {
    const w = 2.12, h = 4.3, z = BZ + 0.22;
    B.box(barnBoards, w, h, 0.07, cx, 0.03, z, { uv: 1.4 });
    for (const [bw, bh, bx, by] of [[w, 0.16, 0, h - 0.16], [w, 0.16, 0, 0.03], [w, 0.16, 0, h / 2 - 0.08], [0.16, h, -w / 2 + 0.08, 0.03], [0.16, h, w / 2 - 0.08, 0.03]] as const)
      B.box(whiteTrim, bw, bh, 0.05, cx + bx, by, z + 0.055, { uv: 1 });
    for (const s of [0, 1]) {
      const d = Math.hypot(w - 0.2, h / 2 - 0.2), a = Math.atan2(w - 0.2, h / 2 - 0.2);
      B.geo(whiteTrim, new THREE.BoxGeometry(0.14, d, 0.045), cx, 0.1 + h / 4 + s * (h / 2 - 0.1), z + 0.055, { rz: a, uv: 1 });
    }
    for (const s of [-1, 1]) B.cyl(steel, 0.06, 0.06, 0.05, cx + s * 0.7, 4.52, z, { rx: Math.PI / 2, seg: 10 });
    B.box(steel, 0.04, 0.35, 0.04, cx + (cx < 0 ? w / 2 - 0.25 : -w / 2 + 0.25), 1.8, z + 0.1, {});
    k.collider(cx - w / 2, cx + w / 2, z - 0.05, z + 0.05, 0, h, false);
  };
  barnDoor(-1.06);
  barnDoor(3.4);
  // hayloft beam + pulley (real prop) poking out of the gable
  B.box(lumber, 0.16, 0.2, 1.4, 0, 7.2, BZ + 0.6, {});
  B.cyl(steel, 0.12, 0.12, 0.05, 0, 6.95, BZ + 1.15, { rz: Math.PI / 2, seg: 12 });
  B.rod(twine, 0.012, [0.05, 6.95, BZ + 1.15], [0.05, 3.4, BZ + 1.15], 4);
  // behind the set: studs, walers, kickers, sandbags (visible "movie set" construction)
  const bz = BZ - 0.08;
  for (let x = -5.3; x <= 5.31; x += 1.2) {
    const topAt = Math.abs(x) < 2.1 ? null : x;
    const hh = Math.abs(x) < 4.4 ? (Math.abs(x) < 0.6 ? 7.6 : 7.0 - Math.abs(x) * 0.25) : 4.4;
    if (topAt !== null) B.box(lumber, 0.045, hh, 0.09, x, 0, bz, { uv: 0.8 });
    else B.box(lumber, 0.045, hh - 4.45, 0.09, x, 4.45, bz, { uv: 0.8 });
  }
  for (const y of [1.3, 3.0]) {
    B.box(lumber, 3.3, 0.09, 0.045, -3.85, y, bz - 0.06, { uv: 0.8 });
    B.box(lumber, 3.3, 0.09, 0.045, 3.85, y, bz - 0.06, { uv: 0.8 });
  }
  B.box(lumber, 10.6, 0.09, 0.045, 0, 4.6, bz - 0.06, { flat: true, uv: 0.8 });
  B.box(lumber, 8, 0.09, 0.045, 0, 6.2, bz - 0.06, { flat: true, uv: 0.8 });
  for (const x of [-4.7, -3.1, 3.1, 4.7]) {
    const sh = 4.2, d = 2.2, ang = Math.atan2(d, sh);
    B.geo(lumber, new THREE.BoxGeometry(0.045, Math.hypot(d, sh), 0.09), x, sh / 2, bz - 0.12 - d / 2, { rx: -ang, uv: 0.8 });
    B.geo(sandbag, new RoundedBoxGeometry(0.5, 0.16, 0.3, 2, 0.07), x, 0.08, bz - 0.2 - d, { ry: 0.3, uv: 0.5 });
    B.geo(sandbag, new RoundedBoxGeometry(0.5, 0.16, 0.3, 2, 0.07), x + 0.1, 0.22, bz - 0.15 - d, { ry: -0.2, uv: 0.5 });
  }
  k.panel(1.2, 0.45, -3.8, 2.2, bz - 0.09, signBack, Math.PI);
  // backstage of the barn: hay storage, spare flats, ladder, paint cans, tarp
  for (const [x, z, y, r] of [[-4.2, -14, 0, 0], [-3.2, -14, 0, 0], [-3.7, -14, 0.45, 0.05], [-2.2, -14.1, 0, 0], [-1.2, -14.1, 0, 0], [-1.7, -14.1, 0.45, 0], [-2.7, -14.05, 0.9, 0.1]] as const) bale(x, y, z, r);
  roundBale(3.4, -13.6, 0);
  roundBale(4.9, -12.4, Math.PI / 2, true);
  for (let i = 0; i < 3; i++) {
    B.geo(ply, new THREE.BoxGeometry(2.4, 1.2, 0.02), 1.2 + i * 0.07, 1.2, -14.6 + i * 0.1, { rx: 0.25 - i * 0.05, rz: Math.PI / 2, uv: 1.2 });
  }
  k.collider(0.8, 1.6, -14.9, -14.2, 0, 2.4, false);
  // A-frame ladder
  const ladder = (x: number, z: number, ry: number, h = 2.4) => {
    const sp = 0.35, a = 0.24;
    for (const s of [-1, 1]) for (const side of [-1, 1]) {
      const [lx, lz] = loc(x, z, ry, side * 0.25, s * sp);
      B.geo(ladderAl, new THREE.BoxGeometry(0.05, h, 0.03), lx, h / 2 * Math.cos(a), lz, { ry, rx: -s * a });
    }
    for (let y = 0.3; y < h - 0.2; y += 0.3) for (const s of [-1, 1]) {
      const off = sp - (y / Math.cos(a)) * Math.sin(a) * 1.0;
      const [lx, lz] = loc(x, z, ry, 0, s * Math.max(0.03, off));
      B.geo(ladderAl, new THREE.BoxGeometry(0.5, 0.03, 0.06), lx, y, lz, { ry });
    }
    k.collider(x - 0.4, x + 0.4, z - 0.4, z + 0.4, 0, h, false);
  };
  ladder(-0.2, -12.4, 0.2);
  B.geo(blueTarp, new RoundedBoxGeometry(2.0, 0.5, 1.2, 2, 0.2), 1.8, 0.25, -11.4, { ry: 0.1, uv: 1 });
  k.collider(0.8, 2.8, -12.0, -10.8, 0, 0.5, true);
  for (let i = 0; i < 5; i++) B.cyl(paintCan, 0.1, 0.1, 0.19, -4.6 + (i % 3) * 0.24, 0, -11.2 + Math.floor(i / 3) * 0.24, { seg: 12 });

  // in front of the barn: hay bales, milk cans, bushes, wheelbarrow with pumpkins, tools
  for (const [x, z, y, r] of [[-4.6, -8.5, 0, 0], [-4.6, -8.5, 0.45, 0.1], [-3.4, -8.4, 0, 0.05], [5.2, -8.6, 0, Math.PI / 2], [4.5, -7.9, 0, 0]] as const) bale(x, y, z, r);
  milkCan(-2.8, -8.8); milkCan(-2.45, -8.6); milkCan(-2.65, -8.25);
  cutout(BUSH.pts, bushM, BUSH.w * 0.9, BUSH.h * 0.9, -6.6, -8.9, 0.1);
  cutout(BUSH.pts, bushM, BUSH.w * 0.8, BUSH.h * 0.8, 6.8, -9, -0.15, { flip: true });
  tool("fork", -5.4, -9.25, 0, -0.18);
  tool("shovel", -5.0, -9.25, 0, -0.2);
  tool("rake", 5.9, -9.25, 0, -0.17);

  // big hay stack (climbable pyramid) east of the barn
  for (let i = 0; i < 4; i++) bale(8.2 + i * 1.02, 0, -10.4, 0);
  for (let i = 0; i < 4; i++) bale(8.2 + i * 1.02, 0, -9.88, 0);
  for (let i = 0; i < 3; i++) bale(8.7 + i * 1.02, 0.45, -10.2, 0.03);
  for (let i = 0; i < 2; i++) bale(9.2 + i * 1.02, 0.9, -10.2, -0.04);
  bale(9.7, 1.35, -10.15, 0.1);

  // ---------- CHICKEN COOP (north-west) ----------
  fence(-18.8, -5, -12.5, -5);
  fence(-10.5, -5, -9.5, -5);
  fence(-9.5, -5, -9.5, -13.8);
  // coop hut on legs with pitched roof and ramp
  const cx = -15.5, cz = -11.5;
  for (const [lx, lz] of [[-0.85, -0.6], [0.85, -0.6], [-0.85, 0.6], [0.85, 0.6]]) B.box(lumber, 0.1, 0.55, 0.1, cx + lx, 0, cz + lz, { uv: 0.6 });
  B.box(coopWood, 1.9, 1.15, 1.3, cx, 0.55, cz, { uv: 0.9 });
  B.box(whiteTrim, 1.96, 0.08, 1.36, cx, 0.55, cz, { uv: 1 });
  for (const s of [-1, 1]) B.geo(redPaint, new THREE.BoxGeometry(2.2, 0.05, 0.95), cx, 1.93, cz + s * 0.38, { rx: s * 0.6 });
  B.geo(redPaint, new THREE.BoxGeometry(1.95, 0.5, 1.28), cx, 1.83, cz, { flat: true } as BO);
  B.box(rubber, 0.36, 0.44, 0.02, cx + 0.4, 0.6, cz + 0.66, { flat: true });
  B.geo(lumber, new THREE.BoxGeometry(0.34, 0.03, 1.2), cx + 0.4, 0.3, cz + 1.15, { rx: 0.52, uv: 0.5 });
  for (let i = 0; i < 4; i++) B.box(lumber, 0.34, 0.02, 0.03, cx + 0.4, 0.14 + i * 0.12, cz + 1.55 - i * 0.2, { flat: true });
  k.collider(cx - 1.0, cx + 1.0, cz - 0.7, cz + 0.7, 0, 2.3, true);
  // straw floor patch + nest box + feeder + trough + sacks
  B.geo(strawLoose, new THREE.CylinderGeometry(3.2, 3.4, 0.05, 28), -14.2, 0.03, -9.5, { uv: 1.5, world: true });
  const feeder = (x: number, z: number) => {
    B.geo(galv, new THREE.LatheGeometry([[0, 0], [0.26, 0], [0.26, 0.06], [0.12, 0.08], [0.14, 0.5], [0.16, 0.52], [0.02, 0.6]].map(([a, b]) => new THREE.Vector2(a, b)), 20), x, 0, z);
  };
  feeder(-12.6, -8.4); feeder(-17.3, -7.6);
  B.box(galv, 1.6, 0.35, 0.45, -11.3, 0, -12.8, { uv: 0.8 });
  B.box(water, 1.5, 0.02, 0.38, -11.3, 0.3, -12.8, { flat: true });
  k.collider(-12.1, -10.5, -13.05, -12.55, 0, 0.35, true);
  sack(-18.3, -13.8, 0.2); sack(-17.7, -13.9, -0.3); sack(-18.0, -13.3, 1.1);
  const hens: [number, number, number, boolean][] = [[-13.2, -9.0, 0.5, true], [-11.4, -10.2, -0.6, true], [-16.4, -8.2, 0.9, false], [-12.3, -6.6, -0.2, true], [-17.6, -10.2, 1.8, true], [-14.4, -6.4, 2.6, true]];
  for (const [x, z, ry, hen] of hens) cutout(HEN, hen ? henM : roosterM, hen ? 0.85 : 1.0, hen ? 0.95 : 1.15, x, z, ry, { flip: ry > 1.5 });
  cutout(TREE, appleTreeM, 3.2, 4.6, -12.3, -14.1, 0);
  cutout(TREE, treeM, 2.6, 3.8, -18.4, -2.6, Math.PI / 2 - 0.1);

  // ---------- COW PASTURE (north-east) ----------
  fence(9.5, -5, 12.5, -5);
  fence(14.5, -5, 18.8, -5);
  fence(9.5, -5, 9.5, -8.6);
  fence(9.5, -11, 9.5, -13.8);
  const cows: [number, number, number, number][] = [[13.4, -7.4, 0.25, 1], [16.6, -10.6, -0.35, 1.05], [12.8, -12.4, 2.9, 0.95]];
  for (const [x, z, ry, s] of cows) cutout(COW, cowM, 2.3 * s, 1.6 * s, x, z, ry, { flip: ry > 1.5 });
  // trough, hay rack, milk cans, round bales
  B.box(galv, 2.2, 0.55, 0.7, 16.8, 0, -6.4, { uv: 0.9 });
  B.box(water, 2.08, 0.02, 0.58, 16.8, 0.48, -6.4, { flat: true });
  k.collider(15.7, 17.9, -6.75, -6.05, 0, 0.55, true);
  // hay rack (wooden V-rack filled with hay)
  const rx = 18.3, rz = -9.2;
  for (const s of [-1, 1]) for (const e of [-1, 1]) B.box(lumber, 0.1, 1.5, 0.1, rx + s * 0.45, 0, rz + e * 1.1, { uv: 0.6 });
  for (let i = -5; i <= 5; i++) for (const s of [-1, 1]) B.geo(lumber, new THREE.BoxGeometry(0.04, 0.8, 0.04), rx + s * 0.25, 1.0, rz + i * 0.2, { rz: s * 0.45 });
  B.geo(straw, new THREE.BoxGeometry(0.8, 0.5, 2.1), rx, 1.3, rz, { uv: 0.8 });
  k.collider(rx - 0.55, rx + 0.55, rz - 1.2, rz + 1.2, 0, 1.55, true);
  roundBale(11.3, -14.0, Math.PI / 2);
  roundBale(12.5, -13.9, Math.PI / 2, true);
  milkCan(10.3, -6.0); milkCan(10.7, -5.8);
  cutout(TREE, treeM, 3.0, 4.4, 15.4, -14.2, 0, { flip: true });
  cutout(TREE, appleTreeM, 2.6, 3.8, 18.6, -2.9, -Math.PI / 2 + 0.15);

  // ---------- VEGETABLE PATCH (centre-west) ----------
  const bed = (x: number, z: number, w: number, d: number, crop: "cabbage" | "carrot" | "lettuce") => {
    const h = 0.34;
    B.box(bedWood, w, h, 0.06, x, 0, z - d / 2, { uv: 1 });
    B.box(bedWood, w, h, 0.06, x, 0, z + d / 2, { uv: 1 });
    B.box(bedWood, 0.06, h, d, x - w / 2, 0, z, { uv: 1 });
    B.box(bedWood, 0.06, h, d, x + w / 2, 0, z, { uv: 1 });
    B.box(soil, w - 0.08, h - 0.05, d - 0.08, x, 0, z, { flat: true, uv: 1 });
    k.collider(x - w / 2, x + w / 2, z - d / 2, z + d / 2, 0, h, true);
    const n = Math.floor(w / 0.45);
    for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) {
      const px = x - w / 2 + 0.3 + i * ((w - 0.6) / (n - 1)), pz = z + (j - 0.5) * d * 0.5, y = h - 0.03;
      if (crop === "cabbage") {
        B.geo(leafy, new THREE.SphereGeometry(0.16, 12, 9), px, y + 0.14, pz, { uv: 0.3 });
        for (let l = 0; l < 4; l++) { const g = new THREE.SphereGeometry(0.16, 8, 6); g.scale(1.1, 0.35, 0.8); B.geo(leafyDark, g, px + Math.cos(l * 1.6) * 0.1, y + 0.06, pz + Math.sin(l * 1.6) * 0.1, { ry: l * 1.6, uv: 0.3 }); }
      } else if (crop === "carrot") {
        B.cyl(carrot, 0.045, 0.02, 0.08, px, y - 0.02, pz, { seg: 8 });
        for (let l = 0; l < 3; l++) B.geo(cornLeaf, new THREE.ConeGeometry(0.03, 0.34, 5), px, y + 0.2, pz, { rx: (l - 1) * 0.35, rz: (l - 1) * 0.2 });
      } else {
        const g = new THREE.SphereGeometry(0.17, 12, 8); g.scale(1, 0.55, 1);
        B.geo(leafy, g, px, y + 0.06, pz, { ry: i, uv: 0.3 });
      }
    }
  };
  bed(-12.5, 4.0, 3.6, 1.2, "cabbage");
  bed(-12.5, 6.2, 3.6, 1.2, "carrot");
  bed(-8.3, 4.0, 2.7, 1.2, "lettuce");
  // corn row along the west mural
  for (let i = 0; i < 9; i++) {
    const x = -18.9 + (i % 2) * 0.5, z = 3.2 + i * 0.62, h = 1.9 + rnd() * 0.5;
    B.cyl(cornStalk, 0.025, 0.035, h, x, 0, z, { seg: 6 });
    for (let l = 0; l < 5; l++) B.geo(cornLeaf, new THREE.BoxGeometry(0.06, 0.7, 0.012), x + Math.cos(l * 2.4) * 0.18, 0.5 + l * 0.32, z + Math.sin(l * 2.4) * 0.18, { ry: l * 2.4, rz: 0.7 });
    B.geo(corn, new THREE.CylinderGeometry(0.04, 0.03, 0.22, 8), x + 0.05, 1.2, z, { rz: 0.3 });
  }
  k.collider(-19.3, -18.1, 2.9, 8.6, 0, 2.2, false);
  // scarecrow
  const sx = -10.2, sz = 6.6;
  B.cyl(lumber, 0.04, 0.05, 2.2, sx, 0, sz, { seg: 8 });
  B.geo(lumber, new THREE.BoxGeometry(1.5, 0.07, 0.07), sx, 1.55, sz, {});
  B.geo(plaid, new RoundedBoxGeometry(0.62, 0.62, 0.3, 2, 0.08), sx, 1.4, sz, { uv: 0.4 });
  B.geo(plaid, new THREE.CylinderGeometry(0.1, 0.12, 0.62, 8), sx - 0.52, 1.55, sz, { rz: Math.PI / 2 });
  B.geo(plaid, new THREE.CylinderGeometry(0.1, 0.12, 0.62, 8), sx + 0.52, 1.55, sz, { rz: -Math.PI / 2 });
  B.geo(denim, new RoundedBoxGeometry(0.58, 0.45, 0.28, 2, 0.06), sx, 0.95, sz, { uv: 0.4 });
  B.geo(burlap, new THREE.SphereGeometry(0.2, 14, 10), sx, 1.95, sz, { uv: 0.3 });
  B.cyl(hatStraw, 0.38, 0.38, 0.02, sx, 2.1, sz, { seg: 20 });
  B.cyl(hatStraw, 0.15, 0.18, 0.18, sx, 2.1, sz, { seg: 16 });
  for (const s of [-1, 1]) B.geo(strawLoose, new THREE.ConeGeometry(0.06, 0.2, 5), sx + s * 0.85, 1.55, sz, { rz: s * Math.PI / 2 });
  k.collider(sx - 0.3, sx + 0.3, sz - 0.2, sz + 0.2, 0, 2.2, false);
  // wheelbarrow with pumpkins + watering can
  const wheelbarrow = (x: number, z: number, ry: number) => {
    const [ax, az] = loc(x, z, ry, 0, 0);
    B.geo(greenMetal, new THREE.BoxGeometry(0.62, 0.04, 0.8), ax, 0.5, az, { ry });
    for (const s of [-1, 1]) {
      const [px, pz] = loc(x, z, ry, s * 0.34, 0);
      B.geo(greenMetal, new THREE.BoxGeometry(0.04, 0.3, 0.84), px, 0.63, pz, { ry, rz: -s * 0.35 });
      const [qx, qz] = loc(x, z, ry, 0, s * 0.45);
      B.geo(greenMetal, new THREE.BoxGeometry(0.66, 0.3, 0.04), qx, 0.63, qz, { ry, rx: s * 0.4 });
    }
    const [wx, wz] = loc(x, z, ry, 0, -0.62);
    B.geo(rubber, new THREE.TorusGeometry(0.17, 0.06, 8, 18), wx, 0.23, wz, { ry: ry + Math.PI / 2 });
    B.geo(steel, new THREE.CylinderGeometry(0.05, 0.05, 0.08, 10), wx, 0.23, wz, { ry, rz: Math.PI / 2 });
    for (const s of [-1, 1]) {
      const [h1x, h1z] = loc(x, z, ry, s * 0.24, -0.6), [h2x, h2z] = loc(x, z, ry, s * 0.28, 1.05);
      B.rod(lumber, 0.022, [h1x, 0.28, h1z], [h2x, 0.58, h2z], 6);
      const [lx, lz] = loc(x, z, ry, s * 0.24, 0.35);
      B.rod(steel, 0.015, [lx, 0.48, lz], [lx, 0, lz], 5);
    }
    pumpkin(ax + 0.08, az, 0.2, pumpkinA, 0.5);
    pumpkin(ax - 0.12, az + 0.18, 0.16, pumpkinB, 0.52);
    k.collider(Math.min(ax, wx) - 0.4, Math.max(ax, wx) + 0.4, Math.min(az, wz) - 0.4, Math.max(az, wz) + 0.4, 0, 0.75, true);
  };
  wheelbarrow(-6.8, 6.4, 0.6);
  B.geo(galv, new THREE.LatheGeometry([[0, 0], [0.13, 0], [0.13, 0.3], [0.1, 0.33], [0, 0.33]].map(([a, b]) => new THREE.Vector2(a, b)), 16), -7.6, 0, 3.0);
  B.rod(galv, 0.018, [-7.5, 0.24, 3.0], [-7.2, 0.42, 3.0], 5);
  crateBox(-15.6, 0, 7.5, 0.1, tomato);
  crateBox(-15.0, 0, 8.1, -0.2, carrot);
  crateBox(-15.3, 0.34, 7.8, 0.05, null);
  cutout(TREE, treeM, 2.8, 4.2, -18.9, 0.2, Math.PI / 2);

  // ---------- PUMPKIN PATCH (centre-east) ----------
  B.geo(strawLoose, new THREE.CylinderGeometry(3.6, 3.8, 0.05, 28), 10.8, 0.03, 4.8, { uv: 1.5, world: true });
  for (let i = 0; i < 22; i++) {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * 3.1;
    const x = 10.8 + Math.cos(a) * d, z = 4.8 + Math.sin(a) * d * 0.9;
    const r = 0.14 + rnd() * 0.24;
    pumpkin(x, z, r, i % 5 === 0 ? pumpkinW : i % 2 ? pumpkinA : pumpkinB);
  }
  pumpkin(9.9, 4.2, 0.62, pumpkinA);
  // vines
  for (let i = 0; i < 6; i++) {
    const pts = Array.from({ length: 6 }, (_, j) => new THREE.Vector3(10.8 + Math.cos(i) * j * 0.55 + Math.sin(j * 2) * 0.2, 0.06, 4.8 + Math.sin(i) * j * 0.5));
    B.geo(stem, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.018, 4), 0, 0, 0);
  }
  roundBale(15.0, 1.9, 0.2);
  roundBale(16.4, 2.6, Math.PI / 2 + 0.1, true);
  bale(7.0, 0, 7.6, 0.2); bale(7.2, 0.45, 7.6, 0.1); bale(8.1, 0, 8.0, -0.1);
  // produce stand with striped awning
  const px0 = 16.8, pz0 = 6.8;
  for (const [lx, lz] of [[-1.5, -0.55], [1.5, -0.55], [-1.5, 0.55], [1.5, 0.55]]) B.box(greenWood, 0.1, lz < 0 ? 2.4 : 2.1, 0.1, px0 + lx, 0, pz0 + lz, { uv: 0.6 });
  B.box(greenWood, 3.2, 0.06, 1.2, px0, 0.85, pz0, { uv: 1 });
  B.box(greenWood, 3.2, 0.8, 0.05, px0, 0.05, pz0 - 0.58, { uv: 1 });
  B.geo(awning, new THREE.BoxGeometry(3.5, 0.03, 1.6), px0, 2.28, pz0 + 0.05, { rx: 0.2, su: 3, sv: 1 });
  for (let i = 0; i < 12; i++) B.geo(awning, new THREE.BoxGeometry(0.29, 0.18, 0.02), px0 - 1.6 + i * 0.29, 2.07, pz0 + 0.85, {});
  k.panel(1.4, 0.5, px0, 2.62, pz0 - 0.45, signFresh, Math.PI);
  B.box(greenWood, 1.5, 0.55, 0.05, px0, 2.35, pz0 - 0.5, {});
  crateBox(px0 - 1.0, 0.91, pz0, 0.05, apple, 0.8, 0.22, 0.5);
  crateBox(px0, 0.91, pz0, -0.05, tomato, 0.8, 0.22, 0.5);
  crateBox(px0 + 1.0, 0.91, pz0, 0.02, carrot, 0.8, 0.22, 0.5);
  k.collider(px0 - 1.6, px0 + 1.6, pz0 - 0.65, pz0 + 0.65, 0, 1.15, true);
  for (const [x, z, y, r, f] of [[14.8, 8.2, 0, 0.2, corn], [15.5, 8.4, 0, -0.1, apple], [15.1, 8.3, 0.34, 0.1, null], [18.9, 8.0, 0, 1.4, tomato]] as const) crateBox(x, y, z, r, f as Mat | null);
  cutout(TREE, appleTreeM, 3.0, 4.4, 19.0, 3.0, -Math.PI / 2 + 0.05, { flip: true });

  // ---------- centre: well-ish water pump + bench near the plaza ----------
  const pmx = 4.4, pmz = -3.6;
  B.box(fenceWood, 1.4, 0.5, 1.4, pmx, 0, pmz, { uv: 0.7 });
  B.cyl(greenMetal, 0.08, 0.1, 1.1, pmx, 0.5, pmz, { seg: 12 });
  B.geo(greenMetal, new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8), pmx + 0.15, 1.45, pmz, { rz: 1.1 });
  B.geo(greenMetal, new THREE.CylinderGeometry(0.035, 0.035, 0.25, 8), pmx - 0.13, 1.2, pmz, { rz: -1.3 });
  k.collider(pmx - 0.7, pmx + 0.7, pmz - 0.7, pmz + 0.7, 0, 0.5, true);
  B.box(fenceWood, 1.6, 0.06, 0.4, -4.8, 0.42, -3.2, { uv: 0.8 });
  for (const s of [-1, 1]) B.box(fenceWood, 0.08, 0.42, 0.34, -4.8 + s * 0.65, 0, -3.2, {});
  k.collider(-5.6, -4.0, -3.4, -3.0, 0, 0.48, true);
  sack(-3.6, -3.6, 0.3); sack(-3.2, -3.3, -0.4);
  cutout(HEN, henM, 0.85, 0.95, 3.4, -5.4, -0.5);
  cutout(HEN, henM, 0.8, 0.9, -1.8, 5.4, 0.9, { flip: false });

  // ---------- hanging CLOUDS + SUN ----------
  const hang = (pts: P, art: Mat, w: number, h: number, x: number, y: number, z: number, ry: number) => {
    cutout(pts, art, w, h, x, z, ry, { y, braces: false, both: true, solid: false, th: 0.04 });
    for (const s of [-0.3, 0.3]) {
      const [cxx, czz] = loc(x, z, ry, s * w, 0);
      B.rod(chain, 0.006, [cxx, y + h * 0.75, czz], [cxx, TY, czz], 3);
    }
    lineCol(...loc(x, z, ry, -w / 2, 0), ...loc(x, z, ry, w / 2, 0), 0.14, y, y + h, true);
  };
  hang(CLOUD.pts, cloudM, CLOUD.w * 1.1, CLOUD.h * 1.1, -12, 5.0, -8.2, 0.1);
  hang(CLOUD.pts, cloudM, CLOUD.w * 1.3, CLOUD.h * 1.3, 11, 5.4, -8.2, -0.1);
  hang(CLOUD2.pts, cloud2M, CLOUD2.w * 1.2, CLOUD2.h * 1.2, -3, 5.8, -1.2, 0.3);
  hang(CLOUD.pts, cloudM, CLOUD.w, CLOUD.h, 6, 4.8, -1.2, -0.25);
  hang(CLOUD2.pts, cloud2M, CLOUD2.w * 1.4, CLOUD2.h * 1.4, 15, 5.2, -1.2, 0.2);
  hang(CLOUD.pts, cloudM, CLOUD.w * 0.9, CLOUD.h * 0.9, -15.5, 5.6, 5.8, 0.15);
  hang(CLOUD2.pts, cloud2M, CLOUD2.w, CLOUD2.h, 2, 5.4, 5.8, -0.1);
  hang(SUN, sunM, 2.4, 2.4, 3.5, 5.0, -8.2, 0);

  // ---------- STAGE ENTRANCE / backstage (south) ----------
  // director's chairs
  const dirChair = (x: number, z: number, ry: number) => {
    for (const s of [-1, 1]) {
      const [lx, lz] = loc(x, z, ry, s * 0.25, 0);
      B.geo(lumber, new THREE.BoxGeometry(0.035, 0.66, 0.035), lx, 0.33, lz, { ry, rx: 0.5 });
      B.geo(lumber, new THREE.BoxGeometry(0.035, 0.66, 0.035), lx, 0.33, lz, { ry, rx: -0.5 });
      const [bx, bz] = loc(x, z, ry, s * 0.25, -0.2);
      B.geo(lumber, new THREE.BoxGeometry(0.035, 0.5, 0.035), bx, 0.85, bz, {});
      const [ax, az] = loc(x, z, ry, s * 0.27, 0);
      B.geo(lumber, new THREE.BoxGeometry(0.05, 0.035, 0.45), ax, 0.66, az, { ry });
    }
    const [sx0, sz0] = loc(x, z, ry, 0, 0);
    B.geo(canvasBlack, new THREE.BoxGeometry(0.48, 0.02, 0.4), sx0, 0.46, sz0, { ry });
    const [bx, bz] = loc(x, z, ry, 0, -0.21);
    B.geo(canvasBlack, new THREE.BoxGeometry(0.5, 0.22, 0.015), bx, 0.95, bz, { ry });
    k.collider(x - 0.3, x + 0.3, z - 0.3, z + 0.3, 0, 0.48, true);
  };
  dirChair(0.8, 11.6, Math.PI - 0.3);
  dirChair(1.6, 11.9, Math.PI);
  dirChair(2.4, 11.7, Math.PI + 0.3);
  // camera on tripod + dolly track pointed at the set
  const camX = -1.4, camZ = 10.2;
  for (const s of [-0.55, 0.55]) B.box(steel, 0.05, 0.04, 6, camX + s, 0, 11.2, { flat: true });
  for (let i = 0; i < 9; i++) B.box(lumber, 1.4, 0.05, 0.12, camX, 0, 8.4 + i * 0.7, { flat: true });
  B.box(steel, 1.0, 0.18, 1.0, camX, 0.05, camZ, {});
  for (let i = 0; i < 4; i++) B.geo(rubber, new THREE.CylinderGeometry(0.08, 0.08, 0.06, 12), camX + (i % 2 ? 0.45 : -0.45), 0.09, camZ + (i < 2 ? 0.45 : -0.45), { rz: Math.PI / 2 });
  B.cyl(steel, 0.06, 0.08, 1.1, camX, 0.23, camZ, { seg: 10 });
  B.box(lampBody, 0.24, 0.12, 0.3, camX, 1.33, camZ, {});
  B.box(lampBody, 0.26, 0.3, 0.55, camX, 1.45, camZ, {});
  B.geo(lampBody, new THREE.CylinderGeometry(0.09, 0.1, 0.35, 16), camX, 1.62, camZ - 0.42, { rx: Math.PI / 2 });
  B.box(lampBody, 0.36, 0.26, 0.04, camX, 1.49, camZ - 0.62, {});
  B.box(steel, 0.02, 0.4, 0.02, camX + 0.2, 1.55, camZ + 0.1, { rz: 0.8 });
  k.collider(camX - 0.5, camX + 0.5, camZ - 0.7, camZ + 0.5, 0, 1.75, true);
  // flight cases stacks
  for (const [x, z, y, w, h, d, r] of [[-15.8, 13.9, 0, 1.2, 0.8, 0.7, 0], [-14.5, 13.9, 0, 1.2, 0.8, 0.7, 0], [-15.1, 13.9, 0.8, 1.2, 0.8, 0.7, 0.05], [-17.8, 13.6, 0, 0.9, 1.1, 0.9, 0.2], [12.4, 13.9, 0, 1.4, 0.9, 0.8, 0], [13.9, 13.8, 0, 1.2, 0.7, 0.7, -0.1], [13.2, 13.9, 0.9, 1.0, 0.6, 0.6, 0.1]] as const) {
    B.box(flight, w, h, d, x, y, z, { ry: r, uv: 0.7 });
    k.collider(x - w / 2, x + w / 2, z - d / 2, z + d / 2, y, y + h, true);
    B.geo(rubber, new THREE.BoxGeometry(w * 0.3, 0.03, 0.05), x, y + h * 0.7, z + d / 2 + 0.02, { ry: r });
  }
  B.box(orangeCase, 0.7, 0.45, 0.5, -16.8, 0, 12.4, { ry: 0.5 });
  k.collider(-17.2, -16.4, 12.1, 12.7, 0, 0.45, true);
  // cable spools
  for (const [x, z] of [[-11.2, 13.4], [-10.1, 13.8]] as const) {
    B.cyl(ply, 0.45, 0.45, 0.04, x, 0, z, { seg: 20, su: 0.5, sv: 0.5 });
    B.cyl(ply, 0.45, 0.45, 0.04, x, 0.56, z, { seg: 20, su: 0.5, sv: 0.5 });
    B.cyl(cable, 0.32, 0.32, 0.52, x, 0.04, z, { seg: 20 });
    k.collider(x - 0.45, x + 0.45, z - 0.45, z + 0.45, 0, 0.6, true);
  }
  // floor cables snaking from the spools to the set
  for (const pts of [[[-10.6, 13.5], [-8, 12], [-4, 12.8], [0, 12.4], [4, 11.2], [7, 9.6]], [[-11.1, 13.2], [-13, 11], [-15, 10.2], [-17, 9.7]], [[13, 13.2], [12, 11.5], [9, 10.5], [5.5, 9.8]]] as const)
    B.geo(cable, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0.025, z))), 60, 0.022, 5), 0, 0, 0);
  // light stands with softboxes and a big fresnel on a stand
  const stand = (x: number, z: number, h: number) => {
    for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.3; B.rod(steel, 0.015, [x, 0.5, z], [x + Math.cos(a) * 0.55, 0.02, z + Math.sin(a) * 0.55], 5); }
    B.rod(steel, 0.02, [x, 0.02, z], [x, h, z], 8);
    k.collider(x - 0.3, x + 0.3, z - 0.3, z + 0.3, 0, h, false);
  };
  const softboxAt = (x: number, z: number, ry: number) => {
    stand(x, z, 2.1);
    B.geo(lampBody, new THREE.BoxGeometry(1.0, 0.8, 0.35), x, 2.3, z, { ry, rx: -0.25 });
    const f = new THREE.PlaneGeometry(0.94, 0.74);
    f.translate(0, 0, -0.18);
    f.rotateY(Math.PI);
    B.geo(softbox, f, x, 2.3, z, { ry, rx: -0.25 });
  };
  softboxAt(-9.5, 10.6, 0.5);
  softboxAt(8.6, 10.2, -0.4);
  stand(4.2, 10.0, 1.7);
  B.geo(lampBody, new THREE.CylinderGeometry(0.28, 0.3, 0.6, 16), 4.2, 1.95, 10.0, { rx: -Math.PI / 2 + 0.25, ry: -0.2 });
  const bigLens = new THREE.CircleGeometry(0.25, 16);
  bigLens.rotateX(Math.PI / 2); bigLens.translate(0, -0.31, 0);
  B.geo(lens, bigLens, 4.2, 1.95, 10.0, { rx: -Math.PI / 2 + 0.25, ry: -0.2 });
  // C-stands with flags
  for (const [x, z, r] of [[-3.8, 10.6, 0.4], [10.6, 11.5, -0.8]] as const) {
    stand(x, z, 1.9);
    B.rod(steel, 0.012, [x, 1.8, z], [x + Math.sin(r) * 0.9, 2.05, z + Math.cos(r) * 0.9], 5);
    B.geo(canvasBlack, new THREE.BoxGeometry(0.6, 0.45, 0.01), x + Math.sin(r) * 0.9, 2.1, z + Math.cos(r) * 0.9, { ry: r });
  }
  // video village: monitor cart
  const mvx = 5.8, mvz = 12.6;
  B.box(steel, 1.2, 0.04, 0.6, mvx, 0.9, mvz, { flat: true });
  B.box(steel, 1.2, 0.04, 0.6, mvx, 0.25, mvz, { flat: true });
  for (const [lx, lz] of [[-0.56, -0.26], [0.56, -0.26], [-0.56, 0.26], [0.56, 0.26]]) B.box(steel, 0.04, 0.92, 0.04, mvx + lx, 0, mvz + lz, { flat: true });
  B.box(lampBody, 0.8, 0.5, 0.06, mvx, 0.98, mvz, { ry: Math.PI });
  B.geo(screen, new THREE.PlaneGeometry(0.74, 0.44), mvx, 1.23, mvz - 0.035, { ry: Math.PI });
  B.box(flight, 0.4, 0.3, 0.3, mvx + 0.3, 0.29, mvz, { uv: 0.4 });
  k.collider(mvx - 0.6, mvx + 0.6, mvz - 0.3, mvz + 0.3, 0, 1.5, true);
  dirChair(5.4, 11.6, 0.1);
  // craft services table
  const ctx = 15.8, ctz = 11.2;
  B.box(cream, 2.0, 0.05, 0.8, ctx, 0.72, ctz, {});
  for (const [lx, lz] of [[-0.9, -0.34], [0.9, -0.34], [-0.9, 0.34], [0.9, 0.34]]) B.cyl(steel, 0.02, 0.02, 0.72, ctx + lx, 0, ctz + lz, { seg: 6 });
  B.geo(paintCan, new THREE.LatheGeometry([[0, 0], [0.14, 0], [0.15, 0.4], [0.12, 0.44], [0, 0.46]].map(([a, b]) => new THREE.Vector2(a, b)), 16), ctx - 0.6, 0.77, ctz);
  for (let i = 0; i < 6; i++) B.cyl(cream, 0.04, 0.03, 0.1, ctx - 0.1 + (i % 3) * 0.1, 0.77, ctz - 0.1 + Math.floor(i / 3) * 0.12, { seg: 8 });
  crateBox(ctx + 0.55, 0.77, ctz, 0.1, apple, 0.5, 0.15, 0.35);
  k.collider(ctx - 1, ctx + 1, ctz - 0.4, ctz + 0.4, 0, 0.77, true);
  // clapperboard on a case, A-ladder, sandbags row, fire extinguisher + electrical panel
  B.geo(clapperM, new THREE.BoxGeometry(0.3, 0.26, 0.02), -15.1, 1.73, 13.7, { rx: -0.3 });
  ladder(-7.8, 12.2, 0.4, 2.6);
  for (let i = 0; i < 6; i++) B.geo(sandbag, new RoundedBoxGeometry(0.5, 0.16, 0.3, 2, 0.07), -19.2 + (i % 2) * 0.1, 0.08 + Math.floor(i / 2) * 0.15, 10.6 + (i % 2) * 0.35, { ry: 1.5 + i * 0.1, uv: 0.5 });
  k.collider(-19.6, -18.8, 10.2, 11.2, 0, 0.45, true);
  B.cyl(redPaint, 0.08, 0.08, 0.5, 19.7, 0.4, 13.2, { seg: 12 });
  B.box(steel, 0.2, 1.0, 0.7, 19.75, 1.0, 11.4, {});
  B.box(tapeY, 0.02, 0.2, 0.2, 19.64, 1.6, 11.4, { flat: true });
  // backstage strip lights on the south wall (practical work lights)
  for (const x of [-15, -9, 3, 9, 15]) {
    B.box(lampBody, 1.2, 0.1, 0.16, x, 4.2, Z1 - 0.1, { flat: true });
    B.box(softbox, 1.1, 0.03, 0.04, x, 4.16, Z1 - 0.16, { flat: true });
  }

  B.flush();

  k.room("Stage Entrance", X0, X1, SETZ, Z1);
  k.room("Behind the Barn", -6, 6, Z0, BZ);
  k.room("Barn", -6, 6, BZ, -6);
  k.room("Chicken Coop", X0, -9.5, Z0, -5);
  k.room("Cow Pasture", 9.5, X1, Z0, -5);
  k.room("Vegetable Patch", X0, -4, 2.4, SETZ);
  k.room("Pumpkin Patch", 6, X1, 2.4, SETZ);
  k.room("Farm Set", X0, X1, Z0, SETZ);

  // hider spawns: open dirt plaza in the middle of the set
  const hiders: THREE.Vector3[] = [];
  for (let i = 0; i < 24; i++) hiders.push(new THREE.Vector3(-3 + (i % 6) * 1.2, 0, -1.6 + Math.floor(i / 6) * 1.2));
  const hunters: THREE.Vector3[] = [];
  for (let i = 0; i < 9; i++) hunters.push(new THREE.Vector3(doorX - 1.2 + (i % 3) * 1.2, 0, 13.9 - Math.floor(i / 3) * 1.1));

  return k.finish({
    id: "country", name: "Indoor Country",
    bounds: { minX: X0 + 0.2, maxX: X1 - 0.2, minZ: Z0 + 0.2, maxZ: Z1 - 0.2 },
    hunterSpawns: hunters, hiderSpawns: hiders,
    preview: { pos: [-9, 3.4, 13.2], look: [2, 2.2, -8], fov: 62 },
    lighting: {
      sky: "#1a1a1c",
      hemi: ["#fff4e0", "#6b7a45", 0.55],
      sun: { color: "#fff1d6", int: 2.4, pos: [8, 30, 16] },
      points: [
        { pos: [-11, 6.6, -7.2], color: "#ffe2b0", int: 60, dist: 22 },
        { pos: [9, 6.6, -7.2], color: "#ffe2b0", int: 60, dist: 22 },
        { pos: [-8, 6.6, 1], color: "#fff0d0", int: 50, dist: 20 },
        { pos: [9, 6.6, 1], color: "#fff0d0", int: 50, dist: 20 },
        { pos: [0, 6.2, 7], color: "#ffd9a0", int: 45, dist: 20 },
        { pos: [-6, 4.5, 13], color: "#c9d6ff", int: 16, dist: 14 },
      ],
      exposure: 1.05,
      hdri: "studio",
      env: 0.55,
    },
  });
}
