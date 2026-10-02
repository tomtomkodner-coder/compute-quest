import { launch, ctxFor, watch, errs, createServer, joinServer, sleep, ev, until, endPhase } from "./lib.mjs";
const b = await launch(); const ctx = await ctxFor(b);
const t0 = Date.now(); const L = (...a) => console.log(((Date.now() - t0) / 1000).toFixed(0) + "s", ...a.map(x => typeof x === "string" ? x : JSON.stringify(x)));
const A = await ctx.newPage(); watch(A, "A"); await createServer(A, "Alice");
const B = await ctx.newPage(); watch(B, "B"); await joinServer(B, "Bob");
const C = await ctx.newPage(); watch(C, "C"); await joinServer(C, "Cara"); L("joined");
await until([A, B, C], () => window.__meccha.players.size === 3, null, 60000, "3");
const dbg = () => { const e = window.__meccha; const peers = e.net.peers().map(p => [p.id.slice(0, 4), p.me, !!p.p.st, p.p.rs?.ph, p.p.rs?.t]); return [e.me.name, e.me.role, e.isHost(), e.hostId?.slice(0, 4), e.rs.ph, e.rs.t, e.worldId, peers]; };
await ev(A, () => window.__meccha.setSettings({ bots: 0, map: "school", hideTime: 300, huntTime: 300, checkTime: 60, hunters: 1 }));
await ev(A, () => window.__meccha.startCountdown()); await sleep(2000); await endPhase(A);
L(await until([A, B, C], () => window.__meccha.rs.ph === "hide", null, 200000, "hide"));
L(await ev(B, dbg), await ev(C, dbg));
await A.close({ runBeforeUnload: true });
L(await until([B, C], () => window.__meccha.players.size === 2, null, 90000, "left"));
L(await ev(B, dbg), await ev(C, dbg));
await endPhase(B);
for (let i = 0; i < 8; i++) { await sleep(8000); L(await ev(B, dbg), await ev(C, dbg)); }
console.log(errs.slice(0, 10).join("\n")); await b.close();
