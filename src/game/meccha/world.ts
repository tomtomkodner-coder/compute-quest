// המפה: "אחוזת המחבואים" — אולם עמודים עם פסל סוס, ספרייה, מטבח אדום, חדר אמבטיה מרוצף,
// מסדרון ציורים עם קשתות עץ, חדר צדדי עם קיר אריחים שחור, חממה, וחדר הציידים הנעול.
import * as THREE from "three";
import * as T from "./textures";
import type { PaintTex } from "./textures";

export interface Obstacle {
  minX: number; maxX: number; minZ: number; maxZ: number;
  bottom: number; top: number;
  standable: boolean;
  gate?: boolean;
  enabled: boolean;
}

export interface World {
  group: THREE.Group;
  surfaces: THREE.Mesh[];
  obstacles: Obstacle[];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  hunterSpawns: THREE.Vector3[];
  hiderSpawns: THREE.Vector3[];
  groundAt(x: number, z: number, y: number, r: number): number;
  surfaceColor(hit: THREE.Intersection, out: THREE.Color): THREE.Color;
  setGate(open: boolean): void;
  roomAt(x: number, z: number): string;
}

const WALL_H = 6;
const DOOR_H = 3.8;

type Mat = { m: THREE.MeshStandardMaterial; ptex: PaintTex | null; repeat: [number, number] };

export function buildWorld(): World {
  const group = new THREE.Group();
  const surfaces: THREE.Mesh[] = [];
  const obstacles: Obstacle[] = [];
  const gateMeshes: THREE.Mesh[] = [];

  function mat(ptex: PaintTex | null, color = "#ffffff", repeat: [number, number] = [1, 1], extra: { metalness?: number; roughness?: number; transparent?: boolean } = {}): Mat {
    let map: THREE.Texture | null = null;
    if (ptex) {
      map = ptex.texture.clone();
      map.repeat.set(repeat[0], repeat[1]);
      map.needsUpdate = true;
    }
    const m = new THREE.MeshStandardMaterial({
      color, map, roughness: extra.roughness ?? 0.82, metalness: extra.metalness ?? 0,
      transparent: extra.transparent, alphaTest: extra.transparent ? 0.5 : 0,
      side: extra.transparent ? THREE.DoubleSide : THREE.FrontSide,
    });
    return { m, ptex, repeat };
  }

  function add(
    geo: THREE.BufferGeometry, material: Mat, pos: [number, number, number],
    opts: { solid?: boolean; standable?: boolean; rotY?: number; rotX?: number; rotZ?: number; noShadow?: boolean; gate?: boolean; scale?: [number, number, number] } = {},
  ) {
    const mesh = new THREE.Mesh(geo, material.m);
    mesh.position.set(...pos);
    if (opts.rotY) mesh.rotation.y = opts.rotY;
    if (opts.rotX) mesh.rotation.x = opts.rotX;
    if (opts.rotZ) mesh.rotation.z = opts.rotZ;
    if (opts.scale) mesh.scale.set(...opts.scale);
    mesh.castShadow = !opts.noShadow;
    mesh.receiveShadow = true;
    mesh.userData.ptex = material.ptex;
    mesh.userData.repeat = material.repeat;
    group.add(mesh);
    if (!opts.gate) surfaces.push(mesh);
    else gateMeshes.push(mesh);
    if (opts.solid) {
      mesh.updateMatrixWorld();
      const b = new THREE.Box3().setFromObject(mesh);
      obstacles.push({
        minX: b.min.x, maxX: b.max.x, minZ: b.min.z, maxZ: b.max.z,
        bottom: b.min.y, top: b.max.y, standable: !!opts.standable, gate: opts.gate, enabled: true,
      });
    }
    return mesh;
  }

  /** קופסה: y = תחתית */
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, m: Mat, o: { solid?: boolean; standable?: boolean; gate?: boolean; rotY?: number } = { solid: true }) =>
    add(new THREE.BoxGeometry(w, h, d), m, [x, y + h / 2, z], o);
  const cyl = (rt: number, rb: number, h: number, x: number, y: number, z: number, m: Mat, solid = true, seg = 16) =>
    add(new THREE.CylinderGeometry(rt, rb, h, seg), m, [x, y + h / 2, z], { solid });
  const ball = (r: number, x: number, y: number, z: number, m: Mat, solid = false) =>
    add(new THREE.SphereGeometry(r, 20, 14), m, [x, y, z], { solid });

  const woodDark = mat(T.wood("#6f4518", "#4a2c0d", 3), "#fff");
  const woodMid = mat(T.wood("#a0703c", "#6f4518", 4), "#fff");
  const woodLight = mat(T.wood("#d4a373", "#a0703c", 8), "#fff");

  // ---------- קירות עם פתחים ----------
  /** קיר לאורך ציר X (z קבוע) עם דלתות [מרכז, רוחב] */
  function wallX(z: number, x1: number, x2: number, tex: Mat, doors: [number, number][] = [], back?: Mat) {
    let cur = x1;
    const segs: [number, number][] = [];
    for (const [c, w] of [...doors].sort((a, b) => a[0] - b[0])) {
      segs.push([cur, c - w / 2]);
      cur = c + w / 2;
      // משקוף מעל הדלת
      box(w, WALL_H - DOOR_H, 0.3, c, DOOR_H, z, withRepeat(tex, w, WALL_H - DOOR_H));
      arch(c, z, w, "x");
    }
    segs.push([cur, x2]);
    for (const [a, b] of segs) if (b - a > 0.01) {
      box(b - a, WALL_H, 0.3, (a + b) / 2, 0, z, withRepeat(tex, b - a, WALL_H));
      if (back) box(b - a, WALL_H, 0.02, (a + b) / 2, 0, z + 0.17, withRepeat(back, b - a, WALL_H), { solid: false });
    }
  }
  function wallZ(x: number, z1: number, z2: number, tex: Mat, doors: [number, number][] = []) {
    let cur = z1;
    const segs: [number, number][] = [];
    for (const [c, w] of [...doors].sort((a, b) => a[0] - b[0])) {
      segs.push([cur, c - w / 2]);
      cur = c + w / 2;
      box(0.3, WALL_H - DOOR_H, w, x, DOOR_H, c, withRepeat(tex, w, WALL_H - DOOR_H));
      arch(x, c, w, "z");
    }
    segs.push([cur, z2]);
    for (const [a, b] of segs) if (b - a > 0.01) box(0.3, WALL_H, b - a, x, 0, (a + b) / 2, withRepeat(tex, b - a, WALL_H));
  }
  function withRepeat(m: Mat, w: number, h: number): Mat {
    if (!m.ptex) return m;
    return mat(m.ptex, `#${m.m.color.getHexString()}`, [Math.max(0.3, w / 2.5), Math.max(0.3, h / 2.5)]);
  }
  /** קשת עץ מעל פתח */
  function arch(a: number, b: number, w: number, axis: "x" | "z") {
    const geo = new THREE.TorusGeometry(w / 2, 0.14, 8, 24, Math.PI);
    const pos: [number, number, number] = axis === "x" ? [a, DOOR_H - w / 2 + 0.02, b] : [b, DOOR_H - w / 2 + 0.02, a];
    if (axis === "x") add(geo, woodMid, [a, DOOR_H - 0.15, b], { scale: [1, 0.45, 2.4] });
    else add(geo, woodMid, [a, DOOR_H - 0.15, b], { rotY: Math.PI / 2, scale: [1, 0.45, 2.4] });
    void pos;
    // עמודי צד
    for (const s of [-1, 1]) {
      if (axis === "x") box(0.22, DOOR_H, 0.42, a + s * (w / 2 - 0.11), 0, b, woodMid, { solid: false });
      else box(0.42, DOOR_H, 0.22, a, 0, b + s * (w / 2 - 0.11), woodMid, { solid: false });
    }
  }

  // ---------- רצפות ----------
  const floor = (x1: number, x2: number, z1: number, z2: number, m: Mat, rep: number) =>
    add(new THREE.BoxGeometry(x2 - x1, 0.2, z2 - z1), mat(m.ptex, "#fff", [(x2 - x1) / rep, (z2 - z1) / rep]), [(x1 + x2) / 2, -0.1, (z1 + z2) / 2], { noShadow: true });
  const marbleFloor = mat(T.checker("#f1ede4", "#2b2d42", 2), "#fff");
  floor(-8, 8, -8, 8, marbleFloor, 4);
  floor(-24, -8, -18, 0, woodDark, 4);
  floor(-24, -8, 0, 18, mat(T.checker("#ffffff", "#d62828", 4), "#fff"), 4);
  floor(8, 24, -18, -4, mat(T.tiles("#e0fbfc", "#98c1d9", 8), "#fff"), 3);
  floor(8, 24, -4, 4, woodMid, 4);
  floor(8, 24, 4, 18, mat(T.tiles("#3d405b", "#4a4e69", 4), "#fff"), 4);
  floor(-8, 8, -18, -8, mat(T.tiles("#a3b18a", "#dad7cd", 4), "#fff"), 4);
  floor(-8, 8, 8, 18, mat(T.tiles("#6c757d", "#495057", 4), "#fff"), 4);

  // ---------- קירות ----------
  const hallWall = mat(T.damask("#f3e9d2", "#e6d5b0"), "#fff");
  const libWall = mat(T.damask("#2d6a4f", "#276148"), "#fff");
  const kitWall = mat(T.tiles("#ffffff", "#f1f1f1", 6, "rgba(0,0,0,0.12)"), "#fff");
  const bathWall = mat(T.tiles("#caf0f8", "#90e0ef", 10), "#fff");
  const corridorWall = mat(T.stripes(["#c9ada7", "#b89c95"]), "#fff");
  const sideWall = mat(T.stripes(["#ffe5b4", "#ffd8a8"]), "#fff");
  const blackTiles = mat(T.tiles("#111111", "#1d1d1d", 6, "rgba(255,255,255,0.18)"), "#fff", [1, 1], { roughness: 0.25 });
  const greenWall = mat(T.brick("#dde5b6", "#adc178"), "#fff");
  const hunterWall = mat(T.brick("#6c757d", "#495057"), "#fff");

  // חיצוניים
  wallX(-18, -24, -8, libWall);
  wallX(-18, -8, 8, greenWall);
  wallX(-18, 8, 24, bathWall);
  wallX(18, -24, -8, kitWall);
  wallX(18, -8, 8, hunterWall);
  wallX(18, 8, 24, sideWall);
  wallZ(-24, -18, 0, libWall);
  wallZ(-24, 0, 18, kitWall);
  wallZ(24, -18, -4, bathWall);
  wallZ(24, -4, 4, corridorWall);
  // קיר האריחים השחור בחדר הצדדי
  wallZ(24, 4, 18, blackTiles);
  // פנימיים
  wallZ(-8, -18, 0, hallWall, [[-4, 3.2]]);
  wallZ(-8, 0, 18, hallWall, [[4, 3.2]]);
  wallX(0, -24, -8, libWall, [[-16, 3.2]]);
  wallZ(8, -18, 0, hallWall, [[0, 3.6]]);
  wallZ(8, 0, 18, hallWall);
  wallX(-8, -8, 8, hallWall, [[0, 4]]);
  wallX(8, -8, 8, hallWall, [[0, 4]]);
  wallX(-4, 8, 24, corridorWall, [[16, 3.2]]);
  wallX(4, 8, 24, corridorWall, [[16, 3.2]]);

  // שער חדר הציידים (סורג)
  const barMat = mat(T.bars(), "#fff", [2, 2], { transparent: true, metalness: 0.6, roughness: 0.4 });
  add(new THREE.BoxGeometry(4, DOOR_H, 0.12), barMat, [0, DOOR_H / 2, 8], { solid: true, gate: true });

  // ---------- אולם העמודים ----------
  const pillarMat = mat(T.marble("#f8f4ec", "#c9c0ae", 2), "#fff", [1, 2]);
  for (const [x, z] of [[-4.5, -4.5], [4.5, -4.5], [-4.5, 4.5], [4.5, 4.5]]) {
    box(1.5, 0.4, 1.5, x, 0, z, pillarMat);
    cyl(0.55, 0.6, WALL_H - 0.8, x, 0.4, z, pillarMat, true, 20);
    box(1.4, 0.4, 1.4, x, WALL_H - 0.4, z, pillarMat, { solid: false });
  }
  // שטיח אדום מלכותי
  add(new THREE.BoxGeometry(5, 0.04, 12), mat(T.rug("#9d0208", "#ffba08", "#6a040f"), "#fff", [1, 2.4]), [0, 0.02, 0], { noShadow: true });
  // פסל הסוס על כן שיש
  const bronze = mat(null, "#8c6239", [1, 1], { metalness: 0.7, roughness: 0.35 });
  box(3, 1, 1.6, 0, 0, 0, pillarMat, { solid: true, standable: true });
  const horse = new THREE.Group();
  const hb = (w: number, h: number, d: number, x: number, y: number, z: number, rz = 0, rx = 0) => {
    const m = add(new THREE.BoxGeometry(w, h, d), bronze, [x, y, z], { rotZ: rz, rotX: rx });
    group.remove(m);
    horse.add(m);
  };
  hb(1.9, 0.75, 0.7, 0, 1.95, 0);            // גוף
  hb(0.35, 0.95, 0.4, 0.95, 2.45, 0, -0.5);   // צוואר
  hb(0.75, 0.32, 0.34, 1.35, 2.85, 0, -0.3);  // ראש
  hb(0.12, 0.25, 0.12, 1.2, 3.08, 0.1);       // אוזן
  hb(0.12, 0.25, 0.12, 1.2, 3.08, -0.1);
  for (const [x, z] of [[-0.75, 0.22], [-0.75, -0.22], [0.75, 0.22], [0.75, -0.22]]) hb(0.18, 0.95, 0.18, x, 1.2, z);
  hb(0.14, 0.8, 0.14, -1.05, 1.8, 0, 0.5);    // זנב
  group.add(horse);
  obstacles.push({ minX: -1.1, maxX: 1.6, minZ: -0.4, maxZ: 0.4, bottom: 1, top: 3.2, standable: false, enabled: true });
  // נברשת
  cyl(0.05, 0.05, 1.2, 0, WALL_H - 1.2, 0, mat(null, "#d4af37", [1, 1], { metalness: 0.9, roughness: 0.3 }), false);
  add(new THREE.TorusGeometry(0.9, 0.08, 8, 24), mat(null, "#d4af37", [1, 1], { metalness: 0.9, roughness: 0.3 }), [0, WALL_H - 1.25, 0], { rotX: Math.PI / 2 });
  // ספסלים ועציצים באולם
  box(2.4, 0.5, 0.7, -6.8, 0, -1.8, woodMid, { solid: true, standable: true });
  box(2.4, 0.5, 0.7, 6.8, 0, 1.8, woodMid, { solid: true, standable: true });
  const pot = mat(null, "#9c6644");
  const leaves = mat(T.leaves(), "#fff");
  const plant = (x: number, z: number, s = 1) => {
    cyl(0.45 * s, 0.35 * s, 0.8 * s, x, 0, z, pot);
    ball(0.85 * s, x, 1.5 * s, z, leaves, true);
  };
  plant(-7, -7);
  plant(7, -7);
  plant(-7, 7);
  plant(7, 7);

  // ---------- ספרייה ----------
  const booksMat = mat(T.books(), "#fff");
  for (const z of [-16, -11.5, -7, -2.5]) box(0.9, 4.2, 4, -23.4, 0, z, booksMat);
  for (const x of [-20, -15.5, -11]) box(4, 4.2, 0.9, x, 0, -17.4, booksMat);
  box(0.9, 3.2, 3.5, -15, 0, -9, booksMat);
  box(0.9, 3.2, 3.5, -15, 0, -4.5, booksMat);
  // שולחן קריאה
  box(3.2, 0.15, 1.8, -19, 0.95, -8, woodLight, { solid: true, standable: true });
  for (const [dx, dz] of [[-1.4, -0.7], [1.4, -0.7], [-1.4, 0.7], [1.4, 0.7]]) box(0.15, 0.95, 0.15, -19 + dx, 0, -8 + dz, woodLight, { solid: true });
  // כורסת עור ירוקה
  const leather = mat(null, "#1b4332", [1, 1], { roughness: 0.5 });
  box(1.8, 0.7, 1.8, -12, 0, -14.8, leather, { solid: true, standable: true });
  box(1.8, 1.3, 0.45, -12, 0.7, -15.5, leather, { solid: true });
  box(0.4, 1.1, 1.8, -12.9, 0, -14.8, leather, { solid: true });
  box(0.4, 1.1, 1.8, -11.1, 0, -14.8, leather, { solid: true });
  // גלובוס
  cyl(0.08, 0.3, 1, -20.5, 0, -2, woodDark, true, 10);
  ball(0.5, -20.5, 1.45, -2, mat(T.dots("#4ea8de", "#80b918", 3), "#fff"));
  add(new THREE.BoxGeometry(6, 0.04, 4), mat(T.rug("#5e548e", "#e0b1cb", "#231942"), "#fff"), [-18.5, 0.02, -8], { noShadow: true });

  // ---------- מטבח (אדום) ----------
  const redCab = mat(null, "#c1121f", [1, 1], { roughness: 0.4 });
  const counterTop = mat(T.marble("#f5f5f5", "#aaaaaa", 9), "#fff", [2, 0.5]);
  box(12, 1.1, 1.2, -17, 0, 17.3, redCab, { solid: true, standable: true });
  box(12.1, 0.1, 1.3, -17, 1.1, 17.3, counterTop, { solid: true, standable: true });
  box(1.2, 1.1, 7, -23.3, 0, 12.5, redCab, { solid: true, standable: true });
  box(1.3, 0.1, 7.1, -23.3, 1.1, 12.5, counterTop, { solid: true, standable: true });
  // ארונות עליונים
  box(10, 1.2, 0.6, -17, 2.6, 17.6, redCab, { solid: false });
  // מקרר
  const steel = mat(null, "#d9d9d9", [1, 1], { metalness: 0.6, roughness: 0.35 });
  box(1.6, 3.6, 1.4, -9.4, 0, 16.9, steel, { solid: true });
  // תנור
  box(1.3, 1.1, 1.2, -13, 0, 17.3, mat(null, "#2b2d42"), { solid: true });
  for (const dx of [-0.3, 0.3]) cyl(0.18, 0.18, 0.04, -13 + dx, 1.2, 17.2, mat(null, "#111"), false, 12);
  // שולחן אוכל עם כיסאות אדומים
  box(3.2, 0.15, 2, -16, 1, 8, woodLight, { solid: true, standable: true });
  for (const [dx, dz] of [[-1.4, -0.8], [1.4, -0.8], [-1.4, 0.8], [1.4, 0.8]]) box(0.15, 1, 0.15, -16 + dx, 0, 8 + dz, woodLight, { solid: true });
  for (const [x, z] of [[-17, 6.4], [-15, 6.4], [-17, 9.6], [-15, 9.6]]) {
    box(0.9, 0.55, 0.9, x, 0, z, redCab, { solid: true, standable: true });
    box(0.9, 0.9, 0.12, x, 0.55, z + (z < 8 ? -0.4 : 0.4), redCab, { solid: true });
  }
  // קערת פירות
  cyl(0.5, 0.3, 0.2, -16, 1.15, 8, mat(null, "#ffffff"), false);
  for (const [dx, dz, c] of [[-0.15, 0, "#ff595e"], [0.15, 0.1, "#ffca3a"], [0, -0.18, "#8ac926"]] as const)
    ball(0.16, -16 + dx, 1.45, 8 + dz, mat(null, c));
  // פח ושטיח
  cyl(0.45, 0.4, 1.1, -10, 0, 3, mat(null, "#6a994e"));
  add(new THREE.BoxGeometry(3, 0.04, 1.6), mat(T.stripes(["#e63946", "#f1faee"], false), "#fff"), [-17, 0.02, 15.5], { noShadow: true });

  // ---------- חדר אמבטיה ----------
  const porcelain = mat(null, "#fdfdfd", [1, 1], { roughness: 0.2 });
  // אמבטיה
  box(4, 1, 2, 21.8, 0, -16.8, porcelain, { solid: true, standable: true });
  box(3.6, 0.1, 1.6, 21.8, 0.95, -16.8, mat(null, "#90e0ef", [1, 1], { roughness: 0.1 }), { solid: false });
  // אסלה
  box(0.8, 0.5, 1, 12, 0, -17.2, porcelain, { solid: true, standable: true });
  box(0.9, 0.9, 0.3, 12, 0.5, -17.6, porcelain, { solid: true });
  // כיור ומראה
  box(1.6, 0.9, 0.8, 16, 0, -17.5, mat(null, "#e9ecef"), { solid: true, standable: true });
  box(1.4, 1.2, 0.05, 16, 1.7, -17.8, mat(null, "#bde0fe", [1, 1], { metalness: 0.9, roughness: 0.05 }), { solid: false });
  // מגבות ושטיחון
  box(0.1, 1.2, 0.8, 23.8, 1.2, -9, mat(T.stripes(["#ff8fab", "#ffc2d1"], false), "#fff"), { solid: false });
  add(new THREE.BoxGeometry(2, 0.04, 1.2), mat(null, "#ffafcc"), [21.8, 0.02, -14.8], { noShadow: true });
  // מדף ובקבוקים
  box(2.2, 0.1, 0.4, 20, 1.6, -17.75, woodLight, { solid: false });
  for (const [dx, c] of [[-0.6, "#06d6a0"], [0, "#ffd166"], [0.6, "#ef476f"]] as const) cyl(0.12, 0.12, 0.4, 20 + dx, 1.7, -17.75, mat(null, c), false, 10);
  plant(9.5, -9, 0.8);
  // מכונת כביסה
  box(1.4, 1.5, 1.3, 23.2, 0, -7, mat(null, "#f8f9fa"), { solid: true, standable: true });
  cyl(0.45, 0.45, 0.05, 22.47, 0.75, -7, mat(null, "#adb5bd", [1, 1], { metalness: 0.6 }), false);

  // ---------- מסדרון הציורים ----------
  for (let i = 0; i < 5; i++) {
    const x = 10 + i * 3.2;
    if (Math.abs(x - 16) < 1.8) continue;
    add(new THREE.PlaneGeometry(2, 1.6), mat(T.painting(i * 7 + 3), "#fff"), [x, 2.6, -3.84], { noShadow: true });
    add(new THREE.PlaneGeometry(2, 1.6), mat(T.painting(i * 11 + 5), "#fff"), [x, 2.6, 3.84], { rotY: Math.PI, noShadow: true });
  }
  add(new THREE.PlaneGeometry(2.4, 1.9), mat(T.painting(99), "#fff"), [23.84, 2.6, 0], { rotY: -Math.PI / 2, noShadow: true });
  // שטיח רץ, ספסל, אגרטלים ושעון
  add(new THREE.BoxGeometry(14, 0.04, 2), mat(T.stripes(["#6d597a", "#b56576"], false), "#fff", [4, 1]), [16, 0.02, 0], { noShadow: true });
  box(2.2, 0.5, 0.6, 12.5, 0, -3.3, woodDark, { solid: true, standable: true });
  cyl(0.35, 0.25, 1.2, 20.5, 0, -3.3, mat(T.stripes(["#277da1", "#f9f9f9"], false), "#fff"));
  cyl(0.35, 0.25, 1.2, 20.5, 0, 3.3, mat(T.dots("#f94144", "#ffffff", 3), "#fff"));
  box(0.9, 2.8, 0.5, 23.5, 0, 2.6, woodDark, { solid: true });
  cyl(0.3, 0.3, 0.06, 23.24, 2.2, 2.6, mat(null, "#fefae0"), false, 20);

  // ---------- חדר צדדי (קיר אריחים שחור) ----------
  const velvet = mat(null, "#9d0208", [1, 1], { roughness: 0.95 });
  // הכורסה האדומה
  box(1.8, 0.7, 1.8, 21.8, 0, 7, velvet, { solid: true, standable: true });
  box(0.45, 1.4, 1.8, 22.6, 0.7, 7, velvet, { solid: true });
  box(1.8, 1, 0.4, 21.8, 0, 6.1, velvet, { solid: true });
  box(1.8, 1, 0.4, 21.8, 0, 7.9, velvet, { solid: true });
  // ספה
  const sofa = mat(null, "#264653");
  box(5, 0.8, 1.8, 15, 0, 16.9, sofa, { solid: true, standable: true });
  box(5, 1.1, 0.5, 15, 0.8, 17.6, sofa, { solid: true });
  box(1.2, 0.7, 0.3, 13.8, 0.8, 17.2, mat(T.dots("#e9c46a", "#f4a261", 3), "#fff"), { solid: false });
  // שולחן + טלוויזיה על קיר שחור
  box(3, 0.9, 0.9, 23.3, 0, 12.5, woodDark, { solid: true, standable: true });
  box(0.15, 1.8, 3, 23.7, 1.2, 12.5, mat(T.tv(), "#fff"), { solid: true });
  // מנורה עומדת
  cyl(0.07, 0.07, 3, 10, 0, 16.8, mat(null, "#343a40"));
  add(new THREE.ConeGeometry(0.7, 0.9, 16, 1, true), mat(null, "#fefae0"), [10, 3.1, 16.8]);
  // ארגזים
  const crateMat = mat(T.crate(), "#fff");
  box(1.4, 1.4, 1.4, 10, 0, 6, crateMat, { solid: true, standable: true });
  box(1.4, 1.4, 1.4, 11.5, 0, 6, crateMat, { solid: true, standable: true });
  box(1.4, 1.4, 1.4, 10.7, 1.4, 6, crateMat, { solid: true, standable: true });
  add(new THREE.BoxGeometry(4, 0.04, 3), mat(T.rug("#212529", "#adb5bd", "#e9ecef"), "#fff"), [17, 0.02, 11], { noShadow: true });

  // ---------- חממה ----------
  plant(-6, -16.5, 1.2);
  plant(-2, -16.5, 0.9);
  plant(2, -16.5, 1.1);
  plant(6, -16.5, 1.3);
  // מזרקה
  cyl(1.8, 2, 0.7, 0, 0, -13, mat(T.marble("#e9ecef", "#adb5bd", 3), "#fff"), true, 24);
  cyl(1.6, 1.6, 0.05, 0, 0.66, -13, mat(null, "#48cae4", [1, 1], { roughness: 0.1, metalness: 0.2 }), false, 24);
  cyl(0.25, 0.3, 1.6, 0, 0.7, -13, mat(T.marble("#e9ecef", "#adb5bd", 4), "#fff"), true, 12);
  // ספסל ועציצי פרחים
  box(2.4, 0.5, 0.7, -6.5, 0, -10, woodLight, { solid: true, standable: true });
  const flowerCols = ["#ff006e", "#ffbe0b", "#8338ec", "#fb5607"];
  flowerCols.forEach((c, i) => {
    cyl(0.3, 0.25, 0.5, 5 + (i % 2) * 1.2, 0, -10 + Math.floor(i / 2) * 1.2, pot);
    ball(0.35, 5 + (i % 2) * 1.2, 0.8, -10 + Math.floor(i / 2) * 1.2, mat(null, c));
  });

  // ---------- חדר הציידים ----------
  box(3, 0.5, 0.7, -5, 0, 16.8, mat(null, "#343a40"), { solid: true, standable: true });
  box(3, 0.5, 0.7, 5, 0, 16.8, mat(null, "#343a40"), { solid: true, standable: true });

  const bounds = { minX: -23.8, maxX: 23.8, minZ: -17.8, maxZ: 17.8 };

  function groundAt(x: number, z: number, y: number, r: number) {
    let g = 0;
    for (const o of obstacles) {
      if (!o.enabled) continue;
      if (!o.standable && o.top > 0.5) continue;
      if (x > o.minX - r * 0.3 && x < o.maxX + r * 0.3 && z > o.minZ - r * 0.3 && z < o.maxZ + r * 0.3) {
        if (o.top <= y + 0.45 && o.top > g) g = o.top;
      }
    }
    return g;
  }

  const tmp = new THREE.Color();
  function surfaceColor(hit: THREE.Intersection, out: THREE.Color) {
    const mesh = hit.object as THREE.Mesh;
    const m = mesh.material as THREE.MeshStandardMaterial;
    const ptex = mesh.userData.ptex as PaintTex | null | undefined;
    if (ptex && hit.uv) {
      T.sampleTex(ptex, hit.uv, out, mesh.userData.repeat ?? ptex.repeat);
      tmp.copy(m.color);
      return out.multiply(tmp);
    }
    return out.copy(m.color);
  }

  function setGate(open: boolean) {
    for (const o of obstacles) if (o.gate) o.enabled = !open;
    for (const m of gateMeshes) m.visible = !open;
  }

  function roomAt(x: number, z: number) {
    if (x < -8) return z < 0 ? "ספרייה" : "מטבח";
    if (x > 8) return z < -4 ? "חדר אמבטיה" : z > 4 ? "חדר צדדי" : "מסדרון הציורים";
    if (z < -8) return "חממה";
    if (z > 8) return "חדר הציידים";
    return "אולם העמודים";
  }

  const hunterSpawns = [-4, -2, 0, 2, 4, -3, 3, -1, 1].map((x, i) => new THREE.Vector3(x, 0, 12 + (i % 3)));
  const hiderSpawns: THREE.Vector3[] = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    hiderSpawns.push(new THREE.Vector3(Math.cos(a) * 3, 0, Math.sin(a) * 3 + (Math.sin(a) > 0 ? 2 : -2)));
  }

  return { group, surfaces, obstacles, bounds, hunterSpawns, hiderSpawns, groundAt, surfaceColor, setGate, roomAt };
}
