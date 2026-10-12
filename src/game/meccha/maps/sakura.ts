// Cherry Blossom Garden — a Japanese stroll garden at the peak of spring (hanami season), bright daylight.
// Centre: a lobed koi pond with a vermilion drum bridge, stepping stones, lily pads, floating petals and koi.
// South: the roofed entrance gate and plaza (hunters arrive here), a dango food stall with a red parasol bench.
// East: the hanami lawn with blue picnic tarps, bento boxes, lantern garlands strung between cherry trees; the
// stream with a turning water wheel and a mill hut, and a bamboo grove in the north-east corner.
// North-west: the tea house (raised tatami floor, shoji, tiled hip roof, engawa, tsukubai basin with a deer scarer).
// West: a raked gravel rock garden; south-west: a small shrine with a torii, hokora and ema rack.
// Everything is ringed by a bamboo fence with distant blue mountains beyond.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import * as T from "../textures";
import { Kit, boxGeo, type World, type Mat } from "./kit";
import * as ST from "./tex/sakura";
import { realPaintingTex, PAINTINGS } from "../paintings";

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

/** lumpy rock: displaced icosahedron, flat-ish bottom */
function rockGeo(seed: number, detail = 1) {
  const r = rng(seed);
  const g = new THREE.IcosahedronGeometry(1, detail);
  const p = g.attributes.position;
  const f1 = 1 + r() * 2, f2 = 2 + r() * 3, ph = r() * 6;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const d = 1 + 0.16 * Math.sin(x * f1 * 2 + ph) * Math.cos(z * f2 + ph) + 0.1 * Math.sin(y * f2 * 1.7 + x);
    p.setXYZ(i, x * d, Math.max(-0.25, y) * d, z * d);
  }
  g.computeVertexNormals();
  return g;
}

/** smooth lumpy blob (foliage puffs, hedges, hills): displaced sphere with smooth normals, flat-ish bottom */
function blobGeo(seed: number, ws = 16, hs = 10, amp = 0.14) {
  const r = rng(seed);
  const g = new THREE.SphereGeometry(1, ws, hs);
  const p = g.attributes.position;
  const f1 = 2 + r() * 2, f2 = 2 + r() * 3, ph = r() * 6;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const d = 1 + amp * Math.sin(x * f1 + ph) * Math.cos(z * f2 + ph) + amp * 0.6 * Math.sin(y * f2 + x * 2);
    p.setXYZ(i, x * d, Math.max(-0.3, y) * d, z * d);
  }
  g.computeVertexNormals();
  return g;
}

export function buildSakura(): World {
  const k = new Kit(6, 2.4);
  const PI = Math.PI;

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
  // rounded boxes are slow to generate: cache by size (rounded to 1 cm) and clone
  const rcache = new Map<string, THREE.BufferGeometry>();
  const rbox = (w: number, h: number, d: number) => {
    const key = `${Math.round(w * 100)}|${Math.round(h * 100)}|${Math.round(d * 100)}`;
    let g = rcache.get(key);
    if (!g) rcache.set(key, (g = boxGeo(w, h, d).toNonIndexed()));
    return g.clone();
  };
  const col = (x1: number, x2: number, z1: number, z2: number, b: number, t: number, stand = true) =>
    k.collider(Math.min(x1, x2), Math.max(x1, x2), Math.min(z1, z2), Math.max(z1, z2), b, t, stand);
  type BO = { unit?: number; ry?: number; rx?: number; rz?: number; round?: boolean; solid?: boolean; stand?: boolean };
  const bx = (m: Mat, w: number, h: number, d: number, x: number, y: number, z: number, o: BO = {}) => {
    const g = o.round ? rbox(w, h, d) : new THREE.BoxGeometry(w, h, d);
    xf(g, x, y + h / 2, z, o.ry, o.rx, o.rz);
    put(m, g, o.unit);
    if (o.solid) col(x - w / 2, x + w / 2, z - d / 2, z + d / 2, y, y + h, o.stand ?? true);
  };
  const cy = (m: Mat, rt: number, rb: number, h: number, x: number, y: number, z: number, seg = 16, o: { rx?: number; rz?: number; ry?: number; open?: boolean } = {}) =>
    put(m, xf(new THREE.CylinderGeometry(rt, rb, h, seg, 1, !!o.open), x, o.rx || o.rz ? y : y + h / 2, z, o.ry, o.rx, o.rz));
  const sph = (m: Mat, r: number, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, seg = 16) => {
    const g = new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.7)));
    g.scale(sx, sy, sz);
    put(m, xf(g, x, y, z));
  };
  const lat = (m: Mat, pts: [number, number][], x: number, y: number, z: number, seg = 24) => put(m, xf(new THREE.LatheGeometry(V2(pts), seg), x, y, z));
  const tb = (m: Mat, pts: V3[], r: number, seg = 0, rs = 8) => {
    const c = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, "centripetal");
    put(m, new THREE.TubeGeometry(c, seg || Math.max(6, pts.length * 6), r, rs, false));
  };
  /** tapered tube (trunks / branches): radius goes r0 → r1 */
  const taper = (m: Mat, pts: V3[], r0: number, r1: number, seg = 10, rs = 8) => {
    const c = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, "centripetal");
    const g = new THREE.TubeGeometry(c, seg, 1, rs, false);
    const p = g.attributes.position;
    // scale each ring around its curve point
    for (let i = 0; i <= seg; i++) {
      const t = i / seg, cp = c.getPointAt(t), rr = r0 + (r1 - r0) * t;
      for (let j = 0; j <= rs; j++) {
        const idx = i * (rs + 1) + j;
        p.setXYZ(idx, cp.x + (p.getX(idx) - cp.x) * rr, cp.y + (p.getY(idx) - cp.y) * rr, cp.z + (p.getZ(idx) - cp.z) * rr);
      }
    }
    g.computeVertexNormals();
    put(m, g, 0);
  };
  const rail = (m: Mat, pts: V3[], r: number) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = new THREE.Vector3(...pts[i]), b = new THREE.Vector3(...pts[i + 1]);
      const len = a.distanceTo(b);
      const g = new THREE.CylinderGeometry(r, r, len, 8);
      g.translate(0, len / 2, 0);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
      g.translate(a.x, a.y, a.z);
      put(m, g, 0);
    }
  };
  const pl = (m: Mat, w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0) => put(m, xf(new THREE.PlaneGeometry(w, h), x, y, z, ry, rx), 0);

  const instLists = new Map<string, { geo: THREE.BufferGeometry; m: Mat; list: Inst[]; noShadow?: boolean }>();
  const inst = (key: string, geo: () => THREE.BufferGeometry, m: Mat, it: Inst, noShadow = false) => {
    let e = instLists.get(key);
    if (!e) instLists.set(key, (e = { geo: geo(), m, list: [], noShadow }));
    e.list.push(it);
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
    const L = (p: V3[]) => p.map(([a, b, cc]) => [wx(a, cc), b, wz(a, cc)] as V3);
    return {
      wx, wz,
      bx: (m: Mat, w: number, h: number, d: number, lx: number, y: number, lz: number, o: BO = {}) => {
        bx(m, w, h, d, wx(lx, lz), y, wz(lx, lz), { ...o, ry: ry + (o.ry ?? 0), solid: false });
        if (o.solid) fcol(lx - w / 2, lx + w / 2, lz - d / 2, lz + d / 2, y, y + h, o.stand ?? true);
      },
      cy: (m: Mat, rt: number, rb: number, h: number, lx: number, y: number, lz: number, seg = 16, o: { rx?: number; rz?: number } = {}) => cy(m, rt, rb, h, wx(lx, lz), y, wz(lx, lz), seg, { ...o, ry }),
      lat: (m: Mat, pts: [number, number][], lx: number, y: number, lz: number, seg = 20) => lat(m, pts, wx(lx, lz), y, wz(lx, lz), seg),
      pl: (m: Mat, w: number, h: number, lx: number, y: number, lz: number, rr = 0, rx = 0) => pl(m, w, h, wx(lx, lz), y, wz(lx, lz), ry + rr, rx),
      rail: (m: Mat, pts: V3[], r: number) => rail(m, L(pts), r),
      tb: (m: Mat, pts: V3[], r: number, seg = 0) => tb(m, L(pts), r, seg),
      sph: (m: Mat, r: number, lx: number, y: number, lz: number, sx = 1, sy = 1, sz = 1, seg = 16) => sph(m, r, wx(lx, lz), y, wz(lx, lz), sx, sy, sz, seg),
      col: fcol,
      geo: (m: Mat, g: THREE.BufferGeometry, lx: number, y: number, lz: number, rr = 0, rx = 0, rz = 0) => put(m, xf(g, wx(lx, lz), y, wz(lx, lz), ry + rr, rx, rz)),
    };
  }

  // ---------------- materials ----------------
  const tx = <A extends unknown[]>(key: string, f: (...a: A) => ReturnType<typeof ST.skGrass>, ...a: A) => k.tex(key, () => f(...a));
  const grassM = k.mat(tx("skGrass", ST.skGrass, 3, 60), "#ffffff", [1, 1], { roughness: 0.95, bump: 0.7 });
  const gravelM = U(k.mat(k.tex("skGravel", ST.skGravel), "#ffffff", [1, 1], { roughness: 0.95, bump: 0.9 }), 1.6);
  const flagM = U(k.mat(k.tex("skFlag", ST.skFlag), "#ffffff", [1, 1], { roughness: 0.85, bump: 0.9 }), 2.4);
  const graniteM = U(k.mat(tx("skGranite", ST.skGranite, "#a8a090", 61), "#ffffff", [1, 1], { roughness: 0.9, bump: 0.8 }), 0.8);
  const rockM = U(k.mat(tx("skRock", ST.skGranite, "#8c8474", 62), "#ffffff", [1, 1], { roughness: 0.9, bump: 1.0 }), 1.2);
  const mossM = U(k.mat(k.tex("skMoss", ST.skMoss), "#ffffff", [1, 1], { roughness: 1, bump: 0.9 }), 0.8);
  const barkM = k.mat(k.tex("skBark", ST.skBark), "#ffffff", [2, 3], { roughness: 0.95, bump: 1.1 });
  const blossomM = [0, 1, 2].map((i) => {
    const m = k.mat(tx(`skBlossom${i}`, ST.skBlossom, 31 + i, i === 2 ? 1 : 0, 0), "#fff2ee", [1, 1], { transparent: true, roughness: 0.75, emissive: "#ff9ab0", emissiveIntensity: 0.2 });
    m.m.alphaTest = 0.45;
    return m;
  });
  const puffM = [0, 1].map((i) => {
    const m = k.mat(tx(`skPuff${i}`, ST.skBlossom, 35 + i, i, 1), "#fff0ec", [2, 1], { transparent: true, roughness: 0.75, emissive: "#ff9ab0", emissiveIntensity: 0.18 });
    m.m.alphaTest = 0.4;
    return m;
  });
  const petalsM = k.mat(tx("skPetals", ST.skPetals, 41, 420), "#ffffff", [1, 1], { transparent: true, roughness: 0.8 });
  petalsM.m.alphaTest = 0.4; petalsM.m.depthWrite = false; petalsM.m.polygonOffset = true; petalsM.m.polygonOffsetFactor = -2; petalsM.m.side = THREE.FrontSide;
  const petalM = k.mat(null, "#ffffff", [1, 1], { roughness: 0.7 }); // instanced single petals
  petalM.m.side = THREE.DoubleSide;
  const waterTex = k.tex("skWater", ST.skWater);
  const pondM = k.mat(waterTex, "#8ccac2", [1, 1], { transparent: true, roughness: 0.05, metalness: 0.1, bump: 0.5 });
  pondM.m.alphaTest = 0; pondM.m.opacity = 0.7; pondM.m.depthWrite = false; pondM.m.side = THREE.FrontSide;
  pondM.m.userData.flow = [0.004, 0.009];
  U(pondM, 3.5);
  const streamM = k.mat(waterTex, "#7ab8b0", [1, 1], { transparent: true, roughness: 0.05, metalness: 0.1, bump: 0.6 });
  streamM.m.alphaTest = 0; streamM.m.opacity = 0.72; streamM.m.depthWrite = false; streamM.m.side = THREE.FrontSide;
  streamM.m.userData.flow = [0.0, -0.22];
  const pondBedM = U(k.mat(tx("skBed", ST.skGranite, "#6a6c52", 63), "#ffffff", [1, 1], { roughness: 0.9, bump: 0 }), 1.4);
  const woodM = U(k.mat(k.tex("skWood", () => T.wood("#9a6a42", "#6a4424", 7)), "#ffffff", [1, 1], { roughness: 0.6, bump: 0.7 }), 1.2);
  const darkWoodM = U(k.mat(k.tex("skDWood", () => T.wood("#5a3c26", "#3a2616", 9)), "#ffffff", [1, 1], { roughness: 0.6, bump: 0.7 }), 1.2);
  const cedarM = U(k.mat(k.tex("skCedar", () => T.wood("#c79a66", "#9a6c40", 12)), "#ffffff", [1, 1], { roughness: 0.55, bump: 0.6 }), 1.0);
  const vermM = k.mat(null, "#d6402a", [1, 1], { roughness: 0.45 });
  const blackLacM = k.mat(null, "#1c1a18", [1, 1], { roughness: 0.3 });
  const brassM = k.mat(null, "#c9a24a", [1, 1], { roughness: 0.3, metalness: 0.9 });
  const roofM = U(k.mat(k.tex("skRoof", ST.skRoof), "#ffffff", [1, 1], { roughness: 0.55, bump: 0.8 }), 1.6);
  const tatamiM = U(k.mat(k.tex("skTatami", ST.skTatami), "#ffffff", [1, 1], { roughness: 0.85, bump: 0.5 }), 1.8);
  const shojiM = k.mat(k.tex("skShoji", ST.skShoji), "#ffffff", [1, 1], { roughness: 0.8, bump: 0.2, emissive: "#fff6e0", emissiveIntensity: 0.12 });
  const plasterM = U(k.mat(k.tex("skPlaster", () => T.noise("#ece6d8", 0.05, 5, 900)), "#ffffff", [1, 1], { roughness: 0.9, bump: 0.3 }), 2);
  const bambooM = k.mat(k.tex("skBamboo", ST.skBamboo), "#ffffff", [1, 3], { roughness: 0.5, bump: 0.5 });
  const fenceBambooM = k.mat(k.tex("skBamboo", ST.skBamboo), "#e6d9a8", [1, 1], { roughness: 0.6, bump: 0.5 }); // dried bamboo
  const ropeM = k.mat(null, "#2a1e14", [1, 1], { roughness: 0.9 });
  const tarpM = U(k.mat(k.tex("skTarp", ST.skTarp), "#ffffff", [1, 1], { roughness: 0.4, bump: 0 }), 1.0);
  const feltM = U(k.mat(tx("skFelt", ST.skFelt, "#c8242c", 141), "#ffffff", [1, 1], { roughness: 1, bump: 0 }), 0.5);
  const tintM = k.mat(null, "#ffffff", [1, 1], { roughness: 0.45 }); // instance-coloured
  const lanternRedM = k.mat(tx("skLanR", ST.skLantern, "#e8433a", "#ffffff"), "#ffffff", [1, 1], { roughness: 0.7, bump: 0, emissive: "#ff7050", emissiveIntensity: 0.45 });
  const lanternWhiteM = k.mat(tx("skLanW", ST.skLantern, "#f6efe2", "#e66a96"), "#ffffff", [1, 1], { roughness: 0.7, bump: 0, emissive: "#fff0d8", emissiveIntensity: 0.5 });
  const lanternPinkM = k.mat(tx("skLanP", ST.skLantern, "#f59ab8", "#ffffff"), "#ffffff", [1, 1], { roughness: 0.7, bump: 0, emissive: "#ffb0c8", emissiveIntensity: 0.4 });
  const leafM = k.mat(k.tex("leaves", T.leaves), "#6d9a40", [1, 1], { roughness: 0.8, bump: 0.6 });
  const ceramicM = k.mat(null, "#efe9dc", [1, 1], { roughness: 0.25 });
  const iron = k.mat(null, "#2a2826", [1, 1], { roughness: 0.5, metalness: 0.7 });
  const signCache = new Map<string, Mat>();
  const sign = (lines: string[], bg = "#6b4a2e", fg = "#fbeede", w = 256, h = 128) => {
    const key = lines.join("|") + bg + w + "x" + h;
    let m = signCache.get(key);
    if (!m) signCache.set(key, (m = k.mat(k.tex(`skSign${key}`, () => ST.skSign(lines, bg, fg, w, h)), "#ffffff", [1, 1], { roughness: 0.6, bump: 0 })));
    return m;
  };

  const r0 = rng(417);

  // ======================= GROUND =======================
  const BX = 24, BZ = 20;
  bx(grassM, 2 * BX + 40, 0.2, 2 * BZ + 40, 0, -0.2, 0);
  // re-UV the lawn so the grass keeps ~2 m scale
  worldUV(batches.get(grassM)![0], 2.2);

  // ---------------- paths ----------------
  /** flat path strip along a polyline (width w) */
  const pathStrip = (m: Mat, pts: [number, number][], w: number, y = 0.012, unit = 2.4) => {
    const pos: number[] = [], idx: number[] = [];
    const c = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, y, z)), false, "centripetal");
    const n = Math.max(4, Math.round(c.getLength() / 0.5));
    for (let i = 0; i <= n; i++) {
      const t = i / n, p = c.getPointAt(t), d = c.getTangentAt(t);
      const nx = -d.z, nz = d.x, l = Math.hypot(nx, nz) || 1;
      const ww = w * (0.94 + 0.12 * Math.sin(i * 1.7));
      pos.push(p.x + (nx / l) * ww / 2, y, p.z + (nz / l) * ww / 2, p.x - (nx / l) * ww / 2, y, p.z - (nz / l) * ww / 2);
      if (i < n) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    if (g.attributes.normal.getY(0) < 0) { g.setIndex(idx.map((_, i) => idx[i - (i % 3) + [0, 2, 1][i % 3]])); g.computeVertexNormals(); }
    put(m, g.toNonIndexed(), unit);
  };
  pathStrip(flagM, [[0, 19.5], [0, 15], [0.4, 11], [1.8, 8], [4.5, 5.6]], 2.4);
  pathStrip(gravelM, [[4.5, 5.6], [8.5, 4.2], [11.5, 1.5], [12.2, -3], [10.5, -7.5], [6, -9.5], [0, -10.2], [-3, -8.4], [-3, -6.2]], 1.8, 0.011, 1.6);
  pathStrip(gravelM, [[-3, 4.2], [-4, 6.2], [-6.5, 7.2], [-10, 6.6], [-12.5, 3.4], [-12.8, -3], [-12.2, -7.5], [-12.6, -9]], 1.8, 0.011, 1.6);
  pathStrip(gravelM, [[0.4, 11], [-3, 12.4], [-8, 12.8], [-13, 12.6], [-16.5, 12.2]], 1.6, 0.011, 1.6);
  pathStrip(gravelM, [[11.5, 1.5], [15, 2.8], [18, 3.2]], 1.6, 0.011, 1.6);
  pathStrip(gravelM, [[10.5, -7.5], [13.5, -10], [15.5, -12.5]], 1.6, 0.011, 1.6);
  pathStrip(flagM, [[0, -10.2], [-4, -12.2], [-9, -12.8]], 1.8);

  // ======================= KOI POND =======================
  const PCX = 0, PCZ = -1;
  const pondR = (a: number) => 1 + 0.12 * Math.sin(2 * a + 0.6) + 0.07 * Math.sin(3 * a + 2.1) + 0.05 * Math.cos(5 * a);
  const PRX = 8.2, PRZ = 4.4;
  const pondPt = (a: number, s = 1): [number, number] => [PCX + Math.cos(a) * PRX * pondR(a) * s, PCZ + Math.sin(a) * PRZ * pondR(a) * s];
  const pondShape = (s: number) => {
    const sh = new THREE.Shape();
    for (let i = 0; i <= 64; i++) { const a = (i / 64) * PI * 2; const [x, z] = pondPt(a, s); if (i === 0) sh.moveTo(x, -z); else sh.lineTo(x, -z); }
    return sh;
  };
  {
    // bed (dark stones + silt), pebble shelf ring, then the water
    const bed = new THREE.ShapeGeometry(pondShape(1.02), 1);
    bed.rotateX(-PI / 2);
    bed.translate(0, 0.006, 0);
    put(pondBedM, bed, 1.4);
    const w = new THREE.ShapeGeometry(pondShape(0.99), 1);
    w.rotateX(-PI / 2);
    w.translate(0, 0.2, 0);
    put(pondM, w, 3.5);
    // edge rocks around the rim (mix of big solid boulders and small rounded stones)
    const rr = rng(71);
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * PI * 2 + rr() * 0.05;
      if (Math.abs(Math.cos(a) * PRX * pondR(a) - (-3)) < 1.2 && Math.abs(Math.sin(a)) > 0.5) continue; // bridge landings
      const [x, z] = pondPt(a, 1.02 + rr() * 0.05);
      const big = i % 7 === 0;
      const s = big ? 0.55 + rr() * 0.3 : 0.2 + rr() * 0.2;
      const g = rockGeo(100 + i, big ? 1 : 0);
      g.scale(s * (1.2 + rr() * 0.4), s * (big ? 0.8 : 0.55), s);
      g.rotateY(rr() * 6);
      put(big ? rockM : graniteM, xf(g, x, s * 0.1, z), big ? 1.2 : 0.8);
      if (big) col(x - s, x + s, z - s * 0.8, z + s * 0.8, 0, s * 0.85, true);
    }
    // moss tufts around rocks
    for (let i = 0; i < 40; i++) {
      const a = r0() * PI * 2, [x, z] = pondPt(a, 1.1 + r0() * 0.12);
      inst("mossTuft", () => { const g = new THREE.SphereGeometry(1, 10, 6, 0, PI * 2, 0, PI / 2); return g; }, mossM, { pos: [x, 0, z], scale: [0.35 + r0() * 0.4, 0.12 + r0() * 0.1, 0.3 + r0() * 0.3], rotY: r0() * 6 });
    }
    // koi (under the surface) — bodies + tails, per-instance colours
    const koiG = () => mg([(() => { const g = new THREE.SphereGeometry(0.1, 12, 8); g.scale(2.4, 0.6, 0.85); return g; })(),
      xf(new THREE.ConeGeometry(0.07, 0.16, 6), -0.3, 0, 0, 0, 0, PI / 2).scale(1, 0.4, 1)]);
    const kc = ["#f26a1c", "#ffffff", "#f5d6b0", "#e8452a", "#f2b01c", "#ffffff", "#1c1c1c", "#f58a3c"];
    for (let i = 0; i < 22; i++) {
      const a = r0() * PI * 2, d = 0.25 + r0() * 0.6, [x, z] = pondPt(a, d);
      inst("koi", koiG, tintM, { pos: [x, 0.1, z], rotY: a + PI / 2 + (r0() - 0.5), scale: [0.8 + r0() * 0.7, 0.8 + r0() * 0.4, 0.8 + r0() * 0.5], color: kc[i % kc.length] }, true);
    }
    // lily pads with a notch + a few pink lotus buds
    const padG = () => { const g = new THREE.CircleGeometry(0.3, 16, 0.3, PI * 2 - 0.5); g.rotateX(-PI / 2); return g; };
    const lr = rng(81);
    for (let c = 0; c < 4; c++) {
      const a = [0.3, 2.3, 3.6, 5.2][c], [cx, cz] = pondPt(a, 0.72);
      for (let i = 0; i < 7; i++) {
        const x = cx + (lr() - 0.5) * 1.8, z = cz + (lr() - 0.5) * 1.2, s = 0.6 + lr() * 0.7;
        inst("pad", padG, tintM, { pos: [x, 0.205 + i * 0.0006, z], rotY: lr() * 6.3, scale: [s, 1, s], color: lr() < 0.3 ? "#4e7a2a" : "#3f6a24" }, true);
        if (i % 3 === 0) { sph(k.mat(null, "#f7a8c4", [1, 1], { roughness: 0.6 }), 0.07, x + 0.1, 0.27, z, 1, 1.5, 1, 10); }
      }
    }
    // floating petals on the water
    for (let i = 0; i < 16; i++) {
      const a = r0() * PI * 2, [x, z] = pondPt(a, 0.2 + r0() * 0.75);
      const s = 1.2 + r0() * 1.8;
      pl(petalsM, s, s, x, 0.203 + i * 0.0005, z, r0() * 6, -PI / 2);
    }
  }

  // ======================= DRUM BRIDGE (taiko-bashi) over the pond at x = -3 =======================
  const BRX = -3, BRZ1 = -6.6, BRZ2 = 4.6, BRH = 1.25, BRW = 1.7;
  {
    const L = BRZ2 - BRZ1, zc = (BRZ1 + BRZ2) / 2;
    const archY = (z: number) => BRH * Math.sin(PI * Math.min(1, Math.max(0, (z - BRZ1) / L)));
    // curved plank deck
    const deck = new THREE.BoxGeometry(BRW, 0.1, L, 1, 1, 40);
    const p = deck.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + archY(p.getZ(i) + zc) + 0.05);
    deck.computeVertexNormals();
    deck.translate(BRX, 0, zc);
    put(cedarM, deck, 0);
    // planks seams: thin dark strips across
    for (let z = BRZ1 + 0.2; z < BRZ2 - 0.1; z += 0.3) bx(darkWoodM, BRW - 0.02, 0.012, 0.025, BRX, archY(z) + 0.095, z, { rx: -Math.atan(BRH * PI / L * Math.cos(PI * (z - BRZ1) / L)) });
    // side beams (vermilion), rails and posts with brass giboshi caps
    for (const s of [-1, 1]) {
      const x = BRX + s * (BRW / 2 + 0.04);
      const beam: V3[] = [], top: V3[] = [], mid: V3[] = [];
      for (let i = 0; i <= 16; i++) { const z = BRZ1 + (i / 16) * L; beam.push([x, archY(z) - 0.02, z]); top.push([x, archY(z) + 0.95, z]); mid.push([x, archY(z) + 0.5, z]); }
      tb(vermM, beam, 0.09, 48, 8);
      tb(vermM, top, 0.055, 48, 8);
      tb(vermM, mid, 0.035, 48, 6);
      for (let i = 0; i <= 8; i++) {
        const z = BRZ1 + 0.15 + (i / 8) * (L - 0.3), y0 = archY(z);
        cy(vermM, 0.065, 0.07, 1.0, x, y0, z, 10);
        if (i === 0 || i === 8 || i === 4) { lat(brassM, [[0, 0], [0.08, 0], [0.09, 0.06], [0.07, 0.14], [0.02, 0.24], [0, 0.26]], x, y0 + 1.0, z, 14); }
      }
      // under-structure: piers into the pond
      for (const z of [zc - 2.2, zc + 2.2]) { cy(darkWoodM, 0.09, 0.1, archY(z) + 0.1, x, 0, z, 10); }
      col(x - 0.07, x + 0.07, BRZ1 + 0.4, BRZ2 - 0.4, 0.3, 2.2, false);
    }
    for (const z of [zc - 2.2, zc + 2.2]) bx(darkWoodM, BRW + 0.3, 0.12, 0.14, BRX, archY(z) - 0.18, z);
    // stepped colliders following the arch
    const n = 28;
    for (let i = 0; i < n; i++) {
      const z1 = BRZ1 + (i / n) * L, z2 = BRZ1 + ((i + 1) / n) * L;
      col(BRX - BRW / 2, BRX + BRW / 2, z1, z2, 0, Math.max(0.05, archY((z1 + z2) / 2) + 0.1), true);
    }
    // stone landings
    for (const z of [BRZ1 - 0.5, BRZ2 + 0.5]) bx(graniteM, BRW + 0.4, 0.08, 0.9, BRX, 0, z, { round: true });
  }
  // stepping stones across the east lobe
  for (let i = 0; i < 8; i++) {
    const t = i / 7, x = 5.4 + Math.sin(t * 3) * 0.6 + (i % 2) * 0.35, z = -4.9 + t * 7.6;
    const g = new THREE.CylinderGeometry(0.34, 0.38, 0.28, 9);
    g.scale(1 + (i % 3) * 0.12, 1, 0.85);
    put(graniteM, xf(g, x, 0.14, z, i * 0.8), 0.8);
    col(x - 0.3, x + 0.3, z - 0.28, z + 0.28, 0, 0.28, true);
  }

  // ======================= CHERRY TREES =======================
  const clumpG = () => new THREE.PlaneGeometry(1, 1);
  const trees: [number, number][] = [];
  const cherry = (x: number, z: number, h: number, spread: number, seed: number, weeping = false) => {
    const r = rng(seed);
    trees.push([x, z]);
    const lean = (r() - 0.5) * 0.8, leanZ = (r() - 0.5) * 0.8;
    const fork: V3 = [x + lean, h * 0.42, z + leanZ];
    taper(barkM, [[x, -0.1, z], [x + lean * 0.3, h * 0.18, z + leanZ * 0.2], fork], 0.24 * (h / 6), 0.16 * (h / 6), 10, 10);
    // root flare
    lat(barkM, [[0.42 * h / 6, 0], [0.3 * h / 6, 0.12], [0.22 * h / 6, 0.4], [0, 0.4]], x, -0.02, z, 10);
    const nb = 5 + Math.floor(r() * 2);
    const tips: V3[] = [];
    for (let b = 0; b < nb; b++) {
      const a = (b / nb) * PI * 2 + r() * 0.6;
      const dist = spread * (0.42 + r() * 0.2);
      const mid: V3 = [fork[0] + Math.cos(a) * dist * 0.45, fork[1] + h * (0.16 + r() * 0.1), fork[2] + Math.sin(a) * dist * 0.45];
      const end: V3 = [fork[0] + Math.cos(a) * dist, fork[1] + h * (weeping ? 0.42 : 0.3 + r() * 0.2), fork[2] + Math.sin(a) * dist];
      taper(barkM, [fork, mid, end], 0.12 * (h / 6), 0.035, 8, 6);
      tips.push(mid, end);
      // twig sprays
      for (let t = 0; t < 2; t++) {
        const ta = a + (r() - 0.5) * 1.6, tl = spread * 0.2;
        const te: V3 = [end[0] + Math.cos(ta) * tl, end[1] + (r() - 0.3) * 0.6, end[2] + Math.sin(ta) * tl];
        taper(barkM, [end, te], 0.035, 0.012, 3, 5);
        tips.push(te);
      }
    }
    tips.push([fork[0], fork[1] + h * 0.55, fork[2]]);
    // blossom mass: lumpy puffs (alpha-tested flower texture, so the edges break up) + small cards on the outside
    const ms = weeping ? [0, 1] : [0, 1, 2];
    for (const tp of tips) {
      const np = weeping ? 1 : 2;
      for (let i = 0; i < np; i++) {
        const a = r() * PI * 2, d = r() * spread * 0.14;
        const s = (0.55 + r() * 0.45) * (spread / 7 + 0.45);
        const pi = r() < 0.7 ? 0 : 1;
        inst(`puff${pi}${seed % 3}`, () => blobGeo(300 + seed * 3 + pi, 12, 8, 0.2), puffM[pi], { pos: [tp[0] + Math.cos(a) * d, tp[1] + (r() - 0.3) * 0.4, tp[2] + Math.sin(a) * d], rotY: r() * 6.3, scale: [s * 1.2, s * 0.75, s * 1.1] });
      }
      const n = weeping ? 6 : 8;
      for (let i = 0; i < n; i++) {
        const a = r() * PI * 2, d = (0.4 + r() * 0.6) * spread * 0.22;
        const s = 0.55 + r() * 0.55;
        const m = ms[Math.floor(r() * ms.length)];
        inst(`bl${m}`, clumpG, blossomM[m], { pos: [tp[0] + Math.cos(a) * d, tp[1] + (r() - 0.4) * 0.8, tp[2] + Math.sin(a) * d], rotY: a + PI / 2 + (r() - 0.5) * 0.8, rotX: -0.3 - r() * 0.9, rotZ: r() * 3, scale: [s, s, 1] });
      }
    }
    if (weeping) {
      // hanging blossom strands
      for (let i = 0; i < 34; i++) {
        const tp = tips[Math.floor(r() * tips.length)];
        const len = 1.4 + r() * 2.2;
        const ex = tp[0] + (r() - 0.5) * 0.6, ez = tp[2] + (r() - 0.5) * 0.6;
        for (let j = 0; j < 6; j++) {
          const t = (j + 0.5) / 6;
          inst("bl1", clumpG, blossomM[1], { pos: [tp[0] + (ex - tp[0]) * t, tp[1] - len * t, tp[2] + (ez - tp[2]) * t], rotY: r() * 6.3, rotZ: r() * 3, scale: [0.45, 0.8, 1] });
        }
      }
    }
    // fallen petal carpet under the canopy + scattered single petals
    for (let i = 0; i < 3; i++) {
      const s = spread * (0.7 + r() * 0.5);
      pl(petalsM, s, s, x + (r() - 0.5) * spread * 0.5, 0.014 + i * 0.001 + (seed % 7) * 0.0003, z + (r() - 0.5) * spread * 0.5, r() * 6, -PI / 2);
    }
    for (let i = 0; i < 40; i++) {
      const a = r() * PI * 2, d = r() * spread * 0.8;
      const air = i < 8;
      inst("petal", () => { const g = new THREE.CircleGeometry(0.018, 5); g.scale(1, 0.65, 1); return g; }, petalM,
        { pos: [x + Math.cos(a) * d, air ? 0.6 + r() * h * 0.6 : 0.02, z + Math.sin(a) * d], rotX: air ? r() * 6 : -PI / 2 + (r() - 0.5) * 0.4, rotY: r() * 6, color: ["#ffd3e2", "#ffc0d6", "#fbb0c9", "#ffe9f0"][i % 4] }, true);
    }
    col(x - 0.25 * h / 6, x + 0.25 * h / 6, z - 0.25 * h / 6, z + 0.25 * h / 6, 0, h * 0.42, false);
    // the fork is a nice perch to hide in
    col(fork[0] - 0.35, fork[0] + 0.35, fork[2] - 0.35, fork[2] + 0.35, h * 0.38, h * 0.42, true);
  };
  cherry(-7.8, 3.6, 6.4, 7, 11);
  cherry(6.5, -6.8, 6.0, 6.5, 12);
  cherry(4.5, 8.5, 5.4, 6, 13);
  cherry(-6.5, -8.2, 5.8, 6.5, 14);
  cherry(9.5, 7.0, 6.2, 7, 15);
  cherry(15.5, 9.2, 6.6, 7.5, 16);
  cherry(18.5, 3.0, 5.8, 6, 17);
  cherry(12.5, 13.8, 5.6, 6, 18);
  cherry(-15.5, 5.2, 6.2, 6.5, 19);
  cherry(-19.8, 0.5, 5.6, 6, 20);
  cherry(-9.5, 16.5, 5.4, 6, 21);
  cherry(6.5, 16.6, 5.6, 6, 22);
  cherry(-9.5, -17.4, 6.4, 7, 23);
  cherry(1.5, -15.5, 6.2, 7, 24);
  cherry(10.5, -14.8, 5.6, 6, 25);
  cherry(-19.5, 17.5, 5.6, 6, 26);
  cherry(20.5, -6.5, 5.8, 6.5, 27);
  cherry(9.2, 0.6, 5.0, 5.5, 28, true); // weeping cherry leaning over the pond

  // ======================= PERIMETER: bamboo fence + far mountains =======================
  {
    const FX = BX - 0.15, FZ = BZ - 0.15, FH = 1.8;
    const side = (axis: "x" | "z", c: number, a1: number, a2: number) => {
      const L = a2 - a1;
      if (L < 0.1) return;
      const m = k.mat(k.tex("skBamboo", ST.skBamboo), "#e2d4a0", [L / 0.075, FH / 1.3], { roughness: 0.6, bump: 0.6 });
      const mid = (a1 + a2) / 2;
      if (axis === "x") { k.add(new THREE.BoxGeometry(L, FH, 0.06), m, [mid, FH / 2, c], {}); col(a1, a2, c - 0.1, c + 0.1, 0, FH, true); }
      else { k.add(new THREE.BoxGeometry(0.06, FH, L), m, [c, FH / 2, mid], { rotY: 0 }).geometry.rotateY(0); col(c - 0.1, c + 0.1, a1, a2, 0, FH, true); }
      for (const y of [0.35, 1.05, 1.62]) for (const s of [-1, 1]) {
        if (axis === "x") cy(fenceBambooM, 0.03, 0.03, L, mid, y, c + s * 0.06, 8, { rz: PI / 2 });
        else cy(fenceBambooM, 0.03, 0.03, L, c + s * 0.06, y, mid, 8, { rx: PI / 2 });
      }
      for (let a = a1; a <= a2 + 0.01; a += 2.4) {
        const px = axis === "x" ? a : c, pz = axis === "x" ? c : a;
        cy(darkWoodM, 0.065, 0.07, FH + 0.12, px, 0, pz, 10);
        for (const y of [0.35, 1.05, 1.62]) inst("tie", () => new THREE.TorusGeometry(0.075, 0.012, 4, 10), ropeM, { pos: [px, y, pz], rotX: PI / 2, rotZ: axis === "x" ? 0 : PI / 2 }, true);
      }
      cy(fenceBambooM, 0.045, 0.045, L, axis === "x" ? mid : c, FH + 0.02, axis === "x" ? c : mid, 8, axis === "x" ? { rz: PI / 2 } : { rx: PI / 2 });
    };
    side("x", -FZ, -FX, FX);
    side("x", FZ, -FX, -2.4);
    side("x", FZ, 2.4, FX);
    side("z", -FX, -FZ, FZ);
    side("z", FX, -FZ, FZ);
    // far blue mountains ring (hazy through the fog) + a rolling tree line just beyond the fence
    const mtnM = k.mat(k.tex("skMtn", ST.skMountains), "#ffffff", [3, 1], { transparent: true, roughness: 1, bump: 0, emissive: "#6f8fb0", emissiveIntensity: 0.25 });
    mtnM.m.alphaTest = 0.4; mtnM.m.fog = false;
    const ring = new THREE.CylinderGeometry(120, 120, 34, 48, 1, true);
    k.add(ring, mtnM, [0, 13, 0], { noShadow: true });
    const hillM = k.mat(k.tex("skHill", () => T.noise("#4f6e3c", 0.16, 17, 2600)), "#ffffff", [8, 4], { roughness: 1, bump: 0 });
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * PI * 2, d = 36 + (i % 3) * 5;
      const g = blobGeo(500 + i, 20, 10, 0.08);
      const s = 7 + (i % 4) * 2.2;
      g.scale(s * 1.6, s * 0.7, s);
      put(hillM, xf(g, Math.cos(a) * d * 1.15, -1.5, Math.sin(a) * d, -a), 0);
    }
  }

  // ======================= ENTRANCE GATE + PLAZA (south) =======================
  {
    const gz = 15.4;
    // plaza paving + monument stone + garden map board + bike rack
    bx(flagM, 9, 0.02, 4.4, 0, 0, 17.6);
    // gate posts, beams, doors
    for (const s of [-1, 1]) {
      bx(darkWoodM, 0.3, 3.1, 0.3, s * 1.7, 0, gz, { solid: true, round: true });
      bx(darkWoodM, 0.16, 2.4, 0.16, s * 1.7, 0, gz + 0.9, { solid: true, round: true }); // rear control posts
      bx(darkWoodM, 0.12, 0.12, 1.0, s * 1.7, 2.3, gz + 0.45);
      bx(graniteM, 0.5, 0.18, 0.5, s * 1.7, 0, gz, { round: true });
      // door leaves swung open against the posts
      const f = F(s * 1.62, gz - 0.05, s * -1.35);
      f.bx(darkWoodM, 1.45, 2.3, 0.06, s * 0.72, 0.05, 0, { round: true });
      for (const y of [0.4, 1.2, 2.0]) f.bx(iron, 1.4, 0.05, 0.02, s * 0.72, y, 0.04);
      for (let i = 0; i < 5; i++) f.cy(iron, 0.03, 0.03, 0.02, s * (0.2 + i * 0.26), 1.2, 0.05, 8, { rx: PI / 2 });
    }
    bx(darkWoodM, 4.2, 0.34, 0.3, 0, 2.55, gz, { round: true }); // kabuki beam
    bx(darkWoodM, 4.6, 0.2, 0.36, 0, 3.1, gz, { round: true });
    // plaque
    bx(darkWoodM, 2.6, 0.62, 0.08, 0, 2.2 - 0.3, gz - 0.2, { round: true });
    pl(sign(["CHERRY BLOSSOM", "GARDEN"], "#2e2016", "#f3d9a4", 256, 64), 2.4, 0.54, 0, 2.21, gz - 0.245, PI);
    // gabled tile roof
    for (const s of [-1, 1]) {
      const g = new THREE.BoxGeometry(5.2, 0.12, 1.3);
      put(roofM, xf(g, 0, 3.55, gz + s * 0.55, 0, s * 0.42), 1.6);
      bx(darkWoodM, 5.2, 0.08, 0.1, 0, 3.22, gz + s * 1.14);
    }
    cy(roofM, 0.12, 0.12, 5.3, 0, 3.8, gz, 10, { rz: PI / 2 });
    for (const s of [-1, 1]) lat(roofM, [[0, 0], [0.16, 0], [0.18, 0.1], [0.08, 0.3], [0, 0.32]], s * 2.6, 3.72, gz, 10);
    col(-2.6, 2.6, gz - 1.2, gz + 1.2, 3.2, 3.9, true);
    // clipped hedges flanking the gate
    for (const s of [-1, 1]) {
      const hx = s * 5.2;
      bx(leafM, 6.4, 1.1, 0.9, hx, 0, gz, { round: true, solid: true, unit: 1.2 });
      for (let i = 0; i < 7; i++) sph(leafM, 0.5, hx - 3 + i, 1.05, gz, 1.1, 0.35, 0.95, 10);
    }
    // monument stone with engraved garden name
    {
      const g = rockGeo(901, 1);
      g.scale(1.3, 1.0, 0.45);
      put(rockM, xf(g, -3.4, 0.8, 18.1, 0.15), 1.2);
      col(-4.6, -2.2, 17.6, 18.6, 0, 1.7, true);
      pl(sign(["CHERRY BLOSSOM GARDEN", "Est. 1897"], "#6d6a62", "#23201c", 256, 96), 1.6, 0.6, -3.35, 1.05, 17.58, PI + 0.15);
    }
    // garden map board on legs
    {
      const f = F(3.6, 17.8, PI - 0.2);
      f.bx(darkWoodM, 1.6, 1.1, 0.08, 0, 0.8, 0, { round: true });
      f.bx(darkWoodM, 0.08, 0.8, 0.08, -0.7, 0, 0);
      f.bx(darkWoodM, 0.08, 0.8, 0.08, 0.7, 0, 0);
      f.bx(roofM, 1.8, 0.06, 0.4, 0, 1.95, 0, { rx: 0.2 });
      f.pl(sign(["GARDEN MAP", "Koi Pond & Bridge  ^", "Tea House  <", "Hanami Lawn  >", "Shrine  <<   Water Wheel  >>"], "#f1e6cc", "#3a2616", 256, 192), 1.44, 0.98, 0, 1.35, 0.045);
      f.col(-0.85, 0.85, -0.1, 0.1, 0, 1.95);
    }
    // bicycles parked by the fence (frames from tubes)
    for (let i = 0; i < 3; i++) {
      const f = F(-7.2 + i * 0.75, 19.1, PI / 2 + 0.05 * i);
      const c = [k.mat(null, "#2f7fc0", [1, 1], { roughness: 0.35, metalness: 0.5 }), k.mat(null, "#e8e2d4", [1, 1], { roughness: 0.35, metalness: 0.4 }), vermM][i];
      for (const lx of [-0.52, 0.52]) f.geo(blackLacM, new THREE.TorusGeometry(0.33, 0.025, 6, 24), lx, 0.35, 0);
      f.rail(c, [[-0.52, 0.35, 0], [-0.1, 0.35, 0], [0.3, 0.8, 0], [-0.2, 0.78, 0], [-0.1, 0.35, 0]], 0.02);
      f.rail(c, [[0.3, 0.8, 0], [0.52, 0.35, 0]], 0.02);
      f.rail(c, [[-0.2, 0.78, 0], [-0.25, 0.9, 0]], 0.015);
      f.bx(blackLacM, 0.22, 0.05, 0.1, -0.25, 0.9, 0, { round: true });
      f.rail(iron, [[0.3, 0.8, 0], [0.33, 0.98, 0]], 0.015);
      f.cy(iron, 0.012, 0.012, 0.5, 0.33, 0.98, 0, 6, { rx: PI / 2 });
      f.bx(k.mat(null, "#c9b27a", [1, 1], { roughness: 0.9 }), 0.28, 0.2, 0.26, 0.55, 0.78, 0, { round: true }); // basket
      f.col(-0.85, 0.85, -0.15, 0.15, 0, 1.0);
    }
  }

  // ======================= TEA HOUSE (north-west) =======================
  {
    const x1 = -19.6, x2 = -12.6, z1 = -17.2, z2 = -11.8, FT = 0.45; // interior + front engawa
    const cx = (x1 + x2) / 2;
    // stone foundation stones and raised floor
    for (let x = x1; x <= x2 + 0.01; x += 1.75) for (const z of [z1, (z1 + z2) / 2, z2, z2 + 0.9]) {
      const g = rockGeo(700 + Math.round(x * 3 + z), 0);
      g.scale(0.26, 0.18, 0.26);
      put(graniteM, xf(g, x, 0.08, z), 0.8);
      cy(darkWoodM, 0.06, 0.06, FT - 0.12, x, 0.12, z, 8);
    }
    bx(darkWoodM, x2 - x1 + 0.2, 0.1, z2 - z1 + 0.2, cx, FT - 0.12, (z1 + z2) / 2);
    col(x1 - 0.1, x2 + 0.1, z1 - 0.1, z2 + 0.95, 0, FT, true);
    // tatami (2 × 1 mats, alternating orientation)
    const tg = () => boxGeo(1.76, 0.05, 0.88);
    const tr = rng(55);
    for (let i = 0; i < 7; i++) for (let j = 0; j < 5; j++) {
      const x = x1 + 0.9 + i * 0.9 + 0.0, z = z1 + 0.55 + j * 1.0;
      if (x > x2 - 0.3) continue;
      inst("tatami", tg, tatamiM, { pos: [x + 0.0, FT - 0.02, z], rotY: (i + j) % 2 ? PI / 2 : 0, scale: [0.5, 1, 1.12], color: tr() < 0.3 ? "#f2ecd2" : "#ffffff" });
    }
    // engawa (veranda planks) along the front
    for (let i = 0; i < 6; i++) bx(cedarM, x2 - x1 + 0.2, 0.05, 0.14, cx, FT - 0.05, z2 + 0.1 + i * 0.15);
    // posts
    for (const x of [x1, x1 + 2.33, x1 + 4.67, x2]) for (const z of [z1, z2]) bx(cedarM, 0.14, 2.45, 0.14, x, FT, z, { round: true });
    for (const x of [x1, x2]) bx(cedarM, 0.14, 2.45, 0.14, x, FT, (z1 + z2) / 2, { round: true });
    // walls: back = plaster with a shoji window, west = shoji, east = half-open shoji
    const WH = 2.3;
    bx(plasterM, x2 - x1, WH, 0.1, cx, FT, z1, { unit: 2 });
    col(x1, x2, z1 - 0.1, z1 + 0.1, FT, FT + WH, true);
    pl(shojiM, 1.4, 0.9, x1 + 1.3, FT + 1.5, z1 + 0.056);
    // tokonoma alcove with a framed painting + ikebana
    {
      const tx0 = x2 - 1.9;
      bx(cedarM, 1.8, 0.18, 0.7, tx0 + 0.9, FT, z1 + 0.4);
      const pi = 9; // The Japanese Footbridge
      const P = PAINTINGS[pi];
      const ph = 0.72, pw = (ph * P.w) / P.h;
      bx(darkWoodM, pw + 0.1, ph + 0.1, 0.04, tx0 + 0.9, FT + 1.05, z1 + 0.07);
      pl(k.mat(realPaintingTex(pi), "#ffffff", [1, 1], { roughness: 0.6, bump: 0 }), pw, ph, tx0 + 0.9, FT + 1.1 + ph / 2, z1 + 0.095);
      lat(ceramicM, [[0, 0], [0.08, 0], [0.12, 0.1], [0.06, 0.26], [0.05, 0.3], [0, 0.3]], tx0 + 0.5, FT + 0.18, z1 + 0.4, 16);
      tb(barkM, [[tx0 + 0.5, FT + 0.45, z1 + 0.4], [tx0 + 0.62, FT + 0.8, z1 + 0.38], [tx0 + 0.85, FT + 0.95, z1 + 0.45]], 0.012, 10, 4);
      for (let i = 0; i < 5; i++) inst("bl0", clumpG, blossomM[0], { pos: [tx0 + 0.55 + i * 0.07, FT + 0.7 + i * 0.05, z1 + 0.42], rotY: i, scale: [0.18, 0.18, 1] });
    }
    for (const [z0, z3] of [[z1, z2]] as [number, number][]) {
      const n = 4, w = (z3 - z0) / n;
      for (let i = 0; i < n; i++) pl(shojiM, w - 0.04, WH - 0.1, x1 + 0.02, FT + WH / 2, z0 + w * (i + 0.5), PI / 2);
      for (let i = 0; i < n; i++) pl(shojiM, w - 0.04, WH - 0.1, x1 - 0.02, FT + WH / 2, z0 + w * (i + 0.5), -PI / 2);
      col(x1 - 0.08, x1 + 0.08, z0, z3, FT, FT + WH, true);
      // east side: two panels slid together at the back half
      for (let i = 0; i < 2; i++) { pl(shojiM, w - 0.04, WH - 0.1, x2 - 0.02 + i * 0.05, FT + WH / 2, z0 + w * (0.5 + i * 0.35), PI / 2); pl(shojiM, w - 0.04, WH - 0.1, x2 + 0.02 + i * 0.05, FT + WH / 2, z0 + w * (0.5 + i * 0.35), -PI / 2); }
      col(x2 - 0.06, x2 + 0.12, z0, z0 + w * 1.4, FT, FT + WH, true);
    }
    // lintel + ranma
    bx(cedarM, x2 - x1, 0.16, 0.14, cx, FT + WH, z2);
    bx(cedarM, 0.14, 0.16, z2 - z1, x1, FT + WH, (z1 + z2) / 2);
    bx(cedarM, 0.14, 0.16, z2 - z1, x2, FT + WH, (z1 + z2) / 2);
    // hip roof with flared eaves (pyramid on a rectangular plan) + ridge
    {
      const rw = x2 - x1 + 2.2, rd = z2 - z1 + 2.6, rh = 1.9, ry = FT + WH + 0.16;
      const g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1, true);
      g.rotateY(PI / 4);
      g.scale(rw, rh, rd);
      put(roofM, xf(g, cx, ry + rh / 2, (z1 + z2) / 2 + 0.45), 1.6);
      const under = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1, true);
      under.rotateY(PI / 4); under.scale(rw - 0.05, rh - 0.02, rd - 0.05);
      under.scale(-1, 1, 1); // flip winding so the underside renders
      put(darkWoodM, xf(under, cx, ry + rh / 2 - 0.05, (z1 + z2) / 2 + 0.45), 1.2);
      bx(darkWoodM, rw - 0.1, 0.1, 0.12, cx, ry - 0.02, z2 + 1.72);
      bx(darkWoodM, rw - 0.1, 0.1, 0.12, cx, ry - 0.02, z1 - 0.82);
      lat(roofM, [[0, 0], [0.22, 0], [0.24, 0.12], [0.1, 0.32], [0, 0.36]], cx, ry + rh - 0.08, (z1 + z2) / 2 + 0.45, 12);
      col(x1 - 0.6, x2 + 0.6, z1 - 0.3, z2 + 1.2, ry, ry + 0.9, true);
    }
    // interior: low table, zabuton cushions, tea set, kettle on a brazier
    {
      const tz = (z1 + z2) / 2 + 0.2, tx0 = cx - 0.6;
      bx(darkWoodM, 1.2, 0.05, 0.75, tx0, FT + 0.3, tz, { round: true });
      for (const [a, b] of [[-0.52, -0.3], [0.52, -0.3], [-0.52, 0.3], [0.52, 0.3]]) bx(darkWoodM, 0.06, 0.3, 0.06, tx0 + a, FT, tz + b);
      col(tx0 - 0.6, tx0 + 0.6, tz - 0.38, tz + 0.38, FT, FT + 0.35, true);
      for (const [a, b, rot] of [[-1.0, 0, 0.1], [1.0, 0, -0.1], [0, 0.8, 0], [0, -0.8, 0.05]] as V3[]) {
        const f = F(tx0 + a, tz + b, rot);
        f.bx(feltM, 0.55, 0.07, 0.55, 0, FT, 0, { round: true });
      }
      for (let i = 0; i < 4; i++) {
        const x = tx0 - 0.4 + i * 0.26;
        lat(ceramicM, [[0, 0], [0.03, 0], [0.045, 0.02], [0.05, 0.07], [0.047, 0.07], [0, 0.015]], x, FT + 0.35, tz - 0.15 + (i % 2) * 0.2, 14);
      }
      lat(k.mat(null, "#6a8a3a", [1, 1], { roughness: 0.3 }), [[0, 0], [0.028, 0], [0.04, 0.03], [0.03, 0.06], [0, 0.06]], tx0 + 0.3, FT + 0.35, tz, 12);
      // brazier + iron kettle
      lat(k.mat(null, "#6b5a3a", [1, 1], { roughness: 0.5 }), [[0, 0], [0.22, 0], [0.24, 0.28], [0.2, 0.3], [0, 0.3]], tx0 + 1.5, FT, tz - 1.1, 18);
      lat(iron, [[0, 0], [0.12, 0], [0.18, 0.08], [0.16, 0.18], [0.06, 0.22], [0.04, 0.26], [0, 0.26]], tx0 + 1.5, FT + 0.3, tz - 1.1, 16);
      col(tx0 + 1.25, tx0 + 1.75, tz - 1.35, tz - 0.85, FT, FT + 0.56, true);
    }
    // hanging paper lanterns at the eave (the two tea house point lights sit inside these)
    for (const x of [x1 + 1.6, x2 - 1.6]) {
      cy(ropeM, 0.006, 0.006, 0.35, x, FT + WH - 0.2, z2 + 0.95, 4);
      lat(lanternRedM, [[0.0, -0.02], [0.14, 0], [0.2, 0.1], [0.22, 0.22], [0.2, 0.34], [0.14, 0.44], [0, 0.46]], x, FT + WH - 0.66, z2 + 0.95, 16);
      cy(blackLacM, 0.1, 0.1, 0.04, x, FT + WH - 0.68, z2 + 0.95, 12);
      cy(blackLacM, 0.1, 0.1, 0.04, x, FT + WH - 0.22, z2 + 0.95, 12);
    }
    // stepping stone (kutsunugi) + geta sandals
    bx(graniteM, 0.9, 0.24, 0.55, cx + 1.2, 0, z2 + 1.35, { round: true, solid: true });
    for (const s of [-1, 1]) { bx(cedarM, 0.1, 0.03, 0.24, cx + 1.1 + s * 0.08, 0.24, z2 + 1.35, { round: true }); }
    // sign
    {
      const f = F(x2 + 0.9, z2 + 1.6, -0.5);
      f.bx(darkWoodM, 0.09, 1.1, 0.09, 0, 0, 0);
      f.bx(darkWoodM, 0.9, 0.34, 0.05, 0, 0.95, 0.06, { round: true });
      f.pl(sign(["TEA HOUSE"], "#3a2616", "#f3d9a4", 256, 96), 0.84, 0.3, 0, 1.12, 0.09);
    }
    k.room("Tea House", x1 - 0.5, x2 + 0.5, z1 - 0.5, z2 + 1.2);
    // tsukubai: stone basin with a bamboo spout + ladle, and a shishi-odoshi deer scarer
    {
      const tx0 = x2 + 1.6, tz = z1 + 0.6;
      const g = rockGeo(811, 1); g.scale(0.5, 0.35, 0.5);
      put(rockM, xf(g, tx0, 0.3, tz), 1.2);
      put(streamM, xf(new THREE.CircleGeometry(0.22, 16), tx0, 0.58, tz, 0, -PI / 2), 0);
      col(tx0 - 0.45, tx0 + 0.45, tz - 0.45, tz + 0.45, 0, 0.62, true);
      tb(bambooM, [[tx0 + 0.9, 0.9, tz - 0.3], [tx0 + 0.3, 0.85, tz - 0.1]], 0.035, 4);
      cy(bambooM, 0.04, 0.04, 0.9, tx0 + 0.9, 0, tz - 0.3, 8);
      tb(cedarM, [[tx0 - 0.1, 0.62, tz + 0.05], [tx0 - 0.5, 0.64, tz + 0.2]], 0.01, 4);
      cy(cedarM, 0.035, 0.035, 0.07, tx0 - 0.08, 0.6, tz + 0.04, 10);
      // shishi-odoshi
      for (const s of [-1, 1]) cy(bambooM, 0.03, 0.03, 0.55, tx0 + 1.5, 0, tz + 0.5 + s * 0.12, 8);
      tb(bambooM, [[tx0 + 1.1, 0.42, tz + 0.5], [tx0 + 1.95, 0.62, tz + 0.5]], 0.045, 4);
      for (let i = 0; i < 6; i++) { const a = i * 1.05; const gg = rockGeo(830 + i, 0); gg.scale(0.18, 0.12, 0.18); put(graniteM, xf(gg, tx0 + Math.cos(a) * 0.6, 0.04, tz + Math.sin(a) * 0.6), 0.8); }
    }
  }

  // ======================= STREAM + WATER WHEEL + MILL HUT (north-east) =======================
  const WHEEL: V3 = [18.75, 1.15, -16.2];
  {
    const sp: [number, number][] = [[18.9, -19.6], [18.8, -16.2], [16.8, -12.8], [14.2, -9.4], [11.6, -5.6], [9.6, -3.0], [8.4, -1.8]];
    pathStrip(pondBedM, sp, 1.9, 0.008, 1.4);
    pathStrip(streamM, sp, 1.5, 0.16, 1.2);
    // pebbles + rocks along the banks
    const c = new THREE.CatmullRomCurve3(sp.map(([x, z]) => new THREE.Vector3(x, 0, z)));
    const rr = rng(95);
    for (let i = 0; i < 46; i++) {
      const t = i / 46, p = c.getPointAt(t), d = c.getTangentAt(t);
      const s = i % 2 ? 1 : -1, off = 0.95 + rr() * 0.25;
      const x = p.x - d.z * off * s, z = p.z + d.x * off * s;
      const big = i % 6 === 0, sc = big ? 0.45 + rr() * 0.2 : 0.14 + rr() * 0.14;
      const g = rockGeo(200 + i, big ? 1 : 0);
      g.scale(sc * 1.3, sc * 0.7, sc);
      put(big ? rockM : graniteM, xf(g, x, sc * 0.1, z, rr() * 6), big ? 1.2 : 0.8);
      if (big) col(x - sc, x + sc, z - sc, z + sc, 0, sc * 0.75, true);
    }
    // granite slab bridge where the gravel path crosses
    {
      const f = F(11.9, -5.35, 0.62);
      f.bx(graniteM, 1.4, 0.22, 2.6, 0, 0, 0, { round: true });
      f.col(-0.7, 0.7, -1.3, 1.3, 0, 0.22, true);
    }
    // mill hut
    const hx1 = 19.9, hx2 = 23.4, hz1 = -18.9, hz2 = -14.6;
    const hcx = (hx1 + hx2) / 2, hcz = (hz1 + hz2) / 2;
    bx(graniteM, hx2 - hx1 + 0.3, 0.25, hz2 - hz1 + 0.3, hcx, 0, hcz, { unit: 0.8 });
    col(hx1 - 0.15, hx2 + 0.15, hz1 - 0.15, hz2 + 0.15, 0, 0.25, true);
    for (const [x, z] of [[hx1, hz1], [hx2, hz1], [hx1, hz2], [hx2, hz2]]) bx(darkWoodM, 0.16, 2.5, 0.16, x, 0.25, z, { round: true });
    const board = U(k.mat(k.tex("skBoard", () => T.wood("#7a5636", "#4a3220", 17)), "#ffffff", [1, 1], { roughness: 0.75, bump: 0.9 }), 1.4);
    bx(board, hx2 - hx1, 2.3, 0.08, hcx, 0.25, hz1, { solid: true });
    bx(board, 0.08, 2.3, hz2 - hz1, hx2, 0.25, hcz, { solid: true });
    bx(board, 0.08, 2.3, hz2 - hz1 - 1.3, hx1, 0.25, hcz - 0.65, { solid: true });
    bx(board, 0.08, 0.5, 1.3, hx1, 2.05, hz2 - 0.65);
    bx(board, hx2 - hx1 - 1.6, 2.3, 0.08, hcx + 0.8, 0.25, hz2, { solid: true });
    bx(board, 1.6, 0.5, 0.08, hx1 + 0.8, 2.05, hz2);
    for (const s of [-1, 1]) put(roofM, xf(new THREE.BoxGeometry(hx2 - hx1 + 1.0, 0.1, (hz2 - hz1) / 2 + 0.75), hcx, 2.95, hcz + s * ((hz2 - hz1) / 4 + 0.2), 0, s * 0.5), 1.6);
    cy(roofM, 0.1, 0.1, hx2 - hx1 + 1.0, hcx, 3.32, hcz, 8, { rz: PI / 2 });
    for (const s of [-1, 1]) { const tri = new THREE.Shape([new THREE.Vector2(-(hz2 - hz1) / 2, 0), new THREE.Vector2((hz2 - hz1) / 2, 0), new THREE.Vector2(0, 0.75)]); const g = new THREE.ShapeGeometry(tri); put(board, xf(g, s < 0 ? hx1 : hx2, 2.55, hcz, s * PI / 2), 1.4); }
    col(hx1 - 0.5, hx2 + 0.5, hz1 - 0.5, hz2 + 0.5, 2.6, 3.2, true);
    // rice sacks + millstone inside
    for (let i = 0; i < 5; i++) inst("sack", () => { const g = new THREE.SphereGeometry(0.3, 12, 8); g.scale(1, 0.7, 0.75); return g; }, k.mat(k.tex("skSack", () => T.noise("#cdbb92", 0.12, 7, 1400)), "#ffffff", [1, 1], { roughness: 1, bump: 0 }),
      { pos: [22.6 - (i % 3) * 0.55, 0.45 + Math.floor(i / 3) * 0.38, -18.2 + (i % 2) * 0.2], rotY: i }, false);
    col(21.3, 23.1, -18.7, -17.7, 0.25, 1.1, true);
    cy(graniteM, 0.55, 0.55, 0.3, 21.4, 0.25, -16.2, 20);
    cy(graniteM, 0.5, 0.5, 0.2, 21.4, 0.55, -16.2, 20);
    col(20.85, 21.95, -16.75, -15.65, 0.25, 0.75, true);
    // wooden water chute over the wheel
    bx(board, 0.4, 0.12, 3.2, 18.75, 2.35, -17.9);
    for (const z of [-19.2, -18.2]) bx(darkWoodM, 0.1, 2.35, 0.1, 18.75, 0, z);
    pl(streamM, 0.3, 3.1, 18.75, 2.42, -17.9, 0, -PI / 2);
    pl(streamM, 0.3, 0.9, 18.75, 2.1, -16.35, 0, 0.2);
    // the wheel itself (spins around its x axis)
    {
      const parts: THREE.BufferGeometry[] = [];
      for (const s of [-1, 1]) parts.push(new THREE.TorusGeometry(1.05, 0.05, 6, 32).rotateY(PI / 2).translate(s * 0.22, 0, 0));
      for (let i = 0; i < 8; i++) parts.push(new THREE.BoxGeometry(0.06, 2.05, 0.08).rotateX((i / 8) * PI).translate(0.22, 0, 0), new THREE.BoxGeometry(0.06, 2.05, 0.08).rotateX((i / 8) * PI).translate(-0.22, 0, 0));
      for (let i = 0; i < 16; i++) { const a = (i / 16) * PI * 2; parts.push(new THREE.BoxGeometry(0.5, 0.05, 0.3).rotateX(-a).translate(0, Math.sin(a) * 1.05, Math.cos(a) * 1.05)); }
      parts.push(new THREE.CylinderGeometry(0.1, 0.1, 0.7, 12).rotateZ(PI / 2));
      const g = mg(parts);
      worldUV(g, 1.2);
      const wheel = k.add(g, board, WHEEL, {});
      wheel.userData.spin = { axis: [1, 0, 0], speed: -0.7 };
      cy(iron, 0.05, 0.05, 1.3, 18.75 + 0.2, 0, -16.2, 8, { rz: PI / 2 });
      bx(darkWoodM, 0.12, 1.15, 0.12, 18.75 + 0.5, 0, -16.2);
      col(18.4, 19.1, -17.3, -15.1, 0, 2.2, false);
    }
    k.room("Water Wheel", 16.5, 23.7, -19.7, -13.5);
  }

  // ======================= BAMBOO GROVE (north-east corner, west of the mill) =======================
  {
    const rr = rng(66);
    const bl = k.mat(k.tex("leaves", T.leaves), "#7aa048", [1, 1], { roughness: 0.8, bump: 0.5 });
    for (let i = 0; i < 34; i++) {
      const x = 12.2 + rr() * 5.2, z = -19.4 + rr() * 3.0;
      const h = 6 + rr() * 3.5, r = 0.05 + rr() * 0.03;
      const lean = (rr() - 0.5) * 0.6;
      tb(bambooM, [[x, 0, z], [x + lean * 0.3, h * 0.5, z + lean * 0.2], [x + lean, h, z + lean * 0.6]], r, 8, 8);
      for (let j = 0; j < 5; j++) inst("bleaf", () => { const g = new THREE.PlaneGeometry(0.9, 0.4); return g; }, bl, { pos: [x + lean * (0.6 + j * 0.08) + (rr() - 0.5) * 0.8, h * (0.62 + j * 0.08), z + (rr() - 0.5) * 0.8], rotY: rr() * 6, rotX: -0.8 + rr() * 0.5, rotZ: rr() }, true);
      if (i % 2 === 0) col(x - r - 0.02, x + r + 0.02, z - r - 0.02, z + r + 0.02, 0, 3, false);
    }
    for (let i = 0; i < 20; i++) inst("leafLitter", () => { const g = new THREE.CircleGeometry(0.6, 8); g.rotateX(-PI / 2); return g; }, k.mat(null, "#a89a5a", [1, 1], { roughness: 1 }), { pos: [12.4 + rr() * 5, 0.013 + i * 0.0002, -19.3 + rr() * 2.8], scale: [0.8 + rr(), 1, 0.6 + rr()] }, true);
    k.room("Bamboo Grove", 12, 17.6, -19.7, -16);
  }

  // ======================= ROCK GARDEN (west) =======================
  {
    const gx1 = -23.4, gx2 = -15.8, gz1 = -8.6, gz2 = -2.2;
    bx(gravelM, gx2 - gx1, 0.03, gz2 - gz1, (gx1 + gx2) / 2, 0, (gz1 + gz2) / 2, { unit: 1.6 });
    // stone curb
    for (const [a, b, c2, d] of [[gx1, gx2, gz1, gz1], [gx1, gx2, gz2, gz2], [gx2, gx2, gz1, gz2]] as [number, number, number, number][]) {
      const L = Math.hypot(b - a, d - c2);
      bx(graniteM, a === b ? 0.22 : L, 0.12, a === b ? L : 0.22, (a + b) / 2, 0, (c2 + d) / 2, { unit: 0.8 });
    }
    // rock islands with moss collars + concentric raked rings (dark torus lines)
    for (const [x, z, s, seed] of [[-21.2, -6.4, 1.1, 1], [-20.2, -5.9, 0.6, 2], [-17.8, -3.6, 0.8, 3], [-22.2, -3.4, 0.5, 4], [-18.6, -7.4, 0.45, 5]] as [number, number, number, number][]) {
      const g = rockGeo(600 + seed, 1);
      g.scale(s * 1.1, s * 0.9, s * 0.9);
      put(rockM, xf(g, x, s * 0.25, z, seed), 1.2);
      col(x - s * 0.9, x + s * 0.9, z - s * 0.8, z + s * 0.8, 0, s * 1.05, true);
      const mg2 = new THREE.CircleGeometry(s * 1.3, 18); mg2.rotateX(-PI / 2);
      put(mossM, xf(mg2, x, 0.035, z), 0.8);
      for (let q = 1; q <= 3; q++) inst("rakeRing", () => new THREE.TorusGeometry(1, 0.025, 3, 40), k.mat(null, "#9c9484", [1, 1], { roughness: 1 }), { pos: [x, 0.03, z], rotX: PI / 2, scale: [s * 1.3 + q * 0.28, s * 1.3 + q * 0.28, 1] }, true);
    }
    // viewing bench
    {
      const f = F(-14.9, -5.4, -PI / 2);
      f.bx(cedarM, 1.8, 0.07, 0.42, 0, 0.42, 0, { round: true });
      for (const lx of [-0.75, 0.75]) f.bx(darkWoodM, 0.1, 0.42, 0.36, lx, 0, 0);
      f.col(-0.9, 0.9, -0.21, 0.21, 0, 0.49);
    }
    {
      const f = F(-15.4, -2.0, -PI / 2 - 0.3);
      f.bx(darkWoodM, 0.08, 0.9, 0.08, 0, 0, 0);
      f.bx(darkWoodM, 0.8, 0.4, 0.05, 0, 0.75, 0.05, { round: true });
      f.pl(sign(["ROCK GARDEN", "Please do not walk", "on the raked gravel"], "#3a2616", "#f3d9a4", 256, 128), 0.74, 0.37, 0, 0.95, 0.08);
    }
    k.room("Rock Garden", gx1, gx2, gz1, gz2);
  }

  // ======================= SHRINE (south-west) =======================
  {
    const sx = -20.6, sz = 12.2;
    // torii (vermilion with black kasagi)
    {
      const tx0 = -15.2;
      for (const s of [-1, 1]) {
        cy(vermM, 0.15, 0.18, 3.3, tx0, 0, sz + s * 1.35, 16);
        cy(blackLacM, 0.22, 0.24, 0.3, tx0, 0, sz + s * 1.35, 16);
        col(tx0 - 0.2, tx0 + 0.2, sz + s * 1.35 - 0.2, sz + s * 1.35 + 0.2, 0, 3.3, true);
      }
      bx(vermM, 0.22, 0.2, 3.5, tx0, 2.7, sz, { round: true });
      bx(vermM, 0.3, 0.26, 4.2, tx0, 3.3, sz, { round: true });
      const ks = new THREE.BoxGeometry(0.4, 0.16, 4.8, 1, 1, 12);
      const p = ks.attributes.position;
      for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + 0.06 * Math.pow(p.getZ(i) / 2.4, 2) * 4);
      ks.computeVertexNormals();
      put(blackLacM, xf(ks, tx0, 3.62, sz), 0);
      bx(vermM, 0.12, 0.5, 0.35, tx0, 2.9, sz, { round: true });
      pl(sign(["SHRINE"], "#1c1a18", "#e8c35a", 128, 192), 0.24, 0.36, tx0 + 0.07, 3.15, sz, PI / 2);
      col(tx0 - 0.3, tx0 + 0.3, sz - 2.4, sz + 2.4, 3.2, 3.75, true);
    }
    pathStrip(flagM, [[-15.2, sz], [-19.4, sz]], 1.4, 0.013);
    // hokora (small shrine house) on a stone plinth
    {
      bx(graniteM, 1.8, 0.5, 1.6, sx - 0.4, 0, sz, { round: true, solid: true });
      bx(graniteM, 1.3, 0.25, 0.5, sx + 0.7, 0, sz, { round: true, solid: true });
      bx(cedarM, 1.1, 0.9, 1.0, sx - 0.4, 0.5, sz, { round: true, solid: true });
      pl(k.mat(null, "#e8c35a", [1, 1], { roughness: 0.3, metalness: 0.8 }), 0.4, 0.4, sx + 0.16, 1.05, sz, PI / 2);
      for (const s of [-1, 1]) put(roofM, xf(new THREE.BoxGeometry(1.6, 0.07, 0.85), sx - 0.4, 1.62, sz + s * 0.36, 0, s * 0.62), 1.6);
      cy(roofM, 0.05, 0.05, 1.6, sx - 0.4, 1.86, sz, 8, { rz: PI / 2 });
      // shimenawa rope with paper streamers
      tb(k.mat(null, "#d8c690", [1, 1], { roughness: 1 }), [[sx + 0.12, 1.3, sz - 0.55], [sx + 0.2, 1.2, sz], [sx + 0.12, 1.3, sz + 0.55]], 0.04, 16, 6);
      for (const d of [-0.3, 0, 0.3]) pl(k.mat(null, "#fafaf5", [1, 1], { roughness: 0.9 }), 0.08, 0.26, sx + 0.21, 1.02, sz + d, PI / 2);
      // offering box + bell rope
      bx(darkWoodM, 0.6, 0.45, 0.4, sx + 1.3, 0, sz, { round: true, solid: true });
      for (let i = 0; i < 6; i++) bx(k.mat(null, "#3a2a1c", [1, 1]), 0.6, 0.02, 0.03, sx + 1.3, 0.46, sz - 0.15 + i * 0.06);
      tb(k.mat(null, "#e04a3a", [1, 1], { roughness: 0.8 }), [[sx + 0.4, 1.55, sz], [sx + 0.5, 0.9, sz + 0.05], [sx + 0.45, 0.4, sz]], 0.035, 10, 6);
      sph(brassM, 0.1, sx + 0.4, 1.58, sz, 1, 0.9, 1, 12);
      // stone fox guardians
      for (const s of [-1, 1]) {
        const fx = sx + 2.1, fz = sz + s * 1.1;
        bx(graniteM, 0.5, 0.45, 0.5, fx, 0, fz, { round: true, solid: true });
        lat(graniteM, [[0, 0], [0.16, 0], [0.18, 0.2], [0.12, 0.42], [0.08, 0.5], [0, 0.52]], fx, 0.45, fz, 12);
        sph(graniteM, 0.1, fx + 0.06, 1.0, fz, 1.3, 1, 0.9, 10);
        for (const e of [-1, 1]) put(graniteM, xf(new THREE.ConeGeometry(0.03, 0.12, 6), fx + 0.04, 1.12, fz + e * 0.05), 0);
        pl(k.mat(null, "#d6402a", [1, 1], { roughness: 0.9 }), 0.22, 0.14, fx + 0.13, 0.78, fz, PI / 2); // red bib
      }
    }
    // ema rack with wooden prayer plaques
    {
      const f = F(-18.2, 14.6, PI);
      for (const lx of [-0.9, 0.9]) f.bx(darkWoodM, 0.08, 1.6, 0.08, lx, 0, 0);
      f.bx(darkWoodM, 2.0, 0.08, 0.1, 0, 1.6, 0);
      f.bx(roofM, 2.3, 0.05, 0.4, 0, 1.75, 0, { rx: 0.15 });
      for (const y of [0.9, 1.3]) f.cy(darkWoodM, 0.015, 0.015, 1.8, 0, y, 0, 6, { rz: PI / 2 });
      const er = rng(33);
      for (let i = 0; i < 26; i++) {
        const lx = -0.8 + (i % 13) * 0.13 + (er() - 0.5) * 0.03, y = i < 13 ? 0.78 : 1.18;
        inst("ema", () => { const sh = new THREE.Shape(); sh.moveTo(-0.07, 0); sh.lineTo(0.07, 0); sh.lineTo(0.07, 0.07); sh.lineTo(0, 0.1); sh.lineTo(-0.07, 0.07); sh.closePath(); return new THREE.ExtrudeGeometry(sh, { depth: 0.01, bevelEnabled: false }); }, cedarM,
          { pos: [f.wx(lx, 0.05), y - 0.05, f.wz(lx, 0.05)], rotY: PI + (er() - 0.5) * 0.4, rotX: (er() - 0.5) * 0.3 });
      }
      f.col(-1.0, 1.0, -0.15, 0.15, 0, 1.8);
    }
    k.room("Shrine", -23.7, -14.5, 8.8, 16);
  }

  // ======================= DANGO FOOD STALL (south-east) =======================
  {
    const f = F(16.2, 17.6, PI); // front faces −z (towards the lawn)
    f.bx(cedarM, 2.6, 0.9, 1.0, 0, 0.12, 0, { round: true, solid: true });
    f.bx(darkWoodM, 2.7, 0.06, 1.1, 0, 1.02, 0, { round: true });
    for (const lx of [-1.1, 1.1]) { f.geo(darkWoodM, new THREE.CylinderGeometry(0.35, 0.35, 0.08, 20), lx, 0.35, 0.55, 0, 0, PI / 2); f.geo(iron, new THREE.CylinderGeometry(0.04, 0.04, 0.1, 8), lx, 0.35, 0.58, 0, 0, PI / 2); }
    for (const lx of [-1.25, 1.25]) for (const lz of [-0.45, 0.45]) f.bx(darkWoodM, 0.08, 1.4, 0.08, lx, 1.05, lz);
    f.bx(roofM, 3.0, 0.08, 1.6, 0, 2.5, 0.1, { rx: -0.2 });
    // noren curtain + big sign
    const nor = k.mat(k.tex("skNoren", () => ST.skSign(["DANGO", "& TEA"], "#2c3e7a", "#ffffff", 256, 128, "#1a2550")), "#ffffff", [1, 1], { roughness: 0.9, bump: 0 });
    for (let i = 0; i < 4; i++) f.pl(nor, 0.62, 0.55, -0.96 + i * 0.64, 2.1, 0.56);
    f.bx(darkWoodM, 1.6, 0.4, 0.06, 0, 2.62, 0.95, { round: true, rx: -0.2 });
    f.pl(sign(["DANGO 300 YEN"], "#f3e2c0", "#8a1c1c", 256, 64), 1.5, 0.34, 0, 2.63, 0.99, 0, -0.2);
    // dango skewers on the counter (pink, white, green)
    for (let i = 0; i < 8; i++) {
      const lx = -0.9 + i * 0.12;
      f.cy(cedarM, 0.004, 0.004, 0.3, lx, 1.08, 0.3, 4, { rz: PI / 2 });
      ["#f7a8c0", "#fafaf2", "#8ab85a"].forEach((c2, j) => inst("dango", () => new THREE.SphereGeometry(0.03, 10, 8), tintM, { pos: [f.wx(lx - 0.08 + j * 0.065, 0.3), 1.1, f.wz(lx - 0.08 + j * 0.065, 0.3)], color: c2 }));
    }
    for (let i = 0; i < 3; i++) f.lat(ceramicM, [[0, 0], [0.04, 0], [0.05, 0.1], [0.045, 0.1], [0, 0.01]], 0.4 + i * 0.16, 1.08, 0.25, 12);
    f.lat(iron, [[0, 0], [0.14, 0], [0.18, 0.1], [0.14, 0.2], [0.05, 0.22], [0, 0.22]], 0.95, 1.08, -0.1, 16);
    // two red lanterns hanging at the eave front (one point light)
    for (const lx of [-1.2, 1.2]) f.lat(lanternRedM, [[0.0, -0.02], [0.12, 0], [0.17, 0.1], [0.18, 0.2], [0.17, 0.3], [0.12, 0.38], [0, 0.4]], lx, 1.95, 0.75);
    // red felt bench + big wagasa parasol
    const b = F(12.8, 17.4, PI - 0.1);
    b.bx(darkWoodM, 1.8, 0.4, 0.6, 0, 0, 0, { round: true, solid: true });
    b.bx(feltM, 1.9, 0.04, 0.7, 0, 0.4, 0, { round: true });
    b.pl(feltM, 1.9, 0.3, 0, 0.26, 0.351);
    b.cy(cedarM, 0.03, 0.03, 2.6, 1.15, 0, -0.1, 8);
    b.geo(k.mat(k.tex("skWagasa", () => ST.skLantern("#d23a2c", "#f5c9d0")), "#ffffff", [3, 1], { roughness: 0.7, bump: 0 }), new THREE.ConeGeometry(1.4, 0.5, 20, 1, true), 1.15, 2.45, -0.1);
    b.geo(darkWoodM, new THREE.CylinderGeometry(0.01, 0.01, 1.4, 4), 1.15, 2.2, -0.1, 0, 0, 1.2);
    b.lat(ceramicM, [[0, 0], [0.035, 0], [0.045, 0.08], [0, 0.08]], -0.4, 0.42, 0, 12);
    b.bx(cedarM, 0.28, 0.02, 0.12, 0.2, 0.42, 0);
    k.room("Food Stall", 11, 18.5, 15.5, 19.7);
  }

  // ======================= HANAMI LAWN (east): tarps, picnic, lantern garlands =======================
  const LAMP_PTS: V3[] = [];
  {
    const tarp = (x: number, z: number, w: number, d: number, ry: number, seed: number) => {
      const r = rng(seed);
      const g = new THREE.PlaneGeometry(w, d, 8, 8);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, (Math.sin(p.getX(i) * 3 + seed) * Math.cos(p.getY(i) * 2.5)) * 0.012);
      g.computeVertexNormals();
      g.rotateX(-PI / 2);
      put(tarpM, xf(g, x, 0.02, z, ry), 1.0);
      const f = F(x, z, ry);
      // shoes at the edge, cushions, bento boxes, bottles, cups, a thermos, a snack bag
      for (let i = 0; i < 2; i++) f.bx(tintM, 0.11, 0.08, 0.26, -w / 2 - 0.15 - i * 0.14, 0.02, d / 4, { round: true });
      for (let i = 0; i < 3; i++) f.bx(feltM, 0.42, 0.07, 0.42, -w / 2 + 0.4 + i * (w - 0.8) / 2, 0.02, -d / 2 + 0.35, { round: true, ry: r() * 0.4 });
      for (let i = 0; i < 4; i++) {
        const lx = -0.5 + (i % 2) * 0.34 + (r() - 0.5) * 0.1, lz = (Math.floor(i / 2) - 0.5) * 0.28;
        inst("bento", () => mg([boxGeo(0.26, 0.07, 0.2), boxGeo(0.27, 0.02, 0.21).translate(0, 0.045, 0)]), tintM, { pos: [f.wx(lx, lz), 0.055, f.wz(lx, lz)], rotY: ry + (r() - 0.5) * 0.3, color: ["#1c1a18", "#b8281e", "#1c1a18", "#2a4a8a"][i] });
      }
      for (let i = 0; i < 3; i++) {
        const lx = 0.3 + i * 0.12, lz = 0.2 + (r() - 0.5) * 0.2;
        inst("bottle", () => new THREE.LatheGeometry(V2([[0, 0], [0.04, 0], [0.042, 0.18], [0.02, 0.24], [0.014, 0.3], [0, 0.3]]), 12), tintM, { pos: [f.wx(lx, lz), 0.02, f.wz(lx, lz)], color: ["#3f6a3a", "#e8e0c8", "#6a3a1c"][i] });
      }
      for (let i = 0; i < 4; i++) { const a = r() * 6.28; inst("cup", () => new THREE.CylinderGeometry(0.035, 0.028, 0.07, 12, 1, true), tintM, { pos: [f.wx(0.2 + Math.cos(a) * 0.25, -0.1 + Math.sin(a) * 0.2), 0.055, f.wz(0.2 + Math.cos(a) * 0.25, -0.1 + Math.sin(a) * 0.2)], color: "#f2efe6" }); }
      f.cy(tintM, 0.05, 0.05, 0.3, w / 2 - 0.3, 0.02, d / 2 - 0.3, 12);
      inst("snack", () => { const g2 = new THREE.SphereGeometry(0.12, 10, 6); g2.scale(1, 0.35, 1.4); return g2; }, tintM, { pos: [f.wx(-0.1, 0.4), 0.06, f.wz(-0.1, 0.4)], rotY: r(), color: ["#f2c21c", "#e8453c", "#39a0e0"][seed % 3] });
      // woven picnic basket
      f.bx(k.mat(k.tex("skBasket", () => T.noise("#b08a50", 0.2, 9, 1600)), "#ffffff", [1, 1], { roughness: 0.9, bump: 0 }), 0.45, 0.3, 0.32, -w / 2 + 0.5, 0.02, d / 2 - 0.3, { round: true, solid: false });
      f.rail(k.mat(null, "#8a6a3a", [1, 1]), [[-w / 2 + 0.3, 0.32, d / 2 - 0.3], [-w / 2 + 0.5, 0.5, d / 2 - 0.3], [-w / 2 + 0.7, 0.32, d / 2 - 0.3]], 0.012);
    };
    tarp(12.6, 6.2, 2.7, 2.2, 0.2, 1);
    tarp(16.8, 12.8, 2.4, 2.0, -0.35, 2);
    tarp(7.6, 12.0, 2.2, 1.8, 0.6, 3);
    tarp(17.2, 6.0, 2.0, 1.8, 1.1, 4);
    // lantern garland strung between the lawn cherry trees
    const garland = (a: V3, b: V3, n: number) => {
      const pts: V3[] = [];
      for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - 0.7 * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t]); }
      tb(ropeM, pts, 0.008, 40, 4);
      for (let i = 1; i < n; i++) {
        const t = i / n, p: V3 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - 0.7 * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t];
        inst(`gl${i % 3}`, () => new THREE.LatheGeometry(V2([[0.0, -0.01], [0.09, 0], [0.13, 0.08], [0.14, 0.16], [0.13, 0.24], [0.09, 0.3], [0, 0.32]]), 12), [lanternPinkM, lanternWhiteM, lanternRedM][i % 3], { pos: [p[0], p[1] - 0.4, p[2]], rotY: i });
        if (i === Math.floor(n / 2)) LAMP_PTS.push([p[0], p[1] - 0.25, p[2]]);
      }
      for (const e of [a, b]) cy(darkWoodM, 0.05, 0.06, e[1] + 0.2, e[0], 0, e[2], 8);
    };
    garland([10.6, 3.4, 5.0], [14.8, 3.4, 9.0], 9);
    garland([14.8, 3.4, 9.0], [18.2, 3.4, 13.4], 8);
    garland([6.2, 3.4, 10.4], [10.6, 3.4, 5.0], 8);
    for (const [x, z] of [[10.6, 5.0], [14.8, 9.0], [18.2, 13.4], [6.2, 10.4]] as [number, number][]) col(x - 0.07, x + 0.07, z - 0.07, z + 0.07, 0, 3.6, false);
    k.room("Hanami Lawn", 5, 21, 3, 15);
  }

  // ======================= STONE LANTERNS =======================
  {
    const kasuga = (x: number, z: number, s = 1, ry = 0) => {
      lat(graniteM, [[0.34 * s, 0], [0.34 * s, 0.12 * s], [0.2 * s, 0.2 * s], [0.12 * s, 0.26 * s], [0.1 * s, 0.95 * s], [0.14 * s, 1.0 * s], [0.3 * s, 1.02 * s], [0.3 * s, 1.12 * s], [0, 1.12 * s]], x, 0, z, 6);
      const g = new THREE.BoxGeometry(0.34 * s, 0.34 * s, 0.34 * s);
      put(graniteM, xf(g, x, 1.3 * s, z, ry), 0.8);
      pl(k.mat(null, "#2a2622", [1, 1], { roughness: 1 }), 0.14 * s, 0.16 * s, x + Math.sin(ry) * 0.172 * s, 1.3 * s, z + Math.cos(ry) * 0.172 * s, ry);
      put(graniteM, xf(new THREE.ConeGeometry(0.46 * s, 0.3 * s, 6), x, 1.62 * s, z, ry), 0.8);
      put(graniteM, xf(new THREE.CylinderGeometry(0.4 * s, 0.44 * s, 0.06 * s, 6), x, 1.49 * s, z, ry), 0.8);
      lat(graniteM, [[0, 0], [0.07 * s, 0], [0.09 * s, 0.06 * s], [0.05 * s, 0.16 * s], [0, 0.2 * s]], x, 1.76 * s, z, 10);
      put(mossM, xf(new THREE.ConeGeometry(0.44 * s, 0.1 * s, 6, 1, true), x, 1.7 * s, z, ry), 0.8);
      col(x - 0.34 * s, x + 0.34 * s, z - 0.34 * s, z + 0.34 * s, 0, 1.96 * s, true);
    };
    const yukimi = (x: number, z: number, s = 1) => {
      for (let i = 0; i < 3; i++) { const a = i * 2.09 + 0.3; tb(graniteM, [[x + Math.cos(a) * 0.48 * s, 0, z + Math.sin(a) * 0.48 * s], [x + Math.cos(a) * 0.34 * s, 0.34 * s, z + Math.sin(a) * 0.34 * s], [x + Math.cos(a) * 0.2 * s, 0.5 * s, z + Math.sin(a) * 0.2 * s]], 0.06 * s, 8, 6); }
      put(graniteM, xf(new THREE.CylinderGeometry(0.3 * s, 0.3 * s, 0.1 * s, 6), x, 0.55 * s, z), 0.8);
      put(graniteM, xf(new THREE.CylinderGeometry(0.2 * s, 0.2 * s, 0.3 * s, 6), x, 0.75 * s, z), 0.8);
      put(graniteM, xf(new THREE.ConeGeometry(0.8 * s, 0.3 * s, 6), x, 1.05 * s, z), 0.8);
      put(mossM, xf(new THREE.ConeGeometry(0.72 * s, 0.14 * s, 6, 1, true), x, 1.15 * s, z), 0.8);
      sph(graniteM, 0.1 * s, x, 1.25 * s, z, 1, 0.9, 1, 8);
      col(x - 0.55 * s, x + 0.55 * s, z - 0.55 * s, z + 0.55 * s, 0, 1.3 * s, true);
    };
    kasuga(2.2, 10.2, 1.05, 0.3);
    kasuga(-2.2, 13.5, 1.0, -0.2);
    kasuga(-4.8, -7.8, 1.0, 0.8);
    kasuga(-10.9, -12.0, 1.1, 1.2);
    kasuga(13.8, -1.0, 1.0, -1.2);
    kasuga(-14.4, 10.6, 0.9, PI / 2);
    kasuga(-14.4, 13.8, 0.9, PI / 2);
    yukimi(-8.3, -2.4, 1.0);
    yukimi(7.2, -5.2, 0.85);
    yukimi(1.8, 3.9, 0.8);
  }

  // ======================= AZALEA SHRUBS, BOXWOOD BALLS, FLOWER BEDS =======================
  {
    const shrubM = k.mat(tx("skShrub", ST.skBlossom, 77, 0, 1, "#4a6e2c"), "#ffffff", [3, 2], { roughness: 0.85, bump: 0 });
    const boxM = k.mat(k.tex("leaves", T.leaves), "#ffffff", [2, 1], { roughness: 0.85, bump: 0.9 });
    const shrubG = () => blobGeo(990, 14, 9, 0.1);
    const place = (x: number, z: number, s: number, kind: number) => {
      const c = kind === 0 ? ["#ffb8d4", "#ff9ec4", "#ffd0e0"][Math.floor(r0() * 3)] : kind === 1 ? "#ffffff" : ["#6f9a44", "#5a8636", "#7aa84e"][Math.floor(r0() * 3)];
      inst(kind < 2 ? "azalea" : "boxball", shrubG, kind < 2 ? shrubM : boxM, { pos: [x, s * 0.35, z], rotY: r0() * 6, scale: [s * 1.2, s * 0.7, s], color: c });
      if (s > 0.55) col(x - s, x + s, z - s * 0.85, z + s * 0.85, 0, s * 0.95, true);
    };
    const rows: [number, number, number, number, number][] = [
      // x, z, dx, dz, n
      [-2.1, 14.4, 0, -1.0, 3], [2.2, 13.6, 0, -1.1, 3], [6.2, 3.2, 0.9, 0.3, 4], [-9.8, 1.0, 0.5, -1.0, 4], [-11.2, -9.8, 1.0, 0.1, 4],
      [2.4, -8.6, 1.1, -0.3, 4], [14.5, -4.2, 0.2, 1.0, 3], [-6.2, 14.4, 1.1, 0, 4], [9.0, -10.4, 1.0, -0.6, 3], [20.5, 8.5, 0, 1.2, 4],
    ];
    rows.forEach(([x, z, dx, dz, n], ri) => { for (let i = 0; i < n; i++) place(x + dx * i + (r0() - 0.5) * 0.3, z + dz * i + (r0() - 0.5) * 0.3, 0.45 + r0() * 0.35, ri % 4 === 3 ? 2 : ri % 5 === 1 ? 1 : 0); });
    // boxwood balls around the pond rim
    for (let i = 0; i < 10; i++) { const a = (i / 10) * PI * 2 + 0.4; if (Math.abs(Math.cos(a) * 9.5 - (-3)) < 1.6) continue; const [x, z] = pondPt(a, 1.25); place(x, z, 0.35 + r0() * 0.25, 2); }
    // tulip / pansy bed by the entrance
    for (let i = 0; i < 60; i++) {
      const s = i % 2 ? -1 : 1, x = s * (2.8 + r0() * 3.0), z = 13.0 + r0() * 1.6;
      inst("stem", () => new THREE.CylinderGeometry(0.006, 0.006, 0.3, 4).translate(0, 0.15, 0), k.mat(null, "#4f7a2a", [1, 1]), { pos: [x, 0, z] }, true);
      inst("tulip", () => new THREE.LatheGeometry(V2([[0, 0], [0.03, 0.01], [0.04, 0.05], [0.032, 0.08], [0, 0.07]]), 8), tintM, { pos: [x, 0.3, z], color: ["#e8402a", "#ffd23a", "#ff8ab0", "#ffffff", "#c83a8a"][i % 5] }, true);
    }
    bx(k.mat(k.tex("skSoil", () => T.noise("#5a4230", 0.15, 3, 1200)), "#ffffff", [3, 1], { roughness: 1, bump: 0 }), 3.4, 0.04, 1.9, -4.3, 0, 13.8);
    bx(k.mat(k.tex("skSoil", () => T.noise("#5a4230", 0.15, 3, 1200)), "#ffffff", [3, 1], { roughness: 1, bump: 0 }), 3.4, 0.04, 1.9, 4.3, 0, 13.8);
  }

  // ======================= BENCHES, BINS, SIGNS, WAGASA, SMALL PROPS =======================
  {
    const bench = (x: number, z: number, ry: number) => {
      const f = F(x, z, ry);
      for (let i = 0; i < 3; i++) f.bx(cedarM, 1.7, 0.045, 0.12, 0, 0.44, -0.14 + i * 0.14, { round: true });
      for (let i = 0; i < 2; i++) f.bx(cedarM, 1.7, 0.1, 0.035, 0, 0.62 + i * 0.16, -0.24, { round: true, rx: -0.15 });
      for (const lx of [-0.72, 0.72]) { f.bx(iron, 0.05, 0.44, 0.05, lx, 0, -0.18); f.bx(iron, 0.05, 0.44, 0.05, lx, 0, 0.18); f.bx(iron, 0.05, 0.5, 0.05, lx, 0.44, -0.24, { rx: -0.15 }); f.bx(iron, 0.05, 0.04, 0.42, lx, 0.42, 0); }
      f.col(-0.85, 0.85, -0.26, 0.24, 0, 0.47);
    };
    bench(-5.4, 6.6, PI + 0.4);
    bench(5.8, -10.8, 0.2);
    bench(-12.0, 5.0, -PI / 2);
    bench(11.0, -9.0, 0.9);
    bench(3.2, 5.9, PI + 0.3);
    // bamboo litter baskets
    for (const [x, z] of [[1.8, 15.9], [-13.3, -10.4], [13.2, 1.2], [8.0, -11.4]] as [number, number][]) {
      lat(k.mat(k.tex("skBasket", () => T.noise("#b08a50", 0.2, 9, 1600)), "#c8a060", [2, 1], { roughness: 0.9, bump: 0 }), [[0, 0], [0.2, 0], [0.24, 0.7], [0.22, 0.72], [0.18, 0.05], [0, 0.05]], x, 0, z, 16);
      col(x - 0.24, x + 0.24, z - 0.24, z + 0.24, 0, 0.72, true);
    }
    // signs
    const post = (x: number, z: number, ry: number, lines: string[], w = 0.9, h = 0.45) => {
      const f = F(x, z, ry);
      f.bx(darkWoodM, 0.08, 1.0, 0.08, 0, 0, 0);
      f.bx(darkWoodM, w + 0.06, h + 0.06, 0.05, 0, 1.0 - h / 2, 0.05, { round: true });
      f.pl(sign(lines, "#3a2616", "#f3d9a4", 256, Math.round(256 * h / w)), w, h, 0, 1.03, 0.08);
      f.pl(sign(lines, "#3a2616", "#f3d9a4", 256, Math.round(256 * h / w)), w, h, 0, 1.03, 0.02, PI);
      f.col(-0.1, 0.1, -0.1, 0.1, 0, 1.3);
    };
    post(-5.4, 3.6, PI * 0.8, ["PLEASE DO NOT", "FEED THE KOI"]);
    post(8.8, -4.4, -PI / 2, ["KEEP OFF", "THE MOSS"], 0.8, 0.4);
    post(1.6, 7.2, PI, ["<  TEA HOUSE", "HANAMI LAWN  >", "^  KOI POND"], 0.9, 0.55);
    post(10.8, 2.8, PI * 0.9, ["HANAMI AREA", "Please take your", "rubbish home"], 0.9, 0.5);
    post(14.4, -11.4, -0.8, ["WATER WHEEL", "Built 1902"], 0.8, 0.4);
    // a pair of closed wagasa umbrellas leaning on the tea-house engawa and one open on the lawn
    const wag = k.mat(k.tex("skWagasa", () => ST.skLantern("#d23a2c", "#f5c9d0")), "#ffffff", [3, 1], { roughness: 0.7, bump: 0 });
    for (let i = 0; i < 2; i++) put(wag, xf(new THREE.ConeGeometry(0.09, 1.0, 12), -12.4 + i * 0.2, 0.8, -10.9, 0, 0, 0.25 + i * 0.1), 0);
    {
      const f = F(-3.8, 9.3, 0.4);
      f.geo(wag, new THREE.ConeGeometry(1.0, 0.36, 20, 1, true), 0, 0.5, 0, 0, 0.9, 0);
      f.geo(cedarM, new THREE.CylinderGeometry(0.012, 0.012, 1.0, 6), 0, 0.5, 0.3, 0, 0.9, 0);
    }
    // kite and a child's bucket on the lawn, a watering can, a folded tarp
    lat(k.mat(null, "#3a8ad0", [1, 1], { roughness: 0.4 }), [[0, 0], [0.1, 0], [0.13, 0.16], [0.11, 0.16], [0, 0.02]], -9.6, 0, 7.3, 14);
    lat(k.mat(null, "#6a7a86", [1, 1], { roughness: 0.4, metalness: 0.6 }), [[0, 0], [0.13, 0], [0.14, 0.26], [0.1, 0.3], [0, 0.3]], -12.7, 0, -9.2, 16);
    tb(k.mat(null, "#6a7a86", [1, 1], { roughness: 0.4, metalness: 0.6 }), [[-12.6, 0.2, -9.2], [-12.3, 0.35, -9.2], [-12.2, 0.42, -9.2]], 0.015, 6);
    bx(tarpM, 0.6, 0.12, 0.4, 19.6, 0, 11.2, { round: true });
  }

  // ======================= PUDDLES + PUSHABLE TEMARI BALLS =======================
  {
    const puddleM = k.mat(null, "#7f8e8c", [1, 1], { transparent: true, roughness: 0.03, metalness: 0.3 });
    puddleM.m.alphaTest = 0; puddleM.m.opacity = 0.4; puddleM.m.depthWrite = false; puddleM.m.side = THREE.FrontSide;
    for (const [x, z, sx, sz, ry] of [[8.4, 4.4, 0.8, 0.45, 0.3], [11.9, -1.6, 0.6, 0.35, 1.2], [-12.6, 1.8, 0.7, 0.4, 1.4], [-8.2, 12.8, 0.9, 0.35, 0.1], [0.2, 16.6, 0.8, 0.5, 0.6], [-0.8, -10.1, 0.6, 0.4, 0.2]] as [number, number, number, number, number][])
      inst("puddle", () => { const g = new THREE.CircleGeometry(1, 20); g.rotateX(-PI / 2); return g; }, puddleM, { pos: [x, 0.016, z], rotY: ry, scale: [sx, 1, sz] }, true);
    const temariM = k.mat(k.tex("skTemari", () => T.stripes(["#e8403a", "#ffffff", "#2a5fc0", "#ffd23a", "#ffffff", "#e86aa0"])), "#ffffff", [1, 1], { roughness: 0.55, bump: 0.3 });
    const ballG = new THREE.SphereGeometry(0.2, 20, 14);
    ballG.userData.pushable = true;
    k.instances(ballG, temariM, [[13.8, 8.6], [15.2, 4.4], [-8.4, 9.8], [9.4, 10.6]].map(([x, z], i) => ({ pos: [x, 0.2, z] as V3, rotY: i * 1.3, rotX: i * 0.7 })));
  }
  // ======================= READABLE NOTES: tea menu, omikuji, ema, a letter, notices =======================
  {
    const noteCache = new Map<string, Mat>();
    const note = (title: string, lines: string[], paper = "#f6f0e0", ink = "#2a2440", w = 256, h = 256, ruled = false) => {
      const key = title + lines.join("|") + paper + w + h;
      let m = noteCache.get(key);
      if (!m) noteCache.set(key, (m = k.mat(k.tex(`skNote${key}`, () => ST.skNote(title, lines, paper, ink, w, h, ruled)), "#ffffff", [1, 1], { roughness: 0.85, bump: 0 })));
      return m;
    };
    // tea house menu board (A-frame chalk-style board)
    {
      const f = F(-10.3, -10.1, 0.7);
      for (const s of [-1, 1]) f.bx(darkWoodM, 0.62, 0.95, 0.04, 0, 0, s * 0.16, { rx: s * 0.18 });
      f.pl(note("TEA MENU  お品書き", ["Matcha & wagashi ....... 600 yen", "Sakura tea (salted) ..... 450 yen", "Sencha ....................... 400 yen", "Hojicha ..................... 400 yen", "Hanami dango ........... 300 yen", "Tea ceremony 11:00 / 14:00"], "#23302a", "#f4efe0", 256, 320), 0.52, 0.66, 0, 0.5, 0.195, 0, -0.18);
      f.col(-0.32, 0.32, -0.26, 0.26, 0, 0.95);
    }
    // omikuji: fortunes tied to strings between two posts + one readable unfolded slip
    {
      const f = F(-17.2, 9.4, 0.1);
      for (const lx of [-0.9, 0.9]) f.bx(darkWoodM, 0.08, 1.6, 0.08, lx, 0, 0);
      const or = rng(91);
      for (const y of [1.0, 1.25, 1.5]) {
        f.cy(ropeM, 0.006, 0.006, 1.8, 0, y, 0, 4, { rz: PI / 2 });
        for (let i = 0; i < 14; i++) {
          const lx = -0.8 + i * 0.12 + (or() - 0.5) * 0.04;
          inst("omikuji", () => boxGeo(0.02, 0.07, 0.025), tintM, { pos: [f.wx(lx, 0), y - 0.03, f.wz(lx, 0)], rotY: or() * 3, rotZ: (or() - 0.5) * 0.5, color: or() < 0.15 ? "#f2e6c8" : "#fbfaf4" });
        }
      }
      f.pl(note("大吉  GREAT BLESSING", ["Wish: it will come true", "Travel: go in spring", "Love: the one you wait", "   for is closer than you think", "Lost item: under the bridge", "Studies: keep going"], "#fbfaf4", "#8a1c1c", 256, 320, false), 0.2, 0.25, 0.95, 1.2, 0.05);
      f.col(-0.95, 0.95, -0.1, 0.1, 0, 1.6);
      pl(sign(["OMIKUJI", "fortune slips 100 yen"], "#3a2616", "#f3d9a4", 256, 96), 0.7, 0.26, f.wx(0, 0.05), 0.72, f.wz(0, 0.05), 0.1);
    }
    // readable ema plaques on the front row of the rack
    {
      const f = F(-18.2, 14.6, PI);
      const emaTxt: [string, string[]][] = [
        ["家内安全", ["Health and happiness", "for our whole family", "- Tom Kodner"]],
        ["合格祈願", ["Please let me pass", "my entrance exams!", "- Yuki, 17"]],
        ["縁結び", ["May we come back", "every spring together", "- T.K. & L."]],
        ["Wish", ["A new puppy please", "(a small one)", "- Hana, 6"]],
      ];
      emaTxt.forEach(([t, l], i) => f.pl(note(t, l, "#d9b47c", "#3a1e10", 256, 192), 0.2, 0.15, -0.7 + i * 0.44, 0.6, 0.08));
    }
    // a letter left on the lakeside bench
    {
      const x = -5.3, z = 6.55;
      put(note("", ["To whoever finds this -", "the petals fall so fast.", "Meet me under the weeping", "cherry by the pond,", "same day next spring.", "          - T."], "#fffdf6", "#2a2a5a", 256, 320, true), xf(new THREE.PlaneGeometry(0.2, 0.25), x, 0.5, z, 0.9, -PI / 2), 0);
      bx(k.mat(null, "#f2e6d4", [1, 1], { roughness: 0.8 }), 0.16, 0.004, 0.1, x - 0.2, 0.488, z + 0.1, { ry: 0.3 });
      sph(k.mat(null, "#f7a8c4", [1, 1], { roughness: 0.6 }), 0.02, x - 0.18, 0.5, z + 0.08, 1, 0.5, 1, 8);
    }
    // hanami notice board at the entrance plaza + lost-and-found note pinned on it
    {
      const f = F(5.6, 18.3, PI + 0.15);
      f.bx(darkWoodM, 1.3, 0.95, 0.06, 0, 0.85, 0, { round: true });
      for (const lx of [-0.6, 0.6]) f.bx(darkWoodM, 0.08, 0.85, 0.08, lx, 0, 0);
      f.bx(roofM, 1.5, 0.05, 0.35, 0, 1.85, 0, { rx: 0.2 });
      f.pl(note("HANAMI NOTICE", ["Blossom forecast: full bloom!", "Night lanterns 18:00 - 21:00", "Please do not climb the trees", "or break branches", "No barbecues on the lawn", "Take your rubbish home"], "#f1e6cc", "#3a2616", 256, 256, false), 0.8, 0.8, -0.18, 1.32, 0.035);
      f.pl(note("FOUND", ["Child's red sandal", "near the koi pond -", "ask at the tea house"], "#fff6a8", "#2a2440"), 0.3, 0.3, 0.42, 1.45, 0.036, 0);
      f.col(-0.7, 0.7, -0.1, 0.1, 0, 1.85);
    }
  }

  // ======================= ROOMS =======================
  k.room("Koi Pond", -9, 9, -6, 4);
  k.room("Entrance Plaza", -6, 6, 15.4, 19.7);

  // ======================= FLUSH =======================
  for (const [m, list] of batches) k.merged(list, m);
  for (const [, e] of instLists) k.instances(e.geo, e.m, e.list, { noShadow: e.noShadow });

  const hunters: THREE.Vector3[] = [];
  for (let i = 0; i < 9; i++) hunters.push(new THREE.Vector3(-1.3 + (i % 3) * 1.3, 0, 16.8 + Math.floor(i / 3) * 1.1));
  const hiders: THREE.Vector3[] = [];
  for (let i = 0; i < 24; i++) hiders.push(new THREE.Vector3(-12 + (i % 6) * 1.2, 0, 8.6 + Math.floor(i / 6) * 1.1));

  return k.finish({
    id: "sakura", name: "Cherry Blossom Garden",
    bounds: { minX: -BX + 0.3, maxX: BX - 0.3, minZ: -BZ + 0.3, maxZ: BZ - 0.3 },
    hunterSpawns: hunters, hiderSpawns: hiders,
    preview: { pos: [0.9, 2.7, 15.6], look: [-1.8, 1.3, 0], fov: 64 },
    lighting: {
      sky: "#bcd8f0",
      hemi: ["#e8f2ff", "#7a8a5a", 0.6],
      sun: { color: "#fff4e2", int: 2.6, pos: [-14, 26, 10] },
      fog: ["#d4e2ee", 32, 170],
      points: [
        { pos: [-18.0, 2.31, -10.85], color: "#ffb070", int: 3, dist: 7 },
        { pos: [-14.2, 2.31, -10.85], color: "#ffb070", int: 3, dist: 7 },
        { pos: [17.4, 2.15, 16.85], color: "#ff9a60", int: 3, dist: 7 },
        ...LAMP_PTS.map((p) => ({ pos: p, color: "#ffc0a0", int: 2.5, dist: 6 })),
      ],
      exposure: 1.0,
      env: 0.7,
      hdri: "sky",
      hdriBackground: 0.02,
    },
  });
}
