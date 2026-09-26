// Hot Spring Inn — a traditional onsen ryokan at dusk.
// South: gravel forecourt behind a tiled tsuiji wall (hunters arrive here), entrance with noren, genkan with a stone
// doma, shoe boxes, slippers, reception counter and a gold byobu. Centre: a lantern-lit wooden corridor. West wing:
// three tatami guest rooms (low tables, zabuton, zaisu, tokonoma with scrolls, futon stacks, andon) and a souvenir shop.
// East wing: game corner (ping-pong, vending machines, arcade cabinet), changing room (lockers, basket shelves, vanity,
// massage chair) and the indoor hinoki bath with wash stations, buckets and stools. North: the engawa veranda along the
// garden (koi pond with a bridge, maples, pines, stone lanterns, bamboo grove, dry gravel garden, red nodate bench) and,
// behind a bamboo fence, the rotenburo — a steaming rock bath with a bamboo spout, boulders, lanterns and a pavilion.
import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import * as T from "../textures";
import { Kit, boxGeo, type World, type Mat } from "./kit";
import * as OT from "./tex/onsen";

type V3 = [number, number, number];
type Inst = { pos: V3; rotX?: number; rotY?: number; rotZ?: number; scale?: V3; color?: string };

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** planar world-space UVs per vertex by dominant normal axis (textures keep real-world scale) */
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
/** merge pre-transformed geometries into one (for instancing a multi-part prop) */
function mg(geos: THREE.BufferGeometry[]) {
  const clean = geos.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(n.attributes)) if (!["position", "normal", "uv"].includes(k)) n.deleteAttribute(k);
    return n;
  });
  return mergeGeometries(clean, false)!;
}
const V2 = (pts: [number, number][]) => pts.map(([a, b]) => new THREE.Vector2(a, b));

export function buildOnsen(): World {
  const k = new Kit(3, 2.3);
  const H = 3; // storey height (ceiling)
  const DH = 2.3; // door opening height
  const PI = Math.PI;

  // ---------------- batching ----------------
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
  type BO = { unit?: number; ry?: number; rx?: number; rz?: number; round?: boolean; solid?: boolean; stand?: boolean };
  const bx = (m: Mat, w: number, h: number, d: number, x: number, y: number, z: number, o: BO = {}) => {
    const g = o.round ? boxGeo(w, h, d) : new THREE.BoxGeometry(w, h, d);
    xf(g, x, y + h / 2, z, o.ry, o.rx, o.rz);
    put(m, g, o.unit ?? units.get(m) ?? 0);
    if (o.solid) k.collider(x - w / 2, x + w / 2, z - d / 2, z + d / 2, y, y + h, o.stand ?? true);
  };
  const cy = (m: Mat, rt: number, rb: number, h: number, x: number, y: number, z: number, seg = 16, o: { rx?: number; rz?: number; ry?: number } = {}) => {
    put(m, xf(new THREE.CylinderGeometry(rt, rb, h, seg), x, o.rx || o.rz ? y : y + h / 2, z, o.ry, o.rx, o.rz));
  };
  const sph = (m: Mat, r: number, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, seg = 14) => {
    const g = new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.7)));
    g.scale(sx, sy, sz);
    put(m, xf(g, x, y, z));
  };
  const lat = (m: Mat, pts: [number, number][], x: number, y: number, z: number, seg = 20) => put(m, xf(new THREE.LatheGeometry(V2(pts), seg), x, y, z));
  const tb = (m: Mat, pts: V3[], r: number, seg = 0, rs = 8) => {
    const c = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, "centripetal");
    put(m, new THREE.TubeGeometry(c, seg || Math.max(6, pts.length * 6), r, rs, false));
  };
  /** flat picture/sign plane; faces +z rotated by ry; y = centre */
  const pl = (m: Mat, w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0) => put(m, xf(new THREE.PlaneGeometry(w, h), x, y, z, ry, rx));
  const col = (x1: number, x2: number, z1: number, z2: number, b: number, t: number, stand = true) => k.collider(Math.min(x1, x2), Math.max(x1, x2), Math.min(z1, z2), Math.max(z1, z2), b, t, stand);

  // instanced lists
  const instLists = new Map<string, { geo: THREE.BufferGeometry; m: Mat; list: Inst[]; noShadow?: boolean }>();
  const inst = (key: string, geo: () => THREE.BufferGeometry, m: Mat, it: Inst, noShadow = false) => {
    let e = instLists.get(key);
    if (!e) instLists.set(key, (e = { geo: geo(), m, list: [], noShadow }));
    e.list.push(it);
  };

  /** local frame (prop origin + yaw): local +z = the prop's front */
  function F(cx: number, cz: number, ry = 0) {
    const c = Math.cos(ry), s = Math.sin(ry);
    const wx = (lx: number, lz: number) => cx + lx * c + lz * s;
    const wz = (lx: number, lz: number) => cz - lx * s + lz * c;
    return {
      wx, wz, ry,
      bx: (m: Mat, w: number, h: number, d: number, lx: number, y: number, lz: number, o: BO = {}) => {
        bx(m, w, h, d, wx(lx, lz), y, wz(lx, lz), { ...o, ry: ry + (o.ry ?? 0), solid: false });
        if (o.solid) fcol(lx - w / 2, lx + w / 2, lz - d / 2, lz + d / 2, y, y + h, o.stand ?? true);
      },
      cy: (m: Mat, rt: number, rb: number, h: number, lx: number, y: number, lz: number, seg = 16, o: { rx?: number; rz?: number } = {}) => cy(m, rt, rb, h, wx(lx, lz), y, wz(lx, lz), seg, { ...o, ry }),
      sph: (m: Mat, r: number, lx: number, y: number, lz: number, sx = 1, sy = 1, sz = 1) => {
        const g = new THREE.SphereGeometry(r, 14, 10);
        g.scale(sx, sy, sz);
        put(m, xf(g, wx(lx, lz), y, wz(lx, lz), ry));
      },
      lat: (m: Mat, pts: [number, number][], lx: number, y: number, lz: number, seg = 20) => lat(m, pts, wx(lx, lz), y, wz(lx, lz), seg),
      pl: (m: Mat, w: number, h: number, lx: number, y: number, lz: number, rr = 0, rx = 0) => pl(m, w, h, wx(lx, lz), y, wz(lx, lz), ry + rr, rx),
      col: (x1: number, x2: number, z1: number, z2: number, b: number, t: number, stand = true) => fcol(x1, x2, z1, z2, b, t, stand),
      geo: (m: Mat, g: THREE.BufferGeometry, lx: number, y: number, lz: number, rr = 0, rx = 0, rz = 0) => put(m, xf(g, wx(lx, lz), y, wz(lx, lz), ry + rr, rx, rz)),
    };
    function fcol(x1: number, x2: number, z1: number, z2: number, b: number, t: number, stand: boolean) {
      const xs = [wx(x1, z1), wx(x2, z1), wx(x1, z2), wx(x2, z2)], zs = [wz(x1, z1), wz(x2, z1), wz(x1, z2), wz(x2, z2)];
      k.collider(Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs), b, t, stand);
    }
  }

  // ---------------- materials ----------------
  const tx = <A extends unknown[]>(key: string, f: (...a: A) => ReturnType<typeof OT.onRock>, ...a: A) => k.tex(key, () => f(...a));
  const plasterM = U(k.mat(tx("onPlaster", OT.onPlaster), "#ffffff", [1, 1], { roughness: 0.92, bump: 0.5 }), 1.6);
  const plasterWhiteM = U(k.mat(tx("onPlaster", OT.onPlaster), "#f4ede0", [1, 1], { roughness: 0.9, bump: 0.35 }), 1.6);
  const tatamiM = U(k.mat(tx("onTatami", OT.onTatami), "#ffffff", [1, 1], { roughness: 0.85, bump: 0.6 }), 1.8);
  const darkWoodM = U(k.mat(tx("onPlanksD", OT.onPlanks, true, 4), "#ffffff", [1, 1], { roughness: 0.3, bump: 0.5 }), 1.0);
  const postM = U(k.mat(tx("onPlanksD", OT.onPlanks, true, 4), "#8a6a50", [1, 1], { roughness: 0.55, bump: 0.4 }), 1.4);
  const hinokiM = U(k.mat(tx("onPlanksL", OT.onPlanks, false, 7), "#ffffff", [1, 1], { roughness: 0.55, bump: 0.5 }), 1.0);
  const hinokiWetM = U(k.mat(tx("onPlanksL", OT.onPlanks, false, 7), "#c9a57a", [1, 1], { roughness: 0.3, bump: 0.5 }), 1.0);
  const ceilM = U(k.mat(tx("onCeiling", OT.onCeiling), "#ffffff", [1, 1], { roughness: 0.75, bump: 0.4 }), 1.8);
  const roofM = U(k.mat(k.tex("onKawara", OT.onKawara), "#9a9ea6", [1, 1], { roughness: 0.72, bump: 0.9 }), 1.0);
  const soffitM = U(k.mat(k.tex("onCeiling", OT.onCeiling), "#ffffff", [1, 1], { roughness: 0.75, bump: 0.4 }), 1.8);
  const ceilHighM = U(k.mat(k.tex("onCeiling", OT.onCeiling), "#ffffff", [1, 1], { roughness: 0.75, bump: 0.4 }), 1.8);
  const kawaraM = U(k.mat(tx("onKawara", OT.onKawara), "#ffffff", [1, 1], { roughness: 0.72, bump: 0.9 }), 1.0);
  const rockM = U(k.mat(tx("onRock", OT.onRock), "#ffffff", [1, 1], { roughness: 0.8, bump: 1.1 }), 1.4);
  const rockWetM = U(k.mat(tx("onRock", OT.onRock), "#8e8a86", [1, 1], { roughness: 0.4, bump: 1.1 }), 1.4);
  const stoneM = U(k.mat(tx("onRock", OT.onRock), "#c7c1b5", [1, 1], { roughness: 0.85, bump: 0.8 }), 0.9);
  const gravelM = U(k.mat(tx("onGravel", OT.onGravel), "#ffffff", [1, 1], { roughness: 0.95, bump: 0.9 }), 1.2);
  const mossM = U(k.mat(tx("onMoss", OT.onMoss), "#ffffff", [1, 1], { roughness: 0.95, bump: 0.7 }), 2.5);
  const slateM = U(k.mat(tx("onSlate", OT.onSlate), "#ffffff", [1, 1], { roughness: 0.22, metalness: 0.05, bump: 0.35 }), 1.2);
  const doMaM = U(k.mat(tx("onSlate", OT.onSlate), "#8a8378", [1, 1], { roughness: 0.4, bump: 0.35 }), 0.9);
  const flagM = U(k.mat(tx("onFlag", OT.onFlagstone), "#ffffff", [1, 1], { roughness: 0.55, bump: 0.8 }), 2.4);
  const tileWM = U(k.mat(tx("onMosaicW", OT.onMosaic, "#e8e6df", "#d9d6cc", 52), "#ffffff", [1, 1], { roughness: 0.25, bump: 0.3 }), 0.8);
  const bFenceM = U(k.mat(tx("onBFence", OT.onBambooFence), "#ffffff", [1, 1], { roughness: 0.75, bump: 0.8 }), 1.2);
  const bambooM = k.mat(tx("onBamboo", OT.onBamboo, false), "#ffffff", [1, 4], { roughness: 0.45, bump: 0.5 });
  const bambooDryM = k.mat(tx("onBambooD", OT.onBamboo, true), "#ffffff", [1, 2], { roughness: 0.5, bump: 0.5 });
  const barkM = k.mat(tx("onBark", OT.onBark), "#ffffff", [2, 2], { roughness: 0.9, bump: 1.0 });
  const shojiM = k.mat(tx("onShoji", OT.onShoji), "#ffffff", [1, 1], { roughness: 0.85, bump: 0, emissive: "#ffd9a0", emissiveIntensity: 0.22 });
  const fusumaM = k.mat(tx("onFusuma", OT.onFusuma), "#ffffff", [1, 1], { roughness: 0.85, bump: 0 });
  const lacquerM = k.mat(null, "#2a1310", [1, 1], { roughness: 0.18, metalness: 0.1 });
  const lacquerRedM = k.mat(null, "#8a1a12", [1, 1], { roughness: 0.25 });
  const blackM = k.mat(null, "#1a1714", [1, 1], { roughness: 0.5 });
  const steelM = k.mat(null, "#b8bcc0", [1, 1], { roughness: 0.3, metalness: 0.9 });
  const chromeM = k.mat(null, "#e6e8ea", [1, 1], { roughness: 0.12, metalness: 1 });
  const brassM = k.mat(null, "#b08a3e", [1, 1], { roughness: 0.3, metalness: 0.9 });
  const ironM = k.mat(null, "#2b2724", [1, 1], { roughness: 0.6, metalness: 0.6 });
  const ceramicM = k.mat(null, "#f2efe8", [1, 1], { roughness: 0.15 });
  const celadonM = k.mat(null, "#8fae9a", [1, 1], { roughness: 0.18 });
  const clayM = k.mat(null, "#6b3e22", [1, 1], { roughness: 0.4 });
  const mirrorM = k.mat(null, "#c8d0d4", [1, 1], { roughness: 0.03, metalness: 1 });
  const whiteM = k.mat(null, "#f0efe9", [1, 1], { roughness: 0.5 });
  const plasticRedM = k.mat(null, "#c0281c", [1, 1], { roughness: 0.4 });
  const plasticBlueM = k.mat(null, "#2456a6", [1, 1], { roughness: 0.4 });
  const leatherM = k.mat(null, "#4a2e1f", [1, 1], { roughness: 0.38 });
  const redFeltM = k.mat(tx("onFelt", OT.onFabric, "#b8231a", "#a01c14", 175), "#ffffff", [2, 2], { roughness: 0.95, bump: 0 });
  const fabricM = k.mat(tx("onFabricW", OT.onFabric, "#ececec", "#bdbdbd", 171), "#ffffff", [1, 1], { roughness: 0.95, bump: 0 });
  const futonM = k.mat(tx("onFutonF", OT.onFabric, "#f4f1ea", "#d8d0c0", 173), "#ffffff", [2, 1], { roughness: 0.95, bump: 0 });
  const yukataM = k.mat(tx("onYukata", OT.onFabric, "#2c3f6c", "#e7e2d6", 177), "#ffffff", [2, 2], { roughness: 0.9, bump: 0 });
  const towelM = k.mat(k.tex("onTowel", () => T.noise("#f3f1ec", 0.08, 5, 1800)), "#ffffff", [1, 1], { roughness: 1, bump: 0.6 });
  const rattanM = k.mat(tx("onRattan", OT.onRattan), "#ffffff", [3, 2], { roughness: 0.8, bump: 0.8 });
  const rattanFloorM = U(k.mat(tx("onRattan", OT.onRattan), "#e8d8b8", [1, 1], { roughness: 0.7, bump: 0.6 }), 0.6);
  const scrollM1 = k.mat(tx("onScroll1", OT.onScroll, 1), "#ffffff", [1, 1], { roughness: 0.8, bump: 0 });
  const scrollM2 = k.mat(tx("onScroll2", OT.onScroll, 2), "#ffffff", [1, 1], { roughness: 0.8, bump: 0 });
  const byobuM = k.mat(tx("onByobu", OT.onByobu), "#ffffff", [1, 1], { roughness: 0.35, metalness: 0.35, bump: 0 });
  const lockerM = k.mat(tx("onLockers", OT.onLockers, "#b98e5e", 4, 5, 181), "#ffffff", [1, 1], { roughness: 0.5, bump: 0 });
  const getaM = k.mat(tx("onGeta", OT.onLockers, "#8a6038", 6, 4, 183), "#ffffff", [1, 1], { roughness: 0.55, bump: 0 });
  const vendRedM = k.mat(tx("onVendR", OT.onVending, "#c3261c"), "#ffffff", [1, 1], { roughness: 0.3, bump: 0, emissive: "#ffffff", emissiveIntensity: 0.55 });
  const vendBlueM = k.mat(tx("onVendB", OT.onVending, "#1d4fa0"), "#ffffff", [1, 1], { roughness: 0.3, bump: 0, emissive: "#ffffff", emissiveIntensity: 0.55 });
  const vendBodyR = k.mat(null, "#b8221a", [1, 1], { roughness: 0.35, metalness: 0.3 });
  const vendBodyB = k.mat(null, "#1b4a96", [1, 1], { roughness: 0.35, metalness: 0.3 });
  const ppM = k.mat(tx("onPP", OT.onPingPong), "#ffffff", [1, 1], { roughness: 0.4, bump: 0 });
  const screenM = k.mat(tx("onScreen", OT.onScreen), "#ffffff", [1, 1], { roughness: 0.1, bump: 0, emissive: "#ffffff", emissiveIntensity: 0.9 });
  const tvM = k.mat(null, "#0b0d10", [1, 1], { roughness: 0.08, metalness: 0.3 });
  const lanternM = k.mat(tx("onLanternW", OT.onLantern, "#f4ddb0", ""), "#ffffff", [1, 1], { roughness: 0.8, bump: 0, emissive: "#ffb45a", emissiveIntensity: 1.25 });
  const lanternRedM = k.mat(tx("onLanternR", OT.onLantern, "#c8321e", "湯"), "#ffffff", [1, 1], { roughness: 0.8, bump: 0, emissive: "#ff7a3a", emissiveIntensity: 1.1 });
  const lanternInnM = k.mat(tx("onLanternI", OT.onLantern, "#f1e2c0", "宿"), "#ffffff", [1, 1], { roughness: 0.8, bump: 0, emissive: "#ffb45a", emissiveIntensity: 1.25 });
  const andonM = k.mat(tx("onShoji", OT.onShoji), "#ffe8c0", [1, 1], { roughness: 0.8, bump: 0, emissive: "#ffb050", emissiveIntensity: 1.3 });
  const glowM = k.mat(null, "#ffd08a", [1, 1], { emissive: "#ffb050", emissiveIntensity: 2.2 });
  const norenBlueM = k.mat(tx("onNorenB", OT.onNoren, "#1f2f5e", "湯"), "#ffffff", [1, 1], { transparent: true, roughness: 0.9 });
  const norenRedM = k.mat(tx("onNorenR", OT.onNoren, "#8e1f22", "ゆ"), "#ffffff", [1, 1], { transparent: true, roughness: 0.9 });
  const norenInnM = k.mat(tx("onNorenI", OT.onNoren, "#3a2a20", "宿"), "#ffffff", [1, 1], { transparent: true, roughness: 0.9 });
  const mapleM = k.mat(tx("onMaple", OT.onFoliage, "maple"), "#ffffff", [1, 1], { transparent: true, roughness: 0.8, emissive: "#6a1004", emissiveIntensity: 0.3 });
  const maple2M = k.mat(tx("onMaple2", OT.onFoliage, "maple2"), "#ffffff", [1, 1], { transparent: true, roughness: 0.8, emissive: "#6a2a04", emissiveIntensity: 0.3 });
  const pineLeafM = k.mat(tx("onPine", OT.onFoliage, "pine"), "#ffffff", [1, 1], { transparent: true, roughness: 0.85 });
  const shrubM = k.mat(k.tex("leaves", T.leaves), "#6f8f52", [2, 2], { roughness: 0.9, bump: 0.9 });
  const pinePadM = k.mat(k.tex("leaves", T.leaves), "#3d5a32", [2, 1], { roughness: 0.9, bump: 1.0 });
  const koiM = k.mat(null, "#ffffff", [1, 1], { roughness: 0.3 });
  const waterTex = tx("onWater", OT.onWater);
  const hotWaterM = k.mat(waterTex, "#7fb3ad", [3, 3], { roughness: 0.07, metalness: 0.15, bump: 0.35 });
  hotWaterM.m.userData.flow = [0.006, 0.02];
  const bathWaterM = k.mat(waterTex, "#86b8b4", [2, 1], { roughness: 0.06, metalness: 0.15, bump: 0.3 });
  bathWaterM.m.userData.flow = [0.01, 0.004];
  const streamM = k.mat(waterTex, "#d8eeee", [1, 4], { roughness: 0.05, metalness: 0.1, bump: 0.4, emissive: "#8ab0b0", emissiveIntensity: 0.25 });
  streamM.m.userData.flow = [0, 0.7];
  const pondM = k.mat(waterTex, "#4a7a78", [3, 2], { transparent: true, roughness: 0.06, metalness: 0.1, bump: 0.3 });
  pondM.m.alphaTest = 0; pondM.m.opacity = 0.62; pondM.m.depthWrite = false; pondM.m.side = THREE.FrontSide;
  pondM.m.userData.flow = [0.003, 0.008];
  const pondBedM = k.mat(tx("onRock", OT.onRock), "#3a3a30", [4, 4], { roughness: 0.9, bump: 0.6 });
  const glassM = k.mat(null, "#b8d0d8", [1, 1], { transparent: true, roughness: 0.04, metalness: 0.2 });
  glassM.m.alphaTest = 0; glassM.m.opacity = 0.22; glassM.m.depthWrite = false;
  const steamM = k.mat(tx("onSteam", OT.onSteam), "#ffffff", [1, 1], { transparent: true, roughness: 1, emissive: "#ffe8d8", emissiveIntensity: 0.25 });
  steamM.m.alphaTest = 0; steamM.m.depthWrite = false; steamM.m.opacity = 0.75;
  const signCache = new Map<string, Mat>();
  const signM = (text: string, vertical = false, bg = "#6b4a2c", fg = "#f4ead2") => {
    const key = `${text}|${vertical}|${bg}`;
    let m = signCache.get(key);
    if (!m) signCache.set(key, (m = k.mat(k.tex(`onSign${key}`, () => OT.onSign(text, bg, fg, vertical)), "#ffffff", [1, 1], { roughness: 0.6, bump: 0 })));
    return m;
  };

  // ======================= GROUND =======================
  bx(blackM, 60, 0.2, 52, 0, -0.21, 1, { unit: 0 });
  bx(mossM, 28, 0.2, 17.6, -10, -0.2, -11.2); // garden x -24..4 z -20..-2.4
  bx(flagM, 20, 0.2, 20, 14, -0.2, -10); // rotenburo deck x 4..24
  bx(gravelM, 48, 0.2, 6, 0, -0.2, 19); // forecourt z 16..22
  bx(gravelM, 7, 0.02, 6.5, -0.2, -0.015, -16.4); // dry garden

  // ======================= WALL HELPERS =======================
  const T2 = 0.2;
  /** wall along x at z=c (axis x) or along z at x=c; doors [centre, width] */
  function wall(axis: "x" | "z", c: number, a1: number, a2: number, m: Mat, doors: [number, number][] = [], o: { h?: number; skin?: [Mat, number]; trim?: boolean } = {}) {
    const h = o.h ?? H;
    const seg = (s: number, e: number, y0: number, y1: number) => {
      if (e - s < 0.01) return;
      const mid = (s + e) / 2, len = e - s;
      if (axis === "x") { bx(m, len, y1 - y0, T2, mid, y0, c); col(s, e, c - T2 / 2, c + T2 / 2, y0, y1); }
      else { bx(m, T2, y1 - y0, len, c, y0, mid); col(c - T2 / 2, c + T2 / 2, s, e, y0, y1); }
      if (o.skin) {
        const [sm, side] = o.skin;
        if (axis === "x") bx(sm, len, y1 - y0, 0.02, mid, y0, c + side * (T2 / 2 + 0.01));
        else bx(sm, 0.02, y1 - y0, len, c + side * (T2 / 2 + 0.01), y0, mid);
      }
    };
    let cur = a1;
    for (const [dc, w] of [...doors].sort((a, b) => a[0] - b[0])) {
      seg(cur, dc - w / 2, 0, h);
      seg(dc - w / 2, dc + w / 2, DH, h);
      // door frame: jambs + kamoi lintel + sill
      for (const s of [-1, 1]) {
        if (axis === "x") bx(postM, 0.1, DH, T2 + 0.06, dc + s * (w / 2 + 0.05), 0, c);
        else bx(postM, T2 + 0.06, DH, 0.1, c, 0, dc + s * (w / 2 + 0.05));
      }
      if (axis === "x") { bx(postM, w + 0.3, 0.1, T2 + 0.08, dc, DH, c); bx(postM, w, 0.02, T2 + 0.04, dc, 0, c); }
      else { bx(postM, T2 + 0.08, 0.1, w + 0.3, c, DH, dc); bx(postM, T2 + 0.04, 0.02, w, c, 0, dc); }
      cur = dc + w / 2;
    }
    seg(cur, a2, 0, h);
    if (o.trim !== false) {
      // skirting + nageshi rail on both faces
      const len = a2 - a1, mid = (a1 + a2) / 2;
      for (const s of [-1, 1]) {
        if (axis === "x") { bx(postM, len, 0.07, 0.03, mid, 0, c + s * 0.11); bx(postM, len, 0.08, 0.04, mid, DH + 0.02, c + s * 0.12); }
        else { bx(postM, 0.03, 0.07, len, c + s * 0.11, 0, mid); bx(postM, 0.04, 0.08, len, c + s * 0.12, DH + 0.02, mid); }
      }
    }
  }
  /** shoji wall along x at z=c; openings get slid-open panels */
  function shojiWall(c: number, a1: number, a2: number, doors: [number, number][], side: number) {
    const segs: [number, number][] = [];
    let cur = a1;
    for (const [dc, w] of [...doors].sort((a, b) => a[0] - b[0])) { segs.push([cur, dc - w / 2]); cur = dc + w / 2; }
    segs.push([cur, a2]);
    for (const [s, e] of segs) {
      const len = e - s;
      if (len < 0.05) continue;
      const n = Math.max(1, Math.round(len / 0.9)), pw = len / n;
      for (let i = 0; i < n; i++) bx(shojiM, pw - 0.01, DH, 0.05, s + pw * (i + 0.5), 0, c + ((i % 2) - 0.5) * 0.05, { unit: 0 });
      col(s, e, c - 0.1, c + 0.1, 0, H);
      bx(postM, 0.14, H, 0.16, s + 0.07, 0, c);
      bx(postM, 0.14, H, 0.16, e - 0.07, 0, c);
    }
    for (const [dc, w] of doors) {
      // two slid-open panels stacked in front of the neighbours
      for (const sgn of [-1, 1]) bx(shojiM, 0.9, DH, 0.05, dc + sgn * (w / 2 + 0.45), 0, c + side * 0.1, { unit: 0 });
    }
    // transom (ranma) above: plaster with lattice band
    bx(plasterWhiteM, a2 - a1, H - DH, 0.14, (a1 + a2) / 2, DH, c);
    col(a1, a2, c - 0.1, c + 0.1, DH, H);
    bx(postM, a2 - a1, 0.1, 0.2, (a1 + a2) / 2, DH, c);
    bx(postM, a2 - a1, 0.03, 0.18, (a1 + a2) / 2, 0, c);
    for (let x = a1 + 0.15; x < a2; x += 0.12) bx(postM, 0.025, 0.4, 0.03, x, DH + 0.15, c + side * 0.08, { unit: 0 });
  }

  // ======================= BUILDING SHELL =======================
  // floors
  bx(tatamiM, 19, 0.02, 8, -14.5, -0.02, 4); // plum + pine rooms
  bx(tatamiM, 12, 0.02, 6, -18, -0.02, 13); // bamboo room
  bx(darkWoodM, 36, 0.02, 2, -6, -0.02, 9); // corridor
  bx(darkWoodM, 17, 0.02, 8, 3.5, -0.02, 4); // lounge
  bx(darkWoodM, 7, 0.02, 6, -8.5, -0.02, 13); // shop
  bx(hinokiM, 7, 0.02, 6, 8.5, -0.02, 13); // game corner
  bx(rattanFloorM, 12, 0.02, 8, 18, -0.02, 12); // changing
  bx(slateM, 12, 0.02, 8, 18, -0.02, 4); // indoor bath
  bx(doMaM, 10, 0.02, 3, 0, -0.02, 14.5); // genkan doma
  // genkan raised floor (agari-kamachi)
  bx(darkWoodM, 9.8, 0.17, 2.9, 0, -0.02, 11.55);
  col(-4.9, 4.9, 10.1, 13, 0, 0.15);
  bx(lacquerM, 9.8, 0.16, 0.1, 0, -0.01, 13.0);
  // ceiling
  bx(ceilHighM, 48, 0.2, 16, 0, H + 0.01, 8);
  for (let x = -22; x <= 12; x += 3) bx(postM, 0.14, 0.14, 2, x, H - 0.14, 9); // corridor beams

  // exterior / structural walls
  wall("x", 16, -24, 24, plasterM, [[0, 2.6]]); // south facade
  wall("z", -24, 0, 16, plasterM);
  wall("z", 24, 0, 16, plasterM, [], { skin: [tileWM, -1] });
  // interior
  wall("x", 8, -24, 12, plasterM, [[-19, 1.6], [-10, 1.6], [3.5, 3]]);
  wall("x", 8, 12, 24, plasterM, [[18, 1.8]], { skin: [tileWM, -1] });
  wall("x", 10, -24, 12, plasterM, [[-18, 1.6], [-8.5, 1.6], [0, 3], [8.5, 1.6]]);
  wall("z", -14.5, 0, 8, fusumaM, [[4, 1.6]], { trim: true });
  wall("z", -5, 0, 8, plasterM, [[4, 1.6]]);
  wall("z", 12, 0, 8, plasterM, [], { skin: [tileWM, 1] });
  wall("z", 12, 8, 16, plasterM, [[9, 1.6], [13, 1.6]]);
  wall("z", -12, 10, 16, plasterM, [[13, 1.6]]);
  wall("z", -5, 10, 16, plasterM, [[13, 1.6]]);
  wall("z", 5, 10, 16, plasterM, [[13, 1.6]]);
  // north facade: shoji to the engawa, lounge glass, bath windows
  shojiWall(0, -24, -14.5, [[-19.25, 1.8]], -1);
  shojiWall(0, -14.5, -5, [[-9.75, 1.8]], -1);
  // lounge: glass sliding doors x -5..4, plaster x 4..12
  for (const [s, e] of [[-5, -2], [2, 4]] as [number, number][]) {
    for (let x = s; x < e - 0.01; x += 1) {
      bx(glassM, 0.98, DH - 0.1, 0.02, x + 0.5, 0.05, 0, { unit: 0 });
      bx(darkWoodM, 0.06, DH, 0.08, x + 0.03, 0, 0);
    }
    col(s, e, -0.1, 0.1, 0, H);
    bx(darkWoodM, e - s, 0.06, 0.08, (s + e) / 2, 0, 0);
  }
  bx(darkWoodM, 0.06, DH, 0.08, 3.97, 0, 0);
  for (const x of [-2, 2]) bx(postM, 0.14, H, 0.18, x, 0, 0);
  bx(plasterWhiteM, 9, H - DH, 0.14, -0.5, DH, 0); col(-5, 4, -0.1, 0.1, DH, H);
  bx(postM, 9, 0.1, 0.2, -0.5, DH, 0);
  wall("x", 0, 4, 12, plasterM, [], { trim: false });
  // bath north wall: tiled dado, windows, glass door to rotenburo
  for (const [s, e] of [[12, 17.1], [18.9, 24]] as [number, number][]) {
    bx(tileWM, e - s, 0.9, T2, (s + e) / 2, 0, 0);
    bx(glassM, e - s, DH - 0.9, 0.02, (s + e) / 2, 0.9, 0, { unit: 0 });
    for (let x = s; x <= e + 0.01; x += (e - s) / 3) bx(darkWoodM, 0.06, DH - 0.9, 0.1, x, 0.9, 0);
    bx(darkWoodM, e - s, 0.06, 0.24, (s + e) / 2, 0.9, 0);
    col(s, e, -0.1, 0.1, 0, H);
  }
  bx(plasterM, 12, H - DH, T2, 18, DH, 0); col(12, 24, -0.1, 0.1, DH, H);
  bx(postM, 12, 0.1, 0.24, 18, DH, 0);
  for (const s of [-1, 1]) bx(postM, 0.1, DH, 0.26, 18 + s * 0.95, 0, 0);
  bx(glassM, 0.9, DH - 0.05, 0.02, 17.1, 0, -0.06, { unit: 0 }); // slid-open glass door
  bx(darkWoodM, 0.9, 0.06, 0.06, 17.1, 0, -0.06);

  // exterior posts + facade lattice windows (south)
  for (let x = -21; x <= 21; x += 3) if (Math.abs(x) > 2) bx(postM, 0.18, H, 0.1, x, 0, 16.14);
  bx(postM, 48, 0.14, 0.1, 0, H - 0.3, 16.14);
  bx(postM, 48, 0.3, 0.06, 0, 0, 16.13);
  for (const cx of [-8, -15, 8, 15]) {
    bx(shojiM, 2.2, 1.2, 0.03, cx, 0.9, 16.12, { unit: 0 });
    for (let i = 0; i <= 18; i++) bx(darkWoodM, 0.035, 1.3, 0.05, cx - 1.1 + i * (2.2 / 18), 0.85, 16.18, { unit: 0 });
    bx(darkWoodM, 2.3, 0.06, 0.1, cx, 0.82, 16.18); bx(darkWoodM, 2.3, 0.06, 0.1, cx, 2.12, 16.18);
  }
  // entrance canopy
  {
    const g = new THREE.BoxGeometry(4.4, 0.08, 2.2);
    put(kawaraM, xf(g, 0, 2.95, 17.0, 0, 0.3), 1);
    for (const s of [-1, 1]) { bx(postM, 0.16, 2.9, 0.16, s * 2, 0, 17.8, { solid: true }); }
    bx(postM, 4.3, 0.14, 0.14, 0, 2.75, 17.8);
  }

  // ======================= ROOF =======================
  {
    const ridgeZ = 7, ridgeY = 6.8, eaveY = 3.4;
    const slope = (z0: number, sgn: number) => {
      const run = Math.abs(ridgeZ - z0), rise = ridgeY - eaveY;
      const len = Math.hypot(run, rise), ang = Math.atan2(rise, run);
      const g = new THREE.BoxGeometry(50, 0.22, len + 0.1);
      put(roofM, xf(g, 0, (ridgeY + eaveY) / 2, (ridgeZ + z0) / 2, 0, sgn * ang), 1);
      const s2 = new THREE.BoxGeometry(49.8, 0.08, len);
      put(soffitM, xf(s2, 0, (ridgeY + eaveY) / 2 - 0.13, (ridgeZ + z0) / 2, 0, sgn * ang), 1.8);
    };
    slope(-3.2, -1);
    slope(17.4, 1);
    bx(roofM, 50.4, 0.45, 0.5, 0, ridgeY - 0.05, ridgeZ);
    bx(blackM, 50.4, 0.2, 0.08, 0, eaveY - 0.12, -3.2);
    const sh = new THREE.Shape();
    sh.moveTo(-3, 3.0); sh.lineTo(ridgeZ, ridgeY - 0.15); sh.lineTo(17, 3.0); sh.closePath();
    for (const x of [-24.05, 24.05]) {
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: false });
      g.translate(0, 0, -0.1);
      put(plasterWhiteM, xf(g, x, 0, 0, -PI / 2), 1.6);
    }
  }

  // ======================= ENGAWA =======================
  bx(darkWoodM, 28, 0.32, 2.4, -10, -0.02, -1.2);
  col(-24, 4, -2.4, 0, 0, 0.3);
  bx(postM, 28, 0.08, 0.1, -10, 0.22, -2.42);
  for (let x = -22.5; x <= 3; x += 3.2) {
    bx(postM, 0.16, H + 0.25, 0.16, x, 0.3, -2.3);
    col(x - 0.08, x + 0.08, -2.38, -2.22, 0, H);
    // shoe stone
    if (x > -20 && x < 0 && Math.round(x * 10) % 2 === 0) bx(stoneM, 0.8, 0.22, 0.5, x + 1.6, 0, -2.85, { round: true });
  }
  bx(postM, 28, 0.2, 0.2, -10, H, -2.3);
  // hanging lanterns under the eave
  const chochin = (x: number, y: number, z: number, m: Mat, s = 1) => {
    lat(m, [[0.05 * s, 0], [0.15 * s, 0.05 * s], [0.2 * s, 0.2 * s], [0.2 * s, 0.34 * s], [0.15 * s, 0.5 * s], [0.05 * s, 0.55 * s]], x, y, z, 16);
    cy(blackM, 0.07 * s, 0.07 * s, 0.05 * s, x, y + 0.53 * s, z, 12);
    cy(blackM, 0.07 * s, 0.07 * s, 0.05 * s, x, y - 0.03 * s, z, 12);
  };
  for (const x of [-20.9, -14.5, -8.1, -1.7]) { chochin(x, 2.3, -2.3, lanternRedM, 1.1); cy(blackM, 0.01, 0.01, 0.12, x, 2.9, -2.3, 4); }
  // wind chime + sitting cushions + mosquito coil pig
  cy(celadonM, 0.06, 0.07, 0.07, -12, 2.75, -2.1, 12);
  pl(signM("風", true, "#f0e6d0", "#3a2a20"), 0.07, 0.22, -12, 2.55, -2.1, 0);
  // ======================= UTIL PROPS =======================
  const zabGeo = () => boxGeo(0.56, 0.08, 0.6);
  const zab = (x: number, z: number, color: string, ry = 0) => inst("zab", zabGeo, fabricM, { pos: [x, 0.04, z], rotY: ry, color });
  for (const x of [-18, -17.2, -6.5]) zab(x, -1.0, "#7a2e3c", 0.2);
  sph(ceramicM, 0.09, -6.3, 0.38, -0.5, 1.2, 1, 1);
  const zaisu = (x: number, z: number, ry: number, color: string) => {
    const f = F(x, z, ry);
    zab(x, z, color, ry);
    f.bx(lacquerM, 0.5, 0.05, 0.5, 0, 0, 0.0);
    f.bx(lacquerM, 0.48, 0.5, 0.05, 0, 0.05, -0.26, { rx: -0.3 });
    f.bx(fabricM, 0.4, 0.38, 0.04, 0, 0.12, -0.22, { rx: -0.3 });
  };
  const lowTable = (x: number, z: number, w: number, d: number, tea = true) => {
    bx(lacquerM, w, 0.05, d, x, 0.3, z, { round: true });
    bx(lacquerM, w - 0.12, 0.07, d - 0.12, x, 0.24, z);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(lacquerM, 0.07, 0.25, 0.07, x + sx * (w / 2 - 0.1), 0, z + sz * (d / 2 - 0.1));
    col(x - w / 2, x + w / 2, z - d / 2, z + d / 2, 0, 0.35);
    if (tea) {
      bx(hinokiM, 0.4, 0.02, 0.3, x - w * 0.25, 0.35, z, { round: true, unit: 0 });
      lat(celadonM, [[0, 0], [0.07, 0.01], [0.09, 0.06], [0.07, 0.12], [0.02, 0.13], [0, 0.14]], x - w * 0.25, 0.37, z, 16);
      tb(brassM, [[x - w * 0.25 - 0.07, 0.49, z], [x - w * 0.25, 0.56, z], [x - w * 0.25 + 0.07, 0.49, z]], 0.006, 8, 4);
      for (const [dx, dz] of [[0.1, 0.2], [-0.1, 0.2], [0.3, -0.2], [-0.35, -0.2]]) lat(ceramicM, [[0, 0], [0.03, 0], [0.04, 0.06], [0.036, 0.06], [0.026, 0.008], [0, 0.008]], x + dx * w * 0.5, 0.35, z + dz * d * 0.6, 12);
      // sweets tray
      cy(lacquerRedM, 0.14, 0.12, 0.03, x + w * 0.2, 0.35, z, 20);
      for (let i = 0; i < 3; i++) sph(ceramicM, 0.03, x + w * 0.2 + (i - 1) * 0.07, 0.4, z, 1, 0.6, 1);
    }
  };
  const andon = (x: number, z: number) => {
    bx(lacquerM, 0.34, 0.04, 0.34, x, 0, z);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(lacquerM, 0.03, 0.8, 0.03, x + sx * 0.15, 0, z + sz * 0.15);
    bx(andonM, 0.28, 0.6, 0.28, x, 0.12, z, { unit: 0 });
    bx(lacquerM, 0.34, 0.03, 0.34, x, 0.78, z);
    col(x - 0.18, x + 0.18, z - 0.18, z + 0.18, 0, 0.82);
  };
  const futonStack = (x: number, z: number, ry = 0) => {
    const f = F(x, z, ry);
    const cols = ["#ffffff", "#e0e8f4", "#ffffff", "#f4e4e0"];
    for (let i = 0; i < 4; i++) f.bx(futonM, 1.0, 0.13, 0.7, 0, i * 0.13, 0, { round: true });
    void cols;
    f.bx(yukataM, 0.5, 0.1, 0.35, 0.15, 0.52, 0.05, { round: true });
    f.bx(fabricM, 0.45, 0.12, 0.28, -0.2, 0.52, -0.1, { round: true });
    f.col(-0.5, 0.5, -0.35, 0.35, 0, 0.62);
  };
  const tokonoma = (cx: number, cz: number, ry: number, scroll: Mat) => {
    // origin: centre of the alcove back wall; local +z = into the room
    const f = F(cx, cz, ry);
    f.bx(hinokiM, 1.8, 0.14, 0.7, 0, 0, 0.45, { round: true });
    f.bx(lacquerM, 1.82, 0.14, 0.06, 0, 0, 0.8);
    f.col(-0.9, 0.9, 0.1, 0.83, 0, 0.15);
    f.bx(plasterWhiteM, 1.9, H, 0.02, 0, 0, 0.11, { unit: 1.6 });
    f.cy(barkM, 0.07, 0.08, H, -0.97, 0, 0.78, 10); // toko-bashira
    f.bx(postM, 0.1, H, 0.7, 1.0, 0, 0.45, { solid: true, unit: 0 }); // side board
    f.bx(postM, 1.9, 0.12, 0.08, 0, 2.05, 0.8); // otoshigake
    f.bx(plasterWhiteM, 1.9, H - 2.17, 0.06, 0, 2.17, 0.8);
    f.pl(scroll, 0.5, 1.3, 0, 1.3, 0.13);
    f.cy(blackM, 0.015, 0.015, 0.6, -0.3, 1.96, 0.14, 6, { rz: PI / 2 });
    // ikebana: celadon vase with a maple branch
    f.lat(celadonM, [[0, 0], [0.09, 0.01], [0.12, 0.1], [0.07, 0.25], [0.05, 0.3], [0.06, 0.33], [0, 0.32]], 0.45, 0.14, 0.45, 18);
    const bx0 = f.wx(0.45, 0.45), bz0 = f.wz(0.45, 0.45);
    tb(barkM, [[bx0, 0.4, bz0], [bx0 + 0.1, 0.7, bz0], [bx0 + 0.25, 0.9, bz0 + 0.05], [bx0 + 0.4, 0.95, bz0]], 0.012, 12, 5);
    for (let i = 0; i < 5; i++) inst("leafSmall", () => new THREE.PlaneGeometry(0.28, 0.28), mapleM, { pos: [bx0 + 0.08 + i * 0.08, 0.72 + i * 0.05, bz0 + (i % 2) * 0.05], rotY: i, rotX: 0.5 });
    f.lat(clayM, [[0, 0], [0.12, 0], [0.14, 0.04], [0.1, 0.1], [0, 0.1]], -0.45, 0.14, 0.5, 16); // incense burner
  };
  const oshiire = (cx: number, cz: number, ry: number) => {
    // closet in the wall: fusuma doors with a futon glimpse
    const f = F(cx, cz, ry);
    f.bx(plasterWhiteM, 1.9, H, 0.8, 0, 0, 0.4, { solid: true });
    f.pl(fusumaM, 0.9, DH - 0.05, -0.45, DH / 2, 0.81);
    f.pl(fusumaM, 0.9, DH - 0.05, 0.45, DH / 2, 0.815);
    f.bx(postM, 1.94, 0.1, 0.06, 0, DH, 0.8);
  };
  const tvSet = (x: number, z: number, ry: number) => {
    const f = F(x, z, ry);
    f.bx(darkWoodM, 1.2, 0.42, 0.42, 0, 0, 0, { solid: true, round: true, unit: 0 });
    f.bx(blackM, 1.0, 0.6, 0.05, 0, 0.47, -0.05, { round: true });
    f.bx(blackM, 0.3, 0.05, 0.2, 0, 0.42, -0.05);
    f.pl(tvM, 0.96, 0.55, 0, 0.77, -0.02);
    f.col(-0.5, 0.5, -0.1, 0.02, 0.42, 1.07);
  };
  const hiroen = (x: number, z: number, ry: number) => {
    // window nook: small table + two chairs (every ryokan has one)
    const f = F(x, z, ry);
    f.cy(lacquerM, 0.3, 0.3, 0.03, 0, 0.6, 0, 24);
    f.cy(lacquerM, 0.04, 0.12, 0.6, 0, 0, 0, 12);
    f.col(-0.3, 0.3, -0.3, 0.3, 0, 0.63);
    for (const s of [-1, 1]) {
      f.bx(rattanM, 0.62, 0.4, 0.62, s * 0.75, 0, 0, { round: true, unit: 0 });
      f.bx(fabricM, 0.56, 0.1, 0.56, s * 0.75, 0.4, 0, { round: true });
      f.bx(rattanM, 0.62, 0.45, 0.1, s * 0.75, 0.45, s * 0.28 * 0 - 0.26, { round: true, unit: 0 });
      f.col(s * 0.75 - 0.31, s * 0.75 + 0.31, -0.31, 0.31, 0, 0.5);
    }
    lat(ceramicM, [[0, 0], [0.03, 0], [0.04, 0.06], [0, 0.06]], f.wx(0.08, 0), 0.63, f.wz(0.08, 0), 10);
  };

  // ======================= TATAMI ROOMS =======================
  k.room("Plum Room", -24, -14.5, 0, 8);
  k.room("Pine Room", -14.5, -5, 0, 8);
  k.room("Bamboo Room", -24, -12, 10, 16);
  {
    // Plum room
    tokonoma(-22.75, 7.9, PI, scrollM1);
    oshiire(-19.9, 7.9, PI);
    lowTable(-19, 3.6, 1.8, 0.95);
    for (const [dx, dz, ry] of [[-0.45, -0.85, 0], [0.45, -0.85, 0], [-0.45, 0.85, PI], [0.45, 0.85, PI]]) zaisu(-19 + dx, 3.6 + dz, ry, "#7a2e3c");
    andon(-23.5, 0.6);
    futonStack(-16, 7.2, PI);
    tvSet(-15.1, 4.5, -PI / 2);
    hiroen(-22.2, 1.0, 0);
    // suitcase + folded yukata
    bx(plasticBlueM, 0.45, 0.65, 0.25, -23.5, 0, 5.4, { round: true, solid: true });
    bx(ironM, 0.2, 0.04, 0.03, -23.5, 0.67, 5.4);
  }
  {
    // Pine room
    tokonoma(-6.1, 1.5, -PI / 2, scrollM2);
    oshiire(-13.5, 7.9, PI);
    lowTable(-9.75, 4.2, 1.8, 0.95);
    for (const [dx, dz, ry] of [[-0.45, -0.85, 0], [0.45, -0.85, 0], [-0.45, 0.85, PI], [0.45, 0.85, PI]]) zaisu(-9.75 + dx, 4.2 + dz, ry, "#2a3f6a");
    andon(-13.9, 0.6);
    andon(-5.6, 7.4);
    futonStack(-8.0, 7.2, PI);
    hiroen(-12.4, 1.0, 0);
    // bags + hibachi brazier
    lat(clayM, [[0, 0], [0.26, 0], [0.3, 0.1], [0.3, 0.36], [0.26, 0.4], [0, 0.4]], -7.4, 0, 2.2, 24);
    cy(ironM, 0.2, 0.2, 0.02, -7.4, 0.36, 2.2, 20);
    lat(ironM, [[0, 0], [0.1, 0], [0.12, 0.08], [0.08, 0.14], [0, 0.15]], -7.4, 0.4, 2.2, 16);
    col(-7.7, -7.1, 1.9, 2.5, 0, 0.55);
  }
  {
    // Bamboo room (banquet): long tables, byobu, tokonoma
    tokonoma(-23.9, 13, PI / 2, scrollM1);
    for (const tz of [11.8, 14.4]) {
      lowTable(-17.5, tz, 4.2, 0.9, true);
      for (let i = 0; i < 4; i++) for (const s of [-1, 1]) zab(-19.1 + i * 1.05, tz + s * 0.75, i % 2 ? "#6a4a20" : "#7a2e3c", 0);
    }
    // byobu folding screen (zig-zag)
    for (let i = 0; i < 6; i++) {
      const ang = i % 2 ? 0.35 : -0.35;
      const g = new THREE.BoxGeometry(0.6, 1.7, 0.03);
      const uv = g.attributes.uv as THREE.BufferAttribute;
      for (let j = 0; j < uv.count; j++) uv.setX(j, (i + uv.getX(j)) / 6);
      put(byobuM, xf(g, -15.6 + i * 0.56, 0.87, 15.6, ang));
    }
    col(-15.9, -12.3, 15.4, 15.8, 0, 1.72);
    andon(-12.6, 10.6);
    andon(-23.3, 15.3);
    // sake set on a tray + sake bottles
    for (let i = 0; i < 3; i++) lat(ceramicM, [[0, 0], [0.04, 0], [0.05, 0.1], [0.02, 0.18], [0.02, 0.22], [0, 0.22]], -16 + i * 1.3, 0.35, 11.8, 12);
  }

  // ======================= CORRIDOR =======================
  k.room("Corridor", -24, 12, 8, 10);
  for (let x = -22.5; x <= 10.5; x += 3) {
    chochin(x, 2.1, 9, lanternM, 0.95);
    cy(blackM, 0.008, 0.008, 0.4, x, 2.62, 9, 4);
  }
  // bench, flower stand, extinguisher, direction sign
  bx(hinokiM, 1.6, 0.06, 0.4, -14, 0.4, 9.65, { round: true, unit: 0 });
  for (const s of [-1, 1]) bx(hinokiM, 0.06, 0.4, 0.36, -14 + s * 0.7, 0, 9.65);
  col(-14.8, -13.2, 9.45, 9.85, 0, 0.46);
  bx(lacquerM, 0.4, 0.8, 0.3, -2.6, 0, 9.72, { round: true, solid: true });
  lat(ceramicM, [[0, 0], [0.08, 0], [0.12, 0.12], [0.06, 0.3], [0.08, 0.34], [0, 0.34]], -2.6, 0.8, 9.72, 16);
  for (let i = 0; i < 4; i++) sph(i % 2 ? mapleM : shrubM, 0.08, -2.6 + (i - 1.5) * 0.08, 1.25 + (i % 2) * 0.1, 9.72, 1, 1, 1, 8);
  cy(plasticRedM, 0.08, 0.08, 0.5, 11.6, 0, 8.3, 16);
  cy(blackM, 0.03, 0.03, 0.08, 11.6, 0.5, 8.3, 8);
  pl(signM("← 大浴場 · 露天風呂"), 1.2, 0.3, 11.88, 2.0, 9, -PI / 2);
  pl(signM("客室 →"), 0.8, 0.22, -4.3, 2.0, 8.12, 0);
  pl(norenRedM, 1.5, 0.95, 11.86, DH - 0.5, 9, -PI / 2);
  pl(norenRedM, 1.5, 0.95, 11.88, DH - 0.5, 9, PI / 2);
  bx(blackM, 0.03, 0.03, 1.7, 11.87, DH - 0.03, 9);

  // ======================= GENKAN =======================
  k.room("Entrance", -5, 5, 10, 16);
  {
    // noren at the door
    pl(norenInnM, 2.4, 1.0, 0, DH - 0.52, 15.84, PI);
    pl(norenInnM, 2.4, 1.0, 0, DH - 0.52, 15.86, 0);
    bx(blackM, 2.7, 0.04, 0.04, 0, DH - 0.02, 15.85);
    // shoe boxes (getabako) left + right on the doma
    for (const s of [-1, 1]) {
      const f = F(s * 4.72, 14.5, s > 0 ? -PI / 2 : PI / 2);
      f.bx(darkWoodM, 2.6, 1.3, 0.45, 0, 0, 0, { solid: true, round: true, unit: 0 });
      f.pl(getaM, 2.5, 1.2, 0, 0.65, 0.231);
      f.bx(darkWoodM, 2.7, 0.05, 0.5, 0, 1.3, 0);
      // umbrella stand + potted plant on top
      f.lat(ceramicM, [[0, 0], [0.12, 0], [0.13, 0.1], [0.1, 0.2], [0, 0.2]], 0.9, 1.35, 0, 16);
      f.sph(shrubM, 0.18, 0.9, 1.65, 0, 1, 0.8, 1);
    }
    cy(bambooDryM, 0.15, 0.15, 0.55, -3.9, 0, 15.5, 16);
    for (let i = 0; i < 4; i++) cy(i % 2 ? plasticBlueM : blackM, 0.012, 0.012, 0.85, -3.95 + (i % 2) * 0.08, 0.3, 15.45 + Math.floor(i / 2) * 0.08, 6);
    col(-4.1, -3.7, 15.3, 15.7, 0, 0.6);
    // slippers lined up on the raised floor + shoes on the doma
    const slipGeo = () => boxGeo(0.11, 0.035, 0.27);
    for (let i = 0; i < 12; i++) for (const s of [-1, 1]) inst("slip", slipGeo, fabricM, { pos: [-3 + i * 0.5 + s * 0.07, 0.17, 12.6], color: i % 3 === 0 ? "#6a2a30" : "#3a4a7a" });
    for (let i = 0; i < 5; i++) for (const s of [-1, 1]) inst("shoe", () => boxGeo(0.1, 0.08, 0.26), blackM, { pos: [-2.2 + i * 0.9 + s * 0.07, 0.04, 13.5 + (i % 2) * 0.15], rotY: (i - 2) * 0.1 });
    // reception counter with bell, register book, lamp
    const f = F(3.4, 11.4, -PI / 2);
    f.bx(darkWoodM, 2.2, 0.95, 0.6, 0, 0.15, 0, { solid: true, round: true, unit: 0 });
    f.bx(lacquerM, 2.35, 0.05, 0.75, 0, 1.1, 0.05);
    f.bx(hinokiM, 2.1, 0.8, 0.02, 0, 0.2, 0.31, { unit: 0 });
    f.cy(brassM, 0.04, 0.05, 0.05, 0.6, 1.15, 0.1, 16);
    f.sph(brassM, 0.03, 0.6, 1.21, 0.1);
    f.bx(whiteM, 0.35, 0.03, 0.25, -0.2, 1.15, 0.12);
    f.lat(andonM, [[0, 0], [0.1, 0], [0.12, 0.2], [0.08, 0.3], [0, 0.3]], -0.8, 1.15, 0, 16);
    // maneki-neko
    f.lat(ceramicM, [[0, 0], [0.09, 0], [0.1, 0.05], [0.09, 0.13], [0.06, 0.18], [0, 0.19]], 0.2, 1.15, -0.05, 16);
    f.sph(ceramicM, 0.08, 0.2, 1.41, -0.05, 1.05, 0.9, 1);
    f.sph(plasticRedM, 0.02, 0.2, 1.32, 0.03);
    // byobu behind counter + big vase with branches
    for (let i = 0; i < 4; i++) {
      const g = new THREE.BoxGeometry(0.6, 1.6, 0.03);
      const uv = g.attributes.uv as THREE.BufferAttribute;
      for (let j = 0; j < uv.count; j++) uv.setX(j, (i + uv.getX(j)) / 4);
      put(byobuM, xf(g, -4.72 + (i % 2 ? 0.14 : 0), 0.15 + 0.8, 10.7 + i * 0.56, PI / 2 + (i % 2 ? 0.35 : -0.35)));
    }
    col(-4.9, -4.5, 10.4, 12.7, 0, 1.75);
    lat(celadonM, [[0, 0], [0.18, 0.01], [0.26, 0.2], [0.2, 0.55], [0.12, 0.7], [0.15, 0.76], [0, 0.74]], -1.6, 0.15, 10.6, 24);
    col(-1.85, -1.35, 10.35, 10.85, 0, 0.9);
    for (let i = 0; i < 3; i++) tb(barkM, [[-1.6, 0.8, 10.6], [-1.6 + (i - 1) * 0.3, 1.4, 10.6 + 0.1], [-1.6 + (i - 1) * 0.6, 1.9, 10.7]], 0.015, 10, 5);
    for (let i = 0; i < 16; i++) inst("leafSmall", () => new THREE.PlaneGeometry(0.28, 0.28), i % 2 ? mapleM : maple2M, { pos: [-1.6 + (Math.sin(i * 2.3)) * 0.6, 1.5 + (i % 5) * 0.12, 10.7 + Math.cos(i * 1.7) * 0.25], rotY: i, rotX: 0.7 });
    // wooden bench on the doma + name board
    bx(hinokiM, 1.6, 0.06, 0.45, 2.5, 0.42, 15.5, { round: true, unit: 0 });
    for (const s of [-1, 1]) bx(hinokiM, 0.06, 0.42, 0.4, 2.5 + s * 0.7, 0, 15.5);
    col(1.7, 3.3, 15.28, 15.72, 0, 0.48);
    pl(signM("湯の宿 月見荘", false, "#3a2618", "#f0dcb0"), 2.2, 0.55, 0, 2.62, 10.12, 0);
    pl(signM("湯の宿 月見荘", false, "#3a2618", "#f0dcb0"), 2.2, 0.55, 0, 2.62, 16.26, 0);
  }

  // ======================= SOUVENIR SHOP =======================
  k.room("Gift Shop", -12, -5, 10, 16);
  {
    const boxGeoS = () => boxGeo(0.22, 0.14, 0.18);
    const colsS = ["#c23a2a", "#e8d6a0", "#2a5a8a", "#6a8a3a", "#e6a030", "#f2f0e8", "#8a3a6a"];
    const shelf = (x: number, z: number, ry: number, w: number, seed: number) => {
      const f = F(x, z, ry);
      const r = rng(seed);
      f.bx(hinokiM, w, 1.8, 0.04, 0, 0, -0.2, { unit: 0 });
      for (const s of [-1, 1]) f.bx(hinokiM, 0.04, 1.8, 0.42, s * (w / 2 - 0.02), 0, 0, { unit: 0 });
      for (let i = 0; i < 4; i++) {
        const y = 0.1 + i * 0.44;
        f.bx(hinokiM, w, 0.03, 0.42, 0, y, 0, { unit: 0 });
        for (let j = 0; j < Math.floor(w / 0.26); j++) {
          if (r() < 0.2) continue;
          inst("gift", boxGeoS, fabricM, { pos: [f.wx(-w / 2 + 0.16 + j * 0.26, 0.02), y + 0.1, f.wz(-w / 2 + 0.16 + j * 0.26, 0.02)], rotY: ry + (r() - 0.5) * 0.2, color: colsS[Math.floor(r() * colsS.length)], scale: [1, 0.8 + r() * 0.6, 1] });
        }
      }
      f.col(-w / 2, w / 2, -0.22, 0.21, 0, 1.8);
    };
    shelf(-8.5, 15.6, PI, 3.2, 3);
    shelf(-11.6, 11.6, PI / 2, 2.4, 5);
    shelf(-8.0, 12.6, 0, 2.2, 7);
    shelf(-8.0, 13.45, PI, 2.2, 9);
    // counter + register + daruma
    bx(darkWoodM, 0.6, 0.95, 1.6, -5.6, 0, 11.4, { solid: true, round: true, unit: 0 });
    bx(blackM, 0.3, 0.15, 0.3, -5.6, 0.95, 11.2, { round: true });
    for (let i = 0; i < 3; i++) sph(plasticRedM, 0.12 - i * 0.02, -5.6, 1.07 - i * 0.01, 11.75 + i * 0.25, 1, 1.1, 1);
    // yukata rack
    tb(steelM, [[-11.5, 0, 15.2], [-11.5, 1.7, 15.2], [-10.3, 1.7, 15.2], [-10.3, 0, 15.2]], 0.02, 24, 6);
    for (let i = 0; i < 6; i++) bx(i % 2 ? yukataM : redFeltM, 0.05, 1.1, 0.5, -11.35 + i * 0.2, 0.55, 15.2);
    col(-11.6, -10.2, 14.9, 15.5, 0, 1.7);
    // ice-cream chest freezer
    bx(whiteM, 1.2, 0.85, 0.7, -10.8, 0, 10.5, { solid: true, round: true });
    bx(glassM, 1.1, 0.02, 0.6, -10.8, 0.86, 10.5, { unit: 0 });
  }

  // ======================= GAME CORNER =======================
  k.room("Game Corner", 5, 12, 10, 16);
  {
    // ping-pong table
    const x = 8.5, z = 13;
    bx(ppM, 2.74, 0.04, 1.525, x, 0.72, z, { unit: 0 });
    bx(blackM, 2.7, 0.06, 1.45, x, 0.66, z);
    for (const s of [-1, 1]) {
      bx(ironM, 0.06, 0.66, 1.2, x + s * 0.9, 0, z);
      bx(ironM, 0.1, 0.05, 1.4, x + s * 0.9, 0, z);
    }
    bx(whiteM, 0.01, 0.15, 1.72, x, 0.76, z);
    for (const s of [-1, 1]) cy(steelM, 0.015, 0.015, 0.18, x, 0.74, z + s * 0.86, 8);
    col(x - 1.37, x + 1.37, z - 0.77, z + 0.77, 0, 0.76);
    for (const s of [-1, 1]) {
      const g = new THREE.CylinderGeometry(0.08, 0.08, 0.012, 20);
      put(plasticRedM, xf(g, x + s * 0.9, 0.77, z + s * 0.3));
      bx(hinokiM, 0.1, 0.02, 0.03, x + s * 1.02, 0.765, z + s * 0.3, { unit: 0 });
    }
    sph(whiteM, 0.02, x + 0.4, 0.78, z - 0.2);
    // vending machines
    const vend = (vx: number, vz: number, ry: number, front: Mat, body: Mat) => {
      const f = F(vx, vz, ry);
      f.bx(body, 1.0, 1.83, 0.75, 0, 0, 0, { solid: true });
      f.pl(front, 0.92, 1.76, 0, 0.95, 0.376);
      f.bx(blackM, 1.02, 0.06, 0.77, 0, 1.83, 0);
    };
    vend(6.0, 15.45, PI, vendRedM, vendBodyR);
    vend(7.1, 15.45, PI, vendBlueM, vendBodyB);
    bx(plasticBlueM, 0.4, 0.8, 0.4, 7.95, 0, 15.6, { solid: true, round: true });
    bx(plasticRedM, 0.4, 0.8, 0.4, 8.4, 0, 15.6, { solid: true, round: true });
    // arcade cabinet (extruded side profile)
    {
      const sh = new THREE.Shape();
      sh.moveTo(0, 0); sh.lineTo(0.8, 0); sh.lineTo(0.8, 0.8); sh.lineTo(0.55, 0.95); sh.lineTo(0.5, 1.6); sh.lineTo(0.6, 1.85); sh.lineTo(0, 1.85); sh.closePath();
      const f = F(11.2, 15.2, PI);
      for (const s of [-1, 1]) f.geo(blackM, new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: false }).translate(-0.4, 0, 0), s * 0.34, 0, 0, PI / 2);
      f.bx(plasticBlueM, 0.64, 0.8, 0.7, 0, 0, 0, { solid: false });
      f.bx(tvM, 0.64, 0.7, 0.3, 0, 0.95, -0.2);
      f.pl(screenM, 0.5, 0.4, 0, 1.3, -0.04, 0, -0.2);
      f.bx(blackM, 0.64, 0.06, 0.28, 0, 0.84, 0.25, { rx: 0.2 });
      f.sph(plasticRedM, 0.025, -0.12, 0.93, 0.28);
      f.sph(plasticRedM, 0.025, 0.1, 0.93, 0.28);
      f.cy(steelM, 0.008, 0.008, 0.08, -0.2, 0.9, 0.24, 6);
      f.pl(signM("GAME", false, "#1a1a3a", "#ffd23a"), 0.6, 0.18, 0, 1.75, 0.2);
      f.col(-0.42, 0.42, -0.45, 0.45, 0, 1.85);
    }
    // waiting bench
    bx(leatherM, 1.8, 0.12, 0.45, 10.3, 0.35, 10.4, { round: true });
    for (const s of [-1, 1]) bx(steelM, 0.05, 0.35, 0.4, 10.3 + s * 0.8, 0, 10.4);
    col(9.4, 11.2, 10.17, 10.63, 0, 0.47);
    pl(signM("卓球 ¥300/30分", false, "#f0e6d0", "#3a2a20"), 1.2, 0.3, 5.14, 1.9, 11.6, PI / 2);
  }

  // ======================= CHANGING ROOM =======================
  k.room("Changing Room", 12, 24, 8, 16);
  {
    // lockers along the east wall
    for (const lz of [10.0, 12.2]) {
      const f = F(23.62, lz, -PI / 2);
      f.bx(hinokiM, 2.1, 1.85, 0.5, 0, 0, 0, { solid: true, unit: 0 });
      f.pl(lockerM, 2.0, 1.75, 0, 0.94, 0.252);
    }
    // basket shelves along the south wall
    const basketGeo = () => new THREE.LatheGeometry(V2([[0, 0], [0.16, 0], [0.19, 0.2], [0.18, 0.2], [0.15, 0.015], [0, 0.015]]), 14);
    for (const sx of [14.1, 16.6, 19.1]) {
      const f = F(sx, 15.6, PI);
      f.bx(hinokiM, 2.3, 1.5, 0.04, 0, 0, -0.22, { unit: 0 });
      for (const s of [-1, 0, 1]) f.bx(hinokiM, 0.04, 1.5, 0.46, s * 1.13, 0, 0, { unit: 0 });
      for (let i = 0; i < 3; i++) {
        const y = 0.08 + i * 0.48;
        f.bx(hinokiM, 2.3, 0.03, 0.46, 0, y, 0, { unit: 0 });
        for (let j = 0; j < 4; j++) {
          const lx = -0.85 + j * 0.56 + (j > 1 ? 0.02 : 0);
          inst("basket", basketGeo, rattanM, { pos: [f.wx(lx, 0), y + 0.03, f.wz(lx, 0)], scale: [1.2, 1, 1] });
          if ((i + j + Math.round(sx)) % 3 === 0) inst("towelF", () => boxGeo(0.3, 0.06, 0.22), towelM, { pos: [f.wx(lx, 0), y + 0.1, f.wz(lx, 0)] });
        }
      }
      f.col(-1.15, 1.15, -0.24, 0.23, 0, 1.5);
    }
    // vanity with mirrors, stools and hair dryers along the north wall
    for (const [a, b] of [[12.6, 16.8], [19.4, 23.2]] as [number, number][]) {
      const w = b - a, cx = (a + b) / 2;
      bx(whiteM, w, 0.06, 0.5, cx, 0.78, 8.38, { round: true });
      bx(darkWoodM, w, 0.7, 0.44, cx, 0.08, 8.36, { unit: 0 });
      col(a, b, 8.1, 8.63, 0, 0.84);
      pl(mirrorM, w - 0.2, 0.9, cx, 1.5, 8.115, 0);
      bx(darkWoodM, w, 0.06, 0.04, cx, 1.96, 8.12);
      for (let x = a + 0.5; x < b - 0.3; x += 1.0) {
        const g = new THREE.CylinderGeometry(0.035, 0.04, 0.16, 10);
        put(blackM, xf(g, x, 0.9, 8.3, 0, PI / 2));
        bx(blackM, 0.05, 0.1, 0.05, x, 0.84, 8.25);
        lat(plasticBlueM, [[0, 0], [0.04, 0], [0.04, 0.2], [0.02, 0.24], [0, 0.24]], x + 0.25, 0.84, 8.35, 10);
        cy(hinokiM, 0.17, 0.17, 0.05, x, 0.42, 8.95, 16);
        cy(steelM, 0.03, 0.05, 0.42, x, 0, 8.95, 8);
        col(x - 0.17, x + 0.17, 8.78, 9.12, 0, 0.47);
      }
    }
    // massage chair
    {
      const f = F(12.85, 11.1, PI / 2);
      f.bx(leatherM, 0.85, 0.42, 0.9, 0, 0, 0, { round: true });
      f.bx(leatherM, 0.8, 0.16, 0.7, 0, 0.42, 0.05, { round: true });
      f.bx(leatherM, 0.8, 0.95, 0.28, 0, 0.45, -0.4, { round: true, rx: -0.3 });
      f.bx(leatherM, 0.62, 0.22, 0.2, 0, 1.3, -0.62, { round: true, rx: -0.3 });
      for (const s of [-1, 1]) f.bx(leatherM, 0.2, 0.5, 0.9, s * 0.42, 0.25, 0, { round: true });
      f.bx(leatherM, 0.55, 0.45, 0.2, 0, 0.05, 0.6, { round: true, rx: 0.5 });
      f.bx(blackM, 0.12, 0.05, 0.08, 0.42, 0.76, 0.3);
      f.col(-0.52, 0.52, -0.7, 0.72, 0, 1.3);
    }
    pl(signM("マッサージ ¥100", false, "#f0e6d0", "#3a2a20"), 0.8, 0.22, 12.14, 1.9, 11.1, PI / 2);
    // central bench, scale, water cooler, fan, towel bin
    bx(hinokiM, 3.2, 0.08, 0.5, 18.2, 0.37, 12.2, { round: true, unit: 0 });
    for (const s of [-1, 0, 1]) bx(hinokiM, 0.08, 0.37, 0.44, 18.2 + s * 1.45, 0, 12.2);
    col(16.6, 19.8, 11.95, 12.45, 0, 0.45);
    bx(whiteM, 0.35, 0.08, 0.35, 21.4, 0, 14.6, { round: true });
    lat(whiteM, [[0, 0], [0.06, 0], [0.04, 0.9], [0.14, 0.95], [0.14, 1.05], [0, 1.05]], 21.4, 0, 14.45, 14);
    cy(tvM, 0.1, 0.1, 0.02, 21.4, 0.98, 14.52, 16, { rx: PI / 2 });
    col(21.2, 21.6, 14.3, 14.8, 0, 1.05);
    bx(whiteM, 0.35, 1.0, 0.35, 22.6, 0, 14.9, { round: true, solid: true });
    lat(glassM, [[0, 0], [0.13, 0], [0.14, 0.35], [0.06, 0.42], [0, 0.42]], 22.6, 1.0, 14.9, 14);
    // electric fan
    lat(whiteM, [[0, 0], [0.16, 0], [0.12, 0.05], [0.02, 0.06], [0.02, 1.1], [0, 1.1]], 15.2, 0, 13.6, 14);
    cy(plasticBlueM, 0.2, 0.2, 0.05, 15.2, 1.1, 13.7, 20, { rx: PI / 2 });
    lat(rattanM, [[0, 0], [0.24, 0], [0.26, 0.55], [0, 0.55]], 13.1, 0, 15.2, 16);
    col(12.85, 13.35, 14.95, 15.45, 0, 0.55);
    // noren towards the bath
    pl(norenBlueM, 1.6, 0.95, 18, DH - 0.5, 8.2, 0);
    pl(norenBlueM, 1.6, 0.95, 18, DH - 0.5, 8.18, PI);
    bx(blackM, 1.8, 0.03, 0.03, 18, DH - 0.03, 8.19);
  }

  // ======================= INDOOR BATH =======================
  k.room("Indoor Bath", 12, 24, 0, 8);
  {
    // hinoki tub with a spout
    const x1 = 13.6, x2 = 19.8, z1 = 1.3, z2 = 4.5;
    for (const [w, d, x, z] of [[x2 - x1, 0.14, (x1 + x2) / 2, z1], [x2 - x1, 0.14, (x1 + x2) / 2, z2], [0.14, z2 - z1, x1, (z1 + z2) / 2], [0.14, z2 - z1, x2, (z1 + z2) / 2]] as [number, number, number, number][]) {
      bx(hinokiWetM, w + 0.14, 0.45, d, x, 0, z);
      col(x - w / 2 - 0.07, x + w / 2 + 0.07, z - d / 2, z + d / 2, 0, 0.45);
    }
    bx(hinokiWetM, x2 - x1, 0.05, z2 - z1, (x1 + x2) / 2, 0, (z1 + z2) / 2);
    bx(bathWaterM, x2 - x1 - 0.1, 0.02, z2 - z1 - 0.1, (x1 + x2) / 2, 0.36, (z1 + z2) / 2, { unit: 0 });
    bx(hinokiWetM, 0.3, 0.3, 0.3, x1 + 0.3, 0.45, z1 + 0.1, { round: true, solid: true });
    bx(hinokiWetM, 0.12, 0.08, 0.35, x1 + 0.3, 0.62, z1 + 0.35);
    bx(streamM, 0.06, 0.3, 0.02, x1 + 0.3, 0.36, z1 + 0.52, { unit: 0 });
    // wash stations along the east wall
    for (let i = 0; i < 6; i++) {
      const z = 0.8 + i * 1.15;
      const f = F(23.88, z, -PI / 2);
      f.pl(mirrorM, 0.5, 0.6, 0, 1.25, 0.01);
      f.bx(whiteM, 0.9, 0.04, 0.18, 0, 0.8, 0.09);
      f.cy(chromeM, 0.02, 0.02, 0.12, -0.15, 0.62, 0.08, 8);
      f.cy(chromeM, 0.02, 0.02, 0.12, 0.15, 0.62, 0.08, 8);
      f.bx(chromeM, 0.36, 0.04, 0.04, 0, 0.66, 0.1);
      f.cy(chromeM, 0.035, 0.02, 0.1, 0, 1.75, 0.1, 10, { rx: 0.6 });
      f.cy(chromeM, 0.012, 0.012, 0.9, 0.3, 0.85, 0.05, 6);
      f.lat(i % 2 ? whiteM : plasticBlueM, [[0, 0], [0.035, 0], [0.035, 0.18], [0.015, 0.22], [0, 0.22]], -0.3, 0.84, 0.08, 10);
      f.lat(whiteM, [[0, 0], [0.03, 0], [0.03, 0.15], [0.012, 0.19], [0, 0.19]], -0.2, 0.84, 0.08, 10);
      // stool + bucket
      inst("stool", () => mg([xf(boxGeo(0.34, 0.04, 0.26), 0, 0.23, 0), xf(new THREE.BoxGeometry(0.04, 0.21, 0.24), -0.15, 0.105, 0), xf(new THREE.BoxGeometry(0.04, 0.21, 0.24), 0.15, 0.105, 0)]), hinokiWetM, { pos: [f.wx(0, 0.6), 0, f.wz(0, 0.6)], rotY: -PI / 2 });
      inst("bucket", () => new THREE.LatheGeometry(V2([[0, 0], [0.13, 0], [0.145, 0.2], [0.135, 0.2], [0.12, 0.015], [0, 0.015]]), 16), hinokiWetM, { pos: [f.wx(0.35, 0.35), 0, f.wz(0.35, 0.35)] });
      inst("hoop", () => new THREE.TorusGeometry(0.14, 0.007, 4, 18).rotateX(PI / 2), brassM, { pos: [f.wx(0.35, 0.35), 0.15, f.wz(0.35, 0.35)] });
    }
    k.collider(23.5, 23.9, 0.2, 7.8, 0, 0.84, true);
    bx(tileWM, 0.3, 0.8, 7.6, 23.75, 0, 4, { unit: 0.8 });
    // bucket + stool pyramid near the door
    for (let i = 0; i < 6; i++) {
      const lv = i < 3 ? 0 : i < 5 ? 1 : 2;
      const off = i < 3 ? i - 1 : i < 5 ? i - 3.5 : 0;
      inst("bucket", () => new THREE.LatheGeometry(V2([[0, 0], [0.13, 0], [0.145, 0.2], [0.135, 0.2], [0.12, 0.015], [0, 0.015]]), 16), hinokiWetM, { pos: [21 + off * 0.3, lv * 0.2, 7.5], rotX: PI, scale: [1, 1, 1] });
    }
    col(20.5, 21.5, 7.3, 7.7, 0, 0.62);
    for (let i = 0; i < 4; i++) inst("stool", () => mg([xf(boxGeo(0.34, 0.04, 0.26), 0, 0.23, 0), xf(new THREE.BoxGeometry(0.04, 0.21, 0.24), -0.15, 0.105, 0), xf(new THREE.BoxGeometry(0.04, 0.21, 0.24), 0.15, 0.105, 0)]), hinokiWetM, { pos: [15 + (i % 2) * 0.02, i * 0.25, 7.5] });
    col(14.8, 15.2, 7.35, 7.65, 0, 1.0);
    pl(signM("大浴場", true, "#3a2618", "#f0dcb0"), 0.35, 1.2, 12.12, 1.6, 6.5, PI / 2);
    // wall tiles above the dado on the lounge side of x=12 (bath face)
    pl(signM("かけ湯をしてから入浴して下さい", false, "#f0e6d0", "#3a2a20"), 1.6, 0.26, 16.7, 1.7, 0.12, 0);
  }

  // ======================= LOUNGE =======================
  k.room("Garden Lounge", -5, 12, 0, 8);
  {
    // irori hearth: sunken frame with ash, kettle on a jizai-kagi
    const ix = 0, iz = 4.8;
    bx(darkWoodM, 1.8, 0.2, 1.8, ix, 0, iz, { unit: 0 });
    bx(k.mat(null, "#7a746a", [1, 1], { roughness: 1 }), 1.5, 0.02, 1.5, ix, 0.2, iz);
    col(ix - 0.9, ix + 0.9, iz - 0.9, iz + 0.9, 0, 0.2);
    lat(ironM, [[0, 0], [0.12, 0.01], [0.17, 0.1], [0.14, 0.2], [0.05, 0.23], [0.05, 0.26], [0, 0.26]], ix, 0.55, iz, 18);
    cy(bambooDryM, 0.03, 0.03, 2.2, ix, 0.8, iz, 8);
    bx(darkWoodM, 0.35, 0.12, 0.05, ix, 1.3, iz);
    for (let i = 0; i < 3; i++) cy(k.mat(null, "#ff6a20", [1, 1], { emissive: "#ff4010", emissiveIntensity: 1.5 }), 0.03, 0.03, 0.25, ix + (i - 1) * 0.08, 0.26, iz, 6, { rz: PI / 2 });
    for (const [dx, dz] of [[-1.3, 0], [1.3, 0], [0, -1.3], [0, 1.3]]) zab(ix + dx, iz + dz, "#6a4a20", 0);
    // low sofas facing the garden
    for (const sx of [5.5, 8.3]) {
      const f = F(sx, 2.3, PI);
      f.bx(leatherM, 1.9, 0.38, 0.85, 0, 0, 0, { round: true });
      f.bx(fabricM, 1.7, 0.12, 0.7, 0, 0.38, 0.05, { round: true });
      f.bx(leatherM, 1.9, 0.5, 0.2, 0, 0.38, 0.35, { round: true });
      for (const s of [-1, 1]) f.bx(leatherM, 0.18, 0.28, 0.85, s * 0.86, 0.38, 0, { round: true });
      f.col(-0.95, 0.95, -0.43, 0.43, 0, 0.66);
    }
    lowTable(6.9, 1.0, 1.2, 0.6, false);
    lat(ceramicM, [[0, 0], [0.05, 0], [0.07, 0.08], [0.03, 0.16], [0, 0.16]], 6.9, 0.35, 1.0, 12);
    // bookshelf + tea station along the corridor wall
    {
      const f = F(-3.2, 7.78, PI);
      f.bx(darkWoodM, 2.4, 1.9, 0.36, 0, 0, 0, { solid: true, round: true, unit: 0 });
      const r = rng(77);
      for (let s = 0; s < 4; s++) for (let i = 0; i < 18; i++) {
        if (r() < 0.15) continue;
        inst("book", () => new THREE.BoxGeometry(0.035, 0.24, 0.2), fabricM, { pos: [f.wx(-1.1 + i * 0.125, 0.12), 0.18 + s * 0.44 + 0.12, f.wz(-1.1 + i * 0.125, 0.12)], rotY: PI, scale: [1 + r(), 0.8 + r() * 0.4, 1], color: ["#8a2a1a", "#2a4a6a", "#d8c8a0", "#3a5a2a", "#6a4a8a"][Math.floor(r() * 5)] });
      }
      for (let s = 0; s < 4; s++) f.bx(darkWoodM, 2.3, 0.02, 0.34, 0, 0.16 + s * 0.44, 0.02, { unit: 0 });
    }
    {
      const f = F(9.2, 7.7, PI);
      f.bx(hinokiM, 2.4, 0.9, 0.55, 0, 0, 0, { solid: true, round: true, unit: 0 });
      f.lat(steelM, [[0, 0], [0.12, 0], [0.12, 0.35], [0.08, 0.4], [0, 0.4]], -0.7, 0.9, 0, 16);
      f.lat(celadonM, [[0, 0], [0.07, 0.01], [0.09, 0.06], [0.07, 0.12], [0.02, 0.13], [0, 0.14]], 0.1, 0.9, 0, 14);
      for (let i = 0; i < 5; i++) f.lat(ceramicM, [[0, 0], [0.03, 0], [0.04, 0.06], [0.036, 0.06], [0.026, 0.008], [0, 0.008]], 0.4 + i * 0.1, 0.9, 0.1, 10);
    }
    // bonsai on stands + 2nd massage chair + standing lamp
    for (const [bxx, bzz] of [[-4.2, 1.0], [11.2, 1.0]]) {
      bx(darkWoodM, 0.5, 0.6, 0.5, bxx, 0, bzz, { solid: true, round: true });
      bx(celadonM, 0.45, 0.1, 0.3, bxx, 0.6, bzz, { round: true });
      tb(barkM, [[bxx, 0.7, bzz], [bxx + 0.1, 0.85, bzz], [bxx - 0.05, 1.0, bzz + 0.05]], 0.03, 10, 6);
      sph(pinePadM, 0.22, bxx - 0.05, 1.05, bzz + 0.05, 1.2, 0.5, 1);
      sph(pinePadM, 0.15, bxx + 0.15, 0.9, bzz, 1.2, 0.5, 1);
    }
    andon(-4.3, 6.4);
    andon(11.3, 5.2);
    pl(scrollM2, 0.5, 1.3, -4.88, 1.6, 5.5, PI / 2);
  }

  // ======================= FORECOURT =======================
  k.room("Forecourt", -24, 24, 16, 22);
  {
    // outer tsuiji wall with a kawara cap
    const tw = (x1: number, x2: number, z1: number, z2: number) => {
      const w = Math.max(0.4, x2 - x1), d = Math.max(0.4, z2 - z1);
      bx(plasterWhiteM, w, 2.4, d, (x1 + x2) / 2, 0, (z1 + z2) / 2, { solid: true });
      bx(kawaraM, w + 0.3, 0.2, d + 0.3, (x1 + x2) / 2, 2.4, (z1 + z2) / 2);
      bx(postM, w + 0.02, 0.1, d + 0.02, (x1 + x2) / 2, 2.1, (z1 + z2) / 2);
    };
    tw(-24.2, 24.2, 21.8, 22.2);
    tw(-24.4, -24, 16, 22);
    tw(24, 24.4, 16, 22);
    // gate (closed doors) in the south wall
    for (const s of [-1, 1]) { bx(postM, 0.3, 3.2, 0.3, s * 1.8, 0, 21.8, { solid: true }); }
    bx(postM, 4, 0.25, 0.35, 0, 2.9, 21.8);
    bx(kawaraM, 5, 0.25, 1.4, 0, 3.2, 21.8);
    bx(darkWoodM, 3.3, 2.8, 0.1, 0, 0, 21.68, { unit: 1 });
    for (let i = 0; i < 9; i++) bx(ironM, 0.04, 0.04, 0.04, -1.2 + i * 0.3, 1.5, 21.62);
    // stepping flagstones to the entrance
    for (let z = 17.9; z < 21.4; z += 0.75) bx(flagM, 1.6, 0.04, 0.6, (z * 7) % 0.3 - 0.15, -0.02, z, { unit: 1.2 });
    // big lanterns flanking the entrance
    for (const s of [-1, 1]) {
      bx(darkWoodM, 0.12, 1.6, 0.12, s * 2.4, 0, 16.6);
      col(s * 2.4 - 0.3, s * 2.4 + 0.3, 16.35, 16.85, 0, 2.3);
      chochin(s * 2.4, 1.45, 16.6, lanternInnM, 1.4);
    }
    // vertical sign post
    bx(darkWoodM, 0.5, 2.4, 0.12, -3.6, 0, 18.6, { solid: true, unit: 0 });
    pl(signM("湯宿 月見荘", true, "#6b4a2c", "#1a1008"), 0.44, 2.1, -3.6, 1.3, 18.67, 0);
    pl(signM("湯宿 月見荘", true, "#6b4a2c", "#1a1008"), 0.44, 2.1, -3.6, 1.3, 18.53, PI);
    // planters, bench, rickshaw-free cart, bicycle rack
    for (const px of [-6.2, 6.2]) { lat(clayM, [[0, 0], [0.3, 0], [0.38, 0.5], [0, 0.5]], px, 0, 16.7, 18); sph(shrubM, 0.42, px, 0.75, 16.7, 1, 0.8, 1); col(px - 0.38, px + 0.38, 16.32, 17.08, 0, 1.1); }
    bx(redFeltM, 2, 0.08, 0.7, 6.5, 0.45, 19.6, { round: true });
    for (const s of [-1, 1]) bx(darkWoodM, 0.08, 0.45, 0.6, 6.5 + s * 0.85, 0, 19.6);
    col(5.5, 7.5, 19.25, 19.95, 0, 0.53);
    // wagasa parasol over the bench
    cy(darkWoodM, 0.025, 0.025, 2.3, 6.5, 0, 19.2, 8);
    put(lacquerRedM, xf(new THREE.ConeGeometry(1.2, 0.45, 20, 1, true), 6.5, 2.3, 19.2));
    col(6.4, 6.6, 19.1, 19.3, 0, 2.3, false);
    // rain barrel + stone basin
    cy(hinokiM, 0.35, 0.33, 0.8, -8.5, 0, 17, 18);
    for (const y of [0.15, 0.6]) put(ironM, xf(new THREE.TorusGeometry(0.345, 0.012, 4, 24), -8.5, y, 17, 0, PI / 2));
    bx(bathWaterM, 0.6, 0.01, 0.6, -8.5, 0.74, 17, { unit: 0 });
    col(-8.85, -8.15, 16.65, 17.35, 0, 0.8);
  }

  // ======================= NATURE HELPERS =======================
  const rockGeo = (seed: number) => {
    const r = rng(seed * 13 + 1);
    let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, 1);
    g.deleteAttribute("normal"); g.deleteAttribute("uv");
    g = mergeVertices(g);
    const p = g.attributes.position;
    const a1 = r() * 6, a2 = r() * 6, a3 = r() * 6;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const f = 0.86 + 0.2 * Math.sin(x * 2.3 + a1) * Math.cos(z * 2.1 + a2) + 0.12 * Math.sin(y * 3.1 + a3 + x) + (r() - 0.5) * 0.06;
      const yy = Math.max(-0.25, y) * f;
      p.setXYZ(i, x * f * (1 + 0.15 * Math.sin(z * 4 + a1)), yy > 0.55 ? 0.55 + (yy - 0.55) * 0.35 : yy, z * f);
    }
    g.computeVertexNormals();
    return g;
  };
  /** rock: footprint sx × sz, height top */
  const rock = (m: Mat, x: number, z: number, sx: number, top: number, sz: number, seed: number, solid = true, stand = true) => {
    const g = rockGeo(seed);
    g.scale(sx / 2, top / 0.7, sz / 2);
    g.rotateY(seed * 1.7);
    put(m, xf(g, x, -0.02, z), 1.2);
    if (solid) col(x - sx * 0.42, x + sx * 0.42, z - sz * 0.42, z + sz * 0.42, 0, top, stand);
  };
  const leafGeo = () => new THREE.PlaneGeometry(1.0, 1.0);
  const maple = (x: number, z: number, h: number, spread: number, seed: number, m2 = false) => {
    const r = rng(seed);
    const top: V3 = [x + (r() - 0.5) * 0.4, h * 0.55, z + (r() - 0.5) * 0.4];
    tb(barkM, [[x, 0, z], [x + (r() - 0.5) * 0.2, h * 0.25, z], top], 0.13, 12, 8);
    const centers: V3[] = [];
    for (let b = 0; b < 4; b++) {
      const a = b * 1.57 + r();
      const end: V3 = [top[0] + Math.cos(a) * spread * 0.6, h * (0.75 + r() * 0.15), top[2] + Math.sin(a) * spread * 0.6];
      tb(barkM, [top, [(top[0] + end[0]) / 2, (top[1] + end[1]) / 2 + 0.15, (top[2] + end[2]) / 2], end], 0.05, 8, 6);
      centers.push(end);
    }
    centers.push([top[0], h * 0.95, top[2]]);
    for (const c of centers) {
      for (let i = 0; i < 26; i++) {
        const a = r() * 6.28, d = Math.sqrt(r()) * spread * 0.55;
        inst(m2 ? "maple2" : "maple", leafGeo, (m2 ? r() < 0.7 : r() < 0.25) ? maple2M : mapleM, { pos: [c[0] + Math.cos(a) * d, c[1] + (r() - 0.4) * spread * 0.35, c[2] + Math.sin(a) * d], rotY: r() * 6.3, rotX: -1.2 + r() * 0.8, rotZ: r() * 3, scale: [0.9 + r() * 0.5, 0.9 + r() * 0.5, 1] });
      }
    }
    col(x - 0.18, x + 0.18, z - 0.18, z + 0.18, 0, h * 0.55, false);
    col(x - spread * 0.5, x + spread * 0.5, z - spread * 0.5, z + spread * 0.5, h * 0.72, h * 0.8, true);
  };
  const pine = (x: number, z: number, h: number, lean: number, seed: number) => {
    const r = rng(seed);
    const pts: V3[] = [[x, 0, z], [x + lean * 0.3, h * 0.35, z + 0.1], [x + lean * 0.8, h * 0.7, z - 0.1], [x + lean, h, z]];
    tb(barkM, pts, 0.15, 16, 8);
    for (let i = 1; i < 4; i++) {
      const [px, py, pz] = pts[i];
      for (let j = 0; j < 2; j++) {
        const a = r() * 6.28, d = 0.6 + r() * 0.8;
        const e: V3 = [px + Math.cos(a) * d, py + 0.1, pz + Math.sin(a) * d];
        tb(barkM, [[px, py - 0.2, pz], e], 0.04, 4, 5);
        sph(pinePadM, 0.7 + r() * 0.3, e[0], e[1] + 0.12, e[2], 1.2, 0.35, 1, 12);
        for (let q = 0; q < 6; q++) inst("pineL", leafGeo, pineLeafM, { pos: [e[0] + (r() - 0.5) * 1.2, e[1] + 0.25 + r() * 0.1, e[2] + (r() - 0.5) * 1.2], rotX: -PI / 2 + (r() - 0.5) * 0.5, rotZ: r() * 3, scale: [1.1, 1.1, 1] });
      }
    }
    col(x - 0.2, x + 0.2, z - 0.2, z + 0.2, 0, h * 0.7, false);
  };
  const stoneLantern = (x: number, z: number, kind: "kasuga" | "yukimi", s = 1) => {
    if (kind === "kasuga") {
      lat(stoneM, [[0.34 * s, 0], [0.34 * s, 0.14 * s], [0.14 * s, 0.22 * s], [0.1 * s, 0.95 * s], [0.3 * s, 1.0 * s], [0.3 * s, 1.1 * s]], x, 0, z, 6);
      bx(glowM, 0.3 * s, 0.34 * s, 0.3 * s, x, 1.1 * s, z);
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bx(stoneM, 0.08 * s, 0.36 * s, 0.08 * s, x + dx * 0.15 * s, 1.1 * s, z + dz * 0.15 * s, { unit: 0 });
      put(stoneM, xf(new THREE.ConeGeometry(0.5 * s, 0.34 * s, 6), x, 1.63 * s, z));
      sph(stoneM, 0.08 * s, x, 1.86 * s, z, 1, 1.2, 1, 8);
      col(x - 0.35 * s, x + 0.35 * s, z - 0.35 * s, z + 0.35 * s, 0, 1.9 * s);
    } else {
      for (let i = 0; i < 3; i++) { const a = i * 2.09 + 0.3; tb(stoneM, [[x + Math.cos(a) * 0.45 * s, 0, z + Math.sin(a) * 0.45 * s], [x + Math.cos(a) * 0.3 * s, 0.35 * s, z + Math.sin(a) * 0.3 * s], [x + Math.cos(a) * 0.18 * s, 0.5 * s, z + Math.sin(a) * 0.18 * s]], 0.06 * s, 8, 6); }
      cy(stoneM, 0.34 * s, 0.34 * s, 0.1 * s, x, 0.5 * s, z, 6);
      bx(glowM, 0.3 * s, 0.28 * s, 0.3 * s, x, 0.6 * s, z);
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bx(stoneM, 0.07 * s, 0.3 * s, 0.07 * s, x + dx * 0.15 * s, 0.6 * s, z + dz * 0.15 * s, { unit: 0 });
      put(stoneM, xf(new THREE.ConeGeometry(0.8 * s, 0.28 * s, 6), x, 1.04 * s, z));
      sph(stoneM, 0.1 * s, x, 1.22 * s, z, 1, 0.9, 1, 8);
      col(x - 0.5 * s, x + 0.5 * s, z - 0.5 * s, z + 0.5 * s, 0, 1.3 * s);
    }
  };
  const shrub = (x: number, z: number, s: number, c = "#ffffff") => {
    inst("shrub", () => new THREE.SphereGeometry(1, 14, 10), shrubM, { pos: [x, s * 0.45, z], scale: [s, s * 0.7, s], color: c });
    if (s > 0.45) col(x - s * 0.8, x + s * 0.8, z - s * 0.8, z + s * 0.8, 0, s * 1.1, true);
  };
  /** bamboo fence panel run (along x at z=c or along z at x=c) */
  const bFence = (axis: "x" | "z", c: number, a1: number, a2: number, h: number, gaps: [number, number][] = []) => {
    let cur = a1;
    const segs: [number, number][] = [];
    for (const [gc, gw] of [...gaps].sort((a, b) => a[0] - b[0])) { segs.push([cur, gc - gw / 2]); cur = gc + gw / 2; }
    segs.push([cur, a2]);
    for (const [s, e] of segs) {
      if (e - s < 0.05) continue;
      const mid = (s + e) / 2, len = e - s;
      if (axis === "x") { bx(bFenceM, len, h, 0.08, mid, 0, c); col(s, e, c - 0.1, c + 0.1, 0, h); }
      else { bx(bFenceM, 0.08, h, len, c, 0, mid); col(c - 0.1, c + 0.1, s, e, 0, h); }
      for (let p = s; p <= e + 0.01; p += Math.max(1.5, len / Math.ceil(len / 1.8))) {
        if (axis === "x") cy(barkM, 0.06, 0.06, h + 0.1, Math.min(p, e), 0, c, 8);
        else cy(barkM, 0.06, 0.06, h + 0.1, c, 0, Math.min(p, e), 8);
      }
      if (axis === "x") cy(bambooDryM, 0.05, 0.05, len, mid, h, c, 8, { rz: PI / 2 });
      else cy(bambooDryM, 0.05, 0.05, len, c, h, mid, 8, { rx: PI / 2 });
    }
  };

  // ======================= GARDEN =======================
  k.room("Garden", -24, 4, -20, -2.4);
  bFence("z", -24, -20, -2.4, 2.4);
  bFence("x", -20, -24, 4, 2.4);
  bFence("z", 4, -20, 0, 2.2, [[-12, 1.8]]);
  // gate frame in the dividing fence
  for (const s of [-1, 1]) cy(barkM, 0.08, 0.08, 2.5, 4, 0, -12 + s * 0.95, 10);
  cy(barkM, 0.07, 0.07, 2.3, 4, 2.4, -12, 10, { rx: PI / 2 });
  put(kawaraM, xf(new THREE.BoxGeometry(0.9, 0.08, 2.5), 4, 2.6, -12, 0, 0, 0), 1);
  {
    // koi pond
    const px = -13, pz = -12, rx = 5, rz = 3;
    const disc = new THREE.CircleGeometry(1, 40);
    disc.scale(rx, rz, 1);
    put(pondBedM, xf(disc.clone(), px, 0.005, pz, 0, -PI / 2));
    put(pondM, xf(disc.clone().scale(0.98, 0.98, 1), px, 0.22, pz, 0, -PI / 2));
    const r = rng(404);
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * PI * 2;
      const sx = 0.6 + r() * 0.5;
      const x = px + Math.cos(a) * (rx + 0.1), z = pz + Math.sin(a) * (rz + 0.1);
      if (Math.abs(x - px) < 1.0) continue; // leave room for the bridge ends
      rock(i % 3 ? rockM : stoneM, x, z, sx, 0.25 + r() * 0.18, 0.5 + r() * 0.4, i + 40);
    }
    // koi
    const koiGeo = () => { const g = new THREE.SphereGeometry(0.12, 10, 6); g.scale(1.9, 0.5, 0.7); return g; };
    const kc = ["#ff7a20", "#ffffff", "#e03a1a", "#ffb040", "#f8f0e0", "#1a1a1a"];
    for (let i = 0; i < 14; i++) {
      const a = r() * 6.28, d = 0.3 + r() * 0.6;
      inst("koi", koiGeo, koiM, { pos: [px + Math.cos(a) * rx * d, 0.08, pz + Math.sin(a) * rz * d], rotY: r() * 6.28, color: kc[i % kc.length] });
    }
    // lily pads
    for (let i = 0; i < 10; i++) { const a = r() * 6.28, d = 0.5 + r() * 0.4; inst("pad", () => new THREE.CircleGeometry(0.2, 12).rotateX(-PI / 2), shrubM, { pos: [px + Math.cos(a) * rx * d, 0.225, pz + Math.sin(a) * rz * d], color: "#6a9a4a" }, true); }
    // arched wooden bridge across the pond (north-south at x = px)
    const n = 10, z1 = pz - rz - 0.9, z2 = pz + rz + 0.9, L = (z2 - z1) / n;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const y = 0.15 + 0.5 * Math.sin(PI * t);
      const zz = z1 + L * (i + 0.5);
      col(px - 0.75, px + 0.75, zz - L / 2, zz + L / 2, 0, y, true);
    }
    for (let i = 0; i < 44; i++) {
      const t = (i + 0.5) / 44;
      const y = 0.15 + 0.5 * Math.sin(PI * t);
      const ang = Math.atan((0.5 * PI * Math.cos(PI * t)) / (z2 - z1));
      bx(darkWoodM, 1.5, 0.06, (z2 - z1) / 44 - 0.012, px, y - 0.06, z1 + (z2 - z1) * t, { rx: -ang, unit: 1 });
    }
    for (const s of [-1, 1]) {
      const pts: V3[] = [];
      for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push([px + s * 0.6, 0.15 + 0.5 * Math.sin(PI * t) - 0.1, z1 + (z2 - z1) * t]); }
      tb(darkWoodM, pts, 0.06, 30, 6);
    }
    for (const s of [-1, 1]) {
      const pts: V3[] = [];
      for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push([px + s * 0.72, 0.15 + 0.5 * Math.sin(PI * t) + 0.75, z1 + (z2 - z1) * t]); }
      tb(lacquerRedM, pts, 0.04, 40, 8);
      for (let i = 0; i <= 4; i++) { const t = i / 4; const y = 0.15 + 0.5 * Math.sin(PI * t); cy(lacquerRedM, 0.045, 0.045, 0.8, px + s * 0.72, y - 0.05, z1 + (z2 - z1) * t, 10); }
    }
    for (const bz of [z1 - 0.1, z2 + 0.1]) for (const s of [-1, 1]) sph(brassM, 0.07, px + s * 0.72, 0.95, bz, 1, 1.3, 1, 10);
    // shishi-odoshi (bamboo deer scarer) + tsukubai basin
    rock(stoneM, px + 5.4, pz + 1.9, 0.8, 0.4, 0.8, 7);
    cy(bambooM, 0.05, 0.05, 0.6, px + 5.6, 0, pz + 1.4, 10);
    cy(bambooM, 0.05, 0.05, 0.6, px + 5.2, 0, pz + 1.4, 10);
    cy(bambooM, 0.06, 0.06, 0.9, px + 5.4, 0.45, pz + 1.0, 10, { rx: 1.2 });
    lat(stoneM, [[0, 0], [0.35, 0], [0.4, 0.25], [0.3, 0.3], [0.25, 0.12], [0, 0.12]], px + 5.4, 0, pz + 2.7, 16);
    bx(bathWaterM, 0.4, 0.01, 0.4, px + 5.4, 0.22, pz + 2.7, { unit: 0 });
    col(px + 5.0, px + 5.8, pz + 2.3, pz + 3.1, 0, 0.3);
  }
  // stepping stones: engawa → pond → dry garden, and engawa → gate
  {
    const r = rng(505);
    const path = (pts: [number, number][]) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, az] = pts[i], [bxx, bzz] = pts[i + 1];
        const n = Math.max(1, Math.round(Math.hypot(bxx - ax, bzz - az) / 0.75));
        for (let j = 0; j < n; j++) {
          const t = j / n;
          const g = new THREE.CylinderGeometry(0.3 + r() * 0.08, 0.34, 0.08, 9);
          g.scale(1, 1, 0.8 + r() * 0.3);
          put(stoneM, xf(g, ax + (bxx - ax) * t + (r() - 0.5) * 0.12, 0.0, az + (bzz - az) * t + (r() - 0.5) * 0.12, r() * 3), 0.9);
        }
      }
    };
    path([[-13, -3], [-13, -7.8]]);
    path([[-13, -16.2], [-12, -18.2], [-4, -18.8]]);
    path([[-1, -3], [1.5, -8], [2.6, -12]]);
  }
  // hider clearing: gravel square (kept free)
  bx(gravelM, 8, 0.02, 5.6, -3.5, -0.012, -8.8);
  // dry garden rocks (low, standable)
  rock(rockM, -2.2, -16.8, 1.2, 0.6, 0.9, 11);
  rock(rockM, 1.4, -15.2, 0.8, 0.4, 0.7, 12);
  rock(rockM, 0.3, -18.4, 1.6, 0.9, 1.1, 13);
  // maples, pines, lanterns, shrubs
  maple(-20.2, -7.2, 4.2, 3.2, 1);
  maple(-6.2, -16.4, 3.8, 3.0, 2, true);
  maple(-17.5, -17.2, 3.5, 2.6, 3);
  maple(0.8, -4.6, 3.4, 2.4, 4, true);
  pine(-9.5, -4.2, 3.2, 0.9, 5);
  pine(2.4, -17.8, 3.0, -0.8, 6);
  stoneLantern(-9.0, -9.6, "yukimi", 1);
  stoneLantern(-19.6, -12.5, "kasuga", 1);
  stoneLantern(-3.2, -3.6, "kasuga", 0.8);
  for (const [sx, sz, s] of [[-22.4, -2.9, 0.5], [-16.5, -3.1, 0.45], [-7.0, -3.2, 0.4], [-10.5, -18.8, 0.6], [-14.5, -19.0, 0.55], [-21.0, -15, 0.6], [2.8, -3.2, 0.5], [3.0, -9.0, 0.45], [-8.0, -14.4, 0.4], [-18.3, -9.2, 0.35], [-7.6, -12.2, 0.35]] as [number, number, number][]) shrub(sx, sz, s, sz < -14 ? "#8a9a60" : "#ffffff");
  for (const [sx, sz] of [[-22.8, -4.2], [-21.8, -4.6], [-8.2, -3.3], [-5.9, -2.9]]) shrub(sx, sz, 0.3, "#d86a8a"); // azalea in bloom
  // bamboo grove in the north-west corner (one solid block, culms visual)
  {
    const r = rng(606);
    for (let i = 0; i < 34; i++) {
      const x = -23.5 + r() * 2.6, z = -19.6 + r() * 5.2;
      const h = 5 + r() * 3, lean = (r() - 0.5) * 0.12;
      const g = new THREE.CylinderGeometry(0.05, 0.06, h, 8);
      put(bambooM, xf(g, x, h / 2, z, 0, lean, lean));
      for (let q = 0; q < 3; q++) inst("bleaf", leafGeo, pineLeafM, { pos: [x + (r() - 0.5) * 0.8, h - 0.4 - q * 0.6, z + (r() - 0.5) * 0.8], rotX: -1.2 + r(), rotY: r() * 6, scale: [1.1, 0.9, 1], color: "#a8d080" });
    }
    col(-23.9, -20.7, -19.9, -14.2, 0, 3, false);
  }
  // red nodate bench with a wagasa (tea ceremony outdoors)
  {
    bx(redFeltM, 1.8, 0.1, 0.8, -15.2, 0.42, -5.6, { round: true });
    for (const s of [-1, 1]) bx(darkWoodM, 0.08, 0.42, 0.7, -15.2 + s * 0.8, 0, -5.6);
    col(-16.1, -14.3, -6.0, -5.2, 0, 0.52);
    cy(bambooDryM, 0.025, 0.025, 2.4, -14.5, 0, -6.1, 8);
    put(lacquerRedM, xf(new THREE.ConeGeometry(1.35, 0.5, 24, 1, true), -14.5, 2.4, -6.1));
    col(-14.6, -14.4, -6.2, -6.0, 0, 2.4, false);
    lat(celadonM, [[0, 0], [0.05, 0], [0.06, 0.07], [0, 0.07]], -15.5, 0.52, -5.6, 12);
  }

  // ======================= ROTENBURO =======================
  k.room("Rotenburo", 4, 24, -20, 0);
  bFence("z", 23.9, -20, 0, 2.8);
  bFence("x", -19.9, 4, 24, 2.8);
  {
    const cx = 14, cz = -10.5, rx = 6.4, rz = 4.4;
    const disc = new THREE.CircleGeometry(1, 48);
    disc.scale(rx, rz, 1);
    put(k.mat(tx("onRock", OT.onRock), "#3c4440", [5, 5], { roughness: 0.5, bump: 0.6 }), xf(disc.clone(), cx, 0.004, cz, 0, -PI / 2));
    put(hotWaterM, xf(disc.clone().scale(1.01, 1.01, 1), cx, 0.3, cz, 0, -PI / 2));
    const r = rng(707);
    // rim rocks (low, standable)
    for (let i = 0; i < 44; i++) {
      const a = (i / 44) * PI * 2;
      const back = Math.sin(a) < -0.55; // north arc gets boulders
      const x = cx + Math.cos(a) * (rx + 0.15), z = cz + Math.sin(a) * (rz + 0.15);
      if (back && i % 2 === 0) rock(rockWetM, x + Math.cos(a) * 0.3, z + Math.sin(a) * 0.4, 1.1 + r() * 0.6, 0.9 + r() * 0.8, 1.0 + r() * 0.4, i + 100);
      else rock(rockWetM, x, z, 0.75 + r() * 0.4, 0.3 + r() * 0.15, 0.6 + r() * 0.3, i + 100);
    }
    // standable boulders in the water
    rock(rockWetM, cx + 2.5, cz - 1.2, 1.3, 0.75, 1.0, 201);
    rock(rockWetM, cx - 3.2, cz + 1.4, 0.9, 0.55, 0.8, 202);
    // rock mound with the bamboo spout (kakei) at the north side
    rock(rockM, cx - 0.3, cz - rz - 1.8, 3.2, 1.6, 1.8, 210);
    rock(rockM, cx + 2.2, cz - rz - 1.6, 1.8, 1.1, 1.4, 211);
    rock(rockM, cx - 2.6, cz - rz - 1.5, 1.6, 0.9, 1.3, 212);
    const sz0 = cz - rz - 1.0, sz1 = cz - rz + 0.35;
    cy(bambooM, 0.06, 0.06, 1.7, cx + 0.4, 0, sz0 - 0.2, 10);
    cy(bambooM, 0.06, 0.06, 1.5, cx - 0.4, 0, sz0 - 0.2, 10);
    cy(bambooM, 0.04, 0.04, 0.95, cx, 1.35, sz0 - 0.2, 8, { rz: PI / 2 });
    const spout = new THREE.CylinderGeometry(0.055, 0.055, sz1 - sz0 + 0.6, 10);
    put(bambooM, xf(spout, cx, 1.45, (sz0 + sz1) / 2 - 0.2, 0, PI / 2 - 0.18));
    put(streamM, xf(new THREE.CylinderGeometry(0.035, 0.05, 1.3, 8, 1, true), cx, 0.95, sz1 + 0.08));
    for (let i = 0; i < 5; i++) inst("splash", () => new THREE.SphereGeometry(0.06, 8, 6), steelM, { pos: [cx + (i - 2) * 0.07, 0.32, sz1 + 0.1 + (i % 2) * 0.06], scale: [1, 0.4, 1] }, true);
    // steam puffs (not raycast surfaces)
    const steamList: Inst[] = [];
    for (let i = 0; i < 26; i++) {
      const a = r() * 6.28, d = Math.sqrt(r()) * 0.9;
      const s = 1.6 + r() * 1.8;
      steamList.push({ pos: [cx + Math.cos(a) * rx * d, 0.6 + r() * 1.3, cz + Math.sin(a) * rz * d], rotY: r() * 6.28, scale: [s, s * 0.8, 1] });
    }
    for (let i = 0; i < 8; i++) steamList.push({ pos: [14 + r() * 5, 0.8 + r() * 0.9, 1.5 + r() * 3.5], rotY: r() * 6.28, scale: [1.4, 1.1, 1] });
    const sm = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), steamM.m, steamList.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    steamList.forEach((it, i) => { e.set(0, it.rotY ?? 0, 0); q.setFromEuler(e); m4.compose(new THREE.Vector3(...it.pos), q, new THREE.Vector3(...(it.scale ?? [1, 1, 1]))); sm.setMatrixAt(i, m4); });
    sm.renderOrder = 5;
    sm.castShadow = false;
    sm.computeBoundingSphere();
    k.group.add(sm);

    // stone lanterns, maples and shrubs around the bath
    stoneLantern(6.2, -17.2, "yukimi", 1.1);
    stoneLantern(21.8, -17.6, "kasuga", 1.2);
    stoneLantern(5.6, -4.4, "kasuga", 0.8);
    maple(20.8, -16.3, 4.0, 3.0, 8);
    maple(6.3, -13.6, 3.3, 2.4, 9, true);
    for (const [sx, sz, s] of [[9.5, -18.6, 0.6], [17.8, -18.8, 0.55], [22.9, -12.5, 0.5], [5.0, -8.5, 0.4], [22.8, -8.6, 0.45]] as [number, number, number][]) shrub(sx, sz, s);
    // pavilion (azumaya) with a bench in the south-east corner
    const ax1 = 19.6, ax2 = 23.4, az1 = -5.6, az2 = -1.8;
    for (const px of [ax1, ax2]) for (const pz of [az1, az2]) { cy(postM, 0.09, 0.09, 2.6, px, 0, pz, 10); col(px - 0.09, px + 0.09, pz - 0.09, pz + 0.09, 0, 2.6); }
    for (const pz of [az1, az2]) bx(postM, ax2 - ax1 + 0.2, 0.14, 0.14, (ax1 + ax2) / 2, 2.55, pz);
    for (const px of [ax1, ax2]) bx(postM, 0.14, 0.14, az2 - az1 + 0.2, px, 2.55, (az1 + az2) / 2);
    {
      const g = new THREE.ConeGeometry(3.4, 1.3, 4, 1);
      g.rotateY(PI / 4);
      put(kawaraM, xf(g, (ax1 + ax2) / 2, 2.69 + 0.65, (az1 + az2) / 2), 1);
      put(ceilM, xf(new THREE.ConeGeometry(3.3, 1.25, 4, 1, true).rotateY(PI / 4), (ax1 + ax2) / 2, 2.62 + 0.62, (az1 + az2) / 2), 1.8);
      sph(kawaraM, 0.18, (ax1 + ax2) / 2, 4.0, (az1 + az2) / 2, 1, 1, 1, 10);
      col(ax1 - 0.3, ax2 + 0.3, az1 - 0.3, az2 + 0.3, 2.55, 2.75, true);
    }
    bx(hinokiM, 3.2, 0.06, 0.45, (ax1 + ax2) / 2, 0.42, az2 - 0.4, { round: true, unit: 0 });
    for (const s of [-1, 1]) bx(hinokiM, 0.06, 0.42, 0.4, (ax1 + ax2) / 2 + s * 1.4, 0, az2 - 0.4);
    col(ax1 + 0.1, ax2 - 0.1, az2 - 0.63, az2 - 0.17, 0, 0.48);
    pl(signM("露天風呂", false, "#3a2618", "#f0dcb0"), 1.2, 0.35, (ax1 + ax2) / 2, 2.35, az2 + 0.08, PI);
    // towel rack, bucket stack, sandals under the eave
    tb(hinokiM, [[8.4, 0, -0.6], [8.4, 1.2, -0.6], [10.2, 1.2, -0.6], [10.2, 0, -0.6]], 0.03, 30, 6);
    for (let i = 0; i < 4; i++) bx(towelM, 0.35, 0.6, 0.03, 8.7 + i * 0.42, 0.6, -0.6, { rx: 0 });
    col(8.3, 10.3, -0.75, -0.45, 0, 1.2);
    for (let i = 0; i < 5; i++) inst("bucket", () => new THREE.LatheGeometry(V2([[0, 0], [0.13, 0], [0.145, 0.2], [0.135, 0.2], [0.12, 0.015], [0, 0.015]]), 16), hinokiWetM, { pos: [11.6 + (i % 3) * 0.3 + (i > 2 ? 0.15 : 0), i > 2 ? 0.2 : 0, -0.5], rotX: PI });
    col(11.4, 12.4, -0.7, -0.3, 0, 0.42);
    for (let i = 0; i < 4; i++) inst("slip", () => boxGeo(0.11, 0.035, 0.27), fabricM, { pos: [17.4 + i * 0.16, 0.017, -0.6], color: "#8a6a4a" });
    // lamp post light near the bath
    chochin(10.2, 2.0, -2.2, lanternRedM, 1.0);
    chochin(15.4, 2.0, -2.2, lanternRedM, 1.0);
    bx(postM, 20, 0.14, 0.14, 14, 2.7, -2.3);
    for (const px of [5, 12.6]) { bx(postM, 0.16, H + 0.2, 0.16, px, 0, -2.3); col(px - 0.08, px + 0.08, -2.38, -2.22, 0, H); }
    for (const px of [10.2, 15.4]) cy(blackM, 0.008, 0.008, 0.2, px, 2.55, -2.2, 4);
  }

  // ======================= BACKDROP =======================
  {
    const r = rng(808);
    const coneG = () => new THREE.ConeGeometry(1, 1, 10, 1, true);
    for (let i = 0; i < 40; i++) {
      let x: number, z: number;
      if (i < 22) { x = -30 + i * 2.9 + r(); z = -23 - r() * 5; }
      else if (i < 31) { x = 26 + r() * 4; z = -20 + (i - 22) * 3.4; }
      else { x = -26 - r() * 4; z = -20 + (i - 31) * 3.4; }
      const h = 7 + r() * 6;
      const w = 1.5 + r() * 0.8;
      for (let t = 0; t < 4; t++) inst("cedar", coneG, pinePadM, { pos: [x, 1.5 + h * (0.18 + t * 0.2), z], scale: [w * (1 - t * 0.2), h * 0.42, w * (1 - t * 0.2)], rotY: r() * 3, color: t % 2 ? "#7a8a68" : "#8a9a74" });
      cy(barkM, 0.2, 0.25, 2, x, 0, z, 6);
    }
    // distant hills
    for (let i = 0; i < 6; i++) sph(k.mat(null, "#2e3a3a", [1, 1], { roughness: 1 }), 30, -70 + i * 28, -8, -80 - (i % 2) * 20, 1.2, 0.8 + (i % 3) * 0.2, 1, 16);
  }

  // dusk sky dome (not a surface, no fog)
  {
    const skyT = k.tex("onSky", OT.onSky);
    const sky = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), new THREE.MeshBasicMaterial({ map: skyT.texture, side: THREE.BackSide, fog: false, depthWrite: false }));
    sky.position.set(0, -6, 1);
    sky.renderOrder = -10;
    sky.castShadow = false; sky.receiveShadow = false;
    k.group.add(sky);
  }

  // ======================= FLUSH =======================
  for (const [m, list] of batches) k.merged(list, m);
  for (const [, e] of instLists) k.instances(e.geo, e.m, e.list, { noShadow: e.noShadow });

  // spawns
  const hunters: THREE.Vector3[] = [];
  for (let i = 0; i < 9; i++) hunters.push(new THREE.Vector3(-1.3 + (i % 3) * 1.3, 0, 17.4 + Math.floor(i / 3) * 1.2));
  const hiders: THREE.Vector3[] = [];
  for (let i = 0; i < 24; i++) hiders.push(new THREE.Vector3(-6.5 + (i % 6) * 1.2, 0, -7.0 - Math.floor(i / 6) * 1.2));

  return k.finish({
    id: "onsen", name: "Hot Spring Inn",
    bounds: { minX: -23.7, maxX: 23.7, minZ: -19.7, maxZ: 21.6 },
    hunterSpawns: hunters, hiderSpawns: hiders,
    preview: { pos: [-15, 6.5, -18.6], look: [8, 1.2, -6], fov: 62 },
    lighting: {
      sky: "#6a5a7a",
      hemi: ["#9aa4d0", "#5a4030", 0.5],
      sun: { color: "#ff9a5a", int: 1.6, pos: [-30, 11, -14] },
      fog: ["#8a7488", 45, 160],
      points: [
        { pos: [0, 2.6, 12.8], color: "#ffb870", int: 7, dist: 10 },
        { pos: [-11, 2.4, 9], color: "#ffb060", int: 6, dist: 14 },
        { pos: [-12, 2.5, 4], color: "#ffc080", int: 6, dist: 11 },
        { pos: [18, 2.6, 5], color: "#ffd0a0", int: 6, dist: 12 },
        { pos: [14, 2.4, -6.5], color: "#ffa050", int: 9, dist: 14 },
        { pos: [-9, 1.4, -9.6], color: "#ffa050", int: 5, dist: 9 },
      ],
      exposure: 1.0,
      env: 0.5,
      hdri: "sunset",
      hdriBackground: 0,
      envRotation: 0,
    },
  });
}
