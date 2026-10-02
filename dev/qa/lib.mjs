import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import fs from "fs";
export const S = "/tmp/claude-0/-home-user-compute-quest/bc972495-63a4-5c7b-a8d6-ba8b8a5729b9/scratchpad";
export const URL = "http://127.0.0.1:5181/.preview-tmp/app.html";
export async function launch() { return chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] }); }
export async function ctxFor(b, opts = {}, fake = true) {
  const ctx = await b.newContext({ viewport: { width: 640, height: 360 }, ...Object.fromEntries(Object.entries(opts).filter(([k]) => k !== 'low')) }); ctx.setDefaultTimeout(240000);
  if (opts.low !== false) await ctx.addInitScript({ content: `try{if(!localStorage.getItem("meccha_gfx"))localStorage.setItem("meccha_gfx",JSON.stringify({shadow:0,texture:1,gi:0,effects:0,aa:0,shading:1,reflection:0,fpsLimit:6}))}catch(e){}` });
  if (fake) await ctx.addInitScript({ content: fs.readFileSync(S + "/fakeroom.js", "utf8") });
  return ctx;
}
export const errs = [];
export function watch(p, tag) {
  p.on("pageerror", (e) => errs.push(tag + " PAGEERR " + e.message + " " + (e.stack || "").split("\n").slice(1, 3).join(" | ")));
  p.on("console", (m) => { const x = m.text(); if ((m.type() === "error" || m.type() === "warning") && !/CERT|ERR_|Failed to load resource|fonts.g|GPU stall|WebGL|peerjs|PeerJS|net::/i.test(x)) errs.push(tag + " " + m.type() + ": " + x.slice(0, 300)); });
}
export async function toMenu(p) {
  await p.goto(URL);
  await p.waitForSelector("text=Create Server", { timeout: 240000 });
}
/** joins the fakeroom "This page's server" via Find Server */
export async function joinRoom(p, name) {
  await toMenu(p);
  await p.click("text=Find Server");
  await p.fill("input >> nth=0", name);
  await p.click("text=Search Public Servers");
  await p.waitForSelector("button:has-text('Join')", { timeout: 20000 });
  await asyncClick(p, "Join");
  await waitWorld(p);
}
export async function offline(p, name = "Solo") {
  await p.goto(URL);
  await p.waitForFunction(() => document.querySelectorAll("button").length >= 4, null, { timeout: 240000 });
  await sleep(500);
  await p.evaluate(() => document.querySelectorAll("button")[0].click()); // Create Server (any language)
  await sleep(800);
  await p.fill("input >> nth=0", name);
  await p.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.className.includes("underline")); setTimeout(() => b.click(), 0); });
  await waitWorld(p);
}
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const ev = (p, f, a) => p.evaluate(f, a);

/** click a button by exact text without waiting (game load blocks the main thread) */
export async function asyncClick(p, text) {
  await p.evaluate((t) => { const el = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === t); if (!el) throw new Error("no button " + t); setTimeout(() => el.click(), 0); }, text);
}

export async function waitWorld(p) {
  for (let i = 0; i < 120; i++) { await sleep(2000); if (await p.evaluate(() => !!(window.__meccha && window.__meccha.world && window.__meccha.me))) return; }
  throw new Error("world never loaded");
}
/** poll fn(page) on every page until all truthy */
export async function until(pages, fn, arg, ms = 200000, tag = "") {
  const t0 = Date.now(); let last;
  while (Date.now() - t0 < ms) {
    last = []; let ok = true;
    for (const p of pages) { const v = await p.evaluate(fn, arg).catch((e) => "ERR " + e.message.slice(0, 80)); last.push(v); if (!v || (typeof v === "string" && (v.startsWith("ERR") || v.endsWith("|")))) ok = false; }
    if (ok) return last;
    if (process.env.VERBOSE) console.log("..", tag, ((Date.now() - t0) / 1000).toFixed(0), JSON.stringify(last).slice(0, 200));
    await sleep(1500);
  }
  console.log("UNTIL TIMEOUT", tag, JSON.stringify(last).slice(0, 300)); return null;
}
export const endPhase = (p) => p.evaluate(() => { window.__meccha.localEnd = performance.now() + 50; });
export async function createServer(p, name, server = "QA Server", pw = "") {
  await toMenu(p);
  await p.click("text=Create Server");
  await p.fill("input >> nth=0", name);
  await p.fill("input >> nth=1", server);
  if (pw) await p.fill("input >> nth=2", pw);
  await p.evaluate(() => { const bs = [...document.querySelectorAll("button")].filter((x) => x.textContent.trim() === "Create Server"); setTimeout(() => bs[bs.length - 1].click(), 0); });
  await waitWorld(p);
}
export async function joinServer(p, name, server = "QA Server", pw = "") {
  await toMenu(p);
  await p.click("text=Find Server");
  await p.fill("input >> nth=0", name);
  if (pw) await p.fill("input >> nth=2", pw);
  await p.click("text=Search Public Servers");
  for (let i = 0; i < 20; i++) { await sleep(1000); if (await p.evaluate((s) => document.body.innerText.includes(s), server)) break; }
  await p.evaluate((s) => { const bs = [...document.querySelectorAll("button")].filter((x) => x.textContent.trim() === "Join"); const b = bs.find((x) => x.closest("div")?.parentElement?.innerText.includes(s)) || bs[0]; setTimeout(() => b.click(), 0); }, server);
  await waitWorld(p);
}
