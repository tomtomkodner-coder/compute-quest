// הדמות: בובה לבנה דמוית אדם (כמו במשחק המקורי — בלי זנב ובלי פנים של זיקית).
// שלושה סוגי גוף (רגיל / קובייה / ふくよか), גודל רגיל או プチ (x0.5), ומפרקים לתנוחות (כתפיים, מרפקים, ירכיים, ברכיים).
// הגוף הוא מודל אחד חלק שנבנה ב־Blender (בלי חורים ובלי תפרים) עם שלד; התנוחות מסובבות את העצמות.
// הצביעה נעשית בתלת־ממד (לפי מיקום על הגוף), כך שאין תפרים בין אזורי ה־UV.
// שלוש שכבות צבע: צבע בסיס, זוהר (Emissive) ומתכתיות/חספוס.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { buildShotgun } from "./gun";

export type BodyType = "normal" | "cube" | "plump";
export type SizeId = "petit" | "normal";
export type PoseId =
  | "stand" | "sit" | "lie" | "spread" | "lump" | "cactus" | "surrender" | "side"
  | "crosslegged" | "bridge" | "onehand" | "bend" | "tpose" | "hips" | "handstand" | "banzai"
  | "zazen" | "airplane" | "thinker" | "bolt" | "glico" | "kneel" | "prone" | "curl" | "squat" | "run" | "salute"
  | "armscross" | "point" | "wave" | "hugknees" | "flamingo" | "fly" | "dab" | "lean" | "crouch";

export const POSES: PoseId[] = [
  "stand", "sit", "lie", "spread", "lump", "cactus", "surrender", "side",
  "crosslegged", "bridge", "onehand", "bend", "tpose", "hips", "handstand", "banzai",
  "zazen", "airplane", "thinker", "bolt", "glico", "kneel", "prone", "curl", "squat", "run", "salute",
  "armscross", "point", "wave", "hugknees", "flamingo", "fly", "dab", "lean",
];

export const SIZES: { id: SizeId; scale: number; label: string }[] = [
  { id: "normal", scale: 1, label: "Normal" },
  { id: "petit", scale: 0.5, label: "Petit" },
];
export const BODY_TYPES: BodyType[] = ["normal", "cube", "plump"];

const TEX = 512; // צבע בסיס
const LAYER = 256; // זוהר + מתכתיות/חספוס
const WHITE = "#f4f4f4";

export interface PaintLayer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  img: ImageData | null; // עותק פיקסלים לצביעה מהירה (null = צריך לקרוא מה־canvas)
}

/** מפה מכל טקסל בטקסטורה למיקום שלו על הגוף בתנוחת המנוחה — בשביל צביעה תלת־ממדית בלי תפרים */
interface TexelMap {
  size: number;
  rest: Float32Array; // x,y,z לכל טקסל (NaN = לא בשימוש)
  grid: Map<number, number[]>;
  cell: number;
}
export interface Part {
  mesh: THREE.Mesh;
  albedo: PaintLayer;
  emissive: PaintLayer;
  orm: PaintLayer; // G = חספוס, B = מתכתיות
  map: TexelMap;
}

export interface Joints {
  body: THREE.Group; head: THREE.Group;
  shL: THREE.Group; shR: THREE.Group; elL: THREE.Group; elR: THREE.Group;
  hipL: THREE.Group; hipR: THREE.Group; knL: THREE.Group; knR: THREE.Group;
}

export interface Character extends Joints {
  root: THREE.Group;
  parts: Part[];
  meshes: THREE.Mesh[];
  gun: THREE.Group | null;
  label: THREE.Sprite | null;
  pose: PoseId;
  size: SizeId;
  bodyType: BodyType;
  walkPhase: number;
  armed: boolean;
  rig: Rig;
}

interface Rig {
  bones: Map<string, THREE.Bone>;
  tpl: Template;
}

function layer(size: number, fill: string, color = false): PaintLayer {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { canvas, ctx, texture, img: null };
}

const ORM_DEFAULT = "rgb(255,204,0)"; // חספוס 0.8, מתכתיות 0

// ---------- טעינת המודלים (Blender → glTF) ----------

interface Template {
  scene: THREE.Object3D;
  restQ: Map<string, THREE.Quaternion>; // כיוון המנוחה של כל עצם ביחס לשורש המודל
  refQ: Map<string, THREE.Quaternion>; // כיוון "ידיים למטה" (המודל נבנה בתנוחת A)
  parentOf: Map<string, string | null>;
  map: TexelMap;
}
const templates = new Map<BodyType, Template>();
let loading: Promise<void> | null = null;

const ARM_A = (45 * Math.PI) / 180;
const LEG_A = (7 * Math.PI) / 180;
const JOINT_BONES = ["head", "shL", "elL", "shR", "elR", "hipL", "knL", "hipR", "knR"] as const;

/** חייבים לקרוא לזה (ולחכות) לפני שבונים דמויות */
export function loadCharacterModels(): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    const { MODELS } = await import("./models");
    const loader = new GLTFLoader();
    for (const bt of BODY_TYPES) {
      const bin = Uint8Array.from(atob(MODELS[bt]), (c) => c.charCodeAt(0));
      const gltf = await loader.parseAsync(bin.buffer, "");
      templates.set(bt, makeTemplate(gltf.scene));
    }
  })();
  return loading;
}
export function modelsReady() {
  return templates.size === BODY_TYPES.length;
}

function makeTemplate(scene: THREE.Object3D): Template {
  scene.updateMatrixWorld(true);
  const restQ = new Map<string, THREE.Quaternion>();
  const parentOf = new Map<string, string | null>();
  let mesh: THREE.SkinnedMesh | null = null;
  scene.traverse((o) => {
    if ((o as THREE.SkinnedMesh).isSkinnedMesh) mesh = o as THREE.SkinnedMesh;
    if ((o as THREE.Bone).isBone) {
      restQ.set(o.name, o.getWorldQuaternion(new THREE.Quaternion()));
      parentOf.set(o.name, (o.parent as THREE.Bone)?.isBone ? o.parent!.name : null);
    }
  });
  const rootQ = new Map<string, THREE.Quaternion>();
  const dz = (a: number) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), a);
  const D: Record<string, THREE.Quaternion> = { shL: dz(-ARM_A), elL: dz(-ARM_A), shR: dz(ARM_A), elR: dz(ARM_A), hipL: dz(-LEG_A), knL: dz(-LEG_A), hipR: dz(LEG_A), knR: dz(LEG_A), ftL: dz(-LEG_A), ftR: dz(LEG_A) };
  const refQ = new Map<string, THREE.Quaternion>();
  for (const [n, q] of restQ) refQ.set(n, D[n] ? D[n].clone().multiply(q) : q.clone());
  void rootQ;
  const m = mesh as unknown as THREE.SkinnedMesh;
  return { scene, restQ, refQ, parentOf, map: buildTexelMap(m.geometry) };
}

/** מרסטרים כל משולש במרחב ה־UV ושומרים לכל טקסל את מיקומו על הגוף */
function buildTexelMap(geo: THREE.BufferGeometry): TexelMap {
  const size = TEX;
  const rest = new Float32Array(size * size * 3).fill(NaN);
  const pos = geo.getAttribute("position");
  const uv = geo.getAttribute("uv");
  const idx = geo.index;
  const tri = idx ? idx.count / 3 : pos.count / 3;
  const P = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const U = [new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()];
  for (let t = 0; t < tri; t++) {
    for (let k = 0; k < 3; k++) {
      const i = idx ? idx.getX(t * 3 + k) : t * 3 + k;
      P[k].fromBufferAttribute(pos, i);
      U[k].set(uv.getX(i) * size, (1 - uv.getY(i)) * size);
    }
    const minX = Math.max(0, Math.floor(Math.min(U[0].x, U[1].x, U[2].x) - 1));
    const maxX = Math.min(size - 1, Math.ceil(Math.max(U[0].x, U[1].x, U[2].x) + 1));
    const minY = Math.max(0, Math.floor(Math.min(U[0].y, U[1].y, U[2].y) - 1));
    const maxY = Math.min(size - 1, Math.ceil(Math.max(U[0].y, U[1].y, U[2].y) + 1));
    const d = (U[1].x - U[0].x) * (U[2].y - U[0].y) - (U[2].x - U[0].x) * (U[1].y - U[0].y);
    if (Math.abs(d) < 1e-9) continue;
    for (let y = minY; y <= maxY; y++)
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5, py = y + 0.5;
        const w1 = ((px - U[0].x) * (U[2].y - U[0].y) - (U[2].x - U[0].x) * (py - U[0].y)) / d;
        const w2 = ((U[1].x - U[0].x) * (py - U[0].y) - (px - U[0].x) * (U[1].y - U[0].y)) / d;
        const w0 = 1 - w1 - w2;
        const e = -0.03;
        if (w0 < e || w1 < e || w2 < e) continue;
        const o = (y * size + x) * 3;
        rest[o] = P[0].x * w0 + P[1].x * w1 + P[2].x * w2;
        rest[o + 1] = P[0].y * w0 + P[1].y * w1 + P[2].y * w2;
        rest[o + 2] = P[0].z * w0 + P[1].z * w1 + P[2].z * w2;
      }
  }
  // הרחבה של 2 פיקסלים מעבר לשולי האיים — כדי שלא יראו תפרים לבנים
  for (let pass = 0; pass < 2; pass++) {
    const src = rest.slice();
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const o = (y * size + x) * 3;
        if (!Number.isNaN(src[o])) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
          const q = (ny * size + nx) * 3;
          if (!Number.isNaN(src[q])) { rest[o] = src[q]; rest[o + 1] = src[q + 1]; rest[o + 2] = src[q + 2]; break; }
        }
      }
  }
  const cell = 0.03;
  const grid = new Map<number, number[]>();
  for (let i = 0; i < size * size; i++) {
    const x = rest[i * 3];
    if (Number.isNaN(x)) continue;
    const k = cellKey(Math.floor(x / cell), Math.floor(rest[i * 3 + 1] / cell), Math.floor(rest[i * 3 + 2] / cell));
    let l = grid.get(k);
    if (!l) grid.set(k, (l = []));
    l.push(i);
  }
  return { size, rest, grid, cell };
}
const cellKey = (x: number, y: number, z: number) => ((x + 512) * 1024 + (y + 512)) * 1024 + (z + 512);

export function buildCharacter(opts: { bodyType?: BodyType; armed?: boolean; gunColor?: string } = {}): Character {
  const bodyType = opts.bodyType ?? "normal";
  const tpl = templates.get(bodyType);
  if (!tpl) throw new Error("character models not loaded");
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const model = SkeletonUtils.clone(tpl.scene);
  body.add(model);
  let mesh: THREE.SkinnedMesh | null = null;
  const bones = new Map<string, THREE.Bone>();
  model.traverse((o) => {
    if ((o as THREE.SkinnedMesh).isSkinnedMesh) mesh = o as THREE.SkinnedMesh;
    if ((o as THREE.Bone).isBone) bones.set(o.name, o as THREE.Bone);
  });
  const sk = mesh as unknown as THREE.SkinnedMesh;
  const albedo = layer(TEX, WHITE, true);
  const emissive = layer(LAYER, "#000000", true);
  const orm = layer(LAYER, ORM_DEFAULT);
  sk.material = new THREE.MeshStandardMaterial({
    color: "#ffffff", map: albedo.texture,
    emissive: "#ffffff", emissiveMap: emissive.texture,
    roughness: 1, metalness: 1, roughnessMap: orm.texture, metalnessMap: orm.texture,
  });
  sk.castShadow = true;
  sk.receiveShadow = true;
  sk.frustumCulled = false;
  // גבול קבוע שמכסה כל תנוחה (כך שבדיקות פגיעה לא מפספסות גפיים מורמות)
  sk.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.95, 0), 1.3);
  sk.boundingBox = new THREE.Box3(new THREE.Vector3(-1.3, -0.4, -1.3), new THREE.Vector3(1.3, 2.3, 1.3));
  sk.userData.sharedGeometry = true;
  const parts: Part[] = [{ mesh: sk, albedo, emissive, orm, map: tpl.map }];
  const v = () => new THREE.Group();
  const [head, shL, elL, shR, elR, hipL, knL, hipR, knR] = [v(), v(), v(), v(), v(), v(), v(), v(), v()];

  let gun: THREE.Group | null = null;
  if (opts.armed) {
    // רובה הצבע: שוטגאן משאבה
    const sg = buildShotgun(opts.gunColor ?? "#ff006e");
    gun = sg.group;
    gun.scale.setScalar(1.15);
    gun.position.set(-0.1, 1.22, 0.22);
    body.add(gun);
  }

  const ch: Character = {
    root, body, head, shL, shR, elL, elR, hipL, hipR, knL, knR, parts, meshes: [sk],
    gun, label: null, pose: "stand", size: "normal", bodyType, walkPhase: 0, armed: !!opts.armed,
    rig: { bones, tpl },
  };
  sk.userData.char = ch;
  applyPose(ch, "stand");
  return ch;
}

/** מתרגם את סיבובי המפרקים (באותה שיטה כמו קודם) לסיבובי העצמות של המודל */
function syncBones(ch: Character) {
  const { bones, tpl } = ch.rig;
  const R = new THREE.Quaternion();
  const inv = new THREE.Quaternion();
  const jointOf: Record<string, THREE.Group | undefined> = {
    head: ch.head, shL: ch.shL, elL: ch.elL, shR: ch.shR, elR: ch.elR, hipL: ch.hipL, knL: ch.knL, hipR: ch.hipR, knR: ch.knR,
  };
  for (const [name, b] of bones) {
    const j = jointOf[name];
    if (j) R.setFromEuler(j.rotation);
    else R.identity();
    const par = tpl.parentOf.get(name);
    const ref = tpl.refQ.get(name)!;
    if (par) inv.copy(tpl.refQ.get(par)!).invert();
    else inv.identity();
    b.quaternion.copy(inv).multiply(R).multiply(ref);
  }
}
void JOINT_BONES;

export function sizeScale(size: SizeId) {
  return SIZES.find((s) => s.id === size)?.scale ?? 1;
}

export function setSize(ch: Character, size: SizeId) {
  ch.size = size;
  ch.root.scale.setScalar(sizeScale(size));
}

type J = [number, number, number]; // x, y, z rotation
interface PoseDef {
  body?: { x?: number; y?: number; z?: number; rx?: number; rz?: number };
  head?: J; shL?: J; shR?: J; elL?: J; elR?: J; hipL?: J; hipR?: J; knL?: J; knR?: J;
}

const P = Math.PI;
const POSE_DEFS: Record<PoseId, PoseDef> = {
  stand: { shL: [0, 0, 0.1], shR: [0, 0, -0.1] },
  sit: { body: { y: -0.62 }, hipL: [-1.5, 0, 0.1], hipR: [-1.5, 0, -0.1], shL: [-0.3, 0, 0.3], shR: [-0.3, 0, -0.3], elL: [-0.3, 0, 0], elR: [-0.3, 0, 0] },
  lie: { body: { y: 0.18, z: 0.9, rx: -P / 2 }, shL: [0, 0, 0.5], shR: [0, 0, -0.5] },
  spread: { shL: [0, 0, 2.2], shR: [0, 0, -2.2], hipL: [0, 0, 0.5], hipR: [0, 0, -0.5] },
  lump: { body: { y: -0.58, rx: 0.9 }, head: [0.7, 0, 0], hipL: [-2.3, 0, 0.1], hipR: [-2.3, 0, -0.1], knL: [2.3, 0, 0], knR: [2.3, 0, 0], shL: [-1.8, 0, 0.3], shR: [-1.8, 0, -0.3], elL: [-1.4, 0, 0], elR: [-1.4, 0, 0] },
  cactus: { shL: [0, 0, 1.55], shR: [0, 0, -1.55], elL: [0, 0, -1.6], elR: [0, 0, 1.6] },
  surrender: { shL: [0, 0, 2.6], shR: [0, 0, -2.6], elL: [0, 0, 0.3], elR: [0, 0, -0.3] },
  side: { body: { x: 0.9, y: 0.2, rz: P / 2 }, shL: [0, 0, 0.2], shR: [0, 0, -0.2], hipL: [-0.4, 0, 0], knL: [0.7, 0, 0] },
  crosslegged: { body: { y: -0.72 }, hipL: [-1.45, 0.9, 0.3], hipR: [-1.45, -0.9, -0.3], knL: [2.3, 0, 0], knR: [2.3, 0, 0], shL: [-0.5, 0, 0.3], shR: [-0.5, 0, -0.3], elL: [-0.6, 0, 0], elR: [-0.6, 0, 0] },
  bridge: { body: { y: 0.9, z: 0.8, rx: -(P / 2 + 0.25) }, head: [-0.5, 0, 0], shL: [P / 2, 0, 0.2], shR: [P / 2, 0, -0.2], hipL: [P / 2, 0, 0.12], hipR: [P / 2, 0, -0.12] },
  onehand: { shL: [0, 0, 2.8], shR: [0, 0, -0.1] },
  bend: { body: { rx: 1.35, y: -0.1 }, shL: [-1.1, 0, 0], shR: [-1.1, 0, 0], hipL: [-1.35, 0, 0.05], hipR: [-1.35, 0, -0.05] },
  tpose: { shL: [0, 0, P / 2], shR: [0, 0, -P / 2] },
  hips: { shL: [0, 0, 0.7], shR: [0, 0, -0.7], elL: [0, 0, -1.9], elR: [0, 0, 1.9] },
  handstand: { body: { y: 2.1, rz: P }, shL: [0, 0, P - 0.25], shR: [0, 0, -P + 0.25], hipL: [0, 0, 0.12], hipR: [0, 0, -0.12] },
  banzai: { shL: [0, 0, 2.75], shR: [0, 0, -2.75] },
  zazen: { body: { y: -0.72 }, head: [0.12, 0, 0], hipL: [-1.45, 0.9, 0.3], hipR: [-1.45, -0.9, -0.3], knL: [2.3, 0, 0], knR: [2.3, 0, 0], shL: [-0.35, 0, 0.12], shR: [-0.35, 0, -0.12], elL: [-1.05, 0, 0], elR: [-1.05, 0, 0] },
  airplane: { body: { rx: 0.3, z: -0.25 }, head: [-0.3, 0, 0], shL: [0.55, 0, 1.35], shR: [0.55, 0, -1.35], hipL: [-0.6, 0, 0], knL: [0.9, 0, 0], hipR: [0.35, 0, 0], knR: [0.4, 0, 0] },
  thinker: { body: { y: -0.62 }, head: [0.35, 0, 0], hipL: [-1.5, 0, 0.15], hipR: [-1.5, 0, -0.15], knL: [1.5, 0, 0], knR: [1.5, 0, 0], shL: [-0.7, 0, 0.2], elL: [-0.7, 0, 0], shR: [-1.1, 0, -0.1], elR: [-2.3, 0, 0] },
  bolt: { shL: [0, 0, 2.3], shR: [0, 0, -1.5], elR: [0, 0, 1.9], hipL: [0, 0, 0.28], hipR: [0, 0, -0.28], head: [0, 0.5, 0] },
  glico: { shL: [0, 0, 2.7], shR: [0, 0, -2.7], hipL: [-1.25, 0, 0.05], knL: [1.5, 0, 0], hipR: [0.15, 0, 0] },
  kneel: { body: { y: -0.37 }, hipL: [-1.57, 0, 0.08], knL: [1.57, 0, 0], hipR: [0.05, 0, -0.08], knR: [1.57, 0, 0], shL: [-0.2, 0, 0.1], shR: [-0.2, 0, -0.1] },
  prone: { body: { y: 0.16, z: -0.9, rx: P / 2 }, head: [-0.5, 0, 0], shL: [0, 0, 0.35], shR: [0, 0, -0.35] },
  curl: { body: { x: 0.9, y: 0.22, rz: P / 2 }, head: [0.5, 0, 0], hipL: [-1.6, 0, 0], hipR: [-1.6, 0, 0], knL: [2.0, 0, 0], knR: [2.0, 0, 0], shL: [-1.4, 0, 0.2], shR: [-1.4, 0, -0.2], elL: [-1.2, 0, 0], elR: [-1.2, 0, 0] },
  squat: { body: { y: -0.5 }, hipL: [-1.9, 0, 0.35], hipR: [-1.9, 0, -0.35], knL: [2.4, 0, 0], knR: [2.4, 0, 0], shL: [-1.35, 0, 0.1], shR: [-1.35, 0, -0.1] },
  run: { body: { y: -0.1, rx: 0.15 }, hipL: [-0.95, 0, 0], knL: [0.7, 0, 0], hipR: [0.55, 0, 0], knR: [1.2, 0, 0], shL: [0.75, 0, 0.1], elL: [-1.3, 0, 0], shR: [-0.95, 0, -0.1], elR: [-1.3, 0, 0] },
  salute: { shR: [-0.25, 0, -1.35], elR: [0, 0, -2.2], shL: [0, 0, 0.08] },
  armscross: { shL: [-0.45, 0, 0.3], elL: [-1.65, 0, -0.55], shR: [-0.45, 0, -0.3], elR: [-1.65, 0, 0.55] },
  point: { shR: [-1.52, 0, -0.08], shL: [0, 0, 0.12], head: [0, -0.1, 0] },
  wave: { shR: [0, 0, -1.45], elR: [0, 0, -1.35], shL: [0, 0, 0.1] },
  hugknees: { body: { y: -0.72 }, head: [0.35, 0, 0], hipL: [-2.25, 0, 0.1], hipR: [-2.25, 0, -0.1], knL: [2.5, 0, 0], knR: [2.5, 0, 0], shL: [-1.2, 0, 0.28], shR: [-1.2, 0, -0.28], elL: [-0.9, 0, -0.35], elR: [-0.9, 0, 0.35] },
  flamingo: { hipR: [0.15, 0, -0.05], knR: [2.1, 0, 0], shL: [0, 0, 1.35], shR: [0, 0, -1.35] },
  fly: { body: { y: 0.5, z: -0.9, rx: P / 2 }, head: [-0.7, 0, 0], shR: [0, 0, -3.0], shL: [0, 0, 0.25], hipL: [0, 0, 0.05], hipR: [0, 0, -0.05] },
  dab: { head: [0.55, -0.5, 0], shL: [0, 0, 2.25], shR: [-1.25, 0, -1.3], elR: [-1.5, 0, 0] },
  lean: { shL: [0, 0, 2.5], elL: [0, 0, 1.7], shR: [0, 0, -0.5], elR: [-1.2, 0, 0.9], hipL: [0, 0, -0.18], hipR: [0, 0, 0.08], head: [0, 0, 0.15] },
  crouch: { body: { y: -0.32 }, hipL: [-1.1, 0, 0.1], hipR: [-1.1, 0, -0.1], knL: [1.9, 0, 0], knR: [1.9, 0, 0], shL: [-0.6, 0, 0.2], shR: [-0.6, 0, -0.2], elL: [-0.8, 0, 0], elR: [-0.8, 0, 0] },
};

/** מחיל תנוחה; walk>0 = אנימציית הליכה */
export function applyPose(ch: Character, pose: PoseId, walk = 0) {
  poseJoints(ch, pose, walk);
  syncBones(ch);
}

function poseJoints(ch: Character, pose: PoseId, walk: number) {
  ch.pose = pose;
  const all = [ch.head, ch.shL, ch.shR, ch.elL, ch.elR, ch.hipL, ch.hipR, ch.knL, ch.knR];
  for (const j of all) j.rotation.set(0, 0, 0);
  ch.body.position.set(0, 0, 0);
  ch.body.rotation.set(0, 0, 0);
  if (ch.armed) {
    const sw = Math.sin(ch.walkPhase) * 0.6 * walk;
    ch.hipL.rotation.x = sw;
    ch.hipR.rotation.x = -sw;
    ch.knL.rotation.x = Math.max(0, -sw) * 0.8;
    ch.knR.rotation.x = Math.max(0, sw) * 0.8;
    ch.shR.rotation.set(-1.3, 0, 0.25);
    ch.elR.rotation.set(-0.2, 0, 0);
    ch.shL.rotation.set(-1.25, 0, -0.55);
    ch.elL.rotation.set(-0.4, 0, 0);
    ch.body.position.y = Math.abs(Math.sin(ch.walkPhase)) * 0.04 * walk;
    return;
  }
  if (pose === "stand" && walk > 0) {
    const sw = Math.sin(ch.walkPhase) * 0.7 * walk;
    ch.hipL.rotation.x = sw;
    ch.hipR.rotation.x = -sw;
    ch.knL.rotation.x = Math.max(0, -sw) * 0.9;
    ch.knR.rotation.x = Math.max(0, sw) * 0.9;
    ch.shL.rotation.set(-sw * 0.8, 0, 0.1);
    ch.shR.rotation.set(sw * 0.8, 0, -0.1);
    ch.elL.rotation.x = -0.3;
    ch.elR.rotation.x = -0.3;
    ch.body.position.y = Math.abs(Math.sin(ch.walkPhase)) * 0.05 * walk;
    return;
  }
  const d = POSE_DEFS[pose];
  const set = (g: THREE.Group, r?: J) => { if (r) g.rotation.set(r[0], r[1], r[2]); };
  set(ch.head, d.head); set(ch.shL, d.shL); set(ch.shR, d.shR); set(ch.elL, d.elL); set(ch.elR, d.elR);
  set(ch.hipL, d.hipL); set(ch.hipR, d.hipR); set(ch.knL, d.knL); set(ch.knR, d.knR);
  if (d.body) {
    ch.body.position.set(d.body.x ?? 0, d.body.y ?? 0, d.body.z ?? 0);
    ch.body.rotation.set(d.body.rx ?? 0, 0, d.body.rz ?? 0);
  }
}

// ================= צביעה =================

export interface Brush {
  color: string;   // #rrggbb
  alpha: number;   // 0..1
  metal: number;   // 0..1
  rough: number;   // 0..1
  emis: number;    // 0..1
}

const hexRgb = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

function pixels(l: PaintLayer) {
  if (!l.img) l.img = l.ctx.getImageData(0, 0, l.canvas.width, l.canvas.height);
  return l.img;
}
/** מסמנים שה־canvas השתנה מבחוץ (העתקה/תמונת מצב) */
export function invalidatePaint(p: Part) {
  p.albedo.img = p.emissive.img = p.orm.img = null;
}

/** נקודת המנוחה על הגוף של פגיעת קרן (כדי לצבוע בתלת־ממד) */
export function restPoint(hit: THREE.Intersection): THREE.Vector3 | null {
  const mesh = hit.object as THREE.Mesh;
  if (!hit.face || !mesh.geometry) return null;
  const pos = mesh.geometry.getAttribute("position");
  const a = new THREE.Vector3().fromBufferAttribute(pos, hit.face.a);
  const b = new THREE.Vector3().fromBufferAttribute(pos, hit.face.b);
  const c = new THREE.Vector3().fromBufferAttribute(pos, hit.face.c);
  const bc = (hit as THREE.Intersection & { barycoord?: THREE.Vector3 }).barycoord;
  if (!bc) return a.add(b).add(c).multiplyScalar(1 / 3);
  return a.multiplyScalar(bc.x).add(b.multiplyScalar(bc.y)).add(c.multiplyScalar(bc.z));
}

/** מיקום בעולם של קודקוד (כולל השלד) */
export function vertexWorld(mesh: THREE.Mesh, i: number, out: THREE.Vector3) {
  mesh.getVertexPosition(i, out);
  return out.applyMatrix4(mesh.matrixWorld);
}

/** תיבה סביב הגוף כפי שהוא עכשיו (כולל התנוחה) — למסגור אייקונים */
export function poseBox(ch: Character, out = new THREE.Box3()) {
  ch.root.updateMatrixWorld(true);
  out.makeEmpty();
  const v = new THREE.Vector3();
  for (const m of ch.meshes) {
    const n = m.geometry.getAttribute("position").count;
    for (let i = 0; i < n; i += 3) out.expandByPoint(vertexWorld(m, i, v));
  }
  return out;
}

/** צביעה: כל הטקסלים שנמצאים בתוך כדור ברדיוס radius (מטרים) סביב נקודה על הגוף */
export function paintSphere(p: Part, c: THREE.Vector3, b: Brush, radius: number) {
  const m = p.map;
  const r = Math.max(0.004, radius);
  const r2 = r * r;
  const A = pixels(p.albedo), E = pixels(p.emissive), O = pixels(p.orm);
  const [cr, cg, cb] = hexRgb(b.color);
  const er = cr * b.emis, eg = cg * b.emis, eb = cb * b.emis;
  const og = b.rough * 255, ob = b.metal * 255;
  const al = Math.max(0, Math.min(1, b.alpha));
  const x0 = Math.floor((c.x - r) / m.cell), x1 = Math.floor((c.x + r) / m.cell);
  const y0 = Math.floor((c.y - r) / m.cell), y1 = Math.floor((c.y + r) / m.cell);
  const z0 = Math.floor((c.z - r) / m.cell), z1 = Math.floor((c.z + r) / m.cell);
  let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1;
  const S = m.size, L = p.emissive.canvas.width, k = S / L;
  for (let gx = x0; gx <= x1; gx++)
    for (let gy = y0; gy <= y1; gy++)
      for (let gz = z0; gz <= z1; gz++) {
        const list = m.grid.get(cellKey(gx, gy, gz));
        if (!list) continue;
        for (const t of list) {
          const dx = m.rest[t * 3] - c.x, dy = m.rest[t * 3 + 1] - c.y, dz = m.rest[t * 3 + 2] - c.z;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 > r2) continue;
          const edge = Math.min(1, (r - Math.sqrt(d2)) / (r * 0.12 + 0.002)); // קצה רך קצת
          const a = al * edge;
          const x = t % S, y = (t / S) | 0;
          let o = t * 4;
          A.data[o] += (cr - A.data[o]) * a; A.data[o + 1] += (cg - A.data[o + 1]) * a; A.data[o + 2] += (cb - A.data[o + 2]) * a;
          const lx = (x / k) | 0, ly = (y / k) | 0;
          o = (ly * L + lx) * 4;
          E.data[o] += (er - E.data[o]) * a; E.data[o + 1] += (eg - E.data[o + 1]) * a; E.data[o + 2] += (eb - E.data[o + 2]) * a;
          O.data[o + 1] += (og - O.data[o + 1]) * a; O.data[o + 2] += (ob - O.data[o + 2]) * a;
          if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
  if (maxX < 0) return;
  // מעדכנים רק את הריבוע שהשתנה
  p.albedo.ctx.putImageData(A, 0, 0, minX, minY, maxX - minX + 1, maxY - minY + 1);
  const lx0 = Math.floor(minX / k), ly0 = Math.floor(minY / k), lw = Math.floor(maxX / k) - lx0 + 1, lh = Math.floor(maxY / k) - ly0 + 1;
  p.emissive.ctx.putImageData(E, 0, 0, lx0, ly0, lw, lh);
  p.orm.ctx.putImageData(O, 0, 0, lx0, ly0, lw, lh);
  p.albedo.texture.needsUpdate = p.emissive.texture.needsUpdate = p.orm.texture.needsUpdate = true;
}

/** קו צבע בין שתי נקודות על הגוף */
export function paintSegment(p: Part, a: THREE.Vector3, bpt: THREE.Vector3, b: Brush, radius: number) {
  const d = a.distanceTo(bpt);
  if (d > 0.5) return paintSphere(p, bpt, b, radius);
  const steps = Math.max(1, Math.ceil(d / Math.max(0.003, radius * 0.35)));
  const q = new THREE.Vector3();
  for (let i = 1; i <= steps; i++) paintSphere(p, q.lerpVectors(a, bpt, i / steps), b, radius);
}

function emisStyle(b: Brush) {
  const c = new THREE.Color(b.color);
  return `rgb(${Math.round(c.r * 255 * b.emis)},${Math.round(c.g * 255 * b.emis)},${Math.round(c.b * 255 * b.emis)})`;
}
const ormStyle = (b: Brush) => `rgb(255,${Math.round(b.rough * 255)},${Math.round(b.metal * 255)})`;

export function fillPart(p: Part, b: Brush) {
  for (const [l, s] of [[p.albedo, b.color], [p.emissive, emisStyle(b)], [p.orm, ormStyle(b)]] as const) {
    l.ctx.globalAlpha = 1;
    l.ctx.fillStyle = s;
    l.ctx.fillRect(0, 0, l.canvas.width, l.canvas.height);
    l.texture.needsUpdate = true;
  }
  invalidatePaint(p);
}

export function resetPaint(ch: Character) {
  for (const p of ch.parts) fillPart(p, { color: WHITE, alpha: 1, metal: 0, rough: 0.8, emis: 0 });
}

/** מעתיק את כל הצבע מדמות אחת לאחרת (לשכפולים) */
export function copyPaint(from: Character, to: Character) {
  from.parts.forEach((p, i) => {
    const q = to.parts[i];
    if (!q) return;
    for (const k of ["albedo", "emissive", "orm"] as const) {
      q[k].ctx.drawImage(p[k].canvas, 0, 0, q[k].canvas.width, q[k].canvas.height);
      q[k].texture.needsUpdate = true;
    }
    invalidatePaint(q);
  });
}

/** דוגמה של הצבע בנקודה (לטפטפת על הגוף ולמעקב של הציידים) */
export function samplePart(p: Part, uv: THREE.Vector2, out: THREE.Color) {
  const s = p.albedo.canvas.width;
  const x = Math.min(s - 1, Math.max(0, Math.floor(uv.x * s)));
  const y = Math.min(s - 1, Math.max(0, Math.floor((1 - uv.y) * s)));
  const img = pixels(p.albedo);
  const o = (y * s + x) * 4;
  return out.setRGB(img.data[o] / 255, img.data[o + 1] / 255, img.data[o + 2] / 255, THREE.SRGBColorSpace);
}

/** שם מעל הראש */
/** אותו פונט כמו כל הממשק של המשחק (M PLUS Rounded) + גיבוי לשמות בעברית/סינית/קוריאנית/ערבית */
export const LABEL_FONT = `"M PLUS Rounded 1c", "Noto Sans SC", "Noto Sans KR", "Noto Sans Arabic", "Noto Sans Hebrew", system-ui, sans-serif`;
export function setLabel(ch: Character, text: string | null, color = "#ffffff", likes = 0) {
  if (ch.label) {
    ch.root.remove(ch.label);
    (ch.label.material as THREE.SpriteMaterial).map?.dispose();
    ch.label.material.dispose();
    ch.label = null;
  }
  if (!text) return;
  // כמו במשחק: שם לבן דק עם צל רך, ומעליו אגודל זהב + מספר הלייקים
  const c = document.createElement("canvas");
  c.width = 320;
  c.height = 96;
  const g = c.getContext("2d")!;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.shadowColor = "rgba(0,0,0,0.85)";
  g.shadowBlur = 6;
  g.font = `700 30px ${LABEL_FONT}`;
  g.fillStyle = color;
  g.fillText(text, 160, 70);
  if (likes > 0) {
    g.fillStyle = "#f5b500";
    g.beginPath(); // אגודל: כף + אצבע
    g.roundRect(136, 22, 9, 16, 2);
    g.roundRect(147, 20, 17, 18, 3);
    g.moveTo(150, 21); g.lineTo(154, 8); g.quadraticCurveTo(160, 8, 159, 14); g.lineTo(158, 21);
    g.fill();
    g.font = `800 22px ${LABEL_FONT}`;
    g.fillText(String(likes), 178, 28);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false }));
  sp.scale.set(2, 0.6, 1);
  sp.position.y = 2.2;
  sp.renderOrder = 12;
  ch.root.add(sp);
  ch.label = sp;
}

/** הזוהר האדום/כחול של שלב "בדיקת תשובות" */
export function setGlow(ch: Character, color: string | null) {
  for (const p of ch.parts) {
    const m = p.mesh.material as THREE.MeshStandardMaterial;
    if (color) {
      m.userData.glow = true;
      m.emissive.set(color);
      m.emissiveMap = null;
      m.emissiveIntensity = 0.9;
    } else if (m.userData.glow) {
      m.userData.glow = false;
      m.emissive.set("#ffffff");
      m.emissiveMap = p.emissive.texture;
      m.emissiveIntensity = 1;
    }
    m.needsUpdate = true;
  }
}

export function disposeCharacter(ch: Character) {
  ch.root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.userData?.sharedGeometry) m.geometry?.dispose();
    const mm = m.material as THREE.MeshStandardMaterial | THREE.SpriteMaterial | undefined;
    if (mm) {
      (mm as THREE.MeshStandardMaterial).map?.dispose();
      (mm as THREE.MeshStandardMaterial).emissiveMap?.dispose();
      (mm as THREE.MeshStandardMaterial).roughnessMap?.dispose();
      mm.dispose();
    }
  });
}
