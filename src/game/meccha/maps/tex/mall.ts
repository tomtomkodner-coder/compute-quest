// Shopping Mall textures: polished porcelain / terrazzo floors, laminate, shop fascia signs, product atlases
// (grocery packages, toy boxes, shoe boxes, TV screens), fabrics, acoustic ceiling, directory board, sale posters.
import { makeTex } from "../../textures";

export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** large polished porcelain tiles with soft marble clouds and thin grout (2x2 tiles per texture) */
export const porcelain = (base = "#e9e3d8", vein = "#b8ae9e", seed = 3) =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(seed);
    const s = w / 2;
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 2; x++) {
        g.fillStyle = base;
        g.fillRect(x * s, y * s, s, s);
        for (let i = 0; i < 40; i++) {
          g.fillStyle = `rgba(150,140,125,${r() * 0.05})`;
          g.beginPath();
          g.ellipse(x * s + r() * s, y * s + r() * s, 10 + r() * 50, 6 + r() * 24, r() * 3, 0, Math.PI * 2);
          g.fill();
        }
        g.save();
        g.beginPath(); g.rect(x * s, y * s, s, s); g.clip();
        for (let i = 0; i < 5; i++) {
          g.strokeStyle = vein;
          g.globalAlpha = 0.12 + r() * 0.2;
          g.lineWidth = 0.6 + r() * 1.4;
          g.beginPath();
          let px = x * s + r() * s, py = y * s;
          g.moveTo(px, py);
          while (py < y * s + s) { px += (r() - 0.5) * 28; py += 8 + r() * 18; g.lineTo(px, py); }
          g.stroke();
        }
        g.restore();
        g.globalAlpha = 1;
      }
    g.strokeStyle = "rgba(90,80,70,0.45)";
    g.lineWidth = 2;
    for (let i = 0; i <= 2; i++) {
      g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke();
      g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke();
    }
  });

/** wood-look laminate planks (long, along U) */
export const laminate = (base = "#c49a6c", seed = 5, rows = 6) =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(seed);
    const ph = h / rows;
    for (let i = 0; i < rows; i++) {
      let x = -r() * w * 0.5;
      while (x < w) {
        const len = w * (0.45 + r() * 0.5);
        const t = (r() - 0.5) * 28;
        const c = parseInt(base.slice(1), 16);
        g.fillStyle = `rgb(${((c >> 16) & 255) + t},${((c >> 8) & 255) + t * 0.85},${(c & 255) + t * 0.7})`;
        g.fillRect(x, i * ph, len, ph);
        for (let k = 0; k < 9; k++) {
          g.strokeStyle = `rgba(60,35,15,${0.06 + r() * 0.1})`;
          g.lineWidth = 0.6 + r();
          const y = i * ph + r() * ph;
          g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + len * 0.3, y + (r() - 0.5) * 6, x + len * 0.7, y + (r() - 0.5) * 6, x + len, y); g.stroke();
        }
        g.fillStyle = "rgba(40,25,10,0.35)";
        g.fillRect(x, i * ph, 2, ph);
        x += len;
      }
      g.fillStyle = "rgba(40,25,10,0.35)";
      g.fillRect(0, i * ph, w, 2);
    }
  });

/** simple speckled surface (vinyl floor, paint, plastic) */
export const speckle = (base: string, amt = 0.08, seed = 1, n = 2400) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      const v = (r() - 0.5) * amt * 2;
      g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
      g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
    }
  });

/** vinyl tile floor (grocery) */
export const vinylTiles = (a = "#dcdad3", b = "#c9c6bd") =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(9);
    const n = 4, s = w / n;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        g.fillStyle = (x + y) % 2 ? a : b;
        g.fillRect(x * s, y * s, s, s);
        for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "0,0,0" : "255,255,255"},${r() * 0.08})`; g.fillRect(x * s + r() * s, y * s + r() * s, 2, 2); }
      }
    g.strokeStyle = "rgba(0,0,0,0.15)";
    g.lineWidth = 1.5;
    for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); }
  });

/** kids' play-mat carpet (toy shop) */
export const playCarpet = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(12);
    g.fillStyle = "#4bb3e0";
    g.fillRect(0, 0, w, h);
    const cols = ["#ffd23f", "#ee4266", "#3bceac", "#ffffff", "#8f5cff"];
    for (let i = 0; i < 26; i++) {
      g.fillStyle = cols[Math.floor(r() * cols.length)];
      const x = r() * w, y = r() * h, s = 8 + r() * 14;
      if (r() < 0.5) { g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); }
      else {
        g.beginPath();
        for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2, rr = k % 2 ? s * 0.45 : s; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
        g.fill();
      }
    }
    for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.07})`; g.fillRect(r() * w, r() * h, 1, 1); }
  });

/** flat painted wall with faint roller texture */
export const paint = (base: string, seed = 2) => speckle(base, 0.035, seed, 1800);

/** acoustic ceiling tiles 600x600 in a T-bar grid (4x4 per texture) */
export const ceilingTiles = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(4);
    g.fillStyle = "#efefec";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.1})`; g.fillRect(r() * w, r() * h, 1, 1); }
    g.fillStyle = "#d8d8d4";
    for (let i = 0; i <= 4; i++) { g.fillRect((i * w) / 4 - 2, 0, 4, h); g.fillRect(0, (i * h) / 4 - 2, w, 4); }
  });

/** shop fascia sign: name + small tagline */
export const sign = (name: string, tag: string, bg: string, fg: string, accent: string, font = "bold 92px 'Trebuchet MS', 'Arial Black', sans-serif", w = 512, h = 128) =>
  makeTex(w, h, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = accent;
    g.fillRect(0, h - 10, w, 10);
    g.fillStyle = fg;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = font.replace(/\d+px/, `${Math.floor(h * 0.5)}px`);
    let size = Math.floor(h * 0.5);
    while (g.measureText(name).width > w * 0.9 && size > 12) { size -= 2; g.font = font.replace(/\d+px/, `${size}px`); }
    g.fillText(name, w / 2, h * 0.43);
    g.font = `600 ${Math.floor(h * 0.15)}px 'Trebuchet MS', sans-serif`;
    g.fillStyle = accent;
    g.fillText(tag, w / 2, h * 0.8);
  });

/** poster / banner with a big headline */
export const poster = (head: string, sub: string, bg: string, fg: string, w = 256, h = 384) =>
  makeTex(w, h, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(255,255,255,0.15)";
    for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(w * (0.2 + i * 0.15), h * (0.2 + (i % 3) * 0.25), 30 + i * 8, 0, 7); g.fill(); }
    g.fillStyle = fg;
    g.textAlign = "center";
    g.textBaseline = "middle";
    let size = Math.floor(w * 0.34);
    g.font = `900 ${size}px 'Arial Black', sans-serif`;
    while (g.measureText(head).width > w * 0.9 && size > 10) { size -= 2; g.font = `900 ${size}px 'Arial Black', sans-serif`; }
    g.fillText(head, w / 2, h * 0.42);
    g.font = `bold ${Math.floor(w * 0.1)}px 'Trebuchet MS', sans-serif`;
    g.fillText(sub, w / 2, h * 0.64);
    g.strokeStyle = fg;
    g.lineWidth = 6;
    g.strokeRect(10, 10, w - 20, h - 20);
  });

const drawProduct = (g: CanvasRenderingContext2D, x: number, y: number, s: number, r: () => number, kind: number) => {
  const pals = [["#e63946", "#ffd166"], ["#1d3557", "#a8dadc"], ["#2a9d8f", "#e9c46a"], ["#ff7b00", "#ffffff"], ["#6a4c93", "#ffca3a"], ["#8ac926", "#ffffff"], ["#ff595e", "#1982c4"], ["#fdf0d5", "#c1121f"]];
  const [a, b] = pals[kind % pals.length];
  g.fillStyle = a;
  g.fillRect(x, y, s, s);
  g.fillStyle = b;
  if (kind % 3 === 0) { g.beginPath(); g.arc(x + s * 0.5, y + s * 0.58, s * 0.26, 0, 7); g.fill(); }
  else if (kind % 3 === 1) { g.fillRect(x + s * 0.1, y + s * 0.45, s * 0.8, s * 0.28); }
  else { g.beginPath(); g.moveTo(x + s * 0.5, y + s * 0.3); g.lineTo(x + s * 0.85, y + s * 0.85); g.lineTo(x + s * 0.15, y + s * 0.85); g.fill(); }
  g.fillStyle = b;
  g.fillRect(x + s * 0.12, y + s * 0.1, s * 0.76, s * 0.16);
  g.fillStyle = a;
  g.font = `bold ${Math.floor(s * 0.12)}px sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(["CRUNCH", "OATY", "YUMM", "CHOCO", "BISCO", "CORNY", "RICE+", "NUTTY"][kind % 8], x + s * 0.5, y + s * 0.18);
  g.fillStyle = "rgba(255,255,255,0.18)";
  g.fillRect(x, y, s * 0.08, s);
  void r;
};

/** grocery package atlas: 4x4 box fronts */
export const packages = () =>
  makeTex(512, 512, (g, w) => {
    const r = rng(21);
    const s = w / 4;
    for (let i = 0; i < 16; i++) drawProduct(g, (i % 4) * s, Math.floor(i / 4) * s, s, r, i);
  });

/** bottle / can label bands (U around, V up): label band in the middle, cap colour top */
export const label = (seed = 3) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(255,255,255,1)";
    g.fillRect(0, h * 0.35, w, h * 0.35);
    g.fillStyle = "rgba(0,0,0,0.75)";
    g.fillRect(0, h * 0.35, w, 4);
    g.fillRect(0, h * 0.7 - 4, w, 4);
    for (let i = 0; i < 4; i++) {
      g.fillStyle = ["#e63946", "#1d3557", "#2a9d8f", "#ffb703"][i];
      g.beginPath(); g.arc((i + 0.5) * (w / 4), h * 0.52, 16, 0, 7); g.fill();
    }
    g.fillStyle = "rgba(0,0,0,0.2)";
    g.fillRect(0, 0, w, h * 0.12);
    void r;
  });

/** toy box atlas: 4x4 boxes with cartoon windows */
export const toyBoxes = () =>
  makeTex(512, 512, (g, w) => {
    const r = rng(33);
    const s = w / 4;
    const cols = ["#ff006e", "#3a86ff", "#ffbe0b", "#8338ec", "#fb5607", "#06d6a0", "#ef476f", "#118ab2"];
    for (let i = 0; i < 16; i++) {
      const x = (i % 4) * s, y = Math.floor(i / 4) * s;
      g.fillStyle = cols[i % cols.length];
      g.fillRect(x, y, s, s);
      g.fillStyle = "#ffffff";
      g.fillRect(x + s * 0.12, y + s * 0.3, s * 0.76, s * 0.5);
      g.fillStyle = cols[(i + 3) % cols.length];
      if (i % 2) { g.beginPath(); g.arc(x + s * 0.5, y + s * 0.55, s * 0.18, 0, 7); g.fill(); g.beginPath(); g.arc(x + s * 0.36, y + s * 0.4, s * 0.07, 0, 7); g.arc(x + s * 0.64, y + s * 0.4, s * 0.07, 0, 7); g.fill(); }
      else { g.fillRect(x + s * 0.3, y + s * 0.4, s * 0.4, s * 0.3); g.beginPath(); g.arc(x + s * 0.38, y + s * 0.72, s * 0.06, 0, 7); g.arc(x + s * 0.62, y + s * 0.72, s * 0.06, 0, 7); g.fill(); }
      g.fillStyle = "#ffffff";
      g.font = `900 ${Math.floor(s * 0.15)}px 'Arial Black', sans-serif`;
      g.textAlign = "center";
      g.fillText(["ROBO", "BLOX", "ZOOM", "PUPS", "STAR", "DINO", "RACE", "MEGA"][i % 8], x + s * 0.5, y + s * 0.2);
      g.fillStyle = "rgba(0,0,0,0.12)";
      g.fillRect(x, y + s * 0.88, s, s * 0.12);
      void r;
    }
  });

/** shoe box: cardboard with a coloured lid band and logo */
export const shoeBox = () =>
  makeTex(256, 256, (g, w, h) => {
    g.fillStyle = "#e7e3da";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#e85d3a";
    g.fillRect(0, 0, w, h * 0.28);
    g.fillStyle = "#ffffff";
    g.font = "900 40px 'Arial Black', sans-serif";
    g.textAlign = "center";
    g.fillText("STEP", w / 2, h * 0.2);
    g.fillStyle = "#222";
    g.font = "bold 22px sans-serif";
    g.fillText("SIZE 42", w / 2, h * 0.6);
    g.fillRect(w * 0.3, h * 0.72, w * 0.4, 20);
  });

/** TV / monitor screens atlas: 2x2 bright scenes */
export const screens = () =>
  makeTex(512, 512, (g, w) => {
    const s = w / 2;
    const scene = (x: number, y: number, i: number) => {
      const grd = g.createLinearGradient(x, y, x, y + s);
      const sky = [["#1e90ff", "#bde7ff"], ["#ff7e5f", "#feb47b"], ["#0f2027", "#2c5364"], ["#56ab2f", "#a8e063"]][i];
      grd.addColorStop(0, sky[0]);
      grd.addColorStop(1, sky[1]);
      g.fillStyle = grd;
      g.fillRect(x, y, s, s);
      if (i === 0) { g.fillStyle = "#2e8b57"; g.beginPath(); g.moveTo(x, y + s * 0.8); g.lineTo(x + s * 0.3, y + s * 0.45); g.lineTo(x + s * 0.55, y + s * 0.75); g.lineTo(x + s * 0.8, y + s * 0.4); g.lineTo(x + s, y + s * 0.7); g.lineTo(x + s, y + s); g.lineTo(x, y + s); g.fill(); }
      if (i === 1) { g.fillStyle = "#fff3b0"; g.beginPath(); g.arc(x + s * 0.5, y + s * 0.6, s * 0.18, 0, 7); g.fill(); g.fillStyle = "#1b3a4b"; g.fillRect(x, y + s * 0.68, s, s * 0.32); }
      if (i === 2) { g.fillStyle = "#ffffff"; for (let k = 0; k < 40; k++) g.fillRect(x + ((k * 97) % s), y + ((k * 53) % s), 3, 3); g.fillStyle = "#ffd60a"; g.beginPath(); g.arc(x + s * 0.7, y + s * 0.3, s * 0.12, 0, 7); g.fill(); }
      if (i === 3) { g.fillStyle = "#ffffff"; g.fillRect(x + s * 0.1, y + s * 0.55, s * 0.8, s * 0.04); g.fillStyle = "#ffffff"; g.beginPath(); g.arc(x + s * 0.5, y + s * 0.5, s * 0.06, 0, 7); g.fill(); }
      g.fillStyle = "rgba(255,255,255,0.08)";
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + s * 0.5, y); g.lineTo(x, y + s * 0.5); g.fill();
    };
    for (let i = 0; i < 4; i++) scene((i % 2) * s, Math.floor(i / 2) * s, i);
  });

/** knit / woven fabric (white base: tinted per mesh or instance) */
export const fabric = (base = "#ffffff", seed = 7) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 4) { g.fillStyle = `rgba(0,0,0,${0.04 + r() * 0.04})`; g.fillRect(0, y, w, 1); }
    for (let x = 0; x < w; x += 4) { g.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.03})`; g.fillRect(x, 0, 1, h); }
    for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.12})`; g.fillRect(r() * w, r() * h, 2, 1); }
  });

/** denim */
export const denim = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(8);
    g.fillStyle = "#3b5a85";
    g.fillRect(0, 0, w, h);
    for (let i = -h; i < w; i += 3) { g.strokeStyle = `rgba(255,255,255,${0.05 + r() * 0.08})`; g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); }
    for (let i = 0; i < 800; i++) { g.fillStyle = `rgba(20,30,60,${r() * 0.2})`; g.fillRect(r() * w, r() * h, 3, 1); }
  });

/** mall directory board */
export const directory = () =>
  makeTex(256, 512, (g, w, h) => {
    g.fillStyle = "#1d2733";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#ffffff";
    g.font = "900 30px 'Arial Black', sans-serif";
    g.textAlign = "center";
    g.fillText("DIRECTORY", w / 2, 44);
    const shops: [string, string][] = [["MODA LUNA", "#e76f51"], ["STEP UP", "#f4a261"], ["TOY PLANET", "#e9c46a"], ["VOLTEX", "#2a9d8f"], ["FRESH MART", "#8ac926"], ["CASA NOVA", "#b08968"], ["BEAN & BUN", "#6f4e37"]];
    shops.forEach(([n, c], i) => {
      g.fillStyle = c;
      g.fillRect(20, 76 + i * 50, 30, 30);
      g.fillStyle = "#e8eef4";
      g.font = "bold 20px sans-serif";
      g.textAlign = "left";
      g.fillText(n, 62, 98 + i * 50);
    });
    g.strokeStyle = "#6d8aa6";
    g.lineWidth = 3;
    g.strokeRect(20, 440, w - 40, 50);
    g.fillStyle = "#ffd166";
    g.beginPath(); g.arc(w / 2, 465, 9, 0, 7); g.fill();
    g.fillStyle = "#e8eef4";
    g.font = "bold 14px sans-serif";
    g.textAlign = "center";
    g.fillText("YOU ARE HERE", w / 2, 505);
  });

/** exterior view seen through the entrance doors (bright plaza) */
export const outside = () =>
  makeTex(256, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, "#cfe9ff");
    grd.addColorStop(0.6, "#f4f8fb");
    grd.addColorStop(0.61, "#b9b4aa");
    grd.addColorStop(1, "#9c968b");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#7da66a";
    for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(20 + i * 45, h * 0.55, 22, 0, 7); g.fill(); }
  });

/** menu board of the cafe */
export const menu = () =>
  makeTex(512, 256, (g, w, h) => {
    g.fillStyle = "#23201d";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#f3e9d2";
    g.font = "bold 34px Georgia, serif";
    g.textAlign = "left";
    const items = ["Espresso 2.50", "Latte 3.80", "Cappuccino 3.60", "Croissant 2.20", "Bagel 3.10", "Muffin 2.40"];
    items.forEach((t, i) => g.fillText(t, 30 + (i % 2) * 250, 60 + Math.floor(i / 2) * 70));
    g.strokeStyle = "#c8a165";
    g.lineWidth = 4;
    g.strokeRect(8, 8, w - 16, h - 16);
  });

// ---------------------------------------------------------------- official "Shopping Mall" additions

/** periodic value noise (period p cells); returns f(x,y) with x,y in cell units */
function vnoise(seed: number, p: number) {
  const r = rng(seed);
  const g = new Float32Array(p * p);
  for (let i = 0; i < p * p; i++) g[i] = r();
  return (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const fx = x - xi, fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const x0 = ((xi % p) + p) % p, y0 = ((yi % p) + p) % p, x1 = (x0 + 1) % p, y1 = (y0 + 1) % p;
    const a = g[y0 * p + x0], b = g[y0 * p + x1], c = g[y1 * p + x0], d = g[y1 * p + x1];
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}

/** camo-like paint-splash mask layers drawn at 256 and scaled up (soft blotchy edges, white holes inside) */
function splashLayer(g: CanvasRenderingContext2D, w: number, h: number, seed: number, cols: string[], cover = 0.5) {
  const S = 256;
  const cv = document.createElement("canvas");
  cv.width = cv.height = S;
  const cg = cv.getContext("2d", { willReadFrequently: true })!;
  const img = cg.createImageData(S, S);
  const fields = cols.map((_, i) => [vnoise(seed * 7 + i * 13, 4), vnoise(seed * 7 + i * 13 + 1, 8), vnoise(seed * 7 + i * 13 + 2, 16), vnoise(seed * 7 + i * 13 + 3, 32)]);
  const rgb = cols.map((c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; });
  const thr = 1 - cover;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const u = x / S, v = y / S;
      let best = -1, bv = 0;
      for (let i = 0; i < cols.length; i++) {
        const f = fields[i];
        const n = f[0](u * 4, v * 4) * 0.55 + f[1](u * 8, v * 8) * 0.25 + f[2](u * 16, v * 16) * 0.13 + f[3](u * 32, v * 32) * 0.07;
        const val = n - 0.5 - thr * 0.3 - i * 0.01;
        if (val > bv) { bv = val; best = i; }
      }
      const o = (y * S + x) * 4;
      if (best >= 0) {
        const c = rgb[best];
        img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2];
        img.data[o + 3] = Math.min(255, bv * 2200);
      }
    }
  cg.putImageData(img, 0, 0);
  g.imageSmoothingEnabled = true;
  g.drawImage(cv, 0, 0, w, h);
}

/** glossy porcelain floor tiles (n x n per texture) with big paint splashes (atrium floor art) */
export const splashFloor = (seed = 1, cols = ["#f39ab4", "#35c3cf", "#f6cf3f"], cover = 0.55, n = 8) =>
  makeTex(512, 512, (g, w, h) => {
    const r = rng(seed + 50);
    const s = w / n;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const t = (r() - 0.5) * 10;
        g.fillStyle = `rgb(${232 + t},${229 + t},${224 + t})`;
        g.fillRect(x * s, y * s, s, s);
        for (let i = 0; i < 6; i++) {
          g.fillStyle = `rgba(160,150,140,${r() * 0.05})`;
          g.beginPath(); g.ellipse(x * s + r() * s, y * s + r() * s, 4 + r() * 16, 2 + r() * 8, r() * 3, 0, Math.PI * 2); g.fill();
        }
      }
    splashLayer(g, w, h, seed, cols, cover);
    g.fillStyle = "rgba(90,85,80,0.35)";
    for (let i = 0; i <= n; i++) { g.fillRect(i * s - 1, 0, 2, h); g.fillRect(0, i * s - 1, w, 2); }
  });

/** painted concrete / plaster with paint splashes (planters, pillars) */
export const splashWall = (base = "#8e8a84", seed = 2, cols = ["#3fc4c9", "#f1eadb", "#f3cf49"], cover = 0.5) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "0,0,0" : "255,255,255"},${r() * 0.06})`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
    splashLayer(g, w, h, seed, cols, cover);
  });

/** vertical colour gradient with splashes (the atrium's painted pillars: pink bottom -> yellow) */
export const splashPillar = (seed = 4) =>
  makeTex(256, 512, (g, w, h) => {
    const grd = g.createLinearGradient(0, h, 0, 0);
    grd.addColorStop(0, "#f2a33a");
    grd.addColorStop(0.35, "#f47f8e");
    grd.addColorStop(0.7, "#f2eee6");
    grd.addColorStop(1, "#f7f4ee");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    splashLayer(g, w, h, seed, ["#ef6f8f", "#43bfae", "#f5cd3c"], 0.62);
  });

/** brushed stainless steel (horizontal streaks) */
export const brushed = (base = "#b9bcc0", seed = 6) =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) {
      g.fillStyle = `rgba(${r() < 0.5 ? "0,0,0" : "255,255,255"},${r() * 0.07})`;
      g.fillRect(r() * w - 40, r() * h, 40 + r() * 160, 1);
    }
  });

/** escalator step tread: dark aluminium grooves with a yellow safety edge */
export const escStep = () =>
  makeTex(128, 128, (g, w, h) => {
    g.fillStyle = "#3a3c40";
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 6) { g.fillStyle = "#6c7076"; g.fillRect(x, 0, 3, h); }
    g.fillStyle = "#e8c21e";
    g.fillRect(0, 0, w, 10);
    g.fillRect(0, 0, 8, h);
    g.fillRect(w - 8, 0, 8, h);
  });

/** fast food menu board with burger / fries / drink pictures */
export const fastMenu = (title: string, bg: string, accent: string, seed = 1) =>
  makeTex(512, 256, (g, w, h) => {
    const r = rng(seed);
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = accent;
    g.fillRect(0, 0, w, 46);
    g.fillStyle = "#ffffff";
    g.font = "900 34px 'Arial Black', sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(title, w / 2, 24);
    for (let i = 0; i < 4; i++) {
      const cx = 64 + i * 128, cy = 128;
      g.fillStyle = "rgba(255,255,255,0.12)";
      g.beginPath(); g.arc(cx, cy, 50, 0, 7); g.fill();
      const kind = (i + seed) % 4;
      if (kind === 0) {
        g.fillStyle = "#d8913a"; g.beginPath(); g.ellipse(cx, cy - 10, 40, 22, 0, PI, 0); g.fill();
        g.fillStyle = "#5a2e14"; g.fillRect(cx - 40, cy - 8, 80, 12);
        g.fillStyle = "#6fbf3a"; g.fillRect(cx - 42, cy - 12, 84, 5);
        g.fillStyle = "#f6c533"; g.fillRect(cx - 38, cy + 3, 76, 5);
        g.fillStyle = "#d8913a"; g.fillRect(cx - 38, cy + 8, 76, 12);
      } else if (kind === 1) {
        g.fillStyle = "#f6c533";
        for (let k = 0; k < 9; k++) g.fillRect(cx - 24 + k * 6, cy - 34 + r() * 10, 5, 40);
        g.fillStyle = "#e0282e"; g.beginPath(); g.moveTo(cx - 30, cy - 4); g.lineTo(cx + 30, cy - 4); g.lineTo(cx + 22, cy + 36); g.lineTo(cx - 22, cy + 36); g.fill();
      } else if (kind === 2) {
        g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(cx - 24, cy - 36); g.lineTo(cx + 24, cy - 36); g.lineTo(cx + 18, cy + 36); g.lineTo(cx - 18, cy + 36); g.fill();
        g.fillStyle = accent; g.fillRect(cx - 22, cy - 10, 44, 20);
        g.fillStyle = "#333"; g.fillRect(cx + 4, cy - 56, 4, 22);
      } else {
        g.fillStyle = "#f0d9a0"; g.beginPath(); g.moveTo(cx - 36, cy + 20); g.lineTo(cx, cy - 36); g.lineTo(cx + 36, cy + 20); g.fill();
        g.fillStyle = "#ffffff"; g.beginPath(); g.arc(cx, cy - 32, 14, 0, 7); g.fill();
      }
      g.fillStyle = "#ffffff";
      g.font = "bold 22px 'Trebuchet MS', sans-serif";
      g.fillText(["COMBO", "FRIES", "SODA", "CONE"][kind] + " " + (2 + i + r()).toFixed(2), cx, 214);
    }
  });

/** piano keyboard strip (U along keys) */
export const pianoKeys = () =>
  makeTex(512, 64, (g, w, h) => {
    g.fillStyle = "#f7f5ef";
    g.fillRect(0, 0, w, h);
    const n = 36, s = w / n;
    g.fillStyle = "#b8b4aa";
    for (let i = 0; i <= n; i++) g.fillRect(i * s, 0, 1, h);
    g.fillStyle = "#151515";
    for (let i = 0; i < n; i++) { const m = i % 7; if (m === 0 || m === 1 || m === 3 || m === 4 || m === 5) g.fillRect((i + 0.68) * s, 0, s * 0.62, h * 0.6); }
  });

/** arcade carpet: dark purple with neon shapes */
export const arcadeCarpet = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = rng(77);
    g.fillStyle = "#1c1533";
    g.fillRect(0, 0, w, h);
    const cols = ["#ff3fa4", "#39e0ff", "#ffe23f", "#7cff5a", "#a86bff"];
    for (let i = 0; i < 44; i++) {
      g.strokeStyle = cols[Math.floor(r() * cols.length)];
      g.lineWidth = 3;
      const x = r() * w, y = r() * h, s = 6 + r() * 12;
      g.beginPath();
      if (i % 3 === 0) g.arc(x, y, s, 0, 7);
      else if (i % 3 === 1) { g.moveTo(x - s, y + s); g.lineTo(x, y - s); g.lineTo(x + s, y + s); g.closePath(); }
      else { g.moveTo(x - s, y); g.lineTo(x - s / 3, y - s / 2); g.lineTo(x + s / 3, y + s / 2); g.lineTo(x + s, y); }
      g.stroke();
    }
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.2})`; g.fillRect(r() * w, r() * h, 1, 1); }
  });

/** arcade game screens atlas (2x2): racing, space shooter, fighting, puzzle */
export const gameScreens = () =>
  makeTex(256, 256, (g, w) => {
    const s = w / 2;
    const r = rng(9);
    // racing
    g.fillStyle = "#4bb0ff"; g.fillRect(0, 0, s, s * 0.45);
    g.fillStyle = "#3e9b3a"; g.fillRect(0, s * 0.45, s, s * 0.55);
    g.fillStyle = "#555"; g.beginPath(); g.moveTo(s * 0.45, s * 0.45); g.lineTo(s * 0.55, s * 0.45); g.lineTo(s * 0.95, s); g.lineTo(s * 0.05, s); g.fill();
    g.fillStyle = "#fff"; for (let i = 0; i < 4; i++) g.fillRect(s * 0.49, s * (0.5 + i * 0.13), s * 0.02, s * 0.06);
    g.fillStyle = "#e0282e"; g.fillRect(s * 0.4, s * 0.78, s * 0.2, s * 0.12);
    // space shooter
    g.fillStyle = "#0a0a24"; g.fillRect(s, 0, s, s);
    g.fillStyle = "#fff"; for (let i = 0; i < 50; i++) g.fillRect(s + r() * s, r() * s, 2, 2);
    g.fillStyle = "#7cff5a"; for (let i = 0; i < 5; i++) { g.fillRect(s + 12 + i * 22, 20, 14, 10); g.fillRect(s + 12 + i * 22, 44, 14, 10); }
    g.fillStyle = "#39e0ff"; g.beginPath(); g.moveTo(s * 1.5, s * 0.78); g.lineTo(s * 1.42, s * 0.92); g.lineTo(s * 1.58, s * 0.92); g.fill();
    // fighting
    const grd = g.createLinearGradient(0, s, 0, 2 * s); grd.addColorStop(0, "#ff7e3f"); grd.addColorStop(1, "#7a1f5c");
    g.fillStyle = grd; g.fillRect(0, s, s, s);
    g.fillStyle = "#ffe23f"; g.fillRect(8, s + 8, s * 0.4, 8); g.fillRect(s * 0.55, s + 8, s * 0.4, 8);
    g.fillStyle = "#222"; g.fillRect(s * 0.25, s * 1.45, 18, 50); g.fillRect(s * 0.65, s * 1.45, 18, 50);
    g.beginPath(); g.arc(s * 0.25 + 9, s * 1.4, 10, 0, 7); g.arc(s * 0.65 + 9, s * 1.4, 10, 0, 7); g.fill();
    // puzzle
    g.fillStyle = "#15152b"; g.fillRect(s, s, s, s);
    const pc = ["#ff3fa4", "#39e0ff", "#ffe23f", "#7cff5a", "#a86bff", "#ff7e3f"];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 6; x++) if (y > 2 || r() < 0.3) { g.fillStyle = pc[Math.floor(r() * pc.length)]; g.fillRect(s + 22 + x * 14, s + 12 + y * 14, 13, 13); }
  });

/** checkered black/white marquee lights strip */
export const bulbs = (bg = "#1a1a1a", bulb = "#fff3b0") =>
  makeTex(256, 32, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = bulb;
    for (let x = 8; x < w; x += 16) { g.beginPath(); g.arc(x, h / 2, 5, 0, 7); g.fill(); }
  });

/** slatwall panel (horizontal grooves) */
export const slatwall = (base = "#e9e4dc") =>
  makeTex(256, 256, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) { g.fillStyle = "rgba(0,0,0,0.28)"; g.fillRect(0, y, w, 5); g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(0, y + 5, w, 2); }
  });

const PI = Math.PI;
