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
  for (let i = 0; i < 3; i++) { const t0 = performance.now(); e.loadWorld(map); out.push(Math.round(performance.now() - t0)); e.loadWorld("lobby"); }
  return out;
}, map);
console.log(JSON.stringify(r));
await b.close();
