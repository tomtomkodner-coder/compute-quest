// Deep Sea textures: rippled sand, caustic light pools, algae-covered rock, waterlogged ship planks, weathered
// marble, coral surfaces (brain maze, polyps, lace fans), kelp blades, tropical fish skins, torn sail, light rays.
import { makeTex } from "../../textures";

export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** tileable value noise (0..1) on a lattice of n cells */
function vnoise(n: number, seed: number) {
  const r = rng(seed);
  const g = Array.from({ length: n * n }, () => r());
  return (u: number, v: number) => {
    const x = u * n, y = v * n;
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = x - x0, fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const at = (a: number, b: number) => g[(((b % n) + n) % n) * n + (((a % n) + n) % n)];
    const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
    const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
    return a + (b - a) * sy;
  };
}
function fbm(seed: number, oct = 4, base = 4) {
  const ns = Array.from({ length: oct }, (_, i) => vnoise(base << i, seed + i * 17));
  return (u: number, v: number) => {
    let s = 0, a = 0.5, t = 0;
    for (const n of ns) { s += n(u, v) * a; t += a; a *= 0.5; }
    return s / t;
  };
}
function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** per-pixel painter */
function pixels(g: CanvasRenderingContext2D, w: number, h: number, f: (u: number, v: number, out: number[]) => void) {
  const img = g.getImageData(0, 0, w, h);
  const o = [0, 0, 0, 255];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      o[3] = 255;
      f(x / w, y / h, o);
      const i = (y * w + x) * 4;
      img.data[i] = o[0]; img.data[i + 1] = o[1]; img.data[i + 2] = o[2]; img.data[i + 3] = o[3];
    }
  g.putImageData(img, 0, 0);
}

/** fine sand with wave ripples, darker patches and tiny shell bits */
export const sand = (seed = 3) =>
  makeTex(512, 512, (g, w, h) => {
    const n = fbm(seed, 4, 4), m = vnoise(64, seed + 5), q = vnoise(8, seed + 9);
    const A = hex("#d9c9a0"), B = hex("#b3a078");
    pixels(g, w, h, (u, v, o) => {
      const warp = q(u, v) * 1.6;
      const rip = Math.sin((v * 10 + u * 2 + warp) * Math.PI * 2) * 0.5 + 0.5;
      const t = Math.min(1, Math.max(0, n(u, v) * 0.9 + rip * 0.25 + (m(u, v) - 0.5) * 0.35 - 0.1));
      for (let c = 0; c < 3; c++) o[c] = A[c] + (B[c] - A[c]) * t;
    });
    const r = rng(seed + 1);
    for (let i = 0; i < 2600; i++) {
      const l = r();
      g.fillStyle = l > 0.5 ? `rgba(255,250,235,${0.2 + r() * 0.3})` : `rgba(70,55,35,${0.15 + r() * 0.25})`;
      g.fillRect(r() * w, r() * h, 1 + r() * 1.5, 1 + r() * 1.5);
    }
    for (let i = 0; i < 26; i++) {
      g.fillStyle = ["#f4ead8", "#e8c9b0", "#cfc2b0"][Math.floor(r() * 3)];
      g.beginPath();
      g.ellipse(r() * w, r() * h, 2 + r() * 3, 1.5 + r() * 2, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
  });

/** caustic light pool: bright wavy cell web on black, faded radially (for additive overlay) */
export const causticPool = (seed = 1, radial = true) =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(seed);
    const N = 9;
    const pts: [number, number][] = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) pts.push([(x + 0.15 + r() * 0.7) / N, (y + 0.15 + r() * 0.7) / N]);
    const warp = vnoise(5, seed + 3);
    pixels(g, w, h, (u, v, o) => {
      const wu = u + (warp(u, v) - 0.5) * 0.05, wv = v + (warp(v + 0.3, u) - 0.5) * 0.05;
      const cx = Math.floor(wu * N), cy = Math.floor(wv * N);
      let f1 = 9, f2 = 9;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const ix = (((cx + dx) % N) + N) % N, iy = (((cy + dy) % N) + N) % N;
          const p = pts[iy * N + ix];
          const px = p[0] + Math.floor((cx + dx) / N) + (cx + dx < 0 ? 0 : 0);
          const ox = (cx + dx) / N - ix / N, oy = (cy + dy) / N - iy / N;
          const d = Math.hypot(p[0] + ox - wu, p[1] + oy - wv) * N;
          void px;
          if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
        }
      const e = f2 - f1;
      let s = Math.pow(Math.max(0, 1 - e * 3.2), 3);
      if (radial) {
        const d = Math.hypot(u - 0.5, v - 0.5) * 2;
        s *= Math.max(0, 1 - d * d) ** 1.4;
      }
      o[0] = 120 * s; o[1] = 235 * s; o[2] = 255 * s;
    });
  });

/** rough rock with crevices and algae/encrusting patches */
export const rock = (base = "#6d6f68", seed = 4, algae = 0.45) =>
  makeTex(256, 256, (g, w, h) => {
    const n = fbm(seed, 5, 4), c = vnoise(16, seed + 2), a = fbm(seed + 7, 3, 3);
    const B = hex(base), G = hex("#4f6b3a"), P = hex("#9a6f7d");
    pixels(g, w, h, (u, v, o) => {
      const t = n(u, v);
      const crev = Math.abs(c(u, v) - 0.5) < 0.04 ? 0.55 : 1;
      const al = Math.max(0, (a(u, v) - (1 - algae)) * 4);
      const pk = Math.max(0, (a(v, u) - 0.78) * 5);
      for (let k = 0; k < 3; k++) {
        let x = B[k] * (0.65 + t * 0.7) * crev;
        x = x + (G[k] - x) * Math.min(1, al) * 0.8;
        x = x + (P[k] - x) * Math.min(1, pk) * 0.7;
        o[k] = Math.min(255, x);
      }
    });
    const r = rng(seed);
    for (let i = 0; i < 500; i++) {
      g.fillStyle = r() < 0.5 ? "rgba(0,0,0,0.25)" : "rgba(255,255,240,0.12)";
      g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
    }
  });

/** waterlogged hull planks (run along U), dark grime, green algae toward the bottom, nail heads */
export const hullPlanks = (seed = 5, base = "#5a4431") =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(seed);
    const rows = 8, ph = h / rows;
    const gr = fbm(seed + 3, 4, 4);
    for (let i = 0; i < rows; i++) {
      const tone = (r() - 0.5) * 30;
      const B = hex(base);
      g.fillStyle = `rgb(${B[0] + tone},${B[1] + tone * 0.8},${B[2] + tone * 0.6})`;
      g.fillRect(0, i * ph, w, ph);
      for (let k = 0; k < 14; k++) {
        g.strokeStyle = `rgba(25,15,8,${0.12 + r() * 0.2})`;
        g.lineWidth = 0.6 + r() * 1.4;
        g.beginPath();
        const y = i * ph + r() * ph;
        g.moveTo(0, y);
        g.bezierCurveTo(w * 0.3, y + (r() - 0.5) * 8, w * 0.7, y + (r() - 0.5) * 8, w, y + (r() - 0.5) * 3);
        g.stroke();
      }
      g.fillStyle = "rgba(10,6,3,0.75)";
      g.fillRect(0, i * ph, w, 3);
      const j = r() * w;
      g.fillRect(j, i * ph, 3, ph);
      g.fillStyle = "rgba(40,30,20,0.9)";
      for (const x of [j - 10, j + 12]) { g.beginPath(); g.arc(x, i * ph + ph * 0.3, 2.2, 0, 7); g.arc(x, i * ph + ph * 0.7, 2.2, 0, 7); g.fill(); }
    }
    const img = g.getImageData(0, 0, w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const t = gr(x / w, y / h);
        const al = Math.max(0, Math.min(1, (t - 0.52) * 3.5));
        img.data[i] = img.data[i] * (1 - al * 0.6) + 70 * al * 0.6;
        img.data[i + 1] = img.data[i + 1] * (1 - al * 0.6) + 95 * al * 0.6;
        img.data[i + 2] = img.data[i + 2] * (1 - al * 0.6) + 55 * al * 0.6;
      }
    g.putImageData(img, 0, 0);
  });

/** barrel staves (vertical along V) with two iron hoops */
export const barrel = (seed = 6) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    const n = 12, sw = w / n;
    for (let i = 0; i < n; i++) {
      const t = (r() - 0.5) * 26;
      g.fillStyle = `rgb(${110 + t},${78 + t * 0.8},${48 + t * 0.6})`;
      g.fillRect(i * sw, 0, sw, h);
      g.fillStyle = "rgba(20,12,6,0.7)";
      g.fillRect(i * sw, 0, 2, h);
      for (let k = 0; k < 5; k++) {
        g.strokeStyle = `rgba(40,25,10,${0.15 + r() * 0.2})`;
        g.beginPath();
        const x = i * sw + r() * sw;
        g.moveTo(x, 0);
        g.lineTo(x + (r() - 0.5) * 6, h);
        g.stroke();
      }
    }
    for (const y of [0.14, 0.3, 0.7, 0.86]) {
      g.fillStyle = "#3a3632";
      g.fillRect(0, y * h - 7, w, 14);
      g.fillStyle = "rgba(170,90,40,0.45)";
      for (let k = 0; k < 30; k++) g.fillRect(r() * w, y * h - 7 + r() * 14, 2 + r() * 6, 2);
    }
    g.fillStyle = "rgba(70,100,60,0.25)";
    g.fillRect(0, h * 0.85, w, h * 0.15);
  });

/** weathered marble / limestone with algae stains (fade toward V=0 bottom) */
export const marble = (seed = 7, base = "#e6e1d6", stain = true) =>
  makeTex(256, 256, (g, w, h) => {
    const n = fbm(seed, 4, 3), vn = fbm(seed + 4, 4, 2);
    const B = hex(base);
    pixels(g, w, h, (u, v, o) => {
      const t = n(u, v);
      const vein = Math.abs(Math.sin((u * 3 + vn(u, v) * 4) * Math.PI)) < 0.06 ? 0.78 : 1;
      const st = stain ? Math.max(0, Math.min(1, (n(v, u) - 0.55) * 3)) * 0.5 : 0;
      o[0] = B[0] * (0.88 + t * 0.2) * vein * (1 - st * 0.35);
      o[1] = B[1] * (0.88 + t * 0.2) * vein * (1 - st * 0.18);
      o[2] = B[2] * (0.88 + t * 0.2) * vein * (1 - st * 0.4);
    });
    const r = rng(seed);
    for (let i = 0; i < 300; i++) {
      g.fillStyle = `rgba(60,60,50,${r() * 0.18})`;
      g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
    }
  });

/** old stone paving slabs, partly covered by sand */
export const paving = (seed = 8) =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(seed);
    const n = fbm(seed, 4, 4);
    g.fillStyle = "#5d5a52";
    g.fillRect(0, 0, w, h);
    const rows = 4;
    for (let y = 0; y < rows; y++) {
      let x = -r() * 60;
      while (x < w) {
        const sw = 90 + r() * 70;
        const t = (r() - 0.5) * 30;
        g.fillStyle = `rgb(${150 + t},${146 + t},${132 + t})`;
        g.fillRect(x + 3, y * (h / rows) + 3, sw - 6, h / rows - 6);
        x += sw;
      }
    }
    const img = g.getImageData(0, 0, w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const t = n(x / w, y / h);
        const s = Math.max(0, Math.min(1, (t - 0.45) * 3));
        const k = 0.85 + (t - 0.5) * 0.3;
        img.data[i] = img.data[i] * k * (1 - s) + 205 * s;
        img.data[i + 1] = img.data[i + 1] * k * (1 - s) + 190 * s;
        img.data[i + 2] = img.data[i + 2] * k * (1 - s) + 150 * s;
      }
    g.putImageData(img, 0, 0);
  });

/** brain coral maze grooves */
export const brainCoral = (seed = 9) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#e8e2c8";
    g.fillRect(0, 0, w, h);
    g.lineCap = "round";
    for (let i = 0; i < 70; i++) {
      let x = r() * w, y = r() * h, a = r() * 6.28;
      g.strokeStyle = "rgba(70,50,40,0.85)";
      g.lineWidth = 3.2;
      g.beginPath();
      g.moveTo(x, y);
      for (let k = 0; k < 26; k++) {
        a += (r() - 0.5) * 1.1;
        x += Math.cos(a) * 5; y += Math.sin(a) * 5;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.2})`; g.fillRect(r() * w, r() * h, 2, 2); }
  });

/** knobbly polyp surface for branching / pillar / tube corals (white base, tinted per instance) */
export const polyps = (seed = 10) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#e9e4de";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) {
      const x = r() * w, y = r() * h, s = 2 + r() * 4;
      g.fillStyle = "rgba(90,70,70,0.35)";
      g.beginPath(); g.arc(x, y, s, 0, 7); g.fill();
      g.fillStyle = "rgba(255,255,255,0.55)";
      g.beginPath(); g.arc(x - s * 0.25, y - s * 0.25, s * 0.45, 0, 7); g.fill();
    }
  });

/** gorgonian sea fan lace (alpha cut-out) */
export const fanLace = (seed = 11) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.clearRect(0, 0, w, h);
    g.strokeStyle = "#ffffff";
    g.lineCap = "round";
    const branch = (x: number, y: number, a: number, len: number, lw: number, d: number) => {
      if (d > 7 || len < 4) return;
      const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
      g.lineWidth = lw;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
      branch(x2, y2, a - 0.25 - r() * 0.3, len * 0.8, lw * 0.75, d + 1);
      branch(x2, y2, a + 0.25 + r() * 0.3, len * 0.8, lw * 0.75, d + 1);
    };
    branch(w / 2, h, -Math.PI / 2, 46, 7, 0);
    // cross-links forming the net
    g.lineWidth = 1.4;
    for (let i = 0; i < 520; i++) {
      const a = -Math.PI / 2 + (r() - 0.5) * 2.4, d = 20 + r() * 220;
      const x = w / 2 + Math.cos(a) * d, y = h + Math.sin(a) * d;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 16, y + (r() - 0.5) * 16); g.stroke();
    }
    // clip to fan outline
    g.globalCompositeOperation = "destination-in";
    g.beginPath();
    g.moveTo(w / 2, h);
    g.bezierCurveTo(-30, h * 0.55, w * 0.1, -10, w / 2, 6);
    g.bezierCurveTo(w * 0.9, -10, w + 30, h * 0.55, w / 2, h);
    g.fill();
    g.globalCompositeOperation = "source-over";
  });

/** kelp blade with midrib and ruffled edge (alpha) — long axis = V */
export const kelpBlade = (seed = 12) =>
  makeTex(128, 512, (g, w, h) => {
    const r = rng(seed);
    g.clearRect(0, 0, w, h);
    g.beginPath();
    g.moveTo(w / 2, h);
    for (let y = h; y >= 0; y -= 8) {
      const t = 1 - y / h;
      const hw = w * 0.46 * Math.sin(Math.min(1, t * 1.15) * Math.PI) ** 0.6 + Math.sin(y * 0.3) * 3;
      g.lineTo(w / 2 + hw, y);
    }
    for (let y = 0; y <= h; y += 8) {
      const t = 1 - y / h;
      const hw = w * 0.46 * Math.sin(Math.min(1, t * 1.15) * Math.PI) ** 0.6 + Math.cos(y * 0.27) * 3;
      g.lineTo(w / 2 - hw, y);
    }
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, "#c9b04a");
    grd.addColorStop(0.5, "#a08a2e");
    grd.addColorStop(1, "#6f6a22");
    g.fillStyle = grd;
    g.fill();
    g.globalCompositeOperation = "source-atop";
    for (let i = 0; i < 60; i++) {
      g.strokeStyle = `rgba(60,50,10,${0.1 + r() * 0.2})`;
      g.lineWidth = 1;
      const y = r() * h;
      g.beginPath(); g.moveTo(w / 2, y); g.quadraticCurveTo(w * 0.7, y - 10, w, y - 30 - r() * 20); g.stroke();
      g.beginPath(); g.moveTo(w / 2, y); g.quadraticCurveTo(w * 0.3, y - 10, 0, y - 30 - r() * 20); g.stroke();
    }
    g.fillStyle = "rgba(70,60,15,0.6)";
    g.fillRect(w / 2 - 2, 0, 4, h);
    g.globalCompositeOperation = "source-over";
  });

export type FishKind = "clown" | "blueTang" | "yellowTang" | "angel" | "butterfly" | "parrot";
/** fish skin: canvas x = around the body (u; 0/0.5 = flanks, 0.75 = back, 0.25 = belly), canvas y = along the body
 *  (top = nose, bottom = tail). Fins sample the back (u 0.75) / belly (u 0.25) columns at their length position. */
export const fishSkin = (kind: FishKind) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(kind.length * 31);
    const Y = (v: number) => (1 - v) * h; // v 0 = tail .. 1 = nose
    const band = (v0: number, v1: number, col: string) => { g.fillStyle = col; g.fillRect(0, Y(v1), w, Y(v0) - Y(v1)); };
    const eye = (v: number, s = 1) => {
      for (const x of [0, w / 2, w]) {
        g.fillStyle = "#f5f1e0";
        g.beginPath(); g.ellipse(x, Y(v), 11 * s, 9 * s, 0, 0, 7); g.fill();
        g.fillStyle = "#0b0b0e";
        g.beginPath(); g.ellipse(x, Y(v), 7 * s, 6 * s, 0, 0, 7); g.fill();
        g.fillStyle = "#ffffff";
        g.beginPath(); g.arc(x - 2 * s, Y(v) - 2 * s, 2 * s, 0, 7); g.fill();
      }
    };
    const scales = (col: string, a: number) => {
      g.strokeStyle = col;
      g.globalAlpha = a;
      g.lineWidth = 1;
      for (let y = 0; y < h; y += 7) for (let x = (y / 7) % 2 ? 0 : 5; x < w; x += 10) { g.beginPath(); g.arc(x, y, 5, 0.2, Math.PI - 0.2); g.stroke(); }
      g.globalAlpha = 1;
    };
    const belly = (col: string, a = 0.45) => {
      const grd = g.createLinearGradient(0, 0, w, 0);
      grd.addColorStop(0, "rgba(0,0,0,0)");
      grd.addColorStop(0.25, col);
      grd.addColorStop(0.5, "rgba(0,0,0,0)");
      grd.addColorStop(1, "rgba(0,0,0,0)");
      g.globalAlpha = a;
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
      g.globalAlpha = 1;
    };
    const back = (col: string, a = 0.5) => {
      const grd = g.createLinearGradient(0, 0, w, 0);
      grd.addColorStop(0.5, "rgba(0,0,0,0)");
      grd.addColorStop(0.75, col);
      grd.addColorStop(1, "rgba(0,0,0,0)");
      g.globalAlpha = a;
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
      g.globalAlpha = 1;
    };
    if (kind === "clown") {
      band(0, 1, "#ff6a10");
      for (const [c, hw] of [[0.8, 0.07], [0.52, 0.08], [0.2, 0.05]] as [number, number][]) {
        band(c - hw - 0.02, c + hw + 0.02, "#111");
        band(c - hw, c + hw, "#fbfbf6");
      }
      band(0, 0.06, "#ff7a1a");
      band(0, 0.02, "#111");
      belly("#ffb070", 0.4);
      eye(0.9, 0.9);
    } else if (kind === "blueTang") {
      band(0, 1, "#1d52d6");
      g.fillStyle = "#0c1330";
      for (const x0 of [0, w / 2]) {
        g.beginPath();
        g.moveTo(x0 - 30, Y(0.2));
        g.bezierCurveTo(x0 - 40, Y(0.55), x0 - 10, Y(0.85), x0 + 24, Y(0.8));
        g.bezierCurveTo(x0 + 6, Y(0.7), x0 - 16, Y(0.5), x0 + 10, Y(0.22));
        g.fill();
        g.fillRect(x0 - 40, Y(0.24), 50, 6);
      }
      g.fillStyle = "#0c1330";
      g.fillRect(w * 0.7, 0, w * 0.1, h);
      band(0, 0.1, "#ffd21a");
      belly("#6fa0ff", 0.35);
      eye(0.88, 0.9);
    } else if (kind === "yellowTang") {
      band(0, 1, "#ffd419");
      back("#f2b400", 0.5);
      belly("#fff27a", 0.5);
      band(0.1, 0.13, "#fffbe8");
      eye(0.87, 0.8);
    } else if (kind === "angel") {
      band(0, 1, "#1b3f9e");
      g.fillStyle = "#ffd21a";
      for (let x = 0; x < w; x += 12) g.fillRect(x, Y(0.78), 5, Y(0.1) - Y(0.78));
      band(0.78, 0.92, "#0d1b44");
      band(0.92, 1, "#6aa3ff");
      band(0, 0.1, "#ffcf1a");
      eye(0.86, 0.85);
    } else if (kind === "butterfly") {
      band(0, 1, "#f6f0dc");
      back("#ffc61a", 0.9);
      belly("#fff6c0", 0.4);
      g.strokeStyle = "rgba(60,60,60,0.35)";
      for (let x = 0; x < w; x += 9) { g.beginPath(); g.moveTo(x, Y(0.1)); g.lineTo(x + 30, Y(0.8)); g.stroke(); }
      band(0.82, 0.9, "#141414");
      band(0, 0.12, "#ffcf1a");
      g.fillStyle = "#141414";
      for (const x of [w * 0.1, w * 0.6]) { g.beginPath(); g.arc(x, Y(0.3), 12, 0, 7); g.fill(); }
      eye(0.86, 0.75);
    } else {
      band(0, 1, "#1fbf9a");
      scales("#ff8ab3", 0.8);
      back("#0f7f8a", 0.6);
      belly("#ff9fc3", 0.7);
      band(0.86, 1, "#3fd6b8");
      g.strokeStyle = "#ff7aa8"; g.lineWidth = 3;
      for (const x0 of [0, w / 2]) { g.beginPath(); g.moveTo(x0 - 20, Y(0.95)); g.lineTo(x0 + 18, Y(0.84)); g.stroke(); }
      band(0, 0.1, "#ff6ea0");
      eye(0.88, 0.8);
    }
    void r;
  });

/** torn, holey old sail cloth (alpha) */
export const sail = (seed = 13) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    const n = fbm(seed, 4, 3);
    pixels(g, w, h, (u, v, o) => {
      const t = n(u, v);
      const hole = t > 0.64 || (v > 0.8 && t > 0.5) ? 0 : 255;
      o[0] = 196 * (0.8 + t * 0.3); o[1] = 184 * (0.8 + t * 0.3); o[2] = 150 * (0.8 + t * 0.3);
      o[3] = hole;
    });
    g.strokeStyle = "rgba(80,70,50,0.35)";
    for (let x = 0; x < w; x += 42) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (r() - 0.5) * 6, h); g.stroke(); }
  });

/** vertical light shaft: soft horizontal falloff, fading to the bottom */
export const lightRay = () =>
  makeTex(128, 256, (g, w, h) => {
    pixels(g, w, h, (u, v, o) => {
      const a = Math.pow(Math.sin(u * Math.PI), 3) * Math.pow(1 - v, 0.6) * (0.75 + 0.25 * Math.sin(u * 40));
      o[0] = 90 * a; o[1] = 190 * a; o[2] = 210 * a;
    });
  });

/** bell of a jellyfish: radial canals (U) and rim band (V near 0) */
export const jellyBell = () =>
  makeTex(256, 128, (g, w, h) => {
    const grd = g.createLinearGradient(0, h, 0, 0);
    grd.addColorStop(0, "#ffffff");
    grd.addColorStop(0.25, "#f0e6ff");
    grd.addColorStop(1, "#c8b8ff");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(255,255,255,0.9)";
    g.lineWidth = 3;
    for (let i = 0; i < 16; i++) { const x = (i / 16) * w; g.beginPath(); g.moveTo(x, h); g.lineTo(x, h * 0.1); g.stroke(); }
    g.fillStyle = "rgba(255,160,220,0.8)";
    for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse((i / 4 + 0.125) * w, h * 0.35, 14, 9, 0, 0, 7); g.fill(); }
  });

/** iron-banded chest planks */
export const chest = (seed = 14) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    for (let i = 0; i < 5; i++) {
      const t = (r() - 0.5) * 24;
      g.fillStyle = `rgb(${104 + t},${62 + t},${34 + t})`;
      g.fillRect(0, (i * h) / 5, w, h / 5);
      g.fillStyle = "rgba(20,10,5,0.7)";
      g.fillRect(0, (i * h) / 5, w, 2);
    }
    g.fillStyle = "#4a4640";
    for (const x of [0.12, 0.88]) g.fillRect(x * w - 9, 0, 18, h);
    g.fillStyle = "#b8923a";
    for (const x of [0.12, 0.88]) for (let y = 12; y < h; y += 40) { g.beginPath(); g.arc(x * w, y, 3, 0, 7); g.fill(); }
  });

/** plinth inscription */
export const plaque = (text: string, sub: string) =>
  makeTex(512, 160, (g, w, h) => {
    g.fillStyle = "#b9b09a";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#7d7563";
    g.lineWidth = 6;
    g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = "#5b5446";
    g.textAlign = "center";
    g.font = "bold 50px Georgia, serif";
    g.fillText(text, w / 2, 78);
    g.font = "26px Georgia, serif";
    g.fillText(sub, w / 2, 124);
    const r = rng(2);
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(60,80,50,${r() * 0.25})`; g.fillRect(r() * w, r() * h, 2 + r() * 3, 2); }
  });
