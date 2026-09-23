// MECCHA CHAMELEON — שיבוט לדפדפן. מנוע המשחק.
// זרימת סיבוב כמו במקור: לובי תלת־ממדי ← ספירה לאחור ← הכנה (הציידים נעולים) ← ציד ← בדיקת תשובות ← לובי.
// המארח (מי שנכנס ראשון) מנהל את הסיבוב והבוטים; כל שחקן אחראי על הדמות, הצבע והיריות שלו.
import * as THREE from "three";
import { buildMap, MAPS, type World } from "./maps";
import { buildNav, type Nav } from "./nav";
import {
  buildCharacter, applyPose, setSize, sizeScale, paintDot, paintLine, fillPart, resetPaint, copyPaint, samplePart,
  setLabel, setGlow, disposeCharacter, POSES, SIZES, BODY_TYPES,
  type Character, type PoseId, type SizeId, type BodyType, type Brush, type Part,
} from "./character";
import { Fx } from "./fx";
import type { Net, Presence } from "./net";
import { sfxClick, sfxCorrect, sfxWrong, sfxWin, sfxTick, startMusic, stopMusic } from "@/lib/sound";

// ================= טיפוסים =================

export type Role = "hider" | "hunter" | "spectator";
export type Phase = "lobby" | "countdown" | "hide" | "hunt" | "check";
export type ModeId = "normal" | "infection" | "double";

export interface Settings {
  map: string; // מזהה מפה או "random"
  mode: ModeId;
  hideTime: number;
  huntTime: number;
  checkTime: number;
  hunters: number;
  ammoLimit: boolean;
  ammo: number;
  whistle: number; // 0 = כבוי
  missed: boolean;
  allowPetit: boolean;
  bots: number;
  difficulty: 0 | 1 | 2;
}

export interface ResultRow { id: string; n: string; c: string; r: "hider" | "hunter"; found: boolean; p: number; b: boolean }

interface RS {
  id: number;
  ph: Phase;
  t: number;
  s: Settings;
  map: string;
  roles: Record<string, "hider" | "hunter">;
  dead: string[];
  conv: string[];
  deadAt: Record<string, number[]>;
  final: Record<string, number[]>;
  statues?: Record<string, number[]>;
  finds?: Record<string, string[]>;
  win?: string;
  why?: string;
  res?: ResultRow[];
}

interface BotPub { id: string; n: string; c: string; p: [number, number, number]; y: number; po: number; sz: number; bt: number; s: number; am: number; pts: number; cy: number; mv: number }

export interface PlayerInfo { id: string; name: string; color: string; role: Role; alive: boolean; bot: boolean; me: boolean; host: boolean; pts: number; likes: number; onPad: boolean; ammo: number }

export interface ChatLine { id: number; name: string; color: string; m: string; t: number }

export interface HudState {
  net: Net["kind"];
  code?: string;
  connected: boolean;
  isHost: boolean;
  phase: Phase;
  time: number;
  roundId: number;
  settings: Settings;
  mapName: string;
  myRole: Role;
  alive: boolean;
  ammo: number;
  pts: number;
  paintMode: boolean;
  picking: boolean;
  pickPreview: string | null;
  color: string;
  alpha: number;
  metal: number;
  rough: number;
  emis: number;
  brush: number;
  history: string[];
  pose: PoseId;
  size: SizeId;
  bodyType: BodyType;
  room: string;
  players: PlayerInfo[];
  hiderIcons: { id: string; found: boolean }[];
  results?: ResultRow[];
  win?: string;
  why?: string;
  toast: { text: string; id: number } | null;
  locked: boolean;
  spectating: string | null;
  freeCam: boolean;
  tps: boolean;
  attached: boolean;
  crouch: boolean;
  clones: number;
  nameplates: boolean;
  xray: boolean;
  shadow: boolean;
  chat: ChatLine[];
  votes: { have: number; need: number; mine: boolean };
  nearPlay: boolean;
  onPad: boolean;
  likeTarget: string | null;
  likedThisRound: boolean;
  likes: number;
  frozen: boolean;
}

export interface EngineOptions {
  name: string;
  color: string;
  muted: boolean;
  defaultBots: number;
  onHud: (h: HudState) => void;
}

interface BotAI {
  state: "patrol" | "investigate" | "inspect" | "aim";
  stateT: number;
  path: [number, number][];
  target: string | null;
  sus: Map<string, number>;
  ignore: Map<string, number>;
  headYaw: number;
  lookPhase: number;
  percT: number;
  shotCd: number;
  whistleT: number;
}

interface Clone { ch: Character; pos: THREE.Vector3; yaw: number; pose: PoseId; size: SizeId; owner: string }

interface Player {
  id: string;
  name: string;
  color: string;
  bot: boolean;
  local: boolean;
  role: Role;
  alive: boolean;
  ch: Character;
  armed: boolean;
  bodyType: BodyType;
  pos: THREE.Vector3;
  tpos: THREE.Vector3;
  yaw: number;
  tyaw: number;
  vy: number;
  pose: PoseId;
  size: SizeId;
  moving: boolean;
  camYaw: number;
  camPitch: number;
  ammo: number;
  pts: number;
  likes: number;
  vote: string;
  moveT: number;
  samples: { mesh: THREE.Mesh; local: THREE.Vector3 }[];
  dying: number;
  seed: number;
  paintedKey: string;
  labelKey: string;
  ai?: BotAI;
  radius: number;
  clones: Clone[];
  cloneKey: string;
  display: boolean; // בשלב בדיקת התשובות: מוצג מקובע במקום שבו הסתתר
}

interface ShotMsg { o: number[]; h: number[][]; c: string }
interface SnapMsg { s: number; pi: number; L: number; k: number; n: number; d: string }
type Shot = { hitId: string | null; pts: number[][]; muzzle: THREE.Vector3; fleeing: boolean };

export const DEFAULT_SETTINGS: Settings = {
  map: "mansion", mode: "normal", hideTime: 75, huntTime: 240, checkTime: 30, hunters: 1,
  ammoLimit: false, ammo: 5, whistle: 45, missed: true, allowPetit: false, bots: 3, difficulty: 1,
};
const GRAVITY = 20;
const SPEED = { hider: 5, hunter: 5.2, crouch: 2.4, spec: 10 };
const SHOT_CD = 1500;
const PELLETS = 7;
const SPREAD = 0.04;
const COUNTDOWN = 5;
const BOT_NAMES = ["Bot Noa", "Bot Itay", "Bot Maya", "Bot Omer", "Bot Shira", "Bot Yoni", "Bot Tamar", "Bot Ariel"];
const BOT_COLORS = ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93", "#ff924c", "#52b69a", "#f15bb5"];
const POSE_SIL: Partial<Record<PoseId, number>> = { stand: 0.26, lump: 0.08, lie: 0.06, side: 0.07, sit: 0.13, crosslegged: 0.12, crouch: 0.15, bend: 0.15, bridge: 0.12, handstand: 0.2 };
const SIZE_SIL: Record<SizeId, number> = { petit: 0.4, small: 0.65, normal: 1, large: 1.45, huge: 1.8 };

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function colorDiff(a: THREE.Color, b: THREE.Color) {
  const ar = a.clone().convertLinearToSRGB();
  const br = b.clone().convertLinearToSRGB();
  const dr = ar.r - br.r, dg = ar.g - br.g, db = ar.b - br.b;
  return Math.sqrt((2 * dr * dr + 4 * dg * dg + 3 * db * db) / 9);
}
const r2 = (n: number) => Math.round(n * 100) / 100;
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const HEX = /^#[0-9a-f]{6}$/i;
const poseIdx = (p: PoseId) => (p === "crouch" ? -1 : Math.max(0, POSES.indexOf(p)));
const sizeIdx = (s: SizeId) => Math.max(0, SIZES.findIndex((x) => x.id === s));
const idxPose = (i: number): PoseId => (i === -1 ? "crouch" : POSES[i] ?? "stand");
const idxSize = (i: number): SizeId => SIZES[i]?.id ?? "normal";
const idxBody = (i: number): BodyType => BODY_TYPES[i] ?? "normal";

function loadLikes() {
  try { return Number(localStorage.getItem("meccha_eeyan") || 0) || 0; } catch { return 0; }
}
function saveLikes(n: number) {
  try { localStorage.setItem("meccha_eeyan", String(n)); } catch { /* ignore */ }
}

// ================= מנוע =================

export class Engine {
  private container: HTMLElement;
  private net: Net;
  private opts: EngineOptions;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(70, 1, 0.05, 200);
  private world!: World;
  private worldId = "";
  private nav!: Nav;
  private fx: Fx;
  private ray = new THREE.Raycaster();
  private raf = 0;
  private last = 0;
  private disposed = false;
  private ro: ResizeObserver;
  private hemi: THREE.HemisphereLight;
  private sun: THREE.DirectionalLight;
  private points: THREE.PointLight[] = [];
  private viewGun: THREE.Group;

  private players = new Map<string, Player>();
  private me: Player;
  private joinedAt = Date.now();
  private rs: RS;
  private rsKey = "";
  private rsSeenId = -1;
  private rsPhaseSeen: Phase = "lobby";
  private hostId = "";
  private localEnd = 0;
  private lastT = -1;
  private lastTick = -1;
  private pendingDead = new Map<string, number>();
  private offs: (() => void)[] = [];
  private rsBots = new Set<string>();
  private lastBots = "";
  private statues = new Map<string, Clone>();
  private myFinds = new Set<string>();

  // קלט ומצלמה
  private camYaw = Math.PI;
  private camPitch = 0.25;
  private camDist = 4.5;
  private paintDist = 3.4;
  private keys = new Set<string>();
  private joy = { x: 0, y: 0 };
  private wantJump = false;
  private pointerLocked = false;
  private lmb = false;
  private rmb = false;
  private mouse = { x: 0, y: 0 };
  private drag: { id: number; x: number; y: number; sx: number; sy: number; t: number; mode: "cam" | "paint" | "size"; uv: THREE.Vector2 | null; part: Part | null } | null = null;
  private specPos = new THREE.Vector3(0, 6, 6);
  private specTarget: string | null = null;
  private freeCam = false;
  private tps = false;
  private attached: { nx: number; nz: number } | null = null;
  private crouch = false;
  private lastShot = 0;
  private lastWhistle = 0;
  private listeners: [EventTarget, string, EventListener][] = [];
  onPoseMenu: ((open: boolean) => void) | null = null;
  onInteract: (() => void) | null = null;
  onChatKey: (() => void) | null = null;

  // צביעה וסנכרון
  private brush: Brush = { color: "#e63946", alpha: 1, metal: 0, rough: 0.8, emis: 0 };
  private brushSize = 0.06;
  private history: string[] = [];
  private histIdx = 0;
  private picking = false;
  private pickPreview: { color: string; metal: number; rough: number; emis: number } | null = null;
  private opsBuf: unknown[] = [];
  private opsT = 0;
  private sendQueue: [string, unknown][] = [];
  private sendT = 0;
  private snapBuf = new Map<string, { n: number; parts: string[] }>();
  private lastSnapReply = 0;
  private presT = 0;
  private lastPres = "";
  private ptsT = 0;
  private whistleT = 0;
  private finalWhistleDone = false;
  private hostT = 0;
  private botPubT = 0;
  private nameplates = true;
  private xray = false;
  private shadow = true;
  private chat: ChatLine[] = [];
  private chatId = 0;
  private likes = loadLikes();
  private likedRound = -1;
  private likeTarget: { id: string; name: string } | null = null;
  private poseIconCache: Record<string, string> | null = null;

  private hud: HudState;
  private hudT = 0;
  private toastId = 0;

  constructor(container: HTMLElement, net: Net, opts: EngineOptions) {
    this.container = container;
    this.net = net;
    this.opts = opts;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const cv = this.renderer.domElement;
    cv.style.cssText = "width:100%;height:100%;display:block;touch-action:none;outline:none";
    cv.tabIndex = 0;
    container.appendChild(cv);

    this.hemi = new THREE.HemisphereLight("#ffffff", "#888888", 1.2);
    this.sun = new THREE.DirectionalLight("#ffffff", 1.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -27, right: 27, top: 24, bottom: -24, near: 1, far: 90 });
    this.sun.shadow.camera.updateProjectionMatrix();
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.04;
    this.scene.add(this.hemi, this.sun, this.camera);
    this.fx = new Fx(this.scene);
    this.fx.muted = opts.muted;

    this.viewGun = this.makeViewGun(opts.color);
    this.camera.add(this.viewGun);
    this.viewGun.visible = false;

    this.rs = { id: 0, ph: "lobby", t: 0, s: { ...DEFAULT_SETTINGS, bots: opts.defaultBots }, map: "lobby", roles: {}, dead: [], conv: [], deadAt: {}, final: {} };
    this.loadWorld("lobby");

    this.me = this.makePlayer(net.selfId(), opts.name, opts.color, false, true);
    this.me.likes = this.likes;
    this.spawnInLobby(this.me);

    this.hud = {
      net: net.kind, code: net.code, connected: true, isHost: true, phase: "lobby", time: 0, roundId: 0,
      settings: this.rs.s, mapName: "Lobby", myRole: "hider", alive: true, ammo: 0, pts: 0,
      paintMode: false, picking: false, pickPreview: null, color: this.brush.color, alpha: 1, metal: 0, rough: 0.8, emis: 0, brush: this.brushSize, history: [],
      pose: "stand", size: "normal", bodyType: "normal", room: "", players: [], hiderIcons: [],
      toast: null, locked: false, spectating: null, freeCam: false, tps: false, attached: false, crouch: false, clones: 0,
      nameplates: true, xray: false, shadow: true, chat: [], votes: { have: 0, need: 0, mine: false }, nearPlay: false, onPad: false,
      likeTarget: null, likedThisRound: false, likes: this.likes, frozen: false,
    };

    this.offs.push(net.on("shot", (d) => this.onShot(d as ShotMsg)));
    this.offs.push(net.on("hit", (d, f) => this.onHit(d as { t: string }, f)));
    this.offs.push(net.on("paint", (d, f) => this.onPaintOps(d as { ops: unknown[] }, f)));
    this.offs.push(net.on("psnap", (d, f) => this.onSnap(d as SnapMsg, f)));
    this.offs.push(net.on("paintreq", () => this.onPaintReq()));
    this.offs.push(net.on("whistle", (d) => this.onWhistle(d as { id: string })));
    this.offs.push(net.on("like", (d, f) => this.onLike(d as { to: string }, f)));
    this.offs.push(net.on("chat", (d, f) => this.onChat(d as { m: string }, f)));
    this.offs.push(net.on("find", (d, f) => this.onFind(d as { t: string }, f)));
    this.offs.push(net.onPeers(() => this.syncPeers()));
    window.setTimeout(() => { if (!this.disposed) this.net.emit("paintreq", {}); }, 2500);

    this.bindInput();
    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.publishSelf(true);
    this.syncPeers();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  // ================= עולם =================

  private loadWorld(id: string) {
    if (this.worldId === id && this.world) return;
    if (this.world) {
      this.scene.remove(this.world.group);
      this.world.dispose();
    }
    this.fx.clearDecals();
    this.world = buildMap(id);
    this.worldId = id;
    this.scene.add(this.world.group);
    const L = this.world.lighting;
    this.scene.background = new THREE.Color(L.sky);
    this.scene.fog = L.fog ? new THREE.Fog(L.fog[0], L.fog[1], L.fog[2]) : null;
    this.hemi.color.set(L.hemi[0]);
    this.hemi.groundColor.set(L.hemi[1]);
    this.hemi.intensity = L.hemi[2];
    if (L.sun) {
      this.sun.visible = true;
      this.sun.color.set(L.sun.color);
      this.sun.intensity = L.sun.int;
      this.sun.position.set(...L.sun.pos);
    } else this.sun.visible = false;
    for (const p of this.points) this.scene.remove(p);
    this.points = L.points.map((pt) => {
      const l = new THREE.PointLight(pt.color, pt.int, pt.dist, 1.6);
      l.position.set(...pt.pos);
      this.scene.add(l);
      return l;
    });
    this.renderer.toneMappingExposure = L.exposure ?? 1;
    this.world.setGate(true);
    this.nav = buildNav(this.world);
    this.world.setGate(this.rs?.ph !== "hide");
    this.attached = null;
  }

  /** הכיוון (yaw של דמות) משער חדר הציידים — כדי שהציידים יתחילו כשהם מסתכלים על השער */
  private gateYaw(from: THREE.Vector3) {
    const g = this.world.obstacles.find((o) => o.gate);
    if (!g) return Math.PI;
    return Math.atan2((g.minX + g.maxX) / 2 - from.x, (g.minZ + g.maxZ) / 2 - from.z);
  }

  private spawnInLobby(p: Player) {
    const sp = this.world.hiderSpawns[Math.floor(Math.random() * this.world.hiderSpawns.length)];
    p.pos.set(sp.x + (Math.random() - 0.5) * 2, 0, sp.z + (Math.random() - 0.5) * 2);
    const l = this.world.lobby;
    if (l && Math.hypot(p.pos.x - l.pad.x, p.pos.z - l.pad.z) < l.pad.r + 0.5) p.pos.z = l.pad.z + l.pad.r + 1.5;
    p.tpos.copy(p.pos);
    p.vy = 0;
  }

  private makeViewGun(color: string) {
    const g = new THREE.Group();
    const dark = new THREE.MeshStandardMaterial({ color: "#2b2d42", roughness: 0.45, metalness: 0.5 });
    const tank = new THREE.MeshStandardMaterial({ color, roughness: 0.3 });
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.6, 10), dark);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0, -0.35);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.34), dark);
    stock.position.set(0, -0.02, 0.05);
    const can = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), tank);
    can.position.set(0, 0.1, 0);
    const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.16, 10), tank);
    pump.rotation.x = Math.PI / 2;
    pump.position.set(0, -0.055, -0.3);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshStandardMaterial({ color: "#f4f4f4", roughness: 0.8 }));
    hand.position.set(0, -0.08, 0.1);
    g.add(barrel, stock, can, pump, hand);
    g.position.set(0.22, -0.2, -0.38);
    return g;
  }

  // ================= שחקנים =================

  private makePlayer(id: string, name: string, color: string, bot: boolean, local: boolean): Player {
    const ch = buildCharacter();
    const p: Player = {
      id, name, color, bot, local, role: "hider", alive: true, ch, armed: false, bodyType: "normal",
      pos: new THREE.Vector3(), tpos: new THREE.Vector3(), yaw: 0, tyaw: 0, vy: 0,
      pose: "stand", size: "normal", moving: false, camYaw: 0, camPitch: 0,
      ammo: 5, pts: 0, likes: 0, vote: "", moveT: 99, samples: [],
      dying: 0, seed: Math.floor(Math.random() * 1e9), paintedKey: "", labelKey: "", radius: 0.3,
      clones: [], cloneKey: "", display: false,
    };
    this.scene.add(ch.root);
    p.samples = this.makeSamples(ch);
    this.players.set(id, p);
    return p;
  }

  private makeSamples(ch: Character) {
    const samples: Player["samples"] = [];
    for (const m of ch.meshes) {
      const pos = m.geometry.getAttribute("position");
      const n = Math.max(2, Math.round(pos.count / 40));
      for (let k = 0; k < n; k++) {
        const i = Math.floor(Math.random() * pos.count);
        samples.push({ mesh: m, local: new THREE.Vector3().fromBufferAttribute(pos, i).multiplyScalar(0.96) });
      }
    }
    return samples;
  }

  /** בונה מחדש את הדגם כשמשתנים סוג הגוף או כשמקבלים רובה; שומר על הצבע כשאפשר */
  private setModel(p: Player, armed: boolean, bodyType: BodyType) {
    if (p.armed === armed && p.bodyType === bodyType) return;
    const old = p.ch;
    const ch = buildCharacter({ bodyType, armed, gunColor: p.color });
    if (old.bodyType === bodyType) copyPaint(old, ch);
    this.scene.remove(old.root);
    disposeCharacter(old);
    p.ch = ch;
    p.armed = armed;
    p.bodyType = bodyType;
    this.scene.add(ch.root);
    setSize(ch, armed ? "normal" : p.size);
    p.samples = this.makeSamples(ch);
    p.paintedKey = "";
    p.labelKey = "";
    if (p.local) { this.setXray(this.xray); this.setShadow(this.shadow); }
    this.updateLabel(p);
  }

  private removePlayer(id: string) {
    const p = this.players.get(id);
    if (!p || p.local) return;
    this.clearClones(p);
    this.scene.remove(p.ch.root);
    disposeCharacter(p.ch);
    this.players.delete(id);
  }

  private updateLabel(p: Player) {
    let text: string | null = null;
    const ph = this.rs.ph;
    if (!p.local && this.nameplates && p.ch.root.visible) {
      const mine = this.me.role;
      const open = ph === "lobby" || ph === "countdown" || ph === "check";
      if (open || mine === "spectator" || !this.me.alive || p.role === mine) text = p.name;
    }
    const color = p.role === "hunter" && ph !== "lobby" && ph !== "countdown" ? "#ffb703" : "#ffffff";
    const key = `${text}|${color}|${p.likes}`;
    if (key === p.labelKey) return;
    p.labelKey = key;
    setLabel(p.ch, text, color, p.likes);
  }

  // ================= שכפולים (分身) =================

  private cloneEntries(p: Player): number[][] {
    return p.clones.map((c) => [r2(c.pos.x), r2(c.pos.y), r2(c.pos.z), r2(c.yaw), poseIdx(c.pose), sizeIdx(c.size)]);
  }

  private addClone(p: Player, pos: THREE.Vector3, yaw: number, pose: PoseId, size: SizeId) {
    const ch = buildCharacter({ bodyType: p.bodyType });
    copyPaint(p.ch, ch);
    setSize(ch, size);
    applyPose(ch, pose);
    ch.root.position.copy(pos);
    ch.root.rotation.y = yaw;
    for (const m of ch.meshes) m.userData.cloneOf = p.id;
    this.scene.add(ch.root);
    p.clones.push({ ch, pos: pos.clone(), yaw, pose, size, owner: p.id });
    if (p.clones.length > 2) {
      const old = p.clones.shift()!;
      this.scene.remove(old.ch.root);
      disposeCharacter(old.ch);
    }
  }

  private clearClones(p: Player) {
    for (const c of p.clones) { this.scene.remove(c.ch.root); disposeCharacter(c.ch); }
    p.clones = [];
  }

  /** Q — מניחים שכפול עם הצבע והתנוחה הנוכחיים (עד 2) */
  placeClone() {
    const m = this.me;
    if (m.armed || !m.alive) return;
    const ph = this.rs.ph;
    if (ph !== "hide" && ph !== "hunt" && ph !== "lobby") return;
    this.addClone(m, m.pos, m.yaw, m.pose, m.size);
    this.publishSelf(true);
    if (!this.opts.muted) sfxClick();
    this.emit();
  }
  /** X — מוחקים את כל השכפולים */
  removeClones() {
    this.clearClones(this.me);
    this.publishSelf(true);
    this.emit();
  }

  private syncClones(p: Player, list: unknown) {
    const raw = Array.isArray(list) ? list : [];
    const arr = raw.filter((e): e is number[] => Array.isArray(e) && e.length >= 6 && e.every(Number.isFinite)).slice(0, 2);
    const key = JSON.stringify(arr);
    if (key === p.cloneKey) return;
    p.cloneKey = key;
    this.clearClones(p);
    for (const e of arr) this.addClone(p, new THREE.Vector3(e[0], e[1], e[2]), e[3], idxPose(e[4]), idxSize(e[5]));
  }

  // ================= רשת: נוכחות =================

  private publishSelf(force = false) {
    const m = this.me;
    const pres: Presence = {
      st: 1, n: m.name, c: m.color, j: this.joinedAt, sz: sizeIdx(m.size), bt: BODY_TYPES.indexOf(m.bodyType),
      p: [r2(m.pos.x), r2(m.pos.y), r2(m.pos.z)], y: r2(m.yaw), po: poseIdx(m.pose), mv: m.moving ? 1 : 0,
      cy: r2(this.camYaw), cp: r2(this.camPitch), am: m.ammo, pts: Math.floor(m.pts), lk: this.likes, vo: m.vote,
      cl: this.cloneEntries(m),
    };
    const key = JSON.stringify(pres);
    if (!force && key === this.lastPres) return;
    this.lastPres = key;
    this.net.setPresence(pres);
  }

  private syncPeers() {
    if (this.disposed) return;
    const peers = this.net.peers();
    let host: { id: string; j: number } | null = null;
    for (const pr of peers) {
      if (!pr.me && !pr.p.st) continue;
      const j = pr.me ? this.joinedAt : Number(pr.p.j) || Infinity;
      if (!host || j < host.j || (j === host.j && pr.id < host.id)) host = { id: pr.id, j };
    }
    const wasHost = this.isHost();
    this.hostId = host?.id ?? this.me.id;
    if (!wasHost && this.isHost() && this.net.kind !== "local") this.toast("You are now the host");

    const keep = new Set<string>([this.me.id]);
    for (const pr of peers) {
      if (pr.me || !pr.p.st) continue;
      keep.add(pr.id);
      let p = this.players.get(pr.id);
      if (!p) {
        p = this.makePlayer(pr.id, String(pr.p.n ?? "Player").slice(0, 16), HEX.test(String(pr.p.c)) ? String(pr.p.c) : "#ffffff", false, false);
        const pos = pr.p.p as number[] | undefined;
        if (Array.isArray(pos) && pos.length === 3 && pos.every(Number.isFinite)) { p.pos.set(pos[0], pos[1], pos[2]); p.tpos.copy(p.pos); }
        this.addChat("", "#aaaaaa", `${p.name} joined`);
        this.onRS();
      }
      this.readPresence(p, pr.p);
      if (pr.id === this.hostId && !this.isHost()) {
        if (Array.isArray(pr.p.bots)) this.adoptBots(pr.p.bots as BotPub[], keep);
        if (pr.p.rs) this.adoptRS(pr.p.rs as RS);
      }
    }
    if (this.isHost()) { for (const p of this.players.values()) if (p.bot) keep.add(p.id); }
    else for (const id of this.rsBots) keep.add(id);
    for (const id of [...this.players.keys()]) {
      if (keep.has(id)) continue;
      const p = this.players.get(id)!;
      if (!p.bot) this.addChat("", "#aaaaaa", `${p.name} left`);
      this.removePlayer(id);
    }
  }

  private readPresence(p: Player, pr: Presence) {
    p.name = String(pr.n ?? p.name).slice(0, 16);
    const pos = pr.p as number[] | undefined;
    if (Array.isArray(pos) && pos.length === 3 && pos.every(Number.isFinite)) p.tpos.set(pos[0], pos[1], pos[2]);
    if (Number.isFinite(pr.y)) p.tyaw = pr.y;
    if (p.display) { this.syncClones(p, pr.cl); return; } // בבדיקת התשובות: נשארים מקובעים כפי שהיו
    if (Number.isInteger(pr.po)) p.pose = idxPose(pr.po);
    const bt = Number.isInteger(pr.bt) ? idxBody(pr.bt) : p.bodyType;
    if (bt !== p.bodyType) this.setModel(p, p.armed, bt);
    const sz = Number.isInteger(pr.sz) ? idxSize(pr.sz) : p.size;
    if (sz !== p.size) { p.size = sz; if (!p.armed) setSize(p.ch, sz); }
    p.moving = !!pr.mv;
    if (Number.isFinite(pr.cy)) p.camYaw = pr.cy;
    if (Number.isFinite(pr.cp)) p.camPitch = pr.cp;
    if (Number.isFinite(pr.am)) p.ammo = pr.am;
    if (Number.isFinite(pr.pts)) p.pts = pr.pts;
    if (Number.isFinite(pr.lk) && pr.lk !== p.likes) { p.likes = pr.lk; this.updateLabel(p); }
    p.vote = typeof pr.vo === "string" ? pr.vo : "";
    this.syncClones(p, pr.cl);
  }

  private adoptRS(rs: RS) {
    if (!rs || typeof rs !== "object" || !rs.s || !rs.roles) return;
    const key = JSON.stringify(rs);
    if (key === this.rsKey) return;
    this.rsKey = key;
    this.rs = {
      ...rs, s: { ...DEFAULT_SETTINGS, ...rs.s },
      dead: Array.isArray(rs.dead) ? rs.dead : [], conv: Array.isArray(rs.conv) ? rs.conv : [],
      deadAt: rs.deadAt ?? {}, final: rs.final ?? {},
    };
    this.onRS();
  }

  private adoptBots(list: BotPub[], keep: Set<string>) {
    this.rsBots = new Set(list.map((b) => b.id));
    for (const b of list.slice(0, 12)) {
      if (typeof b.id !== "string" || !Array.isArray(b.p)) continue;
      keep.add(b.id);
      let p = this.players.get(b.id);
      if (!p) {
        p = this.makePlayer(b.id, String(b.n), String(b.c), true, false);
        p.pos.set(b.p[0], b.p[1], b.p[2]);
      }
      if (p.display) continue;
      p.tpos.set(b.p[0], b.p[1], b.p[2]);
      p.tyaw = b.y;
      p.pose = idxPose(b.po);
      p.camYaw = b.cy;
      p.ammo = b.am;
      p.pts = b.pts;
      p.moving = !!b.mv;
      p.seed = b.s;
      const bt = idxBody(b.bt);
      if (bt !== p.bodyType) this.setModel(p, p.armed, bt);
      const sz = idxSize(b.sz);
      if (sz !== p.size) { p.size = sz; if (!p.armed) setSize(p.ch, sz); }
    }
  }

  isHost() {
    return this.net.kind === "local" || this.hostId === this.me.id;
  }

  // ================= מצב הסיבוב =================

  private onRS() {
    const rs = this.rs;
    if (rs.t !== this.lastT) {
      this.lastT = rs.t;
      this.localEnd = performance.now() + rs.t * 1000;
    }
    const newRound = rs.id !== this.rsSeenId;
    const phaseChanged = rs.ph !== this.rsPhaseSeen || newRound;
    const prevPhase = this.rsPhaseSeen;
    this.rsSeenId = rs.id;
    this.rsPhaseSeen = rs.ph;

    const wantWorld = rs.ph === "lobby" || rs.ph === "countdown" ? "lobby" : rs.map;
    if (wantWorld !== this.worldId) {
      this.loadWorld(wantWorld);
      if (wantWorld === "lobby") for (const p of this.players.values()) if (p.local || p.bot) this.spawnInLobby(p);
    }
    if (newRound && rs.ph !== "lobby" && rs.ph !== "countdown") this.pendingDead.clear();

    const pre = rs.ph === "lobby" || rs.ph === "countdown";
    for (const p of this.players.values()) {
      const inRound = rs.roles[p.id] as Role | undefined;
      const role: Role = pre ? "hider" : inRound ?? "spectator";
      const deadNow = rs.dead.includes(p.id);
      const pend = this.pendingDead.get(p.id);
      if (pend && (deadNow || performance.now() > pend || rs.ph !== "hunt")) this.pendingDead.delete(p.id);
      const wasAlive = p.alive;
      p.role = role;
      p.alive = pre || (role !== "spectator" && !deadNow && !this.pendingDead.has(p.id));
      if (wasAlive && !p.alive && role === "hider" && p.dying <= 0 && rs.ph === "hunt") p.dying = 1.2;
      if (rs.ph !== "check") this.setModel(p, role === "hunter" && !pre, p.bodyType);
      this.updateVisibility(p);
      this.updateLabel(p);
    }
    this.world.setGate(rs.ph !== "hide");
    if (newRound && rs.ph === "hide") this.beginRoundLocal();
    if (phaseChanged) this.onPhase(rs.ph, prevPhase);
  }

  private updateVisibility(p: Player) {
    const ph = this.rs.ph;
    let v = true;
    if (ph === "check") v = p.display;
    else if (ph === "hide" || ph === "hunt") {
      if (p.role === "spectator") v = false;
      else if (!p.alive && p.dying <= 0) v = p.role === "hunter";
    }
    if (p.local && p.armed && !this.tps && (ph === "hide" || ph === "hunt") && !this.spectating()) v = false;
    p.ch.root.visible = v;
    for (const c of p.clones) c.ch.root.visible = ph === "check" ? p.display : (ph === "lobby" || ph === "hide" || ph === "hunt");
  }

  private onPhase(ph: Phase, prev: Phase) {
    const rs = this.rs;
    if (ph === "hunt") {
      this.fx.gateSound();
      this.whistleT = 0;
      this.finalWhistleDone = false;
      if (this.me.role === "hider" || rs.s.mode === "double") this.sendFullSnapshot();
      if (rs.s.mode === "double") this.setupStatues();
      if (!this.opts.muted) startMusic();
    } else if (ph === "check") {
      stopMusic();
      this.enterCheck();
      const iWon = (rs.win === "hiders" && rs.roles[this.me.id] === "hider") || (rs.win === "hunters" && rs.roles[this.me.id] === "hunter") || rs.win === this.me.id;
      if (!this.opts.muted) (iWon ? sfxWin : sfxCorrect)();
    } else if (ph === "lobby") {
      stopMusic();
      this.leaveCheck();
      this.clearStatues();
      this.fx.clearDecals();
      this.me.alive = true;
      for (const p of this.players.values()) {
        p.dying = 0;
        p.display = false;
        p.ch.body.scale.set(1, 1, 1);
        this.clearClones(p);
        p.cloneKey = "";
        this.updateVisibility(p);
        this.updateLabel(p);
      }
      this.freeCam = false;
      this.tps = false;
      this.hud.paintMode = false;
      if (prev !== "lobby") this.spawnInLobby(this.me);
    }
  }

  private beginRoundLocal() {
    const rs = this.rs;
    this.fx.clearDecals();
    this.pendingDead.clear();
    this.myFinds.clear();
    this.freeCam = false;
    this.attached = null;
    this.hud.paintMode = false;
    for (const p of this.players.values()) {
      resetPaint(p.ch); // הצבע מתאפס ללבן כשהמשחק מתחיל
      this.clearClones(p);
      p.cloneKey = "";
      p.paintedKey = "";
      p.dying = 0;
      p.pts = 0;
      p.display = false;
      p.ch.body.scale.set(1, 1, 1);
    }
    const m = this.me;
    m.ammo = rs.s.ammo;
    m.pts = 0;
    m.pose = "stand";
    m.vote = "";
    if (m.size === "petit" && !rs.s.allowPetit) { m.size = "normal"; if (!m.armed) setSize(m.ch, "normal"); }
    const ids = Object.keys(rs.roles).sort();
    const idx = Math.max(0, ids.indexOf(m.id));
    if (m.role === "hunter") {
      m.pos.copy(this.world.hunterSpawns[idx % this.world.hunterSpawns.length]);
      this.camYaw = this.gateYaw(m.pos) + Math.PI;
      this.camPitch = 0;
    } else if (m.role === "hider") {
      m.pos.copy(this.world.hiderSpawns[idx % this.world.hiderSpawns.length]);
    } else {
      this.specPos.set(0, 8, 0);
      this.freeCam = true;
    }
    m.tpos.copy(m.pos);
    m.vy = 0;
    this.publishSelf(true);
  }

  // ---------- בדיקת תשובות (答え合わせ): אדום = לא נמצא, כחול = נמצא ----------

  private enterCheck() {
    const rs = this.rs;
    this.hud.paintMode = false;
    this.attached = null;
    this.unlockPointerIfNeeded();
    this.specPos.copy(this.camera.position);
    this.freeCam = true;
    this.clearStatues();
    for (const p of this.players.values()) {
      const data = rs.final[p.id] ?? rs.deadAt[p.id];
      const found = !rs.final[p.id] && !!rs.deadAt[p.id];
      if (!data) { p.display = false; setGlow(p.ch, null); this.updateVisibility(p); continue; }
      if (p.armed) this.setModel(p, false, p.bodyType);
      p.display = true;
      p.pos.set(data[0], data[1], data[2]);
      p.tpos.copy(p.pos);
      p.yaw = p.tyaw = data[3];
      p.pose = idxPose(data[4]);
      p.size = idxSize(data[5]);
      setSize(p.ch, p.size);
      p.dying = 0;
      p.moving = false;
      p.ch.body.scale.set(1, 1, 1);
      setGlow(p.ch, found ? "#2f7bff" : "#ff2a2a");
      for (const c of p.clones) setGlow(c.ch, "#ff2a2a");
      this.updateVisibility(p);
      this.updateLabel(p);
    }
    for (const p of this.players.values()) if (!p.display) this.updateVisibility(p);
  }

  private leaveCheck() {
    for (const p of this.players.values()) {
      setGlow(p.ch, null);
      for (const c of p.clones) setGlow(c.ch, null);
      p.display = false;
    }
  }

  // ---------- מצב "כפול" (ダブル): כולם מתחבאים ואז כולם מחפשים ----------

  private setupStatues() {
    this.clearStatues();
    const st = this.rs.statues ?? {};
    for (const [id, d] of Object.entries(st)) {
      const owner = this.players.get(id);
      if (!owner) continue;
      const ch = buildCharacter({ bodyType: owner.bodyType });
      copyPaint(owner.ch, ch);
      setSize(ch, idxSize(d[5]));
      applyPose(ch, idxPose(d[4]));
      ch.root.position.set(d[0], d[1], d[2]);
      ch.root.rotation.y = d[3];
      for (const m of ch.meshes) m.userData.statueOf = id;
      this.scene.add(ch.root);
      this.statues.set(id, { ch, pos: ch.root.position.clone(), yaw: d[3], pose: idxPose(d[4]), size: idxSize(d[5]), owner: id });
    }
    const idx = Object.keys(this.rs.roles).sort().indexOf(this.me.id);
    this.me.pos.copy(this.world.hunterSpawns[Math.max(0, idx) % this.world.hunterSpawns.length]);
    this.me.tpos.copy(this.me.pos);
    this.camYaw = this.gateYaw(this.me.pos) + Math.PI;
  }
  private clearStatues() {
    for (const s of this.statues.values()) { this.scene.remove(s.ch.root); disposeCharacter(s.ch); }
    this.statues.clear();
  }

  // ---------- לוגיקת מארח ----------

  private hostUpdate(dt: number) {
    const rs = this.rs;
    this.hostT -= dt;
    this.ensureBots();
    for (const p of this.players.values()) if (p.bot) this.updateBot(p, dt);
    this.botPubT -= dt;
    if (this.botPubT <= 0) { this.botPubT = 0.12; this.publishBots(); }
    if (rs.ph === "lobby") return;
    const remain = Math.max(0, Math.ceil((this.localEnd - performance.now()) / 1000));
    let changed = false;
    if (remain !== rs.t) { rs.t = remain; this.lastT = remain; changed = true; }
    // הצבעת "もうええよ": כולם מסכימים ← מדלגים
    if ((rs.ph === "hide" || rs.ph === "check") && remain > 0) {
      const humans = [...this.players.values()].filter((p) => !p.bot);
      const tag = `${rs.id}:${rs.ph}`;
      if (humans.length && humans.every((p) => p.vote === tag)) { this.setTimer(0); changed = true; }
    }
    const t = rs.t;
    if (rs.ph === "countdown" && t <= 0) { this.startMatch(); return; }
    if (rs.ph === "hide" && t <= 0) {
      rs.ph = "hunt";
      if (rs.s.mode === "double") {
        rs.statues = {};
        for (const id of Object.keys(rs.roles)) {
          const p = this.players.get(id);
          if (!p) continue;
          rs.statues[id] = this.snap(p);
          rs.roles[id] = "hunter";
        }
        rs.finds = {};
      }
      this.setTimer(rs.s.huntTime);
      changed = true;
    } else if (rs.ph === "hunt") {
      const ids = Object.keys(rs.roles);
      if (rs.s.mode === "double") {
        const n = ids.length;
        const winner = Object.entries(rs.finds ?? {}).find(([, f]) => f.length >= n - 1);
        if (winner || t <= 0) { this.endRound(winner ? winner[0] : this.bestFinder(), winner ? "found everyone" : "time up"); changed = true; }
      } else {
        const hiders = ids.filter((id) => rs.roles[id] === "hider" && !rs.dead.includes(id) && this.players.has(id));
        const armed = ids.filter((id) => rs.roles[id] === "hunter" && this.players.has(id) && (!rs.s.ammoLimit || (this.players.get(id)?.ammo ?? 0) > 0));
        if (!hiders.length) { this.endRound("hunters", "all hiders found"); changed = true; }
        else if (t <= 0) { this.endRound("hiders", "time up"); changed = true; }
        else if (!armed.length) { this.endRound("hiders", "hunters out of ammo"); changed = true; }
      }
    } else if (rs.ph === "check" && t <= 0) {
      rs.ph = "lobby";
      rs.map = "lobby";
      rs.roles = {};
      rs.dead = [];
      rs.conv = [];
      rs.deadAt = {};
      rs.final = {};
      rs.statues = undefined;
      rs.finds = undefined;
      rs.t = 0;
      changed = true;
    }
    if (changed || this.hostT <= 0) { this.hostT = 1; this.pushRS(); }
  }

  /** מיקום, כיוון, תנוחה וגודל — מה שמוצג בבדיקת התשובות */
  private snap(p: Player) {
    const pos = p.local ? p.pos : p.tpos;
    return [r2(pos.x), r2(pos.y), r2(pos.z), r2(p.local || (p.bot && this.isHost()) ? p.yaw : p.tyaw), poseIdx(p.pose), sizeIdx(p.size)];
  }

  private bestFinder() {
    let best = "";
    let n = -1;
    for (const [id, f] of Object.entries(this.rs.finds ?? {})) if (f.length > n) { n = f.length; best = id; }
    return best || "none";
  }

  private setTimer(sec: number) {
    this.rs.t = sec;
    this.lastT = sec;
    this.localEnd = performance.now() + sec * 1000;
  }

  private pushRS() {
    this.rsKey = JSON.stringify(this.rs);
    this.net.setPresence({ rs: this.rs });
    this.onRS();
  }

  private endRound(win: string, why: string) {
    const rs = this.rs;
    rs.ph = "check";
    rs.win = win;
    rs.why = why;
    rs.final = {};
    const st = rs.statues ?? {};
    for (const id of Object.keys(rs.roles)) {
      const p = this.players.get(id);
      if (!p) continue;
      if (rs.s.mode === "double") { if (st[id]) rs.final[id] = st[id]; continue; }
      if (rs.roles[id] === "hider" && !rs.dead.includes(id))
        rs.final[id] = this.snap(p);
    }
    rs.res = Object.keys(rs.roles).map((id) => {
      const p = this.players.get(id);
      const found = !rs.final[id] && !!rs.deadAt[id];
      const role: "hider" | "hunter" = rs.s.mode === "double" || rs.conv.includes(id) ? "hider" : rs.roles[id];
      const score = rs.s.mode === "double" ? (rs.finds?.[id]?.length ?? 0) : Math.floor(p?.pts ?? 0);
      return { id, n: p?.name ?? "?", c: p?.color ?? "#fff", r: role, found, p: score, b: !!p?.bot };
    }).sort((a, b) => b.p - a.p).slice(0, 12);
    this.setTimer(rs.s.checkTime);
  }

  /** המארח לוחץ Start (בכן ה־PLAY) — מתחילה ספירה לאחור */
  startCountdown() {
    if (!this.isHost() || this.rs.ph !== "lobby") return;
    this.ensureBots();
    if (this.players.size < 2) { this.toast("Need at least 2 players (add Bots in Settings)"); this.emit(); return; }
    this.rs.ph = "countdown";
    this.setTimer(COUNTDOWN);
    this.pushRS();
  }

  /** סוף הספירה: מי שעומד על המשטח האדום HUNTER הופך לצייד */
  private startMatch() {
    const rs = this.rs;
    const s = rs.s;
    const ids = [...this.players.keys()];
    const pad = this.world.lobby?.pad;
    const onPad = pad ? ids.filter((id) => { const p = this.players.get(id)!; return !p.bot && Math.hypot(p.tpos.x - pad.x, p.tpos.z - pad.z) < pad.r; }) : [];
    rs.roles = {};
    if (s.mode === "double") for (const id of ids) rs.roles[id] = "hider";
    else {
      let hunters = onPad.slice();
      if (hunters.length >= ids.length) hunters = hunters.slice(0, ids.length - 1);
      if (!hunters.length) {
        const shuffled = [...ids].sort(() => Math.random() - 0.5);
        hunters = shuffled.slice(0, Math.max(1, Math.min(ids.length - 1, s.hunters)));
      }
      for (const id of ids) rs.roles[id] = hunters.includes(id) ? "hunter" : "hider";
    }
    rs.map = s.map === "random" ? MAPS[Math.floor(Math.random() * MAPS.length)].id : s.map;
    rs.dead = [];
    rs.conv = [];
    rs.deadAt = {};
    rs.final = {};
    rs.statues = undefined;
    rs.finds = undefined;
    rs.win = undefined;
    rs.why = undefined;
    rs.res = undefined;
    rs.id += 1;
    rs.ph = "hide";
    this.setTimer(s.hideTime);
    this.loadWorld(rs.map);
    const taken: THREE.Vector3[] = [];
    let hi = 0;
    for (const p of this.players.values()) {
      if (!p.bot) continue;
      p.ammo = s.ammo;
      p.pts = 0;
      p.seed = Math.floor(Math.random() * 1e9);
      p.ai = this.newAI();
      if (rs.roles[p.id] === "hunter") {
        p.pos.copy(this.world.hunterSpawns[(hi++ + 4) % this.world.hunterSpawns.length]);
        p.pose = "stand";
        p.yaw = this.gateYaw(p.pos);
      } else this.botHide(p, taken);
      p.tpos.copy(p.pos);
      p.tyaw = p.yaw;
    }
    this.pushRS();
    this.publishBots();
  }

  setSettings(patch: Partial<Settings>) {
    if (!this.isHost() || (this.rs.ph !== "lobby" && this.rs.ph !== "countdown")) return;
    this.rs.s = { ...this.rs.s, ...patch };
    this.pushRS();
    this.emit();
  }

  private ensureBots() {
    if (!this.isHost() || this.rs.ph !== "lobby") return;
    const want = Math.max(0, Math.min(8, this.rs.s.bots));
    for (let i = 0; i < 8; i++) {
      const id = `bot-${i}`;
      const has = this.players.has(id);
      if (i < want && !has) {
        const p = this.makePlayer(id, BOT_NAMES[i], BOT_COLORS[i], true, false);
        this.spawnInLobby(p);
        p.ai = this.newAI();
      } else if (i >= want && has) this.removePlayer(id);
    }
  }

  private publishBots() {
    const list: BotPub[] = [];
    for (const p of this.players.values()) if (p.bot)
      list.push({
        id: p.id, n: p.name, c: p.color, p: [r2(p.pos.x), r2(p.pos.y), r2(p.pos.z)], y: r2(p.yaw), po: poseIdx(p.pose), sz: sizeIdx(p.size),
        bt: BODY_TYPES.indexOf(p.bodyType), s: p.seed, am: p.ammo, pts: Math.floor(p.pts), cy: r2(p.yaw + (p.ai?.headYaw ?? 0)), mv: p.moving ? 1 : 0,
      });
    const key = JSON.stringify(list);
    if (key === this.lastBots) return;
    this.lastBots = key;
    if (this.net.kind !== "local") this.net.setPresence({ bots: list });
  }

  // ================= לולאה =================

  private frame = (now: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.frame);
    const real = Math.min(0.25, (now - this.last) / 1000);
    this.last = now;
    try {
      this.update(Math.min(0.05, real), real);
    } catch (e) {
      console.error(e);
    }
    this.renderer.render(this.scene, this.camera);
  };

  private update(dt: number, real: number) {
    const rs = this.rs;
    if (this.isHost()) this.hostUpdate(real);
    const remain = Math.max(0, Math.ceil((this.localEnd - performance.now()) / 1000));
    if (remain !== this.lastTick) {
      this.lastTick = remain;
      if (((rs.ph === "hunt" && remain <= 10) || rs.ph === "countdown") && remain > 0 && !this.opts.muted) sfxTick();
    }
    this.updateLocal(dt);
    for (const p of this.players.values()) if (!p.local && (!p.bot || !this.isHost())) this.updateRemote(p, dt);
    for (const p of this.players.values()) this.animate(p, dt);
    this.paintBotsIfNeeded();
    this.updatePoints(real);
    this.updateWhistle(real);
    this.flushPaint(real);
    this.updatePicking();
    this.updateLikeTarget();
    this.fx.setListener(this.me.pos);
    this.fx.update(dt);
    this.updateCamera(dt);
    this.presT -= real;
    if (this.presT <= 0) { this.presT = 0.07; this.publishSelf(); }
    this.hudT -= real;
    if (this.hudT <= 0) { this.hudT = 0.12; this.emit(); }
  }

  private updateRemote(p: Player, dt: number) {
    if (p.display) return;
    const k = Math.min(1, dt * 12);
    if (p.pos.distanceTo(p.tpos) > 6) p.pos.copy(p.tpos);
    else p.pos.lerp(p.tpos, k);
    let d = p.tyaw - p.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    p.yaw += d * k;
  }

  private animate(p: Player, dt: number) {
    if (p.dying > 0) {
      p.dying -= dt;
      const k = 1 - Math.max(0, p.dying) / 1.2;
      p.ch.body.scale.set(1 + k * 0.4, Math.max(0.1, 1 - k * 0.9), 1 + k * 0.4);
      if (p.dying <= 0 && !p.alive) { this.updateVisibility(p); this.updateLabel(p); }
    } else {
      const walking = p.moving && !p.display;
      if (walking) p.ch.walkPhase += dt * 11;
      applyPose(p.ch, p.armed ? "stand" : p.pose, walking ? 1 : 0);
      if (p.armed && p.bot && p.ai) p.ch.head.rotation.y = p.ai.headYaw;
      if (p.armed && !p.bot) p.ch.head.rotation.x = -p.camPitch * 0.5;
    }
    p.ch.root.position.copy(p.pos);
    p.ch.root.rotation.y = p.yaw;
    p.radius = 0.3 * sizeScale(p.armed ? "normal" : p.size) * (p.bodyType === "plump" ? 1.3 : 1);
    if (!p.local) {
      if (p.moving) p.moveT = 0;
      else p.moveT += dt;
    }
  }

  // ================= השחקן שלי =================

  private spectating() {
    const ph = this.rs.ph;
    if (ph === "check") return true;
    if (this.freeCam) return true;
    return (ph === "hide" || ph === "hunt") && (!this.me.alive || this.me.role === "spectator") && this.me.dying <= 0;
  }

  private updateLocal(dt: number) {
    const m = this.me;
    const rs = this.rs;
    let ix = 0, iy = 0;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) iy += 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) iy -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) ix += 1;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) ix -= 1;
    ix += this.joy.x;
    iy += this.joy.y;
    const len = Math.hypot(ix, iy);
    if (len > 1) { ix /= len; iy /= len; }
    const fx = -Math.sin(this.camYaw);
    const fz = -Math.cos(this.camYaw);

    if (this.spectating()) {
      const sp = SPEED.spec * dt;
      const fwd = new THREE.Vector3(fx * Math.cos(this.camPitch), -Math.sin(this.camPitch), fz * Math.cos(this.camPitch));
      if (Math.abs(iy) + Math.abs(ix) > 0.1) this.specTarget = null;
      this.specPos.addScaledVector(fwd, iy * sp);
      this.specPos.x += -fz * ix * sp;
      this.specPos.z += fx * ix * sp;
      if (this.keys.has("KeyE") || this.keys.has("Space")) this.specPos.y += sp;
      if (this.keys.has("KeyQ") || this.keys.has("ControlLeft")) this.specPos.y -= sp;
      this.specPos.y = Math.max(0.4, Math.min(14, this.specPos.y));
      this.wantJump = false;
      m.moving = false;
      return;
    }

    const can = !this.hud.paintMode && (m.alive || rs.ph === "lobby" || rs.ph === "countdown");
    // לחיצה שמאלית + A/D = סיבוב במקום
    if (can && this.lmb && !m.armed && !this.attached) {
      m.yaw -= ix * dt * 2.2;
      if (Math.abs(ix) > 0.1) m.moveT = 0;
      ix = 0;
      iy = 0;
    }
    if (this.attached) {
      this.updateAttached(dt, ix, iy);
      m.tpos.copy(m.pos);
      return;
    }
    if (!can) { ix = 0; iy = 0; }
    const ctrl = this.keys.has("ControlLeft") || this.keys.has("ControlRight");
    this.crouch = can && ctrl && this.onGround(m);
    const speed = this.crouch ? SPEED.crouch : m.armed ? SPEED.hunter : SPEED.hider;
    const sc = m.armed ? 1 : Math.max(0.6, sizeScale(m.size));
    const dx = (fx * iy - fz * ix) * speed * sc * dt;
    const dz = (fz * iy + fx * ix) * speed * sc * dt;
    const moving = can && Math.hypot(ix, iy) > 0.1;
    if (this.wantJump && can) {
      if (this.onGround(m)) { m.vy = 7.2; m.moveT = 0; }
      else if (!m.armed && m.role === "hider") this.tryAttach();
    }
    this.wantJump = false;
    const before = m.pos.clone();
    this.moveAgent(m, dx, dz, dt);
    const moved = before.distanceTo(m.pos) > 0.003;
    if (m.armed) m.yaw = this.camYaw + Math.PI;
    else if (moving) {
      let d = Math.atan2(dx, dz) - m.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      m.yaw += d * Math.min(1, dt * 12);
    }
    m.moving = moved && (moving || Math.abs(m.vy) > 0.1);
    if (m.moving) m.moveT = 0;
    else m.moveT += dt;
    if (!m.armed) {
      if (moving && m.pose !== "stand" && m.pose !== "crouch") m.pose = "stand";
      if (this.crouch && (m.pose === "stand" || m.pose === "crouch")) m.pose = "crouch";
      else if (!this.crouch && m.pose === "crouch") m.pose = "stand";
    }
    m.tpos.copy(m.pos);
  }

  /** נצמדים לקיר: רווח באוויר ליד משטח אנכי */
  private tryAttach() {
    const m = this.me;
    const origin = m.pos.clone().add(new THREE.Vector3(0, 0.9 * sizeScale(m.size), 0));
    const dirs = [new THREE.Vector3(Math.sin(m.yaw), 0, Math.cos(m.yaw)), new THREE.Vector3(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw))];
    for (const d of dirs) {
      this.ray.set(origin, d);
      this.ray.far = 0.9;
      const hit = this.ray.intersectObjects(this.world.surfaces, false)[0];
      if (!hit || !hit.face) continue;
      const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
      if (Math.abs(n.y) > 0.35) continue;
      n.y = 0;
      n.normalize();
      this.attached = { nx: n.x, nz: n.z };
      m.pos.x = hit.point.x + n.x * (m.radius + 0.05);
      m.pos.z = hit.point.z + n.z * (m.radius + 0.05);
      m.yaw = Math.atan2(n.x, n.z);
      m.vy = 0;
      m.moveT = 0;
      this.publishSelf(true);
      this.emit();
      return;
    }
  }

  private updateAttached(dt: number, ix: number, iy: number) {
    const m = this.me;
    const a = this.attached!;
    let moved = false;
    const v = 2.2 * dt;
    if (this.keys.has("Space")) { m.pos.y += v; moved = true; }
    if (this.keys.has("ControlLeft") || this.keys.has("ControlRight")) { m.pos.y = Math.max(0, m.pos.y - v); moved = true; }
    if (this.rmb) {
      // ימני + WASD = החלקה לאורך הקיר
      m.pos.x += -a.nz * ix * v;
      m.pos.z += a.nx * ix * v;
      m.pos.y = Math.max(0, m.pos.y + iy * v);
      if (Math.abs(ix) + Math.abs(iy) > 0.1) moved = true;
    } else if (Math.abs(ix) > 0.1) {
      m.yaw -= ix * dt * 2;
      moved = true;
    }
    m.pos.y = Math.min(12, m.pos.y);
    if (m.pos.y <= 0.001) { this.detach(); return; }
    m.moving = false;
    if (moved) m.moveT = 0;
    else m.moveT += dt;
  }

  /** Shift — נפרדים מהקיר */
  detach() {
    if (!this.attached) return;
    this.attached = null;
    this.me.vy = 0;
    this.publishSelf(true);
    this.emit();
  }

  private onGround(a: Player) {
    return Math.abs(a.pos.y - this.world.groundAt(a.pos.x, a.pos.z, a.pos.y, a.radius)) < 0.03 && a.vy <= 0;
  }

  private moveAgent(a: Player, dx: number, dz: number, dt: number) {
    const w = this.world;
    const height = 1.7 * (a.armed ? 1 : sizeScale(a.size)) * (a.local && this.crouch ? 0.65 : 1);
    a.pos.x += dx;
    a.pos.z += dz;
    const r = a.radius;
    for (const o of w.obstacles) {
      if (!o.enabled || o.top <= a.pos.y + 0.45 || o.bottom >= a.pos.y + height) continue;
      const cx = Math.max(o.minX, Math.min(a.pos.x, o.maxX));
      const cz = Math.max(o.minZ, Math.min(a.pos.z, o.maxZ));
      const ddx = a.pos.x - cx, ddz = a.pos.z - cz;
      const d2 = ddx * ddx + ddz * ddz;
      if (d2 < r * r) {
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          a.pos.x = cx + (ddx / d) * r;
          a.pos.z = cz + (ddz / d) * r;
        } else {
          const pushes = [o.minX - r - a.pos.x, o.maxX + r - a.pos.x, o.minZ - r - a.pos.z, o.maxZ + r - a.pos.z];
          const k = pushes.reduce((bi, v, i) => (Math.abs(v) < Math.abs(pushes[bi]) ? i : bi), 0);
          if (k < 2) a.pos.x += pushes[k];
          else a.pos.z += pushes[k];
        }
      }
    }
    a.pos.x = Math.max(w.bounds.minX + r, Math.min(w.bounds.maxX - r, a.pos.x));
    a.pos.z = Math.max(w.bounds.minZ + r, Math.min(w.bounds.maxZ - r, a.pos.z));
    const ground = w.groundAt(a.pos.x, a.pos.z, a.pos.y, r);
    a.vy -= GRAVITY * dt;
    a.pos.y += a.vy * dt;
    if (a.pos.y <= ground) { a.pos.y = ground; a.vy = 0; }
  }

  // ================= מצלמה =================

  private updateCamera(dt: number) {
    const m = this.me;
    const h = this.hud;
    this.viewGun.visible = false;
    if (this.spectating()) {
      const tgt = this.specTarget ? this.players.get(this.specTarget) : null;
      if (tgt && tgt.alive && this.rs.ph !== "check") {
        const want = tgt.pos.clone().add(new THREE.Vector3(Math.sin(this.camYaw) * 4, 2.6, Math.cos(this.camYaw) * 4));
        this.specPos.lerp(want, Math.min(1, dt * 5));
      }
      this.camera.position.copy(this.specPos);
      const look = new THREE.Vector3(-Math.sin(this.camYaw) * Math.cos(this.camPitch), -Math.sin(this.camPitch), -Math.cos(this.camYaw) * Math.cos(this.camPitch));
      this.camera.lookAt(this.specPos.clone().add(look));
      return;
    }
    const sy = m.armed ? 1 : sizeScale(m.size);
    const inMatch = this.rs.ph === "hide" || this.rs.ph === "hunt";
    if (m.armed && !this.tps && inMatch) {
      // הצייד: גוף ראשון (ימני מחליף לגוף שלישי)
      const eye = m.pos.clone();
      eye.y += this.crouch ? 1.05 : 1.6;
      this.camera.position.copy(eye);
      const look = new THREE.Vector3(-Math.sin(this.camYaw) * Math.cos(this.camPitch), -Math.sin(this.camPitch), -Math.cos(this.camYaw) * Math.cos(this.camPitch));
      this.camera.lookAt(eye.clone().add(look));
      this.viewGun.visible = true;
      m.ch.root.visible = false;
      return;
    }
    if (m.armed && inMatch) m.ch.root.visible = true;
    const target = m.pos.clone();
    target.y += (h.paintMode ? 0.75 : m.armed ? 1.7 : 1.35) * sy;
    if (m.armed) {
      target.x += Math.cos(this.camYaw) * 0.8;
      target.z -= Math.sin(this.camYaw) * 0.8;
    }
    const want = h.paintMode ? this.paintDist * Math.max(0.7, sy) : m.armed ? 3.4 : this.camDist * Math.max(0.6, sy);
    const dir = new THREE.Vector3(Math.sin(this.camYaw) * Math.cos(this.camPitch), Math.sin(this.camPitch), Math.cos(this.camYaw) * Math.cos(this.camPitch));
    this.ray.set(target, dir);
    this.ray.far = want;
    const hit = this.xray && h.paintMode ? null : this.ray.intersectObjects(this.world.surfaces, false)[0];
    const d = hit ? Math.max(0.4, hit.distance - 0.2) : want;
    const pos = target.clone().addScaledVector(dir, d);
    if (pos.y < 0.2) pos.y = 0.2;
    this.camera.position.lerp(pos, Math.min(1, dt * 16));
    this.camera.lookAt(target);
  }

  private resize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ================= ירי =================

  fire() {
    const rs = this.rs;
    const m = this.me;
    if (!m.armed || rs.ph !== "hunt" || !m.alive) return;
    if (rs.s.ammoLimit && m.ammo <= 0) { this.toast("Out of ammo"); this.emit(); return; }
    const now = performance.now();
    if (now - this.lastShot < SHOT_CD) return;
    this.lastShot = now;
    this.camera.updateMatrixWorld();
    this.ray.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const dir = this.ray.ray.direction.clone();
    const origin = this.ray.ray.origin.clone();
    const muzzle = this.tps
      ? m.pos.clone().add(new THREE.Vector3(0, 1.25, 0)).addScaledVector(new THREE.Vector3(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw)), 0.8)
      : this.viewGun.localToWorld(new THREE.Vector3(0, 0, -0.66));
    this.afterShot(m, this.shoot(origin, dir, m, muzzle));
  }

  private shoot(origin: THREE.Vector3, dir: THREE.Vector3, shooter: Player, muzzle: THREE.Vector3): Shot {
    const targets: THREE.Object3D[] = [...this.world.surfaces];
    if (this.rs.s.mode === "double") {
      for (const s of this.statues.values()) if (s.owner !== shooter.id && !(shooter.local && this.myFinds.has(s.owner))) targets.push(...s.ch.meshes);
    } else for (const p of this.players.values()) {
      if (p === shooter || p.role !== "hider" || !p.alive || !p.ch.root.visible) continue;
      targets.push(...p.ch.meshes);
      for (const c of p.clones) targets.push(...c.ch.meshes);
    }
    let hitId: string | null = null;
    const pts: number[][] = [];
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
    const up2 = new THREE.Vector3().crossVectors(right, dir).normalize();
    this.scene.updateMatrixWorld();
    for (let i = 0; i < PELLETS; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = i === 0 ? 0 : Math.sqrt(Math.random()) * SPREAD;
      const d = dir.clone().addScaledVector(right, Math.cos(a) * r).addScaledVector(up2, Math.sin(a) * r).normalize();
      this.ray.set(origin, d);
      this.ray.far = 70;
      const hit = this.ray.intersectObjects(targets, false)[0];
      if (!hit) continue;
      const ud = hit.object.userData;
      const owner = (ud.statueOf as string | undefined) ?? (ud.cloneOf as string | undefined) ?? [...this.players.values()].find((p) => p.ch === ud.char)?.id;
      if (owner && !hitId) hitId = owner;
      const n = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : d.clone().negate();
      pts.push([r2(hit.point.x), r2(hit.point.y), r2(hit.point.z), r2(n.x), r2(n.y), r2(n.z), ud.char ? 1 : 0]);
    }
    // ירייה לעבר זיקית שבורחת לא עולה תחמושת
    let fleeing = false;
    if (!hitId) for (const p of this.players.values()) {
      if (p.role !== "hider" || !p.alive || p.moveT > 0.6 || p === shooter) continue;
      const toP = p.pos.clone().add(new THREE.Vector3(0, 0.8, 0)).sub(origin);
      const along = toP.dot(dir);
      if (along > 0 && toP.clone().sub(dir.clone().multiplyScalar(along)).length() < 1.2) fleeing = true;
    }
    return { hitId, pts, muzzle, fleeing };
  }

  private afterShot(s: Player, res: Shot) {
    this.drawShot(res.muzzle, res.pts, s.color, s.local);
    if (s.local) this.fx.pumpSound();
    this.net.emit("shot", { o: [r2(res.muzzle.x), r2(res.muzzle.y), r2(res.muzzle.z)], h: res.pts, c: s.color } satisfies ShotMsg);
    const ammo = this.rs.s.ammoLimit;
    if (res.hitId) {
      if (ammo) s.ammo = Math.min(99, s.ammo + 1);
      if (this.rs.s.mode === "double") {
        if (s.bot && this.isHost()) {
          const st = this.statues.get(res.hitId);
          this.fx.burst(st?.pos.clone().setY((st?.pos.y ?? 0) + 0.8) ?? res.muzzle, s.color);
          this.onFind({ t: res.hitId }, s.id);
        } else if (s.local) {
          this.myFinds.add(res.hitId);
          const st = this.statues.get(res.hitId);
          if (st) setGlow(st.ch, "#2f7bff");
          this.fx.burst(st?.pos.clone().setY((st?.pos.y ?? 0) + 0.8) ?? res.muzzle, s.color);
          this.fx.splashSound();
          this.net.emit("find", { t: res.hitId });
          this.onFind({ t: res.hitId }, s.id);
        }
      } else {
        this.net.emit("hit", { t: res.hitId });
        this.registerHit(res.hitId, s.id);
      }
    } else if (ammo && !res.fleeing) s.ammo = Math.max(0, s.ammo - 1);
    if (s.local) this.publishSelf(true);
    this.emit();
  }

  private drawShot(o: THREE.Vector3, pts: number[][], color: string, local: boolean) {
    this.fx.shotSound(local ? undefined : o);
    for (const p of pts) {
      const at = new THREE.Vector3(p[0], p[1], p[2]);
      this.fx.tracer(o, at, color);
      if (!p[6]) this.fx.decal(at, new THREE.Vector3(p[3], p[4], p[5]), color, 0.25 + Math.random() * 0.25);
    }
  }

  private onShot(d: ShotMsg) {
    if (!d || !Array.isArray(d.o) || d.o.length !== 3 || !Array.isArray(d.h)) return;
    const o = new THREE.Vector3(Number(d.o[0]), Number(d.o[1]), Number(d.o[2]));
    if (![o.x, o.y, o.z].every(Number.isFinite)) return;
    const pts = d.h.slice(0, 12).filter((p) => Array.isArray(p) && p.length >= 7 && p.every(Number.isFinite));
    this.drawShot(o, pts, HEX.test(String(d.c)) ? String(d.c) : "#ff006e", false);
  }

  private onHit(d: { t: string }, from: string) {
    if (!d || typeof d.t !== "string") return;
    this.registerHit(d.t, from);
  }

  private onFind(d: { t: string }, from: string) {
    if (!d || typeof d.t !== "string" || this.rs.s.mode !== "double" || !this.isHost()) return;
    const f = (this.rs.finds ??= {});
    const list = (f[from] ??= []);
    if (!list.includes(d.t) && d.t !== from) { list.push(d.t); this.pushRS(); }
  }

  private registerHit(targetId: string, by: string) {
    const rs = this.rs;
    const t = this.players.get(targetId);
    if (!t || rs.ph !== "hunt" || rs.roles[targetId] !== "hider" || rs.dead.includes(targetId) || this.pendingDead.has(targetId)) return;
    const shooter = this.players.get(by);
    this.fx.burst(t.pos.clone().setY(t.pos.y + 0.9 * sizeScale(t.size)), shooter?.color ?? "#ff006e");
    this.fx.splashSound(t.local ? undefined : t.pos);
    if (t.local) {
      this.attached = null;
      this.hud.paintMode = false;
      if (!this.opts.muted) sfxWrong();
      this.specPos.copy(this.camera.position);
    } else if (shooter?.local && !this.opts.muted) sfxCorrect();
    if (this.isHost()) {
      rs.deadAt[targetId] = this.snap(t);
      if (rs.s.mode === "infection") {
        rs.roles[targetId] = "hunter";
        rs.conv.push(targetId);
        t.ammo = rs.s.ammo;
        if (t.bot) t.ai = this.newAI();
      } else rs.dead.push(targetId);
      this.pushRS();
    } else if (rs.s.mode !== "infection") {
      this.pendingDead.set(targetId, performance.now() + 4000);
      t.alive = false;
      t.dying = 1.2;
    }
  }

  // ================= בוטים (אצל המארח) =================

  private newAI(): BotAI {
    return { state: "patrol", stateT: 0, path: [], target: null, sus: new Map(), ignore: new Map(), headYaw: 0, lookPhase: Math.random() * 6, percT: Math.random() * 0.2, shotCd: 0, whistleT: 5 + Math.random() * 10 };
  }

  private botHide(p: Player, taken: THREE.Vector3[]) {
    const nav = this.nav;
    const rand = mulberry(p.seed);
    let best: { x: number; z: number; y: number; onTop: boolean } | null = null;
    const tops = this.world.obstacles.filter((o) => o.standable && o.enabled && o.top < 1.3 && o.maxX - o.minX > 0.8 && o.maxZ - o.minZ > 0.8);
    for (let k = 0; k < 800 && !best; k++) {
      let x: number, z: number, y = 0, onTop = false;
      if (rand() < 0.22 && tops.length) {
        const o = tops[Math.floor(rand() * tops.length)];
        x = o.minX + 0.4 + rand() * Math.max(0, o.maxX - o.minX - 0.8);
        z = o.minZ + 0.4 + rand() * Math.max(0, o.maxZ - o.minZ - 0.8);
        y = this.world.groundAt(x, z, 5, 0.3);
        onTop = true;
      } else {
        const c = Math.floor(rand() * nav.cols);
        const r = Math.floor(rand() * nav.rows);
        const i = r * nav.cols + c;
        if (!nav.near[i] || nav.blocked[i]) continue;
        [x, z] = nav.center(c, r);
      }
      if (this.world.roomAt(x, z) === "Hunter Room") continue;
      if (taken.some((t) => Math.hypot(t.x - x, t.z - z) < 3)) continue;
      best = { x, z, y, onTop };
    }
    if (!best) best = { x: 0, z: -4, y: 0, onTop: false };
    p.pos.set(best.x, best.y, best.z);
    taken.push(p.pos.clone());
    let nearest = Infinity;
    let away = new THREE.Vector2(0, 1);
    for (const o of this.world.obstacles) {
      if (o.top < 0.5 || !o.enabled) continue;
      const cx = Math.max(o.minX, Math.min(best.x, o.maxX));
      const cz = Math.max(o.minZ, Math.min(best.z, o.maxZ));
      const d = Math.hypot(best.x - cx, best.z - cz);
      if (d < nearest && d > 0.001) { nearest = d; away = new THREE.Vector2(best.x - cx, best.z - cz).normalize(); }
    }
    p.yaw = Math.atan2(away.x, away.y);
    const r = rand();
    let pose: PoseId;
    if (best.onTop) pose = r < 0.5 ? "lie" : r < 0.8 ? "lump" : "side";
    else if (nearest < 1) pose = (["stand", "surrender", "cactus", "spread", "lump", "tpose", "onehand", "hips"] as PoseId[])[Math.floor(r * 8)];
    else pose = r < 0.35 ? "lump" : r < 0.6 ? "sit" : r < 0.8 ? "crosslegged" : "lie";
    if (pose === "lie" || pose === "side") p.yaw = rand() * Math.PI * 2;
    p.pose = pose;
    const sizes: SizeId[] = this.rs.s.allowPetit ? ["petit", "small", "normal", "normal", "large"] : ["small", "normal", "normal", "large"];
    p.size = sizes[Math.floor(rand() * sizes.length)];
    this.setModel(p, false, BODY_TYPES[Math.floor(rand() * 3)]);
    setSize(p.ch, p.size);
  }

  private paintBotsIfNeeded() {
    const rs = this.rs;
    if (rs.ph !== "hide" && rs.ph !== "hunt") return;
    for (const p of this.players.values()) {
      if (!p.bot || p.armed || !p.alive || p.dying > 0 || p.role !== "hider") continue;
      const key = `${rs.id}:${p.seed}:${p.tpos.x.toFixed(1)}:${p.tpos.z.toFixed(1)}:${p.pose}:${p.size}:${p.bodyType}`;
      if (p.paintedKey === key) continue;
      if (p.pos.distanceTo(p.tpos) > 0.05) continue;
      p.paintedKey = key;
      p.ch.body.scale.set(1, 1, 1);
      applyPose(p.ch, p.pose);
      p.ch.root.position.copy(p.pos);
      p.ch.root.rotation.y = p.yaw;
      this.projectPaint(p);
      return;
    }
  }

  /** בוט צובע את עצמו: כל נקודה בגוף מקבלת את הצבע והחומר של מה שמאחוריה */
  private projectPaint(p: Player) {
    const rand = mulberry(p.seed ^ 0x9e3779b9);
    const skill = [0.14, 0.08, 0.035][this.rs.s.difficulty] * (0.6 + rand() * 0.9);
    const lazy = rand() < [0.45, 0.25, 0.1][this.rs.s.difficulty];
    p.ch.root.updateMatrixWorld(true);
    const fwd = new THREE.Vector3(Math.sin(p.yaw), 0, Math.cos(p.yaw));
    const vantage = p.pos.clone().addScaledVector(fwd, 6);
    vantage.y = p.pose === "lie" || p.pose === "side" || p.pos.y > 0.3 ? 3.2 : 1.6;
    const jobs: { part: Part; uv: THREE.Vector2; b: Brush }[] = [];
    const avg = new Map<Part, { c: THREE.Color; n: number; m: number; r: number }>();
    const sum = new THREE.Color(0, 0, 0);
    let count = 0;
    for (const part of p.ch.parts) {
      const pos = part.mesh.geometry.getAttribute("position");
      const uv = part.mesh.geometry.getAttribute("uv") as THREE.BufferAttribute;
      const step = Math.max(1, Math.floor(pos.count / 110));
      const acc = { c: new THREE.Color(0, 0, 0), n: 0, m: 0, r: 0 };
      avg.set(part, acc);
      for (let i = 0; i < pos.count; i += step) {
        const wp = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(part.mesh.matrixWorld);
        const dir = wp.clone().sub(vantage).normalize();
        this.ray.set(wp.clone().addScaledVector(dir, 0.02), dir);
        this.ray.far = 50;
        const hit = this.ray.intersectObjects(this.world.surfaces, false)[0];
        const c = new THREE.Color("#888888");
        let metal = 0, rough = 0.8;
        if (hit) {
          this.world.surfaceColor(hit, c);
          const sm = this.world.surfaceMat(hit);
          metal = sm.metal;
          rough = sm.rough;
        }
        c.offsetHSL((rand() - 0.5) * skill * 0.5, (rand() - 0.5) * skill, (rand() - 0.5) * skill);
        acc.c.add(c); acc.n++; acc.m += metal; acc.r += rough;
        sum.add(c);
        count++;
        jobs.push({ part, uv: new THREE.Vector2().fromBufferAttribute(uv, i), b: { color: `#${c.getHexString()}`, alpha: 1, metal, rough, emis: 0 } });
      }
    }
    if (lazy && count) {
      const hex = `#${sum.multiplyScalar(1 / count).getHexString()}`;
      for (const part of p.ch.parts) fillPart(part, { color: hex, alpha: 1, metal: 0, rough: 0.8, emis: 0 });
      return;
    }
    for (const [part, a] of avg) {
      if (!a.n) continue;
      fillPart(part, { color: `#${a.c.multiplyScalar(1 / a.n).getHexString()}`, alpha: 1, metal: a.m / a.n, rough: a.r / a.n, emis: 0 });
    }
    for (const j of jobs) paintDot(j.part, j.uv, j.b, 0.09);
  }

  private updateBot(p: Player, dt: number) {
    const rs = this.rs;
    const ai = p.ai ?? (p.ai = this.newAI());
    if (rs.ph === "lobby" || rs.ph === "countdown") {
      p.pose = "stand";
      this.botWalk(p, ai, dt, 2);
      return;
    }
    if (rs.s.mode === "double" && rs.ph === "hunt" && p.armed) { this.botDouble(p, ai, dt); return; }
    if (!p.armed || rs.ph === "hide" || rs.ph === "check" || !p.alive || rs.s.mode === "double") {
      p.moving = false;
      p.tpos.copy(p.pos);
      return;
    }
    ai.stateT += dt;
    ai.shotCd -= dt;
    ai.percT -= dt;
    if (rs.s.ammoLimit && p.ammo <= 0) { this.botFollow(p, ai, dt, 0, null); return; }
    if (ai.percT <= 0) {
      ai.percT = 0.2;
      this.scene.updateMatrixWorld();
      for (const h of this.players.values()) {
        if (h.role !== "hider" || !h.alive || !h.ch.root.visible) continue;
        const ig = ai.ignore.get(h.id) ?? 0;
        if (ig > 0) { ai.ignore.set(h.id, ig - 0.2); ai.sus.set(h.id, Math.min(ai.sus.get(h.id) ?? 0, 0.3)); continue; }
        const rate = this.perceive(p, h);
        ai.sus.set(h.id, Math.max(0, (ai.sus.get(h.id) ?? 0) + (rate - 0.1) * 0.2));
      }
    }
    let best: Player | null = null;
    let bestSus = 0;
    for (const [id, v] of ai.sus) {
      const h = this.players.get(id);
      if (h && h.alive && h.role === "hider" && v > bestSus) { best = h; bestSus = v; }
    }
    let speed = 0;
    let lookAt: THREE.Vector3 | null = null;
    const tgt = ai.target ? this.players.get(ai.target) : null;
    switch (ai.state) {
      case "patrol":
        speed = 3;
        if (best && bestSus >= 1) {
          ai.state = "investigate";
          ai.target = best.id;
          ai.path = this.nav.find(p.pos.x, p.pos.z, best.pos.x, best.pos.z) ?? [];
          ai.stateT = 0;
        } else if (!ai.path.length) {
          const [x, z] = this.nav.randomFree();
          ai.path = this.nav.find(p.pos.x, p.pos.z, x, z) ?? [];
        }
        break;
      case "investigate":
        speed = 4.2;
        if (!tgt || !tgt.alive) { ai.state = "patrol"; ai.path = []; break; }
        lookAt = tgt.pos;
        if (p.pos.distanceTo(tgt.pos) < 4.5 || !ai.path.length || ai.stateT > 12) { ai.state = "inspect"; ai.stateT = 0; ai.path = []; }
        break;
      case "inspect":
        if (!tgt || !tgt.alive) { ai.state = "patrol"; break; }
        lookAt = tgt.pos;
        if (p.pos.distanceTo(tgt.pos) > 5 && ai.stateT < 2.5) { speed = 2.5; ai.path = [[tgt.pos.x, tgt.pos.z]]; } else ai.path = [];
        if ((ai.sus.get(tgt.id) ?? 0) >= 2.2 && ai.shotCd <= 0) { ai.state = "aim"; ai.stateT = 0; }
        else if (ai.stateT > 3.2) {
          ai.ignore.set(tgt.id, 6);
          ai.sus.set(tgt.id, 0.3);
          ai.state = "patrol";
          ai.target = null;
          ai.path = [];
        }
        break;
      case "aim":
        if (!tgt || !tgt.alive) { ai.state = "patrol"; break; }
        lookAt = tgt.pos;
        if (ai.stateT > 0.5) {
          ai.shotCd = SHOT_CD / 1000;
          const eye = p.pos.clone().add(new THREE.Vector3(0, 1.6, 0));
          const aimAt = tgt.pos.clone().add(new THREE.Vector3(0, 0.6 * sizeScale(tgt.size), 0));
          const err = [0.09, 0.05, 0.025][rs.s.difficulty];
          const dir = aimAt.sub(eye).normalize().add(new THREE.Vector3((Math.random() - 0.5) * err, (Math.random() - 0.5) * err, (Math.random() - 0.5) * err)).normalize();
          const res = this.shoot(eye, dir, p, eye.clone().addScaledVector(dir, 0.8));
          this.afterShot(p, res);
          ai.state = "patrol";
          ai.path = [];
          if (!res.hitId) ai.ignore.set(tgt.id, 4);
        }
        break;
    }
    this.botFollow(p, ai, dt, speed, lookAt);
  }

  /** מצב כפול: הבוט מסתובב ומחפש את "הפסלים" של האחרים */
  private botDouble(p: Player, ai: BotAI, dt: number) {
    const rs = this.rs;
    ai.shotCd -= dt;
    ai.percT -= dt;
    const found = rs.finds?.[p.id] ?? [];
    if (!ai.path.length) {
      const [x, z] = this.nav.randomFree();
      ai.path = this.nav.find(p.pos.x, p.pos.z, x, z) ?? [];
    }
    let lookAt: THREE.Vector3 | null = null;
    if (ai.percT <= 0 && ai.shotCd <= 0) {
      ai.percT = 0.4;
      const eye = p.pos.clone().add(new THREE.Vector3(0, 1.6, 0));
      for (const st of this.statues.values()) {
        if (st.owner === p.id || found.includes(st.owner)) continue;
        const c = st.ch.meshes[0].getWorldPosition(new THREE.Vector3());
        const dist = eye.distanceTo(c);
        if (dist > 14) continue;
        const dir = c.clone().sub(eye).normalize();
        const fwd = new THREE.Vector3(Math.sin(p.yaw), 0, Math.cos(p.yaw));
        if (dir.dot(fwd) < 0.3) continue;
        this.ray.set(eye, dir);
        this.ray.far = dist + 0.5;
        const hit = this.ray.intersectObjects([...this.world.surfaces, ...st.ch.meshes], false)[0];
        if (!hit || hit.object.userData.statueOf !== st.owner) continue;
        const chance = [0.04, 0.08, 0.14][rs.s.difficulty] * (1.4 - dist / 14);
        if (Math.random() > chance) continue;
        lookAt = c;
        ai.shotCd = SHOT_CD / 1000 + 0.6;
        const res = this.shoot(eye, dir, p, eye.clone().addScaledVector(dir, 0.8));
        this.afterShot(p, res);
        break;
      }
    }
    this.botFollow(p, ai, dt, 3, lookAt);
  }

  private botWalk(p: Player, ai: BotAI, dt: number, speed: number) {
    if (!ai.path.length && Math.random() < dt * 0.4) {
      const [x, z] = this.nav.randomFree();
      const l = this.world.lobby;
      if (!l || Math.hypot(x - l.pad.x, z - l.pad.z) > l.pad.r + 0.5) ai.path = this.nav.find(p.pos.x, p.pos.z, x, z) ?? [];
    }
    this.botFollow(p, ai, dt, ai.path.length ? speed : 0, null);
  }

  private botFollow(p: Player, ai: BotAI, dt: number, speed: number, lookAt: THREE.Vector3 | null) {
    let moving = false;
    if (speed > 0 && ai.path.length) {
      const [nx, nz] = ai.path[0];
      const ddx = nx - p.pos.x, ddz = nz - p.pos.z;
      const d = Math.hypot(ddx, ddz);
      if (d < 0.35) ai.path.shift();
      else {
        const k = Math.min(d, speed * dt) / d;
        const before = p.pos.clone();
        this.moveAgent(p, ddx * k, ddz * k, dt);
        if (before.distanceTo(p.pos) < speed * dt * 0.2) {
          p.moveT += dt;
          if (p.moveT > 1) { ai.path = []; p.moveT = 0; }
        }
        moving = true;
        if (!lookAt) {
          let dy = Math.atan2(ddx, ddz) - p.yaw;
          dy = Math.atan2(Math.sin(dy), Math.cos(dy));
          p.yaw += dy * Math.min(1, dt * 8);
        }
      }
    } else this.moveAgent(p, 0, 0, dt);
    if (lookAt) {
      let dy = Math.atan2(lookAt.x - p.pos.x, lookAt.z - p.pos.z) - p.yaw;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      p.yaw += dy * Math.min(1, dt * 8);
      ai.headYaw *= 0.85;
    } else {
      ai.lookPhase += dt * (moving ? 1.3 : 0.9);
      ai.headYaw = Math.sin(ai.lookPhase) * 0.85;
    }
    p.moving = moving;
    p.tpos.copy(p.pos);
    p.tyaw = p.yaw;
  }

  /** כמה מהר צייד ממוחשב חושד: צבע מול רקע + צללית + תזוזה */
  private perceive(s: Player, h: Player) {
    const eye = s.pos.clone();
    eye.y += 1.6;
    const center = h.pos.clone();
    center.y += 0.7 * sizeScale(h.size);
    const toH = center.clone().sub(eye);
    const dist = toH.length();
    if (dist > 24) return 0;
    const lookYaw = s.yaw + (s.ai?.headYaw ?? 0);
    const look = new THREE.Vector3(Math.sin(lookYaw), 0, Math.cos(lookYaw));
    const flat = new THREE.Vector3(toH.x, 0, toH.z).normalize();
    if (look.dot(flat) < Math.cos((58 * Math.PI) / 180) && dist > 1.5) return 0;
    const occ: THREE.Object3D[] = [...this.world.surfaces];
    for (const p of this.players.values()) if (p.role === "hider" && p.alive && p.ch.root.visible) occ.push(...p.ch.meshes);
    const others = occ.filter((o) => o.userData.char !== h.ch);
    const K = 6;
    let visible = 0;
    let colorTerm = 0;
    const c1 = new THREE.Color(), c2 = new THREE.Color();
    for (let k = 0; k < K; k++) {
      const smp = h.samples[Math.floor(Math.random() * h.samples.length)];
      const wp = smp.local.clone().applyMatrix4(smp.mesh.matrixWorld);
      const dir = wp.clone().sub(eye);
      const dd = dir.length();
      dir.normalize();
      this.ray.set(eye, dir);
      this.ray.far = dd + 0.5;
      const hit = this.ray.intersectObjects(occ, false)[0];
      if (!hit || hit.object.userData.char !== h.ch || !hit.uv) continue;
      visible++;
      const part = h.ch.parts.find((pp) => pp.mesh === hit.object);
      if (part) samplePart(part, hit.uv, c1);
      this.ray.set(hit.point.clone().addScaledVector(dir, 0.03), dir);
      this.ray.far = 60;
      const bg = this.ray.intersectObjects(others, false)[0];
      if (bg) {
        const ch = bg.object.userData.char as Character | undefined;
        const bp = ch?.parts.find((pp) => pp.mesh === bg.object);
        if (bp && bg.uv) samplePart(bp, bg.uv, c2);
        else this.world.surfaceColor(bg, c2);
      } else c2.set(this.world.lighting.sky);
      colorTerm += Math.max(0, colorDiff(c1, c2) - 0.07) * 3.2;
    }
    if (!visible) return 0;
    const frac = visible / K;
    colorTerm /= visible;
    const sil = (POSE_SIL[h.pose] ?? 0.2) * SIZE_SIL[h.size];
    const prox = Math.max(0.35, Math.min(3, 6 / (dist + 1)));
    const mul = [0.7, 1, 1.35][this.rs.s.difficulty];
    let rate = frac * (colorTerm + sil) * prox * mul;
    if (h.moveT < 0.3) rate += 3 * prox * frac;
    return rate;
  }

  // ================= נקודות החמצה (見逃しポイント) + שריקה =================

  private updatePoints(dt: number) {
    if (this.rs.ph !== "hunt" || !this.rs.s.missed || this.rs.s.mode === "double") return;
    this.ptsT -= dt;
    if (this.ptsT > 0) return;
    this.ptsT = 0.5;
    const hunters = [...this.players.values()].filter((p) => p.armed && p.alive);
    const seenBy = (at: THREE.Vector3) => {
      for (const s of hunters) {
        const eye = s.pos.clone().add(new THREE.Vector3(0, 1.6, 0));
        const to = at.clone().sub(eye);
        const d = to.length();
        if (d > 26) continue;
        const yaw = s.local ? this.camYaw + Math.PI : s.bot ? s.camYaw : s.camYaw + Math.PI;
        const look = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
        if (look.dot(new THREE.Vector3(to.x, 0, to.z).normalize()) < Math.cos(0.9)) continue;
        this.ray.set(eye, to.normalize());
        this.ray.far = Math.max(0.1, d - 0.4);
        if (this.ray.intersectObjects(this.world.surfaces, false).length) continue;
        return d;
      }
      return -1;
    };
    const check = (h: Player) => {
      if (h.role !== "hider" || !h.alive || h.moveT < 0.5) return; // מי שזז לא צובר נקודות
      for (const s of [h.pos, ...h.clones.map((c) => c.pos)]) {
        const d = seenBy(s.clone().add(new THREE.Vector3(0, 0.7 * sizeScale(h.size), 0)));
        if (d >= 0) h.pts += 0.5 * (1 + 6 / (d + 2));
      }
    };
    check(this.me);
    if (this.isHost()) for (const p of this.players.values()) if (p.bot) check(p);
  }

  private updateWhistle(dt: number) {
    const rs = this.rs;
    if (rs.ph !== "hunt" || rs.s.mode === "double" || !rs.s.whistle) return;
    const remain = (this.localEnd - performance.now()) / 1000;
    const iv = rs.s.whistle;
    if (this.me.role === "hider" && this.me.alive) {
      this.whistleT += dt;
      if (this.whistleT >= iv) { this.whistleT = 0; this.whistle(true); }
      if (!this.finalWhistleDone && remain <= 15) { this.finalWhistleDone = true; this.whistle(true); }
    }
    if (this.isHost()) for (const p of this.players.values()) {
      if (!p.bot || p.role !== "hider" || !p.alive || !p.ai) continue;
      p.ai.whistleT -= dt;
      if (p.ai.whistleT <= 0) {
        p.ai.whistleT = iv;
        this.net.emit("whistle", { id: p.id });
        this.onWhistle({ id: p.id });
      }
    }
  }

  /** 1 — שריקה. שריקה ידנית מאפסת את טיימר השריקה הכפויה */
  whistle(forced = false) {
    const m = this.me;
    const now = performance.now();
    if (m.armed) return;
    if (!forced && now - this.lastWhistle < 1000) return;
    this.lastWhistle = now;
    if (!forced) this.whistleT = 0;
    this.net.emit("whistle", { id: m.id });
    this.onWhistle({ id: m.id });
  }

  private onWhistle(d: { id: string }) {
    const p = d && this.players.get(String(d.id));
    if (!p) return;
    const at = p.pos.clone().add(new THREE.Vector3(0, 1.9 * sizeScale(p.size), 0));
    this.fx.whistleSound(p.local ? undefined : at);
    this.fx.note(at);
  }

  // ================= ええやん (לייק) + צ'אט + もうええよ =================

  private updateLikeTarget() {
    this.likeTarget = null;
    if (this.rs.ph !== "check") return;
    this.camera.updateMatrixWorld();
    this.ray.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    this.ray.far = 40;
    const objs: THREE.Object3D[] = [];
    for (const p of this.players.values()) if (p.display) { objs.push(...p.ch.meshes); for (const c of p.clones) objs.push(...c.ch.meshes); }
    const hit = this.ray.intersectObjects(objs, false)[0];
    if (!hit) return;
    const id = (hit.object.userData.cloneOf as string | undefined) ?? [...this.players.values()].find((p) => p.ch === hit.object.userData.char)?.id;
    const p = id ? this.players.get(id) : null;
    if (p) this.likeTarget = { id: p.id, name: p.name };
  }

  /** G — "ええやん" להסתתרות טובה; אחד בכל סיבוב */
  giveLike() {
    if (this.rs.ph !== "check" || !this.likeTarget || this.likedRound === this.rs.id || this.likeTarget.id === this.me.id) return;
    this.likedRound = this.rs.id;
    this.net.emit("like", { to: this.likeTarget.id });
    const p = this.players.get(this.likeTarget.id);
    if (p) { p.likes += 1; this.updateLabel(p); }
    if (!this.opts.muted) sfxCorrect();
    this.emit();
  }

  private onLike(d: { to: string }, from: string) {
    if (!d || typeof d.to !== "string") return;
    if (d.to === this.me.id) {
      this.likes += 1;
      saveLikes(this.likes);
      const f = this.players.get(from);
      this.toast(`👍 ${f?.name ?? ""}`);
      this.publishSelf(true);
    } else {
      const p = this.players.get(d.to);
      if (p) { p.likes += 1; this.updateLabel(p); }
    }
  }

  sendChat(m: string) {
    const text = m.trim().slice(0, 120);
    if (!text) return;
    this.net.emit("chat", { m: text });
    this.addChat(this.me.name, this.me.color, text);
  }
  private onChat(d: { m: string }, from: string) {
    if (!d || typeof d.m !== "string") return;
    const p = this.players.get(from);
    this.addChat(p?.name ?? "?", p?.color ?? "#ffffff", d.m.slice(0, 120));
  }
  private addChat(name: string, color: string, m: string) {
    this.chat = [...this.chat, { id: ++this.chatId, name, color, m, t: Date.now() }].slice(-8);
    if (this.hud) this.emit();
  }

  /** Y — "もうええよ": דילוג על ההכנה / בדיקת התשובות כשכולם מסכימים */
  voteSkip() {
    const ph = this.rs.ph;
    if (ph !== "hide" && ph !== "check") return;
    const tag = `${this.rs.id}:${ph}`;
    this.me.vote = this.me.vote === tag ? "" : tag;
    this.publishSelf(true);
    this.emit();
  }

  // ================= סנכרון צבע =================

  private queuePaintOp(op: unknown) {
    if (this.net.kind !== "local") this.opsBuf.push(op);
  }

  private flushPaint(dt: number) {
    this.opsT -= dt;
    if (this.opsT <= 0 && this.opsBuf.length) {
      this.opsT = 0.12;
      while (this.opsBuf.length) this.net.emit("paint", { ops: this.opsBuf.splice(0, 60) });
    }
    this.sendT -= dt;
    if (this.sendT <= 0 && this.sendQueue.length) {
      this.sendT = 1 / 14;
      const [t, d] = this.sendQueue.shift()!;
      this.net.emit(t, d);
    }
  }

  private onPaintOps(d: { ops: unknown[] }, from: string) {
    const p = this.players.get(from);
    if (!p || !d || !Array.isArray(d.ops)) return;
    for (const op of d.ops.slice(0, 200)) {
      if (!Array.isArray(op) || op[0] !== "d") continue;
      const part = Number.isInteger(op[1]) ? p.ch.parts[op[1] as number] : undefined;
      const nums = [op[2], op[3], op[4], op[6], op[7], op[8], op[9]];
      if (!part || !HEX.test(String(op[5])) || !nums.every(Number.isFinite)) continue;
      const b: Brush = { color: String(op[5]), alpha: Math.min(1, Math.max(0, op[6])), metal: op[7], rough: op[8], emis: op[9] };
      paintDot(part, new THREE.Vector2(op[2], op[3]), b, Math.min(0.5, op[4]));
    }
  }

  private onPaintReq() {
    const now = performance.now();
    if (now - this.lastSnapReply < 5000) return;
    this.lastSnapReply = now;
    this.sendFullSnapshot();
  }

  /** תמונת מצב של כל שכבות הצבע בכל חלקי הגוף — כדי שכולם יראו בדיוק את אותו הדבר */
  private sendFullSnapshot() {
    if (this.net.kind === "local") return;
    const sid = Math.floor(Math.random() * 1e9);
    this.sendQueue = this.sendQueue.filter(([t]) => t !== "psnap");
    this.me.ch.parts.forEach((part, pi) => {
      [part.albedo, part.emissive, part.orm].forEach((layer, L) => {
        const url = layer.canvas.toDataURL("image/jpeg", L === 0 ? 0.72 : 0.8);
        const CH = 2800;
        const n = Math.ceil(url.length / CH);
        for (let k = 0; k < n; k++) this.sendQueue.push(["psnap", { s: sid, pi, L, k, n, d: url.slice(k * CH, (k + 1) * CH) } satisfies SnapMsg]);
      });
    });
  }

  private onSnap(d: SnapMsg, from: string) {
    const p = this.players.get(from);
    if (!p || !d || !Number.isInteger(d.pi) || !Number.isInteger(d.k) || !Number.isInteger(d.n) || !Number.isInteger(d.L) || d.n > 40 || d.k >= d.n || typeof d.d !== "string") return;
    const key = `${from}:${d.s}:${d.pi}:${d.L}`;
    let b = this.snapBuf.get(key);
    if (!b) {
      b = { n: d.n, parts: [] };
      this.snapBuf.set(key, b);
      if (this.snapBuf.size > 300) this.snapBuf.delete(this.snapBuf.keys().next().value!);
    }
    b.parts[d.k] = d.d;
    for (let i = 0; i < b.n; i++) if (b.parts[i] === undefined) return;
    this.snapBuf.delete(key);
    const url = b.parts.join("");
    if (!url.startsWith("data:image/jpeg;base64,")) return;
    const part = p.ch.parts[d.pi];
    const layer = part ? [part.albedo, part.emissive, part.orm][d.L] : undefined;
    if (!layer) return;
    const img = new Image();
    img.onload = () => {
      layer.ctx.globalAlpha = 1;
      layer.ctx.drawImage(img, 0, 0, layer.canvas.width, layer.canvas.height);
      layer.texture.needsUpdate = true;
    };
    img.src = url;
  }

  // ================= צביעה מקומית =================

  private canPaint() {
    const m = this.me;
    const ph = this.rs.ph;
    if (!m.alive || ph === "check") return false;
    if (ph === "lobby" || ph === "countdown") return true;
    if (m.role === "hider") return true;
    return m.role === "hunter" && ph === "hide"; // גם ציידים יכולים להיצבע בזמן ההמתנה
  }

  private paintAt(part: Part, uv: THREE.Vector2, prev: THREE.Vector2 | null, prevPart: Part | null) {
    const pi = this.me.ch.parts.indexOf(part);
    if (pi < 0) return;
    const r = this.brushSize / 2;
    const b = this.brush;
    const send = (q: THREE.Vector2) => this.queuePaintOp(["d", pi, r3(q.x), r3(q.y), r3(r), b.color, r2(b.alpha), r2(b.metal), r2(b.rough), r2(b.emis)]);
    if (prev && prevPart === part && prev.distanceTo(uv) <= 0.35) {
      paintLine(part, prev, uv, b, r);
      const steps = Math.max(1, Math.ceil(prev.distanceTo(uv) / Math.max(0.004, r * 0.8)));
      for (let i = 1; i <= steps; i++) send(new THREE.Vector2().lerpVectors(prev, uv, i / steps));
    } else {
      paintDot(part, uv, b, r);
      send(uv);
    }
  }

  /** טפטפת תלת־ממדית (מחזיקים רווח): צבע + חומר של המשטח */
  private updatePicking() {
    if (!this.picking || !this.hud.paintMode) { this.pickPreview = null; return; }
    this.ray.setFromCamera(this.ndc(this.mouse.x, this.mouse.y), this.camera);
    this.ray.far = 80;
    const hit = this.ray.intersectObjects([...this.world.surfaces, ...this.me.ch.meshes], false)[0];
    if (!hit) { this.pickPreview = null; return; }
    const c = new THREE.Color();
    const part = this.me.ch.parts.find((p) => p.mesh === hit.object);
    if (part && hit.uv) {
      samplePart(part, hit.uv, c);
      this.pickPreview = { color: `#${c.getHexString()}`, metal: this.brush.metal, rough: this.brush.rough, emis: this.brush.emis };
    } else {
      this.world.surfaceColor(hit, c);
      const sm = this.world.surfaceMat(hit);
      this.pickPreview = { color: `#${c.getHexString()}`, metal: sm.metal, rough: sm.rough, emis: sm.emissive };
    }
  }
  private commitPick() {
    if (!this.pickPreview) return;
    const pp = this.pickPreview;
    this.brush = { ...this.brush, color: pp.color, metal: pp.metal, rough: pp.rough, emis: pp.emis };
    this.addHistory(pp.color);
    if (!this.opts.muted) sfxClick();
    this.emit();
  }
  private addHistory(c: string) {
    this.history = [c, ...this.history.filter((x) => x !== c)].slice(0, 8);
    this.histIdx = 0;
  }

  // ================= קלט =================

  private listen(t: EventTarget, type: string, fn: (e: never) => void) {
    t.addEventListener(type, fn as EventListener, { passive: false });
    this.listeners.push([t, type, fn as EventListener]);
  }

  private bindInput() {
    const cv = this.renderer.domElement;
    this.listen(window, "keydown", (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (e.repeat) { if (e.code === "Space" || e.code === "KeyR" || e.code === "Tab") e.preventDefault(); return; }
      this.keys.add(e.code);
      const m = this.me;
      switch (e.code) {
        case "Space":
          e.preventDefault();
          if (this.hud.paintMode) { this.picking = true; this.emit(); }
          else if (!this.attached && !this.spectating()) this.wantJump = true;
          break;
        case "KeyF": if (this.canPaint() || this.hud.paintMode) this.togglePaint(); break;
        case "KeyR": e.preventDefault(); if (!m.armed && m.alive && !this.hud.paintMode && !this.spectating()) this.onPoseMenu?.(true); break;
        case "KeyQ": if (!this.spectating()) this.placeClone(); break;
        case "KeyX": this.removeClones(); break;
        case "Digit1": this.whistle(); break;
        case "Digit2": this.toggleNameplates(); break;
        case "Digit3": this.setXray(!this.xray); break;
        case "Digit4": if (this.spectating()) this.cycleSpectate(); break;
        case "Digit5": this.toggleFreeCam(); break;
        case "KeyG": this.giveLike(); break;
        case "KeyY": this.voteSkip(); break;
        case "KeyT": e.preventDefault(); this.unlockPointerIfNeeded(); this.onChatKey?.(); break;
        case "KeyE": if (this.nearPlay()) { this.unlockPointerIfNeeded(); this.onInteract?.(); } break;
        case "KeyV": if (this.hud.paintMode) this.setShadow(!this.shadow); break;
        case "ShiftLeft": case "ShiftRight": this.detach(); break;
      }
    });
    this.listen(window, "keyup", (e: KeyboardEvent) => {
      this.keys.delete(e.code);
      if (e.code === "Space" && this.picking) { this.picking = false; this.commitPick(); }
      if (e.code === "KeyR") this.onPoseMenu?.(false);
    });
    this.listen(window, "blur", () => { this.keys.clear(); this.lmb = this.rmb = false; });
    this.listen(document, "pointerlockchange", () => { this.pointerLocked = document.pointerLockElement === cv; this.emit(); });
    this.listen(cv, "contextmenu", (e: Event) => e.preventDefault());
    this.listen(cv, "wheel", (e: WheelEvent) => {
      e.preventDefault();
      if (this.hud.paintMode && this.picking && this.history.length) {
        this.histIdx = (this.histIdx + (e.deltaY > 0 ? 1 : this.history.length - 1)) % this.history.length;
        this.brush.color = this.history[this.histIdx];
        this.emit();
        return;
      }
      if (this.hud.paintMode) this.paintDist = Math.max(1.4, Math.min(8, this.paintDist + e.deltaY * 0.004));
      else this.camDist = Math.max(1.8, Math.min(10, this.camDist + e.deltaY * 0.005));
    });
    this.listen(cv, "mousemove", (e: MouseEvent) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      if (this.pointerLocked) this.lookDelta(e.movementX * 0.47, e.movementY * 0.48);
    });
    this.listen(cv, "pointerdown", (e: PointerEvent) => {
      cv.focus();
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      if (e.button === 0) this.lmb = true;
      if (e.button === 2) {
        this.rmb = true;
        if (this.me.armed && !this.hud.paintMode && (this.rs.ph === "hide" || this.rs.ph === "hunt")) { this.tps = !this.tps; this.updateVisibility(this.me); this.emit(); }
      }
      if (this.pointerLocked) {
        if (e.button === 0) this.fire();
        return;
      }
      try { cv.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      let mode: "cam" | "paint" | "size" = "cam";
      let uv: THREE.Vector2 | null = null;
      let part: Part | null = null;
      if (this.hud.paintMode && !(e.altKey && e.button === 0) && e.button !== 1) {
        if (e.button === 2) mode = "size";
        else if (e.button === 0 && !this.picking) {
          const hit = this.pickOwnBody(e.clientX, e.clientY);
          if (hit) {
            part = this.me.ch.parts.find((pp) => pp.mesh === hit.object) ?? null;
            if (part) {
              mode = "paint";
              uv = hit.uv!.clone();
              this.paintAt(part, uv, null, null);
            }
          }
        }
      }
      this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), mode, uv, part };
    });
    this.listen(cv, "pointermove", (e: PointerEvent) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      const p = this.drag;
      if (!p || p.id !== e.pointerId) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      if (p.mode === "paint") {
        const hit = this.pickOwnBody(e.clientX, e.clientY);
        const part = hit ? this.me.ch.parts.find((pp) => pp.mesh === hit.object) ?? null : null;
        if (hit && hit.uv && part) {
          this.paintAt(part, hit.uv, p.uv, p.part);
          p.uv = hit.uv.clone();
          p.part = part;
        } else { p.uv = null; p.part = null; }
        return;
      }
      if (p.mode === "size") {
        this.brushSize = Math.max(0.01, Math.min(0.5, this.brushSize + dx * 0.0015));
        this.emit();
        return;
      }
      this.lookDelta(dx, dy);
    });
    const up = (e: PointerEvent) => {
      if (e.button === 0) this.lmb = false;
      if (e.button === 2) this.rmb = false;
      const p = this.drag;
      if (!p || p.id !== e.pointerId) return;
      this.drag = null;
      const moved = Math.hypot(e.clientX - p.sx, e.clientY - p.sy);
      if (p.mode === "cam" && moved < 8 && performance.now() - p.t < 400) this.tap(e.pointerType, e.button);
    };
    this.listen(cv, "pointerup", up);
    this.listen(cv, "pointercancel", up);
    this.listen(window, "mouseup", (e: MouseEvent) => { if (e.button === 0) this.lmb = false; if (e.button === 2) this.rmb = false; });
  }

  private ndc(x: number, y: number) {
    const r = this.renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
  }

  private pickOwnBody(x: number, y: number) {
    this.ray.setFromCamera(this.ndc(x, y), this.camera);
    this.ray.far = 50;
    const list = this.xray ? this.me.ch.meshes : [...this.world.surfaces, ...this.me.ch.meshes];
    const hit = this.ray.intersectObjects(list, false)[0];
    if (hit && hit.object.userData.char === this.me.ch && hit.uv) return hit;
    return null;
  }

  private tap(pointerType: string, button: number) {
    if (this.hud.paintMode) {
      if (this.picking && pointerType !== "mouse") { this.updatePicking(); this.commitPick(); this.picking = false; this.emit(); }
      return;
    }
    if (this.spectating() && this.rs.ph !== "check") { this.cycleSpectate(); return; }
    if (pointerType === "mouse" && button === 0 && !this.pointerLocked) this.requestLock();
  }

  private canFreeCam() {
    const ph = this.rs.ph;
    return ph === "check" || ((ph === "hide" || ph === "hunt") && (!this.me.alive || this.me.role === "spectator"));
  }

  toggleFreeCam() {
    if (!this.canFreeCam()) return;
    this.freeCam = !this.freeCam || this.rs.ph === "check";
    this.specTarget = null;
    this.specPos.copy(this.camera.position);
    this.emit();
  }

  toggleNameplates() {
    this.nameplates = !this.nameplates;
    for (const p of this.players.values()) { p.labelKey = ""; this.updateLabel(p); }
    this.emit();
  }

  cycleSpectate() {
    const alive = [...this.players.values()].filter((p) => p.alive && !p.local && p.role !== "spectator" && p.ch.root.visible);
    if (!alive.length) { this.specTarget = null; return; }
    const i = alive.findIndex((p) => p.id === this.specTarget);
    const next = i + 1 >= alive.length ? null : alive[i + 1];
    this.specTarget = next?.id ?? null;
    this.emit();
  }

  private nearPlay() {
    const l = this.world.lobby;
    return !!l && this.rs.ph === "lobby" && Math.hypot(this.me.pos.x - l.play.x, this.me.pos.z - l.play.z) < 2.4;
  }

  private onPad() {
    const l = this.world.lobby;
    return !!l && Math.hypot(this.me.pos.x - l.pad.x, this.me.pos.z - l.pad.z) < l.pad.r;
  }

  private unlockPointerIfNeeded() {
    if (this.pointerLocked) document.exitPointerLock();
  }

  // ================= API ל־React =================

  setJoystick(x: number, y: number) { this.joy.x = x; this.joy.y = y; }
  jump() { if (!this.attached) this.wantJump = true; }
  lookDelta(dx: number, dy: number) {
    this.camYaw -= dx * 0.006;
    this.camPitch = Math.max(-1.2, Math.min(1.35, this.camPitch + dy * 0.005));
  }
  togglePaint() {
    if (!this.canPaint() && !this.hud.paintMode) return;
    this.hud.paintMode = !this.hud.paintMode;
    this.picking = false;
    if (this.hud.paintMode) { this.unlockPointerIfNeeded(); this.camPitch = Math.min(this.camPitch, 0.5); }
    else if (this.xray) this.setXray(false);
    if (!this.opts.muted) sfxClick();
    this.emit();
  }
  setPicking(v: boolean) {
    if (!this.hud.paintMode) return;
    this.picking = v;
    this.emit();
  }
  setBrush(patch: Partial<Brush>) {
    this.brush = { ...this.brush, ...patch };
    if (patch.color && HEX.test(patch.color)) this.addHistory(patch.color);
    this.emit();
  }
  setBrushSize(b: number) { this.brushSize = b; this.emit(); }
  /** מוחקים את כל הצבע (חוזרים ללבן) */
  clearPaint() {
    if (!this.canPaint()) return;
    resetPaint(this.me.ch);
    this.sendFullSnapshot();
    this.emit();
  }
  setPose(p: PoseId) {
    const m = this.me;
    if (m.armed || !m.alive) return;
    if (m.pose !== p) m.moveT = 0;
    m.pose = p;
    this.publishSelf(true);
    this.emit();
  }
  setMySize(s: SizeId) {
    const ph = this.rs.ph;
    if (ph === "hunt" || ph === "hide" || ph === "check") return;
    if (s === "petit" && !this.rs.s.allowPetit) return;
    this.me.size = s;
    if (!this.me.armed) setSize(this.me.ch, s);
    this.publishSelf(true);
    this.emit();
  }
  setMyBody(b: BodyType) {
    const ph = this.rs.ph;
    if (ph === "hunt" || ph === "hide" || ph === "check") return;
    this.setModel(this.me, this.me.armed, b);
    setSize(this.me.ch, this.me.size);
    this.publishSelf(true);
    this.emit();
  }
  setXray(v: boolean) {
    this.xray = v;
    for (const p of this.me.ch.parts) {
      (p.mesh.material as THREE.MeshStandardMaterial).depthTest = !v;
      p.mesh.renderOrder = v ? 8 : 0;
    }
    if (this.hud) this.emit();
  }
  setShadow(v: boolean) {
    this.shadow = v;
    for (const p of this.me.ch.parts) p.mesh.castShadow = v;
    if (this.hud) this.emit();
  }
  setMuted(m: boolean) {
    this.opts.muted = m;
    this.fx.muted = m;
    if (m) stopMusic();
    else if (this.rs.ph === "hunt") startMusic();
  }
  unlockPointer() { this.unlockPointerIfNeeded(); }
  requestLock() {
    try { (this.renderer.domElement.requestPointerLock() as unknown as Promise<void> | undefined)?.catch?.(() => {}); } catch { /* לא נתמך */ }
  }

  /** אייקוני התנוחות — מצולמים מהבובה עצמה */
  poseIcons(): Record<string, string> {
    if (this.poseIconCache) return this.poseIconCache;
    const size = 96;
    const rt = new THREE.WebGLRenderTarget(size, size);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight("#ffffff", "#666666", 2.2));
    const dl = new THREE.DirectionalLight("#ffffff", 1.2);
    dl.position.set(2, 4, 3);
    scene.add(dl);
    const cam = new THREE.PerspectiveCamera(35, 1, 0.1, 30);
    const ch = buildCharacter();
    scene.add(ch.root);
    const out: Record<string, string> = {};
    const buf = new Uint8Array(size * size * 4);
    const cv = document.createElement("canvas");
    cv.width = cv.height = size;
    const g = cv.getContext("2d")!;
    const prevClear = this.renderer.getClearAlpha();
    for (const pose of POSES) {
      applyPose(ch, pose);
      ch.root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(ch.root);
      const c = box.getCenter(new THREE.Vector3());
      const s = box.getSize(new THREE.Vector3());
      const r = Math.max(s.x, s.y, s.z) * 0.62;
      cam.position.set(c.x + r * 1.1, c.y + r * 0.7, c.z + r * 2.6);
      cam.lookAt(c);
      this.renderer.setRenderTarget(rt);
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.clear();
      this.renderer.render(scene, cam);
      this.renderer.readRenderTargetPixels(rt, 0, 0, size, size, buf);
      const img = g.createImageData(size, size);
      for (let y = 0; y < size; y++) img.data.set(buf.subarray((size - 1 - y) * size * 4, (size - y) * size * 4), y * size * 4);
      g.putImageData(img, 0, 0);
      out[pose] = cv.toDataURL("image/png");
    }
    this.renderer.setRenderTarget(null);
    this.renderer.setClearColor(0x000000, prevClear);
    rt.dispose();
    disposeCharacter(ch);
    this.poseIconCache = out;
    return out;
  }

  private toast(text: string) { this.hud.toast = { text, id: ++this.toastId }; }

  private emit() {
    const rs = this.rs;
    const m = this.me;
    const h = this.hud;
    const pre = rs.ph === "lobby" || rs.ph === "countdown";
    h.isHost = this.isHost();
    h.connected = this.net.connected();
    h.phase = rs.ph;
    h.roundId = rs.id;
    h.settings = { ...rs.s };
    h.mapName = this.world.name;
    h.time = rs.ph === "lobby" ? 0 : Math.max(0, Math.ceil((this.localEnd - performance.now()) / 1000));
    h.myRole = pre ? "hider" : m.role;
    h.alive = m.alive;
    h.ammo = m.ammo;
    h.pts = Math.floor(m.pts);
    h.picking = this.picking;
    h.pickPreview = this.pickPreview?.color ?? null;
    h.color = this.brush.color;
    h.alpha = this.brush.alpha;
    h.metal = this.brush.metal;
    h.rough = this.brush.rough;
    h.emis = this.brush.emis;
    h.brush = this.brushSize;
    h.history = [...this.history];
    h.pose = m.pose;
    h.size = m.size;
    h.bodyType = m.bodyType;
    h.room = this.world.roomAt(m.pos.x, m.pos.z);
    h.locked = this.pointerLocked;
    h.freeCam = this.freeCam;
    h.spectating = this.spectating() ? (this.specTarget ? this.players.get(this.specTarget)?.name ?? "" : "") : null;
    h.tps = this.tps;
    h.attached = !!this.attached;
    h.crouch = this.crouch;
    h.clones = m.clones.length;
    h.nameplates = this.nameplates;
    h.xray = this.xray;
    h.shadow = this.shadow;
    h.chat = this.chat;
    const humans = [...this.players.values()].filter((p) => !p.bot);
    const tag = `${rs.id}:${rs.ph}`;
    h.votes = { have: humans.filter((p) => p.vote === tag).length, need: humans.length, mine: m.vote === tag };
    h.nearPlay = this.nearPlay();
    h.onPad = this.onPad();
    h.likeTarget = this.likeTarget && this.likeTarget.id !== m.id ? this.likeTarget.name : null;
    h.likedThisRound = this.likedRound === rs.id;
    h.likes = this.likes;
    h.frozen = m.moveT > 1 && !m.armed;
    const pad = this.world.lobby?.pad;
    h.players = [...this.players.values()].map((p) => ({
      id: p.id, name: p.name, color: p.color, role: pre ? "hider" : p.role, alive: p.alive, bot: p.bot, me: p.local,
      host: p.id === this.hostId || (p.local && this.isHost()), pts: Math.floor(p.pts), likes: p.likes,
      onPad: !!pad && pre && Math.hypot(p.pos.x - pad.x, p.pos.z - pad.z) < pad.r, ammo: p.ammo,
    }));
    const double = rs.s.mode === "double";
    const hiderIds = pre ? [] : Object.keys(rs.roles).filter((id) => double ? id !== m.id : rs.roles[id] === "hider" || rs.conv.includes(id));
    h.hiderIcons = hiderIds.map((id) => ({
      id, found: double ? this.myFinds.has(id) : rs.dead.includes(id) || rs.conv.includes(id) || this.pendingDead.has(id),
    }));
    h.win = rs.win;
    h.why = rs.why;
    h.results = rs.res;
    this.opts.onHud({ ...h });
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    stopMusic();
    this.ro.disconnect();
    this.offs.forEach((f) => f());
    for (const [t, type, fn] of this.listeners) t.removeEventListener(type, fn);
    this.unlockPointerIfNeeded();
    for (const p of this.players.values()) { this.clearClones(p); disposeCharacter(p.ch); }
    this.clearStatues();
    this.world.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.net.close();
  }
}
