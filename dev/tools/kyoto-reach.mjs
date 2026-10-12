import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 400, height: 300 } });
await p.goto("http://127.0.0.1:5180/.preview-tmp/harness.html");
await p.waitForFunction(() => window.__meccha, null, { timeout: 90000 });
const r = await p.evaluate((map) => {
  const e = window.__meccha; e.hostUpdate = () => {}; e.onRS = () => {}; e.rs.map = map; e.loadWorld(map);
  const w = e.world, nav = e.nav, hs = w.hunterSpawns[0]; const bad = [];
  for (let x = w.bounds.minX + 1; x < w.bounds.maxX; x += 2) for (let z = w.bounds.minZ + 1; z < w.bounds.maxZ; z += 2) { if (!nav.free(x, z)) continue; if (!nav.find(hs.x, hs.z, x, z)) bad.push([+x.toFixed(1), +z.toFixed(1)]); }
  return bad;
}, process.argv[2] || "kyoto");
console.log(JSON.stringify(r));
await b.close();
