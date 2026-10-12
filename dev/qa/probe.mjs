import { launch, ctxFor, watch, errs, URL, sleep, toMenu, joinRoom, asyncClick } from "./lib.mjs";
const b = await launch(); const ctx = await ctxFor(b); const p = await ctx.newPage(); watch(p,"A");
await joinRoom(p,"Alice"); console.log("A joined"); await sleep(3000);
const q = await ctx.newPage(); watch(q,"B");
await toMenu(q); await q.click("text=Find Server"); await q.fill("input >> nth=0","Bob"); await q.click("text=Search Public Servers"); await sleep(1500);
console.log(await q.evaluate(()=>document.body.innerText.split("Search Results")[1]?.slice(0,300).replace(/\s+/g," ")));
await asyncClick(q,"Join");
for (let i=0;i<15;i++){ await sleep(4000); const r = await q.evaluate(()=>({w:!!window.__meccha?.world, tx:document.body.innerText.slice(0,150).replace(/\s+/g," ")})); console.log(i, JSON.stringify(r)); if(r.w)break; }
console.log(errs.join("\n")); await b.close();
