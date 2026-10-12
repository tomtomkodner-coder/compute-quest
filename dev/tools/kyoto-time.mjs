import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 400, height: 300 } }); p.on("console", (m) => m.text().startsWith("KYT") && console.log(m.text()));
await p.goto("http://127.0.0.1:5180/.preview-tmp/harness.html");
await p.waitForFunction(() => window.__meccha, null, { timeout: 90000 });
const r = await p.evaluate((map) => {
  const e = window.__meccha; e.hostUpdate = () => {}; e.onRS = () => {};
  const out = [];
  for (let i = 0; i < 4; i++) { e.worldId = null; const t0 = performance.now(); e.loadWorld(i % 2 ? "lobby" : map); out.push(Math.round(performance.now() - t0)); }
  return out;
}, process.argv[2] || "kyoto");
console.log(JSON.stringify(r));
await b.close();
