// Canvas textures for the indoor Swimming Pool hall: pool mosaic, anti-slip deck tiles with grout grime and water
// stains, glazed wall tiles, acoustic ceiling, water caustics, graffiti mural, lockers, LED scoreboard, clock face,
// rubber mat, towel stripes and short English signs.
import { makeTex } from "../../textures";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
type C2 = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const SANS = `"Arial Black", "Helvetica Neue", Arial, "DejaVu Sans", sans-serif`;

function blotch(g: C2, w: number, h: number, r: () => number, n: number, a: number, col: string, max = 50) {
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h, rad = 6 + r() * max;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, `rgba(${col},${a * (0.4 + r() * 0.6)})`);
    gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
}
function speck(g: C2, w: number, h: number, r: () => number, n: number, a = 0.15) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = r() < 0.5 ? `rgba(0,0,0,${r() * a})` : `rgba(255,255,255,${r() * a})`;
    g.fillRect(r() * w, r() * h, 1 + r(), 1 + r());
  }
}
const hex = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];

/** pool mosaic: n×n small glass tiles with grout, per-tile tint variation (1 texture ≈ 0.8 m) */
export const poMosaic = (a: string, b: string, n = 32, seed = 3, grime = 0.1) =>
  makeTex(256, 256, (g, w) => {
    const r = rng(seed);
    const A = hex(a), B = hex(b);
    g.fillStyle = "#9fb3b8";
    g.fillRect(0, 0, w, w);
    const s = w / n;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const t = r();
        const m = t < 0.7 ? 0 : t < 0.93 ? 0.5 : 1;
        const v = (r() - 0.5) * 18;
        const c = A.map((q, i) => Math.round(q + (B[i] - q) * m + v));
        g.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
        g.fillRect(x * s + 0.7, y * s + 0.7, s - 1.4, s - 1.4);
        g.fillStyle = "rgba(255,255,255,0.18)";
        g.fillRect(x * s + 1, y * s + 1, s - 3, 1);
      }
    blotch(g, w, w, r, 10, grime, "40,70,60", 60);
  });

/** deck floor: 12.5 cm anti-slip tiles (8×8 = 1 m), grey grout with grime, water stains and wet patches */
export const poDeck = (seed = 7) =>
  makeTex(256, 256, (g, w) => {
    const r = rng(seed);
    g.fillStyle = "#8f9496";
    g.fillRect(0, 0, w, w);
    const s = w / 8;
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        const v = Math.round((r() - 0.5) * 12);
        g.fillStyle = `rgb(${232 + v},${234 + v},${233 + v})`;
        g.fillRect(x * s + 1.5, y * s + 1.5, s - 3, s - 3);
        // anti-slip dimples
        for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.05})`; g.fillRect(x * s + 3 + r() * (s - 6), y * s + 3 + r() * (s - 6), 1.5, 1.5); }
        if (r() < 0.06) { g.fillStyle = "rgba(70,60,40,0.08)"; g.fillRect(x * s + 1.5, y * s + 1.5, s - 3, s - 3); }
      }
    // dark grout grime
    g.fillStyle = "rgba(60,62,58,0.35)";
    for (let i = 0; i <= 8; i++) { g.fillRect(i * s - 1, 0, 2, w); g.fillRect(0, i * s - 1, w, 2); }
    blotch(g, w, w, r, 14, 0.12, "120,110,80", 45);
    blotch(g, w, w, r, 8, 0.1, "60,80,90", 60);
    speck(g, w, w, r, 600, 0.08);
  });

/** glazed wall tiles 15 cm (8×8 ≈ 1.2 m) with slight colour variation, grout and limescale streaks */
export const poWallTile = (base = "#f2f3f0", seed = 11, band = "") =>
  makeTex(256, 256, (g, w) => {
    const r = rng(seed);
    const C = hex(base);
    g.fillStyle = "#b9bdb8";
    g.fillRect(0, 0, w, w);
    const s = w / 8;
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        const v = Math.round((r() - 0.5) * 10);
        let c = C;
        if (band && (y === 3 || (y === 4 && r() < 0.15))) c = hex(band);
        g.fillStyle = `rgb(${c[0] + v},${c[1] + v},${c[2] + v})`;
        g.fillRect(x * s + 1.2, y * s + 1.2, s - 2.4, s - 2.4);
        const gr = g.createLinearGradient(x * s, y * s, x * s + s, y * s + s);
        gr.addColorStop(0, "rgba(255,255,255,0.22)");
        gr.addColorStop(0.5, "rgba(255,255,255,0)");
        g.fillStyle = gr;
        g.fillRect(x * s + 1.2, y * s + 1.2, s - 2.4, s - 2.4);
      }
    for (let i = 0; i < 10; i++) {
      const x = r() * w, len = 20 + r() * 90;
      const gr = g.createLinearGradient(0, w - len, 0, w);
      gr.addColorStop(0, "rgba(150,140,110,0)");
      gr.addColorStop(1, "rgba(150,140,110,0.18)");
      g.fillStyle = gr;
      g.fillRect(x, w - len, 2 + r() * 5, len);
    }
  });

/** acoustic perforated ceiling panels (1 texture = 2.4 m, 4×4 panels) */
export const poCeiling = () =>
  makeTex(256, 256, (g, w) => {
    const r = rng(19);
    g.fillStyle = "#6c7176";
    g.fillRect(0, 0, w, w);
    const s = w / 4;
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        const v = Math.round((r() - 0.5) * 10);
        g.fillStyle = `rgb(${226 + v},${228 + v},${226 + v})`;
        g.fillRect(x * s + 2, y * s + 2, s - 4, s - 4);
        g.fillStyle = "rgba(0,0,0,0.13)";
        for (let py = 6; py < s - 4; py += 5) for (let px = 6; px < s - 4; px += 5) g.fillRect(x * s + px, y * s + py, 1.3, 1.3);
      }
    blotch(g, w, w, r, 5, 0.12, "140,120,80", 40);
  });

/** pool water: teal with bright caustic network */
export const poWater = () =>
  makeTex(256, 256, (g, w) => {
    const r = rng(23);
    g.fillStyle = "#2f9fb8";
    g.fillRect(0, 0, w, w);
    blotch(g, w, w, r, 30, 0.25, "20,110,150", 60);
    blotch(g, w, w, r, 20, 0.2, "110,210,220", 50);
    g.lineCap = "round";
    for (let pass = 0; pass < 2; pass++) {
      g.strokeStyle = pass ? "rgba(235,255,255,0.55)" : "rgba(160,235,245,0.35)";
      g.lineWidth = pass ? 1.3 : 3;
      for (let i = 0; i < 70; i++) {
        const x = r() * w, y = r() * w;
        g.beginPath();
        g.moveTo(x, y);
        for (let k = 0; k < 3; k++) g.quadraticCurveTo(x + (r() - 0.5) * 40, y + (r() - 0.5) * 40, x + (r() - 0.5) * 50, y + (r() - 0.5) * 50);
        g.stroke();
      }
    }
    // tile the edges seamlessly
    const img = g.getImageData(0, 0, w, w);
    const d = img.data;
    for (let y = 0; y < w; y++)
      for (let x = 0; x < 16; x++) {
        const t = x / 16;
        const i1 = (y * w + x) * 4, i2 = (y * w + (w - 16 + x)) * 4;
        for (let c = 0; c < 3; c++) d[i2 + c] = d[i2 + c] * t + d[i1 + c] * (1 - t);
      }
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < w; x++) {
        const t = y / 16;
        const i1 = (y * w + x) * 4, i2 = ((w - 16 + y) * w + x) * 4;
        for (let c = 0; c < 3; c++) d[i2 + c] = d[i2 + c] * t + d[i1 + c] * (1 - t);
      }
    g.putImageData(img, 0, 0);
  });

/** big wall mural: bubble-letter graffiti over waves, a cartoon whale and bubbles (512×256) */
export const poMural = (text = "SPLASH!") =>
  makeTex(512, 256, (g, w, h) => {
    const r = rng(31);
    g.fillStyle = "#eef1ee";
    g.fillRect(0, 0, w, h);
    // tile grid underneath
    g.strokeStyle = "rgba(0,0,0,0.12)";
    g.lineWidth = 1;
    for (let x = 0; x < w; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y < h; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    // spray waves
    const waves = ["#1f6fc4", "#2c9fd6", "#6fd0e6"];
    waves.forEach((c, i) => {
      g.fillStyle = c;
      g.beginPath();
      g.moveTo(0, h);
      for (let x = 0; x <= w; x += 8) g.lineTo(x, 175 + i * 22 + Math.sin(x * 0.03 + i * 1.7) * 14);
      g.lineTo(w, h);
      g.fill();
    });
    // overspray dots
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "30,90,190" : "20,20,40"},${r() * 0.25})`; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
    // whale
    g.fillStyle = "#355fae";
    g.beginPath(); g.ellipse(410, 150, 70, 38, -0.1, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(340, 150); g.lineTo(300, 120); g.lineTo(310, 160); g.lineTo(296, 186); g.closePath(); g.fill();
    g.fillStyle = "#cfe3f5"; g.beginPath(); g.ellipse(420, 170, 52, 16, -0.1, 0, Math.PI); g.fill();
    g.fillStyle = "#111"; g.beginPath(); g.arc(446, 138, 5, 0, TAU); g.fill();
    g.fillStyle = "#fff"; g.beginPath(); g.arc(447.5, 136.5, 1.6, 0, TAU); g.fill();
    g.strokeStyle = "#8fd8f0"; g.lineWidth = 4;
    for (const a of [-0.5, 0, 0.5]) { g.beginPath(); g.moveTo(420, 112); g.quadraticCurveTo(420 + a * 30, 80, 420 + a * 50, 70); g.stroke(); }
    // bubble letters
    g.font = `900 92px ${SANS}`;
    g.textAlign = "center"; g.textBaseline = "middle";
    g.lineJoin = "round";
    g.save(); g.translate(200, 92); g.rotate(-0.06);
    g.lineWidth = 22; g.strokeStyle = "#141a33"; g.strokeText(text, 0, 0);
    g.lineWidth = 12; g.strokeStyle = "#ffffff"; g.strokeText(text, 0, 0);
    const gr = g.createLinearGradient(0, -40, 0, 40);
    gr.addColorStop(0, "#ffd23a"); gr.addColorStop(0.5, "#ff7a2a"); gr.addColorStop(1, "#e8266a");
    g.fillStyle = gr; g.fillText(text, 0, 0);
    g.fillStyle = "rgba(255,255,255,0.45)"; g.fillRect(-170, -30, 340, 6);
    g.restore();
    // bubbles
    for (let i = 0; i < 16; i++) {
      const x = r() * w, y = r() * 120, rad = 4 + r() * 12;
      g.strokeStyle = "rgba(40,110,200,0.8)"; g.lineWidth = 2;
      g.beginPath(); g.arc(x, y, rad, 0, TAU); g.stroke();
      g.fillStyle = "rgba(255,255,255,0.8)"; g.beginPath(); g.arc(x - rad * 0.35, y - rad * 0.35, rad * 0.25, 0, TAU); g.fill();
    }
    // drips and tags
    g.fillStyle = "rgba(20,26,51,0.7)";
    for (let i = 0; i < 14; i++) g.fillRect(60 + r() * 290, 130 + r() * 10, 2, 8 + r() * 26);
    g.font = `bold 20px ${SANS}`; g.fillStyle = "#1ba84a"; g.fillText("cloud", 60, 230);
    g.fillStyle = "#e8266a"; g.fillText("kz'24", 480, 26);
  });

/** a bank of lockers (n doors side by side), vents, number plates, keys */
export const poLockers = (col: string, n = 4, start = 1, seed = 41) =>
  makeTex(64 * n, 256, (g, w, h) => {
    const r = rng(seed);
    const C = hex(col);
    for (let i = 0; i < n; i++) {
      const x0 = i * 64;
      const v = Math.round((r() - 0.5) * 14);
      g.fillStyle = `rgb(${C[0] + v},${C[1] + v},${C[2] + v})`;
      g.fillRect(x0, 0, 64, h);
      g.fillStyle = "rgba(0,0,0,0.55)";
      g.fillRect(x0, 0, 2, h); g.fillRect(x0 + 62, 0, 2, h);
      g.fillRect(x0, 126, 64, 3);
      for (const top of [12, 140]) for (let k = 0; k < 6; k++) { g.fillStyle = "rgba(0,0,0,0.45)"; g.fillRect(x0 + 14, top + k * 6, 36, 2.5); g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect(x0 + 14, top + k * 6 + 2.5, 36, 1); }
      for (const [top, num] of [[60, start + i * 2], [188, start + i * 2 + 1]] as [number, number][]) {
        g.fillStyle = "#f4f2ea"; g.fillRect(x0 + 20, top, 24, 13);
        g.fillStyle = "#222"; g.font = `bold 11px ${SANS}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(num), x0 + 32, top + 7);
        g.fillStyle = "#c9ccd0"; g.fillRect(x0 + 48, top + 18, 8, 16);
        g.fillStyle = r() < 0.6 ? "#e33b2e" : "#2c6cd0"; g.fillRect(x0 + 50, top + 34, 4, 9);
      }
      blotch(g, w, h, r, 3, 0.12, "60,50,30", 30);
    }
    speck(g, w, h, r, 300, 0.12);
  });

/** red LED scoreboard */
export const poScoreboard = () =>
  makeTex(512, 256, (g, w, h) => {
    g.fillStyle = "#0e0f12";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#3b3f46"; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
    g.textBaseline = "middle";
    g.fillStyle = "#e9edf2"; g.font = `bold 26px ${SANS}`; g.textAlign = "center";
    g.fillText("CITY AQUATIC CENTRE", w / 2, 28);
    g.font = `bold 20px ${SANS}`; g.textAlign = "left";
    const rows = [["1", "LANE 1", "0:58.21"], ["2", "LANE 2", "1:01.07"], ["3", "LANE 3", "0:57.94"], ["4", "LANE 4", "1:03.52"], ["5", "LANE 5", "0:59.66"]];
    rows.forEach(([p, n, t], i) => {
      const y = 70 + i * 34;
      g.fillStyle = "#ffcf3a"; g.fillText(p, 30, y);
      g.fillStyle = "#ff3b30"; g.fillText(n, 70, y);
      g.shadowColor = "#ff2a1a"; g.shadowBlur = 8;
      g.fillStyle = "#ff4b3a"; g.font = `bold 26px monospace`; g.fillText(t, 330, y);
      g.shadowBlur = 0; g.font = `bold 20px ${SANS}`;
    });
    g.fillStyle = "rgba(255,255,255,0.05)";
    for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1);
  });

/** round wall clock face */
export const poClock = () =>
  makeTex(128, 128, (g, w) => {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, w, w);
    const c = w / 2;
    g.fillStyle = "#1d1d1d";
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * TAU, big = i % 5 === 0;
      g.save(); g.translate(c, c); g.rotate(a); g.fillRect(-(big ? 2 : 0.7), -58, big ? 4 : 1.4, big ? 10 : 4); g.restore();
    }
    g.save(); g.translate(c, c);
    g.rotate(TAU * (10.2 / 12)); g.fillRect(-2.5, -34, 5, 38); g.rotate(-TAU * (10.2 / 12));
    g.rotate(TAU * (12 / 60)); g.fillRect(-1.6, -50, 3.2, 54); g.rotate(-TAU * (12 / 60));
    g.fillStyle = "#d42a1e"; g.rotate(TAU * 0.62); g.fillRect(-0.6, -52, 1.2, 60);
    g.restore();
    g.fillStyle = "#d42a1e"; g.beginPath(); g.arc(c, c, 3.5, 0, TAU); g.fill();
  });

/** simple sign: text lines on a coloured plate with a thin border and an optional pictogram */
export const poSign = (lines: string[], bg: string, fg: string, w = 256, h = 128, icon = "") =>
  makeTex(w, h, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = fg; g.lineWidth = Math.max(3, h * 0.035);
    g.strokeRect(h * 0.05, h * 0.05, w - h * 0.1, h - h * 0.1);
    let x0 = 0;
    if (icon) {
      x0 = h * 0.8;
      g.fillStyle = fg;
      const cx = h * 0.5, cy = h * 0.5, s = h * 0.3;
      if (icon === "swim") {
        g.beginPath(); g.arc(cx + s * 0.5, cy - s * 0.5, s * 0.22, 0, TAU); g.fill();
        g.fillRect(cx - s * 0.8, cy - s * 0.15, s * 1.2, s * 0.22);
        g.lineWidth = s * 0.16; g.strokeStyle = fg; g.beginPath();
        for (let x = -s; x <= s; x += 2) g.lineTo(cx + x, cy + s * 0.5 + Math.sin(x * 0.25) * s * 0.12);
        g.stroke();
      } else if (icon === "nodive") {
        g.lineWidth = s * 0.18; g.strokeStyle = "#d42a1e";
        g.beginPath(); g.arc(cx, cy, s, 0, TAU); g.stroke();
        g.fillStyle = fg; g.beginPath(); g.arc(cx - s * 0.3, cy - s * 0.35, s * 0.17, 0, TAU); g.fill();
        g.save(); g.translate(cx, cy); g.rotate(0.8); g.fillRect(-s * 0.1, -s * 0.2, s * 0.2, s * 0.8); g.restore();
        g.strokeStyle = "#d42a1e"; g.beginPath(); g.moveTo(cx - s * 0.7, cy - s * 0.7); g.lineTo(cx + s * 0.7, cy + s * 0.7); g.stroke();
      } else if (icon === "cross") {
        g.fillStyle = fg; g.fillRect(cx - s * 0.3, cy - s, s * 0.6, s * 2); g.fillRect(cx - s, cy - s * 0.3, s * 2, s * 0.6);
      } else if (icon === "warn") {
        g.fillStyle = "#1a1a1a"; g.beginPath(); g.moveTo(cx, cy - s); g.lineTo(cx + s, cy + s * 0.8); g.lineTo(cx - s, cy + s * 0.8); g.closePath(); g.fill();
        g.fillStyle = bg; g.font = `900 ${s * 1.2}px ${SANS}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("!", cx, cy + s * 0.15);
      } else if (icon === "man" || icon === "woman") {
        g.beginPath(); g.arc(cx, cy - s * 0.75, s * 0.25, 0, TAU); g.fill();
        if (icon === "man") g.fillRect(cx - s * 0.35, cy - s * 0.4, s * 0.7, s * 1.3);
        else { g.beginPath(); g.moveTo(cx - s * 0.15, cy - s * 0.45); g.lineTo(cx + s * 0.15, cy - s * 0.45); g.lineTo(cx + s * 0.55, cy + s * 0.55); g.lineTo(cx - s * 0.55, cy + s * 0.55); g.fill(); g.fillRect(cx - s * 0.25, cy + s * 0.5, s * 0.5, s * 0.45); }
      }
    }
    g.fillStyle = fg;
    g.textAlign = "center"; g.textBaseline = "middle";
    const n = lines.length;
    const fs = Math.min(h * (n > 1 ? 0.3 : 0.46), ((w - x0) * 1.5) / Math.max(...lines.map((l) => l.length)) / 1.0);
    g.font = `900 ${fs}px ${SANS}`;
    lines.forEach((l, i) => g.fillText(l, x0 + (w - x0) / 2, h / 2 + (i - (n - 1) / 2) * fs * 1.12));
  });

/** striped fabric (towels, cushions): stripes along u */
export const poStripes = (cols: string[], seed = 51) =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(seed);
    const n = cols.length * 2;
    for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.fillRect((i * w) / n, 0, w / n + 1, h); }
    for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "0,0,0" : "255,255,255"},${r() * 0.1})`; g.fillRect(r() * w, r() * h, 1, 2); }
  });

/** black rubber floor mat with a diamond grip pattern */
export const poRubber = () =>
  makeTex(128, 128, (g, w) => {
    const r = rng(61);
    g.fillStyle = "#2a2d30";
    g.fillRect(0, 0, w, w);
    for (let y = 0; y < w; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < w; x += 8) { g.fillStyle = "#45494e"; g.fillRect(x + 1, y + 2, 5, 3); }
    speck(g, w, w, r, 300, 0.12);
  });

/** metal grating (pool overflow gutter / floor drain) */
export const poGrate = () =>
  makeTex(64, 64, (g, w) => {
    g.fillStyle = "#f2f3f1";
    g.fillRect(0, 0, w, w);
    g.fillStyle = "#39464c";
    for (let x = 2; x < w; x += 8) g.fillRect(x, 3, 4, w - 6);
    g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(0, 0, w, 2); g.fillRect(0, w - 2, w, 2);
  });

/** painted concrete (stair / plant room walls) */
export const poPaint = (base: string, seed = 71) =>
  makeTex(256, 256, (g, w) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, w);
    blotch(g, w, w, r, 26, 0.08, "0,0,0", 60);
    blotch(g, w, w, r, 18, 0.08, "255,255,255", 50);
    speck(g, w, w, r, 1800, 0.08);
  });

/** kickboard foam: bright colour with a white swim logo */
export const poFoam = () =>
  makeTex(64, 64, (g, w) => {
    const r = rng(81);
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, w, w);
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.07})`; g.fillRect(r() * w, r() * w, 1.5, 1.5); }
    g.fillStyle = "rgba(255,255,255,0.0)";
  });

/** transparent graffiti throw-up: bubble letters with outline, drips and overspray (for tags on walls) */
export const poTag = (text = "CLOUD", fill = "#3a5fc8", fill2 = "#7fb2ff", seed = 91) =>
  makeTex(256, 96, (g, w, h) => {
    const r = rng(seed);
    g.clearRect(0, 0, w, h);
    // overspray haze
    for (let i = 0; i < 300; i++) {
      g.fillStyle = `rgba(30,40,70,${r() * 0.18})`;
      g.fillRect(40 + r() * (w - 80), 30 + r() * (h - 60), 1.5, 1.5);
    }
    const fs = Math.min(64, (w * 1.6) / Math.max(4, text.length));
    g.font = `900 ${fs}px ${SANS}`;
    g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
    g.save(); g.translate(w / 2, h / 2); g.rotate((r() - 0.5) * 0.12); g.scale(1, 1.15);
    g.lineWidth = fs * 0.26; g.strokeStyle = "#111522"; g.strokeText(text, 0, 0);
    g.lineWidth = fs * 0.12; g.strokeStyle = "#f4f6ff"; g.strokeText(text, 0, 0);
    const gr = g.createLinearGradient(0, -fs * 0.4, 0, fs * 0.4);
    gr.addColorStop(0, fill2); gr.addColorStop(0.55, fill); gr.addColorStop(1, "#1a2350");
    g.fillStyle = gr; g.fillText(text, 0, 0);
    g.fillStyle = "rgba(255,255,255,0.5)";
    for (let i = 0; i < 6; i++) g.fillRect(-fs * text.length * 0.3 + i * fs * 0.55, -fs * 0.3, fs * 0.16, fs * 0.08);
    g.restore();
    // drips
    g.fillStyle = "rgba(17,21,34,0.85)";
    for (let i = 0; i < 10; i++) { const x = 35 + r() * (w - 70), y = h / 2 + fs * 0.35; g.fillRect(x, y, 2, 5 + r() * 20); }
    // little crown / star
    g.fillStyle = "#ffd23a";
    g.beginPath(); const cx = w - 30, cy = 18;
    for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU - Math.PI / 2, rr = i % 2 ? 4 : 10; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    g.fill();
  });

/** long club banner: coloured cloth with big text and a side stripe */
export const poBanner = (text: string, bg: string, fg: string, stripe: string) =>
  makeTex(384, 72, (g, w, h) => {
    const r = rng(text.length * 7 + 3);
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = stripe; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 10, w, 10);
    g.fillStyle = fg; g.font = `900 ${h * 0.46}px ${SANS}`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(text, w / 2, h / 2 + 2);
    // fabric creases
    for (let i = 0; i < 8; i++) { const x = r() * w; const gr = g.createLinearGradient(x - 20, 0, x + 20, 0); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.5, `rgba(0,0,0,${0.05 + r() * 0.08})`); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - 20, 0, 40, h); }
    speck(g, w, h, r, 800, 0.06);
  });

/** paper note / letter / notice: optional bold title, handwritten-style lines on ruled paper */
export const poNote = (title: string, lines: string[], paper = "#fbf8ee", ink = "#1f2a50", w = 256, h = 256, ruled = true) =>
  makeTex(w, h, (g) => {
    const r = rng(title.length * 31 + lines.length * 7);
    g.fillStyle = paper; g.fillRect(0, 0, w, h);
    blotch(g, w, h, r, 5, 0.06, "120,90,40", 40);
    const n = lines.length + (title ? 1.4 : 0);
    const lh = Math.min(h * 0.13, (h * 0.86) / Math.max(1, n));
    if (ruled) { g.fillStyle = "rgba(90,120,180,0.25)"; for (let y = h * 0.07 + lh * (title ? 1.4 : 0) + lh * 0.85; y < h; y += lh) g.fillRect(w * 0.04, y, w * 0.92, 1); }
    let y = h * 0.07;
    g.textBaseline = "top"; g.fillStyle = ink;
    if (title) { g.textAlign = "center"; g.font = `bold ${lh * 0.95}px ${SANS}`; g.fillText(title, w / 2, y, w * 0.9); y += lh * 1.4; }
    g.textAlign = "left";
    g.font = `italic ${lh * 0.72}px Georgia, "Times New Roman", serif`;
    for (const l of lines) { g.fillText(l, w * 0.07, y + lh * 0.12, w * 0.88); y += lh; }
  });
