// טקסטורות Canvas למפת Sugarland: קרקע מנטה עם סוכריות־צבעוניות, שביל עוגיות, בצק ג'ינג'ר, רעפי ציפוי,
// וופל, ספירלות לוליפופ, פסי מקל סוכר, שוקולד, ציפוי דונאט עם סוכריות, הרים מפוספסים ושלט הכניסה.
import { makeTex } from "../../textures";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const SPR = ["#ff4f8b", "#ffd23f", "#3bceac", "#5e7bff", "#ff8c42", "#b56bff", "#ffffff"];

/** "דשא" סוכר מנטה פסטלי עם גבישי סוכר ומעט סוכריות־צבעוניות */
export const sgGround = () =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(3);
    g.fillStyle = "#a9e8c4";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) {
      const x = r() * w, y = r() * h, rad = 40 + r() * 120;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      const c = r() < 0.5 ? "150,225,185" : "195,245,210";
      gr.addColorStop(0, `rgba(${c},${0.25 + r() * 0.25})`);
      gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr;
      for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) g.fillRect(x - rad + ox, y - rad + oy, rad * 2, rad * 2);
    }
    // גרגרי סוכר
    for (let i = 0; i < 16000; i++) {
      const v = r();
      g.fillStyle = v < 0.45 ? `rgba(255,255,255,${0.2 + r() * 0.5})` : v < 0.9 ? `rgba(60,150,110,${0.08 + r() * 0.14})` : `rgba(255,255,255,0.9)`;
      g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
    }
    // סוכריות צבעוניות (sprinkles)
    g.lineCap = "round";
    for (let i = 0; i < 90; i++) {
      g.strokeStyle = SPR[Math.floor(r() * SPR.length)];
      g.lineWidth = 3.2;
      const x = r() * w, y = r() * h, a = r() * Math.PI;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9); g.stroke();
    }
  });

/** שביל מרוצף עוגיות ביסקוויט עם "רובה" של קרם ורוד */
export const sgPath = () =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(9);
    g.fillStyle = "#ffc9dc";
    g.fillRect(0, 0, w, h);
    const n = 4, s = w / n;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const ox = x * s + ((y % 2) * s) / 2;
        for (const dx of [0, -w]) {
          const cx = ox + dx + s / 2, cy = y * s + s / 2, rad = s * 0.43;
          const tone = 205 + Math.floor(r() * 25);
          g.fillStyle = `rgb(${tone},${tone - 55},${tone - 120})`;
          g.beginPath();
          g.roundRect(cx - rad, cy - rad, rad * 2, rad * 2, 22);
          g.fill();
          const gr = g.createRadialGradient(cx - 10, cy - 10, 4, cx, cy, rad * 1.3);
          gr.addColorStop(0, "rgba(255,240,200,0.45)");
          gr.addColorStop(1, "rgba(120,60,10,0.35)");
          g.fillStyle = gr;
          g.beginPath(); g.roundRect(cx - rad, cy - rad, rad * 2, rad * 2, 22); g.fill();
          // חורי ביסקוויט
          g.fillStyle = "rgba(110,55,15,0.55)";
          for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { g.beginPath(); g.arc(cx - 26 + a * 26, cy - 26 + b * 26, 3.2, 0, Math.PI * 2); g.fill(); }
          g.strokeStyle = "rgba(255,235,190,0.6)";
          g.lineWidth = 3;
          g.beginPath(); g.roundRect(cx - rad + 6, cy - rad + 6, rad * 2 - 12, rad * 2 - 12, 16); g.stroke();
        }
      }
    for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(90,40,10,${r() * 0.12})`; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
  });

/** בצק ג'ינג'ר אפוי: חום זהוב, נקבוביות וכתמי אפייה */
export const sgGinger = () =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(21);
    g.fillStyle = "#b86b32";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      const x = r() * w, y = r() * h, rad = 30 + r() * 90;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      const dark = r() < 0.5;
      gr.addColorStop(0, dark ? `rgba(120,60,20,${0.2 + r() * 0.2})` : `rgba(215,140,70,${0.2 + r() * 0.2})`);
      gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr;
      for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) g.fillRect(x - rad + ox, y - rad + oy, rad * 2, rad * 2);
    }
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = `rgba(70,30,8,${0.2 + r() * 0.35})`;
      const rr = 0.8 + r() * 2.2;
      g.beginPath(); g.arc(r() * w, r() * h, rr, 0, Math.PI * 2); g.fill();
    }
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(240,180,110,${r() * 0.18})`; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
  });

/** רעפי ציפוי מעוגלים (קשקשים) בפסטל עם קצה לבן */
export const sgRoof = (base: string) =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(5);
    g.fillStyle = "#fff";
    g.fillRect(0, 0, w, h);
    const sw = 64, sh = 48;
    for (let row = -1; row < h / sh + 1; row++)
      for (let c = -1; c < w / sw + 1; c++) {
        const x = c * sw + (row % 2 ? sw / 2 : 0), y = row * sh;
        const gr = g.createLinearGradient(0, y, 0, y + sh + 16);
        gr.addColorStop(0, base);
        gr.addColorStop(1, "rgba(0,0,0,0.25)");
        g.fillStyle = base;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + sh * 0.6); g.arc(x + sw / 2, y + sh * 0.6, sw / 2, Math.PI, 0, true); g.lineTo(x + sw, y); g.closePath(); g.fill();
        g.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.08})`;
        g.fill();
        g.strokeStyle = "rgba(255,255,255,0.9)";
        g.lineWidth = 5;
        g.beginPath(); g.arc(x + sw / 2, y + sh * 0.6, sw / 2 - 3, Math.PI * 0.05, Math.PI * 0.95); g.stroke();
      }
  });

/** וופל: משבצות שקועות */
export const sgWafer = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(8);
    g.fillStyle = "#e8b872";
    g.fillRect(0, 0, w, h);
    const s = 32;
    for (let y = 0; y < h; y += s)
      for (let x = 0; x < w; x += s) {
        g.fillStyle = "#c98f4a";
        g.fillRect(x + 6, y + 6, s - 12, s - 12);
        g.fillStyle = "rgba(90,50,10,0.3)";
        g.fillRect(x + 6, y + 6, s - 12, 3);
        g.fillRect(x + 6, y + 6, 3, s - 12);
        g.fillStyle = "rgba(255,230,180,0.35)";
        g.fillRect(x + 6, y + s - 9, s - 12, 3);
      }
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(120,70,20,${r() * 0.15})`; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
  });

/** ספירלת לוליפופ (מרכז הטקסטורה = מרכז הדיסק) */
export const sgSwirl = (a: string, b: string, c = "#ffffff") =>
  makeTex(512, 512, (g, w, h) => {
    const cx = w / 2, cy = h / 2;
    g.fillStyle = c;
    g.fillRect(0, 0, w, h);
    const arms = 5;
    for (let i = 0; i < arms; i++) {
      g.fillStyle = i % 2 ? a : b;
      if (arms % 2 && i === arms - 1) g.fillStyle = c === "#ffffff" ? a : c;
      g.beginPath();
      const a0 = (i / arms) * Math.PI * 2;
      for (let t = 0; t <= 1.001; t += 0.02) {
        const rr = t * w * 0.52, ang = a0 + t * Math.PI * 2.4;
        g.lineTo(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr);
      }
      for (let t = 1; t >= 0; t -= 0.02) {
        const rr = t * w * 0.52, ang = a0 + t * Math.PI * 2.4 + (Math.PI * 2) / arms / 2.2;
        g.lineTo(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr);
      }
      g.closePath(); g.fill();
    }
    // ברק
    const gr = g.createRadialGradient(cx - 90, cy - 90, 5, cx - 60, cy - 60, 180);
    gr.addColorStop(0, "rgba(255,255,255,0.55)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });

/** פסי מקל סוכר אלכסוניים (על צינור = ספירלה) */
export const sgStripe = (a: string, b = "#ffffff", thin?: string) =>
  makeTex(256, 256, (g, w, h) => {
    g.fillStyle = b;
    g.fillRect(0, 0, w, h);
    const band = (col: string, off: number, wd: number) => {
      g.fillStyle = col;
      for (let i = -2 * h; i < 2 * w; i += 128) {
        g.beginPath();
        g.moveTo(i + off, 0); g.lineTo(i + off + wd, 0); g.lineTo(i + off + wd + h, h); g.lineTo(i + off + h, h);
        g.closePath(); g.fill();
      }
    };
    band(a, 0, 44);
    if (thin) band(thin, 72, 14);
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "rgba(255,255,255,0.0)");
    gr.addColorStop(0.5, "rgba(255,255,255,0.18)");
    gr.addColorStop(1, "rgba(255,255,255,0.0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });

/** שוקולד מבריק עם מערבולות עדינות */
export const sgChoc = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(14);
    g.fillStyle = "#5a2f1a";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) {
      g.strokeStyle = r() < 0.5 ? "rgba(120,70,40,0.25)" : "rgba(40,18,8,0.3)";
      g.lineWidth = 4 + r() * 10;
      g.beginPath();
      const x = r() * w, y = r() * h;
      g.moveTo(x, y);
      g.bezierCurveTo(x + (r() - 0.5) * 200, y + (r() - 0.5) * 80, x + (r() - 0.5) * 200, y + (r() - 0.5) * 80, x + (r() - 0.5) * 160, y + (r() - 0.5) * 60);
      g.stroke();
    }
  });

/** ציפוי דונאט עם סוכריות צבעוניות */
export const sgIcing = (base: string, seed = 1) =>
  makeTex(512, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    g.lineCap = "round";
    for (let i = 0; i < 420; i++) {
      g.strokeStyle = SPR[Math.floor(r() * SPR.length)];
      g.lineWidth = 5;
      const x = r() * w, y = h * 0.12 + r() * h * 0.76, a = r() * Math.PI;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 11, y + Math.sin(a) * 11); g.stroke();
    }
  });

/** שכבות הר ממתקים: פסים גליים בפסטל */
export const sgMountain = (cols: string[], seed = 2) =>
  makeTex(256, 512, (g, w, h) => {
    const r = rng(seed);
    const n = 9;
    for (let i = 0; i < n; i++) {
      g.fillStyle = cols[i % cols.length];
      const y0 = (i / n) * h;
      g.beginPath();
      g.moveTo(0, h);
      g.lineTo(0, y0);
      const ph = r() * 6;
      for (let x = 0; x <= w; x += 8) g.lineTo(x, y0 + Math.sin(x / 40 * Math.PI + ph) * 10);
      g.lineTo(w, h);
      g.closePath();
      g.fill();
    }
    for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.3})`; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
  });

/** שכבת אובך פסטלית לשמיים (שקופה למעלה) */
export const sgHaze = () =>
  makeTex(64, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "rgba(255,210,235,0)");
    gr.addColorStop(0.45, "rgba(255,214,236,0.15)");
    gr.addColorStop(0.72, "rgba(255,212,234,0.55)");
    gr.addColorStop(0.86, "rgba(255,226,240,0.85)");
    gr.addColorStop(1, "rgba(255,232,244,0.95)");
    g.clearRect(0, 0, w, h);
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });

/** שלט הכניסה */
export const sgSign = () =>
  makeTex(512, 128, (g, w, h) => {
    g.fillStyle = "#ff8fbf";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#fff2f8";
    g.beginPath(); g.roundRect(10, 10, w - 20, h - 20, 40); g.fill();
    g.fillStyle = "#ff4f8b";
    g.font = "bold 76px 'Arial Rounded MT Bold', 'M PLUS Rounded 1c', Arial, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.lineWidth = 10;
    g.strokeStyle = "#ffffff";
    g.strokeText("SUGARLAND", w / 2, h / 2 + 4);
    g.fillText("SUGARLAND", w / 2, h / 2 + 4);
    const r = rng(4);
    for (let i = 0; i < 26; i++) {
      g.fillStyle = SPR[i % SPR.length];
      const x = 24 + r() * (w - 48), y = r() < 0.5 ? 20 + r() * 8 : h - 28 + r() * 8;
      g.beginPath(); g.arc(x, y, 3.5, 0, Math.PI * 2); g.fill();
    }
  });

/** סוכר מגורען לבן־אפור (מוכפל בצבע של כל סוכריית ג'לי) */
export const sgSugar = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(17);
    g.fillStyle = "#e9e9e9";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 7000; i++) {
      const v = r();
      g.fillStyle = v < 0.5 ? `rgba(255,255,255,${0.4 + r() * 0.6})` : `rgba(150,150,150,${0.1 + r() * 0.25})`;
      g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
    }
  });

/** תות: אדום עם זרעים */
export const sgStrawberry = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(6);
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "#ff5a5f");
    gr.addColorStop(1, "#c8102e");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    for (let y = 8; y < h; y += 20)
      for (let x = (y / 20) % 2 ? 10 : 0; x < w; x += 20) {
        g.fillStyle = "rgba(120,0,10,0.5)";
        g.beginPath(); g.ellipse(x, y, 5, 6, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#ffe08a";
        g.beginPath(); g.ellipse(x, y - 1, 2, 3, 0, 0, Math.PI * 2); g.fill();
      }
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.12})`; g.fillRect(r() * w, r() * h, 2, 2); }
  });

/** פפרמינט (סוכריית מנטה עגולה): גלגל אדום־לבן, מרכז = מרכז הטקסטורה */
export const sgPeppermint = () =>
  makeTex(256, 256, (g, w, h) => {
    const cx = w / 2, cy = h / 2;
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {
      g.fillStyle = "#e8173a";
      g.beginPath();
      const a = (i / 8) * Math.PI * 2;
      g.moveTo(cx, cy);
      g.arc(cx, cy, w * 0.5, a, a + 0.42);
      g.closePath(); g.fill();
    }
    g.fillStyle = "#ffffff";
    g.beginPath(); g.arc(cx, cy, 16, 0, Math.PI * 2); g.fill();
  });

export { rng as sgRng };

/** קרם חלק (עוגה/ציפוי) עם מריחות עדינות */
export const sgCream = (base = "#fffaf3", seed = 31) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      g.strokeStyle = r() < 0.5 ? "rgba(255,255,255,0.35)" : "rgba(200,170,140,0.10)";
      g.lineWidth = 6 + r() * 14;
      const x = r() * w, y = r() * h;
      g.beginPath();
      g.moveTo(x - 60, y);
      g.quadraticCurveTo(x, y + (r() - 0.5) * 30, x + 60, y + (r() - 0.5) * 10);
      g.stroke();
    }
    for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(190,160,130,${r() * 0.08})`; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
  });

/** ציפוי פונדנט/פרוסטינג צבעוני (קרקע ורודה) עם סוכריות צבעוניות */
export const sgFrosting = (base: string, seed = 12, sprinkles = 60) =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      g.strokeStyle = r() < 0.5 ? "rgba(255,255,255,0.22)" : "rgba(120,40,70,0.07)";
      g.lineWidth = 8 + r() * 22;
      const x = r() * w, y = r() * h, a = r() * 6;
      g.beginPath();
      g.arc(x, y, 20 + r() * 60, a, a + 1.5 + r() * 2);
      g.stroke();
    }
    for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.3})`; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
    g.lineCap = "round";
    for (let i = 0; i < sprinkles; i++) {
      g.strokeStyle = SPR[Math.floor(r() * SPR.length)];
      g.lineWidth = 3.4;
      const x = r() * w, y = r() * h, a = r() * Math.PI;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 10, y + Math.sin(a) * 10); g.stroke();
    }
  });

/** צמר גפן מתוק: סיבים רכים */
export const sgCotton = (base: string, seed = 44) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      g.strokeStyle = r() < 0.6 ? `rgba(255,255,255,${0.1 + r() * 0.25})` : `rgba(160,60,120,${0.05 + r() * 0.08})`;
      g.lineWidth = 1 + r() * 2.5;
      const x = r() * w, y = r() * h;
      g.beginPath();
      g.moveTo(x, y);
      g.bezierCurveTo(x + (r() - 0.5) * 60, y + (r() - 0.5) * 60, x + (r() - 0.5) * 60, y + (r() - 0.5) * 60, x + (r() - 0.5) * 50, y + (r() - 0.5) * 50);
      g.stroke();
    }
  });

/** בצק דונאט מטוגן */
export const sgDough = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(52);
    g.fillStyle = "#d89a55";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      const x = r() * w, y = r() * h, rad = 20 + r() * 50;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, r() < 0.5 ? "rgba(170,100,40,0.35)" : "rgba(240,190,120,0.35)");
      gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(120,60,20,${r() * 0.25})`; g.beginPath(); g.arc(r() * w, r() * h, r() * 1.8, 0, 6.3); g.fill(); }
  });

/** טבלת שוקולד עם קוביות */
export const sgChocBar = (base = "#4a2412", seed = 3) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    const n = 4, s = w / n;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const x0 = x * s + 6, y0 = y * s + 6, ss = s - 12;
        g.fillStyle = "rgba(255,210,170,0.13)";
        g.fillRect(x0, y0, ss, 5); g.fillRect(x0, y0, 5, ss);
        g.fillStyle = "rgba(0,0,0,0.30)";
        g.fillRect(x0, y0 + ss - 5, ss, 5); g.fillRect(x0 + ss - 5, y0, 5, ss);
        g.fillStyle = "rgba(255,255,255,0.05)";
        g.fillRect(x0 + 8, y0 + 8, ss - 16, ss - 16);
      }
    for (let i = 0; i < 600; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.12})`; g.fillRect(r() * w, r() * h, 2, 2); }
  });

/** חזית לוקר פסטלי: פתחי אוורור, ידית, מספר ומדבקות סוכריות */
export const sgLocker = (base: string, num: string, seed = 7) =>
  makeTex(128, 384, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(0,0,0,0.25)";
    g.lineWidth = 4;
    g.strokeRect(6, 6, w - 12, h - 12);
    g.strokeStyle = "rgba(255,255,255,0.45)";
    g.lineWidth = 2;
    g.strokeRect(10, 10, w - 20, h - 20);
    for (const y0 of [26, 300]) for (let i = 0; i < 5; i++) {
      g.fillStyle = "rgba(0,0,0,0.45)";
      g.fillRect(30, y0 + i * 10, w - 60, 4);
      g.fillStyle = "rgba(255,255,255,0.5)";
      g.fillRect(30, y0 + i * 10 + 4, w - 60, 1.5);
    }
    g.fillStyle = "#e9e9ee";
    g.fillRect(w - 34, 170, 12, 44);
    g.fillStyle = "rgba(0,0,0,0.35)";
    g.fillRect(w - 34, 210, 12, 4);
    g.fillStyle = "#ffffff";
    g.beginPath(); g.roundRect(w / 2 - 22, 92, 44, 26, 6); g.fill();
    g.fillStyle = "#555";
    g.font = "bold 20px Arial, sans-serif";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(num, w / 2, 106);
    for (let i = 0; i < 4; i++) {
      g.fillStyle = SPR[Math.floor(r() * SPR.length)];
      g.beginPath(); g.arc(24 + r() * (w - 48), 140 + r() * 140, 5 + r() * 7, 0, 6.3); g.fill();
    }
    for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.07})`; g.fillRect(r() * w, r() * h, 2, 2); }
  });

/** מקרון: קליפה עם גרגרים עדינים */
export const sgMacaron = (base: string, seed = 5) =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) { g.fillStyle = r() < 0.5 ? `rgba(255,255,255,${r() * 0.18})` : `rgba(0,0,0,${r() * 0.06})`; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
  });
