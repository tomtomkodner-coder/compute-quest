// usage: node off.mjs <lang> <map1,map2,...> [viewport WxH] [touch]
import { launch, ctxFor, watch, errs, offline, sleep, ev, until, endPhase } from "./lib.mjs";
const [lang = "en", maps = "mansion", vp = "640x360", touch] = process.argv.slice(2);
const [w, h] = vp.split("x").map(Number);
const b = await launch();
const ctx = await ctxFor(b, { viewport: { width: w, height: h }, ...(touch ? { hasTouch: true, isMobile: true } : {}) }, false);
await ctx.addInitScript((l) => { try { localStorage.setItem("meccha_lang2", l); } catch {} }, lang);
const t0 = Date.now(); const L = (...a) => console.log(((Date.now() - t0) / 1000).toFixed(0) + "s", ...a.map(x => typeof x === "string" ? x : JSON.stringify(x)));
const p = await ctx.newPage(); watch(p, "P");
await offline(p, "Solo"); L("offline loaded");
const seen = new Set();
const ALLOW = /^(FPS|TPS|HP|BGM|OK|Esc|Tab|Hex sRGB|MAPS|Tom Kodner|MECCHA|CHAMELEON|[A-Z]|[A-Z]\d?|LMB|RMB|Shift|Ctrl|Space|WASD|Alt|Enter|PLAY|ON|OFF|px|fps|G|Y|Q|E|F|R|C|V|X|Z|T|B|H|N|M|x\d+)$/;
async function grab(tag) {
  const txt = await p.evaluate(() => { const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const s = n.textContent.trim(); if (s) out.push(s); } document.querySelectorAll("input[placeholder]").forEach(i => out.push(i.placeholder)); return out; });
  if (lang === "en") return;
  const names = await p.evaluate(() => [...window.__meccha.players.values()].map(x => x.name));
  for (const s of txt) { if (names.some(n => s.includes(n)) && s.replace(new RegExp(names.join("|"), "g"), "").match(/[A-Za-z]{3,}/) == null) continue; if (/[A-Za-z]{3,}/.test(s) && !ALLOW.test(s) && !seen.has(s)) { seen.add(s); L("EN?", tag, "|", s.slice(0, 80)); } }
}
for (const map of maps.split(",")) {
  await ev(p, (m) => window.__meccha.setSettings({ map: m, bots: 3, hideTime: 40, huntTime: 60, checkTime: 20 }), map);
  await grab("lobby"); await ev(p, () => window.__meccha.startCountdown());
  await until([p], () => window.__meccha.rs.ph === "countdown", null, 30000, "cd"); await grab("countdown"); await endPhase(p);
  await until([p], () => window.__meccha.rs.ph === "hide" && window.__meccha.worldId !== "lobby" || window.__meccha.me.role === "hunter", null, 300000, "hide " + map);
  L(map, "hide", await ev(p, () => [window.__meccha.me.role, window.__meccha.worldId, window.__meccha.rs.map]));
  await ev(p, () => { const e = window.__meccha; if (e.me.role !== "hunter") { e.togglePaint(); } }); await sleep(3000); await grab("hide-paint");
  await ev(p, () => { const e = window.__meccha; if (e.hud.paintMode) e.togglePaint(); e.setPose?.("sit"); e.placeClone(); }); await sleep(2000); await grab("hide");
  await endPhase(p);
  await until([p], () => window.__meccha.rs.ph === "hunt", null, 120000, "hunt"); await sleep(8000); await grab("hunt");
  L(map, "hunt", await ev(p, () => [window.__meccha.me.role, window.__meccha.me.alive, window.__meccha.rs.dead.length]));
  await endPhase(p);
  await until([p], () => window.__meccha.rs.ph === "check", null, 120000, "check"); await sleep(4000); await grab("check");
  L(map, "check", await ev(p, () => [window.__meccha.rs.win, (window.__meccha.rs.res || []).map(r => r.n + ":" + r.p)]));
  await endPhase(p);
  await until([p], () => window.__meccha.rs.ph === "lobby" && window.__meccha.worldId === "lobby", null, 120000, "lobby"); await grab("results");
  L(map, "done");
}
if (process.env.SHOT) await p.screenshot({ path: process.env.SHOT, timeout: 240000 });
console.log(errs.slice(0, 20).join("\n")); await b.close();
