import { launch, ctxFor, watch, errs, offline, sleep, ev, until, endPhase } from "./lib.mjs";
const b = await launch(); const ctx = await ctxFor(b, {}, false); const p = await ctx.newPage(); watch(p, "R");
await offline(p); await sleep(2000);
await ev(p, () => window.__meccha.setSettings({ map: "school", hideTime: 300, checkTime: 30 }));
for (let i = 0; i < 6; i++) {
  const pre = await ev(p, () => { const e = window.__meccha; const l = e.world.lobby; return [e.me.pos.toArray().map(v => +v.toFixed(1)), e.me.tpos.toArray().map(v => +v.toFixed(1)), e.hud.onPad, l.pad]; });
  await ev(p, () => window.__meccha.startCountdown()); await sleep(800); await endPhase(p);
  await until([p], () => window.__meccha.rs.ph === "hide", null, 60000);
  console.log(i, JSON.stringify(pre), JSON.stringify(await ev(p, () => window.__meccha.rs.roles)), await ev(p, () => window.__meccha.me.id));
  await endPhase(p); await until([p], () => window.__meccha.rs.ph !== "hide", null, 60000); await endPhase(p); await until([p], () => window.__meccha.rs.ph === "check", null, 60000); await endPhase(p);
  await until([p], () => window.__meccha.rs.ph === "lobby" && window.__meccha.worldId === "lobby", null, 200000); await sleep(1000);
}
console.log(errs.slice(0, 5).join("\n")); await b.close();
