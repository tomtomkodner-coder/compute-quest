// Canvas textures for the Hide-and-Seek Mansion (wood, marble, damask, tiles, brick, fabrics, paintings, posters, rugs).
import * as THREE from "three";
import { makeTex, type PaintTex } from "../../textures";

type G = CanvasRenderingContext2D;

export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
export const shade = (base: string, dl: number, dh = 0, ds = 0) => {
  const c = new THREE.Color(base);
  c.offsetHSL(dh, ds, dl);
  return `#${c.getHexString()}`;
};

function specks(g: G, w: number, h: number, r: () => number, n: number, amt: number, size = 2) {
  // bucketed by quantised alpha: one fillStyle change per bucket instead of per speck (much faster, same look)
  const Q = 12;
  const buckets: number[][] = Array.from({ length: Q * 2 + 1 }, () => []);
  for (let i = 0; i < n; i++) {
    const v = (r() - 0.5) * 2 * amt;
    const s = 1 + r() * size;
    const x = r() * w, y = r() * h;
    buckets[Math.round((v / (amt || 1)) * Q) + Q].push(x, y, s);
  }
  buckets.forEach((b, bi) => {
    if (!b.length) return;
    const v = ((bi - Q) / Q) * amt;
    g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
    for (let i = 0; i < b.length; i += 3) g.fillRect(b[i], b[i + 1], b[i + 2], b[i + 2]);
  });
}
/** soft blotches that wrap around the edges (seamless tiling) */
function blotches(g: G, w: number, h: number, r: () => number, n: number, amt: number, rad: number, dark = 0.5) {
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h, rr = rad * (0.4 + r());
    const a = amt * (0.3 + r() * 0.7);
    const col = r() < dark ? `0,0,0` : `255,255,255`;
    for (const ox of [-w, 0, w])
      for (const oy of [-h, 0, h]) {
        const cx = x + ox, cy = y + oy;
        if (cx + rr < 0 || cx - rr > w || cy + rr < 0 || cy - rr > h) continue;
        const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rr);
        gr.addColorStop(0, `rgba(${col},${a})`);
        gr.addColorStop(1, `rgba(${col},0)`);
        g.fillStyle = gr;
        g.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
      }
  }
}
/** vertical wavy line, periodic in y (tiles) */
function wavyV(g: G, x0: number, h: number, amp: number, k: number, ph: number) {
  g.beginPath();
  for (let y = 0; y <= h; y += 4) {
    const x = x0 + Math.sin((y / h) * Math.PI * 2 * k + ph) * amp + Math.sin((y / h) * Math.PI * 2 * (k + 2) + ph * 2) * amp * 0.3;
    if (y === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
}
function wavyH(g: G, y0: number, w: number, amp: number, k: number, ph: number) {
  g.beginPath();
  for (let x = 0; x <= w; x += 4) {
    const y = y0 + Math.sin((x / w) * Math.PI * 2 * k + ph) * amp;
    if (x === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
}

/** continuous furniture wood grain (grain runs along v) */
export const grain = (base: string, seed = 1, size = 256) =>
  makeTex(size, size, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      g.strokeStyle = shade(base, (r() - 0.5) * 0.09);
      g.globalAlpha = 0.55;
      g.lineWidth = 3 + r() * 12;
      wavyV(g, r() * w, h, 2 + r() * 5, 1 + Math.floor(r() * 2), r() * 6);
    }
    g.globalAlpha = 1;
    for (let i = 0; i < 90; i++) {
      g.strokeStyle = `rgba(40,20,5,${0.06 + r() * 0.14})`;
      g.lineWidth = 0.6 + r() * 1.2;
      wavyV(g, r() * w, h, 1 + r() * 4, 1 + Math.floor(r() * 3), r() * 6);
    }
    specks(g, w, h, r, 500, 0.05);
  });

/** floor planks with staggered joints (planks run along v) */
export const planks = (base: string, seed = 2, n = 6) =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(seed);
    const pw = w / n;
    for (let i = 0; i < n; i++) {
      const x0 = i * pw;
      let v = r() * h;
      const cuts: number[] = [];
      let tot = 0;
      while (tot < h) { const L = h * (0.35 + r() * 0.4); cuts.push(v); v += L; tot += L; }
      // fill each segment (wrap)
      for (let s = 0; s < cuts.length; s++) {
        const a = cuts[s], b = s + 1 < cuts.length ? cuts[s + 1] : cuts[0] + h;
        const col = shade(base, (r() - 0.5) * 0.12, (r() - 0.5) * 0.02);
        for (const off of [-h, 0, h]) {
          g.fillStyle = col;
          g.fillRect(x0, a + off, pw, b - a);
        }
      }
      g.save();
      g.beginPath();
      g.rect(x0 + 1, 0, pw - 2, h);
      g.clip();
      for (let k2 = 0; k2 < 22; k2++) {
        g.strokeStyle = `rgba(40,20,5,${0.05 + r() * 0.13})`;
        g.lineWidth = 0.6 + r() * 1.6;
        wavyV(g, x0 + r() * pw, h, 1 + r() * 3, 1 + Math.floor(r() * 2), r() * 6);
      }
      if (r() < 0.5) {
        const kx = x0 + pw * (0.3 + r() * 0.4), ky = r() * h;
        for (let q = 4; q > 0; q--) {
          g.strokeStyle = `rgba(50,25,8,${0.12 + q * 0.04})`;
          g.lineWidth = 1.2;
          g.beginPath();
          g.ellipse(kx, ky, 2 + q * 2, 5 + q * 4, 0, 0, Math.PI * 2);
          g.stroke();
        }
      }
      g.restore();
      g.fillStyle = "rgba(25,12,4,0.55)";
      g.fillRect(x0, 0, 2, h);
      for (const c of cuts) g.fillRect(x0, c % h, pw, 2);
    }
    specks(g, w, h, r, 1500, 0.05);
    blotches(g, w, h, r, 10, 0.08, 90);
  });

/** polished marble checkerboard (2x2 tiles) */
export const marbleChecker = (a: string, b: string, seed = 3) =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(seed);
    const s = w / 2;
    for (let ty = 0; ty < 2; ty++)
      for (let tx = 0; tx < 2; tx++) {
        const dark = (tx + ty) % 2 === 1;
        const base = dark ? b : a;
        g.save();
        g.beginPath();
        g.rect(tx * s, ty * s, s, s);
        g.clip();
        g.fillStyle = base;
        g.fillRect(tx * s, ty * s, s, s);
        blotches(g, w, h, r, 6, 0.08, 80, dark ? 0.2 : 0.7);
        const vein = dark ? "rgba(210,205,195,0.55)" : "rgba(120,112,100,0.5)";
        for (let i = 0; i < 7; i++) {
          g.strokeStyle = vein;
          g.shadowColor = vein;
          g.shadowBlur = 3;
          g.lineWidth = 0.5 + r() * 1.6;
          g.beginPath();
          let x = tx * s + r() * s, y = ty * s;
          g.moveTo(x, y);
          const dir = (r() - 0.5) * 2;
          while (y < ty * s + s) {
            x += (r() - 0.5) * 22 + dir * 6;
            y += 6 + r() * 14;
            g.lineTo(x, y);
          }
          g.stroke();
        }
        g.shadowBlur = 0;
        g.restore();
      }
    g.fillStyle = "rgba(70,65,60,0.8)";
    for (let i = 0; i <= 2; i++) {
      g.fillRect(i * s - 1, 0, 2, h);
      g.fillRect(0, i * s - 1, w, 2);
    }
  });

/** limestone / sandstone for columns and plinths */
export const limestone = (base: string, seed = 4) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 26, 0.09, 50);
    for (let i = 0; i < 5; i++) {
      g.strokeStyle = "rgba(90,80,65,0.18)";
      g.lineWidth = 0.8;
      g.beginPath();
      let x = r() * w, y = 0;
      g.moveTo(x, y);
      while (y < h) { x += (r() - 0.5) * 20; y += 8 + r() * 16; g.lineTo(x, y); }
      g.stroke();
    }
    specks(g, w, h, r, 1800, 0.08);
  });

function damaskMotif(g: G, cx: number, cy: number, s: number) {
  g.beginPath();
  g.ellipse(cx, cy, 11 * s, 22 * s, 0, 0, Math.PI * 2);
  g.fill();
  for (const sd of [-1, 1]) {
    g.beginPath();
    g.moveTo(cx, cy + 34 * s);
    g.bezierCurveTo(cx + sd * 50 * s, cy + 22 * s, cx + sd * 48 * s, cy - 26 * s, cx + sd * 16 * s, cy - 44 * s);
    g.bezierCurveTo(cx + sd * 30 * s, cy - 20 * s, cx + sd * 28 * s, cy + 12 * s, cx, cy + 22 * s);
    g.fill();
    g.beginPath();
    g.moveTo(cx + sd * 8 * s, cy - 30 * s);
    g.quadraticCurveTo(cx + sd * 36 * s, cy - 52 * s, cx + sd * 24 * s, cy - 64 * s);
    g.quadraticCurveTo(cx + sd * 16 * s, cy - 48 * s, cx + sd * 4 * s, cy - 40 * s);
    g.fill();
  }
  g.beginPath();
  g.arc(cx, cy - 52 * s, 6 * s, 0, Math.PI * 2);
  g.arc(cx, cy + 46 * s, 5 * s, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.moveTo(cx, cy - 76 * s);
  g.lineTo(cx + 6 * s, cy - 60 * s);
  g.lineTo(cx - 6 * s, cy - 60 * s);
  g.fill();
}
/** damask wallpaper (half-drop repeat) */
export const damask = (bg: string, fg: string, seed = 5) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 8) {
      g.fillStyle = x % 16 ? "rgba(0,0,0,0.035)" : "rgba(255,255,255,0.03)";
      g.fillRect(x, 0, 8, h);
    }
    g.fillStyle = fg;
    for (const [cx, cy] of [[128, 128], [0, 0], [256, 0], [0, 256], [256, 256]] as const) damaskMotif(g, cx, cy, 1.25);
    for (const [cx, cy] of [[0, 128], [256, 128], [128, 0], [128, 256]] as const) {
      g.globalAlpha = 0.7;
      g.beginPath();
      g.arc(cx, cy, 6, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;
    }
    specks(g, w, h, r, 900, 0.04);
  });

/** woven fabric / velvet */
export const fabric = (base: string, seed = 6) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(255,255,255,${y % 4 ? 0.035 : 0})`; g.fillRect(0, y, w, 1); }
    for (let x = 0; x < w; x += 2) { g.fillStyle = `rgba(0,0,0,${x % 4 ? 0.04 : 0})`; g.fillRect(x, 0, 1, h); }
    blotches(g, w, h, r, 14, 0.07, 60);
    specks(g, w, h, r, 1600, 0.05, 1);
  });

export const leather = (base: string, seed = 7) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 30, 0.12, 40);
    for (let i = 0; i < 260; i++) {
      g.strokeStyle = `rgba(0,0,0,${0.06 + r() * 0.08})`;
      g.lineWidth = 0.7;
      const x = r() * w, y = r() * h;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (r() - 0.5) * 10, y + (r() - 0.5) * 10);
      g.stroke();
    }
    specks(g, w, h, r, 1500, 0.06);
  });

export const brushed = (base: string, seed = 8) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) {
      const v = (r() - 0.5) * 0.12;
      g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
      g.fillRect(0, r() * h, w, 1);
    }
    blotches(g, w, h, r, 8, 0.05, 70);
  });

/** white subway tiles (4 across x 8 rows) */
export const subway = (base = "#f2f0ea", seed = 9) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#bdb8ae";
    g.fillRect(0, 0, w, h);
    const tw = 64, th = 32;
    for (let y = 0; y < 8; y++)
      for (let x = -1; x < 5; x++) {
        const px = x * tw + (y % 2) * (tw / 2), py = y * th;
        g.fillStyle = shade(base, (r() - 0.5) * 0.04);
        g.fillRect(px + 2, py + 2, tw - 4, th - 4);
        g.fillStyle = "rgba(255,255,255,0.5)";
        g.fillRect(px + 3, py + 3, tw - 6, 2);
        g.fillStyle = "rgba(0,0,0,0.08)";
        g.fillRect(px + 3, py + th - 5, tw - 6, 2);
      }
  });

/** terracotta quarry floor tiles */
export const quarry = (seed = 10) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#4b3d33";
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        g.fillStyle = shade("#9a4f36", (r() - 0.5) * 0.08, (r() - 0.5) * 0.02);
        g.fillRect(x * 64 + 3, y * 64 + 3, 58, 58);
      }
    blotches(g, w, h, r, 30, 0.12, 22);
    specks(g, w, h, r, 1600, 0.08);
  });

/** uniform alternating two-colour tiles */
export const checkTiles = (a: string, b: string, n = 8, grout = "#d8d6d0", seed = 11) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    const s = w / n;
    g.fillStyle = grout;
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        g.fillStyle = shade((x + y) % 2 ? a : b, (r() - 0.5) * 0.025);
        g.fillRect(x * s + 1.5, y * s + 1.5, s - 3, s - 3);
        g.fillStyle = "rgba(255,255,255,0.18)";
        g.fillRect(x * s + 2, y * s + 2, s - 4, 2);
      }
  });

export const blackTiles = (seed = 12) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#4a4a4c";
    g.fillRect(0, 0, w, h);
    const s = 64;
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        g.fillStyle = shade("#111113", (r() - 0.5) * 0.03);
        g.fillRect(x * s + 2, y * s + 2, s - 4, s - 4);
        const gr = g.createLinearGradient(x * s, y * s, x * s + s, y * s + s);
        gr.addColorStop(0, "rgba(255,255,255,0.07)");
        gr.addColorStop(0.5, "rgba(255,255,255,0)");
        gr.addColorStop(1, "rgba(255,255,255,0.03)");
        g.fillStyle = gr;
        g.fillRect(x * s + 2, y * s + 2, s - 4, s - 4);
      }
  });

/** red brick wall with mortar */
export const bricks = (seed = 13) =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#a39985";
    g.fillRect(0, 0, w, h);
    specks(g, w, h, r, 3000, 0.1);
    const pal = ["#8e3b2a", "#9c4a32", "#7a3325", "#a45a3c", "#86412f", "#6e2d22", "#94503a"];
    const rows = 13, bw = w / 4, bh = h / rows;
    for (let y = 0; y < rows; y++)
      for (let x = -1; x < 5; x++) {
        const px = x * bw + (y % 2) * (bw / 2) + 3, py = y * bh + 3;
        const col = shade(pal[Math.floor(r() * pal.length)], (r() - 0.5) * 0.06);
        g.fillStyle = col;
        g.fillRect(px, py, bw - 6, bh - 6);
        g.save();
        g.beginPath();
        g.rect(px, py, bw - 6, bh - 6);
        g.clip();
        for (let i = 0; i < 40; i++) {
          g.fillStyle = r() < 0.5 ? "rgba(0,0,0,0.12)" : "rgba(255,220,190,0.08)";
          g.fillRect(px + r() * bw, py + r() * bh, 2 + r() * 5, 1 + r() * 3);
        }
        if (r() < 0.3) { g.fillStyle = "rgba(0,0,0,0.18)"; g.fillRect(px, py, bw, bh); }
        g.restore();
        g.fillStyle = "rgba(255,255,255,0.08)";
        g.fillRect(px, py, bw - 6, 2);
      }
  });

export const cardboard = (seed = 14) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#b58d5c";
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 6) { g.fillStyle = "rgba(0,0,0,0.035)"; g.fillRect(0, y, w, 2); }
    blotches(g, w, h, r, 20, 0.1, 40);
    specks(g, w, h, r, 2000, 0.07, 1);
  });

/** rough pine crate slats */
export const crateWood = (seed = 15) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#3a2a1a";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) {
      const y0 = i * 64;
      g.fillStyle = shade("#b88a55", (r() - 0.5) * 0.1);
      g.fillRect(0, y0 + 3, w, 58);
      g.save();
      g.beginPath();
      g.rect(0, y0 + 3, w, 58);
      g.clip();
      for (let k2 = 0; k2 < 14; k2++) {
        g.strokeStyle = `rgba(80,45,15,${0.1 + r() * 0.15})`;
        g.lineWidth = 0.8 + r();
        wavyH(g, y0 + 3 + r() * 58, w, 1 + r() * 3, 1 + Math.floor(r() * 2), r() * 6);
      }
      g.restore();
      g.fillStyle = "#2b2b2b";
      for (const x of [12, 244]) for (const dy of [18, 44]) { g.beginPath(); g.arc(x, y0 + dy, 2.2, 0, Math.PI * 2); g.fill(); }
    }
    specks(g, w, h, r, 900, 0.06);
  });

/** barrel staves (native lathe UVs: u around, v up) */
export const barrelStaves = (seed = 16) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    const n = 16, sw = w / n;
    for (let i = 0; i < n; i++) {
      g.fillStyle = shade("#7a4a26", (r() - 0.5) * 0.1);
      g.fillRect(i * sw, 0, sw, h);
      for (let k2 = 0; k2 < 4; k2++) {
        g.strokeStyle = `rgba(30,15,5,${0.1 + r() * 0.15})`;
        g.lineWidth = 0.8;
        wavyV(g, i * sw + r() * sw, h, 0.8, 1, r() * 6);
      }
      g.fillStyle = "rgba(20,10,4,0.6)";
      g.fillRect(i * sw, 0, 1.5, h);
    }
    specks(g, w, h, r, 800, 0.06);
  });

export const weave = (base = "#c49a5e", seed = 17) =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = shade(base, -0.2);
    g.fillRect(0, 0, w, h);
    const s = 16;
    for (let y = 0; y < h / s; y++)
      for (let x = 0; x < w / s; x++) {
        const hor = (x + y) % 2 === 0;
        const gr = hor ? g.createLinearGradient(0, y * s, 0, y * s + s) : g.createLinearGradient(x * s, 0, x * s + s, 0);
        const c = shade(base, (r() - 0.5) * 0.06);
        gr.addColorStop(0, shade(c, -0.1));
        gr.addColorStop(0.5, shade(c, 0.06));
        gr.addColorStop(1, shade(c, -0.1));
        g.fillStyle = gr;
        g.fillRect(x * s + 1, y * s + 1, s - 2, s - 2);
      }
  });

/** book spine (tinted per instance) */
export const spine = () =>
  makeTex(64, 256, (g, w, h) => {
    g.fillStyle = "#cdcdcd";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#ffffff";
    g.fillRect(0, 20, w, 7);
    g.fillRect(0, 229, w, 7);
    g.fillStyle = "#8a8a8a";
    g.fillRect(0, 30, w, 2);
    g.fillRect(0, 225, w, 2);
    g.fillStyle = "#eeeeee";
    g.fillRect(10, 64, w - 20, 50);
    g.fillStyle = "#777";
    g.fillRect(16, 78, w - 32, 4);
    g.fillRect(16, 92, w - 38, 4);
    const gr = g.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, "rgba(0,0,0,0.3)");
    gr.addColorStop(0.2, "rgba(0,0,0,0)");
    gr.addColorStop(0.8, "rgba(0,0,0,0)");
    gr.addColorStop(1, "rgba(0,0,0,0.3)");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });

export const beadboard = (base: string) =>
  makeTex(128, 128, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) {
      g.fillStyle = "rgba(0,0,0,0.16)";
      g.fillRect(x, 0, 2, h);
      g.fillStyle = "rgba(255,255,255,0.3)";
      g.fillRect(x + 2, 0, 1, h);
    }
  });

export const plaster = (base: string, seed = 18) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 30, 0.05, 60);
    specks(g, w, h, r, 2200, 0.035);
  });

export const concrete = (base: string, seed = 19) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 40, 0.1, 50);
    specks(g, w, h, r, 3000, 0.08);
    for (let i = 0; i < 3; i++) {
      g.strokeStyle = "rgba(0,0,0,0.15)";
      g.lineWidth = 0.8;
      g.beginPath();
      let x = r() * w, y = r() * h;
      g.moveTo(x, y);
      for (let k2 = 0; k2 < 8; k2++) { x += (r() - 0.5) * 30; y += (r() - 0.5) * 30; g.lineTo(x, y); }
      g.stroke();
    }
  });

// ---------- pictures ----------

function paintCell(g: G, x0: number, y0: number, s: number, kind: number, r: () => number) {
  g.save();
  g.beginPath();
  g.rect(x0, y0, s, s);
  g.clip();
  g.translate(x0, y0);
  const sky = [["#8fb3cf", "#f2d6a8"], ["#5d7fa0", "#e9c9a0"], ["#c9d6d8", "#f0e6c8"], ["#44607e", "#d99a6c"]][Math.floor(r() * 4)];
  if (kind === 0) {
    const gr = g.createLinearGradient(0, 0, 0, s * 0.6);
    gr.addColorStop(0, sky[0]);
    gr.addColorStop(1, sky[1]);
    g.fillStyle = gr;
    g.fillRect(0, 0, s, s);
    for (let l = 0; l < 3; l++) {
      g.fillStyle = ["#7d8f7a", "#566b48", "#3d5230"][l];
      g.beginPath();
      g.moveTo(0, s);
      for (let x = 0; x <= s; x += 8) g.lineTo(x, s * (0.5 + l * 0.12) + Math.sin(x * 0.05 + l * 2 + r()) * 8 * (1 + l));
      g.lineTo(s, s);
      g.fill();
    }
    g.fillStyle = "#a8c4d4";
    g.fillRect(0, s * 0.8, s, 6);
    for (let t = 0; t < 5; t++) {
      const tx = r() * s, ty = s * (0.6 + r() * 0.25);
      g.fillStyle = "#4a3a22";
      g.fillRect(tx - 1.5, ty, 3, 14);
      g.fillStyle = r() < 0.5 ? "#2f4a26" : "#435e2c";
      g.beginPath();
      g.arc(tx, ty - 4, 7 + r() * 8, 0, Math.PI * 2);
      g.arc(tx + 5, ty, 6 + r() * 5, 0, Math.PI * 2);
      g.fill();
    }
  } else if (kind === 1) {
    const bg = ["#2b1f16", "#1f2622", "#34251a"][Math.floor(r() * 3)];
    const gr = g.createRadialGradient(s * 0.4, s * 0.35, 5, s * 0.5, s * 0.5, s * 0.8);
    gr.addColorStop(0, shade(bg, 0.12));
    gr.addColorStop(1, bg);
    g.fillStyle = gr;
    g.fillRect(0, 0, s, s);
    const coat = ["#1b1b22", "#5a1a1a", "#1d3322", "#3a2a4a"][Math.floor(r() * 4)];
    g.fillStyle = coat;
    g.beginPath();
    g.ellipse(s / 2, s * 1.02, s * 0.42, s * 0.36, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#f0e8dc";
    g.beginPath();
    g.moveTo(s * 0.44, s * 0.68); g.lineTo(s * 0.56, s * 0.68); g.lineTo(s * 0.5, s * 0.8); g.fill();
    g.fillStyle = "#d9a98a";
    g.fillRect(s * 0.45, s * 0.52, s * 0.1, s * 0.16);
    g.beginPath();
    g.ellipse(s / 2, s * 0.42, s * 0.13, s * 0.17, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "rgba(120,60,40,0.25)";
    g.beginPath();
    g.ellipse(s * 0.54, s * 0.45, s * 0.06, s * 0.1, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = ["#2a1a10", "#5a3a1a", "#c9c1b0", "#1a1a1a"][Math.floor(r() * 4)];
    g.beginPath();
    g.ellipse(s / 2, s * 0.3, s * 0.15, s * 0.1, 0, Math.PI, Math.PI * 2);
    g.fill();
    g.fillRect(s * 0.36, s * 0.3, s * 0.05, s * 0.14);
    g.fillRect(s * 0.59, s * 0.3, s * 0.05, s * 0.14);
  } else if (kind === 2) {
    g.fillStyle = "#231a12";
    g.fillRect(0, 0, s, s);
    g.fillStyle = "#5a3a22";
    g.fillRect(0, s * 0.68, s, s);
    g.fillStyle = "#8a6a4a";
    g.beginPath();
    g.ellipse(s * 0.38, s * 0.5, s * 0.12, s * 0.2, 0, 0, Math.PI * 2);
    g.fill();
    g.fillRect(s * 0.33, s * 0.25, s * 0.1, s * 0.12);
    for (let f = 0; f < 7; f++) {
      g.fillStyle = ["#b02a1e", "#e0892a", "#7a9a2a", "#5a2a5a", "#d9b23a"][Math.floor(r() * 5)];
      g.beginPath();
      g.arc(s * (0.5 + r() * 0.35), s * (0.62 + r() * 0.08), 6 + r() * 6, 0, Math.PI * 2);
      g.fill();
    }
    for (let f = 0; f < 6; f++) {
      g.fillStyle = ["#c23a4a", "#f0e0c0", "#d96a2a"][Math.floor(r() * 3)];
      g.beginPath();
      g.arc(s * (0.3 + r() * 0.16), s * (0.14 + r() * 0.12), 5 + r() * 4, 0, Math.PI * 2);
      g.fill();
    }
  } else {
    const gr = g.createLinearGradient(0, 0, 0, s * 0.55);
    gr.addColorStop(0, sky[0]);
    gr.addColorStop(1, sky[1]);
    g.fillStyle = gr;
    g.fillRect(0, 0, s, s);
    const sg = g.createLinearGradient(0, s * 0.55, 0, s);
    sg.addColorStop(0, "#4a6a7a");
    sg.addColorStop(1, "#1f3340");
    g.fillStyle = sg;
    g.fillRect(0, s * 0.55, s, s);
    for (let i = 0; i < 20; i++) {
      g.strokeStyle = "rgba(230,240,240,0.4)";
      g.lineWidth = 1;
      const y = s * (0.58 + r() * 0.4), x = r() * s;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 6, y - 3, x + 14, y); g.stroke();
    }
    const bx = s * (0.3 + r() * 0.3);
    g.fillStyle = "#2a1a10";
    g.beginPath();
    g.moveTo(bx - 26, s * 0.56); g.lineTo(bx + 30, s * 0.56); g.lineTo(bx + 22, s * 0.64); g.lineTo(bx - 20, s * 0.64); g.fill();
    g.fillRect(bx - 1, s * 0.2, 2, s * 0.36);
    g.fillRect(bx + 14, s * 0.26, 2, s * 0.3);
    g.fillStyle = "#efe6d0";
    g.beginPath(); g.moveTo(bx + 1, s * 0.22); g.lineTo(bx + 1, s * 0.52); g.lineTo(bx - 20, s * 0.5); g.fill();
    g.beginPath(); g.moveTo(bx + 16, s * 0.28); g.lineTo(bx + 16, s * 0.52); g.lineTo(bx + 32, s * 0.5); g.fill();
  }
  // brush strokes + varnish + vignette
  for (let i = 0; i < 160; i++) {
    g.strokeStyle = r() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
    g.lineWidth = 1 + r() * 2;
    const x = r() * s, y = r() * s, a = r() * Math.PI;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6); g.stroke();
  }
  g.fillStyle = "rgba(140,100,20,0.12)";
  g.fillRect(0, 0, s, s);
  const vg = g.createRadialGradient(s / 2, s / 2, s * 0.3, s / 2, s / 2, s * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.45)");
  g.fillStyle = vg;
  g.fillRect(0, 0, s, s);
  g.restore();
}
/** 4x4 atlas of oil paintings; kinds cycle landscape / portrait / still life / seascape */
export const paintingAtlas = () =>
  makeTex(512, 512, (g) => {
    const r = rng(21);
    for (let i = 0; i < 16; i++) paintCell(g, (i % 4) * 128, Math.floor(i / 4) * 128, 128, i % 4, r);
  });

/** 2x2 atlas of vintage kitchen posters */
export const posterAtlas = () =>
  makeTex(512, 512, (g) => {
    const r = rng(22);
    const cells: [string, string, string, number][] = [
      ["#b3261e", "#f4e6c8", "BON APPETIT", 0],
      ["#d99a2b", "#3b2412", "FRESH BREAD", 1],
      ["#2f6f73", "#f4e6c8", "SOUP", 2],
      ["#efe4cc", "#1c1c1c", "CHEF", 3],
    ];
    cells.forEach(([bg, fg, txt, kind], i) => {
      const x0 = (i % 2) * 256, y0 = Math.floor(i / 2) * 256;
      g.save();
      g.translate(x0, y0);
      g.fillStyle = bg;
      g.fillRect(0, 0, 256, 256);
      g.strokeStyle = fg;
      g.lineWidth = 6;
      g.strokeRect(12, 12, 232, 232);
      g.fillStyle = fg;
      g.strokeStyle = fg;
      if (kind === 0) {
        g.beginPath(); g.arc(128, 110, 58, 0, Math.PI * 2); g.lineWidth = 8; g.stroke();
        g.beginPath(); g.arc(128, 110, 40, 0, Math.PI * 2); g.lineWidth = 3; g.stroke();
        g.fillRect(52, 60, 8, 100); g.fillRect(196, 60, 8, 100);
        for (const dx of [-8, 0, 8]) g.fillRect(56 + dx - 1, 52, 3, 26);
      } else if (kind === 1) {
        g.beginPath(); g.ellipse(128, 115, 80, 42, -0.15, 0, Math.PI * 2); g.fill();
        g.strokeStyle = bg; g.lineWidth = 6;
        for (const dx of [-40, -10, 20, 50]) { g.beginPath(); g.moveTo(128 + dx - 12, 100); g.lineTo(128 + dx + 10, 130); g.stroke(); }
      } else if (kind === 2) {
        g.fillRect(70, 100, 116, 70); g.fillRect(58, 96, 140, 10); g.fillRect(44, 110, 26, 8); g.fillRect(186, 110, 26, 8);
        g.lineWidth = 5;
        for (const dx of [-24, 0, 24]) { g.beginPath(); g.moveTo(128 + dx, 88); g.bezierCurveTo(128 + dx - 14, 70, 128 + dx + 14, 60, 128 + dx, 40); g.stroke(); }
      } else {
        g.beginPath(); g.arc(100, 90, 30, 0, Math.PI * 2); g.arc(128, 74, 34, 0, Math.PI * 2); g.arc(158, 90, 30, 0, Math.PI * 2); g.fill();
        g.fillRect(92, 96, 72, 56);
        g.fillStyle = bg; g.fillRect(92, 138, 72, 4);
      }
      g.fillStyle = fg;
      g.font = `bold ${txt.length > 6 ? 28 : 44}px Georgia, serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(txt, 128, 212);
      specks(g, 256, 256, r, 1500, 0.08);
      blotches(g, 256, 256, r, 6, 0.1, 60, 0.6);
      g.restore();
    });
  });

/** persian-style rug (mapped once over the rug) */
export const persianRug = (field: string, border: string, accent: string, seed = 23) =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = border;
    g.fillRect(0, 0, w, h);
    g.fillStyle = accent;
    g.fillRect(18, 18, w - 36, h - 36);
    g.fillStyle = border;
    g.fillRect(26, 26, w - 52, h - 52);
    // small repeated motifs in the border
    g.fillStyle = accent;
    for (let i = 40; i < w - 30; i += 22) {
      for (const [x, y] of [[i, 44], [i, h - 44], [44, i], [w - 44, i]]) {
        g.beginPath(); g.moveTo(x, y - 7); g.lineTo(x + 7, y); g.lineTo(x, y + 7); g.lineTo(x - 7, y); g.fill();
      }
    }
    g.fillStyle = field;
    g.fillRect(64, 64, w - 128, h - 128);
    // lattice
    g.strokeStyle = shade(field, 0.08);
    g.lineWidth = 3;
    for (let i = -h; i < w; i += 40) {
      g.beginPath(); g.moveTo(64 + i, 64); g.lineTo(64 + i + h, 64 + h); g.stroke();
      g.beginPath(); g.moveTo(w - 64 - i, 64); g.lineTo(w - 64 - i - h, 64 + h); g.stroke();
    }
    g.fillStyle = field;
    g.fillRect(0, 0, w, 64); g.fillRect(0, h - 64, w, 64); g.fillRect(0, 0, 64, h); g.fillRect(w - 64, 0, 64, h);
    // redraw border band over lattice overflow
    g.fillStyle = border;
    g.fillRect(0, 0, w, 26); g.fillRect(0, h - 26, w, 26); g.fillRect(0, 0, 26, h); g.fillRect(w - 26, 0, 26, h);
    g.fillStyle = accent;
    g.fillRect(18, 18, w - 36, 8); g.fillRect(18, h - 26, w - 36, 8); g.fillRect(18, 18, 8, h - 36); g.fillRect(w - 26, 18, 8, h - 36);
    g.fillStyle = border;
    g.fillRect(26, 26, w - 52, 38); g.fillRect(26, h - 64, w - 52, 38); g.fillRect(26, 26, 38, h - 52); g.fillRect(w - 64, 26, 38, h - 52);
    g.fillStyle = accent;
    for (let i = 44; i < w - 40; i += 22)
      for (const [x, y] of [[i, 45], [i, h - 45], [45, i], [w - 45, i]]) {
        g.beginPath(); g.moveTo(x, y - 7); g.lineTo(x + 7, y); g.lineTo(x, y + 7); g.lineTo(x - 7, y); g.fill();
      }
    // medallion
    const cx = w / 2, cy = h / 2;
    for (const [rad, col] of [[150, border], [128, accent], [104, shade(field, -0.12)], [70, border], [40, accent], [18, field]] as const) {
      g.fillStyle = col;
      g.beginPath();
      for (let a = 0; a < 16; a++) {
        const ang = (a / 16) * Math.PI * 2;
        const rr = rad * (a % 2 ? 0.82 : 1);
        g.lineTo(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr);
      }
      g.fill();
    }
    // corner spandrels
    g.fillStyle = border;
    for (const [x, y, sx, sy] of [[64, 64, 1, 1], [w - 64, 64, -1, 1], [64, h - 64, 1, -1], [w - 64, h - 64, -1, -1]]) {
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + sx * 110, y); g.quadraticCurveTo(x + sx * 60, y + sy * 60, x, y + sy * 110); g.fill();
    }
    specks(g, w, h, r, 5000, 0.08, 1);
    blotches(g, w, h, r, 12, 0.06, 90);
  });

/** long runner (repeat along v) */
export const runnerRug = (field: string, border: string, accent: string, seed = 24) =>
  makeTex(128, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = field;
    g.fillRect(0, 0, w, h);
    g.fillStyle = border;
    g.fillRect(0, 0, 18, h); g.fillRect(w - 18, 0, 18, h);
    g.fillStyle = accent;
    g.fillRect(20, 0, 4, h); g.fillRect(w - 24, 0, 4, h);
    for (let y = 8; y < h; y += 16) { g.fillRect(6, y, 6, 6); g.fillRect(w - 12, y, 6, 6); }
    for (const cy of [64, 192]) {
      for (const [rad, col] of [[34, border], [24, accent], [12, field]] as const) {
        g.fillStyle = col;
        g.beginPath(); g.moveTo(w / 2, cy - rad * 1.6); g.lineTo(w / 2 + rad, cy); g.lineTo(w / 2, cy + rad * 1.6); g.lineTo(w / 2 - rad, cy); g.fill();
      }
    }
    specks(g, w, h, r, 1600, 0.08, 1);
  });

export const clockFace = () =>
  makeTex(128, 128, (g, w, h) => {
    g.fillStyle = "#2a1c10";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#efe6cf";
    g.beginPath(); g.arc(64, 64, 58, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#b8903a"; g.lineWidth = 4; g.stroke();
    g.fillStyle = "#1c1c1c";
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.save(); g.translate(64 + Math.sin(a) * 48, 64 - Math.cos(a) * 48); g.rotate(a); g.fillRect(-1.5, -5, 3, 10); g.restore();
    }
    g.lineWidth = 4; g.strokeStyle = "#1c1c1c";
    g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + 22, 64 - 18); g.stroke();
    g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(64, 64); g.lineTo(64 - 8, 64 - 40); g.stroke();
    void h;
  });

export const nightWindow = () =>
  makeTex(128, 256, (g, w, h) => {
    const r = rng(25);
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "#0d1a33");
    gr.addColorStop(0.7, "#27406a");
    gr.addColorStop(1, "#3c5a7a");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,240,${0.3 + r() * 0.6})`; g.fillRect(r() * w, r() * h * 0.6, 1.5, 1.5); }
    const mg = g.createRadialGradient(w * 0.7, h * 0.2, 2, w * 0.7, h * 0.2, 40);
    mg.addColorStop(0, "rgba(255,250,220,1)");
    mg.addColorStop(0.25, "rgba(255,250,220,0.6)");
    mg.addColorStop(1, "rgba(255,250,220,0)");
    g.fillStyle = mg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#08101c";
    for (let t = 0; t < 6; t++) {
      const x = r() * w;
      g.beginPath(); g.moveTo(x - 20, h); g.lineTo(x, h * (0.6 + r() * 0.15)); g.lineTo(x + 20, h); g.fill();
    }
    g.fillRect(0, h * 0.9, w, h * 0.1);
  });

export const embers = () =>
  makeTex(128, 64, (g, w, h) => {
    const r = rng(26);
    g.fillStyle = "#1a0600";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) {
      const x = r() * w, y = h * 0.4 + r() * h * 0.6, rr = 3 + r() * 10;
      const gr = g.createRadialGradient(x, y, 0, x, y, rr);
      gr.addColorStop(0, r() < 0.3 ? "rgba(255,230,120,0.9)" : "rgba(255,110,20,0.8)");
      gr.addColorStop(1, "rgba(255,60,0,0)");
      g.fillStyle = gr;
      g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
  });

export type { PaintTex };

/** Fast Sobel normal map (same result as textures.normalMapFrom, ~5× quicker: typed arrays, no canvas round-trip).
 *  Stored on t.normal, so Kit.mat() picks it up instead of building its own. */
export function fastNormal(t: PaintTex): THREE.CanvasTexture {
  if (t.normal) return t.normal;
  const w = t.canvas.width, h = t.canvas.height;
  const src = (t.data ?? t.ctx.getImageData(0, 0, w, h)).data;
  const n = w * h;
  const lum = new Float32Array(n);
  for (let i = 0, j = 0; i < n; i++, j += 4) lum[i] = (src[j] * 0.3 + src[j + 1] * 0.59 + src[j + 2] * 0.11) / 255;
  const out = new Uint8Array(n * 4);
  const k = 2.2;
  for (let y = 0; y < h; y++) {
    const ym = ((y - 1 + h) % h) * w, y0 = y * w, yp = ((y + 1) % h) * w;
    let o = (h - 1 - y) * w * 4; // DataTexture rows are bottom-up (CanvasTexture is flipped)
    for (let x = 0; x < w; x++, o += 4) {
      const xm = x === 0 ? w - 1 : x - 1, xp = x === w - 1 ? 0 : x + 1;
      const dx = (lum[ym + xp] + 2 * lum[y0 + xp] + lum[yp + xp] - lum[ym + xm] - 2 * lum[y0 + xm] - lum[yp + xm]) * k;
      const dy = (lum[yp + xm] + 2 * lum[yp + x] + lum[yp + xp] - lum[ym + xm] - 2 * lum[ym + x] - lum[ym + xp]) * k;
      const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      out[o] = (-dx * inv * 0.5 + 0.5) * 255;
      out[o + 1] = (dy * inv * 0.5 + 0.5) * 255;
      out[o + 2] = (inv * 0.5 + 0.5) * 255;
      out[o + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(out, w, h, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  t.normal = tex as unknown as THREE.CanvasTexture;
  return t.normal;
}
