// טקסטורות Canvas למפת Backrooms: טפט צהוב עם דוגמה, שטיח לח, אריחי תקרה, מפזרי פלורסנט,
// חזיתות מכונות משקאות, שלט EXIT ואטלס תמרורים.
import { makeTex } from "../../textures";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** טפט "Level 0": צהוב חרדלי, פסים אנכיים דקים ומוטיב חצים/יהלומים קטן; תפרי גלילים, כתמי הצהבה */
export const brWallpaper = () =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(11);
    g.fillStyle = "#d8bf66";
    g.fillRect(0, 0, w, h);
    // גלילי טפט (כל 256px = חצי מטר) בגוון מעט שונה
    for (let s = 0; s < 2; s++) {
      g.fillStyle = s ? "rgba(120,95,20,0.05)" : "rgba(255,245,200,0.04)";
      g.fillRect(s * 256, 0, 256, h);
    }
    // הצהבה בתדר נמוך
    for (let i = 0; i < 26; i++) {
      const x = r() * w, y = r() * h, rad = 40 + r() * 120;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, `rgba(${150 + r() * 40},${110 + r() * 30},30,${0.02 + r() * 0.03})`);
      gr.addColorStop(1, "rgba(140,110,30,0)");
      g.fillStyle = gr;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // פסים אנכיים כפולים
    for (let x = 0; x < w; x += 64) {
      g.fillStyle = "rgba(125,100,28,0.22)";
      g.fillRect(x, 0, 2, h);
      g.fillRect(x + 5, 0, 1, h);
      g.fillStyle = "rgba(255,248,210,0.18)";
      g.fillRect(x + 2, 0, 3, h);
    }
    // המוטיב: חץ מעלה + יהלום, מתחלף בין עמודות
    g.lineWidth = 2;
    for (let cx = 32; cx < w; cx += 64)
      for (let cy = 16; cy < h; cy += 32) {
        const alt = ((cx - 32) / 64 + (cy - 16) / 32) % 2 === 0;
        g.strokeStyle = "rgba(118,94,26,0.34)";
        g.fillStyle = "rgba(118,94,26,0.16)";
        g.beginPath();
        if (alt) {
          g.moveTo(cx - 7, cy + 5); g.lineTo(cx, cy - 5); g.lineTo(cx + 7, cy + 5);
          g.moveTo(cx - 7, cy + 11); g.lineTo(cx, cy + 1); g.lineTo(cx + 7, cy + 11);
          g.stroke();
        } else {
          g.moveTo(cx, cy - 6); g.lineTo(cx + 5, cy); g.lineTo(cx, cy + 6); g.lineTo(cx - 5, cy); g.closePath();
          g.fill(); g.stroke();
        }
      }
    // תפר בין גלילים
    for (const x of [0, 256]) { g.fillStyle = "rgba(90,70,15,0.28)"; g.fillRect(x, 0, 1, h); }
    // גרעין נייר
    for (let i = 0; i < 9000; i++) {
      const v = (r() - 0.5) * 0.12;
      g.fillStyle = v > 0 ? `rgba(255,250,220,${v})` : `rgba(60,45,0,${-v})`;
      g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
    }
  });

/** שטיח משרדי צהוב־חום לח, סיבים, כתמים כהים ושחיקה */
export const brCarpet = () =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(23);
    g.fillStyle = "#b09a58";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      const x = r() * w, y = r() * h, rad = 30 + r() * 110;
      const dark = r() < 0.6;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, dark ? `rgba(90,70,30,${0.12 + r() * 0.14})` : `rgba(215,195,130,${0.08 + r() * 0.1})`);
      gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr;
      for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) g.fillRect(x - rad + ox, y - rad + oy, rad * 2, rad * 2);
    }
    // סיבים (לולאות שטיח)
    for (let i = 0; i < 26000; i++) {
      const v = r();
      g.fillStyle = v < 0.5 ? `rgba(70,55,20,${0.1 + r() * 0.2})` : `rgba(235,220,160,${0.08 + r() * 0.16})`;
      g.fillRect(r() * w, r() * h, 1 + r() * 1.5, 1 + r() * 1.5);
    }
    // קווי שורות עדינים של השטיח
    for (let y = 0; y < h; y += 4) { g.fillStyle = "rgba(60,45,10,0.05)"; g.fillRect(0, y, w, 1); }
  });

/** תקרה אקוסטית 4x4 אריחים (60 ס"מ) עם פרופילי T ואריח מוכתם */
export const brCeiling = () =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(5);
    const t = w / 4;
    for (let ty = 0; ty < 4; ty++)
      for (let tx = 0; tx < 4; tx++) {
        const shade = 222 + Math.floor(r() * 12) - 6;
        g.fillStyle = `rgb(${shade},${shade - 4},${shade - 22})`;
        g.fillRect(tx * t, ty * t, t, t);
        // חורים ו"תולעים" של אריח אקוסטי
        for (let i = 0; i < 260; i++) {
          g.fillStyle = `rgba(110,100,70,${0.06 + r() * 0.12})`;
          const x = tx * t + 4 + r() * (t - 8), y = ty * t + 4 + r() * (t - 8);
          if (r() < 0.6) g.fillRect(x, y, 1.5, 1.5);
          else { g.save(); g.translate(x, y); g.rotate(r() * 3); g.fillRect(0, 0, 3 + r() * 5, 1); g.restore(); }
        }
        // צל בקצה (האריח שקוע בפרופיל)
        g.strokeStyle = "rgba(60,55,30,0.16)";
        g.lineWidth = 4;
        g.strokeRect(tx * t + 5, ty * t + 5, t - 10, t - 10);
      }
    // כתם מים על אריח אחד + כתם קטן
    for (const [cx, cy, rad] of [[t * 2.5, t * 1.5, 30]] as const) {
      const gr = g.createRadialGradient(cx, cy, rad * 0.2, cx, cy, rad);
      gr.addColorStop(0, "rgba(160,120,50,0.18)");
      gr.addColorStop(0.8, "rgba(140,100,40,0.3)");
      gr.addColorStop(1, "rgba(140,100,40,0)");
      g.fillStyle = gr;
      g.beginPath(); g.arc(cx, cy, rad, 0, Math.PI * 2); g.fill();
    }
    // פרופילי T
    g.fillStyle = "#e9e6da";
    for (let i = 0; i <= 4; i++) { g.fillRect(i * t - 3, 0, 6, h); g.fillRect(0, i * t - 3, w, 6); }
    g.fillStyle = "rgba(0,0,0,0.12)";
    for (let i = 0; i <= 4; i++) { g.fillRect(i * t + 3, 0, 1, h); g.fillRect(0, i * t + 3, w, 1); }
  });

/** מפזר פריזמטי של גוף תאורה 60x120 */
export const brDiffuser = () =>
  makeTex(256, 128, (g, w, h) => {
    g.fillStyle = "#fdfaf0";
    g.fillRect(0, 0, w, h);
    // שתי נורות מאחורי המפזר
    for (const y of [h * 0.33, h * 0.67]) {
      const gr = g.createLinearGradient(0, y - 18, 0, y + 18);
      gr.addColorStop(0, "rgba(255,255,255,0)");
      gr.addColorStop(0.5, "rgba(255,255,255,1)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr;
      g.fillRect(6, y - 18, w - 12, 36);
    }
    g.fillStyle = "rgba(150,140,110,0.14)";
    for (let x = 0; x < w; x += 6) g.fillRect(x, 0, 1, h);
    for (let y = 0; y < h; y += 6) g.fillRect(0, y, w, 1);
    const e = g.createLinearGradient(0, 0, 0, h);
    e.addColorStop(0, "rgba(120,110,80,0.35)");
    e.addColorStop(0.12, "rgba(0,0,0,0)");
    e.addColorStop(0.88, "rgba(0,0,0,0)");
    e.addColorStop(1, "rgba(120,110,80,0.35)");
    g.fillStyle = e;
    g.fillRect(0, 0, w, h);
  });

/** חזית מכונת משקאות / חטיפים (0.84x1.78 מ') */
export const brVendFront = (kind: "drinks" | "snacks") =>
  makeTex(256, 512, (g, w, h) => {
    const r = rng(kind === "drinks" ? 31 : 37);
    g.fillStyle = "#2a2b30";
    g.fillRect(0, 0, w, h);
    // כותרת מוארת
    const head = g.createLinearGradient(0, 8, 0, 60);
    head.addColorStop(0, kind === "drinks" ? "#ffffff" : "#fff3c2");
    head.addColorStop(1, kind === "drinks" ? "#d7ecff" : "#ffd36b");
    g.fillStyle = head;
    g.fillRect(10, 10, w - 20, 48);
    g.fillStyle = kind === "drinks" ? "#1565c0" : "#b3261e";
    g.font = "bold 28px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(kind === "drinks" ? "COLD DRINKS" : "SNACKS", w / 2, 35);
    // חלון התצוגה
    const winW = 170, winX = 12, winY = 70, winH = 300;
    g.fillStyle = "#0e1418";
    g.fillRect(winX, winY, winW, winH);
    const rows = kind === "drinks" ? 5 : 5;
    const cans = ["#d32f2f", "#1976d2", "#fbc02d", "#388e3c", "#f57c00", "#7b1fa2", "#ffffff", "#00897b", "#c2185b"];
    for (let rI = 0; rI < rows; rI++) {
      const y0 = winY + 8 + rI * (winH / rows);
      const rowH = winH / rows - 14;
      g.fillStyle = "#cfd8dc";
      g.fillRect(winX + 4, y0 + rowH + 2, winW - 8, 3);
      if (kind === "drinks") {
        for (let i = 0; i < 6; i++) {
          const col = cans[Math.floor(r() * cans.length)];
          const x = winX + 8 + i * 27;
          const bottle = r() < 0.35;
          g.fillStyle = col;
          if (bottle) {
            g.fillRect(x + 4, y0 + 10, 15, rowH - 10);
            g.fillRect(x + 8, y0, 7, 12);
            g.fillStyle = "rgba(255,255,255,0.8)";
            g.fillRect(x + 4, y0 + 24, 15, 10);
          } else {
            g.fillRect(x + 2, y0 + 16, 20, rowH - 16);
            g.fillStyle = "rgba(255,255,255,0.55)";
            g.fillRect(x + 2, y0 + 26, 20, 5);
            g.fillStyle = "#bdbdbd";
            g.fillRect(x + 3, y0 + 14, 18, 3);
          }
          g.fillStyle = "rgba(255,255,255,0.25)";
          g.fillRect(x + 3, y0 + 16, 3, rowH - 18);
          // תגית מחיר
          g.fillStyle = "#e0e0e0";
          g.fillRect(x + 3, y0 + rowH + 6, 18, 6);
          g.fillStyle = "#e53935";
          g.fillRect(x + 8, y0 + rowH + 7, 8, 4);
        }
      } else {
        for (let i = 0; i < 4; i++) {
          const x = winX + 8 + i * 40;
          // ספירלה
          g.strokeStyle = "#9ea7ad";
          g.lineWidth = 2;
          for (let s = 0; s < 5; s++) { g.beginPath(); g.ellipse(x + 17, y0 + rowH - 6, 14, 4, 0, 0, Math.PI); g.stroke(); }
          const col = cans[Math.floor(r() * cans.length)];
          g.fillStyle = col;
          g.beginPath();
          g.moveTo(x + 4, y0 + 6); g.lineTo(x + 32, y0 + 4); g.lineTo(x + 33, y0 + rowH - 6); g.lineTo(x + 3, y0 + rowH - 4);
          g.closePath(); g.fill();
          g.fillStyle = "rgba(255,255,255,0.7)";
          g.beginPath(); g.arc(x + 18, y0 + rowH / 2, 7, 0, Math.PI * 2); g.fill();
          g.fillStyle = "rgba(0,0,0,0.2)";
          g.fillRect(x + 4, y0 + 6, 28, 4);
        }
      }
    }
    // השתקפות זכוכית
    const gl = g.createLinearGradient(winX, winY, winX + winW, winY + winH);
    gl.addColorStop(0, "rgba(255,255,255,0.14)");
    gl.addColorStop(0.35, "rgba(255,255,255,0.02)");
    gl.addColorStop(0.5, "rgba(255,255,255,0.12)");
    gl.addColorStop(0.6, "rgba(255,255,255,0)");
    g.fillStyle = gl;
    g.fillRect(winX, winY, winW, winH);
    // לוח כפתורים
    const px = 192;
    g.fillStyle = "#3a3c42";
    g.fillRect(px, 70, 54, 300);
    g.fillStyle = "#101214";
    g.fillRect(px + 8, 80, 38, 20);
    g.fillStyle = "#7cff6b";
    g.font = "bold 13px monospace";
    g.fillText("0.00", px + 27, 91);
    for (let i = 0; i < 12; i++) {
      g.fillStyle = "#d9d9d9";
      g.beginPath(); g.arc(px + 16 + (i % 2) * 22, 118 + Math.floor(i / 2) * 22, 7, 0, Math.PI * 2); g.fill();
      g.fillStyle = "rgba(0,0,0,0.3)";
      g.beginPath(); g.arc(px + 16 + (i % 2) * 22, 119 + Math.floor(i / 2) * 22, 3, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = "#9e9e9e";
    g.fillRect(px + 20, 260, 14, 34);
    g.fillStyle = "#111";
    g.fillRect(px + 25, 264, 4, 26);
    g.fillStyle = "#555";
    g.fillRect(px + 10, 320, 34, 30);
    // פתח איסוף
    g.fillStyle = "#16171a";
    g.fillRect(24, 392, 160, 64);
    g.fillStyle = "#3b3d44";
    g.fillRect(28, 396, 152, 20);
    g.fillStyle = "rgba(255,255,255,0.15)";
    g.fillRect(28, 396, 152, 3);
    g.fillStyle = "#e0e0e0";
    g.font = "bold 12px sans-serif";
    g.fillText("PUSH", 104, 440);
    // בסיס
    g.fillStyle = "#1a1b1e";
    g.fillRect(0, 470, w, 42);
    for (let x = 16; x < w - 16; x += 12) { g.fillStyle = "#0a0a0c"; g.fillRect(x, 480, 6, 22); }
    // מסגרת כרום
    g.strokeStyle = "#8c9096";
    g.lineWidth = 4;
    g.strokeRect(2, 2, w - 4, h - 4);
    g.strokeRect(winX - 2, winY - 2, winW + 4, winH + 4);
  });

/** שלט EXIT זוהר: אותיות אדומות על רקע כהה (רק האותיות זוהרות) */
export const brExit = () =>
  makeTex(256, 96, (g, w, h) => {
    g.fillStyle = "#1c0b0b";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#ff2a1f";
    g.font = "bold 64px Arial, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("EXIT", w / 2 - 14, h / 2 + 3);
    g.beginPath();
    g.moveTo(w - 46, h / 2 - 14); g.lineTo(w - 22, h / 2); g.lineTo(w - 46, h / 2 + 14); g.closePath();
    g.fill();
    g.fillRect(w - 62, h / 2 - 5, 18, 10);
    g.strokeStyle = "#5a1a14";
    g.lineWidth = 4;
    g.strokeRect(4, 4, w - 8, h - 8);
  });

/** אטלס תמרורים 512x512 — כל תמרור במלבן משלו. rects: [x,y,w,h] בפיקסלים */
export const SIGN_RECTS: Record<string, [number, number, number, number]> = {
  stop: [0, 0, 128, 128],
  yield: [128, 0, 128, 128],
  speed30: [256, 0, 128, 128],
  noentry: [384, 0, 128, 128],
  left: [0, 128, 128, 128],
  right: [128, 128, 128, 128],
  ahead: [256, 128, 128, 128],
  curve: [384, 128, 128, 128],
  warn: [0, 256, 128, 128],
  ped: [128, 256, 128, 128],
  nopark: [256, 256, 128, 128],
  speed60: [384, 256, 128, 128],
  oneway: [0, 400, 256, 80],
  deadend: [256, 400, 256, 80],
};

export const brSigns = () =>
  makeTex(512, 512, (g) => {
    g.fillStyle = "#9aa0a6";
    g.fillRect(0, 0, 512, 512);
    const R = SIGN_RECTS;
    const text = (t: string, x: number, y: number, size: number, col: string) => {
      g.fillStyle = col;
      g.font = `bold ${size}px Arial, sans-serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(t, x, y);
    };
    const circle = (key: string, fill: string, ring?: string) => {
      const [x, y, w] = R[key];
      const cx = x + w / 2, cy = y + w / 2;
      g.fillStyle = "#f5f5f5";
      g.beginPath(); g.arc(cx, cy, 64, 0, Math.PI * 2); g.fill();
      g.fillStyle = ring ?? fill;
      g.beginPath(); g.arc(cx, cy, 61, 0, Math.PI * 2); g.fill();
      if (ring) { g.fillStyle = fill; g.beginPath(); g.arc(cx, cy, 48, 0, Math.PI * 2); g.fill(); }
      return [cx, cy] as const;
    };
    const arrow = (cx: number, cy: number, rot: number, col: string) => {
      g.save(); g.translate(cx, cy); g.rotate(rot);
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(0, -40); g.lineTo(28, -8); g.lineTo(10, -8); g.lineTo(10, 38); g.lineTo(-10, 38); g.lineTo(-10, -8); g.lineTo(-28, -8);
      g.closePath(); g.fill();
      g.restore();
    };
    // STOP (מתומן)
    {
      const [x, y] = R.stop;
      const cx = x + 64, cy = y + 64;
      for (const [rad, col] of [[64, "#f5f5f5"], [59, "#c62828"]] as const) {
        g.fillStyle = col;
        g.beginPath();
        for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + (i * Math.PI) / 4; g.lineTo(cx + Math.cos(a) * rad / Math.cos(Math.PI / 8), cy + Math.sin(a) * rad / Math.cos(Math.PI / 8)); }
        g.closePath(); g.fill();
      }
      text("STOP", cx, cy + 3, 40, "#ffffff");
    }
    // YIELD (משולש הפוך)
    {
      const [x, y] = R.yield;
      const tri = (inset: number, col: string) => {
        g.fillStyle = col;
        g.beginPath();
        g.moveTo(x + inset * 1.7, y + inset); g.lineTo(x + 128 - inset * 1.7, y + inset); g.lineTo(x + 64, y + 128 - inset * 2);
        g.closePath(); g.fill();
      };
      tri(0, "#f5f5f5"); tri(3, "#c62828"); tri(20, "#f5f5f5");
      text("YIELD", x + 64, y + 42, 20, "#c62828");
    }
    { const [cx, cy] = circle("speed30", "#f5f5f5", "#c62828"); text("30", cx, cy + 3, 50, "#111"); }
    { const [cx, cy] = circle("speed60", "#f5f5f5", "#c62828"); text("60", cx, cy + 3, 50, "#111"); }
    { const [cx, cy] = circle("noentry", "#c62828"); g.fillStyle = "#fff"; g.fillRect(cx - 44, cy - 11, 88, 22); }
    { const [cx, cy] = circle("left", "#1565c0"); arrow(cx, cy, -Math.PI / 2, "#fff"); }
    { const [cx, cy] = circle("right", "#1565c0"); arrow(cx, cy, Math.PI / 2, "#fff"); }
    { const [cx, cy] = circle("ahead", "#1565c0"); arrow(cx, cy, 0, "#fff"); }
    { const [cx, cy] = circle("nopark", "#1565c0", "#c62828");
      g.strokeStyle = "#c62828"; g.lineWidth = 12;
      g.beginPath(); g.moveTo(cx - 34, cy - 34); g.lineTo(cx + 34, cy + 34); g.stroke(); }
    // יהלומי אזהרה צהובים
    const diamond = (key: string) => {
      const [x, y] = R[key];
      const cx = x + 64, cy = y + 64;
      for (const [rad, col] of [[64, "#111"], [58, "#fbc02d"], [52, "#111"], [49, "#fbc02d"]] as const) {
        g.fillStyle = col;
        g.beginPath(); g.moveTo(cx, cy - rad); g.lineTo(cx + rad, cy); g.lineTo(cx, cy + rad); g.lineTo(cx - rad, cy); g.closePath(); g.fill();
      }
      return [cx, cy] as const;
    };
    {
      const [cx, cy] = diamond("curve");
      g.strokeStyle = "#111"; g.lineWidth = 9; g.lineCap = "round";
      g.beginPath(); g.moveTo(cx - 8, cy + 28); g.bezierCurveTo(cx - 8, cy, cx + 14, cy + 2, cx + 12, cy - 18); g.stroke();
      g.fillStyle = "#111";
      g.beginPath(); g.moveTo(cx + 12, cy - 34); g.lineTo(cx + 26, cy - 14); g.lineTo(cx - 2, cy - 14); g.closePath(); g.fill();
    }
    { const [cx, cy] = diamond("warn"); text("!", cx, cy + 4, 70, "#111"); }
    // מעבר חציה (ריבוע כחול)
    {
      const [x, y] = R.ped;
      g.fillStyle = "#f5f5f5"; g.fillRect(x, y, 128, 128);
      g.fillStyle = "#1565c0"; g.fillRect(x + 4, y + 4, 120, 120);
      g.fillStyle = "#f5f5f5";
      g.beginPath(); g.moveTo(x + 64, y + 14); g.lineTo(x + 114, y + 110); g.lineTo(x + 14, y + 110); g.closePath(); g.fill();
      g.fillStyle = "#111";
      g.beginPath(); g.arc(x + 66, y + 48, 7, 0, Math.PI * 2); g.fill();
      g.lineWidth = 7; g.strokeStyle = "#111"; g.lineCap = "round";
      g.beginPath(); g.moveTo(x + 64, y + 58); g.lineTo(x + 60, y + 80); g.lineTo(x + 50, y + 98); g.moveTo(x + 60, y + 80); g.lineTo(x + 72, y + 98);
      g.moveTo(x + 50, y + 70); g.lineTo(x + 64, y + 62); g.lineTo(x + 76, y + 72); g.stroke();
      for (let i = 0; i < 4; i++) g.fillRect(x + 30 + i * 18, y + 102, 10, 4);
    }
    // ONE WAY
    {
      const [x, y, w, h] = R.oneway;
      g.fillStyle = "#f5f5f5"; g.fillRect(x, y, w, h);
      g.fillStyle = "#111"; g.fillRect(x + 4, y + 4, w - 8, h - 8);
      g.fillStyle = "#f5f5f5";
      g.beginPath();
      g.moveTo(x + 18, y + 30); g.lineTo(x + 196, y + 30); g.lineTo(x + 196, y + 16); g.lineTo(x + 238, y + 40);
      g.lineTo(x + 196, y + 64); g.lineTo(x + 196, y + 50); g.lineTo(x + 18, y + 50); g.closePath(); g.fill();
      text("ONE WAY", x + 104, y + 41, 17, "#111");
    }
    // DEAD END
    {
      const [x, y, w, h] = R.deadend;
      g.fillStyle = "#111"; g.fillRect(x, y, w, h);
      g.fillStyle = "#fbc02d"; g.fillRect(x + 4, y + 4, w - 8, h - 8);
      text("DEAD END", x + w / 2, y + h / 2 + 2, 40, "#111");
    }
  });

/** כתם רטיבות (שקוף) לשטיח ולקירות */
export const brStain = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(77);
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) {
      const x = w / 2 + (r() - 0.5) * 110, y = h / 2 + (r() - 0.5) * 110, rad = 30 + r() * 60;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, "rgba(80,58,20,0.22)");
      gr.addColorStop(0.75, "rgba(80,58,20,0.14)");
      gr.addColorStop(0.9, "rgba(70,48,15,0.2)");
      gr.addColorStop(1, "rgba(70,48,15,0)");
      g.fillStyle = gr;
      g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
    }
  });
