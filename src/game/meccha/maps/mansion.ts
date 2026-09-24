// Hide-and-Seek Mansion (かくれんぼの屋敷) — the default and largest map: a classic European mansion.
// Main hall with fluted stone columns, timber trusses and wooden arcades, a bronze horse statue and red armchairs;
// a full library; an industrial kitchen; laundry room with a bird statue; brick-walled storage at the far back;
// a two-colour tiled bathroom; gallery hallways with gilded paintings; a lounge with a black tiled wall; dining room
// and the entrance foyer where the hunters arrive.
import * as THREE from "three";
import * as T from "../textures";
import * as X from "./tex/mansion";
import { Kit, type Mat, type World } from "./kit";

type V3 = [number, number, number];
type PO = { rx?: number; ry?: number; rz?: number; s?: V3; q?: THREE.Quaternion; uv?: "tri" | "native"; uvs?: [number, number]; swap?: boolean; r?: number };
type Trim = "wains" | "kitchen" | "bead" | "plain" | "none";
type Side = { m: Mat; ch: number; trim: Trim } | null;
type Door = { c: number; w: number; h?: number; arch?: [number, number] };

export function buildMansion(): World {
  const k = new Kit(9.4, 2.5);
  const rnd = X.rng(20260610);
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

  // ================= materials =================
  const tx = <Q extends X.PaintTex>(key: string, f: () => Q) => k.tex("mn_" + key, f);
  const mExt = M(tx("plExt", () => X.plaster("#d6cdbd", 1)), "#fff", 3, { bump: 0.15 });
  const mCeil = M(tx("ceil", () => X.plaster("#efe7d8", 2)), "#fff", 3, { bump: 0.12, shadow: false });
  const mCeilDark = M(tx("planksC", () => X.planks("#5a4030", 31, 6)), "#fff", 1.4, { shadow: false, roughness: 0.7 });
  const mDamRed = M(tx("damR", () => X.damask("#5a1719", "#74262a", 3)), "#fff", 0.85, { bump: 0.22, roughness: 0.8 });
  const mDamGreen = M(tx("damG", () => X.damask("#1c3528", "#29483a", 4)), "#fff", 0.85, { bump: 0.22 });
  const mDamGold = M(tx("damY", () => X.damask("#7a5a2c", "#8e6c38", 5)), "#fff", 0.85, { bump: 0.22 });
  const mDamBlue = M(tx("damB", () => X.damask("#1d2a45", "#2b3d60", 6)), "#fff", 0.85, { bump: 0.22 });
  const mDamTeal = M(tx("damT", () => X.damask("#6b4a1e", "#553a16", 7)), "#fff", 0.85, { bump: 0.22 });
  const mKitPlaster = M(tx("plK", () => X.plaster("#e9e1cf", 3)), "#fff", 2.5, { bump: 0.15 });
  const mLauPlaster = M(tx("plL", () => X.plaster("#b9c6ad", 4)), "#fff", 2.5, { bump: 0.15 });
  const mStoPlaster = M(tx("plS", () => X.concrete("#a39c8f", 5)), "#fff", 2.5, { bump: 0.4 });
  const mWalnut = M(tx("walnut", () => X.grain("#4a2b17", 3)), "#fff", 1.1, { roughness: 0.45, bump: 0.25 });
  const mWalnutL = M(tx("walnutL", () => X.grain("#5e3a20", 9)), "#fff", 1.1, { roughness: 0.45, bump: 0.25 });
  const mOak = M(tx("oak", () => X.grain("#8a5a30", 4)), "#fff", 1.1, { roughness: 0.5, bump: 0.25 });
  const mMahog = M(tx("mahog", () => X.grain("#5b2314", 5)), "#fff", 1.1, { roughness: 0.35, bump: 0.2 });
  const mPine = M(tx("pine", () => X.grain("#b58b57", 6)), "#fff", 1.1, { roughness: 0.75, bump: 0.35 });
  const mBeam = M(tx("beam", () => X.grain("#3e2616", 7)), "#fff", 1.4, { roughness: 0.6, bump: 0.5 });
  const mJoist = M(tx("joist", () => X.grain("#5c4430", 8)), "#fff", 1.4, { roughness: 0.8, bump: 0.5, shadow: false });
  const mPaintW = M(null, "#ece6da", 1, { roughness: 0.55 });
  const mFloorOak = M(tx("fOak", () => X.planks("#8a5a30", 2)), "#fff", 1.5, { roughness: 0.42, bump: 0.45, shadow: false });
  const mFloorDark = M(tx("fDark", () => X.planks("#5b3920", 12)), "#fff", 1.5, { roughness: 0.4, bump: 0.45, shadow: false });
  const mFloorLou = M(tx("fLou", () => X.planks("#6e4527", 13)), "#fff", 1.5, { roughness: 0.42, bump: 0.45, shadow: false });
  const mMarbleFloor = M(tx("mChk", () => X.marbleChecker("#ebe6da", "#1d1d21")), "#fff", 1.7, { roughness: 0.16, bump: 0.2, shadow: false });
  const mStone = M(tx("lime", () => X.limestone("#d9d0bf")), "#fff", 1.3, { roughness: 0.62, bump: 0.5 });
  const mMarble = M(tx("marble", () => T.marble("#f0ebe2", "#a9a092", 8)), "#fff", 1.2, { roughness: 0.2, bump: 0.15 });
  const mMarbleDark = M(tx("marbleD", () => T.marble("#2a2624", "#8a8078", 9)), "#fff", 1.2, { roughness: 0.2, bump: 0.15 });
  const mGold = M(null, "#c9a24a", 1, { metalness: 1, roughness: 0.28 });
  const mGoldDark = M(null, "#8a6a2a", 1, { metalness: 1, roughness: 0.35 });
  const mBrass = M(null, "#b58a3e", 1, { metalness: 0.9, roughness: 0.3 });
  const mBronze = M(null, "#2f2925", 1, { metalness: 0.9, roughness: 0.32 });
  const mIron = M(null, "#2a2a2d", 1, { metalness: 0.75, roughness: 0.5 });
  const mChrome = M(null, "#dfe2e5", 1, { metalness: 1, roughness: 0.1 });
  const mSteel = M(tx("steel", () => X.brushed("#b8bdc2")), "#fff", 0.9, { metalness: 0.85, roughness: 0.3, bump: 0.08 });
  const mSteelDark = M(null, "#62686e", 1, { metalness: 0.8, roughness: 0.42 });
  const mVelvet = M(tx("velvet", () => X.fabric("#8c1a20", 1)), "#fff", 0.5, { roughness: 0.92, bump: 0.3 });
  const mLeather = M(tx("leather", () => X.leather("#5a2c18")), "#fff", 0.6, { roughness: 0.45, bump: 0.3 });
  const mLeatherG = M(tx("leatherG", () => X.leather("#22402e", 11)), "#fff", 0.6, { roughness: 0.45, bump: 0.3 });
  const mBrick = M(tx("brick", () => X.bricks()), "#fff", 1.0, { roughness: 0.85, bump: 1.0 });
  const mConcrete = M(tx("conc", () => X.concrete("#8f8a80", 3)), "#fff", 3, { roughness: 0.85, bump: 0.4, shadow: false });
  const mSubway = M(tx("subway", () => X.subway()), "#fff", 0.6, { roughness: 0.18, bump: 0.35 });
  const mQuarry = M(tx("quarry", () => X.quarry()), "#fff", 1.2, { roughness: 0.6, bump: 0.5, shadow: false });
  const mBathTile = M(tx("bathT", () => X.checkTiles("#2e8b86", "#f0eee8", 8)), "#fff", 1.6, { roughness: 0.14, bump: 0.3 });
  const mBathFloor = M(tx("bathT", () => X.checkTiles("#2e8b86", "#f0eee8", 8)), "#fff", 1.6, { roughness: 0.14, bump: 0.3, shadow: false });
  const mLauFloor = M(tx("lauT", () => X.checkTiles("#e0d4bb", "#b5704f", 8, "#9a8f80")), "#fff", 1.6, { roughness: 0.4, bump: 0.3, shadow: false });
  const mBlackTile = M(tx("blackT", () => X.blackTiles()), "#fff", 0.8, { roughness: 0.1, bump: 0.3 });
  const mBead = M(tx("bead", () => X.beadboard("#f1ece1")), "#fff", 1.28, { roughness: 0.5, bump: 0.3 });
  const mCard = M(tx("card", () => X.cardboard()), "#fff", 0.7, { roughness: 0.9, bump: 0.3 });
  const mCardD = M(tx("card", () => X.cardboard()), "#c9b394", 0.7, { roughness: 0.9, bump: 0.3 });
  const mTape = M(null, "#c9b27a", 1, { roughness: 0.4 });
  const mCrate = M(tx("crate", () => X.crateWood()), "#fff", 0.8, { roughness: 0.85, bump: 0.6 });
  const mBarrel = M(tx("barrel", () => X.barrelStaves()), "#fff", 1, { roughness: 0.7, bump: 0.5 });
  const mWeave = M(tx("weave", () => X.weave()), "#fff", 0.35, { roughness: 0.85, bump: 0.6 });
  const mPorcelain = M(null, "#f6f5f1", 1, { roughness: 0.1 });
  const mEnamel = M(null, "#eeeeea", 1, { roughness: 0.25 });
  const mRubber = M(null, "#1b1b1c", 1, { roughness: 0.75 });
  const mDarkGlass = M(null, "#1c2226", 1, { roughness: 0.05, metalness: 0.3 });
  const mSoot = M(null, "#141210", 1, { roughness: 0.95 });
  const mFelt = M(tx("felt", () => X.fabric("#1e6a3c", 12)), "#fff", 0.6, { roughness: 0.95, bump: 0.2 });
  const mBlackGloss = M(null, "#0b0b0d", 1, { roughness: 0.12, metalness: 0.2 });
  const mIvory = M(null, "#f3efe2", 1, { roughness: 0.3 });
  const mLeaf = M(null, "#3b6a2c", 1, { roughness: 0.6 });
  const mLeafD = M(null, "#2a4e22", 1, { roughness: 0.6 });
  const mSoil = M(null, "#3a2a1c", 1, { roughness: 1 });
  const mTerracotta = M(null, "#a8573a", 1, { roughness: 0.8 });
  const mPaper = M(null, "#efe9da", 1, { roughness: 0.8 });
  const mCandle = M(null, "#f4ecd8", 1, { roughness: 0.6, emissive: "#ffcf8a", emissiveIntensity: 0.25 });
  const mFlame = M(null, "#ffd08a", 1, { emissive: "#ffb24a", emissiveIntensity: 4 });
  const mBulb = M(null, "#fff1d0", 1, { emissive: "#ffd89a", emissiveIntensity: 3.5 });
  const mShade = M(tx("shade", () => X.fabric("#efe0bf", 14)), "#fff", 0.4, { roughness: 0.9, emissive: "#ffcf8a", emissiveIntensity: 0.6 });
  const mGreenShade = M(null, "#1f6b3a", 1, { roughness: 0.2, emissive: "#3aa860", emissiveIntensity: 0.5 });
  const mWindow = M(tx("night", () => X.nightWindow()), "#fff", 1, { emissive: "#ffffff", emissiveIntensity: 0.8, roughness: 0.1 });
  const mEmbers = M(tx("embers", () => X.embers()), "#fff", 1, { emissive: "#ffffff", emissiveIntensity: 2.2 });
  const mPaint = M(tx("paint", () => X.paintingAtlas()), "#fff", 1, { roughness: 0.55, bump: 0.2 });
  const mPoster = M(tx("poster", () => X.posterAtlas()), "#fff", 1, { roughness: 0.7, bump: 0.15 });
  const mClock = M(tx("clock", () => X.clockFace()), "#fff", 1, { roughness: 0.4 });
  const mMirror = M(null, "#c9d2d6", 1, { metalness: 1, roughness: 0.04 });
  const mGlass = M(null, "#cfe6ee", 1, { roughness: 0.05, metalness: 0.1 });
  mGlass.m.transparent = true;
  mGlass.m.opacity = 0.22;
  mGlass.m.depthWrite = false;
  const mWater = M(null, "#7fbccc", 1, { roughness: 0.02, metalness: 0.2 });
  mWater.m.transparent = true;
  mWater.m.opacity = 0.7;
  const fabTex = tx("fab", () => X.fabric("#dcdcdc", 15));
  const cloth = ["#b83227", "#2e6fb0", "#e8c547", "#ececec", "#6c3d8f", "#2f8f55", "#e07b2a", "#2f3e52", "#f0a8b8", "#8cc1e6", "#7a5a3a", "#c9c2b0"].map((c) => M(fabTex, c, 0.4, { roughness: 0.95, bump: 0.35 }));
  const plastic = ["#e8e8e8", "#2a7fd4", "#e0412f", "#f2c230", "#3aa35a", "#8a4fc0", "#f07c2a", "#26b3b0"].map((c) => M(null, c, 1, { roughness: 0.35 }));
  const fruitM = ["#b3261e", "#e98a1e", "#e8d23a", "#6a9e2a", "#5a2a5a"].map((c) => M(null, c, 1, { roughness: 0.35 }));
  const rugMat = (key: string, f: () => X.PaintTex) => M(tx(key, f), "#fff", 1, { roughness: 0.95, bump: 0.35, shadow: false });
  const mRugHall = rugMat("rugH", () => X.persianRug("#7a1d1f", "#1e2440", "#c9a45a", 1));
  const mRugLib = rugMat("rugL", () => X.persianRug("#1f3a5a", "#6b1e1e", "#d9b36a", 2));
  const mRugLou = rugMat("rugO", () => X.persianRug("#5a2a1a", "#20303a", "#c8a060", 3));
  const mRugDin = rugMat("rugD", () => X.persianRug("#2a3a5a", "#7a2a22", "#d9c08a", 4));
  const mRunner = rugMat("run", () => X.runnerRug("#7a1d22", "#1e2a44", "#c9a45a", 5));
  const mRunner2 = rugMat("run2", () => X.runnerRug("#23405a", "#6b1e1e", "#d9b36a", 6));
  const mBathMat = M(tx("bmat", () => T.stripes(["#f4f1ea", "#e7a9b6"], false)), "#fff", 0.5, { roughness: 0.95 });

  // books (instanced)
  // books: a "series" of volumes shares height & depth, so only the books at a run's ends need visible side faces
  const mkBook = (left: boolean, right: boolean) => {
    const P: number[] = [], N: number[] = [], U: number[] = [];
    const quad = (c: V3[], n: V3, uv: number[]) => { for (const i of [0, 1, 2, 0, 2, 3]) { P.push(...c[i]); N.push(...n); U.push(uv[i * 2], uv[i * 2 + 1]); } };
    quad([[-0.5, 0, 0.5], [0.5, 0, 0.5], [0.5, 1, 0.5], [-0.5, 1, 0.5]], [0, 0, 1], [0, 0, 1, 0, 1, 1, 0, 1]);
    const flat = [0.5, 0.45, 0.5, 0.45, 0.5, 0.46, 0.5, 0.46];
    quad([[-0.5, 1, 0.5], [0.5, 1, 0.5], [0.5, 1, -0.5], [-0.5, 1, -0.5]], [0, 1, 0], flat);
    if (right) quad([[0.5, 0, 0.5], [0.5, 0, -0.5], [0.5, 1, -0.5], [0.5, 1, 0.5]], [1, 0, 0], flat);
    if (left) quad([[-0.5, 0, -0.5], [-0.5, 0, 0.5], [-0.5, 1, 0.5], [-0.5, 1, -0.5]], [-1, 0, 0], flat);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2));
    return g;
  };
  const bookGeo = mkBook(true, true), bookGeoFlat = mkBook(false, false), bookGeoL = mkBook(true, false), bookGeoR = mkBook(false, true);
  type Inst = { pos: V3; rotY?: number; rotZ?: number; rotX?: number; scale?: V3; color?: string };
  const books: Inst[] = [];
  const booksFlat: Inst[] = [], booksL: Inst[] = [], booksR: Inst[] = [];
  const jars: Inst[] = [];
  const bottles: Inst[] = [];
  const bookPal = ["#6e1b1b", "#1d3557", "#2b5528", "#8a6a1e", "#46285a", "#1c1c1c", "#9a4a2a", "#b8892a", "#5d7f2a", "#b0302a", "#2e4a7a", "#d8cfa8", "#5b3a29", "#0f5257", "#7a2440", "#3c3c46"];
  /** fill a shelf (local frame) along x from x1..x2 at height y; front at z=zf, facing +1/-1 */
  function shelfBooks(x1: number, x2: number, y: number, zf: number, facing: 1 | -1, maxH: number, maxD: number, fill = 0.92) {
    let x = x1 + 0.01;
    let col = pick(bookPal), run = 0, rh = 0.25, rd = 0.18, rt = 0.04;
    let cur: Inst[] = [];
    // books of one series: the first shows its left side, the last its right side, the rest only spine + top
    const closeRun = () => {
      cur.forEach((it, i) => {
        const first = i === 0, last = i === cur.length - 1;
        (first && last ? books : first ? (facing === 1 ? booksL : booksR) : last ? (facing === 1 ? booksR : booksL) : booksFlat).push(it);
      });
      cur = [];
    };
    while (x < x2 - 0.03) {
      if (run <= 0) {
        closeRun();
        col = pick(bookPal); run = 3 + Math.floor(rnd() * 12);
        rh = Math.min(maxH, 0.19 + rnd() * 0.14); rd = Math.min(maxD, 0.14 + rnd() * 0.08); rt = 0.022 + rnd() * 0.035;
      }
      if (rnd() > fill) { x += 0.05 + rnd() * 0.15; run = 0; continue; }
      const t = rt * (0.85 + rnd() * 0.3);
      if (x + t > x2) break;
      const lean = rnd() < 0.04 ? (rnd() - 0.5) * 0.4 : 0;
      const c = new THREE.Color(col).offsetHSL(0, 0, (rnd() - 0.5) * 0.06);
      const it: Inst = { pos: wp([x + t / 2, y, zf - (facing * rd) / 2]), rotY: xfRy + (facing === 1 ? 0 : Math.PI), rotZ: lean, scale: [t, rh, rd], color: `#${c.getHexString()}` };
      if (lean) { closeRun(); books.push(it); } else cur.push(it);
      x += t + (lean ? 0.03 : 0.002);
      run--;
    }
    closeRun();
  }
  const jarGeo = new THREE.LatheGeometry([[0.05, 0], [0.055, 0.01], [0.055, 0.12], [0.045, 0.135], [0.04, 0.15], [0.042, 0.16], [0.001, 0.16]].map(([a, b]) => new THREE.Vector2(a, b)), 8);
  const bottleGeo = new THREE.LatheGeometry([[0.035, 0], [0.038, 0.01], [0.038, 0.17], [0.03, 0.2], [0.013, 0.23], [0.012, 0.29], [0.015, 0.3], [0.001, 0.305]].map(([a, b]) => new THREE.Vector2(a, b)), 8);
  const jar = (x: number, y: number, z: number, s = 1, color = pick(["#c97a3a", "#e8c070", "#8a3a2a", "#d9d2b0", "#6a8a3a", "#b04a3a", "#f0e6c8"])) => jars.push({ pos: wp([x, y, z]), scale: [s, s, s], color });
  const bottle = (x: number, y: number, z: number, s = 1, color = pick(["#2f5a2a", "#5a2a1a", "#1f3a2a", "#8a6a2a", "#c9b27a", "#3a1a2a", "#e0e0d0"])) => bottles.push({ pos: wp([x, y, z]), scale: [s, s, s], color });

  // ================= room layout =================
  const H = { hall: 9.4, lib: 4.8, kit: 4.5, lau: 3.6, sto: 5.0, cor: 4.2, foy: 5.5, gal: 4.2, bath: 3.8, lou: 4.2, din: 4.5 };
  const S: Record<string, Side> = {
    hall: { m: mDamRed, ch: H.hall, trim: "wains" },
    foy: { m: mDamRed, ch: H.foy, trim: "wains" },
    lib: { m: mDamGreen, ch: H.lib, trim: "wains" },
    kit: { m: mKitPlaster, ch: H.kit, trim: "kitchen" },
    lau: { m: mLauPlaster, ch: H.lau, trim: "bead" },
    sto: { m: mStoPlaster, ch: H.sto, trim: "none" },
    stoBrick: { m: mBrick, ch: H.sto, trim: "none" },
    cor: { m: mDamGold, ch: H.cor, trim: "wains" },
    gal: { m: mDamGold, ch: H.gal, trim: "wains" },
    bath: { m: mBathTile, ch: H.bath, trim: "none" },
    lou: { m: mDamTeal, ch: H.lou, trim: "wains" },
    louBlack: { m: mBlackTile, ch: H.lou, trim: "none" },
    din: { m: mDamBlue, ch: H.din, trim: "wains" },
  };

  function archShape(w: number, hs: number, rise: number, top: number) {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, hs);
    const n = 24;
    for (let i = 1; i <= n; i++) { const a = Math.PI - (Math.PI * i) / n; s.lineTo((w / 2) * Math.cos(a), hs + rise * Math.sin(a)); }
    s.lineTo(w / 2, top);
    s.lineTo(-w / 2, top);
    s.lineTo(-w / 2, hs);
    return s;
  }
  function archBand(w: number, hs: number, rise: number, t: number) {
    const s = new THREE.Shape();
    const n = 24;
    for (let i = 0; i <= n; i++) { const a = (Math.PI * i) / n; const x = (w / 2 + t) * Math.cos(a), y = hs + (rise + t) * Math.sin(a); if (i === 0) s.moveTo(x, y); else s.lineTo(x, y); }
    for (let i = n; i >= 0; i--) { const a = (Math.PI * i) / n; s.lineTo((w / 2) * Math.cos(a), hs + rise * Math.sin(a)); }
    return s;
  }

  function wall(ax: "x" | "z", at: number, a1: number, a2: number, neg: Side, pos: Side, doors: Door[] = []) {
    const Hh = Math.max(neg?.ch ?? 0, pos?.ch ?? 0);
    const place = (m: Mat, u1: number, u2: number, y1: number, y2: number, n1: number, n2: number, solid = false) => {
      const w = u2 - u1, h = y2 - y1, d = Math.abs(n2 - n1), cu = (u1 + u2) / 2, cn = at + (n1 + n2) / 2;
      if (w <= 0.001 || h <= 0.001) return;
      if (ax === "x") box(m, w, h, d, cu, y1, cn);
      else box(m, d, h, w, cn, y1, cu);
      if (solid) {
        if (ax === "x") col(u1, u2, at + Math.min(n1, n2), at + Math.max(n1, n2), y1, y2);
        else col(at + Math.min(n1, n2), at + Math.max(n1, n2), u1, u2, y1, y2);
      }
    };
    const sides: [number, Side][] = [[-1, neg], [1, pos]];
    const slab = (u1: number, u2: number, y1: number, y2: number) => {
      for (const [s, sd] of sides) place(sd ? sd.m : mExt, u1, u2, y1, y2, 0, s * 0.15);
      if (ax === "x") col(u1, u2, at - 0.15, at + 0.15, y1, y2);
      else col(at - 0.15, at + 0.15, u1, u2, y1, y2);
    };
    const trims = (u1: number, u2: number) => {
      for (const [s, sd] of sides) {
        if (!sd || sd.trim === "none") continue;
        const f = s * 0.15;
        const L = u2 - u1;
        if (sd.trim === "wains") {
          place(mWalnut, u1, u2, 0, 1.12, f, f + s * 0.02);
          const cnt = Math.max(1, Math.round((L - 0.1) / 0.95));
          const pw = (L - 0.12 * (cnt + 1)) / cnt;
          if (pw > 0.2) for (let i = 0; i < cnt; i++) { const p1 = u1 + 0.12 + i * (pw + 0.12); place(mWalnutL, p1, p1 + pw, 0.3, 0.96, f + s * 0.02, f + s * 0.04); }
          place(mWalnut, u1, u2, 1.1, 1.18, f, f + s * 0.055);
          place(mWalnut, u1, u2, 0, 0.2, f, f + s * 0.045);
        } else if (sd.trim === "kitchen") {
          place(mSubway, u1, u2, 0, 2.2, f, f + s * 0.012);
          place(mPaintW, u1, u2, 2.2, 2.26, f, f + s * 0.03);
        } else if (sd.trim === "bead") {
          place(mBead, u1, u2, 0, 1.25, f, f + s * 0.015);
          place(mPaintW, u1, u2, 1.23, 1.3, f, f + s * 0.045);
          place(mPaintW, u1, u2, 0, 0.14, f, f + s * 0.03);
        } else if (sd.trim === "plain") place(mPaintW, u1, u2, 0, 0.14, f, f + s * 0.025);
      }
    };
    // crown moulding along the whole wall (inset at the wall ends)
    for (const [s, sd] of sides) {
      if (!sd || sd.trim === "none") continue;
      const f = s * 0.15;
      const cm = sd.trim === "wains" ? mWalnut : mPaintW;
      place(cm, a1 + 0.15, a2 - 0.15, sd.ch - 0.16, sd.ch, f, f + s * 0.07);
      place(cm, a1 + 0.15, a2 - 0.15, sd.ch - 0.26, sd.ch - 0.16, f, f + s * 0.035);
    }
    let cur = a1;
    for (const d of [...doors].sort((p, q) => p.c - q.c)) {
      const e1 = d.c - d.w / 2, e2 = d.c + d.w / 2;
      if (e1 - cur > 0.01) { slab(cur, e1, 0, Hh); trims(cur === a1 ? cur + 0.15 : cur, e1); }
      const top = d.arch ? d.arch[0] + d.arch[1] : d.h ?? 2.5;
      slab(e1, e2, top, Hh);
      const fm = mWalnut;
      const jh = d.arch ? d.arch[0] : top;
      place(fm, e1 - 0.1, e1 + 0.04, 0, jh, -0.19, 0.19);
      place(fm, e2 - 0.04, e2 + 0.1, 0, jh, -0.19, 0.19);
      if (d.arch) {
        const [hs, rise] = d.arch;
        for (const [s, sd] of sides) {
          const sh = archShape(d.w, hs, rise, top + 0.02);
          if (ax === "x") extr(sd ? sd.m : mExt, sh, 0.15, d.c, 0, at + s * 0.075);
          else extr(sd ? sd.m : mExt, sh, 0.15, at + s * 0.075, 0, d.c, { ry: -Math.PI / 2 });
        }
        const band = archBand(d.w - 0.08, hs, rise - 0.04, 0.16);
        if (ax === "x") extr(fm, band, 0.38, d.c, 0, at);
        else extr(fm, band, 0.38, at, 0, d.c, { ry: -Math.PI / 2 });
        place(mGold, d.c - 0.1, d.c + 0.1, top - 0.08, top + 0.18, -0.21, 0.21);
      } else place(fm, e1 - 0.1, e2 + 0.1, top - 0.04, top + 0.14, -0.19, 0.19);
      cur = e2;
    }
    if (a2 - cur > 0.01) { slab(cur, a2, 0, Hh); trims(cur === a1 ? cur + 0.15 : cur, a2 - 0.15); }
  }

  // ---- exterior ----
  wall("x", -23, -28, -10, null, S.lib);
  wall("x", -23, -10, 28, null, S.stoBrick);
  wall("x", 23, -28, -10, S.lau, null);
  wall("x", 23, -10, 10, S.foy, null);
  wall("x", 23, 10, 13.5, S.gal, null);
  wall("x", 23, 13.5, 28, S.din, null);
  wall("z", -28, -23, -2, null, S.lib);
  wall("z", -28, -2, 14, null, S.kit);
  wall("z", -28, 14, 23, null, S.lau);
  wall("z", 28, -23, -14, S.sto, null);
  wall("z", 28, -14, -10.5, S.cor, null);
  wall("z", 28, -10.5, 0, S.bath, null);
  wall("z", 28, 0, 12, S.louBlack, null);
  wall("z", 28, 12, 23, S.din, null);
  // ---- interior ----
  wall("z", -10, -23, -14, S.lib, S.sto);
  wall("z", -10, -14, -10.5, S.lib, S.cor, [{ c: -12.25, w: 2.0 }]);
  wall("z", -10, -10.5, -2, S.lib, S.hall, [{ c: -6.25, w: 2.6 }]);
  wall("z", -10, -2, 13, S.kit, S.hall, [{ c: 6, w: 2.6 }]);
  wall("z", -10, 13, 14, S.kit, S.foy);
  wall("z", -10, 14, 23, S.lau, S.foy);
  wall("z", 10, -10.5, 13, S.hall, S.gal, [{ c: -4, w: 2.6 }, { c: 7.5, w: 2.6 }]);
  wall("z", 10, 13, 23, S.foy, S.gal, [{ c: 18, w: 2.4 }]);
  wall("z", 13.5, -10.5, 0, S.gal, S.bath, [{ c: -5.25, w: 2.0 }]);
  wall("z", 13.5, 0, 12, S.gal, S.lou, [{ c: 6, w: 2.6, arch: [2.3, 0.9] }]);
  wall("z", 13.5, 12, 23, S.gal, S.din, [{ c: 17.5, w: 2.6 }]);
  wall("x", -14, -10, 28, S.sto, S.cor, [{ c: 0, w: 3.0 }, { c: 20, w: 2.4 }]);
  wall("x", -10.5, -10, 10, S.cor, S.hall, [{ c: 0, w: 4, arch: [2.7, 1.2] }]);
  wall("x", -10.5, 13.5, 28, S.cor, S.bath);
  wall("x", -2, -28, -10, S.lib, S.kit, [{ c: -14, w: 2.4 }]);
  wall("x", 14, -28, -10, S.kit, S.lau, [{ c: -14, w: 2.4 }]);
  wall("x", 13, -10, 10, S.hall, S.foy, [{ c: 0, w: 6, arch: [3.2, 1.6] }]);
  wall("x", 0, 13.5, 28, S.bath, S.lou);
  wall("x", 12, 13.5, 28, S.lou, S.din, [{ c: 21, w: 2.6 }]);

  // ---- floors & ceilings ----
  const floor = (m: Mat, x1: number, x2: number, z1: number, z2: number, o: PO = {}) => box(m, x2 - x1, 0.2, z2 - z1, (x1 + x2) / 2, -0.2, (z1 + z2) / 2, o);
  const ceil = (m: Mat, x1: number, x2: number, z1: number, z2: number, h: number) => box(m, x2 - x1, 0.2, z2 - z1, (x1 + x2) / 2, h, (z1 + z2) / 2);
  floor(mMarbleFloor, -10, 10, -10.5, 23);
  floor(mFloorOak, -10, 28, -14, -10.5, { swap: true });
  floor(mFloorOak, 10, 13.5, -10.5, 23);
  floor(mFloorDark, -28, -10, -23, -2);
  floor(mQuarry, -28, -10, -2, 14);
  floor(mLauFloor, -28, -10, 14, 23);
  floor(mConcrete, -10, 28, -23, -14);
  floor(mBathFloor, 13.5, 28, -10.5, 0);
  floor(mFloorLou, 13.5, 28, 0, 12);
  floor(mFloorOak, 13.5, 28, 12, 23, { swap: true });
  ceil(mCeil, -10, 10, -10.5, 13, H.hall);
  ceil(mCeil, -10, 10, 13, 23, H.foy);
  ceil(mCeil, -10, 28, -14, -10.5, H.cor);
  ceil(mCeil, 10, 13.5, -10.5, 23, H.gal);
  ceil(mCeil, -28, -10, -23, -2, H.lib);
  ceil(mCeil, -28, -10, -2, 14, H.kit);
  ceil(mCeil, -28, -10, 14, 23, H.lau);
  ceil(mCeilDark, -10, 28, -23, -14, H.sto);
  ceil(mCeil, 13.5, 28, -10.5, 0, H.bath);
  ceil(mCeil, 13.5, 28, 0, 12, H.lou);
  ceil(mCeil, 13.5, 28, 12, 23, H.din);

  k.room("Main Hall", -10, 10, -10.5, 13);
  k.room("Entrance Foyer", -10, 10, 13, 23);
  k.room("North Hallway", -10, 28, -14, -10.5);
  k.room("Gallery Hallway", 10, 13.5, -10.5, 23);
  k.room("Library", -28, -10, -23, -2);
  k.room("Kitchen", -28, -10, -2, 14);
  k.room("Laundry Room", -28, -10, 14, 23);
  k.room("Storage", -10, 28, -23, -14);
  k.room("Bathroom", 13.5, 28, -10.5, 0);
  k.room("Black Tile Lounge", 13.5, 28, 0, 12);
  k.room("Dining Room", 13.5, 28, 12, 23);

  // ================= reusable props =================
  /** gilded frame + canvas from the painting atlas; local frame: on wall, facing +z */
  function painting(x: number, y: number, z: number, ry: number, w: number, h: number, cell: number) {
    grp(x, y, z, ry, () => {
      const f = 0.09;
      box(mGold, w + f * 2, f, 0.06, 0, h / 2, 0.03, { r: 0.02 });
      box(mGold, w + f * 2, f, 0.06, 0, -h / 2 - f, 0.03, { r: 0.02 });
      box(mGold, f, h, 0.06, -w / 2 - f / 2, -h / 2, 0.03, { r: 0.02 });
      box(mGold, f, h, 0.06, w / 2 + f / 2, -h / 2, 0.03, { r: 0.02 });
      box(mGoldDark, w + 0.02, 0.025, 0.035, 0, h / 2 - 0.02, 0.02);
      box(mGoldDark, w + 0.02, 0.025, 0.035, 0, -h / 2 - 0.005, 0.02);
      box(mGoldDark, 0.025, h, 0.035, -w / 2 + 0.005, -h / 2, 0.02);
      box(mGoldDark, 0.025, h, 0.035, w / 2 - 0.005, -h / 2, 0.02);
      const cx = cell % 4, cy = Math.floor(cell / 4);
      const asp = w / h;
      const cw = asp >= 1 ? 1 : asp, ch = asp >= 1 ? 1 / asp : 1;
      plane(mPaint, w, h, 0, 0, 0.012, 0, [(cx + (1 - cw) / 2) / 4, (3 - cy + (1 - ch) / 2) / 4, cw / 4, ch / 4]);
    });
  }
  function poster(x: number, y: number, z: number, ry: number, w: number, h: number, cell: number) {
    grp(x, y, z, ry, () => {
      const cx = cell % 2, cy = Math.floor(cell / 2);
      box(mWalnut, w + 0.06, h + 0.06, 0.02, 0, -h / 2 - 0.03, 0.01);
      plane(mPoster, w, h, 0, 0, 0.022, 0, [cx / 2, (1 - cy) / 2, 0.5, 0.5]);
    });
  }
  /** wall sconce (local: on wall facing +z) */
  function sconce(x: number, y: number, z: number, ry: number) {
    grp(x, y, z, ry, () => {
      box(mBrass, 0.1, 0.24, 0.03, 0, -0.14, 0.015, { r: 0.01 });
      for (const s of [-1, 1]) {
        tube(mBrass, [[0, -0.06, 0.03], [s * 0.08, -0.1, 0.1], [s * 0.15, 0, 0.14]], 0.012, 6, 10);
        cyl(mBrass, 0.035, 0.02, 0.03, s * 0.15, 0, 0.14, 12);
        cyl(mCandle, 0.016, 0.016, 0.1, s * 0.15, 0.03, 0.14, 8);
        sph(mFlame, 0.018, s * 0.15, 0.15, 0.14, [1, 1.7, 1], {}, 8, 6);
        lathe(mShade, [[0.07, 0], [0.045, 0.12], [0.044, 0.121]], s * 0.15, 0.08, 0.14, 16);
      }
    });
  }
  /** candle chandelier; y = height of the lower arms */
  function chandelier(x: number, y: number, z: number, ceilH: number, R = 0.9, arms = 8) {
    cyl(mBrass, 0.015, 0.015, ceilH - y - 0.9, x, y + 0.9, z, 6);
    lathe(mBrass, [[0.001, -0.45], [0.06, -0.4], [0.1, -0.28], [0.05, -0.12], [0.13, 0], [0.06, 0.12], [0.04, 0.4], [0.09, 0.55], [0.03, 0.7], [0.05, 0.9], [0.001, 0.92]], x, y, z, 16);
    torus(mBrass, R * 0.55, 0.015, x, y - 0.02, z, { rx: Math.PI / 2 }, Math.PI * 2, 6, 32);
    const tier = (n: number, rr: number, yy: number, off: number) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + off, c = Math.cos(a), s = Math.sin(a);
        tube(mBrass, [[x + c * 0.08, yy - 0.02, z + s * 0.08], [x + c * rr * 0.5, yy - 0.16, z + s * rr * 0.5], [x + c * rr * 0.95, yy - 0.06, z + s * rr * 0.95], [x + c * rr, yy + 0.04, z + s * rr]], 0.016, 6, 16);
        cyl(mBrass, 0.05, 0.025, 0.04, x + c * rr, yy + 0.04, z + s * rr, 12);
        cyl(mCandle, 0.02, 0.02, 0.15, x + c * rr, yy + 0.08, z + s * rr, 8);
        sph(mFlame, 0.022, x + c * rr, yy + 0.26, z + s * rr, [1, 1.8, 1], {}, 8, 6);
        sph(mGlass, 0.03, x + c * rr * 0.7, yy - 0.2, z + s * rr * 0.7, [1, 1.6, 1], {}, 8, 6);
      }
    };
    tier(arms, R, y, 0);
    tier(Math.max(4, arms - 2), R * 0.55, y + 0.42, 0.3);
  }
  /** fern / palm in a pot */
  function plant(x: number, z: number, s = 1, pot: Mat = mBrass, y = 0) {
    lathe(pot, [[0.001, 0], [0.16 * s, 0], [0.2 * s, 0.05 * s], [0.26 * s, 0.4 * s], [0.29 * s, 0.46 * s], [0.27 * s, 0.48 * s], [0.001, 0.47 * s]], x, y, z, 20);
    cyl(mSoil, 0.25 * s, 0.25 * s, 0.02, x, y + 0.45 * s, z, 16);
    const n = 13;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd() * 0.4;
      const tilt = 0.35 + rnd() * 0.8;
      const L = (0.55 + rnd() * 0.35) * s;
      const dir = new THREE.Vector3(Math.cos(a) * Math.sin(tilt), Math.cos(tilt), Math.sin(a) * Math.sin(tilt));
      const base = new THREE.Vector3(x, y + 0.47 * s, z);
      const mid = base.clone().addScaledVector(dir, L * 0.5);
      const q = new THREE.Quaternion().setFromUnitVectors(up, dir);
      put(i % 2 ? mLeaf : mLeafD, leafGeo, [mid.x, mid.y, mid.z], { q, s: [0.09 * s, L * 0.5, 0.025 * s] });
      const dir2 = dir.clone().add(new THREE.Vector3(0, -0.9, 0)).normalize();
      const tip = base.clone().addScaledVector(dir, L * 0.95).addScaledVector(dir2, L * 0.3);
      const q2 = new THREE.Quaternion().setFromUnitVectors(up, dir2);
      put(i % 2 ? mLeafD : mLeaf, leafGeo, [tip.x, tip.y, tip.z], { q: q2, s: [0.07 * s, L * 0.32, 0.02 * s] });
    }
    col(x - 0.3 * s, x + 0.3 * s, z - 0.3 * s, z + 0.3 * s, y, y + 0.48 * s);
  }
  const turnedLeg = (m: Mat, x: number, y: number, z: number, h: number, r = 0.035) =>
    lathe(m, [[r * 0.7, 0], [r, h * 0.08], [r * 0.6, h * 0.25], [r * 1.1, h * 0.5], [r * 0.6, h * 0.75], [r, h * 0.92], [r, h], [0.001, h]], x, y, z, 10);
  /** upholstered armchair (local front = +z) */
  function armchair(x: number, z: number, ry: number, fab: Mat = mVelvet, wood: Mat = mWalnut) {
    grp(x, 0, z, ry, () => {
      for (const [lx, lz] of [[-0.34, -0.33], [0.34, -0.33], [-0.34, 0.33], [0.34, 0.33]]) turnedLeg(wood, lx, 0, lz, 0.13, 0.03);
      box(fab, 0.86, 0.26, 0.82, 0, 0.13, 0, { r: 0.05 });
      box(fab, 0.58, 0.14, 0.66, 0, 0.38, 0.06, { r: 0.06 });
      box(fab, 0.78, 0.66, 0.2, 0, 0.36, -0.31, { r: 0.07, rx: -0.12 });
      cylC(fab, 0.09, 0.09, 0.8, 0, 1.0, -0.39, 16, { rz: Math.PI / 2 });
      for (const s of [-1, 1]) {
        box(fab, 0.15, 0.26, 0.74, s * 0.355, 0.38, 0.03, { r: 0.05 });
        cylC(fab, 0.085, 0.085, 0.76, s * 0.36, 0.68, 0.04, 16, { rx: Math.PI / 2 });
        sph(fab, 0.085, s * 0.36, 0.68, 0.42, [1, 1, 0.3], {}, 12, 8);
        box(fab, 0.16, 0.6, 0.18, s * 0.34, 0.5, -0.3, { r: 0.07 });
      }
      col(-0.45, 0.45, -0.45, 0.45, 0, 0.52);
      col(-0.45, 0.45, -0.47, -0.2, 0, 1.08);
    });
  }
  /** chesterfield sofa (local front = +z) */
  function sofa(x: number, z: number, ry: number, w: number, fab: Mat = mLeather) {
    grp(x, 0, z, ry, () => {
      for (const lx of [-w / 2 + 0.1, w / 2 - 0.1]) for (const lz of [-0.35, 0.35]) cyl(mWalnut, 0.035, 0.03, 0.1, lx, 0, lz, 8);
      box(fab, w, 0.32, 0.9, 0, 0.1, 0, { r: 0.05 });
      const n = Math.max(2, Math.round(w / 0.7));
      const cw = (w - 0.36) / n;
      for (let i = 0; i < n; i++) box(fab, cw - 0.02, 0.13, 0.66, -w / 2 + 0.18 + cw * (i + 0.5), 0.41, 0.08, { r: 0.05 });
      box(fab, w, 0.5, 0.22, 0, 0.42, -0.34, { r: 0.08 });
      for (const s of [-1, 1]) {
        box(fab, 0.2, 0.36, 0.9, s * (w / 2 - 0.1), 0.4, 0, { r: 0.06 });
        cylC(fab, 0.11, 0.11, 0.92, s * (w / 2 - 0.1), 0.77, 0, 16, { rx: Math.PI / 2 });
      }
      col(-w / 2, w / 2, -0.46, 0.46, 0, 0.55);
      col(-w / 2, w / 2, -0.46, -0.22, 0, 0.94);
    });
  }
  /** small round side table with a table lamp */
  function sideTable(x: number, z: number, lamp = true, wood: Mat = mWalnut) {
    lathe(wood, [[0.18, 0], [0.18, 0.03], [0.05, 0.06], [0.035, 0.3], [0.06, 0.45], [0.035, 0.6], [0.05, 0.64], [0.001, 0.64]], x, 0, z, 16);
    cyl(wood, 0.3, 0.29, 0.04, x, 0.64, z, 24);
    if (lamp) {
      lathe(mBrass, [[0.001, 0], [0.08, 0], [0.09, 0.03], [0.05, 0.08], [0.07, 0.2], [0.02, 0.35], [0.012, 0.45], [0.001, 0.45]], x, 0.68, z, 16);
      lathe(mShade, [[0.2, 0], [0.13, 0.22], [0.125, 0.225]], x, 1.02, z, 20);
      sph(mBulb, 0.035, x, 1.08, z, undefined, {}, 8, 6);
    }
    col(x - 0.3, x + 0.3, z - 0.3, z + 0.3, 0, 0.68);
  }
  /** console table against a wall (local: back at z=0, front +z) */
  function consoleTable(x: number, z: number, ry: number, w = 1.6, wood: Mat = mWalnut, top: Mat = mMarble) {
    grp(x, 0, z, ry, () => {
      box(top, w, 0.04, 0.46, 0, 0.82, 0.23, { r: 0.015 });
      box(wood, w - 0.08, 0.14, 0.4, 0, 0.68, 0.22, { r: 0.01 });
      for (const s of [-1, 1]) {
        seg(wood, [s * (w / 2 - 0.08), 0.68, 0.36], [s * (w / 2 - 0.12), 0.0, 0.38], 0.03, 0.018, 8);
        seg(wood, [s * (w / 2 - 0.08), 0.68, 0.06], [s * (w / 2 - 0.1), 0.0, 0.05], 0.03, 0.018, 8);
        sph(mBrass, 0.018, s * w * 0.22, 0.75, 0.43, undefined, {}, 8, 6);
      }
      box(wood, w - 0.3, 0.03, 0.3, 0, 0.14, 0.22);
      col(-w / 2, w / 2, 0, 0.46, 0, 0.86);
    });
  }
  const vase = (x: number, y: number, z: number, s: number, m: Mat) =>
    lathe(m, [[0.001, 0], [0.06 * s, 0], [0.09 * s, 0.05 * s], [0.14 * s, 0.2 * s], [0.12 * s, 0.34 * s], [0.06 * s, 0.42 * s], [0.05 * s, 0.48 * s], [0.08 * s, 0.52 * s], [0.07 * s, 0.53 * s]], x, y, z, 20);
  const mVaseBlue = M(null, "#1f3f7a", 1, { roughness: 0.12 });
  const mVaseWhite = M(null, "#f1eee6", 1, { roughness: 0.12 });
  const mVaseGreen = M(null, "#2f6a5a", 1, { roughness: 0.15 });
  function flowers(x: number, y: number, z: number, s = 1) {
    for (let i = 0; i < 9; i++) {
      const a = rnd() * Math.PI * 2, rr = rnd() * 0.12 * s;
      const tip: V3 = [x + Math.cos(a) * rr * 1.8, y + (0.25 + rnd() * 0.2) * s, z + Math.sin(a) * rr * 1.8];
      seg(mLeafD, [x, y, z], tip, 0.006, 0.005, 4);
      sph(pick(fruitM.slice(0, 3).concat([cloth[3], cloth[8]])), 0.045 * s, tip[0], tip[1], tip[2], undefined, {}, 8, 6);
    }
  }
  /** marble bust on a pedestal */
  function bust(x: number, z: number, ry: number, m: Mat = mMarble) {
    grp(x, 0, z, ry, () => {
      box(m, 0.46, 0.08, 0.46, 0, 0, 0);
      lathe(m, [[0.18, 0.08], [0.15, 0.14], [0.13, 0.2], [0.14, 0.95], [0.19, 1.02], [0.19, 1.06]], 0, 0, 0, 20);
      box(m, 0.42, 0.06, 0.42, 0, 1.06, 0);
      lathe(m, [[0.1, 1.12], [0.08, 1.18], [0.1, 1.2]], 0, 0, 0, 16);
      sph(m, 0.2, 0, 1.33, 0, [1, 0.62, 0.62]);
      cyl(m, 0.06, 0.07, 0.14, 0, 1.38, 0.0, 12);
      sph(m, 0.1, 0, 1.6, 0.01, [0.85, 1.05, 0.95]);
      sph(m, 0.02, 0, 1.58, 0.1, [0.8, 1.4, 1], {}, 8, 6);
      sph(m, 0.09, 0, 1.66, -0.02, [0.95, 0.75, 0.95]);
      col(-0.23, 0.23, -0.23, 0.23, 0, 1.12);
    });
  }
  /** window with night view, frame and velvet curtains (local: on wall facing +z, y = sill height) */
  function windowW(x: number, z: number, ry: number, w = 1.4, h = 2.4, sill = 0.7, curtain: Mat = mVelvet, frame: Mat = mPaintW) {
    grp(x, 0, z, ry, () => {
      plane(mWindow, w, h, 0, sill + h / 2, 0.01, 0, [0, 0, 1, 1]);
      box(frame, w + 0.16, 0.08, 0.08, 0, sill + h, 0.04);
      box(frame, w + 0.24, 0.06, 0.2, 0, sill - 0.06, 0.08);
      for (const s of [-1, 1]) box(frame, 0.08, h, 0.08, s * (w / 2 + 0.04), sill, 0.04);
      box(frame, 0.05, h, 0.05, 0, sill, 0.03);
      for (let i = 1; i < 4; i++) box(frame, w, 0.04, 0.05, 0, sill + (h * i) / 4, 0.03);
      const top = sill + h + 0.35;
      cylC(mBrass, 0.02, 0.02, w + 1.2, 0, top, 0.14, 8, { rz: Math.PI / 2 });
      for (const s of [-1, 1]) {
        sph(mBrass, 0.04, s * (w / 2 + 0.62), top, 0.14, undefined, {}, 8, 6);
        for (let f = 0; f < 4; f++) cyl(curtain, 0.07, 0.085, top - 0.05, s * (w / 2 + 0.1 + f * 0.13), 0.02, 0.14, 10);
        torus(mGold, 0.26, 0.015, s * (w / 2 + 0.3), 1.05, 0.14, { rx: Math.PI / 2, s: [1, 0.4, 1] }, Math.PI * 2, 6, 16);
      }
      box(curtain, w + 1.25, 0.32, 0.08, 0, top - 0.1, 0.2, { r: 0.03 });
    });
  }
  function grandfatherClock(x: number, z: number, ry: number) {
    grp(x, 0, z, ry, () => {
      box(mMahog, 0.62, 0.35, 0.38, 0, 0, 0.19, { r: 0.02 });
      box(mMahog, 0.48, 1.25, 0.3, 0, 0.35, 0.17, { r: 0.02 });
      box(mDarkGlass, 0.24, 0.8, 0.02, 0, 0.55, 0.325);
      cylC(mBrass, 0.07, 0.07, 0.01, 0, 0.8, 0.31, 16, { rx: Math.PI / 2 });
      box(mMahog, 0.58, 0.62, 0.36, 0, 1.6, 0.18, { r: 0.02 });
      plane(mClock, 0.4, 0.4, 0, 1.91, 0.365, 0, [0, 0, 1, 1]);
      box(mMahog, 0.66, 0.08, 0.4, 0, 2.22, 0.2);
      const ped = new THREE.Shape();
      ped.moveTo(-0.33, 0); ped.lineTo(0.33, 0); ped.lineTo(0, 0.2); ped.lineTo(-0.33, 0);
      extr(mMahog, ped, 0.38, 0, 2.3, 0.2);
      for (const s of [-1, 1]) sph(mBrass, 0.03, s * 0.3, 2.34, 0.36, undefined, {}, 8, 6);
      col(-0.32, 0.32, 0, 0.4, 0, 2.3);
    });
  }
  /** bookcase (local: along x centred, back at z=0 (single) or centre (double)) */
  function bookcase(x: number, z: number, ry: number, len: number, h: number, depth: number, shelves: number, double: boolean, wood: Mat = mWalnut, fill = 0.92) {
    grp(x, 0, z, ry, () => {
      const zf = double ? depth / 2 : depth;
      const zb = double ? -depth / 2 : 0;
      const zc = (zf + zb) / 2;
      const bays = Math.max(1, Math.round(len / 0.95));
      const bw = len / bays;
      box(wood, len, 0.12, depth, 0, 0, zc);
      box(wood, len + 0.08, 0.1, depth + 0.08, 0, h - 0.1, zc, { r: 0.02 });
      box(wood, len + 0.14, 0.05, depth + 0.14, 0, h - 0.05, zc);
      box(wood, len, h - 0.1, 0.02, 0, 0, double ? 0 : 0.01);
      for (let i = 0; i <= bays; i++) box(wood, 0.04, h - 0.1, depth, -len / 2 + i * bw, 0, zc);
      const sp = (h - 0.25) / shelves;
      for (let s = 0; s < shelves; s++) {
        const y = 0.12 + s * sp;
        if (s > 0) box(wood, len, 0.025, depth, 0, y - 0.025, zc);
        for (let b = 0; b < bays; b++) {
          const x1 = -len / 2 + b * bw + 0.025, x2 = x1 + bw - 0.05;
          shelfBooks(x1, x2, y, zf - 0.01, 1, sp - 0.04, double ? depth / 2 - 0.03 : depth - 0.04, fill);
          if (double) shelfBooks(x1, x2, y, zb + 0.01, -1, sp - 0.04, depth / 2 - 0.03, fill);
        }
      }
      col(-len / 2 - 0.04, len / 2 + 0.04, zb, zf, 0, h);
    });
  }
  // storage props
  function cbox(w: number, h: number, d: number, x: number, y: number, z: number, ry = 0, dark = false) {
    grp(x, y, z, ry, () => {
      box(dark ? mCardD : mCard, w, h, d, 0, 0, 0, { r: 0.008 });
      box(mTape, 0.06, 0.004, d + 0.004, 0, h, 0);
      box(mTape, 0.06, 0.12, d + 0.004, 0, h - 0.12, 0);
      col(-w / 2, w / 2, -d / 2, d / 2, 0, h);
    });
  }
  function crate(s: number, x: number, y: number, z: number, ry = 0) {
    grp(x, y, z, ry, () => {
      box(mCrate, s, s, s, 0, 0, 0);
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(mPine, 0.07, s, 0.07, (a * (s - 0.06)) / 2, 0, (b * (s - 0.06)) / 2);
      for (const a of [-1, 1]) {
        box(mPine, s + 0.01, 0.07, 0.03, 0, s - 0.07, (a * s) / 2);
        box(mPine, s + 0.01, 0.07, 0.03, 0, 0, (a * s) / 2);
        box(mPine, 0.03, 0.07, s + 0.01, (a * s) / 2, s - 0.07, 0);
      }
      col(-s / 2, s / 2, -s / 2, s / 2, 0, s);
    });
  }
  function barrel(x: number, y: number, z: number, lying = false, ry = 0) {
    const pts: [number, number][] = [[0.001, 0], [0.27, 0], [0.29, 0.02], [0.33, 0.25], [0.35, 0.45], [0.33, 0.65], [0.29, 0.88], [0.27, 0.9], [0.001, 0.9]];
    grp(x, y, z, ry, () => {
      if (!lying) {
        lathe(mBarrel, pts, 0, 0, 0, 24, { uv: "native", uvs: [2, 1] });
        for (const [hy, hr] of [[0.08, 0.3], [0.28, 0.34], [0.62, 0.34], [0.82, 0.3]]) torus(mIron, hr, 0.012, 0, hy, 0, { rx: Math.PI / 2 }, Math.PI * 2, 6, 28);
        cyl(mBeam, 0.26, 0.26, 0.01, 0, 0.885, 0, 20);
        col(-0.35, 0.35, -0.35, 0.35, 0, 0.9);
      } else {
        lathe(mBarrel, pts, -0.45, 0.35, 0, 24, { uv: "native", uvs: [2, 1], rz: -Math.PI / 2 });
        for (const [hx, hr] of [[0.08, 0.3], [0.28, 0.34], [0.62, 0.34], [0.82, 0.3]]) torus(mIron, hr, 0.012, -0.45 + hx, 0.35, 0, { ry: Math.PI / 2 }, Math.PI * 2, 6, 28);
        box(mPine, 0.08, 0.06, 0.5, -0.25, 0, 0);
        box(mPine, 0.08, 0.06, 0.5, 0.25, 0, 0);
        col(-0.45, 0.45, -0.35, 0.35, 0, 0.7);
      }
    });
  }
  function pallet(x: number, y: number, z: number, ry = 0) {
    grp(x, y, z, ry, () => {
      for (const a of [-0.5, 0, 0.5]) box(mPine, 1.2, 0.1, 0.1, 0, 0.02, a * 0.9);
      for (let i = 0; i < 7; i++) box(mPine, 0.12, 0.022, 1.0, -0.54 + i * 0.18, 0.12, 0);
      for (const a of [-0.5, 0, 0.5]) box(mPine, 1.2, 0.02, 0.12, 0, 0, a * 0.9);
      col(-0.6, 0.6, -0.5, 0.5, 0, 0.145);
    });
  }
  function metalRack(x: number, z: number, ry: number, len: number, h: number, d: number, levels: number, fillFn?: (x1: number, x2: number, y: number, d: number) => void) {
    grp(x, 0, z, ry, () => {
      for (const a of [-1, 1]) for (const b of [-1, 1]) box(mSteelDark, 0.05, h, 0.05, (a * (len - 0.05)) / 2, 0, (b * (d - 0.05)) / 2);
      for (let i = 0; i < levels; i++) {
        const y = 0.1 + (i * (h - 0.2)) / (levels - 1);
        box(i % 2 ? mSteel : mSteel, len, 0.03, d, 0, y, 0);
        if (fillFn && i < levels - 1) fillFn(-len / 2 + 0.05, len / 2 - 0.05, y + 0.03, d);
      }
      col(-len / 2, len / 2, -d / 2, d / 2, 0, h);
    });
  }
  function pot(x: number, y: number, z: number, r = 0.14, h = 0.16, m: Mat = mSteel) {
    cyl(m, r, r * 0.97, h, x, y, z, 20);
    cyl(m, r + 0.008, r + 0.008, 0.012, x, y + h, z, 20);
    sph(mRubber, 0.02, x, y + h + 0.025, z, undefined, {}, 8, 6);
    for (const s of [-1, 1]) torus(m, 0.03, 0.007, x + s * (r + 0.015), y + h * 0.8, z, { ry: Math.PI / 2, rx: 0 }, Math.PI * 2, 6, 10);
  }
  function pan(x: number, y: number, z: number, ang: number, r = 0.13) {
    cyl(mIron, r, r * 0.9, 0.05, x, y, z, 20);
    seg(mIron, [x + Math.cos(ang) * r, y + 0.04, z + Math.sin(ang) * r], [x + Math.cos(ang) * (r + 0.24), y + 0.07, z + Math.sin(ang) * (r + 0.24)], 0.012, 0.012, 6);
  }
  function fruitBowl(x: number, y: number, z: number) {
    lathe(mPorcelain, [[0.001, 0], [0.06, 0], [0.14, 0.06], [0.16, 0.09], [0.15, 0.09], [0.001, 0.02]], x, y, z, 20);
    for (let i = 0; i < 5; i++) sph(fruitM[i % 4], 0.045, x + Math.cos(i * 1.3) * 0.07, y + 0.08 + (i === 4 ? 0.05 : 0), z + Math.sin(i * 1.3) * 0.07, undefined, {}, 10, 8);
  }

  // ================= MAIN HALL =================
  // fluted stone columns
  const fluted = (() => {
    const s = new THREE.Shape();
    const n = 144;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = 0.38 * (1 - 0.045 * Math.pow(Math.abs(Math.sin(a * 10)), 0.6));
      if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    return s;
  })();
  const colX = [-5.6, 5.6], colZ = [-5.5, 0.8, 7.1];
  const CT = 7.13; // top of columns / underside of beams
  for (const cx of colX)
    for (const cz of colZ) {
      box(mStone, 1.1, 0.42, 1.1, cx, 0, cz, { r: 0.02 });
      lathe(mStone, [[0.52, 0.42], [0.52, 0.48], [0.47, 0.52], [0.5, 0.58], [0.45, 0.66], [0.41, 0.72], [0.001, 0.72]], cx, 0, cz, 28);
      extr(mStone, fluted, 5.55, cx, 0.72 + 5.55 / 2, cz, { rx: -Math.PI / 2 });
      torus(mStone, 0.39, 0.035, cx, 6.28, cz, { rx: Math.PI / 2 }, Math.PI * 2, 8, 28);
      lathe(mStone, [[0.001, 6.27], [0.37, 6.27], [0.4, 6.38], [0.37, 6.44], [0.44, 6.58], [0.55, 6.76], [0.6, 6.84], [0.001, 6.84]], cx, 0, cz, 28);
      box(mStone, 1.25, 0.29, 1.25, cx, 6.84, cz, { r: 0.02 });
      col(cx - 0.55, cx + 0.55, cz - 0.55, cz + 0.55, 0, CT);
    }
  // timber: longitudinal beams, cross ties, king posts & struts up to the ceiling
  for (const cx of colX) { box(mBeam, 0.5, 0.5, 23.2, cx, CT, 1.25); col(cx - 0.25, cx + 0.25, -10.35, 12.85, CT, CT + 0.5); }
  for (const cz of [-8.3, -5.5, -2.35, 0.8, 3.95, 7.1, 10.1]) {
    const main = colZ.includes(cz);
    box(mBeam, 19.7, main ? 0.5 : 0.36, main ? 0.45 : 0.3, 0, main ? CT : CT + 0.14, cz);
    col(-9.85, 9.85, cz - 0.2, cz + 0.2, CT, CT + 0.5);
    if (main) {
      box(mBeam, 0.3, H.hall - CT - 0.5, 0.3, 0, CT + 0.5, cz);
      for (const s of [-1, 1]) {
        box(mBeam, 0.26, H.hall - CT - 0.5, 0.26, s * 5.6, CT + 0.5, cz);
        seg(mBeam, [s * 0.2, CT + 0.55, cz], [s * 2.8, H.hall - 0.05, cz], 0.1, 0.1, 6);
        seg(mBeam, [s * 5.4, CT + 0.55, cz], [s * 2.8, H.hall - 0.05, cz], 0.1, 0.1, 6);
        seg(mBeam, [s * 5.8, CT + 0.55, cz], [s * 8.0, H.hall - 0.05, cz], 0.1, 0.1, 6);
        // corbels where the ties meet the walls
        box(mBeam, 0.5, 0.5, 0.36, s * 9.6, CT - 0.5, cz, { r: 0.03 });
        box(mBeam, 0.3, 0.4, 0.3, s * 9.7, CT - 0.9, cz, { r: 0.03 });
      }
    }
  }
  box(mBeam, 0.4, 0.3, 23.2, 0, H.hall - 0.3, 1.25);
  // wooden arcades: arches between the columns and from the columns to the walls
  const arcade = (u1: number, u2: number, fixed: number, alongZ: boolean, hs: number) => {
    const w = u2 - u1, c = (u1 + u2) / 2;
    const rise = Math.min(w / 2, 1.45);
    const sh = archShape(w, hs, rise, CT);
    const band = archBand(w - 0.02, hs, rise - 0.01, 0.07);
    if (alongZ) { extr(mWalnut, sh, 0.3, fixed, 0, c, { ry: -Math.PI / 2 }); extr(mGold, band, 0.34, fixed, 0, c, { ry: -Math.PI / 2 }); }
    else { extr(mWalnut, sh, 0.3, c, 0, fixed); extr(mGold, band, 0.34, c, 0, fixed); }
  };
  for (const cx of colX) {
    arcade(-10.35, -5.5 - 0.625, cx, true, 5.3);
    arcade(-5.5 + 0.625, 0.8 - 0.625, cx, true, 5.3);
    arcade(0.8 + 0.625, 7.1 - 0.625, cx, true, 5.3);
    arcade(7.1 + 0.625, 12.85, cx, true, 5.3);
  }
  for (const cz of colZ) {
    arcade(-9.85, -5.6 - 0.625, cz, false, 5.4);
    arcade(5.6 + 0.625, 9.85, cz, false, 5.4);
    arcade(-5.6 + 0.625, 5.6 - 0.625, cz, false, 5.1);
  }
  // red runner through the hall + rugs
  box(mRunner, 2.2, 0.012, 23.1, 0, 0, 1.25, { uv: "native", uvs: [1, 23.1 / 1.6] });
  box(mRugHall, 3.6, 0.014, 5.2, -7.6, 0, 9.6, { uv: "native" });
  box(mRugHall, 3.6, 0.014, 5.2, 7.6, 0, -7.4, { uv: "native" });
  box(mRugHall, 3.4, 0.014, 4.4, -7.4, 0, 0.8, { uv: "native", ry: Math.PI / 2 });

  // horse statue on a stepped plinth
  const PX = 0, PZ = 0.8;
  box(mMarbleDark, 3.7, 0.22, 2.0, PX, 0, PZ, { r: 0.02 });
  box(mMarble, 3.3, 1.0, 1.6, PX, 0.22, PZ, { r: 0.02 });
  box(mMarbleDark, 3.5, 0.18, 1.8, PX, 1.22, PZ, { r: 0.02 });
  box(mGold, 1.0, 0.3, 0.02, PX, 0.55, PZ + 0.81);
  box(mGold, 1.0, 0.3, 0.02, PX, 0.55, PZ - 0.81);
  col(PX - 1.85, PX + 1.85, PZ - 1.0, PZ + 1.0, 0, 1.4);
  const HS = 1.18;
  grp(PX - 0.1, 1.4, PZ, 0, () => {
    const P = (x: number, y: number, z: number): V3 => [x * HS, y * HS, z * HS];
    const E = (m: Mat, c: V3, r: V3, o: PO = {}) => sph(m, 1, ...P(...c), [r[0] * HS, r[1] * HS, r[2] * HS], o, 20, 14);
    const L = (a: V3, b: V3, r1: number, r2: number) => seg(mBronze, P(...a), P(...b), r1 * HS, r2 * HS, 12);
    const m = mBronze;
    E(m, [0, 1.25, 0], [0.72, 0.36, 0.3]);
    E(m, [0.5, 1.22, 0], [0.36, 0.4, 0.29]);
    E(m, [-0.52, 1.3, 0], [0.4, 0.39, 0.31]);
    E(m, [0, 1.12, 0], [0.55, 0.28, 0.27]);
    E(m, [0.42, 1.47, 0], [0.3, 0.2, 0.17]);
    // neck & head
    L([0.6, 1.35, 0], [1.02, 1.95, 0], 0.25, 0.14);
    E(m, [0.72, 1.55, 0], [0.26, 0.3, 0.2], { rz: -0.6 });
    L([0.5, 1.6, 0], [0.94, 2.1, 0], 0.09, 0.05);
    E(m, [1.08, 2.0, 0], [0.16, 0.13, 0.11], { rz: -0.5 });
    L([1.08, 1.98, 0], [1.38, 1.62, 0], 0.11, 0.075);
    E(m, [1.37, 1.6, 0], [0.09, 0.085, 0.085]);
    E(m, [1.12, 1.88, 0], [0.13, 0.1, 0.1]);
    for (const s of [-1, 1]) {
      L([1.02, 2.1, s * 0.05], [1.06, 2.26, s * 0.065], 0.035, 0.006);
      E(mBrass, [1.2, 1.9, s * 0.085], [0.018, 0.018, 0.012]);
    }
    // legs: near front planted, far front raised, hind legs
    const leg = (hip: V3, knee: V3, fet: V3, hoof: V3, r0: number) => {
      L(hip, knee, r0, 0.07);
      E(m, knee, [0.075, 0.08, 0.07]);
      L(knee, fet, 0.055, 0.045);
      E(m, fet, [0.06, 0.065, 0.055]);
      L(fet, hoof, 0.045, 0.05);
      L(hoof, [hoof[0] + 0.02, hoof[1] - 0.07, hoof[2]], 0.06, 0.072);
    };
    leg([0.52, 1.08, 0.14], [0.56, 0.6, 0.14], [0.56, 0.18, 0.14], [0.6, 0.07, 0.14], 0.12);
    leg([0.52, 1.08, -0.14], [0.8, 0.8, -0.14], [0.72, 0.45, -0.14], [0.78, 0.36, -0.14], 0.12);
    for (const [s, off] of [[1, 0], [-1, 0.12]] as const) {
      E(m, [-0.58, 1.12, s * 0.16], [0.26, 0.34, 0.13]);
      leg([-0.6 + off, 0.95, s * 0.15], [-0.74 + off, 0.55, s * 0.15], [-0.68 + off, 0.18, s * 0.15], [-0.64 + off, 0.07, s * 0.15], 0.11);
    }
    // tail
    tube(m, [P(-0.88, 1.48, 0), P(-1.0, 1.36, 0), P(-1.07, 1.05, 0.03), P(-1.03, 0.72, 0.02), P(-0.98, 0.55, 0)], 0.065 * HS, 10, 30);
    tube(m, [P(-0.9, 1.4, 0.03), P(-1.02, 1.2, 0.05), P(-1.05, 0.9, 0.06), P(-1.08, 0.66, 0.04)], 0.045 * HS, 8, 24);
    col(-1.0 * HS, 1.0 * HS, -0.32 * HS, 0.32 * HS, 0, 1.62 * HS);
  });

  // fireplace on the west wall
  grp(-9.85, 0, 0.8, Math.PI / 2, () => {
    box(mMarbleDark, 3.0, 0.06, 0.9, 0, 0, 0.45);
    for (const s of [-1, 1]) {
      box(mMarble, 0.42, 1.28, 0.46, s * 1.08, 0.06, 0.23, { r: 0.02 });
      box(mMarble, 0.5, 0.1, 0.52, s * 1.08, 0.06, 0.25);
    }
    box(mMarble, 2.6, 0.34, 0.44, 0, 1.0, 0.22, { r: 0.02 });
    box(mMarble, 3.0, 0.09, 0.58, 0, 1.34, 0.29, { r: 0.02 });
    box(mMarble, 2.8, 0.06, 0.5, 0, 1.28, 0.26);
    box(mSoot, 1.74, 0.94, 0.06, 0, 0.06, 0.03);
    for (const s of [-1, 1]) box(mSoot, 0.06, 0.94, 0.42, s * 0.85, 0.06, 0.21);
    box(mSoot, 1.74, 0.06, 0.42, 0, 0.94, 0.21);
    box(mEmbers, 1.3, 0.34, 0.02, 0, 0.07, 0.08);
    for (let i = 0; i < 3; i++) cylC(mBeam, 0.06, 0.06, 1.1, 0, 0.16 + (i === 2 ? 0.1 : 0), 0.18 + i * 0.07 - (i === 2 ? 0.07 : 0), 10, { rz: Math.PI / 2 + (i - 1) * 0.12 });
    for (const s of [-1, 1]) { seg(mIron, [s * 0.5, 0.06, 0.4], [s * 0.5, 0.3, 0.4], 0.02, 0.02, 6); sph(mBrass, 0.035, s * 0.5, 0.33, 0.4, undefined, {}, 8, 6); }
    // mantel dressing
    for (const s of [-1, 1]) {
      lathe(mBrass, [[0.001, 0], [0.07, 0], [0.07, 0.02], [0.02, 0.05], [0.015, 0.22], [0.04, 0.25], [0.001, 0.25]], s * 1.1, 1.43, 0.3, 12);
      cyl(mCandle, 0.018, 0.018, 0.18, s * 1.1, 1.68, 0.3, 8);
      sph(mFlame, 0.02, s * 1.1, 1.9, 0.3, [1, 1.7, 1], {}, 8, 6);
      vase(s * 0.62, 1.43, 0.3, 0.8, mVaseBlue);
    }
    box(mMahog, 0.34, 0.3, 0.16, 0, 1.43, 0.3, { r: 0.03 });
    plane(mClock, 0.2, 0.2, 0, 1.6, 0.385, 0, [0, 0, 1, 1]);
    col(-1.5, 1.5, 0, 0.58, 0, 1.43);
    // folding brass-and-iron fire screen standing on the hearth
    const screenPanel = (cx: number, cz: number, w: number, ry: number) => grp(cx, 0.06, cz, ry, () => {
      box(mSoot, w - 0.04, 0.56, 0.01, 0, 0.08, 0);
      for (const sx of [-1, 1]) box(mBrass, 0.025, 0.66, 0.025, sx * (w / 2 - 0.0125), 0, 0);
      box(mBrass, w, 0.025, 0.03, 0, 0.64, 0);
      box(mBrass, w, 0.02, 0.03, 0, 0.07, 0);
      for (let i = 1; i < 6; i++) box(mIron, 0.008, 0.56, 0.012, -w / 2 + (w * i) / 6, 0.08, 0.004);
    });
    screenPanel(0, 0.86, 0.8, 0);
    for (const sx of [-1, 1]) screenPanel(sx * 0.56, 0.78, 0.36, -sx * 0.45);
    col(-0.75, 0.75, 0.66, 0.9, 0, 0.72);
  });
  painting(-9.83, 3.6, 0.8, Math.PI / 2, 1.5, 1.9, 1);
  // armchairs around the fireplace
  armchair(-7.7, -0.9, -Math.PI * 0.72);
  armchair(-7.7, 2.5, -Math.PI * 0.28);
  sideTable(-8.6, -1.9);
  sideTable(-8.6, 3.5, false);
  box(mWalnut, 1.0, 0.04, 0.6, -7.55, 0.42, 0.8, { r: 0.015 });
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) turnedLeg(mWalnut, -7.55 + a * 0.42, 0, 0.8 + b * 0.22, 0.42, 0.025);
  col(-8.05, -7.05, 0.5, 1.1, 0, 0.46);
  vase(-7.55, 0.46, 0.8, 0.5, mVaseWhite);
  flowers(-7.55, 0.66, 0.8, 0.8);
  // east aisle: console, paintings, armchair groups
  consoleTable(9.85, 1.6, -Math.PI / 2, 2.2);
  vase(9.6, 0.86, 0.9, 1.1, mVaseBlue);
  vase(9.6, 0.86, 2.3, 1.1, mVaseBlue);
  flowers(9.6, 1.4, 2.3, 1.3);
  painting(9.83, 2.4, 1.6, -Math.PI / 2, 2.0, 1.3, 0);
  painting(9.83, 5.0, 1.6, -Math.PI / 2, 3.2, 2.2, 4);
  painting(-9.83, 5.2, -8.3, Math.PI / 2, 1.6, 2.0, 5);
  painting(-9.83, 5.2, 9.9, Math.PI / 2, 1.6, 2.0, 9);
  painting(9.83, 5.2, -8.3, -Math.PI / 2, 1.6, 2.0, 13);
  painting(9.83, 5.2, 10.4, -Math.PI / 2, 1.6, 2.0, 6);
  armchair(7.9, -1.6, -Math.PI / 2 - 0.35);
  armchair(7.9, 4.6, -Math.PI / 2 + 0.35);
  sideTable(8.9, -2.6, true);
  armchair(7.4, 10.4, Math.PI * 0.8);
  armchair(8.6, 11.9, Math.PI * 1.2 - 0.3);
  sideTable(9.1, 10.0, true);
  armchair(-7.3, 10.2, Math.PI * 1.15);
  armchair(-8.6, 8.4, Math.PI * 0.6);
  sideTable(-8.9, 10.2, true);
  armchair(7.3, -7.8, -0.35);
  armchair(8.7, -6.3, -Math.PI / 2 + 0.2);
  sideTable(9.0, -8.6, true);
  // back wall of the hall: clock, busts, plants, tall portraits
  grandfatherClock(-8.3, -10.35, 0);
  bust(-3.0, -9.9, 0);
  bust(3.0, -9.9, 0);
  plant(8.9, -9.5, 1.3);
  plant(-9.1, -8.2, 1.1);
  painting(-5.4, 3.0, -10.33, 0, 1.3, 1.8, 7);
  painting(5.4, 3.0, -10.33, 0, 1.3, 1.8, 11);
  painting(0, 6.2, -10.33, 0, 3.4, 1.6, 8);
  // front wall: urns on pedestals flanking the foyer arch, benches
  for (const s of [-1, 1]) {
    box(mMarble, 0.6, 1.0, 0.6, s * 4.1, 0, 12.3, { r: 0.02 });
    box(mMarbleDark, 0.7, 0.08, 0.7, s * 4.1, 1.0, 12.3);
    lathe(mBronze, [[0.001, 0], [0.12, 0], [0.1, 0.05], [0.16, 0.15], [0.26, 0.35], [0.22, 0.55], [0.12, 0.62], [0.16, 0.7], [0.15, 0.72], [0.001, 0.7]], s * 4.1, 1.08, 12.3, 24);
    col(s * 4.1 - 0.35, s * 4.1 + 0.35, 11.95, 12.65, 0, 1.08);
    painting(s * 6.7, 3.2, 12.83, Math.PI, 1.8, 1.3, s > 0 ? 12 : 14);
    grp(s * 7.2, 0, 12.4, Math.PI, () => {
      box(mVelvet, 1.6, 0.14, 0.46, 0, 0.38, 0, { r: 0.05 });
      box(mWalnut, 1.6, 0.06, 0.46, 0, 0.32, 0);
      for (const a of [-1, 1]) for (const b of [-1, 1]) turnedLeg(mWalnut, a * 0.72, 0, b * 0.18, 0.32, 0.03);
      col(-0.8, 0.8, -0.23, 0.23, 0, 0.52);
    });
  }
  for (const [x, z, ry] of [[-9.83, -2.4, Math.PI / 2], [-9.83, 4.0, Math.PI / 2], [-9.83, -9.2, Math.PI / 2], [-9.83, 9.4, Math.PI / 2], [9.83, -1.2, -Math.PI / 2], [9.83, 4.4, -Math.PI / 2], [9.83, -8.2, -Math.PI / 2], [9.83, 11.2, -Math.PI / 2], [-2.9, -10.33, 0], [2.9, -10.33, 0], [-4.8, 12.83, Math.PI], [4.8, 12.83, Math.PI]] as const)
    sconce(x, 2.5, z, ry);
  chandelier(0, 5.9, -2.35, H.hall, 1.1, 10);
  chandelier(0, 5.9, 3.95, H.hall, 1.1, 10);
  chandelier(0, 5.9, 10.1, H.hall, 0.8, 8);
  chandelier(0, 5.9, -8.3, H.hall, 0.8, 8);

  // ================= ENTRANCE FOYER =================
  grp(0, 0, 22.85, Math.PI, () => {
    // stone door surround, double doors and fanlight
    for (const s of [-1, 1]) box(mStone, 0.4, 3.3, 0.16, s * 1.5, 0, 0.08, { r: 0.02 });
    box(mStone, 3.4, 0.35, 0.18, 0, 3.3, 0.09, { r: 0.02 });
    box(mStone, 0.4, 0.5, 0.22, 0, 3.3, 0.11, { r: 0.02 });
    for (const s of [-1, 1]) {
      box(mMahog, 1.28, 3.25, 0.08, s * 0.65, 0, 0.04, { r: 0.01 });
      for (const [py, ph] of [[0.25, 1.1], [1.55, 1.5]]) box(mWalnutL, 0.9, ph, 0.03, s * 0.65, py, 0.09, { r: 0.01 });
      seg(mBrass, [s * 0.12, 1.05, 0.13], [s * 0.12, 1.4, 0.13], 0.018, 0.018, 8);
      sph(mBrass, 0.05, s * 0.12, 1.0, 0.12, undefined, {}, 10, 8);
    }
    const fan = new THREE.Shape();
    fan.absarc(0, 0, 1.3, 0, Math.PI, false);
    fan.lineTo(1.3, 0);
    extr(mWindow, fan, 0.02, 0, 3.65, 0.02);
    extr(mGold, archBand(2.6, 0, 1.3, 0.12), 0.1, 0, 3.65, 0.05);
    for (let i = 1; i < 6; i++) { const a = (i / 6) * Math.PI; seg(mGold, [0, 3.65, 0.05], [Math.cos(a) * 1.3, 3.65 + Math.sin(a) * 1.3, 0.05], 0.015, 0.015, 4); }
  });
  windowW(-5.2, 22.85, Math.PI, 1.5, 3.0, 0.8);
  windowW(5.2, 22.85, Math.PI, 1.5, 3.0, 0.8);
  // coat stand + umbrella stand, bench, consoles with mirrors, round table
  lathe(mWalnut, [[0.25, 0], [0.25, 0.04], [0.05, 0.08], [0.03, 1.9], [0.04, 1.95], [0.001, 1.98]], -8.9, 0, 21.9, 16);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; seg(mBrass, [-8.9, 1.75, 21.9], [-8.9 + Math.cos(a) * 0.22, 1.9, 21.9 + Math.sin(a) * 0.22], 0.012, 0.012, 6); }
  box(cloth[7], 0.4, 0.95, 0.26, -8.9 + 0.2, 0.95, 21.9, { r: 0.1, rz: 0.08 });
  box(cloth[10], 0.36, 0.85, 0.22, -8.9 - 0.18, 1.0, 21.9 + 0.1, { r: 0.1, rz: -0.1 });
  sph(cloth[0], 0.14, -8.9, 1.98, 21.9, [1, 0.5, 1]);
  col(-9.25, -8.55, 21.55, 22.25, 0, 1.9);
  cyl(mBrass, 0.16, 0.15, 0.6, -8.2, 0, 22.3, 16);
  for (let i = 0; i < 3; i++) seg(i === 1 ? cloth[0] : cloth[7], [-8.2 + (i - 1) * 0.05, 0.1, 22.3], [-8.2 + (i - 1) * 0.12, 0.95, 22.3 + (i - 1) * 0.04], 0.03, 0.012, 8);
  col(-8.4, -8.0, 22.1, 22.5, 0, 0.6);
  consoleTable(-9.85, 17.6, Math.PI / 2, 1.8, mMahog);
  grp(-9.83, 0, 17.6, Math.PI / 2, () => {
    box(mGold, 1.2, 1.6, 0.05, 0, 1.2, 0.025, { r: 0.03 });
    box(mMirror, 1.04, 1.44, 0.02, 0, 1.28, 0.05);
    lathe(mBrass, [[0.001, 0], [0.1, 0], [0.04, 0.05], [0.03, 0.35], [0.08, 0.38], [0.001, 0.38]], -0.6, 0.86, 0.25, 12);
    cyl(mCandle, 0.018, 0.018, 0.18, -0.6, 1.24, 0.25, 8);
    sph(mFlame, 0.02, -0.6, 1.46, 0.25, [1, 1.7, 1], {}, 8, 6);
    fruitBowl(0.45, 0.86, 0.25);
  });
  consoleTable(9.85, 15.0, -Math.PI / 2, 1.6, mMahog);
  vase(9.6, 0.86, 15.0, 1.3, mVaseWhite);
  flowers(9.6, 1.5, 15.0, 1.4);
  consoleTable(9.85, 21.3, -Math.PI / 2, 1.6, mMahog);
  painting(9.83, 2.1, 21.3, -Math.PI / 2, 1.2, 0.9, 10);
  painting(-9.83, 2.4, 21.2, Math.PI / 2, 1.1, 1.4, 1);
  painting(9.83, 2.4, 15.0, -Math.PI / 2, 1.2, 0.9, 2);
  grp(-6.4, 0, 22.4, Math.PI, () => {
    box(mVelvet, 1.8, 0.14, 0.5, 0, 0.4, 0, { r: 0.05 });
    box(mWalnut, 1.8, 0.07, 0.5, 0, 0.33, 0);
    for (const a of [-1, 1]) for (const b of [-1, 1]) turnedLeg(mWalnut, a * 0.82, 0, b * 0.2, 0.33, 0.03);
    col(-0.9, 0.9, -0.25, 0.25, 0, 0.54);
  });
  box(mRugHall, 4.6, 0.014, 3.2, 0, 0, 16.8, { uv: "native" });
  lathe(mMahog, [[0.4, 0], [0.4, 0.05], [0.14, 0.1], [0.09, 0.4], [0.15, 0.55], [0.09, 0.7], [0.12, 0.74], [0.001, 0.74]], 0, 0, 16.8, 20);
  cyl(mMahog, 0.62, 0.6, 0.05, 0, 0.74, 16.8, 32);
  col(-0.62, 0.62, 16.18, 17.42, 0, 0.79);
  lathe(mVaseWhite, [[0.001, 0], [0.1, 0], [0.16, 0.12], [0.2, 0.35], [0.14, 0.52], [0.12, 0.56], [0.15, 0.6], [0.001, 0.58]], 0, 0.79, 16.8, 24);
  flowers(0, 1.35, 16.8, 2.2);
  plant(-9.1, 14.0, 1.2);
  plant(8.9, 22.1, 1.1);
  plant(-3.2, 22.2, 0.9, mTerracotta);
  plant(3.2, 22.2, 0.9, mTerracotta);
  chandelier(0, 3.9, 18.5, H.foy, 0.9, 8);
  for (const x of [-7.8, 7.8]) sconce(x, 2.5, 22.83, Math.PI);

  // ================= NORTH HALLWAY (behind the hall) =================
  box(mRunner, 1.6, 0.012, 37.3, 9, 0, -12.25, { uv: "native", uvs: [1, 37.3 / 1.6], ry: Math.PI / 2 });
  [[-7.3, 0], [-3.8, 2], [3.8, 3], [7.3, 5], [11.7, 6], [15.8, 9], [24.0, 13], [26.6, 1]].forEach(([x, c], i) => painting(x, 2.0, -13.83, 0, i % 2 ? 1.2 : 1.5, i % 2 ? 1.5 : 1.1, c));
  [[-7.3, 4], [-4.3, 10], [4.3, 15], [7.3, 11], [16.5, 0], [19.8, 7], [23.4, 12], [26.2, 3]].forEach(([x, c], i) => painting(x, 2.0, -10.67, Math.PI, i % 2 ? 1.5 : 1.2, i % 2 ? 1.1 : 1.5, c));
  for (const x of [-5.6, 5.6, 13.6, 22.2]) sconce(x, 2.4, -13.83, 0);
  for (const x of [-5.9, 5.9, 18.1, 25]) sconce(x, 2.4, -10.67, Math.PI);
  // suits of armour flanking the storage door
  function armour(x: number, z: number, ry: number) {
    grp(x, 0, z, ry, () => {
      box(mWalnut, 0.6, 0.1, 0.5, 0, 0, 0);
      for (const s of [-1, 1]) {
        seg(mChrome, [s * 0.1, 0.12, 0.02], [s * 0.1, 0.5, 0], 0.06, 0.07, 10);
        sph(mChrome, 0.07, s * 0.1, 0.52, 0.01, undefined, {}, 10, 8);
        seg(mChrome, [s * 0.1, 0.55, 0], [s * 0.11, 0.95, 0], 0.075, 0.09, 10);
        box(mChrome, 0.1, 0.06, 0.2, s * 0.1, 0.1, 0.05, { r: 0.02 });
        sph(mChrome, 0.1, s * 0.24, 1.42, 0, [1, 0.8, 1]);
        seg(mChrome, [s * 0.26, 1.4, 0], [s * 0.3, 1.1, 0.04], 0.055, 0.05, 10);
        seg(mChrome, [s * 0.3, 1.1, 0.04], [s * 0.26, 0.86, 0.14], 0.05, 0.045, 10);
        sph(mIron, 0.05, s * 0.26, 0.84, 0.16, undefined, {}, 8, 6);
      }
      lathe(mChrome, [[0.16, 0.92], [0.2, 1.0], [0.22, 1.2], [0.21, 1.38], [0.16, 1.48], [0.08, 1.52], [0.001, 1.52]], 0, 0, 0, 16, { s: [1, 1, 0.75] });
      sph(mChrome, 0.12, 0, 1.64, 0, [0.95, 1.1, 1]);
      box(mIron, 0.16, 0.025, 0.02, 0, 1.64, 0.115);
      box(mVelvet, 0.02, 0.1, 0.02, 0, 1.76, 0.0);
      seg(mBeam, [0.3, 0.1, 0.2], [0.3, 2.3, 0.18], 0.018, 0.018, 6);
      box(mChrome, 0.02, 0.26, 0.18, 0.3, 2.05, 0.18);
      col(-0.3, 0.3, -0.25, 0.25, 0, 1.8);
    });
  }
  armour(-2.4, -13.5, 0);
  armour(2.4, -13.5, 0);
  consoleTable(9.0, -13.85, 0, 1.6);
  vase(8.6, 0.86, -13.6, 1.0, mVaseGreen);
  vase(9.4, 0.86, -13.6, 0.7, mVaseWhite);
  consoleTable(21.2, -10.65, Math.PI, 1.4);
  bust(-8.9, -11.0, Math.PI / 2);
  bust(27.3, -12.25, -Math.PI / 2);
  plant(15.0, -13.4, 1.0);
  for (const x of [-5, 3, 12, 20, 26]) {
    cyl(mBrass, 0.012, 0.012, 0.6, x, H.cor - 0.6, -12.25, 6);
    lathe(mGlass, [[0.001, 0], [0.12, 0.02], [0.16, 0.14], [0.12, 0.28], [0.001, 0.3]], x, H.cor - 0.95, -12.25, 16);
    sph(mBulb, 0.05, x, H.cor - 0.8, -12.25, undefined, {}, 8, 6);
  }

  // ================= GALLERY HALLWAY (east) =================
  box(mRunner2, 1.6, 0.012, 33.2, 11.75, 0, 6.25, { uv: "native", uvs: [1, 33.2 / 1.6] });
  for (const z of [-7.0, 1.2, 12.3, 20.5]) {
    for (const x of [10.3, 13.2]) { box(mWalnut, 0.3, 2.6, 0.32, x, 0, z, { r: 0.02 }); box(mWalnut, 0.4, 0.14, 0.4, x, 2.5, z); col(x - 0.15, x + 0.15, z - 0.16, z + 0.16, 0, 2.6); }
    extr(mWalnut, archShape(2.6, 2.64, 0.8, H.gal), 0.3, 11.75, 0, z);
    extr(mGold, archBand(2.58, 2.64, 0.79, 0.06), 0.34, 11.75, 0, z);
  }
  [[-9.0, 3], [-0.9, 7], [3.4, 1], [11.0, 13], [14.8, 9], [22.0, 5]].forEach(([z, c], i) => painting(10.17, 2.0, z, Math.PI / 2, i % 2 ? 1.1 : 1.4, i % 2 ? 1.4 : 1.0, c));
  [[-8.8, 2], [-2.0, 6], [2.9, 14], [9.7, 10], [14.3, 4], [21.8, 15]].forEach(([z, c], i) => painting(13.33, 2.0, z, -Math.PI / 2, i % 2 ? 1.4 : 1.1, i % 2 ? 1.0 : 1.4, c));
  for (const z of [-3.0, 9.4, 15.3]) sconce(10.17, 2.4, z, Math.PI / 2);
  for (const z of [-1.0, 10.2, 21.0]) sconce(13.33, 2.4, z, -Math.PI / 2);
  for (const z of [-3.0, 5.0, 16.0]) {
    cyl(mBrass, 0.012, 0.012, 0.5, 11.75, H.gal - 0.5, z, 6);
    lathe(mGlass, [[0.001, 0], [0.12, 0.02], [0.16, 0.14], [0.12, 0.28], [0.001, 0.3]], 11.75, H.gal - 0.85, z, 16);
    sph(mBulb, 0.05, 11.75, H.gal - 0.7, z, undefined, {}, 8, 6);
  }
  grp(10.4, 0, 14.4, Math.PI / 2, () => {
    box(mVelvet, 1.5, 0.14, 0.44, 0, 0.38, 0, { r: 0.05 });
    box(mWalnut, 1.5, 0.06, 0.44, 0, 0.32, 0);
    for (const a of [-1, 1]) for (const b of [-1, 1]) turnedLeg(mWalnut, a * 0.66, 0, b * 0.17, 0.32, 0.03);
    col(-0.75, 0.75, -0.22, 0.22, 0, 0.52);
  });
  for (const [z, m] of [[-9.8, mVaseBlue], [3.9, mVaseGreen], [10.6, mVaseWhite]] as const) {
    lathe(mMarble, [[0.2, 0], [0.2, 0.06], [0.13, 0.12], [0.12, 0.9], [0.18, 0.96], [0.18, 1.0]], 13.05, 0, z, 16);
    vase(13.05, 1.0, z, 1.0, m);
    col(12.85, 13.35, z - 0.2, z + 0.2, 0, 1.0);
  }
  grandfatherClock(13.35, 22.4, -Math.PI / 2);
  plant(10.6, 22.3, 0.9);
  windowW(11.75, 22.85, Math.PI, 1.2, 2.4, 0.8, mVelvet);

  // ================= LIBRARY =================
  box(mRugLib, 6.0, 0.014, 4.6, -13.9, 0, -9.0, { uv: "native" });
  box(mRugLib, 5.0, 0.014, 3.4, -13.4, 0, -18.4, { uv: "native" });
  // wall shelving
  bookcase(-24.3, -22.85, 0, 6.2, 3.4, 0.42, 8, false);
  bookcase(-13.85, -22.85, 0, 6.2, 3.4, 0.42, 8, false);
  windowW(-19.05, -22.85, 0, 1.4, 2.6, 0.9, mVelvet, mWalnut);
  bookcase(-27.85, -12.5, Math.PI / 2, 19.6, 3.4, 0.42, 8, false, mWalnut, 0.88);
  bookcase(-10.15, -18.0, -Math.PI / 2, 8.6, 3.4, 0.42, 8, false);
  bookcase(-21.4, -2.15, Math.PI, 11.8, 3.4, 0.42, 8, false, mWalnut, 0.88);
  // freestanding double-sided stacks
  for (const z of [-19.6, -16.4, -13.2, -10.0, -6.8]) {
    bookcase(-21.4, z, 0, 7.6, 2.4, 0.66, 6, true, mWalnutL);
    box(mWalnut, 0.12, 2.5, 0.72, -25.24, 0, z, { r: 0.02 });
    box(mWalnut, 0.12, 2.5, 0.72, -17.56, 0, z, { r: 0.02 });
    lathe(mBrass, [[0.001, 0], [0.05, 0], [0.02, 0.05], [0.02, 0.2], [0.001, 0.2]], -17.5, 2.42, z, 10);
  }
  // rolling ladder on the north shelves
  for (const s of [-1, 1]) seg(mOak, [-24.0 + s * 0.24, 0, -21.6], [-24.0 + s * 0.24, 3.3, -22.35], 0.025, 0.025, 8);
  for (let i = 1; i < 11; i++) { const t = i / 11; seg(mOak, [-24.24, t * 3.3, -21.6 - t * 0.75], [-23.76, t * 3.3, -21.6 - t * 0.75], 0.015, 0.015, 6); }
  cylC(mBrass, 0.015, 0.015, 12.4, -19.05, 3.3, -22.38, 6, { rz: Math.PI / 2 });
  // desk with a banker's lamp and chair
  grp(-13.4, 0, -18.7, 0, () => {
    for (const s of [-1, 1]) {
      box(mMahog, 0.5, 0.72, 0.9, s * 0.72, 0, 0, { r: 0.015 });
      for (let d = 0; d < 3; d++) { box(mMahog, 0.44, 0.2, 0.02, s * 0.72, 0.07 + d * 0.22, 0.455, { r: 0.005 }); sph(mBrass, 0.018, s * 0.72, 0.17 + d * 0.22, 0.47, undefined, {}, 8, 6); }
    }
    box(mMahog, 2.0, 0.05, 1.0, 0, 0.72, 0, { r: 0.015 });
    box(mLeatherG, 1.7, 0.005, 0.7, 0, 0.77, 0);
    lathe(mBrass, [[0.001, 0], [0.09, 0], [0.07, 0.03], [0.015, 0.04], [0.015, 0.3], [0.001, 0.3]], -0.6, 0.77, -0.15, 12);
    put(mGreenShade, new THREE.CylinderGeometry(0.06, 0.08, 0.42, 16, 1, false, 0, Math.PI), [-0.6, 1.1, -0.15], { rz: Math.PI / 2, rx: -0.4 });
    sph(mBulb, 0.03, -0.6, 1.06, -0.12, undefined, {}, 8, 6);
    for (let i = 0; i < 4; i++) box(pick(cloth), 0.24, 0.05, 0.17, 0.55, 0.775 + i * 0.05, -0.2, { ry: i * 0.3 });
    box(mPaper, 0.3, 0.004, 0.22, 0.1, 0.775, 0.1, { ry: 0.2 });
    lathe(mIvory, [[0.001, 0], [0.05, 0], [0.045, 0.08], [0.02, 0.1], [0.001, 0.1]], 0.3, 0.775, -0.25, 12);
    col(-1.0, 1.0, -0.5, 0.5, 0, 0.77);
  });
  armchair(-13.4, -19.7, 0, mLeatherG);
  // reading nook with sofa, armchairs, coffee table, globe
  sofa(-13.9, -7.1, Math.PI, 2.4);
  armchair(-16.1, -9.3, Math.PI / 2, mLeather);
  armchair(-11.7, -9.3, -Math.PI / 2, mLeather);
  box(mWalnut, 1.3, 0.05, 0.7, -13.9, 0.42, -9.3, { r: 0.015 });
  box(mWalnut, 1.2, 0.03, 0.6, -13.9, 0.12, -9.3);
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) turnedLeg(mWalnut, -13.9 + a * 0.58, 0, -9.3 + b * 0.28, 0.42, 0.028);
  col(-14.55, -13.25, -9.65, -8.95, 0, 0.47);
  for (let i = 0; i < 3; i++) box(pick(cloth), 0.26, 0.05, 0.19, -14.1, 0.47 + i * 0.05, -9.3, { ry: i * 0.4 });
  sideTable(-16.1, -7.6, true);
  sideTable(-11.7, -7.6, true);
  lathe(mWalnut, [[0.3, 0], [0.3, 0.04], [0.06, 0.08], [0.04, 0.7], [0.001, 0.72]], -11.2, 0, -15.6, 16);
  torus(mBrass, 0.36, 0.015, -11.2, 1.08, -15.6, { rx: 0.4 }, Math.PI * 2, 6, 32);
  sph(M(tx("globe", () => T.dots("#3f7fb8", "#8a9a4a", 3)), "#fff", 1, { roughness: 0.4 }), 0.33, -11.2, 1.08, -15.6, undefined, { uv: "native" }, 24, 16);
  col(-11.55, -10.85, -15.95, -15.25, 0, 1.4);
  // reading table with chairs
  function diningChair(x: number, z: number, ry: number, seat: Mat = mVelvet, wood: Mat = mMahog) {
    grp(x, 0, z, ry, () => {
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) turnedLeg(wood, a * 0.19, 0, b * 0.19, 0.44, 0.022);
      box(wood, 0.46, 0.05, 0.46, 0, 0.42, 0, { r: 0.01 });
      box(seat, 0.42, 0.06, 0.42, 0, 0.47, 0.01, { r: 0.025 });
      for (const a of [-1, 1]) box(wood, 0.04, 0.55, 0.04, a * 0.19, 0.47, -0.21, { rx: -0.08 });
      box(wood, 0.42, 0.08, 0.04, 0, 0.94, -0.25, { r: 0.01 });
      box(seat, 0.3, 0.34, 0.03, 0, 0.56, -0.23, { r: 0.012, rx: -0.08 });
      col(-0.24, 0.24, -0.26, 0.24, 0, 0.53);
    });
  }
  grp(-13.8, 0, -14.6, 0, () => {
    box(mOak, 2.6, 0.05, 1.0, 0, 0.74, 0, { r: 0.015 });
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) turnedLeg(mOak, a * 1.2, 0, b * 0.4, 0.74, 0.04);
    box(mOak, 2.3, 0.1, 0.8, 0, 0.62, 0);
    for (const s of [-1, 1]) {
      lathe(mBrass, [[0.001, 0], [0.08, 0], [0.015, 0.03], [0.015, 0.34], [0.001, 0.34]], s * 0.8, 0.79, 0, 12);
      put(mGreenShade, new THREE.CylinderGeometry(0.06, 0.08, 0.36, 16, 1, false, 0, Math.PI), [s * 0.8, 1.14, 0.03], { rz: Math.PI / 2, rx: -0.5 });
    }
    for (let i = 0; i < 5; i++) box(pick(cloth), 0.22, 0.04, 0.16, -0.3 + i * 0.05, 0.79 + (i % 3) * 0.04, 0.2, { ry: i * 0.5 });
    col(-1.3, 1.3, -0.5, 0.5, 0, 0.79);
  });
  for (const x of [-14.6, -13.0]) { diningChair(x, -15.4, 0, mLeatherG, mOak); diningChair(x, -13.8, Math.PI, mLeatherG, mOak); }
  // floor book piles
  for (const [x, z] of [[-17.0, -21.2], [-11.0, -3.0], [-26.8, -1.0 - 3], [-17.2, -11.6]]) {
    let y = 0;
    for (let i = 0; i < 6 + Math.floor(rnd() * 5); i++) { const t = 0.04 + rnd() * 0.03; box(pick(cloth), 0.3 + rnd() * 0.08, t, 0.22 + rnd() * 0.05, x, y, z, { ry: (rnd() - 0.5) * 0.6 }); y += t; }
    col(x - 0.2, x + 0.2, z - 0.18, z + 0.18, 0, y);
  }
  bust(-11.0, -21.8, -Math.PI / 4);
  plant(-11.0, -3.0 - 0.2, 1.0);
  chandelier(-19.0, 3.3, -12.0, H.lib, 0.9, 8);
  chandelier(-13.9, 3.3, -9.0, H.lib, 0.7, 6);

  // ================= KITCHEN =================
  /** steel counter run with base cabinets (local: back at z=0, front +z) */
  function counter(x: number, z: number, ry: number, len: number, clutter = true) {
    grp(x, 0, z, ry, () => {
      box(mRubber, len, 0.1, 0.62, 0, 0, 0.31);
      box(mSteel, len, 0.8, 0.68, 0, 0.1, 0.34);
      const n = Math.max(1, Math.round(len / 0.6));
      const dw = len / n;
      for (let i = 0; i < n; i++) {
        const cx = -len / 2 + dw * (i + 0.5);
        box(mSteel, dw - 0.03, 0.66, 0.02, cx, 0.16, 0.69, { r: 0.006 });
        cylC(mChrome, 0.01, 0.01, dw * 0.5, cx, 0.74, 0.72, 8, { rz: Math.PI / 2 });
      }
      box(mSteel, len + 0.02, 0.04, 0.74, 0, 0.9, 0.37);
      box(mSteel, len, 0.14, 0.02, 0, 0.94, 0.01);
      if (clutter) {
        let cx = -len / 2 + 0.25;
        while (cx < len / 2 - 0.25) {
          const t = rnd();
          if (t < 0.18) pot(cx, 0.94, 0.4, 0.12 + rnd() * 0.06, 0.14 + rnd() * 0.1);
          else if (t < 0.3) pan(cx, 0.94, 0.4, Math.PI / 2 + (rnd() - 0.5));
          else if (t < 0.42) { for (let j = 0; j < 3; j++) jar(cx - 0.08 + j * 0.09, 0.94, 0.18 + (j % 2) * 0.08, 1.2 + rnd() * 0.5); }
          else if (t < 0.52) { for (let j = 0; j < 3; j++) bottle(cx - 0.07 + j * 0.07, 0.94, 0.15, 1 + rnd() * 0.2); }
          else if (t < 0.62) { box(mPine, 0.45, 0.025, 0.3, cx, 0.94, 0.4, { ry: rnd() * 0.3, r: 0.01 }); sph(mCrate, 0.12, cx, 1.02, 0.4, [1.4, 0.55, 0.7]); }
          else if (t < 0.7) fruitBowl(cx, 0.94, 0.4);
          else if (t < 0.78) { cyl(mPorcelain, 0.12, 0.12, 0.012 * 8, cx, 0.94, 0.4, 20); }
          else if (t < 0.85) { lathe(mChrome, [[0.001, 0], [0.09, 0], [0.1, 0.08], [0.08, 0.18], [0.03, 0.22], [0.001, 0.23]], cx, 0.94, 0.35, 16); seg(mChrome, [cx + 0.08, 1.02, 0.35], [cx + 0.17, 1.12, 0.35], 0.014, 0.01, 6); torus(mRubber, 0.06, 0.01, cx - 0.06, 1.12, 0.35, { rz: 0.3 }, Math.PI, 6, 10); }
          cx += 0.35 + rnd() * 0.3;
        }
      }
      col(-len / 2, len / 2, 0, 0.74, 0, 0.94);
    });
  }
  /** open steel wall shelf with jars and bottles (local: on wall at z=0, facing +z) */
  function wallShelf(x: number, y: number, z: number, ry: number, len: number, rows = 2) {
    grp(x, y, z, ry, () => {
      for (let i = 0; i < rows; i++) {
        const sy = i * 0.42;
        box(mSteel, len, 0.025, 0.32, 0, sy, 0.16);
        for (const s of [-1, 1]) box(mSteelDark, 0.02, 0.12, 0.28, s * (len / 2 - 0.05), sy - 0.12, 0.14);
        let cx = -len / 2 + 0.08;
        while (cx < len / 2 - 0.08) {
          const t = rnd();
          if (t < 0.4) jar(cx, sy + 0.025, 0.16, 1 + rnd() * 0.6);
          else if (t < 0.65) bottle(cx, sy + 0.025, 0.16, 0.8 + rnd() * 0.3);
          else if (t < 0.8) box(pick(plastic), 0.12, 0.2 + rnd() * 0.08, 0.08, cx, sy + 0.025, 0.16);
          else pot(cx + 0.04, sy + 0.025, 0.16, 0.09, 0.1, mSteel);
          cx += 0.12 + rnd() * 0.08;
        }
      }
    });
  }
  counter(-27.85, 1.15, Math.PI / 2, 5.0);
  counter(-27.85, 8.25, Math.PI / 2, 4.2);
  counter(-21.3, -1.85, 0, 11.4, true);
  counter(-19.1, 13.85, Math.PI, 7.0);
  counter(-10.15, 10.6, -Math.PI / 2, 5.4);
  wallShelf(-27.85, 1.55, 1.15, Math.PI / 2, 4.6);
  wallShelf(-27.85, 1.55, 8.4, Math.PI / 2, 3.8);
  wallShelf(-23.5, 1.55, -1.85, 0, 3.6);
  wallShelf(-17.4, 1.55, -1.85, 0, 3.6);
  // range with hood
  grp(-27.85, 0, 5.0, Math.PI / 2, () => {
    box(mIron, 1.8, 0.9, 0.85, 0, 0, 0.425, { r: 0.01 });
    for (const s of [-1, 1]) { box(mBlackGloss, 0.78, 0.5, 0.02, s * 0.44, 0.12, 0.86, { r: 0.01 }); box(mDarkGlass, 0.4, 0.2, 0.01, s * 0.44, 0.35, 0.872); cylC(mChrome, 0.012, 0.012, 0.6, s * 0.44, 0.68, 0.9, 8, { rz: Math.PI / 2 }); }
    box(mSteel, 1.8, 0.14, 0.04, 0, 0.74, 0.86);
    for (let i = 0; i < 8; i++) cylC(mBlackGloss, 0.025, 0.025, 0.03, -0.7 + i * 0.2, 0.81, 0.89, 12, { rx: Math.PI / 2 });
    for (let i = 0; i < 6; i++) { const bx = -0.6 + (i % 3) * 0.6, bz = 0.25 + Math.floor(i / 3) * 0.35; torus(mIron, 0.1, 0.015, bx, 0.92, bz, { rx: Math.PI / 2 }, Math.PI * 2, 6, 16); cyl(mRubber, 0.06, 0.06, 0.02, bx, 0.9, bz, 12); }
    pot(-0.6, 0.93, 0.25, 0.16, 0.24);
    pot(0.6, 0.93, 0.6, 0.13, 0.16);
    pan(0, 0.93, 0.6, 0.8);
    box(mSteel, 2.0, 0.08, 1.0, 0, 2.3, 0.5);
    const hood = new THREE.CylinderGeometry(0.35, 1.2, 0.9, 4, 1, true);
    put(mSteel, hood, [0, 2.8, 0.45], { ry: Math.PI / 4, s: [1, 1, 0.55] });
    box(mSteel, 0.7, H.kit - 3.25, 0.5, 0, 3.25, 0.3);
    box(mSteel, 1.9, 0.03, 0.2, 0, 1.55, 0.1);
    for (let i = 0; i < 7; i++) { seg(mChrome, [-0.8 + i * 0.26, 1.55, 0.18], [-0.8 + i * 0.26, 1.4, 0.18], 0.006, 0.006, 4); }
    for (let i = 0; i < 4; i++) pan(-0.6 + i * 0.4, 1.05 - (i % 2) * 0.1, 0.18, -Math.PI / 2, 0.1);
    col(-0.9, 0.9, 0, 0.9, 0, 0.93);
  });
  // tall fridges
  grp(-27.85, 0, 12.2, Math.PI / 2, () => {
    for (const s of [-1, 1]) {
      box(mSteel, 0.8, 2.15, 0.8, s * 0.42, 0, 0.4, { r: 0.02 });
      box(mSteel, 0.76, 1.3, 0.02, s * 0.42, 0.8, 0.81, { r: 0.005 });
      box(mSteel, 0.76, 0.72, 0.02, s * 0.42, 0.05, 0.81, { r: 0.005 });
      seg(mChrome, [s * 0.42 - s * 0.32, 1.0, 0.86], [s * 0.42 - s * 0.32, 1.9, 0.86], 0.014, 0.014, 6);
      seg(mChrome, [s * 0.42 - s * 0.32, 0.3, 0.86], [s * 0.42 - s * 0.32, 0.7, 0.86], 0.014, 0.014, 6);
    }
    box(mCard, 0.5, 0.3, 0.4, -0.3, 2.15, 0.35);
    box(mCard, 0.4, 0.25, 0.35, 0.35, 2.15, 0.4, { ry: 0.2 });
    col(-0.84, 0.84, 0, 0.82, 0, 2.15);
  });
  // pantry wire racks
  metalRack(-24.6, 13.55, Math.PI, 2.4, 2.2, 0.55, 5, (x1, x2, y, d) => {
    let cx = x1 + 0.1;
    while (cx < x2 - 0.1) {
      const t = rnd();
      if (t < 0.3) { box(mPaper, 0.3, 0.4, 0.22, cx + 0.1, y, 0, { r: 0.06 }); cx += 0.34; }
      else if (t < 0.55) { for (let j = 0; j < 3; j++) cyl(pick(plastic), 0.04, 0.04, 0.11, cx + j * 0.09, y, -0.1 + (j % 2) * 0.12, 12); cx += 0.3; }
      else if (t < 0.75) { box(mCard, 0.34, 0.24, d - 0.1, cx + 0.15, y, 0, { r: 0.005 }); cx += 0.38; }
      else { for (let j = 0; j < 3; j++) jar(cx + j * 0.1, y, 0.05, 1.3); cx += 0.32; }
    }
  });
  // islands: two long stainless prep tables with undershelves
  function prepTable(x: number, z: number, len: number, d: number) {
    box(mSteel, len, 0.05, d, x, 0.88, z);
    box(mSteel, len, 0.1, 0.02, x, 0.84, z + d / 2);
    box(mSteel, len, 0.1, 0.02, x, 0.84, z - d / 2);
    box(mSteel, len - 0.1, 0.03, d - 0.1, x, 0.18, z);
    for (const a of [-1, 1]) for (const b of [-1, 1]) cyl(mSteel, 0.022, 0.022, 0.88, x + a * (len / 2 - 0.05), 0, z + b * (d / 2 - 0.05), 10);
    let cx = x - len / 2 + 0.3;
    while (cx < x + len / 2 - 0.3) {
      const t = rnd();
      if (t < 0.35) pot(cx, 0.21, z, 0.16, 0.22, mSteel);
      else if (t < 0.6) { box(mCrate, 0.5, 0.25, 0.4, cx, 0.21, z); for (let j = 0; j < 5; j++) sph(fruitM[j % 5], 0.05, cx - 0.16 + j * 0.08, 0.44, z + (j % 2) * 0.1 - 0.05, undefined, {}, 8, 6); }
      else if (t < 0.8) { for (let j = 0; j < 4; j++) cyl(mPorcelain, 0.14 - j * 0.015, 0.1 - j * 0.012, 0.06, cx, 0.21 + j * 0.05, z, 16); }
      cx += 0.55 + rnd() * 0.3;
    }
    cx = x - len / 2 + 0.3;
    while (cx < x + len / 2 - 0.3) {
      const t = rnd();
      const zz = z + (rnd() - 0.5) * (d - 0.4);
      if (t < 0.2) pot(cx, 0.93, zz, 0.15, 0.2);
      else if (t < 0.35) { box(mPine, 0.5, 0.03, 0.34, cx, 0.93, zz, { r: 0.01 }); for (let j = 0; j < 3; j++) sph(fruitM[(j + 2) % 5], 0.04, cx - 0.1 + j * 0.09, 0.99, zz, [1, 0.8, 1], {}, 8, 6); }
      else if (t < 0.5) fruitBowl(cx, 0.93, zz);
      else if (t < 0.62) { for (let j = 0; j < 4; j++) bottle(cx - 0.1 + j * 0.07, 0.93, zz, 0.9); }
      else if (t < 0.74) { lathe(mSteel, [[0.001, 0], [0.08, 0], [0.18, 0.1], [0.19, 0.11], [0.001, 0.02]], cx, 0.93, zz, 20); }
      else if (t < 0.84) pan(cx, 0.93, zz, rnd() * 6);
      cx += 0.4 + rnd() * 0.35;
    }
    col(x - len / 2, x + len / 2, z - d / 2, z + d / 2, 0, 0.93);
  }
  prepTable(-20.0, 3.2, 8.0, 1.1);
  prepTable(-20.0, 8.6, 8.0, 1.1);
  // hanging pot racks over the islands
  for (const z of [3.2, 8.6]) {
    for (const x of [-23.2, -16.8]) cyl(mSteelDark, 0.012, 0.012, H.kit - 2.35, x, 2.35, z, 6);
    for (const dz of [-0.3, 0.3]) cylC(mSteelDark, 0.02, 0.02, 6.6, -20, 2.35, z + dz, 8, { rz: Math.PI / 2 });
    for (let i = 0; i < 14; i++) {
      const hx = -23 + i * 0.46, hz = z + (i % 2 ? 0.3 : -0.3);
      seg(mChrome, [hx, 2.35, hz], [hx, 2.2, hz], 0.006, 0.006, 4);
      if (i % 3 === 0) { cyl(mSteel, 0.14, 0.13, 0.16, hx, 1.95, hz, 16); torus(mSteel, 0.04, 0.008, hx, 2.15, hz, { ry: Math.PI / 2 }, Math.PI * 2, 6, 10); }
      else if (i % 3 === 1) { cylC(mIron, 0.13, 0.12, 0.04, hx, 1.9, hz, 18, { rx: Math.PI / 2 }); seg(mIron, [hx, 2.03, hz], [hx, 2.2, hz], 0.012, 0.012, 6); }
      else { lathe(mBrass, [[0.001, 0], [0.06, 0], [0.1, 0.06], [0.1, 0.07], [0.001, 0.01]], hx, 2.02, hz, 12, { rx: Math.PI / 2 }); seg(mBrass, [hx, 2.02, hz], [hx, 2.2, hz], 0.01, 0.01, 6); }
    }
  }
  // industrial pendant lamps
  for (const [x, z] of [[-23.0, 3.2], [-17.0, 3.2], [-23.0, 8.6], [-17.0, 8.6], [-13.0, 11.0], [-13.0, 1.0]]) {
    cyl(mRubber, 0.008, 0.008, H.kit - 3.3, x, 3.3, z, 4);
    put(mSteelDark, new THREE.LatheGeometry([[0.03, 0.2], [0.05, 0.18], [0.14, 0.08], [0.24, 0], [0.235, -0.005]].map(([a, b]) => new THREE.Vector2(a, b)), 20), [x, 3.12, z]);
    sph(mBulb, 0.06, x, 3.16, z, undefined, {}, 8, 6);
  }
  // east side: baker's rack, bins, mop, posters
  metalRack(-10.5, -0.2, -Math.PI / 2, 1.6, 2.0, 0.5, 4, (x1, x2, y) => {
    for (let cx = x1 + 0.12; cx < x2 - 0.1; cx += 0.28) { if (rnd() < 0.5) sph(mCrate, 0.12, cx, y + 0.07, 0, [1.3, 0.6, 0.8]); else pot(cx, y, 0, 0.1, 0.12, mSteel); }
  });
  for (const z of [2.1, 2.8]) { lathe(mSteelDark, [[0.001, 0], [0.22, 0], [0.26, 0.75], [0.27, 0.78], [0.001, 0.78]], -10.6, 0, z, 20); col(-10.88, -10.32, z - 0.28, z + 0.28, 0, 0.78); }
  lathe(plastic[3], [[0.001, 0], [0.2, 0], [0.22, 0.3], [0.001, 0.3]], -12.0, 0, 13.3, 16);
  seg(mPine, [-12.0, 0.1, 13.3], [-11.7, 1.4, 13.5], 0.015, 0.015, 6);
  poster(-10.17, 2.9, 1.5, -Math.PI / 2, 0.8, 1.0, 0);
  poster(-10.17, 2.9, 3.0, -Math.PI / 2, 0.8, 1.0, 1);
  poster(-10.17, 2.9, 9.2, -Math.PI / 2, 0.8, 1.0, 2);
  poster(-10.17, 2.9, 11.8, -Math.PI / 2, 0.8, 1.0, 3);
  poster(-21.0, 3.1, 13.83, Math.PI, 0.9, 1.1, 2);
  poster(-17.2, 3.1, 13.83, Math.PI, 0.9, 1.1, 0);
  poster(-12.0, 3.1, -1.83, 0, 0.8, 1.0, 3);
  grp(-27.83, 3.2, 5.0 - 2.3, Math.PI / 2, () => { cylC(mWalnut, 0.2, 0.2, 0.05, 0, 0, 0.03, 24, { rx: Math.PI / 2 }); plane(mClock, 0.34, 0.34, 0, 0, 0.06, 0, [0.1, 0.1, 0.8, 0.8]); });

  // ================= LAUNDRY ROOM =================
  function washer(x: number, z: number, ry: number, y = 0, dryer = false) {
    grp(x, y, z, ry, () => {
      box(mEnamel, 0.62, 0.86, 0.62, 0, 0, 0.31, { r: 0.03 });
      box(mEnamel, 0.6, 0.12, 0.02, 0, 0.72, 0.62);
      box(mDarkGlass, 0.14, 0.05, 0.01, 0.12, 0.75, 0.633);
      cylC(mChrome, 0.03, 0.03, 0.03, -0.2, 0.78, 0.63, 16, { rx: Math.PI / 2 });
      torus(mChrome, 0.2, 0.035, 0, 0.38, 0.63, {}, Math.PI * 2, 10, 32);
      cylC(dryer ? mDarkGlass : mGlass, 0.18, 0.18, 0.02, 0, 0.38, 0.63, 24, { rx: Math.PI / 2 });
      if (!dryer) sph(pick(cloth), 0.12, 0, 0.3, 0.45, [1.2, 0.7, 0.8]);
      col(-0.31, 0.31, 0, 0.66, 0, 0.86);
    });
  }
  for (let i = 0; i < 6; i++) washer(-27.2 + i * 0.66, 22.85, Math.PI, 0);
  washer(-27.2, 22.85, Math.PI, 0.86, true);
  washer(-26.54, 22.85, Math.PI, 0.86, true);
  col(-27.52, -26.22, 22.2, 22.85, 0.86, 1.72);
  // utility sink + folding counter
  grp(-22.9, 0, 22.85, Math.PI, () => {
    for (const a of [-1, 1]) for (const b of [0.05, 0.5]) cyl(mSteelDark, 0.02, 0.02, 0.8, a * 0.3, 0, b, 8);
    box(mPorcelain, 0.7, 0.3, 0.55, 0, 0.8, 0.3, { r: 0.03 });
    box(mDarkGlass, 0.6, 0.02, 0.45, 0, 1.08, 0.3);
    seg(mChrome, [0, 1.1, 0.04], [0, 1.35, 0.06], 0.015, 0.015, 8);
    tube(mChrome, [[0, 1.35, 0.06], [0, 1.4, 0.15], [0, 1.3, 0.22]], 0.013, 6, 10);
    col(-0.35, 0.35, 0, 0.6, 0, 1.1);
  });
  counter(-20.0, 22.85, Math.PI, 3.2, false);
  for (let i = 0; i < 4; i++) { box(cloth[(i * 3) % cloth.length], 0.38, 0.12, 0.32, -21.1 + i * 0.5, 0.94, 22.45, { r: 0.04 }); box(cloth[(i * 5 + 1) % cloth.length], 0.38, 0.1, 0.32, -21.1 + i * 0.5, 1.06, 22.45, { r: 0.04 }); }
  lathe(mWeave, [[0.001, 0], [0.2, 0], [0.24, 0.3], [0.25, 0.32], [0.001, 0.31]], -18.9, 0.94, 22.45, 18, { s: [1.3, 1, 1] });
  sph(cloth[4], 0.18, -18.9, 1.24, 22.45, [1.3, 0.5, 1]);
  // long cluttered shelf unit on the north wall with the bird statue
  grp(-21.5, 0, 14.15, 0, () => {
    const len = 11.8, d = 0.46, h = 2.3;
    for (let i = 0; i <= 8; i++) box(mOak, 0.04, h, d, -len / 2 + (i * len) / 8, 0, d / 2);
    for (let s = 0; s < 5; s++) {
      const y = 0.08 + s * 0.52;
      box(mOak, len, 0.03, d, 0, y, d / 2);
      if (s === 4) break;
      let cx = -len / 2 + 0.12;
      while (cx < len / 2 - 0.15) {
        if (s === 2 && Math.abs(cx - 0.4) < 0.35) { cx += 0.1; continue; }
        const t = rnd();
        if (t < 0.25) { const c = pick(plastic); lathe(c, [[0.001, 0], [0.06, 0], [0.065, 0.2], [0.03, 0.26], [0.02, 0.3], [0.001, 0.3]], cx, y + 0.03, d / 2, 12, { s: [1.3, 1, 0.8] }); cx += 0.17; }
        else if (t < 0.4) { box(pick(plastic), 0.22, 0.3, 0.16, cx + 0.06, y + 0.03, d / 2, { r: 0.01 }); cx += 0.26; }
        else if (t < 0.6) { let yy = y + 0.03; for (let j = 0; j < 3 + Math.floor(rnd() * 3); j++) { box(pick(cloth), 0.34, 0.07, 0.3, cx + 0.14, yy, d / 2, { r: 0.03, ry: (rnd() - 0.5) * 0.15 }); yy += 0.07; } cx += 0.38; }
        else if (t < 0.72) { lathe(mWeave, [[0.001, 0], [0.13, 0], [0.16, 0.22], [0.001, 0.22]], cx + 0.12, y + 0.03, d / 2, 14, { s: [1.3, 1, 1] }); sph(pick(cloth), 0.12, cx + 0.12, y + 0.24, d / 2, [1.2, 0.4, 1]); cx += 0.38; }
        else if (t < 0.85) { cbox(0.3, 0.26, 0.3, cx + 0.14, y + 0.03, d / 2, 0, rnd() < 0.5); cx += 0.36; }
        else { for (let j = 0; j < 3; j++) jar(cx + j * 0.1, y + 0.03, d / 2, 1.3); cx += 0.32; }
      }
    }
    // bird statue (bronze) on the middle shelf
    grp(0.4, 0.08 + 2 * 0.52 + 0.03, d / 2, 0.4, () => {
      const B = 1.6;
      cyl(mMarbleDark, 0.09 * B, 0.1 * B, 0.03 * B, 0, 0, 0, 20);
      for (const s of [-1, 1]) seg(mBronze, [0.0, 0.03 * B, s * 0.025 * B], [0.02 * B, 0.1 * B, s * 0.025 * B], 0.006 * B, 0.006 * B, 6);
      sph(mBronze, 1, 0, 0.16 * B, 0, [0.11 * B, 0.075 * B, 0.07 * B], { rz: 0.35 });
      sph(mBronze, 0.048 * B, 0.09 * B, 0.25 * B, 0);
      seg(mGold, [0.125 * B, 0.25 * B, 0], [0.18 * B, 0.24 * B, 0], 0.014 * B, 0.002 * B, 8);
      sph(mBronze, 1, -0.13 * B, 0.12 * B, 0, [0.09 * B, 0.018 * B, 0.045 * B], { rz: 0.45 });
      for (const s of [-1, 1]) sph(mBronze, 1, -0.02 * B, 0.17 * B, s * 0.055 * B, [0.1 * B, 0.045 * B, 0.018 * B], { rz: 0.35 });
    });
    col(-len / 2, len / 2, 0, d, 0, h);
  });
  // clotheslines with hanging laundry
  const shirt = new THREE.Shape();
  shirt.moveTo(-0.2, 0); shirt.lineTo(0.2, 0); shirt.lineTo(0.2, 0.42); shirt.lineTo(0.34, 0.34); shirt.lineTo(0.4, 0.44); shirt.lineTo(0.2, 0.62);
  shirt.lineTo(0.07, 0.62); shirt.quadraticCurveTo(0, 0.56, -0.07, 0.62); shirt.lineTo(-0.2, 0.62); shirt.lineTo(-0.4, 0.44); shirt.lineTo(-0.34, 0.34); shirt.lineTo(-0.2, 0.42); shirt.lineTo(-0.2, 0);
  const pants = new THREE.Shape();
  pants.moveTo(-0.2, 0.75); pants.lineTo(0.2, 0.75); pants.lineTo(0.22, 0); pants.lineTo(0.05, 0); pants.lineTo(0, 0.5); pants.lineTo(-0.05, 0); pants.lineTo(-0.22, 0); pants.lineTo(-0.2, 0.75);
  for (const z of [17.4, 19.8]) {
    for (const x of [-26.9, -15.8]) { cyl(mOak, 0.03, 0.035, 2.4, x, 0, z, 8); box(mOak, 0.4, 0.04, 0.4, x, 0, z); col(x - 0.08, x + 0.08, z - 0.08, z + 0.08, 0, 2.4); }
    tube(mPaper, [[-26.9, 2.3, z], [-21.35, 2.2, z], [-15.8, 2.3, z]], 0.006, 4, 20);
    let x = -26.4;
    while (x < -16.3) {
      const t = rnd(), c = pick(cloth);
      const sag = 2.3 - 0.1 * Math.sin(((x + 26.9) / 11.1) * Math.PI);
      if (t < 0.4) { extr(c, shirt, 0.02, x, sag - 0.62, z, { rz: (rnd() - 0.5) * 0.08 }); x += 0.9; }
      else if (t < 0.6) { extr(c, pants, 0.02, x, sag - 0.75, z); x += 0.55; }
      else if (t < 0.85) { box(c, 0.5, 0.7, 0.015, x, sag - 0.7, z); box(c, 0.5, 0.06, 0.02, x, sag - 0.6, z); x += 0.65; }
      else { for (let j = 0; j < 3; j++) box(pick(cloth), 0.08, 0.22, 0.02, x + j * 0.12, sag - 0.24, z); x += 0.45; }
      for (const dx of [-0.15, 0.15]) box(mPine, 0.015, 0.06, 0.03, x - 0.4 + dx, sag - 0.03, z);
    }
  }
  // floor clutter: baskets, clothes piles, ironing board, drying rack, chair
  const clothesPile = (x: number, z: number, n: number, s = 1) => {
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, rr = rnd() * 0.3 * s;
      sph(pick(cloth), 0.2 * s, x + Math.cos(a) * rr, 0.06 + rnd() * 0.12 * s, z + Math.sin(a) * rr, [1.3 + rnd() * 0.5, 0.35 + rnd() * 0.2, 1 + rnd() * 0.4], { ry: rnd() * 3 }, 12, 8);
    }
    col(x - 0.45 * s, x + 0.45 * s, z - 0.45 * s, z + 0.45 * s, 0, 0.3 * s);
  };
  const basket = (x: number, z: number, full = true) => {
    lathe(mWeave, [[0.001, 0], [0.24, 0], [0.3, 0.42], [0.32, 0.45], [0.3, 0.46], [0.001, 0.44]], x, 0, z, 18, { s: [1.25, 1, 1] });
    torus(mWeave, 0.31, 0.02, x, 0.45, z, { rx: Math.PI / 2, s: [1.25, 1, 1] }, Math.PI * 2, 6, 24);
    if (full) for (let i = 0; i < 4; i++) sph(pick(cloth), 0.16, x + (rnd() - 0.5) * 0.3, 0.46 + rnd() * 0.1, z + (rnd() - 0.5) * 0.2, [1.3, 0.45, 1], { ry: rnd() * 3 }, 12, 8);
    col(x - 0.4, x + 0.4, z - 0.32, z + 0.32, 0, 0.5);
  };
  basket(-24.2, 21.6);
  basket(-19.4, 16.0);
  basket(-17.8, 21.8, false);
  basket(-12.2, 15.2);
  clothesPile(-25.6, 21.3, 7);
  clothesPile(-21.2, 18.6, 6, 1.1);
  clothesPile(-14.0, 21.6, 8, 1.2);
  clothesPile(-26.8, 15.4, 5);
  grp(-11.8, 0, 19.0, Math.PI / 2, () => {
    const ib = new THREE.Shape();
    ib.moveTo(-0.65, -0.18); ib.lineTo(0.45, -0.18); ib.quadraticCurveTo(0.75, -0.12, 0.8, 0); ib.quadraticCurveTo(0.75, 0.12, 0.45, 0.18); ib.lineTo(-0.65, 0.18); ib.lineTo(-0.65, -0.18);
    extr(cloth[9], ib, 0.03, 0, 0.9, 0, { rx: Math.PI / 2 });
    seg(mSteelDark, [-0.45, 0, -0.2], [0.35, 0.88, 0], 0.012, 0.012, 6);
    seg(mSteelDark, [-0.45, 0, 0.2], [0.35, 0.88, 0], 0.012, 0.012, 6);
    seg(mSteelDark, [0.35, 0, -0.2], [-0.45, 0.88, 0], 0.012, 0.012, 6);
    seg(mSteelDark, [0.35, 0, 0.2], [-0.45, 0.88, 0], 0.012, 0.012, 6);
    lathe(mChrome, [[0.001, 0], [0.07, 0], [0.06, 0.05], [0.001, 0.07]], 0.4, 0.92, 0, 12, { s: [1.6, 1, 1] });
    col(-0.65, 0.8, -0.2, 0.2, 0, 0.93);
  });
  grp(-11.0, 0, 16.9, Math.PI / 2, () => {
    for (const s of [-1, 1]) { seg(mChrome, [-0.5, 0, s * 0.3], [0.5, 1.1, s * 0.05], 0.01, 0.01, 6); seg(mChrome, [0.5, 0, s * 0.3], [-0.5, 1.1, s * 0.05], 0.01, 0.01, 6); }
    for (let i = 0; i < 5; i++) cylC(mChrome, 0.006, 0.006, 0.7, 0, 0.5 + i * 0.12, 0, 6, { rx: Math.PI / 2 });
    for (let i = 0; i < 3; i++) box(pick(cloth), 0.9, 0.35, 0.01, 0, 0.5 + i * 0.12 - 0.34, 0.05 + i * 0.01, { rx: 0.1 });
    col(-0.5, 0.5, -0.3, 0.3, 0, 1.1);
  });
  diningChair(-12.8, 22.3, Math.PI, cloth[5], mOak);
  box(cloth[2], 0.4, 0.1, 0.4, -12.8, 0.53, 22.3, { r: 0.05 });
  for (const x of [-24, -17]) {
    box(mPaintW, 0.5, 0.04, 1.2, x, H.lau - 0.06, 18.6);
    box(mBulb, 0.4, 0.02, 1.1, x, H.lau - 0.08, 18.6);
  }
  lathe(mSteelDark, [[0.001, 0], [0.18, 0], [0.2, 0.3], [0.001, 0.3]], -15.3, 0, 15.0, 16);
  seg(mPine, [-15.3, 0.2, 15.0], [-15.6, 1.3, 14.4], 0.015, 0.015, 6);
  col(-15.5, -15.1, 14.8, 15.2, 0, 0.3);

  // ================= STORAGE (far back, brick wall) =================
  for (let x = -9.2; x < 28; x += 1.5) box(mJoist, 0.16, 0.26, 8.7, x, H.sto - 0.26, -18.5);
  box(mJoist, 38, 0.36, 0.3, 9, H.sto - 0.62, -18.5);
  for (const x of [-6, 4, 14, 24]) {
    tube(mRubber, [[x, H.sto - 0.3, -18.2], [x, 3.6, -18.2]], 0.006, 4, 4);
    sph(mBulb, 0.06, x, 3.53, -18.2, [1, 1.2, 1], {}, 10, 8);
    cyl(mBrass, 0.025, 0.025, 0.06, x, 3.6, -18.2, 8);
  }
  const rackFill = (x1: number, x2: number, y: number, d: number) => {
    let cx = x1 + 0.05;
    while (cx < x2 - 0.2) {
      const w = 0.3 + rnd() * 0.35;
      if (cx + w > x2) break;
      const hh = 0.25 + rnd() * 0.35;
      cbox(w, Math.min(hh, 0.6), Math.min(d - 0.1, 0.35 + rnd() * 0.3), cx + w / 2, y, 0, (rnd() - 0.5) * 0.2, rnd() < 0.4);
      cx += w + 0.04;
    }
  };
  for (const x of [-6.5, 4.5, 15.2, 24.6]) metalRack(x, -22.3, 0, 2.7, 3.0, 0.9, 4, rackFill);
  // barrels cluster
  for (const [x, z] of [[-2.8, -22.2], [-2.1, -22.3], [-2.5, -21.6], [-1.6, -21.7], [-0.9, -22.2]]) barrel(x, 0, z);
  barrel(-1.6, 0.9, -22.0);
  barrel(0.6, 0, -21.2, true, 0.4);
  // cardboard box stacks
  const stack = (x: number, z: number, n: number, seed: number) => {
    const r2 = X.rng(seed);
    let y = 0;
    for (let i = 0; i < n; i++) { const w = 0.5 + r2() * 0.3, d = 0.4 + r2() * 0.3, hh = 0.35 + r2() * 0.25; cbox(w, hh, d, x + (r2() - 0.5) * 0.1, y, z + (r2() - 0.5) * 0.1, (r2() - 0.5) * 0.3, r2() < 0.4); y += hh; }
  };
  stack(8.0, -22.3, 4, 1); stack(8.8, -22.3, 3, 2); stack(9.6, -22.2, 5, 3); stack(8.4, -21.5, 2, 4); stack(10.6, -22.3, 2, 5);
  stack(-8.9, -15.0, 3, 6); stack(-8.2, -15.0, 2, 7); stack(-9.1, -15.8, 1, 8);
  stack(26.9, -15.0, 4, 9); stack(26.9, -15.9, 2, 10); stack(26.1, -15.0, 2, 11);
  // crates and pallets
  crate(0.8, 18.6, 0, -22.2); crate(0.8, 19.5, 0, -22.2, 0.1); crate(0.7, 19.0, 0.8, -22.2, -0.2); crate(0.6, 18.4, 0, -21.3, 0.3);
  for (let i = 0; i < 5; i++) pallet(12.2, i * 0.145, -22.1, i % 2 ? 0.05 : -0.04);
  pallet(21.8, 0, -21.9, 0.1); cbox(0.6, 0.5, 0.5, 21.6, 0.145, -21.8); cbox(0.5, 0.4, 0.4, 22.1, 0.145, -22.1, 0.3, true); cbox(0.45, 0.35, 0.4, 21.8, 0.645, -21.9, -0.2);
  for (let i = 0; i < 3; i++) pallet(-4.6, i * 0.145, -15.1, i * 0.06);
  crate(0.7, 4.0, 0, -15.0); crate(0.7, 4.8, 0, -15.0, 0.15); crate(0.6, 4.4, 0.7, -15.0, -0.1);
  crate(0.9, 14.0, 0, -15.1, 0.05); crate(0.6, 15.0, 0, -15.0);
  // covered furniture (dust sheets) and rolled carpets, leaning paintings
  const mSheet = M(fabTex, "#e9e4d8", 0.6, { roughness: 0.95, bump: 0.3 });
  box(mSheet, 2.0, 0.85, 0.9, 25.2, 0, -21.9, { r: 0.18 });
  sph(mSheet, 1, 25.2, 0.85, -21.9, [1.0, 0.18, 0.45], {}, 16, 8);
  col(24.2, 26.2, -22.35, -21.45, 0, 0.9);
  box(mSheet, 0.9, 1.1, 0.9, 27.1, 0, -19.6, { r: 0.2 });
  col(26.65, 27.55, -20.05, -19.15, 0, 1.1);
  box(mSheet, 1.3, 0.8, 0.7, 2.2, 0, -21.9, { r: 0.25 });
  col(1.55, 2.85, -22.25, -21.55, 0, 0.8);
  for (let i = 0; i < 3; i++) cylC(i === 1 ? mRugHall : mRugLou, 0.16, 0.16, 2.4, 6.3, 0.16 + (i === 2 ? 0.3 : 0), -16.0 + i * 0.34 - (i === 2 ? 0.17 : 0), 14, { rz: Math.PI / 2, uv: "native" });
  col(5.1, 7.5, -16.2, -15.2, 0, 0.62);
  grp(-6.0, 0, -14.2, Math.PI, () => {
    for (let i = 0; i < 3; i++) { box(mGold, 1.1 - i * 0.15, 0.8 - i * 0.1, 0.05, 0, 0.1, 0.12 + i * 0.1, { rx: -0.14 }); }
    col(-0.6, 0.6, 0, 0.45, 0, 0.9);
  });
  // ladder leaning on the brick wall
  for (const s of [-1, 1]) seg(mPine, [13.9 + s * 0.22, 0, -21.9], [13.9 + s * 0.22, 3.2, -22.7], 0.03, 0.03, 6);
  for (let i = 1; i < 10; i++) { const t = i / 10; seg(mPine, [13.68, t * 3.2, -21.9 - t * 0.8], [14.12, t * 3.2, -21.9 - t * 0.8], 0.018, 0.018, 6); }
  col(13.6, 14.2, -22.7, -21.8, 0, 1.2);
  // sacks
  for (const [x, z] of [[16.6, -15.0], [17.2, -15.1], [16.9, -15.6]]) { sph(M(fabTex, "#c8b48a", 0.4, { roughness: 1 }), 0.28, x, 0.3, z, [1, 1.1, 0.8], {}, 12, 10); col(x - 0.25, x + 0.25, z - 0.2, z + 0.2, 0, 0.6); }

  // ================= BATHROOM (two-colour tiles) =================
  // clawfoot bathtub
  grp(26.9, 0, -5.2, 0, () => {
    const prof: [number, number][] = [[0.001, 0.14], [0.38, 0.14], [0.44, 0.2], [0.49, 0.45], [0.5, 0.62], [0.49, 0.66], [0.45, 0.66], [0.43, 0.6], [0.41, 0.3], [0.001, 0.26]];
    lathe(mPorcelain, prof, 0, 0, 0, 32, { s: [0.8, 1, 1.75] });
    cylC(mWater, 0.42, 0.42, 0.01, 0, 0.52, 0, 32, { s: [0.8, 1, 1.72] });
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { sph(mGold, 0.06, a * 0.28, 0.07, b * 0.62, [1, 1.3, 1], {}, 10, 8); seg(mGold, [a * 0.28, 0.08, b * 0.62], [a * 0.3, 0.2, b * 0.64], 0.035, 0.05, 8); }
    seg(mChrome, [0, 0.62, -0.84], [0, 0.95, -0.9], 0.018, 0.018, 8);
    tube(mChrome, [[0, 0.95, -0.9], [0, 1.02, -0.8], [0, 0.9, -0.7]], 0.015, 6, 10);
    for (const s of [-1, 1]) sph(mChrome, 0.03, s * 0.08, 0.97, -0.88, undefined, {}, 8, 6);
    sph(M(null, "#f2c230", 1, { roughness: 0.3 }), 0.045, 0.1, 0.56, 0.3, [1.1, 0.9, 1]);
    sph(M(null, "#f2c230", 1, { roughness: 0.3 }), 0.03, 0.14, 0.62, 0.3);
    col(-0.42, 0.42, -0.9, 0.9, 0, 0.66);
  });
  box(mBathMat, 0.6, 0.012, 1.0, 25.9, 0, -5.2, { r: 0.005 });
  // toilet on the north wall
  grp(23.6, 0, -10.35, 0, () => {
    lathe(mPorcelain, [[0.001, 0], [0.13, 0], [0.12, 0.08], [0.16, 0.3], [0.2, 0.4], [0.19, 0.42], [0.001, 0.36]], 0, 0, 0.45, 24, { s: [0.9, 1, 1.25] });
    torus(mPorcelain, 0.16, 0.03, 0, 0.43, 0.46, { rx: Math.PI / 2, s: [0.9, 1.25, 1] }, Math.PI * 2, 8, 24);
    box(mPorcelain, 0.44, 0.4, 0.2, 0, 0.42, 0.12, { r: 0.04 });
    box(mPorcelain, 0.47, 0.05, 0.23, 0, 0.82, 0.12, { r: 0.02 });
    box(mChrome, 0.06, 0.02, 0.04, 0.16, 0.74, 0.23);
    col(-0.24, 0.24, 0, 0.72, 0, 0.45);
    cylC(mChrome, 0.012, 0.012, 0.14, 0.4, 0.7, 0.08, 6, { rz: Math.PI / 2 });
    cylC(mPaper, 0.055, 0.055, 0.1, 0.4, 0.7, 0.08, 12, { rz: Math.PI / 2 });
    box(mWalnut, 0.9, 0.03, 0.2, 0, 1.4, 0.1);
    for (let i = 0; i < 5; i++) { const c = pick(plastic); lathe(c, [[0.001, 0], [0.035, 0], [0.035, 0.14], [0.015, 0.18], [0.001, 0.19]], -0.35 + i * 0.17, 1.43, 0.1, 10); }
  });
  // double pedestal sinks with a gilded mirror
  for (const x of [17.4, 19.6]) {
    lathe(mPorcelain, [[0.14, 0], [0.12, 0.05], [0.07, 0.2], [0.06, 0.6], [0.1, 0.72], [0.001, 0.72]], x, 0, -9.95, 20);
    lathe(mPorcelain, [[0.001, 0.6], [0.12, 0.62], [0.26, 0.75], [0.28, 0.84], [0.25, 0.85], [0.22, 0.8], [0.001, 0.76]], x, 0, -9.9, 28, { s: [1, 1, 0.8] });
    seg(mChrome, [x, 0.85, -10.2], [x, 1.02, -10.18], 0.014, 0.014, 8);
    tube(mChrome, [[x, 1.02, -10.18], [x, 1.06, -10.1], [x, 0.98, -10.02]], 0.012, 6, 10);
    for (const s of [-1, 1]) sph(mChrome, 0.022, x + s * 0.09, 0.88, -10.2, undefined, {}, 8, 6);
    col(x - 0.28, x + 0.28, -10.35, -9.68, 0, 0.85);
    sconce(x + (x < 18 ? -0.9 : 0.9), 1.9, -10.33, 0);
  }
  box(mGold, 2.6, 1.3, 0.05, 18.5, 1.25, -10.32, { r: 0.03 });
  box(mMirror, 2.42, 1.12, 0.02, 18.5, 1.34, -10.28);
  // walk-in shower with glass
  box(mPorcelain, 1.3, 0.06, 1.3, 14.3, 0, -9.7);
  box(mGlass, 0.02, 2.0, 1.2, 14.98, 0.06, -9.72);
  box(mChrome, 0.03, 0.03, 1.2, 14.98, 2.06, -9.72);
  seg(mChrome, [13.72, 1.9, -9.7], [13.9, 2.1, -9.7], 0.012, 0.012, 6);
  cylC(mChrome, 0.1, 0.1, 0.02, 14.0, 2.1, -9.7, 16);
  k.collider(14.95, 15.01, -10.35, -9.12, 0, 2.06, true);
  // towel rail, radiator, hamper, stool, cabinet, plant
  grp(18.0, 0, -0.15, Math.PI, () => {
    for (const s of [-1, 1]) seg(mChrome, [s * 0.4, 1.2, 0], [s * 0.4, 1.2, 0.1], 0.012, 0.012, 6);
    cylC(mChrome, 0.012, 0.012, 0.86, 0, 1.2, 0.1, 6, { rz: Math.PI / 2 });
    box(cloth[8], 0.35, 0.7, 0.03, -0.2, 0.5, 0.12, { r: 0.012 });
    box(cloth[3], 0.35, 0.8, 0.03, 0.2, 0.4, 0.12, { r: 0.012 });
  });
  grp(22.0, 0, -0.15, Math.PI, () => {
    for (let i = 0; i < 12; i++) box(mEnamel, 0.06, 0.7, 0.14, -0.4 + i * 0.075, 0.12, 0.1, { r: 0.02 });
    for (const s of [-1, 1]) cyl(mEnamel, 0.03, 0.03, 0.12, s * 0.4, 0, 0.1, 8);
    col(-0.45, 0.45, 0, 0.18, 0, 0.82);
  });
  lathe(mWeave, [[0.001, 0], [0.2, 0], [0.22, 0.6], [0.23, 0.62], [0.001, 0.62]], 15.0, 0, -0.7, 18);
  cyl(mWeave, 0.24, 0.24, 0.04, 15.0, 0.62, -0.7, 18);
  col(14.77, 15.23, -0.93, -0.47, 0, 0.66);
  lathe(mWalnut, [[0.001, 0.45], [0.18, 0.45], [0.18, 0.5], [0.001, 0.5]], 25.4, 0, -2.0, 20);
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; seg(mWalnut, [25.4 + Math.cos(a) * 0.12, 0.45, -2.0 + Math.sin(a) * 0.12], [25.4 + Math.cos(a) * 0.2, 0, -2.0 + Math.sin(a) * 0.2], 0.02, 0.018, 6); }
  box(cloth[3], 0.3, 0.1, 0.25, 25.4, 0.5, -2.0, { r: 0.04 });
  col(25.2, 25.6, -2.2, -1.8, 0, 0.5);
  grp(27.85, 0, -8.9, -Math.PI / 2, () => {
    box(mPaintW, 0.9, 0.85, 0.45, 0, 0, 0.225, { r: 0.02 });
    for (const s of [-1, 1]) { box(mPaintW, 0.42, 0.7, 0.02, s * 0.22, 0.08, 0.46, { r: 0.01 }); sph(mBrass, 0.018, s * 0.05, 0.6, 0.48, undefined, {}, 8, 6); }
    box(mMarble, 0.94, 0.03, 0.48, 0, 0.85, 0.24);
    for (let i = 0; i < 3; i++) box(cloth[[3, 8, 9][i]], 0.3, 0.08, 0.28, -0.2, 0.88 + i * 0.08, 0.24, { r: 0.03 });
    vase(0.25, 0.88, 0.24, 0.6, mVaseGreen);
    col(-0.45, 0.45, 0, 0.47, 0, 0.88);
  });
  plant(27.2, -0.8, 0.9, mPorcelain);
  plant(14.3, -3.0, 0.8, mPorcelain);
  for (const [x, z] of [[18.5, -5.2], [24.5, -5.2]]) {
    lathe(mGlass, [[0.001, 0], [0.25, 0.01], [0.3, 0.1], [0.001, 0.14]], x, H.bath - 0.14, z, 20);
    sph(mBulb, 0.1, x, H.bath - 0.1, z, [1, 0.5, 1], {}, 12, 6);
  }
  painting(21.0, 2.0, -0.17, Math.PI, 1.0, 0.8, 3);

  // ================= BLACK TILE LOUNGE =================
  box(mRugLou, 5.4, 0.014, 3.6, 19.8, 0, 6.0, { uv: "native" });
  // billiard table
  grp(19.8, 0, 6.0, 0, () => {
    for (const a of [-1, 0, 1]) for (const b of [-1, 1]) lathe(mMahog, [[0.1, 0], [0.08, 0.05], [0.05, 0.2], [0.09, 0.4], [0.06, 0.62], [0.08, 0.66], [0.001, 0.66]], a * 1.15, 0, b * 0.58, 12);
    box(mMahog, 2.7, 0.14, 1.52, 0, 0.62, 0, { r: 0.02 });
    box(mFelt, 2.5, 0.04, 1.3, 0, 0.74, 0);
    for (const s of [-1, 1]) {
      box(mMahog, 2.7, 0.08, 0.1, 0, 0.74, s * 0.71, { r: 0.02 });
      box(mMahog, 0.1, 0.08, 1.52, s * 1.3, 0.74, 0, { r: 0.02 });
      box(mFelt, 2.5, 0.05, 0.04, 0, 0.76, s * 0.63);
      box(mFelt, 0.04, 0.05, 1.3, s * 1.23, 0.76, 0);
      for (const a of [-1, 0, 1]) cyl(mBlackGloss, 0.05, 0.05, 0.01, a * 1.22, 0.775, s * 0.62, 12);
    }
    const ballC = ["#f2f0e6", "#e8c030", "#1f4fa8", "#c0302a", "#5a2a8a", "#e07a2a", "#1f7a3a", "#7a1a1a", "#111111"];
    for (let i = 0; i < 9; i++) sph(M(null, ballC[i], 1, { roughness: 0.15 }), 0.028, i === 0 ? -0.7 : 0.55 + Math.floor(Math.sqrt(i)) * 0.05, 0.806, i === 0 ? 0 : (i % 3) * 0.06 - 0.06, undefined, {}, 10, 8);
    seg(mOak, [-0.8, 0.82, 0.1], [0.4, 0.82, 0.55], 0.008, 0.014, 6);
    col(-1.35, 1.35, -0.76, 0.76, 0, 0.82);
  });
  for (let i = 0; i < 3; i++) {
    const x = 18.9 + i * 0.9;
    cyl(mBrass, 0.008, 0.008, H.lou - 1.9, x, 1.9, 6.0, 4);
    put(mGreenShade, new THREE.LatheGeometry([[0.03, 0.16], [0.12, 0.08], [0.2, 0], [0.195, -0.005]].map(([a, b]) => new THREE.Vector2(a, b)), 20), [x, 1.72, 6.0]);
    sph(mBulb, 0.05, x, 1.76, 6.0, undefined, {}, 8, 6);
  }
  // bar along the black tiled wall
  grp(25.55, 0, 6.0, -Math.PI / 2, () => {
    const L = 7.4;
    box(mWalnut, L, 1.02, 0.6, 0, 0, 0, { r: 0.02 });
    const n = 8;
    for (let i = 0; i < n; i++) box(mWalnutL, L / n - 0.12, 0.7, 0.02, -L / 2 + (i + 0.5) * (L / n), 0.16, 0.31, { r: 0.01 });
    box(mMarbleDark, L + 0.1, 0.05, 0.72, 0, 1.02, 0.02, { r: 0.015 });
    cylC(mBrass, 0.025, 0.025, L, 0, 0.2, 0.42, 8, { rz: Math.PI / 2 });
    col(-L / 2, L / 2, -0.35, 0.38, 0, 1.07);
    let cx = -L / 2 + 0.3;
    while (cx < L / 2 - 0.3) {
      const t = rnd();
      if (t < 0.35) bottle(cx, 1.07, 0, 1.1);
      else if (t < 0.6) lathe(mGlass, [[0.001, 0], [0.035, 0], [0.005, 0.01], [0.005, 0.08], [0.04, 0.1], [0.045, 0.17], [0.001, 0.12]], cx, 1.07, 0.1, 12);
      else if (t < 0.7) { lathe(mChrome, [[0.001, 0], [0.04, 0], [0.045, 0.14], [0.03, 0.18], [0.02, 0.22], [0.001, 0.22]], cx, 1.07, -0.05, 12); }
      else if (t < 0.8) fruitBowl(cx, 1.07, 0);
      cx += 0.3 + rnd() * 0.4;
    }
  });
  for (let i = 0; i < 6; i++) {
    const z = 3.0 + i * 1.2;
    lathe(mChrome, [[0.2, 0], [0.2, 0.02], [0.03, 0.04], [0.025, 0.66], [0.001, 0.66]], 24.75, 0, z, 16);
    torus(mChrome, 0.14, 0.01, 24.75, 0.3, z, { rx: Math.PI / 2 }, Math.PI * 2, 6, 16);
    cyl(mLeather, 0.2, 0.19, 0.09, 24.75, 0.66, z, 20);
    col(24.55, 24.95, z - 0.2, z + 0.2, 0, 0.75);
  }
  // back bar shelves with bottles on the black tiled wall
  grp(27.85, 0, 6.0, -Math.PI / 2, () => {
    box(mWalnut, 7.0, 0.9, 0.45, 0, 0, 0.225, { r: 0.02 });
    box(mMarbleDark, 7.05, 0.04, 0.48, 0, 0.9, 0.24);
    box(mMirror, 5.4, 1.1, 0.02, 0, 1.3, 0.02);
    for (let s = 0; s < 3; s++) {
      const y = 1.3 + s * 0.42;
      box(mGlass, 6.0, 0.02, 0.26, 0, y, 0.14);
      for (let x = -2.9; x < 2.9; x += 0.09 + rnd() * 0.05) bottle(x, y + 0.02, 0.14, 0.85 + rnd() * 0.35);
    }
    for (let x = -3.2; x < 3.2; x += 0.4) sph(mBulb, 0.02, x, 2.6, 0.08, undefined, {}, 6, 4);
    col(-3.5, 3.5, 0, 0.47, 0, 0.94);
  });
  // chesterfields and armchairs
  sofa(16.8, 0.65, 0, 2.3, mLeather);
  armchair(14.5, 2.4, Math.PI / 2 - 0.3, mLeather);
  box(mWalnut, 1.1, 0.05, 0.6, 16.8, 0.42, 2.1, { r: 0.015 });
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) turnedLeg(mWalnut, 16.8 + a * 0.48, 0, 2.1 + b * 0.24, 0.42, 0.025);
  col(16.25, 17.35, 1.8, 2.4, 0, 0.47);
  lathe(mGlass, [[0.001, 0], [0.12, 0], [0.13, 0.03], [0.001, 0.03]], 16.6, 0.47, 2.1, 16);
  sofa(16.8, 11.35, Math.PI, 2.3, mLeatherG);
  armchair(14.5, 9.6, Math.PI / 2 + 0.3, mLeatherG);
  sideTable(14.4, 11.3, true);
  sideTable(14.4, 0.7, true);
  // cue rack + dartboard on the south wall
  grp(21.5, 0, 0.15, 0, () => {
    box(mMahog, 0.9, 1.4, 0.06, 0, 0.5, 0.03, { r: 0.01 });
    for (let i = 0; i < 6; i++) seg(mOak, [-0.35 + i * 0.14, 0.2, 0.1], [-0.35 + i * 0.14, 1.65, 0.08], 0.012, 0.007, 6);
    box(mMahog, 0.8, 0.08, 0.12, 0, 0.2, 0.08);
  });
  painting(18.6, 2.2, 0.17, 0, 1.3, 1.0, 12);
  painting(24.0, 2.2, 0.17, 0, 1.3, 1.0, 8);
  painting(19.5, 2.3, 11.83, Math.PI, 1.4, 1.0, 4);
  painting(24.3, 2.3, 11.83, Math.PI, 1.0, 1.2, 5);
  lathe(mBrass, [[0.2, 0], [0.2, 0.03], [0.03, 0.06], [0.02, 1.5], [0.001, 1.5]], 23.5, 0, 11.4, 12);
  lathe(mShade, [[0.25, 0], [0.16, 0.28], [0.155, 0.285]], 23.5, 1.45, 11.4, 20);
  col(23.3, 23.7, 11.2, 11.6, 0, 1.5);

  // ================= DINING ROOM =================
  box(mRugDin, 7.4, 0.014, 3.8, 21.8, 0, 17.5, { uv: "native" });
  grp(21.8, 0, 17.5, 0, () => {
    box(mMahog, 5.8, 0.06, 1.25, 0, 0.72, 0, { r: 0.02 });
    box(mMahog, 5.5, 0.1, 1.05, 0, 0.62, 0);
    for (const a of [-2.7, 0, 2.7]) for (const b of [-1, 1]) turnedLeg(mMahog, a, 0, b * 0.48, 0.62, 0.05);
    box(M(null, "#efe9dc", 1, { roughness: 0.8 }), 5.0, 0.004, 0.45, 0, 0.78, 0);
    for (let i = 0; i < 4; i++) {
      const x = -2.1 + i * 1.4;
      for (const s of [-1, 1]) {
        cyl(mPorcelain, 0.13, 0.12, 0.015, x, 0.78, s * 0.42, 24);
        lathe(mGlass, [[0.001, 0], [0.035, 0], [0.005, 0.01], [0.005, 0.1], [0.04, 0.12], [0.045, 0.2], [0.001, 0.14]], x + 0.2, 0.78, s * 0.3, 12);
        seg(mChrome, [x - 0.18, 0.785, s * 0.42 - 0.08], [x - 0.18, 0.785, s * 0.42 + 0.08], 0.005, 0.005, 4);
      }
    }
    for (const x of [-1.4, 1.4]) {
      lathe(mBrass, [[0.001, 0], [0.1, 0], [0.04, 0.04], [0.03, 0.35], [0.06, 0.38], [0.001, 0.38]], x, 0.78, 0, 12);
      for (const s of [-1, 0, 1]) {
        if (s) tube(mBrass, [[x, 1.08, 0], [x + s * 0.12, 1.12, 0], [x + s * 0.18, 1.2, 0]], 0.01, 6, 8);
        cyl(mCandle, 0.016, 0.016, 0.16, x + s * 0.18, s ? 1.2 : 1.16, 0, 8);
        sph(mFlame, 0.018, x + s * 0.18, (s ? 1.2 : 1.16) + 0.19, 0, [1, 1.7, 1], {}, 8, 6);
      }
    }
    fruitBowl(0, 0.78, 0);
    col(-2.9, 2.9, -0.63, 0.63, 0, 0.78);
  });
  for (let i = 0; i < 4; i++) {
    const x = 19.7 + i * 1.4;
    diningChair(x, 16.4, 0);
    diningChair(x, 18.6, Math.PI);
  }
  diningChair(18.4, 17.5, Math.PI / 2);
  diningChair(25.2, 17.5, -Math.PI / 2);
  // sideboards, china cabinet
  function sideboard(x: number, z: number, ry: number, w: number) {
    grp(x, 0, z, ry, () => {
      for (const a of [-1, 1]) for (const b of [0.06, 0.44]) turnedLeg(mMahog, a * (w / 2 - 0.06), 0, b, 0.16, 0.03);
      box(mMahog, w, 0.74, 0.5, 0, 0.14, 0.25, { r: 0.015 });
      const n = 3;
      for (let i = 0; i < n; i++) { const cx = -w / 2 + (w / n) * (i + 0.5); box(mWalnutL, w / n - 0.08, 0.5, 0.02, cx, 0.2, 0.51, { r: 0.01 }); sph(mBrass, 0.02, cx, 0.62, 0.53, undefined, {}, 8, 6); box(mWalnutL, w / n - 0.08, 0.12, 0.02, cx, 0.74, 0.51); }
      box(mMarble, w + 0.04, 0.035, 0.54, 0, 0.88, 0.25);
      col(-w / 2, w / 2, 0, 0.52, 0, 0.92);
    });
  }
  sideboard(16.4, 12.15, 0, 2.2);
  lathe(mBrass, [[0.001, 0], [0.1, 0], [0.04, 0.04], [0.03, 0.4], [0.06, 0.42], [0.001, 0.42]], 15.8, 0.92, 12.45, 12);
  vase(16.8, 0.92, 12.45, 1.1, mVaseBlue);
  flowers(16.8, 1.45, 12.45, 1.3);
  sideboard(25.4, 12.15, 0, 2.2);
  for (let i = 0; i < 4; i++) { lathe(mPorcelain, [[0.001, 0], [0.14, 0.005], [0.15, 0.02], [0.001, 0.015]], 24.8 + i * 0.35, 0.92 + 0.2, 12.28, 20, { rx: -Math.PI / 2 + 0.2 }); }
  fruitBowl(26.1, 0.92, 12.45);
  grp(27.85, 0, 17.5, -Math.PI / 2, () => {
    box(mMahog, 1.7, 0.9, 0.5, 0, 0, 0.25, { r: 0.015 });
    box(mMahog, 1.6, 1.4, 0.38, 0, 0.9, 0.19, { r: 0.01 });
    box(mMahog, 1.8, 0.12, 0.54, 0, 2.3, 0.26, { r: 0.02 });
    for (let s = 0; s < 3; s++) {
      box(mGlass, 1.5, 0.015, 0.3, 0, 1.0 + s * 0.42, 0.18);
      for (let i = 0; i < 5; i++) lathe(i % 2 ? mVaseBlue : mPorcelain, [[0.001, 0], [0.11, 0.005], [0.12, 0.02], [0.001, 0.015]], -0.6 + i * 0.3, 1.14 + s * 0.42, 0.1, 18, { rx: -Math.PI / 2 + 0.2 });
    }
    box(mGlass, 1.5, 1.3, 0.01, 0, 0.95, 0.385);
    for (const s of [-1, 0, 1]) box(mMahog, 0.04, 1.3, 0.03, s * 0.76, 0.95, 0.39);
    col(-0.85, 0.85, 0, 0.53, 0, 2.42);
  });
  // grand piano
  grp(16.3, 0, 20.9, -Math.PI / 2 - 0.25, () => {
    const body = new THREE.Shape();
    body.moveTo(-0.75, 0);
    body.lineTo(0.75, 0);
    body.lineTo(0.75, 0.8);
    body.bezierCurveTo(0.75, 1.45, 0.5, 1.7, 0.2, 1.9);
    body.bezierCurveTo(0.0, 2.0, -0.45, 1.9, -0.55, 1.5);
    body.bezierCurveTo(-0.62, 1.1, -0.75, 0.9, -0.75, 0.6);
    body.lineTo(-0.75, 0);
    extr(mBlackGloss, body, 0.3, 0, 0.9, 0, { rx: Math.PI / 2 }, 0.01);
    put(mBlackGloss, new THREE.ShapeGeometry(body), [0, 1.08, 0.0], { rx: Math.PI / 2 - 0.55, uv: "tri" });
    seg(mBlackGloss, [0.55, 1.05, 1.3], [0.45, 1.75, 1.0], 0.012, 0.012, 6);
    for (const [lx, lz] of [[-0.62, 0.15], [0.62, 0.15], [0.0, 1.75]]) lathe(mBlackGloss, [[0.06, 0], [0.05, 0.1], [0.07, 0.4], [0.09, 0.6], [0.1, 0.75], [0.001, 0.75]], lx, 0, lz, 12);
    box(mBlackGloss, 1.5, 0.12, 0.3, 0, 0.72, -0.14, { r: 0.01 });
    box(mIvory, 1.3, 0.03, 0.15, 0, 0.84, -0.2);
    for (let i = 0; i < 26; i++) if (i % 7 !== 2 && i % 7 !== 6) box(mBlackGloss, 0.022, 0.02, 0.09, -0.63 + i * 0.05, 0.86, -0.17);
    box(mBlackGloss, 1.3, 0.25, 0.04, 0, 0.9, -0.03);
    box(mBlackGloss, 0.9, 0.3, 0.02, 0, 1.05, 0.05, { rx: -0.2 });
    col(-0.8, 0.8, -0.3, 2.0, 0, 1.08);
    box(mBlackGloss, 0.8, 0.06, 0.35, 0, 0.44, -0.72, { r: 0.01 });
    box(mLeather, 0.76, 0.05, 0.32, 0, 0.5, -0.72, { r: 0.02 });
    for (const a of [-1, 1]) for (const b of [-1, 1]) cyl(mBlackGloss, 0.02, 0.02, 0.44, a * 0.34, 0, -0.72 + b * 0.13, 8);
    col(-0.4, 0.4, -0.9, -0.54, 0, 0.55);
  });
  windowW(18.5, 22.85, Math.PI, 1.4, 2.5, 0.8, mVelvet, mPaintW);
  windowW(25.0, 22.85, Math.PI, 1.4, 2.5, 0.8, mVelvet, mPaintW);
  painting(13.67, 2.4, 14.4, Math.PI / 2, 1.4, 1.0, 0);
  painting(13.67, 2.4, 21.2, Math.PI / 2, 1.0, 1.3, 9);
  painting(27.83, 2.4, 13.9, -Math.PI / 2, 0.9, 1.2, 13);
  painting(27.83, 2.4, 21.2, -Math.PI / 2, 0.9, 1.2, 1);
  chandelier(21.8, 3.0, 17.5, H.din, 0.8, 8);
  plant(27.2, 22.2, 1.0);
  for (const [x, z, ry] of [[13.67, 17.5 - 2.3, Math.PI / 2], [27.83, 15.5, -Math.PI / 2], [27.83, 19.6, -Math.PI / 2]] as const) sconce(x, 2.2, z, ry);

  // ================= flush batches =================
  for (const [m, b] of info) {
    if (!b.len) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(b.p.slice(0, b.len * 3), 3));
    g.setAttribute("normal", new THREE.BufferAttribute(b.n.slice(0, b.len * 3), 3));
    g.setAttribute("uv", new THREE.BufferAttribute(b.u.slice(0, b.len * 2), 2));
    k.add(g, m, [0, 0, 0], { noShadow: !b.shadow });
  }
  const spineTex = k.tex("mn_spine", X.spine);
  X.fastNormal(spineTex);
  const bookMat = k.mat(spineTex, "#fff", [1, 1], { roughness: 0.7, bump: 0.25 });
  k.instances(bookGeo, bookMat, books, { noShadow: true });
  for (const [g, l] of [[bookGeoFlat, booksFlat], [bookGeoL, booksL], [bookGeoR, booksR]] as const) if (l.length) k.instances(g, bookMat, l, { noShadow: true });
  k.instances(jarGeo, k.mat(null, "#ffffff", [1, 1], { roughness: 0.15, metalness: 0.05 }), jars, { noShadow: true });
  k.instances(bottleGeo, k.mat(null, "#ffffff", [1, 1], { roughness: 0.12, metalness: 0.1 }), bottles, { noShadow: true });

  // ================= spawns & lighting =================
  const hiderSpawns = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    const r = i % 2 ? 3.4 : 4.1;
    return new THREE.Vector3(Math.cos(a) * r * 1.05, 0, PZ + Math.sin(a) * r * 0.95);
  });
  const hunterSpawns = [[-2.4, 20.4], [-1.2, 20.4], [0, 20.4], [1.2, 20.4], [2.4, 20.4], [-1.8, 19.2], [-0.6, 19.2], [0.6, 19.2], [1.8, 19.2]].map(([x, z]) => new THREE.Vector3(x, 0, z));

  return k.finish({
    id: "mansion",
    name: "Hide-and-Seek Mansion",
    bounds: { minX: -27.8, maxX: 27.8, minZ: -22.8, maxZ: 22.8 },
    hunterSpawns,
    hiderSpawns,
    preview: { pos: [2.5, 2.6, 12.2], look: [-0.4, 2.6, -2.0], fov: 62 },
    lighting: {
      sky: "#120d0a",
      hemi: ["#ffe6c4", "#4a3526", 0.5],
      sun: { color: "#ffe0b0", int: 0.9, pos: [9, 40, 14] },
      points: [
        { pos: [0, 5.6, -2.35], color: "#ffc987", int: 70, dist: 20 },
        { pos: [0, 5.6, 5.0], color: "#ffc987", int: 70, dist: 20 },
        { pos: [-18.5, 3.2, -12.0], color: "#ffcf8f", int: 35, dist: 16 },
        { pos: [-19.5, 3.0, 6.0], color: "#fff0d8", int: 35, dist: 16 },
        { pos: [19.8, 2.6, 6.0], color: "#ffcf8f", int: 22, dist: 12 },
        { pos: [21.8, 2.8, 17.5], color: "#ffc987", int: 22, dist: 12 },
      ],
      exposure: 1.0,
      env: 0.55,
      hdri: "apartment",
    },
  });
}
