// Canvas textures for the Osaka map (Dotonbori-style back street, daytime after rain): wet granite setts,
// grey/white tiled concrete facades, white-painted brick, roll-up shutters (one with neon graffiti), AC units,
// spiral ducts, vertical Japanese shop signs (薬, 肉 居酒屋, 猫カフェ, 免税, 焼肉, うに道楽 本店), 大 lanterns,
// the takoyaki octopus skin, the pufferfish lantern, beer crates, kegs, cardboard, lumber and small labels.
import { makeTex } from "../../textures";

export function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const JP = `"IPAPGothic", "IPAGothic", "Hiragino Sans", "Noto Sans CJK JP", "WenQuanYi Zen Hei", sans-serif`;
type C2 = CanvasRenderingContext2D;

function grime(g: C2, w: number, h: number, r: () => number, n: number, a = 0.12, dark = "20,16,10") {
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h, rad = 10 + r() * 60;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, `rgba(${dark},${a * r()})`);
    gr.addColorStop(1, `rgba(${dark},0)`);
    g.fillStyle = gr;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
}
function speck(g: C2, w: number, h: number, r: () => number, n: number, a = 0.15) {
  for (let i = 0; i < n; i++) { g.fillStyle = r() < 0.5 ? `rgba(0,0,0,${r() * a})` : `rgba(255,255,255,${r() * a * 0.7})`; g.fillRect(r() * w, r() * h, 1 + r() * 1.5, 1 + r() * 1.5); }
}
/** vertical rain / dirt streaks running down from the top */
function streaks(g: C2, w: number, h: number, r: () => number, n: number, a = 0.18, col = "30,24,18") {
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h * 0.5, len = 40 + r() * h * 0.7;
    const gr = g.createLinearGradient(0, y, 0, y + len);
    gr.addColorStop(0, `rgba(${col},${a * r()})`);
    gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr;
    g.fillRect(x, y, 1 + r() * 5, len);
  }
}

/** wet granite setts (small square stone blocks in running rows) — 16 setts per tile */
export const osSetts = () =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(11);
    g.fillStyle = "#1d1e20";
    g.fillRect(0, 0, w, h);
    const s = 32;
    for (let y = 0; y < h / s; y++) {
      const off = (y % 2) * (s / 2) + (r() - 0.5) * 6;
      for (let x = -1; x < w / s + 1; x++) {
        const v = 72 + r() * 42, t = (r() - 0.5) * 8;
        const px = x * s + off + (r() - 0.5) * 2, py = y * s + (r() - 0.5) * 2;
        g.fillStyle = `rgb(${v + t},${v + t + 1},${v + 5})`;
        g.beginPath(); g.roundRect(px + 2, py + 2, s - 4 + (r() - 0.5) * 2, s - 4, 5); g.fill();
        // facet highlight / shade
        g.fillStyle = "rgba(255,255,255,0.05)"; g.fillRect(px + 4, py + 3, s - 9, 2);
        g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(px + 4, py + s - 6, s - 9, 2);
        for (let k = 0; k < 10; k++) { g.fillStyle = `rgba(${r() < 0.5 ? "0,0,0" : "255,255,255"},${0.1 + r() * 0.12})`; g.fillRect(px + 3 + r() * (s - 7), py + 3 + r() * (s - 7), 1.5, 1.5); }
      }
    }
    grime(g, w, h, r, 50, 0.4, "8,8,10");
    speck(g, w, h, r, 3000, 0.18);
  });

/** smooth dark asphalt/concrete for the back alleys */
export const osAlleyFloor = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(23);
    g.fillStyle = "#56585c";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 6000; i++) { const v = 60 + r() * 50; g.fillStyle = `rgba(${v},${v},${v + 3},0.45)`; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
    grime(g, w, h, r, 30, 0.35, "10,10,12");
    for (let i = 0; i < 12; i++) { g.fillStyle = `rgba(90,20,20,${0.08 + r() * 0.1})`; g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 3, 0, 6.3); g.fill(); }
  });

/** soft puddle alpha mask (white = water) */
export const osPuddle = (seed = 1) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#000";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      const x = w * (0.2 + r() * 0.6), y = h * (0.2 + r() * 0.6), rad = 18 + r() * 60;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, "rgba(255,255,255,0.95)");
      gr.addColorStop(0.55, "rgba(255,255,255,0.7)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(x, y, rad, rad * (0.5 + r() * 0.5), r() * 3, 0, 6.3); g.fill();
    }
    // fade out at the borders so tiles never show edges
    const e = g.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.5);
    e.addColorStop(0, "rgba(0,0,0,0)");
    e.addColorStop(1, "rgba(0,0,0,1)");
    g.fillStyle = e;
    g.fillRect(0, 0, w, h);
  }, [1, 1], false);

/** stained concrete / mortar wall */
export const osConcrete = (base = "#8e8a82", seed = 4) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    speck(g, w, h, r, 4000, 0.2);
    grime(g, w, h, r, 30, 0.3);
    streaks(g, w, h, r, 30, 0.25);
  });

/** big square facade tiles / precast panels (white-grey) with grout lines and rain streaks */
export const osPanelWall = (base = "#d9dad6", n = 4, seed = 5) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    const s = w / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const v = (r() - 0.5) * 14;
      g.fillStyle = `rgba(${v > 0 ? "255,255,255" : "0,0,0"},${Math.abs(v) / 60})`;
      g.fillRect(x * s, y * s, s, s);
    }
    g.fillStyle = "rgba(60,60,60,0.35)";
    for (let i = 0; i <= n; i++) { g.fillRect(i * s - 1, 0, 2, h); g.fillRect(0, i * s - 1, w, 2); }
    streaks(g, w, h, r, 40, 0.28, "40,38,34");
    grime(g, w, h, r, 16, 0.18);
    speck(g, w, h, r, 1500, 0.12);
  });

/** white-painted brick (back courtyard) */
export const osWhiteBrick = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(17);
    g.fillStyle = "#9a9894";
    g.fillRect(0, 0, w, h);
    const bh = 16, bw = 32;
    for (let y = 0; y < h / bh; y++) {
      const off = (y % 2) * (bw / 2);
      for (let x = -1; x < w / bw + 1; x++) {
        const v = 205 + r() * 30;
        g.fillStyle = `rgb(${v},${v},${v - 4})`;
        g.fillRect(x * bw + off + 1.5, y * bh + 1.5, bw - 3, bh - 3);
        if (r() < 0.2) { g.fillStyle = "rgba(120,110,100,0.25)"; g.fillRect(x * bw + off + 3 + r() * 20, y * bh + 3, 4 + r() * 6, 4); }
      }
    }
    streaks(g, w, h, r, 30, 0.3, "50,46,40");
    grime(g, w, h, r, 20, 0.3);
  });

/** roll-down shutter: horizontal slats, rust bleeding */
export const osShutter = (seed = 3, tint = "#a4a8aa", graffiti = false) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = tint;
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) {
      const gr = g.createLinearGradient(0, y, 0, y + 8);
      gr.addColorStop(0, "rgba(255,255,255,0.35)");
      gr.addColorStop(0.5, "rgba(0,0,0,0)");
      gr.addColorStop(0.85, "rgba(0,0,0,0.25)");
      gr.addColorStop(1, "rgba(0,0,0,0.5)");
      g.fillStyle = gr;
      g.fillRect(0, y, w, 8);
    }
    for (let i = 0; i < 14; i++) {
      const x = r() * w, y = r() * h, len = 20 + r() * 90;
      const gr = g.createLinearGradient(0, y, 0, y + len);
      gr.addColorStop(0, `rgba(110,70,40,${0.15 + r() * 0.3})`);
      gr.addColorStop(1, "rgba(110,70,40,0)");
      g.fillStyle = gr;
      g.fillRect(x, y, 2 + r() * 8, len);
    }
    grime(g, w, h, r, 16, 0.3);
    speck(g, w, h, r, 1200, 0.18);
    if (graffiti) {
      g.lineJoin = "round"; g.lineCap = "round";
      const neon = (col: string, lw: number, draw: () => void) => { g.shadowColor = col; g.shadowBlur = 8; g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); draw(); g.stroke(); g.shadowBlur = 0; };
      // blue blocky letters top
      neon("#3d3bff", 7, () => { g.rect(14, 18, 34, 30); g.moveTo(60, 14); g.lineTo(60, 50); g.lineTo(84, 50); g.moveTo(96, 16); g.lineTo(96, 52); g.moveTo(96, 16); g.lineTo(120, 16); g.lineTo(120, 52); });
      // big green "SNS" outline letters
      g.font = `bold 92px Arial Black, Arial, sans-serif`;
      g.textBaseline = "alphabetic";
      g.shadowColor = "#39ff3a"; g.shadowBlur = 10;
      g.strokeStyle = "#2eff3c"; g.lineWidth = 7;
      g.save(); g.translate(20, 170); g.rotate(-0.12); g.strokeText("SNS", 0, 0); g.restore();
      g.strokeStyle = "#1fd12e"; g.lineWidth = 3;
      g.save(); g.translate(26, 176); g.rotate(-0.12); g.strokeText("SNS", 0, 0); g.restore();
      g.shadowBlur = 0;
      // katakana side tag
      g.fillStyle = "#35ff3e"; g.font = `bold 36px ${JP}`;
      g.fillText("ヲス", 180, 70); g.fillText("ルナ", 186, 112);
      // blue zigzag underline
      neon("#3a2cff", 6, () => { g.moveTo(24, 214); for (let i = 0; i < 12; i++) g.lineTo(34 + i * 17, 214 + (i % 2 ? -12 : 0) - i * 5); });
    }
  });

/** dark reflective strip windows with mullions (upper floors of the concrete buildings) */
export const osGlass = (seed = 1, cols = 4) =>
  makeTex(256, 128, (g, w, h) => {
    const r = rng(seed);
    const gr = g.createLinearGradient(0, 0, w * 0.4, h);
    gr.addColorStop(0, "#56626c");
    gr.addColorStop(0.5, "#1c2329");
    gr.addColorStop(1, "#2b343b");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < cols; i++) {
      if (r() < 0.45) { g.fillStyle = `rgba(200,195,185,${0.15 + r() * 0.2})`; g.fillRect((i * w) / cols + 6, 6, w / cols - 12, h * (0.2 + r() * 0.5)); }
    }
    g.fillStyle = "rgba(255,255,255,0.08)";
    g.beginPath(); g.moveTo(w * 0.1, 0); g.lineTo(w * 0.35, 0); g.lineTo(w * 0.15, h); g.lineTo(-w * 0.1, h); g.fill();
    g.fillStyle = "#1a1c1e";
    for (let i = 0; i <= cols; i++) g.fillRect((i * w) / cols - 3, 0, 6, h);
    g.fillRect(0, 0, w, 5); g.fillRect(0, h - 5, w, 5); g.fillRect(0, h * 0.62, w, 4);
  });

/** AC outdoor unit front: fan grille on the left, louvres on the right */
export const osACFront = () =>
  makeTex(256, 192, (g, w, h) => {
    const r = rng(29);
    g.fillStyle = "#d8d8d2";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#b9b9b3"; g.fillRect(0, h - 10, w, 10);
    const cx = 86, cy = 96;
    g.fillStyle = "#6c6f70"; g.beginPath(); g.arc(cx, cy, 70, 0, 6.3); g.fill();
    g.strokeStyle = "#e6e6e0"; g.lineWidth = 2.5;
    for (let i = 1; i <= 7; i++) { g.beginPath(); g.arc(cx, cy, i * 10, 0, 6.3); g.stroke(); }
    for (let a = 0; a < 8; a++) { g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a * 0.785) * 70, cy + Math.sin(a * 0.785) * 70); g.stroke(); }
    g.fillStyle = "#c9c9c3"; g.beginPath(); g.arc(cx, cy, 12, 0, 6.3); g.fill();
    g.fillStyle = "rgba(0,0,0,0.25)";
    for (let y = 20; y < h - 20; y += 9) g.fillRect(176, y, 64, 4);
    grime(g, w, h, r, 14, 0.3);
    streaks(g, w, h, r, 10, 0.25);
  });

/** spiral duct (silver): bands along the tube length (u), for tube geometry */
export const osDuct = () =>
  makeTex(128, 64, (g, w, h) => {
    const r = rng(33);
    g.fillStyle = "#a9adb0";
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) {
      const gr = g.createLinearGradient(x, 0, x + 16, 0);
      gr.addColorStop(0, "rgba(0,0,0,0.35)");
      gr.addColorStop(0.3, "rgba(255,255,255,0.3)");
      gr.addColorStop(1, "rgba(0,0,0,0.1)");
      g.fillStyle = gr;
      g.fillRect(x, 0, 16, h);
    }
    grime(g, w, h, r, 10, 0.35);
  });

export type SignOpts = { vertical?: boolean; border?: string; sub?: string; neon?: boolean; font?: number; w?: number; h?: number; worn?: number; seed?: number; serif?: boolean };
const SERIF = `"IPAMincho", "IPAPMincho", "Noto Serif CJK JP", ${JP}`;
/** Japanese shop sign: bg, fg text, optional border & sub line; vertical = top-to-bottom characters */
export const osSign = (text: string, bg: string, fg: string, o: SignOpts = {}) => {
  const W = o.w ?? (o.vertical ? 96 : 384), H = o.h ?? (o.vertical ? 384 : 128);
  return makeTex(W, H, (g, w, h) => {
    const r = rng(o.seed ?? text.length * 7 + 1);
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    if (o.border) { g.strokeStyle = o.border; g.lineWidth = Math.max(4, Math.min(w, h) * 0.06); g.strokeRect(g.lineWidth, g.lineWidth, w - g.lineWidth * 2, h - g.lineWidth * 2); }
    g.fillStyle = fg;
    g.textAlign = "center";
    g.textBaseline = "middle";
    if (o.neon) { g.shadowColor = fg; g.shadowBlur = 14; }
    const F = o.serif ? SERIF : JP;
    const chars = [...text];
    if (o.vertical) {
      const n = chars.length + (o.sub ? 1 : 0);
      const fs = Math.min(w * 0.72, (h * 0.86) / n);
      g.font = `bold ${fs}px ${F}`;
      chars.forEach((c, i) => g.fillText(c, w / 2, h * 0.07 + fs * (i + 0.5)));
      if (o.sub) { g.font = `bold ${fs * 0.45}px ${F}`; g.fillText(o.sub, w / 2, h * 0.07 + fs * (chars.length + 0.5)); }
    } else {
      const fs = o.font ?? Math.min(h * (o.sub ? 0.56 : 0.7), (w * 0.86) / Math.max(1, chars.length));
      g.font = `bold ${fs}px ${F}`;
      g.fillText(text, w / 2, o.sub ? h * 0.42 : h / 2 + 2);
      if (o.sub) { g.font = `bold ${h * 0.2}px ${F}`; g.fillText(o.sub, w / 2, h * 0.82); }
    }
    g.shadowBlur = 0;
    const worn = o.worn ?? 0.5;
    if (worn > 0) {
      grime(g, w, h, r, 14, 0.3 * worn);
      streaks(g, w, h, r, 8, 0.25 * worn);
      speck(g, w, h, r, 500, 0.2 * worn);
    }
  });
};

/** the long "うに道楽 本店" facade band: off-white with black brush lettering */
export const osUniBand = () =>
  makeTex(512, 96, (g, w, h) => {
    const r = rng(91);
    g.fillStyle = "#e9e7e0";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#151515";
    g.textBaseline = "middle";
    g.font = `bold 66px ${SERIF}`;
    g.save(); g.translate(16, h / 2 + 4); g.scale(1, 1.05);
    let x = 0;
    void x;
    g.font = `bold 62px ${SERIF}`;
    g.fillText("TOM KODNER", 4, (r() - 0.5) * 4, w - 40);
    g.restore();
    streaks(g, w, h, r, 16, 0.2);
    grime(g, w, h, r, 6, 0.15);
  });

/** 猫カフェ vertical sign: yellow with a cat face and CAT CAFE */
export const osNekoCafe = () =>
  makeTex(96, 384, (g, w, h) => {
    const r = rng(93);
    g.fillStyle = "#f0c21d"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#1c1c1c"; g.lineWidth = 5; g.strokeRect(3, 3, w - 6, h - 6);
    g.fillStyle = "#1c1c1c"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `bold 58px ${JP}`;
    g.font = `bold 30px ${JP}`;
    "TOMKODNER".split("").forEach((c, i) => g.fillText(c, w * 0.42, 22 + i * 30));
    g.save(); g.translate(w * 0.86, 150); g.rotate(Math.PI / 2); g.font = `bold 13px sans-serif`; g.fillText("CAT CAFE", 0, 0); g.restore();
    // cat face
    const cx = w / 2, cy = 318;
    g.fillStyle = "#8a7a6a"; g.beginPath(); g.arc(cx, cy, 26, 0, 6.3); g.fill();
    g.beginPath(); g.moveTo(cx - 24, cy - 8); g.lineTo(cx - 18, cy - 36); g.lineTo(cx - 4, cy - 22); g.fill();
    g.beginPath(); g.moveTo(cx + 24, cy - 8); g.lineTo(cx + 18, cy - 36); g.lineTo(cx + 4, cy - 22); g.fill();
    g.fillStyle = "#e8e0d0"; g.beginPath(); g.ellipse(cx, cy + 10, 14, 10, 0, 0, 6.3); g.fill();
    g.fillStyle = "#2a8a3a"; g.beginPath(); g.arc(cx - 10, cy - 4, 4, 0, 6.3); g.arc(cx + 10, cy - 4, 4, 0, 6.3); g.fill();
    streaks(g, w, h, r, 6, 0.2);
  });

/** 免税 / 焼肉 combined tall sign: white top with red 免税, black lower part with red neon 焼肉 */
export const osMenzeiYakiniku = () =>
  makeTex(96, 384, (g, w, h) => {
    const r = rng(95);
    g.fillStyle = "#f4f2ee"; g.fillRect(0, 0, w, 150);
    g.fillStyle = "#d4141c"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `bold 44px ${JP}`;
    g.font = `bold 34px ${JP}`; ["T", "O", "M"].forEach((c, i) => g.fillText(c, w / 2, 28 + i * 34));
    g.font = `bold 11px ${JP}`; g.fillStyle = "#333"; g.fillText("TAX FREE", w / 2, 128);
    g.fillStyle = "#121212"; g.fillRect(0, 150, w, h - 150);
    g.shadowColor = "#ff2a2a"; g.shadowBlur = 12; g.fillStyle = "#ff3030";
    g.font = `bold 58px ${JP}`;
    g.font = `bold 32px ${JP}`; "KODNER".split("").forEach((c, i) => g.fillText(c, w * 0.45, 172 + i * 33));
    g.shadowBlur = 0;
    g.fillStyle = "#ffd23a"; g.font = `bold 12px ${JP}`;
    g.save(); g.translate(w * 0.86, 240); g.rotate(Math.PI / 2); g.fillText("TOM KODNER", 0, 0); g.restore();
    g.fillStyle = "#e8e8e8"; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(14 + i * 13, 350, 3.5, 0, 6.3); g.fill(); }
    streaks(g, w, h, r, 6, 0.15);
  });

/** 肉 居酒屋 vertical sign: white with 肉 in a black square frame and 居酒屋 below */
export const osNikuIzakaya = () =>
  makeTex(128, 384, (g, w, h) => {
    const r = rng(97);
    g.fillStyle = "#f3f2ee"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#111"; g.lineWidth = 6; g.strokeRect(4, 4, w - 8, h - 8);
    g.lineWidth = 7; g.strokeRect(20, 18, w - 40, w - 40);
    g.fillStyle = "#111"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `bold 74px ${SERIF}`;
    g.font = `bold 44px ${SERIF}`;
    g.fillText("TOM", w / 2, 18 + (w - 40) / 2 + 3);
    g.font = `bold 38px ${SERIF}`;
    "KODNER".split("").forEach((c, i) => g.fillText(c, w / 2, 142 + i * 40));
    streaks(g, w, h, r, 10, 0.22);
    grime(g, w, h, r, 6, 0.15);
  });

/** 薬 sign: yellow square with black 薬 (hanging drugstore banners) */
export const osKusuri = () =>
  makeTex(128, 192, (g, w, h) => {
    const r = rng(99);
    g.fillStyle = "#f2d21a"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#1a1a1a"; g.fillRect(0, 0, w, 8); g.fillRect(0, h - 8, w, 8);
    g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `bold 40px ${JP}`;
    g.fillText("TOM", w / 2, h / 2 - 26); g.font = `bold 26px ${JP}`; g.fillText("KODNER", w / 2, h / 2 + 26, w - 10);
    streaks(g, w, h, r, 6, 0.15);
  });

/** red vertical drugstore sign with white text (うさぎドラッグ) */
export const osUsagiDrug = () =>
  makeTex(96, 448, (g, w, h) => {
    g.fillStyle = "#d6121c"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#ffffff"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `bold 52px ${JP}`;
    g.font = `bold 40px ${JP}`;
    "TOMKODNER".split("").forEach((c, i) => g.fillText(c, w / 2, 32 + i * 46));
    g.strokeStyle = "#ffffff"; g.lineWidth = 3; g.strokeRect(6, 6, w - 12, h - 12);
  });

/** round lantern-face with a hand-painted red 大 (brush strokes) on white */
export const osDai = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(101);
    g.fillStyle = "#efece4"; g.fillRect(0, 0, w, h);
    grime(g, w, h, r, 10, 0.12);
    g.strokeStyle = "#c8141b"; g.fillStyle = "#c8141b"; g.lineCap = "round"; g.lineJoin = "round";
    const brush = (pts: [number, number][], w0: number, w1: number) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const t = i / (pts.length - 1);
        g.lineWidth = w0 + (w1 - w0) * t;
        g.beginPath(); g.moveTo(...pts[i]); g.lineTo(...pts[i + 1]); g.stroke();
      }
      // dry-brush flecks
      for (let i = 0; i < 20; i++) { const p = pts[Math.floor(r() * pts.length)]; g.fillRect(p[0] + (r() - 0.5) * 30, p[1] + (r() - 0.5) * 30, 2 + r() * 4, 1 + r() * 2); }
    };
    brush([[40, 96], [90, 92], [140, 88], [190, 84], [220, 88]], 26, 18); // horizontal
    brush([[128, 30], [126, 70], [122, 110], [110, 150], [88, 190], [58, 222], [36, 236]], 28, 10); // left sweep
    brush([[124, 118], [146, 150], [170, 186], [200, 214], [232, 228]], 18, 30); // right sweep
    grime(g, w, h, r, 6, 0.12);
  });

/** takoyaki octopus skin: glossy red with darker mottling and optional black brush text */
export const osOcto = (text = "") =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(103);
    g.fillStyle = "#d4161b"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "120,0,0" : "255,80,60"},${0.06 + r() * 0.08})`; g.beginPath(); g.arc(r() * w, r() * h, 6 + r() * 26, 0, 6.3); g.fill(); }
    if (text) {
      g.fillStyle = "#111"; g.textAlign = "center"; g.textBaseline = "middle";
      g.font = `bold 70px ${SERIF}`;
      g.save(); g.translate(w * 0.5, h * 0.36); g.rotate(-0.1); g.fillText(text, 0, 0); g.restore();
    }
  });

/** blue-and-white twisted towel (hachimaki) stripes */
export const osTowel = () =>
  makeTex(128, 64, (g, w, h) => {
    g.fillStyle = "#f4f4f4"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#2a5fb0";
    for (let x = -h; x < w + h; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 7, 0); g.lineTo(x + 7 + h, h); g.lineTo(x + h, h); g.fill(); }
  });

/** pufferfish lantern skin (lathe UV: u = around, v = along the body). Spots on the back, eyes on the sides */
export const osPuffer = () =>
  makeTex(512, 256, (g, w, h) => {
    const r = rng(105);
    g.fillStyle = "#f2f1ec"; g.fillRect(0, 0, w, h);
    // grey back (around u=0.5 which will face up)
    const gr = g.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0.25, "rgba(60,62,66,0)"); gr.addColorStop(0.4, "rgba(60,62,66,0.9)"); gr.addColorStop(0.6, "rgba(60,62,66,0.9)"); gr.addColorStop(0.75, "rgba(60,62,66,0)");
    g.fillStyle = gr; g.fillRect(0, h * 0.15, w, h * 0.7);
    // spots
    g.fillStyle = "#1c1d20";
    for (let i = 0; i < 22; i++) { const x = w * (0.3 + r() * 0.4), y = h * (0.2 + r() * 0.6); g.beginPath(); g.arc(x, y, 6 + r() * 9, 0, 6.3); g.fill(); }
    for (let i = 0; i < 10; i++) { const x = r() < 0.5 ? w * (0.12 + r() * 0.12) : w * (0.76 + r() * 0.12), y = h * (0.35 + r() * 0.4); g.beginPath(); g.arc(x, y, 5 + r() * 5, 0, 6.3); g.fill(); }
    // eyes (both sides, near the head end v≈0.72)
    for (const ex of [0.25, 0.75]) {
      const x = w * ex, y = h * 0.72;
      g.fillStyle = "#ffffff"; g.beginPath(); g.ellipse(x, y, 20, 24, 0, 0, 6.3); g.fill();
      g.strokeStyle = "#1c1d20"; g.lineWidth = 4; g.stroke();
      g.fillStyle = "#111"; g.beginPath(); g.arc(x, y + 2, 10, 0, 6.3); g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(x - 3, y - 2, 3, 0, 6.3); g.fill();
    }
    // red ふぐ lettering on the belly (u≈0)
    g.fillStyle = "#c4141b"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `bold 44px ${SERIF}`;
    for (const bx of [0.06, 0.94]) { g.save(); g.translate(w * bx, h * 0.45); g.rotate(Math.PI / 2); g.fillText("ふぐ", 0, 0); g.restore(); }
    grime(g, w, h, r, 10, 0.12);
  });

/** sea-urchin roe centre: bumpy orange */
export const osRoe = () =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(107);
    g.fillStyle = "#e0801a"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,190,70" : "150,70,10"},${0.3 + r() * 0.4})`; g.beginPath(); g.arc(r() * w, r() * h, 3 + r() * 5, 0, 6.3); g.fill(); }
  });

/** red plastic beer crate side: grid of holes + white label */
export const osBeerCrate = (base = "#b3161c", label = true) =>
  makeTex(128, 64, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(0,0,0,0.55)";
    for (let y = 0; y < 2; y++) for (let x = 0; x < 6; x++) g.fillRect(6 + x * 20, 6 + y * 14, 14, 9);
    if (label) {
      g.fillStyle = "#f4f2ea"; g.fillRect(28, 36, 72, 20);
      g.fillStyle = "#c4141b"; g.font = `bold 13px ${JP}`; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText("ユウヒビール", 64, 43); g.font = `9px ${JP}`; g.fillText("小びん・56本", 64, 52);
    }
    g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect(0, 0, w, 3);
  });

/** wooden plank crate / pallet wood (light, dirty) */
export const osCrateWood = (base = "#b89a6a", seed = 109) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(${r() < 0.5 ? "90,60,30" : "255,240,210"},${r() * 0.1})`; g.fillRect(0, y, w, 1 + r() * 2); }
    for (let i = 0; i < 16; i++) { g.strokeStyle = `rgba(80,55,30,${0.15 + r() * 0.2})`; g.lineWidth = 1; g.beginPath(); const y = r() * h; g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + (r() - 0.5) * 12, w * 0.7, y + (r() - 0.5) * 12, w, y); g.stroke(); }
    for (let i = 0; i < 4; i++) { g.fillStyle = "rgba(70,45,20,0.45)"; g.beginPath(); g.ellipse(r() * w, r() * h, 3 + r() * 4, 2 + r() * 2, 0, 0, 6.3); g.fill(); }
    grime(g, w, h, r, 16, 0.3);
  });

/** cardboard sheet */
export const osCardboard = (seed = 61) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#c29a62";
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 4) { g.fillStyle = `rgba(120,85,45,${0.05 + r() * 0.05})`; g.fillRect(x, 0, 2, h); }
    speck(g, w, h, r, 900, 0.12);
    grime(g, w, h, r, 14, 0.4, "60,40,20");
    for (let i = 0; i < 5; i++) { g.fillStyle = `rgba(70,50,30,${0.2 + r() * 0.25})`; g.beginPath(); g.ellipse(r() * w, r() * h, 6 + r() * 20, 3 + r() * 10, r() * 3, 0, 6.3); g.fill(); }
    g.fillStyle = "rgba(120,85,45,0.5)"; g.fillRect(0, h * 0.5 - 2, w, 4);
  });

/** cardboard box with blue tape and printed marks */
export const osBox = () =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(63);
    g.fillStyle = "#b98c55"; g.fillRect(0, 0, w, h);
    speck(g, w, h, r, 600, 0.12);
    g.fillStyle = "#2c63c4"; g.fillRect(w / 2 - 8, 0, 16, 24);
    g.strokeStyle = "rgba(40,30,20,0.6)"; g.lineWidth = 2; g.strokeRect(90, 96, 12, 14); g.strokeRect(106, 96, 12, 14);
    grime(g, w, h, r, 6, 0.3);
  });

/** stainless keg: brushed steel with dark smudges */
export const osKeg = (tint = "#9ea3a8", seed = 111) =>
  makeTex(256, 128, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = tint; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y++) { g.fillStyle = `rgba(${r() < 0.5 ? "0,0,0" : "255,255,255"},${r() * 0.06})`; g.fillRect(0, y, w, 1); }
    grime(g, w, h, r, 24, 0.5, "30,26,40");
    for (let i = 0; i < 12; i++) { g.fillStyle = `rgba(110,70,40,${0.1 + r() * 0.2})`; g.beginPath(); g.arc(r() * w, r() * h, 2 + r() * 8, 0, 6.3); g.fill(); }
  });

/** yellow Japanese kei-car licence plate */
export const osPlate = (text = "55-1") =>
  makeTex(128, 64, (g, w, h) => {
    g.fillStyle = "#f2cf1d"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#222"; g.lineWidth = 3; g.strokeRect(2, 2, w - 4, h - 4);
    g.fillStyle = "#222"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = "bold 12px sans-serif"; g.fillText("大阪 480", w / 2, 13);
    g.font = "bold 34px sans-serif"; g.fillText(text, w / 2, 40);
  });

/** milk jug label: white with a blue panel and a drop */
export const osJug = () =>
  makeTex(128, 128, (g, w, h) => {
    g.fillStyle = "#f6f6f3"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#2a74c9"; g.fillRect(0, 50, w, 60);
    g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(40, 58); g.quadraticCurveTo(26, 82, 40, 92); g.quadraticCurveTo(54, 82, 40, 58); g.fill();
    g.fillRect(64, 70, 50, 4); g.fillRect(64, 80, 40, 4); g.fillRect(64, 90, 46, 4);
  });

/** telephone-pole sticker band: yellow with black/orange marks */
export const osPoleTag = () =>
  makeTex(128, 128, (g, w, h) => {
    g.fillStyle = "#f2d21a"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#1c1c1c"; g.font = `bold 20px ${JP}`; g.textAlign = "center"; g.fillText("自転車", w / 2, 26);
    g.strokeStyle = "#e0561c"; g.lineWidth = 8; g.beginPath(); g.roundRect(20, 44, 88, 56, 18); g.stroke();
    g.fillStyle = "#1c1c1c"; g.fillRect(40, 64, 48, 16);
  });

/** sticker band on poles: generic small poster */
export const osPoster = (bg: string, fg: string, t: string) =>
  makeTex(64, 128, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle"; g.font = `bold 26px ${JP}`;
    [...t].forEach((c, i) => g.fillText(c, w / 2, 22 + i * 30));
  });

/** octagonal concrete bench: pale concrete with lichen blotches */
export const osBenchStone = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(113);
    g.fillStyle = "#a8aba6"; g.fillRect(0, 0, w, h);
    speck(g, w, h, r, 4000, 0.22);
    for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "150,110,130" : "120,130,90"},${0.15 + r() * 0.15})`; g.beginPath(); g.arc(r() * w, r() * h, 8 + r() * 20, 0, 6.3); g.fill(); }
    grime(g, w, h, r, 20, 0.3);
  });

/** weathered wooden utility pole */
export const osPole = () =>
  makeTex(128, 256, (g, w, h) => {
    const r = rng(115);
    g.fillStyle = "#4a3f2a"; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 2) { g.fillStyle = `rgba(${r() < 0.5 ? "20,15,5" : "120,100,60"},${r() * 0.2})`; g.fillRect(x, 0, 1 + r() * 2, h); }
    grime(g, w, h, r, 12, 0.3);
  });

/** red-brown polished stone (shop pillars) */
export const osRedStone = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(117);
    g.fillStyle = "#6e2e24"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "150,80,60" : "40,15,10"},${0.1 + r() * 0.2})`; g.beginPath(); g.arc(r() * w, r() * h, 4 + r() * 18, 0, 6.3); g.fill(); }
    g.strokeStyle = "rgba(230,200,180,0.35)"; g.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) { g.beginPath(); let x = r() * w, y = 0; g.moveTo(x, y); while (y < h) { x += (r() - 0.5) * 30; y += 20 + r() * 20; g.lineTo(x, y); } g.stroke(); }
  });

/** yellow/black hazard stripes */
export const osHazard = () =>
  makeTex(128, 32, (g, w, h) => {
    g.fillStyle = "#1a1a1a"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#f2c81a";
    for (let x = -h; x < w + h; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 16, 0); g.lineTo(x + 16 + h, h); g.lineTo(x + h, h); g.fill(); }
  });

/** tiled shop floor (white small tiles) */
export const osShopTile = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(119);
    g.fillStyle = "#9c9a96"; g.fillRect(0, 0, w, h);
    const s = 32;
    for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) { const v = 210 + r() * 20; g.fillStyle = `rgb(${v},${v},${v - 4})`; g.fillRect(x + 1.5, y + 1.5, s - 3, s - 3); }
    grime(g, w, h, r, 20, 0.2);
  });

/** red painted steel (drugstore facade / bands) */
export const osRedPaint = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(121);
    g.fillStyle = "#c8161d"; g.fillRect(0, 0, w, h);
    speck(g, w, h, r, 1500, 0.15);
    streaks(g, w, h, r, 20, 0.2);
    grime(g, w, h, r, 10, 0.2);
  });

/** drum paint with rust */
export const osDrum = (base: string, seed = 12) =>
  makeTex(256, 128, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 24; i++) {
      const x = r() * w, y = r() * h, rad = 4 + r() * 20;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, `rgba(120,55,20,${0.3 + r() * 0.4})`);
      gr.addColorStop(1, "rgba(120,55,20,0)");
      g.fillStyle = gr;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    speck(g, w, h, r, 800, 0.2);
  });

/** distant skyline facade: window grid */
export const osTower = (base: string, seed = 71) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < 4; y++) {
      g.fillStyle = `rgb(${40 + r() * 20},${48 + r() * 20},${58 + r() * 20})`;
      g.fillRect(8, y * 64 + 18, w - 16, 30);
      g.fillStyle = "rgba(0,0,0,0.5)"; for (let x = 0; x < 5; x++) g.fillRect(8 + x * ((w - 16) / 4) - 2, y * 64 + 18, 4, 30);
    }
    streaks(g, w, h, r, 20, 0.3);
  });
