// preview-only render of maps: node pv.mjs map1 map2 ...
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
for (const map of process.argv.slice(2)) {
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  await p.goto("http://127.0.0.1:5180/.preview-tmp/harness.html");
  await p.waitForFunction(() => window.__meccha, null, { timeout: 120000 });
  const ms = await p.evaluate((map) => { const e = window.__meccha; e.hostUpdate = () => {}; e.onRS = () => {}; e.rs.map = map; const t0 = performance.now(); e.loadWorld(map); const ms = performance.now() - t0; e.rs.ph = "hunt"; e.freeCam = true; e.nameplates = false;
    for (const pl of e.players.values()) pl.ch.root.visible = false;
    const pv = e.world.preview; const [x,y,z]=pv.pos, [lx,ly,lz]=pv.look; e.specPos.set(x,y,z); e.camYaw=Math.atan2(-(lx-x),-(lz-z)); e.camPitch=-Math.atan2(ly-y, Math.hypot(lx-x,lz-z)); return Math.round(ms); }, map);
  await p.waitForTimeout(3000);
  await p.screenshot({ path: `pv-${map}.png`, timeout: 240000 });
  if (process.env.EXP) { console.log(await p.evaluate((c) => { const e = window.__meccha; return String(eval(c)); }, process.env.EXP)); await p.waitForTimeout(1500); await p.screenshot({ path: `pv-${map}-x.png`, timeout: 240000 }); }
  console.log(map, ms, "ms");
  await p.close();
}
await b.close();
