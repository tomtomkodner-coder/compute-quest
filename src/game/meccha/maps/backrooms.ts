// Backrooms (バックルーム) — "Level 0": מבוך משרדי ליминלי. טפט צהוב חד־גוני עם דוגמה, שטיח צהוב־חום לח,
// תקרה אקוסטית עם גופי פלורסנט בוהקים ואחידים, מסדרונות וחדרים חוזרים עם פתחים לא סדירים ועמודים.
// כל אזור מכיל סוג אחד של חפץ: חדר אסלות, יער תמרורים, אופניים על הקירות, ערימות כיסאות פלסטיק,
// שורת מכונות משקאות, ושלטי EXIT אדומים זוהרים. הציידים מופיעים באולם המערבי (קצה המבוך).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Kit, grid, type Mat, type World } from "./kit";
import * as BT from "./tex/backrooms";
import { Life, HAND } from "./tex/life";

type V3 = [number, number, number];

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// ---------- כלי גיאומטריה ----------
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
function xf<G extends THREE.BufferGeometry>(geo: G, pos: V3 = [0, 0, 0], rot: V3 = [0, 0, 0], scale: V3 = [1, 1, 1]): G {
  _e.set(rot[0], rot[1], rot[2]);
  _q.setFromEuler(_e);
  _m.compose(_v.set(...pos), _q, _s.set(...scale));
  geo.applyMatrix4(_m);
  return geo;
}
/** גליל בין שתי נקודות */
function rod(a: V3, b: V3, r: number, seg = 8, rTop = r) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const g = new THREE.CylinderGeometry(rTop, r, A.distanceTo(B), seg, 1);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(A.add(B).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
  return g;
}
/** איחוד גיאומטריות לגיאומטריה אחת (לשימוש ב־instances) */
function mergeAll(geos: THREE.BufferGeometry[]) {
  const clean = geos.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(n.attributes)) if (!["position", "normal", "uv"].includes(k)) n.deleteAttribute(k);
    if (!n.attributes.uv) n.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2));
    return n;
  });
  return mergeGeometries(clean, false)!;
}
/** קופסה עם UV בקנה מידה עולמי (unit מטר לחזרה) — כדי לאחד קירות רבים לרשת אחת; y = תחתית */
function ubox(w: number, h: number, d: number, x: number, y: number, z: number, unit: number, ou = 0, ov = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let f = 0; f < 6; f++) {
    const [su, sv] = f < 2 ? [d, h] : f < 4 ? [w, d] : [w, h];
    for (let i = 0; i < 4; i++) { const j = f * 4 + i; uv.setXY(j, uv.getX(j) * su / unit + ou, uv.getY(j) * sv / unit + ov); }
  }
  g.translate(x, y + h / 2, z);
  return g;
}

export function buildBackrooms(): World {
  const H = 3.0; // גובה תקרה אקוסטית
  const T = 0.24; // עובי קיר
  const k = new Kit(H, 2.35);
  const R = rng(1234);

  // ---------- חומרים ----------
  const wallpaper = k.mat(k.tex("br-wall", BT.brWallpaper), "#ffffff", [1, 1], { roughness: 0.88, bump: 0.35 });
  const carpet = k.mat(k.tex("br-carpet", BT.brCarpet), "#ffffff", [1, 1], { roughness: 0.97, bump: 0.9 });
  const ceilMat = k.mat(k.tex("br-ceil", BT.brCeiling), "#ffffff", [1, 1], { roughness: 0.95, bump: 0.22 });
  const trim = k.mat(null, "#d9cfae", [1, 1], { roughness: 0.55 });
  const stainMat = k.mat(k.tex("br-stain", BT.brStain), "#ffffff", [1, 1], { transparent: true, roughness: 1, bump: 0 });
  stainMat.m.alphaTest = 0;
  stainMat.m.depthWrite = false;
  stainMat.m.polygonOffset = true;
  stainMat.m.polygonOffsetFactor = -2;

  // ---------- רצפה ותקרה ----------
  const X1 = -20, X2 = 20, Z1 = -16, Z2 = 16;
  k.add(ubox(40.8, 0.2, 32.4, 0, -0.2, 0, 2.6), carpet, [0, 0, 0], { noShadow: true });
  k.add(ubox(40.8, 0.2, 32.4, 0, H + 0.002, 0, 2.4), ceilMat, [0, 0, 0], { noShadow: true });

  // ---------- קירות (מאוחדים לרשת אחת) ----------
  const wallGeos: THREE.BufferGeometry[] = [];
  const trimGeos: THREE.BufferGeometry[] = [];
  const segs: { axis: "x" | "z"; c: number; a1: number; a2: number }[] = [];
  const allSegs: { axis: "x" | "z"; c: number; a1: number; a2: number }[] = [];
  const addSeg = (axis: "x" | "z", c: number, a1: number, a2: number, y0 = 0, y1 = H) => {
    const len = a2 - a1, mid = (a1 + a2) / 2, h = y1 - y0;
    if (len < 0.02) return;
    allSegs.push({ axis, c, a1, a2 });
    if (axis === "x") {
      wallGeos.push(ubox(len, h, T, mid, y0, c, 1.0, a1, y0));
      k.collider(a1, a2, c - T / 2, c + T / 2, y0, y1, false);
    } else {
      wallGeos.push(ubox(T, h, len, c, y0, mid, 1.0, a1, y0));
      k.collider(c - T / 2, c + T / 2, a1, a2, y0, y1, false);
    }
    if (y0 === 0) {
      // פנלים (שיפולים) משני הצדדים
      for (const s of [-1, 1]) {
        if (axis === "x") trimGeos.push(ubox(len, 0.1, 0.018, mid, 0, c + s * (T / 2 + 0.009), 1));
        else trimGeos.push(ubox(0.018, 0.1, len, c + s * (T / 2 + 0.009), 0, mid, 1));
      }
      segs.push({ axis, c, a1, a2 });
    }
  };
  /** קיר עם פתחים: [מרכז, רוחב, גובה משקוף (ברירת מחדל 2.35; >=H = פתח עד התקרה)] */
  const wall = (axis: "x" | "z", c: number, a1: number, a2: number, open: [number, number, number?][] = []) => {
    let cur = a1;
    for (const [oc, ow, top = 2.35] of [...open].sort((a, b) => a[0] - b[0])) {
      addSeg(axis, c, cur, oc - ow / 2);
      if (top < H) addSeg(axis, c, oc - ow / 2, oc + ow / 2, top, H);
      cur = oc + ow / 2;
    }
    addSeg(axis, c, cur, a2);
  };
  const pillars: [number, number, number][] = [];
  const pillar = (x: number, z: number, s = 0.7) => {
    wallGeos.push(ubox(s, H, s, x, 0, z, 1.0, x, 0));
    k.collider(x - s / 2, x + s / 2, z - s / 2, z + s / 2, 0, H, false);
    trimGeos.push(ubox(s + 0.036, 0.1, s + 0.036, x, 0, z, 1));
    pillars.push([x, z, s]);
  };

  // מסגרת חיצונית
  wall("x", Z1, X1 - T / 2, X2 + T / 2);
  wall("x", Z2, X1 - T / 2, X2 + T / 2);
  wall("z", X1, Z1, Z2);
  wall("z", X2, Z1, Z2);
  // קירות פנימיים עם פתחים לא סדירים
  wall("x", -5, X1, X2, [[-15, 1.8], [-8.5, 1.4], [-1, 3.2, H], [8, 2.0], [14, 1.6, 2.6]]);
  wall("x", 5, X1, X2, [[-16, 2.0], [-7, 2.4, 2.6], [3, 4.2, H], [15, 2.2]]);
  wall("z", -10, -5, 5, [[-3.8, 1.2], [0.5, 3.0, 2.6]]);
  wall("z", -7, Z1, -5, [[-11, 1.8]]);
  wall("z", 5, Z1, -5, [[-13.6, 1.4, H], [-8, 2.4]]);
  wall("z", 10, -5, 5, [[-1.5, 2.4], [3.3, 1.2]]);
  wall("z", -4, 5, Z2, [[8.3, 2.0], [13.6, 1.6]]);
  wall("x", 9, -18, -4, [[-11, 1.6]]);
  wall("x", -10.5, 8, X2, [[15, 1.8]]);
  // מחיצות משרד חופשיות (יוצרות פינות ומבוי סתום)
  wall("z", -1, Z1, -11.2);
  wall("x", -8.6, -4.4, 2.2);
  wall("x", 11.2, 6.5, 12.5);
  // עמודים
  pillar(-13, -2.6); pillar(-13, 2.6);
  for (const [x, z] of [[-5.6, -2.6], [-5.6, 2.6], [5.6, -2.6], [5.6, 2.6]]) pillar(x, z);
  pillar(2.2, -13.2); pillar(-4.2, -12.6, 0.6);
  for (const x of [-17.6, -14.8, -12, -9.2, -6.4]) for (const z of [11.2, 13.8]) pillar(x + (z > 12 ? 1.4 : 0), z, 0.6);
  pillar(16, 12.8, 0.6);

  k.merged(wallGeos, wallpaper, { noShadow: true });
  k.merged(trimGeos, trim, { noShadow: true });

  // כתמי רטיבות על השטיח
  const stainGeos: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 26; i++) {
    const s = 1 + R() * 2.4;
    stainGeos.push(xf(new THREE.PlaneGeometry(s, s * (0.6 + R() * 0.6)), [X1 + 1 + R() * 38, 0.004, Z1 + 1 + R() * 30], [-Math.PI / 2, 0, R() * 6]));
  }
  k.merged(stainGeos, stainMat, { noShadow: true });

  // ---------- גופי פלורסנט בתקרה ----------
  const nearWall = (x: number, z: number, hx: number, hz: number) =>
    allSegs.some((s) => (s.axis === "x"
      ? Math.abs(z - s.c) < hz + T / 2 + 0.15 && x + hx > s.a1 && x - hx < s.a2
      : Math.abs(x - s.c) < hx + T / 2 + 0.15 && z + hz > s.a1 && z - hz < s.a2)) ||
    pillars.some(([px, pz, ps]) => Math.abs(x - px) < hx + ps / 2 + 0.1 && Math.abs(z - pz) < hz + ps / 2 + 0.1);
  const lightOn: { pos: V3 }[] = [];
  const lightOff: { pos: V3 }[] = [];
  for (let x = -18; x <= 18.1; x += 2.4)
    for (let z = -14.1; z <= 15; z += 2.4) {
      if (nearWall(x, z, 0.62, 0.32)) continue;
      (R() < 0.05 ? lightOff : lightOn).push({ pos: [x, H - 0.006, z] });
    }
  const diffGeo = xf(new THREE.PlaneGeometry(1.16, 0.56), [0, 0, 0], [Math.PI / 2, 0, 0]);
  const frameGeo = mergeAll([xf(new THREE.BoxGeometry(1.24, 0.028, 0.035), [0, 0, 0.3]), xf(new THREE.BoxGeometry(1.24, 0.028, 0.035), [0, 0, -0.3]), xf(new THREE.BoxGeometry(0.035, 0.028, 0.6), [0.605, 0, 0]), xf(new THREE.BoxGeometry(0.035, 0.028, 0.6), [-0.605, 0, 0])]);
  const diffuser = k.mat(k.tex("br-diff", BT.brDiffuser), "#ffffff", [1, 1], { emissive: "#fff6dc", emissiveIntensity: 2.6, roughness: 0.4, bump: 0 });
  const deadDiff = k.mat(k.tex("br-diff", BT.brDiffuser), "#9c9885", [1, 1], { roughness: 0.4, bump: 0 });
  const troffer = k.mat(null, "#ecebe4", [1, 1], { roughness: 0.4, metalness: 0.3 });
  k.instances(diffGeo, diffuser, lightOn, { noShadow: true });
  if (lightOff.length) k.instances(diffGeo, deadDiff, lightOff, { noShadow: true });
  k.instances(frameGeo, troffer, [...lightOn, ...lightOff].map((l) => ({ pos: [l.pos[0], H - 0.014, l.pos[2]] as V3 })), { noShadow: true });
  // פתחי מיזוג אוויר
  const ventTex = k.mat(null, "#c9c6b8", [1, 1], { roughness: 0.5, metalness: 0.4 });
  const ventGeo = mergeAll([new THREE.BoxGeometry(0.58, 0.02, 0.58), ...[-0.18, -0.06, 0.06, 0.18].map((o) => xf(new THREE.BoxGeometry(0.5, 0.03, 0.02), [0, -0.015, o]))]);
  const vents: { pos: V3 }[] = [];
  for (const [x, z] of [[-16.8, -12], [-3, 0], [12, -13.2], [-11.4, 7.2], [7.8, 13.2], [15.6, 0.6], [-18, 0], [-3.6, -10.8], [3.6, 7.2]]) vents.push({ pos: [x, H - 0.01, z] });
  k.instances(ventGeo, ventTex, vents, { noShadow: true });

  // ---------- חדר האסלות ----------
  {
    const porcelain = k.mat(null, "#f7f6f1", [1, 1], { roughness: 0.12, metalness: 0 });
    const chrome = k.mat(null, "#d6d9dc", [1, 1], { roughness: 0.18, metalness: 1 });
    const water = k.mat(null, "#9fc4c9", [1, 1], { roughness: 0.05, metalness: 0.1 });
    // קערה: גוף סיבוב מוארך (בסיס מתרחב, קערה, שפה ופנים)
    const bowl = new THREE.LatheGeometry([
      [0.125, 0], [0.135, 0.015], [0.118, 0.04], [0.1, 0.1], [0.105, 0.18], [0.13, 0.26], [0.165, 0.33], [0.186, 0.375], [0.192, 0.398],
      [0.185, 0.41], [0.168, 0.405], [0.15, 0.37], [0.11, 0.3], [0.05, 0.25], [0.0, 0.24],
    ].map(([r, h]) => new THREE.Vector2(r, h)), 32);
    xf(bowl, [0, 0, 0.1], [0, 0, 0], [1, 1, 1.3]);
    const seat = xf(new THREE.TorusGeometry(0.155, 0.024, 8, 32), [0, 0.425, 0.11], [Math.PI / 2, 0, 0], [1, 1.3, 0.55]);
    const lid = xf(xf(new THREE.CylinderGeometry(0.18, 0.18, 0.022, 32), [0, 0, 0], [0, 0, 0], [1, 1, 1.28]), [0, 0.66, -0.1], [Math.PI / 2 - 0.2, 0, 0]);
    const neck = new RoundedBoxGeometry(0.24, 0.36, 0.24, 2, 0.05); xf(neck, [0, 0.2, -0.12]);
    const tank = new RoundedBoxGeometry(0.46, 0.38, 0.19, 3, 0.04); xf(tank, [0, 0.6, -0.235]);
    const tankLid = new RoundedBoxGeometry(0.49, 0.04, 0.22, 2, 0.015); xf(tankLid, [0, 0.81, -0.235]);
    const toiletGeo = mergeAll([bowl, seat, lid, neck, tank, tankLid]);
    const handleGeo = mergeAll([xf(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 12), [0.17, 0.74, -0.135], [Math.PI / 2, 0, 0]), rod([0.17, 0.74, -0.125], [0.1, 0.735, -0.12], 0.008)]);
    const waterGeo = xf(new THREE.CircleGeometry(0.12, 24), [0, 0.33, 0.1], [-Math.PI / 2, 0, 0], [1, 1.3, 1]);
    xf(waterGeo, [0, 0, 0], [0, 0, 0], [1, 1, 1]);
    const list: { pos: V3; rotY: number }[] = [];
    const cols = [-18.6, -16.8, -15.0, -13.2, -11.4, -9.6];
    const rows = [-15.45, -12.9, -10.4, -7.9];
    rows.forEach((z, ri) => cols.forEach((x, ci) => {
      if ((ri === 1 && ci === 4) || (ri === 3 && ci === 1) || (ri === 2 && ci === 5)) return; // חסרות — הרגשה לא סדירה
      const odd = (ri === 2 && ci === 2) || (ri === 0 && ci === 5);
      const rotY = odd ? (ri === 2 ? 0.5 : -0.35) : 0;
      list.push({ pos: [x, 0, z], rotY });
      const c = Math.cos(rotY), s = Math.sin(rotY);
      // מתנגש: מיכל (גבוה) + קערה (נמוכה, אפשר לדרוך)
      const tz = z - 0.23 * c, tx = x - 0.23 * s;
      k.collider(tx - 0.26, tx + 0.26, tz - 0.14, tz + 0.14, 0, 0.83, true);
      const bz = z + 0.12 * c, bx = x + 0.12 * s;
      k.collider(bx - 0.19, bx + 0.19, bz - 0.24, bz + 0.24, 0, 0.42, true);
    }));
    k.instances(toiletGeo, porcelain, list);
    k.instances(handleGeo, chrome, list, { noShadow: true });
    k.instances(waterGeo, water, list, { noShadow: true });
    k.room("Toilet Room", X1, -7, Z1, -5);
  }

  // ---------- מכונות משקאות ----------
  {
    const bodyGeo = new RoundedBoxGeometry(0.92, 1.86, 0.8, 3, 0.03);
    bodyGeo.translate(0, 0.93, 0);
    const frontGeo = new THREE.PlaneGeometry(0.84, 1.76); frontGeo.translate(0, 0.95, 0.402);
    const body = k.mat(null, "#ffffff", [1, 1], { roughness: 0.35, metalness: 0.25 });
    const drinks = k.mat(k.tex("br-vend-d", () => BT.brVendFront("drinks")), "#ffffff", [1, 1], { roughness: 0.15, emissive: "#ffffff", emissiveIntensity: 0.9, bump: 0 });
    const snacks = k.mat(k.tex("br-vend-s", () => BT.brVendFront("snacks")), "#ffffff", [1, 1], { roughness: 0.15, emissive: "#ffffff", emissiveIntensity: 0.9, bump: 0 });
    const bodyCols = ["#c62828", "#1e4fa3", "#eceff1", "#c62828", "#263238", "#1e4fa3", "#eceff1", "#2e7d32"];
    const all: { pos: V3; rotY: number; color: string }[] = [];
    const d: { pos: V3; rotY: number }[] = [], s: { pos: V3; rotY: number }[] = [];
    const place = (x: number, z: number, rotY: number, i: number) => {
      const it = { pos: [x, 0, z] as V3, rotY, color: bodyCols[i % bodyCols.length] };
      all.push(it);
      (i % 4 === 2 ? s : d).push(it);
      const hx = Math.abs(Math.sin(rotY)) > 0.5 ? 0.4 : 0.46, hz = Math.abs(Math.sin(rotY)) > 0.5 ? 0.46 : 0.4;
      k.collider(x - hx, x + hx, z - hz, z + hz, 0, 1.86, true);
    };
    let i = 0;
    for (let x = 6.0; x <= 19.2; x += 0.96) place(x, Z1 + T / 2 + 0.42, 0, i++);
    for (const x of [9.0, 9.96, 10.92, 11.88, 12.84]) place(x, -10.5 - T / 2 - 0.42, Math.PI, i++);
    for (const z of [-9.4, -8.44, -7.48, -6.52]) place(X2 - T / 2 - 0.42, z, -Math.PI / 2, i++);
    k.instances(bodyGeo, body, all);
    k.instances(frontGeo, drinks, d, { noShadow: true });
    k.instances(frontGeo, snacks, s, { noShadow: true });
    k.room("Vending Machines", 5, X2, Z1, -5);
  }

  // ---------- כיסאות פלסטיק מוערמים ----------
  {
    const seat = new THREE.Shape();
    const rr = 0.06, sw = 0.23, sd = 0.22;
    seat.moveTo(-sw + rr, -sd); seat.lineTo(sw - rr, -sd); seat.quadraticCurveTo(sw, -sd, sw, -sd + rr); seat.lineTo(sw, sd - rr);
    seat.quadraticCurveTo(sw, sd, sw - rr, sd); seat.lineTo(-sw + rr, sd); seat.quadraticCurveTo(-sw, sd, -sw, sd - rr); seat.lineTo(-sw, -sd + rr);
    seat.quadraticCurveTo(-sw, -sd, -sw + rr, -sd);
    const seatGeo = xf(new THREE.ExtrudeGeometry(seat, { depth: 0.03, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.01, bevelSegments: 1, curveSegments: 4 }), [0, 0.45, 0], [Math.PI / 2, 0, 0]);
    // משענת עם חריצים
    const back = new THREE.Shape();
    back.moveTo(-0.22, 0); back.lineTo(0.22, 0); back.lineTo(0.235, 0.3); back.quadraticCurveTo(0.24, 0.4, 0.12, 0.41); back.lineTo(-0.12, 0.41);
    back.quadraticCurveTo(-0.24, 0.4, -0.235, 0.3); back.lineTo(-0.22, 0);
    for (let j = 0; j < 3; j++) {
      const hy = 0.12 + j * 0.085, hole = new THREE.Path();
      hole.moveTo(-0.15, hy); hole.lineTo(0.15, hy); hole.lineTo(0.15, hy + 0.035); hole.lineTo(-0.15, hy + 0.035); hole.lineTo(-0.15, hy);
      back.holes.push(hole);
    }
    const backGeo = xf(new THREE.ExtrudeGeometry(back, { depth: 0.025, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 1, curveSegments: 4 }), [0, 0.46, -0.215], [-0.2, 0, 0]);
    const parts: THREE.BufferGeometry[] = [seatGeo, backGeo];
    for (const sx of [-1, 1]) {
      parts.push(xf(rod([sx * 0.21, 0.44, 0.18], [sx * 0.25, 0, 0.24], 0.024, 8, 0.03), [0, 0, 0], [0, 0, 0], [1, 1, 1]));
      parts.push(rod([sx * 0.215, 0.46, -0.2], [sx * 0.25, 0, -0.27], 0.024, 8, 0.03));
      // משענת יד
      const arm = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
        new THREE.Vector3(sx * 0.225, 0.78, -0.27), new THREE.Vector3(sx * 0.235, 0.64, -0.12), new THREE.Vector3(sx * 0.235, 0.63, 0.1), new THREE.Vector3(sx * 0.215, 0.46, 0.19),
      ]), 10, 0.018, 5);
      parts.push(arm);
    }
    const chairGeo = mergeAll(parts);
    const chairMat = k.mat(null, "#ffffff", [1, 1], { roughness: 0.42, metalness: 0 });
    const list: { pos: V3; rotY: number; color: string }[] = [];
    const stack = (x: number, z: number, n: number, rotY: number, color: string) => {
      for (let j = 0; j < n; j++) list.push({ pos: [x - Math.sin(rotY) * j * 0.018, j * 0.075, z - Math.cos(rotY) * j * 0.018], rotY, color });
      const top = 0.8 + (n - 1) * 0.075;
      k.collider(x - 0.3, x + 0.3, z - 0.32, z + 0.3, 0, top, true);
    };
    const white = "#f1f0ea", cream = "#e6e2d3";
    // לאורך הקיר המזרחי
    stack(19.3, -4.2, 9, -Math.PI / 2, white); stack(19.3, -3.45, 7, -Math.PI / 2, white); stack(19.3, -2.7, 8, -Math.PI / 2, cream);
    stack(19.3, -0.9, 6, -Math.PI / 2, "#2f7d4a"); stack(19.3, -0.15, 9, -Math.PI / 2, white);
    stack(19.3, 1.6, 8, -Math.PI / 2, white); stack(19.3, 2.35, 10, -Math.PI / 2, cream); stack(19.3, 3.1, 5, -Math.PI / 2, "#b23a3a"); stack(19.3, 4.2, 7, -Math.PI / 2, white);
    // קבוצות באמצע החדר
    stack(14.2, 0.2, 8, 0.1, white); stack(14.95, 0.2, 6, 0.1, white); stack(14.6, 0.95, 9, Math.PI + 0.1, cream); stack(13.4, 0.9, 4, 1.2, white);
    stack(16.8, -3.6, 7, Math.PI, "#2d5f9e"); stack(17.55, -3.6, 8, Math.PI, white);
    stack(11.0, 4.2, 6, Math.PI / 2, white); stack(11.0, -4.2, 9, Math.PI / 2, white);
    // כיסא בודד שנפל / עומד
    list.push({ pos: [16.6, 0, 2.2], rotY: 2.4, color: white });
    k.collider(16.3, 16.9, 1.9, 2.5, 0, 0.8, true);
    k.instances(chairGeo, chairMat, list);
    k.room("Chair Storage", 10, X2, -5, 5);
  }

  // ---------- אופניים על הקירות ----------
  {
    const wheelR = 0.34;
    const Rr: V3 = [-0.5, 0, 0], BB: V3 = [-0.06, -0.04, 0], S: V3 = [-0.2, 0.5, 0], HT: V3 = [0.36, 0.5, 0], HB: V3 = [0.4, 0.34, 0], F: V3 = [0.5, 0, 0];
    const frame = mergeAll([
      rod(BB, S, 0.018), rod(S, HT, 0.016), rod(BB, HB, 0.022), rod(HB, HT, 0.024),
      ...[-1, 1].flatMap((sz) => [rod(Rr.map((v, i) => (i === 2 ? sz * 0.05 : v)) as V3, BB, 0.011), rod(Rr.map((v, i) => (i === 2 ? sz * 0.05 : v)) as V3, S, 0.01), rod(HB, [0.5, 0, sz * 0.05], 0.012)]),
    ]);
    const metalParts: THREE.BufferGeometry[] = [];
    for (const cx of [-0.5, 0.5]) {
      metalParts.push(xf(new THREE.TorusGeometry(wheelR - 0.03, 0.012, 6, 32), [cx, 0, 0]));
      metalParts.push(xf(new THREE.CylinderGeometry(0.025, 0.025, 0.11, 10), [cx, 0, 0], [Math.PI / 2, 0, 0]));
      for (let j = 0; j < 16; j++) {
        const a = (j / 16) * Math.PI * 2, side = j % 2 ? 0.035 : -0.035;
        metalParts.push(rod([cx, 0, side], [cx + Math.cos(a) * (wheelR - 0.035), Math.sin(a) * (wheelR - 0.035), 0], 0.0022, 3));
      }
    }
    metalParts.push(rod(S, [-0.24, 0.62, 0], 0.012), rod(HT, [0.33, 0.62, 0], 0.013), rod([0.33, 0.62, -0.22], [0.33, 0.62, 0.22], 0.012));
    metalParts.push(xf(new THREE.TorusGeometry(0.09, 0.008, 6, 24), [BB[0], BB[1], 0.06]), rod([BB[0], BB[1], 0.07], [BB[0] + 0.12, BB[1] - 0.12, 0.08], 0.01), rod([BB[0], BB[1], -0.07], [BB[0] - 0.12, BB[1] + 0.12, -0.08], 0.01));
    metalParts.push(xf(new THREE.BoxGeometry(0.09, 0.02, 0.06), [BB[0] + 0.12, BB[1] - 0.12, 0.12]), xf(new THREE.BoxGeometry(0.09, 0.02, 0.06), [BB[0] - 0.12, BB[1] + 0.12, -0.12]));
    // פגושים
    for (const cx of [-0.5, 0.5]) metalParts.push(xf(new THREE.TorusGeometry(wheelR + 0.04, 0.012, 4, 20, Math.PI * 0.55), [cx, 0, 0], [0, 0, cx < 0 ? Math.PI * 0.3 : Math.PI * 0.15], [1, 1, 3]));
    const metal = mergeAll(metalParts);
    const blackParts: THREE.BufferGeometry[] = [];
    for (const cx of [-0.5, 0.5]) blackParts.push(xf(new THREE.TorusGeometry(wheelR - 0.012, 0.022, 8, 40), [cx, 0, 0]));
    const saddle = new THREE.SphereGeometry(0.1, 12, 8); xf(saddle, [-0.25, 0.64, 0], [0, 0, 0], [1.3, 0.28, 0.6]);
    blackParts.push(saddle, rod([0.33, 0.62, 0.15], [0.33, 0.62, 0.23], 0.017), rod([0.33, 0.62, -0.15], [0.33, 0.62, -0.23], 0.017));
    const black = mergeAll(blackParts);
    const frameMat = k.mat(null, "#ffffff", [1, 1], { roughness: 0.3, metalness: 0.6 });
    const metalMat = k.mat(null, "#c9ccd0", [1, 1], { roughness: 0.25, metalness: 1 });
    const rubber = k.mat(null, "#1c1c1e", [1, 1], { roughness: 0.75 });
    const hookGeo = mergeAll([rod([0, 0, 0], [0, 0, 0.16], 0.008), rod([0, 0, 0.16], [0, 0.05, 0.19], 0.008), xf(new THREE.BoxGeometry(0.05, 0.08, 0.01), [0, 0, 0.005])]);
    const cols = ["#c62828", "#1565c0", "#2e7d32", "#f9a825", "#6a1b9a", "#212121", "#e0e0e0", "#ef6c00", "#00838f"];
    const bikes: { pos: V3; rotX?: number; rotY: number; rotZ?: number; color: string }[] = [];
    const hooks: { pos: V3; rotY: number }[] = [];
    let ci = 0;
    // אופקיים על הקיר הדרומי של המסדרון (z=5, פונים צפונה)
    for (const x of [-14.15, -12.4, -10.7, -9.05, -5.0]) {
      const y = 1.98 + (ci % 2) * 0.06;
      bikes.push({ pos: [x, y, 5 + T / 2 + 0.26], rotY: 0, color: cols[ci++ % cols.length] });
      for (const dx of [-0.5, 0.5]) hooks.push({ pos: [x + dx * 0.9, y + wheelR - 0.02, 5 + T / 2], rotY: 0 });
    }
    // תלויים אנכית מהגלגל הקדמי על הקיר z=9 (פונים דרומה)
    for (const x of [-17.5, -16.7, -15.9, -15.1, -14.3, -13.5, -12.7, -9.4, -8.6, -7.8, -7.0, -6.2, -5.4]) {
      const zc = 9 - T / 2 - 0.66;
      bikes.push({ pos: [x, 1.78, zc], rotY: Math.PI / 2, rotZ: Math.PI / 2, color: cols[ci++ % cols.length] });
      hooks.push({ pos: [x, 2.62, 9 - T / 2], rotY: Math.PI });
      k.collider(x - 0.24, x + 0.24, zc - 0.4, 9 - T / 2, 0.9, 2.65, false);
    }
    // תלויים על הקיר המערבי של המסדרון (x=-20)
    for (const z of [6.1, 7.95]) {
      bikes.push({ pos: [X1 + T / 2 + 0.24, 2.0 + (z > 7 ? 0.07 : 0), z], rotY: Math.PI / 2, color: cols[ci++ % cols.length] });
    }
    k.instances(frame, frameMat, bikes);
    k.instances(metal, metalMat, bikes.map(({ pos, rotX, rotY, rotZ }) => ({ pos, rotX, rotY, rotZ })));
    k.instances(black, rubber, bikes.map(({ pos, rotX, rotY, rotZ }) => ({ pos, rotX, rotY, rotZ })));
    k.instances(hookGeo, metalMat, hooks, { noShadow: true });
    k.room("Bike Corridor", X1, -4, 5, 9);
    k.room("Pillar Room", X1, -4, 9, Z2);
  }

  // ---------- יער תמרורים ----------
  {
    const signTex = k.tex("br-signs", BT.brSigns);
    const faceMat = k.mat(signTex, "#ffffff", [1, 1], { roughness: 0.4, bump: 0.15 });
    const backMat = k.mat(null, "#a7adb3", [1, 1], { roughness: 0.4, metalness: 0.8 });
    const poleMat = k.mat(null, "#9ea3a8", [1, 1], { roughness: 0.35, metalness: 0.9 });
    const baseMat = k.mat(null, "#2a2a2c", [1, 1], { roughness: 0.85 });
    const shapes: Record<string, () => THREE.Shape> = {
      oct: () => { const s = new THREE.Shape(); const rad = 0.34 / Math.cos(Math.PI / 8); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + (i * Math.PI) / 4; if (i) s.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); else s.moveTo(Math.cos(a) * rad, Math.sin(a) * rad); } s.closePath(); return s; },
      tri: () => { const s = new THREE.Shape(); s.moveTo(-0.4, 0.34); s.lineTo(0.4, 0.34); s.lineTo(0, -0.4); s.closePath(); return s; },
      circle: () => { const s = new THREE.Shape(); s.absarc(0, 0, 0.3, 0, Math.PI * 2, false); return s; },
      diamond: () => { const s = new THREE.Shape(); s.moveTo(0, 0.4); s.lineTo(0.4, 0); s.lineTo(0, -0.4); s.lineTo(-0.4, 0); s.closePath(); return s; },
      square: () => { const s = new THREE.Shape(); s.moveTo(-0.3, -0.3); s.lineTo(0.3, -0.3); s.lineTo(0.3, 0.3); s.lineTo(-0.3, 0.3); s.closePath(); return s; },
      rect: () => { const s = new THREE.Shape(); s.moveTo(-0.45, -0.14); s.lineTo(0.45, -0.14); s.lineTo(0.45, 0.14); s.lineTo(-0.45, 0.14); s.closePath(); return s; },
    };
    const kinds: [string, string][] = [
      ["stop", "oct"], ["yield", "tri"], ["speed30", "circle"], ["noentry", "circle"], ["left", "circle"], ["right", "circle"], ["ahead", "circle"],
      ["curve", "diamond"], ["warn", "diamond"], ["ped", "square"], ["nopark", "circle"], ["speed60", "circle"], ["oneway", "rect"], ["deadend", "rect"],
    ];
    const faceGeo = (key: string, shape: THREE.Shape) => {
      const g = new THREE.ShapeGeometry(shape, 16);
      g.computeBoundingBox();
      const bb = g.boundingBox!;
      const [rx, ry, rw, rh] = BT.SIGN_RECTS[key];
      const pos = g.attributes.position, uv = g.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const fx = (pos.getX(i) - bb.min.x) / (bb.max.x - bb.min.x), fy = (bb.max.y - pos.getY(i)) / (bb.max.y - bb.min.y);
        uv.setXY(i, (rx + 1 + fx * (rw - 2)) / 512, 1 - (ry + 1 + fy * (rh - 2)) / 512);
      }
      return g;
    };
    const faces: THREE.BufferGeometry[] = [], backs: THREE.BufferGeometry[] = [], poles: THREE.BufferGeometry[] = [], bases: THREE.BufferGeometry[] = [];
    const tm = new THREE.Matrix4();
    const signAt = (x: number, z: number, rotY: number, tilt: number, list: [string, number][]) => {
      const hp = Math.max(...list.map(([, y]) => y)) + 0.35;
      tm.compose(new THREE.Vector3(x, 0.1, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt * 0.6, rotY, tilt)), new THREE.Vector3(1, 1, 1));
      poles.push(new THREE.CylinderGeometry(0.03, 0.03, hp, 10).translate(0, hp / 2, 0).applyMatrix4(tm));
      for (const [key, y] of list) {
        const sh = shapes[kinds.find(([k2]) => k2 === key)![1]]();
        faces.push(faceGeo(key, sh).translate(0, y, 0.058).applyMatrix4(tm));
        backs.push(new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: false, curveSegments: 16 }).translate(0, y, 0.044).applyMatrix4(tm));
        for (const dy of [-0.12, 0.12]) backs.push(new THREE.BoxGeometry(0.1, 0.03, 0.02).translate(0, y + dy, 0.035).applyMatrix4(tm));
      }
      bases.push(new THREE.CylinderGeometry(0.2, 0.24, 0.1, 16).translate(x, 0.05, z));
      k.collider(x - 0.2, x + 0.2, z - 0.2, z + 0.2, 0, 0.1, true);
      const top = hp + 0.1;
      k.collider(x - 0.06 - Math.abs(tilt) * top, x + 0.06 + Math.abs(tilt) * top, z - 0.06 - Math.abs(tilt) * top, z + 0.06 + Math.abs(tilt) * top, 0.1, top, false);
    };
    const order = kinds.map(([k2]) => k2);
    let n = 0;
    for (let gx = -2.2; gx <= 18.6; gx += 2.25)
      for (let gz = 6.9; gz <= 15; gz += 2.0) {
        const x = gx + (R() - 0.5) * 0.8, z = gz + (R() - 0.5) * 0.7;
        if (z > 10.3 && z < 12.1 && x > 6 && x < 13) continue; // מחיצה
        if (Math.abs(x - 16) < 0.9 && Math.abs(z - 12.8) < 0.9) continue; // עמוד
        if (Math.abs(x - 3) < 1.6 && z < 7.2) continue; // מעבר מהאולם
        if (Math.abs(x - 15) < 1.2 && z < 7.2) continue;
        if (x < -1.4 && (Math.abs(z - 8.3) < 1.1 || Math.abs(z - 13.6) < 1)) continue;
        if (R() < 0.12) continue;
        const a = order[n % order.length], b = order[(n * 5 + 3) % order.length];
        const two = R() < 0.35;
        const tilt = R() < 0.2 ? (R() - 0.5) * 0.18 : 0;
        signAt(x, z, Math.PI + (R() - 0.5) * 1.1 + (R() < 0.25 ? Math.PI : 0), tilt, two ? [[a, 2.15], [b, 1.35]] : [[a, 1.9 + R() * 0.4]]);
        n++;
      }
    k.merged(faces, faceMat, { noShadow: true });
    k.merged(backs, backMat, { noShadow: true });
    k.merged(poles, poleMat, { noShadow: true });
    k.merged(bases, baseMat, { noShadow: true });
    k.room("Road Signs", -4, X2, 5, Z2);
  }

  // ---------- שלטי EXIT זוהרים ----------
  {
    const house = new RoundedBoxGeometry(0.42, 0.17, 0.07, 2, 0.012);
    const face = mergeAll([
      xf(new THREE.PlaneGeometry(0.38, 0.14), [0, 0, 0.0365]),
      xf(new THREE.PlaneGeometry(0.38, 0.14), [0, 0, -0.0365], [0, Math.PI, 0]),
    ]);
    const rods = mergeAll([rod([-0.14, 0.085, 0], [-0.14, 0.42, 0], 0.006), rod([0.14, 0.085, 0], [0.14, 0.42, 0], 0.006)]);
    const houseMat = k.mat(null, "#f2f0ea", [1, 1], { roughness: 0.4 });
    const faceMat = k.mat(k.tex("br-exit", BT.brExit), "#ffffff", [1, 1], { emissive: "#ffffff", emissiveIntensity: 2.2, roughness: 0.3, bump: 0 });
    const signs: { pos: V3; rotY: number }[] = [];
    // [x, z, rotY] — תלויים מהתקרה מול פתחים
    for (const [x, z, ry] of [
      [-10 + 0.35, 0.5, Math.PI / 2], [-7, 5 + 0.35, 0], [-4 + 0.35, 8.3, Math.PI / 2], [5 - 0.35, -8, Math.PI / 2], [-11, 9 - 0.35, 0],
      [15, -10.5 - 0.35, 0], [10 + 0.35, -1.5, Math.PI / 2], [-15, -5 - 0.35, 0], [-7 - 0.35, -11, Math.PI / 2], [-1, -5 + 0.45, 0], [15, 5 - 0.35, 0],
      [-19.6, 12.5, Math.PI / 2],
    ] as const) signs.push({ pos: [x, H - 0.4, z], rotY: ry });
    k.instances(house, houseMat, signs, { noShadow: true });
    k.instances(face, faceMat, signs, { noShadow: true });
    k.instances(rods, k.mat(null, "#9a9a9a", [1, 1], { metalness: 0.9, roughness: 0.3 }), signs, { noShadow: true });
  }

  // ---------- שקעי חשמל (פרט קטן על הקירות) ----------
  {
    const outletGeo = new RoundedBoxGeometry(0.075, 0.12, 0.012, 1, 0.004);
    const outs: { pos: V3; rotY: number }[] = [];
    for (const s of segs) {
      if (s.a2 - s.a1 < 3 || R() < 0.4) continue;
      const a = s.a1 + 0.8 + R() * (s.a2 - s.a1 - 1.6), side = R() < 0.5 ? -1 : 1;
      if (s.axis === "x") outs.push({ pos: [a, 0.32, s.c + side * (T / 2 + 0.006)], rotY: side > 0 ? 0 : Math.PI });
      else outs.push({ pos: [s.c + side * (T / 2 + 0.006), 0.32, a], rotY: side > 0 ? Math.PI / 2 : -Math.PI / 2 });
    }
    k.instances(outletGeo, k.mat(null, "#efeada", [1, 1], { roughness: 0.35 }), outs, { noShadow: true });
  }

  // ---------- LIFE: scrawls, notes, an abandoned office desk ----------
  {
    const life = new Life(k, 404);
    const wood = k.mat(k.tex("br-desk", () => BT.brCeiling()), "#b89a6a", [1, 1], { roughness: 0.6, bump: 0.1 });
    const grey = k.mat(null, "#8e8f8a", [1, 1], { roughness: 0.45, metalness: 0.6 });
    const beige = k.mat(null, "#d8d0b8", [1, 1], { roughness: 0.5 });
    const dark = k.mat(null, "#232323", [1, 1], { roughness: 0.4 });
    const screen = k.mat(null, "#1d2a22", [1, 1], { roughness: 0.15, emissive: "#3a6a4a", emissiveIntensity: 0.35 });
    const deskParts: THREE.BufferGeometry[] = [], metalParts: THREE.BufferGeometry[] = [], beigeParts: THREE.BufferGeometry[] = [], darkParts: THREE.BufferGeometry[] = [];
    // office desk against the west wall of the empty office (x=-7), top 0.74
    const dx = -6.5, dz = -7.2;
    deskParts.push(new RoundedBoxGeometry(0.72, 0.035, 1.5, 2, 0.01).translate(dx, 0.74 - 0.0175, dz));
    for (const sz of [-1, 1]) metalParts.push(new THREE.BoxGeometry(0.66, 0.72, 0.03).translate(dx, 0.36, dz + sz * 0.72));
    metalParts.push(new THREE.BoxGeometry(0.03, 0.4, 1.4).translate(dx - 0.3, 0.5, dz));
    // drawer pedestal with three drawers + handles
    metalParts.push(new RoundedBoxGeometry(0.62, 0.66, 0.42, 2, 0.01).translate(dx, 0.35, dz + 0.45));
    for (let i = 0; i < 3; i++) { beigeParts.push(new THREE.BoxGeometry(0.02, 0.19, 0.38).translate(dx + 0.315, 0.15 + i * 0.21, dz + 0.45)); darkParts.push(new THREE.BoxGeometry(0.02, 0.02, 0.14).translate(dx + 0.33, 0.21 + i * 0.21, dz + 0.45)); }
    k.collider(dx - 0.36, dx + 0.36, dz - 0.75, dz + 0.75, 0, 0.76, true);
    // CRT monitor + keyboard
    beigeParts.push(new RoundedBoxGeometry(0.4, 0.36, 0.38, 2, 0.03).translate(dx - 0.05, 0.74 + 0.2, dz - 0.25));
    beigeParts.push(new THREE.CylinderGeometry(0.1, 0.16, 0.24, 4).rotateZ(Math.PI / 2).rotateX(Math.PI / 4).translate(dx - 0.3, 0.74 + 0.2, dz - 0.25));
    beigeParts.push(new THREE.BoxGeometry(0.2, 0.03, 0.44).translate(dx + 0.18, 0.755, dz - 0.25));
    beigeParts.push(new THREE.BoxGeometry(0.22, 0.03, 0.22).translate(dx - 0.05, 0.755, dz - 0.25));
    darkParts.push(new THREE.BoxGeometry(0.01, 0.26, 0.3).translate(dx + 0.155, 0.95, dz - 0.25));
    // filing cabinet
    const fx = -6.62, fz = -8.55;
    metalParts.push(new RoundedBoxGeometry(0.46, 1.32, 0.6, 2, 0.012).translate(fx, 0.66, fz));
    for (let i = 0; i < 4; i++) { beigeParts.push(new THREE.BoxGeometry(0.012, 0.28, 0.54).translate(fx + 0.236, 0.18 + i * 0.32, fz)); darkParts.push(new THREE.BoxGeometry(0.02, 0.03, 0.16).translate(fx + 0.25, 0.26 + i * 0.32, fz)); }
    k.collider(fx - 0.24, fx + 0.24, fz - 0.31, fz + 0.31, 0, 1.32, true);
    // swivel chair (5-star base, gas lift, seat, back)
    const cx = -5.75, cz = -7.0;
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; darkParts.push(rod([cx, 0.07, cz], [cx + Math.cos(a) * 0.3, 0.05, cz + Math.sin(a) * 0.3], 0.018)); darkParts.push(new THREE.SphereGeometry(0.028, 8, 6).translate(cx + Math.cos(a) * 0.3, 0.028, cz + Math.sin(a) * 0.3)); }
    darkParts.push(rod([cx, 0.07, cz], [cx, 0.42, cz], 0.025));
    darkParts.push(new RoundedBoxGeometry(0.48, 0.08, 0.46, 2, 0.03).translate(cx, 0.46, cz));
    darkParts.push(new RoundedBoxGeometry(0.06, 0.5, 0.44, 2, 0.025).rotateZ(-0.12).translate(cx + 0.25, 0.8, cz));
    k.collider(cx - 0.3, cx + 0.3, cz - 0.3, cz + 0.3, 0, 0.5, true);
    k.merged(deskParts, wood); k.merged(metalParts, grey); k.merged(beigeParts, beige); k.merged(darkParts, dark);
    k.add(new THREE.PlaneGeometry(0.28, 0.22), screen, [dx + 0.152, 0.95, dz - 0.25], { rotY: Math.PI / 2, noShadow: true });
    // papers on the desk
    life.flat(life.letter({ head: "LEVEL 0 ADMINISTRATION", to: "Dear Tom Kodner,", body: "Your request to leave Level 0 has been received. Current processing time: 10,000 years. Please remain in the hallway and do not follow the exit signs.", sign: "- Dept. of Liminal Spaces", hand: false, size: 13, date: "Day 47" }), dx + 0.1, 0.74, dz + 0.25, 0.22, -Math.PI / 2 + 0.1);
    life.stack(dx - 0.05, 0.74, dz + 0.55, 0.3, 0.23, 0.06, 0.1);
    life.flat(life.custom(256, 256, (g, w, h, r) => {
      g.fillStyle = "#efe9d6"; g.fillRect(0, 0, w, h);
      g.strokeStyle = "#2a2a6a"; g.lineWidth = 2.5; g.lineCap = "round";
      const walls = [[20, 20, 236, 20], [236, 20, 236, 236], [20, 236, 236, 236], [20, 20, 20, 236], [20, 90, 150, 90], [110, 90, 110, 180], [60, 150, 200, 150], [190, 40, 190, 120], [150, 190, 150, 236]];
      for (const [a, b, c, d] of walls) { g.beginPath(); g.moveTo(a + (r() - 0.5) * 3, b + (r() - 0.5) * 3); g.lineTo(c + (r() - 0.5) * 3, d + (r() - 0.5) * 3); g.stroke(); }
      g.fillStyle = "#2a2a6a"; g.font = `15px ${HAND}`; g.fillText("toilets", 34, 60); g.fillText("chairs", 196, 180); g.fillText("bikes", 40, 200); g.fillText("signs?", 160, 220);
      g.fillStyle = "#c0231d"; g.font = `bold 20px ${HAND}`; g.fillText("EXIT??", 120, 128); g.lineWidth = 3; g.strokeStyle = "#c0231d"; g.beginPath(); g.arc(150, 122, 34, 0, Math.PI * 2); g.stroke();
      g.fillStyle = "#2a2a6a"; g.font = `12px ${HAND}`; g.fillText("it moves every time - T.K.", 30, 250);
    }), dx - 0.05, 0.8, dz + 0.55, 0.24, -Math.PI / 2 - 0.2);
    life.wall(life.note({ text: "DON'T trust the EXIT signs", color: "#fff27a" }), dx + 0.158, 1.14, dz - 0.25, 0.1, Math.PI / 2, 0.08);
    life.wall(life.note({ text: "day 47. still humming.", color: "#ffd1dc" }), dx + 0.158, 0.79 + 0.05, dz - 0.37, 0.08, Math.PI / 2, -0.1);
    // scattered sheets on the carpet around the desk
    const sheet = life.letter({ body: "the lights never turn off. the carpet is always damp. I have walked for days and every room looks the same. if you find this, go back the way you came.", sign: "- Tom K.", paper: "#f4efdc", age: 0.6, size: 13 });
    life.flat(sheet, -5.3, 0.004, -8.4, 0.21, 0.9); life.flat(sheet, 7.5, 0.004, 3.5, 0.21, -0.5, 0.008);
    // memo on the office partition, toilet sign, chairs notice, vending note
    life.wall(life.poster({ title: "MAINTENANCE", sub: "LEVEL 0 - WEEK 2,391", body: "- replace tube 14 (buzzing)\n- carpet still damp. do not touch\n- toilets: why are there 21?\n- exits: DO NOT FOLLOW", bg: "#f3f0e2", fg: "#2a2a2a", accent: "#8a7a3a", style: "notice", wear: 0.5 }), -0.87, 1.5, -13.4, 0.42, Math.PI / 2, 0.02);
    life.wall(life.label({ text: "RESTROOM", sub: "out of order since 1996", bg: "#e9e4cf", fg: "#3a3a3a", border: "#3a3a3a", wear: 0.5 }), -12.5, 1.9, -5.13, 0.5, Math.PI);
    life.wall(life.label({ text: "MAX 10 CHAIRS", sub: "per stack - Facilities", bg: "#f5f2e6", fg: "#8a1a1a", border: "#8a1a1a", wear: 0.4 }), X2 - T / 2 - 0.005, 2.25, 0.8, 0.55, -Math.PI / 2);
    life.wall(life.note({ text: "OUT OF ORDER. do not insert coins. it eats them.", color: "#ffffff", ink: "#c0231d", tape: true }), 6.96, 1.28, Z1 + T / 2 + 0.84 + 0.004, 0.14, 0, 0.1);
    life.wall(life.poster({ title: "ALMOND WATER", sub: "stay hydrated", body: "Found a bottle? Share it.\nNever drink from the pools.", bg: "#f4ecd2", fg: "#5a3a18", accent: "#b88a3a", style: "notice", wear: 0.6 }), X2 - T / 2 - 0.005, 1.6, -12.4, 0.4, -Math.PI / 2, -0.02);
    // scrawls on the wallpaper
    life.wall(life.graffiti({ text: "TOM KODNER WAS HERE", color: "#3a2a1a", style: "tag", px: [512, 140], drip: false }), -5.2, 1.55, -5 + T / 2 + 0.004, 1.9, 0);
    life.wall(life.custom(300, 180, (g, w, h, r) => {
      g.strokeStyle = "rgba(40,30,20,0.85)"; g.lineWidth = 3; g.lineCap = "round";
      for (let i = 0; i < 47; i++) { const grp = Math.floor(i / 5), j = i % 5, x0 = 10 + (grp % 5) * 58, y0 = 14 + Math.floor(grp / 5) * 76; if (j < 4) { g.beginPath(); g.moveTo(x0 + j * 10 + (r() - 0.5) * 2, y0); g.lineTo(x0 + j * 10 + (r() - 0.5) * 3, y0 + 52); g.stroke(); } else { g.beginPath(); g.moveTo(x0 - 4, y0 + 40); g.lineTo(x0 + 40, y0 + 12); g.stroke(); } }
      g.fillStyle = "rgba(40,30,20,0.85)"; g.font = `bold 22px ${HAND}`; g.fillText("day 47", 170, 168);
    }, true), X1 + T / 2 + 0.004, 1.35, -3.2, 0.9, Math.PI / 2);
    life.wall(life.poster({ title: "MISSING", sub: "TOM KODNER", body: "Last seen: Level 0, near the toilets\nWearing: white (painted yellow?)\nIf found, do not follow him.", footer: "reward: almond water", bg: "#ece4cc", fg: "#222", accent: "#8a1a1a", style: "missing" }), -5.6, 1.62, 2.6 + 0.35 + 0.004, 0.42, 0, -0.03);
    life.wall(life.graffiti({ text: "THIS WAY OUT \u2192", color: "#5a4a2a", style: "tag", px: [400, 120], drip: false }), -4 + T / 2 + 0.004, 1.3, 11.6, 1.2, Math.PI / 2, 0.04);
    life.finish();
  }

  k.room("West Hall", X1, -10, -5, 5);
  k.room("Pillar Hall", -10, 10, -5, 5);
  k.room("Empty Office", -7, 5, Z1, -5);

  const hiderSpawns = Array.from({ length: 24 }, (_, i) => new THREE.Vector3(-3.3 + (i % 6) * 1.3, 0, -1.9 + Math.floor(i / 6) * 1.25));
  return k.finish({
    id: "backrooms", name: "Backrooms",
    bounds: { minX: X1 + T / 2 + 0.02, maxX: X2 - T / 2 - 0.02, minZ: Z1 + T / 2 + 0.02, maxZ: Z2 - T / 2 - 0.02 },
    hunterSpawns: grid(-17.2, -1.3, 9, 1.3),
    hiderSpawns,
    preview: { pos: [-2.5, 1.7, -3.6], look: [4, 1.3, 9], fov: 62 },
    lighting: {
      sky: "#4d4524",
      hemi: ["#fff3cc", "#e0d096", 0.9],
      sun: null,
      points: [
        { pos: [-15, 2.2, 0], color: "#fff0c0", int: 6, dist: 13 },
        { pos: [0, 2.2, 0], color: "#fff0c0", int: 6, dist: 13 },
        { pos: [15, 2.2, 0], color: "#fff0c0", int: 6, dist: 13 },
        { pos: [-13, 2.2, -11], color: "#fff0c0", int: 6, dist: 13 },
        { pos: [12, 2.2, -11], color: "#fff0c0", int: 6, dist: 13 },
        { pos: [6, 2.2, 11], color: "#fff0c0", int: 6, dist: 13 },
      ],
      exposure: 1.0,
      env: 0.7,
      hdri: "lab",
    },
  });
}
