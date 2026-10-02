import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { writeFileSync } from "fs";
const lang = process.argv[2] || "he";
const shots = process.argv[3] === "shots";
const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
p.on("pageerror", (e) => console.log("PAGEERR", e.message));
await p.addInitScript((l) => localStorage.setItem("meccha_lang2", l), lang);
await p.goto("http://127.0.0.1:5181/.preview-tmp/app.html");
const seen = new Map();
async function grab(tag) {
  const txt = await p.evaluate(() => {
    const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { const s = n.textContent.trim(); const el = n.parentElement; if (s && el && el.tagName !== "STYLE" && el.tagName !== "SCRIPT") out.push(s); }
    document.querySelectorAll("input[placeholder]").forEach((i) => out.push(i.placeholder));
    document.querySelectorAll("[title]").forEach((i) => out.push("title:" + i.title));
    return out;
  });
  for (const s of txt) if (!seen.has(s)) seen.set(s, tag);
  console.log('grab', tag, seen.size, new Date().toISOString().slice(11,19));
  writeFileSync(`scan-${lang}.json`, JSON.stringify([...seen.entries()], null, 0));
  if (shots) try { await p.screenshot({ path: `sc-${lang}-${tag}.png`, timeout: 90000 }); } catch (e) { console.log("shot fail", tag); }
}
const wait = (ms) => p.waitForTimeout(ms);
await p.waitForFunction(() => document.querySelectorAll("button").length > 10, null, { timeout: 30000 });
await wait(600);
await grab("menu");
const btn = async (i) => { const bs = await p.$$("button"); await bs[i].click(); await wait(500); };
await btn(0); await grab("create"); await p.keyboard.press("Escape"); await wait(400);
await btn(1); await grab("find"); await p.keyboard.press("Escape"); await wait(400);
await btn(2); await grab("settings");
for (let k = 0; k < 6; k++) { await p.keyboard.press("e"); await wait(300); await grab("set" + k); }
await p.keyboard.press("Escape"); await wait(400);
{ const bs = await p.$$("button"); await bs[bs.length - 2].click(); await wait(600); await grab("maps"); await p.keyboard.press("Escape"); await wait(400); }
{ const bs = await p.$$("button"); await bs[bs.length - 1].click(); await wait(600); await grab("credits"); await p.keyboard.press("Escape"); await wait(400); }
// offline game
await btn(0); await p.evaluate(() => document.querySelector("button.underline").click());
await p.waitForFunction(() => window.__meccha && window.__meccha.hud && window.__meccha.hud.players?.length > 1, null, { timeout: 90000 });
await wait(1500);
await grab("lobby");
const E = (f, a) => p.evaluate(f, a);
await E(() => window.__meccha.setSettings({ missed: true, ammoLimit: true, hunterTps: true }));
await E(() => window.__meccha.onInteract()); await wait(500); await grab("cfgmap");
for (const mode of ["infection", "double", "rcr", "normal"]) { await E((m) => window.__meccha.setSettings({ mode: m }), mode); await wait(200); await grab("cfg-" + mode); }
await p.mouse.click(5, 5); await wait(400);
await E(() => window.__meccha.onOptions()); await wait(500); await grab("opts");
for (let k = 0; k < 6; k++) { await p.keyboard.press("e"); await wait(250); await grab("opts" + k); }
await p.keyboard.press("Escape"); await wait(400);
const phase = (ph) => p.waitForFunction((x) => x.split("|").includes(window.__meccha.hud.phase), ph, { timeout: 60000, polling: 250 }).catch(() => console.log("phase timeout", ph));
const skip = () => E(() => { window.__meccha.localEnd = performance.now() + 50; });
for (let round = 0; round < (process.argv[4] === 'full' ? 2 : 1); round++) {
  await E(() => window.__meccha.startCountdown()); await phase("countdown"); await wait(800); await grab("countdown" + round);
  await skip(); await phase("hide"); await wait(1500);
  await p.mouse.click(5, 5); await wait(300);
  await grab("hide" + round);
  const role = await Promise.race([E(() => window.__meccha.hud.myRole), wait(20000).then(() => "?")]);
  console.log("round", round, "role", role);
  if (role === "hider") {
    await E(() => window.__meccha.onPoseMenu(true)); await wait(500); await grab("pose" + round);
    await E(() => window.__meccha.onPoseMenu(false)); await wait(300);
    await E(() => window.__meccha.togglePaint()); await wait(600); await grab("paint" + round);
    await E(() => window.__meccha.togglePaint()); await wait(300);
  }
  await skip(); await phase("hunt|check|lobby"); await wait(1200); await grab("hunt" + round);
  await E(() => window.__meccha.onTab()); await wait(300); await grab("tab" + round);
  await wait(2600); await grab("hunt2" + round);
  await skip(); await phase("check|lobby"); await wait(1200); await grab("check" + round);
  await skip(); await phase("lobby"); await wait(1500); await grab("after" + round);
  await E(() => window.__meccha.setSettings({ hunters: 3, mode: "infection" }));
}
writeFileSync(`scan-${lang}.json`, JSON.stringify([...seen.entries()], null, 0));
await b.close();
console.log("texts", seen.size);
