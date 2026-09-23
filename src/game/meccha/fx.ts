// אפקטים: שובלי צבע של הרובה, כתמי צבע על משטחים, פיצוצי צבע, תווים של שריקה, וצלילים.
import * as THREE from "three";
import { splat, labelTexture } from "./textures";
import { playTone } from "@/lib/sound";

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

  /** שובל צבע מהקנה לנקודת הפגיעה */
  tracer(from: THREE.Vector3, to: THREE.Vector3, color: string) {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    // "קליע" קטן שנוסע לאורך השובל
    const blob = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color }));
    this.scene.add(blob);
    this.timed.push({
      obj: line, t: 0, life: 0.45,
      update: (k) => {
        mat.opacity = 0.9 * (1 - k);
        blob.position.lerpVectors(from, to, Math.min(1, k * 3));
        blob.visible = k < 0.34;
        if (k >= 1) {
          this.scene.remove(blob);
          blob.geometry.dispose();
          (blob.material as THREE.Material).dispose();
        }
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
    const mat = new THREE.MeshBasicMaterial({ color });
    const mat2 = new THREE.MeshBasicMaterial({ color: "#ffffff" });
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
  shotSound(at?: THREE.Vector3) {
    if (this.muted) return;
    const v = this.vol(at);
    playTone(140, 0.12, "sawtooth", 0.22 * v);
    playTone(900, 0.05, "square", 0.08 * v);
    setTimeout(() => playTone(320, 0.08, "triangle", 0.1 * v), 60);
  }
  pumpSound() {
    if (this.muted) return;
    setTimeout(() => playTone(500, 0.04, "square", 0.06), 350);
    setTimeout(() => playTone(380, 0.05, "square", 0.06), 450);
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
  gateSound() {
    if (this.muted) return;
    playTone(220, 0.25, "square", 0.12);
    setTimeout(() => playTone(330, 0.25, "square", 0.12), 200);
    setTimeout(() => playTone(440, 0.35, "square", 0.12), 400);
  }
}
