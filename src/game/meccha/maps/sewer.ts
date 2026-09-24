// Sewer (下水道): a stagnant, grimy, DARK storm-sewer. Layout = walkways along a long central channel of murky
// green water under a brick vault, with grate bridges, a west overflow tunnel (graffiti section A), an east
// junction chamber with concrete pillars (graffiti section B), a dead-end pipe gallery, a big outfall pipe at the
// north end and the maintenance entrance (hunter arrival) at the south end. Big rusty pipes along the walls and
// overhead, oil drums, sandbag piles, corrugated metal, tiled sections, ladders, valves and sparse caged lights.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import * as S from "./tex/sewer";
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
  private rnd = S.rng(99);
  meshes = new Map<Mat, THREE.Mesh>();
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
  box(m: Mat, w: number, h: number, d: number, x: number, y: number, z: number, o: BO = {}) {
    const mn = Math.min(w, h, d), mx = Math.max(w, h, d);
    const g = o.flat || mn < 0.06 || mx > 4.5 ? new THREE.BoxGeometry(w, h, d) : new RoundedBoxGeometry(w, h, d, 1, Math.min(0.03, mn * 0.2));
    return this.geo(m, g, x, y + h / 2, z, o);
  }
  cyl(m: Mat, rt: number, rb: number, h: number, x: number, y: number, z: number, o: BO & { seg?: number; open?: boolean } = {}) {
    return this.geo(m, new THREE.CylinderGeometry(rt, rb, h, o.seg ?? 16, 1, o.open), x, y + h / 2, z, o);
  }
  rod(m: Mat, r: number, a: [number, number, number], b: [number, number, number], seg = 8, su = 1) {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
    const len = va.distanceTo(vb);
    const g = new THREE.CylinderGeometry(r, r, len, seg, 1, true);
    if (su !== 1) scaleUV(g, su, len / (su * 1.0));
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
    g.applyMatrix4(new THREE.Matrix4().compose(va.clone().add(vb).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
    let l = this.lists.get(m);
    if (!l) this.lists.set(m, (l = []));
    l.push(g);
    return g;
  }
  flush() {
    for (const [m, l] of this.lists) if (l.length) this.meshes.set(m, this.k.merged(l, m, { noShadow: this.flags.get(m)?.noShadow }));
    this.lists.clear();
  }
}
// ---------------------------------------------------------------------------------------------

type R = [number, number, number, number]; // x1,x2,z1,z2

export function buildSewer(): World {
  const k = new Kit(3.4, 2.8);
  const B = new Batch(k);
  const rnd = S.rng(777);
  const FY = 0.44; // walkway level
  const WY = 0.13; // water surface
  const ZN = -24, ZS = 25, CH = 2.5, MW = 6.5, WALLH = 3.4;

  // ---------- materials ----------
  const conc = k.mat(k.tex("s-conc", () => S.concreteWall(1)), "#fff", [1, 1], { roughness: 0.85, bump: 0.8 });
  const conc2 = k.mat(k.tex("s-conc2", () => S.concreteWall(5, "#5f625a")), "#fff", [1, 1], { roughness: 0.85, bump: 0.8 });
  const floorM = k.mat(k.tex("s-floor", () => S.concreteFloor(2)), "#fff", [1, 1], { roughness: 0.55, bump: 0.7 });
  const brick = k.mat(k.tex("s-brick", () => S.brick(3)), "#fff", [1, 1], { roughness: 0.8, bump: 1.1 });
  const brickDark = k.mat(k.tex("s-brick2", () => S.brick(8, "#4f3226")), "#fff", [1, 1], { roughness: 0.8, bump: 1.1 });
  const tile = k.mat(k.tex("s-tile", () => S.tiles(4)), "#fff", [1, 1], { roughness: 0.3, bump: 0.6 });
  const tileGreen = k.mat(k.tex("s-tile2", () => S.tiles(6, "#8fa88e")), "#fff", [1, 1], { roughness: 0.3, bump: 0.6 });
  const slime = k.mat(k.tex("s-slime", S.slime), "#fff", [1, 1], { roughness: 0.35, bump: 0.8 });
  const waterM = k.mat(k.tex("s-water", S.water), "#9aa58a", [1, 1], { roughness: 0.06, metalness: 0.35, bump: 0.25 });
  const rustM = k.mat(k.tex("s-rust", () => S.rust(5)), "#fff", [1, 1], { metalness: 0.55, roughness: 0.75, bump: 0.9 });
  const rustBare = k.mat(k.tex("s-rust2", () => S.rust(15, null)), "#fff", [1, 1], { metalness: 0.5, roughness: 0.8, bump: 1.0 });
  const pipeGrey = k.mat(k.tex("s-pgrey", () => S.paintedMetal("#56605a", 6)), "#fff", [1, 1], { metalness: 0.6, roughness: 0.5, bump: 0.4 });
  const pipeYellow = k.mat(k.tex("s-pyel", () => S.paintedMetal("#a68a2a", 7)), "#fff", [1, 1], { metalness: 0.5, roughness: 0.5, bump: 0.4 });
  const pipeBlue = k.mat(k.tex("s-pblue", () => S.paintedMetal("#2f4d63", 8)), "#fff", [1, 1], { metalness: 0.55, roughness: 0.5, bump: 0.4 });
  const corr = k.mat(k.tex("s-corr", () => S.corrugated(7)), "#fff", [1, 1], { metalness: 0.6, roughness: 0.55, bump: 1.2 });
  const corrRed = k.mat(k.tex("s-corr2", () => S.corrugated(9, "#a0584a")), "#fff", [1, 1], { metalness: 0.5, roughness: 0.6, bump: 1.2 });
  const grate = k.mat(k.tex("s-grate", S.grate), "#fff", [1, 1], { transparent: true, metalness: 0.7, roughness: 0.5 });
  const plate = k.mat(k.tex("s-plate", S.checkerPlate), "#fff", [1, 1], { metalness: 0.7, roughness: 0.45, bump: 0.8 });
  const steel = k.mat(null, "#3e403d", [1, 1], { metalness: 0.8, roughness: 0.45 });
  const yellowRail = k.mat(null, "#b8961f", [1, 1], { metalness: 0.4, roughness: 0.5 });
  const drumRed = k.mat(k.tex("s-dred", () => S.drum("#8e1b16", 12)), "#fff", [1, 1], { metalness: 0.45, roughness: 0.5, bump: 0.5 });
  const drumBlue = k.mat(k.tex("s-dblue", () => S.drum("#1f4a78", 13)), "#fff", [1, 1], { metalness: 0.45, roughness: 0.5, bump: 0.5 });
  const drumRust = k.mat(k.tex("s-drust", () => S.rust(21, "#7a2a18", 0.35)), "#fff", [1, 1], { metalness: 0.5, roughness: 0.7, bump: 0.9 });
  const sand = k.mat(k.tex("s-sand", () => S.burlap()), "#fff", [1, 1], { roughness: 1, bump: 0.9 });
  const sandDark = k.mat(k.tex("s-sand2", () => S.burlap("#6a6448", 17)), "#fff", [1, 1], { roughness: 1, bump: 0.9 });
  const hazard = k.mat(k.tex("s-haz", S.hazard), "#fff", [1, 1], { roughness: 0.6, bump: 0.3 });
  const grafA = k.mat(k.tex("s-gA", () => S.graffitiA(21)), "#fff", [1, 1], { transparent: true, roughness: 0.6 });
  const grafA2 = k.mat(k.tex("s-gA2", () => S.graffitiA(24)), "#fff", [1, 1], { transparent: true, roughness: 0.6 });
  const grafB = k.mat(k.tex("s-gB", () => S.graffitiB(33)), "#fff", [1, 1], { transparent: true, roughness: 0.6 });
  const grafB2 = k.mat(k.tex("s-gB2", () => S.graffitiB(38)), "#fff", [1, 1], { transparent: true, roughness: 0.6 });
  const signMaint = k.mat(k.tex("s-smaint", () => S.sign("STAFF ONLY", "#d8d4c4", "#8e1b16", "MAINTENANCE ACCESS")), "#fff", [1, 1], { roughness: 0.5, bump: 0.2 });
  const signB2 = k.mat(k.tex("s-sb2", () => S.sign("B-2", "#1f4a78", "#e8e6dc", "OVERFLOW TUNNEL")), "#fff", [1, 1], { roughness: 0.5, bump: 0.2 });
  const signDanger = k.mat(k.tex("s-sdanger", () => S.sign("DANGER", "#e0b21a", "#111", "DEEP WATER")), "#fff", [1, 1], { roughness: 0.5, bump: 0.2 });
  const signJ = k.mat(k.tex("s-sj", () => S.sign("J-7", "#2d5a3a", "#e8e6dc", "JUNCTION")), "#fff", [1, 1], { roughness: 0.5, bump: 0.2 });
  const lampBody = k.mat(null, "#2a2b28", [1, 1], { metalness: 0.6, roughness: 0.5 });
  const lampWarm = k.mat(null, "#ffe2a8", [1, 1], { emissive: "#ffc970", emissiveIntensity: 3 });
  const lampCold = k.mat(null, "#d8fff0", [1, 1], { emissive: "#b8ffe0", emissiveIntensity: 2.6 });
  const lampFlicker = k.mat(null, "#e8f4ff", [1, 1], { emissive: "#d0e8ff", emissiveIntensity: 2.6 });
  const lampDead = k.mat(null, "#5b5a52", [1, 1], { roughness: 0.3 });
  const shaftLight = k.mat(null, "#cfe6ff", [1, 1], { emissive: "#bcd8ff", emissiveIntensity: 1.6 });
  const wood = k.mat(k.tex("s-wood", () => S.paintedMetal("#6b5236", 31)), "#fff", [1, 1], { roughness: 0.9, bump: 0.8 });
  const black = k.mat(null, "#050605", [1, 1], { roughness: 1 });
  const rubber = k.mat(null, "#161616", [1, 1], { roughness: 0.9 });
  const trash = k.mat(k.tex("s-trash", () => S.paintedMetal("#1c1f1d", 41)), "#fff", [1, 1], { roughness: 0.35, bump: 0.6 });
  const cone = k.mat(null, "#d9531e", [1, 1], { roughness: 0.6 });
  const cardboard = k.mat(k.tex("s-card", () => S.burlap("#8a6a44", 51)), "#fff", [1, 1], { roughness: 0.95, bump: 0.3 });
  const door = k.mat(k.tex("s-door", () => S.paintedMetal("#4a5a52", 61)), "#fff", [1, 1], { metalness: 0.6, roughness: 0.5, bump: 0.5 });
  // shallow puddles: a thin, glossy, semi-transparent film (not an opaque black disc)
  const puddle = k.mat(null, "#2c3326", [1, 1], { roughness: 0.03, metalness: 0.15 });
  puddle.m.transparent = true;
  puddle.m.opacity = 0.6;
  puddle.m.depthWrite = false;
  const moss = k.mat(k.tex("s-moss", S.slime), "#6f8a4a", [1, 1], { roughness: 0.9, bump: 0.8 });
  for (const m of [lampWarm, lampCold, lampFlicker, shaftLight, grafA, grafA2, grafB, grafB2, puddle, waterM]) B.opt(m, { noShadow: true });

  // ---------- helpers ----------
  const wallAlongZ = (x: number, z1: number, z2: number, h: number, m: Mat, y0 = 0, th = 0.3) =>
    B.box(m, th, h, z2 - z1, x, y0, (z1 + z2) / 2, { flat: true, uv: 2.2, world: true });
  const wallAlongX = (z: number, x1: number, x2: number, h: number, m: Mat, y0 = 0, th = 0.3) =>
    B.box(m, x2 - x1, h, th, (x1 + x2) / 2, y0, z, { flat: true, uv: 2.2, world: true });
  const slab = (x1: number, x2: number, z1: number, z2: number, m = floorM, top = FY) => {
    B.box(m, x2 - x1, top, z2 - z1, (x1 + x2) / 2, 0, (z1 + z2) / 2, { flat: true, uv: 2.4, world: true });
    k.collider(x1, x2, z1, z2, 0, top, true);
  };
  const decal = (m: Mat, w: number, h: number, x: number, y: number, z: number, ry: number) => {
    const g = new THREE.PlaneGeometry(w, h);
    B.geo(m, g, x, y, z, { ry });
  };
  // big horizontal pipe along Z or X on wall brackets
  const pipeRun = (m: Mat, r: number, a: [number, number, number], b: [number, number, number], flanges = 3.0, brackets: "wall-w" | "wall-e" | "wall-n" | "wall-s" | "hang" | null = null) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    B.rod(m, r, a, b, 18, Math.max(1, Math.round((2 * Math.PI * r) / 1.2)));
    const n = Math.floor(len / flanges);
    for (let i = 1; i <= n; i++) {
      const t = i / (n + 1);
      const p: [number, number, number] = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
      const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
      const q = p.map((v, j) => v + [dir.x, dir.y, dir.z][j] * 0.05) as [number, number, number];
      B.rod(rustBare, r * 1.14, p, q, 18);
      if (brackets === "hang") {
        B.rod(steel, 0.02, [p[0], p[1] + r, p[2]], [p[0], p[1] + r + 2.2, p[2]], 4);
      } else if (brackets) {
        const dx = brackets === "wall-w" ? -1 : brackets === "wall-e" ? 1 : 0, dz = brackets === "wall-n" ? -1 : brackets === "wall-s" ? 1 : 0;
        B.box(steel, dx ? r + 0.35 : 0.08, 0.08, dz ? r + 0.35 : 0.08, p[0] + dx * (r / 2 + 0.1), p[1] - r - 0.08, p[2] + dz * (r / 2 + 0.1), { flat: true });
      }
    }
  };
  const valve = (x: number, y: number, z: number, axis: "x" | "z", r = 0.22, m = rustM) => {
    const ry = axis === "x" ? Math.PI / 2 : 0;
    B.geo(m, new THREE.TorusGeometry(r, 0.025, 6, 20), x, y, z, { ry });
    for (let i = 0; i < 3; i++) B.geo(m, new THREE.BoxGeometry(r * 2, 0.025, 0.025), x, y, z, { ry, rz: (i * Math.PI) / 3 });
    B.geo(steel, new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8), x, y, z, { ry, rx: Math.PI / 2 });
  };
  const drum = (x: number, z: number, m: Mat, y = FY, lying = false, ry = 0) => {
    const prof: [number, number][] = [[0, 0], [0.27, 0], [0.29, 0.02], [0.29, 0.27], [0.3, 0.29], [0.29, 0.31], [0.29, 0.56], [0.3, 0.58], [0.29, 0.6], [0.29, 0.86], [0.27, 0.88], [0, 0.88]];
    const g = new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a, b)), 20);
    if (lying) {
      g.translate(0, -0.44, 0);
      B.geo(m, g, x, y + 0.3, z, { ry, rz: Math.PI / 2 });
      const c = Math.abs(Math.cos(ry)) > 0.7;
      k.collider(x - (c ? 0.44 : 0.3), x + (c ? 0.44 : 0.3), z - (c ? 0.3 : 0.44), z + (c ? 0.3 : 0.44), y, y + 0.6, true);
    } else {
      B.geo(m, g, x, y, z, { ry: rnd() * 6 });
      B.cyl(steel, 0.03, 0.03, 0.02, x + 0.15, y + 0.88, z, { seg: 8 });
      k.collider(x - 0.3, x + 0.3, z - 0.3, z + 0.3, y, y + 0.88, true);
    }
  };
  const sandbagWall = (x: number, z: number, len: number, rows: number, ry: number, y = FY, m = sand) => {
    const n = Math.max(1, Math.round(len / 0.6));
    for (let r = 0; r < rows; r++)
      for (let i = 0; i < n - (r % 2); i++) {
        const lx = -len / 2 + 0.3 + i * 0.6 + (r % 2) * 0.3;
        const px = x + lx * Math.cos(ry), pz = z - lx * Math.sin(ry);
        const g = new THREE.SphereGeometry(1, 10, 7);
        g.scale(0.32, 0.11, 0.2);
        B.geo(r % 3 === 1 ? sandDark : m, g, px, y + 0.1 + r * 0.19, pz, { ry: ry + (rnd() - 0.5) * 0.15, uv: 0.4 });
      }
    const c = Math.abs(Math.cos(ry)) > 0.7;
    const hw = (c ? len : 0.4) / 2, hd = (c ? 0.4 : len) / 2;
    k.collider(x - hw, x + hw, z - hd, z + hd, y, y + rows * 0.19 + 0.05, true);
  };
  const cagedLamp = (x: number, y: number, z: number, face: "n" | "s" | "e" | "w" | "down", m: Mat) => {
    const ry = face === "n" ? Math.PI : face === "e" ? Math.PI / 2 : face === "w" ? -Math.PI / 2 : 0;
    if (face === "down") {
      B.cyl(lampBody, 0.2, 0.2, 0.08, x, y, z, { seg: 16 });
      B.geo(m, new THREE.SphereGeometry(0.15, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), x, y, z);
      for (let i = 0; i < 4; i++) B.geo(steel, new THREE.TorusGeometry(0.17, 0.01, 4, 16, Math.PI), x, y, z, { ry: (i * Math.PI) / 4, rx: Math.PI });
      return;
    }
    const base = new THREE.CylinderGeometry(0.16, 0.16, 0.08, 16);
    base.rotateX(Math.PI / 2);
    B.geo(lampBody, base, x, y, z, { ry });
    const bulb = new THREE.SphereGeometry(0.12, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    bulb.rotateX(Math.PI / 2);
    bulb.translate(0, 0, 0.04);
    B.geo(m, bulb, x, y, z, { ry });
    for (let i = 0; i < 3; i++) {
      const t = new THREE.TorusGeometry(0.14, 0.009, 4, 16, Math.PI);
      t.rotateY(Math.PI / 2);
      t.rotateZ((i * Math.PI) / 3);
      t.translate(0, 0, 0.04);
      B.geo(steel, t, x, y, z, { ry });
    }
    B.rod(steel, 0.012, [x, y + 0.1, z], [x, WALLH + 1.2, z], 4);
  };
  const ladder = (x: number, z: number, y0: number, y1: number, face: "x" | "z") => {
    for (const s of [-0.22, 0.22]) {
      const px = face === "x" ? x : x + s, pz = face === "x" ? z + s : z;
      B.box(steel, 0.05, y1 - y0, 0.05, px, y0, pz, { flat: true });
    }
    for (let y = y0 + 0.3; y < y1; y += 0.3) B.box(steel, face === "x" ? 0.035 : 0.44, 0.035, face === "x" ? 0.44 : 0.035, x, y, z, { flat: true });
  };

  // ============ MAIN TUNNEL ============
  // channel bed, water, slimy channel walls, walkways
  B.box(slime, CH * 2, 0.02, ZS - 8 - ZN, 0, 0, (ZN + 17) / 2, { flat: true, uv: 2, world: true });
  const water = new THREE.PlaneGeometry(CH * 2, 17 - ZN);
  water.rotateX(-Math.PI / 2);
  scaleUV(water, 1.6, (17 - ZN) / 3);
  B.geo(waterM, water, 0, WY, (ZN + 17) / 2);
  for (const s of [-1, 1]) {
    B.box(slime, 0.06, FY + 0.01, 17 - ZN, s * (CH + 0.02), 0, (ZN + 17) / 2, { flat: true, uv: 1.6, world: true });
    // walkway slab + worn yellow edge line + drainage gutter lip
    slab(s < 0 ? -MW : CH, s < 0 ? -CH : MW, ZN, 17);
    B.box(hazard, 0.12, 0.01, 17 - ZN, s * (CH + 0.25), FY, (ZN + 17) / 2, { flat: true, su: (17 - ZN) / 1.2 } as BO);
    B.box(conc2, 0.18, 0.06, 17 - ZN, s * (CH + 0.09), FY, (ZN + 17) / 2, { flat: true, uv: 1.5, world: true });
  }
  // landing (maintenance area) at the south end, headwall + trash rack at the channel end
  slab(-MW, MW, 17, ZS);
  for (let x = -2.3; x <= 2.31; x += 0.2) B.box(rustBare, 0.04, 1.0, 0.04, x, 0, 16.95, { flat: true });
  B.box(rustBare, 5, 0.08, 0.08, 0, 0.95, 16.95, { flat: true });
  // walls: poured concrete, brick courses at the top, tiled dado near the landing
  const westOpen: [number, number][] = [[-15, 3], [-3, 3]];
  const eastOpen: [number, number][] = [[5.5, 3], [14.5, 3]];
  const wallWithOpenings = (x: number, openings: [number, number][], face: 1 | -1) => {
    let cur = ZN;
    const segs: [number, number][] = [];
    for (const [c, w] of openings) { segs.push([cur, c - w / 2]); cur = c + w / 2; }
    segs.push([cur, ZS]);
    for (const [a, b] of segs) {
      const lowM = a >= 16 || b > 18 ? tile : conc;
      if (b > 18) {
        wallAlongZ(x, a, 18, WALLH, conc);
        wallAlongZ(x, 18, b, WALLH, conc);
        B.box(tile, 0.04, 1.9, b - 18, x - face * 0.17, FY, (18 + b) / 2, { flat: true, uv: 1.2, world: true });
        B.box(tileGreen, 0.05, 0.16, b - 18, x - face * 0.17, FY + 1.9, (18 + b) / 2, { flat: true, uv: 1.2, world: true });
      } else wallAlongZ(x, a, b, WALLH, lowM === tile ? conc : conc);
      B.box(brick, 0.05, 0.9, b - a, x - face * 0.17, WALLH - 0.9, (a + b) / 2, { flat: true, uv: 1.6, world: true });
    }
    for (const [c, w] of openings) {
      wallAlongZ(x, c - w / 2, c + w / 2, WALLH - 2.8, conc, 2.8);
      // concrete lintel + jambs
      B.box(conc2, 0.5, 0.3, w + 0.4, x - face * 0.1, 2.5, c, { flat: true, uv: 1, world: true });
      for (const s of [-1, 1]) B.box(conc2, 0.5, 2.5, 0.25, x - face * 0.1, 0, c + s * (w / 2 + 0.05), { flat: true, uv: 1, world: true });
    }
  };
  wallWithOpenings(-MW - 0.15, westOpen, -1);
  wallWithOpenings(MW + 0.15, eastOpen, 1);
  // brick vault over the main tunnel
  const vaultLen = ZS - ZN;
  const vault = new THREE.CylinderGeometry(MW + 0.05, MW + 0.05, vaultLen, 36, 1, true, -Math.PI / 2, Math.PI);
  scaleUV(vault, 14, vaultLen / 1.6);
  vault.rotateX(-Math.PI / 2);
  vault.scale(1, 0.48, 1);
  const vaultMat = k.mat(brickDark.ptex, "#fff", [1, 1], { roughness: 0.8, bump: 1.0 });
  vaultMat.m.side = THREE.BackSide;
  B.geo(vaultMat, vault, 0, WALLH, (ZN + ZS) / 2);
  // vault end caps (north + south headwalls above 3.4)
  const cap = new THREE.Shape();
  cap.moveTo(-MW - 0.2, 0);
  for (let a = 0; a <= 32; a++) { const t = Math.PI - (a / 32) * Math.PI; cap.lineTo(Math.cos(t) * (MW + 0.2), Math.sin(t) * (MW + 0.2) * 0.48); }
  for (const [z, ry] of [[ZN, 0], [ZS, Math.PI]] as const) {
    const cg = new THREE.ShapeGeometry(cap, 8);
    boxUV(cg, 2.2);
    B.geo(brickDark, cg, 0, WALLH, z, { ry });
  }
  // vault ribs (brick arches every 8 m) and walls' concrete footing
  for (let z = ZN + 4; z < ZS; z += 8) {
    const rib = new THREE.TorusGeometry(MW - 0.05, 0.18, 6, 28, Math.PI);
    rib.scale(1, 0.48, 1);
    B.geo(conc2, rib, 0, WALLH, z, {});
    for (const s of [-1, 1]) B.box(conc2, 0.36, WALLH, 0.36, s * (MW - 0.1), 0, z, { flat: true, uv: 1, world: true });
    k.collider(-MW, -MW + 0.1, z - 0.18, z + 0.18, 0, WALLH, false);
    k.collider(MW - 0.1, MW, z - 0.18, z + 0.18, 0, WALLH, false);
  }
  // north headwall with the big outfall pipe + cascade
  wallAlongX(ZN - 0.15, -MW - 0.3, MW + 0.3, WALLH, conc);
  const ringG = new THREE.TorusGeometry(1.5, 0.22, 10, 32);
  B.geo(rustM, ringG, 0, 1.55, ZN + 0.12, {});
  B.geo(black, new THREE.CircleGeometry(1.45, 32), 0, 1.55, ZN + 0.02, {});
  B.geo(rustM, new THREE.CylinderGeometry(1.5, 1.5, 1.0, 32, 1, true), 0, 1.55, ZN + 0.5, { rx: Math.PI / 2, su: 4 });
  for (let x = -1.2; x <= 1.21; x += 0.3) B.box(rustBare, 0.05, 2.9 * Math.sqrt(Math.max(0, 1 - (x / 1.5) ** 2)), 0.05, x, 1.55 - 1.45 * Math.sqrt(Math.max(0, 1 - (x / 1.5) ** 2)), ZN + 0.95, { flat: true });
  const cascade = new THREE.PlaneGeometry(2.2, 1.2);
  cascade.rotateX(-1.1);
  scaleUV(cascade, 1, 1.5);
  B.geo(waterM, cascade, 0, 0.35, ZN + 1.3);
  // a dark concrete bridge by the outfall + side ladders to the pipe
  slab(-CH - 0.05, CH + 0.05, -21.5, -19.5, conc2);
  B.box(yellowRail, 0.06, 1.0, 0.06, -CH, FY, -19.5, { flat: true });
  for (const zz of [-21.5, -19.5]) {
    for (let x = -2.4; x <= 2.41; x += 1.2) B.box(yellowRail, 0.06, 1.0, 0.06, x, FY, zz, { flat: true });
    B.rod(yellowRail, 0.03, [-2.4, FY + 1.0, zz], [2.4, FY + 1.0, zz], 8);
    B.rod(yellowRail, 0.025, [-2.4, FY + 0.55, zz], [2.4, FY + 0.55, zz], 8);
    k.collider(-2.45, 2.45, zz - 0.05, zz + 0.05, FY, FY + 1.05, false);
  }
  // steel grate bridges with handrails
  const grateBridge = (z: number) => {
    const w = 1.8;
    const top = new THREE.PlaneGeometry(CH * 2 + 0.4, w);
    top.rotateX(-Math.PI / 2);
    scaleUV(top, (CH * 2 + 0.4) / 0.8, w / 0.8);
    B.geo(grate, top, 0, FY - 0.01, z);
    for (const s of [-1, 1]) {
      B.box(steel, CH * 2 + 0.4, 0.2, 0.1, 0, FY - 0.2, z + s * w / 2, { flat: true });
      for (let x = -CH; x <= CH + 0.01; x += 1.25) B.box(yellowRail, 0.05, 1.0, 0.05, x, FY, z + s * (w / 2 - 0.03), { flat: true });
      B.rod(yellowRail, 0.03, [-CH, FY + 1.0, z + s * (w / 2 - 0.03)], [CH, FY + 1.0, z + s * (w / 2 - 0.03)], 8);
      B.rod(yellowRail, 0.022, [-CH, FY + 0.5, z + s * (w / 2 - 0.03)], [CH, FY + 0.5, z + s * (w / 2 - 0.03)], 8);
      k.collider(-CH, CH, z + s * (w / 2) - 0.05, z + s * (w / 2) + 0.05, FY, FY + 1.05, false);
    }
    for (let x = -CH; x <= CH; x += 1.25) B.box(steel, 0.08, 0.2, w, x, FY - 0.2, z, { flat: true });
    k.collider(-CH, CH, z - w / 2, z + w / 2, 0, FY, true);
  };
  grateBridge(-11);
  grateBridge(7);
  // big pipe crossing the channel low (climb over) at z = 13
  // (it dips low only over the water and rises over both walkways, so the walkways stay open underneath)
  {
    const PY = 0.62, HY = 2.95, xe = CH - 0.5;
    const path = (sx: number): THREE.Vector3[] => [
      new THREE.Vector3(sx * (MW - 0.15), HY, 12.5), new THREE.Vector3(sx * (CH + 0.6), HY, 12.5), new THREE.Vector3(sx * (xe + 0.05), HY - 0.35, 12.5),
      new THREE.Vector3(sx * xe, HY - 1.0, 12.5), new THREE.Vector3(sx * (xe - 0.05), PY + 0.4, 12.5), new THREE.Vector3(sx * (xe - 0.5), PY, 12.5), new THREE.Vector3(0, PY, 12.5),
    ];
    for (const sx of [-1, 1]) {
      const pts = path(sx);
      B.geo(pipeGrey, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "centripetal", 0.2), 40, 0.42, 18), 0, 0, 0);
      // flanges at the bends + wall bracket
      for (const fx of [CH + 0.9, xe - 0.8]) B.rod(rustBare, 0.48, [sx * fx, fx > CH ? HY : PY, 12.5], [sx * (fx + 0.06), fx > CH ? HY : PY, 12.5], 18);
      B.box(steel, 0.9, 0.1, 0.12, sx * (MW - 0.5), HY - 0.52, 12.5, { flat: true });
      k.collider(Math.min(sx * (xe - 0.45), sx * (xe + 0.45)), Math.max(sx * (xe - 0.45), sx * (xe + 0.45)), 12.05, 12.95, 0, HY + 0.42, false);
    }
    for (const x of [-1.2, 1.2]) B.box(conc2, 0.5, 0.25, 0.9, x, 0, 12.5, { flat: true, uv: 1 });
    k.collider(-xe, xe, 12.08, 12.92, 0, PY + 0.42, true);
  }
  // concrete pillars along the channel edge
  for (const z of [-17, -4, 10, 20]) for (const s of [-1, 1]) {
    B.box(conc2, 0.75, WALLH + 2.1, 0.75, s * (CH + 0.55), 0, z, { flat: true, uv: 1.4, world: true });
    B.box(hazard, 0.77, 0.3, 0.77, s * (CH + 0.55), FY + 0.2, z, { flat: true, su: 2 } as BO);
    k.collider(s * (CH + 0.55) - 0.38, s * (CH + 0.55) + 0.38, z - 0.38, z + 0.38, 0, WALLH + 2, false);
  }

  // pipes along the main tunnel walls
  for (const s of [-1, 1]) {
    const x0 = s * (MW - 0.55);
    pipeRun(rustM, 0.4, [x0, 2.55, ZN + 0.5], [x0, 2.55, ZS - 0.5], 3.2, s < 0 ? "wall-w" : "wall-e");
    pipeRun(s < 0 ? pipeBlue : pipeGrey, 0.16, [s * (MW - 0.28), 1.75, ZN + 0.5], [s * (MW - 0.28), 1.75, ZS - 0.5], 4, s < 0 ? "wall-w" : "wall-e");
    pipeRun(pipeYellow, 0.08, [s * (MW - 0.22), 3.2, ZN + 0.5], [s * (MW - 0.22), 3.2, ZS - 0.5], 6, null);
    // cable tray
    B.box(steel, 0.3, 0.05, ZS - ZN - 1, s * (MW - 0.2), 2.05, (ZN + ZS) / 2, { flat: true });
  }
  // overhead cross pipes with drops down the walls
  for (const z of [-15.5, -1, 16]) {
    B.rod(rustM, 0.3, [-MW + 0.6, 4.35, z], [MW - 0.6, 4.35, z], 16, 2);
    k.tube([[-MW + 0.6, 4.35, z], [-MW + 0.45, 4.3, z], [-MW + 0.3, 4.0, z], [-MW + 0.3, 3.3, z]], 0.3, rustM, { seg: 24 });
    k.tube([[MW - 0.6, 4.35, z], [MW - 0.45, 4.3, z], [MW - 0.3, 4.0, z], [MW - 0.3, 3.3, z]], 0.3, rustM, { seg: 24 });
    for (const x of [-3, 0, 3]) B.rod(steel, 0.02, [x, 4.65, z], [x, 6.4, z], 4);
  }
  // vertical pipes with valves on the walkways
  for (const [x, z, face] of [[-MW + 0.3, -8.8, "x"], [MW - 0.3, -16.5, "x"], [MW - 0.3, 1.8, "x"], [-MW + 0.3, 10.0, "x"], [MW - 0.3, 19.5, "x"]] as const) {
    B.cyl(pipeGrey, 0.14, 0.14, WALLH - 0.4, x, FY, z, { seg: 14 });
    B.box(steel, 0.4, 0.25, 0.4, x, FY, z, { flat: true });
    B.cyl(rustBare, 0.2, 0.2, 0.3, x, 1.1, z, { seg: 14 });
    valve(x + (x < 0 ? 0.3 : -0.3), 1.25, z, face, 0.2, x < 0 ? rustM : pipeYellow);
    k.collider(x - 0.25, x + 0.25, z - 0.25, z + 0.25, 0, WALLH, false);
  }

  // ============ WEST OVERFLOW TUNNEL (graffiti section A) ============
  const WX1 = -13.4, WX2 = -9.2, WZ1 = -19, WZ2 = 1;
  slab(WX1, WX2, WZ1, WZ2, floorM);
  for (const [c] of westOpen) slab(WX2, -MW, c - 1.5, c + 1.5, floorM);
  const WH2 = 3.0;
  wallAlongZ(WX1 - 0.15, WZ1, WZ2, WH2, brick);
  wallAlongX(WZ1 - 0.15, WX1 - 0.3, WX2 + 0.3, WH2, brick);
  wallAlongX(WZ2 + 0.15, WX1 - 0.3, WX2 + 0.3, WH2, brick);
  {
    let cur = WZ1;
    for (const [c, w] of westOpen) { wallAlongZ(WX2 + 0.15, cur, c - w / 2, WH2, brick); cur = c + w / 2; }
    wallAlongZ(WX2 + 0.15, cur, WZ2, WH2, brick);
    for (const [c, w] of westOpen) {
      wallAlongX(c - w / 2 - 0.15, WX2, -MW, WH2, brick);
      wallAlongX(c + w / 2 + 0.15, WX2, -MW, WH2, brick);
      B.box(conc2, -MW - WX2, 0.2, w, (WX2 - MW) / 2, WH2 - 0.2, c, { flat: true, uv: 2, world: true });
    }
  }
  B.box(conc2, WX2 - WX1 + 0.6, 0.25, WZ2 - WZ1 + 0.6, (WX1 + WX2) / 2, WH2, (WZ1 + WZ2) / 2, { flat: true, uv: 2.4, world: true });
  for (let z = WZ1 + 1.5; z < WZ2; z += 3) B.box(conc2, WX2 - WX1, 0.3, 0.35, (WX1 + WX2) / 2, WH2 - 0.3, z, { flat: true, uv: 1.2, world: true });
  // a shallow drainage gutter with grate down the middle of the tunnel floor
  const gut = new THREE.PlaneGeometry(0.6, WZ2 - WZ1 - 1);
  gut.rotateX(-Math.PI / 2);
  scaleUV(gut, 0.6 / 0.4, (WZ2 - WZ1 - 1) / 0.4);
  B.geo(grate, gut, (WX1 + WX2) / 2, FY + 0.012, (WZ1 + WZ2) / 2);
  B.box(black, 0.56, 0.01, WZ2 - WZ1 - 1, (WX1 + WX2) / 2, FY + 0.001, (WZ1 + WZ2) / 2, { flat: true });
  // graffiti A all over the tunnel walls
  const ga: [number, number, number, number, Mat][] = [
    [WX1 + 0.01, 1.7, -16.5, Math.PI / 2, grafA], [WX1 + 0.01, 1.6, -11.8, Math.PI / 2, grafA2], [WX1 + 0.01, 1.75, -7.1, Math.PI / 2, grafA],
    [WX1 + 0.01, 1.65, -2.3, Math.PI / 2, grafA2], [WX2 - 0.01, 1.7, -9.0, -Math.PI / 2, grafA2], [WX2 - 0.01, 1.6, -18.2 + 2.4, -Math.PI / 2, grafA],
  ];
  for (const [x, y, z, ry, m] of ga) decal(m, 4.4, 2.2, x, y, z, ry);
  decal(grafA2, 3.6, 1.8, (WX1 + WX2) / 2, 1.6, WZ1 + 0.01, 0);
  decal(grafA, 3.6, 1.8, (WX1 + WX2) / 2, 1.6, WZ2 - 0.01, Math.PI);
  k.panel(1.1, 0.55, -MW - 0.02, 2.2, -12.9, signB2, -Math.PI / 2);
  // props: an old camp — mattress, cardboard, crates, drums, trash bags, tyres
  B.geo(cardboard, new RoundedBoxGeometry(1.9, 0.18, 0.9, 2, 0.06), -12.4, FY + 0.09, -5.6, { ry: 0.06, uv: 1 });
  k.collider(-13.4, -11.4, -6.1, -5.1, FY, FY + 0.18, true);
  for (const [x, z, s, ry] of [[-10.1, -6.8, 0.55, 0.3], [-10.0, -6.1, 0.45, -0.2], [-10.05, -6.45, 0.4, 0.5]] as const) {
    B.box(cardboard, s, s * 0.8, s, x, FY + (s === 0.4 ? 0.44 : 0), z, { ry, uv: 0.6 });
  }
  k.collider(-10.45, -9.65, -7.15, -5.8, FY, FY + 0.8, true);
  for (const [x, z] of [[-12.8, -13.2], [-12.9, -12.5], [-12.2, -13.0]] as const) drum(x, z, drumRust);
  drum(-11.2, -17.9, drumRed, FY, true, 0.4);
  drum(-12.6, -18.2, drumRed);
  drum(-12.8, 0.1, drumBlue);
  for (let i = 0; i < 5; i++) {
    const g = new THREE.SphereGeometry(0.32, 10, 8);
    g.scale(1, 0.85 + rnd() * 0.3, 0.9);
    B.geo(trash, g, -12.7 + (i % 3) * 0.5, FY + 0.27 + (i > 2 ? 0.35 : 0), -9.8 + (i % 2) * 0.4, { ry: i, uv: 0.4 });
  }
  k.collider(-13.1, -11.4, -10.2, -9.2, FY, FY + 0.9, true);
  for (let i = 0; i < 3; i++) B.geo(rubber, new THREE.TorusGeometry(0.3, 0.11, 8, 18), -9.9, FY + 0.11 + i * 0.22, 0.0 - i * 0.03, { rx: Math.PI / 2 });
  k.collider(-10.35, -9.45, -0.45, 0.45, FY, FY + 0.66, true);
  sandbagWall(-11.3, -3.2, 1.2, 3, 0);
  cagedLamp(WX2 - 0.02, 2.4, -8.2, "w", lampFlicker);
  cagedLamp(WX1 + 0.02, 2.4, -15.8, "e", lampDead);
  cagedLamp(WX1 + 0.02, 2.4, -1.2, "e", lampCold);
  pipeRun(pipeGrey, 0.18, [WX1 + 0.3, 2.45, WZ1 + 0.3], [WX1 + 0.3, 2.45, WZ2 - 0.3], 3, "wall-w");
  pipeRun(rustM, 0.12, [WX1 + 0.25, 1.9, WZ1 + 0.3], [WX1 + 0.25, 1.9, WZ2 - 0.3], 4, "wall-w");

  // ============ EAST JUNCTION CHAMBER (graffiti section B) ============
  const EX1 = 8.2, EX2 = 13.6, EZ1 = 2.0, EZ2 = 18.0, EH = 4.0;
  slab(EX1, EX2, EZ1, EZ2, floorM);
  for (const [c] of eastOpen) slab(MW, EX1, c - 1.5, c + 1.5, floorM);
  wallAlongZ(EX2 + 0.15, EZ1, EZ2, EH, conc);
  wallAlongX(EZ2 + 0.15, EX1 - 0.3, EX2 + 0.3, EH, conc);
  {
    let cur = EZ2;
    // wall at EX1 with openings (the passages)
    const segs: [number, number][] = [];
    let a = EZ1;
    for (const [c, w] of eastOpen) { segs.push([a, c - w / 2]); a = c + w / 2; }
    segs.push([a, EZ2]);
    for (const [s, e] of segs) if (e - s > 0.05) wallAlongZ(EX1 - 0.15, s, e, EH, conc);
    for (const [c, w] of eastOpen) {
      wallAlongX(c - w / 2 - 0.15, MW, EX1, WALLH, conc);
      wallAlongX(c + w / 2 + 0.15, MW, EX1, WALLH, conc);
      B.box(conc2, EX1 - MW, 0.25, w, (EX1 + MW) / 2, 2.8, c, { flat: true, uv: 2, world: true });
      B.box(conc2, 0.3, EH - 2.8, w, EX1 - 0.15, 2.8, c, { flat: true, uv: 2, world: true });
    }
    void cur;
  }
  // gallery opening at the chamber's north wall (to the pipe gallery)
  const GX1 = 9.0, GX2 = 12.6, GZ1 = -14.5;
  wallAlongX(EZ1 - 0.15, EX1 - 0.3, GX1, EH, conc);
  wallAlongX(EZ1 - 0.15, GX2, EX2 + 0.3, EH, conc);
  wallAlongX(EZ1 - 0.15, GX1, GX2, EH - 2.8, conc, 2.8);
  // tiled lower walls + corrugated panels in the chamber
  B.box(tileGreen, 0.04, 1.8, EZ2 - EZ1, EX2 - 0.01, FY, (EZ1 + EZ2) / 2, { flat: true, uv: 1.2, world: true });
  B.box(tile, 0.05, 0.14, EZ2 - EZ1, EX2 - 0.02, FY + 1.8, (EZ1 + EZ2) / 2, { flat: true, uv: 1.2, world: true });
  // flat concrete ceiling with beams
  B.box(conc2, EX2 - EX1 + 0.6, 0.3, EZ2 - EZ1 + 0.6, (EX1 + EX2) / 2, EH, (EZ1 + EZ2) / 2, { flat: true, uv: 2.4, world: true });
  for (let z = EZ1 + 2; z < EZ2; z += 4) B.box(conc2, EX2 - EX1, 0.45, 0.45, (EX1 + EX2) / 2, EH - 0.45, z, { flat: true, uv: 1.2, world: true });
  // concrete pillars (grid)
  for (const z of [6, 10, 14]) {
    B.box(conc, 0.8, EH, 0.8, 11.0, 0, z, { flat: true, uv: 1.4, world: true });
    B.box(hazard, 0.82, 0.28, 0.82, 11.0, FY + 0.15, z, { flat: true, su: 2 } as BO);
    k.collider(10.6, 11.4, z - 0.4, z + 0.4, 0, EH, false);
  }
  // graffiti B on chamber walls and pillars
  decal(grafB, 4.8, 2.4, EX2 - 0.03, 2.2, 5.0, -Math.PI / 2);
  decal(grafB2, 4.8, 2.4, EX2 - 0.03, 2.3, 10.2, -Math.PI / 2);
  decal(grafB, 4.8, 2.4, EX2 - 0.03, 2.1, 15.3, -Math.PI / 2);
  decal(grafB2, 4.4, 2.2, (EX1 + EX2) / 2, 1.8, EZ2 - 0.01, Math.PI);
  decal(grafB, 3.0, 1.5, EX1 + 0.01, 1.7, 10.0, Math.PI / 2);
  decal(grafB2, 1.6, 0.8, 11.0, 1.5, 10.41, 0);
  decal(grafB, 1.6, 0.8, 11.0, 1.5, 5.59, Math.PI);
  k.panel(1.0, 0.5, MW + 0.02, 2.2, 8.2, signJ, Math.PI / 2);
  // corrugated metal shed / partition + leaning sheets
  B.box(corr, 0.05, 2.4, 3.2, 9.3, FY, 16.0, { flat: true, uv: 1.6 });
  B.box(corrRed, 2.6, 2.4, 0.05, 10.6, FY, 14.4 + 3.2 - 0.05, { flat: true, uv: 1.6 });
  B.geo(corr, new THREE.BoxGeometry(1.2, 2.2, 0.04), 12.9, FY + 1.05, 3.0, { rx: -0.25, uv: 1.6 });
  B.geo(corrRed, new THREE.BoxGeometry(1.2, 2.2, 0.04), 13.3, FY + 1.05, 12.2, { ry: Math.PI / 2, rz: 0.25, uv: 1.6 } as BO);
  k.collider(9.25, 9.35, 14.4, 17.6, FY, FY + 2.4, false);
  k.collider(12.3, 13.5, 2.6, 3.4, FY, FY + 2.2, false);
  k.collider(13.0, 13.6, 11.6, 12.8, FY, FY + 2.2, false);
  // drums, sandbag bunker, pallets, grate sump
  for (const [x, z, m] of [[12.9, 7.6, drumRed], [12.9, 8.3, drumRed], [12.3, 7.9, drumRust], [12.95, 9.0, drumBlue], [9.0, 3.0, drumRed], [9.7, 2.8, drumRust]] as const) drum(x, z, m);
  drum(12.5, 8.0, drumRed, FY + 0.88);
  drum(9.4, 12.2, drumRust, FY, true, 0.3);
  sandbagWall(9.6, 8.6, 2.4, 4, Math.PI / 2);
  sandbagWall(10.8, 11.8, 1.8, 3, 0);
  const pallet = (x: number, z: number, y: number, ry: number) => {
    for (let i = 0; i < 5; i++) { const lx = -0.5 + i * 0.25; B.geo(wood, new THREE.BoxGeometry(0.1, 0.02, 1.2), x + lx * Math.cos(ry), y + 0.13, z - lx * Math.sin(ry), { ry, uv: 0.5 }); }
    for (const lz of [-0.5, 0, 0.5]) B.geo(wood, new THREE.BoxGeometry(1.2, 0.1, 0.1), x + lz * Math.sin(ry), y + 0.06, z + lz * Math.cos(ry), { ry, uv: 0.5 });
    k.collider(x - 0.6, x + 0.6, z - 0.6, z + 0.6, y, y + 0.14, true);
  };
  pallet(12.8, 16.8, FY, 0.1);
  pallet(12.8, 16.8, FY + 0.14, 0.2);
  B.box(cardboard, 0.8, 0.6, 0.6, 12.8, FY + 0.28, 16.8, { ry: 0.3, uv: 0.6 });
  k.collider(12.3, 13.3, 16.4, 17.2, FY, FY + 0.88, true);
  // sump with grate floor
  const sump = new THREE.PlaneGeometry(1.6, 1.6);
  sump.rotateX(-Math.PI / 2);
  scaleUV(sump, 2, 2);
  B.geo(grate, sump, 11.0, FY + 0.015, 8.0);
  B.box(black, 1.5, 0.01, 1.5, 11.0, FY + 0.002, 8.0, { flat: true });
  cagedLamp(EX2 - 0.02, 2.9, 12.2, "w", lampWarm);
  cagedLamp(11.0, EH - 0.5, 4.0, "down", lampDead);
  // chamber ladder up to a hatch
  ladder(EX2 - 0.2, 17.2, FY, EH, "x");
  B.cyl(steel, 0.5, 0.5, 0.08, EX2 - 0.6, EH - 0.02, 17.2, { seg: 20 });

  // ============ PIPE GALLERY (dead-end tunnel north of the chamber) ============
  const GH = 2.9;
  slab(GX1, GX2, GZ1, EZ1, floorM);
  wallAlongZ(GX1 - 0.15, GZ1, EZ1, GH, conc2);
  wallAlongZ(GX2 + 0.15, GZ1, EZ1, GH, conc2);
  wallAlongX(GZ1 - 0.15, GX1 - 0.3, GX2 + 0.3, GH, conc2);
  B.box(conc2, GX2 - GX1 + 0.6, 0.25, EZ1 - GZ1, (GX1 + GX2) / 2, GH, (GZ1 + EZ1) / 2, { flat: true, uv: 2.4, world: true });
  // gallery separated from main tunnel wall: the space between is solid
  for (const [x, r, m] of [[GX1 + 0.45, 0.35, rustM], [GX2 - 0.4, 0.3, pipeBlue]] as const) {
    pipeRun(m, r, [x, FY + r + 0.15, GZ1 + 0.2], [x, FY + r + 0.15, EZ1 - 0.2], 2.5);
    for (let z = GZ1 + 1; z < EZ1; z += 3) B.box(conc2, r * 2 + 0.1, 0.15, 0.3, x, FY, z, { flat: true, uv: 1 });
    k.collider(x - r, x + r, GZ1, EZ1, FY, FY + r * 2 + 0.15, true);
  }
  pipeRun(pipeYellow, 0.12, [GX1 + 0.25, 2.3, GZ1 + 0.2], [GX1 + 0.25, 2.3, EZ1 - 0.2], 3, "wall-w");
  pipeRun(pipeGrey, 0.2, [GX2 - 0.3, 2.2, GZ1 + 0.2], [GX2 - 0.3, 2.2, EZ1 - 0.2], 3, "wall-e");
  valve(GX1 + 0.45, FY + 1.1, -6.0, "z", 0.25, pipeYellow);
  B.rod(rustBare, 0.06, [GX1 + 0.45, FY + 0.85, -6.0], [GX1 + 0.45, FY + 1.1, -6.0], 8);
  valve(GX2 - 0.4, FY + 1.0, -11.0, "z", 0.22, rustM);
  B.rod(rustBare, 0.06, [GX2 - 0.4, FY + 0.75, -11.0], [GX2 - 0.4, FY + 1.0, -11.0], 8);
  B.box(door, 1.2, 2.1, 0.08, (GX1 + GX2) / 2, FY, GZ1 + 0.02, { flat: true, uv: 1.2 });
  B.box(steel, 0.25, 0.04, 0.06, (GX1 + GX2) / 2 + 0.4, FY + 1.0, GZ1 + 0.08, { flat: true });
  cagedLamp((GX1 + GX2) / 2, GH - 0.1, -7.5, "down", lampCold);
  for (const [x, z] of [[10.8, -13.6], [10.3, -13.7]] as const) drum(x, z, drumRust);
  decal(grafA2, 2.4, 1.2, GX2 - 0.02 - 0.0, 1.5, -2.0, -Math.PI / 2);

  // ============ MAINTENANCE LANDING (south end, hunters arrive here) ============
  wallAlongX(ZS + 0.15, -MW - 0.3, MW + 0.3, WALLH, conc);
  // stairs up to the steel door
  for (let i = 0; i < 6; i++) {
    const y = FY + (i + 1) * 0.2;
    B.box(conc2, 2.4, 0.2, 0.32, -3.4, y - 0.2, ZS - 0.5 - (5 - i) * 0.32 - 0.16, { flat: true, uv: 1, world: true });
    k.collider(-4.6, -2.2, ZS - 0.5 - (5 - i) * 0.32 - 0.32, ZS, 0, y, true);
  }
  B.box(conc2, 2.4, FY + 1.2, 0.5, -3.4, 0, ZS - 0.25, { flat: true, uv: 1, world: true });
  B.box(door, 1.2, 2.2, 0.1, -3.4, FY + 1.2, ZS - 0.04, { flat: true, uv: 1.2 });
  B.box(steel, 1.36, 2.3, 0.06, -3.4, FY + 1.18, ZS - 0.01, { flat: true });
  B.box(steel, 0.25, 0.04, 0.06, -3.0, FY + 2.2, ZS - 0.12, { flat: true });
  k.panel(1.2, 0.6, -3.4, FY + 4.1 - 0.7, ZS - 0.02, signMaint, Math.PI);
  for (const x of [-4.6, -2.2]) {
    B.rod(yellowRail, 0.03, [x, FY + 1.0, ZS - 2.3], [x, FY + 2.2, ZS - 0.5], 8);
    B.box(yellowRail, 0.05, 1.0, 0.05, x, FY, ZS - 2.3, { flat: true });
  }
  cagedLamp(-3.4, FY + 2.75, ZS - 0.1, "n", lampWarm);
  // manhole shaft with light pouring in + ladder
  B.cyl(conc2, 0.75, 0.75, 1.2, 3.5, WALLH + 2.2, 22.0, { seg: 24, open: true, su: 3 });
  B.geo(shaftLight, new THREE.CircleGeometry(0.62, 24), 3.5, WALLH + 3.3, 22.0, { rx: Math.PI / 2 });
  B.box(steel, 0.08, 3.0, 0.08, 3.5 - 0.2, WALLH + 0.2, 22.62, { flat: true });
  ladder(3.5, 22.7, FY, WALLH + 3.2, "z");
  // tool locker, electrical cabinets, hazard barrier, cones, sandbag flood wall
  B.box(door, 0.9, 1.9, 0.5, 5.8, FY, 23.8, { uv: 1 });
  B.box(steel, 0.02, 1.7, 0.02, 5.8, FY + 0.1, 23.54, { flat: true });
  k.collider(5.35, 6.25, 23.55, 24.05, FY, FY + 1.9, true);
  B.box(pipeGrey, 0.7, 1.0, 0.3, MW - 0.16, FY + 0.9, 20.8, { uv: 1 });
  B.box(pipeGrey, 0.5, 0.7, 0.25, MW - 0.14, FY + 1.1, 19.9, { uv: 1 });
  B.rod(rubber, 0.03, [MW - 0.1, FY + 1.9, 20.8], [MW - 0.1, WALLH, 20.8], 5);
  for (const [x, z] of [[-1.6, 17.6], [-0.8, 17.5], [0.9, 17.55], [1.7, 17.6]] as const) {
    B.cyl(cone, 0.03, 0.17, 0.62, x, FY + 0.04, z, { seg: 12 });
    B.box(rubber, 0.36, 0.04, 0.36, x, FY, z, { flat: true });
  }
  B.box(hazard, 3.6, 0.2, 0.05, 0, FY + 0.7, 17.35, { flat: true, su: 6 } as BO);
  for (const x of [-1.8, 1.8]) B.box(steel, 0.05, 0.9, 0.05, x, FY, 17.35, { flat: true });
  k.collider(-2.2, 2.2, 17.2, 17.5, FY, FY + 0.9, false);
  sandbagWall(-5.2, 18.6, 2.4, 3, Math.PI / 2);
  sandbagWall(5.3, 17.9, 1.8, 2, Math.PI / 2 + 0.1);
  // drums stored in the niche behind the stairs
  drum(-5.75, 22.55, drumRed);
  drum(-5.8, 23.25, drumRed);
  drum(-5.7, 23.95, drumBlue);
  drum(-5.75, 23.3, drumRust, FY + 0.88);

  // ============ MAIN TUNNEL PROPS ============
  // north end: pump platform with valves, drums, sandbags
  sandbagWall(-5.4, -22.6, 1.2, 3, 0);
  for (const [x, z, m] of [[4.2, -23.2, drumRed], [4.9, -23.0, drumRust], [5.6, -23.3, drumBlue]] as const) drum(x, z, m);
  drum(5.5, -22.2, drumRust, FY, true, 0);
  B.box(plate, 2.0, 0.9, 1.4, -5.3, FY, -18.0, { uv: 1 });
  B.cyl(pipeGrey, 0.35, 0.35, 0.9, -5.3, FY + 0.9, -18.0, { seg: 18 });
  valve(-5.3, FY + 2.0, -18.0, "z", 0.3, pipeYellow);
  B.rod(steel, 0.05, [-5.3, FY + 1.8, -18.0], [-5.3, FY + 2.0, -18.0], 8);
  k.collider(-6.3, -4.3, -18.7, -17.3, FY, FY + 1.8, true);
  // mid tunnel west walkway: crates, pallet, drums by the overflow openings
  const crateM = wood;
  B.box(crateM, 0.9, 0.9, 0.9, -5.7, FY, -21.0, { uv: 0.9 });
  B.box(crateM, 0.7, 0.7, 0.7, -5.7, FY + 0.9, -21.1, { ry: 0.3, uv: 0.9 });
  k.collider(-6.15, -5.25, -21.45, -20.55, FY, FY + 1.6, true);
  for (const [x, z, m] of [[-5.9, -0.2, drumRed], [-5.3, 0.1, drumRust]] as const) drum(x, z, m);
  sandbagWall(-5.9, 2.8, 1.8, 2, Math.PI / 2);
  for (const [x, z, m] of [[5.9, -13.2, drumRed], [5.95, -12.5, drumRed], [5.3, -12.9, drumBlue]] as const) drum(x, z, m);
  drum(5.6, -12.85, drumRust, FY + 0.88);
  sandbagWall(4.6, -19.5, 2.4, 3, 0);
  sandbagWall(5.7, 9.8, 1.8, 3, Math.PI / 2);
  for (const [x, z, m] of [[-5.9, 7.2, drumRed], [-5.8, 6.5, drumRust]] as const) drum(x, z, m);
  drum(-4.9, 6.8, drumRed, FY, true, 0.2);
  pallet(-5.6, 14.8, FY, 0.2);
  B.box(cardboard, 0.7, 0.5, 0.6, -5.6, FY + 0.14, 14.8, { ry: 0.5, uv: 0.6 });
  B.box(cardboard, 0.5, 0.4, 0.45, -5.5, FY + 0.64, 14.75, { ry: 0.2, uv: 0.6 });
  k.collider(-6.1, -5.1, 14.3, 15.3, FY, FY + 1.1, true);
  // corrugated sheets leaning on the walls
  B.geo(corr, new THREE.BoxGeometry(0.04, 2.3, 1.0), -MW + 0.35, FY + 1.1, -6.2, { rz: -0.14, uv: 1.6 });
  B.geo(corrRed, new THREE.BoxGeometry(0.04, 2.3, 1.0), -MW + 0.4, FY + 1.1, -5.3, { rz: -0.16, ry: 0.1, uv: 1.6 } as BO);
  k.collider(-MW, -MW + 0.6, -6.8, -4.8, FY, FY + 2.3, false);
  B.geo(corr, new THREE.BoxGeometry(0.04, 2.3, 1.1), MW - 0.35, FY + 1.1, 4.0, { rz: 0.14, uv: 1.6 });
  k.collider(MW - 0.6, MW, 3.4, 4.6, FY, FY + 2.3, false);
  // graffiti tags scattered in the main tunnel ("everywhere")
  decal(grafB2, 4.0, 2.0, -MW + 0.03, 1.55, -9.0, Math.PI / 2);
  decal(grafA, 4.0, 2.0, MW - 0.03, 1.6, -7.0, -Math.PI / 2);
  decal(grafB, 3.6, 1.8, -MW + 0.03, 1.6, 8.2, Math.PI / 2);
  decal(grafA2, 3.6, 1.8, MW - 0.03, 1.5, -21.0, -Math.PI / 2);
  decal(grafB, 3.0, 1.5, 0, 2.9, ZN + 0.02, 0);
  k.panel(1.1, 0.55, CH + 0.56, 1.7, -3.61, signDanger, 0);
  k.panel(1.1, 0.55, -CH - 0.56, 1.7, 9.61, signDanger, 0);
  // puddles on the walkways
  for (const [x, z, r] of [[4.0, -15.0, 0.9], [-4.4, -12.5, 0.7], [3.6, 3.0, 1.1], [-3.8, 12.0, 0.8], [0.6, 20.0, 1.2], [-11.0, -12.0, 0.9], [11.6, 13.0, 0.9]] as const) {
    const g = new THREE.CircleGeometry(r, 20);
    g.rotateX(-Math.PI / 2);
    g.scale(1, 1, 0.6);
    B.geo(puddle, g, x, FY + 0.006, z, { ry: rnd() * 3 });
  }
  // moss clumps at the channel edge
  for (let i = 0; i < 16; i++) {
    const g = new THREE.SphereGeometry(0.25 + rnd() * 0.2, 8, 6);
    g.scale(1.6, 0.35, 1);
    B.geo(moss, g, (rnd() < 0.5 ? -1 : 1) * (CH + 0.03), WY + 0.04, ZN + 2 + rnd() * 38, { uv: 0.5 });
  }
  // wall lamps in the main tunnel (sparse, some dead)
  cagedLamp(MW - 0.02, 2.95, -5.0, "w", lampWarm);
  cagedLamp(-MW + 0.02, 2.95, -17.0 + 1.3, "e", lampCold);
  cagedLamp(MW - 0.02, 2.95, -22.0, "w", lampDead);
  cagedLamp(-MW + 0.02, 2.95, 5.0, "e", lampFlicker);
  cagedLamp(MW - 0.02, 2.95, 11.5, "w", lampDead);
  cagedLamp(-MW + 0.02, 2.95, -9.8, "e", lampDead);

  B.flush();
  // flicker: fluorescent-ish tube lamps stutter; murky water drifts slowly
  const flickMesh = B.meshes.get(lampFlicker);
  let lights: THREE.PointLight[] | null = null;
  if (flickMesh) {
    flickMesh.onBeforeRender = (_r, scene) => {
      const t = performance.now() / 1000;
      const n = Math.sin(t * 13.1) * Math.sin(t * 7.3 + 1.2) + Math.sin(t * 2.1);
      const on = n > -0.6 ? 1 : 0.08;
      const v = on * (0.85 + 0.15 * Math.sin(t * 50));
      lampFlicker.m.emissiveIntensity = 2.6 * v;
      if (!lights) { lights = []; scene.traverse((o) => { if ((o as THREE.PointLight).isPointLight) lights!.push(o as THREE.PointLight); }); for (const l of lights) l.userData.base = l.intensity; }
      for (const l of lights) if (l.userData.flicker === undefined) l.userData.flicker = Math.abs(l.position.x - (WX2 - 0.5)) < 0.8 || (Math.abs(l.position.x + MW - 0.6) < 0.8 && Math.abs(l.position.z - 5) < 1);
      for (const l of lights) if (l.userData.flicker) l.intensity = (l.userData.base as number) * v;
    };
  }
  const waterMesh = B.meshes.get(waterM);
  if (waterMesh) waterMesh.onBeforeRender = () => {
    const t = performance.now() / 1000;
    waterM.m.map!.offset.set(Math.sin(t * 0.1) * 0.02, -t * 0.015);
    if (waterM.m.normalMap) waterM.m.normalMap.offset.copy(waterM.m.map!.offset);
  };

  // ---------- fill everything that isn't walkable with solid colliders (no unreachable pockets) ----------
  const walk: R[] = [
    [-MW, MW, ZN, ZS],
    [WX1, WX2, WZ1, WZ2],
    [WX2 - 0.1, -MW + 0.1, westOpen[0][0] - 1.5, westOpen[0][0] + 1.5],
    [WX2 - 0.1, -MW + 0.1, westOpen[1][0] - 1.5, westOpen[1][0] + 1.5],
    [EX1, EX2, EZ1, EZ2],
    [MW - 0.1, EX1 + 0.1, eastOpen[0][0] - 1.5, eastOpen[0][0] + 1.5],
    [MW - 0.1, EX1 + 0.1, eastOpen[1][0] - 1.5, eastOpen[1][0] + 1.5],
    [GX1, GX2, GZ1, EZ1 + 0.1],
  ];
  const BX0 = -13.8, BX1 = 13.8, BZ0 = ZN, BZ1 = ZS;
  const cs = 0.5;
  const nx = Math.round((BX1 - BX0) / cs), nz = Math.round((BZ1 - BZ0) / cs);
  const solid: boolean[][] = [];
  for (let j = 0; j < nz; j++) {
    solid.push([]);
    for (let i = 0; i < nx; i++) {
      const x = BX0 + (i + 0.5) * cs, z = BZ0 + (j + 0.5) * cs;
      solid[j].push(!walk.some(([a, b, c, d]) => x > a && x < b && z > c && z < d));
    }
  }
  for (let j = 0; j < nz; j++) {
    let i = 0;
    while (i < nx) {
      if (!solid[j][i]) { i++; continue; }
      let e = i;
      while (e < nx && solid[j][e]) e++;
      k.collider(BX0 + i * cs, BX0 + e * cs, BZ0 + j * cs, BZ0 + (j + 1) * cs, 0, 6, false);
      i = e;
    }
  }

  k.room("Maintenance Entrance", -MW, MW, 17, ZS);
  k.room("Outfall", -MW, MW, ZN, -19);
  k.room("Main Channel", -MW, MW, -19, 17);
  k.room("Overflow Tunnel B-2", WX1, -MW, WZ1, WZ2);
  k.room("Junction Chamber J-7", MW, EX2, EZ1, EZ2);
  k.room("Pipe Gallery", GX1, GX2, GZ1, EZ1);

  // hiders: both walkways between the bridges; hunters: maintenance landing
  const hiders: THREE.Vector3[] = [];
  for (let i = 0; i < 15; i++) hiders.push(new THREE.Vector3(-4.9 + (i % 3) * 1.0, FY, -9.3 + Math.floor(i / 3) * 1.0));
  for (let i = 0; i < 9; i++) hiders.push(new THREE.Vector3(3.3 + (i % 3) * 1.1, FY, -8.6 + Math.floor(i / 3) * 1.2));
  // safety: push any spawn that sits inside furniture (nav inflates obstacles by 0.45 m) to the nearest clear nav cell
  {
    const cellC = (v: number, o: number) => o + (Math.floor((v - o) / 0.5) + 0.5) * 0.5;
    const blockedAt = (px: number, pz: number) => {
      const x = cellC(px, -13.8), z = cellC(pz, -24);
      return k.obstacles.some((o) => o.top > 0.46 && o.bottom < 1.6 && x > o.minX - 0.5 && x < o.maxX + 0.5 && z > o.minZ - 0.5 && z < o.maxZ + 0.5);
    };
    for (const v of hiders) {
      if (!blockedAt(v.x, v.z)) continue;
      search: for (let d = 0.25; d < 3; d += 0.25) for (let a = 0; a < 16; a++) {
        const x = v.x + Math.cos((a / 16) * Math.PI * 2) * d, z = v.z + Math.sin((a / 16) * Math.PI * 2) * d;
        if (!blockedAt(x, z)) { v.x = x; v.z = z; break search; }
      }
    }
  }
  const hunters: THREE.Vector3[] = [];
  for (let i = 0; i < 9; i++) hunters.push(new THREE.Vector3(-1.2 + (i % 3) * 1.2, FY, 20.6 + Math.floor(i / 3) * 1.2));

  return k.finish({
    id: "sewer", name: "Sewer",
    bounds: { minX: BX0, maxX: BX1, minZ: BZ0, maxZ: BZ1 },
    hunterSpawns: hunters, hiderSpawns: hiders,
    preview: { pos: [-4.2, 2.3, 16.0], look: [1.0, 1.2, -14], fov: 64 },
    lighting: {
      sky: "#070907",
      hemi: ["#8fa08a", "#1d1a12", 0.32],
      sun: null,
      fog: ["#0e120d", 5, 34],
      points: [
        { pos: [-3.4, FY + 2.4, ZS - 0.8], color: "#ffcf8a", int: 26, dist: 16 },
        { pos: [MW - 0.6, 2.8, -5.0], color: "#ffb45e", int: 24, dist: 14 },
        { pos: [-MW + 0.6, 2.8, -15.7], color: "#b5ffd9", int: 18, dist: 13 },
        { pos: [WX2 - 0.5, 2.3, -8.2], color: "#dcecff", int: 16, dist: 12 },
        { pos: [EX2 - 0.6, 2.8, 12.2], color: "#ffc277", int: 22, dist: 13 },
        { pos: [3.5, 3.4, 22.0], color: "#bcd8ff", int: 14, dist: 9 },
      ],
      exposure: 1.15,
      hdri: "warehouse",
      env: 0.16,
    },
  });
}
