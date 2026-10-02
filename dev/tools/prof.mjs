// node prof.mjs <mapId> <texModule>: times texture generators, full build, lists unreachable nav cells
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
const map = process.argv[2], texmod = process.argv[3];
const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 400, height: 300 } });
p.on("pageerror", (e) => console.log("PAGEERR " + e.message));
await p.goto("http://127.0.0.1:5180/.preview-tmp/harness.html");
await p.waitForFunction(() => window.__meccha, null, { timeout: 120000 });
const r = await p.evaluate(async ([map, texmod]) => {
  const out = {};
  const T = await import("/src/game/meccha/textures.ts");
  const E = await import(texmod);
  for (const [k, f] of Object.entries(E)) {
    if (typeof f !== "function") continue;
    const t0 = performance.now(); let t; try { t = f(); } catch (e) { out[k] = "ERR " + e.message; continue; }
    const t1 = performance.now(); if (t && t.canvas) T.normalMapFrom(t); const t2 = performance.now();
    out[k] = [Math.round(t1 - t0), Math.round(t2 - t1)];
  }
  const e = window.__meccha;
  e.hostUpdate = () => {}; e.onRS = () => {}; e.rs.map = map;
  const t0 = performance.now(); e.loadWorld(map); out.build = Math.round(performance.now() - t0);
  const t1 = performance.now(); e.loadWorld(map); out.build2 = Math.round(performance.now() - t1);
  const w = e.world, nav = e.nav, hs = w.hunterSpawns[0];
  const un = [];
  for (let x = w.bounds.minX + 1; x < w.bounds.maxX; x += 2) for (let z = w.bounds.minZ + 1; z < w.bounds.maxZ; z += 2) { if (!nav.free(x, z)) continue; if (!nav.find(hs.x, hs.z, x, z)) un.push([+x.toFixed(2), +z.toFixed(2)]); }
  out.unreach = un;
  return out;
}, [map, texmod]);
console.log(JSON.stringify(r));
await b.close();
