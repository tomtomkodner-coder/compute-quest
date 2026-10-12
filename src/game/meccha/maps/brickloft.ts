// Brick Loft — a converted 1900s warehouse apartment at dusk. Bare red-brick walls with arched steel windows and
// stone-trimmed arches, a timber beam-and-joist ceiling (6 m) with spiral ductwork, cast-iron columns and Edison
// pendants. Areas: ENTRANCE (front door, bike, coat rack, moving boxes — hunters arrive here), LIVING ROOM (leather
// chesterfield, rug, pool table, record player, big bookcases, spinning ceiling fans), KITCHEN (shaker cabinets,
// marble island with stools, range + hood, open shelves, long dining table), ARTIST STUDIO (easels with real
// paintings, stacked canvases, paint-splattered floor, work table), LIBRARY under a steel MEZZANINE (reached by an
// iron stair; desk + beanbag on top), BEDROOM (painted brick, pipe clothes rack, bed) and BATHROOM (subway tile,
// clawfoot tub, washer + dryer).
import * as THREE from "three";
import * as T from "../textures";
import * as C from "./tex/coldstorage";
import * as L from "./tex/brickloft";
import { Batch, Fr, IList, boxGeo, chamferGeo, latheG, tubeG, place, mergeG, worldUV, type V3t, type BG } from "./tex/coldstorage";
import { PAINTINGS, realPaintingTex, pickPainting } from "../paintings";
import { Kit, type Mat, type World } from "./kit";

export function buildBrickLoft(): World {
  C.resetGeoCache();
  const H = 6, DOOR = 2.6;
  const k = new Kit(H, DOOR);
  C.patchKit(k);
  const B = new Batch();
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const rr = (a: number, b: number) => a + rnd() * (b - a);
  const pick = <X,>(a: X[]) => a[Math.floor(rnd() * a.length)];
  const F = (x: number, z: number, ry = 0) => new Fr(k, B, x, z, ry);
  const W = F(0, 0, 0);

  // ---------------------------------------------------------------- materials
  const tBrick = k.tex("bl-brick", () => L.blBrick(["#8a3b26", "#9b4a2e", "#7a3222", "#a5553a", "#6e2c1e", "#8f4630", "#94442b"], "#b3a58f", 3));
  const tBrickW = k.tex("bl-brickw", () => L.blBrick(["#ebe6dc", "#e0d9cc", "#f3efe7", "#d9d2c4"], "#cdc5b6", 4, 0.25, 256));
  const tPlank = k.tex("bl-plank", () => L.blPlanks("#7a5234", 5));
  const tTimber = k.tex("bl-timber", () => L.blTimber("#6a4428", 7));
  const tIron = k.tex("bl-iron", () => L.blIron(25));
  const tWeave = k.tex("bl-weave", () => L.blWeave(15, 4));
  const mBrick = k.mat(tBrick, "#ffffff", [1, 1], { roughness: 0.9, bump: 1.0 });
  const mBrickW = k.mat(tBrickW, "#ffffff", [1, 1], { roughness: 0.8, bump: 0.8 });
  const mFloor = k.mat(tPlank, "#d9ccc0", [1, 1], { roughness: 0.42, bump: 0.5 });
  const mFloorStudio = k.mat(k.tex("bl-conc", () => C.csFloor("#9d978c", 8)), "#ffffff", [1, 1], { roughness: 0.6, bump: 0.35 });
  const mMezzUnder = k.mat(tPlank, "#6a4c38", [1, 1], { roughness: 0.8, bump: 0.5 });
  const mMezzDeck = k.mat(tPlank, "#d9ccc0", [1, 1], { roughness: 0.45, bump: 0.5 });
  const mCeil = k.mat(tPlank, "#6a4c38", [1, 1], { roughness: 0.8, bump: 0.5 });
  const mTimber = k.mat(tTimber, "#ffffff", [1, 1], { roughness: 0.75, bump: 0.8 });
  const mTimberL = k.mat(tTimber, "#c9a27a", [1, 1], { roughness: 0.7, bump: 0.7 });
  const mIron = k.mat(tIron, "#ffffff", [1, 1], { metalness: 0.7, roughness: 0.55, bump: 0.3 });
  const mIronG = k.mat(tIron, "#4a5a4a", [1, 1], { metalness: 0.6, roughness: 0.5, bump: 0.3 });
  const mStone = k.mat(k.tex("bl-stone", () => T.concrete("#b8b0a2", 12)), "#ffffff", [1, 1], { roughness: 0.8, bump: 0.6 });
  const mGalv = k.mat(k.tex("cs-steel", () => C.csSteel(11)), "#b9bec2", [1, 1], { metalness: 0.85, roughness: 0.4, bump: 0.15 });
  const mSteel = k.mat(k.tex("cs-steel", () => C.csSteel(11)), "#ffffff", [1, 1], { metalness: 0.9, roughness: 0.28, bump: 0.1 });
  const mChrome = k.mat(null, "#e2e6e8", [1, 1], { metalness: 1, roughness: 0.15 });
  const mBrass = k.mat(null, "#c8a050", [1, 1], { metalness: 1, roughness: 0.3 });
  const mCopper = k.mat(null, "#b8703f", [1, 1], { metalness: 1, roughness: 0.35 });
  const mBlack = k.mat(null, "#1d1d1f", [1, 1], { roughness: 0.5, metalness: 0.2 });
  const mRubber = k.mat(null, "#18181a", [1, 1], { roughness: 0.9 });
  const mRedPipe = k.mat(k.tex("cs-paint2", () => C.csPaintMetal(15, 0.25)), "#b3261e", [1, 1], { metalness: 0.4, roughness: 0.4, bump: 0.2 });
  const mOak = k.mat(k.tex("bl-oak", () => T.wood("#9a6a3c", "#6e4424", 3)), "#ffffff", [1, 1], { roughness: 0.5, bump: 0.4 });
  const mWalnut = k.mat(k.tex("bl-oak", () => T.wood("#9a6a3c", "#6e4424", 3)), "#6a4226", [1, 1], { roughness: 0.45, bump: 0.4 });
  const mReclaim = k.mat(tTimber, "#b08462", [1, 1], { roughness: 0.65, bump: 0.8 });
  const mLeather = k.mat(k.tex("bl-leather", () => L.blLeather("#6a3a20", 13)), "#ffffff", [1, 1], { roughness: 0.45, bump: 0.5 });
  const mLeatherBlk = k.mat(k.tex("bl-leather", () => L.blLeather("#6a3a20", 13)), "#4a4040", [1, 1], { roughness: 0.4, bump: 0.5 });
  const fabCache = new Map<string, Mat>();
  const fab = (col: string, rough = 0.95) => { let m = fabCache.get(col + rough); if (!m) { m = k.mat(tWeave, col, [2, 2], { roughness: rough, bump: 0.5 }); fabCache.set(col + rough, m); } return m; };
  const solidCache = new Map<string, Mat>();
  const solid = (col: string, rough = 0.4, metal = 0) => { const key = col + rough + metal; let m = solidCache.get(key); if (!m) { m = k.mat(null, col, [1, 1], { roughness: rough, metalness: metal }); solidCache.set(key, m); } return m; };
  const mFabGrey = fab("#8d8f94"), mFabMustard = fab("#c8942c"), mFabTeal = fab("#2f6f73"), mFabCream = fab("#e8e0cf"), mFabRust = fab("#a4502e"), mFabNavy = fab("#2a3552"), mFabOlive = fab("#6a6c3a");
  const mWhitePaint = k.mat(k.tex("cs-paint2", () => C.csPaintMetal(15, 0.25)), "#eeeae2", [1, 1], { roughness: 0.5, metalness: 0.05, bump: 0.2 });
  const mSage = k.mat(k.tex("cs-paint2", () => C.csPaintMetal(15, 0.25)), "#7f9282", [1, 1], { roughness: 0.5, metalness: 0.05, bump: 0.2 });
  const mNavyPaint = k.mat(k.tex("cs-paint2", () => C.csPaintMetal(15, 0.25)), "#28364f", [1, 1], { roughness: 0.45, metalness: 0.05, bump: 0.2 });
  const mCeramic = k.mat(null, "#f4f3ef", [1, 1], { roughness: 0.12, metalness: 0.02 });
  const mMarble = k.mat(k.tex("bl-marble", () => L.blMarble(27)), "#ffffff", [1, 1], { roughness: 0.15, bump: 0.1 });
  const mSubway = k.mat(k.tex("bl-subway", () => L.blSubway(9)), "#ffffff", [1, 1], { roughness: 0.18, bump: 0.35 });
  const mHex = k.mat(k.tex("bl-hex", () => L.blHex(11)), "#ffffff", [1, 1], { roughness: 0.25, bump: 0.4 });
  const mGlass = k.mat(null, "#d5e4ea", [1, 1], { roughness: 0.05, metalness: 0.1 });
  Object.assign(mGlass.m, { transparent: true, opacity: 0.25, depthWrite: false });
  B.noShadow.add(mGlass);
  const mView = k.mat(k.tex("bl-view", () => L.blView(17)), "#ffffff", [1, 1], { roughness: 0.1, emissive: "#ffffff", emissiveIntensity: 0.95, bump: 0 });
  B.noShadow.add(mView);
  const mBulb = k.mat(null, "#fff2d8", [1, 1], { emissive: "#ffc98a", emissiveIntensity: 3.2, roughness: 0.3 });
  const mBulbSoft = k.mat(null, "#fff6e8", [1, 1], { emissive: "#ffd9a8", emissiveIntensity: 1.6, roughness: 0.6 });
  B.noShadow.add(mBulb); B.noShadow.add(mBulbSoft);
  const mGrime = C.decalMat(k, k.tex("bl-grime", () => L.blGrime(21)), "#ffffff", 0.75);
  const mStain = C.decalMat(k, k.tex("cs-stain", () => C.csStain(37)), "#ffffff", 0.35);
  const mSplat = C.decalMat(k, k.tex("bl-splat", () => L.blSplat(19)), "#ffffff", 0.95, 0.6);
  const mSplat2 = C.decalMat(k, k.tex("bl-splat2", () => L.blSplat(29)), "#ffffff", 0.95, 0.6);
  const mSpines = k.mat(k.tex("bl-spines", () => L.blSpines(23)), "#ffffff", [1, 1], { roughness: 0.7, bump: 0.3 });
  const mSpines2 = k.mat(k.tex("bl-spines2", () => L.blSpines(31)), "#ffffff", [1, 1], { roughness: 0.7, bump: 0.3 });
  const mPages = k.mat(null, "#efe6d0", [1, 1], { roughness: 0.9 });
  const mCanvas = k.mat(tWeave, "#efe9dc", [3, 3], { roughness: 0.95, bump: 0.3 });
  const mPlaster = k.mat(null, "#e9e4da", [1, 1], { roughness: 0.7 });
  const mCardboard = k.mat(k.tex("cs-cbd", () => T.noise("#b08a5c", 0.1, 8, 2000)), "#ffffff", [1, 1], { roughness: 0.9, bump: 0.3 });
  const mTape = k.mat(null, "#c9a86a", [1, 1], { roughness: 0.4 });
  const mLeaf = k.mat(k.tex("leaves", T.leaves), "#ffffff", [1, 1], { roughness: 0.7, bump: 0.4 });
  const mLeafDark = k.mat(null, "#2e5a2a", [1, 1], { roughness: 0.6 });
  const mSoil = k.mat(k.tex("bl-soil", () => T.noise("#3a2a1c", 0.2, 5, 2500)), "#ffffff", [1, 1], { roughness: 1, bump: 0.6 });
  const mTerra = k.mat(k.tex("bl-terra", () => T.noise("#b0603a", 0.08, 6, 1500)), "#ffffff", [1, 1], { roughness: 0.85, bump: 0.3 });
  const mRugA = k.mat(k.tex("bl-rug", () => T.rug("#7a2a22", "#d9b98a", "#2a3a5a")), "#ffffff", [1, 1], { roughness: 1, bump: 0.6 });
  const mRugB = k.mat(k.tex("bl-rug2", () => T.rug("#2c3e50", "#c9b27c", "#8a3a2a")), "#ffffff", [1, 1], { roughness: 1, bump: 0.6 });
  const mFelt = k.mat(tWeave, "#1f6a3f", [3, 3], { roughness: 1, bump: 0.3 });
  const mScreen = k.mat(null, "#0c0e10", [1, 1], { roughness: 0.1, metalness: 0.3 });
  const mMirror = k.mat(null, "#dfe6ea", [1, 1], { metalness: 1, roughness: 0.04 });
  const labCache = new Map<string, Mat>();
  const label = (t: string, bg?: string, fg?: string, w = 256, h = 96, emissive = 0) => {
    const key = [t, bg, fg, w, h, emissive].join("|");
    let m = labCache.get(key);
    if (!m) { m = k.mat(k.tex("bl-lab-" + key, () => L.blLabel(t, bg, fg, w, h)), "#ffffff", [1, 1], emissive ? { emissive: "#ffffff", emissiveIntensity: emissive, bump: 0 } : { roughness: 0.6, bump: 0 }); labCache.set(key, m); }
    return m;
  };
  const signCache = new Map<string, Mat>();
  const signMat = (o: C.SignOpt, emissive = 0) => {
    const key = JSON.stringify(o) + emissive;
    let m = signCache.get(key);
    if (!m) { m = k.mat(k.tex("bl-sign-" + key, () => C.signTex(o)), "#ffffff", [1, 1], emissive ? { roughness: 0.4, bump: 0, emissive: "#ffffff", emissiveIntensity: emissive } : { roughness: 0.5, bump: 0 }); signCache.set(key, m); }
    return m;
  };
  // real paintings (cover-cropped into the frame through UVs)
  const paintMats = new Map<number, Mat>();
  const usedP = new Set<number>();
  const paintingPlane = (f: Fr, w: number, h: number, lx: number, ly: number, lz: number, ry = 0, pseed = 0) => {
    const i = pickPainting(w / h, usedP, pseed);
    let m = paintMats.get(i);
    if (!m) { m = k.mat(realPaintingTex(i), "#ffffff", [1, 1], { roughness: 0.6, bump: 0 }); paintMats.set(i, m); }
    const pa = PAINTINGS[i].w / PAINTINGS[i].h, fa = w / h;
    const uv: [number, number, number, number] = pa > fa ? [(1 - fa / pa) / 2, 0, fa / pa, 1] : [0, (1 - pa / fa) / 2, 1, pa / fa];
    f.plane(m, w, h, lx, ly, lz, ry, uv);
  };

  // instanced lists
  const bookI = new IList(chamferGeo(1, 1, 1, 0.08), mPages);
  const cboxI = new IList(chamferGeo(1, 1, 1, 0.015), mCardboard);
  const jarI = new IList(latheG([[0.001, 0], [0.045, 0], [0.05, 0.02], [0.05, 0.13], [0.035, 0.15], [0.035, 0.17], [0.001, 0.17]], 12), mGlass);
  const bottleI = new IList(latheG([[0.001, 0], [0.035, 0], [0.037, 0.01], [0.037, 0.17], [0.015, 0.23], [0.012, 0.28], [0.014, 0.29], [0.001, 0.29]], 10), k.mat(null, "#ffffff", [1, 1], { roughness: 0.2, metalness: 0.1 }));
  const canI = new IList(latheG([[0.001, 0], [0.085, 0], [0.09, 0.01], [0.09, 0.18], [0.085, 0.19], [0.001, 0.19]], 16), k.mat(k.tex("cs-paint", () => C.csPaintMetal(13, 1)), "#ffffff", [1, 1], { metalness: 0.5, roughness: 0.45, bump: 0.2 }));
  const leafI = new IList((() => { const g = new THREE.SphereGeometry(1, 8, 5); g.scale(1, 0.12, 0.55); g.translate(0.9, 0, 0); return g; })(), mLeafDark);
  const plateI = new IList(latheG([[0.001, 0], [0.1, 0], [0.12, 0.012], [0.125, 0.018], [0.001, 0.008]], 18), mCeramic);
  const cushI = new IList(chamferGeo(1, 1, 1, 0.3), fab("#ffffff"));
  const ballI = new IList(new THREE.SphereGeometry(1, 18, 12), k.mat(null, "#ffffff", [1, 1], { roughness: 0.3 }));
  ballI.geo.userData.pushable = true;

  // ---------------------------------------------------------------- structure helpers
  type Hole = { c: number; w: number; y0?: number; y1: number; arch?: boolean; trim?: boolean; win?: boolean };
  const faceOver = (m: Mat, axis: "x" | "z", at: number, s1: number, s2: number, y0: number, y1: number, side: number, off: number, unit = 1.2) => {
    const g = new THREE.PlaneGeometry(s2 - s1, y1 - y0);
    if (axis === "x") { g.rotateY(side > 0 ? 0 : Math.PI); g.translate((s1 + s2) / 2, (y0 + y1) / 2, at + side * off); }
    else { g.rotateY(side > 0 ? Math.PI / 2 : -Math.PI / 2); g.translate(at + side * off, (y0 + y1) / 2, (s1 + s2) / 2); }
    return B.add(m, g, unit);
  };
  /** local (along, y, across) → world geometry transform for a wall on `axis` at `at` */
  const toWall = (g: BG, axis: "x" | "z", at: number, along: number) => {
    if (axis === "x") g.translate(along, 0, at);
    else { g.rotateY(Math.PI / 2); g.translate(at, 0, along); }
    return g;
  };
  let viewU = 0;
  /** brick wall with arched / square openings + windows; side overlays: [neg side mat, pos side mat] (null = bare brick) */
  function wall(axis: "x" | "z", at: number, a1: number, a2: number, th: number, holes: Hole[] = [], over: [Mat | null, Mat | null] = [null, null], grime: [boolean, boolean] = [true, true]) {
    const rects: [number, number, number, number][] = [];
    let cur = a1;
    for (const hl of [...holes].sort((a, b) => a.c - b.c)) {
      const s = hl.c - hl.w / 2, e = hl.c + hl.w / 2, r = hl.w / 2;
      const top = hl.y1 + (hl.arch ? r : 0);
      if (s - cur > 0.005) rects.push([cur, s, 0, H]);
      if (H - top > 0.005) rects.push([s, e, top, H]);
      if ((hl.y0 ?? 0) > 0) rects.push([s, e, 0, hl.y0!]);
      cur = e;
      if (hl.arch) {
        // brick spandrels above the springing line
        const sh = new THREE.Shape();
        sh.moveTo(-r, 0); sh.lineTo(-r, r); sh.lineTo(r, r); sh.lineTo(r, 0);
        sh.absarc(0, 0, r, 0, Math.PI, false);
        const g = new THREE.ExtrudeGeometry(sh, { depth: th, bevelEnabled: false, curveSegments: 14 });
        g.translate(0, hl.y1, -th / 2);
        B.add(mBrick, worldUV(toWall(g, axis, at, hl.c), 1.2));
        if (axis === "x") k.collider(s, e, at - th / 2, at + th / 2, hl.y1 + r * 0.5, top, false); else k.collider(at - th / 2, at + th / 2, s, e, hl.y1 + r * 0.5, top, false);
      }
      if (hl.trim) {
        // stone voussoir ring + jamb stones + keystone, both faces
        const tr = 0.2;
        const ring = new THREE.Shape();
        ring.absarc(0, 0, r + tr, 0, Math.PI, false);
        ring.lineTo(-r, 0);
        ring.absarc(0, 0, r, Math.PI, 0, true);
        ring.lineTo(r + tr, 0);
        if (hl.arch) {
          const g = new THREE.ExtrudeGeometry(ring, { depth: th + 0.06, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 1, curveSegments: 14 });
          g.translate(0, hl.y1, -(th + 0.06) / 2);
          B.add(mStone, worldUV(toWall(g, axis, at, hl.c), 0.8));
          const kg = boxGeo(0.22, 0.34, th + 0.1); kg.translate(0, hl.y1 + r + 0.12, 0);
          B.add(mStone, worldUV(toWall(kg, axis, at, hl.c), 0.8));
        }
        for (const sx of [-1, 1]) for (let y = hl.y0 ?? 0; y < hl.y1 - 0.05; y += 0.5) {
          const bh = Math.min(0.46, hl.y1 - y), bw = (Math.round(y / 0.5) % 2 ? 0.3 : 0.22);
          const g = boxGeo(bw, bh - 0.02, th + 0.06); g.translate(sx * (r + bw / 2 - 0.04), y + bh / 2, 0);
          B.add(mStone, worldUV(toWall(g, axis, at, hl.c), 0.8));
        }
      }
      if (hl.win) window_(axis, at, th, hl);
    }
    if (a2 - cur > 0.005) rects.push([cur, a2, 0, H]);
    for (const [s1, s2, y0, y1] of rects) {
      const g = axis === "x" ? new THREE.BoxGeometry(s2 - s1, y1 - y0, th) : new THREE.BoxGeometry(th, y1 - y0, s2 - s1);
      g.translate(axis === "x" ? (s1 + s2) / 2 : at, (y0 + y1) / 2, axis === "x" ? at : (s1 + s2) / 2);
      B.add(mBrick, g, 1.2);
      if (axis === "x") k.collider(s1, s2, at - th / 2, at + th / 2, y0, y1, y1 < 1.5);
      else k.collider(at - th / 2, at + th / 2, s1, s2, y0, y1, y1 < 1.5);
      for (const [si, side] of [[0, -1], [1, 1]] as [number, number][]) {
        const ov = over[si];
        if (ov) faceOver(ov, axis, at, s1, s2, y0, y1, side, th / 2 + 0.004);
        if (y0 < 0.01 && grime[si]) {
          const gg = faceOver(mGrime, axis, at, s1, s2, 0, 0.8, side, th / 2 + (ov ? 0.012 : 0.008));
          const a = gg.attributes.uv; for (let i = 0; i < a.count; i++) a.setXY(i, i % 2 ? (s2 - s1) / 2.5 : 0, i < 2 ? 1 : 0);
        }
      }
    }
  }
  /** steel-framed industrial window in an opening (sill y0, spring y1, optional arched top); outside view behind */
  function window_(axis: "x" | "z", at: number, th: number, hl: Hole) {
    const r = hl.w / 2, y0 = hl.y0 ?? 0.9, y1 = hl.y1, top = hl.y1 + (hl.arch ? r : 0);
    const outer = at > 0 ? 1 : -1; // exterior walls: outside = away from the origin
    const gz = outer * (th / 2 - 0.08);
    const fr = (g: BG) => B.add(mIron, toWall(g, axis, at, hl.c));
    // glass + view (outside), view shape includes the arch
    const sh = new THREE.Shape();
    sh.moveTo(-r, y0); sh.lineTo(r, y0); sh.lineTo(r, y1);
    if (hl.arch) sh.absarc(0, y1, r, 0, Math.PI, false); else sh.lineTo(r, top), sh.lineTo(-r, top);
    sh.lineTo(-r, y0);
    const vg = new THREE.ShapeGeometry(sh, 16);
    const p = vg.attributes.position, uv = vg.attributes.uv;
    const u0 = viewU; viewU = (viewU + 0.37) % 1;
    for (let i = 0; i < p.count; i++) uv.setXY(i, u0 + (p.getX(i) + r) / 8, (p.getY(i) - 0.2) / 5.5);
    const vg2 = vg.clone();
    if (outer > 0) vg.rotateY(Math.PI);
    vg.translate(0, 0, outer * (th / 2 + 0.25));
    B.add(mView, toWall(vg, axis, at, hl.c));
    if (outer > 0) vg2.rotateY(Math.PI);
    vg2.translate(0, 0, gz);
    B.add(mGlass, toWall(vg2, axis, at, hl.c));
    // frame: perimeter + mullions + transoms
    const bar = (w: number, h: number, x: number, y: number) => { const g = new THREE.BoxGeometry(w, h, 0.05); g.translate(x, y, gz); fr(g); };
    bar(0.07, y1 - y0, -r + 0.035, (y0 + y1) / 2); bar(0.07, y1 - y0, r - 0.035, (y0 + y1) / 2);
    bar(hl.w, 0.07, 0, y0 + 0.035);
    const nm = Math.max(2, Math.round(hl.w / 0.55));
    for (let i = 1; i < nm; i++) bar(0.035, y1 - y0, -r + (i * hl.w) / nm, (y0 + y1) / 2);
    for (let y = y0 + 0.5; y < y1 - 0.1; y += 0.5) bar(hl.w, 0.035, 0, y);
    bar(hl.w, 0.06, 0, y1);
    if (hl.arch) {
      const ag = new THREE.TorusGeometry(r - 0.035, 0.035, 4, 24, Math.PI); ag.translate(0, y1, gz); fr(ag);
      const ag2 = new THREE.TorusGeometry(r * 0.5, 0.02, 4, 16, Math.PI); ag2.translate(0, y1, gz); fr(ag2);
      for (let i = 1; i < 4; i++) { const a = (i * Math.PI) / 4; const g = C.beam([Math.cos(a) * r * 0.5, y1 + Math.sin(a) * r * 0.5, gz], [Math.cos(a) * r * 0.97, y1 + Math.sin(a) * r * 0.97, gz], 0.018, 4); fr(g); }
      bar(0.035, r * 0.5, 0, y1 + r * 0.25);
    }
    // opening latch handle + stone sill inside (a nice perch)
    const hg = boxGeo(0.03, 0.14, 0.04); hg.translate(r * 0.4, y0 + 1.2, gz - outer * 0.05); B.add(mBrass, toWall(hg, axis, at, hl.c));
    const sill = boxGeo(hl.w + 0.3, 0.07, th * 0.5 + 0.18);
    sill.translate(0, y0 - 0.035, -outer * (th * 0.25 + 0.09) + outer * 0.02);
    B.add(mStone, worldUV(toWall(sill, axis, at, hl.c), 0.8));
    const [sx1, sx2] = [hl.c - r - 0.15, hl.c + r + 0.15], sz = [at - outer * (th / 2 + 0.2), at];
    if (axis === "x") k.collider(sx1, sx2, Math.min(...sz), Math.max(...sz), y0 - 0.07, y0, true);
    else k.collider(Math.min(...sz), Math.max(...sz), sx1, sx2, y0 - 0.07, y0, true);
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
  /** timber: uv grain along the member's long axis */
  const timber = (m: Mat, w: number, h: number, d: number, x: number, y: number, z: number, unit = 1.6) => {
    const g = w > 4.4 || d > 4.4 ? new THREE.BoxGeometry(w, h, d) : boxGeo(w, h, d);
    g.translate(x, y + h / 2, z);
    const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
    const alongX = w >= d;
    for (let i = 0; i < p.count; i++) {
      const L = alongX ? p.getX(i) : p.getZ(i);
      const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
      const o = ay > ax && ay > az ? (alongX ? p.getZ(i) : p.getX(i)) : (alongX ? (az >= ax ? p.getY(i) : p.getZ(i)) : (ax >= az ? p.getY(i) : p.getX(i)));
      uv.setXY(i, L / unit, o / unit * 2.2);
    }
    return B.add(m, g);
  };

  // ---------------------------------------------------------------- floors + ceiling
  slab(mFloor, -18.2, 18.2, -0.2, 0, -13.2, 13.2, 2.4);
  slab(mFloorStudio, -17.8, -6.15, 0.002, 0.012, -12.8, -2.15, 4);
  slab(mHex, 13.15, 17.8, 0.002, 0.012, -12.8, -1.15, 0.5);
  slab(mCeil, -18.4, 18.4, H, H + 0.2, -13.4, 13.4, 2.4);
  // beams along z every 4 m, joists along x on top, cast-iron columns
  const beamXs = [-14, -10, -6, -2, 2, 6, 10, 14];
  for (const bx of beamXs) timber(mTimber, 0.3, 0.42, 26, bx, H - 0.62, 0, 2.4);
  for (let z = -12.4; z < 13; z += 1.2) timber(mTimberL, 36, 0.2, 0.12, 0, H - 0.2, z, 2.4);
  for (const bx of beamXs) for (const z of [-12.85, 12.85]) W.box(mIron, 0.36, 0.5, 0.3, bx, H - 0.95, z); // wall pockets / iron shoes
  const column = (x: number, z: number) => {
    W.geo(mIronG, latheG([[0.001, 0], [0.2, 0], [0.2, 0.08], [0.16, 0.12], [0.14, 0.3], [0.12, 0.34], [0.11, 0.5], [0.1, H - 1.3], [0.12, H - 1.12], [0.16, H - 0.98], [0.24, H - 0.9], [0.26, H - 0.84], [0.001, H - 0.84]], 24), x, 0, z);
    W.box(mIronG, 0.5, 0.06, 0.5, x, H - 0.66, z);
    k.collider(x - 0.2, x + 0.2, z - 0.2, z + 0.2, 0, H - 0.62, false);
  };
  column(-6, 5.2); column(2, 5.2); column(10, 5.2);
  // spiral duct with hangers + ceiling diffusers, red sprinkler main, electrical conduit
  const ductG = new THREE.CylinderGeometry(0.32, 0.32, 34, 20, 1, true);
  { const a = ductG.attributes.uv; for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i) * 3, a.getY(i) * 40); }
  ductG.rotateZ(Math.PI / 2); ductG.translate(0, H - 1.25, 1.4);
  const mDuct = k.mat(k.tex("bl-duct", () => T.stripes(["#c7cbce", "#a9aeb2", "#d2d6d8", "#b8bcbf"], false)), "#ffffff", [1, 1], { metalness: 0.85, roughness: 0.35, bump: 0.4 });
  B.noShadow.add(mDuct);
  B.add(mDuct, ductG);
  for (let x = -16; x <= 16; x += 2.5) {
    W.geo(mGalv, new THREE.TorusGeometry(0.33, 0.012, 4, 20), x, H - 1.25, 1.4, 0, Math.PI / 2);
    W.bar(mGalv, [x, H - 0.92, 1.4 - 0.33], [x, H - 0.62, 1.4 - 0.33], 0.01, 4);
    W.bar(mGalv, [x, H - 0.92, 1.4 + 0.33], [x, H - 0.62, 1.4 + 0.33], 0.01, 4);
  }
  for (const x of [-12, -4, 4, 12]) { W.cyl(mGalv, 0.14, 0.2, 0.2, x, H - 1.72, 1.4, 16); W.cyl(mBlack, 0.12, 0.12, 0.01, x, H - 1.73, 1.4, 16); }
  W.geo(mRedPipe, tubeG([[-17.7, H - 0.9, 8.5], [17.7, H - 0.9, 8.5]], 0.05, 4, 10));
  W.geo(mRedPipe, tubeG([[-17.7, H - 0.9, -9.5], [17.7, H - 0.9, -9.5]], 0.05, 4, 10));
  for (let x = -16; x <= 16; x += 3.2) for (const z of [8.5, -9.5]) { W.cyl(mBrass, 0.012, 0.012, 0.12, x, H - 1.05, z, 6); W.geo(mBrass, new THREE.CylinderGeometry(0.035, 0.035, 0.01, 10), x, H - 1.06, z); }
  W.geo(mRedPipe, tubeG([[17.7, H - 0.9, 8.5], [17.75, 3, 8.4], [17.75, 1.1, 8.4]], 0.05, 12, 10));
  W.geo(k.mat(null, "#a82a20", [1, 1], { metalness: 0.5, roughness: 0.4 }), new THREE.TorusGeometry(0.1, 0.02, 6, 16), 17.7, 1.3, 8.4, 0, Math.PI / 2);

  // ---------------------------------------------------------------- walls
  const TE = 0.45, TI = 0.3;
  // south (street) wall: 4 tall arched windows
  wall("x", 12.98, -18.2, 18.2, TE, [-14, -8.5, -3, 2.5, 8].map((c) => ({ c, w: 2.2, y0: 0.9, y1: 3.4, arch: true, trim: true, win: true })), [null, null], [true, false]);
  // north wall: high arched windows over the studio/library/bedroom
  wall("x", -12.98, -18.2, 18.2, TE, [{ c: -14, w: 2.2, y0: 1.0, y1: 3.4, arch: true, trim: true, win: true }, { c: -9, w: 2.2, y0: 1.0, y1: 3.4, arch: true, trim: true, win: true }, { c: 0, w: 1.6, y0: 3.6, y1: 4.6, arch: true, win: true }, { c: 10, w: 1.8, y0: 1.1, y1: 3.0, arch: true, trim: true, win: true }], [null, null], [false, true]);
  // west wall: kitchen + studio windows
  wall("z", -17.98, -13.2, 13.2, TE, [{ c: -7.5, w: 2.2, y0: 1.0, y1: 3.4, arch: true, trim: true, win: true }, { c: 7.5, w: 2.0, y0: 1.2, y1: 3.2, arch: true, trim: true, win: true }], [null, null], [false, true]);
  // east wall: front door + window
  wall("z", 17.98, -13.2, 13.2, TE, [{ c: 10.4, w: 1.4, y1: 2.5, arch: true, trim: true }, { c: 3.0, w: 2.0, y0: 1.0, y1: 3.2, arch: true, trim: true, win: true }, { c: -9, w: 1.4, y0: 1.2, y1: 2.8, arch: true, win: true }], [null, null], [true, false]);
  // studio walls (brick arches)
  wall("x", -2.0, -18, -6.15, TI, [{ c: -14.5, w: 2.6, y1: 2.6, arch: true, trim: true }, { c: -9.4, w: 2.6, y1: 2.6, arch: true, trim: true }]);
  wall("z", -6.0, -12.8, -2.15, TI, [{ c: -4.6, w: 1.8, y1: 2.4, arch: true, trim: true }]);
  // bedroom + bathroom block (painted brick inside)
  wall("x", -1.0, 6.15, 18, TI, [{ c: 9.2, w: 1.8, y1: 2.5, arch: true, trim: true }, { c: 15.2, w: 1.4, y1: 2.3, arch: true }], [mBrickW, null]);
  wall("z", 6.0, -12.8, -0.85, TI, [], [null, mBrickW]);
  wall("z", 13.0, -12.8, -1.15, TI, [{ c: -3.3, w: 1.2, y1: 2.3 }], [mBrickW, mSubway], [true, false]);
  // bathroom subway tile on the outer walls (to 2.1 m) + bath side of the bedroom wall
  faceOver(mSubway, "x", -12.98, 13.15, 17.75, 0, 2.2, 1, TE / 2 + 0.006, 0.6);
  faceOver(mSubway, "z", 17.98, -12.75, -1.15, 0, 2.2, -1, TE / 2 + 0.006, 0.6);
  faceOver(mSubway, "x", -1.0, 13.15, 17.75, 0, 2.2, -1, TI / 2 + 0.006, 0.6);
  for (const [a1, a2] of [[6.15, 9.05], [10.95, 12.85]]) faceOver(mBrickW, "x", -12.98, a1, a2, 0, H, 1, TE / 2 + 0.006);
  faceOver(mBrickW, "x", -12.98, 9.05, 10.95, 0, 1.1, 1, TE / 2 + 0.006);
  faceOver(mBrickW, "z", 17.98, -12.75, -1.15, 2.2, H, -1, TE / 2 + 0.006);

  // ---------------------------------------------------------------- lamps (the point lights sit exactly on these bulbs)
  const edison = (x: number, y: number, z: number, shade: "cage" | "dome" | "bare" | "enamel" = "bare", big = 1) => {
    W.bar(mBlack, [x, H - 0.2, z], [x, y + 0.14 * big, z], 0.006, 4);
    W.cyl(mBlack, 0.035, 0.035, 0.06, x, H - 0.26, z, 10);
    W.cyl(mBrass, 0.022, 0.022, 0.07, x, y + 0.08 * big, z, 10);
    W.geo(mBulb, latheG([[0.001, -0.05], [0.03, -0.04], [0.05, 0.0], [0.045, 0.05], [0.02, 0.08], [0.001, 0.08]], 12), x, y - 0.02, z, 0, 0, 0);
    if (shade === "cage") for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3; W.geo(mBlack, tubeG([[0, 0.1, 0], [Math.cos(a) * 0.09, 0.02, Math.sin(a) * 0.09], [Math.cos(a) * 0.08, -0.08, Math.sin(a) * 0.08], [0, -0.12, 0]].map(([a1, b, c]) => [x + a1, y + b, z + c] as V3t), 0.004, 10, 3)); }
    if (shade === "dome") W.geo(k.mat(null, "#1f3b34", [1, 1], { metalness: 0.5, roughness: 0.4 }), latheG([[0.02, 0.16 * big], [0.07 * big, 0.14 * big], [0.2 * big, 0.04], [0.26 * big, -0.08], [0.255 * big, -0.09]], 24), x, y + 0.02, z);
    if (shade === "enamel") W.geo(k.mat(null, "#eeeae0", [1, 1], { metalness: 0.2, roughness: 0.25 }), latheG([[0.02, 0.14], [0.06, 0.12], [0.16, 0.0], [0.2, -0.08], [0.195, -0.09]], 24), x, y + 0.02, z);
    return y;
  };
  // living room cluster
  const lLiving = edison(0, 3.7, 7.6, "enamel");
  edison(-0.6, 4.1, 7.2, "bare"); edison(0.5, 3.9, 8.1, "cage"); edison(-0.3, 4.3, 8.3, "bare");
  // kitchen island pendants
  const lKitchen = edison(-12, 3.3, 5.6, "dome");
  edison(-12, 3.3, 3.9, "dome"); edison(-12, 3.3, 7.3, "dome");
  // dining
  edison(-10.9, 3.5, 10.4, "cage"); edison(-10.9, 3.5, 11.4, "cage");
  // studio big dome
  const lStudio = edison(-12, 3.8, -7.5, "dome", 1.6);
  edison(-8, 3.8, -7.5, "enamel");
  // bedroom, bath, entrance
  const lBed = edison(9.5, 3.4, -7, "cage");
  const lBath = edison(15.4, 3.0, -6.5, "enamel");
  const lHall = edison(14.6, 3.5, 8.6, "cage");
  edison(14.6, 3.5, 4.8, "bare");

  // ================================================================ PROPS
  const mCreamFridge = k.mat(k.tex("cs-paint2", () => C.csPaintMetal(15, 0.25)), "#e9dfc6", [1, 1], { roughness: 0.3, metalness: 0.2, bump: 0.15 });
  const mPaperNote = k.mat(k.tex("cs-paper", () => C.csPaper(61)), "#ffffff", [1, 1], { roughness: 0.85, bump: 0 });
  const mScreenOn = k.mat(k.tex("bl-scr", () => C.signTex({ bg: "#1a2a3a", fg: "#bfe0ff", lines: ["LOFT RENOVATION", "TO DO: FIX STAIR RAIL", "BUY PAINT"], w: 256, h: 160, bold: false, wear: 0 })), "#ffffff", [1, 1], { emissive: "#ffffff", emissiveIntensity: 0.8, bump: 0 });
  type NoteOpt = Parameters<typeof C.csNote>[0];
  const noteCache = new Map<string, Mat>();
  const noteMat = (o: NoteOpt) => {
    const key = JSON.stringify(o);
    let m = noteCache.get(key);
    if (!m) { m = k.mat(k.tex("bl-note" + key, () => C.csNote(o)), "#ffffff", [1, 1], { roughness: 0.85, bump: 0 }); noteCache.set(key, m); }
    return m;
  };
  /** paper on a wall (vertical, faces local +z) */
  const note = (o: NoteOpt, x: number, y: number, z: number, ry: number, w: number, h: number, tilt = 0, off = 0.006) => {
    const g = new THREE.PlaneGeometry(w, h); g.rotateZ(tilt);
    F(x, z, ry).geo(noteMat(o), g, 0, y, off);
  };
  /** paper lying flat on a surface at height y */
  const paper = (o: NoteOpt, x: number, y: number, z: number, rot: number, w: number, h: number) => {
    const g = new THREE.PlaneGeometry(w, h); g.rotateX(-Math.PI / 2); g.rotateY(rot);
    W.geo(noteMat(o), g, x, y, z);
  };
  /** flat sign board with a thin backing plate; y = centre; faces local +z of ry */
  const sign = (o: C.SignOpt, x: number, y: number, z: number, ry: number, w: number, h: number, emissive = 0, plate: Mat | null = mBlack) => {
    const f = F(x, z, ry);
    if (plate) f.box(plate, w + 0.04, h + 0.04, 0.025, 0, y - h / 2 - 0.02, 0.0125);
    f.plane(signMat(o, emissive), w, h, 0, y, plate ? 0.027 : 0.004);
  };
  // ---------- generic props
  const plantPot = (x: number, z: number, s = 1, pot: Mat = mTerra, y0 = 0) => {
    W.geo(pot, latheG([[0.001, 0], [0.16 * s, 0], [0.2 * s, 0.34 * s], [0.22 * s, 0.36 * s], [0.21 * s, 0.38 * s], [0.001, 0.36 * s]], 18), x, y0, z);
    W.cyl(mSoil, 0.19 * s, 0.19 * s, 0.01, x, y0 + 0.35 * s, z, 14);
    const hh = 1.2 * s;
    W.bar(mOak, [x, y0 + 0.3 * s, z], [x + 0.03, y0 + hh, z + 0.02], 0.015 * s, 5);
    for (let i = 0; i < 26; i++) {
      const y = y0 + 0.55 * s + rnd() * (hh - 0.4 * s), a = rnd() * 6.28, sc = (0.12 + rnd() * 0.08) * s;
      leafI.add(x + Math.cos(a) * 0.03, y, z + Math.sin(a) * 0.03, [sc, sc, sc], pick(["#ffffff", "#d8f0c8", "#b8d8a8"]), a, 0, rr(-0.5, 0.2));
    }
    k.collider(x - 0.22 * s, x + 0.22 * s, z - 0.22 * s, z + 0.22 * s, y0, y0 + 0.38 * s, true);
  };
  const book = (x: number, y: number, z: number, ry: number, w = 0.16, h = 0.24, t = 0.035, col?: string) => bookI.add(x, y + h / 2, z, [t, h, w], col ?? pick(["#7a1f1f", "#1f3a5a", "#2f5a3a", "#caa56a", "#3a2a22", "#9a6a3a", "#5a2a4a", "#b0432a", "#46708a", "#e8e0cc"]), ry);
  /** industrial pipe bookcase (black iron pipes, oak shelves), full of books; faces local +z */
  const pipeShelf = (x: number, z: number, ry: number, w: number, h: number, levels: number, d = 0.35, both = false) => {
    const f = F(x, z, ry);
    for (const lx of [-w / 2 + 0.05, w / 2 - 0.05]) for (const lz of [-d / 2 + 0.04, d / 2 - 0.04]) { f.cyl(mIron, 0.018, 0.018, h, lx, 0, lz, 8); f.cyl(mIron, 0.04, 0.04, 0.012, lx, 0, lz, 10); }
    for (let l = 0; l < levels; l++) {
      const y = 0.1 + (l * (h - 0.15)) / (levels - 1);
      f.box(mOak, w, 0.035, d, 0, y, 0);
      if (l === levels - 1) break;
      // spine strip in front of a block of books
      let cx = -w / 2 + 0.08;
      while (cx < w / 2 - 0.25) {
        const seg = Math.min(w / 2 - 0.08 - cx, rr(0.35, 0.8));
        const bh = rr(0.2, 0.28);
        if (rnd() < 0.8) {
          f.geo(bookI.mat, boxGeo(seg, bh, d * 0.7), cx + seg / 2, y + 0.035 + bh / 2, -0.02);
          f.plane(rnd() < 0.5 ? mSpines : mSpines2, seg, bh, cx + seg / 2, y + 0.035 + bh / 2, d * 0.33 + 0.003, 0, [rnd(), 0, seg / 1.1, 1]);
          if (both) f.plane(rnd() < 0.5 ? mSpines : mSpines2, seg, bh, cx + seg / 2, y + 0.035 + bh / 2, -0.02 - d * 0.35 - 0.004, Math.PI, [rnd(), 0, seg / 1.1, 1]);
        } else {
          // leaning / stacked books, a vase
          for (let s = 0; s < 4; s++) f.inst(bookI, cx + 0.15, y + 0.05 + s * 0.04, 0, [0.26, 0.035, 0.2], pick(["#7a1f1f", "#1f3a5a", "#caa56a", "#e8e0cc"]), rr(-0.2, 0.2));
          if (rnd() < 0.5) f.geo(mCeramic, latheG([[0.001, 0], [0.05, 0], [0.07, 0.08], [0.04, 0.18], [0.035, 0.22], [0.04, 0.23]], 14), cx + 0.15, y + 0.2, 0);
        }
        cx += seg + 0.04;
      }
    }
    f.col(-w / 2, w / 2, -d / 2, d / 2, 0, h + 0.02);
  };
  const cardboardBox = (x: number, y: number, z: number, w: number, h: number, d: number, ry: number, lab?: string) => {
    cboxI.add(x, y + h / 2, z, [w, h, d], C.hexShade("#ffffff", 0.85 + rnd() * 0.2), ry);
    const f = F(x, z, ry);
    f.box(mTape, w * 1.002, 0.006, 0.06, 0, y + h - 0.003, 0);
    f.box(mTape, 0.06, h * 0.25, d * 1.004, 0, y + h * 0.75, 0);
    if (lab) f.plane(label(lab, "#f4eee0", "#222222", 256, 96), Math.min(0.3, w * 0.7), 0.1, 0, y + h * 0.55, d / 2 + 0.003);
  };
  const boxPile = (x: number, z: number, n: number, labs: string[], y0 = 0) => {
    let y = y0;
    for (let i = 0; i < n; i++) {
      const w = rr(0.45, 0.65), h = rr(0.32, 0.5), d = rr(0.4, 0.55);
      cardboardBox(x + rr(-0.05, 0.05), y, z + rr(-0.05, 0.05), w, h, d, rr(-0.25, 0.25), pick(labs));
      y += h;
    }
    k.collider(x - 0.32, x + 0.32, z - 0.3, z + 0.3, y0, y, true);
  };
  const chairWood = (x: number, z: number, ry: number, m: Mat = mOak) => {
    const f = F(x, z, ry);
    for (const [lx, lz] of [[-0.2, -0.19], [0.2, -0.19], [-0.2, 0.19], [0.2, 0.19]]) f.box(m, 0.04, 0.45, 0.04, lx, 0, lz);
    f.box(m, 0.46, 0.04, 0.44, 0, 0.45, 0);
    for (const lx of [-0.2, 0.2]) f.box(m, 0.04, 0.5, 0.04, lx, 0.49, -0.2);
    f.box(m, 0.44, 0.1, 0.03, 0, 0.86, -0.2);
    for (let i = -1; i <= 1; i++) f.box(m, 0.03, 0.33, 0.02, i * 0.1, 0.52, -0.2);
    f.box(m, 0.4, 0.02, 0.02, 0, 0.15, 0.19); f.box(m, 0.02, 0.02, 0.38, -0.2, 0.18, 0); f.box(m, 0.02, 0.02, 0.38, 0.2, 0.18, 0);
    f.col(-0.23, 0.23, -0.22, 0.22, 0, 0.49);
  };
  const stool = (x: number, z: number, h = 0.7) => {
    const f = F(x, z, rnd() * 3);
    f.cyl(mWalnut, 0.19, 0.18, 0.05, 0, h - 0.05, 0, 20);
    for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2 + 0.78; f.bar(mIron, [Math.cos(a) * 0.13, h - 0.05, Math.sin(a) * 0.13], [Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2], 0.012, 6); }
    f.geo(mIron, new THREE.TorusGeometry(0.16, 0.01, 4, 20), 0, 0.25, 0, Math.PI / 2);
    f.col(-0.2, 0.2, -0.2, 0.2, 0, h);
  };
  const rug = (m: Mat, x: number, z: number, w: number, d: number, rot = 0) => {
    const f = F(x, z, rot);
    f.box(m, w, 0.018, d, 0, 0, 0);
    for (const s of [-1, 1]) for (let i = 0; i < w / 0.05; i++) f.box(mFabCream, 0.012, 0.004, 0.07, -w / 2 + i * 0.05 + 0.025, 0.002, s * (d / 2 + 0.03));
  };

  // ================================================================ LIVING ROOM (x -6..10, z 0..13)
  k.room("Living Room", -6, 12, -1, 13);
  rug(mRugA, 0.4, 7.6, 4.2, 3.0);
  // chesterfield sofa facing north (towards the TV wall at z=3.4)
  const chesterfield = (x: number, z: number, ry: number, w: number, m: Mat) => {
    const f = F(x, z, ry);
    f.box(m, w, 0.25, 0.9, 0, 0.12, 0);
    for (const s of [-1, 1]) {
      f.box(m, 0.22, 0.42, 0.9, s * (w / 2 - 0.11), 0.12, 0);
      f.geo(m, new THREE.CylinderGeometry(0.15, 0.15, 0.94, 16), s * (w / 2 - 0.1), 0.6, 0, Math.PI / 2);
    }
    f.box(m, w - 0.1, 0.5, 0.22, 0, 0.35, -0.36);
    f.geo(m, new THREE.CylinderGeometry(0.12, 0.12, w - 0.1, 16), 0, 0.86, -0.38, 0, 0, Math.PI / 2);
    const nc = Math.round((w - 0.44) / 0.62);
    for (let i = 0; i < nc; i++) f.box(m, (w - 0.46) / nc - 0.02, 0.16, 0.66, -w / 2 + 0.23 + ((i + 0.5) * (w - 0.46)) / nc, 0.37, 0.07);
    for (let i = 0; i < 9; i++) for (let j = 0; j < 2; j++) f.geo(mBrass, new THREE.SphereGeometry(0.012, 6, 4), -w / 2 + 0.3 + (i * (w - 0.6)) / 8, 0.55 + j * 0.16, -0.245);
    for (const [lx, lz] of [[-w / 2 + 0.08, -0.36], [w / 2 - 0.08, -0.36], [-w / 2 + 0.08, 0.36], [w / 2 - 0.08, 0.36]]) f.geo(mWalnut, latheG([[0.001, 0], [0.03, 0], [0.04, 0.08], [0.035, 0.12], [0.001, 0.12]], 10), lx, 0, lz);
    f.col(-w / 2, w / 2, -0.45, 0.45, 0, 0.62);
  };
  chesterfield(0.4, 9.2, Math.PI, 2.4, mLeather);
  for (const [lx, c] of [[-0.3, "#c8942c"], [0.9, "#2f6f73"], [1.3, "#e8e0cf"]] as [number, string][]) cushI.add(lx, 0.72, 9.45, [0.42, 0.4, 0.13], c, Math.PI + rr(-0.2, 0.2), rr(-0.25, -0.1), rr(-0.2, 0.2));
  // knitted throw on the arm
  F(-0.7, 9.2, Math.PI).box(mFabRust, 0.3, 0.02, 0.8, 0, 0.76, 0.0, 0, 0, 0.3);
  // two armchairs (fabric) angled
  const armchair = (x: number, z: number, ry: number, m: Mat) => {
    const f = F(x, z, ry);
    for (const [lx, lz] of [[-0.32, -0.3], [0.32, -0.3], [-0.32, 0.3], [0.32, 0.3]]) f.bar(mWalnut, [lx, 0, lz], [lx * 0.9, 0.2, lz * 0.9], 0.02, 6);
    f.box(m, 0.8, 0.22, 0.75, 0, 0.2, 0);
    f.box(m, 0.62, 0.14, 0.6, 0, 0.42, 0.06);
    f.box(m, 0.8, 0.52, 0.16, 0, 0.4, -0.3, -0.12);
    for (const s of [-1, 1]) f.box(m, 0.12, 0.26, 0.72, s * 0.34, 0.4, 0);
    f.col(-0.4, 0.4, -0.38, 0.38, 0, 0.62);
  };
  armchair(-1.8, 7.1, Math.PI / 2 + 0.35, mFabMustard);
  armchair(2.7, 7.0, -Math.PI / 2 - 0.3, mFabTeal);
  cushI.add(2.62, 0.66, 7.1, [0.36, 0.34, 0.12], "#e8e0cf", -Math.PI / 2 - 0.3, -0.2);
  // coffee table: reclaimed slab on hairpin legs + props
  {
    const f = F(0.4, 7.6, 0.03);
    f.box(mReclaim, 1.3, 0.07, 0.7, 0, 0.38, 0);
    for (const [lx, lz] of [[-0.55, -0.28], [0.55, -0.28], [-0.55, 0.28], [0.55, 0.28]]) { f.bar(mBlack, [lx, 0.38, lz], [lx * 0.95, 0, lz * 0.8], 0.006, 4); f.bar(mBlack, [lx, 0.38, lz], [lx * 0.8, 0, lz * 0.95], 0.006, 4); }
    for (let s = 0; s < 3; s++) f.inst(bookI, -0.35, 0.47 + s * 0.035, 0.05, [0.3, 0.034, 0.23], pick(["#1f3a5a", "#e8e0cc", "#7a1f1f"]), rr(-0.3, 0.3));
    f.geo(mCeramic, latheG([[0.001, 0], [0.035, 0], [0.04, 0.09], [0.042, 0.095]], 12), 0.1, 0.45, -0.1);
    f.geo(k.mat(null, "#3a4a5a", [1, 1], { roughness: 0.2 }), latheG([[0.001, 0], [0.12, 0], [0.16, 0.05], [0.17, 0.07]], 20), 0.35, 0.45, 0.05);
    for (let i = 0; i < 4; i++) f.geo(solid(pick(["#d2402a", "#e8b030", "#7ab040"]), 0.4), new THREE.SphereGeometry(0.035, 10, 8), 0.32 + rr(-0.06, 0.06), 0.52, 0.05 + rr(-0.06, 0.06));
    f.col(-0.65, 0.65, -0.35, 0.35, 0, 0.45);
  }
  // TV console + TV + speakers facing south (z ~ 4.5)
  {
    const f = F(0.4, 4.35, 0);
    f.box(mWalnut, 2.4, 0.5, 0.45, 0, 0.12, 0);
    for (const lx of [-1.1, 1.1]) for (const lz of [-0.17, 0.17]) f.cyl(mBlack, 0.015, 0.012, 0.12, lx, 0, lz, 6);
    for (let i = 0; i < 3; i++) { f.box(mOak, 0.76, 0.44, 0.01, -0.8 + i * 0.8, 0.15, 0.226); f.box(mBrass, 0.1, 0.015, 0.02, -0.8 + i * 0.8, 0.5, 0.235); }
    f.box(mBlack, 1.5, 0.86, 0.05, 0, 0.72, -0.05);
    f.plane(mScreen, 1.44, 0.8, 0, 1.15, -0.022);
    f.box(mBlack, 0.3, 0.1, 0.2, 0, 0.62, -0.05);
    for (const s of [-1, 1]) { f.box(mWalnut, 0.22, 0.95, 0.24, s * 1.45, 0, 0.0); f.geo(mBlack, new THREE.CylinderGeometry(0.07, 0.07, 0.01, 16), s * 1.45, 0.65, 0.125, Math.PI / 2); f.geo(mBlack, new THREE.CylinderGeometry(0.04, 0.04, 0.01, 12), s * 1.45, 0.82, 0.125, Math.PI / 2); }
    // record player on the console + vinyl crate
    f.box(mWalnut, 0.42, 0.1, 0.34, -0.8, 0.62, 0.02);
    f.cyl(mBlack, 0.15, 0.15, 0.012, -0.84, 0.72, 0.02, 24);
    f.cyl(k.mat(null, "#c23a2a", [1, 1]), 0.045, 0.045, 0.014, -0.84, 0.722, 0.02, 14);
    f.bar(mChrome, [-0.65, 0.75, -0.1], [-0.72, 0.75, 0.08], 0.005, 4);
    f.col(-1.6, 1.6, -0.25, 0.25, 0, 0.62);
  }
  {
    const f = F(-1.5, 4.5, 0.2);
    f.box(mOak, 0.5, 0.32, 0.36, 0, 0, 0);
    for (let i = 0; i < 12; i++) f.box(solid(pick(["#222", "#c8b890", "#2a4a7a", "#b03a2a", "#e0d8c8"]), 0.6), 0.44, 0.31, 0.006, 0, 0.03, -0.15 + i * 0.027, rr(-0.08, 0.08));
    f.col(-0.25, 0.25, -0.18, 0.18, 0, 0.32);
  }
  // guitar on a stand
  {
    const f = F(3.4, 4.6, -0.4);
    f.bar(mBlack, [0, 0, -0.15], [0, 0.35, 0], 0.01, 4); f.bar(mBlack, [-0.15, 0, 0.1], [0, 0.35, 0], 0.01, 4); f.bar(mBlack, [0.15, 0, 0.1], [0, 0.35, 0], 0.01, 4);
    const body = mergeG([place(new THREE.CylinderGeometry(0.19, 0.19, 0.09, 20), 0, 0.32, 0, Math.PI / 2), place(new THREE.CylinderGeometry(0.15, 0.15, 0.09, 20), 0, 0.6, 0, Math.PI / 2)]);
    f.geo(k.mat(null, "#b86a2a", [1, 1], { roughness: 0.25 }), body, 0, 0.1, 0.04, -0.15);
    f.geo(mWalnut, boxGeo(0.05, 0.62, 0.025), 0, 1.15, 0.13, -0.15);
    f.geo(mBlack, new THREE.CylinderGeometry(0.05, 0.05, 0.095, 16), 0, 0.53, 0.07, Math.PI / 2 - 0.15);
    f.col(-0.2, 0.2, -0.15, 0.15, 0, 1.5, false);
  }
  // big bookcases on either side of the TV wall? -> along the west side of the living room (x=-5.2)
  pipeShelf(-5.5, 9.0, Math.PI / 2, 2.4, 2.4, 6, 0.35, true);
  pipeShelf(-5.5, 6.4, Math.PI / 2, 2.4, 2.4, 6, 0.35, true);
  // arc floor lamp
  {
    const f = F(-1.7, 9.4, 0.6);
    f.cyl(mMarble, 0.18, 0.2, 0.06, 0, 0, 0, 20);
    f.geo(mChrome, tubeG([[0, 0.05, 0], [0, 1.6, 0], [0.4, 2.1, 0], [1.0, 2.05, 0], [1.3, 1.85, 0]], 0.014, 30, 6));
    f.geo(mChrome, latheG([[0.02, 0.12], [0.08, 0.1], [0.17, 0.0], [0.18, -0.02]], 20), 1.3, 1.72, 0);
    f.geo(mBulbSoft, new THREE.SphereGeometry(0.05, 10, 8), 1.3, 1.72, 0);
    f.col(-0.2, 0.2, -0.2, 0.2, 0, 0.1);
  }
  // side table with lamp + plant
  {
    const f = F(2.1, 9.7, 0);
    f.cyl(mWalnut, 0.25, 0.25, 0.035, 0, 0.55, 0, 20);
    f.cyl(mBlack, 0.02, 0.02, 0.55, 0, 0, 0, 8);
    f.cyl(mBlack, 0.18, 0.2, 0.02, 0, 0, 0, 16);
    f.geo(mCeramic, latheG([[0.001, 0], [0.06, 0], [0.09, 0.12], [0.05, 0.25], [0.02, 0.28]], 16), 0, 0.585, 0);
    f.geo(fab("#efe6d2"), latheG([[0.15, 0], [0.1, 0.18]], 20), 0, 0.84, 0);
    f.geo(mBulbSoft, new THREE.SphereGeometry(0.035, 8, 6), 0, 0.88, 0);
    f.col(-0.25, 0.25, -0.25, 0.25, 0, 0.59);
  }
  plantPot(3.4, 9.9, 1.3); plantPot(-4.8, 12.2, 1.5); plantPot(4.9, 12.3, 1.1, mCeramic); plantPot(-2.8, 3.6, 1.0, mNavyPaint);
  // pool table (felt, pockets, balls, cues)
  {
    const px = 6.8, pz = 8.6;
    const f = F(px, pz, Math.PI / 2);
    f.box(mWalnut, 2.5, 0.2, 1.4, 0, 0.62, 0);
    f.box(mFelt, 2.26, 0.03, 1.16, 0, 0.82, 0);
    for (const s of [-1, 1]) { f.box(mWalnut, 2.5, 0.07, 0.12, 0, 0.8, s * 0.64); f.box(mWalnut, 0.12, 0.07, 1.4, s * 1.19, 0.8, 0); }
    for (const [lx, lz] of [[-1.1, -0.55], [1.1, -0.55], [-1.1, 0.55], [1.1, 0.55]]) f.geo(mWalnut, latheG([[0.001, 0], [0.09, 0], [0.07, 0.1], [0.08, 0.3], [0.06, 0.5], [0.09, 0.6], [0.001, 0.62]], 14), lx, 0, lz);
    for (const [lx, lz] of [[-1.15, -0.6], [0, -0.63], [1.15, -0.6], [-1.15, 0.6], [0, 0.63], [1.15, 0.6]]) f.cyl(mBlack, 0.055, 0.055, 0.02, lx, 0.855, lz, 12);
    const cols = ["#f4f2ea", "#e8c020", "#1c4a9a", "#c42a20", "#5a2a7a", "#e2701a", "#1a7a3a", "#7a1a1a", "#151515"];
    let bi = 0;
    for (let row = 0; row < 4; row++) for (let j = 0; j <= row; j++) { const [wx, wz] = f.pt(0.5 + row * 0.052, (j - row / 2) * 0.06); W.geo(solid(cols[1 + (bi++ % 8)], 0.15), new THREE.SphereGeometry(0.029, 12, 8), wx, 0.865, wz); }
    { const [wx, wz] = f.pt(-0.6, 0.1); W.geo(solid(cols[0], 0.15), new THREE.SphereGeometry(0.029, 12, 8), wx, 0.865, wz); }
    f.bar(mOak, [-0.3, 0.87, 0.3], [-1.5, 0.87, 0.45], 0.012, 6);
    f.col(-1.25, 1.25, -0.7, 0.7, 0, 0.86);
    // cue rack on the column
    const cf = F(10, 5.52, 0);
    cf.box(mWalnut, 0.4, 0.08, 0.1, 0, 0.3, 0.02); cf.box(mWalnut, 0.4, 0.06, 0.1, 0, 1.3, 0.02);
    for (let i = 0; i < 4; i++) cf.bar(mOak, [-0.15 + i * 0.1, 0.33, 0.05], [-0.15 + i * 0.1, 1.45, 0.05], 0.01, 6);
    edison(6.8, 2.2, 8.6, "enamel"); edison(6.8, 2.2, 7.7, "enamel"); edison(6.8, 2.2, 9.5, "enamel");
  }
  // spinning ceiling fans hung from the beams
  const ceilFan = (x: number, z: number, sp: number) => {
    W.bar(mBlack, [x, H - 0.62, z], [x, H - 1.5, z], 0.02, 8);
    W.geo(mBlack, latheG([[0.001, 0], [0.1, 0], [0.12, 0.1], [0.08, 0.2], [0.02, 0.22]], 16), x, H - 1.72, z);
    const gs: BG[] = [];
    for (let i = 0; i < 5; i++) { const b = boxGeo(0.62, 0.012, 0.14); b.translate(0.42, 0, 0); b.rotateX(0.12); b.rotateY((i * Math.PI * 2) / 5); gs.push(b); }
    const g = mergeG(gs);
    const m = k.add(g, mWalnut, [x, H - 1.66, z], { noShadow: true });
    m.userData.spin = { axis: [0, 1, 0], speed: sp };
  };
  ceilFan(-2, 9.5, 1.6); ceilFan(6, 9.5, 1.3); ceilFan(-10, 8.5, 1.5);
  // pushable rubber balls + a dog bed
  for (const [bx, bz, c, r] of [[3.7, 11.2, "#e0402a", 0.14], [4.2, 11.5, "#2a8ae0", 0.11], [-3.8, 5.6, "#f0c020", 0.16], [5.3, 5.6, "#3ab060", 0.12]] as [number, number, string, number][]) ballI.add(bx, r, bz, [r, r, r], c);
  {
    const f = F(4.3, 11.9, 0.3);
    f.geo(mFabOlive, new THREE.TorusGeometry(0.36, 0.12, 8, 20), 0, 0.12, 0, Math.PI / 2);
    f.cyl(mFabCream, 0.36, 0.36, 0.06, 0, 0.02, 0, 20);
    f.col(-0.48, 0.48, -0.48, 0.48, 0, 0.24);
  }
  // large painting over the sofa side? on the south wall between windows + small frames cluster
  const framed = (x: number, y: number, z: number, ry: number, w: number, h: number, m: Mat = mBlack, ps = 0) => {
    const f = F(x, z, ry);
    const b = 0.06;
    f.box(m, w + b * 2, b, 0.05, 0, y - h / 2 - b, 0.025); f.box(m, w + b * 2, b, 0.05, 0, y + h / 2, 0.025);
    f.box(m, b, h, 0.05, -w / 2 - b / 2, y - h / 2, 0.025); f.box(m, b, h, 0.05, w / 2 + b / 2, y - h / 2, 0.025);
    f.box(mCanvas, w, h, 0.015, 0, y - h / 2, 0.008);
    paintingPlane(f, w, h, 0, y, 0.017, 0, ps);
  };
  framed(-5.75, 3.7, 12.74, Math.PI, 1.6, 1.1, mBrass, 3);
  framed(-0.25, 3.3, 12.74, Math.PI, 1.0, 1.3, mBlack, 5);
  framed(5.25, 3.4, 12.74, Math.PI, 1.2, 0.9, mWalnut, 7);
  // lounge (hider spawn area): big jute rug, floor cushions against the stair wall, neon sign
  rug(k.mat(tWeave, "#b89a6a", [6, 4], { roughness: 1, bump: 0.9 }), -1.0, -4.7, 6.6, 4.2, 0);
  for (let i = 0; i < 3; i++) cushI.add(4.3, 0.12, -3.2 - i * 0.8, [0.7, 0.24, 0.7], pick(["#a4502e", "#2f6f73", "#c8942c"]), rr(-0.3, 0.3));
  {
    const f = F(12, -0.84, 0);
    const neon = k.mat(null, "#ff5aa8", [1, 1], { emissive: "#ff4aa0", emissiveIntensity: 3 });
    B.noShadow.add(neon);
    f.box(k.mat(null, "#1a1a1a", [1, 1], { roughness: 0.3 }), 1.6, 0.6, 0.02, 0, 2.9, 0.0);
    const txt = [[[-0.6, 0.2], [-0.6, -0.2], [-0.4, -0.2]], [[-0.3, 0.2], [-0.1, 0.2], [-0.1, -0.2], [-0.3, -0.2], [-0.3, 0.2]], [[0.0, -0.2], [0.0, 0.2], [0.2, 0.2]], [[0.0, 0.0], [0.15, 0.0]], [[0.3, 0.2], [0.55, 0.2], [0.425, 0.2], [0.425, -0.2]]];
    for (const pl of txt) for (let i = 0; i < pl.length - 1; i++) f.bar(neon, [pl[i][0], 3.2 + pl[i][1], 0.05], [pl[i + 1][0], 3.2 + pl[i + 1][1], 0.05], 0.014, 6);
  }
  // ================================================================ KITCHEN + DINING (x -18..-6, z -2..13)
  k.room("Kitchen", -18, -6, -2, 13);
  /** run of base cabinets (shaker doors, brass pulls) with marble top; faces local +z; w along x */
  const baseRun = (x: number, z: number, ry: number, w: number, m: Mat, top: Mat = mMarble, sink = -99) => {
    const f = F(x, z, ry);
    f.box(mBlack, w, 0.1, 0.56, 0, 0, -0.02);
    f.box(m, w, 0.78, 0.6, 0, 0.1, 0);
    const n = Math.max(1, Math.round(w / 0.6));
    for (let i = 0; i < n; i++) {
      const cx = -w / 2 + (i + 0.5) * (w / n), dw = w / n - 0.02;
      f.box(m, dw, 0.52, 0.02, cx, 0.12, 0.305); f.box(m, dw - 0.12, 0.4, 0.015, cx, 0.18, 0.318);
      f.box(m, dw, 0.18, 0.02, cx, 0.67, 0.305);
      f.box(mBrass, 0.12, 0.015, 0.02, cx, 0.76, 0.325); f.box(mBrass, 0.015, 0.1, 0.02, cx + dw / 2 - 0.06, 0.48, 0.325);
    }
    f.box(top, w + 0.04, 0.04, 0.64, 0, 0.88, 0.01);
    if (sink > -90) {
      f.box(mCeramic, 0.62, 0.22, 0.5, sink, 0.7, 0.04);
      f.box(k.mat(null, "#9aa2a6", [1, 1], { metalness: 0.6, roughness: 0.3 }), 0.54, 0.01, 0.42, sink, 0.921, 0.04);
      f.geo(mBrass, tubeG([[sink, 0.92, -0.24], [sink, 1.25, -0.24], [sink, 1.3, -0.14], [sink, 1.18, -0.05]], 0.015, 14, 6));
      for (const s of [-1, 1]) f.cyl(mBrass, 0.02, 0.02, 0.06, sink + s * 0.12, 0.92, -0.24, 8);
    }
    f.col(-w / 2, w / 2, -0.3, 0.33, 0, 0.92);
  };
  // west wall run with sink under the window, range in the middle, fridge at the end
  baseRun(-17.4, 2.2, Math.PI / 2, 3.6, mSage, mMarble, 1.2);
  baseRun(-17.4, 9.6, Math.PI / 2, 2.4, mSage, mMarble);
  {
    // range cooker + hood
    const f = F(-17.4, 5.6, Math.PI / 2);
    f.box(mSteel, 1.0, 0.9, 0.64, 0, 0, 0.02);
    f.box(mBlack, 0.94, 0.02, 0.58, 0, 0.9, 0.02);
    for (const [lx, lz] of [[-0.25, -0.12], [0.25, -0.12], [-0.25, 0.16], [0.25, 0.16]]) { f.geo(mIron, new THREE.TorusGeometry(0.09, 0.012, 4, 16), lx, 0.93, lz, Math.PI / 2); f.cyl(mBlack, 0.05, 0.05, 0.01, lx, 0.915, lz, 12); }
    f.box(mBlack, 0.8, 0.42, 0.02, 0, 0.2, 0.345);
    f.box(mChrome, 0.7, 0.025, 0.03, 0, 0.66, 0.36);
    for (let i = 0; i < 5; i++) f.cyl(mBlack, 0.025, 0.025, 0.04, -0.36 + i * 0.18, 0.8, 0.35, 10, Math.PI / 2);
    f.geo(mSteel, latheG([[0.55, 0], [0.5, 0.05], [0.22, 0.55], [0.17, 0.6], [0.17, 2.0]].map(([a, b]) => [a, b] as [number, number]), 4), 0, 2.0, 0, 0, Math.PI / 4);
    // pots on the hob, utensil rail
    f.geo(mCopper, latheG([[0.001, 0], [0.12, 0], [0.13, 0.14], [0.135, 0.15]], 18), -0.25, 0.94, -0.12);
    f.geo(mIron, latheG([[0.001, 0], [0.13, 0], [0.14, 0.05], [0.145, 0.055]], 18), 0.25, 0.94, 0.16);
    f.bar(mIron, [0.1, 0.99, 0.16], [0.5, 0.99, 0.45], 0.012, 6);
    f.col(-0.5, 0.5, -0.3, 0.34, 0, 0.94);
  }
  // open oak shelves with jars, plates, bottles above the counters
  for (const [sz, n] of [[2.2, 3], [9.6, 2]] as [number, number][]) {
    const f = F(-17.72, sz, Math.PI / 2);
    for (let l = 0; l < 2; l++) {
      const y = 1.55 + l * 0.45, w = n * 1.1;
      f.box(mOak, w, 0.04, 0.26, 0, y, 0.0);
      for (const lx of [-w / 2 + 0.2, w / 2 - 0.2]) f.box(mIron, 0.03, 0.12, 0.2, lx, y - 0.12, 0);
      for (let i = 0; i < n * 5; i++) {
        const lx = -w / 2 + 0.12 + i * (w - 0.24) / (n * 5 - 1);
        const t = rnd();
        if (t < 0.4) f.inst(jarI, lx, y + 0.04, 0.0, [1, 0.8 + rnd() * 0.6, 1]);
        else if (t < 0.65) f.inst(bottleI, lx, y + 0.04, 0.02, [1, 0.8 + rnd() * 0.4, 1], pick(["#2a5a2a", "#6a3a1a", "#d8d0b8", "#1a3a5a"]));
        else if (t < 0.85) for (let p = 0; p < 5; p++) f.inst(plateI, lx, y + 0.04 + p * 0.016, 0, [0.9, 1, 0.9], pick(["#ffffff", "#e8eef2", "#f2e6d6"]));
        else f.geo(mCeramic, latheG([[0.001, 0], [0.035, 0], [0.042, 0.09], [0.044, 0.095]], 12), lx, y + 0.04, 0);
      }
    }
  }
  // fridge (retro, cream) + tall pantry
  {
    const f = F(-17.3, 11.9, Math.PI / 2);
    f.box(mCreamFridge, 0.8, 1.85, 0.72, 0, 0.05, 0);
    f.box(mCreamFridge, 0.78, 0.004, 0.02, 0, 1.25, 0.37);
    f.bar(mChrome, [0.3, 1.35, 0.4], [0.3, 1.7, 0.4], 0.015, 6); f.bar(mChrome, [0.3, 0.6, 0.4], [0.3, 1.1, 0.4], 0.015, 6);
    for (let i = 0; i < 5; i++) f.box(solid(pick(["#e0402a", "#2a8ae0", "#f0c020", "#3ab060"]), 0.4), 0.05, 0.05, 0.015, rr(-0.3, 0.2), rr(1.3, 1.8), 0.365);
    f.plane(noteMat({ lines: ["Welcome home!", "Feed Pixel twice a day,", "water the ferns (Sun).", "Plumber: Thu 9am.", "Spare key: under the", "big plant.  - Tom Kodner"], hand: true, bg: "#fff59a", w: 256, h: 300 }), 0.22, 0.26, -0.1, 1.55, 0.368, 0.1);
    f.col(-0.4, 0.4, -0.36, 0.36, 0, 1.9);
  }
  // kitchen island with marble top + stools
  {
    const f = F(-12, 5.6, 0);
    f.box(mNavyPaint, 0.9, 0.86, 2.6, 0, 0.02, 0);
    for (let i = 0; i < 4; i++) { f.box(mNavyPaint, 0.02, 0.6, 0.58, 0.455, 0.14, -0.96 + i * 0.64); f.box(mBrass, 0.02, 0.015, 0.12, 0.47, 0.7, -0.96 + i * 0.64); }
    f.box(mMarble, 1.2, 0.05, 2.8, -0.12, 0.88, 0);
    f.geo(mWalnut, boxGeo(0.4, 0.035, 0.28), 0.1, 0.945, -0.6);
    f.geo(k.mat(null, "#e8d8a0", [1, 1], { roughness: 0.5 }), new THREE.SphereGeometry(0.1, 12, 8), 0.1, 0.99, -0.6, 0, 0, 0);
    f.geo(mCeramic, latheG([[0.001, 0], [0.08, 0], [0.18, 0.1], [0.19, 0.11]], 20), -0.2, 0.93, 0.5);
    for (let i = 0; i < 6; i++) f.geo(solid(pick(["#d2402a", "#e8b030", "#7ab040", "#e87a30"]), 0.35), new THREE.SphereGeometry(0.045, 10, 8), -0.2 + rr(-0.08, 0.08), 1.0 + rr(0, 0.04), 0.5 + rr(-0.08, 0.08));
    f.geo(mChrome, latheG([[0.001, 0], [0.09, 0], [0.1, 0.12], [0.07, 0.2], [0.02, 0.22], [0.001, 0.23]], 16), -0.3, 0.93, 1.1);
    f.col(-0.72, 0.48, -1.4, 1.4, 0, 0.92);
  }
  for (let i = 0; i < 3; i++) stool(-12.95, 4.7 + i * 0.9);
  // long dining table + mismatched chairs + bench, under the window
  {
    const f = F(-10.9, 10.9, Math.PI / 2);
    f.box(mReclaim, 2.4, 0.07, 0.95, 0, 0.72, 0);
    for (const s of [-1, 1]) { f.box(mIron, 0.06, 0.7, 0.75, s * 1.0, 0.02, 0); f.box(mIron, 0.08, 0.04, 0.85, s * 1.0, 0, 0); }
    f.box(mIron, 2.0, 0.05, 0.05, 0, 0.3, 0);
    for (let i = 0; i < 4; i++) f.inst(plateI, -0.8 + i * 0.55, 0.795, -0.25, [1, 1, 1], "#ffffff");
    f.geo(mGlass, latheG([[0.001, 0], [0.06, 0], [0.07, 0.25], [0.04, 0.3]], 14), 0.1, 0.795, 0.05);
    for (let i = 0; i < 3; i++) f.geo(mBulbSoft, latheG([[0.001, 0], [0.02, 0], [0.02, 0.18], [0.001, 0.19]], 8), -0.3 + i * 0.2, 0.795, 0.12);
    f.col(-1.2, 1.2, -0.48, 0.48, 0, 0.79);
  }
  for (let i = 0; i < 4; i++) chairWood(-10.15, 9.95 + i * 0.64, -Math.PI / 2 + rr(-0.15, 0.15), i % 2 ? mOak : mWalnut);
  { const f = F(-11.75, 10.9, Math.PI / 2); f.box(mReclaim, 2.2, 0.05, 0.35, 0, 0.44, 0); for (const s of [-1, 1]) f.box(mIron, 0.05, 0.44, 0.3, s * 0.95, 0, 0); f.col(-1.1, 1.1, -0.18, 0.18, 0, 0.49); }
  // copper pot rack over the island
  {
    W.box(mIron, 0.08, 0.05, 1.8, -12, 2.55, 5.6);
    for (const s of [-1, 1]) W.bar(mIron, [-12, 2.6, 5.6 + s * 0.8], [-12, H - 0.62, 5.6 + s * 0.8], 0.008, 4);
    for (let i = 0; i < 5; i++) {
      const z = 4.9 + i * 0.35, r = rr(0.1, 0.15);
      W.geo(mCopper, latheG([[0.001, 0], [r, 0], [r + 0.01, r * 0.9], [r + 0.015, r]], 16), -12, 2.1 - r, z, Math.PI, 0, 0);
      W.bar(mCopper, [-12, 2.1 - r * 0.1, z], [-12, 2.5, z], 0.008, 4);
    }
  }
  plantPot(-7.2, 12.3, 1.2);
  boxPile(-7.3, 1.4, 2, ["KITCHEN", "PLATES - FRAGILE"]);
  decal(mStain, -16.5, 5.6, 0.8);

  // ================================================================ ARTIST STUDIO (x -18..-6, z -13..-2)
  k.room("Artist Studio", -18, -6, -13, -2);
  // drop cloths and splatters
  flat(mFabCream, -14.6, -10.6, -9.4, -5.6, 0.014, 0.08);
  for (let i = 0; i < 9; i++) decal(i % 2 ? mSplat : mSplat2, rr(-16.8, -7.2), rr(-12, -3), rr(0.8, 1.8), 0.016 + i * 0.0005);
  const easel = (x: number, z: number, ry: number, cw: number, ch: number, ps: number) => {
    const f = F(x, z, ry);
    f.bar(mOak, [-0.3, 0, 0.12], [0, 2.0, 0], 0.022, 6, false);
    f.bar(mOak, [0.3, 0, 0.12], [0, 2.0, 0], 0.022, 6, false);
    f.bar(mOak, [0, 0, -0.55], [0, 1.9, -0.02], 0.02, 6, false);
    f.box(mOak, 0.66, 0.05, 0.08, 0, 0.75, 0.1);
    const y0 = 0.8;
    f.box(mCanvas, cw, ch, 0.03, 0, y0, 0.11, -0.06);
    paintingPlane(f, cw - 0.02, ch - 0.02, 0, y0 + ch / 2 + 0.005, 0.127 + Math.sin(0.06) * (ch / 2), 0, ps);
    f.col(-0.35, 0.35, -0.55, 0.2, 0, 2.0, false);
  };
  easel(-12.4, -7.6, 0.4, 0.8, 1.0, 1);
  easel(-10.2, -9.2, -0.5, 0.9, 0.7, 2);
  easel(-14.8, -5.2, 2.6, 0.6, 0.8, 4);
  // stacked canvases leaning against walls (backs + a few faces)
  for (let i = 0; i < 7; i++) {
    const w = rr(0.6, 1.3), h = rr(0.6, 1.2), x = -17.6 + 0.03 * i, z = -11.8 + i * 0.95;
    const f = F(x, z, Math.PI / 2);
    f.box(mCanvas, w, h, 0.035, 0, 0, 0.1 + i * 0.0, -0.12);
    if (i % 2) paintingPlane(f, w - 0.04, h - 0.04, 0, h / 2 + 0.01, 0.12 + Math.sin(0.12) * h / 2 + 0.03, 0, 8 + i);
  }
  k.collider(-17.75, -17.1, -12.2, -5.4, 0, 1.2, true);
  // work table with paint tubes, jars of brushes, rags
  {
    const f = F(-15.4, -12.2, 0);
    for (const lx of [-1.0, 1.0]) for (const lz of [-0.3, 0.3]) f.box(mTimberL, 0.08, 0.86, 0.08, lx, 0, lz);
    f.box(mReclaim, 2.2, 0.06, 0.8, 0, 0.86, 0);
    f.box(mTimberL, 2.0, 0.03, 0.66, 0, 0.2, 0);
    for (let i = 0; i < 5; i++) {
      const lx = -0.9 + i * 0.4;
      f.geo(mGlass, latheG([[0.001, 0], [0.05, 0], [0.05, 0.14], [0.001, 0.14]], 12), lx, 0.92, -0.2);
      for (let b = 0; b < 4; b++) f.bar(pick([mOak, mWalnut, mRedPipe]), [lx + rr(-0.02, 0.02), 0.95, -0.2 + rr(-0.02, 0.02)], [lx + rr(-0.06, 0.06), 1.2, -0.2 + rr(-0.06, 0.06)], 0.004, 4);
    }
    for (let i = 0; i < 12; i++) f.inst(bottleI, rr(-1, 1), 0.92, rr(0, 0.3), [0.5, 0.35, 0.5], pick(["#d2402a", "#2a5aa8", "#e8c020", "#3ab060", "#f0f0f0", "#6a2a8a"]), 0, Math.PI / 2, rr(0, 6));
    f.geo(mFabCream, boxGeo(0.3, 0.03, 0.25), 0.6, 0.92, 0.15, 0, 0.4);
    f.box(mCanvas, 0.5, 0.02, 0.35, -0.3, 0.92, 0.12, 0, 0.2);
    f.col(-1.1, 1.1, -0.4, 0.4, 0, 0.92);
    // paint cans under / beside
    for (let i = 0; i < 9; i++) canI.add(-16.6 + i * 0.26 + rr(-0.03, 0.03), (i > 5 ? 0.19 : 0) + 0.21, -12.0 + rr(-0.1, 0.1), [1, 1, 1], pick(["#e8e8e8", "#c8d8e8", "#e8d8b8", "#d84a3a", "#3a6ab8"]));
  }
  // stool, plaster bust on a plinth, step ladder, clamp lamp
  stool(-11.4, -6.6, 0.75);
  {
    const f = F(-8.0, -11.9, 0.3);
    f.box(mWhitePaint, 0.5, 1.1, 0.5, 0, 0, 0);
    f.geo(mPlaster, latheG([[0.001, 0], [0.16, 0], [0.18, 0.05], [0.12, 0.12], [0.1, 0.2], [0.2, 0.28], [0.22, 0.34], [0.12, 0.42], [0.07, 0.48], [0.08, 0.55], [0.11, 0.62], [0.12, 0.72], [0.1, 0.82], [0.05, 0.87], [0.001, 0.88]], 20), 0, 1.1, 0);
    f.col(-0.25, 0.25, -0.25, 0.25, 0, 1.98);
  }
  {
    const f = F(-7.1, -8.2, -Math.PI / 2 + 0.3);
    for (const s of [-1, 1]) { f.bar(mTimberL, [s * 0.22, 0, 0.45], [s * 0.18, 1.8, 0.05], 0.022, 6, false); f.bar(mTimberL, [s * 0.22, 0, -0.45], [s * 0.18, 1.8, -0.05], 0.022, 6, false); }
    for (let i = 1; i < 6; i++) { const t = i / 6; f.box(mTimberL, 0.42 - t * 0.06, 0.03, 0.1, 0, t * 1.8, 0.45 - t * 0.4); }
    f.box(mTimberL, 0.42, 0.04, 0.2, 0, 1.8, 0);
    for (let i = 0; i < 3; i++) canI.add(...([-7.1 + rr(-0.1, 0.1), 1.84, -8.2] as [number, number, number]), [0.9, 0.9, 0.9], "#d8d0c0");
    f.col(-0.25, 0.25, -0.5, 0.5, 0, 1.85, true);
  }
  sign({ bg: "#1b1b1b", fg: "#f4f0e8", lines: ["STUDIO", "PLEASE DON'T TOUCH WET PAINT"], w: 384, h: 128, wear: 0.4 }, -12, 2.1, -12.74, 0, 0.8, 0.27);
  framed(-14.5, 3.1, -12.74, 0, 1.4, 1.0, mBrass, 11);
  framed(-17.74, 3.2, -9.6, Math.PI / 2, 1.1, 1.4, mWalnut, 13);
  plantPot(-6.8, -2.8, 1.1);

  // ================================================================ LIBRARY + MEZZANINE (x -6..6, z -13..-7.5)
  k.room("Library", -6, 6, -13, -7.3);
  {
    const MY = 3.0, z1 = -12.75, z2 = -7.5, x1 = -5.85, x2 = 5.85;
    // steel deck: channel edge beams, plank deck, posts
    slab(mMezzDeck, x1, x2, MY - 0.06, MY, z1, z2, 2.4);
    slab(mMezzUnder, x1, x2, MY - 0.12, MY - 0.06, z1, z2, 2.4);
    W.box(mIron, x2 - x1, 0.3, 0.12, 0, MY - 0.32, z2 + 0.02);
    for (let x = -5; x <= 5; x += 1.25) W.box(mIron, 0.08, 0.2, z2 - z1, x, MY - 0.32, (z1 + z2) / 2);
    for (const px of [-2, 2]) { W.cyl(mIron, 0.07, 0.07, MY - 0.32, px, 0, z2 + 0.05, 14); W.box(mIron, 0.26, 0.03, 0.26, px, 0, z2 + 0.05); k.collider(px - 0.08, px + 0.08, z2 - 0.03, z2 + 0.13, 0, MY - 0.3, false); }
    k.collider(x1, x2, z1, z2 + 0.08, MY - 0.35, MY, true);
    // railing
    for (let x = x1 + 0.05; x < 4.8; x += 0.12) W.bar(mIron, [x, MY, z2 + 0.03], [x, MY + 0.95, z2 + 0.03], 0.008, 4);
    W.box(mOak, 4.8 - x1 + 0.1, 0.05, 0.1, (x1 + 4.8) / 2, MY + 0.95, z2 + 0.03);
    W.box(mIron, 4.8 - x1, 0.03, 0.05, (x1 + 4.8) / 2, MY + 0.08, z2 + 0.03);
    k.collider(x1, 4.8, z2 - 0.03, z2 + 0.1, MY, MY + 1.0, false);
    // iron stair along the bedroom wall (x 4.85..5.85), from z -2.4 up to the deck edge
    const n = 15, run = 4.9 / n, rise = MY / n;
    for (let i = 0; i < n; i++) {
      const zc = -2.4 - (i + 0.5) * run, y = (i + 1) * rise;
      W.box(mOak, 0.95, 0.045, run + 0.03, 5.35, y - 0.045, zc);
      W.box(mIron, 0.95, 0.12, 0.012, 5.35, y - 0.16, zc + run / 2 - 0.005);
      k.collider(4.87, 5.83, zc - run / 2, zc + run / 2, 0, y, true);
    }
    for (const sx of [4.85, 5.85]) { const g = C.beam([sx, 0.05, -2.4], [sx, MY - 0.05, -7.3], 0.1, 4, false); g.scale(1, 1, 1); B.add(mIron, g); }
    W.geo(mIron, tubeG([[4.85, 0.95, -2.4], [4.85, MY + 0.95, -7.3], [4.8, MY + 0.95, -7.45]], 0.022, 14, 8));
    for (let i = 0; i < n; i += 2) { const zc = -2.4 - (i + 0.5) * run, y = (i + 1) * rise; W.bar(mIron, [4.85, y, zc], [4.85, y + 0.93, zc], 0.012, 4); }
    k.collider(4.8, 4.9, -7.3, -2.4, 0.9, 1.6 + MY, false);
    // under-deck: tall bookcases along the north wall + reading nook
    for (const bx of [-4.6, -2.2, 0.2, 2.6]) pipeShelf(bx, -12.5, 0, 2.3, 2.6, 7, 0.4);
    {
      const f = F(-3.2, -9.6, 0.2);
      f.box(mWalnut, 1.6, 0.04, 0.8, 0, 0.74, 0);
      for (const lx of [-0.75, 0.75]) f.box(mWalnut, 0.05, 0.74, 0.72, lx, 0, 0);
      f.box(mWalnut, 1.46, 0.3, 0.02, 0, 0.44, -0.36);
      f.geo(mBrass, latheG([[0.001, 0], [0.07, 0], [0.07, 0.02], [0.01, 0.04], [0.01, 0.38], [0.001, 0.38]], 12), -0.6, 0.78, -0.2);
      f.geo(k.mat(null, "#2a6a3a", [1, 1], { roughness: 0.2 }), latheG([[0.02, 0], [0.12, 0.0], [0.12, 0.08], [0.02, 0.1]], 16, ), -0.6, 1.1, -0.1, Math.PI / 2 - 0.3);
      f.geo(mBulbSoft, new THREE.SphereGeometry(0.03, 8, 6), -0.6, 1.1, -0.06);
      for (let s = 0; s < 4; s++) f.inst(bookI, 0.3, 0.78 + s * 0.04, 0.1, [0.25, 0.038, 0.19], pick(["#7a1f1f", "#1f3a5a", "#caa56a"]), rr(-0.3, 0.3));
      f.geo(noteMat({ title: "READING LIST", lines: ["1. Moby-Dick", "2. The Old Man and the Sea", "3. Brick & Iron: Lofts 1890-1920", "4. Return library books!"], ruled: true, w: 256, h: 330 }), new THREE.PlaneGeometry(0.21, 0.28).rotateX(-Math.PI / 2), -0.05, 0.765, 0.05, 0, 0.3);
      f.col(-0.8, 0.8, -0.4, 0.4, 0, 0.78);
      chairWood(-3.05, -8.95, Math.PI + 0.3, mWalnut);
    }
    // globe on a stand, leather club chair
    {
      const f = F(3.9, -9.8, 0);
      f.geo(mWalnut, latheG([[0.001, 0], [0.2, 0], [0.2, 0.03], [0.04, 0.08], [0.03, 0.7], [0.001, 0.72]], 16), 0, 0, 0);
      f.geo(k.mat(k.tex("bl-globe", () => T.noise("#6a9ab0", 0.25, 8, 400)), "#ffffff", [2, 1], { roughness: 0.4, bump: 0.2 }), new THREE.SphereGeometry(0.25, 20, 14), 0, 0.97, 0);
      f.geo(mBrass, new THREE.TorusGeometry(0.27, 0.01, 4, 24), 0, 0.97, 0, 0, 0, 0.4);
      f.col(-0.2, 0.2, -0.2, 0.2, 0, 1.22);
    }
    armchair(1.6, -9.3, 0.4, mLeatherBlk);
    rug(mRugB, -0.4, -10.0, 3.2, 2.2, 0.05);
    edison(-3.2, 2.35, -9.9, "bare"); edison(1.4, 2.35, -10.1, "bare");
    // mezzanine top: home office desk, chair, low shelf, beanbag, boxes
    {
      const f = F(-2.8, -12.2, 0);
      f.box(mOak, 1.8, 0.04, 0.7, 0, MY + 0.72, 0);
      for (const lx of [-0.85, 0.85]) { f.box(mBlack, 0.04, 0.72, 0.04, lx, MY, -0.3); f.box(mBlack, 0.04, 0.72, 0.04, lx, MY, 0.3); }
      f.box(mBlack, 0.6, 0.38, 0.03, 0, MY + 0.95, -0.15);
      f.plane(mScreenOn, 0.56, 0.33, 0, MY + 1.14, -0.134);
      f.box(mBlack, 0.05, 0.2, 0.05, 0, MY + 0.76, -0.17);
      f.box(mBlack, 0.42, 0.015, 0.14, 0, MY + 0.765, 0.1);
      f.geo(mCeramic, latheG([[0.001, 0], [0.04, 0], [0.045, 0.1]], 12), 0.5, MY + 0.76, 0.1);
      f.col(-0.9, 0.9, -0.35, 0.35, MY, MY + 0.76);
      const cf = F(-2.8, -11.5, Math.PI + 0.3);
      for (let i = 0; i < 5; i++) { const a = (i * Math.PI * 2) / 5; cf.bar(mBlack, [0, MY + 0.08, 0], [Math.cos(a) * 0.3, MY + 0.05, Math.sin(a) * 0.3], 0.02, 6, false); }
      cf.cyl(mChrome, 0.025, 0.025, 0.35, 0, MY + 0.08, 0, 8);
      cf.box(mFabGrey, 0.48, 0.08, 0.46, 0, MY + 0.44, 0);
      cf.box(mFabGrey, 0.46, 0.55, 0.07, 0, MY + 0.55, -0.24, -0.1);
      cf.col(-0.3, 0.3, -0.3, 0.3, MY, MY + 0.52);
      W.geo(mFabMustard, place(new THREE.SphereGeometry(0.5, 16, 10), 0, 0, 0, 0, 0, 0, [1, 0.6, 1]), 1.5, MY + 0.28, -10.2);
      k.collider(1.0, 2.0, -10.7, -9.7, MY, MY + 0.55, true);
      pipeShelf(3.2, -12.5, 0, 1.8, 1.1, 3, 0.35);
      boxPile(-5.2, -8.3, 3, ["BOOKS", "WINTER CLOTHES", "RECORDS"], MY);
      plantPot(0.2, -8.2, 0.9, mCeramic, MY);
    }
  }
  // ================================================================ BEDROOM (x 6..13, z -13..-1)
  k.room("Bedroom", 6, 13, -13, -1);
  rug(mRugB, 9.6, -8.4, 3.0, 3.6, 0);
  {
    // bed: iron headboard, oak frame, mattress, duvet, pillows
    const f = F(9.6, -11.1, 0);
    f.box(mOak, 1.75, 0.3, 2.15, 0, 0.1, 1.0);
    for (const [lx, lz] of [[-0.82, -0.05], [0.82, -0.05], [-0.82, 2.05], [0.82, 2.05]]) f.box(mOak, 0.08, 0.12, 0.08, lx, 0, lz);
    f.box(mFabCream, 1.65, 0.22, 2.0, 0, 0.4, 1.0);
    f.box(mFabNavy, 1.75, 0.1, 1.45, 0, 0.6, 1.33);
    f.box(mFabNavy, 0.05, 0.4, 1.45, -0.87, 0.3, 1.33); f.box(mFabNavy, 0.05, 0.4, 1.45, 0.87, 0.3, 1.33);
    f.box(mFabNavy, 1.75, 0.4, 0.05, 0, 0.3, 2.06);
    f.box(mFabMustard, 1.8, 0.03, 0.5, 0, 0.7, 1.7);
    for (const lx of [-0.42, 0.42]) f.inst(cushI, lx, 0.72, 0.28, [0.66, 0.18, 0.42], "#f2eee4", 0, -0.35);
    f.inst(cushI, 0, 0.74, 0.52, [0.4, 0.34, 0.12], "#a4502e", 0, -0.3);
    for (const lx of [-0.86, 0.86]) f.cyl(mIron, 0.025, 0.025, 1.25, lx, 0, -0.02, 10);
    f.bar(mIron, [-0.86, 1.2, -0.02], [0.86, 1.2, -0.02], 0.022, 8);
    f.bar(mIron, [-0.86, 0.55, -0.02], [0.86, 0.55, -0.02], 0.016, 8);
    for (let i = 1; i < 9; i++) f.bar(mIron, [-0.86 + i * 0.19, 0.55, -0.02], [-0.86 + i * 0.19, 1.2, -0.02], 0.008, 4);
    for (const lx of [-0.86, 0.86]) f.geo(mBrass, new THREE.SphereGeometry(0.04, 10, 8), lx, 1.27, -0.02);
    f.col(-0.9, 0.9, 0, 2.1, 0, 0.72);
  }
  for (const s of [-1, 1]) {
    const f = F(9.6 + s * 1.3, -12.35, 0);
    f.box(mWalnut, 0.5, 0.55, 0.42, 0, 0.05, 0);
    for (const lx of [-0.22, 0.22]) for (const lz of [-0.18, 0.18]) f.box(mBlack, 0.03, 0.06, 0.03, lx, 0, lz);
    f.box(mOak, 0.46, 0.2, 0.02, 0, 0.3, 0.21); f.box(mBrass, 0.1, 0.015, 0.02, 0, 0.4, 0.225);
    f.geo(mCeramic, latheG([[0.001, 0], [0.07, 0], [0.09, 0.1], [0.05, 0.22], [0.015, 0.26]], 16), 0.05, 0.6, -0.05);
    f.geo(fab("#efe6d2"), latheG([[0.14, 0], [0.1, 0.16]], 20), 0.05, 0.84, -0.05);
    f.geo(mBulbSoft, new THREE.SphereGeometry(0.03, 8, 6), 0.05, 0.88, -0.05);
    if (s > 0) for (let b = 0; b < 3; b++) f.inst(bookI, -0.14, 0.62 + b * 0.035, 0.05, [0.2, 0.033, 0.15], pick(["#1f3a5a", "#e8e0cc", "#7a1f1f"]), rr(-0.3, 0.3));
    f.col(-0.25, 0.25, -0.21, 0.21, 0, 0.6);
  }
  // pipe clothes rack with shirts + shoes
  {
    const f = F(6.5, -6.5, Math.PI / 2);
    for (const lx of [-1.1, 1.1]) { f.cyl(mIron, 0.02, 0.02, 1.8, lx, 0, 0, 8); f.box(mIron, 0.06, 0.02, 0.45, lx, 0, 0); }
    f.bar(mIron, [-1.1, 1.78, 0], [1.1, 1.78, 0], 0.018, 8);
    const shirtG = latheG([[0.001, 0], [0.22, 0.0], [0.23, 0.45], [0.26, 0.62], [0.12, 0.72], [0.02, 0.74]].reverse().map(([a, b]) => [a, 0.74 - b] as [number, number]).reverse(), 10);
    for (let i = 0; i < 9; i++) {
      const lx = -0.95 + i * 0.235;
      f.geo(fab(pick(["#f2eee6", "#2a3552", "#8a2a2a", "#6a7a5a", "#c8b28a", "#3a3a3a", "#88a4c8"])), place(shirtG.clone(), 0, 0, 0, 0, 0, 0, [1, 1, 0.22]), lx, 1.0, 0, 0, Math.PI / 2 + rr(-0.15, 0.15));
      f.geo(mWalnut, new THREE.TorusGeometry(0.2, 0.008, 4, 12, Math.PI), lx, 1.72, 0, 0, Math.PI / 2);
    }
    for (let i = 0; i < 3; i++) for (const s of [-1, 1]) f.box(pick([mBlack, mLeather]), 0.11, 0.1, 0.28, -0.8 + i * 0.5 + s * 0.07, 0.02, 0.1);
    f.col(-1.15, 1.15, -0.25, 0.25, 0, 1.8, false);
  }
  {
    // dresser with mirror, laundry basket, full-length mirror
    const f = F(12.55, -6.0, -Math.PI / 2);
    f.box(mWhitePaint, 1.4, 0.85, 0.5, 0, 0.08, 0);
    for (const lx of [-0.65, 0.65]) for (const lz of [-0.2, 0.2]) f.box(mOak, 0.05, 0.08, 0.05, lx, 0, lz);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) { f.box(mWhitePaint, 0.66, 0.25, 0.02, -0.34 + c * 0.68, 0.11 + r * 0.27, 0.255); f.geo(mBrass, new THREE.SphereGeometry(0.018, 8, 6), -0.34 + c * 0.68, 0.24 + r * 0.27, 0.28); }
    f.box(mOak, 1.44, 0.03, 0.52, 0, 0.93, 0);
    f.box(mBrass, 0.72, 0.9, 0.03, 0, 0.98, -0.2); f.plane(mMirror, 0.66, 0.84, 0, 1.43, -0.18);
    f.geo(mGlass, latheG([[0.001, 0], [0.04, 0], [0.05, 0.12], [0.02, 0.18]], 12), 0.4, 0.96, 0.05);
    f.geo(k.mat(null, "#b04a6a", [1, 1], { roughness: 0.5 }), new THREE.SphereGeometry(0.06, 10, 8), 0.4, 1.18, 0.05);
    for (let i = 0; i < 4; i++) f.inst(bottleI, -0.5 + i * 0.09, 0.96, 0.1, [0.6, 0.45, 0.6], pick(["#e8d8b8", "#c8a0a0", "#a0c0d0", "#f2f2f2"]));
    f.col(-0.7, 0.7, -0.25, 0.25, 0, 0.96);
  }
  { const f = F(12.3, -3.4, 0.3); f.geo(k.mat(tWeave, "#c8b28a", [4, 2], { roughness: 1, bump: 0.8 }), latheG([[0.001, 0], [0.2, 0], [0.24, 0.5], [0.25, 0.52], [0.001, 0.48]], 16), 0, 0, 0); f.geo(fab("#88a4c8"), place(new THREE.SphereGeometry(0.2, 10, 8), 0, 0, 0, 0, 0, 0, [1, 0.5, 1]), 0.02, 0.52, 0); f.col(-0.25, 0.25, -0.25, 0.25, 0, 0.6); }
  framed(9.6, 2.7, -12.74, 0, 1.5, 0.8, mWalnut, 15);
  {
    // bench at the foot of the bed + reading chair + floor lamp
    const f = F(9.6, -8.55, 0);
    f.box(mLeather, 1.4, 0.12, 0.42, 0, 0.36, 0);
    for (const lx of [-0.62, 0.62]) for (const lz of [-0.16, 0.16]) f.box(mWalnut, 0.05, 0.36, 0.05, lx, 0, lz);
    f.inst(bookI, 0.4, 0.5, 0, [0.28, 0.04, 0.2], "#1f3a5a", 0.3);
    f.box(mFabCream, 0.5, 0.05, 0.4, -0.3, 0.48, 0, 0, 0.2);
    f.col(-0.7, 0.7, -0.21, 0.21, 0, 0.48);
  }
  armchair(7.2, -4.2, Math.PI / 2 + 0.5, mFabRust);
  {
    const f = F(7.0, -5.2, 0);
    f.cyl(mBlack, 0.16, 0.18, 0.03, 0, 0, 0, 16);
    f.cyl(mBrass, 0.012, 0.012, 1.5, 0, 0.03, 0, 8);
    f.geo(fab("#efe6d2"), latheG([[0.2, 0], [0.14, 0.24]], 20), 0, 1.4, 0);
    f.geo(mBulbSoft, new THREE.SphereGeometry(0.04, 8, 6), 0, 1.46, 0);
    f.col(-0.16, 0.16, -0.16, 0.16, 0, 0.1);
  }

  plantPot(7.1, -12.2, 1.3);
  plantPot(12.3, -12.2, 0.9, mCeramic);

  // ================================================================ BATHROOM (x 13..18, z -13..-1)
  k.room("Bathroom", 13, 18, -13, -1);
  {
    // clawfoot tub along the north wall
    const f = F(15.4, -12.05, 0);
    const tub = new THREE.CapsuleGeometry(0.36, 1.0, 6, 20);
    tub.rotateZ(Math.PI / 2); tub.scale(1, 1, 1.0);
    const pos = tub.attributes.position;
    for (let i = 0; i < pos.count; i++) if (pos.getY(i) > 0.05) pos.setY(i, 0.05);
    tub.computeVertexNormals();
    f.geo(mCeramic, tub, 0, 0.62, 0);
    f.geo(mBrass, new THREE.TorusGeometry(0.36, 0.03, 6, 24), 0, 0.67, 0, Math.PI / 2, 0, 0).scale(1, 1, 1);
    f.geo(k.mat(null, "#a8c8d0", [1, 1], { roughness: 0.05, metalness: 0.1 }), place(new THREE.CircleGeometry(1, 24), 0, 0, 0, -Math.PI / 2, 0, 0, [0.8, 1, 0.3]), 0, 0.58, 0);
    for (const [lx, lz] of [[-0.55, -0.22], [0.55, -0.22], [-0.55, 0.22], [0.55, 0.22]]) f.geo(mBrass, latheG([[0.001, 0], [0.05, 0], [0.03, 0.06], [0.04, 0.16], [0.02, 0.28], [0.001, 0.3]], 10), lx, 0, lz);
    f.geo(mBrass, tubeG([[0.75, 0.2, -0.3], [0.75, 1.0, -0.3], [0.75, 1.1, -0.1], [0.72, 0.95, 0.0]], 0.018, 16, 6));
    f.geo(mBrass, tubeG([[-0.9, 0.9, -0.3], [-0.9, 2.05, -0.3], [-0.9, 2.1, -0.05]], 0.015, 16, 6));
    f.cyl(mBrass, 0.1, 0.05, 0.05, -0.9, 2.05, 0.0, 16);
    f.col(-0.8, 0.8, -0.38, 0.38, 0, 0.68);
    for (let i = 0; i < 3; i++) f.inst(bottleI, 0.9 + i * 0.07, 0.0, -0.3, [0.7, 0.6, 0.7], pick(["#f2f2f2", "#a0c0d0", "#e8a0a0"]));
  }
  {
    // pedestal sink + round mirror + toilet
    const f = F(17.5, -8.8, -Math.PI / 2);
    f.geo(mCeramic, latheG([[0.001, 0], [0.16, 0], [0.12, 0.05], [0.09, 0.2], [0.08, 0.6], [0.14, 0.72], [0.28, 0.8], [0.3, 0.86], [0.001, 0.84]], 24), 0, 0, 0.1, 0, 0, 0);
    f.geo(mBrass, tubeG([[0, 0.86, -0.12], [0, 1.02, -0.12], [0, 1.05, 0.0], [0, 0.98, 0.06]], 0.013, 12, 6));
    f.geo(mBrass, new THREE.TorusGeometry(0.34, 0.03, 8, 32), 0, 1.6, -0.2);
    f.geo(mMirror, new THREE.CircleGeometry(0.33, 32), 0, 1.6, -0.19);
    f.col(-0.3, 0.3, -0.2, 0.4, 0, 0.86);
    const t = F(17.45, -6.9, -Math.PI / 2);
    t.geo(mCeramic, latheG([[0.001, 0], [0.12, 0], [0.1, 0.12], [0.13, 0.3], [0.19, 0.38], [0.2, 0.42], [0.001, 0.42]], 20), 0, 0, 0.12);
    t.box(mCeramic, 0.42, 0.4, 0.2, 0, 0.4, -0.1);
    t.box(mOak, 0.42, 0.04, 0.46, 0, 0.42, 0.14);
    t.geo(mChrome, new THREE.CylinderGeometry(0.02, 0.02, 0.05, 8), 0.14, 0.82, -0.1, 0, 0, Math.PI / 2);
    t.col(-0.22, 0.22, -0.22, 0.4, 0, 0.8);
  }
  {
    // washer + dryer, shelf of detergents, towel ladder, laundry
    for (const [i, lab] of [[0, "WASH"], [1, "DRY"]] as [number, string][]) {
      const f = F(13.6, -3.0 + i * 0.7, Math.PI / 2);
      f.box(mWhitePaint, 0.6, 0.85, 0.6, 0, 0.02, 0);
      f.geo(mChrome, new THREE.TorusGeometry(0.19, 0.035, 8, 24), 0, 0.42, 0.31);
      f.geo(mGlass, new THREE.CircleGeometry(0.18, 24), 0, 0.42, 0.315);
      f.geo(mScreen, new THREE.CircleGeometry(0.17, 24), 0, 0.42, 0.302);
      f.plane(label(lab + "  40°", "#1e2a36", "#9fe2ff", 256, 64, 0.8), 0.18, 0.05, 0.15, 0.78, 0.305);
      f.cyl(mChrome, 0.03, 0.03, 0.02, -0.2, 0.78, 0.3, 12, Math.PI / 2);
      f.col(-0.3, 0.3, -0.3, 0.3, 0, 0.87);
    }
    const s = F(13.3, -2.65, Math.PI / 2);
    s.box(mOak, 1.3, 0.03, 0.3, 0, 1.6, 0.0);
    for (let i = 0; i < 6; i++) s.inst(bottleI, -0.5 + i * 0.2, 1.63, 0, [1.3, 0.9, 1.3], pick(["#2a8ae0", "#f0f0f0", "#e0402a", "#f0c020"]));
    for (let i = 0; i < 3; i++) s.inst(cushI, -0.3 + i * 0.3, 1.9, 0, [0.28, 0.14, 0.24], pick(["#f2eee4", "#88a4c8", "#e8c8b8"]));
    s.inst(cushI, 0.4, 1.9, 0, [0.28, 0.14, 0.24], "#f2eee4");
    const tl = F(13.3, -9.7, Math.PI / 2);
    for (const lx of [-0.25, 0.25]) tl.bar(mOak, [lx, 0, 0.3], [lx, 1.6, 0.05], 0.02, 6);
    for (let i = 1; i < 5; i++) { tl.bar(mOak, [-0.25, i * 0.35, 0.3 - i * 0.055], [0.25, i * 0.35, 0.3 - i * 0.055], 0.015, 6); if (i % 2) tl.box(fab(pick(["#f2eee4", "#88a4c8"])), 0.42, 0.4, 0.03, 0, i * 0.35 - 0.38, 0.33 - i * 0.055); }
    tl.col(-0.3, 0.3, 0, 0.35, 0, 1.6, false);
  }
  rug(fab("#88a4c8"), 15.3, -10.6, 1.4, 0.7);
  plantPot(17.3, -12.3, 0.8, mCeramic);
  decal(mStain, 15.4, -11.4, 0.9);

  // ================================================================ ENTRANCE (x 10..18, z 3..13)
  k.room("Entrance", 11, 18, 2, 13);
  {
    // front door (painted green, panelled) in the east arch, brass knob, doormat
    const f = F(17.72, 10.4, -Math.PI / 2);
    f.box(mIronG, 1.35, 2.48, 0.06, 0, 0, 0);
    for (const ly of [0.2, 1.3]) for (const lx of [-0.3, 0.3]) f.box(mIronG, 0.48, 0.95, 0.03, lx, ly, 0.035);
    f.geo(mBrass, new THREE.SphereGeometry(0.035, 10, 8), 0.52, 1.05, 0.08);
    f.box(mBrass, 0.25, 0.05, 0.02, 0, 1.15, 0.045);
    rug(k.mat(k.tex("bl-mat", () => T.noise("#5a4a3a", 0.15, 12, 2500)), "#ffffff", [2, 1], { roughness: 1, bump: 0.8 }), 17.0, 10.4, 0.6, 1.0);
    sign({ bg: "#1b1b1b", fg: "#e8d8b0", lines: ["No. 27", "BRICK LOFT"], w: 256, h: 128, wear: 0.3 }, 17.73, 2.9, 10.4, -Math.PI / 2, 0.44, 0.22);
  }
  {
    // shoe bench + coat hooks with coats + umbrella stand
    const f = F(17.55, 7.2, -Math.PI / 2);
    f.box(mReclaim, 1.3, 0.05, 0.38, 0, 0.45, 0);
    for (const lx of [-0.6, 0.6]) f.box(mIron, 0.04, 0.45, 0.34, lx, 0, 0);
    f.box(mIron, 1.2, 0.02, 0.3, 0, 0.12, 0);
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) f.box(pick([mBlack, mLeather, fab("#d04a2a")]), 0.1, 0.1, 0.27, -0.45 + i * 0.3 + s * 0.06, 0.14, 0);
    f.box(mOak, 1.4, 0.12, 0.03, 0, 1.75, -0.17);
    for (let i = 0; i < 5; i++) f.cyl(mBrass, 0.012, 0.012, 0.08, -0.55 + i * 0.27, 1.8, -0.12, 6, Math.PI / 2);
    for (let i = 0; i < 4; i++) f.geo(fab(pick(["#2a3552", "#8a5a34", "#3a3a3a", "#a4502e", "#6a6c3a"])), place(latheG([[0.05, 1.0], [0.2, 0.92], [0.24, 0.8], [0.25, 0.3], [0.23, 0.0]].reverse().map(([a, b]) => [a, b] as [number, number]), 12), 0, 0, 0, 0, 0, 0, [1, 1, 0.4]), -0.55 + i * 0.36, 0.8, 0.0);
    f.col(-0.68, 0.68, -0.2, 0.2, 0, 0.5);
    k.collider(17.25, 17.72, 6.5, 7.9, 0.8, 1.85, false);
    const u = F(17.4, 8.4, 0);
    u.geo(mCopper, latheG([[0.001, 0], [0.13, 0], [0.13, 0.5], [0.14, 0.52]], 16), 0, 0, 0);
    for (let i = 0; i < 3; i++) u.bar(pick([mBlack, mRedPipe, mNavyPaint]), [rr(-0.05, 0.05), 0.05, rr(-0.05, 0.05)], [rr(-0.12, 0.12), 0.95, rr(-0.12, 0.12)], 0.012, 6);
    u.col(-0.14, 0.14, -0.14, 0.14, 0, 0.55);
  }
  {
    // bicycle hung on the wall (south wall, between windows)
    const f = F(11.8, 12.62, Math.PI);
    for (const lx of [-0.52, 0.52]) { f.geo(mRubber, new THREE.TorusGeometry(0.33, 0.022, 8, 28), lx, 1.9, 0.12); f.geo(mChrome, new THREE.TorusGeometry(0.3, 0.008, 4, 24), lx, 1.9, 0.12); for (let s = 0; s < 8; s++) { const a = (s * Math.PI) / 4; f.bar(mChrome, [lx, 1.9, 0.12], [lx + Math.cos(a) * 0.3, 1.9 + Math.sin(a) * 0.3, 0.12], 0.002, 3); } }
    const fm = k.mat(null, "#1f6f8b", [1, 1], { metalness: 0.5, roughness: 0.3 });
    f.bar(fm, [-0.52, 1.9, 0.12], [-0.02, 1.9, 0.12], 0.018, 6); f.bar(fm, [-0.02, 1.9, 0.12], [-0.22, 2.35, 0.12], 0.018, 6);
    f.bar(fm, [-0.22, 2.35, 0.12], [0.35, 2.35, 0.12], 0.018, 6); f.bar(fm, [-0.02, 1.9, 0.12], [0.4, 2.3, 0.12], 0.018, 6);
    f.bar(fm, [0.4, 2.45, 0.12], [0.52, 1.9, 0.12], 0.016, 6); f.bar(fm, [-0.52, 1.9, 0.12], [-0.22, 2.35, 0.12], 0.012, 6);
    f.box(mLeather, 0.22, 0.05, 0.08, -0.25, 2.42, 0.12);
    f.bar(mBlack, [0.3, 2.55, -0.08], [0.46, 2.52, 0.32], 0.014, 6);
    for (const lx of [-0.3, 0.3]) f.box(mIron, 0.04, 0.04, 0.2, lx, 2.3, 0.0);
    k.collider(11.2, 12.4, 12.3, 12.75, 1.55, 2.6, true);
  }
  // moving boxes (just moved in) + console table with key bowl + mailbox letters
  boxPile(13.3, 11.8, 3, ["FRAGILE", "BOOKS", "KITCHEN", "THIS SIDE UP"]);
  boxPile(14.0, 12.1, 2, ["BEDROOM", "MISC."]);
  boxPile(12.7, 11.4, 1, ["LAMPS"]);
  cardboardBox(15.0, 0, 12.1, 0.5, 0.35, 0.45, 0.4, "RECORDS");
  { const flatBox = F(11.6, 10.9, 0.2); flatBox.box(mCardboard, 0.9, 0.012, 0.7, 0, 0.0, 0); }
  {
    const f = F(17.6, 4.8, -Math.PI / 2);
    f.box(mWalnut, 1.2, 0.04, 0.35, 0, 0.8, 0);
    for (const lx of [-0.56, 0.56]) for (const lz of [-0.14, 0.14]) f.bar(mBlack, [lx, 0, lz], [lx, 0.8, lz], 0.012, 5);
    f.geo(mCopper, latheG([[0.001, 0], [0.06, 0], [0.12, 0.05], [0.13, 0.06]], 16), -0.3, 0.84, 0);
    f.geo(noteMat({ lines: ["The Occupant", "27 Brick Lane, Loft 4", "Old Harbour District"], hand: true, bg: "#f2ead8", w: 256, h: 150 }), new THREE.PlaneGeometry(0.22, 0.13).rotateX(-Math.PI / 2), 0.25, 0.842, 0.02, 0, 0.2);
    f.geo(noteMat({ stripe: "#2a5aa8", title: "CITY POWER & GAS", lines: ["Account: 0047-2291", "Amount due: 86.40", "Due: 30 September"], w: 256, h: 220, bg: "#ffffff" }), new THREE.PlaneGeometry(0.2, 0.17).rotateX(-Math.PI / 2), 0.05, 0.843, -0.03, 0, -0.35);
    f.box(mBrass, 0.5, 0.9, 0.03, 0, 1.2, -0.16); f.plane(mMirror, 0.44, 0.84, 0, 1.65, -0.14);
    f.col(-0.6, 0.6, -0.18, 0.18, 0, 0.84);
  }
  plantPot(17.2, 3.6, 1.3);
  // upright piano under the neon sign, with stool, sheet music and a metronome
  {
    const f = F(12.4, -0.5, 0);
    f.box(mBlack, 1.5, 1.25, 0.58, 0, 0.05, 0.05);
    f.box(mBlack, 1.5, 0.05, 0.62, 0, 1.3, 0.05);
    f.box(mBlack, 1.4, 0.06, 0.28, 0, 0.7, 0.45);
    f.box(mCeramic, 1.3, 0.025, 0.14, 0, 0.76, 0.52);
    for (let i = 0; i < 36; i++) { const kx = -0.62 + i * 0.036; if ([0, 1, 3, 4, 5].includes(i % 7) && i < 35) f.box(mBlack, 0.018, 0.02, 0.08, kx + 0.018, 0.785, 0.49); }
    for (const lx of [-0.7, 0.7]) f.box(mBlack, 0.06, 0.65, 0.08, lx, 0.05, 0.5);
    f.box(mBlack, 1.3, 0.28, 0.02, 0, 0.9, 0.33, -0.25);
    f.geo(noteMat({ title: "Autumn Leaves", lines: ["~ ~ ~ ~ ~ ~ ~ ~", "Gm7   C7   Fmaj7", "~ ~ ~ ~ ~ ~ ~ ~", "Bbmaj7  Em7b5  A7"], w: 256, h: 300, bg: "#f6f0e0" }), new THREE.PlaneGeometry(0.3, 0.36).rotateX(-0.25), -0.2, 1.04, 0.35);
    f.geo(mWalnut, latheG([[0.001, 0], [0.07, 0], [0.03, 0.22], [0.001, 0.23]], 4), 0.55, 1.35, 0.05, 0, Math.PI / 4);
    f.geo(mBrass, latheG([[0.001, 0], [0.05, 0], [0.05, 0.02], [0.001, 0.02]], 12), -0.5, 1.35, 0.1);
    for (const lx of [-0.5, 0.5]) f.geo(mBulbSoft, latheG([[0.001, 0], [0.015, 0], [0.015, 0.14], [0.001, 0.15]], 8), lx, 1.37, 0.1);
    f.col(-0.75, 0.75, -0.25, 0.6, 0, 1.33);
    const b = F(12.4, 0.75, 0);
    b.box(mBlack, 0.8, 0.06, 0.36, 0, 0.44, 0);
    b.box(mLeatherBlk, 0.76, 0.05, 0.32, 0, 0.5, 0);
    for (const lx of [-0.35, 0.35]) for (const lz of [-0.14, 0.14]) b.box(mBlack, 0.04, 0.44, 0.04, lx, 0, lz);
    b.col(-0.4, 0.4, -0.18, 0.18, 0, 0.55);
  }
  // entrance runner rug, old steamer trunk, a crate of empty wine bottles
  rug(mRugA, 15.4, 7.0, 1.2, 4.2, 0);
  {
    const f = F(12.1, 3.4, 0.2);
    f.box(mNavyPaint, 0.9, 0.5, 0.5, 0, 0.02, 0);
    f.geo(mNavyPaint, new THREE.CylinderGeometry(0.25, 0.25, 0.9, 16, 1, false, 0, Math.PI), 0, 0.52, 0, 0, 0, Math.PI / 2);
    for (const lx of [-0.3, 0.3]) f.box(mLeather, 0.06, 0.56, 0.52, lx, 0.02, 0);
    for (const [lx, lz] of [[-0.42, -0.22], [0.42, -0.22], [-0.42, 0.22], [0.42, 0.22]]) f.box(mBrass, 0.06, 0.06, 0.06, lx, 0.0, lz);
    f.box(mBrass, 0.08, 0.1, 0.02, 0, 0.42, 0.26);
    f.col(-0.46, 0.46, -0.26, 0.26, 0, 0.77);
    const c = F(11.2, 3.2, -0.3);
    c.box(mReclaim, 0.5, 0.3, 0.35, 0, 0.0, 0);
    for (let i = 0; i < 6; i++) c.inst(bottleI, -0.16 + (i % 3) * 0.16, 0.12, -0.08 + Math.floor(i / 3) * 0.16, [1, 1, 1], pick(["#2a5a2a", "#4a1a1a", "#1a3a1a"]));
    c.col(-0.25, 0.25, -0.18, 0.18, 0, 0.4);
  }
  // shipping label on the moving boxes + posters by the entrance
  note({ stripe: "#c3221f", title: "FRAGILE - THIS WAY UP", lines: ["DELIVER TO:", "Tom Kodner", "27 Brick Lane, Loft 4", "Box 7 of 12 - RECORDS"], w: 256, h: 256, bg: "#ffffff" }, 15.0 + Math.sin(0.4) * 0.226, 0.2, 12.1 + Math.cos(0.4) * 0.226, 0.4, 0.2, 0.2, 0, 0.004);
  note({ stripe: "#1b1b1b", title: "JAZZ NIGHT", lines: ["THE BRICK CELLAR", "Every Friday - 9 PM", "Live quartet + vinyl DJ", "Free entry before 10"], bg: "#f2c14e", fg: "#1b1b1b", w: 256, h: 360 }, 8.2, 1.75, -0.85, 0, 0.5, 0.7, 0.02);
  note({ title: "HOUSE RULES", lines: ["1. Shoes off on the rug", "2. Records back in sleeves", "3. Nobody touches the", "   pool table felt", "4. Last one up turns", "   off the pendants"], w: 256, h: 330, bg: "#efe6d0" }, 16.3, 1.6, -0.85, 0, 0.36, 0.46, -0.02);
  // kitchen: shopping list on the island, recipe card on the counter
  paper({ lines: ["Shopping:", "- coffee beans", "- sourdough", "- lemons x4", "- paint thinner (!)"], hand: true, bg: "#ffffff", ruled: true, w: 256, h: 300 }, -12.25, 0.908, 6.5, 0.4, 0.13, 0.16);
  paper({ title: "GRANDMA'S RAGU", lines: ["2 onions, 3 garlic", "500 g beef, 1 tin tomato", "red wine, bay leaf", "simmer 3 hours"], w: 256, h: 300, bg: "#fbf6ea" }, -17.2, 0.906, 3.4, 1.2, 0.15, 0.18);
  // studio: pinned sketches + commission note
  for (let i = 0; i < 5; i++) note({ title: `SKETCH ${11 + i}`, lines: [pick(["figure study", "window light", "bridge at dusk", "still life, pears", "the cat, asleep"]), "charcoal on paper"], w: 256, h: 320, bg: "#f4efe2" }, -17.74, 2.0 + (i % 2) * 0.45, -4.4 + i * 0.42, Math.PI / 2, 0.3, 0.38, rr(-0.08, 0.08), 0.03);
  note({ lines: ["Commission for", "Mrs. Hale - harbour", "view, 90 x 60 cm", "DUE FRIDAY!"], hand: true, bg: "#bfe6ff", w: 256, h: 256 }, -13.3, 1.7, -12.74, 0, 0.26, 0.26, 0.05, 0.03);
  // mezzanine desk to-do list
  paper({ title: "TO DO", lines: ["fix stair handrail", "order more canvas", "call landlord re: lease", "pay power bill"], ruled: true, w: 256, h: 300 }, -2.4, 3.765, -12.1, -0.2, 0.2, 0.25);
  // light switches / outlets / conduit on brick
  for (const [x, z, ry] of [[17.74, 9.3, -Math.PI / 2], [6.15, -3.3, Math.PI / 2], [-5.85, -3.6, Math.PI / 2], [-17.74, 0.4, Math.PI / 2]] as [number, number, number][]) {
    const f = F(x, z, ry);
    f.box(mGalv, 0.09, 0.13, 0.04, 0, 1.2, 0.02);
    f.box(mBlack, 0.015, 0.035, 0.015, 0, 1.25, 0.045);
    f.bar(mGalv, [0, 1.33, 0.02], [0, H - 0.65, 0.02], 0.012, 6);
  }
  for (let i = 0; i < 16; i++) decal(mStain, rr(-16, 16), rr(-12, 12), rr(0.5, 1.2));

  // ---------------------------------------------------------------- flush
  B.flush(k);
  for (const l of [bookI, cboxI, jarI, bottleI, canI, leafI, plateI, cushI, ballI]) l.flush(k);

  // hiders appear in the open lounge in front of the library; hunters come in through the front door
  const hiders: THREE.Vector3[] = [];
  for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) hiders.push(new THREE.Vector3(-4.0 + i * 1.2, 0, -6.4 + j * 1.15));
  const hunters: THREE.Vector3[] = [];
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) hunters.push(new THREE.Vector3(14.2 + i * 1.0, 0, 9.4 + j * 1.0));

  return k.finish({
    id: "brickloft", name: "Brick Loft",
    bounds: { minX: -17.6, maxX: 17.6, minZ: -12.6, maxZ: 12.6 },
    hunterSpawns: hunters, hiderSpawns: hiders,
    preview: { pos: [-16.6, 2.5, 12.0], look: [0, 1.0, 1.5], fov: 66 },
    lighting: {
      sky: "#2a2320",
      hemi: ["#ffe2c0", "#4a3222", 0.6],
      sun: { color: "#ffd2a0", int: 1.3, pos: [6, 20, 14] },
      points: [
        { pos: [0, lLiving, 7.6], color: "#ffc27a", int: 60, dist: 20 },
        { pos: [-12, lKitchen, 5.6], color: "#ffcc8a", int: 45, dist: 16 },
        { pos: [-12, lStudio, -7.5], color: "#fff0dc", int: 45, dist: 16 },
        { pos: [9.5, lBed, -7], color: "#ffbf78", int: 32, dist: 13 },
        { pos: [15.4, lBath, -6.5], color: "#fff4e4", int: 26, dist: 11 },
        { pos: [14.6, lHall, 8.6], color: "#ffc88a", int: 36, dist: 14 },
      ],
      exposure: 1.05,
      env: 0.5,
      hdri: "apartment",
    },
  });
}
