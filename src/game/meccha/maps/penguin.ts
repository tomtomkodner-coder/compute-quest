// Penguin Hotel (ペンギンホテル): מלון חורפי מפואר — פסלי פינגווינים וקישוטים, בלונים בכל מקום, ברווזים,
// ריצוף לובי, אולם פינגווינים מרכזי עמוס, יציע בקומה השנייה, חדרי שינה רכים, חדרי רחצה מבריקים,
// מסדרונות צרים ותקרות גבוהות.
import * as THREE from "three";
import * as T from "../textures";
import { Kit, grid, type World } from "./kit";

export function buildPenguin(): World {
  const k = new Kit(8, 3.8);
  const lobbyTile = k.mat(k.tex("ptile", () => T.tiles("#f4f1ea", "#1f3b5c", 6)), "#fff", [1, 1], { roughness: 0.3 });
  const carpet = k.mat(k.tex("pcarpet", () => T.damask("#7a1f2b", "#8f2d3a")), "#fff");
  const wallBlue = k.mat(k.tex("pwall", T.penguinPattern), "#fff");
  const wallCream = k.mat(k.tex("pcream", () => T.stripes(["#f3ead7", "#e8dcc2"])), "#fff");
  const bathTile = k.mat(k.tex("pbath", () => T.tiles("#ffffff", "#bde0fe", 10)), "#fff", [1, 1], { roughness: 0.1 });
  const woodMid = k.mat(k.tex("pwood", () => T.wood("#8a5a30", "#5a3a1e", 4)), "#fff");
  const gold = k.mat(null, "#d4af37", [1, 1], { metalness: 0.9, roughness: 0.25 });

  // רצפות
  k.floor(-22, 22, -4, 16, lobbyTile, 3);
  k.floor(-22, 22, -16, -4, carpet, 4);
  // קירות חיצוניים
  k.wallX(-16, -22, 22, wallCream);
  k.wallX(16, -22, 22, wallBlue);
  k.wallZ(-22, -16, 16, wallBlue);
  k.wallZ(22, -16, 16, wallBlue);
  // שורת חדרים בדרום (חדרי שינה + רחצה) עם מסדרון צר
  k.wallX(-4, -22, 22, wallCream, [[-17, 2], [-8, 2], [1, 2], [10, 2], [18, 2]], woodMid);
  for (const x of [-12.5, -3.5, 5.5, 14.5]) k.wallZ(x, -16, -4, wallCream);
  k.room("Lobby", -22, 22, -4, 16);
  const rooms: [number, number, string][] = [[-22, -12.5, "Bedroom A"], [-12.5, -3.5, "Bathroom"], [-3.5, 5.5, "Bedroom B"], [5.5, 14.5, "Bathroom 2"], [14.5, 22, "Hunter Room"]];
  for (const [a, b, n] of rooms) k.room(n, a, b, -16, -4);

  // ---- חדרי שינה ----
  const bed = (x: number, z: number) => {
    k.seat(2.4, 0.7, 3.4, x, 0, z, k.mat(null, "#fefae0"));
    k.seat(2.4, 0.25, 2.6, x, 0.7, z + 0.35, k.mat(k.tex("pquilt", () => T.checker("#9fd3ef", "#ffffff", 6)), "#fff"));
    k.box(2.4, 1.6, 0.3, x, 0, z - 1.8, woodMid);
    k.ball(0.35, x - 0.6, 1.1, z - 1.2, k.mat(null, "#ffffff"));
    k.ball(0.35, x + 0.6, 1.1, z - 1.2, k.mat(null, "#ffffff"));
  };
  bed(-17, -11);
  bed(1, -11);
  k.seat(1.2, 0.8, 0.8, -20, 0, -14.5, woodMid);
  k.seat(1.2, 0.8, 0.8, 4, 0, -14.5, woodMid);
  // ---- חדרי רחצה מבריקים ----
  for (const cx of [-8, 10]) {
    k.box(9, 0.02, 12, cx, 0.005, -10, bathTile, { solid: false });
    k.seat(3.6, 0.9, 1.8, cx, 0, -14.8, k.mat(null, "#fdfdfd", [1, 1], { roughness: 0.08 }));
    k.seat(1.4, 0.9, 0.8, cx + 3, 0, -6, k.mat(null, "#e9ecef", [1, 1], { roughness: 0.1 }));
    k.box(1.2, 1.2, 0.05, cx + 3, 1.7, -4.2, k.mat(null, "#cde7ff", [1, 1], { metalness: 0.95, roughness: 0.03 }), { solid: false });
    // ברווזי גומי
    for (let i = 0; i < 3; i++) k.ball(0.18, cx - 1 + i * 0.6, 1.05, -14.8, k.mat(null, "#ffd60a"));
  }

  // ---- הלובי ----
  // דלפק קבלה
  k.seat(6, 1.2, 1.2, 0, 0, 13.5, woodMid);
  k.box(6.2, 0.1, 1.4, 0, 1.2, 13.5, gold, { solid: false });
  // פסלי פינגווינים
  const penguin = (x: number, z: number, s = 1) => {
    const black = k.mat(null, "#1d2b3a", [1, 1], { roughness: 0.3 });
    const white = k.mat(null, "#ffffff", [1, 1], { roughness: 0.3 });
    k.add(new THREE.SphereGeometry(0.7 * s, 20, 14), black, [x, 0.9 * s, z], { solid: true, scale: [1, 1.35, 0.9] });
    k.add(new THREE.SphereGeometry(0.55 * s, 20, 14), white, [x, 0.85 * s, z + 0.2 * s], { scale: [1, 1.3, 0.8] });
    k.ball(0.45 * s, x, 2 * s, z, black);
    k.cone(0.12 * s, 0.3 * s, x, 1.85 * s, z + 0.45 * s, k.mat(null, "#ffb300"), false);
  };
  penguin(-6, 2, 1);
  penguin(6, 2, 1);
  penguin(0, 7, 1.8);
  penguin(-18, 12, 0.8);
  penguin(18, 12, 0.8);
  // בלונים
  const cols = ["#ff006e", "#3a86ff", "#ffbe0b", "#8338ec", "#06d6a0", "#fb5607", "#ffffff"];
  for (let i = 0; i < 16; i++) {
    const x = -14 + (i % 8) * 4, z = 0 + Math.floor(i / 8) * 9, y = 3 + (i % 3) * 0.8;
    k.ball(0.38, x, y, z, k.mat(null, cols[i % cols.length], [1, 1], { roughness: 0.2 }));
    k.box(0.01, y - 0.4, 0.01, x, 0, z, k.mat(null, "#eeeeee"), { solid: false });
  }
  // ספות ושולחנות
  const velvet = k.mat(null, "#1f3b5c", [1, 1], { roughness: 0.95 });
  k.seat(4, 0.7, 1.4, -14, 0, 4, velvet);
  k.box(4, 1, 0.4, -14, 0.7, 3.5, velvet);
  k.seat(4, 0.7, 1.4, 14, 0, 4, velvet);
  k.box(4, 1, 0.4, 14, 0.7, 3.5, velvet);
  k.seat(1.6, 0.6, 1.6, -14, 0, 6.5, k.mat(null, "#f4f1ea"));
  k.seat(1.6, 0.6, 1.6, 14, 0, 6.5, k.mat(null, "#f4f1ea"));
  // יציע בקומה השנייה + מדרגות (צפון־מזרח)
  const mezz = k.mat(k.tex("mezz", () => T.wood("#6f4518", "#4a2c0d", 9)), "#fff");
  k.seat(10, 0.3, 4, 16, 3.3, 13.8, mezz);
  for (let i = 0; i < 8; i++) k.seat(1.6, 0.42 * (i + 1), 0.6, 9.5 - 0.0, 0, 6 + i * 0.6, mezz);
  k.seat(2.6, 3.6, 1.6, 10, 0, 11.6, mezz);
  k.box(10, 0.9, 0.1, 16, 3.6, 11.8, gold, { solid: false });
  for (const x of [12, 20]) k.cyl(0.25, 0.25, 3.3, x, 0, 12.2, k.mat(k.tex("pmarble", () => T.marble("#f3eee4", "#bdb3a2", 7)), "#fff"));
  // עצי אשוח מקושטים
  for (const [x, z] of [[-20, -1], [20, -1]] as const) {
    k.cone(1.4, 3.4, x, 0.4, z, k.mat(null, "#2d6a4f"));
    k.cyl(0.25, 0.25, 0.4, x, 0, z, woodMid);
    for (let i = 0; i < 5; i++) k.ball(0.15, x + Math.cos(i * 1.3) * 0.8, 1.2 + i * 0.4, z + Math.sin(i * 1.3) * 0.8, k.mat(null, cols[i]));
  }
  // נברשת
  k.add(new THREE.TorusGeometry(1.4, 0.1, 8, 28), gold, [0, 6.5, 4], { rotX: Math.PI / 2 });

  // חדר הציידים (החדר המזרחי בשורת החדרים) — השער בפתח שלו
  k.gate(18, -4, 2, "x");

  return k.finish({
    id: "penguin", name: "Penguin Hotel",
    bounds: { minX: -21.8, maxX: 21.8, minZ: -15.8, maxZ: 15.8 },
    hunterSpawns: grid(18, -13, 9, 1.1), hiderSpawns: Array.from({ length: 24 }, (_, i) => new THREE.Vector3(-6 + (i % 8) * 1.6, 0, 9 + Math.floor(i / 8) * 1.2)),
    lighting: { sky: "#dbeefa", hemi: ["#ffffff", "#8aa6bf", 1.3], sun: { color: "#fff6ea", int: 1.5, pos: [-12, 32, 14] }, points: [
      { pos: [0, 6, 4], color: "#ffe6b0", int: 30, dist: 20 },
    ] },
  });
}
