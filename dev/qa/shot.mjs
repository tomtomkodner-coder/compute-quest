import { launch, ctxFor, sleep, URL } from "./lib.mjs";
const [w, h, out, wait = "4000"] = process.argv.slice(2);
const b = await launch(); const ctx = await ctxFor(b, { viewport: { width: +w, height: +h }, hasTouch: +w < 1000, isMobile: +w < 1000 }, false);
const p = await ctx.newPage(); await p.goto(URL); await p.waitForSelector("text=Create Server"); await sleep(+wait);
console.log(await p.evaluate(() => { const W = innerWidth, H = innerHeight; return [...document.querySelectorAll("button")].filter((e) => { const r = e.getBoundingClientRect(); return r.right > W + 1 || r.bottom > H + 1; }).map((e) => e.textContent.trim() + ":" + JSON.stringify(e.getBoundingClientRect())).join("\n"); }));
await p.screenshot({ path: out, timeout: 240000 }); await b.close();
