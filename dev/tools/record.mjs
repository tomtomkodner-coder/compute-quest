// 5-minute video of bots playing (offline mode, spectator camera cycling between bots)
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
const MIN = Number(process.env.MIN || 5);
const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const ctx = await b.newContext({ viewport: { width: 960, height: 540 }, recordVideo: { dir: "video/raw", size: { width: 960, height: 540 } } });
await ctx.addInitScript(() => { try { localStorage.setItem("meccha_lang2", "en"); localStorage.setItem("meccha_gfx", JSON.stringify({ shadow: 2, texture: 2, gi: 1, effects: 1, aa: 0, shading: 2, reflection: 1, fpsLimit: 30 })); } catch {} });
const p = await ctx.newPage();
await p.goto("http://127.0.0.1:5181/.preview-tmp/app.html");
await p.waitForSelector("text=Create Server", { timeout: 240000 });
await p.waitForTimeout(1500);
await p.click("text=Create Server");
await p.fill("input >> nth=0", "Camera");
await p.evaluate(() => { const el = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Play Offline (with Bots)"); setTimeout(() => el.click(), 0); });
for (let i = 0; i < 120; i++) { await p.waitForTimeout(2000); if (await p.evaluate(() => !!(window.__meccha && window.__meccha.world))) break; }
await p.evaluate(() => { const e = window.__meccha; e.setSettings({ bots: 6, map: "mansion", hideTime: 35, huntTime: 110, checkTime: 15 }); e.startCountdown(); });
const t0 = Date.now();
while (Date.now() - t0 < MIN * 60000) {
  await p.waitForTimeout(12000);
  await p.evaluate(() => { const e = window.__meccha; try { if (e.rs.ph === "hunt" || e.rs.ph === "hide") { if (!e.freeCam) e.toggleFreeCam(); e.cycleSpectate(); } if (e.rs.ph === "lobby") e.startCountdown(); } catch (err) { console.log(err); } });
}
await ctx.close();
await b.close();
console.log("done");
