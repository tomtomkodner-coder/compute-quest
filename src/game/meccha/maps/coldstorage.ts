// Cold Storage — a working meat cold-store at night. Hunters come in through the LOADING DOCK (two roll-up
// shutters, pallet racking, a yellow forklift, wrapped pallets, pallet jack, wheelie bins), which opens through PVC
// strip curtains into COLD ROOM 2 (+2 °C: chrome wire racks full of cartons, crates and vacuum packs, two overhead
// meat rails with hanging pig halves and beef quarters, roll cages, a floor scale). North of it lie the BLAST
// FREEZER (-25 °C: white insulated panels, frost everywhere, frozen pallets, fish on ice, an evaporator with
// icicles) and the BUTCHERY (grey-green embossed tile walls, stainless prep tables, bandsaw, mincer, sinks, knife
// rail, hooks with meat). The east wing holds the MACHINE ROOM (ammonia compressors, gas cylinder cluster,
// electrical cabinets, frosted pipe runs, a spinning condenser fan, workbench) and the OFFICE / BREAK ROOM.
import * as THREE from "three";
import * as T from "../textures";
import * as C from "./tex/coldstorage";
import { Batch, Fr, IList, boxGeo, chamferGeo, latheG, tubeG, place, beam, mergeG, type V3t, type BG } from "./tex/coldstorage";
import { Kit, type Mat, type World } from "./kit";

export function buildColdStorage(): World {
  C.resetGeoCache();
  const H = 4.5, DOOR = 2.6;
  const k = new Kit(H, DOOR);
  C.patchKit(k);
  const B = new Batch();
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const rr = (a: number, b: number) => a + rnd() * (b - a);
  const pick = <X,>(a: X[]) => a[Math.floor(rnd() * a.length)];
  const F = (x: number, z: number, ry = 0) => new Fr(k, B, x, z, ry);
  const W = F(0, 0, 0);

  // ---------------------------------------------------------------- materials
  const tTile = k.tex("cs-tile", () => C.csTile("#a3b3a9", 3));
  const tFloor = k.tex("cs-floor", () => C.csFloor("#8d9392", 5));
  const tPanel = k.tex("cs-panel", () => C.csPanel("#e9ecec", 7));
  const tBlock = k.tex("cs-block", () => C.csBlock("#b9bdb5", 9));
  const tPaint = k.tex("cs-paint", () => C.csPaintMetal(13, 1));
  const tPaintClean = k.tex("cs-paint2", () => C.csPaintMetal(15, 0.25));
  const tSteel = k.tex("cs-steel", () => C.csSteel(11));
  const mTileWall = k.mat(tTile, "#ffffff", [1, 1], { roughness: 0.3, bump: 0.45 });
  const mTileFloor = k.mat(tTile, "#7d8680", [1, 1], { roughness: 0.4, bump: 0.5 });
  const mFloor = k.mat(tFloor, "#ffffff", [1, 1], { roughness: 0.42, bump: 0.35 });
  const mFloorDock = k.mat(tFloor, "#a39e92", [1, 1], { roughness: 0.62, bump: 0.45 });
  const mFloorFrz = k.mat(tFloor, "#d6e2ea", [1, 1], { roughness: 0.3, bump: 0.3 });
  const mFloorMach = k.mat(tFloor, "#7a7c78", [1, 1], { roughness: 0.55, bump: 0.4 });
  const mFloorOff = k.mat(k.tex("cs-vinyl", () => C.csFloor("#9c9a8c", 21)), "#c9c2ae", [1, 1], { roughness: 0.35, bump: 0.2 });
  const mPanel = k.mat(tPanel, "#ffffff", [1, 1], { roughness: 0.45, bump: 0.35 });
  const mPanelCold = k.mat(tPanel, "#e6eef4", [1, 1], { roughness: 0.3, bump: 0.35 });
  const mCeil = k.mat(tPanel, "#d9dcdc", [1, 1], { roughness: 0.6, bump: 0.3 });
  const mBlock = k.mat(tBlock, "#ffffff", [1, 1], { roughness: 0.85, bump: 0.35 });
  const mBlockBlue = k.mat(tBlock, "#7f9bb3", [1, 1], { roughness: 0.7, bump: 0.6 });
  const mBlockWarm = k.mat(tBlock, "#e6dcc4", [1, 1], { roughness: 0.8, bump: 0.4 });
  const mCore = k.mat(tBlock, "#9a9c96", [1, 1], { roughness: 0.9, bump: 0.4 });
  const mSteel = k.mat(tSteel, "#ffffff", [1, 1], { metalness: 0.9, roughness: 0.32, bump: 0.1 });
  const mChrome = k.mat(null, "#d8dde0", [1, 1], { metalness: 1, roughness: 0.18 });
  const mGalv = k.mat(tPaint, "#a9adae", [1, 1], { metalness: 0.7, roughness: 0.45, bump: 0.25 });
  const mYellow = k.mat(tPaint, "#e7b420", [1, 1], { metalness: 0.25, roughness: 0.45, bump: 0.3 });
  const mYellowClean = k.mat(tPaintClean, "#f0bd1c", [1, 1], { metalness: 0.3, roughness: 0.35, bump: 0.2 });
  const mBlueP = k.mat(tPaint, "#2a5aa8", [1, 1], { metalness: 0.4, roughness: 0.45, bump: 0.3 });
  const mOrange = k.mat(tPaint, "#e0621f", [1, 1], { metalness: 0.4, roughness: 0.45, bump: 0.3 });
  const mRedP = k.mat(tPaintClean, "#c3221f", [1, 1], { metalness: 0.3, roughness: 0.35, bump: 0.2 });
  const mGreenP = k.mat(tPaint, "#3d6a4a", [1, 1], { metalness: 0.4, roughness: 0.5, bump: 0.3 });
  const mDarkP = k.mat(tPaint, "#3b3f42", [1, 1], { metalness: 0.5, roughness: 0.5, bump: 0.3 });
  const mGreyP = k.mat(tPaintClean, "#b7bbb8", [1, 1], { metalness: 0.4, roughness: 0.45, bump: 0.2 });
  const mCreamP = k.mat(tPaintClean, "#dcd8c8", [1, 1], { metalness: 0.3, roughness: 0.4, bump: 0.2 });
  const mRubber = k.mat(null, "#1c1c1e", [1, 1], { roughness: 0.85 });
  const mBlackPl = k.mat(null, "#232427", [1, 1], { roughness: 0.45 });
  const mWhitePl = k.mat(k.tex("cs-hdpe", () => T.noise("#f1f1ec", 0.05, 4, 1500)), "#ffffff", [1, 1], { roughness: 0.5, bump: 0.15 });
  const mMeat = k.mat(k.tex("cs-meat", () => C.csMeat(17)), "#ffffff", [1, 1], { roughness: 0.38, bump: 0.5 });
  const mCarcass = k.mat(k.tex("cs-carc", () => C.csCarcass(19)), "#ffffff", [1, 1], { roughness: 0.42, bump: 0.4 });
  const mFat = k.mat(null, "#efe3d2", [1, 1], { roughness: 0.4 });
  const mRibs = k.mat(k.tex("cs-ribs", () => C.csRibs(20)), "#ffffff", [1, 1], { roughness: 0.35, bump: 0.5 });
  mRibs.m.side = THREE.DoubleSide;
  const carton = {
    beef: k.mat(k.tex("cs-cb", () => C.csCarton("beef", 23)), "#ffffff", [1, 1], { roughness: 0.85, bump: 0.25 }),
    poultry: k.mat(k.tex("cs-cp", () => C.csCarton("poultry", 24)), "#ffffff", [1, 1], { roughness: 0.8, bump: 0.25 }),
    fish: k.mat(k.tex("cs-cf", () => C.csCarton("fish", 25)), "#ffffff", [1, 1], { roughness: 0.8, bump: 0.25 }),
    fries: k.mat(k.tex("cs-cr", () => C.csCarton("fries", 26)), "#ffffff", [1, 1], { roughness: 0.85, bump: 0.25 }),
    plain: k.mat(k.tex("cs-cx", () => C.csCarton("plain", 27)), "#ffffff", [1, 1], { roughness: 0.9, bump: 0.3 }),
  };
  const cartonKinds = Object.values(carton);
  const mCrate = k.mat(k.tex("cs-crate", C.csCrate), "#ffffff", [1, 1], { roughness: 0.5, bump: 0.3 });
  const mPallet = k.mat(k.tex("cs-pallet", () => C.csPallet(43)), "#ffffff", [1, 1], { roughness: 0.9, bump: 0.6 });
  const mWrap = k.mat(k.tex("cs-wrap", C.csWrap), "#ffffff", [1, 1], { roughness: 0.15, bump: 0 });
  Object.assign(mWrap.m, { transparent: true, opacity: 0.55, depthWrite: false, alphaTest: 0, side: THREE.DoubleSide });
  B.noShadow.add(mWrap);
  const mWire = k.mat(k.tex("cs-wire", C.csWire), "#ffffff", [1, 1], { transparent: true, metalness: 0.9, roughness: 0.25 });
  const mStrip = k.mat(k.tex("cs-strip", C.csStrip), "#ffffff", [1, 1], { roughness: 0.1, bump: 0 });
  Object.assign(mStrip.m, { transparent: true, opacity: 0.7, depthWrite: false, alphaTest: 0, side: THREE.DoubleSide });
  B.noShadow.add(mStrip);
  const mFluoro = k.mat(null, "#ffffff", [1, 1], { emissive: "#eef6ff", emissiveIntensity: 2.6, roughness: 0.5 });
  const mBulbWarm = k.mat(null, "#ffffff", [1, 1], { emissive: "#ffd9a0", emissiveIntensity: 2.8, roughness: 0.5 });
  B.noShadow.add(mFluoro); B.noShadow.add(mBulbWarm);
  const mGlass = k.mat(null, "#cfe0e6", [1, 1], { roughness: 0.05, metalness: 0.1 });
  Object.assign(mGlass.m, { transparent: true, opacity: 0.22, depthWrite: false });
  B.noShadow.add(mGlass);
  const mFanGuard = k.mat(k.tex("cs-guard", C.csFanGuard), "#ffffff", [1, 1], { transparent: true, metalness: 0.8, roughness: 0.35 });
  const mHazard = k.mat(k.tex("cs-haz", C.csHazard), "#ffffff", [1, 1], { roughness: 0.55, bump: 0.2 });
  const mShutter = k.mat(k.tex("cs-shut", C.csShutter), "#ffffff", [1, 1], { metalness: 0.6, roughness: 0.4, bump: 0.6 });
  const mFrost = C.decalMat(k, k.tex("cs-frost", () => C.csFrost(29)), "#ffffff", 0.95, 0.5);
  const mGrime = C.decalMat(k, k.tex("cs-grime", () => C.csGrime(31)), "#ffffff", 0.8);
  const mStain = C.decalMat(k, k.tex("cs-stain", () => C.csStain(37)), "#ffffff", 0.55);
  const mBlood = C.decalMat(k, k.tex("cs-blood", () => C.csStain(38, "110,15,18")), "#ffffff", 0.6, 0.3);
  const mIce = k.mat(null, "#dff0fb", [1, 1], { roughness: 0.08, metalness: 0.05 });
  Object.assign(mIce.m, { transparent: true, opacity: 0.75 });
  const mSnow = k.mat(k.tex("cs-snow", () => T.noise("#f4f8fb", 0.06, 3, 2500)), "#ffffff", [1, 1], { roughness: 0.7, bump: 0.4 });
  const mPaper = k.mat(k.tex("cs-paper", () => C.csPaper(61)), "#ffffff", [1, 1], { roughness: 0.85, bump: 0 });
  const mWb = k.mat(k.tex("cs-wb", C.csWhiteboard), "#ffffff", [1, 1], { roughness: 0.25, bump: 0 });
  const mWood = k.mat(k.tex("cs-wood", () => T.wood("#9a6a3c", "#6e4424", 3)), "#ffffff", [1, 1], { roughness: 0.55, bump: 0.35 });
  const mFabric = k.mat(k.tex("cs-fab", () => T.noise("#ffffff", 0.14, 5, 3000)), "#ffffff", [1, 1], { roughness: 0.95, bump: 0.5 });
  const mScreen = k.mat(null, "#0f1417", [1, 1], { roughness: 0.12, metalness: 0.2 });
  const mScreenOn = k.mat(k.tex("cs-scr", () => C.signTex({ bg: "#123a5c", fg: "#9fe2ff", lines: ["STOCK  -  BAY 2", "TEMP  +2.1°C  OK", "FRZ  -24.8°C  OK"], w: 256, h: 160, bold: false, wear: 0 })), "#ffffff", [1, 1], { emissive: "#ffffff", emissiveIntensity: 0.8, bump: 0 });
  const mInst = k.mat(null, "#ffffff", [1, 1], { roughness: 0.5, metalness: 0.2 });
  const mInstMetal = k.mat(tPaintClean, "#ffffff", [1, 1], { roughness: 0.4, metalness: 0.45, bump: 0.2 });
  const mCardboard = k.mat(k.tex("cs-cbd", () => T.noise("#b08a5c", 0.1, 8, 2000)), "#ffffff", [1, 1], { roughness: 0.9, bump: 0.3 });
  const mLedRed = k.mat(null, "#ff2a1a", [1, 1], { emissive: "#ff2a1a", emissiveIntensity: 2 });
  const mLedGreen = k.mat(null, "#2aff5a", [1, 1], { emissive: "#2aff5a", emissiveIntensity: 2 });
  const mDial = k.mat(k.tex("cs-dial", C.csDial), "#ffffff", [1, 1], { roughness: 0.3, bump: 0 });
  const signCache = new Map<string, Mat>();
  const signMat = (o: C.SignOpt, emissive = 0) => {
    const key = JSON.stringify(o) + emissive;
    let m = signCache.get(key);
    if (!m) {
      m = k.mat(k.tex("cs-sign-" + key, () => C.signTex(o)), "#ffffff", [1, 1], emissive ? { roughness: 0.4, bump: 0, emissive: "#ffffff", emissiveIntensity: emissive } : { roughness: 0.45, bump: 0.05 });
      signCache.set(key, m);
    }
    return m;
  };
  /** flat sign board with a thin backing plate; y = centre; faces local +z of ry */
  const sign = (o: C.SignOpt, x: number, y: number, z: number, ry: number, w: number, h: number, emissive = 0, plate: Mat | null = mGreyP) => {
    const f = F(x, z, ry);
    if (plate) f.box(plate, w + 0.04, h + 0.04, 0.025, 0, y - h / 2 - 0.02, 0.0125);
    f.plane(signMat(o, emissive), w, h, 0, y, plate ? 0.027 : 0.004);
  };
  type NoteOpt = Parameters<typeof C.csNote>[0];
  const noteMat = (o: NoteOpt) => {
    const key = "note" + JSON.stringify(o);
    let m = signCache.get(key);
    if (!m) { m = k.mat(k.tex("cs-" + key, () => C.csNote(o)), "#ffffff", [1, 1], { roughness: 0.85, bump: 0 }); signCache.set(key, m); }
    return m;
  };
  /** paper pinned flat on a wall; y = centre, faces local +z of ry */
  const note = (o: NoteOpt, x: number, y: number, z: number, ry: number, w: number, h: number, tilt = 0) => {
    const g = new THREE.PlaneGeometry(w, h); g.rotateZ(tilt);
    F(x, z, ry).geo(noteMat(o), g, 0, y, 0.006);
  };
  const lcd = (txt: string) => {
    const key = "lcd" + txt;
    let m = signCache.get(key);
    if (!m) { m = k.mat(k.tex("cs-" + key, () => C.csLcd(txt)), "#ffffff", [1, 1], { emissive: "#ffffff", emissiveIntensity: 1.3, bump: 0 }); signCache.set(key, m); }
    return m;
  };

  // instanced lists
  const cartonI = cartonKinds.map((m) => new IList(chamferGeo(1, 1, 1, 0.02), m));
  const crateI = new IList(chamferGeo(1, 1, 1, 0.03), mCrate);
  const packI = new IList(chamferGeo(1, 1, 1, 0.25), mMeat); // vacuum-packed cuts
  const tubI = new IList(latheG([[0.001, 0], [0.16, 0], [0.18, 0.02], [0.2, 0.28], [0.215, 0.3], [0.2, 0.31]], 18), mWhitePl);
  const cylI = new IList(new THREE.CylinderGeometry(1, 1, 1, 14), mInst);
  const gasI = new IList(latheG([[0.001, 0], [0.105, 0], [0.115, 0.02], [0.115, 1.2], [0.105, 1.3], [0.07, 1.37], [0.04, 1.4], [0.04, 1.46]], 20), mInstMetal);
  const capI = new IList(latheG([[0.001, 0], [0.055, 0], [0.06, 0.1], [0.045, 0.14], [0.001, 0.145]], 12), mInstMetal);
  const iceI = new IList(new THREE.IcosahedronGeometry(1, 0), mIce, true);
  const icicleI = new IList(new THREE.ConeGeometry(1, 1, 6), mIce, true);
  const bottleI = new IList(latheG([[0.001, 0], [0.045, 0], [0.047, 0.01], [0.047, 0.16], [0.02, 0.22], [0.016, 0.26], [0.02, 0.27]], 10), mInst);
  const snowI = new IList(chamferGeo(1, 1, 1, 0.25), mSnow, true);

  // ---------------------------------------------------------------- structure helpers
  const TH = 0.3;
  type Clad = { lo: Mat; hi?: Mat; split?: number; unit?: number; hiUnit?: number; skirt?: Mat; grime?: boolean };
  type Hole = { c: number; w: number; y0?: number; y1: number; frame?: Mat };
  /** vertical plane on a wall face (axis x: along X at z=at) */
  const face = (m: Mat, axis: "x" | "z", at: number, s1: number, s2: number, y0: number, y1: number, side: number, off: number, unit?: number, uvU?: number) => {
    const g = new THREE.PlaneGeometry(s2 - s1, y1 - y0);
    if (uvU !== undefined) { const a = g.attributes.uv; for (let i = 0; i < a.count; i++) a.setX(i, a.getX(i) * uvU); }
    if (axis === "x") { g.rotateY(side > 0 ? 0 : Math.PI); g.translate((s1 + s2) / 2, (y0 + y1) / 2, at + side * off); }
    else { g.rotateY(side > 0 ? Math.PI / 2 : -Math.PI / 2); g.translate(at + side * off, (y0 + y1) / 2, (s1 + s2) / 2); }
    return B.add(m, g, unit);
  };
  function wall(axis: "x" | "z", at: number, a1: number, a2: number, neg: Clad | null, pos: Clad | null, holes: Hole[] = []) {
    const rects: [number, number, number, number][] = [];
    let cur = a1;
    for (const hl of [...holes].sort((a, b) => a.c - b.c)) {
      const s = hl.c - hl.w / 2, e = hl.c + hl.w / 2;
      if (s - cur > 0.005) rects.push([cur, s, 0, H]);
      rects.push([s, e, hl.y1, H]);
      if ((hl.y0 ?? 0) > 0) rects.push([s, e, 0, hl.y0!]);
      cur = e;
      // frame
      const fm = hl.frame ?? mSteel;
      const fy0 = hl.y0 ?? 0;
      const fb = (w: number, h: number, d: number, x: number, y: number, z: number) => axis === "x" ? W.box(fm, w, h, d, x, y, z) : W.box(fm, d, h, w, z, y, x);
      fb(0.08, hl.y1 - fy0, TH + 0.08, s + 0.04, fy0, at);
      fb(0.08, hl.y1 - fy0, TH + 0.08, e - 0.04, fy0, at);
      fb(hl.w, 0.08, TH + 0.08, hl.c, hl.y1 - 0.08, at);
      if (fy0 > 0) fb(hl.w + 0.1, 0.05, TH + 0.16, hl.c, fy0 - 0.05, at);
    }
    if (a2 - cur > 0.005) rects.push([cur, a2, 0, H]);
    for (const [s1, s2, y0, y1] of rects) {
      const g = axis === "x" ? new THREE.BoxGeometry(s2 - s1, y1 - y0, TH) : new THREE.BoxGeometry(TH, y1 - y0, s2 - s1);
      g.translate(axis === "x" ? (s1 + s2) / 2 : at, (y0 + y1) / 2, axis === "x" ? at : (s1 + s2) / 2);
      B.add(mCore, g, 1);
      if (axis === "x") k.collider(s1, s2, at - TH / 2, at + TH / 2, y0, y1, y1 < 1.5);
      else k.collider(at - TH / 2, at + TH / 2, s1, s2, y0, y1, y1 < 1.5);
      for (const [side, cl] of [[-1, neg], [1, pos]] as [number, Clad | null][]) {
        if (!cl) continue;
        const u = cl.unit ?? 0.8;
        const sp = cl.split ?? H;
        if (y0 < sp) face(cl.lo, axis, at, s1, s2, y0, Math.min(y1, sp), side, TH / 2 + 0.003, u);
        if (y1 > sp && cl.hi) face(cl.hi, axis, at, s1, s2, Math.max(y0, sp), y1, side, TH / 2 + 0.003, cl.hiUnit ?? 2);
        if (y0 < 0.01) {
          if (cl.skirt) {
            const sg = axis === "x" ? boxGeo(s2 - s1, 0.14, 0.03) : boxGeo(0.03, 0.14, s2 - s1);
            sg.translate(axis === "x" ? (s1 + s2) / 2 : at + side * (TH / 2 + 0.015), 0.07, axis === "x" ? at + side * (TH / 2 + 0.015) : (s1 + s2) / 2);
            B.add(cl.skirt, sg);
          }
          if (cl.grime !== false) face(mGrime, axis, at, s1, s2, 0, 0.55, side, TH / 2 + 0.035, undefined, (s2 - s1) / 2.2);
        }
      }
    }
  }
  const slab = (m: Mat, x1: number, x2: number, y1: number, y2: number, z1: number, z2: number, unit: number) => {
    const g = new THREE.BoxGeometry(x2 - x1, y2 - y1, z2 - z1);
    g.translate((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
    return B.add(m, g, unit);
  };
  const flat = (m: Mat, x1: number, x2: number, z1: number, z2: number, y = 0.004, rot = 0, uv?: [number, number]) => {
    const g = new THREE.PlaneGeometry(x2 - x1, z2 - z1);
    if (uv) { const a = g.attributes.uv; for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i) * uv[0], a.getY(i) * uv[1]); }
    g.rotateX(-Math.PI / 2);
    if (rot) g.rotateY(rot);
    g.translate((x1 + x2) / 2, y, (z1 + z2) / 2);
    return B.add(m, g);
  };
  const decal = (m: Mat, x: number, z: number, s: number, y = 0.006) => flat(m, x - s / 2, x + s / 2, z - s / 2, z + s / 2, y, rnd() * 6);

  // ---------------------------------------------------------------- floors, ceiling, walls
  slab(mFloorDock, -17, 8, -0.2, 0, 5, 14, 4);
  slab(mFloor, -17, 8, -0.2, 0, -5, 5, 4);
  slab(mFloorFrz, -17, -6, -0.2, 0, -14, -5, 4);
  slab(mTileFloor, -6, 8, -0.2, 0, -14, -5, 1.2);
  slab(mFloorMach, 8, 17, -0.2, 0, -14, 7, 4);
  slab(mFloorOff, 8, 17, -0.2, 0, 7, 14, 3);
  slab(mCeil, -17.3, 17.3, H, H + 0.2, -14.3, 14.3, 2);

  const cTile: Clad = { lo: mTileWall, hi: mPanel, split: 2.4, unit: 0.8, skirt: mSteel };
  const cTileFull: Clad = { lo: mTileWall, unit: 0.8, skirt: mSteel };
  const cFrz: Clad = { lo: mPanelCold, unit: 2, skirt: mSteel };
  const cDock: Clad = { lo: mBlockBlue, hi: mBlock, split: 1.2, unit: 0.8, hiUnit: 0.8 };
  const cMach: Clad = { lo: mBlock, unit: 0.8 };
  const cOff: Clad = { lo: mBlockWarm, unit: 0.8, skirt: mDarkP };
  // outer walls
  wall("z", -17.15, -14, -5, null, cFrz);
  wall("z", -17.15, -5, 5, null, cTile);
  wall("z", -17.15, 5, 14, null, cDock);
  wall("x", -14.15, -17, -6, null, cFrz);
  wall("x", -14.15, -6, 8, null, cTileFull);
  wall("x", -14.15, 8, 17, null, cMach);
  wall("z", 17.15, -14, 7, cMach, null);
  wall("z", 17.15, 7, 14, cOff, null);
  wall("x", 14.15, -17, 8, cDock, null);
  wall("x", 14.15, 8, 17, cOff, null);
  // interior walls
  wall("x", 5, -17, 8, cTile, cDock, [{ c: -8, w: 3.2, y1: 3.0 }, { c: 3, w: 2.4, y1: 2.7 }]);
  wall("x", -5, -17, -6, cFrz, cTile, [{ c: -11.5, w: 2.4, y1: 2.7, frame: mSteel }]);
  wall("x", -5, -6, 8, cTileFull, cTile, [{ c: 1.5, w: 2.0, y1: 2.6 }]);
  wall("z", -6, -14, -5, cFrz, cTileFull);
  wall("z", 8, -14, 5, cTile, cMach, [{ c: 0, w: 1.8, y1: 2.5, frame: mYellowClean }]);
  wall("z", 8, 5, 7, cDock, cMach);
  wall("z", 8, 7, 14, cDock, cOff, [{ c: 9.2, w: 1.6, y1: 2.4, frame: mDarkP }, { c: 12.2, w: 2.6, y0: 1.0, y1: 2.2, frame: mDarkP }]);
  wall("x", 7, 8, 17, cMach, cOff, [{ c: 11, w: 1.6, y1: 2.4, frame: mDarkP }]);
  // office window glass
  slab(mGlass, 7.99, 8.01, 1.0, 2.2, 10.9, 13.5, 1);

  // ---------------------------------------------------------------- lamps (visible fixtures; the points below sit on them)
  const fluoro = (x: number, z: number, ry: number, drop = 0.4, len = 1.5) => {
    const f = F(x, z, ry);
    const y = H - drop;
    f.bar(mGalv, [-len * 0.35, H, 0], [-len * 0.35, y + 0.1, 0], 0.008, 4);
    f.bar(mGalv, [len * 0.35, H, 0], [len * 0.35, y + 0.1, 0], 0.008, 4);
    f.box(mGreyP, len + 0.1, 0.07, 0.24, 0, y + 0.04, 0);
    for (const s of [-1, 1]) f.geo(mFluoro, new THREE.CylinderGeometry(0.02, 0.02, len, 8), 0, y, s * 0.06, 0, 0, Math.PI / 2);
    for (let i = -3; i <= 3; i++) f.bar(mGalv, [i * len * 0.14, y - 0.035, -0.11], [i * len * 0.14, y - 0.035, 0.11], 0.005, 4); // cage
    f.bar(mGalv, [-len / 2, y - 0.035, -0.11], [len / 2, y - 0.035, -0.11], 0.005, 4);
    f.bar(mGalv, [-len / 2, y - 0.035, 0.11], [len / 2, y - 0.035, 0.11], 0.005, 4);
    return y;
  };
  const highBay = (x: number, z: number, drop = 1.1) => {
    const y = H - drop;
    W.bar(mBlackPl, [x, H, z], [x, y + 0.3, z], 0.01, 4);
    W.geo(mDarkP, latheG([[0.02, 0.32], [0.08, 0.3], [0.14, 0.22], [0.32, 0.02], [0.34, 0], [0.33, -0.01]].map(([r, h]) => [r, h] as [number, number]).reverse().map(([r, h]) => [r, h] as [number, number]), 24), x, y, z);
    W.geo(mBulbWarm, new THREE.SphereGeometry(0.11, 14, 10), x, y + 0.08, z);
    return y + 0.05;
  };
  const cageBulb = (x: number, y: number, z: number, ry: number) => {
    const f = F(x, z, ry);
    f.box(mGreyP, 0.16, 0.16, 0.06, 0, y - 0.08, 0.03);
    f.geo(mBulbWarm, new THREE.SphereGeometry(0.07, 12, 8), 0, y, 0.15);
    for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2; f.bar(mGalv, [Math.cos(a) * 0.09, y + Math.sin(a) * 0.09, 0.05], [Math.cos(a) * 0.09, y + Math.sin(a) * 0.09, 0.24], 0.006, 4); }
    f.geo(mGalv, new THREE.TorusGeometry(0.09, 0.006, 4, 16), 0, y, 0.24);
  };
  // dock
  const lDock = highBay(-4.5, 9.6);
  highBay(-12.5, 9.6); highBay(3.5, 9.6);
  // cold room 2
  const lMainA = fluoro(-10, -0.1, 0);
  const lMainB = fluoro(1.5, 0.1, 0);
  fluoro(-4.2, 0, 0); fluoro(-14.5, 0, 0);
  // freezer, butchery, machine room, office
  cageBulb(-11.5, 3.4, -5.18, Math.PI);
  const lFrz = fluoro(-11.5, -9.5, Math.PI / 2, 0.3, 1.2);
  const lBut = fluoro(1, -9.5, 0, 0.5);
  fluoro(-3.2, -9.5, 0, 0.5); fluoro(5.2, -9.5, 0, 0.5);
  const lMach = fluoro(12.5, -3, Math.PI / 2, 0.35);
  fluoro(12.5, -10.5, Math.PI / 2, 0.35); fluoro(12.5, 3.5, Math.PI / 2, 0.35);
  fluoro(12.5, 10.5, 0, 0.2, 1.2);

  // ---------------------------------------------------------------- generic props
  const pallet = (x: number, y: number, z: number, ry = 0, w = 1.2, d = 0.8) => {
    const f = F(x, z, ry);
    for (let i = 0; i < 7; i++) f.box(mPallet, w, 0.022, 0.1, 0, y + 0.122, -d / 2 + 0.05 + (i * (d - 0.1)) / 6);
    for (const lx of [-w / 2 + 0.05, 0, w / 2 - 0.05]) for (const lz of [-d / 2 + 0.05, 0, d / 2 - 0.05]) f.box(mPallet, 0.1, 0.078, 0.1, lx, y + 0.022, lz);
    for (const lz of [-d / 2 + 0.05, 0, d / 2 - 0.05]) f.box(mPallet, w, 0.022, 0.1, 0, y, lz);
    return y + 0.144;
  };
  /** stack of cartons on a footprint (local frame), returns top */
  const cartonStack = (f: Fr, lx: number, lz: number, y: number, w: number, d: number, layers: number, kind = -1, frost = false, cw = 0.4, ch = 0.26, cd = 0.3) => {
    const nx = Math.max(1, Math.floor(w / cw)), nz = Math.max(1, Math.floor(d / cd));
    for (let L = 0; L < layers; L++) for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      if (L === layers - 1 && rnd() < 0.25) continue;
      const ki = kind >= 0 ? kind : Math.floor(rnd() * cartonKinds.length);
      const tint = frost ? C.hexShade("#e8f2fa", 0.95 + rnd() * 0.08) : C.hexShade("#ffffff", 0.85 + rnd() * 0.15);
      f.inst(cartonI[ki], lx - w / 2 + cw / 2 + i * (w / nx) + rr(-0.02, 0.02), y + L * ch + ch / 2, lz - d / 2 + cd / 2 + j * (d / nz) + rr(-0.02, 0.02), [cw * 0.97, ch * 0.98, cd * 0.97], tint, rr(-0.06, 0.06));
    }
    return y + layers * ch;
  };
  /** loaded pallet (cartons, optional stretch wrap); collider standable */
  const loadedPallet = (x: number, z: number, ry: number, layers: number, opt: { kind?: number; wrap?: boolean; frost?: boolean; y?: number } = {}) => {
    const y0 = opt.y ?? 0;
    const f = F(x, z, ry);
    const top = pallet(x, y0, z, ry);
    const t = cartonStack(f, 0, 0, top, 1.2, 0.8, layers, opt.kind ?? -1, opt.frost);
    if (opt.wrap) { f.box(mWrap, 1.22, t - top - 0.05, 0.82, 0, top + 0.02, 0); }
    if (opt.frost) { f.geo(mSnow, boxGeo(1.18, 0.03, 0.78), 0, t + 0.01, 0); }
    f.col(-0.6, 0.6, -0.4, 0.4, y0, t);
    return t;
  };
  const crateStack = (x: number, z: number, ry: number, n: number, cols: string[], y0 = 0) => {
    const f = F(x, z, ry);
    let y = y0;
    for (let i = 0; i < n; i++) { f.inst(crateI, rr(-0.02, 0.02), y + 0.15, rr(-0.02, 0.02), [0.6, 0.3, 0.4], pick(cols), rr(-0.05, 0.05)); y += 0.29; }
    f.col(-0.3, 0.3, -0.2, 0.2, y0, y);
    return y;
  };
  /** chrome wire shelving unit, local x = length; fill(level, y) */
  const wireRack = (x: number, z: number, ry: number, len: number, dep: number, h: number, levels: number, fill: (f: Fr, y: number, lvl: number) => void) => {
    const f = F(x, z, ry);
    const posts = len > 1.6 ? [-len / 2, 0, len / 2] : [-len / 2, len / 2];
    for (const px of posts) for (const pz of [-dep / 2, dep / 2]) {
      f.cyl(mChrome, 0.014, 0.014, h, px, 0.03, pz, 8);
      f.cyl(mRubber, 0.02, 0.022, 0.03, px, 0, pz, 8);
    }
    for (let l = 0; l < levels; l++) {
      const y = 0.18 + (l * (h - 0.25)) / (levels - 1);
      f.geo(mWire, new THREE.BoxGeometry(len, 0.012, dep), 0, y, 0);
      for (const pz of [-dep / 2, dep / 2]) f.bar(mChrome, [-len / 2, y + 0.02, pz], [len / 2, y + 0.02, pz], 0.006, 6);
      for (const px of [-len / 2, len / 2]) f.bar(mChrome, [px, y + 0.02, -dep / 2], [px, y + 0.02, dep / 2], 0.006, 6);
      fill(f, y + 0.01, l);
    }
    f.col(-len / 2 - 0.02, len / 2 + 0.02, -dep / 2 - 0.02, dep / 2 + 0.02, 0, h + 0.03);
  };
  const fillMixed = (f: Fr, y: number, l: number, len: number, dep: number, frost = false) => {
    let cx = -len / 2 + 0.05;
    while (cx < len / 2 - 0.3) {
      const r = rnd();
      if (r < 0.45) { // cartons
        const w = pick([0.4, 0.5, 0.35]), hh = pick([0.22, 0.28, 0.32]);
        const n = l === 0 ? 2 : 1 + Math.floor(rnd() * 2);
        const ki = Math.floor(rnd() * cartonKinds.length);
        for (let s = 0; s < n; s++) f.inst(cartonI[ki], cx + w / 2, y + hh / 2 + s * hh, rr(-0.03, 0.03), [w, hh * 0.98, dep * 0.8], frost ? "#e6f0f8" : C.hexShade("#ffffff", 0.85 + rnd() * 0.15), rr(-0.08, 0.08));
        cx += w + 0.04;
      } else if (r < 0.7) { // crates with packs
        const col = pick(["#2f6fc0", "#c63a2a", "#3a9a4c", "#e6e6e0", "#e9b52a"]);
        f.inst(crateI, cx + 0.3, y + 0.15, 0, [0.6, 0.3, dep * 0.85], col);
        for (let p = 0; p < 4; p++) f.inst(packI, cx + 0.1 + p * 0.13, y + 0.32, rr(-0.1, 0.1), [0.12, 0.05, 0.22], C.hexShade("#ffffff", 0.85 + rnd() * 0.2), rr(-0.3, 0.3), 0, rr(-0.2, 0.2));
        cx += 0.64;
      } else if (r < 0.88 && !frost) { // loose vacuum packs
        for (let p = 0; p < 6; p++) f.inst(packI, cx + 0.08 + (p % 3) * 0.14, y + 0.03 + Math.floor(p / 3) * 0.055, rr(-0.15, 0.15), [0.13, 0.05, 0.24], C.hexShade("#ffffff", 0.8 + rnd() * 0.3), rr(-0.4, 0.4));
        cx += 0.46;
      } else { // white tubs
        for (let p = 0; p < 2; p++) f.inst(tubI, cx + 0.22, y + p * 0.29, 0, [1, 1, 1], "#ffffff");
        cx += 0.46;
      }
    }
  };
  /** hanging carcass (pig half or beef quarter) with a hook; top at yTop. Skin shell behind, rib cut face in front. */
  const carcPts: [number, number][] = [[0.01, 0], [0.08, 0.03], [0.16, 0.14], [0.21, 0.34], [0.22, 0.55], [0.2, 0.76], [0.17, 0.93], [0.14, 1.04], [0.09, 1.12], [0.05, 1.2], [0.04, 1.3], [0.045, 1.36], [0.001, 1.38]];
  const carcShell = (() => {
    const g = new THREE.LatheGeometry(carcPts.map(([r, h]) => new THREE.Vector2(r, h)), 12, Math.PI / 2, Math.PI);
    const a = g.attributes.uv; for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i) * 1.2, a.getY(i) * 1.4);
    return g;
  })();
  const carcFace = (() => {
    const sh = new THREE.Shape();
    sh.moveTo(0, 0);
    for (const [r, h] of carcPts) sh.lineTo(r, h);
    for (const [r, h] of [...carcPts].reverse()) sh.lineTo(-r, h);
    const g = new THREE.ShapeGeometry(sh, 4);
    const p = g.attributes.position, a = g.attributes.uv;
    for (let i = 0; i < a.count; i++) a.setXY(i, p.getX(i) / 0.46 + 0.5, p.getY(i) / 1.38);
    return g;
  })();
  const carcass = (x: number, z: number, yTop: number, beef: boolean, ry: number) => {
    const s = beef ? 1.18 : 1;
    const y0 = yTop - 1.38 * s - 0.2;
    const sh = carcShell.clone();
    place(sh, 0, 0, 0, 0, 0, 0, [s, s, s * 0.55]);
    sh.rotateY(ry); sh.translate(x, y0, z);
    B.add(beef ? mMeat : mCarcass, sh);
    const cf = carcFace.clone();
    place(cf, 0, 0, 0.002, 0, 0, 0, [s, s, 1]);
    cf.rotateY(ry); cf.translate(x, y0, z);
    B.add(mRibs, cf);
    W.geo(mSteel, tubeG([[x, yTop + 0.05, z], [x, yTop - 0.1, z], [x + 0.05, yTop - 0.18, z], [x, yTop - 0.24, z]], 0.008, 10, 5));
    k.collider(x - 0.22 * s, x + 0.22 * s, z - 0.14, z + 0.14, y0, yTop - 0.18, false);
  };
  const meatRail = (x1: number, x2: number, z: number, y: number) => {
    W.bar(mSteel, [x1, y, z], [x2, y, z], 0.03, 10);
    for (let x = x1 + 0.3; x < x2; x += 2) { W.bar(mGalv, [x, y, z], [x, H, z], 0.012, 6); W.box(mGalv, 0.16, 0.02, 0.1, x, H - 0.02, z); }
  };
  const extinguisher = (x: number, z: number, ry: number, y = 0.4) => {
    const f = F(x, z, ry);
    f.box(mDarkP, 0.14, 0.2, 0.04, 0, y + 0.3, 0.02);
    f.geo(mRedP, latheG([[0.001, 0], [0.075, 0], [0.08, 0.02], [0.08, 0.45], [0.06, 0.5], [0.025, 0.54], [0.001, 0.55]], 16), 0, y, 0.11);
    f.box(mBlackPl, 0.1, 0.03, 0.03, 0, y + 0.55, 0.11);
    f.geo(mBlackPl, tubeG([[0.03, y + 0.54, 0.12], [0.1, y + 0.45, 0.16], [0.09, y + 0.2, 0.17]], 0.01, 10, 5));
    sign({ bg: "#c3221f", fg: "#ffffff", lines: ["FIRE", "EXTINGUISHER"], icon: "fire", w: 256, h: 96 }, x - Math.sin(ry) * 0 , y + 0.95, z, ry, 0.36, 0.14, 0, null);
  };
  const bollard = (x: number, z: number) => {
    W.cyl(mYellow, 0.08, 0.08, 1.0, x, 0, z, 16);
    W.geo(mYellow, new THREE.SphereGeometry(0.08, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), x, 1.0, z);
    W.cyl(mBlackPl, 0.082, 0.082, 0.06, x, 0.75, z, 16);
    W.cyl(mBlackPl, 0.082, 0.082, 0.06, x, 0.55, z, 16);
    k.collider(x - 0.09, x + 0.09, z - 0.09, z + 0.09, 0, 1.05, true);
  };
  const stripCurtain = (axis: "x" | "z", at: number, c: number, w: number, h: number) => {
    const n = Math.round(w / 0.19);
    for (let i = 0; i < n; i++) {
      const s = c - w / 2 + (i + 0.5) * (w / n);
      const g = new THREE.PlaneGeometry(0.22, h - 0.05);
      g.rotateZ(rr(-0.015, 0.015));
      if (axis === "x") g.translate(s, (h - 0.05) / 2 + 0.05, at + (i % 2 ? 0.02 : -0.02));
      else { g.rotateY(Math.PI / 2); g.translate(at + (i % 2 ? 0.02 : -0.02), (h - 0.05) / 2 + 0.05, s); }
      B.add(mStrip, g);
    }
    if (axis === "x") W.box(mSteel, w, 0.06, 0.08, c, h, at); else W.box(mSteel, 0.08, 0.06, w, at, h, c);
  };
  const fanBlades = (r: number) => {
    const gs: BG[] = [];
    for (let i = 0; i < 5; i++) {
      const b = new THREE.BoxGeometry(r * 0.85, 0.008, r * 0.32);
      b.translate(r * 0.5, 0, 0);
      b.rotateX(0.35);
      b.rotateY((i * Math.PI * 2) / 5);
      gs.push(b);
    }
    gs.push(new THREE.CylinderGeometry(r * 0.16, r * 0.16, 0.05, 12));
    return mergeG(gs);
  };
  /** spinning fan: blades in the XZ plane around the mesh origin, rotated to face (rx) */
  const fan = (x: number, y: number, z: number, r: number, rx: number, ry: number, speed: number) => {
    const g = fanBlades(r);
    const m = k.add(g, mDarkP, [x, y, z], { rotX: rx, rotY: ry, noShadow: true });
    m.rotation.order = "YXZ";
    m.userData.spin = { axis: [0, 1, 0], speed };
    return m;
  };
  /** ceiling evaporator unit (cooler) facing local +z with n fans */
  const evaporator = (x: number, z: number, ry: number, n: number, icy: boolean) => {
    const f = F(x, z, ry);
    const w = n * 0.75 + 0.3, y = H - 0.75;
    f.box(mCreamP, w, 0.62, 0.7, 0, y, 0);
    f.box(mGalv, w - 0.1, 0.52, 0.02, 0, y + 0.05, -0.36); // coil fins back
    for (let i = 0; i < n; i++) {
      const lx = -w / 2 + 0.15 + 0.375 + i * 0.75;
      const [wx, wz] = f.pt(lx, 0.37);
      f.geo(mFanGuard, new THREE.CircleGeometry(0.29, 24), lx, y + 0.31, 0.37);
      f.geo(mDarkP, new THREE.TorusGeometry(0.3, 0.018, 6, 24), lx, y + 0.31, 0.36);
      fan(wx, y + 0.31, wz, 0.26, Math.PI / 2, ry, 9 + i);
    }
    f.bar(mGalv, [-w / 2 + 0.2, y + 0.62, 0], [-w / 2 + 0.2, H, 0], 0.015, 6);
    f.bar(mGalv, [w / 2 - 0.2, y + 0.62, 0], [w / 2 - 0.2, H, 0], 0.015, 6);
    f.bar(mWhitePl, [-w / 2, y + 0.4, -0.1], [-w / 2 - 0.3, y + 0.4, -0.1], 0.03, 8);
    // drip tray + drain
    f.box(mSteel, w + 0.06, 0.05, 0.8, 0, y - 0.05, 0);
    if (icy) {
      for (let i = 0; i < n * 7; i++) f.inst(icicleI, rr(-w / 2 + 0.05, w / 2 - 0.05), y - 0.05 - 0.09, rr(-0.35, 0.38), [0.02 + rnd() * 0.02, rr(0.08, 0.28), 0.02 + rnd() * 0.02], undefined, 0, Math.PI);
      f.geo(mSnow, boxGeo(w + 0.02, 0.05, 0.72), 0, y + 0.62, 0);
    }
  };
  const sinkUnit = (x: number, z: number, ry: number, w: number) => {
    const f = F(x, z, ry);
    for (const lx of [-w / 2 + 0.05, w / 2 - 0.05]) for (const lz of [-0.2, 0.2]) f.cyl(mSteel, 0.02, 0.02, 0.82, lx, 0, lz, 8);
    f.box(mSteel, w, 0.05, 0.6, 0, 0.82, 0);
    f.box(mSteel, w, 0.3, 0.04, 0, 0.87, -0.29); // splash back
    f.box(mSteel, w - 0.1, 0.03, 0.5, 0, 0.18, 0); // undershelf
    f.geo(mDarkP, new THREE.PlaneGeometry(w * 0.4, 0.4), -w * 0.2, 0.875, 0, -Math.PI / 2);
    f.box(mSteel, w * 0.44, 0.24, 0.02, -w * 0.2, 0.62, 0.21);
    f.box(mSteel, w * 0.44, 0.24, 0.02, -w * 0.2, 0.62, -0.21);
    f.geo(mChrome, tubeG([[-w * 0.2, 0.9, -0.25], [-w * 0.2, 1.22, -0.25], [-w * 0.2, 1.25, -0.12], [-w * 0.2, 1.12, -0.05]], 0.015, 16, 6));
    for (const s of [-1, 1]) f.cyl(mChrome, 0.02, 0.02, 0.05, -w * 0.2 + s * 0.12, 1.02, -0.25, 8);
    f.col(-w / 2, w / 2, -0.3, 0.3, 0, 0.87);
  };
  /** stainless prep table with undershelf */
  const prepTable = (x: number, z: number, ry: number, w: number, d: number, fill?: (f: Fr) => void) => {
    const f = F(x, z, ry);
    for (const lx of [-w / 2 + 0.05, w / 2 - 0.05]) for (const lz of [-d / 2 + 0.05, d / 2 - 0.05]) { f.cyl(mSteel, 0.02, 0.02, 0.86, lx, 0.03, lz, 10); f.cyl(mBlackPl, 0.025, 0.02, 0.03, lx, 0, lz, 10); }
    f.box(mSteel, w, 0.04, d, 0, 0.86, 0);
    f.box(mSteel, w, 0.08, 0.02, 0, 0.8, d / 2 - 0.01);
    f.box(mSteel, w, 0.08, 0.02, 0, 0.8, -d / 2 + 0.01);
    f.box(mSteel, w - 0.06, 0.02, d - 0.06, 0, 0.2, 0);
    f.col(-w / 2, w / 2, -d / 2, d / 2, 0, 0.9);
    fill?.(f);
  };

  // ================================================================ LOADING DOCK (x -17..8, z 5..14)
  k.room("Loading Dock", -17, 8, 5, 14);
  for (const [dx, lab] of [[-11.5, "DOCK 1"], [-3.5, "DOCK 2"]] as [number, string][]) {
    const f = F(dx, 13.99, Math.PI);
    f.plane(mShutter, 3.2, 3.3, 0, 1.65, 0.01);
    f.box(mYellowClean, 0.14, 3.4, 0.16, -1.67, 0, 0.08);
    f.box(mYellowClean, 0.14, 3.4, 0.16, 1.67, 0, 0.08);
    f.box(mGreyP, 3.6, 0.55, 0.45, 0, 3.35, 0.22); // roll housing
    f.box(mDarkP, 3.2, 0.06, 0.08, 0, 0.0, 0.05);
    f.box(mRubber, 0.25, 0.5, 0.18, -1.4, 0.15, 0.09); f.box(mRubber, 0.25, 0.5, 0.18, 1.4, 0.15, 0.09); // bumpers
    f.box(mYellow, 0.08, 0.08, 0.06, 0.9, 1.0, 0.05); // handle
    sign({ bg: "#1d3a6b", fg: "#ffffff", lines: [lab], w: 256, h: 96, border: "#ffffff" }, dx, 4.05, 13.98, Math.PI, 0.9, 0.34);
    // dock leveler plate with hazard edge
    flat(mSteel, dx - 1.5, dx + 1.5, 11.8, 13.95, 0.006);
    flat(mHazard, dx - 1.5, dx + 1.5, 11.65, 11.85, 0.008, 0, [8, 1]);
    bollard(dx - 2.0, 13.4); bollard(dx + 2.0, 13.4);
    // push-button box
    F(dx + 2.1, 13.99, Math.PI).box(mYellowClean, 0.2, 0.3, 0.12, 0, 1.3, 0.06);
    F(dx + 2.1, 13.99, Math.PI).geo(mLedGreen, new THREE.CylinderGeometry(0.025, 0.025, 0.02, 10), -0.04, 1.5, 0.13, Math.PI / 2);
    F(dx + 2.1, 13.99, Math.PI).geo(mLedRed, new THREE.CylinderGeometry(0.025, 0.025, 0.02, 10), 0.04, 1.5, 0.13, Math.PI / 2);
  }
  sign({ bg: "#f0bd1c", fg: "#111111", lines: ["FORKLIFT ZONE", "PEDESTRIANS KEEP LEFT"], w: 384, h: 128, icon: "arrow" }, -7.5, 2.4, 13.98, Math.PI, 1.3, 0.44);
  // yellow floor lines + walkway
  flat(mYellowClean, -17, 8, 6.2, 6.3, 0.005);
  flat(mYellowClean, -17, 8, 11.5, 11.6, 0.005);
  for (let x = -6.5; x < 7; x += 0.8) flat(mYellowClean, x, x + 0.4, 5.3, 6.1, 0.005); // zebra crossing
  // pallet racking along the west wall (blue uprights, orange beams)
  {
    const x0 = -16.35, dep = 1.05;
    const zs = [5.6, 8.35, 11.1, 13.85];
    for (const zz of zs) for (const dx of [-dep / 2, dep / 2]) W.box(mBlueP, 0.08, 4.2, 0.08, x0 + dx, 0, zz);
    for (const zz of zs) for (let y = 0.4; y < 4; y += 0.8) W.bar(mBlueP, [x0 - dep / 2, y, zz], [x0 + dep / 2, y + 0.7, zz], 0.012, 4);
    for (const ly of [1.55, 3.05]) for (let b = 0; b < 3; b++) for (const dx of [-dep / 2, dep / 2]) W.box(mOrange, 0.05, 0.12, zs[b + 1] - zs[b] - 0.08, x0 + dx, ly - 0.12, (zs[b] + zs[b + 1]) / 2);
    for (let b = 0; b < 3; b++) {
      const zc = (zs[b] + zs[b + 1]) / 2;
      for (const [ly, lay] of [[0, 4], [1.55, 4], [3.05, 3]] as [number, number][]) {
        for (const o of [-0.65, 0.65]) {
          if (rnd() < 0.15) { pallet(x0, ly, zc + o, Math.PI / 2); continue; }
          loadedPallet(x0, zc + o, Math.PI / 2, lay - (rnd() < 0.3 ? 1 : 0), { wrap: rnd() < 0.7, y: ly });
        }
      }
      k.collider(x0 - dep / 2 - 0.05, x0 + dep / 2 + 0.05, zs[b] - 0.05, zs[b + 1] + 0.05, 0, 4.2, true);
    }
    for (const zz of zs) W.box(mYellow, 0.3, 0.4, 0.3, x0 + dep / 2 + 0.2, 0, zz); // upright protectors
    sign({ bg: "#ffffff", fg: "#1d3a6b", lines: ["AISLE A", "MAX 1000 KG / LEVEL"], w: 256, h: 128, border: "#1d3a6b" }, x0 + dep / 2 + 0.05, 1.3, 7.0, Math.PI / 2, 0.44, 0.22);
  }
  // forklift
  {
    const fx = -9.3, fz = 9.1, fry = 0.55;
    const f = F(fx, fz, fry);
    f.box(mYellowClean, 1.1, 0.5, 1.9, 0, 0.18, 0);
    f.box(mDarkP, 1.12, 0.72, 0.5, 0, 0.22, -0.82);
    f.geo(mDarkP, new THREE.CylinderGeometry(0.36, 0.36, 1.12, 20, 1, false, 0, Math.PI), 0, 0.94, -0.82, 0, 0, Math.PI / 2);
    f.box(mYellowClean, 1.0, 0.28, 0.8, 0, 0.68, 0.1);
    for (const [lx, lz, r] of [[-0.5, 0.62, 0.27], [0.5, 0.62, 0.27], [-0.48, -0.62, 0.22], [0.48, -0.62, 0.22]] as [number, number, number][]) {
      f.geo(mRubber, new THREE.CylinderGeometry(r, r, 0.22, 20), lx, r, lz, 0, 0, Math.PI / 2);
      f.geo(mRedP, new THREE.CylinderGeometry(r * 0.55, r * 0.55, 0.23, 14), lx, r, lz, 0, 0, Math.PI / 2);
    }
    // seat + steering
    f.box(mBlackPl, 0.5, 0.1, 0.45, 0, 0.96, -0.2);
    f.box(mBlackPl, 0.5, 0.5, 0.1, 0, 1.0, -0.45, -0.15);
    f.bar(mDarkP, [0, 0.95, 0.35], [0, 1.35, 0.2], 0.025, 8);
    f.geo(mBlackPl, new THREE.TorusGeometry(0.17, 0.018, 8, 24), 0, 1.36, 0.2, -1.1);
    // overhead guard
    for (const [lx, lz] of [[-0.5, 0.55], [0.5, 0.55], [-0.5, -0.65], [0.5, -0.65]]) f.bar(mBlackPl, [lx, 0.7, lz], [lx, 2.1, lz * 0.9], 0.03, 8, false);
    f.box(mBlackPl, 1.08, 0.05, 1.2, 0, 2.08, -0.05);
    for (let i = -2; i <= 2; i++) f.box(mBlackPl, 0.03, 0.05, 1.2, i * 0.2, 2.1, -0.05);
    f.geo(k.mat(null, "#ff8a1a", [1, 1], { emissive: "#ff7a00", emissiveIntensity: 2 }), latheG([[0.001, 0], [0.06, 0], [0.06, 0.1], [0.04, 0.14], [0.001, 0.15]], 12), 0.35, 2.15, -0.5);
    // mast + carriage + forks
    for (const s of [-1, 1]) { f.box(mDarkP, 0.09, 2.45, 0.14, s * 0.33, 0.1, 1.05); f.box(mDarkP, 0.07, 2.3, 0.1, s * 0.22, 0.2, 1.12); }
    for (const y of [0.5, 1.5, 2.4]) f.box(mDarkP, 0.76, 0.08, 0.1, 0, y, 1.05);
    f.box(mDarkP, 0.9, 0.35, 0.06, 0, 0.25, 1.22);
    for (let i = 0; i < 6; i++) f.bar(mDarkP, [-0.42 + i * 0.168, 0.6, 1.22], [-0.42 + i * 0.168, 1.25, 1.22], 0.012, 4);
    for (const s of [-1, 1]) { f.box(mDarkP, 0.1, 0.05, 1.1, s * 0.25, 0.05, 1.8); f.box(mDarkP, 0.1, 0.45, 0.05, s * 0.25, 0.05, 1.25); }
    f.geo(mBlackPl, tubeG([[0.3, 2.3, 1.05], [0.35, 1.2, 1.1], [0.3, 0.6, 0.9]], 0.012, 12, 5));
    f.plane(signMat({ bg: "#111111", fg: "#f0bd1c", lines: ["CAPACITY 2500 KG"], w: 256, h: 48, wear: 0.2 }), 0.5, 0.1, 0, 0.55, -1.08, Math.PI);
    f.col(-0.58, 0.58, -1.1, 1.3, 0, 2.15);
    f.col(-0.33, 0.33, 1.3, 2.35, 0, 0.1, true);
    decal(mStain, fx - 0.3, fz - 0.4, 1.4);
  }
  // pallet jack
  {
    const f = F(-2.2, 10.4, -0.3);
    for (const s of [-1, 1]) f.box(mRedP, 0.16, 0.07, 1.15, s * 0.2, 0.02, 0.5);
    f.box(mRedP, 0.56, 0.22, 0.22, 0, 0.02, -0.15);
    f.cyl(mDarkP, 0.05, 0.05, 0.35, 0, 0.2, -0.18, 10);
    f.geo(mRedP, tubeG([[0, 0.45, -0.2], [0, 1.05, -0.45], [0, 1.2, -0.5]], 0.02, 10, 6));
    f.geo(mRedP, new THREE.TorusGeometry(0.1, 0.018, 6, 16), 0, 1.25, -0.52);
    f.geo(mRubber, new THREE.CylinderGeometry(0.09, 0.09, 0.12, 14), 0, 0.09, -0.2, 0, 0, Math.PI / 2);
    f.col(-0.3, 0.3, -0.3, 1.1, 0, 0.3, true);
  }
  // wrapped pallets in the middle, empty pallet stacks, cardboard bale, wheelie bins
  loadedPallet(-5.8, 8.2, 0.08, 5, { wrap: true, kind: 0 });
  loadedPallet(-5.7, 9.3, -0.05, 4, { wrap: true, kind: 3 });
  note({ stripe: "#c3221f", title: "PRIORITY - KEEP FROZEN", lines: ["DELIVER TO:", "HARBOUR FOODS LTD", "COLD STORAGE, BAY 2", "PALLET 3 OF 4   712 KG"], w: 256, h: 256, bg: "#ffffff" }, -5.75, 0.95, 8.64, 0.08, 0.3, 0.3);
  loadedPallet(-4.3, 8.3, 0.1, 3, { kind: 1 });
  loadedPallet(-12.4, 7.2, 1.6, 6, { wrap: true, kind: 2 });
  {
    let y = 0;
    for (let i = 0; i < 9; i++) y = pallet(-13.2 + rr(-0.03, 0.03), y, 12.5, Math.PI / 2 + rr(-0.05, 0.05)) - 0.0;
    k.collider(-13.65, -12.75, 11.9, 13.1, 0, y, true);
    let y2 = 0;
    for (let i = 0; i < 5; i++) y2 = pallet(-1.0 + rr(-0.04, 0.04), y2, 12.9, rr(-0.06, 0.06));
    k.collider(-1.6, -0.4, 12.5, 13.3, 0, y2, true);
  }
  // cardboard bale (strapped)
  {
    const f = F(5.9, 12.8, 0.1);
    f.box(mCardboard, 1.2, 0.9, 0.8, 0, 0.0, 0);
    for (const lx of [-0.35, 0, 0.35]) f.box(mBlackPl, 0.03, 0.92, 0.82, lx, -0.01, 0);
    f.col(-0.6, 0.6, -0.4, 0.4, 0, 0.9);
    for (let i = 0; i < 4; i++) f.box(mCardboard, rr(0.4, 0.8), 0.008, rr(0.3, 0.6), rr(-1.2, 0.8), 0.001 + i * 0.009, rr(-1.2, -0.6), 0, rr(-1, 1));
  }
  // wheelie bins
  const wheelie = (x: number, z: number, ry: number, col: Mat, label: string) => {
    const f = F(x, z, ry);
    f.box(col, 0.58, 0.95, 0.72, 0, 0.06, 0);
    f.box(col, 0.64, 0.05, 0.8, 0, 1.01, 0.02, -0.03);
    f.bar(mBlackPl, [-0.3, 0.9, -0.38], [0.3, 0.9, -0.38], 0.018, 6);
    for (const s of [-1, 1]) f.geo(mRubber, new THREE.CylinderGeometry(0.1, 0.1, 0.06, 14), s * 0.3, 0.1, -0.3, 0, 0, Math.PI / 2);
    f.plane(signMat({ bg: "#ffffff", fg: "#222222", lines: [label], w: 256, h: 64, wear: 0.6 }), 0.4, 0.1, 0, 0.75, 0.365);
    f.col(-0.32, 0.32, -0.4, 0.42, 0, 1.05);
  };
  wheelie(6.9, 6.0, Math.PI, mGreenP, "GENERAL WASTE");
  wheelie(7.1, 7.0, Math.PI + 0.1, mBlueP, "CARDBOARD ONLY");
  wheelie(-16.0, 6.9, Math.PI / 2, mDarkP, "ANIMAL BY-PRODUCT");
  // battery charger station on the office wall
  {
    const f = F(7.84, 12.3 - 5, -Math.PI / 2);
    f.box(mGreyP, 0.6, 0.9, 0.35, 0, 0.9, 0.18);
    f.plane(lcd("80%"), 0.18, 0.07, 0.1, 1.55, 0.36);
    f.geo(mBlackPl, tubeG([[-0.2, 0.95, 0.3], [-0.3, 0.4, 0.6], [-0.1, 0.02, 0.9], [0.4, 0.02, 1.2]], 0.02, 18, 6));
  }
  // dock desk podium with scanner and clipboards
  {
    const f = F(-2.9, 7.3, 0.25);
    f.box(mGreyP, 0.7, 1.0, 0.5, 0, 0, 0);
    f.box(mWood, 0.8, 0.04, 0.6, 0, 1.0, 0, -0.1);
    // clipboard with the delivery note
    f.box(mWood, 0.25, 0.012, 0.34, -0.12, 1.05, 0.02, -0.1);
    f.box(mChrome, 0.1, 0.02, 0.03, -0.12, 1.07, -0.13, -0.1);
    f.geo(noteMat({ title: "DELIVERY NOTE  #4471", lines: ["Deliver to: Tom Kodner", "Cold Storage - Bay 2", "40 ctn BEEF CUTS  -18°C", "12 crt POULTRY  +2°C", "Driver: R. Okafor", "Received: ________"], w: 256, h: 340 }), new THREE.PlaneGeometry(0.22, 0.3), -0.12, 1.063, 0.03, -Math.PI / 2 - 0.1);
    f.box(mBlackPl, 0.07, 0.15, 0.05, 0.2, 1.05, 0);
    f.col(-0.4, 0.4, -0.3, 0.3, 0, 1.05);
  }
  // roll cage trolleys
  const rollCage = (x: number, z: number, ry: number, loadF = true) => {
    const f = F(x, z, ry);
    f.box(mGalv, 0.8, 0.05, 0.7, 0, 0.14, 0);
    for (const [lx, lz] of [[-0.35, -0.3], [0.35, -0.3], [-0.35, 0.3], [0.35, 0.3]]) f.geo(mRubber, new THREE.CylinderGeometry(0.05, 0.05, 0.04, 10), lx, 0.06, lz, 0, 0, Math.PI / 2);
    for (const lx of [-0.4, 0.4]) {
      for (const lz of [-0.35, 0.35]) f.bar(mGalv, [lx, 0.15, lz], [lx, 1.75, lz], 0.01, 5);
      for (let y = 0.35; y < 1.8; y += 0.3) f.bar(mGalv, [lx, y, -0.35], [lx, y, 0.35], 0.006, 4);
      for (let lz = -0.35; lz <= 0.36; lz += 0.14) f.bar(mGalv, [lx, 0.15, lz], [lx, 1.75, lz], 0.005, 4);
    }
    for (let y = 0.35; y < 1.8; y += 0.3) f.bar(mGalv, [-0.4, y, -0.35], [0.4, y, -0.35], 0.006, 4);
    if (loadF) cartonStack(f, 0, 0, 0.17, 0.76, 0.66, 4 + Math.floor(rnd() * 2));
    f.col(-0.42, 0.42, -0.37, 0.37, 0, 1.76);
  };
  rollCage(4.4, 12.9, 0.05); rollCage(3.4, 12.95, -0.08, false);
  // cones + misc
  const cone = (x: number, z: number) => {
    W.box(mOrange, 0.36, 0.03, 0.36, x, 0, z);
    W.geo(mOrange, latheG([[0.001, 0.72], [0.03, 0.72], [0.14, 0.03], [0.001, 0.03]].reverse() as [number, number][], 16), x, 0, z);
    W.geo(mWhitePl, new THREE.CylinderGeometry(0.075, 0.095, 0.1, 16, 1, true), x, 0.38, z);
  };
  cone(-7.2, 12.4); cone(-6.6, 12.8); cone(0.2, 6.9);
  crateStack(1.7, 13.3, 0.05, 6, ["#2f6fc0", "#2f6fc0", "#c63a2a"]);
  crateStack(2.4, 13.35, -0.1, 4, ["#e6e6e0"]);
  crateStack(2.0, 12.7, 0.3, 2, ["#3a9a4c"]);
  // sack truck leaning by the crates
  {
    const f = F(0.8, 13.5, 0.2);
    for (const s of [-1, 1]) f.bar(mRedP, [s * 0.2, 0.1, 0.1], [s * 0.18, 1.3, -0.12], 0.016, 6);
    for (let i = 1; i < 4; i++) f.bar(mRedP, [-0.2, i * 0.3, 0.1 - i * 0.055], [0.2, i * 0.3, 0.1 - i * 0.055], 0.01, 4);
    f.box(mGalv, 0.42, 0.02, 0.22, 0, 0.02, 0.2);
    for (const s of [-1, 1]) f.geo(mRubber, new THREE.CylinderGeometry(0.11, 0.11, 0.07, 14), s * 0.26, 0.11, 0.05, 0, 0, Math.PI / 2);
    f.col(-0.3, 0.3, -0.15, 0.32, 0, 1.3, false);
  }

  extinguisher(-16.99, 12.2 - 2.0, Math.PI / 2);
  sign({ bg: "#1a8a3a", fg: "#ffffff", lines: ["EXIT"], icon: "exit", w: 256, h: 96 }, -15.2, 3.3, 13.98, Math.PI, 0.6, 0.22, 0.8);
  sign({ bg: "#ffffff", fg: "#c3221f", lines: ["NO SMOKING", "ON THE DOCK"], w: 256, h: 128, border: "#c3221f" }, 1.0, 1.8, 13.98, Math.PI, 0.5, 0.25);
  sign({ bg: "#1d3a6b", fg: "#ffffff", lines: ["COLD ROOM 2", "+2°C  KEEP CURTAIN CLOSED"], w: 384, h: 128, icon: "snow" }, -8, 3.45, 5.17, 0, 1.6, 0.52);
  sign({ bg: "#1d3a6b", fg: "#ffffff", lines: ["PICKING", "BAY 2"], w: 256, h: 128 }, 3, 3.1, 5.17, 0, 0.8, 0.4);
  // convex mirror in the corner
  W.geo(mChrome, new THREE.SphereGeometry(0.3, 20, 10, 0, Math.PI * 2, 0, 0.7), 7.6, 3.4, 5.4, -Math.PI / 2 - 0.6, 0, 0);
  stripCurtain("x", 5.0, -8, 3.2, 3.0);
  stripCurtain("x", 5.0, 3, 2.4, 2.7);
  // grime / stains on the dock floor
  for (let i = 0; i < 14; i++) decal(mStain, rr(-15, 7), rr(6, 13.5), rr(0.6, 1.8));

  // ================================================================ COLD ROOM 2 (x -17..8, z -5..5)
  k.room("Cold Room 2", -17, 8, -5, 5);
  // two double rows of wire racks (west half)
  for (const [zc, ry] of [[-2.0, 0], [2.1, Math.PI]] as [number, number][]) {
    for (const xc of [-14.6, -12.4]) wireRack(xc, zc, ry, 2.0, 0.6, 2.1, 5, (f, y, l) => fillMixed(f, y, l, 2.0, 0.6));
    for (const xc of [-8.2, -6.0]) wireRack(xc, zc, ry, 2.0, 0.6, 2.1, 5, (f, y, l) => fillMixed(f, y, l, 2.0, 0.6));
  }
  // wall racks along the north tile wall (behind the rows)
  for (const xc of [-15.6, -13.6, -9.0, -7.0]) wireRack(xc, -4.5, 0, 1.8, 0.5, 2.1, 5, (f, y, l) => fillMixed(f, y, l, 1.8, 0.5));
  for (const xc of [-15.6, -13.6, -11.6]) wireRack(xc, 4.5, Math.PI, 1.8, 0.5, 1.8, 4, (f, y, l) => fillMixed(f, y, l, 1.8, 0.5));
  // east half: overhead meat rails with pig halves and beef quarters
  meatRail(-3.2, 7.2, -2.3, 2.45);
  meatRail(-3.2, 7.2, 1.9, 2.45);
  for (const zr of [-2.3, 1.9]) for (let x = -2.6; x < 6.9; x += rr(0.62, 0.8)) { if (rnd() < 0.18) continue; carcass(x, zr, 2.45, rnd() < 0.4, rr(-0.5, 0.5) + (zr > 0 ? Math.PI : 0)); }
  meatRail(-3.2, 7.2, 4.35, 2.45);
  for (let x = -2.4; x < 6.9; x += 1.1) if (rnd() < 0.6) carcass(x, 4.35, 2.45, true, rr(-0.3, 0.3));
  // blood / water drips below the carcasses
  for (let i = 0; i < 10; i++) decal(mBlood, rr(-2.5, 7), pick([-2.3, 1.9]) + rr(-0.3, 0.3), rr(0.3, 0.8));
  // floor drain channel
  flat(mSteel, -3, 7.5, -0.12, 0.12, 0.006);
  for (let x = -2.95; x < 7.5; x += 0.06) flat(mDarkP, x, x + 0.025, -0.1, 0.1, 0.008);
  // floor scale + tubs of offal
  {
    const f = F(-3.9, -3.9, 0);
    f.box(mSteel, 1.2, 0.07, 1.2, 0, 0, 0);
    flat(mHazard, -4.55, -3.25, -3.25, -3.18, 0.075, 0, [5, 1]);
    f.box(mGreyP, 0.28, 0.2, 0.08, -0.45, 1.15, -0.6);
    f.bar(mGreyP, [-0.45, 0.07, -0.6], [-0.45, 1.15, -0.6], 0.02, 6);
    f.plane(lcd("48.6"), 0.2, 0.08, -0.45, 1.25, -0.555);
    f.inst(tubI, 0.1, 0.07, 0.1, [1.3, 1.3, 1.3], "#ffffff");
    f.inst(tubI, -0.1, 0.07, -0.25, [1.3, 1.3, 1.3], "#ffffff");
  }
  // roll cages + crates in the aisle
  rollCage(-10.2, -0.1, 0.2);
  crateStack(-3.9, 3.6, 0.1, 5, ["#2f6fc0"]);
  crateStack(-3.2, 3.9, -0.2, 3, ["#c63a2a", "#2f6fc0"]);
  crateStack(-10.9, 4.3, 0.05, 6, ["#e6e6e0"]);
  loadedPallet(6.9, -4.1, Math.PI / 2, 3, { kind: 1 });
  // temperature display + thermometer
  F(-2.2, -4.84, 0).box(mGreyP, 0.46, 0.2, 0.05, 0, 2.6, 0.02);
  F(-2.2, -4.84, 0).plane(lcd("+2.1°C"), 0.4, 0.15, 0, 2.7, 0.05);
  sign({ bg: "#ffffff", fg: "#1d3a6b", lines: ["FIFO", "FIRST IN - FIRST OUT"], w: 256, h: 128, border: "#1d3a6b" }, -11.2, 2.2, -4.84, 0, 0.5, 0.25);
  sign({ bg: "#f0bd1c", fg: "#111111", lines: ["CAUTION", "WET FLOOR"], w: 256, h: 128, icon: "hand" }, 7.84, 1.6, 2.6, -Math.PI / 2, 0.5, 0.25);
  sign({ bg: "#ffffff", fg: "#c3221f", lines: ["RAW MEAT", "HOOKS ONLY"], w: 256, h: 128, border: "#c3221f" }, 7.84, 2.2, -1.0, -Math.PI / 2, 0.5, 0.25);
  sign({ bg: "#1d3a6b", fg: "#ffffff", lines: ["FREEZER  -25°C"], icon: "snow", w: 384, h: 96 }, -11.5, 3.05, -4.83, 0, 1.2, 0.3);
  sign({ bg: "#1d3a6b", fg: "#ffffff", lines: ["BUTCHERY / PREP"], w: 384, h: 96 }, 1.5, 2.95, -4.83, 0, 1.1, 0.28);
  sign({ bg: "#f0bd1c", fg: "#111111", lines: ["MACHINE ROOM", "AUTHORISED ONLY"], w: 256, h: 128, icon: "bolt" }, 7.83, 2.9, 0, -Math.PI / 2, 0.8, 0.4);
  evaporator(-10.5, -4.3, 0, 3, false);
  evaporator(2.0, 4.3, Math.PI, 3, false);
  // yellow floor lines
  flat(mYellowClean, -16, -4.6, -1.35, -1.27, 0.005);
  flat(mYellowClean, -16, -4.6, 1.37, 1.45, 0.005);
  // strip curtain to freezer + butchery
  stripCurtain("x", -5.0, -11.5, 2.4, 2.7);
  stripCurtain("x", -5.0, 1.5, 2.0, 2.6);
  for (let i = 0; i < 10; i++) decal(mStain, rr(-16, 7), rr(-4.5, 4.5), rr(0.5, 1.4));

  // ================================================================ BLAST FREEZER (x -17..-6, z -14..-5)
  k.room("Blast Freezer", -17, -6, -14, -5);
  // frost on the floor along the walls and on walls
  for (const [x1, x2, z1, z2] of [[-17, -6, -14, -13.1], [-17, -16.1, -14, -5], [-6.9, -6, -14, -5]] as [number, number, number, number][]) flat(mFrost, x1, x2, z1, z2, 0.007, 0, [3, 1]);
  face(mFrost, "x", -14.15, -17, -6, 0, 1.2, 1, 0.19, undefined, 4);
  face(mFrost, "z", -17.15, -14, -5, 0, 1.0, 1, 0.19, undefined, 3);
  face(mFrost, "z", -6, -14, -5, 0, 1.1, -1, 0.19, undefined, 3);
  face(mFrost, "x", -5, -17, -6, 0, 0.9, -1, 0.19, undefined, 4);
  // racks with frozen cartons along the west + north walls
  for (const zc of [-12.6, -10.2, -7.8]) wireRack(-16.45, zc, Math.PI / 2, 2.2, 0.8, 2.3, 5, (f, y, l) => fillMixed(f, y, l, 2.2, 0.8, true));
  for (const xc of [-13.4, -11.0, -8.6]) wireRack(xc, -13.45, 0, 2.2, 0.8, 2.3, 5, (f, y, l) => fillMixed(f, y, l, 2.2, 0.8, true));
  // frozen pallets in the middle
  loadedPallet(-12.6, -9.3, 0.05, 5, { frost: true, kind: 2 });
  loadedPallet(-12.5, -8.2, -0.08, 4, { frost: true, kind: 3 });
  loadedPallet(-9.6, -9.9, 1.55, 6, { frost: true, wrap: true, kind: 0 });
  // fish on ice in crates
  for (const [cx, cz, n] of [[-7.2, -7.2, 3], [-7.1, -6.2, 2], [-8.0, -6.3, 4]] as [number, number, number][]) {
    const top = crateStack(cx, cz, rr(-0.2, 0.2), n, ["#2f6fc0", "#e6e6e0"]);
    for (let i = 0; i < 12; i++) iceI.add(cx + rr(-0.25, 0.25), top - 0.02, cz + rr(-0.15, 0.15), [0.05, 0.035, 0.05], undefined, rr(0, 6));
    for (let i = 0; i < 4; i++) W.geo(k.mat(null, "#9aa6ae", [1, 1], { metalness: 0.6, roughness: 0.25 }), place(new THREE.SphereGeometry(1, 10, 6), 0, 0, 0, 0, 0, 0, [0.2, 0.035, 0.05]), cx + rr(-0.12, 0.12), top + 0.02, cz + rr(-0.1, 0.1), 0, rr(-0.4, 0.4));
  }
  // snow drifts + ice chunks on the floor
  for (let i = 0; i < 26; i++) snowI.add(rr(-16.5, -6.5), 0, pick([-13.7, -5.4, rr(-13.5, -5.5)]), [rr(0.2, 0.6), rr(0.03, 0.08), rr(0.2, 0.5)], undefined, rr(0, 3));
  for (let i = 0; i < 18; i++) iceI.add(rr(-16, -7), 0.03, rr(-13.4, -5.8), [rr(0.04, 0.1), rr(0.03, 0.06), rr(0.04, 0.1)], undefined, rr(0, 6));
  evaporator(-11.5, -13.4, 0, 4, true);
  // heavy insulated door (swung open, against the wall) + frame heater strip
  {
    const f = F(-10.25, -5.25, 0);
    f.box(mPanelCold, 1.2, 2.55, 0.14, 0.62, 0, -0.08, 0, 0.0);
    f.box(mSteel, 0.06, 0.4, 0.12, 1.1, 1.0, 0.02);
    f.box(mSteel, 0.08, 0.2, 0.06, 0.02, 0.5, -0.02); f.box(mSteel, 0.08, 0.2, 0.06, 0.02, 2.0, -0.02);
    f.col(0, 1.25, -0.17, 0.02, 0, 2.55, false);
  }
  // emergency release + dial + sign (freezer side of the door)
  {
    const f = F(-13.2, -5.16, Math.PI);
    f.box(mYellowClean, 0.18, 0.18, 0.06, 0, 1.1, 0.03);
    f.geo(mRedP, new THREE.CylinderGeometry(0.05, 0.05, 0.05, 16), 0, 1.19, 0.08, Math.PI / 2);
    sign({ bg: "#c3221f", fg: "#ffffff", lines: ["PUSH TO EXIT", "EMERGENCY RELEASE"], w: 256, h: 128 }, -13.2, 1.52, -5.16, Math.PI, 0.4, 0.2);
    F(-9.7, -5.16, Math.PI).geo(mGreyP, new THREE.CylinderGeometry(0.13, 0.13, 0.05, 24), 0, 1.6, 0.02, Math.PI / 2);
    F(-9.7, -5.16, Math.PI).geo(mDial, new THREE.CircleGeometry(0.115, 24), 0, 1.6, 0.046);
    sign({ bg: "#1d3a6b", fg: "#ffffff", lines: ["-25°C", "THERMAL GEAR REQUIRED"], icon: "snow", w: 384, h: 128 }, -8.8, 2.3, -5.16, Math.PI, 0.9, 0.3);
  }
  // frozen hanging beef in the corner
  meatRail(-9, -6.4, -11.3, 2.45);
  for (let x = -8.6; x < -6.5; x += 0.7) carcass(x, -11.3, 2.45, true, rr(-0.4, 0.4));
  flat(mFrost, -9, -6.2, -11.8, -10.8, 0.008, 0, [2, 1]);

  // ================================================================ BUTCHERY (x -6..8, z -14..-5)
  k.room("Butchery", -6, 8, -14, -5);
  // floor drains
  for (const [dx, dz] of [[-1, -9.5], [4, -9.5]]) { flat(mSteel, dx - 0.2, dx + 0.2, dz - 0.2, dz + 0.2, 0.006); for (let i = 0; i < 6; i++) flat(mDarkP, dx - 0.17 + i * 0.065, dx - 0.14 + i * 0.065, dz - 0.17, dz + 0.17, 0.008); decal(mStain, dx, dz, 1.2); }
  // two prep tables with boards, knives, meat
  const knifeI = new IList(mergeG([place(boxGeo(0.22, 0.004, 0.035), 0.11, 0, 0), place(boxGeo(0.12, 0.022, 0.028), -0.06, 0, 0)]), mSteel);
  const boardTop = (f: Fr, lx: number, lz: number, y: number) => {
    f.box(mWhitePl, 0.6, 0.03, 0.4, lx, y, lz, 0, rr(-0.1, 0.1));
    f.box(mMeat, rr(0.2, 0.3), 0.07, rr(0.12, 0.18), lx + rr(-0.1, 0.1), y + 0.03, lz + rr(-0.05, 0.05), 0, rr(-1, 1));
    f.inst(knifeI, lx + 0.15, y + 0.04, lz + 0.14, [1, 1, 1], undefined, rr(-0.5, 0.5));
  };
  prepTable(-1.0, -9.3, 0, 2.4, 0.9, (f) => { boardTop(f, -0.6, 0, 0.9); boardTop(f, 0.5, -0.1, 0.9); f.inst(tubI, 0.8, 0.22, 0, [1, 1, 1], "#ffffff"); f.inst(tubI, -0.6, 0.22, 0.1, [1, 1, 1], "#ffffff"); });
  prepTable(3.8, -9.3, 0, 2.4, 0.9, (f) => {
    boardTop(f, 0.6, 0.05, 0.9);
    // meat mincer
    f.box(mSteel, 0.3, 0.3, 0.35, -0.6, 0.9, 0);
    f.geo(mSteel, latheG([[0.001, 0], [0.09, 0], [0.09, 0.3], [0.11, 0.32], [0.001, 0.32]], 16), -0.6, 1.2, 0.15, Math.PI / 2);
    f.geo(mSteel, latheG([[0.05, 0], [0.07, 0.02], [0.18, 0.2], [0.19, 0.22]], 16), -0.6, 1.32, -0.05);
    for (let i = 0; i < 5; i++) f.inst(packI, 0.1 + i * 0.12, 0.94, -0.3, [0.1, 0.04, 0.18], C.hexShade("#ffffff", 0.8 + rnd() * 0.3));
  });
  // bandsaw
  {
    const f = F(6.9, -12.4, -Math.PI / 2);
    f.box(mSteel, 0.8, 0.9, 0.7, 0, 0, 0);
    f.box(mSteel, 0.9, 0.04, 0.8, 0, 0.9, 0);
    f.box(mSteel, 0.35, 1.0, 0.6, 0, 0.94, -0.12);
    f.box(mSteel, 0.8, 0.35, 0.6, 0, 1.94, -0.12);
    f.box(mGreyP, 0.04, 0.9, 0.04, 0.22, 1.04, 0.1);
    f.box(mRedP, 0.08, 0.08, 0.04, -0.3, 1.6, 0.2);
    sign({ bg: "#f0bd1c", fg: "#111111", lines: ["DANGER", "BLADE - KEEP HANDS CLEAR"], w: 256, h: 128, icon: "hand" }, 6.9 + 0.31, 1.5, -12.4, Math.PI / 2, 0.3, 0.15, 0, null);
    f.col(-0.45, 0.45, -0.45, 0.4, 0, 2.3);
  }
  // sinks along the north wall + knife magnet + aprons
  sinkUnit(-3.5, -13.55, 0, 1.4);
  sinkUnit(-1.9, -13.55, 0, 1.4);
  {
    const f = F(1.2, -13.99, 0);
    f.box(mBlackPl, 1.0, 0.05, 0.02, 0, 1.55, 0.01);
    for (let i = 0; i < 7; i++) f.geo(mSteel, mergeG([place(boxGeo(0.035, 0.2 + rnd() * 0.08, 0.004), 0, -0.12, 0), place(boxGeo(0.03, 0.11, 0.022), 0, 0.05, 0)]), -0.42 + i * 0.14, 1.52, 0.03);
    // apron hooks
    for (let i = 0; i < 3; i++) {
      f.cyl(mSteel, 0.012, 0.012, 0.08, 2.0 + i * 0.5, 1.75, 0.04, 6, Math.PI / 2);
      f.geo(mFabric, place(latheG([[0.02, 0], [0.26, 0.05], [0.25, 0.7], [0.14, 0.85], [0.06, 0.95]].reverse().map(([a, b]) => [a, 1 - b] as [number, number]), 12), 0, 0, 0, 0, 0, 0, [1, 1, 0.12]), 2.0 + i * 0.5, 0.82, 0.06);
    }
    sign({ bg: "#1a6ab0", fg: "#ffffff", lines: ["WASH YOUR HANDS", "BEFORE HANDLING FOOD"], icon: "hand", w: 384, h: 128 }, -2.7, 1.85, -13.98, 0, 0.7, 0.24);
    sign({ bg: "#ffffff", fg: "#1a7a3a", lines: ["HACCP ZONE", "HAIRNETS & GLOVES"], w: 256, h: 128, border: "#1a7a3a" }, 4.2, 1.8, -13.98, 0, 0.5, 0.25);
  }
  // aprons (colour variation) — tint the fabric material per apron via separate mats
  // wall hooks with hanging meat along the west tile wall
  meatRail(-5.6, -5.6 + 0.01, -8, 2.45);
  W.bar(mSteel, [-5.55, 2.2, -12.8], [-5.55, 2.2, -6], 0.02, 8);
  for (let z = -12.5; z < -6.2; z += 0.55) {
    W.geo(mSteel, tubeG([[-5.55, 2.22, z], [-5.52, 2.05, z], [-5.46, 1.98, z], [-5.43, 2.03, z]], 0.006, 8, 4));
    if (rnd() < 0.7) { const s = rr(0.5, 0.8); W.geo(mMeat, place(latheG([[0.01, 0], [0.09, 0.06], [0.12, 0.25], [0.08, 0.45], [0.02, 0.5]], 12), 0, 0, 0, 0, 0, 0, [s, s, s * 0.6]), -5.43, 1.98 - 0.5 * s, z); }
  }
  k.collider(-5.65, -5.25, -12.8, -6.1, 1.2, 2.3, false);
  // white tub stacks, mop bucket, hose reel
  for (const [tx, tz, n] of [[6.8, -6.0, 5], [6.3, -6.1, 3], [-5.4, -5.8, 4]] as [number, number, number][]) { for (let i = 0; i < n; i++) tubI.add(tx, i * 0.09, tz, [1, 1, 1], "#ffffff"); k.collider(tx - 0.21, tx + 0.21, tz - 0.21, tz + 0.21, 0, n * 0.09 + 0.22); }
  {
    const f = F(-4.8, -12.9, 0.4);
    f.geo(mYellowClean, latheG([[0.001, 0], [0.17, 0], [0.19, 0.02], [0.21, 0.32], [0.22, 0.34]], 16), 0, 0.06, 0);
    f.box(mYellowClean, 0.18, 0.12, 0.2, 0.25, 0.3, 0);
    f.bar(mWood, [0, 0.2, 0], [-0.1, 1.35, 0.2], 0.014, 6);
    f.geo(mFabric, latheG([[0.001, 0], [0.12, 0.02], [0.08, 0.2]], 10), 0, 0.12, 0);
    for (const [lx, lz] of [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]]) f.geo(mBlackPl, new THREE.SphereGeometry(0.03, 8, 6), lx, 0.03, lz);
    f.col(-0.22, 0.4, -0.22, 0.22, 0, 0.4);
  }
  {
    const f = F(7.84, -7.4, -Math.PI / 2);
    f.box(mGreyP, 0.35, 0.35, 0.1, 0, 1.0, 0.05);
    f.geo(mRedP, new THREE.TorusGeometry(0.2, 0.06, 8, 20), 0, 1.18, 0.2);
    f.geo(mRedP, new THREE.CylinderGeometry(0.14, 0.14, 0.12, 16), 0, 1.18, 0.2, Math.PI / 2);
    f.geo(mYellowClean, tubeG([[0.1, 1.05, 0.2], [0.2, 0.6, 0.4], [0.0, 0.03, 0.7], [-0.6, 0.03, 0.9], [-0.9, 0.03, 0.5], [-0.5, 0.03, 0.3]], 0.02, 30, 6));
  }
  fluoro; // (keeps linters quiet if unused)
  for (let i = 0; i < 8; i++) decal(mBlood, rr(-3, 6), rr(-12.5, -6.5), rr(0.25, 0.6));
  for (let i = 0; i < 5; i++) decal(mStain, rr(-5.5, 7.5), rr(-13.5, -5.5), rr(0.6, 1.4));
  // wall-mounted fly killer (glowing UV tube)
  {
    const f = F(1.5, -13.99, 0);
    f.box(mWhitePl, 0.6, 0.25, 0.12, 0, 2.6, 0.06);
    f.geo(k.mat(null, "#9a7dff", [1, 1], { emissive: "#8a60ff", emissiveIntensity: 2 }), new THREE.CylinderGeometry(0.015, 0.015, 0.5, 8), 0, 2.72, 0.1, 0, 0, Math.PI / 2);
    for (let i = 0; i < 8; i++) f.bar(mChrome, [-0.27 + i * 0.077, 2.6, 0.13], [-0.27 + i * 0.077, 2.85, 0.13], 0.003, 3);
  }

  // ================================================================ MACHINE ROOM (x 8..17, z -14..7)
  k.room("Machine Room", 8, 17, -14, 7);
  const compressor = (x: number, z: number, ry: number, tag: string) => {
    const f = F(x, z, ry);
    // skid base
    f.box(mDarkP, 3.0, 0.15, 1.4, 0, 0, 0);
    for (const lx of [-1.4, 1.4]) f.box(mDarkP, 0.12, 0.3, 1.4, lx, 0, 0);
    // motor
    f.geo(mGreenP, new THREE.CylinderGeometry(0.34, 0.34, 1.0, 24), -0.8, 0.62, 0, 0, 0, Math.PI / 2);
    for (let i = 0; i < 10; i++) f.geo(mGreenP, new THREE.BoxGeometry(0.9, 0.03, 0.74), -0.8, 0.62, 0, (i * Math.PI) / 10);
    f.box(mGreenP, 0.3, 0.2, 0.25, -0.8, 0.96, 0.18);
    // compressor body
    f.geo(mBlueP, latheG([[0.001, 0], [0.3, 0], [0.34, 0.05], [0.34, 0.7], [0.28, 0.8], [0.001, 0.82]], 24), 0.5, 0.62, 0, 0, 0, -Math.PI / 2);
    f.box(mBlueP, 0.7, 0.35, 0.7, 0.6, 0.15, 0);
    // receiver tank
    f.geo(mGreyP, latheG([[0.001, 0], [0.18, 0.02], [0.24, 0.1], [0.25, 0.2], [0.25, 2.3], [0.24, 2.4], [0.18, 2.48], [0.001, 2.5]], 20), -1.25, 1.55, -0.35, 0, 0, -Math.PI / 2);
    for (const lx of [-1.0, 0.9]) f.box(mDarkP, 0.08, 0.2, 0.3, lx, 1.12, -0.35);
    // pipes rising to the ceiling
    f.geo(mSteel, tubeG([[0.9, 0.9, 0.0], [1.2, 1.1, 0.1], [1.25, 2.0, 0.1], [1.25, H - 0.35, 0.1]], 0.05, 24, 8));
    f.geo(mWhitePl, tubeG([[0.2, 1.1, 0.2], [0.2, 2.2, 0.3], [0.2, H - 0.5, 0.3]], 0.085, 18, 10));
    // gauges
    for (let i = 0; i < 3; i++) {
      f.cyl(mSteel, 0.012, 0.012, 0.25, 0.5 + i * 0.18, 1.45, 0.3, 6);
      f.geo(mChrome, new THREE.CylinderGeometry(0.06, 0.06, 0.03, 16), 0.5 + i * 0.18, 1.74, 0.3, Math.PI / 2);
      f.geo(mDial, new THREE.CircleGeometry(0.052, 16), 0.5 + i * 0.18, 1.74, 0.316);
    }
    // control box
    f.box(mGreyP, 0.5, 0.6, 0.22, 1.2, 0.6, 0.55);
    f.geo(mLedGreen, new THREE.CylinderGeometry(0.02, 0.02, 0.02, 8), 1.1, 1.05, 0.67, Math.PI / 2);
    f.geo(mLedRed, new THREE.CylinderGeometry(0.02, 0.02, 0.02, 8), 1.2, 1.05, 0.67, Math.PI / 2);
    f.plane(lcd(tag), 0.2, 0.08, 1.3, 1.05, 0.662);
    f.col(-1.5, 1.5, -0.7, 0.7, 0, 1.85);
    decal(mStain, x, z + 0.3, 2.2);
  };
  compressor(15.4, -11.4, -Math.PI / 2, "C-1");
  compressor(15.4, -6.9, -Math.PI / 2, "C-2");
  sign({ bg: "#f0bd1c", fg: "#111111", lines: ["DANGER  AMMONIA NH3", "NO NAKED FLAMES"], icon: "fire", w: 384, h: 128 }, 16.84, 2.6, -9.1, -Math.PI / 2, 1.1, 0.36);
  // gas cylinder cluster near the door, chained to the wall
  {
    const cols = ["#2d6b44", "#2d6b44", "#8c9396", "#3a57a0", "#8c9396", "#b7372b", "#2d6b44", "#e0e0dc"];
    for (let i = 0; i < 8; i++) {
      const z = 1.3 + i * 0.28 + rr(-0.03, 0.03), x = 8.4 + (i % 2) * 0.24;
      const c = cols[i];
      gasI.add(x, 0, z, [1, 1 + rr(-0.05, 0.08), 1], c, rr(0, 6));
      capI.add(x, 1.44, z, [1, 1, 1], C.hexShade(c, 0.8));
      cylI.add(x, 1.0, z, [0.118, 0.14, 0.118], "#f1efe6"); // label band
    }
    k.collider(8.15, 8.8, 1.1, 3.6, 0, 1.6);
    for (const y of [0.6, 1.1]) W.geo(mGalv, tubeG([[8.18, y, 1.05], [8.55, y - 0.03, 1.2], [8.75, y - 0.04, 2.3], [8.55, y - 0.03, 3.5], [8.18, y, 3.65]], 0.008, 24, 4));
    sign({ bg: "#ffffff", fg: "#2d6b44", lines: ["COMPRESSED GAS", "STORE UPRIGHT - CHAIN"], w: 384, h: 128, border: "#2d6b44" }, 8.17, 1.95, 2.35, Math.PI / 2, 0.7, 0.24);
    // cylinder trolley with one on its back
    const f = F(9.4, 4.6, 0.8);
    f.bar(mRedP, [-0.2, 0.1, 0], [-0.2, 1.2, -0.1], 0.015, 6); f.bar(mRedP, [0.2, 0.1, 0], [0.2, 1.2, -0.1], 0.015, 6);
    f.bar(mRedP, [-0.2, 1.2, -0.1], [0.2, 1.2, -0.1], 0.015, 6);
    for (const s of [-1, 1]) f.geo(mRubber, new THREE.CylinderGeometry(0.1, 0.1, 0.06, 14), s * 0.25, 0.1, -0.05, 0, 0, Math.PI / 2);
    f.inst(gasI, 0, 0.12, 0.06, [1, 0.8, 1], "#8c9396", 0, -0.08);
    f.col(-0.3, 0.3, -0.2, 0.25, 0, 1.25);
  }
  // electrical cabinets on the north wall
  for (let i = 0; i < 4; i++) {
    const f = F(9.4 + i * 0.95, -13.64, 0);
    const lab = ["MAIN SWITCH 400V", "COMPRESSOR MCC", "LIGHTING DB-2", "DEFROST CONTROL"][i];
    f.box(mGreyP, 0.9, 2.0, 0.55, 0, 0.1, 0);
    f.box(mDarkP, 0.9, 0.1, 0.55, 0, 0, 0);
    f.plane(k.mat(k.tex("cs-pd" + i, () => C.csPanelDoor(lab)), "#ffffff", [1, 1], { roughness: 0.45, metalness: 0.3, bump: 0.2 }), 0.84, 1.9, 0, 1.1, 0.278);
    f.box(mBlackPl, 0.03, 0.14, 0.04, 0.35, 1.1, 0.29);
    f.geo(mLedGreen, new THREE.CylinderGeometry(0.015, 0.015, 0.02, 8), -0.3, 1.9, 0.285, Math.PI / 2);
    f.cyl(mGalv, 0.03, 0.03, H - 2.1, -0.25, 2.1, -0.1, 8); // conduit
    f.cyl(mGalv, 0.03, 0.03, H - 2.1, 0.2, 2.1, -0.1, 8);
  }
  k.collider(8.9, 12.7, -13.95, -13.35, 0, 2.1, true);
  sign({ bg: "#f0bd1c", fg: "#111111", lines: ["DANGER", "HIGH VOLTAGE"], icon: "bolt", w: 256, h: 128 }, 13.3, 1.6, -13.99, 0, 0.5, 0.25);
  // condenser / air-handling unit with a big spinning top fan
  {
    const f = F(12.3, -2.4, 0);
    f.box(mCreamP, 2.0, 1.4, 1.3, 0, 0.1, 0);
    for (const lx of [-0.9, 0.9]) for (const lz of [-0.55, 0.55]) f.box(mDarkP, 0.12, 0.1, 0.12, lx, 0, lz);
    for (let i = 0; i < 16; i++) f.box(mGalv, 1.8, 0.02, 0.02, 0, 0.3 + i * 0.07, 0.655);
    f.geo(mFanGuard, new THREE.CircleGeometry(0.5, 28), 0, 1.51, 0, -Math.PI / 2);
    f.geo(mDarkP, new THREE.TorusGeometry(0.52, 0.03, 6, 28), 0, 1.51, 0, Math.PI / 2);
    fan(12.3, 1.47, -2.4, 0.46, 0, 0, 7);
    f.plane(signMat({ bg: "#ffffff", fg: "#222222", lines: ["CONDENSER UNIT CU-3", "ISOLATE BEFORE SERVICE"], w: 384, h: 96, border: "#222222" }), 0.7, 0.18, -0.4, 1.2, 0.66);
    f.col(-1.0, 1.0, -0.65, 0.66, 0, 1.52);
    f.geo(mWhitePl, tubeG([[-1.0, 1.0, 0], [-1.4, 1.1, 0], [-1.6, 2.5, 0], [-1.6, H - 0.4, 0]], 0.09, 20, 10));
  }
  // overhead pipe runs (insulated, frosted) from the compressors to the cold rooms
  for (const [py, pr, m] of [[H - 0.35, 0.09, mWhitePl], [H - 0.6, 0.06, mSteel], [H - 0.35, 0.07, mSnow]] as [number, number, Mat][]) {
    const pz = m === mSnow ? -4.7 : m === mSteel ? -4.4 : -4.1;
    W.geo(m, tubeG([[15.6, py, -11.3], [14.2, py, -11.3], [13.9, py, pz], [8.2, py, pz]], pr, 30, 10));
  }
  for (let x = 9; x < 14; x += 1.2) W.bar(mGalv, [x, H - 0.25, -4.9], [x, H - 0.25, -3.9], 0.015, 4);
  // workbench + pegboard + vise + toolbox
  {
    const f = F(16.55, 3.2, -Math.PI / 2);
    for (const lx of [-0.9, 0.9]) for (const lz of [-0.28, 0.28]) f.box(mDarkP, 0.06, 0.9, 0.06, lx, 0, lz);
    f.box(mWood, 2.0, 0.06, 0.7, 0, 0.9, 0);
    f.box(mDarkP, 1.9, 0.03, 0.6, 0, 0.2, 0);
    f.box(k.mat(k.tex("cs-peg", () => T.dots("#c9a877", "#5a4430", 16)), "#ffffff", [2, 1], { roughness: 0.8, bump: 0.4 }), 2.0, 1.0, 0.02, 0, 1.2, -0.34);
    for (let i = 0; i < 9; i++) f.box(pick([mRedP, mDarkP, mBlueP, mYellowClean]), 0.04, rr(0.15, 0.3), 0.02, -0.85 + i * 0.2, rr(1.5, 1.8), -0.31);
    f.box(mBlueP, 0.2, 0.15, 0.15, 0.7, 0.96, 0.1); f.box(mSteel, 0.28, 0.06, 0.05, 0.7, 1.08, 0.15);
    f.box(mRedP, 0.5, 0.2, 0.25, -0.4, 0.96, 0.05);
    f.box(mRedP, 0.6, 0.8, 0.45, -0.5, 0.0, 0.8);
    for (let i = 0; i < 4; i++) f.box(mDarkP, 0.5, 0.02, 0.02, -0.5, 0.15 + i * 0.18, 1.03);
    for (let i = 0; i < 6; i++) bottleI.add(...f.pt(0.2 + i * 0.07, 0.1).flatMap((v, j) => j === 0 ? [v, 0.93] : [v]) as [number, number, number], [0.7, 0.7, 0.7], pick(["#d23a2a", "#e6c21a", "#2a5aa8", "#e6e6e6"]));
    f.col(-1.0, 1.0, -0.35, 0.35, 0, 0.96);
    f.col(-0.8, -0.2, 0.58, 1.03, 0, 0.8);
  }
  // oil drums
  const drum = (x: number, z: number, m: Mat, top = false) => {
    W.geo(m, latheG([[0.001, 0], [0.28, 0], [0.29, 0.02], [0.29, 0.28], [0.3, 0.3], [0.29, 0.32], [0.29, 0.58], [0.3, 0.6], [0.29, 0.62], [0.29, 0.86], [0.28, 0.88], [0.001, 0.88]], 24), x, top ? 0.88 : 0, z);
    k.collider(x - 0.29, x + 0.29, z - 0.29, z + 0.29, 0, top ? 1.76 : 0.88);
  };
  drum(16.4, 5.9, mBlueP); drum(15.8, 6.2, mRedP); drum(16.4, 5.9, mGreenP, true);
  sign({ bg: "#ffffff", fg: "#222222", lines: ["WASTE OIL", "DO NOT MIX"], w: 256, h: 128, border: "#222222" }, 16.84, 1.3, 5.2, -Math.PI / 2, 0.4, 0.2);
  // step ladder leaning on the wall
  {
    const f = F(16.7, -1.8, -Math.PI / 2);
    for (const s of [-1, 1]) f.bar(mYellowClean, [s * 0.22, 0, 0.55], [s * 0.18, 2.3, 0.05], 0.022, 6, false);
    for (let i = 1; i < 8; i++) { const t = i / 8; f.box(mGalv, 0.4 - t * 0.08, 0.03, 0.08, 0, t * 2.3, 0.55 - t * 0.5); }
    f.col(-0.26, 0.26, 0, 0.6, 0, 2.3, false);
  }
  extinguisher(8.16, -1.6, Math.PI / 2);
  sign({ bg: "#1a8a3a", fg: "#ffffff", lines: ["FIRST AID"], icon: "cross", w: 256, h: 96 }, 16.84, 1.9, 0.6, -Math.PI / 2, 0.44, 0.16);
  F(16.84, 0.6, -Math.PI / 2).box(k.mat(null, "#1a8a3a", [1, 1], { roughness: 0.4 }), 0.4, 0.4, 0.14, 0, 1.2, 0.07);
  for (let i = 0; i < 9; i++) decal(mStain, rr(9, 16.5), rr(-13.5, 6.5), rr(0.6, 1.8));

  // ================================================================ OFFICE / BREAK ROOM (x 8..17, z 7..14)
  k.room("Office", 8, 17, 7, 14);
  // desk with monitor along the east wall
  {
    const f = F(16.4, 11.4, -Math.PI / 2);
    f.box(mWood, 2.0, 0.04, 0.8, 0, 0.73, 0);
    for (const lx of [-0.95, 0.95]) f.box(mDarkP, 0.05, 0.73, 0.7, lx, 0, 0);
    f.box(mGreyP, 0.45, 0.6, 0.66, 0.65, 0.05, 0);
    for (let i = 0; i < 3; i++) { f.box(mDarkP, 0.4, 0.004, 0.004, 0.65, 0.22 + i * 0.2, 0.335); f.box(mChrome, 0.1, 0.02, 0.02, 0.65, 0.18 + i * 0.2, 0.345); }
    f.box(mBlackPl, 0.55, 0.34, 0.03, -0.2, 0.95, -0.2);
    f.plane(mScreenOn, 0.52, 0.3, -0.2, 1.12, -0.183);
    f.box(mBlackPl, 0.05, 0.2, 0.05, -0.2, 0.77, -0.22); f.box(mBlackPl, 0.22, 0.015, 0.16, -0.2, 0.77, -0.22);
    f.box(mBlackPl, 0.44, 0.02, 0.15, -0.2, 0.77, 0.1);
    f.box(mBlackPl, 0.06, 0.02, 0.1, 0.15, 0.77, 0.12);
    f.geo(mPaper, new THREE.PlaneGeometry(0.21, 0.3), 0.5, 0.775, 0.05, -Math.PI / 2, 0.3);
    f.geo(mPaper, new THREE.PlaneGeometry(0.21, 0.3), 0.55, 0.78, 0.0, -Math.PI / 2, -0.2);
    f.geo(mWhitePl, latheG([[0.001, 0], [0.04, 0], [0.045, 0.1], [0.001, 0.1]], 12), -0.7, 0.77, 0.1);
    f.geo(mBlackPl, latheG([[0.001, 0], [0.06, 0], [0.06, 0.02], [0.02, 0.05], [0.02, 0.35], [0.001, 0.36]], 12), -0.8, 0.77, -0.25);
    f.geo(mBulbWarm, latheG([[0.02, 0], [0.12, 0.02], [0.08, 0.12], [0.001, 0.13]], 12), -0.8, 1.08, -0.15, 0.4);
    f.col(-1.0, 1.0, -0.4, 0.4, 0, 0.77);
    // office chair (5 star base)
    const cf = F(15.5, 11.2, Math.PI / 2 + 0.3);
    for (let i = 0; i < 5; i++) { const a = (i * Math.PI * 2) / 5; cf.bar(mBlackPl, [0, 0.08, 0], [Math.cos(a) * 0.3, 0.05, Math.sin(a) * 0.3], 0.02, 6, false); cf.geo(mBlackPl, new THREE.SphereGeometry(0.03, 8, 6), Math.cos(a) * 0.3, 0.03, Math.sin(a) * 0.3); }
    cf.cyl(mChrome, 0.025, 0.025, 0.35, 0, 0.08, 0, 8);
    const mChairF = k.mat(k.tex("cs-fab", () => T.noise("#ffffff", 0.14, 5, 3000)), "#2c3a4a", [2, 2], { roughness: 0.9, bump: 0.5 });
    cf.box(mChairF, 0.48, 0.08, 0.46, 0, 0.44, 0);
    cf.box(mChairF, 0.46, 0.55, 0.07, 0, 0.55, -0.24, -0.1);
    cf.col(-0.3, 0.3, -0.3, 0.3, 0, 0.52);
  }
  // filing cabinet, lockers with parkas, whiteboard, calendar, clock
  {
    const f = F(16.55, 8.2, -Math.PI / 2);
    f.box(mGreyP, 0.5, 1.3, 0.6, 0, 0, 0);
    for (let i = 0; i < 4; i++) { f.box(mDarkP, 0.46, 0.004, 0.004, 0, 0.32 * (i + 1), 0.302); f.box(mChrome, 0.12, 0.02, 0.03, 0, 0.32 * i + 0.22, 0.31); }
    f.col(-0.25, 0.25, -0.3, 0.3, 0, 1.3);
    f.box(carton.plain, 0.4, 0.3, 0.3, 0.02, 1.3, 0);
  }
  for (let i = 0; i < 4; i++) {
    const f = F(13.0 + i * 0.46, 7.4, 0);
    f.box(i % 2 ? mBlueP : mGreyP, 0.45, 1.9, 0.5, 0, 0.0, 0);
    for (let v = 0; v < 5; v++) f.box(mDarkP, 0.25, 0.012, 0.004, 0, 1.55 + v * 0.04, 0.252);
    f.box(mChrome, 0.03, 0.12, 0.03, 0.16, 1.0, 0.26);
    f.plane(signMat({ bg: "#ffffff", fg: "#222222", lines: [`${11 + i}`], w: 64, h: 48, wear: 0.3 }), 0.08, 0.05, 0, 1.75, 0.253);
  }
  k.collider(12.75, 14.85, 7.14, 7.66, 0, 1.9, true);
  // coat hooks with thermal parkas (cold-store gear)
  for (let i = 0; i < 4; i++) {
    const x = 9.1 + i * 0.55, f = F(x, 7.16, 0);
    f.cyl(mChrome, 0.012, 0.012, 0.08, 0, 1.8, 0.04, 6, Math.PI / 2);
    const col = ["#1f3f7a", "#d05a1a", "#2a2a2e", "#1f3f7a"][i];
    const pm = k.mat(k.tex("cs-fab", () => T.noise("#ffffff", 0.14, 5, 3000)), col, [1, 1], { roughness: 0.8, bump: 0.6 });
    f.geo(pm, place(latheG([[0.05, 1.0], [0.2, 0.92], [0.27, 0.8], [0.28, 0.3], [0.26, 0.0]].reverse().map(([a, b]) => [a, b] as [number, number]), 14), 0, 0, 0, 0, 0, 0, [1, 1, 0.45]), 0, 0.8, 0.16);
    f.geo(mFabric, new THREE.TorusGeometry(0.1, 0.05, 6, 12), 0, 1.78, 0.13, Math.PI / 2);
  }
  k.collider(8.8, 11.2, 7.15, 7.45, 0.8, 1.85, false);
  // boots under the hooks
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { const f = F(9.3 + i * 0.7 + s * 0.07, 7.45, 0); f.box(mBlackPl, 0.11, 0.3, 0.14, 0, 0, 0); f.box(mBlackPl, 0.11, 0.08, 0.3, 0, 0, 0.1); }
  {
    const f = F(12.6, 13.99, Math.PI);
    f.box(mChrome, 1.5, 1.0, 0.03, 0, 1.2, 0.015);
    f.plane(mWb, 1.44, 0.94, 0, 1.7, 0.032);
    f.box(mChrome, 1.3, 0.03, 0.06, 0, 1.18, 0.05);
    for (let i = 0; i < 3; i++) f.box(pick([mRedP, mBlueP, mGreenP]), 0.12, 0.015, 0.015, -0.3 + i * 0.15, 1.21, 0.05, 0, rr(-0.2, 0.2));
    sign({ bg: "#ffffff", fg: "#c3221f", lines: ["SEPTEMBER", "SAFETY FIRST"], w: 256, h: 256, border: "#222222", bold: true }, 14.5, 1.8, 13.98, Math.PI, 0.4, 0.4);
    F(10.1, 13.99, Math.PI).geo(mWhitePl, new THREE.CylinderGeometry(0.16, 0.16, 0.04, 24), 0, 2.4, 0.02, Math.PI / 2);
    F(10.1, 13.99, Math.PI).geo(mDial, new THREE.CircleGeometry(0.14, 24), 0, 2.4, 0.045);
  }
  // break table with chairs, kitchenette counter, microwave, kettle, water cooler, heater
  {
    const f = F(10.8, 11.6, 0.1);
    f.cyl(mWhitePl, 0.5, 0.5, 0.03, 0, 0.72, 0, 28);
    f.cyl(mChrome, 0.03, 0.03, 0.72, 0, 0, 0, 10);
    f.cyl(mChrome, 0.25, 0.28, 0.03, 0, 0, 0, 20);
    f.col(-0.5, 0.5, -0.5, 0.5, 0, 0.75);
    f.geo(mWhitePl, latheG([[0.001, 0], [0.035, 0], [0.04, 0.09], [0.042, 0.1]], 12), 0.15, 0.75, 0.1);
    f.geo(mRedP, latheG([[0.001, 0], [0.035, 0], [0.04, 0.09], [0.042, 0.1]], 12), -0.2, 0.75, -0.1);
    f.geo(mPaper, new THREE.PlaneGeometry(0.3, 0.22), 0.0, 0.752, -0.2, -Math.PI / 2, 0.5);
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3 + 0.4;
      const cf = F(10.8 + Math.cos(a) * 0.75, 11.6 + Math.sin(a) * 0.75, -a - Math.PI / 2);
      for (const [lx, lz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) cf.bar(mChrome, [lx, 0, lz], [lx * 0.9, 0.45, lz * 0.9], 0.012, 6);
      cf.box(mBlueP, 0.42, 0.04, 0.42, 0, 0.45, 0);
      cf.box(mBlueP, 0.42, 0.34, 0.03, 0, 0.55, -0.2, -0.12);
      cf.col(-0.22, 0.22, -0.22, 0.22, 0, 0.49);
    }
  }
  {
    const f = F(9.0, 13.6, Math.PI);
    f.box(mCreamP, 1.6, 0.86, 0.6, 0, 0.0, 0);
    f.box(mWood, 1.64, 0.04, 0.64, 0, 0.86, 0);
    for (let i = 0; i < 3; i++) f.box(mChrome, 0.12, 0.015, 0.02, -0.55 + i * 0.55, 0.75, 0.305);
    f.box(mWhitePl, 0.48, 0.28, 0.36, -0.4, 0.9, 0.02);
    f.box(mScreen, 0.28, 0.2, 0.01, -0.46, 0.94, 0.2);
    f.geo(mChrome, latheG([[0.001, 0], [0.08, 0], [0.085, 0.18], [0.06, 0.24], [0.001, 0.25]], 14), 0.35, 0.9, 0);
    f.geo(mRedP, latheG([[0.001, 0], [0.04, 0], [0.045, 0.1], [0.001, 0.1]], 10), 0.6, 0.9, 0.12);
    f.col(-0.8, 0.8, -0.3, 0.3, 0, 0.9);
  }
  {
    // water cooler
    const f = F(16.5, 13.5, -Math.PI * 0.75);
    f.box(mWhitePl, 0.32, 1.0, 0.32, 0, 0, 0);
    f.geo(k.mat(null, "#7fb8e0", [1, 1], { roughness: 0.05, metalness: 0.1 }), latheG([[0.001, 0], [0.13, 0], [0.14, 0.05], [0.14, 0.35], [0.06, 0.42], [0.04, 0.46]].reverse().map(([a, b]) => [a, 0.46 - b] as [number, number]).reverse(), 16), 0, 1.0, 0);
    f.geo(mBlueP, new THREE.CylinderGeometry(0.015, 0.015, 0.04, 8), -0.06, 0.8, 0.17, Math.PI / 2);
    f.geo(mRedP, new THREE.CylinderGeometry(0.015, 0.015, 0.04, 8), 0.06, 0.8, 0.17, Math.PI / 2);
    f.col(-0.16, 0.16, -0.16, 0.16, 0, 1.45);
  }
  // radiator-style oil heater
  {
    const f = F(13.2, 13.7, 0);
    for (let i = 0; i < 8; i++) f.box(mCreamP, 0.07, 0.6, 0.22, -0.28 + i * 0.08, 0.1, 0);
    for (const s of [-1, 1]) f.geo(mRubber, new THREE.CylinderGeometry(0.03, 0.03, 0.03, 8), s * 0.3, 0.03, 0, Math.PI / 2);
    f.col(-0.33, 0.33, -0.12, 0.12, 0, 0.7);
  }
  // cork notice board above the desk with shift notes
  {
    const f = F(16.99, 11.4, -Math.PI / 2);
    f.box(mWood, 1.3, 0.85, 0.03, 0, 1.55, 0.015);
    f.plane(k.mat(k.tex("cs-cork", () => T.noise("#b8875a", 0.18, 14, 3000)), "#ffffff", [2, 1], { roughness: 0.95, bump: 0.6 }), 1.22, 0.77, 0, 1.975, 0.032);
    const notes: [NoteOpt, number, number, number, number, number][] = [
      [{ lines: ["NIGHT SHIFT:", "check freezer door", "seal before 2am!!", "- Tom Kodner"], hand: true, bg: "#fff59a", w: 256, h: 256 }, -0.4, 2.15, 0.26, 0.26, 0.06],
      [{ title: "TEMP LOG", lines: ["Sign every 2 hours", "Cold Room 2: +0 to +4°C", "Freezer: below -22°C", "Report alarms to", "the supervisor"], w: 256, h: 320, ruled: true }, 0.05, 1.95, 0.3, 0.38, -0.03],
      [{ lines: ["Forklift service", "TUESDAY 7:00", "use pallet jack", "until then"], hand: true, bg: "#bfe6ff", w: 256, h: 256 }, 0.45, 2.15, 0.24, 0.24, -0.08],
      [{ stripe: "#1a8a3a", title: "FIRST AIDERS", lines: ["M. Lindqvist  ext 214", "J. Park  ext 208", "S. Novak  ext 231"], w: 256, h: 200 }, -0.35, 1.8, 0.3, 0.23, 0.02],
      [{ lines: ["Lost: black gloves", "(size L) - locker 13"], hand: true, bg: "#ffc2d6", w: 256, h: 160 }, 0.45, 1.78, 0.24, 0.15, 0.1],
    ];
    for (const [o, lx, ly, w, h, t] of notes) { const g = new THREE.PlaneGeometry(w, h); g.rotateZ(t); f.geo(noteMat(o), g, lx, ly, 0.036); f.geo(mRedP, new THREE.SphereGeometry(0.012, 6, 4), lx, ly + h / 2 - 0.02, 0.04); }
  }
  // break-room posters + delivery letters on the break table
  note({ stripe: "#c3221f", title: "SAFETY FIRST", lines: ["Wear thermal gloves", "in all cold rooms", "Never block the", "emergency release", "Report every spill"], w: 256, h: 340 }, 10.6, 1.75, 13.99, Math.PI, 0.42, 0.56);
  note({ title: "STAFF BBQ!", lines: ["Friday after shift", "Burgers on the dock", "Bring your own chair", "Sign up: ___________"], w: 256, h: 300, bg: "#ffe9b0", fg: "#6a2a10" }, 15.5, 1.7, 13.99, Math.PI, 0.36, 0.42);
  for (const [dx, dz, t, o] of [[0.12, 0.25, 0.4, { lines: ["Attn: Night Supervisor", "Cold Storage Ltd.", "Dock Road 12", "Harbour District"], bg: "#f2ead8", w: 256, h: 160, hand: true }], [-0.15, 0.05, -0.3, { title: "INVOICE", lines: ["Refrigerant R-717", "Qty 2 cylinders", "Total: 1,280.00", "Due in 30 days"], w: 256, h: 320 }]] as [number, number, number, NoteOpt][]) {
    const g = new THREE.PlaneGeometry(0.24, o.h === 160 ? 0.15 : 0.3); g.rotateX(-Math.PI / 2); g.rotateY(t);
    F(10.8 + dx, 11.6 + dz, 0).geo(noteMat(o), g, 0, 0.757, 0);
  }
  // blinds on the office window (dock side)
  for (let i = 0; i < 14; i++) W.box(mCreamP, 0.02, 0.03, 2.5, 8.2, 1.05 + i * 0.08, 12.2, 0);
  sign({ bg: "#1d3a6b", fg: "#ffffff", lines: ["OFFICE"], w: 256, h: 64 }, 7.84, 2.65, 9.2, -Math.PI / 2, 0.6, 0.15);
  flat(k.mat(k.tex("cs-mat", () => T.noise("#5a4a3a", 0.15, 12, 2500)), "#ffffff", [1, 1], { roughness: 0.95, bump: 0.5 }), 8.2, 9.4, 8.5, 9.9, 0.008);
  // paper litter
  for (let i = 0; i < 6; i++) flat(mPaper, 0, 0.21, 0, 0.3, 0.005, 0).translate(rr(-10, 6), 0.001 * i, rr(6.3, 11)).rotateY(0);

  // ---------------------------------------------------------------- flush
  B.flush(k);
  for (const l of [...cartonI, crateI, packI, tubI, cylI, gasI, capI, iceI, icicleI, bottleI, snowI, knifeI]) l.flush(k);

  // spawns: hiders in the open east part of the dock, hunters at the dock shutters
  const hiders: THREE.Vector3[] = [];
  for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) hiders.push(new THREE.Vector3(-0.5 + i * 1.2, 0, 7.5 + j * 1.1));
  const hunters: THREE.Vector3[] = [];
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) hunters.push(new THREE.Vector3(-8.6 + i * 1.1, 0, 11.6 + j * 0.8));

  return k.finish({
    id: "coldstorage", name: "Cold Storage",
    bounds: { minX: -16.85, maxX: 16.85, minZ: -13.85, maxZ: 13.85 },
    hunterSpawns: hunters, hiderSpawns: hiders,
    preview: { pos: [7.2, 2.3, 4.1], look: [-6, 1.2, -1.0], fov: 62 },
    lighting: {
      sky: "#1a2126",
      hemi: ["#dfeaf2", "#4a4a44", 0.55],
      sun: { color: "#e8f0ff", int: 1.6, pos: [8, 20, 12] },
      points: [
        { pos: [-4.5, lDock, 9.6], color: "#ffd9a8", int: 70, dist: 24 },
        { pos: [-10, lMainA, -0.1], color: "#e6f1ff", int: 36, dist: 15 },
        { pos: [1.5, lMainB, 0.1], color: "#e6f1ff", int: 36, dist: 15 },
        { pos: [-11.5, lFrz, -9.5], color: "#cfe4ff", int: 34, dist: 14 },
        { pos: [1, lBut, -9.5], color: "#f0f6ff", int: 38, dist: 15 },
        { pos: [12.5, lMach, -3], color: "#f4f1e6", int: 40, dist: 20 },
      ],
      exposure: 1.05,
      env: 0.45,
      hdri: "warehouse",
    },
  });
}
