// Sugarland (シュガーランド): עולם ממתקים — הרי ממתקים, סוכריות תקועות באדמה, ערימות גומי,
// שורות של אנשי ג'ינג'ר, קירות ג'ינג'רברד וגבעות שוקולד, בורוד, מנטה וחום בתאורה בוהקת.
import * as THREE from "three";
import * as T from "../textures";
import { Kit, grid, type World } from "./kit";

export function buildSugarland(): World {
  const k = new Kit(3, 3.2);
  const ground = k.mat(k.tex("sgground", () => T.noise("#ffd6e7", 0.06, 4, 1800)), "#fff");
  const mint = k.mat(k.tex("sgmint", () => T.noise("#a8f0d8", 0.05, 7, 1200)), "#fff");
  const ginger = k.mat(k.tex("ginger", T.gingerbread), "#fff");
  const choco = k.mat(k.tex("choco", T.chocolate), "#fff", [1, 1], { roughness: 0.35 });
  const stripeP = k.mat(k.tex("stripeP", () => T.candyStripe("#ff5c8a", "#ffffff")), "#fff");
  const stripeM = k.mat(k.tex("stripeM", () => T.candyStripe("#2ec4b6", "#ffffff")), "#fff");
  k.floor(-24, 24, -18, 18, ground, 4);
  k.add(new THREE.BoxGeometry(12, 0.03, 36), k.mat(mint.ptex, "#fff", [3, 9]), [0, 0.015, 0], { noShadow: true });
  // גדר של מקלות סוכר סביב המפה
  for (let x = -24; x <= 24; x += 2) { k.cyl(0.18, 0.18, 2.2, x, 0, -18, stripeP, true, 10); k.cyl(0.18, 0.18, 2.2, x, 0, 18, stripeP, true, 10); }
  for (let z = -16; z <= 16; z += 2) { k.cyl(0.18, 0.18, 2.2, -24, 0, z, stripeM, true, 10); k.cyl(0.18, 0.18, 2.2, 24, 0, z, stripeM, true, 10); }
  k.obstacles.push({ minX: -25, maxX: 25, minZ: -18.4, maxZ: -17.8, bottom: 0, top: 3, standable: false, enabled: true });
  k.obstacles.push({ minX: -25, maxX: 25, minZ: 17.8, maxZ: 18.4, bottom: 0, top: 3, standable: false, enabled: true });
  k.obstacles.push({ minX: -24.4, maxX: -23.8, minZ: -19, maxZ: 19, bottom: 0, top: 3, standable: false, enabled: true });
  k.obstacles.push({ minX: 23.8, maxX: 24.4, minZ: -19, maxZ: 19, bottom: 0, top: 3, standable: false, enabled: true });

  // הרי ממתקים
  for (const [x, z, r, h, m] of [[-17, -12, 4, 7, stripeP], [17, -11, 3.5, 6, stripeM], [-18, 12, 3, 5, stripeM], [0, -15, 3, 5.5, stripeP]] as const)
    k.add(new THREE.ConeGeometry(r, h, 20), m, [x, h / 2, z], { solid: true });
  // גבעות שוקולד
  for (const [x, z, s] of [[12, 12, 3], [-9, 5, 2.2], [9, -3, 1.8]] as const)
    k.add(new THREE.SphereGeometry(s, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), choco, [x, 0, z], { solid: true });
  // סוכריות על מקל (לוליפופ)
  const lolly = (x: number, z: number, c: string) => {
    k.cyl(0.08, 0.08, 2.4, x, 0, z, k.mat(null, "#ffffff"), true, 8);
    k.add(new THREE.CylinderGeometry(0.8, 0.8, 0.18, 28), k.mat(k.tex("lolly" + c, () => T.candyStripe(c, "#ffffff")), "#fff"), [x, 3, z], { rotX: Math.PI / 2 });
  };
  lolly(-4, -8, "#ff006e"); lolly(6, 8, "#8338ec"); lolly(-12, -2, "#ffbe0b"); lolly(15, 2, "#06d6a0"); lolly(3, -10, "#fb5607");
  // ערימות גומי (gumdrops)
  const gumCols = ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93", "#ff924c"];
  for (let i = 0; i < 18; i++) {
    const x = -20 + (i * 7.3) % 40, z = -14 + ((i * 11.7) % 28);
    if (Math.abs(x) < 6) continue;
    k.add(new THREE.SphereGeometry(0.55, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), k.mat(null, gumCols[i % 6], [1, 1], { roughness: 0.15 }), [x, 0, z], { solid: true, scale: [1, 1.3, 1] });
  }
  // שורות של אנשי ג'ינג'ר
  const gingerMan = (x: number, z: number) => {
    k.add(new THREE.CylinderGeometry(0.5, 0.5, 0.25, 20), ginger, [x, 1.9, z], { rotX: Math.PI / 2, solid: true });
    k.box(0.9, 1.1, 0.25, x, 0.6, z, ginger);
    k.box(1.6, 0.3, 0.25, x, 1.25, z, ginger, { solid: false });
    k.box(0.3, 0.6, 0.25, x - 0.25, 0, z, ginger, { solid: false });
    k.box(0.3, 0.6, 0.25, x + 0.25, 0, z, ginger, { solid: false });
    k.ball(0.08, x, 1.1, z + 0.14, k.mat(null, "#ff006e"));
    k.ball(0.08, x, 0.8, z + 0.14, k.mat(null, "#2ec4b6"));
  };
  for (let i = 0; i < 6; i++) gingerMan(-14 + i * 2, 15.5);
  for (let i = 0; i < 4; i++) gingerMan(8 + i * 2, -15.5);
  // בית ג'ינג'רברד = חדר הציידים
  k.box(8, 3.2, 0.3, 17, 0, 4, k.fit(ginger, 8, 3.2));
  k.box(8, 3.2, 0.3, 17, 0, 10, k.fit(ginger, 8, 3.2));
  k.box(0.3, 3.2, 6, 21, 0, 7, ginger);
  k.box(0.3, 3.2, 1.8, 13, 0, 4.9, ginger);
  k.box(0.3, 3.2, 1.8, 13, 0, 9.1, ginger);
  k.gate(13, 7, 2.4, "z");
  k.add(new THREE.ConeGeometry(6, 2.5, 4), k.mat(null, "#fff6f0"), [17, 4.4, 7], { rotY: Math.PI / 4 });
  k.room("Hunter Room", 13, 21, 4, 10);
  // קאפקייקס ועוגה
  for (const [x, z] of [[-6, 11], [-3, 12], [5, -6]] as const) {
    k.cyl(0.6, 0.45, 0.7, x, 0, z, k.mat(null, "#f4a261"));
    k.ball(0.62, x, 0.85, z, k.mat(null, "#ffc8dd"));
    k.ball(0.14, x, 1.5, z, k.mat(null, "#e63946"));
  }
  k.cyl(2, 2, 1.2, -2, 0, 3, k.mat(null, "#ffe5ec"));
  k.cyl(1.4, 1.4, 1, -2, 1.2, 3, k.mat(null, "#ffc2d1"));

  return k.finish({
    id: "sugarland", name: "Sugarland",
    bounds: { minX: -23.6, maxX: 23.6, minZ: -17.6, maxZ: 17.6 },
    hunterSpawns: grid(17, 5.5, 9, 1.1), hiderSpawns: Array.from({ length: 24 }, (_, i) => new THREE.Vector3(-4 + (i % 8) * 1.1, 0, -4 + Math.floor(i / 8) * 1.1)),
    lighting: { sky: "#ffd1ec", hemi: ["#ffffff", "#ffb3d1", 1.4], sun: { color: "#ffffff", int: 2.4, pos: [8, 30, 10] }, points: [], exposure: 1.1 },
  });
}
