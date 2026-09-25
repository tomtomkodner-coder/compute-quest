// Osaka (大阪): a Dotonbori-style back street on a bright day just after rain, rebuilt after the real game.
// A long pedestrian street paved with wet granite setts runs north–south between grey/white concrete buildings with
// roll-up shutters, AC units and silver ducts, covered in vertical Japanese signs (猫カフェ, 免税 焼肉, 肉 居酒屋, 薬).
// West side: the "うに道楽 本店" restaurant with giant black-spiked sea urchins, a red drugstore with 薬 banners and a
// tall sign-covered white building. East side: a dark glass corner building with a giant takoyaki octopus climbing it
// and a pufferfish lantern, a service yard (green kei truck, drums, pallets, lumber, culvert-pipe stack behind a low
// wall), a white-brick back courtyard (beer kegs, beer crates, a fallen octopus, trash bags) with a graffiti nook, and
// a scaffold of 大 lanterns. Octagonal concrete benches ring the wooden utility poles; multi-globe lamps line the street.
// Hunters enter from the south end of the street.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import * as T from "../textures";
import * as O from "./tex/osaka";
import { Kit, type Mat, type World } from "./kit";

type G = THREE.BufferGeometry;
type V3t = [number, number, number];
const V3 = THREE.Vector3;
const PI = Math.PI;

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
/** tube whose radius tapers from r0 to r1 along the curve */
function taperTube(pts: V3t[], r0: number, r1: number, seg = 22, rs = 8): G {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new V3(...p)), false, "centripetal");
  const g = new THREE.TubeGeometry(curve, seg, 1, rs, false);
  const p = g.attributes.position;
  const c = new V3(), t = new V3();
  for (let i = 0; i <= seg; i++) {
    curve.getPointAt(i / seg, c);
    const r = r0 + (r1 - r0) * Math.pow(i / seg, 0.85);
    for (let j = 0; j <= rs; j++) { const k = i * (rs + 1) + j; t.fromBufferAttribute(p, k).sub(c).multiplyScalar(r).add(c); p.setXYZ(k, t.x, t.y, t.z); }
  }
  g.computeVertexNormals();
  return g;
}
type BO = { flat?: boolean; rx?: number; ry?: number; rz?: number; s?: number | V3t; solid?: boolean; stand?: boolean; uv?: number; world?: boolean; su?: number; sv?: number; seg?: number };
class Batch {
  private lists = new Map<Mat, G[]>();
  private flags = new Map<Mat, { noShadow?: boolean }>();
  private rnd = O.rng(77);
  /** extra local→world transform applied to everything (for props built in their own frame) */
  xf: THREE.Matrix4 | null = null;
  constructor(private k: Kit) {}
  opt(m: Mat, f: { noShadow?: boolean }) { this.flags.set(m, f); }
  geo(m: Mat, g: G, x: number, y: number, z: number, o: BO = {}) {
    if (o.uv && !o.world) boxUV(g, o.uv, this.rnd(), this.rnd());
    if (o.su || o.sv) scaleUV(g, o.su ?? 1, o.sv ?? 1);
    const e = new THREE.Euler(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0, "YXZ");
    const sc = typeof o.s === "number" ? new V3(o.s, o.s, o.s) : o.s ? new V3(...o.s) : new V3(1, 1, 1);
    g.applyMatrix4(new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(e), sc));
    if (o.uv && o.world) boxUV(g, o.uv);
    if (this.xf) g.applyMatrix4(this.xf);
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
  /** axis-aligned box from corner ranges, world UVs, solid + standable */
  blk(m: Mat, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, unit = 2, solid = true) {
    const [ax, bx] = x0 < x1 ? [x0, x1] : [x1, x0], [az, bz] = z0 < z1 ? [z0, z1] : [z1, z0];
    return this.box(m, bx - ax, y1 - y0, bz - az, (ax + bx) / 2, y0, (az + bz) / 2, { flat: true, uv: unit, world: true, solid, stand: true });
  }
  cyl(m: Mat, rt: number, rb: number, h: number, x: number, y: number, z: number, o: BO & { open?: boolean } = {}) {
    return this.geo(m, new THREE.CylinderGeometry(rt, rb, h, o.seg ?? 16, 1, o.open), x, y + h / 2, z, o);
  }
  lathe(m: Mat, pts: [number, number][], x: number, y: number, z: number, o: BO & { phi?: number } = {}) {
    return this.geo(m, new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(Math.max(0, r), h)), o.seg ?? 20, o.phi ?? 0), x, y, z, o);
  }
  sphere(m: Mat, r: number, x: number, y: number, z: number, o: BO & { ws?: number; hs?: number } = {}) {
    return this.geo(m, new THREE.SphereGeometry(r, o.ws ?? 16, o.hs ?? 10), x, y, z, o);
  }
  tube(m: Mat, pts: V3t[], r: number, o: { seg?: number; rs?: number; closed?: boolean; ulen?: number } = {}) {
    const c = new THREE.CatmullRomCurve3(pts.map((p) => new V3(...p)), !!o.closed, "centripetal");
    const g = new THREE.TubeGeometry(c, o.seg ?? Math.max(6, pts.length * 5), r, o.rs ?? 6, !!o.closed);
    if (o.ulen) scaleUV(g, c.getLength() / o.ulen, 1);
    return this.geo(m, g, 0, 0, 0);
  }
  rod(m: Mat, r: number, a: V3t, b: V3t, seg = 8) {
    const va = new V3(...a), vb = new V3(...b);
    const g = new THREE.CylinderGeometry(r, r, va.distanceTo(vb), seg, 1);
    const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), vb.clone().sub(va).normalize());
    g.applyMatrix4(new THREE.Matrix4().compose(va.clone().add(vb).multiplyScalar(0.5), q, new V3(1, 1, 1)));
    return this.geo(m, g, 0, 0, 0);
  }
  /** sagging cable between two points */
  wire(m: Mat, a: V3t, b: V3t, sag = 0.6, r = 0.014) {
    const pts: V3t[] = [];
    for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * PI) * sag, a[2] + (b[2] - a[2]) * t]); }
    const c = new THREE.CatmullRomCurve3(pts.map((p) => new V3(...p)));
    return this.geo(m, new THREE.TubeGeometry(c, 16, r, 3), 0, 0, 0);
  }
  flush() {
    for (const [m, l] of this.lists) if (l.length) this.k.merged(l, m, { noShadow: this.flags.get(m)?.noShadow });
    this.lists.clear();
  }
}

// facade frame: local u runs along the wall, d points out of the wall (toward the viewer)
type Face = { ox: number; oz: number; ry: number };
const fp = (f: Face, u: number, y: number, d: number): V3t => [f.ox + Math.cos(f.ry) * u + Math.sin(f.ry) * d, y, f.oz - Math.sin(f.ry) * u + Math.cos(f.ry) * d];

// ---------------------------------------------------------------------------------------------

export function buildOsaka(): World {
  const k = new Kit(9, 3.0);
  const B = new Batch(k);
  const rnd = O.rng(1970);
  const X0 = -18.8, X1 = 18.8, Z0 = -19.5, Z1 = 19.5;
  const tx = (key: string, f: () => T.PaintTex) => k.tex("os-" + key, f);
  type MO = Parameters<Kit["mat"]>[3];
  const M = (t: T.PaintTex | null, col: string, o: MO = {}) => k.mat(t, col, [1, 1], o);

  // ---------------- materials ----------------
  const setts = M(tx("setts", O.osSetts), "#ffffff", { roughness: 0.32, bump: 0.8 });
  const alleyF = M(tx("alley", O.osAlleyFloor), "#ffffff", { roughness: 0.55, bump: 0.5 });
  const panelW = M(tx("panw", () => O.osPanelWall("#dcddd9", 4, 5)), "#ffffff", { roughness: 0.75, bump: 0.35 });
  const panelG = M(tx("pang", () => O.osPanelWall("#b4b6b3", 2, 7)), "#ffffff", { roughness: 0.8, bump: 0.35 });
  const panelD = M(tx("pand", () => O.osPanelWall("#8d908f", 2, 9)), "#ffffff", { roughness: 0.8, bump: 0.35 });
  const concrete = M(tx("conc", () => O.osConcrete("#9a9a95", 4)), "#ffffff", { roughness: 0.9, bump: 0.5 });
  const concLight = M(tx("concl", () => O.osConcrete("#c9c9c3", 6)), "#ffffff", { roughness: 0.9, bump: 0.4 });
  const whiteBrick = M(tx("wbrick", O.osWhiteBrick), "#ffffff", { roughness: 0.85, bump: 0.9 });
  const redPaint = M(tx("red", O.osRedPaint), "#ffffff", { roughness: 0.5, bump: 0.2 });
  const redStone = M(tx("redst", O.osRedStone), "#ffffff", { roughness: 0.25, bump: 0.2 });
  const shopTile = M(tx("stile", O.osShopTile), "#ffffff", { roughness: 0.3, bump: 0.4 });
  const shutters = [
    M(tx("sh1", () => O.osShutter(3, "#a9adaf")), "#ffffff", { roughness: 0.45, metalness: 0.45, bump: 0.8 }),
    M(tx("sh2", () => O.osShutter(5, "#b8b7b0")), "#ffffff", { roughness: 0.45, metalness: 0.45, bump: 0.8 }),
    M(tx("sh3", () => O.osShutter(9, "#8f989c")), "#ffffff", { roughness: 0.45, metalness: 0.45, bump: 0.8 }),
  ];
  const shutterGraf = M(tx("shg", () => O.osShutter(13, "#c2c4c4", true)), "#ffffff", { roughness: 0.45, metalness: 0.3, bump: 0.5, emissive: "#ffffff", emissiveIntensity: 0.08 });
  const glassM = [M(tx("gl1", () => O.osGlass(1, 4)), "#ffffff", { roughness: 0.12, metalness: 0.5, bump: 0 }), M(tx("gl2", () => O.osGlass(2, 3)), "#ffffff", { roughness: 0.12, metalness: 0.5, bump: 0 })];
  const acFront = M(tx("acf", O.osACFront), "#ffffff", { roughness: 0.5, bump: 0.5 });
  const acBody = M(null, "#d6d6d0", { roughness: 0.5, metalness: 0.1 });
  const duct = M(tx("duct", O.osDuct), "#ffffff", { roughness: 0.35, metalness: 0.75, bump: 0.8 });
  const steel = M(null, "#8d9296", { metalness: 0.8, roughness: 0.4 });
  const steelDark = M(null, "#35393c", { metalness: 0.7, roughness: 0.5 });
  const blackSteel = M(null, "#1e1f21", { metalness: 0.6, roughness: 0.45 });
  const rustFrame = M(tx("rustf", () => O.osDrum("#4a3a30", 21)), "#ffffff", { metalness: 0.5, roughness: 0.6, bump: 0.3 });
  const bronze = M(null, "#3b2f22", { metalness: 0.7, roughness: 0.45 });
  const globe = M(null, "#f4f1ea", { roughness: 0.25, emissive: "#fff6e0", emissiveIntensity: 0.35 });
  const poleWood = M(tx("pole", O.osPole), "#ffffff", { roughness: 0.85, bump: 0.8 });
  const poleTag = M(tx("ptag", O.osPoleTag), "#ffffff", { roughness: 0.6, bump: 0 });
  const benchStone = M(tx("bench", O.osBenchStone), "#ffffff", { roughness: 0.8, bump: 0.6 });
  const wireM = M(null, "#151515", { roughness: 0.7 });
  const insul = M(null, "#e8e6df", { roughness: 0.3 });
  const tyre = M(null, "#1a1a1a", { roughness: 0.85 });
  const darkGlass = M(null, "#1c2226", { metalness: 0.6, roughness: 0.08 });
  const truckGreen = M(tx("tgreen", () => O.osDrum("#2f6b3a", 31)), "#ffffff", { roughness: 0.4, metalness: 0.3, bump: 0.2 });
  const truckWhite = M(tx("twhite", () => O.osDrum("#e4e5e2", 33)), "#ffffff", { roughness: 0.35, metalness: 0.25, bump: 0.2 });
  const plateM = M(tx("plate", () => O.osPlate("55-1")), "#ffffff", { roughness: 0.4, bump: 0 });
  const lampRed = M(null, "#e8401c", { roughness: 0.3, emissive: "#ff3010", emissiveIntensity: 0.3 });
  const lampW = M(null, "#f6f3e8", { roughness: 0.2, emissive: "#ffffff", emissiveIntensity: 0.25 });
  const kegSteel = M(tx("keg", () => O.osKeg("#a2a7ab", 111)), "#ffffff", { metalness: 0.85, roughness: 0.35, bump: 0.2 });
  const kegBlue = M(tx("kegb", () => O.osKeg("#1d2566", 113)), "#ffffff", { metalness: 0.6, roughness: 0.3, bump: 0.2 });
  const crateRed = M(tx("crr", () => O.osBeerCrate("#b3161c", true)), "#ffffff", { roughness: 0.45, bump: 0.3 });
  const crateRedPlain = M(null, "#a8141a", { roughness: 0.45 });
  const crateCream = M(tx("crc", () => O.osBeerCrate("#e9e2cf", true)), "#ffffff", { roughness: 0.5, bump: 0.3 });
  const crateCreamPlain = M(null, "#e3dcc8", { roughness: 0.5 });
  const woodCrate = M(tx("wcr", () => O.osCrateWood("#b39a70", 109)), "#ffffff", { roughness: 0.8, bump: 0.9 });
  const palletM = M(tx("pal", () => O.osCrateWood("#cfb487", 131)), "#ffffff", { roughness: 0.85, bump: 0.8 });
  const lumber = M(tx("lum", () => O.osCrateWood("#e0b04e", 133)), "#ffffff", { roughness: 0.6, bump: 0.6 });
  const chairWood = k.mat(k.tex("os-chw", () => T.wood("#5a3a24", "#3a2414", 17)), "#ffffff", [1, 1], { roughness: 0.6, bump: 0.6 });
  const cardboard = M(tx("card", () => O.osCardboard(61)), "#ffffff", { roughness: 0.9, bump: 0.3 });
  const boxM = M(tx("box", O.osBox), "#ffffff", { roughness: 0.85, bump: 0.3 });
  const bagM = M(null, "#16171a", { roughness: 0.18, metalness: 0.1 });
  const binBlue = M(null, "#1fa3c9", { roughness: 0.35 });
  const bucketBlue = M(null, "#4f86d6", { roughness: 0.35 });
  const coneRed = M(null, "#d0121a", { roughness: 0.45 });
  const jugM = M(tx("jug", O.osJug), "#ffffff", { roughness: 0.35, bump: 0 });
  const jugCap = M(null, "#d8262b", { roughness: 0.4 });
  const white = M(null, "#eeeeea", { roughness: 0.5 });
  const gasGrey = M(null, "#9aa1a6", { roughness: 0.35, metalness: 0.5 });
  const gasWhite = M(null, "#e8e6e0", { roughness: 0.3 });
  const drumBlue = M(tx("drb", () => O.osDrum("#1f2f6e", 12)), "#ffffff", { metalness: 0.5, roughness: 0.45, bump: 0.4 });
  const drumGrey = M(tx("drg", () => O.osDrum("#7f8589", 14)), "#ffffff", { metalness: 0.7, roughness: 0.4, bump: 0.4 });
  const drumGreen = M(tx("drgr", () => O.osDrum("#2f7a3a", 16)), "#ffffff", { metalness: 0.5, roughness: 0.45, bump: 0.4 });
  const extRed = M(null, "#c8141b", { roughness: 0.3, metalness: 0.2 });
  const yellowPlastic = M(null, "#f2c81a", { roughness: 0.4 });
  const hoseBlue = M(null, "#2c6fcf", { roughness: 0.4 });
  const bottleM = M(null, "#dcefe0", { roughness: 0.1, metalness: 0.1 });
  const pipeConc = M(tx("pipec", () => O.osDrum("#8a6a50", 41)), "#ffffff", { roughness: 0.6, metalness: 0.4, bump: 0.3 });
  const pipeIn = M(null, "#3a2a20", { roughness: 0.7, metalness: 0.3 });
  const hazard = M(tx("haz", O.osHazard), "#ffffff", { roughness: 0.5, bump: 0 });
  const octoSkin = M(tx("octo", () => O.osOcto("")), "#ffffff", { roughness: 0.22, bump: 0.15 });
  const octoHead = M(tx("octoh", () => O.osOcto("たこ")), "#ffffff", { roughness: 0.22, bump: 0.1 });
  const towel = M(tx("towel", O.osTowel), "#ffffff", { roughness: 0.8, bump: 0.3 });
  const yellowEye = M(null, "#f2c21a", { roughness: 0.3 });
  const blackGloss = M(null, "#0e0e10", { roughness: 0.2, metalness: 0.2 });
  const puffer = M(tx("puff", O.osPuffer), "#ffffff", { roughness: 0.35, bump: 0.1 });
  const pufferGrey = M(null, "#4a4c50", { roughness: 0.4 });
  const roe = M(tx("roe", O.osRoe), "#ffffff", { roughness: 0.3, bump: 0.8, emissive: "#ff7a10", emissiveIntensity: 0.12 });
  const straw = M(tx("roe", O.osRoe), "#f0d08a", { roughness: 0.95, bump: 1.2 });
  const daiFace = M(tx("dai", O.osDai), "#ffffff", { roughness: 0.6, bump: 0.1, emissive: "#ffffff", emissiveIntensity: 0.12 });
  const paper = M(null, "#ebe7dc", { roughness: 0.7, emissive: "#fff4e0", emissiveIntensity: 0.1 });
  const manholeM = M(null, "#3a3a38", { roughness: 0.5, metalness: 0.6 });
  const grate = M(tx("grate", () => O.osShutter(17, "#56595b")), "#ffffff", { roughness: 0.5, metalness: 0.7, bump: 1.0 });
  const towerM = [M(tx("tw1", () => O.osTower("#9c9d99", 71)), "#ffffff", { roughness: 0.9, bump: 0 }), M(tx("tw2", () => O.osTower("#c4c3bd", 72)), "#ffffff", { roughness: 0.9, bump: 0 })];
  const sign = (key: string, f: () => T.PaintTex, glow = 0) => M(tx("s-" + key, f), "#ffffff", { roughness: 0.45, bump: 0, ...(glow ? { emissive: "#ffffff", emissiveIntensity: glow } : {}) });
  const sText = (key: string, t: string, bg: string, fg: string, o: O.SignOpts = {}, glow = 0) => sign(key, () => O.osSign(t, bg, fg, o), glow);
  const sUni = sign("uni", O.osUniBand, 0.05);
  const sNeko = sign("neko", O.osNekoCafe, 0.15);
  const sMenzei = sign("menzei", O.osMenzeiYakiniku, 0.35);
  const sNiku = sign("niku", O.osNikuIzakaya, 0.1);
  const sKusuri = sign("kusuri", O.osKusuri, 0.12);
  const sUsagi = sign("usagi", O.osUsagiDrug, 0.25);
  const sRound = ["く", "い", "だ", "お"].map((c, i) => sText("round" + i, c, "#ffffff", "#c4141b", { worn: 0.2 }));
  B.opt(wireM, { noShadow: true });

  // puddle decal material (custom: alpha-mapped mirror-like water film)
  const puddleTex = O.osPuddle(7).texture;
  const puddleMat: Mat = {
    m: new THREE.MeshStandardMaterial({ color: "#3a3f45", roughness: 0.04, metalness: 0.55, transparent: true, opacity: 0.85, alphaMap: puddleTex, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    ptex: null, repeat: [1, 1],
  };

  // ---------------- ground ----------------
  const ground = (m: Mat, x0: number, x1: number, z0: number, z1: number, unit: number, y = 0.005) => {
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
    g.rotateX(-PI / 2);
    scaleUV(g, (x1 - x0) / unit, (z1 - z0) / unit);
    B.geo(m, g, (x0 + x1) / 2, y, (z0 + z1) / 2);
    B.opt(m, { noShadow: true });
  };
  k.floor(-70, 70, -70, 70, concrete, 4, -0.02);
  ground(setts, -6.2, 6.2, -60, 60, 1.9);
  ground(setts, 6, 19.5, -2.2, 8.7, 1.9);
  ground(setts, 6, 14.6, -12.7, -4.8, 1.9);
  ground(alleyF, 14.6, 19, -10.6, -4.8, 3.5);
  const puddle = (x: number, z: number, w: number, d: number, rot = 0) => {
    const g = new THREE.PlaneGeometry(w, d);
    g.rotateX(-PI / 2);
    g.rotateY(rot);
    g.translate(x, 0.012, z);
    k.add(g, puddleMat, [0, 0, 0], { noShadow: true });
  };
  for (const [x, z, w, d, r] of [[1.5, -14, 7, 5, 0.3], [-2, -4, 6, 7, 1.2], [2, 7, 6, 5, 2.2], [-1, 16, 7, 6, 0.8], [10, 2.5, 6, 5, 0.4], [9, -8.5, 4, 4, 1.7], [0, -26, 8, 8, 0.5], [0.5, 27, 8, 8, 2.5], [-3.5, 3, 3, 3, 0]] as const) puddle(x, z, w, d, r);
  // gutters along both sides of the street and in the nook
  for (const x of [-5.75, 5.75]) { const g = new THREE.PlaneGeometry(0.3, 110); g.rotateX(-PI / 2); scaleUV(g, 0.3, 110 / 0.8); B.geo(grate, g, x, 0.014, 0); }
  { const g = new THREE.PlaneGeometry(4.0, 0.35); g.rotateX(-PI / 2); scaleUV(g, 5, 0.4); B.geo(grate, g, 16.6, 0.015, -10.35); }
  for (const [x, z] of [[1.8, -6], [-1.5, 9.5], [0.8, 17.5], [12, -0.5]] as const) { B.cyl(manholeM, 0.36, 0.36, 0.02, x, 0, z, { seg: 20 }); B.geo(steelDark, new THREE.TorusGeometry(0.33, 0.012, 3, 20), x, 0.025, z, { rx: PI / 2 }); }

  // ---------------- props (helpers) ----------------
  const within = (x: number, y: number, z: number, ry: number, s: number, fn: () => void) => {
    const prev = B.xf;
    const m = new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), ry), new V3(s, s, s));
    B.xf = prev ? prev.clone().multiply(m) : m;
    fn();
    B.xf = prev;
  };
  /** collider given in the current local frame (rotations by multiples of 90° stay exact) */
  const lcol = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, stand = true) => {
    const bb = new THREE.Box3(new V3(x0, y0, z0), new V3(x1, y1, z1));
    if (B.xf) bb.applyMatrix4(B.xf);
    k.collider(bb.min.x, bb.max.x, bb.min.z, bb.max.z, bb.min.y, bb.max.y, stand);
  };
  const acUnit = (x: number, y: number, z: number, ry: number, onGround = false) => within(x, y, z, ry, 1, () => {
    B.box(acBody, 0.8, 0.6, 0.28, 0, 0, 0, {});
    B.geo(acFront, new THREE.PlaneGeometry(0.78, 0.56), 0, 0.3, 0.145);
    B.box(steelDark, 0.06, 0.05, 0.32, -0.3, -0.04, 0, { flat: true });
    B.box(steelDark, 0.06, 0.05, 0.32, 0.3, -0.04, 0, { flat: true });
    if (onGround) lcol(-0.42, 0.42, 0, 0.62, -0.16, 0.16);
  });
  /** silver spiral duct following a path */
  const ductPath = (pts: V3t[], r = 0.11) => B.tube(duct, pts, r, { seg: pts.length * 8, rs: 10, ulen: 0.5 });
  const cone = (x: number, y: number, z: number, ry = 0) => within(x, y, z, ry, 1, () => {
    B.box(coneRed, 0.38, 0.04, 0.38, 0, 0, 0, { flat: true });
    B.lathe(coneRed, [[0.15, 0.04], [0.14, 0.08], [0.03, 0.7], [0, 0.71]], 0, 0, 0, { seg: 16 });
  });
  const bagGeo = (r: number, seed: number) => {
    const g = new THREE.SphereGeometry(r, 14, 10);
    const rr = O.rng(seed), p = g.attributes.position;
    const f = [rr(), rr(), rr(), rr()];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const n = 1 + 0.1 * Math.sin(x * 11 + f[0] * 6) * Math.cos(z * 9 + f[1] * 6) + 0.06 * Math.sin(y * 17 + f[2] * 6);
      p.setXYZ(i, x * n, (y < 0 ? y * 0.6 : y * (1 + (0.25 * y) / r)) * n * 0.85, z * n);
    }
    g.computeVertexNormals();
    return g;
  };
  const bag = (x: number, y: number, z: number, r: number) => {
    B.geo(bagM, bagGeo(r, Math.floor(x * 13 + z * 7 + 99)), x, y + r * 0.5, z, { ry: rnd() * 6 });
    B.geo(bagM, new THREE.ConeGeometry(0.06, 0.2, 6), x + 0.03, y + r * 1.4, z, { rz: 0.3 });
  };
  const bagPile = (x: number, z: number, n: number, spread = 0.9) => {
    for (let i = 0; i < n; i++) {
      const a = i * 2.4 + rnd(), d = i < 4 ? spread * 0.45 : 0.1;
      const r = 0.34 + rnd() * 0.1, y = i < 4 ? 0 : 0.45;
      bag(x + Math.cos(a) * d, y, z + Math.sin(a) * d, r);
    }
    k.collider(x - spread * 0.6, x + spread * 0.6, z - spread * 0.6, z + spread * 0.6, 0, n > 4 ? 1.1 : 0.7, true);
  };
  const cardSheet = (x: number, z: number, w: number, d: number, ry: number, y = 0.02) => B.box(cardboard, w, 0.012, d, x, y, z, { ry, flat: true, su: w / 1.2, sv: d / 1.2 });
  const cardBox = (x: number, y: number, z: number, w: number, h: number, d: number, ry = 0, solid = true) => {
    B.box(boxM, w, h, d, x, y, z, { ry });
    const e = Math.max(w, d) / 2;
    if (solid) k.collider(x - e, x + e, z - e, z + e, y, y + h, true);
  };
  /** open plastic beer crate (0.46 x 0.3 x 0.34) in local frame */
  const beerCrate = (x: number, y: number, z: number, ry: number, side: Mat, plain: Mat) => within(x, y, z, ry, 1, () => {
    const W = 0.46, H = 0.3, D = 0.34, t = 0.025;
    B.box(plain, W, 0.03, D, 0, 0, 0, { flat: true });
    for (const s of [-1, 1]) {
      B.geo(side, new THREE.BoxGeometry(W, H, t), 0, H / 2, s * (D / 2 - t / 2));
      B.geo(side, new THREE.BoxGeometry(t, H, D), s * (W / 2 - t / 2), H / 2, 0, { su: 0.7 });
    }
    for (let i = 1; i < 4; i++) B.box(plain, 0.012, H * 0.9, D - 0.04, -W / 2 + (i * W) / 4, 0.02, 0, { flat: true });
    for (let i = 1; i < 3; i++) B.box(plain, W - 0.04, H * 0.9, 0.012, 0, 0.02, -D / 2 + (i * D) / 3, { flat: true });
  });
  /** wooden crate with frame boards and diagonal braces */
  const woodenCrate = (x: number, y: number, z: number, s: number, ry: number, solid = true) => within(x, y, z, ry, s, () => {
    const S = 1, b = 0.09, t = 0.035;
    B.box(woodCrate, S - 0.04, S - 0.04, S - 0.04, 0, 0.02, 0, { uv: 0.8, flat: true });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.box(woodCrate, b, S, b, sx * (S / 2 - b / 2), 0, sz * (S / 2 - b / 2), { flat: true, uv: 0.8 });
    for (const yy of [0, S - b]) for (const s2 of [-1, 1]) {
      B.box(woodCrate, S, b, t, 0, yy, s2 * (S / 2 + t / 2 - 0.01), { flat: true, uv: 0.8 });
      B.box(woodCrate, t, b, S, s2 * (S / 2 + t / 2 - 0.01), yy, 0, { flat: true, uv: 0.8 });
    }
    const L = Math.SQRT2 * (S - 2 * b);
    for (const s2 of [-1, 1]) {
      B.box(woodCrate, L, b, t, 0, S / 2 - b / 2, s2 * (S / 2 + t / 2 - 0.005), { flat: true, uv: 0.8, rz: (s2 * PI) / 4 });
      B.box(woodCrate, t, b, L, s2 * (S / 2 + t / 2 - 0.005), S / 2 - b / 2, 0, { flat: true, uv: 0.8, rx: (s2 * PI) / 4 });
    }
    if (solid) lcol(-S / 2 - 0.03, S / 2 + 0.03, 0, S, -S / 2 - 0.03, S / 2 + 0.03);
  });
  const pallet = (x: number, y: number, z: number, ry: number, w = 1.2, d = 1.0) => within(x, y, z, ry, 1, () => {
    for (const dz of [-1, 0, 1]) B.box(palletM, w, 0.1, 0.1, 0, 0, dz * (d / 2 - 0.05), { flat: true, uv: 0.8 });
    for (let j = 0; j < 7; j++) B.box(palletM, 0.13, 0.025, d, -w / 2 + 0.065 + (j * (w - 0.13)) / 6, 0.1, 0, { flat: true, uv: 0.8 });
  });
  const keg = (x: number, y: number, z: number, m: Mat) => {
    B.lathe(m, [[0, 0], [0.19, 0], [0.205, 0.03], [0.2, 0.1], [0.205, 0.13], [0.2, 0.2], [0.205, 0.23], [0.205, 0.37], [0.2, 0.4], [0.205, 0.47], [0.2, 0.52], [0.205, 0.56], [0.19, 0.59], [0.16, 0.6], [0.02, 0.6]], x, y, z, { seg: 20 });
    B.cyl(m, 0.205, 0.205, 0.12, x, y + 0.56, z, { seg: 20, open: true });
    B.cyl(steelDark, 0.025, 0.025, 0.08, x, y + 0.58, z, { seg: 8 });
    k.collider(x - 0.21, x + 0.21, z - 0.21, z + 0.21, y, y + 0.68, true);
  };
  const drum = (x: number, z: number, m: Mat, lying = false, ry = 0) => {
    if (!lying) {
      B.cyl(m, 0.29, 0.29, 0.88, x, 0, z, { seg: 20, su: 2 });
      for (const hy of [0.29, 0.59]) B.geo(m, new THREE.TorusGeometry(0.295, 0.016, 4, 20), x, hy, z, { rx: PI / 2 });
      B.cyl(steelDark, 0.27, 0.27, 0.01, x, 0.88, z, { seg: 16 });
      k.collider(x - 0.29, x + 0.29, z - 0.29, z + 0.29, 0, 0.89, true);
    } else {
      B.cyl(m, 0.29, 0.29, 0.88, x, -0.44 + 0.29, z, { seg: 20, rz: PI / 2, ry, su: 2 });
      const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry));
      k.collider(x - 0.44 * c - 0.29 * s, x + 0.44 * c + 0.29 * s, z - 0.44 * s - 0.29 * c, z + 0.44 * s + 0.29 * c, 0, 0.58, true);
    }
  };
  const gasCyl = (x: number, y: number, z: number, m = gasGrey, s = 1) => {
    B.lathe(m, ([[0, 0], [0.17, 0], [0.18, 0.05], [0.18, 0.72], [0.14, 0.82], [0.05, 0.86], [0, 0.86]] as [number, number][]).map(([r, h]) => [r * s, h * s] as [number, number]), x, y, z, { seg: 18 });
    B.cyl(steelDark, 0.07 * s, 0.07 * s, 0.14 * s, x, y + 0.84 * s, z, { seg: 10, open: true });
  };
  const extinguisher = (x: number, y: number, z: number) => {
    B.lathe(extRed, [[0, 0], [0.08, 0], [0.085, 0.4], [0.06, 0.47], [0, 0.49]], x, y, z, { seg: 12 });
    B.box(blackSteel, 0.05, 0.08, 0.12, x, y + 0.48, z, { flat: true });
  };
  const chair = (x: number, z: number, ry: number) => within(x, 0, z, ry, 1, () => {
    B.box(chairWood, 0.44, 0.04, 0.42, 0, 0.44, 0, {});
    for (const sx of [-0.19, 0.19]) for (const sz of [-0.18, 0.18]) B.box(chairWood, 0.04, 0.44, 0.04, sx, 0, sz, { flat: true });
    for (const sx of [-0.19, 0.19]) B.box(chairWood, 0.04, 0.5, 0.04, sx, 0.48, -0.18, { flat: true });
    B.box(chairWood, 0.42, 0.07, 0.03, 0, 0.9, -0.18, { flat: true });
    for (let i = 0; i < 4; i++) B.box(chairWood, 0.03, 0.4, 0.02, -0.12 + i * 0.08, 0.5, -0.18, { flat: true });
    B.box(chairWood, 0.4, 0.03, 0.03, 0, 0.2, -0.18, { flat: true });
    lcol(-0.23, 0.23, 0, 0.48, -0.22, 0.22);
  });
  const lumberStack = (x: number, z: number, ry: number, L = 2.6, rows = 5, cols = 6) => within(x, 0, z, ry, 1, () => {
    const pw = 0.14, ph = 0.04;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const jitter = (rnd() - 0.5) * 0.12;
      B.box(lumber, L + jitter, ph - 0.004, pw - 0.006, jitter / 2, r * ph + 0.08, -(cols * pw) / 2 + pw / 2 + c * pw, { flat: true, uv: 0.9 });
    }
    for (const sx of [-L / 2 + 0.3, 0, L / 2 - 0.3]) B.box(woodCrate, 0.09, 0.08, cols * pw, sx, 0, 0, { flat: true, uv: 0.8 });
    lcol(-L / 2, L / 2, 0, rows * ph + 0.08, -(cols * pw) / 2, (cols * pw) / 2);
  });
  const blueBin = (x: number, z: number, withBag = false) => {
    B.lathe(binBlue, [[0.24, 0], [0.3, 0.8], [0.315, 0.82], [0.315, 0.86], [0.29, 0.86], [0.275, 0.82], [0.215, 0.04], [0, 0.04]], x, 0, z, { seg: 20 });
    for (let i = 0; i < 12; i++) { const a = (i / 12) * PI * 2; B.box(binBlue, 0.03, 0.72, 0.02, x + Math.cos(a) * 0.28, 0.06, z + Math.sin(a) * 0.28, { ry: -a + PI / 2, flat: true }); }
    if (withBag) bag(x, 0.72, z, 0.36);
    k.collider(x - 0.31, x + 0.31, z - 0.31, z + 0.31, 0, 0.86, true);
  };
  const bucket = (x: number, y: number, z: number) => B.lathe(bucketBlue, [[0.16, 0], [0.22, 0.3], [0.235, 0.31], [0.235, 0.33], [0.22, 0.33], [0.2, 0.31], [0.145, 0.02], [0, 0.02]], x, y, z, { seg: 20 });
  const milkJug = (x: number, z: number, ry: number) => within(x, 0, z, ry, 1, () => {
    B.box(jugM, 0.32, 0.36, 0.22, 0, 0, 0, { su: 1 });
    B.lathe(white, [[0.12, 0], [0.1, 0.06], [0.05, 0.1], [0, 0.1]], -0.06, 0.36, 0, { seg: 12 });
    B.cyl(jugCap, 0.045, 0.045, 0.05, -0.06, 0.44, 0, { seg: 12 });
    B.tube(white, [[0.02, 0.36, 0], [0.1, 0.42, 0], [0.15, 0.3, 0]], 0.025, { seg: 10, rs: 6 });
    lcol(-0.17, 0.17, 0, 0.49, -0.12, 0.12);
  });

  // ---------------- street furniture ----------------
  /** wooden utility pole: returns the attachment point for wires */
  const utilityPole = (x: number, z: number, h = 9.5): V3t => {
    B.cyl(poleWood, 0.13, 0.16, h, x, 0, z, { seg: 14, su: 1, sv: 3 });
    B.cyl(poleTag, 0.168, 0.168, 0.55, x, 1.75, z, { seg: 14, open: true, ry: rnd() * 6 });
    B.cyl(poleTag, 0.162, 0.162, 0.35, x, 3.2, z, { seg: 14, open: true, ry: 2 + rnd() * 3 });
    B.box(steelDark, 1.7, 0.1, 0.1, x, h - 0.7, z, { flat: true });
    B.box(steelDark, 1.3, 0.1, 0.1, x, h - 1.5, z, { flat: true });
    for (const dx of [-0.75, -0.25, 0.25, 0.75]) B.cyl(insul, 0.04, 0.05, 0.14, x + dx, h - 0.6, z, { seg: 6 });
    B.cyl(steel, 0.22, 0.22, 0.75, x, h - 2.9, z + 0.33, { seg: 12 });
    B.rod(steelDark, 0.02, [x, h - 2.4, z + 0.12], [x, h - 2.4, z + 0.3], 4);
    k.collider(x - 0.17, x + 0.17, z - 0.17, z + 0.17, 0, h, false);
    return [x, h - 0.55, z];
  };
  /** octagonal concrete bench around a pole */
  const octGeo = (() => {
    const g = new THREE.LatheGeometry(([[0.26, 0], [1.0, 0], [1.0, 0.11], [0.26, 0.11], [0.26, 0]] as [number, number][]).map(([r, h]) => new THREE.Vector2(r, h)), 8, PI / 8);
    const ng = g.toNonIndexed();
    ng.computeVertexNormals();
    return ng;
  })();
  const octBench = (x: number, z: number) => {
    B.geo(benchStone, octGeo.clone(), x, 0.36, z, { su: 1.5, sv: 1.5 });
    for (let i = 0; i < 5; i++) { const a = (i / 5) * PI * 2 + 0.3; B.cyl(benchStone, 0.13, 0.15, 0.37, x + Math.cos(a) * 0.62, 0, z + Math.sin(a) * 0.62, { seg: 12 }); }
    k.collider(x - 0.98, x + 0.98, z - 0.98, z + 0.98, 0, 0.47, true);
  };
  /** street lamp: bronze post with 4 curled arms and a top globe */
  const streetLamp = (x: number, z: number, h = 4.3) => {
    B.lathe(bronze, [[0, 0], [0.16, 0], [0.16, 0.08], [0.1, 0.14], [0.09, 0.5], [0.065, 0.6], [0.065, h - 0.5], [0.08, h - 0.45], [0.05, h - 0.3], [0.05, h], [0, h]], x, 0, z, { seg: 14 });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * PI * 2 + PI / 4, c = Math.cos(a), s = Math.sin(a);
      B.tube(bronze, [[x, h - 0.55, z], [x + c * 0.2, h - 0.45, z + s * 0.2], [x + c * 0.42, h - 0.35, z + s * 0.42], [x + c * 0.5, h - 0.15, z + s * 0.5]], 0.022, { seg: 12, rs: 5 });
      B.cyl(bronze, 0.06, 0.035, 0.07, x + c * 0.5, h - 0.17, z + s * 0.5, { seg: 10 });
      B.sphere(globe, 0.16, x + c * 0.5, h + 0.03, z + s * 0.5, { ws: 14, hs: 10 });
    }
    B.cyl(bronze, 0.06, 0.035, 0.07, x, h, z, { seg: 10 });
    B.sphere(globe, 0.17, x, h + 0.22, z, { ws: 14, hs: 10 });
    B.cyl(bronze, 0.015, 0.03, 0.08, x, h + 0.38, z, { seg: 6 });
    k.collider(x - 0.12, x + 0.12, z - 0.12, z + 0.12, 0, h, false);
  };

  // ---------------- vehicles ----------------
  /** kei truck, local +x = forward. Built at (x,z) with heading ry */
  const keiTruck = (x: number, z: number, ry: number, body: Mat, cargo?: () => void) => within(x, 0, z, ry, 1, () => {
    const TW = 1.46;
    B.box(steelDark, 3.25, 0.2, 1.1, 0, 0.28, 0, { flat: true });
    for (const wx of [-1.1, 1.12]) for (const s of [-1, 1]) {
      B.cyl(tyre, 0.27, 0.27, 0.18, wx, 0.27 - 0.09, s * 0.6, { seg: 18, rx: PI / 2 });
      B.cyl(steel, 0.15, 0.15, 0.185, wx, 0.27 - 0.0925, s * 0.6, { seg: 12, rx: PI / 2 });
      B.box(steelDark, 0.7, 0.05, 0.22, wx, 0.6, s * 0.62, { flat: true });
    }
    // cab
    B.box(body, 0.85, 1.12, TW, 1.25, 0.5, 0, {});
    B.box(body, 0.78, 0.2, TW - 0.06, 1.23, 1.6, 0, {});
    B.box(darkGlass, 0.04, 0.55, TW - 0.22, 1.66, 1.07, 0, { flat: true, rz: 0.12 });
    for (const s of [-1, 1]) {
      B.box(darkGlass, 0.62, 0.45, 0.02, 1.2, 1.12, s * (TW / 2 + 0.005), { flat: true });
      B.box(steelDark, 0.12, 0.06, 0.08, 1.45, 1.4, s * (TW / 2 + 0.05), { flat: true });
      B.box(lampW, 0.03, 0.12, 0.22, 1.685, 0.8, s * 0.52, { flat: true });
      B.box(lampRed, 0.03, 0.14, 0.12, -1.68, 0.6, s * 0.6, { flat: true });
    }
    B.box(steelDark, 0.08, 0.22, TW + 0.02, 1.68, 0.36, 0, { flat: true });
    B.geo(plateM, new THREE.PlaneGeometry(0.34, 0.17), 1.73, 0.62, 0, { ry: PI / 2 });
    B.geo(plateM, new THREE.PlaneGeometry(0.34, 0.17), -1.72, 0.5, 0.2, { ry: -PI / 2 });
    // bed + side gates + cab guard
    B.box(body, 2.5, 0.12, TW, -0.45, 0.62, 0, { flat: true, su: 2 });
    for (const s of [-1, 1]) B.box(body, 2.5, 0.3, 0.04, -0.45, 0.74, s * (TW / 2 - 0.02), { flat: true });
    B.box(body, 0.04, 0.3, TW, -1.68, 0.74, 0, { flat: true });
    B.box(body, 0.05, 0.36, TW, 0.8, 0.74, 0, { flat: true });
    for (let i = 0; i < 7; i++) B.box(steelDark, 0.03, 0.62, 0.03, 0.8, 1.1, -TW / 2 + 0.1 + (i * (TW - 0.2)) / 6, { flat: true });
    B.box(steelDark, 0.05, 0.05, TW, 0.8, 1.72, 0, { flat: true });
    lcol(0.78, 1.72, 0, 1.8, -TW / 2, TW / 2);
    lcol(-1.7, 0.78, 0, 0.68, -TW / 2, TW / 2);
    lcol(-1.7, 0.78, 0, 1.04, -TW / 2, -TW / 2 + 0.05);
    lcol(-1.7, 0.78, 0, 1.04, TW / 2 - 0.05, TW / 2);
    lcol(-1.7, -1.64, 0, 1.04, -TW / 2, TW / 2);
    cargo?.();
  });
  const keiVan = (x: number, z: number, ry: number) => within(x, 0, z, ry, 1, () => {
    const TW = 1.46;
    B.box(steelDark, 3.2, 0.2, 1.1, 0, 0.28, 0, { flat: true });
    for (const wx of [-1.05, 1.1]) for (const s of [-1, 1]) B.cyl(tyre, 0.27, 0.27, 0.18, wx, 0.18, s * 0.6, { seg: 18, rx: PI / 2 });
    B.box(truckWhite, 3.3, 1.35, TW, 0, 0.45, 0, {});
    B.box(truckWhite, 0.4, 0.6, TW - 0.04, 1.5, 0.45, 0, {});
    B.box(darkGlass, 0.05, 0.55, TW - 0.2, 1.66, 1.15, 0, { flat: true, rz: 0.2 });
    for (const s of [-1, 1]) B.box(darkGlass, 1.0, 0.45, 0.02, 1.0, 1.25, s * (TW / 2 + 0.005), { flat: true });
    B.box(steelDark, 0.1, 0.2, TW + 0.02, 1.72, 0.33, 0, { flat: true });
  });

  // ---------------- giant sculptures ----------------
  /** takoyaki octopus (local: head up, facing +z). pose "ground": tentacles spread on the floor; "wall": spread on a wall behind */
  const octopus = (pose: "ground" | "wall", tiltZ = 0) => {
    const head = () => {
      B.lathe(octoHead, [[0, 0.6], [0.32, 0.62], [0.52, 0.76], [0.64, 1.02], [0.72, 1.42], [0.7, 1.84], [0.58, 2.18], [0.36, 2.42], [0, 2.52]], 0, 0, 0, { seg: 26, phi: PI });
      B.geo(towel, new THREE.TorusGeometry(0.66, 0.1, 8, 28), 0, 1.28, 0, { rx: PI / 2, su: 6 });
      B.sphere(towel, 0.12, 0.12, 1.3, -0.68, { ws: 8, hs: 6 });
      B.sphere(towel, 0.12, -0.12, 1.3, -0.68, { ws: 8, hs: 6 });
      for (const s of [-1, 1]) {
        B.sphere(yellowEye, 0.11, s * 0.24, 0.98, 0.52, { ws: 12, hs: 8, s: [1, 1, 0.6] });
        B.sphere(blackGloss, 0.06, s * 0.24, 0.98, 0.585, { ws: 10, hs: 6, s: [1, 1, 0.5] });
      }
      B.cyl(octoSkin, 0.1, 0.12, 0.34, 0, 0.61, 0.5, { seg: 14, rx: PI / 2 });
      B.geo(octoSkin, new THREE.TorusGeometry(0.1, 0.035, 6, 14), 0, 0.78, 0.67, {});
    };
    if (tiltZ) {
      const prev = B.xf;
      const piv = new THREE.Matrix4().makeTranslation(0, 0.5, 0).multiply(new THREE.Matrix4().makeRotationZ(tiltZ)).multiply(new THREE.Matrix4().makeTranslation(0, -0.5, 0));
      B.xf = prev ? prev.clone().multiply(piv) : piv;
      head();
      B.xf = prev;
    } else head();
    B.sphere(octoSkin, 0.42, 0, 0.62, 0, { ws: 16, hs: 10, s: [1, 0.7, 1] });
    for (let i = 0; i < 8; i++) {
      let pts: V3t[];
      if (pose === "ground") {
        const a = (i / 8) * PI * 2 + 0.2, b = a + (i % 2 ? 0.45 : -0.45);
        const C = (t: number, r: number, y: number): V3t => [Math.cos(a + (b - a) * t) * r, y, Math.sin(a + (b - a) * t) * r];
        pts = [C(0, 0.25, 0.6), C(0.1, 0.62, 0.3), C(0.35, 1.1, 0.13), C(0.65, 1.55, 0.11), C(0.9, 1.85, 0.22), C(1, 1.9, 0.42)];
      } else {
        const a = -PI * 0.92 + (i / 7) * PI * 1.84, b = a + (i % 2 ? 0.5 : -0.5);
        const C = (t: number, r: number, zz: number): V3t => [Math.sin(a + (b - a) * t) * r * 1.1, 0.75 + Math.cos(a + (b - a) * t) * r, zz];
        pts = [C(0, 0.25, 0), C(0.15, 0.6, -0.12), C(0.4, 1.1, -0.2), C(0.7, 1.6, -0.18), C(0.95, 1.9, -0.02), C(1, 1.95, 0.18)];
      }
      B.geo(octoSkin, taperTube(pts, 0.19, 0.035, 22, 9), 0, 0, 0);
    }
  };
  /** pufferfish lantern, local axis +z = head, belly down */
  const pufferfish = (s: number) => {
    B.lathe(puffer, ([[0, 0], [0.22, 0.04], [0.5, 0.22], [0.72, 0.58], [0.8, 1.0], [0.77, 1.4], [0.62, 1.76], [0.4, 2.02], [0.16, 2.18], [0, 2.2]] as [number, number][]).map(([r, h]) => [r * s, h * s] as [number, number]), 0, 0, -1.1 * s, { seg: 26, rx: PI / 2 });
    B.geo(white, new THREE.TorusGeometry(0.12 * s, 0.05 * s, 8, 16), 0, -0.05 * s, 1.1 * s, {});
    B.geo(pufferGrey, new THREE.ConeGeometry(0.42 * s, 0.5 * s, 4), 0, 0, -1.25 * s, { rx: -PI / 2, s: [0.2, 1, 1] });
    for (const sd of [-1, 1]) B.sphere(white, 0.25 * s, sd * 0.78 * s, -0.1 * s, 0.35 * s, { ws: 10, hs: 6, s: [0.25, 1, 0.8] });
    B.sphere(pufferGrey, 0.25 * s, 0, 0.78 * s, -0.4 * s, { ws: 10, hs: 6, s: [0.2, 0.9, 1.2] });
    for (let i = 0; i < 26; i++) {
      const a = rnd() * PI * 2, zz = (rnd() - 0.5) * 1.6 * s;
      const rr = 0.8 * s * Math.sqrt(Math.max(0.05, 1 - (zz / (1.15 * s)) ** 2));
      B.geo(white, new THREE.ConeGeometry(0.025 * s, 0.12 * s, 4), Math.cos(a) * rr, Math.sin(a) * rr, zz, { rz: a - PI / 2 });
    }
  };
  /** giant sea urchin mounted on a wall (local +z = out of wall) */
  const urchin = (R: number, seed: number) => {
    const r = O.rng(seed);
    B.sphere(blackGloss, R * 0.36, 0, 0, 0, { ws: 18, hs: 12, s: [1, 1, 0.7] });
    B.sphere(roe, R * 0.2, 0, 0, R * 0.2, { ws: 14, hs: 10, s: [1, 1, 0.55] });
    const up = new V3(0, 1, 0);
    for (let i = 0; i < 44; i++) {
      const dir = new V3(r() - 0.5, r() - 0.5, r() * 0.9 - 0.15).normalize();
      if (Math.abs(dir.z) > 0.85 && r() < 0.7) continue;
      const len = R * (0.65 + r() * 0.45);
      const g = new THREE.ConeGeometry(0.03 * R, len, 5);
      g.translate(0, len / 2, 0);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir));
      const base = dir.clone().multiplyScalar(R * 0.28);
      B.geo(blackGloss, g, base.x, base.y, base.z * 0.7);
    }
  };

  // ---------------- buildings ----------------
  type Style = { wall: Mat; band?: Mat; glass?: number; win?: "strip" | "punched" | "none"; ac?: number; shutter?: number; bays?: number; groundH?: number; duct?: number; floors?: number; cap?: boolean };
  /** facade dressing on face f from u0 to u1, building height H */
  const facade = (f: Face, u0: number, u1: number, H: number, st: Style) => {
    const len = u1 - u0, GH = st.groundH ?? 3.3;
    const P = (u: number, y: number, d: number) => fp(f, u, y, d);
    const fb = (m: Mat, w: number, h: number, d: number, u: number, y: number, dd: number, o: BO = {}) => B.box(m, w, h, d, ...P(u, y, dd), { ...o, ry: f.ry + (o.ry ?? 0) });
    const pl = (m: Mat, w: number, h: number, u: number, yc: number, dd: number, su?: number, sv?: number) => B.geo(m, new THREE.PlaneGeometry(w, h), ...P(u, yc, dd), { ry: f.ry, su, sv });
    // ground floor shutters
    if (st.shutter !== undefined) {
      const n = st.bays ?? Math.max(1, Math.round(len / 3.4));
      const bw = len / n;
      for (let i = 0; i < n; i++) {
        const uc = u0 + (i + 0.5) * bw, sw = bw - 0.55;
        const shm = shutters[(st.shutter + i) % shutters.length];
        pl(shm, sw, 2.75, uc, 1.375, 0.02, sw / 2.2, 2.75 / 2.2);
        fb(shm, sw + 0.1, 0.38, 0.32, uc, 2.72, 0.14, { flat: true });
        for (const s of [-1, 1]) fb(steel, 0.06, 2.75, 0.06, uc + (s * sw) / 2, 0, 0.04, { flat: true });
        fb(steelDark, sw, 0.05, 0.06, uc, 0, 0.04, { flat: true });
        if (i > 0) fb(st.wall, 0.5, GH, 0.1, u0 + i * bw, 0, 0.05, { flat: true, uv: 2, world: true });
      }
    }
    fb(st.band ?? concrete, len, 0.26, 0.28, (u0 + u1) / 2, GH, 0.14, { flat: true, uv: 2, world: true });
    // upper floors
    const floors = st.floors ?? Math.max(0, Math.floor((H - GH - 0.8) / 3));
    for (let fl = 0; fl < floors; fl++) {
      const y0 = GH + 0.26 + fl * 3;
      if ((st.win ?? "strip") === "strip") {
        const w = len - 0.9;
        pl(glassM[(st.glass ?? 0) % 2], w, 1.5, (u0 + u1) / 2, y0 + 1.35, 0.015, w / 3, 1);
        fb(concLight, w + 0.1, 0.08, 0.18, (u0 + u1) / 2, y0 + 0.52, 0.06, { flat: true });
      } else if (st.win === "punched") {
        const n = Math.max(1, Math.floor(len / 2.4));
        for (let i = 0; i < n; i++) {
          const uc = u0 + ((i + 0.5) * len) / n;
          pl(glassM[(i + fl + (st.glass ?? 0)) % 2], 1.3, 1.4, uc, y0 + 1.4, 0.015, 0.45, 1);
          fb(concLight, 1.45, 0.08, 0.16, uc, y0 + 0.62, 0.06, { flat: true });
          fb(steelDark, 1.4, 0.05, 0.05, uc, y0 + 2.1, 0.02, { flat: true });
        }
      }
      // AC units hanging on brackets
      const acs = Math.floor(((st.ac ?? 0.3) * len) / 2.2 + rnd() * 0.8);
      for (let i = 0; i < acs; i++) {
        const uc = u0 + 0.7 + rnd() * (len - 1.4);
        const p = P(uc, y0 + 0.05, 0.2);
        acUnit(p[0], p[1], p[2], f.ry);
      }
    }
    if (st.cap !== false) fb(concLight, len, 0.35, 0.3, (u0 + u1) / 2, H, 0.05, { flat: true, uv: 2, world: true });
    // ducts climbing the wall from the ground-level AC units
    for (let i = 0; i < (st.duct ?? 0); i++) {
      const uc = u0 + 1.2 + rnd() * (len - 2.4), top = Math.min(H - 0.5, 6 + rnd() * 3);
      const zig = (rnd() - 0.5) * 2.4;
      const a = P(uc - 0.9, 0, 0.3);
      acUnit(a[0], a[1], a[2], f.ry, true);
      ductPath([P(uc - 0.55, 0.35, 0.3), P(uc, 0.5, 0.25), P(uc, 2.4, 0.22), P(uc + zig * 0.5, 3.0, 0.4), P(uc + zig, 3.9, 0.22), P(uc + zig, top, 0.22)]);
    }
  };
  /** solid building block spanning the face from u0 to u1 with depth D */
  const building = (f: Face, u0: number, u1: number, D: number, H: number, st: Style, solid = true) => {
    const a = fp(f, u0, 0, 0), b = fp(f, u1, 0, -D);
    B.blk(st.wall, a[0], b[0], 0, H, a[2], b[2], 2.4, solid);
    facade(f, u0, u1, H, st);
  };
  const W: Face = { ox: -6, oz: 0, ry: PI / 2 }; // west buildings, facing +x, u = -z
  const E: Face = { ox: 6, oz: 0, ry: -PI / 2 }; // east buildings, facing -x, u = z
  let yardPoleTop: V3t = [11.6, 8.95, 2.6];

  // ===== WEST 1: うに道楽 本店 (z 6 → 26) =====
  {
    building(W, -26, -6.2, 12, 10.5, { wall: panelW, shutter: 0, bays: 6, win: "none", floors: 0 });
    const bandZ0 = 6.4, bandZ1 = 25.8;
    B.blk(concLight, -6, -5.7, 3.3, 4.7, bandZ0, bandZ1, 2, false);
    B.geo(sUni, new THREE.PlaneGeometry(7.2, 1.3), -5.69, 4.0, 13.2, { ry: PI / 2 });
    B.box(steelDark, 0.4, 0.08, bandZ1 - bandZ0, -5.8, 4.7, (bandZ0 + bandZ1) / 2, { flat: true });
    // upper facade: dark glass behind a black lattice
    B.geo(panelW, new THREE.PlaneGeometry(bandZ1 - bandZ0, 5.8), -5.98, 7.6, (bandZ0 + bandZ1) / 2, { ry: PI / 2, su: (bandZ1 - bandZ0) / 2.4, sv: 5.8 / 2.4 });
    for (let y = 5.3; y <= 10; y += 1.55) B.geo(glassM[1], new THREE.PlaneGeometry(bandZ1 - bandZ0 - 0.6, 0.8), -5.97, y, (bandZ0 + bandZ1) / 2, { ry: PI / 2, su: (bandZ1 - bandZ0) / 3 });
    for (let z = bandZ0; z <= bandZ1 + 0.01; z += 0.8) B.box(blackSteel, 0.08, 5.4, 0.06, -5.9, 4.8, z, { flat: true });
    for (let y = 4.8; y <= 10.3; y += 1.1) B.box(blackSteel, 0.1, 0.06, bandZ1 - bandZ0, -5.88, y, (bandZ0 + bandZ1) / 2, { flat: true });
    // sea urchins above the sign
    for (const [z, y, R, sd] of [[9.4, 6.7, 1.35, 3], [12.2, 6.2, 1.0, 5], [16.8, 6.9, 1.45, 7], [21.5, 6.4, 1.2, 9]] as const) within(-5.3, y, z, PI / 2, 1, () => urchin(R, sd));
    // shop-front clutter under the canopy
    cardBox(-5.2, 0, 7.4, 0.6, 0.5, 0.5, 0.1); cardBox(-5.25, 0.5, 7.4, 0.5, 0.42, 0.45, -0.2, false); cardBox(-5.3, 0, 8.2, 0.55, 0.45, 0.5, 0.3);
    milkJug(-5.3, 8.9, 0.4);
    cardSheet(-4.6, 10.2, 1.1, 0.8, 0.5);
    keiTruck(-4.3, 15.4, PI / 2, truckWhite, () => {
      for (const [bx, bz] of [[-1.2, -0.3], [-0.6, 0.35], [-0.3, -0.25]] as const) B.box(boxM, 0.5, 0.42, 0.42, bx, 0.68, bz, { ry: rnd() });
      gasCyl(-1.4, 0.68, 0.4);
    });
    k.room("Uni Doraku", -8, 0, 6, 20);
  }

  // ===== WEST 2: red drugstore (z -4 → 6) with a recessed shop front =====
  {
    const zA = -4, zB = 6, rx = -9.6; // recess back wall x
    B.blk(redPaint, -22, rx, 0, 8.5, zA, zB, 2.4);
    B.blk(redPaint, rx, -6, 3.3, 8.5, zA, zB, 2.4); // upper floors over the recess
    B.blk(redPaint, rx, -6, 0, 3.3, zA, zA + 0.5, 2.4); // side walls of the recess
    B.blk(redPaint, rx, -6, 0, 3.3, zB - 0.5, zB, 2.4);
    B.blk(redStone, -6.9, -6, 0, 3.3, zB - 0.9, zB - 0.5, 1.2); // polished stone pillar
    B.blk(shopTile, rx, -6.9, 0, 0.14, zA + 0.5, zB - 0.5, 1.2); // raised tile step
    B.blk(shopTile, -6.9, -6, 0, 0.14, zA + 0.5, zB - 0.9, 1.2);
    // shutters on the back wall of the recess
    for (const [zc, i] of [[-1.3, 0], [2.6, 1]] as const) {
      B.geo(shutters[i], new THREE.PlaneGeometry(3.2, 2.8), rx + 0.01, 1.54, zc, { ry: PI / 2, su: 1.45, sv: 1.27 });
      B.box(shutters[i], 0.35, 0.35, 3.3, rx + 0.17, 2.85, zc, { flat: true });
    }
    B.box(redPaint, 0.3, 3.2, 0.5, rx + 0.15, 0.14, 0.65, { flat: true });
    B.geo(sText("kusuri2", "TOM KODNER", "#f2d21a", "#1a1a1a", { worn: 0.3 }), new THREE.PlaneGeometry(2.8, 0.5), rx + 0.02, 3.05, 0.65, { ry: PI / 2 });
    // red fascia band + hanging 薬 banners
    B.geo(sText("drug", "TOM KODNER", "#c8161d", "#ffffff", { worn: 0.3, border: "#ffffff" }), new THREE.PlaneGeometry(6.5, 0.95), -5.99, 3.85, 0.2, { ry: PI / 2 });
    for (const z of [-2.6, 0.7, 4.0]) {
      B.geo(sKusuri, new THREE.PlaneGeometry(0.75, 1.1), -5.94, 2.7, z, { ry: PI / 2 });
      B.geo(sKusuri, new THREE.PlaneGeometry(0.75, 1.1), -5.96, 2.7, z, { ry: -PI / 2 });
      B.rod(blackSteel, 0.015, [-5.95, 3.28, z - 0.42], [-5.95, 3.28, z + 0.42], 5);
    }
    B.geo(sKusuri, new THREE.PlaneGeometry(0.5, 0.75), -6.905, 2.2, zB - 0.7, { ry: -PI / 2 });
    // upper windows
    facade(W, -zB, -zA, 8.5, { wall: redPaint, band: redPaint, win: "punched", ac: 0.5, glass: 1, groundH: 4.4 });
    // clutter inside the recess
    gasCyl(-9.1, 0.14, -2.6); gasCyl(-9.15, 0.14, -2.1, gasGrey, 0.9);
    k.collider(-9.35, -8.85, -2.85, -1.85, 0, 1.0, true);
    for (let i = 0; i < 3; i++) B.cyl(bottleM, 0.035, 0.035, 0.3, -9.2, 0.14, 1.4 + i * 0.09, { seg: 8 });
    drum(-9.1, 4.6, drumGrey);
    beerCrate(-9.1, 0.14, 3.7, 0.2, crateCream, crateCreamPlain); beerCrate(-9.1, 0.44, 3.7, 0.1, crateCream, crateCreamPlain);
    k.collider(-9.4, -8.8, 3.45, 3.95, 0, 0.75, true);
    B.tube(hoseBlue, [[-9.3, 0.17, -0.5], [-8.6, 0.17, -0.1], [-8.9, 0.17, 0.4], [-9.4, 0.17, 0.1], [-8.8, 0.17, -0.3]], 0.025, { seg: 30, rs: 5, closed: true });
    k.room("Drugstore", -9.6, -6, -4, 6);
  }

  // ===== WEST 3: tall white building with the vertical sign stack (z -26 → -4) =====
  {
    building(W, 4, 12.5, 14, 16, { wall: panelW, shutter: 1, win: "strip", ac: 0.35, glass: 0, duct: 1 });
    building(W, 12.5, 26, 14, 12, { wall: panelG, shutter: 2, win: "punched", ac: 0.4, glass: 1 });
    /** vertical sign sticking out of a wall at x0 toward dir (+1 = +x) */
    const vsign = (x0: number, dir: number, z: number, y0: number, w: number, h: number, m: Mat) => {
      const xc = x0 + dir * (w / 2 + 0.25);
      B.box(steelDark, w + 0.06, h + 0.06, 0.14, xc, y0 - 0.03, z, { flat: true });
      B.geo(m, new THREE.PlaneGeometry(w, h), xc, y0 + h / 2, z + 0.072, {});
      B.geo(m, new THREE.PlaneGeometry(w, h), xc, y0 + h / 2, z - 0.072, { ry: PI });
      for (const yy of [y0 + 0.3, y0 + h - 0.3]) B.rod(steelDark, 0.03, [x0, yy, z], [x0 + dir * 0.3, yy, z], 6);
    };
    vsign(-6, 1, -5.0, 3.6, 1.05, 3.2, sNiku);
    vsign(-6, 1, -5.0, 7.0, 0.95, 3.8, sMenzei);
    vsign(-6, 1, -5.0, 11.0, 0.95, 3.8, sNeko);
    vsign(-6, 1, -13.2, 3.7, 0.9, 3.6, sNeko);
    vsign(-6, 1, -13.2, 7.5, 0.9, 3.4, sText("ramen", "TOM KODNER", "#f4e04d", "#c0141b", { vertical: true, worn: 0.3 }, 0.1));
    vsign(-6, 1, -21, 3.7, 0.9, 3.6, sText("karaoke", "TOM KODNER", "#1a1030", "#ff4fa0", { vertical: true, neon: true, worn: 0.1 }, 0.5));
    vsign(-6, 1, -21, 7.5, 0.9, 3.4, sText("izaka", "TOM KODNER", "#f3f2ee", "#111", { vertical: true, worn: 0.3, serif: true }));
    // izakaya noren + lanterns at street level
    B.geo(sText("noren", "TOM KODNER", "#1f2f5a", "#ffffff", { worn: 0.1 }), new THREE.PlaneGeometry(2.2, 0.7), -5.9, 2.4, -9.0, { ry: PI / 2 });
    const lanM = sText("lan", "酒", "#d8262b", "#111", { worn: 0 }, 0.4);
    for (const z of [-7.6, -10.4]) {
      B.lathe(lanM, [[0.02, 0], [0.16, 0.02], [0.25, 0.14], [0.27, 0.32], [0.25, 0.5], [0.16, 0.62], [0.02, 0.64]], -5.7, 1.9, z, { seg: 14 });
      B.rod(blackSteel, 0.01, [-5.7, 2.54, z], [-5.7, 3.2, z], 4);
    }
    beerCrate(-5.5, 0, -12.3, 0.3, crateRed, crateRedPlain); beerCrate(-5.5, 0.3, -12.3, 0.2, crateRed, crateRedPlain);
    k.collider(-5.8, -5.2, -12.6, -12.0, 0, 0.6, true);
    bagPile(-5.2, -16.5, 3, 0.8);
    cardSheet(-4.6, -18, 1.2, 0.9, 1.9);
    cone(-5.2, 0, -7.2);
    k.room("Sign Street", -6, 6, -20, -4);
  }

  // ===== EAST 1: dark glass corner building with the octopus (z 8.5 → 30) =====
  {
    const zS = 8.5;
    B.blk(panelD, 6, 30, 0, 3.4, zS, 30, 2.4);
    B.blk(panelD, 6.3, 30, 3.4, 10.5, zS + 0.3, 30, 2.4);
    // glass grid on the street face (x=6.3) and the yard face (z=8.8)
    const grid = (f: Face, u0: number, u1: number) => {
      const P = (u: number, y: number, d: number) => fp(f, u, y, d);
      B.geo(glassM[0], new THREE.PlaneGeometry(u1 - u0, 6.6), ...P((u0 + u1) / 2, 6.9, 0.01), { ry: f.ry, su: (u1 - u0) / 3, sv: 3.3 });
      for (let u = u0; u <= u1 + 0.01; u += 1.2) B.box(rustFrame, 0.09, 6.6, 0.1, ...P(u, 3.6, 0.04), { flat: true, ry: f.ry });
      for (let y = 3.6; y <= 10.3; y += 1.1) B.box(rustFrame, u1 - u0, 0.09, 0.12, ...P((u0 + u1) / 2, y, 0.05), { flat: true, ry: f.ry });
    };
    grid({ ox: 6.3, oz: 0, ry: -PI / 2 }, zS + 0.3, 26);
    grid({ ox: 0, oz: zS + 0.3, ry: PI }, -19.5, -6.3);
    // red & white striped top floors
    B.blk(redPaint, 6.1, 30, 10.5, 11.4, zS + 0.1, 30, 2);
    B.blk(panelW, 6.3, 30, 11.4, 13.2, zS + 0.3, 30, 2.4);
    B.blk(redPaint, 6.1, 30, 13.2, 13.7, zS + 0.1, 30, 2);
    // ground floor shutters on the street face; yard-side wall with AC units and ducts
    facade(E, zS, 26, 10, { wall: panelD, shutter: 1, win: "none", floors: 0, band: concrete, groundH: 3.4, cap: false });
    facade({ ox: 0, oz: zS, ry: PI }, -18.5, -6, 10, { wall: panelD, win: "none", floors: 0, band: concrete, groundH: 3.4, duct: 2, cap: false });
    // octopus climbing the corner + yellow box sign on a grated shelf
    within(5.55, 4.9, 10.6, -PI / 2, 1.25, () => octopus("wall"));
    B.box(steelDark, 1.2, 0.08, 2.4, 5.7, 3.45, 10.6, { flat: true });
    for (const z of [9.6, 11.6]) B.rod(steelDark, 0.03, [5.1, 3.5, z], [6.3, 5.0, z], 6);
    B.box(sText("takoyaki", "たこ焼", "#f2c230", "#b3101a", { worn: 0.4, border: "#b3101a" }, 0.1), 0.9, 0.9, 1.6, 5.6, 3.55, 12.9, { flat: true });
    // usagi drug vertical sign + round letter signs
    const vs = (z: number, y0: number, w: number, h: number, m: Mat) => {
      B.box(steelDark, w + 0.06, h + 0.06, 0.14, 6 - (w / 2 + 0.3), y0 - 0.03, z, { flat: true });
      B.geo(m, new THREE.PlaneGeometry(w, h), 6 - (w / 2 + 0.3), y0 + h / 2, z + 0.072, {});
      B.geo(m, new THREE.PlaneGeometry(w, h), 6 - (w / 2 + 0.3), y0 + h / 2, z - 0.072, { ry: PI });
    };
    vs(14.5, 4.0, 0.9, 4.2, sUsagi);
    for (let i = 0; i < 4; i++) {
      const y = 4.4 + i * 1.05, z = 16.2;
      B.cyl(yellowEye, 0.45, 0.45, 0.16, 5.3, y - 0.08, z, { seg: 20, rx: PI / 2 });
      B.geo(sRound[i], new THREE.CircleGeometry(0.36, 20), 5.3, y, z + 0.085, {});
      B.geo(sRound[i], new THREE.CircleGeometry(0.36, 20), 5.3, y, z - 0.085, { ry: PI });
    }
    B.rod(steelDark, 0.03, [5.3, 3.9, 16.2], [5.3, 8.6, 16.2], 6);
    B.rod(steelDark, 0.03, [5.3, 8.4, 16.2], [6.3, 8.4, 16.2], 6);
    // small pufferfish lanterns along the street face
    for (const z of [18.5, 20.5, 22.5]) within(5.6, 3.1, z, PI * 0.9, 1, () => { pufferfish(0.38); B.rod(wireM, 0.008, [0, 0.3, 0], [0, 0.8, 0], 3); });
    // the big pufferfish lantern hanging at the yard corner
    B.box(steelDark, 0.1, 0.1, 1.9, 6.9, 6.4, 7.8, { flat: true });
    B.rod(wireM, 0.01, [6.9, 6.4, 7.2], [6.9, 5.3, 7.2], 3);
    within(6.9, 4.6, 7.2, -PI / 2 - 0.35, 1, () => pufferfish(1.0));
    k.room("Octopus Corner", 0, 6, 8.5, 20);
  }

  // ===== EAST YARD (x 6 → 19, z -2.2 → 8.5) =====
  {
    // back low wall with pipe stack; the van and far buildings behind it
    B.blk(concrete, 18.6, 19.4, 0, 1.7, -2.2, 8.5, 2);
    B.blk(concLight, 18.5, 19.5, 1.7, 1.8, -2.2, 8.5, 2, false);
    // culvert pipe stack (honeycomb of open pipes)
    const pipeX = 17.7;
    for (let row = 0; row < 7; row++) for (let c = 0; c < 8 - (row % 2); c++) {
      const y = 0.15 + row * 0.25, z = 1.0 + c * 0.29 + (row % 2) * 0.145;
      B.cyl(pipeConc, 0.14, 0.14, 1.4, pipeX, y - 0.7, z, { seg: 14, open: true, rz: PI / 2 });
      B.cyl(pipeIn, 0.12, 0.12, 1.38, pipeX, y - 0.69, z, { seg: 12, open: true, rz: PI / 2 });
    }
    k.collider(pipeX - 0.72, pipeX + 0.72, 0.85, 3.35, 0, 1.9, true);
    keiVan(21.2, 5.6, PI / 2 + 0.3);
    B.blk(panelW, 20.5, 40, 0, 12, -10, -2.2, 2.4, false);
    B.blk(panelG, 22.5, 40, 0, 9, -2.2, 8.5, 2.4, false);
    facade({ ox: 22.5, oz: 0, ry: -PI / 2 }, -2.2, 8.5, 9, { wall: panelG, win: "strip", ac: 0.4, glass: 1, shutter: 2 });
    // green kei truck with cargo (fire extinguishers, gas bottle, bag, bottles)
    keiTruck(9.9, 6.2, PI, truckGreen, () => {
      extinguisher(-0.2, 0.68, 0.35); extinguisher(-0.4, 0.68, 0.45); extinguisher(-0.1, 0.68, 0.5);
      gasCyl(-0.9, 0.68, 0.3, gasWhite, 0.55);
      bag(-1.1, 0.68, -0.3, 0.3);
      B.box(yellowPlastic, 0.4, 0.3, 0.3, 0.3, 0.68, -0.4, {});
    });
    // yellow tank beside the truck (as in the real map)
    B.cyl(yellowPlastic, 0.35, 0.35, 0.55, 7.8, 0, 4.9, { seg: 18 });
    B.cyl(blackSteel, 0.12, 0.12, 0.06, 7.8, 0.55, 4.9, { seg: 12 });
    k.collider(7.45, 8.15, 4.55, 5.25, 0, 0.61, true);
    // drums on a pallet, beer crates, fallen drum
    pallet(16.6, 0, 6.9, 0, 1.3, 1.1);
    for (const [x, z, m] of [[16.25, 6.65, drumBlue], [16.9, 7.15, drumGrey]] as const) { B.cyl(m, 0.29, 0.29, 0.88, x, 0.13, z, { seg: 20, su: 2 }); B.cyl(steelDark, 0.27, 0.27, 0.01, x, 1.01, z, { seg: 16 }); }
    k.collider(15.95, 17.25, 6.35, 7.45, 0, 1.02, true);
    beerCrate(15.3, 0, 7.6, 0, crateRed, crateRedPlain); beerCrate(15.3, 0.3, 7.6, 0.05, crateRed, crateRedPlain); beerCrate(15.3, 0.6, 7.6, -0.05, crateRed, crateRedPlain);
    k.collider(15.05, 15.55, 7.4, 7.8, 0, 0.9, true);
    drum(14.2, 6.9, drumGrey); drum(14.2, 7.6, drumGrey);
    drum(15.1, 5.0, drumGrey, true, 0.6);
    woodenCrate(17.8, 0, 4.9, 0.95, 0.1);
    B.box(steelDark, 1.4, 0.05, 0.05, 16.2, 0.03, 4.0, { ry: 0.5, flat: true });
    drum(18.0, 3.8, drumGreen);
    // chairs + lumber with a cone on top (south side)
    chair(13.2, -1.2, 0.1); chair(13.8, -1.25, -0.1);
    lumberStack(16.4, -1.05, 0, 2.6, 5, 5);
    cone(16.6, 0.28, -1.05, 0.3);
    cone(18.0, 0, 0.4);
    // pole with a bench, lamp, cardboard sheets
    yardPoleTop = utilityPole(11.6, 2.6, 9.5);
    octBench(11.6, 2.6);
    streetLamp(8.5, 0.0, 4.2);
    cardSheet(9.5, 1.0, 1.4, 1.0, 0.3); cardSheet(13.8, 3.9, 1.6, 0.3, 0.6); cardSheet(11.5, 5.0, 1.0, 0.8, 1.2);
    // yard-side (south) wall: E2 north face with AC stacks and ducts
    const S: Face = { ox: 0, oz: -2.2, ry: 0 };
    B.blk(panelW, 6, 20.5, 0, 8.5, -5.0, -2.2, 2.4);
    facade(S, 6, 18.5, 8.5, { wall: panelW, win: "punched", ac: 0.6, glass: 0, duct: 2, groundH: 3.3 });
    for (const [x, y] of [[9.0, 0], [9.0, 0.62], [9.85, 0]] as const) acUnit(x, y, -1.95, 0, true);
    B.wire(wireM, yardPoleTop, [6.3, 8.4, 8.8], 0.5);
    B.wire(wireM, yardPoleTop, [18.5, 7.5, -2.2], 0.5);
    k.room("Service Yard", 6, 19, -2.2, 8.5);
  }

  // ===== EAST 2/3: courtyard, nook and the south building =====
  {
    // small street face of E2 between yard and courtyard
    facade(E, -5, -2.2, 8.5, { wall: panelW, shutter: 0, bays: 1, win: "punched", ac: 0.5 });
    // south building (z -30 → -12.7)
    building(E, -30, -12.7, 24, 11, { wall: panelG, shutter: 2, win: "strip", ac: 0.4, glass: 1, duct: 1 });
    // courtyard walls: white brick
    B.blk(whiteBrick, 18.6, 20, 0, 7.5, -12.7, -4.8, 1.6);
    B.blk(concLight, 14.6, 19, 0, 7.5, -12.7, -10.6, 2.4); // nook corner block
    B.geo(whiteBrick, new THREE.PlaneGeometry(12.6, 5.5), 12.3, 2.75, -5.01, { ry: PI, su: 12.6 / 1.6, sv: 5.5 / 1.6 });
    B.geo(whiteBrick, new THREE.PlaneGeometry(8.6, 7.5), 10.3, 3.75, -12.69, { su: 8.6 / 1.6, sv: 7.5 / 1.6 });
    // barred window + white column on the south wall
    B.box(blackSteel, 1.3, 1.1, 0.1, 9.0, 2.3, -12.65, { flat: true });
    B.geo(darkGlass, new THREE.PlaneGeometry(1.2, 1.0), 9.0, 2.85, -12.59);
    for (const dx of [-0.3, 0, 0.3]) B.box(blackSteel, 0.04, 1.0, 0.04, 9.0 + dx, 2.35, -12.57, { flat: true });
    B.box(blackSteel, 1.2, 0.04, 0.04, 9.0, 2.83, -12.57, { flat: true });
    B.cyl(concLight, 0.55, 0.55, 7.5, 11.6, 0, -12.55, { seg: 8, su: 2 });
    for (const y of [1.2, 2.4, 3.6]) B.geo(steelDark, new THREE.TorusGeometry(0.56, 0.015, 3, 8), 11.6, y, -12.55, { rx: PI / 2, rz: PI / 8 });
    k.collider(11.05, 12.15, -13, -12.0, 0, 7.5, false);
    ductPath([[12.9, 0.3, -12.45], [12.9, 3.5, -12.45], [13.5, 4.2, -12.35], [13.5, 7.4, -12.45]], 0.14);
    ductPath([[18.4, 0.3, -5.3], [18.3, 2.5, -5.3], [17.6, 3.6, -5.3], [17.6, 5.5, -5.3]], 0.14);
    // courtyard floor dressing: kegs on a pallet with a crate and beer crates
    pallet(9.6, 0, -8.6, 0.05, 1.5, 1.2);
    k.collider(8.85, 10.35, -9.2, -8.0, 0, 0.13, true);
    keg(9.15, 0.125, -8.95, kegBlue); keg(9.6, 0.125, -8.3, kegSteel); keg(9.25, 0.125, -8.35, kegSteel);
    woodenCrate(10.1, 0.125, -8.75, 0.55, 0.1, false);
    beerCrate(10.1, 0.675, -8.75, 0.15, crateRed, crateRedPlain); beerCrate(10.15, 0.975, -8.8, 0.25, crateRed, crateRedPlain);
    beerCrate(10.35, 0.675, -8.35, -0.2, crateRed, crateRedPlain);
    k.collider(9.8, 10.55, -9.1, -8.1, 0, 1.28, true);
    cardSheet(8.3, -9.8, 1.0, 1.4, 0.3); cardSheet(11.5, -7.2, 1.1, 0.8, 0.6); cardSheet(13.6, -10.9, 1.2, 1.0, 0.2);
    // fallen octopuses
    within(7.6, 0, -10.6, 0.6, 0.8, () => octopus("ground", 1.25));
    k.collider(6.7, 8.8, -11.6, -9.6, 0, 0.9, true);
    within(12.5, 0, -6.2, 2.4, 0.5, () => octopus("ground", 1.3));
    k.collider(11.9, 13.1, -6.8, -5.6, 0, 0.5, true);
    // trash corner
    bagPile(13.4, -11.8, 5, 1.0);
    blueBin(14.1, -11.9, true);
    bag(12.3, 0, -12.2, 0.3);
    // ----- nook (x 14.6 → 18.6, z -10.6 → -5): graffiti shutter, crates, cones, lumber, chairs, bins -----
    B.geo(shutterGraf, new THREE.PlaneGeometry(4.0, 3.0), 18.59, 1.5, -7.8, { ry: -PI / 2 });
    B.box(shutters[0], 0.35, 0.35, 4.1, 18.4, 3.0, -7.8, { flat: true });
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) beerCrate(18.15, i * 0.3, -9.9 + j * 0.5, PI / 2 + (rnd() - 0.5) * 0.1, crateRed, crateRedPlain);
    k.collider(17.95, 18.35, -10.15, -9.15, 0, 0.9, true);
    for (const [x, z] of [[16.4, -10.3], [16.4, -8.4], [18.3, -8.4], [16.2, -6.9]] as const) cone(x, 0, z);
    B.box(hazard, 0.05, 0.05, 1.9, 16.4, 0.55, -9.35, { flat: true });
    B.box(hazard, 1.9, 0.05, 0.05, 17.35, 0.55, -8.4, { flat: true });
    lumberStack(15.4, -5.6, 0, 2.2, 6, 5);
    cone(15.3, 0.32, -5.6);
    chair(14.9, -6.6, PI / 2); chair(14.9, -7.3, PI / 2);
    blueBin(17.9, -5.6, false);
    milkJug(17.3, -6.2, 0.4);
    bucket(18.1, 0, -6.6); bucket(18.12, 0.12, -6.62);
    bagPile(15.3, -9.9, 3, 0.7);
    cardSheet(16.8, -6.8, 1.3, 1.0, 0.1);
    k.room("Back Courtyard", 6, 14.6, -12.7, -5);
    k.room("Graffiti Nook", 14.6, 18.6, -10.6, -5);
  }

  // ===== street props =====
  {
    const p1 = utilityPole(-3.4, 12.2), p2 = utilityPole(3.4, 1.0), p3 = utilityPole(-3.4, -9.6), p4 = utilityPole(3.0, -26), p5 = utilityPole(-3, 30);
    octBench(-3.4, 12.2); octBench(3.4, 1.0); octBench(-3.4, -9.6);
    B.wire(wireM, p1, p2, 0.7); B.wire(wireM, p2, p3, 0.7); B.wire(wireM, p3, p4, 0.8); B.wire(wireM, p1, p5, 0.8);
    B.wire(wireM, [p1[0], p1[1] - 0.8, p1[2]], [p2[0], p2[1] - 0.8, p2[2]], 0.9); B.wire(wireM, [p2[0], p2[1] - 0.8, p2[2]], [p3[0], p3[1] - 0.8, p3[2]], 0.9);
    B.wire(wireM, p2, yardPoleTop, 0.6);
    B.wire(wireM, p1, [-6, 9.5, 16], 0.5); B.wire(wireM, p3, [-6, 11.5, -12], 0.5); B.wire(wireM, p2, [6.3, 8.4, -4], 0.6);
    for (const [x, z] of [[-5.2, 18], [5.2, 6.5], [-5.2, 3.2], [5.2, -8.5], [-5.2, -16.5], [5.2, -18.5], [-5.2, 28], [5.2, 34], [-5.2, -30], [5.2, 26], [5.2, -34], [-5.2, 40]] as const) streetLamp(x, z);
    // crates and beer crates by the drugstore (as in the real shot)
    woodenCrate(-4.6, 0, -1.0, 0.85, 0.35);
    beerCrate(-4.6, 0.85, -1.0, 0.5, crateCream, crateCreamPlain); beerCrate(-4.55, 1.15, -0.95, 0.2, crateCream, crateCreamPlain);
    beerCrate(-3.3, 0, -1.6, 0.9, crateRed, crateRedPlain);
    k.collider(-3.55, -3.05, -1.9, -1.3, 0, 0.3, true);
    woodenCrate(-5.3, 0, 1.3, 0.9, -0.1);
    cardSheet(-1.6, 2.4, 1.6, 1.2, 0.35); cardSheet(1.2, -3.5, 1.3, 0.9, 1.1); cardSheet(2.2, 12.5, 1.5, 1.0, 2.3); cardSheet(-1.2, -14.5, 1.1, 0.8, 0.5); cardSheet(3.2, 18.8, 1.3, 1.1, 0.3);
    bag(-4.4, 0, 3.3, 0.36);
    bagPile(5.2, -3.0, 3, 0.7);
    for (const [x, z] of [[4.9, 7.8], [4.4, 8.1], [-5.3, 5.4]] as const) cone(x, 0, z);
    cardBox(4.8, 0, 13.6, 0.6, 0.5, 0.5, 0.3);
    gasCyl(5.3, 0, -10.5);
    blueBin(-5.3, -2.9);
    drum(5.3, -6.9, drumGrey); drum(5.3, -6.2, drumBlue);
    B.sphere(straw, 0.26, -2.4, 0.2, -2.3, { ws: 12, hs: 8, s: [1, 0.8, 1] });
    // the 大 lantern scaffold against the south building
    const sx = 5.1, sz = -14.2, lv = 1.3;
    for (const dx of [-0.65, 0.65]) for (const dz of [-0.65, 0.65]) B.box(blackSteel, 0.06, 5.4, 0.06, sx + dx, 0, sz + dz, { flat: true });
    for (let i = 0; i <= 4; i++) {
      const y = i * lv + 0.1;
      for (const dz of [-0.65, 0.65]) B.box(blackSteel, 1.36, 0.05, 0.05, sx, y, sz + dz, { flat: true });
      for (const dx of [-0.65, 0.65]) B.box(blackSteel, 0.05, 0.05, 1.36, sx + dx, y, sz, { flat: true });
      if (i < 4) {
        const yc = y + lv / 2 + 0.02;
        B.cyl(paper, 0.6, 0.6, 1.0, sx, yc - 0.5, sz, { seg: 8, open: true, rx: PI / 2 });
        for (const s of [-1, 1]) B.geo(daiFace, new THREE.CircleGeometry(0.6, 8, PI / 8), sx, yc, sz + s * 0.5, { ry: s === 1 ? 0 : PI });
      }
    }
    B.box(blackSteel, 1.4, 0.04, 1.4, sx, 5.36, sz, { flat: true });
    k.collider(sx - 0.7, sx + 0.7, sz - 0.7, sz + 0.7, 0, 5.4, true);
    // broken cardboard leaning next to the scaffold
    for (let i = 0; i < 4; i++) B.box(cardboard, 0.02, 1.4 + rnd() * 0.4, 1.0, 5.75 - i * 0.06, 0, -12.2 + i * 0.12, { ry: 0.1 * i, rz: 0.25 + i * 0.05, flat: true, su: 1, sv: 1 });
    k.collider(5.2, 5.95, -12.8, -11.5, 0, 1.4, true);
    k.room("Dotonbori Street", -6, 6, -4, 20);
  }

  // ===== street continues beyond the play area (vista) =====
  {
    building(W, -60, -26, 12, 13, { wall: panelG, shutter: 1, win: "strip", ac: 0.2, glass: 1 }, false);
    building(W, 26, 60, 12, 14, { wall: panelW, shutter: 0, win: "punched", ac: 0.2 }, false);
    building(E, 26, 60, 12, 12, { wall: panelW, shutter: 2, win: "strip", ac: 0.2, glass: 0 }, false);
    building(E, -60, -30, 12, 15, { wall: panelD, shutter: 1, win: "punched", ac: 0.2, glass: 1 }, false);
    B.blk(towerM[0], -30, 30, 0, 22, 60, 66, 8, false);
    B.blk(towerM[1], -30, 30, 0, 20, -66, -60, 8, false);
    for (const [z, m, dir] of [[32, sNeko, 1], [38, sMenzei, -1], [-34, sNiku, 1], [-40, sUsagi, -1], [44, sKusuri, 1]] as const) {
      const x0 = dir === 1 ? -6 : 6, xc = x0 + dir * 0.75;
      B.box(steelDark, 1.0, 3.6, 0.14, xc, 3.6, z, { flat: true });
      B.geo(m, new THREE.PlaneGeometry(0.95, 3.5), xc, 5.4, z + 0.075, {});
      B.geo(m, new THREE.PlaneGeometry(0.95, 3.5), xc, 5.4, z - 0.075, { ry: PI });
    }
    // roof clutter: water tanks and antennas
    for (const [x, y, z] of [[-12, 10.5, 14], [-14, 16, -10], [14, 13.7, 16], [-12, 8.5, 2]] as const) {
      B.cyl(concLight, 0.8, 0.8, 1.5, x, y + 0.7, z, { seg: 16 });
      for (const [a, b] of [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]]) B.rod(steel, 0.04, [x + a, y, z + b], [x + a, y + 0.7, z + b], 5);
    }
  }

  B.flush();

  // ---------------- spawns & lighting ----------------
  const hiders: THREE.Vector3[] = [];
  for (let i = 0; i < 24; i++) hiders.push(new THREE.Vector3(-2.3 + (i % 6) * 0.95, 0, 4.2 + Math.floor(i / 6) * 1.1));
  const hunters: THREE.Vector3[] = [];
  for (let i = 0; i < 9; i++) hunters.push(new THREE.Vector3(-1.2 + (i % 3) * 1.2, 0, -18.2 + Math.floor(i / 3) * 1.1));

  return k.finish({
    id: "osaka", name: "Osaka",
    bounds: { minX: X0, maxX: X1, minZ: Z0, maxZ: Z1 },
    hunterSpawns: hunters, hiderSpawns: hiders,
    preview: { pos: [3.8, 2.0, -3.5], look: [-3.5, 5.2, 13], fov: 64 },
    lighting: {
      sky: "#bcd3e6",
      hemi: ["#e6eef6", "#6a6862", 0.55],
      sun: { color: "#fff4e2", int: 2.6, pos: [6, 30, -14] },
      fog: ["#c9d6e0", 40, 140],
      points: [
        { pos: [-7.8, 2.8, 1], color: "#ffe6c0", int: 6, dist: 7 },
        { pos: [-5.5, 3.2, -9], color: "#ffb070", int: 4, dist: 6 },
        { pos: [16.5, 3, -7.8], color: "#d8ffe0", int: 4, dist: 6 },
      ],
      exposure: 1.0,
      hdri: "city",
      env: 0.75,
      hdriBackground: 0.04,
    },
  });
}
