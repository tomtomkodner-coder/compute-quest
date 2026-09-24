// Egypt (エジプト): mysterious ancient-Egyptian temple ruins at golden hour.
// South → north: a sandy open forecourt (ruined perimeter walls, avenue of seated cat statues, obelisks, broken
// columns, palms, a raised portico and a stair up to the roofs) → a massive battered pylon gateway → a hypostyle hall
// of 18 papyrus columns with carved hieroglyph bands, star ceiling, a collapsed roof bay and shafts of light → the
// throne sanctuary with a golden throne on a dais between two seated colossi. Side wings: embalming gallery, burial
// chamber (sarcophagus, gilded coffin, canopic jars, chests), scribes' gallery and a treasury full of grave goods.
// Hunters appear at the ruined south gate when the search starts.
import * as THREE from "three";
import * as T from "../textures";
import * as E from "./tex/egypt";
import { Kit, boxGeo, grid, type Mat, type World } from "./kit";

type G = THREE.BufferGeometry;
type V3t = [number, number, number];
const V3 = THREE.Vector3;

function place(geo: G, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, s?: V3t) {
  const m = new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new V3(...(s ?? [1, 1, 1])));
  return geo.applyMatrix4(m);
}
function lathe(pts: [number, number][], seg = 28) {
  return new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg);
}
function beam(a: V3t, b: V3t, r1: number, r2 = r1, seg = 10) {
  const va = new V3(...a), vb = new V3(...b);
  const len = va.distanceTo(vb);
  const geo = new THREE.CylinderGeometry(r2, r1, len, seg);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), vb.clone().sub(va).normalize()));
  const c = va.add(vb).multiplyScalar(0.5);
  geo.translate(c.x, c.y, c.z);
  return geo;
}
function worldUV(geo: G, unit: number) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  if (!uv || !n) return geo;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ay >= ax && ay >= az) uv.setXY(i, p.getX(i) / unit, p.getZ(i) / unit);
    else if (ax >= az) uv.setXY(i, p.getZ(i) / unit, p.getY(i) / unit);
    else uv.setXY(i, p.getX(i) / unit, p.getY(i) / unit);
  }
  uv.needsUpdate = true;
  return geo;
}
/** box whose top is narrower (battered Egyptian walls / pylons / obelisks) */
function taper(w: number, h: number, d: number, tx: number, tz: number) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setXYZ(i, p.getX(i) * tx, p.getY(i), p.getZ(i) * tz);
  geo.computeVertexNormals();
  return geo;
}
class Batch {
  private map = new Map<Mat, G[]>();
  add(m: Mat, geo: G, unit?: number) {
    if (unit) worldUV(geo, unit);
    let l = this.map.get(m);
    if (!l) { l = []; this.map.set(m, l); }
    l.push(geo);
  }
  flush(k: Kit) {
    for (const [m, geos] of this.map) if (geos.length) k.merged(geos, m);
    this.map.clear();
  }
}
class Frame {
  constructor(public x: number, public z: number, public ry: number, public y = 0, public s = 1) {}
  pt(lx: number, lz: number): [number, number] {
    const c = Math.cos(this.ry), s = Math.sin(this.ry);
    return [this.x + lx * c + lz * s, this.z - lx * s + lz * c];
  }
  /** local geometry (in unit scale) → world; lx/ly/lz are multiplied by the frame scale */
  put(geo: G, lx: number, ly: number, lz: number, rx = 0, ry = 0, rz = 0, sc?: V3t) {
    const s = this.s;
    place(geo, lx * s, ly * s, lz * s, rx, ry, rz, sc ? [sc[0] * s, sc[1] * s, sc[2] * s] : [s, s, s]);
    geo.applyMatrix4(new THREE.Matrix4().makeRotationY(this.ry));
    geo.translate(this.x, this.y, this.z);
    return geo;
  }
  /** geometry already built in local (scaled) coordinates */
  raw(geo: G) {
    geo.scale(this.s, this.s, this.s);
    geo.applyMatrix4(new THREE.Matrix4().makeRotationY(this.ry));
    geo.translate(this.x, this.y, this.z);
    return geo;
  }
  col(k: Kit, lx1: number, lx2: number, lz1: number, lz2: number, bottom: number, top: number, standable = true) {
    const xs: number[] = [], zs: number[] = [];
    for (const [a, b] of [[lx1, lz1], [lx2, lz1], [lx1, lz2], [lx2, lz2]]) {
      const [x, z] = this.pt(a * this.s, b * this.s);
      xs.push(x); zs.push(z);
    }
    k.collider(Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs), this.y + bottom * this.s, this.y + top * this.s, standable);
  }
}

type Inst = { pos: V3t; rotX?: number; rotY?: number; rotZ?: number; scale?: V3t; color?: string };

// sun: low golden-hour sun from the south-west
const SUN: V3t = [-14, 22, 8];
const SHX = SUN[0] / SUN[1], SHZ = SUN[2] / SUN[1]; // light travels -SUN: floor offset per metre of drop = (-SHX, -SHZ)

export function buildEgypt(): World {
  const k = new Kit(8, 3.2);
  const b = new Batch();
  let seed = 23;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const rr = (a: number, c: number) => a + rnd() * (c - a);

  // ---------------- materials ----------------
  const tx = (key: string, f: () => T.PaintTex) => k.tex("eg-" + key, f);
  const tBlock = tx("block", () => E.sandstone());
  const mBlock = k.mat(tBlock, "#ffffff", [1, 1], { roughness: 0.92, bump: 1.0 });
  const mBlockShade = k.mat(tBlock, "#c9b69a", [1, 1], { roughness: 0.95, bump: 1.0 });
  const mRelief = k.mat(tx("relief1", () => E.relief(1)), "#ffffff", [1, 1], { roughness: 0.9, bump: 1.1 });
  const mRelief2 = k.mat(tx("relief2", () => E.relief(7, false, "#c9a270")), "#ffffff", [1, 1], { roughness: 0.9, bump: 1.1 });
  const mPainted = k.mat(tx("tomb", () => E.relief(3, true)), "#ffffff", [1, 1], { roughness: 0.85, bump: 0.6 });
  const mCol = k.mat(tx("col", () => E.columnBand()), "#ffffff", [4, 1], { roughness: 0.9, bump: 1.0 });
  const mCap = k.mat(tx("cap", () => E.capital()), "#ffffff", [3, 1], { roughness: 0.9, bump: 0.7 });
  const mBand = k.mat(tx("band", () => E.glyphBand()), "#ffffff", [1, 1], { roughness: 0.9, bump: 1.0 });
  const mObelisk = k.mat(tx("col", () => E.columnBand()), "#e3b3a0", [1, 1], { roughness: 0.6, bump: 1.0 });
  const mStars = k.mat(tx("stars", () => E.starCeiling()), "#ffffff", [1, 1], { roughness: 0.9, bump: 0.3 });
  const mPave = k.mat(tx("pave", () => E.paving()), "#ffffff", [1, 1], { roughness: 0.88, bump: 0.8 });
  const mSand = k.mat(tx("sand", () => E.sand()), "#ffffff", [1, 1], { roughness: 1, bump: 0.5 });
  const mDune = k.mat(tx("sand", () => E.sand()), "#f0d8b0", [1, 1], { roughness: 1, bump: 0.3 });
  const tHam = tx("ham", () => E.hammered());
  const mGold = k.mat(tHam, "#e2b14a", [1, 1], { metalness: 1, roughness: 0.3, bump: 0.25 });
  const mGoldPale = k.mat(tHam, "#f0cf7a", [1, 1], { metalness: 0.9, roughness: 0.35, bump: 0.2 });
  const mDisk = k.mat(tx("disk", E.wingedDisk), "#ffffff", [1, 1], { metalness: 0.55, roughness: 0.35, bump: 0.4 });
  const mNemes = k.mat(tx("nemes", () => E.nemes()), "#ffffff", [1, 1], { metalness: 0.6, roughness: 0.3, bump: 0.3 });
  const mNemesStone = k.mat(tx("nemes-s", () => E.nemes("#c8a574", "#8a6a48")), "#ffffff", [1, 1], { roughness: 0.85, bump: 0.8 });
  const mBasalt = k.mat(tx("basalt", () => E.basalt()), "#ffffff", [1, 1], { roughness: 0.32, bump: 0.3 });
  const mGranite = k.mat(tx("granite", () => E.granite()), "#ffffff", [1, 1], { roughness: 0.5, bump: 0.4 });
  const mLime = k.mat(tx("lime", () => T.noise("#e6d7ba", 0.07, 4, 2500)), "#ffffff", [1, 1], { roughness: 0.8, bump: 0.4 });
  const mCedar = k.mat(tx("cedar", () => E.woodGrain("#6b4527")), "#ffffff", [1, 1], { roughness: 0.6, bump: 0.6 });
  const mEbony = k.mat(tx("ebony", () => E.woodGrain("#2a1a12", 4)), "#ffffff", [1, 1], { roughness: 0.4, bump: 0.5 });
  const mChest = k.mat(tx("chest", () => E.chestPanel()), "#ffffff", [1, 1], { roughness: 0.6, bump: 0.4 });
  const mChest2 = k.mat(tx("chest2", () => E.chestPanel(33)), "#ffffff", [1, 1], { roughness: 0.6, bump: 0.4 });
  const mWeave = k.mat(tx("weave", () => E.weave()), "#ffffff", [1, 1], { roughness: 0.95, bump: 0.8 });
  const mMat = k.mat(tx("reedmat", () => E.weave("#a8844c", 5)), "#ffffff", [1, 1], { roughness: 0.95, bump: 0.6 });
  const mLinen = k.mat(tx("linen", E.linen), "#ffffff", [1, 1], { roughness: 0.95, bump: 0.7 });
  const mPot = k.mat(tx("pot", () => E.pottery()), "#ffffff", [1, 1], { roughness: 0.85, bump: 0.4 });
  const mClay = k.mat(tx("clay", () => T.noise("#a45f3a", 0.1, 8, 1500)), "#ffffff", [1, 1], { roughness: 0.9, bump: 0.4 });
  const mAlab = k.mat(tx("alab", () => E.alabaster()), "#ffffff", [1, 1], { roughness: 0.35, bump: 0.3 });
  const mAlabPlain = k.mat(null, "#eadfc6", [1, 1], { roughness: 0.35 });
  const mLapis = k.mat(null, "#1f3f86", [1, 1], { roughness: 0.25, metalness: 0.1 });
  const mCarn = k.mat(null, "#a8412c", [1, 1], { roughness: 0.3 });
  const mFaience = k.mat(null, "#2aa39a", [1, 1], { roughness: 0.18 });
  const mBronze = k.mat(tHam, "#8a5a2b", [1, 1], { metalness: 0.9, roughness: 0.45, bump: 0.2 });
  const mRed = k.mat(tx("velvet", () => T.noise("#8e1f1a", 0.1, 6, 1800)), "#ffffff", [1, 1], { roughness: 0.9, bump: 0.3 });
  const mFlame = k.mat(null, "#ffcf70", [1, 1], { emissive: "#ff9a2a", emissiveIntensity: 3.2 });
  const mEmber = k.mat(null, "#ff6a1a", [1, 1], { emissive: "#ff4a0a", emissiveIntensity: 2.0, roughness: 1 });
  const mBark = k.mat(tx("bark", E.palmBark), "#ffffff", [1, 1], { roughness: 0.95, bump: 1.0 });
  const mFrond = k.mat(tx("frond", E.frond), "#ffffff", [1, 1], { transparent: true, roughness: 0.8 });
  const mFood = k.mat(null, "#ffffff", [1, 1], { roughness: 0.7 });
  const mBlue = k.mat(null, "#2b5aa8", [1, 1], { roughness: 0.6 });
  const mWhiteCloth = k.mat(tx("linen", E.linen), "#f4efe2", [1, 1], { roughness: 0.95, bump: 0.5 });
  const mPyr = k.mat(tx("sand", () => E.sand()), "#e8c99a", [1, 1], { roughness: 1, bump: 0.2 });

  const H = { hall: 8, side: 5, throne: 7 };
  const DOOR = 3.2;

  // ---------------- construction helpers ----------------
  const boxAt = (m: Mat, x1: number, x2: number, y1: number, y2: number, z1: number, z2: number, unit = 4, solid = true, standable = true) => {
    b.add(m, place(new THREE.BoxGeometry(x2 - x1, y2 - y1, z2 - z1), (x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2), unit);
    if (solid) k.collider(x1, x2, z1, z2, y1, y2, standable);
  };
  /** cavetto cornice (the classic Egyptian flared crown) along a wall top; out = which side(s) flare */
  const corniceGeo = (len: number, t: number) => {
    const sh = new THREE.Shape();
    const o = 0.5, hh = 0.75;
    sh.moveTo(-t / 2, 0);
    sh.lineTo(t / 2, 0);
    sh.lineTo(t / 2 + 0.08, 0.1);
    sh.quadraticCurveTo(t / 2 + 0.12, 0.55, t / 2 + o, hh);
    sh.lineTo(t / 2 + o, hh + 0.12);
    sh.lineTo(-t / 2 - o, hh + 0.12);
    sh.lineTo(-t / 2 - o, hh);
    sh.quadraticCurveTo(-t / 2 - 0.12, 0.55, -t / 2 - 0.08, 0.1);
    sh.lineTo(-t / 2, 0);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: len, bevelEnabled: false, curveSegments: 6 });
    geo.translate(0, 0, -len / 2);
    return geo;
  };
  const cornice = (axis: "x" | "z", c: number, a1: number, a2: number, y: number, t: number) => {
    const geo = corniceGeo(a2 - a1, t);
    if (axis === "x") place(geo, (a1 + a2) / 2, y, c, 0, Math.PI / 2, 0);
    else place(geo, c, y, (a1 + a2) / 2);
    b.add(mBlock, geo, 3);
    // torus roll moulding under it
    b.add(mBlockShade, axis === "x" ? beam([a1, y - 0.06, c], [a2, y - 0.06, c], 0.08) : beam([c, y - 0.06, a1], [c, y - 0.06, a2], 0.08));
  };
  /** door frame: jambs + lintel with glyph band + small cornice, on both faces of a wall */
  const doorFrame = (axis: "x" | "z", c: number, a: number, w: number, h: number, t: number) => {
    for (const side of [-1, 1]) {
      const off = side * (t / 2 + 0.06);
      for (const s of [-1, 1]) {
        const pa = a + s * (w / 2 + 0.2);
        if (axis === "x") boxAt(mBand, pa - 0.2, pa + 0.2, 0, h + 0.1, c + off - 0.06, c + off + 0.06, 1.2, true, false);
        else boxAt(mBand, c + off - 0.06, c + off + 0.06, 0, h + 0.1, pa - 0.2, pa + 0.2, 1.2, true, false);
      }
      if (axis === "x") boxAt(mBand, a - w / 2 - 0.45, a + w / 2 + 0.45, h + 0.1, h + 0.75, c + off - 0.08, c + off + 0.08, 1.3, false);
      else boxAt(mBand, c + off - 0.08, c + off + 0.08, h + 0.1, h + 0.75, a - w / 2 - 0.45, a + w / 2 + 0.45, 1.3, false);
    }
  };
  type Door = [number, number, number?];
  /** straight wall with door openings. split: relief (0..split) + blocks above */
  const wall = (axis: "x" | "z", c: number, a1: number, a2: number, h: number, doors: Door[] = [], low: Mat = mRelief, split = 4, t = 1, frame = true) => {
    let cur = a1;
    const seg = (s1: number, s2: number, y1: number, y2: number, m: Mat) => {
      if (s2 - s1 < 0.01 || y2 - y1 < 0.01) return;
      if (axis === "x") boxAt(m, s1, s2, y1, y2, c - t / 2, c + t / 2);
      else boxAt(m, c - t / 2, c + t / 2, y1, y2, s1, s2);
    };
    const full = (s1: number, s2: number) => {
      if (split > 0 && split < h) { seg(s1, s2, 0, split, low); seg(s1, s2, split, h, mBlock); }
      else seg(s1, s2, 0, h, low);
    };
    for (const [dc, dw, dh0] of [...doors].sort((p, q) => p[0] - q[0])) {
      const dh = dh0 ?? DOOR;
      full(cur, dc - dw / 2);
      seg(dc - dw / 2, dc + dw / 2, dh, h, mBlock);
      if (frame) doorFrame(axis, c, dc, dw, dh, t);
      cur = dc + dw / 2;
    }
    full(cur, a2);
  };
  /** roof/ceiling slab with rectangular holes; under = ceiling material (thin layer) */
  const slab = (x1: number, x2: number, z1: number, z2: number, y: number, th: number, under: Mat | null, holes: [number, number, number, number][] = []) => {
    const xs = [...new Set([x1, x2, ...holes.flatMap((h) => [h[0], h[1]])])].sort((p, q) => p - q);
    const zs = [...new Set([z1, z2, ...holes.flatMap((h) => [h[2], h[3]])])].sort((p, q) => p - q);
    for (let i = 0; i < xs.length - 1; i++) {
      let start = -1;
      for (let j = 0; j <= zs.length - 1; j++) {
        const inside = j < zs.length - 1 && !holes.some((h) => xs[i] >= h[0] && xs[i + 1] <= h[1] && zs[j] >= h[2] && zs[j + 1] <= h[3]);
        if (inside && start < 0) start = j;
        if (!inside && start >= 0) {
          boxAt(mBlockShade, xs[i], xs[i + 1], y + 0.03, y + th, zs[start], zs[j], 4);
          if (under) b.add(under, place(new THREE.BoxGeometry(xs[i + 1] - xs[i], 0.03, zs[j] - zs[start]), (xs[i] + xs[i + 1]) / 2, y + 0.015, (zs[start] + zs[j]) / 2), 2.5);
          start = -1;
        }
      }
    }
  };
  // god-ray material: additive, not a paintable surface
  const rayTex = E.rayGrad().texture;
  const rayMat = new THREE.MeshBasicMaterial({ map: rayTex, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: true, color: "#ffd9a0" });
  const rays: G[] = [];
  /** sheared light prism from a roof hole (x1..x2, z1..z2 at height y) down to the floor along the sun direction */
  const shaft = (x1: number, x2: number, z1: number, z2: number, y: number, inset = 0.1) => {
    const geo = new THREE.CylinderGeometry(Math.SQRT1_2, Math.SQRT1_2, 1, 4, 6, true);
    geo.rotateY(Math.PI / 4);
    geo.translate(0, -0.5, 0);
    geo.scale(x2 - x1 - inset * 2, y, z2 - z1 - inset * 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const drop = -p.getY(i);
      p.setXYZ(i, p.getX(i) - drop * SHX + (x1 + x2) / 2, p.getY(i) + y, p.getZ(i) - drop * SHZ + (z1 + z2) / 2);
    }
    rays.push(geo);
  };

  // ======================================================================
  // FLOORS + OUTSIDE LANDSCAPE
  // ======================================================================
  // forecourt sand (z > 7), interior paving
  b.add(mSand, place(new THREE.BoxGeometry(42, 0.2, 14.5), 0, -0.1, 14), 3);
  b.add(mPave, place(new THREE.BoxGeometry(42, 0.2, 28.5), 0, -0.1, -7.25), 4);
  // paved processional way through the forecourt
  b.add(mPave, place(new THREE.BoxGeometry(4.6, 0.04, 14.2), 0, 0.0, 14), 4);
  // desert outside the walls + distant dunes and pyramids
  b.add(mDune, place(new THREE.BoxGeometry(400, 0.2, 400), 0, -0.14, 0), 6);
  const duneGeo = () => new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + rr(-0.1, 0.1);
    const d = rr(34, 60);
    b.add(mDune, place(duneGeo(), Math.cos(a) * d, -0.2, Math.sin(a) * d, 0, rr(0, 3), 0, [rr(10, 22), rr(2.5, 7), rr(8, 14)]), 8);
  }
  for (const [x, z, s] of [[-70, 120, 1.0], [10, 165, 1.35], [85, 135, 0.6], [-150, 60, 0.7]] as const) {
    b.add(mPyr, place(new THREE.ConeGeometry(52 * s, 62 * s, 4, 1), x, 31 * s - 0.5, z, 0, Math.PI / 4 + 0.2, 0), 10);
  }

  // ======================================================================
  // WALLS
  // ======================================================================
  // north outer wall
  wall("x", -21, -21.5, -9.5, H.side, [], mPainted, 0);
  wall("x", -21, -9.5, 9.5, H.throne, [], mRelief2, 4.2);
  wall("x", -21, 9.5, 21.5, H.side, [], mRelief, 0);
  // west / east outer walls (interior wings)
  wall("z", -21, -21.5, 6, H.side, [], mRelief, 0, 1, false);
  wall("z", 21, -21.5, 6, H.side, [], mRelief, 0, 1, false);
  // tomb gets painted walls on its west side: overlay painted panels
  // z = -9.5 cross wall (tomb|gallery, hall|throne, treasury|gallery)
  wall("x", -9.5, -21.5, -13.5, H.side, [[-17, 2.4]], mRelief2, 0);
  wall("x", -9.5, -13.5, 13.5, H.hall, [[0, 4.2, 4.6]], mRelief, 4.2);
  wall("x", -9.5, 13.5, 21.5, H.side, [[17, 2.4]], mRelief2, 0);
  // throne room side walls
  wall("z", -9.5, -21.5, -10, H.throne, [[-15, 2.4]], mRelief2, 4.2);
  wall("z", 9.5, -21.5, -10, H.throne, [[-15, 2.4]], mRelief2, 4.2);
  // hall side walls
  wall("z", -13.5, -9, 4, H.hall, [[-2, 2.6]], mRelief, 4.2);
  wall("z", 13.5, -9, 4, H.hall, [[-2, 2.6]], mRelief, 4.2);
  // gallery south walls (to forecourt), height 5.4 so their tops join the roofs
  wall("x", 6.5, -21.5, -14, H.side + 0.4, [[-17.5, 2.4]], mBlock, 0);
  wall("x", 6.5, 14, 21.5, H.side + 0.4, [[17.5, 2.4]], mBlock, 0);
  cornice("x", 7.02, -21.5, -14, H.side + 0.4, 0.04);
  cornice("x", 7.02, 14, 21.5, H.side + 0.4, 0.04);
  // painted tomb walls: overlay the inner faces of the burial chamber with the painted relief
  for (const [x1, x2, z1, z2] of [[-20.5, -10, -20.52, -20.48], [-20.52, -20.48, -20.5, -10], [-10.02, -9.98, -20.5, -10], [-20.5, -10, -9.98, -10.02]] as const) {
    if (x2 - x1 > 1) {
      // along x (north / south faces) — skip the door area on the south face
      if (z1 > -15) { boxAt(mPainted, x1, -18.2, 0, H.side, Math.min(z1, z2), Math.max(z1, z2), 4, false); boxAt(mPainted, -15.8, x2, 0, H.side, Math.min(z1, z2), Math.max(z1, z2), 4, false); }
      else boxAt(mPainted, x1, x2, 0, H.side, Math.min(z1, z2), Math.max(z1, z2), 4, false);
    } else if (x1 > -15) {
      boxAt(mPainted, x1, x2, 0, H.side, z1, -16.2, 4, false);
      boxAt(mPainted, x1, x2, 0, H.side, -13.8, z2, 4, false);
    } else boxAt(mPainted, x1, x2, 0, H.side, z1, z2, 4, false);
  }

  // ---------------- PYLON ----------------
  {
    const PH = 11.5;
    for (const s of [-1, 1]) {
      const xc = s * 8.1, w = 11.8, d = 3.2;
      b.add(mRelief2, place(taper(w, PH, d, 0.9, 0.78), xc, PH / 2, 5.5), 7);
      k.collider(xc - w / 2, xc + w / 2, 5.5 - d / 2, 5.5 + d / 2, 0, PH, true);
      // roll mouldings on the vertical corners
      for (const ex of [-1, 1]) for (const ez of [-1, 1]) b.add(mBlockShade, beam([xc + ex * w / 2, 0, 5.5 + ez * d / 2], [xc + ex * w * 0.45, PH, 5.5 + ez * d * 0.39], 0.1));
      // cornice on top
      const cg = corniceGeo(w * 0.9 + 0.2, d * 0.78);
      place(cg, xc, PH, 5.5, 0, Math.PI / 2, 0);
      b.add(mBlock, cg, 3);
      // flag-pole niches + tall cedar poles with pennants
      for (const px of [-2.6, 2.6]) {
        const x = xc + px;
        b.add(mCedar, beam([x, 0, 7.35], [x * 0.995, PH + 3, 6.9], 0.13, 0.08));
        b.add(mBronze, place(new THREE.ConeGeometry(0.12, 0.4, 10), x * 0.995, PH + 3.2, 6.9));
        const fl = new THREE.PlaneGeometry(1.8, 0.7, 6, 1);
        const p = fl.attributes.position;
        for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 2.2) * 0.12);
        b.add(s < 0 ? mRed : mWhiteCloth, place(fl, x * 0.995 + 0.9, PH + 2.3, 6.9, 0, 0, -0.08));
        k.collider(x - 0.16, x + 0.16, 7.1, 7.5, 0, 4, false);
      }
    }
    // gateway block between the towers, portal 4.4 x 6.4
    b.add(mBlock, place(new THREE.BoxGeometry(4.6, 9.4 - 6.4, 3.0), 0, (9.4 + 6.4) / 2, 5.5), 4);
    k.collider(-2.3, 2.3, 4, 7, 6.4, 9.4, true);
    b.add(mDisk, place(new THREE.BoxGeometry(4.2, 1.6, 0.06), 0, 7.4, 7.03));
    b.add(mDisk, place(new THREE.BoxGeometry(4.2, 1.6, 0.06), 0, 7.4, 3.97, 0, Math.PI, 0));
    const gc = corniceGeo(5.2, 3.0);
    place(gc, 0, 9.4, 5.5, 0, Math.PI / 2, 0);
    b.add(mBlock, gc, 3);
    // portal jambs with glyph bands
    for (const s of [-1, 1]) boxAt(mBand, s * 2.2 - 0.12, s * 2.2 + 0.12, 0, 6.4, 3.9, 7.1, 1.2, false);
    // big bronze-clad door leaves thrown open (one fallen)
    b.add(mCedar, place(boxGeo(2.1, 5.6, 0.18), -2.1, 2.8, 3.2, 0, -1.25, 0), 1.5);
    k.collider(-2.4, -1.8, 2.1, 4.1, 0, 5.6, false);
    for (let i = 0; i < 5; i++) b.add(mBronze, place(new THREE.BoxGeometry(2.12, 0.08, 0.2), -2.1, 0.6 + i * 1.1, 3.2, 0, -1.25, 0));
    b.add(mCedar, place(boxGeo(2.1, 0.2, 5.0), 2.9, 0.1, 1.2, 0, 0.35, 0.05), 1.5);
    for (let i = 0; i < 5; i++) b.add(mBronze, place(new THREE.BoxGeometry(2.12, 0.22, 0.08), 2.9, 0.12, 1.2 - 2 + i, 0, 0.35, 0.05));
  }

  // ---------------- forecourt perimeter (ruined) ----------------
  const ruinWall = (axis: "x" | "z", c: number, a1: number, a2: number, hMin: number, hMax: number, t = 1.2) => {
    let a = a1;
    while (a < a2 - 0.01) {
      const len = Math.min(a2 - a, rr(1.6, 3.4));
      const h = rr(hMin, hMax);
      if (axis === "x") boxAt(mBlock, a, a + len, 0, h, c - t / 2, c + t / 2);
      else boxAt(mBlock, c - t / 2, c + t / 2, 0, h, a, a + len);
      // loose top blocks (stepped, broken outline)
      if (rnd() < 0.6) {
        const l2 = len * rr(0.3, 0.7), o = rr(0, len - l2), h2 = rr(0.4, 0.8);
        if (axis === "x") boxAt(mBlockShade, a + o, a + o + l2, h, h + h2, c - t / 2 + 0.05, c + t / 2 - 0.1);
        else boxAt(mBlockShade, c - t / 2 + 0.1, c + t / 2 - 0.05, h, h + h2, a + o, a + o + l2);
      }
      a += len;
    }
  };
  ruinWall("z", -21.1, 7, 9.5, 4.5, 5.2);
  boxAt(mBlock, -21.7, -20.5, 0, 5.5, 9.5, 20.5); // portico back wall
  ruinWall("x", 21.1, -21.7, -3.2, 2.2, 4.2);
  ruinWall("x", 21.1, 3.2, 21.7, 2.2, 4.4);
  ruinWall("z", 21.1, 7, 21.7, 3.0, 4.6);
  // ruined gate posts at the south entrance
  for (const s of [-1, 1]) {
    boxAt(mRelief, s * 3.7 - 0.6, s * 3.7 + 0.6, 0, s < 0 ? 5.6 : 3.4, 20.4, 21.8, 3.5);
    if (s < 0) cornice("x", 21.1, -4.5, -2.9, 5.6, 1.1);
  }
  // fallen lintel of the gate, half buried
  b.add(mBand, place(boxGeo(4.8, 0.7, 1.0), 3.2, 0.25, 19.3, 0.1, 0.5, 0.08), 1.3);
  k.collider(1.3, 5.1, 18.1, 20.5, 0, 0.6, true);

  // ---------------- roofs ----------------
  // hall: star ceiling, collapsed bay + two clerestory slots over the nave
  const hallHoles: [number, number, number, number][] = [[-10.8, -6.8, -4.2, -0.4], [-1.3, 1.3, 2.2, 3.0], [-1.3, 1.3, -4.8, -4.0]];
  slab(-14, 14, -10, 4, H.hall, 0.5, mStars, hallHoles);
  for (const hh of hallHoles) shaft(hh[0], hh[1], hh[2], hh[3], H.hall);
  // throne room: opening that throws a spotlight on the throne
  const throneHole: [number, number, number, number] = [-4.4, -2.8, -17.6, -16.0];
  slab(-10, 10, -21.5, -10, H.throne, 0.5, mStars, [throneHole]);
  shaft(...throneHole, H.throne - 1.2, 0.05);
  // wings (roof top at 5.4 so they meet the south walls and the stair landing)
  const gHoleW: [number, number, number, number] = [-19.4, -17.8, -3.8, -2.4];
  const gHoleE: [number, number, number, number] = [15.2, 16.8, 0.2, 1.6];
  slab(-21.5, -14, -10, 6, H.side, 0.4, mBlockShade, [gHoleW]);
  slab(14, 21.5, -10, 6, H.side, 0.4, mBlockShade, [gHoleE]);
  shaft(...gHoleW, H.side);
  shaft(...gHoleE, H.side);
  slab(-21.5, -10, -21.5, -10, H.side, 0.4, mStars);
  slab(10, 21.5, -21.5, -10, H.side, 0.4, mStars);
  // cornices along the wing and hall roof edges
  cornice("x", 4.02, -14, 14, H.hall + 0.5, 0.04);
  cornice("z", -21.52, -21.5, 6, H.side + 0.4, 0.04);
  cornice("z", 21.52, -21.5, 6, H.side + 0.4, 0.04);
  // broken edge blocks around the collapse
  for (let i = 0; i < 7; i++) boxAt(mBlockShade, -10.8 + i * 0.6, -10.4 + i * 0.6, H.hall + 0.5, H.hall + 0.5 + rr(0.1, 0.5), -0.4, -0.1 + rr(0, 0.3), 2, true);

  // ======================================================================
  // HYPOSTYLE HALL
  // ======================================================================
  k.room("Hypostyle Hall", -13.5, 13.5, -9.5, 4);
  const colXs = [-10, -6.4, -2.8, 2.8, 6.4, 10];
  const colZs = [-6.3, -2.6, 1.0];
  const shaftPts: [number, number][] = [[0.82, 0], [0.87, 0.35], [0.86, 1.4], [0.82, 3.0], [0.76, 4.6], [0.72, 5.5]];
  const column = (x: number, z: number, broken = 0) => {
    b.add(mBlockShade, place(lathe([[0, 0], [1.08, 0], [1.1, 0.28], [1.0, 0.36], [0, 0.36]], 32), x, 0, z));
    if (broken) {
      // stump + jagged top
      const pts = shaftPts.filter((p) => p[1] < broken).concat([[0.8, broken], [0.5, broken + 0.18], [0, broken + 0.05]]);
      b.add(mCol, place(lathe(pts, 32), x, 0.36, z));
      k.collider(x - 0.85, x + 0.85, z - 0.85, z + 0.85, 0, broken + 0.4, true);
      return;
    }
    b.add(mCol, place(lathe(shaftPts, 32), x, 0.36, z));
    for (let i = 0; i < 3; i++) b.add(mBlockShade, place(new THREE.TorusGeometry(0.73, 0.05, 6, 32), x, 5.5 + i * 0.13, z, Math.PI / 2, 0, 0));
    b.add(mCap, place(lathe([[0.72, 0], [0.9, 0.25], [1.2, 0.65], [1.42, 1.0], [1.5, 1.15], [1.46, 1.22], [0, 1.22]], 32), x, 5.9, z));
    b.add(mBlock, place(boxGeo(1.9, 0.3, 1.9), x, 7.26, z), 2);
    k.collider(x - 0.85, x + 0.85, z - 0.85, z + 0.85, 0, 5.9, true);
    k.collider(x - 1.45, x + 1.45, z - 1.45, z + 1.45, 5.9, 7.4, true);
  };
  for (const z of colZs) for (const x of colXs) column(x, z, x === -6.4 && z === -2.6 ? 1.9 : x === 10 && z === 1.0 ? 3.6 : 0);
  // architraves along each row of columns (x) and down the nave (z)
  for (const z of colZs) {
    boxAt(mBand, -13, 13, 7.41, 8.0, z - 0.55, z + 0.55, 2.4, false);
    k.collider(-13, 13, z - 0.55, z + 0.55, 7.41, 8.0, true);
  }
  for (const x of [-2.8, 2.8]) boxAt(mBand, x - 0.5, x + 0.5, 7.41, 8.0, -9, 4, 2.4, false);
  // the broken column's drums lying in the aisle
  const drum = (x: number, z: number, ry: number, len: number, r = 0.8) => {
    b.add(mCol, place(new THREE.CylinderGeometry(r, r, len, 28), x, r * 0.92, z, 0, ry, Math.PI / 2));
    const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry));
    const hx = (len / 2) * c + r * s, hz = (len / 2) * s + r * c;
    k.collider(x - hx * 0.9, x + hx * 0.9, z - hz * 0.9, z + hz * 0.9, 0, r * 1.7, true);
  };
  drum(-7.6, 0.6, 0.35, 1.5);
  drum(-9.4, -1.2, 1.2, 1.2);
  b.add(mCap, place(lathe([[0.72, 0], [0.9, 0.25], [1.2, 0.65], [1.42, 1.0], [1.5, 1.15], [1.46, 1.22], [0, 1.22]], 32), -4.6, 1.45, -0.6, 1.9, 0.3, 0.2));
  k.collider(-5.6, -3.7, -1.6, 0.3, 0, 1.6, true);
  // rubble heap under the collapsed bay + roof blocks
  const rubble: Inst[] = [];
  const addRubble = (cx: number, cz: number, rad: number, n: number, smax: number) => {
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * rad;
      const s = rr(0.18, smax) * (1 - d / rad * 0.5);
      rubble.push({ pos: [cx + Math.cos(a) * d, s * 0.35, cz + Math.sin(a) * d], rotX: rr(-0.4, 0.4), rotY: rr(0, 3), rotZ: rr(-0.4, 0.4), scale: [s * rr(1, 1.8), s * rr(0.6, 1), s * rr(0.8, 1.4)] });
    }
  };
  addRubble(-8.8, -2.2, 2.2, 40, 0.7);
  boxAt(mBlockShade, -10.2, -8.6, 0, 0.5, -3.6, -2.8, 2);
  b.add(mBlockShade, place(boxGeo(2.6, 0.5, 1.2), -7.9, 0.55, -3.3, 0.2, 0.4, 0.35), 2);
  k.collider(-9.1, -6.7, -4.0, -2.6, 0, 1.0, true);
  // sand drift that blew in through the collapse and the gateway
  const drift = (x: number, z: number, sx: number, sz: number, h: number, ry = 0) =>
    b.add(mSand, place(new THREE.SphereGeometry(1, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2), x, -0.02, z, 0, ry, 0, [sx, h, sz]), 3);
  drift(-8.5, -2.0, 3.2, 2.4, 0.28);
  drift(0.6, 3.0, 2.4, 1.6, 0.18, 0.3);
  drift(-2.4, 6.2, 1.8, 1.4, 0.3);
  drift(2.6, 7.6, 2.2, 1.2, 0.35);

  // ---------------- statues ----------------
  /** seated pharaoh (generic). s = 1 → ~2.45 m seated height; facing local +z */
  const seated = (x: number, z: number, y0: number, s: number, ry: number, m: Mat, head: Mat, detail: Mat) => {
    const f = new Frame(x, z, ry, y0, s);
    const P = (geo: G, lx: number, ly: number, lz: number, mm = m, rx = 0, rY = 0, rz = 0, sc?: V3t) => b.add(mm, f.put(geo, lx, ly, lz, rx, rY, rz, sc));
    P(boxGeo(1.2, 0.95, 1.3), 0, 0.475, -0.1);
    P(boxGeo(1.2, 0.08, 1.34), 0, 0.99, -0.1, detail);
    P(boxGeo(0.62, 1.65, 0.28), 0, 1.78, -0.64);
    for (const sx of [-1, 1]) {
      P(boxGeo(0.21, 0.9, 0.27), sx * 0.13, 0.49, 0.5);
      P(boxGeo(0.21, 0.1, 0.4), sx * 0.13, 0.05, 0.62);
      P(boxGeo(0.23, 0.25, 0.8), sx * 0.13, 1.1, 0.18);
      P(new THREE.CylinderGeometry(0.075, 0.08, 0.5, 12), sx * 0.34, 1.68, -0.1, m, 0.12, 0, 0);
      P(new THREE.CylinderGeometry(0.065, 0.07, 0.55, 12), sx * 0.3, 1.35, 0.14, m, Math.PI / 2 - 0.25, 0, 0);
      P(new THREE.SphereGeometry(0.08, 12, 8), sx * 0.27, 1.26, 0.43);
      P(boxGeo(0.12, 0.34, 0.05), sx * 0.17, 1.97, -0.02, head);
    }
    P(boxGeo(0.52, 0.3, 0.55), 0, 1.1, -0.2);
    P(boxGeo(0.34, 0.26, 0.06), 0, 1.07, 0.1, detail);
    P(new THREE.CylinderGeometry(0.3, 0.21, 0.75, 16), 0, 1.6, -0.15, m, 0, 0, 0, [1, 1, 0.62]);
    P(new THREE.CylinderGeometry(0.29, 0.29, 0.06, 16), 0, 1.96, -0.14, detail, 0, 0, 0, [1, 1, 0.62]);
    P(new THREE.CylinderGeometry(0.085, 0.09, 0.14, 12), 0, 2.02, -0.14);
    P(new THREE.SphereGeometry(0.16, 16, 12), 0, 2.2, -0.12, m, 0, 0, 0, [0.9, 1.12, 1]);
    P(new THREE.SphereGeometry(0.185, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), 0, 2.22, -0.15, head, 0, 0, 0, [1.05, 1.05, 1]);
    P(boxGeo(0.46, 0.38, 0.1), 0, 2.08, -0.28, head);
    P(boxGeo(0.05, 0.08, 0.06), 0, 2.2, 0.03);
    P(new THREE.CylinderGeometry(0.035, 0.03, 0.16, 8), 0, 2.0, -0.02, detail);
    P(new THREE.ConeGeometry(0.025, 0.08, 8), 0, 2.4, 0.03, detail);
    f.col(k, -0.62, 0.62, -0.8, 0.82, 0, 1.0, true);
    f.col(k, -0.35, 0.35, -0.8, 0.1, 1.0, 2.4, true);
  };
  /** standing jackal-headed guardian (generic) holding a staff; s = 1 → ~2.4 m */
  const jackalGuard = (x: number, z: number, y0: number, s: number, ry: number) => {
    const f = new Frame(x, z, ry, y0, s);
    const P = (geo: G, lx: number, ly: number, lz: number, mm = mBasalt, rx = 0, rY = 0, rz = 0, sc?: V3t) => b.add(mm, f.put(geo, lx, ly, lz, rx, rY, rz, sc));
    P(boxGeo(0.7, 0.14, 1.0), 0, 0.07, 0.05, mGold);
    for (const [sx, lz] of [[-1, 0.2], [1, -0.12]] as const) {
      P(boxGeo(0.12, 0.08, 0.28), sx * 0.11, 0.18, lz + 0.06);
      b.add(mBasalt, f.raw(beam([sx * 0.11, 0.2, lz], [sx * 0.12, 1.05, 0], 0.06, 0.1, 12)));
    }
    P(new THREE.CylinderGeometry(0.2, 0.27, 0.42, 16), 0, 0.98, 0, mGold, 0, 0, 0, [1, 1, 0.7]);
    P(new THREE.CylinderGeometry(0.26, 0.17, 0.62, 16), 0, 1.5, 0, mBasalt, 0, 0, 0, [1, 1, 0.62]);
    P(new THREE.CylinderGeometry(0.28, 0.27, 0.1, 16), 0, 1.78, 0.01, mGold, 0, 0, 0, [1, 1, 0.66]);
    for (const sx of [-1, 1]) {
      b.add(mBasalt, f.raw(beam([sx * 0.3, 1.78, 0], [sx * 0.33, 1.4, 0.02], 0.065, 0.055)));
      b.add(mBasalt, f.raw(beam([sx * 0.33, 1.4, 0.02], [sx * 0.33, 1.12, 0.14], 0.05, 0.045)));
      P(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 12), sx * 0.33, 1.3, 0.06, mGold);
    }
    // staff (was-sceptre) + ankh
    b.add(mGold, f.raw(beam([0.33, 0.14, 0.22], [0.33, 2.35, 0.22], 0.025)));
    P(boxGeo(0.06, 0.06, 0.2), 0.33, 2.36, 0.28, mGold, 0.5, 0, 0);
    P(new THREE.TorusGeometry(0.06, 0.018, 6, 12), -0.34, 1.12, 0.14, mGold);
    // jackal head
    P(new THREE.CylinderGeometry(0.08, 0.09, 0.16, 12), 0, 1.88, 0);
    P(new THREE.SphereGeometry(0.14, 16, 12), 0, 2.04, -0.01, mBasalt, 0, 0, 0, [0.9, 0.95, 1.05]);
    P(new THREE.ConeGeometry(0.075, 0.3, 12), 0, 1.99, 0.2, mBasalt, Math.PI / 2, 0, 0, [1, 1, 0.8]);
    for (const sx of [-1, 1]) P(new THREE.ConeGeometry(0.05, 0.24, 8), sx * 0.07, 2.25, -0.03, mBasalt, -0.1, 0, sx * -0.12, [1, 1, 0.5]);
    P(new THREE.SphereGeometry(0.16, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), 0, 2.02, -0.04, mNemes, -0.4, 0, 0, [1.02, 1.2, 1]);
    for (const sx of [-1, 1]) P(boxGeo(0.09, 0.3, 0.05), sx * 0.13, 1.82, 0.06, mNemes);
    f.col(k, -0.35, 0.35, -0.5, 0.55, 0, 2.3, false);
  };
  /** seated cat (generic, Bastet-like); s = 1 → ~1.05 m */
  const cat = (x: number, z: number, y0: number, s: number, ry: number, m = mBasalt, trim = mGold) => {
    const f = new Frame(x, z, ry, y0, s);
    const P = (geo: G, lx: number, ly: number, lz: number, mm = m, rx = 0, rY = 0, rz = 0, sc?: V3t) => b.add(mm, f.put(geo, lx, ly, lz, rx, rY, rz, sc));
    P(lathe([[0, 0], [0.2, 0.0], [0.25, 0.08], [0.26, 0.2], [0.22, 0.4], [0.16, 0.6], [0.12, 0.74], [0.1, 0.8], [0, 0.82]], 24), 0, 0, -0.06, m, 0, 0, 0, [0.85, 1, 1.3]);
    for (const sx of [-1, 1]) {
      P(new THREE.CylinderGeometry(0.04, 0.048, 0.56, 10), sx * 0.075, 0.3, 0.2, m, -0.08, 0, 0);
      P(new THREE.SphereGeometry(0.055, 10, 8), sx * 0.075, 0.03, 0.23, m, 0, 0, 0, [1, 0.6, 1.4]);
      P(new THREE.ConeGeometry(0.05, 0.13, 10), sx * 0.065, 1.05, -0.02, m, -0.1, 0, sx * -0.2, [1, 1, 0.45]);
    }
    P(new THREE.SphereGeometry(0.115, 16, 12), 0, 0.93, 0.02, m, 0, 0, 0, [1, 0.95, 1]);
    P(new THREE.SphereGeometry(0.055, 12, 8), 0, 0.9, 0.12, m, 0, 0, 0, [1, 0.8, 1]);
    P(new THREE.TorusGeometry(0.105, 0.018, 6, 20), 0, 0.8, -0.02, trim, Math.PI / 2 - 0.2, 0, 0, [1, 1.2, 1]);
    P(new THREE.TorusGeometry(0.025, 0.007, 6, 12), 0.1, 0.97, 0.0, trim, 0, Math.PI / 2, 0);
    P(new THREE.SphereGeometry(0.03, 8, 6), 0, 0.74, 0.1, trim);
    // tail curling round the front paws
    b.add(m, f.raw(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(0, 0.04, -0.34), new V3(0.22, 0.03, -0.18), new V3(0.26, 0.03, 0.12), new V3(0.12, 0.03, 0.3)]), 16, 0.035, 8)));
  };
  /** recumbent jackal on a shrine chest */
  const jackalShrine = (x: number, z: number, y0: number, s: number, ry: number) => {
    const f = new Frame(x, z, ry, y0, s);
    const P = (geo: G, lx: number, ly: number, lz: number, mm = mBasalt, rx = 0, rY = 0, rz = 0, sc?: V3t) => b.add(mm, f.put(geo, lx, ly, lz, rx, rY, rz, sc));
    P(boxGeo(0.7, 0.62, 1.35), 0, 0.31, 0, mGold);
    for (const sx of [-1, 1]) P(boxGeo(0.02, 0.44, 1.1), sx * 0.355, 0.31, 0, mEbony);
    P(corniceGeo(1.3, 0.62).scale(1, 0.25, 1), 0, 0.62, 0, mGold, 0, 0, 0);
    P(boxGeo(0.7, 0.04, 1.35), 0, 0.84, 0, mGold);
    P(new THREE.SphereGeometry(1, 20, 12), 0, 1.02, -0.1, mBasalt, 0, 0, 0, [0.2, 0.16, 0.46]);
    for (const sx of [-1, 1]) P(boxGeo(0.07, 0.06, 0.4), sx * 0.08, 0.9, 0.35);
    P(new THREE.CylinderGeometry(0.08, 0.1, 0.26, 12), 0, 1.2, 0.26, mBasalt, 0.3, 0, 0);
    P(new THREE.SphereGeometry(0.1, 14, 10), 0, 1.35, 0.3);
    P(new THREE.ConeGeometry(0.05, 0.2, 10), 0, 1.31, 0.45, mBasalt, Math.PI / 2, 0, 0);
    for (const sx of [-1, 1]) P(new THREE.ConeGeometry(0.035, 0.16, 8), sx * 0.05, 1.49, 0.27, mBasalt, 0, 0, sx * -0.1, [1, 1, 0.5]);
    P(new THREE.TorusGeometry(0.09, 0.02, 6, 16), 0, 1.16, 0.25, mGold, Math.PI / 2 - 0.3, 0, 0);
    b.add(mBasalt, f.raw(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(0, 0.98, -0.52), new V3(0.12, 0.9, -0.62), new V3(0.2, 0.84, -0.5)]), 10, 0.025, 6)));
    f.col(k, -0.36, 0.36, -0.68, 0.68, 0, 0.86, true);
  };

  // hall statues: jackal guardians at the sanctuary door, two seated sandstone kings against the north wall
  jackalGuard(-3.3, -8.3, 0.5, 1.15, 0);
  jackalGuard(3.3, -8.3, 0.5, 1.15, 0);
  for (const s of [-1, 1]) boxAt(mBlock, s * 3.3 - 0.55, s * 3.3 + 0.55, 0, 0.5, -8.9, -7.7, 2);
  for (const s of [-1, 1]) {
    boxAt(mBlockShade, s * 9 - 0.9, s * 9 + 0.9, 0, 0.6, -9, -7.2, 2);
    seated(s * 9, -8.25, 0.6, 1.25, 0, mLime, mNemesStone, mBlockShade);
  }
  // colossal fallen head near the collapse
  {
    const f = new Frame(-11.2, 2.6, 0.9, 0, 1.6);
    b.add(mLime, f.put(new THREE.SphereGeometry(0.5, 20, 16), 0, 0.5, 0, 0, 0, 1.2, [0.9, 1.1, 1]));
    b.add(mNemesStone, f.put(new THREE.SphereGeometry(0.56, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), -0.05, 0.5, -0.05, 0, 0, 1.2));
    b.add(mLime, f.put(boxGeo(0.14, 0.24, 0.18), 0.02, 0.62, 0.48, 0, 0, 1.2));
    f.col(k, -0.6, 0.6, -0.6, 0.6, 0, 1.0, true);
  }

  // ---------------- grave goods / props helpers ----------------
  const potProfiles: [number, number][][] = [
    [[0, 0], [0.09, 0], [0.14, 0.08], [0.2, 0.26], [0.21, 0.4], [0.16, 0.56], [0.08, 0.64], [0.07, 0.74], [0.1, 0.77], [0.09, 0.79]],
    [[0, 0], [0.12, 0], [0.2, 0.08], [0.24, 0.2], [0.22, 0.32], [0.14, 0.38], [0.15, 0.42], [0.13, 0.43]],
    [[0, 0], [0.05, 0], [0.12, 0.1], [0.17, 0.3], [0.2, 0.55], [0.16, 0.8], [0.1, 0.92], [0.08, 1.02], [0.12, 1.06], [0.11, 1.08]],
    [[0, 0], [0.07, 0], [0.1, 0.05], [0.13, 0.16], [0.12, 0.26], [0.07, 0.31], [0.08, 0.34]],
  ];
  const pot = (x: number, y: number, z: number, s: number, type: number, m = mPot, solid = s > 0.8) => {
    const pts = potProfiles[type % potProfiles.length];
    b.add(m, place(lathe(pts, 20), x, y, z, 0, rnd() * 6, 0, [s, s, s]));
    const top = pts[pts.length - 1][1] * s;
    if (solid) { const rad = Math.max(...pts.map((p) => p[0])) * s; k.collider(x - rad, x + rad, z - rad, z + rad, y, y + top, true); }
    return top;
  };
  const potCluster = (x: number, z: number, n: number, rad: number, mats: Mat[] = [mPot, mClay]) => {
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * rad;
      pot(x + Math.cos(a) * d, 0, z + Math.sin(a) * d, rr(0.7, 1.5), Math.floor(rnd() * 4), mats[i % mats.length]);
    }
  };
  /** chest with painted sides, gold trim, optional curved lid and carrying poles */
  const chest = (x: number, y: number, z: number, w: number, h: number, d: number, ry: number, curved = false, poles = false, m = mChest) => {
    const f = new Frame(x, z, ry, y, 1);
    b.add(m, f.put(new THREE.BoxGeometry(w, h, d), 0, h / 2 + 0.06, 0));
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) b.add(mGold, f.put(new THREE.BoxGeometry(0.06, 0.08, 0.06), lx * (w / 2 - 0.05), 0.03, lz * (d / 2 - 0.05)));
    b.add(mGold, f.put(new THREE.BoxGeometry(w + 0.03, 0.04, d + 0.03), 0, h + 0.06, 0));
    b.add(mGold, f.put(new THREE.BoxGeometry(w + 0.03, 0.04, d + 0.03), 0, 0.08, 0));
    let top = h + 0.08;
    if (curved) {
      b.add(mEbony, f.put(new THREE.CylinderGeometry(d / 2, d / 2, w, 16, 1, false, 0, Math.PI), 0, h + 0.08, 0, 0, 0, Math.PI / 2, [1, 1, 0.5 / (d / 2) * 0.35]));
      top += 0.18;
    } else b.add(mEbony, f.put(boxGeo(w + 0.04, 0.08, d + 0.04), 0, h + 0.12, 0));
    b.add(mGold, f.put(new THREE.SphereGeometry(0.035, 8, 6), 0, h * 0.7, d / 2 + 0.02));
    if (poles) for (const s of [-1, 1]) b.add(mCedar, f.put(new THREE.CylinderGeometry(0.035, 0.035, w + 1.0, 8), 0, 0.2, s * (d / 2 - 0.1), 0, 0, Math.PI / 2));
    f.col(k, -w / 2, w / 2, -d / 2, d / 2, 0, top + 0.08, true);
    return y + top + 0.08;
  };
  const basket = (x: number, y: number, z: number, r: number, h: number, fill: string | null) => {
    b.add(mWeave, place(new THREE.CylinderGeometry(r, r * 0.85, h, 18, 1, true), x, y + h / 2, z));
    b.add(mWeave, place(new THREE.CircleGeometry(r * 0.85, 18), x, y + 0.01, z, -Math.PI / 2, 0, 0));
    b.add(mWeave, place(new THREE.TorusGeometry(r, 0.02, 6, 18), x, y + h, z, Math.PI / 2, 0, 0));
    if (fill) for (let i = 0; i < 7; i++) food.push({ pos: [x + rr(-r, r) * 0.55, y + h * 0.8 + rr(0, 0.05), z + rr(-r, r) * 0.55], scale: [0.07, 0.06, 0.07].map((v) => v * rr(0.8, 1.3)) as V3t, color: fill });
    if (r > 0.25) k.collider(x - r, x + r, z - r, z + r, y, y + h, true);
  };
  const food: Inst[] = [];
  const coins: Inst[] = [];
  const offeringTable = (x: number, z: number, ry: number) => {
    const f = new Frame(x, z, ry);
    b.add(mLime, f.put(new THREE.CylinderGeometry(0.16, 0.22, 0.75, 16), 0, 0.375, 0));
    b.add(mLime, f.put(boxGeo(0.9, 0.1, 0.7), 0, 0.8, 0));
    b.add(mClay, f.put(new THREE.CylinderGeometry(0.2, 0.14, 0.12, 16), -0.15, 0.91, 0));
    for (let i = 0; i < 6; i++) { const [px, pz] = f.pt(-0.15 + rr(-0.1, 0.1), rr(-0.1, 0.1)); food.push({ pos: [px, 0.99, pz], scale: [0.06, 0.05, 0.06], color: ["#b33a2a", "#e0a53a", "#6b8e3a", "#8a3b6b"][i % 4] }); }
    const [px, pz] = f.pt(0.24, 0.05);
    pot(px, 0.85, pz, 0.7, 3, mAlab, false);
    f.col(k, -0.45, 0.45, -0.35, 0.35, 0, 0.85, true);
  };
  /** wall torch: bronze bracket, torch and emissive flame. ry = direction the wall faces */
  const torch = (x: number, y: number, z: number, ry: number) => {
    const f = new Frame(x, z, ry, y);
    b.add(mBronze, f.put(boxGeo(0.14, 0.3, 0.06), 0, 0, 0.03));
    b.add(mBronze, f.put(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8), 0, 0, 0.18, Math.PI / 2, 0, 0));
    b.add(mCedar, f.raw(beam([0, -0.35, 0.28], [0, 0.35, 0.36], 0.035, 0.045)));
    b.add(mBronze, f.put(lathe([[0.03, 0], [0.09, 0.1], [0.1, 0.16], [0.0, 0.16]], 12), 0, 0.3, 0.36));
    b.add(mEmber, f.put(new THREE.SphereGeometry(0.085, 10, 6), 0, 0.46, 0.36, 0, 0, 0, [1, 0.5, 1]));
    b.add(mFlame, f.put(lathe([[0, 0], [0.08, 0.05], [0.095, 0.14], [0.06, 0.28], [0.025, 0.4], [0, 0.48]], 12), 0, 0.44, 0.36));
  };
  const brazier = (x: number, z: number, s = 1) => {
    const f = new Frame(x, z, 0, 0, s);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; b.add(mBronze, f.raw(beam([Math.cos(a) * 0.32, 0, Math.sin(a) * 0.32], [Math.cos(a) * 0.18, 0.9, Math.sin(a) * 0.18], 0.03))); }
    b.add(mBronze, f.put(lathe([[0.05, 0], [0.3, 0.08], [0.42, 0.22], [0.44, 0.26], [0.0, 0.26]], 20), 0, 0.85, 0));
    b.add(mEmber, f.put(new THREE.SphereGeometry(0.38, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0, 1.06, 0, 0, 0, 0, [1, 0.25, 1]));
    b.add(mFlame, f.put(lathe([[0, 0], [0.2, 0.08], [0.22, 0.25], [0.12, 0.5], [0.04, 0.72], [0, 0.8]], 14), 0, 1.06, 0));
    f.col(k, -0.4, 0.4, -0.4, 0.4, 0, 1.12, false);
  };
  const canopic = (x: number, y: number, z: number, kind: number, ry: number) => {
    const f = new Frame(x, z, ry, y, 1);
    b.add(mAlab, f.put(lathe([[0, 0], [0.09, 0], [0.11, 0.04], [0.135, 0.16], [0.125, 0.3], [0.095, 0.36], [0, 0.36]], 20), 0, 0, 0));
    const hm = kind === 0 ? mAlabPlain : mAlabPlain;
    b.add(hm, f.put(new THREE.SphereGeometry(0.1, 14, 10), 0, 0.43, 0, 0, 0, 0, [1, 1.05, 1]));
    if (kind === 0) { b.add(mNemes, f.put(new THREE.SphereGeometry(0.108, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), 0, 0.44, -0.01)); }
    if (kind === 1) { b.add(hm, f.put(new THREE.ConeGeometry(0.05, 0.16, 10), 0, 0.42, 0.12, Math.PI / 2, 0, 0)); for (const s of [-1, 1]) b.add(hm, f.put(new THREE.ConeGeometry(0.03, 0.12, 8), s * 0.05, 0.54, -0.01, 0, 0, s * -0.15, [1, 1, 0.5])); }
    if (kind === 2) b.add(hm, f.put(new THREE.SphereGeometry(0.06, 10, 8), 0, 0.41, 0.08, 0, 0, 0, [1, 0.8, 1]));
    if (kind === 3) b.add(mGold, f.put(new THREE.ConeGeometry(0.03, 0.08, 8), 0, 0.4, 0.1, 2.2, 0, 0));
  };
  const cartBoat = (x: number, y: number, z: number, ry: number, s: number) => {
    // model funerary boat: hull (squashed lathe), cabin, oars
    const f = new Frame(x, z, ry, y, s);
    b.add(mCedar, f.put(lathe([[0, 0], [0.12, 0.1], [0.2, 0.4], [0.22, 0.8], [0.2, 1.2], [0.12, 1.5], [0, 1.65]], 16), 0, 0.12, -0.82, Math.PI / 2, 0, 0, [1, 1, 0.45]));
    b.add(mChest2, f.put(boxGeo(0.24, 0.2, 0.4), 0, 0.3, -0.05));
    b.add(mGold, f.put(boxGeo(0.26, 0.03, 0.42), 0, 0.41, -0.05));
    for (const s2 of [-1, 1]) for (let i = 0; i < 3; i++) b.add(mCedar, f.raw(beam([s2 * 0.15, 0.22, -0.3 + i * 0.25], [s2 * 0.45, 0.05, -0.35 + i * 0.25], 0.012)));
  };
  const lionBed = (x: number, z: number, ry: number, len = 2.1) => {
    const f = new Frame(x, z, ry);
    b.add(mGold, f.put(boxGeo(0.8, 0.1, len), 0, 0.72, 0));
    b.add(mWeave, f.put(new THREE.BoxGeometry(0.66, 0.04, len - 0.2), 0, 0.78, 0));
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
      b.add(mGold, f.put(new THREE.CylinderGeometry(0.05, 0.035, 0.66, 10), lx * 0.33, 0.37, lz * (len / 2 - 0.1)));
      b.add(mGold, f.put(new THREE.SphereGeometry(0.06, 10, 8), lx * 0.33, 0.04, lz * (len / 2 - 0.1) + 0.03, 0, 0, 0, [1, 0.6, 1.4]));
    }
    b.add(mGold, f.put(new THREE.SphereGeometry(0.16, 14, 10), 0, 0.95, len / 2 + 0.05, 0, 0, 0, [1.2, 1, 1]));
    b.add(mGold, f.put(new THREE.CylinderGeometry(0.1, 0.14, 0.3, 12), 0, 0.82, len / 2 - 0.02));
    for (const s of [-1, 1]) b.add(mGold, f.put(new THREE.ConeGeometry(0.04, 0.09, 8), s * 0.09, 1.1, len / 2 + 0.03));
    b.add(mGold, f.put(new THREE.SphereGeometry(0.1, 12, 8), 0, 0.84, -len / 2 - 0.02, 0, 0, 0, [1, 0.8, 1.2]));
    f.col(k, -0.4, 0.4, -len / 2, len / 2 + 0.2, 0, 0.8, true);
    return f;
  };
  const mummy = (f: Frame, y: number, len = 1.75, gilded = false) => {
    const prof: [number, number][] = [[0, 0], [0.1, 0.02], [0.14, 0.15], [0.17, 0.5], [0.2, 0.9], [0.22, 1.15], [0.2, 1.35], [0.15, 1.45], [0.16, 1.55], [0.14, 1.68], [0.08, 1.74], [0, 1.76]];
    const sc = len / 1.76;
    b.add(gilded ? mGold : mLinen, f.put(lathe(prof, 20), 0, y, -len / 2, Math.PI / 2, 0, 0, [sc, sc, sc * 0.7]));
    if (gilded) {
      b.add(mNemes, f.put(new THREE.SphereGeometry(0.2, 16, 10), 0, y + 0.02, len / 2 - 0.22, 0, 0, 0, [1.25 * sc, 0.75, 1.2 * sc]));
      b.add(mGoldPale, f.put(new THREE.SphereGeometry(0.13, 14, 10), 0, y + 0.1, len / 2 - 0.2, 0, 0, 0, [0.9, 0.5, 1]));
      for (const s of [-1, 1]) b.add(mLapis, f.raw(beam([s * 0.17, y + 0.12, 0.4], [-s * 0.08, y + 0.15, 0.62], 0.035)));
      b.add(mCarn, f.put(boxGeo(0.32, 0.03, 0.12), 0, y + 0.15, 0.48));
      b.add(mLapis, f.put(boxGeo(0.06, 0.03, 0.5), 0, y + 0.14, 0.0));
    }
  };

  // hall props
  offeringTable(0, -6.6, 0);
  brazier(-1.6, -6.9);
  brazier(1.6, -6.9);
  potCluster(-12.1, -8.2, 6, 0.7);
  potCluster(12.2, 3.0, 5, 0.6);
  potCluster(11.8, -7.6, 5, 0.7, [mPot, mAlab]);
  basket(-12.3, 0, 3.3, 0.32, 0.4, "#c89a4a");
  basket(-11.7, 0, 3.4, 0.26, 0.34, null);
  chest(12.2, 0, -4.8, 1.0, 0.55, 0.62, Math.PI / 2, true, true);
  chest(-4.6, 0, 3.4, 0.9, 0.5, 0.55, 0.2, false, false, mChest2);
  b.add(mMat, place(new THREE.BoxGeometry(2.4, 0.02, 1.6), 5.2, 0.01, 3.0, 0, 0.15, 0), 1);
  for (const [x, z] of [[4.6, 2.7], [5.8, 3.3]] as const) pot(x, 0.02, z, 1.0, 2, mClay);
  // torches on the hall side walls (point lights near them)
  torch(-12.98, 2.9, 1.0, Math.PI / 2);
  torch(12.98, 2.9, 1.0, -Math.PI / 2);
  torch(-12.98, 2.9, -6.0, Math.PI / 2);
  torch(12.98, 2.9, -6.0, -Math.PI / 2);

  // ======================================================================
  // THRONE SANCTUARY
  // ======================================================================
  k.room("Throne Sanctuary", -9.5, 9.5, -21, -9.5);
  {
    // dais + 3 steps (0.4 m risers)
    boxAt(mLime, -4.6, 4.6, 0, 1.2, -20.5, -16.6, 2);
    boxAt(mLime, -4.0, 4.0, 0, 0.8, -16.6, -16.1, 2);
    boxAt(mLime, -3.4, 3.4, 0, 0.4, -16.1, -15.6, 2);
    b.add(mGold, place(new THREE.BoxGeometry(9.24, 0.06, 0.06), 0, 1.2, -16.58));
    b.add(mBand, place(new THREE.BoxGeometry(9.2, 0.6, 0.02), 0, 0.6, -16.61), 1.3);
    // runner carpet up the steps
    b.add(mBlue, place(new THREE.BoxGeometry(1.4, 0.02, 0.5), 0, 0.41, -15.85));
    b.add(mBlue, place(new THREE.BoxGeometry(1.4, 0.02, 0.5), 0, 0.81, -16.35));
    b.add(mBlue, place(new THREE.BoxGeometry(1.4, 0.02, 2.2), 0, 1.21, -17.7));
    // golden throne
    const f = new Frame(0, -18.9, 0, 1.2, 1.35);
    const P = (geo: G, lx: number, ly: number, lz: number, mm = mGold, rx = 0, ry = 0, rz = 0, sc?: V3t) => b.add(mm, f.put(geo, lx, ly, lz, rx, ry, rz, sc));
    P(boxGeo(0.78, 0.08, 0.66), 0, 0.5, 0);
    P(boxGeo(0.7, 0.1, 0.6), 0, 0.59, 0.02, mRed);
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
      P(new THREE.CylinderGeometry(0.045, 0.035, 0.46, 10), lx * 0.33, 0.25, lz * 0.27);
      P(new THREE.SphereGeometry(0.05, 10, 8), lx * 0.33, 0.03, lz * 0.27 + 0.03, mGold, 0, 0, 0, [1, 0.6, 1.5]);
    }
    for (const lx of [-1, 1]) P(new THREE.CylinderGeometry(0.018, 0.018, 0.6, 6), lx * 0.33, 0.18, 0, mGold, Math.PI / 2, 0, 0);
    P(boxGeo(0.8, 1.05, 0.07), 0, 1.02, -0.32);
    b.add(mDisk, f.put(new THREE.PlaneGeometry(0.72, 0.95), 0, 1.02, -0.284));
    P(boxGeo(0.86, 0.1, 0.1), 0, 1.58, -0.32);
    for (const lx of [-1, 1]) {
      P(boxGeo(0.07, 0.34, 0.6), lx * 0.38, 0.78, 0.0);
      b.add(mNemes, f.put(new THREE.PlaneGeometry(0.52, 0.26), lx * 0.418, 0.78, 0.0, 0, lx * Math.PI / 2, 0));
      P(new THREE.SphereGeometry(0.08, 14, 10), lx * 0.38, 0.97, 0.3, mGold, 0, 0, 0, [0.9, 1, 1.1]);
      P(new THREE.ConeGeometry(0.03, 0.06, 8), lx * 0.38 + lx * 0.04, 1.04, 0.28);
    }
    for (const lx of [-1, 1]) P(new THREE.SphereGeometry(0.07, 12, 8), lx * 0.43, 1.62, -0.32, mLapis);
    P(boxGeo(0.62, 0.14, 0.3), 0, 0.07, 0.55);
    P(new THREE.BoxGeometry(0.56, 0.02, 0.26), 0, 0.15, 0.55, mBlue);
    f.col(k, -0.45, 0.45, -0.38, 0.35, 0, 0.66, true);
    f.col(k, -0.45, 0.45, -0.38, -0.26, 0, 1.64, true);
    // colossi on plinths
    for (const s of [-1, 1]) {
      boxAt(mGranite, s * 6.9 - 1.3, s * 6.9 + 1.3, 0, 0.9, -20.3, -16.9, 2);
      b.add(mBand, place(new THREE.BoxGeometry(2.62, 0.5, 3.42), s * 6.9, 0.45, -18.6), 1.3);
      seated(s * 6.9, -18.7, 0.9, 1.75, 0, mGranite, mNemesStone, mGold);
    }
    // gilded shrine behind the throne, square pillars, offering goods
    boxAt(mRelief2, -2.2, 2.2, 1.2, 3.6, -20.5, -20.2, 3, false);
    for (const s of [-1, 1]) {
      boxAt(mRelief, s * 5.8 - 0.55, s * 5.8 + 0.55, 0, H.throne, -13.3, -12.2, 3.2);
      b.add(mCap, place(new THREE.BoxGeometry(1.3, 0.35, 1.3), s * 5.8, 6.3, -12.75), 1.5);
      brazier(s * 2.5, -15.0, 1.0);
      jackalShrine(s * 3.4, -19.4, 1.2, 1.0, 0);
      pot(s * 4.1, 1.2, -17.3, 1.1, 2, mAlab);
      pot(s * 3.7, 1.2, -17.0, 0.8, 0, mAlab, false);
      chest(s * 8.2, 0, -14.4, 0.9, 0.55, 0.6, s * 0.3, true, false, s < 0 ? mChest : mChest2);
      potCluster(s * 8.4, -11.2, 4, 0.5, [mAlab, mPot]);
      torch(s * 2.8, 3.4, -20.48, 0);
      cat(s * 1.4, -16.1, 0.8, 0.55, s * -0.25, mGold, mLapis);
    }
    k.collider(-2.2, 2.2, -20.5, -20.2, 1.2, 3.6, true);
    // gold piles on the dais
    for (const [x, z, r] of [[-2.2, -17.3, 0.45], [2.4, -17.6, 0.38]] as const) {
      b.add(mGold, place(new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), x, 1.2, z, 0, 0, 0, [1, 0.55, 1]));
      for (let i = 0; i < 16; i++) coins.push({ pos: [x + rr(-r, r), 1.22 + rr(0, r * 0.4), z + rr(-r, r)], rotX: rr(-0.5, 0.5), rotZ: rr(-0.5, 0.5) });
    }
  }

  // ======================================================================
  // BURIAL CHAMBER (NW)
  // ======================================================================
  k.room("Burial Chamber", -21, -9.5, -21, -9.5);
  {
    // sarcophagus on a plinth, lid slid askew
    boxAt(mLime, -17.4, -13.2, 0, 0.36, -17.2, -14.0, 2);
    boxAt(mGranite, -16.6, -14.0, 0.36, 1.4, -16.3, -14.9, 1.5);
    for (const [x1, x2, z1, z2] of [[-16.62, -13.98, -16.32, -16.28], [-16.62, -13.98, -14.92, -14.88]] as const) b.add(mBand, place(new THREE.BoxGeometry(x2 - x1, 0.4, z2 - z1), (x1 + x2) / 2, 1.1, (z1 + z2) / 2), 0.9);
    b.add(mGranite, place(boxGeo(2.8, 0.28, 1.6), -15.0, 1.58, -15.3, 0.03, 0.22, -0.06), 1.5);
    b.add(mGranite, place(new THREE.CylinderGeometry(0.8, 0.8, 2.8, 20, 1, false, 0, Math.PI), -15.0, 1.7, -15.3, 0.03, 0.22 + Math.PI / 2, Math.PI / 2 - 0.06, [1, 1, 0.25]), 1.5);
    k.collider(-16.6, -13.3, -16.4, -14.2, 0.36, 1.9, true);
    // gilded coffin on a lion bier
    const lf = lionBed(-11.5, -16.4, 0, 2.1);
    mummy(lf, 0.98, 1.85, true);
    // mummy on a second bier
    const lf2 = lionBed(-19.4, -12.4, Math.PI / 2, 2.0);
    mummy(lf2, 0.9, 1.7, false);
    // canopic chest + 4 jars
    chest(-19.6, 0, -18.0, 0.8, 0.5, 0.8, 0.0, false, false, mChest2);
    for (let i = 0; i < 4; i++) canopic(-19.6 + (i % 2 ? 0.18 : -0.18), 0.64, -18.0 + (i < 2 ? -0.18 : 0.18), i, i * 0.5);
    for (let i = 0; i < 4; i++) canopic(-18.4 + i * 0.36, 0, -20.1, i, 0.1);
    // stacked chests along the north wall
    const t1 = chest(-13.2, 0, -19.9, 1.3, 0.7, 0.8, 0.0, false, true);
    chest(-13.2, t1, -19.9, 1.0, 0.45, 0.6, 0.12, true, false, mChest2);
    chest(-11.4, 0, -19.8, 1.0, 0.6, 0.7, -0.08, true, false);
    jackalShrine(-19.8, -15.2, 0, 1.0, Math.PI / 2);
    cat(-11.0, -11.0, 0, 0.9, -2.4, mBasalt, mGold);
    cat(-19.8, -10.6, 0, 0.8, 2.4, mGold, mLapis);
    potCluster(-10.9, -13.4, 5, 0.5, [mAlab, mPot]);
    potCluster(-17.2, -20.0, 4, 0.4, [mPot, mClay]);
    // shabti shelf
    boxAt(mCedar, -16.0, -13.8, 1.2, 1.28, -20.48, -20.1, 1, true);
    for (let i = 0; i < 12; i++) b.add(mFaience, place(lathe([[0, 0], [0.04, 0], [0.045, 0.1], [0.04, 0.18], [0.03, 0.2], [0.035, 0.24], [0, 0.26]], 10), -15.85 + i * 0.18, 1.28, -20.3));
    torch(-20.48, 2.9, -14.0, Math.PI / 2);
    torch(-10.02, 2.9, -18.2, -Math.PI / 2);
    brazier(-12.2, -12.0, 0.9);
  }

  // ======================================================================
  // EMBALMING GALLERY (W)
  // ======================================================================
  k.room("Embalming Gallery", -21, -13.5, -9.5, 6.5);
  {
    const lf = lionBed(-17.2, -5.2, 0, 2.1);
    mummy(lf, 0.82, 1.7, false);
    // natron heaps + baskets, linen rolls
    for (const [x, z] of [[-19.8, -7.8], [-19.9, -6.6]] as const) b.add(mWhiteCloth, place(new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), x, 0, z, 0, 0, 0, [1, 0.6, 1]));
    k.collider(-20.4, -19.3, -8.3, -6.1, 0, 0.3, true);
    basket(-15.2, 0, -8.3, 0.35, 0.45, "#e8e0d0");
    basket(-14.6, 0, -7.6, 0.28, 0.38, null);
    for (let i = 0; i < 6; i++) b.add(mLinen, place(new THREE.CylinderGeometry(0.1, 0.1, 0.6, 12), -19.6 + i * 0.22, 0.1, -2.8 + (i % 2) * 0.05, Math.PI / 2, 0.1, 0));
    // shelf racks with jars along the west wall
    for (const z of [0.2, 3.2]) {
      const f = new Frame(-20.1, z, Math.PI / 2);
      for (const lx of [-1.2, 1.2]) b.add(mCedar, f.put(boxGeo(0.08, 2.1, 0.5), lx, 1.05, 0));
      for (const y of [0.1, 0.8, 1.5, 2.1]) b.add(mCedar, f.put(boxGeo(2.5, 0.05, 0.52), 0, y, 0));
      for (let i = 0; i < 9; i++) { const [px, pz] = f.pt(-1.0 + (i % 5) * 0.5, 0); pot(px, [0.12, 0.82, 1.52][i % 3], pz, rr(0.55, 0.75), Math.floor(rnd() * 4), i % 2 ? mAlab : mPot, false); }
      f.col(k, -1.25, 1.25, -0.28, 0.28, 0, 2.15, true);
    }
    // work table with tools
    const tf = new Frame(-15.4, 1.6, 0.1);
    b.add(mCedar, tf.put(boxGeo(1.8, 0.08, 0.8), 0, 0.8, 0));
    for (const [lx, lz] of [[-0.8, -0.32], [0.8, -0.32], [-0.8, 0.32], [0.8, 0.32]] as const) b.add(mCedar, tf.put(new THREE.CylinderGeometry(0.04, 0.035, 0.76, 8), lx, 0.38, lz));
    for (let i = 0; i < 4; i++) canopic(...[tf.pt(-0.6 + i * 0.4, 0.1)].map(([px, pz]) => [px, 0.84, pz] as const)[0], i, 0.2);
    b.add(mBronze, tf.put(boxGeo(0.4, 0.02, 0.06), 0.3, 0.85, -0.25));
    tf.col(k, -0.9, 0.9, -0.4, 0.4, 0, 0.84, true);
    potCluster(-14.8, 4.8, 6, 0.8);
    chest(-19.6, 0, 5.2, 1.1, 0.6, 0.7, 0.1, false, true);
  }

  // ======================================================================
  // SCRIBES' GALLERY (E)
  // ======================================================================
  k.room("Scribes' Gallery", 13.5, 21, -9.5, 6.5);
  {
    // papyrus scroll pigeonholes along the east wall
    const scrolls: Inst[] = [];
    for (const z of [-6.5, -2.2, 2.4]) {
      const f = new Frame(20.15, z, -Math.PI / 2);
      b.add(mCedar, f.put(boxGeo(2.6, 2.3, 0.08), 0, 1.15, 0.24));
      for (const lx of [-1.3, -0.43, 0.43, 1.3]) b.add(mCedar, f.put(boxGeo(0.06, 2.3, 0.5), lx, 1.15, 0));
      for (const y of [0.05, 0.6, 1.15, 1.7, 2.25]) b.add(mCedar, f.put(boxGeo(2.66, 0.05, 0.52), 0, y, 0));
      for (let c = 0; c < 3; c++) for (let r2 = 0; r2 < 4; r2++) for (let i = 0; i < 6; i++) {
        const [px, pz] = f.pt(-1.1 + c * 0.86 + (i % 3) * 0.2 + rr(-0.03, 0.03), 0.02);
        scrolls.push({ pos: [px, 0.14 + r2 * 0.55 + Math.floor(i / 3) * 0.09, pz], rotX: Math.PI / 2, rotZ: rr(-0.1, 0.1), rotY: -Math.PI / 2, scale: [1, rr(0.8, 1.1), 1], color: ["#e8dcb5", "#d9c998", "#efe4c4"][i % 3] });
      }
      f.col(k, -1.33, 1.33, -0.28, 0.28, 0, 2.3, true);
    }
    k.instances(new THREE.CylinderGeometry(0.04, 0.04, 0.46, 10), mFood, scrolls);
    // low writing tables, stools, reed mats, a scribe statue
    for (const [x, z, ry] of [[16.6, -6.2, 0.1], [16.2, -0.2, -0.15], [17.0, 3.6, 0.2]] as const) {
      const f = new Frame(x, z, ry);
      b.add(mMat, f.put(new THREE.BoxGeometry(2.2, 0.02, 1.6), 0, 0.01, 0));
      b.add(mCedar, f.put(boxGeo(1.2, 0.06, 0.6), 0, 0.42, 0));
      for (const [lx, lz] of [[-0.5, -0.22], [0.5, -0.22], [-0.5, 0.22], [0.5, 0.22]] as const) b.add(mCedar, f.put(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8), lx, 0.2, lz));
      b.add(mFood, f.put(new THREE.PlaneGeometry(0.5, 0.34), 0.1, 0.455, 0, -Math.PI / 2, 0, 0.1));
      b.add(mEbony, f.put(boxGeo(0.3, 0.04, 0.07), -0.4, 0.47, 0.1));
      pot(...f.pt(0.45, -0.15), 0.45, 0.35, 3, mClay, false) ;
      f.col(k, -0.6, 0.6, -0.3, 0.3, 0, 0.46, true);
      const [sx, sz] = f.pt(0, 0.7);
      b.add(mCedar, place(boxGeo(0.45, 0.3, 0.4), sx, 0.15, sz), 1);
    }
    // seated scribe statue (cross-legged, painted limestone) on a plinth
    boxAt(mBlock, 14.3, 15.3, 0, 0.6, 5.1, 6.0, 2);
    {
      const f = new Frame(14.8, 5.5, Math.PI * 0.8, 0.6, 1);
      b.add(mLime, f.put(new THREE.SphereGeometry(1, 16, 10), 0, 0.1, 0, 0, 0, 0, [0.34, 0.14, 0.28]));
      b.add(mWhiteCloth, f.put(new THREE.PlaneGeometry(0.3, 0.2), 0, 0.26, 0.12, -1.2, 0, 0));
      b.add(mRed, f.put(new THREE.CylinderGeometry(0.15, 0.11, 0.38, 14), 0, 0.42, -0.02, 0, 0, 0, [1, 1, 0.7]));
      b.add(mLime, f.put(new THREE.SphereGeometry(0.09, 14, 10), 0, 0.72, 0));
      b.add(mEbony, f.put(new THREE.SphereGeometry(0.1, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), 0, 0.73, -0.01));
    }
    basket(19.6, 0, 5.4, 0.35, 0.45, "#6b8e3a");
    potCluster(14.6, -8.3, 5, 0.6);
    chest(19.8, 0, -8.4, 1.0, 0.55, 0.62, 0, true, true, mChest2);
  }

  // ======================================================================
  // TREASURY (NE)
  // ======================================================================
  k.room("Treasury", 9.5, 21, -21, -9.5);
  {
    // stacks of chests
    const stacks: [number, number, number][] = [[12.0, -20.0, 0.1], [14.0, -20.0, -0.05], [19.8, -18.2, Math.PI / 2], [19.8, -12.2, Math.PI / 2]];
    stacks.forEach(([x, z, ry], i) => {
      let y = chest(x, 0, z, 1.3, 0.65, 0.8, ry, false, i % 2 === 0, i % 2 ? mChest2 : mChest);
      y = chest(x, y, z, 1.1, 0.5, 0.7, ry + rr(-0.15, 0.15), i % 2 === 1, false, i % 2 ? mChest : mChest2);
      if (i < 2) chest(x, y, z, 0.7, 0.35, 0.5, ry + rr(-0.3, 0.3), true);
    });
    // gold heaps with coins, golden cats, vases, model boat, chariot wheel, shields
    for (const [x, z, r] of [[16.4, -19.4, 0.9], [18.6, -15.2, 0.7], [13.2, -13.4, 0.6]] as const) {
      b.add(mGold, place(new THREE.SphereGeometry(r, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), x, 0, z, 0, 0, 0, [1, 0.55, 1]));
      k.collider(x - r * 0.8, x + r * 0.8, z - r * 0.8, z + r * 0.8, 0, r * 0.5, true);
      for (let i = 0; i < 40; i++) { const a = rnd() * 6.28, d = rr(0, r * 1.3); const hh = Math.max(0, r * 0.55 * (1 - (d / r) ** 2)); coins.push({ pos: [x + Math.cos(a) * d, hh + 0.01, z + Math.sin(a) * d], rotX: rr(-0.6, 0.6), rotZ: rr(-0.6, 0.6) }); }
    }
    boxAt(mBlock, 11.2, 12.4, 0, 0.8, -16.5, -15.3, 2);
    cat(11.8, -15.9, 0.8, 1.1, Math.PI / 2, mGold, mLapis);
    boxAt(mBlock, 11.2, 12.4, 0, 0.8, -12.3, -11.1, 2);
    cat(11.8, -11.7, 0.8, 1.1, Math.PI / 2, mGold, mLapis);
    // vases on a low bench
    boxAt(mCedar, 14.6, 18.0, 0, 0.45, -10.9, -10.4, 1);
    for (let i = 0; i < 6; i++) pot(14.9 + i * 0.55, 0.45, -10.65, rr(0.6, 0.9), i % 4, i % 2 ? mAlab : mGoldPale, false);
    cartBoat(16.2, 0.45, -16.8, 0.4, 1.1);
    boxAt(mCedar, 15.3, 17.1, 0, 0.45, -17.6, -16.0, 1, true);
    // chariot wheel leaning on the wall
    {
      const f = new Frame(20.3, -14.6, -Math.PI / 2);
      b.add(mCedar, f.put(new THREE.TorusGeometry(0.5, 0.04, 8, 28), 0, 0.52, 0, -0.12, 0, 0));
      for (let i = 0; i < 6; i++) b.add(mCedar, f.put(new THREE.CylinderGeometry(0.018, 0.018, 1.0, 6), 0, 0.52, 0.0, -0.12, 0, (i / 6) * Math.PI));
      b.add(mGold, f.put(new THREE.CylinderGeometry(0.08, 0.08, 0.14, 12), 0, 0.52, 0, Math.PI / 2 - 0.12, 0, 0));
    }
    // shields + spears on the south wall
    for (let i = 0; i < 3; i++) {
      const x = 12.2 + i * 1.3;
      b.add(i % 2 ? mChest : mChest2, place(new THREE.CylinderGeometry(0.4, 0.4, 0.06, 20, 1, false, 0, Math.PI), x, 2.0, -10.05, Math.PI / 2, 0, 0, [1, 1, 1.6]));
      b.add(mCedar, beam([x + 0.55, 0.05, -10.1], [x + 0.62, 2.8, -10.1], 0.02));
      b.add(mBronze, place(new THREE.ConeGeometry(0.05, 0.25, 8), x + 0.625, 2.9, -10.1));
    }
    potCluster(13.5, -18.2, 5, 0.6, [mGoldPale, mAlab]);
    brazier(15.2, -13.4, 0.9);
    torch(10.02, 2.9, -18.5, Math.PI / 2);
    torch(20.48, 2.9, -10.9, -Math.PI / 2);
  }

  // ======================================================================
  // FORECOURT
  // ======================================================================
  k.room("Forecourt", -21, 21, 7, 21);
  {
    // avenue of seated cats on plinths
    for (const z of [10.2, 13.6, 17.0]) for (const s of [-1, 1]) {
      boxAt(mBlock, s * 4.3 - 0.6, s * 4.3 + 0.6, 0, 1.0, z - 0.8, z + 0.8, 2);
      cornice("z", s * 4.3, z - 0.8, z + 0.8, 1.0, 1.0);
      cat(s * 4.3, z, 1.12, 1.7, -s * Math.PI / 2, mBasalt, mGold);
      k.collider(s * 4.3 - 0.35, s * 4.3 + 0.35, z - 0.5, z + 0.5, 1.12, 2.9, true);
    }
    // obelisks: west standing, east broken with pieces in the sand
    const obelisk = (x: number, z: number, h: number, broken: boolean) => {
      boxAt(mGranite, x - 1.0, x + 1.0, 0, 1.0, z - 1.0, z + 1.0, 2);
      if (!broken) {
        b.add(mObelisk, place(taper(1.1, h, 1.1, 0.62, 0.62), x, 1.0 + h / 2, z), 1.6);
        b.add(mGold, place(new THREE.ConeGeometry(0.48, 0.8, 4), x, 1.0 + h + 0.4, z, 0, Math.PI / 4, 0));
        k.collider(x - 0.55, x + 0.55, z - 0.55, z + 0.55, 1.0, 1.0 + h, true);
      } else {
        b.add(mObelisk, place(taper(1.1, 2.8, 1.1, 0.93, 0.93), x, 2.4, z), 1.6);
        k.collider(x - 0.55, x + 0.55, z - 0.55, z + 0.55, 1.0, 3.8, true);
        b.add(mObelisk, place(taper(1.0, 3.6, 1.0, 0.8, 0.8), x + 3.4, 0.45, z + 2.6, Math.PI / 2 - 0.05, 0.9, 0), 1.6);
        k.collider(x + 1.9, x + 4.9, z + 1.4, z + 3.8, 0, 0.95, true);
        b.add(mObelisk, place(taper(0.8, 2.6, 0.8, 0.7, 0.7), x + 6.1, 0.38, z + 5.2, Math.PI / 2 + 0.1, 0.6, 0.1), 1.6);
        b.add(mGold, place(new THREE.ConeGeometry(0.34, 0.6, 4), x + 7.3, 0.35, z + 6.1, 1.2, 0.4, 0.8));
        k.collider(x + 5.2, x + 7.2, z + 4.3, z + 6.3, 0, 0.8, true);
      }
    };
    obelisk(-6.4, 9.0, 10, false);
    obelisk(6.4, 9.0, 10, true);
    // broken columns (a ruined colonnade) in the east court
    const cols: [number, number, number][] = [[10.6, 11.2, 1.3], [13.8, 11.2, 3.9], [10.6, 15.0, 0.6], [13.8, 15.0, 2.5], [10.6, 18.6, 2.9]];
    for (const [x, z, h] of cols) {
      b.add(mBlockShade, place(lathe([[0, 0], [0.8, 0], [0.82, 0.22], [0.74, 0.3], [0, 0.3]], 28), x, 0, z));
      const pts: [number, number][] = [[0.6, 0], [0.62, 0.3], [0.6, h * 0.6], [0.58, h]];
      b.add(mCol, place(lathe([...pts, [0.4, h + 0.14], [0.1, h + 0.06], [0, h + 0.1]], 28), x, 0.3, z, 0, rnd() * 6, 0, [1, 1, 1]));
      k.collider(x - 0.62, x + 0.62, z - 0.62, z + 0.62, 0, h + 0.4, true);
    }
    drum(12.3, 13.0, 0.4, 1.0, 0.6);
    drum(15.6, 17.4, 1.3, 1.0, 0.6);
    drum(12.6, 19.8, -0.3, 0.8, 0.6);
    b.add(mCap, place(lathe([[0.55, 0], [0.7, 0.2], [0.95, 0.5], [1.1, 0.8], [1.15, 0.9], [0, 0.92]], 28), 15.4, 1.05, 12.6, 1.7, 0.6, 0.1));
    k.collider(14.5, 16.3, 11.7, 13.5, 0, 1.2, true);
    addRubble(12.5, 16.2, 3.4, 45, 0.55);
    addRubble(-10.6, 19.4, 1.6, 18, 0.5);
    addRubble(3.4, 17.8, 1.4, 10, 0.4);
    // sand drifts against the walls and around ruins
    drift(-8.5, 19.5, 5.0, 1.8, 0.6, 0.1);
    drift(9.0, 20.0, 5.5, 1.6, 0.55, -0.1);
    drift(-12.8, 8.2, 1.6, 1.0, 0.4);
    drift(12.6, 8.0, 2.4, 1.0, 0.45);
    drift(17.0, 15.2, 1.4, 3.4, 0.35);
    drift(-6.0, 14.0, 2.0, 3.0, 0.14);
    drift(7.2, 16.8, 2.4, 2.0, 0.15, 0.5);
    // palms
    const palm = (x: number, z: number, h: number, lean: number, ry: number) => {
      const f = new Frame(x, z, ry);
      b.add(mBark, f.put(lathe([[0.26, 0], [0.22, 0.4], [0.19, h * 0.5], [0.17, h], [0.12, h + 0.2], [0, h + 0.25]], 14), 0, 0, 0, 0, 0, lean));
      const top = new V3(-Math.sin(lean) * h, Math.cos(lean) * h, 0);
      for (let i = 0; i < 11; i++) {
        const a = (i / 11) * Math.PI * 2 + rr(-0.2, 0.2);
        const fl = new THREE.PlaneGeometry(3.2, 0.9, 10, 1);
        const p = fl.attributes.position;
        for (let j = 0; j < p.count; j++) { const t = (p.getX(j) + 1.6) / 3.2; p.setZ(j, -t * t * 1.3 + t * 0.5); }
        fl.translate(1.6, 0, 0);
        fl.rotateX(Math.PI / 2 + rr(-0.3, 0.3));
        fl.rotateZ(rr(-0.1, 0.25));
        fl.rotateY(a);
        b.add(mFrond, f.raw(fl.translate(top.x, top.y + 0.1, top.z)));
      }
      b.add(mBark, f.put(new THREE.SphereGeometry(0.22, 10, 8), top.x, top.y + 0.05, top.z));
      k.collider(x - 0.3, x + 0.3, z - 0.3, z + 0.3, 0, 2.5, false);
    };
    palm(-12.6, 16.8, 6.8, 0.12, 0.3);
    palm(-10.8, 12.4, 5.6, -0.1, 2.2);
    palm(8.6, 20.0, 6.2, 0.14, 4.0);
    // pottery, baskets, a toppled offering table, a fallen seated statue
    potCluster(-8.8, 10.2, 5, 0.8);
    potCluster(16.2, 9.0, 4, 0.6);
    basket(-2.6, 0, 19.8, 0.34, 0.42, "#b33a2a");
    basket(-1.9, 0, 20.1, 0.28, 0.36, null);
    offeringTable(-9.0, 8.4, 0.3);
    {
      boxAt(mBlock, 15.6, 17.6, 0, 0.6, 18.2, 20.2, 2);
      seated(16.6, 19.2, 0.6, 1.1, Math.PI * 1.1, mLime, mNemesStone, mBlockShade);
    }
    // --- west portico: raised terrace with columns, reached by 3 steps (0.4 m) ---
    boxAt(mBlock, -20.5, -15.2, 0, 1.2, 9.5, 20.4, 2.5);
    boxAt(mPave, -20.5, -15.2, 1.2, 1.24, 9.5, 20.4, 3, false);
    boxAt(mBlock, -15.2, -14.7, 0, 0.8, 11.0, 18.8, 2.5);
    boxAt(mBlock, -14.7, -14.2, 0, 0.4, 11.0, 18.8, 2.5);
    for (const z of [10.1, 12.6, 15.0, 17.4, 19.8]) {
      const x = -15.8;
      b.add(mBlockShade, place(lathe([[0, 0], [0.56, 0], [0.58, 0.2], [0.5, 0.26], [0, 0.26]], 24), x, 1.24, z));
      b.add(mCol, place(lathe([[0.45, 0], [0.47, 0.3], [0.44, 2.0], [0.4, 3.1]], 24), x, 1.5, z));
      b.add(mCap, place(lathe([[0.4, 0], [0.55, 0.2], [0.72, 0.45], [0.78, 0.6], [0, 0.62]], 24), x, 4.6, z));
      b.add(mBlock, place(boxGeo(1.0, 0.2, 1.0), x, 5.3, z), 2);
      k.collider(x - 0.5, x + 0.5, z - 0.5, z + 0.5, 1.2, 5.2, true);
    }
    boxAt(mBand, -16.4, -15.2, 5.4, 6.0, 9.4, 20.4, 2.4, false);
    boxAt(mBlockShade, -20.5, -16.4, 5.4, 5.8, 9.4, 20.4, 3);
    k.collider(-16.4, -15.2, 9.4, 20.4, 5.4, 6.0, true);
    b.add(mStars, place(new THREE.BoxGeometry(5.3, 0.02, 11.0), -18.0, 5.39, 14.9), 2.5);
    cornice("z", -15.8, 9.4, 20.4, 6.0, 1.2);
    // portico furnishings: reed mats, cushions, low bench, jars, a small shrine with a cat
    b.add(mMat, place(new THREE.BoxGeometry(2.6, 0.02, 1.8), -18.4, 1.25, 12.2, 0, 0.1, 0), 1);
    b.add(mRed, place(boxGeo(0.7, 0.14, 0.5), -18.9, 1.25, 12.0, 0, 0.2, 0));
    b.add(mBlue, place(boxGeo(0.7, 0.14, 0.5), -17.9, 1.25, 12.5, 0, -0.3, 0));
    boxAt(mCedar, -20.4, -19.5, 1.24, 1.7, 14.0, 17.0, 1);
    for (let i = 0; i < 5; i++) pot(-19.9, 1.7, 14.3 + i * 0.6, rr(0.6, 0.85), i % 4, i % 2 ? mAlab : mPot, false);
    chest(-18.0, 1.24, 18.8, 1.1, 0.6, 0.7, 0.2, true, true);
    boxAt(mGranite, -18.6, -17.6, 1.24, 1.9, 16.0, 17.0, 1.5);
    cat(-18.1, 16.5, 1.9, 0.9, Math.PI / 2, mGold, mLapis);
    brazier(-17.0, 10.3, 0.8);
    k.room("Portico", -21, -14.2, 9.4, 21);
    // --- east stair to the roofs: 15 steps x 0.36 m, landing on stone piers ---
    const N = 15, rise = 0.36, tread = 0.55, zBot = 19.9;
    for (let i = 1; i <= N; i++) {
      const z2 = zBot - (i - 1) * tread, z1 = z2 - tread;
      boxAt(mBlock, 18.3, 20.5, 0, i * rise, z1, z2, 2);
      b.add(mBlockShade, place(new THREE.BoxGeometry(2.24, 0.06, 0.08), 19.4, i * rise - 0.03, z2 - 0.02));
    }
    const zTop = zBot - N * tread; // 11.65
    boxAt(mBlockShade, 18.3, 20.5, N * rise - 0.5, N * rise, 7.0, zTop, 3);
    boxAt(mBlock, 18.4, 19.2, 0, N * rise - 0.5, 8.8, 9.6, 2);
    // parapet on the open side of the stair
    for (let i = 1; i <= N; i += 2) boxAt(mBlockShade, 18.15, 18.35, i * rise, i * rise + 0.5, zBot - i * tread, zBot - i * tread + tread * 2, 1, false);
    k.room("Roof", -22, 22, -22, 7);
    // roof-top stair from the east wing roof (5.4) to the hall roof (8.5)
    for (let i = 1; i <= 8; i++) {
      const z2 = -0.6 - (i - 1) * 0.45;
      boxAt(mBlock, 14.0, 15.5, H.side + 0.4, H.side + 0.4 + i * 0.3875, z2 - 0.45, z2, 2);
    }
  }

  // ---------------- flush ----------------
  if (rubble.length) k.instances(new THREE.BoxGeometry(1, 1, 1), mBlockShade, rubble);
  if (food.length) k.instances(new THREE.SphereGeometry(1, 10, 8), mFood, food);
  if (coins.length) k.instances(new THREE.CylinderGeometry(0.035, 0.035, 0.008, 10), mGold, coins, { noShadow: true });
  b.flush(k);
  if (rays.length) {
    const g2 = rays.length > 1 ? (() => { const cl = rays.map((g) => (g.index ? g.toNonIndexed() : g)); return mergeAll(cl); })() : rays[0];
    const mesh = new THREE.Mesh(g2, rayMat);
    mesh.renderOrder = 10;
    k.group.add(mesh);
  }

  // ---------------- spawns ----------------
  const hiders: THREE.Vector3[] = [];
  for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) hiders.push(new V3(-2.75 + i * 1.1, 0, 9.4 + j * 1.35));
  return k.finish({
    id: "egypt", name: "Egypt",
    bounds: { minX: -20.45, maxX: 20.45, minZ: -20.45, maxZ: 20.45 },
    hunterSpawns: grid(0, 17.6, 9, 1.15),
    hiderSpawns: hiders,
    preview: { pos: [11.5, 5.2, 19.6], look: [-1.5, 4.2, 5.5], fov: 62 },
    lighting: {
      sky: "#e7b98a",
      hemi: ["#ffe0b5", "#6a4f33", 0.45],
      sun: { color: "#ffc98c", int: 3.0, pos: SUN },
      fog: ["#d9b489", 40, 230],
      points: [
        { pos: [-12.2, 3.5, 1.0], color: "#ff9b45", int: 16, dist: 13 },
        { pos: [12.2, 3.5, -2.5], color: "#ff9b45", int: 16, dist: 13 },
        { pos: [0, 3.6, -18.4], color: "#ffa855", int: 22, dist: 14 },
        { pos: [-15.2, 3.2, -14.2], color: "#ff9b45", int: 16, dist: 12 },
        { pos: [15.4, 3.2, -14.8], color: "#ffb060", int: 16, dist: 12 },
        { pos: [-17.4, 3.0, -1.0], color: "#ffb870", int: 8, dist: 10 },
      ],
      exposure: 1.0,
      env: 0.4,
      hdri: "sunset",
      hdriBackground: 0.04,
      envRotation: 0,
    },
  });
}

function mergeAll(geos: G[]) {
  let count = 0;
  for (const g of geos) count += g.attributes.position.count;
  const pos = new Float32Array(count * 3), uv = new Float32Array(count * 2);
  let o = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array as Float32Array, o * 3);
    uv.set(g.attributes.uv.array as Float32Array, o * 2);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return out;
}
