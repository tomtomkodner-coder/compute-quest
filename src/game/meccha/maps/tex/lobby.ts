// טקסטורות הלובי (גלריית המתנה): פרקט, טיח, חיפוי עץ, בד הציור PLAY, משטח HUNTER, שלטי שמות, בדים.
import { makeTex } from "../../textures";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hex(c: string) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function shade(c: string, f: number) {
  const [r, g, b] = hex(c);
  const k = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${k(r)},${k(g)},${k(b)})`;
}

/** פרקט אלון: שורות קרשים באורכים שונים, גוון משתנה, סיבים ומפרקים (מתאים לחזרה) */
export const oakPlanks = (base = "#b98a5a", seed = 3, rows = 8) =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(seed);
    const rh = h / rows;
    for (let row = 0; row < rows; row++) {
      const y = row * rh;
      let x = r() * w;
      const start = x;
      while (x < start + w) {
        const len = w * (0.35 + r() * 0.4);
        const f = 0.86 + r() * 0.24;
        for (const off of [0, -w]) {
          const px = x + off;
          g.fillStyle = shade(base, f);
          g.fillRect(px, y, len, rh);
          // סיבי עץ
          for (let i = 0; i < 14; i++) {
            g.strokeStyle = `rgba(70,40,15,${0.04 + r() * 0.08})`;
            g.lineWidth = 0.6 + r() * 1.2;
            g.beginPath();
            const yy = y + 2 + r() * (rh - 4);
            g.moveTo(px, yy);
            g.bezierCurveTo(px + len * 0.3, yy + (r() - 0.5) * 5, px + len * 0.7, yy + (r() - 0.5) * 5, px + len, yy + (r() - 0.5) * 3);
            g.stroke();
          }
          // קשר בעץ
          if (r() < 0.25) {
            g.fillStyle = "rgba(60,30,10,0.25)";
            g.beginPath();
            g.ellipse(px + r() * len, y + rh / 2, 6 + r() * 6, 2 + r() * 2, 0, 0, Math.PI * 2);
            g.fill();
          }
          g.fillStyle = "rgba(40,22,8,0.55)";
          g.fillRect(px, y, 2, rh);
        }
        x += len;
      }
      g.fillStyle = "rgba(40,22,8,0.5)";
      g.fillRect(0, y, w, 2);
      g.fillStyle = "rgba(255,240,220,0.08)";
      g.fillRect(0, y + 2, w, 1);
    }
  });

/** טיח מט עם כתמים עדינים */
export const plaster = (base = "#ebe6dc", seed = 2) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      g.fillStyle = r() < 0.5 ? `rgba(255,255,255,${0.01 + r() * 0.02})` : `rgba(80,60,40,${0.008 + r() * 0.014})`;
      g.beginPath();
      g.ellipse(r() * w, r() * h, 10 + r() * 40, 8 + r() * 30, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 1600; i++) {
      g.fillStyle = `rgba(0,0,0,${r() * 0.05})`;
      g.fillRect(r() * w, r() * h, 1, 1);
    }
  });

/** חיפוי עץ צבוע עם מסגרות מוגבהות (לוח אחד = 1 מ') */
export const wainscot = (base = "#34505c") =>
  makeTex(256, 256, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    const m = 34;
    g.fillStyle = shade(base, 0.72);
    g.fillRect(m - 6, m - 6, w - 2 * m + 12, h - 2 * m + 12);
    g.fillStyle = shade(base, 1.22);
    g.fillRect(m - 6, m - 6, w - 2 * m + 12, 5);
    g.fillRect(m - 6, m - 6, 5, h - 2 * m + 12);
    g.fillStyle = shade(base, 1.05);
    g.fillRect(m, m, w - 2 * m, h - 2 * m);
    g.fillStyle = shade(base, 0.85);
    g.fillRect(m, h - m - 4, w - 2 * m, 4);
    g.fillRect(w - m - 4, m, 4, h - 2 * m);
    const r = rng(9);
    for (let i = 0; i < 500; i++) {
      g.fillStyle = `rgba(255,255,255,${r() * 0.04})`;
      g.fillRect(r() * w, r() * h, 1, 2);
    }
  });

/** בד ציור עם המילה PLAY מצוירת במכחול */
export const playCanvas = () =>
  makeTex(512, 384, (g, w, h) => {
    const r = rng(42);
    g.fillStyle = "#f4efe4";
    g.fillRect(0, 0, w, h);
    // אריג הבד
    for (let y = 0; y < h; y += 3) { g.fillStyle = `rgba(120,100,70,${0.03 + r() * 0.03})`; g.fillRect(0, y, w, 1); }
    for (let x = 0; x < w; x += 3) { g.fillStyle = `rgba(120,100,70,${0.02 + r() * 0.03})`; g.fillRect(x, 0, 1, h); }
    // משיכות רקע צבעוניות
    const bg = ["#8ecae6", "#ffb703", "#fb8500", "#90be6d", "#f28482", "#cdb4db"];
    for (let i = 0; i < 26; i++) {
      g.strokeStyle = bg[Math.floor(r() * bg.length)];
      g.globalAlpha = 0.25 + r() * 0.3;
      g.lineWidth = 10 + r() * 26;
      g.lineCap = "round";
      g.beginPath();
      const x = r() * w, y = r() * h;
      g.moveTo(x, y);
      g.quadraticCurveTo(x + (r() - 0.5) * 160, y + (r() - 0.5) * 80, x + (r() - 0.5) * 220, y + (r() - 0.5) * 60);
      g.stroke();
    }
    g.globalAlpha = 1;
    // כתמי צבע
    for (let i = 0; i < 18; i++) {
      g.fillStyle = bg[Math.floor(r() * bg.length)];
      g.beginPath();
      g.arc(r() * w, r() * h, 2 + r() * 6, 0, Math.PI * 2);
      g.fill();
    }
    // PLAY — כמה שכבות מוזזות = משיכות מכחול
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = "900 168px 'Arial Black', Impact, sans-serif";
    const cols = ["#16324f", "#1d4e89", "#2a6fb0"];
    for (let i = 0; i < 16; i++) {
      g.fillStyle = cols[i % 3];
      g.globalAlpha = 0.35;
      g.fillText("PLAY", w / 2 + (r() - 0.5) * 8, h / 2 + 10 + (r() - 0.5) * 8);
    }
    g.globalAlpha = 1;
    g.fillStyle = "#e63946";
    g.fillText("PLAY", w / 2 - 6, h / 2 + 4);
    g.fillStyle = "rgba(255,255,255,0.25)";
    g.font = "900 168px 'Arial Black', Impact, sans-serif";
    g.save();
    g.beginPath();
    g.rect(0, 0, w, h / 2 - 18);
    g.clip();
    g.fillText("PLAY", w / 2 - 8, h / 2 + 2);
    g.restore();
    // טפטופים
    g.fillStyle = "#e63946";
    for (let i = 0; i < 7; i++) {
      const x = w * 0.18 + r() * w * 0.64;
      const y = h / 2 + 60;
      const len = 14 + r() * 40;
      g.fillRect(x, y, 4, len);
      g.beginPath();
      g.arc(x + 2, y + len, 4, 0, Math.PI * 2);
      g.fill();
    }
    // משיכה תחתונה
    g.strokeStyle = "#ffb703";
    g.lineWidth = 12;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(w * 0.2, h * 0.84);
    g.quadraticCurveTo(w * 0.5, h * 0.9, w * 0.8, h * 0.82);
    g.stroke();
  });

/** פני משטח הציידים: עיגול אדום עם טבעת לבנה והמילה HUNTER */
export const hunterPad = () =>
  makeTex(512, 512, (g, w, h) => {
    const cx = w / 2, cy = h / 2;
    const grd = g.createRadialGradient(cx, cy, 20, cx, cy, w / 2);
    grd.addColorStop(0, "#d42a2a");
    grd.addColorStop(1, "#a51b1b");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#f7f1e8";
    g.lineWidth = 14;
    g.beginPath(); g.arc(cx, cy, w / 2 - 22, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 4;
    g.beginPath(); g.arc(cx, cy, w / 2 - 44, 0, Math.PI * 2); g.stroke();
    // כוונת
    g.strokeStyle = "rgba(255,255,255,0.35)";
    g.lineWidth = 6;
    g.beginPath(); g.arc(cx, cy - 80, 34, 0, Math.PI * 2); g.stroke();
    g.beginPath();
    g.moveTo(cx - 52, cy - 80); g.lineTo(cx + 52, cy - 80);
    g.moveTo(cx, cy - 132); g.lineTo(cx, cy - 28);
    g.stroke();
    g.fillStyle = "#fff8ef";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = "900 92px 'Arial Black', Impact, sans-serif";
    g.fillText("HUNTER", cx, cy + 50);
  });

/** שלט פליז קטן עם שם המפה חרוט */
export const plaque = (text: string) =>
  makeTex(512, 96, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, "#e2c77e");
    grd.addColorStop(0.5, "#c9a456");
    grd.addColorStop(1, "#a9853f");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#7d5f28";
    g.lineWidth = 4;
    g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = "#3a2a10";
    g.textAlign = "center";
    g.textBaseline = "middle";
    let size = 46;
    g.font = `bold ${size}px Georgia, 'Times New Roman', serif`;
    while (g.measureText(text).width > w - 50 && size > 20) { size -= 2; g.font = `bold ${size}px Georgia, 'Times New Roman', serif`; }
    g.fillText(text, w / 2, h / 2 + 2);
  });

/** אריג (ספה/ספסל) */
export const weave = (base: string, seed = 4) =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
      const v = ((x + y) % 4 === 0 ? 0.08 : -0.06) + (r() - 0.5) * 0.06;
      g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
      g.fillRect(x, y, 2, 2);
    }
  });

/** עור עם קמטים עדינים */
export const leather = (base: string) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(17);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      g.strokeStyle = `rgba(0,0,0,${0.04 + r() * 0.06})`;
      g.lineWidth = 1;
      const x = r() * w, y = r() * h;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 10, y + (r() - 0.5) * 10); g.stroke();
    }
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.03})`;
      g.beginPath(); g.ellipse(r() * w, r() * h, 20 + r() * 30, 10 + r() * 20, r() * 3, 0, Math.PI * 2); g.fill();
    }
  });

/** שטיח מודרני: מסגרת, שדה עם דוגמה גאומטרית */
export const modernRug = (a: string, b: string, c: string) =>
  makeTex(512, 256, (g, w, h) => {
    const r = rng(8);
    g.fillStyle = a;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = b;
    g.lineWidth = 10;
    g.strokeRect(18, 18, w - 36, h - 36);
    g.lineWidth = 3;
    g.strokeRect(34, 34, w - 68, h - 68);
    g.fillStyle = c;
    for (let x = 60; x < w - 60; x += 48)
      for (let y = 60; y < h - 60; y += 48) {
        g.save();
        g.translate(x + 12, y + 12);
        g.rotate(Math.PI / 4);
        g.fillRect(-9, -9, 18, 18);
        g.restore();
      }
    for (let i = 0; i < 5000; i++) {
      g.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "0,0,0"},${r() * 0.07})`;
      g.fillRect(r() * w, r() * h, 1, 2);
    }
  });

/** מתכת מוברשת */
export const brushed = (base = "#c9ccd0") =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(33);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) {
      g.fillStyle = r() < 0.5 ? `rgba(255,255,255,${r() * 0.12})` : `rgba(0,0,0,${r() * 0.1})`;
      g.fillRect(0, r() * h, w, 1);
    }
  });

/** פלטת צבעים של צייר */
export const palette = () =>
  makeTex(256, 256, (g, w, h) => {
    g.fillStyle = "#c8a172";
    g.fillRect(0, 0, w, h);
    const cols = ["#e63946", "#ffb703", "#2a9d8f", "#1d4e89", "#ffffff", "#8338ec", "#fb8500"];
    const r = rng(3);
    cols.forEach((c, i) => {
      const a = (i / cols.length) * Math.PI * 1.6 + 0.5;
      g.fillStyle = c;
      g.beginPath();
      g.ellipse(w / 2 + Math.cos(a) * 80, h / 2 + Math.sin(a) * 80, 18 + r() * 8, 14 + r() * 6, r() * 3, 0, Math.PI * 2);
      g.fill();
    });
  });

/** קיר לבנים אדום (כמו בתמונת המפתח של המשחק): 32 שורות × 12 לבנים לאריח של 2.5 מ' */
export const brickWall = (seed = 21) =>
  makeTex(512, 512, (g, w, h) => {
    let s = seed;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    g.fillStyle = "#cdbfae";
    g.fillRect(0, 0, w, h);
    const pal = ["#9a4430", "#a9523a", "#8a3a28", "#b35f45", "#93432f", "#7d3325", "#a24c36", "#b86a4d"];
    const rows = 32, cols = 12, bw = w / cols, bh = h / rows;
    for (let y = 0; y < rows; y++)
      for (let x = -1; x <= cols; x++) {
        const px = x * bw + (y % 2) * (bw / 2) + 1.5, py = y * bh + 1.5;
        g.fillStyle = pal[Math.floor(r() * pal.length)];
        g.fillRect(px, py, bw - 3, bh - 3);
        g.fillStyle = `rgba(0,0,0,${r() * 0.12})`;
        g.fillRect(px, py + bh * 0.55, bw - 3, bh * 0.45 - 3);
        g.fillStyle = `rgba(255,235,210,${r() * 0.08})`;
        g.fillRect(px, py, bw - 3, 2);
      }
    for (let i = 0; i < 1800; i++) { // נקבוביות ושחיקה
      g.fillStyle = `rgba(${r() < 0.5 ? "0,0,0" : "255,240,220"},${0.05 + r() * 0.1})`;
      g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
    }
  });

/** כתם צבע שפוך (שקוף מסביב) — צבע אחד לכל טקסטורה */
export const splat = (color: string, seed = 1) =>
  makeTex(256, 256, (g, w, h) => {
    let s = seed * 7919 + 13;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    g.clearRect(0, 0, w, h);
    g.fillStyle = color;
    const cx = w / 2, cy = h / 2;
    g.beginPath();
    for (let k = 0; k <= 28; k++) {
      const a = (k / 28) * Math.PI * 2, rr = 52 + r() * 34;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      if (k === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.fill();
    for (let k = 0; k < 16; k++) { // טיפות מסביב
      const a = r() * Math.PI * 2, d = 80 + r() * 40, rr = 3 + r() * 9;
      g.beginPath(); g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, rr, 0, 7); g.fill();
    }
  });
