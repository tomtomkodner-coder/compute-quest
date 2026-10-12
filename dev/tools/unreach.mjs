// node prof2.mjs <mapId> : builds map 3x and reports times; also times tex fns called with args list
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
const map = process.argv[2];
const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 400, height: 300 } });
p.on("pageerror", (e) => console.log("PAGEERR " + e.message));
p.on("console", (m) => console.log("CONSOLE", m.text()));
await p.goto("http://127.0.0.1:5180/.preview-tmp/harness.html");
await p.waitForFunction(() => window.__meccha, null, { timeout: 120000 });
const r = await p.evaluate(async (map) => {
  const e = window.__meccha; e.hostUpdate = () => {}; e.onRS = () => {}; e.rs.map = map;
  const out = [];
  // wrap makeTex timing via performance marks: monkeypatch CanvasRenderingContext2D? simple: time builds
  e.loadWorld(map); const w = e.world, nav = e.nav, hs = w.hunterSpawns[0]; for (let x = w.bounds.minX + 1; x < w.bounds.maxX; x += 2) for (let z = w.bounds.minZ + 1; z < w.bounds.maxZ; z += 2) { if (nav.free(x, z) && !nav.find(hs.x, hs.z, x, z)) out.push([+x.toFixed(1), +z.toFixed(1)]); }
  return out;
}, map);
console.log(JSON.stringify(r));
await b.close();
