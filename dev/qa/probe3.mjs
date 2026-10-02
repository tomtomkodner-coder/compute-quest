import { launch, ctxFor, watch, errs, URL, sleep, toMenu, joinRoom, asyncClick } from "./lib.mjs";
const b = await launch(); const ctx = await ctxFor(b); const t0=Date.now(); const L=(...a)=>console.log(((Date.now()-t0)/1000).toFixed(1),...a);
const p = await ctx.newPage(); watch(p,"A"); await joinRoom(p,"Alice"); L("A joined");
for (let i=0;i<3;i++){ const s=Date.now(); const f=await p.evaluate(()=>new Promise(r=>{let n=0;const s=performance.now();const g=()=>{n++; if(performance.now()-s<2000) requestAnimationFrame(g); else r(n/2)}; g();})); L("A fps",f, Date.now()-s); }
const q = await ctx.newPage(); watch(q,"B"); await toMenu(q); L("B menu");
for (let i=0;i<3;i++){ const s=Date.now(); await q.evaluate(()=>1); L("B eval", Date.now()-s); await sleep(1000); }
await q.click("text=Find Server"); await q.fill("input >> nth=0","Bob"); await q.click("text=Search Public Servers"); await q.waitForSelector("button:has-text('Join')"); L("B results");
await asyncClick(q,"Join"); L("clicked");
for (let i=0;i<30;i++){ await sleep(3000); const r=await Promise.race([q.evaluate(()=>({w:!!window.__meccha?.world, me:!!window.__meccha?.me})), sleep(8000).then(()=>"TIMEOUT")]); L("B", JSON.stringify(r)); if(r.me)break; }
console.log(errs.join("\n")); await b.close();
