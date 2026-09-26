// Canvas textures for the School map: glossy vinyl corridor tiles, oak strip / maple gym flooring, plaster,
// acoustic ceiling tiles, chalk blackboards, cork notice boards, curtains, periodic table, posters, piano keys,
// gym mats, balls, basketball net, stone entrance tiles, schoolyard sand / grass, clock face, exit sign.
import * as THREE from "three";
import { makeTex, type PaintTex } from "../../textures";

type G = CanvasRenderingContext2D;
const JP = `"Hiragino Sans", "Noto Sans CJK JP", "WenQuanYi Zen Hei", "Yu Gothic", sans-serif`;
const HAND = `"Hiragino Maru Gothic ProN", "Noto Sans CJK JP", "WenQuanYi Zen Hei", sans-serif`;

export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** fine speckle noise, bucketed by alpha for speed */
function specks(g: G, w: number, h: number, r: () => number, n: number, amt: number, sw = 1, sh = 1) {
  const Q = 5;
  const buckets: number[][] = Array.from({ length: Q * 2 + 1 }, () => []);
  for (let i = 0; i < n; i++) buckets[Math.round((r() - 0.5) * 2 * Q) + Q].push(r() * w, r() * h);
  buckets.forEach((b, bi) => {
    if (!b.length) return;
    const v = ((bi - Q) / Q) * amt;
    g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
    for (let i = 0; i < b.length; i += 2) g.fillRect(b[i], b[i + 1], sw, sh);
  });
}
function blotches(g: G, w: number, h: number, r: () => number, n: number, amt: number, rad: number, col?: string) {
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h, rr = rad * (0.4 + r());
    const c = col ?? (r() < 0.5 ? "0,0,0" : "255,255,255");
    const a = amt * (0.3 + r() * 0.7);
    for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) {
      const cx = x + ox, cy = y + oy;
      if (cx + rr < 0 || cx - rr > w || cy + rr < 0 || cy - rr > h) continue;
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rr);
      gr.addColorStop(0, `rgba(${c},${a})`);
      gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr;
      g.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
    }
  }
}
function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
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

/** glossy vinyl floor tiles, 2×2 tiles per texture (1 tile ≈ 0.45 m → unit 0.9) */
export const vinyl = (base = "#c9cec3", seed = 3) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    const t = w / 2;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      g.fillStyle = shade(base, 0.96 + r() * 0.08);
      g.fillRect(i * t, j * t, t, t);
    }
    specks(g, w, h, r, 5000, 0.12, 1, 1);
    specks(g, w, h, r, 700, 0.18, 2, 2);
    blotches(g, w, h, r, 10, 0.05, 40);
    g.strokeStyle = "rgba(0,0,0,0.025)";
    g.lineWidth = 3;
    for (let i = 0; i < 4; i++) { g.beginPath(); const x = r() * w, y = r() * h; g.arc(x, y, 20 + r() * 50, r() * 6, r() * 6 + 0.8); g.stroke(); }
    g.fillStyle = "rgba(40,40,30,0.3)";
    g.fillRect(0, 0, w, 1); g.fillRect(0, t, w, 1); g.fillRect(0, 0, 1, h); g.fillRect(t, 0, 1, h);
    g.fillStyle = "rgba(255,255,255,0.2)";
    g.fillRect(0, 1, w, 1); g.fillRect(0, t + 1, w, 1); g.fillRect(1, 0, 1, h); g.fillRect(t + 1, 0, 1, h);
  });

/** wooden strip flooring: boards along U with staggered joints and grain */
export const strips = (base: string, n = 12, seed = 5, joint = 0.35) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    const bh = h / n;
    for (let i = 0; i < n; i++) {
      const y = i * bh;
      g.fillStyle = shade(base, 0.86 + r() * 0.24);
      g.fillRect(0, y, w, bh);
      for (let l = 0; l < 7; l++) {
        const yy = y + r() * bh, a = 0.04 + r() * 0.1, ph = r() * 6, amp = r() * 1.5;
        g.fillStyle = r() < 0.6 ? `rgba(60,30,10,${a})` : `rgba(255,240,210,${a})`;
        for (let x = 0; x < w; x += 16) g.fillRect(x, yy + Math.sin(x * 0.03 + ph) * amp, 16, 1);
      }
      if (r() < 0.25) { g.fillStyle = "rgba(60,30,10,0.25)"; g.beginPath(); g.ellipse(r() * w, y + bh / 2, 5, bh * 0.25, 0, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = "rgba(30,15,5,0.45)";
      g.fillRect(0, y, w, 1);
      const j = r() * w;
      g.fillRect(j, y, 1, bh);
      if (r() < joint) g.fillRect((j + w / 2) % w, y, 1, bh);
    }
    specks(g, w, h, r, 1500, 0.06);
  });

/** matt plaster / painted wall (unit ≈ 2 m) */
export const plaster = (base = "#eeebe3", seed = 2) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 22, 0.05, 60);
    specks(g, w, h, r, 5000, 0.05);
    specks(g, w, h, r, 500, 0.08, 2, 1);
  });

/** acoustic ceiling tiles in a light T-bar grid (2×2 tiles, unit 1.2 m) */
export const acoustic = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(9);
    g.fillStyle = "#ecebe6";
    g.fillRect(0, 0, w, h);
    specks(g, w, h, r, 2500, 0.18, 1, 1);
    g.fillStyle = "rgba(60,55,45,0.35)";
    for (let i = 0; i < 700; i++) { const x = r() * w, y = r() * h; g.fillRect(x, y, 1 + r() * 2.5, 1); }
    blotches(g, w, h, r, 6, 0.04, 50);
    const t = w / 2;
    for (const p of [0, t]) {
      g.fillStyle = "#d9d7d0";
      g.fillRect(p, 0, 3, h); g.fillRect(0, p, w, 3);
      g.fillStyle = "rgba(0,0,0,0.18)";
      g.fillRect(p + 3, 0, 1, h); g.fillRect(0, p + 3, w, 1);
    }
  });

type BoardKind = "math" | "eng" | "music" | "lab";
/** green chalkboard with chalk writing (5 m × 1.2 m) */
export const blackboard = (kind: BoardKind) =>
  makeTex(512, 128, (g, w, h) => {
    const r = rng(kind.length * 7 + 3);
    g.fillStyle = "#2c4636";
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 26, 0.07, 40, "220,230,220");
    g.strokeStyle = "rgba(230,240,230,0.05)";
    g.lineWidth = 10;
    for (let i = 0; i < 14; i++) { g.beginPath(); const x = r() * w, y = r() * h; g.arc(x, y, 15 + r() * 25, 0, Math.PI * 2); g.stroke(); }
    const W = "rgba(240,240,232,0.92)", Y = "rgba(250,228,120,0.92)", P = "rgba(250,160,170,0.9)", B = "rgba(150,210,250,0.9)";
    const txt = (s: string, x: number, y: number, size: number, col = W, font = HAND) => { g.fillStyle = col; g.font = `${size}px ${font}`; g.fillText(s, x, y); };
    g.textBaseline = "alphabetic";
    // right edge: date + duty
    g.fillStyle = "rgba(240,240,232,0.5)"; g.fillRect(w - 60, 6, 1, h - 12);
    txt("9月", w - 44, 26, 14); txt("25日", w - 48, 44, 14); txt("(金)", w - 46, 62, 13);
    txt("日直", w - 46, 88, 12, Y); txt("佐藤", w - 46, 104, 12); txt("高橋", w - 46, 119, 12);
    g.strokeStyle = W; g.lineWidth = 1.6;
    if (kind === "math") {
      txt("二次関数のグラフ", 18, 26, 17, Y);
      txt("y = ax² + bx + c", 22, 52, 16);
      txt("頂点 (p, q)", 22, 76, 14);
      txt("y = a(x − p)² + q", 22, 98, 15, P);
      txt("例) y = x² − 4x + 3", 170, 30, 13);
      txt("= (x − 2)² − 1", 196, 50, 13);
      txt("頂点 (2, −1)", 196, 70, 13, B);
      g.beginPath(); g.moveTo(330, 110); g.lineTo(440, 110); g.moveTo(360, 118); g.lineTo(360, 12); g.stroke();
      g.strokeStyle = Y; g.beginPath();
      for (let i = 0; i <= 30; i++) { const x = -1 + i * 0.16, y = x * x - 4 * x + 3; const px = 360 + x * 16, py = 96 - y * 12; i ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.stroke();
      txt("x", 436, 122, 11); txt("y", 364, 20, 11);
    } else if (kind === "eng") {
      txt("Lesson 7  Past Tense", 18, 28, 18, Y);
      txt("I played tennis yesterday.", 22, 54, 15);
      txt("She went to Kyoto last week.", 22, 78, 15);
      txt("go → went   see → saw   eat → ate", 22, 104, 13, B);
      g.strokeStyle = P; g.beginPath(); g.moveTo(40, 58); g.lineTo(92, 58); g.moveTo(58, 82); g.lineTo(96, 82); g.stroke();
      txt("宿題 p.62", 330, 40, 16, P);
      txt("単語テスト 月曜", 330, 66, 14);
      txt("★ 音読 3回", 330, 92, 14, Y);
    } else if (kind === "music") {
      g.strokeStyle = "rgba(240,240,232,0.8)"; g.lineWidth = 1;
      for (const sy of [22, 70]) for (let l = 0; l < 5; l++) { g.beginPath(); g.moveTo(12, sy + l * 7); g.lineTo(w - 72, sy + l * 7); g.stroke(); }
      g.fillStyle = W;
      const notes = [3, 5, 4, 6, 7, 5, 3, 2, 4, 6, 8, 7, 5, 4, 3, 1];
      notes.forEach((n, i) => {
        for (const sy of [22, 70]) {
          const x = 60 + i * 24, y = sy + 28 - n * 3.5;
          g.beginPath(); g.ellipse(x, y, 4, 3, -0.4, 0, Math.PI * 2); g.fill();
          g.fillRect(x + 3, y - 18, 1.2, 18);
        }
      });
      txt("𝄞", 14, 52, 30); txt("𝄞", 14, 100, 30);
      txt("合唱コンクール  「翼をください」", 20, 122, 13, Y);
    } else {
      txt("酸化と還元", 18, 28, 18, Y);
      txt("2H₂ + O₂ → 2H₂O", 22, 56, 16);
      txt("2CuO + C → 2Cu + CO₂", 22, 84, 15, B);
      txt("※ 保護メガネ着用!", 22, 112, 14, P);
      g.beginPath(); g.moveTo(330, 30); g.lineTo(330, 60); g.lineTo(310, 108); g.lineTo(380, 108); g.lineTo(360, 60); g.lineTo(360, 30); g.stroke();
      g.strokeStyle = B; g.beginPath(); g.moveTo(318, 90); g.lineTo(372, 90); g.stroke();
      txt("加熱", 392, 76, 14);
      g.beginPath(); g.moveTo(420, 70); g.lineTo(440, 60); g.stroke();
    }
    specks(g, w, h, r, 2500, 0.25);
    g.fillStyle = "rgba(44,70,54,0.5)";
    for (let i = 0; i < 1500; i++) g.fillRect(r() * w, r() * h, 1, 1);
  });

/** cork notice board with pinned handouts (512×128 ≈ 4 m × 1 m) */
export const cork = (seed = 4) =>
  makeTex(512, 128, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#b98a58";
    g.fillRect(0, 0, w, h);
    specks(g, w, h, r, 9000, 0.25, 1, 1);
    specks(g, w, h, r, 1500, 0.2, 2, 2);
    const heads = ["学級通信", "時間割", "給食だより", "保健だより", "掃除当番", "図書館", "進路", "部活動", "行事予定", "連絡"];
    const pap = ["#fbfaf4", "#fdf6d8", "#e8f3fb", "#fbe8ec", "#eef8e6"];
    let x = 8;
    while (x < w - 40) {
      const pw = 40 + r() * 34, ph = 50 + r() * 50, y = 8 + r() * (h - ph - 14);
      g.save();
      g.translate(x + pw / 2, y + ph / 2);
      g.rotate((r() - 0.5) * 0.08);
      g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(-pw / 2 + 2, -ph / 2 + 2, pw, ph);
      g.fillStyle = pap[Math.floor(r() * pap.length)]; g.fillRect(-pw / 2, -ph / 2, pw, ph);
      g.fillStyle = ["#d23b3b", "#2b62b8", "#2a8a4a", "#e08a1a"][Math.floor(r() * 4)];
      g.font = `bold 9px ${JP}`;
      g.fillText(heads[Math.floor(r() * heads.length)], -pw / 2 + 4, -ph / 2 + 12);
      g.fillStyle = "rgba(60,60,60,0.55)";
      for (let yy = -ph / 2 + 18; yy < ph / 2 - 4; yy += 4) g.fillRect(-pw / 2 + 4, yy, pw * (0.5 + r() * 0.4), 1.4);
      if (r() < 0.4) { g.strokeStyle = "rgba(60,60,60,0.6)"; g.strokeRect(-pw / 2 + 5, -ph / 2 + 22, pw - 10, ph * 0.4); }
      g.fillStyle = ["#e33", "#36e", "#fc2", "#2c5"][Math.floor(r() * 4)];
      g.beginPath(); g.arc(0, -ph / 2 + 3, 2.4, 0, Math.PI * 2); g.fill();
      g.restore();
      x += pw + 6 + r() * 10;
    }
    g.fillStyle = "#8e6a3c"; g.fillRect(0, 0, w, 3); g.fillRect(0, h - 3, w, 3);
  });

/** cream curtain fabric: fine weave + hem */
export const curtain = () =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(11);
    g.fillStyle = "#f1e9d4";
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 2) { g.fillStyle = `rgba(120,100,60,${0.03 + r() * 0.04})`; g.fillRect(x, 0, 1, h); }
    for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(255,255,255,${0.04 + r() * 0.05})`; g.fillRect(0, y, w, 1); }
    specks(g, w, h, r, 800, 0.06);
  });

/** periodic table poster */
export const periodic = () =>
  makeTex(512, 256, (g, w, h) => {
    g.fillStyle = "#f7f5ee";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#1c2a4a";
    g.font = `bold 18px ${JP}`;
    g.fillText("元素周期表", 16, 24);
    g.font = "10px sans-serif";
    g.fillText("PERIODIC TABLE OF THE ELEMENTS", 130, 22);
    const sym = "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn".split(" ");
    const pos: [number, number][] = [];
    pos.push([0, 0], [17, 0]);
    for (const p of [1, 2]) { pos.push([0, p], [1, p]); for (let c = 12; c < 18; c++) pos.push([c, p]); }
    for (const p of [3, 4, 5]) for (let c = 0; c < 18; c++) { if (p === 5 && c === 2) { pos.push([2, 5]); continue; } pos.push([c, p]); }
    const cw = 26, ch = 30, ox = 20, oy = 36;
    const col = (c: number, p: number) => (c === 0 && p > 0 ? "#f4b0a0" : c === 1 ? "#f7d59a" : c >= 2 && c <= 11 ? "#f3e7a2" : c === 17 ? "#b9d8f2" : c === 16 ? "#c9ecc0" : c >= 12 && c + p >= 17 ? "#d8c8ee" : "#bfe6e0");
    pos.forEach(([c, p], i) => {
      if (i >= sym.length) return;
      const x = ox + c * cw, y = oy + p * ch;
      g.fillStyle = i === 0 ? "#f4b0a0" : col(c, p);
      g.fillRect(x, y, cw - 2, ch - 2);
      g.fillStyle = "#222";
      g.font = "bold 11px sans-serif";
      g.fillText(sym[i], x + 4, y + 20);
      g.font = "6px sans-serif";
      g.fillText(String(i + 1), x + 2, y + 7);
    });
    for (let rr = 0; rr < 2; rr++) for (let c = 0; c < 15; c++) { g.fillStyle = rr ? "#f0c8e0" : "#f8d8c0"; g.fillRect(ox + (c + 2) * cw, oy + 6.4 * ch + rr * ch, cw - 2, ch - 2); }
  });

/** 2×2 atlas of school posters: 0 note-values chart, 1 "don't run in the hallway", 2 lab safety, 3 hand washing */
export const posters = () =>
  makeTex(256, 256, (g) => {
    const cell = (cx: number, cy: number, bg: string, f: (x: number, y: number) => void) => {
      g.fillStyle = bg; g.fillRect(cx * 128, cy * 128, 128, 128);
      g.save(); f(cx * 128, cy * 128); g.restore();
    };
    cell(0, 0, "#fbf7ea", (x, y) => {
      g.fillStyle = "#223"; g.font = `bold 14px ${JP}`; g.fillText("音符と休符", x + 24, y + 20);
      for (let i = 0; i < 4; i++) {
        const nx = x + 20 + i * 28, ny = y + 60;
        g.beginPath(); g.ellipse(nx, ny, 6, 4.5, -0.4, 0, Math.PI * 2);
        i === 0 ? (g.lineWidth = 2, g.stroke()) : g.fill();
        if (i > 0) g.fillRect(nx + 5, ny - 26, 1.6, 26);
        if (i > 1) g.fillRect(nx + 5, ny - 26, 8, 3);
        if (i > 2) g.fillRect(nx + 5, ny - 20, 8, 3);
      }
      g.font = `10px ${JP}`; g.fillText("全  4分  8分  16分", x + 12, y + 84);
      g.fillStyle = "#c33"; g.fillRect(x + 10, y + 100, 108, 14); g.fillStyle = "#fff"; g.fillText("リズムを感じよう", x + 22, y + 111);
    });
    cell(1, 0, "#fff3d6", (x, y) => {
      g.fillStyle = "#d93a2b"; g.beginPath(); g.arc(x + 64, y + 54, 34, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(x + 64, y + 54, 27, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#222"; g.beginPath(); g.arc(x + 62, y + 36, 5, 0, Math.PI * 2); g.fill();
      g.fillRect(x + 58, y + 41, 6, 20);
      g.lineWidth = 4; g.strokeStyle = "#222"; g.beginPath(); g.moveTo(x + 61, y + 60); g.lineTo(x + 50, y + 76); g.moveTo(x + 61, y + 60); g.lineTo(x + 72, y + 74); g.moveTo(x + 60, y + 46); g.lineTo(x + 76, y + 52); g.stroke();
      g.strokeStyle = "#d93a2b"; g.lineWidth = 6; g.beginPath(); g.moveTo(x + 42, y + 32); g.lineTo(x + 86, y + 76); g.stroke();
      g.fillStyle = "#222"; g.font = `bold 15px ${JP}`; g.fillText("廊下は歩こう", x + 18, y + 112);
    });
    cell(0, 1, "#e9f4fb", (x, y) => {
      g.fillStyle = "#1f5da8"; g.fillRect(x, y, 128, 26);
      g.fillStyle = "#fff"; g.font = `bold 14px ${JP}`; g.fillText("実験のきまり", x + 18, y + 18);
      g.fillStyle = "#223"; g.font = `11px ${JP}`;
      ["1. 保護メガネをかける", "2. 走らない", "3. 火の元に注意", "4. 片付けをする"].forEach((s, i) => g.fillText(s, x + 10, y + 46 + i * 20));
    });
    cell(1, 1, "#eefbea", (x, y) => {
      g.fillStyle = "#2f9a4e"; g.font = `bold 15px ${JP}`; g.fillText("手をあらおう", x + 20, y + 22);
      g.fillStyle = "#f2c9a6";
      g.beginPath(); g.ellipse(x + 50, y + 70, 18, 26, -0.3, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(x + 78, y + 70, 18, 26, 0.3, 0, Math.PI * 2); g.fill();
      g.fillStyle = "rgba(120,190,255,0.7)";
      for (let i = 0; i < 10; i++) { g.beginPath(); g.arc(x + 30 + i * 8, y + 50 + (i % 3) * 18, 4, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = "#335"; g.font = `10px ${JP}`; g.fillText("せっけんで30秒", x + 26, y + 116);
    });
  });

/** piano keyboard (52 white keys) */
export const pianoKeys = () =>
  makeTex(512, 32, (g, w, h) => {
    g.fillStyle = "#f6f3ea";
    g.fillRect(0, 0, w, h);
    const kw = w / 52;
    g.fillStyle = "rgba(0,0,0,0.35)";
    for (let i = 1; i < 52; i++) g.fillRect(Math.round(i * kw), 0, 1, h);
    g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(0, h - 3, w, 3);
  });

/** blue vinyl gym mat with stitched seams */
export const gymMat = (base = "#2a5aa8") =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(6);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 8, 0.08, 30);
    specks(g, w, h, r, 1200, 0.08);
    g.fillStyle = "rgba(0,0,0,0.3)";
    for (const p of [0, 64]) { g.fillRect(p, 0, 2, h); g.fillRect(0, p, w, 2); }
    g.fillStyle = "rgba(255,255,255,0.35)";
    for (let i = 0; i < h; i += 6) { g.fillRect(4, i, 1, 3); g.fillRect(68, i, 1, 3); g.fillRect(i, 4, 3, 1); g.fillRect(i, 68, 3, 1); }
  });

/** basketball: orange pebbled leather with black seams (sphere UV) */
export const basketball = () =>
  makeTex(128, 64, (g, w, h) => {
    const r = rng(8);
    g.fillStyle = "#d86a22";
    g.fillRect(0, 0, w, h);
    specks(g, w, h, r, 2500, 0.15);
    g.fillStyle = "#1b120c";
    g.fillRect(0, h / 2 - 1, w, 2);
    for (const x of [0, w / 4, w / 2, (3 * w) / 4]) g.fillRect(x, 0, 2, h);
  });
/** volleyball: curved yellow / blue / white panels */
export const volleyball = () =>
  makeTex(128, 64, (g, w, h) => {
    const cols = ["#f4f4f0", "#f2c623", "#1f4fb4"];
    for (let i = 0; i < 6; i++) { g.fillStyle = cols[i % 3]; g.beginPath(); g.moveTo(0, (i * h) / 6); for (let x = 0; x <= w; x += 8) g.lineTo(x, (i * h) / 6 + Math.sin(x * 0.1) * 3); g.lineTo(w, h); g.lineTo(0, h); g.fill(); }
  });

/** diamond mesh (basketball net / wire mesh), transparent background */
export const netTex = () =>
  makeTex(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = "#f4f4f4";
    g.lineWidth = 3;
    for (let i = -w; i < w * 2; i += 16) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke();
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i - h, h); g.stroke();
    }
  });

/** grey granite entrance tiles (2×2 tiles, unit 0.8 m) */
export const granite = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(12);
    const t = w / 2;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { g.fillStyle = shade("#8c8b87", 0.94 + r() * 0.1); g.fillRect(i * t, j * t, t, t); }
    specks(g, w, h, r, 9000, 0.3, 1, 1);
    specks(g, w, h, r, 1600, 0.35, 2, 2);
    g.fillStyle = "rgba(20,20,20,0.5)";
    g.fillRect(0, 0, w, 2); g.fillRect(0, t, w, 2); g.fillRect(0, 0, 2, h); g.fillRect(t, 0, 2, h);
  });

/** schoolyard sand */
export const sand = () =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(14);
    g.fillStyle = "#b9a07a";
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 10, 0.08, 25);
    specks(g, w, h, r, 2500, 0.2, 1, 1);
    specks(g, w, h, r, 250, 0.25, 2, 2);
  });
/** lawn grass */
export const grass = () =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(15);
    g.fillStyle = "#58793a";
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 10, 0.1, 20);
    for (let i = 0; i < 1400; i++) { g.fillStyle = r() < 0.5 ? "rgba(140,180,80,0.5)" : "rgba(30,50,20,0.5)"; g.fillRect(r() * w, r() * h, 1, 2 + r() * 3); }
  });

/** wall clock face */
export const clockFace = () =>
  makeTex(128, 128, (g, w) => {
    const c = w / 2;
    g.fillStyle = "#fbfbf7"; g.fillRect(0, 0, w, w);
    g.fillStyle = "#222";
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2, L = i % 5 ? 4 : 10;
      g.save(); g.translate(c, c); g.rotate(a); g.fillRect(-(i % 5 ? 0.8 : 2), -58, i % 5 ? 1.6 : 4, L); g.restore();
    }
    g.font = "bold 14px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    for (let i = 1; i <= 12; i++) { const a = (i / 12) * Math.PI * 2; g.fillText(String(i), c + Math.sin(a) * 38, c - Math.cos(a) * 38); }
    g.lineCap = "round";
    const hand = (a: number, L: number, lw: number, col = "#222") => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.sin(a) * L, c - Math.cos(a) * L); g.stroke(); };
    hand(((3 + 25 / 60) / 12) * Math.PI * 2, 28, 5);
    hand((25 / 60) * Math.PI * 2, 44, 3.5);
    hand((41 / 60) * Math.PI * 2, 48, 1.4, "#c22");
  });

/** green emergency exit sign */
export const exitSign = () =>
  makeTex(128, 64, (g, w, h) => {
    g.fillStyle = "#1c9a4c"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#f4fff6"; g.fillRect(6, 6, 48, h - 12);
    g.fillStyle = "#1c9a4c"; g.beginPath(); g.arc(34, 18, 5, 0, Math.PI * 2); g.fill();
    g.lineWidth = 5; g.strokeStyle = "#1c9a4c"; g.lineCap = "round";
    g.beginPath(); g.moveTo(32, 26); g.lineTo(26, 40); g.lineTo(18, 48); g.moveTo(26, 40); g.lineTo(34, 48); g.moveTo(30, 30); g.lineTo(40, 34); g.moveTo(30, 30); g.lineTo(20, 32); g.stroke();
    g.fillStyle = "#f4fff6"; g.font = `bold 20px ${JP}`; g.fillText("非常口", 58, 40);
  });

/** wood grain for furniture (along U) */
export const grain = (base: string, seed = 3) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let l = 0; l < 70; l++) {
      const yy = r() * h, a = 0.03 + r() * 0.09, ph = r() * 6, amp = 1 + r() * 4;
      g.fillStyle = r() < 0.65 ? `rgba(70,35,10,${a})` : `rgba(255,240,210,${a})`;
      const th = 1 + r() * 2;
      for (let x = 0; x < w; x += 8) g.fillRect(x, yy + Math.sin(x * 0.025 + ph) * amp, 8, th);
    }
    specks(g, w, h, r, 1500, 0.05);
  });

/** simple printed book cover / notebook atlas: 4 columns of colours with a title band */
export const covers = () =>
  makeTex(256, 64, (g, w, h) => {
    const cols = ["#2d5aa0", "#c43d3d", "#3a8a4f", "#e7c23a", "#7b4ba6", "#e07a2c", "#2f9ab0", "#f2f0e8"];
    cols.forEach((c, i) => {
      const x = i * 32;
      g.fillStyle = c; g.fillRect(x, 0, 32, h);
      g.fillStyle = "rgba(255,255,255,0.85)"; g.fillRect(x + 5, 10, 22, 12);
      g.fillStyle = "rgba(0,0,0,0.5)"; g.fillRect(x + 8, 14, 16, 2); g.fillRect(x + 8, 18, 10, 2);
      g.fillStyle = "rgba(0,0,0,0.2)"; g.fillRect(x, 0, 2, h);
    });
  });
