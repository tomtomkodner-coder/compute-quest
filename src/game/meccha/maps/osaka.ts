// Osaka (大阪): המפה הקטנה ביותר — בלוק רחוב יפני עם משאית גדולה, שלטים ופסלי תמנון (טאקויאקי),
// שקיות אשפה, ערימות דיקט, ארגזים, חזיתות חנויות פתוחות, סמטאות, צינורות ושלטים גבוהים.
import * as THREE from "three";
import * as T from "../textures";
import { Kit, grid, type World } from "./kit";

export function buildOsaka(): World {
  const k = new Kit(7, 3.4);
  const asphalt = k.mat(k.tex("oasph", T.asphalt), "#fff");
  const side = k.mat(k.tex("oside", () => T.tiles("#b9b4aa", "#a8a397", 4)), "#fff");
  const shutter = k.mat(k.tex("shutter", T.shutter), "#fff", [1, 1], { metalness: 0.4 });
  k.floor(-16, 16, -12, 12, side, 3);
  k.add(new THREE.BoxGeometry(32, 0.04, 8), k.mat(asphalt.ptex, "#fff", [8, 2]), [0, 0.02, 0], { noShadow: true });
  for (let i = 0; i < 7; i++) k.add(new THREE.BoxGeometry(2, 0.01, 0.25), k.mat(null, "#f1faee"), [-13 + i * 4.3, 0.05, 0], { noShadow: true });

  // חזיתות חנויות (צפון ודרום)
  const shop = (x: number, z: number, face: 1 | -1, bg: string, fg: string, text: string, open: boolean) => {
    const wall = k.mat(null, bg);
    k.box(6, 7, 0.3, x, 0, z, wall);
    if (!open) k.box(4.6, 2.8, 0.1, x, 0, z + face * 0.2, shutter, { solid: false });
    else {
      k.seat(4, 1, 1, x, 0, z + face * 1.2, k.mat(null, "#6f4518"));
      for (let i = 0; i < 5; i++) k.ball(0.22, x - 1.5 + i * 0.75, 1.2, z + face * 1.2, k.mat(null, "#c8792f"));
    }
    k.panel(5, 1.3, x, 4, z + face * 0.17, k.mat(T.signboard(fg, bg, text), "#fff"), face === 1 ? 0 : Math.PI);
    // מרזב/סוכך
    k.box(6, 0.12, 1.4, x, 3.2, z + face * 0.7, k.mat(null, fg), { solid: false });
  };
  shop(-12, -12, 1, "#d62828", "#fff3b0", "たこ焼", true);
  shop(-6, -12, 1, "#264653", "#e9c46a", "大阪", false);
  shop(0, -12, 1, "#f4a261", "#1d3557", "お好み焼", true);
  shop(6, -12, 1, "#2a9d8f", "#ffffff", "ラーメン", false);
  shop(12, -12, 1, "#e76f51", "#ffffff", "串カツ", true);
  shop(-12, 12, -1, "#6d597a", "#ffd6ff", "喫茶", false);
  shop(-6, 12, -1, "#bc4749", "#f2e8cf", "居酒屋", true);
  shop(6, 12, -1, "#003049", "#fcbf49", "薬", false);
  shop(12, 12, -1, "#9b2226", "#ffffff", "寿司", true);
  k.wallZ(-16, -12, 12, k.mat(k.tex("obrick", () => T.brick("#8d6e63", "#5d4037")), "#fff"));
  k.wallZ(16, -12, 12, k.mat(k.tex("obrick", () => T.brick("#8d6e63", "#5d4037")), "#fff"));
  // סמטה (0,12) — חדר הציידים מאחורי שער
  k.box(0.3, 7, 4, -3, 0, 10, k.mat(null, "#495057"));
  k.box(0.3, 7, 4, 3, 0, 10, k.mat(null, "#495057"));
  k.gate(0, 8, 6, "x");
  k.room("Hunter Room", -3, 3, 8, 12);

  // משאית גדולה
  const truck = k.mat(null, "#e9ecef", [1, 1], { roughness: 0.4 });
  k.seat(7, 2.4, 2.4, -3, 0.8, 1.2, truck);
  k.box(2, 2.2, 2.4, 1.6, 0.8, 1.2, k.mat(null, "#1d3557"));
  k.box(1.6, 0.9, 0.05, 1.6, 2.1, -0.02, k.mat(null, "#9ad1f5", [1, 1], { metalness: 0.8, roughness: 0.1 }), { solid: false });
  for (const dx of [-5.5, -3.5, 1.5]) for (const dz of [0.05, 2.35])
    k.add(new THREE.CylinderGeometry(0.45, 0.45, 0.35, 16), k.mat(null, "#111111"), [dx, 0.45, dz], { rotX: Math.PI / 2 });
  // פסל תמנון (טאקו)
  const octo = (x: number, z: number, s: number, fallen = false) => {
    const m = k.mat(null, "#e63946", [1, 1], { roughness: 0.4 });
    k.add(new THREE.SphereGeometry(0.9 * s, 20, 14), m, [x, (fallen ? 0.9 : 1.8) * s, z], { solid: true, scale: [1, 1.1, 1] });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      k.add(new THREE.CylinderGeometry(0.12 * s, 0.2 * s, 1.2 * s, 8), m, [x + Math.cos(a) * 0.6 * s, (fallen ? 0.3 : 0.6) * s, z + Math.sin(a) * 0.6 * s], { rotZ: Math.cos(a) * 0.5, rotX: Math.sin(a) * 0.5 });
    }
    k.ball(0.18 * s, x - 0.3 * s, (fallen ? 1.1 : 2) * s, z + 0.8 * s, k.mat(null, "#ffffff"));
    k.ball(0.18 * s, x + 0.3 * s, (fallen ? 1.1 : 2) * s, z + 0.8 * s, k.mat(null, "#ffffff"));
  };
  octo(-12, -8, 1.3);
  octo(10, 6, 0.9, true);
  octo(13, -7, 0.7);
  // שקיות אשפה, דיקט, ארגזים
  for (let i = 0; i < 7; i++) k.ball(0.45, 14 + (i % 3) * 0.6, 0.38, 9 - Math.floor(i / 3) * 0.7, k.mat(k.tex("trash", T.trashBag), "#fff", [1, 1], { roughness: 0.3 }), true);
  const ply = k.mat(k.tex("ply", () => T.wood("#d4b483", "#b08d57", 13)), "#fff");
  for (let i = 0; i < 5; i++) k.seat(2.4, 0.08, 1.2, -13, i * 0.08, 7, ply);
  k.box(0.08, 2.4, 1.2, -14.8, 0, 5, ply);
  const crate = k.mat(k.tex("crate", T.crate), "#fff");
  k.seat(1.2, 1.2, 1.2, 8, 0, -8.5, crate);
  k.seat(1.2, 1.2, 1.2, 9.3, 0, -8.5, crate);
  k.seat(1.2, 1.2, 1.2, 8.6, 1.2, -8.5, crate);
  // פנסים אדומים
  const lantern = k.mat(null, "#e63946", [1, 1], { emissive: "#ff4d4d", emissiveIntensity: 0.6 });
  for (let i = 0; i < 8; i++) {
    k.add(new THREE.SphereGeometry(0.35, 14, 10), lantern, [-14 + i * 4, 3.9, -10.4], { scale: [1, 1.3, 1] });
    k.add(new THREE.SphereGeometry(0.35, 14, 10), lantern, [-14 + i * 4, 3.9, 10.4], { scale: [1, 1.3, 1] });
  }
  // צינורות ומזגנים על הקירות
  const pipe = k.mat(null, "#8d99ae", [1, 1], { metalness: 0.5 });
  for (const x of [-9, 3, 9]) k.cyl(0.12, 0.12, 7, x, 0, -11.75, pipe, false, 8);
  for (const x of [-9, 3]) k.box(1, 0.7, 0.5, x + 1.3, 2.2, 11.6, k.mat(null, "#e9ecef"));
  // שלט גבוה
  k.cyl(0.15, 0.15, 5, 15, 0, -2, pipe, true, 8);
  k.add(new THREE.BoxGeometry(0.2, 2.4, 1.4), k.mat(T.signboard("#ffbe0b", "#d62828", "大阪", 128, 256), "#fff"), [15, 5.2, -2]);
  // מכונת משקאות
  k.box(1.2, 2, 0.8, -15.3, 0, -3, k.mat(null, "#1976d2", [1, 1], { roughness: 0.3 }));

  return k.finish({
    id: "osaka", name: "Osaka",
    bounds: { minX: -15.8, maxX: 15.8, minZ: -11.4, maxZ: 11.4 },
    hunterSpawns: grid(0, 9.5, 9, 1.1), hiderSpawns: Array.from({ length: 24 }, (_, i) => new THREE.Vector3(-8 + (i % 8) * 1.3, 0, -4 + Math.floor(i / 8) * 1.1)),
    lighting: { sky: "#1e2a4a", hemi: ["#ffe8d6", "#3d405b", 1.2], sun: { color: "#ffd6a5", int: 1.4, pos: [12, 26, -8] }, points: [
      { pos: [-6, 4, -8], color: "#ff8a5c", int: 16, dist: 14 },
      { pos: [8, 4, 8], color: "#8ab6ff", int: 14, dist: 14 },
    ] },
  });
}
