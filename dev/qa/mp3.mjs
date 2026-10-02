import { launch, ctxFor, watch, errs, joinRoom, sleep, ev, until, endPhase } from "./lib.mjs";
const b = await launch(); const ctx = await ctxFor(b);
const t0 = Date.now(); const L = (...a) => console.log(((Date.now() - t0) / 1000).toFixed(0) + "s", ...a.map(x => typeof x === "string" ? x : JSON.stringify(x)));
const A = await ctx.newPage(); watch(A, "A"); await joinRoom(A, "Alice"); L("A");
const B = await ctx.newPage(); watch(B, "B"); await joinRoom(B, "Bob"); L("B");
const st = (p) => ev(p, () => { const e = window.__meccha; return [e.rs.ph, e.rs.map, e.rs.t, e.hud?.time, e.worldId, JSON.stringify(e.rs.roles)]; });
await ev(A, () => window.__meccha.setSettings({ bots: 0, map: "mansion", hideTime: 60, huntTime: 90, checkTime: 30, hunters: 1 }));
await sleep(1000); L(await st(A));
await ev(A, () => window.__meccha.startCountdown());
for (let i = 0; i < 12; i++) { await sleep(4000); L(await st(A), await st(B)); if (i === 1) await endPhase(A); }
console.log(errs.slice(0, 20).join("\n")); await b.close();
