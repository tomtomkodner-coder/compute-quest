// רובה הצבע של הציידים: שוטגאן משאבה (כמו במשחק המקורי) — גוף מתכת כהה, קנה, צינור מחסנית, ידית משאבה
// עם חריצים, קת וידית אחיזה. הקנה פונה ל־+Z. מחזיר גם את ידית המשאבה כדי להנפיש טעינה.
import * as THREE from "three";

export interface Shotgun {
  group: THREE.Group;
  pump: THREE.Object3D;
  muzzle: THREE.Object3D;
}

export function buildShotgun(accent: string, hands = false): Shotgun {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: "#1f2124", metalness: 0.85, roughness: 0.38 });
  const metalLight = new THREE.MeshStandardMaterial({ color: "#3a3d42", metalness: 0.9, roughness: 0.3 });
  const polymer = new THREE.MeshStandardMaterial({ color: "#141517", metalness: 0.1, roughness: 0.7 });
  const paint = new THREE.MeshStandardMaterial({ color: accent, metalness: 0.2, roughness: 0.35 });
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
  add(new THREE.BoxGeometry(0.064, 0.022, 0.2), paint, [0, 0.03, 0.02]); // פס צבע בצבע השחקן
  add(new THREE.BoxGeometry(0.02, 0.012, 0.26), metalLight, [0, 0.056, 0.01]); // מסילה עליונה
  // קנה + צינור מחסנית
  add(cylZ(0.019, 0.62), metalLight, [0, 0.022, 0.46]);
  add(cylZ(0.024, 0.04), metal, [0, 0.022, 0.77]); // לוע
  add(new THREE.TorusGeometry(0.02, 0.005, 6, 16), paint, [0, 0.022, 0.79]);
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
  add(new THREE.BoxGeometry(0.056, 0.14, 0.02), new THREE.MeshStandardMaterial({ color: "#2a2a2a", roughness: 0.9 }), [0, -0.045, -0.51]); // כרית קת
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.022, 0.8);
  g.add(muzzle);
  if (hands) {
    const skin = new THREE.MeshStandardMaterial({ color: "#f4f4f4", roughness: 0.75 });
    add(new THREE.SphereGeometry(0.05, 16, 12), skin, [0.0, -0.05, 0.02], [0, 0, 0], pump).scale.set(1, 0.85, 1.4);
    add(new THREE.SphereGeometry(0.05, 16, 12), skin, [0.01, -0.12, -0.1]).scale.set(1, 1, 1.2);
    add(new THREE.CapsuleGeometry(0.045, 0.3, 4, 12), skin, [0.06, -0.14, -0.3], [1.2, 0, -0.2]);
    add(new THREE.CapsuleGeometry(0.042, 0.35, 4, 12), skin, [-0.05, -0.12, 0.12], [1.3, 0.3, 0.3], pump);
  }
  return { group: g, pump, muzzle };
}
