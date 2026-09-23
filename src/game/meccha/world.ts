// המפה: בית צבעוני עם סלון, חדר ילדים ומטבח. כל הרהיטים בנויים מצורות בסיסיות.
import * as THREE from "three";
import * as T from "./textures";
import type { PaintTex } from "./textures";

export interface Obstacle {
  minX: number; maxX: number; minZ: number; maxZ: number;
  bottom: number; top: number;
  standable: boolean; // אפשר לעמוד/להתחבא עליו
}

export interface World {
  group: THREE.Group;
  surfaces: THREE.Mesh[]; // כל מה שאפשר לדגום ממנו צבע
  obstacles: Obstacle[];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  seekerDoor: THREE.Vector3;
  hiderSpawn: THREE.Vector3;
  groundAt(x: number, z: number, y: number, r: number): number;
  surfaceColor(hit: THREE.Intersection, out: THREE.Color): THREE.Color;
}

const WALL_H = 5;

export function buildWorld(): World {
  const group = new THREE.Group();
  const surfaces: THREE.Mesh[] = [];
  const obstacles: Obstacle[] = [];

  function mat(ptex: PaintTex | null, color = "#ffffff", repeat: [number, number] = [1, 1]) {
    let map: THREE.Texture | null = null;
    if (ptex) {
      map = ptex.texture.clone();
      map.repeat.set(repeat[0], repeat[1]);
      map.needsUpdate = true;
    }
    const m = new THREE.MeshStandardMaterial({ color, map, roughness: 0.85, metalness: 0 });
    return { m, ptex, repeat };
  }

  function add(
    geo: THREE.BufferGeometry,
    material: ReturnType<typeof mat>,
    pos: [number, number, number],
    opts: { solid?: boolean; standable?: boolean; rotY?: number; noShadow?: boolean } = {},
  ) {
    const mesh = new THREE.Mesh(geo, material.m);
    mesh.position.set(...pos);
    if (opts.rotY) mesh.rotation.y = opts.rotY;
    mesh.castShadow = !opts.noShadow;
    mesh.receiveShadow = true;
    mesh.userData.ptex = material.ptex;
    mesh.userData.repeat = material.repeat;
    group.add(mesh);
    surfaces.push(mesh);
    if (opts.solid) {
      mesh.updateMatrixWorld();
      const b = new THREE.Box3().setFromObject(mesh);
      obstacles.push({
        minX: b.min.x, maxX: b.max.x, minZ: b.min.z, maxZ: b.max.z,
        bottom: b.min.y, top: b.max.y, standable: !!opts.standable,
      });
    }
    return mesh;
  }

  /** קופסה: y = תחתית */
  function box(
    w: number, h: number, d: number, x: number, y: number, z: number,
    material: ReturnType<typeof mat>, opts: { solid?: boolean; standable?: boolean } = { solid: true },
  ) {
    return add(new THREE.BoxGeometry(w, h, d), material, [x, y + h / 2, z], opts);
  }

  // ---------- רצפות ----------
  const floorWood = T.wood("#c98f5a", "#8d5b31", 2);
  const carpet = T.dots("#5fa8d3", "#cae9ff", 6);
  const tiles = T.checker("#f1faee", "#e63946", 4);
  add(new THREE.BoxGeometry(20, 0.2, 24), mat(floorWood, "#fff", [5, 6]), [-6, -0.1, 0], { noShadow: true });
  add(new THREE.BoxGeometry(12, 0.2, 12), mat(carpet, "#fff", [3, 3]), [10, -0.1, -6], { noShadow: true });
  add(new THREE.BoxGeometry(12, 0.2, 12), mat(tiles, "#fff", [4, 4]), [10, -0.1, 6], { noShadow: true });

  // ---------- קירות ----------
  const livingWall = T.stripes(["#ffe8a3", "#ffd166"]);
  const kidsWall = T.dots("#ffc8dd", "#ffafcc", 5);
  const kitchenWall = T.brick("#e9edc9", "#ccd5ae");
  const wall = (x1: number, z1: number, x2: number, z2: number, tex: PaintTex) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const horiz = Math.abs(z2 - z1) < 0.01;
    const w = horiz ? len : 0.3;
    const d = horiz ? 0.3 : len;
    box(w, WALL_H, d, (x1 + x2) / 2, 0, (z1 + z2) / 2, mat(tex, "#fff", [len / 2.5, WALL_H / 2.5]));
  };
  // חיצוניים
  wall(-16, -12, 4, -12, livingWall);
  wall(-16, 12, 4, 12, livingWall);
  wall(-16, -12, -16, -2, livingWall);
  wall(-16, 2, -16, 12, livingWall);
  wall(4, -12, 16, -12, kidsWall);
  wall(16, -12, 16, 0, kidsWall);
  wall(4, 12, 16, 12, kitchenWall);
  wall(16, 0, 16, 12, kitchenWall);
  // פנימיים
  wall(4, -12, 4, -3, kidsWall);
  wall(4, 3, 4, 12, kitchenWall);
  wall(4, 0, 9, 0, kidsWall);
  wall(12, 0, 16, 0, kidsWall);
  // דלת השומרים (משמאל)
  const doorMat = mat(T.wood("#7f4f24", "#582f0e", 5), "#fff");
  box(0.4, 3.4, 4, -16.3, 0, 0, doorMat, { solid: true });
  box(0.3, WALL_H - 3.4, 4, -16, 3.4, 0, mat(livingWall, "#fff", [1.6, 0.6]));

  // ---------- סלון ----------
  const red = mat(null, "#d62828");
  const redDark = mat(null, "#a4161a");
  // ספה
  box(6, 0.9, 2, -7, 0, -10.8, red, { solid: true, standable: true });
  box(6, 1.1, 0.6, -7, 0.9, -11.55, redDark, { solid: true });
  box(0.6, 1.4, 2, -10.3, 0, -10.8, redDark, { solid: true });
  box(0.6, 1.4, 2, -3.7, 0, -10.8, redDark, { solid: true });
  // כריות
  box(1.2, 0.8, 0.3, -8.6, 0.9, -11.1, mat(T.dots("#fcbf49", "#f77f00", 3), "#fff"), { solid: false });
  box(1.2, 0.8, 0.3, -5.4, 0.9, -11.1, mat(T.stripes(["#2a9d8f", "#e9c46a"]), "#fff"), { solid: false });
  // שטיח
  add(new THREE.BoxGeometry(7, 0.04, 5), mat(T.rug("#6a4c93", "#f9c74f", "#f94144"), "#fff"), [-7, 0.02, -5], { noShadow: true });
  // שולחן קפה
  const woodLight = mat(T.wood("#deb887", "#a0522d", 4), "#fff");
  box(3, 0.15, 1.6, -7, 0.75, -5, woodLight, { solid: true, standable: true });
  for (const [dx, dz] of [[-1.3, -0.65], [1.3, -0.65], [-1.3, 0.65], [1.3, 0.65]])
    box(0.15, 0.75, 0.15, -7 + dx, 0, -5 + dz, woodLight, { solid: true });
  // ספרייה
  box(1, 4, 5, -15.35, 0, 6, mat(T.books(), "#fff", [1, 1]), { solid: true });
  // טלוויזיה + מזנון
  box(4, 1, 1, -8, 0, 11.3, mat(T.wood("#495057", "#212529", 9), "#fff"), { solid: true, standable: true });
  box(3.2, 1.9, 0.2, -8, 1.1, 11.5, mat(T.tv(), "#fff"), { solid: true });
  // כורסה צהובה
  const yellow = mat(null, "#ffb703");
  box(2, 0.8, 2, -1.2, 0, -8.5, yellow, { solid: true, standable: true });
  box(2, 1.2, 0.5, -1.2, 0.8, -9.25, mat(null, "#fb8500"), { solid: true });
  // מנורה
  add(new THREE.CylinderGeometry(0.08, 0.08, 3, 8), mat(null, "#343a40"), [-14.5, 1.5, -11], { solid: true });
  add(new THREE.ConeGeometry(0.7, 0.9, 16, 1, true), mat(null, "#fefae0"), [-14.5, 3.1, -11]);
  // ארגזים
  const crateMat = mat(T.crate(), "#fff");
  box(1.4, 1.4, 1.4, 2.3, 0, 7.5, crateMat, { solid: true, standable: true });
  box(1.4, 1.4, 1.4, 2.3, 0, 9.2, crateMat, { solid: true, standable: true });
  box(1.4, 1.4, 1.4, 2.3, 1.4, 8.3, crateMat, { solid: true, standable: true });
  box(1.2, 1.2, 1.2, 0.6, 0, 10.6, crateMat, { solid: true, standable: true });
  // עציצים
  const pot = mat(null, "#bc6c25");
  const leafMat = mat(T.leaves(), "#fff");
  for (const [x, z, s] of [[-14.8, -1.2, 1], [3, -11, 1.2], [-3, 11, 1], [-14.8, 10.8, 1.3]] as const) {
    add(new THREE.CylinderGeometry(0.5 * s, 0.4 * s, 0.9 * s, 12), pot, [x, 0.45 * s, z], { solid: true });
    add(new THREE.SphereGeometry(0.95 * s, 16, 12), leafMat, [x, 1.6 * s, z], { solid: true });
  }
  // פוסטרים
  add(new THREE.PlaneGeometry(1.6, 2), mat(T.poster("#90e0ef", "#0077b6", "SEA"), "#fff"), [-12, 2.8, -11.84], { noShadow: true });
  add(new THREE.PlaneGeometry(1.6, 2), mat(T.poster("#ffcad4", "#ff006e", "LOVE"), "#fff"), [-2, 2.8, 11.84], { rotY: Math.PI, noShadow: true });

  // ---------- חדר ילדים ----------
  box(3.6, 0.9, 5, 14, 0, -9.3, mat(T.wood("#f8f9fa", "#ced4da", 6), "#fff"), { solid: true, standable: true });
  box(3.6, 0.35, 4.4, 14, 0.9, -9, mat(T.blanket(), "#fff", [1.5, 2]), { solid: true, standable: true });
  box(3, 0.4, 1, 14, 0.9, -11.5, mat(null, "#ffffff"), { solid: true });
  box(3.6, 1.8, 0.3, 14, 0, -11.9, mat(null, "#ffafcc"), { solid: true });
  // קוביות משחק
  const blockCols = ["#ef476f", "#ffd166", "#06d6a0", "#118ab2", "#8338ec", "#fb5607"];
  const blocks: [number, number, number, number][] = [
    [6, -10.5, 0, 0.9], [6.95, -10.5, 0, 0.9], [6.45, -10.5, 0.9, 0.9], [9.5, -5.5, 0, 1.1], [10.7, -5.8, 0, 0.8], [7.2, -3, 0, 1],
  ];
  blocks.forEach(([x, z, y, s], i) => box(s, s, s, x, y, z, mat(null, blockCols[i % blockCols.length]), { solid: true, standable: true }));
  // כדורים גדולים
  const ballCols = ["#e63946", "#ffb703", "#219ebc", "#8ac926", "#ff006e", "#8338ec", "#fb8500"];
  const balls: [number, number, number][] = [[11, -2, 0.7], [12.4, -2.6, 0.6], [14.6, -3.4, 0.8], [13.3, -1.4, 0.55], [8.6, -8.5, 0.65], [15, -5.2, 0.6]];
  balls.forEach(([x, z, r], i) => add(new THREE.SphereGeometry(r, 24, 16), mat(null, ballCols[i % ballCols.length]), [x, r, z], { solid: true }));
  // ארגז צעצועים
  box(2.4, 1.1, 1.3, 10, 0, -11.2, mat(T.stripes(["#8ecae6", "#219ebc"], false), "#fff"), { solid: true, standable: true });
  // שולחן קטן
  box(1.8, 0.1, 1.8, 6.5, 0.7, -6.5, mat(null, "#90be6d"), { solid: true, standable: true });
  box(0.3, 0.7, 0.3, 6.5, 0, -6.5, mat(null, "#43aa8b"), { solid: true });

  // ---------- מטבח ----------
  const counterMat = mat(null, "#264653");
  const counterTop = mat(T.checker("#adb5bd", "#dee2e6", 8), "#fff");
  box(9, 1.1, 1.2, 11, 0, 11.3, counterMat, { solid: true, standable: true });
  box(9.1, 0.1, 1.3, 11, 1.1, 11.3, counterTop, { solid: true, standable: true });
  box(1.2, 1.1, 5, 15.3, 0, 7.5, counterMat, { solid: true, standable: true });
  box(1.3, 0.1, 5.1, 15.3, 1.1, 7.5, counterTop, { solid: true, standable: true });
  // מקרר
  box(1.6, 3.4, 1.4, 15.1, 0, 1.6, mat(null, "#e9ecef"), { solid: true });
  box(0.08, 0.9, 0.1, 14.25, 2.2, 1.2, mat(null, "#6c757d"), { solid: false });
  // שולחן אוכל + כיסאות
  const tableMat = mat(T.wood("#bc8a5f", "#6f4518", 8), "#fff");
  box(3, 0.15, 2, 9.5, 1, 6, tableMat, { solid: true, standable: true });
  for (const [dx, dz] of [[-1.3, -0.8], [1.3, -0.8], [-1.3, 0.8], [1.3, 0.8]])
    box(0.15, 1, 0.15, 9.5 + dx, 0, 6 + dz, tableMat, { solid: true });
  const chairCols = ["#e76f51", "#2a9d8f", "#e9c46a", "#f4a261"];
  [[8.6, 4.4], [10.4, 4.4], [8.6, 7.6], [10.4, 7.6]].forEach(([x, z], i) => {
    box(0.9, 0.55, 0.9, x, 0, z, mat(null, chairCols[i]), { solid: true, standable: true });
    box(0.9, 0.9, 0.12, x, 0.55, z + (z < 6 ? -0.4 : 0.4), mat(null, chairCols[i]), { solid: true });
  });
  // פירות
  const fruit: [number, number, string][] = [[9, 6, "#ff595e"], [9.4, 5.8, "#ffca3a"], [9.9, 6.2, "#8ac926"], [10.2, 5.9, "#ff924c"]];
  fruit.forEach(([x, z, c]) => add(new THREE.SphereGeometry(0.2, 12, 10), mat(null, c), [x, 1.35, z]));
  // פח
  add(new THREE.CylinderGeometry(0.45, 0.4, 1.1, 14), mat(null, "#6a994e"), [5, 0.55, 11.2], { solid: true });

  // ---------- גבולות ----------
  const bounds = { minX: -15.8, maxX: 15.8, minZ: -11.8, maxZ: 11.8 };

  function groundAt(x: number, z: number, y: number, r: number) {
    let g = 0;
    for (const o of obstacles) {
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

  return {
    group, surfaces, obstacles, bounds,
    seekerDoor: new THREE.Vector3(-14.8, 0, 0),
    hiderSpawn: new THREE.Vector3(-4, 0, 2),
    groundAt, surfaceColor,
  };
}
