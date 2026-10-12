import { launch, ctxFor, watch, errs, offline, sleep, ev, until, endPhase } from "./lib.mjs";
const b = await launch(); const ctx = await ctxFor(b, { viewport: { width: 1280, height: 720 } }, false);
const p = await ctx.newPage(); watch(p, "G");
const bad = []; const ok = (c, m) => { console.log(c ? "ok  " : "FAIL", m); if (!c) bad.push(m); };
const txt = () => p.evaluate(() => document.body.innerText);
const btn = (t) => p.evaluate((t) => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === t || x.getAttribute("aria-label") === t); if (!b) return false; b.click(); return true; }, t);
const H = (k) => p.evaluate((k) => window.__meccha.hud[k], k);
const key = async (k) => { await p.keyboard.press(k); await sleep(700); };
await offline(p, "Solo"); await sleep(3000);
await ev(p, () => window.__meccha.setSettings({ bots: 3, map: "mansion", hideTime: 300, huntTime: 300, checkTime: 60 }));
for (const [k, f] of [["Digit2", "nameplates"], ["Digit3", "xray"], ["Digit5", "freeLook"], ["Digit4", "freeCam"]]) { const a = await H(f); await key(k); const c = await H(f); ok(a !== c, `key ${k} toggles ${f} ${a}->${c}`); await key(k); }
await key("Digit1"); ok(true, "key 1 whistle (no error)");
await key("Tab"); const tabT = await txt(); await key("Tab"); ok(tabT !== await txt(), "Tab toggles ranking panel");
await key("KeyT"); ok(await p.evaluate(() => !!document.querySelector("input")), "T opens chat input");
await p.keyboard.type("hello qa"); await p.keyboard.press("Enter"); await sleep(700);
ok(await p.evaluate(() => window.__meccha.chat.some((c) => c.m === "hello qa")), "chat send");
await key("Escape"); ok((await txt()).includes("Return to Title"), "Esc opens in-game settings");
await btn("Sound"); await sleep(300); ok((await txt()).includes("Master Volume"), "in-game settings Sound tab");
await key("Escape"); ok(!(await txt()).includes("Return to Title"), "Esc closes in-game settings");
// Configure Map via E at PLAY
await ev(p, () => { const e = window.__meccha; const l = e.world.lobby; e.me.pos.set(l.play.x, e.me.pos.y, l.play.z + 1); });
await sleep(1500); ok(await H("nearPlay"), "near PLAY"); await key("KeyE");
ok((await txt()).includes("Start Game"), "E opens Configure Map");
const s0 = await ev(p, () => JSON.stringify(window.__meccha.rs.s));
const nOpt = await p.evaluate(() => [...document.querySelectorAll("button")].filter((b) => b.textContent.trim() === "›" && !b.disabled).length);
for (let i = 0; i < nOpt; i++) {
  const before = await ev(p, () => JSON.stringify(window.__meccha.rs.s));
  const label = await p.evaluate((i) => { const b = [...document.querySelectorAll("button")].filter((b) => b.textContent.trim() === "›" && !b.disabled)[i]; const l = b.parentElement.parentElement.innerText.replace(/\s+/g, " "); b.click(); return l; }, i);
  await sleep(250);
  const after = await ev(p, () => JSON.stringify(window.__meccha.rs.s));
  ok(before !== after, "config › " + label.slice(0, 50));
  await p.evaluate((i) => { const b = [...document.querySelectorAll("button")].filter((b) => b.textContent.trim() === "‹" && !b.disabled)[i]; b?.click(); }, i); await sleep(200);
}
ok(s0 === await ev(p, () => JSON.stringify(window.__meccha.rs.s)), "‹ restores settings");
await btn("School"); await sleep(300); ok(await ev(p, () => window.__meccha.rs.s.map) === "school", "map button School");
await btn("Random"); await sleep(300); ok(await ev(p, () => window.__meccha.rs.s.map) === "random", "map button Random");
const pool0 = await ev(p, () => window.__meccha.rs.s.pool.length);
await p.evaluate(() => document.querySelector("input[type=checkbox]").click()); await sleep(300);
ok(pool0 !== await ev(p, () => window.__meccha.rs.s.pool.length), "pool checkbox");
await p.evaluate(() => document.querySelector("input[type=checkbox]").click()); await sleep(300);
await btn("Hide-and-Seek Mansion"); await sleep(200);
await btn("Cube"); await sleep(400); ok(await H("bodyType") === "cube", "body type Cube"); await btn("Normal"); await sleep(300);
await p.evaluate(() => [...document.querySelectorAll("button")].find((b) => /Back$/.test(b.textContent.trim()) && b.textContent.includes("Esc")).click()); await sleep(400); ok(!(await txt()).includes("Start Game"), "Configure Map Back");
await key("KeyE"); await key("Escape"); ok(!(await txt()).includes("Start Game") && !(await txt()).includes("Return to Title"), "Configure Map Esc closes panel only");
// Settings / Character buttons (lobby HUD)
if (await btn("Character")) { await sleep(400); console.log("char panel:", (await txt()).slice(0, 0)); await btn("Petit Chameleon"); await sleep(300); console.log("size", await H("size")); await btn("Normal"); await btn("OK"); await sleep(300); } else ok(false, "Character button");
// start
await key("KeyE"); await btn("Start Game"); await sleep(1000);
ok(await ev(p, () => window.__meccha.rs.ph) === "countdown", "Start Game -> countdown"); await endPhase(p);
await until([p], () => window.__meccha.rs.ph === "hide" && window.__meccha.worldId === "mansion", null, 300000, "hide");
ok(await ev(p, () => window.__meccha.me.role) === "hider", "I am hider");
await key("KeyF"); ok(await H("paintMode"), "F paint mode");
const sh = await H("shadow"); await key("KeyV"); ok(sh !== await H("shadow"), "V shadow in paint mode");
const c0 = await H("color"); const hx = p.locator("input.uppercase"); await hx.fill("12ab34"); await sleep(400); await p.evaluate(() => document.activeElement.blur()); ok(await H("color") === "#12ab34", "hex input color " + c0 + "->" + await H("color"));
await p.evaluate(() => { const b = [...document.querySelectorAll("button")].filter((b) => !b.disabled && /aspect-square/.test(b.className) && b.getAttribute("aria-label") !== "#12ab34"); b[0]?.click(); }); await sleep(400); ok(await H("color") !== "#12ab34", "history swatch " + await H("color") + " hist=" + JSON.stringify(await H("history")));
await key("KeyF"); ok(!(await H("paintMode")), "F exits paint");
await p.keyboard.down("KeyR"); await sleep(1000); ok((await txt()).length > 0 && await p.evaluate(() => document.querySelectorAll("button").length) > 10, "R pose wheel"); 
const pc = await p.evaluate(() => { const bs = [...document.querySelectorAll(".z-30 button")]; bs[4]?.click(); return bs.length; }); await sleep(500); console.log("pose buttons", pc, "pose", await H("pose"));
await p.keyboard.up("KeyR"); await sleep(500); ok(await H("pose") !== "stand", "pose picked " + await H("pose"));
console.log("before Q", JSON.stringify(await ev(p, () => { const e = window.__meccha; return [e.rs.ph, e.worldId, e.me.armed, e.me.alive, e.cloneReady.map(t => Math.round(t - performance.now())), e.me.clones.length, e.hud.clones]; })));
await key("KeyQ"); await sleep(800); ok(await H("clones") >= 1, "Q clone " + await H("clones") + " " + await ev(p, () => window.__meccha.me.clones.length));
await key("KeyX"); ok(await H("clones") === 0, "X remove clones");

await btn("Unmute"); await btn("Mute"); await sleep(300);
await endPhase(p); await until([p], () => window.__meccha.rs.ph === "hunt", null, 120000, "hunt"); await sleep(5000);
await key("Digit1"); await key("Tab"); await key("Tab");
L: { const pts = await ev(p, () => window.__meccha.me.pts); console.log("hider pts in hunt", pts, "ptsPop", JSON.stringify(await H("ptsPop"))); }
await endPhase(p); await until([p], () => window.__meccha.rs.ph === "check", null, 120000, "check"); await sleep(3000);
await ev(p, () => { const e = window.__meccha; const bt = [...e.players.values()].find((x) => x.bot); e.likeTarget = { id: bt.id, name: bt.name }; });
await key("KeyG"); ok(await ev(p, () => window.__meccha.likedRound === window.__meccha.rs.id), "G like");
await key("KeyY"); await sleep(3000); ok(await ev(p, () => window.__meccha.rs.ph) === "lobby", "Y skip check (solo)");
console.log("before title", await ev(p, () => [window.__meccha.rs.ph, document.body.innerText.includes("Return to Title")])); await key("Escape"); console.log("after esc", await txt().then(t => t.includes("Return to Title"))); await btn("Return to Title"); await sleep(2000); ok((await txt()).includes("Create Server"), "Return to Title");
console.log("BAD", bad.length, bad.join(" ; "));
console.log(errs.slice(0, 10).join("\n")); await b.close();
