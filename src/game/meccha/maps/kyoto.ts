// Kyoto — an indoor Kyoto-Station-style atrium at night during an autumn festival.
// A huge white steel lattice vault (stars behind it) spans the hall. North: the grand stairs ("dai-kaidan") with
// luminaries forming 大, twin escalators and an upper terrace with a fence, lamps and red maple trees. West: the white
// tiled station building with a cantilevered bowl balcony (maple on top) and a lit shamisen billboard. East: the dark
// marble wall with two white towers crowned by lattice cubes, Gion lantern walls, glowing maple panels and a senbon-torii
// tunnel. Centre: festival lanes with tsuiji fences, yatai stalls, lanterns, wagasa umbrellas, bamboo clusters, kimono
// dolls and a rock garden. South: the station garden with planters and a gold-railed balcony with bamboo.
import * as THREE from "three";
import * as T from "../textures";
import { Kit, boxGeo, type World, type Mat } from "./kit";
import * as KT from "./tex/kyoto";
import { Life, JP, JPS } from "./tex/life";

type V3 = [number, number, number];
type Inst = { pos: V3; rotX?: number; rotY?: number; rotZ?: number; scale?: V3; color?: string };

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** planar world-space UVs picked per vertex by the dominant normal axis (keeps textures at real-world scale) */
function worldUV(g: THREE.BufferGeometry, unit: number, swap = false) {
  const p = g.attributes.position, n = g.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u: number, v: number;
    if (ay >= ax && ay >= az) { u = p.getX(i); v = p.getZ(i); if (swap) { const t = u; u = v; v = t; } }
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
  if (rx || ry || rz) { _m.makeRotationFromEuler(_e.set(rx, ry, rz)); g.applyMatrix4(_m); }
  g.translate(x, y, z);
  return g;
}

export function buildKyoto(): World {
  const k = new Kit(9, 3);
  const R = rng(20241);
  const life = new Life(k, 20241);
  const priceLists: Record<string, [string, string][]> = {
    "たこ焼き": [["6個", "500円"], ["8個", "600円"], ["ネギ", "+100円"]], "りんご飴": [["りんご飴", "400円"], ["いちご飴", "500円"], ["ぶどう飴", "400円"]],
    "かき氷": [["いちご", "300円"], ["メロン", "300円"], ["ブルーハワイ", "350円"]], "金魚すくい": [["1回", "300円"], ["3回", "800円"], ["ポイ", "おまけ"]],
    "お面": [["お面", "800円"], ["狐面", "1200円"], ["子供", "500円"]], "焼きそば": [["並", "500円"], ["大盛", "700円"], ["目玉焼き", "+100円"]],
    "みたらし団子": [["1本", "150円"], ["3本", "400円"], ["抹茶付", "600円"]], "射的": [["5発", "500円"], ["10発", "900円"], ["景品", "たくさん"]],
    "甘酒": [["甘酒", "300円"], ["熱燗", "500円"], ["お茶", "150円"]], "焼き鳥": [["もも", "150円"], ["ねぎま", "150円"], ["つくね", "200円"]],
    "わたあめ": [["わたあめ", "500円"], ["袋付", "600円"], ["虹色", "700円"]], "輪投げ": [["3回", "300円"], ["10回", "800円"], ["景品", "あり"]],
  };

  // ---------------- batching: every static part is merged per material ----------------
  const batches = new Map<Mat, THREE.BufferGeometry[]>();
  const put = (m: Mat, g: THREE.BufferGeometry, unit = 0, swap = false) => {
    if (unit > 0) worldUV(g, unit, swap);
    let l = batches.get(m);
    if (!l) batches.set(m, (l = []));
    l.push(g);
  };
  type BO = { unit?: number; ry?: number; rx?: number; rz?: number; round?: boolean; solid?: boolean; stand?: boolean; swap?: boolean };
  /** box, y = bottom */
  const bx = (m: Mat, w: number, h: number, d: number, x: number, y: number, z: number, o: BO = {}) => {
    const g = o.round ? boxGeo(w, h, d) : new THREE.BoxGeometry(w, h, d);
    xf(g, x, y + h / 2, z, o.ry, o.rx, o.rz);
    put(m, g, o.unit ?? (m.ptex ? 1 : 0), o.swap);
    if (o.solid) k.collider(x - w / 2, x + w / 2, z - d / 2, z + d / 2, y, y + h, o.stand ?? true);
  };
  const cy = (m: Mat, rt: number, rb: number, h: number, x: number, y: number, z: number, seg = 16, unit = 0) => {
    put(m, xf(new THREE.CylinderGeometry(rt, rb, h, seg), x, y + h / 2, z), unit);
  };
  const sph = (m: Mat, r: number, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) => {
    const g = new THREE.SphereGeometry(r, 16, 12);
    g.scale(sx, sy, sz);
    put(m, xf(g, x, y, z));
  };

  // ---------------- materials ----------------
  const floorM = k.mat(k.tex("kyFloor", KT.kyFloor), "#ffffff", [1, 1], { roughness: 0.18, metalness: 0.2, bump: 0.25 });
  const paverM = k.mat(k.tex("kyPaver", KT.kyPaver), "#a3a3a6", [1, 1], { roughness: 0.5, bump: 0.5 });
  const gravelM = k.mat(k.tex("kyGravel", KT.kyGravel), "#ffffff", [1, 1], { roughness: 0.95, bump: 0.9 });
  const whiteTileM = k.mat(k.tex("kyWhiteTile", KT.kyWhiteTile), "#ffffff", [1, 1], { roughness: 0.4, bump: 0.35, emissive: "#ffffff", emissiveIntensity: 0.16 });
  const marbleM = k.mat(k.tex("kyMarble", KT.kyMarble), "#ffffff", [1, 1], { roughness: 0.16, metalness: 0.1, bump: 0.2 });
  const boardsM = k.mat(k.tex("kyBoards", KT.kyBoards), "#ffffff", [1, 1], { roughness: 0.7, bump: 0.8 });
  const stairM = k.mat(k.tex("kyStair", KT.kyStairStone), "#ffffff", [1, 1], { roughness: 0.55, bump: 0.5 });
  const kawaraM = k.mat(k.tex("kyKawara", KT.kyKawara), "#ffffff", [1, 1], { roughness: 0.45, metalness: 0.25, bump: 1.0 });
  const plasterM = k.mat(k.tex("kyPlaster", KT.kyPlaster), "#ffffff", [1, 1], { roughness: 0.9, bump: 0.3 });
  const darkWoodM = k.mat(k.tex("kyDarkWood", () => T.wood("#3a2416", "#1e1108", 4)), "#ffffff", [1, 1], { roughness: 0.6, bump: 0.6 });
  const lightWoodM = k.mat(k.tex("kyLightWood", () => T.wood("#c79a62", "#8a6236", 6)), "#ffffff", [1, 1], { roughness: 0.55, bump: 0.6 });
  const concreteM = k.mat(k.tex("kyConcrete", () => T.concrete("#77787a", 8)), "#ffffff", [1, 1], { roughness: 0.85, bump: 0.5 });
  const bowlM = k.mat(k.tex("kyBowl", () => T.concrete("#8e9094", 12)), "#ffffff", [1, 1], { roughness: 0.6, bump: 0.3, emissive: "#ffffff", emissiveIntensity: 0.05 });
  const stoneM = k.mat(k.tex("kyStone", () => T.noise("#6c6a66", 0.2, 5, 1400)), "#ffffff", [1, 1], { roughness: 0.9, bump: 1.1 });
  const soilM = k.mat(k.tex("kySoil", () => T.noise("#2e2218", 0.25, 9, 1400)), "#ffffff", [1, 1], { roughness: 1, bump: 1.0 });
  const goldM = k.mat(k.tex("kyGold", KT.kyGold), "#ffffff", [1, 1], { roughness: 0.3, metalness: 0.7, bump: 0, emissive: "#6a4a18", emissiveIntensity: 0.5 });
  const steelM = k.mat(null, "#b9bec4", [1, 1], { roughness: 0.3, metalness: 0.9 });
  const blackM = k.mat(null, "#16171a", [1, 1], { roughness: 0.5, metalness: 0.2 });
  const rubberM = k.mat(null, "#0e0e10", [1, 1], { roughness: 0.6 });
  const feltM = k.mat(k.tex("kyFelt", KT.kyFelt), "#ffffff", [1, 1], { roughness: 0.95, bump: 0 });
  const cushionM = k.mat(k.tex("kyCushion", () => T.noise("#27407a", 0.12, 3, 1600)), "#ffffff", [1, 1], { roughness: 0.9, bump: 0 });
  const porcelainM = k.mat(null, "#f4f1ea", [1, 1], { roughness: 0.25 });
  const redPaintM = k.mat(null, "#c41a12", [1, 1], { roughness: 0.4 });
  const toriiRedM = k.mat(k.tex("kyToriiRed", () => T.noise("#d2331a", 0.1, 21, 1200)), "#ffffff", [1, 1], { roughness: 0.5, bump: 0 });
  const toriiBlackM = k.mat(k.tex("kyToriiBlack", () => T.noise("#1c1c1e", 0.1, 22, 1200)), "#ffffff", [1, 1], { roughness: 0.45, metalness: 0.1, bump: 0 });
  const glassM = k.mat(null, "#9fc4d8", [1, 1], { roughness: 0.05, metalness: 0.3, transparent: true });
  glassM.m.opacity = 0.22; glassM.m.alphaTest = 0; glassM.m.depthWrite = false;
  const stepsM = k.mat(k.tex("kySteps", KT.kySteps), "#ffffff", [1, 1], { roughness: 0.4, metalness: 0.7, bump: 0.5 });
  const mapleRedM = k.mat(k.tex("kyMapleR", () => KT.kyMaple(0)), "#ffffff", [1.5, 1.5], { roughness: 0.8, bump: 1.1, emissive: "#5a0604", emissiveIntensity: 0.35 });
  const mapleOrM = k.mat(k.tex("kyMapleO", () => KT.kyMaple(1)), "#ffffff", [1.5, 1.5], { roughness: 0.8, bump: 1.1, emissive: "#8a2a04", emissiveIntensity: 0.55 });
  const barkM = k.mat(k.tex("kyBark", () => T.wood("#6a5a4a", "#3a2e24", 9)), "#ffffff", [1, 3], { roughness: 0.9, bump: 1.0 });
  const bambooM = k.mat(k.tex("kyBamboo", KT.kyBamboo), "#ffffff", [1, 1], { roughness: 0.4, bump: 0 });
  const bambooNodeM = k.mat(null, "#9aa75a", [1, 1], { roughness: 0.5 });
  const bambooLeafM = k.mat(k.tex("kyBambooLeaf", KT.kyBambooLeaves), "#ffffff", [1, 1], { roughness: 0.7, transparent: true });
  const shrubM = k.mat(k.tex("leaves", T.leaves), "#6f8f5a", [1, 1], { roughness: 0.85, bump: 1.0 });
  const andonM = k.mat(k.tex("kyPlaster", KT.kyPlaster), "#fff2d8", [1, 1], { emissive: "#ffb65a", emissiveIntensity: 1.3, bump: 0 });
  const lumM = k.mat(null, "#ffe4a8", [1, 1], { emissive: "#ffc458", emissiveIntensity: 2.2 });
  const glowStripM = k.mat(null, "#fff3dc", [1, 1], { emissive: "#ffd9a0", emissiveIntensity: 2.0 });
  const coolStripM = k.mat(null, "#ffffff", [1, 1], { emissive: "#f4f6ff", emissiveIntensity: 2.4 });
  const chochinM = k.mat(k.tex("kyRedLantern", KT.kyRedLantern), "#ffffff", [1, 1], { emissive: "#ff6a3a", emissiveIntensity: 0.9, bump: 0 });
  const gionM = k.mat(k.tex("kyGion", KT.kyGionLantern), "#ffffff", [1, 1], { emissive: "#fff4e6", emissiveIntensity: 0.7, bump: 0 });
  const maplePanelM = k.mat(k.tex("kyMaplePanel", KT.kyMaplePanel), "#ffffff", [1, 1], { emissive: "#ff7020", emissiveIntensity: 1.2, bump: 0 });
  const shamisenM = k.mat(k.tex("kyShamisen", KT.kyShamisen), "#ffffff", [1, 1], { emissive: "#ffffff", emissiveIntensity: 0.95, bump: 0 });
  const blueGlassM = k.mat(k.tex("kyBlueGlass", KT.kyBlueGlass), "#ffffff", [1, 1], { roughness: 0.1, metalness: 0.4, emissive: "#3048c0", emissiveIntensity: 0.55, bump: 0 });
  const kimonoM = k.mat(k.tex("kyKimono", KT.kyKimono), "#ffffff", [2, 2], { roughness: 0.75, bump: 0 });
  const obiM = k.mat(null, "#d9a441", [1, 1], { roughness: 0.4, metalness: 0.4 });
  const skinM = k.mat(null, "#f4ebe4", [1, 1], { roughness: 0.5 });
  const hairM = k.mat(null, "#0c0b0c", [1, 1], { roughness: 0.35 });
  const wagasaRedM = k.mat(k.tex("kyWagasaR", () => KT.kyWagasa()), "#ffffff", [1, 1], { roughness: 0.6, bump: 0, emissive: "#600808", emissiveIntensity: 0.25 });
  const wagasaGreenM = k.mat(k.tex("kyWagasaG", () => KT.kyWagasa("#1f6a3a", "#f0eadc")), "#ffffff", [1, 1], { roughness: 0.6, bump: 0 });
  const wagasaBlueM = k.mat(k.tex("kyWagasaB", () => KT.kyWagasa("#1d3f8a", "#f0eadc")), "#ffffff", [1, 1], { roughness: 0.6, bump: 0 });
  const parasolM = k.mat(k.tex("kyParasol", () => KT.kyWagasa("#e02a50", "#f7d4de")), "#ffffff", [1, 1], { roughness: 0.6, bump: 0, emissive: "#801030", emissiveIntensity: 0.35 });
  for (const m of [wagasaRedM, wagasaGreenM, wagasaBlueM, parasolM]) m.m.side = THREE.DoubleSide;
  const latticeM = k.mat(null, "#dfe3e8", [1, 1], { roughness: 0.35, metalness: 0.55, emissive: "#ffffff", emissiveIntensity: 0.1 });
  const latticeLitM = k.mat(null, "#f2f4f8", [1, 1], { roughness: 0.3, metalness: 0.5, emissive: "#ffffff", emissiveIntensity: 0.38 });
  const latticeGlowM = k.mat(null, "#ffffff", [1, 1], { emissive: "#fffaf0", emissiveIntensity: 2.2 });
  const starM = k.mat(k.tex("kyStars", KT.kyStars), "#ffffff", [5, 3], { emissive: "#ffffff", emissiveIntensity: 1.0, bump: 0 });
  starM.m.side = THREE.BackSide;
  const colCache = new Map<string, Mat>();
  const colM = (c: string, rough = 0.35, metal = 0) => {
    let m = colCache.get(c + rough + metal);
    if (!m) { m = k.mat(null, c, [1, 1], { roughness: rough, metalness: metal }); colCache.set(c + rough + metal, m); }
    return m;
  };
  const standeeM = k.mat(k.tex("kyStandee", () => T.wood("#7a4a26", "#5a3218", 12)), "#ffffff", [1, 1], { roughness: 0.7, bump: 0 });
  const signCache = new Map<string, Mat>();
  const signM = (text: string) => {
    let m = signCache.get(text);
    if (!m) { m = k.mat(k.tex("kySign" + text, () => KT.kySign(text)), "#ffffff", [1, 1], { roughness: 0.6, bump: 0, emissive: "#ffe8c0", emissiveIntensity: 0.25 }); signCache.set(text, m); }
    return m;
  };
  const norenCache = new Map<string, Mat>();
  const norenM = (text: string, bg: string) => {
    let m = norenCache.get(text + bg);
    if (!m) { m = k.mat(k.tex("kyNoren" + text + bg, () => KT.kyNoren(text, bg)), "#ffffff", [1, 1], { roughness: 0.9, bump: 0 }); norenCache.set(text + bg, m); }
    return m;
  };

  // ---------------- instance lists ----------------
  const chochin: Inst[] = [];
  const gion: Inst[] = [];
  const andonPost: Inst[] = [], andonLamp: Inst[] = [], andonCap: Inst[] = [];
  const lums: Inst[] = [];
  const culms: Inst[] = [], culmNodes: Inst[] = [], bLeaves: Inst[] = [];
  const clumpR: Inst[] = [], clumpO: Inst[] = [];
  const shrubs: Inst[] = [];
  const beams: Inst[] = [], beamsLit: Inst[] = [], beamsGlow: Inst[] = [];
  const toriiL: { x: number; z: number; s: number; ry: number }[] = [];
  const dolls: { x: number; y: number; z: number; ry: number; col: string; parasol: boolean }[] = [];
  const goodsBalls: Inst[] = [];
  const branchGeos: THREE.BufferGeometry[] = [];

  // ================= SHELL =================
  const X0 = -25.6, X1 = 21.6, Z0 = -19.6, Z1 = 19.6;
  k.floor(-27, 27, -21, 21, floorM, 1.2);
  // festival lanes: light granite pavers
  k.floor(X0, 14, -3, 14, paverM, 2, 0.012);

  // west: white tiled station building
  bx(whiteTileM, 4.4, 21.5, 41, -27.8, 0, 0, { unit: 1.8 });
  for (const y of [6.4, 12.4, 18.2]) bx(whiteTileM, 0.35, 0.28, 41, -25.45, y, 0, { unit: 1.8 });
  // two dark vertical recesses with louvres + brackets
  for (const zc of [-13, 15.5]) {
    bx(blackM, 0.08, 21.5, 1.4, -25.58, 0, zc);
    for (let y = 1.2; y < 21; y += 0.9) {
      bx(concreteM, 0.28, 0.08, 1.3, -25.45, y, zc, { rz: 0.35 });
      if (Math.round(y / 0.9) % 3 === 0) bx(concreteM, 0.45, 0.35, 0.18, -25.35, y - 0.3, zc + 0.75, { round: true });
    }
  }
  // white vent grille high on the facade
  bx(concreteM, 0.12, 3.6, 5.2, -25.52, 15.2, -6.5);
  for (let z = -8.9; z <= -4.1; z += 0.3) bx(porcelainM, 0.12, 3.4, 0.06, -25.42, 15.3, z);
  for (let y = 15.4; y < 18.7; y += 0.3) bx(porcelainM, 0.12, 0.05, 5, -25.42, y, -6.5);
  // shamisen billboard
  bx(blackM, 0.35, 5.6, 7.6, -25.45, 0.9, 8.2, { round: false });
  k.panel(7.1, 5.1, -25.26, 3.7, 8.2, shamisenM, Math.PI / 2);
  bx(steelM, 0.1, 0.1, 7.4, -25.2, 6.35, 8.2);
  // cantilevered bowl balcony
  {
    const prof: [number, number][] = [[0.1, 0], [2.4, 0.2], [3.9, 0.8], [4.9, 1.7], [5.4, 2.6], [5.55, 3.1], [5.3, 3.15], [0, 3.2]];
    const g = new THREE.LatheGeometry(prof.map(([r, h]) => new THREE.Vector2(r, h)), 40);
    put(bowlM, xf(g, -26.3, 7.2, -2), 1.5);
    k.collider(-25.6, -21.1, -6.8, 2.8, 9.6, 10.35, true);
    bx(lumM, 0.25, 0.25, 0.25, -21.6, 10.35, 1.8, { round: true });
  }

  // east: dark marble wall with ledge, white towers and lattice cubes
  bx(marbleM, 5.4, 9, 33.2, 24.3, 0, 3.4, { unit: 2.4 });
  bx(steelM, 0.4, 0.3, 33.2, 21.55, 8.7, 3.4);
  bx(coolStripM, 0.12, 0.06, 33.2, 21.9, 9.0, 3.4);
  bx(blackM, 0.3, 0.25, 33.2, 21.5, 0, 3.4); // skirting
  const towerZ = [-6.75, 5.25];
  for (const tz of towerZ) {
    bx(whiteTileM, 4.2, 6.2, 4.6, 23.9, 9, tz, { unit: 1.8 });
    latticeCube(23.9, 15.2, tz, 4.3);
  }
  // tower terrace + tower with blue glass (north-east)
  bx(marbleM, 17.6, 4, 7, 12.8, 0, -16.5, { unit: 2.4 });
  bx(steelM, 17.6, 0.12, 0.3, 12.8, 3.9, -13.05);
  bx(glassM, 17.4, 1.0, 0.03, 12.9, 4.0, -13.15);
  put(blackM, new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(4.1, 5.05, -13.15), new THREE.Vector3(21.6, 5.05, -13.15)), 4, 0.03, 8));
  bx(marbleM, 10, 20, 5, 11.5, 4, -17.5, { unit: 2.4 });
  k.panel(6.4, 6.4, 11.5, 13.4, -14.98, blueGlassM, 0);
  k.panel(3.2, 6.4, 16.52, 13.4, -17.5, blueGlassM, Math.PI / 2);
  bx(coolStripM, 10, 0.06, 0.1, 11.5, 23.9, -14.95);
  // little kiosk on the terrace with a red umbrella and yellow boxes (seen behind the escalators)
  bx(porcelainM, 3, 1.1, 1.4, 8.2, 4, -15.2, { round: true });
  const checkM = k.mat(k.tex("kyChecker", () => T.checker("#e8b41c", "#c8261a", 4)), "#ffffff", [1, 1], { bump: 0 });
  bx(checkM, 0.7, 0.7, 0.7, 7.2, 5.1, -15.2, { round: true, unit: 0 });
  bx(checkM, 0.6, 0.6, 0.6, 8.0, 5.1, -15.0, { round: true, unit: 0 });
  wagasa(9.2, 4, -15.2, 0.9, 1.9, wagasaRedM, 0, 0);

  // north wall behind the upper terrace
  bx(marbleM, 32, 9, 0.6, -10.8, 0, -20.3, { unit: 2.4 });
  // south wall with the station entrance
  bx(marbleM, 48, 6, 0.6, -2, 0, 20.3, { unit: 2.4 });
  bx(steelM, 48, 0.2, 0.3, -2, 5.9, 20.0);
  for (let i = 0; i < 4; i++) {
    const x = -3.9 + i * 1.6;
    bx(glassM, 1.5, 2.6, 0.04, x, 0, 19.95);
    bx(steelM, 0.08, 2.7, 0.12, x - 0.78, 0, 19.95);
  }
  bx(steelM, 0.08, 2.7, 0.12, 2.5, 0, 19.95);
  bx(steelM, 6.6, 0.12, 0.14, -1.4, 2.6, 19.95);
  bx(coolStripM, 6.4, 0.04, 0.08, -1.4, 2.72, 19.9);
  k.panel(4.2, 0.8, -1.4, 3.4, 19.86, k.mat(k.tex("kyExit", () => T.signboard("#15213f", "#f4f4f4", "中央口  Central Exit", 512, 96)), "#ffffff", [1, 1], { emissive: "#ffffff", emissiveIntensity: 0.6, bump: 0 }), Math.PI);

  // star field seen through the lattice
  k.add(new THREE.SphereGeometry(95, 32, 16), starM, [0, 0, 0], { noShadow: true });

  // ================= LATTICE VAULT =================
  buildLattice();

  // ================= GRAND STAIRS =================
  const S0 = -7, TR = 0.45, RS = 0.2, NS = 20;
  const stepTop = (z: number) => {
    if (z > S0) return 0;
    const i = Math.floor((S0 - z) / TR);
    return Math.min(NS, i + 1) * RS;
  };
  for (let i = 0; i < NS; i++) {
    const z1 = S0 - i * TR, zc = z1 - TR / 2, top = (i + 1) * RS;
    bx(stairM, 24, top, TR, -13.6, 0, zc, { unit: 2, solid: true });
    bx(colM("#3a2622", 0.5), 24, 0.025, 0.05, -13.6, top - 0.02, z1 - 0.03);
    // knee wall between stairs and escalators
    bx(concreteM, 0.4, top + 0.9, TR, -1.4, 0, zc, { unit: 1.5, solid: true, stand: true });
  }
  // upper terrace
  bx(paverM, 29.6, 4, 4, -10.8, 0, -18, { unit: 2, solid: true });
  bx(paverM, 5.2, 4, 1, 1.4, 0, -15.5, { unit: 2, solid: true });
  bx(marbleM, 1.4, 4, 7, 3.3, 0, -11.5, { unit: 2.4, solid: true });
  // terrace fence with lamps and a maple bed behind
  bx(boardsM, 29.6, 1.0, 0.12, -10.8, 4, -18.25, { unit: 1.6 });
  bx(plasterM, 29.6, 0.28, 0.16, -10.8, 5.0, -18.25, { unit: 2 });
  bx(darkWoodM, 29.8, 0.08, 0.26, -10.8, 5.28, -18.25);
  k.collider(X0, 4, -18.4, -18.1, 4, 5.36, true);
  for (let x = -24.4; x < 4; x += 2.8) andon(x, 4, -17.75, 1.25);
  bx(soilM, 29.6, 0.5, 1.6, -10.8, 4, -19.2, { unit: 2 });
  for (const [x, s] of [[-22.5, 1.1], [-16.5, 1.25], [-10, 1.0], [-3.8, 1.2], [1.8, 0.9]] as [number, number][]) maple(x, 4.5, -19.2, 4.6 * s, 3.0 * s, false, x * 13);
  wagasa(-6.8, 4, -16.9, 1.35, 2.3, wagasaGreenM, -0.55, 0.15);
  // stair luminaries forming 大
  {
    const strokes: [number, number, number, number][] = [
      [-17.5, 12.5, -6.5, 12.5], // horizontal
      [-12, 18.5, -12, 12.5], // head
      [-12, 12.5, -17.5, 2.5], // left leg
      [-12, 12.5, -6.2, 2.5], // right leg
    ];
    for (const [xa, ia, xb, ib] of strokes) {
      const len = Math.hypot(xb - xa, (ib - ia) * TR);
      const n = Math.max(2, Math.round(len / 0.6));
      for (let t = 0; t <= n; t++) {
        const x = xa + ((xb - xa) * t) / n, i = Math.round(ia + ((ib - ia) * t) / n);
        const z = S0 - i * TR - TR * 0.55;
        lums.push({ pos: [x, (i + 1) * RS + 0.1, z], rotY: R() * 0.5 });
      }
    }
  }

  // ================= ESCALATORS =================
  {
    const zb = -8, zt = -15, H = 4, L = Math.hypot(zt - zb, H), th = Math.atan2(H, zb - zt);
    const nx = 0, ny = Math.cos(th), nz = Math.sin(th);
    const cz = (zb + zt) / 2;
    for (const xc of [-0.25, 1.65]) {
      bx(stepsM, 1.05, 0.08, L, xc, H / 2 - 0.04, cz, { rx: th, unit: 0 });
      bx(stepsM, 1.05, 0.06, 1.1, xc, 0, zb + 0.5, { unit: 0 });
      // walkable step colliders
      const n = 20;
      for (let i = 0; i < n; i++) {
        const z2 = zb - ((i + 1) * (zb - zt)) / n, z1 = zb - (i * (zb - zt)) / n;
        const top = ((i + 1) * H) / n;
        k.collider(xc - 0.55, xc + 0.55, z2, z1, 0, top, true);
      }
    }
    // truss body under both escalators
    bx(steelM, 3.5, 0.7, L, 0.7, H / 2 - 0.5, cz, { rx: th });
    // balustrades
    for (const xb of [-0.95, 0.7, 2.35]) {
      const off = 0.55;
      bx(steelM, 0.18, 0.35, L, xb, H / 2 + ny * 0.1 - 0.1, cz + nz * 0.1, { rx: th });
      bx(glassM, 0.03, 0.85, L, xb, H / 2 + ny * off - 0.42, cz + nz * off, { rx: th });
      put(rubberM, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
        new THREE.Vector3(xb, 0.95, zb + 1.3), new THREE.Vector3(xb, 1.0, zb + 0.2), new THREE.Vector3(xb, H + 1.0, zt - 0.2), new THREE.Vector3(xb, H + 0.95, zt - 1.1),
      ], false, "centripetal", 0.1), 40, 0.04, 8));
      bx(steelM, 0.2, 1.0, 1.1, xb, 0, zb + 0.75, { round: true });
      bx(steelM, 0.2, 1.0, 1.0, xb, H, zt - 0.6, { round: true });
    }
    void nx;
    // blue + red umbrellas left leaning at the foot of the escalators
    wagasa(-0.6, 0, -6.4, 1.05, 1.1, wagasaBlueM, -1.15, 0.3);
    wagasa(-2.2, 0, -5.8, 1.05, 1.1, wagasaRedM, -1.2, -0.2);
    k.collider(-3.2, 0.4, -7, -5.2, 0, 1.3, true);
  }

  // ================= EAST: lantern walls, maple panels, torii tunnel =================
  for (const tz of towerZ) lanternHouse(21.6, tz);
  for (const pz of [-2.6, -0.75, 1.1, 9.4, 11.2]) {
    bx(blackM, 0.12, 3.0, 1.45, 21.54, 3.1, pz);
    k.panel(1.25, 2.8, 21.46, 4.6, pz, maplePanelM, -Math.PI / 2);
  }
  for (const pz of [-12, -10.4, 13.5, 15.5, 17.5]) sph(steelM, 0.22, 21.45, 7.6, pz, 0.7, 1, 1);
  for (let z = -11; z <= 1.6; z += 0.95) toriiL.push({ x: 17.5, z, s: 1, ry: 0 });
  for (const z of [-11.8, -8.2, -4.6, -1, 2.6]) { andon(15.2, 0, z, 1.0); andon(19.8, 0, z, 1.0); }
  maple(19.6, 0, 8.6, 4.2, 2.6, true, 77);
  cy(concreteM, 1.0, 1.1, 0.5, 19.6, 0, 8.6, 24, 1.5);
  k.collider(18.6, 20.6, 7.6, 9.6, 0, 0.5, true);

  // ================= FESTIVAL LANES =================
  // Block A: tea courtyard (red bench, big wagasa, maneki-neko, rock, standees)
  fenceX(7, -22, -14);
  fenceZ(-22, 1, 7);
  fenceZ(-14, 1, 2.4);
  fenceZ(-14, 4.6, 7);
  {
    const bxX = -18.2, bzZ = 4.2;
    bx(feltM, 2.6, 0.08, 0.95, bxX, 0.4, bzZ, { round: true, unit: 0.8 });
    bx(lightWoodM, 2.5, 0.06, 0.9, bxX, 0.35, bzZ);
    for (const dx of [-1.15, 1.15]) for (const dz of [-0.38, 0.38]) bx(darkWoodM, 0.08, 0.36, 0.08, bxX + dx, 0, bzZ + dz);
    bx(feltM, 2.62, 0.3, 0.02, bxX, 0.18, bzZ + 0.47, { unit: 0.8 });
    k.collider(bxX - 1.3, bxX + 1.3, bzZ - 0.48, bzZ + 0.48, 0, 0.48, true);
    for (const dx of [-0.8, 0, 0.8]) bx(cushionM, 0.5, 0.08, 0.5, bxX + dx, 0.48, bzZ, { round: true, unit: 0.6 });
    manekiNeko(bxX + 0.45, 0.56, bzZ - 0.05);
    wagasa(-19.8, 0, 3.0, 1.7, 2.7, wagasaRedM, 0.08, 0);
    k.collider(-19.95, -19.65, 2.85, 3.15, 0, 2.7, false);
    // a second bench facing it
    bx(feltM, 1.8, 0.08, 0.8, -17.2, 0.4, 6.0, { round: true, unit: 0.8 });
    for (const dx of [-0.8, 0.8]) for (const dz of [-0.3, 0.3]) bx(darkWoodM, 0.08, 0.36, 0.08, -17.2 + dx, 0, 6 + dz);
    k.collider(-18.1, -16.3, 5.6, 6.4, 0, 0.48, true);
    rock(-15.4, 5.6, 0.9, 0.7, 0.8, 1.1);
    stoneLantern(-21.2, 6.2);
    for (const [x, z, s] of [[-13.2, -1.4, 1], [-12.6, -1.1, 0.92], [-11.9, -1.5, 1.05]] as V3[]) standee(x, z, s);
  }
  // Block B: back-to-back yatai rows
  stall(-8.6, 1.9, -1, "たこ焼", "たこ焼き", "tako", "#1e2a5a");
  stall(-5.8, 1.9, -1, "飴", "りんご飴", "apple", "#8a1a1a");
  stall(-3.0, 1.9, -1, "氷", "かき氷", "ice", "#f2f2f2");
  stall(-8.6, 3.7, 1, "金魚", "金魚すくい", "fish", "#1e4a8a");
  stall(-5.8, 3.7, 1, "面", "お面", "mask", "#2a2a2a");
  stall(-3.0, 3.7, 1, "焼", "焼きそば", "tako", "#6a3a1a");
  // Block C: courtyard with a big orange maple, stalls on the north side
  stall(3.4, 1.9, -1, "団子", "みたらし団子", "apple", "#3a5a2a");
  stall(8.6, 1.9, -1, "玉", "射的", "mask", "#6a1a3a");
  fenceX(8.4, 2, 5.2);
  fenceX(8.4, 7.4, 10);
  maple(6, 0, 5.2, 3.8, 2.6, true, 31);
  cy(stoneM, 0.95, 1.05, 0.45, 6, 0, 5.2, 24, 1.2);
  k.collider(5.1, 6.9, 4.3, 6.1, 0, 0.45, true);
  bamboo(2.9, 6.9, 8, 4.8, 0, 0.5, 5);
  bamboo(9.2, 4.6, 7, 4.4, 0, 0.45, 6);
  // Block D: rock garden (raked gravel, rocks, maple bush mounds)
  fenceX(13.6, -22, -12);
  fenceZ(-22, 9.2, 13.6);
  k.floor(-21.8, -12.2, 9.4, 13.4, gravelM, 1.6, 0.03);
  bx(stoneM, 9.6, 0.12, 0.2, -17, 0, 9.3, { unit: 1 });
  rock(-19.6, 10.8, 1.1, 0.8, 0.9, 7);
  rock(-17.8, 11.6, 0.7, 0.5, 0.6, 8);
  rock(-14.6, 10.6, 0.8, 0.95, 0.7, 9);
  mound(-20.6, 12.6, 1.3, 0.9, false);
  mound(-13.4, 12.6, 1.2, 1.0, false);
  mound(-16.5, 12.9, 0.9, 0.7, true);
  bamboo(-12.8, 10.0, 7, 4.5, 0, 0.45, 9);
  // Block E: stalls + bamboo grove behind
  stall(-7.6, 10.2, -1, "酒", "甘酒", "ice", "#1a1a3a");
  stall(-4.8, 10.2, -1, "焼", "焼き鳥", "tako", "#5a1a12");
  bamboo(-8.2, 12.6, 9, 5.2, 0, 0.6, 11);
  bamboo(-4.3, 12.7, 8, 4.8, 0, 0.55, 12);
  // Block F: stalls
  stall(3.6, 10.2, -1, "綿", "わたあめ", "apple", "#d06a9a");
  stall(6.4, 10.2, -1, "輪", "輪投げ", "mask", "#2a6a5a");
  bamboo(9.2, 11.5, 7, 4.3, 0, 0.45, 13);
  // lane lanterns
  for (const [x, z] of [[-12.2, -2.4], [-1.2, -2.4], [11.2, -2.4], [-12.2, 7.4], [-1.2, 7.4], [11.2, 7.4], [-1.2, 12.4], [1.4, 5.8], [-24.6, 3], [-24.6, 11], [12.6, 12.6], [-12, 13.4]] as [number, number][]) andon(x, 0, z, 1.05);
  wagasa(0.1, 0, 9.0, 1.5, 2.6, wagasaRedM, 0.06, 0.05);
  k.collider(-0.05, 0.25, 8.85, 9.15, 0, 2.6, false);

  // ================= STATION GARDEN (south) =================
  planter(-19, 15.6, 7);
  planter(-9.5, 15.6, 5);
  planter(6.5, 15.2, 5);
  for (const [x, z] of [[-14.2, 18.6], [-6, 18.6], [3.2, 16.8]] as [number, number][]) bench(x, z);
  maple(-22.3, 0, 18.2, 3.6, 2.4, false, 91);
  cy(concreteM, 0.9, 1.0, 0.5, -22.3, 0, 18.2, 24, 1.5);
  k.collider(-23.2, -21.4, 17.3, 19.1, 0, 0.5, true);
  mound(-11.2, 18.4, 1.3, 0.8, false);
  mound(10.8, 16.8, 1.2, 0.85, true);
  rock(-17.4, 18.6, 0.8, 0.6, 0.7, 15);

  // ================= SE BALCONY (gold parapet + bamboo) =================
  {
    const by = 4.4;
    bx(concreteM, 7.6, 0.4, 7.6, 17.8, by - 0.4, 15.8, { unit: 2 });
    k.collider(14, X1, 12, 19.6, by - 0.4, by, true);
    k.floor(14, 21.6, 12, 19.6, paverM, 2, by + 0.012);
    for (const [x, z] of [[14.4, 12.4], [14.4, 17.6]] as [number, number][]) {
      cy(steelM, 0.22, 0.22, by - 0.4, x, 0, z, 20);
      k.collider(x - 0.22, x + 0.22, z - 0.22, z + 0.22, 0, by - 0.4, false);
    }
    // gold parapet on the north and west edges
    bx(goldM, 7.6, 1.0, 0.1, 17.8, by, 12.05, { unit: 1.5 });
    bx(goldM, 0.1, 1.0, 5.9, 14.05, by, 15.0, { unit: 1.5 });
    k.collider(14, X1, 11.95, 12.15, by, by + 1.05, true);
    k.collider(13.95, 14.15, 12, 17.95, by, by + 1.05, true);
    put(goldM, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(21.6, by + 1.05, 12.05), new THREE.Vector3(14.05, by + 1.05, 12.05), new THREE.Vector3(14.05, by + 1.05, 17.95)], false, "catmullrom", 0), 24, 0.045, 8));
    bamboo(20.9, 16.6, 7, 5.2, by, 0.45, 21);
    bamboo(20.9, 13.0, 6, 4.8, by, 0.4, 22);
    bench(18.2, 18.8);
    for (const [x, z] of [[20.8, 18.8], [14.8, 18.9]] as [number, number][]) andon(x, by, z, 1.0);
    // stairs up from the garden along the south wall
    const n = 22, s0 = 5.6, tr = 0.38;
    for (let i = 0; i < n; i++) {
      const top = ((i + 1) * by) / n, xc = s0 + i * tr + tr / 2;
      bx(stairM, tr, top, 1.5, xc, 0, 18.85, { unit: 2, solid: true });
    }
    bx(steelM, 0.06, 0.06, 0.06, s0, 0, 18.1);
    put(steelM, new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(s0, 1.0, 18.08), new THREE.Vector3(14.0, by + 1.0, 18.08)), 4, 0.03, 8));
    for (let i = 0; i <= 4; i++) {
      const x = s0 + (i * (14 - s0)) / 4, y = ((x - s0) / (14 - s0)) * by;
      cy(steelM, 0.02, 0.02, 1.0, x, y, 18.08, 8);
    }
  }


  // ================= DENSITY: garlands, banners, gate, extra torii, benches, barrels =================
  {
    // lantern garlands strung over the lanes
    const wires: THREE.BufferGeometry[] = [];
    const garland = (ax: number, az: number, bx2: number, bz: number, y: number) => {
      const len = Math.hypot(bx2 - ax, bz - az), n = Math.round(len / 0.75);
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(new THREE.Vector3(ax + (bx2 - ax) * t, y - Math.sin(t * Math.PI) * 0.35, az + (bz - az) * t)); }
      wires.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.012, 4));
      for (let i = 1; i < n; i++) {
        const t = i / n;
        chochin.push({ pos: [ax + (bx2 - ax) * t, y - Math.sin(t * Math.PI) * 0.35 - 0.3, az + (bz - az) * t], rotY: R() * 0.6, scale: [0.62, 0.62, 0.62] });
      }
      for (const [x, z] of [[ax, az], [bx2, bz]]) {
        cy(darkWoodM, 0.06, 0.07, y + 0.1, x, 0, z, 8);
        k.collider(x - 0.1, x + 0.1, z - 0.1, z + 0.1, 0, y + 0.1, false);
      }
    };
    garland(-22.6, -1.2, -12.4, -1.2, 3.3);
    garland(-11.6, -1.2, -1.6, -1.2, 3.3);
    garland(2.2, -1.2, 11.8, -1.2, 3.3);
    garland(-11.6, 7.8, -1.6, 7.8, 3.2);
    garland(1.6, 0.4, 1.6, 7.9, 3.2);
    garland(-10.8, 0.4, -10.8, 7.2, 3.2);
    garland(-1.4, 13.6, 10.4, 13.6, 3.1);
    for (const g of wires) put(blackM, g);

    // nobori banners
    const noboriTexts: [string, string][] = [["秋祭り", "#c8141e"], ["奉納", "#1e3a8a"], ["夜市", "#c8141e"], ["稲荷", "#d2331a"]];
    const noboriMats = noboriTexts.map(([t, c]) => k.mat(k.tex("kyNobori" + t, () => KT.kyNobori(t, "#f2ead8", c)), "#ffffff", [1, 1], { roughness: 0.9, bump: 0, emissive: "#fff2dc", emissiveIntensity: 0.18 }));
    for (const m of noboriMats) m.m.side = THREE.DoubleSide;
    const nobori = (x: number, z: number, i: number, ry: number) => {
      cy(darkWoodM, 0.025, 0.03, 3.1, x, 0, z, 8);
      bx(darkWoodM, 0.03, 0.03, 0.62, x, 3.0, z + 0.0, { ry });
      const g = new THREE.PlaneGeometry(0.58, 2.2);
      put(noboriMats[i % noboriMats.length], xf(g, x + Math.sin(ry) * 0.31, 1.95, z + Math.cos(ry) * 0.31, ry + Math.PI / 2));
      k.collider(x - 0.06, x + 0.06, z - 0.06, z + 0.06, 0, 3.1, false);
    };
    [[14.6, -12.2], [14.6, -9.4], [14.6, -6.6], [14.6, -3.8], [14.6, -1.0], [14.6, 1.8], [20.6, -12.2], [20.6, -8.2], [20.6, -1.8], [20.6, 2.4]].forEach(([x, z], i) => nobori(x, z, i === 0 || x > 20 ? 3 : i, 0));
    [[-12.6, -2.6], [-1.6, -2.6], [2.0, -2.6], [11.8, -2.6], [-22.4, 0.4], [-13.6, 8.6], [10.2, 8.8], [-24.8, -2.4]].forEach(([x, z], i) => nobori(x, z, i, Math.PI / 2));

    // festival entrance gate over the central lane
    for (const s of [-1, 1]) {
      bx(darkWoodM, 0.2, 3.6, 0.2, s * 1.9, 0, -2.4, { round: true, solid: true });
      bx(stoneM, 0.4, 0.3, 0.4, s * 1.9, 0, -2.4, { round: true });
    }
    bx(darkWoodM, 4.6, 0.18, 0.24, 0, 3.4, -2.4, { round: true });
    bx(kawaraM, 4.9, 0.08, 0.7, 0, 3.62, -2.4, { unit: 1.2 });
    put(signM("秋の夜祭"), xf(new THREE.BoxGeometry(2.4, 0.55, 0.06), 0, 3.0, -2.4, Math.PI));
    for (const s of [-1, 1]) chochin.push({ pos: [s * 1.25, 2.95, -2.35], scale: [1.1, 1.1, 1.1] });

    // second torii row in the east lane
    for (let i = 0; i < 4; i++) toriiL.push({ x: 12, z: 3.9 + i * 0.95, s: 0.9, ry: 0 });

    // more benches and a sake barrel stack
    bench(-24.0, 5.0);
    bench(-24.0, 12.2);
    bench(12.0, 11.2);
    bench(-6.2, -4.0);
    bench(8.2, -4.2);
    const taruM = k.mat(k.tex("kyTaru", () => KT.kyTaru("奉納")), "#ffffff", [1, 1], { roughness: 0.9, bump: 0 });
    const taruG = () => new THREE.LatheGeometry([[0.0, 0], [0.33, 0], [0.37, 0.12], [0.39, 0.3], [0.37, 0.48], [0.33, 0.6], [0.0, 0.6]].map(([a, b]) => new THREE.Vector2(a, b)), 20);
    for (const [x, y, z] of [[20.2, 0, 3.4], [20.95, 0, 3.4], [20.58, 0.6, 3.4], [20.2, 0, 4.15], [20.95, 0, 4.15]] as V3[]) put(taruM, xf(taruG(), x, y, z, R() * 3));
    k.collider(19.8, 21.35, 3.0, 4.55, 0, 1.2, true);

    // maples on the tower terrace
    maple(18.4, 4, -17.2, 4.2, 2.6, false, 55);
    maple(20.6, 4, -14.6, 3.2, 2.0, true, 56);
  }

  // ================= LIFE: ema wishing rack, festival poster, notices =================
  {
    const x = -21.6, z1 = 1.7, z2 = 3.7;
    for (const z of [z1, z2]) bx(darkWoodM, 0.1, 1.9, 0.1, x, 0, z, { round: true });
    for (const y of [1.15, 1.55]) bx(darkWoodM, 0.06, 0.05, z2 - z1 + 0.2, x, y, (z1 + z2) / 2);
    bx(kawaraM, 0.5, 0.06, z2 - z1 + 0.5, x, 1.9, (z1 + z2) / 2, { unit: 1.2 });
    k.collider(x - 0.1, x + 0.1, z1 - 0.1, z2 + 0.1, 0, 1.95, false);
    const wishes = ["トム・コドナーが\n見つかりませんように", "かくれんぼで\n勝てますように", "家内安全", "合格祈願\nたろう", "ずっと隠れて\nいられますように", "Tom Kodner\nwas here!", "商売繁盛", "健康第一\nはなこ", "カメレオンに\nなりたい", "恋愛成就"];
    wishes.forEach((w, i) => {
      const id = life.custom(128, 110, (g, cw, ch) => {
        g.fillStyle = "#d9b27a"; g.beginPath(); g.moveTo(0, 30); g.lineTo(cw / 2, 0); g.lineTo(cw, 30); g.lineTo(cw, ch); g.lineTo(0, ch); g.closePath(); g.fill();
        g.strokeStyle = "#8a5a2a"; g.lineWidth = 3; g.stroke();
        g.fillStyle = "#c8141e"; g.beginPath(); g.arc(cw / 2, 22, 5, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#1a1a1a"; g.textAlign = "center"; const ls = w.split("\n");
        ls.forEach((l, j) => { let sz = 17; g.font = `bold ${sz}px ${JPS}`; const tw = g.measureText(l).width; if (tw > cw - 12) { sz = Math.floor(sz * (cw - 12) / tw); g.font = `bold ${sz}px ${JPS}`; } g.fillText(l, cw / 2, 58 + j * 22); });
        g.textAlign = "left";
      }, true);
      life.wall(id, x + 0.045, i % 2 ? 1.02 : 1.42, z1 + 0.25 + Math.floor(i / 2) * 0.37, 0.2, Math.PI / 2, (R() - 0.5) * 0.25);
    });
    life.wall(life.poster({ title: "秋の夜祭", sub: "京都駅 大階段 特設会場", body: "十月一日〜十日  夕方五時から\n主催: トム・コドナー実行委員会", bg: "#1a1030", fg: "#f2d27a", accent: "#c8141e", style: "retro", font: JP, wear: 0.1 }), -21.935, 0.56, 5.2, 0.4, Math.PI / 2);
    life.wall(life.label({ text: "お静かに", sub: "枯山水 - 立ち入り禁止", bg: "#f2ead8", fg: "#1a1a1a", border: "#1a1a1a", font: JP, px: [256, 120] }), -21.935, 0.62, 11.4, 0.44, Math.PI / 2);
  }

  // ================= DOLLS =================
  const dollCols = ["#c8102e", "#e05a8a", "#2a4a8a", "#f0e6d0", "#7a2a8a", "#d8602a", "#1a6a5a"];
  const dPos: [number, number, number, boolean][] = [
    [-19.2, -9.6, 0.3, true], [-18.5, -10.1, -0.2, false], [-20.1, -11.0, 0.1, false], [-17.8, -11.8, 0.5, true], [-19.4, -12.4, -0.3, false],
    [-7.1, -10.6, 0.2, false], [-6.4, -11.0, -0.4, true], [-4.2, -13.6, 0.1, false],
    [-3.4, 6.2, 2.6, true], [-2.8, 6.6, 3.2, false], [12.6, -1.8, -1.2, true], [17.5, 3.6, 3.1, false], [-15.2, 0.2, 2.8, true], [5.2, 12.8, 3.4, false],
  ];
  dPos.forEach(([x, z, ry, p], i) => dolls.push({ x, y: x > -25.6 && x < -1.6 ? stepTop(z) : 0, z, ry, col: dollCols[i % dollCols.length], parasol: p }));

  // ================= emit instanced sets =================
  emitTorii();
  emitDolls();
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  if (beams.length) k.instances(unitBox, latticeM, beams, { noShadow: false });
  if (beamsLit.length) k.instances(unitBox, latticeLitM, beamsLit);
  if (beamsGlow.length) k.instances(unitBox, latticeGlowM, beamsGlow, { noShadow: true });
  {
    const lat = new THREE.LatheGeometry([[0.02, 0], [0.12, 0.02], [0.2, 0.09], [0.235, 0.22], [0.235, 0.3], [0.2, 0.42], [0.12, 0.49], [0.02, 0.51]].map(([r, h]) => new THREE.Vector2(r, h - 0.25)), 16);
    if (chochin.length) k.instances(lat, chochinM, chochin, { noShadow: true });
    if (gion.length) k.instances(lat, gionM, gion, { noShadow: true });
  }
  k.instances(new THREE.BoxGeometry(0.1, 1, 0.1), darkWoodM, andonPost);
  k.instances(new THREE.BoxGeometry(0.3, 0.4, 0.3), andonM, andonLamp, { noShadow: true });
  k.instances(new THREE.ConeGeometry(0.3, 0.16, 4), darkWoodM, andonCap);
  k.instances(new THREE.BoxGeometry(0.16, 0.2, 0.16), lumM, lums, { noShadow: true });
  k.instances(new THREE.CylinderGeometry(0.072, 0.082, 1, 10), bambooM, culms);
  k.instances(new THREE.TorusGeometry(0.078, 0.014, 5, 12), bambooNodeM, culmNodes, { noShadow: true });
  k.instances(new THREE.PlaneGeometry(1.2, 1.2), bambooLeafM, bLeaves);
  const clumpGeo = new THREE.IcosahedronGeometry(1, 1);
  k.instances(clumpGeo, mapleRedM, clumpR);
  k.instances(clumpGeo, mapleOrM, clumpO);
  if (shrubs.length) k.instances(new THREE.IcosahedronGeometry(1, 1), shrubM, shrubs);
  if (goodsBalls.length) k.instances(new THREE.SphereGeometry(1, 10, 8), k.mat(null, "#ffffff", [1, 1], { roughness: 0.25 }), goodsBalls, { noShadow: true });
  if (branchGeos.length) k.merged(branchGeos, barkM);
  life.finish();
  for (const [m, list] of batches) k.merged(list, m);

  // ================= areas =================
  k.room("East Balcony", 14, X1, 12, Z1);
  k.room("Upper Terrace", X0, 21.6, Z0, -15);
  k.room("Grand Stairs", X0, -1.6, -15, -7);
  k.room("Escalators", -1.6, 4, -15, -6);
  k.room("Torii Path", 14, X1, -13, 12);
  k.room("Tea Courtyard", -22, -14, 1, 7);
  k.room("Rock Garden", -22, -12, 9, 13.6);
  k.room("Station Garden", X0, 14, 14, Z1);
  k.room("Festival Lanes", X0, 14, -3, 14);
  k.room("Stair Plaza", X0, 14, -7, -3);

  const hiders: THREE.Vector3[] = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) hiders.push(new THREE.Vector3(-14.6 + c * 1.55, 0, -6.1 + r * 1.35));
  const hunters: THREE.Vector3[] = [];
  for (let i = 0; i < 9; i++) hunters.push(new THREE.Vector3(-2.4 + (i % 3) * 1.3, 0, 16.4 + Math.floor(i / 3) * 1.2));

  return k.finish({
    id: "kyoto", name: "Kyoto",
    bounds: { minX: X0, maxX: X1, minZ: Z0, maxZ: Z1 },
    hunterSpawns: hunters, hiderSpawns: hiders,
    preview: { pos: [16.2, 7.0, 18.6], look: [-9, 3.2, -9], fov: 66 },
    lighting: {
      sky: "#030409",
      hemi: ["#8a98c0", "#3a2818", 0.6],
      sun: { color: "#b8c6ff", int: 0.9, pos: [-10, 34, 14] },
      points: [
        { pos: [-12, 5.8, -10.5], color: "#ffb45a", int: 38, dist: 20 },
        { pos: [-18, 3.2, 4], color: "#ff8a4a", int: 12, dist: 10 },
        { pos: [-5.5, 3.2, 6.5], color: "#ffa25a", int: 16, dist: 12 },
        { pos: [6, 3.4, 5], color: "#ff9a50", int: 14, dist: 12 },
        { pos: [18.5, 4.5, -2], color: "#ff7a3a", int: 18, dist: 13 },
        { pos: [-4, 4, 16], color: "#ffc88a", int: 10, dist: 13 },
      ],
      exposure: 1.25,
      env: 0.3,
      hdri: "night",
    },
  });

  // ======================================================================
  // helpers (hoisted function declarations share the scope above)
  // ======================================================================

  function addBeam(list: Inst[], a: THREE.Vector3, b: THREE.Vector3, nrm: THREE.Vector3, t: number, d: number) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    if (len < 0.05) return;
    dir.divideScalar(len);
    const zA = nrm.clone().addScaledVector(dir, -nrm.dot(dir)).normalize();
    const xA = new THREE.Vector3().crossVectors(dir, zA);
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xA, dir, zA));
    const e = new THREE.Euler().setFromQuaternion(q, "XYZ");
    const mid = a.clone().add(b).multiplyScalar(0.5);
    list.push({ pos: [mid.x, mid.y, mid.z], rotX: e.x, rotY: e.y, rotZ: e.z, scale: [t, len + t * 0.6, d] });
  }

  function profY(x: number) {
    if (x >= 26.5) return 9;
    if (x >= -2) { const c = 1 - (26.5 - x) / 28.5; return 9 + 17 * Math.sin(Math.acos(Math.max(-1, Math.min(1, c)))); }
    return 26 + (x + 2) * (4.5 / 23.6);
  }

  function buildLattice() {
    // cross-section profile (x, y): quarter ellipse from the east wall top, then a gentle slope to the west building
    const pts: [number, number][] = [];
    for (let i = 0; i <= 120; i++) { const a = (i / 120) * Math.PI / 2; pts.push([26.5 - 28.5 * (1 - Math.cos(a)), 9 + 17 * Math.sin(a)]); }
    for (let i = 1; i <= 30; i++) { const t = i / 30; pts.push([-2 + (X0 + 2) * t, 26 + (21.5 - 26) * t]); }
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = cum[cum.length - 1];
    const at = (s: number): [number, number, number, number] => {
      let i = 1;
      while (i < cum.length - 1 && cum[i] < s) i++;
      const t = (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
      const x = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, y = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t;
      const tx = pts[i][0] - pts[i - 1][0], ty = pts[i][1] - pts[i - 1][1], l = Math.hypot(tx, ty);
      return [x, y, tx / l, ty / l];
    };
    const nR = Math.round(total / 1.7), ds = total / nR, dz = 1.75;
    const nodes = new Map<string, { p: THREE.Vector3; n: THREE.Vector3 }>();
    for (let i = 0; i <= nR; i++) {
      const [x, y, tx, ty] = at(i * ds);
      const off = (i % 2) * 0.5;
      for (let j = -1; j < 30; j++) {
        const z = -20.4 + (j + off) * dz;
        if (z < -20.41 || z > 20.41) continue;
        nodes.set(`${i},${j}`, { p: new THREE.Vector3(x, y, z), n: new THREE.Vector3(ty, -tx, 0) });
      }
    }
    const pick = (a: THREE.Vector3, b: THREE.Vector3) => {
      const my = (a.y + b.y) / 2, mx = (a.x + b.x) / 2;
      if (mx > 20 && my < 15) {
        const vertical = Math.abs(a.y - b.y) > 0.8;
        return !vertical && R() < 0.3 ? beamsGlow : beamsLit;
      }
      return beams;
    };
    const link = (ka: string, kb: string) => {
      const A = nodes.get(ka), B = nodes.get(kb);
      if (!A || !B) return;
      const n = A.n.clone().add(B.n).normalize();
      const list = pick(A.p, B.p);
      addBeam(list, A.p, B.p, n, list === beamsGlow ? 0.09 : 0.13, list === beamsGlow ? 0.1 : 0.34);
    };
    for (let i = 0; i <= nR; i++)
      for (let j = -1; j < 30; j++) {
        const kk = `${i},${j}`;
        if (!nodes.has(kk)) continue;
        link(kk, `${i},${j + 1}`);
        if (i % 2 === 0) { link(kk, `${i + 1},${j - 1}`); link(kk, `${i + 1},${j}`); }
        else { link(kk, `${i + 1},${j}`); link(kk, `${i + 1},${j + 1}`); }
      }
    // gable ends (vertical lattice planes)
    for (const [zc, yb] of [[-20.4, 9], [20.4, 6]] as [number, number][]) {
      const gn = new Map<string, THREE.Vector3>();
      const dx = 1.7, dy = 1.7 * 0.866;
      for (let r = 0; yb + r * dy < 27; r++)
        for (let c = -1; c < 33; c++) {
          const x = X0 + (c + (r % 2) * 0.5) * dx, y = yb + r * dy;
          if (x < X0 - 0.01 || x > 26.5) continue;
          if (y > profY(x) + 0.05) continue;
          gn.set(`${r},${c}`, new THREE.Vector3(x, y, zc));
        }
      const nz = new THREE.Vector3(0, 0, 1);
      const gl = (a: string, b: string) => { const A = gn.get(a), B = gn.get(b); if (A && B) addBeam(beams, A, B, nz, 0.11, 0.26); };
      for (const key of gn.keys()) {
        const [r, c] = key.split(",").map(Number);
        gl(key, `${r},${c + 1}`);
        if (r % 2 === 0) { gl(key, `${r + 1},${c - 1}`); gl(key, `${r + 1},${c}`); }
        else { gl(key, `${r + 1},${c}`); gl(key, `${r + 1},${c + 1}`); }
      }
      // top chord along the profile
      let prev: THREE.Vector3 | null = null;
      for (let x = X0; x <= 26.51; x += 1.0) {
        const p = new THREE.Vector3(x, profY(x), zc);
        if (prev) addBeam(beams, prev, p, nz, 0.16, 0.36);
        prev = p;
      }
    }
  }

  /** open steel lattice cube with X bracing and a small gabled top (on the white towers) */
  function latticeCube(cx: number, y0: number, cz: number, s: number) {
    const h = s / 2;
    const P = (x: number, y: number, z: number) => new THREE.Vector3(cx + x, y0 + y, cz + z);
    const c = [P(-h, 0, -h), P(h, 0, -h), P(h, 0, h), P(-h, 0, h), P(-h, s, -h), P(h, s, -h), P(h, s, h), P(-h, s, h)];
    const up = new THREE.Vector3(0, 1, 0), ex = new THREE.Vector3(1, 0, 0), ez = new THREE.Vector3(0, 0, 1);
    const L = (a: THREE.Vector3, b: THREE.Vector3, n: THREE.Vector3, t = 0.2) => addBeam(beamsLit, a, b, n, t, t);
    for (let i = 0; i < 4; i++) { L(c[i], c[(i + 1) % 4], up, 0.26); L(c[i + 4], c[((i + 1) % 4) + 4], up, 0.26); L(c[i], c[i + 4], ex, 0.26); }
    // X braces on the four faces
    L(c[0], c[5], ez); L(c[1], c[4], ez); L(c[3], c[6], ez); L(c[2], c[7], ez);
    L(c[0], c[7], ex); L(c[3], c[4], ex); L(c[1], c[6], ex); L(c[2], c[5], ex);
    // gabled top
    const r1 = P(0, s + h * 0.75, -h), r2 = P(0, s + h * 0.75, h);
    L(c[4], r1, ez); L(c[5], r1, ez); L(c[7], r2, ez); L(c[6], r2, ez); L(r1, r2, up, 0.24);
    L(c[4], r2, ex); L(c[7], r1, ex); L(c[5], r2, ex); L(c[6], r1, ex);
  }

  function andon(x: number, y: number, z: number, h: number) {
    andonPost.push({ pos: [x, y + (h - 0.2) / 2, z], scale: [1, h - 0.2, 1] });
    andonLamp.push({ pos: [x, y + h, z], rotY: 0 });
    andonCap.push({ pos: [x, y + h + 0.28, z], rotY: Math.PI / 4 });
    k.collider(x - 0.18, x + 0.18, z - 0.18, z + 0.18, y, y + h + 0.36, true);
  }

  /** big nodate-gasa umbrella: canopy lathe + pole. tilt rx/rz tilts the whole thing */
  function wagasa(x: number, y: number, z: number, r: number, h: number, m: Mat, rx: number, rz: number) {
    const prof: [number, number][] = [[r, 0], [r * 0.93, 0.07 * r], [r * 0.7, 0.2 * r], [r * 0.4, 0.3 * r], [0.04, 0.36 * r], [0, 0.37 * r]];
    const canopy = new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a, b)), 32);
    canopy.translate(0, h, 0);
    const pole = new THREE.CylinderGeometry(0.025, 0.03, h + 0.1, 8);
    pole.translate(0, (h + 0.1) / 2, 0);
    const ribs = new THREE.CylinderGeometry(r * 0.35, 0.03, r * 0.3, 16, 1, true);
    ribs.translate(0, h - r * 0.15, 0);
    for (const g of [canopy, pole, ribs]) { g.rotateX(rx); g.rotateZ(rz); g.translate(x, y, z); }
    put(m, canopy);
    put(darkWoodM, pole);
    put(lightWoodM, ribs);
  }

  /** tsuiji-style fence along X: boards, plaster band, gabled kawara cap */
  function fenceX(z: number, x1: number, x2: number) {
    const L = x2 - x1, cx = (x1 + x2) / 2;
    bx(boardsM, L, 1.0, 0.12, cx, 0, z, { unit: 1.6 });
    bx(plasterM, L, 0.34, 0.15, cx, 1.0, z, { unit: 2 });
    bx(glowStripM, L - 0.1, 0.03, 0.17, cx, 1.02, z);
    for (const s of [-1, 1]) bx(kawaraM, L + 0.25, 0.05, 0.34, cx, 1.36, z + s * 0.14, { rx: s * 0.42, unit: 1.2 });
    bx(kawaraM, L + 0.25, 0.1, 0.12, cx, 1.44, z, { unit: 1.2 });
    for (let x = x1 + 0.06; x <= x2 - 0.05; x += Math.max(1.5, (L - 0.12) / Math.round((L - 0.12) / 1.8))) bx(darkWoodM, 0.13, 1.36, 0.18, x, 0, z);
    bx(darkWoodM, 0.13, 1.36, 0.18, x2 - 0.06, 0, z);
    k.collider(x1, x2, z - 0.3, z + 0.3, 0, 1.55, true);
  }
  function fenceZ(x: number, z1: number, z2: number) {
    const L = z2 - z1, cz = (z1 + z2) / 2;
    bx(boardsM, 0.12, 1.0, L, x, 0, cz, { unit: 1.6 });
    bx(plasterM, 0.15, 0.34, L, x, 1.0, cz, { unit: 2 });
    bx(glowStripM, 0.17, 0.03, L - 0.1, x, 1.02, cz);
    for (const s of [-1, 1]) bx(kawaraM, 0.34, 0.05, L + 0.25, x + s * 0.14, 1.36, cz, { rz: -s * 0.42, unit: 1.2, swap: true });
    bx(kawaraM, 0.12, 0.1, L + 0.25, x, 1.44, cz, { unit: 1.2, swap: true });
    for (let z = z1 + 0.06; z <= z2 - 0.05; z += Math.max(1.5, (L - 0.12) / Math.max(1, Math.round((L - 0.12) / 1.8)))) bx(darkWoodM, 0.18, 1.36, 0.13, x, 0, z);
    bx(darkWoodM, 0.18, 1.36, 0.13, x, 0, z2 - 0.06);
    k.collider(x - 0.3, x + 0.3, z1, z2, 0, 1.55, true);
  }

  /** yatai festival stall facing +z (f=1) or -z (f=-1) */
  function stall(cx: number, cz: number, f: number, noren: string, sign: string, goods: string, norenCol: string) {
    const W = 2.6, D = 1.8, H = 2.2;
    const fz = (d: number) => cz + f * d;
    const ry = f > 0 ? 0 : Math.PI;
    bx(boardsM, W, H, 0.08, cx, 0, fz(-D / 2 + 0.04), { unit: 1.6 });
    for (const s of [-1, 1]) bx(boardsM, 0.08, H, D, cx + s * (W / 2 - 0.04), 0, cz, { unit: 1.6 });
    bx(boardsM, W - 0.16, 0.85, 0.45, cx, 0, fz(D / 2 - 0.3), { unit: 1.6 });
    bx(lightWoodM, W + 0.04, 0.05, 0.62, cx, 0.85, fz(D / 2 - 0.3), { round: true });
    for (const s of [-1, 1]) bx(darkWoodM, 0.11, H + 0.2, 0.11, cx + s * (W / 2 - 0.05), 0, fz(D / 2 - 0.05), { round: true });
    bx(darkWoodM, W, 0.14, 0.12, cx, H - 0.02, fz(D / 2 - 0.05));
    bx(kawaraM, W + 0.5, 0.08, D + 0.75, cx, H + 0.16, fz(0.2), { rx: f * 0.2, unit: 1.2 });
    bx(darkWoodM, W + 0.5, 0.1, 0.1, cx, H + 0.05, fz(D / 2 + 0.52));
    bx(darkWoodM, W + 0.3, 0.16, 0.16, cx, H + 0.34, fz(-D / 2 + 0.05));
    // noren curtain + roof sign
    put(norenM(noren, norenCol), xf(new THREE.BoxGeometry(W - 0.25, 0.45, 0.02), cx, H - 0.28, fz(D / 2 + 0.01), ry));
    put(signM(sign), xf(new THREE.BoxGeometry(1.7, 0.42, 0.05), cx, H + 0.72, fz(-D / 2 + 0.08), ry));
    bx(darkWoodM, 0.06, 0.3, 0.06, cx - 0.6, H + 0.4, fz(-D / 2 + 0.05));
    bx(darkWoodM, 0.06, 0.3, 0.06, cx + 0.6, H + 0.4, fz(-D / 2 + 0.05));
    bx(glowStripM, W - 0.4, 0.04, 0.06, cx, H - 0.1, fz(D / 2 - 0.25));
    for (const s of [-1, 1]) chochin.push({ pos: [cx + s * (W / 2 + 0.05), H - 0.2, fz(D / 2 + 0.1)], scale: [0.85, 0.85, 0.85] });
    // price board on the counter front
    { const items = priceLists[sign]; if (items) { const id = life.menu({ title: sign, sub: "トム・コドナー商店", items, style: "paper", font: JP, px: [256, 200] }); life.wall(id, cx + 0.62, 0.45, fz(D / 2 - 0.075) + f * 0.006, 0.44, ry); } }
    // goods on the counter
    const gy = 0.9, gz = fz(D / 2 - 0.3);
    const rr = rng(Math.round(cx * 100 + cz * 7));
    if (goods === "apple") {
      bx(lightWoodM, 1.6, 0.18, 0.3, cx, gy, gz, { round: true });
      for (let i = 0; i < 14; i++) {
        const x = cx - 0.7 + (i % 7) * 0.23, z = gz + (i < 7 ? -0.07 : 0.07);
        goodsBalls.push({ pos: [x, gy + 0.3, z], scale: [0.055, 0.055, 0.055], color: noren === "綿" ? "#f6c6de" : noren === "団子" ? "#e8d8a8" : "#c80c18" });
        cy(lightWoodM, 0.006, 0.006, 0.14, x, gy + 0.14, z, 4);
      }
    } else if (goods === "fish") {
      for (const dx of [-0.6, 0.6]) {
        cy(colM("#2a74c8", 0.3), 0.34, 0.3, 0.14, cx + dx, gy, gz, 20);
        cy(colM("#6ab8e8", 0.05, 0.2), 0.31, 0.31, 0.01, cx + dx, gy + 0.12, gz, 20);
        for (let i = 0; i < 5; i++) goodsBalls.push({ pos: [cx + dx + (rr() - 0.5) * 0.4, gy + 0.135, gz + (rr() - 0.5) * 0.4], scale: [0.045, 0.02, 0.02], rotY: rr() * 6, color: "#ff5a10" });
      }
    } else if (goods === "ice") {
      for (let i = 0; i < 6; i++) {
        const x = cx - 0.8 + i * 0.32;
        cy(porcelainM, 0.07, 0.05, 0.1, x, gy, gz, 12);
        goodsBalls.push({ pos: [x, gy + 0.14, gz], scale: [0.08, 0.07, 0.08], color: ["#e8263a", "#3ad06a", "#3a7ae8", "#f0e04a"][i % 4] });
      }
      cy(steelM, 0.12, 0.14, 0.4, cx + 0.95, gy, gz - 0.1, 12);
    } else if (goods === "tako") {
      bx(blackM, 1.4, 0.12, 0.45, cx, gy, gz, { round: true });
      for (let i = 0; i < 24; i++) goodsBalls.push({ pos: [cx - 0.6 + (i % 8) * 0.17, gy + 0.14, gz - 0.14 + Math.floor(i / 8) * 0.14], scale: [0.05, 0.04, 0.05], color: "#c07a38" });
    } else if (goods === "mask") {
      for (let i = 0; i < 8; i++) {
        const x = cx - 0.95 + (i % 4) * 0.63, y = 1.25 + Math.floor(i / 4) * 0.42;
        const g = new THREE.SphereGeometry(0.15, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        g.scale(1, 1.25, 0.5);
        g.rotateX(f > 0 ? Math.PI / 2 : -Math.PI / 2);
        put(colM(["#f4f0e8", "#e03a3a", "#3a6ae0", "#f0c030"][i % 4]), xf(g, x, y, fz(-D / 2 + 0.1)));
      }
      bx(lightWoodM, 1.8, 0.1, 0.3, cx, gy, gz, { round: true });
    }
    k.collider(cx - W / 2 - 0.05, cx + W / 2 + 0.05, cz - D / 2, cz + D / 2, 0, H + 0.4, true);
  }

  /** lantern house: house-shaped frame filled with white Gion lanterns (on the east wall) */
  function lanternHouse(xw: number, zc: number) {
    const W = 3.4, y0 = 3.6, Hw = 3.3, Hr = 1.3;
    const shape = new THREE.Shape();
    shape.moveTo(-W / 2, 0); shape.lineTo(W / 2, 0); shape.lineTo(W / 2, Hw); shape.lineTo(0, Hw + Hr); shape.lineTo(-W / 2, Hw); shape.closePath();
    const back = new THREE.ShapeGeometry(shape);
    back.rotateY(-Math.PI / 2);
    put(blackM, xf(back, xw - 0.02, y0, zc));
    // gold-wood roof trim
    for (const s of [-1, 1]) {
      const len = Math.hypot(W / 2 + 0.25, Hr + 0.1);
      bx(goldM, 0.16, 0.16, len, xw - 0.12, y0 + Hw + Hr / 2 - 0.08, zc + s * (W / 4 + 0.06), { rx: s * Math.atan2(Hr, W / 2), unit: 1 });
    }
    // lanterns
    const cols = 6, rows = 8, dzc = W / cols, dyc = (Hw + Hr) / rows;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const z = zc - W / 2 + (c + 0.5) * dzc, y = y0 + (r + 0.5) * dyc;
        const roofY = y0 + Hw + Hr * (1 - Math.abs(z - zc) / (W / 2));
        if (y + 0.2 > roofY) continue;
        if (r < 3 && Math.abs(z - zc) < 0.6) continue; // arched opening at the bottom centre
        gion.push({ pos: [xw - 0.26, y, z], rotY: R() * 0.4, scale: [1.05, 0.98, 1.05] });
      }
    k.collider(xw - 0.5, xw, zc - W / 2, zc + W / 2, y0, y0 + Hw + Hr, true);
  }

  function emitTorii() {
    const w = 2.8, h = 3.3, L = w + 1.3;
    const red: THREE.BufferGeometry[] = [], black: THREE.BufferGeometry[] = [];
    for (const s of [-1, 1]) {
      red.push(new THREE.CylinderGeometry(0.13, 0.15, h, 14).translate(s * w / 2, h / 2, 0));
      black.push(new THREE.CylinderGeometry(0.18, 0.18, 0.32, 14).translate(s * w / 2, 0.16, 0));
    }
    red.push(new THREE.BoxGeometry(w + 0.7, 0.17, 0.13).translate(0, h - 0.72, 0));
    red.push(new THREE.BoxGeometry(w + 0.8, 0.2, 0.22).translate(0, h - 0.1, 0));
    red.push(new THREE.BoxGeometry(0.14, 0.5, 0.12).translate(0, h - 0.45, 0));
    const sh = new THREE.Shape();
    sh.moveTo(-L / 2, 0.2);
    sh.quadraticCurveTo(0, -0.06, L / 2, 0.2);
    sh.lineTo(L / 2 + 0.03, 0.4);
    sh.quadraticCurveTo(0, 0.14, -L / 2 - 0.03, 0.4);
    sh.closePath();
    const kas = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: false, curveSegments: 12 });
    kas.translate(0, h - 0.02, -0.15);
    black.push(kas);
    const clean = (a: THREE.BufferGeometry[]) => a.map((g) => { const n = g.index ? g.toNonIndexed() : g; for (const key of Object.keys(n.attributes)) if (!["position", "normal", "uv"].includes(key)) n.deleteAttribute(key); return n; });
    const redG = mergeList(clean(red)), blackG = mergeList(clean(black));
    // small group of three by the foot of the stairs
    for (const z of [-5.8, -4.9, -4.0]) toriiL.push({ x: -19.3, z, s: 0.95, ry: 0 });
    const list: Inst[] = toriiL.map((t) => ({ pos: [t.x, 0, t.z], rotY: t.ry, scale: [t.s, t.s, t.s] }));
    k.instances(redG, toriiRedM, list);
    k.instances(blackG, toriiBlackM, list);
    for (const t of toriiL) for (const s of [-1, 1]) {
      const px = t.x + s * (w / 2) * t.s;
      k.collider(px - 0.18, px + 0.18, t.z - 0.18, t.z + 0.18, 0, h * t.s, false);
    }
  }

  function mergeList(a: THREE.BufferGeometry[]) {
    let count = 0;
    for (const g of a) count += g.attributes.position.count;
    const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), uv = new Float32Array(count * 2);
    let o = 0;
    for (const g of a) {
      pos.set(g.attributes.position.array as Float32Array, o * 3);
      nor.set(g.attributes.normal.array as Float32Array, o * 3);
      uv.set(g.attributes.uv.array as Float32Array, o * 2);
      o += g.attributes.position.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    return out;
  }

  function emitDolls() {
    const body: Inst[] = [], obi: Inst[] = [], head: Inst[] = [], hair: Inst[] = [], bun: Inst[] = [], sleeves: Inst[] = [], paras: Inst[] = [], sticks: Inst[] = [];
    for (const d of dolls) {
      const { x, y, z, ry } = d;
      body.push({ pos: [x, y, z], rotY: ry, color: d.col });
      obi.push({ pos: [x, y + 0.98, z], rotY: ry });
      head.push({ pos: [x, y + 1.5, z] });
      const bx2 = Math.sin(ry), bz2 = Math.cos(ry); // facing direction
      hair.push({ pos: [x - bx2 * 0.02, y + 1.54, z - bz2 * 0.02], scale: [1.05, 0.95, 1.05] });
      bun.push({ pos: [x - bx2 * 0.05, y + 1.67, z - bz2 * 0.05], scale: [1.3, 0.8, 1] , rotY: ry });
      for (const s of [-1, 1]) {
        const sx = Math.cos(ry) * s * 0.24, sz = -Math.sin(ry) * s * 0.24;
        sleeves.push({ pos: [x + sx, y + 0.95, z + sz], rotY: ry, color: d.col });
      }
      if (d.parasol) {
        const px = x + Math.cos(ry) * 0.22, pz = z - Math.sin(ry) * 0.22;
        paras.push({ pos: [px - bx2 * 0.1, y + 1.95, pz - bz2 * 0.1], rotX: -0.35 * bz2, rotZ: 0.35 * bx2 });
        sticks.push({ pos: [px, y + 1.4, pz], scale: [1, 1.2, 1] });
      }
      k.collider(x - 0.28, x + 0.28, z - 0.28, z + 0.28, y, y + 1.75, false);
    }
    const bodyG = new THREE.LatheGeometry([[0, 0], [0.22, 0], [0.225, 0.08], [0.2, 0.5], [0.185, 0.9], [0.19, 1.2], [0.15, 1.3], [0.07, 1.38], [0.04, 1.42]].map(([r, h]) => new THREE.Vector2(r, h)), 24);
    k.instances(bodyG, kimonoM, body);
    k.instances(new THREE.CylinderGeometry(0.195, 0.2, 0.2, 20), obiM, obi);
    k.instances(new THREE.SphereGeometry(0.1, 16, 12), skinM, head);
    k.instances(new THREE.SphereGeometry(0.11, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), hairM, hair);
    k.instances(new THREE.SphereGeometry(0.075, 12, 8), hairM, bun);
    k.instances(new THREE.BoxGeometry(0.1, 0.55, 0.3).translate(0, -0.05, 0), kimonoM, sleeves);
    if (paras.length) {
      k.instances(new THREE.LatheGeometry([[0.55, 0], [0.45, 0.07], [0.25, 0.14], [0.02, 0.18], [0, 0.185]].map(([r, h]) => new THREE.Vector2(r, h)), 24), parasolM, paras);
      k.instances(new THREE.CylinderGeometry(0.012, 0.012, 1, 6), darkWoodM, sticks);
    }
  }

  function maple(x: number, y: number, z: number, h: number, spread: number, orange: boolean, seed: number) {
    const r = rng(Math.abs(Math.round(seed * 7 + 11)));
    const list = orange ? clumpO : clumpR;
    const top = new THREE.Vector3(x + (r() - 0.5) * 0.3, y + h * 0.5, z + (r() - 0.5) * 0.3);
    const trunk = new THREE.CatmullRomCurve3([new THREE.Vector3(x, y, z), new THREE.Vector3(x + (r() - 0.5) * 0.3, y + h * 0.25, z + (r() - 0.5) * 0.3), top]);
    branchGeos.push(new THREE.TubeGeometry(trunk, 8, 0.06 + h * 0.02, 7));
    const nb = 5 + Math.floor(r() * 2);
    for (let b = 0; b < nb; b++) {
      const a = (b / nb) * Math.PI * 2 + r() * 0.7;
      const len = spread * (0.55 + r() * 0.4);
      const end = new THREE.Vector3(top.x + Math.cos(a) * len, top.y + h * (0.22 + r() * 0.2), top.z + Math.sin(a) * len);
      const mid = new THREE.Vector3((top.x + end.x) / 2, (top.y + end.y) / 2 + h * 0.08, (top.z + end.z) / 2);
      branchGeos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([top, mid, end]), 6, 0.03 + h * 0.008, 5));
      for (let c = 0; c < 2; c++) {
        const s = spread * (0.42 + r() * 0.2);
        list.push({ pos: [end.x + (r() - 0.5) * 0.5, end.y + c * 0.25 + 0.05, end.z + (r() - 0.5) * 0.5], scale: [s, s * (0.32 + r() * 0.12), s * 0.9], rotY: r() * 6.3, color: tint(r) });
      }
    }
    for (let c = 0; c < 3; c++) {
      const s = spread * (0.5 + r() * 0.2);
      list.push({ pos: [top.x + (r() - 0.5) * spread * 0.6, top.y + h * (0.45 + r() * 0.15), top.z + (r() - 0.5) * spread * 0.6], scale: [s, s * 0.34, s], rotY: r() * 6.3, color: tint(r) });
    }
    k.collider(x - 0.2, x + 0.2, z - 0.2, z + 0.2, y, y + h * 0.5, false);
  }
  function tint(r: () => number) {
    const v = 0.78 + r() * 0.22;
    const c = new THREE.Color(v, v * (0.85 + r() * 0.15), v * (0.85 + r() * 0.15));
    return `#${c.getHexString()}`;
  }
  /** ground-hugging maple bush mound */
  function mound(x: number, z: number, rad: number, hgt: number, orange: boolean) {
    const r = rng(Math.round(x * 31 + z * 17 + 400));
    const list = orange ? clumpO : clumpR;
    list.push({ pos: [x, hgt * 0.35, z], scale: [rad, hgt, rad * 0.95], rotY: r() * 6, color: tint(r) });
    for (let i = 0; i < 3; i++) list.push({ pos: [x + (r() - 0.5) * rad, hgt * 0.3, z + (r() - 0.5) * rad], scale: [rad * 0.6, hgt * 0.7, rad * 0.6], rotY: r() * 6, color: tint(r) });
    k.collider(x - rad * 0.8, x + rad * 0.8, z - rad * 0.8, z + rad * 0.8, 0, hgt * 1.2, true);
  }

  function bamboo(cx: number, cz: number, n: number, h: number, y0: number, rad: number, seed: number) {
    const r = rng(seed * 97 + 5);
    const v = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * rad;
      const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      const hh = h * (0.75 + r() * 0.35), rx = (r() - 0.5) * 0.08, rz = (r() - 0.5) * 0.08;
      const e = new THREE.Euler(rx, 0, rz);
      culms.push({ pos: [x, y0 + hh / 2, z], rotX: rx, rotZ: rz, scale: [1, hh, 1] });
      for (let yy = 0.35 + r() * 0.2; yy < hh - 0.1; yy += 0.42) {
        v.set(0, yy - hh / 2, 0).applyEuler(e);
        culmNodes.push({ pos: [x + v.x, y0 + hh / 2 + v.y, z + v.z], rotX: Math.PI / 2 + rx, rotY: 0, rotZ: rz });
      }
      for (let l = 0; l < 3; l++) {
        v.set(0, hh * (0.3 + r() * 0.2), 0).applyEuler(e);
        bLeaves.push({ pos: [x + v.x + (r() - 0.5) * 0.5, y0 + hh / 2 + v.y, z + v.z + (r() - 0.5) * 0.5], rotX: (r() - 0.5) * 1.4, rotY: r() * 6.3, rotZ: (r() - 0.5) * 0.8, scale: [0.8 + r() * 0.5, 0.8 + r() * 0.5, 1] });
      }
    }
    k.collider(cx - rad - 0.1, cx + rad + 0.1, cz - rad - 0.1, cz + rad + 0.1, y0, y0 + h * 0.8, false);
  }

  function rock(x: number, z: number, sx: number, sy: number, sz: number, seed: number) {
    const r = rng(seed * 13 + 1);
    const g = new THREE.DodecahedronGeometry(1, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const f = 0.85 + r() * 0.25; p.setXYZ(i, p.getX(i) * f, Math.max(-0.3, p.getY(i)) * f, p.getZ(i) * f); }
    g.computeVertexNormals();
    g.scale(sx, sy, sz);
    g.rotateY(r() * 6);
    put(stoneM, xf(g, x, sy * 0.25, z), 1.2);
    k.collider(x - sx * 0.85, x + sx * 0.85, z - sz * 0.85, z + sz * 0.85, 0, sy * 1.2, true);
  }

  function stoneLantern(x: number, z: number) {
    const pts: [number, number][] = [[0.34, 0], [0.34, 0.18], [0.14, 0.24], [0.1, 0.9], [0.3, 0.95], [0.3, 1.05]];
    put(stoneM, xf(new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), 12), x, 0, z), 0.8);
    bx(andonM, 0.34, 0.34, 0.34, x, 1.05, z);
    for (const [dx, dz] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]]) bx(stoneM, 0.08, 0.34, 0.08, x + dx, 1.05, z + dz);
    put(stoneM, xf(new THREE.ConeGeometry(0.48, 0.32, 6), x, 1.55, z), 0.8);
    sph(stoneM, 0.07, x, 1.76, z);
    k.collider(x - 0.35, x + 0.35, z - 0.35, z + 0.35, 0, 1.8, true);
  }

  function standee(x: number, z: number, s: number) {
    const sh = new THREE.Shape();
    sh.moveTo(-0.24, 0); sh.lineTo(0.24, 0); sh.lineTo(0.22, 0.95); sh.quadraticCurveTo(0.22, 1.25, 0.1, 1.3);
    sh.absarc(0, 1.45, 0.14, -0.9, Math.PI + 0.9, false);
    sh.quadraticCurveTo(-0.22, 1.25, -0.22, 0.95); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 1, curveSegments: 10 });
    g.scale(s, s, 1);
    put(standeeM, xf(g, x, 0.08, z, 0.1), 2.5);
    bx(standeeM, 0.5 * s, 0.08, 0.35, x, 0, z + 0.02, { round: true });
    k.collider(x - 0.28, x + 0.28, z - 0.2, z + 0.2, 0, 1.65 * s, false);
  }

  function manekiNeko(x: number, y: number, z: number) {
    put(porcelainM, xf(new THREE.LatheGeometry([[0, 0], [0.1, 0], [0.11, 0.05], [0.1, 0.14], [0.07, 0.2], [0, 0.21]].map(([a, b]) => new THREE.Vector2(a, b)), 16), x, y, z));
    sph(porcelainM, 0.09, x, y + 0.27, z, 1.05, 0.92, 1);
    for (const s of [-1, 1]) put(porcelainM, xf(new THREE.ConeGeometry(0.03, 0.06, 6), x + s * 0.055, y + 0.36, z));
    sph(porcelainM, 0.035, x + 0.08, y + 0.3, z + 0.03);
    put(redPaintM, xf(new THREE.TorusGeometry(0.075, 0.012, 6, 16), x, y + 0.19, z, 0, Math.PI / 2));
    sph(obiM, 0.018, x, y + 0.18, z + 0.08);
  }

  function planter(cx: number, cz: number, len: number) {
    bx(concreteM, len, 0.62, 1.1, cx, 0, cz, { unit: 1.5, solid: true });
    bx(concreteM, len + 0.12, 0.06, 1.22, cx, 0.62, cz, { unit: 1.5 });
    bx(soilM, len - 0.16, 0.04, 0.94, cx, 0.62, cz, { unit: 1.5 });
    const r = rng(Math.round(cx * 10 + 3));
    for (let x = cx - len / 2 + 0.45; x < cx + len / 2 - 0.3; x += 0.62) {
      const s = 0.3 + r() * 0.12;
      shrubs.push({ pos: [x + (r() - 0.5) * 0.15, 0.66 + s * 0.6, cz + (r() - 0.5) * 0.3], scale: [s, s * 0.85, s], rotY: r() * 6, color: r() < 0.3 ? "#9bb07a" : "#ffffff" });
    }
    k.collider(cx - len / 2, cx + len / 2, cz - 0.55, cz + 0.55, 0.62, 1.25, true);
  }

  function bench(x: number, z: number) {
    for (let i = 0; i < 4; i++) bx(lightWoodM, 1.8, 0.04, 0.09, x, 0.42, z - 0.17 + i * 0.113, { round: true });
    for (const s of [-1, 1]) bx(steelM, 0.06, 0.42, 0.44, x + s * 0.75, 0, z, { round: true });
    k.collider(x - 0.9, x + 0.9, z - 0.25, z + 0.25, 0, 0.46, true);
  }
}
