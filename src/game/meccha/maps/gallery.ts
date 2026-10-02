// Art Gallery (popular Steam Workshop map): a classic European picture gallery.
// Rotunda entrance with a Roman floor mosaic and sculpture niches → the barrel-vaulted Grand Gallery with huge
// canvases and a skylight strip → Portrait Hall (a row of gilded portraits on green damask) → the dim Lesser-Known
// Wing → Salon Rouge (salon hang, star portrait behind a velvet rope) → Sculpture Hall with arched niches.
import * as THREE from "three";
import * as X from "./tex/museum";
import * as GX from "./tex/gallery";
import { Art, type Side, type Style } from "./tex/museum";
import { Kit, type Mat, type World } from "./kit";
import { Life } from "./tex/life";

type Face = "+x" | "-x" | "+z" | "-z";

export function buildGallery(): World {
  const k = new Kit(6, 3.2);
  const a = new Art(k);
  const life = new Life(k, 8808);
  a.life = life; // readable title / artist labels under the paintings
  const R = X.rng(8808);
  const M = a.M.bind(a);
  const T = (key: string, make: () => X.PaintTex) => k.tex("ga_" + key, make);

  // ================= materials =================
  // shared neutral textures, tinted per material (fewer canvases + normal maps to build)
  const PL = k.tex("art_plasterN", () => X.plaster("#e9e9e9", 61, 0.075));
  const FB = k.tex("art_fabricN", () => X.fabric("#e2e2e2", 83, 0.11));
  const lit = (c: string) => `#${new THREE.Color(c).multiplyScalar(1.1).getHexString()}`;
  const fParq = M(T("parq", () => X.parquet("#94663c", "#7e5530", 21)), "#fff", 2.0, { roughness: 0.28, bump: 0.5 });
  const fMarble = M(T("marb", () => X.marbleTiles("#ece6da", "#a39a8a", 2, 31, "rgba(60,50,40,0.4)", "#2c2a28")), "#fff", 1.4, { roughness: 0.12, bump: 0.2 });
  const fStone = M(T("stonef", () => X.marbleTiles("#cfc6b6", "#a1968a", 2, 33, "rgba(70,60,45,0.45)", "#bdb3a2")), "#fff", 1.6, { roughness: 0.2, bump: 0.3 });
  const fDark = M(T("parqD", () => X.parquet("#4d3020", "#3c2416", 23)), "#fff", 2.0, { roughness: 0.3, bump: 0.5 });
  const mosaic = M(T("mosaic", GX.mosaic), "#fff", 0, { roughness: 0.35, bump: 0.5 });

  const wGal = M(PL, lit("#c9b99b"), 2.4, { roughness: 0.9, bump: 0.7 });
  const wRot = M(PL, lit("#e3dac8"), 2.4, { roughness: 0.9, bump: 0.6 });
  const wGreen = M(T("wGreen", () => GX.damask("#2f4a3a", "#3b5a47", 43)), "#fff", 0.9, { roughness: 0.8, bump: 0.35 });
  const wRed = M(T("wRed", () => GX.damask("#6e1c22", "#86282d", 44)), "#fff", 0.9, { roughness: 0.8, bump: 0.35 });
  const wDark = M(PL, lit("#23252b"), 2.4, { roughness: 0.9, bump: 0.4 });
  const wStone = M(PL, lit("#d4cab8"), 1.6, { roughness: 0.9, bump: 0.8 });
  const wOut = M(PL, lit("#b9ad98"), 3, { roughness: 0.9, bump: 0.4 });

  const tBase = M(null, "#2a211a", 0, { roughness: 0.4 });
  const tCrown = M(PL, lit("#efe6d2"), 1, { roughness: 0.6, bump: 0.2 });
  const tGoldCrown = M(null, "#b8923f", 0, { metalness: 0.9, roughness: 0.35 });
  const goldHigh = M(null, "#b8923f", 0, { metalness: 0.9, roughness: 0.35 });
  const brassHigh = M(null, "#c79a4a", 0, { metalness: 1, roughness: 0.3 });
  const tWains = M(T("wains", () => X.woodGrain("#5a3620", "#2e1a0c", 16)), "#fff", 1, { roughness: 0.45, bump: 0.5 });
  const ceil = M(PL, lit("#efe8da"), 3, { roughness: 0.9, bump: 0.2 });
  const ceilDark = M(null, "#1b1c20", 0, { roughness: 0.9 });
  const vault = M(T("coffer", () => GX.coffer("#ede3cf", "#b9a888", "#c9a24a")), "#fff", 0, { roughness: 0.7, bump: 0.6 });
  vault.m.side = THREE.DoubleSide;
  const skyFrame = M(null, "#3a3530", 0, { metalness: 0.5, roughness: 0.4 });
  const colShaft = M(T("flute", () => X.flutes("#e8dfcc")), "#fff", 0, { roughness: 0.45, bump: 0.9 });
  const colStone = M(PL, lit("#e5dccb"), 1, { roughness: 0.5, bump: 0.3 });
  const marble = a.stoneWhite;
  const bronze = M(null, "#5e4127", 0, { metalness: 0.9, roughness: 0.35 });
  const niche = M(PL, lit("#9c8f7a"), 1, { roughness: 0.9, bump: 0.4 });
  const green = M(FB, lit("#23452f"), 0.3, { roughness: 0.85, bump: 0.4 });
  const redV = a.velvet;
  const doorWood = M(T("doorW", () => X.woodGrain("#4a2c18", "#24140a", 17)), "#fff", 0.8, { roughness: 0.45, bump: 0.6 });
  const potM = M(null, "#6d5a3e", 0, { roughness: 0.5, metalness: 0.4 });
  const leaf = M(FB, lit("#3f6b2c"), 0.3, { roughness: 0.6, bump: 0.6 });
  const leaf2 = M(FB, lit("#2d5520"), 0.3, { roughness: 0.6, bump: 0.6 });

  const signMat = (key: string, bg: string, fg: string, text: string, w = 512, h = 128, font?: string) =>
    M(T("sign_" + key, () => X.sign(bg, fg, text, w, h, font)), "#fff", 0, { roughness: 0.5, bump: 0 });

  // ================= helpers =================
  const side = (m: Mat, top: number, o: Partial<Side> = {}): Side => ({ m, top, base: tBase, crown: tCrown, casing: doorWood, ...o });
  const OUT: Side = { m: wOut, top: 12 };
  const floor = (m: Mat, x1: number, x2: number, z1: number, z2: number) => a.box(m, x2 - x1, 0.2, z2 - z1, (x1 + x2) / 2, -0.2, (z1 + z2) / 2, { sharp: true });
  function hang(face: Face, wc: number, along: number, y: number, w: number, h: number, style: Style, o: { idx?: number; light?: boolean; label?: boolean; glow?: boolean; frame?: number } = {}, ceilY = 0) {
    const off = 0.15;
    let x = 0, z = 0, ry = 0, nx = 0, nz = 0;
    if (face === "+x") { x = wc + off; z = along; ry = Math.PI / 2; nx = 1; }
    else if (face === "-x") { x = wc - off; z = along; ry = -Math.PI / 2; nx = -1; }
    else if (face === "+z") { z = wc + off; x = along; nz = 1; }
    else { z = wc - off; x = along; ry = Math.PI; nz = -1; }
    a.painting(x, y, z, ry, w, h, style, o);
    if (ceilY > 0) a.spot(x + nx * 1.8, ceilY, z + nz * 1.8, x + nx * 0.05, y, z + nz * 0.05);
  }
  /** arched sculpture niche on a wall face with a statue inside (wall surface frame: facing +z) */
  function sculptureNiche(x: number, z: number, ry: number, kind: number) {
    a.at(x, 0, z, ry, () => {
      const w = 1.5, hh = 3.1, d = 0.45;
      // recess back + half dome
      a.box(niche, w, hh - w / 2, 0.04, 0, 0.5, 0.02, { sharp: true });
      a.put(niche, new THREE.SphereGeometry(w / 2, 20, 10, Math.PI / 2, Math.PI, 0, Math.PI / 2), 0, 0.5 + hh - w / 2, 0.02, { s: [1, 1, d / (w / 2)] });
      // arched surround (extruded arch frame)
      const sh = new THREE.Shape();
      const o = w / 2 + 0.22;
      sh.moveTo(-o, 0); sh.lineTo(o, 0); sh.lineTo(o, hh - w / 2); sh.absarc(0, hh - w / 2, o, 0, Math.PI, false); sh.lineTo(-o, 0);
      const hole = new THREE.Path();
      const i = w / 2;
      hole.moveTo(-i, 0); hole.lineTo(-i, hh - w / 2); hole.absarc(0, hh - w / 2, i, Math.PI, 0, true); hole.lineTo(i, 0); hole.lineTo(-i, 0);
      sh.holes.push(hole);
      const geo = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2, curveSegments: 20 });
      a.put(colStone, geo, 0, 0.5, 0.03);
      // side walls of the recess
      for (const s of [-1, 1]) a.box(niche, 0.04, hh - w / 2, d, s * (w / 2 - 0.02), 0.5, d / 2 + 0.03, { sharp: true });
      // plinth/sill
      a.box(colStone, w + 0.6, 0.5, d + 0.25, 0, 0, (d + 0.25) / 2, {});
      a.box(colStone, w + 0.7, 0.06, d + 0.32, 0, 0.5, (d + 0.32) / 2, {});
      statue(0, 0.56, d * 0.5 + 0.05, kind);
    });
    const c = Math.abs(Math.cos(ry)) > 0.5;
    const sx = Math.sin(ry), sz = Math.cos(ry);
    const cx = x + sx * 0.4, cz = z + sz * 0.4;
    if (c) a.col(cx - 1.1, cx + 1.1, cz - 0.4, cz + 0.4, 0, 0.56, true);
    else a.col(cx - 0.4, cx + 0.4, cz - 1.1, cz + 1.1, 0, 0.56, true);
  }
  /** a classical statue (local frame, y = bottom) */
  function statue(x: number, y: number, z: number, kind: number, m: Mat = marble, s = 1) {
    const L = (pts: [number, number][]) => a.lathe(m, pts.map(([r, h]) => [r * s, h * s] as [number, number]), x, y, z, 24);
    a.cyl(m, 0.28 * s, 0.3 * s, 0.1 * s, x, y, z, 24);
    const b = y + 0.1 * s;
    if (kind % 4 === 0) {
      // standing robed figure
      a.lathe(m, [[0.001, 0], [0.26, 0], [0.24, 0.5], [0.2, 0.9], [0.18, 1.1], [0.2, 1.3], [0.16, 1.45], [0.07, 1.52], [0.001, 1.53]].map(([r, h]) => [r * s, h * s] as [number, number]), x, b, z, 24);
      a.sph(m, 0.11 * s, x, b + 1.64 * s, z, { s: [0.9, 1.15, 1] });
      a.put(m, new THREE.CapsuleGeometry(0.045 * s, 0.5 * s, 4, 8), x + 0.2 * s, b + 1.2 * s, z + 0.05, { rz: 0.3 });
      a.put(m, new THREE.CapsuleGeometry(0.045 * s, 0.45 * s, 4, 8), x - 0.2 * s, b + 1.35 * s, z + 0.08, { rz: -0.9 });
    } else if (kind % 4 === 1) {
      // Venus torso on a column
      L([[0.001, 0], [0.12, 0], [0.12, 0.8], [0.2, 0.85], [0.23, 1.05], [0.18, 1.3], [0.2, 1.5], [0.12, 1.62], [0.06, 1.66], [0.05, 1.72], [0.001, 1.73]]);
      a.sph(m, 0.1 * s, x, b + 1.82 * s, z, { s: [0.9, 1.15, 1] });
    } else if (kind % 4 === 2) {
      // amphora
      L([[0.001, 0], [0.1, 0], [0.12, 0.08], [0.3, 0.5], [0.34, 0.8], [0.24, 1.15], [0.11, 1.28], [0.1, 1.42], [0.16, 1.47], [0.001, 1.47]]);
      a.torus(m, 0.12 * s, 0.02 * s, x + 0.17 * s, b + 1.27 * s, z, { ry: 0 }, Math.PI, 12);
      a.torus(m, 0.12 * s, 0.02 * s, x - 0.17 * s, b + 1.27 * s, z, { ry: 0 }, Math.PI, 12);
    } else {
      // bust on a herm pillar
      a.box(m, 0.3 * s, 1.2 * s, 0.3 * s, x, b, z);
      L([[0.001, 1.2], [0.16, 1.2], [0.26, 1.35], [0.28, 1.5], [0.2, 1.58], [0.07, 1.62], [0.07, 1.68], [0.001, 1.69]]);
      a.sph(m, 0.13 * s, x, b + 1.82 * s, z, { s: [0.9, 1.15, 1] });
    }
  }
  /** ottoman / tufted bench */
  function ottoman(x: number, z: number, L: number, W: number, ry: number, fabric: Mat) {
    a.at(x, 0, z, ry, () => {
      a.box(fabric, L, 0.28, W, 0, 0.14, 0);
      a.box(tWains, L + 0.06, 0.1, W + 0.06, 0, 0.06, 0);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) a.lathe(tWains, [[0.04, 0], [0.05, 0.03], [0.035, 0.06]], sx * (L / 2 - 0.08), 0, sz * (W / 2 - 0.08), 10);
      for (let i = 0; i < Math.floor(L / 0.35); i++) for (let j = 0; j < Math.max(1, Math.floor(W / 0.35)); j++)
        a.sph(tGoldCrown, 0.015, -L / 2 + 0.2 + i * 0.35, 0.42, -W / 2 + 0.2 + j * 0.35, {}, 6, 4);
    });
    const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry));
    const hx = (L / 2) * c + (W / 2) * s + 0.03, hz = (L / 2) * s + (W / 2) * c + 0.03;
    a.col(x - hx, x + hx, z - hz, z + hz, 0, 0.42, true);
  }

  // ================= floors =================
  floor(fParq, -20, 20, -6, 6);
  floor(fMarble, -8, 8, 6, 18);
  a.plane(mosaic, 9, 9, 0, 0.004, 12, { rx: -Math.PI / 2 });
  floor(fParq, -20, -8, 6, 18);
  floor(fDark, 8, 20, 6, 18);
  floor(fParq, -20, 0, -18, -6);
  floor(fStone, 0, 20, -18, -6);

  // ================= walls =================
  const sGal = side(wGal, 6, { wains: tWains, wainsH: 1.0, crown: tGoldCrown });
  const sRot = side(wRot, 7);
  const sPort = side(wGreen, 6, { wains: tWains, wainsH: 0.95 });
  const sDark = side(wDark, 5.2, { crown: ceilDark });
  const sSalon = side(wRed, 6.5, { wains: tWains, wainsH: 0.9, crown: tGoldCrown });
  const sSculp = side(wStone, 6.5);
  // exterior
  a.wallX(18, -20, -8, [], sPort, OUT, 7);
  a.wallX(18, -8, 8, [[0, 2.8, 3.8]], sRot, OUT, 7.5);
  a.wallX(18, 8, 20, [], sDark, OUT, 7);
  a.wallX(-18, -20, 0, [], OUT, sSalon, 7);
  a.wallX(-18, 0, 20, [], OUT, sSculp, 7);
  a.wallZ(-20, -18, -6, [], OUT, sSalon, 7);
  a.wallZ(-20, -6, 6, [], OUT, side(wGal, 12, { wains: tWains, wainsH: 1.0, crown: tGoldCrown }), 12);
  a.wallZ(-20, 6, 18, [], OUT, sPort, 7);
  a.wallZ(20, -18, -6, [], sSculp, OUT, 7);
  a.wallZ(20, -6, 6, [], side(wGal, 12, { wains: tWains, wainsH: 1.0, crown: tGoldCrown }), OUT, 12);
  a.wallZ(20, 6, 18, [], sDark, OUT, 7);
  // interior
  a.wallX(6, -20, -8, [[-14, 3, 3.4]], sGal, sPort, 7);
  a.wallX(6, -8, 8, [[0, 4, 4.2]], sGal, sRot, 7.5);
  a.wallX(6, 8, 20, [[14, 3, 3.4]], sGal, sDark, 7);
  a.wallX(-6, -20, 0, [[-10, 3, 3.6]], sSalon, sGal, 7);
  a.wallX(-6, 0, 20, [[10, 3, 3.6]], sSculp, sGal, 7);
  a.wallZ(-8, 6, 18, [[12, 2.6, 3.2]], sPort, sRot, 7.5);
  a.wallZ(8, 6, 18, [[12, 2.6, 3.2]], sRot, sDark, 7.5);
  a.wallZ(0, -18, -6, [[-12, 3, 3.4]], sSalon, sSculp, 7);

  // ================= ceilings =================
  // Grand Gallery: coffered barrel vault with a skylight strip at the crown
  {
    const r = 6, g = Math.asin(1.6 / r), len = 40;
    const s1 = new THREE.CylinderGeometry(r, r, len, 18, 1, true, 0, Math.PI / 2 - g);
    const s2 = new THREE.CylinderGeometry(r, r, len, 18, 1, true, Math.PI / 2 + g, Math.PI / 2 - g);
    const ncof = Math.round((r * (Math.PI / 2 - g)) / 1.5);
    a.put(vault, s1, 0, 6, 0, { rz: Math.PI / 2, uv: [0, 0, ncof, 26] });
    a.put(vault, s2, 0, 6, 0, { rz: Math.PI / 2, uv: [0, 0, ncof, 26] });
    // ribs (transverse arches) + cornice
    for (let x = -18; x <= 18; x += 4) {
      a.put(tCrown, new THREE.TorusGeometry(r - 0.05, 0.12, 6, 24, Math.PI / 2 - g), x, 6, 0, { ry: Math.PI / 2 });
      a.put(tCrown, new THREE.TorusGeometry(r - 0.05, 0.12, 6, 24, Math.PI / 2 - g), x, 6, 0, { ry: Math.PI / 2, rz: Math.PI / 2 + g, s: [1, 1, 1] });
    }
    const yTop = 6 + Math.sqrt(r * r - 1.6 * 1.6);
    a.box(a.glass, len, 0.02, 3.3, 0, yTop + 0.3, 0, { sharp: true });
    for (const s of [-1, 1]) a.box(ceil, len, 0.4, 0.2, 0, yTop - 0.1, s * 1.7, { sharp: true });
    for (let x = -19; x <= 19; x += 2) a.box(skyFrame, 0.08, 0.12, 3.3, x, yTop + 0.18, 0, { sharp: true });
    a.box(skyFrame, len, 0.12, 0.08, 0, yTop + 0.18, 0, { sharp: true });
    // roof caps over the vault haunches so no sky leaks
    for (const s of [-1, 1]) a.box(ceil, len, 0.2, 4.6, 0, yTop + 0.35, s * 4.1, { sharp: true });
  }
  // Rotunda: oculus lantern over the mosaic
  const oc: [number, number, number, number] = [-2.5, 2.5, 9.5, 14.5];
  a.slab(ceil, -8, 8, 6, 18, 7.5, [oc]);
  a.skylight(...oc, 7.8, ceil, skyFrame, 1.2, 4, 4);
  a.box(goldHigh, 5.4, 0.1, 5.4, 0, 7.4, 12, { sharp: true });
  for (const z of [6.35, 17.65]) a.box(tCrown, 16, 0.35, 0.4, 0, 7.15, z, { sharp: true });
  a.slab(ceil, -20, -8, 6, 18, 6, [[-17, -11, 10, 14]]);
  a.skylight(-17, -11, 10, 14, 6.3, ceil, skyFrame, 0.7, 3, 2);
  a.slab(ceilDark, 8, 20, 6, 18, 5.2);
  a.slab(ceil, -20, 0, -18, -6, 6.5, [[-14, -6, -14, -10]]);
  a.skylight(-14, -6, -14, -10, 6.8, ceil, skyFrame, 0.8, 4, 2);
  a.slab(ceil, 0, 20, -18, -6, 6.5, [[4, 16, -13.5, -10.5]]);
  a.skylight(4, 16, -13.5, -10.5, 6.8, ceil, skyFrame, 0.8, 6, 2);

  // ================= Grand Gallery =================
  {
    // huge canvases on the north wall (burial / apostles scale)
    hang("+z", -6, 0, 3.2, 7.0, 4.28, "gold", { idx: 8, light: true, label: false, frame: 0.38 });
    hang("+z", -6, -15.8, 3.0, 5.4, 3.8, "gold", { label: false, frame: 0.34 });
    hang("+z", -6, 15.8, 3.0, 5.4, 3.8, "gold", { label: false, frame: 0.34 });
    hang("-z", 6, -7.2, 3.1, 6.2, 4.0, "gold", { light: true, label: false, frame: 0.36 });
    hang("-z", 6, 7.2, 3.1, 6.2, 4.0, "gold", { light: true, label: false, frame: 0.36 });
    hang("-z", 6, -17.8, 3.0, 3.2, 2.4, "dark", { label: false });
    hang("-z", 6, 17.8, 3.0, 3.2, 2.4, "dark", { label: false });
    // end walls under the vault: napoleon-scale vertical canvases
    hang("+x", -20, 0, 4.4, 3.8, 5.2, "gold", { idx: 7, frame: 0.4, label: false });
    hang("-x", 20, 0, 4.4, 3.8, 5.2, "gold", { idx: 19, frame: 0.4, label: false });
    // pilasters between paintings on both long walls
    for (const x of [-11.5, 11.5, -3.6, 3.6]) for (const s of [-1, 1]) {
      if (s > 0 && Math.abs(x) < 4) continue;
      a.box(colStone, 0.7, 6, 0.18, x, 0, s * 5.76, { sharp: true });
      a.box(colStone, 0.9, 0.3, 0.26, x, 0, s * 5.72, {});
      a.box(tGoldCrown, 0.86, 0.22, 0.24, x, 5.55, s * 5.72, {});
    }
    // benches, busts on plinths and ropes
    for (const x of [-12.5, 12.5]) ottoman(x, 0, 2.6, 0.9, 0, redV);
    for (const x of [-17, -9.6, 9.6, 17]) {
      const t = a.plinth(x, 0, 0.6, 1.15, 0.6, colStone);
      statue(x, t, 0, 3, bronze, 0.55);
    }
    a.ropeLine([[-3.8, -4.4], [-1.3, -4.2], [1.3, -4.2], [3.8, -4.4]]);
    for (const x of [-19, 19]) a.plant(x, x < 0 ? -5 : 5, 1.1, potM, leaf, leaf2);
    for (const x of [-19, 19]) a.plant(x, x < 0 ? 5 : -5, 1.1, potM, leaf, leaf2);
    // chandeliers hanging from the vault
    for (const x of [-12, 0, 12]) {
      a.cyl(brassHigh, 0.012, 0.012, 3.6, x, 8.0, 3.0, 6);
      a.lathe(brassHigh, [[0.001, 0], [0.1, 0.02], [0.5, 0.14], [0.55, 0.2], [0.08, 0.3], [0.04, 0.6], [0.001, 0.62]], x, 7.4, 3.0, 20);
      for (let i = 0; i < 8; i++) {
        const an = (i / 8) * Math.PI * 2;
        a.cyl(a.ceilLens, 0.02, 0.02, 0.12, x + Math.cos(an) * 0.52, 7.62, 3.0 + Math.sin(an) * 0.52, 6);
      }
    }
    const title = signMat("title", "#2a2320", "#d9c08a", "GRANDE GALERIE", 512, 96, "bold 56px Georgia, serif");
    a.plane(title, 2.8, 0.52, 0, 4.9, 5.83, { ry: Math.PI });
  }

  // ================= Rotunda (entrance) =================
  {
    // grand entrance door on the south wall (closed double door)
    a.box(doorWood, 2.7, 3.7, 0.12, 0, 0, 17.8, { sharp: true });
    for (const s of [-1, 1]) {
      for (const yy of [0.5, 2.0]) a.box(doorWood, 1.0, 1.2, 0.05, s * 0.66, yy, 17.72);
      a.box(a.brass, 0.05, 0.4, 0.06, s * 0.1, 1.4, 17.7);
    }
    a.box(colStone, 3.6, 0.5, 0.35, 0, 3.8, 17.8, {});
    a.box(colStone, 0.45, 3.8, 0.3, -1.6, 0, 17.8, {});
    a.box(colStone, 0.45, 3.8, 0.3, 1.6, 0, 17.8, {});
    // niches with statues
    sculptureNiche(-4.6, 17.85, Math.PI, 0);
    sculptureNiche(4.6, 17.85, Math.PI, 1);
    sculptureNiche(-7.85, 8.6, Math.PI / 2, 2);
    sculptureNiche(-7.85, 15.4, Math.PI / 2, 3);
    sculptureNiche(7.85, 8.6, -Math.PI / 2, 1);
    sculptureNiche(7.85, 15.4, -Math.PI / 2, 0);
    // columns framing the mosaic
    for (const [x, z] of [[-5.2, 7.9], [5.2, 7.9], [-5.2, 16.1], [5.2, 16.1]] as const) a.column(x, z, 7.5, 0.34, colShaft, colStone);
    // stanchions round the mosaic (east + west arcs, open towards the doors)
    for (const s0 of [-1, 1]) {
      const pts: [number, number][] = [];
      for (let i = -2; i <= 2; i++) {
        const an = (i * Math.PI) / 7;
        pts.push([s0 * Math.cos(an) * 4.8, 12 + Math.sin(an) * 4.8]);
      }
      a.ropeLine(pts);
    }
    const info = signMat("welcome", "#2a2320", "#d9c08a", "ART GALLERY", 512, 110, "bold 76px Georgia, serif");
    a.plane(info, 3.2, 0.7, 0, 5.2, 17.64, { ry: Math.PI });
  }

  // ================= Portrait Hall =================
  {
    for (let i = 0; i < 5; i++) hang("+x", -20, 7.8 + i * 2.1, 2.3, 1.1, 1.45, "gold", { label: i % 2 === 0, light: true }, 6);
    for (let i = 0; i < 4; i++) hang("-z", 18, -18.3 + i * 2.8, 2.3, 1.2, 1.55, "gold", { light: true, label: false }, 6);
    hang("-x", -8, 8.4, 2.3, 1.2, 1.55, "gold", { label: false }, 6);
    hang("-x", -8, 15.8, 2.3, 1.2, 1.55, "gold", { label: false }, 6);
    hang("+z", 6, -17.8, 2.3, 1.3, 1.6, "gold", { label: false }, 6);
    hang("+z", 6, -10.2, 2.3, 1.3, 1.6, "gold", { label: false }, 6);
    ottoman(-14, 12, 4.4, 1.0, Math.PI / 2, green);
    for (const z of [8.2, 15.8]) { const t = a.plinth(-10.5, z, 0.5, 1.1, 0.5, colStone); statue(-10.5, t, z, 3, marble, 0.5); }
    a.plant(-19, 17, 1.0, potM, leaf, leaf2);
  }

  // ================= Lesser-Known Wing (dark) =================
  {
    const hangD = (face: Face, wc: number, along: number, idx: number, w: number, h: number) => {
      hang(face, wc, along, 2.1, w, h, "dark", { idx, light: true, label: false }, 5.2);
    };
    hangD("-x", 20, 9.5, 6, 2.4, 1.8);
    hangD("-x", 20, 14.8, 15, 2.4, 1.8);
    hangD("-z", 18, 11, 0, 2.0, 1.6);
    hangD("-z", 18, 16.5, 4, 1.4, 1.8);
    hangD("+x", 8, 8.6, 7, 1.1, 1.4);
    hangD("+x", 8, 15.6, 18, 1.4, 1.1);
    hangD("+z", 6, 10.2, 12, 1.4, 1.1);
    hangD("+z", 6, 17.8, 16, 1.4, 1.1);
    ottoman(14, 12, 2.4, 0.8, 0, M(FB, lit("#2c2440"), 0.3, { roughness: 0.85, bump: 0.4 }));
    for (const [x, z] of [[10.5, 16.8], [18.8, 7.4]] as const) {
      const t = a.plinth(x, z, 0.55, 1.0, 0.55, M(null, "#303036", 0, { roughness: 0.5 }));
      statue(x, t, z, 2, bronze, 0.5);
    }
    // a covered crate and an easel (the wing looks under re-hang)
    a.box(M(T("crate", () => X.woodGrain("#a7875c", "#6e5436", 56)), "#fff", 0.6, { roughness: 0.8, bump: 0.8 }), 1.6, 1.2, 0.5, 11.5, 0, 7.2, { solid: true });
    a.box(M(FB, lit("#bdb6a8"), 0.4, { roughness: 0.95, bump: 0.6 }), 1.7, 0.08, 0.6, 11.5, 1.2, 7.2);
  }

  // ================= Salon Rouge =================
  {
    // salon hang: stacked gilded frames
    const rows: [number, number][] = [[1.9, 1.3], [3.6, 1.1], [5.1, 0.85]];
    for (const [cx, span] of [[-15.2, 8.4], [-3.8, 6.2]] as const) {
      let n = 0;
      for (const [y, hgt] of rows) {
        const cnt = y > 3 ? 3 : 2;
        for (let i = 0; i < cnt; i++) {
          const w = (span / cnt) * 0.72;
          hang("+z", -18, cx - span / 2 + (span / cnt) * (i + 0.5), y, w, hgt, n % 3 === 1 ? "dark" : "gold", { label: false, glow: y < 3 });
          n++;
        }
      }
    }
    // west & east walls
    hang("+x", -20, -12, 2.8, 3.2, 2.4, "gold", { light: true }, 6.5);
    hang("+x", -20, -8, 5.0, 1.2, 0.9, "gold", { label: false, glow: false });
    hang("+x", -20, -16, 5.0, 1.2, 0.9, "gold", { label: false, glow: false });
    hang("-x", 0, -8.3, 2.4, 1.6, 1.2, "gold", { label: false }, 6.5);
    hang("-x", 0, -16.1, 2.4, 1.6, 1.2, "gold", { label: false }, 6.5);
    hang("-z", -6, -16.2, 2.5, 2.6, 1.9, "gold", {}, 6.5);
    hang("-z", -6, -4.2, 2.5, 2.6, 1.9, "gold", {}, 6.5);
    // star portrait on a free-standing wall behind a rope (like the Mona Lisa)
    const sx = -10, sz = -13.3;
    a.box(wDark, 3.0, 3.4, 0.35, sx, 0, sz, { sharp: true, solid: true, stand: true });
    a.box(tGoldCrown, 3.06, 0.08, 0.4, sx, 3.4, sz);
    a.box(tBase, 3.04, 0.14, 0.39, sx, 0, sz, { sharp: true });
    a.painting(sx, 1.85, sz + 0.175, 0, 0.8, 1.08, "gold", { idx: 13, light: true, label: false, frame: 0.2 });
    a.box(a.glass, 1.4, 1.6, 0.06, sx, 1.05, sz + 0.34, { sharp: true });
    a.ropeLine([[sx - 2.3, sz + 0.9], [sx, sz + 2.5], [sx + 2.3, sz + 0.9]]);
    a.painting(sx, 1.9, sz - 0.175, Math.PI, 2.2, 1.6, "dark", {});
    ottoman(-10, -8.2, 3.0, 0.9, 0, redV);
    // round ottoman with a palm
    a.cyl(redV, 1.0, 1.0, 0.42, -16, 0, -9.3, 32);
    a.cyl(tWains, 1.04, 1.04, 0.08, -16, 0, -9.3, 32);
    a.cyl(redV, 0.35, 0.45, 0.7, -16, 0.42, -9.3, 24);
    a.col(-17, -15, -10.3, -8.3, 0, 0.42, true);
    a.col(-16.45, -15.55, -9.75, -8.85, 0, 1.12, true);
    a.plant(-16, -9.3, 0.8, potM, leaf, leaf2);
  }

  // ================= Sculpture Hall =================
  {
    sculptureNiche(4.5, -17.85, 0, 0);
    sculptureNiche(10, -17.85, 0, 1);
    sculptureNiche(15.5, -17.85, 0, 2);
    sculptureNiche(19.85, -12, -Math.PI / 2, 3);
    sculptureNiche(0.15, -16.2, Math.PI / 2, 1);
    // big central group on a drum
    const t = a.drum(10, -12, 1.3, 0.8, colStone);
    statue(10, t, -12, 0, marble, 1.25);
    a.col(9.5, 10.5, -12.5, -11.5, t, t + 2.3, true);
    for (const [x, z, kk] of [[4.5, -9, 2], [15.5, -9, 1], [4.5, -14.6, 3], [15.5, -14.6, 0]] as const) {
      const tt = a.plinth(x, z, 0.8, 0.7, 0.8, colStone);
      statue(x, tt, z, kk, kk % 2 ? bronze : marble, 0.75);
    }
    for (const x of [7, 13]) a.bench(x, -7.8, 0, 2.0);
    a.ropeLine([[8.2, -10.0], [10, -9.6], [11.8, -10.0]]);
    hang("-x", 20, -8.2, 2.6, 1.8, 1.4, "bronze", { label: false }, 6.5);
    hang("-x", 20, -15.8, 2.6, 1.6, 1.3, "bronze", { label: false }, 6.5);
    for (const x of [2.2, 17.8]) a.column(x, -7.2, 6.5, 0.3, colShaft, colStone);
  }

  // ================= extra density =================
  {
    const vaseA = M(null, "#1f3d6b", 0, { roughness: 0.15 });
    const vaseB = M(null, "#e9e4d8", 0, { roughness: 0.2 });
    const vases = [vaseA, vaseB, bronze];
    const vase = (x: number, z: number, i: number, h = 1.0) => {
      const t = a.plinth(x, z, 0.5, h, 0.5, colStone);
      const pr: [number, number][][] = [
        [[0.001, 0], [0.09, 0], [0.16, 0.12], [0.2, 0.3], [0.14, 0.46], [0.06, 0.54], [0.08, 0.62], [0.001, 0.62]],
        [[0.001, 0], [0.1, 0], [0.12, 0.05], [0.18, 0.2], [0.18, 0.3], [0.1, 0.4], [0.05, 0.62], [0.07, 0.68], [0.001, 0.68]],
        [[0.001, 0], [0.12, 0], [0.2, 0.08], [0.22, 0.18], [0.16, 0.28], [0.18, 0.32], [0.001, 0.32]],
      ];
      a.lathe(vases[i % 3], pr[i % 3], x, t, z, 24);
    };
    // Grand Gallery: busts and vases along the walls
    let n = 0;
    for (const x of [-11, -6.5, 6.5, 11]) { const t = a.plinth(x, -4.8, 0.5, 1.1, 0.5, colStone); statue(x, t, -4.8, 3, n++ % 2 ? marble : bronze, 0.45); }
    for (const x of [-10.5, -4.5, 4.5, 10.5]) vase(x, 4.8, n++);
    a.ropeLine([[-10.2, 4.0], [-7.2, 4.2], [-4.2, 4.0]]);
    a.ropeLine([[4.2, 4.0], [7.2, 4.2], [10.2, 4.0]]);
    // copyist's easel in the gallery
    {
      const ex = -16.5, ez = 2.6;
      a.tube(doorWood, [[ex - 0.4, 0, ez + 0.3], [ex - 0.2, 1.8, ez]], 0.022, 4, 6);
      a.tube(doorWood, [[ex + 0.4, 0, ez + 0.3], [ex + 0.2, 1.8, ez]], 0.022, 4, 6);
      a.tube(doorWood, [[ex, 0, ez - 0.5], [ex, 1.7, ez]], 0.022, 4, 6);
      a.box(doorWood, 0.9, 0.04, 0.1, ex, 0.75, ez + 0.2);
      a.painting(ex, 1.3, ez + 0.2, 0, 0.8, 0.62, "black", { label: false, frame: 0.03 });
      a.col(ex - 0.45, ex + 0.45, ez - 0.5, ez + 0.4, 0, 1.8, false);
    }
    // guard chairs
    const chair = (x: number, z: number, ry: number, seat: Mat) => {
      a.at(x, 0, z, ry, () => {
        a.box(seat, 0.5, 0.08, 0.5, 0, 0.42, 0);
        a.box(seat, 0.5, 0.5, 0.07, 0, 0.5, -0.22);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) a.cyl(doorWood, 0.022, 0.02, 0.42, sx * 0.21, 0, sz * 0.21, 8);
        a.box(doorWood, 0.54, 0.05, 0.08, 0, 1.0, -0.23);
      });
      a.col(x - 0.3, x + 0.3, z - 0.3, z + 0.3, 0, 0.5, true);
    };
    chair(-19.2, -1.8, Math.PI / 2, redV);
    chair(19.2, 1.8, -Math.PI / 2, redV);
    chair(-1.2, -17.2, 0, redV);
    chair(7.4, 17.2, Math.PI, green);
    // Portrait Hall: writing desk with globe + armchairs
    {
      const dx = -17.5, dz = 16.6;
      a.box(doorWood, 1.4, 0.06, 0.7, dx, 0.74, dz);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) a.lathe(doorWood, [[0.03, 0], [0.04, 0.1], [0.025, 0.4], [0.035, 0.7], [0.03, 0.74]], dx + sx * 0.62, 0, dz + sz * 0.28, 10);
      a.box(doorWood, 1.3, 0.14, 0.02, dx, 0.6, dz + 0.33, { sharp: true });
      a.col(dx - 0.72, dx + 0.72, dz - 0.37, dz + 0.37, 0, 0.8, true);
      a.lathe(a.brass, [[0.001, 0], [0.1, 0], [0.03, 0.04], [0.02, 0.12], [0.001, 0.12]], dx + 0.4, 0.8, dz, 14);
      a.sph(M(null, "#8a7446", 0, { roughness: 0.5 }), 0.16, dx + 0.4, 1.08, dz, {}, 20, 14);
      a.torus(a.brass, 0.18, 0.008, dx + 0.4, 1.08, dz, { ry: 0.4 });
      a.box(M(null, "#e8dfc8", 0, { roughness: 0.8 }), 0.3, 0.02, 0.22, dx - 0.3, 0.8, dz, { ry: 0.2, sharp: true });
      chair(dx, dz - 0.8, Math.PI, green);
      const arm = (x: number, z: number, ry: number) => {
        a.at(x, 0, z, ry, () => {
          a.box(green, 0.8, 0.18, 0.75, 0, 0.26, 0);
          a.box(green, 0.8, 0.55, 0.16, 0, 0.44, -0.3);
          for (const sx of [-1, 1]) a.box(green, 0.14, 0.28, 0.75, sx * 0.36, 0.44, 0);
          a.box(doorWood, 0.84, 0.14, 0.78, 0, 0.12, 0);
          for (const sx of [-1, 1]) for (const sz of [-1, 1]) a.cyl(doorWood, 0.03, 0.02, 0.12, sx * 0.34, 0, sz * 0.32, 8);
        });
        a.col(x - 0.45, x + 0.45, z - 0.45, z + 0.45, 0, 0.72, true);
      };
      arm(-10.6, 12.0 - 1.4, -Math.PI / 2 - 0.3);
      arm(-10.6, 12.0 + 1.4, -Math.PI / 2 + 0.3);
      vase(-19.2, 6.9, 1, 1.0);
    }
    // Lesser-Known Wing: frames waiting to be hung, crates
    {
      const crate = M(PL, lit("#a7875c"), 0.8, { roughness: 0.85, bump: 0.8 });
      a.box(crate, 1.2, 0.9, 0.9, 18.6, 0, 16.6, { solid: true });
      a.box(crate, 0.9, 0.6, 0.7, 18.6, 0.9, 16.6, { solid: true });
      a.box(crate, 2.2, 1.6, 0.3, 14.5, 0, 17.4, { solid: true });
      vase(9.2, 11.0 - 1.9, 2, 0.9);
    }
    // Salon Rouge: more seating + vases
    ottoman(-4.5, -10.5, 2.4, 0.9, Math.PI / 2, redV);
    vase(-19.2, -6.9, 0); vase(-0.9, -6.9, 1); vase(-19.2, -17.1, 2);
    // Sculpture Hall: extra small statues
    for (const [x, z, kk] of [[18.6, -17.0, 2], [1.4, -17.0, 3]] as const) {
      const t = a.plinth(x, z, 0.6, 0.6, 0.6, colStone);
      statue(x, t, z, kk, marble, 0.6);
    }
    for (const x of [-6, 6]) a.plant(x, 17.1, 1.0, potM, leaf, leaf2);
  }

  // ================= LIFE: gallery signs, visitor notes =================
  {
    const L = (id: number, x: number, y: number, z: number, w: number, ry: number, tilt = 0) => life.wall(id, x, y, z, w, ry, tilt);
    L(life.plate({ text: "FOUNDED 1894", sub: "by the Kodner family - admission free", style: "brass", px: [360, 110] }), 0, 4.55, 17.64, 1.2, Math.PI);
    L(life.poster({ title: "VISITOR RULES", body: "1. Do not touch the paintings.\n2. No flash photography.\n3. No hiding behind the statues\n   (we are looking at you, Tom Kodner).\n4. Please whisper.", bg: "#f5f1e8", fg: "#2a2420", accent: "#8a6428", style: "notice", wear: 0.05 }), -2.6, 1.7, 17.64, 0.55, Math.PI);
    L(life.label({ text: "WET PAINT", sub: "restoration in progress", bg: "#fff4c8", fg: "#8a1a1a", border: "#8a1a1a", px: [256, 110], wear: 0.2 }), 2.6, 1.3, 17.64, 0.44, Math.PI, 0.03);
    L(life.label({ text: "SALON ROUGE", sub: "18th-century salon hang \u2192", bg: "#2a2320", fg: "#d9c08a", border: "#d9c08a", px: [320, 110] }), -10, 3.95, -5.83, 0.9, 0);
    L(life.label({ text: "SCULPTURE HALL", sub: "marble & bronze \u2192", bg: "#2a2320", fg: "#d9c08a", border: "#d9c08a", px: [320, 110] }), 10, 3.95, -5.83, 0.9, 0);
    L(life.note({ text: "Tom - the Vermeer label is upside down. Fix before Monday! - curator", color: "#fff27a", tape: true }), 7.84, 1.45, 10.2, 0.14, -Math.PI / 2, 0.08);
  }
  life.finish();
  a.flush();

  // ================= spawns / rooms =================
  const hunterSpawns: THREE.Vector3[] = [];
  for (let i = 0; i < 9; i++) hunterSpawns.push(new THREE.Vector3(-1.3 + (i % 3) * 1.3, 0, 14.4 + Math.floor(i / 3) * 1.1));
  const hiderSpawns: THREE.Vector3[] = [];
  for (let i = 0; i < 24; i++) hiderSpawns.push(new THREE.Vector3(-7.7 + (i % 8) * 2.2, 0, -1.6 + Math.floor(i / 8) * 1.6));
  k.room("Rotunda", -8, 8, 6, 18);
  k.room("Grand Gallery", -20, 20, -6, 6);
  k.room("Portrait Hall", -20, -8, 6, 18);
  k.room("Lesser-Known Wing", 8, 20, 6, 18);
  k.room("Salon Rouge", -20, 0, -18, -6);
  k.room("Sculpture Hall", 0, 20, -18, -6);
  void R;

  return k.finish({
    id: "gallery",
    name: "Art Gallery",
    bounds: { minX: -19.8, maxX: 19.8, minZ: -17.8, maxZ: 17.8 },
    hunterSpawns,
    hiderSpawns,
    preview: { pos: [17.5, 2.6, 3.8], look: [-6, 3.6, -1.2], fov: 64 },
    lighting: {
      sky: "#e4edf4",
      hemi: ["#fff2de", "#5a4a3a", 0.5],
      sun: { color: "#fff0d8", int: 3.0, pos: [-8, 30, 6] },
      points: [
        { pos: [-10, 5.2, 0], color: "#ffdcae", int: 70, dist: 20 },
        { pos: [10, 5.2, 0], color: "#ffdcae", int: 70, dist: 20 },
        { pos: [0, 5.5, 12], color: "#ffe6c4", int: 55, dist: 16 },
        { pos: [-14, 4.5, 12], color: "#ffd8a0", int: 40, dist: 14 },
        { pos: [-10, 4.8, -12], color: "#ffd0a0", int: 50, dist: 16 },
        { pos: [10, 4.8, -12], color: "#f4f4ff", int: 50, dist: 16 },
      ],
      exposure: 1.0,
      env: 0.5,
      hdri: "lobby",
    },
  });
}
