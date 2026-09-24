// אפקטים: שובלי צבע של הרובה, כתמי צבע על משטחים, פיצוצי צבע, תווים של שריקה, וצלילים.
import * as THREE from "three";
import { splat, labelTexture } from "./textures";
import { playTone, playNoise } from "@/lib/sound";

/** צבע קשת אקראי (כמו ההתזה הצבעונית של רובה הצבע) */
export function rainbow() {
  return `#${new THREE.Color().setHSL(Math.random(), 0.9, 0.55).getHexString()}`;
}

interface Timed {
  obj: THREE.Object3D;
  t: number;
  life: number;
  update(k: number, dt: number): void;
}

export class Fx {
  private scene: THREE.Scene;
  private timed: Timed[] = [];
  private decals: THREE.Mesh[] = [];
  private splatTex: THREE.Texture[] = [];
  private noteTex: THREE.Texture;
  muted = false;
  private listener = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    for (let i = 0; i < 4; i++) this.splatTex.push(splat());
    this.noteTex = labelTexture("♪", "#ffd60a");
  }

  setListener(v: THREE.Vector3) {
    this.listener.copy(v);
  }

  private vol(at?: THREE.Vector3) {
    if (!at) return 1;
    return 1 / (1 + at.distanceTo(this.listener) / 7);
  }

  /** שובל צבע מהקנה לנקודת הפגיעה: פס צבע שמתפוגג + "כדור צבע" שטס לאורכו */
  tracer(from: THREE.Vector3, to: THREE.Vector3, color: string) {
    const len = from.distanceTo(to);
    if (len < 0.05) return;
    const geo = new THREE.CylinderGeometry(0.012, 0.03, len, 6, 1, true);
    geo.translate(0, len / 2, 0);
    geo.rotateX(Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false });
    const trail = new THREE.Mesh(geo, mat);
    trail.position.copy(from);
    trail.lookAt(to);
    trail.scale.z = 0.001;
    this.scene.add(trail);
    const blob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color }));
    blob.scale.set(1, 1, 2.2);
    blob.lookAt(to.clone().sub(from));
    this.scene.add(blob);
    const speed = 55; // מ'/ש
    const travel = Math.min(0.25, len / speed);
    this.timed.push({
      obj: trail, t: 0, life: travel + 0.55,
      update: (k, dt) => {
        const t = k * (travel + 0.55);
        const f = Math.min(1, t / travel);
        trail.scale.z = Math.max(0.001, f);
        blob.position.lerpVectors(from, to, f);
        blob.lookAt(to);
        blob.visible = f < 1;
        mat.opacity = 0.85 * (t < travel ? 1 : Math.max(0, 1 - (t - travel) / 0.55));
        if (k >= 1) {
          this.scene.remove(blob);
          blob.geometry.dispose();
          (blob.material as THREE.Material).dispose();
        }
        void dt;
      },
    });
  }

  /** הבזק לוע: אור נקודתי שמאיר את הסביבה לרגע + כוכב אור */
  muzzleFlash(at: THREE.Vector3, dir: THREE.Vector3) {
    const light = new THREE.PointLight("#ffd9a0", 60, 9, 1.8);
    light.position.copy(at).addScaledVector(dir, 0.15);
    this.scene.add(light);
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const grd = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    grd.addColorStop(0, "rgba(255,255,230,1)");
    grd.addColorStop(0.35, "rgba(255,200,90,0.9)");
    grd.addColorStop(1, "rgba(255,120,0,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }));
    sp.renderOrder = 20;
    sp.position.copy(at).addScaledVector(dir, 0.08);
    sp.scale.setScalar(0.22);
    this.scene.add(sp);
    this.timed.push({
      obj: light, t: 0, life: 0.09,
      update: (k) => {
        light.intensity = 60 * (1 - k);
        sp.scale.setScalar(0.22 * (1 + k));
        (sp.material as THREE.SpriteMaterial).opacity = 1 - k;
        if (k >= 1) { this.scene.remove(sp); tex.dispose(); sp.material.dispose(); light.dispose(); }
      },
    });
  }

  /** כתם צבע על משטח */
  decal(point: THREE.Vector3, normal: THREE.Vector3, color: string, size = 0.35) {
    const tex = this.splatTex[Math.floor(Math.random() * this.splatTex.length)];
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }),
    );
    m.position.copy(point).addScaledVector(normal, 0.01);
    m.lookAt(point.clone().add(normal));
    m.rotateZ(Math.random() * Math.PI * 2);
    m.renderOrder = 2;
    this.scene.add(m);
    this.decals.push(m);
    if (this.decals.length > 260) {
      const old = this.decals.shift()!;
      this.scene.remove(old);
      old.geometry.dispose();
      (old.material as THREE.Material).dispose();
    }
  }

  clearDecals() {
    for (const d of this.decals) {
      this.scene.remove(d);
      d.geometry.dispose();
      (d.material as THREE.Material).dispose();
    }
    this.decals = [];
  }

  /** פיצוץ צבע (כשזיקית נתפסת) */
  burst(at: THREE.Vector3, color: string, n = 26) {
    const g = new THREE.Group();
    g.position.copy(at);
    const mat = new THREE.MeshBasicMaterial({ color: color === "rainbow" ? rainbow() : color });
    const mat2 = new THREE.MeshBasicMaterial({ color: color === "rainbow" ? rainbow() : "#ffffff" });
    const bits: { m: THREE.Mesh; v: THREE.Vector3 }[] = [];
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.random() * 0.08, 6, 5), i % 5 ? mat : mat2);
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.9 + 0.3, Math.random() - 0.5).multiplyScalar(7);
      g.add(m);
      bits.push({ m, v });
    }
    this.scene.add(g);
    this.timed.push({
      obj: g, t: 0, life: 1,
      update: (k, dt) => {
        for (const b of bits) {
          b.m.position.addScaledVector(b.v, dt);
          b.v.y -= 16 * dt;
          b.m.scale.setScalar(Math.max(0.01, 1 - k));
        }
      },
    });
  }

  /** תו מוזיקלי שעולה מעל זיקית ששורקת */
  note(at: THREE.Vector3) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.noteTex, transparent: true, depthTest: false }));
    s.position.copy(at);
    s.scale.set(0.7, 0.7, 0.7);
    s.renderOrder = 11;
    this.scene.add(s);
    this.timed.push({
      obj: s, t: 0, life: 1.6,
      update: (k) => {
        s.position.y = at.y + k * 1.4;
        s.position.x = at.x + Math.sin(k * 9) * 0.2;
        (s.material as THREE.SpriteMaterial).opacity = 1 - k;
      },
    });
  }

  update(dt: number) {
    for (let i = this.timed.length - 1; i >= 0; i--) {
      const e = this.timed[i];
      e.t += dt;
      const k = Math.min(1, e.t / e.life);
      e.update(k, dt);
      if (k >= 1) {
        this.scene.remove(e.obj);
        e.obj.traverse((o) => {
          const m = o as THREE.Mesh;
          m.geometry?.dispose();
          const mm = m.material as THREE.Material | undefined;
          mm?.dispose();
        });
        this.timed.splice(i, 1);
      }
    }
  }

  // ---------- צלילים ----------
  /** יריית שוטגאן: פיצוץ רעש עמוק + "פלאפ" של צבע */
  shotSound(at?: THREE.Vector3) {
    if (this.muted) return;
    const v = this.vol(at);
    playNoise(0.32, 0.55 * v, 1800, "lowpass");
    playNoise(0.08, 0.35 * v, 5000, "highpass");
    playTone(62, 0.22, "sine", 0.35 * v);
    playNoise(0.12, 0.12 * v, 700, "bandpass", 0.09);
  }
  /** טעינה: "קלאק־קלאק" של המשאבה */
  pumpSound(at?: THREE.Vector3) {
    if (this.muted) return;
    const v = this.vol(at);
    playNoise(0.05, 0.3 * v, 3200, "bandpass", 0.42);
    playNoise(0.06, 0.34 * v, 2400, "bandpass", 0.6);
  }
  splashSound(at?: THREE.Vector3) {
    if (this.muted) return;
    const v = this.vol(at);
    playTone(660, 0.1, "triangle", 0.2 * v);
    setTimeout(() => playTone(990, 0.12, "triangle", 0.2 * v), 70);
    setTimeout(() => playTone(1320, 0.18, "triangle", 0.18 * v), 150);
  }
  whistleSound(at?: THREE.Vector3) {
    if (this.muted) return;
    const v = this.vol(at);
    playTone(1760, 0.14, "sine", 0.18 * v);
    setTimeout(() => playTone(2349, 0.2, "sine", 0.18 * v), 150);
  }
  hurtSound() {
    if (this.muted) return;
    playTone(200, 0.12, "sawtooth", 0.15);
    setTimeout(() => playTone(150, 0.16, "sawtooth", 0.12), 90);
  }
  /** צעד (מקומי או של שחקן אחר — חלש יותר לפי המרחק) */
  stepSound(at?: THREE.Vector3, soft = false) {
    if (this.muted) return;
    const v = this.vol(at) * (soft ? 0.5 : 1);
    if (v < 0.08) return;
    playNoise(0.07, 0.16 * v, 520 + Math.random() * 180, "lowpass");
    playTone(90 + Math.random() * 20, 0.05, "sine", 0.08 * v);
  }
  jumpSound() {
    if (this.muted) return;
    playNoise(0.16, 0.08, 1400, "bandpass");
  }
  landSound(at?: THREE.Vector3) {
    if (this.muted) return;
    const v = this.vol(at);
    playNoise(0.1, 0.22 * v, 380, "lowpass");
    playTone(70, 0.08, "sine", 0.14 * v);
  }
  /** מכחול: "ששש" קצר של צבע */
  brushSound() {
    if (this.muted) return;
    playNoise(0.06, 0.035, 3200 + Math.random() * 1200, "bandpass");
  }
  /** טפטפת: בלופ */
  pickSound() {
    if (this.muted) return;
    playTone(660, 0.05, "sine", 0.12);
    setTimeout(() => playTone(990, 0.07, "sine", 0.1), 45);
  }
  /** שכפול: פוף */
  cloneSound(at?: THREE.Vector3) {
    if (this.muted) return;
    const v = this.vol(at);
    playNoise(0.22, 0.16 * v, 900, "bandpass");
    playTone(520, 0.12, "triangle", 0.08 * v);
    setTimeout(() => playTone(780, 0.1, "triangle", 0.07 * v), 70);
  }
  /** ええやん */
  likeSound() {
    if (this.muted) return;
    [784, 988, 1175, 1568].forEach((f, i) => setTimeout(() => playTone(f, 0.16, "triangle", 0.14), i * 70));
  }
  chatSound() {
    if (this.muted) return;
    playTone(1320, 0.05, "sine", 0.07);
  }
  uiSound() {
    if (this.muted) return;
    playTone(880, 0.04, "sine", 0.08);
  }
  /** תחילת החיפוש: שריקת שופט */
  startWhistle() {
    if (this.muted) return;
    playTone(2600, 0.5, "square", 0.05);
    playTone(2650, 0.5, "sine", 0.12);
    playNoise(0.5, 0.05, 2600, "bandpass");
  }
  /** חשיפת התשובות: תופים קצרים ואז "טה־דה" */
  revealSound() {
    if (this.muted) return;
    for (let i = 0; i < 10; i++) playNoise(0.05, 0.12, 250, "lowpass", i * 0.06);
    setTimeout(() => { playTone(523, 0.3, "triangle", 0.15); playTone(659, 0.3, "triangle", 0.12); playTone(784, 0.45, "triangle", 0.12); }, 650);
  }
  gateSound() {
    if (this.muted) return;
    playTone(220, 0.25, "square", 0.12);
    setTimeout(() => playTone(330, 0.25, "square", 0.12), 200);
    setTimeout(() => playTone(440, 0.35, "square", 0.12), 400);
  }
}
