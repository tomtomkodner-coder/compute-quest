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


// =============================================================================================
// REAL-GAME look (teal sky mural hall, mown grass carpet, Holstein standees, striped balloon…)

/** teal painted sky mural with dark-teal cloud washes, white cloud outlines, green hills and fence doodles.
 *  512×256 covers ~16 m × 8 m of wall. */
export const tealMural = (seed = 3) =>
  makeTex(512, 256, (g, w, h) => {
    const r = rng(seed);
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, "#0b9ea3");
    grd.addColorStop(0.5, "#13b3ad");
    grd.addColorStop(1, "#22c2b0");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    // big soft darker washes (painted cloud shadows)
    for (let i = 0; i < 14; i++) {
      const x = r() * w, y = r() * h * 0.7, rx = 30 + r() * 70, ry = 12 + r() * 26;
      const gr = g.createRadialGradient(x, y, 0, x, y, rx);
      gr.addColorStop(0, `rgba(14,120,150,${0.35 + r() * 0.25})`);
      gr.addColorStop(1, "rgba(14,120,150,0)");
      g.save(); g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y);
      g.fillStyle = gr; g.fillRect(x - rx, y - rx, rx * 2, rx * 2);
      g.restore();
    }
    // brush strokes
    for (let i = 0; i < 260; i++) {
      const light = r() < 0.5;
      g.strokeStyle = light ? `rgba(160,255,245,${0.04 + r() * 0.06})` : `rgba(10,90,110,${0.04 + r() * 0.07})`;
      g.lineWidth = 2 + r() * 7;
      const x = r() * w, y = r() * h * 0.85, a = (r() - 0.5) * 0.8, l = 12 + r() * 40;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * 0.5, y + Math.sin(a) * l * 0.5 + (r() - 0.5) * 6, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    // cartoon clouds: darker teal body with light rim (like the real mural)
    const cloud = (cx: number, cy: number, s: number) => {
      const n = 3 + Math.floor(r() * 3);
      const blobs: [number, number, number][] = [];
      for (let k = 0; k < n; k++) blobs.push([cx + (k - (n - 1) / 2) * s * 0.8, cy - Math.sin(((k + 0.5) / n) * Math.PI) * s * 0.5, s * (0.5 + r() * 0.35)]);
      g.fillStyle = "rgba(230,255,252,0.55)";
      for (const [x, y, rr] of blobs) { g.beginPath(); g.arc(x, y - 2, rr + 2.5, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = "rgba(20,150,170,0.9)";
      for (const [x, y, rr] of blobs) { g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = "rgba(20,150,170,0.9)";
      g.fillRect(cx - n * s * 0.42, cy - s * 0.1, n * s * 0.84, s * 0.45);
      g.fillStyle = "rgba(8,110,135,0.5)";
      g.fillRect(cx - n * s * 0.42, cy + s * 0.2, n * s * 0.84, s * 0.15);
    };
    for (let i = 0; i < 5; i++) cloud(50 + i * 100 + r() * 40, 45 + r() * 70, 12 + r() * 12);
    // hills: far lighter green, near saturated green, with dark outline
    const hill = (base: number, amp: number, col: string, ph: number, f: number) => {
      g.beginPath(); g.moveTo(0, h);
      for (let x = 0; x <= w; x += 4) g.lineTo(x, base - Math.sin((x / w) * Math.PI * 2 * f + ph) * amp - Math.sin((x / w) * Math.PI * 2 * (f * 2 + 1) + ph * 2) * amp * 0.35);
      g.lineTo(w, h); g.closePath();
      g.fillStyle = col; g.fill();
      g.strokeStyle = "rgba(20,70,30,0.45)"; g.lineWidth = 2; g.stroke();
    };
    hill(h - 78, 16, "#66c35a", seed * 1.7, 2);
    hill(h - 50, 13, "#3fa845", seed * 0.9 + 1, 3);
    // painted white fence doodles on the hills (the "#" marks)
    g.strokeStyle = "rgba(245,250,245,0.85)"; g.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const x = r() * (w - 30), y = h - 60 + r() * 30;
      g.beginPath();
      for (let k = 0; k < 4; k++) { g.moveTo(x + k * 6, y); g.lineTo(x + k * 6 + 1, y + 12); }
      g.moveTo(x - 2, y + 4); g.lineTo(x + 22, y + 3); g.moveTo(x - 2, y + 9); g.lineTo(x + 22, y + 8);
      g.stroke();
    }
    // grass tufts at the bottom + brush speckle
    for (let i = 0; i < 400; i++) {
      g.strokeStyle = r() < 0.5 ? "rgba(30,110,40,0.5)" : "rgba(120,210,100,0.4)";
      g.lineWidth = 1;
      const x = r() * w, y = h - r() * 44;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y - 3 - r() * 5); g.stroke();
    }
    speckle(g, w, h, r, 1800, 0.035);
  });

/** mown grass carpet: 2 stripes (light / dark) with blades; tile covers 4 m, stripes run along V */
export const grassStripes = () =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(33);
    for (let x = 0; x < w; x++) {
      const t = (x / w) * Math.PI * 2;
      const s = Math.tanh(Math.sin(t) * 3) * 0.5 + 0.5; // soft-edged bands
      const l = 27 + s * 8;
      g.fillStyle = `hsl(${96 - s * 8},${58 + s * 6}%,${l}%)`;
      g.fillRect(x, 0, 1, h);
    }
    // large mottling (wear, yellow patches)
    for (let i = 0; i < 40; i++) {
      const x = r() * w, y = r() * h, rr = 20 + r() * 60;
      const gr = g.createRadialGradient(x, y, 0, x, y, rr);
      gr.addColorStop(0, r() < 0.4 ? "rgba(190,190,70,0.16)" : "rgba(20,70,20,0.12)");
      gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    // blades
    for (let i = 0; i < 7000; i++) {
      const x = r() * w, y = r() * h;
      const c = r();
      g.strokeStyle = c < 0.3 ? "rgba(40,95,25,0.55)" : c < 0.6 ? "rgba(140,200,70,0.5)" : c < 0.9 ? "rgba(90,160,45,0.5)" : "rgba(200,200,90,0.45)";
      g.lineWidth = 1;
      const a = -Math.PI / 2 + (r() - 0.5) * 1.2, l = 2 + r() * 4;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
  });

/** dark ceiling (painted black-olive acoustic deck) */
export const darkCeiling = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(63);
    g.fillStyle = "#3a3d33";
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 32) { g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(x, 0, 2, h); }
    speckle(g, w, h, r, 2500, 0.05);
  });

/** photo-like Holstein print for the cow cut-outs */
export const holsteinArt = (pts: Pts, seed = 5) =>
  makeTex(512, 352, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#e9e3d6";
    g.fillRect(0, 0, w, h);
    pathPts(g, pts, w, h);
    g.fillStyle = "#f4f1ea";
    g.fill();
    g.save(); pathPts(g, pts, w, h); g.clip();
    // body shading (rounded belly, darker under)
    const sh = g.createLinearGradient(0, 0, 0, h);
    sh.addColorStop(0.1, "rgba(255,255,255,0)");
    sh.addColorStop(0.6, "rgba(120,110,100,0.12)");
    sh.addColorStop(0.75, "rgba(80,70,60,0.28)");
    sh.addColorStop(1, "rgba(80,70,60,0.1)");
    g.fillStyle = sh; g.fillRect(0, 0, w, h);
    // irregular black patches
    const patch = (u: number, v: number, s: number) => {
      g.fillStyle = "#16130f";
      g.beginPath();
      const n = 14;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2, rr = s * (0.65 + r() * 0.55);
        const x = u * w + Math.cos(a) * rr * 1.3, y = (1 - v) * h + Math.sin(a) * rr;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.closePath(); g.fill();
    };
    for (const [u, v, s] of [[0.2, 0.62, 34], [0.33, 0.72, 28], [0.5, 0.64, 40], [0.62, 0.74, 22], [0.14, 0.45, 20], [0.43, 0.5, 18], [0.66, 0.52, 16], [0.25, 0.25, 10], [0.7, 0.22, 9]] as const)
      patch(u + (r() - 0.5) * 0.04, v + (r() - 0.5) * 0.04, s * (0.8 + r() * 0.4));
    // head: black with a white blaze
    E(g, w, h, 0.9, 0.8, 0.075, 0.13, "#16130f", 0.5);
    E(g, w, h, 0.93, 0.76, 0.02, 0.09, "#f2eee6", 0.45);
    E(g, w, h, 0.965, 0.66, 0.04, 0.045, "#d99a9a"); // muzzle
    E(g, w, h, 0.955, 0.665, 0.007, 0.01, "#4a2626");
    E(g, w, h, 0.975, 0.66, 0.007, 0.01, "#4a2626");
    E(g, w, h, 0.83, 0.93, 0.025, 0.02, "#16130f"); // ear
    E(g, w, h, 0.835, 0.9, 0.012, 0.018, "#e8c21c"); // yellow ear tag
    E(g, w, h, 0.885, 0.85, 0.01, 0.014, "#050505");
    // udder + legs
    E(g, w, h, 0.36, 0.3, 0.06, 0.05, "#e7aeae");
    g.fillStyle = "#2b2622"; g.fillRect(0, (1 - 0.05) * h, w, 0.05 * h); // hooves
    // tail tuft
    E(g, w, h, 0.03, 0.4, 0.015, 0.04, "#16130f");
    // hair texture
    for (let i = 0; i < 900; i++) {
      g.strokeStyle = r() < 0.5 ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)";
      g.lineWidth = 1;
      const x = r() * w, y = r() * h;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + 2, y + 3); g.stroke();
    }
    g.restore();
  });

/** vertical gores for the hot-air balloon (n pairs around) */
export const gores = (a: string, b: string, n = 8) =>
  makeTex(512, 256, (g, w, h) => {
    const r = rng(7);
    const sw = w / (n * 2);
    for (let i = 0; i < n * 2; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(i * sw, 0, sw + 1, h); }
    for (let i = 0; i < n * 2; i++) { g.fillStyle = "rgba(0,0,0,0.18)"; g.fillRect(i * sw, 0, 1.5, h); }
    for (let y = 0; y < h; y += 32) { g.fillStyle = "rgba(0,0,0,0.08)"; g.fillRect(0, y, w, 1); }
    speckle(g, w, h, r, 900, 0.04);
  });

/** wicker basket weave */
export const wicker = () =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(19);
    g.fillStyle = "#8a6232";
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 16) {
      const o = (y / 8) % 2 ? 8 : 0;
      g.fillStyle = `hsl(33,${45 + r() * 10}%,${42 + r() * 10}%)`;
      g.beginPath(); g.ellipse(x + o + 8, y + 4, 8, 3.2, 0, 0, Math.PI * 2); g.fill();
    }
    speckle(g, w, h, r, 400, 0.1);
  });

/** corrugated galvanised silo sheet (horizontal ribs) */
export const corrugated = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(83);
    for (let y = 0; y < h; y++) {
      const s = Math.sin((y / 16) * Math.PI * 2);
      const l = 58 + s * 12;
      g.fillStyle = `hsl(200,4%,${l}%)`;
      g.fillRect(0, y, w, 1);
    }
    for (let x = 0; x < w; x += 64) { g.fillStyle = "rgba(40,40,40,0.35)"; g.fillRect(x, 0, 2, h); for (let y = 6; y < h; y += 16) g.fillRect(x + 5, y, 2, 2); }
    for (let i = 0; i < 40; i++) {
      const x = r() * w, y = r() * h, rr = 10 + r() * 40;
      const gr = g.createRadialGradient(x, y, 0, x, y, rr);
      gr.addColorStop(0, `rgba(${r() < 0.5 ? "90,80,60" : "230,230,230"},0.15)`);
      gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
  });

/** IBC tote: translucent white tank behind a green steel grid cage */
export const ibc = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(29);
    g.fillStyle = "#1f8a3a";
    g.fillRect(0, 0, w, h);
    const c = 4, cw = w / c;
    for (let i = 0; i < c; i++) for (let j = 0; j < c; j++) {
      g.fillStyle = `hsl(130,${40 + r() * 10}%,${30 + r() * 6}%)`;
      g.fillRect(i * cw + 6, j * cw + 6, cw - 12, cw - 12);
    }
    g.fillStyle = "#135c26";
    for (let i = 0; i <= c; i++) { g.fillRect(i * cw - 3, 0, 6, h); g.fillRect(0, i * cw - 3, w, 6); }
    g.fillStyle = "rgba(255,255,255,0.18)";
    for (let i = 0; i <= c; i++) g.fillRect(i * cw - 3, 0, 2, h);
    speckle(g, w, h, r, 900, 0.07);
  });

/** red / white circus-tent canvas stripes */
export const tentStripes = () =>
  makeTex(256, 128, (g, w, h) => {
    const r = rng(47);
    const n = 8, sw = w / n;
    for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? "#f3efe6" : "#c8211c"; g.fillRect(i * sw, 0, sw + 1, h); }
    for (let i = 0; i < 300; i++) { g.fillStyle = "rgba(0,0,0,0.05)"; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1); }
    speckle(g, w, h, r, 700, 0.05);
  });

/** loose straw-covered ridge (pale) for the pumpkin patch */
export const paleStraw = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(37);
    g.fillStyle = "#c7b79a";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) {
      g.strokeStyle = ["#ddd0b5", "#a8977a", "#e8dcc2", "#b9a584", "#8f7c5f"][Math.floor(r() * 5)];
      g.lineWidth = 0.8 + r() * 1.2;
      const x = r() * w, y = r() * h, a = r() * Math.PI, l = 4 + r() * 10;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    speckle(g, w, h, r, 1000, 0.08);
  });

/** pumpkin skin with ribs (u around, v top→bottom) */
export const pumpkinSkin = (base: string, rib: string, seed = 11) =>
  makeTex(256, 128, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    const n = 10;
    for (let i = 0; i < n; i++) {
      const x = (i / n) * w;
      const gr = g.createLinearGradient(x, 0, x + w / n, 0);
      gr.addColorStop(0, rib); gr.addColorStop(0.18, "rgba(0,0,0,0)"); gr.addColorStop(0.82, "rgba(0,0,0,0)"); gr.addColorStop(1, rib);
      g.fillStyle = gr; g.fillRect(x, 0, w / n, h);
    }
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,230,150" : "120,50,0"},0.12)`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 3); }
    const top = g.createLinearGradient(0, 0, 0, h);
    top.addColorStop(0, "rgba(90,70,10,0.35)"); top.addColorStop(0.15, "rgba(0,0,0,0)"); top.addColorStop(0.9, "rgba(0,0,0,0)"); top.addColorStop(1, "rgba(60,40,0,0.3)");
    g.fillStyle = top; g.fillRect(0, 0, w, h);
  });

/** white painted wood (fences, trims) with light wear */
export const whitePaint = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(53);
    g.fillStyle = "#e9ebe6";
    g.fillRect(0, 0, w, h);
    grainLines(g, w, h, r, 40, "#9aa09a", 0.12);
    for (let i = 0; i < 25; i++) {
      g.fillStyle = `rgba(110,100,80,${0.05 + r() * 0.1})`;
      g.beginPath(); g.ellipse(r() * w, r() * h, 2 + r() * 12, 1 + r() * 2, 0, 0, Math.PI * 2); g.fill();
    }
    speckle(g, w, h, r, 900, 0.04);
  });

/** yellow painted lumber (standee A-frames) */
export const yellowLumber = () =>
  makeTex(128, 128, (g, w, h) => {
    const r = rng(57);
    g.fillStyle = "#e3b43a";
    g.fillRect(0, 0, w, h);
    grainLines(g, w, h, r, 22, "#9c6f14", 0.3);
    speckle(g, w, h, r, 400, 0.06);
  });

export type { PaintTex };
