// הלובי: גלריית המתנה (22×18 מ'). כן ציור עם בד "PLAY" (המארח עומד מולו ולוחץ E כדי לפתוח הגדרות),
// משטח אדום עגול "HUNTER" במרכז (מי שעומד עליו מקבל עדיפות להיות צייד), ותמונה ממוסגרת של כל מפה על הקירות
// עם שלט פליז. חלונות מזרחיים וצוהר בתקרה מכניסים אור יום; פינת ישיבה, בית קפה, פסלים, קוביות צבעוניות ומראת מתכת
// כדי להתאמן בהסוואה.
import * as THREE from "three";
import * as T from "../textures";
import * as L from "./tex/lobby";
import { Kit, boxGeo, ring, type Mat, type World } from "./kit";
import { Life, drawChameleon, SERIF } from "./tex/life";

type G = THREE.BufferGeometry;
const V3 = THREE.Vector3;

/** מיקום גיאומטריה בעולם: סיבוב (אוילר) ואז הזזה */
function place(geo: G, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, s?: [number, number, number]) {
  const m = new THREE.Matrix4().compose(new V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new V3(...(s ?? [1, 1, 1])));
  return geo.applyMatrix4(m);
}
/** קורה בין שתי נקודות (רגלי כן ציור, מוטות) */
function beam(a: [number, number, number], b: [number, number, number], w: number, d: number, round = false) {
  const va = new V3(...a), vb = new V3(...b);
  const len = va.distanceTo(vb);
  const geo = round ? new THREE.CylinderGeometry(w / 2, w / 2, len, 10) : boxGeo(w, len, d);
  const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), vb.clone().sub(va).normalize());
  geo.applyQuaternion(q);
  const c = va.add(vb).multiplyScalar(0.5);
  geo.translate(c.x, c.y, c.z);
  return geo;
}
/** UV לפי מיקום בעולם (הטלה משולשת) — שומר על קנה מידה אמיתי של הטקסטורה בגיאומטריה ממוזגת */
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

/** אוסף גיאומטריות לפי חומר ומאחד אותן לרשת אחת בסוף (מעט קריאות ציור) */
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

/** מסגרת מקומית (רהיט מסובב): ממירה קואורדינטות מקומיות לעולם */
class Frame {
  constructor(public x: number, public z: number, public ry: number) {}
  put(geo: G, lx: number, ly: number, lz: number, rx = 0, ry = 0, rz = 0) {
    place(geo, lx, ly, lz, rx, ry, rz);
    geo.applyMatrix4(new THREE.Matrix4().makeRotationY(this.ry));
    geo.translate(this.x, 0, this.z);
    return geo;
  }
  /** מתנגש לפי מלבן מקומי */
  box(k: Kit, lx1: number, lx2: number, lz1: number, lz2: number, bottom: number, top: number, standable = true) {
    const c = Math.cos(this.ry), s = Math.sin(this.ry);
    const xs: number[] = [], zs: number[] = [];
    for (const [a, b] of [[lx1, lz1], [lx2, lz1], [lx1, lz2], [lx2, lz2]]) {
      xs.push(this.x + a * c + b * s);
      zs.push(this.z - a * s + b * c);
    }
    k.collider(Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs), bottom, top, standable);
  }
}

export function buildLobby(): World {
  const k = new Kit(5, 3.6);
  const b = new Batch();
  const life = new Life(k, 5180);
  const H = 5; // גובה תקרה
  const IN = { n: -8.85, s: 8.85, w: -10.85, e: 10.85 }; // פני הקירות הפנימיים

  // ---------- חומרים ----------
  const plasterT = k.tex("lb-plaster", () => L.plaster("#ebe5da", 2));
  void plasterT;
  // קירות לבנים אדומות כמו בתמונת המפתח של המשחק (דמות צבועה על קיר לבנים)
  const plasterM = k.mat(k.tex("lb-brick", () => L.brickWall()), "#fff", [1, 1], { bump: 0.9, roughness: 0.9 });
  const accentM = k.mat(k.tex("lb-accent", () => L.plaster("#2c5360", 6)), "#fff", [1, 1], { bump: 0.2, roughness: 0.9 });
  const ceilM = k.mat(k.tex("lb-ceil", () => L.plaster("#f7f6f3", 8)), "#fff", [1, 1], { bump: 0.15, roughness: 0.95 });
  const wainT = k.tex("lb-wain", () => L.wainscot("#34505b"));
  const trimM = k.mat(null, "#f2eee6", [1, 1], { roughness: 0.42 });
  const oakM = k.mat(k.tex("lb-oak", () => L.oakPlanks("#a57a52", 3, 8)), "#fff", [1, 1], { bump: 0.45, roughness: 0.48 });
  const walnutM = k.mat(k.tex("lb-walnut", () => T.wood("#6a4428", "#422814", 6)), "#fff", [1, 1], { bump: 0.7, roughness: 0.5 });
  const pineM = k.mat(k.tex("lb-pine", () => T.wood("#caa06a", "#9c7142", 11)), "#fff", [1, 1], { bump: 0.7, roughness: 0.62 });
  const brassM = k.mat(null, "#c9a24a", [1, 1], { metalness: 0.92, roughness: 0.28 });
  const goldM = k.mat(null, "#b8913e", [1, 1], { metalness: 0.9, roughness: 0.35 });
  const steelM = k.mat(k.tex("lb-brushed", () => L.brushed()), "#fff", [1, 1], { metalness: 0.9, roughness: 0.32, bump: 0.08 });
  const mirrorM = k.mat(null, "#eef2f6", [1, 1], { metalness: 1, roughness: 0.03 });
  const blackM = k.mat(null, "#1d1d1f", [1, 1], { roughness: 0.45, metalness: 0.4 });
  const ironM = k.mat(null, "#2a2a2c", [1, 1], { roughness: 0.55, metalness: 0.7 });
  const marbleM = k.mat(k.tex("lb-marble", () => T.marble("#f2efe8", "#b9b1a3", 5)), "#fff", [1, 1], { roughness: 0.2, bump: 0.1 });
  const whiteM = k.mat(null, "#f4f3f0", [1, 1], { roughness: 0.35 });
  const barM = k.mat(null, "#f0efec", [1, 1], { roughness: 0.4 });
  const doorM = k.mat(k.tex("lb-doorpaint", () => T.noise("#2f4e59", 0.04, 12, 800)), "#fff", [1, 1], { roughness: 0.45, bump: 0.15 });
  const glassM = k.mat(null, "#e9f4ff", [1, 1], { roughness: 0.1, emissive: "#e6f2ff", emissiveIntensity: 1.15 });
  const lampGlowM = k.mat(null, "#fff3dc", [1, 1], { emissive: "#ffe2b0", emissiveIntensity: 2.2 });
  const shadeM = k.mat(k.tex("lb-linen", () => L.weave("#efe4cf", 7)), "#fff", [1, 1], { emissive: "#ffcf8a", emissiveIntensity: 0.35, bump: 0.2 });
  const terraM = k.mat(k.tex("lb-velvet", () => L.weave("#b4553b", 2)), "#fff", [1, 1], { roughness: 0.95, bump: 0.35 });
  const mustardM = k.mat(k.tex("lb-mustard", () => L.weave("#c9962f", 3)), "#fff", [1, 1], { roughness: 0.95, bump: 0.35 });
  const leatherM = k.mat(k.tex("lb-leather", () => L.leather("#3b2a22")), "#fff", [1, 1], { roughness: 0.55, bump: 0.3 });
  const soilM = k.mat(k.tex("lb-soil", () => T.noise("#3a2a1e", 0.2, 5, 2000)), "#fff", [1, 1], { bump: 0.6 });
  const leafM = k.mat(null, "#ffffff", [1, 1], { roughness: 0.55 });
  const stemM = k.mat(null, "#5b4a2e", [1, 1], { roughness: 0.8 });
  const potMats = [
    k.mat(null, "#e8e2d6", [1, 1], { roughness: 0.35 }),
    k.mat(null, "#b86b45", [1, 1], { roughness: 0.8 }),
    k.mat(null, "#2d3a3f", [1, 1], { roughness: 0.4 }),
  ];

  // ---------- רצפה, קירות, תקרה ----------
  k.floor(-11, 11, -9, 9, oakM, 1.6);
  k.wallX(-9, -11.15, 11.15, plasterM);
  k.wallX(9, -11.15, 11.15, plasterM);
  k.wallZ(-11, -8.85, 8.85, plasterM);
  // קיר מזרחי עם שלושה חלונות גבוהים
  const winZ = [-6.2, 0, 6.2], winW = 2.2, sill = 0.9, head = 3.6;
  {
    let cur = -8.85;
    for (const wz of winZ) {
      const a = wz - winW / 2;
      k.box(0.3, H, a - cur, 11, 0, (cur + a) / 2, k.fit(plasterM, a - cur, H));
      k.box(0.3, sill, winW, 11, 0, wz, k.fit(plasterM, winW, sill));
      k.box(0.3, H - head, winW, 11, head, wz, k.fit(plasterM, winW, H - head));
      cur = wz + winW / 2;
    }
    k.box(0.3, H, 8.85 - cur, 11, 0, (cur + 8.85) / 2, k.fit(plasterM, 8.85 - cur, H));
    for (const wz of winZ) {
      // מסגרת חלון לבנה, אדן, חלוקה, זכוכית חלבית (לא מטילה צל — השמש נכנסת)
      b.add(trimM, place(boxGeo(0.42, 0.06, winW + 0.3), IN.e - 0.05, sill - 0.03, wz));
      b.add(trimM, place(boxGeo(0.12, 0.12, winW + 0.24), IN.e - 0.02, head + 0.06, wz));
      for (const s of [-1, 1]) b.add(trimM, place(boxGeo(0.12, head - sill + 0.12, 0.12), IN.e - 0.02, (sill + head) / 2, wz + s * (winW / 2 + 0.06)));
      b.add(trimM, place(new THREE.BoxGeometry(0.08, head - sill, 0.06), 11, (sill + head) / 2, wz));
      b.add(trimM, place(new THREE.BoxGeometry(0.08, 0.06, winW), 11, 2.75, wz));
      k.add(new THREE.PlaneGeometry(winW, head - sill), glassM, [11.02, (sill + head) / 2, wz], { rotY: -Math.PI / 2, noShadow: true });
      // וילונות פשתן
      for (const s of [-1, 1]) {
        for (let i = 0; i < 4; i++) {
          b.add(shadeM, place(new THREE.CylinderGeometry(0.07, 0.08, 3.9, 10, 1, false, 0, Math.PI), IN.e - 0.14, 1.95 + 0.08, wz + s * (winW / 2 + 0.2 + i * 0.12), 0, Math.PI / 2, 0));
        }
      }
      b.add(brassM, place(new THREE.CylinderGeometry(0.018, 0.018, winW + 1.4, 8), IN.e - 0.14, 4.05, wz, Math.PI / 2, 0, 0));
    }
  }
  // תקרה עם צוהר ארוך במרכז (אור יום נופל על המשטח האדום)
  const sky = { x1: -6.5, x2: 6.5, z1: -1.6, z2: 1.6 };
  k.box(22.3, 0.2, 9 - -sky.z1 + 0.15, 0, H, (-9.15 + sky.z1) / 2, k.fit(ceilM, 22, 7.4, 3), { noShadow: false });
  k.box(22.3, 0.2, 9 - sky.z2 + 0.15, 0, H, (9.15 + sky.z2) / 2, k.fit(ceilM, 22, 7.4, 3), { noShadow: false });
  k.box(sky.x1 + 11.15, 0.2, sky.z2 - sky.z1, (-11.15 + sky.x1) / 2, H, 0, ceilM, { noShadow: false });
  k.box(11.15 - sky.x2, 0.2, sky.z2 - sky.z1, (11.15 + sky.x2) / 2, H, 0, ceilM, { noShadow: false });
  {
    const wellH = 0.9;
    b.add(ceilM, place(new THREE.BoxGeometry(sky.x2 - sky.x1, wellH, 0.12), 0, H + wellH / 2, sky.z1 - 0.06), 2);
    b.add(ceilM, place(new THREE.BoxGeometry(sky.x2 - sky.x1, wellH, 0.12), 0, H + wellH / 2, sky.z2 + 0.06), 2);
    b.add(ceilM, place(new THREE.BoxGeometry(0.12, wellH, sky.z2 - sky.z1), sky.x1 - 0.06, H + wellH / 2, 0), 2);
    b.add(ceilM, place(new THREE.BoxGeometry(0.12, wellH, sky.z2 - sky.z1), sky.x2 + 0.06, H + wellH / 2, 0), 2);
    k.add(new THREE.PlaneGeometry(sky.x2 - sky.x1, sky.z2 - sky.z1), glassM, [0, H + wellH, 0], { rotX: Math.PI / 2, noShadow: true });
    for (let x = sky.x1 + 1.3; x < sky.x2 - 0.1; x += 1.3) b.add(barM, place(new THREE.BoxGeometry(0.07, 0.12, sky.z2 - sky.z1), x, H + wellH - 0.08, 0));
    b.add(barM, place(new THREE.BoxGeometry(sky.x2 - sky.x1, 0.12, 0.07), 0, H + wellH - 0.08, 0));
    // לבנת תקרה סביב הצוהר
    b.add(trimM, place(new THREE.BoxGeometry(sky.x2 - sky.x1 + 0.4, 0.08, 0.2), 0, H - 0.04, sky.z1 - 0.1));
    b.add(trimM, place(new THREE.BoxGeometry(sky.x2 - sky.x1 + 0.4, 0.08, 0.2), 0, H - 0.04, sky.z2 + 0.1));
    b.add(trimM, place(new THREE.BoxGeometry(0.2, 0.08, sky.z2 - sky.z1), sky.x1 - 0.1, H - 0.04, 0));
    b.add(trimM, place(new THREE.BoxGeometry(0.2, 0.08, sky.z2 - sky.z1), sky.x2 + 0.1, H - 0.04, 0));
  }
  // קורות תקרה עדינות
  for (const x of [-8.5, 8.5]) b.add(trimM, place(new THREE.BoxGeometry(0.3, 0.25, 17.7), x, H - 0.125, 0));

  // ---------- קיר צבע מאחורי כן הציור ----------
  k.box(5.6, H, 0.03, 0, 0, IN.n + 0.015, k.fit(accentM, 5.6, H), { solid: false });

  // ---------- חיפוי עץ, מסילה, פנלים, כרכוב ----------
  const wainH = 0.82;
  type Side = "n" | "s" | "w" | "e";
  const strip = (side: Side, a1: number, a2: number, y: number, h: number, d: number): G => {
    const len = a2 - a1, c = (a1 + a2) / 2;
    if (side === "n") return place(boxGeo(len, h, d), c, y + h / 2, IN.n + d / 2);
    if (side === "s") return place(boxGeo(len, h, d), c, y + h / 2, IN.s - d / 2);
    if (side === "w") return place(boxGeo(d, h, len), IN.w + d / 2, y + h / 2, c);
    return place(boxGeo(d, h, len), IN.e - d / 2, y + h / 2, c);
  };
  const runs: [Side, number, number][] = [
    ["n", IN.w, IN.e], ["s", IN.w, -1.35], ["s", 1.35, IN.e], ["w", IN.n, IN.s], ["e", IN.n, IN.s],
  ];
  for (const [side, a1, a2] of runs) {
    const len = a2 - a1;
    const wm = k.mat(wainT, "#fff", [len / 0.95, 1], { bump: 0.8, roughness: 0.55 });
    const g = strip(side, a1, a2, 0, wainH, 0.035);
    k.add(g, wm, [0, 0, 0], { noShadow: true });
    b.add(trimM, strip(side, a1, a2, wainH - 0.02, 0.07, 0.06));
    b.add(trimM, strip(side, a1, a2, 0, 0.16, 0.05));
    b.add(trimM, strip(side, a1 - (side === "s" ? 0 : 0), a2, H - 0.16, 0.16, 0.1));
    b.add(trimM, strip(side, a1, a2, H - 0.22, 0.06, 0.16));
  }
  // כרכוב מעל הדלת
  b.add(trimM, strip("s", -1.35, 1.35, H - 0.16, 0.16, 0.1));

  // ---------- דלת כניסה כפולה (דרום) ----------
  {
    const dz = IN.s;
    for (const s of [-1, 1]) {
      b.add(doorM, place(boxGeo(1.0, 2.6, 0.06), s * 0.51, 1.3, dz - 0.03), 1.2);
      // פנלים מוגבהים
      b.add(doorM, place(boxGeo(0.72, 0.9, 0.03), s * 0.51, 0.65, dz - 0.07), 1.2);
      b.add(doorM, place(boxGeo(0.72, 1.2, 0.03), s * 0.51, 1.85, dz - 0.07), 1.2);
      b.add(brassM, place(new THREE.CylinderGeometry(0.018, 0.018, 0.5, 10), s * 0.1, 1.15, dz - 0.14));
      for (const y of [0.92, 1.38]) b.add(brassM, place(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 8), s * 0.1, y, dz - 0.1, Math.PI / 2, 0, 0));
    }
    // משקוף
    b.add(trimM, place(boxGeo(2.5, 0.16, 0.09), 0, 2.68, dz - 0.045));
    for (const s of [-1, 1]) b.add(trimM, place(boxGeo(0.14, 2.76, 0.09), s * 1.1, 1.38, dz - 0.045));
    k.collider(-1.2, 1.2, dz - 0.15, dz, 0, 2.7, false);
  }

  // ---------- תמונות המפות (גלריה) ----------
  const boards: { id: string; name: string; side: Side; a: number }[] = [
    { id: "mansion", name: "Hide-and-Seek Mansion", side: "n", a: -8.4 },
    { id: "country", name: "Indoor Country", side: "n", a: -4.8 },
    { id: "sewer", name: "Sewer", side: "n", a: 4.8 },
    { id: "backrooms", name: "Backrooms", side: "n", a: 8.4 },
    { id: "penguin", name: "Penguin Hotel", side: "e", a: -3.1 },
    { id: "sugarland", name: "Sugarland", side: "e", a: 3.1 },
    { id: "osaka", name: "Osaka", side: "s", a: 8.4 },
    { id: "egypt", name: "Egypt", side: "s", a: 4.8 },
    { id: "deathburger", name: "Death Burger", side: "s", a: -4.8 },
    { id: "greece", name: "Greece", side: "s", a: -8.4 },
    { id: "deepsea", name: "Deep Sea", side: "w", a: 6.5 },
    { id: "mall", name: "Shopping Mall", side: "w", a: 2.2 },
    { id: "kyoto", name: "Kyoto", side: "w", a: -2.2 },
    { id: "museum", name: "Art Museum", side: "w", a: -6.5 },
  ];
  const BW = 2.4, BH = 1.5, BY = 1.98;
  const frameM = k.mat(k.tex("lb-frame", () => T.wood("#3a2616", "#24160b", 14)), "#fff", [0.6, 0.6], { roughness: 0.45, bump: 0.3 });
  // מיקום על קיר: off = מרחק מהקיר
  const onWall = (side: Side, a: number, off: number): { x: number; z: number; rot: number } => {
    if (side === "n") return { x: a, z: IN.n + off, rot: 0 };
    if (side === "s") return { x: a, z: IN.s - off, rot: Math.PI };
    if (side === "w") return { x: IN.w + off, z: a, rot: Math.PI / 2 };
    return { x: IN.e - off, z: a, rot: -Math.PI / 2 };
  };
  for (const bd of boards) {
    const p = onWall(bd.side, bd.a, 0.07);
    k.mapBoard(bd.id, p.x, BY, p.z, p.rot, BW, BH, frameM);
    // שוליים מוזהבים מאחורי המסגרת
    const q = onWall(bd.side, bd.a, 0.025);
    b.add(goldM, place(boxGeo(BW + 0.34, BH + 0.34, 0.04), q.x, BY, q.z, 0, q.rot, 0));
    // שלט פליז עם השם
    const pl = onWall(bd.side, bd.a, 0.045);
    const plM = k.mat(L.plaque(bd.name), "#fff", [1, 1], { metalness: 0.75, roughness: 0.35, bump: 0.25 });
    k.add(new THREE.BoxGeometry(0.95, 0.17, 0.012), plM, [pl.x, 0.985, pl.z], { rotY: pl.rot, noShadow: true });
    // מנורת תמונה מפליז
    const ly = BY + BH / 2 + 0.36;
    const bar = onWall(bd.side, bd.a, 0.3);
    b.add(brassM, place(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 12), bar.x, ly, bar.z, 0, bar.rot, Math.PI / 2));
    b.add(lampGlowM, place(new THREE.BoxGeometry(0.82, 0.012, 0.03), bar.x, ly - 0.036, bar.z, 0, bar.rot, 0));
    for (const s of [-0.3, 0.3]) {
      const [dx, dz] = bd.side === "n" || bd.side === "s" ? [s, 0] : [0, s];
      const w0 = onWall(bd.side, bd.a, 0.02);
      b.add(brassM, beam([w0.x + dx, ly - 0.14, w0.z + dz], [bar.x + dx, ly, bar.z + dz], 0.022, 0.022, true));
      b.add(brassM, place(new THREE.CylinderGeometry(0.04, 0.04, 0.015, 12), w0.x + dx, ly - 0.14, w0.z + dz, Math.PI / 2, bar.rot, 0));
    }
  }

  // ---------- משטח HUNTER אדום במרכז ----------
  const padR = 2.2, padH = 0.1;
  k.add(new THREE.CylinderGeometry(padR, padR + 0.04, padH, 64), k.mat(null, "#9e1c1c", [1, 1], { roughness: 0.4 }), [0, padH / 2, 0], { noShadow: true });
  k.add(new THREE.CircleGeometry(padR, 64), k.mat(k.tex("lb-pad", L.hunterPad), "#fff", [1, 1], { roughness: 0.38, bump: 0 }), [0, padH + 0.002, 0], { rotX: -Math.PI / 2, noShadow: true });
  b.add(brassM, place(new THREE.TorusGeometry(padR + 0.02, 0.025, 8, 72), 0, padH, 0, Math.PI / 2, 0, 0));
  for (let i = -3; i <= 3; i++) {
    const z1 = (i - 0.5) * (padR * 2 / 7), z2 = (i + 0.5) * (padR * 2 / 7);
    const zz = Math.max(Math.abs(z1), Math.abs(z2));
    const hw = Math.sqrt(Math.max(0, padR * padR - zz * zz)) + (i === 0 ? 0 : 0.15);
    k.collider(-hw, hw, z1, z2, 0, padH, true);
  }

  // ---------- כן ציור עם בד PLAY ----------
  const ex = 0, ez = -6.6;
  {
    const lean = 0.135;
    const legTop = 2.3;
    for (const s of [-1, 1]) b.add(pineM, beam([ex + s * 0.46, 0, ez + 0.3], [ex + s * 0.07, legTop, ez + 0.3 - legTop * Math.tan(lean)], 0.05, 0.035), 0.6);
    b.add(pineM, beam([ex, 0, ez - 0.78], [ex, legTop - 0.2, ez + 0.3 - (legTop - 0.2) * Math.tan(lean) - 0.05], 0.045, 0.035), 0.6);
    // עמוד מרכזי, מוט רוחב, מדף
    const zAt = (y: number) => ez + 0.3 - y * Math.tan(lean);
    b.add(pineM, beam([ex, 0.55, zAt(0.55) + 0.01], [ex, legTop + 0.12, zAt(legTop + 0.12) + 0.01], 0.06, 0.03), 0.6);
    b.add(pineM, place(boxGeo(0.62, 0.04, 0.03), ex, 0.55, zAt(0.55)), 0.6);
    const ledgeY = 0.84;
    b.add(pineM, place(boxGeo(1.25, 0.035, 0.14), ex, ledgeY, zAt(ledgeY) + 0.06), 0.6);
    b.add(pineM, place(boxGeo(1.25, 0.06, 0.02), ex, ledgeY + 0.03, zAt(ledgeY) + 0.13), 0.6);
    b.add(pineM, beam([ex, 0.3, zAt(0.3)], [ex, 0.25, ez - 0.66], 0.03, 0.03), 0.6);
    // הבד
    const cw = 1.55, ch = 1.15;
    const cy = ledgeY + 0.02 + (ch / 2) * Math.cos(lean);
    const cz = zAt(cy) + 0.07;
    const canvasSide = k.mat(k.tex("lb-canvasSide", () => T.noise("#efe8da", 0.06, 3, 600)), "#fff", [1, 1], { bump: 0.3 });
    b.add(canvasSide, place(boxGeo(cw, ch, 0.045), ex, cy, cz, -lean, 0, 0));
    const face = new THREE.PlaneGeometry(cw - 0.01, ch - 0.01);
    face.translate(0, 0, 0.0235);
    k.add(place(face, ex, cy, cz, -lean, 0, 0), k.mat(k.tex("lb-play", L.playCanvas), "#fff", [1, 1], { roughness: 0.75, bump: 0.35 }), [0, 0, 0], { noShadow: true });
    // תפס עליון
    b.add(pineM, place(boxGeo(0.14, 0.07, 0.1), ex, cy + (ch / 2) * Math.cos(lean) + 0.03, zAt(cy + ch / 2) + 0.06, -lean, 0, 0), 0.6);
    k.collider(ex - 0.8, ex + 0.8, ez - 0.8, ez + 0.4, 0, 2.3, true);

    // שולחן צד עם פלטה, מכחולים וצבעים
    const tx = ex + 1.35, tz = ez + 0.15;
    b.add(pineM, place(new THREE.CylinderGeometry(0.32, 0.32, 0.04, 28), tx, 0.72, tz), 0.6);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.3;
      b.add(pineM, beam([tx + Math.cos(a) * 0.3, 0, tz + Math.sin(a) * 0.3], [tx + Math.cos(a) * 0.22, 0.71, tz + Math.sin(a) * 0.22], 0.035, 0.035, true), 0.6);
    }
    b.add(pineM, place(new THREE.TorusGeometry(0.25, 0.012, 6, 24), tx, 0.3, tz, Math.PI / 2, 0, 0), 0.6);
    const palM = k.mat(k.tex("lb-palette", L.palette), "#fff", [1, 1], { roughness: 0.5, bump: 0.2 });
    k.add(new THREE.CylinderGeometry(0.2, 0.2, 0.012, 24), palM, [tx - 0.06, 0.748, tz + 0.05], { scale: [1.2, 1, 0.85], rotY: 0.4 });
    const jarM = k.mat(null, "#c8dde6", [1, 1], { roughness: 0.08, metalness: 0.1 });
    b.add(jarM, place(new THREE.LatheGeometry([[0, 0], [0.055, 0], [0.06, 0.02], [0.058, 0.15], [0.062, 0.16]].map(([r, h]) => new THREE.Vector2(r, h)), 16), tx + 0.14, 0.74, tz - 0.12));
    const bristle = k.mat(null, "#2b2118", [1, 1], {});
    for (let i = 0; i < 5; i++) {
      const a = i * 1.3;
      b.add(i % 2 ? walnutM : k.mat(null, "#b3261e"), beam([tx + 0.14, 0.76, tz - 0.12], [tx + 0.14 + Math.cos(a) * 0.06, 1.02 + i * 0.015, tz - 0.12 + Math.sin(a) * 0.06], 0.012, 0.012, true));
      b.add(bristle, place(new THREE.ConeGeometry(0.009, 0.05, 6), tx + 0.14 + Math.cos(a) * 0.065, 1.05 + i * 0.015, tz - 0.12 + Math.sin(a) * 0.065));
    }
    k.collider(tx - 0.33, tx + 0.33, tz - 0.33, tz + 0.33, 0, 0.74, true);
    // פחיות צבע על הרצפה
    const canCols = ["#e63946", "#1d4e89", "#ffb703", "#2a9d8f"];
    canCols.forEach((c, i) => {
      const x = ex - 1.1 - (i % 2) * 0.36, z = ez + 0.1 + Math.floor(i / 2) * 0.36;
      b.add(steelM, place(new THREE.CylinderGeometry(0.14, 0.14, 0.2, 20), x, 0.1, z));
      b.add(k.mat(null, c, [1, 1], { roughness: 0.3 }), place(new THREE.CylinderGeometry(0.135, 0.135, 0.012, 20), x, 0.206, z));
      b.add(k.mat(null, c, [1, 1], { roughness: 0.3 }), place(new THREE.CylinderGeometry(0.142, 0.142, 0.07, 20, 1, true), x, 0.15, z));
    });
    // בד כיסוי מוכתם מתחת לכן
    k.add(new THREE.PlaneGeometry(3.4, 2.2), k.mat(k.tex("lb-dropcloth", () => T.noise("#e7dfcf", 0.12, 21, 3000)), "#fff", [2, 2], { roughness: 0.95, bump: 0.3 }), [ex, 0.006, ez + 0.2], { rotX: -Math.PI / 2, rotZ: 0.05, noShadow: true });
  }

  // ---------- פסי תאורה בתקרה ----------
  for (const tz of [-5, 5]) {
    b.add(blackM, place(new THREE.BoxGeometry(14, 0.04, 0.05), 0, H - 0.02, tz));
    for (let i = 0; i < 6; i++) {
      const x = -6.25 + i * 2.5;
      const aim = tz < 0 ? 0.6 : -0.6;
      b.add(blackM, place(new THREE.CylinderGeometry(0.06, 0.05, 0.2, 14), x, H - 0.18, tz, aim, 0, 0));
      b.add(lampGlowM, place(new THREE.CircleGeometry(0.045, 14), x, H - 0.28, tz + (tz < 0 ? -0.06 : 0.06), Math.PI / 2 + aim, 0, 0));
    }
  }

  // ---------- צמחים ----------
  const leaves: { pos: [number, number, number]; rotY?: number; rotX?: number; rotZ?: number; scale?: [number, number, number]; color?: string }[] = [];
  const leafCols = ["#2f6b2f", "#3d7f36", "#27572a", "#4b8d3e", "#356f33"];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const plant = (x: number, z: number, kind: "fig" | "snake" | "palm", s = 1, pot = 0) => {
    const pr = 0.3 * s, ph = 0.55 * s;
    b.add(potMats[pot], place(new THREE.LatheGeometry([[0, 0], [pr * 0.78, 0], [pr * 0.85, 0.03], [pr, ph * 0.9], [pr * 1.05, ph], [pr * 0.96, ph]].map(([r, h]) => new THREE.Vector2(r, h)), 28), x, 0, z));
    b.add(soilM, place(new THREE.CircleGeometry(pr * 0.95, 20), x, ph * 0.93, z, -Math.PI / 2, 0, 0));
    k.collider(x - pr, x + pr, z - pr, z + pr, 0, ph, true);
    if (kind === "snake") {
      for (let i = 0; i < 16; i++) {
        const a = rnd() * Math.PI * 2, d = rnd() * pr * 0.6;
        leaves.push({ pos: [x + Math.cos(a) * d, ph + 0.35 * s, z + Math.sin(a) * d], rotY: rnd() * 3, rotX: (rnd() - 0.5) * 0.3, rotZ: (rnd() - 0.5) * 0.3, scale: [0.05 * s, (0.3 + rnd() * 0.25) * s, 0.012], color: leafCols[i % 5] });
      }
      return;
    }
    const trunkH = kind === "fig" ? 1.5 * s : 0.9 * s;
    b.add(stemM, beam([x, ph * 0.9, z], [x + 0.05, ph + trunkH, z - 0.03], 0.05 * s, 0.05, true));
    const n = kind === "fig" ? 46 : 22;
    for (let i = 0; i < n; i++) {
      if (kind === "fig") {
        const a = rnd() * Math.PI * 2, y = ph + trunkH * (0.35 + rnd() * 0.7), rr = (0.15 + rnd() * 0.35) * s * (1.2 - (y - ph) / trunkH * 0.4);
        leaves.push({ pos: [x + Math.cos(a) * rr, y, z + Math.sin(a) * rr], rotY: -a, rotZ: (rnd() - 0.3) * 0.8, rotX: (rnd() - 0.5) * 0.6, scale: [0.16 * s, 0.018, 0.11 * s], color: leafCols[Math.floor(rnd() * 5)] });
      } else {
        const a = (i / n) * Math.PI * 2 + rnd() * 0.3;
        const L2 = (0.55 + rnd() * 0.3) * s;
        const tip: [number, number, number] = [x + Math.cos(a) * L2, ph + trunkH + 0.1 - rnd() * 0.25, z + Math.sin(a) * L2];
        leaves.push({ pos: [(x + tip[0]) / 2, (ph + trunkH + tip[1]) / 2 + 0.05, (z + tip[2]) / 2], rotY: -a, rotZ: -0.25 - rnd() * 0.3, scale: [L2 * 0.55, 0.012, 0.09 * s], color: leafCols[Math.floor(rnd() * 5)] });
      }
    }
  };
  plant(10.1, -8.1, "fig", 1.1, 0);
  plant(10.1, 8.1, "palm", 1.2, 1);
  plant(-10.1, 8.1, "fig", 1.0, 2);
  plant(-3.2, -8.2, "snake", 1.1, 2);
  plant(3.2, -8.2, "snake", 1.1, 2);
  plant(-1.9, 8.25, "palm", 0.9, 0);
  plant(1.9, 8.25, "palm", 0.9, 0);
  plant(-10.1, -2.2 + 2.2, "snake", 0.9, 1);

  // ---------- פינת ישיבה (צפון־מערב) ----------
  const sofa = (x: number, z: number, ry: number, len: number, n: number, fab: Mat) => {
    const f = new Frame(x, z, ry);
    b.add(fab, f.put(boxGeo(len, 0.26, 0.86), 0, 0.09 + 0.13, 0), 0.5);
    for (let i = 0; i < n; i++) {
      const cx = -len / 2 + (len / n) * (i + 0.5);
      b.add(fab, f.put(boxGeo(len / n - 0.02, 0.15, 0.68), cx, 0.35 + 0.075, 0.08), 0.5);
      b.add(fab, f.put(boxGeo(len / n - 0.04, 0.42, 0.17), cx, 0.64, -0.24, -0.14), 0.5);
    }
    b.add(fab, f.put(boxGeo(len + 0.02, 0.52, 0.18), 0, 0.35 + 0.26, -0.35), 0.5);
    for (const s of [-1, 1]) b.add(fab, f.put(boxGeo(0.18, 0.6, 0.86), s * (len / 2 + 0.09), 0.09 + 0.3, 0), 0.5);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(walnutM, f.put(new THREE.CylinderGeometry(0.025, 0.018, 0.09, 10), sx * (len / 2 + 0.12), 0.045, sz * 0.36), 0.4);
    f.box(k, -len / 2 - 0.18, len / 2 + 0.18, -0.25, 0.43, 0, 0.5, true);
    f.box(k, -len / 2 - 0.18, len / 2 + 0.18, -0.44, -0.25, 0, 0.87, true);
  };
  {
    const rugM = k.mat(k.tex("lb-rug", () => L.modernRug("#d8cfbf", "#2c5360", "#b4553b")), "#fff", [1, 1], { roughness: 1, bump: 0.3 });
    k.add(new THREE.BoxGeometry(4.6, 0.012, 3.2), rugM, [-6.6, 0.006, -5.9], { noShadow: true });
    sofa(-6.6, -4.55, Math.PI, 2.1, 3, terraM);
    sofa(-9.35, -6.1, Math.PI / 2, 0.72, 1, mustardM);
    sofa(-3.85, -6.1, -Math.PI / 2, 0.72, 1, mustardM);
    // שולחן קפה עגול
    const cx = -6.6, cz = -6.1;
    b.add(walnutM, place(new THREE.CylinderGeometry(0.62, 0.6, 0.05, 40), cx, 0.42, cz), 0.8);
    b.add(walnutM, place(new THREE.CylinderGeometry(0.5, 0.5, 0.03, 32), cx, 0.14, cz), 0.8);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      b.add(blackM, beam([cx + Math.cos(a) * 0.48, 0, cz + Math.sin(a) * 0.48], [cx + Math.cos(a) * 0.52, 0.4, cz + Math.sin(a) * 0.52], 0.03, 0.03, true));
    }
    k.collider(cx - 0.62, cx + 0.62, cz - 0.62, cz + 0.62, 0, 0.45, true);
    // ספרים וכד
    const bookCols = ["#1d4e89", "#e9c46a", "#b4553b", "#f1faee"];
    bookCols.forEach((c, i) => b.add(k.mat(null, c, [1, 1], { roughness: 0.7 }), place(boxGeo(0.34 - i * 0.03, 0.04, 0.25 - i * 0.02), cx + 0.2, 0.465 + i * 0.041, cz - 0.1, 0, 0.2 * i, 0)));
    b.add(potMats[0], place(new THREE.LatheGeometry([[0, 0], [0.06, 0], [0.1, 0.08], [0.09, 0.18], [0.04, 0.26], [0.045, 0.3]].map(([r, h]) => new THREE.Vector2(r, h)), 24), cx - 0.25, 0.445, cz + 0.15));
    b.add(k.mat(null, "#e8b04a"), place(new THREE.SphereGeometry(0.09, 12, 8), cx - 0.25, 0.8, cz + 0.15));
    b.add(stemM, beam([cx - 0.25, 0.7, cz + 0.15], [cx - 0.25, 0.72, cz + 0.15], 0.01, 0.01, true));
    // readable book covers on the coffee table + a sticky note
    life.flat(life.custom(256, 190, (g, w, h) => { g.fillStyle = "#f1faee"; g.fillRect(0, 0, w, h); g.fillStyle = "#1d4e89"; g.fillRect(0, 0, 18, h); drawChameleon(g, w * 0.6, h * 0.45, 70, "#4cbf4c"); g.fillStyle = "#1d4e89"; g.font = `bold 22px ${SERIF}`; g.fillText("The Art of Hiding", 30, 150); g.font = `italic 16px ${SERIF}`; g.fillText("by Tom Kodner", 30, 176); }), cx + 0.2, 0.609, cz - 0.1, 0.24, 0.6 + Math.PI);
    life.flat(life.note({ text: "Hunters stand on the red pad! - T.K.", color: "#fff27a" }), cx - 0.3, 0.448, cz - 0.25, 0.12, 0.3);
    // מנורת רצפה
    const lx = -9.9, lz = -8.0;
    b.add(blackM, place(new THREE.CylinderGeometry(0.18, 0.2, 0.03, 24), lx, 0.015, lz));
    b.add(brassM, place(new THREE.CylinderGeometry(0.014, 0.014, 1.55, 10), lx, 0.8, lz));
    b.add(shadeM, place(new THREE.LatheGeometry([[0.24, 0], [0.16, 0.3]].map(([r, h]) => new THREE.Vector2(r, h)), 28), lx, 1.45, lz));
    b.add(lampGlowM, place(new THREE.SphereGeometry(0.05, 10, 8), lx, 1.55, lz));
    k.collider(lx - 0.2, lx + 0.2, lz - 0.2, lz + 0.2, 0, 1.75, false);
  }

  // ---------- בית קפה (דרום־מערב) ----------
  const chair = (x: number, z: number, ry: number) => {
    const f = new Frame(x, z, ry);
    b.add(walnutM, f.put(new THREE.CylinderGeometry(0.21, 0.2, 0.04, 24), 0, 0.46, 0), 0.4);
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      b.add(walnutM, f.put(beam([Math.cos(a) * 0.14, 0.44, Math.sin(a) * 0.14], [Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2], 0.03, 0.03, true), 0, 0, 0), 0.4);
    }
    b.add(walnutM, f.put(new THREE.TorusGeometry(0.17, 0.015, 6, 20, Math.PI), 0, 0.72, -0.17, 0, 0, 0), 0.4);
    for (const s of [-1, 1]) b.add(walnutM, f.put(beam([s * 0.17, 0.46, -0.17], [s * 0.17, 0.72, -0.17], 0.03, 0.03, true), 0, 0, 0), 0.4);
    for (const s of [-0.07, 0, 0.07]) b.add(walnutM, f.put(beam([s, 0.48, -0.18], [s, 0.86, -0.18], 0.012, 0.012, true), 0, 0, 0), 0.4);
    b.add(walnutM, f.put(new THREE.TorusGeometry(0.15, 0.008, 5, 18), 0, 0.2, 0, Math.PI / 2, 0, 0), 0.4);
    f.box(k, -0.21, 0.21, -0.21, 0.21, 0, 0.48, true);
  };
  const tentCard = life.plate({ text: "LOBBY CAFE", sub: "espresso 2 - cocoa 3 - Tom's cake 4", style: "white", px: [256, 128] });
  const bistro = (x: number, z: number) => {
    b.add(marbleM, place(new THREE.CylinderGeometry(0.38, 0.38, 0.03, 36), x, 0.745, z), 0.8);
    b.add(ironM, place(new THREE.LatheGeometry([[0.26, 0], [0.26, 0.02], [0.06, 0.06], [0.03, 0.12], [0.025, 0.7], [0.08, 0.73]].map(([r, h]) => new THREE.Vector2(r, h)), 24), x, 0, z));
    k.collider(x - 0.38, x + 0.38, z - 0.38, z + 0.38, 0, 0.76, true);
    const cup = k.mat(null, "#fbfbf8", [1, 1], { roughness: 0.2 });
    b.add(cup, place(new THREE.LatheGeometry([[0.001, 0], [0.03, 0], [0.042, 0.02], [0.045, 0.08], [0.04, 0.08], [0.001, 0.012]].map(([r, h]) => new THREE.Vector2(r, h)), 16), x + 0.1, 0.768, z - 0.05));
    b.add(cup, place(new THREE.TorusGeometry(0.022, 0.006, 6, 12), x + 0.148, 0.81, z - 0.05));
    b.add(k.mat(null, "#4a2a14", [1, 1], { roughness: 0.15 }), place(new THREE.CircleGeometry(0.04, 14), x + 0.1, 0.835, z - 0.05, -Math.PI / 2, 0, 0));
    life.put(tentCard, x - 0.12, 0.8, z + 0.02, 0.12, { rx: -0.3, ry: 0.4 });
    life.put(tentCard, x - 0.12 - 0.035, 0.8, z + 0.02 - 0.03, 0.12, { rx: -0.3, ry: 0.4 + Math.PI });
    b.add(cup, place(new THREE.CylinderGeometry(0.07, 0.07, 0.008, 18), x + 0.1, 0.764, z - 0.05));
  };
  bistro(-7.4, 4.4);
  chair(-7.4, 5.05, Math.PI);
  chair(-7.4, 3.75, 0);
  chair(-8.05, 4.4, Math.PI / 2);
  bistro(-5.2, 6.3);
  chair(-5.85, 6.3, Math.PI / 2);
  chair(-4.55, 6.3, -Math.PI / 2);
  chair(-5.2, 5.65, 0);

  // ---------- ספסלי גלריה ----------
  const bench = (x: number, z: number, ry: number, len = 2.2) => {
    const f = new Frame(x, z, ry);
    b.add(leatherM, f.put(boxGeo(len, 0.1, 0.5), 0, 0.4, 0), 0.6);
    b.add(walnutM, f.put(boxGeo(len + 0.04, 0.04, 0.54), 0, 0.37, 0), 0.8);
    for (const s of [-1, 1]) {
      b.add(walnutM, f.put(boxGeo(0.06, 0.37, 0.48), s * (len / 2 - 0.15), 0.185, 0), 0.8);
    }
    b.add(walnutM, f.put(boxGeo(len - 0.3, 0.04, 0.06), 0, 0.12, 0), 0.8);
    f.box(k, -len / 2, len / 2, -0.27, 0.27, 0, 0.5, true);
  };
  bench(-6.6, 0, Math.PI / 2);
  bench(6.6, 0, Math.PI / 2);
  bench(-1.9, 6.3, 0, 2.0);
  bench(1.9, 6.3, 0, 2.0);

  // ---------- פסלים על כנים (דרום־מזרח) ----------
  const plinth = (x: number, z: number, w: number, h: number, m: Mat) => {
    b.add(m, place(boxGeo(w, h, w), x, h / 2, z), 1);
    b.add(m, place(boxGeo(w + 0.06, 0.06, w + 0.06), x, 0.03, z), 1);
    k.collider(x - w / 2, x + w / 2, z - w / 2, z + w / 2, 0, h, true);
  };
  plinth(5.4, 4.6, 0.7, 1.0, whiteM);
  k.add(new THREE.TorusKnotGeometry(0.26, 0.08, 120, 16), mirrorM, [5.4, 1.42, 4.6], { rotY: 0.5 });
  plinth(7.6, 5.6, 0.6, 1.15, k.mat(null, "#232325", [1, 1], { roughness: 0.6 }));
  k.lathe([[0, 0], [0.16, 0], [0.18, 0.05], [0.1, 0.12], [0.07, 0.22], [0.19, 0.42], [0.22, 0.52], [0.15, 0.7], [0.05, 0.76], [0, 0.76]], 7.6, 1.15, 5.6, marbleM);
  plinth(4.6, 6.9, 0.55, 0.8, marbleM);
  k.add(new THREE.SphereGeometry(0.3, 32, 20), k.mat(null, "#b07a3a", [1, 1], { metalness: 0.85, roughness: 0.4 }), [4.6, 1.1, 6.9]);
  plinth(8.8, 3.9, 0.5, 0.9, k.mat(null, "#6fa8c8", [1, 1], { roughness: 0.3 }));
  k.add(new THREE.IcosahedronGeometry(0.28, 0), k.mat(null, "#f1c453", [1, 1], { roughness: 0.25 }), [8.8, 1.2, 3.9], { rotY: 0.3 });

  // ---------- אזור אימון צבעים (צפון־מזרח): קוביות, גלילים, מראת מתכת ----------
  {
    const glossy = (c: string) => k.mat(null, c, [1, 1], { roughness: 0.18 });
    const matte = (c: string) => k.mat(null, c, [1, 1], { roughness: 0.95 });
    k.seat(1.0, 1.0, 1.0, 5.2, 0, -6.3, glossy("#d62839"));
    k.add(boxGeo(0.6, 0.6, 0.6), matte("#f4c430"), [5.15, 1.3, -6.25], { rotY: 0.35 });
    k.collider(4.85, 5.45, -6.55, -5.95, 1.0, 1.6, true);
    k.cyl(0.42, 0.42, 0.9, 6.5, 0, -5.3, glossy("#1f5fbf"), true, 32);
    k.seat(0.8, 0.8, 0.8, 7.7, 0, -6.6, matte("#3a9d5d"));
    k.add(new THREE.SphereGeometry(0.42, 32, 20), matte("#8e5bd6"), [4.3, 0.42, -4.7]);
    k.collider(3.9, 4.7, -5.1, -4.3, 0, 0.84, true);
    k.seat(0.7, 0.7, 0.7, 8.9, 0, -5.3, k.mat(k.tex("lb-check", () => T.checker("#111111", "#f4f4f4", 4)), "#fff", [1, 1], { roughness: 0.4, bump: 0.1 }));
    k.add(new THREE.CylinderGeometry(0.3, 0.3, 1.3, 32), k.mat(k.tex("lb-stripe", () => T.stripes(["#ff6fa4", "#fff0f5"], false)), "#fff", [1, 2], { roughness: 0.5, bump: 0.1 }), [7.3, 0.65, -4.2], { solid: true });
    k.seat(0.75, 0.75, 0.75, 8.5, 0, -7.8, k.mat(k.tex("crate", T.crate), "#fff", [1, 1], { bump: 0.8 }));
    const tri = new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0, 0.7)]);
    k.extrude(tri, 0.7, 6.3, 0, -7.6, glossy("#f07b22"), { bevel: 0.02 });
    k.collider(5.8, 6.8, -7.95, -7.25, 0, 0.7, true);
    // לוח מתכת מלוטש על רגליות
    const mx = 3.7, mz = -6.4, mr = -0.45;
    const f = new Frame(mx, mz, mr);
    k.add(f.put(boxGeo(1.3, 2.3, 0.05), 0, 1.3, 0), mirrorM, [0, 0, 0]);
    b.add(steelM, f.put(boxGeo(1.36, 0.05, 0.08), 0, 2.47, 0));
    b.add(steelM, f.put(boxGeo(1.36, 0.05, 0.08), 0, 0.13, 0));
    for (const s of [-1, 1]) b.add(steelM, f.put(boxGeo(0.08, 0.04, 0.5), s * 0.55, 0.02, 0));
    for (const s of [-1, 1]) b.add(steelM, f.put(boxGeo(0.05, 2.4, 0.07), s * 0.67, 1.3, 0));
    f.box(k, -0.7, 0.7, -0.25, 0.25, 0, 2.5, true);
  }

  // ---------- עלים (מופע אחד) ----------
  k.instances(new THREE.SphereGeometry(1, 10, 6), leafM, leaves);
  // ---------- LIFE: credits, welcome poster ----------
  life.wall(life.poster({ title: "MECCHA", sub: "CHAMELEON", body: "paint yourself - hide - survive\na game by Tom Kodner", bg: "#1d2a33", fg: "#ffffff", accent: "#e76f51", style: "retro", art: (g, w, h) => drawChameleon(g, w * 0.5, h * 0.6, h * 0.9, "#4cbf4c"), wear: 0 }), -2.4, 1.75, IN.s - 0.012, 0.8, Math.PI);
  life.wall(life.plate({ text: "Tom Kodner", sub: "creator & chief hider", style: "brass", px: [320, 110] }), 2.4, 1.6, IN.s - 0.012, 0.6, Math.PI);
  life.wall(life.poster({ title: "HOW TO PLAY", body: "1. Hiders: grab the paint and match the walls.\n2. Hunters: wait on the red pad, then seek.\n3. Freeze! Moving gives you away.\n4. Last one found wins.", bg: "#fbf7ea", fg: "#2a1d10", accent: "#e76f51", style: "notice", wear: 0 }), 2.4, 2.35, IN.s - 0.012, 0.5, Math.PI);
  life.finish();
  b.flush(k);

  // ---------- נקודות הופעה ----------
  const hiders = [...ring(0, 0, 4.2, 12), ...ring(0, 0, 5.4, 12).map((v) => v.applyAxisAngle(new V3(0, 1, 0), Math.PI / 12))];
  // ---------- כתמי צבע שפוכים על הקירות והרצפה + פחי צבע (סטודיו ציור, כמו האווירה של המשחק) ----------
  {
    const COLS = ["#ff3d7f", "#ffb700", "#3ec7ff", "#7cf23a", "#ff6a00", "#b04dff", "#ffffff", "#1d6bff"];
    const sm = COLS.map((c, i) => k.mat(k.tex("lb-splat" + i, () => L.splat(c, i + 1)), "#fff", [1, 1], { transparent: true, bump: 0, roughness: 0.3 }));
    let q = 3;
    const rnd = () => ((q = (q * 16807) % 2147483647) / 2147483647);
    // על הקירות (צפון/דרום/מערב), מעל הלוחות
    const wallSpots: [number, number, number, number][] = [
      [-8.5, 1.2, IN.n + 0.02, 0], [-3.2, 3.9, IN.n + 0.02, 0], [4.8, 1.0, IN.n + 0.02, 0], [8.9, 3.6, IN.n + 0.02, 0],
      [-7.4, 3.8, IN.s - 0.02, Math.PI], [-1.8, 0.9, IN.s - 0.02, Math.PI], [3.6, 4.0, IN.s - 0.02, Math.PI], [9.2, 1.3, IN.s - 0.02, Math.PI],
      [IN.w + 0.02, 3.9, -5.5, Math.PI / 2], [IN.w + 0.02, 1.1, 1.8, Math.PI / 2], [IN.w + 0.02, 4.1, 6.4, Math.PI / 2],
    ];
    wallSpots.forEach(([x, y, z, ry], i) => { const sz = 0.9 + rnd() * 1.1; k.panel(sz, sz, x, y, z, sm[i % sm.length], ry); });
    // על הרצפה (לא על המשטח האדום ולא מול הכן)
    for (let i = 0; i < 16; i++) {
      const x = (rnd() - 0.5) * 20, z = (rnd() - 0.5) * 16;
      if (Math.hypot(x, z) < padR + 0.6 || (Math.abs(x) < 1.6 && z < -4.6)) continue;
      const sz = 0.5 + rnd() * 1.0;
      k.add(new THREE.PlaneGeometry(sz, sz), sm[i % sm.length], [x, 0.006 + i * 0.0004, z], { rotX: -Math.PI / 2, noShadow: true });
    }
    // פחי צבע פתוחים, עם שפיכה מתחתיהם
    const tinM = k.mat(null, "#c9ccd0", [1, 1], { metalness: 0.85, roughness: 0.35 });
    const cans: [number, number, number][] = [[-9.6, -7.6, 0], [-9.0, -7.9, 2], [-9.9, -7.0, 3], [9.4, 7.6, 1], [8.8, 7.9, 5], [-9.7, 7.5, 7], [-9.1, 7.8, 4], [2.2, -7.9, 6]];
    for (const [x, z, c] of cans) {
      k.add(new THREE.CylinderGeometry(0.16, 0.16, 0.24, 24), tinM, [x, 0.12, z], { solid: false });
      k.add(new THREE.CircleGeometry(0.15, 24), k.mat(null, COLS[c], [1, 1], { roughness: 0.25 }), [x, 0.241, z], { rotX: -Math.PI / 2, noShadow: true });
      k.add(new THREE.TorusGeometry(0.155, 0.012, 6, 24), tinM, [x, 0.24, z], { rotX: Math.PI / 2, noShadow: true });
    }
    k.collider(-10.2, -8.6, -8.3, -6.6, 0, 0.26, true);
    k.collider(8.4, 9.8, 7.2, 8.3, 0, 0.26, true);
    k.collider(-10.2, -8.6, 7.1, 8.3, 0, 0.26, true);
  }

  return k.finish({
    id: "lobby", name: "Lobby",
    bounds: { minX: -10.8, maxX: 10.8, minZ: -8.8, maxZ: 8.8 },
    hunterSpawns: ring(0, 0, 3.0, 9),
    hiderSpawns: hiders,
    lobby: { play: new THREE.Vector3(ex, 0, ez + 1.25), pad: { x: 0, z: 0, r: padR } },
    preview: { pos: [9.2, 3.1, 7.6], look: [-1.5, 1.2, -3.5], fov: 62 },
    lighting: {
      sky: "#dfe9f2",
      hemi: ["#fdf6ec", "#b89a7a", 0.38],
      sun: { color: "#fff0d8", int: 3.2, pos: [16, 20, -5] },
      points: [
        { pos: [0, 3.4, -5.0], color: "#ffe2b8", int: 9, dist: 9 },
        { pos: [-9.9, 1.6, -7.9], color: "#ffcf8a", int: 4, dist: 6 },
        { pos: [-6, 4.3, 4], color: "#ffe7c4", int: 10, dist: 14 },
        { pos: [6, 4.3, 4], color: "#ffe7c4", int: 10, dist: 14 },
        { pos: [-5, 4.3, -5], color: "#ffe7c4", int: 8, dist: 12 },
        { pos: [6, 4.3, -5], color: "#fff4e6", int: 8, dist: 12 },
      ],
      exposure: 1.0,
      env: 0.48,
      hdri: "lobby",
    },
  });
}
