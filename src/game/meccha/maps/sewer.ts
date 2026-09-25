// Sewer (下水道) — a big red-brick storm sewer. Layout (x → east, z → south):
//  - Main Channel: a tall arched brick tunnel with a muddy reflective water channel and raised concrete walkways.
//  - Flood Basin (north): a high chamber with a muddy pool, concrete platforms, sandbag walls and huge rusty pipes.
//  - East Culvert: a narrower arched tunnel lined with black corrugated ducts, neon graffiti, drums and IBC tanks.
//  - Brick Hall (west): broken, uneven floor slabs, bricked-up arches, lockers covered in graffiti, a blue trolley,
//    shelves, a striped tank and a rainbow decoration.
//  - Pink Room: the hidden cosy room (round porthole window, painted windows, pink lamps, red table and chairs).
//  - Maintenance Entrance (south): where hunters arrive.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import * as S from "./tex/sewer";
import { Kit, type Mat, type World } from "./kit";

// ---------------------------------------------------------------------------------------------
// Local batching helper: every piece is pre-transformed and merged per material (few draw calls).
type BO = { rx?: number; ry?: number; rz?: number; uv?: number; world?: boolean; flat?: boolean; su?: number; sv?: number };
type V3 = [number, number, number];
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
function swapUV(g: THREE.BufferGeometry) {
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) { const u = uv.getX(i); uv.setXY(i, uv.getY(i), u); }
}
class Batch {
  private lists = new Map<Mat, THREE.BufferGeometry[]>();
  private noShadow = new Set<Mat>();
  private rnd = S.rng(99);
  meshes = new Map<Mat, THREE.Mesh>();
  constructor(private k: Kit) {}
  flat(m: Mat) { this.noShadow.add(m); }
  push(m: Mat, g: THREE.BufferGeometry) {
    let l = this.lists.get(m);
    if (!l) this.lists.set(m, (l = []));
    l.push(g);
    return g;
  }
  geo(m: Mat, g: THREE.BufferGeometry, x: number, y: number, z: number, o: BO = {}) {
    if (o.uv && !o.world) boxUV(g, o.uv, this.rnd(), this.rnd());
    if (o.su || o.sv) scaleUV(g, o.su ?? 1, o.sv ?? 1);
    const e = new THREE.Euler(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0, "YXZ");
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(e), new THREE.Vector3(1, 1, 1)));
    if (o.uv && o.world) boxUV(g, o.uv);
    return this.push(m, g);
  }
  box(m: Mat, w: number, h: number, d: number, x: number, y: number, z: number, o: BO = {}) {
    const mn = Math.min(w, h, d), mx = Math.max(w, h, d);
    const g = o.flat || mn < 0.06 || mx > 4.5 ? new THREE.BoxGeometry(w, h, d) : new RoundedBoxGeometry(w, h, d, 1, Math.min(0.03, mn * 0.2));
    return this.geo(m, g, x, y + h / 2, z, o);
  }
  cyl(m: Mat, rt: number, rb: number, h: number, x: number, y: number, z: number, o: BO & { seg?: number; open?: boolean } = {}) {
    return this.geo(m, new THREE.CylinderGeometry(rt, rb, h, o.seg ?? 16, 1, o.open), x, y + h / 2, z, o);
  }
  rod(m: Mat, r: number, a: V3, b: V3, seg = 8, closed = false) {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
    const len = va.distanceTo(vb);
    const g = new THREE.CylinderGeometry(r, r, len, seg, 1, !closed);
    scaleUV(g, Math.max(1, (2 * Math.PI * r) / 1.0), len);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
    g.applyMatrix4(new THREE.Matrix4().compose(va.clone().add(vb).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
    return this.push(m, g);
  }
  flush() {
    for (const [m, l] of this.lists) if (l.length) this.meshes.set(m, this.k.merged(l, m, { noShadow: this.noShadow.has(m) }));
    this.lists.clear();
  }
}
// ---------------------------------------------------------------------------------------------

type R = [number, number, number, number]; // x1,x2,z1,z2
const SPLIT = 3.02; // everything above goes to the "high" batch (hidden by the plan-view tool)

export function buildSewer(): World {
  const k = new Kit(5, 3);
  const B = new Batch(k); // low
  const H = new Batch(k); // high (ceilings, vaults, upper walls)
  const rnd = S.rng(777);
  const FY = 0.44; // walkway level
  const WY = 0.12; // water surface
  const BX0 = -25, BX1 = 18, BZ0 = -24, BZ1 = 24;

  // ---------- materials ----------
  const brick = k.mat(k.tex("s2-brick", () => S.redBrick(3)), "#fff", [1, 1], { roughness: 0.78, bump: 1.1 });
  const brickDark = k.mat(brick.ptex, "#c9b4a8", [1, 1], { roughness: 0.8, bump: 1.0 });
  const brickPink = k.mat(brick.ptex, "#e8c2cc", [1, 1], { roughness: 0.75, bump: 1.0 });
  brickDark.m.side = THREE.DoubleSide;
  brickPink.m.side = THREE.DoubleSide;
  const slabM = k.mat(k.tex("s2-slab", () => S.slab(2)), "#fff", [1, 1], { roughness: 0.42, bump: 0.8 });
  const walkM = k.mat(slabM.ptex, "#e2e2de", [1, 1], { roughness: 0.5, bump: 0.7 });
  const conc = k.mat(k.tex("s2-conc", () => S.concrete2(1)), "#fff", [1, 1], { roughness: 0.85, bump: 0.8 });
  const concDark = k.mat(conc.ptex, "#77797a", [1, 1], { roughness: 0.9, bump: 0.7 });
  const stone = k.mat(conc.ptex, "#c4c2bc", [1, 1], { roughness: 0.8, bump: 0.9 });
  const waterM = k.mat(k.tex("s2-water", () => S.mudWater(10)), "#fff", [1, 1], { roughness: 0.1, metalness: 0.2, bump: 0.9 });
  waterM.m.userData.flow = [0.004, 0.035]; // המים בתעלה זורמים (המנוע מזיז את הטקסטורה ומשמיע רחש מים)
  const mudM = k.mat(waterM.ptex, "#8a8070", [1, 1], { roughness: 0.3, bump: 1.0 });
  const rustM = k.mat(k.tex("s2-rust", () => S.rust(5, null)), "#fff", [1, 1], { metalness: 0.45, roughness: 0.75, bump: 1.0 });
  const rustDark = k.mat(rustM.ptex, "#8a7064", [1, 1], { metalness: 0.5, roughness: 0.7, bump: 1.0 });
  const ductM = k.mat(k.tex("s2-duct", S.duct), "#fff", [1, 1], { roughness: 0.55, bump: 1.4 });
  const steel = k.mat(null, "#4a4d4c", [1, 1], { metalness: 0.8, roughness: 0.45 });
  const galv = k.mat(null, "#9ea3a4", [1, 1], { metalness: 0.85, roughness: 0.35 });
  const black = k.mat(null, "#0a0a0a", [1, 1], { roughness: 0.9 });
  const drumPlain = k.tex("s2-dplain", () => S.drum("#e6e2dc", 12, null, false));
  const drumRed = k.mat(drumPlain, "#c8401e", [1, 1], { metalness: 0.4, roughness: 0.5, bump: 0.5 });
  const drumGreen = k.mat(k.tex("s2-dgreen", () => S.drum("#1f6a36", 13, "#d9d9d2", false)), "#fff", [1, 1], { metalness: 0.4, roughness: 0.5, bump: 0.5 });
  const drumYellow = k.mat(drumPlain, "#dcb420", [1, 1], { metalness: 0.4, roughness: 0.5, bump: 0.5 });
  const drumBlue = k.mat(drumPlain, "#2a52a8", [1, 1], { metalness: 0.4, roughness: 0.5, bump: 0.5 });
  const drumGrey = k.mat(drumPlain, "#8a9094", [1, 1], { metalness: 0.6, roughness: 0.55, bump: 0.8 });
  const lidM = k.mat(null, "#2a2a28", [1, 1], { metalness: 0.6, roughness: 0.5 });
  const stripeM = k.mat(k.tex("s2-stripe", S.stripeTank), "#fff", [1, 1], { metalness: 0.3, roughness: 0.5, bump: 0.3 });
  const sand = k.mat(k.tex("s2-sand", () => S.burlap("#bdb6a6", 13)), "#fff", [1, 1], { roughness: 1, bump: 0.9 });
  const sandDark = k.mat(sand.ptex, "#c8c0b4", [1, 1], { roughness: 1, bump: 0.9 });
  const plasticW = k.mat(k.tex("s2-plast", () => S.plastic()), "#fff", [1, 1], { roughness: 0.45, bump: 0 });
  const plasticY = k.mat(plasticW.ptex, "#f0b818", [1, 1], { roughness: 0.4, bump: 0.3 });
  const plasticB = k.mat(plasticW.ptex, "#2c48b8", [1, 1], { roughness: 0.4, bump: 0.3 });
  const lockerM = k.mat(k.tex("s2-locker", () => S.locker()), "#fff", [1, 1], { metalness: 0.5, roughness: 0.5, bump: 0.5 });
  const lockerY = k.mat(lockerM.ptex, "#e8d030", [1, 1], { metalness: 0.4, roughness: 0.5, bump: 0.5 });
  const metalGrey = k.mat(k.tex("s2-mgrey", () => S.paintedMetal("#62686b", 6)), "#fff", [1, 1], { metalness: 0.55, roughness: 0.5, bump: 0.4 });
  const cardM = k.mat(k.tex("s2-card", () => S.cardboard()), "#fff", [1, 1], { roughness: 0.95, bump: 0 });
  const woodM = k.mat(k.tex("s2-wood", () => S.planks("#8e5f34", 101)), "#fff", [1, 1], { roughness: 0.8, bump: 0.8 });
  const woodPale = k.mat(woodM.ptex, "#f0d2b0", [1, 1], { roughness: 0.8, bump: 0.8 });
  const redWood = k.mat(woodM.ptex, "#ff6a4a", [1, 1], { roughness: 0.6, bump: 0.5 });
  const fabricT = k.tex("s2-fabric", () => S.fabric("#e8e4e0", 91));
  const cloth = k.mat(fabricT, "#6a1028", [1, 1], { roughness: 0.9, bump: 0.4 });
  const clothTop = k.mat(fabricT, "#e0186a", [1, 1], { roughness: 0.8, bump: 0.3 });
  const cushion = k.mat(fabricT, "#5068c8", [1, 1], { roughness: 0.95, bump: 0.6 });
  const trolleyM = k.mat(fabricT, "#2458d0", [1, 1], { roughness: 0.8, bump: 0.4 });
  const meshM = k.mat(k.tex("s2-mesh", S.meshGrid), "#fff", [1, 1], { transparent: true, metalness: 0.7, roughness: 0.4 });
  const grateM = k.mat(k.tex("s2-grate", S.grate), "#fff", [1, 1], { transparent: true, metalness: 0.6, roughness: 0.5 });
  const skyM = k.mat(k.tex("s2-sky", S.skyWindow), "#fff", [1, 1], { roughness: 0.6, bump: 0 });
  const hazard = k.mat(k.tex("s2-haz", S.hazard), "#fff", [1, 1], { roughness: 0.6, bump: 0 });
  const grafA = k.mat(k.tex("s2-gA", () => S.graffitiA(21)), "#fff", [1, 1], { transparent: true, roughness: 0.6 });
  const grafB = k.mat(k.tex("s2-gB", () => S.graffitiB(33)), "#fff", [1, 1], { transparent: true, roughness: 0.6 });
  const grafBub = k.mat(k.tex("s2-gBub", () => S.graffitiBubble()), "#fff", [1, 1], { transparent: true, roughness: 0.6, emissive: "#ffffff", emissiveIntensity: 0.25 });
  const grafNeon = k.mat(k.tex("s2-gNeon", () => S.graffitiNeon()), "#fff", [1, 1], { transparent: true, roughness: 0.5, emissive: "#ffffff", emissiveIntensity: 0.55 });
  const grafSnake = k.mat(k.tex("s2-gSnake", S.graffitiSnake), "#fff", [1, 1], { transparent: true, roughness: 0.5, emissive: "#ffffff", emissiveIntensity: 0.4 });
  const signExit = k.mat(k.tex("s2-sexit", () => S.sign("EXIT", "#1d6b3a", "#f2f2ea", "MAINTENANCE")), "#fff", [1, 1], { roughness: 0.5, bump: 0, emissive: "#ffffff", emissiveIntensity: 0.25 });
  const signDanger = k.mat(k.tex("s2-sdanger", () => S.sign("DANGER", "#e0b21a", "#111", "DEEP WATER")), "#fff", [1, 1], { roughness: 0.5, bump: 0 });
  const lampWarm = k.mat(null, "#ffe2a8", [1, 1], { emissive: "#ffc670", emissiveIntensity: 3.2 });
  const lampPink = k.mat(null, "#ff9ce8", [1, 1], { emissive: "#ff3fd0", emissiveIntensity: 2.4 });
  const portGlow = k.mat(null, "#a040c0", [1, 1], { emissive: "#c040ff", emissiveIntensity: 1.3 });
  const whiteM = k.mat(null, "#f2f0ea", [1, 1], { roughness: 0.5 });
  const cactusM = k.mat(null, "#5c8a3a", [1, 1], { roughness: 0.8 });
  const potM = k.mat(null, "#e05a7a", [1, 1], { roughness: 0.7 });
  const washM = k.mat(null, "#b01e22", [1, 1], { roughness: 0.35, metalness: 0.2 });
  const glassDark = k.mat(null, "#15181c", [1, 1], { roughness: 0.05, metalness: 0.4 });
  const gasM = k.mat(null, "#c9ccd2", [1, 1], { roughness: 0.35, metalness: 0.5 });
  const trashM = k.mat(null, "#18191b", [1, 1], { roughness: 0.3 });
  const coneM = k.mat(null, "#e2571e", [1, 1], { roughness: 0.6 });
  const rainbowM = k.mat(k.tex("s2-rainbow", S.rainbow), "#fff", [1, 1], { transparent: true, roughness: 0.6, emissive: "#ffffff", emissiveIntensity: 0.3 });
  for (const m of [lampWarm, lampPink, portGlow, grafA, grafB, grafBub, grafNeon, grafSnake, waterM, meshM, grateM, rainbowM]) { B.flat(m); H.flat(m); }

  // ---------- rooms (walkable rectangles) ----------
  type Room = { id: string; name: string; r: R; h: number; wall: Mat };
  const rooms: Room[] = [
    { id: "main", name: "Main Channel", r: [-5, 5, -14, 16], h: SPLIT, wall: brick },
    { id: "basin", name: "Flood Basin", r: [-15, 17, -23, -14], h: 7, wall: brick },
    { id: "east", name: "East Culvert", r: [11, 17, -14, 21], h: SPLIT, wall: brick },
    { id: "crossE", name: "East Culvert", r: [5, 11, 2, 6], h: SPLIT, wall: brick },
    { id: "hall", name: "Brick Hall", r: [-24, -10, -10, 8], h: 5.5, wall: brick },
    { id: "passW", name: "Brick Hall", r: [-10, -5, -4, 0], h: SPLIT, wall: brick },
    { id: "passNW", name: "Flood Basin", r: [-14, -10, -14, -10], h: SPLIT, wall: brick },
    { id: "pink", name: "Pink Room", r: [-24, -16, 11, 19], h: SPLIT, wall: brickPink },
    { id: "passPink", name: "Pink Room", r: [-21.5, -19, 8, 11], h: 2.6, wall: brickPink },
    { id: "entry", name: "Maintenance Entrance", r: [-8, 8, 16, 23], h: 6, wall: brick },
    { id: "passSE", name: "Maintenance Entrance", r: [8, 11, 17.5, 20.5], h: SPLIT, wall: brick },
  ];
  const cs = 0.5;
  const nx = Math.round((BX1 - BX0) / cs), nz = Math.round((BZ1 - BZ0) / cs);
  const cellRoom = new Int16Array(nx * nz).fill(-1);
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const x = BX0 + (i + 0.5) * cs, z = BZ0 + (j + 0.5) * cs;
      cellRoom[j * nx + i] = rooms.findIndex(({ r: [a, b, c, d] }) => x > a && x < b && z > c && z < d);
    }
  const roomAt = (i: number, j: number) => (i < 0 || j < 0 || i >= nx || j >= nz ? -1 : cellRoom[j * nx + i]);

  // ---------- helpers ----------
  const wallPiece = (m: Mat, axis: "x" | "z", fixed: number, a0: number, a1: number, y0: number, y1: number, th: number) => {
    const len = a1 - a0, c = (a0 + a1) / 2;
    const put = (b: Batch, lo: number, hi: number) => {
      if (hi - lo < 0.01) return;
      if (axis === "x") b.box(m, len, hi - lo, th, c, lo, fixed, { flat: true, uv: 1, world: true });
      else b.box(m, th, hi - lo, len, fixed, lo, c, { flat: true, uv: 1, world: true });
    };
    put(B, y0, Math.min(y1, SPLIT));
    put(H, Math.max(y0, SPLIT), y1);
  };
  // automatic walls on every walk/fill boundary + headers between rooms of different height
  {
    const TH = 0.3;
    type Key = { k: string; m: Mat; y0: number; y1: number; off: number } | null;
    const edgeKey = (a: number, b: number): Key => {
      if (a === b) return null;
      if (a < 0 && b >= 0) return { k: `f${b}-`, m: rooms[b].wall, y0: 0, y1: rooms[b].h, off: -TH / 2 };
      if (b < 0 && a >= 0) return { k: `f${a}+`, m: rooms[a].wall, y0: 0, y1: rooms[a].h, off: TH / 2 };
      const ha = rooms[a].h, hb = rooms[b].h;
      if (Math.abs(ha - hb) < 0.01) return null;
      const top = ha > hb ? a : b;
      return { k: `h${a}_${b}`, m: rooms[top].wall, y0: Math.min(ha, hb), y1: Math.max(ha, hb), off: 0 };
    };
    // edges on z lines (walls along x)
    for (let j = 0; j <= nz; j++) {
      let cur: Key = null, start = 0;
      const zl = BZ0 + j * cs;
      for (let i = 0; i <= nx; i++) {
        const key = i < nx ? edgeKey(roomAt(i, j - 1), roomAt(i, j)) : null;
        if (!key || !cur || key.k !== cur.k) {
          if (cur) wallPiece(cur.m, "x", zl + cur.off, BX0 + start * cs, BX0 + i * cs, cur.y0, cur.y1, TH);
          cur = key; start = i;
        }
      }
    }
    // edges on x lines (walls along z)
    for (let i = 0; i <= nx; i++) {
      let cur: Key = null, start = 0;
      const xl = BX0 + i * cs;
      for (let j = 0; j <= nz; j++) {
        const key = j < nz ? edgeKey(roomAt(i - 1, j), roomAt(i, j)) : null;
        if (!key || !cur || key.k !== cur.k) {
          if (cur) wallPiece(cur.m, "z", xl + cur.off, BZ0 + start * cs, BZ0 + j * cs, cur.y0, cur.y1, TH);
          cur = key; start = j;
        }
      }
    }
  }
  // flat ceilings
  for (const rm of rooms) {
    if (rm.id === "main" || rm.id === "east" || rm.id === "pink") continue;
    const [a, b, c, d] = rm.r;
    H.box(rm.id === "passPink" ? brickPink : concDark, b - a + 0.6, 0.25, d - c + 0.6, (a + b) / 2, rm.h, (c + d) / 2, { flat: true, uv: 2, world: true });
  }
  // walkway deck: concrete block from 0 to top, standable
  const deck = (x1: number, x2: number, z1: number, z2: number, top = FY, m = walkM, unit = 1.25) => {
    B.box(m, x2 - x1, top, z2 - z1, (x1 + x2) / 2, 0, (z1 + z2) / 2, { flat: true, uv: unit, world: true });
    k.collider(x1, x2, z1, z2, 0, top, true);
  };
  const waterPlane = (x1: number, x2: number, z1: number, z2: number) => {
    const g = new THREE.PlaneGeometry(x2 - x1, z2 - z1);
    g.rotateX(-Math.PI / 2);
    scaleUV(g, (x2 - x1) / 4.5, (z2 - z1) / 4.5);
    B.geo(waterM, g, (x1 + x2) / 2, WY, (z1 + z2) / 2);
  };
  const decal = (m: Mat, w: number, h: number, x: number, y: number, z: number, ry: number, b = B) => {
    b.geo(m, new THREE.PlaneGeometry(w, h), x, y, z, { ry });
  };
  const rotBox = (x: number, z: number, ry: number, hw: number, hd: number, y0: number, y1: number, stand = true) => {
    const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry));
    const ex = hw * c + hd * s, ez = hw * s + hd * c;
    k.collider(x - ex, x + ex, z - ez, z + ez, y0, y1, stand);
  };
  const L = (x: number, z: number, ry: number, lx: number, lz: number): [number, number] => [x + lx * Math.cos(ry) + lz * Math.sin(ry), z - lx * Math.sin(ry) + lz * Math.cos(ry)];

  // arched vault (half ellipse) over a tunnel; brick courses run along the tunnel
  const vault = (axis: "x" | "z", c: number, a0: number, a1: number, hw: number, rise: number, m: Mat, ribs: number[] = []) => {
    const len = a1 - a0;
    const g = new THREE.CylinderGeometry(1, 1, len, 40, 1, true, -Math.PI / 2, Math.PI);
    const arc = Math.PI * Math.sqrt((hw * hw + rise * rise) / 2);
    swapUV(g);
    scaleUV(g, len, arc);
    g.rotateX(-Math.PI / 2);
    g.scale(hw, rise, 1);
    if (axis === "x") g.rotateY(Math.PI / 2);
    if (axis === "z") H.geo(m, g, c, SPLIT, (a0 + a1) / 2);
    else H.geo(m, g, (a0 + a1) / 2, SPLIT, c);
    // stone ribs (arch rings) + pilasters down the walls
    for (const p of ribs) {
      const sh = new THREE.Shape();
      const N = 28;
      for (let i = 0; i <= N; i++) { const t = (i / N) * Math.PI; sh.lineTo(Math.cos(t) * (hw + 0.02), Math.sin(t) * (rise + 0.02)); }
      for (let i = N; i >= 0; i--) { const t = (i / N) * Math.PI; sh.lineTo(Math.cos(t) * (hw - 0.25), Math.sin(t) * (rise - 0.25)); }
      const rg = new THREE.ExtrudeGeometry(sh, { depth: 0.45, bevelEnabled: false, curveSegments: 4 });
      rg.translate(0, 0, -0.225);
      if (axis === "x") rg.rotateY(Math.PI / 2);
      if (axis === "z") H.geo(stone, rg, c, SPLIT + 0.001, p, { uv: 0.8, world: true });
      else H.geo(stone, rg, p, SPLIT + 0.001, c, { uv: 0.8, world: true });
      for (const s of [-1, 1]) {
        if (axis === "z") B.box(stone, 0.25, SPLIT, 0.45, c + s * (hw - 0.125), 0, p, { flat: true, uv: 0.8, world: true });
        else B.box(stone, 0.45, SPLIT, 0.25, p, 0, c + s * (hw - 0.125), { flat: true, uv: 0.8, world: true });
      }
    }
  };
  // half-ellipse end cap for a vault
  const tympanum = (axis: "x" | "z", c: number, at: number, hw: number, rise: number, m: Mat, face: number) => {
    const sh = new THREE.Shape();
    sh.moveTo(-hw - 0.3, 0);
    for (let i = 0; i <= 28; i++) { const t = Math.PI - (i / 28) * Math.PI; sh.lineTo(Math.cos(t) * (hw + 0.3), Math.sin(t) * (rise + 0.3)); }
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: false, curveSegments: 4 });
    g.translate(0, 0, -0.15);
    if (axis === "x") { g.rotateY(Math.PI / 2); H.geo(m, g, at + face * 0.15, SPLIT, c, { uv: 1, world: true }); }
    else H.geo(m, g, c, SPLIT, at + face * 0.15, { uv: 1, world: true });
  };
  // pipe along a polyline with rounded elbows + flanges
  const pipe = (pts: V3[], r: number, m: Mat, o: { bend?: number; flange?: number; b?: Batch; flangeM?: Mat; ribs?: number } = {}) => {
    const b = o.b ?? B;
    const bend = o.bend ?? r * 1.6;
    const P = pts.map((p) => new THREE.Vector3(...p));
    const path = new THREE.CurvePath<THREE.Vector3>();
    let cur = P[0].clone();
    const straight: [THREE.Vector3, THREE.Vector3][] = [];
    for (let i = 1; i < P.length; i++) {
      const isLast = i === P.length - 1;
      const dirIn = P[i].clone().sub(P[i - 1]).normalize();
      const segLen = P[i].distanceTo(P[i - 1]);
      if (isLast) { path.add(new THREE.LineCurve3(cur.clone(), P[i].clone())); straight.push([cur.clone(), P[i].clone()]); break; }
      const dirOut = P[i + 1].clone().sub(P[i]).normalize();
      const bb = Math.min(bend, segLen * 0.45, P[i + 1].distanceTo(P[i]) * 0.45);
      const e = P[i].clone().addScaledVector(dirIn, -bb);
      const s = P[i].clone().addScaledVector(dirOut, bb);
      path.add(new THREE.LineCurve3(cur.clone(), e.clone()));
      straight.push([cur.clone(), e.clone()]);
      path.add(new THREE.QuadraticBezierCurve3(e, P[i].clone(), s));
      cur = s;
    }
    const total = path.getLength();
    const g = new THREE.TubeGeometry(path, Math.max(8, Math.round(total * 3) + P.length * 8), r, o.ribs ? 10 : 14, false);
    scaleUV(g, total / (o.ribs ?? 1.0), o.ribs ? 1 : Math.max(1, Math.round((2 * Math.PI * r) / 1.0)));
    b.push(m, g);
    if (o.flange) {
      const fm = o.flangeM ?? rustDark;
      for (const [a, c] of straight) {
        const l = a.distanceTo(c);
        const n = Math.floor(l / o.flange);
        const dir = c.clone().sub(a).normalize();
        for (let i = 1; i <= n; i++) {
          const p = a.clone().addScaledVector(dir, (i * l) / (n + 1));
          const q = p.clone().addScaledVector(dir, 0.08);
          b.rod(fm, r * 1.14, [p.x, p.y, p.z], [q.x, q.y, q.z], 16, true);
        }
      }
    }
  };
  const duct = (pts: V3[], r = 0.17, b = B) => pipe(pts, r, ductM, { bend: 0.6, ribs: 0.5, b });
  const cagedLamp = (x: number, y: number, z: number, ry: number) => {
    const base = new THREE.CylinderGeometry(0.14, 0.14, 0.06, 14);
    base.rotateX(Math.PI / 2);
    B.geo(lidM, base, x, y, z, { ry });
    const bulb = new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    bulb.rotateX(Math.PI / 2);
    bulb.translate(0, 0, 0.03);
    B.geo(lampWarm, bulb, x, y, z, { ry });
    for (let i = 0; i < 3; i++) {
      const t = new THREE.TorusGeometry(0.12, 0.008, 4, 14, Math.PI);
      t.rotateY(Math.PI / 2);
      t.rotateZ((i * Math.PI) / 3);
      t.translate(0, 0, 0.03);
      B.geo(steel, t, x, y, z, { ry });
    }
  };
  const hangLamp = (x: number, y: number, z: number, top: number, b = B) => {
    b.rod(black, 0.012, [x, y + 0.2, z], [x, top, z], 4);
    B.geo(lidM, new THREE.ConeGeometry(0.26, 0.2, 16, 1, true), x, y + 0.1, z);
    B.geo(lampWarm, new THREE.SphereGeometry(0.09, 10, 8), x, y, z);
  };

  // ---------- props ----------
  const DPROF: [number, number][] = [[0, 0], [0.27, 0], [0.29, 0.02], [0.29, 0.27], [0.305, 0.29], [0.29, 0.31], [0.29, 0.57], [0.305, 0.59], [0.29, 0.61], [0.29, 0.86], [0.27, 0.88], [0, 0.88]];
  const drum = (x: number, y: number, z: number, m: Mat, lying = false, ry = 0) => {
    const g = new THREE.LatheGeometry(DPROF.map(([a, b]) => new THREE.Vector2(a, b)), 22);
    if (lying) {
      g.translate(0, -0.44, 0);
      g.rotateZ(Math.PI / 2);
      B.geo(m, g, x, y + 0.3, z, { ry });
      rotBox(x, z, ry, 0.44, 0.3, y, y + 0.6);
    } else {
      B.geo(m, g, x, y, z, { ry: rnd() * 6 });
      const lid = new THREE.CircleGeometry(0.26, 20);
      lid.rotateX(-Math.PI / 2);
      B.geo(lidM, lid, x, y + 0.883, z);
      B.cyl(lidM, 0.035, 0.035, 0.025, x + 0.15, y + 0.88, z + 0.05, { seg: 8 });
      k.collider(x - 0.3, x + 0.3, z - 0.3, z + 0.3, y, y + 0.88, true);
    }
  };
  const bag = (x: number, y: number, z: number, ry: number, m: Mat) => {
    const g = new THREE.SphereGeometry(1, 12, 7);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const px = p.getX(i); p.setY(i, p.getY(i) * (1 - 0.35 * px * px)); }
    g.scale(0.33, 0.11, 0.2);
    g.computeVertexNormals();
    B.geo(m, g, x, y + 0.1, z, { ry, rx: (rnd() - 0.5) * 0.12, uv: 0.9 });
  };
  const sandbags = (x: number, z: number, y: number, len: number, rows: number, ry: number, depth = 1) => {
    const n = Math.max(1, Math.round(len / 0.62));
    for (let d = 0; d < depth; d++)
      for (let r = 0; r < rows - d; r++)
        for (let i = 0; i < n - (r % 2); i++) {
          const lx = -len / 2 + 0.31 + i * 0.62 + (r % 2) * 0.31;
          const lz = (d - (depth - 1) / 2) * 0.4;
          const [px, pz] = L(x, z, ry, lx, lz);
          bag(px, y + r * 0.18, pz, ry + (rnd() - 0.5) * 0.25, rnd() < 0.3 ? sandDark : sand);
        }
    rotBox(x, z, ry, len / 2, 0.2 * depth + 0.05, y, y + rows * 0.18 + 0.04);
  };
  const ibc = (x: number, y: number, z: number, ry: number) => {
    B.box(steel, 1.0, 0.13, 1.2, x, y, z, { ry, flat: true });
    B.geo(plasticW, new RoundedBoxGeometry(0.92, 0.86, 1.1, 2, 0.07), x, y + 0.13 + 0.43, z, { ry, uv: 1 });
    const hw = 0.5, hd = 0.6, top = y + 1.04;
    const corner = (lx: number, lz: number): V3 => { const [px, pz] = L(x, z, ry, lx, lz); return [px, 0, pz]; };
    const edges: [number, number, number, number][] = [[-hw, -hd, hw, -hd], [hw, -hd, hw, hd], [hw, hd, -hw, hd], [-hw, hd, -hw, -hd]];
    for (const [ax, az, bx, bz] of edges) {
      const n = Math.round(Math.hypot(bx - ax, bz - az) / 0.2);
      for (let i = 0; i < n; i++) {
        const t = i / n;
        const c = corner(ax + (bx - ax) * t, az + (bz - az) * t);
        B.rod(galv, 0.012, [c[0], y + 0.13, c[2]], [c[0], top, c[2]], 4);
      }
      for (const hy of [y + 0.45, y + 0.75, top]) {
        const a = corner(ax, az), b2 = corner(bx, bz);
        B.rod(galv, 0.014, [a[0], hy, a[2]], [b2[0], hy, b2[2]], 4);
      }
    }
    B.cyl(black, 0.14, 0.14, 0.06, x, y + 0.99, z, { seg: 16 });
    const [vx, vz] = L(x, z, ry, 0, hd + 0.05);
    B.cyl(black, 0.06, 0.06, 0.12, vx, y + 0.18, vz, { seg: 10 });
    rotBox(x, z, ry, hw, hd, y, top);
  };
  const can = (x: number, y: number, z: number, ry: number, m: Mat, s = 1) => {
    B.geo(m, new RoundedBoxGeometry(0.5 * s, 0.42 * s, 0.34 * s, 2, 0.07 * s), x, y + 0.21 * s, z, { ry, uv: 0.5 });
    const [hx, hz] = L(x, z, ry, 0.08 * s, 0);
    B.geo(m, new RoundedBoxGeometry(0.22 * s, 0.07 * s, 0.08 * s, 1, 0.02), hx, y + 0.45 * s, hz, { ry, uv: 0.5 });
    const [sx, sz] = L(x, z, ry, -0.17 * s, 0);
    B.cyl(black, 0.045 * s, 0.05 * s, 0.07 * s, sx, y + 0.42 * s, sz, { seg: 10 });
  };
  const crate = (x: number, y: number, z: number, s: number, ry = 0) => {
    B.box(woodPale, s, s, s, x, y, z, { ry, uv: 0.9 });
    for (const lz of [-s / 2 - 0.01, s / 2 + 0.01]) {
      const [px, pz] = L(x, z, ry, 0, lz);
      B.box(woodM, s * 1.02, 0.07, 0.03, px, y + 0.03, pz, { ry, uv: 0.5 });
      B.box(woodM, s * 1.02, 0.07, 0.03, px, y + s - 0.1, pz, { ry, uv: 0.5 });
    }
    rotBox(x, z, ry, s / 2, s / 2, y, y + s);
  };
  const pallet = (x: number, y: number, z: number, ry: number) => {
    for (let i = 0; i < 5; i++) { const [px, pz] = L(x, z, ry, -0.5 + i * 0.25, 0); B.geo(woodPale, new THREE.BoxGeometry(0.11, 0.022, 1.2), px, y + 0.133, pz, { ry, uv: 0.5 }); }
    for (const lz of [-0.5, 0, 0.5]) { const [px, pz] = L(x, z, ry, 0, lz); B.geo(woodM, new THREE.BoxGeometry(1.2, 0.1, 0.1), px, y + 0.06, pz, { ry, uv: 0.5 }); }
    rotBox(x, z, ry, 0.6, 0.6, y, y + 0.145);
  };
  const cardBox = (x: number, y: number, z: number, w: number, h: number, d: number, ry: number) => {
    B.geo(cardM, new RoundedBoxGeometry(w, h, d, 1, 0.015), x, y + h / 2, z, { ry });
    rotBox(x, z, ry, w / 2, d / 2, y, y + h);
  };
  const tetrapod = (x: number, y: number, z: number, s: number, ry: number) => {
    const dirs = [[0, 1, 0], [0.943, -0.333, 0], [-0.471, -0.333, 0.816], [-0.471, -0.333, -0.816]];
    for (const [dx, dy, dz] of dirs) {
      const g = new THREE.CylinderGeometry(0.12 * s, 0.3 * s, 0.75 * s, 12);
      g.translate(0, 0.375 * s, 0);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, dy, dz)));
      B.geo(conc, g, x, y + 0.34 * s, z, { ry, uv: 0.6 });
    }
    k.collider(x - 0.6 * s, x + 0.6 * s, z - 0.6 * s, z + 0.6 * s, y, y + 1.05 * s, true);
  };
  const plank = (x: number, y: number, z: number, len: number, ry: number, rz: number) => {
    B.geo(woodPale, new THREE.BoxGeometry(len, 0.04, 0.22), x, y, z, { ry, rz, uv: 0.6 });
  };
  const lockerRow = (x: number, z: number, y: number, n: number, ry: number, mats: Mat[]) => {
    for (let i = 0; i < n; i++) {
      const [px, pz] = L(x, z, ry, (i - (n - 1) / 2) * 0.46, 0);
      B.box(metalGrey, 0.44, 1.9, 0.48, px, y, pz, { ry, uv: 1 });
      const [fx, fz] = L(px, pz, ry, 0, 0.245);
      decal(mats[i % mats.length], 0.42, 1.86, fx, y + 0.95, fz, ry);
    }
    rotBox(x, z, ry, n * 0.23, 0.25, y, y + 1.9);
  };
  const trolley = (x: number, y: number, z: number, ry: number) => {
    for (const [lx, lz] of [[-0.42, -0.3], [0.42, -0.3], [-0.42, 0.3], [0.42, 0.3]] as const) {
      const [px, pz] = L(x, z, ry, lx, lz);
      B.rod(galv, 0.015, [px, y + 0.12, pz], [px, y + 1.02, pz], 6);
      B.geo(black, new THREE.CylinderGeometry(0.06, 0.06, 0.04, 12), px, y + 0.06, pz, { ry, rx: Math.PI / 2 });
    }
    B.geo(trolleyM, new RoundedBoxGeometry(0.86, 0.72, 0.62, 2, 0.05), x, y + 0.66, z, { ry, uv: 0.8 });
    // X straps
    for (const s of [-1, 1]) {
      const [px, pz] = L(x, z, ry, 0, 0.315);
      B.geo(k.mat(null, "#0f2a70"), new THREE.BoxGeometry(1.05, 0.04, 0.01), px, y + 0.66, pz, { ry, rz: s * 0.68 });
    }
    rotBox(x, z, ry, 0.46, 0.33, y, y + 1.02);
  };
  const cabinet = (x: number, y: number, z: number, ry: number, drawers = 4, h = 1.32) => {
    B.box(metalGrey, 0.5, h, 0.62, x, y, z, { ry, uv: 1 });
    for (let i = 0; i < drawers; i++) {
      const [px, pz] = L(x, z, ry, 0, 0.315);
      B.box(steel, 0.44, 0.012, 0.012, px, y + ((i + 1) * h) / drawers - 0.02, pz, { ry, flat: true });
      B.box(galv, 0.14, 0.025, 0.03, px, y + ((i + 0.6) * h) / drawers, pz, { ry, flat: true });
    }
    rotBox(x, z, ry, 0.25, 0.31, y, y + h);
  };
  const shelf = (x: number, y: number, z: number, ry: number, w = 1.6, h = 2.3) => {
    for (const lx of [-w / 2 + 0.04, w / 2 - 0.04]) for (const lz of [-0.22, 0.22]) {
      const [px, pz] = L(x, z, ry, lx, lz);
      B.box(woodM, 0.07, h, 0.07, px, y, pz, { ry, uv: 0.6 });
    }
    const [bx, bz] = L(x, z, ry, 0, -0.24);
    B.box(woodM, w, h, 0.03, bx, y, bz, { ry, uv: 1 });
    for (let i = 0; i < 4; i++) {
      const sy = y + 0.12 + i * ((h - 0.2) / 3.3);
      B.box(woodPale, w, 0.035, 0.5, x, sy, z, { ry, uv: 0.8 });
      for (let j = 0; j < 3; j++) {
        if (rnd() < 0.2) continue;
        const [px, pz] = L(x, z, ry, -w / 2 + 0.3 + j * ((w - 0.6) / 2), 0);
        if (rnd() < 0.5) {
          const g = new THREE.SphereGeometry(0.2, 10, 7);
          g.scale(1, 0.9, 0.8);
          B.geo(trashM, g, px, sy + 0.2, pz, { ry: rnd() * 3 });
        } else B.geo(cardM, new RoundedBoxGeometry(0.34, 0.28, 0.32, 1, 0.01), px, sy + 0.17, pz, { ry: ry + (rnd() - 0.5) * 0.3 });
      }
    }
    rotBox(x, z, ry, w / 2, 0.26, y, y + h);
  };
  const chair = (x: number, y: number, z: number, ry: number) => {
    const [sx, sz] = L(x, z, ry, 0, 0);
    B.box(redWood, 0.46, 0.05, 0.44, sx, y + 0.45, sz, { ry, uv: 0.5 });
    for (const [lx, lz] of [[-0.2, -0.19], [0.2, -0.19], [-0.2, 0.19], [0.2, 0.19]] as const) {
      const [px, pz] = L(x, z, ry, lx, lz);
      B.box(redWood, 0.045, 0.45, 0.045, px, y, pz, { ry, flat: true, uv: 0.5 });
    }
    for (const lx of [-0.2, 0.2]) { const [px, pz] = L(x, z, ry, lx, -0.2); B.box(redWood, 0.05, 0.55, 0.05, px, y + 0.5, pz, { ry, flat: true, uv: 0.5 }); }
    const [tx, tz] = L(x, z, ry, 0, -0.2);
    B.box(redWood, 0.46, 0.08, 0.05, tx, y + 0.97, tz, { ry, flat: true, uv: 0.5 });
    for (let i = 0; i < 4; i++) { const [px, pz] = L(x, z, ry, -0.12 + i * 0.08, -0.2); B.box(redWood, 0.025, 0.42, 0.025, px, y + 0.55, pz, { ry, flat: true, uv: 0.5 }); }
    rotBox(x, z, ry, 0.24, 0.23, y, y + 0.48);
  };
  const floorLamp = (x: number, y: number, z: number) => {
    B.cyl(black, 0.16, 0.18, 0.03, x, y, z, { seg: 18 });
    B.rod(black, 0.014, [x, y, z], [x, y + 1.55, z], 6);
    const shade = new THREE.LatheGeometry([new THREE.Vector2(0.3, 0), new THREE.Vector2(0.18, 0.42)], 22, 0, Math.PI * 2);
    B.geo(lampPink, shade, x, y + 1.35, z);
    B.geo(lampPink, new THREE.CircleGeometry(0.29, 20), x, y + 1.36, z, { rx: Math.PI / 2 });
    k.collider(x - 0.18, x + 0.18, z - 0.18, z + 0.18, y, y + 1.8, false);
  };
  const ladder = (x: number, y: number, z: number, ry: number, len: number, lean: number) => {
    for (const lx of [-0.22, 0.22]) {
      const [px, pz] = L(x, z, ry, lx, 0);
      B.geo(woodPale, new THREE.BoxGeometry(0.05, len, 0.07), px, y + (len / 2) * Math.cos(lean), pz, { ry, rx: -lean, uv: 0.5 });
    }
    for (let d = 0.3; d < len - 0.1; d += 0.3) {
      const [px, pz] = L(x, z, ry, 0, -Math.sin(lean) * d);
      B.geo(woodPale, new THREE.BoxGeometry(0.44, 0.04, 0.05), px, y + Math.cos(lean) * d, pz, { ry, uv: 0.5 });
    }
  };
  const bigPipeSection = (x: number, y: number, z: number, ry: number, r = 0.55, len = 1.4) => {
    const g = new THREE.CylinderGeometry(r, r, len, 24, 1, true);
    g.rotateZ(Math.PI / 2);
    scaleUV(g, 3, 1.4);
    const m2 = k.mat(rustM.ptex, "#fff", [1, 1], { metalness: 0.45, roughness: 0.75, bump: 1.0 });
    m2.m.side = THREE.DoubleSide;
    B.geo(m2, g, x, y + r, z, { ry });
    rotBox(x, z, ry, len / 2, r, y, y + r * 2);
  };

  // =============================== FLOORS & WATER ===============================
  // Main channel: walkways each side, muddy water between
  deck(-5, -2.5, -14, 16);
  deck(2.5, 5, -14, 16);
  for (const s of [-1, 1]) B.box(stone, 0.2, 0.06, 30, s * 2.6, FY, 1, { flat: true, uv: 0.8, world: true });
  waterPlane(-2.5, 2.5, -14, 16);
  // East culvert
  deck(11, 13, -14, 16);
  deck(15, 17, -14, 16);
  deck(11, 17, 16, 21);
  for (const x of [12.9, 15.1]) B.box(stone, 0.2, 0.06, 30, x, FY, 1, { flat: true, uv: 0.8, world: true });
  waterPlane(13, 15, -14, 16);
  // Basin: west platform + north ledge + east strip, pool in between
  deck(-15, -2.5, -23, -14);
  deck(-2.5, 17, -23, -20.5);
  deck(15, 17, -20.5, -14);
  waterPlane(-2.5, 15, -20.5, -14);
  // passages + entrance
  deck(-10, -5, -4, 0);
  deck(-14, -10, -14, -10);
  deck(5, 11, 2, 6);
  deck(-8, 8, 16, 23, FY, walkM);
  deck(8, 11, 17.5, 20.5);
  deck(-21.5, -19, 8, 11, 0.3, slabM, 1.25);
  deck(-24, -16, 11, 19, 0.3, conc, 1.5);

  // Brick hall: broken uneven concrete slabs over mud
  {
    const g = new THREE.PlaneGeometry(14, 18);
    g.rotateX(-Math.PI / 2);
    scaleUV(g, 3, 4);
    B.geo(mudM, g, -17, 0.03, -1);
    const list: { pos: V3; rotX?: number; rotZ?: number; rotY?: number }[] = [];
    const sx = 14 / 12, sz = 18 / 15;
    for (let i = 0; i < 12; i++)
      for (let j = 0; j < 15; j++) {
        const x = -24 + (i + 0.5) * sx, z = -10 + (j + 0.5) * sz;
        const inSpawn = x > -21 && x < -13 && z > -4.5 && z < 2;
        if (!inSpawn && rnd() < 0.06) continue;
        const top = inSpawn ? 0.18 + rnd() * 0.05 : 0.13 + rnd() * 0.15;
        list.push({ pos: [x + (rnd() - 0.5) * 0.06, top - 0.15, z + (rnd() - 0.5) * 0.06], rotX: (rnd() - 0.5) * (inSpawn ? 0.03 : 0.1), rotZ: (rnd() - 0.5) * (inSpawn ? 0.03 : 0.1), rotY: (rnd() - 0.5) * 0.05 });
      }
    k.instances(new THREE.BoxGeometry(sx - 0.05, 0.3, sz - 0.05), slabM, list, { solid: true, standable: true });
  }

  // =============================== VAULTS ===============================
  vault("z", 0, -14, 16, 5, 2.8, brickDark, [-8, -2, 4, 10]);
  vault("z", 14, -14, 21, 3, 1.8, brickDark, [-8, -2, 4, 10, 16]);
  vault("x", 15, -24, -16, 4, 1.6, brickPink, [-20]);
  tympanum("z", 14, 21, 3, 1.8, brick, 1);
  tympanum("x", 15, -24, 4, 1.6, brickPink, -1);
  tympanum("x", 15, -16, 4, 1.6, brickPink, 1);
  // stone lintels/jambs on the openings of the vault side walls
  const lintelX = (x: number, z0: number, z1: number, face: number) => {
    B.box(stone, 0.5, 0.35, z1 - z0 + 0.6, x + face * 0.1, SPLIT - 0.35, (z0 + z1) / 2, { flat: true, uv: 0.8, world: true });
    for (const z of [z0 - 0.15, z1 + 0.15]) B.box(stone, 0.5, SPLIT - 0.35, 0.3, x + face * 0.1, 0, z, { flat: true, uv: 0.8, world: true });
  };
  lintelX(-5, -4, 0, 0);
  lintelX(5, 2, 6, 0);
  lintelX(11, 2, 6, 0);
  lintelX(11, 17.5, 20.5, 0);
  const lintelZ = (z: number, x0: number, x1: number, y = SPLIT) => {
    B.box(stone, x1 - x0 + 0.6, 0.35, 0.5, (x0 + x1) / 2, y - 0.35, z, { flat: true, uv: 0.8, world: true });
    for (const x of [x0 - 0.15, x1 + 0.15]) B.box(stone, 0.3, y - 0.35, 0.5, x, 0, z, { flat: true, uv: 0.8, world: true });
  };
  lintelZ(-10, -14, -10);
  lintelZ(8, -21.5, -19, 2.6);
  lintelZ(11, -21.5, -19, 2.6);
  // big stone portals where the tunnels meet the tall rooms
  const portal = (z: number, cx: number, hw: number, rise: number, face: number) => {
    const sh = new THREE.Shape();
    const N = 28;
    sh.moveTo(hw + 0.45, 0);
    for (let i = 0; i <= N; i++) { const t = (i / N) * Math.PI; sh.lineTo(Math.cos(t) * (hw + 0.45), Math.sin(t) * (rise + 0.45)); }
    sh.lineTo(-hw - 0.45, 0); sh.lineTo(-hw, 0);
    for (let i = N; i >= 0; i--) { const t = (i / N) * Math.PI; sh.lineTo(Math.cos(t) * hw, Math.sin(t) * rise); }
    sh.lineTo(hw + 0.45, 0);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: false, curveSegments: 4 });
    H.geo(stone, g, cx, SPLIT + 0.005, z + (face > 0 ? 0.0 : -0.2), { uv: 0.8, world: true });
    for (const s of [-1, 1]) B.box(stone, 0.45, SPLIT, 0.25, cx + s * (hw + 0.22), 0, z + face * 0.12, { flat: true, uv: 0.8, world: true });
    k.collider(cx - hw - 0.45, cx - hw, z + (face > 0 ? 0 : -0.25), z + (face > 0 ? 0.25 : 0), 0, SPLIT, false);
    k.collider(cx + hw, cx + hw + 0.45, z + (face > 0 ? 0 : -0.25), z + (face > 0 ? 0.25 : 0), 0, SPLIT, false);
  };
  portal(-14, 0, 5, 2.8, -1); // basin side of the main tunnel mouth
  portal(-14, 14, 3, 1.8, -1);
  portal(16, 0, 5, 2.8, 1); // entrance side

  // =============================== MAIN CHANNEL ===============================
  // wall pipes: big rusty main on the west wall, black corrugated ducts on the east side of the vault
  pipe([[-4.55, 2.35, -14.3], [-4.55, 2.35, 16.3]], 0.34, rustM, { flange: 3.2 });
  for (let z = -12; z < 16; z += 4) B.box(steel, 0.5, 0.08, 0.12, -4.78, 1.93, z, { flat: true });
  pipe([[-4.78, 1.55, -14.3], [-4.78, 1.55, 16.3]], 0.12, rustDark, { flange: 4 });
  const onVault = (deg: number, hw: number, rise: number, inset: number, cx = 0): [number, number] => {
    const t = (deg * Math.PI) / 180;
    return [cx + Math.cos(t) * (hw - inset), SPLIT + Math.sin(t) * (rise - inset)];
  };
  for (const [deg, r] of [[18, 0.2], [30, 0.17], [150, 0.18]] as const) {
    const [x, y] = onVault(deg, 5, 2.8, r + 0.05);
    duct([[x, y, -14.2], [x, y, 16.2]], r, H);
  }
  // east wall: duct drops from the vault to a junction box, a vertical rusty pipe from the vault into the water
  duct([[4.8, 1.2, 12.8], [4.8, 3.4, 12.8], [4.3, 4.1, 12.8], [3.2, 4.7, 12.8]], 0.16);
  B.box(metalGrey, 0.6, 0.8, 0.25, 4.85, 0.8, 12.8, { uv: 1 });
  pipe([[1.6, -0.2, -9], [1.6, 4.0, -9], [3.4, 4.9, -9]], 0.42, rustM, { flange: 1.4, bend: 0.9 });
  k.collider(1.15, 2.05, -9.45, -8.55, 0, 4.5, false);
  B.cyl(rustDark, 0.52, 0.52, 0.12, 1.6, 0.1, -9, { seg: 22 });
  // drum stack + IBC on the east walkway (south)
  {
    const z0 = 7.2;
    for (let i = 0; i < 5; i++) drum(4.6, FY, z0 + i * 0.62, i % 2 ? drumRed : drumGreen);
    for (let i = 0; i < 4; i++) drum(4.0, FY, z0 + 0.3 + i * 0.62, i % 3 === 1 ? drumRed : drumGreen);
    drum(4.6, FY + 0.88, z0 + 0.3, drumGreen);
    drum(4.6, FY + 0.88, z0 + 1.55, drumRed);
    drum(4.35, FY + 1.76, z0 + 0.9, drumRed, true, Math.PI / 2 + 0.1);
    k.collider(3.7, 4.95, z0 - 0.3, z0 + 2.8, FY, FY + 0.88, true);
    ibc(4.35, FY, 11.2, 0.05);
    can(3.3, FY, 11.0, 0.4, plasticW, 1.1);
  }
  sandbags(4.55, -5.5, FY, 2.4, 3, Math.PI / 2, 2);
  sandbags(3.4, -4.4, FY, 1.2, 2, 0.1);
  // west walkway: crates, pallet, cardboard, trash bags
  pallet(-4.3, FY, 6.5, 0.1);
  crate(-4.3, FY + 0.145, 6.5, 0.8, 0.1);
  crate(-4.35, FY + 0.945, 6.45, 0.55, 0.5);
  cardBox(-4.4, FY, 8.1, 0.7, 0.5, 0.6, 0.3);
  cardBox(-4.4, FY + 0.5, 8.1, 0.5, 0.4, 0.45, 0.1);
  for (let i = 0; i < 4; i++) {
    const g = new THREE.SphereGeometry(0.34, 12, 9);
    g.scale(1, 0.8 + rnd() * 0.3, 0.9);
    B.geo(trashM, g, -4.5 + (i % 2) * 0.45, FY + 0.28 + (i > 1 ? 0.32 : 0), -10.5 + (i % 3) * 0.4, { ry: i });
  }
  k.collider(-4.95, -3.9, -10.9, -9.5, FY, FY + 0.9, true);
  cabinet(-4.6, FY, -1.2 + 5.5, Math.PI / 2);
  drum(-4.5, FY, 13.5, drumBlue);
  drum(-4.4, FY, 14.2, drumYellow);
  // in the water: broken rusty pipe section, floating plastic tank, planks
  bigPipeSection(-0.6, 0, 11.5, 0.6, 0.5, 1.5);
  {
    B.geo(plasticW, new RoundedBoxGeometry(1.1, 0.4, 0.8, 2, 0.08), 0.8, 0.2, -2.5, { ry: 0.3, uv: 1 });
    B.cyl(black, 0.16, 0.16, 0.04, 0.8, 0.4, -2.5, { seg: 16 });
    rotBox(0.8, -2.5, 0.3, 0.55, 0.4, 0, 0.42);
    can(1.8, 0.05, -2.2, 0.8, plasticY);
    B.geo(plasticB, new THREE.CylinderGeometry(0.22, 0.18, 0.4, 16), 2.0, 0.2, -1.7, { rz: 1.2, ry: 0.4 });
    plank(-1.0, 0.16, 3.0, 2.2, 0.5, 0.04);
  }
  // grate bridge
  {
    const g = new THREE.PlaneGeometry(5.2, 1.4);
    g.rotateX(-Math.PI / 2);
    scaleUV(g, 5.2 / 0.6, 1.4 / 0.6);
    B.geo(grateM, g, 0, FY - 0.01, -0.5);
    for (const s of [-1, 1]) B.box(steel, 5.2, 0.18, 0.08, 0, FY - 0.19, -0.5 + s * 0.7, { flat: true });
    k.collider(-2.5, 2.5, -1.2, 0.2, 0, FY, true);
  }
  // graffiti
  decal(grafNeon, 4.4, 2.2, -4.99, 1.9, 10.5, Math.PI / 2);
  decal(grafB, 4.0, 2.0, -4.99, 1.8, -7.0, Math.PI / 2);
  decal(grafA, 4.0, 2.0, 4.99, 1.8, -1.2, -Math.PI / 2);
  k.panel(1.0, 0.5, 4.97, 2.2, 5.0 + 3, signDanger, -Math.PI / 2);
  // lamps
  cagedLamp(-4.97, 2.75, -3.5, Math.PI / 2);
  cagedLamp(4.97, 2.75, 1.0, -Math.PI / 2);
  cagedLamp(-4.97, 2.75, 9.0, Math.PI / 2);
  cagedLamp(4.97, 2.75, -11.0, -Math.PI / 2);

  // =============================== FLOOD BASIN ===============================
  // pool kerbs
  B.box(stone, 17.5, 0.08, 0.25, 6.25, FY, -20.6, { flat: true, uv: 0.8, world: true });
  B.box(stone, 0.25, 0.08, 6.5, -2.6, FY, -17.25, { flat: true, uv: 0.8, world: true });
  // big rusty pipes along the north wall, one dropping into the pool, one crossing overhead
  pipe([[-15.3, 3.4, -22.4], [17.3, 3.4, -22.4]], 0.55, rustM, { flange: 3.5 });
  pipe([[4, 3.4, -22.4], [4, 3.4, -18.2], [4, -0.3, -18.2]], 0.5, rustM, { flange: 1.6, bend: 1.0 });
  k.collider(3.5, 4.5, -18.7, -17.7, 0, 4, false);
  pipe([[9.5, 3.4, -22.4], [9.5, 3.4, -21.8], [9.5, FY, -21.8]], 0.4, rustM, { flange: 1.2, bend: 0.6 });
  k.collider(9.1, 9.9, -22.2, -21.4, FY, 3.8, false);
  pipe([[-15.3, 5.6, -17], [17.3, 5.6, -17]], 0.45, rustDark, { flange: 3.0 });
  pipe([[-8, 5.9, -23.3], [-8, 5.9, -14.3]], 0.3, rustM, { flange: 2.4 });
  pipe([[-15.3, 2.2, -21.5], [-9.5, 2.2, -21.5], [-9.5, 2.2, -23.3]], 0.25, rustDark, { flange: 2 });
  duct([[16.8, 0.6, -15], [16.8, 3.2, -15], [16.8, 4.4, -16.5], [16.8, 4.6, -23.3]], 0.2);
  duct([[-14.8, 0.6, -15.5], [-14.8, 3.8, -15.5], [-14.8, 4.4, -17], [-14.8, 4.6, -23.3]], 0.2);
  // yellow / blue / white canister stack by the drop pipe
  {
    const cols = [plasticY, plasticW, plasticB, plasticY];
    for (let row = 0; row < 3; row++)
      for (let i = 0; i < 3 - (row === 2 ? 1 : 0); i++) can(5.0 + i * 0.52 + (row % 2) * 0.2, FY + row * 0.44, -21.4, 0.05 * (i - 1), cols[(i + row) % 4]);
    k.collider(4.7, 6.6, -21.65, -21.15, FY, FY + 1.32, true);
  }
  // sandbag walls along the ledge + west platform edge
  sandbags(10.8, -21.8, FY, 5.0, 3, 0, 2);
  sandbags(-3.3, -17.5, FY, 4.0, 3, Math.PI / 2, 2);
  sandbags(-6.5, -22.4, FY, 2.4, 2, 0);
  // junk pile of graffiti-sprayed stuff, tetrapods, a leaning plank
  tetrapod(-14.3, FY, -22.3, 1.0, 0.3);
  tetrapod(-10.9, FY, -22.0, 0.8, 1.4);
  {
    const junk = [drumBlue, drumRed, drumYellow, drumGreen];
    for (let i = 0; i < 4; i++) drum(-13.8 + (i % 2) * 0.35, FY + (i > 1 ? 0.6 : 0), -19.8 + i * 0.5, junk[i], true, 0.4 + i);
    bigPipeSection(-11.8, FY, -19.2, 1.1, 0.45, 1.2);
    decal(grafA, 2.4, 1.2, -13.4, 1.2, -18.9, 0.6);
    plank(-10.4, FY + 0.9, -20.4, 3.4, -0.5, 0.5);
  }
  // floating white tank + yellow bucket in the pool
  B.geo(plasticW, new RoundedBoxGeometry(1.3, 0.5, 0.9, 2, 0.08), 8.5, 0.2, -16.8, { ry: 0.1, uv: 1 });
  B.cyl(black, 0.2, 0.2, 0.05, 8.5, 0.45, -16.8, { seg: 18 });
  rotBox(8.5, -16.8, 0.1, 0.65, 0.45, 0, 0.47);
  B.cyl(drumYellow, 0.3, 0.24, 0.45, 9.7, 0.05, -16.2, { seg: 20, rz: 0.4 } as BO);
  B.cyl(plasticB, 0.26, 0.2, 0.36, 10.2, 0.05, -16.0, { seg: 20, rz: -0.7 } as BO);
  k.collider(9.3, 10.6, -16.6, -15.6, 0, 0.5, true);
  // corrugated-steel columns + graffiti on the north wall
  decal(grafSnake, 3.2, 3.2, 12.5, 4.6, -22.98, 0, B);
  decal(grafB, 4.4, 2.2, -1.0, 1.9, -22.98, 0);
  decal(grafBub, 4.4, 2.2, -12.0, 3.6, -22.98, 0, B);
  cagedLamp(2.0, 2.6, -22.97, 0);
  cagedLamp(-9.0, 2.6, -22.97, 0);
  hangLamp(6, 5.2, -18, 7);
  hangLamp(-8, 5.2, -18, 7);

  // =============================== EAST CULVERT ===============================
  for (const [deg, r] of [[20, 0.17], [34, 0.15], [150, 0.17], [162, 0.16]] as const) {
    const [x, y] = onVault(deg, 3, 1.8, r + 0.04, 14);
    duct([[x, y, -14.2], [x, y, 21.2]], r, H);
  }
  pipe([[16.62, 2.2, -14.3], [16.62, 2.2, 21.2]], 0.3, rustM, { flange: 3.0 });
  pipe([[11.3, 2.55, -14.3], [11.3, 2.55, 1.7]], 0.18, rustDark, { flange: 3.0 });
  decal(grafNeon, 4.2, 2.1, 11.01, 1.7, -6.0, Math.PI / 2);
  decal(grafBub, 4.2, 2.1, 16.99, 1.7, 8.5, -Math.PI / 2);
  decal(grafA, 3.6, 1.8, 16.99, 1.6, -9.0, -Math.PI / 2);
  // south chamber: drum wall, IBCs, sandbags, crates
  {
    for (let i = 0; i < 6; i++) drum(11.6 + i * 0.62, FY, 20.55, i % 3 === 1 ? drumRed : drumGreen);
    for (let i = 0; i < 5; i++) drum(11.9 + i * 0.62, FY + 0.88, 20.55, i % 2 ? drumGreen : drumRed);
    drum(12.8, FY + 1.76, 20.5, drumRed, true, 0.05);
    k.collider(11.25, 15.3, 20.2, 20.9, FY, FY + 1.76, true);
    ibc(16.35, FY, 19.9, Math.PI / 2);
    ibc(16.35, FY, 18.6, Math.PI / 2 + 0.05);
    sandbags(12.8, 16.6, FY, 2.4, 3, 0.05);
    crate(16.4, FY, 16.4, 0.8, 0.2);
    drum(11.5, FY, 17.2, drumRed, true, 0.2);
  }
  // walkway props
  {
    // black louvered vent box (standable)
    B.box(trashM, 0.9, 0.8, 1.8, 11.5, FY, -2.5, { uv: 1 });
    for (let i = 0; i < 7; i++) B.box(black, 0.92, 0.03, 1.82, 11.5, FY + 0.15 + i * 0.09, -2.5, { flat: true });
    k.collider(11.05, 11.95, -3.4, -1.6, FY, FY + 0.8, true);
    sandbags(16.5, -11.0, FY, 1.8, 3, Math.PI / 2);
    drum(16.5, FY, -6.0, drumGrey);
    drum(16.45, FY, -5.35, drumYellow);
    cabinet(16.6, FY, 3.0, -Math.PI / 2);
    cabinet(16.6, FY, 3.52, -Math.PI / 2, 3, 1.0);
    pallet(11.7, FY, 10.5, 0.05);
    cardBox(11.7, FY + 0.145, 10.5, 0.8, 0.55, 0.7, 0.15);
    bigPipeSection(14.0, 0, 5.5, 1.4, 0.45, 1.3);
  }
  cagedLamp(11.03, 2.6, -10.5, Math.PI / 2);
  cagedLamp(16.97, 2.6, -1.0, -Math.PI / 2);
  cagedLamp(11.03, 2.6, 8.0, Math.PI / 2);
  cagedLamp(16.97, 2.6, 14.0, -Math.PI / 2);
  // cross passage to the main channel
  pipe([[5.2, 2.7, 2.35], [10.8, 2.7, 2.35]], 0.16, rustM, { flange: 2 });
  duct([[5.2, 2.75, 5.7], [10.8, 2.75, 5.7]], 0.15);
  hangLamp(8, 2.6, 4, SPLIT, B);

  // =============================== BRICK HALL ===============================
  // bricked-up arches with stone frames on the west & south walls
  const blindArch = (axis: "x" | "z", fixed: number, c: number, w: number, spring: number, face: number) => {
    const hw = w / 2, rise = w * 0.45;
    const frame = new THREE.Shape();
    frame.moveTo(-hw - 0.3, 0);
    frame.lineTo(-hw - 0.3, spring);
    for (let i = 0; i <= 24; i++) { const t = Math.PI - (i / 24) * Math.PI; frame.lineTo(Math.cos(t) * (hw + 0.3), spring + Math.sin(t) * (rise + 0.3)); }
    frame.lineTo(hw + 0.3, 0); frame.lineTo(hw, 0); frame.lineTo(hw, spring);
    for (let i = 0; i <= 24; i++) { const t = (i / 24) * Math.PI; frame.lineTo(Math.cos(t) * hw, spring + Math.sin(t) * rise); }
    frame.lineTo(-hw, 0);
    const fg = new THREE.ExtrudeGeometry(frame, { depth: 0.14, bevelEnabled: false, curveSegments: 4 });
    const inset = new THREE.Shape();
    inset.moveTo(-hw, 0); inset.lineTo(-hw, spring);
    for (let i = 0; i <= 24; i++) { const t = Math.PI - (i / 24) * Math.PI; inset.lineTo(Math.cos(t) * hw, spring + Math.sin(t) * rise); }
    inset.lineTo(hw, 0);
    const ig = new THREE.ShapeGeometry(inset, 4);
    if (axis === "x") {
      B.geo(stone, fg, c, 0, fixed + (face > 0 ? 0 : -0.14), { uv: 0.8, world: true });
      B.geo(brickDark, ig, c, 0, fixed + face * 0.01, { uv: 1, world: true, ry: face > 0 ? 0 : Math.PI });
    } else {
      B.geo(stone, fg, fixed + (face > 0 ? 0 : -0.14), 0, c, { uv: 0.8, world: true, ry: Math.PI / 2 * (face > 0 ? 1 : 1) });
      B.geo(brickDark, ig, fixed + face * 0.01, 0, c, { uv: 1, world: true, ry: face > 0 ? Math.PI / 2 : -Math.PI / 2 });
    }
  };
  blindArch("z", -24, -6, 2.4, 1.8, 1);
  blindArch("z", -24, -1, 2.4, 1.8, 1);
  blindArch("x", 8, -14, 2.4, 1.8, -1);
  blindArch("x", -10, -21, 2.4, 1.8, 1);
  // stone plinth all around
  B.box(stone, 14, 0.35, 0.12, -17, 0, -9.94, { flat: true, uv: 0.8, world: true });
  B.box(stone, 0.12, 0.35, 18, -23.94, 0, -1, { flat: true, uv: 0.8, world: true });
  // pipes along the top of the hall walls
  pipe([[-23.6, 4.3, -10.3], [-23.6, 4.3, 8.3]], 0.3, rustM, { flange: 3 });
  pipe([[-24.3, 3.7, -9.6], [-10.2, 3.7, -9.6]], 0.22, rustDark, { flange: 3 });
  duct([[-10.3, 0.5, 7.6], [-10.3, 3.3, 7.6], [-10.3, 4.2, 6.5], [-10.3, 4.4, -9.7]], 0.2);
  // big rusty tank column + grey drums (north-west corner)
  B.cyl(rustM, 0.75, 0.75, 4.2, -22.8, 0, -8.8, { seg: 28, su: 4, sv: 4 } as BO);
  B.cyl(rustDark, 0.8, 0.8, 0.12, -22.8, 0.2, -8.8, { seg: 28 });
  B.cyl(rustDark, 0.8, 0.8, 0.12, -22.8, 2.5, -8.8, { seg: 28 });
  k.collider(-23.55, -22.05, -9.55, -8.05, 0, 4.2, false);
  drum(-21.5, 0.25, -9.4, drumGrey);
  drum(-20.9, 0.25, -9.45, drumGrey);
  drum(-21.2, 1.13, -9.4, drumGrey);
  // striped tank lying by the east wall, yellow drum, IBC
  {
    const g = new THREE.CylinderGeometry(0.6, 0.6, 2.4, 28);
    g.rotateX(Math.PI / 2);
    scaleUV(g, 2, 1.5);
    B.geo(stripeM, g, -11.0, 0.85, -7.2);
    for (const z of [-8.4, -6.0]) B.geo(gasM, new THREE.SphereGeometry(0.6, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), -11.0, 0.85, z, { rx: z < -7 ? -Math.PI / 2 : Math.PI / 2 });
    for (const z of [-7.9, -6.5]) B.box(steel, 1.0, 0.3, 0.2, -11.0, 0.15, z, { flat: true });
    k.collider(-11.6, -10.4, -9.0, -5.4, 0, 1.45, true);
  }
  drum(-12.3, 0.25, -9.3, drumYellow);
  ibc(-15.5, 0.25, -9.25, 0);
  can(-14.4, 0.25, -9.5, 0.2, plasticY);
  // wooden shelves on the east wall (south of the passage)
  shelf(-10.3, 0.25, 2.2, -Math.PI / 2);
  shelf(-10.3, 0.25, 4.0, -Math.PI / 2);
  cabinet(-10.35, 0.25, 6.0, -Math.PI / 2);
  cabinet(-10.35, 0.25, 6.55, -Math.PI / 2);
  // locker wall with graffiti, yellow locker, blue trolley (south-west)
  {
    const list: { pos: V3; rotY?: number }[] = [];
    for (let row = 0; row < 5; row++)
      for (let i = 0; i < 7; i++) {
        if (row === 4 && (i === 2 || i === 5)) continue;
        list.push({ pos: [-23.7 + (rnd() - 0.5) * 0.06, 0.22 + 0.22 + row * 0.44, 1.4 + i * 0.46], rotY: (rnd() - 0.5) * 0.08 });
      }
    const cub = k.mat(lockerM.ptex, "#d0d4d8", [1, 1], { metalness: 0.5, roughness: 0.5, bump: 0.5 });
    k.instances(new THREE.BoxGeometry(0.44, 0.43, 0.45), cub, list);
    k.collider(-24, -23.45, 1.15, 4.6, 0, 2.44, true);
    decal(grafA, 3.4, 1.7, -23.46, 1.3, 2.9, Math.PI / 2);
    B.box(lockerY, 0.6, 2.0, 0.55, -23.7, 0.25, 5.4, { uv: 1 });
    decal(lockerY, 0.56, 1.96, -23.41, 1.25, 5.4, Math.PI / 2);
    k.collider(-24, -23.4, 5.1, 5.7, 0, 2.25, true);
    lockerRow(-23.72, 6.9, 0.25, 3, Math.PI / 2, [lockerM]);
    trolley(-22.0, 0.25, 2.2, 0.35);
    cardBox(-22.4, 0.25, 4.3, 0.6, 0.5, 0.5, 0.4);
    // paper strips on the floor
    for (let i = 0; i < 4; i++) decal(whiteM, 0.12, 1.2, -20.5 + i * 0.3, 0.33, 3.2 + i * 0.2, 0);
  }
  // rainbow decoration (with cloud) high on the north wall
  {
    const cx = -19.5, cy = 4.05, z = -9.94;
    B.geo(rainbowM, new THREE.RingGeometry(0.62, 1.6, 40, 1, 0, Math.PI), cx, cy + 0.01, z);
    for (const sx of [-1, 1]) for (let j = 0; j < 5; j++) B.geo(whiteM, new THREE.SphereGeometry(0.22 + (j % 2) * 0.08, 12, 8), cx + sx * (0.95 + j * 0.2), cy + 0.08 + (j % 3) * 0.08, z + 0.15);
  }
  decal(grafBub, 4.0, 2.0, -17.0, 2.0, 7.99, Math.PI);
  // more clutter: north wall under the rainbow, south-east corner, west arches
  pallet(-19.6, 0.25, -9.25, 0);
  sandbags(-19.6, -9.25, 0.4, 1.8, 3, 0);
  pallet(-17.9, 0.25, -9.3, 0.05);
  pallet(-17.9, 0.4, -9.3, -0.08);
  crate(-17.9, 0.55, -9.3, 0.75, 0.15);
  pallet(-14.2, 0.25, 7.2, 0.1);
  sandbags(-14.2, 7.2, 0.4, 1.8, 2, 0.1, 2);
  ibc(-12.3, 0.25, 7.2, 0.05);
  drum(-15.8, 0.25, 7.4, drumRed);
  drum(-16.45, 0.25, 7.45, drumGreen);
  drum(-16.1, 1.13, 7.4, drumRed, true, 0.1);
  cardBox(-23.5, 0.25, -6.0, 0.7, 0.55, 0.6, 0.2);
  cardBox(-23.4, 0.8, -6.05, 0.55, 0.45, 0.5, -0.2);
  drum(-23.5, 0.25, -1.4, drumYellow);
  drum(-23.5, 0.25, -0.75, drumBlue);
  cabinet(-23.6, 0.25, -3.6, Math.PI / 2);
  decal(grafNeon, 3.6, 1.8, -23.98, 3.6, -3.5, Math.PI / 2, B);
  hangLamp(-17, 3.6, -1, 5.5);
  hangLamp(-17, 3.6, 5, 5.5);
  hangLamp(-19, 3.6, -6.5, 5.5);

  // =============================== PINK ROOM ===============================
  {
    const x0 = -24;
    // grey plaster band on the lower walls
    B.box(conc, 0.05, 1.2, 8, x0 + 0.03, 0.3, 15, { flat: true, uv: 1, world: true });
    B.box(conc, 8, 1.2, 0.05, -20, 0.3, 18.97, { flat: true, uv: 1, world: true });
    // round porthole window with bars and a glowing purple pane
    const px = x0 + 0.02, py = 2.05, pz = 15;
    B.geo(portGlow, new THREE.CircleGeometry(0.95, 32), px + 0.02, py, pz, { ry: Math.PI / 2 });
    B.geo(rustDark, new THREE.TorusGeometry(1.0, 0.12, 10, 36), px + 0.08, py, pz, { ry: Math.PI / 2 });
    B.geo(concDark, new THREE.RingGeometry(1.05, 1.35, 36), px + 0.01, py, pz, { ry: Math.PI / 2 });
    for (let i = -3; i <= 3; i++) { const zz = pz + i * 0.26; const hh = Math.sqrt(Math.max(0, 0.95 * 0.95 - (i * 0.26) ** 2)); B.rod(steel, 0.02, [px + 0.1, py - hh, zz], [px + 0.1, py + hh, zz], 6); }
    // cactus pot on the porthole
    B.cyl(potM, 0.16, 0.12, 0.22, px + 0.25, py + 1.1, pz, { seg: 16 });
    B.geo(cactusM, new THREE.SphereGeometry(0.14, 12, 10), px + 0.25, py + 1.42, pz);
    // painted sky windows (arched tops)
    for (const wz of [12.6, 17.4]) {
      const sh = new THREE.Shape();
      const hw = 0.6, hh = 1.0;
      sh.moveTo(-hw, 0); sh.lineTo(hw, 0); sh.lineTo(hw, hh);
      for (let i = 0; i <= 16; i++) { const t = (i / 16) * Math.PI; sh.lineTo(Math.cos(t) * hw, hh + Math.sin(t) * hw); }
      const g = new THREE.ShapeGeometry(sh, 4);
      const uv = g.attributes.uv, pp = g.attributes.position;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (pp.getX(i) + hw) / (2 * hw), pp.getY(i) / (hh + hw));
      B.geo(skyM, g, px + 0.03, 1.55, wz, { ry: Math.PI / 2 });
    }
    // steel mesh platform
    {
      const g = new THREE.PlaneGeometry(3.6, 4.8);
      g.rotateX(-Math.PI / 2);
      scaleUV(g, 3.6 / 0.5, 4.8 / 0.5);
      B.geo(meshM, g, -21.4, 0.455, 15.0);
      for (const s of [-1, 1]) { B.box(galv, 3.6, 0.05, 0.05, -21.4, 0.42, 15 + s * 2.4, { flat: true }); B.box(galv, 0.05, 0.05, 4.8, -21.4 + s * 1.8, 0.42, 15, { flat: true }); }
      B.box(galv, 3.6, 0.05, 0.05, -21.4, 0.42, 15, { flat: true });
      k.collider(-23.2, -19.6, 12.6, 17.4, 0, 0.45, true);
    }
    // cushions under the porthole
    for (let i = 0; i < 5; i++) {
      const g = new THREE.SphereGeometry(1, 12, 8);
      g.scale(0.36, 0.14, 0.3);
      B.geo(cushion, g, -23.5 + (i % 2) * 0.15, 0.6 + (i === 2 ? 0.15 : 0), 13.9 + i * 0.55, { ry: rnd(), uv: 0.5 });
    }
    k.collider(-23.95, -23.0, 13.5, 16.5, 0.45, 0.8, true);
    // red round table with cloth + two red chairs
    const tx = -21.2, tz = 15.0, ty = 0.45;
    B.geo(cloth, new THREE.LatheGeometry([[0.01, 0], [0.62, 0], [0.6, 0.1], [0.56, 0.6], [0.56, 0.7], [0.5, 0.74], [0, 0.745]].map(([a, b]) => new THREE.Vector2(a, b)), 28), tx, ty, tz);
    B.geo(clothTop, new THREE.CylinderGeometry(0.52, 0.52, 0.02, 28), tx, ty + 0.75, tz);
    k.collider(tx - 0.58, tx + 0.58, tz - 0.58, tz + 0.58, ty, ty + 0.76, true);
    chair(tx + 0.1, ty, tz - 1.0, 0.25);
    chair(tx + 0.15, ty, tz + 1.05, Math.PI - 0.3);
    // pink floor lamps
    floorLamp(-23.3, 0.3, 11.8);
    floorLamp(-22.0, 0.3, 18.4);
    // washing machine + detergent, leaning ladder
    B.box(washM, 0.62, 0.85, 0.62, -23.6, 0.3, 17.9, { uv: 1 });
    B.geo(glassDark, new THREE.CircleGeometry(0.2, 24), -23.28, 0.72, 17.9, { ry: Math.PI / 2 });
    B.geo(galv, new THREE.TorusGeometry(0.22, 0.03, 8, 24), -23.28, 0.72, 17.9, { ry: Math.PI / 2 });
    B.box(whiteM, 0.2, 0.3, 0.13, -23.6, 1.15, 17.8, { uv: 0.5 });
    k.collider(-23.95, -23.28, 17.58, 18.22, 0.3, 1.15, true);
    ladder(-17.2, 0.3, 18.5, Math.PI, 2.6, 0.3);
    k.collider(-17.5, -16.9, 17.6, 18.9, 0.3, 2.6, false);
    // cardboard boxes, gas cylinder lying
    cardBox(-17.0, 0.3, 11.7, 0.8, 0.6, 0.6, 0.1);
    cardBox(-17.0, 0.9, 11.75, 0.7, 0.5, 0.55, -0.1);
    const gas = new THREE.CapsuleGeometry(0.2, 1.0, 6, 16);
    gas.rotateZ(Math.PI / 2);
    B.geo(gasM, gas, -18.6, 0.51, 11.6, { ry: 0.1 });
    k.collider(-19.4, -17.8, 11.35, 11.85, 0.3, 0.72, true);
    k.panel(0.6, 0.3, -16.02, 2.2, 15.0, signExit, -Math.PI / 2);
  }

  // =============================== ENTRANCE ===============================
  {
    // steel door + exit sign on the south wall
    B.box(metalGrey, 1.3, 2.3, 0.1, 0, FY, 22.95, { flat: true, uv: 1 });
    B.box(steel, 1.5, 2.4, 0.06, 0, FY, 22.99, { flat: true });
    B.box(galv, 0.3, 0.04, 0.06, 0.4, FY + 1.1, 22.87, { flat: true });
    k.panel(0.9, 0.45, 0, FY + 2.8, 22.97, signExit, Math.PI);
    // lockers along the west wall, electrical boxes on the east wall
    lockerRow(-7.72, 19.0, FY, 6, Math.PI / 2, [lockerM, lockerM, lockerY, lockerM]);
    B.box(metalGrey, 0.8, 1.1, 0.3, 7.83, 1.4, 21.5, { uv: 1 });
    B.box(metalGrey, 0.6, 0.8, 0.28, 7.84, 1.6, 22.3, { uv: 1 });
    pipe([[7.85, 2.5, 21.5], [7.85, 6, 21.5]], 0.05, black);
    // sandbags, cones, pallet with boxes, IBC
    sandbags(-4.5, 17.0, FY, 2.4, 3, 0);
    sandbags(4.5, 17.0, FY, 2.4, 3, 0);
    for (const [x, z] of [[-2.0, 17.6], [2.0, 17.6], [-6.5, 22.2]] as const) {
      B.cyl(coneM, 0.03, 0.17, 0.62, x, FY + 0.03, z, { seg: 14 });
      B.box(black, 0.36, 0.03, 0.36, x, FY, z, { flat: true });
    }
    pallet(6.8, FY, 17.3, 0.1);
    cardBox(6.8, FY + 0.145, 17.3, 0.9, 0.6, 0.7, 0.2);
    ibc(-6.9, FY, 16.9, 0.1);
    drum(6.8, FY, 22.3, drumRed);
    drum(6.2, FY, 22.4, drumGreen);
    // ceiling pipes
    pipe([[-8.3, 4.6, 17.0], [8.3, 4.6, 17.0]], 0.4, rustM, { flange: 3 });
    pipe([[-8.3, 5.3, 20.5], [8.3, 5.3, 20.5]], 0.25, rustDark, { flange: 3 });
    duct([[-3, 6, 22.6], [-3, 4.2, 22.6], [-3, 3.5, 21.4], [-3, 3.5, 16.2]], 0.2, H);
    hangLamp(0, 3.8, 19.5, 6);
    decal(grafA, 4.0, 2.0, 3.0, 2.0, 22.97, Math.PI);
  }

  B.flush();
  H.flush();

  // ---------- fill everything that isn't walkable with solid colliders ----------
  {
    // greedy rectangles: row runs merged with identical runs in the following rows
    let open = new Map<string, { i: number; e: number; j0: number }>();
    const flushRun = (r: { i: number; e: number; j0: number }, j1: number) => k.collider(BX0 + r.i * cs, BX0 + r.e * cs, BZ0 + r.j0 * cs, BZ0 + j1 * cs, 0, 8, false);
    for (let j = 0; j <= nz; j++) {
      const next = new Map<string, { i: number; e: number; j0: number }>();
      if (j < nz) {
        let i = 0;
        while (i < nx) {
          if (cellRoom[j * nx + i] >= 0) { i++; continue; }
          let e = i;
          while (e < nx && cellRoom[j * nx + e] < 0) e++;
          const key = `${i}:${e}`;
          const prev = open.get(key);
          next.set(key, prev ?? { i, e, j0: j });
          if (prev) open.delete(key);
          i = e;
        }
      }
      for (const r of open.values()) flushRun(r, j);
      open = next;
    }
  }
  for (const rm of rooms) if (!["passW", "passNW", "passSE", "crossE"].includes(rm.id)) k.room(rm.name, ...rm.r);

  // hiders: open centre of the Brick Hall; hunters: maintenance entrance
  const hiders: THREE.Vector3[] = [];
  for (let i = 0; i < 24; i++) hiders.push(new THREE.Vector3(-19.75 + (i % 6) * 1.1, 0.25, -3.25 + Math.floor(i / 6) * 1.1));
  const hunters: THREE.Vector3[] = [];
  for (let i = 0; i < 9; i++) hunters.push(new THREE.Vector3(-1.2 + (i % 3) * 1.2, FY, 19.4 + Math.floor(i / 3) * 1.1));

  return k.finish({
    id: "sewer", name: "Sewer",
    bounds: { minX: BX0, maxX: BX1, minZ: BZ0, maxZ: BZ1 },
    hunterSpawns: hunters, hiderSpawns: hiders,
    preview: { pos: [-3.6, 2.2, 14.8], look: [1.2, 1.4, -8], fov: 66 },
    lighting: {
      sky: "#0b0806",
      hemi: ["#d8c0a0", "#2a1c12", 0.45],
      sun: null,
      fog: ["#140f0a", 8, 42],
      points: [
        { pos: [0, 4.2, 1], color: "#ffc782", int: 40, dist: 22 },
        { pos: [3, 5.2, -18.5], color: "#ffcf90", int: 45, dist: 24 },
        { pos: [14, 3.4, 0], color: "#ffbf78", int: 30, dist: 20 },
        { pos: [-17, 4.2, -1], color: "#dfe6ff", int: 26, dist: 20 },
        { pos: [-20.5, 3.0, 15], color: "#ff45d2", int: 30, dist: 11 },
        { pos: [0, 4.0, 19.5], color: "#ffd9a0", int: 30, dist: 16 },
      ],
      exposure: 1.25,
      hdri: "warehouse",
      env: 0.3,
    },
  });
}
