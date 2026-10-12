// רובה הצבע של הציידים: שוטגאן משאבה (כמו במשחק המקורי) — גוף מתכת כהה, קנה, צינור מחסנית, ידית משאבה
// עם חריצים, קת וידית אחיזה. הקנה פונה ל־+Z. מחזיר גם את ידית המשאבה כדי להנפיש טעינה.
import * as THREE from "three";

export interface Shotgun {
  group: THREE.Group;
  pump: THREE.Object3D;
  muzzle: THREE.Object3D;
}

let graffiti: THREE.CanvasTexture | null = null;
/** הדוגמה של הרובה במשחק: בסיס כתום-אדום עם כתמי ספריי טורקיז, ירוק, צהוב ואדום (כמו בצילומי המסך) */
function graffitiTexture() {
  if (graffiti) return graffiti;
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d")!;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const grad = g.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, "#d9541e");
  grad.addColorStop(0.5, "#e8782a");
  grad.addColorStop(1, "#b83a1c");
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 512);
  const cols = ["#23b5a8", "#3fcf7a", "#f2c230", "#c9202b", "#1b6e8f", "#7fd8c8", "#f07a1e", "#e8562a"];
  g.filter = "blur(7px)";
  for (let i = 0; i < 38; i++) {
    const x = rnd() * 512, y = rnd() * 512, r = 26 + rnd() * 70;
    g.globalAlpha = 0.55 + rnd() * 0.4;
    g.fillStyle = cols[Math.floor(rnd() * cols.length)];
    g.beginPath();
    for (let k = 0; k <= 14; k++) {
      const a = (k / 14) * Math.PI * 2, rr = r * (0.6 + rnd() * 0.55);
      const px = x + Math.cos(a) * rr * 1.6, py = y + Math.sin(a) * rr * 0.7;
      if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.fill();
  }
  g.lineCap = "round";
  g.filter = "blur(3px)";
  for (let i = 0; i < 22; i++) { // מריחות ספריי ארוכות
    g.globalAlpha = 0.5 + rnd() * 0.4;
    g.strokeStyle = cols[Math.floor(rnd() * cols.length)];
    g.lineWidth = 3 + rnd() * 10;
    g.beginPath();
    const x = rnd() * 512, y = rnd() * 512;
    g.moveTo(x, y);
    g.bezierCurveTo(x + rnd() * 120 - 60, y + rnd() * 40 - 20, x + rnd() * 160 - 80, y + rnd() * 60 - 30, x + rnd() * 200 - 100, y + rnd() * 40 - 20);
    g.stroke();
  }
  g.globalAlpha = 1;
  g.filter = "none";
  graffiti = new THREE.CanvasTexture(c);
  graffiti.colorSpace = THREE.SRGBColorSpace;
  graffiti.wrapS = graffiti.wrapT = THREE.RepeatWrapping;
  graffiti.anisotropy = 4;
  return graffiti;
}

export function buildShotgun(_accent: string, hands = false): Shotgun {
  const g = new THREE.Group();
  const tex = graffitiTexture();
  const painted = (rx: number, ry: number, rough = 0.42) => {
    const t = tex.clone();
    t.repeat.set(rx, ry);
    t.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ map: t, metalness: 0.15, roughness: rough });
  };
  const metal = painted(1, 1);
  const metalLight = painted(0.25, 1.2, 0.36);
  const polymer = painted(1.2, 1, 0.5);
  const paint = metal;
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, p: [number, number, number], r: [number, number, number] = [0, 0, 0], parent: THREE.Object3D = g) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(...p);
    mesh.rotation.set(...r);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const cylZ = (r: number, len: number, seg = 16) => new THREE.CylinderGeometry(r, r, len, seg).rotateX(Math.PI / 2);
  // גוף (receiver)
  add(new THREE.BoxGeometry(0.062, 0.1, 0.3), metal, [0, 0, 0]);
  add(new THREE.BoxGeometry(0.02, 0.012, 0.26), metalLight, [0, 0.056, 0.01]); // מסילה עליונה
  // קנה + צינור מחסנית
  add(cylZ(0.019, 0.62), metalLight, [0, 0.022, 0.46]);
  add(cylZ(0.024, 0.04), metal, [0, 0.022, 0.77]); // לוע
  add(new THREE.TorusGeometry(0.02, 0.005, 6, 16), new THREE.MeshStandardMaterial({ color: "#222", metalness: 0.8, roughness: 0.4 }), [0, 0.022, 0.79]);
  add(cylZ(0.017, 0.5), metal, [0, -0.025, 0.4]);
  add(new THREE.BoxGeometry(0.03, 0.03, 0.03), metal, [0, -0.002, 0.66]); // חבק
  // ידית משאבה עם חריצים
  const pump = new THREE.Group();
  pump.position.set(0, -0.026, 0.36);
  g.add(pump);
  add(cylZ(0.03, 0.2, 20), polymer, [0, 0, 0], [0, 0, 0], pump);
  for (let i = -3; i <= 3; i++) add(new THREE.TorusGeometry(0.031, 0.004, 6, 20), polymer, [0, 0, i * 0.026], [0, 0, 0], pump);
  // ידית אחיזה, הדק ומגן
  add(new THREE.BoxGeometry(0.045, 0.12, 0.05), polymer, [0, -0.09, -0.1], [0.35, 0, 0]);
  add(new THREE.TorusGeometry(0.03, 0.005, 6, 16, Math.PI), metal, [0, -0.05, -0.04], [0, Math.PI / 2, Math.PI]);
  add(new THREE.BoxGeometry(0.008, 0.03, 0.008), metalLight, [0, -0.055, -0.04], [0.3, 0, 0]);
  // קת
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.045);
  shape.lineTo(-0.34, 0.03);
  shape.lineTo(-0.36, -0.1);
  shape.lineTo(-0.3, -0.11);
  shape.lineTo(-0.05, -0.04);
  shape.lineTo(0, -0.04);
  shape.closePath();
  const stockGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2 });
  stockGeo.translate(0, 0, -0.025);
  add(stockGeo, polymer, [0, -0.01, -0.15], [0, -Math.PI / 2, 0]);
  add(new THREE.BoxGeometry(0.056, 0.14, 0.02), paint, [0, -0.045, -0.51]); // כרית קת
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.022, 0.8);
  g.add(muzzle);
  if (hands) {
    // כמו במשחק: היד הלבנה והעגולה של הדמות אוחזת בידית, והאמה הגדולה נכנסת מהפינה הימנית התחתונה
    const skin = new THREE.MeshStandardMaterial({ color: "#f2f2f0", roughness: 0.7 });
    add(new THREE.SphereGeometry(0.062, 20, 14), skin, [0.012, -0.1, -0.1]).scale.set(1, 1, 1.25);
  }
  return { group: g, pump, muzzle };
}
