// Osaka (大阪): a small, slightly run-down shopping-street town with a Dotonbori feel, at dusk.
// West half: a covered arcade (商店街) with steel ribs and broken roof panels, paper lanterns, hanging banners, a
// retro café, a hardware store and rusty roll-down shutters. East half: an open street with giant 3D shop signs —
// a SEA-URCHIN (parody of the famous crab sign), a takoyaki octopus, a gyoza, an okonomiyaki — and a drugstore.
// Narrow alleys lead to a cluttered back alley (pipes, AC units, drums, garbage bags, vending machines, bicycles,
// power poles with sagging wires) and to a canal promenade with a railing. An empty lot in the east has
// scaffolding frames, pallets and rolling tumbleweeds. Hunters enter through the arcade gate (west).
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import * as T from "../textures";
import * as O from "./tex/osaka";
import { Kit, type Mat, type World } from "./kit";

type G = THREE.BufferGeometry;
type V3t = [number, number, number];
const V3 = THREE.Vector3;

// ---------------------------------------------------------------------------------------------
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
type BO = { flat?: boolean; rx?: number; ry?: number; rz?: number; s?: number | V3t; solid?: boolean; stand?: boolean; uv?: number; world?: boolean; su?: number; sv?: number; seg?: number };
class Batch {
  private lists = new Map<Mat, G[]>();
  private flags = new Map<Mat, { noShadow?: boolean }>();
  private rnd = O.rng(77);
  constructor(private k: Kit) {}
  opt(m: Mat, f: { noShadow?: boolean }) { this.flags.set(m, f); }
  geo(m: Mat, g: G, x: number, y: number, z: number, o: BO = {}) {
    if (o.uv && !o.world) boxUV(g, o.uv, this.rnd(), this.rnd());
    if (o.su || o.sv) scaleUV(g, o.su ?? 1, o.sv ?? 1);
    const e = new THREE.Euler(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0, "YXZ");
    const sc = typeof o.s === "number" ? new V3(o.s, o.s, o.s) : o.s ? new V3(...o.s) : new V3(1, 1, 1);
    g.applyMatrix4(new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(e), sc));
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
    const g = o.flat || mn < 0.06 || mx > 5 ? new THREE.BoxGeometry(w, h, d) : new RoundedBoxGeometry(w, h, d, 1, Math.min(0.03, mn * 0.2));
    return this.geo(m, g, x, y + h / 2, z, o);
  }
  /** axis-aligned box from corner ranges, world UVs */
  blk(m: Mat, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, unit = 2, solid = true) {
    const [ax, bx] = x0 < x1 ? [x0, x1] : [x1, x0], [az, bz] = z0 < z1 ? [z0, z1] : [z1, z0];
    return this.box(m, bx - ax, y1 - y0, bz - az, (ax + bx) / 2, y0, (az + bz) / 2, { flat: true, uv: unit, world: true, solid, stand: true });
  }
  cyl(m: Mat, rt: number, rb: number, h: number, x: number, y: number, z: number, o: BO & { open?: boolean } = {}) {
    return this.geo(m, new THREE.CylinderGeometry(rt, rb, h, o.seg ?? 16, 1, o.open), x, y + h / 2, z, o);
  }
  lathe(m: Mat, pts: [number, number][], x: number, y: number, z: number, o: BO = {}) {
    return this.geo(m, new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(Math.max(0, r), h)), o.seg ?? 20), x, y, z, o);
  }
  sphere(m: Mat, r: number, x: number, y: number, z: number, o: BO & { ws?: number; hs?: number } = {}) {
    return this.geo(m, new THREE.SphereGeometry(r, o.ws ?? 16, o.hs ?? 10), x, y, z, o);
  }
  tube(m: Mat, pts: V3t[], r: number, o: { seg?: number; rs?: number; closed?: boolean } = {}) {
    const c = new THREE.CatmullRomCurve3(pts.map((p) => new V3(...p)), !!o.closed, "centripetal");
    return this.geo(m, new THREE.TubeGeometry(c, o.seg ?? Math.max(6, pts.length * 5), r, o.rs ?? 6, !!o.closed), 0, 0, 0);
  }
  rod(m: Mat, r: number, a: V3t, b: V3t, seg = 8) {
    const va = new V3(...a), vb = new V3(...b);
    const g = new THREE.CylinderGeometry(r, r, va.distanceTo(vb), seg, 1);
    const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), vb.clone().sub(va).normalize());
    g.applyMatrix4(new THREE.Matrix4().compose(va.clone().add(vb).multiplyScalar(0.5), q, new V3(1, 1, 1)));
    return this.geo(m, g, 0, 0, 0);
  }
  /** sagging cable between two points */
  wire(m: Mat, a: V3t, b: V3t, sag = 0.6, r = 0.012) {
    const pts: V3t[] = [];
    for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, a[2] + (b[2] - a[2]) * t]); }
    const c = new THREE.CatmullRomCurve3(pts.map((p) => new V3(...p)));
    return this.geo(m, new THREE.TubeGeometry(c, 16, r, 3), 0, 0, 0);
  }
  flush() {
    for (const [m, l] of this.lists) if (l.length) this.k.merged(l, m, { noShadow: this.flags.get(m)?.noShadow });
    this.lists.clear();
  }
}

// ---------------------------------------------------------------------------------------------

export function buildOsaka(): World {
  const k = new Kit(7, 3.0);
  const B = new Batch(k);
  const rnd = O.rng(1970);
  const X0 = -18, X1 = 18, Z0 = -13.4, Z1 = 11.3;
  const tex = <A extends unknown[]>(key: string, f: (...a: A) => ReturnType<typeof O.osPaving>, ...a: A) => k.tex("os-" + key, () => f(...a));

  // ---------------- materials ----------------
  const paving = k.mat(tex("pave", O.osPaving), "#ffffff", [1, 1], { roughness: 0.75, bump: 0.6 });
  const asphalt = k.mat(tex("asph", O.osAsphalt), "#ffffff", [1, 1], { roughness: 0.9, bump: 0.7 });
  const concrete = k.mat(tex("conc", O.osConcrete, "#8e8a82", 4), "#ffffff", [1, 1], { roughness: 0.9, bump: 0.5 });
  const concDark = k.mat(tex("concd", O.osConcrete, "#6e6a64", 7), "#ffffff", [1, 1], { roughness: 0.9, bump: 0.5 });
  const stucco = k.mat(tex("stuc", O.osConcrete, "#c9bca4", 9), "#ffffff", [1, 1], { roughness: 0.9, bump: 0.4 });
  const stuccoG = k.mat(tex("stucg", O.osConcrete, "#a9b4ae", 13), "#ffffff", [1, 1], { roughness: 0.9, bump: 0.4 });
  const mosaicA = k.mat(tex("mosa", O.osMosaic, "#b98f6a", "#a37a58", 5), "#ffffff", [1, 1], { roughness: 0.5, bump: 0.5 });
  const mosaicB = k.mat(tex("mosb", O.osMosaic, "#d7d2c4", "#c4bfb2", 6), "#ffffff", [1, 1], { roughness: 0.5, bump: 0.5 });
  const mosaicC = k.mat(tex("mosc", O.osMosaic, "#6f8a93", "#5d7880", 7), "#ffffff", [1, 1], { roughness: 0.5, bump: 0.5 });
  const corr = k.mat(tex("corr", O.osCorrugated, "#8a8f8c", 8), "#ffffff", [1, 1], { roughness: 0.6, metalness: 0.4, bump: 0.9 });
  const corrB = k.mat(tex("corrb", O.osCorrugated, "#5f7d8c", 18), "#ffffff", [1, 1], { roughness: 0.6, metalness: 0.4, bump: 0.9 });
  const shutters = [k.mat(tex("sh1", O.osShutter, 3, "#9aa0a3"), "#ffffff", [1, 1], { roughness: 0.5, metalness: 0.45, bump: 0.8 }),
    k.mat(tex("sh2", O.osShutter, 5, "#a8a18e"), "#ffffff", [1, 1], { roughness: 0.5, metalness: 0.45, bump: 0.8 }),
    k.mat(tex("sh3", O.osShutter, 9, "#7f8d93"), "#ffffff", [1, 1], { roughness: 0.5, metalness: 0.45, bump: 0.8 })];
  const steel = k.mat(null, "#8b9094", [1, 1], { metalness: 0.8, roughness: 0.4 });
  const steelDark = k.mat(null, "#3d4245", [1, 1], { metalness: 0.7, roughness: 0.5 });
  const greenPaint = k.mat(null, "#3f6b57", [1, 1], { metalness: 0.5, roughness: 0.45 });
  const rust = k.mat(tex("rust", O.osDrum, "#7a5a44", 2), "#ffffff", [1, 1], { metalness: 0.5, roughness: 0.7, bump: 0.6 });
  const drumB = k.mat(tex("drb", O.osDrum, "#2f5f9a", 12), "#ffffff", [1, 1], { metalness: 0.5, roughness: 0.55, bump: 0.5 });
  const drumR = k.mat(tex("drr", O.osDrum, "#a63a2a", 14), "#ffffff", [1, 1], { metalness: 0.5, roughness: 0.55, bump: 0.5 });
  const drumG = k.mat(tex("drg", O.osDrum, "#4f6e3a", 16), "#ffffff", [1, 1], { metalness: 0.5, roughness: 0.55, bump: 0.5 });
  const plasticBlue = k.mat(null, "#2b67b8", [1, 1], { roughness: 0.4 });
  const glass = k.mat(null, "#9fb4c0", [1, 1], { metalness: 0.9, roughness: 0.08 });
  const winTex = [tex("w1", O.osWindow, 1, false), tex("w2", O.osWindow, 2, false), tex("w3", O.osWindow, 3, true), tex("w4", O.osWindow, 4, false)];
  const windows = winTex.map((t, i) => k.mat(t, "#ffffff", [1, 1], { roughness: 0.2, metalness: 0.2, bump: 0, ...(i === 2 ? { emissive: "#ffffff", emissiveIntensity: 0.55 } : {}) }));
  const flyers = k.mat(tex("fly", O.osFlyers, 9), "#ffffff", [1, 1], { roughness: 0.8, bump: 0.3 });
  const stone = k.mat(tex("stone", O.osStone), "#ffffff", [1, 1], { roughness: 0.85, bump: 0.9 });
  const water = k.mat(tex("water", O.osWater), "#ffffff", [1, 1], { roughness: 0.06, metalness: 0.35, bump: 0.4 });
  const promTile = k.mat(k.tex("os-prom", () => T.tiles("#8e8b84", "#7f7c76", 8, "rgba(0,0,0,0.3)")), "#ffffff", [1, 1], { roughness: 0.8, bump: 0.6 });
  const dirt = k.mat(k.tex("os-dirt", () => T.noise("#6f6252", 0.14, 21, 2600)), "#ffffff", [1, 1], { roughness: 0.95, bump: 0.8 });
  const wood = k.mat(k.tex("os-wood", () => T.wood("#8a6a48", "#5e4630", 17)), "#ffffff", [1, 1], { roughness: 0.75, bump: 0.8 });
  const woodDark = k.mat(k.tex("os-woodd", () => T.wood("#4e3624", "#2e1f14", 19)), "#ffffff", [1, 1], { roughness: 0.6, bump: 0.7 });
  const pallet = k.mat(k.tex("os-pal", () => T.wood("#b99a6e", "#8a6e48", 23)), "#ffffff", [1, 1], { roughness: 0.85, bump: 0.8 });
  const acWhite = k.mat(null, "#d9d8d2", [1, 1], { roughness: 0.55, metalness: 0.1 });
  const black = k.mat(null, "#1b1b1c", [1, 1], { roughness: 0.6 });
  const tyre = k.mat(null, "#1a1a1a", [1, 1], { roughness: 0.85 });
  const bagW = k.mat(null, "#d8dde6", [1, 1], { roughness: 0.3 });
  const bagB = k.mat(null, "#2a2d33", [1, 1], { roughness: 0.3 });
  const bagY = k.mat(null, "#e6d88a", [1, 1], { roughness: 0.35 });
  const straw = k.mat(null, "#9c8055", [1, 1], { roughness: 0.95 });
  const cardboard = k.mat(tex("card", O.osCardboard), "#ffffff", [1, 1], { roughness: 0.9, bump: 0.3 });
  const crateY = k.mat(tex("cry", O.osCrate, "#e8b21e"), "#ffffff", [1, 1], { roughness: 0.5, bump: 0.5 });
  const crateR = k.mat(tex("crr", O.osCrate, "#c8322a"), "#ffffff", [1, 1], { roughness: 0.5, bump: 0.5 });
  const manhole = k.mat(tex("mh", O.osManhole), "#ffffff", [1, 1], { roughness: 0.6, metalness: 0.5, bump: 0.8 });
  const cone = k.mat(null, "#ff6a1a", [1, 1], { roughness: 0.5 });
  const white = k.mat(null, "#efefea", [1, 1], { roughness: 0.5 });
  const redLac = k.mat(null, "#b3201f", [1, 1], { roughness: 0.4 });
  const tower1 = k.mat(tex("tw1", O.osTower, "#6c6a66", 71), "#ffffff", [1, 1], { roughness: 0.9, bump: 0, emissive: "#ffffff", emissiveIntensity: 0.12 });
  const tower2 = k.mat(tex("tw2", O.osTower, "#8a7f72", 72), "#ffffff", [1, 1], { roughness: 0.9, bump: 0, emissive: "#ffffff", emissiveIntensity: 0.12 });
  const tower3 = k.mat(tex("tw3", O.osTower, "#556068", 73), "#ffffff", [1, 1], { roughness: 0.9, bump: 0, emissive: "#ffffff", emissiveIntensity: 0.12 });
  const bulb = k.mat(null, "#fff2cc", [1, 1], { emissive: "#ffe2a0", emissiveIntensity: 2 });
  const neonPink = k.mat(null, "#ff4fa0", [1, 1], { emissive: "#ff2f8f", emissiveIntensity: 2.2 });
  const neonBlue = k.mat(null, "#5fd0ff", [1, 1], { emissive: "#38b8ff", emissiveIntensity: 2.2 });
  const panelM = k.mat(null, "#e8eef0", [1, 1], { roughness: 0.3, transparent: false });
  panelM.m.transparent = true; panelM.m.opacity = 0.62; panelM.m.depthWrite = false;
  const lanternTex = tex("lan", O.osLantern, "祭", "#d8262b");
  const lanternM = k.mat(lanternTex, "#ffffff", [1, 1], { roughness: 0.6, bump: 0, emissive: "#ff7a50", emissiveIntensity: 0.7 });
  const lanternW = k.mat(tex("lanw", O.osLantern, "酒", "#f1ead8"), "#ffffff", [1, 1], { roughness: 0.6, bump: 0, emissive: "#ffe0b0", emissiveIntensity: 0.6 });
  const sign = (key: string, text: string, bg: string, fg: string, o: O.SignOpts = {}, glow = 0) =>
    k.mat(k.tex("os-s-" + key, () => O.osSign(text, bg, fg, o)), "#ffffff", [1, 1], { roughness: 0.45, bump: 0.15, ...(glow ? { emissive: "#ffffff", emissiveIntensity: glow } : {}) });
  B.opt(panelM, { noShadow: false });

  // ---------------- ground ----------------
  k.floor(-70, 70, -70, 11.9, concDark, 4);
  k.floor(-70, 70, 17.6, 70, concDark, 4);
  const ground = (m: Mat, x0: number, x1: number, z0: number, z1: number, unit: number, y = 0.01) => {
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
    g.rotateX(-Math.PI / 2);
    scaleUV(g, (x1 - x0) / unit, (z1 - z0) / unit);
    B.geo(m, g, (x0 + x1) / 2, y, (z0 + z1) / 2);
    B.opt(m, { noShadow: true });
  };
  ground(paving, -30, -4.5, -3, 3, 4.2);
  ground(asphalt, -4.5, 30, -3, 3, 6);
  ground(concrete, -30, 30, -14, -8.5, 3);
  ground(promTile, -30, 30, 7, 11.9, 2.4);
  ground(dirt, 13.4, 30, -8.5, 7, 5, 0.015);
  // curb stones along the open street
  for (const z of [-3, 3]) B.box(concrete, 17.9, 0.12, 0.25, 4.5 + 4.5, 0, z, { flat: true, uv: 1 });
  // manholes and drain grates
  for (const [x, z] of [[2, 0.6], [10.5, -1.2], [-9, 0.4], [-2, -11], [8, -11.6]] as const) B.cyl(manhole, 0.36, 0.36, 0.025, x, 0, z, { seg: 20, su: 1 });
  for (let i = 0; i < 12; i++) B.box(steelDark, 0.6, 0.02, 0.3, -16 + i * 2.8, 0, -8.8, { flat: true });

  // ---------------- canal ----------------
  ground(water, -70, 70, 11.9, 17.6, 6, -1.35);
  B.opt(water, { noShadow: true });
  B.blk(stone, -70, 70, -1.6, 0, 11.9, 12.2, 1.2, false);
  B.blk(stone, -70, 70, -1.6, 0, 17.3, 17.6, 1.2, false);
  // railing
  for (let x = -18; x <= 18; x += 1.5) B.cyl(greenPaint, 0.035, 0.035, 1.1, x, 0, 11.55, { seg: 8 });
  for (const y of [0.35, 0.7, 1.1]) B.rod(greenPaint, y === 1.1 ? 0.045 : 0.02, [-30, y, 11.55], [30, y, 11.55], 8);
  k.collider(-30, 30, 11.4, 11.7, 0, 1.15, false);
  // far bank: buildings with neon and a stone bridge (west)
  {
    let x = -34;
    const mats = [tower1, tower2, tower3];
    let i = 0;
    while (x < 34) {
      const w = 5 + rnd() * 4, h = 9 + rnd() * 12;
      B.blk(mats[i % 3], x, x + w, 0, h, 18.5, 24, 4, false);
      B.box(concDark, w, 0.4, 0.3, x + w / 2, h, 18.4, { flat: true });
      x += w + 0.2; i++;
    }
    const neonSigns = [
      sign("fb1", "ホテル", "#1a1030", "#ff4fa0", { neon: true, worn: 0 }, 1.2), sign("fb2", "カラオケ", "#0d1a2a", "#5fd0ff", { neon: true, worn: 0 }, 1.2),
      sign("fb3", "居酒屋", "#2a0d0d", "#ffcc33", { neon: true, worn: 0 }, 1.1), sign("fb4", "焼肉", "#1a1a1a", "#ff5533", { neon: true, worn: 0 }, 1.2),
      sign("fb5", "ラーメン", "#f4e04d", "#c0141b", { worn: 0.2 }, 0.5),
    ];
    const pos: [number, number, number, number][] = [[-22, 7, 4.5, 1.4], [-11, 9, 5.5, 1.6], [-1, 6, 4.2, 1.3], [9, 8.5, 5, 1.6], [20, 6.5, 4.4, 1.4], [28, 10, 4, 1.2]];
    pos.forEach(([px, py, pw, ph], j) => B.geo(neonSigns[j % neonSigns.length], new THREE.PlaneGeometry(pw, ph), px, py, 18.35, { ry: Math.PI }));
    for (const [px, py] of [[-16, 5], [3, 11], [14, 7]] as const) B.geo(sign("fbv" + px, "ビル", "#202020", "#ffffff", { vertical: true, worn: 0.2 }, 0.8), new THREE.PlaneGeometry(0.9, 3.6), px, py, 18.3, { ry: Math.PI });
    // bridge (west, outside the play area)
    for (let j = 0; j < 12; j++) {
      const z = 11.9 + (j + 0.5) * (5.7 / 12), u = (j + 0.5) / 12;
      B.box(stone, 5.5, 0.4, 5.7 / 12 + 0.02, -24, Math.sin(u * Math.PI) * 0.9 - 0.2, z, { flat: true, uv: 1 });
    }
    for (const s of [-1, 1]) B.box(stone, 0.3, 1.0, 5.9, -24 + s * 2.6, 0.5, 14.75, { flat: true, uv: 1 });
    // a moored boat
    B.lathe(white, [[0, 0], [0.8, 0.05], [1.0, 0.5], [1.05, 0.7], [0, 0.7]], 6, -1.5, 14.6, { s: [1, 1, 3.2], seg: 16 });
    B.box(woodDark, 1.6, 0.06, 5.6, 6, -0.85, 14.6, { flat: true, uv: 0.8 });
    B.box(acWhite, 1.3, 1.0, 1.6, 6, -0.82, 14.2, {});
  }

  // ---------------- buildings & shops ----------------
  type Shop = {
    x0: number; x1: number; side: 1 | -1; H: number; facade: Mat; kind: "open" | "shutter";
    sign?: Mat; signGlow?: boolean; vsign?: Mat; shutter?: number; interior?: (cx: number, zf: number, dir: number, w: number) => void; inner?: Mat; awning?: Mat;
  };
  const shops: Shop[] = [];
  const shop = (s: Shop) => shops.push(s);
  const buildShop = (s: Shop) => {
    const zf = s.side === 1 ? -3 : 3, zb = s.side === 1 ? -8.5 : 7, dir = s.side; // dir: facade normal = +z for north row
    const Z = (d: number) => zf - dir * d; // depth into the building
    const w = s.x1 - s.x0, cx = (s.x0 + s.x1) / 2;
    const ry = dir === 1 ? 0 : Math.PI;
    const ground = 3.2;
    // upper mass + facade
    B.blk(s.facade, s.x0, s.x1, ground, s.H, Z(0), zb, 2.2);
    // parapet & roof clutter
    B.blk(concrete, s.x0, s.x1, s.H, s.H + 0.5, Z(0), Z(0.25), 1.5, false);
    if (rnd() < 0.6) { const tx = s.x0 + 0.8 + rnd() * (w - 1.6); B.cyl(stucco, 0.7, 0.7, 1.4, tx, s.H + 0.8, Z(3.4), { seg: 14 }); for (const [a, b] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) B.rod(steel, 0.04, [tx + a, s.H, Z(3.4) + b], [tx + a, s.H + 0.8, Z(3.4) + b], 5); }
    if (rnd() < 0.5) { const ax = s.x0 + 0.5 + rnd() * (w - 1); B.rod(steel, 0.02, [ax, s.H, Z(2)], [ax, s.H + 2.5, Z(2)], 5); B.rod(steel, 0.015, [ax - 0.6, s.H + 2.2, Z(2)], [ax + 0.6, s.H + 2.2, Z(2)], 4); B.rod(steel, 0.015, [ax - 0.4, s.H + 1.8, Z(2)], [ax + 0.4, s.H + 1.8, Z(2)], 4); }
    // pillars at the sides of the shop front
    B.blk(s.facade, s.x0, s.x0 + 0.25, 0, ground, Z(0), Z(0.4), 2.2);
    B.blk(s.facade, s.x1 - 0.25, s.x1, 0, ground, Z(0), Z(0.4), 2.2);
    // upper windows
    const floors = Math.floor((s.H - ground) / 2.8);
    const nw = Math.max(1, Math.floor((w - 0.6) / 1.7));
    for (let f = 0; f < floors; f++)
      for (let i = 0; i < nw; i++) {
        const wx = s.x0 + 0.3 + ((i + 0.5) * (w - 0.6)) / nw, wy = ground + 0.9 + f * 2.8 + 0.7;
        const wm = windows[Math.floor(rnd() * windows.length)];
        B.geo(wm, new THREE.PlaneGeometry(1.1, 1.2), wx, wy, Z(-0.02), { ry });
        B.box(steel, 1.24, 0.07, 0.22, wx, wy - 0.66, Z(-0.08), { flat: true });
        B.box(steel, 1.24, 0.05, 0.1, wx, wy + 0.6, Z(-0.03), { flat: true });
        // AC unit hanging under some windows / railings
        if (rnd() < 0.35) {
          B.box(acWhite, 0.8, 0.58, 0.3, wx + 0.2, wy - 1.3, Z(-0.2), {});
          B.cyl(black, 0.2, 0.2, 0.02, wx + 0.1, wy - 1.3 + 0.29, Z(-0.36), { rx: Math.PI / 2, seg: 14 });
          B.tube(acWhite, [[wx - 0.2, wy - 1.1, Z(-0.1)], [wx - 0.35, wy - 1.0, Z(-0.03)], [wx - 0.4, wy - 2.2, Z(-0.03)]], 0.03, { seg: 10, rs: 5 });
        }
        if (rnd() < 0.2) B.box(steel, 1.3, 0.9, 0.35, wx, wy - 0.65, Z(-0.2), { flat: true }); // balcony guard
      }
    // drainpipe down one side
    const px = rnd() < 0.5 ? s.x0 + 0.1 : s.x1 - 0.1;
    B.cyl(greenPaint, 0.05, 0.05, s.H, px, 0, Z(-0.08), { seg: 8 });
    // horizontal shop sign band
    if (s.sign) {
      B.box(steelDark, w - 0.3, 0.95, 0.18, cx, ground + 0.1, Z(-0.09), { flat: true });
      B.geo(s.sign, new THREE.PlaneGeometry(w - 0.45, 0.85), cx, ground + 0.575, Z(-0.185), { ry });
      if (s.signGlow) for (let i = 0; i < Math.floor(w / 0.6); i++) B.sphere(bulb, 0.05, s.x0 + 0.4 + i * 0.6, ground + 1.1, Z(-0.2), { ws: 6, hs: 4 });
    }
    // vertical protruding sign
    if (s.vsign) {
      const vx = s.x1 - 0.5, vz = Z(-0.75);
      B.box(steelDark, 0.14, 3.0, 1.0, vx, ground + 1.3, vz, { flat: true });
      B.geo(s.vsign, new THREE.PlaneGeometry(0.9, 2.9), vx + 0.075, ground + 2.8, vz, { ry: Math.PI / 2 });
      B.geo(s.vsign, new THREE.PlaneGeometry(0.9, 2.9), vx - 0.075, ground + 2.8, vz, { ry: -Math.PI / 2 });
      B.rod(steel, 0.025, [vx, ground + 4.3, Z(0)], [vx, ground + 4.3, vz - dir * 0.2], 5);
    }
    if (s.kind === "shutter") {
      B.blk(concrete, s.x0 + 0.25, s.x1 - 0.25, 0, ground, Z(0.35), zb, 2);
      const shm = shutters[s.shutter ?? 0];
      const sg = new THREE.PlaneGeometry(w - 0.5, 2.85);
      scaleUV(sg, (w - 0.5) / 2.5, 2.85 / 2.5);
      B.geo(shm, sg, cx, 1.425, Z(0.34), { ry });
      B.box(shm, w - 0.5, 0.35, 0.35, cx, 2.85, Z(0.2), { flat: true, uv: 1 });
      B.box(steelDark, w - 0.5, 0.05, 0.1, cx, 0, Z(0.3), { flat: true });
      // taped notice on the shutter
      if (rnd() < 0.6) B.geo(flyers, new THREE.PlaneGeometry(0.5, 0.65), cx + (rnd() - 0.5) * (w - 1.6), 1.5, Z(0.33), { ry, su: 0.3, sv: 0.3 });
    } else {
      const D = 3.2;
      B.blk(concrete, s.x0 + 0.25, s.x1 - 0.25, 0, ground, Z(D), zb, 2);
      B.blk(concrete, s.x0 + 0.25, s.x1 - 0.25, 2.9, ground, Z(0), Z(D), 2, false);
      const inner = s.inner ?? stucco;
      const bw = new THREE.PlaneGeometry(w - 0.5, 2.9);
      scaleUV(bw, (w - 0.5) / 2.2, 2.9 / 2.2);
      B.geo(inner, bw, cx, 1.45, Z(D - 0.01), { ry });
      for (const sx of [s.x0 + 0.26, s.x1 - 0.26]) {
        const sw = new THREE.PlaneGeometry(D, 2.9);
        scaleUV(sw, D / 2.2, 2.9 / 2.2);
        B.geo(inner, sw, sx, 1.45, Z(D / 2), { ry: sx < cx ? Math.PI / 2 : -Math.PI / 2 });
      }
      const fl = new THREE.PlaneGeometry(w - 0.5, D);
      fl.rotateX(-Math.PI / 2);
      scaleUV(fl, (w - 0.5) / 1.2, D / 1.2);
      B.geo(shopFloor, fl, cx, 0.012, Z(D / 2));
      // ceiling light tubes
      for (let i = 0; i < Math.max(1, Math.floor(w / 2.2)); i++) B.box(bulb, 1.2, 0.05, 0.12, s.x0 + 0.25 + ((i + 0.5) * (w - 0.5)) / Math.max(1, Math.floor(w / 2.2)), 2.84, Z(D / 2), { flat: true });
      // rolled-up shutter box
      B.box(shutters[s.shutter ?? 0], w - 0.5, 0.3, 0.35, cx, 2.9, Z(0.2), { flat: true, uv: 1 });
      if (s.awning) {
        const ag = new THREE.BoxGeometry(w - 0.1, 0.06, 1.3);
        B.geo(s.awning, ag, cx, 3.05, Z(-0.6), { rx: dir * 0.28, su: (w - 0.1) / 1.2 });
      }
      s.interior?.(cx, zf, dir, w);
    }
  };
  const shopFloor = k.mat(k.tex("os-sfloor", () => T.tiles("#c9c3b5", "#b7b0a2", 8, "rgba(0,0,0,0.25)")), "#ffffff", [1, 1], { roughness: 0.4, bump: 0.4 });
  const awnRed = k.mat(k.tex("os-awr", () => T.stripes(["#c0302a", "#f1ece0"], true)), "#ffffff", [1, 1], { roughness: 0.8, bump: 0.2 });
  const awnGreen = k.mat(k.tex("os-awg", () => T.stripes(["#2f6b3f", "#efe9d8"], true)), "#ffffff", [1, 1], { roughness: 0.8, bump: 0.2 });

  // shop contents helpers
  const counter = (x: number, z: number, w: number, d: number, top: Mat, body: Mat) => {
    B.box(body, w, 0.86, d, x, 0, z, { uv: 1 });
    B.box(top, w + 0.06, 0.05, d + 0.06, x, 0.86, z, { flat: true, uv: 1 });
    k.collider(x - w / 2, x + w / 2, z - d / 2, z + d / 2, 0, 0.91, true);
  };
  const stool = (x: number, z: number) => { B.cyl(redLac, 0.18, 0.18, 0.08, x, 0.62, z, { seg: 12 }); B.cyl(steel, 0.03, 0.03, 0.62, x, 0, z, { seg: 6 }); B.cyl(steel, 0.16, 0.18, 0.03, x, 0, z, { seg: 12 }); };
  const goodsShelf = (x: number, z: number, w: number, h: number, ry: number) => {
    B.box(steel, w, h, 0.45, x, 0, z, { ry, flat: true });
    B.geo(goodsM, new THREE.PlaneGeometry(w - 0.06, h - 0.1), x + Math.sin(ry) * 0.23, h / 2 + 0.02, z + Math.cos(ry) * 0.23, { ry, su: w / 1.3, sv: h / 1.3 });
    const c = Math.abs(Math.cos(ry)), sn = Math.abs(Math.sin(ry));
    k.collider(x - (w / 2) * c - 0.23 * sn, x + (w / 2) * c + 0.23 * sn, z - (w / 2) * sn - 0.23 * c, z + (w / 2) * sn + 0.23 * c, 0, h, true);
  };
  const goodsM = k.mat(tex("goods", O.osGoods, 6), "#ffffff", [1, 1], { roughness: 0.5, bump: 0.3 });
  const noren = (x: number, zf: number, dir: number, w: number, m: Mat) => {
    const g = new THREE.PlaneGeometry(w, 0.9, 6, 1);
    B.geo(m, g, x, 2.42, zf - dir * 0.05, { ry: dir === 1 ? 0 : Math.PI });
    B.rod(woodDark, 0.025, [x - w / 2 - 0.1, 2.9, zf - dir * 0.05], [x + w / 2 + 0.1, 2.9, zf - dir * 0.05], 6);
  };
  const lanternGeo = (r: number, h: number) => new THREE.LatheGeometry([[0.02, 0], [r * 0.55, 0.02], [r * 0.9, h * 0.2], [r, h * 0.5], [r * 0.9, h * 0.8], [r * 0.55, h * 0.98], [0.02, h]].map(([a, b]) => new THREE.Vector2(a, b)), 14);
  const lantern = (x: number, y: number, z: number, r = 0.28, m = lanternM) => {
    B.geo(m, lanternGeo(r, r * 2.3), x, y, z);
    B.cyl(black, r * 0.56, r * 0.56, 0.05, x, y - 0.03, z, { seg: 10 });
    B.cyl(black, r * 0.56, r * 0.56, 0.05, x, y + r * 2.3 - 0.02, z, { seg: 10 });
  };

  // ---------------- props ----------------
  const drum = (x: number, z: number, m: Mat, y = 0, lying = false, ry = 0) => {
    if (!lying) {
      B.cyl(m, 0.29, 0.29, 0.88, x, y, z, { seg: 18, su: 2 });
      for (const hy of [0.29, 0.59]) B.geo(m, new THREE.TorusGeometry(0.295, 0.018, 4, 18), x, y + hy, z, { rx: Math.PI / 2 });
      B.cyl(steelDark, 0.27, 0.27, 0.01, x, y + 0.88, z, { seg: 16 });
      k.collider(x - 0.29, x + 0.29, z - 0.29, z + 0.29, y, y + 0.89, true);
    } else {
      B.cyl(m, 0.29, 0.29, 0.88, x, 0.29 - 0.44, z, { seg: 18, rz: Math.PI / 2, ry, su: 2 });
      const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry));
      k.collider(x - 0.44 * c - 0.29 * s, x + 0.44 * c + 0.29 * s, z - 0.44 * s - 0.29 * c, z + 0.44 * s + 0.29 * c, 0, 0.58, true);
    }
  };
  const bagGeo = (r: number, seed: number) => {
    const g = new THREE.SphereGeometry(r, 12, 9);
    const rr = O.rng(seed), p = g.attributes.position;
    const f = [rr(), rr(), rr(), rr()];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const n = 1 + 0.12 * Math.sin(x * 9 + f[0] * 6) * Math.cos(z * 8 + f[1] * 6) + 0.06 * Math.sin(y * 14 + f[2] * 6);
      p.setXYZ(i, x * n, (y < 0 ? y * 0.7 : y) * n * 0.9, z * n);
    }
    g.computeVertexNormals();
    return g;
  };
  const bagPile = (x: number, z: number, n: number, spread = 0.9) => {
    const ms = [bagW, bagW, bagB, bagY];
    let top = 0;
    for (let i = 0; i < n; i++) {
      const a = i * 2.4, d = i < 4 ? spread * 0.45 : 0.15;
      const r = 0.32 + rnd() * 0.12, y = i < 4 ? r * 0.7 : r * 0.7 + 0.45;
      const bx = x + Math.cos(a) * d, bz = z + Math.sin(a) * d;
      const m = ms[Math.floor(rnd() * ms.length)];
      B.geo(m, bagGeo(r, i * 13 + Math.floor(x * 7)), bx, y, bz, { ry: a });
      B.geo(m, new THREE.ConeGeometry(0.07, 0.18, 6), bx, y + r * 0.85, bz, { rz: 0.3 });
      top = Math.max(top, y + r * 0.8);
    }
    k.collider(x - spread * 0.6, x + spread * 0.6, z - spread * 0.6, z + spread * 0.6, 0, top, true);
  };
  const vending = (x: number, z: number, ry: number, body: string, seed: number) => {
    const m = k.mat(k.tex("os-vm" + seed, () => O.osVending(body, seed)), "#ffffff", [1, 1], { roughness: 0.3, bump: 0.2, emissive: "#ffffff", emissiveIntensity: 0.35 });
    const bodyM = k.mat(null, body, [1, 1], { roughness: 0.35, metalness: 0.3 });
    B.box(bodyM, 1.0, 1.83, 0.72, x, 0, z, { ry });
    B.geo(m, new THREE.PlaneGeometry(0.92, 1.78), x + Math.sin(ry) * 0.365, 0.93, z + Math.cos(ry) * 0.365, { ry });
    B.box(bodyM, 1.04, 0.08, 0.8, x, 1.83, z, { ry, flat: true });
    const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry));
    k.collider(x - 0.5 * c - 0.36 * s, x + 0.5 * c + 0.36 * s, z - 0.5 * s - 0.36 * c, z + 0.5 * s + 0.36 * c, 0, 1.9, true);
    // recycle bin next to it
    const bx = x + Math.cos(ry) * 0.85, bz = z - Math.sin(ry) * 0.85;
    B.cyl(plasticBlue, 0.22, 0.2, 0.75, bx, 0, bz, { seg: 14 });
    B.cyl(white, 0.23, 0.23, 0.06, bx, 0.75, bz, { seg: 14 });
  };
  const bike = (x: number, z: number, ry: number, m: Mat) => {
    const c = Math.cos(ry), s = Math.sin(ry);
    const P = (lx: number, ly: number, lz = 0): V3t => [x + lx * c + lz * s, ly, z - lx * s + lz * c];
    for (const wx of [-0.52, 0.52]) {
      B.geo(tyre, new THREE.TorusGeometry(0.33, 0.025, 5, 22), ...P(wx, 0.35), { ry: ry });
      B.geo(steel, new THREE.TorusGeometry(0.3, 0.008, 3, 16), ...P(wx, 0.35), { ry: ry });
    }
    B.rod(m, 0.022, P(-0.52, 0.35), P(-0.05, 0.38));
    B.rod(m, 0.022, P(-0.05, 0.38), P(0.42, 0.85));
    B.rod(m, 0.022, P(-0.05, 0.38), P(-0.2, 0.85));
    B.rod(m, 0.018, P(-0.2, 0.85), P(-0.52, 0.35));
    B.rod(m, 0.02, P(0.52, 0.35), P(0.42, 0.95));
    B.rod(steel, 0.015, P(0.42, 0.98, -0.28), P(0.42, 0.98, 0.28), 6);
    B.box(black, 0.24, 0.06, 0.14, ...P(-0.22, 0.87), { ry });
    B.box(steelDark, 0.34, 0.24, 0.3, ...P(0.62, 0.8), { ry, flat: true });
    k.collider(x - 0.8 * Math.abs(c) - 0.2, x + 0.8 * Math.abs(c) + 0.2, z - 0.8 * Math.abs(s) - 0.2, z + 0.8 * Math.abs(s) + 0.2, 0, 1.0, false);
  };
  const bikeCols = [k.mat(null, "#c9ccd0", [1, 1], { metalness: 0.7, roughness: 0.35 }), k.mat(null, "#d97aa0", [1, 1], { metalness: 0.4, roughness: 0.4 }), k.mat(null, "#2b2f33", [1, 1], { metalness: 0.5, roughness: 0.4 }), k.mat(null, "#4d7fb8", [1, 1], { metalness: 0.4, roughness: 0.4 })];
  const crateStack = (x: number, z: number, n: number, m: Mat, ry = 0) => {
    for (let i = 0; i < n; i++) B.box(m, 0.6, 0.3, 0.4, x, i * 0.3, z, { ry: ry + (rnd() - 0.5) * 0.1, su: 1 });
    k.collider(x - 0.35, x + 0.35, z - 0.35, z + 0.35, 0, n * 0.3, true);
  };
  const boxes = (x: number, z: number) => {
    B.box(cardboard, 0.7, 0.5, 0.5, x, 0, z, { ry: 0.1 });
    B.box(cardboard, 0.5, 0.4, 0.4, x + 0.1, 0.5, z, { ry: -0.2 });
    B.box(cardboard, 0.6, 0.35, 0.45, x + 0.7, 0, z + 0.1, { ry: 0.4 });
    k.collider(x - 0.4, x + 1.05, z - 0.35, z + 0.4, 0, 0.9, true);
  };
  const palletStack = (x: number, z: number, n: number, ry = 0) => {
    for (let i = 0; i < n; i++) {
      const y = i * 0.15;
      for (const dz of [-0.5, 0, 0.5]) B.box(pallet, 1.1, 0.1, 0.12, x, y, z + dz, { ry, flat: true, uv: 0.8 });
      for (let j = 0; j < 5; j++) B.box(pallet, 0.14, 0.03, 1.2, x - 0.48 + j * 0.24, y + 0.1, z, { ry, flat: true, uv: 0.8 });
    }
    k.collider(x - 0.65, x + 0.65, z - 0.65, z + 0.65, 0, n * 0.15 + 0.03, true);
  };
  const tumbleGeo = (() => {
    const parts: G[] = [];
    const rr = O.rng(5);
    for (let i = 0; i < 12; i++) {
      const ax = new V3(rr() - 0.5, rr() - 0.5, rr() - 0.5).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 0, 1), ax);
      const pts: THREE.Vector3[] = [];
      const R = 0.38 + rr() * 0.14;
      for (let j = 0; j < 14; j++) { const a = (j / 14) * Math.PI * 2; pts.push(new V3(Math.cos(a) * R * (0.85 + rr() * 0.3), Math.sin(a) * R * (0.85 + rr() * 0.3), (rr() - 0.5) * 0.12).applyQuaternion(q)); }
      parts.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 28, 0.012, 3, true));
    }
    return parts;
  })();
  const tumbleweed = (x: number, z: number, s: number) => {
    const rx = rnd() * 6, ry = rnd() * 6;
    for (const p of tumbleGeo) B.geo(straw, p.clone(), x, 0.45 * s, z, { s, rx, ry });
  };
  const cone3 = (x: number, z: number) => { B.cyl(cone, 0.04, 0.16, 0.7, x, 0.03, z, { seg: 12 }); B.box(cone, 0.4, 0.04, 0.4, x, 0, z, { flat: true }); B.cyl(white, 0.1, 0.12, 0.1, x, 0.35, z, { seg: 12 }); };
  const plant = (x: number, z: number, s = 1) => {
    B.lathe(k.mat(null, "#8a5a3a", [1, 1], { roughness: 0.7 }) === plantPot ? plantPot : plantPot, [[0, 0], [0.18 * s, 0], [0.24 * s, 0.35 * s], [0.25 * s, 0.38 * s], [0, 0.38 * s]], x, 0, z, { seg: 12 });
    for (let i = 0; i < 5; i++) B.sphere(leafM, 0.16 * s, x + (rnd() - 0.5) * 0.25 * s, 0.45 * s + rnd() * 0.25 * s, z + (rnd() - 0.5) * 0.25 * s, { ws: 8, hs: 6 });
  };
  const plantPot = k.mat(null, "#8a5a3a", [1, 1], { roughness: 0.7 });
  const leafM = k.mat(k.tex("leaves", T.leaves), "#9fbf8a", [1, 1], { roughness: 0.8 });
  const acUnit = (x: number, y: number, z: number, ry: number) => {
    B.box(acWhite, 0.8, 0.6, 0.3, x, y, z, { ry });
    B.cyl(black, 0.2, 0.2, 0.02, x + Math.sin(ry) * 0.16 - Math.cos(ry) * 0.1, y + 0.3, z + Math.cos(ry) * 0.16 + Math.sin(ry) * 0.1, { rx: Math.PI / 2, ry, seg: 14 });
    k.collider(x - 0.42, x + 0.42, z - 0.42, z + 0.42, y, y + 0.6, true);
  };
  const pole = (x: number, z: number, h = 9) => {
    B.cyl(concrete, 0.12, 0.17, h, x, 0, z, { seg: 12, su: 0.5 });
    B.box(steelDark, 1.6, 0.1, 0.1, x, h - 0.6, z, { flat: true });
    B.box(steelDark, 1.2, 0.1, 0.1, x, h - 1.4, z, { flat: true });
    for (const dx of [-0.7, 0, 0.7]) B.cyl(white, 0.04, 0.05, 0.14, x + dx, h - 0.5, z, { seg: 6 });
    B.cyl(steel, 0.22, 0.22, 0.7, x + 0.3, h - 2.6, z + 0.25, { seg: 12 });
    B.box(k.mat(null, "#d9c74a", [1, 1], { roughness: 0.6 }) === yellowPlate ? yellowPlate : yellowPlate, 0.25, 0.9, 0.02, x, 1.9, z + 0.17, { flat: true });
    k.collider(x - 0.18, x + 0.18, z - 0.18, z + 0.18, 0, h, false);
    return [x, h - 0.5, z] as V3t;
  };
  const yellowPlate = k.mat(null, "#d9c74a", [1, 1], { roughness: 0.6 });
  const wireM = k.mat(null, "#151515", [1, 1], { roughness: 0.7 });

  // ---------------- shop definitions ----------------
  const cafeSign = sign("cafe", "喫茶 ミナミ", "#5a2d1a", "#f6e3b4", { border: "#f6e3b4" });
  const uniSign = sign("uni", "うに道場", "#b3101a", "#ffffff", { border: "#f2c94c", sub: "活うに料理" }, 0.25);
  const takoSign = sign("tako", "たこ焼", "#f2c230", "#b3101a", { border: "#b3101a", sub: "名物 八ちゃん" }, 0.2);
  const gyozaSign = sign("gyoza", "餃子の王道", "#1b1b1b", "#ffd23f", { border: "#d62828" }, 0.25);
  const okoSign = sign("oko", "お好み焼", "#f7f1e1", "#a0151c", { border: "#a0151c", sub: "鉄板焼 ふじ" }, 0.15);
  const drugSign = sign("drug", "くすり", "#ffd400", "#0a3c9c", { sub: "ドラッグ ナニワ", worn: 0.2 }, 0.4);
  const hwSign = sign("hw", "金物 まるや", "#22435e", "#ffffff", { border: "#ffffff" });
  const izaSign = sign("iza", "居酒屋 たぬき", "#2b2b2b", "#f2e6c9", { border: "#b3101a" });
  const rentSign = sign("rent", "貸店舗", "#f4f1e8", "#c0141b", { border: "#c0141b", worn: 0.8 });
  const vUni = sign("vuni", "うに", "#1a1a1a", "#ff5533", { vertical: true, neon: true, worn: 0.2 }, 0.9);
  const vDrug = sign("vdrug", "薬", "#c0141b", "#ffffff", { vertical: true, sub: "ドラッグ", worn: 0.2 }, 0.6);
  const vTako = sign("vtako", "たこ焼", "#ffffff", "#c0141b", { vertical: true, worn: 0.4 }, 0.3);
  const vGyoza = sign("vgyoza", "餃子", "#d62828", "#ffffff", { vertical: true, worn: 0.3 }, 0.5);
  const vIza = sign("viza", "酒場", "#f2e6c9", "#1a1a1a", { vertical: true, worn: 0.6 }, 0.3);
  const vCafe = sign("vcafe", "珈琲", "#2b5a3a", "#ffffff", { vertical: true, worn: 0.6 }, 0.3);

  // north row (facing +z)
  shop({ x0: -19.6, x1: -12.8, side: 1, H: 8, facade: mosaicA, kind: "open", sign: cafeSign, vsign: vCafe, awning: awnGreen, inner: woodP(),
    interior: (cx, zf) => {
      counter(cx + 1.8, zf - 2.4, 2.6, 0.6, woodDark, wood);
      for (const [tx, tz] of [[cx - 1.6, zf - 1.3], [cx - 0.1, zf - 2.2]] as const) {
        B.cyl(woodDark, 0.4, 0.4, 0.04, tx, 0.72, tz, { seg: 16 }); B.cyl(steel, 0.04, 0.04, 0.72, tx, 0, tz, { seg: 6 });
        k.collider(tx - 0.4, tx + 0.4, tz - 0.4, tz + 0.4, 0, 0.76, true);
        stool(tx + 0.55, tz); stool(tx - 0.55, tz);
      }
      // food-sample display case at the front
      B.box(woodDark, 1.4, 0.8, 0.5, cx + 2.2, 0, zf - 0.45, {});
      B.box(glass, 1.4, 0.6, 0.5, cx + 2.2, 0.8, zf - 0.45, { flat: true });
      for (let i = 0; i < 4; i++) B.cyl(white, 0.12, 0.1, 0.05, cx + 1.7 + i * 0.33, 0.85, zf - 0.45, { seg: 10 });
      for (let i = 0; i < 4; i++) B.sphere([bagY, redLac, cone, woodDark][i], 0.08, cx + 1.7 + i * 0.33, 0.94, zf - 0.45, { ws: 8, hs: 6 });
      k.collider(cx + 1.5, cx + 2.9, zf - 0.7, zf - 0.2, 0, 1.4, true);
    } });
  shop({ x0: -12.8, x1: -9.2, side: 1, H: 7.2, facade: stuccoG, kind: "shutter", sign: rentSign, shutter: 0 });
  shop({ x0: -9.2, x1: -5.9, side: 1, H: 9, facade: corr, kind: "shutter", shutter: 1 });
  shop({ x0: -4.1, x1: 2.2, side: 1, H: 9.5, facade: mosaicB, kind: "open", sign: uniSign, vsign: vUni, inner: woodP(), shutter: 2,
    interior: (cx, zf) => {
      counter(cx, zf - 2.3, 4.4, 0.6, woodDark, wood);
      for (let i = 0; i < 5; i++) stool(cx - 1.8 + i * 0.9, zf - 1.6);
      B.box(glass, 3.0, 0.3, 0.4, cx, 0.91, zf - 2.3, { flat: true });
      for (let i = 0; i < 7; i++) B.sphere(uniRoe, 0.07, cx - 1.2 + i * 0.4, 1.0, zf - 2.3, { ws: 8, hs: 6, s: [1.6, 0.6, 1] });
      noren(cx, zf, 1, 2.2, norenUni);
      for (let i = 0; i < 3; i++) lantern(cx - 2.4 + i * 2.4 + (i === 1 ? 10 : 0), 2.05, zf + 0.35, 0.2);
    } });
  shop({ x0: 2.2, x1: 7.4, side: 1, H: 8, facade: stucco, kind: "open", sign: takoSign, vsign: vTako, awning: awnRed, inner: concrete, shutter: 0,
    interior: (cx, zf) => {
      // takoyaki griddle counter at the front
      counter(cx - 0.4, zf - 0.55, 3.0, 0.8, steel, k.mat(null, "#c0302a", [1, 1], { roughness: 0.5 }));
      B.geo(griddle, new THREE.PlaneGeometry(2.6, 0.62), cx - 0.4, 0.915, zf - 0.55, { rx: -Math.PI / 2 });
      B.box(steelDark, 0.6, 0.5, 0.4, cx + 1.6, 0, zf - 2.6, {});
      goodsShelf(cx + 0.8, zf - 2.9, 2.0, 1.8, 0);
      crateStack(cx + 2.0, zf - 1.4, 3, crateY);
      lantern(cx - 2.0, 2.2, zf + 0.35, 0.22);
      lantern(cx + 1.2, 2.2, zf + 0.35, 0.22);
    } });
  shop({ x0: 9.3, x1: 13.4, side: 1, H: 7, facade: woodFacade(), kind: "shutter", sign: izaSign, vsign: vIza, shutter: 2 });

  // south row (facing −z)
  shop({ x0: -16.1, x1: -12.2, side: -1, H: 7.5, facade: corrB, kind: "shutter", shutter: 1 });
  shop({ x0: -12.2, x1: -7.6, side: -1, H: 8.5, facade: stucco, kind: "open", sign: hwSign, inner: concrete, shutter: 2,
    interior: (cx, zf) => {
      goodsShelf(cx - 1.2, zf + 2.9, 1.8, 2.0, Math.PI);
      goodsShelf(cx + 1.0, zf + 2.9, 1.8, 2.0, Math.PI);
      goodsShelf(cx + 1.9, zf + 1.4, 1.4, 1.2, -Math.PI / 2);
      // buckets & brooms outside
      for (let i = 0; i < 4; i++) B.lathe([plasticBlue, cone, bagY, white][i], [[0, 0], [0.14, 0], [0.18, 0.3], [0.19, 0.31], [0, 0.31]], cx - 1.8 + i * 0.4, 0, zf - 0.35, { seg: 12 });
      for (let i = 0; i < 3; i++) B.rod(wood, 0.02, [cx - 0.3 + i * 0.12, 0.2, zf - 0.2], [cx - 0.2 + i * 0.1, 1.4, zf + 0.05], 5);
      k.collider(cx - 2.0, cx - 0.1, zf - 0.55, zf - 0.1, 0, 0.4, true);
      B.geo(hoseM, new THREE.TorusGeometry(0.25, 0.05, 6, 16), cx + 0.6, 1.2, zf + 0.25, {});
    } });
  shop({ x0: -7.6, x1: -3.7, side: -1, H: 7, facade: mosaicC, kind: "shutter", shutter: 0 });
  shop({ x0: -1.6, x1: 4.0, side: -1, H: 9, facade: stuccoG, kind: "open", sign: gyozaSign, vsign: vGyoza, inner: woodP(), shutter: 1,
    interior: (cx, zf) => {
      counter(cx + 0.4, zf + 2.3, 4.0, 0.6, woodDark, wood);
      for (let i = 0; i < 4; i++) stool(cx - 1.0 + i * 0.9, zf + 1.6);
      noren(cx - 0.3, zf, -1, 2.0, norenGyoza);
      B.geo(menuGyoza, new THREE.PlaneGeometry(0.6, 0.9), cx - 2.2, 1.3, zf - 0.02, { ry: Math.PI });
      B.box(woodDark, 0.7, 1.0, 0.1, cx - 2.2, 0.35, zf - 0.08, { flat: true });
    } });
  shop({ x0: 4.0, x1: 9.0, side: -1, H: 8, facade: mosaicA, kind: "open", sign: okoSign, awning: awnRed, inner: stucco, shutter: 2,
    interior: (cx, zf) => {
      for (const tx of [cx - 1.2, cx + 1.2]) {
        B.box(steelDark, 1.2, 0.72, 0.8, tx, 0, zf + 1.9, { flat: true });
        B.box(steel, 1.3, 0.04, 0.9, tx, 0.72, zf + 1.9, { flat: true });
        k.collider(tx - 0.65, tx + 0.65, zf + 1.45, zf + 2.35, 0, 0.76, true);
        stool(tx - 0.5, zf + 1.2); stool(tx + 0.5, zf + 1.2);
      }
      B.cyl(okoM, 0.3, 0.3, 0.05, cx - 1.2, 0.76, zf + 1.9, { seg: 20 });
      plant(cx + 2.1, zf - 0.3, 1.2);
    } });
  shop({ x0: 9.0, x1: 13.4, side: -1, H: 10, facade: mosaicB, kind: "open", sign: drugSign, signGlow: true, vsign: vDrug, inner: whiteWall(), shutter: 0,
    interior: (cx, zf) => {
      goodsShelf(cx - 1.0, zf + 2.9, 1.9, 2.0, Math.PI);
      goodsShelf(cx + 1.0, zf + 2.9, 1.9, 2.0, Math.PI);
      goodsShelf(cx, zf + 1.4, 1.6, 1.3, Math.PI);
      // sale shelves and baskets out front
      goodsShelf(cx - 1.3, zf - 0.45, 1.3, 1.1, Math.PI);
      for (let i = 0; i < 3; i++) B.box(k.mat(null, "#e63946", [1, 1], { roughness: 0.4 }) === basketM ? basketM : basketM, 0.5, 0.25, 0.35, cx + 0.6 + i * 0.55, 0, zf - 0.45, {});
      k.collider(cx + 0.3, cx + 2.0, zf - 0.65, zf - 0.25, 0, 0.26, true);
      for (let i = 0; i < 5; i++) B.geo(popM, new THREE.PlaneGeometry(0.22, 0.16), cx - 1.8 + i * 0.25, 1.2, zf - 0.69, { ry: Math.PI });
    } });
  function woodP() { return k.mat(k.tex("os-woodp", () => T.wood("#9a7a58", "#6e5236", 29)), "#ffffff", [1, 1], { roughness: 0.7, bump: 0.6 }); }
  function woodFacade() { return k.mat(k.tex("os-woodf", () => T.wood("#5c4130", "#3a281c", 31)), "#ffffff", [1, 1], { roughness: 0.75, bump: 0.8 }); }
  function whiteWall() { return k.mat(null, "#f2f2ee", [1, 1], { roughness: 0.6 }); }
  const uniRoe = k.mat(null, "#ff9a2e", [1, 1], { roughness: 0.25 });
  const norenUni = k.mat(k.tex("os-nu", () => O.osNoren("うに", "#1f2f5a")), "#ffffff", [1, 1], { roughness: 0.9, bump: 0.1 });
  const norenGyoza = k.mat(k.tex("os-ng", () => O.osNoren("餃子", "#b3101a")), "#ffffff", [1, 1], { roughness: 0.9, bump: 0.1 });
  const menuGyoza = k.mat(k.tex("os-mg", () => O.osMenu("餃子", 4)), "#ffffff", [1, 1], { roughness: 0.7, bump: 0.1 });
  const griddle = k.mat(k.tex("os-grid", O.osGriddle), "#ffffff", [1, 1], { roughness: 0.4, metalness: 0.3, bump: 0.6 });
  const okoM = k.mat(k.tex("os-oko", O.osOkonomi), "#ffffff", [1, 1], { roughness: 0.35, bump: 0.4 });
  const hoseM = k.mat(null, "#3f9a4a", [1, 1], { roughness: 0.5 });
  const basketM = k.mat(null, "#e63946", [1, 1], { roughness: 0.4 });
  const popM = k.mat(k.tex("os-pop", () => O.osSign("特価", "#ffe14d", "#d00000", { worn: 0 })), "#ffffff", [1, 1], { roughness: 0.6, bump: 0 });

  for (const s of shops) buildShop(s);

  // alley walls (the side walls of the buildings facing the alleys) + alley clutter
  const alleyN = (x0: number, x1: number) => {
    // floor already concrete-ish: overlay
    ground(concrete, x0, x1, -8.5, -3, 2.5, 0.013);
    // overhead: pipes, wires, a sign sticking out
    B.rod(steel, 0.05, [x0 + 0.05, 4.2, -8.4], [x0 + 0.05, 4.2, -3.1], 8);
    B.rod(greenPaint, 0.04, [x1 - 0.05, 3.6, -8.4], [x1 - 0.05, 3.6, -3.1], 8);
    B.wire(wireM, [x0, 6.2, -5], [x1, 6.0, -6.5], 0.4);
    B.wire(wireM, [x0, 5.4, -4], [x1, 5.8, -7.5], 0.3);
  };
  // alley A (x −5.9…−4.1) and alley B (7.4…9.3)
  alleyN(-5.9, -4.1);
  alleyN(7.4, 9.3);
  B.blk(concDark, -5.9, -4.1, 7.5, 9.5, -8.5, -8.2, 2, false);
  bagPile(-4.7, -7.4, 3, 0.6);
  cone3(8.0, -3.8);
  // passage C to the promenade (x −3.7…−1.6) with a torii-like frame of pipes
  ground(concrete, -3.7, -1.6, 3, 7, 2.5, 0.013);
  B.rod(steel, 0.05, [-3.65, 3.8, 3.1], [-3.65, 3.8, 6.9], 8);
  B.wire(wireM, [-3.7, 5.5, 4], [-1.6, 5.2, 6], 0.3);
  // west gap (x −18…−16.1) to the promenade: just open
  // east lot gets the rest

  // ---------------- the arcade (west half) ----------------
  {
    const ax0 = -19.6, ax1 = -4.4, R = 4.2, yc = 3.4;
    for (let x = ax0; x <= ax1 + 0.01; x += 3.8) {
      for (const z of [-2.75, 2.75]) {
        B.cyl(steel, 0.11, 0.11, 5.6, x, 0, z, { seg: 12 });
        B.cyl(steelDark, 0.2, 0.2, 0.25, x, 0, z, { seg: 12 });
        k.collider(x - 0.13, x + 0.13, z - 0.13, z + 0.13, 0, 5.6, false);
      }
      const arc: V3t[] = [];
      for (let i = 0; i <= 12; i++) { const a = Math.PI * 0.2 + (i / 12) * Math.PI * 0.6; arc.push([x, yc + Math.sin(a) * R * 0.75 + 0.8, -Math.cos(a) * R * 0.95]); }
      B.tube(steel, arc, 0.08, { seg: 36, rs: 8 });
      B.rod(steel, 0.05, [x, 5.6, -2.75], [x, 5.6, 2.75], 8);
      // hanging lanterns row & signs between ribs
      if (x < ax1 - 1) {
        for (const lz of [-1.6, 1.6]) lantern(x + 1.9, 4.2, lz, 0.26);
        B.wire(wireM, [x, 5.5, -1.6], [x + 3.8, 5.5, -1.6], 0.35, 0.008);
        B.wire(wireM, [x, 5.5, 1.6], [x + 3.8, 5.5, 1.6], 0.35, 0.008);
      }
    }
    // purlins
    for (const a of [0.25, 0.4, 0.5, 0.6, 0.75]) {
      const ang = a * Math.PI, y = yc + Math.sin(ang) * R * 0.75 + 0.8, z = -Math.cos(ang) * R * 0.95;
      B.rod(steel, 0.04, [ax0, y, z], [ax1, y, z], 6);
    }
    // roof panels (some missing → sun shafts)
    for (let x = ax0; x < ax1 - 0.01; x += 3.8)
      for (let j = 0; j < 4; j++) {
        if ((Math.round(x * 3) + j * 5) % 7 === 3) continue; // broken panel
        const a0 = Math.PI * (0.25 + j * 0.125), a1 = a0 + Math.PI * 0.125;
        const g = new THREE.CylinderGeometry(1, 1, 3.8, 4, 1, true, Math.PI / 2 + a0 - Math.PI / 2, a1 - a0);
        // map cylinder (axis y) to arcade orientation: axis along x
        g.rotateZ(Math.PI / 2);
        const p = g.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const yy = p.getY(i), zz = p.getZ(i);
          const ang = Math.atan2(yy, zz); // param
          void ang;
          p.setY(i, yc + 0.8 + yy * R * 0.75);
          p.setZ(i, zz * R * 0.95 * -1);
        }
        g.computeVertexNormals();
        B.geo(panelM, g, x + 1.9, 0, 0);
      }
    // gate sign at the entrance (west end) and at the east end
    for (const [gx, txt] of [[-17.9, "なにわ商店街"], [-4.6, "なにわ商店街"]] as const) {
      const gm = sign("gate" + gx, txt, "#1d3b6e", "#ffffff", { border: "#f2c94c", sub: "NANIWA SHOTENGAI", worn: 0.4, w: 512, h: 128 }, 0.35);
      B.box(steelDark, 0.3, 1.3, 5.2, gx, 5.4, 0, { flat: true });
      for (const s of [-1, 1]) B.geo(gm, new THREE.PlaneGeometry(5.0, 1.2), gx + s * 0.16, 6.05, 0, { ry: s * Math.PI / 2 });
      for (let i = 0; i < 9; i++) B.sphere(bulb, 0.06, gx - 0.17, 6.75, -2.4 + i * 0.6, { ws: 6, hs: 4 });
    }
    // hanging perpendicular banners
    const ban = [sign("b1", "大売出し", "#c0141b", "#ffffff", { vertical: true, worn: 0.5 }), sign("b2", "歳末セール", "#f2c230", "#c0141b", { vertical: true, worn: 0.5 })];
    for (let i = 0; i < 6; i++) {
      const bx = -17 + i * 2.2, bz = i % 2 ? 1.0 : -1.0;
      B.geo(ban[i % 2], new THREE.PlaneGeometry(0.55, 1.8), bx, 4.1, bz, { ry: Math.PI / 2 });
      B.geo(ban[i % 2], new THREE.PlaneGeometry(0.55, 1.8), bx + 0.01, 4.1, bz, { ry: -Math.PI / 2 });
      B.rod(steel, 0.012, [bx, 5.0, bz - 0.3], [bx, 5.0, bz + 0.3], 4);
    }
    k.room("Arcade", -19.6, -4.4, -3, 3);
  }

  // ---------------- giant 3D signs (east half) ----------------
  // SEA URCHIN on the uni restaurant (x −4.1…2.2, north)
  {
    const cx = -0.95, cy = 5.6, cz = -2.1, R = 1.25;
    const body = k.mat(null, "#2a1a2c", [1, 1], { roughness: 0.3, metalness: 0.1 });
    const spike = k.mat(null, "#3a2140", [1, 1], { roughness: 0.25, metalness: 0.1 });
    B.sphere(body, R, cx, cy, cz, { ws: 24, hs: 16 });
    const N = 150, sp = new THREE.ConeGeometry(0.06, 0.85, 5);
    sp.translate(0, R + 0.35, 0);
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * 2.39996;
      const d = new V3(Math.cos(th) * r, y, Math.sin(th) * r);
      if (d.z > 0.55 && d.y > -0.3 && d.y < 0.75) continue; // opening with roe
      const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), d);
      const g = sp.clone();
      g.applyQuaternion(q);
      B.geo(spike, g, cx, cy, cz, { s: 0.85 + ((i * 37) % 10) / 25 });
    }
    // golden roe lobes in the opening
    for (let i = 0; i < 5; i++) {
      const a = -0.8 + i * 0.4;
      B.sphere(uniRoe, 0.3, cx + Math.sin(a) * 0.55, cy + 0.15 + Math.cos(i * 1.3) * 0.12, cz + R * 0.82, { ws: 12, hs: 8, s: [0.7, 1.4, 0.55], rz: a * 0.6 });
    }
    // bracket to the facade
    B.rod(steelDark, 0.07, [cx, cy - 0.8, -3], [cx, cy - 0.4, cz + 0.2], 8);
    B.rod(steelDark, 0.07, [cx - 0.8, cy, -3], [cx - 0.5, cy, cz], 8);
    B.rod(steelDark, 0.07, [cx + 0.8, cy, -3], [cx + 0.5, cy, cz], 8);
    k.collider(cx - 1.4, cx + 1.4, -3, cz + 1.3, cy - 1.3, cy + 1.3, true);
  }
  // OCTOPUS on the takoyaki shop (x 2.2…7.4, north)
  {
    const cx = 4.8, cy = 5.3, cz = -2.4;
    const red = k.mat(null, "#e2453a", [1, 1], { roughness: 0.35 });
    B.sphere(red, 1.0, cx, cy + 0.6, cz, { ws: 22, hs: 14, s: [1, 1.15, 0.9] });
    for (const s of [-1, 1]) {
      B.sphere(white, 0.26, cx + s * 0.38, cy + 0.35, cz + 0.72, { ws: 12, hs: 8 });
      B.sphere(black, 0.12, cx + s * 0.36, cy + 0.35, cz + 0.95, { ws: 10, hs: 6 });
    }
    B.geo(red, new THREE.TorusGeometry(0.16, 0.08, 8, 14), cx, cy - 0.05, cz + 0.82, {});
    B.geo(white, new THREE.TorusGeometry(0.93, 0.1, 8, 28), cx, cy + 1.05, cz, { rx: Math.PI / 2 + 0.15, s: [1, 0.9, 1] });
    B.geo(white, new THREE.ConeGeometry(0.16, 0.5, 6), cx + 0.9, cy + 1.05, cz - 0.3, { rz: -1.2 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, pts: V3t[] = [];
      for (let j = 0; j <= 8; j++) {
        const t = j / 8, rr = 0.5 + t * 0.9, curl = t * t * 2.4;
        pts.push([cx + Math.cos(a) * rr + Math.cos(a + 1.6) * curl * 0.2, cy - 0.3 - t * 1.0 + Math.sin(t * 3 + i) * 0.15 + curl * 0.3, cz + Math.sin(a) * rr * 0.6 + Math.sin(a + 1.6) * curl * 0.2]);
      }
      B.tube(red, pts, 0.1 - i * 0.002, { seg: 18, rs: 8 });
    }
    // boat of takoyaki held up
    B.box(woodDark, 1.0, 0.1, 0.5, cx + 1.2, cy - 0.5, cz + 0.7, { flat: true });
    for (let i = 0; i < 6; i++) B.sphere(k.mat(null, "#b8702e", [1, 1], { roughness: 0.5 }) === takoBall ? takoBall : takoBall, 0.12, cx + 0.8 + (i % 3) * 0.28, cy - 0.33, cz + 0.58 + Math.floor(i / 3) * 0.24, { ws: 10, hs: 8 });
    B.rod(steelDark, 0.07, [cx, cy - 0.2, -3], [cx, cy, cz], 8);
    k.collider(cx - 1.6, cx + 1.6, -3, cz + 1.2, cy - 1.4, cy + 1.8, true);
  }
  // GYOZA on the gyoza shop (x −1.6…4.0, south)
  {
    const cx = 1.2, cy = 5.4, cz = 2.3;
    const skin = k.mat(null, "#f1dfb8", [1, 1], { roughness: 0.55 });
    const crisp = k.mat(null, "#c47e3a", [1, 1], { roughness: 0.5 });
    const gyo = (x: number, y: number, z: number, s: number, ry: number) => {
      B.sphere(skin, 1, x, y, z, { s: [1.7 * s, 0.62 * s, 0.75 * s], ry, ws: 24, hs: 12 });
      B.sphere(crisp, 1, x, y - 0.18 * s, z, { s: [1.62 * s, 0.4 * s, 0.72 * s], ry, ws: 24, hs: 10 });
      for (let i = 0; i < 9; i++) {
        const t = (i / 8) * 2 - 1, px = t * 1.35 * s, py = 0.5 * s * Math.sqrt(1 - t * t * 0.85);
        B.sphere(skin, 0.2 * s, x + Math.cos(ry) * px, y + py, z - Math.sin(ry) * px, { ws: 8, hs: 6, s: [0.8, 1, 0.6], ry });
      }
    };
    gyo(cx, cy, cz, 1, 0.1);
    gyo(cx + 2.3, cy - 0.6, cz + 0.2, 0.55, -0.4);
    B.rod(steelDark, 0.07, [cx, cy, 3], [cx, cy, cz], 8);
    k.collider(cx - 1.8, cx + 3.2, cz - 0.9, 3, cy - 1.2, cy + 0.8, true);
  }
  // OKONOMIYAKI + spatula (x 4.0…9.0, south)
  {
    const cx = 6.6, cy = 5.2, cz = 2.45;
    const batter = k.mat(null, "#c98a45", [1, 1], { roughness: 0.6 });
    B.cyl(batter, 1.3, 1.35, 0.32, cx, cy, cz, { rx: -Math.PI / 2 + 0.2, seg: 28 });
    const top = new THREE.CircleGeometry(1.28, 28);
    B.geo(okoM, top, cx, cy + 0.03, cz - 0.3, { rx: 0.2 + Math.PI, s: [1, -1, 1] });
    B.box(steel, 0.7, 0.9, 0.04, cx + 1.4, cy - 0.3, cz - 0.3, { rz: -0.5 });
    B.rod(woodDark, 0.05, [cx + 1.6, cy - 0.1, cz - 0.3], [cx + 2.2, cy - 1.0, cz - 0.3], 8);
    B.rod(steelDark, 0.07, [cx, cy, 3], [cx, cy, cz], 8);
    k.collider(cx - 1.4, cx + 2.2, cz - 0.6, 3, cy - 1.4, cy + 1.4, true);
  }
  // FUGU lantern hanging at the izakaya (x 9.3…13.4, north)
  {
    const cx = 11.3, cy = 5.0, cz = -2.2;
    const fugu = k.mat(null, "#f3e2a0", [1, 1], { roughness: 0.5, emissive: "#ffcf70", emissiveIntensity: 0.35 });
    B.sphere(fugu, 0.95, cx, cy, cz, { ws: 20, hs: 14, s: [1.2, 1, 1] });
    const sp = new THREE.ConeGeometry(0.04, 0.22, 4);
    for (let i = 0; i < 60; i++) {
      const y = 1 - (i / 59) * 2, r = Math.sqrt(1 - y * y), th = i * 2.4;
      const d = new V3(Math.cos(th) * r * 1.2, y, Math.sin(th) * r);
      const g = sp.clone();
      g.translate(0, 1, 0);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), d.clone().normalize()));
      B.geo(fugu, g, cx, cy, cz, { s: [1.0, 0.95, 0.95] });
    }
    for (const s of [-1, 1]) {
      B.sphere(white, 0.2, cx + 0.95, cy + 0.25, cz + s * 0.45, { ws: 10, hs: 8 });
      B.sphere(black, 0.1, cx + 1.08, cy + 0.25, cz + s * 0.5, { ws: 8, hs: 6 });
    }
    B.geo(fugu, new THREE.ConeGeometry(0.45, 0.6, 4), cx - 1.3, cy, cz, { rz: Math.PI / 2 });
    B.rod(wireM, 0.02, [cx, cy + 0.9, cz], [cx, 7.0, -3], 4);
    for (let i = 0; i < 4; i++) lantern(9.9 + i * 1.1, 2.05, -2.7, 0.2, i % 2 ? lanternW : lanternM);
  }
  const takoBall = k.mat(null, "#b8702e", [1, 1], { roughness: 0.5 });

  // ---------------- open street furniture ----------------
  vending(-3.1, 2.3, Math.PI, "#1f5fb0", 2);
  vending(13.0, -2.3 - 0.1, 0, "#d9262b", 5);
  bike(-6.8, 2.4, 0.05, bikeCols[0]); bike(-5.4, 2.45, -0.08, bikeCols[1]); bike(-8.6, -2.2, 0.1, bikeCols[3]);
  bike(9.8, 2.4, 0.0, bikeCols[2]);
  cone3(-1.2, -2.5); cone3(12.5, 2.4);
  // A-frame menu board & potted plants
  B.geo(menuGyoza, new THREE.PlaneGeometry(0.5, 0.75), 3.6, 0.6, 2.25, { ry: Math.PI - 0.2, rx: 0.15 });
  plant(-10.6, -2.5); plant(-13.4, 2.5, 1.2); plant(2.4, -2.55); plant(8.8, 2.55, 0.9);
  // street lamps in the open half
  const streetLamp = (x: number, z: number, arm: number) => {
    B.cyl(steelDark, 0.07, 0.09, 5.2, x, 0, z, { seg: 10 });
    B.rod(steelDark, 0.04, [x, 5.0, z], [x, 5.2, z + arm], 6);
    B.box(steelDark, 0.25, 0.12, 0.5, x, 5.1, z + arm, { flat: true });
    B.box(bulb, 0.2, 0.03, 0.42, x, 5.07, z + arm, { flat: true });
    k.collider(x - 0.1, x + 0.1, z - 0.1, z + 0.1, 0, 5.2, false);
  };
  streetLamp(0.2, -2.7, 0.9); streetLamp(8.3, 2.7, -0.9);
  // overhead wires across the open street
  B.wire(wireM, [-4.4, 8.5, -3], [3, 8.0, 3], 0.6);
  B.wire(wireM, [3, 7.5, -3], [9, 7.6, 3], 0.5);
  B.wire(wireM, [9.3, 6.8, -3], [13.4, 8.6, 3], 0.4);

  // ---------------- back alley (north) ----------------
  {
    // back walls: pipes, back doors, AC units, barred windows
    for (let x = -18; x < 13.4; x += 1.9) {
      if ((x > -6.2 && x < -3.8) || (x > 7.2 && x < 9.4)) continue;
      const r = rnd();
      if (r < 0.25) { B.box(steelDark, 0.9, 2.1, 0.08, x + 0.5, 0, -8.52, { flat: true }); B.box(steel, 1.1, 0.08, 0.5, x + 0.5, 2.3, -8.75, { flat: true }); }
      else if (r < 0.55) acUnit(x + 0.6, 0, -8.9, Math.PI);
      if (rnd() < 0.5) { B.geo(windows[Math.floor(rnd() * 4)], new THREE.PlaneGeometry(0.9, 0.9), x + 0.8, 4.6, -8.52, { ry: Math.PI }); for (let i = 0; i < 4; i++) B.rod(steel, 0.012, [x + 0.45 + i * 0.23, 4.15, -8.6], [x + 0.45 + i * 0.23, 5.05, -8.6], 4); }
    }
    // long horizontal gas/water pipes on the back wall with drops
    B.rod(steel, 0.06, [-19, 2.7, -8.66], [-6.1, 2.7, -8.66], 10);
    B.rod(greenPaint, 0.045, [-19, 3.1, -8.64], [-6.1, 3.1, -8.64], 8);
    B.rod(steel, 0.06, [-3.9, 2.7, -8.66], [7.2, 2.7, -8.66], 10);
    B.rod(steel, 0.06, [9.5, 2.9, -8.66], [13.4, 2.9, -8.66], 10);
    for (const x of [-15.2, -10.4, -1.2, 4.6, 11.6]) { B.rod(steel, 0.06, [x, 0.05, -8.66], [x, 2.7, -8.66], 10); B.sphere(steel, 0.08, x, 2.7, -8.66, { ws: 8, hs: 6 }); }
    // north boundary: block wall + backdrop buildings
    for (let x = -30; x < 30; x += 3) B.blk(concrete, x, x + 2.95, 0, 2.3, -13.9, -13.6, 1.2, false);
    k.collider(-30, 30, -14, -13.5, 0, 2.3, false);
    for (let x = -30; x < 30; x += 0.2) { /* coping */ }
    B.box(concDark, 60, 0.12, 0.4, 0, 2.3, -13.75, { flat: true });
    B.rod(steelDark, 0.01, [-30, 2.7, -13.75], [30, 2.7, -13.75], 3);
    B.rod(steelDark, 0.01, [-30, 2.95, -13.75], [30, 2.95, -13.75], 3);
    for (let x = -18; x < 18; x += 2.5) B.rod(steelDark, 0.02, [x, 2.3, -13.75], [x, 3.0, -13.75], 4);
    {
      let x = -34; let i = 0;
      const mats = [tower2, tower3, tower1];
      while (x < 34) { const w = 5 + rnd() * 5, h = 10 + rnd() * 10; B.blk(mats[i % 3], x, x + w, 0, h, -22, -15, 4, false); x += w + 0.3; i++; }
    }
    // clutter
    drum(-16.6, -12.8, rust); drum(-16.0, -12.9, drumB); drum(-16.3, -12.3, rust, 0.88); drum(-15.3, -12.7, drumB, 0, true, 0.3);
    bagPile(-13.4, -12.6, 6, 1.1);
    vending(-11.2, -12.9, 0, "#f2f2f2", 7);
    vending(-9.9, -12.9, 0, "#2b8a3e", 8);
    bike(-7.4, -12.8, 0.1, bikeCols[1]); bike(-6.8, -12.3, -0.2, bikeCols[0]);
    crateStack(-3.2, -12.9, 4, crateY); crateStack(-2.5, -12.9, 3, crateR); crateStack(-2.9, -12.3, 2, crateY);
    boxes(-0.8, -12.7);
    drum(1.6, -12.8, drumG); drum(2.2, -12.9, drumR); drum(1.9, -12.3, drumG, 0.88);
    bagPile(4.4, -12.7, 5, 1.0);
    palletStack(6.6, -12.6, 5, 0.1);
    acUnit(10.2, 0, -12.9, 0); acUnit(10.2, 0.6, -12.9, 0);
    bagPile(12.0, -9.4, 4, 0.8);
    drum(-18 + 0.6, -9.2, drumR);
    boxes(-9.4, -9.3);
    cone3(3.4, -9.3);
    // poles & wires
    const p1 = pole(-12.5, -13.1), p2 = pole(0.2, -13.1), p3 = pole(12.2, -13.1), p4 = pole(16.2, -3.4), p5 = pole(-16.9, 7.4);
    for (const [a, b] of [[p1, p2], [p2, p3], [p3, p4]] as const) for (const dx of [-0.7, 0, 0.7]) B.wire(wireM, [a[0] + dx, a[1], a[2]], [b[0] + dx, b[1], b[2]], 0.5);
    for (const p of [p1, p2, p3]) { B.wire(wireM, p, [p[0] + 1.5, 6.4, -8.5], 0.3); B.wire(wireM, [p[0] - 0.7, p[1] - 0.9, p[2]], [p[0] - 2.0, 5.8, -8.5], 0.25); }
    B.wire(wireM, p4, [13.4, 8.2, 3], 0.4);
    B.wire(wireM, p4, [13.4, 6.4, -3], 0.3);
    B.wire(wireM, p5, [-16, 6.8, 7], 0.2);
    B.wire(wireM, p5, [-19.6, 7.2, 3], 0.4);
    k.room("Back Alley", -19, 18, -13.4, -8.5);
  }

  // ---------------- canal promenade (south) ----------------
  {
    // back walls of the south row: flyers, pipes, doors
    for (let x = -16; x < 13.4; x += 2.3) {
      if (x > -3.9 && x < -1.4) continue;
      if (rnd() < 0.4) B.geo(flyers, new THREE.PlaneGeometry(1.4, 1.1), x + 1, 1.5, 7.01, { su: 0.8, sv: 0.6 });
      else if (rnd() < 0.5) acUnit(x + 1, 0, 7.4, 0);
    }
    B.rod(steel, 0.06, [-16, 2.6, 7.12], [13.4, 2.6, 7.12], 10);
    // benches, planters, a lamp, stall
    for (const x of [-10.5, 1.5, 9.5]) {
      B.box(wood, 1.6, 0.06, 0.42, x, 0.44, 10.2, { flat: true, uv: 0.6 });
      B.box(wood, 1.6, 0.35, 0.05, x, 0.5, 10.42, { flat: true, uv: 0.6 });
      for (const dx of [-0.7, 0.7]) B.box(steelDark, 0.06, 0.44, 0.4, x + dx, 0, 10.2, { flat: true });
      k.collider(x - 0.8, x + 0.8, 10.0, 10.45, 0, 0.5, true);
    }
    for (const x of [-14, -6.5, 5.5, 12.8]) {
      B.box(concrete, 1.2, 0.55, 0.6, x, 0, 10.8, { uv: 1 });
      for (let i = 0; i < 4; i++) B.sphere(leafM, 0.25, x - 0.4 + i * 0.27, 0.7, 10.8, { ws: 8, hs: 6 });
      k.collider(x - 0.6, x + 0.6, 10.5, 11.1, 0, 0.7, true);
    }
    for (const x of [-8.3, 4.2]) {
      B.cyl(steelDark, 0.06, 0.08, 3.8, x, 0, 11.1, { seg: 8 });
      B.sphere(bulb, 0.22, x, 3.95, 11.1, { ws: 12, hs: 8 });
      k.collider(x - 0.1, x + 0.1, 11.0, 11.2, 0, 3.8, false);
    }
    bike(-12.4, 8.1, Math.PI / 2 + 0.1, bikeCols[2]); bike(-11.6, 8.1, Math.PI / 2 - 0.1, bikeCols[3]);
    bagPile(-0.4, 7.8, 4, 0.8);
    vending(7.4, 7.5, Math.PI, "#f0b31d", 9);
    crateStack(10.8, 7.6, 3, crateR);
    k.room("Canal Promenade", -19, 18, 7, 11.4);
  }

  // ---------------- east lot (wasteland) ----------------
  {
    // scaffolding frames with planks (standable levels)
    const sx0 = 14.2, sx1 = 17.6, sz0 = -8.2, sz1 = -6.6;
    for (const x of [sx0, (sx0 + sx1) / 2, sx1]) for (const z of [sz0, sz1]) { B.cyl(steel, 0.024, 0.024, 5.2, x, 0, z, { seg: 6 }); k.collider(x - 0.05, x + 0.05, z - 0.05, z + 0.05, 0, 5.2, false); }
    for (const y of [1.7, 3.4, 5.1]) {
      for (const z of [sz0, sz1]) B.rod(steel, 0.024, [sx0, y, z], [sx1, y, z], 6);
      for (const x of [sx0, (sx0 + sx1) / 2, sx1]) B.rod(steel, 0.024, [x, y, sz0], [x, y, sz1], 6);
      if (y < 5) { B.box(pallet, sx1 - sx0, 0.05, sz1 - sz0 - 0.1, (sx0 + sx1) / 2, y, (sz0 + sz1) / 2, { flat: true, uv: 0.8 }); k.collider(sx0, sx1, sz0, sz1, y - 0.1, y + 0.05, true); }
      B.rod(steel, 0.02, [sx0, y - 1.7, sz1], [(sx0 + sx1) / 2, y, sz1], 5);
    }
    const mesh = k.mat(null, "#3f7a4a", [1, 1], { roughness: 0.9, transparent: false });
    mesh.m.transparent = true; mesh.m.opacity = 0.7; mesh.m.depthWrite = false; mesh.m.side = THREE.DoubleSide;
    B.geo(mesh, new THREE.PlaneGeometry(sx1 - sx0, 3.2), (sx0 + sx1) / 2, 3.6, sz0 - 0.05, {});
    // corrugated fence on the east edge
    for (let z = -8.5; z < 7; z += 2.0) B.box(corr, 0.05, 2.2, 1.98, 18.25, 0, z + 1, { flat: true, uv: 1.2, ry: (rnd() - 0.5) * 0.06 });
    // a derelict takoyaki yatai cart
    {
      const yx = 15.6, yz = 1.2;
      B.box(woodDark, 2.0, 0.9, 1.0, yx, 0.3, yz, { uv: 0.8 });
      for (const [dx, dz] of [[-0.9, -0.45], [0.9, -0.45], [-0.9, 0.45], [0.9, 0.45]]) B.rod(woodDark, 0.04, [yx + dx, 1.2, yz + dz], [yx + dx, 2.3, yz + dz], 6);
      B.box(redLac, 2.3, 0.08, 1.3, yx, 2.3, yz, { flat: true });
      B.geo(noren2, new THREE.PlaneGeometry(2.0, 0.45), yx, 2.05, yz - 0.52, { ry: Math.PI });
      for (const dx of [-0.9, 0.9]) { B.geo(tyre, new THREE.TorusGeometry(0.28, 0.06, 6, 16), yx + dx, 0.3, yz + 0.55, {}); }
      B.geo(griddle, new THREE.PlaneGeometry(1.0, 0.5), yx - 0.3, 1.21, yz, { rx: -Math.PI / 2 });
      lantern(yx + 1.2, 1.5, yz - 0.6, 0.22);
      k.collider(yx - 1.0, yx + 1.0, yz - 0.5, yz + 0.5, 0, 1.2, true);
    }
    palletStack(16.6, 5.4, 3, 0.4); palletStack(14.8, 5.6, 1, -0.2);
    drum(17.3, -1.8, rust); drum(17.4, -1.1, drumR, 0, true, 1.2); drum(16.8, -2.4, drumB);
    bagPile(14.7, -4.4, 3, 0.7);
    // old broken sign lying around
    B.geo(sign("oldsign", "パチンコ", "#1a1a1a", "#ffcc33", { worn: 1 }), new THREE.PlaneGeometry(2.4, 0.8), 16.4, 0.5, -4.8, { rx: -0.25, ry: -0.5 });
    B.box(steelDark, 2.5, 0.85, 0.08, 16.42, 0.08, -4.75, { rx: -0.25, ry: -0.5 });
    k.collider(15.3, 17.5, -5.4, -4.2, 0, 0.9, true);
    // weeds
    for (let i = 0; i < 18; i++) {
      const x = 13.8 + rnd() * 4, z = -8 + rnd() * 14.5;
      for (let j = 0; j < 4; j++) B.geo(weed, new THREE.ConeGeometry(0.03, 0.3 + rnd() * 0.3, 3), x + (rnd() - 0.5) * 0.3, 0.2, z + (rnd() - 0.5) * 0.3, { rz: (rnd() - 0.5) * 0.6, rx: (rnd() - 0.5) * 0.6 });
    }
    k.room("Empty Lot", 13.4, 18, -8.5, 7);
  }
  // tumbleweeds rolling through town
  for (const [x, z, s] of [[15.4, 3.4, 1.0], [11.2, 0.9, 0.8], [5.4, -0.9, 0.7], [-2.2, 1.6, 0.9], [-11.4, 9.4, 0.8], [2.8, -10.6, 1.1], [16.8, -0.4, 0.7], [-14.5, -10.2, 0.9]] as const) tumbleweed(x, z, s);

  k.room("Dotonbori Street", -4.4, 13.4, -3, 3);
  k.room("Alley", -19, 18, -8.5, 7);

  B.flush();

  // ---------------- spawns & lighting ----------------
  const hiders: THREE.Vector3[] = [];
  for (let i = 0; i < 24; i++) hiders.push(new THREE.Vector3(1.0 + (i % 8) * 1.1, 0, -1.2 + Math.floor(i / 8) * 1.2));
  const hunters: THREE.Vector3[] = [];
  for (let i = 0; i < 9; i++) hunters.push(new THREE.Vector3(-16.9 + (i % 3) * 1.1, 0, -1.2 + Math.floor(i / 3) * 1.2));

  return k.finish({
    id: "osaka", name: "Osaka",
    bounds: { minX: X0, maxX: X1, minZ: Z0, maxZ: Z1 },
    hunterSpawns: hunters, hiderSpawns: hiders,
    preview: { pos: [13.5, 2.6, 1.8], look: [-1, 4.2, -1.2], fov: 62 },
    lighting: {
      sky: "#3a3f55",
      hemi: ["#ffd9b8", "#3b3a44", 0.45],
      sun: { color: "#ffb27a", int: 2.0, pos: [-22, 15, 12] },
      fog: ["#6f6a78", 30, 120],
      points: [
        { pos: [-14, 4.4, 0], color: "#ffb070", int: 14, dist: 10 },
        { pos: [-7, 4.4, 0], color: "#ffb070", int: 14, dist: 10 },
        { pos: [1, 3.2, -3.8], color: "#ffd6a0", int: 10, dist: 8 },
        { pos: [6, 3.2, 3.8], color: "#ffd6a0", int: 10, dist: 8 },
        { pos: [11.2, 3.0, 4.2], color: "#e8f4ff", int: 12, dist: 8 },
        { pos: [-4.9, 4.0, -8], color: "#9ec6ff", int: 8, dist: 9 },
      ],
      exposure: 0.95,
      hdri: "city",
      env: 0.5,
      hdriBackground: 0.3,
    },
  });
}
