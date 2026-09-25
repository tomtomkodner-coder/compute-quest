// Hide-and-Seek Mansion (かくれんぼの屋敷) — the default map, rebuilt after the real game's screenshots:
// green-damask hallways with black/white checker tile, dark wainscoting and party bunting; a grand ballroom
// (beige marble with black diamond inserts, coffered ceiling, crystal chandeliers, staircase to a balcony,
// ribbon-streamer walls, balloons, round tables, grand piano, white marble rearing horse); a red-damask storage
// room with taped boxes; a blue-damask room; an arched wooden library; a restaurant kitchen with blue hex tile;
// cold storage with meat shelves; a laundry basement with clothes lines and towel piles; a green-tiled bathroom;
// and a brick basement with a bronze rearing horse.
import * as THREE from "three";
import * as X from "./tex/mansion";
import { Kit, type Mat, type World } from "./kit";

type V3 = [number, number, number];
type PO = { rx?: number; ry?: number; rz?: number; s?: V3; q?: THREE.Quaternion; uv?: "tri" | "native"; uvs?: [number, number]; swap?: boolean; r?: number };
type Trim = "wains" | "base" | "none";
type Side = { m: Mat; ch: number; trim: Trim } | null;
type Door = { c: number; w: number; h?: number; arch?: [number, number] };

export function buildMansion(): World {
  const k = new Kit(8, 2.4);
  const rnd = X.rng(20260924);
  const pick = <V>(a: V[]) => a[Math.floor(rnd() * a.length)];

  // ================= batching (one draw call per material) =================
  // every put() appends transformed, de-indexed vertices straight into one growable buffer per material
  type Buf = { unit: number; shadow: boolean; p: Float32Array; n: Float32Array; u: Float32Array; len: number };
  const info = new Map<Mat, Buf>();
  const M = (tex: X.PaintTex | null, color: string, unit: number, o: { metalness?: number; roughness?: number; emissive?: string; emissiveIntensity?: number; bump?: number; shadow?: boolean } = {}) => {
    if (tex && (o.bump ?? 0.55) > 0) X.fastNormal(tex);
    const m = k.mat(tex, color, [1, 1], o);
    info.set(m, { unit, shadow: o.shadow ?? true, p: new Float32Array(0), n: new Float32Array(0), u: new Float32Array(0), len: 0 });
    return m;
  };
  let xf = new THREE.Matrix4();
  let xfRy = 0;
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _nm = new THREE.Matrix3();
  function put(m: Mat, geo: THREE.BufferGeometry, pos: V3, o: PO = {}) {
    if (o.q) _q.copy(o.q);
    else { _e.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0); _q.setFromEuler(_e); }
    _m.compose(_v.set(pos[0], pos[1], pos[2]), _q, o.s ? _s.set(o.s[0], o.s[1], o.s[2]) : _s.set(1, 1, 1));
    _m.premultiply(xf);
    _nm.getNormalMatrix(_m);
    const b = info.get(m)!;
    const P = geo.attributes.position.array as ArrayLike<number>;
    if (!geo.attributes.normal) geo.computeVertexNormals();
    const N = geo.attributes.normal.array as ArrayLike<number>;
    const UV = geo.attributes.uv ? (geo.attributes.uv.array as ArrayLike<number>) : null;
    const idx = geo.index ? (geo.index.array as ArrayLike<number>) : null;
    const cnt = idx ? idx.length : geo.attributes.position.count;
    const need = b.len + cnt;
    if (need * 3 > b.p.length) {
      const cap = Math.max(need, b.len * 2, 1024);
      const np = new Float32Array(cap * 3), nn = new Float32Array(cap * 3), nu = new Float32Array(cap * 2);
      np.set(b.p.subarray(0, b.len * 3)); nn.set(b.n.subarray(0, b.len * 3)); nu.set(b.u.subarray(0, b.len * 2));
      b.p = np; b.n = nn; b.u = nu;
    }
    const e = _m.elements, q = _nm.elements;
    const native = o.uv === "native" && !!UV;
    const su = o.uvs ? o.uvs[0] : 1, sv = o.uvs ? o.uvs[1] : 1;
    const unit = 1 / b.unit, swap = !!o.swap;
    const bp = b.p, bn = b.n, bu = b.u;
    let w3 = b.len * 3, w2 = b.len * 2;
    for (let i = 0; i < cnt; i++) {
      const vi = idx ? idx[i] : i;
      const x = P[vi * 3], y = P[vi * 3 + 1], z = P[vi * 3 + 2];
      const wx = e[0] * x + e[4] * y + e[8] * z + e[12];
      const wy = e[1] * x + e[5] * y + e[9] * z + e[13];
      const wz = e[2] * x + e[6] * y + e[10] * z + e[14];
      const nx0 = N[vi * 3], ny0 = N[vi * 3 + 1], nz0 = N[vi * 3 + 2];
      let nx = q[0] * nx0 + q[3] * ny0 + q[6] * nz0;
      let ny = q[1] * nx0 + q[4] * ny0 + q[7] * nz0;
      let nz = q[2] * nx0 + q[5] * ny0 + q[8] * nz0;
      const il = 1 / (Math.sqrt(nx * nx + ny * ny + nz * nz) || 1);
      nx *= il; ny *= il; nz *= il;
      bp[w3] = wx; bp[w3 + 1] = wy; bp[w3 + 2] = wz;
      bn[w3] = nx; bn[w3 + 1] = ny; bn[w3 + 2] = nz;
      w3 += 3;
      if (native) { bu[w2] = UV![vi * 2] * su; bu[w2 + 1] = UV![vi * 2 + 1] * sv; }
      else {
        const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
        let a: number, c: number;
        if (ax >= ay && ax >= az) { a = wz; c = wy; }
        else if (ay >= az) { a = wx; c = wz; }
        else { a = wx; c = wy; }
        if (swap) { bu[w2] = c * unit; bu[w2 + 1] = a * unit; }
        else { bu[w2] = a * unit; bu[w2 + 1] = c * unit; }
      }
      w2 += 2;
    }
    b.len = need;
  }
  /** cache of primitive geometries by construction parameters (put() never mutates them) */
  const gcache = new Map<string, THREE.BufferGeometry>();
  const cg = <Q extends THREE.BufferGeometry>(key: string, make: () => Q): THREE.BufferGeometry => {
    let g = gcache.get(key);
    if (!g) { g = make(); gcache.set(key, g); }
    return g;
  };
  function grp(x: number, y: number, z: number, ry: number, fn: () => void) {
    const prev = xf.clone(), prevRy = xfRy;
    xf = xf.clone().multiply(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(1, 1, 1)));
    xfRy += ry;
    fn();
    xf = prev;
    xfRy = prevRy;
  }
  const wp = (p: V3): V3 => { const v = new THREE.Vector3(...p).applyMatrix4(xf); return [v.x, v.y, v.z]; };
  /** collider in current local frame */
  function col(x1: number, x2: number, z1: number, z2: number, b: number, t: number) {
    const pts = [[x1, z1], [x1, z2], [x2, z1], [x2, z2]].map(([x, z]) => new THREE.Vector3(x, b, z).applyMatrix4(xf));
    const xs = pts.map((p) => p.x), zs = pts.map((p) => p.z);
    const dy = pts[0].y - b;
    k.collider(Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs), b + dy, t + dy, true);
  }

  // ---- primitives (y = bottom unless "C" = centre) ----
  // ---- LOD: segment counts scaled to the object's real size (small props don't need 24–32 sides) ----
  const segFor = (r: number, want: number) => Math.max(5, Math.min(want, r < 0.05 ? 6 : r < 0.1 ? 8 : r < 0.18 ? 10 : r < 0.3 ? 12 : r < 0.5 ? 18 : r < 0.8 ? 24 : want));
  const sMax = (o: PO) => (o.s ? Math.max(Math.abs(o.s[0]), Math.abs(o.s[1]), Math.abs(o.s[2])) : 1);
  /** chamfered box (44 tris instead of RoundedBox's 108) — flat bevels still catch highlights */
  const chamferCache = new Map<string, THREE.BufferGeometry>();
  function chamferBox(w: number, h: number, d: number, r: number) {
    const key = `${w.toFixed(3)}_${h.toFixed(3)}_${d.toFixed(3)}_${r.toFixed(3)}`;
    const hit = chamferCache.get(key);
    if (hit) return hit;
    const a = w / 2, b = h / 2, c = d / 2;
    const P: number[] = [];
    const tri = (p: V3, q: V3, t: V3) => {
      const ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2], vx = t[0] - p[0], vy = t[1] - p[1], vz = t[2] - p[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const cx = p[0] + q[0] + t[0], cy = p[1] + q[1] + t[1], cz = p[2] + q[2] + t[2];
      if (nx * cx + ny * cy + nz * cz < 0) P.push(...p, ...t, ...q); else P.push(...p, ...q, ...t);
    };
    const quad = (p: V3, q: V3, t: V3, u: V3) => { tri(p, q, t); tri(p, t, u); };
    const A = a - r, B = b - r, C = c - r;
    for (const s of [-1, 1]) {
      quad([s * a, -B, -C], [s * a, B, -C], [s * a, B, C], [s * a, -B, C]);
      quad([-A, s * b, -C], [A, s * b, -C], [A, s * b, C], [-A, s * b, C]);
      quad([-A, -B, s * c], [A, -B, s * c], [A, B, s * c], [-A, B, s * c]);
    }
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      quad([sx * a, sy * B, -C], [sx * A, sy * b, -C], [sx * A, sy * b, C], [sx * a, sy * B, C]);
      for (const sz of [-1, 1]) tri([sx * a, sy * B, sz * C], [sx * A, sy * b, sz * C], [sx * A, sy * B, sz * c]);
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) quad([sx * a, -B, sz * C], [sx * a, B, sz * C], [sx * A, B, sz * c], [sx * A, -B, sz * c]);
    for (const sy of [-1, 1]) for (const sz of [-1, 1]) quad([-A, sy * b, sz * C], [A, sy * b, sz * C], [A, sy * B, sz * c], [-A, sy * B, sz * c]);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
    // "rounded" shading like RoundedBox: normal = direction from the inner core box to the vertex
    const NN = new Float32Array(P.length);
    for (let i = 0; i < P.length; i += 3) {
      const ox = P[i] - Math.max(-A, Math.min(A, P[i])), oy = P[i + 1] - Math.max(-B, Math.min(B, P[i + 1])), oz = P[i + 2] - Math.max(-C, Math.min(C, P[i + 2]));
      const il = 1 / (Math.hypot(ox, oy, oz) || 1);
      NN[i] = ox * il; NN[i + 1] = oy * il; NN[i + 2] = oz * il;
    }
    g.setAttribute("normal", new THREE.BufferAttribute(NN, 3));
    chamferCache.set(key, g);
    return g;
  }
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const leafGeo = new THREE.SphereGeometry(1, 6, 4);
  const box = (m: Mat, w: number, h: number, d: number, x: number, y: number, z: number, o: PO = {}) => {
    const mn = Math.min(w, h, d);
    const r = o.r ? Math.min(o.r, mn * 0.45) : 0;
    if (r > 0.004 && mn > 0.02) put(m, chamferBox(w, h, d, r), [x, y + h / 2, z], o);
    else if (o.s) put(m, cg(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)), [x, y + h / 2, z], o);
    else put(m, unitBox, [x, y + h / 2, z], { ...o, s: [w, h, d] });
  };
  const sbox = (m: Mat, w: number, h: number, d: number, x: number, y: number, z: number, o: PO = {}) => {
    box(m, w, h, d, x, y, z, o);
    const ry = o.ry ?? 0;
    const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry));
    const ex = (c * w + s * d) / 2, ez = (s * w + c * d) / 2;
    col(x - ex, x + ex, z - ez, z + ez, y, y + h);
  };
  const cylGeo = (rt: number, rb: number, h: number, sg: number) => cg(`c${rt},${rb},${h},${sg}`, () => new THREE.CylinderGeometry(rt, rb, h, sg));
  const cyl = (m: Mat, rt: number, rb: number, h: number, x: number, y: number, z: number, seg = 20, o: PO = {}) =>
    put(m, cylGeo(rt, rb, h, segFor(Math.max(rt, rb) * sMax(o), seg)), [x, y + h / 2, z], o);
  const cylC = (m: Mat, rt: number, rb: number, h: number, x: number, y: number, z: number, seg = 16, o: PO = {}) =>
    put(m, cylGeo(rt, rb, h, segFor(Math.max(rt, rb) * sMax(o), seg)), [x, y, z], o);
  const sph = (m: Mat, r: number, x: number, y: number, z: number, s?: V3, o: PO = {}, ws = 16, hs = 12) => {
    const re = r * (s ? Math.max(...s.map(Math.abs)) : 1);
    const w2 = segFor(re, ws);
    const h2 = Math.max(4, Math.min(hs, Math.round(w2 * 0.55)));
    put(m, cg(`s${r},${w2},${h2}`, () => new THREE.SphereGeometry(r, w2, h2)), [x, y, z], { ...o, s });
  };
  const lathe = (m: Mat, pts: [number, number][], x: number, y: number, z: number, seg = 24, o: PO = {}) =>
    { const sg = segFor(Math.max(...pts.map((p) => p[0])) * sMax(o), seg); put(m, cg(`l${pts.join(";")}|${sg}`, () => new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(Math.max(0.0001, a), b)), sg)), [x, y, z], o); }
  const up = new THREE.Vector3(0, 1, 0);
  const seg = (m: Mat, a: V3, b: V3, r1: number, r2: number, rs = 10) => {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
    const d = vb.clone().sub(va);
    const len = d.length();
    const q = new THREE.Quaternion().setFromUnitVectors(up, d.normalize());
    const mid = va.clone().add(vb).multiplyScalar(0.5);
    put(m, cylGeo(r2, r1, len, segFor(Math.max(r1, r2), rs)), [mid.x, mid.y, mid.z], { q });
  };
  const tube = (m: Mat, pts: V3[], r: number, rs = 8, ts = 0) => {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, "centripetal");
    const T0 = ts || pts.length * 6;
    put(m, new THREE.TubeGeometry(curve, r < 0.03 ? Math.max(4, Math.ceil(T0 * 0.5)) : T0, r, r < 0.02 ? Math.min(rs, 5) : r < 0.05 ? Math.min(rs, 6) : rs, false), [0, 0, 0]);
  };
  const torus = (m: Mat, R: number, r: number, x: number, y: number, z: number, o: PO = {}, arc = Math.PI * 2, rs = 8, ts = 24) =>
    put(m, new THREE.TorusGeometry(R, r, r < 0.02 ? Math.min(rs, 4) : r < 0.04 ? Math.min(rs, 6) : rs, Math.max(6, Math.min(ts, Math.round(segFor(R * sMax(o), ts) * (arc / (Math.PI * 2)) + 2))), arc), [x, y, z], o);
  const extr = (m: Mat, shape: THREE.Shape, depth: number, x: number, y: number, z: number, o: PO = {}, bevel = 0) => {
    const g = cg(`e${shape.uuid},${depth},${bevel}`, () => {
      const eg = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1, curveSegments: 12 });
      eg.translate(0, 0, -depth / 2);
      return eg;
    });
    put(m, g, [x, y, z], o);
  };
  const plane = (m: Mat, w: number, h: number, x: number, y: number, z: number, ry: number, uvRect: [number, number, number, number]) => {
    const g = new THREE.PlaneGeometry(w, h);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uvRect[0] + uv.getX(i) * uvRect[2], uvRect[1] + uv.getY(i) * uvRect[3]);
    put(m, g, [x, y, z], { ry, uv: "native" });
  };

  // ================= instanced registries (one draw call each) =================
  type Inst = { pos: V3; rotY?: number; rotZ?: number; rotX?: number; scale?: V3; color?: string };
  const instReg: { geo: THREE.BufferGeometry; mat: Mat; list: Inst[]; shadow: boolean }[] = [];
  const reg = (geo: THREE.BufferGeometry, mat: Mat, shadow = false) => { const r = { geo, mat, list: [] as Inst[], shadow }; instReg.push(r); return r.list; };

  // ================= materials =================
  const tx = <Q extends X.PaintTex>(key: string, f: () => Q) => k.tex("mn2_" + key, f);
  // walls
  const mDamGreen = M(tx("damG", () => X.damask2("#1b2610", "#5c8a1e", "#8fbf3a", 31)), "#fff", 0.62, { bump: 0.35, roughness: 0.85 });
  const mDamRed = M(tx("damR", () => X.smallPattern("#6a1a12", "#a8452a", 32)), "#fff", 0.5, { bump: 0.3, roughness: 0.85 });
  const mDamBlue = M(tx("damB", () => X.damask2("#35587a", "#5d82a6", "#86a6c4", 33, 50)), "#fff", 0.62, { bump: 0.3, roughness: 0.85 });
  const mLauPaper = M(tx("lauP", () => X.smallPattern("#5a1616", "#8a3a36", 34)), "#fff", 0.45, { bump: 0.3, roughness: 0.85 });
  const mBallPanel = M(tx("ballP", () => X.woodPanels("#4d2a18", 35, 1.3)), "#fff", 1.25, { bump: 0.45, roughness: 0.5 });
  const mLibPanel = M(tx("libP", () => X.woodPanels("#a2582a", 36, 1.1)), "#fff", 1.4, { bump: 0.45, roughness: 0.5 });
  const mRelief = M(tx("relief", () => X.reliefTile("#f2f2ee", 37)), "#fff", 0.8, { bump: 0.7, roughness: 0.3 });
  const mReliefGrey = M(tx("relief", () => X.reliefTile("#f2f2ee", 37)), "#a9b0b2", 0.8, { bump: 0.7, roughness: 0.35 });
  const mBrick = M(tx("brick", () => X.bricks()), "#fff", 1.0, { roughness: 0.85, bump: 1.0 });
  const mGreenTile = M(tx("gTile", () => X.greenTile()), "#fff", 1.2, { roughness: 0.15, bump: 0.3 });
  const mExt = M(tx("plExt", () => X.plaster("#8a7e6e", 1)), "#fff", 3, { bump: 0.15 });
  const mPlasterW = M(tx("plW", () => X.plaster("#efeae0", 2)), "#fff", 3, { bump: 0.1, shadow: false });
  const mCeilDark = M(tx("planksC", () => X.planks("#4a3222", 31, 6)), "#fff", 1.6, { shadow: false, roughness: 0.7 });
  const mConcrete = M(tx("conc", () => X.concrete("#8a8781", 3)), "#fff", 3, { roughness: 0.8, bump: 0.4, shadow: false });
  const mConcreteB = M(tx("conc", () => X.concrete("#8a8781", 3)), "#b9b4aa", 2, { roughness: 0.9, bump: 0.5 });
  // floors
  const mChecker = M(tx("chk", () => X.checker2("#e3dccb", "#141414", 38)), "#fff", 2.4, { roughness: 0.28, bump: 0.15, shadow: false });
  const mMarbleFloor = M(tx("mDia", () => X.marbleDiamond("#e2d6bf", 39)), "#fff", 1.9, { roughness: 0.14, bump: 0.12, shadow: false });
  const mHex = M(tx("hex", () => X.hexTile("#1f6f96", 40)), "#fff", 0.9, { roughness: 0.2, bump: 0.35, shadow: false });
  const mHexDark = M(tx("hex", () => X.hexTile("#1f6f96", 40)), "#6c7f8c", 0.9, { roughness: 0.3, bump: 0.35, shadow: false });
  const mHerring = M(tx("herr", () => X.herringbone("#5a3a24", 41)), "#fff", 1.6, { roughness: 0.4, bump: 0.35, shadow: false });
  const mFloorLib = M(tx("fLib", () => X.planks("#5a2e1c", 12)), "#fff", 1.8, { roughness: 0.3, bump: 0.4, shadow: false });
  const mMarbleBath = M(tx("mDia", () => X.marbleDiamond("#e2d6bf", 39)), "#f0e0c8", 1.2, { roughness: 0.12, bump: 0.12, shadow: false });
  // woods & metals
  const mWalnut = M(tx("walnut", () => X.grain("#3e2415", 3)), "#fff", 1.1, { roughness: 0.45, bump: 0.25 });
  const mWalnutL = M(tx("walnutL", () => X.grain("#56341e", 9)), "#fff", 1.1, { roughness: 0.45, bump: 0.25 });
  const mStairWood = M(tx("stairW", () => X.grain("#7a4428", 4)), "#fff", 1.1, { roughness: 0.4, bump: 0.25 });
  const mOrange = M(tx("orangeW", () => X.grain("#b0642c", 5)), "#fff", 1.2, { roughness: 0.42, bump: 0.3 });
  const mDarkTable = M(tx("darkT", () => X.grain("#2e2018", 6)), "#fff", 1.2, { roughness: 0.35, bump: 0.2 });
  const mPine = M(tx("pine", () => X.grain("#b58b57", 7)), "#fff", 1.1, { roughness: 0.75, bump: 0.35 });
  const mBeam = M(tx("beam", () => X.grain("#33200f", 8)), "#fff", 1.4, { roughness: 0.6, bump: 0.4 });
  const mMahog = M(tx("mahog", () => X.grain("#4a1c12", 10)), "#fff", 1.1, { roughness: 0.35, bump: 0.2 });
  const mGold = M(null, "#d0a23c", 1, { metalness: 1, roughness: 0.25 });
  const mGoldDark = M(null, "#8a6a2a", 1, { metalness: 1, roughness: 0.35 });
  const mBrass = M(null, "#b58a3e", 1, { metalness: 0.9, roughness: 0.3 });
  const mBronze = M(null, "#6a3e1a", 1, { metalness: 0.95, roughness: 0.28 });
  const mIron = M(null, "#2a2a2d", 1, { metalness: 0.75, roughness: 0.5 });
  const mChrome = M(null, "#dfe2e5", 1, { metalness: 1, roughness: 0.12 });
  const mSteel = M(tx("steel", () => X.brushed("#b8bdc2")), "#fff", 0.9, { metalness: 0.85, roughness: 0.3, bump: 0.08 });
  const mSteelBlack = M(tx("steel", () => X.brushed("#b8bdc2")), "#3a3d40", 0.9, { metalness: 0.75, roughness: 0.4, bump: 0.08 });
  const mSteelDark = M(null, "#4a4e52", 1, { metalness: 0.8, roughness: 0.42 });
  const mBlackMetal = M(null, "#1d1e20", 1, { metalness: 0.6, roughness: 0.45 });
  // marble & stone
  const mMarble = M(tx("marble", () => X.limestone("#f1eee8", 8)), "#fff", 1.0, { roughness: 0.22, bump: 0.1 });
  const mMarbleCream = M(tx("marbleC", () => X.limestone("#e8d2ae", 9)), "#fff", 0.6, { roughness: 0.15, bump: 0.1 });
  const mMarbleDark = M(tx("marbleD", () => X.limestone("#3a3632", 11)), "#fff", 1.0, { roughness: 0.2, bump: 0.1 });
  // fabrics
  const fabTex = tx("fab", () => X.fabric("#dcdcdc", 15));
  const mVelvet = M(fabTex, "#8c1a20", 0.5, { roughness: 0.92, bump: 0.3 });
  const mBurgundy = M(fabTex, "#6a1420", 0.5, { roughness: 0.9, bump: 0.3 });
  const mLinen = M(fabTex, "#f1efe8", 0.5, { roughness: 0.9, bump: 0.25 });
  const mCurtain = M(fabTex, "#e9e7e0", 0.25, { roughness: 0.95, bump: 0.5 });
  const mLeather = M(tx("leather", () => X.leather("#6a3218")), "#fff", 0.6, { roughness: 0.45, bump: 0.3 });
  const mLeatherD = M(tx("leather", () => X.leather("#6a3218")), "#5a3a30", 0.6, { roughness: 0.45, bump: 0.3 });
  const mRedChair = M(tx("leather", () => X.leather("#6a3218")), "#e0302a", 0.6, { roughness: 0.5, bump: 0.3 });
  const mCard = M(tx("card", () => X.cardboard()), "#fff", 0.7, { roughness: 0.9, bump: 0.3 });
  const mCardD = M(tx("card", () => X.cardboard()), "#d0b894", 0.7, { roughness: 0.9, bump: 0.3 });
  const mTapeBlue = M(null, "#2a48b8", 1, { roughness: 0.35 });
  const mCrate = M(tx("crate", () => X.crateWood()), "#fff", 0.8, { roughness: 0.85, bump: 0.6 });
  const mBarrel = M(tx("barrel", () => X.barrelStaves()), "#fff", 1, { roughness: 0.7, bump: 0.5 });
  const mWeave = M(tx("weave", () => X.weave()), "#fff", 0.35, { roughness: 0.85, bump: 0.6 });
  const mMeat = M(tx("meat", () => X.meat()), "#fff", 0.25, { roughness: 0.4, bump: 0.4 });
  const mPorcelain = M(null, "#f6f5f1", 1, { roughness: 0.1 });
  const mEnamel = M(null, "#eeeeea", 1, { roughness: 0.25 });
  const mRubber = M(null, "#1b1b1c", 1, { roughness: 0.75 });
  const mDarkGlass = M(null, "#161b1f", 1, { roughness: 0.05, metalness: 0.3 });
  const mBlackGloss = M(null, "#0a0a0c", 1, { roughness: 0.1, metalness: 0.2 });
  const mIvory = M(null, "#f3efe2", 1, { roughness: 0.3 });
  const mLeaf = M(null, "#2f5a22", 1, { roughness: 0.6 });
  const mLeafD = M(null, "#1f3e18", 1, { roughness: 0.6 });
  const mSoil = M(null, "#3a2a1c", 1, { roughness: 1 });
  const mTerracotta = M(null, "#c06a48", 1, { roughness: 0.8 });
  const mPaper = M(null, "#f2eee4", 1, { roughness: 0.8 });
  const mRedPlastic = M(null, "#c01e1e", 1, { roughness: 0.3 });
  const mGreenPlastic = M(null, "#2b7a3a", 1, { roughness: 0.5 });
  const mGreyPaint = M(null, "#c9ccce", 1, { roughness: 0.4, metalness: 0.3 });
  const mBlueVase = M(tx("bvase", () => X.limestone("#1b3aa0", 12)), "#fff", 0.5, { roughness: 0.1, bump: 0.1 });
  const mBulb = M(null, "#fff1d0", 1, { emissive: "#ffd89a", emissiveIntensity: 3.5, shadow: false });
  const mTube = M(null, "#f4fbff", 1, { emissive: "#eaf6ff", emissiveIntensity: 3, shadow: false });
  const mShade = M(fabTex, "#f3e6c6", 0.4, { roughness: 0.9, emissive: "#ffcf8a", emissiveIntensity: 0.7 });
  const mOrangeShade = M(fabTex, "#e0801e", 0.4, { roughness: 0.9, emissive: "#ff8a2a", emissiveIntensity: 0.5 });
  const mGreenShade = M(null, "#12a032", 1, { roughness: 0.2, emissive: "#20c040", emissiveIntensity: 0.45 });
  const mLampWhite = M(null, "#ffffff", 1, { roughness: 0.5, emissive: "#fff8ea", emissiveIntensity: 1.6, shadow: false });
  const mWindow = M(tx("night", () => X.nightWindow()), "#fff", 1, { emissive: "#ffffff", emissiveIntensity: 0.6, roughness: 0.1 });
  const mPaint = M(tx("paint", () => X.paintingAtlas()), "#fff", 1, { roughness: 0.55, bump: 0.2 });
  const mPoster = M(tx("poster2", () => X.posterAtlas2()), "#fff", 1, { roughness: 0.7, bump: 0.15 });
  const mClock = M(tx("clock", () => X.clockFace()), "#fff", 1, { roughness: 0.4 });
  const mMirror = M(null, "#c9d2d6", 1, { metalness: 1, roughness: 0.04 });
  const mGlass = M(null, "#cfe6ee", 1, { roughness: 0.05, metalness: 0.1 });
  mGlass.m.transparent = true;
  mGlass.m.opacity = 0.25;
  mGlass.m.depthWrite = false;
  const rugMat = (key: string, f: () => X.PaintTex) => M(tx(key, f), "#fff", 1, { roughness: 0.95, bump: 0.35, shadow: false });
  const mRugA = rugMat("rugA", () => X.persianRug("#8a2a1a", "#2a1e3a", "#d9a45a", 1));
  const mRugB = rugMat("rugB", () => X.persianRug("#6a1a1e", "#1e2a44", "#c9a45a", 2));
  const mRugRed = rugMat("rugR", () => X.persianRug("#b8404a", "#8a2a34", "#d87a80", 3));
  const cloth = ["#b83227", "#2e5fd0", "#e8c547", "#f2f2f2", "#6c3d8f", "#2f8f55", "#e07b2a", "#2f3e52", "#f0a8b8", "#8cc1e6", "#c9c2b0", "#7ab0e8"].map((c) => M(fabTex, c, 0.4, { roughness: 0.95, bump: 0.35 }));
  const plastic = ["#e8e8e8", "#2a7fd4", "#e0412f", "#f2c230", "#3aa35a", "#8a4fc0", "#f07c2a", "#26b3b0"].map((c) => M(null, c, 1, { roughness: 0.35 }));
  const fruitM = ["#b3261e", "#e98a1e", "#e8d23a", "#6a9e2a", "#5a2a5a"].map((c) => M(null, c, 1, { roughness: 0.35 }));

  // instanced materials
  const partyCols = ["#e8262a", "#2a4fe0", "#f4d020", "#1fa84a", "#ee3fa0", "#30c8d8", "#f07c1a", "#8a3ad8", "#f4f4f4"];
  const mkInstMat = (o: { roughness?: number; metalness?: number; emissive?: string; emissiveIntensity?: number } = {}) => k.mat(null, "#ffffff", [1, 1], o);
  const flagMat = mkInstMat({ roughness: 0.8 });
  flagMat.m.side = THREE.DoubleSide;
  const flagGeo = (() => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute([-0.14, 0, 0, 0.14, 0, 0, 0, -0.34, 0], 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 1, 1, 1, 0.5, 0], 2)); return g; })();
  const flags = reg(flagGeo, flagMat);
  const ribbonMat = mkInstMat({ roughness: 0.25, metalness: 0.55 });
  ribbonMat.m.side = THREE.DoubleSide;
  const ribbons = reg(new THREE.PlaneGeometry(1, 1), ribbonMat);
  const balloonMat = mkInstMat({ roughness: 0.18 });
  const balloons = reg(new THREE.SphereGeometry(1, 14, 10), balloonMat, true);
  const roses = reg(new THREE.IcosahedronGeometry(1, 1), mkInstMat({ roughness: 0.7 }));
  const garlandLeaves = reg(new THREE.OctahedronGeometry(1, 0), k.mat(null, "#2c5a24", [1, 1], { roughness: 0.7 }));
  const crystals = reg(new THREE.OctahedronGeometry(1, 0), k.mat(null, "#fffaf0", [1, 1], { roughness: 0.02, metalness: 0.4, emissive: "#ffe2a8", emissiveIntensity: 0.9 }));
  const baluster = new THREE.LatheGeometry([[0.001, 0], [0.04, 0], [0.04, 0.06], [0.022, 0.12], [0.035, 0.3], [0.018, 0.55], [0.03, 0.72], [0.035, 0.8], [0.001, 0.8]].map(([a, b]) => new THREE.Vector2(a, b)), 8);
  const balusters = reg(baluster, mStairWood, true);
  // books: one instanced mesh per colour series (gold-ornament spine texture)
  const bookGeo = (() => {
    const P: number[] = [], N: number[] = [], U: number[] = [];
    const quad = (c: V3[], n: V3, uv: number[]) => { for (const i of [0, 1, 2, 0, 2, 3]) { P.push(...c[i]); N.push(...n); U.push(uv[i * 2], uv[i * 2 + 1]); } };
    const flat = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
    quad([[-0.5, 0, 0.5], [0.5, 0, 0.5], [0.5, 1, 0.5], [-0.5, 1, 0.5]], [0, 0, 1], [0, 0, 1, 0, 1, 1, 0, 1]);
    quad([[-0.5, 1, 0.5], [0.5, 1, 0.5], [0.5, 1, -0.5], [-0.5, 1, -0.5]], [0, 1, 0], flat);
    quad([[0.5, 0, 0.5], [0.5, 0, -0.5], [0.5, 1, -0.5], [0.5, 1, 0.5]], [1, 0, 0], flat);
    quad([[-0.5, 0, -0.5], [-0.5, 0, 0.5], [-0.5, 1, 0.5], [-0.5, 1, -0.5]], [-1, 0, 0], flat);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2));
    return g;
  })();
  const bookSeries = (["#23372a", "#5a1a1e", "#1c2a5c", "#2a2622", "#e8e2d0", "#3e5a3e"] as const).map((c, i) => {
    const t = tx("spine" + i, () => X.goldSpine(c, i % 4));
    X.fastNormal(t);
    return reg(bookGeo, k.mat(t, "#fff", [1, 1], { roughness: 0.6, bump: 0.2 }));
  });
  /** fill a shelf (local frame) along x from x1..x2 at height y; front at z=zf, facing +1/-1 */
  function shelfBooks(x1: number, x2: number, y: number, zf: number, facing: 1 | -1, maxH: number, maxD: number, fill = 0.85) {
    let x = x1 + 0.01;
    let run = 0, rh = 0.25, rd = 0.18, rt = 0.04, ser = bookSeries[0];
    while (x < x2 - 0.03) {
      if (run <= 0) {
        ser = pick(bookSeries); run = 6 + Math.floor(rnd() * 14);
        rh = Math.min(maxH, 0.22 + rnd() * 0.1); rd = Math.min(maxD, 0.16 + rnd() * 0.06); rt = 0.035 + rnd() * 0.02;
      }
      if (rnd() > fill) { x += 0.08 + rnd() * 0.2; run = 0; continue; }
      if (x + rt > x2) break;
      const lean = rnd() < 0.03 ? 0.35 : 0;
      const v = 0.85 + rnd() * 0.15;
      const c = new THREE.Color(v, v, v);
      ser.push({ pos: wp([x + rt / 2 + (lean ? 0.04 : 0), y, zf - (facing * rd) / 2]), rotY: xfRy + (facing === 1 ? 0 : Math.PI), rotZ: lean * -facing, scale: [rt, rh, rd], color: `#${c.getHexString()}` });
      x += rt + (lean ? 0.1 : 0.001);
      run--;
    }
  }

  // ================= generic props =================

  /** bunting along a sagging line from a to b */
  function bunting(a: V3, b: V3, sag = 0.35) {
    const len = Math.hypot(b[0] - a[0], b[2] - a[2]);
    const n = Math.max(2, Math.floor(len / 0.34));
    const ry = Math.atan2(-(b[2] - a[2]), b[0] - a[0]);
    const pts: V3[] = [];
    for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, a[2] + (b[2] - a[2]) * t]); }
    tube(mPaper, pts, 0.005, 3, 8);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      flags.push({ pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, a[2] + (b[2] - a[2]) * t], rotY: ry, rotZ: (rnd() - 0.5) * 0.12, color: pick(["#d8423a", "#3a6ac8", "#e8c040", "#4aa050", "#e87aa0", "#40b8c8", "#f0f0e8", "#8a5ac0", "#2a3a6a"]) });
    }
  }
  /** cluster of balloons around a point */
  function balloonCluster(x: number, y: number, z: number, n = 9, r = 0.35, cols = partyCols.slice(0, 4)) {
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, e = (rnd() - 0.3) * 1.2;
      const s = 0.16 + rnd() * 0.05;
      balloons.push({ pos: [x + Math.cos(a) * Math.cos(e) * r, y + Math.sin(e) * r * 0.8, z + Math.sin(a) * Math.cos(e) * r], scale: [s, s * 1.12, s], color: pick(cols) });
    }
  }
  function floorBalloon(x: number, z: number, s = 0.3) { balloons.push({ pos: [x, s * 0.95, z], scale: [s, s * 1.05, s * 1.25], rotY: rnd() * 3, rotX: Math.PI / 2 - 0.3, color: pick(["#ee3fa0", "#f4e020", "#20e0a0", "#50e030", "#f08070", "#30d0e0"]) }); k.collider(x - s, x + s, z - s, z + s, 0, s * 1.9, true); }
  /** row of hanging ribbon streamers (along local x from x1 to x2, at z, from yTop down to yBot) */
  function ribbonRow(x1: number, x2: number, z: number, yTop: number, yBot: number, alongZ = false) {
    for (let x = x1; x < x2; x += 0.07 + rnd() * 0.05) {
      const L = (yTop - yBot) * (0.75 + rnd() * 0.25);
      const w = 0.045 + rnd() * 0.02;
      const zz = z + (rnd() - 0.5) * 0.12;
      ribbons.push({ pos: alongZ ? [zz, yTop - L / 2, x] : [x, yTop - L / 2, zz], rotY: (alongZ ? Math.PI / 2 : 0) + (rnd() - 0.5) * 0.9, scale: [w, L, 1], color: pick(["#e8262a", "#2a4fe0", "#f4d020", "#1fa84a", "#30c8d8", "#e8262a", "#1fa84a", "#c0c4c8"]) });
    }
  }
  /** green garland with roses along a polyline */
  function garland(pts: V3[], roseEvery = 0.5) {
    tube(mLeafD, pts, 0.045, 5, pts.length * 4);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      const n = Math.max(1, Math.round(L / 0.12));
      for (let j = 0; j < n; j++) {
        const t = j / n;
        const p: V3 = [a[0] + (b[0] - a[0]) * t + (rnd() - 0.5) * 0.08, a[1] + (b[1] - a[1]) * t + (rnd() - 0.5) * 0.08, a[2] + (b[2] - a[2]) * t + (rnd() - 0.5) * 0.08];
        garlandLeaves.push({ pos: p, rotY: rnd() * 6, rotZ: rnd() * 3, scale: [0.07, 0.025, 0.04] });
      }
      const nr = Math.max(1, Math.round(L / roseEvery));
      for (let j = 0; j < nr; j++) {
        const t = (j + 0.5) / nr;
        const p: V3 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + 0.03, a[2] + (b[2] - a[2]) * t];
        for (let q = 0; q < 3; q++) roses.push({ pos: [p[0] + (rnd() - 0.5) * 0.12, p[1] + (rnd() - 0.5) * 0.08, p[2] + (rnd() - 0.5) * 0.12], scale: [0.05, 0.045, 0.05], rotY: rnd() * 3, color: pick(["#f4f0ea", "#d8202a", "#f4f0ea", "#e84a2a"]) });
      }
    }
  }
  /** gilded frame + canvas from the painting atlas; local frame: on wall, facing +z; y = centre */
  function painting(x: number, y: number, z: number, ry: number, w: number, h: number, cell: number) {
    grp(x, y, z, ry, () => {
      const f = 0.1;
      box(mGold, w + f * 2, f, 0.07, 0, h / 2, 0.035, { r: 0.025 });
      box(mGold, w + f * 2, f, 0.07, 0, -h / 2 - f, 0.035, { r: 0.025 });
      box(mGold, f, h, 0.07, -w / 2 - f / 2, -h / 2, 0.035, { r: 0.025 });
      box(mGold, f, h, 0.07, w / 2 + f / 2, -h / 2, 0.035, { r: 0.025 });
      box(mGoldDark, w + 0.02, 0.03, 0.04, 0, h / 2 - 0.025, 0.02);
      box(mGoldDark, w + 0.02, 0.03, 0.04, 0, -h / 2 - 0.005, 0.02);
      const cx = cell % 4, cy = Math.floor(cell / 4);
      const asp = w / h;
      const cw = asp >= 1 ? 1 : asp, ch = asp >= 1 ? 1 / asp : 1;
      plane(mPaint, w, h, 0, 0, 0.012, 0, [(cx + (1 - cw) / 2) / 4, (3 - cy + (1 - ch) / 2) / 4, cw / 4, ch / 4]);
    });
  }
  /** framed poster (cell of posterAtlas2: 0 BOOKMAN, 1 bread, 2 clown, 3 portrait); y = centre */
  function poster(x: number, y: number, z: number, ry: number, w: number, h: number, cell: number, frame: Mat | null = mWalnut) {
    grp(x, y, z, ry, () => {
      const cx = cell % 2, cy = Math.floor(cell / 2);
      if (frame) box(frame, w + 0.08, h + 0.08, 0.025, 0, -h / 2 - 0.04, 0.012);
      plane(mPoster, w, h, 0, 0, 0.028, 0, [cx / 2, (1 - cy) / 2, 0.5, 0.5]);
    });
  }
  /** wall sconce with cream fabric shade (local: on wall facing +z) */
  function sconce(x: number, y: number, z: number, ry: number) {
    grp(x, y, z, ry, () => {
      cylC(mBrass, 0.06, 0.06, 0.03, 0, -0.1, 0.015, 10, { rx: Math.PI / 2 });
      tube(mBrass, [[0, -0.1, 0.02], [0, -0.14, 0.12], [0, -0.06, 0.2]], 0.012, 5, 8);
      lathe(mShade, [[0.11, 0], [0.08, 0.2], [0.079, 0.201]], 0, -0.05, 0.2, 14);
      sph(mBulb, 0.035, 0, 0.02, 0.2, undefined, {}, 8, 6);
    });
  }
  const turnedLeg = (m: Mat, x: number, y: number, z: number, h: number, r = 0.035) =>
    lathe(m, [[r * 0.7, 0], [r, h * 0.08], [r * 0.6, h * 0.25], [r * 1.1, h * 0.5], [r * 0.6, h * 0.75], [r, h * 0.92], [r, h], [0.001, h]], x, y, z, 8);
  function plant(x: number, z: number, s = 1, pot: Mat = mBrass, y = 0, leaf: Mat = mLeaf, leaf2: Mat = mLeafD) {
    lathe(pot, [[0.001, 0], [0.16 * s, 0], [0.2 * s, 0.05 * s], [0.26 * s, 0.4 * s], [0.29 * s, 0.46 * s], [0.27 * s, 0.48 * s], [0.001, 0.47 * s]], x, y, z, 16);
    const n = 11;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd() * 0.4;
      const tilt = 0.35 + rnd() * 0.8;
      const L = (0.55 + rnd() * 0.35) * s;
      const dir = new THREE.Vector3(Math.cos(a) * Math.sin(tilt), Math.cos(tilt), Math.sin(a) * Math.sin(tilt));
      const base = new THREE.Vector3(x, y + 0.47 * s, z);
      const mid = base.clone().addScaledVector(dir, L * 0.5);
      const q = new THREE.Quaternion().setFromUnitVectors(up, dir);
      sph(i % 2 ? leaf : leaf2, 1, mid.x, mid.y, mid.z, [0.1 * s, L * 0.5, 0.025 * s], { q }, 6, 4);
    }
    col(x - 0.3 * s, x + 0.3 * s, z - 0.3 * s, z + 0.3 * s, y, y + 0.48 * s);
  }
  /** christmas plant (poinsettia) in a pot */
  function poinsettia(x: number, z: number, y = 0) {
    lathe(mGoldDark, [[0.001, 0], [0.14, 0], [0.18, 0.25], [0.001, 0.25]], x, y, z, 14);
    for (let i = 0; i < 14; i++) {
      const a = rnd() * Math.PI * 2, rr = 0.05 + rnd() * 0.2, hy = y + 0.3 + rnd() * 0.3;
      sph(i % 3 ? mRedPlastic : mLeaf, 1, x + Math.cos(a) * rr, hy, z + Math.sin(a) * rr, [0.12, 0.02, 0.06], { ry: -a, rz: 0.3 }, 6, 4);
    }
    for (let i = 0; i < 6; i++) sph(mGold, 0.025, x + (rnd() - 0.5) * 0.3, y + 0.35 + rnd() * 0.25, z + (rnd() - 0.5) * 0.3, undefined, {}, 6, 4);
    col(x - 0.25, x + 0.25, z - 0.25, z + 0.25, y, y + 0.6);
  }
  function sideTable(x: number, z: number, lamp = true, wood: Mat = mWalnut, shade: Mat = mShade) {
    lathe(wood, [[0.2, 0], [0.2, 0.03], [0.05, 0.06], [0.035, 0.3], [0.06, 0.45], [0.035, 0.6], [0.05, 0.64], [0.001, 0.64]], x, 0, z, 12);
    cyl(wood, 0.3, 0.29, 0.04, x, 0.64, z, 20);
    if (lamp) {
      lathe(mTerracotta, [[0.001, 0], [0.06, 0], [0.11, 0.08], [0.09, 0.18], [0.02, 0.22], [0.015, 0.34], [0.001, 0.34]], x, 0.68, z, 12);
      lathe(shade, [[0.2, 0], [0.12, 0.2], [0.115, 0.205]], x, 0.98, z, 16);
      sph(mBulb, 0.035, x, 1.04, z, undefined, {}, 8, 6);
    }
    col(x - 0.3, x + 0.3, z - 0.3, z + 0.3, 0, 0.68);
  }
  function floorLamp(x: number, z: number, shade: Mat = mOrangeShade) {
    lathe(mBlackMetal, [[0.001, 0], [0.2, 0], [0.18, 0.04], [0.03, 0.06], [0.015, 1.55], [0.001, 1.55]], x, 0, z, 8);
    lathe(shade, [[0.28, 0], [0.2, 0.34], [0.195, 0.345]], x, 1.4, z, 16);
    sph(mBulb, 0.04, x, 1.5, z, undefined, {}, 8, 6);
    col(x - 0.18, x + 0.18, z - 0.18, z + 0.18, 0, 1.75);
  }
  const vaseA = (x: number, y: number, z: number, s: number, m: Mat) =>
    lathe(m, [[0.001, 0], [0.1 * s, 0], [0.12 * s, 0.06 * s], [0.1 * s, 0.12 * s], [0.2 * s, 0.45 * s], [0.18 * s, 0.7 * s], [0.1 * s, 0.9 * s], [0.12 * s, 1.0 * s], [0.11 * s, 1.01 * s]], x, y, z, 16);
  /** tall cream marble urn (hallways) */
  const urn = (x: number, z: number, s = 1, m: Mat = mMarbleCream) => {
    lathe(m, [[0.001, 0], [0.16 * s, 0], [0.18 * s, 0.05 * s], [0.14 * s, 0.1 * s], [0.25 * s, 0.35 * s], [0.28 * s, 0.55 * s], [0.2 * s, 0.8 * s], [0.14 * s, 0.9 * s], [0.17 * s, 0.98 * s], [0.16 * s, 1.0 * s], [0.12 * s, 0.99 * s], [0.001, 0.6 * s]], x, 0, z, 18);
    col(x - 0.26 * s, x + 0.26 * s, z - 0.26 * s, z + 0.26 * s, 0, s);
  };
  function flowers(x: number, y: number, z: number, s = 1) {
    for (let i = 0; i < 8; i++) {
      const a = rnd() * Math.PI * 2, rr = rnd() * 0.12 * s;
      const tip: V3 = [x + Math.cos(a) * rr * 1.8, y + (0.2 + rnd() * 0.18) * s, z + Math.sin(a) * rr * 1.8];
      seg(mLeafD, [x, y, z], tip, 0.006, 0.005, 4);
      roses.push({ pos: tip, scale: [0.05 * s, 0.045 * s, 0.05 * s], color: pick(["#f4f0ea", "#d8202a", "#e84a2a"]) });
    }
  }
  /** carved dark dining chair (local front = +z) */
  function carvedChair(x: number, z: number, ry: number, seat: Mat = mBurgundy, wood: Mat = mMahog) {
    grp(x, 0, z, ry, () => {
      for (const [a, b] of [[-1, 1], [1, 1]]) turnedLeg(wood, a * 0.2, 0, b * 0.2, 0.45, 0.025);
      for (const a of [-1, 1]) box(wood, 0.05, 1.12, 0.05, a * 0.2, 0, -0.2, { rx: -0.06 });
      box(wood, 0.48, 0.06, 0.48, 0, 0.42, 0, { r: 0.015 });
      box(seat, 0.44, 0.07, 0.44, 0, 0.48, 0.01, { r: 0.03 });
      box(wood, 0.44, 0.1, 0.05, 0, 1.02, -0.23, { r: 0.02 });
      box(wood, 0.36, 0.5, 0.03, 0, 0.55, -0.22, { rx: -0.06, r: 0.01 });
      box(seat, 0.28, 0.36, 0.02, 0, 0.6, -0.2, { rx: -0.06 });
      col(-0.25, 0.25, -0.26, 0.25, 0, 0.55);
    });
  }
  /** black folding chair (library) */
  function foldingChair(x: number, z: number, ry: number) {
    grp(x, 0, z, ry, () => {
      for (const a of [-1, 1]) {
        seg(mBlackMetal, [a * 0.2, 0, 0.22], [a * 0.2, 0.95, -0.2], 0.012, 0.012, 5);
        seg(mBlackMetal, [a * 0.2, 0, -0.18], [a * 0.2, 0.45, 0.12], 0.012, 0.012, 5);
      }
      box(mRubber, 0.42, 0.03, 0.4, 0, 0.45, 0.02, { r: 0.01 });
      box(mRubber, 0.42, 0.2, 0.02, 0, 0.72, -0.14, { rx: -0.2, r: 0.008 });
      col(-0.22, 0.22, -0.22, 0.24, 0, 0.48);
    });
  }
  /** leather bench along a wall (local front +z) */
  function bench(x: number, z: number, ry: number, w = 1.6, m: Mat = mLeather) {
    grp(x, 0, z, ry, () => {
      box(m, w, 0.16, 0.5, 0, 0.3, 0, { r: 0.06 });
      box(mWalnut, w, 0.08, 0.5, 0, 0.23, 0);
      box(m, w, 0.42, 0.12, 0, 0.5, -0.22, { r: 0.05 });
      for (const a of [-1, 1]) for (const b of [-1, 1]) cyl(mWalnut, 0.03, 0.025, 0.23, a * (w / 2 - 0.08), 0, b * 0.18, 8);
      col(-w / 2, w / 2, -0.28, 0.25, 0, 0.46);
    });
  }
  /** upholstered armchair (local front = +z) */
  function armchair(x: number, z: number, ry: number, fab: Mat = mLeather, wing = false) {
    grp(x, 0, z, ry, () => {
      for (const [lx, lz] of [[-0.34, -0.33], [0.34, -0.33], [-0.34, 0.33], [0.34, 0.33]]) cyl(mWalnut, 0.03, 0.025, 0.13, lx, 0, lz, 8);
      box(fab, 0.86, 0.26, 0.82, 0, 0.13, 0, { r: 0.05 });
      box(fab, 0.58, 0.14, 0.66, 0, 0.38, 0.06, { r: 0.06 });
      box(fab, 0.84, wing ? 0.95 : 0.7, 0.2, 0, 0.36, -0.31, { r: 0.07, rx: -0.08 });
      for (const s of [-1, 1]) {
        box(fab, 0.16, 0.3, 0.74, s * 0.35, 0.38, 0.03, { r: 0.06 });
        if (wing) box(fab, 0.12, 0.5, 0.3, s * 0.38, 0.75, -0.18, { r: 0.05 });
      }
      col(-0.45, 0.45, -0.45, 0.45, 0, 0.52);
      col(-0.45, 0.45, -0.47, -0.2, 0, wing ? 1.3 : 1.06);
    });
  }
  /** round table with draped cloth (y 0.76) */
  function roundTable(x: number, z: number, cloth2: Mat, centre: "flowers" | "ham" | "vase" | "none" = "flowers") {
    lathe(cloth2, [[0.001, 0.78], [0.72, 0.78], [0.78, 0.74], [0.8, 0.55], [0.84, 0.3], [0.001, 0.3]], x, 0, z, 24);
    lathe(mMahog, [[0.35, 0], [0.35, 0.04], [0.08, 0.1], [0.06, 0.3], [0.001, 0.3]], x, 0, z, 12);
    col(x - 0.8, x + 0.8, z - 0.8, z + 0.8, 0, 0.78);
    if (centre === "flowers") { lathe(mPorcelain, [[0.001, 0], [0.06, 0], [0.09, 0.08], [0.05, 0.16], [0.07, 0.2], [0.001, 0.2]], x, 0.78, z, 12); flowers(x, 0.96, z, 1.2); }
    else if (centre === "ham") { sph(M(null, "#e8a0a0", 1, { roughness: 0.5 }), 1, x + 0.1, 0.86, z, [0.2, 0.1, 0.14], {}, 10, 8); }
    else if (centre === "vase") vaseA(x, 0.78, z, 0.5, mBlueVase);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4 + (rnd() - 0.5) * 0.3;
      const d = 1.1 + rnd() * 0.15;
      carvedChair(x + Math.cos(a) * d, z + Math.sin(a) * d, Math.atan2(-Math.cos(a), -Math.sin(a)) + (rnd() - 0.5) * 0.4);
    }
  }
  /** bookcase (local: along x centred, back at z=0) with gold-spine books */
  function bookcase(x: number, z: number, ry: number, len: number, h: number, depth: number, shelves: number, wood: Mat = mOrange, fill = 0.85, drawers = true) {
    grp(x, 0, z, ry, () => {
      const bays = Math.max(1, Math.round(len / 0.95));
      const bw = len / bays;
      const base = drawers ? 0.5 : 0.1;
      box(wood, len, base, depth, 0, 0, depth / 2);
      if (drawers) for (let b = 0; b < bays; b++) box(wood, bw - 0.12, base - 0.14, 0.02, -len / 2 + bw * (b + 0.5), 0.07, depth + 0.01, { r: 0.008 });
      box(wood, len + 0.08, 0.08, depth + 0.06, 0, h - 0.08, depth / 2 + 0.01, { r: 0.02 });
      box(wood, len, h - 0.1, 0.02, 0, 0, 0.01);
      for (let i = 0; i <= bays; i++) box(wood, 0.05, h - 0.08, depth, -len / 2 + i * bw, 0, depth / 2);
      const sp = (h - base - 0.1) / shelves;
      for (let s = 0; s < shelves; s++) {
        const y = base + s * sp;
        if (s > 0) box(wood, len, 0.03, depth, 0, y - 0.03, depth / 2);
        for (let b = 0; b < bays; b++) {
          const x1 = -len / 2 + b * bw + 0.03, x2 = x1 + bw - 0.06;
          shelfBooks(x1, x2, y, depth - 0.02, 1, sp - 0.05, depth - 0.05, fill);
        }
      }
      col(-len / 2 - 0.03, len / 2 + 0.03, 0, depth, 0, h);
    });
  }
  function cbox(w: number, h: number, d: number, x: number, y: number, z: number, ry = 0, dark = false) {
    grp(x, y, z, ry, () => {
      box(dark ? mCardD : mCard, w, h, d, 0, 0, 0, { r: 0.01 });
      box(mTapeBlue, 0.07, 0.004, d + 0.004, 0, h, 0);
      box(mTapeBlue, 0.07, 0.14, d + 0.006, 0, h - 0.14, 0);
      col(-w / 2, w / 2, -d / 2, d / 2, 0, h);
    });
  }
  const boxStack = (x: number, z: number, n: number, seed: number) => {
    const r2 = X.rng(seed);
    let y = 0;
    for (let i = 0; i < n; i++) { const w = 0.55 + r2() * 0.3, d = 0.45 + r2() * 0.25, hh = 0.38 + r2() * 0.25; cbox(w, hh, d, x + (r2() - 0.5) * 0.1, y, z + (r2() - 0.5) * 0.1, (r2() - 0.5) * 0.3, r2() < 0.4); y += hh; }
  };
  function pallet(x: number, y: number, z: number, ry = 0, rx = 0) {
    grp(x, y, z, ry, () => {
      for (const a of [-0.5, 0, 0.5]) box(mPine, 1.2, 0.1, 0.1, 0, 0.02, a * 0.9, { rx });
      for (let i = 0; i < 6; i++) box(mPine, 0.14, 0.022, 1.0, -0.52 + i * 0.208, 0.12, 0, { rx });
      if (!rx) col(-0.6, 0.6, -0.5, 0.5, 0, 0.145);
    });
  }
  function metalShelf(x: number, z: number, ry: number, len: number, h: number, d: number, levels: number, m: Mat = mBlackMetal, fillFn?: (x1: number, x2: number, y: number, d: number) => void) {
    grp(x, 0, z, ry, () => {
      for (const a of [-1, 1]) for (const b of [-1, 1]) box(m, 0.04, h, 0.04, (a * (len - 0.04)) / 2, 0, (b * (d - 0.04)) / 2);
      for (let i = 0; i < levels; i++) {
        const y = 0.12 + (i * (h - 0.16)) / (levels - 1);
        box(m, len, 0.025, d, 0, y, 0);
        box(m, len, 0.04, 0.02, 0, y - 0.02, d / 2 - 0.01);
        if (fillFn && i < levels - 1) fillFn(-len / 2 + 0.05, len / 2 - 0.05, y + 0.025, d);
      }
      col(-len / 2, len / 2, -d / 2, d / 2, 0, h);
    });
  }
  function pot(x: number, y: number, z: number, r = 0.14, h = 0.16, m: Mat = mSteel) {
    cyl(m, r, r * 0.97, h, x, y, z, 16);
    cyl(m, r + 0.008, r + 0.008, 0.012, x, y + h, z, 16);
    for (const s of [-1, 1]) torus(m, 0.03, 0.007, x + s * (r + 0.015), y + h * 0.8, z, { ry: Math.PI / 2 }, Math.PI * 2, 4, 8);
  }
  function pan(x: number, y: number, z: number, ang: number, r = 0.13) {
    cyl(mIron, r, r * 0.9, 0.05, x, y, z, 16);
    seg(mIron, [x + Math.cos(ang) * r, y + 0.04, z + Math.sin(ang) * r], [x + Math.cos(ang) * (r + 0.24), y + 0.07, z + Math.sin(ang) * (r + 0.24)], 0.012, 0.012, 5);
  }
  /** plate tower */
  function plates(x: number, y: number, z: number, n: number, r = 0.14) {
    const pts: [number, number][] = [[0.001, 0]];
    for (let i = 0; i < n; i++) { pts.push([r * 0.72, i * 0.022], [r, i * 0.022 + 0.012], [r * 0.98, i * 0.022 + 0.02]); }
    pts.push([0.001, n * 0.022]);
    lathe(mPorcelain, pts, x + (rnd() - 0.5) * 0.02, y, z, 16);
  }
  function meatLump(x: number, y: number, z: number, s = 1) {
    sph(mMeat, 1, x, y + 0.08 * s, z, [0.2 * s, 0.09 * s, 0.14 * s], { ry: rnd() * 3, uv: "native" }, 10, 7);
  }
  function gasCylinder(x: number, z: number, h = 1.3, m: Mat = mGreyPaint) {
    lathe(m, [[0.001, 0], [0.19, 0], [0.2, 0.05], [0.2, h - 0.2], [0.14, h - 0.08], [0.05, h - 0.04], [0.001, h - 0.04]], x, 0, z, 16);
    lathe(mGreyPaint, [[0.1, h - 0.06], [0.1, h + 0.12], [0.08, h + 0.12]], x, 0, z, 10);
    cyl(mRedPlastic, 0.03, 0.03, 0.05, x, h, z, 8);
    col(x - 0.2, x + 0.2, z - 0.2, z + 0.2, 0, h);
  }
  function basket(x: number, z: number, full = true) {
    lathe(mWeave, [[0.001, 0], [0.24, 0], [0.3, 0.42], [0.32, 0.45], [0.3, 0.46], [0.001, 0.44]], x, 0, z, 14, { s: [1.25, 1, 1] });
    if (full) for (let i = 0; i < 3; i++) sph(pick(cloth), 0.16, x + (rnd() - 0.5) * 0.3, 0.46 + rnd() * 0.1, z + (rnd() - 0.5) * 0.2, [1.3, 0.45, 1], { ry: rnd() * 3 }, 10, 6);
    col(x - 0.4, x + 0.4, z - 0.32, z + 0.32, 0, 0.5);
  }
  /** folded towel / linen stack */
  function linenStack(x: number, y: number, z: number, n: number, m: Mat, ry = 0) {
    let yy = y;
    for (let i = 0; i < n; i++) { box(m, 0.42, 0.055, 0.32, x + (rnd() - 0.5) * 0.03, yy, z + (rnd() - 0.5) * 0.03, { r: 0.022, ry: ry + (rnd() - 0.5) * 0.12 }); yy += 0.055; }
    return yy;
  }
  /** laundry cart: blue fabric bin in a metal X frame on castors */
  function laundryCart(x: number, z: number, ry: number) {
    grp(x, 0, z, ry, () => {
      box(cloth[1], 0.9, 0.62, 0.6, 0, 0.3, 0, { r: 0.03 });
      for (const s of [-1, 1]) { seg(mChrome, [-0.45, 0.2, s * 0.31], [0.45, 0.95, s * 0.31], 0.012, 0.012, 5); seg(mChrome, [0.45, 0.2, s * 0.31], [-0.45, 0.95, s * 0.31], 0.012, 0.012, 5); }
      box(mChrome, 0.92, 0.02, 0.62, 0, 0.92, 0);
      for (const a of [-1, 1]) for (const b of [-1, 1]) { seg(mChrome, [a * 0.44, 0.08, b * 0.28], [a * 0.44, 0.95, b * 0.28], 0.012, 0.012, 5); sph(mRubber, 0.04, a * 0.44, 0.04, b * 0.28, undefined, {}, 6, 4); }
      sph(M(null, "#9aa0a8", 1, { roughness: 0.2, metalness: 0.2 }), 1, 0, 0.95, 0, [0.35, 0.18, 0.25], {}, 10, 6);
      col(-0.47, 0.47, -0.32, 0.32, 0, 0.95);
    });
  }
  /** rearing horse statue; local: horse faces +x, y = plinth top */
  function rearingHorse(x: number, y: number, z: number, ry: number, S: number, m: Mat) {
    grp(x, y, z, ry, () => {
      const th = 0.85, c = Math.cos(th), s = Math.sin(th);
      const PX = -0.6, PY = 1.05;
      const R = (px: number, py: number, pz: number): V3 => { const dx = px - PX, dy = py - PY; return [(PX + dx * c - dy * s) * S, (PY + dx * s + dy * c) * S, pz * S]; };
      const E = (cc: V3, r: V3, rz = 0) => sph(m, 1, ...R(...cc), [r[0] * S, r[1] * S, r[2] * S], { rz: th + rz }, 18, 12);
      const W = (p: V3): V3 => [p[0] * S, p[1] * S, p[2] * S];
      // torso
      E([0, 1.25, 0], [0.7, 0.34, 0.29]);
      E([0.48, 1.25, 0], [0.36, 0.38, 0.28]);
      E([-0.5, 1.22, 0], [0.38, 0.36, 0.3]);
      // neck & head (leaning forward)
      const nb = R(0.62, 1.42, 0);
      const nt: V3 = [nb[0] + 0.3 * S, nb[1] + 0.55 * S, 0];
      seg(m, nb, nt, 0.24 * S, 0.14 * S, 12);
      sph(m, 1, nb[0] + 0.1 * S, nb[1] + 0.2 * S, 0, [0.22 * S, 0.3 * S, 0.19 * S], { rz: -0.5 }, 14, 10);
      const hd: V3 = [nt[0] + 0.1 * S, nt[1] + 0.02 * S, 0];
      sph(m, 1, hd[0], hd[1], 0, [0.15 * S, 0.12 * S, 0.1 * S], {}, 12, 8);
      seg(m, hd, [hd[0] + 0.3 * S, hd[1] - 0.2 * S, 0], 0.1 * S, 0.07 * S, 10);
      sph(m, 1, hd[0] + 0.3 * S, hd[1] - 0.21 * S, 0, [0.08 * S, 0.075 * S, 0.075 * S], {}, 10, 8);
      for (const sd of [-1, 1]) seg(m, [hd[0] - 0.04 * S, hd[1] + 0.08 * S, sd * 0.05 * S], [hd[0] - 0.06 * S, hd[1] + 0.24 * S, sd * 0.06 * S], 0.035 * S, 0.006 * S, 6);
      // mane
      seg(m, [nb[0] - 0.08 * S, nb[1] + 0.1 * S, 0], [nt[0] - 0.08 * S, nt[1] + 0.1 * S, 0], 0.07 * S, 0.05 * S, 8);
      // front legs, raised and folded
      for (const sd of [-1, 1]) {
        const sh = R(0.55, 1.05, sd * 0.14);
        const kn: V3 = [sh[0] + (0.34 + (sd > 0 ? 0 : 0.08)) * S, sh[1] - 0.12 * S, sd * 0.14 * S];
        const hf: V3 = [kn[0] + 0.02 * S, kn[1] - 0.42 * S, sd * 0.14 * S];
        seg(m, sh, kn, 0.1 * S, 0.065 * S, 10);
        seg(m, kn, hf, 0.055 * S, 0.05 * S, 10);
        sph(m, 0.065 * S, hf[0], hf[1], hf[2], [1, 1.1, 1], {}, 8, 6);
      }
      // hind legs standing
      for (const sd of [-1, 1]) {
        const hip = R(-0.58, 1.05, sd * 0.16);
        E([-0.58, 1.1, sd * 0.16], [0.26, 0.32, 0.13]);
        const hock = W([-0.95, 0.42, sd * 0.16]);
        const hoof = W([-0.72 + (sd > 0 ? 0 : 0.1), 0.06, sd * 0.16]);
        seg(m, hip, hock, 0.13 * S, 0.06 * S, 10);
        seg(m, hock, hoof, 0.055 * S, 0.05 * S, 10);
        seg(m, hoof, [hoof[0] + 0.05 * S, 0, hoof[2]], 0.07 * S, 0.075 * S, 10);
      }
      // tail down to the plinth (support)
      const tb = R(-1.02, 1.3, 0);
      tube(m, [tb, [tb[0] - 0.2 * S, tb[1] - 0.4 * S, 0.02 * S], [tb[0] - 0.25 * S, 0.5 * S, 0.03 * S], [tb[0] - 0.15 * S, 0.02, 0]], 0.07 * S, 8, 24);
      col(-1.5 * S, 0.9 * S, -0.35 * S, 0.35 * S, 0, 2.6 * S);
    });
  }

  // ================= walls =================
  function archShape(w: number, hs: number, rise: number, top: number) {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, hs);
    const n = 16;
    for (let i = 1; i <= n; i++) { const a = Math.PI - (Math.PI * i) / n; s.lineTo((w / 2) * Math.cos(a), hs + rise * Math.sin(a)); }
    s.lineTo(w / 2, top);
    s.lineTo(-w / 2, top);
    s.lineTo(-w / 2, hs);
    return s;
  }
  function archBand(w: number, hs: number, rise: number, t: number) {
    const s = new THREE.Shape();
    const n = 16;
    for (let i = 0; i <= n; i++) { const a = (Math.PI * i) / n; const x = (w / 2 + t) * Math.cos(a), y = hs + (rise + t) * Math.sin(a); if (i === 0) s.moveTo(x, y); else s.lineTo(x, y); }
    for (let i = n; i >= 0; i--) { const a = (Math.PI * i) / n; s.lineTo((w / 2) * Math.cos(a), hs + rise * Math.sin(a)); }
    return s;
  }
  function wall(ax: "x" | "z", at: number, a1: number, a2: number, neg: Side, pos: Side, doors: Door[] = []) {
    const Hh = Math.max(neg?.ch ?? 0, pos?.ch ?? 0);
    const place = (m: Mat, u1: number, u2: number, y1: number, y2: number, n1: number, n2: number) => {
      const w = u2 - u1, h = y2 - y1, d = Math.abs(n2 - n1), cu = (u1 + u2) / 2, cn = at + (n1 + n2) / 2;
      if (w <= 0.001 || h <= 0.001) return;
      if (ax === "x") box(m, w, h, d, cu, y1, cn);
      else box(m, d, h, w, cn, y1, cu);
    };
    const sides: [number, Side][] = [[-1, neg], [1, pos]];
    const slab = (u1: number, u2: number, y1: number, y2: number) => {
      for (const [s, sd] of sides) place(sd ? sd.m : mExt, u1, u2, y1, Math.min(y2, sd ? sd.ch + 0.02 : y2), 0, s * 0.15);
      if (ax === "x") col(u1, u2, at - 0.15, at + 0.15, y1, y2);
      else col(at - 0.15, at + 0.15, u1, u2, y1, y2);
    };
    const trims = (u1: number, u2: number) => {
      for (const [s, sd] of sides) {
        if (!sd || sd.trim === "none") continue;
        const f = s * 0.15;
        const L = u2 - u1;
        if (sd.trim === "wains") {
          place(mWalnut, u1, u2, 0, 1.05, f, f + s * 0.02);
          const cnt = Math.max(1, Math.round((L - 0.1) / 0.9));
          const pw = (L - 0.12 * (cnt + 1)) / cnt;
          if (pw > 0.2) for (let i = 0; i < cnt; i++) { const p1 = u1 + 0.12 + i * (pw + 0.12); place(mWalnutL, p1, p1 + pw, 0.28, 0.9, f + s * 0.02, f + s * 0.035); }
          place(mWalnut, u1, u2, 1.02, 1.1, f, f + s * 0.06);
          place(mWalnut, u1, u2, 0, 0.18, f, f + s * 0.045);
        } else place(mWalnut, u1, u2, 0, 0.2, f, f + s * 0.035);
      }
    };
    for (const [s, sd] of sides) {
      if (!sd || sd.trim === "none") continue;
      const f = s * 0.15;
      place(mWalnut, a1 + 0.15, a2 - 0.15, sd.ch - 0.2, sd.ch, f, f + s * 0.09);
      place(mWalnut, a1 + 0.15, a2 - 0.15, sd.ch - 0.32, sd.ch - 0.2, f, f + s * 0.04);
    }
    let cur = a1;
    for (const d of [...doors].sort((p, q) => p.c - q.c)) {
      const e1 = d.c - d.w / 2, e2 = d.c + d.w / 2;
      if (e1 - cur > 0.01) { slab(cur, e1, 0, Hh); trims(cur === a1 ? cur + 0.15 : cur, e1); }
      const top = d.arch ? d.arch[0] + d.arch[1] : d.h ?? 2.4;
      slab(e1, e2, top, Hh);
      const jh = d.arch ? d.arch[0] : top;
      place(mWalnut, e1 - 0.1, e1 + 0.04, 0, jh, -0.2, 0.2);
      place(mWalnut, e2 - 0.04, e2 + 0.1, 0, jh, -0.2, 0.2);
      if (d.arch) {
        const [hs, rise] = d.arch;
        for (const [s, sd] of sides) {
          const sh = archShape(d.w, hs, rise, top + 0.02);
          if (ax === "x") extr(sd ? sd.m : mExt, sh, 0.15, d.c, 0, at + s * 0.075);
          else extr(sd ? sd.m : mExt, sh, 0.15, at + s * 0.075, 0, d.c, { ry: -Math.PI / 2 });
        }
        const band = archBand(d.w - 0.08, hs, rise - 0.04, 0.16);
        if (ax === "x") extr(mWalnut, band, 0.4, d.c, 0, at);
        else extr(mWalnut, band, 0.4, at, 0, d.c, { ry: -Math.PI / 2 });
      } else place(mWalnut, e1 - 0.1, e2 + 0.1, top - 0.04, top + 0.16, -0.2, 0.2);
      cur = e2;
    }
    if (a2 - cur > 0.01) { slab(cur, a2, 0, Hh); trims(cur === a1 ? cur + 0.15 : cur, a2 - 0.15); }
  }
  /** closed decorative panel door flat against a wall (local: on wall facing +z) */
  function fakeDoor(x: number, z: number, ry: number) {
    grp(x, 0, z, ry, () => {
      box(mWalnut, 1.3, 2.45, 0.08, 0, 0, 0.04);
      box(mMahog, 1.05, 2.25, 0.06, 0, 0, 0.1, { r: 0.01 });
      for (const [py, ph] of [[0.2, 0.9], [1.25, 0.85]]) for (const px of [-0.25, 0.25]) box(mWalnutL, 0.36, ph, 0.03, px, py, 0.14, { r: 0.01 });
      sph(mBrass, 0.04, 0.4, 1.0, 0.16, undefined, {}, 8, 6);
    });
  }

  // ================= layout =================
  const H = { ball: 8, hall: 4.0, foy: 4.4, lib: 5.0, kit: 4.2, cold: 3.6, lau: 3.4, brick: 4.0, blue: 4.0, red: 4.0, bath: 3.6 };
  const S: Record<string, Side> = {
    hall: { m: mDamGreen, ch: H.hall, trim: "wains" },
    foy: { m: mDamGreen, ch: H.foy, trim: "wains" },
    ball: { m: mBallPanel, ch: H.ball, trim: "base" },
    lib: { m: mLibPanel, ch: H.lib, trim: "none" },
    kit: { m: mRelief, ch: H.kit, trim: "none" },
    cold: { m: mReliefGrey, ch: H.cold, trim: "none" },
    lau: { m: mLauPaper, ch: H.lau, trim: "wains" },
    brick: { m: mBrick, ch: H.brick, trim: "none" },
    blue: { m: mDamBlue, ch: H.blue, trim: "wains" },
    red: { m: mDamRed, ch: H.red, trim: "wains" },
    bath: { m: mGreenTile, ch: H.bath, trim: "none" },
  };
  // exterior
  wall("x", -23, -28, -10, null, S.lib);
  wall("x", -23, -10, 2, null, S.red);
  wall("x", -23, 2, 13.5, null, S.blue);
  wall("x", -23, 13.5, 28, null, S.bath);
  wall("x", 23, -28, -10, S.cold, null);
  wall("x", 23, -10, 10, S.foy, null);
  wall("x", 23, 10, 13.5, S.hall, null);
  wall("x", 23, 13.5, 28, S.brick, null);
  wall("z", -28, -23, -2, null, S.lib);
  wall("z", -28, -2, 13, null, S.kit);
  wall("z", -28, 13, 23, null, S.cold);
  wall("z", 28, -23, -14, S.bath, null);
  wall("z", 28, -14, -10.5, S.hall, null);
  wall("z", 28, -10.5, 6, S.lau, null);
  wall("z", 28, 6, 23, S.brick, null);
  // interior
  wall("z", -10, -23, -14, S.lib, S.red);
  wall("z", -10, -14, -10.5, S.lib, S.hall, [{ c: -12.25, w: 1.8 }]);
  wall("z", -10, -10.5, -2, S.lib, S.ball);
  wall("z", -10, -2, 13, S.kit, S.ball, [{ c: 8.2, w: 2.0 }]);
  wall("z", -10, 13, 23, S.cold, S.foy, [{ c: 18, w: 1.8 }]);
  wall("x", -14, -10, 2, S.red, S.hall, [{ c: -4, w: 1.8 }]);
  wall("x", -14, 2, 13.5, S.blue, S.hall, [{ c: 8, w: 1.8 }]);
  wall("x", -14, 13.5, 28, S.bath, S.hall, [{ c: 21, w: 1.6 }]);
  wall("z", 2, -23, -14, S.red, S.blue, [{ c: -18.5, w: 1.6 }]);
  wall("z", 13.5, -23, -14, S.blue, S.bath);
  wall("z", 13.5, -10.5, 6, S.hall, S.lau, [{ c: -2, w: 1.8 }]);
  wall("z", 13.5, 6, 23, S.hall, S.brick, [{ c: 15, w: 1.8 }]);
  wall("x", -10.5, -10, 10, S.hall, S.ball, [{ c: -5, w: 2.2 }, { c: 5, w: 2.2 }]);
  wall("x", -10.5, 13.5, 28, S.hall, S.lau);
  wall("z", 10, -10.5, 13, S.ball, S.hall, [{ c: -3, w: 2.2 }, { c: 8, w: 2.2 }]);
  wall("z", 10, 13, 23, S.foy, S.hall, [{ c: 18, w: 1.8 }]);
  wall("x", -2, -28, -10, S.lib, S.kit, [{ c: -15, w: 1.8 }]);
  wall("x", 13, -28, -10, S.kit, S.cold, [{ c: -22, w: 1.8 }]);
  wall("x", 13, -10, 10, S.ball, S.foy, [{ c: 0, w: 5, arch: [3.0, 1.3] }]);
  wall("x", 6, 13.5, 28, S.lau, S.brick, [{ c: 24, w: 1.8 }]);

  // floors & ceilings
  const floor = (m: Mat, x1: number, x2: number, z1: number, z2: number, o: PO = {}) => box(m, x2 - x1, 0.2, z2 - z1, (x1 + x2) / 2, -0.2, (z1 + z2) / 2, o);
  const ceil = (m: Mat, x1: number, x2: number, z1: number, z2: number, h: number) => box(m, x2 - x1, 0.2, z2 - z1, (x1 + x2) / 2, h, (z1 + z2) / 2);
  floor(mMarbleFloor, -10, 10, -10.5, 13);
  floor(mChecker, -10, 28, -14, -10.5);
  floor(mChecker, 10, 13.5, -10.5, 23);
  floor(mChecker, -10, 10, 13, 23);
  floor(mChecker, -10, 2, -23, -14);
  floor(mHerring, 2, 13.5, -23, -14, { swap: true });
  floor(mMarbleBath, 13.5, 28, -23, -14);
  floor(mFloorLib, -28, -10, -23, -2);
  floor(mHex, -28, -10, -2, 13);
  floor(mHexDark, -28, -10, 13, 23);
  floor(mChecker, 13.5, 28, -10.5, 6);
  floor(mConcrete, 13.5, 28, 6, 23);
  ceil(mPlasterW, -10, 10, -10.5, 13, H.ball);
  ceil(mCeilDark, -10, 28, -14, -10.5, H.hall);
  ceil(mCeilDark, 10, 13.5, -10.5, 23, H.hall);
  ceil(mCeilDark, -10, 10, 13, 23, H.foy);
  ceil(mPlasterW, -10, 2, -23, -14, H.red);
  ceil(mPlasterW, 2, 13.5, -23, -14, H.blue);
  ceil(mPlasterW, 13.5, 28, -23, -14, H.bath);
  ceil(mCeilDark, -28, -10, -23, -2, H.lib);
  ceil(mPlasterW, -28, -10, -2, 13, H.kit);
  ceil(mPlasterW, -28, -10, 13, 23, H.cold);
  ceil(mCeilDark, 13.5, 28, -10.5, 6, H.lau);
  ceil(mCeilDark, 13.5, 28, 6, 23, H.brick);

  k.room("Grand Ballroom", -10, 10, -10.5, 13);
  k.room("Entrance Hall", -10, 10, 13, 23);
  k.room("North Hallway", -10, 28, -14, -10.5);
  k.room("East Hallway", 10, 13.5, -10.5, 23);
  k.room("Storage Room", -10, 2, -23, -14);
  k.room("Blue Room", 2, 13.5, -23, -14);
  k.room("Bathroom", 13.5, 28, -23, -14);
  k.room("Library", -28, -10, -23, -2);
  k.room("Kitchen", -28, -10, -2, 13);
  k.room("Cold Storage", -28, -10, 13, 23);
  k.room("Laundry Basement", 13.5, 28, -10.5, 6);
  k.room("Brick Basement", 13.5, 28, 6, 23);

  // ================= GRAND BALLROOM =================
  {
    const DECK = 3.8, BZ = -7.6; // balcony height and front edge
    // coffered ceiling: dark beams
    for (let x = -7.5; x <= 7.6; x += 2.5) { box(mBeam, 0.3, 0.4, 23.2, x, H.ball - 0.4, 1.25); }
    for (let z = -8; z <= 11; z += 2.5) box(mBeam, 19.7, 0.4, 0.3, 0, H.ball - 0.4, z);
    // balcony deck along the north wall
    box(mStairWood, 20, 0.22, 2.9, 0, DECK - 0.22, -9.05);
    box(mWalnut, 20, 0.3, 0.12, 0, DECK - 0.45, BZ + 0.02);
    k.collider(-10, 10, -10.5, BZ, DECK - 0.22, DECK, true);
    for (const x of [-7.8, -3.2, 1.4, 6.0]) { box(mWalnut, 0.3, DECK - 0.22, 0.3, x, 0, BZ + 0.18, { r: 0.02 }); box(mWalnut, 0.42, 0.25, 0.42, x, 0, BZ + 0.18); col(x - 0.2, x + 0.2, BZ - 0.02, BZ + 0.38, 0, DECK - 0.22); }
    // railing with balusters + garland + balloons
    const railPts = (x1: number, x2: number) => { for (let x = x1 + 0.12; x < x2; x += 0.2) balusters.push({ pos: [x, DECK, BZ + 0.1], scale: [1, 1.1, 1] }); box(mStairWood, x2 - x1, 0.08, 0.14, (x1 + x2) / 2, DECK + 0.88, BZ + 0.1, { r: 0.02 }); };
    railPts(-7.85, 9.85);
    k.collider(-7.85, 9.85, BZ, BZ + 0.2, DECK, DECK + 0.96, true);
    for (const x of [-7.8, -3.2, 1.4, 6.0, 9.7]) { box(mStairWood, 0.16, 1.1, 0.16, x, DECK, BZ + 0.1); sph(mStairWood, 0.08, x, DECK + 1.18, BZ + 0.1, undefined, {}, 8, 6); }
    garland([[-7.8, DECK + 0.95, BZ + 0.2], [-5.5, DECK + 0.7, BZ + 0.25], [-3.2, DECK + 0.95, BZ + 0.2], [-0.9, DECK + 0.7, BZ + 0.25], [1.4, DECK + 0.95, BZ + 0.2], [3.7, DECK + 0.7, BZ + 0.25], [6.0, DECK + 0.95, BZ + 0.2], [7.9, DECK + 0.7, BZ + 0.25], [9.7, DECK + 0.95, BZ + 0.2]]);
    for (const x of [-5.5, -0.9, 3.7, 7.9]) balloonCluster(x, DECK + 0.55, BZ + 0.35, 11, 0.38);
    // ribbon streamer curtains hanging from the balcony + white curtains
    for (const [x1, x2] of [[-7.6, -3.4], [-3.0, 1.2], [1.6, 5.8], [6.2, 9.8]]) ribbonRow(x1, x2, BZ + 0.3, DECK - 0.3, 0.25);
    for (const x of [-3.2, 1.4, 6.0]) for (const s of [-1, 1]) for (let f = 0; f < 3; f++) cyl(mCurtain, 0.08, 0.1, DECK - 0.5, x + s * (0.28 + f * 0.13), 0.02, BZ + 0.45, 8);
    // upper wall ribbons above the balcony
    ribbonRow(-7.5, 9.6, -10.25, 7.4, 4.6);
    for (const x of [-6, -1, 4, 8.5]) balloonCluster(x, 7.2, -10.0, 10, 0.4);
    // grand staircase along the west wall: bottom at z 2.4, top reaches the balcony
    const SX1 = -9.85, SX2 = -7.85, nSteps = 20, rise = DECK / nSteps, tread = (2.4 - BZ) / nSteps;
    for (let i = 0; i < nSteps; i++) {
      const top = (i + 1) * rise, z2 = 2.4 - i * tread, z1 = z2 - tread;
      box(mStairWood, SX2 - SX1, rise, tread + 0.02, (SX1 + SX2) / 2, top - rise, (z1 + z2) / 2);
      box(mWalnut, SX2 - SX1, 0.03, 0.04, (SX1 + SX2) / 2, top - 0.02, z2 + 0.01);
      k.collider(SX1, SX2, z1, z2, 0, top, true);
    }
    // stringer + side panel under the stairs
    const stringer = new THREE.Shape();
    stringer.moveTo(2.4, 0); stringer.lineTo(BZ, DECK); stringer.lineTo(BZ, 0); stringer.lineTo(2.4, 0);
    extr(mBallPanel, stringer, 0.1, SX2 + 0.05, 0, 0, { ry: -Math.PI / 2 });
    // balustrade
    const railA: V3 = [SX2 + 0.05, 1.05, 2.3], railB: V3 = [SX2 + 0.05, DECK + 0.95, BZ + 0.1];
    for (let i = 0; i < nSteps * 2; i++) { const t = (i + 0.5) / (nSteps * 2); balusters.push({ pos: [SX2 + 0.05, t * DECK, 2.4 - t * (2.4 - BZ)], scale: [1, 1.15, 1] }); }
    seg(mStairWood, railA, railB, 0.045, 0.045, 8);
    box(mStairWood, 0.26, 1.25, 0.26, SX2 + 0.05, 0, 2.45, { r: 0.03 });
    sph(mStairWood, 0.12, SX2 + 0.05, 1.37, 2.45, undefined, {}, 10, 8);
    k.collider(SX2 - 0.05, SX2 + 0.15, BZ, 2.6, 0, 1.2, true);
    garland([[SX2 + 0.1, 1.25, 2.4], [SX2 + 0.15, 1.6, 0.8], [SX2 + 0.1, 2.2, -1.6], [SX2 + 0.15, 2.8, -4.2], [SX2 + 0.1, 3.4, -6.5], [SX2 + 0.1, DECK + 1.0, BZ + 0.1]], 0.7);
    balloonCluster(SX2 + 0.2, 1.7, 2.4, 9, 0.3);
    // white marble rearing horse beside the foot of the stairs
    box(mMarble, 1.5, 0.35, 0.9, -6.4, 0, 3.8, { r: 0.02 });
    col(-7.15, -5.65, 3.35, 4.25, 0, 0.35);
    rearingHorse(-6.2, 0.35, 3.8, 0, 0.82, mMarble);
    // grand piano on an oriental rug
    box(mRugA, 4.2, 0.014, 3.2, -4.3, 0, -4.2, { uv: "native" });
    grp(-4.3, 0, -4.3, Math.PI * 0.55, () => {
      const body = new THREE.Shape();
      body.moveTo(-0.75, 0); body.lineTo(0.75, 0); body.lineTo(0.75, 0.8);
      body.bezierCurveTo(0.75, 1.45, 0.5, 1.7, 0.2, 1.9);
      body.bezierCurveTo(0.0, 2.0, -0.45, 1.9, -0.55, 1.5);
      body.bezierCurveTo(-0.62, 1.1, -0.75, 0.9, -0.75, 0.6);
      body.lineTo(-0.75, 0);
      extr(mBlackGloss, body, 0.3, 0, 0.9, 0, { rx: Math.PI / 2 }, 0.01);
      put(mBlackGloss, new THREE.ShapeGeometry(body, 6), [0, 1.08, 0.0], { rx: Math.PI / 2 - 0.55, uv: "tri" });
      seg(mBlackGloss, [0.55, 1.05, 1.3], [0.45, 1.75, 1.0], 0.012, 0.012, 5);
      for (const [lx, lz] of [[-0.62, 0.15], [0.62, 0.15], [0.0, 1.75]]) lathe(mBlackGloss, [[0.06, 0], [0.05, 0.1], [0.07, 0.4], [0.09, 0.6], [0.1, 0.75], [0.001, 0.75]], lx, 0, lz, 10);
      box(mBlackGloss, 1.5, 0.12, 0.3, 0, 0.72, -0.14, { r: 0.01 });
      box(mIvory, 1.3, 0.03, 0.15, 0, 0.84, -0.2);
      for (let i = 0; i < 26; i++) if (i % 7 !== 2 && i % 7 !== 6) box(mBlackGloss, 0.022, 0.02, 0.09, -0.63 + i * 0.05, 0.86, -0.17);
      box(mBlackGloss, 1.3, 0.25, 0.04, 0, 0.9, -0.03);
      box(mBlackGloss, 0.9, 0.3, 0.02, 0, 1.05, 0.05, { rx: -0.2 });
      col(-0.8, 0.8, -0.3, 2.0, 0, 1.08);
      box(mBurgundy, 0.8, 0.08, 0.35, 0, 0.44, -0.72, { r: 0.02 });
      for (const a of [-1, 1]) for (const b of [-1, 1]) cyl(mBlackGloss, 0.02, 0.02, 0.44, a * 0.34, 0, -0.72 + b * 0.13, 6);
      col(-0.4, 0.4, -0.9, -0.54, 0, 0.52);
    });
    // round tables
    roundTable(6.8, -4.6, mLinen, "flowers");
    roundTable(1.6, -5.0, mBurgundy, "vase");
    roundTable(7.3, 3.8, mLinen, "ham");
    roundTable(6.4, 9.9, mBurgundy, "flowers");
    roundTable(0.8, 10.2, mLinen, "flowers");
    roundTable(-5.2, 9.4, mBurgundy, "vase");
    box(mRugB, 3.6, 0.014, 2.6, 6.8, 0, -4.6, { uv: "native" });
    // white columns flanking the entrance arch and the east doors
    for (const [x, z] of [[-3.6, 12.2], [3.6, 12.2], [9.2, -6.2], [9.2, 11.4]] as const) {
      box(mMarble, 0.8, 0.3, 0.8, x, 0, z, { r: 0.02 });
      lathe(mMarble, [[0.34, 0.3], [0.34, 0.36], [0.3, 0.42], [0.27, 0.5], [0.24, 4.6], [0.3, 4.72], [0.26, 4.8], [0.001, 4.8]], x, 0, z, 20);
      box(mMarble, 0.85, 0.16, 0.85, x, 4.8, z, { r: 0.02 });
      for (const s of [-1, 1]) cylC(mMarble, 0.1, 0.1, 0.8, x + s * 0.34, 4.74, z, 12, { rx: Math.PI / 2 });
      col(x - 0.4, x + 0.4, z - 0.4, z + 0.4, 0, 4.96);
      balloonCluster(x, 5.2, z, 7, 0.3, ["#f4d020", "#f4d020", "#2a4fe0", "#e8262a"]);
    }
    bunting([-3.6, 4.7, 12.2], [3.6, 4.7, 12.2], 0.4);
    bunting([9.2, 4.7, -6.2], [9.2, 4.7, 11.4], 0.9);
    bunting([-7.8, 3.5, BZ + 0.2], [6.0, 3.5, BZ + 0.2], 0.3);
    // crystal chandeliers
    for (const cx of [-4.5, 0.5, 5.5]) {
      const cz = 2.6, cy = 5.4;
      cyl(mBrass, 0.02, 0.02, H.ball - cy - 1.2, cx, cy + 1.2, cz, 6);
      lathe(mBrass, [[0.001, -0.3], [0.08, -0.25], [0.12, -0.1], [0.06, 0], [0.1, 0.4], [0.05, 0.9], [0.08, 1.2], [0.001, 1.22]], cx, cy, cz, 12);
      for (const [R, yy, nArm] of [[0.95, 0.15, 12], [0.62, 0.6, 9], [0.35, 1.0, 6]] as const) {
        torus(mBrass, R, 0.02, cx, cy + yy, cz, { rx: Math.PI / 2 }, Math.PI * 2, 5, 28);
        for (let i = 0; i < nArm; i++) {
          const a = (i / nArm) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
          sph(mBulb, 0.035, cx + c * R, cy + yy + 0.12, cz + s * R, [1, 1.5, 1], {}, 6, 4);
          for (let d = 0; d < 3; d++) crystals.push({ pos: [cx + c * R, cy + yy - 0.07 - d * 0.1, cz + s * R], scale: [0.03, 0.05, 0.03], rotY: a });
        }
        for (let i = 0; i < nArm * 2; i++) {
          const a = ((i + 0.5) / (nArm * 2)) * Math.PI * 2;
          const sagY = cy + yy - 0.12;
          crystals.push({ pos: [cx + Math.cos(a) * R * 0.9, sagY, cz + Math.sin(a) * R * 0.9], scale: [0.022, 0.04, 0.022], rotY: a });
        }
      }
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; crystals.push({ pos: [cx + Math.cos(a) * 0.2, cy - 0.35 - (i % 3) * 0.06, cz + Math.sin(a) * 0.2], scale: [0.03, 0.08, 0.03] }); }
      crystals.push({ pos: [cx, cy - 0.5, cz], scale: [0.06, 0.14, 0.06] });
    }
    // wall sconces & paintings
    for (const z of [-3, 5.5]) sconce(-9.83, 2.4, z, Math.PI / 2);
    for (const z of [-6.5, 1.8, 11.8]) sconce(9.83, 2.4, z, -Math.PI / 2);
    for (const x of [-7, 7]) sconce(x, 2.6, 12.83, Math.PI);
    painting(9.83, 5.4, 2.4, -Math.PI / 2, 3.0, 2.0, 4);
    painting(-9.83, 5.8, 7.8, Math.PI / 2, 1.8, 2.2, 1);
    painting(-6.5, 3.0, 12.83, Math.PI, 1.4, 1.0, 12);
    painting(6.8, 3.0, 12.83, Math.PI, 1.4, 1.0, 14);
    // floor balloons & a tea cart
    for (const [x, z] of [[-1.2, 1.0], [-2.5, 6.8], [4.4, -0.9], [4.5, 7.6], [-7.2, -1.2], [9.2, 6.8], [-2.8, 11.6], [2.9, -2.4]] as const) floorBalloon(x, z, 0.26 + rnd() * 0.08);
    grp(-1.8, 0, -7.0, 0.3, () => {
      box(mGold, 1.0, 0.03, 0.55, 0, 0.78, 0);
      box(mGlass, 0.96, 0.01, 0.5, 0, 0.8, 0);
      box(mGold, 1.0, 0.03, 0.55, 0, 0.3, 0);
      for (const a of [-1, 1]) for (const b of [-1, 1]) seg(mGold, [a * 0.48, 0.1, b * 0.26], [a * 0.48, 0.8, b * 0.26], 0.012, 0.012, 5);
      for (const s of [-1, 1]) { torus(mGold, 0.22, 0.02, s * 0.35, 0.24, 0.3, {}, Math.PI * 2, 5, 18); torus(mGold, 0.22, 0.02, s * 0.35, 0.24, -0.3, {}, Math.PI * 2, 5, 18); }
      lathe(mPorcelain, [[0.001, 0], [0.07, 0], [0.09, 0.12], [0.06, 0.2], [0.07, 0.24], [0.001, 0.22]], 0.2, 0.81, 0, 12);
      lathe(mBlueVase, [[0.001, 0], [0.06, 0], [0.1, 0.18], [0.04, 0.34], [0.06, 0.42], [0.001, 0.42]], -0.25, 0.81, 0, 12);
      col(-0.55, 0.55, -0.32, 0.32, 0, 0.82);
    });
  }

  // ================= HALLWAYS (green damask, checker floor, bunting) =================
  {
    // north hallway z -14 .. -10.5
    for (let x = -10; x < 28; x += 5.5) bunting([x, 3.6, -13.8], [Math.min(28, x + 5.5), 3.6, -10.7], 0.35);
    for (let x = -7.25; x < 28; x += 5.5) bunting([x, 3.6, -10.7], [Math.min(28, x + 5.5), 3.6, -13.8], 0.35);
    for (const x of [-7.5, -1, 11.5, 17.5, 25.5]) sconce(x, 2.3, -13.83, 0);
    for (const x of [-7.5, 0, 8, 17, 24]) sconce(x, 2.3, -10.67, Math.PI);
    painting(-1.2, 1.9, -13.83, 0, 0.9, 1.2, 9);
    painting(2.2, 2.0, -10.67, Math.PI, 1.3, 0.95, 2);
    painting(14.5, 2.0, -13.83, 0, 1.1, 1.4, 5);
    painting(26.3, 2.0, -13.83, 0, 0.8, 1.0, 13);
    painting(20.5, 2.0, -10.67, Math.PI, 1.3, 1.0, 6);
    poster(-6.5, 1.9, -10.67, Math.PI, 0.5, 0.7, 3);
    poster(11.2, 2.0, -13.83, 0, 0.5, 0.7, 3);
    bench(-7.8, -13.55, 0, 1.6);
    bench(3.2, -13.55, 0, 1.6);
    bench(24.0, -10.95, Math.PI, 1.6, mLeatherD);
    urn(-1.9, -13.4, 1.05);
    urn(18.7, -10.95, 0.9);
    fakeDoor(15.8, -10.67, Math.PI);
    fakeDoor(-8.7, -10.67, Math.PI);
    grp(27.83, 0, -12.25, -Math.PI / 2, () => { box(mWalnut, 1.2, 0.8, 0.4, 0, 0, 0.2, { r: 0.02 }); box(mMarble, 1.25, 0.04, 0.44, 0, 0.8, 0.22); col(-0.6, 0.6, 0, 0.44, 0, 0.84); vaseA(0, 0.84, 0.22, 0.45, mBlueVase); });
    // east hallway x 10 .. 13.5
    for (let z = -10.5; z < 23; z += 5.5) bunting([10.2, 3.6, z], [13.3, 3.6, Math.min(23, z + 5.5)], 0.35);
    for (let z = -7.75; z < 23; z += 5.5) bunting([13.3, 3.6, z], [10.2, 3.6, Math.min(23, z + 5.5)], 0.35);
    for (const z of [-7, 2.5, 12, 21]) sconce(13.33, 2.3, z, -Math.PI / 2);
    for (const z of [0.6, 11, 21]) sconce(10.17, 2.3, z, Math.PI / 2);
    painting(13.33, 2.0, -5.4, -Math.PI / 2, 1.0, 1.3, 3);
    painting(13.33, 2.0, 9.4, -Math.PI / 2, 1.3, 1.0, 7);
    painting(10.17, 2.0, 3.0, Math.PI / 2, 0.9, 1.2, 10);
    painting(10.17, 2.0, 15.3, Math.PI / 2, 1.2, 0.9, 11);
    poster(13.33, 1.9, 20.0, -Math.PI / 2, 0.5, 0.7, 3);
    bench(13.05, 4.6, -Math.PI / 2, 1.8);
    bench(13.05, 18.8, -Math.PI / 2, 1.6);
    bench(10.45, -8.2, Math.PI / 2, 1.4, mLeatherD);
    urn(10.5, 5.8, 1.1);
    urn(13.0, -9.8, 0.95);
    urn(10.5, 21.8, 1.0);
    fakeDoor(13.33, 11.2, -Math.PI / 2);
    fakeDoor(10.17, 9.9, Math.PI / 2);
    for (const [x, z] of [[11.2, -1.0], [12.4, -0.6], [11.8, 13.4]] as const) floorBalloon(x, z, 0.24);
    // entrance hall (hunters arrive here)
    for (let x = -10; x < 10; x += 5) bunting([x, 4.0, 13.3], [x + 5, 4.0, 22.7], 0.4);
    for (let x = -10; x < 10; x += 5) bunting([x + 5, 4.0, 13.3], [x, 4.0, 22.7], 0.4);
    grp(0, 0, 22.85, Math.PI, () => {
      for (const s of [-1, 1]) {
        box(mMahog, 1.2, 2.9, 0.1, s * 0.62, 0, 0.05, { r: 0.01 });
        for (const [py, ph] of [[0.25, 1.0], [1.45, 1.25]]) box(mWalnutL, 0.8, ph, 0.03, s * 0.62, py, 0.11, { r: 0.01 });
        sph(mBrass, 0.05, s * 0.1, 1.1, 0.14, undefined, {}, 8, 6);
      }
      box(mWalnut, 2.8, 0.25, 0.2, 0, 2.9, 0.1);
      for (const s of [-1, 1]) box(mWalnut, 0.2, 2.9, 0.2, s * 1.35, 0, 0.1);
    });
    for (const s of [-1, 1]) {
      bench(s * 6.5, 22.55, Math.PI, 1.8);
      sconce(s * 2.4, 2.4, 22.83, Math.PI);
      urn(s * 3.6, 22.3, 1.1);
      painting(s * 9.83, 2.1, 15.4, (-s * Math.PI) / 2, 1.3, 1.0, s > 0 ? 8 : 0);
      sconce(s * 9.83, 2.3, 13.9, (-s * Math.PI) / 2);
      sconce(s * 9.83, 2.3, 20.2, (-s * Math.PI) / 2);
    }
    // grandfather clock, console, coat stand, plant
    grp(-9.85, 0, 21.4, Math.PI / 2, () => {
      box(mMahog, 0.62, 0.35, 0.38, 0, 0, 0.19, { r: 0.02 });
      box(mMahog, 0.48, 1.25, 0.3, 0, 0.35, 0.17, { r: 0.02 });
      box(mDarkGlass, 0.24, 0.8, 0.02, 0, 0.55, 0.325);
      box(mMahog, 0.58, 0.62, 0.36, 0, 1.6, 0.18, { r: 0.02 });
      plane(mClock, 0.4, 0.4, 0, 1.91, 0.365, 0, [0, 0, 1, 1]);
      box(mMahog, 0.66, 0.1, 0.4, 0, 2.22, 0.2);
      col(-0.32, 0.32, 0, 0.4, 0, 2.3);
    });
    grp(9.85, 0, 16.2, -Math.PI / 2, () => { box(mWalnut, 1.6, 0.8, 0.45, 0, 0, 0.22, { r: 0.02 }); box(mMarble, 1.65, 0.04, 0.48, 0, 0.8, 0.24); col(-0.8, 0.8, 0, 0.48, 0, 0.84); vaseA(-0.4, 0.84, 0.24, 0.5, mMarbleCream); plant(0.35, 0.24, 0.6, mPorcelain, 0.84); });
    lathe(mWalnut, [[0.25, 0], [0.25, 0.04], [0.05, 0.08], [0.03, 1.85], [0.045, 1.9], [0.001, 1.95]], -8.9, 0, 14.0, 10);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; tube(mWalnut, [[-8.9, 1.62, 14.0], [-8.9 + Math.cos(a) * 0.2, 1.75, 14.0 + Math.sin(a) * 0.2], [-8.9 + Math.cos(a) * 0.26, 1.68, 14.0 + Math.sin(a) * 0.26]], 0.014, 5, 6); }
    col(-9.15, -8.65, 13.75, 14.25, 0, 1.9);
    plant(8.9, 14.0, 1.2, mTerracotta);
    box(mRugA, 3.4, 0.014, 5.0, 0, 0, 17.6, { uv: "native" });
    for (const [x, z] of [[-6.8, 15.6], [-5.9, 15.9], [5.2, 20.9], [7.4, 14.4]] as const) floorBalloon(x, z, 0.25);
  }

  // ================= STORAGE ROOM (red damask) =================
  {
    boxStack(-9.2, -22.3, 4, 1); boxStack(-8.4, -22.3, 3, 2); boxStack(-9.2, -21.5, 2, 3); boxStack(-7.6, -22.4, 2, 4);
    boxStack(-9.3, -15.0, 3, 5); boxStack(-9.3, -15.8, 2, 6);
    boxStack(1.3, -22.2, 3, 7); boxStack(1.3, -21.4, 4, 8); boxStack(0.5, -22.3, 2, 9);
    boxStack(-3.8, -18.4, 2, 10); boxStack(-3.1, -18.6, 3, 11); boxStack(-3.5, -19.3, 1, 12);
    metalShelf(-5.0, -22.5, 0, 2.4, 2.2, 0.6, 4, mSteelDark, (x1, x2, y, d) => { let cx = x1 + 0.05; while (cx < x2 - 0.3) { const w = 0.35 + rnd() * 0.25; if (cx + w > x2) break; cbox(w, 0.25 + rnd() * 0.25, Math.min(d - 0.1, 0.45), cx + w / 2, y, 0, (rnd() - 0.5) * 0.2, rnd() < 0.4); cx += w + 0.05; } });
    metalShelf(-1.5, -22.5, 0, 2.0, 2.2, 0.6, 4, mSteelDark, (x1, x2, y) => { for (let cx = x1 + 0.2; cx < x2 - 0.15; cx += 0.4) { if (rnd() < 0.5) pot(cx, y, 0, 0.13, 0.16, cloth[5]); else linenStack(cx, y, 0, 3, pick(cloth)); } });
    laundryCart(-6.8, -16.2, 0.4);
    laundryCart(-0.5, -16.8, -1.2);
    poinsettia(-0.6, -15.2);
    poinsettia(-9.2, -19.6);
    pot(-2.4, 0, -15.0, 0.2, 0.22, M(null, "#1a9a8a", 1, { roughness: 0.3 }));
    for (const x of [-6.5, -2.2]) { box(mWalnut, 0.28, H.red, 0.28, x, 0, -19.2, { r: 0.02 }); box(mWalnut, 0.4, 0.3, 0.4, x, 0, -19.2); col(x - 0.2, x + 0.2, -19.4, -19.0, 0, H.red); }
    for (let i = 0; i < 3; i++) pallet(-8.0, i * 0.145, -17.6, i * 0.05);
    for (const x of [-6, -1]) { box(mPlasterW, 1.2, 0.06, 0.3, x, H.red - 0.06, -18.5); box(mTube, 1.1, 0.03, 0.12, x, H.red - 0.09, -18.5); }
  }

  // ================= BLUE ROOM =================
  {
    // raised wooden dais along the back wall with vases
    box(mStairWood, 5.6, 0.32, 1.6, 7.0, 0, -22.2, { r: 0.02 });
    box(mSteelDark, 1.2, 0.2, 0.02, 5.4, 0.06, -21.39);
    box(mSteelDark, 1.2, 0.2, 0.02, 8.4, 0.06, -21.39);
    col(4.2, 9.8, -23, -21.4, 0, 0.32);
    vaseA(5.0, 0.32, -22.5, 1.8, mBlueVase); col(4.6, 5.4, -22.9, -22.1, 0.32, 2.1);
    vaseA(5.9, 0.32, -22.6, 1.3, mMarbleCream); col(5.6, 6.2, -22.9, -22.3, 0.32, 1.6);
    vaseA(4.4, 0.32, -21.9, 0.8, mBlueVase);
    lathe(mPorcelain, [[0.001, 0], [0.12, 0], [0.16, 0.12], [0.1, 0.3], [0.13, 0.35], [0.001, 0.34]], 6.4, 0.32, -21.8, 12);
    for (const [x, z, n] of [[6.9, -22.0, 4], [7.6, -21.9, 3], [7.25, -22.6, 5]] as const) for (let i = 0; i < n; i++) lathe(mTerracotta, [[0.001, 0], [0.12, 0], [0.17, 0.2], [0.16, 0.21], [0.12, 0.03]], x, 0.32 + i * 0.1, z, 12);
    for (const [x, z] of [[8.2, -21.6], [3.8, -20.9]] as const) { lathe(mRedPlastic, [[0.001, 0], [0.14, 0], [0.18, 0.12], [0.12, 0.2], [0.04, 0.22], [0.03, 0.26], [0.001, 0.26]], x, x > 5 ? 0.32 : 0, z, 12); }
    // ammonite fossil
    { const pts: V3[] = []; for (let i = 0; i <= 40; i++) { const t = i / 40, a = t * Math.PI * 5, rr = 0.05 + t * 0.32; pts.push([9.0 + Math.cos(a) * rr, 0.32 + 0.4 + Math.sin(a) * rr, -22.5]); } tube(mConcreteB, pts, 0.07, 8, 60); col(8.6, 9.4, -22.7, -22.3, 0.32, 1.1); }
    sideTable(11.3, -22.2, true, mWalnut);
    // bookcase, wingback, bar cart, rug, coat stand
    bookcase(2.15, -21.3, Math.PI / 2, 2.6, 2.6, 0.42, 5, mOrange, 0.85);
    armchair(12.4, -18.0, -Math.PI / 2 - 0.4, mRedChair, true);
    box(mRugRed, 3.6, 0.014, 2.6, 8.0, 0, -18.0, { uv: "native" });
    grp(10.4, 0, -20.4, -0.3, () => {
      box(mGlass, 1.0, 0.01, 0.55, 0, 0.8, 0);
      box(mGold, 1.04, 0.03, 0.59, 0, 0.77, 0);
      box(mGold, 1.0, 0.02, 0.55, 0, 0.3, 0);
      for (const a of [-1, 1]) for (const b of [-1, 1]) seg(mGold, [a * 0.5, 0.1, b * 0.27], [a * 0.5, 0.82, b * 0.27], 0.012, 0.012, 5);
      for (const s of [-1, 1]) torus(mGold, 0.25, 0.022, -0.45, 0.25, s * 0.3, {}, Math.PI * 2, 5, 18);
      cyl(mSteel, 0.14, 0.11, 0.24, -0.2, 0.81, 0, 14);
      for (const d of [-0.05, 0.05]) lathe(mDarkGlass, [[0.001, 0], [0.035, 0], [0.035, 0.2], [0.012, 0.28], [0.012, 0.36], [0.001, 0.36]], -0.2 + d, 0.9, d, 8);
      lathe(mPorcelain, [[0.001, 0], [0.08, 0], [0.1, 0.1], [0.06, 0.26], [0.09, 0.3], [0.001, 0.29]], 0.25, 0.81, 0, 12);
      col(-0.55, 0.55, -0.32, 0.32, 0, 0.82);
    });
    lathe(mOrange, [[0.25, 0], [0.25, 0.04], [0.05, 0.08], [0.03, 1.85], [0.045, 1.9], [0.001, 1.95]], 12.9, 0, -14.6, 10);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; tube(mOrange, [[12.9, 1.62, -14.6], [12.9 + Math.cos(a) * 0.2, 1.75, -14.6 + Math.sin(a) * 0.2], [12.9 + Math.cos(a) * 0.26, 1.68, -14.6 + Math.sin(a) * 0.26]], 0.014, 5, 6); }
    col(12.65, 13.15, -14.85, -14.35, 0, 1.9);
    // white curtains, round ceiling lamp, painting, wood pillars
    for (let f = 0; f < 6; f++) cyl(mCurtain, 0.09, 0.11, H.blue - 0.2, 13.1 - (f % 2) * 0.1, 0, -16.2 + f * 0.2, 8);
    sph(mLampWhite, 0.6, 7.8, H.blue - 0.05, -18.5, [1, 0.25, 1], {}, 16, 8);
    sph(mBrass, 0.06, 7.8, H.blue - 0.2, -18.5, undefined, {}, 8, 6);
    painting(7.3, 2.1, -22.83, 0, 1.5, 1.0, 0);
    for (const x of [4.2, 9.8]) { box(mWalnut, 0.3, H.blue, 0.3, x, 0, -21.3, { r: 0.02 }); col(x - 0.15, x + 0.15, -21.45, -21.15, 0, H.blue); }
    box(mDarkTable, 1.4, 0.05, 0.8, 5.5, 0.75, -15.6, { r: 0.015 });
    for (const a of [-1, 1]) for (const b of [-1, 1]) box(mDarkTable, 0.06, 0.75, 0.06, 5.5 + a * 0.62, 0, -15.6 + b * 0.32);
    col(4.8, 6.2, -16.0, -15.2, 0, 0.8);
  }

  // ================= BATHROOM =================
  {
    // stalls on the north wall
    for (let i = 0; i < 3; i++) {
      const x = 15.5 + i * 1.6;
      box(mPorcelain, 0.05, 2.0, 1.5, x + 0.8, 0.15, -22.2);
      k.collider(x + 0.77, x + 0.83, -23, -21.45, 0, 2.15, true);
      lathe(mPorcelain, [[0.001, 0], [0.13, 0], [0.12, 0.08], [0.16, 0.3], [0.2, 0.4], [0.19, 0.42], [0.001, 0.36]], x, 0, -22.3, 16, { s: [0.9, 1, 1.25] });
      box(mPorcelain, 0.42, 0.4, 0.2, x, 0.42, -22.75, { r: 0.04 });
      col(x - 0.24, x + 0.24, -22.9, -22.0, 0, 0.45);
    }
    box(mPorcelain, 0.05, 2.0, 1.5, 15.5 - 0.8, 0.15, -22.2);
    k.collider(14.67, 14.73, -23, -21.45, 0, 2.15, true);
    // sinks + mirror on the east wall
    for (const z of [-21.5, -19.9, -18.3]) {
      lathe(mPorcelain, [[0.14, 0], [0.12, 0.05], [0.07, 0.2], [0.06, 0.6], [0.1, 0.72], [0.001, 0.72]], 27.5, 0, z, 14);
      lathe(mPorcelain, [[0.001, 0.6], [0.12, 0.62], [0.26, 0.75], [0.28, 0.84], [0.25, 0.85], [0.22, 0.8], [0.001, 0.76]], 27.45, 0, z, 18, { s: [0.8, 1, 1] });
      seg(mChrome, [27.78, 0.85, z], [27.76, 1.02, z], 0.014, 0.014, 6);
      col(27.2, 27.85, z - 0.28, z + 0.28, 0, 0.85);
    }
    box(mGold, 0.05, 1.2, 4.0, 27.82, 1.2, -19.9, { r: 0.02 });
    box(mMirror, 0.02, 1.05, 3.85, 27.79, 1.28, -19.9);
    // tall stacks of toilet paper rolls
    for (const [x, z, n] of [[25.9, -14.8, 6], [26.5, -14.9, 5], [26.2, -15.4, 4], [15.0, -15.2, 3], [14.4, -15.0, 5]] as const) {
      for (let i = 0; i < n; i++) cyl(mPaper, 0.2, 0.2, 0.33, x, i * 0.33, z, 14);
      col(x - 0.2, x + 0.2, z - 0.2, z + 0.2, 0, n * 0.33);
    }
    grp(23.5, 0, -18.0, 0, () => {
      const prof: [number, number][] = [[0.001, 0.14], [0.38, 0.14], [0.44, 0.2], [0.49, 0.45], [0.5, 0.62], [0.49, 0.66], [0.45, 0.66], [0.43, 0.6], [0.41, 0.3], [0.001, 0.26]];
      lathe(mPorcelain, prof, 0, 0, 0, 20, { s: [0.8, 1, 1.75] });
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) sph(mGold, 0.06, a * 0.28, 0.07, b * 0.62, [1, 1.3, 1], {}, 8, 6);
      col(-0.42, 0.42, -0.9, 0.9, 0, 0.66);
    });
    basket(17.0, -15.2);
    plant(26.9, -22.3, 0.9, mPorcelain);
    for (const x of [17.5, 24]) { box(mPlasterW, 1.2, 0.06, 0.3, x, H.bath - 0.06, -18.5); box(mTube, 1.1, 0.03, 0.12, x, H.bath - 0.09, -18.5); }
  }

  // ================= LIBRARY (arched wooden niches) =================
  {
    /** a false wall 0.5 m deep with arched niches; content: 'shelf' | 'window' | 'poster' | 'door' */
    function nicheWall(ax: "x" | "z", at: number, inward: 1 | -1, a1: number, a2: number, niches: [number, "shelf" | "window" | "poster" | "door"][]) {
      const D = 0.5, NW = 1.9, HS = 2.6, RISE = 0.95;
      const shape = new THREE.Shape();
      shape.moveTo(a1, 0); shape.lineTo(a2, 0); shape.lineTo(a2, H.lib); shape.lineTo(a1, H.lib); shape.lineTo(a1, 0);
      const solidParts: [number, number][] = [];
      let prev = a1;
      for (const [c] of [...niches].sort((p, q) => p[0] - q[0])) {
        const hole = new THREE.Path();
        hole.moveTo(c - NW / 2, 0.001);
        hole.lineTo(c + NW / 2, 0.001);
        hole.lineTo(c + NW / 2, HS);
        for (let i = 1; i < 12; i++) { const a = (Math.PI * i) / 12; hole.lineTo(c + (NW / 2) * Math.cos(a), HS + RISE * Math.sin(a)); }
        hole.lineTo(c - NW / 2, HS);
        hole.lineTo(c - NW / 2, 0.001);
        shape.holes.push(hole);
        solidParts.push([prev, c - NW / 2]);
        prev = c + NW / 2;
      }
      solidParts.push([prev, a2]);
      // front face shifted inward from the structural wall face (0.15)
      const off = at + inward * (0.15 + D / 2);
      if (ax === "x") extr(mLibPanel, shape, D, 0, 0, off);
      else extr(mLibPanel, shape, D, off, 0, 0, { ry: -Math.PI / 2 });
      for (const [p1, p2] of solidParts) {
        if (p2 - p1 < 0.01) continue;
        if (ax === "x") col(p1, p2, Math.min(at, off + inward * D / 2), Math.max(at, off + inward * D / 2), 0, H.lib);
        else col(Math.min(at, off + inward * D / 2), Math.max(at, off + inward * D / 2), p1, p2, 0, H.lib);
        // pilaster in front of the solid part
        const pc = (p1 + p2) / 2, pw = Math.min(0.5, p2 - p1 - 0.1);
        if (pw > 0.2) {
          const fz = at + inward * (0.15 + D);
          if (ax === "x") { box(mOrange, pw, H.lib - 0.4, 0.12, pc, 0, fz + inward * 0.06); box(mOrange, pw + 0.12, 0.3, 0.2, pc, 0, fz + inward * 0.1); box(mOrange, pw + 0.16, 0.22, 0.22, pc, 2.7, fz + inward * 0.11); }
          else { box(mOrange, 0.12, H.lib - 0.4, pw, fz + inward * 0.06, 0, pc); box(mOrange, 0.2, 0.3, pw + 0.12, fz + inward * 0.1, 0, pc); box(mOrange, 0.22, 0.22, pw + 0.16, fz + inward * 0.11, 2.7, pc); }
        }
      }
      // cornice along the top of the niche wall
      const fz = at + inward * (0.15 + D);
      if (ax === "x") box(mOrange, a2 - a1, 0.3, 0.25, (a1 + a2) / 2, H.lib - 0.4, fz + inward * 0.12);
      else box(mOrange, 0.25, 0.3, a2 - a1, fz + inward * 0.12, H.lib - 0.4, (a1 + a2) / 2);
      for (const [c, kind] of niches) {
        const back = at + inward * 0.15;
        const ry = ax === "x" ? (inward > 0 ? 0 : Math.PI) : inward > 0 ? Math.PI / 2 : -Math.PI / 2;
        const [nx, nz] = ax === "x" ? [c, back] : [back, c];
        if (kind === "shelf") bookcase(nx, nz, ry, NW - 0.05, 2.55, 0.42, 5, mOrange, 0.88);
        else if (kind === "window" || kind === "poster") {
          grp(nx, 0, nz, ry, () => {
            plane(mWindow, NW - 0.1, HS + RISE - 0.8, 0, 0.6 + (HS + RISE - 0.8) / 2, 0.02, 0, [0, 0, 1, 1]);
            for (let i = 0; i <= 5; i++) box(mBlackMetal, 0.03, HS + RISE - 0.8, 0.04, -NW / 2 + 0.05 + (i * (NW - 0.1)) / 5, 0.6, 0.04);
            for (let j = 0; j <= 6; j++) box(mBlackMetal, NW - 0.1, 0.03, 0.04, 0, 0.6 + (j * (HS + RISE - 0.8)) / 6, 0.04);
            box(mOrange, NW, 0.6, 0.3, 0, 0, 0.15);
            if (kind === "poster") poster(0, 1.85, 0.12, 0, 0.8, 1.15, 0, null);
          });
        }
      }
    }
    nicheWall("z", -28, 1, -23, -2, [[-20.5, "shelf"], [-17.5, "window"], [-14.5, "shelf"], [-11.5, "poster"], [-8.5, "shelf"], [-5.5, "window"]]);
    nicheWall("x", -23, 1, -27.35, -10.65, [[-24.8, "poster"], [-21.8, "shelf"], [-18.8, "window"], [-15.8, "shelf"], [-12.8, "poster"]]);
    nicheWall("x", -2, -1, -27.35, -10.65, [[-24.8, "shelf"], [-21.2, "poster"], [-15, "door"], [-12.2, "shelf"]]);
    nicheWall("z", -10, -1, -22.35, -2.65, [[-20.2, "shelf"], [-17.2, "window"], [-12.25, "door"], [-8.8, "poster"], [-5.6, "shelf"]]);
    // chunky wooden pillars
    for (const x of [-22.5, -15.5]) for (const z of [-17.5, -8.5]) {
      box(mOrange, 0.8, 0.5, 0.8, x, 0, z, { r: 0.03 });
      box(mOrange, 0.6, H.lib - 1.0, 0.6, x, 0.5, z);
      box(mOrange, 0.8, 0.5, 0.8, x, H.lib - 0.5, z, { r: 0.03 });
      col(x - 0.4, x + 0.4, z - 0.4, z + 0.4, 0, H.lib);
    }
    for (const z of [-17.5, -8.5]) box(mBeam, 16.6, 0.4, 0.4, -19, H.lib - 0.4, z);
    // long reading tables with green banker's lamps and folding chairs
    for (const [cx, cz] of [[-19.0, -13.0], [-19.0, -5.0], [-19.0, -20.3]] as const) {
      grp(cx, 0, cz, 0, () => {
        box(mDarkTable, 3.6, 0.06, 1.1, 0, 0.74, 0, { r: 0.015 });
        box(mDarkTable, 3.4, 0.1, 0.95, 0, 0.64, 0);
        for (const a of [-1, 1]) for (const b of [-1, 1]) box(mDarkTable, 0.08, 0.64, 0.08, a * 1.65, 0, b * 0.45);
        for (const s of [-1, 1]) {
          const lx = s * 0.9;
          cylC(mBrass, 0.1, 0.1, 0.02, lx, 0.81, 0.15, 8);
          seg(mBrass, [lx, 0.81, 0.15], [lx, 1.08, 0.12], 0.012, 0.012, 5);
          put(mGreenShade, new THREE.CylinderGeometry(0.07, 0.09, 0.4, 12, 1, false, 0, Math.PI), [lx, 1.12, 0.12], { rz: Math.PI / 2, rx: -0.3 });
        }
        let yy = 0.8;
        for (let i = 0; i < 6; i++) { box(mPaper, 0.32, 0.05, 0.24, -0.3 + (rnd() - 0.5) * 0.04, yy, -0.1, { ry: (rnd() - 0.5) * 0.2 }); yy += 0.05; }
        col(-1.8, 1.8, -0.55, 0.55, 0, 0.8);
        for (const x of [-1.2, -0.4, 0.4, 1.2]) { foldingChair(x, -0.85, 0); foldingChair(x + (rnd() - 0.5) * 0.1, 0.85, Math.PI); }
      });
    }
    // globes on stands
    const globeTex = tx("globe", () => X.limestone("#3a6a9a", 44));
    const mGlobe = M(globeTex, "#e8d8b0", 1, { roughness: 0.4, bump: 0.2 });
    for (const [x, z] of [[-26.3, -9.0], [-12.0, -16.0], [-26.2, -15.8]] as const) {
      for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; seg(mWalnut, [x + Math.cos(a) * 0.32, 0, z + Math.sin(a) * 0.32], [x + Math.cos(a) * 0.3, 0.75, z + Math.sin(a) * 0.3], 0.025, 0.02, 5); }
      torus(mWalnut, 0.42, 0.035, x, 0.75, z, { rx: Math.PI / 2 }, Math.PI * 2, 5, 20);
      torus(mBrass, 0.38, 0.015, x, 1.1, z, { rx: 0.3 }, Math.PI * 2, 4, 20);
      sph(mGlobe, 0.36, x, 1.1, z, undefined, {}, 18, 12);
      col(x - 0.42, x + 0.42, z - 0.42, z + 0.42, 0, 1.46);
    }
    // cosy corner: tufted leather armchair and floor lamp
    armchair(-26.2, -3.3, Math.PI * 0.85, mLeather, true);
    floorLamp(-27.0, -4.5);
    box(mRugA, 5.0, 0.014, 3.4, -19.0, 0, -13.0, { uv: "native" });
    // step ladder
    grp(-13.0, 0, -21.5, 0.4, () => {
      for (const s of [-1, 1]) { seg(mPine, [s * 0.25, 0, 0.3], [s * 0.2, 1.8, 0], 0.025, 0.025, 5); seg(mPine, [s * 0.25, 0, -0.3], [s * 0.2, 1.8, 0], 0.025, 0.025, 5); }
      for (let i = 1; i < 5; i++) box(mPine, 0.44, 0.03, 0.14, 0, i * 0.36, 0.3 - i * 0.06);
      col(-0.3, 0.3, -0.35, 0.35, 0, 1.8);
    });
    // chandeliers (simple white shade clusters)
    for (const z of [-17.5, -8.5, -13]) {
      const x = -19;
      cyl(mBrass, 0.012, 0.012, 1.0, x, H.lib - 1.0, z, 6);
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; lathe(mLampWhite, [[0.09, 0], [0.06, 0.12], [0.02, 0.14]], x + Math.cos(a) * 0.3, H.lib - 1.25, z + Math.sin(a) * 0.3, 10); seg(mBrass, [x, H.lib - 1.0, z], [x + Math.cos(a) * 0.3, H.lib - 1.1, z + Math.sin(a) * 0.3], 0.01, 0.01, 4); }
    }
  }

  // ================= KITCHEN (restaurant) =================
  {
    /** black steel counter run with open shelves under (local: back z=0, front +z) */
    function counter(x: number, z: number, ry: number, len: number, clutter = true) {
      grp(x, 0, z, ry, () => {
        box(mSteelBlack, len, 0.05, 0.72, 0, 0.88, 0.36);
        box(mSteelBlack, len, 0.05, 0.02, 0, 0.84, 0.71);
        for (let i = 0; i <= Math.round(len / 1.2); i++) box(mSteelBlack, 0.04, 0.88, 0.7, -len / 2 + 0.02 + (i * (len - 0.04)) / Math.round(len / 1.2), 0, 0.36);
        box(mSteelBlack, len, 0.03, 0.66, 0, 0.35, 0.36);
        box(mSteelBlack, len, 0.03, 0.66, 0, 0.08, 0.36);
        box(mSteelBlack, len, 0.88, 0.02, 0, 0, 0.01);
        if (clutter) {
          let cx = -len / 2 + 0.3;
          while (cx < len / 2 - 0.3) {
            const t = rnd();
            if (t < 0.15) pot(cx, 0.93, 0.35, 0.14 + rnd() * 0.06, 0.2 + rnd() * 0.1);
            else if (t < 0.3) { plates(cx, 0.93, 0.35, 10 + Math.floor(rnd() * 25)); }
            else if (t < 0.42) { for (let j = 0; j < 3; j++) meatLump(cx + j * 0.12, 0.93 + (j % 2) * 0.08, 0.35 + (j - 1) * 0.08, 1.1); }
            else if (t < 0.52) pan(cx, 0.93, 0.4, Math.PI / 2 + (rnd() - 0.5));
            else if (t < 0.62) { lathe(plastic[3], [[0.001, 0], [0.04, 0], [0.04, 0.15], [0.01, 0.2], [0.004, 0.23], [0.001, 0.23]], cx, 0.93, 0.2, 8); lathe(plastic[2], [[0.001, 0], [0.04, 0], [0.04, 0.15], [0.01, 0.2], [0.004, 0.23], [0.001, 0.23]], cx + 0.1, 0.93, 0.2, 8); }
            else if (t < 0.72) { for (let j = 0; j < 4; j++) sph(fruitM[j % 5], 0.05, cx - 0.1 + j * 0.07, 0.98, 0.4 + (j % 2) * 0.06, undefined, {}, 8, 6); }
            cx += 0.45 + rnd() * 0.35;
          }
          let sx = -len / 2 + 0.3;
          while (sx < len / 2 - 0.3) { if (rnd() < 0.5) pot(sx, 0.38, 0.35, 0.15, 0.2, mSteel); else plates(sx, 0.38, 0.35, 8); sx += 0.5; }
        }
        col(-len / 2, len / 2, 0, 0.74, 0, 0.93);
      });
    }
    function range(x: number, z: number, ry: number, len: number) {
      grp(x, 0, z, ry, () => {
        box(mBlackMetal, len, 0.9, 0.8, 0, 0, 0.4, { r: 0.01 });
        box(mSteelBlack, len, 0.3, 0.02, 0, 0.62, 0.81);
        for (let i = 0; i < Math.round(len / 0.25); i++) { const kx = -len / 2 + 0.15 + i * 0.25; cylC(mBlackGloss, 0.03, 0.03, 0.04, kx, 0.8, 0.83, 8, { rx: Math.PI / 2 }); torus(M(null, "#3040e0", 1, { emissive: "#2030ff", emissiveIntensity: 0.8 }), 0.035, 0.006, kx, 0.8, 0.83, {}, Math.PI * 2, 4, 10); }
        cylC(mChrome, 0.012, 0.012, len - 0.2, 0, 0.5, 0.86, 6, { rz: Math.PI / 2 });
        for (let i = 0; i < Math.floor(len / 0.5); i++) { const bx = -len / 2 + 0.3 + i * 0.5; torus(mIron, 0.13, 0.015, bx, 0.92, 0.4, { rx: Math.PI / 2 }, Math.PI * 2, 4, 12); }
        pot(-len / 2 + 0.3, 0.92, 0.4, 0.17, 0.26); pan(len / 2 - 0.3, 0.92, 0.45, 1.0);
        // hood
        box(mSteel, len + 0.2, 0.5, 1.0, 0, 2.3, 0.5);
        box(mSteel, len * 0.5, H.kit - 2.8, 0.5, 0, 2.8, 0.25);
        col(-len / 2, len / 2, 0, 0.8, 0, 0.92);
      });
    }
    range(-27.9, 2.4, Math.PI / 2, 3.2);
    counter(-27.9, 6.8, Math.PI / 2, 5.2);
    counter(-27.9, -0.75, Math.PI / 2, 2.2, true);
    counter(-16.5, 12.85, Math.PI, 4.5);
    counter(-19.5, -1.85, 0, 7.2);
    // island: two back-to-back counters with a plate tower + meat
    counter(-19.5, 5.0, 0, 6.0);
    counter(-19.5, 5.0, Math.PI, 6.0);
    for (const x of [-21.5, -21.2, -20.9]) plates(x, 0.93, 5.3, 36 + Math.floor(rnd() * 12), 0.16);
    for (let i = 0; i < 6; i++) meatLump(-18.4 + (rnd() - 0.5) * 0.5, 0.93 + (i % 3) * 0.1, 4.7 + (rnd() - 0.5) * 0.4, 1.4);
    // hanging pan rack over the island
    for (const x of [-22.5, -16.5]) cyl(mSteelDark, 0.012, 0.012, H.kit - 2.3, x, 2.3, 5.0, 6);
    cylC(mSteelDark, 0.025, 0.025, 6.2, -19.5, 2.3, 5.0, 8, { rz: Math.PI / 2 });
    for (let i = 0; i < 12; i++) {
      const hx = -22.2 + i * 0.52;
      seg(mChrome, [hx, 2.3, 5.0], [hx, 2.18, 5.0], 0.006, 0.006, 4);
      cylC(i % 2 ? mSteel : mIron, 0.15, 0.13, 0.04, hx, 1.82, 5.0, 16, { rx: Math.PI / 2 });
      seg(i % 2 ? mSteel : mIron, [hx, 1.98, 5.0], [hx, 2.18, 5.0], 0.012, 0.012, 5);
    }
    // wall shelves with food & pots; bread posters; towel rail
    for (const [x, z, ry, len] of [[-19.5, -2.0, 0, 6.5], [-27.95, 9.0, Math.PI / 2, 3.2], [-16.5, 12.95, Math.PI, 4.4]] as const) {
      grp(x, 1.7, z, ry, () => {
        for (let r2 = 0; r2 < 2; r2++) {
          const sy = r2 * 0.5;
          box(mSteelBlack, len, 0.025, 0.34, 0, sy, 0.17);
          let cx = -len / 2 + 0.12;
          while (cx < len / 2 - 0.15) {
            const t = rnd();
            if (t < 0.3) plates(cx, sy + 0.025, 0.17, 6 + Math.floor(rnd() * 8), 0.12);
            else if (t < 0.55) pot(cx + 0.05, sy + 0.025, 0.17, 0.1, 0.14);
            else if (t < 0.8) box(pick(plastic), 0.14, 0.2 + rnd() * 0.1, 0.12, cx, sy + 0.025, 0.17, { r: 0.01 });
            cx += 0.25 + rnd() * 0.1;
          }
        }
      });
    }
    poster(-24.5, 3.1, -1.83, 0, 0.7, 1.0, 1, null);
    poster(-23.6, 3.0, -1.83, 0.08, 0.7, 1.0, 1, null);
    poster(-10.17, 3.0, 3.0, -Math.PI / 2, 0.7, 1.0, 1, null);
    grp(-10.17, 1.5, 0.5, -Math.PI / 2, () => { cylC(mChrome, 0.012, 0.012, 0.7, 0, 0, 0.08, 6, { rz: Math.PI / 2 }); box(cloth[2], 0.5, 0.6, 0.03, 0, -0.6, 0.1, { r: 0.01 }); });
    // prep table and bins near the ballroom door
    grp(-11.2, 0, 3.0, Math.PI / 2, () => { box(mSteel, 1.8, 0.04, 0.7, 0, 0.88, 0); for (const a of [-1, 1]) for (const b of [-1, 1]) cyl(mSteel, 0.02, 0.02, 0.88, a * 0.85, 0, b * 0.3, 6); box(mSteel, 1.7, 0.03, 0.6, 0, 0.2, 0); col(-0.9, 0.9, -0.35, 0.35, 0, 0.92); pot(0.4, 0.92, 0, 0.18, 0.3); plates(-0.3, 0.92, 0, 20); });
    for (const z of [10.8, 11.5]) { lathe(mSteelDark, [[0.001, 0], [0.22, 0], [0.26, 0.75], [0.27, 0.78], [0.001, 0.78]], -10.6, 0, z, 14); col(-10.88, -10.32, z - 0.28, z + 0.28, 0, 0.78); }
    for (const x of [-23.5, -15.5]) for (const z of [1.5, 8.5]) { box(mPlasterW, 1.4, 0.06, 0.3, x, H.kit - 0.06, z); box(mTube, 1.3, 0.03, 0.12, x, H.kit - 0.09, z); }
  }

  // ================= COLD STORAGE =================
  {
    const meatFill = (x1: number, x2: number, y: number, d: number) => {
      let cx = x1 + 0.15;
      while (cx < x2 - 0.15) { const s = 0.9 + rnd() * 0.6; meatLump(cx, y, (rnd() - 0.5) * (d - 0.35), s); if (rnd() < 0.5) meatLump(cx + 0.05, y + 0.12, (rnd() - 0.5) * 0.1, s * 0.8); cx += 0.32 + rnd() * 0.2; }
    };
    for (const z of [14.5, 17.6, 20.7]) metalShelf(-22.0, z, 0, 5.0, 1.9, 0.7, 4, mBlackMetal, meatFill);
    metalShelf(-27.55, 18.0, Math.PI / 2, 5.5, 1.9, 0.7, 4, mBlackMetal, meatFill);
    metalShelf(-15.5, 22.55, 0, 3.0, 1.9, 0.7, 4, mBlackMetal, meatFill);
    gasCylinder(-12.2, 22.3, 1.3);
    gasCylinder(-11.6, 22.4, 1.3);
    for (const [x, z] of [[-14.5, 15.0], [-15.2, 15.2]] as const) { cbox(0.6, 0.45, 0.45, x, 0, z, rnd() * 0.3, true); }
    // plastic strip curtain at the kitchen door
    for (let i = 0; i < 8; i++) box(M(null, "#cfe0e8", 1, { roughness: 0.1 }), 0.2, 2.3, 0.01, -22.8 + i * 0.22, 0.1, 13.2, { rx: 0.02 });
    for (const x of [-23.5, -15.5]) { box(mPlasterW, 1.4, 0.06, 0.3, x, H.cold - 0.06, 18); box(mTube, 1.3, 0.03, 0.12, x, H.cold - 0.09, 18); }
    box(mSteelDark, 0.6, 0.4, 0.3, -27.7, 3.0, 15.0);
  }

  // ================= LAUNDRY BASEMENT =================
  {
    // decorative wooden stairs rising along the north wall
    const nS = 14;
    for (let i = 0; i < nS; i++) {
      const top = (i + 1) * (H.lau / nS), x1 = 14.0 + i * 0.3;
      box(mWalnutL, 0.32, 0.05, 1.2, x1 + 0.15, top - 0.05, -9.75);
      box(mWalnut, 0.32, top - 0.05, 0.05, x1 + 0.15, 0, -9.17);
      k.collider(x1, x1 + 0.3, -10.35, -9.15, 0, top, true);
    }
    box(mWalnut, 4.3, 0.12, 0.1, 16.1, 0.9, -9.1, { rz: Math.atan2(H.lau, 4.2) });
    // clothes lines with hanging laundry
    const shirt = new THREE.Shape();
    shirt.moveTo(-0.2, 0); shirt.lineTo(0.2, 0); shirt.lineTo(0.2, 0.42); shirt.lineTo(0.34, 0.34); shirt.lineTo(0.4, 0.44); shirt.lineTo(0.2, 0.62);
    shirt.lineTo(0.07, 0.62); shirt.quadraticCurveTo(0, 0.56, -0.07, 0.62); shirt.lineTo(-0.2, 0.62); shirt.lineTo(-0.4, 0.44); shirt.lineTo(-0.34, 0.34); shirt.lineTo(-0.2, 0.42); shirt.lineTo(-0.2, 0);
    for (const z of [-6.0, -2.4, 1.2]) {
      tube(mPaper, [[13.7, 2.85, z], [20.75, 2.75, z], [27.8, 2.85, z]], 0.006, 3, 12);
      let x = 18.4;
      while (x < 27.3) {
        const t = rnd(), c = pick(cloth);
        if (t < 0.5) { extr(c, shirt, 0.02, x, 2.8 - 0.62, z, { rz: (rnd() - 0.5) * 0.08 }); x += 0.85; }
        else if (t < 0.8) { box(c, 0.55, 0.8, 0.012, x, 2.8 - 0.8, z); x += 0.65; }
        else { for (let j = 0; j < 3; j++) box(pick(cloth), 0.1, 0.26, 0.015, x + j * 0.13, 2.8 - 0.26, z); x += 0.45; }
        box(mPine, 0.015, 0.07, 0.03, x - 0.4, 2.76, z);
      }
    }
    // wooden tables with folded towel piles
    for (const [cx, cz] of [[21.5, -4.2], [21.5, 3.0], [26.5, -7.5]] as const) {
      grp(cx, 0, cz, 0, () => {
        box(mWalnutL, 2.4, 0.06, 1.1, 0, 0.8, 0, { r: 0.015 });
        for (const a of [-1, 1]) for (const b of [-1, 1]) box(mWalnutL, 0.07, 0.8, 0.07, a * 1.12, 0, b * 0.48);
        box(mWalnutL, 2.2, 0.03, 0.9, 0, 0.2, 0);
        col(-1.2, 1.2, -0.55, 0.55, 0, 0.86);
        for (let i = 0; i < 5; i++) { const lx = -0.9 + i * 0.45; linenStack(lx, 0.86, (rnd() - 0.5) * 0.3, 3 + Math.floor(rnd() * 6), pick([cloth[1], cloth[3], cloth[2], cloth[3], cloth[11], cloth[6]])); }
        for (let i = 0; i < 3; i++) linenStack(-0.7 + i * 0.7, 0.23, 0, 3, pick([cloth[3], cloth[1]]));
      });
    }
    // washing machines on the east wall, baskets, extinguisher, wet vac
    for (let i = 0; i < 5; i++) grp(27.85, 0, -3.5 + i * 0.68, -Math.PI / 2, () => {
      box(mEnamel, 0.62, 0.86, 0.62, 0, 0, 0.31, { r: 0.03 });
      torus(mChrome, 0.2, 0.035, 0, 0.42, 0.63, {}, Math.PI * 2, 6, 20);
      cylC(mDarkGlass, 0.18, 0.18, 0.02, 0, 0.42, 0.63, 16, { rx: Math.PI / 2 });
      box(mDarkGlass, 0.14, 0.05, 0.01, 0.12, 0.76, 0.625);
      col(-0.31, 0.31, 0, 0.66, 0, 0.86);
    });
    basket(18.0, 4.8); basket(24.4, -9.6); basket(15.2, 0.6, false);
    for (const [x, z] of [[19.0, -9.4], [15.4, 5.2]] as const) { let yy = 0; for (let i = 0; i < 5; i++) { box(pick(cloth), 0.5 + rnd() * 0.2, 0.08, 0.4, x, yy, z, { r: 0.04, ry: rnd() * 0.5 }); yy += 0.08; } col(x - 0.3, x + 0.3, z - 0.25, z + 0.25, 0, yy); }
    lathe(mRedPlastic, [[0.001, 0], [0.09, 0], [0.09, 0.55], [0.05, 0.62], [0.001, 0.63]], 18.8, 0, -6.6, 12);
    lathe(mRedPlastic, [[0.001, 0], [0.22, 0], [0.24, 0.5], [0.18, 0.55], [0.001, 0.55]], 19.5, 0, -6.7, 14);
    torus(M(null, "#40a0e0", 1, { roughness: 0.4 }), 0.18, 0.02, 19.2, 0.03, -6.0, { rx: Math.PI / 2 }, Math.PI * 2, 4, 16);
    col(18.6, 19.8, -7.0, -6.4, 0, 0.6);
    carvedChair(17.8, -6.8, 0.5, mBurgundy, mWalnutL);
    // fluorescent tube lights
    for (const x of [17.5, 24]) for (const z of [-5.5, 1.5]) { box(mPlasterW, 2.0, 0.07, 0.25, x, H.lau - 0.07, z); box(mTube, 1.9, 0.04, 0.1, x, H.lau - 0.1, z); }
    for (const z of [-7.5, 3.5]) box(mBeam, 14.3, 0.3, 0.25, 20.75, H.lau - 0.3, z);
    poster(13.67, 2.0, 2.8, Math.PI / 2, 0.5, 0.7, 3);
  }

  // ================= BRICK BASEMENT =================
  {
    // concrete beams & posts
    for (const z of [10.5, 15, 19.5]) box(mConcreteB, 14.3, 0.4, 0.45, 20.75, H.brick - 0.4, z);
    for (const x of [17.5, 24]) box(mConcreteB, 0.45, 0.4, 16.7, x, H.brick - 0.8, 14.65);
    // raised concrete platform along the south wall
    box(mConcreteB, 9.0, 0.45, 2.8, 22.5, 0, 21.45, { r: 0.02 });
    col(18, 27.85, 20.05, 22.85, 0, 0.45);
    // bronze rearing horse on a round wooden table
    lathe(mPine, [[0.001, 0.7], [0.75, 0.7], [0.75, 0.78], [0.001, 0.78]], 16.0, 0, 9.0, 18);
    for (const a of [0, 2.1, 4.2]) seg(mPine, [16.0 + Math.cos(a) * 0.5, 0, 9.0 + Math.sin(a) * 0.5], [16.0 + Math.cos(a) * 0.3, 0.7, 9.0 + Math.sin(a) * 0.3], 0.04, 0.04, 6);
    col(15.25, 16.75, 8.25, 9.75, 0, 0.78);
    rearingHorse(16.0, 0.78, 9.0, -0.6, 0.62, mBronze);
    // white horse head bust
    lathe(mMarble, [[0.001, 0], [0.2, 0], [0.2, 0.1], [0.12, 0.14], [0.001, 0.14]], 18.0, 0, 7.2, 12);
    seg(mMarble, [18.0, 0.14, 7.2], [18.1, 0.55, 7.25], 0.14, 0.1, 10);
    sph(mMarble, 1, 18.18, 0.6, 7.3, [0.2, 0.1, 0.1], { rz: -0.6 }, 10, 8);
    col(17.8, 18.3, 7.0, 7.45, 0, 0.7);
    // pallets leaning & stacked, gas cylinders, boxes
    pallet(14.3, 0.62, 18.0, Math.PI / 2, -1.25);
    for (let i = 0; i < 3; i++) pallet(21.0, 0.45 + i * 0.145, 21.3, 0.1 * i);
    gasCylinder(15.2, 17.2, 1.5, M(null, "#b8bcc0", 1, { roughness: 0.3, metalness: 0.4 }));
    gasCylinder(15.7, 17.2, 1.5, M(null, "#b8bcc0", 1, { roughness: 0.3, metalness: 0.4 }));
    boxStack(14.4, 12.0, 2, 21); boxStack(15.4, 11.6, 1, 22);
    // dumpsters
    for (const x of [23.0, 25.8]) grp(x, 0.45, 21.6, 0, () => {
      box(mGreenPlastic, 1.9, 1.1, 1.1, 0, 0.1, 0, { r: 0.03 });
      box(mGreenPlastic, 1.95, 0.08, 1.15, 0, 1.2, 0);
      for (const a of [-1, 1]) for (const b of [-1, 1]) cyl(mRubber, 0.06, 0.06, 0.1, a * 0.8, 0, b * 0.45, 8);
      col(-0.97, 0.97, -0.57, 0.57, 0, 1.3);
    });
    for (const [x, z] of [[21.6, 20.6], [24.5, 20.5], [27.3, 20.4], [18.8, 20.9]] as const) { sph(mBlackGloss, 0.34, x, 0.72, z, [1, 0.8, 0.9], {}, 10, 7); col(x - 0.3, x + 0.3, z - 0.3, z + 0.3, 0.45, 1.0); }
    // penny-farthing bicycle leaning on the wall
    grp(19.5, 0, 22.4, 0.1, () => {
      torus(mBlackMetal, 0.62, 0.025, 0, 0.62, 0, {}, Math.PI * 2, 4, 28);
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; seg(mSteel, [0, 0.62, 0], [Math.cos(a) * 0.6, 0.62 + Math.sin(a) * 0.6, 0], 0.004, 0.004, 3); }
      torus(mBlackMetal, 0.2, 0.02, -0.9, 0.2, 0, {}, Math.PI * 2, 4, 16);
      tube(mBlackMetal, [[0, 1.24, 0], [-0.4, 1.1, 0], [-0.8, 0.5, 0], [-0.9, 0.2, 0]], 0.02, 5, 12);
      box(mLeather, 0.16, 0.05, 0.1, -0.05, 1.28, 0);
    });
    // lying red barrel, terracotta pot, newspaper, posters, red pipe
    grp(26.4, 0, 12.5, 0.6, () => { lathe(mRedPlastic, [[0.001, 0], [0.3, 0], [0.32, 0.45], [0.3, 0.9], [0.001, 0.9]], -0.45, 0.32, 0, 16, { rz: -Math.PI / 2 }); col(-0.5, 0.5, -0.33, 0.33, 0, 0.64); });
    lathe(mTerracotta, [[0.001, 0], [0.18, 0], [0.26, 0.45], [0.28, 0.48], [0.25, 0.48], [0.001, 0.1]], 25.2, 0, 10.6, 14);
    col(24.9, 25.5, 10.3, 10.9, 0, 0.48);
    box(mPaper, 1.0, 0.004, 0.6, 22.0, 0, 13.0, { ry: 0.3 });
    poster(22.5, 2.6, 22.83, Math.PI, 0.7, 1.0, 2, null);
    poster(24.0, 2.5, 22.83, Math.PI, 0.7, 1.0, 3, null);
    poster(27.83, 2.8, 16.0, -Math.PI / 2, 0.7, 1.0, 2, null);
    tube(mRedPlastic, [[13.7, 3.3, 8.0], [15.0, 3.3, 8.0], [15.3, 3.0, 8.0], [15.3, 0.4, 8.0]], 0.07, 8, 12);
    barrel(27.2, 0, 7.0); barrel(26.5, 0, 7.2);
    for (let i = 0; i < 2; i++) sph(mBulb, 0.07, 18 + i * 6, H.brick - 0.5, 15, [1, 1.2, 1], {}, 10, 8);
    for (const x of [18, 24]) cyl(mRubber, 0.006, 0.006, 0.5, x, H.brick - 0.5, 15, 4);
  }
  function barrel(x: number, y: number, z: number) {
    lathe(mBarrel, [[0.001, 0], [0.27, 0], [0.29, 0.02], [0.33, 0.25], [0.35, 0.45], [0.33, 0.65], [0.29, 0.88], [0.27, 0.9], [0.001, 0.9]], x, y, z, 16, { uv: "native", uvs: [2, 1] });
    for (const [hy, hr] of [[0.1, 0.305], [0.8, 0.3]]) torus(mIron, hr, 0.012, x, y + hy, z, { rx: Math.PI / 2 }, Math.PI * 2, 4, 20);
    col(x - 0.35, x + 0.35, z - 0.35, z + 0.35, y, y + 0.9);
  }

  // ================= flush batches =================
  for (const [m, b] of info) {
    if (!b.len) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(b.p.slice(0, b.len * 3), 3));
    g.setAttribute("normal", new THREE.BufferAttribute(b.n.slice(0, b.len * 3), 3));
    g.setAttribute("uv", new THREE.BufferAttribute(b.u.slice(0, b.len * 2), 2));
    k.add(g, m, [0, 0, 0], { noShadow: !b.shadow });
  }
  for (const r of instReg) if (r.list.length) k.instances(r.geo, r.mat, r.list, { noShadow: !r.shadow });

  // ================= spawns & lighting =================
  const hiderSpawns = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    const r = i % 2 ? 2.0 : 2.9;
    return new THREE.Vector3(1.6 + Math.cos(a) * r, 0, 3.0 + Math.sin(a) * r);
  });
  const hunterSpawns = [[-2.4, 20.6], [-1.2, 20.6], [0, 20.6], [1.2, 20.6], [2.4, 20.6], [-1.8, 19.4], [-0.6, 19.4], [0.6, 19.4], [1.8, 19.4]].map(([x, z]) => new THREE.Vector3(x, 0, z));

  return k.finish({
    id: "mansion",
    name: "Hide-and-Seek Mansion",
    bounds: { minX: -27.8, maxX: 27.8, minZ: -22.8, maxZ: 22.8 },
    hunterSpawns,
    hiderSpawns,
    preview: { pos: [9.0, 3.4, 11.6], look: [-4.5, 2.4, -3.5], fov: 64 },
    lighting: {
      sky: "#120d0a",
      hemi: ["#ffe6c4", "#4a3526", 0.55],
      sun: { color: "#ffe0b0", int: 0.8, pos: [9, 40, 14] },
      points: [
        { pos: [-2.0, 5.0, 2.6], color: "#ffcf8f", int: 90, dist: 22 },
        { pos: [4.5, 5.0, 2.6], color: "#ffcf8f", int: 70, dist: 20 },
        { pos: [-19.0, 3.6, -12.0], color: "#ffb870", int: 45, dist: 16 },
        { pos: [-19.5, 3.4, 5.0], color: "#f4f8ff", int: 40, dist: 16 },
        { pos: [21.0, 2.9, -2.0], color: "#f4f8ff", int: 26, dist: 13 },
        { pos: [21.0, 3.2, 15.0], color: "#ffcf8f", int: 22, dist: 13 },
      ],
      exposure: 1.0,
      env: 0.55,
      hdri: "apartment",
    },
  });
}
