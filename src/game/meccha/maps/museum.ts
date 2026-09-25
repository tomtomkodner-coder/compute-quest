// Art Museum (official map, 美術館): a classical museum around a sky-lit Grand Hall.
// Lobby with ticket desk (hunters enter here) → Grand Hall (columns, skylights, giant white chameleon statue) →
// West: Impressionist Gallery + World Paintings (real masterpieces in gilded / dark frames) →
// East: Meccha Exhibit (objects from the game: paint bucket, paint shotgun, penguin, burger, cube, duck, PLAY easel)
// and Sculpture Court → North: World Miniatures (Eiffel Tower, Colosseum, Pisa, Taj Mahal, Big Ben, Liberty,
// pyramids, Tokyo Tower, Mt Fuji, Moai) and the dim Lesser Wing with night paintings.
import * as THREE from "three";
import * as X from "./tex/museum";
import { Art, type Side, type Style, type V3 } from "./tex/museum";
import { Kit, type Mat, type World } from "./kit";

type Face = "+x" | "-x" | "+z" | "-z";

export function buildMuseum(): World {
  const k = new Kit(7.5, 3.2);
  const a = new Art(k);
  const R = X.rng(4104);
  const H = 7.5;
  const M = a.M.bind(a);
  const T = (key: string, make: () => X.PaintTex) => k.tex("mu_" + key, make);

  // ================= materials =================
  // shared neutral textures, tinted per material (fewer canvases + normal maps to build)
  const PL = k.tex("art_plasterN", () => X.plaster("#e9e9e9", 61, 0.075));
  const FB = k.tex("art_fabricN", () => X.fabric("#e2e2e2", 83, 0.11));
  const lit = (c: string) => `#${new THREE.Color(c).multiplyScalar(1.1).getHexString()}`;
  const fHall = M(T("fHall", () => X.marbleTiles("#ebe3d2", "#a3937a", 2, 3, "rgba(70,60,45,0.45)", "#dccfb5")), "#fff", 1.8, { roughness: 0.14, bump: 0.2 });
  const fBorder = M(T("fBorder", () => X.marbleTiles("#5c3f33", "#2a1a14", 2, 4, "rgba(0,0,0,0.4)")), "#fff", 1.0, { roughness: 0.12, bump: 0.2 });
  const fLobby = M(T("fLobby", () => X.marbleTiles("#e8e6e0", "#9a9a9c", 2, 7, "rgba(0,0,0,0.45)", "#26262a")), "#fff", 1.6, { roughness: 0.1, bump: 0.2 });
  const fParquet = M(T("fParq", () => X.parquet("#9c6c40", "#875a32")), "#fff", 2.0, { roughness: 0.32, bump: 0.5 });
  const fDarkWood = M(T("fParqD", () => X.parquet("#5a3820", "#46291a", 8)), "#fff", 2.0, { roughness: 0.3, bump: 0.5 });
  const fStone = M(T("fStone", () => X.marbleTiles("#bcbab5", "#85837e", 2, 9, "rgba(0,0,0,0.35)")), "#fff", 2.0, { roughness: 0.18, bump: 0.2 });
  const fTrav = M(T("fTrav", () => X.marbleTiles("#dacdb2", "#b3a384", 2, 12, "rgba(90,75,55,0.4)", "#cbbc9e")), "#fff", 1.4, { roughness: 0.28, bump: 0.35 });
  const fTerr = M(PL, lit("#b3b8bd"), 1.4, { roughness: 0.16, bump: 0.25 });

  const wHall = M(PL, lit("#d8cab0"), 2.4, { roughness: 0.9, bump: 0.7 });
  const wLobby = M(PL, lit("#efebe3"), 2.4, { roughness: 0.9, bump: 0.4 });
  const wSage = M(PL, lit("#7f927a"), 2.4, { roughness: 0.9, bump: 0.4 });
  const wRed = M(PL, lit("#7c2b2c"), 2.4, { roughness: 0.9, bump: 0.4 });
  const wWhite = M(PL, lit("#f1efea"), 2.4, { roughness: 0.9, bump: 0.3 });
  const wStone = M(PL, lit("#d6cfc2"), 2.0, { roughness: 0.9, bump: 0.7 });
  const wChar = M(PL, lit("#2e3139"), 2.4, { roughness: 0.9, bump: 0.4 });
  const wBlue = M(PL, lit("#b3c1ca"), 2.4, { roughness: 0.9, bump: 0.4 });
  const wOut = M(PL, lit("#cdc5b8"), 3, { roughness: 0.9, bump: 0.5 });

  const tBase = M(null, "#2a2420", 0, { roughness: 0.4 });
  const tCrown = M(PL, lit("#f5f2eb"), 1, { roughness: 0.7, bump: 0.2 });
  const tWains = M(T("wains", () => X.woodGrain("#6a4428", "#3a2210", 6)), "#fff", 1.0, { roughness: 0.45, bump: 0.5 });
  const tCasing = a.benchWood;
  const ceil = M(PL, lit("#f4f2ee"), 3, { roughness: 0.9, bump: 0.2 });
  const ceilDark = M(null, "#1f2126", 0, { roughness: 0.9 });
  const skyFrame = M(null, "#e6e6e3", 0, { metalness: 0.4, roughness: 0.4 });
  const colShaft = M(T("flute", () => X.flutes("#efe8da")), "#fff", 0, { roughness: 0.45, bump: 0.9 });
  const colStone = M(PL, lit("#ebe4d4"), 1, { roughness: 0.5, bump: 0.3 });
  const marbleTop = M(T("mTop", () => X.marbleTiles("#f0ede6", "#a9a49a", 1, 17, "rgba(0,0,0,0)")), "#fff", 1.2, { roughness: 0.12, bump: 0.1 });
  const potM = M(null, "#2c2c2e", 0, { roughness: 0.35, metalness: 0.2 });
  const leaf = M(FB, lit("#3f6b2c"), 0.3, { roughness: 0.6, bump: 0.6 });
  const leaf2 = M(FB, lit("#2d5520"), 0.3, { roughness: 0.6, bump: 0.6 });
  const cloth = M(FB, lit("#1f2a44"), 0.5, { roughness: 0.85, bump: 0.3 });
  const daylight = M(null, "#eef4f8", 0, { emissive: "#dfeaf2", emissiveIntensity: 1.1, roughness: 0.2 });
  const white = M(null, "#f4f4f2", 0, { roughness: 0.35 });
  const black = M(null, "#141416", 0, { roughness: 0.4 });

  // signs
  const signMat = (key: string, bg: string, fg: string, text: string, w = 512, h = 128, font?: string, border?: string) =>
    M(T("sign_" + key, () => X.sign(bg, fg, text, w, h, font, border)), "#fff", 0, { roughness: 0.5, bump: 0 });

  // ================= helpers =================
  const side = (m: Mat, top: number, o: Partial<Side> = {}): Side => ({ m, top, base: tBase, crown: tCrown, casing: tCasing, ...o });
  const OUT: Side = { m: wOut, top: H };
  const floor = (m: Mat, x1: number, x2: number, z1: number, z2: number) => a.box(m, x2 - x1, 0.2, z2 - z1, (x1 + x2) / 2, -0.2, (z1 + z2) / 2, { sharp: true });
  /** hang a real painting on a wall face; wc = wall centre line, along = coordinate along the wall */
  function hang(face: Face, wc: number, along: number, y: number, w: number, h: number, style: Style, o: { idx?: number; light?: boolean; label?: boolean; glow?: boolean } = {}, ceilY = 0) {
    const off = 0.15;
    let x = 0, z = 0, ry = 0, nx = 0, nz = 0;
    if (face === "+x") { x = wc + off; z = along; ry = Math.PI / 2; nx = 1; }
    else if (face === "-x") { x = wc - off; z = along; ry = -Math.PI / 2; nx = -1; }
    else if (face === "+z") { z = wc + off; x = along; ry = 0; nz = 1; }
    else { z = wc - off; x = along; ry = Math.PI; nz = -1; }
    const i = a.painting(x, y, z, ry, w, h, style, o);
    if (ceilY > 0) a.spot(x + nx * 1.7, ceilY, z + nz * 1.7, x + nx * 0.05, y, z + nz * 0.05);
    return i;
  }
  const up = new THREE.Vector3(0, 1, 0);
  const qDir = (dx: number, dy: number, dz: number) => new THREE.Quaternion().setFromUnitVectors(up, new THREE.Vector3(dx, dy, dz).normalize());

  // ================= floors =================
  floor(fLobby, -10, 10, 12, 20);
  floor(fHall, -10, 10, -8, 12);
  // hall border band + central inlay
  for (const [x1, x2, z1, z2] of [[-9.85, 9.85, -7.85, -7.35], [-9.85, 9.85, 11.35, 11.85], [-9.85, -9.35, -7.85, 11.85], [9.35, 9.85, -7.85, 11.85], [-3.6, 3.6, -6.6, -6.2], [-3.6, 3.6, 0.2, 0.6], [-3.6, -3.2, -6.6, 0.6], [3.2, 3.6, -6.6, 0.6]] as const)
    a.box(fBorder, x2 - x1, 0.006, z2 - z1, (x1 + x2) / 2, 0, (z1 + z2) / 2, { sharp: true });
  floor(fParquet, -24, -10, -8, 20);
  floor(fStone, 10, 24, -8, 6);
  floor(fTrav, 10, 24, 6, 20);
  floor(fDarkWood, -24, -8, -20, -8);
  floor(fTerr, -8, 24, -20, -8);

  // ================= walls =================
  const sLobby = side(wLobby, 5), sHall = side(wHall, H, { wains: tWains, wainsH: 1.05 });
  const sWS = side(wSage, 5), sWN = side(wRed, 5, { wains: tWains, wainsH: 0.9 }), sEN = side(wWhite, 5), sES = side(wStone, 5);
  const sDark = side(wChar, 4.5, { crown: ceilDark }), sMini = side(wBlue, 5);
  // exterior
  a.wallX(20, -24, -10, [], sWS, OUT, H);
  a.wallX(20, -10, 10, [], sLobby, OUT, H);
  a.wallX(20, 10, 24, [], sES, OUT, H);
  a.wallX(-20, -24, -8, [], OUT, sDark, H);
  a.wallX(-20, -8, 24, [], OUT, sMini, H);
  a.wallZ(-24, -20, -8, [], OUT, sDark, H);
  a.wallZ(-24, -8, 6, [], OUT, sWN, H);
  a.wallZ(-24, 6, 20, [], OUT, sWS, H);
  a.wallZ(24, -20, -8, [], sMini, OUT, H);
  a.wallZ(24, -8, 6, [], sEN, OUT, H);
  a.wallZ(24, 6, 20, [], sES, OUT, H);
  // interior
  a.wallX(12, -10, 10, [[0, 5, 4.4]], sHall, sLobby, H);
  a.wallZ(-10, -8, 6, [[-1, 3, 3.4]], sWN, sHall, H);
  a.wallZ(-10, 6, 12, [[9.2, 2.6, 3.2]], sWS, sHall, H);
  a.wallZ(-10, 12, 20, [[16, 2.6, 3.2]], sWS, sLobby, H);
  a.wallZ(10, -8, 6, [[-1, 3, 3.4]], sHall, sEN, H);
  a.wallZ(10, 6, 12, [[9.2, 2.6, 3.2]], sHall, sES, H);
  a.wallZ(10, 12, 20, [[16, 2.6, 3.2]], sLobby, sES, H);
  a.wallX(6, -24, -10, [[-17, 3, 3.2]], sWN, sWS, H);
  a.wallX(6, 10, 24, [[17, 3, 3.2]], sEN, sES, H);
  a.wallX(-8, -24, -10, [[-17, 2.6, 3.0]], sDark, sWN, H);
  a.wallX(-8, -10, -8, [], sDark, sHall, H);
  a.wallX(-8, -8, 10, [[1, 4, 4.0]], sMini, sHall, H);
  a.wallX(-8, 10, 24, [[17, 2.6, 3.2]], sMini, sEN, H);
  a.wallZ(-8, -20, -8, [[-14, 2.6, 3.0]], sDark, sMini, H);

  // ================= ceilings + skylights =================
  const hallHoles: [number, number, number, number][] = [[-3, 3, -6.2, -2.2], [-3, 3, 0, 4], [-3, 3, 6.2, 10.2]];
  a.slab(ceil, -10, 10, -8, 12, H, hallHoles);
  for (const h of hallHoles) a.skylight(h[0], h[1], h[2], h[3], H + 0.3, ceil, skyFrame, 1.0, 4, 3);
  // coffer beams in the hall
  for (const x of [-6.5, 6.5]) a.box(ceil, 0.5, 0.45, 20, x, H - 0.45, 2, { sharp: true });
  for (const z of [-7, -1.1, 5.1, 11]) a.box(ceil, 20, 0.45, 0.5, 0, H - 0.45, z, { sharp: true });
  const lobbyHole: [number, number, number, number] = [-3, 3, 14.5, 17.5];
  a.slab(ceil, -10, 10, 12, 20, 5, [lobbyHole]);
  a.skylight(...lobbyHole, 5.3, ceil, skyFrame, 0.7, 3, 2);
  const wsHole: [number, number, number, number] = [-19.5, -14.5, 11, 15];
  a.slab(ceil, -24, -10, 6, 20, 5, [wsHole]);
  a.skylight(...wsHole, 5.3, ceil, skyFrame, 0.7, 3, 2);
  a.slab(ceil, -24, -10, -8, 6, 5);
  a.slab(ceil, 10, 24, -8, 6, 5);
  const esHole: [number, number, number, number] = [13, 21, 10, 16];
  a.slab(ceil, 10, 24, 6, 20, 5, [esHole]);
  a.skylight(...esHole, 5.3, ceil, skyFrame, 0.8, 4, 3);
  a.slab(ceilDark, -24, -8, -20, -8, 4.5);
  const miniHoles: [number, number, number, number][] = [[-2, 4, -17, -12.5], [12, 18, -17, -12.5]];
  a.slab(ceil, -8, 24, -20, -8, 5, miniHoles);
  for (const h of miniHoles) a.skylight(h[0], h[1], h[2], h[3], 5.3, ceil, skyFrame, 0.7, 3, 2);
  // ceiling light troughs (emissive strips) in the wings
  const strip = M(null, "#fffaf0", 0, { emissive: "#fff3dc", emissiveIntensity: 1.4 });
  for (const [x1, x2, z] of [[-22, -12, -4], [-22, -12, 3], [12, 22, -4], [12, 22, 3], [-22, -12, 8.5], [-22, -12, 17.5], [12, 22, 8], [12, 22, 18]] as const)
    a.box(strip, x2 - x1, 0.04, 0.22, (x1 + x2) / 2, 4.96, z, { sharp: true });

  // ================= columns (Grand Hall) =================
  for (const x of [-7.2, 7.2]) for (const z of [-4.6, -0.6, 3.6, 7.6]) a.column(x, z, H, 0.36, colShaft, colStone);

  // ================= Grand Hall paintings =================
  hang("+z", -8, -5.6, 3.7, 4.2, 2.9, "gold", { light: true, label: false }, H);
  hang("+z", -8, 6.6, 3.7, 4.2, 2.9, "gold", { light: true, label: false }, H);
  hang("-z", 12, -6.3, 3.3, 3.6, 2.2, "gold", { idx: 8 }, H);
  hang("-z", 12, 6.3, 3.4, 3.2, 2.4, "gold", {}, H);
  hang("+x", -10, -5.3, 3.2, 3.0, 2.2, "dark", {}, H);
  hang("+x", -10, 4.2, 3.6, 4.4, 3.0, "gold", { light: true }, H);
  hang("-x", 10, -5.3, 3.2, 3.0, 2.2, "dark", {}, H);
  hang("-x", 10, 4.2, 3.6, 4.4, 3.0, "gold", { light: true }, H);
  // upper salon row
  hang("+z", -8, -8.4, 6.0, 1.1, 1.4, "gold", { label: false, glow: false });
  hang("+z", -8, -2.6, 6.0, 1.1, 1.4, "gold", { label: false, glow: false });
  hang("+z", -8, 3.8, 6.0, 1.1, 1.4, "gold", { label: false, glow: false });
  hang("+z", -8, 9.2, 6.0, 1.1, 1.4, "gold", { label: false, glow: false });
  // ropes before the big north paintings
  a.ropeLine([[-8.2, -6.7], [-5.6, -6.5], [-3.0, -6.7]]);
  a.ropeLine([[4.0, -6.7], [6.6, -6.5], [9.2, -6.7]]);
  // sign over the miniatures door
  const sMiniSign = signMat("mini", "#1f2a33", "#e8dcc0", "WORLD MINIATURES", 512, 96, "bold 46px Georgia, serif");
  a.box(tBase, 3.6, 0.6, 0.06, 1, 4.6, -7.82);
  a.plane(sMiniSign, 3.4, 0.52, 1, 4.9, -7.78);

  // ---- centrepiece: giant white chameleon statue on a drum
  {
    const cx = 0, cz = -3.2, base = a.drum(cx, cz, 1.35, 0.85, colStone);
    const sw = M(null, "#f7f7f5", 0, { roughness: 0.28, metalness: 0.05 });
    const eye = M(null, "#161618", 0, { roughness: 0.2 });
    const y0 = base;
    const cap = (r: number, len: number, x: number, y: number, z: number, q?: THREE.Quaternion) => a.put(sw, new THREE.CapsuleGeometry(r, len, 6, 16), x, y, z, q ? { q } : {});
    cap(0.2, 0.7, cx - 0.26, y0 + 0.55, cz, qDir(-0.12, 1, 0)); // legs
    cap(0.2, 0.7, cx + 0.26, y0 + 0.55, cz, qDir(0.12, 1, 0));
    a.sph(sw, 0.24, cx - 0.33, y0 + 0.12, cz + 0.1, { s: [1, 0.55, 1.4] });
    a.sph(sw, 0.24, cx + 0.33, y0 + 0.12, cz + 0.1, { s: [1, 0.55, 1.4] });
    a.lathe(sw, [[0.001, 0], [0.38, 0.05], [0.48, 0.3], [0.46, 0.7], [0.4, 0.95], [0.2, 1.08], [0.001, 1.1]], cx, y0 + 0.95, cz, 28);
    cap(0.14, 0.75, cx - 0.62, y0 + 1.65, cz + 0.1, qDir(-0.9, 0.9, 0.15)); // left arm up (waving)
    cap(0.14, 0.7, cx + 0.62, y0 + 1.35, cz, qDir(0.45, -1, 0)); // right arm down
    a.sph(sw, 0.13, cx - 0.98, y0 + 2.0, cz + 0.16);
    a.sph(sw, 0.13, cx + 0.8, y0 + 0.98, cz);
    a.sph(sw, 0.46, cx, y0 + 2.45, cz, {}, 28, 20); // head
    a.sph(eye, 0.07, cx - 0.16, y0 + 2.52, cz + 0.41, { s: [1, 1.4, 0.5] });
    a.sph(eye, 0.07, cx + 0.16, y0 + 2.52, cz + 0.41, { s: [1, 1.4, 0.5] });
    a.col(cx - 0.6, cx + 0.6, cz - 0.5, cz + 0.5, base, base + 2.9, true);
    const plaque = signMat("cham", "#2a2320", "#d9c08a", "THE WHITE CHAMELEON", 512, 80, "bold 40px Georgia, serif");
    a.plane(plaque, 1.2, 0.19, cx, 0.5, cz + 1.4, {});
    // splashes of paint on the drum base (the museum's joke)
    const pc = ["#e2412f", "#2f7fe2", "#f2c21a", "#35b04f"];
    pc.forEach((c, i) => {
      const pm = M(null, c, 0, { roughness: 0.3 });
      const an = -0.9 + i * 0.6;
      a.cylC(pm, 0.18 + (i % 2) * 0.08, 0.2 + (i % 2) * 0.08, 0.01, cx + Math.sin(an) * 1.9, 0.005, cz + Math.cos(an) * 1.9, 18, { s: [1, 1, 0.7] });
    });
  }
  // benches in the hall
  a.bench(-4.3, 2.0, Math.PI / 2, 2.2);
  a.bench(4.3, 2.0, Math.PI / 2, 2.2);
  a.bench(0, 10.3, 0, 2.4);
  // busts between columns
  const bust = (x: number, z: number, m: Mat, ry = 0) => {
    const t = a.plinth(x, z, 0.55, 1.1, 0.55, colStone, ry);
    a.lathe(m, [[0.001, 0], [0.16, 0], [0.16, 0.05], [0.1, 0.1], [0.24, 0.2], [0.27, 0.34], [0.2, 0.42], [0.08, 0.46], [0.07, 0.52], [0.001, 0.53]], x, t, z, 24);
    a.sph(m, 0.13, x, t + 0.64, z, { s: [0.9, 1.15, 1] });
    a.sph(m, 0.05, x, t + 0.63, z + 0.12 * Math.cos(ry) + 0.0, { s: [0.6, 0.9, 1] });
  };
  const bronze = M(null, "#6b4a2b", 0, { metalness: 0.9, roughness: 0.35 });
  bust(-8.6, 1.5, a.stoneWhite, Math.PI / 2);
  bust(8.6, 1.5, a.stoneWhite, -Math.PI / 2);
  bust(-8.6, -2.6, bronze, Math.PI / 2);
  bust(8.6, -2.6, bronze, -Math.PI / 2);
  a.plant(-9.1, 11.1, 1.2, potM, leaf, leaf2);
  a.plant(9.1, 11.1, 1.2, potM, leaf, leaf2);
  a.plant(-9.1, -7.1, 1.2, potM, leaf, leaf2);
  a.plant(9.1, -7.1, 1.2, potM, leaf, leaf2);

  // ================= Lobby =================
  {
    // glass entrance doors (daylight behind)
    for (const dx of [-1.1, 1.1]) {
      a.plane(daylight, 2.0, 3.0, dx, 1.55, 19.84, { ry: Math.PI });
      a.box(a.chrome, 2.1, 0.08, 0.08, dx, 3.02, 19.8);
      for (const sx of [-1, 1]) a.box(a.chrome, 0.08, 3.1, 0.08, dx + sx * 1.02, 0, 19.8);
      a.box(a.chrome, 0.04, 0.9, 0.06, dx - Math.sign(dx) * 0.8, 0.9, 19.7);
    }
    a.box(a.chrome, 4.4, 0.25, 0.12, 0, 3.1, 19.8);
    const mat = M(FB, lit("#2d2d30"), 0.4, { roughness: 0.95, bump: 0.8 });
    a.box(mat, 4, 0.015, 1.6, 0, 0, 18.9, { sharp: true });
    // ticket / info desk
    const dx0 = -6.2, dz0 = 16.8;
    a.box(tWains, 4.2, 1.02, 0.7, dx0, 0, dz0, { solid: true });
    a.box(marbleTop, 4.35, 0.05, 0.85, dx0, 1.02, dz0);
    a.box(tWains, 0.7, 1.02, 2.2, dx0 - 2.45, 0, dz0 + 1.45, { solid: true });
    a.box(marbleTop, 0.85, 0.05, 2.35, dx0 - 2.45, 1.02, dz0 + 1.45);
    a.box(tBase, 4.2, 0.1, 0.72, dx0, 0, dz0);
    const ticket = signMat("ticket", "#1d2a33", "#e8dcc0", "TICKETS · INFORMATION", 512, 80, "bold 36px Georgia, serif");
    a.plane(ticket, 2.8, 0.44, dx0, 0.62, dz0 - 0.36, { ry: Math.PI });
    // monitor + brochure stand on desk
    a.box(black, 0.5, 0.32, 0.04, dx0 + 0.8, 1.2, dz0 + 0.1, { ry: Math.PI });
    a.box(black, 0.08, 0.14, 0.08, dx0 + 0.8, 1.07, dz0 + 0.12);
    const brochure = M(T("broch", () => X.sign("#c96d4a", "#fff", "ART", 128, 160, "bold 40px Georgia")), "#fff", 0, { bump: 0 });
    for (let i = 0; i < 4; i++) a.box(brochure, 0.2, 0.28, 0.01, dx0 - 1.2 + i * 0.25, 1.07, dz0 - 0.2, { rx: -0.25, sharp: true });
    // stools behind desk
    for (const sx of [-0.8, 0.8]) {
      a.cyl(a.chrome, 0.03, 0.2, 0.66, dx0 + sx, 0, dz0 + 1.0, 14);
      a.cyl(a.leather, 0.2, 0.2, 0.08, dx0 + sx, 0.66, dz0 + 1.0, 18);
    }
    // queue stanchions (chrome + red rope)
    a.ropeLine([[-3.4, 15.2], [-3.4, 17.0], [-3.4, 18.6]], a.velvet, a.chrome);
    a.ropeLine([[-4.8, 15.2], [-3.4, 15.2]], a.velvet, a.chrome);
    // floor guide board
    const guide = M(T("guide", X.infoBoard), "#fff", 0, { bump: 0 });
    a.box(tBase, 1.0, 1.3, 0.06, 5.5, 0.55, 18.9);
    a.plane(guide, 0.9, 1.15, 5.5, 1.2, 18.86, { ry: Math.PI });
    for (const sx of [-0.4, 0.4]) a.box(tBase, 0.05, 0.6, 0.3, 5.5 + sx, 0, 18.9);
    a.col(5.0, 6.0, 18.7, 19.1, 0, 1.85, false);
    // ART MUSEUM lettering + exhibition banner
    const title = signMat("title", "#efebe3", "#8a6428", "ART MUSEUM", 512, 110, "bold 78px Georgia, serif");
    a.plane(title, 4.6, 1.0, -6, 3.7, 12.17, {});
    a.painting(6.3, 2.6, 12.15, 0, 2.2, 1.75, "black", { idx: 0, label: false });
    const exh = signMat("exh", "#efebe3", "#2a2420", "NOW SHOWING · MASTERS OF LIGHT", 512, 64, "bold 26px Georgia, serif");
    a.plane(exh, 2.6, 0.32, 6.3, 1.25, 12.17, {});
    // lockers along the south-east
    const locker = M(PL, lit("#6f8591"), 1, { metalness: 0.5, roughness: 0.4, bump: 0.2 });
    for (let i = 0; i < 5; i++) {
      const lx = 3.1 + i * 0.62;
      a.box(locker, 0.6, 1.9, 0.5, lx, 0, 19.55, { solid: true });
      for (const ly of [0.55, 1.5]) {
        a.box(a.chrome, 0.12, 0.03, 0.03, lx + 0.18, ly, 19.29);
        a.box(tBase, 0.4, 0.01, 0.01, lx, ly + 0.25, 19.29, { sharp: true });
      }
    }
    a.bench(0, 13.3, 0, 2.0);
    a.plant(-9.1, 19.1, 1.1, potM, leaf, leaf2);
    a.plant(9.2, 13.0, 1.1, potM, leaf, leaf2);
    // coat rack
    a.cyl(tBase, 0.02, 0.02, 1.8, 8.9, 0, 18.9, 8);
    a.cyl(tBase, 0.25, 0.25, 0.03, 8.9, 0, 18.9, 16);
    for (let i = 0; i < 4; i++) a.tube(tBase, [[8.9, 1.7, 18.9], [8.9 + Math.cos(i * 1.57) * 0.18, 1.78, 18.9 + Math.sin(i * 1.57) * 0.18], [8.9 + Math.cos(i * 1.57) * 0.24, 1.72, 18.9 + Math.sin(i * 1.57) * 0.24]], 0.012, 6, 5);
    a.col(8.7, 9.1, 18.7, 19.1, 0, 1.8, false);
  }

  // ================= West-South: Impressionist Gallery =================
  {
    // the star piece behind a rope, like a famous masterpiece
    hang("+x", -24, 13, 2.25, 1.55, 2.0, "dark", { idx: 1, light: true, label: false }, 5);
    a.ropeLine([[-22.5, 11.1], [-21.4, 13.0], [-22.5, 14.9]]);
    a.bench(-19.4, 13, Math.PI / 2, 2.0);
    hang("-z", 20, -20.4, 2.3, 2.4, 1.8, "gold", {}, 5);
    hang("-z", 20, -13.8, 2.3, 2.4, 1.8, "gold", {}, 5);
    hang("+x", -24, 8.3, 2.3, 1.6, 1.3, "gold", {}, 5);
    hang("+x", -24, 17.7, 2.3, 1.6, 1.3, "gold", {}, 5);
    hang("+z", 6, -21.2, 2.3, 2.0, 1.6, "gold", {}, 5);
    hang("+z", 6, -12.8, 2.3, 2.0, 1.6, "gold", { label: false }, 5);
    hang("-x", -10, 12.6, 2.3, 2.2, 1.7, "bronze", {}, 5);
    hang("-x", -10, 18.7, 2.3, 1.0, 1.3, "gold", { label: false }, 5);
    a.plant(-10.9, 6.9, 1.0, potM, leaf, leaf2);
    a.bench(-15.6, 17.5, 0, 1.8);
    // sculpture: bronze abstract figure on a plinth
    const t = a.plinth(-14.5, 9.3, 0.6, 0.9);
    a.lathe(bronze, [[0.001, 0], [0.18, 0], [0.12, 0.3], [0.22, 0.6], [0.1, 0.95], [0.16, 1.1], [0.001, 1.25]], -14.5, t, 9.3, 24);
  }

  // ================= West-North: World Paintings (red salon) =================
  {
    // free-standing double-sided partition
    const px1 = -20.5, px2 = -13.5, pz = -1.2;
    a.box(wWhite, px2 - px1, 3.4, 0.3, (px1 + px2) / 2, 0, pz, { sharp: true, solid: true, stand: true });
    a.box(tBase, px2 - px1 + 0.04, 0.14, 0.34, (px1 + px2) / 2, 0, pz, { sharp: true });
    a.box(tCrown, px2 - px1 + 0.1, 0.08, 0.4, (px1 + px2) / 2, 3.4, pz);
    for (const s of [-1, 1]) {
      const ry = s > 0 ? 0 : Math.PI;
      a.painting(-18.8, 1.9, pz + s * 0.15, ry, 2.2, 1.6, s > 0 ? "gold" : "dark", {});
      a.painting(-15.2, 1.9, pz + s * 0.15, ry, 1.5, 1.9, s > 0 ? "dark" : "gold", { label: false });
      a.spot(-17, 5, pz + s * 1.9, -17, 1.9, pz + s * 0.2);
    }
    hang("+x", -24, -4.8, 2.3, 2.0, 1.5, "gold", {}, 5);
    hang("+x", -24, 0.2, 2.4, 2.6, 2.0, "gold", { light: true }, 5);
    hang("+x", -24, 4.3, 2.3, 1.2, 1.6, "dark", { label: false }, 5);
    hang("+z", -8, -21.2, 2.3, 1.8, 1.4, "gold", {}, 5);
    hang("+z", -8, -12.7, 2.3, 1.8, 1.4, "gold", { label: false }, 5);
    hang("-z", 6, -21.3, 2.3, 2.0, 1.5, "dark", {}, 5);
    hang("-z", 6, -12.8, 2.3, 1.9, 1.5, "gold", { label: false }, 5);
    hang("-x", -10, -5.3, 2.3, 2.0, 1.5, "gold", { label: false }, 5);
    hang("-x", -10, 3.3, 2.3, 2.0, 1.5, "bronze", {}, 5);
    a.bench(-17, 2.2, 0, 2.0);
    a.bench(-17, -4.6, 0, 2.0);
    a.plant(-23.1, -7.1, 1.0, potM, leaf, leaf2);
    // velvet-topped display with a vase
    const t = a.plinth(-11.2, 0.8, 0.6, 1.0, 0.6, colStone);
    const vase = M(null, "#2c4f7c", 0, { roughness: 0.18 });
    a.lathe(vase, [[0.001, 0], [0.1, 0], [0.18, 0.12], [0.22, 0.3], [0.16, 0.48], [0.08, 0.58], [0.1, 0.66], [0.001, 0.66]], -11.2, t, 0.8, 24);
  }

  // ================= Dark wing (Lesser Wing) =================
  {
    const hangD = (face: Face, wc: number, along: number, idx: number, w: number, h: number) => {
      hang(face, wc, along, 2.0, w, h, "dark", { idx, light: true, label: false }, 4.5);
    };
    hangD("+z", -20, -20.5, 0, 2.2, 1.75);
    hangD("+z", -20, -15.6, 4, 1.6, 2.1);
    hangD("+z", -20, -11, 15, 2.2, 1.65);
    hangD("+x", -24, -14, 7, 1.2, 1.55);
    hangD("-z", -8, -21.2, 18, 1.8, 1.5);
    hangD("-z", -8, -12, 12, 1.8, 1.4);
    hangD("-x", -8, -17.7, 16, 1.5, 1.1);
    hangD("-x", -8, -10.4, 3, 1.2, 1.5);
    a.bench(-16, -14, 0, 2.2, a.leather);
    // dim vitrine with a candlestick and an old globe
    const vx = -21.5, vz = -10.6;
    a.box(tWains, 1.4, 0.9, 0.7, vx, 0, vz, { solid: true });
    a.box(a.glass, 1.36, 0.6, 0.66, vx, 0.9, vz, { sharp: true });
    a.col(vx - 0.7, vx + 0.7, vz - 0.35, vz + 0.35, 0, 1.5, true);
    a.lathe(a.brass, [[0.001, 0], [0.09, 0], [0.03, 0.05], [0.02, 0.3], [0.04, 0.32], [0.001, 0.33]], vx - 0.35, 0.9, vz, 16);
    a.cyl(a.brass, 0.012, 0.012, 0.3, vx + 0.3, 0.9, vz, 8);
    const globe = M(null, "#7d6a45", 0, { roughness: 0.5 });
    a.sph(globe, 0.16, vx + 0.3, 1.3, vz, {}, 20, 14);
    a.torus(a.brass, 0.18, 0.008, vx + 0.3, 1.3, vz, { ry: Math.PI / 2 });
    // cloaked sculpture on a plinth
    const t = a.plinth(-12.5, -16.5, 0.7, 0.8, 0.7, M(null, "#3a3a3e", 0, { roughness: 0.5 }));
    const drape = M(FB, lit("#5d5850"), 0.4, { roughness: 0.9, bump: 0.5 });
    a.lathe(drape, [[0.001, 0], [0.38, 0], [0.34, 0.4], [0.26, 0.9], [0.2, 1.2], [0.14, 1.3], [0.001, 1.34]], -12.5, t, -16.5, 20);
    a.col(-12.9, -12.1, -16.9, -16.1, 0, t + 1.3, true);
  }

  // ================= East-North: Meccha Exhibit (objects from the game) =================
  {
    const title = signMat("meccha", "#f1efea", "#d6412f", "MECCHA EXHIBIT", 512, 96, "bold 60px Georgia, serif");
    a.plane(title, 4.2, 0.8, 17, 3.9, 5.83, { ry: Math.PI });
    // blue paint puddles on the floor (like the hunters' shots)
    const pBlue = M(null, "#2f6fe0", 0, { roughness: 0.2 });
    const pRed = M(null, "#e03a2f", 0, { roughness: 0.2 });
    const pYel = M(null, "#f2c21a", 0, { roughness: 0.25 });
    const pGrn = M(null, "#3cb455", 0, { roughness: 0.25 });

    // 1) giant paint bucket with roller
    {
      const bx = 13.2, bz = -5;
      const t = a.plinth(bx, bz, 1.6, 0.25, 1.6, a.plinthWhite);
      a.lathe(a.chrome, [[0.001, 0], [0.5, 0], [0.56, 1.0], [0.58, 1.02], [0.58, 1.06], [0.53, 1.06], [0.51, 0.99], [0.47, 0.06], [0.001, 0.06]], bx, t, bz, 32);
      a.cylC(pBlue, 0.52, 0.52, 0.01, bx, t + 0.93, bz, 28);
      const lab = signMat("paint", "#f2f2f0", "#2f6fe0", "PAINT", 256, 96, "bold 56px sans-serif");
      a.cylC(lab, 0.535, 0.515, 0.4, bx, t + 0.5, bz, 28, { ry: -1.2 });
      for (let i = 0; i < 5; i++) {
        const an = 0.3 + i * 0.5;
        const L = 0.2 + (i % 3) * 0.15;
        a.put(pBlue, new THREE.CapsuleGeometry(0.035, L, 4, 8), bx + Math.sin(an) * 0.575, t + 1.02 - L / 2, bz + Math.cos(an) * 0.575, {});
      }
      a.torus(a.chrome, 0.55, 0.015, bx, t + 1.05, bz, { rx: 0.3 }, Math.PI, 20);
      // roller leaning on the bucket
      a.tube(a.blackMetal, [[bx + 0.9, t + 0.02, bz + 0.2], [bx + 0.75, t + 0.9, bz + 0.2], [bx + 0.62, t + 1.25, bz + 0.2]], 0.025, 10, 6);
      a.cylC(pBlue, 0.1, 0.1, 0.5, bx + 0.62, t + 1.3, bz + 0.2, 16, { rx: Math.PI / 2 });
      a.cylC(pBlue, 0.6, 0.6, 0.008, bx + 1.1, 0.004, bz + 1.2, 24, { s: [1, 1, 0.6] });
      a.col(bx - 0.6, bx + 0.6, bz - 0.6, bz + 0.6, 0, t + 1.06, true);
    }
    // 2) paint shotgun in a glass vitrine
    {
      const gx = 20.6, gz = -5.4;
      a.box(tBase, 1.5, 1.0, 0.7, gx, 0, gz, { solid: true });
      a.box(cloth, 1.46, 0.02, 0.66, gx, 1.0, gz, { sharp: true });
      const wood = M(T("gunWood", () => X.woodGrain("#7a4a26", "#3c2210", 9)), "#fff", 0.4, { roughness: 0.45 });
      const y = 1.12;
      a.box(wood, 0.36, 0.12, 0.06, gx - 0.46, y - 0.08, gz, { rz: -0.12 });
      a.box(a.blackMetal, 0.34, 0.1, 0.07, gx - 0.13, y - 0.04, gz);
      a.cylC(a.blackMetal, 0.022, 0.022, 0.72, gx + 0.38, y + 0.03, gz, 12, { rz: Math.PI / 2 });
      a.cylC(a.blackMetal, 0.018, 0.018, 0.6, gx + 0.3, y - 0.02, gz, 10, { rz: Math.PI / 2 });
      a.cylC(wood, 0.035, 0.035, 0.22, gx + 0.2, y - 0.02, gz, 12, { rz: Math.PI / 2 });
      a.box(a.blackMetal, 0.08, 0.1, 0.03, gx - 0.2, y - 0.14, gz, { rz: 0.4 });
      a.box(a.glass, 1.46, 0.55, 0.66, gx, 1.02, gz, { sharp: true });
      a.col(gx - 0.75, gx + 0.75, gz - 0.35, gz + 0.35, 0, 1.57, true);
      const lab = signMat("gun", "#1d1d1f", "#f0e6d0", "PAINT SHOTGUN", 256, 64, "bold 30px sans-serif");
      a.plane(lab, 0.6, 0.15, gx, 0.8, gz + 0.36, {});
    }
    // 3) giant penguin (Penguin Hotel)
    {
      const px = 13.3, pz = 2.4;
      const t = a.drum(px, pz, 0.8, 0.3);
      const pk = M(null, "#1b1d22", 0, { roughness: 0.6 });
      const pw = M(FB, lit("#f4f4f0"), 0.3, { roughness: 0.9, bump: 0.5 });
      const po = M(null, "#f29a1f", 0, { roughness: 0.5 });
      a.sph(pk, 0.62, px, t + 0.72, pz, { s: [1, 1.18, 0.95] }, 28, 20);
      a.sph(pw, 0.52, px, t + 0.66, pz + 0.15, { s: [1, 1.14, 0.95] }, 28, 20);
      a.sph(pk, 0.42, px, t + 1.55, pz, {}, 24, 18);
      a.sph(pw, 0.3, px, t + 1.52, pz + 0.16, { s: [1.1, 0.9, 0.9] }, 20, 14);
      a.put(po, new THREE.ConeGeometry(0.09, 0.3, 14), px, t + 1.5, pz + 0.5, { rx: Math.PI / 2 });
      for (const s of [-1, 1]) {
        a.sph(black, 0.05, px + s * 0.13, t + 1.64, pz + 0.39);
        a.sph(pk, 0.28, px + s * 0.6, t + 0.85, pz, { s: [0.3, 1.2, 0.6], rz: s * 0.4 });
        a.sph(po, 0.2, px + s * 0.22, t + 0.07, pz + 0.3, { s: [1, 0.35, 1.4] });
      }
      a.col(px - 0.7, px + 0.7, pz - 0.7, pz + 0.7, 0, t + 1.9, true);
    }
    // 4) giant burger (Death Burger) — centre of the room behind ropes
    {
      const bx = 17, bz = -1.2;
      const t = a.drum(bx, bz, 1.0, 0.7, colStone);
      const bun = M(null, "#c98a3f", 0, { roughness: 0.55 });
      const patty = M(FB, lit("#4a2a18"), 0.3, { roughness: 0.8, bump: 1.0 });
      const cheese = M(null, "#f4c02a", 0, { roughness: 0.4 });
      const lettuce = M(null, "#5aa53a", 0, { roughness: 0.6 });
      const tomato = M(null, "#d63a2a", 0, { roughness: 0.35 });
      a.lathe(bun, [[0.001, 0], [0.62, 0], [0.7, 0.08], [0.72, 0.18], [0.001, 0.2]], bx, t, bz, 32);
      a.cyl(patty, 0.74, 0.74, 0.16, bx, t + 0.2, bz, 32);
      a.box(cheese, 1.3, 0.03, 1.3, bx, t + 0.36, bz, { ry: 0.5 });
      a.cyl(tomato, 0.66, 0.66, 0.06, bx, t + 0.39, bz, 28);
      a.put(lettuce, new THREE.TorusGeometry(0.68, 0.06, 8, 36), bx, t + 0.47, bz, { rx: Math.PI / 2, s: [1, 1, 0.6] });
      a.lathe(bun, [[0.001, 0.0], [0.72, 0], [0.74, 0.08], [0.7, 0.24], [0.58, 0.4], [0.38, 0.5], [0.001, 0.54]], bx, t + 0.5, bz, 32);
      const sesame = M(null, "#f3e6c2", 0, { roughness: 0.5 });
      for (let i = 0; i < 22; i++) {
        const an = R() * Math.PI * 2, rr = Math.sqrt(R()) * 0.55;
        const hh = 0.54 - (rr / 0.74) ** 2 * 0.4;
        a.sph(sesame, 0.025, bx + Math.cos(an) * rr, t + 0.5 + hh, bz + Math.sin(an) * rr, { s: [1, 0.5, 1.8], ry: an }, 6, 4);
      }
      a.col(bx - 0.75, bx + 0.75, bz - 0.75, bz + 0.75, 0, t + 1.05, true);
      a.ropeLine([[15.4, 0.6], [17, 0.9], [18.6, 0.6]]);
      a.cylC(pRed, 0.4, 0.4, 0.008, 18.8, 0.004, -3.0, 20, { s: [1, 1, 0.7] });
    }
    // 5) the Cube character + a petit chameleon
    {
      const cx = 21.3, cz = 2.2;
      const t = a.plinth(cx, cz, 1.3, 0.5);
      a.box(white, 1.0, 1.0, 1.0, cx, t, cz, { ry: -0.35 });
      a.sph(black, 0.07, cx - 0.2 - 0.1, t + 0.65, cz + 0.45, { s: [1, 1.3, 0.4], ry: -0.35 });
      a.sph(black, 0.07, cx + 0.2 - 0.1, t + 0.65, cz + 0.52, { s: [1, 1.3, 0.4], ry: -0.35 });
      a.col(cx - 0.65, cx + 0.65, cz - 0.65, cz + 0.65, 0, t + 1.0, true);
      // petit chameleon on the floor painted yellow (hiding!)
      const pc = pYel;
      a.put(pc, new THREE.CapsuleGeometry(0.16, 0.25, 4, 12), 19.6, 0.36, 3.9, {});
      a.sph(pc, 0.18, 19.6, 0.78, 3.9);
      a.sph(black, 0.03, 19.55, 0.8, 4.06);
      a.sph(black, 0.03, 19.67, 0.8, 4.06);
    }
    // 6) rubber duck (Sewer)
    {
      const dx = 21.8, dz = -1.6;
      const t = a.plinth(dx, dz, 0.8, 0.9);
      a.sph(pYel, 0.3, dx, t + 0.26, dz, { s: [1.25, 0.85, 1] });
      a.sph(pYel, 0.19, dx + 0.22, t + 0.62, dz);
      a.put(M(null, "#f07a1a", 0, { roughness: 0.4 }), new THREE.ConeGeometry(0.07, 0.14, 12), dx + 0.44, t + 0.6, dz, { rz: -Math.PI / 2, s: [1, 1, 0.5] });
      a.sph(black, 0.025, dx + 0.34, t + 0.7, dz + 0.1);
      a.sph(black, 0.025, dx + 0.34, t + 0.7, dz - 0.1);
    }
    // 7) the PLAY canvas on an easel (from the lobby)
    {
      const ex = 11.5, ez = -1.2;
      a.at(ex, 0, ez, Math.PI / 2 - 0.3, () => {
        a.tube(tCasing, [[-0.45, 0, 0.3], [-0.2, 1.9, 0]], 0.025, 4, 6);
        a.tube(tCasing, [[0.45, 0, 0.3], [0.2, 1.9, 0]], 0.025, 4, 6);
        a.tube(tCasing, [[0, 0, -0.55], [0, 1.8, 0]], 0.025, 4, 6);
        a.box(tCasing, 1.1, 0.05, 0.12, 0, 0.72, 0.2);
        const play = M(T("play", () => X.sign("#fbfaf6", "#e2412f", "PLAY", 256, 200, "bold 90px sans-serif")), "#fff", 0, { bump: 0 });
        a.box(white, 1.2, 0.95, 0.04, 0, 0.77, 0.2, { rx: -0.12 });
        a.plane(play, 1.12, 0.87, 0, 1.24, 0.236, { rx: -0.12 });
      });
      a.col(ex - 0.5, ex + 0.5, ez - 0.7, ez + 0.7, 0, 1.9, false);
    }
    // paint puddles + colored splats
    a.cylC(pGrn, 0.5, 0.5, 0.008, 15.2, 0.004, 3.4, 20, { s: [1, 1, 0.6] });
    a.cylC(pRed, 0.3, 0.3, 0.008, 22.5, 0.004, -6.8, 20, {});
    // posters on the walls: game paintings in black frames
    hang("+z", -8, 17, 2.4, 2.2, 1.6, "black", {}, 5);
    hang("-x", 24, -4.2, 2.3, 1.4, 1.8, "black", {}, 5);
    hang("-x", 24, 2.2, 2.3, 1.6, 1.3, "black", { label: false }, 5);
    hang("+x", 10, 3.4, 2.3, 1.4, 1.1, "black", { label: false }, 5);
  }

  // ================= East-South: Sculpture Court =================
  {
    const marbleStat = a.stoneWhite;
    // central bronze ring sculpture under the skylight
    const t0 = a.drum(17, 13, 1.1, 0.6, colStone);
    a.torus(bronze, 0.95, 0.12, 17, t0 + 1.1, 13, { ry: 0.6 }, Math.PI * 2, 40);
    a.torus(bronze, 0.6, 0.09, 17, t0 + 1.1, 13, { ry: -0.9, rx: 0.4 }, Math.PI * 2, 36);
    a.sph(M(null, "#c9a24a", 0, { metalness: 1, roughness: 0.2 }), 0.22, 17, t0 + 1.1, 13);
    a.col(16.1, 17.9, 12.1, 13.9, 0, t0 + 2.1, true);
    // amphora
    let t = a.plinth(12.2, 8.3, 0.7, 0.8);
    const terra = M(FB, lit("#b5623a"), 0.3, { roughness: 0.7, bump: 0.3 });
    a.lathe(terra, [[0.001, 0], [0.08, 0], [0.1, 0.05], [0.26, 0.35], [0.3, 0.55], [0.22, 0.85], [0.1, 0.98], [0.09, 1.1], [0.14, 1.14], [0.001, 1.14]], 12.2, t, 8.3, 28);
    a.torus(terra, 0.1, 0.018, 12.35, t + 0.98, 8.3, { ry: Math.PI / 2 }, Math.PI, 12);
    a.torus(terra, 0.1, 0.018, 12.05, t + 0.98, 8.3, { ry: Math.PI / 2 }, Math.PI, 12);
    // marble torso (Venus-like)
    t = a.plinth(21.8, 8.3, 0.7, 1.0);
    a.lathe(marbleStat, [[0.001, 0], [0.22, 0], [0.24, 0.2], [0.2, 0.45], [0.16, 0.6], [0.2, 0.8], [0.22, 0.95], [0.16, 1.1], [0.07, 1.16], [0.06, 1.25], [0.001, 1.26]], 21.8, t, 8.3, 28);
    a.sph(marbleStat, 0.11, 21.8, t + 1.38, 8.3, { s: [0.9, 1.15, 1] });
    // stacked spheres (modern)
    t = a.plinth(12.2, 17.8, 0.8, 0.5);
    const blue = M(null, "#2a4f8f", 0, { roughness: 0.15, metalness: 0.3 });
    a.sph(blue, 0.38, 12.2, t + 0.38, 17.8, {}, 24, 16);
    a.sph(a.chrome, 0.26, 12.2, t + 0.98, 17.8, {}, 24, 16);
    a.sph(M(null, "#d6412f", 0, { roughness: 0.2 }), 0.16, 12.2, t + 1.38, 17.8, {}, 20, 14);
    // obelisk
    t = a.plinth(21.8, 17.8, 0.8, 0.4, 0.8, colStone);
    const granite = M(PL, lit("#4a4644"), 0.6, { roughness: 0.3, bump: 0.4 });
    a.put(granite, new THREE.CylinderGeometry(0.12, 0.22, 2.2, 4), 21.8, t + 1.1, 17.8, { ry: Math.PI / 4 });
    a.put(granite, new THREE.ConeGeometry(0.17, 0.25, 4), 21.8, t + 2.32, 17.8, { ry: Math.PI / 4 });
    a.col(21.4, 22.2, 17.4, 18.2, 0, t + 2.45, true);
    // discus thrower-ish bronze on a tall plinth
    t = a.plinth(17, 19.1, 0.9, 0.8, 0.6);
    a.lathe(bronze, [[0.001, 0], [0.3, 0], [0.3, 0.05], [0.1, 0.1], [0.14, 0.6], [0.2, 0.95], [0.12, 1.2], [0.06, 1.28], [0.001, 1.4]], 17, t, 19.1, 20);
    a.put(bronze, new THREE.CapsuleGeometry(0.05, 0.5, 4, 8), 17.28, t + 1.1, 19.1, { rz: -1.1 });
    a.cylC(bronze, 0.1, 0.1, 0.03, 17.55, t + 1.28, 19.1, 16, { rx: Math.PI / 2 });
    a.bench(17, 9.2, 0, 2.2);
    a.bench(17, 16.6, 0, 2.2);
    hang("-x", 24, 13, 2.4, 2.4, 1.8, "gold", {}, 5);
    hang("+x", 10, 7.7, 2.2, 1.1, 1.4, "bronze", { label: false }, 5);
    hang("+x", 10, 18.7, 2.3, 1.2, 1.5, "gold", { label: false }, 5);
    hang("-z", 20, 14.3, 2.4, 1.8, 1.4, "gold", { label: false }, 5);
    hang("+z", 6, 21.4, 2.3, 1.6, 1.2, "dark", { label: false }, 5);
    a.plant(23.1, 6.9, 1.0, potM, leaf, leaf2);
    a.plant(10.9, 12.9, 1.0, potM, leaf, leaf2);
  }

  // ================= World Miniatures =================
  {
    const sand = M(PL, lit("#d8b878"), 0.5, { roughness: 0.9, bump: 0.6 });
    const sandstone = M(PL, lit("#cfae72"), 0.3, { roughness: 0.8, bump: 0.8 });
    const grass = M(FB, lit("#5b8a3a"), 0.3, { roughness: 0.9, bump: 0.6 });
    const iron = M(T("lattice", () => latticeTex("#6b5a44")), "#fff", 0, { roughness: 0.6, metalness: 0.5, bump: 0 });
    Object.assign(iron.m, { transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
    const redIron = M(T("latticeR", () => latticeTex("#e2522a")), "#fff", 0, { roughness: 0.5, bump: 0 });
    Object.assign(redIron.m, { transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
    const whiteIron = M(T("latticeW", () => latticeTex("#f2f0ea")), "#fff", 0, { roughness: 0.5, bump: 0 });
    Object.assign(whiteIron.m, { transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
    const arcade = M(T("arcade", () => arcadeTex("#e6e0d0")), "#fff", 0, { roughness: 0.6, bump: 0 });
    Object.assign(arcade.m, { transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
    const travM = M(T("colos", () => arcadeTex("#c9a978")), "#fff", 0, { roughness: 0.8, bump: 0 });
    Object.assign(travM.m, { transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
    const copper = M(FB, lit("#6fae98"), 0.3, { roughness: 0.55, metalness: 0.3, bump: 0.4 });
    const whiteM = M(PL, lit("#f4f1ea"), 0.4, { roughness: 0.4, bump: 0.2 });
    const clock = M(T("clock", clockTex), "#fff", 0, { roughness: 0.4, bump: 0, emissive: "#ffe9b0", emissiveIntensity: 0.25 });
    const snow = M(null, "#f4f6f8", 0, { roughness: 0.6 });
    const fuji = M(FB, lit("#5a6f8a"), 0.4, { roughness: 0.8, bump: 0.6 });
    const moai = M(PL, lit("#6f665c"), 0.3, { roughness: 0.9, bump: 1.0 });
    const flame = M(null, "#ffcf5a", 0, { emissive: "#ffb040", emissiveIntensity: 1.5 });
    const torii = M(null, "#c8321f", 0, { roughness: 0.5 });

    /** display table with navy cloth; returns top */
    const table = (x: number, z: number, w: number, d: number, h = 0.75, glass = false, gh = 1.0) => {
      a.box(tWains, w, h - 0.04, d, x, 0, z);
      a.box(tBase, w - 0.06, 0.1, d - 0.06, x, 0, z, { sharp: true });
      a.box(cloth, w + 0.04, 0.04, d + 0.04, x, h - 0.04, z);
      if (glass) {
        a.box(a.glass, w - 0.04, gh, d - 0.04, x, h, z, { sharp: true });
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) a.box(a.chrome, 0.02, gh, 0.02, x + sx * (w / 2 - 0.03), h, z + sz * (d / 2 - 0.03), { sharp: true });
        a.box(a.chrome, w - 0.02, 0.02, d - 0.02, x, h + gh, z, { sharp: true });
      }
      a.col(x - w / 2, x + w / 2, z - d / 2, z + d / 2, 0, h + (glass ? gh : 0), true);
      const lab = a.placardM;
      a.box(lab, 0.3, 0.18, 0.01, x, h - 0.32, z + d / 2 + 0.03, { sharp: true });
      return h;
    };

    // Eiffel Tower (big, on a low round platform)
    {
      const ex = -4, ez = -16.3;
      const t = a.drum(ex, ez, 1.3, 0.3, colStone);
      a.box(grass, 1.9, 0.02, 1.9, ex, t, ez);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 4, 0));
      const frus = (rb: number, rt: number, h: number, y: number, m: Mat) => a.put(m, new THREE.CylinderGeometry(rt, rb, h, 4, 1, true), ex, t + y + h / 2, ez, { q });
      // legs: four splayed lattice columns
      for (let i = 0; i < 4; i++) {
        const an = Math.PI / 4 + (i * Math.PI) / 2;
        const bx = ex + Math.cos(an) * 0.95, bz = ez + Math.sin(an) * 0.95;
        const tx = ex + Math.cos(an) * 0.42, tz = ez + Math.sin(an) * 0.42;
        const len = Math.hypot(bx - tx, bz - tz, 0.75);
        const qq = new THREE.Quaternion().setFromUnitVectors(up, new THREE.Vector3(tx - bx, 0.75, tz - bz).normalize());
        a.put(iron, new THREE.CylinderGeometry(0.1, 0.16, len, 4, 1, true), (bx + tx) / 2, t + 0.375, (bz + tz) / 2, { q: qq });
      }
      // first-level arches
      for (let i = 0; i < 4; i++) a.torus(iron, 0.34, 0.025, ex + Math.cos((i * Math.PI) / 2) * 0.62, t + 0.45, ez + Math.sin((i * Math.PI) / 2) * 0.62, { ry: (i * Math.PI) / 2 + Math.PI / 2 }, Math.PI, 14);
      a.box(iron, 1.05, 0.08, 1.05, ex, t + 0.75, ez, { sharp: true });
      frus(0.55, 0.3, 0.8, 0.83, iron);
      a.box(iron, 0.62, 0.06, 0.62, ex, t + 1.63, ez, { sharp: true });
      frus(0.3, 0.06, 1.35, 1.69, iron);
      a.box(iron, 0.14, 0.08, 0.14, ex, t + 3.04, ez, { sharp: true });
      a.cyl(iron, 0.01, 0.02, 0.25, ex, t + 3.1, ez, 6);
      a.col(ex - 1.3, ex + 1.3, ez - 1.3, ez + 1.3, 0, t, true);
      a.col(ex - 0.5, ex + 0.5, ez - 0.5, ez + 0.5, t, t + 3.2, true);
    }
    // Colosseum
    {
      const cx = 2, cz = -16.8;
      const t = table(cx, cz, 2.0, 1.6);
      a.box(sand, 1.9, 0.02, 1.5, cx, t, cz);
      a.put(travM, new THREE.CylinderGeometry(0.75, 0.75, 0.55, 40, 1, true, 0, Math.PI * 1.35), cx, t + 0.29, cz, { s: [1, 1, 0.8], uv: [0, 0, 4, 1] });
      a.put(travM, new THREE.CylinderGeometry(0.75, 0.75, 0.36, 40, 1, true, Math.PI * 1.35, Math.PI * 0.65), cx, t + 0.2, cz, { s: [1, 1, 0.8], uv: [0, 0, 2, 0.66] });
      a.put(travM, new THREE.CylinderGeometry(0.55, 0.55, 0.3, 36, 1, true), cx, t + 0.17, cz, { s: [1, 1, 0.78], uv: [0, 0, 3, 0.6] });
      a.cyl(sand, 0.42, 0.42, 0.03, cx, t, cz, 28);
    }
    // Leaning Tower of Pisa (glass case)
    {
      const px = 8, pz = -16.8;
      const t = table(px, pz, 1.4, 1.4, 0.75, true, 1.35);
      a.box(grass, 1.3, 0.02, 1.3, px, t, pz);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.09));
      const tilt = (y: number) => [px - Math.sin(0.09) * y, t + Math.cos(0.09) * y] as const;
      for (let i = 0; i < 7; i++) {
        const [xx, yy] = tilt(0.1 + i * 0.14 + 0.07);
        a.put(arcade, new THREE.CylinderGeometry(0.2, 0.2, 0.13, 20, 1, true), xx, yy, pz, { q, uv: [0, 0, 3, 1] });
        const [rx, ry2] = tilt(0.1 + i * 0.14);
        a.put(whiteM, new THREE.CylinderGeometry(0.215, 0.215, 0.02, 20), rx, ry2, pz, { q });
      }
      const [cx0, cy0] = tilt(0.05);
      a.put(whiteM, new THREE.CylinderGeometry(0.22, 0.22, 0.1, 20), cx0, cy0, pz, { q });
      a.put(whiteM, new THREE.CylinderGeometry(0.15, 0.15, 0.95, 16), ...[tilt(0.55)[0], tilt(0.55)[1], pz] as V3, { q });
      const [bx, by] = tilt(1.13);
      a.put(arcade, new THREE.CylinderGeometry(0.14, 0.14, 0.14, 16, 1, true), bx, by, pz, { q, uv: [0, 0, 2, 1] });
      const [cx1, cy1] = tilt(1.21);
      a.put(whiteM, new THREE.CylinderGeometry(0.15, 0.15, 0.02, 16), cx1, cy1, pz, { q });
    }
    // Taj Mahal (glass case)
    {
      const tx = 14, tz = -16.8;
      const t = table(tx, tz, 1.8, 1.4, 0.75, true, 1.1);
      a.box(whiteM, 1.4, 0.08, 1.1, tx, t, tz);
      a.put(whiteM, new THREE.CylinderGeometry(0.34, 0.34, 0.42, 8), tx, t + 0.29, tz, { ry: Math.PI / 8 });
      a.cyl(whiteM, 0.17, 0.17, 0.1, tx, t + 0.5, tz, 20);
      a.lathe(whiteM, [[0.17, 0], [0.24, 0.08], [0.26, 0.18], [0.2, 0.3], [0.08, 0.38], [0.02, 0.44], [0.005, 0.5]], tx, t + 0.6, tz, 24);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        a.cyl(whiteM, 0.035, 0.04, 0.62, tx + sx * 0.6, t + 0.08, tz + sz * 0.46, 10);
        a.sph(whiteM, 0.05, tx + sx * 0.6, t + 0.72, tz + sz * 0.46, {}, 10, 8);
        a.lathe(whiteM, [[0.06, 0], [0.08, 0.04], [0.04, 0.1], [0.005, 0.14]], tx + sx * 0.24, t + 0.5, tz + sz * 0.24, 12);
      }
      const pool = M(null, "#3e7fb0", 0, { roughness: 0.05 });
      a.box(pool, 0.14, 0.01, 0.4, tx, t, tz + 0.72);
    }
    // Big Ben
    {
      const bx = 20, bz = -16.8;
      const t = table(bx, bz, 1.8, 1.4);
      a.box(sandstone, 1.3, 0.35, 0.4, bx - 0.25, t, bz + 0.2);
      a.box(sandstone, 0.3, 1.5, 0.3, bx + 0.45, t, bz - 0.2);
      a.box(sandstone, 0.36, 0.3, 0.36, bx + 0.45, t + 1.5, bz - 0.2);
      for (const [ry, ox, oz] of [[0, 0, 0.181], [Math.PI, 0, -0.181], [Math.PI / 2, 0.181, 0], [-Math.PI / 2, -0.181, 0]] as const)
        a.plane(clock, 0.26, 0.26, bx + 0.45 + ox, t + 1.65, bz - 0.2 + oz, { ry });
      a.put(M(null, "#3b4a3a", 0, { roughness: 0.5, metalness: 0.4 }), new THREE.ConeGeometry(0.22, 0.55, 4), bx + 0.45, t + 2.07, bz - 0.2, { ry: Math.PI / 4 });
      for (let i = 0; i < 6; i++) a.put(sandstone, new THREE.ConeGeometry(0.03, 0.12, 4), bx - 0.85 + i * 0.24, t + 0.41, bz + 0.2, {});
    }
    // Statue of Liberty
    {
      const lx = -4.3, lz = -11.3;
      const t = table(lx, lz, 1.4, 1.4, 0.6);
      a.box(sandstone, 0.7, 0.35, 0.7, lx, t, lz);
      a.box(sandstone, 0.5, 0.35, 0.5, lx, t + 0.35, lz);
      const y0 = t + 0.7;
      a.lathe(copper, [[0.001, 0], [0.2, 0], [0.19, 0.3], [0.15, 0.7], [0.12, 0.95], [0.08, 1.02], [0.001, 1.04]], lx, y0, lz, 20);
      a.sph(copper, 0.085, lx, y0 + 1.12, lz, {}, 14, 10);
      for (let i = 0; i < 7; i++) {
        const an = -1.2 + i * 0.4;
        a.put(copper, new THREE.ConeGeometry(0.015, 0.1, 5), lx + Math.sin(an) * 0.09, y0 + 1.19, lz + Math.cos(an) * 0.09, { rx: Math.cos(an) * 0.8, rz: -Math.sin(an) * 0.8 });
      }
      a.put(copper, new THREE.CapsuleGeometry(0.035, 0.4, 4, 8), lx + 0.13, y0 + 1.2, lz, { rz: -0.15 });
      a.lathe(copper, [[0.001, 0], [0.04, 0.02], [0.05, 0.08], [0.001, 0.09]], lx + 0.16, y0 + 1.45, lz, 10);
      a.sph(flame, 0.045, lx + 0.16, y0 + 1.58, lz, { s: [1, 1.4, 1] }, 10, 8);
      a.box(copper, 0.14, 0.18, 0.04, lx - 0.12, y0 + 0.7, lz + 0.1, { rz: 0.2 });
    }
    // Pyramids of Giza + sphinx
    {
      const px = 5, pz = -11.3;
      const t = table(px, pz, 2.0, 1.5);
      a.box(sand, 1.92, 0.03, 1.42, px, t, pz);
      a.put(sandstone, new THREE.ConeGeometry(0.55, 0.7, 4), px - 0.35, t + 0.38, pz - 0.2, { ry: Math.PI / 4 });
      a.put(sandstone, new THREE.ConeGeometry(0.45, 0.58, 4), px + 0.45, t + 0.32, pz - 0.05, { ry: Math.PI / 4 + 0.1 });
      a.put(sandstone, new THREE.ConeGeometry(0.25, 0.32, 4), px + 0.1, t + 0.19, pz + 0.45, { ry: Math.PI / 4 });
      a.box(sandstone, 0.3, 0.08, 0.1, px - 0.6, t + 0.03, pz + 0.45);
      a.box(sandstone, 0.1, 0.12, 0.1, px - 0.7, t + 0.08, pz + 0.45);
    }
    // Tokyo Tower (big, floor)
    {
      const tx = 11, tz = -11.4;
      const t = a.drum(tx, tz, 1.0, 0.3, colStone);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 4, 0));
      const seg = [[0.8, 0.5, 0.9, redIron], [0.5, 0.34, 0.5, whiteIron], [0.34, 0.2, 0.5, redIron], [0.2, 0.1, 0.45, whiteIron], [0.1, 0.05, 0.4, redIron]] as const;
      let y = t;
      for (const [rb, rt, h, m] of seg) {
        a.put(m, new THREE.CylinderGeometry(rt, rb, h, 4, 1, true), tx, y + h / 2, tz, { q });
        y += h;
        a.box(m === redIron ? whiteM : torii, rt * 1.5 + 0.06, 0.05, rt * 1.5 + 0.06, tx, y - 0.02, tz, { sharp: true });
      }
      a.cyl(torii, 0.012, 0.025, 0.5, tx, y, tz, 8);
      a.col(tx - 0.65, tx + 0.65, tz - 0.65, tz + 0.65, t, y + 0.5, true);
    }
    // Mt Fuji with a torii
    {
      const fx = 17, fz = -11.3;
      const t = table(fx, fz, 1.8, 1.5);
      a.box(grass, 1.72, 0.02, 1.42, fx, t, fz);
      a.lathe(fuji, [[0.001, 0], [0.72, 0], [0.55, 0.08], [0.32, 0.28], [0.2, 0.42], [0.001, 0.42]], fx, t + 0.02, fz - 0.1, 28);
      a.lathe(snow, [[0.201, 0], [0.13, 0.08], [0.1, 0.12], [0.001, 0.13]], fx, t + 0.44, fz - 0.1, 28);
      a.lathe(snow, [[0.29, 0.0], [0.2, 0.14], [0.2, 0.14], [0.0, 0.14]], fx, t + 0.3, fz - 0.1, 28, { s: [1.01, 1, 1.01] });
      for (const s of [-1, 1]) a.cyl(torii, 0.015, 0.015, 0.28, fx + 0.5 + s * 0.1, t + 0.02, fz + 0.5, 8);
      a.box(torii, 0.34, 0.03, 0.04, fx + 0.5, t + 0.28, fz + 0.5);
      a.box(torii, 0.26, 0.02, 0.03, fx + 0.5, t + 0.22, fz + 0.5);
    }
    // Moai
    {
      const mx = 22.4, mz = -11.8;
      const t = table(mx, mz, 1.6, 2.4, 0.5);
      a.box(grass, 1.52, 0.02, 2.32, mx, t, mz);
      for (let i = 0; i < 3; i++) {
        const zz = mz - 0.7 + i * 0.7;
        a.box(moai, 0.32, 0.55, 0.26, mx, t, zz, { ry: -Math.PI / 2 });
        a.box(moai, 0.36, 0.12, 0.3, mx - 0.02, t + 0.55, zz, { ry: -Math.PI / 2 });
        a.box(moai, 0.1, 0.22, 0.08, mx - 0.16, t + 0.25, zz, { ry: -Math.PI / 2 });
      }
    }
    // benches + wall paintings in the miniature hall
    a.bench(8, -9.3, 0, 2.0);
    hang("+z", -20, -6.2, 2.4, 1.6, 1.2, "gold", { label: false }, 5);
    hang("+z", -20, 5, 2.4, 2.0, 1.5, "gold", {}, 5);
    hang("+z", -20, 11, 2.4, 1.6, 1.2, "gold", { label: false }, 5);
    hang("+z", -20, 17, 2.4, 2.0, 1.5, "gold", {}, 5);
    hang("-x", 24, -16.5, 2.4, 1.6, 1.3, "gold", { label: false }, 5);
    const sMap = signMat("world", "#1f2a33", "#e8dcc0", "AROUND THE WORLD", 512, 96, "bold 48px Georgia, serif");
    a.plane(sMap, 3.2, 0.6, -4, 3.6, -8.17, { ry: Math.PI });
  }

  // ================= extra density =================
  {
    const vaseA = M(null, "#1f3d6b", 0, { roughness: 0.15 });
    const vaseB = M(FB, lit("#8fb3a0"), 0.3, { roughness: 0.2, bump: 0.2 });
    const vaseC = M(null, "#b8462e", 0, { roughness: 0.3 });
    const vases = [vaseA, vaseB, vaseC];
    const vase = (x: number, z: number, i: number, h = 1.0) => {
      const t = a.plinth(x, z, 0.5, h, 0.5, i % 2 ? a.plinthWhite : colStone);
      const m = vases[i % 3];
      const pr: [number, number][][] = [
        [[0.001, 0], [0.09, 0], [0.16, 0.12], [0.2, 0.3], [0.14, 0.46], [0.06, 0.54], [0.08, 0.62], [0.001, 0.62]],
        [[0.001, 0], [0.1, 0], [0.12, 0.05], [0.18, 0.2], [0.18, 0.3], [0.1, 0.4], [0.05, 0.62], [0.07, 0.68], [0.001, 0.68]],
        [[0.001, 0], [0.12, 0], [0.2, 0.08], [0.22, 0.18], [0.16, 0.28], [0.18, 0.32], [0.001, 0.32]],
      ];
      a.lathe(m, pr[i % 3], x, t, z, 24);
    };
    // Grand Hall: vases between columns + stanchions
    vase(-8.6, 5.6, 0); vase(8.6, 5.6, 1); vase(-8.6, 9.6, 2); vase(8.6, 9.6, 0);
    a.bench(-4.3, 7.8, Math.PI / 2, 2.0);
    a.bench(4.3, 7.8, Math.PI / 2, 2.0);
    a.ropeLine([[-2.4, -0.2], [0, 0.1], [2.4, -0.2]]);
    // Lobby: donation box, sculpture, extra benches
    a.box(a.glass, 0.4, 0.5, 0.4, 3.0, 1.0, 13.4, { sharp: true });
    a.box(tWains, 0.45, 1.0, 0.45, 3.0, 0, 13.4, { solid: true });
    a.bench(-6.2, 13.3, 0, 2.0);
    vase(-9.0, 13.0, 1, 1.1);
    // World Paintings: vitrine table with ceramics + busts
    {
      const vx = -20.5, vz = 3.4;
      a.box(tWains, 2.0, 0.85, 0.8, vx, 0, vz, { solid: true });
      a.box(cloth, 1.96, 0.02, 0.76, vx, 0.85, vz, { sharp: true });
      a.box(a.glass, 1.96, 0.55, 0.76, vx, 0.87, vz, { sharp: true });
      a.col(vx - 1, vx + 1, vz - 0.4, vz + 0.4, 0, 1.42, true);
      for (let i = 0; i < 4; i++) a.lathe(vases[i % 3], [[0.001, 0], [0.05, 0], [0.09, 0.08], [0.06, 0.2], [0.03, 0.26], [0.001, 0.26]], vx - 0.7 + i * 0.46, 0.87, vz, 16);
      vase(-23.1, -2.4, 2); vase(-12.6, -6.9, 0);
    }
    // Impressionist gallery: easel with a copy-in-progress + stool
    {
      const ex = -12.6, ez = 15.2;
      a.tube(tCasing, [[ex - 0.4, 0, ez + 0.3], [ex - 0.2, 1.8, ez]], 0.022, 4, 6);
      a.tube(tCasing, [[ex + 0.4, 0, ez + 0.3], [ex + 0.2, 1.8, ez]], 0.022, 4, 6);
      a.tube(tCasing, [[ex, 0, ez - 0.5], [ex, 1.7, ez]], 0.022, 4, 6);
      a.box(tCasing, 0.9, 0.04, 0.1, ex, 0.75, ez + 0.2);
      a.painting(ex, 1.3, ez + 0.2, 0, 0.8, 0.6, "black", { label: false, frame: 0.03 });
      a.cyl(tCasing, 0.18, 0.18, 0.05, ex + 0.2, 0.55, ez + 1.1, 16);
      for (let i = 0; i < 3; i++) a.cyl(tCasing, 0.015, 0.02, 0.55, ex + 0.2 + Math.cos(i * 2.1) * 0.13, 0, ez + 1.1 + Math.sin(i * 2.1) * 0.13, 6);
      a.col(ex - 0.45, ex + 0.45, ez - 0.5, ez + 1.3, 0, 1.8, false);
      vase(-23.2, 19.1, 1);
    }
    // Miniatures: Parthenon diorama + rope round the Eiffel tower
    {
      const px = 0.6, pz = -12.3;
      const tb = 0.75;
      a.box(tWains, 1.8, tb - 0.04, 1.3, px, 0, pz);
      a.box(cloth, 1.84, 0.04, 1.34, px, tb - 0.04, pz);
      a.col(px - 0.9, px + 0.9, pz - 0.65, pz + 0.65, 0, tb, true);
      const st = M(PL, lit("#e6dcc6"), 0.3, { roughness: 0.8, bump: 0.5 });
      for (let i = 0; i < 3; i++) a.box(st, 1.3 - i * 0.08, 0.04, 0.8 - i * 0.08, px, tb + i * 0.04, pz, { sharp: true });
      const y0 = tb + 0.12;
      for (let i = 0; i < 8; i++) for (const s of [-1, 1]) a.cyl(st, 0.025, 0.028, 0.4, px - 0.5 + i * (1.0 / 7), y0, pz + s * 0.26, 10);
      for (const s of [-1, 1]) for (let j = 1; j < 3; j++) a.cyl(st, 0.025, 0.028, 0.4, px + s * 0.5, y0, pz - 0.26 + j * 0.173, 10);
      a.box(st, 1.12, 0.07, 0.62, px, y0 + 0.4, pz, { sharp: true });
      const roof = new THREE.Shape();
      roof.moveTo(-0.31, 0); roof.lineTo(0.31, 0); roof.lineTo(0, 0.13); roof.lineTo(-0.31, 0);
      a.put(st, new THREE.ExtrudeGeometry(roof, { depth: 1.12, bevelEnabled: false }), px - 0.56, y0 + 0.47, pz, { ry: Math.PI / 2 });
      a.box(a.placardM, 0.3, 0.18, 0.01, px, tb - 0.32, pz + 0.68, { sharp: true });
      a.ropeLine([[-6.2, -13.6], [-4, -13.2], [-1.8, -13.6]]);
      a.bench(14, -9.3, 0, 2.0);
      a.bench(-1.5, -19.1, 0, 2.0);
    }
    // Sculpture court + meccha exhibit extras
    vase(23.1, 10.6, 0); vase(23.1, 15.4, 2);
    a.bench(17, -6.8, 0, 1.8);
    vase(23.1, 5.1, 1);
  }

  a.flush();

  // ================= spawns / rooms =================
  const hunterSpawns: THREE.Vector3[] = [];
  for (let i = 0; i < 9; i++) hunterSpawns.push(new THREE.Vector3(-1.3 + (i % 3) * 1.3, 0, 14.8 + Math.floor(i / 3) * 1.2));
  const hiderSpawns: THREE.Vector3[] = [];
  for (let i = 0; i < 24; i++) hiderSpawns.push(new THREE.Vector3(-4.5 + (i % 6) * 1.8, 0, 4.3 + Math.floor(i / 6) * 1.5));
  k.room("Lobby", -10, 10, 12, 20);
  k.room("Grand Hall", -10, 10, -8, 12);
  k.room("Impressionist Gallery", -24, -10, 6, 20);
  k.room("World Paintings", -24, -10, -8, 6);
  k.room("Meccha Exhibit", 10, 24, -8, 6);
  k.room("Sculpture Court", 10, 24, 6, 20);
  k.room("Lesser Wing", -24, -8, -20, -8);
  k.room("World Miniatures", -8, 24, -20, -8);

  return k.finish({
    id: "museum",
    name: "Art Museum",
    bounds: { minX: -23.8, maxX: 23.8, minZ: -19.8, maxZ: 19.8 },
    hunterSpawns,
    hiderSpawns,
    preview: { pos: [7.6, 3.4, 10.6], look: [-2.5, 2.6, -5.5], fov: 62 },
    lighting: {
      sky: "#e4edf4",
      hemi: ["#fff6ea", "#6d5f50", 0.55],
      sun: { color: "#fff1dc", int: 3.2, pos: [-9, 30, 12] },
      points: [
        { pos: [0, 6.2, 2], color: "#ffe6c4", int: 110, dist: 26 },
        { pos: [-17, 4.3, -1], color: "#ffd9a8", int: 45, dist: 16 },
        { pos: [-17, 4.3, 13], color: "#ffe2bc", int: 40, dist: 16 },
        { pos: [17, 4.3, -1], color: "#f4f6ff", int: 45, dist: 16 },
        { pos: [17, 4.3, 13], color: "#ffe9cc", int: 35, dist: 16 },
        { pos: [8, 4.3, -14], color: "#f4f6ff", int: 60, dist: 22 },
      ],
      exposure: 1.0,
      env: 0.55,
      hdri: "hall",
    },
  });
}

// ---------------------------------------------------------------- local textures
/** iron lattice: transparent holes between cross-braced bars (native UVs) */
function latticeTex(col: string): X.PaintTex {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.clearRect(0, 0, 128, 128);
  g.strokeStyle = col;
  g.lineWidth = 5;
  g.strokeRect(0, 0, 128, 128);
  g.lineWidth = 3;
  for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(0, i * 32); g.lineTo(128, i * 32); g.stroke(); }
  for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, 128); g.stroke(); }
  g.lineWidth = 2;
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    g.beginPath(); g.moveTo(x * 32, y * 32); g.lineTo(x * 32 + 32, y * 32 + 32); g.moveTo(x * 32 + 32, y * 32); g.lineTo(x * 32, y * 32 + 32); g.stroke();
  }
  return wrapCanvas(c);
}
/** arcade (arched openings) for Pisa / Colosseum */
function arcadeTex(col: string): X.PaintTex {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 64;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.fillStyle = col;
  g.fillRect(0, 0, 128, 64);
  g.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 4; i++) {
    const x = i * 32 + 16;
    g.beginPath();
    g.moveTo(x - 10, 60); g.lineTo(x - 10, 26); g.arc(x, 26, 10, Math.PI, 0); g.lineTo(x + 10, 60); g.closePath();
    g.fill();
  }
  g.globalCompositeOperation = "source-over";
  g.fillStyle = "rgba(0,0,0,0.15)";
  g.fillRect(0, 0, 128, 4);
  return wrapCanvas(c);
}
function clockTex(): X.PaintTex {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.fillStyle = "#6b5a3a";
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = "#f4ecd6";
  g.beginPath(); g.arc(64, 64, 52, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "#222";
  g.lineWidth = 3;
  for (let i = 0; i < 12; i++) { const an = (i / 12) * Math.PI * 2; g.beginPath(); g.moveTo(64 + Math.cos(an) * 42, 64 + Math.sin(an) * 42); g.lineTo(64 + Math.cos(an) * 50, 64 + Math.sin(an) * 50); g.stroke(); }
  g.lineWidth = 4;
  g.beginPath(); g.moveTo(64, 64); g.lineTo(64, 30); g.moveTo(64, 64); g.lineTo(88, 70); g.stroke();
  return wrapCanvas(c);
}
function wrapCanvas(c: HTMLCanvasElement): X.PaintTex {
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return { canvas: c, ctx, texture, data: ctx.getImageData(0, 0, c.width, c.height), repeat: [1, 1] };
}
