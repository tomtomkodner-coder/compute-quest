// Canvas textures for the Penguin Hotel: blue stripe / diamond-lattice wallpapers, glossy checker tiles,
// herringbone parquet, knitted plush fabric, dice faces, round penguin rug, yellow blanket, banners, signs.
import * as THREE from "three";
import { makeTex, type PaintTex } from "../../textures";

type G = CanvasRenderingContext2D;

export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** fine speckle noise, bucketed by alpha for speed */
function specks(g: G, w: number, h: number, r: () => number, n: number, amt: number, sw = 1, sh = 1) {
  const Q = 6;
  const buckets: number[][] = Array.from({ length: Q * 2 + 1 }, () => []);
  for (let i = 0; i < n; i++) buckets[Math.round((r() - 0.5) * 2 * Q) + Q].push(r() * w, r() * h);
  buckets.forEach((b, bi) => {
    if (!b.length) return;
    const v = ((bi - Q) / Q) * amt;
    g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
    for (let i = 0; i < b.length; i += 2) g.fillRect(b[i], b[i + 1], sw, sh);
  });
}
function blotches(g: G, w: number, h: number, r: () => number, n: number, amt: number, rad: number) {
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h, rr = rad * (0.4 + r());
    const col = r() < 0.5 ? "0,0,0" : "255,255,255";
    const a = amt * (0.3 + r() * 0.7);
    for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) {
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

/** Fast Sobel normal map stored on t.normal (Kit.mat() reuses it) */
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
    let o = (h - 1 - y) * w * 4;
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

/** blue vertical-stripe wallpaper (bedrooms): wide mid-blue and pale-blue bands with thin pinstripes. 1 tile ≈ 0.6 m */
export const stripeWall = (a = "#2d58a3", b = "#8fb0dc") =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(4);
    g.fillStyle = a;
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 64) {
      g.fillStyle = b;
      g.fillRect(x + 30, 0, 26, h);
      g.fillStyle = "rgba(255,255,255,0.35)";
      g.fillRect(x + 27, 0, 1.5, h);
      g.fillRect(x + 58, 0, 1.5, h);
      g.fillStyle = "rgba(10,25,60,0.35)";
      g.fillRect(x + 10, 0, 2, h);
    }
    // paper fibres (vertical streaks)
    specks(g, w, h, r, 5000, 0.06, 1, 3);
    blotches(g, w, h, r, 10, 0.05, 60);
  });

/** navy fabric wallpaper with a gold diamond (argyle) lattice (hallways, atrium). 1 tile = 1 diamond ≈ 0.7 m */
export const latticeWall = (bg = "#1f3f86", line = "#c9a64a") =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(5);
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    // woven fabric texture
    for (let y = 0; y < h; y += 2) {
      g.fillStyle = `rgba(0,0,0,${0.04 + r() * 0.05})`;
      g.fillRect(0, y, w, 1);
    }
    for (let x = 0; x < w; x += 2) {
      g.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.03})`;
      g.fillRect(x, 0, 1, h);
    }
    specks(g, w, h, r, 6000, 0.1);
    // soft inner diamond shading
    g.fillStyle = "rgba(90,130,210,0.10)";
    g.beginPath(); g.moveTo(w / 2, 14); g.lineTo(w - 14, h / 2); g.lineTo(w / 2, h - 14); g.lineTo(14, h / 2); g.closePath(); g.fill();
    g.strokeStyle = line;
    g.lineWidth = 2.2;
    g.globalAlpha = 0.9;
    for (const [x0, y0, x1, y1] of [[0, 0, w, h], [w, 0, 0, h], [-w, 0, w, 2 * h], [0, -h, 2 * w, h]] as number[][]) {
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    }
    // thin second line (double-line lattice)
    g.lineWidth = 0.8;
    g.globalAlpha = 0.5;
    for (const o of [-6, 6]) {
      g.beginPath(); g.moveTo(o, 0); g.lineTo(w + o, h); g.stroke();
      g.beginPath(); g.moveTo(w + o, 0); g.lineTo(o, h); g.stroke();
    }
    g.globalAlpha = 1;
  });

/** glossy ceramic checker: 2×2 tiles per texture with grout and subtle per-tile variation */
export const checker = (a = "#eef2f7", b = "#2d5796", grout = "rgba(40,50,70,0.55)", seed = 12) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    const s = w / 2;
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
      const dark = (x + y) % 2 === 1;
      g.fillStyle = dark ? b : a;
      g.fillRect(x * s, y * s, s, s);
      const gr = g.createLinearGradient(x * s, y * s, x * s + s, y * s + s);
      const v = (r() - 0.5) * 0.12;
      gr.addColorStop(0, v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`);
      gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr;
      g.fillRect(x * s, y * s, s, s);
      for (let i = 0; i < 6; i++) {
        g.fillStyle = `rgba(${dark ? "255,255,255" : "80,90,110"},${r() * 0.05})`;
        g.beginPath();
        g.ellipse(x * s + r() * s, y * s + r() * s, 8 + r() * 30, 5 + r() * 14, r() * 3, 0, Math.PI * 2);
        g.fill();
      }
    }
    specks(g, w, h, r, 2500, 0.05);
    g.strokeStyle = grout;
    g.lineWidth = 3;
    for (let i = 0; i <= 2; i++) {
      g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke();
      g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke();
    }
    // tile bevel highlight
    g.strokeStyle = "rgba(255,255,255,0.18)";
    g.lineWidth = 1.5;
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) g.strokeRect(x * s + 3, y * s + 3, s - 6, s - 6);
  });

/** dark walnut herringbone parquet. 1 tile ≈ 1.2 m */
export const herringbone = (base = "#5a3a22", seed = 7) =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(seed);
    const col = new THREE.Color(base);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    const cols = 8, cw = w / cols, p = cw * 0.5; // plank rise
    for (let c = 0; c < cols; c++) {
      const x0 = c * cw, dir = c % 2 === 0 ? 1 : -1, off = (c % 2) * p * 0.5;
      for (let y = -cw - p; y < h + cw + p; y += p) {
        const cc = col.clone().offsetHSL((r() - 0.5) * 0.02, (r() - 0.5) * 0.1, (r() - 0.5) * 0.12);
        g.fillStyle = `#${cc.getHexString()}`;
        const ya = y + off, yb = ya + dir * cw;
        g.beginPath();
        g.moveTo(x0, ya); g.lineTo(x0 + cw, yb); g.lineTo(x0 + cw, yb + p); g.lineTo(x0, ya + p); g.closePath();
        g.fill();
        // grain streaks along the plank
        g.save();
        g.clip();
        for (let k = 0; k < 5; k++) {
          const t = r() * p;
          g.strokeStyle = `rgba(${r() < 0.5 ? "0,0,0" : "255,220,180"},${0.05 + r() * 0.08})`;
          g.lineWidth = 0.6 + r() * 1.2;
          g.beginPath(); g.moveTo(x0, ya + t); g.lineTo(x0 + cw, yb + t + (r() - 0.5) * 3); g.stroke();
        }
        g.restore();
        g.strokeStyle = "rgba(15,8,3,0.75)";
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(x0, ya); g.lineTo(x0 + cw, yb); g.lineTo(x0 + cw, yb + p); g.lineTo(x0, ya + p); g.closePath();
        g.stroke();
      }
    }
    specks(g, w, h, r, 6000, 0.05);
  });

/** long dark-wood floor planks (balcony) running along u. 1 tile ≈ 2 m */
export const planks = (base = "#5b3b25", seed = 9, rows = 10) =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(seed);
    const col = new THREE.Color(base);
    const ph = h / rows;
    for (let i = 0; i < rows; i++) {
      let x = -r() * w * 0.5;
      while (x < w) {
        const len = w * (0.35 + r() * 0.4);
        const cc = col.clone().offsetHSL((r() - 0.5) * 0.02, (r() - 0.5) * 0.1, (r() - 0.5) * 0.1);
        g.fillStyle = `#${cc.getHexString()}`;
        g.fillRect(x, i * ph, len, ph);
        for (let k = 0; k < 7; k++) {
          const y = i * ph + r() * ph;
          g.strokeStyle = `rgba(${r() < 0.6 ? "0,0,0" : "255,220,170"},${0.06 + r() * 0.1})`;
          g.lineWidth = 0.6 + r();
          g.beginPath(); g.moveTo(x, y);
          for (let xx = x; xx <= x + len; xx += 16) g.lineTo(xx, y + Math.sin(xx * 0.03 + k) * 1.5);
          g.stroke();
        }
        g.fillStyle = "rgba(10,5,2,0.8)";
        g.fillRect(x, i * ph, 2, ph);
        x += len;
      }
      g.fillStyle = "rgba(10,5,2,0.85)";
      g.fillRect(0, i * ph, w, 2);
    }
    specks(g, w, h, r, 5000, 0.05);
  });

/** furniture wood grain (grain along v) */
export const grain = (base = "#6a4428", seed = 3) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      const x0 = r() * w;
      g.strokeStyle = `rgba(${r() < 0.65 ? "20,10,4" : "255,215,170"},${0.05 + r() * 0.12})`;
      g.lineWidth = 0.5 + r() * 2;
      g.beginPath();
      for (let y = 0; y <= h; y += 8) {
        const x = x0 + Math.sin((y / h) * Math.PI * 2 * 2 + i) * 3 + Math.sin((y / h) * Math.PI * 2 * 5 + i * 2) * 1.2;
        if (y === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }
    specks(g, w, h, r, 3000, 0.05, 1, 2);
  });

/** knitted plush fabric (white; tinted per object) — rows of V stitches */
export const knit = (base = "#ffffff", seed = 3) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    const sw = 8, sh = 8;
    for (let y = 0; y < h; y += sh) for (let x = 0; x < w; x += sw) {
      const v = 0.78 + r() * 0.22;
      for (const side of [0, 1]) {
        g.fillStyle = `rgba(${Math.round(255 * v)},${Math.round(255 * v)},${Math.round(255 * v)},1)`;
        g.beginPath();
        if (side === 0) { g.moveTo(x, y); g.lineTo(x + sw / 2, y + sh * 0.6); g.lineTo(x + sw / 2, y + sh); g.lineTo(x, y + sh * 0.4); }
        else { g.moveTo(x + sw, y); g.lineTo(x + sw / 2, y + sh * 0.6); g.lineTo(x + sw / 2, y + sh); g.lineTo(x + sw, y + sh * 0.4); }
        g.closePath();
        g.fill();
      }
      g.fillStyle = "rgba(0,0,0,0.28)";
      g.fillRect(x + sw / 2 - 0.5, y, 1, sh);
    }
    specks(g, w, h, r, 3000, 0.08);
  });

/** coarse diagonal twill weave (teal armchair, white sofas) */
export const twill = (base = "#ffffff", seed = 8) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    g.lineWidth = 3;
    for (let i = -h; i < w + h; i += 6) {
      g.strokeStyle = `rgba(0,0,0,${0.12 + r() * 0.1})`;
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke();
    }
    for (let y = 0; y < h; y += 4) {
      g.fillStyle = `rgba(255,255,255,${r() * 0.08})`;
      g.fillRect(0, y, w, 1);
    }
    specks(g, w, h, r, 4000, 0.1);
  });

/** striped shirt knit (navy / white rows) */
export const shirt = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(21);
    for (let y = 0; y < h; y += 32) {
      g.fillStyle = "#f4f4f6";
      g.fillRect(0, y, w, 16);
      g.fillStyle = "#26377a";
      g.fillRect(0, y + 16, w, 16);
    }
    for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) {
      g.fillStyle = `rgba(0,0,0,${0.08 + r() * 0.12})`;
      g.fillRect(x + 3.5, y, 1, 8);
    }
    specks(g, w, h, r, 2500, 0.08);
  });

/** dice face with five white pips on blue + orange rim (the texture is one face; used on all faces) */
export const dice = (bg = "#1f5bd6", pip = "#f6f8ff", rim = "#f29a2e") =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(31);
    g.fillStyle = rim;
    g.fillRect(0, 0, w, h);
    g.fillStyle = bg;
    g.fillRect(8, 8, w - 16, h - 16);
    for (let y = 8; y < h - 8; y += 4) { g.fillStyle = `rgba(0,0,0,${r() * 0.06})`; g.fillRect(8, y, w - 16, 2); }
    g.fillStyle = pip;
    for (const [x, y] of [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]]) {
      g.beginPath(); g.ellipse(x * w, y * h, 24, 20, 0, 0, Math.PI * 2); g.fill();
    }
    specks(g, w, h, r, 2500, 0.08);
  });

/** round crocheted rug: navy/teal rings, white wave pattern, white penguin silhouette in the middle */
export const penguinRug = () =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(41);
    const c = w / 2;
    const ring = (rad: number, col: string) => { g.fillStyle = col; g.beginPath(); g.arc(c, c, rad, 0, Math.PI * 2); g.fill(); };
    g.fillStyle = "#1a3f86";
    g.fillRect(0, 0, w, h);
    ring(256, "#2a7bc4");
    ring(236, "#1f9cb0");
    ring(226, "#2a3f9a");
    // white wave doodles on the navy band
    g.strokeStyle = "rgba(190,235,230,0.8)";
    g.lineWidth = 3;
    for (let i = 0; i < 60; i++) {
      const a = r() * Math.PI * 2, rad = 130 + r() * 90;
      g.beginPath();
      g.arc(c + Math.cos(a) * rad, c + Math.sin(a) * rad, 8 + r() * 14, a, a + 2 + r() * 2);
      g.stroke();
    }
    ring(128, "#20a0b4");
    ring(118, "#2d8fc4");
    ring(110, "#39a9c9");
    // white penguin silhouette (seen from above: body + head + flippers)
    g.fillStyle = "#f4f7fb";
    g.beginPath(); g.ellipse(c, c + 12, 46, 62, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(c, c - 54, 32, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(c - 52, c + 4, 14, 40, 0.5, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(c + 52, c + 4, 14, 40, -0.5, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(c - 10, c - 84); g.lineTo(c, c - 104); g.lineTo(c + 10, c - 84); g.fill();
    // stitch rings
    g.strokeStyle = "rgba(255,255,255,0.35)";
    g.setLineDash([6, 5]);
    g.lineWidth = 2;
    for (const rr of [232, 124, 196]) { g.beginPath(); g.arc(c, c, rr, 0, Math.PI * 2); g.stroke(); }
    g.setLineDash([]);
    // yarn texture
    specks(g, w, h, r, 16000, 0.14, 2, 2);
  });

/** yellow / white patterned blanket (angular stripes) */
export const blanket = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(51);
    g.fillStyle = "#f7f3e6";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#f2c230";
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
      const ox = x * 128, oy = y * 128;
      g.beginPath(); g.moveTo(ox, oy + 128); g.lineTo(ox + 64, oy); g.lineTo(ox + 128, oy + 128); g.closePath();
      if ((x + y) % 2 === 0) g.fill();
      else { g.save(); g.translate(ox + 64, oy + 64); g.rotate(Math.PI / 2); g.translate(-ox - 64, -oy - 64); g.fill(); g.restore(); }
    }
    g.strokeStyle = "rgba(255,255,255,0.75)";
    g.lineWidth = 2;
    for (let i = -h; i < w + h; i += 12) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h * 0.5, h); g.stroke(); }
    specks(g, w, h, r, 3000, 0.08);
  });

/** vertical navy pennant banner with gold text */
export const banner = (text = "PEN") =>
  makeTex(128, 512, (g, w, h) => {
    const r = rng(61);
    g.fillStyle = "#16265a";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#c9a44b";
    g.fillRect(6, 6, w - 12, 5);
    g.fillRect(6, h - 60, w - 12, 4);
    g.save();
    g.translate(w / 2, h * 0.45);
    g.rotate(Math.PI / 2);
    g.font = "bold 70px Georgia, serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, 0, 0);
    g.restore();
    specks(g, w, h, r, 2000, 0.08);
  });

/** pedestal band text ("BIG PEN") in gold on dark wood */
export const plaque = (text: string) =>
  makeTex(512, 64, (g, w, h) => {
    const r = rng(71);
    g.fillStyle = "#4a2d18";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.2})`; g.fillRect(0, r() * h, w, 1); }
    g.fillStyle = "#d6b25a";
    g.font = "bold 44px Georgia, serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, w / 4, h / 2 + 2);
    g.fillText(text, (w * 3) / 4, h / 2 + 2);
  });

/** grey rock (pedestal base) */
export const rock = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(81);
    g.fillStyle = "#8d949c";
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 40, 0.25, 40);
    specks(g, w, h, r, 9000, 0.2, 2, 2);
  });

/** cardboard with a strip of blue tape */
export const cardboard = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(91);
    g.fillStyle = "#b98c57";
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 5) { g.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.04})`; g.fillRect(x, 0, 2, h); }
    blotches(g, w, h, r, 10, 0.08, 50);
    g.fillStyle = "#3f6fc0";
    g.fillRect(0, h / 2 - 14, w, 28);
    g.fillStyle = "#f2f2f2";
    g.fillRect(40, 30, 60, 28);
    g.fillStyle = "#333";
    for (let i = 0; i < 4; i++) g.fillRect(44, 34 + i * 6, 40 + r() * 12, 2);
  });

/** snowy night window view */
export const windowView = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(101);
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "#0d1b3d");
    gr.addColorStop(0.7, "#2b4a86");
    gr.addColorStop(1, "#d9e6f5");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#eaf2fb";
    g.beginPath(); g.moveTo(0, h * 0.8);
    for (let x = 0; x <= w; x += 16) g.lineTo(x, h * 0.78 - Math.sin(x * 0.03) * 12 - r() * 6);
    g.lineTo(w, h); g.lineTo(0, h); g.fill();
    for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(255,255,255,${0.4 + r() * 0.6})`; g.fillRect(r() * w, r() * h * 0.8, 2, 2); }
  });

/** strands of crystal drops (chandelier bodies) */
export const crystal = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(111);
    g.fillStyle = "#6f8fb4";
    g.fillRect(0, 0, w, h);
    for (let x = 4; x < w; x += 11) for (let y = 3; y < h; y += 12) {
      const gr = g.createRadialGradient(x - 1, y - 2, 0, x, y, 6);
      const v = 0.75 + r() * 0.25;
      gr.addColorStop(0, `rgba(255,255,255,${v})`);
      gr.addColorStop(0.5, `rgba(190,225,255,${v * 0.8})`);
      gr.addColorStop(1, "rgba(80,120,170,0)");
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(x, y, 4.5, 6, 0, 0, Math.PI * 2); g.fill();
    }
  });
