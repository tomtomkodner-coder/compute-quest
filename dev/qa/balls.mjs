import { launch, ctxFor, watch, errs, createServer, joinServer, sleep, ev, until, endPhase } from "./lib.mjs";
const map = process.argv[2] || "mansion";
const b = await launch(); const ctx = await ctxFor(b);
const A = await ctx.newPage(); watch(A, "A"); await createServer(A, "Alice");
const B = await ctx.newPage(); watch(B, "B"); await joinServer(B, "Bob");
await until([A, B], () => window.__meccha.players.size === 2, null, 60000, "2");
await ev(A, (m) => window.__meccha.setSettings({ bots: 0, map: m, mode: "double", hideTime: 300 }), map);
await ev(A, () => window.__meccha.startCountdown()); await sleep(1000); await endPhase(A);
await until([A, B], (m) => window.__meccha.rs.ph === "hide" && window.__meccha.worldId === m, map, 300000, "hide");
const balls = (p) => ev(p, () => window.__meccha.pushBalls.slice(0, 400).map((b) => [+b.p.x.toFixed(2), +b.p.z.toFixed(2)]));
const b0 = await balls(A); const bb0 = await balls(B); console.log("balls", b0.length, "same init on B:", JSON.stringify(b0) === JSON.stringify(bb0), JSON.stringify(b0.slice(0, 3)), JSON.stringify(bb0.slice(0, 3)));
console.log("ball0 info", JSON.stringify(await ev(A, () => { const b = window.__meccha.pushBalls[0]; return [b.p.y, b.r, window.__meccha.me.pos.toArray(), window.__meccha.me.ch.root.visible]; })));
if (!b0.length) { console.log("NO BALLS on", map); await b.close(); process.exit(); }
// walk Alice through ball 0 via keyboard-free position stepping
const tgt = b0[0];
await ev(A, (t) => { const e = window.__meccha; e.me.pos.set(t[0] + 2, e.pushBalls[0].p.y - 0.3 > 0 ? e.pushBalls[0].p.y - 0.3 : 0, t[1]); window.__tgt = t; }, tgt);
for (let i = 0; i < 30; i++) { const r = await ev(A, () => { const e = window.__meccha; e.me.pos.x -= 0.1; return [e.me.pos.x.toFixed(2), e.me.pos.y.toFixed(2), e.me.pos.z.toFixed(2), e.pushBalls[0].p.x.toFixed(2)]; }); if (i % 3 == 0) console.log(" step", r.join(",")); await sleep(250); }
await sleep(8000);
const a1 = await balls(A), b1 = await balls(B);
console.log("A ball0", b0[0], "->", a1[0], " B ball0", b1[0]);
const moved = (x, y) => Math.hypot(x[0] - y[0], x[1] - y[1]);
console.log("A moved", moved(b0[0], a1[0]).toFixed(2), "B moved", moved(b0[0], b1[0]).toFixed(2), "A-B diff", moved(a1[0], b1[0]).toFixed(2));
for (let k = 0; k < 4; k++) { console.log("samp", JSON.stringify(await ev(A, () => { const e = window.__meccha; const b = e.pushBalls[0]; return [b.p.x.toFixed(2), b.p.z.toFixed(2), b.v.x.toFixed(2), b.v.z.toFixed(2), e.world.bounds.minX, e.pushBalls.filter(o => o !== b && Math.hypot(o.p.x - b.p.x, o.p.z - b.p.z) < o.r + b.r + 0.05).length, e.fpsDbg]; }))); await sleep(700); }
console.log("A0", JSON.stringify(await ev(A, () => { const b = window.__meccha.pushBalls[0]; return [performance.now() - b.own, b.still, b.v.x, b.v.z]; })), "B0", JSON.stringify(await ev(B, () => { const b = window.__meccha.pushBalls[0]; return [b.v.x, b.v.z, b.own]; })));
console.log(errs.slice(0, 10).join("\n")); await b.close();
