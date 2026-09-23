// המנוע של המשחק: לולאת משחק, שליטה, צביעה, תנוחות, בינה של שומרים ומתחבאים.
import * as THREE from "three";
import { buildWorld, type World } from "./world";
import { buildNav, type Nav } from "./nav";
import {
  buildCharacter, applyPose, setSize, paintDot, paintLine, fillPart, resetPaint,
  type Character, type PoseId, type SizeId,
} from "./character";
import { sampleTex, labelTexture, type PaintTex } from "./textures";
import { playTone, sfxCorrect, sfxWrong, sfxWin, sfxTick, sfxClick, startMusic, stopMusic } from "@/lib/sound";

export type Mode = "hide" | "seek";
export type Phase = "prep" | "hunt" | "end";
export type Tool = "brush" | "fill" | "picker";
export type Difficulty = 0 | 1 | 2;

export interface HudState {
  mode: Mode;
  phase: Phase;
  time: number;
  hidersLeft: number;
  hidersTotal: number;
  paintMode: boolean;
  tool: Tool;
  color: string;
  brush: number;
  pose: PoseId;
  size: SizeId;
  suspicion: number; // 0..1 — כמה השומרים חושדים בך
  frozen: boolean;
  seekerView: boolean;
  result: { win: boolean; title: string; msg: string } | null;
  toast: { text: string; id: number } | null;
}

export interface EngineOptions {
  mode: Mode;
  size: SizeId;
  difficulty: Difficulty;
  muted: boolean;
  onHud: (h: HudState) => void;
}

const PREP_TIME = { hide: 60, seek: 8 };
const HUNT_TIME = { hide: 120, seek: 150 };
const PLAYER_SPEED = 5;
const GRAVITY = 20;
const INVESTIGATE_AT = 1;
const BONK_AT = 2.2;
const POSE_SILHOUETTE: Record<PoseId, number> = { stand: 0.26, crouch: 0.15, ball: 0.1, flat: 0.06, pillar: 0.2, star: 0.2 };
const SIZE_SIL: Record<SizeId, number> = { petite: 0.65, normal: 1, plump: 1.35 };

interface Agent {
  ch: Character;
  pos: THREE.Vector3;
  vy: number;
  yaw: number;
  moveT: number; // שניות מאז תזוזה אחרונה
  caught: boolean;
  caughtT: number;
  radius: number;
}

interface Hider extends Agent {
  isPlayer: boolean;
  samples: { mesh: THREE.Mesh; local: THREE.Vector3 }[];
  ping: number; // רמז בצבע (מצב חיפוש)
}

type SeekerState = "wait" | "patrol" | "investigate" | "inspect" | "bonk";

interface Seeker extends Agent {
  state: SeekerState;
  stateT: number;
  path: [number, number][];
  target: Hider | null;
  targetPos: THREE.Vector3;
  sus: Map<Hider, number>;
  ignore: Map<Hider, number>;
  headYaw: number;
  lookPhase: number;
  percT: number;
  icon: THREE.Sprite;
  swing: number; // 0..1 אנימציית פטיש
  enterDelay: number;
}

const tmpV = new THREE.Vector3();
const tmpV2 = new THREE.Vector3();
const tmpC = new THREE.Color();
const tmpC2 = new THREE.Color();

function colorDiff(a: THREE.Color, b: THREE.Color) {
  const ar = a.clone().convertLinearToSRGB();
  const br = b.clone().convertLinearToSRGB();
  const dr = ar.r - br.r;
  const dg = ar.g - br.g;
  const db = ar.b - br.b;
  return Math.sqrt((2 * dr * dr + 4 * dg * dg + 3 * db * db) / 9);
}

export class Engine {
  private container: HTMLElement;
  private opts: EngineOptions;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private world: World;
  private nav: Nav;
  private raycaster = new THREE.Raycaster();
  private raf = 0;
  private last = 0;
  private disposed = false;

  private player: Hider | Seeker;
  private hiders: Hider[] = [];
  private seekers: Seeker[] = [];
  private occluders: THREE.Object3D[] = [];
  private paintJobs: (() => void)[] = [];
  private effects: { obj: THREE.Object3D; t: number; life: number; update: (k: number) => void }[] = [];

  // מצלמה ושליטה
  private camYaw = Math.PI;
  private camPitch = 0.35;
  private camDist = 5.5;
  private keys = new Set<string>();
  private joy = { x: 0, y: 0 };
  private wantJump = false;
  private pointers = new Map<number, { x: number; y: number; sx: number; sy: number; t: number; mode: "cam" | "paint"; uv: THREE.Vector2 | null; mesh: THREE.Mesh | null }>();
  private pinchDist = 0;

  private hud: HudState;
  private hudT = 0;
  private toastId = 0;
  private bonkCooldown = 0;
  private seekerCam = new THREE.Vector3();

  constructor(container: HTMLElement, opts: EngineOptions) {
    this.container = container;
    this.opts = opts;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    const cv = this.renderer.domElement;
    cv.style.cssText = "width:100%;height:100%;display:block;touch-action:none;outline:none";
    cv.tabIndex = 0;
    container.appendChild(cv);

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
    this.scene.background = new THREE.Color("#a8dadc");
    this.scene.fog = new THREE.Fog("#a8dadc", 40, 90);

    // תאורה
    this.scene.add(new THREE.HemisphereLight("#ffffff", "#b08968", 1.3));
    const sun = new THREE.DirectionalLight("#fff4e0", 1.9);
    sun.position.set(-10, 26, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -20; sc.right = 20; sc.top = 16; sc.bottom = -16; sc.near = 1; sc.far = 60;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.03;
    this.scene.add(sun);

    this.world = buildWorld();
    this.scene.add(this.world.group);
    this.nav = buildNav(this.world);

    const diff = opts.difficulty;
    if (opts.mode === "hide") {
      const p = this.makeHider(true);
      setSize(p.ch, opts.size);
      p.pos.copy(this.world.hiderSpawn);
      this.player = p;
      const mates = [1, 2, 3][diff];
      for (let i = 0; i < mates; i++) this.makeHider(false);
      const nSeek = [2, 3, 4][diff];
      for (let i = 0; i < nSeek; i++) this.makeSeeker(i);
    } else {
      const s = this.makeSeeker(0, true);
      this.player = s;
      s.pos.set(-13.5, 0, 0);
      s.yaw = Math.PI / 2;
      const nHide = [4, 6, 8][diff];
      for (let i = 0; i < nHide; i++) this.makeHider(false);
      this.camYaw = -Math.PI / 2;
    }
    this.rebuildOccluders();
    // המתחבאים הממוחשבים בוחרים מקום וצובעים את עצמם
    const taken: THREE.Vector3[] = [];
    for (const h of this.hiders) if (!h.isPlayer) this.aiHide(h, taken);

    this.hud = {
      mode: opts.mode, phase: "prep", time: PREP_TIME[opts.mode],
      hidersLeft: this.hiders.length, hidersTotal: this.hiders.length,
      paintMode: false, tool: "brush", color: "#e63946", brush: 0.06,
      pose: "stand", size: opts.size, suspicion: 0, frozen: false, seekerView: false,
      result: null, toast: null,
    };
    if (opts.mode === "seek") this.toast("הזיקיות מתחבאות... עיניים סגורות! 🙈");
    else this.toast("יש לך דקה: תמצא מקום, תצבע את עצמך (F) ותבחר תנוחה (1-6)");

    this.bindInput();
    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }
  private ro: ResizeObserver;

  // ============ יצירת דמויות ============

  private makeHider(isPlayer: boolean): Hider {
    const ch = buildCharacter();
    this.scene.add(ch.root);
    const samples: Hider["samples"] = [];
    for (const m of ch.meshes) {
      const pos = m.geometry.getAttribute("position");
      const n = Math.max(3, Math.round(pos.count / 40));
      for (let k = 0; k < n; k++) {
        const i = Math.floor(Math.random() * pos.count);
        samples.push({ mesh: m, local: new THREE.Vector3().fromBufferAttribute(pos, i).multiplyScalar(0.97) });
      }
    }
    const h: Hider = {
      ch, pos: new THREE.Vector3(), vy: 0, yaw: 0, moveT: 99, caught: false, caughtT: 0, radius: 0.4,
      isPlayer, samples, ping: 0,
    };
    this.hiders.push(h);
    return h;
  }

  private makeSeeker(i: number, isPlayer = false): Seeker {
    const ch = buildCharacter({ seeker: true });
    this.scene.add(ch.root);
    const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture("?", "#ffd60a"), depthTest: false }));
    icon.scale.set(0.8, 0.8, 0.8);
    icon.position.y = 2.6;
    icon.visible = false;
    icon.renderOrder = 10;
    ch.root.add(icon);
    const s: Seeker = {
      ch, pos: this.world.seekerDoor.clone().add(new THREE.Vector3(0, 0, (i - 1) * 1.2)),
      vy: 0, yaw: Math.PI / 2, moveT: 99, caught: false, caughtT: 0, radius: 0.45,
      state: "wait", stateT: 0, path: [], target: null, targetPos: new THREE.Vector3(),
      sus: new Map(), ignore: new Map(), headYaw: 0, lookPhase: Math.random() * 6, percT: Math.random() * 0.2,
      icon, swing: 0, enterDelay: i * 1.2,
    };
    if (!isPlayer) {
      ch.root.visible = false; // בזמן ההכנה השומרים נעולים בחדר
      this.seekers.push(s);
    }
    return s;
  }

  private rebuildOccluders() {
    this.occluders = [...this.world.surfaces];
    for (const h of this.hiders) if (!h.caught) this.occluders.push(...h.ch.meshes);
  }

  // ============ בינה של מתחבאים ============

  private aiHide(h: Hider, taken: THREE.Vector3[]) {
    const nav = this.nav;
    const door = this.world.seekerDoor;
    let best: { x: number; z: number; y: number; onTop: boolean } | null = null;
    for (let k = 0; k < 400 && !best; k++) {
      let x: number, z: number, y = 0, onTop = false;
      if (Math.random() < 0.25) {
        const tops = this.world.obstacles.filter((o) => o.standable && o.top < 1.3 && o.maxX - o.minX > 0.8 && o.maxZ - o.minZ > 0.8);
        const o = tops[Math.floor(Math.random() * tops.length)];
        x = o.minX + 0.4 + Math.random() * Math.max(0, o.maxX - o.minX - 0.8);
        z = o.minZ + 0.4 + Math.random() * Math.max(0, o.maxZ - o.minZ - 0.8);
        y = this.world.groundAt(x, z, 5, 0.3);
        onTop = true;
      } else {
        const c = Math.floor(Math.random() * nav.cols);
        const r = Math.floor(Math.random() * nav.rows);
        const i = r * nav.cols + c;
        if (!nav.near[i] || nav.blocked[i]) continue;
        [x, z] = nav.center(c, r);
      }
      if (Math.hypot(x - door.x, z - door.z) < 6) continue;
      if (taken.some((t) => Math.hypot(t.x - x, t.z - z) < 3)) continue;
      best = { x, z, y, onTop };
    }
    if (!best) return;
    h.pos.set(best.x, best.y, best.z);
    taken.push(h.pos.clone());

    // הגב לכיוון הקיר/הרהיט הקרוב
    let nearest = Infinity;
    let away = new THREE.Vector2(0, 1);
    for (const o of this.world.obstacles) {
      if (o.top < 0.5) continue;
      const cx = Math.max(o.minX, Math.min(best.x, o.maxX));
      const cz = Math.max(o.minZ, Math.min(best.z, o.maxZ));
      const d = Math.hypot(best.x - cx, best.z - cz);
      if (d < nearest && d > 0.001) {
        nearest = d;
        away = new THREE.Vector2(best.x - cx, best.z - cz).normalize();
      }
    }
    h.yaw = Math.atan2(away.x, away.y);
    const r = Math.random();
    let pose: PoseId;
    if (best.onTop) pose = r < 0.6 ? "flat" : "ball";
    else if (nearest < 1) pose = (["pillar", "star", "stand", "crouch", "ball"] as PoseId[])[Math.floor(r * 5)];
    else pose = r < 0.5 ? "ball" : r < 0.8 ? "crouch" : "flat";
    if (pose === "flat") h.yaw = Math.random() * Math.PI * 2;
    const sizes: SizeId[] = ["petite", "normal", "normal", "plump"];
    setSize(h.ch, sizes[Math.floor(Math.random() * sizes.length)]);
    applyPose(h.ch, pose);
    this.placeAgent(h);

    // צביעה בהקרנה: צובעים כל נקודה בגוף בצבע של מה שנמצא מאחוריה, ממבט של שומר טיפוסי
    const skill = [0.14, 0.08, 0.035][this.opts.difficulty] * (0.6 + Math.random() * 0.9);
    const lazy = Math.random() < [0.45, 0.25, 0.1][this.opts.difficulty];
    this.paintJobs.push(() => this.projectPaint(h, skill, lazy));
  }

  private projectPaint(h: Hider, skill: number, lazy: boolean) {
    h.ch.root.updateMatrixWorld(true);
    const fwd = new THREE.Vector3(Math.sin(h.yaw), 0, Math.cos(h.yaw));
    const vantage = h.pos.clone().addScaledVector(fwd, 6);
    vantage.y = h.ch.pose === "flat" || h.pos.y > 0.3 ? 3.2 : 1.6;
    const others = this.world.surfaces as THREE.Object3D[];
    const sum = new THREE.Color(0, 0, 0);
    let count = 0;
    const jobs: { ptex: PaintTex; uv: THREE.Vector2; color: THREE.Color }[] = [];
    const partAvg = new Map<PaintTex, THREE.Color[]>();
    for (const part of h.ch.parts) {
      if (!part.ptex) continue;
      partAvg.set(part.ptex, []);
      const pos = part.mesh.geometry.getAttribute("position");
      const uv = part.mesh.geometry.getAttribute("uv");
      const step = Math.max(1, Math.floor(pos.count / 160));
      for (let i = 0; i < pos.count; i += step) {
        const wp = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(part.mesh.matrixWorld);
        const dir = wp.clone().sub(vantage).normalize();
        this.raycaster.set(wp.clone().addScaledVector(dir, 0.02), dir);
        this.raycaster.far = 40;
        const hit = this.raycaster.intersectObjects(others, false)[0];
        const c = new THREE.Color("#888888");
        if (hit) this.world.surfaceColor(hit, c);
        c.offsetHSL((Math.random() - 0.5) * skill * 0.5, (Math.random() - 0.5) * skill, (Math.random() - 0.5) * skill);
        sum.add(c);
        count++;
        partAvg.get(part.ptex)!.push(c);
        jobs.push({ ptex: part.ptex, uv: new THREE.Vector2().fromBufferAttribute(uv as THREE.BufferAttribute, i), color: c });
      }
    }
    if (lazy && count) {
      const avg = sum.multiplyScalar(1 / count);
      const hex = `#${avg.getHexString()}`;
      for (const part of h.ch.parts) if (part.ptex) fillPart(part.ptex, hex);
      return;
    }
    // קודם ממלאים כל חלק בצבע הממוצע שלו (כדי שלא יישארו פסים לבנים), ואז מציירים נקודות מדויקות
    for (const [pt, cols] of partAvg) {
      if (!cols.length) continue;
      const a = new THREE.Color(0, 0, 0);
      for (const c of cols) a.add(c);
      fillPart(pt, `#${a.multiplyScalar(1 / cols.length).getHexString()}`);
    }
    for (const j of jobs) paintDot(j.ptex, j.uv, `#${j.color.getHexString()}`, 0.08);
  }

  // ============ פיזיקה ============

  private placeAgent(a: Agent) {
    const s = a.ch.root.scale;
    a.ch.root.position.copy(a.pos);
    a.ch.root.rotation.y = a.yaw;
    a.radius = 0.4 * Math.max(s.x, s.z);
  }

  private moveAgent(a: Agent, dx: number, dz: number, dt: number) {
    const w = this.world;
    const height = 1.7 * a.ch.root.scale.y;
    a.pos.x += dx;
    a.pos.z += dz;
    const r = a.radius;
    for (const o of w.obstacles) {
      if (o.top <= a.pos.y + 0.45 || o.bottom >= a.pos.y + height) continue;
      const cx = Math.max(o.minX, Math.min(a.pos.x, o.maxX));
      const cz = Math.max(o.minZ, Math.min(a.pos.z, o.maxZ));
      const ddx = a.pos.x - cx;
      const ddz = a.pos.z - cz;
      const d2 = ddx * ddx + ddz * ddz;
      if (d2 < r * r) {
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          a.pos.x = cx + (ddx / d) * r;
          a.pos.z = cz + (ddz / d) * r;
        } else {
          // בתוך הקופסה — דוחפים לצד הקרוב
          const pushes = [o.minX - r - a.pos.x, o.maxX + r - a.pos.x, o.minZ - r - a.pos.z, o.maxZ + r - a.pos.z];
          const k = pushes.reduce((bi, v, i) => (Math.abs(v) < Math.abs(pushes[bi]) ? i : bi), 0);
          if (k < 2) a.pos.x += pushes[k];
          else a.pos.z += pushes[k];
        }
      }
    }
    a.pos.x = Math.max(w.bounds.minX + r, Math.min(w.bounds.maxX - r, a.pos.x));
    a.pos.z = Math.max(w.bounds.minZ + r, Math.min(w.bounds.maxZ - r, a.pos.z));
    // כבידה
    const ground = w.groundAt(a.pos.x, a.pos.z, a.pos.y, r);
    a.vy -= GRAVITY * dt;
    a.pos.y += a.vy * dt;
    if (a.pos.y <= ground) {
      a.pos.y = ground;
      a.vy = 0;
    }
  }

  private onGround(a: Agent) {
    return Math.abs(a.pos.y - this.world.groundAt(a.pos.x, a.pos.z, a.pos.y, a.radius)) < 0.02 && a.vy <= 0;
  }

  // ============ לולאה ============

  private frame = (now: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.frame);
    const real = Math.min(0.25, (now - this.last) / 1000);
    this.last = now;
    this.hud.time -= this.hud.phase === "end" ? 0 : real;
    this.update(Math.min(0.05, real), real);
    this.renderer.render(this.scene, this.camera);
  };

  private update(dt: number, real: number) {
    const h = this.hud;
    // עבודות צביעה — אחת לפריים כדי לא לתקוע
    const job = this.paintJobs.shift();
    if (job) job();

    if (h.phase !== "end") {
      if (h.phase === "hunt" && h.time <= 10 && Math.ceil(h.time) !== Math.ceil(h.time + real)) this.sfx(sfxTick);
      if (h.time <= 0) {
        if (h.phase === "prep") this.startHunt();
        else this.finish(this.opts.mode === "hide");
      }
    }

    this.updatePlayer(dt);
    if (h.phase === "hunt") for (const s of this.seekers) this.updateSeeker(s, dt);
    this.updateHiders(dt);
    this.updateEffects(dt);
    this.updateCamera(dt);

    if (this.opts.mode === "hide") {
      const p = this.player as Hider;
      let m = 0;
      for (const s of this.seekers) m = Math.max(m, s.sus.get(p) ?? 0);
      h.suspicion = Math.min(1, m / BONK_AT);
      h.frozen = p.moveT > 1;
    }
    this.hudT -= dt;
    if (this.hudT <= 0) {
      this.hudT = 0.1;
      this.emit();
    }
  }

  private emit() {
    this.hud.hidersLeft = this.hiders.filter((x) => !x.caught).length;
    this.opts.onHud({ ...this.hud, time: Math.max(0, this.hud.time) });
  }

  private toast(text: string) {
    this.hud.toast = { text, id: ++this.toastId };
  }

  private sfx(fn: () => void) {
    if (!this.opts.muted) fn();
  }

  private bonkSound() {
    if (this.opts.muted) return;
    playTone(180, 0.12, "square", 0.25);
    setTimeout(() => playTone(90, 0.18, "triangle", 0.25), 50);
  }

  private startHunt() {
    const h = this.hud;
    h.phase = "hunt";
    h.time = HUNT_TIME[this.opts.mode];
    h.seekerView = false;
    if (this.opts.mode === "hide") {
      for (const s of this.seekers) {
        s.ch.root.visible = true;
        s.state = "patrol";
        s.stateT = -s.enterDelay;
      }
      this.toast("השומרים יצאו! אל תזוז... 🤫");
      this.sfx(sfxWrong);
    } else {
      this.toast("צא לחפש! לחץ/י על זיקית כדי לתפוס אותה 🔨");
      this.sfx(sfxCorrect);
    }
    this.sfx(startMusic);
  }

  private finish(timeUp: boolean) {
    const h = this.hud;
    if (h.phase === "end") return;
    h.phase = "end";
    h.paintMode = false;
    stopMusic();
    const left = this.hiders.filter((x) => !x.caught).length;
    if (this.opts.mode === "hide") {
      const p = this.player as Hider;
      if (!p.caught && timeUp) {
        h.result = { win: true, title: "שרדת! 🦎", msg: `אף אחד לא מצא אותך. ${left - 1 > 1 ? `עוד ${left - 1} זיקיות שרדו איתך.` : left - 1 === 1 ? "עוד זיקית אחת שרדה איתך." : "היית הזיקית האחרונה!"}` };
        this.sfx(sfxWin);
      } else {
        h.result = { win: false, title: "נתפסת! 🔨", msg: "השומרים שמו לב אליך. נסה צבעים מדויקים יותר, תנוחה שמתאימה למקום — ואל תזוז!" };
        this.sfx(sfxWrong);
      }
    } else {
      if (left === 0) {
        h.result = { win: true, title: "מצאת את כולן! 🏆", msg: `תפסת ${h.hidersTotal} זיקיות עם ${Math.ceil(h.time)} שניות שנשארו.` };
        this.sfx(sfxWin);
      } else {
        h.result = { win: false, title: "נגמר הזמן ⏰", msg: `נשארו ${left} זיקיות מוסתרות — הן מסומנות עכשיו בחצים.` };
        for (const x of this.hiders) if (!x.caught) x.ping = 999;
        this.sfx(sfxWrong);
      }
    }
    this.emit();
  }

  // ============ שחקן ============

  private updatePlayer(dt: number) {
    const p = this.player;
    const h = this.hud;
    const locked = h.phase === "end" || (this.opts.mode === "seek" && h.phase === "prep") || h.paintMode || p.caught;
    let ix = 0;
    let iy = 0;
    if (!locked) {
      if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) iy += 1;
      if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) iy -= 1;
      if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) ix += 1;
      if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) ix -= 1;
      ix += this.joy.x;
      iy += this.joy.y;
    }
    const len = Math.hypot(ix, iy);
    if (len > 1) { ix /= len; iy /= len; }
    const fx = -Math.sin(this.camYaw);
    const fz = -Math.cos(this.camYaw);
    const dx = (fx * iy - fz * ix) * PLAYER_SPEED * dt;
    const dz = (fz * iy + fx * ix) * PLAYER_SPEED * dt;
    const moving = len > 0.1;
    if (this.wantJump && !locked && this.onGround(p)) {
      p.vy = 7.5;
      p.moveT = 0;
    }
    this.wantJump = false;
    const before = p.pos.clone();
    this.moveAgent(p, dx, dz, dt);
    const moved = before.distanceTo(p.pos) > 0.002;
    if (moving) {
      const target = Math.atan2(dx, dz);
      let d = target - p.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      p.yaw += d * Math.min(1, dt * 12);
    }
    if (moved) p.moveT = 0;
    else p.moveT += dt;
    if (moving && p.ch.pose !== "stand") {
      h.pose = "stand";
    }
    p.ch.walkPhase += moving ? dt * 11 : 0;
    if (!p.caught) {
      const pose = this.opts.mode === "hide" ? h.pose : "stand";
      applyPose(p.ch, pose, moving ? 1 : 0);
      if (this.opts.mode === "seek") this.animateHammer(p as Seeker, dt);
    }
    this.placeAgent(p);
  }

  private updateHiders(dt: number) {
    for (const x of this.hiders) {
      if (!x.isPlayer) {
        x.moveT += dt;
        this.placeAgent(x);
      }
      if (x.caught) {
        x.caughtT += dt;
        const k = Math.min(1, x.caughtT / 0.25);
        x.ch.body.scale.y = 1 - 0.75 * k;
        if (x.caughtT > 1.6 && x.ch.root.visible) {
          x.ch.root.visible = false;
          this.rebuildOccluders();
        }
      }
      if (x.ping > 0) {
        x.ping -= dt;
        this.pingMarker(x);
      }
    }
  }

  private pingMarker(h: Hider) {
    let m = h.ch.root.getObjectByName("ping") as THREE.Sprite | undefined;
    if (!m) {
      m = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture("▼", "#ff006e"), depthTest: false }));
      m.name = "ping";
      m.renderOrder = 11;
      m.scale.set(0.9, 0.9, 0.9);
      h.ch.root.add(m);
    }
    m.visible = h.ping > 0 && !h.caught;
    m.position.y = 2.6 + Math.sin(performance.now() / 150) * 0.2;
  }

  // ============ שומרים ============

  private updateSeeker(s: Seeker, dt: number) {
    s.stateT += dt;
    if (s.state === "patrol" && s.stateT < 0) {
      s.ch.root.visible = false;
      return;
    }
    s.ch.root.visible = true;

    // ראייה
    s.percT -= dt;
    if (s.percT <= 0) {
      s.percT = 0.2;
      this.scene.updateMatrixWorld();
      for (const h of this.hiders) {
        if (h.caught) continue;
        const ig = s.ignore.get(h) ?? 0;
        if (ig > 0) {
          s.ignore.set(h, ig - 0.2);
          s.sus.set(h, Math.min(s.sus.get(h) ?? 0, 0.3));
          continue;
        }
        const rate = this.perceive(s, h);
        const cur = s.sus.get(h) ?? 0;
        s.sus.set(h, Math.max(0, cur + (rate - 0.1) * 0.2));
      }
    }

    // מצבים
    let best: Hider | null = null;
    let bestSus = 0;
    for (const [h, v] of s.sus) if (!h.caught && v > bestSus) { best = h; bestSus = v; }

    let speed = 0;
    let lookAt: THREE.Vector3 | null = null;
    switch (s.state) {
      case "patrol": {
        speed = 3;
        if (best && bestSus >= INVESTIGATE_AT) {
          s.state = "investigate";
          s.target = best;
          s.targetPos.copy(best.pos);
          s.path = this.nav.find(s.pos.x, s.pos.z, best.pos.x, best.pos.z) ?? [];
          s.stateT = 0;
          if (best.isPlayer) this.sfx(() => playTone(660, 0.12, "square", 0.12));
          break;
        }
        if (!s.path.length) {
          const [x, z] = this.nav.randomFree();
          s.path = this.nav.find(s.pos.x, s.pos.z, x, z) ?? [];
        }
        break;
      }
      case "investigate": {
        speed = 4.4;
        const t = s.target!;
        if (!t || t.caught) { s.state = "patrol"; s.path = []; break; }
        const d = Math.hypot(t.pos.x - s.pos.x, t.pos.z - s.pos.z);
        lookAt = t.pos;
        if (d < 1.9 || !s.path.length || s.stateT > 12) {
          s.state = "inspect";
          s.stateT = 0;
          s.path = [];
        }
        break;
      }
      case "inspect": {
        const t = s.target!;
        if (!t || t.caught) { s.state = "patrol"; break; }
        lookAt = t.pos;
        const d = Math.hypot(t.pos.x - s.pos.x, t.pos.z - s.pos.z);
        if (d > 2.2 && d < 8 && s.stateT < 2.5) {
          // מתקרבים עוד קצת
          speed = 2.5;
          s.path = [[t.pos.x, t.pos.z]];
        } else s.path = [];
        if ((s.sus.get(t) ?? 0) >= BONK_AT && d < 2.4) {
          s.state = "bonk";
          s.stateT = 0;
          s.swing = 1;
        } else if (s.stateT > 3) {
          // לא משוכנע — ממשיך הלאה
          s.ignore.set(t, 5);
          s.sus.set(t, 0.3);
          s.state = "patrol";
          s.target = null;
          s.path = [];
        }
        break;
      }
      case "bonk": {
        const t = s.target;
        if (t) lookAt = t.pos;
        if (s.stateT > 0.18 && t && !t.caught) {
          const d = Math.hypot(t.pos.x - s.pos.x, t.pos.z - s.pos.z);
          if (d < 2.6) this.catchHider(t, s.pos);
          else s.sus.set(t, 0.5);
          s.target = null;
        }
        if (s.stateT > 0.8) {
          s.state = "patrol";
          s.path = [];
        }
        break;
      }
    }

    // תנועה לאורך המסלול
    let moving = false;
    if (speed > 0 && s.path.length) {
      const [nx, nz] = s.path[0];
      const ddx = nx - s.pos.x;
      const ddz = nz - s.pos.z;
      const d = Math.hypot(ddx, ddz);
      if (d < 0.35) s.path.shift();
      else {
        const k = Math.min(d, speed * dt) / d;
        const before = s.pos.clone();
        this.moveAgent(s, ddx * k, ddz * k, dt);
        if (before.distanceTo(s.pos) < speed * dt * 0.2) {
          s.moveT += dt; // נתקע
          if (s.moveT > 1) { s.path = []; s.moveT = 0; }
        } else s.moveT = 0;
        moving = true;
        if (!lookAt) {
          const target = Math.atan2(ddx, ddz);
          let dy = target - s.yaw;
          dy = Math.atan2(Math.sin(dy), Math.cos(dy));
          s.yaw += dy * Math.min(1, dt * 8);
        }
      }
    } else this.moveAgent(s, 0, 0, dt);
    if (lookAt) {
      const target = Math.atan2(lookAt.x - s.pos.x, lookAt.z - s.pos.z);
      let dy = target - s.yaw;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      s.yaw += dy * Math.min(1, dt * 8);
      s.headYaw *= 0.85;
    } else {
      s.lookPhase += dt * (moving ? 1.3 : 0.9);
      s.headYaw = Math.sin(s.lookPhase) * 0.85;
    }
    s.ch.walkPhase += moving ? dt * 10 : 0;
    applyPose(s.ch, "stand", moving ? 1 : 0);
    s.ch.head.rotation.y = s.headYaw;
    this.animateHammer(s, dt);

    // אייקון
    const sus = best ? bestSus : 0;
    if (s.state === "investigate" || s.state === "inspect" || s.state === "bonk") {
      s.icon.visible = true;
      (s.icon.material as THREE.SpriteMaterial).map = this.iconTex("!");
    } else if (sus > 0.45) {
      s.icon.visible = true;
      (s.icon.material as THREE.SpriteMaterial).map = this.iconTex("?");
    } else s.icon.visible = false;
    this.placeAgent(s);
  }

  private iconCache = new Map<string, THREE.Texture>();
  private iconTex(t: string) {
    let x = this.iconCache.get(t);
    if (!x) {
      x = labelTexture(t, t === "!" ? "#ff4d6d" : "#ffd60a");
      this.iconCache.set(t, x);
    }
    return x;
  }

  private animateHammer(s: Seeker, dt: number) {
    if (s.swing > 0) s.swing = Math.max(0, s.swing - dt * 2.2);
    const k = s.swing;
    // מרימים ואז מורידים מהר
    const a = k > 0.75 ? (1 - k) / 0.25 : k / 0.75;
    s.ch.armR.rotation.x = -0.4 - a * 2.4;
  }

  /** כמה מהר השומר מתחיל לחשוד: צבע מול רקע + צללית + תזוזה */
  private perceive(s: Seeker, h: Hider) {
    const eye = tmpV.copy(s.pos);
    eye.y += 1.75 * s.ch.root.scale.y;
    const center = tmpV2.copy(h.pos);
    center.y += 0.8 * h.ch.root.scale.y;
    const toH = center.clone().sub(eye);
    const dist = toH.length();
    if (dist > 22) return 0;
    const lookYaw = s.yaw + s.headYaw;
    const look = new THREE.Vector3(Math.sin(lookYaw), 0, Math.cos(lookYaw));
    const flat = new THREE.Vector3(toH.x, 0, toH.z).normalize();
    if (look.dot(flat) < Math.cos((58 * Math.PI) / 180) && dist > 1.5) return 0;

    const others = this.occluders.filter((o) => (o.userData.char as Character | undefined) !== h.ch);
    const K = 6;
    let visible = 0;
    let colorTerm = 0;
    for (let k = 0; k < K; k++) {
      const smp = h.samples[Math.floor(Math.random() * h.samples.length)];
      const wp = smp.local.clone().applyMatrix4(smp.mesh.matrixWorld);
      const dir = wp.clone().sub(eye);
      const dd = dir.length();
      dir.normalize();
      this.raycaster.set(eye, dir);
      this.raycaster.far = dd + 0.5;
      const hit = this.raycaster.intersectObjects(this.occluders, false)[0];
      if (!hit || (hit.object.userData.char as Character | undefined) !== h.ch) continue;
      visible++;
      const ptex = hit.object.userData.ptex as PaintTex | null;
      if (ptex && hit.uv) sampleTex(ptex, hit.uv, tmpC);
      else tmpC.copy((hit.object as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>).material.color);
      // מה רואים מאחורי הזיקית?
      this.raycaster.set(hit.point.clone().addScaledVector(dir, 0.03), dir);
      this.raycaster.far = 60;
      const bg = this.raycaster.intersectObjects(others, false)[0];
      if (bg) {
        const ch = bg.object.userData.char as Character | undefined;
        const bp = bg.object.userData.ptex as PaintTex | null;
        if (ch && bp && bg.uv) sampleTex(bp, bg.uv, tmpC2);
        else this.world.surfaceColor(bg, tmpC2);
      } else tmpC2.set("#a8dadc");
      colorTerm += Math.max(0, colorDiff(tmpC, tmpC2) - 0.07) * 3.2;
    }
    if (!visible) return 0;
    const frac = visible / K;
    colorTerm /= visible;
    const sil = POSE_SILHOUETTE[h.ch.pose] * SIZE_SIL[h.ch.size];
    const prox = Math.max(0.35, Math.min(3, 6 / (dist + 1)));
    const mul = [0.7, 1, 1.35][this.opts.difficulty];
    let rate = frac * (colorTerm + sil) * prox * mul;
    if (h.moveT < 0.3) rate += 3 * prox * frac; // תזוזה = נחשפת
    return rate;
  }

  private catchHider(h: Hider, from: THREE.Vector3) {
    if (h.caught) return;
    h.caught = true;
    h.caughtT = 0;
    this.bonkSound();
    this.stars(h.pos.clone().setY(h.pos.y + 1));
    for (const p of h.ch.parts) {
      const m = p.mesh.material as THREE.MeshStandardMaterial;
      m.emissive = new THREE.Color("#ff0033");
      m.emissiveIntensity = 0.6;
    }
    void from;
    const left = this.hiders.filter((x) => !x.caught).length;
    if (this.opts.mode === "hide") {
      if (h.isPlayer) {
        this.toast("בום! תפסו אותך 🔨");
        setTimeout(() => this.finish(false), 1400);
      } else {
        this.toast(`זיקית נתפסה! נשארו ${left}`);
        if (left === 0) setTimeout(() => this.finish(false), 1200);
      }
    } else {
      this.sfx(sfxCorrect);
      this.toast(left ? `תפסת! נשארו עוד ${left} 🦎` : "תפסת את כולן!");
      if (left === 0) setTimeout(() => this.finish(false), 1200);
    }
  }

  private stars(at: THREE.Vector3) {
    const g = new THREE.Group();
    g.position.copy(at);
    const mats = ["#ffd60a", "#ff006e", "#3a86ff", "#8ac926"].map((c) => new THREE.MeshBasicMaterial({ color: c }));
    const bits: { m: THREE.Mesh; v: THREE.Vector3 }[] = [];
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.09), mats[i % mats.length]);
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8 + 0.4, Math.random() - 0.5).multiplyScalar(6);
      g.add(m);
      bits.push({ m, v });
    }
    this.scene.add(g);
    this.effects.push({
      obj: g, t: 0, life: 0.9,
      update: (k) => {
        for (const b of bits) {
          b.m.position.addScaledVector(b.v, 0.016);
          b.v.y -= 0.3;
          b.m.rotation.x += 0.2;
          b.m.scale.setScalar(1 - k);
        }
      },
    });
  }

  private updateEffects(dt: number) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      e.t += dt;
      e.update(Math.min(1, e.t / e.life));
      if (e.t >= e.life) {
        this.scene.remove(e.obj);
        this.effects.splice(i, 1);
      }
    }
  }

  // ============ מצלמה ============

  private updateCamera(dt: number) {
    const p = this.player;
    const h = this.hud;
    const target = p.pos.clone();
    target.y += (h.paintMode ? 0.6 : 1.5) * p.ch.root.scale.y;
    if (this.opts.mode === "seek") {
      // מבט מעל הכתף כדי שהגוף של הצייד לא יסתיר את מה שבמרכז המסך
      target.x += Math.cos(this.camYaw) * 0.8;
      target.z -= Math.sin(this.camYaw) * 0.8;
      target.y += 0.35;
    }
    if (this.opts.mode === "hide" && h.seekerView) {
      // מבט מהדלת של השומרים — כדי לבדוק את ההסוואה
      this.seekerCam.set(this.world.seekerDoor.x + 1, 1.75, this.world.seekerDoor.z);
      this.camera.position.lerp(this.seekerCam, Math.min(1, dt * 6));
      this.camera.lookAt(target);
      this.camera.fov += (35 - this.camera.fov) * Math.min(1, dt * 6);
      this.camera.updateProjectionMatrix();
      return;
    }
    if (Math.abs(this.camera.fov - 60) > 0.1) {
      this.camera.fov += (60 - this.camera.fov) * Math.min(1, dt * 6);
      this.camera.updateProjectionMatrix();
    }
    const want = h.paintMode ? 4.2 * p.ch.root.scale.y : this.camDist;
    const dir = new THREE.Vector3(
      Math.sin(this.camYaw) * Math.cos(this.camPitch),
      Math.sin(this.camPitch),
      Math.cos(this.camYaw) * Math.cos(this.camPitch),
    );
    this.raycaster.set(target, dir);
    this.raycaster.far = want;
    const hit = this.raycaster.intersectObjects(this.world.surfaces, false)[0];
    const d = hit ? Math.max(0.6, hit.distance - 0.25) : want;
    const pos = target.clone().addScaledVector(dir, d);
    if (pos.y < 0.2) pos.y = 0.2;
    this.camera.position.lerp(pos, Math.min(1, dt * 14));
    this.camera.lookAt(target);
  }

  private resize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ============ קלט ============

  private listeners: [EventTarget, string, EventListener][] = [];
  private on<K extends keyof HTMLElementEventMap>(t: EventTarget, type: K | string, fn: (e: never) => void) {
    t.addEventListener(type, fn as EventListener, { passive: false });
    this.listeners.push([t, type, fn as EventListener]);
  }

  private bindInput() {
    const cv = this.renderer.domElement;
    this.on(window, "keydown", (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      this.keys.add(e.code);
      if (e.code === "Space") { this.wantJump = true; e.preventDefault(); }
      if (e.code === "KeyF") this.togglePaint();
      if (e.code === "KeyE") this.setTool("picker");
      if (e.code === "KeyB") this.setTool("brush");
      if (e.code === "KeyG") this.setTool("fill");
      if (e.code === "KeyV") this.toggleSeekerView();
      const n = Number(e.key);
      if (n >= 1 && n <= 6) {
        const ids: PoseId[] = ["stand", "crouch", "ball", "flat", "pillar", "star"];
        this.setPose(ids[n - 1]);
      }
    });
    this.on(window, "keyup", (e: KeyboardEvent) => this.keys.delete(e.code));
    this.on(window, "blur", () => this.keys.clear());
    this.on(cv, "contextmenu", (e: Event) => e.preventDefault());
    this.on(cv, "wheel", (e: WheelEvent) => {
      e.preventDefault();
      this.camDist = Math.max(2, Math.min(12, this.camDist + e.deltaY * 0.005));
    });
    this.on(cv, "pointerdown", (e: PointerEvent) => {
      cv.focus();
      cv.setPointerCapture(e.pointerId);
      let mode: "cam" | "paint" = "cam";
      let uv: THREE.Vector2 | null = null;
      let mesh: THREE.Mesh | null = null;
      if (this.hud.paintMode && this.hud.tool === "brush" && e.button === 0) {
        const hit = this.pickOwnBody(e.clientX, e.clientY);
        if (hit) {
          mode = "paint";
          uv = hit.uv!.clone();
          mesh = hit.object as THREE.Mesh;
          const pt = mesh.userData.ptex as PaintTex;
          paintDot(pt, uv, this.hud.color, this.hud.brush / 2);
          (this.player as Hider).moveT = Math.min((this.player as Hider).moveT, 0.5);
        }
      }
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), mode, uv, mesh });
      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        this.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      }
    });
    this.on(cv, "pointermove", (e: PointerEvent) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        this.camDist = Math.max(2, Math.min(12, this.camDist * (this.pinchDist / Math.max(1, d))));
        this.pinchDist = d;
        return;
      }
      if (p.mode === "paint") {
        const hit = this.pickOwnBody(e.clientX, e.clientY);
        if (hit && hit.uv) {
          const mesh = hit.object as THREE.Mesh;
          const pt = mesh.userData.ptex as PaintTex;
          if (mesh === p.mesh && p.uv) paintLine(pt, p.uv, hit.uv, this.hud.color, this.hud.brush / 2);
          else paintDot(pt, hit.uv, this.hud.color, this.hud.brush / 2);
          p.uv = hit.uv.clone();
          p.mesh = mesh;
        } else {
          p.uv = null;
          p.mesh = null;
        }
        return;
      }
      if (this.hud.seekerView) return;
      this.camYaw -= dx * 0.006;
      this.camPitch = Math.max(-0.35, Math.min(1.25, this.camPitch + dy * 0.005));
    });
    const up = (e: PointerEvent) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      this.pointers.delete(e.pointerId);
      const moved = Math.hypot(e.clientX - p.sx, e.clientY - p.sy);
      if (p.mode === "cam" && moved < 8 && performance.now() - p.t < 400) this.tap(e.clientX, e.clientY);
    };
    this.on(cv, "pointerup", up);
    this.on(cv, "pointercancel", up);
  }

  private ndc(x: number, y: number) {
    const r = this.renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
  }

  private pickOwnBody(x: number, y: number) {
    if (this.opts.mode !== "hide") return null;
    this.raycaster.setFromCamera(this.ndc(x, y), this.camera);
    this.raycaster.far = 50;
    const hit = this.raycaster.intersectObjects([...this.world.surfaces, ...this.player.ch.meshes], false)[0];
    if (hit && hit.object.userData.char === this.player.ch && hit.uv) return hit;
    return null;
  }

  private tap(x: number, y: number) {
    const h = this.hud;
    if (h.phase === "end") return;
    this.raycaster.setFromCamera(this.ndc(x, y), this.camera);
    this.raycaster.far = 80;
    if (this.opts.mode === "hide") {
      if (!h.paintMode) return;
      const hit = this.raycaster.intersectObjects([...this.world.surfaces, ...this.player.ch.meshes], false)[0];
      if (!hit) return;
      const isMe = hit.object.userData.char === this.player.ch;
      if (h.tool === "picker") {
        const c = new THREE.Color();
        const pt = hit.object.userData.ptex as PaintTex | null;
        if (isMe && pt && hit.uv) sampleTex(pt, hit.uv, c);
        else this.world.surfaceColor(hit, c);
        h.color = `#${c.getHexString()}`;
        h.tool = "brush";
        this.sfx(sfxClick);
        this.toast("צבע נדגם! עכשיו צבע/י את עצמך 🖌️");
        this.emit();
      } else if (h.tool === "fill" && isMe) {
        fillPart(hit.object.userData.ptex as PaintTex, h.color);
        this.sfx(sfxClick);
      }
      return;
    }
    // מצב צייד: מכת פטיש
    if (h.phase !== "hunt" || performance.now() < this.bonkCooldown) return;
    this.bonkCooldown = performance.now() + 450;
    const s = this.player as Seeker;
    s.swing = 1;
    const hit = this.raycaster.intersectObjects(this.occluders, false)[0];
    if (!hit) return;
    // מסובבים את הצייד לכיוון המכה
    s.yaw = Math.atan2(hit.point.x - s.pos.x, hit.point.z - s.pos.z);
    const d = Math.hypot(hit.point.x - s.pos.x, hit.point.z - s.pos.z);
    if (d > 4.5) {
      this.toast("רחוק מדי — תתקרב/י 👣");
      this.emit();
      return;
    }
    const ch = hit.object.userData.char as Character | undefined;
    const target = ch && this.hiders.find((x) => x.ch === ch && !x.caught);
    if (target) {
      setTimeout(() => this.catchHider(target, s.pos), 150);
    } else {
      this.bonkSound();
      h.time -= 5;
      this.toast("פספוס! ‎-5 שניות");
      this.stars(hit.point.clone());
    }
    this.emit();
  }

  // ============ API ל־React ============

  setJoystick(x: number, y: number) {
    this.joy.x = x;
    this.joy.y = y;
  }
  jump() {
    this.wantJump = true;
  }
  togglePaint() {
    if (this.opts.mode !== "hide" || this.hud.phase === "end" || (this.player as Hider).caught) return;
    this.hud.paintMode = !this.hud.paintMode;
    this.hud.seekerView = false;
    if (this.hud.paintMode) this.camPitch = Math.min(this.camPitch, 0.5);
    this.sfx(sfxClick);
    this.emit();
  }
  setTool(t: Tool) {
    if (this.opts.mode !== "hide") return;
    if (!this.hud.paintMode) this.hud.paintMode = true;
    this.hud.tool = t;
    this.emit();
  }
  setColor(c: string) {
    this.hud.color = c;
    this.emit();
  }
  setBrush(b: number) {
    this.hud.brush = b;
    this.emit();
  }
  setPose(p: PoseId) {
    if (this.opts.mode !== "hide" || this.hud.phase === "end") return;
    if (this.hud.pose !== p) (this.player as Hider).moveT = 0;
    this.hud.pose = p;
    this.sfx(sfxClick);
    this.emit();
  }
  setPlayerSize(s: SizeId) {
    if (this.opts.mode !== "hide" || this.hud.phase !== "prep") return;
    setSize(this.player.ch, s);
    this.hud.size = s;
    this.emit();
  }
  resetBody() {
    if (this.opts.mode !== "hide") return;
    resetPaint(this.player.ch);
  }
  toggleSeekerView() {
    if (this.opts.mode !== "hide" || this.hud.phase === "end") return;
    this.hud.seekerView = !this.hud.seekerView;
    if (this.hud.seekerView) this.hud.paintMode = false;
    this.emit();
  }
  skipPrep() {
    if (this.hud.phase === "prep") this.hud.time = 0.01;
  }
  hint() {
    if (this.opts.mode !== "seek" || this.hud.phase !== "hunt") return;
    const left = this.hiders.filter((x) => !x.caught && x.ping <= 0);
    if (!left.length) return;
    left[Math.floor(Math.random() * left.length)].ping = 3;
    this.hud.time -= 10;
    this.toast("רמז! ‎-10 שניות 🔎");
    this.emit();
  }
  setMuted(m: boolean) {
    this.opts.muted = m;
    if (m) stopMusic();
    else if (this.hud.phase === "hunt") startMusic();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    stopMusic();
    this.ro.disconnect();
    for (const [t, type, fn] of this.listeners) t.removeEventListener(type, fn);
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((x) => {
        const mm = x as THREE.MeshStandardMaterial;
        mm.map?.dispose();
        x.dispose();
      });
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
