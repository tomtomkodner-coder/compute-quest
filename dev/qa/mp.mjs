import { launch, ctxFor, watch, errs, joinRoom, sleep, ev } from "./lib.mjs";
const b = await launch();
const ctx = await ctxFor(b);
const P = {};
for (const n of ["Alice", "Bob", "Cara"]) { const p = await ctx.newPage(); watch(p, n); await joinRoom(p, n); P[n] = p; await sleep(1500); }
const { Alice: A, Bob: B, Cara: C } = P;
const info = (p) => ev(p, () => { const e = window.__meccha; return { host: e.isHost(), ph: e.rs.ph, me: e.me.name, players: [...e.players.values()].map(x => x.name + (x.bot ? "*" : "")), world: e.worldId }; });
for (const p of [A, B, C]) console.log("join", JSON.stringify(await info(p)));
await ev(A, () => window.__meccha.setSettings({ bots: 0, map: "mansion", hideTime: 30, huntTime: 60, checkTime: 20, hunters: 1 }));
// Cara stands on the hunter pad
await ev(C, () => { const e = window.__meccha; const l = e.world.lobby; e.me.pos.set(l.pad.x, e.me.pos.y, l.pad.z); e.me.tpos?.copy?.(e.me.pos); });
await sleep(1200);
await ev(A, () => window.__meccha.startCountdown());
await sleep(1000);
for (const p of [A, B, C]) console.log("cd", JSON.stringify(await ev(p, () => ({ ph: window.__meccha.rs.ph, t: window.__meccha.hud.time, map: window.__meccha.rs.map }))));
await ev(A, () => { window.__meccha.localEnd = performance.now() + 100; });
await sleep(4000);
for (const p of [A, B, C]) console.log("hide", JSON.stringify(await ev(p, () => { const e = window.__meccha; return { ph: e.rs.ph, role: e.me.role, world: e.worldId, roles: Object.values(e.rs.roles).join(",") }; })));
// Alice paints, poses, clones, chats; Bob moves
await ev(A, () => { const e = window.__meccha; e.hud.paintMode = true; e.setBrush({ color: "#2255ff", metal: 0.9, rough: 0.2, emis: 0.5 }); const part = e.me.ch.parts[0]; const pos = part.mesh.geometry.getAttribute("position"); const V = e.me.pos.constructor; for (let i = 0; i < pos.count; i += 20) e.paintAt(part, new V().fromBufferAttribute(pos, i), null); e.hud.paintMode = false; e.setPose("tpose"); e.placeClone(); e.me.pos.x += 1.5; e.sendChat("hello from Alice"); });
await ev(B, () => { const e = window.__meccha; e.me.pos.x += 2; e.setPose("sit"); });
await sleep(3500);
for (const p of [B, C]) console.log("sees Alice", JSON.stringify(await ev(p, () => { const e = window.__meccha; const a = [...e.players.values()].find(x => x.name === "Alice"); const d = a.ch.parts[0].albedo.ctx.getImageData(0, 0, 512, 512).data; let blue = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 2] > 200 && d[i] < 80) blue++; const bob = [...e.players.values()].find(x => x.name === "Bob"); return { blue, pose: a.pose, clones: a.clones.length, chat: e.chat.map(c => c.m).slice(-2), posErr: 0, bobPose: bob?.pose }; })));
const apos = await ev(A, () => window.__meccha.me.pos.toArray());
console.log("A pos", apos.map(x => x.toFixed(2)), "B sees", (await ev(B, () => [...window.__meccha.players.values()].find(x => x.name === "Alice").pos.toArray())).map(x => x.toFixed(2)));
// -> hunt
await ev(A, () => { window.__meccha.localEnd = performance.now() + 100; });
await sleep(3000);
for (const p of [A, B, C]) console.log("hunt", JSON.stringify(await ev(p, () => ({ ph: window.__meccha.rs.ph, role: window.__meccha.me.role, armed: window.__meccha.me.armed }))));
// Cara (hunter) shoots Alice
const shot = await ev(C, () => { const e = window.__meccha; const a = [...e.players.values()].find(x => x.name === "Alice");
  const c = a.ch.meshes[0].getWorldPosition(new a.pos.constructor());
  e.me.pos.set(c.x + 2.5, a.pos.y, c.z); e.me.tpos.copy(e.me.pos);
  const d = c.clone().sub(e.me.pos); e.camYaw = Math.atan2(-d.x, -d.z); e.camPitch = -Math.atan2(c.y - (e.me.pos.y + 1.6), Math.hypot(d.x, d.z)); return e.rs.ph; });
await sleep(500);
await ev(C, () => window.__meccha.fire());
await sleep(3000);
for (const p of [A, B, C]) console.log("after shot", JSON.stringify(await ev(p, () => ({ dead: window.__meccha.rs.dead.length, alive: window.__meccha.me.alive, ph: window.__meccha.rs.ph }))));
// skip vote by all
for (const p of [A, B, C]) await ev(p, () => window.__meccha.voteSkip());
await sleep(3000);
for (const p of [A, B, C]) console.log("after skip", JSON.stringify(await ev(p, () => ({ ph: window.__meccha.rs.ph, win: window.__meccha.rs.win, votes: [...window.__meccha.players.values()].map(x => x.vote) }))));
if ((await ev(A, () => window.__meccha.rs.ph)) === "hunt") { await ev(A, () => { window.__meccha.localEnd = performance.now() + 100; }); await sleep(3000); }
// check: likes
for (const p of [B, C]) await ev(p, () => { const e = window.__meccha; const a = [...e.players.values()].find(x => x.name === "Alice"); e.hud.likeTarget = a.id; e.giveLike?.(); });
await sleep(2500);
for (const p of [A, B, C]) console.log("check", JSON.stringify(await ev(p, () => { const e = window.__meccha; return { ph: e.rs.ph, likes: e.likes, res: e.rs.res?.map(r => r.n + ":" + r.r + ":" + r.found + ":" + r.p), board: e.hud.players?.map(x => x.name + ":" + x.pts + ":" + x.likes) }; })));
// next round, then Alice (host) leaves mid-round
await ev(A, () => { window.__meccha.localEnd = performance.now() + 100; });
await sleep(3000);
for (const p of [A, B, C]) console.log("post-check", JSON.stringify(await ev(p, () => ({ ph: window.__meccha.rs.ph, world: window.__meccha.worldId }))));
await ev(A, () => window.__meccha.startCountdown());
await sleep(800);
await ev(A, () => { window.__meccha.localEnd = performance.now() + 100; });
await sleep(4000);
console.log("round2", JSON.stringify(await ev(B, () => ({ ph: window.__meccha.rs.ph, roles: window.__meccha.rs.roles }))));
await A.close();
await sleep(5000);
for (const p of [B, C]) console.log("after host left", JSON.stringify(await info(p)), JSON.stringify(await ev(p, () => ({ t: window.__meccha.hud.time, ph: window.__meccha.rs.ph, chat: window.__meccha.chat.map(c => c.m).slice(-2) }))));
await ev(B, () => { window.__meccha.localEnd = performance.now() + 100; });
await sleep(3000);
for (const p of [B, C]) console.log("new host advance", JSON.stringify(await ev(p, () => ({ ph: window.__meccha.rs.ph, win: window.__meccha.rs.win }))));
console.log(errs.slice(0, 20).join("\n"));
await b.close();
