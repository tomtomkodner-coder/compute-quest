// Sugarland (シュガーランド): an outdoor land of sweets under a bright pastel sky.
// Candy mountains with icing caps ring the horizon; inside the wafer/candy-cane fences: a gingerbread village
// (enterable houses with icing-scale roofs), crowds of gingerbread cookie figures, a giant white strawberry cake on
// a frosting plaza, a glossy chocolate river with a wafer bridge and chocolate hills, a lollipop & candy-cane forest
// with a cotton-candy tree, a macaron & donut garden, hard-candy rocks, gumdrops everywhere and a small pastel
// "locker corner". Hunters enter through the candy-cane arch (south) when the search starts.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import * as T from "../textures";
import * as S from "./tex/sugarland";
import { Kit, type Mat, type World } from "./kit";

type G = THREE.BufferGeometry;
type V3t = [number, number, number];
const V3 = THREE.Vector3;

// ---------------------------------------------------------------------------------------------
// batching helpers (merge everything per material → few draw calls)
function boxUV(g: G, unit: number, ou = 0, ov = 0) {
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
function scaleUV(g: G, su: number, sv: number) {
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
}
type BO = { rx?: number; ry?: number; rz?: number; s?: number | V3t; solid?: boolean; stand?: boolean; uv?: number; world?: boolean; su?: number; sv?: number; parent?: THREE.Matrix4; seg?: number };
class Batch {
  private lists = new Map<Mat, G[]>();
  private flags = new Map<Mat, { noShadow?: boolean }>();
  private rnd = S.sgRng(77);
  constructor(private k: Kit) {}
  opt(m: Mat, f: { noShadow?: boolean }) { this.flags.set(m, f); }
  geo(m: Mat, g: G, x: number, y: number, z: number, o: BO = {}) {
    if (o.uv && !o.world) boxUV(g, o.uv, this.rnd(), this.rnd());
    if (o.su || o.sv) scaleUV(g, o.su ?? 1, o.sv ?? 1);
    const e = new THREE.Euler(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0, "YXZ");
    const sc = typeof o.s === "number" ? new V3(o.s, o.s, o.s) : o.s ? new V3(...o.s) : new V3(1, 1, 1);
    g.applyMatrix4(new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(e), sc));
    if (o.parent) g.applyMatrix4(o.parent);
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
    const g = mn < 0.06 || mx > 6 ? new THREE.BoxGeometry(w, h, d) : new RoundedBoxGeometry(w, h, d, 2, Math.min(0.04, mn * 0.2));
    return this.geo(m, g, x, y + h / 2, z, o);
  }
  cyl(m: Mat, rt: number, rb: number, h: number, x: number, y: number, z: number, o: BO & { seg?: number; open?: boolean } = {}) {
    return this.geo(m, new THREE.CylinderGeometry(rt, rb, h, o.seg ?? 20, 1, o.open), x, y + h / 2, z, o);
  }
  lathe(m: Mat, pts: [number, number][], x: number, y: number, z: number, o: BO & { seg?: number } = {}) {
    return this.geo(m, new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(Math.max(0, r), h)), o.seg ?? 24), x, y, z, o);
  }
  sphere(m: Mat, r: number, x: number, y: number, z: number, o: BO & { ws?: number; hs?: number } = {}) {
    return this.geo(m, new THREE.SphereGeometry(r, o.ws ?? 18, o.hs ?? 12), x, y, z, o);
  }
  tube(m: Mat, pts: V3t[], r: number, o: { seg?: number; rs?: number; closed?: boolean; su?: number; sv?: number } = {}) {
    const c = new THREE.CatmullRomCurve3(pts.map((p) => new V3(...p)), !!o.closed, "centripetal");
    return this.geo(m, new THREE.TubeGeometry(c, o.seg ?? Math.max(8, pts.length * 6), r, o.rs ?? 8, !!o.closed), 0, 0, 0, { su: o.su, sv: o.sv });
  }
  /** cylinder between two points */
  rod(m: Mat, r: number, a: V3t, b: V3t, seg = 10) {
    const va = new V3(...a), vb = new V3(...b);
    const g = new THREE.CylinderGeometry(r, r, va.distanceTo(vb), seg, 1);
    const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), vb.clone().sub(va).normalize());
    g.applyMatrix4(new THREE.Matrix4().compose(va.clone().add(vb).multiplyScalar(0.5), q, new V3(1, 1, 1)));
    return this.geo(m, g, 0, 0, 0);
  }
  flush() {
    for (const [m, l] of this.lists) if (l.length) this.k.merged(l, m, { noShadow: this.flags.get(m)?.noShadow });
    this.lists.clear();
  }
}

// ---------------------------------------------------------------------------------------------
// shapes

/** gingerbread-man outline (height 1, feet at y=0, width ≈0.97), CCW */
function gingerOutline(): THREE.Vector2[] {
  const R: [number, number][] = [];
  const arc = (cx: number, cy: number, r: number, a0: number, a1: number, n: number) => {
    for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; R.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  };
  R.push([0, 0.37]);
  R.push([0.045, 0.3], [0.06, 0.2]);
  arc(0.155, 0.1, 0.098, Math.PI, Math.PI * 2, 10);
  R.push([0.25, 0.22], [0.245, 0.36], [0.225, 0.46], [0.225, 0.535]);
  R.push([0.31, 0.56]);
  arc(0.405, 0.64, 0.078, -Math.PI / 2 - 0.25, Math.PI / 2 + 0.1, 10);
  R.push([0.3, 0.715], [0.19, 0.725], [0.11, 0.745]);
  arc(0, 0.862, 0.14, Math.atan2(0.745 - 0.862, 0.11), Math.PI / 2, 12);
  const pts = R.map(([x, y]) => new THREE.Vector2(x, y));
  for (let i = R.length - 2; i > 0; i--) pts.push(new THREE.Vector2(-R[i][0], R[i][1]));
  return pts;
}
/** inset a closed CCW polygon by d */
function inset(pts: THREE.Vector2[], d: number) {
  const n = pts.length;
  return pts.map((p, i) => {
    const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    const t = b.clone().sub(a).normalize();
    return new THREE.Vector2(p.x - t.y * d, p.y + t.x * d);
  });
}

// ---------------------------------------------------------------------------------------------

export function buildSugarland(): World {
  const k = new Kit(3, 2.4);
  const B = new Batch(k);
  const rnd = S.sgRng(2024);

  // ---------------- materials ----------------
  const ground = k.mat(k.tex("sg-ground", S.sgGround), "#ffffff", [1, 1], { roughness: 0.8, bump: 0.45 });
  const pathM = k.mat(k.tex("sg-path", S.sgPath), "#ffffff", [1, 1], { roughness: 0.7, bump: 0.8 });
  const frostPink = k.mat(k.tex("sg-frostp", () => S.sgFrosting("#ffc2dc", 12, 80)), "#ffffff", [1, 1], { roughness: 0.5, bump: 0.3 });
  const ginger = k.mat(k.tex("sg-ginger", S.sgGinger), "#ffffff", [1, 1], { roughness: 0.78, bump: 0.9 });
  const icing = k.mat(null, "#fffaf4", [1, 1], { roughness: 0.32 });
  const icingPink = k.mat(null, "#ff8fbf", [1, 1], { roughness: 0.3 });
  const roofs = [
    k.mat(k.tex("sg-roofp", () => S.sgRoof("#ff8fbf")), "#ffffff", [1, 1], { roughness: 0.35, bump: 0.6 }),
    k.mat(k.tex("sg-roofm", () => S.sgRoof("#7fdcc0")), "#ffffff", [1, 1], { roughness: 0.35, bump: 0.6 }),
    k.mat(k.tex("sg-roofl", () => S.sgRoof("#b69cff")), "#ffffff", [1, 1], { roughness: 0.35, bump: 0.6 }),
  ];
  const wafer = k.mat(k.tex("sg-wafer", S.sgWafer), "#ffffff", [1, 1], { roughness: 0.75, bump: 1.0 });
  const choc = k.mat(k.tex("sg-choc", S.sgChoc), "#ffffff", [1, 1], { roughness: 0.2, bump: 0.25 });
  const chocBar = k.mat(k.tex("sg-chocbar", () => S.sgChocBar()), "#ffffff", [1, 1], { roughness: 0.3, bump: 0.8 });
  const milkChoc = k.mat(k.tex("sg-milkbar", () => S.sgChocBar("#8a4b25", 9)), "#ffffff", [1, 1], { roughness: 0.3, bump: 0.8 });
  const milk = k.mat(null, "#8f5230", [1, 1], { roughness: 0.22 });
  const stripeR = k.mat(k.tex("sg-str", () => S.sgStripe("#e8173a", "#ffffff", "#ff9bb0")), "#ffffff", [1, 1], { roughness: 0.18, bump: 0 });
  const stripeG = k.mat(k.tex("sg-stg", () => S.sgStripe("#1fb58f", "#ffffff", "#9ff0d8")), "#ffffff", [1, 1], { roughness: 0.18, bump: 0 });
  const stripeP = k.mat(k.tex("sg-stp", () => S.sgStripe("#ff5fa2", "#ffffff", "#ffd23f")), "#ffffff", [1, 1], { roughness: 0.18, bump: 0 });
  const swirls = [
    k.mat(k.tex("sg-sw1", () => S.sgSwirl("#ff3d7f", "#ffd23f")), "#ffffff", [1, 1], { roughness: 0.12, bump: 0 }),
    k.mat(k.tex("sg-sw2", () => S.sgSwirl("#5e7bff", "#3bceac")), "#ffffff", [1, 1], { roughness: 0.12, bump: 0 }),
    k.mat(k.tex("sg-sw3", () => S.sgSwirl("#b56bff", "#ff8c42")), "#ffffff", [1, 1], { roughness: 0.12, bump: 0 }),
    k.mat(k.tex("sg-sw4", () => S.sgSwirl("#ff5fa2", "#7fdcc0", "#fff6a8")), "#ffffff", [1, 1], { roughness: 0.12, bump: 0 }),
  ];
  const stick = k.mat(null, "#fbf8f2", [1, 1], { roughness: 0.55 });
  const sugarTex = k.tex("sg-sugar", S.sgSugar);
  const gumCols = ["#ff4f6d", "#ffc93c", "#5fd068", "#3d8bff", "#a45cff", "#ff8c42", "#ff7ac6"];
  const gums = gumCols.map((c) => k.mat(sugarTex, c, [2, 2], { roughness: 0.62, bump: 0.5 }));
  const hard = ["#ff6fa8", "#6fd7ff", "#ffe066", "#b18cff", "#6ff0b5"].map((c) => k.mat(null, c, [1, 1], { roughness: 0.08, metalness: 0.05 }));
  const cream = k.mat(k.tex("sg-cream", () => S.sgCream()), "#ffffff", [1, 1], { roughness: 0.5, bump: 0.3 });
  const berry = k.mat(k.tex("sg-berry", S.sgStrawberry), "#ffffff", [1, 1], { roughness: 0.25, bump: 0.4 });
  const leaf = k.mat(null, "#3fae4a", [1, 1], { roughness: 0.5 });
  const glazePink = k.mat(null, "#ff7fb4", [1, 1], { roughness: 0.15 });
  const flame = k.mat(null, "#ffb938", [1, 1], { emissive: "#ffa928", emissiveIntensity: 2.2 });
  const dough = k.mat(k.tex("sg-dough", S.sgDough), "#ffffff", [1, 1], { roughness: 0.7, bump: 0.6 });
  const donutIcings = [
    k.mat(k.tex("sg-ice1", () => S.sgIcing("#ff8fbf", 1)), "#ffffff", [1, 1], { roughness: 0.22, bump: 0.2 }),
    k.mat(k.tex("sg-ice2", () => S.sgIcing("#5a2f1a", 2)), "#ffffff", [1, 1], { roughness: 0.2, bump: 0.2 }),
    k.mat(k.tex("sg-ice3", () => S.sgIcing("#9ff0d8", 3)), "#ffffff", [1, 1], { roughness: 0.22, bump: 0.2 }),
    k.mat(k.tex("sg-ice4", () => S.sgIcing("#fff4d6", 4)), "#ffffff", [1, 1], { roughness: 0.22, bump: 0.2 }),
  ];
  const macs = [["#ff9ec4", 1], ["#a6ecd2", 2], ["#c8b2ff", 3], ["#ffe38a", 4], ["#ffb58a", 5]].map(([c, s]) => k.mat(k.tex("sg-mac" + s, () => S.sgMacaron(c as string, s as number)), "#ffffff", [1, 1], { roughness: 0.6, bump: 0.35 }));
  const cottonP = k.mat(k.tex("sg-cotp", () => S.sgCotton("#ffb3d9", 44)), "#ffffff", [2, 2], { roughness: 0.95, bump: 0.8 });
  const cottonB = k.mat(k.tex("sg-cotb", () => S.sgCotton("#b5e3ff", 45)), "#ffffff", [2, 2], { roughness: 0.95, bump: 0.8 });
  const cloudM = k.mat(k.tex("sg-cotw", () => S.sgCotton("#fff4fa", 46)), "#ffffff", [2, 2], { roughness: 1, bump: 0.5 });
  const pepper = k.mat(k.tex("sg-pep", S.sgPeppermint), "#ffffff", [1, 1], { roughness: 0.12, bump: 0 });
  const glass = k.mat(null, "#ffd98a", [1, 1], { roughness: 0.1, emissive: "#ffb347", emissiveIntensity: 0.55 });
  const signM = k.mat(k.tex("sg-sign", S.sgSign), "#ffffff", [1, 1], { roughness: 0.4, bump: 0.2 });
  const lockers = [["#ffb3cf", "01"], ["#a6ecd2", "02"], ["#c8b2ff", "03"], ["#ffe38a", "04"], ["#9fd8ff", "05"], ["#ffb3cf", "06"]].map(([c, n], i) =>
    k.mat(k.tex("sg-lock" + i, () => S.sgLocker(c, n, i + 3)), "#ffffff", [1, 1], { roughness: 0.35, metalness: 0.25, bump: 0.5 }));
  const lockerBody = k.mat(null, "#f3e6ee", [1, 1], { roughness: 0.4, metalness: 0.3 });
  const tileM = k.mat(k.tex("sg-tile", () => T.checker("#ffe0ee", "#fff7fb", 8)), "#ffffff", [1, 1], { roughness: 0.25, bump: 0.3 });
  const mountainMats = [
    k.mat(k.tex("sg-mt1", () => S.sgMountain(["#ffb3d1", "#fff0f6", "#ff8fbf", "#ffe0ec"], 2)), "#ffffff", [3, 1], { roughness: 0.6, bump: 0.2 }),
    k.mat(k.tex("sg-mt2", () => S.sgMountain(["#a8ecd6", "#f0fff9", "#6fd7b8", "#d5f7ec"], 5)), "#ffffff", [3, 1], { roughness: 0.6, bump: 0.2 }),
    k.mat(k.tex("sg-mt3", () => S.sgMountain(["#c9b6ff", "#f5f0ff", "#a58cff", "#e4dbff"], 8)), "#ffffff", [3, 1], { roughness: 0.6, bump: 0.2 }),
    k.mat(k.tex("sg-mt4", () => S.sgMountain(["#ffe38a", "#fffbe6", "#ffc94d", "#ffeeb8"], 11)), "#ffffff", [3, 1], { roughness: 0.6, bump: 0.2 }),
  ];
  const snowCap = k.mat(k.tex("sg-cap", () => S.sgCream("#ffffff", 5)), "#ffffff", [3, 1], { roughness: 0.45, bump: 0.2 });
  const hillMats = [
    k.mat(k.tex("sg-hillp", () => S.sgFrosting("#ffc6de", 21, 90)), "#ffffff", [3, 2], { roughness: 0.55, bump: 0.2 }),
    k.mat(k.tex("sg-hillm", () => S.sgFrosting("#b8f0d8", 22, 90)), "#ffffff", [3, 2], { roughness: 0.55, bump: 0.2 }),
  ];
  for (const m of [...mountainMats, snowCap, ...hillMats, cloudM]) B.opt(m, { noShadow: true });
  Object.entries({ ground, pathM, frostPink, ginger, icing, icingPink, wafer, choc, chocBar, milkChoc, milk, stripeR, stripeG, stripeP, stick, cream, berry, leaf, glazePink, dough, cottonP, cottonB, cloudM, pepper, glass, snowCap, lockerBody }).forEach(([n, m]) => (m.m.name = n));
  [["roof", roofs], ["swirl", swirls], ["gum", gums], ["hard", hard], ["ice", donutIcings], ["mac", macs], ["mt", mountainMats], ["hill", hillMats], ["lock", lockers]].forEach(([n, l]) => (l as Mat[]).forEach((m, i) => (m.m.name = `${n}${i}`)));

  // ---------------- ground ----------------
  const X0 = -24, X1 = 24, Z0 = -21, Z1 = 21;
  k.floor(-120, 120, -120, 120, ground, 3.2);
  // pink frosting plaza around the cake
  const plaza = new THREE.CircleGeometry(9.5, 48);
  plaza.rotateX(-Math.PI / 2);
  scaleUV(plaza, 3.5, 3.5);
  B.geo(frostPink, plaza, 0, 0.012, -4.5);
  B.opt(frostPink, { noShadow: true });
  // biscuit paths (ribbons following curves)
  const ribbon = (m: Mat, pts: [number, number][], w: number, y: number, unit: number) => {
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new V3(x, 0, z)), false, "centripetal");
    const N = Math.max(12, Math.round(curve.getLength() / 0.5));
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    let dist = 0;
    let prev = curve.getPoint(0);
    for (let i = 0; i <= N; i++) {
      const t = i / N, p = curve.getPoint(t), tg = curve.getTangent(t);
      dist += p.distanceTo(prev); prev = p;
      const nx = -tg.z, nz = tg.x;
      pos.push(p.x + nx * w / 2, y, p.z + nz * w / 2, p.x - nx * w / 2, y, p.z - nz * w / 2);
      uv.push(0, dist / unit, w / unit, dist / unit);
      if (i < N) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    // make sure normals face up
    const nr = g.attributes.normal;
    if (nr.getY(0) < 0) { for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } g.setIndex(idx); g.computeVertexNormals(); }
    B.geo(m, g, 0, 0, 0);
    return curve;
  };
  B.opt(pathM, { noShadow: true });
  ribbon(pathM, [[0, 22], [0.3, 16], [-0.4, 10], [0, 5.2]], 2.6, 0.02, 3.2);
  ribbon(pathM, [[-8.6, -3], [-12, 1.5], [-15.5, 4.6], [-19, 6.5], [-23, 7]], 2.2, 0.02, 3.2);
  ribbon(pathM, [[-2.4, 10], [-6, 12.4], [-10, 13.5]], 2.0, 0.021, 3.2);
  ribbon(pathM, [[8.5, -3.2], [10, 1.4], [16.8, 3.2], [20, 8], [21, 14]], 2.2, 0.02, 3.2);
  ribbon(pathM, [[-5, -13], [-8, -17], [-9, -22]], 2.0, 0.02, 3.2);

  // ---------------- chocolate river (east) ----------------
  const riverPts: [number, number][] = [[7, -40], [8.4, -22], [10.6, -13], [13.6, -6], [13.2, 1], [11.6, 6], [12.3, 13], [14.6, 22], [16, 40]];
  B.opt(choc, { noShadow: true });
  const riverCurve = ribbon(choc, riverPts, 3.8, 0.03, 4);
  // whipped-cream banks
  for (const side of [-1, 1]) {
    const bank: V3t[] = [];
    for (let i = 0; i <= 90; i++) {
      const t = 0.12 + (i / 90) * 0.76, p = riverCurve.getPoint(t), tg = riverCurve.getTangent(t);
      const off = 2.05 + Math.sin(i * 1.7) * 0.06;
      bank.push([p.x - tg.z * off * side, 0.05, p.z + tg.x * off * side]);
    }
    B.tube(icing, bank, 0.2, { seg: 260, rs: 8 });
  }
  // chocolate droplets & swirls floating
  for (let i = 0; i < 9; i++) {
    const t = 0.18 + i * 0.075, p = riverCurve.getPoint(t);
    B.geo(milk, new THREE.TorusGeometry(0.35 + rnd() * 0.3, 0.05, 6, 20), p.x + (rnd() - 0.5) * 1.6, 0.04, p.z, { rx: Math.PI / 2 });
  }
  // wafer bridge over the river at z≈4
  {
    const bz = 4.6, bx0 = 8.3, bx1 = 16.3, W = 2.4, steps = 9;
    const cx = (bx0 + bx1) / 2, L = bx1 - bx0;
    for (let i = 0; i < steps; i++) {
      const u = (i + 0.5) / steps, x = bx0 + u * L;
      const h = 0.2 + Math.sin(u * Math.PI) * 0.75;
      B.box(wafer, L / steps + 0.02, 0.22, W, x, h - 0.22, bz, { uv: 0.6, rz: Math.cos(u * Math.PI) * -0.28 });
      k.collider(x - L / steps / 2, x + L / steps / 2, bz - W / 2, bz + W / 2, 0, h, true);
      // wafer supports
    }
    // arch sides (chocolate)
    for (const s of [-1, 1]) {
      const sh = new THREE.Shape();
      sh.moveTo(-L / 2, 0);
      for (let i = 0; i <= 24; i++) { const u = i / 24; sh.lineTo(-L / 2 + u * L, 0.15 + Math.sin(u * Math.PI) * 0.72); }
      sh.lineTo(L / 2, 0);
      const hole = new THREE.Path();
      hole.moveTo(-L * 0.3, 0.02);
      for (let i = 0; i <= 16; i++) { const u = i / 16; hole.lineTo(-L * 0.3 + u * L * 0.6, 0.02 + Math.sin(u * Math.PI) * 0.5); }
      hole.lineTo(-L * 0.3, 0.02);
      sh.holes.push(hole);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.14, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2, curveSegments: 8 });
      scaleUV(g, 0.5, 0.5);
      B.geo(chocBar, g, cx, 0, bz + s * (W / 2 - 0.02) - 0.07, {});
    }
    // candy-cane rails
    for (const s of [-1, 1]) {
      const rail: V3t[] = [];
      for (let i = 0; i <= 16; i++) { const u = i / 16; rail.push([bx0 + 0.2 + u * (L - 0.4), 0.2 + Math.sin(u * Math.PI) * 0.75 + 0.85, bz + s * (W / 2 - 0.08)]); }
      B.tube(stripeR, rail, 0.06, { seg: 60, su: 14 });
      for (let i = 0; i <= 4; i++) {
        const u = 0.05 + i * 0.225, x = bx0 + u * L, h = 0.2 + Math.sin(u * Math.PI) * 0.75;
        B.cyl(stripeR, 0.07, 0.07, 0.95, x, h - 0.1, bz + s * (W / 2 - 0.08), { seg: 12, sv: 2 });
        B.sphere(gums[i % gums.length], 0.12, x, h + 0.9, bz + s * (W / 2 - 0.08), { ws: 12, hs: 8 });
      }
    }
  }

  // ---------------- props: builders ----------------
  const gumProfile: [number, number][] = [[0, 0], [0.46, 0], [0.5, 0.03], [0.51, 0.12], [0.48, 0.36], [0.4, 0.58], [0.27, 0.74], [0.12, 0.82], [0, 0.84]];
  const gumdrop = (x: number, z: number, s: number, ci: number, solid = true, y = 0, tilt = 0) => {
    B.lathe(gums[ci % gums.length], gumProfile, x, y, z, { s, seg: 20, rz: tilt, rx: tilt * 0.5 });
    if (solid) k.collider(x - 0.4 * s, x + 0.4 * s, z - 0.4 * s, z + 0.4 * s, y, y + 0.8 * s, true);
  };
  const lollipop = (x: number, z: number, h: number, r: number, mi: number, ry: number, lean = 0) => {
    const top: V3t = [x + Math.sin(ry + Math.PI / 2) * lean * h, h, z + Math.cos(ry + Math.PI / 2) * lean * h];
    B.rod(stick, 0.06 + r * 0.035, [x, -0.2, z], top, 12);
    const disc = new THREE.CylinderGeometry(r, r, 0.22 * Math.max(1, r * 0.7), 36, 1);
    B.geo(swirls[mi % swirls.length], disc, top[0], top[1] + r * 0.9, top[2], { rx: Math.PI / 2, ry });
    // rim
    B.geo(swirls[mi % swirls.length], new THREE.TorusGeometry(r, 0.11 * Math.max(1, r * 0.7), 8, 36), top[0], top[1] + r * 0.9, top[2], { ry });
    k.collider(x - 0.2, x + 0.2, z - 0.2, z + 0.2, 0, h, false);
  };
  const ballPop = (x: number, z: number, h: number, r: number, mi: number) => {
    B.cyl(stick, 0.07, 0.07, h, x, 0, z, { seg: 12 });
    B.sphere(swirls[mi % swirls.length], r, x, h + r * 0.85, z, { ws: 24, hs: 16, ry: rnd() * 6 });
    k.collider(x - 0.2, x + 0.2, z - 0.2, z + 0.2, 0, h, false);
  };
  const cane = (x: number, z: number, h: number, r: number, m: Mat, ry: number, lean = 0) => {
    const pts: V3t[] = [];
    const hook = h * 0.2;
    for (let i = 0; i <= 8; i++) pts.push([0, -0.3 + (i / 8) * (h - hook + 0.3), 0]);
    for (let i = 1; i <= 12; i++) { const a = (i / 12) * Math.PI * 1.05; pts.push([hook - Math.cos(a) * hook, h - hook + Math.sin(a) * hook, 0]); }
    pts.push([hook * 2.05, h - hook - 0.25, 0]);
    const c = new THREE.CatmullRomCurve3(pts.map((p) => new V3(...p)), false, "centripetal");
    const g = new THREE.TubeGeometry(c, 70, r, 14, false);
    scaleUV(g, (c.getLength() / (r * 7)), 1);
    B.geo(m, g, x, 0, z, { ry, rz: lean });
    // cap
    k.collider(x - r - 0.1, x + r + 0.1, z - r - 0.1, z + r + 0.1, 0, h * 0.8, false);
  };
  const wrapped = (x: number, z: number, s: number, mi: number, ry: number) => {
    const m = hard[mi % hard.length];
    B.sphere(m, 0.5 * s, x, 0.45 * s, z, { s: [1.25, 0.9, 0.9], ry, ws: 22, hs: 14 });
    for (const d of [-1, 1]) {
      const g = new THREE.ConeGeometry(0.42 * s, 0.6 * s, 10, 1, true);
      g.rotateZ(d * Math.PI / 2);
      g.translate(d * 0.85 * s, 0, 0);
      B.geo(m, g, x, 0.45 * s, z, { ry });
      B.geo(m, new THREE.TorusGeometry(0.1 * s, 0.05 * s, 6, 12), x + Math.cos(ry) * d * 0.55 * s, 0.45 * s, z - Math.sin(ry) * d * 0.55 * s, { ry: ry + Math.PI / 2 });
    }
    k.collider(x - 0.8 * s, x + 0.8 * s, z - 0.8 * s, z + 0.8 * s, 0, 0.88 * s, true);
  };
  const macaron = (x: number, y: number, z: number, s: number, mi: number, ry = 0) => {
    const m = macs[mi % macs.length];
    const shell: [number, number][] = [[0, 0], [0.47, 0], [0.5, 0.04], [0.5, 0.1], [0.47, 0.17], [0.38, 0.23], [0.22, 0.27], [0, 0.28]];
    B.lathe(m, shell, x, y + 0.36 * s, z, { s, seg: 28, ry });
    B.lathe(m, shell, x, y + 0.28 * s, z, { s: [s, -s, s], seg: 28, ry });
    // ruffled "feet"
    B.geo(m, new THREE.TorusGeometry(0.47, 0.035, 5, 32), x, y + 0.3 * s, z, { rx: Math.PI / 2, s });
    B.geo(m, new THREE.TorusGeometry(0.47, 0.035, 5, 32), x, y + 0.34 * s, z, { rx: Math.PI / 2, s });
    B.cyl(cream, 0.45 * s, 0.45 * s, 0.1 * s, x, y + 0.27 * s, z, { seg: 28 });
    return y + 0.64 * s;
  };
  const donutGeo = (R: number, rr: number) => new THREE.TorusGeometry(R, rr, 16, 36);
  const icingGeo = (R: number, rr: number) => {
    const g = new THREE.TorusGeometry(R, rr * 1.07, 16, 36);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const zz = p.getZ(i); // torus axis = z; top side = +z
      if (zz < rr * 0.1) p.setZ(i, rr * 0.1 + (zz - rr * 0.1) * 0.05 + Math.sin(Math.atan2(p.getY(i), p.getX(i)) * 9) * 0.02);
    }
    g.computeVertexNormals();
    return g;
  };
  /** lying donut (flat) or standing (upright) */
  const donut = (x: number, z: number, R: number, mi: number, upright: boolean, ry = 0, y = 0) => {
    const rr = R * 0.42;
    if (!upright) {
      B.geo(dough, donutGeo(R, rr), x, y + rr, z, { rx: -Math.PI / 2, ry, su: 3, sv: 1 });
      B.geo(donutIcings[mi % donutIcings.length], icingGeo(R, rr), x, y + rr, z, { rx: -Math.PI / 2, ry, su: 2 });
      k.collider(x - (R + rr) * 0.8, x + (R + rr) * 0.8, z - (R + rr) * 0.8, z + (R + rr) * 0.8, y, y + rr * 2.05, true);
    } else {
      B.geo(dough, donutGeo(R, rr), x, y + R + rr, z, { ry, su: 3, sv: 1 });
      B.geo(donutIcings[mi % donutIcings.length], icingGeo(R, rr), x, y + R + rr, z, { ry, su: 2 });
      const c = Math.abs(Math.cos(ry)), s2 = Math.abs(Math.sin(ry));
      const hx = (R + rr) * c + rr * s2, hz = (R + rr) * s2 + rr * c;
      k.collider(x - hx, x + hx, z - hz, z + hz, y, y + 2 * (R + rr), false);
    }
  };
  const rockGeo = (r: number, seed: number) => {
    const g = new THREE.IcosahedronGeometry(r, 1);
    const rr = S.sgRng(seed);
    const p = g.attributes.position;
    const map = new Map<string, number>();
    for (let i = 0; i < p.count; i++) {
      const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
      let f = map.get(key);
      if (f === undefined) { f = 0.8 + rr() * 0.35; map.set(key, f); }
      p.setXYZ(i, p.getX(i) * f, Math.max(-r * 0.45, p.getY(i) * f * 0.85), p.getZ(i) * f);
    }
    g.computeVertexNormals();
    return g;
  };
  const candyRock = (x: number, z: number, r: number, mi: number) => {
    B.geo(hard[mi % hard.length], rockGeo(r, Math.floor(x * 13 + z * 7)), x, r * 0.38, z, { ry: rnd() * 6 });
    k.collider(x - r * 0.75, x + r * 0.75, z - r * 0.75, z + r * 0.75, 0, r * 1.15, true);
  };
  const crystals = (x: number, z: number, s: number, mi: number) => {
    const m = hard[mi % hard.length];
    for (let i = 0; i < 6; i++) {
      const a = i * 1.1 + rnd(), d = i === 0 ? 0 : 0.25 + rnd() * 0.35;
      const h = (i === 0 ? 1.6 : 0.7 + rnd() * 0.8) * s, r = (0.16 + rnd() * 0.1) * s;
      const g = new THREE.CylinderGeometry(r, r, h, 6);
      const tip = new THREE.ConeGeometry(r, r * 1.6, 6);
      tip.translate(0, h / 2 + r * 0.8, 0);
      B.geo(m, g, x + Math.cos(a) * d * s, h / 2 - 0.05, z + Math.sin(a) * d * s, { rz: Math.cos(a) * d * 0.7, rx: -Math.sin(a) * d * 0.7 });
      B.geo(m, tip, x + Math.cos(a) * d * s, h / 2 - 0.05, z + Math.sin(a) * d * s, { rz: Math.cos(a) * d * 0.7, rx: -Math.sin(a) * d * 0.7 });
    }
    k.collider(x - 0.5 * s, x + 0.5 * s, z - 0.5 * s, z + 0.5 * s, 0, 1.3 * s, false);
  };
  const pepperDisc = (x: number, y: number, z: number, r: number, ry: number, rx = 0) => {
    B.geo(pepper, new THREE.CylinderGeometry(r, r, r * 0.35, 32), x, y, z, { rx: Math.PI / 2 + rx, ry });
  };
  const foil = k.mat(null, "#e8c547", [1, 1], { metalness: 0.95, roughness: 0.28 });
  const chocBarProp = (x: number, z: number, w: number, h: number, ry: number, lean: number, m: Mat) => {
    B.box(m, w, h, 0.3, x, -0.3, z, { ry, rx: lean, uv: 0.5 });
    // foil wrapper on the lower part
    B.box(foil, w + 0.04, h * 0.35, 0.34, x, -0.3, z, { ry, rx: lean });
    const c = Math.abs(Math.cos(ry)), s2 = Math.abs(Math.sin(ry));
    k.collider(x - (w / 2) * c - 0.2 * s2 - 0.1, x + (w / 2) * c + 0.2 * s2 + 0.1, z - (w / 2) * s2 - 0.2 * c - 0.1, z + (w / 2) * s2 + 0.2 * c + 0.1, 0, h - 0.4, false);
  };
  const cottonTree = (x: number, z: number, h: number, m: Mat) => {
    // twisted candy trunk + branches
    const trunk: V3t[] = [];
    for (let i = 0; i <= 10; i++) { const t = i / 10; trunk.push([x + Math.sin(t * 5) * 0.25, -0.2 + t * h * 0.72, z + Math.cos(t * 4) * 0.2]); }
    B.tube(stripeP, trunk, 0.32, { seg: 60, rs: 14, su: 12 });
    B.cyl(stripeP, 0.5, 0.75, 0.5, x, -0.1, z, { seg: 16 });
    const blobs: [number, number, number, number][] = [[0, 1, 0, 1.9], [1.5, 0.6, 0.5, 1.4], [-1.4, 0.7, -0.4, 1.5], [0.4, 0.5, -1.5, 1.35], [-0.5, 0.4, 1.5, 1.35], [0.2, 2.2, 0.1, 1.3], [1.2, 1.7, -0.9, 1.0], [-1.1, 1.8, 0.9, 1.0]];
    for (const [bx, by, bz, br] of blobs) {
      if (Math.hypot(bx, bz) > 0.5) B.rod(stripeP, 0.12, [x, h * 0.6, z], [x + bx * 0.8, h * 0.72 + by * 0.5, z + bz * 0.8], 8);
      B.sphere(m, br, x + bx, h * 0.72 + by, z + bz, { ws: 22, hs: 16, s: [1, 0.85, 1] });
    }
    k.collider(x - 0.55, x + 0.55, z - 0.55, z + 0.55, 0, h * 0.7, false);
    k.collider(x - 2.4, x + 2.4, z - 2.4, z + 2.4, h * 0.72 - 1.3, h * 0.72 + 1.3, true);
  };

  // ---------------- gingerbread cookie figures ----------------
  const outline = gingerOutline();
  const cookieShape = new THREE.Shape(outline);
  const cookieGeo = new THREE.ExtrudeGeometry(cookieShape, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.02, bevelSegments: 3, curveSegments: 6 });
  cookieGeo.translate(0, 0, -0.035);
  const FZ = 0.035 + 0.025; // front face z
  const icingParts: G[] = [];
  {
    const ins = inset(outline, 0.035);
    for (const side of [1, -1]) {
      const pts = ins.map((p) => new V3(p.x, p.y, side * (FZ + 0.004)));
      icingParts.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true, "centripetal"), 160, 0.011, 5, true));
    }
    const zig = (x0: number, y0: number, x1: number, y1: number, n: number, amp: number) => {
      const pts: THREE.Vector3[] = [];
      const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
      for (let i = 0; i <= n; i++) { const t = i / n, a = (i % 2 ? 1 : -1) * amp; pts.push(new V3(x0 + dx * t + nx * a, y0 + dy * t + ny * a, FZ + 0.004)); }
      icingParts.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.2), n * 6, 0.01, 5, false));
    };
    for (const s of [1, -1]) {
      zig(s * 0.33, 0.57, s * 0.3, 0.71, 6, 0.018);
      zig(s * 0.07, 0.165, s * 0.24, 0.19, 6, 0.018);
    }
    // smile
    const sm: THREE.Vector3[] = [];
    for (let i = 0; i <= 10; i++) { const a = Math.PI * 1.2 + (i / 10) * Math.PI * 0.6; sm.push(new V3(Math.cos(a) * 0.065, 0.86 + Math.sin(a) * 0.065, FZ + 0.004)); }
    icingParts.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sm), 20, 0.011, 5, false));
    for (const s of [1, -1]) { const e = new THREE.SphereGeometry(0.02, 8, 6); e.translate(s * 0.045, 0.9, FZ); icingParts.push(e); }
  }
  const cookieIcing = icingParts;
  const buttonGeo = new THREE.SphereGeometry(0.032, 10, 6);
  buttonGeo.scale(1, 1, 0.55);
  const btnMats = [gums[0], gums[3], gums[2]];
  const cookies: { x: number; z: number; s: number; ry: number; pose: "stand" | "lie" | "lean"; lean?: number }[] = [];
  const cookie = (x: number, z: number, s: number, ry: number, pose: "stand" | "lie" | "lean" = "stand", lean = 0.25) => cookies.push({ x, z, s, ry, pose, lean });
  const placeCookie = (c: (typeof cookies)[number]) => {
    const o: BO = c.pose === "lie" ? { rx: -Math.PI / 2, ry: c.ry, s: c.s } : c.pose === "lean" ? { rx: -(c.lean ?? 0.25), ry: c.ry, s: c.s } : { ry: c.ry, s: c.s };
    const y = c.pose === "lie" ? (FZ) * c.s : 0;
    B.geo(ginger, cookieGeo.clone(), c.x, y, c.z, { ...o, su: 1, sv: 1 });
    for (const ig of cookieIcing) B.geo(icing, ig.clone(), c.x, y, c.z, o);
    [0.62, 0.52, 0.42].forEach((by, i) => {
      const bg = buttonGeo.clone();
      bg.translate(0, by, FZ + 0.004);
      B.geo(btnMats[i], bg, c.x, y, c.z, o);
    });
    const s = c.s;
    if (c.pose === "lie") {
      const cs = Math.abs(Math.cos(c.ry)), sn = Math.abs(Math.sin(c.ry));
      const hw = 0.3 * s * cs + 0.45 * s * sn, hd = 0.3 * s * sn + 0.45 * s * cs;
      const cx = c.x - Math.sin(c.ry) * 0.5 * s, cz = c.z - Math.cos(c.ry) * 0.5 * s;
      k.collider(cx - hw, cx + hw, cz - hd, cz + hd, 0, 2 * FZ * s, true);
    } else {
      const cs = Math.abs(Math.cos(c.ry)), sn = Math.abs(Math.sin(c.ry));
      const hw = 0.24 * s * cs + 0.07 * s * sn, hd = 0.24 * s * sn + 0.07 * s * cs;
      k.collider(c.x - hw, c.x + hw, c.z - hd, c.z + hd, 0, s * (c.pose === "lean" ? 0.95 : 1), false);
    }
  };

  // ---------------- gingerbread houses ----------------
  const house = (cx: number, cz: number, w: number, d: number, ry: number, roof: Mat, H = 2.9) => {
    const P = new THREE.Matrix4().compose(new V3(cx, 0, cz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new V3(1, 1, 1));
    const t = 0.3, dw = 1.5, dh = 2.35;
    const o = (extra: BO = {}): BO => ({ parent: P, ...extra });
    // walls: back (−z), left/right (±x), front (+z) with a door
    B.box(ginger, w, H, t, 0, 0, -d / 2 + t / 2, o({ solid: true, uv: 1.1 }));
    B.box(ginger, t, H, d - 2 * t, -w / 2 + t / 2, 0, 0, o({ solid: true, uv: 1.1 }));
    B.box(ginger, t, H, d - 2 * t, w / 2 - t / 2, 0, 0, o({ solid: true, uv: 1.1 }));
    const side = (w - dw) / 2;
    B.box(ginger, side, H, t, -w / 2 + side / 2, 0, d / 2 - t / 2, o({ solid: true, uv: 1.1 }));
    B.box(ginger, side, H, t, w / 2 - side / 2, 0, d / 2 - t / 2, o({ solid: true, uv: 1.1 }));
    B.box(ginger, dw, H - dh, t, 0, dh, d / 2 - t / 2, o({ uv: 1.1 }));
    // interior floor (pink frosting) and a chocolate table with gumdrop stools
    const fl = new THREE.PlaneGeometry(w - 2 * t, d - 2 * t);
    fl.rotateX(-Math.PI / 2);
    scaleUV(fl, (w - 0.6) / 3, (d - 0.6) / 3);
    B.geo(frostPink, fl, 0, 0.018, 0, o());
    B.cyl(milk, 0.55, 0.55, 0.08, -w / 4, 0.68, -d / 5, o({ seg: 24 }));
    B.cyl(milk, 0.1, 0.18, 0.68, -w / 4, 0, -d / 5, o({ seg: 12 }));
    // roof
    const ov = 0.45, hr = d * 0.42;
    const th = Math.atan2(hr, d / 2), L = (d / 2 + ov) / Math.cos(th);
    for (const s of [-1, 1]) {
      const g = new THREE.BoxGeometry(w + 2 * ov, 0.2, L);
      boxUV(g, 0.9);
      const zc = s * ((d / 2 + ov) / 2), yc = H + hr - ((d / 2 + ov) / 2) * Math.tan(th) + 0.1;
      B.geo(roof, g, 0, yc, zc, o({ rx: s * th }));
      // icing drip line along the eave
      const eave: V3t[] = [];
      const ez = s * (d / 2 + ov - 0.05), ey = H + hr - (d / 2 + ov) * Math.tan(th) + 0.02;
      for (let i = 0; i <= 28; i++) { const u = i / 28; eave.push([-w / 2 - ov + u * (w + 2 * ov), ey - Math.abs(Math.sin(u * Math.PI * 7)) * 0.13, ez]); }
      const eg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(eave.map((p) => new V3(...p))), 120, 0.07, 6);
      B.geo(icing, eg, 0, 0, 0, o());
      // barge boards (icing) along the rake
      for (const ex of [-1, 1]) {
        const a: V3t = [ex * (w / 2 + ov - 0.02), H + hr + 0.18, 0], b: V3t = [ex * (w / 2 + ov - 0.02), ey + 0.1, ez];
        const rg = new THREE.TubeGeometry(new THREE.LineCurve3(new V3(...a), new V3(...b)), 8, 0.075, 6);
        B.geo(icing, rg, 0, 0, 0, o());
      }
    }
    // ridge with gumdrops
    const ridge = new THREE.CylinderGeometry(0.12, 0.12, w + 2 * ov, 10);
    B.geo(icing, ridge, 0, H + hr + 0.2, 0, o({ rz: Math.PI / 2 }));
    const ng = Math.floor(w / 0.9);
    for (let i = 0; i <= ng; i++) B.lathe(gums[i % gums.length], gumProfile, -w / 2 + (i / ng) * w, H + hr + 0.22, 0, o({ s: 0.34, seg: 14 }));
    // gables
    for (const s of [-1, 1]) {
      const sh = new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, hr)]);
      const g = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false });
      g.translate(0, 0, -t / 2);
      scaleUV(g, 0.9, 0.9);
      B.geo(ginger, g, s * (w / 2 - t / 2), H, 0, o({ ry: Math.PI / 2 }));
      // round sugar window in the gable
      B.cyl(glass, 0.32, 0.32, 0.05, s * (w / 2 + 0.01), H + hr * 0.38, 0, o({ rz: Math.PI / 2, seg: 20 }));
      B.geo(icing, new THREE.TorusGeometry(0.34, 0.05, 6, 20), s * (w / 2 + 0.03), H + hr * 0.38, 0, o({ ry: Math.PI / 2 }));
    }
    // chimney
    B.box(ginger, 0.6, 1.3, 0.6, w * 0.25, H + hr * 0.35, -d * 0.18, o({ uv: 0.8 }));
    B.box(icing, 0.74, 0.16, 0.74, w * 0.25, H + hr * 0.35 + 1.3, -d * 0.18, o());
    // door frame: candy-cane posts + icing arch
    for (const s of [-1, 1]) B.cyl(stripeR, 0.09, 0.09, dh, s * (dw / 2 + 0.06), 0, d / 2 + 0.02, o({ seg: 12, sv: 3 }));
    B.geo(icing, new THREE.TorusGeometry(dw / 2 + 0.06, 0.07, 6, 20, Math.PI), 0, dh, d / 2 + 0.03, o());
    // windows (sugar glass with icing frames and muntins)
    const win = (lx: number, lz: number, rot: number, y = 1.15) => {
      const wo = (e: BO = {}) => o({ ...e });
      const nx = Math.sin(rot), nz = Math.cos(rot);
      B.box(glass, 0.8, 0.9, 0.04, lx + nx * 0.02, y, lz + nz * 0.02, wo({ ry: rot }));
      for (const [fw, fh, fx, fy] of [[0.96, 0.08, 0, -0.08], [0.96, 0.08, 0, 0.9], [0.08, 0.98, -0.44, -0.08], [0.08, 0.98, 0.44, -0.08], [0.05, 0.9, 0, 0], [0.8, 0.05, 0, 0.42]] as const)
        B.box(icing, fw, fh, 0.07, lx + nx * 0.05 + Math.cos(rot) * fx, y + fy, lz + nz * 0.05 - Math.sin(rot) * fx, wo({ ry: rot }));
      // flower box = gumdrops on a wafer ledge
      B.box(wafer, 0.95, 0.12, 0.25, lx + nx * 0.15, y - 0.2, lz + nz * 0.15, wo({ ry: rot, uv: 0.4 }));
    };
    const wx = w / 2 - side / 2;
    win(-wx, d / 2, 0); win(wx, d / 2, 0);
    win(0, -d / 2, Math.PI);
    win(-w / 2, 0, -Math.PI / 2); win(w / 2, 0, Math.PI / 2);
    // corner icing
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B.cyl(icing, 0.07, 0.07, H, sx * (w / 2 + 0.01), 0, sz * (d / 2 + 0.01), o({ seg: 8 }));
    // roof collider (standable on the ridge)
    const bb = new THREE.Box3(new V3(-w / 2 - ov, H + 0.1, -d / 2 - ov), new V3(w / 2 + ov, H + hr + 0.3, d / 2 + ov)).applyMatrix4(P);
    k.collider(bb.min.x, bb.max.x, bb.min.z, bb.max.z, bb.min.y, bb.max.y, true);
    // peppermint discs flanking the door
    for (const s of [-1, 1]) {
      const p = new V3(s * (dw / 2 + 0.55), 2.2, d / 2 + 0.06).applyMatrix4(P);
      pepperDisc(p.x, p.y, p.z, 0.26, ry);
    }
  };

  // Village (west)
  house(-17.5, -11.5, 6.2, 5.0, 0, roofs[0]);
  house(-19.8, 0.5, 5.2, 5.0, Math.PI / 2, roofs[1]);
  house(-13.2, 14.6, 5.4, 4.6, Math.PI, roofs[2], 2.7);
  house(-8.8, -1.0, 4.6, 4.2, -Math.PI / 2 + 0.0, roofs[1], 2.6);
  k.room("Gingerbread Village", X0, -6.5, -16, 11);

  // candy lamp posts in the village (lollipop lamps)
  const bulb = k.mat(null, "#fff3d6", [1, 1], { emissive: "#ffe0a8", emissiveIntensity: 1.3 });
  const lamp = (x: number, z: number) => {
    B.cyl(stripeG, 0.09, 0.12, 3.2, x, 0, z, { seg: 12, sv: 5 });
    B.cyl(milk, 0.28, 0.32, 0.25, x, 0, z, { seg: 16 });
    B.sphere(bulb, 0.32, x, 3.45, z, { ws: 16, hs: 12 });
    B.lathe(icingPink, [[0, 0.2], [0.42, 0], [0.38, -0.06], [0, 0.1]], x, 3.62, z, { seg: 20 });
    k.collider(x - 0.18, x + 0.18, z - 0.18, z + 0.18, 0, 3.2, false);
  };
  lamp(-12.4, -6.6); lamp(-14.2, 5.2); lamp(-5.8, 8.6); lamp(-21.2, -6.4); lamp(3.6, 11.8); lamp(-3.6, -14.5); lamp(9.2, 9.6); lamp(18.8, 1.2);

  // cookie crowd
  cookie(-14.2, -7.8, 1.9, 0.3); cookie(-12.9, -8.4, 1.5, -0.2); cookie(-15.6, -8.1, 1.2, 0.6);
  cookie(-22.2, -4.6, 2.1, Math.PI / 2 - 0.2); cookie(-16.2, 4.2, 1.6, 2.8); cookie(-17.4, 8.2, 2.4, 0.9, "lie");
  cookie(-10.5, 9.8, 1.8, -0.4); cookie(-9.4, 10.6, 1.3, 0.2); cookie(-21.2, 12.8, 2.0, 1.2, "lean", 0.3);
  cookie(-6.3, -9.2, 2.2, 0.2); cookie(-4.8, -10, 1.4, -0.3, "lie");
  cookie(5.0, 12.5, 1.7, -0.5); cookie(6.4, 13.1, 1.2, -0.8);
  cookie(18.5, 8.6, 1.9, -1.2); cookie(21.4, -3.5, 2.3, -1.6, "lean", 0.22); cookie(19.3, -17.8, 1.6, 0.4);
  cookie(-11.6, 18.2, 1.8, 0.1); cookie(2.6, -17.8, 2.0, 0.1); cookie(-2.4, 14.5, 1.1, 0.6, "lie");
  // the giant gingerbread man lying on a chocolate hill slope near the north fence
  cookie(-15.0, -17.6, 4.2, 0.0, "lean", 0.5);

  // ---------------- the cake (centre) ----------------
  {
    const cx = 0, cz = -6.2;
    const tiers: [number, number, number][] = [[4.1, 1.45, 0], [2.95, 1.25, 1.45], [1.85, 1.1, 2.7]];
    for (const [r, h, y] of tiers) {
      const prof: [number, number][] = [[0, 0], [r, 0]];
      for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI / 2; prof.push([r - 0.12 + Math.cos(a) * 0.12, h - 0.12 + Math.sin(a) * 0.12]); }
      prof.push([0, h]);
      B.lathe(cream, prof, cx, y, cz, { seg: 56, su: 6, sv: 1 });
      // cream rosettes along the top rim and base
      const n = Math.round((2 * Math.PI * r) / 0.5);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        B.lathe(cream, [[0, 0], [0.16, 0], [0.17, 0.06], [0.12, 0.14], [0.06, 0.2], [0, 0.24]], cx + Math.cos(a) * (r - 0.2), y + h - 0.02, cz + Math.sin(a) * (r - 0.2), { seg: 8, ry: a });
        if (y === 0) B.sphere(cream, 0.16, cx + Math.cos(a + 0.3) * (r + 0.02), 0.1, cz + Math.sin(a + 0.3) * (r + 0.02), { ws: 10, hs: 6, s: [1, 0.8, 1] });
        if (i % 2 === 0) {
          const bx = cx + Math.cos(a) * (r - 0.2), bz = cz + Math.sin(a) * (r - 0.2);
          B.lathe(berry, [[0, 0], [0.1, 0.03], [0.16, 0.12], [0.17, 0.22], [0.13, 0.3], [0, 0.33]], bx, y + h + 0.12, bz, { seg: 12, rx: 0.3 * Math.sin(a), rz: -0.3 * Math.cos(a) });
          B.geo(leaf, new THREE.ConeGeometry(0.14, 0.07, 6), bx, y + h + 0.46, bz, {});
        }
      }
      // jam band
      B.geo(icingPink, new THREE.TorusGeometry(r + 0.01, 0.06, 6, 56), cx, y + h * 0.45, cz, { rx: Math.PI / 2 });
      const half = r * 0.72;
      k.collider(cx - half, cx + half, cz - half, cz + half, 0, y + h, true);
    }
    // pink glaze drips on the top tier
    {
      const r = 1.88, y0 = 2.7 + 1.1;
      const g = new THREE.CylinderGeometry(r, r, 0.6, 64, 1, true);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) if (p.getY(i) < 0) { const a = Math.atan2(p.getZ(i), p.getX(i)); p.setY(i, -0.3 - Math.max(0, Math.sin(a * 9) * 0.3 + Math.sin(a * 23) * 0.12)); }
      g.computeVertexNormals();
      B.geo(glazePink, g, cx, y0 - 0.28, cz);
      B.cyl(glazePink, r, r, 0.04, cx, y0, cz, { seg: 48 });
    }
    // candles + a big strawberry on top
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3, x = cx + Math.cos(a) * 1.05, z = cz + Math.sin(a) * 1.05;
      B.cyl(i % 2 ? stripeG : stripeP, 0.07, 0.07, 0.75, x, 3.84, z, { seg: 10, sv: 2 });
      B.lathe(flame, [[0, 0], [0.05, 0.05], [0.04, 0.12], [0, 0.2]], x, 4.62, z, { seg: 8 });
    }
    B.lathe(berry, [[0, 0], [0.3, 0.1], [0.46, 0.35], [0.48, 0.6], [0.36, 0.84], [0, 0.92]], cx, 3.86, cz, { seg: 20 });
    B.geo(leaf, new THREE.ConeGeometry(0.36, 0.14, 8), cx, 4.85, cz);
    // cake board
    B.cyl(k.mat(null, "#f7d9e6", [1, 1], { metalness: 0.4, roughness: 0.3 }), 4.6, 4.7, 0.08, cx, 0, cz, { seg: 48 });
    k.room("Cake Plaza", -9, 9, -14, 4);
  }

  // ---------------- chocolate hills (east of the river) ----------------
  const chocHill = (x: number, z: number, r: number, hy: number) => {
    const g = new THREE.SphereGeometry(r, 36, 14, 0, Math.PI * 2, 0, Math.PI / 2);
    scaleUV(g, 4, 2);
    B.geo(choc, g, x, 0, z, { s: [1, hy, 1] });
    // milk-chocolate drip cap
    const cap = new THREE.SphereGeometry(r * 1.015, 36, 10, 0, Math.PI * 2, 0, Math.PI * 0.26);
    const p = cap.attributes.position;
    let minY = 1e9;
    for (let i = 0; i < p.count; i++) minY = Math.min(minY, p.getY(i));
    for (let i = 0; i < p.count; i++) if (p.getY(i) < minY + 0.01) { const a = Math.atan2(p.getZ(i), p.getX(i)); p.setY(i, p.getY(i) - Math.max(0, Math.sin(a * 7 + x)) * r * 0.25); }
    cap.computeVertexNormals();
    B.geo(milk, cap, x, 0, z, { s: [1, hy, 1] });
    const hs = r * 0.62;
    k.collider(x - hs, x + hs, z - hs, z + hs, 0, r * hy * 0.8, true);
  };
  B.opt(choc, {});
  chocHill(20.6, 12.2, 3.2, 0.62);
  chocHill(21.6, -8.2, 2.6, 0.7);
  chocHill(-15.2, -19.4, 2.8, 0.55);
  chocHill(7.4, 17.6, 2.0, 0.6);
  chocBarProp(18.2, 5.8, 1.6, 2.4, 0.4, 0.15, chocBar);
  chocBarProp(16.4, 10.3, 1.3, 1.9, -0.6, -0.2, milkChoc);
  chocBarProp(22.2, 3.6, 1.8, 2.8, 1.3, 0.1, milkChoc);
  chocBarProp(-6.0, 17.5, 1.5, 2.2, 0.2, -0.12, chocBar);
  k.room("Chocolate River", 8, 17, -21, 21);

  // ---------------- lollipop & candy-cane forest (north-west / north) ----------------
  cottonTree(-7.4, -17.0, 6.5, cottonP);
  cottonTree(5.6, -15.8, 5.4, cottonB);
  lollipop(-11.2, -15.6, 3.6, 1.2, 0, 0.4);
  lollipop(-2.4, -18.6, 4.2, 1.45, 1, -0.2, 0.05);
  lollipop(-10.4, -5.6, 3.0, 0.95, 2, 1.2);
  lollipop(1.8, 9.2, 2.6, 0.8, 3, -0.6, 0.06);
  lollipop(19.6, -13.8, 3.4, 1.1, 2, -0.8);
  lollipop(-3.4, 18.8, 2.8, 0.9, 1, 0.3);
  lollipop(9.6, -19.2, 3.2, 1.0, 3, 0.2, -0.05);
  lollipop(-22.6, 16.6, 3.2, 1.1, 0, 1.5);
  ballPop(-12.6, -18.6, 2.6, 0.55, 3); ballPop(-4.4, -12.6, 2.2, 0.45, 0); ballPop(8.4, 12.6, 2.4, 0.5, 1); ballPop(-20.6, -15.2, 2.2, 0.5, 2);
  cane(-9.8, -12.6, 3.6, 0.2, stripeR, 0.3, 0.08);
  cane(0.8, -19.6, 4.8, 0.26, stripeG, 2.1, -0.06);
  cane(-18.8, -15.6, 3.2, 0.18, stripeP, -0.8);
  cane(4.5, 16.9, 3.0, 0.18, stripeR, 1.9, 0.1);
  cane(16.8, -16.5, 3.8, 0.22, stripeR, -2.4, 0.07);
  cane(-23.0, 3.6, 3.4, 0.2, stripeR, 1.0);
  cane(22.8, 7.4, 3.2, 0.2, stripeG, -1.3, -0.08);
  cane(-6.4, 4.6, 2.6, 0.16, stripeP, 0.6, 0.12);
  k.room("Candy Forest", -13, 8, -21, -12);

  // ---------------- macaron & donut garden (north-east) ----------------
  {
    let y = macaron(19.0, 0, -4.2, 1.5, 0);
    y = macaron(19.0, y, -4.2, 1.35, 1, 0.3);
    macaron(19.0, y, -4.2, 1.15, 2, 0.8);
    k.collider(18.25, 19.75, -4.95, -3.45, 0, 2.2, true);
    y = macaron(22.3, 0, -13.8, 1.6, 3);
    macaron(22.3, y, -13.8, 1.4, 4, 0.5);
    k.collider(21.5, 23.1, -14.6, -13.0, 0, 1.9, true);
    for (const [mx, mz, ms, mi] of [[16.6, -10.6, 1.2, 2], [15.8, -12.2, 1.0, 0], [21.0, -18.8, 1.3, 1], [17.2, -20.0, 1.0, 3], [21.6, -0.6, 1.1, 4]] as const) {
      macaron(mx, 0, mz, ms, mi, mx);
      k.collider(mx - ms / 2, mx + ms / 2, mz - ms / 2, mz + ms / 2, 0, 0.64 * ms, true);
    }
    // a tipped-over macaron leaning against the stack
    const tm = macs[3];
    B.lathe(tm, [[0, 0], [0.47, 0], [0.5, 0.06], [0.47, 0.17], [0.3, 0.25], [0, 0.28]], 20.4, 0.55, -2.5, { s: 1.1, rx: 1.3, ry: 0.4, seg: 24 });
    donut(17.8, -16.2, 1.1, 0, false, 0.2);
    donut(22.4, -9.8, 0.9, 1, true, 1.3);
    donut(17.2, -7.2, 0.8, 2, false, 0.9);
    donut(17.1, -7.2, 0.7, 3, false, 0.2, 0.7);
    donut(14.6, -19.0, 0.9, 3, true, 0.35);
    donut(-20.4, -8.4, 0.8, 0, true, 1.6);
    donut(3.8, 14.8, 0.7, 1, false, 0);
    k.room("Macaron Garden", 16, X1, -21, 0);
  }

  // ---------------- candy rocks, crystals, wrapped candies, peppermints ----------------
  candyRock(9.8, -9.6, 0.9, 0); candyRock(10.4, -8.2, 0.55, 1); candyRock(-3.2, 9.6, 0.8, 2); candyRock(-20.6, 18.4, 1.1, 3);
  candyRock(14.2, 17.8, 0.9, 4); candyRock(-1.6, -15.2, 0.7, 1); candyRock(22.4, 18.8, 0.8, 0); candyRock(-11.8, 5.0, 0.65, 4);
  crystals(-17.2, 17.4, 1.2, 1); crystals(11.6, -16.4, 1.0, 0); crystals(-22.4, -18.8, 1.1, 3); crystals(4.2, -9.8, 0.8, 4);
  wrapped(-4.6, 12.0, 1.1, 0, 0.4); wrapped(10.2, 18.6, 1.3, 2, -0.3); wrapped(-19.2, -6.8, 1.0, 3, 1.2); wrapped(6.4, -12.2, 1.2, 1, 2.2);
  wrapped(21.8, 15.8 - 6.2, 0.9, 4, 0.6);
  for (const [x, z, r, ry] of [[-8.2, 7.2, 0.7, 0.4], [11.0, -3.6, 0.6, 1.3], [-1.0, 20.2, 0.5, 0], [-23.0, -10.8, 0.8, 1.57]] as const) {
    pepperDisc(x, r * 0.95, z, r, ry, 0.12);
    k.collider(x - 0.35, x + 0.35, z - 0.35, z + 0.35, 0, r * 1.9, false);
  }

  // ---------------- gumdrops everywhere ----------------
  const gd: [number, number, number][] = [
    [-7.2, 1.6, 1.2], [-6.2, 2.4, 0.8], [-12.2, -3.6, 1.0], [-15.6, -3.2, 0.7], [-22.4, 8.4, 1.4], [-23, 10.2, 0.9], [-11.4, 12.2, 0.9], [-16.4, 11.6, 1.1],
    [-9.2, 16.6, 1.3], [-8.0, 19.4, 0.9], [-14.6, 20.0, 1.0], [-18.0, 20.2, 1.5], [2.6, 16.2, 1.0], [6.0, 19.8, 1.2], [3.4, 20.2, 0.7],
    [7.6, -6.4, 1.1], [6.8, -4.8, 0.7], [-6.8, -13.8, 1.0], [-4.2, -20.2, 1.4], [3.0, -13.0, 0.9], [7.4, -20.0, 1.2],
    [17.6, -2.2, 0.9], [23.0, 1.8, 1.3], [19.8, 17.8, 1.0], [16.8, 15.8, 0.8], [23.0, 20.0, 1.6], [-23.2, -1.6, 1.0], [-12.4, -20.3, 1.2],
    [9.0, 7.4, 0.7], [8.4, 1.8, 0.9], [-2.2, -11.8, 0.6], [2.2, -11.9, 0.6],
  ];
  gd.forEach(([x, z, s], i) => gumdrop(x, z, s, i));
  // small scattered gumdrops (step-over)
  for (let i = 0; i < 70; i++) {
    const x = X0 + 1 + rnd() * (X1 - X0 - 2), z = Z0 + 1 + rnd() * (Z1 - Z0 - 2);
    if (Math.abs(x) < 4.5 && z > 2.5 && z < 8) continue; // keep the hider spawn clear
    if (Math.hypot(x, z + 6.2) < 5) continue;
    gumdrop(x, z, 0.25 + rnd() * 0.25, i + 3, false);
  }

  // ---------------- locker corner (south-east) ----------------
  {
    const lx = 23.2, z0 = 14.0;
    const tl = new THREE.PlaneGeometry(6.2, 7.4);
    tl.rotateX(-Math.PI / 2);
    scaleUV(tl, 6.2 / 2.4, 7.4 / 2.4);
    B.geo(tileM, tl, 20.5, 0.025, 17.4);
    B.opt(tileM, { noShadow: true });
    for (let i = 0; i < 6; i++) {
      const z = z0 + 0.35 + i * 0.66;
      B.box(lockerBody, 0.5, 1.95, 0.64, lx, 0.08, z, {});
      const f = new THREE.PlaneGeometry(0.6, 1.88);
      B.geo(lockers[i], f, lx - 0.26, 0.08 + 0.98, z, { ry: -Math.PI / 2 });
    }
    B.box(lockerBody, 0.56, 0.08, 6 * 0.66 + 0.1, lx, 0, z0 + 0.02 + 3 * 0.66, { });
    B.box(lockerBody, 0.56, 0.06, 6 * 0.66 + 0.1, lx, 2.03, z0 + 0.02 + 3 * 0.66, {});
    k.collider(lx - 0.3, lx + 0.3, z0, z0 + 6 * 0.66 + 0.05, 0, 2.1, true);
    // second, shorter row facing north
    for (let i = 0; i < 4; i++) {
      const x = 18.2 + i * 0.66;
      B.box(lockerBody, 0.64, 1.5, 0.5, x, 0.08, 20.4, {});
      const f = new THREE.PlaneGeometry(0.6, 1.44);
      B.geo(lockers[(i + 2) % 6], f, x, 0.08 + 0.76, 20.14, { ry: Math.PI });
    }
    k.collider(17.85, 20.55, 20.12, 20.7, 0, 1.6, true);
    // wafer bench
    B.box(wafer, 2.2, 0.12, 0.5, 20.4, 0.45, 16.9, { uv: 0.5 });
    for (const dx of [-0.9, 0.9]) B.box(milk, 0.12, 0.45, 0.4, 20.4 + dx, 0, 16.9, {});
    k.collider(19.3, 21.5, 16.65, 17.15, 0, 0.57, true);
    // gym bags (big candies in a heap) and a sign
    wrapped(21.6, 18.6, 0.6, 0, 0.2);
    gumdrop(19.0, 18.8, 0.6, 3);
    const lsign = new THREE.PlaneGeometry(2.4, 0.6);
    B.geo(k.mat(k.tex("sg-lsign", () => T.signboard("#fff2f8", "#ff4f8b", "LOCKERS", 256, 64)), "#ffffff", [1, 1], { roughness: 0.4, bump: 0 }), lsign, lx - 0.3, 2.55, 16.0, { ry: -Math.PI / 2 });
    B.box(stick, 0.06, 0.8, 0.06, lx - 0.25, 2.06, 15.0, {});
    B.box(stick, 0.06, 0.8, 0.06, lx - 0.25, 2.06, 17.0, {});
    k.room("Locker Corner", 17, X1, 13, Z1);
  }

  // ---------------- boundary: wafer fences & candy-cane posts ----------------
  const fence = (x0: number, z0: number, x1: number, z1: number) => {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 2.4));
    const ry = Math.atan2(-(z1 - z0), x1 - x0);
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, x = x0 + (x1 - x0) * u, z = z0 + (z1 - z0) * u;
      B.box(wafer, L / n - 0.3, 0.95, 0.16, x, 0.18, z, { ry, uv: 0.5 });
      B.box(icing, L / n - 0.3, 0.06, 0.2, x, 1.13, z, { ry });
    }
    for (let i = 0; i <= n; i++) {
      const u = i / n, x = x0 + (x1 - x0) * u, z = z0 + (z1 - z0) * u;
      B.cyl(stripeR, 0.1, 0.1, 1.35, x, 0, z, { seg: 12, sv: 2 });
      B.lathe(gums[i % gums.length], gumProfile, x, 1.33, z, { s: 0.32, seg: 12 });
    }
  };
  // south edge (with the entrance gap), north edge, west & east edges; the river passes through gaps
  fence(-24.4, 21.6, -3.6, 21.6); fence(3.6, 21.6, 12.2, 21.6); fence(17.2, 21.6, 24.4, 21.6);
  fence(-24.4, -21.6, 6.2, -21.6); fence(11.0, -21.6, 24.4, -21.6);
  fence(-24.6, -21.6, -24.6, 21.6); fence(24.6, -21.6, 24.6, 21.6);
  // entrance arch: two giant candy canes + sign
  {
    const ax = 3.0, az = 21.2;
    for (const s of [-1, 1]) {
      const pts: V3t[] = [];
      for (let i = 0; i <= 6; i++) pts.push([s * ax, -0.2 + i * 0.9, az]);
      for (let i = 1; i <= 10; i++) { const a = (i / 10) * Math.PI * 0.5; pts.push([s * (ax - 1.2 + Math.cos(a) * 1.2), 5.2 + Math.sin(a) * 1.2, az]); }
      const c = new THREE.CatmullRomCurve3(pts.map((p) => new V3(...p)), false, "centripetal");
      const g = new THREE.TubeGeometry(c, 60, 0.3, 14);
      scaleUV(g, c.getLength() / 2.2, 1);
      B.geo(stripeR, g, 0, 0, 0);
      k.collider(s * ax - 0.35, s * ax + 0.35, az - 0.35, az + 0.35, 0, 6, false);
      B.lathe(gums[s > 0 ? 3 : 0], gumProfile, s * ax, 0, az, { s: 1.1, seg: 20 });
    }
    B.box(icingPink, 5.0, 1.3, 0.2, 0, 5.75, az, {});
    B.geo(signM, new THREE.PlaneGeometry(4.8, 1.2), 0, 6.4, az - 0.11, { ry: Math.PI });
    B.geo(signM, new THREE.PlaneGeometry(4.8, 1.2), 0, 6.4, az + 0.11, {});
    for (let i = 0; i < 7; i++) B.sphere(gums[i % gums.length], 0.16, -2.4 + i * 0.8, 7.12, az, { ws: 12, hs: 8 });
    k.room("Entrance", -6, 6, 14, Z1);
  }

  // ---------------- beyond the fences: frosting hills, candy mountains, clouds, giant candies ----------------
  const hill = (x: number, z: number, r: number, hy: number, mi: number) => {
    const g = new THREE.SphereGeometry(r, 32, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    B.geo(hillMats[Math.abs(mi) % 2], g, x, 0, z, { s: [1, hy, 1] });
  };
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2 + 0.13, d = 34 + (i % 3) * 6 + rnd() * 4;
    hill(Math.cos(a) * d * 1.05, Math.sin(a) * d, 7 + rnd() * 6, 0.28 + rnd() * 0.2, i);
  }
  // near-edge chocolate + frosting mounds just outside the fence
  for (const [x, z, r] of [[-28, -14, 5], [-29, 6, 4.5], [28, -4, 5], [29, 14, 4], [-10, -27, 5], [18, -27, 4.5], [-16, 27, 5], [20, 27.5, 4]] as const) hill(x, z, r, 0.45, Math.round(x + z));
  const mountain = (x: number, z: number, R: number, H: number, mi: number, seed: number) => {
    const rr = S.sgRng(seed);
    const pts: [number, number][] = [];
    const ph = rr() * 6;
    for (let i = 0; i <= 18; i++) {
      const t = i / 18;
      pts.push([R * Math.pow(1 - t, 0.85) * (1 + 0.05 * Math.sin(t * 17 + ph)) + (i === 18 ? 0 : 0.2), H * t]);
    }
    pts[18] = [0, H];
    B.lathe(mountainMats[mi % mountainMats.length], pts, x, -1, z, { seg: 40, ry: rr() * 6 });
    // icing cap with drips
    const t0 = 0.62;
    const cap: [number, number][] = [];
    for (let i = 0; i <= 8; i++) { const t = t0 + (i / 8) * (1 - t0); cap.push([R * Math.pow(1 - t, 0.85) * 1.035 + (i === 8 ? 0 : 0.25), H * t + 0.1]); }
    cap[8] = [0, H + 0.25];
    const g = new THREE.LatheGeometry(cap.map(([a, b]) => new THREE.Vector2(a, b)), 40);
    const p = g.attributes.position;
    const y0 = H * t0 + 0.1;
    for (let i = 0; i < p.count; i++) if (Math.abs(p.getY(i) - y0) < 0.01) {
      const a = Math.atan2(p.getZ(i), p.getX(i));
      p.setY(i, y0 - Math.max(0, Math.sin(a * 6 + seed) * 0.6 + Math.sin(a * 15) * 0.4) * H * 0.12);
      const f = 1.035 * (1 + (y0 - p.getY(i)) / H * 0.25);
      p.setX(i, p.getX(i) * f / 1.035 * 1.0); p.setZ(i, p.getZ(i) * f / 1.035);
    }
    g.computeVertexNormals();
    B.geo(snowCap, g, x, -1, z);
  };
  const mts: [number, number, number, number][] = [
    [-60, -70, 26, 42], [-20, -88, 30, 54], [25, -80, 24, 40], [70, -62, 28, 46], [92, -10, 26, 36], [80, 45, 30, 44],
    [30, 88, 26, 38], [-30, 84, 28, 46], [-82, 40, 26, 38], [-92, -18, 30, 50], [0, -62, 14, 22], [-45, -52, 12, 18], [50, -48, 13, 20], [58, 20, 12, 18], [-58, 12, 12, 17], [8, 60, 12, 16],
  ];
  mts.forEach(([x, z, R, H], i) => mountain(x, z, R, H, i, i * 7 + 3));
  // giant candies on the horizon
  for (const [x, z, h, r, mi] of [[-38, -36, 12, 4.5, 0], [42, -30, 14, 5, 1], [-44, 30, 10, 4, 2], [38, 40, 12, 4.4, 3]] as const) {
    B.cyl(stick, 0.35, 0.35, h, x, 0, z, { seg: 12 });
    const disc = new THREE.CylinderGeometry(r, r, 0.8, 40);
    B.geo(swirls[mi], disc, x, h + r * 0.9, z, { rx: Math.PI / 2, ry: Math.atan2(x, z) });
  }
  for (const [x, z, h, ry] of [[-30, -44, 16, 0.7], [46, 6, 18, 2.4], [-48, -4, 14, -1.2], [12, 44, 15, 1.1]] as const) cane(x, z, h, 0.9, stripeR, ry);
  // cotton-candy clouds
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.4, d = 45 + rnd() * 35, y = 26 + rnd() * 18;
    const cx = Math.cos(a) * d, cz = Math.sin(a) * d;
    for (let j = 0; j < 5; j++) B.sphere(j % 3 === 0 ? cottonP : cloudM, 3 + rnd() * 2.5, cx + (j - 2) * 3.2, y + Math.sin(j * 1.3) * 1.2, cz + (rnd() - 0.5) * 3, { ws: 14, hs: 10, s: [1, 0.7, 1] });
  }
  B.opt(cottonP, {});

  // haze band on the horizon (pastel pink air)
  {
    const tex = S.sgHaze().texture;
    const hm = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, side: THREE.BackSide });
    const hz = new THREE.Mesh(new THREE.CylinderGeometry(150, 150, 70, 48, 1, true), hm);
    hz.position.set(0, 18, 0);
    hz.renderOrder = -1;
    k.group.add(hz);
  }

  // place cookies (after everything else so collider list is complete)
  for (const c of cookies) placeCookie(c);
  B.flush();

  // ---------------- spawns & lighting ----------------
  const hiders: THREE.Vector3[] = [];
  for (let i = 0; i < 24; i++) hiders.push(new THREE.Vector3(-3.25 + (i % 6) * 1.3, 0, 3.3 + Math.floor(i / 6) * 1.2));
  const hunters: THREE.Vector3[] = [];
  for (let i = 0; i < 9; i++) hunters.push(new THREE.Vector3(-1.2 + (i % 3) * 1.2, 0, 19.8 - Math.floor(i / 3) * 1.1));
  k.room("Sugar Meadow", X0, X1, Z0, Z1);

  return k.finish({
    id: "sugarland", name: "Sugarland",
    bounds: { minX: X0, maxX: X1, minZ: Z0, maxZ: Z1 },
    hunterSpawns: hunters, hiderSpawns: hiders,
    preview: { pos: [7, 5.2, 17], look: [-2, 1.6, -6], fov: 60 },
    lighting: {
      sky: "#ffd6ec",
      hemi: ["#fff1f8", "#ffc2dc", 0.55],
      sun: { color: "#fff4e6", int: 2.6, pos: [14, 30, 12] },
      fog: ["#ffd9ee", 45, 190],
      points: [
        { pos: [-17.5, 2.2, -11.5], color: "#ffc27a", int: 10, dist: 7 },
        { pos: [-19.8, 2.2, 0.5], color: "#ffc27a", int: 10, dist: 7 },
        { pos: [0, 5.2, -6.2], color: "#ffcf8a", int: 8, dist: 7 },
      ],
      exposure: 1.05,
      hdri: "sky",
      env: 0.8,
      hdriBackground: 0.04,
    },
  });
}
