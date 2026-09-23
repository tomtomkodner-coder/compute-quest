// הלובי: חדר המתנה תלת־ממדי. כן ציור "PLAY" (המארח לוחץ E כדי לפתוח הגדרות ולהתחיל),
// ומשטח אדום "HUNTER" במרכז — מי שעומד עליו כשהספירה נגמרת הופך לצייד.
import * as THREE from "three";
import * as T from "../textures";
import { Kit, ring, type World } from "./kit";

export function buildLobby(): World {
  const k = new Kit(5, 3.6);
  const wall = k.mat(k.tex("lobbyWall", () => T.noise("#f3efe6", 0.05, 3)), "#fff");
  const floor = k.mat(k.tex("lobbyFloor", () => T.wood("#d9b38c", "#b08563", 12)), "#fff");
  k.floor(-11, 11, -9, 9, floor, 3);
  k.wallX(-9, -11, 11, wall);
  k.wallX(9, -11, 11, wall);
  k.wallZ(-11, -9, 9, wall);
  k.wallZ(11, -9, 9, wall);

  // משטח הציידים האדום
  const red = k.mat(null, "#d62828", [1, 1], { roughness: 0.5 });
  k.add(new THREE.CylinderGeometry(2.2, 2.2, 0.08, 40), red, [0, 0.04, 0], { noShadow: true });
  const hunterLabel = k.mat(T.signboard("#d62828", "#ffffff", "HUNTER", 256, 64), "#fff", [1, 1], { transparent: false });
  k.add(new THREE.PlaneGeometry(2.4, 0.6), hunterLabel, [0, 0.09, 1.4], { rotX: -Math.PI / 2, noShadow: true });

  // כן הציור PLAY
  const woodDark = k.mat(k.tex("easelWood", () => T.wood("#8b5a2b", "#5e3a17", 5)), "#fff");
  const px = 0, pz = -7.2;
  k.box(0.12, 2.6, 0.12, px - 0.9, 0, pz + 0.3, woodDark, { solid: false });
  k.box(0.12, 2.6, 0.12, px + 0.9, 0, pz + 0.3, woodDark, { solid: false });
  k.box(0.12, 2.8, 0.12, px, 0, pz - 0.4, woodDark, { solid: false });
  k.box(2.2, 0.1, 0.3, px, 0.9, pz + 0.3, woodDark, { solid: false });
  const canvasMat = k.mat(T.signboard("#ffffff", "#4ab7e6", "PLAY", 256, 180), "#fff");
  k.add(new THREE.BoxGeometry(2.4, 1.7, 0.08), canvasMat, [px, 1.95, pz + 0.25], { solid: true, rotX: -0.08 });
  // כפתור תכלת לפניו
  k.cyl(0.35, 0.4, 0.9, px, 0, pz + 1.3, k.mat(null, "#e9ecef"));
  k.add(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 24), k.mat(null, "#4ab7e6", [1, 1], { emissive: "#4ab7e6", emissiveIntensity: 0.5 }), [px, 0.95, pz + 1.3], { noShadow: true });

  // חפצים להתאמן עליהם בצביעה
  const cols = ["#ef476f", "#ffd166", "#06d6a0", "#118ab2", "#8338ec", "#073b4c"];
  cols.forEach((c, i) => k.seat(1, 1, 1, -9 + i * 0.1, 0, -6 + i * 2.2, k.mat(null, c)));
  k.box(0.1, 3, 5, 10.8, 1, 0, k.mat(k.tex("lobbyChecker", () => T.checker("#111111", "#ffffff", 6)), "#fff"), { solid: false });
  k.box(0.1, 3, 4, 10.8, 1, 5.5, k.mat(k.tex("lobbyStripes", () => T.stripes(["#ff5d8f", "#ffd6e0"])), "#fff"), { solid: false });
  k.box(0.1, 3, 4, 10.8, 1, -5.5, k.mat(k.tex("lobbyBooks", T.books), "#fff"), { solid: false });
  k.plant(-9.5, 7.5);
  k.plant(9.5, 7.5);
  k.seat(3, 0.5, 0.8, -4, 0, 8, woodDark);
  k.seat(3, 0.5, 0.8, 4, 0, 8, woodDark);

  return k.finish({
    id: "lobby", name: "Lobby",
    bounds: { minX: -10.8, maxX: 10.8, minZ: -8.8, maxZ: 8.8 },
    hunterSpawns: ring(0, 3, 4, 8), hiderSpawns: ring(0, 3, 4, 24),
    lobby: { play: new THREE.Vector3(px, 0, pz + 1.3), pad: { x: 0, z: 0, r: 2.2 } },
    lighting: { sky: "#cfe8ff", hemi: ["#ffffff", "#c8a888", 1.3], sun: { color: "#fff4e0", int: 1.6, pos: [-8, 20, 6] }, points: [] },
  });
}
