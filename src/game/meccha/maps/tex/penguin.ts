// טקסטורות של Penguin Hotel: שיש משובץ כחול־לבן, טפט דמשק כחול, שטיחים, אריחי אמבטיה מבריקים,
// פסיפס, מדליון פתית שלג מתחת לפסל, שמיכות, שלטים.
import { makeTex } from "../../textures";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function veins(g: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, col: string, r: () => number, n = 5) {
  g.save();
  g.beginPath();
  g.rect(x0, y0, w, h);
  g.clip();
  for (let i = 0; i < n; i++) {
    g.strokeStyle = col;
    g.globalAlpha = 0.18 + r() * 0.3;
    g.lineWidth = 0.6 + r() * 1.6;
    g.beginPath();
    let x = x0 + r() * w, y = y0;
    g.moveTo(x, y);
    while (y < y0 + h) {
      x += (r() - 0.5) * 26;
      y += 8 + r() * 16;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  g.globalAlpha = 1;
  g.restore();
}

/** אריחי שיש משובצים (לבן / כחול) 2×2 עם עורקים ופוגות */
export const marbleChecker = (a = "#eef0f2", b = "#4f78a3") =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(12);
    const s = w / 2;
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 2; x++) {
        const dark = (x + y) % 2 === 1;
        g.fillStyle = dark ? b : a;
        g.fillRect(x * s, y * s, s, s);
        // עננות
        for (let i = 0; i < 30; i++) {
          g.fillStyle = dark ? `rgba(255,255,255,${r() * 0.05})` : `rgba(120,130,140,${r() * 0.05})`;
          g.beginPath();
          g.ellipse(x * s + r() * s, y * s + r() * s, 10 + r() * 40, 6 + r() * 20, r() * 3, 0, Math.PI * 2);
          g.fill();
        }
        veins(g, x * s, y * s, s, s, dark ? "#c9d9ea" : "#8c96a3", r, 6);
      }
    g.strokeStyle = "rgba(60,60,70,0.45)";
    g.lineWidth = 3;
    for (let i = 0; i <= 2; i++) {
      g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke();
      g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke();
    }
  });

/** שיש לבן חלק (עמודים, משטחים) */
export const marble = (base = "#f1f2f4", vein = "#9aa6b4", seed = 3) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) {
      g.fillStyle = `rgba(140,150,165,${r() * 0.05})`;
      g.beginPath();
      g.ellipse(r() * w, r() * h, 10 + r() * 50, 6 + r() * 20, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
    veins(g, 0, 0, w, h, vein, r, 9);
  });

/** טפט דמשק כחול עם מוטיב כסוף־תכלת */
export const damask = (bg = "#1f3b68", fg = "#2d5391", line = "#6f93c6") =>
  makeTex(256, 256, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    const motif = (cx: number, cy: number, s: number) => {
      g.fillStyle = fg;
      g.beginPath();
      g.moveTo(cx, cy - 60 * s);
      g.bezierCurveTo(cx + 40 * s, cy - 30 * s, cx + 40 * s, cy + 30 * s, cx, cy + 60 * s);
      g.bezierCurveTo(cx - 40 * s, cy + 30 * s, cx - 40 * s, cy - 30 * s, cx, cy - 60 * s);
      g.fill();
      g.strokeStyle = line;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(cx, cy - 44 * s);
      g.bezierCurveTo(cx + 22 * s, cy - 18 * s, cx + 22 * s, cy + 18 * s, cx, cy + 44 * s);
      g.bezierCurveTo(cx - 22 * s, cy + 18 * s, cx - 22 * s, cy - 18 * s, cx, cy - 44 * s);
      g.stroke();
      for (const sx of [-1, 1]) {
        g.beginPath();
        g.moveTo(cx, cy);
        g.bezierCurveTo(cx + sx * 30 * s, cy - 20 * s, cx + sx * 52 * s, cy + 6 * s, cx + sx * 36 * s, cy + 26 * s);
        g.stroke();
      }
      g.fillStyle = line;
      g.beginPath(); g.arc(cx, cy - 66 * s, 5 * s, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(cx, cy + 66 * s, 5 * s, 0, Math.PI * 2); g.fill();
    };
    motif(64, 64, 0.8);
    motif(192, 192, 0.8);
    motif(192, 64, 0.45);
    motif(64, 192, 0.45);
    // פסים עדינים
    g.fillStyle = "rgba(255,255,255,0.03)";
    for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 2, h);
    void h;
  });

/** טפט פסים תכלת (מסדרונות/חדרים) */
export const stripeWall = (a = "#d4e6f3", b = "#c4dbed") =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(4);
    g.fillStyle = a;
    g.fillRect(0, 0, w, h);
    g.fillStyle = b;
    for (let x = 0; x < w; x += 64) g.fillRect(x + 20, 0, 24, h);
    g.fillStyle = "rgba(255,255,255,0.35)";
    for (let x = 0; x < w; x += 64) g.fillRect(x + 18, 0, 2, h);
    for (let i = 0; i < 1200; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.03})`; g.fillRect(r() * w, r() * h, 1, 1); }
  });

/** שטיח מסדרון כחול עם סריג יהלומים זהוב */
export const carpet = (bg = "#1d3f73", fg = "#c8a24e", border = "#0f2448") =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(6);
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = fg;
    g.globalAlpha = 0.55;
    g.lineWidth = 2;
    for (let i = -w; i < w * 2; i += 64) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke();
      g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.stroke();
    }
    g.globalAlpha = 1;
    g.fillStyle = fg;
    for (let y = 0; y <= h; y += 64) for (let x = 0; x <= w; x += 64) {
      g.beginPath(); g.arc(x + 32, y, 4, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = border;
    for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "0,0,0"},${r() * 0.08})`; g.fillRect(r() * w, r() * h, 1, 2); }
  });

/** שטיח חדר רך */
export const plush = (base = "#8fa9c4", seed = 9) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "0,0,0"},${r() * 0.07})`;
      g.fillRect(r() * w, r() * h, 1, 1 + r() * 2);
    }
  });

/** אריחי קיר מבריקים (לבן עם שורת תכלת) */
export const bathTile = (a = "#f7fafc", b = "#7fb3dd", n = 8) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(5);
    const s = w / n;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const base = y === 5 ? b : a;
        g.fillStyle = base;
        g.fillRect(x * s, y * s, s, s);
        const grd = g.createLinearGradient(x * s, y * s, x * s + s, y * s + s);
        grd.addColorStop(0, "rgba(255,255,255,0.18)");
        grd.addColorStop(1, `rgba(0,0,0,${0.03 + r() * 0.04})`);
        g.fillStyle = grd;
        g.fillRect(x * s, y * s, s, s);
      }
    g.strokeStyle = "#b9c3cc";
    g.lineWidth = 2.5;
    for (let i = 0; i <= n; i++) {
      g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke();
      g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke();
    }
  });

/** פסיפס רצפת אמבטיה */
export const mosaic = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(8);
    const n = 16, s = w / n;
    const cols = ["#f4f7fa", "#e9f0f6", "#dde9f3", "#f4f7fa", "#a9cbe6"];
    g.fillStyle = "#c7cfd6";
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        g.fillStyle = cols[Math.floor(r() * (r() < 0.12 ? 5 : 4))];
        g.fillRect(x * s + 1, y * s + 1, s - 2, s - 2);
      }
  });

/** מדליון רצפה: פתית שלג / ורד רוחות מתחת לפסל הפינגווין */
export const medallion = () =>
  makeTex(512, 512, (g, w, h) => {
    const cx = w / 2, cy = h / 2;
    g.fillStyle = "#e9edf1";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#1f3b68";
    g.beginPath(); g.arc(cx, cy, 250, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#e9edf1";
    g.beginPath(); g.arc(cx, cy, 232, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#c8a24e";
    g.lineWidth = 6;
    g.beginPath(); g.arc(cx, cy, 222, 0, Math.PI * 2); g.stroke();
    // כוכב 8 קצוות
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const L = i % 2 ? 150 : 215;
      g.fillStyle = i % 2 ? "#6f93c6" : "#2d5391";
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a - 0.18) * 50, cy + Math.sin(a - 0.18) * 50);
      g.lineTo(cx + Math.cos(a) * L, cy + Math.sin(a) * L);
      g.lineTo(cx + Math.cos(a + 0.18) * 50, cy + Math.sin(a + 0.18) * 50);
      g.closePath();
      g.fill();
    }
    g.fillStyle = "#c8a24e";
    g.beginPath(); g.arc(cx, cy, 40, 0, Math.PI * 2); g.fill();
    const r = rng(2);
    veins(g, 0, 0, w, h, "#9aa6b4", r, 10);
  });

/** שמיכת פוך לבנה עם תפרי יהלום */
export const duvet = (base = "#f4f6f9", stitch = "rgba(90,110,140,0.22)") =>
  makeTex(256, 256, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = stitch;
    g.lineWidth = 2;
    g.setLineDash([5, 4]);
    for (let i = -w; i < w * 2; i += 42) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke();
      g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.stroke();
    }
    g.setLineDash([]);
    for (let y = 0; y <= h; y += 42) for (let x = 0; x <= w; x += 42) {
      const grd = g.createRadialGradient(x + 21, y + 21, 2, x + 21, y + 21, 22);
      grd.addColorStop(0, "rgba(255,255,255,0.25)");
      grd.addColorStop(1, "rgba(0,0,0,0.04)");
      g.fillStyle = grd;
      g.fillRect(x, y, 42, 42);
    }
  });

/** כיסוי מיטה כחול עם פסים ופתיתים */
export const throwBlanket = (bg = "#274c86", fg = "#e8eef6") =>
  makeTex(256, 256, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = fg;
    for (const y of [30, 46, 210, 226]) g.fillRect(0, y, w, 6);
    g.strokeStyle = fg;
    g.lineWidth = 3;
    for (let x = 32; x < w; x += 64) {
      const y = 128;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 18, y + Math.sin(a) * 18); g.stroke();
      }
    }
  });

/** שלט זהב על כחול כהה */
export const sign = (text: string, w = 512, h = 128, bg = "#13284a", fg = "#e3c46d") =>
  makeTex(w, h, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = fg;
    g.lineWidth = 5;
    g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = fg;
    g.textAlign = "center";
    g.textBaseline = "middle";
    let size = Math.floor(h * 0.5);
    g.font = `bold ${size}px Georgia, 'Times New Roman', serif`;
    while (g.measureText(text).width > w - 40 && size > 12) { size -= 2; g.font = `bold ${size}px Georgia, 'Times New Roman', serif`; }
    g.fillText(text, w / 2, h / 2 + 2);
  });

/** נוף חורפי מחוץ לחלון (שלג, עצי אשוח, שמיים חיוורים) */
export const winterView = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(14);
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, "#b9d3ea");
    grd.addColorStop(0.6, "#e6f0f8");
    grd.addColorStop(1, "#ffffff");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) {
      const x = r() * w, base = h * 0.78 + r() * 20, th = 50 + r() * 70;
      g.fillStyle = `rgba(${60 + r() * 30},${95 + r() * 30},${100 + r() * 30},0.85)`;
      g.beginPath(); g.moveTo(x, base - th); g.lineTo(x + th * 0.3, base); g.lineTo(x - th * 0.3, base); g.fill();
      g.fillStyle = "rgba(255,255,255,0.8)";
      g.beginPath(); g.moveTo(x, base - th); g.lineTo(x + th * 0.1, base - th * 0.6); g.lineTo(x - th * 0.1, base - th * 0.6); g.fill();
    }
    g.fillStyle = "#f7fbff";
    g.fillRect(0, h * 0.84, w, h);
    for (let i = 0; i < 200; i++) { g.fillStyle = "rgba(255,255,255,0.9)"; g.beginPath(); g.arc(r() * w, r() * h, 0.8 + r() * 1.5, 0, Math.PI * 2); g.fill(); }
  });

/** אריג קטיפה */
export const velvet = (base: string, seed = 3) =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(255,255,255,${r() * 0.05})`;
      g.beginPath(); g.ellipse(r() * w, r() * h, 10 + r() * 20, 4 + r() * 10, r() * 3, 0, Math.PI * 2); g.fill();
    }
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.07})`; g.fillRect(r() * w, r() * h, 1, 1); }
  });
