// Canvas textures for the Death Burger map (an abandoned night-time fast-food amusement park):
// weathered painted planks, stone paving, dark grass, marquee "DEATH BURGER" letters, rusty burger badge,
// menu board, "P" badge, stripes, eyeball, pumpkin skin, stone and rust.
import { makeTex } from "../../textures";

export function dbRng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** one weathered painted wooden plank (vertical grain), paint chipped to grey wood, dirt at the bottom */
export const dbPlank = (paint: string, seed = 1, boards = 1) =>
  makeTex(128 * boards, 512, (g, w, h) => {
    const r = dbRng(seed);
    const bw = w / boards;
    for (let b = 0; b < boards; b++) {
      const x0 = b * bw;
      const cols = paint.split("|");
      const col = cols[b % cols.length];
      // bare wood under the paint
      g.fillStyle = "#8a7d68";
      g.fillRect(x0, 0, bw, h);
      g.fillStyle = col;
      g.fillRect(x0 + 2, 0, bw - 4, h);
      // grain
      for (let i = 0; i < 40; i++) {
        const x = x0 + r() * bw;
        g.strokeStyle = `rgba(60,45,25,${0.05 + r() * 0.08})`;
        g.lineWidth = 0.8 + r() * 1.5;
        g.beginPath();
        g.moveTo(x, 0);
        g.bezierCurveTo(x + (r() - 0.5) * 8, h * 0.33, x + (r() - 0.5) * 8, h * 0.66, x + (r() - 0.5) * 6, h);
        g.stroke();
      }
      // paint flaking off along the grain, revealing grey wood
      for (let i = 0; i < 46; i++) {
        const x = x0 + 3 + r() * (bw - 10), y = r() * h, fw = 1.5 + r() * (r() < 0.2 ? 9 : 4), fh = 4 + r() * (r() < 0.2 ? 40 : 14);
        g.fillStyle = `rgba(${140 + r() * 30},${128 + r() * 25},${108 + r() * 20},${0.55 + r() * 0.35})`;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + fw * (0.6 + r() * 0.6), y + fh * 0.3);
        g.lineTo(x + fw * (0.3 + r() * 0.6), y + fh);
        g.lineTo(x - fw * 0.3 * r(), y + fh * 0.6);
        g.closePath();
        g.fill();
        g.strokeStyle = "rgba(40,30,20,0.25)"; g.lineWidth = 0.8; g.stroke();
      }
      // dirt streaks from top and grime at the bottom
      for (let i = 0; i < 8; i++) {
        const x = x0 + r() * bw;
        const gr = g.createLinearGradient(0, 0, 0, h * (0.2 + r() * 0.5));
        gr.addColorStop(0, "rgba(70,55,30,0.35)");
        gr.addColorStop(1, "rgba(70,55,30,0)");
        g.fillStyle = gr;
        g.fillRect(x, 0, 2 + r() * 6, h);
      }
      const gb = g.createLinearGradient(0, h * 0.7, 0, h);
      gb.addColorStop(0, "rgba(40,32,20,0)");
      gb.addColorStop(1, "rgba(40,32,20,0.55)");
      g.fillStyle = gb;
      g.fillRect(x0, 0, bw, h);
      // seams and nails
      g.fillStyle = "rgba(20,15,10,0.8)";
      g.fillRect(x0, 0, 2, h);
      g.fillRect(x0 + bw - 2, 0, 2, h);
      for (const y of [h * 0.12, h * 0.5, h * 0.88]) {
        g.fillStyle = "#3a3530";
        g.beginPath(); g.arc(x0 + bw / 2 - 12, y, 2.2, 0, Math.PI * 2); g.arc(x0 + bw / 2 + 12, y, 2.2, 0, Math.PI * 2); g.fill();
        g.fillStyle = "rgba(120,60,20,0.35)";
        g.fillRect(x0 + bw / 2 - 13, y, 2, 14);
      }
    }
  });

/** grey stone paving slab with pits, cracks and a mossy rim */
export const dbStone = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = dbRng(11);
    g.fillStyle = "#8f8f8a";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 50; i++) {
      g.fillStyle = `rgba(${r() < 0.5 ? "0,0,0" : "255,255,255"},${0.03 + r() * 0.06})`;
      g.beginPath();
      g.ellipse(r() * w, r() * h, 10 + r() * 40, 6 + r() * 25, r() * 3, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 3000; i++) {
      g.fillStyle = `rgba(${r() < 0.5 ? "30,30,28" : "220,220,210"},${r() * 0.18})`;
      g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
    }
    g.strokeStyle = "rgba(30,30,28,0.45)";
    g.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      let x = r() * w, y = r() * h;
      g.beginPath(); g.moveTo(x, y);
      for (let j = 0; j < 6; j++) { x += (r() - 0.5) * 50; y += (r() - 0.5) * 50; g.lineTo(x, y); }
      g.stroke();
    }
    const e = 14;
    g.fillStyle = "rgba(60,75,40,0.35)";
    g.fillRect(0, 0, w, e * 0.4); g.fillRect(0, h - e * 0.4, w, e * 0.4);
    g.fillRect(0, 0, e * 0.4, h); g.fillRect(w - e * 0.4, 0, e * 0.4, h);
  });

/** dark night-time lawn: dirt, grass blades and fallen leaves */
export const dbGrass = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = dbRng(5);
    g.fillStyle = "#2a3020";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) {
      const x = r() * w, y = r() * h, rad = 15 + r() * 45;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      const c = r() < 0.5 ? "58,46,30" : "44,62,30";
      gr.addColorStop(0, `rgba(${c},0.6)`);
      gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr;
      g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    for (let i = 0; i < 2200; i++) {
      const x = r() * w, y = r() * h;
      g.strokeStyle = `rgba(${60 + r() * 60},${80 + r() * 60},${30 + r() * 30},${0.3 + r() * 0.5})`;
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y - 3 - r() * 5); g.stroke();
    }
    for (let i = 0; i < 50; i++) {
      const x = r() * w, y = r() * h;
      g.fillStyle = ["#6b4a1e", "#8a5a1c", "#5a3a16", "#9a7a2a"][Math.floor(r() * 4)];
      g.beginPath(); g.ellipse(x, y, 3 + r() * 3, 1.5 + r() * 2, r() * 3, 0, Math.PI * 2); g.fill();
    }
  });

/** "DEATH / BURGER" marquee letters: rusty bevelled metal studded with bulbs (transparent background) */
export const dbLetters = () =>
  makeTex(512, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const lines: [string, number][] = [["DEATH", 112], ["BURGER", 236]];
    g.textBaseline = "alphabetic";
    g.textAlign = "center";
    g.lineJoin = "round";
    for (const [txt, y] of lines) {
      let fs = 118;
      g.font = `bold ${fs}px Impact, "Arial Black", sans-serif`;
      const tw = g.measureText(txt).width;
      if (tw > w - 30) { fs = Math.floor((fs * (w - 30)) / tw); g.font = `bold ${fs}px Impact, "Arial Black", sans-serif`; }
      const x = w / 2;
      g.strokeStyle = "#1c120a"; g.lineWidth = 12; g.strokeText(txt, x + 3, y + 3);
      g.fillStyle = "#2c1d12"; g.fillText(txt, x + 3, y + 3);
      g.strokeStyle = "#3a2818"; g.lineWidth = 8; g.strokeText(txt, x, y);
      g.fillStyle = "#6e543c"; g.fillText(txt, x, y);
      g.strokeStyle = "rgba(190,160,120,0.55)"; g.lineWidth = 2; g.strokeText(txt, x - 1, y - 1);
    }
    // rust mottling only on the letters
    const r = dbRng(3);
    g.globalCompositeOperation = "source-atop";
    for (let i = 0; i < 900; i++) { g.fillStyle = r() < 0.5 ? `rgba(150,70,25,${r() * 0.35})` : `rgba(20,12,6,${r() * 0.3})`; g.fillRect(r() * w, r() * h, 2 + r() * 5, 2 + r() * 4); }
    g.globalCompositeOperation = "source-over";
    const mask = g.getImageData(0, 0, w, h).data;
    for (let y = 6, row = 0; y < h; y += 12, row++)
      for (let x = 6 + (row % 2) * 6; x < w; x += 12) {
        let ok = true;
        for (const [dx, dy] of [[0, 0], [-3, 0], [3, 0], [0, -3], [0, 3]]) {
          const i = ((y + dy) * w + x + dx) * 4;
          if (!(mask[i + 3] > 0 && mask[i] > 80)) ok = false;
        }
        if (!ok) continue;
        g.fillStyle = "#2a1a0e"; g.beginPath(); g.arc(x, y, 4.6, 0, Math.PI * 2); g.fill();
        const gr = g.createRadialGradient(x - 1, y - 1, 0, x, y, 3.8);
        gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.45, "#ffe9a8"); gr.addColorStop(1, "#c88a30");
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, 3.6, 0, Math.PI * 2); g.fill();
      }
  });

/** night sky seen through a dark forest canopy (inside of a dome; very dark) */
export const dbNightCanopy = () =>
  makeTex(512, 256, (g, w, h) => {
    const r = dbRng(71);
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "#06070a"); gr.addColorStop(0.5, "#0b0d12"); gr.addColorStop(1, "#141712");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) {
      const x = r() * w, y = r() * h * 0.62, rad = 3 + r() * 16;
      const c = r() < 0.5 ? "54,50,26" : "34,38,22";
      g.fillStyle = `rgba(${c},${0.25 + r() * 0.45})`;
      for (const ox of [-w, 0, w]) { g.beginPath(); g.ellipse(x + ox, y, rad, rad * (0.5 + r() * 0.6), r() * 3, 0, Math.PI * 2); g.fill(); }
    }
    for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(200,210,255,${0.2 + r() * 0.5})`; g.fillRect(r() * w, r() * h * 0.45, 1, 1); }
    // treeline silhouettes near the horizon
    g.fillStyle = "#050605";
    g.beginPath(); g.moveTo(0, h);
    for (let x = 0; x <= w; x += 4) g.lineTo(x, h * 0.6 - Math.abs(Math.sin(x * 0.05) * 14) - Math.abs(Math.sin(x * 0.013)) * 22 - r() * 5);
    g.lineTo(w, h); g.fill();
  });

/** round rusty burger badge (drawn on a cylinder cap: circle fills the square) */
export const dbBurgerBadge = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = dbRng(8);
    g.fillStyle = "#4a3526";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#6e5642";
    g.beginPath(); g.arc(w / 2, h / 2, w * 0.47, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#2c1f15"; g.lineWidth = 8;
    g.beginPath(); g.arc(w / 2, h / 2, w * 0.44, 0, Math.PI * 2); g.stroke();
    const cx = w / 2;
    // top bun
    g.fillStyle = "#8a6446";
    g.beginPath(); g.ellipse(cx, 112, 86, 58, 0, Math.PI, 0); g.fill();
    g.strokeStyle = "#2c1f15"; g.lineWidth = 5; g.stroke();
    g.fillStyle = "#d8c9a0";
    for (let i = 0; i < 12; i++) { g.beginPath(); g.ellipse(cx - 60 + r() * 120, 70 + r() * 36, 5, 2.5, r(), 0, Math.PI * 2); g.fill(); }
    // layers
    const band = (y: number, hh: number, c: string) => { g.fillStyle = c; g.beginPath(); g.roundRect(cx - 92, y, 184, hh, hh / 2); g.fill(); g.strokeStyle = "#2c1f15"; g.lineWidth = 4; g.stroke(); };
    band(118, 16, "#7c8a44");
    band(136, 22, "#4a2e1e");
    band(160, 12, "#b59038");
    band(174, 20, "#4a2e1e");
    g.fillStyle = "#8a6446";
    g.beginPath(); g.roundRect(cx - 84, 196, 168, 26, 12); g.fill(); g.stroke();
    for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "140,70,30" : "20,14,8"},${r() * 0.3})`; g.fillRect(r() * w, r() * h, 2, 2); }
  });

/** fast-food menu board at the park boundary (parody items) */
export const dbMenu = () =>
  makeTex(512, 256, (g, w, h) => {
    const r = dbRng(21);
    g.fillStyle = "#1b1512";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#b8231c";
    g.fillRect(0, 0, w, 44);
    g.fillStyle = "#ffd23a";
    g.font = "bold 32px Impact, 'Arial Black', sans-serif";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("DEATH BURGER  MENU", w / 2, 23);
    const items = [["Eyeball Melt", "6.66"], ["Grave Double", "8.13"], ["Tentacle Fries", "3.33"], ["Clown Nuggets", "4.44"], ["Blood Cola", "2.66"], ["Pumpkin Shake", "3.99"]];
    g.textAlign = "left";
    g.font = "bold 20px 'Arial Black', sans-serif";
    items.forEach(([n, p], i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 18 + col * 250, y = 72 + row * 60;
      // food thumbnail
      g.fillStyle = ["#a0612c", "#c94f28", "#e0b43a"][row];
      g.beginPath(); g.ellipse(x + 26, y + 6, 24, 18, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(x + 4, y + 10, 44, 5);
      g.fillStyle = "#f0e6d0";
      g.fillText(n, x + 60, y);
      g.fillStyle = "#ffd23a";
      g.fillText(p, x + 60, y + 22);
    });
    g.fillStyle = "#b8231c"; g.fillRect(0, h - 14, w, 14);
    // grime, scratches, flicker-dead corner
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${r() < 0.6 ? "0,0,0" : "120,90,60"},${r() * 0.3})`; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 2); }
    const gr = g.createRadialGradient(w, h, 10, w, h, 220);
    gr.addColorStop(0, "rgba(0,0,0,0.7)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });

/** yellow round badge with an orange "P" (transparent outside the circle) */
export const dbPBadge = () =>
  makeTex(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = "#ffc629";
    g.beginPath(); g.arc(w / 2, h / 2, 60, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#e8841a"; g.lineWidth = 7;
    g.beginPath(); g.arc(w / 2, h / 2, 54, 0, Math.PI * 2); g.stroke();
    g.fillStyle = "#e8841a";
    g.font = "bold 78px 'Arial Black', sans-serif";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("P", w / 2 + 2, h / 2 + 5);
  });

/** stripes across U (for tubes, cones, awnings): n pairs of a/b, slightly dirty */
export const dbStripes = (a: string, b: string, seed = 2) =>
  makeTex(256, 64, (g, w, h) => {
    const r = dbRng(seed);
    g.fillStyle = a; g.fillRect(0, 0, w / 2, h);
    g.fillStyle = b; g.fillRect(w / 2, 0, w / 2, h);
    for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(60,40,20,${r() * 0.12})`; g.fillRect(r() * w, r() * h, 2 + r() * 4, 1 + r() * 2); }
  });

/** eyeball: white sclera with red veins and a spiral iris centred at u=0.25, v=0.5 (+Z of a SphereGeometry) */
export const dbEye = () =>
  makeTex(512, 256, (g, w, h) => {
    const r = dbRng(13);
    g.fillStyle = "#ece6dc";
    g.fillRect(0, 0, w, h);
    const cx = w * 0.25, cy = h * 0.5;
    g.strokeStyle = "rgba(170,30,30,0.55)";
    for (let i = 0; i < 40; i++) {
      let x = cx + (r() - 0.5) * w * 0.9, y = r() * h;
      if (Math.hypot(x - cx, y - cy) < 60) x += 120;
      g.lineWidth = 0.6 + r() * 1.4;
      g.beginPath(); g.moveTo(x, y);
      for (let j = 0; j < 5; j++) { x += (cx - x) * 0.15 + (r() - 0.5) * 20; y += (cy - y) * 0.15 + (r() - 0.5) * 20; g.lineTo(x, y); }
      g.stroke();
    }
    // spiral iris
    g.fillStyle = "#d8d2c4";
    g.beginPath(); g.ellipse(cx, cy, 48, 44, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#2a2622"; g.lineWidth = 9;
    g.beginPath();
    for (let a = 0; a < Math.PI * 7; a += 0.1) { const rr = 3 + a * 2.0; g.lineTo(cx + Math.cos(a) * rr * 1.12, cy + Math.sin(a) * rr); }
    g.stroke();
    g.fillStyle = "#111"; g.beginPath(); g.arc(cx, cy, 9, 0, Math.PI * 2); g.fill();
    // grime
    for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(110,90,60,${r() * 0.15})`; g.fillRect(r() * w, r() * h, 2, 2); }
  });

/** pumpkin skin: orange with darker rib grooves at every 1/ribs of U */
export const dbPumpkin = (ribs = 8) =>
  makeTex(256, 128, (g, w, h) => {
    const r = dbRng(4);
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "#c65a10"); gr.addColorStop(0.5, "#f08a1c"); gr.addColorStop(1, "#b0500e");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < ribs; i++) {
      const x = (i / ribs) * w;
      const lg = g.createLinearGradient(x - 10, 0, x + 10, 0);
      lg.addColorStop(0, "rgba(120,40,0,0)"); lg.addColorStop(0.5, "rgba(120,40,0,0.55)"); lg.addColorStop(1, "rgba(120,40,0,0)");
      g.fillStyle = lg; g.fillRect(x - 10, 0, 20, h);
    }
    for (let i = 0; i < 1200; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,200,120" : "90,40,0"},${r() * 0.15})`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 3); }
  });

/** tentacle skin: red with lighter belly along V and speckles */
export const dbTentacle = () =>
  makeTex(256, 64, (g, w, h) => {
    const r = dbRng(17);
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "#b8201a"); gr.addColorStop(0.45, "#d8402a"); gr.addColorStop(0.75, "#e8866a"); gr.addColorStop(1, "#b8201a");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "90,10,10" : "255,170,140"},${r() * 0.3})`; g.beginPath(); g.arc(r() * w, r() * h, 0.5 + r() * 1.5, 0, 7); g.fill(); }
  });

/** rusty / tarnished metal */
export const dbRust = (base: string, seed = 6) =>
  makeTex(256, 256, (g, w, h) => {
    const r = dbRng(seed);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const x = r() * w, y = r() * h, rad = 4 + r() * 26;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, `rgba(${110 + r() * 40},${50 + r() * 20},20,${0.3 + r() * 0.4})`);
      gr.addColorStop(1, "rgba(110,50,20,0)");
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.15})`; g.fillRect(r() * w, r() * h, 1, 1); }
  });

/** bun crust: golden-brown with sesame seeds */
export const dbBun = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = dbRng(31);
    g.fillStyle = "#c07a36"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) {
      const x = r() * w, y = r() * h, rad = 10 + r() * 40;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, `rgba(${r() < 0.5 ? "150,80,30" : "220,150,80"},0.4)`); gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    for (let i = 0; i < 60; i++) {
      g.fillStyle = "#eadcb4";
      g.beginPath(); g.ellipse(r() * w, r() * h * 0.7, 4, 2, r() * 3, 0, Math.PI * 2); g.fill();
    }
    for (let i = 0; i < 2000; i++) { g.fillStyle = `rgba(60,30,10,${r() * 0.15})`; g.fillRect(r() * w, r() * h, 2, 2); }
  });

/** grimy black/white checker diner floor */
export const dbDinerFloor = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = dbRng(41);
    const n = 4, s = w / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.fillStyle = (x + y) % 2 ? "#d8d2c4" : "#1e1c1a"; g.fillRect(x * s, y * s, s, s); }
    g.strokeStyle = "rgba(60,50,40,0.6)"; g.lineWidth = 2;
    for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); }
    for (let i = 0; i < 40; i++) {
      const x = r() * w, y = r() * h, rad = 8 + r() * 30;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, "rgba(70,50,20,0.35)"); gr.addColorStop(1, "rgba(70,50,20,0)");
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  });

/** tiled kitchen wall, dirty */
export const dbWallTile = () =>
  makeTex(256, 256, (g, w, h) => {
    const r = dbRng(43);
    g.fillStyle = "#b9b4a6"; g.fillRect(0, 0, w, h);
    const s = 32;
    for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) {
      const t = 205 + r() * 25;
      g.fillStyle = `rgb(${t},${t - 6},${t - 18})`;
      g.fillRect(x + 1.5, y + 1.5, s - 3, s - 3);
    }
    g.fillStyle = "#9e2a22"; g.fillRect(0, h * 0.5 - 8, w, 16);
    const gb = g.createLinearGradient(0, h * 0.6, 0, h);
    gb.addColorStop(0, "rgba(60,45,25,0)"); gb.addColorStop(1, "rgba(60,45,25,0.45)");
    g.fillStyle = gb; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1200; i++) { g.fillStyle = `rgba(70,50,30,${r() * 0.2})`; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); }
  });
