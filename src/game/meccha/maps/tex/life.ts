// "Life" details shared by the maps: readable letters, sticky notes, posters, newspapers, nameplates, labels, menus,
// graffiti, photos, calendars, receipts. Every item of a map is drawn into ONE canvas atlas, and all placements are
// merged into at most three meshes (paper = opaque, decal = alpha-tested, stack = paper-edge boxes), so a map can add
// dozens of readable props for ~3 draw calls.
import * as THREE from "three";
import { makeTex, type PaintTex } from "../../textures";
import type { Kit, Mat } from "../kit";

type G = CanvasRenderingContext2D;
type V3 = [number, number, number];
export type LifeDraw = (g: G, w: number, h: number, r: () => number) => void;

const CJK = "'Hiragino Sans','Yu Gothic','Noto Sans JP','Noto Sans CJK JP',IPAGothic,'WenQuanYi Zen Hei',sans-serif";
export const HAND = `'Segoe Print','Bradley Hand','Comic Sans MS','Chalkboard SE','Marker Felt',cursive,${CJK}`;
export const SERIF = `Georgia,'Times New Roman','Liberation Serif','DejaVu Serif',serif,${CJK}`;
export const SANS = `'Helvetica Neue',Arial,'Liberation Sans','DejaVu Sans',sans-serif,${CJK}`;
export const BOLD = `Impact,'Arial Black','Liberation Sans','DejaVu Sans',sans-serif,${CJK}`;
export const MONO = `'Courier New','Liberation Mono','DejaVu Sans Mono',monospace,${CJK}`;
export const JP = `'Hiragino Mincho ProN','Yu Mincho','Noto Serif JP','IPAMincho',IPAGothic,'WenQuanYi Zen Hei',serif`;
export const JPS = CJK;

export function lrng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// ---------------------------------------------------------------- drawing helpers
/** paper background with speckles, soft stains and a darker rim (age 0..1) */
export function paperBg(g: G, w: number, h: number, r: () => number, base = "#f5f0e3", age = 0.3) {
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 40 + age * 120; i++) {
    g.fillStyle = r() < 0.5 ? `rgba(90,70,40,${0.03 + r() * 0.06 * (0.4 + age)})` : `rgba(255,255,255,${0.05 + r() * 0.08})`;
    const s = 1 + r() * 2;
    g.fillRect(r() * w, r() * h, s, s);
  }
  for (let i = 0; i < Math.round(age * 4); i++) {
    const x = r() * w, y = r() * h, rr = (0.1 + r() * 0.25) * Math.min(w, h);
    const gr = g.createRadialGradient(x, y, rr * 0.6, x, y, rr);
    gr.addColorStop(0, `rgba(150,110,50,${0.04 * age})`);
    gr.addColorStop(0.85, `rgba(140,95,40,${0.12 * age})`);
    gr.addColorStop(1, "rgba(140,95,40,0)");
    g.fillStyle = gr;
    g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  const e = Math.min(w, h) * 0.12;
  const rim = g.createLinearGradient(0, 0, e, 0);
  rim.addColorStop(0, `rgba(110,80,40,${0.1 + age * 0.15})`);
  rim.addColorStop(1, "rgba(110,80,40,0)");
  g.fillStyle = rim; g.fillRect(0, 0, e, h);
  g.save(); g.translate(w, 0); g.scale(-1, 1); g.fillRect(0, 0, e, h); g.restore();
}
/** fits a font so `text` is at most maxW wide */
export function fitFont(g: G, text: string, maxW: number, size: number, family: string, weight = "") {
  // one measurement at the requested size, then scale (every distinct font string costs a font lookup)
  g.font = `${weight} ${size}px ${family}`;
  const tw = g.measureText(text).width;
  if (tw <= maxW) return size;
  const s = Math.max(6, Math.floor((size * maxW) / tw));
  g.font = `${weight} ${s}px ${family}`;
  return s;
}
/** word-wrapped text (\n = new paragraph); CJK text wraps per character. returns the next y */
export function wrap(g: G, text: string, x: number, y: number, maxW: number, lh: number, r?: () => number, jitter = 0) {
  for (const para of text.split("\n")) {
    const cjk = /[　-鿿＀-￯]/.test(para);
    const words = cjk ? [...para] : para.split(" ");
    let line = "";
    const flush = () => {
      if (jitter && r) {
        g.save(); g.translate(x + (r() - 0.5) * jitter, y + (r() - 0.5) * jitter); g.rotate((r() - 0.5) * 0.02 * jitter);
        g.fillText(line, 0, 0); g.restore();
      } else g.fillText(line, x, y);
      y += lh;
    };
    for (const wd of words) {
      const t = line ? (cjk ? line + wd : line + " " + wd) : wd;
      if (g.measureText(t).width > maxW && line) { flush(); line = wd; } else line = t;
    }
    flush();
  }
  return y;
}
export function tape(g: G, x: number, y: number, w: number, h: number, a: number, col = "rgba(236,226,190,0.78)") {
  g.save(); g.translate(x, y); g.rotate(a);
  g.fillStyle = col; g.fillRect(-w / 2, -h / 2, w, h);
  g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(-w / 2, -h / 2, w, h * 0.3);
  g.restore();
}
export function pin(g: G, x: number, y: number, col = "#d23a2e") {
  g.fillStyle = "rgba(0,0,0,0.3)"; g.beginPath(); g.arc(x + 2, y + 3, 6, 0, Math.PI * 2); g.fill();
  const gr = g.createRadialGradient(x - 2, y - 2, 1, x, y, 7);
  gr.addColorStop(0, "#fff"); gr.addColorStop(0.3, col); gr.addColorStop(1, "#000");
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill();
}
/** grime/wear for signs and posters: scratches, dirt at the bottom, peeled corners */
export function wear(g: G, w: number, h: number, r: () => number, amt = 0.5) {
  if (amt <= 0) return;
  const gr = g.createLinearGradient(0, h * 0.55, 0, h);
  gr.addColorStop(0, "rgba(60,45,25,0)"); gr.addColorStop(1, `rgba(60,45,25,${0.28 * amt})`);
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.strokeStyle = `rgba(255,255,255,${0.25 * amt})`; g.lineWidth = 1;
  for (let i = 0; i < 12 * amt; i++) { const x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 40, y + (r() - 0.5) * 10); g.stroke(); }
  for (let i = 0; i < 30 * amt; i++) { g.fillStyle = `rgba(40,30,20,${0.1 + r() * 0.2})`; const s = 1 + r() * 3; g.fillRect(r() * w, r() * h, s, s); }
}
const sText = (g: G, t: string, x: number, y: number) => g.fillText(t, x, y);
function centered(g: G, t: string, y: number, w: number, size: number, family: string, weight = "", maxW = w * 0.88) {
  fitFont(g, t, maxW, size, family, weight);
  g.textAlign = "center"; sText(g, t, w / 2, y); g.textAlign = "left";
}

/** the game's mascot: a little chameleon (for posters, stickers, logos) */
export function drawChameleon(g: G, cx: number, cy: number, s: number, body = "#4cbf4c", eye = "#fff") {
  g.save(); g.translate(cx, cy); g.scale(s / 100, s / 100);
  g.fillStyle = body; g.strokeStyle = body; g.lineCap = "round";
  g.lineWidth = 12; g.beginPath(); // curled tail
  g.moveTo(-30, 5); g.bezierCurveTo(-70, 10, -80, 45, -55, 50); g.bezierCurveTo(-40, 52, -38, 35, -50, 33); g.stroke();
  g.beginPath(); g.ellipse(0, 0, 42, 26, -0.1, 0, Math.PI * 2); g.fill(); // body
  g.beginPath(); g.moveTo(25, -18); g.lineTo(62, -8); g.lineTo(58, 12); g.lineTo(28, 16); g.fill(); // head
  g.beginPath(); g.moveTo(5, -24); g.lineTo(35, -34); g.lineTo(30, -16); g.fill(); // crest
  g.lineWidth = 7; for (const lx of [-20, 18]) { g.beginPath(); g.moveTo(lx, 18); g.lineTo(lx + 6, 36); g.lineTo(lx + 14, 38); g.stroke(); }
  g.fillStyle = "rgba(0,0,0,0.18)"; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(-22 + i * 11, -4 + (i % 2) * 8, 4, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = eye; g.beginPath(); g.arc(44, -4, 9, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#111"; g.beginPath(); g.arc(47, -4, 4, 0, Math.PI * 2); g.fill();
  g.restore();
}
/** a bunch of party balloons */
export function drawBalloons(g: G, w: number, h: number, r: () => number, cols = ["#e8262a", "#f4d020", "#2a4fe0", "#3aa35a", "#f07c2a"]) {
  for (let i = 0; i < 7; i++) {
    const x = w * (0.2 + r() * 0.6), y = h * (0.2 + r() * 0.35), rr = Math.min(w, h) * (0.1 + r() * 0.05);
    g.strokeStyle = "rgba(0,0,0,0.4)"; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y + rr); g.quadraticCurveTo(x + (r() - 0.5) * 20, (y + h) / 2, w / 2, h * 0.95); g.stroke();
    g.fillStyle = cols[i % cols.length]; g.beginPath(); g.ellipse(x, y, rr * 0.85, rr, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "rgba(255,255,255,0.45)"; g.beginPath(); g.ellipse(x - rr * 0.3, y - rr * 0.35, rr * 0.18, rr * 0.28, -0.4, 0, Math.PI * 2); g.fill();
  }
}

// ---------------------------------------------------------------- item options
export interface LetterO { to?: string; body: string; sign?: string; date?: string; head?: string; paper?: string; ink?: string; hand?: boolean; age?: number; ruled?: boolean; px?: [number, number]; size?: number }
export interface NoteO { text: string; color?: string; ink?: string; tape?: boolean; pin?: string; size?: number; px?: [number, number]; title?: string }
export interface PosterO { title: string; sub?: string; body?: string; footer?: string; bg: string; fg: string; accent?: string; style?: "bold" | "wanted" | "missing" | "event" | "retro" | "notice" | "band" | "sale"; art?: LifeDraw; px?: [number, number]; font?: string; wear?: number; tape?: boolean }
export interface NewsO { name: string; headline: string; sub?: string; date?: string; body?: string; px?: [number, number]; age?: number; photo?: LifeDraw }
export interface PlateO { text: string; sub?: string; style?: "brass" | "silver" | "wood" | "black" | "white" | "enamel" | "green"; px?: [number, number]; font?: string; vertical?: boolean }
export interface LabelO { text: string; sub?: string; bg?: string; fg?: string; border?: string; font?: string; px?: [number, number]; vertical?: boolean; wear?: number; stripe?: string }
export interface MenuO { title: string; items: [string, string][]; sub?: string; style?: "chalk" | "paper" | "dark" | "red"; px?: [number, number]; font?: string }
export interface GraffitiO { text: string; color: string; outline?: string; style?: "bubble" | "tag" | "stencil" | "chalk"; px?: [number, number]; font?: string; drip?: boolean; sub?: string }
export interface PhotoO { caption?: string; sky?: string; ground?: string; art?: LifeDraw; px?: [number, number] }
export interface CalendarO { month: string; year?: string; marks?: [number, string][]; start?: number; days?: number; art?: string; px?: [number, number] }
export interface CertO { title?: string; name: string; body: string; sign?: string; date?: string; border?: string; px?: [number, number] }
export interface ReceiptO { title: string; lines: [string, string][]; total?: string; foot?: string; px?: [number, number] }

interface Item { w: number; h: number; draw: LifeDraw; alpha: boolean; x: number; y: number }
interface Place { id: number; pos: V3; w: number; h: number; ry: number; rx: number; rz: number; fold: number }
export interface PutO { ry?: number; rx?: number; rz?: number; h?: number; fold?: number }

export class Life {
  private items: Item[] = [];
  private places: Place[] = [];
  private stacks: THREE.BufferGeometry[] = [];
  paperM: Mat | null = null;
  decalM: Mat | null = null;
  tex: PaintTex | null = null;
  constructor(private k: Kit, private seed = 7, private stackColor = "#ebe5d6") {}

  /** any drawing; w/h in pixels; alpha = transparent background (decal) */
  custom(w: number, h: number, draw: LifeDraw, alpha = false) {
    this.items.push({ w: Math.round(w), h: Math.round(h), draw, alpha, x: 0, y: 0 });
    return this.items.length - 1;
  }
  aspect(id: number) { return this.items[id].h / this.items[id].w; }

  // ------------------------------------------------ presets
  letter(o: LetterO) {
    const [pw, ph] = o.px ?? [256, 362];
    return this.custom(pw, ph, (g, w, h, r) => {
      paperBg(g, w, h, r, o.paper ?? "#f6f1e4", o.age ?? 0.35);
      const ink = o.ink ?? (o.hand === false ? "#222" : "#1d2a66");
      const fam = o.hand === false ? SERIF : HAND;
      const s = o.size ?? Math.round(w / 17);
      let y = 22;
      if (o.head) {
        g.fillStyle = "#6a4a2a"; centered(g, o.head, 30, w, Math.round(w / 14), SERIF, "bold");
        g.fillRect(w * 0.12, 38, w * 0.76, 1.5); y = 58;
      }
      if (o.ruled) { g.strokeStyle = "rgba(90,120,190,0.35)"; g.lineWidth = 1; for (let ly = y + s; ly < h - 8; ly += s * 1.45) { g.beginPath(); g.moveTo(8, ly + 3); g.lineTo(w - 8, ly + 3); g.stroke(); } g.strokeStyle = "rgba(210,60,60,0.4)"; g.beginPath(); g.moveTo(26, 0); g.lineTo(26, h); g.stroke(); }
      g.fillStyle = ink;
      if (o.date) { g.font = `${Math.round(s * 0.85)}px ${fam}`; g.textAlign = "right"; g.fillText(o.date, w - 16, y + s); g.textAlign = "left"; y += s * 1.6; }
      if (o.to) { g.font = `bold ${s}px ${fam}`; g.fillText(o.to, 18, y + s); y += s * 1.8; }
      g.font = `${s}px ${fam}`;
      y = wrap(g, o.body, 18, y + s, w - 34, s * 1.45, r, o.hand === false ? 0 : 1.6);
      if (o.sign) { g.font = `italic ${Math.round(s * 1.15)}px ${fam}`; g.textAlign = "right"; g.fillText(o.sign, w - 18, Math.min(h - 14, y + s * 0.8)); g.textAlign = "left"; }
    });
  }
  note(o: NoteO) {
    const [pw, ph] = o.px ?? [160, 160];
    return this.custom(pw, ph, (g, w, h, r) => {
      const c = o.color ?? "#fff27a";
      g.fillStyle = c; g.fillRect(0, 0, w, h);
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, "rgba(0,0,0,0.08)"); gr.addColorStop(0.2, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,0.12)");
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = o.ink ?? "#1f2a44";
      const s = o.size ?? Math.round(w / 8.5);
      let y = 14 + s;
      if (o.title) { g.font = `bold ${Math.round(s * 1.1)}px ${HAND}`; g.fillText(o.title, 10, y); y += s * 1.4; }
      g.font = `${s}px ${HAND}`;
      wrap(g, o.text, 10, y, w - 18, s * 1.3, r, 1.2);
      if (o.tape) tape(g, w / 2, 6, w * 0.45, 16, (r() - 0.5) * 0.2);
      if (o.pin) pin(g, w / 2, 12, o.pin);
    });
  }
  poster(o: PosterO) {
    const [pw, ph] = o.px ?? [256, 362];
    return this.custom(pw, ph, (g, w, h, r) => {
      const st = o.style ?? "bold";
      const fam = o.font ?? (st === "wanted" || st === "missing" ? SERIF : BOLD);
      const acc = o.accent ?? o.fg;
      if (st === "wanted" || st === "missing") paperBg(g, w, h, r, o.bg, 0.6);
      else { g.fillStyle = o.bg; g.fillRect(0, 0, w, h); }
      g.fillStyle = o.fg;
      if (st === "wanted" || st === "missing") {
        centered(g, o.title, h * 0.13, w, Math.round(w / 5), fam, "bold");
        g.strokeStyle = o.fg; g.lineWidth = 3; g.strokeRect(w * 0.18, h * 0.19, w * 0.64, h * 0.4);
        if (o.art) { g.save(); g.translate(w * 0.18, h * 0.19); g.beginPath(); g.rect(0, 0, w * 0.64, h * 0.4); g.clip(); o.art(g, w * 0.64, h * 0.4, r); g.restore(); }
        else { g.fillStyle = "rgba(60,40,20,0.5)"; g.beginPath(); g.arc(w / 2, h * 0.33, w * 0.12, 0, Math.PI * 2); g.fill(); g.fillRect(w * 0.3, h * 0.45, w * 0.4, h * 0.14); }
        g.fillStyle = o.fg;
        if (o.sub) centered(g, o.sub, h * 0.68, w, Math.round(w / 10), fam, "bold");
        if (o.body) { g.font = `${Math.round(w / 19)}px ${fam}`; g.textAlign = "center"; let y = h * 0.76; for (const l of o.body.split("\n")) { fitFont(g, l, w * 0.86, Math.round(w / 19), fam); g.fillText(l, w / 2, y); y += w / 15; } g.textAlign = "left"; }
        if (o.footer) { g.fillStyle = acc; centered(g, o.footer, h * 0.95, w, Math.round(w / 12), fam, "bold"); }
      } else if (st === "retro" || st === "event" || st === "band") {
        // sunburst / big shapes + title
        if (st === "retro") { g.fillStyle = acc; for (let i = 0; i < 16; i += 2) { g.beginPath(); g.moveTo(w / 2, h * 0.45); const a0 = (i / 16) * Math.PI * 2, a1 = ((i + 1) / 16) * Math.PI * 2; g.lineTo(w / 2 + Math.cos(a0) * w * 2, h * 0.45 + Math.sin(a0) * w * 2); g.lineTo(w / 2 + Math.cos(a1) * w * 2, h * 0.45 + Math.sin(a1) * w * 2); g.fill(); } }
        if (st === "band") { g.fillStyle = acc; g.beginPath(); g.arc(w / 2, h * 0.42, w * 0.3, 0, Math.PI * 2); g.fill(); g.fillStyle = o.bg; g.beginPath(); g.arc(w / 2, h * 0.42, w * 0.06, 0, Math.PI * 2); g.fill(); }
        if (o.art) { g.save(); g.translate(0, h * 0.18); o.art(g, w, h * 0.5, r); g.restore(); }
        g.fillStyle = o.fg; g.strokeStyle = o.bg; g.lineWidth = 5; g.lineJoin = "round";
        fitFont(g, o.title, w * 0.9, Math.round(w / 5.2), fam, "bold"); g.textAlign = "center";
        g.strokeText(o.title, w / 2, h * 0.14); g.fillText(o.title, w / 2, h * 0.14);
        if (o.sub) { fitFont(g, o.sub, w * 0.9, Math.round(w / 10), fam, "bold"); g.strokeText(o.sub, w / 2, h * 0.8); g.fillText(o.sub, w / 2, h * 0.8); }
        if (o.body) { g.font = `bold ${Math.round(w / 18)}px ${SANS}`; let y = h * 0.87; for (const l of o.body.split("\n")) { fitFont(g, l, w * 0.9, Math.round(w / 18), SANS, "bold"); g.strokeText(l, w / 2, y); g.fillText(l, w / 2, y); y += w / 15; } }
        g.textAlign = "left";
      } else {
        // bold / notice / sale: header band + text
        const band = st === "notice" ? h * 0.16 : st === "sale" ? h * 0.3 : 0;
        if (band) { g.fillStyle = acc; g.fillRect(0, 0, w, band); g.fillStyle = st === "sale" ? o.bg : o.bg; centered(g, o.title, band * 0.68, w, Math.round(st === "sale" ? w / 4 : w / 8), fam, "bold"); }
        else { g.fillStyle = o.fg; centered(g, o.title, h * 0.17, w, Math.round(w / 6), fam, "bold"); g.fillStyle = acc; g.fillRect(w * 0.1, h * 0.22, w * 0.8, 3); }
        let y = band ? band + h * 0.1 : h * 0.3;
        if (o.art) { g.save(); g.translate(w * 0.1, y - h * 0.04); o.art(g, w * 0.8, h * 0.3, r); g.restore(); y += h * 0.32; }
        g.fillStyle = o.fg;
        if (o.sub) { fitFont(g, o.sub, w * 0.86, Math.round(w / 11), fam, "bold"); g.textAlign = "center"; g.fillText(o.sub, w / 2, y); g.textAlign = "left"; y += w / 8; }
        if (o.body) { g.font = `${Math.round(w / 17)}px ${SANS}`; y = wrap(g, o.body, w * 0.08, y, w * 0.84, w / 13); }
        if (o.footer) { g.fillStyle = acc; g.fillRect(0, h - h * 0.09, w, h * 0.09); g.fillStyle = o.bg; centered(g, o.footer, h - h * 0.03, w, Math.round(w / 16), SANS, "bold"); }
      }
      wear(g, w, h, r, o.wear ?? 0.35);
      if (o.tape) { tape(g, 10, 10, 50, 16, -0.7); tape(g, w - 10, 10, 50, 16, 0.7); tape(g, 10, h - 10, 50, 16, 0.7); tape(g, w - 10, h - 10, 50, 16, -0.7); }
    });
  }
  news(o: NewsO) {
    const [pw, ph] = o.px ?? [300, 400];
    return this.custom(pw, ph, (g, w, h, r) => {
      paperBg(g, w, h, r, "#ece6d6", o.age ?? 0.3);
      g.fillStyle = "#151515";
      centered(g, o.name, 36, w, 34, "'Old English Text MT','UnifrakturMaguntia'," + SERIF, "bold");
      g.fillRect(10, 44, w - 20, 2); g.fillRect(10, 60, w - 20, 1);
      g.font = `10px ${SERIF}`; g.fillText(o.date ?? "SATURDAY, SEPTEMBER 26, 2026", 12, 56); g.textAlign = "right"; g.fillText("PRICE 2.00", w - 12, 56); g.textAlign = "left";
      g.font = `bold 30px ${SERIF}`;
      let y = wrap(g, o.headline, 12, 92, w - 24, 32);
      if (o.sub) { g.font = `italic 14px ${SERIF}`; y = wrap(g, o.sub, 12, y - 6, w - 24, 17) + 4; }
      const ph0 = y, colW = (w - 36) / 3;
      g.fillStyle = "#8d8778"; g.fillRect(12, ph0, colW * 2 + 6, h * 0.25);
      if (o.photo) { g.save(); g.translate(12, ph0); g.beginPath(); g.rect(0, 0, colW * 2 + 6, h * 0.25); g.clip(); o.photo(g, colW * 2 + 6, h * 0.25, r); g.restore(); }
      else { g.fillStyle = "#5f5a4f"; g.beginPath(); g.arc(12 + colW, ph0 + h * 0.14, h * 0.07, 0, Math.PI * 2); g.fill(); g.fillRect(12 + colW - h * 0.1, ph0 + h * 0.2, h * 0.2, h * 0.05); }
      g.fillStyle = "#222"; g.font = `9px ${SERIF}`;
      const body = o.body ?? "Witnesses say the colourful hiders painted themselves to match the wallpaper. Seekers searched for hours. Officials promise more hiding spots next season.";
      wrap(g, body, 12 + colW * 2 + 12, ph0 + 8, colW - 4, 11);
      let ty = ph0 + h * 0.25 + 14;
      for (let c = 0; c < 3; c++) {
        let yy = ty;
        g.fillStyle = "rgba(20,20,20,0.55)";
        while (yy < h - 10) { const lw = colW * (0.7 + r() * 0.3); g.fillRect(12 + c * (colW + 6), yy, lw, 3); yy += 7; if (r() < 0.08) yy += 7; }
      }
    });
  }
  plate(o: PlateO) {
    const [pw, ph] = o.px ?? (o.vertical ? [96, 320] : [320, 96]);
    return this.custom(pw, ph, (g, w, h, r) => {
      const st = o.style ?? "brass";
      const pal = { brass: ["#b8903c", "#e6c877", "#3a2a10"], silver: ["#9ea4aa", "#e3e7ea", "#1c2024"], wood: ["#6b4424", "#8e5e34", "#f1dfb5"], black: ["#1b1b1d", "#333338", "#e8d9a8"], white: ["#eeeeea", "#ffffff", "#222"], enamel: ["#1f3f8a", "#2b55b0", "#ffffff"], green: ["#1e5a3a", "#2a7a50", "#ffffff"] }[st];
      const gr = g.createLinearGradient(0, 0, w * 0.3, h);
      gr.addColorStop(0, pal[1]); gr.addColorStop(0.5, pal[0]); gr.addColorStop(1, pal[1]);
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      if (st === "wood") { g.strokeStyle = "rgba(40,20,5,0.3)"; for (let i = 0; i < 18; i++) { g.lineWidth = 1 + r() * 2; g.beginPath(); const y0 = r() * h; g.moveTo(0, y0); g.bezierCurveTo(w * 0.3, y0 + (r() - 0.5) * 10, w * 0.7, y0 + (r() - 0.5) * 10, w, y0 + (r() - 0.5) * 6); g.stroke(); } }
      if (st === "brass" || st === "silver") { g.strokeStyle = "rgba(255,255,255,0.18)"; for (let i = 0; i < 60; i++) { const y0 = r() * h; g.beginPath(); g.moveTo(0, y0); g.lineTo(w, y0 + (r() - 0.5) * 2); g.stroke(); } }
      g.strokeStyle = pal[2]; g.globalAlpha = 0.6; g.lineWidth = 2; g.strokeRect(5, 5, w - 10, h - 10); g.globalAlpha = 1;
      for (const [sx, sy] of o.vertical ? [[w / 2, 10], [w / 2, h - 10]] : [[10, h / 2], [w - 10, h / 2]]) { g.fillStyle = "rgba(0,0,0,0.35)"; g.beginPath(); g.arc(sx, sy, 3.5, 0, Math.PI * 2); g.fill(); }
      const fam = o.font ?? SERIF;
      g.fillStyle = pal[2]; g.textAlign = "center";
      if (o.vertical) {
        const chars = [...o.text], step = (h - 36) / chars.length, s = Math.min(w * 0.72, step * 0.92);
        g.font = `bold ${s}px ${fam}`;
        chars.forEach((c, i) => g.fillText(c, w / 2, 22 + step * (i + 0.8)));
      } else {
        fitFont(g, o.text, w * 0.84, Math.round(h * (o.sub ? 0.36 : 0.5)), fam, "bold");
        g.fillText(o.text, w / 2, o.sub ? h * 0.5 : h * 0.66);
        if (o.sub) { fitFont(g, o.sub, w * 0.8, Math.round(h * 0.2), fam, "italic"); g.fillText(o.sub, w / 2, h * 0.8); }
      }
      g.textAlign = "left";
    });
  }
  label(o: LabelO) {
    const [pw, ph] = o.px ?? (o.vertical ? [96, 256] : [256, 110]);
    return this.custom(pw, ph, (g, w, h, r) => {
      g.fillStyle = o.bg ?? "#f7f4ea"; g.fillRect(0, 0, w, h);
      if (o.stripe) { g.fillStyle = o.stripe; g.fillRect(0, 0, w, h * 0.18); g.fillRect(0, h * 0.86, w, h * 0.14); }
      if (o.border) { g.strokeStyle = o.border; g.lineWidth = Math.max(3, h * 0.05); g.strokeRect(g.lineWidth, g.lineWidth, w - g.lineWidth * 2, h - g.lineWidth * 2); }
      const fam = o.font ?? SANS;
      g.fillStyle = o.fg ?? "#222"; g.textAlign = "center";
      if (o.vertical) {
        const chars = [...o.text], step = (h - 24) / chars.length, s = Math.min(w * 0.7, step * 0.9);
        g.font = `bold ${s}px ${fam}`;
        chars.forEach((c, i) => g.fillText(c, w / 2, 14 + step * (i + 0.8)));
      } else {
        const top = o.stripe ? h * 0.18 : 0, bh = (o.stripe ? h * 0.68 : h);
        fitFont(g, o.text, w * 0.88, Math.round(bh * (o.sub ? 0.42 : 0.6)), fam, "bold");
        g.fillText(o.text, w / 2, top + (o.sub ? bh * 0.5 : bh * 0.7));
        if (o.sub) { fitFont(g, o.sub, w * 0.88, Math.round(bh * 0.22), fam); g.fillText(o.sub, w / 2, top + bh * 0.84); }
      }
      g.textAlign = "left";
      wear(g, w, h, r, o.wear ?? 0.15);
    });
  }
  menu(o: MenuO) {
    const [pw, ph] = o.px ?? [256, 362];
    return this.custom(pw, ph, (g, w, h, r) => {
      const st = o.style ?? "paper";
      const bg = { chalk: "#1f2a24", paper: "#f3ecd8", dark: "#15151a", red: "#8c1c16" }[st];
      const fg = { chalk: "#f2f0e6", paper: "#2a1d10", dark: "#f1d38a", red: "#fff2d0" }[st];
      if (st === "paper") paperBg(g, w, h, r, bg, 0.3); else { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
      if (st === "chalk") { for (let i = 0; i < 25; i++) { g.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.05})`; g.beginPath(); g.ellipse(r() * w, r() * h, 20 + r() * 60, 8 + r() * 20, r() * 3, 0, Math.PI * 2); g.fill(); } g.strokeStyle = "#8a5a32"; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10); }
      else { g.strokeStyle = fg; g.globalAlpha = 0.6; g.lineWidth = 1.5; g.strokeRect(10, 10, w - 20, h - 20); g.globalAlpha = 1; }
      const fam = o.font ?? (st === "chalk" ? HAND : SERIF);
      g.fillStyle = fg; centered(g, o.title, 50, w, Math.round(w / 8), fam, "bold");
      let y = 72;
      if (o.sub) { g.globalAlpha = 0.8; centered(g, o.sub, y, w, Math.round(w / 20), fam, "italic"); g.globalAlpha = 1; y += 10; }
      const s = Math.min(Math.round(w / 15), Math.floor((h - y - 20) / (o.items.length * 1.5)));
      y += s * 1.4;
      for (const [n, p] of o.items) {
        g.font = `${s}px ${fam}`; g.textAlign = "left"; g.fillText(n, 22, y);
        const nw = g.measureText(n).width; g.textAlign = "right"; g.fillText(p, w - 22, y);
        const pwid = g.measureText(p).width;
        g.globalAlpha = 0.4; g.fillRect(28 + nw, y - 3, w - 58 - nw - pwid, 1.5); g.globalAlpha = 1;
        y += s * 1.5;
      }
      g.textAlign = "left";
    });
  }
  graffiti(o: GraffitiO) {
    const [pw, ph] = o.px ?? [512, 200];
    return this.custom(pw, ph, (g, w, h, r) => {
      const st = o.style ?? "bubble";
      const fam = o.font ?? (st === "stencil" ? `'Stencil','Arial Black',${BOLD}` : st === "tag" || st === "chalk" ? HAND : BOLD);
      const sz = fitFont(g, o.text, w * 0.9, Math.round(h * (o.sub ? 0.5 : 0.66)), fam, "bold");
      g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
      const cy = o.sub ? h * 0.4 : h * 0.52;
      if (st === "bubble") {
        g.save(); g.translate(w / 2, cy); g.rotate(-0.05);
        g.lineWidth = sz * 0.28; g.strokeStyle = "#111"; g.strokeText(o.text, 4, 4);
        g.lineWidth = sz * 0.2; g.strokeStyle = o.outline ?? "#fff"; g.strokeText(o.text, 0, 0);
        const gr = g.createLinearGradient(0, -sz / 2, 0, sz / 2); gr.addColorStop(0, "#fff"); gr.addColorStop(0.25, o.color); gr.addColorStop(1, o.color);
        g.fillStyle = gr; g.fillText(o.text, 0, 0); g.restore();
      } else if (st === "chalk") {
        g.fillStyle = o.color; g.globalAlpha = 0.85; g.fillText(o.text, w / 2, cy);
        g.globalCompositeOperation = "destination-out";
        for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(0,0,0,${0.3 + r() * 0.6})`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
        g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
      } else {
        if (o.outline) { g.lineWidth = sz * 0.12; g.strokeStyle = o.outline; g.strokeText(o.text, w / 2, cy); }
        g.fillStyle = o.color; g.fillText(o.text, w / 2, cy);
      }
      if (o.drip ?? st !== "chalk") { g.fillStyle = o.color; for (let i = 0; i < 9; i++) { const x = w * 0.12 + r() * w * 0.76, y = cy + sz * 0.3, len = 6 + r() * h * (o.sub ? 0.08 : 0.3); g.fillRect(x, y, 3, len); g.beginPath(); g.arc(x + 1.5, y + len, 3, 0, Math.PI * 2); g.fill(); } }
      if (o.sub) { const ss = fitFont(g, o.sub, w * 0.7, Math.round(h * 0.28), HAND, "bold"); g.lineWidth = ss * 0.18; g.strokeStyle = "#111"; g.strokeText(o.sub, w / 2 + 2, h * 0.83 + 2); g.fillStyle = o.outline ?? o.color; g.fillText(o.sub, w / 2, h * 0.83); }
      g.textAlign = "left"; g.textBaseline = "alphabetic";
      if (st !== "chalk") { // overspray
        g.globalCompositeOperation = "source-atop";
        for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.25})`; g.fillRect(r() * w, r() * h, 2, 2); }
        g.globalCompositeOperation = "source-over";
      }
    }, true);
  }
  photo(o: PhotoO) {
    const [pw, ph] = o.px ?? [200, 240];
    return this.custom(pw, ph, (g, w, h, r) => {
      g.fillStyle = "#f7f5ef"; g.fillRect(0, 0, w, h);
      const iw = w - 20, ih = h * 0.72;
      g.save(); g.translate(10, 10); g.beginPath(); g.rect(0, 0, iw, ih); g.clip();
      if (o.art) o.art(g, iw, ih, r);
      else {
        const sk = g.createLinearGradient(0, 0, 0, ih); sk.addColorStop(0, o.sky ?? "#7fb3e0"); sk.addColorStop(1, "#dfeaf2"); g.fillStyle = sk; g.fillRect(0, 0, iw, ih);
        g.fillStyle = o.ground ?? "#5b8a4a"; g.fillRect(0, ih * 0.66, iw, ih);
        for (const [cx, c] of [[0.35, "#e0584a"], [0.62, "#4a6ed8"]] as [number, string][]) {
          g.fillStyle = "#f0cfa8"; g.beginPath(); g.arc(iw * cx, ih * 0.42, ih * 0.08, 0, Math.PI * 2); g.fill();
          g.fillStyle = c; g.fillRect(iw * cx - ih * 0.09, ih * 0.5, ih * 0.18, ih * 0.28);
        }
      }
      g.fillStyle = "rgba(255,230,180,0.12)"; g.fillRect(0, 0, iw, ih);
      g.restore();
      if (o.caption) { g.fillStyle = "#1d2a66"; fitFont(g, o.caption, w - 20, Math.round(h * 0.09), HAND); g.textAlign = "center"; g.fillText(o.caption, w / 2, h - (h - ih - 10) * 0.4); g.textAlign = "left"; }
    });
  }
  calendar(o: CalendarO) {
    const [pw, ph] = o.px ?? [220, 300];
    return this.custom(pw, ph, (g, w, h, r) => {
      g.fillStyle = "#fbfaf6"; g.fillRect(0, 0, w, h);
      g.fillStyle = o.art ?? "#5a8fc0"; g.fillRect(0, 0, w, h * 0.38);
      g.fillStyle = "rgba(255,255,255,0.3)"; g.beginPath(); g.moveTo(0, h * 0.3); g.lineTo(w * 0.4, h * 0.14); g.lineTo(w * 0.7, h * 0.26); g.lineTo(w, h * 0.1); g.lineTo(w, h * 0.38); g.lineTo(0, h * 0.38); g.fill();
      g.fillStyle = "#222"; centered(g, `${o.month} ${o.year ?? "2026"}`, h * 0.46, w, Math.round(w / 10), SANS, "bold");
      const cw = (w - 16) / 7, top = h * 0.5, chh = (h - top - 8) / 6;
      g.font = `${Math.round(cw * 0.36)}px ${SANS}`;
      const days = o.days ?? 30, st = o.start ?? 2;
      for (let d = 1; d <= days; d++) {
        const i = d - 1 + st, cx = 8 + (i % 7) * cw, cy = top + Math.floor(i / 7) * chh;
        g.strokeStyle = "#d8d4c8"; g.strokeRect(cx, cy, cw, chh);
        g.fillStyle = i % 7 === 0 ? "#c0392b" : "#333"; g.fillText(String(d), cx + 2, cy + cw * 0.36);
        const m = o.marks?.find((mm) => mm[0] === d);
        if (m) { g.strokeStyle = "#d02020"; g.lineWidth = 2; g.beginPath(); g.ellipse(cx + cw / 2, cy + chh / 2, cw * 0.46, chh * 0.44, 0, 0, Math.PI * 2); g.stroke(); g.lineWidth = 1; g.fillStyle = "#b01818"; g.font = `${Math.round(cw * 0.26)}px ${HAND}`; g.fillText(m[1], cx + 1, cy + chh - 3); g.font = `${Math.round(cw * 0.36)}px ${SANS}`; }
      }
      g.fillStyle = "#555"; g.beginPath(); g.arc(w / 2, 8, 4, 0, Math.PI * 2); g.fill();
    });
  }
  receipt(o: ReceiptO) {
    const [pw, ph] = o.px ?? [160, 300];
    return this.custom(pw, ph, (g, w, h, r) => {
      paperBg(g, w, h, r, "#fbfaf4", 0.15);
      g.fillStyle = "#333"; centered(g, o.title, 26, w, 16, MONO, "bold");
      g.font = `11px ${MONO}`; let y = 50;
      g.fillText("--------------------------", 8, y - 10);
      for (const [a, b] of o.lines) { g.textAlign = "left"; g.fillText(a, 10, y); g.textAlign = "right"; g.fillText(b, w - 10, y); y += 15; }
      g.textAlign = "left"; g.fillText("--------------------------", 8, y); y += 16;
      if (o.total) { g.font = `bold 13px ${MONO}`; g.fillText("TOTAL", 10, y); g.textAlign = "right"; g.fillText(o.total, w - 10, y); g.textAlign = "left"; y += 22; }
      if (o.foot) { g.font = `10px ${MONO}`; wrap(g, o.foot, 10, y, w - 20, 13); }
      g.fillStyle = "#222"; for (let x = 16; x < w - 16; x += 2 + Math.floor(r() * 3)) g.fillRect(x, h - 30, 1 + Math.floor(r() * 2), 18);
    });
  }

  certificate(o: CertO) {
    const [pw, ph] = o.px ?? [362, 256];
    return this.custom(pw, ph, (g, w, h, r) => {
      paperBg(g, w, h, r, "#f8f2de", 0.25);
      const b = o.border ?? "#8a6a1e";
      g.strokeStyle = b; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20); g.lineWidth = 1.5; g.strokeRect(19, 19, w - 38, h - 38);
      g.fillStyle = b; centered(g, o.title ?? "CERTIFICATE", h * 0.22, w, Math.round(w / 12), SERIF, "bold");
      g.fillStyle = "#333"; centered(g, "is hereby awarded to", h * 0.33, w, Math.round(w / 30), SERIF, "italic");
      g.fillStyle = "#1a1a40"; centered(g, o.name, h * 0.48, w, Math.round(w / 11), HAND, "bold");
      g.fillStyle = b; g.fillRect(w * 0.2, h * 0.52, w * 0.6, 1.5);
      g.fillStyle = "#333"; g.font = `${Math.round(w / 30)}px ${SERIF}`; g.textAlign = "center";
      let y = h * 0.61; for (const l of o.body.split("\n")) { fitFont(g, l, w * 0.76, Math.round(w / 30), SERIF, "italic"); g.fillText(l, w / 2, y); y += w / 24; }
      g.textAlign = "left";
      // seal + signature
      g.fillStyle = "#b8282a"; g.beginPath(); for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, rr = i % 2 ? 22 : 26; g.lineTo(w * 0.2 + Math.cos(a) * rr, h * 0.8 + Math.sin(a) * rr); } g.fill();
      g.fillStyle = "#e8c860"; g.beginPath(); g.arc(w * 0.2, h * 0.8, 13, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#1d2a66"; g.font = `italic ${Math.round(w / 22)}px ${HAND}`; g.textAlign = "center";
      if (o.sign) g.fillText(o.sign, w * 0.72, h * 0.83);
      g.fillStyle = "#333"; g.fillRect(w * 0.55, h * 0.85, w * 0.34, 1);
      g.font = `${Math.round(w / 36)}px ${SERIF}`; g.fillText(o.date ?? "September 26, 2026", w * 0.72, h * 0.9);
      g.textAlign = "left";
    });
  }

  // ------------------------------------------------ placement (y = centre of the sheet)
  /** plane facing +Z (rotated by ry); w in metres, h from aspect unless given */
  put(id: number, x: number, y: number, z: number, w: number, o: PutO = {}) {
    this.places.push({ id, pos: [x, y, z], w, h: o.h ?? w * this.aspect(id), ry: o.ry ?? 0, rx: o.rx ?? 0, rz: o.rz ?? 0, fold: o.fold ?? 0 });
  }
  /** on a wall: faces the direction ry (0 = +Z); tilt = in-plane rotation */
  wall(id: number, x: number, y: number, z: number, w: number, ry = 0, tilt = 0) { this.put(id, x, y, z, w, { ry, rz: tilt }); }
  /** lying on a horizontal surface at height y (top of the sheet reads towards -Z when ry = 0) */
  flat(id: number, x: number, y: number, z: number, w: number, ry = 0, fold = 0) { this.put(id, x, y + 0.002 + fold, z, w, { ry, rx: -Math.PI / 2, fold }); }
  /** stack of sheets/newspapers/books (plain paper-edge box); y = bottom */
  stack(x: number, y: number, z: number, w: number, d: number, h: number, ry = 0) {
    const geo = new THREE.BoxGeometry(w, h, d);
    geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y + h / 2, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(1, 1, 1)));
    this.stacks.push(geo);
  }

  /** packs the atlas, draws it and adds the merged meshes */
  finish() {
    const k = this.k;
    if (this.stacks.length) k.merged(this.stacks, k.mat(null, this.stackColor, [1, 1], { roughness: 0.9 }));
    if (!this.items.length || !this.places.length) return;
    // shelf packing, tallest first
    const pad = 4;
    const W = Math.max(512, ...this.items.map((i) => i.w + pad * 2)) > 1024 ? 2048 : 1024;
    const order = this.items.map((_, i) => i).sort((a, b) => this.items[b].h - this.items[a].h);
    let x = 0, y = 0, rowH = 0;
    for (const i of order) {
      const it = this.items[i];
      if (x + it.w + pad * 2 > W) { x = 0; y += rowH; rowH = 0; }
      it.x = x + pad; it.y = y + pad;
      x += it.w + pad * 2; rowH = Math.max(rowH, it.h + pad * 2);
    }
    const H = Math.ceil((y + rowH) / 64) * 64;
    const items = this.items, seed = this.seed;
        const tmp = document.createElement("canvas");
    tmp.width = Math.max(...items.map((i) => i.w)); tmp.height = Math.max(...items.map((i) => i.h));
    const tg = tmp.getContext("2d", { willReadFrequently: true })!;
    const tex = makeTex(W, H, (g) => {
      g.clearRect(0, 0, W, H);
      items.forEach((it, i) => {
        // draw each item on a small scratch canvas, then blit it (+ bleed its border into the padding)
        tg.setTransform(1, 0, 0, 1, 0, 0);
        tg.clearRect(0, 0, it.w, it.h);
        tg.save();
        tg.beginPath(); tg.rect(0, 0, it.w, it.h); tg.clip();
        tg.textBaseline = "alphabetic"; tg.textAlign = "left"; tg.globalAlpha = 1; tg.globalCompositeOperation = "source-over";
        it.draw(tg, it.w, it.h, lrng(seed * 131 + i * 977));
        tg.restore();
        if (!it.alpha) {
          g.drawImage(tmp, 0, 0, it.w, 1, it.x, it.y - pad, it.w, pad);
          g.drawImage(tmp, 0, it.h - 1, it.w, 1, it.x, it.y + it.h, it.w, pad);
          g.drawImage(tmp, 0, 0, 1, it.h, it.x - pad, it.y, pad, it.h);
          g.drawImage(tmp, it.w - 1, 0, 1, it.h, it.x + it.w, it.y, pad, it.h);
        }
        g.drawImage(tmp, 0, 0, it.w, it.h, it.x, it.y, it.w, it.h);
      });
    }, [1, 1], true); // dynamic: colour picks read the canvas directly (no full-atlas readback at build time)
    tex.texture.anisotropy = 8;
    this.tex = tex;
    const paper: THREE.BufferGeometry[] = [], decal: THREE.BufferGeometry[] = [];
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (const p of this.places) {
      const it = items[p.id];
      const geo = new THREE.PlaneGeometry(p.w, p.h, 1, p.fold ? 2 : 1);
      const uv = geo.attributes.uv as THREE.BufferAttribute, pos = geo.attributes.position as THREE.BufferAttribute;
      const u0 = it.x / W, u1 = (it.x + it.w) / W, vT = 1 - it.y / H, vB = 1 - (it.y + it.h) / H;
      for (let i = 0; i < uv.count; i++) {
        uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), vB + uv.getY(i) * (vT - vB));
        if (p.fold && Math.abs(pos.getY(i)) > 1e-6) pos.setZ(i, -p.fold); // crease in the middle stays up, edges down
      }
      if (p.fold) geo.computeVertexNormals();
      e.set(p.rx, p.ry, p.rz, "YXZ");
      q.setFromEuler(e);
      m4.compose(new THREE.Vector3(...p.pos), q, new THREE.Vector3(1, 1, 1));
      geo.applyMatrix4(m4);
      (it.alpha ? decal : paper).push(geo);
    }
    if (paper.length) { this.paperM = k.mat(tex, "#ffffff", [1, 1], { roughness: 0.86, bump: 0 }); k.merged(paper, this.paperM, { noShadow: true }); }
    if (decal.length) { this.decalM = k.mat(tex, "#ffffff", [1, 1], { roughness: 0.92, transparent: true }); k.merged(decal, this.decalM, { noShadow: true }); }
  }
}
