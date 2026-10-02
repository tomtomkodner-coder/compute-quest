import { launch, ctxFor, watch, errs, URL, sleep, toMenu, asyncClick } from "./lib.mjs";
const b = await launch(); const ctx = await ctxFor(b); const p = await ctx.newPage(); watch(p,"A");
const t0=Date.now(); const L=(...a)=>console.log(((Date.now()-t0)/1000).toFixed(1),...a);
await toMenu(p); L("menu"); await p.click("text=Find Server"); L("find"); await p.fill("input >> nth=0","Alice"); await p.click("text=Search Public Servers"); L("search");
await sleep(1000); await asyncClick(p,"Join"); L("joinclicked");
for (let i=0;i<15;i++){ await sleep(4000); const r = await p.evaluate(()=>({w:!!window.__meccha?.world, tx:document.body.innerText.slice(0,100).replace(/\s+/g," ")})); L(i, JSON.stringify(r)); if(r.w)break; }
console.log(errs.join("\n")); await b.close();
