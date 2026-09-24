// Indoor Country textures (Canvas): plywood, painted sky murals, turf, straw, barn boards, standee art.
import { makeTex, type PaintTex } from "../../textures";

export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
type G = CanvasRenderingContext2D;

function speckle(g: G, w: number, h: number, r: () => number, n: number, a: number, size = 2) {
  for (let i = 0; i < n; i++) {
    const v = (r() - 0.5) * 2 * a;
    g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
    g.fillRect(r() * w, r() * h, 1 + r() * size, 1 + r() * size);
  }
}
function grainLines(g: G, w: number, h: number, r: () => number, n: number, col: string, alpha: number, vertical = false) {
  for (let i = 0; i < n; i++) {
    g.strokeStyle = col;
    g.globalAlpha = alpha * (0.4 + r() * 0.8);
    g.lineWidth = 0.6 + r() * 1.6;
    g.beginPath();
    const p = r() * (vertical ? w : h);
    const amp = 2 + r() * 6;
    const f = 1 + r() * 3;
    for (let t = 0; t <= 1.001; t += 0.05) {
      const q = p + Math.sin(t * Math.PI * f + i) * amp;
      if (vertical) { if (t === 0) g.moveTo(q, 0); else g.lineTo(q, t * h); }
      else { if (t === 0) g.moveTo(0, q); else g.lineTo(t * w, q); }
    }
    g.stroke();
  }
  g.globalAlpha = 1;
}

/** raw birch/pine plywood sheet (back of cut-outs, set flats) */
export const plywood = (seed = 1, base = "#d8b886") =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    // broad veneer colour bands
    for (let i = 0; i < 7; i++) {
      g.fillStyle = `rgba(${150 + r() * 60},${100 + r() * 40},${50 + r() * 30},${0.08 + r() * 0.1})`;
      g.fillRect(0, r() * h, w, 10 + r() * 40);
    }
    grainLines(g, w, h, r, 70, "#8a5a2b", 0.22);
    // knots and football patches
    for (let i = 0; i < 3; i++) {
      const x = r() * w, y = r() * h;
      g.fillStyle = "rgba(120,70,30,0.35)";
      g.beginPath(); g.ellipse(x, y, 5 + r() * 5, 3 + r() * 3, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "rgba(110,70,35,0.25)";
      for (let k = 1; k < 4; k++) { g.beginPath(); g.ellipse(x, y, 5 + k * 6, 3 + k * 3, 0, 0, Math.PI * 2); g.stroke(); }
    }
    g.fillStyle = "rgba(235,210,160,0.35)";
    const px = r() * w, py = r() * h;
    g.beginPath(); g.ellipse(px, py, 16, 6, 0, 0, Math.PI * 2); g.fill();
    speckle(g, w, h, r, 900, 0.06);
    // sheet edge seam
    g.fillStyle = "rgba(90,60,30,0.35)";
    g.fillRect(0, 0, 2, h);
  });

/** 2x4 lumber / studs */
export const lumber = (seed = 3) =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#c9a26b";
    g.fillRect(0, 0, w, h);
    grainLines(g, w, h, r, 40, "#7a5028", 0.3, true);
    speckle(g, w, h, r, 300, 0.07);
  });

/** big painted cartoon sky backdrop on the studio walls */
export const skyMural = (seed = 12) =>
  makeTex(512, 256, (g, w, h) => {
    const r = rng(seed);
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, "#3f9fe8");
    grd.addColorStop(0.55, "#7cc4f5");
    grd.addColorStop(1, "#cdeeff");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    // brush strokes in the paint
    for (let i = 0; i < 90; i++) {
      g.strokeStyle = `rgba(255,255,255,${0.03 + r() * 0.04})`;
      g.lineWidth = 3 + r() * 8;
      const x = r() * w, y = r() * h * 0.8;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + 20 + r() * 50, y + (r() - 0.5) * 6); g.stroke();
    }
    // cartoon clouds with shaded bellies
    const cloud = (cx: number, cy: number, s: number) => {
      const blobs: [number, number, number][] = [];
      const n = 4 + Math.floor(r() * 3);
      for (let k = 0; k < n; k++) blobs.push([cx + (k - n / 2) * s * 0.75, cy - Math.sin((k / (n - 1)) * Math.PI) * s * 0.55, s * (0.55 + r() * 0.35)]);
      g.fillStyle = "#a9cfe9";
      for (const [x, y, rr] of blobs) { g.beginPath(); g.arc(x + 3, y + 6, rr, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = "#ffffff";
      for (const [x, y, rr] of blobs) { g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = "#dcecf7";
      g.fillRect(cx - n * s * 0.45, cy + s * 0.2, n * s * 0.9, s * 0.25);
      g.strokeStyle = "rgba(90,140,190,0.5)";
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(cx - n * s * 0.45, cy + s * 0.45); g.lineTo(cx + n * s * 0.4, cy + s * 0.45); g.stroke();
    };
    for (let i = 0; i < 6; i++) cloud(40 + i * 85 + r() * 30, 40 + r() * 70, 14 + r() * 10);
    // far hills, near hills with painted tree dots and a fence line
    const hill = (base: number, amp: number, col: string, ph: number) => {
      g.fillStyle = col;
      g.beginPath(); g.moveTo(0, h);
      for (let x = 0; x <= w; x += 8) g.lineTo(x, base - Math.sin((x / w) * Math.PI * 2 * 2 + ph) * amp - Math.sin((x / w) * Math.PI * 2 * 5 + ph * 2) * amp * 0.3);
      g.lineTo(w, h); g.fill();
    };
    hill(h - 62, 14, "#8fcf6a", seed);
    for (let i = 0; i < 14; i++) {
      const x = r() * w, y = h - 70 + r() * 16;
      g.fillStyle = "#5e9e42"; g.beginPath(); g.arc(x, y, 5 + r() * 5, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#7a5230"; g.fillRect(x - 1, y + 4, 2, 6);
    }
    hill(h - 34, 10, "#6db84b", seed + 1.3);
    g.strokeStyle = "rgba(255,255,255,0.75)";
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, h - 22); g.lineTo(w, h - 22); g.moveTo(0, h - 15); g.lineTo(w, h - 15); g.stroke();
    for (let x = 4; x < w; x += 18) g.fillRect(x, h - 26, 3, 16);
    // seams between painted flats + a little grime near the floor
    g.fillStyle = "rgba(40,60,90,0.18)";
    for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 2, h);
    const gg = g.createLinearGradient(0, h - 12, 0, h);
    gg.addColorStop(0, "rgba(60,50,30,0)");
    gg.addColorStop(1, "rgba(60,50,30,0.35)");
    g.fillStyle = gg;
    g.fillRect(0, h - 12, w, 12);
  });

export const turf = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(31);
    g.fillStyle = "#467f28";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 3000; i++) {
      g.strokeStyle = ["#5a9a36", "#3f7424", "#6aa93f", "#4b8a2c", "#356a1f"][Math.floor(r() * 5)];
      g.lineWidth = 1;
      const x = r() * w, y = r() * h, a = -Math.PI / 2 + (r() - 0.5) * 0.9, l = 3 + r() * 4;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
  });

export const dirt = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(41);
    g.fillStyle = "#86603f";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      const x = r() * w, y = r() * h, rr = 20 + r() * 50;
      const gr = g.createRadialGradient(x, y, 0, x, y, rr);
      gr.addColorStop(0, `rgba(${r() < 0.5 ? "60,40,20" : "170,130,90"},0.25)`);
      gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    for (let i = 0; i < 700; i++) {
      g.fillStyle = `rgba(${90 + r() * 70},${60 + r() * 40},${30 + r() * 25},${0.3 + r() * 0.4})`;
      g.beginPath(); g.ellipse(r() * w, r() * h, 1 + r() * 3, 0.8 + r() * 2, r() * 3, 0, Math.PI * 2); g.fill();
    }
    for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(${180 + r() * 40},${160 + r() * 30},${130},${0.5})`; g.fillRect(r() * w, r() * h, 2, 2); }
    speckle(g, w, h, r, 1600, 0.12);
  });

export const soil = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(43);
    g.fillStyle = "#4a3120";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) {
      g.fillStyle = `rgba(${40 + r() * 50},${25 + r() * 30},${15 + r() * 20},${0.5})`;
      g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 4, 0, Math.PI * 2); g.fill();
    }
    speckle(g, w, h, r, 1200, 0.1);
  });

/** straw fibres (bales, loose straw) */
export const straw = (seed = 8, dir = 0) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#c9a445";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1500; i++) {
      g.strokeStyle = ["#e2c268", "#b08a2c", "#f0d88c", "#9c7a24", "#d6b454"][Math.floor(r() * 5)];
      g.lineWidth = 0.8 + r() * 1.4;
      const x = r() * w, y = r() * h, a = dir + (r() - 0.5) * 0.7, l = 10 + r() * 22;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    speckle(g, w, h, r, 600, 0.1);
  });

/** swirl on the end of a round bale */
export const baleEnd = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(9);
    g.fillStyle = "#c29a3e";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const rad = r() * 128, a = r() * Math.PI * 2, l = 0.2 + r() * 0.3;
      g.strokeStyle = ["#e2c268", "#a8822a", "#f0d88c", "#8f6c1f"][Math.floor(r() * 4)];
      g.lineWidth = 1 + r();
      g.beginPath(); g.arc(128, 128, rad, a, a + l); g.stroke();
    }
    g.strokeStyle = "rgba(90,60,20,0.35)";
    g.lineWidth = 2;
    g.beginPath();
    for (let t = 0; t < 30; t += 0.05) { const rr = t * 4.2; g.lineTo(128 + Math.cos(t) * rr, 128 + Math.sin(t) * rr); }
    g.stroke();
    void w; void h;
  });

/** red barn boards (vertical), worn paint */
export const barnBoards = (seed = 5, base = "#a3241b") =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    const bw = w / 6;
    for (let i = 0; i < 6; i++) {
      g.fillStyle = `rgba(${r() < 0.5 ? "0,0,0" : "255,255,255"},${0.03 + r() * 0.06})`;
      g.fillRect(i * bw, 0, bw, h);
      g.fillStyle = "rgba(40,5,5,0.7)";
      g.fillRect(i * bw, 0, 3, h);
      g.fillStyle = "rgba(255,200,190,0.12)";
      g.fillRect(i * bw + 3, 0, 1, h);
    }
    grainLines(g, w, h, r, 50, "#4a0d08", 0.25, true);
    // paint wear revealing wood
    for (let i = 0; i < 30; i++) {
      g.fillStyle = `rgba(190,140,90,${0.1 + r() * 0.25})`;
      g.beginPath(); g.ellipse(r() * w, r() * h, 1 + r() * 6, 1 + r() * 2, r() * 3, 0, Math.PI * 2); g.fill();
    }
    speckle(g, w, h, r, 900, 0.07);
  });

/** painted / weathered boards (fences, stalls) */
export const boards = (base: string, seed = 6, wear = 0.25) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    grainLines(g, w, h, r, 60, "#3a2514", 0.18 + wear * 0.3);
    for (let i = 0; i < 40 * wear; i++) {
      g.fillStyle = `rgba(120,85,50,${0.1 + r() * 0.25})`;
      g.beginPath(); g.ellipse(r() * w, r() * h, 2 + r() * 10, 1 + r() * 2, 0, 0, Math.PI * 2); g.fill();
    }
    speckle(g, w, h, r, 1000, 0.07);
  });

/** pine crate slats */
export const crate = (seed = 17) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#3a2a18";
    g.fillRect(0, 0, w, h);
    const n = 4;
    for (let i = 0; i < n; i++) {
      const y = (i * h) / n + 3;
      g.fillStyle = `hsl(${32 + r() * 6},${45 + r() * 10}%,${58 + r() * 8}%)`;
      g.fillRect(0, y, w, h / n - 6);
      g.save(); g.beginPath(); g.rect(0, y, w, h / n - 6); g.clip();
      grainLines(g, w, h, r, 14, "#6b4520", 0.35);
      g.restore();
      g.fillStyle = "#2a2a2a";
      g.fillRect(12, y + 10, 3, 3); g.fillRect(w - 16, y + 10, 3, 3);
    }
    g.font = "bold 26px sans-serif";
    g.fillStyle = "rgba(40,30,20,0.55)";
    g.fillText("FARM", 90, h / 2 + 10);
  });

export const studioFloor = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(51);
    g.fillStyle = "#4f4e4b";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) {
      const x = r() * w, y = r() * h, rr = 30 + r() * 60;
      const gr = g.createRadialGradient(x, y, 0, x, y, rr);
      gr.addColorStop(0, `rgba(${r() < 0.5 ? "0,0,0" : "255,255,255"},0.06)`);
      gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    speckle(g, w, h, r, 2500, 0.06);
    g.fillStyle = "rgba(20,20,20,0.35)";
    g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h);
  });

export const blackWall = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(61);
    g.fillStyle = "#26262a";
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, r, 3000, 0.05);
    g.fillStyle = "rgba(0,0,0,0.4)";
    g.fillRect(0, 0, 3, h); g.fillRect(0, 0, w, 3);
  });

export const burlap = (base = "#b89a6a", seed = 71) =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 4) { g.fillStyle = `rgba(0,0,0,${0.1 + r() * 0.08})`; g.fillRect(0, y, w, 1); }
    for (let x = 0; x < w; x += 4) { g.fillStyle = `rgba(0,0,0,${0.08 + r() * 0.08})`; g.fillRect(x, 0, 1, h); }
    speckle(g, w, h, r, 400, 0.1);
  });

export const galvanized = () =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(81);
    g.fillStyle = "#a9adb0";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) {
      g.fillStyle = `rgba(${r() < 0.5 ? "80,85,90" : "220,225,230"},${0.08 + r() * 0.12})`;
      const x = r() * w, y = r() * h, s = 4 + r() * 10;
      g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s, y); g.lineTo(x, y + s); g.lineTo(x - s, y); g.fill();
    }
    speckle(g, w, h, r, 500, 0.06);
  });

export const leafy = (base = "#79b14a", seed = 91) =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) {
      g.strokeStyle = "rgba(230,255,200,0.35)";
      g.lineWidth = 1.5;
      const x = r() * w, y = r() * h;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 10, y - 8, x + 20 + r() * 10, y + (r() - 0.5) * 10); g.stroke();
    }
    speckle(g, w, h, r, 500, 0.12);
  });

export const flightCase = () =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(101);
    g.fillStyle = "#1c1c1e";
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, r, 900, 0.07);
    g.fillStyle = "#9a9ea3";
    g.fillRect(0, 0, w, 6); g.fillRect(0, h - 6, w, 6); g.fillRect(0, 0, 6, h); g.fillRect(w - 6, 0, 6, h);
    g.fillStyle = "#c7c9cc";
    for (const [x, y] of [[0, 0], [w - 14, 0], [0, h - 14], [w - 14, h - 14]]) g.fillRect(x, y, 14, 14);
  });

export const signText = (text: string, bg: string, fg: string, w = 256, h = 96, font = "bold 52px 'Trebuchet MS', sans-serif") =>
  makeTex(w, h, (g) => {
    const r = rng(text.length * 7);
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    speckle(g, w, h, r, 500, 0.08);
    g.strokeStyle = fg;
    g.lineWidth = 5;
    g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = fg;
    g.font = font;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, w / 2, h / 2 + 3);
  });

export const clapper = () =>
  makeTex(128, 128, (g, w, h) => {
    g.fillStyle = "#151515";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#fff" : "#151515"; g.beginPath(); g.moveTo(i * 20, 0); g.lineTo(i * 20 + 20, 0); g.lineTo(i * 20 + 8, 26); g.lineTo(i * 20 - 12, 26); g.fill(); }
    g.strokeStyle = "#ddd"; g.lineWidth = 2;
    for (let y = 50; y < h; y += 26) { g.beginPath(); g.moveTo(6, y); g.lineTo(w - 6, y); g.stroke(); }
    g.fillStyle = "#ddd"; g.font = "bold 13px sans-serif";
    g.fillText("SCENE 12", 10, 45); g.fillText("TAKE 3", 10, 72); g.fillText("FARM", 10, 98);
  });

// ---------- standee art (painted fronts of the plywood cut-outs) ----------
// The outline polygon is given in normalised coordinates (0..1, y up) so the paint matches the cut shape.

export type Pts = [number, number][];

function pathPts(g: G, pts: Pts, w: number, h: number) {
  g.beginPath();
  pts.forEach(([u, v], i) => (i ? g.lineTo(u * w, (1 - v) * h) : g.moveTo(u * w, (1 - v) * h)));
  g.closePath();
}
function paintBase(g: G, pts: Pts, w: number, h: number, fill: string, line = "#2b2118", lw = 7) {
  g.fillStyle = "#c8a878";
  g.fillRect(0, 0, w, h);
  pathPts(g, pts, w, h);
  g.fillStyle = fill;
  g.fill();
}
function outline(g: G, pts: Pts, w: number, h: number, line = "#2b2118", lw = 7) {
  pathPts(g, pts, w, h);
  g.strokeStyle = line;
  g.lineWidth = lw;
  g.lineJoin = "round";
  g.stroke();
}
function brushWear(g: G, w: number, h: number, seed: number) {
  const r = rng(seed);
  for (let i = 0; i < 160; i++) {
    g.strokeStyle = `rgba(255,255,255,${0.03 + r() * 0.04})`;
    g.lineWidth = 2 + r() * 5;
    const x = r() * w, y = r() * h;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + 10 + r() * 30, y + (r() - 0.5) * 4); g.stroke();
  }
  speckle(g, w, h, r, 1400, 0.05);
}
const E = (g: G, w: number, h: number, u: number, v: number, ru: number, rv: number, col: string, rot = 0) => {
  g.fillStyle = col;
  g.beginPath(); g.ellipse(u * w, (1 - v) * h, ru * w, rv * h, rot, 0, Math.PI * 2); g.fill();
};

export const cowArt = (pts: Pts) =>
  makeTex(512, 352, (g, w, h) => {
    paintBase(g, pts, w, h, "#f7f4ee");
    g.save(); pathPts(g, pts, w, h); g.clip();
    E(g, w, h, 0.3, 0.62, 0.1, 0.12, "#231f1c", 0.3);
    E(g, w, h, 0.52, 0.72, 0.08, 0.09, "#231f1c", -0.4);
    E(g, w, h, 0.16, 0.5, 0.06, 0.1, "#231f1c", 0.2);
    E(g, w, h, 0.62, 0.52, 0.05, 0.07, "#231f1c");
    E(g, w, h, 0.87, 0.84, 0.05, 0.07, "#231f1c");
    E(g, w, h, 0.95, 0.68, 0.06, 0.07, "#f1a7b5"); // muzzle
    E(g, w, h, 0.36, 0.28, 0.06, 0.06, "#f1a7b5"); // udder
    g.fillStyle = "#3a3634";
    g.fillRect(0, (1 - 0.055) * h, w, 0.06 * h); // hooves
    g.fillStyle = "#1b1b1b";
    E(g, w, h, 0.9, 0.8, 0.012, 0.022, "#1b1b1b");
    E(g, w, h, 0.955, 0.69, 0.008, 0.012, "#7d3d48");
    E(g, w, h, 0.93, 0.66, 0.008, 0.012, "#7d3d48");
    g.fillStyle = "#e9dcc0";
    g.restore();
    brushWear(g, w, h, 3);
    outline(g, pts, w, h);
    g.strokeStyle = "#2b2118"; g.lineWidth = 4;
    g.beginPath(); g.arc(0.86 * w, (1 - 0.72) * h, 12, 0.3, 2.2); g.stroke();
  });

export const chickenArt = (pts: Pts, hen = true) =>
  makeTex(256, 288, (g, w, h) => {
    paintBase(g, pts, w, h, hen ? "#fbf8f1" : "#c8742e");
    g.save(); pathPts(g, pts, w, h); g.clip();
    g.fillStyle = "#e0312b";
    g.fillRect(0.58 * w, 0, 0.26 * w, (1 - 0.87) * h); // comb
    E(g, w, h, 0.8, 0.66, 0.04, 0.06, "#e0312b"); // wattle
    g.fillStyle = "#f2a51e";
    g.fillRect(0.84 * w, (1 - 0.82) * h, 0.2 * w, 0.1 * h); // beak
    g.fillRect(0, (1 - 0.24) * h, w, 0.24 * h); // legs
    E(g, w, h, 0.72, 0.8, 0.025, 0.025, "#1b1b1b");
    // wing
    E(g, w, h, 0.42, 0.44, 0.2, 0.12, hen ? "#e9e2d2" : "#8f4a1c", -0.2);
    g.strokeStyle = hen ? "#b9ad95" : "#5c2c0e"; g.lineWidth = 3;
    for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(0.42 * w, (1 - 0.4 + i * 0.04) * h, 30 - i * 6, 0.2, 1.6); g.stroke(); }
    if (!hen) { E(g, w, h, 0.12, 0.72, 0.1, 0.16, "#1f5a3a", 0.4); E(g, w, h, 0.66, 0.66, 0.08, 0.1, "#e6b23a"); }
    g.restore();
    brushWear(g, w, h, hen ? 5 : 6);
    outline(g, pts, w, h, "#2b2118", 5);
  });

export const treeArt = (pts: Pts, seed = 1, fruit = false) =>
  makeTex(384, 512, (g, w, h) => {
    const r = rng(seed);
    paintBase(g, pts, w, h, "#4f9a38");
    g.save(); pathPts(g, pts, w, h); g.clip();
    g.fillStyle = "#8a5a32";
    g.fillRect(0.38 * w, (1 - 0.38) * h, 0.24 * w, 0.38 * h);
    g.strokeStyle = "#5e3a1c"; g.lineWidth = 3;
    for (let i = 0; i < 5; i++) { const x = (0.42 + r() * 0.16) * w; g.beginPath(); g.moveTo(x, h); g.lineTo(x + (r() - 0.5) * 10, (1 - 0.36) * h); g.stroke(); }
    // canopy shading bumps
    for (let i = 0; i < 16; i++) E(g, w, h, 0.18 + r() * 0.64, 0.45 + r() * 0.5, 0.08 + r() * 0.07, 0.06 + r() * 0.05, r() < 0.5 ? "#62b046" : "#3f832c");
    for (let i = 0; i < 10; i++) E(g, w, h, 0.2 + r() * 0.6, 0.55 + r() * 0.4, 0.04, 0.03, "#7cc85a");
    if (fruit) for (let i = 0; i < 12; i++) { E(g, w, h, 0.2 + r() * 0.6, 0.5 + r() * 0.42, 0.028, 0.021, "#d8262a"); }
    g.restore();
    brushWear(g, w, h, seed + 10);
    outline(g, pts, w, h, "#24361a", 6);
  });

export const cloudArt = (pts: Pts) =>
  makeTex(384, 192, (g, w, h) => {
    paintBase(g, pts, w, h, "#ffffff");
    g.save(); pathPts(g, pts, w, h); g.clip();
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "rgba(255,255,255,0)");
    gr.addColorStop(0.6, "rgba(200,225,245,0.3)");
    gr.addColorStop(1, "rgba(150,190,225,0.8)");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.restore();
    brushWear(g, w, h, 21);
    outline(g, pts, w, h, "#7ea9cc", 5);
  });

export const sunArt = (pts: Pts) =>
  makeTex(256, 256, (g, w, h) => {
    paintBase(g, pts, w, h, "#ffb81c");
    g.save(); pathPts(g, pts, w, h); g.clip();
    E(g, w, h, 0.5, 0.5, 0.3, 0.3, "#ffd84a");
    E(g, w, h, 0.42, 0.56, 0.03, 0.045, "#3a2a12");
    E(g, w, h, 0.58, 0.56, 0.03, 0.045, "#3a2a12");
    E(g, w, h, 0.36, 0.46, 0.04, 0.025, "#ff8a5c");
    E(g, w, h, 0.64, 0.46, 0.04, 0.025, "#ff8a5c");
    g.strokeStyle = "#3a2a12"; g.lineWidth = 5;
    g.beginPath(); g.arc(0.5 * w, 0.52 * h, 26, 0.3, Math.PI - 0.3); g.stroke();
    g.restore();
    brushWear(g, w, h, 23);
    outline(g, pts, w, h, "#b56a0a", 5);
  });

/** painted barn façade: red boards, white trim, painted hayloft door */
export const barnFrontArt = (pts: Pts) =>
  makeTex(512, 384, (g, w, h) => {
    const r = rng(77);
    paintBase(g, pts, w, h, "#a3241b");
    g.save(); pathPts(g, pts, w, h); g.clip();
    const bw = w / 26;
    for (let i = 0; i < 26; i++) {
      g.fillStyle = `rgba(${r() < 0.5 ? "0,0,0" : "255,255,255"},${0.03 + r() * 0.07})`;
      g.fillRect(i * bw, 0, bw, h);
      g.fillStyle = "rgba(45,6,5,0.75)";
      g.fillRect(i * bw, 0, 2, h);
    }
    grainLines(g, w, h, r, 60, "#4a0d08", 0.2, true);
    // hayloft door painted in the gable
    const hx = 0.4 * w, hy = (1 - 0.84) * h, hw = 0.2 * w, hh = 0.2 * h;
    g.fillStyle = "#8e1d15"; g.fillRect(hx, hy, hw, hh);
    g.strokeStyle = "#f3eee2"; g.lineWidth = 8;
    g.strokeRect(hx, hy, hw, hh);
    g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + hw, hy + hh); g.moveTo(hx + hw, hy); g.lineTo(hx, hy + hh); g.stroke();
    // painted windows
    for (const u of [0.12, 0.8]) {
      const x = u * w, y = (1 - 0.46) * h, s = 0.08 * w;
      g.fillStyle = "#2c3e50"; g.fillRect(x, y, s, s);
      g.strokeStyle = "#f3eee2"; g.lineWidth = 6; g.strokeRect(x, y, s, s);
      g.beginPath(); g.moveTo(x + s / 2, y); g.lineTo(x + s / 2, y + s); g.moveTo(x, y + s / 2); g.lineTo(x + s, y + s / 2); g.stroke();
    }
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(200,150,100,${0.1 + r() * 0.2})`;
      g.beginPath(); g.ellipse(r() * w, r() * h, 1 + r() * 5, 1 + r() * 2, 0, 0, Math.PI * 2); g.fill();
    }
    g.restore();
    brushWear(g, w, h, 31);
    outline(g, pts, w, h, "#f3eee2", 12);
  });

export const pigArt = (pts: Pts) =>
  makeTex(320, 224, (g, w, h) => {
    paintBase(g, pts, w, h, "#f4a9b8");
    g.save(); pathPts(g, pts, w, h); g.clip();
    E(g, w, h, 0.97, 0.58, 0.05, 0.09, "#e98597");
    E(g, w, h, 0.965, 0.62, 0.008, 0.02, "#8a3a4a");
    E(g, w, h, 0.965, 0.53, 0.008, 0.02, "#8a3a4a");
    E(g, w, h, 0.84, 0.72, 0.018, 0.03, "#1b1b1b");
    E(g, w, h, 0.79, 0.86, 0.04, 0.07, "#e07f92", 0.4);
    E(g, w, h, 0.45, 0.5, 0.2, 0.18, "#f7bcc8");
    E(g, w, h, 0.3, 0.7, 0.07, 0.06, "#b98a6a");
    g.fillStyle = "#c46a7c"; g.fillRect(0, (1 - 0.06) * h, w, 0.06 * h);
    g.restore();
    g.strokeStyle = "#2b2118"; g.lineWidth = 4;
    g.beginPath(); g.arc(0.05 * w, (1 - 0.66) * h, 9, 0, Math.PI * 1.6); g.stroke();
    brushWear(g, w, h, 61);
    outline(g, pts, w, h, "#5a2a32", 5);
  });

/** a cartoon windmill / signpost style board for variety */
export const bushArt = (pts: Pts) =>
  makeTex(256, 160, (g, w, h) => {
    const r = rng(55);
    paintBase(g, pts, w, h, "#3f8a33");
    g.save(); pathPts(g, pts, w, h); g.clip();
    for (let i = 0; i < 14; i++) E(g, w, h, r(), 0.3 + r() * 0.6, 0.1, 0.12, r() < 0.5 ? "#4fa23e" : "#2f6f27");
    for (let i = 0; i < 8; i++) E(g, w, h, 0.1 + r() * 0.8, 0.3 + r() * 0.5, 0.025, 0.04, ["#ff6b8a", "#ffe066", "#ffffff"][i % 3]);
    g.restore();
    brushWear(g, w, h, 57);
    outline(g, pts, w, h, "#1f4a1b", 5);
  });

export type { PaintTex };
