// Swimming Pool — an indoor municipal pool hall ("City Aquatic Centre").
// Centre: a 25 m × 10 m five-lane pool (sunken, animated reflective water, floating lane ropes, starting blocks,
// chrome ladders, backstroke flags, floating toys). The whole hall deck sits on a raised tiled slab (D = 0.44 m) so the
// pool basin can be entered on foot and players wade chest-deep in the water.
// North: red-seat spectator bleachers under a big "SPLASH!" graffiti mural; loungers along the deck.
// East: tall daylight windows, a kids' splash pool with a mushroom fountain and a little slide, potted palms.
// West: starting end with the lane-rope reel, a staircase up to the mezzanine on the changing-block roof, scoreboard.
// South: the changing block — Men's and Women's changing rooms (lockers, benches, sinks, mirrors), open showers,
// equipment storage, lifeguard office / first aid and the entrance lobby (reception, vending machines) where hunters
// arrive.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import * as T from "../textures";
import { Kit, boxGeo, type World, type Mat } from "./kit";
import * as PT from "./tex/pool";
import { realPaintingTex, pickPainting, PAINTINGS } from "../paintings";

type V3 = [number, number, number];
type Inst = { pos: V3; rotX?: number; rotY?: number; rotZ?: number; scale?: V3; color?: string };

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
/** planar world-space UVs by dominant normal axis (textures keep real-world scale) */
function worldUV(g: THREE.BufferGeometry, unit: number) {
  const p = g.attributes.position, n = g.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u: number, v: number;
    if (ay >= ax && ay >= az) { u = p.getX(i); v = p.getZ(i); }
    else if (ax >= az) { u = p.getZ(i); v = p.getY(i); }
    else { u = p.getX(i); v = p.getY(i); }
    uv[i * 2] = u / unit;
    uv[i * 2 + 1] = v / unit;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}
const _e = new THREE.Euler();
const _m = new THREE.Matrix4();
function xf(g: THREE.BufferGeometry, x: number, y: number, z: number, ry = 0, rx = 0, rz = 0) {
  if (rx || ry || rz) { _m.makeRotationFromEuler(_e.set(rx, ry, rz, "YXZ")); g.applyMatrix4(_m); }
  g.translate(x, y, z);
  return g;
}
function mg(geos: THREE.BufferGeometry[]) {
  const clean = geos.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(n.attributes)) if (!["position", "normal", "uv"].includes(k)) n.deleteAttribute(k);
    return n;
  });
  return mergeGeometries(clean, false)!;
}
const V2 = (pts: [number, number][]) => pts.map(([a, b]) => new THREE.Vector2(a, b));

export function buildPool(): World {
  const k = new Kit(8, 2.3);
  const PI = Math.PI;
  const D = 0.44; // deck height above the pool floor level (players wade in the pool at y = 0)
  const HH = 8; // hall ceiling
  const BH = 3.2; // changing block storey height (above the deck)
  const WY = 0.3; // pool water surface
  let Y0 = D; // current base height for the helpers below (deck level by default)

  // ---------------- batching helpers ----------------
  const batches = new Map<Mat, THREE.BufferGeometry[]>();
  const units = new Map<Mat, number>();
  const put = (m: Mat, g: THREE.BufferGeometry, unit?: number) => {
    const u = unit ?? units.get(m) ?? 0;
    if (u > 0) worldUV(g, u);
    let l = batches.get(m);
    if (!l) batches.set(m, (l = []));
    l.push(g);
  };
  const U = (m: Mat, u: number) => { units.set(m, u); return m; };
  const col = (x1: number, x2: number, z1: number, z2: number, b: number, t: number, stand = true) =>
    k.collider(Math.min(x1, x2), Math.max(x1, x2), Math.min(z1, z2), Math.max(z1, z2), b + Y0, t + Y0, stand);
  type BO = { unit?: number; ry?: number; rx?: number; rz?: number; round?: boolean; solid?: boolean; stand?: boolean };
  const bx = (m: Mat, w: number, h: number, d: number, x: number, y: number, z: number, o: BO = {}) => {
    const g = o.round ? boxGeo(w, h, d) : new THREE.BoxGeometry(w, h, d);
    xf(g, x, Y0 + y + h / 2, z, o.ry, o.rx, o.rz);
    put(m, g, o.unit);
    if (o.solid) col(x - w / 2, x + w / 2, z - d / 2, z + d / 2, y, y + h, o.stand ?? true);
  };
  const cy = (m: Mat, rt: number, rb: number, h: number, x: number, y: number, z: number, seg = 16, o: { rx?: number; rz?: number; ry?: number; open?: boolean } = {}) =>
    put(m, xf(new THREE.CylinderGeometry(rt, rb, h, seg, 1, !!o.open), x, Y0 + (o.rx || o.rz ? y : y + h / 2), z, o.ry, o.rx, o.rz));
  const sph = (m: Mat, r: number, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, seg = 16) => {
    const g = new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.7)));
    g.scale(sx, sy, sz);
    put(m, xf(g, x, Y0 + y, z));
  };
  const lat = (m: Mat, pts: [number, number][], x: number, y: number, z: number, seg = 24) => put(m, xf(new THREE.LatheGeometry(V2(pts), seg), x, Y0 + y, z));
  const tb = (m: Mat, pts: V3[], r: number, seg = 0, rs = 8) => {
    const c = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1] + Y0, p[2])), false, "centripetal");
    put(m, new THREE.TubeGeometry(c, seg || Math.max(6, pts.length * 6), r, rs, false));
  };
  /** straight tube segment list (polyline with sharp-ish bends) */
  const rail = (m: Mat, pts: V3[], r: number) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = new THREE.Vector3(...pts[i]), b = new THREE.Vector3(...pts[i + 1]);
      const len = a.distanceTo(b);
      const g = new THREE.CylinderGeometry(r, r, len, 8);
      g.translate(0, len / 2, 0);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      g.applyQuaternion(q);
      g.translate(a.x, a.y + Y0, a.z);
      put(m, g, 0);
      if (i > 0) put(m, xf(new THREE.SphereGeometry(r * 1.05, 8, 6), a.x, a.y + Y0, a.z), 0);
    }
  };
  const pl = (m: Mat, w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0) => put(m, xf(new THREE.PlaneGeometry(w, h), x, Y0 + y, z, ry, rx), 0);

  const instLists = new Map<string, { geo: THREE.BufferGeometry; m: Mat; list: Inst[]; noShadow?: boolean }>();
  const inst = (key: string, geo: () => THREE.BufferGeometry, m: Mat, it: Inst, noShadow = false) => {
    let e = instLists.get(key);
    if (!e) instLists.set(key, (e = { geo: geo(), m, list: [], noShadow }));
    e.list.push({ ...it, pos: [it.pos[0], it.pos[1] + Y0, it.pos[2]] });
  };

  /** local frame: origin + yaw; local +z = prop front */
  function F(cx: number, cz: number, ry = 0) {
    const c = Math.cos(ry), s = Math.sin(ry);
    const wx = (lx: number, lz: number) => cx + lx * c + lz * s;
    const wz = (lx: number, lz: number) => cz - lx * s + lz * c;
    const fcol = (x1: number, x2: number, z1: number, z2: number, b: number, t: number, stand = true) => {
      const xs = [wx(x1, z1), wx(x2, z1), wx(x1, z2), wx(x2, z2)], zs = [wz(x1, z1), wz(x2, z1), wz(x1, z2), wz(x2, z2)];
      col(Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs), b, t, stand);
    };
    return {
      wx, wz,
      bx: (m: Mat, w: number, h: number, d: number, lx: number, y: number, lz: number, o: BO = {}) => {
        bx(m, w, h, d, wx(lx, lz), y, wz(lx, lz), { ...o, ry: ry + (o.ry ?? 0), solid: false });
        if (o.solid) fcol(lx - w / 2, lx + w / 2, lz - d / 2, lz + d / 2, y, y + h, o.stand ?? true);
      },
      cy: (m: Mat, rt: number, rb: number, h: number, lx: number, y: number, lz: number, seg = 16, o: { rx?: number; rz?: number } = {}) => cy(m, rt, rb, h, wx(lx, lz), y, wz(lx, lz), seg, { ...o, ry }),
      lat: (m: Mat, pts: [number, number][], lx: number, y: number, lz: number, seg = 20) => lat(m, pts, wx(lx, lz), y, wz(lx, lz), seg),
      pl: (m: Mat, w: number, h: number, lx: number, y: number, lz: number, rr = 0, rx = 0) => pl(m, w, h, wx(lx, lz), y, wz(lx, lz), ry + rr, rx),
      rail: (m: Mat, pts: V3[], r: number) => rail(m, pts.map(([a, b, cc]) => [wx(a, cc), b, wz(a, cc)] as V3), r),
      tb: (m: Mat, pts: V3[], r: number, seg = 0) => tb(m, pts.map(([a, b, cc]) => [wx(a, cc), b, wz(a, cc)] as V3), r, seg),
      col: fcol,
      geo: (m: Mat, g: THREE.BufferGeometry, lx: number, y: number, lz: number, rr = 0, rx = 0, rz = 0) => put(m, xf(g, wx(lx, lz), Y0 + y, wz(lx, lz), ry + rr, rx, rz)),
    };
  }

  // ---------------- materials ----------------
  const tx = <A extends unknown[]>(key: string, f: (...a: A) => ReturnType<typeof PT.poDeck>, ...a: A) => k.tex(key, () => f(...a));
  const deckM = U(k.mat(tx("poDeck", PT.poDeck, 7), "#ffffff", [1, 1], { roughness: 0.32, bump: 0.45 }), 1.0);
  const roomFloorM = U(k.mat(tx("poRoomFloor", PT.poMosaic, "#a9b0b2", "#8e979b", 16, 13, 0.14), "#ffffff", [1, 1], { roughness: 0.3, bump: 0.5 }), 0.9);
  const edgeBlueM = U(k.mat(tx("poEdge", PT.poMosaic, "#20399a", "#2d4fb8", 8, 17, 0.08), "#ffffff", [1, 1], { roughness: 0.22, bump: 0.5 }), 1.0);
  const basinM = U(k.mat(tx("poBasin", PT.poMosaic, "#48b8da", "#7ad3ea", 32, 3, 0.12), "#ffffff", [1, 1], { roughness: 0.18, bump: 0.4 }), 0.8);
  const laneM = U(k.mat(tx("poLane", PT.poMosaic, "#1a2d8a", "#2a45a8", 32, 5, 0.05), "#ffffff", [1, 1], { roughness: 0.2, bump: 0.4 }), 0.8);
  const kidsBasinM = U(k.mat(tx("poKids", PT.poMosaic, "#f2c84a", "#3fb3d6", 32, 9, 0.1), "#ffffff", [1, 1], { roughness: 0.2, bump: 0.4 }), 0.8);
  const wallTileM = U(k.mat(tx("poWallT", PT.poWallTile, "#f0f2ef", 11, ""), "#ffffff", [1, 1], { roughness: 0.2, bump: 0.35 }), 1.2);
  const wallBandM = U(k.mat(tx("poWallB", PT.poWallTile, "#eef1ef", 12, "#2f5fbf"), "#ffffff", [1, 1], { roughness: 0.2, bump: 0.35 }), 1.2);
  const showerTileM = U(k.mat(tx("poShowerT", PT.poWallTile, "#cfe6ee", 14, "#1f7fa8"), "#ffffff", [1, 1], { roughness: 0.18, bump: 0.35 }), 1.2);
  const paintM = U(k.mat(tx("poPaint", PT.poPaint, "#e4e2da", 71), "#ffffff", [1, 1], { roughness: 0.85, bump: 0.25 }), 3);
  const paintBlueM = U(k.mat(tx("poPaintB", PT.poPaint, "#5f86b8", 72), "#ffffff", [1, 1], { roughness: 0.7, bump: 0.25 }), 3);
  const concreteM = U(k.mat(k.tex("poConc", () => T.concrete("#a7a9a6", 8)), "#ffffff", [1, 1], { roughness: 0.8, bump: 0.6 }), 2);
  const ceilM = U(k.mat(k.tex("poCeil", PT.poCeiling), "#ffffff", [1, 1], { roughness: 0.8, bump: 0.3 }), 2.4);
  const waterTex = k.tex("poWater", PT.poWater);
  const waterM = k.mat(waterTex, "#9fe6f2", [1, 1], { transparent: true, roughness: 0.04, metalness: 0.1, bump: 0.45 });
  waterM.m.alphaTest = 0; waterM.m.opacity = 0.74; waterM.m.depthWrite = false; waterM.m.side = THREE.FrontSide;
  waterM.m.userData.flow = [0.006, 0.014];
  U(waterM, 3.2);
  const kidsWaterM = k.mat(waterTex, "#b4f0f4", [1, 1], { transparent: true, roughness: 0.05, metalness: 0.1, bump: 0.4 });
  kidsWaterM.m.alphaTest = 0; kidsWaterM.m.opacity = 0.6; kidsWaterM.m.depthWrite = false; kidsWaterM.m.side = THREE.FrontSide;
  kidsWaterM.m.userData.flow = [0.012, -0.01];
  U(kidsWaterM, 2.4);
  const curtainM = k.mat(waterTex, "#e8fbff", [2, 1], { transparent: true, roughness: 0.05, bump: 0.3, emissive: "#6fb8c8", emissiveIntensity: 0.25 });
  curtainM.m.alphaTest = 0; curtainM.m.opacity = 0.45; curtainM.m.depthWrite = false;
  curtainM.m.userData.flow = [0, -0.9];
  const puddleM = k.mat(null, "#6f8a92", [1, 1], { transparent: true, roughness: 0.03, metalness: 0.3 });
  puddleM.m.alphaTest = 0; puddleM.m.opacity = 0.35; puddleM.m.depthWrite = false; puddleM.m.side = THREE.FrontSide;
  const glassM = k.mat(null, "#b9d4dc", [1, 1], { transparent: true, roughness: 0.04, metalness: 0.2 });
  glassM.m.alphaTest = 0; glassM.m.opacity = 0.25; glassM.m.depthWrite = false;
  const dayM = k.mat(null, "#eaf4ff", [1, 1], { roughness: 0.1, emissive: "#dcecff", emissiveIntensity: 1.25 });
  const chromeM = k.mat(null, "#e3e6e8", [1, 1], { roughness: 0.12, metalness: 1 });
  const steelM = k.mat(null, "#9aa1a6", [1, 1], { roughness: 0.35, metalness: 0.85 });
  const darkSteelM = k.mat(null, "#4b5157", [1, 1], { roughness: 0.45, metalness: 0.7 });
  const beamM = k.mat(null, "#dfe3e6", [1, 1], { roughness: 0.5, metalness: 0.4 });
  const whitePlM = k.mat(null, "#f4f4f1", [1, 1], { roughness: 0.4 });
  const redPlM = k.mat(null, "#d12a22", [1, 1], { roughness: 0.38 });
  const bluePlM = k.mat(null, "#2459b8", [1, 1], { roughness: 0.38 });
  const yellowPlM = k.mat(null, "#f2c21c", [1, 1], { roughness: 0.38 });
  const greenPlM = k.mat(null, "#2fa84f", [1, 1], { roughness: 0.4 });
  const orangePlM = k.mat(null, "#f06a1c", [1, 1], { roughness: 0.4 });
  const tintM = k.mat(null, "#ffffff", [1, 1], { roughness: 0.42 }); // instance-coloured plastic
  const tealM = k.mat(k.tex("poTeal", () => PT.poPaint("#4fb5ad", 73)), "#ffffff", [1, 1], { roughness: 0.45, bump: 0.3 });
  U(tealM, 1.5);
  const blackM = k.mat(null, "#1b1d20", [1, 1], { roughness: 0.5 });
  const rubberM = U(k.mat(k.tex("poRubber", PT.poRubber), "#ffffff", [1, 1], { roughness: 0.9, bump: 0.8 }), 0.5);
  const grateM = U(k.mat(k.tex("poGrate", PT.poGrate), "#ffffff", [1, 1], { roughness: 0.4, bump: 0.6 }), 0.25);
  const woodM = U(k.mat(k.tex("poWood", () => T.wood("#b8875a", "#8a5a36", 5)), "#ffffff", [1, 1], { roughness: 0.45, bump: 0.6 }), 1.2);
  const lockerCols = ["#3f7fc4", "#e0564a", "#43a6a0", "#f2b233"];
  const lockerTex = lockerCols.map((c, i) => k.mat(tx(`poLock${i}`, PT.poLockers, c, 4, 1 + i * 8, 41 + i), "#ffffff", [1, 1], { roughness: 0.35, metalness: 0.35, bump: 0.3 }));
  const lockerBodyM = lockerCols.map((c) => k.mat(null, c, [1, 1], { roughness: 0.4, metalness: 0.35 }));
  const mirrorM = k.mat(null, "#cfd7da", [1, 1], { roughness: 0.03, metalness: 1 });
  const ceramicM = k.mat(null, "#f4f3ef", [1, 1], { roughness: 0.15 });
  const lampM = k.mat(null, "#fffaf0", [1, 1], { roughness: 0.3, emissive: "#fff6e6", emissiveIntensity: 2.4 });
  const tubeLightM = k.mat(null, "#ffffff", [1, 1], { roughness: 0.3, emissive: "#f2f6ff", emissiveIntensity: 1.8 });
  const towelM = [["#e8453c", "#ffffff"], ["#2d6fd0", "#f2e9d0"], ["#f2c21c", "#2aa39a"], ["#7a3fb0", "#ffffff"]].map((c, i) =>
    k.mat(tx(`poTowel${i}`, PT.poStripes, c, 51 + i), "#ffffff", [1, 1], { roughness: 1, bump: 0.3 }));
  const foamM = k.mat(k.tex("poFoam", PT.poFoam), "#ffffff", [1, 1], { roughness: 0.8, bump: 0.5 });
  const scoreM = k.mat(k.tex("poScore", PT.poScoreboard), "#ffffff", [1, 1], { roughness: 0.3, bump: 0, emissive: "#ffffff", emissiveIntensity: 0.9 });
  const clockM = k.mat(k.tex("poClock", PT.poClock), "#ffffff", [1, 1], { roughness: 0.2, bump: 0 });
  const muralM = k.mat(tx("poMural1", PT.poMural, "SPLASH!"), "#ffffff", [1, 1], { roughness: 0.55, bump: 0 });
  const mural2M = k.mat(tx("poMural2", PT.poMural, "DIVE IN"), "#ffffff", [1, 1], { roughness: 0.55, bump: 0 });
  const vendM = k.mat(k.tex("poVend", () => PT.poSign(["COLD", "DRINKS"], "#1d5fb8", "#ffffff", 128, 256)), "#ffffff", [1, 1], { roughness: 0.25, bump: 0, emissive: "#ffffff", emissiveIntensity: 0.6 });
  const tagM = [["CLOUD", "#3a5fc8", "#8fc0ff", 91], ["SPLASH", "#e2366a", "#ffb0c8", 92], ["WAVE", "#1ea86a", "#9ff0b8", 93], ["KZ", "#f07a1a", "#ffd23a", 94], ["DRIP", "#7a3fc8", "#d0a8ff", 95]].map(([t, a, b, sd]) => {
    const m = k.mat(k.tex(`poTag${t}`, () => PT.poTag(t as string, a as string, b as string, sd as number)), "#ffffff", [1, 1], { transparent: true, roughness: 0.6, bump: 0 });
    m.m.alphaTest = 0.05; m.m.depthWrite = false; m.m.polygonOffset = true; m.m.polygonOffsetFactor = -2;
    return m;
  });
  const bannerM = (t: string, bg: string, fg: string, st: string) => k.mat(k.tex(`poBan${t}`, () => PT.poBanner(t, bg, fg, st)), "#ffffff", [1, 1], { roughness: 0.9, bump: 0.2 });
  const ductM = k.mat(null, "#b4bbc0", [1, 1], { roughness: 0.3, metalness: 0.85 });
  const signCache = new Map<string, Mat>();
  const sign = (lines: string[], bg = "#1f4fa8", fg = "#ffffff", icon = "", w = 256, h = 128) => {
    const key = lines.join("|") + bg + icon + w;
    let m = signCache.get(key);
    if (!m) signCache.set(key, (m = k.mat(k.tex(`poSign${key}`, () => PT.poSign(lines, bg, fg, w, h, icon)), "#ffffff", [1, 1], { roughness: 0.4, bump: 0 })));
    return m;
  };

  const r0 = rng(2024);

  // ======================= BASE + DECK =======================
  Y0 = 0;
  bx(concreteM, 44, 0.2, 32, 0, -0.2, 0, { unit: 2 }); // structural slab (pool floor level)
  /** tiled deck slab at height D with a collider */
  const deck = (x1: number, x2: number, z1: number, z2: number, m: Mat = deckM) => {
    bx(m, x2 - x1, D, z2 - z1, (x1 + x2) / 2, 0, (z1 + z2) / 2);
    col(x1, x2, z1, z2, 0, D, true);
  };
  const PX = 12.5, PZ = 5; // main pool half extents
  const KX1 = 14.5, KX2 = 19.5, KZ1 = 1, KZ2 = 6; // kids pool
  deck(-21, 21, -15, -9, roomFloorM); // changing block floor
  deck(-21, 21, -9, -PZ);
  deck(-21, 21, KZ2, 15);
  deck(-21, KX1, PZ, KZ2);
  deck(KX2, 21, PZ, KZ2);
  deck(-21, -PX, -PZ, PZ);
  deck(PX, KX1, -PZ, PZ);
  deck(KX1, KX2, -PZ, KZ1);
  deck(KX2, 21, -PZ, KZ2 - 1);
  // blue edge band + overflow gutter grate around the main pool (flush with the deck)
  for (const s of [-1, 1]) {
    bx(edgeBlueM, 2 * PX + 1.2, 0.004, 0.4, 0, D, s * (PZ + 0.2));
    bx(edgeBlueM, 0.4, 0.004, 2 * PZ, s * (PX + 0.2), D, 0);
    bx(grateM, 2 * PX + 1.8, 0.004, 0.22, 0, D + 0.001, s * (PZ + 0.55));
    bx(grateM, 0.22, 0.004, 2 * PZ + 1.32, s * (PX + 0.55), D + 0.001, 0);
    // rounded bullnose coping
    const cg = new THREE.CylinderGeometry(0.05, 0.05, 2 * PX + 0.1, 12);
    put(edgeBlueM, xf(cg, 0, D - 0.05, s * (PZ + 0.0), 0, 0, PI / 2), 1);
    const cg2 = new THREE.CylinderGeometry(0.05, 0.05, 2 * PZ + 0.1, 12);
    put(edgeBlueM, xf(cg2, s * (PX + 0.0), D - 0.05, 0, 0, PI / 2, 0), 1);
  }
  // kids pool edge (yellow)
  bx(yellowPlM, KX2 - KX1 + 0.8, 0.006, 0.3, (KX1 + KX2) / 2, D, KZ1 - 0.15);
  bx(yellowPlM, KX2 - KX1 + 0.8, 0.006, 0.3, (KX1 + KX2) / 2, D, KZ2 + 0.15);
  bx(yellowPlM, 0.3, 0.006, KZ2 - KZ1, KX1 - 0.15, D, (KZ1 + KZ2) / 2);
  bx(yellowPlM, 0.3, 0.006, KZ2 - KZ1, KX2 + 0.15, D, (KZ1 + KZ2) / 2);

  // ======================= MAIN POOL BASIN (visual, below the water) =======================
  {
    const yW = -1.1, yE = -1.9; // floor depth at the west (shallow) and east (deep) ends
    const slope = Math.atan2(yW - yE, 2 * PX);
    put(basinM, xf(new THREE.BoxGeometry(2 * PX, 0.1, 2 * PZ), 0, (yW + yE) / 2 - 0.05, 0, 0, 0, slope), 0.8);
    // lane lines with T ends
    for (let i = 0; i < 5; i++) {
      const z = -4 + i * 2;
      put(laneM, xf(new THREE.BoxGeometry(2 * PX - 4, 0.02, 0.25), 0, (yW + yE) / 2 + 0.005, z, 0, 0, slope), 0.8);
      for (const s of [-1, 1]) {
        const xx = s * (PX - 2);
        const yy = (yW + yE) / 2 - (xx / (2 * PX)) * (yW - yE) + 0.006;
        put(laneM, xf(new THREE.BoxGeometry(0.25, 0.02, 1.0), xx, yy, z, 0, 0, slope), 0.8);
      }
      // wall targets
      for (const s of [-1, 1]) {
        bx(laneM, 0.02, 0.9, 0.25, s * (PX - 0.03), (s < 0 ? yW : yE) + 0.2, z, { unit: 0.8 });
        bx(laneM, 0.02, 0.25, 0.8, s * (PX - 0.03), WY - 0.55, z, { unit: 0.8 });
      }
    }
    // side walls + end walls down to the floor
    for (const s of [-1, 1]) {
      bx(basinM, 2 * PX, D - yE + 0.1, 0.1, 0, yE - 0.1, s * (PZ + 0.05));
      bx(basinM, 0.1, D - (s < 0 ? yW : yE) + 0.1, 2 * PZ, s * (PX + 0.05), (s < 0 ? yW : yE) - 0.1, 0);
      // waterline band
      bx(edgeBlueM, 2 * PX, 0.28, 0.02, 0, WY - 0.12, s * (PZ - 0.0));
      bx(edgeBlueM, 0.02, 0.28, 2 * PZ, s * (PX - 0.0), WY - 0.12, 0);
    }
    // floor drains
    for (const x of [8, 10]) bx(darkSteelM, 0.5, 0.02, 0.5, x, yE + ((PX - x) / (2 * PX)) * 0.0 + 0.1, 0);
    // graffiti tags on the basin walls (like the real map's "CLOUD" piece), seen through the water
    pl(tagM[0], 4.2, 1.6, PX - 0.004, -0.75, -1.6, -PI / 2);
    pl(tagM[1], 3.6, 1.35, -3.5, -0.55, PZ - 0.004, PI);
    pl(tagM[2], 3.2, 1.2, 6.5, -0.7, -PZ + 0.004, 0);
    // water surface
    put(waterM, xf(new THREE.PlaneGeometry(2 * PX, 2 * PZ), 0, WY, 0, 0, -PI / 2), 3.2);
    // kids pool
    const kx = (KX1 + KX2) / 2, kz = (KZ1 + KZ2) / 2;
    bx(kidsBasinM, KX2 - KX1, 0.1, KZ2 - KZ1, kx, -0.35, kz);
    for (const s of [-1, 1]) {
      bx(kidsBasinM, KX2 - KX1, D + 0.35, 0.1, kx, -0.35, s < 0 ? KZ1 + 0.05 : KZ2 - 0.05);
      bx(kidsBasinM, 0.1, D + 0.35, KZ2 - KZ1, s < 0 ? KX1 + 0.05 : KX2 - 0.05, -0.35, kz);
    }
    put(kidsWaterM, xf(new THREE.PlaneGeometry(KX2 - KX1 - 0.1, KZ2 - KZ1 - 0.1), kx, WY - 0.02, kz, 0, -PI / 2), 2.4);
    // mushroom fountain
    lat(greenPlM, [[0, 0], [0.22, 0], [0.16, 0.2], [0.14, 1.3], [0, 1.3]], kx, -0.3, kz, 20);
    lat(redPlM, [[0.06, 1.2], [1.05, 1.18], [1.0, 1.32], [0.75, 1.55], [0.35, 1.7], [0, 1.73]], kx, -0.3, kz, 32);
    const capY = (q: number) => (q < 0.35 ? 1.73 - (0.03 / 0.35) * q : q < 0.75 ? 1.7 - (0.15 / 0.4) * (q - 0.35) : 1.55 - (0.23 / 0.25) * (q - 0.75)) - 0.3;
    for (let i = 0; i < 9; i++) { const a = i * 0.7 + 0.3, rr = 0.2 + (i % 3) * 0.24; sph(whitePlM, 0.09 + (i % 2) * 0.04, kx + Math.cos(a) * rr, capY(rr), kz + Math.sin(a) * rr, 1, 0.35, 1, 10); }
    put(curtainM, xf(new THREE.CylinderGeometry(1.03, 1.14, 0.6, 32, 1, true), kx, 0.58, kz), 0);
    col(kx - 0.2, kx + 0.2, kz - 0.2, kz + 0.2, 0, 1.4);
    // little slide into the kids pool from the east deck
    Y0 = D;
    const sf = F(20.6, 3.5, -PI / 2); // local +z = towards the pool (−x)
    sf.bx(bluePlM, 1.0, 0.08, 1.0, 0, 1.1, 0.6, { round: true });
    for (const [lx, lz] of [[-0.45, 0.15], [0.45, 0.15], [-0.45, 1.05], [0.45, 1.05]] as [number, number][]) sf.cy(yellowPlM, 0.04, 0.04, 1.1, lx, 0, lz, 10);
    for (let i = 1; i <= 4; i++) sf.cy(yellowPlM, 0.025, 0.025, 0.9, 0, i * 0.24, 0.15, 8, { rz: PI / 2 });
    sf.rail(yellowPlM, [[-0.45, 1.1, 0.15], [-0.45, 1.6, 0.15], [-0.45, 1.6, 1.0]], 0.03);
    sf.rail(yellowPlM, [[0.45, 1.1, 0.15], [0.45, 1.6, 0.15], [0.45, 1.6, 1.0]], 0.03);
    {
      const len = 2.7, ang = Math.atan2(1.1 - 0.3, 1.9);
      const chute = new THREE.Shape();
      chute.moveTo(-0.4, 0.2); chute.lineTo(-0.4, 0); chute.lineTo(0.4, 0); chute.lineTo(0.4, 0.2); chute.lineTo(0.34, 0.2); chute.lineTo(0.34, 0.06); chute.lineTo(-0.34, 0.06); chute.lineTo(-0.34, 0.2); chute.closePath();
      const g = new THREE.ExtrudeGeometry(chute, { depth: len, bevelEnabled: false });
      g.rotateX(ang);
      sf.geo(orangePlM, g, 0, 1.1, 1.05);
    }
    sf.col(-0.5, 0.5, 0.1, 1.1, 0, 1.18);
  }
  Y0 = D;

  // ======================= HALL SHELL =======================
  const wallSeg = (axis: "x" | "z", c: number, a1: number, a2: number, y1: number, y2: number, m: Mat, t = 0.3) => {
    if (a2 - a1 < 0.01 || y2 - y1 < 0.01) return;
    if (axis === "x") { bx(m, a2 - a1, y2 - y1, t, (a1 + a2) / 2, y1, c); col(a1, a2, c - t / 2, c + t / 2, y1, y2); }
    else { bx(m, t, y2 - y1, a2 - a1, c, y1, (a1 + a2) / 2); col(c - t / 2, c + t / 2, a1, a2, y1, y2); }
  };
  const TOP = HH - D;
  // north wall: tile dado, painted above
  wallSeg("x", 15.15, -21.3, 21.3, -D, 2.2, wallBandM);
  wallSeg("x", 15.15, -21.3, 21.3, 2.2, TOP, paintM);
  // west wall
  wallSeg("z", -21.15, -15, 15, -D, 2.2, wallBandM);
  wallSeg("z", -21.15, -15, 15, 2.2, TOP, paintM);
  // east wall with big daylight windows (z -8..14)
  wallSeg("z", 21.15, -15, -8.2, -D, TOP, wallBandM);
  wallSeg("z", 21.15, 14.2, 15, -D, TOP, paintM);
  wallSeg("z", 21.15, -8.2, 14.2, -D, 0.9, wallBandM);
  wallSeg("z", 21.15, -8.2, 14.2, 6.2, TOP, paintM);
  pl(dayM, 22.4, 5.3, 21.28, 0.9 + 2.65, 3, -PI / 2);
  bx(glassM, 0.02, 5.3, 22.4, 21.05, 0.9, 3, { unit: 0 });
  for (let z = -8.2; z <= 14.21; z += 2.8) bx(darkSteelM, 0.14, 5.3, 0.1, 20.98, 0.9, z);
  for (const y of [0.9, 3.5, 6.1]) bx(darkSteelM, 0.16, 0.1, 22.4, 20.98, y, 3);
  bx(whitePlM, 0.35, 0.05, 22.4, 20.85, 0.88, 3); // sill
  // south wall of the building (behind the changing block), upper part above the block
  wallSeg("x", -15.15, -21.3, 21.3, -D, TOP, paintM);
  // ceiling + steel trusses + ducts
  bx(ceilM, 42.6, 0.2, 30.6, 0, TOP, 0);
  for (let x = -18; x <= 18; x += 6) {
    bx(beamM, 0.25, 0.55, 30.2, x, TOP - 0.55, 0);
    bx(beamM, 0.35, 0.05, 30.2, x, TOP - 0.58, 0);
  }
  for (const z of [-4, 4, 11]) bx(beamM, 42, 0.2, 0.15, 0, TOP - 0.75, z);
  tb(ductM, [[-21, TOP - 1.2, 12.8], [21, TOP - 1.2, 12.8]], 0.38, 4, 20);
  for (let x = -18; x <= 18; x += 3) cy(darkSteelM, 0.4, 0.4, 0.06, x, TOP - 1.2, 12.8, 20, { rz: PI / 2 });
  for (let x = -15; x <= 15; x += 10) { cy(ductM, 0.25, 0.25, 0.9, x, TOP - 1.95, 12.8, 16); cy(darkSteelM, 0.32, 0.32, 0.05, x, TOP - 2.0, 12.8, 16); }

  // ---- hall lamps (high-bay pendants): the point lights sit exactly at their diffusers ----
  const LAMPS: V3[] = [[-9, 6.2, 0], [9, 6.2, 0], [-9, 6.2, 10], [9, 6.2, 10]];
  for (const [x, y, z] of LAMPS) {
    Y0 = 0;
    cy(darkSteelM, 0.012, 0.012, HH - y - 0.35, x, y + 0.35, z, 6);
    lat(ductM, [[0.06, 0.35], [0.12, 0.3], [0.5, 0.06], [0.56, 0.0], [0.54, 0.0], [0.47, 0.05], [0.1, 0.28], [0, 0.3]], x, y, z, 32);
    put(lampM, xf(new THREE.CircleGeometry(0.47, 32), x, y + 0.02, z, 0, PI / 2), 0);
    Y0 = D;
  }

  // ---- pennant bunting across the hall (red, like the real map) ----
  {
    const tri = () => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute([-0.13, 0, 0, 0.13, 0, 0, 0, -0.32, 0], 3));
      g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 1, 1, 1, 0.5, 0], 3 - 1));
      return g;
    };
    const flagM = k.mat(null, "#ffffff", [1, 1], { roughness: 0.7 });
    flagM.m.side = THREE.DoubleSide;
    const line = (x1: number, x2: number, z: number, y: number, sag: number, cols: string[], spacing = 0.42) => {
      const pts: V3[] = [];
      for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push([x1 + (x2 - x1) * t, y - sag * 4 * t * (1 - t), z]); }
      tb(blackM, pts, 0.008, 40, 4);
      const n = Math.floor(Math.abs(x2 - x1) / spacing);
      for (let i = 1; i < n; i++) {
        const t = i / n;
        inst("pennant", tri, flagM, { pos: [x1 + (x2 - x1) * t, y - sag * 4 * t * (1 - t), z], rotY: 0.05 * Math.sin(i), color: cols[i % cols.length] });
      }
    };
    line(-21, 21, -2.5, 4.6, 0.9, ["#d8231c", "#e2342a", "#c81e18"]);
    line(-21, 21, 3.5, 4.6, 0.9, ["#d8231c", "#e2342a", "#c81e18"]);
    // backstroke flags 5 m from each wall
    for (const x of [-PX + 5, PX - 5]) {
      for (const z of [-PZ - 0.9, PZ + 0.9]) { cy(steelM, 0.03, 0.03, 1.9, x, 0, z, 10); cy(darkSteelM, 0.15, 0.17, 0.08, x, 0, z, 16); }
      const pts: V3[] = [[x, 1.85, -PZ - 0.9], [x, 1.7, 0], [x, 1.85, PZ + 0.9]];
      tb(whitePlM, pts, 0.006, 20, 4);
      const n = 26;
      for (let i = 1; i < n; i++) {
        const t = i / n, z = -PZ - 0.9 + t * (2 * PZ + 1.8);
        inst("pennantB", tri, flagM, { pos: [x, 1.85 - 0.15 * 4 * t * (1 - t) * 1, z], rotY: PI / 2, scale: [0.7, 0.6, 1], color: ["#1c47b8", "#f4f4f4", "#d8231c"][i % 3] });
      }
    }
  }

  // ======================= LANE ROPES =======================
  {
    const floatG = () => new THREE.LatheGeometry(V2([[0.0, -0.05], [0.035, -0.05], [0.07, -0.025], [0.075, 0], [0.07, 0.025], [0.035, 0.05], [0, 0.05]]), 10);
    Y0 = 0;
    for (const z of [-3, -1, 1, 3]) {
      const n = Math.floor((2 * PX - 0.4) / 0.11);
      for (let i = 0; i < n; i++) {
        const x = -PX + 0.2 + i * 0.11 + 0.055;
        const endZone = x < -PX + 5 || x > PX - 5;
        const c = endZone ? (i % 2 ? "#d8231c" : "#f2f2f2") : (i % 6 < 3 ? "#1f4fc0" : "#f4f4f4");
        inst("laneFloat", floatG, tintM, { pos: [x, WY + 0.01, z + Math.sin(i * 0.3 + z) * 0.012], rotZ: PI / 2, color: c });
      }
      for (const s of [-1, 1]) { cy(chromeM, 0.02, 0.02, 0.18, s * (PX - 0.05), WY + 0.1, z, 8, { rz: PI / 2 }); }
    }
    Y0 = D;
  }

  // ======================= STARTING BLOCKS (west end) =======================
  for (let i = 0; i < 5; i++) {
    const z = -4 + i * 2;
    const f = F(-PX - 0.55, z, PI / 2); // front faces +x (the pool)
    f.bx(whitePlM, 0.55, 0.62, 0.5, 0, 0, -0.05, { round: true });
    f.bx(whitePlM, 0.52, 0.06, 0.72, 0, 0.66, 0.05, { round: true, rx: 0.12 });
    f.bx(rubberM, 0.48, 0.012, 0.66, 0, 0.71, 0.06, { rx: 0.12, unit: 0.5 });
    f.bx(bluePlM, 0.44, 0.08, 0.2, 0, 0.62, -0.28, { round: true, rx: -0.2 }); // back plate
    f.pl(sign([String(i + 1)], "#1f4fa8", "#ffffff", "", 128, 128), 0.34, 0.34, 0, 0.36, 0.206);
    f.rail(chromeM, [[-0.3, 0.05, 0.35], [-0.3, 0.72, 0.35], [-0.3, 0.72, 0.1]], 0.016);
    f.rail(chromeM, [[0.3, 0.05, 0.35], [0.3, 0.72, 0.35], [0.3, 0.72, 0.1]], 0.016);
    f.cy(chromeM, 0.016, 0.016, 0.5, 0, 0.38, 0.38, 8, { rz: PI / 2 }); // backstroke grip
    f.col(-0.3, 0.3, -0.35, 0.4, 0, 0.72);
  }
  // depth markers on the deck (text tiles)
  for (const [x, lab] of [[-PX + 1.2, "1.1 m"], [0, "1.5 m"], [PX - 1.2, "1.9 m"]] as [number, string][]) {
    for (const s of [-1, 1]) pl(sign([lab], "#f2f3f1", "#141414", "", 256, 128), 0.8, 0.4, x, 0.006, s * (PZ + 0.95), s > 0 ? PI : 0, -PI / 2);
  }
  for (const s of [-1, 1]) pl(sign(["NO", "DIVING"], "#f2f3f1", "#c81e18", "nodive", 256, 128), 0.8, 0.4, -PX + 3.4, 0.006, s * (PZ + 0.95), s > 0 ? PI : 0, -PI / 2);

  // ======================= LADDERS =======================
  for (const [x, s] of [[-PX + 1.6, -1], [PX - 1.6, -1], [-PX + 1.6, 1], [PX - 1.6, 1]] as [number, number][]) {
    const z0 = s * PZ;
    for (const dx of [-0.28, 0.28]) {
      tb(chromeM, [[x + dx, -0.2, z0 + s * 0.05 - s * 0.12], [x + dx, D + 0.35, z0 - s * 0.1], [x + dx, D + 0.75, z0 + s * 0.12], [x + dx, D + 0.72, z0 + s * 0.45], [x + dx, D + 0.0, z0 + s * 0.55]].map(([a, b, c]) => [a, b - D, c] as V3), 0.022, 40);
      cy(steelM, 0.05, 0.05, 0.02, x + dx, 0.0, z0 + s * 0.55, 12);
    }
    for (let i = 0; i < 3; i++) bx(chromeM, 0.52, 0.03, 0.09, x, -0.2 - D - i * 0.3 + 0.02 + 0.3, z0 - s * 0.12);
  }

  // ======================= FLOATING TOYS =======================
  {
    Y0 = 0;
    const ringG = new THREE.TorusGeometry(0.38, 0.14, 12, 28);
    put(k.mat(null, "#ff6fa8", [1, 1], { roughness: 0.25 }), xf(ringG.clone(), -4.2, WY + 0.05, 2.1, 0, PI / 2), 0);
    put(k.mat(null, "#ffd23a", [1, 1], { roughness: 0.25 }), xf(new THREE.TorusGeometry(0.3, 0.1, 10, 24), 6.2, WY + 0.04, -2.3, 0, PI / 2), 0);
    // beach balls
    const bb = k.mat(k.tex("poBall", () => T.stripes(["#e8352a", "#ffffff", "#2d6fd0", "#ffffff", "#f2c21c", "#ffffff"])), "#ffffff", [1, 1], { roughness: 0.3, bump: 0 });
    // pushable beach balls (engine rolls them when a player walks into them); pools keep them contained
    const ballG = new THREE.SphereGeometry(0.25, 24, 16);
    ballG.userData.pushable = true;
    const balls: Inst[] = [];
    const bcols = ["#ffffff", "#fff4e8", "#eef6ff", "#ffffff"];
    for (const [x, z, s] of [[2.4, 3.6, 1], [-9.5, -3.7, 0.9], [7.5, 1.2, 1.1], [-2.5, -0.5, 0.85], [16.8, 2.3, 0.8], [18.0, 4.8, 0.75]] as V3[])
      balls.push({ pos: [x, (x > 14 ? WY - 0.02 : WY) + 0.25 * s * 0.55, z], scale: [s, s, s], rotY: x, rotX: z * 0.3, color: bcols[Math.round(Math.abs(x)) % 4] });
    for (const [x, z, s] of [[-10.5, -11.2, 1.1], [9.5, -10.4, 1]] as V3[]) balls.push({ pos: [x, D + BH + 0.2 + 0.25 * s, z], scale: [s, s, s], rotY: z, color: "#ffffff" });
    k.instances(ballG, bb, balls);
    // pool noodles
    for (const [x, z, ry, c] of [[-1.5, -2.2, 0.4, "#ff5aa0"], [-1.2, -2.0, 0.55, "#39c24a"], [8.5, 4.1, -0.3, "#ffb31a"], [16, 4.8, 1.2, "#2d8fe0"]] as [number, number, number, string][])
      inst("noodle", () => new THREE.CylinderGeometry(0.035, 0.035, 1.6, 10), tintM, { pos: [x, WY + 0.02, z], rotZ: PI / 2, rotY: ry, color: c });
    // floating kickboard
    inst("kick", () => boxGeo(0.3, 0.035, 0.45), tintM, { pos: [3.8, WY + 0.02, -0.4], rotY: 0.5, color: "#2d6fd0" });
    // big rubber duck
    const duckY = k.mat(null, "#ffcf1a", [1, 1], { roughness: 0.3 });
    sph(duckY, 0.32, -6.5, WY + 0.1, -2.4, 1.2, 0.8, 1, 18);
    sph(duckY, 0.2, -6.25, WY + 0.46, -2.4, 1, 1, 1, 16);
    sph(orangePlM, 0.08, -6.03, WY + 0.43, -2.4, 1.3, 0.5, 1, 10);
    sph(blackM, 0.025, -6.13, WY + 0.52, -2.3, 1, 1, 1, 8);
    sph(blackM, 0.025, -6.13, WY + 0.52, -2.5, 1, 1, 1, 8);
    Y0 = D;
  }

  // ======================= NORTH: BLEACHERS + MURAL =======================
  {
    const x1 = -12, x2 = 12;
    const tiers: [number, number][] = [[9, 0.44], [11, 0.88], [13, 1.32]];
    for (const [z, h] of tiers) {
      bx(concreteM, x2 - x1, h, 15 - z, 0, 0, (z + 15) / 2, { unit: 2 });
      col(x1, x2, z, 15, 0, h, true);
      bx(bluePlM, x2 - x1, 0.03, 0.08, 0, h - 0.01, z + 0.04); // nosing
    }
    const seatG = () => mg([
      xf(boxGeo(0.44, 0.05, 0.4), 0, 0.42, 0.05, 0, -0.06),
      xf(boxGeo(0.44, 0.42, 0.05), 0, 0.68, -0.17, 0, -0.18),
      xf(new THREE.CylinderGeometry(0.04, 0.06, 0.4, 10), 0, 0.2, -0.05),
      xf(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 12), 0, 0.01, -0.05),
    ]);
    for (const [z, h] of tiers) {
      for (let x = x1 + 0.4; x < x2 - 0.2; x += 0.55) {
        if (Math.abs(x) < 0.7) continue; // aisle
        const c = r0() < 0.08 ? "#f2f2f2" : r0() < 0.5 ? "#c81f1a" : "#d62a22";
        inst("seat", seatG, tintM, { pos: [x, h, z + 0.8], rotY: (r0() - 0.5) * 0.08, color: c });
      }
    }
    // aisle steps + handrail
    for (const [z, h] of tiers) bx(edgeBlueM, 1.2, 0.02, 0.1, 0, h, z + 0.05);
    rail(chromeM, [[0, 0.0, 8.6], [0, 1.0, 8.6], [0, 1.45, 11], [0, 1.9, 13], [0, 2.3, 14.9]], 0.025);
    // front railing
    for (let x = x1; x <= x2 + 0.01; x += 2) cy(chromeM, 0.025, 0.025, 1.0, x, 0, 8.75, 8);
    tb(chromeM, [[x1, 1.0, 8.75], [x2, 1.0, 8.75]], 0.03, 4);
    tb(chromeM, [[x1, 0.5, 8.75], [x2, 0.5, 8.75]], 0.018, 4);
    col(x1, x2, 8.65, 8.85, 0, 1.0, true);
    // mural + tags
    pl(muralM, 11, 5.5, 0, 4.3, 14.985, PI);
    pl(mural2M, 8, 4, -20.985, 3.2, 0.5, PI / 2);
    // graffiti tags and club banners (the real map is covered with spray tags)
    pl(tagM[3], 2.8, 1.05, -16.2, 1.25, 14.99, PI);
    pl(tagM[4], 2.6, 1.0, 7.9, 1.55, -8.89, 0);
    pl(tagM[0], 2.4, 0.9, -20.99, 1.2, 11.2, PI / 2);
    pl(tagM[2], 2.2, 0.85, 20.99, 1.3, -11.6 + 0.0, -PI / 2);
    const banner = (t: string, bg: string, fg: string, st: string, w: number, x: number, y: number, z: number, ry: number) => {
      const h = w * 96 / 512;
      pl(bannerM(t, bg, fg, st), w, h, x, y, z, ry);
      // hanging rod + cords
      const f = F(x, z, ry);
      f.cy(darkSteelM, 0.02, 0.02, w + 0.2, 0, y + h / 2 + 0.04, 0.03, 8, { rz: PI / 2 });
      for (const s2 of [-1, 1]) f.cy(blackM, 0.004, 0.004, 0.5, s2 * w * 0.45, y + h / 2 + 0.04, 0.03, 4);
    };
    banner("CITY AQUATIC CENTRE", "#1f4fa8", "#ffffff", "#f2c21c", 15, 0, 5.9, -14.98, 0);
    banner("CITY SWIM CLUB", "#d12a22", "#ffffff", "#ffffff", 5.2, -12.2, 6.2, 14.97, PI);
    banner("AQUA KIDS", "#f2c21c", "#1f4fa8", "#2fa8a0", 4.2, 11.6, 6.2, 14.97, PI);
    banner("LEARN TO SWIM", "#2fa8a0", "#ffffff", "#1f4fa8", 5.2, -20.97, 6.3, -4.5, PI / 2);
    // wall speakers, fire extinguishers, emergency exit signs, vents
    for (const [x, z, ry] of [[-20.9, -1, PI / 2], [-20.9, 14.0, PI / 2], [-8, 14.9, PI], [8, 14.9, PI], [20.9, -8.8, -PI / 2]] as V3[]) {
      const f = F(x, z, ry);
      f.bx(blackM, 0.34, 0.5, 0.24, 0, 4.9, 0.12, { round: true, rx: 0.25 });
      f.bx(darkSteelM, 0.28, 0.42, 0.01, 0, 4.95, 0.26, { rx: 0.25 });
      f.bx(darkSteelM, 0.06, 0.06, 0.2, 0, 5.2, 0.04);
    }
    for (const [x, z, ry] of [[-20.85, -2.4, PI / 2], [20.85, 14.0, -PI / 2], [-13.6, -8.8, 0], [14.3, -8.8, 0]] as V3[]) {
      const f = F(x, z, ry);
      f.lat(redPlM, [[0, 0], [0.085, 0], [0.09, 0.05], [0.09, 0.46], [0.07, 0.52], [0.03, 0.55], [0, 0.55]], 0, 0.35, 0.1, 16);
      f.cy(blackM, 0.018, 0.018, 0.12, 0, 0.9, 0.1, 8);
      f.bx(darkSteelM, 0.12, 0.04, 0.08, 0, 0.8, 0.02);
      f.pl(sign(["FIRE", "EXTINGUISHER"], "#d12a22", "#ffffff", "", 128, 96), 0.28, 0.21, 0, 1.15, 0.01);
    }
    for (const [x, z, ry] of [[-20.97, 13.2, PI / 2], [20.97, -8.6, -PI / 2]] as V3[]) {
      const f = F(x, z, ry);
      f.pl(sign(["EXIT  >"], "#1f8a4a", "#ffffff", "", 128, 48), 0.6, 0.22, 0, 3.0, 0.01);
    }
    for (const x of [-15, -9, 9, 15]) { const f = F(x, 14.98, PI); f.pl(grateM, 0.8, 0.4, 0, 3.4, 0); }
    // wall clock
    put(blackM, xf(new THREE.CylinderGeometry(0.45, 0.45, 0.08, 32), 16.5, D + 4.8, 14.96, 0, PI / 2), 0);
    put(clockM, xf(new THREE.CircleGeometry(0.4, 32), 16.5, D + 4.8, 14.915, PI), 0);
  }

  // ======================= LOUNGERS =======================
  const loungerG = () => {
    const parts: THREE.BufferGeometry[] = [];
    for (const s of [-1, 1]) {
      parts.push(xf(boxGeo(0.045, 0.06, 1.3), s * 0.31, 0.33, 0.3));
      parts.push(xf(new THREE.CylinderGeometry(0.02, 0.02, 0.32, 8), s * 0.3, 0.16, 0.9));
      parts.push(xf(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 12), s * 0.3, 0.07, -0.3, 0, 0, PI / 2));
      parts.push(xf(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8), s * 0.3, 0.2, -0.3));
      parts.push(xf(boxGeo(0.04, 0.05, 0.75), s * 0.31, 0.62, -0.62, 0, -1.0));
    }
    for (let i = 0; i < 11; i++) parts.push(xf(boxGeo(0.6, 0.025, 0.085), 0, 0.36, -0.3 + i * 0.115));
    for (let i = 0; i < 6; i++) { const t = i * 0.12 + 0.04; parts.push(xf(boxGeo(0.6, 0.025, 0.085), 0, 0.36 + Math.sin(1.0) * t, -0.35 - Math.cos(1.0) * t, 0, -1.0)); }
    return mg(parts);
  };
  const lounger = (x: number, z: number, ry: number, c: string, towel = -1) => {
    inst("lounger", loungerG, tintM, { pos: [x, 0, z], rotY: ry, color: c });
    const f = F(x, z, ry);
    f.col(-0.35, 0.35, -0.8, 0.95, 0, 0.4);
    if (towel >= 0) {
      f.bx(towelM[towel], 0.55, 0.012, 0.9, 0, 0.385, 0.4);
      f.bx(towelM[towel], 0.55, 0.012, 0.25, 0, 0.35, 0.97, { rx: 1.2 });
    }
  };
  const lcols = ["#f4f4f1", "#f4f4f1", "#e9ecef", "#3a7fd0", "#2fa8a0"];
  for (let i = 0; i < 8; i++) {
    const x = -10.5 + i * 3;
    lounger(x, 6.9, PI + (r0() - 0.5) * 0.25, lcols[i % lcols.length], i % 3 === 0 ? i % 4 : -1);
  }
  for (let i = 0; i < 4; i++) lounger(17 + (i % 2) * 2.2 - 0.6, 8.3 + Math.floor(i / 2) * 2.6, PI / 2 + 0.1 * (i - 1.5), lcols[(i + 2) % lcols.length], i === 1 ? 2 : -1);
  for (let i = 0; i < 3; i++) lounger(17.5 + i * 1.3, -3.5, 0.05 * (i - 1), lcols[i + 1], i === 2 ? 3 : -1);
  // side tables between loungers
  for (let i = 0; i < 4; i++) {
    const x = -9 + i * 6;
    lat(whitePlM, [[0.0, 0], [0.12, 0], [0.04, 0.05], [0.03, 0.44], [0.24, 0.45], [0.25, 0.48], [0, 0.49]], x, 0, 7.4, 20);
    col(x - 0.25, x + 0.25, 7.15, 7.65, 0, 0.49);
    cy(tintM, 0.035, 0.03, 0.2, x + 0.08, 0.49, 7.4, 10); // bottle
    inst("sunglass", () => boxGeo(0.14, 0.02, 0.05), blackM, { pos: [x - 0.08, 0.5, 7.35] });
  }

  // ======================= LIFEGUARD CHAIR + DECK PROPS (south deck) =======================
  {
    const f = F(0.5, -6.6, 0); // faces +z (the pool)
    for (const [lx, lz] of [[-0.45, -0.45], [0.45, -0.45], [-0.35, 0.35], [0.35, 0.35]] as [number, number][]) f.rail(whitePlM, [[lx, 0, lz], [lx * 0.6, 1.75, lz * 0.5]], 0.04);
    for (let i = 1; i <= 5; i++) f.bx(whitePlM, 0.62 - i * 0.03, 0.04, 0.12, 0, i * 0.3, 0.35 - i * 0.07, { round: true });
    f.bx(whitePlM, 0.6, 0.08, 0.5, 0, 1.75, 0, { round: true });
    f.bx(redPlM, 0.55, 0.05, 0.45, 0, 1.83, 0, { round: true });
    f.bx(whitePlM, 0.6, 0.55, 0.06, 0, 1.85, -0.24, { round: true, rx: -0.15 });
    f.rail(whitePlM, [[-0.32, 1.8, 0.2], [-0.32, 2.1, 0.2], [-0.32, 2.1, -0.2]], 0.025);
    f.rail(whitePlM, [[0.32, 1.8, 0.2], [0.32, 2.1, 0.2], [0.32, 2.1, -0.2]], 0.025);
    f.cy(steelM, 0.02, 0.02, 1.2, -0.45, 1.8, -0.3, 8);
    // umbrella
    f.geo(redPlM, new THREE.ConeGeometry(0.9, 0.35, 16, 1, true), -0.45, 3.1, -0.3);
    f.pl(sign(["LIFEGUARD", "ON DUTY"], "#d12a22", "#ffffff", "cross", 256, 128), 0.6, 0.3, 0, 1.3, 0.47, 0, -0.35);
    f.col(-0.5, 0.5, -0.5, 0.5, 0, 1.88);
    // rescue tube leaning
    f.bx(redPlM, 0.12, 0.9, 0.08, 0.6, 0, 0.2, { round: true, rz: 0.15 });
  }
  // wet floor A-frame signs
  const wetSign = (x: number, z: number, ry: number) => {
    const f = F(x, z, ry);
    const wm = sign(["CAUTION", "WET FLOOR"], "#f2c21c", "#1a1a1a", "warn", 128, 192);
    f.bx(yellowPlM, 0.3, 0.62, 0.02, 0, 0.02, 0.12, { rx: -0.2 });
    f.bx(yellowPlM, 0.3, 0.62, 0.02, 0, 0.02, -0.12, { rx: 0.2 });
    f.pl(wm, 0.26, 0.4, 0, 0.35, 0.145, 0, -0.2);
    f.pl(wm, 0.26, 0.4, 0, 0.35, -0.145, PI, -0.2);
    f.col(-0.16, 0.16, -0.2, 0.2, 0, 0.64);
  };
  wetSign(-5.5, -6.4, 0.4);
  wetSign(13.5, -6.2, -0.3);
  wetSign(-14.2, 6.3, 1.2);
  // teal equipment chest (from the real map)
  {
    const f = F(7.2, -7.6, 0.08);
    f.bx(tealM, 2.0, 0.62, 0.9, 0, 0, 0, { round: true, solid: true });
    f.bx(tealM, 2.04, 0.06, 0.94, 0, 0.62, 0, { round: true });
    f.bx(steelM, 0.25, 0.04, 0.04, -0.5, 0.45, 0.46, { round: true });
    f.bx(steelM, 0.25, 0.04, 0.04, 0.5, 0.45, 0.46, { round: true });
    f.bx(darkSteelM, 2.02, 0.05, 0.92, 0, 0.0, 0);
    for (const s of [-1, 1]) f.bx(darkSteelM, 0.04, 0.12, 0.2, s * 1.01, 0.4, 0);
  }
  // metal shelving units with kit (from the real map)
  const shelfUnit = (x: number, z: number, ry: number, w = 1.6, seed = 1) => {
    const f = F(x, z, ry);
    const r = rng(seed);
    const d = 0.5, h = 1.9;
    for (const lx of [-w / 2, w / 2]) for (const lz of [-d / 2, d / 2]) f.bx(steelM, 0.035, h, 0.035, lx, 0, lz);
    for (let i = 0; i < 5; i++) {
      const y = 0.12 + i * 0.44;
      f.bx(steelM, w, 0.025, d, 0, y, 0);
      if (i === 4) continue;
      // contents
      let lx = -w / 2 + 0.08;
      while (lx < w / 2 - 0.2) {
        const t = r();
        if (t < 0.35) { // stacked kickboards
          const n = 3 + Math.floor(r() * 4), c = ["#2d6fd0", "#e8352a", "#f2c21c", "#39c24a"][Math.floor(r() * 4)];
          for (let j = 0; j < n; j++) inst("kick", () => boxGeo(0.3, 0.035, 0.45), tintM, { pos: [f.wx(lx + 0.16, 0), y + 0.03 + j * 0.037, f.wz(lx + 0.16, 0)], rotY: ry + (r() - 0.5) * 0.15, color: c });
          lx += 0.36;
        } else if (t < 0.55) { // plastic basket with balls
          f.bx(bluePlM, 0.36, 0.22, 0.34, lx + 0.18, y + 0.02, 0, { round: true });
          for (let j = 0; j < 3; j++) inst("smallBall", () => new THREE.SphereGeometry(0.08, 10, 8), tintM, { pos: [f.wx(lx + 0.08 + j * 0.1, (r() - 0.5) * 0.1), y + 0.25, f.wz(lx + 0.08 + j * 0.1, (r() - 0.5) * 0.1)], color: ["#f2c21c", "#e8352a", "#ffffff"][j] });
          lx += 0.4;
        } else if (t < 0.75) { // cardboard box
          const bw = 0.3 + r() * 0.15;
          f.bx(k.mat(null, "#b58a58", [1, 1], { roughness: 0.9 }), bw, 0.25 + r() * 0.1, 0.35, lx + bw / 2, y + 0.015, 0, { round: true });
          lx += bw + 0.05;
        } else { // pull buoys / goggles
          for (let j = 0; j < 4; j++) inst("buoy", () => new THREE.CapsuleGeometry(0.05, 0.12, 4, 8), tintM, { pos: [f.wx(lx + 0.05 + j * 0.08, 0), y + 0.08, f.wz(lx + 0.05 + j * 0.08, 0)], rotZ: PI / 2, rotY: ry + PI / 2, color: ["#ff7a1a", "#ffd23a", "#2d6fd0"][j % 3] });
          lx += 0.36;
        }
      }
    }
    f.col(-w / 2, w / 2, -d / 2, d / 2, 0, h + 0.05);
  };
  shelfUnit(-14.5, -8.55, 0, 1.6, 3);
  shelfUnit(2.0, -8.55, 0, 1.4, 5);
  // benches along the block front
  const bench = (x: number, z: number, ry: number, w = 1.8) => {
    const f = F(x, z, ry);
    for (let i = 0; i < 3; i++) f.bx(woodM, w, 0.035, 0.1, 0, 0.44, -0.13 + i * 0.13, { round: true });
    for (const lx of [-w / 2 + 0.15, w / 2 - 0.15]) {
      f.bx(steelM, 0.05, 0.42, 0.05, lx, 0, -0.12);
      f.bx(steelM, 0.05, 0.42, 0.05, lx, 0, 0.12);
      f.bx(steelM, 0.05, 0.04, 0.36, lx, 0.4, 0);
    }
    f.col(-w / 2, w / 2, -0.2, 0.2, 0, 0.48);
  };
  bench(-6.0, -8.6, 0, 2.2);
  bench(13.6, -8.6, 0, 1.8);
  // drinking fountain
  {
    const f = F(-12.0, -8.75, 0);
    f.bx(steelM, 0.45, 0.35, 0.35, 0, 0.6, 0, { round: true });
    f.lat(chromeM, [[0, 0], [0.15, 0], [0.16, 0.05], [0.02, 0.07], [0, 0.07]], 0, 0.95, 0.02);
    f.bx(darkSteelM, 0.1, 0.6, 0.1, 0, 0, -0.1);
    f.col(-0.25, 0.25, -0.2, 0.2, 0, 1.0);
  }
  // trash bins
  for (const [x, z] of [[0.2, -8.6], [15.2, -8.6], [-12.5, 8.4], [15.6, 14.3]] as [number, number][]) {
    lat(greenPlM, [[0, 0], [0.22, 0], [0.26, 0.85], [0.24, 0.86], [0, 0.86]], x, 0, z, 20);
    lat(darkSteelM, [[0, 0.86], [0.27, 0.86], [0.25, 0.92], [0.05, 0.94], [0, 0.94]], x, 0, z, 20);
    col(x - 0.26, x + 0.26, z - 0.26, z + 0.26, 0, 0.94);
  }
  // life ring stands
  for (const [x, z, ry] of [[-13.6, -5.9, 0], [13.6, 5.9, PI], [-13.6, 5.9, PI], [13.6, -5.9, 0]] as V3[]) {
    const f = F(x, z, ry);
    f.bx(whitePlM, 0.08, 1.5, 0.08, 0, 0, 0);
    f.bx(darkSteelM, 0.3, 0.04, 0.3, 0, 0, 0);
    f.geo(k.mat(k.tex("poRing", () => T.stripes(["#e8352a", "#ffffff", "#e8352a", "#ffffff"], true)), "#ffffff", [4, 1], { roughness: 0.4, bump: 0 }), new THREE.TorusGeometry(0.28, 0.07, 10, 24), 0, 1.2, 0.08);
    f.col(-0.15, 0.15, -0.15, 0.15, 0, 1.5);
  }
  // lane rope reel (west deck)
  {
    const f = F(-17.2, 5.7, 0);
    for (const s of [-1, 1]) {
      f.geo(darkSteelM, new THREE.TorusGeometry(0.62, 0.03, 8, 32), s * 0.7, 0.8, 0, PI / 2);
      f.rail(steelM, [[s * 0.75, 0, -0.5], [s * 0.75, 0.8, 0], [s * 0.75, 0, 0.5]], 0.03);
    }
    f.cy(steelM, 0.05, 0.05, 1.6, 0, 0.8, 0, 10, { rz: PI / 2 });
    // wound rope: stacked float rings
    for (let i = 0; i < 12; i++) inst("reelRing", () => new THREE.CylinderGeometry(0.5, 0.5, 0.1, 24, 1, true), tintM, { pos: [f.wx(-0.6 + i * 0.11, 0), 0.8, f.wz(-0.6 + i * 0.11, 0)], rotZ: PI / 2, color: i % 4 < 2 ? "#1f4fc0" : "#f2f2f2" });
    f.cy(darkSteelM, 0.08, 0.08, 0.06, 0.7, 0.05, 0.4, 10, { rx: PI / 2 });
    f.col(-0.8, 0.8, -0.55, 0.55, 0, 1.45);
  }
  // potted palms by the windows
  const frondM = k.mat(k.tex("leaves", T.leaves), "#5f9a44", [1, 1], { roughness: 0.75, bump: 0.5 });
  frondM.m.side = THREE.DoubleSide;
  const palm = (x: number, z: number, s = 1) => {
    lat(k.mat(null, "#e4ddd0", [1, 1], { roughness: 0.6 }), [[0, 0], [0.3 * s, 0], [0.38 * s, 0.55 * s], [0.4 * s, 0.6 * s], [0.34 * s, 0.6 * s], [0.34 * s, 0.52 * s], [0, 0.52 * s]], x, 0, z, 20);
    tb(k.mat(null, "#7a5a3a", [1, 1], { roughness: 0.9 }), [[x, 0.5 * s, z], [x + 0.08, 1.2 * s, z + 0.05], [x + 0.05, 1.9 * s, z]], 0.05 * s, 12);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * PI * 2 + r0() * 0.3, droop = 0.35 + r0() * 0.4, L = (0.9 + r0() * 0.3) * s;
      const g = new THREE.PlaneGeometry(0.34 * s, L, 2, 6);
      g.translate(0, L / 2, 0);
      const pp = g.attributes.position;
      for (let v = 0; v < pp.count; v++) { const t = pp.getY(v) / L; pp.setZ(v, t * t * droop * L * 1.4 - Math.abs(pp.getX(v)) * 0.6); pp.setX(v, pp.getX(v) * Math.sin(Math.PI * Math.min(1, t * 1.15 + 0.08))); }
      g.computeVertexNormals();
      put(frondM, xf(g, x + 0.05, Y0 + 1.9 * s, z, Math.atan2(Math.cos(a), Math.sin(a)), PI / 2 - 0.55), 0);
    }
    col(x - 0.35 * s, x + 0.35 * s, z - 0.35 * s, z + 0.35 * s, 0, 1.9 * s);
  };
  palm(20.2, -7.4, 1.1);
  palm(20.2, 13.8, 1.2);
  palm(14.2, 14.2, 1.0);
  palm(-20.2, 14.2, 1.1);
  // kids pool extras: "KIDS POOL - 0.5 m" sign + toys
  pl(sign(["KIDS POOL", "0.5 m"], "#f2c21c", "#1f4fa8", "swim", 256, 128), 1.2, 0.6, 17, 1.8, 14.99, PI);
  // hanging towels on a drying rack (east deck)
  {
    const f = F(19.2, -1.2, PI / 2);
    f.rail(chromeM, [[-0.8, 0, 0], [-0.8, 1.2, 0], [0.8, 1.2, 0], [0.8, 0, 0]], 0.02);
    f.rail(chromeM, [[-0.8, 0.8, 0], [0.8, 0.8, 0]], 0.015);
    for (let i = 0; i < 3; i++) { f.bx(towelM[(i + 1) % 4], 0.45, 0.02, 0.9, -0.5 + i * 0.5, 1.2 - 0.45, 0.0, { rx: PI / 2 }); }
    f.col(-0.85, 0.85, -0.25, 0.25, 0, 1.25);
  }
  // puddles and wet footprints across the deck
  {
    const disc = () => new THREE.CircleGeometry(1, 20);
    const r = rng(77);
    for (let i = 0; i < 26; i++) {
      let x: number, z: number;
      const side = i % 4;
      if (side === 0) { x = -20 + r() * 40; z = -8.6 + r() * 3.2; }
      else if (side === 1) { x = -20 + r() * 40; z = 5.6 + r() * 2.4; }
      else if (side === 2) { x = -20.5 + r() * 7.5; z = -4.5 + r() * 9; }
      else { x = 12.9 + r() * 1.4; z = -4.5 + r() * 9; }
      inst("puddle", disc, puddleM, { pos: [x, 0.004, z], rotX: -PI / 2, scale: [0.3 + r() * 0.9, 0.2 + r() * 0.6, 1], rotY: r() * PI }, true);
    }
    for (let i = 0; i < 30; i++) {
      const t = i / 30, x = -12 + t * 24, z = -5.9 + ((i % 2) - 0.5) * 0.18 + Math.sin(t * 6) * 0.3;
      inst("foot", disc, puddleM, { pos: [x, 0.005, z], rotX: -PI / 2, scale: [0.12, 0.05, 1] }, true);
    }
  }

  // ======================= SCOREBOARD (west wall) =======================
  {
    bx(blackM, 0.2, 3.2, 6.4, -20.9, 3.3, 8.6);
    pl(scoreM, 6.0, 3.0, -20.79, 3.3 + 1.6, 8.6, PI / 2);
    pl(sign(["POOL RULES", "No running  -  No diving", "Shower before swimming", "Children under 8 must be", "with an adult"], "#f4f4f1", "#1f3f8f", "", 256, 256), 1.3, 1.3, -6, 1.75, -8.895, 0);
    pl(sign(["DEEP END", "1.9 m"], "#1f4fa8", "#ffffff", "", 256, 128), 1.6, 0.8, 20.99 - 0.02, 7.2 - D, -4.5, -PI / 2);
    pl(sign(["SHALLOW END", "1.1 m"], "#1f4fa8", "#ffffff", "", 256, 128), 1.6, 0.8, -20.98, 1.9, 13.2, PI / 2);
  }

  // ======================= CHANGING BLOCK =======================
  {
    const ZF = -9; // front wall line
    const front: [number, number][] = [[-17, 1.6], [-9.5, 2.2], [-2.5, 1.6], [4.5, 1.6], [11, 1.4], [17.5, 3.0]];
    // front wall with openings; lower tile, upper paint
    let cur = -21;
    for (const [c, w] of front) {
      wallSeg("x", ZF, cur, c - w / 2, 0, BH, wallBandM, 0.2);
      wallSeg("x", ZF, c - w / 2, c + w / 2, 2.3, BH, paintM, 0.2);
      // door frame
      for (const s of [-1, 1]) bx(steelM, 0.06, 2.3, 0.24, c + s * (w / 2 + 0.03), 0, ZF);
      bx(steelM, w + 0.12, 0.06, 0.24, c, 2.3, ZF);
      cur = c + w / 2;
    }
    wallSeg("x", ZF, cur, 21, 0, BH, wallBandM, 0.2);
    // office window into the deck
    // partitions
    const parts: [number, number | null][] = [[-13, null], [-6, null], [1, null], [8, null], [14, null]];
    for (const [x] of parts) wallSeg("z", x, -15, ZF, 0, BH, showerTileM, 0.16);
    // block ceiling / mezzanine roof slab
    bx(ceilM, 42, 0.2, 6.2, 0, BH, -12);
    col(-21, 21, -15, ZF - 0.1, BH, BH + 0.2, true);
    bx(deckM, 42, 0.02, 6.2, 0, BH + 0.2, -12);
    bx(paintBlueM, 42.2, 0.25, 0.25, 0, BH - 0.05, ZF - 0.02);
    // mezzanine railing
    for (let x = -19.1; x <= 20.81; x += 1.3) cy(chromeM, 0.025, 0.025, 1.05, x, BH + 0.2, ZF + 0.08, 8);
    tb(chromeM, [[-19.1, BH + 1.25, ZF + 0.08], [20.8, BH + 1.25, ZF + 0.08]], 0.035, 4);
    tb(chromeM, [[-19.1, BH + 0.7, ZF + 0.08], [20.8, BH + 0.7, ZF + 0.08]], 0.02, 4);
    bx(glassM, 39.9, 0.9, 0.02, 0.85, BH + 0.3, ZF + 0.08, { unit: 0 });
    col(-19.1, 21, ZF, ZF + 0.18, BH + 0.2, BH + 1.25, true);
    // room ceiling lights (the two point lights for the block sit at these panels)
    const panelLight = (x: number, z: number, w = 1.2) => {
      bx(whitePlM, w + 0.08, 0.06, 0.38, x, BH - 0.06, z);
      bx(tubeLightM, w, 0.02, 0.3, x, BH - 0.075, z);
    };
    // signs over doors
    const overDoor = (x: number, lines: string[], icon: string, bg = "#1f4fa8") => pl(sign(lines, bg, "#ffffff", icon, 256, 96), 1.5, 0.56, x, 2.7, ZF + 0.105);
    overDoor(-17, ["MEN"], "man");
    overDoor(-9.5, ["SHOWERS"], "swim");
    overDoor(-2.5, ["WOMEN"], "woman", "#b8306a");
    overDoor(4.5, ["STAFF", "STORAGE"], "", "#555b62");
    overDoor(11, ["FIRST AID"], "cross", "#1f8a4a");
    overDoor(17.5, ["ENTRANCE"], "", "#1f4fa8");
    pl(sign(["PLEASE SHOWER", "BEFORE SWIMMING"], "#f4f4f1", "#1f4fa8", "", 256, 96), 1.3, 0.5, -11.4, 1.6, ZF + 0.105);

    const lockers = (x1: number, x2: number, zBack: number, ci: number, dir = 1) => {
      const bw = 1.6;
      for (let x = x1; x + bw <= x2 + 0.01; x += bw) {
        bx(lockerBodyM[ci], bw - 0.02, 1.85, 0.5, x + bw / 2, 0.1, zBack + dir * 0.25);
        pl(lockerTex[ci], bw - 0.04, 1.8, x + bw / 2, 0.1 + 0.93, zBack + dir * 0.502, dir > 0 ? 0 : PI);
        bx(darkSteelM, bw, 0.1, 0.46, x + bw / 2, 0, zBack + dir * 0.25);
        col(x, x + bw, Math.min(zBack, zBack + dir * 0.5), Math.max(zBack, zBack + dir * 0.5), 0, 1.95);
      }
    };
    const vanity = (x1: number, x2: number, z: number, dir: number) => {
      // counter with basins along a partition (z runs), dir = facing direction (+x or −x)
      const cx = x1;
      bx(k.mat(k.tex("poCounter", () => T.marble("#e8e6e0", "#9a968c", 9)), "#ffffff", [1, 1], { roughness: 0.2, bump: 0.2 }), 0.55, 0.06, x2 - z, cx + dir * 0.28, 0.82, (x2 + z) / 2, { unit: 1 });
      col(cx, cx + dir * 0.55, z, x2, 0, 0.88, true);
      for (let zz = z + 0.6; zz < x2 - 0.3; zz += 1.0) {
        lat(ceramicM, [[0, 0.62], [0.08, 0.62], [0.2, 0.7], [0.22, 0.86], [0.2, 0.86], [0.18, 0.72], [0, 0.66]], cx + dir * 0.28, 0.0, zz, 20);
        cy(chromeM, 0.015, 0.015, 0.22, cx + dir * 0.06, 0.88, zz, 8);
        cy(chromeM, 0.012, 0.012, 0.14, cx + dir * 0.12, 1.06, zz, 8, { rz: PI / 2 });
        cy(darkSteelM, 0.03, 0.03, 0.6, cx + dir * 0.28, 0.0, zz, 8);
      }
      bx(mirrorM, 0.02, 1.0, x2 - z - 0.2, cx + dir * 0.02, 1.15, (x2 + z) / 2);
    };
    // --- Men's changing (x -21..-13) ---
    k.room("Men's Changing Room", -21, -13, -15, -9);
    lockers(-20.8, -14.4, -15, 0);
    bench(-17, -12.2, 0, 3.0);
    bench(-17, -10.5, 0, 2.2);
    vanity(-13.1, -9.6, -14.6, -1);
    for (let i = 0; i < 6; i++) { cy(chromeM, 0.012, 0.012, 0.1, -20.95, 1.65, -13.5 + i * 0.6, 6, { rz: PI / 2 }); if (i % 2 === 0) bx(towelM[i % 4], 0.03, 0.8, 0.4, -20.9, 0.9, -13.5 + i * 0.6); }
    bx(rubberM, 3.5, 0.01, 1.0, -17, 0, -11.35, { unit: 0.5 });
    bx(whitePlM, 0.3, 0.3, 0.2, -20.8, 1.4, -10, { round: true }); // hair dryer box
    panelLight(-17, -12);
    // --- Showers (x -13..-6) ---
    k.room("Showers", -13, -6, -15, -9);
    bx(showerTileM, 6.8, 2.8, 0.05, -9.5, 0, -14.93);
    for (let i = 0; i < 5; i++) {
      const x = -12.3 + i * 1.4;
      rail(chromeM, [[x, 1.0, -14.88], [x, 2.1, -14.88], [x, 2.15, -14.6]], 0.02);
      lat(chromeM, [[0, 0], [0.04, 0.02], [0.09, 0.07], [0.09, 0.08], [0, 0.08]], x, 2.05, -14.55, 16);
      cy(chromeM, 0.035, 0.035, 0.05, x, 1.1, -14.86, 12, { rx: PI / 2 });
      bx(whitePlM, 0.1, 0.2, 0.06, x + 0.35, 1.25, -14.88, { round: true }); // soap dispenser
      if (i < 4) { bx(showerTileM, 0.06, 1.9, 0.9, x + 0.7, 0.1, -14.5); col(x + 0.67, x + 0.73, -14.95, -14.05, 0, 2.0); }
      bx(grateM, 0.3, 0.005, 0.3, x, 0, -14.1, { unit: 0.25 });
    }
    bx(puddleM, 5.4, 0.004, 1.8, -9.5, 0, -13.8, { unit: 0 });
    panelLight(-9.5, -12, 1.6);
    // shower room life: bench, towel cart, shampoo bottles on a ledge, hanging towels
    bench(-12.55, -11.6, PI / 2, 2.0);
    bx(chromeM, 6.6, 0.03, 0.14, -9.5, 1.25, -14.84);
    for (let i = 0; i < 16; i++) inst("bottle", () => mg([new THREE.CylinderGeometry(0.03, 0.035, 0.18, 10).translate(0, 0.09, 0), new THREE.CylinderGeometry(0.012, 0.012, 0.05, 6).translate(0, 0.2, 0)]), tintM,
      { pos: [-12.7 + i * 0.4 + (r0() - 0.5) * 0.1, 1.28, -14.83], rotY: r0(), color: ["#e8435a", "#2d8fe0", "#f2c21c", "#ffffff", "#39c24a"][i % 5] });
    {
      const f = F(-7.1, -11.2, 0.3);
      f.rail(chromeM, [[-0.4, 0.15, -0.25], [-0.4, 0.95, -0.25], [0.4, 0.95, -0.25], [0.4, 0.15, -0.25]], 0.015);
      f.bx(k.mat(null, "#d9dde0", [1, 1], { roughness: 0.8 }), 0.8, 0.5, 0.5, 0, 0.35, 0, { round: true });
      for (let i = 0; i < 4; i++) f.bx(towelM[i], 0.36, 0.08, 0.3, -0.18 + (i % 2) * 0.36, 0.85 + Math.floor(i / 2) * 0.08, 0, { round: true });
      for (const [lx, lz] of [[-0.35, -0.2], [0.35, -0.2], [-0.35, 0.2], [0.35, 0.2]] as [number, number][]) f.geo(darkSteelM, new THREE.SphereGeometry(0.04, 8, 6), lx, 0.05, lz);
      f.col(-0.45, 0.45, -0.3, 0.3, 0, 1.0);
    }
    // --- Women's changing (x -6..1) ---
    k.room("Women's Changing Room", -6, 1, -15, -9);
    lockers(-5.8, 0.6, -15, 2);
    bench(-2.5, -12.0, 0, 3.0);
    vanity(0.92, -9.8, -14.3, -1);
    vanity(-5.92, -9.8, -14.3, 1);
    for (let i = 0; i < 3; i++) {
      const z = -13.6 + i * 1.0;
      lat(redPlM, [[0, 0], [0.16, 0], [0.12, 0.05], [0.04, 0.3], [0.17, 0.46], [0.18, 0.5], [0, 0.5]], -5.0, 0, z, 16);
      col(-5.18, -4.82, z - 0.18, z + 0.18, 0, 0.5);
    }
    bx(rubberM, 3.5, 0.01, 1.0, -2.5, 0, -11.2, { unit: 0.5 });
    bx(towelM[3], 0.5, 0.12, 0.4, -1.8, 0.48, -12.0, { round: true });
    bx(towelM[1], 0.45, 0.1, 0.35, -1.8, 0.6, -12.0, { round: true });
    // --- Storage (x 1..8) ---
    k.room("Equipment Storage", 1, 8, -15, -9);
    shelfUnit(2.2, -14.6, 0, 1.8, 11);
    shelfUnit(5.0, -14.6, 0, 1.8, 12);
    shelfUnit(7.55, -12.6, -PI / 2, 1.8, 13);
    for (let i = 0; i < 4; i++) {
      const x = 1.6 + i * 0.62;
      lat(bluePlM, [[0, 0], [0.26, 0], [0.28, 0.1], [0.26, 0.2], [0.28, 0.5], [0.26, 0.6], [0.28, 0.78], [0.2, 0.8], [0.2, 0.84], [0, 0.84]], x, 0, -10.2, 20);
      col(x - 0.28, x + 0.28, -10.48, -9.92, 0, 0.84);
    }
    pl(sign(["CHLORINE", "HANDLE WITH CARE"], "#f2c21c", "#1a1a1a", "warn", 256, 96), 1.0, 0.38, 2.6, 1.4, -9.22, PI);
    // noodle bin
    lat(greenPlM, [[0, 0], [0.34, 0], [0.36, 0.7], [0.33, 0.7], [0.33, 0.05], [0, 0.05]], 4.8, 0, -11.2, 20);
    for (let i = 0; i < 9; i++) { const a = i * 0.9, rr = 0.08 + (i % 3) * 0.08; inst("noodleUp", () => new THREE.CylinderGeometry(0.035, 0.035, 1.5, 10), tintM, { pos: [4.8 + Math.cos(a) * rr, 0.75, -11.2 + Math.sin(a) * rr], rotX: (r0() - 0.5) * 0.25, rotZ: Math.cos(a) * 0.15, color: ["#ff5aa0", "#39c24a", "#ffb31a", "#2d8fe0"][i % 4] }); }
    col(4.44, 5.16, -11.56, -10.84, 0, 1.5);
    // mop bucket
    lat(yellowPlM, [[0, 0.08], [0.2, 0.08], [0.23, 0.36], [0.2, 0.36], [0.18, 0.1], [0, 0.1]], 6.6, 0, -10.0, 16);
    cy(steelM, 0.015, 0.015, 1.3, 6.6, 0.2, -10.0, 6, { rz: 0.15 });
    // --- Lifeguard office / first aid (x 8..14) ---
    k.room("First Aid", 8, 14, -15, -9);
    {
      const f = F(11, -14.3, 0);
      f.bx(woodM, 1.6, 0.04, 0.7, 0, 0.74, 0, { round: true });
      for (const lx of [-0.75, 0.75]) f.bx(steelM, 0.04, 0.74, 0.65, lx, 0, 0);
      f.col(-0.8, 0.8, -0.35, 0.35, 0, 0.78);
      f.bx(blackM, 0.55, 0.34, 0.03, 0, 1.0, -0.15, { round: true });
      f.bx(k.mat(null, "#2a5f8f", [1, 1], { roughness: 0.2, emissive: "#6aa0e0", emissiveIntensity: 0.6 }), 0.5, 0.29, 0.005, 0, 1.025, -0.13);
      f.bx(darkSteelM, 0.05, 0.2, 0.05, 0, 0.78, -0.17);
      f.bx(whitePlM, 0.4, 0.02, 0.14, 0, 0.78, 0.12, { round: true });
      // chair
      f.cy(darkSteelM, 0.03, 0.03, 0.4, 0, 0, 0.7, 8);
      f.bx(blackM, 0.46, 0.08, 0.46, 0, 0.42, 0.7, { round: true });
      f.bx(blackM, 0.46, 0.5, 0.06, 0, 0.55, 0.95, { round: true });
      f.col(-0.25, 0.25, 0.45, 0.95, 0, 1.0);
    }
    bx(whitePlM, 0.8, 0.6, 0.2, 13.8, 1.3, -12, { round: true, ry: PI / 2 });
    pl(sign(["+"], "#ffffff", "#d12a22", "", 128, 128), 0.3, 0.3, 13.69, 1.62, -12, -PI / 2);
    bx(k.mat(null, "#f06a1c", [1, 1], { roughness: 0.5 }), 0.05, 1.8, 0.45, 8.12, 0.5, -12.5); // spine board
    bx(k.mat(null, "#d9d9d6", [1, 1], { roughness: 0.6 }), 0.7, 0.5, 1.9, 13.25, 0, -11.2, { solid: true, round: true }); // first-aid bed
    bx(k.mat(null, "#e9f1f4", [1, 1], { roughness: 0.9 }), 0.65, 0.1, 1.8, 13.25, 0.5, -11.2, { round: true });
    panelLight(11, -12);
    // --- Entrance lobby (x 14..21) ---
    k.room("Entrance Lobby", 14, 21, -15, -9);
    {
      // reception counter along the partition
      const f = F(14.75, -12.9, PI / 2); // front faces +x
      f.bx(woodM, 2.6, 1.05, 0.55, 0, 0, 0, { round: true });
      f.bx(k.mat(null, "#f4f4f1", [1, 1], { roughness: 0.25 }), 2.7, 0.05, 0.7, 0, 1.05, 0.05, { round: true });
      f.bx(bluePlM, 2.62, 0.14, 0.02, 0, 0.75, 0.28);
      f.pl(sign(["TICKETS"], "#1f4fa8", "#ffffff", "", 256, 96), 0.9, 0.34, 0, 0.55, 0.285);
      f.bx(blackM, 0.35, 0.25, 0.03, 0.6, 1.1, -0.1, { round: true, rx: -0.2 });
      f.col(-1.3, 1.3, -0.3, 0.4, 0, 1.1);
      // vending machines against the east wall
      for (const [z, m] of [[-13.9, vendM], [-12.9, vendM]] as [number, Mat][]) {
        bx(k.mat(null, "#1d4fa0", [1, 1], { roughness: 0.35, metalness: 0.3 }), 0.8, 1.9, 0.85, 20.55, 0, z, { round: true, solid: true, ry: 0 });
        pl(m, 0.55, 1.4, 20.14, 1.1, z - 0.05, -PI / 2);
        bx(blackM, 0.03, 0.2, 0.5, 20.13, 0.25, z);
      }
      // entrance glass doors (south wall), bright daylight outside
      pl(dayM, 2.8, 2.3, 17.5, 1.15, -14.84);
      bx(glassM, 2.8, 2.3, 0.03, 17.5, 0, -14.8, { unit: 0 });
      for (const x of [16.1, 17.5, 18.9]) bx(steelM, 0.08, 2.3, 0.08, x, 0, -14.8);
      bx(steelM, 2.9, 0.1, 0.1, 17.5, 2.3, -14.8);
      for (const x of [17.1, 17.9]) bx(chromeM, 0.03, 0.6, 0.03, x, 0.8, -14.74);
      pl(sign(["EXIT"], "#1f8a4a", "#ffffff", "", 128, 64), 0.5, 0.25, 17.5, 2.7, -14.84);
      bx(rubberM, 2.6, 0.012, 1.6, 17.5, 0, -14, { unit: 0.5 });
      // framed real painting
      const pi = pickPainting(1.25, new Set(), 7);
      const pm = k.mat(realPaintingTex(pi), "#ffffff", [1, 1], { roughness: 0.6, bump: 0 });
      const P = PAINTINGS[pi];
      const ph = 1.0, pw = Math.min(1.8, (ph * P.w) / P.h);
      bx(k.mat(null, "#2b2b2b", [1, 1], { roughness: 0.4 }), 0.05, ph + 0.12, pw + 0.12, 20.975, 1.1, -10.4);
      pl(pm, pw, ph, 20.945, 1.1 + (ph + 0.12) / 2, -10.4, -PI / 2);
      // waiting bench + plant
      bench(20.5, -11.4, -PI / 2, 1.4);
      panelLight(17.5, -12, 1.6);
      // turnstiles into the pool hall + timetable board + plant + umbrella stand
      for (const x of [15.3, 19.7]) {
        bx(steelM, 0.22, 0.95, 0.9, x, 0, -10.3, { round: true, solid: true });
        bx(blackM, 0.2, 0.04, 0.2, x, 0.95, -10.55, { round: true });
        for (let j = 0; j < 3; j++) cy(chromeM, 0.018, 0.018, 0.5, x + 0.26, 0.8, -10.3, 8, { ry: j * 2.09, rz: PI / 2 });
      }
      pl(sign(["OPENING HOURS", "Mon-Fri  6:00 - 22:00", "Sat-Sun  8:00 - 20:00", "Lane swim  6:00 - 9:00", "Kids splash 14:00 - 17:00"], "#f4f4f1", "#1f3f8f", "", 256, 256), 1.2, 1.2, 14.12, 1.7, -10.4, PI / 2);
      bx(woodM, 0.04, 1.3, 1.3, 14.09, 1.05, -10.4);
      lat(k.mat(null, "#3a3f45", [1, 1], { roughness: 0.4 }), [[0, 0], [0.15, 0], [0.17, 0.55], [0.14, 0.56], [0.13, 0.05], [0, 0.05]], 20.4, 0, -9.5, 14);
      for (let j = 0; j < 3; j++) cy(tintM, 0.02, 0.02, 0.85, 20.4 + (j - 1) * 0.05, 0.1, -9.5 + (j % 2) * 0.05, 6);
      col(20.2, 20.6, -9.7, -9.3, 0, 0.6);
    }
    // --- mezzanine props (roof of the changing block) ---
    Y0 = D + BH + 0.2;
    for (let i = 0; i < 3; i++) {
      const x = -8 + i * 7;
      for (let j = 0; j < 6; j++) inst("stackChair", () => mg([xf(boxGeo(0.45, 0.04, 0.42), 0, 0.45, 0), xf(boxGeo(0.45, 0.38, 0.04), 0, 0.7, -0.2, 0, -0.1), ...[-0.2, 0.2].flatMap((a) => [-0.18, 0.18].map((b) => xf(new THREE.CylinderGeometry(0.012, 0.012, 0.45, 6), a, 0.22, b)))]), tintM, { pos: [x, j * 0.06, -12.4], rotY: 0.05 * j, color: ["#2d6fd0", "#e8e8e4", "#e8352a"][i] });
      col(x - 0.25, x + 0.25, -12.65, -12.15, 0, 1.2);
    }
    bx(k.mat(null, "#b58a58", [1, 1], { roughness: 0.9 }), 0.6, 0.5, 0.5, 12.2, 0, -13.8, { round: true, solid: true });
    bx(k.mat(null, "#a57a48", [1, 1], { roughness: 0.9 }), 0.5, 0.4, 0.45, 12.25, 0.5, -13.8, { round: true, solid: true });
    bx(k.mat(null, "#b58a58", [1, 1], { roughness: 0.9 }), 0.6, 0.5, 0.5, 12.9, 0, -13.6, { round: true, solid: true });
    lounger(-15, -12.5, PI / 2, "#3a7fd0", 0);
    lounger(4, -12.8, PI / 2 + 0.1, "#f4f4f1");
    palm(19.6, -13.9, 0.9);
    Y0 = D;
  }

  // ======================= STAIRS TO THE MEZZANINE (west wall) =======================
  {
    const n = 16, rise = (BH + 0.2) / n, run = 0.3;
    const x = -19.9, w = 1.4;
    for (let i = 0; i < n; i++) {
      const z = -3.6 - i * run - run / 2;
      bx(deckM, w, rise * (i + 1), run, x, 0, z, { unit: 1 });
      bx(edgeBlueM, w, 0.02, 0.05, x, rise * (i + 1) - 0.01, z + run / 2 - 0.025);
      col(x - w / 2, x + w / 2, z - run / 2, z + run / 2, 0, rise * (i + 1), true);
    }
    bx(deckM, w, BH + 0.2, 0.62, x, 0, -8.7, { unit: 1 });
    col(x - w / 2, x + w / 2, -9.0, -8.39, 0, BH + 0.2, true);
    rail(chromeM, [[x + w / 2, 0.95, -3.6], [x + w / 2, BH + 1.15, -3.6 - n * run], [x + w / 2, BH + 1.15, -9.0]], 0.03);
    for (let i = 0; i <= 4; i++) { const t = i / 4; cy(chromeM, 0.02, 0.02, 0.95, x + w / 2, rise * n * t, -3.6 - n * run * t, 6); }
  }

  // ======================= READABLE NOTES: lane rules, lost & found, a letter on the bench =======================
  {
    Y0 = D;
    const noteCache = new Map<string, Mat>();
    const note = (title: string, lines: string[], paper = "#fbf8ee", ink = "#1f2a50", w = 256, h = 256, ruled = true) => {
      const key = title + lines.join("|") + paper;
      let m = noteCache.get(key);
      if (!m) noteCache.set(key, (m = k.mat(k.tex(`poNote${key}`, () => PT.poNote(title, lines, paper, ink, w, h, ruled)), "#ffffff", [1, 1], { roughness: 0.85, bump: 0 })));
      return m;
    };
    // lane rules board on the block front
    bx(bluePlM, 1.2, 1.2, 0.04, -0.6, 1.15, -8.9 + 0.02);
    pl(note("LANE RULES", ["Swim anticlockwise - keep right", "Lane 1-2 SLOW   3 MEDIUM", "Lane 4-5 FAST", "Overtake only at the wall", "Do not hang on lane ropes", "Rest at the end, not mid-lane"], "#f4f6fb", "#1f3f8f", 256, 256, false), 1.1, 1.1, -0.6, 1.75, -8.855);
    // lost & found cork board in the lobby
    const cork = k.mat(k.tex("poCork", () => T.noise("#b48a58", 0.18, 21, 2400)), "#ffffff", [1, 1], { roughness: 0.95, bump: 0.8 });
    bx(woodM, 1.34, 1.0, 0.04, 20.1, 1.0, -9.13);
    bx(cork, 1.24, 0.9, 0.02, 20.1, 1.05, -9.155);
    pl(sign(["LOST & FOUND"], "#d12a22", "#ffffff", "", 256, 64), 0.8, 0.2, 20.1, 1.88, -9.168, PI);
    const pinned: [string, string[], string, number, number, number][] = [
      ["LOST", ["Blue goggles, lane 3", "Tuesday evening", "- ask at reception"], "#fff6a8", 19.75, 1.55, 0.08],
      ["FOUND", ["Pink swim ring", "(kids pool)", "Is it yours?"], "#ffd6e4", 20.4, 1.58, -0.1],
      ["LOST KEY", ["Silver locker key #27", "Please return to", "Tom Kodner", "Thank you!"], "#e6f3ff", 19.8, 1.18, -0.06],
      ["FOUND", ["Grey hoodie, size M", "Men's changing room"], "#ffffff", 20.45, 1.2, 0.12],
    ];
    for (const [t, l, c, x, y, rz] of pinned) {
      put(note(t, l, c, "#1f2a50", 256, 256, false), xf(new THREE.PlaneGeometry(0.34, 0.34), x, Y0 + y, -9.17, PI, 0, rz), 0);
      sph(redPlM, 0.015, x, y + 0.15, -9.18, 1, 1, 0.6, 8);
    }
    // a thank-you letter left on the deck bench
    put(note("", ["Dear Coach Anna,", "thank you for teaching", "me to swim! I can do", "25 m now without", "the noodle :)", "   love, Mia (age 7)"], "#ffffff", "#2a3a8a"), xf(new THREE.PlaneGeometry(0.21, 0.28), -5.5, D + 0.482, -8.62, 0.35, -PI / 2), 0);
    put(whitePlM, xf(new THREE.PlaneGeometry(0.11, 0.07), -5.72, D + 0.481, -8.52, -0.2, -PI / 2), 0); // envelope
    // lifeguard notice by the first aid door
    pl(note("LIFEGUARD ROTA", ["Mon  Anna / Kenji", "Tue  Sam / Priya", "Wed  Anna / Luca", "Thu  Kenji / Sam", "Fri  Priya / Luca", "Weekend: all hands!"], "#fbf8ee", "#1f2a50", 256, 256, true), 0.5, 0.5, 12.3, 1.5, -8.885);
  }

  // ======================= ROOMS =======================
  k.room("Pool Deck", -21, 21, -9, 15);
  k.room("Main Pool", -PX, PX, -PZ, PZ);
  k.room("Kids Pool", KX1, KX2, KZ1, KZ2);
  k.room("Spectator Stands", -12, 12, 8.7, 15);

  // ======================= FLUSH =======================
  for (const [m, list] of batches) { const me = k.merged(list, m); if (m === ductM || m === beamM) me.castShadow = false; }
  for (const [, e] of instLists) k.instances(e.geo, e.m, e.list, { noShadow: e.noShadow });

  const hunters: THREE.Vector3[] = [];
  for (let i = 0; i < 9; i++) hunters.push(new THREE.Vector3(16.4 + (i % 3) * 1.15, 0, -13.2 + Math.floor(i / 3) * 1.1));
  const hiders: THREE.Vector3[] = [];
  for (let i = 0; i < 24; i++) hiders.push(new THREE.Vector3(-18.2 + (i % 4) * 1.15, 0, -4.0 + Math.floor(i / 4) * 1.5));

  return k.finish({
    id: "pool", name: "Swimming Pool",
    bounds: { minX: -20.9, maxX: 20.9, minZ: -14.8, maxZ: 14.9 },
    hunterSpawns: hunters, hiderSpawns: hiders,
    preview: { pos: [-18.5, 5.6, -8.4], look: [6, 0.2, 4], fov: 62 },
    lighting: {
      sky: "#d8e6ee",
      hemi: ["#f4f8ff", "#8aa0a8", 0.8],
      sun: { color: "#fff2dc", int: 2.4, pos: [18, 24, 8] },
      points: [
        { pos: [LAMPS[0][0], LAMPS[0][1] + 0.0, LAMPS[0][2]], color: "#fff4e4", int: 34, dist: 22 },
        { pos: [LAMPS[1][0], LAMPS[1][1], LAMPS[1][2]], color: "#fff4e4", int: 34, dist: 22 },
        { pos: [LAMPS[2][0], LAMPS[2][1], LAMPS[2][2]], color: "#fff4e4", int: 30, dist: 20 },
        { pos: [LAMPS[3][0], LAMPS[3][1], LAMPS[3][2]], color: "#fff4e4", int: 30, dist: 20 },
        { pos: [-9.5, D + BH - 0.08, -12], color: "#eef4ff", int: 12, dist: 13 },
        { pos: [17.5, D + BH - 0.08, -12], color: "#eef4ff", int: 12, dist: 12 },
      ],
      exposure: 1.05,
      env: 0.55,
      hdri: "hall",
    },
  });
}
