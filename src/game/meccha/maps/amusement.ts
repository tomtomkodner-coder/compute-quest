// Amusement Park: "Chameleon Land", a bright, colourful theme park on a sunny day.
// Hunters enter from the south forecourt through the big striped entrance arch flanked by two ticket booths. A red-brick
// avenue with festoon lights, benches and a balloon vendor leads north to a round fountain plaza (flowing water).
// West: a carousel with 16 galloping horses under a red/white striped canopy, a game alley along the south fence
// (balloon darts, a shooting gallery with plush prizes, ring toss) and a high striker. East: a teacup ride around a giant
// teapot, food stands (popcorn cart, cotton candy kiosk, ice cream kiosk with a giant cone) and picnic tables.
// North: a 20 m Ferris wheel with 12 climbable cabins, a roller-coaster section on red supports with a station and a
// three-car train (north-east), and a covered bumper-car arena on a glossy steel floor (north-west).
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import * as T from "../textures";
import * as A from "./tex/amusement";
import { Kit, type Mat, type World } from "./kit";

type G = THREE.BufferGeometry;
type V3t = [number, number, number];
const V3 = THREE.Vector3;
const PI = Math.PI;

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

/** Collects geometry per material and merges it into one mesh per material (few draw calls). */
class Batch {
  private lists = new Map<Mat, G[]>();
  private flags = new Map<Mat, { noShadow?: boolean }>();
  private rnd = A.rng(77);
  /** local→world transform applied to everything (props built in their own frame) */
  xf: THREE.Matrix4 | null = null;
  constructor(private k: Kit) {}
  opt(m: Mat, f: { noShadow?: boolean }) { this.flags.set(m, f); }
  at(x: number, y: number, z: number, ry = 0) {
    this.xf = new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new V3(1, 1, 1));
  }
  /** point in the current local frame → world */
  pt(x: number, y: number, z: number): V3t {
    const v = new V3(x, y, z);
    if (this.xf) v.applyMatrix4(this.xf);
    return [v.x, v.y, v.z];
  }
  geo(m: Mat, g: G, x: number, y: number, z: number, o: BO = {}) {
    if (o.uv && !o.world) boxUV(g, o.uv, this.rnd(), this.rnd());
    if (o.su || o.sv) scaleUV(g, o.su ?? 1, o.sv ?? 1);
    const e = new THREE.Euler(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0, "YXZ");
    const sc = typeof o.s === "number" ? new V3(o.s, o.s, o.s) : o.s ? new V3(...o.s) : new V3(1, 1, 1);
    g.applyMatrix4(new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(e), sc));
    if (this.xf) g.applyMatrix4(this.xf);
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
  cyl(m: Mat, rt: number, rb: number, h: number, x: number, y: number, z: number, o: BO & { open?: boolean } = {}) {
    return this.geo(m, new THREE.CylinderGeometry(rt, rb, h, o.seg ?? 16, 1, o.open), x, y + h / 2, z, o);
  }
  lathe(m: Mat, pts: [number, number][], x: number, y: number, z: number, o: BO & { phi?: number } = {}) {
    return this.geo(m, new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(Math.max(0, r), h)), o.seg ?? 20), x, y, z, o);
  }
  cone(m: Mat, r: number, h: number, x: number, y: number, z: number, o: BO = {}) {
    return this.geo(m, new THREE.ConeGeometry(r, h, o.seg ?? 16), x, y + h / 2, z, o);
  }
  sphere(m: Mat, r: number, x: number, y: number, z: number, o: BO & { ws?: number; hs?: number } = {}) {
    return this.geo(m, new THREE.SphereGeometry(r, o.ws ?? 14, o.hs ?? 10), x, y, z, o);
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
  wire(m: Mat, a: V3t, b: V3t, sag = 0.6, r = 0.014) {
    const pts: V3t[] = [];
    for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * PI) * sag, a[2] + (b[2] - a[2]) * t]); }
    const c = new THREE.CatmullRomCurve3(pts.map((p) => new V3(...p)));
    return this.geo(m, new THREE.TubeGeometry(c, 16, r, 3), 0, 0, 0);
  }
  /** collider given in the current local frame (AABB of the transformed box) */
  col(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, stand = true) {
    let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity, e = Infinity, f = -Infinity;
    for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) {
      const p = this.pt(x, y, z);
      a = Math.min(a, p[0]); b = Math.max(b, p[0]); c = Math.min(c, p[1]); d = Math.max(d, p[1]); e = Math.min(e, p[2]); f = Math.max(f, p[2]);
    }
    this.k.collider(a, b, e, f, c, d, stand);
  }
  flush() {
    for (const [m, l] of this.lists) if (l.length) this.k.merged(l, m, { noShadow: this.flags.get(m)?.noShadow });
    this.lists.clear();
  }
}

type Inst = { pos: V3t; rotY?: number; rotX?: number; rotZ?: number; scale?: V3t; color?: string };

export function buildAmusement(): World {
  const k = new Kit(6, 3);
  const B = new Batch(k);
  const rnd = A.rng(2024);
  const X0 = -27.5, X1 = 27.5, Z0 = -25.5, Z1 = 25.5;
  const tx = (key: string, f: () => T.PaintTex) => k.tex("am-" + key, f);
  type MO = Parameters<Kit["mat"]>[3];
  const M = (t: T.PaintTex | null, col: string, o: MO = {}, rep: [number, number] = [1, 1]) => k.mat(t, col, rep, o);
  const paint = (c: string, rough = 0.42, metal = 0.05) => M(null, c, { roughness: rough, metalness: metal });

  // ---------------- materials ----------------
  const pavers = M(tx("pav", A.amPavers), "#ffffff", { roughness: 0.85, bump: 0.6 });
  const brick = M(tx("brick", A.amBrick), "#e9d9cf", { roughness: 0.8, bump: 0.8 });
  const grassT = tx("grass", A.amGrass);
  const grass = M(grassT, "#ffffff", { roughness: 0.95, bump: 0.5 });
  const soil = M(tx("soil", A.amSoil), "#ffffff", { roughness: 1, bump: 0.6 });
  const stone = M(tx("stone", () => A.amStone()), "#ffffff", { roughness: 0.75, bump: 0.5 });
  const stoneW = M(tx("stone", () => A.amStone()), "#fff8ee", { roughness: 0.55, bump: 0.35 });
  const concrete = M(tx("conc", () => T.concrete("#a7a39a", 6)), "#ffffff", { roughness: 0.9, bump: 0.4 });
  const leaves = M(tx("leaves", T.leaves), "#9fcf7a", { roughness: 0.9, bump: 0.8 });
  const leavesDark = M(tx("leaves", T.leaves), "#6f9a55", { roughness: 0.9, bump: 0.8 });
  const bark = M(tx("bark", () => T.wood("#5a4030", "#3a2618", 3)), "#ffffff", { roughness: 0.95, bump: 1 });
  const woodSlat = M(tx("slat", () => T.wood("#b07a45", "#7a4e26", 8)), "#ffffff", { roughness: 0.6, bump: 0.6 });
  const boardsT = tx("boards", () => A.amBoards("#f2f0ec", 11));
  const woodDeck = M(boardsT, "#b98a58", { roughness: 0.7, bump: 0.7 });
  const water = M(tx("water", A.amWater), "#ffffff", { roughness: 0.06, metalness: 0.1, bump: 0.5 }, [3, 3]);
  water.m.userData.flow = [0.006, 0.02];
  const fall = M(tx("fall", A.amFall), "#e8f6ff", { transparent: true, roughness: 0.05, bump: 0 });
  fall.m.alphaTest = 0;
  fall.m.depthWrite = false;
  fall.m.userData.flow = [0, 0.5];
  fall.m.opacity = 0.85;
  const white = paint("#f6f2ea", 0.35, 0.1);
  const whiteMetal = M(null, "#f1eee8", { roughness: 0.35, metalness: 0.45 });
  const red = paint("#d7262f", 0.35);
  const redDeep = paint("#a3121c", 0.4);
  const yellow = paint("#f7c326", 0.38);
  const blue = paint("#1f6fd1", 0.35);
  const navy = paint("#1d3a78", 0.4);
  const green = paint("#2aa35a", 0.4);
  const teal = paint("#1fb5ad", 0.38);
  const pink = paint("#f47aa6", 0.35);
  const purple = paint("#7b4bc4", 0.38);
  const orange = paint("#f47b20", 0.38);
  const cream = paint("#fbf1dc", 0.4);
  const gold = M(null, "#e0ae3c", { metalness: 0.9, roughness: 0.28 });
  const brass = M(null, "#e9c15a", { metalness: 1, roughness: 0.2 });
  const steel = M(null, "#a4abb2", { metalness: 0.85, roughness: 0.32 });
  const steelDark = M(null, "#4a5057", { metalness: 0.7, roughness: 0.45 });
  const iron = M(null, "#22262a", { metalness: 0.6, roughness: 0.5 });
  const ironGreen = M(null, "#1e4a3a", { metalness: 0.55, roughness: 0.45 });
  const rubber = M(tx("rubber", A.amRubber), "#ffffff", { roughness: 0.8, bump: 0.4 });
  const glass = M(null, "#bfe3f2", { transparent: true, roughness: 0.05, metalness: 0.3 });
  glass.m.opacity = 0.35;
  glass.m.alphaTest = 0;
  glass.m.depthWrite = false;
  const darkInside = paint("#2a2622", 0.9);
  const bulbM = M(null, "#fff3c4", { roughness: 0.3, emissive: "#ffe39a", emissiveIntensity: 1.6 });
  const lampGlass = M(null, "#fff6dc", { roughness: 0.2, emissive: "#ffe7b0", emissiveIntensity: 0.9 });
  const glossy = M(null, "#ffffff", { roughness: 0.22, metalness: 0.05 }); // instanced colours
  const matte = M(null, "#ffffff", { roughness: 0.75 });
  const plushM = M(null, "#ffffff", { roughness: 0.95 });

  const stripeRW = M(tx("srw", () => A.amStripe("#e0262f", "#fbf6ee", 4, 1)), "#ffffff", { roughness: 0.7, bump: 0 });
  const stripeBW = M(tx("sbw", () => A.amStripe("#2266cc", "#fbf6ee", 4, 2)), "#ffffff", { roughness: 0.7, bump: 0 });
  const stripeYR = M(tx("syr", () => A.amStripe("#f7c326", "#e0262f", 4, 3)), "#ffffff", { roughness: 0.7, bump: 0 });
  const stripePW = M(tx("spw", () => A.amStripe("#f47aa6", "#fbf6ee", 4, 4)), "#ffffff", { roughness: 0.7, bump: 0 });
  const stripeGW = M(tx("sgw", () => A.amStripe("#2aa35a", "#fbf6ee", 4, 5)), "#ffffff", { roughness: 0.7, bump: 0 });
  const stripeTY = M(tx("sty", () => A.amStripe("#1fb5ad", "#f7c326", 4, 6)), "#ffffff", { roughness: 0.7, bump: 0 });
  const canopyRW = M(tx("crw", () => A.amStripe("#e0262f", "#fbf6ee", 1, 7)), "#ffffff", { roughness: 0.65, bump: 0 }, [16, 1]);
  const valRW = M(tx("vrw", () => A.amValance("#e0262f", "#fbf6ee")), "#ffffff", { transparent: true, roughness: 0.7, bump: 0 });
  const valBY = M(tx("vby", () => A.amValance("#2266cc", "#f7c326")), "#ffffff", { transparent: true, roughness: 0.7, bump: 0 });
  const valPW = M(tx("vpw", () => A.amValance("#f47aa6", "#fbf6ee")), "#ffffff", { transparent: true, roughness: 0.7, bump: 0 });
  const valGY = M(tx("vgy", () => A.amValance("#2aa35a", "#fbf6ee")), "#ffffff", { transparent: true, roughness: 0.7, bump: 0 });
  const valTY = M(tx("vty", () => A.amValance("#1fb5ad", "#f7c326")), "#ffffff", { transparent: true, roughness: 0.7, bump: 0 });
  const boardsTeal = M(boardsT, "#2fb3ab", { roughness: 0.7, bump: 0.5 });
  const boardsYel = M(boardsT, "#f5c62e", { roughness: 0.7, bump: 0.5 });
  const boardsPur = M(boardsT, "#8457cc", { roughness: 0.7, bump: 0.5 });
  const boardsRed = M(boardsT, "#d93c38", { roughness: 0.7, bump: 0.5 });
  const boardsWhite = M(boardsT, "#f4efe4", { roughness: 0.7, bump: 0.5 });
  const boardsPink = M(boardsT, "#f592b8", { roughness: 0.7, bump: 0.5 });
  const steelFloor = M(tx("sfloor", A.amSteelFloor), "#ffffff", { roughness: 0.16, metalness: 0.65, bump: 0.35 });
  const popcorn = M(tx("popcorn", A.amPopcorn), "#ffffff", { roughness: 0.85, bump: 0.9 });
  const fluffPink = M(tx("fluffp", () => A.amFluff("#f7a8cc", 4)), "#ffffff", { roughness: 0.95, bump: 0 });
  const fluffBlue = M(tx("fluffb", () => A.amFluff("#9fd4f5", 5)), "#ffffff", { roughness: 0.95, bump: 0 });
  const mirror = M(tx("mirror", A.amMirrorPanel), "#ffffff", { roughness: 0.2, metalness: 0.4, bump: 0 }, [4, 1]);
  const galleryBack = M(tx("gback", A.amGalleryBack), "#ffffff", { roughness: 0.6, bump: 0 });
  const target = M(tx("target", A.amTarget), "#ffffff", { roughness: 0.5, bump: 0 });
  const tiles = M(tx("ptiles", A.amPastelTiles), "#ffffff", { roughness: 0.3, bump: 0.3 }, [3, 3]);
  const cupPaint = [
    M(tx("cup1", () => A.amCupPaint("#f47aa6", "#e0262f")), "#ffffff", { roughness: 0.2, bump: 0 }),
    M(tx("cup2", () => A.amCupPaint("#46a4e8", "#f7c326")), "#ffffff", { roughness: 0.2, bump: 0 }),
    M(tx("cup3", () => A.amCupPaint("#7fcf6a", "#f47b20")), "#ffffff", { roughness: 0.2, bump: 0 }),
    M(tx("cup4", () => A.amCupPaint("#b58ae0", "#ffffff")), "#ffffff", { roughness: 0.2, bump: 0 }),
    M(tx("cup5", () => A.amCupPaint("#f7c326", "#1f6fd1")), "#ffffff", { roughness: 0.2, bump: 0 }),
  ];
  const porcelain = paint("#fbf8f2", 0.22);
  const wafer = M(tx("wafer", () => T.checker("#d9a05a", "#c68845", 8)), "#ffffff", { roughness: 0.8, bump: 0.9 });
  const parkMap = M(tx("pmap", A.amParkMap), "#ffffff", { roughness: 0.5, bump: 0 });
  const lattice = M(tx("lattice", A.amLattice), "#39424a", { transparent: true, metalness: 0.6, roughness: 0.4, bump: 0 }, [12, 10]);
  const sign = (key: string, text: string, bg: string, fg: string, sub = "", w = 512, h = 128) =>
    M(tx("sg-" + key, () => A.amSign(text, bg, fg, w, h, true, sub)), "#ffffff", { roughness: 0.45, bump: 0, emissive: "#ffffff", emissiveIntensity: 0.12 });
  const sEntrance = sign("ent", "CHAMELEON LAND", "#d7262f", "#ffe066", "AMUSEMENT PARK", 512, 160);
  const sTickets = sign("tix", "TICKETS", "#1f6fd1", "#ffffff", "", 256, 80);
  const sPop = sign("pop", "POP POP CORN", "#d7262f", "#fff3c4", "", 256, 80);
  const sCotton = sign("cot", "FLUFFY CLOUD", "#f47aa6", "#ffffff", "COTTON CANDY", 384, 128);
  const sIce = sign("ice", "CHILLY SCOOPS", "#1fb5ad", "#fff8e0", "ICE CREAM", 384, 128);
  const sRing = sign("ring", "RING TOSS", "#7b4bc4", "#ffe066", "3 RINGS 1 PRIZE", 384, 128);
  const sShoot = sign("shoot", "SHOOTING STARS", "#1d3a78", "#ffe066", "HIT 5 WIN BIG", 384, 128);
  const sDarts = sign("darts", "POP-A-LOON", "#2aa35a", "#ffffff", "BALLOON DARTS", 384, 128);
  const sBumper = sign("bump", "BUMPY CARS", "#f47b20", "#ffffff", "", 512, 112);
  const sCups = sign("cups", "SPIN-A-CUP", "#f47aa6", "#ffffff", "", 384, 96);
  const sCoaster = sign("coast", "DRAGON LOOP", "#2aa35a", "#ffe066", "ROLLER COASTER", 512, 128);
  const sWheel = sign("wheel", "SKY WHEEL", "#1f6fd1", "#ffe066", "", 384, 96);
  const sStriker = sign("strike", "TEST YOUR MIGHT", "#d7262f", "#ffffff", "", 384, 96);
  const menuIce = M(tx("menuice", () => A.amMenu("SCOOPS", ["Vanilla", "Strawberry", "Choco", "Mint"])), "#ffffff", { roughness: 0.5, bump: 0, emissive: "#ffffff", emissiveIntensity: 0.1 });
  const menuCot = M(tx("menucot", () => A.amMenu("CANDY", ["Pink cloud", "Blue cloud", "Mix", "Apple"], "#3b1f2f")), "#ffffff", { roughness: 0.5, bump: 0, emissive: "#ffffff", emissiveIntensity: 0.1 });
  const menuTix = M(tx("menutix", () => A.amMenu("PRICES", ["1 Ride", "5 Rides", "Day Pass", "Family"], "#12305f")), "#ffffff", { roughness: 0.5, bump: 0, emissive: "#ffffff", emissiveIntensity: 0.1 });
  B.opt(bulbM, { noShadow: true });
  B.opt(glass, { noShadow: true });
  B.opt(water, { noShadow: true });
  B.opt(fall, { noShadow: true });

  // instanced collections
  const posts: Inst[] = [], finials: Inst[] = [], trunks: Inst[] = [], crowns: Inst[] = [];
  const bulbs: Inst[] = [], balloons: Inst[] = [], flowers: Inst[] = [], plush: Inst[] = [], pickets: Inst[] = [], flags: Inst[] = [], bottles: Inst[] = [];
  const balloonColors = ["#e63946", "#f7c326", "#2a9df4", "#43c46b", "#f47aa6", "#9b5de5", "#ff8c42", "#ffffff"];
  const pick = <X,>(a: X[]) => a[Math.floor(rnd() * a.length)];

  // ================= ground =================
  k.floor(-50, 50, -46, 46, grass, 4);
  const pave = (x1: number, x2: number, z1: number, z2: number, m: Mat, unit: number, y = 0.004) => {
    const g = new THREE.PlaneGeometry(x2 - x1, z2 - z1);
    g.rotateX(-PI / 2);
    B.geo(k.mat(m.ptex, `#${m.m.color.getHexString()}`, [(x2 - x1) / unit, (z2 - z1) / unit], { roughness: m.m.roughness, bump: m.m.userData.bump }), g, (x1 + x2) / 2, y, (z1 + z2) / 2);
  };
  pave(X0 - 0.5, X1 + 0.5, Z0 - 0.5, Z1 + 0.5, pavers, 3);
  pave(-3.6, 3.6, 7, Z1 + 0.5, brick, 2, 0.008);
  pave(-9, 9, 21.5, Z1 + 0.5, brick, 2, 0.008);
  {
    // round brick plaza around the fountain + curb ring
    const g = new THREE.CircleGeometry(8.5, 48);
    g.rotateX(-PI / 2);
    B.geo(k.mat(brick.ptex, "#e9d9cf", [8.5, 8.5], { roughness: 0.8, bump: 0.8 }), g, 0, 0.011, 2);
    const ring = new THREE.RingGeometry(8.5, 8.8, 48);
    ring.rotateX(-PI / 2);
    B.geo(stone, ring, 0, 0.014, 2);
  }
  // lawn inside the coaster loop and around the Ferris wheel base
  {
    const g = new THREE.CircleGeometry(1, 40);
    g.rotateX(-PI / 2);
    g.scale(6.2, 1, 7.6);
    B.geo(k.mat(grassT, "#ffffff", [3, 4], { roughness: 0.95, bump: 0.5 }), g, 19, 0.012, -14.5);
    const g2 = new THREE.PlaneGeometry(16, 10);
    g2.rotateX(-PI / 2);
    B.geo(k.mat(grassT, "#ffffff", [4, 2.5], { roughness: 0.95, bump: 0.5 }), g2, 0, 0.012, -19.5);
  }

  // ================= perimeter fence, hedge and trees (vista) =================
  const fenceLine = (a: [number, number], b: [number, number], h = 1.7, withCol = false) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const dx = (b[0] - a[0]) / len, dz = (b[1] - a[1]) / len;
    const ry = Math.atan2(-dz, dx);
    for (let d = 0; d <= len + 0.01; d += 2.5) {
      const x = a[0] + dx * d, z = a[1] + dz * d;
      posts.push({ pos: [x, (h + 0.15) / 2, z], rotY: ry, scale: [1, h + 0.15, 1] });
      finials.push({ pos: [x, h + 0.2, z] });
    }
    for (const y of [0.15, h - 0.12]) B.rod(ironGreen, 0.03, [a[0], y, a[1]], [b[0], y, b[1]], 5);
    for (let d = 0.1; d < len; d += 0.16) pickets.push({ pos: [a[0] + dx * d, h / 2, a[1] + dz * d], rotY: ry, scale: [1, h, 1] });
    if (withCol) k.collider(Math.min(a[0], b[0]) - 0.08, Math.max(a[0], b[0]) + 0.08, Math.min(a[1], b[1]) - 0.08, Math.max(a[1], b[1]) + 0.08, 0, h, false);
  };
  fenceLine([X0 - 0.3, Z0 - 0.3], [X1 + 0.3, Z0 - 0.3]);
  fenceLine([X0 - 0.3, Z1 + 0.3], [X1 + 0.3, Z1 + 0.3]);
  fenceLine([X0 - 0.3, Z0 - 0.3], [X0 - 0.3, Z1 + 0.3]);
  fenceLine([X1 + 0.3, Z0 - 0.3], [X1 + 0.3, Z1 + 0.3]);
  // hedges just outside
  B.box(leavesDark, 60, 2.2, 1.2, 0, 0, Z0 - 1.2, { flat: true, uv: 1.5, world: true });
  B.box(leavesDark, 60, 2.2, 1.2, 0, 0, Z1 + 1.2, { flat: true, uv: 1.5, world: true });
  B.box(leavesDark, 1.2, 2.2, 54, X0 - 1.2, 0, 0, { flat: true, uv: 1.5, world: true });
  B.box(leavesDark, 1.2, 2.2, 54, X1 + 1.2, 0, 0, { flat: true, uv: 1.5, world: true });
  const tree = (x: number, z: number, s: number) => {
    trunks.push({ pos: [x, 1.2 * s, z], scale: [s, s, s] });
    const col = rnd() < 0.5 ? "#ffffff" : "#b9cfa8";
    crowns.push({ pos: [x, 3.1 * s, z], scale: [1.5 * s, 1.28 * s, 1.5 * s], rotY: rnd() * 6, color: col });
    crowns.push({ pos: [x + 0.7 * s, 3.9 * s, z + 0.3 * s], scale: [1.05 * s, 1.05 * s, 1.05 * s], rotY: rnd() * 6, color: col });
    crowns.push({ pos: [x - 0.6 * s, 3.7 * s, z - 0.4 * s], scale: [s, s, s], rotY: rnd() * 6, color: col });
  };
  for (let x = -30; x <= 30; x += 4.2) { tree(x + rnd(), Z0 - 3.8 - rnd() * 2, 1.2 + rnd() * 0.5); tree(x + rnd(), Z1 + 3.8 + rnd() * 2, 1.1 + rnd() * 0.5); }
  for (let z = -22; z <= 22; z += 4.4) { tree(X0 - 3.8 - rnd() * 2, z + rnd(), 1.2 + rnd() * 0.5); tree(X1 + 3.8 + rnd() * 2, z + rnd(), 1.1 + rnd() * 0.5); }
  // skyline beyond the fence: circus tent (west) and a drop tower (north-east)
  {
    B.lathe(canopyRW, [[9, 0], [9, 4.5], [8.6, 5], [5, 8], [1.5, 10.5], [0.3, 11.5], [0, 11.6]], -41, 0, 6, { seg: 32 });
    B.cyl(yellow, 0.12, 0.12, 2.5, -41, 11.3, 6, { seg: 6 });
    B.box(red, 1.2, 0.7, 0.02, -40.4, 13.2, 6, { flat: true });
    B.cyl(steel, 0.9, 1.2, 30, 36, 0, -34, { seg: 16 });
    B.cyl(red, 2.6, 2.6, 1.2, 36, 9, -34, { seg: 24 });
    B.cyl(yellow, 1.6, 1.6, 1.4, 36, 30, -34, { seg: 16 });
    B.cone(red, 1.2, 2.5, 36, 31.4, -34);
  }

  // ================= street furniture helpers =================
  const bench = (x: number, z: number, facing: number) => {
    B.at(x, 0, z, facing);
    for (const sx of [-0.68, 0.68]) {
      B.box(iron, 0.07, 0.42, 0.5, sx, 0, 0.02, { flat: true });
      B.box(iron, 0.07, 0.5, 0.06, sx, 0.42, -0.24, { flat: true, rx: -0.12 });
      B.box(iron, 0.07, 0.06, 0.45, sx, 0.62, 0.05, { flat: true });
    }
    for (let i = 0; i < 4; i++) B.box(woodSlat, 1.75, 0.035, 0.1, 0, 0.42, -0.17 + i * 0.12, { uv: 0.8 });
    for (let i = 0; i < 3; i++) B.box(woodSlat, 1.75, 0.1, 0.035, 0, 0.55 + i * 0.13, -0.26 - i * 0.015, { uv: 0.8, rx: -0.12 });
    B.col(-0.9, 0.9, 0, 0.46, -0.2, 0.28, true);
    B.col(-0.9, 0.9, 0, 0.92, -0.33, -0.2, true);
    B.xf = null;
  };
  const bin = (x: number, z: number, m: Mat) => {
    B.lathe(m, [[0, 0], [0.26, 0], [0.3, 0.05], [0.3, 0.85], [0.33, 0.88], [0.33, 0.92], [0, 0.92]], x, 0, z, { seg: 18 });
    B.lathe(iron, [[0.34, 0], [0.34, 0.06], [0.2, 0.2], [0.1, 0.26], [0, 0.27]], x, 0.92, z, { seg: 18 });
    for (const y of [0.25, 0.6]) B.cyl(white, 0.305, 0.305, 0.05, x, y, z, { seg: 18, open: true });
    k.collider(x - 0.33, x + 0.33, z - 0.33, z + 0.33, 0, 1.18, true);
  };
  const lamp = (x: number, z: number, twin = true) => {
    B.lathe(ironGreen, [[0, 0], [0.22, 0], [0.22, 0.12], [0.14, 0.2], [0.12, 0.6], [0.08, 0.7], [0.06, 0.72], [0, 0.72]], x, 0, z, { seg: 12 });
    B.cyl(ironGreen, 0.05, 0.06, 3.2, x, 0.7, z, { seg: 8 });
    const lantern = (lx: number, lz: number, y: number) => {
      B.lathe(lampGlass, [[0, 0], [0.1, 0.02], [0.16, 0.18], [0.14, 0.35], [0, 0.38]], lx, y, lz, { seg: 12 });
      B.lathe(ironGreen, [[0.2, 0], [0.12, 0.1], [0.04, 0.18], [0, 0.26]], lx, y + 0.36, lz, { seg: 10 });
      B.cyl(ironGreen, 0.06, 0.04, 0.08, lx, y - 0.06, lz, { seg: 8 });
    };
    if (twin) {
      B.rod(ironGreen, 0.03, [x - 0.55, 3.55, z], [x + 0.55, 3.55, z], 6);
      B.tube(ironGreen, [[x - 0.5, 3.55, z], [x - 0.25, 3.35, z], [x, 3.45, z]], 0.02, { rs: 4 });
      B.tube(ironGreen, [[x + 0.5, 3.55, z], [x + 0.25, 3.35, z], [x, 3.45, z]], 0.02, { rs: 4 });
      lantern(x - 0.55, z, 3.2);
      lantern(x + 0.55, z, 3.2);
    }
    lantern(x, z, 3.9);
    k.collider(x - 0.18, x + 0.18, z - 0.18, z + 0.18, 0, 3.9, true);
  };
  const bed = (x: number, z: number, r: number) => {
    B.lathe(stone, [[r - 0.2, 0], [r, 0], [r + 0.03, 0.38], [r - 0.02, 0.42], [r - 0.22, 0.42], [r - 0.22, 0.3]], x, 0, z, { seg: 28 });
    B.cyl(soil, r - 0.2, r - 0.2, 0.33, x, 0, z, { seg: 28 });
    k.collider(x - r * 0.9, x + r * 0.9, z - r * 0.9, z + r * 0.9, 0, 0.42, true);
    const cols = pick([["#e63946", "#ffd166", "#ffffff"], ["#f47aa6", "#b58ae0", "#ffffff"], ["#ff8c42", "#ffd166", "#e63946"], ["#6cb4ee", "#ffffff", "#f7c326"]]);
    const n = Math.floor(r * r * 16);
    for (let i = 0; i < n; i++) {
      const a = rnd() * PI * 2, d = Math.sqrt(rnd()) * (r - 0.35);
      flowers.push({ pos: [x + Math.cos(a) * d, 0.5 + rnd() * 0.25, z + Math.sin(a) * d], scale: [1, 0.7, 1], color: pick(cols) });
    }
    const nb = Math.max(2, Math.floor(r * 2));
    for (let i = 0; i < nb; i++) {
      const a = (i / nb) * PI * 2 + rnd(), d = (r - 0.6) * (0.3 + rnd() * 0.6), s = 0.3 + rnd() * 0.25;
      B.geo(rnd() < 0.5 ? leaves : leavesDark, new THREE.IcosahedronGeometry(s, 1), x + Math.cos(a) * d, 0.35 + s * 0.7, z + Math.sin(a) * d);
    }
    // a small tree in bigger beds
    if (r > 1.6) {
      B.cyl(bark, 0.09, 0.13, 1.6, x, 0.33, z, { seg: 8 });
      B.geo(leaves, new THREE.IcosahedronGeometry(1.0, 1), x, 2.6, z, { s: [1, 0.9, 1] });
      B.geo(leaves, new THREE.IcosahedronGeometry(0.7, 1), x + 0.45, 3.1, z + 0.2);
      k.collider(x - 0.15, x + 0.15, z - 0.15, z + 0.15, 0, 2.0, true);
    }
  };
  const balloonBunch = (x: number, y: number, z: number, n: number, spread = 0.55) => {
    for (let i = 0; i < n; i++) {
      const a = rnd() * PI * 2, d = rnd() * spread, h = y + 0.5 + rnd() * 0.9;
      const bx = x + Math.cos(a) * d, bz = z + Math.sin(a) * d;
      balloons.push({ pos: [bx, h, bz], scale: [1, 1.18, 1], color: pick(balloonColors) });
      B.rod(white, 0.004, [x, y, z], [bx, h - 0.24, bz], 3);
    }
  };
  /** festoon string with bulbs + optional pennant flags */
  const festoon = (a: V3t, b: V3t, sag: number, withFlags = true) => {
    B.wire(iron, a, b, sag, 0.012);
    const n = Math.max(4, Math.round(Math.hypot(b[0] - a[0], b[2] - a[2]) / 0.8));
    const ry = Math.atan2(-(b[2] - a[2]), b[0] - a[0]);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const p: V3t = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * PI) * sag, a[2] + (b[2] - a[2]) * t];
      bulbs.push({ pos: [p[0], p[1] - 0.06, p[2]] });
      if (withFlags) flags.push({ pos: [p[0] + (b[0] - a[0]) / n / 2, p[1] - 0.02, p[2] + (b[2] - a[2]) / n / 2], rotY: ry, color: balloonColors[i % 7] });
    }
  };

  // ================= ENTRANCE: arch, ticket booths, forecourt =================
  {
    const zA = 21.5;
    // front fence from the booths to the sides
    fenceLine([8, zA], [X1 + 0.3, zA], 1.7, true);
    fenceLine([-8, zA], [X0 - 0.3, zA], 1.7, true);
    // pillars (striped)
    const pillarM = M(tx("pillar", () => T.candyStripe("#e0262f", "#fbf6ee")), "#ffffff", { roughness: 0.45, bump: 0 });
    for (const s of [-1, 1]) {
      const px = s * 3.95;
      B.box(stoneW, 1.6, 0.6, 1.6, px, 0, zA, { uv: 1 });
      B.cyl(pillarM, 0.55, 0.6, 6.2, px, 0.6, zA, { seg: 24, sv: 3 });
      B.cyl(gold, 0.72, 0.72, 0.25, px, 6.8, zA, { seg: 24 });
      B.lathe(yellow, [[0.7, 0], [0.8, 0.3], [0.6, 0.9], [0.2, 1.3], [0, 1.4]], px, 7.05, zA, { seg: 24 });
      B.sphere(gold, 0.2, px, 8.6, zA);
      B.rod(gold, 0.025, [px, 8.5, zA], [px, 9.6, zA]);
      B.box(red, 0.8, 0.5, 0.02, px + 0.42, 9.2, zA, { flat: true });
      k.collider(px - 0.8, px + 0.8, zA - 0.8, zA + 0.8, 0, 8.4, true);
      for (let i = 0; i < 12; i++) bulbs.push({ pos: [px + Math.cos((i / 12) * PI * 2) * 0.74, 6.93, zA + Math.sin((i / 12) * PI * 2) * 0.74] });
    }
    // marquee sign board between the pillars
    B.box(redDeep, 7.3, 1.9, 0.5, 0, 5.2, zA, { flat: true });
    for (const s of [-1, 1]) B.geo(sEntrance, new THREE.PlaneGeometry(6.9, 1.6), 0, 6.15, zA + s * 0.26, { ry: s > 0 ? 0 : PI });
    k.collider(-3.65, 3.65, zA - 0.3, zA + 0.3, 5.2, 7.1, true);
    // sunburst crest above
    const crest = new THREE.Shape();
    crest.moveTo(-2.6, 0);
    crest.absarc(0, 0, 2.6, PI, 0, true);
    crest.lineTo(-2.6, 0);
    const cg = new THREE.ExtrudeGeometry(crest, { depth: 0.3, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 1, curveSegments: 24 });
    cg.translate(0, 0, -0.15);
    B.geo(yellow, cg, 0, 7.1, zA);
    for (let i = 0; i < 9; i++) {
      const a0 = (i / 9) * PI, a1 = ((i + 0.5) / 9) * PI;
      const ray = new THREE.Shape();
      ray.moveTo(0, 0); ray.lineTo(Math.cos(a0) * 2.45, Math.sin(a0) * 2.45); ray.lineTo(Math.cos(a1) * 2.45, Math.sin(a1) * 2.45); ray.lineTo(0, 0);
      for (const s of [-1, 1]) { const rg = new THREE.ShapeGeometry(ray); if (s < 0) rg.rotateY(PI); B.geo(orange, rg, 0, 7.12, zA + s * 0.2); }
    }
    for (let i = 0; i <= 20; i++) { const a = (i / 20) * PI; for (const s of [-1, 1]) bulbs.push({ pos: [Math.cos(a) * 2.5, 7.1 + Math.sin(a) * 2.5, zA + s * 0.22] }); }
    for (let i = 0; i < 18; i++) for (const s of [-1, 1]) { bulbs.push({ pos: [-3.45 + i * 0.405, 7.0, zA + s * 0.27] }); bulbs.push({ pos: [-3.45 + i * 0.405, 5.3, zA + s * 0.27] }); }
    // ticket booths
    for (const s of [-1, 1]) {
      const bx = s * 6.7, bz = zA;
      B.at(bx, 0, bz, 0);
      B.box(stoneW, 2.5, 0.3, 2.5, 0, 0, 0, { uv: 1 });
      B.box(boardsWhite, 2.3, 1.1, 2.3, 0, 0.3, 0, { uv: 2, world: true });
      for (const [cx, cz] of [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]]) B.box(red, 0.18, 1.5, 0.18, cx, 1.4, cz);
      B.box(boardsWhite, 2.3, 1.5, 0.1, 0, 1.4, -1.08, { uv: 2, world: true });
      for (const sx of [-1, 1]) B.box(boardsWhite, 0.1, 1.5, 2.3, sx * 1.08, 1.4, 0, { uv: 2, world: true });
      B.box(glass, 2.05, 1.4, 0.02, 0, 1.45, 1.1, { flat: true });
      B.box(darkInside, 2.1, 1.5, 0.02, 0, 1.4, -1.0, { flat: true });
      B.box(woodSlat, 2.4, 0.06, 0.45, 0, 1.36, 1.2, { uv: 1 });
      B.box(red, 2.6, 0.12, 2.6, 0, 2.9, 0);
      B.geo(stripeRW, new THREE.ConeGeometry(2.0, 1.2, 4, 1, true), 0, 3.62, 0, { ry: PI / 4 });
      B.sphere(gold, 0.14, 0, 4.25, 0);
      B.geo(sTickets, new THREE.PlaneGeometry(1.9, 0.6), 0, 2.55, 1.21);
      B.geo(menuTix, new THREE.PlaneGeometry(0.55, 0.55), s * -0.85, 0.85, 1.17);
      B.box(steel, 0.5, 0.35, 0.08, 0, 1.36, 0.9, { flat: true });
      B.col(-1.25, 1.25, 0, 3.02, -1.25, 1.25, true);
      B.xf = null;
      // turnstile-like stanchions with rope in front of the window
      for (const px of [bx - 1.1, bx + 1.1]) { B.cyl(brass, 0.04, 0.04, 0.95, px, 0, bz + 2.2, { seg: 8 }); B.cyl(brass, 0.16, 0.16, 0.04, px, 0, bz + 2.2, { seg: 12 }); B.sphere(brass, 0.06, px, 0.98, bz + 2.2, { ws: 8, hs: 6 }); }
      B.wire(red, [bx - 1.1, 0.9, bz + 2.2], [bx + 1.1, 0.9, bz + 2.2], 0.18, 0.025);
    }
    // forecourt: planters, benches, park map, balloon bunch
    bed(-13.5, 23.6, 1.3); bed(13.5, 23.6, 1.3); bed(-21, 23.6, 1.3); bed(21, 23.6, 1.3);
    bench(-17.3, 24.4, PI); bench(17.3, 24.4, PI);
    bench(-24.8, 23.8, PI); bench(24.8, 23.8, PI);
    B.box(ironGreen, 0.1, 2.1, 0.1, -9.6, 0, 24.2, { flat: true }); B.box(ironGreen, 0.1, 2.1, 0.1, -7.8, 0, 24.2, { flat: true });
    B.box(ironGreen, 1.95, 1.3, 0.08, -8.7, 0.8, 24.2);
    B.geo(parkMap, new THREE.PlaneGeometry(1.8, 1.15), -8.7, 1.45, 24.15, { ry: PI });
    k.collider(-9.7, -7.7, 24.1, 24.3, 0, 2.1, true);
    bin(10, 24.6, green); bin(-11.5, 24.6, red);
    k.room("Entrance", X0, X1, zA - 0.4, Z1);
  }

  // ================= MAIN AVENUE =================
  {
    for (const z of [8, 13.5, 19]) { lamp(-4.3, z); lamp(4.3, z); }
    for (const z of [8, 13.5]) festoon([-4.3, 3.5, z], [4.3, 3.5, z + 5.5], 0.7);
    for (const z of [8, 13.5]) festoon([4.3, 3.5, z], [-4.3, 3.5, z + 5.5], 0.7, false);
    bench(-4.6, 10.8, PI / 2); bench(4.6, 16.2, -PI / 2); bench(-4.6, 16.2, PI / 2);
    bin(-4.6, 12.6, green); bin(4.6, 12.2, red); bin(4.6, 18.4, green);
    // balloon vendor cart
    {
      const vx = 5.6, vz = 10.6;
      B.at(vx, 0, vz, -PI / 2);
      B.box(boardsYel, 1.3, 0.75, 0.75, 0, 0.35, 0, { uv: 1.2, world: true });
      for (const sx of [-0.45, 0.45]) B.geo(rubber, new THREE.TorusGeometry(0.2, 0.06, 6, 14), sx, 0.26, 0.42);
      for (const sx of [-0.45, 0.45]) B.geo(rubber, new THREE.TorusGeometry(0.2, 0.06, 6, 14), sx, 0.26, -0.42);
      B.box(red, 1.4, 0.08, 0.85, 0, 1.1, 0);
      B.cyl(steel, 0.03, 0.03, 1.7, 0.5, 1.18, 0, { seg: 6 });
      B.rod(steel, 0.02, [-0.9, 0.9, 0], [-0.62, 0.9, 0]);
      B.col(-0.72, 0.72, 0, 1.2, -0.5, 0.5, true);
      const top = B.pt(0.5, 2.85, 0);
      B.xf = null;
      balloonBunch(top[0], top[1], top[2], 22, 0.6);
    }
    k.room("Main Avenue", -4.6, 4.6, 6.5, 21.1);
  }

  // ================= FOUNTAIN PLAZA =================
  {
    const fx = 0, fz = 2;
    B.lathe(stone, [[3.55, 0], [3.85, 0], [3.9, 0.36], [3.98, 0.4], [3.98, 0.44], [3.5, 0.44], [3.45, 0.38], [3.45, 0.1], [0, 0.1]], fx, 0, fz, { seg: 48 });
    const wg = new THREE.CircleGeometry(3.46, 48);
    wg.rotateX(-PI / 2);
    B.geo(water, wg, fx, 0.32, fz);
    // central tiered column with bowls
    B.lathe(stoneW, [[0, 0], [0.7, 0], [0.7, 0.3], [0.5, 0.4], [0.35, 0.6], [0.3, 1.3], [0.4, 1.45], [0, 1.45]], fx, 0.1, fz, { seg: 28 });
    B.lathe(stoneW, [[0, 0], [0.4, 0], [1.2, 0.18], [1.5, 0.35], [1.55, 0.42], [1.42, 0.42], [1.1, 0.3], [0, 0.3]], fx, 1.5, fz, { seg: 36 });
    const bw = new THREE.CircleGeometry(1.42, 36); bw.rotateX(-PI / 2);
    B.geo(water, bw, fx, 1.88, fz);
    B.cyl(fall, 1.45, 1.52, 1.5, fx, 0.34, fz, { open: true, seg: 36 });
    B.lathe(stoneW, [[0, 0], [0.22, 0], [0.18, 0.4], [0.2, 0.9], [0, 0.9]], fx, 1.85, fz, { seg: 20 });
    B.lathe(stoneW, [[0, 0], [0.25, 0], [0.7, 0.14], [0.8, 0.25], [0.7, 0.25], [0, 0.18]], fx, 2.72, fz, { seg: 28 });
    const bw2 = new THREE.CircleGeometry(0.7, 28); bw2.rotateX(-PI / 2);
    B.geo(water, bw2, fx, 2.95, fz);
    B.cyl(fall, 0.72, 0.78, 1.05, fx, 1.9, fz, { open: true, seg: 28 });
    B.lathe(gold, [[0, 0], [0.12, 0], [0.08, 0.2], [0.15, 0.35], [0, 0.55]], fx, 2.95, fz, { seg: 16 });
    B.cone(fall, 0.18, 0.7, fx, 3.4, fz);
    // colliders: low rim segments (walk into the water), column, bowls
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * PI * 2;
      const cx = fx + Math.cos(a) * 3.7, cz = fz + Math.sin(a) * 3.7;
      k.collider(cx - 0.45, cx + 0.45, cz - 0.45, cz + 0.45, 0, 0.44, true);
    }
    k.collider(fx - 1.1, fx + 1.1, fz - 1.1, fz + 1.1, 1.5, 1.92, true);
    k.collider(fx - 0.5, fx + 0.5, fz - 0.5, fz + 0.5, 0, 1.6, true);
    k.collider(fx - 0.55, fx + 0.55, fz - 0.55, fz + 0.55, 2.72, 3.0, true);
    // plaza: benches facing the fountain, beds, lamps
    bench(-6.3, 2, PI / 2); bench(6.3, 2, -PI / 2); bench(0, -4.9, 0);
    bench(-4.6, -2.8, Math.atan2(4.6, 4.8)); bench(4.6, -2.8, Math.atan2(-4.6, 4.8));
    bed(-6.2, -4.8, 1.3); bed(6.2, -4.8, 1.3); bed(-7.2, 8.6, 1.6); bed(7.6, 8.4, 1.4);
    lamp(-5.7, 6.2, false); lamp(5.7, 6.2, false); lamp(-3.5, -5.6, false); lamp(3.5, -5.6, false);
    bin(-5.8, -1.4, red); bin(5.8, 5, green);
    k.room("Fountain Plaza", -8.8, 8.8, -6.5, 6.5);
  }

  // ================= CAROUSEL (west) =================
  {
    const cx = -16, cz = 0.5, R = 6.5;
    B.cyl(woodDeck, R, R, 0.35, cx, 0, cz, { seg: 48 });
    B.cyl(gold, R + 0.05, R + 0.05, 0.12, cx, 0.23, cz, { seg: 48, open: true });
    B.cyl(red, R + 0.04, R + 0.04, 0.22, cx, 0.0, cz, { seg: 48, open: true });
    for (const [hx, hz] of [[R - 0.1, 2.6], [4.6, 4.6], [2.6, R - 0.1]] as const) k.collider(cx - hx, cx + hx, cz - hz, cz + hz, 0, 0.35, true);
    // central mirrored column
    B.cyl(mirror, 1.15, 1.15, 3.9, cx, 0.35, cz, { seg: 24, open: true });
    B.cyl(gold, 1.3, 1.3, 0.25, cx, 0.35, cz, { seg: 24 });
    B.cyl(gold, 1.3, 1.3, 0.2, cx, 4.2, cz, { seg: 24 });
    k.collider(cx - 1.25, cx + 1.25, cz - 1.25, cz + 1.25, 0, 4.4, true);
    // canopy: rounding board, valance, striped cone roof, soffit
    B.cyl(red, 7.0, 7.0, 0.9, cx, 4.45, cz, { seg: 48, open: true });
    B.cyl(gold, 7.06, 7.06, 0.1, cx, 4.45, cz, { seg: 48, open: true });
    B.cyl(gold, 7.06, 7.06, 0.1, cx, 5.25, cz, { seg: 48, open: true });
    B.cyl(valRW, 7.03, 7.03, 0.5, cx, 3.95, cz, { seg: 48, open: true, su: 14 });
    const soff = new THREE.CircleGeometry(7, 48); soff.rotateX(PI / 2);
    B.geo(yellow, soff, cx, 4.45, cz);
    B.lathe(canopyRW, [[7.25, 0], [6.6, 0.4], [3.2, 1.7], [0.6, 2.5], [0, 2.6]], cx, 5.35, cz, { seg: 48 });
    B.cyl(gold, 0.3, 0.3, 0.3, cx, 7.9, cz, { seg: 16 });
    B.sphere(gold, 0.35, cx, 8.45, cz);
    B.rod(gold, 0.03, [cx, 8.6, cz], [cx, 9.8, cz]);
    B.box(yellow, 0.9, 0.5, 0.02, cx + 0.47, 9.45, cz, { flat: true });
    for (let i = 0; i < 40; i++) { const a = (i / 40) * PI * 2; bulbs.push({ pos: [cx + Math.cos(a) * 7.08, 4.9, cz + Math.sin(a) * 7.08] }); }
    for (let i = 0; i < 24; i++) { const a = (i / 24) * PI * 2; bulbs.push({ pos: [cx + Math.cos(a) * 5.2, 4.42, cz + Math.sin(a) * 5.2] }); bulbs.push({ pos: [cx + Math.cos(a) * 3.2, 4.42, cz + Math.sin(a) * 3.2] }); }
    // radial canopy rafters under the soffit
    for (let i = 0; i < 16; i++) { const a = (i / 16) * PI * 2; B.rod(gold, 0.05, [cx + Math.cos(a) * 1.3, 4.38, cz + Math.sin(a) * 1.3], [cx + Math.cos(a) * 6.9, 4.38, cz + Math.sin(a) * 6.9], 6); }
    // horses
    const saddles = [red, blue, green, purple, teal];
    const horseW = paint("#f8f3ea", 0.28);
    const horseB = paint("#b88350", 0.32);
    const horseG = paint("#6f6f78", 0.3);
    const rings: [number, number, number][] = [[5.2, 10, 0], [3.2, 6, 0.3]];
    let hi = 0;
    for (const [r, n, off] of rings)
      for (let i = 0; i < n; i++, hi++) {
        const ph = (i / n) * PI * 2 + off;
        const hx = cx + Math.cos(ph) * r, hz = cz + Math.sin(ph) * r;
        const hb = 1.0 + Math.sin(i * 1.7) * 0.22;
        B.at(hx, 0.35, hz, -ph - PI / 2);
        const body = hi % 4 === 1 ? horseB : hi % 4 === 3 ? horseG : horseW;
        B.sphere(body, 1, 0, hb, 0, { s: [0.62, 0.3, 0.25] });
        B.sphere(body, 1, 0.36, hb + 0.06, 0, { s: [0.3, 0.3, 0.24] });
        B.rod(body, 0.13, [0.45, hb + 0.12, 0], [0.7, hb + 0.62, 0], 10);
        B.box(body, 0.46, 0.2, 0.18, 0.87, hb + 0.62, 0, { rz: -0.55 });
        B.sphere(body, 0.13, 0.7, hb + 0.66, 0, { s: [1, 1, 0.9] });
        for (const sz of [-0.05, 0.05]) B.geo(body, new THREE.ConeGeometry(0.035, 0.12, 6), 0.68, hb + 0.84, sz, { rz: 0.3 });
        B.tube(gold, [[0.48, hb + 0.28, 0], [0.58, hb + 0.62, 0], [0.66, hb + 0.8, 0]], 0.06, { rs: 5, seg: 8 });
        // legs (galloping pose)
        for (const sz of [-0.1, 0.1]) {
          B.rod(body, 0.045, [0.38, hb - 0.12, sz], [0.6, hb - 0.34, sz], 6);
          B.rod(body, 0.04, [0.6, hb - 0.34, sz], [0.52, hb - 0.62, sz], 6);
          B.cyl(gold, 0.045, 0.05, 0.07, 0.52, hb - 0.68, sz, { seg: 8 });
          B.rod(body, 0.05, [-0.4, hb - 0.1, sz], [-0.55, hb - 0.5, sz], 6);
          B.rod(body, 0.04, [-0.55, hb - 0.5, sz], [-0.78, hb - 0.72, sz], 6);
          B.cyl(gold, 0.045, 0.05, 0.07, -0.8, hb - 0.78, sz, { seg: 8 });
        }
        B.tube(gold, [[-0.58, hb + 0.08, 0], [-0.78, hb - 0.05, 0], [-0.86, hb - 0.4, 0]], 0.05, { rs: 5, seg: 8 });
        const sm = saddles[hi % saddles.length];
        B.box(sm, 0.42, 0.08, 0.58, -0.02, hb + 0.24, 0);
        B.box(gold, 0.1, 0.12, 0.2, 0.18, hb + 0.3, 0);
        B.box(sm, 0.03, 0.04, 0.2, 1.08, hb + 0.52, 0, { flat: true });
        B.rod(red, 0.012, [1.02, hb + 0.52, 0.09], [0.6, hb + 0.35, 0.12], 3);
        // twisted brass pole
        B.cyl(brass, 0.04, 0.04, 4.1 - 0.35 + 0.35, 0, 0, 0, { seg: 8 });
        B.sphere(brass, 0.07, 0, hb + 0.55, 0, { ws: 8, hs: 6 });
        B.col(-0.55, 0.7, hb - 0.3, hb + 0.3, -0.2, 0.2, true);
        B.xf = null;
      }
    // carousel sign
    const cs = sign("carousel", "MERRY-GO-ROUND", "#d7262f", "#ffe066", "", 512, 96);
    B.geo(cs, new THREE.PlaneGeometry(3.8, 0.7), cx + 7.1, 4.9, cz, { ry: PI / 2 });
    lamp(-8.2, -5.8, false); lamp(-8.2, 7.2, false);
    bench(-23.8, -5.8, PI / 4); bin(-9, -3.5, green);
    k.room("Carousel", -23, -9, -6.5, 7.3);
  }

  // ================= GAME ALLEY (south-west) =================
  /** open-front booth facing north: back wall at zB, front at zF; side entry gap at the east end of the counter */
  const booth = (x0: number, x1: number, zF: number, zB: number, wall: Mat, stripe: Mat, val: Mat, sg: Mat, inner: (cx: number) => void) => {
    const w = x1 - x0, d = zB - zF, cx = (x0 + x1) / 2, cz = (zF + zB) / 2;
    B.box(woodDeck, w, 0.12, d, cx, 0, cz, { uv: 2, world: true });
    B.box(wall, w, 3.2, 0.12, cx, 0, zB - 0.06, { uv: 2, world: true, solid: true, stand: true });
    B.box(wall, 0.12, 3.2, d, x0 + 0.06, 0, cz, { uv: 2, world: true, solid: true, stand: true });
    B.box(wall, 0.12, 3.2, d, x1 - 0.06, 0, cz, { uv: 2, world: true, solid: true, stand: true });
    const cEnd = x1 - 0.12 - 1.7;
    B.box(wall, cEnd - x0 - 0.12, 0.95, 0.5, (x0 + 0.12 + cEnd) / 2, 0, zF + 0.3, { uv: 2, world: true, solid: true, stand: true });
    B.box(woodSlat, cEnd - x0 - 0.02, 0.07, 0.66, (x0 + 0.1 + cEnd) / 2, 0.95, zF + 0.28, { uv: 1 });
    B.box(white, 0.14, 3.3, 0.14, x0 + 0.07, 0, zF + 0.07);
    B.box(white, 0.14, 3.3, 0.14, x1 - 0.07, 0, zF + 0.07);
    // header + sign + roof + awning
    B.box(wall, w, 0.8, 0.12, cx, 2.5, zF + 0.06, { uv: 2, world: true });
    B.geo(sg, new THREE.PlaneGeometry(Math.min(w - 0.4, 3.8), 0.72), cx, 2.9, zF - 0.01, { ry: PI });
    B.box(red, w + 0.3, 0.14, d + 0.3, cx, 3.3, cz, { solid: true, stand: true });
    B.box(stripe, w + 0.2, 0.04, 1.0, cx, 2.3, zF - 0.45, { flat: true, rx: -0.28 });
    B.geo(val, new THREE.PlaneGeometry(w + 0.2, 0.34), cx, 2.0, zF - 0.93, { ry: PI, su: w / 1.6 });
    for (let x = x0 + 0.3; x < x1 - 0.2; x += 0.45) bulbs.push({ pos: [x, 2.52, zF - 0.02] });
    inner(cx);
  };
  {
    // --- balloon darts ---
    booth(-26.9, -22.4, 18.0, 21.3, boardsTeal, stripeGW, valGY, sDarts, (cx) => {
      B.box(boardsWhite, 4.0, 1.9, 0.08, cx, 0.9, 21.12, { uv: 2, world: true });
      for (let i = 0; i < 8; i++) for (let j = 0; j < 5; j++) if (rnd() < 0.88) balloons.push({ pos: [-26.4 + i * 0.5 + (j % 2) * 0.2, 1.15 + j * 0.36, 21.0], scale: [0.72, 0.82, 0.6], color: pick(balloonColors) });
      for (let i = 0; i < 6; i++) B.geo(steel, new THREE.ConeGeometry(0.012, 0.16, 5), -26.2 + i * 0.3, 1.02, 18.3, { rz: PI / 2 });
      for (let i = 0; i < 5; i++) plushBear(-26.5 + i * 0.4, 2.88, 20.95, 0.55, pick(["#f47aa6", "#9fd4f5", "#ffd166", "#b58ae0", "#ffffff"]));
    });
    // --- shooting gallery ---
    booth(-20.2, -14.2, 17.6, 21.3, boardsRed, stripeYR, valBY, sShoot, (cx) => {
      B.geo(galleryBack, new THREE.PlaneGeometry(5.7, 2.3), cx, 1.55, 21.17, { ry: PI });
      B.box(steelDark, 5.7, 0.06, 0.3, cx, 1.0, 20.9, { flat: true });
      B.box(steelDark, 5.7, 0.06, 0.3, cx, 1.65, 20.9, { flat: true });
      // metal ducks and targets on rails
      const duck = new THREE.Shape();
      duck.moveTo(-0.14, 0); duck.lineTo(0.16, 0); duck.quadraticCurveTo(0.2, 0.12, 0.08, 0.14); duck.quadraticCurveTo(0.14, 0.28, 0.04, 0.28);
      duck.quadraticCurveTo(-0.05, 0.28, -0.03, 0.14); duck.quadraticCurveTo(-0.18, 0.14, -0.14, 0);
      for (let i = 0; i < 9; i++) { const dg = new THREE.ExtrudeGeometry(duck, { depth: 0.03, bevelEnabled: false, curveSegments: 6 }); B.geo(i % 3 ? yellow : orange, dg, -19.7 + i * 0.6, 1.06, 20.85); }
      for (let i = 0; i < 7; i++) B.geo(target, new THREE.CircleGeometry(0.16, 20), -19.4 + i * 0.75, 1.95, 21.1, { ry: PI });
      // rifles on the counter (tethered)
      for (let i = 0; i < 3; i++) {
        const rx = -19.6 + i * 0.9;
        B.box(woodSlat, 0.12, 0.1, 0.35, rx, 1.02, 17.95, { uv: 0.5 });
        B.cyl(iron, 0.02, 0.02, 0.5, rx, 1.08, 18.35, { rx: PI / 2, seg: 6 });
        B.wire(iron, [rx, 1.05, 17.8], [rx + 0.1, 1.0, 17.7], 0.05, 0.006);
      }
      // prize shelves with plush animals along the side walls and top
      for (const sx of [-20.0, -14.45]) { B.box(woodSlat, 0.35, 0.05, 2.6, sx + (sx < -17 ? 0.17 : -0.17), 2.2, 19.6, { uv: 1 }); }
      for (let i = 0; i < 5; i++) { plushBear(-19.85, 2.25, 18.6 + i * 0.5, 0.5, pick(["#f47aa6", "#9fd4f5", "#ffd166", "#b58ae0", "#c98a55"])); plushBear(-14.6, 2.25, 18.6 + i * 0.5, 0.5, pick(["#f47aa6", "#9fd4f5", "#ffd166", "#7fcf6a", "#ffffff"])); }
      for (let i = 0; i < 4; i++) plushBear(-19.2 + i * 1.3, 2.72, 20.9, 0.95, pick(["#f47aa6", "#9fd4f5", "#ffd166", "#b58ae0"]));
      plushBear(-19.4, 0.12, 20.6, 1.4, "#c98a55");
    });
    // --- ring toss ---
    booth(-12.9, -8.6, 18.0, 21.3, boardsPur, stripeTY, valTY, sRing, (cx) => {
      for (let t = 0; t < 3; t++) {
        B.box(white, 3.2 - t * 0.5, 0.35, 0.7, cx - 0.3, 0.12 + t * 0.35, 19.9 + t * 0.3, { uv: 1 });
        for (let i = 0; i < 9 - t * 2; i++) bottles.push({ pos: [cx - 1.7 + t * 0.25 + i * 0.35, 0.47 + t * 0.35, 19.8 + t * 0.3], color: pick(["#2f8f4e", "#6b3d1f", "#2f6f8f", "#8f2f4e"]) });
      }
      k.collider(cx - 1.9, cx + 1.3, 19.55, 20.95, 0, 1.17, true);
      for (let i = 0; i < 6; i++) B.geo(pick([red, yellow, blue, green]), new THREE.TorusGeometry(0.1, 0.018, 5, 16), -12.4 + i * 0.3, 1.03, 18.25, { rx: PI / 2 });
      for (let i = 0; i < 5; i++) plushBear(-12.5 + i * 0.85, 2.3, 21.0, 0.8, pick(["#f47aa6", "#9fd4f5", "#ffd166", "#b58ae0", "#7fcf6a"]));
    });
    // high striker
    {
      const sx = -24.8, sz = 10.5;
      B.box(woodDeck, 1.6, 0.3, 1.6, sx, 0, sz, { uv: 1 });
      B.box(red, 0.5, 0.25, 0.5, sx, 0.3, sz + 0.35);
      B.box(boardsWhite, 0.32, 6.2, 0.2, sx, 0.3, sz - 0.3, { uv: 1.5, world: true });
      for (let i = 0; i < 10; i++) B.box([red, orange, yellow, green, blue][i % 5], 0.38, 0.4, 0.04, sx, 0.8 + i * 0.52, sz - 0.18, { flat: true });
      B.sphere(gold, 0.26, sx, 6.75, sz - 0.3);
      B.cyl(steel, 0.08, 0.08, 0.16, sx, 1.2, sz - 0.12, { seg: 10 });
      B.geo(sStriker, new THREE.PlaneGeometry(2.4, 0.6), sx, 6.2, sz - 0.05);
      B.box(woodSlat, 0.12, 0.12, 1.0, sx + 0.9, 0.3, sz + 0.2, { uv: 0.5, ry: 0.4 });
      B.box(iron, 0.35, 0.22, 0.2, sx + 1.1, 0.3, sz + 0.65, { ry: 0.4 });
      k.collider(sx - 0.8, sx + 0.8, sz - 0.8, sz + 0.8, 0, 0.55, true);
      k.collider(sx - 0.22, sx + 0.22, sz - 0.45, sz - 0.15, 0, 6.5, true);
    }
    lamp(-21.3, 14.5); lamp(-10.5, 14.5);
    bench(-16, 13.2, PI); bench(-25.6, 15.2, PI / 2);
    bin(-13.8, 16.2, red); bin(-22.5, 16.6, green);
    bed(-17.8, 10.3, 1.7); bed(-11.5, 9.8, 1.2);
    balloonBunch(-8.9, 1.0, 17.7, 8, 0.4);
    k.room("Game Alley", X0, -8, 7.3, 21.5);
  }

  function plushBear(x: number, y: number, z: number, s: number, col: string) {
    const ry = PI + (rnd() - 0.5) * 0.6;
    const c = Math.cos(ry), sn = Math.sin(ry);
    const P = (lx: number, ly: number, lz: number): V3t => [x + lx * c + lz * sn, y + ly, z - lx * sn + lz * c];
    plush.push({ pos: P(0, 0.22 * s, 0), scale: [0.2 * s, 0.24 * s, 0.17 * s], color: col });
    plush.push({ pos: P(0, 0.53 * s, 0), scale: [0.16 * s, 0.15 * s, 0.15 * s], color: col });
    for (const e of [-1, 1]) {
      plush.push({ pos: P(e * 0.12 * s, 0.67 * s, 0), scale: [0.06 * s, 0.06 * s, 0.04 * s], color: col });
      plush.push({ pos: P(e * 0.2 * s, 0.3 * s, 0.04 * s), scale: [0.06 * s, 0.12 * s, 0.06 * s], color: col });
      plush.push({ pos: P(e * 0.1 * s, 0.05 * s, 0.1 * s), scale: [0.07 * s, 0.06 * s, 0.1 * s], color: col });
    }
    plush.push({ pos: P(0, 0.5 * s, 0.13 * s), scale: [0.07 * s, 0.05 * s, 0.05 * s], color: "#f3e3cf" });
    plush.push({ pos: P(0, 0.52 * s, 0.18 * s), scale: [0.025 * s, 0.02 * s, 0.02 * s], color: "#222222" });
  }

  // ================= FOOD STANDS (south-east) =================
  /** closed kiosk facing north with a service window, striped awning and a roof sign board */
  const kiosk = (cx: number, cz: number, w: number, d: number, wall: Mat, stripe: Mat, val: Mat, sg: Mat, menu: Mat) => {
    const zF = cz - d / 2;
    B.box(stoneW, w + 0.2, 0.2, d + 0.2, cx, 0, cz, { uv: 1 });
    B.box(wall, w, 2.5, d, cx, 0.2, cz, { uv: 2, world: true });
    B.box(darkInside, w - 0.8, 1.05, 0.02, cx, 1.15, zF - 0.005, { flat: true });
    B.box(white, w - 0.6, 0.08, 0.12, cx, 2.2, zF - 0.04);
    for (const s of [-1, 1]) B.box(white, 0.1, 1.2, 0.1, cx + s * (w / 2 - 0.35), 1.05, zF - 0.04);
    B.box(woodSlat, w - 0.5, 0.06, 0.5, cx, 1.05, zF - 0.2, { uv: 1 });
    B.box(white, w + 0.4, 0.16, d + 0.4, cx, 2.7, cz);
    B.box(stripe, w + 0.3, 0.04, 1.0, cx, 2.35, zF - 0.45, { flat: true, rx: -0.3 });
    B.geo(val, new THREE.PlaneGeometry(w + 0.3, 0.34), cx, 2.0, zF - 0.93, { ry: PI, su: w / 1.6 });
    B.box(wall, w * 0.85, 0.85, 0.12, cx, 2.86, zF + 0.2, { uv: 2, world: true });
    B.geo(sg, new THREE.PlaneGeometry(w * 0.82, 0.8), cx, 3.285, zF + 0.13, { ry: PI });
    B.geo(menu, new THREE.PlaneGeometry(0.7, 0.7), cx + w / 2 + 0.005, 1.5, cz, { ry: PI / 2 });
    k.collider(cx - w / 2 - 0.1, cx + w / 2 + 0.1, cz - d / 2 - 0.3, cz + d / 2 + 0.1, 0, 2.86, true);
    return zF;
  };
  {
    // popcorn cart
    {
      const px = 9.6, pz = 16.8;
      B.box(red, 1.7, 0.85, 0.95, px, 0.3, pz, { uv: 1 });
      for (const sx of [-0.6, 0.6]) for (const sz of [-0.5, 0.5]) { B.geo(rubber, new THREE.TorusGeometry(0.22, 0.07, 6, 16), px + sx, 0.29, pz + sz); B.cyl(gold, 0.06, 0.06, 0.08, px + sx, 0.25, pz + sz, { rx: PI / 2, seg: 8 }); }
      B.box(gold, 1.74, 0.06, 1.0, px, 1.15, pz, { flat: true });
      B.box(glass, 1.3, 0.85, 0.8, px, 1.2, pz, { flat: true });
      B.box(popcorn, 1.2, 0.4, 0.7, px, 1.21, pz, { uv: 0.4 });
      for (const sx of [-0.65, 0.65]) for (const sz of [-0.4, 0.4]) B.box(red, 0.05, 0.85, 0.05, px + sx, 1.2, pz + sz, { flat: true });
      B.box(red, 1.4, 0.1, 0.9, px, 2.05, pz);
      B.cyl(steel, 0.18, 0.2, 0.25, px, 1.62, pz, { seg: 14 });
      for (const sx of [-0.8, 0.8]) B.cyl(white, 0.03, 0.03, 1.4, px + sx, 1.15, pz + 0.45, { seg: 6 });
      B.lathe(stripeRW, [[1.35, 0], [1.2, 0.2], [0.6, 0.5], [0, 0.62]], px, 2.55, pz, { seg: 16, su: 2 });
      B.cyl(valRW, 1.36, 1.36, 0.28, px, 2.3, pz, { seg: 16, open: true, su: 4 });
      B.geo(sPop, new THREE.PlaneGeometry(1.4, 0.44), px, 2.35, pz - 0.47, { ry: PI });
      B.rod(steel, 0.03, [px + 0.85, 0.9, pz], [px + 1.3, 0.95, pz]);
      // popcorn boxes on top
      for (let i = 0; i < 4; i++) { B.box(stripeRW, 0.14, 0.2, 0.14, px - 0.5 + i * 0.12, 2.15, pz - 0.3, { flat: true }); B.box(popcorn, 0.14, 0.06, 0.14, px - 0.5 + i * 0.12, 2.35, pz - 0.3, { uv: 0.2 }); }
      k.collider(px - 0.9, px + 0.9, pz - 0.55, pz + 0.55, 0, 2.1, true);
      bin(11.4, 16.0, red);
    }
    // cotton candy kiosk
    {
      const zF = kiosk(14.6, 19.3, 3.2, 2.1, boardsPink, stripePW, valPW, sCotton, menuCot);
      B.cyl(steel, 0.35, 0.28, 0.25, 14.6, 1.11, zF - 0.2, { seg: 18, open: true });
      B.geo(fluffPink, new THREE.IcosahedronGeometry(0.22, 1), 14.6, 1.45, zF - 0.2);
      for (let i = 0; i < 7; i++) {
        const bx = 13.2 + i * 0.47;
        B.rod(white, 0.006, [bx, 2.2, zF - 0.85], [bx, 1.95, zF - 0.85], 3);
        B.geo(i % 2 ? fluffBlue : fluffPink, new THREE.IcosahedronGeometry(0.17, 1), bx, 1.78, zF - 0.85, { s: [1, 1.3, 1] });
      }
      for (let i = 0; i < 4; i++) B.geo(pick([fluffPink, fluffBlue]), new THREE.IcosahedronGeometry(0.15, 1), 13.4 + i * 0.3, 1.32, zF - 0.28, { s: [1, 1.2, 1] });
      balloonBunch(16.5, 2.9, zF + 0.3, 7, 0.35);
    }
    // ice cream kiosk with giant cone
    {
      const ix = 20.8, iz = 19.2;
      const zF = kiosk(ix, iz, 3.6, 2.3, boardsWhite, stripeTY, valTY, sIce, menuIce);
      B.cyl(teal, 0.55, 0.55, 0.9, ix - 1.0, 1.1, zF - 0.35, { seg: 16 });
      for (let i = 0; i < 4; i++) B.lathe(wafer, [[0, 0], [0.05, 0.14], [0.05, 0.16], [0, 0.16]], ix + 0.2 + i * 0.25, 1.11, zF - 0.25, { seg: 10 });
      // giant cone on the roof
      B.lathe(wafer, [[0, 0], [0.9, 2.6], [0.95, 2.7], [0, 2.72]], ix + 0.6, 2.86, iz + 0.3, { seg: 24, su: 3, sv: 2 });
      B.sphere(paint("#fff1d6", 0.5), 0.95, ix + 0.6, 5.9, iz + 0.3, { ws: 20, hs: 14, s: [1, 0.85, 1] });
      B.sphere(paint("#f59ab8", 0.5), 0.8, ix + 0.6, 6.75, iz + 0.3, { ws: 20, hs: 14, s: [1, 0.85, 1] });
      B.sphere(paint("#6b3a22", 0.5), 0.62, ix + 0.6, 7.45, iz + 0.3, { ws: 18, hs: 12, s: [1, 0.85, 1] });
      B.sphere(red, 0.18, ix + 0.6, 8.0, iz + 0.3);
      k.collider(ix + 0.6 - 0.95, ix + 0.6 + 0.95, iz + 0.3 - 0.95, iz + 0.3 + 0.95, 2.86, 7.9, true);
      // freezer cart
      const fx = 25.2, fz = 17.4;
      B.box(white, 1.5, 0.85, 0.8, fx, 0.15, fz, { uv: 1 });
      B.box(teal, 1.52, 0.2, 0.82, fx, 0.55, fz, { flat: true });
      B.box(glass, 1.3, 0.25, 0.6, fx, 1.0, fz, { flat: true });
      for (const sx of [-0.55, 0.55]) B.geo(rubber, new THREE.TorusGeometry(0.16, 0.05, 6, 14), fx + sx, 0.18, fz + 0.43);
      B.cyl(white, 0.03, 0.03, 1.5, fx, 1.0, fz, { seg: 6 });
      B.lathe(stripeBW, [[1.2, 0], [1.1, 0.12], [0.5, 0.4], [0, 0.48]], fx, 2.45, fz, { seg: 16, su: 2 });
      k.collider(fx - 0.78, fx + 0.78, fz - 0.44, fz + 0.44, 0, 1.25, true);
    }
    // picnic tables with parasols east of the teacups
    for (const [tx0, tz0, sm] of [[24.6, 11.6, stripeRW], [24.6, 6.4, stripeBW], [24.2, 1.4, stripeYR]] as const) {
      B.lathe(white, [[0, 0], [0.35, 0], [0.35, 0.04], [0.06, 0.08], [0.05, 0.72], [0, 0.72]], tx0, 0, tz0, { seg: 16 });
      B.cyl(white, 0.62, 0.62, 0.05, tx0, 0.72, tz0, { seg: 24 });
      B.cyl(steel, 0.025, 0.025, 1.75, tx0, 0.77, tz0, { seg: 6 });
      B.lathe(sm, [[1.35, 0], [1.2, 0.18], [0.5, 0.45], [0, 0.55]], tx0, 2.35, tz0, { seg: 16, su: 2 });
      k.collider(tx0 - 0.62, tx0 + 0.62, tz0 - 0.62, tz0 + 0.62, 0, 0.77, true);
      for (let c = 0; c < 3; c++) {
        const a = (c / 3) * PI * 2 + 0.4, chx = tx0 + Math.cos(a) * 1.0, chz = tz0 + Math.sin(a) * 1.0;
        B.at(chx, 0, chz, Math.atan2(tx0 - chx, tz0 - chz));
        B.box(pick([red, yellow, blue, green]), 0.42, 0.05, 0.42, 0, 0.44, 0);
        B.box(white, 0.42, 0.4, 0.04, 0, 0.5, -0.2, { rx: -0.1 });
        for (const lx of [-0.18, 0.18]) for (const lz of [-0.18, 0.18]) B.cyl(steel, 0.015, 0.015, 0.44, lx, 0, lz, { seg: 5 });
        B.col(-0.22, 0.22, 0, 0.46, -0.22, 0.22, true);
        B.xf = null;
      }
    }
    lamp(10.5, 20.5, false); lamp(18, 15.3); bench(12.4, 14.6, 0); bin(23.3, 14.2, green);
    k.room("Food Court", 8, X1, 14, 21.5);
  }

  // ================= TEACUPS (east) =================
  {
    const tcx = 15.8, tcz = 7.8, R = 5.4;
    B.cyl(tiles, R, R, 0.3, tcx, 0, tcz, { seg: 48 });
    B.cyl(gold, R + 0.04, R + 0.04, 0.1, tcx, 0.2, tcz, { seg: 48, open: true });
    for (const [hx, hz] of [[R - 0.1, 2.2], [3.9, 3.9], [2.2, R - 0.1]] as const) k.collider(tcx - hx, tcx + hx, tcz - hz, tcz + hz, 0, 0.3, true);
    // giant teapot
    const pot = pink;
    B.lathe(pot, [[0, 0], [1.2, 0], [1.6, 0.35], [1.8, 1.0], [1.65, 1.65], [1.15, 2.1], [0.7, 2.25], [0.7, 2.35], [0, 2.35]], tcx, 0.3, tcz, { seg: 32 });
    B.cyl(gold, 1.82, 1.82, 0.12, tcx, 1.25, tcz, { seg: 32, open: true });
    B.lathe(white, [[0, 0], [0.8, 0], [0.75, 0.2], [0.4, 0.45], [0, 0.5]], tcx, 2.62, tcz, { seg: 24 });
    B.sphere(gold, 0.22, tcx, 3.25, tcz);
    B.tube(pot, [[tcx + 1.4, 1.1, tcz], [tcx + 2.2, 1.5, tcz], [tcx + 2.5, 2.3, tcz], [tcx + 2.8, 2.6, tcz]], 0.2, { rs: 10, seg: 16 });
    B.geo(pot, new THREE.TorusGeometry(0.62, 0.13, 8, 16, PI * 1.2), tcx - 1.6, 1.4, tcz, { rz: PI * 0.4 });
    for (let i = 0; i < 16; i++) { const a = (i / 16) * PI * 2; B.sphere(white, 0.1, tcx + Math.cos(a) * 1.72, 1.62, tcz + Math.sin(a) * 1.72, { ws: 8, hs: 6 }); }
    k.collider(tcx - 1.75, tcx + 1.75, tcz - 1.75, tcz + 1.75, 0, 2.7, true);
    // five cups on saucers
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * PI * 2 + 0.3;
      const x = tcx + Math.cos(a) * 3.75, z = tcz + Math.sin(a) * 3.75;
      B.lathe(white, [[0, 0], [1.3, 0], [1.4, 0.08], [1.35, 0.12], [0, 0.1]], x, 0.3, z, { seg: 32 });
      B.lathe(cupPaint[i], [[0.72, 0], [1.0, 0.12], [1.15, 0.45], [1.2, 0.88], [1.24, 0.96]], x, 0.32, z, { seg: 32 });
      B.lathe(porcelain, [[1.24, 0.96], [1.13, 0.96], [1.09, 0.5], [0.92, 0.26], [0, 0.22]], x, 0.32, z, { seg: 32 });
      B.lathe(gold, [[0.72, 0], [0.73, 0.02], [0, 0.02]], x, 0.3, z, { seg: 24 });
      B.geo(porcelain, new THREE.TorusGeometry(0.34, 0.08, 8, 14, PI), x + Math.cos(a + 1.2) * 1.2, 0.95, z + Math.sin(a + 1.2) * 1.2, { ry: -(a + 1.2) + PI / 2, rz: -PI / 2 });
      // ring seat and wheel inside
      B.geo(red, new THREE.TorusGeometry(0.82, 0.14, 6, 24), x, 0.7, z, { rx: PI / 2 });
      B.cyl(steel, 0.05, 0.05, 0.5, x, 0.54, z, { seg: 8 });
      B.cyl(gold, 0.36, 0.36, 0.05, x, 1.02, z, { seg: 20 });
      for (let j = 0; j < 8; j++) {
        const b = (j / 8) * PI * 2;
        const wx = x + Math.cos(b) * 1.02, wz = z + Math.sin(b) * 1.02;
        k.collider(wx - 0.26, wx + 0.26, wz - 0.26, wz + 0.26, 0.3, 1.28, true);
      }
      k.collider(x - 0.78, x + 0.78, z - 0.78, z + 0.78, 0, 0.54, true);
    }
    // entrance sign on posts facing the plaza
    for (const s of [-1, 1]) { B.cyl(white, 0.07, 0.07, 3.0, tcx - 6.1, 0, tcz + s * 1.3, { seg: 8 }); B.sphere(gold, 0.1, tcx - 6.1, 3.05, tcz + s * 1.3, { ws: 8, hs: 6 }); }
    B.box(pink, 0.1, 0.72, 2.7, tcx - 6.1, 2.2, tcz, { flat: true });
    B.geo(sCups, new THREE.PlaneGeometry(2.6, 0.65), tcx - 6.16, 2.56, tcz, { ry: -PI / 2 });
    k.collider(tcx - 6.2, tcx - 6.0, tcz - 1.4, tcz - 1.2, 0, 3.0, true);
    k.collider(tcx - 6.2, tcx - 6.0, tcz + 1.2, tcz + 1.4, 0, 3.0, true);
    lamp(9.2, 12.8, false); lamp(22.2, 3.2, false);
    bed(10.2, 2.0, 1.2);
    k.room("Teacups", 9.5, X1, 1.5, 14);
  }

  // ================= FERRIS WHEEL (north) =================
  {
    const wx = 0, wz = -18.6, H = 11.3, R = 9;
    // boarding platform
    B.box(concrete, 8, 0.35, 6.4, wx, 0, wz, { flat: true, uv: 2, world: true });
    k.collider(wx - 4, wx + 4, wz - 3.2, wz + 3.2, 0, 0.35, true);
    B.box(yellow, 8.04, 0.06, 0.1, wx, 0.3, wz + 3.2, { flat: true });
    // legs (A-frames front and back)
    for (const s of [-1, 1]) {
      const top: V3t = [wx, H, wz + s * 1.2];
      for (const lx of [-1, 1]) {
        const foot: V3t = [wx + lx * 5.6, 0.3, wz + s * 2.9];
        B.rod(whiteMetal, 0.26, top, foot, 12);
        B.box(concrete, 1.3, 0.5, 1.3, foot[0], 0, foot[2], { uv: 1 });
        for (let i = 0; i < 8; i++) {
          const t0 = i / 8, t1 = (i + 1) / 8;
          const ax = top[0] + (foot[0] - top[0]) * t0, ay = top[1] + (foot[1] - top[1]) * t0, az = top[2] + (foot[2] - top[2]) * t0;
          const bx = top[0] + (foot[0] - top[0]) * t1, by = top[1] + (foot[1] - top[1]) * t1, bz = top[2] + (foot[2] - top[2]) * t1;
          k.collider(Math.min(ax, bx) - 0.28, Math.max(ax, bx) + 0.28, Math.min(az, bz) - 0.28, Math.max(az, bz) + 0.28, Math.min(ay, by), Math.max(ay, by), true);
        }
      }
      for (const t of [0.35, 0.62, 0.85]) {
        const y = H + (0.3 - H) * t, dx = 5.6 * t, zz = wz + s * (1.2 + 1.7 * t);
        B.rod(whiteMetal, 0.1, [wx - dx, y, zz], [wx + dx, y, zz], 8);
      }
      B.rod(whiteMetal, 0.08, [wx - 5.6 * 0.85, H + (0.3 - H) * 0.85, wz + s * (1.2 + 1.7 * 0.85)], [wx, H + (0.3 - H) * 0.35, wz + s * (1.2 + 1.7 * 0.35)], 8);
      B.rod(whiteMetal, 0.08, [wx + 5.6 * 0.85, H + (0.3 - H) * 0.85, wz + s * (1.2 + 1.7 * 0.85)], [wx, H + (0.3 - H) * 0.35, wz + s * (1.2 + 1.7 * 0.35)], 8);
    }
    // axle, hub
    B.cyl(steel, 0.25, 0.25, 3.0, wx, H - 1.5, wz, { rx: PI / 2, seg: 14 });
    B.geo(red, new THREE.CylinderGeometry(0.9, 0.9, 1.4, 24), wx, H, wz, { rx: PI / 2 });
    B.geo(gold, new THREE.CylinderGeometry(0.5, 0.5, 1.6, 16), wx, H, wz, { rx: PI / 2 });
    k.collider(wx - 0.9, wx + 0.9, wz - 1.5, wz + 1.5, H - 0.9, H + 0.9, true);
    // rims, spokes and truss (two wheel planes)
    const SP = 24;
    for (const s of [-1, 1]) {
      const z = wz + s * 0.55;
      B.geo(whiteMetal, new THREE.TorusGeometry(R, 0.13, 6, 96), wx, H, z);
      B.geo(red, new THREE.TorusGeometry(R - 1.1, 0.09, 6, 96), wx, H, z);
      B.geo(whiteMetal, new THREE.TorusGeometry(R * 0.45, 0.07, 6, 64), wx, H, z);
      for (let i = 0; i < SP; i++) {
        const a = (i / SP) * PI * 2;
        B.rod(whiteMetal, 0.055, [wx + Math.cos(a) * 0.8, H + Math.sin(a) * 0.8, z], [wx + Math.cos(a) * R, H + Math.sin(a) * R, z], 6);
        const a2 = ((i + 0.5) / SP) * PI * 2;
        B.rod(whiteMetal, 0.04, [wx + Math.cos(a) * (R - 1.1), H + Math.sin(a) * (R - 1.1), z], [wx + Math.cos(a2) * R, H + Math.sin(a2) * R, z], 5);
        B.rod(whiteMetal, 0.04, [wx + Math.cos(a2) * R, H + Math.sin(a2) * R, z], [wx + Math.cos(a + (PI * 2) / SP) * (R - 1.1), H + Math.sin(a + (PI * 2) / SP) * (R - 1.1), z], 5);
      }
      for (let i = 0; i < 64; i++) { const a = (i / 64) * PI * 2; bulbs.push({ pos: [wx + Math.cos(a) * (R + 0.14), H + Math.sin(a) * (R + 0.14), z + s * 0.05] }); }
      for (let i = 0; i < SP; i++) { const a = (i / SP) * PI * 2; bulbs.push({ pos: [wx + Math.cos(a) * R * 0.72, H + Math.sin(a) * R * 0.72, z + s * 0.08] }); }
    }
    for (let i = 0; i < SP; i++) { const a = (i / SP) * PI * 2; B.rod(whiteMetal, 0.05, [wx + Math.cos(a) * R, H + Math.sin(a) * R, wz - 0.55], [wx + Math.cos(a) * R, H + Math.sin(a) * R, wz + 0.55], 6); }
    // rim colliders (climbable ring)
    for (let i = 0; i < 28; i++) {
      const a0 = (i / 28) * PI * 2, a1 = ((i + 1) / 28) * PI * 2;
      const x0 = wx + Math.cos(a0) * R, y0 = H + Math.sin(a0) * R, x1 = wx + Math.cos(a1) * R, y1 = H + Math.sin(a1) * R;
      k.collider(Math.min(x0, x1) - 0.15, Math.max(x0, x1) + 0.15, wz - 0.7, wz + 0.7, Math.min(y0, y1) - 0.15, Math.max(y0, y1) + 0.15, true);
    }
    // cabins
    const cabCols = [red, yellow, blue, green, orange, purple, teal, pink];
    for (let i = 0; i < 12; i++) {
      const a = -PI / 2 + (i / 12) * PI * 2;
      const ax = wx + Math.cos(a) * R, ay = H + Math.sin(a) * R;
      const cm = cabCols[i % cabCols.length];
      const bot = ay - 1.95;
      B.at(ax, bot, wz, 0);
      B.rod(steel, 0.05, [0, 1.95, -0.62], [0, 1.95, 0.62], 8);
      for (const sz of [-0.5, 0.5]) B.rod(steel, 0.035, [0, 1.95, sz], [0, 1.55, sz * 0.8], 6);
      B.box(cm, 1.6, 0.12, 1.4, 0, 0, 0);
      for (const sz of [-0.66, 0.66]) B.box(cm, 1.6, 0.62, 0.08, 0, 0.1, sz);
      for (const sx of [-0.76, 0.76]) B.box(cm, 0.08, 0.62, 1.4, sx, 0.1, 0);
      B.box(white, 1.64, 0.06, 1.44, 0, 0.72, 0);
      for (const sx of [-0.76, 0.76]) for (const sz of [-0.66, 0.66]) B.box(white, 0.06, 0.62, 0.06, sx, 0.72, sz, { flat: true });
      B.lathe(cm, [[1.02, 0], [0.95, 0.12], [0.6, 0.28], [0.15, 0.36], [0, 0.37]], 0, 1.33, 0, { seg: 16, s: [0.82, 1, 0.72] });
      B.sphere(gold, 0.07, 0, 1.72, 0, { ws: 8, hs: 6 });
      for (const sx of [-0.5, 0.5]) B.box(woodSlat, 0.35, 0.3, 1.2, sx, 0.12, 0, { uv: 0.6 });
      B.col(-0.8, 0.8, 0, 0.14, -0.7, 0.7, true);
      B.col(-0.8, 0.8, 0.14, 0.72, -0.7, -0.62, true);
      B.col(-0.8, 0.8, 0.14, 0.72, 0.62, 0.7, true);
      B.col(-0.85, 0.85, 1.33, 1.72, -0.75, 0.75, true);
      B.xf = null;
    }
    // operator booth and sign
    B.at(wx + 5.2, 0, wz + 4.4, 0);
    B.box(boardsWhite, 1.4, 2.2, 1.2, 0, 0, 0, { uv: 2, world: true });
    B.box(glass, 1.2, 0.8, 0.02, 0, 1.2, 0.61, { flat: true });
    B.box(blue, 1.6, 0.12, 1.4, 0, 2.2, 0);
    B.col(-0.75, 0.75, 0, 2.32, -0.65, 0.65, true);
    B.xf = null;
    for (const s of [-1, 1]) B.cyl(white, 0.07, 0.07, 3.0, wx + s * 1.8, 0, wz + 4.9, { seg: 8 });
    B.box(blue, 3.8, 0.8, 0.1, wx, 2.2, wz + 4.9, { flat: true });
    B.geo(sWheel, new THREE.PlaneGeometry(3.6, 0.7), wx, 2.6, wz + 4.96);
    k.collider(wx - 1.9, wx - 1.7, wz + 4.8, wz + 5.0, 0, 3.0, true);
    k.collider(wx + 1.7, wx + 1.9, wz + 4.8, wz + 5.0, 0, 3.0, true);
    // queue rails
    for (const [a, b] of [[[-4.2, -13.2], [-1.4, -13.2]], [[1.4, -13.2], [4.2, -13.2]]] as const) {
      B.rod(steel, 0.03, [a[0], 0.95, a[1]], [b[0], 0.95, b[1]], 6);
      for (const p of [a, b]) B.cyl(steel, 0.04, 0.04, 0.95, p[0], 0, p[1], { seg: 6 });
    }
    k.collider(-4.25, -1.35, -13.25, -13.15, 0, 0.98, true);
    k.collider(1.35, 4.25, -13.25, -13.15, 0, 0.98, true);
    bed(-8.2, -10.4, 1.6); bed(8.4, -10.4, 1.3);
    lamp(-6.8, -13.8, false); lamp(6.8, -13.8, false);
    bench(-9.6, -21.5, PI / 2); bin(-9.6, -19.4, red);
    balloonBunch(-9.8, 1.0, -16.2, 9, 0.45);
    k.room("Ferris Wheel", -10, 10.5, Z0, -9);
  }

  // ================= ROLLER COASTER (north-east) =================
  {
    const cx = 19.2, cz = -14.4, rx = 6.6, rz = 8.6;
    const N = 168;
    const P: THREE.Vector3[] = [];
    for (let i = 0; i < N; i++) {
      const th = (i / N) * PI * 2 + PI / 2; // i=0 → station (south side)
      const ph = th - PI / 2;
      const y = 1.25 + 3.3 * (1 - Math.cos(ph)) + 0.9 * Math.pow(Math.sin(1.5 * ph), 2) * (1 - Math.cos(ph)) * 0.5;
      P.push(new V3(cx + rx * Math.cos(th), y, cz + rz * Math.sin(th)));
    }
    const up = new V3(0, 1, 0);
    const tan = (i: number) => P[(i + 1) % N].clone().sub(P[(i - 1 + N) % N]).normalize();
    const lat = (i: number) => new V3().crossVectors(tan(i), up).normalize();
    const railL: V3t[] = [], railR: V3t[] = [], spine: V3t[] = [];
    const ties: Inst[] = [], webs: Inst[] = [];
    for (let i = 0; i < N; i++) {
      const p = P[i], l = lat(i);
      railL.push([p.x + l.x * 0.5, p.y, p.z + l.z * 0.5]);
      railR.push([p.x - l.x * 0.5, p.y, p.z - l.z * 0.5]);
      spine.push([p.x, p.y - 0.42, p.z]);
      const ry = Math.atan2(-l.z, l.x);
      ties.push({ pos: [p.x, p.y - 0.08, p.z], rotY: ry });
      webs.push({ pos: [p.x, p.y - 0.25, p.z], rotY: ry });
    }
    B.tube(steel, railL, 0.055, { closed: true, seg: N * 2, rs: 6 });
    B.tube(steel, railR, 0.055, { closed: true, seg: N * 2, rs: 6 });
    B.tube(red, spine, 0.17, { closed: true, seg: N * 2, rs: 10 });
    k.instances(new THREE.BoxGeometry(1.2, 0.07, 0.14), steelDark, ties);
    k.instances(new THREE.BoxGeometry(0.1, 0.3, 0.1), red, webs);
    // track colliders
    for (let i = 0; i < N; i += 4) {
      let mnx = Infinity, mxx = -Infinity, mnz = Infinity, mxz = -Infinity, mny = Infinity, mxy = -Infinity;
      for (let j = i; j <= i + 4; j++) { const p = P[j % N]; mnx = Math.min(mnx, p.x); mxx = Math.max(mxx, p.x); mnz = Math.min(mnz, p.z); mxz = Math.max(mxz, p.z); mny = Math.min(mny, p.y); mxy = Math.max(mxy, p.y); }
      k.collider(mnx - 0.55, mxx + 0.55, mnz - 0.55, mxz + 0.55, mny - 0.6, mxy + 0.06, true);
    }
    // supports
    for (let i = 8; i < N - 8; i += 7) {
      const p = P[i], l = lat(i);
      const topY = p.y - 0.55;
      if (topY < 0.6) continue;
      if (topY > 4.5) {
        // splayed pair of columns
        for (const s of [-1, 1]) {
          const f: V3t = [p.x + l.x * s * 1.3, 0, p.z + l.z * s * 1.3];
          B.rod(red, 0.14, [p.x + l.x * s * 0.35, topY, p.z + l.z * s * 0.35], f, 10);
          B.cyl(concrete, 0.3, 0.34, 0.25, f[0], 0, f[2], { seg: 12 });
          k.collider(f[0] - 0.3, f[0] + 0.3, f[2] - 0.3, f[2] + 0.3, 0, topY * 0.6, true);
        }
        B.rod(red, 0.07, [p.x + l.x * 1.0, topY * 0.35, p.z + l.z * 1.0], [p.x - l.x * 1.0, topY * 0.35, p.z - l.z * 1.0], 6);
      } else {
        B.cyl(red, 0.16, 0.16, topY, p.x, 0, p.z, { seg: 12 });
        B.cyl(concrete, 0.34, 0.38, 0.25, p.x, 0, p.z, { seg: 12 });
        k.collider(p.x - 0.22, p.x + 0.22, p.z - 0.22, p.z + 0.22, 0, topY, true);
      }
      B.rod(red, 0.09, [p.x + l.x * 0.55, topY, p.z + l.z * 0.55], [p.x - l.x * 0.55, topY, p.z - l.z * 0.55], 8);
      B.rod(red, 0.08, [p.x, topY, p.z], [p.x, p.y - 0.42, p.z], 8);
    }
    // station: platform, stairs, roof
    const sz = cz + rz; // track z at the station
    B.box(stoneW, 8.6, 0.9, 1.9, cx, 0, sz + 1.55, { flat: true, uv: 2, world: true, solid: true, stand: true });
    B.box(yellow, 8.6, 0.05, 0.12, cx, 0.9, sz + 0.66, { flat: true });
    for (let i = 0; i < 2; i++) B.box(stoneW, 1.2, 0.3 * (i + 1), 1.9, cx + 4.9 + (1 - i) * 1.2, 0, sz + 1.55, { flat: true, uv: 2, world: true, solid: true, stand: true });
    for (const px of [cx - 4.1, cx, cx + 4.1]) {
      B.cyl(white, 0.1, 0.1, 3.4, px, 0.9, sz + 2.35, { seg: 10 });
      B.cyl(white, 0.1, 0.1, 4.3, px, 0, sz - 1.1, { seg: 10 });
      k.collider(px - 0.14, px + 0.14, sz + 2.2, sz + 2.5, 0, 4.3, true);
      k.collider(px - 0.14, px + 0.14, sz - 1.25, sz - 0.95, 0, 4.3, true);
    }
    B.box(stripeGW, 9.4, 0.18, 4.2, cx, 4.3, sz + 0.65, { flat: true, uv: 1, world: true });
    B.box(green, 9.5, 0.5, 0.1, cx, 4.0, sz + 2.8, { flat: true });
    B.geo(valGY, new THREE.PlaneGeometry(9.4, 0.34), cx, 3.85, sz + 2.86, { su: 6 });
    k.collider(cx - 4.7, cx + 4.7, sz - 1.45, sz + 2.8, 4.3, 4.48, true);
    B.geo(sCoaster, new THREE.PlaneGeometry(4.4, 1.1), cx, 5.05, sz + 2.2);
    B.box(green, 4.6, 1.3, 0.1, cx, 4.4, sz + 2.14, { flat: true });
    // queue rail on the platform (back edge)
    B.rod(steel, 0.03, [cx - 4.2, 1.9, sz + 2.45], [cx + 4.2, 1.9, sz + 2.45], 6);
    // train (3 cars)
    const carCols = [yellow, blue, orange];
    for (let c = 0; c < 3; c++) {
      const i = (N - 3 + c * 5) % N;
      const p = P[i], t = tan(i);
      B.at(p.x, p.y, p.z, Math.atan2(-t.z, t.x));
      const cm = carCols[c];
      B.box(steelDark, 1.7, 0.18, 1.0, 0, 0.02, 0);
      B.box(cm, 1.6, 0.5, 1.12, 0, 0.2, 0);
      B.box(cm, 0.3, 0.55, 1.12, 0.72, 0.5, 0, { rz: -0.35 });
      B.box(darkInside, 0.9, 0.12, 0.9, -0.1, 0.62, 0);
      B.box(red, 0.12, 0.45, 0.9, -0.55, 0.6, 0);
      B.box(red, 0.12, 0.45, 0.9, 0.2, 0.6, 0);
      B.geo(steel, new THREE.TorusGeometry(0.3, 0.03, 5, 12, PI), -0.1, 0.72, 0, { ry: PI / 2 });
      if (c === 0) { B.sphere(green, 0.28, 0.95, 0.75, 0, { s: [1.2, 0.9, 1] }); for (const s of [-1, 1]) B.sphere(white, 0.07, 1.15, 0.85, s * 0.14, { ws: 8, hs: 6 }); }
      for (const wx of [-0.55, 0.55]) for (const wz of [-0.45, 0.45]) B.cyl(steelDark, 0.1, 0.1, 0.08, wx, -0.06, wz, { rx: PI / 2, seg: 10 });
      B.col(-0.85, 0.85, 0.05, 0.75, -0.58, 0.58, true);
      B.xf = null;
    }
    bench(cx - 1.5, sz + 5.1, PI); bench(cx + 3.5, sz + 5.1, PI);
    bin(cx - 5.4, sz + 3.6, green);
    lamp(cx - 6.2, sz + 4.4, false);
    bed(19.2, -14.5, 2.0);
    k.room("Roller Coaster", 10.5, X1, Z0, 1.5);
  }

  // ================= BUMPER CARS (north-west) =================
  {
    const ax0 = -26.6, ax1 = -13.6, az0 = -24.6, az1 = -13.2;
    const acx = (ax0 + ax1) / 2, acz = (az0 + az1) / 2;
    const W = ax1 - ax0, D = az1 - az0;
    B.box(steelFloor, W, 0.14, D, acx, 0, acz, { flat: true, uv: 3, world: true });
    k.collider(ax0, ax1, az0, az1, 0, 0.14, true);
    // bumper wall with two openings (south at x=-20, east at z=-18.5)
    const wallSeg = (x0: number, x1: number, z0: number, z1: number) => {
      const w = Math.max(0.2, x1 - x0), d = Math.max(0.2, z1 - z0);
      B.box(stripeYR, w, 0.5, d, (x0 + x1) / 2, 0.14, (z0 + z1) / 2, { flat: true, uv: 1, world: true, solid: true, stand: true });
      B.box(rubber, w + 0.06, 0.16, d + 0.06, (x0 + x1) / 2, 0.3, (z0 + z1) / 2, { flat: true, uv: 0.5, world: true });
      B.box(white, w + 0.04, 0.05, d + 0.04, (x0 + x1) / 2, 0.64, (z0 + z1) / 2, { flat: true });
    };
    wallSeg(ax0, ax1, az0, az0 + 0.2);
    wallSeg(ax0, ax0 + 0.2, az0, az1);
    wallSeg(ax0, -24.2, az1 - 0.2, az1);
    wallSeg(-21.8, ax1, az1 - 0.2, az1);
    wallSeg(ax1 - 0.2, ax1, az0, -22.6);
    wallSeg(ax1 - 0.2, ax1, -20.2, az1);
    // roof on posts
    const RH = 4.6;
    for (const px of [ax0 + 0.1, acx, ax1 - 0.1]) for (const pz of [az0 + 0.1, az1 - 0.1]) {
      B.cyl(yellow, 0.14, 0.14, RH, px, 0, pz, { seg: 12 });
      k.collider(px - 0.18, px + 0.18, pz - 0.18, pz + 0.18, 0, RH + 0.25, true);
    }
    for (const pz of [acz]) for (const px of [ax0 + 0.1, ax1 - 0.1]) { B.cyl(yellow, 0.14, 0.14, RH, px, 0, pz, { seg: 12 }); k.collider(px - 0.18, px + 0.18, pz - 0.18, pz + 0.18, 0, RH + 0.25, true); }
    B.box(navy, W + 0.6, 0.2, D + 0.6, acx, RH, acz, { flat: true });
    k.collider(ax0 - 0.3, ax1 + 0.3, az0 - 0.3, az1 + 0.3, RH, RH + 0.25, true);
    // fascia band with signs + bulbs
    for (const [fx, fz, fw, fd] of [[acx, az1 + 0.3, W + 0.7, 0.1], [acx, az0 - 0.3, W + 0.7, 0.1], [ax0 - 0.3, acz, 0.1, D + 0.7], [ax1 + 0.3, acz, 0.1, D + 0.7]] as const)
      B.box(stripeBW, fw, 0.8, fd, fx, RH - 0.4, fz, { flat: true, uv: 1.6, world: true });
    B.box(orange, 5.4, 1.0, 0.1, acx, RH + 0.2, az1 + 0.36, { flat: true });
    B.geo(sBumper, new THREE.PlaneGeometry(5.2, 1.0), acx, RH + 0.7, az1 + 0.42);
    B.box(orange, 0.1, 1.0, 4.6, ax1 + 0.36, RH + 0.2, acz, { flat: true });
    B.geo(sBumper, new THREE.PlaneGeometry(4.4, 0.85), ax1 + 0.42, RH + 0.7, acz, { ry: PI / 2 });
    for (let x = ax0; x <= ax1; x += 0.5) bulbs.push({ pos: [x, RH - 0.05, az1 + 0.37] });
    for (let z = az0; z <= az1; z += 0.5) bulbs.push({ pos: [ax1 + 0.37, RH - 0.05, z] });
    // electric ceiling mesh
    const mg = new THREE.PlaneGeometry(W - 0.4, D - 0.4); mg.rotateX(PI / 2);
    B.geo(lattice, mg, acx, RH - 0.25, acz);
    // cars
    const carCols = [red, blue, yellow, green, purple, orange, teal, pink];
    const spots: [number, number, number][] = [[-24.5, -22.4, 0.4], [-21.2, -21.8, 2.2], [-17.2, -22.6, -0.6], [-24.2, -16.2, -1.9], [-19.6, -16.4, 1.2], [-16.0, -17.9, 3.0], [-22.4, -19.2, -0.2], [-17.6, -20.2, 1.8]];
    spots.forEach(([x, z, ry], i) => {
      B.at(x, 0.14, z, ry);
      const cm = carCols[i % carCols.length];
      B.box(steelDark, 1.9, 0.2, 1.25, 0, 0.02, 0);
      B.geo(rubber, new THREE.TorusGeometry(1, 0.13, 8, 28), 0, 0.28, 0, { rx: PI / 2, s: [1.02, 0.66, 1] });
      B.box(cm, 1.6, 0.42, 1.08, 0, 0.26, 0);
      B.box(cm, 0.5, 0.3, 1.0, 0.62, 0.62, 0, { rz: 0.35 });
      B.box(darkInside, 0.55, 0.1, 0.8, -0.2, 0.66, 0);
      B.box(cm, 0.2, 0.55, 1.0, -0.62, 0.62, 0);
      B.box(white, 0.03, 0.2, 0.4, 0.8, 0.45, 0, { flat: true });
      B.cyl(steel, 0.02, 0.02, 0.35, 0.28, 0.66, 0, { rz: 0.5, seg: 6 });
      B.geo(iron, new THREE.TorusGeometry(0.15, 0.025, 5, 14), 0.2, 0.84, 0, { ry: PI / 2, rz: 0.5 });
      B.cyl(steel, 0.03, 0.03, RH - 0.25 - 1.1 - 0.14, -0.72, 1.1, 0, { seg: 6 });
      B.box(steel, 0.08, 0.1, 0.3, -0.72, RH - 0.4 - 0.14, 0, { flat: true });
      B.col(-0.95, 0.95, 0, 0.85, -0.62, 0.62, true);
      B.xf = null;
    });
    // outside: bench, bin, beds
    bench(-12.2, -23.8, -PI / 2); bin(-12.2, -14.6, green); bed(-11.8, -18.8, 1.1);
    k.room("Bumper Cars", X0, -11, Z0, -12.5);
  }

  // ================= extra lamps & string lights across the park =================
  lamp(-8.4, 12.8, false); lamp(8.8, -1.2, false); lamp(-24.5, 2.5, false); lamp(24.8, -1.6, false); lamp(-11.3, -9.5, false); lamp(11.2, -9.2, false);
  festoon([-5.7, 3.5, 6.2], [-8.2, 3.5, 7.2], 0.3);
  festoon([5.7, 3.5, 6.2], [9.2, 3.5, 12.8], 0.6);
  bench(-8.8, -8, PI / 2); bench(9.6, 12.6, PI);
  bin(0, -8.5, green); bin(-9.6, 11.4, red);
  balloonBunch(8.0, 1.0, -1.6, 8, 0.4);

  // ================= instanced details =================
  k.instances(new THREE.SphereGeometry(0.05, 8, 6), bulbM, bulbs, { noShadow: true });
  k.instances(new THREE.SphereGeometry(0.24, 14, 10), glossy, balloons);
  k.instances(new THREE.IcosahedronGeometry(0.07, 0), matte, flowers, { noShadow: true });
  k.instances(new THREE.SphereGeometry(1, 12, 9), plushM, plush);
  k.instances(new THREE.BoxGeometry(0.03, 1, 0.03), ironGreen, pickets);
  k.instances(new THREE.BoxGeometry(0.12, 1, 0.12), ironGreen, posts);
  k.instances(new THREE.SphereGeometry(0.08, 8, 6), gold, finials);
  k.instances(new THREE.CylinderGeometry(0.14, 0.22, 2.4, 8), bark, trunks);
  k.instances(new THREE.IcosahedronGeometry(1, 1), leaves, crowns);
  {
    const fs = new THREE.Shape(); fs.moveTo(-0.16, 0); fs.lineTo(0.16, 0); fs.lineTo(0, -0.34); fs.lineTo(-0.16, 0);
    const fl = M(null, "#ffffff", { roughness: 0.7, transparent: true });
    fl.m.alphaTest = 0;
    k.instances(new THREE.ShapeGeometry(fs), fl, flags, { noShadow: true });
    const bottleGeo = new THREE.LatheGeometry([[0, 0], [0.05, 0], [0.05, 0.16], [0.02, 0.22], [0.018, 0.28], [0, 0.28]].map(([r, h]) => new THREE.Vector2(r, h)), 10);
    k.instances(bottleGeo, M(null, "#ffffff", { roughness: 0.15, metalness: 0.2 }), bottles);
  }

  B.flush();

  // ---------------- spawns & lighting ----------------
  const hiders: THREE.Vector3[] = [];
  for (let i = 0; i < 24; i++) hiders.push(new THREE.Vector3(-2.5 + (i % 6) * 1.0, 0, 9.3 + Math.floor(i / 6) * 1.0));
  const hunters: THREE.Vector3[] = [];
  for (let i = 0; i < 9; i++) hunters.push(new THREE.Vector3(-1.2 + (i % 3) * 1.2, 0, 22.8 + Math.floor(i / 3) * 0.95));

  return k.finish({
    id: "amusement", name: "Amusement Park",
    bounds: { minX: X0, maxX: X1, minZ: Z0, maxZ: Z1 },
    hunterSpawns: hunters, hiderSpawns: hiders,
    preview: { pos: [12, 7.5, 18.5], look: [-3, 4.5, -8], fov: 62 },
    lighting: {
      sky: "#9cc8ec",
      hemi: ["#dff0ff", "#7d7a62", 0.5],
      sun: { color: "#fff1dc", int: 2.7, pos: [-12, 28, 16] },
      fog: ["#cfe2f2", 55, 170],
      points: [
        { pos: [-16, 3.8, 0.5], color: "#ffd89a", int: 5, dist: 9 },
        { pos: [-20, 3.8, -18.9], color: "#e6f0ff", int: 5, dist: 10 },
        { pos: [-17.2, 2.6, 19.4], color: "#ffe2b0", int: 3, dist: 6 },
        { pos: [0, 4.6, 21.5], color: "#ffe2a0", int: 3, dist: 8 },
        { pos: [19.2, 3.6, -4.2], color: "#ffe9c0", int: 3, dist: 7 },
      ],
      exposure: 1.0,
      hdri: "park",
      env: 0.85,
      hdriBackground: 0.03,
    },
  });
}
