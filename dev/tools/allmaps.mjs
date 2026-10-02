import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 320, height: 180 } });
const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 150)));
await p.goto("http://127.0.0.1:5180/.preview-tmp/harness.html");
await p.waitForFunction(() => window.__meccha, null, { timeout: 180000 });
for (const id of "mansion,country,sewer,backrooms,penguin,sugarland,osaka,egypt,deathburger,greece,deepsea,mall,kyoto,museum,gallery,coldstorage,brickloft,pool,sakura,meeting,school,amusement,onsen,".split(",").filter(Boolean)) {
  const r = await p.evaluate((id) => { const e = window.__meccha; e.hostUpdate = () => {}; e.onRS = () => {}; e.rs.map = id; const t = performance.now(); try { e.loadWorld(id); } catch (x) { return id + " ERR " + x.message; } const ms = Math.round(performance.now() - t); const w = e.world; const free = w.hiderSpawns.filter((s) => e.nav.free(s.x, s.z)).length; return id + " " + ms + "ms spawns " + free + "/" + w.hiderSpawns.length; }, id);
  console.log(r, errs.length ? "ERRS " + errs.splice(0).join(" | ").slice(0, 200) : "");
}
await b.close();
