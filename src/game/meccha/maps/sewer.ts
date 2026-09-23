// Sewer (下水道): ביוב תעשייתי עכור — תעלה מרכזית עם מים ירקרקים, שבילי הליכה לאורך הצינורות,
// צינורות עיליים, לבנים, בטון חשוף, גרפיטי בכל מקום, חביות שמן אדומות/חלודות, שקי חול ותאורה עמומה.
import * as THREE from "three";
import * as T from "../textures";
import { Kit, grid, type World } from "./kit";

export function buildSewer(): World {
  const H = 5;
  const k = new Kit(H, 3.4);
  const conc = k.mat(k.tex("conc", () => T.concrete("#7d7e76", 4)), "#fff");
  const brick = k.mat(k.tex("sbrick", () => T.brick("#6e4a3a", "#3f3a33")), "#fff");
  const graff = k.mat(k.tex("graff1", () => T.graffiti(2)), "#fff");
  const graff2 = k.mat(k.tex("graff2", () => T.graffiti(9)), "#fff");
  const water = k.mat(null, "#3d4a2a", [1, 1], { roughness: 0.08, metalness: 0.2 });
  const rust = k.mat(k.tex("rust", () => T.noise("#8a3b12", 0.2, 11, 1600)), "#fff", [1, 1], { metalness: 0.5, roughness: 0.6 });
  const pipeMat = k.mat(null, "#5f6b5c", [1, 1], { metalness: 0.6, roughness: 0.5 });

  k.floor(-24, 24, -14, 14, conc, 4);
  k.ceiling(-24, 24, -14, 14, k.mat(conc.ptex, "#fff"), H, 4);
  // תעלה: מים + שוליים
  k.add(new THREE.BoxGeometry(48, 0.04, 5), water, [0, 0.03, 0], { noShadow: true });
  k.box(48, 0.35, 0.4, 0, 0, -2.7, conc, { solid: true, standable: true });
  k.box(48, 0.35, 0.4, 0, 0, 2.7, conc, { solid: true, standable: true });
  // גשרים מעל התעלה
  for (const x of [-14, 0, 14]) k.seat(2.4, 0.4, 5.8, x, 0, 0, k.mat(k.tex("grate", () => T.checker("#4b4f4a", "#2f322e", 8)), "#fff", [1, 2], { metalness: 0.6 }));

  // קירות חיצוניים
  k.wallX(-14, -24, 24, graff);
  k.wallX(14, -24, 24, graff2);
  k.wallZ(-24, -14, 14, brick);
  k.wallZ(24, -14, 14, brick);
  // חדרי צד (משאבות) עם פתחים
  k.wallX(-7, -24, -6, brick, [[-15, 3]]);
  k.wallZ(-6, -14, -7, brick);
  k.wallX(7, 6, 24, brick, [[15, 3]]);
  k.wallZ(6, 7, 14, brick);
  k.room("Pump Room", -24, -6, -14, -7);
  k.room("Storage", 6, 24, 7, 14);

  // צינורות עיליים לאורך המנהרה
  for (const z of [-5.5, 5.5]) {
    k.add(new THREE.CylinderGeometry(0.35, 0.35, 48, 16), pipeMat, [0, 4.2, z], { rotZ: Math.PI / 2 });
    k.add(new THREE.CylinderGeometry(0.2, 0.2, 48, 12), rust, [0, 3.5, z + (z > 0 ? 0.6 : -0.6)], { rotZ: Math.PI / 2 });
  }
  // צינורות אנכיים ושסתומים
  for (const [x, z] of [[-20, -13.6], [-10, 13.6], [4, -13.6], [18, 13.6], [12, -13.6]]) {
    k.cyl(0.3, 0.3, H, x, 0, z, pipeMat, true, 12);
    k.add(new THREE.TorusGeometry(0.35, 0.07, 6, 14), k.mat(null, "#c1121f"), [x, 1.3, z + (z > 0 ? -0.35 : 0.35)]);
  }
  // חביות שמן
  const drumRed = k.mat(null, "#9b2226", [1, 1], { metalness: 0.4, roughness: 0.5 });
  for (const [x, z, m] of [[-20, -10, drumRed], [-19.2, -10.6, rust], [-18.4, -9.8, drumRed], [10, 10, rust], [11, 10.5, drumRed], [20, -8, drumRed], [-2, 9, rust], [16, 11.5, drumRed]] as const)
    k.cyl(0.4, 0.4, 1.2, x, 0, z, m, true, 16);
  // שקי חול
  const sand = k.mat(k.tex("sand", () => T.noise("#a8946a", 0.12, 2, 1200)), "#fff");
  for (let i = 0; i < 8; i++) k.add(new THREE.SphereGeometry(0.45, 12, 8), sand, [-4 + (i % 4) * 0.8, 0.25 + Math.floor(i / 4) * 0.4, -10 + (i % 2) * 0.2], { solid: true, scale: [1, 0.5, 0.7] });
  // ארגזים ומשטחים
  const crate = k.mat(k.tex("crate", T.crate), "#fff");
  k.seat(1.3, 1.3, 1.3, 20, 0, 10, crate);
  k.seat(1.3, 1.3, 1.3, 21.4, 0, 10, crate);
  k.seat(1.3, 1.3, 1.3, -21, 0, 11, crate);
  k.seat(2, 0.2, 1.4, -8, 0, 11, k.mat(k.tex("pallet", () => T.wood("#9c7a4b", "#6b5030", 7)), "#fff"));
  // פנסים (אורות עמומים)
  const lamp = k.mat(null, "#ffe29a", [1, 1], { emissive: "#ffcf66", emissiveIntensity: 1.2 });
  for (const x of [-18, -6, 6, 18]) k.box(0.5, 0.2, 0.5, x, H - 0.25, 0, lamp, { solid: false });

  // חדר הציידים: אזור מגודר במזרח
  k.wallX(-4, 18, 24, brick);
  k.wallX(4, 18, 24, brick);
  k.wallZ(18, -4, -2.9, brick);
  k.wallZ(18, 2.9, 4, brick);
  k.gate(18, 0, 5.8, "z");
  k.room("Hunter Room", 18, 24, -4, 4);

  return k.finish({
    id: "sewer", name: "Sewer",
    bounds: { minX: -23.8, maxX: 23.8, minZ: -13.8, maxZ: 13.8 },
    hunterSpawns: grid(21, -1.5, 9, 1.1), hiderSpawns: Array.from({ length: 24 }, (_, i) => new THREE.Vector3(-8 + (i % 8) * 1.3, 0, 4 + Math.floor(i / 8) * 1.2)),
    lighting: { sky: "#0e120d", hemi: ["#b8c4a0", "#2a2418", 0.75], sun: null, fog: ["#1a1f16", 18, 48], points: [
      { pos: [-18, 4.4, 0], color: "#ffd98a", int: 22, dist: 16 },
      { pos: [-6, 4.4, 0], color: "#c8ff9a", int: 18, dist: 15 },
      { pos: [6, 4.4, 0], color: "#ffd98a", int: 22, dist: 16 },
      { pos: [18, 4.4, 0], color: "#ffb870", int: 18, dist: 15 },
      { pos: [-15, 4, -10], color: "#9affc6", int: 12, dist: 12 },
      { pos: [15, 4, 10], color: "#ffcf8a", int: 12, dist: 12 },
    ], exposure: 1.2 },
  });
}
