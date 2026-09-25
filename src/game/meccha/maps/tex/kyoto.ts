// Canvas textures for the Kyoto map (Kyoto Station-style atrium at night during a festival): dark polished granite
// floor tiles, light stone pavers, raked gravel, white facade tiles, dark green-black marble, warm wooden boards,
// kawara roof tiles, maple leaves, glowing maple panels, Gion paper lanterns, red chochin, wagasa canopies, kimono
// fabric, the shamisen billboard, the star field seen through the lattice roof and small stall signs.
import { makeTex } from "../../textures";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const JP = `"IPAPGothic", "IPAGothic", "Hiragino Sans", "Noto Sans CJK JP", "WenQuanYi Zen Hei", sans-serif`;
type C2 = CanvasRenderingContext2D;

function speck(g: C2, w: number, h: number, r: () => number, n: number, a = 0.15) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = r() < 0.5 ? `rgba(0,0,0,${r() * a})` : `rgba(255,255,255,${r() * a * 0.7})`;
    g.fillRect(r() * w, r() * h, 1 + r() * 1.5, 1 + r() * 1.5);
  }
}
function blotch(g: C2, w: number, h: number, r: () => number, n: number, a: number, col: string) {
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h, rad = 8 + r() * 50;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, `rgba(${col},${a * r()})`);
    gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
}
function veins(g: C2, w: number, h: number, r: () => number, n: number, col: string) {
  g.strokeStyle = col;
  for (let i = 0; i < n; i++) {
    g.lineWidth = 0.5 + r() * 1.4;
    g.beginPath();
    let x = r() * w, y = r() * h;
    g.moveTo(x, y);
    for (let k = 0; k < 8; k++) { x += (r() - 0.3) * 40; y += (r() - 0.5) * 30; g.lineTo(x, y); }
    g.stroke();
  }
}

/** dark polished granite floor, 2×2 tiles per texture (≈0.6 m tiles) */
export const kyFloor = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(3);
    g.fillStyle = "#15171a";
    g.fillRect(0, 0, w, h);
    const s = w / 2;
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 2; x++) {
        const v = 30 + r() * 12;
        g.fillStyle = `rgb(${v},${v + 1},${v + 4})`;
        g.fillRect(x * s + 2, y * s + 2, s - 4, s - 4);
      }
    for (let i = 0; i < 2600; i++) { const v = r() < 0.5 ? 10 : 70 + r() * 60; g.fillStyle = `rgba(${v},${v},${v + 4},${0.25 + r() * 0.4})`; g.fillRect(r() * w, r() * h, 1 + r() * 1.5, 1 + r() * 1.5); }
    blotch(g, w, h, r, 14, 0.2, "0,0,0");
    g.fillStyle = "rgba(0,0,0,0.9)";
    for (let k = 0; k <= 2; k++) { g.fillRect(k * s - 1, 0, 2, h); g.fillRect(0, k * s - 1, w, 2); }
  });

/** light grey granite pavers in the festival lanes */
export const kyPaver = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(7);
    g.fillStyle = "#3a3b3d";
    g.fillRect(0, 0, w, h);
    const rows = 4, bh = h / rows;
    for (let y = 0; y < rows; y++) {
      let x = (y % 2) * -48;
      while (x < w) {
        const bw = 64 + Math.floor(r() * 3) * 16;
        const v = 128 + r() * 34;
        g.fillStyle = `rgb(${v},${v},${v - 3})`;
        g.fillRect(x + 2, y * bh + 2, bw - 4, bh - 4);
        g.fillStyle = "rgba(255,255,255,0.08)"; g.fillRect(x + 3, y * bh + 3, bw - 6, 2);
        x += bw;
      }
    }
    speck(g, w, h, r, 1800, 0.2);
    blotch(g, w, h, r, 10, 0.16, "20,20,20");
  });

/** raked white gravel with parallel groove lines */
export const kyGravel = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(11);
    g.fillStyle = "#b9b6ad";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 3000; i++) { const v = 140 + r() * 100; g.fillStyle = `rgba(${v},${v},${v - 6},0.7)`; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
    for (let y = 0; y < h; y += 16) {
      const gr = g.createLinearGradient(0, y, 0, y + 16);
      gr.addColorStop(0, "rgba(0,0,0,0.25)");
      gr.addColorStop(0.35, "rgba(0,0,0,0)");
      gr.addColorStop(0.7, "rgba(255,255,255,0.15)");
      gr.addColorStop(1, "rgba(0,0,0,0.2)");
      g.fillStyle = gr;
      g.fillRect(0, y, w, 16);
    }
  });

/** white ceramic facade tiles (large, 0.9 × 0.45 m) */
export const kyWhiteTile = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(5);
    g.fillStyle = "#9da0a3";
    g.fillRect(0, 0, w, h);
    const tw = 128, th = 64;
    for (let y = 0; y < h / th; y++)
      for (let x = 0; x < w / tw; x++) {
        const v = 222 + r() * 16;
        g.fillStyle = `rgb(${v},${v},${v + 2})`;
        g.fillRect(x * tw + 2, y * th + 2, tw - 4, th - 4);
      }
    speck(g, w, h, r, 700, 0.08);
    blotch(g, w, h, r, 10, 0.1, "60,60,60");
    for (let i = 0; i < 12; i++) {
      const x = r() * w, len = 20 + r() * 90, y = r() * h;
      const gr = g.createLinearGradient(0, y, 0, y + len);
      gr.addColorStop(0, "rgba(60,60,60,0.08)"); gr.addColorStop(1, "rgba(60,60,60,0)");
      g.fillStyle = gr; g.fillRect(x, y, 2 + r() * 4, len);
    }
  });

/** dark green-black polished marble cladding, 2×2 slabs */
export const kyMarble = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(13);
    g.fillStyle = "#0c1110";
    g.fillRect(0, 0, w, h);
    const s = w / 2;
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 2; x++) {
        const v = 22 + r() * 10;
        g.fillStyle = `rgb(${v - 4},${v + 3},${v})`;
        g.fillRect(x * s + 1, y * s + 1, s - 2, s - 2);
      }
    blotch(g, w, h, r, 16, 0.25, "40,70,60");
    veins(g, w, h, r, 14, "rgba(140,170,160,0.18)");
    veins(g, w, h, r, 10, "rgba(0,0,0,0.5)");
    speck(g, w, h, r, 800, 0.12);
    g.fillStyle = "rgba(0,0,0,0.8)";
    for (let k = 0; k <= 2; k++) { g.fillRect(k * s - 1, 0, 2, h); g.fillRect(0, k * s - 1, w, 2); }
  });

/** warm vertical wooden boards (fences, stall walls) */
export const kyBoards = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(17);
    const n = 8, bw = w / n;
    for (let i = 0; i < n; i++) {
      const v = r();
      g.fillStyle = `rgb(${120 + v * 30},${70 + v * 20},${36 + v * 12})`;
      g.fillRect(i * bw, 0, bw, h);
      for (let k = 0; k < 14; k++) {
        g.strokeStyle = `rgba(50,24,8,${0.12 + r() * 0.2})`;
        g.lineWidth = 0.6 + r();
        const x0 = i * bw + r() * bw;
        g.beginPath(); g.moveTo(x0, 0);
        g.bezierCurveTo(x0 + (r() - 0.5) * 6, h * 0.3, x0 + (r() - 0.5) * 6, h * 0.7, x0 + (r() - 0.5) * 4, h);
        g.stroke();
      }
      g.fillStyle = "rgba(30,14,4,0.7)";
      g.fillRect(i * bw, 0, 2, h);
      g.fillStyle = "rgba(255,210,160,0.08)";
      g.fillRect(i * bw + 2, 0, 2, h);
    }
    speck(g, w, h, r, 400, 0.1);
  });

/** reddish-brown granite for the grand stair treads and risers */
export const kyStairStone = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(19);
    g.fillStyle = "#6b4a44";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) {
      const t = r();
      g.fillStyle = t < 0.3 ? "rgba(30,18,16,0.5)" : t < 0.6 ? "rgba(150,110,100,0.45)" : "rgba(95,64,58,0.5)";
      g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
    }
    g.fillStyle = "rgba(0,0,0,0.35)";
    for (let x = 0; x < w; x += 128) g.fillRect(x, 0, 2, h);
  });

/** kawara roof tiles: rows of rounded ridges running down the slope */
export const kyKawara = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(23);
    g.fillStyle = "#23262b";
    g.fillRect(0, 0, w, h);
    const n = 8, cw = w / n;
    for (let i = 0; i < n; i++) {
      const gr = g.createLinearGradient(i * cw, 0, (i + 1) * cw, 0);
      gr.addColorStop(0, "#1a1c20");
      gr.addColorStop(0.45, "#5a5f68");
      gr.addColorStop(0.6, "#474b53");
      gr.addColorStop(1, "#15171a");
      g.fillStyle = gr;
      g.fillRect(i * cw, 0, cw, h);
    }
    for (let y = 0; y < h; y += 32) { g.fillStyle = "rgba(0,0,0,0.45)"; g.fillRect(0, y, w, 3); g.fillStyle = "rgba(255,255,255,0.06)"; g.fillRect(0, y + 3, w, 2); }
    speck(g, w, h, r, 600, 0.12);
  });

/** rough white plaster with faint stains */
export const kyPlaster = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(29);
    g.fillStyle = "#e3ddd0";
    g.fillRect(0, 0, w, h);
    blotch(g, w, h, r, 30, 0.12, "120,105,80");
    speck(g, w, h, r, 900, 0.08);
  });

/** dense red/orange maple foliage (for leaf clumps) */
export const kyMaple = (hue = 0) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(31 + hue);
    g.fillStyle = hue ? "#8a1f08" : "#5a0a08";
    g.fillRect(0, 0, w, h);
    const leaf = (x: number, y: number, s: number, a: number) => {
      g.save(); g.translate(x, y); g.rotate(a); g.beginPath();
      for (let k = 0; k < 5; k++) {
        const t = -Math.PI / 2 + (k - 2) * 0.62;
        g.lineTo(Math.cos(t) * s, Math.sin(t) * s);
        g.lineTo(Math.cos(t + 0.31) * s * 0.42, Math.sin(t + 0.31) * s * 0.42);
      }
      g.lineTo(0, s * 0.3);
      g.closePath(); g.fill(); g.restore();
    };
    for (let i = 0; i < 380; i++) {
      const t = r();
      const c = hue
        ? t < 0.3 ? "#ff6a14" : t < 0.6 ? "#e2410c" : t < 0.85 ? "#b82806" : "#ffa030"
        : t < 0.3 ? "#c2140e" : t < 0.6 ? "#9c0e0a" : t < 0.85 ? "#e0301a" : "#6e0806";
      g.fillStyle = c;
      leaf(r() * w, r() * h, 6 + r() * 9, r() * 6.3);
    }
    speck(g, w, h, r, 400, 0.2);
  });

/** glowing framed maple panel (lit from behind) */
export const kyMaplePanel = () =>
  makeTex(256, 512, (g, w, h) => {
    const r = rng(37);
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "#ff9a1a"); gr.addColorStop(0.5, "#ff5a08"); gr.addColorStop(1, "#d42a04");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 220; i++) {
      g.fillStyle = r() < 0.5 ? `rgba(160,20,0,${0.3 + r() * 0.4})` : `rgba(255,220,90,${0.2 + r() * 0.4})`;
      const x = r() * w, y = r() * h, s = 5 + r() * 12;
      g.save(); g.translate(x, y); g.rotate(r() * 6.3); g.beginPath();
      for (let k = 0; k < 5; k++) { const t = -Math.PI / 2 + (k - 2) * 0.62; g.lineTo(Math.cos(t) * s, Math.sin(t) * s); g.lineTo(Math.cos(t + 0.31) * s * 0.4, Math.sin(t + 0.31) * s * 0.4); }
      g.closePath(); g.fill(); g.restore();
    }
    g.strokeStyle = "#2a0d04"; g.lineWidth = 14; g.strokeRect(0, 0, w, h);
  });

/** Gion-style white paper lantern: ribs, red crest, black top/bottom bands (wraps around a sphere) */
export const kyGionLantern = () =>
  makeTex(256, 128, (g, w, h) => {
    g.fillStyle = "#f4efe4";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(120,100,70,0.22)";
    for (let y = 6; y < h; y += 9) g.fillRect(0, y, w, 1.5);
    for (const cx of [w * 0.25, w * 0.75]) {
      g.fillStyle = "#d4161a";
      g.beginPath(); g.arc(cx, h * 0.48, 20, 0, 6.3); g.fill();
      g.fillStyle = "#f4efe4";
      for (let k = 0; k < 3; k++) {
        const a = k * 2.09;
        g.beginPath(); g.arc(cx + Math.cos(a) * 8, h * 0.48 + Math.sin(a) * 8, 6, 0, 6.3); g.fill();
      }
    }
    g.fillStyle = "#1a1512"; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 10, w, 10);
  });

/** red chochin lantern with a black kanji (wraps around) */
export const kyRedLantern = () =>
  makeTex(256, 128, (g, w, h) => {
    g.fillStyle = "#d8261c";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(90,0,0,0.3)";
    for (let y = 5; y < h; y += 8) g.fillRect(0, y, w, 1.5);
    g.fillStyle = "#1a0e08";
    g.font = `bold 58px ${JP}`;
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("祭", w * 0.25, h * 0.52);
    g.fillText("祭", w * 0.75, h * 0.52);
    g.fillStyle = "#16100c"; g.fillRect(0, 0, w, 9); g.fillRect(0, h - 9, w, 9);
  });

/** wagasa / nodate-gasa canopy: red with a white ring and radial ribs (planar UVs from a cone) */
export const kyWagasa = (base = "#c8141e", ring = "#f2ece2") =>
  makeTex(256, 256, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    // UV v runs from tip (1) to rim (0) on a lathe: horizontal bands
    g.fillStyle = ring; g.fillRect(0, h * 0.34, w, h * 0.12);
    g.fillStyle = "rgba(0,0,0,0.25)";
    for (let x = 0; x < w; x += w / 24) g.fillRect(x, 0, 1.5, h);
    g.fillStyle = "rgba(255,255,255,0.12)";
    for (let x = 4; x < w; x += w / 24) g.fillRect(x, 0, 2, h);
  });

/** kimono fabric: base colour with floral motifs */
export const kyKimono = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(41);
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) {
      const x = r() * w, y = r() * h, s = 6 + r() * 12;
      const t = r();
      g.fillStyle = t < 0.3 ? "#f6e4a8" : t < 0.6 ? "#ffffff" : t < 0.8 ? "#f0a8b8" : "#3a6a9a";
      for (let k = 0; k < 5; k++) { const a = k * 1.256; g.beginPath(); g.arc(x + Math.cos(a) * s * 0.55, y + Math.sin(a) * s * 0.55, s * 0.45, 0, 6.3); g.fill(); }
      g.fillStyle = "#e0a020"; g.beginPath(); g.arc(x, y, s * 0.25, 0, 6.3); g.fill();
    }
    g.fillStyle = "rgba(0,0,0,0.12)";
    for (let i = 0; i < 400; i++) g.fillRect(r() * w, r() * h, 1, 1);
  });

/** the shamisen billboard: a lit photo-like ad of hands playing a shamisen */
export const kyShamisen = () =>
  makeTex(512, 384, (g, w, h) => {
    const bg = g.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, "#1b0f0a"); bg.addColorStop(0.6, "#3a1e12"); bg.addColorStop(1, "#120806");
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    // warm glow
    const gl = g.createRadialGradient(w * 0.45, h * 0.5, 10, w * 0.45, h * 0.5, w * 0.55);
    gl.addColorStop(0, "rgba(255,170,90,0.45)"); gl.addColorStop(1, "rgba(255,170,90,0)");
    g.fillStyle = gl; g.fillRect(0, 0, w, h);
    // shamisen neck (diagonal) and body
    g.save(); g.translate(w * 0.62, h * 0.62); g.rotate(-0.55);
    g.fillStyle = "#2a1408"; g.fillRect(-260, -9, 300, 18);
    g.fillStyle = "#ead9b8"; g.fillRect(30, -60, 120, 120);
    g.strokeStyle = "#5a3010"; g.lineWidth = 8; g.strokeRect(30, -60, 120, 120);
    g.strokeStyle = "rgba(255,245,220,0.9)"; g.lineWidth = 1.5;
    for (const o of [-5, 0, 5]) { g.beginPath(); g.moveTo(-260, o); g.lineTo(140, o); g.stroke(); }
    g.restore();
    // hand with bachi (plectrum)
    const skin = g.createLinearGradient(0, h * 0.2, 0, h * 0.8);
    skin.addColorStop(0, "#f7d2b0"); skin.addColorStop(1, "#c98a62");
    g.fillStyle = skin;
    g.beginPath(); g.ellipse(w * 0.22, h * 0.4, 70, 40, -0.6, 0, 6.3); g.fill();
    for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(w * 0.14 + k * 22, h * 0.25 + k * 10, 12, 42, -0.3, 0, 6.3); g.fill(); }
    g.fillStyle = "#e9c090"; g.beginPath(); g.moveTo(w * 0.62, h * 0.38); g.lineTo(w * 0.78, h * 0.3); g.lineTo(w * 0.72, h * 0.5); g.closePath(); g.fill();
    g.fillStyle = skin; g.beginPath(); g.ellipse(w * 0.7, h * 0.46, 60, 34, 0.4, 0, 6.3); g.fill();
    // kimono sleeve
    g.fillStyle = "#6a0c14"; g.beginPath(); g.moveTo(w, h * 0.35); g.lineTo(w * 0.78, h * 0.5); g.lineTo(w * 0.86, h); g.lineTo(w, h); g.fill();
    g.fillStyle = "#f2e4c0"; g.font = `bold 44px ${JP}`; g.textAlign = "left"; g.textBaseline = "top";
    g.fillText("Tom Kodner", 24, h - 70, w - 40);
    g.font = `22px ${JP}`; g.fillText("Tom Kodner", 26, h - 110);
  });

/** star field seen through the roof */
export const kyStars = () =>
  makeTex(512, 256, (g, w, h) => {
    const r = rng(43);
    g.fillStyle = "#020306";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const b = r();
      g.fillStyle = `rgba(255,255,255,${0.25 + b * 0.75})`;
      const s = b > 0.93 ? 2 : 1;
      g.fillRect(r() * w, r() * h, s, s);
    }
  });

/** blue glass curtain wall with mullions (tower windows) */
export const kyBlueGlass = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(47);
    g.fillStyle = "#0a0f24";
    g.fillRect(0, 0, w, h);
    const n = 4, s = w / n;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const gr = g.createLinearGradient(x * s, y * s, (x + 1) * s, (y + 1) * s);
        const v = 0.7 + r() * 0.3;
        gr.addColorStop(0, `rgb(${30 * v},${40 * v},${120 * v})`);
        gr.addColorStop(1, `rgb(${16 * v},${22 * v},${80 * v})`);
        g.fillStyle = gr;
        g.fillRect(x * s + 3, y * s + 3, s - 6, s - 6);
      }
    g.fillStyle = "#8c94a8";
    for (let k = 0; k <= n; k++) { g.fillRect(k * s - 2, 0, 4, h); g.fillRect(0, k * s - 2, w, 4); }
  });

/** grooved aluminium escalator steps */
export const kySteps = () =>
  makeTex(128, 128, (g, w, h) => {
    g.fillStyle = "#3a3d42";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#8a8f98";
    for (let x = 0; x < w; x += 6) g.fillRect(x, 0, 3, h);
    g.fillStyle = "#e0c020";
    g.fillRect(0, 0, 6, h); g.fillRect(w - 6, 0, 6, h);
  });

/** indigo noren curtain with a white kanji */
export const kyNoren = (text: string, bg = "#1e2a5a") =>
  makeTex(256, 128, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(0,0,0,0.35)";
    for (let k = 1; k < 4; k++) g.fillRect((k * w) / 4 - 2, h * 0.25, 4, h);
    g.fillStyle = "#f2ede0";
    g.font = `bold 64px ${JP}`;
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(text, w / 2, h * 0.5);
  });

/** wooden stall signboard (black ink on pale wood) */
export const kySign = (text: string) =>
  makeTex(256, 64, (g, w, h) => {
    const r = rng(text.length * 7 + 3);
    g.fillStyle = "#e4c89a";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 20; i++) { g.strokeStyle = `rgba(120,80,40,${0.1 + r() * 0.15})`; g.beginPath(); const y = r() * h; g.moveTo(0, y); g.lineTo(w, y + (r() - 0.5) * 6); g.stroke(); }
    g.strokeStyle = "#5a3818"; g.lineWidth = 5; g.strokeRect(2, 2, w - 4, h - 4);
    g.fillStyle = "#1a120c";
    g.font = `bold 40px ${JP}`;
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(text, w / 2, h / 2 + 2);
  });

/** red felt (hi-mosen) bench cloth */
export const kyFelt = () =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(53);
    g.fillStyle = "#b8141a";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1200; i++) { g.fillStyle = r() < 0.5 ? "rgba(80,0,0,0.25)" : "rgba(255,120,120,0.12)"; g.fillRect(r() * w, r() * h, 1, 1); }
  });

/** bamboo culm skin: green with fine vertical streaks */
export const kyBamboo = () =>
  makeTex(128, 256, (g, w, h) => {
    const r = rng(59);
    g.fillStyle = "#3d6a26";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      g.fillStyle = r() < 0.5 ? `rgba(20,40,10,${0.15 + r() * 0.2})` : `rgba(160,200,90,${0.08 + r() * 0.12})`;
      g.fillRect(r() * w, 0, 1 + r() * 3, h);
    }
    blotch(g, w, h, r, 10, 0.2, "120,110,40");
  });

/** brushed gold panel for the balcony parapet */
export const kyGold = () =>
  makeTex(256, 128, (g, w, h) => {
    const r = rng(61);
    g.fillStyle = "#8a6a28";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) { g.fillStyle = r() < 0.5 ? "rgba(60,40,10,0.25)" : "rgba(255,230,160,0.18)"; g.fillRect(0, r() * h, w, 1); }
    blotch(g, w, h, r, 16, 0.3, "40,28,8");
  });

/** bamboo leaf spray (alpha) */
export const kyBambooLeaves = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(67);
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      const x = w * 0.5 + (r() - 0.5) * w * 0.8, y = h * 0.5 + (r() - 0.5) * h * 0.8;
      g.save(); g.translate(x, y); g.rotate(r() * 6.3);
      g.fillStyle = r() < 0.5 ? "#4f7d2a" : "#6d9a38";
      g.beginPath(); g.ellipse(0, 0, 24 + r() * 10, 4 + r() * 2, 0, 0, 6.3); g.fill();
      g.restore();
    }
  });

/** vertical nobori festival banner with a coloured edge and black text */
export const kyNobori = (text: string, bg = "#f2ead8", edge = "#c8141e") =>
  makeTex(64, 256, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = edge;
    g.fillRect(0, 0, w, 22);
    g.fillRect(0, 0, 8, h);
    g.fillStyle = "#16100c";
    g.font = `bold 40px ${JP}`;
    g.textAlign = "center"; g.textBaseline = "middle";
    const chars = [...text];
    chars.forEach((c, i) => g.fillText(c, w / 2 + 3, 50 + i * ((h - 70) / Math.max(1, chars.length - 1 || 1))));
  });

/** straw-wrapped sake barrel (komodaru) label */
export const kyTaru = (text: string) =>
  makeTex(256, 128, (g, w, h) => {
    g.fillStyle = "#e6dcc0";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(150,120,70,0.35)";
    for (let y = 0; y < h; y += 3) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + 1); g.stroke(); }
    g.fillStyle = "#3a2a1a"; g.fillRect(0, 14, w, 6); g.fillRect(0, h - 20, w, 6);
    g.fillStyle = "#b8141a";
    g.font = `bold 44px ${JP}`;
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(text, w * 0.25, h / 2);
    g.fillStyle = "#1a2a6a";
    g.fillText(text, w * 0.75, h / 2);
  });
