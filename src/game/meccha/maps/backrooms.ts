// Backrooms (バックルーム): טפט צהוב חד־גוני, שטיח קרם לח, תאורת פלורסנט מזמזמת כמעט בלי צללים,
// עמודים, ריהוט משרדי דליל, כיסאות מוערמים, מכונות משקאות, אופניים על קיר, שלטי יציאה,
// שולחן יום הולדת עם בלונים, קטע כביש שבור עם ניידת משטרה, ואזור מלא אסלות.
import * as THREE from "three";
import * as T from "../textures";
import { Kit, grid, type World } from "./kit";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function buildBackrooms(): World {
  const H = 3.2;
  const k = new Kit(H, 3.2);
  const wall = k.mat(k.tex("brwall", T.backroomsWall), "#fff", [1, 1], { roughness: 0.9 });
  const carpet = k.mat(k.tex("brcarpet", () => T.noise("#d9d29a", 0.07, 5, 2200)), "#fff");
  const ceil = k.mat(k.tex("brceil", () => T.tiles("#d8d2b0", "#cfc8a3", 4, "rgba(80,70,30,0.25)")), "#fff");
  k.floor(-22, 22, -22, 22, carpet, 3);
  k.ceiling(-22, 22, -22, 22, ceil, H, 2);
  // מסגרת חיצונית
  k.wallX(-22, -22, 22, wall);
  k.wallX(22, -22, 22, wall);
  k.wallZ(-22, -22, 22, wall);
  k.wallZ(22, -22, 22, wall);

  // מבוך דליל של קירות (4 מטר לתא)
  const r = rng(7);
  const keepOut = (x: number, z: number) =>
    (x > 10 && z > 10) || (x < -12 && z < -12) || (Math.abs(x) < 6 && Math.abs(z) < 6) || (x > 8 && z < -10) || (x < -10 && z > 10);
  for (let gx = -20; gx <= 20; gx += 4)
    for (let gz = -20; gz <= 20; gz += 4) {
      if (keepOut(gx, gz)) continue;
      const v = r();
      if (v < 0.22) k.box(4, H, 0.3, gx + 2, 0, gz, k.fit(wall, 4, H));
      else if (v < 0.44) k.box(0.3, H, 4, gx, 0, gz + 2, k.fit(wall, 4, H));
      else if (v < 0.52) k.box(0.9, H, 0.9, gx, 0, gz, k.fit(wall, 0.9, H));
    }

  // תאורת פלורסנט
  const tube = k.mat(k.tex("tube", T.fluorescent), "#fff", [1, 1], { emissive: "#fff6cf", emissiveIntensity: 1.1 });
  for (let x = -18; x <= 18; x += 6)
    for (let z = -18; z <= 18; z += 6) k.add(new THREE.PlaneGeometry(1.2, 0.6), tube, [x, H - 0.01, z], { rotX: Math.PI / 2, noShadow: true });

  // אזור משרדי במרכז: שולחנות, כיסאות מוערמים, מכונת משקאות
  const desk = k.mat(null, "#9c8f6a");
  const chair = k.mat(null, "#6b6147");
  k.seat(2.4, 0.8, 1.2, -2.5, 0, -2, desk);
  k.seat(2.4, 0.8, 1.2, 2.5, 0, 2, desk);
  for (let i = 0; i < 4; i++) k.seat(0.7, 0.45, 0.7, -3.5, i * 0.45, 3, chair);
  k.box(1.2, 2.2, 0.9, 4.5, 0, -4.5, k.mat(null, "#b8342a", [1, 1], { roughness: 0.4 }));
  k.panel(0.9, 1.2, 4.5, 1.3, -4.04, k.mat(k.tex("vend", () => T.dots("#1d1d1d", "#ffd166", 4)), "#fff"));
  k.box(1.2, 2.2, 0.9, 5.8, 0, -4.5, k.mat(null, "#2a6fb0", [1, 1], { roughness: 0.4 }));
  // שלטי יציאה
  const exitSign = k.mat(T.signboard("#1e9e4a", "#ffffff", "EXIT", 128, 48), "#fff", [1, 1], { emissive: "#1e9e4a", emissiveIntensity: 0.6 });
  for (const [x, z, ry] of [[-21.8, 0, Math.PI / 2], [21.8, 6, -Math.PI / 2], [0, 21.8, Math.PI]] as const) k.panel(0.9, 0.34, x, 2.8, z, exitSign, ry);

  // קיר האופניים
  const bike = (x: number, y: number, z: number, c: string) => {
    const m = k.mat(null, c, [1, 1], { metalness: 0.5, roughness: 0.4 });
    for (const dx of [-0.45, 0.45]) k.add(new THREE.TorusGeometry(0.32, 0.04, 6, 20), m, [x + dx, y, z], { noShadow: false });
    k.box(0.9, 0.05, 0.05, x, y + 0.2, z, m, { solid: false });
  };
  for (let i = 0; i < 4; i++) bike(-18 + i * 1.3, 1.6, 21.75, ["#e63946", "#1d3557", "#2a9d8f", "#f4a261"][i]);

  // שולחן יום הולדת עם בלונים (פינה דרום־מערבית)
  k.seat(4, 0.8, 1.4, -16, 0, 16, k.mat(k.tex("tablecloth", () => T.checker("#ffffff", "#ff5c8a", 8)), "#fff"));
  k.cyl(0.35, 0.35, 0.3, -16, 0.8, 16, k.mat(null, "#fff1e6"), false);
  ["#ff006e", "#ffbe0b", "#3a86ff", "#8338ec", "#06d6a0", "#fb5607"].forEach((c, i) => {
    const bx = -18 + i * 0.8, bz = 14.5 + (i % 2) * 0.6;
    k.ball(0.32, bx, 2.2 + (i % 3) * 0.2, bz, k.mat(null, c, [1, 1], { roughness: 0.2 }));
    k.box(0.01, 1.6, 0.01, bx, 0.6, bz, k.mat(null, "#ffffff"), { solid: false });
  });

  // כביש שבור עם ניידת (פינה צפון־מזרחית)
  k.add(new THREE.BoxGeometry(10, 0.12, 5), k.mat(k.tex("asph", T.asphalt), "#fff", [2, 1]), [16, 0.06, 16], { solid: true, standable: true, noShadow: true });
  for (let i = 0; i < 4; i++) k.add(new THREE.BoxGeometry(1, 0.01, 0.2), k.mat(null, "#f1faee"), [12 + i * 2.5, 0.13, 16], { noShadow: true });
  const police = (x: number, z: number) => {
    k.seat(3.6, 0.8, 1.7, x, 0.2, z, k.mat(null, "#f8f9fa", [1, 1], { roughness: 0.3 }));
    k.box(2, 0.6, 1.5, x - 0.2, 1, z, k.mat(null, "#111111", [1, 1], { roughness: 0.2 }));
    k.box(0.5, 0.15, 0.4, x - 0.2, 1.6, z, k.mat(null, "#e63946", [1, 1], { emissive: "#e63946", emissiveIntensity: 0.8 }), { solid: false });
    for (const [dx, dz] of [[-1.2, -0.85], [1.2, -0.85], [-1.2, 0.85], [1.2, 0.85]])
      k.add(new THREE.CylinderGeometry(0.35, 0.35, 0.25, 16), k.mat(null, "#1b1b1b"), [x + dx, 0.35, z + dz], { rotX: Math.PI / 2 });
  };
  police(15, 15.5);
  k.cyl(0.05, 0.05, 2.2, 19, 0, 19, k.mat(null, "#adb5bd"), false);
  k.add(new THREE.CircleGeometry(0.4, 3), k.mat(null, "#ffbe0b"), [19, 2.2, 19.01], { noShadow: true });

  // אזור האסלות (פינה צפון־מערבית)
  const porcelain = k.mat(null, "#fbfbf7", [1, 1], { roughness: 0.15 });
  for (let i = 0; i < 12; i++) {
    const x = -20 + (i % 4) * 1.6, z = -20 + Math.floor(i / 4) * 2;
    k.seat(0.7, 0.45, 0.9, x, 0, z, porcelain);
    k.box(0.75, 0.8, 0.25, x, 0.45, z - 0.45, porcelain);
  }
  // שקיות אשפה
  for (let i = 0; i < 5; i++) k.ball(0.45, 10 + i * 0.7, 0.4, -16 + (i % 2) * 0.6, k.mat(k.tex("trash", T.trashBag), "#fff", [1, 1], { roughness: 0.3 }), true);

  // חדר הציידים (דרום־מזרח)
  k.wallX(-10, 10, 22, wall, [[16, 3]]);
  k.wallZ(10, -22, -10, wall);
  k.gate(16, -10, 3, "x");
  k.room("Hunter Room", 10, 22, -22, -10);
  k.room("Party", -22, -10, 10, 22);
  k.room("Road", 10, 22, 10, 22);
  k.room("Toilets", -22, -12, -22, -12);

  return k.finish({
    id: "backrooms", name: "Backrooms",
    bounds: { minX: -21.8, maxX: 21.8, minZ: -21.8, maxZ: 21.8 },
    hunterSpawns: grid(16, -18, 9), hiderSpawns: Array.from({ length: 24 }, (_, i) => new THREE.Vector3(-3 + (i % 6) * 1.2, 0, -1 + Math.floor(i / 6) * 1.2)),
    lighting: { sky: "#5d562c", hemi: ["#fff6cf", "#b8ac6a", 2.1], sun: null, points: [
      { pos: [0, 3, 0], color: "#fff3c4", int: 18, dist: 16 },
      { pos: [-14, 3, 14], color: "#fff3c4", int: 14, dist: 14 },
      { pos: [14, 3, -14], color: "#fff3c4", int: 14, dist: 14 },
    ], exposure: 1.1 },
  });
}
