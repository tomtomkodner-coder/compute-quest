// Hide-and-Seek Mansion (かくれんぼの屋敷): אולם עמודים עם פסל סוס ממתכת כהה, ספרייה, מטבח תעשייתי
// עם פוסטרים ומדפים, חדר כביסה (סלים, חבלי כביסה), אולם נשפים, חדר אמבטיה מרוצף, מסדרון ציורים
// עם קשתות עץ, ורצפות משובצות. חדר הציידים נפתח לאולם.
import * as THREE from "three";
import * as T from "../textures";
import { Kit, grid, type World } from "./kit";

export function buildMansion(): World {
  const k = new Kit(6, 3.8);
  const woodDark = k.mat(k.tex("wd", () => T.wood("#5a3a1e", "#3b2412", 3)), "#fff");
  const woodMid = k.mat(k.tex("wm", () => T.wood("#8a5a30", "#5a3a1e", 4)), "#fff");
  const woodLight = k.mat(k.tex("wl", () => T.wood("#c9985f", "#8a5a30", 8)), "#fff");

  // ---------- רצפות ----------
  k.floor(-8, 8, -8, 8, k.mat(k.tex("chk", () => T.checker("#e8e2d4", "#23242b", 2)), "#fff"), 4);
  k.floor(-24, -8, -18, 0, woodDark, 4);
  k.floor(-24, -8, 0, 18, k.mat(k.tex("kitfloor", () => T.tiles("#bfc3c7", "#a5aab0", 6)), "#fff"), 4);
  k.floor(8, 24, -18, -4, k.mat(k.tex("bathfloor", () => T.tiles("#ffffff", "#1d3557", 8)), "#fff"), 3);
  k.floor(8, 24, -4, 4, woodMid, 4);
  k.floor(8, 24, 4, 18, k.mat(k.tex("laundryfloor", () => T.tiles("#d8d2c4", "#c7bfae", 4)), "#fff"), 4);
  k.floor(-8, 8, -18, -8, k.mat(k.tex("ballfloor", () => T.checker("#caa472", "#7d5a36", 4)), "#fff"), 4);
  k.floor(-8, 8, 8, 18, k.mat(k.tex("hunterfloor", () => T.tiles("#6c757d", "#495057", 4)), "#fff"), 4);

  // ---------- קירות ----------
  const hallWall = k.mat(k.tex("hallw", () => T.damask("#3d2f3a", "#4b3a47")), "#fff");
  const libWall = k.mat(k.tex("libw", () => T.damask("#233d2e", "#2c4a38")), "#fff");
  const kitWall = k.mat(k.tex("kitw", () => T.tiles("#eeeeee", "#e2e2e2", 6, "rgba(0,0,0,0.12)")), "#fff");
  const bathWall = k.mat(k.tex("bathw", () => T.tiles("#cfe8ef", "#9ccbd9", 10)), "#fff");
  const corrWall = k.mat(k.tex("corrw", () => T.stripes(["#6d4c5c", "#5c3f4d"])), "#fff");
  const laundryWall = k.mat(k.tex("laundw", () => T.stripes(["#e9dcc4", "#dccdb2"])), "#fff");
  const ballWall = k.mat(k.tex("ballw", () => T.damask("#7a1f2b", "#8c2a36")), "#fff");
  const hunterWall = k.mat(k.tex("huntw", () => T.brick("#6c757d", "#495057")), "#fff");

  k.wallX(-18, -24, -8, libWall);
  k.wallX(-18, -8, 8, ballWall);
  k.wallX(-18, 8, 24, bathWall);
  k.wallX(18, -24, -8, kitWall);
  k.wallX(18, -8, 8, hunterWall);
  k.wallX(18, 8, 24, laundryWall);
  k.wallZ(-24, -18, 0, libWall);
  k.wallZ(-24, 0, 18, kitWall);
  k.wallZ(24, -18, -4, bathWall);
  k.wallZ(24, -4, 4, corrWall);
  k.wallZ(24, 4, 18, laundryWall);
  k.wallZ(-8, -18, 0, hallWall, [[-4, 3.2]], woodMid);
  k.wallZ(-8, 0, 18, hallWall, [[4, 3.2]], woodMid);
  k.wallX(0, -24, -8, libWall, [[-16, 3.2]], woodMid);
  k.wallZ(8, -18, 0, hallWall, [[0, 3.6]], woodMid);
  k.wallZ(8, 0, 18, hallWall);
  k.wallX(-8, -8, 8, hallWall, [[0, 4]], woodMid);
  k.wallX(8, -8, 8, hallWall, [[0, 4]], woodMid);
  k.wallX(-4, 8, 24, corrWall, [[16, 3.2]], woodMid);
  k.wallX(4, 8, 24, corrWall, [[16, 3.2]], woodMid);
  k.gate(0, 8, 4, "x");

  k.room("Main Hall", -8, 8, -8, 8);
  k.room("Library", -24, -8, -18, 0);
  k.room("Kitchen", -24, -8, 0, 18);
  k.room("Bathroom", 8, 24, -18, -4);
  k.room("Gallery", 8, 24, -4, 4);
  k.room("Laundry", 8, 24, 4, 18);
  k.room("Ballroom", -8, 8, -18, -8);
  k.room("Hunter Room", -8, 8, 8, 18);

  // ---------- אולם העמודים ----------
  const pillar = k.mat(k.tex("marble", () => T.marble("#f3eee4", "#bdb3a2", 2)), "#fff", [1, 2]);
  for (const [x, z] of [[-4.5, -4.5], [4.5, -4.5], [-4.5, 4.5], [4.5, 4.5]]) {
    k.box(1.5, 0.4, 1.5, x, 0, z, pillar);
    k.cyl(0.55, 0.6, 5.2, x, 0.4, z, pillar, true, 20);
    k.box(1.4, 0.4, 1.4, x, 5.6, z, pillar, { solid: false });
  }
  k.add(new THREE.BoxGeometry(5, 0.04, 12), k.mat(k.tex("hallrug", () => T.rug("#7f0000", "#c9a227", "#4a0000")), "#fff", [1, 2.4]), [0, 0.02, 0], { noShadow: true });
  // פסל הסוס ממתכת כהה על כן
  const metal = k.mat(null, "#2e2f33", [1, 1], { metalness: 0.8, roughness: 0.35 });
  k.seat(3, 1, 1.6, 0, 0, 0, pillar);
  const hb = (w: number, h: number, d: number, x: number, y: number, z: number, rz = 0) =>
    k.add(new THREE.BoxGeometry(w, h, d), metal, [x, y, z], { rotZ: rz });
  hb(1.9, 0.75, 0.7, 0, 1.95, 0);
  hb(0.35, 0.95, 0.4, 0.95, 2.45, 0, -0.5);
  hb(0.75, 0.32, 0.34, 1.35, 2.85, 0, -0.3);
  hb(0.12, 0.25, 0.12, 1.2, 3.08, 0.1);
  hb(0.12, 0.25, 0.12, 1.2, 3.08, -0.1);
  for (const [x, z] of [[-0.75, 0.22], [-0.75, -0.22], [0.75, 0.22], [0.75, -0.22]]) hb(0.18, 0.95, 0.18, x, 1.2, z);
  hb(0.14, 0.8, 0.14, -1.05, 1.8, 0, 0.5);
  k.obstacles.push({ minX: -1.1, maxX: 1.6, minZ: -0.4, maxZ: 0.4, bottom: 1, top: 3.2, standable: false, enabled: true });
  // אגרטלים וספסלים
  const vase = (x: number, z: number, c: string) => { k.cyl(0.3, 0.2, 0.9, x, 0, z, k.mat(null, c, [1, 1], { roughness: 0.3 })); k.ball(0.28, x, 1.05, z, k.mat(null, c, [1, 1], { roughness: 0.3 })); };
  vase(-7, -7, "#1d3557");
  vase(7, -7, "#e9c46a");
  vase(-7, 7, "#2a9d8f");
  vase(7, 7, "#9b2226");
  k.seat(2.4, 0.5, 0.7, -6.8, 0, -1.8, woodMid);
  k.seat(2.4, 0.5, 0.7, 6.8, 0, 1.8, woodMid);

  // ---------- ספרייה ----------
  const books = k.mat(k.tex("books", T.books), "#fff");
  for (const z of [-16, -11.5, -7, -2.5]) k.box(0.9, 4.2, 4, -23.4, 0, z, books);
  for (const x of [-20, -15.5, -11]) k.box(4, 4.2, 0.9, x, 0, -17.4, books);
  k.box(0.9, 3.2, 3.5, -15, 0, -9, books);
  k.box(0.9, 3.2, 3.5, -15, 0, -4.5, books);
  k.seat(3.2, 0.15, 1.8, -19, 0.95, -8, woodLight);
  for (const [dx, dz] of [[-1.4, -0.7], [1.4, -0.7], [-1.4, 0.7], [1.4, 0.7]]) k.box(0.15, 0.95, 0.15, -19 + dx, 0, -8 + dz, woodLight);
  const leather = k.mat(null, "#5c2e1a", [1, 1], { roughness: 0.5 });
  k.seat(1.8, 0.7, 1.8, -12, 0, -14.8, leather);
  k.box(1.8, 1.3, 0.45, -12, 0.7, -15.5, leather);
  k.box(0.4, 1.1, 1.8, -12.9, 0, -14.8, leather);
  k.box(0.4, 1.1, 1.8, -11.1, 0, -14.8, leather);
  k.cyl(0.08, 0.3, 1, -20.5, 0, -2, woodDark, true, 10);
  k.ball(0.5, -20.5, 1.45, -2, k.mat(k.tex("globe", () => T.dots("#4ea8de", "#80b918", 3)), "#fff"));
  k.add(new THREE.BoxGeometry(6, 0.04, 4), k.mat(k.tex("librug", () => T.rug("#3c1642", "#e0b1cb", "#231942")), "#fff"), [-18.5, 0.02, -8], { noShadow: true });

  // ---------- מטבח תעשייתי ----------
  const steel = k.mat(null, "#c9cdd1", [1, 1], { metalness: 0.7, roughness: 0.3 });
  const redAccent = k.mat(null, "#c1121f", [1, 1], { roughness: 0.4 });
  k.seat(12, 1.1, 1.2, -17, 0, 17.3, steel);
  k.seat(1.2, 1.1, 7, -23.3, 0, 12.5, steel);
  k.seat(6, 1, 2, -16, 0, 9, steel);
  k.box(1.6, 3.6, 1.4, -9.4, 0, 16.9, steel);
  k.box(1.3, 1.1, 1.2, -13, 0, 17.3, k.mat(null, "#2b2d42"));
  // מדפים
  for (const x of [-21, -19]) {
    for (const y of [0, 1, 2, 3]) k.box(1.6, 0.08, 0.6, x, y * 0.9 + 0.4, 1.3, steel, { solid: false });
    k.box(1.6, 3.4, 0.6, x, 0, 1.3, k.mat(null, "#9aa0a6", [1, 1], { metalness: 0.5 }), { solid: true });
  }
  for (let i = 0; i < 8; i++) k.cyl(0.2, 0.2, 0.5, -21.6 + (i % 4) * 0.4 + (i > 3 ? 2 : 0), 1.35, 1.3, k.mat(null, ["#e63946", "#f4a261", "#2a9d8f", "#e9c46a"][i % 4]), false, 12);
  // פוסטרים
  k.panel(1.6, 2.2, -12, 2.6, 17.84, k.mat(T.poster("#ffd166", "#c1121f", "EAT"), "#fff"), Math.PI);
  k.panel(1.6, 2.2, -20, 2.6, 17.84, k.mat(T.poster("#90e0ef", "#0077b6", "COOK"), "#fff"), Math.PI);
  k.panel(1.6, 2.2, -23.84, 2.6, 6, k.mat(T.poster("#f1faee", "#e63946", "HOT"), "#fff"), Math.PI / 2);
  k.box(10, 1.2, 0.6, -17, 2.6, 17.6, redAccent, { solid: false });
  k.cyl(0.45, 0.4, 1.1, -10, 0, 3, k.mat(null, "#6a994e"));

  // ---------- חדר אמבטיה ----------
  const porcelain = k.mat(null, "#fdfdfd", [1, 1], { roughness: 0.15 });
  k.seat(4, 1, 2, 21.8, 0, -16.8, porcelain);
  k.box(3.6, 0.1, 1.6, 21.8, 0.95, -16.8, k.mat(null, "#90e0ef", [1, 1], { roughness: 0.05 }), { solid: false });
  k.seat(0.8, 0.5, 1, 12, 0, -17.2, porcelain);
  k.box(0.9, 0.9, 0.3, 12, 0.5, -17.6, porcelain);
  k.seat(1.6, 0.9, 0.8, 16, 0, -17.5, k.mat(null, "#e9ecef"));
  k.box(1.4, 1.2, 0.05, 16, 1.7, -17.8, k.mat(null, "#bde0fe", [1, 1], { metalness: 0.9, roughness: 0.05 }), { solid: false });
  k.box(0.1, 1.2, 0.8, 23.8, 1.2, -9, k.mat(k.tex("towel", () => T.stripes(["#ff8fab", "#ffc2d1"], false)), "#fff"), { solid: false });
  k.plant(9.5, -9, 0.8);

  // ---------- מסדרון הציורים ----------
  for (let i = 0; i < 5; i++) {
    const x = 10 + i * 3.2;
    if (Math.abs(x - 16) < 1.8) continue;
    k.panel(2, 1.6, x, 2.6, -3.84, k.mat(T.painting(i * 7 + 3), "#fff"));
    k.panel(2, 1.6, x, 2.6, 3.84, k.mat(T.painting(i * 11 + 5), "#fff"), Math.PI);
  }
  k.panel(2.4, 1.9, 23.84, 2.6, 0, k.mat(T.painting(99), "#fff"), -Math.PI / 2);
  k.add(new THREE.BoxGeometry(14, 0.04, 2), k.mat(k.tex("runner", () => T.stripes(["#6d597a", "#b56576"], false)), "#fff", [4, 1]), [16, 0.02, 0], { noShadow: true });
  k.seat(2.2, 0.5, 0.6, 12.5, 0, -3.3, woodDark);
  k.box(0.9, 2.8, 0.5, 23.5, 0, 2.6, woodDark);

  // ---------- חדר כביסה ----------
  const basket = k.mat(k.tex("basket", () => T.stripes(["#c8a165", "#a67c45"], false)), "#fff");
  for (const [x, z] of [[11, 7], [12.4, 7.2], [20, 16.8], [21.5, 16.6]]) k.cyl(0.55, 0.45, 0.8, x, 0, z, basket);
  k.seat(1.4, 1.5, 1.3, 23.2, 0, 8, k.mat(null, "#f8f9fa"));
  k.seat(1.4, 1.5, 1.3, 23.2, 0, 9.5, k.mat(null, "#f8f9fa"));
  // חבלי כביסה עם בדים
  for (const z of [11, 14]) {
    k.box(0.08, 3, 0.08, 10, 0, z, woodMid, { solid: false });
    k.box(0.08, 3, 0.08, 20, 0, z, woodMid, { solid: false });
    k.box(10, 0.03, 0.03, 15, 2.9, z, k.mat(null, "#eeeeee"), { solid: false });
    ["#e76f51", "#2a9d8f", "#f4a261", "#8ecae6", "#ffffff"].forEach((c, i) =>
      k.box(1.2, 1.4, 0.04, 11.5 + i * 1.8, 1.5, z, k.mat(null, c), { solid: false }));
  }
  // בדים מקופלים
  for (let i = 0; i < 4; i++) k.seat(1, 0.2, 0.7, 15 + i * 1.1, 0, 17.2, k.mat(null, ["#ffafcc", "#bde0fe", "#cdb4db", "#fefae0"][i]));

  // ---------- אולם נשפים ----------
  const gold = k.mat(null, "#d4af37", [1, 1], { metalness: 0.9, roughness: 0.25 });
  k.cyl(0.05, 0.05, 1.2, 0, 4.8, -13, gold, false);
  k.add(new THREE.TorusGeometry(1.1, 0.08, 8, 24), gold, [0, 4.7, -13], { rotX: Math.PI / 2 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    k.seat(0.8, 0.5, 0.8, Math.cos(a) * 5, 0, -13 + Math.sin(a) * 3.5, k.mat(null, "#9b2226"));
  }
  k.box(3, 1.1, 1.4, -5.5, 0, -16.8, k.mat(null, "#111111", [1, 1], { roughness: 0.2 }), { solid: true, standable: true });
  k.panel(3, 2, 0, 3, -17.84, k.mat(T.painting(42), "#fff"));

  // ---------- חדר הציידים ----------
  k.seat(3, 0.5, 0.7, -5, 0, 16.8, k.mat(null, "#343a40"));
  k.seat(3, 0.5, 0.7, 5, 0, 16.8, k.mat(null, "#343a40"));

  return k.finish({
    id: "mansion", name: "Hide-and-Seek Mansion",
    bounds: { minX: -23.8, maxX: 23.8, minZ: -17.8, maxZ: 17.8 },
    hunterSpawns: grid(0, 12, 9), hiderSpawns: Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * 3, 0, Math.sin(a) * 3 + (Math.sin(a) > 0 ? 2 : -2)); }),
    lighting: { sky: "#1b1b24", hemi: ["#fff3e0", "#5a4636", 1.15], sun: { color: "#fff1dc", int: 1.6, pos: [-14, 34, 10] }, points: [
      { pos: [0, 4.6, 0], color: "#ffd9a0", int: 30, dist: 18 },
      { pos: [0, 4.6, -13], color: "#ffd9a0", int: 25, dist: 14 },
    ] },
  });
}
