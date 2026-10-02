import { launch, ctxFor, watch, errs, createServer, joinServer, sleep, ev, until, endPhase } from "./lib.mjs";
const b = await launch(); const ctx = await ctxFor(b);
const t0 = Date.now(); const L = (...a) => console.log(((Date.now() - t0) / 1000).toFixed(0) + "s", ...a.map(x => typeof x === "string" ? x : JSON.stringify(x)));
const A = await ctx.newPage(); watch(A, "A"); await createServer(A, "Alice");
const B = await ctx.newPage(); watch(B, "B"); await joinServer(B, "Bob");
await until([A, B], () => window.__meccha.players.size === 2, null, 60000, "2");
await ev(A, () => window.__meccha.setSettings({ bots: 0, map: "school", hideTime: 300, huntTime: 300, checkTime: 300 }));
await ev(A, () => window.__meccha.startCountdown()); await sleep(1000); await endPhase(A);
await until([A, B], () => window.__meccha.rs.ph === "hide", null, 300000, "hide"); await sleep(2000); await endPhase(A);
await until([A, B], () => window.__meccha.rs.ph === "hunt", null, 300000, "hunt"); await sleep(2000); await endPhase(A);
await until([A, B], () => window.__meccha.rs.ph === "check", null, 300000, "check"); L("check");
const st = (p) => ev(p, () => { const e = window.__meccha; return [e.rs.ph, e.rs.t, e.me.vote, [...e.players.values()].map(x => x.name + "=" + x.vote).join(","), e.hud.votes]; });
await sleep(3000);
await ev(B, () => window.__meccha.voteSkip()); await sleep(2000); L(await st(A), await st(B));
await ev(A, () => window.__meccha.voteSkip());
for (let i = 0; i < 8; i++) { await sleep(2000); L(await st(A), await st(B)); }
console.log(errs.slice(0, 10).join("\n")); await b.close();
