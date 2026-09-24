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
