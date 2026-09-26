// Brick Loft textures — all drawn on 2D canvases (each generator well under 60 ms).
import { makeTex } from "../../textures";
import { rng, specks, blotches, shade, crack, SANS } from "./coldstorage";

/** old red brick, running bond, recessed mortar, soot + efflorescence. 512 px = 1.2 m (unit 1.2):
 *  5 bricks per row (0.24 m pitch), 16 courses (0.075 m). `pal` = brick colours, `mortar` colour. */
export const blBrick = (pal: string[], mortar = "#b8ab98", seed = 3, soot = 1, size = 512) =>
  makeTex(size, size, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = mortar;
    g.fillRect(0, 0, w, h);
    specks(g, w, h, r, 4000, 0.12);
    const bw = w / 5, bh = h / 16;
    for (let j = 0; j < 16; j++) {
      const off = j % 2 ? bw / 2 : 0;
      for (let i = -1; i < 6; i++) {
        const x = i * bw + off, y = j * bh;
        const c = pal[Math.floor(r() * pal.length)];
        const f = 0.82 + r() * 0.3;
        g.fillStyle = shade(c, f);
        const m = w / 512; g.fillRect(x + 3 * m, y + 3 * m, bw - 6 * m, bh - 5 * m);
        // face variation: darker fire-flash at one end, lighter edge on top
        const gr = g.createLinearGradient(x, 0, x + bw, 0);
        const d = r() < 0.5;
        gr.addColorStop(0, `rgba(30,10,5,${d ? 0.25 * r() : 0})`);
        gr.addColorStop(1, `rgba(30,10,5,${d ? 0 : 0.25 * r()})`);
        g.fillStyle = gr;
        g.fillRect(x + 3, y + 3, bw - 6, bh - 5);
        g.fillStyle = "rgba(255,240,220,0.13)";
        g.fillRect(x + 3, y + 3, bw - 6, 2);
        g.fillStyle = "rgba(0,0,0,0.28)";
        g.fillRect(x + 3, y + bh - 3, bw - 6, 2);
        // chips / pits
        for (let q = 0; q < 5; q++) { g.fillStyle = `rgba(0,0,0,${0.12 + r() * 0.2})`; g.fillRect(x + 4 + r() * (bw - 10), y + 4 + r() * (bh - 9), 1 + r() * 3, 1 + r() * 2); }
        if (r() < 0.06) { g.fillStyle = "rgba(60,45,35,0.45)"; g.fillRect(x + 3 + r() * bw * 0.6, y + 3, 8 + r() * 14, bh - 6); } // broken corner
      }
    }
    specks(g, w, h, r, 6000, 0.1);
    blotches(g, w, h, r, 16 * soot, 0.12, 70, "25,15,10"); // soot
    blotches(g, w, h, r, 10, 0.1, 60, "235,228,210"); // efflorescence
    for (let i = 0; i < 4; i++) crack(g, r, r() * w, r() * h, 8 + r() * 10, 0.25);
  });

/** wide oak floor boards, staggered joints; 512 px = 2.4 m (12 boards of 0.2 m) */
export const blPlanks = (base = "#8a5a34", seed = 5) =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(seed);
    const n = 12, pw = h / n;
    g.fillStyle = shade(base, 0.6);
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      const y = i * pw;
      let x = -r() * w * 0.5;
      while (x < w) {
        const len = w * (0.35 + r() * 0.5);
        const c = shade(base, 0.88 + r() * 0.2);
        g.fillStyle = c;
        g.fillRect(x + 1, y + 1, len - 2, pw - 2);
        // grain
        for (let k = 0; k < 9; k++) {
          g.strokeStyle = `rgba(50,25,10,${0.06 + r() * 0.12})`;
          g.lineWidth = 0.6 + r() * 1.2;
          g.beginPath();
          const gy = y + 2 + r() * (pw - 4);
          g.moveTo(x, gy);
          g.bezierCurveTo(x + len * 0.3, gy + (r() - 0.5) * 6, x + len * 0.7, gy + (r() - 0.5) * 6, x + len, gy + (r() - 0.5) * 3);
          g.stroke();
        }
        if (r() < 0.35) { // knot
          const kx = x + r() * len, ky = y + pw * (0.3 + r() * 0.4);
          g.fillStyle = "rgba(55,28,12,0.5)"; g.beginPath(); g.ellipse(kx, ky, 4 + r() * 5, 2 + r() * 2, 0, 0, Math.PI * 2); g.fill();
        }
        // nail heads
        g.fillStyle = "rgba(25,20,18,0.6)";
        g.fillRect(x + 6, y + pw * 0.3, 2, 2); g.fillRect(x + 6, y + pw * 0.7, 2, 2);
        x += len;
      }
      g.fillStyle = "rgba(0,0,0,0.45)";
      g.fillRect(0, y, w, 1.5);
    }
    blotches(g, w, h, r, 14, 0.08, 80, "30,15,5");
    blotches(g, w, h, r, 8, 0.06, 60, "255,240,210");
    // scuffs
    for (let i = 0; i < 30; i++) { g.strokeStyle = `rgba(230,220,200,${0.04 + r() * 0.06})`; g.lineWidth = 1; g.beginPath(); const x = r() * w, y = r() * h; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 50, y + (r() - 0.5) * 10); g.stroke(); }
  });

/** rough sawn timber (beams): long grain, checks (cracks), dark stain; 256 px */
export const blTimber = (base = "#5a3a22", seed = 7) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let k = 0; k < 70; k++) {
      g.strokeStyle = r() < 0.5 ? `rgba(20,10,5,${0.08 + r() * 0.14})` : `rgba(200,150,100,${0.04 + r() * 0.06})`;
      g.lineWidth = 0.6 + r() * 2;
      g.beginPath();
      const y = r() * h;
      g.moveTo(0, y);
      g.bezierCurveTo(w * 0.3, y + (r() - 0.5) * 14, w * 0.6, y + (r() - 0.5) * 14, w, y);
      g.stroke();
    }
    for (let i = 0; i < 6; i++) { g.fillStyle = "rgba(10,5,2,0.55)"; g.fillRect(r() * w, r() * h, 30 + r() * 80, 1.5); }
    for (let i = 0; i < 3; i++) { const x = r() * w, y = r() * h; g.fillStyle = "rgba(30,15,8,0.6)"; g.beginPath(); g.ellipse(x, y, 7, 4, 0, 0, Math.PI * 2); g.fill(); }
    specks(g, w, h, r, 3000, 0.08);
    blotches(g, w, h, r, 8, 0.1, 50, "10,5,0");
  });

/** white glazed subway tile 0.15 × 0.075 m with grey grout; 256 px = 0.6 m */
export const blSubway = (seed = 9) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#b9b6ae";
    g.fillRect(0, 0, w, h);
    const tw = w / 4, th = h / 8;
    for (let j = 0; j < 8; j++) for (let i = -1; i < 5; i++) {
      const x = i * tw + (j % 2 ? tw / 2 : 0), y = j * th;
      g.fillStyle = shade("#f2f0ea", 0.95 + r() * 0.06);
      g.fillRect(x + 2, y + 2, tw - 3, th - 3);
      g.fillStyle = "rgba(255,255,255,0.5)"; g.fillRect(x + 3, y + 3, tw - 6, 2);
      g.fillStyle = "rgba(0,0,0,0.08)"; g.fillRect(x + 3, y + th - 4, tw - 6, 2);
    }
    blotches(g, w, h, r, 6, 0.05, 40, "120,110,90");
    specks(g, w, h, r, 800, 0.04);
  });

/** small white hex floor tiles with a few black ones; 256 px = 0.5 m */
export const blHex = (seed = 11) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#8a8780";
    g.fillRect(0, 0, w, h);
    const s = 16, dx = s * Math.sqrt(3), dy = s * 1.5;
    const rows = Math.round(h / dy), cols = Math.round(w / dx);
    const sx = w / cols, sy = h / rows;
    for (let j = -1; j <= rows; j++) for (let i = -1; i <= cols; i++) {
      const cx = i * sx + (j % 2 ? sx / 2 : 0), cy = j * sy;
      g.fillStyle = r() < 0.07 ? "#2a2a2c" : shade("#efede6", 0.93 + r() * 0.08);
      g.beginPath();
      for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + (k * Math.PI) / 3; g.lineTo(cx + Math.cos(a) * (s - 1.5), cy + Math.sin(a) * (s - 1.5)); }
      g.fill();
    }
    blotches(g, w, h, r, 8, 0.07, 50, "90,80,60");
  });

/** brown aged leather with creases */
export const blLeather = (base = "#6a3a20", seed = 13) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 24, 0.18, 40, "20,8,2");
    blotches(g, w, h, r, 16, 0.12, 30, "220,160,110");
    specks(g, w, h, r, 2500, 0.1);
    for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(20,8,2,${0.1 + r() * 0.2})`; g.lineWidth = 0.8; g.beginPath(); const x = r() * w, y = r() * h; g.moveTo(x, y); g.quadraticCurveTo(x + (r() - 0.5) * 30, y + (r() - 0.5) * 30, x + (r() - 0.5) * 40, y + (r() - 0.5) * 40); g.stroke(); }
  });

/** woven fabric (linen / wool) — grey-ish, tinted by material colour */
export const blWeave = (seed = 15, coarse = 4) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#d8d8d8";
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += coarse) { g.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.06})`; g.fillRect(0, y, w, 1); }
    for (let x = 0; x < w; x += coarse) { g.fillStyle = `rgba(255,255,255,${0.05 + r() * 0.08})`; g.fillRect(x, 0, 1, h); }
    specks(g, w, h, r, 5000, 0.1);
    blotches(g, w, h, r, 8, 0.06, 50);
  });

/** dusk city view seen through the windows (emissive): gradient sky, brick buildings with lit windows, water tank */
export const blView = (seed = 17) =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(seed);
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#4b6a95"); sky.addColorStop(0.45, "#c98d7a"); sky.addColorStop(0.7, "#f2b77a"); sky.addColorStop(1, "#f6d3a2");
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    // far skyline
    let x = 0;
    while (x < w) { const bw = 20 + r() * 50, bh = h * (0.2 + r() * 0.3); g.fillStyle = "#6a5a6e"; g.fillRect(x, h - bh, bw, bh); x += bw; }
    // near buildings (brick) with lit windows
    x = -10;
    while (x < w) {
      const bw = 60 + r() * 90, bh = h * (0.3 + r() * 0.35);
      g.fillStyle = shade("#6b3a2c", 0.7 + r() * 0.4);
      g.fillRect(x, h - bh, bw, bh);
      g.fillStyle = "rgba(0,0,0,0.3)"; g.fillRect(x, h - bh, bw, 5);
      for (let wy = h - bh + 14; wy < h - 10; wy += 22) for (let wx = x + 8; wx < x + bw - 14; wx += 18) {
        const lit = r() < 0.35;
        g.fillStyle = lit ? (r() < 0.5 ? "#ffd48a" : "#ffe9c0") : "#2c2a33";
        g.fillRect(wx, wy, 9, 13);
      }
      if (r() < 0.35) { // rooftop water tank
        const tx = x + bw * 0.3, ty = h - bh;
        g.fillStyle = "#3a2a22"; g.fillRect(tx, ty - 34, 30, 26);
        g.beginPath(); g.moveTo(tx - 3, ty - 34); g.lineTo(tx + 15, ty - 48); g.lineTo(tx + 33, ty - 34); g.fill();
        g.fillRect(tx + 3, ty - 8, 3, 8); g.fillRect(tx + 24, ty - 8, 3, 8);
      }
      x += bw + 4;
    }
  });

/** paint splatter decal (transparent) for the studio floor / drop cloth */
export const blSplat = (seed = 19) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.clearRect(0, 0, w, h);
    const pal = ["220,60,50", "40,90,190", "250,200,40", "40,150,90", "240,240,235", "30,30,30", "230,120,40"];
    for (let i = 0; i < 26; i++) {
      const c = pal[Math.floor(r() * pal.length)], x = 30 + r() * (w - 60), y = 30 + r() * (h - 60), s = 3 + r() * 12;
      g.fillStyle = `rgba(${c},${0.7 + r() * 0.3})`;
      g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill();
      for (let k = 0; k < 7; k++) { const a = r() * Math.PI * 2, d = s + r() * s * 2.5; g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 0.8 + r() * 2.5, 0, Math.PI * 2); g.fill(); }
    }
  });

/** soft grime / dust gradient (transparent), for wall bottoms and corners */
export const blGrime = (seed = 21) =>
  makeTex(256, 128, (g, w, h) => {
    const r = rng(seed);
    const gr = g.createLinearGradient(0, h, 0, 0);
    gr.addColorStop(0, "rgba(35,25,15,0.55)"); gr.addColorStop(0.35, "rgba(35,25,15,0.2)"); gr.addColorStop(1, "rgba(35,25,15,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 20; i++) { const x = r() * w; g.fillStyle = `rgba(35,25,15,${0.05 + r() * 0.1})`; g.fillRect(x, h * (0.3 + r() * 0.5), 2 + r() * 5, h); }
  });

/** book spines strip: one row of spines, 256 × 64, colours + gold bands */
export const blSpines = (seed = 23) =>
  makeTex(512, 64, (g, w, h) => {
    const r = rng(seed);
    const pal = ["#7a1f1f", "#1f3a5a", "#2f5a3a", "#caa56a", "#3a2a22", "#9a6a3a", "#e8e0cc", "#5a2a4a", "#2a2a2a", "#b0432a", "#46708a"];
    let x = 0;
    while (x < w) {
      const bw = 8 + r() * 16;
      const c = pal[Math.floor(r() * pal.length)];
      g.fillStyle = c; g.fillRect(x, 0, bw - 1, h);
      g.fillStyle = "rgba(0,0,0,0.3)"; g.fillRect(x + bw - 2, 0, 1, h);
      g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(x + 1, 0, 2, h);
      if (r() < 0.6) { g.fillStyle = "rgba(220,180,90,0.8)"; g.fillRect(x + 1, h * 0.15, bw - 3, 2); g.fillRect(x + 1, h * 0.8, bw - 3, 2); }
      if (r() < 0.5) { g.fillStyle = "rgba(240,230,200,0.7)"; g.fillRect(x + bw * 0.3, h * 0.3, bw * 0.3, h * 0.35); }
      x += bw;
    }
  });

/** vinyl record sleeve row / crate front etc.: generic label plate */
export const blLabel = (text: string, bg = "#e8e0cc", fg = "#2a2018", w = 256, h = 96) =>
  makeTex(w, h, (g) => {
    const r = rng(text.length * 7 + 3);
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = fg; g.lineWidth = 3; g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle";
    let size = h * 0.42;
    g.font = `bold ${size}px ${SANS}`;
    const mw = g.measureText(text).width;
    if (mw > w * 0.86) { size *= (w * 0.86) / mw; g.font = `bold ${size}px ${SANS}`; }
    g.fillText(text, w / 2, h / 2 + 2);
    specks(g, w, h, r, 600, 0.12);
    blotches(g, w, h, r, 4, 0.1, h * 0.4, "80,60,40");
  });

/** painted steel window frame colour sheet: black with rust bleed (tint via colour) */
export const blIron = (seed = 25) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#3a3a3a";
    g.fillRect(0, 0, w, h);
    specks(g, w, h, r, 1500, 0.12);
    blotches(g, w, h, r, 10, 0.12, 40, "120,60,30");
    for (let i = 0; i < 16; i++) { const x = r() * w, y = r() * h; g.fillStyle = `rgba(120,60,25,${0.2 + r() * 0.3})`; g.fillRect(x, y, 2 + r() * 3, 2 + r() * 3); }
  });

/** marble-ish countertop (white with grey veins) */
export const blMarble = (seed = 27) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#ecebe6";
    g.fillRect(0, 0, w, h);
    blotches(g, w, h, r, 12, 0.06, 60, "150,150,150");
    for (let i = 0; i < 9; i++) {
      g.strokeStyle = `rgba(110,110,115,${0.15 + r() * 0.3})`;
      g.lineWidth = 0.8 + r() * 1.8;
      g.beginPath();
      let x = r() * w, y = 0;
      g.moveTo(x, y);
      while (y < h) { x += (r() - 0.5) * 30; y += 10 + r() * 20; g.lineTo(x, y); }
      g.stroke();
    }
  });
