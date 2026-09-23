// ערכת בנייה משותפת לכל המפות: חומרים, קופסאות, קירות עם פתחים, חדר ציידים עם שער, תאורה.
import * as THREE from "three";
import * as T from "../textures";
import type { PaintTex } from "../textures";

export interface Obstacle {
  minX: number; maxX: number; minZ: number; maxZ: number;
  bottom: number; top: number;
  standable: boolean;
  gate?: boolean;
  enabled: boolean;
}

export interface Lighting {
  sky: string;
  hemi: [string, string, number];
  sun: { color: string; int: number; pos: [number, number, number]; shadow?: boolean } | null;
  fog?: [string, number, number];
  points: { pos: [number, number, number]; color: string; int: number; dist: number }[];
  exposure?: number;
}

export interface World {
  id: string;
  name: string;
  group: THREE.Group;
  surfaces: THREE.Mesh[];
  obstacles: Obstacle[];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  hunterSpawns: THREE.Vector3[];
  hiderSpawns: THREE.Vector3[];
  lobby?: { play: THREE.Vector3; pad: { x: number; z: number; r: number } };
  lighting: Lighting;
  groundAt(x: number, z: number, y: number, r: number): number;
  surfaceColor(hit: THREE.Intersection, out: THREE.Color): THREE.Color;
  surfaceMat(hit: THREE.Intersection): { metal: number; rough: number; emissive: number };
  setGate(open: boolean): void;
  roomAt(x: number, z: number): string;
  dispose(): void;
}

export type Mat = { m: THREE.MeshStandardMaterial; ptex: PaintTex | null; repeat: [number, number] };
type AddOpts = { solid?: boolean; standable?: boolean; rotY?: number; rotX?: number; rotZ?: number; noShadow?: boolean; gate?: boolean; scale?: [number, number, number] };

export class Kit {
  group = new THREE.Group();
  surfaces: THREE.Mesh[] = [];
  obstacles: Obstacle[] = [];
  gateMeshes: THREE.Mesh[] = [];
  rooms: { name: string; x1: number; x2: number; z1: number; z2: number }[] = [];
  wallH: number;
  doorH: number;
  private texCache = new Map<string, PaintTex>();

  constructor(wallH = 6, doorH = 3.8) {
    this.wallH = wallH;
    this.doorH = doorH;
  }

  /** טקסטורה במטמון לפי מפתח (כדי לא לייצר אותה שוב ושוב) */
  tex(key: string, make: () => PaintTex) {
    let t = this.texCache.get(key);
    if (!t) { t = make(); this.texCache.set(key, t); }
    return t;
  }

  mat(ptex: PaintTex | null, color = "#ffffff", repeat: [number, number] = [1, 1], extra: { metalness?: number; roughness?: number; transparent?: boolean; emissive?: string; emissiveIntensity?: number } = {}): Mat {
    let map: THREE.Texture | null = null;
    if (ptex) {
      map = ptex.texture.clone();
      map.repeat.set(repeat[0], repeat[1]);
      map.needsUpdate = true;
    }
    const m = new THREE.MeshStandardMaterial({
      color, map, roughness: extra.roughness ?? 0.82, metalness: extra.metalness ?? 0,
      transparent: extra.transparent, alphaTest: extra.transparent ? 0.5 : 0,
      side: extra.transparent ? THREE.DoubleSide : THREE.FrontSide,
    });
    if (extra.emissive) {
      m.emissive = new THREE.Color(extra.emissive);
      m.emissiveIntensity = extra.emissiveIntensity ?? 1;
      if (map) m.emissiveMap = map;
    }
    return { m, ptex, repeat };
  }

  /** אותו חומר עם חזרתיות לפי גודל המשטח */
  fit(m: Mat, w: number, h: number, unit = 2.5): Mat {
    if (!m.ptex) return m;
    return this.mat(m.ptex, `#${m.m.color.getHexString()}`, [Math.max(0.3, w / unit), Math.max(0.3, h / unit)], { metalness: m.m.metalness, roughness: m.m.roughness });
  }

  add(geo: THREE.BufferGeometry, material: Mat, pos: [number, number, number], opts: AddOpts = {}) {
    const mesh = new THREE.Mesh(geo, material.m);
    mesh.position.set(...pos);
    if (opts.rotY) mesh.rotation.y = opts.rotY;
    if (opts.rotX) mesh.rotation.x = opts.rotX;
    if (opts.rotZ) mesh.rotation.z = opts.rotZ;
    if (opts.scale) mesh.scale.set(...opts.scale);
    mesh.castShadow = !opts.noShadow;
    mesh.receiveShadow = true;
    mesh.userData.ptex = material.ptex;
    mesh.userData.repeat = material.repeat;
    this.group.add(mesh);
    if (!opts.gate) this.surfaces.push(mesh);
    else this.gateMeshes.push(mesh);
    if (opts.solid) {
      mesh.updateMatrixWorld();
      const b = new THREE.Box3().setFromObject(mesh);
      this.obstacles.push({ minX: b.min.x, maxX: b.max.x, minZ: b.min.z, maxZ: b.max.z, bottom: b.min.y, top: b.max.y, standable: !!opts.standable, gate: opts.gate, enabled: true });
    }
    return mesh;
  }

  /** קופסה; y = תחתית */
  box(w: number, h: number, d: number, x: number, y: number, z: number, m: Mat, o: AddOpts = { solid: true }) {
    return this.add(new THREE.BoxGeometry(w, h, d), m, [x, y + h / 2, z], o);
  }
  /** קופסה שעומדים עליה (רהיט נמוך) */
  seat(w: number, h: number, d: number, x: number, y: number, z: number, m: Mat, rotY = 0) {
    return this.add(new THREE.BoxGeometry(w, h, d), m, [x, y + h / 2, z], { solid: true, standable: true, rotY });
  }
  cyl(rt: number, rb: number, h: number, x: number, y: number, z: number, m: Mat, solid = true, seg = 16) {
    return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), m, [x, y + h / 2, z], { solid });
  }
  ball(r: number, x: number, y: number, z: number, m: Mat, solid = false) {
    return this.add(new THREE.SphereGeometry(r, 20, 14), m, [x, y, z], { solid });
  }
  cone(r: number, h: number, x: number, y: number, z: number, m: Mat, solid = true) {
    return this.add(new THREE.ConeGeometry(r, h, 16), m, [x, y + h / 2, z], { solid });
  }
  /** לוח שטוח על קיר (פוסטר/ציור/שלט) */
  panel(w: number, h: number, x: number, y: number, z: number, m: Mat, rotY = 0) {
    return this.add(new THREE.PlaneGeometry(w, h), m, [x, y, z], { rotY, noShadow: true });
  }

  floor(x1: number, x2: number, z1: number, z2: number, m: Mat, unit = 4, y = 0) {
    const f = this.add(new THREE.BoxGeometry(x2 - x1, 0.2, z2 - z1), this.mat(m.ptex, `#${m.m.color.getHexString()}`, [(x2 - x1) / unit, (z2 - z1) / unit], { metalness: m.m.metalness, roughness: m.m.roughness }), [(x1 + x2) / 2, y - 0.1, (z1 + z2) / 2], { noShadow: true });
    return f;
  }
  ceiling(x1: number, x2: number, z1: number, z2: number, m: Mat, h: number, unit = 4) {
    const c = this.add(new THREE.BoxGeometry(x2 - x1, 0.2, z2 - z1), this.mat(m.ptex, `#${m.m.color.getHexString()}`, [(x2 - x1) / unit, (z2 - z1) / unit]), [(x1 + x2) / 2, h + 0.1, (z1 + z2) / 2], { noShadow: true });
    return c;
  }

  /** קיר לאורך X (z קבוע) עם פתחים [מרכז, רוחב] */
  wallX(z: number, x1: number, x2: number, m: Mat, doors: [number, number][] = [], arch?: Mat, h = this.wallH) {
    let cur = x1;
    for (const [c, w] of [...doors].sort((a, b) => a[0] - b[0])) {
      if (c - w / 2 - cur > 0.01) this.box(c - w / 2 - cur, h, 0.3, (cur + c - w / 2) / 2, 0, z, this.fit(m, c - w / 2 - cur, h));
      if (h - this.doorH > 0.01) this.box(w, h - this.doorH, 0.3, c, this.doorH, z, this.fit(m, w, h - this.doorH));
      if (arch) this.doorFrame(c, z, w, "x", arch);
      cur = c + w / 2;
    }
    if (x2 - cur > 0.01) this.box(x2 - cur, h, 0.3, (cur + x2) / 2, 0, z, this.fit(m, x2 - cur, h));
  }
  wallZ(x: number, z1: number, z2: number, m: Mat, doors: [number, number][] = [], arch?: Mat, h = this.wallH) {
    let cur = z1;
    for (const [c, w] of [...doors].sort((a, b) => a[0] - b[0])) {
      if (c - w / 2 - cur > 0.01) this.box(0.3, h, c - w / 2 - cur, x, 0, (cur + c - w / 2) / 2, this.fit(m, c - w / 2 - cur, h));
      if (h - this.doorH > 0.01) this.box(0.3, h - this.doorH, w, x, this.doorH, c, this.fit(m, w, h - this.doorH));
      if (arch) this.doorFrame(x, c, w, "z", arch);
      cur = c + w / 2;
    }
    if (z2 - cur > 0.01) this.box(0.3, h, z2 - cur, x, 0, (cur + z2) / 2, this.fit(m, z2 - cur, h));
  }
  /** משקוף/קשת עץ */
  doorFrame(a: number, b: number, w: number, axis: "x" | "z", m: Mat) {
    const geo = new THREE.TorusGeometry(w / 2, 0.14, 8, 24, Math.PI);
    this.add(geo, m, [a, this.doorH - 0.15, b], { rotY: axis === "x" ? 0 : Math.PI / 2, scale: [1, 0.45, 2.4] });
    for (const s of [-1, 1]) {
      if (axis === "x") this.box(0.22, this.doorH, 0.42, a + s * (w / 2 - 0.11), 0, b, m, { solid: false });
      else this.box(0.42, this.doorH, 0.22, a, 0, b + s * (w / 2 - 0.11), m, { solid: false });
    }
  }

  /** שער סורג של חדר הציידים (ננעל בשלב ההכנה) */
  gate(x: number, z: number, w: number, axis: "x" | "z") {
    const barMat = this.mat(this.tex("bars", T.bars), "#fff", [2, 2], { transparent: true, metalness: 0.6, roughness: 0.4 });
    const geo = axis === "x" ? new THREE.BoxGeometry(w, this.doorH, 0.12) : new THREE.BoxGeometry(0.12, this.doorH, w);
    this.add(geo, barMat, [x, this.doorH / 2, z], { solid: true, gate: true });
  }

  room(name: string, x1: number, x2: number, z1: number, z2: number) {
    this.rooms.push({ name, x1, x2, z1, z2 });
  }

  plant(x: number, z: number, s = 1) {
    this.cyl(0.45 * s, 0.35 * s, 0.8 * s, x, 0, z, this.mat(null, "#9c6644"));
    this.ball(0.85 * s, x, 1.5 * s, z, this.mat(this.tex("leaves", T.leaves), "#fff"), true);
  }

  finish(o: {
    id: string; name: string; bounds: World["bounds"]; hunterSpawns: THREE.Vector3[]; hiderSpawns: THREE.Vector3[];
    lighting: Lighting; lobby?: World["lobby"];
  }): World {
    const obstacles = this.obstacles;
    const tmp = new THREE.Color();
    const rooms = this.rooms;
    const gateMeshes = this.gateMeshes;
    const group = this.group;
    return {
      ...o,
      group, surfaces: this.surfaces, obstacles,
      groundAt(x, z, y, r) {
        let g = 0;
        for (const ob of obstacles) {
          if (!ob.enabled) continue;
          if (!ob.standable && ob.top > 0.5) continue;
          if (x > ob.minX - r * 0.3 && x < ob.maxX + r * 0.3 && z > ob.minZ - r * 0.3 && z < ob.maxZ + r * 0.3)
            if (ob.top <= y + 0.45 && ob.top > g) g = ob.top;
        }
        return g;
      },
      surfaceColor(hit, out) {
        const mesh = hit.object as THREE.Mesh;
        const m = mesh.material as THREE.MeshStandardMaterial;
        const ptex = mesh.userData.ptex as PaintTex | null | undefined;
        if (ptex && hit.uv) {
          T.sampleTex(ptex, hit.uv, out, mesh.userData.repeat ?? ptex.repeat);
          tmp.copy(m.color);
          return out.multiply(tmp);
        }
        return out.copy(m.color);
      },
      surfaceMat(hit) {
        const m = (hit.object as THREE.Mesh).material as THREE.MeshStandardMaterial;
        return { metal: m.metalness ?? 0, rough: m.roughness ?? 0.8, emissive: m.emissive ? Math.min(1, m.emissiveIntensity * Math.max(m.emissive.r, m.emissive.g, m.emissive.b)) : 0 };
      },
      setGate(open) {
        for (const ob of obstacles) if (ob.gate) ob.enabled = !open;
        for (const m of gateMeshes) m.visible = !open;
      },
      roomAt(x, z) {
        for (const r of rooms) if (x >= r.x1 && x <= r.x2 && z >= r.z1 && z <= r.z2) return r.name;
        return o.name;
      },
      dispose() {
        group.traverse((ob) => {
          const m = ob as THREE.Mesh;
          m.geometry?.dispose();
          const mm = m.material as THREE.MeshStandardMaterial | undefined;
          mm?.map?.dispose();
          mm?.dispose();
        });
      },
    };
  }
}

/** נקודות התחלה במעגל */
export function ring(cx: number, cz: number, r: number, n: number, y = 0) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return new THREE.Vector3(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r);
  });
}
export function grid(cx: number, cz: number, n: number, gap = 1.3) {
  return Array.from({ length: n }, (_, i) => new THREE.Vector3(cx + ((i % 3) - 1) * gap, 0, cz + Math.floor(i / 3) * gap));
}
