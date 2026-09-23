// Indoor Country (屋内カントリー): חוות־אולם חמימה — קיר שמיים מצויר עם עננים, קרטוני פרות ותרנגולות,
// חבילות קש, אסם עם דלתות אדומות, דלעות וירקות, גדרות עץ, קישוטי עננים, ארגזים ואוהל קרקס.
import * as THREE from "three";
import * as T from "../textures";
import { Kit, grid, type World } from "./kit";

export function buildCountry(): World {
  const k = new Kit(9, 4);
  const sky = k.mat(k.tex("skymural", T.skyMural), "#fff");
  const grass = k.mat(k.tex("grass", () => T.noise("#79b84a", 0.1, 3, 2600)), "#fff");
  const dirt = k.mat(k.tex("dirt", () => T.noise("#a8794c", 0.1, 6, 1800)), "#fff");
  const wood = k.mat(k.tex("cwood", () => T.wood("#b98552", "#7a5230", 2)), "#fff");
  k.floor(-22, 22, -16, 16, grass, 4);
  k.add(new THREE.BoxGeometry(10, 0.03, 30), k.mat(dirt.ptex, "#fff", [2.5, 7]), [0, 0.015, 0], { noShadow: true });
  // קירות השמיים המצוירים (בלי פתחים)
  const mural = (w: number) => k.mat(sky.ptex, "#fff", [w / 22, 1]);
  k.box(44, 9, 0.3, 0, 0, -16, mural(44));
  k.box(44, 9, 0.3, 0, 0, 16, mural(44));
  k.box(0.3, 9, 32, -22, 0, 0, mural(32));
  k.box(0.3, 9, 32, 22, 0, 0, mural(32));

  // אסם עם דלתות אדומות (צפון)
  const barn = k.mat(k.tex("barn", T.barnRed), "#fff");
  const barnWall = k.mat(null, "#a4161a");
  k.box(3.4, 5, 0.3, -14.3, 0, -8, barnWall);
  k.box(3.4, 5, 0.3, -7.7, 0, -8, barnWall);
  k.box(3.2, 1.4, 0.3, -11, 3.6, -8, barnWall, { solid: false });
  k.box(0.3, 5, 7.7, -16, 0, -11.9, barnWall);
  k.box(0.3, 5, 7.7, -6, 0, -11.9, barnWall);
  // דלתות האסם האדומות פתוחות לצדדים
  k.box(1.6, 3.6, 0.1, -13.6, 0, -7.75, barn, { solid: false });
  k.box(1.6, 3.6, 0.1, -8.4, 0, -7.75, barn, { solid: false });
  k.box(10.6, 0.3, 8.3, -11, 5, -11.9, k.mat(null, "#6d2e17"), { solid: false });
  // קש בתוך האסם ובחוץ
  const hay = k.mat(k.tex("hay", T.hay), "#fff");
  for (const [x, z, y] of [[-14, -14, 0], [-12.8, -14, 0], [-13.4, -14, 0.9], [-8, -14.5, 0], [-2, -12, 0], [-0.8, -12, 0], [3, 10, 0], [4.2, 10, 0], [3.6, 10, 0.9]])
    k.seat(1.1, 0.9, 0.8, x, y, z, hay);
  // גדרות
  const fence = (x1: number, x2: number, z: number) => {
    for (let x = x1; x <= x2; x += 1.5) k.box(0.15, 1.1, 0.15, x, 0, z, wood);
    k.box(x2 - x1, 0.12, 0.08, (x1 + x2) / 2, 0.8, z, wood, { solid: true });
    k.box(x2 - x1, 0.12, 0.08, (x1 + x2) / 2, 0.4, z, wood, { solid: false });
  };
  fence(6, 18, -4);
  fence(-18, -8, 5);
  fence(6, 12, 6);
  // קרטוני פרות ותרנגולות
  const cow = k.mat(T.standee("cow"), "#fff", [1, 1], { transparent: true });
  const chick = k.mat(T.standee("chicken"), "#fff", [1, 1], { transparent: true });
  for (const [x, z, ry] of [[10, -8, 0.3], [14, -10, -0.4], [16, -6, 0.1]] as const) k.add(new THREE.PlaneGeometry(2.4, 2.4), cow, [x, 1.2, z], { rotY: ry, solid: true });
  for (const [x, z, ry] of [[-14, 8, 0.4], [-12, 10, -0.2], [-10, 7.5, 0.8], [-16, 11, 0]] as const) k.add(new THREE.PlaneGeometry(1.2, 1.2), chick, [x, 0.6, z], { rotY: ry, solid: true });
  // דלעות וירקות
  const pumpkin = k.mat(null, "#f77f00", [1, 1], { roughness: 0.6 });
  for (let i = 0; i < 7; i++) {
    const x = 2 + (i % 4) * 1.4, z = 12.2 + Math.floor(i / 4) * 1.4, s = 0.4 + (i % 3) * 0.12;
    k.add(new THREE.SphereGeometry(s, 16, 10), pumpkin, [x, s * 0.8, z], { solid: true, scale: [1.2, 0.8, 1.2] });
    k.cyl(0.05, 0.05, 0.2, x, s * 1.4, z, k.mat(null, "#386641"), false, 6);
  }
  for (let i = 0; i < 6; i++) k.cone(0.12, 0.5, 8 + (i % 3) * 0.6, 0, 13.5 + Math.floor(i / 3) * 0.8, k.mat(null, "#fb8500"), false);
  // ארגזים
  const crate = k.mat(k.tex("crate", T.crate), "#fff");
  k.seat(1.4, 1.4, 1.4, 18, 0, 2, crate);
  k.seat(1.4, 1.4, 1.4, 19.5, 0, 2, crate);
  k.seat(1.4, 1.4, 1.4, 18.7, 1.4, 2, crate);
  k.seat(1.2, 1.2, 1.2, -19, 0, -2, crate);
  // אוהל קרקס (דרום־מערב)
  const stripe = k.mat(k.tex("circus", () => T.stripes(["#e63946", "#ffffff"])), "#fff", [4, 1]);
  k.add(new THREE.CylinderGeometry(4, 4, 3, 24, 1, true), stripe, [-13, 1.5, 11], { solid: false });
  k.add(new THREE.ConeGeometry(4.4, 2.6, 24), stripe, [-13, 4.3, 11]);
  k.cyl(0.12, 0.12, 5.6, -13, 0, 11, k.mat(null, "#ffd166"), true);
  // קישוטי עננים תלויים
  const cloud = k.mat(null, "#ffffff", [1, 1], { roughness: 1 });
  for (const [x, y, z] of [[-4, 7, -6], [6, 7.5, 4], [12, 6.8, -12], [-8, 7.2, 10], [0, 7.8, 12]] as const)
    for (let i = 0; i < 4; i++) k.ball(0.6 + (i % 2) * 0.2, x + i * 0.7, y + Math.sin(i) * 0.2, z, cloud);
  // טרקטור / עגלה
  k.seat(3, 1.2, 1.8, 13, 0, 0, k.mat(null, "#2b9348"));
  k.box(1.2, 1.2, 1.6, 12, 1.2, 0, k.mat(null, "#2b9348"));

  // חדר הציידים = מחסן עץ (דרום־מזרח)
  k.box(10, 5, 0.3, 17, 0, 9, k.fit(wood, 10, 5));
  k.box(0.3, 5, 2.5, 12, 0, 10.25, wood);
  k.box(0.3, 5, 2.5, 12, 0, 14.75, wood);
  k.gate(12, 12.5, 2, "z");
  k.room("Hunter Room", 12, 22, 9, 16);
  k.room("Barn", -16, -6, -16, -8);
  k.room("Circus", -17, -9, 7, 15);

  return k.finish({
    id: "country", name: "Indoor Country",
    bounds: { minX: -21.8, maxX: 21.8, minZ: -15.8, maxZ: 15.8 },
    hunterSpawns: grid(17, 11, 9), hiderSpawns: Array.from({ length: 24 }, (_, i) => new THREE.Vector3(-3 + (i % 6) * 1.2, 0, -2 + Math.floor(i / 6) * 1.2)),
    lighting: { sky: "#9fd3ff", hemi: ["#fff8e7", "#6f8f3a", 1.35], sun: { color: "#fff0d0", int: 1.8, pos: [-10, 30, 12] }, points: [] },
  });
}
