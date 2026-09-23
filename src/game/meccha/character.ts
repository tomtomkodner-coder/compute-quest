// הדמות: בובה לבנה דמוית אדם (כמו במשחק המקורי — בלי זנב ובלי פנים של זיקית).
// שלושה סוגי גוף (רגיל / קובייה / שמנמן), חמישה גדלים, ומפרקים לתנוחות (כתפיים, מרפקים, ירכיים, ברכיים).
// לכל חלק בגוף יש שלוש שכבות צבע: צבע בסיס, זוהר (Emissive) ומתכתיות/חספוס.
import * as THREE from "three";

export type BodyType = "normal" | "cube" | "plump";
export type SizeId = "petit" | "small" | "normal" | "large" | "huge";
export type PoseId =
  | "stand" | "sit" | "lie" | "spread" | "lump" | "cactus" | "surrender" | "side"
  | "crosslegged" | "bridge" | "onehand" | "bend" | "tpose" | "hips" | "handstand" | "banzai" | "crouch";

export const POSES: PoseId[] = [
  "stand", "sit", "lie", "spread", "lump", "cactus", "surrender", "side",
  "crosslegged", "bridge", "onehand", "bend", "tpose", "hips", "handstand", "banzai",
];

export const SIZES: { id: SizeId; scale: number; label: string }[] = [
  { id: "petit", scale: 0.5, label: "0.5x" },
  { id: "small", scale: 0.75, label: "0.75x" },
  { id: "normal", scale: 1, label: "1x" },
  { id: "large", scale: 1.4, label: "1.4x" },
  { id: "huge", scale: 1.7, label: "1.7x" },
];
export const BODY_TYPES: BodyType[] = ["normal", "cube", "plump"];

const TEX = 128;
const LAYER = 64;
const WHITE = "#f4f4f4";

export interface PaintLayer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
}
export interface Part {
  mesh: THREE.Mesh;
  albedo: PaintLayer;
  emissive: PaintLayer;
  orm: PaintLayer; // G = חספוס, B = מתכתיות
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
}

function layer(size: number, fill: string, color = false): PaintLayer {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return { canvas, ctx, texture };
}

const ORM_DEFAULT = "rgb(255,204,0)"; // חספוס 0.8, מתכתיות 0

export function buildCharacter(opts: { bodyType?: BodyType; armed?: boolean; gunColor?: string } = {}): Character {
  const bodyType = opts.bodyType ?? "normal";
  const cube = bodyType === "cube";
  const plump = bodyType === "plump";
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const parts: Part[] = [];

  const part = (geo: THREE.BufferGeometry, parent: THREE.Object3D, pos: [number, number, number]) => {
    const albedo = layer(TEX, WHITE, true);
    const emissive = layer(LAYER, "#000000", true);
    const orm = layer(LAYER, ORM_DEFAULT);
    const m = new THREE.MeshStandardMaterial({
      color: "#ffffff", map: albedo.texture,
      emissive: "#ffffff", emissiveMap: emissive.texture,
      roughness: 1, metalness: 1, roughnessMap: orm.texture, metalnessMap: orm.texture,
    });
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(...pos);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    parts.push({ mesh, albedo, emissive, orm });
    return mesh;
  };
  const group = (parent: THREE.Object3D, pos: [number, number, number]) => {
    const g = new THREE.Group();
    g.position.set(...pos);
    parent.add(g);
    return g;
  };
  const w = plump ? 1.45 : 1;
  const limbR = plump ? 1.3 : 1;

  // אגן + גו
  const hipsY = 0.86;
  if (cube) {
    part(new THREE.BoxGeometry(0.46, 0.62, 0.3), body, [0, 1.2, 0]);
    part(new THREE.BoxGeometry(0.4, 0.2, 0.26), body, [0, 0.88, 0]);
  } else {
    part(new THREE.CapsuleGeometry(0.2 * w, 0.34, 6, 16, 3), body, [0, 1.18, 0]).scale.set(1, 1, plump ? 1.25 : 0.72);
    part(new THREE.SphereGeometry(0.19 * w, 16, 10), body, [0, 0.9, 0]).scale.set(1, 0.7, plump ? 1.1 : 0.75);
  }
  // צוואר וראש
  const head = group(body, [0, 1.5, 0]);
  if (cube) part(new THREE.BoxGeometry(0.36, 0.36, 0.36), head, [0, 0.16, 0]);
  else {
    part(new THREE.CylinderGeometry(0.06, 0.07, 0.12, 10), head, [0, 0, 0]);
    part(new THREE.SphereGeometry(0.2, 20, 16), head, [0, 0.2, 0]).scale.set(0.95, 1.08, 1);
  }
  // ידיים: כתף → זרוע, מרפק → אמה + כף יד
  const shoulderX = cube ? 0.31 : 0.25 * w + 0.04;
  const arm = (s: number) => {
    const sh = group(body, [s * shoulderX, 1.42, 0]);
    if (cube) part(new THREE.BoxGeometry(0.12, 0.3, 0.12), sh, [0, -0.15, 0]);
    else part(new THREE.CapsuleGeometry(0.06 * limbR, 0.2, 4, 10, 2), sh, [0, -0.15, 0]);
    const el = group(sh, [0, -0.32, 0]);
    if (cube) {
      part(new THREE.BoxGeometry(0.11, 0.26, 0.11), el, [0, -0.13, 0]);
      part(new THREE.BoxGeometry(0.14, 0.12, 0.14), el, [0, -0.32, 0]);
    } else {
      part(new THREE.CapsuleGeometry(0.05 * limbR, 0.18, 4, 10, 2), el, [0, -0.13, 0]);
      part(new THREE.SphereGeometry(0.065 * limbR, 12, 8), el, [0, -0.31, 0]);
    }
    return { sh, el };
  };
  const { sh: shL, el: elL } = arm(1);
  const { sh: shR, el: elR } = arm(-1);
  // רגליים: ירך → ירך עליונה, ברך → שוק + כף רגל
  const leg = (s: number) => {
    const hip = group(body, [s * (cube ? 0.12 : 0.1 * w), hipsY, 0]);
    if (cube) part(new THREE.BoxGeometry(0.15, 0.4, 0.15), hip, [0, -0.2, 0]);
    else part(new THREE.CapsuleGeometry(0.075 * limbR, 0.26, 4, 10, 2), hip, [0, -0.2, 0]);
    const kn = group(hip, [0, -0.42, 0]);
    if (cube) {
      part(new THREE.BoxGeometry(0.14, 0.34, 0.14), kn, [0, -0.17, 0]);
      part(new THREE.BoxGeometry(0.16, 0.08, 0.26), kn, [0, -0.39, 0.05]);
    } else {
      part(new THREE.CapsuleGeometry(0.065 * limbR, 0.24, 4, 10, 2), kn, [0, -0.18, 0]);
      part(new THREE.SphereGeometry(0.07 * limbR, 12, 8), kn, [0, -0.39, 0.04]).scale.set(1, 0.6, 1.6);
    }
    return { hip, kn };
  };
  const { hip: hipL, kn: knL } = leg(1);
  const { hip: hipR, kn: knR } = leg(-1);

  let gun: THREE.Group | null = null;
  if (opts.armed) {
    // רובה הצבע: שוטגאן עם מיכל צבע בצבע השחקן
    gun = new THREE.Group();
    const dark = new THREE.MeshStandardMaterial({ color: "#2b2d42", roughness: 0.45, metalness: 0.5 });
    const tank = new THREE.MeshStandardMaterial({ color: opts.gunColor ?? "#ff006e", roughness: 0.3 });
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.8, 10), dark);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0, 0.4);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.16, 0.42), dark);
    stock.position.set(0, -0.03, -0.1);
    const can = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), tank);
    can.position.set(0, 0.13, -0.02);
    const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.22, 10), tank);
    pump.rotation.x = Math.PI / 2;
    pump.position.set(0, -0.07, 0.38);
    for (const m of [barrel, stock, can, pump]) { m.castShadow = true; gun.add(m); }
    gun.position.set(-0.12, 1.2, 0.36);
    body.add(gun);
  }

  const ch: Character = {
    root, body, head, shL, shR, elL, elR, hipL, hipR, knL, knR, parts, meshes: parts.map((p) => p.mesh),
    gun, label: null, pose: "stand", size: "normal", bodyType, walkPhase: 0, armed: !!opts.armed,
  };
  for (const m of ch.meshes) m.userData.char = ch;
  applyPose(ch, "stand");
  return ch;
}

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
  crouch: { body: { y: -0.32 }, hipL: [-1.1, 0, 0.1], hipR: [-1.1, 0, -0.1], knL: [1.9, 0, 0], knR: [1.9, 0, 0], shL: [-0.6, 0, 0.2], shR: [-0.6, 0, -0.2], elL: [-0.8, 0, 0], elR: [-0.8, 0, 0] },
};

/** מחיל תנוחה; walk>0 = אנימציית הליכה */
export function applyPose(ch: Character, pose: PoseId, walk = 0) {
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

function dotOn(l: PaintLayer, uv: THREE.Vector2, style: string, radius: number, alpha: number) {
  const size = l.canvas.width;
  const x = uv.x * size;
  const y = (1 - uv.y) * size;
  const r = Math.max(0.8, radius * size);
  l.ctx.globalAlpha = alpha;
  l.ctx.fillStyle = style;
  for (const ox of [-size, 0, size]) {
    l.ctx.beginPath();
    l.ctx.arc(x + ox, y, r, 0, Math.PI * 2);
    l.ctx.fill();
  }
  l.ctx.globalAlpha = 1;
  l.texture.needsUpdate = true;
}

function emisStyle(b: Brush) {
  const c = new THREE.Color(b.color);
  return `rgb(${Math.round(c.r * 255 * b.emis)},${Math.round(c.g * 255 * b.emis)},${Math.round(c.b * 255 * b.emis)})`;
}
const ormStyle = (b: Brush) => `rgb(255,${Math.round(b.rough * 255)},${Math.round(b.metal * 255)})`;

export function paintDot(p: Part, uv: THREE.Vector2, b: Brush, radius: number) {
  dotOn(p.albedo, uv, b.color, radius, b.alpha);
  dotOn(p.emissive, uv, emisStyle(b), radius, b.alpha);
  dotOn(p.orm, uv, ormStyle(b), radius, b.alpha);
}

export function paintLine(p: Part, a: THREE.Vector2, bpt: THREE.Vector2, b: Brush, radius: number) {
  const d = a.distanceTo(bpt);
  if (d > 0.35) return paintDot(p, bpt, b, radius);
  const steps = Math.max(1, Math.ceil(d / Math.max(0.004, radius * 0.4)));
  const q = new THREE.Vector2();
  for (let i = 1; i <= steps; i++) paintDot(p, q.lerpVectors(a, bpt, i / steps), b, radius);
}

export function fillPart(p: Part, b: Brush) {
  for (const [l, s] of [[p.albedo, b.color], [p.emissive, emisStyle(b)], [p.orm, ormStyle(b)]] as const) {
    l.ctx.globalAlpha = 1;
    l.ctx.fillStyle = s;
    l.ctx.fillRect(0, 0, l.canvas.width, l.canvas.height);
    l.texture.needsUpdate = true;
  }
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
  });
}

/** דוגמה של הצבע בנקודה (לטפטפת על הגוף ולמעקב של הציידים) */
export function samplePart(p: Part, uv: THREE.Vector2, out: THREE.Color) {
  const s = p.albedo.canvas.width;
  let u = uv.x % 1;
  if (u < 0) u += 1;
  const x = Math.min(s - 1, Math.floor(u * s));
  const y = Math.min(s - 1, Math.max(0, Math.floor((1 - uv.y) * s)));
  const d = p.albedo.ctx.getImageData(x, y, 1, 1).data;
  return out.setRGB(d[0] / 255, d[1] / 255, d[2] / 255, THREE.SRGBColorSpace);
}

/** שם מעל הראש */
export function setLabel(ch: Character, text: string | null, color = "#ffffff", likes = 0) {
  if (ch.label) {
    ch.root.remove(ch.label);
    (ch.label.material as THREE.SpriteMaterial).map?.dispose();
    ch.label.material.dispose();
    ch.label = null;
  }
  if (!text) return;
  const c = document.createElement("canvas");
  c.width = 320;
  c.height = 64;
  const g = c.getContext("2d")!;
  g.font = `800 32px "M PLUS Rounded 1c", "Varela Round", Arial, sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  const label = likes > 0 ? `${text}  👍${likes}` : text;
  g.lineWidth = 7;
  g.strokeStyle = "rgba(0,0,0,0.7)";
  g.strokeText(label, 160, 34);
  g.fillStyle = color;
  g.fillText(label, 160, 34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false }));
  sp.scale.set(2, 0.4, 1);
  sp.position.y = 2.15;
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
    m.geometry?.dispose();
    const mm = m.material as THREE.MeshStandardMaterial | THREE.SpriteMaterial | undefined;
    if (mm) {
      (mm as THREE.MeshStandardMaterial).map?.dispose();
      (mm as THREE.MeshStandardMaterial).emissiveMap?.dispose();
      (mm as THREE.MeshStandardMaterial).roughnessMap?.dispose();
      mm.dispose();
    }
  });
}
