import { launch, ctxFor, watch, errs, joinRoom, createServer, joinServer, sleep, ev, until, endPhase } from "./lib.mjs";
const b = await launch(); const ctx = await ctxFor(b);
const t0 = Date.now(); const L = (...a) => console.log(((Date.now() - t0) / 1000).toFixed(0) + "s", ...a.map(x => typeof x === "string" ? x : JSON.stringify(x)));
const P = {};
for (const n of ["Alice", "Bob", "Cara"]) { const p = await ctx.newPage(); watch(p, n); if (n === "Alice") await createServer(p, n); else await joinServer(p, n); P[n] = p; L("joined", n); }
const { Alice: A, Bob: B, Cara: C } = P; const all = [A, B, C];
await until(all, () => window.__meccha.players.size === 3, null, 60000, "3players");
const info = (p) => ev(p, () => { const e = window.__meccha; return [e.me.name, e.isHost(), e.rs.ph, [...e.players.values()].map(x => x.name).join(",")]; });
for (const p of all) L("join", await info(p));
await ev(A, () => window.__meccha.setSettings({ bots: 0, map: "mansion", hideTime: 600, huntTime: 600, checkTime: 600, hunters: 1 }));
await ev(C, () => { const e = window.__meccha; const l = e.world.lobby; e.me.pos.set(l.pad.x, e.me.pos.y, l.pad.z); });
await sleep(1500);
await ev(A, () => window.__meccha.startCountdown());
await until(all, () => window.__meccha.rs.ph === "countdown", null, 30000, "cd");
await endPhase(A);
await until(all, () => { const e = window.__meccha; return e.rs.ph === "hide" && e.worldId === (e.me.role === "hunter" ? "lobby" : "mansion") || e.rs.ph + ":" + e.worldId + ":" + e.me.role + ":" + e.hud.time + "|"; }, null, 300000, "hide+world");
for (const p of all) L("hide", await ev(p, () => { const e = window.__meccha; return [e.me.role, e.rs.map, Object.values(e.rs.roles).join(",")]; }));
// Alice: paint, pose, clone, chat; Bob: move + pose
await ev(A, () => { const e = window.__meccha; e.setBrush({ color: "#2255ff" }); const part = e.me.ch.parts[0]; const pos = part.mesh.geometry.getAttribute("position"); const V = e.me.pos.constructor; e.hud.paintMode = true; for (let i = 0; i < pos.count; i += 10) e.paintAt(part, new V().fromBufferAttribute(pos, i), null); e.hud.paintMode = false; e.setPose("tpose"); e.placeClone(); e.me.pos.x += 1.5; e.sendChat("hello from Alice"); });
await ev(B, () => { const e = window.__meccha; e.me.pos.x += 2; e.setPose("sit"); });
const seeA = () => { const e = window.__meccha; const a = [...e.players.values()].find(x => x.name === "Alice"); const d = a.ch.parts[0].albedo.ctx.getImageData(0, 0, 512, 512).data; let blue = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 2] > 200 && d[i] < 80) blue++; const bob = [...e.players.values()].find(x => x.name === "Bob"); const r = [blue, a.pose, a.clones.length, e.chat.some(c => c.m === "hello from Alice"), bob?.pose, a.pos.toArray().map(v => +v.toFixed(2))]; return blue > 100 && a.pose === "tpose" && a.clones.length === 1 && r[3] && (bob.local || bob.pose === "sit") ? r : JSON.stringify(r) + "|"; };
await sleep(20000); for (const p of [B, C]) L("sync", await ev(p, seeA));
L("A pos", await ev(A, () => window.__meccha.me.pos.toArray().map(v => +v.toFixed(2))));
// hunt
await endPhase(A);
await until(all, () => window.__meccha.rs.ph === "hunt", null, 60000, "hunt");
await until([C], () => window.__meccha.worldId === "mansion", null, 200000, "hunter world");
for (const p of all) L("hunt", await ev(p, () => [window.__meccha.rs.ph, window.__meccha.me.role, window.__meccha.me.armed, window.__meccha.worldId]));
// Cara shoots Alice: stand 2.5m away, aim over several frames, then fire
for (let i = 0; i < 4; i++) {
  await ev(C, () => { const e = window.__meccha; const a = [...e.players.values()].find(x => x.name === "Alice"); const V = a.pos.constructor; const c = new V(); a.ch.meshes[0].getWorldPosition(c);
    e.me.pos.set(a.pos.x + 2.2, a.pos.y, a.pos.z); e.me.tpos?.copy(e.me.pos); e.me.vel?.set?.(0, 0, 0);
    const cam = e.camera.position; const d = c.clone().sub(cam); e.camYaw = Math.atan2(-d.x, -d.z); e.camPitch = -Math.atan2(d.y, Math.hypot(d.x, d.z)); });
  await sleep(1500);
}
await ev(C, () => window.__meccha.fire()); await sleep(1500);
L("shot debug", await ev(C, () => { const e = window.__meccha; const a = [...e.players.values()].find(x => x.name === "Alice"); return [e.camera.position.toArray().map(v => +v.toFixed(2)), a.pos.toArray().map(v => +v.toFixed(2)), e.me.pos.toArray().map(v => +v.toFixed(2)), e.camYaw.toFixed(2), e.camPitch.toFixed(2), a.role, a.alive, e.tps]; }));
L("shot", await until(all, () => window.__meccha.rs.dead.length > 0 || window.__meccha.rs.ph !== "hunt" ? [window.__meccha.rs.dead, window.__meccha.rs.ph, window.__meccha.me.alive] : false, null, 20000, "kill"));
for (const p of all) L("after", await ev(p, () => [window.__meccha.rs.ph, window.__meccha.me.alive, window.__meccha.rs.dead.length]));
if ((await ev(A, () => window.__meccha.rs.ph)) === "hunt") await endPhase(A);
await until(all, () => window.__meccha.rs.ph === "check", null, 60000, "check");
// likes: Bob & Cara like Alice
for (const p of [B, C]) await ev(p, () => { const e = window.__meccha; const a = [...e.players.values()].find(x => x.name === "Alice"); e.likeTarget = { id: a.id, name: a.name }; e.giveLike(); });
L("likes", await until(all, () => { const e = window.__meccha; const a = [...e.players.values()].find(x => x.name === "Alice"); return (a.local ? e.likes : a.likes) >= 2 ? e.hud.players?.map(x => x.name + ":" + x.pts + ":" + x.likes) : false; }, null, 20000, "likes"));
// skip votes in check
for (const p of all) await ev(p, () => window.__meccha.voteSkip());
L("skip", await until(all, () => window.__meccha.rs.ph === "lobby" ? window.__meccha.rs.win : false, null, 30000, "skip->lobby"));
// round 2: host leaves mid hide
await ev(A, () => window.__meccha.startCountdown());
await until(all, () => window.__meccha.rs.ph === "countdown", null, 30000); await endPhase(A);
await until(all, () => window.__meccha.rs.ph === "hide", null, 200000, "hide2");
await A.close({ runBeforeUnload: true });
L("host left", await until([B, C], () => { const e = window.__meccha; return e.players.size === 2 ? [e.me.name, e.isHost(), e.rs.ph, e.hud.time] : false; }, null, 30000, "leave"));
await sleep(3000);
L("timer", await ev(B, () => [window.__meccha.rs.ph, window.__meccha.hud.time]), await ev(C, () => [window.__meccha.rs.ph, window.__meccha.hud.time]));
await endPhase(B);
L("new host advance", await until([B, C], () => window.__meccha.rs.ph !== "hide" ? [window.__meccha.rs.ph, window.__meccha.rs.win] : false, null, 30000, "adv"));
console.log(errs.slice(0, 20).join("\n")); await b.close();
