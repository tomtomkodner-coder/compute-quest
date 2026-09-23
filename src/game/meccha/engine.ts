// המנוע של Meccha Chameleon (שיבוט): מחבואים מרובי משתתפים.
// המארח (מי שנכנס ראשון) מנהל את הסיבוב והבוטים; כל שחקן אחראי על הדמות שלו.
import * as THREE from "three";
import { buildWorld, type World } from "./world";
import { buildNav, type Nav } from "./nav";
import {
  buildCharacter, applyPose, setSize, paintDot, paintLine, fillPart, resetPaint, setSurface, setLabel,
  type Character, type PoseId, type SizeId,
} from "./character";
import { sampleTex, type PaintTex } from "./textures";
import { Fx } from "./fx";
import type { Net, Presence } from "./net";
import { sfxClick, sfxCorrect, sfxWrong, sfxWin, sfxTick, startMusic, stopMusic } from "@/lib/sound";

// ================= טיפוסים =================

export type Role = "hider" | "hunter" | "spectator";
export type Phase = "lobby" | "hide" | "hunt" | "results";
export type ModeId = "normal" | "infection" | "double";
export type Tool = "brush" | "fill" | "picker";

export interface Settings {
  mode: ModeId;
  hideTime: number;
  huntTime: number;
  hunters: number;
  bots: number;
  ammoLimit: boolean;
  ammo: number;
  whistle: number; // 0 = כבוי, אחרת כל כמה שניות
  difficulty: 0 | 1 | 2;
}

export interface ResultRow { id: string; n: string; c: string; r: "hider" | "hunter"; a: boolean; p: number; b: boolean }

interface RS {
  id: number;
  ph: Phase;
  t: number;
  s: Settings;
  roles: Record<string, "hider" | "hunter">;
  dead: string[];
  conv: string[];
  win?: "hiders" | "hunters";
  why?: string;
  res?: ResultRow[];
}

interface BotPub { id: string; n: string; c: string; p: [number, number, number]; y: number; po: PoseId; sz: SizeId; s: number; hp: number; am: number; pts: number; cy: number; mv: number }

export interface PlayerInfo { id: string; name: string; color: string; role: Role; alive: boolean; bot: boolean; me: boolean; host: boolean; pts: number; hp: number; pref: string }

export interface HudState {
  net: Net["kind"];
  code?: string;
  connected: boolean;
  isHost: boolean;
  phase: Phase;
  time: number;
  roundId: number;
  settings: Settings;
  myRole: Role;
  alive: boolean;
  hp: number;
  ammo: number;
  pts: number;
  paintMode: boolean;
  tool: Tool;
  color: string;
  brush: number;
  metal: number;
  rough: number;
  pose: PoseId;
  size: SizeId;
  pref: "any" | "hider" | "hunter";
  frozen: boolean;
  room: string;
  players: PlayerInfo[];
  hidersLeft: number;
  huntersLeft: number;
  win?: "hiders" | "hunters";
  why?: string;
  results?: ResultRow[];
  toast: { text: string; id: number } | null;
  locked: boolean;
  spectating: string | null;
  hitFlash: number;
  canUndo: boolean;
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

interface Player {
  id: string;
  name: string;
  color: string;
  bot: boolean;
  local: boolean;
  role: Role;
  alive: boolean;
  ch: Character;
  chKind: "hider" | "hunter";
  pos: THREE.Vector3;
  tpos: THREE.Vector3;
  yaw: number;
  tyaw: number;
  vy: number;
  pose: PoseId;
  size: SizeId;
  moving: boolean;
  camYaw: number;
  hp: number;
  ammo: number;
  pts: number;
  metal: number;
  rough: number;
  pref: string;
  moveT: number;
  samples: { mesh: THREE.Mesh; local: THREE.Vector3 }[];
  dying: number;
  seed: number;
  paintedKey: string;
  labelKey: string;
  ai?: BotAI;
  radius: number;
}

interface ShotMsg { o: number[]; h: number[][]; c: string }
interface SnapMsg { s: number; pi: number; k: number; n: number; d: string }

const DEFAULTS: Settings = { mode: "normal", hideTime: 60, huntTime: 180, hunters: 1, bots: 3, ammoLimit: false, ammo: 5, whistle: 0, difficulty: 1 };
const GRAVITY = 20;
const SPEED = { hider: 5, hunter: 5.4, spec: 9 };
const MISS_DAMAGE = 20;
const SHOT_CD = 900;
const PELLETS = 6;
const SPREAD = 0.035;
const BOT_NAMES = ["בוט נועה", "בוט איתי", "בוט מאיה", "בוט עומר", "בוט שירה", "בוט יונתן", "בוט תמר", "בוט אריאל"];
const BOT_COLORS = ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93", "#ff924c", "#52b69a", "#f15bb5"];
const POSE_SIL: Record<PoseId, number> = { stand: 0.26, crouch: 0.15, ball: 0.1, flat: 0.06, sit: 0.14, pillar: 0.2, star: 0.2, tpose: 0.22 };
const SIZE_SIL: Record<SizeId, number> = { petite: 0.6, normal: 1, plump: 1.4 };

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

// ================= מנוע =================

export class Engine {
  private container: HTMLElement;
  private net: Net;
  private opts: EngineOptions;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(62, 1, 0.05, 200);
  private world: World;
  private nav: Nav;
  private fx: Fx;
  private ray = new THREE.Raycaster();
  private raf = 0;
  private last = 0;
  private disposed = false;
  private ro: ResizeObserver;

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

  // קלט ומצלמה
  private camYaw = Math.PI;
  private camPitch = 0.3;
  private camDist = 5;
  private keys = new Set<string>();
  private joy = { x: 0, y: 0 };
  private wantJump = false;
  private pointerLocked = false;
  private drag: { id: number; x: number; y: number; sx: number; sy: number; t: number; mode: "cam" | "paint" | "size"; uv: THREE.Vector2 | null; mesh: THREE.Mesh | null } | null = null;
  private specPos = new THREE.Vector3(0, 6, 6);
  private specTarget: string | null = null;
  private lastShot = 0;
  private listeners: [EventTarget, string, EventListener][] = [];
  onPoseMenu: (() => void) | null = null;

  // צביעה וסנכרון
  private undoStack: { pi: number; data: ImageData }[][] = [];
  private curStroke: { pi: number; data: ImageData }[] = [];
  private strokeSaved = new Set<number>();
  private recent: string[] = [];
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
  private hostT = 0;
  private botPubT = 0;

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

    this.scene.background = new THREE.Color("#b8e0e6");
    this.scene.add(new THREE.HemisphereLight("#ffffff", "#9c7a5b", 1.25));
    const sun = new THREE.DirectionalLight("#fff1dc", 1.8);
    sun.position.set(-14, 34, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -27, right: 27, top: 21, bottom: -21, near: 1, far: 80 });
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.04;
    this.scene.add(sun);

    this.world = buildWorld();
    this.scene.add(this.world.group);
    this.world.setGate(true);
    this.nav = buildNav(this.world);
    this.fx = new Fx(this.scene);
    this.fx.muted = opts.muted;

    this.rs = { id: 0, ph: "lobby", t: 0, s: { ...DEFAULTS, bots: opts.defaultBots }, roles: {}, dead: [], conv: [] };

    this.me = this.makePlayer(net.selfId(), opts.name, opts.color, false, true);
    this.me.pos.set((Math.random() - 0.5) * 4, 0, 3 + Math.random() * 2);
    this.me.tpos.copy(this.me.pos);

    this.hud = {
      net: net.kind, code: net.code, connected: true, isHost: true, phase: "lobby", time: 0, roundId: 0,
      settings: this.rs.s, myRole: "hider", alive: true, hp: 100, ammo: 0, pts: 0,
      paintMode: false, tool: "brush", color: "#e63946", brush: 0.06, metal: 0, rough: 0.8,
      pose: "stand", size: "normal", pref: "any", frozen: false, room: "", players: [],
      hidersLeft: 0, huntersLeft: 0, toast: null, locked: false, spectating: null, hitFlash: 0, canUndo: false,
    };

    this.offs.push(net.on("shot", (d) => this.onShot(d as ShotMsg)));
    this.offs.push(net.on("hit", (d, f) => this.onHit(d as { t: string }, f)));
    this.offs.push(net.on("paint", (d, f) => this.onPaintOps(d as { ops: unknown[] }, f)));
    this.offs.push(net.on("psnap", (d, f) => this.onSnap(d as SnapMsg, f)));
    this.offs.push(net.on("paintreq", () => this.onPaintReq()));
    this.offs.push(net.on("whistle", (d) => this.onWhistle(d as { id: string })));
    this.offs.push(net.onPeers(() => this.syncPeers()));
    window.setTimeout(() => { if (!this.disposed) this.net.emit("paintreq", {}); }, 2500);

    this.bindInput();
    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.publishSelf(true);
    this.syncPeers();
    this.toast(net.kind === "local" ? "משחק לבד עם בוטים — לחצו 'התחל סיבוב'" : "ברוכים הבאים ללובי! 🦎");
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  // ================= שחקנים =================

  private makePlayer(id: string, name: string, color: string, bot: boolean, local: boolean): Player {
    const p: Player = {
      id, name, color, bot, local, role: "hider", alive: true,
      ch: buildCharacter(), chKind: "hider",
      pos: new THREE.Vector3(), tpos: new THREE.Vector3(), yaw: 0, tyaw: 0, vy: 0,
      pose: "stand", size: "normal", moving: false, camYaw: 0,
      hp: 100, ammo: 5, pts: 0, metal: 0, rough: 0.8, pref: "any", moveT: 99, samples: [],
      dying: 0, seed: Math.floor(Math.random() * 1e9), paintedKey: "", labelKey: "", radius: 0.4,
    };
    this.scene.add(p.ch.root);
    p.samples = this.makeSamples(p.ch);
    this.players.set(id, p);
    return p;
  }

  private makeSamples(ch: Character) {
    const samples: Player["samples"] = [];
    for (const m of ch.meshes) {
      const pos = m.geometry.getAttribute("position");
      const n = Math.max(3, Math.round(pos.count / 40));
      for (let k = 0; k < n; k++) {
        const i = Math.floor(Math.random() * pos.count);
        samples.push({ mesh: m, local: new THREE.Vector3().fromBufferAttribute(pos, i).multiplyScalar(0.97) });
      }
    }
    return samples;
  }

  private disposeChar(ch: Character) {
    this.scene.remove(ch.root);
    ch.root.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mm = m.material as THREE.MeshStandardMaterial | undefined;
      mm?.map?.dispose();
      mm?.dispose();
    });
  }

  /** מחליף את הדגם (זיקית לבנה ↔ צייד עם רובה) */
  private setModel(p: Player, kind: "hider" | "hunter") {
    if (p.chKind === kind) return;
    this.disposeChar(p.ch);
    p.ch = kind === "hunter" ? buildCharacter({ seeker: true, accent: p.color }) : buildCharacter();
    p.chKind = kind;
    this.scene.add(p.ch.root);
    p.samples = this.makeSamples(p.ch);
    setSize(p.ch, kind === "hunter" ? "normal" : p.size);
    if (kind === "hider") setSurface(p.ch, p.metal, p.rough);
    p.paintedKey = "";
    p.labelKey = "";
    this.updateLabel(p);
  }

  private removePlayer(id: string) {
    const p = this.players.get(id);
    if (!p || p.local) return;
    this.disposeChar(p.ch);
    this.players.delete(id);
  }

  /** שמות מעל הראש — רק לחברי הקבוצה שלך (אחרת זה היה מסגיר את המתחבאים) */
  private updateLabel(p: Player) {
    let text: string | null = null;
    if (!p.local) {
      const ph = this.rs.ph;
      const mine = this.me.role;
      const show = ph === "lobby" || ph === "results" || mine === "spectator" || !this.me.alive || p.role === mine;
      if (show && p.ch.root.visible) text = p.name;
    }
    const color = p.role === "hunter" ? "#ffb703" : "#ffffff";
    const key = `${text}|${color}`;
    if (key === p.labelKey) return;
    p.labelKey = key;
    setLabel(p.ch, text, color);
  }

  // ================= רשת: נוכחות =================

  private publishSelf(force = false) {
    const m = this.me;
    const pres: Presence = {
      st: 1, n: m.name, c: m.color, j: this.joinedAt, sz: m.size, pr: this.hud.pref,
      p: [r2(m.pos.x), r2(m.pos.y), r2(m.pos.z)], y: r2(m.yaw), po: m.pose, mv: m.moving ? 1 : 0,
      cy: r2(this.camYaw), hp: m.hp, am: m.ammo, pts: Math.floor(m.pts), me: r2(m.metal), ro: r2(m.rough),
    };
    const key = JSON.stringify(pres);
    if (!force && key === this.lastPres) return;
    this.lastPres = key;
    this.net.setPresence(pres);
  }

  private syncPeers() {
    if (this.disposed) return;
    const peers = this.net.peers();
    // המארח: מי שהצטרף הכי מוקדם
    let host: { id: string; j: number } | null = null;
    for (const pr of peers) {
      if (!pr.me && !pr.p.st) continue;
      const j = pr.me ? this.joinedAt : Number(pr.p.j) || Infinity;
      if (!host || j < host.j || (j === host.j && pr.id < host.id)) host = { id: pr.id, j };
    }
    const wasHost = this.isHost();
    this.hostId = host?.id ?? this.me.id;
    if (!wasHost && this.isHost() && this.net.kind !== "local") this.toast("אתה המארח עכשיו 👑");

    const keep = new Set<string>([this.me.id]);
    for (const pr of peers) {
      if (pr.me || !pr.p.st) continue;
      keep.add(pr.id);
      let p = this.players.get(pr.id);
      if (!p) {
        p = this.makePlayer(pr.id, String(pr.p.n ?? "שחקן").slice(0, 14), /^#[0-9a-f]{6}$/i.test(String(pr.p.c)) ? String(pr.p.c) : "#ffffff", false, false);
        const pos = pr.p.p as number[] | undefined;
        if (Array.isArray(pos) && pos.length === 3 && pos.every(Number.isFinite)) { p.pos.set(pos[0], pos[1], pos[2]); p.tpos.copy(p.pos); }
        this.toast(`${p.name} הצטרף/ה 👋`);
        this.onRS();
      }
      this.readPresence(p, pr.p);
      if (pr.id === this.hostId && !this.isHost()) {
        if (Array.isArray(pr.p.bots)) this.adoptBots(pr.p.bots as BotPub[], keep);
        if (pr.p.rs) this.adoptRS(pr.p.rs as RS);
      }
    }
    if (this.isHost()) {
      for (const p of this.players.values()) if (p.bot) keep.add(p.id);
    } else {
      for (const id of this.rsBots) keep.add(id);
    }
    for (const id of [...this.players.keys()]) {
      if (keep.has(id)) continue;
      const p = this.players.get(id)!;
      if (!p.bot) this.toast(`${p.name} יצא/ה`);
      this.removePlayer(id);
    }
  }

  private readPresence(p: Player, pr: Presence) {
    p.name = String(pr.n ?? p.name).slice(0, 14);
    const pos = pr.p as number[] | undefined;
    if (Array.isArray(pos) && pos.length === 3 && pos.every(Number.isFinite)) p.tpos.set(pos[0], pos[1], pos[2]);
    if (Number.isFinite(pr.y)) p.tyaw = pr.y;
    if (typeof pr.po === "string") p.pose = pr.po as PoseId;
    if ((pr.sz === "petite" || pr.sz === "normal" || pr.sz === "plump") && pr.sz !== p.size) {
      p.size = pr.sz;
      if (p.chKind === "hider") setSize(p.ch, p.size);
    }
    p.moving = !!pr.mv;
    if (Number.isFinite(pr.cy)) p.camYaw = pr.cy;
    if (Number.isFinite(pr.hp)) p.hp = pr.hp;
    if (Number.isFinite(pr.am)) p.ammo = pr.am;
    if (Number.isFinite(pr.pts)) p.pts = pr.pts;
    p.pref = pr.pr === "hider" || pr.pr === "hunter" ? pr.pr : "any";
    if (Number.isFinite(pr.me) && Number.isFinite(pr.ro) && (pr.me !== p.metal || pr.ro !== p.rough)) {
      p.metal = pr.me;
      p.rough = pr.ro;
      if (p.chKind === "hider") setSurface(p.ch, p.metal, p.rough);
    }
  }

  private adoptRS(rs: RS) {
    if (!rs || typeof rs !== "object" || !rs.s || !rs.roles) return;
    const key = JSON.stringify(rs);
    if (key === this.rsKey) return;
    this.rsKey = key;
    this.rs = { ...rs, dead: Array.isArray(rs.dead) ? rs.dead : [], conv: Array.isArray(rs.conv) ? rs.conv : [] };
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
      p.tpos.set(b.p[0], b.p[1], b.p[2]);
      p.tyaw = b.y;
      p.pose = b.po;
      p.camYaw = b.cy;
      p.hp = b.hp;
      p.ammo = b.am;
      p.pts = b.pts;
      p.moving = !!b.mv;
      p.seed = b.s;
      if (b.sz !== p.size) { p.size = b.sz; if (p.chKind === "hider") setSize(p.ch, p.size); }
    }
  }

  isHost() {
    return this.net.kind === "local" || this.hostId === this.me.id;
  }

  // ================= מצב הסיבוב =================

  /** מופעל כשמצב הסיבוב משתנה (אצל כולם) */
  private onRS() {
    const rs = this.rs;
    if (rs.t !== this.lastT) {
      this.lastT = rs.t;
      this.localEnd = performance.now() + rs.t * 1000;
    }
    const newRound = rs.id !== this.rsSeenId;
    const phaseChanged = rs.ph !== this.rsPhaseSeen;
    this.rsSeenId = rs.id;
    this.rsPhaseSeen = rs.ph;
    if (newRound && rs.ph !== "lobby") this.pendingDead.clear();
    for (const p of this.players.values()) {
      const inRound = rs.roles[p.id] as Role | undefined;
      const role: Role = rs.ph === "lobby" ? "hider" : inRound ?? "spectator";
      const deadNow = rs.dead.includes(p.id);
      const pend = this.pendingDead.get(p.id);
      if (pend && (deadNow || performance.now() > pend || rs.ph !== "hunt")) this.pendingDead.delete(p.id);
      const wasAlive = p.alive;
      p.role = role;
      p.alive = rs.ph === "lobby" || (role !== "spectator" && !deadNow && !this.pendingDead.has(p.id) && !(role === "hunter" && p.hp <= 0 && rs.ph === "hunt"));
      if (wasAlive && !p.alive && role === "hider" && p.dying <= 0 && rs.ph === "hunt") p.dying = 1.2;
      this.setModel(p, role === "hunter" ? "hunter" : "hider");
      if (rs.ph === "lobby" || rs.ph === "results") p.ch.root.visible = true;
      else if (role === "spectator") p.ch.root.visible = false;
      else if (!p.alive && p.dying <= 0) p.ch.root.visible = role === "hunter";
      else p.ch.root.visible = true;
      this.updateLabel(p);
    }
    this.world.setGate(rs.ph !== "hide");
    if (newRound && rs.ph === "hide") this.beginRoundLocal();
    if (phaseChanged) {
      if (rs.ph === "hunt") {
        this.fx.gateSound();
        this.toast(this.me.role === "hunter" ? "השער נפתח! צאו לצוד 🔫" : "הציידים יצאו! אל תזוזו 🤫");
        if (this.me.role === "hider") this.sendFullSnapshot();
        if (!this.opts.muted) startMusic();
      } else if (rs.ph === "results") {
        stopMusic();
        const iWon = (rs.win === "hiders" && this.me.role === "hider") || (rs.win === "hunters" && this.me.role === "hunter");
        if (!this.opts.muted) (iWon ? sfxWin : sfxWrong)();
        this.hud.paintMode = false;
        this.unlockPointer();
      } else if (rs.ph === "lobby") {
        stopMusic();
        this.fx.clearDecals();
        this.me.hp = 100;
        this.me.alive = true;
        for (const p of this.players.values()) { p.dying = 0; p.ch.body.scale.set(1, 1, 1); if (p.chKind === "hider") resetPaint(p.ch); }
        if (this.me.pos.z > 8) this.me.pos.set((Math.random() - 0.5) * 4, 0, 3);
        this.hud.paintMode = false;
      }
    }
  }

  /** תחילת סיבוב אצלי: איפוס צבע, מיקום התחלה, חיים ותחמושת */
  private beginRoundLocal() {
    const rs = this.rs;
    this.fx.clearDecals();
    this.undoStack = [];
    for (const p of this.players.values()) {
      if (p.chKind === "hider") resetPaint(p.ch);
      p.paintedKey = "";
      p.dying = 0;
      p.pts = 0;
      p.ch.body.scale.set(1, 1, 1);
    }
    const m = this.me;
    m.hp = 100;
    m.ammo = rs.s.ammo;
    m.pts = 0;
    m.pose = "stand";
    this.whistleT = 0;
    const ids = Object.keys(rs.roles).sort();
    const idx = Math.max(0, ids.indexOf(m.id));
    if (m.role === "hunter") {
      m.pos.copy(this.world.hunterSpawns[idx % this.world.hunterSpawns.length]);
      this.camYaw = 0;
      this.toast("אתם הציידים! חכו בחדר עד שהשער ייפתח 🔒");
    } else if (m.role === "hider") {
      m.pos.copy(this.world.hiderSpawns[idx % this.world.hiderSpawns.length]);
      this.toast(`אתם זיקית! יש לכם ${rs.s.hideTime} שניות להתחבא ולהיצבע 🎨`);
    } else {
      this.specPos.set(0, 7, 4);
      this.toast("הסיבוב כבר התחיל — צופים עד הסיבוב הבא 👀");
    }
    m.tpos.copy(m.pos);
    m.vy = 0;
    this.publishSelf(true);
  }

  // ---------- לוגיקת מארח ----------

  private hostUpdate(dt: number) {
    const rs = this.rs;
    this.hostT -= dt;
    this.ensureBots();
    for (const p of this.players.values()) if (p.bot) this.updateBot(p, dt);
    this.botPubT -= dt;
    if (this.botPubT <= 0) {
      this.botPubT = 0.12;
      this.publishBots();
    }
    if (rs.ph === "lobby") return;
    const remain = Math.max(0, Math.ceil((this.localEnd - performance.now()) / 1000));
    let changed = false;
    if (remain !== rs.t) { rs.t = remain; this.lastT = remain; changed = true; }
    const hiders = Object.keys(rs.roles).filter((id) => rs.roles[id] === "hider" && !rs.dead.includes(id) && this.players.has(id));
    const activeHunters = Object.keys(rs.roles).filter((id) => {
      if (rs.roles[id] !== "hunter") return false;
      const p = this.players.get(id);
      return !!p && p.hp > 0 && (!rs.s.ammoLimit || p.ammo > 0);
    });
    if (rs.ph === "hide" && remain <= 0) {
      rs.ph = "hunt";
      this.setTimer(rs.s.huntTime);
      changed = true;
    } else if (rs.ph === "hunt") {
      if (!hiders.length) { this.endRound("hunters", "כל הזיקיות נתפסו!"); changed = true; }
      else if (remain <= 0) { this.endRound("hiders", "הזמן נגמר — הזיקיות שרדו!"); changed = true; }
      else if (!activeHunters.length) { this.endRound("hiders", rs.s.ammoLimit ? "לציידים נגמרו החיים או התחמושת!" : "לציידים נגמרו החיים!"); changed = true; }
    } else if (rs.ph === "results" && remain <= 0) {
      rs.ph = "lobby";
      rs.roles = {};
      rs.dead = [];
      rs.conv = [];
      rs.t = 0;
      changed = true;
    }
    if (changed || this.hostT <= 0) {
      this.hostT = 1;
      this.pushRS();
    }
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

  private endRound(win: "hiders" | "hunters", why: string) {
    const rs = this.rs;
    rs.ph = "results";
    rs.win = win;
    rs.why = why;
    rs.res = Object.keys(rs.roles).map((id) => {
      const p = this.players.get(id);
      const role = rs.roles[id];
      return {
        id, n: p?.name ?? "?", c: p?.color ?? "#fff", r: role,
        a: role === "hider" ? !rs.dead.includes(id) && !!p : (p?.hp ?? 0) > 0,
        p: Math.floor(p?.pts ?? 0), b: !!p?.bot,
      };
    }).sort((a, b) => b.p - a.p).slice(0, 12);
    this.setTimer(12);
  }

  /** המארח לוחץ "התחל סיבוב" */
  startRound() {
    if (!this.isHost() || this.rs.ph !== "lobby") return;
    const rs = this.rs;
    const s = rs.s;
    this.ensureBots();
    const ids = [...this.players.keys()];
    if (ids.length < 2) {
      this.toast("צריך לפחות 2 משתתפים — הוסיפו בוטים");
      this.emit();
      return;
    }
    const nHunt = Math.max(1, Math.min(ids.length - 1, s.mode === "double" ? 2 : s.hunters));
    const score = (id: string) => {
      const p = this.players.get(id)!;
      return (p.pref === "hunter" ? -1 : p.pref === "hider" ? 1 : 0) + Math.random() * 0.9;
    };
    const order = [...ids].sort((a, b) => score(a) - score(b));
    rs.roles = {};
    order.forEach((id, i) => (rs.roles[id] = i < nHunt ? "hunter" : "hider"));
    rs.dead = [];
    rs.conv = [];
    rs.win = undefined;
    rs.why = undefined;
    rs.res = undefined;
    rs.id += 1;
    rs.ph = "hide";
    this.setTimer(s.hideTime);
    const taken: THREE.Vector3[] = [];
    let hi = 0;
    for (const p of this.players.values()) {
      if (!p.bot) continue;
      p.hp = 100;
      p.ammo = s.ammo;
      p.pts = 0;
      p.seed = Math.floor(Math.random() * 1e9);
      p.ai = this.newAI();
      if (rs.roles[p.id] === "hunter") {
        p.pos.copy(this.world.hunterSpawns[(hi++ + 4) % this.world.hunterSpawns.length]);
        p.pose = "stand";
        p.yaw = Math.PI;
      } else this.botHide(p, taken);
      p.tpos.copy(p.pos);
      p.tyaw = p.yaw;
    }
    this.pushRS();
    this.publishBots();
  }

  setSettings(patch: Partial<Settings>) {
    if (!this.isHost() || this.rs.ph !== "lobby") return;
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
        p.pos.set((Math.random() - 0.5) * 8, 0, (Math.random() < 0.5 ? 5 : -5) + (Math.random() - 0.5) * 2);
        p.tpos.copy(p.pos);
        p.ai = this.newAI();
      } else if (i >= want && has) this.removePlayer(id);
    }
  }

  private publishBots() {
    const list: BotPub[] = [];
    for (const p of this.players.values()) if (p.bot)
      list.push({
        id: p.id, n: p.name, c: p.color, p: [r2(p.pos.x), r2(p.pos.y), r2(p.pos.z)], y: r2(p.yaw), po: p.pose, sz: p.size,
        s: p.seed, hp: p.hp, am: p.ammo, pts: Math.floor(p.pts), cy: r2(p.yaw + (p.ai?.headYaw ?? 0)), mv: p.moving ? 1 : 0,
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
      if (rs.ph === "hunt" && remain <= 10 && remain > 0 && !this.opts.muted) sfxTick();
    }
    this.updateLocal(dt);
    for (const p of this.players.values()) if (!p.local && (!p.bot || !this.isHost())) this.updateRemote(p, dt);
    for (const p of this.players.values()) this.animate(p, dt);
    this.paintBotsIfNeeded();
    this.updatePoints(real);
    this.updateWhistle(real);
    this.flushPaint(real);
    this.fx.setListener(this.me.pos);
    this.fx.update(dt);
    this.updateCamera(dt);
    this.presT -= real;
    if (this.presT <= 0) {
      this.presT = 0.07;
      this.publishSelf();
    }
    this.hudT -= real;
    if (this.hudT <= 0) {
      this.hudT = 0.12;
      this.emit();
    }
  }

  private updateRemote(p: Player, dt: number) {
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
      if (p.dying <= 0 && !p.alive && p.role === "hider") {
        p.ch.root.visible = false;
        this.updateLabel(p);
      }
    } else {
      if (p.moving) p.ch.walkPhase += dt * 11;
      applyPose(p.ch, p.chKind === "hunter" ? "stand" : p.pose, p.moving ? 1 : 0);
      if (p.chKind === "hunter" && p.bot && p.ai) p.ch.head.rotation.y = p.ai.headYaw;
    }
    p.ch.root.position.copy(p.pos);
    p.ch.root.rotation.y = p.yaw;
    const s = p.ch.root.scale;
    p.radius = 0.4 * Math.max(s.x, s.z);
    if (!p.local) {
      if (p.moving) p.moveT = 0;
      else p.moveT += dt;
    }
  }

  // ================= השחקן שלי =================

  private spectating() {
    const ph = this.rs.ph;
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
      if (this.keys.has("KeyE")) this.specPos.y += sp;
      if (this.keys.has("KeyQ")) this.specPos.y -= sp;
      this.specPos.y = Math.max(0.5, Math.min(12, this.specPos.y));
      this.wantJump = false;
      m.moving = false;
      return;
    }

    const can = !this.hud.paintMode && (m.alive || rs.ph === "lobby" || rs.ph === "results");
    if (!can) { ix = 0; iy = 0; }
    const speed = m.chKind === "hunter" ? SPEED.hunter : SPEED.hider;
    const dx = (fx * iy - fz * ix) * speed * dt;
    const dz = (fz * iy + fx * ix) * speed * dt;
    const moving = can && Math.hypot(ix, iy) > 0.1;
    if (this.wantJump && can && this.onGround(m)) { m.vy = 7.5; m.moveT = 0; }
    this.wantJump = false;
    const before = m.pos.clone();
    this.moveAgent(m, dx, dz, dt);
    const moved = before.distanceTo(m.pos) > 0.003;
    if (m.chKind === "hunter") {
      m.yaw = this.camYaw + Math.PI;
    } else if (moving) {
      let d = Math.atan2(dx, dz) - m.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      m.yaw += d * Math.min(1, dt * 12);
    }
    m.moving = moved && (moving || Math.abs(m.vy) > 0.1);
    if (m.moving) m.moveT = 0;
    else m.moveT += dt;
    if (moving && m.pose !== "stand") m.pose = "stand";
    m.tpos.copy(m.pos);
  }

  private onGround(a: Player) {
    return Math.abs(a.pos.y - this.world.groundAt(a.pos.x, a.pos.z, a.pos.y, a.radius)) < 0.02 && a.vy <= 0;
  }

  private moveAgent(a: Player, dx: number, dz: number, dt: number) {
    const w = this.world;
    const height = 1.7 * a.ch.root.scale.y;
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
    if (this.spectating()) {
      const tgt = this.specTarget ? this.players.get(this.specTarget) : null;
      if (tgt && tgt.alive) {
        const want = tgt.pos.clone().add(new THREE.Vector3(Math.sin(this.camYaw) * 4, 2.6, Math.cos(this.camYaw) * 4));
        this.specPos.lerp(want, Math.min(1, dt * 5));
      }
      this.camera.position.copy(this.specPos);
      const look = new THREE.Vector3(-Math.sin(this.camYaw) * Math.cos(this.camPitch), -Math.sin(this.camPitch), -Math.cos(this.camYaw) * Math.cos(this.camPitch));
      this.camera.lookAt(this.specPos.clone().add(look));
      return;
    }
    const hunter = m.chKind === "hunter";
    const target = m.pos.clone();
    const sy = m.ch.root.scale.y;
    target.y += (h.paintMode ? 0.7 : hunter ? 1.75 : 1.5) * sy;
    if (hunter) {
      target.x += Math.cos(this.camYaw) * 0.95;
      target.z -= Math.sin(this.camYaw) * 0.95;
      target.y += 0.15;
    }
    const want = h.paintMode ? 3.8 * sy : hunter ? 3.9 : this.camDist;
    const dir = new THREE.Vector3(Math.sin(this.camYaw) * Math.cos(this.camPitch), Math.sin(this.camPitch), Math.cos(this.camYaw) * Math.cos(this.camPitch));
    this.ray.set(target, dir);
    this.ray.far = want;
    const hit = this.ray.intersectObjects(this.world.surfaces, false)[0];
    const d = hit ? Math.max(0.5, hit.distance - 0.2) : want;
    const pos = target.clone().addScaledVector(dir, d);
    if (pos.y < 0.25) pos.y = 0.25;
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
    if (m.role !== "hunter" || rs.ph !== "hunt" || !m.alive || m.hp <= 0) return;
    if (rs.s.ammoLimit && m.ammo <= 0) { this.toast("נגמרה התחמושת!"); this.emit(); return; }
    const now = performance.now();
    if (now - this.lastShot < SHOT_CD) return;
    this.lastShot = now;
    this.camera.updateMatrixWorld();
    this.ray.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const dir = this.ray.ray.direction.clone();
    const origin = this.ray.ray.origin.clone();
    const muzzle = m.pos.clone().add(new THREE.Vector3(0, 1.2, 0)).addScaledVector(new THREE.Vector3(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw)), 0.85);
    this.afterShot(m, this.shoot(origin, dir, m, muzzle));
  }

  /** צרור כדוריות צבע; מחזיר את מי פגענו ואת נקודות הפגיעה */
  private shoot(origin: THREE.Vector3, dir: THREE.Vector3, shooter: Player, muzzle: THREE.Vector3) {
    const targets: THREE.Object3D[] = [...this.world.surfaces];
    for (const p of this.players.values())
      if (p !== shooter && p.role === "hider" && p.alive && p.ch.root.visible) targets.push(...p.ch.meshes);
    let hitPlayer: Player | null = null;
    const pts: number[][] = [];
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(dir, up).normalize();
    const up2 = new THREE.Vector3().crossVectors(right, dir).normalize();
    this.scene.updateMatrixWorld();
    for (let i = 0; i < PELLETS; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = i === 0 ? 0 : Math.sqrt(Math.random()) * SPREAD;
      const d = dir.clone().addScaledVector(right, Math.cos(a) * r).addScaledVector(up2, Math.sin(a) * r).normalize();
      this.ray.set(origin, d);
      this.ray.far = 60;
      const hit = this.ray.intersectObjects(targets, false)[0];
      if (!hit) continue;
      const ch = hit.object.userData.char as Character | undefined;
      if (ch) {
        const tp = [...this.players.values()].find((p) => p.ch === ch);
        if (tp && !hitPlayer) hitPlayer = tp;
        const pt = hit.object.userData.ptex as PaintTex | null;
        if (pt && hit.uv) paintDot(pt, hit.uv, shooter.color, 0.12);
      }
      const n = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : d.clone().negate();
      pts.push([r2(hit.point.x), r2(hit.point.y), r2(hit.point.z), r2(n.x), r2(n.y), r2(n.z), ch ? 1 : 0]);
    }
    return { hitPlayer, pts, muzzle };
  }

  private afterShot(s: Player, res: { hitPlayer: Player | null; pts: number[][]; muzzle: THREE.Vector3 }) {
    this.drawShot(res.muzzle, res.pts, s.color, s.local);
    if (s.local) this.fx.pumpSound();
    this.net.emit("shot", { o: [r2(res.muzzle.x), r2(res.muzzle.y), r2(res.muzzle.z)], h: res.pts, c: s.color } satisfies ShotMsg);
    if (res.hitPlayer) {
      if (this.rs.s.ammoLimit) s.ammo = Math.min(99, s.ammo + 1);
      this.net.emit("hit", { t: res.hitPlayer.id });
      if (s.local) this.toast(`פגעת ב־${res.hitPlayer.name}! 🎯`);
      this.registerHit(res.hitPlayer.id, s.id);
    } else {
      s.hp = Math.max(0, s.hp - MISS_DAMAGE);
      if (this.rs.s.ammoLimit) s.ammo = Math.max(0, s.ammo - 1);
      if (s.local) {
        this.fx.hurtSound();
        this.hud.hitFlash = Date.now();
        this.toast(s.hp > 0 ? `פספוס! ‎-${MISS_DAMAGE} חיים` : "נגמרו לך החיים 💀 עוברים לצפייה");
        if (s.hp <= 0) { s.alive = false; this.specPos.copy(this.camera.position); }
      }
    }
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
    const color = /^#[0-9a-f]{6}$/i.test(String(d.c)) ? String(d.c) : "#ff006e";
    this.drawShot(o, pts, color, false);
  }

  private onHit(d: { t: string }, from: string) {
    if (!d || typeof d.t !== "string") return;
    this.registerHit(d.t, from);
  }

  /** זיקית נפגעה — המארח מעדכן את הסיבוב, כולם רואים אפקט */
  private registerHit(targetId: string, by: string) {
    const rs = this.rs;
    const t = this.players.get(targetId);
    if (!t || rs.ph !== "hunt" || rs.roles[targetId] !== "hider" || rs.dead.includes(targetId) || this.pendingDead.has(targetId)) return;
    const shooter = this.players.get(by);
    this.fx.burst(t.pos.clone().setY(t.pos.y + 0.9), shooter?.color ?? "#ff006e");
    this.fx.splashSound(t.local ? undefined : t.pos);
    if (t.local) {
      this.toast(rs.s.mode === "infection" ? "נתפסת! עכשיו אתה צייד 🔫" : `נתפסת על ידי ${shooter?.name ?? "צייד"}! 💥`);
      if (!this.opts.muted) sfxWrong();
      this.specPos.copy(this.camera.position);
      this.hud.paintMode = false;
    } else if (shooter?.local && !this.opts.muted) sfxCorrect();
    if (this.isHost()) {
      if (rs.s.mode === "infection") {
        rs.roles[targetId] = "hunter";
        rs.conv.push(targetId);
        t.hp = 100;
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
      if (this.world.roomAt(x, z) === "חדר הציידים") continue;
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
    if (best.onTop) pose = r < 0.6 ? "flat" : "ball";
    else if (nearest < 1) pose = (["pillar", "star", "stand", "crouch", "ball", "tpose"] as PoseId[])[Math.floor(r * 6)];
    else pose = r < 0.4 ? "ball" : r < 0.7 ? "crouch" : r < 0.85 ? "sit" : "flat";
    if (pose === "flat") p.yaw = rand() * Math.PI * 2;
    p.pose = pose;
    const sizes: SizeId[] = ["petite", "normal", "normal", "plump"];
    p.size = sizes[Math.floor(rand() * sizes.length)];
    setSize(p.ch, p.size);
  }

  /** כל אחד צובע את הבוטים אצלו — אותה תוצאה אצל כולם, בזכות ה־seed */
  private paintBotsIfNeeded() {
    const rs = this.rs;
    if (rs.ph !== "hide" && rs.ph !== "hunt") return;
    for (const p of this.players.values()) {
      if (!p.bot || p.chKind !== "hider" || !p.alive || p.dying > 0) continue;
      const key = `${rs.id}:${p.seed}:${p.tpos.x.toFixed(1)}:${p.tpos.z.toFixed(1)}:${p.pose}:${p.size}`;
      if (p.paintedKey === key) continue;
      if (p.pos.distanceTo(p.tpos) > 0.05) continue;
      p.paintedKey = key;
      p.ch.body.scale.set(1, 1, 1);
      applyPose(p.ch, p.pose);
      p.ch.root.position.copy(p.pos);
      p.ch.root.rotation.y = p.yaw;
      this.projectPaint(p);
      return; // אחד לפריים
    }
  }

  private projectPaint(p: Player) {
    const rand = mulberry(p.seed ^ 0x9e3779b9);
    const skill = [0.14, 0.08, 0.035][this.rs.s.difficulty] * (0.6 + rand() * 0.9);
    const lazy = rand() < [0.45, 0.25, 0.1][this.rs.s.difficulty];
    p.ch.root.updateMatrixWorld(true);
    const fwd = new THREE.Vector3(Math.sin(p.yaw), 0, Math.cos(p.yaw));
    const vantage = p.pos.clone().addScaledVector(fwd, 6);
    vantage.y = p.pose === "flat" || p.pos.y > 0.3 ? 3.2 : 1.6;
    const partAvg = new Map<PaintTex, THREE.Color[]>();
    const jobs: { ptex: PaintTex; uv: THREE.Vector2; color: THREE.Color }[] = [];
    const sum = new THREE.Color(0, 0, 0);
    let count = 0;
    for (const part of p.ch.parts) {
      if (!part.ptex) continue;
      partAvg.set(part.ptex, []);
      const pos = part.mesh.geometry.getAttribute("position");
      const uv = part.mesh.geometry.getAttribute("uv") as THREE.BufferAttribute;
      const step = Math.max(1, Math.floor(pos.count / 140));
      for (let i = 0; i < pos.count; i += step) {
        const wp = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(part.mesh.matrixWorld);
        const dir = wp.clone().sub(vantage).normalize();
        this.ray.set(wp.clone().addScaledVector(dir, 0.02), dir);
        this.ray.far = 50;
        const hit = this.ray.intersectObjects(this.world.surfaces, false)[0];
        const c = new THREE.Color("#888888");
        if (hit) this.world.surfaceColor(hit, c);
        c.offsetHSL((rand() - 0.5) * skill * 0.5, (rand() - 0.5) * skill, (rand() - 0.5) * skill);
        sum.add(c);
        count++;
        partAvg.get(part.ptex)!.push(c);
        jobs.push({ ptex: part.ptex, uv: new THREE.Vector2().fromBufferAttribute(uv, i), color: c });
      }
    }
    if (lazy && count) {
      const hex = `#${sum.multiplyScalar(1 / count).getHexString()}`;
      for (const part of p.ch.parts) if (part.ptex) fillPart(part.ptex, hex);
      return;
    }
    for (const [pt, cols] of partAvg) {
      if (!cols.length) continue;
      const a = new THREE.Color(0, 0, 0);
      for (const c of cols) a.add(c);
      fillPart(pt, `#${a.multiplyScalar(1 / cols.length).getHexString()}`);
    }
    for (const j of jobs) paintDot(j.ptex, j.uv, `#${j.color.getHexString()}`, 0.08);
  }

  private updateBot(p: Player, dt: number) {
    const rs = this.rs;
    const ai = p.ai ?? (p.ai = this.newAI());
    if (rs.ph === "lobby" || rs.ph === "results") {
      p.pose = "stand";
      this.botWalk(p, ai, dt, 2.2);
      return;
    }
    if (p.role !== "hunter" || p.hp <= 0 || rs.ph === "hide" || !p.alive) {
      p.moving = false;
      p.tpos.copy(p.pos);
      return;
    }
    // ---- צייד ממוחשב ----
    ai.stateT += dt;
    ai.shotCd -= dt;
    ai.percT -= dt;
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
      case "investigate": {
        speed = 4.2;
        if (!tgt || !tgt.alive) { ai.state = "patrol"; ai.path = []; break; }
        lookAt = tgt.pos;
        if (p.pos.distanceTo(tgt.pos) < 4.5 || !ai.path.length || ai.stateT > 12) { ai.state = "inspect"; ai.stateT = 0; ai.path = []; }
        break;
      }
      case "inspect": {
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
      }
      case "aim": {
        if (!tgt || !tgt.alive) { ai.state = "patrol"; break; }
        lookAt = tgt.pos;
        if (ai.stateT > 0.5) {
          ai.shotCd = 1.2;
          const eye = p.pos.clone().add(new THREE.Vector3(0, 1.6, 0));
          const aimAt = tgt.pos.clone().add(new THREE.Vector3(0, 0.7 * tgt.ch.root.scale.y, 0));
          const err = [0.09, 0.05, 0.025][rs.s.difficulty];
          const dir = aimAt.sub(eye).normalize().add(new THREE.Vector3((Math.random() - 0.5) * err, (Math.random() - 0.5) * err, (Math.random() - 0.5) * err)).normalize();
          const res = this.shoot(eye, dir, p, eye.clone().addScaledVector(dir, 0.8));
          this.afterShot(p, res);
          ai.state = "patrol";
          ai.path = [];
          if (!res.hitPlayer) ai.ignore.set(tgt.id, 4);
        }
        break;
      }
    }
    this.botFollow(p, ai, dt, speed, lookAt);
  }

  private botWalk(p: Player, ai: BotAI, dt: number, speed: number) {
    if (!ai.path.length && Math.random() < dt * 0.4) {
      ai.path = this.nav.find(p.pos.x, p.pos.z, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12) ?? [];
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

  /** כמה מהר הצייד הממוחשב מתחיל לחשוד: צבע מול רקע + צללית + תזוזה */
  private perceive(s: Player, h: Player) {
    const eye = s.pos.clone();
    eye.y += 1.75;
    const center = h.pos.clone();
    center.y += 0.8 * h.ch.root.scale.y;
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
      if (!hit || hit.object.userData.char !== h.ch) continue;
      visible++;
      const ptex = hit.object.userData.ptex as PaintTex | null;
      if (ptex && hit.uv) sampleTex(ptex, hit.uv, c1);
      else c1.copy((hit.object as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>).material.color);
      this.ray.set(hit.point.clone().addScaledVector(dir, 0.03), dir);
      this.ray.far = 60;
      const bg = this.ray.intersectObjects(others, false)[0];
      if (bg) {
        const bp = bg.object.userData.ptex as PaintTex | null;
        if (bg.object.userData.char && bp && bg.uv) sampleTex(bp, bg.uv, c2);
        else this.world.surfaceColor(bg, c2);
      } else c2.set("#b8e0e6");
      colorTerm += Math.max(0, colorDiff(c1, c2) - 0.07) * 3.2;
    }
    if (!visible) return 0;
    const frac = visible / K;
    colorTerm /= visible;
    const sil = POSE_SIL[h.pose] * SIZE_SIL[h.size];
    const prox = Math.max(0.35, Math.min(3, 6 / (dist + 1)));
    const mul = [0.7, 1, 1.35][this.rs.s.difficulty];
    let rate = frac * (colorTerm + sil) * prox * mul;
    if (h.moveT < 0.3) rate += 3 * prox * frac;
    return rate;
  }

  // ================= נקודות החמצה + שריקה =================

  /** זיקית שנמצאת מול צייד ולא נתפסת צוברת "נקודות החמצה" */
  private updatePoints(dt: number) {
    if (this.rs.ph !== "hunt") return;
    this.ptsT -= dt;
    if (this.ptsT > 0) return;
    this.ptsT = 0.5;
    const hunters = [...this.players.values()].filter((p) => p.role === "hunter" && p.alive && p.hp > 0);
    const check = (h: Player) => {
      if (h.role !== "hider" || !h.alive) return;
      const c = h.pos.clone().add(new THREE.Vector3(0, 0.8 * h.ch.root.scale.y, 0));
      for (const s of hunters) {
        const eye = s.pos.clone().add(new THREE.Vector3(0, 1.7, 0));
        const to = c.clone().sub(eye);
        const d = to.length();
        if (d > 26) continue;
        const yaw = s.local ? this.camYaw + Math.PI : s.bot ? s.camYaw : s.camYaw + Math.PI;
        const look = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
        if (look.dot(new THREE.Vector3(to.x, 0, to.z).normalize()) < Math.cos(0.9)) continue;
        this.ray.set(eye, to.normalize());
        this.ray.far = Math.max(0.1, d - 0.4);
        if (this.ray.intersectObjects(this.world.surfaces, false).length) continue;
        h.pts += 0.5 * (1 + 6 / (d + 2));
        return;
      }
    };
    check(this.me);
    if (this.isHost()) for (const p of this.players.values()) if (p.bot) check(p);
  }

  private updateWhistle(dt: number) {
    const rs = this.rs;
    if (rs.ph !== "hunt" || !rs.s.whistle) return;
    const iv = rs.s.whistle;
    if (this.me.role === "hider" && this.me.alive) {
      this.whistleT += dt;
      if (this.whistleT >= iv) { this.whistleT = 0; this.whistle(true); }
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

  whistle(forced = false) {
    const m = this.me;
    if (m.chKind !== "hider" || !m.alive) return;
    this.net.emit("whistle", { id: m.id });
    this.onWhistle({ id: m.id });
    if (forced) this.toast("שריקה כפויה! 🎵");
  }

  private onWhistle(d: { id: string }) {
    const p = d && this.players.get(String(d.id));
    if (!p || !p.alive || !p.ch.root.visible) return;
    const at = p.pos.clone().add(new THREE.Vector3(0, 2 * p.ch.root.scale.y, 0));
    this.fx.whistleSound(p.local ? undefined : at);
    this.fx.note(at);
  }

  // ================= סנכרון צבע =================

  private queuePaintOp(op: unknown) {
    if (this.net.kind !== "local") this.opsBuf.push(op);
  }

  private flushPaint(dt: number) {
    this.opsT -= dt;
    if (this.opsT <= 0 && this.opsBuf.length) {
      this.opsT = 0.12;
      while (this.opsBuf.length) this.net.emit("paint", { ops: this.opsBuf.splice(0, 80) });
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
    if (!p || p.chKind !== "hider" || !d || !Array.isArray(d.ops)) return;
    const pt = (i: unknown) => (Number.isInteger(i) ? p.ch.parts[i as number]?.ptex ?? null : null);
    const col = (c: unknown) => (typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c) ? c : null);
    for (const op of d.ops.slice(0, 200)) {
      if (!Array.isArray(op)) continue;
      if (op[0] === "d") {
        const t = pt(op[1]);
        const c = col(op[5]);
        if (t && c && [op[2], op[3], op[4]].every(Number.isFinite)) paintDot(t, new THREE.Vector2(op[2], op[3]), c, Math.min(0.3, op[4]));
      } else if (op[0] === "f") {
        const t = pt(op[1]);
        const c = col(op[2]);
        if (t && c) fillPart(t, c);
      } else if (op[0] === "c") resetPaint(p.ch);
    }
  }

  private onPaintReq() {
    if (this.me.chKind !== "hider") return;
    const now = performance.now();
    if (now - this.lastSnapReply < 5000) return;
    this.lastSnapReply = now;
    this.sendFullSnapshot();
  }

  /** שולח תמונה של כל חלקי הגוף, כדי שכולם יראו בדיוק את הצבע שלי */
  private sendFullSnapshot() {
    if (this.net.kind === "local" || this.me.chKind !== "hider") return;
    const sid = Math.floor(Math.random() * 1e9);
    this.sendQueue = this.sendQueue.filter(([t]) => t !== "psnap");
    this.me.ch.parts.forEach((part, pi) => {
      if (!part.ptex) return;
      const url = part.ptex.canvas.toDataURL("image/jpeg", 0.72);
      const CH = 2800;
      const n = Math.ceil(url.length / CH);
      for (let k = 0; k < n; k++) this.sendQueue.push(["psnap", { s: sid, pi, k, n, d: url.slice(k * CH, (k + 1) * CH) } satisfies SnapMsg]);
    });
  }

  private onSnap(d: SnapMsg, from: string) {
    const p = this.players.get(from);
    if (!p || p.chKind !== "hider" || !d || !Number.isInteger(d.pi) || !Number.isInteger(d.k) || !Number.isInteger(d.n) || d.n > 40 || d.k >= d.n || typeof d.d !== "string") return;
    const key = `${from}:${d.s}:${d.pi}`;
    let b = this.snapBuf.get(key);
    if (!b) {
      b = { n: d.n, parts: [] };
      this.snapBuf.set(key, b);
      if (this.snapBuf.size > 200) this.snapBuf.delete(this.snapBuf.keys().next().value!);
    }
    b.parts[d.k] = d.d;
    for (let i = 0; i < b.n; i++) if (b.parts[i] === undefined) return;
    this.snapBuf.delete(key);
    const url = b.parts.join("");
    if (!url.startsWith("data:image/jpeg;base64,")) return;
    const pt = p.ch.parts[d.pi]?.ptex;
    if (!pt) return;
    const img = new Image();
    img.onload = () => {
      pt.ctx.drawImage(img, 0, 0, pt.canvas.width, pt.canvas.height);
      pt.texture.needsUpdate = true;
    };
    img.src = url;
  }

  // ================= צביעה מקומית =================

  private saveUndo(pi: number) {
    if (pi < 0 || this.strokeSaved.has(pi)) return;
    this.strokeSaved.add(pi);
    const pt = this.me.ch.parts[pi]?.ptex;
    if (!pt) return;
    if (!this.curStroke.length) {
      this.undoStack.push(this.curStroke);
      if (this.undoStack.length > 30) this.undoStack.shift();
    }
    this.curStroke.push({ pi, data: pt.ctx.getImageData(0, 0, pt.canvas.width, pt.canvas.height) });
  }

  private endStroke() {
    this.strokeSaved.clear();
    this.curStroke = [];
  }

  undo() {
    this.endStroke();
    const last = this.undoStack.pop();
    if (!last) return;
    for (const u of last) {
      const pt = this.me.ch.parts[u.pi]?.ptex;
      if (!pt) continue;
      pt.ctx.putImageData(u.data, 0, 0);
      pt.texture.needsUpdate = true;
    }
    this.sendFullSnapshot();
    this.emit();
  }

  clearPaint() {
    this.endStroke();
    this.me.ch.parts.forEach((_, i) => this.saveUndo(i));
    this.endStroke();
    resetPaint(this.me.ch);
    this.queuePaintOp(["c"]);
    this.emit();
  }

  private paintAt(mesh: THREE.Mesh, uv: THREE.Vector2, prev: THREE.Vector2 | null, prevMesh: THREE.Mesh | null) {
    const pi = this.me.ch.meshes.indexOf(mesh);
    const pt = mesh.userData.ptex as PaintTex | null;
    if (pi < 0 || !pt) return;
    this.saveUndo(pi);
    const r = this.hud.brush / 2;
    if (prev && prevMesh === mesh) {
      paintLine(pt, prev, uv, this.hud.color, r);
      const steps = Math.max(1, Math.ceil(prev.distanceTo(uv) / (r * 0.8)));
      if (prev.distanceTo(uv) <= 0.35)
        for (let i = 1; i <= steps; i++) {
          const q = new THREE.Vector2().lerpVectors(prev, uv, i / steps);
          this.queuePaintOp(["d", pi, r3(q.x), r3(q.y), r3(r), this.hud.color]);
        }
      else this.queuePaintOp(["d", pi, r3(uv.x), r3(uv.y), r3(r), this.hud.color]);
    } else {
      paintDot(pt, uv, this.hud.color, r);
      this.queuePaintOp(["d", pi, r3(uv.x), r3(uv.y), r3(r), this.hud.color]);
    }
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
      this.keys.add(e.code);
      const hider = this.me.chKind === "hider" && this.me.alive;
      if (e.code === "Space") {
        e.preventDefault();
        if (this.hud.paintMode) this.setTool("picker");
        else if (this.spectating()) this.cycleSpectate();
        else this.wantJump = true;
      }
      if (e.code === "KeyF" && hider) this.togglePaint();
      if (e.code === "KeyR" && hider) this.onPoseMenu?.();
      if (e.code === "Digit1") this.whistle();
      if (e.code === "KeyB" && this.hud.paintMode) this.setTool("brush");
      if (e.code === "KeyG" && this.hud.paintMode) this.setTool("fill");
      if (e.code === "KeyZ" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this.undo(); }
      else if (e.code === "KeyZ") this.rotateBody(-1);
      if (e.code === "KeyC") this.rotateBody(1);
      if ((e.code === "ControlLeft" || e.code === "ControlRight") && hider && !this.hud.paintMode) this.setPose(this.me.pose === "crouch" ? "stand" : "crouch");
    });
    this.listen(window, "keyup", (e: KeyboardEvent) => this.keys.delete(e.code));
    this.listen(window, "blur", () => this.keys.clear());
    this.listen(document, "pointerlockchange", () => {
      this.pointerLocked = document.pointerLockElement === cv;
      this.emit();
    });
    this.listen(cv, "contextmenu", (e: Event) => e.preventDefault());
    this.listen(cv, "wheel", (e: WheelEvent) => {
      e.preventDefault();
      this.camDist = Math.max(2, Math.min(12, this.camDist + e.deltaY * 0.005));
    });
    this.listen(cv, "mousemove", (e: MouseEvent) => {
      if (!this.pointerLocked) return;
      this.camYaw -= e.movementX * 0.0028;
      this.camPitch = Math.max(-0.6, Math.min(1.3, this.camPitch + e.movementY * 0.0024));
    });
    this.listen(cv, "pointerdown", (e: PointerEvent) => {
      cv.focus();
      if (this.pointerLocked) {
        if (e.button === 0) this.fire();
        return;
      }
      try { cv.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      let mode: "cam" | "paint" | "size" = "cam";
      let uv: THREE.Vector2 | null = null;
      let mesh: THREE.Mesh | null = null;
      if (this.hud.paintMode) {
        if (e.button === 2) mode = "size";
        else if (e.button === 0 && this.hud.tool === "brush") {
          const hit = this.pickOwnBody(e.clientX, e.clientY);
          if (hit) {
            mode = "paint";
            uv = hit.uv!.clone();
            mesh = hit.object as THREE.Mesh;
            this.paintAt(mesh, uv, null, null);
          }
        }
      }
      this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), mode, uv, mesh };
    });
    this.listen(cv, "pointermove", (e: PointerEvent) => {
      const p = this.drag;
      if (!p || p.id !== e.pointerId) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      if (p.mode === "paint") {
        const hit = this.pickOwnBody(e.clientX, e.clientY);
        if (hit && hit.uv) {
          const mesh = hit.object as THREE.Mesh;
          this.paintAt(mesh, hit.uv, p.uv, p.mesh);
          p.uv = hit.uv.clone();
          p.mesh = mesh;
        } else { p.uv = null; p.mesh = null; }
        return;
      }
      if (p.mode === "size") {
        this.hud.brush = Math.max(0.02, Math.min(0.4, this.hud.brush + dx * 0.002));
        return;
      }
      this.lookDelta(dx, dy);
    });
    const up = (e: PointerEvent) => {
      const p = this.drag;
      if (!p || p.id !== e.pointerId) return;
      this.drag = null;
      if (p.mode === "paint") this.endStroke();
      const moved = Math.hypot(e.clientX - p.sx, e.clientY - p.sy);
      if (p.mode === "cam" && moved < 8 && performance.now() - p.t < 400) this.tap(e.clientX, e.clientY, e.pointerType);
    };
    this.listen(cv, "pointerup", up);
    this.listen(cv, "pointercancel", up);
  }

  private ndc(x: number, y: number) {
    const r = this.renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
  }

  private pickOwnBody(x: number, y: number) {
    if (this.me.chKind !== "hider") return null;
    this.ray.setFromCamera(this.ndc(x, y), this.camera);
    this.ray.far = 50;
    const hit = this.ray.intersectObjects([...this.world.surfaces, ...this.me.ch.meshes], false)[0];
    if (hit && hit.object.userData.char === this.me.ch && hit.uv) return hit;
    return null;
  }

  private tap(x: number, y: number, pointerType: string) {
    const h = this.hud;
    if (h.paintMode) {
      this.ray.setFromCamera(this.ndc(x, y), this.camera);
      this.ray.far = 80;
      const hit = this.ray.intersectObjects([...this.world.surfaces, ...this.me.ch.meshes], false)[0];
      if (!hit) return;
      const isMe = hit.object.userData.char === this.me.ch;
      if (h.tool === "picker") {
        const c = new THREE.Color();
        const pt = hit.object.userData.ptex as PaintTex | null;
        if (isMe && pt && hit.uv) sampleTex(pt, hit.uv, c);
        else this.world.surfaceColor(hit, c);
        h.color = `#${c.getHexString()}`;
        h.tool = "brush";
        this.addRecent(h.color);
        if (!this.opts.muted) sfxClick();
        this.toast("הצבע נדגם 💧");
        this.emit();
      } else if (h.tool === "fill" && isMe) {
        const mesh = hit.object as THREE.Mesh;
        const pi = this.me.ch.meshes.indexOf(mesh);
        this.saveUndo(pi);
        this.endStroke();
        fillPart(mesh.userData.ptex as PaintTex, h.color);
        this.queuePaintOp(["f", pi, h.color]);
        if (!this.opts.muted) sfxClick();
        this.emit();
      }
      return;
    }
    if (this.spectating()) { this.cycleSpectate(); return; }
    // במחשב: לחיצה נועלת את העכבר למבט חופשי (Esc משחרר). בטלפון יש כפתור ירי.
    if (pointerType === "mouse" && !this.pointerLocked) {
      try {
        const r = this.renderer.domElement.requestPointerLock() as unknown as Promise<void> | undefined;
        r?.catch?.(() => {});
      } catch { /* לא נתמך */ }
    }
  }

  private addRecent(c: string) {
    this.recent = [c, ...this.recent.filter((x) => x !== c)].slice(0, 8);
  }
  recentColors() {
    return this.recent;
  }

  cycleSpectate() {
    const alive = [...this.players.values()].filter((p) => p.alive && !p.local && p.role !== "spectator" && p.ch.root.visible);
    if (!alive.length) { this.specTarget = null; return; }
    const i = alive.findIndex((p) => p.id === this.specTarget);
    const next = i + 1 >= alive.length ? null : alive[i + 1];
    this.specTarget = next?.id ?? null;
    this.toast(next ? `צופה ב־${next.name}` : "מצלמה חופשית (WASD, Q/E)");
    this.emit();
  }

  // ================= API ל־React =================

  setJoystick(x: number, y: number) { this.joy.x = x; this.joy.y = y; }
  jump() { this.wantJump = true; }
  lookDelta(dx: number, dy: number) {
    this.camYaw -= dx * 0.006;
    this.camPitch = Math.max(-0.6, Math.min(1.3, this.camPitch + dy * 0.005));
  }
  togglePaint() {
    const m = this.me;
    if (m.chKind !== "hider" || !m.alive || this.rs.ph === "results") return;
    this.hud.paintMode = !this.hud.paintMode;
    if (this.hud.paintMode) this.unlockPointer();
    if (!this.opts.muted) sfxClick();
    this.emit();
  }
  setTool(t: Tool) {
    if (!this.hud.paintMode) this.togglePaint();
    if (!this.hud.paintMode) return;
    this.hud.tool = t;
    this.emit();
  }
  setColor(c: string) {
    if (!/^#[0-9a-f]{6}$/i.test(c)) return;
    this.hud.color = c;
    this.addRecent(c);
    this.emit();
  }
  setBrush(b: number) { this.hud.brush = b; this.emit(); }
  setMetal(v: number) { this.me.metal = v; setSurface(this.me.ch, this.me.metal, this.me.rough); this.emit(); }
  setRough(v: number) { this.me.rough = v; setSurface(this.me.ch, this.me.metal, this.me.rough); this.emit(); }
  setPose(p: PoseId) {
    const m = this.me;
    if (m.chKind !== "hider" || !m.alive) return;
    if (m.pose !== p) m.moveT = 0;
    m.pose = p;
    if (!this.opts.muted) sfxClick();
    this.publishSelf(true);
    this.emit();
  }
  rotateBody(dir: number) {
    const m = this.me;
    if (m.chKind !== "hider" || !m.alive) return;
    m.yaw += (dir * Math.PI) / 12;
    m.moveT = 0;
    this.publishSelf(true);
  }
  setMySize(s: SizeId) {
    const m = this.me;
    if (this.rs.ph === "hunt" && m.role === "hider") { this.toast("אי אפשר לשנות גודל בזמן הציד"); this.emit(); return; }
    m.size = s;
    if (m.chKind === "hider") setSize(m.ch, s);
    this.publishSelf(true);
    this.emit();
  }
  setPref(p: "any" | "hider" | "hunter") { this.hud.pref = p; this.me.pref = p; this.publishSelf(true); this.emit(); }
  setMuted(m: boolean) {
    this.opts.muted = m;
    this.fx.muted = m;
    if (m) stopMusic();
    else if (this.rs.ph === "hunt") startMusic();
  }
  unlockPointer() {
    if (this.pointerLocked) document.exitPointerLock();
  }

  private toast(text: string) { this.hud.toast = { text, id: ++this.toastId }; }

  private emit() {
    const rs = this.rs;
    const m = this.me;
    const h = this.hud;
    h.isHost = this.isHost();
    h.connected = this.net.connected();
    h.phase = rs.ph;
    h.roundId = rs.id;
    h.settings = { ...rs.s };
    h.time = rs.ph === "lobby" ? 0 : Math.max(0, Math.ceil((this.localEnd - performance.now()) / 1000));
    h.myRole = rs.ph === "lobby" ? "hider" : m.role;
    h.alive = m.alive;
    h.hp = m.hp;
    h.ammo = m.ammo;
    h.pts = Math.floor(m.pts);
    h.metal = m.metal;
    h.rough = m.rough;
    h.pose = m.pose;
    h.size = m.size;
    h.frozen = m.moveT > 1 && m.chKind === "hider";
    h.room = this.world.roomAt(m.pos.x, m.pos.z);
    h.locked = this.pointerLocked;
    h.spectating = this.spectating() ? (this.specTarget ? this.players.get(this.specTarget)?.name ?? "מצלמה חופשית" : "מצלמה חופשית") : null;
    h.canUndo = this.undoStack.length > 0;
    h.players = [...this.players.values()].map((p) => ({
      id: p.id, name: p.name, color: p.color, role: rs.ph === "lobby" ? "hider" : p.role, alive: p.alive, bot: p.bot, me: p.local,
      host: p.id === this.hostId || (p.local && this.isHost()), pts: Math.floor(p.pts), hp: p.hp, pref: p.pref,
    }));
    h.hidersLeft = h.players.filter((p) => p.role === "hider" && p.alive).length;
    h.huntersLeft = h.players.filter((p) => p.role === "hunter" && p.alive && p.hp > 0).length;
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
    this.unlockPointer();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((x) => { (x as THREE.MeshStandardMaterial).map?.dispose(); x.dispose(); });
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.net.close();
  }
}
