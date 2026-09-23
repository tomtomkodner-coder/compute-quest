// כל הטקסטורות נוצרות בקוד (Canvas) — אין קבצי תמונה.
// שומרים את ה־ImageData כדי שה"טפטפת" והשומרים יוכלו לדגום צבע מדויק מכל משטח.
import * as THREE from "three";

export interface PaintTex {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  data: ImageData | null; // null = דינמי (קורא ישר מה־canvas)
  repeat: [number, number];
}

type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function makeTex(w: number, h: number, draw: Draw, repeat: [number, number] = [1, 1], dynamic = false): PaintTex {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  draw(ctx, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.anisotropy = 4;
  return { canvas, ctx, texture, data: dynamic ? null : ctx.getImageData(0, 0, w, h), repeat };
}

/** דגימת צבע (0..1) מטקסטורה לפי UV של פגיעת raycast */
export function sampleTex(t: PaintTex, uv: THREE.Vector2, out: THREE.Color, repeat = t.repeat) {
  const w = t.canvas.width;
  const h = t.canvas.height;
  let u = (uv.x * repeat[0]) % 1;
  let v = (uv.y * repeat[1]) % 1;
  if (u < 0) u += 1;
  if (v < 0) v += 1;
  const x = Math.min(w - 1, Math.floor(u * w));
  const y = Math.min(h - 1, Math.floor((1 - v) * h));
  let r: number, g: number, b: number;
  if (t.data) {
    const i = (y * w + x) * 4;
    r = t.data.data[i];
    g = t.data.data[i + 1];
    b = t.data.data[i + 2];
  } else {
    const d = t.ctx.getImageData(x, y, 1, 1).data;
    r = d[0];
    g = d[1];
    b = d[2];
  }
  return out.setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
}

// ---------- פטרנים ----------

export const wood = (base: string, line: string, seed = 1) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    const plank = h / 4;
    for (let i = 0; i < 4; i++) {
      g.fillStyle = `rgba(0,0,0,${0.04 + r() * 0.08})`;
      g.fillRect(0, i * plank, w, plank);
      g.fillStyle = line;
      g.fillRect(0, i * plank, w, 3);
      const off = r() * w;
      g.fillRect(off, i * plank, 3, plank);
      for (let k = 0; k < 6; k++) {
        g.strokeStyle = `rgba(60,30,10,${0.08 + r() * 0.1})`;
        g.lineWidth = 1;
        g.beginPath();
        const y = i * plank + r() * plank;
        g.moveTo(0, y);
        g.bezierCurveTo(w * 0.3, y + r() * 6 - 3, w * 0.6, y + r() * 6 - 3, w, y);
        g.stroke();
      }
    }
  });

export const checker = (a: string, b: string, n = 4) =>
  makeTex(256, 256, (g, w, h) => {
    const s = w / n;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        g.fillStyle = (x + y) % 2 ? a : b;
        g.fillRect(x * s, y * s, s, s);
      }
    g.strokeStyle = "rgba(0,0,0,0.12)";
    g.lineWidth = 2;
    for (let i = 0; i <= n; i++) {
      g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke();
      g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke();
    }
  });

export const stripes = (cols: string[], vertical = true) =>
  makeTex(256, 256, (g, w, h) => {
    const n = cols.length * 2;
    const s = (vertical ? w : h) / n;
    for (let i = 0; i < n; i++) {
      g.fillStyle = cols[i % cols.length];
      if (vertical) g.fillRect(i * s, 0, s, h);
      else g.fillRect(0, i * s, w, s);
    }
  });

export const dots = (bg: string, dot: string, n = 4) =>
  makeTex(256, 256, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = dot;
    const s = w / n;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        g.beginPath();
        g.arc(x * s + s / 2 + (y % 2) * (s / 2), y * s + s / 2, s * 0.18, 0, Math.PI * 2);
        g.fill();
      }
  });

export const brick = (bg: string, mortar: string) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(7);
    g.fillStyle = mortar;
    g.fillRect(0, 0, w, h);
    const bh = h / 8;
    const bw = w / 4;
    for (let y = 0; y < 8; y++)
      for (let x = -1; x < 5; x++) {
        const c = new THREE.Color(bg).offsetHSL(0, 0, (r() - 0.5) * 0.08);
        g.fillStyle = `#${c.getHexString()}`;
        g.fillRect(x * bw + (y % 2) * (bw / 2) + 3, y * bh + 3, bw - 6, bh - 6);
      }
  });

export const rug = (a: string, b: string, c: string) =>
  makeTex(256, 256, (g, w, h) => {
    g.fillStyle = a;
    g.fillRect(0, 0, w, h);
    g.fillStyle = b;
    g.fillRect(16, 16, w - 32, h - 32);
    g.fillStyle = a;
    g.fillRect(32, 32, w - 64, h - 64);
    g.fillStyle = c;
    for (let i = 0; i < 5; i++) {
      g.save();
      g.translate(w / 2, h / 2);
      g.rotate((i * Math.PI) / 5);
      g.fillRect(-90, -8, 180, 16);
      g.restore();
    }
    g.beginPath();
    g.fillStyle = b;
    g.arc(w / 2, h / 2, 34, 0, Math.PI * 2);
    g.fill();
  });

export const books = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(3);
    const pal = ["#e63946", "#457b9d", "#f4a261", "#2a9d8f", "#8338ec", "#ffbe0b", "#fb5607", "#3a86ff", "#06d6a0"];
    g.fillStyle = "#6b4226";
    g.fillRect(0, 0, w, h);
    const shelf = h / 4;
    for (let s = 0; s < 4; s++) {
      let x = 6;
      while (x < w - 10) {
        const bw = 10 + r() * 16;
        const bh = shelf * (0.6 + r() * 0.32);
        g.fillStyle = pal[Math.floor(r() * pal.length)];
        g.fillRect(x, s * shelf + shelf - bh - 6, bw - 2, bh);
        g.fillStyle = "rgba(255,255,255,0.35)";
        g.fillRect(x + 2, s * shelf + shelf - bh + 4, bw - 6, 3);
        x += bw;
      }
      g.fillStyle = "#4a2c17";
      g.fillRect(0, s * shelf + shelf - 6, w, 6);
    }
  });

export const leaves = () =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(11);
    g.fillStyle = "#2f7d32";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 120; i++) {
      g.fillStyle = ["#43a047", "#1b5e20", "#66bb6a", "#388e3c"][Math.floor(r() * 4)];
      g.beginPath();
      g.ellipse(r() * w, r() * h, 6 + r() * 6, 3 + r() * 3, r() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
  });

export const crate = () =>
  makeTex(128, 128, (g, w, h) => {
    g.fillStyle = "#c8913f";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#8a5a1e";
    g.lineWidth = 12;
    g.strokeRect(6, 6, w - 12, h - 12);
    g.lineWidth = 10;
    g.beginPath(); g.moveTo(10, 10); g.lineTo(w - 10, h - 10); g.stroke();
    g.fillStyle = "rgba(0,0,0,0.08)";
    for (let i = 0; i < 6; i++) g.fillRect(0, (i * h) / 6, w, 2);
  });

export const blanket = () =>
  makeTex(256, 256, (g, w, h) => {
    const cols = ["#ff6b9d", "#ffd166", "#8ecae6", "#b5e48c"];
    const s = w / 4;
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        g.fillStyle = cols[(x + y * 2) % 4];
        g.fillRect(x * s, y * s, s, s);
        g.fillStyle = "rgba(255,255,255,0.5)";
        g.beginPath();
        g.arc(x * s + s / 2, y * s + s / 2, s / 5, 0, Math.PI * 2);
        g.fill();
      }
  });

export const tv = () =>
  makeTex(128, 128, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, h);
    grd.addColorStop(0, "#1b1f3b");
    grd.addColorStop(1, "#3a0ca3");
    g.fillStyle = "#111";
    g.fillRect(0, 0, w, h);
    g.fillStyle = grd;
    g.fillRect(8, 8, w - 16, h - 16);
    g.fillStyle = "#ffd60a";
    g.beginPath(); g.arc(w * 0.7, h * 0.35, 14, 0, Math.PI * 2); g.fill();
  });

export const poster = (bg: string, fg: string, text: string) =>
  makeTex(128, 160, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = fg;
    g.beginPath();
    g.moveTo(w / 2, 20); g.lineTo(w - 20, h - 50); g.lineTo(20, h - 50); g.closePath();
    g.fill();
    g.font = "bold 22px sans-serif";
    g.textAlign = "center";
    g.fillText(text, w / 2, h - 18);
  });

/** טקסטורה ריקה שאפשר לצייר עליה (הגוף של הזיקית) */
export const paintable = (size = 128, color = "#f2f2f2") =>
  makeTex(size, size, (g, w, h) => {
    g.fillStyle = color;
    g.fillRect(0, 0, w, h);
  }, [1, 1], true);

/** תווית טקסט (סימן שאלה/קריאה מעל השומרים) */
export function labelTexture(text: string, color: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  g.font = "bold 100px sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.lineWidth = 12;
  g.strokeStyle = "#000";
  g.strokeText(text, 64, 70);
  g.fillStyle = color;
  g.fillText(text, 64, 70);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export const marble = (base = "#f1ede4", vein = "#b9b2a4", seed = 5) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) {
      g.strokeStyle = vein;
      g.globalAlpha = 0.25 + r() * 0.35;
      g.lineWidth = 0.6 + r() * 1.8;
      g.beginPath();
      let x = r() * w;
      let y = 0;
      g.moveTo(x, y);
      while (y < h) {
        x += (r() - 0.5) * 30;
        y += 10 + r() * 20;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    g.globalAlpha = 1;
  });

export const tiles = (a: string, b: string, n = 8, grout = "rgba(0,0,0,0.18)") =>
  makeTex(256, 256, (g, w, h) => {
    const s = w / n;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        g.fillStyle = (x + y) % 2 ? a : b;
        g.fillRect(x * s, y * s, s, s);
      }
    g.strokeStyle = grout;
    g.lineWidth = 3;
    for (let i = 0; i <= n; i++) {
      g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke();
      g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke();
    }
  });

export const damask = (bg: string, fg: string) =>
  makeTex(256, 256, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = fg;
    for (const [cx, cy] of [[64, 64], [192, 192], [192, 64], [64, 192]] as const) {
      const big = (cx + cy) % 256 === 128 ? 1 : 0.55;
      g.beginPath();
      g.ellipse(cx, cy, 26 * big, 44 * big, 0, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.arc(cx, cy - 52 * big, 8 * big, 0, Math.PI * 2);
      g.arc(cx, cy + 52 * big, 8 * big, 0, Math.PI * 2);
      g.fill();
    }
    void h;
  });

export const painting = (seed: number) =>
  makeTex(160, 128, (g, w, h) => {
    const r = rng(seed);
    const pals = [
      ["#264653", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51"],
      ["#0b132b", "#1c2541", "#3a506b", "#5bc0be", "#ffd166"],
      ["#fefae0", "#dda15e", "#bc6c25", "#606c38", "#283618"],
      ["#ffcad4", "#f4acb7", "#9d8189", "#d8e2dc", "#6d597a"],
    ];
    const pal = pals[Math.floor(r() * pals.length)];
    // שמיים ואדמה
    g.fillStyle = pal[0];
    g.fillRect(0, 0, w, h);
    g.fillStyle = pal[1];
    g.fillRect(0, h * (0.5 + r() * 0.2), w, h);
    for (let i = 0; i < 7; i++) {
      g.fillStyle = pal[2 + Math.floor(r() * 3)];
      g.beginPath();
      if (r() < 0.5) g.arc(r() * w, r() * h, 8 + r() * 26, 0, Math.PI * 2);
      else {
        const x = r() * w;
        const y = r() * h;
        g.moveTo(x, y);
        g.lineTo(x + 20 + r() * 40, y + 30 + r() * 30);
        g.lineTo(x - 20 - r() * 30, y + 30 + r() * 30);
      }
      g.fill();
    }
    // מסגרת זהב
    g.lineWidth = 12;
    g.strokeStyle = "#b8860b";
    g.strokeRect(6, 6, w - 12, h - 12);
    g.lineWidth = 3;
    g.strokeStyle = "#ffd76a";
    g.strokeRect(11, 11, w - 22, h - 22);
  });

export const bars = () =>
  makeTex(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = "#3a3a44";
    for (let i = 0; i < 8; i++) g.fillRect(i * 16 + 5, 0, 6, h);
    g.fillRect(0, 10, w, 6);
    g.fillRect(0, h - 16, w, 6);
  });

export const splat = () => {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const r = rng(Math.floor(Math.random() * 1e6));
  g.fillStyle = "#fff";
  g.beginPath();
  g.arc(32, 32, 16, 0, Math.PI * 2);
  g.fill();
  for (let i = 0; i < 9; i++) {
    const a = r() * Math.PI * 2;
    const d = 14 + r() * 14;
    g.beginPath();
    g.arc(32 + Math.cos(a) * d, 32 + Math.sin(a) * d, 2 + r() * 5, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  return t;
};
