// Art Gallery — canvas textures: Roman floor mosaic, silk damask, vault coffers.
import { makeTex } from "../../textures";
import { rng, specks, blotches } from "./museum";

type G = CanvasRenderingContext2D;

/** Greek-key (meander) band along a square ring */
function meander(g: G, x0: number, y0: number, size: number, band: number, col: string) {
  const u = band / 5;
  g.strokeStyle = col;
  g.lineWidth = u * 0.9;
  g.lineCap = "square";
  const n = Math.floor(size / (u * 5));
  const step = size / n;
  const key = (px: number, py: number, dx: number, dy: number, nx: number, ny: number) => {
    // one key unit along direction (dx,dy), normal (nx,ny)
    const P = (a: number, b: number) => [px + dx * a * step / 5 + nx * b * u, py + dy * a * step / 5 + ny * b * u] as const;
    const pts = [P(0, 4), P(0, 0.5), P(4, 0.5), P(4, 3.5), P(1.5, 3.5), P(1.5, 2), P(2.8, 2)];
    g.beginPath();
    g.moveTo(...pts[0]);
    for (const p of pts.slice(1)) g.lineTo(...p);
    g.stroke();
    g.beginPath();
    g.moveTo(...P(0, 4.3));
    g.lineTo(...P(5, 4.3));
    g.stroke();
  };
  for (let i = 0; i < n; i++) {
    key(x0 + i * step, y0, 1, 0, 0, 1);
    key(x0 + size - i * step, y0 + size, -1, 0, 0, -1);
    key(x0, y0 + size - i * step, 0, -1, 1, 0);
    key(x0 + size, y0 + i * step, 0, 1, -1, 0);
  }
}

/** Roman-style floor mosaic medallion (native UVs, one image per plane) */
export const mosaic = () =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(77);
    const cream = "#e9dcc0", ochre = "#c98f3a", terra = "#a4442c", black = "#26201c", blue = "#2f5a78", green = "#5f7a45";
    g.fillStyle = cream;
    g.fillRect(0, 0, w, h);
    // outer border bands
    g.fillStyle = black;
    g.fillRect(6, 6, w - 12, h - 12);
    g.fillStyle = terra;
    g.fillRect(14, 14, w - 28, h - 28);
    g.fillStyle = cream;
    g.fillRect(22, 22, w - 44, h - 44);
    meander(g, 30, 30, w - 60, 30, black);
    g.fillStyle = black;
    g.fillRect(64, 64, w - 128, h - 128);
    g.fillStyle = cream;
    g.fillRect(70, 70, w - 140, h - 140);
    const cx = w / 2, cy = h / 2;
    // corner fans
    for (const [x, y, a0] of [[70, 70, 0], [w - 70, 70, Math.PI / 2], [w - 70, h - 70, Math.PI], [70, h - 70, -Math.PI / 2]] as const) {
      for (let k = 4; k > 0; k--) {
        g.fillStyle = k % 2 ? ochre : terra;
        g.beginPath();
        g.moveTo(x, y);
        g.arc(x, y, k * 14, a0, a0 + Math.PI / 2);
        g.fill();
      }
    }
    // concentric rings
    const ring = (rad: number, col: string) => { g.fillStyle = col; g.beginPath(); g.arc(cx, cy, rad, 0, Math.PI * 2); g.fill(); };
    ring(180, black); ring(174, ochre); ring(160, cream);
    // wave band (running dog)
    g.fillStyle = blue;
    for (let i = 0; i < 28; i++) {
      const an = (i / 28) * Math.PI * 2;
      g.beginPath();
      g.arc(cx + Math.cos(an) * 146, cy + Math.sin(an) * 146, 9, 0, Math.PI * 2);
      g.fill();
    }
    ring(132, black); ring(127, terra); ring(118, cream);
    // eight-petal rosette star
    for (let i = 0; i < 16; i++) {
      const an = (i / 16) * Math.PI * 2;
      g.fillStyle = i % 2 ? green : terra;
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(an - 0.17) * 70, cy + Math.sin(an - 0.17) * 70);
      g.lineTo(cx + Math.cos(an) * (i % 2 ? 95 : 112), cy + Math.sin(an) * (i % 2 ? 95 : 112));
      g.lineTo(cx + Math.cos(an + 0.17) * 70, cy + Math.sin(an + 0.17) * 70);
      g.closePath();
      g.fill();
    }
    ring(60, black); ring(55, ochre); ring(40, cream); ring(26, blue); ring(12, ochre);
    // tesserae: per-cell colour jitter + grout lines
    const S = 6;
    const Q = 6;
    const buckets: number[][] = Array.from({ length: Q * 2 + 1 }, () => []);
    for (let y = 0; y < h; y += S) for (let x = 0; x < w; x += S) buckets[Math.floor(r() * (Q * 2 + 1))].push(x, y);
    buckets.forEach((b, bi) => {
      const v = ((bi - Q) / Q) * 0.12;
      g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
      for (let i = 0; i < b.length; i += 2) g.fillRect(b[i], b[i + 1], S, S);
    });
    g.fillStyle = "rgba(60,45,30,0.3)";
    for (let i = 0; i < w; i += S) { g.fillRect(i, 0, 1, h); g.fillRect(0, i, w, 1); }
  });

/** silk damask wall covering */
export const damask = (bg: string, fg: string, seed = 5) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = fg;
    const motif = (cx: number, cy: number, s: number) => {
      g.beginPath();
      g.moveTo(cx, cy - 56 * s);
      g.bezierCurveTo(cx + 34 * s, cy - 30 * s, cx + 40 * s, cy + 10 * s, cx, cy + 56 * s);
      g.bezierCurveTo(cx - 40 * s, cy + 10 * s, cx - 34 * s, cy - 30 * s, cx, cy - 56 * s);
      g.fill();
      g.save();
      g.globalCompositeOperation = "destination-out";
      g.beginPath();
      g.ellipse(cx, cy, 12 * s, 26 * s, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
      g.beginPath();
      g.ellipse(cx, cy, 5 * s, 12 * s, 0, 0, Math.PI * 2);
      g.fill();
      for (const sx of [-1, 1]) {
        g.beginPath();
        g.ellipse(cx + sx * 34 * s, cy - 36 * s, 6 * s, 16 * s, sx * 0.7, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(cx + sx * 30 * s, cy + 40 * s, 5 * s, 12 * s, -sx * 0.6, 0, Math.PI * 2);
        g.fill();
      }
    };
    for (const [x, y] of [[64, 64], [192, 192], [192, -64], [64, 320], [-64, 192], [320, 192]] as const) motif(x, y, 1);
    for (const [x, y] of [[192, 64], [64, 192], [320, 64], [-64, 64], [192, 320], [64, -64]] as const) {
      g.beginPath();
      g.arc(x, y, 7, 0, Math.PI * 2);
      g.fill();
    }
    // restore bg where destination-out punched holes
    g.globalCompositeOperation = "destination-over";
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = "source-over";
    blotches(g, w, h, r, 12, 0.05, 40);
    specks(g, w, h, r, 1500, 0.05, 1);
  });

/** vault coffers: square recessed panels with a gilded rosette */
export const coffer = (light: string, dark: string, gold: string) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(9);
    g.fillStyle = light;
    g.fillRect(0, 0, w, h);
    for (let k = 0; k < 4; k++) {
      const m = 22 + k * 14;
      const gr = g.createLinearGradient(0, m, 0, h - m);
      gr.addColorStop(0, k % 2 ? dark : light);
      gr.addColorStop(1, k % 2 ? light : dark);
      g.fillStyle = gr;
      g.globalAlpha = 0.5 + k * 0.12;
      g.fillRect(m, m, w - 2 * m, h - 2 * m);
    }
    g.globalAlpha = 1;
    g.fillStyle = dark;
    g.fillRect(78, 78, 100, 100);
    g.fillStyle = gold;
    for (let i = 0; i < 8; i++) {
      const an = (i / 8) * Math.PI * 2;
      g.beginPath();
      g.ellipse(128 + Math.cos(an) * 20, 128 + Math.sin(an) * 20, 16, 7, an, 0, Math.PI * 2);
      g.fill();
    }
    g.beginPath();
    g.arc(128, 128, 10, 0, Math.PI * 2);
    g.fill();
    specks(g, w, h, r, 700, 0.05, 1);
  });
