// הדמות: זיקית לבנה על שתי רגליים. כל חלק בגוף מקבל טקסטורה משלו שאפשר לצבוע.
import * as THREE from "three";
import { paintable, type PaintTex } from "./textures";

export type PoseId = "stand" | "crouch" | "ball" | "flat" | "pillar" | "star";
export type SizeId = "petite" | "normal" | "plump";

export const POSES: { id: PoseId; label: string; emoji: string }[] = [
  { id: "stand", label: "עמידה", emoji: "🧍" },
  { id: "crouch", label: "כריעה", emoji: "🧎" },
  { id: "ball", label: "כדור", emoji: "⚪" },
  { id: "flat", label: "שכיבה", emoji: "🛌" },
  { id: "pillar", label: "עמוד", emoji: "🙌" },
  { id: "star", label: "כוכב", emoji: "⭐" },
];

export const SIZES: { id: SizeId; label: string; scale: [number, number, number] }[] = [
  { id: "petite", label: "קטנטן", scale: [0.72, 0.72, 0.72] },
  { id: "normal", label: "רגיל", scale: [1, 1, 1] },
  { id: "plump", label: "שמנמן", scale: [1.3, 0.95, 1.3] },
];

export interface Part {
  mesh: THREE.Mesh;
  ptex: PaintTex | null;
}

export interface Character {
  root: THREE.Group; // מיקום בעולם (כפות הרגליים)
  body: THREE.Group; // מקבל את הטרנספורמציה של התנוחה
  parts: Part[];
  meshes: THREE.Mesh[];
  armL: THREE.Group; armR: THREE.Group; legL: THREE.Group; legR: THREE.Group; head: THREE.Group;
  hammer: THREE.Group | null;
  pose: PoseId;
  size: SizeId;
  walkPhase: number;
  isSeeker: boolean;
}

export function buildCharacter(opts: { seeker?: boolean; baseColor?: string } = {}): Character {
  const seeker = !!opts.seeker;
  const base = opts.baseColor ?? (seeker ? "#3d2c8d" : "#f2f2f2");
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const parts: Part[] = [];

  function part(geo: THREE.BufferGeometry, parent: THREE.Object3D, pos: [number, number, number], color = base, paint = !seeker) {
    const ptex = paint ? paintable(128, color) : null;
    const m = new THREE.MeshStandardMaterial({
      color: paint ? "#ffffff" : color,
      map: ptex ? ptex.texture : null,
      roughness: 0.8,
    });
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(...pos);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.ptex = ptex;
    parent.add(mesh);
    parts.push({ mesh, ptex });
    return mesh;
  }

  // גו
  part(new THREE.CapsuleGeometry(0.36, 0.4, 8, 16, 4), body, [0, 0.95, 0]);
  // ראש
  const head = new THREE.Group();
  head.position.set(0, 1.62, 0.02);
  body.add(head);
  part(new THREE.SphereGeometry(0.33, 20, 16), head, [0, 0.1, 0]);
  const snout = part(new THREE.SphereGeometry(0.2, 16, 12), head, [0, 0.03, 0.28]);
  snout.scale.set(1, 0.8, 1.25);
  const crest = part(new THREE.ConeGeometry(0.12, 0.3, 10), head, [0, 0.48, -0.05]);
  crest.rotation.x = -0.3;
  for (const s of [-1, 1]) {
    part(new THREE.SphereGeometry(0.12, 14, 10), head, [s * 0.22, 0.2, 0.12], seeker ? "#ff3b3b" : base);
    part(new THREE.SphereGeometry(0.05, 10, 8), head, [s * 0.27, 0.22, 0.22], seeker ? "#ffe066" : "#222222");
  }
  if (seeker) {
    // קסדה
    const helmet = part(new THREE.SphereGeometry(0.36, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), head, [0, 0.14, -0.02], "#ff9f1c");
    helmet.scale.set(1.02, 0.9, 1.02);
  }
  // זנב
  const tail = part(new THREE.TorusGeometry(0.22, 0.075, 8, 18, Math.PI * 1.5), body, [0, 0.55, -0.42]);
  tail.rotation.y = Math.PI / 2;
  // ידיים ורגליים (עם ציר במפרק)
  const limb = (x: number, y: number, r: number, len: number) => {
    const g = new THREE.Group();
    g.position.set(x, y, 0);
    body.add(g);
    part(new THREE.CapsuleGeometry(r, len, 6, 12, 4), g, [0, -(len / 2 + r * 0.6), 0]);
    return g;
  };
  const armL = limb(0.44, 1.32, 0.1, 0.42);
  const armR = limb(-0.44, 1.32, 0.1, 0.42);
  const legL = limb(0.18, 0.5, 0.13, 0.3);
  const legR = limb(-0.18, 0.5, 0.13, 0.3);

  let hammer: THREE.Group | null = null;
  if (seeker) {
    hammer = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 8), new THREE.MeshStandardMaterial({ color: "#8d5524" }));
    handle.position.y = 0.2;
    const headM = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.55, 16), new THREE.MeshStandardMaterial({ color: "#ff006e" }));
    headM.rotation.z = Math.PI / 2;
    headM.position.y = 0.75;
    handle.castShadow = headM.castShadow = true;
    hammer.add(handle, headM);
    hammer.position.set(0, -0.7, 0.1);
    hammer.rotation.x = Math.PI / 2;
    armR.add(hammer);
  }

  const ch: Character = {
    root, body, parts, meshes: parts.map((p) => p.mesh),
    armL, armR, legL, legR, head, hammer,
    pose: "stand", size: "normal", walkPhase: 0, isSeeker: seeker,
  };
  for (const m of ch.meshes) m.userData.char = ch;
  return ch;
}

export function setSize(ch: Character, size: SizeId) {
  ch.size = size;
  const s = SIZES.find((x) => x.id === size)!.scale;
  ch.root.scale.set(...s);
}

/** מחיל תנוחה (ואנימציית הליכה כשזזים) */
export function applyPose(ch: Character, pose: PoseId, walk = 0) {
  ch.pose = pose;
  const { body, armL, armR, legL, legR, head } = ch;
  body.position.set(0, 0, 0);
  body.rotation.set(0, 0, 0);
  body.scale.set(1, 1, 1);
  head.rotation.set(0, 0, 0);
  for (const l of [armL, armR, legL, legR]) l.rotation.set(0, 0, 0);
  switch (pose) {
    case "stand": {
      const sw = Math.sin(ch.walkPhase) * 0.7 * walk;
      legL.rotation.x = sw;
      legR.rotation.x = -sw;
      armL.rotation.x = -sw * 0.8;
      armR.rotation.x = sw * 0.8;
      armL.rotation.z = 0.12;
      armR.rotation.z = -0.12;
      body.position.y = Math.abs(Math.sin(ch.walkPhase)) * 0.06 * walk;
      break;
    }
    case "crouch":
      body.position.y = -0.34;
      legL.rotation.x = legR.rotation.x = -1.35;
      armL.rotation.x = armR.rotation.x = -1.1;
      armL.rotation.z = 0.3;
      armR.rotation.z = -0.3;
      head.rotation.x = 0.2;
      break;
    case "ball":
      body.position.y = -0.5;
      body.rotation.x = 0.55;
      body.scale.set(1.15, 0.85, 1.15);
      legL.rotation.x = legR.rotation.x = -2.1;
      armL.rotation.x = armR.rotation.x = -2.3;
      armL.rotation.z = -0.4;
      armR.rotation.z = 0.4;
      head.rotation.x = 0.6;
      break;
    case "flat":
      body.position.set(0, 0.36, -0.9);
      body.rotation.x = Math.PI / 2;
      armL.rotation.z = armR.rotation.z = 0;
      armL.rotation.x = armR.rotation.x = -3;
      head.rotation.x = -0.9;
      break;
    case "pillar":
      armL.rotation.z = Math.PI - 0.08;
      armR.rotation.z = -Math.PI + 0.08;
      legL.rotation.z = -0.05;
      legR.rotation.z = 0.05;
      break;
    case "star":
      armL.rotation.z = 2.1;
      armR.rotation.z = -2.1;
      legL.rotation.z = 0.45;
      legR.rotation.z = -0.45;
      break;
  }
}

// ---------- צביעה ----------

export function paintDot(ptex: PaintTex, uv: THREE.Vector2, color: string, radius: number) {
  const { ctx, canvas } = ptex;
  const w = canvas.width;
  const h = canvas.height;
  const x = uv.x * w;
  const y = (1 - uv.y) * h;
  const r = Math.max(1, radius * w);
  ctx.fillStyle = color;
  for (const ox of [-w, 0, w]) {
    ctx.beginPath();
    ctx.arc(x + ox, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ptex.texture.needsUpdate = true;
}

export function paintLine(ptex: PaintTex, a: THREE.Vector2, b: THREE.Vector2, color: string, radius: number) {
  const d = a.distanceTo(b);
  if (d > 0.35) return paintDot(ptex, b, color, radius); // מעבר בתפר — לא מותחים קו
  const steps = Math.max(1, Math.ceil(d / (radius * 0.4)));
  const p = new THREE.Vector2();
  for (let i = 1; i <= steps; i++) paintDot(ptex, p.lerpVectors(a, b, i / steps), color, radius);
}

export function fillPart(ptex: PaintTex, color: string) {
  ptex.ctx.fillStyle = color;
  ptex.ctx.fillRect(0, 0, ptex.canvas.width, ptex.canvas.height);
  ptex.texture.needsUpdate = true;
}

export function resetPaint(ch: Character) {
  for (const p of ch.parts) if (p.ptex) fillPart(p.ptex, "#f2f2f2");
}
