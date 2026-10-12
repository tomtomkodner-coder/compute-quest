import { launch, ctxFor, watch, errs, offline, sleep, ev, until, endPhase, URL } from "./lib.mjs";
const b = await launch();
const bad = []; const ok = (c, m) => { console.log(c ? "ok  " : "FAIL", m); if (!c) bad.push(m); };
const overflow = (p) => p.evaluate(() => { const W = innerWidth, H = innerHeight; return [...document.querySelectorAll("button,input")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > W + 1 || r.bottom > H + 1 || r.left < -1 || r.top < -1); }).map((e) => (e.textContent || e.placeholder || "").trim().slice(0, 20)); });
const hscroll = (p) => p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
// portrait
{ const ctx = await ctxFor(b, { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }, false); const p = await ctx.newPage(); watch(p, "PP");
  await p.goto(URL); await sleep(4000); const t = await p.evaluate(() => document.body.innerText); ok(/Rotate/i.test(t), "portrait rotate hint"); await p.screenshot({ path: "ph-portrait.png", timeout: 240000 }); await ctx.close(); }
const ctx = await ctxFor(b, { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true }, false);
const p = await ctx.newPage(); watch(p, "PH");
await p.goto(URL); await p.waitForSelector("text=Create Server");
ok((await overflow(p)).length === 0, "menu fits " + await overflow(p));
for (const [open, name] of [["Create Server", "create"], ["Find Server", "find"], ["Settings", "settings"]]) {
  await p.evaluate((o) => [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === o).click(), open); await sleep(600);
  const o = await overflow(p); ok(o.length === 0 && !(await hscroll(p)), name + " fits " + o.join("|"));
  await p.screenshot({ path: `ph-${name}.png`, timeout: 240000 });
  if (name === "settings") for (const tb of ["Sound", "General Game Settings", "FAQ"]) { await p.evaluate((o) => [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === o).click(), tb); await sleep(300); const o2 = await overflow(p); ok(o2.length === 0, "settings " + tb + " fits " + o2.join("|")); }
  await p.keyboard.press("Escape"); await sleep(500);
}
await offline(p, "Phone"); await sleep(3000);
const tapB = (t) => p.evaluate((t) => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === t); if (!b) return false; const r = b.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, t);
const tap = async (t) => { const c = await tapB(t); if (!c) return false; await p.touchscreen.tap(c[0], c[1]); await sleep(700); return true; };
ok((await overflow(p)).length === 0, "lobby HUD fits " + await overflow(p));
ok(await tap("Settings"), "touch Settings (Configure Map)"); ok(await p.evaluate(() => document.body.innerText.includes("Start Game")), "config open"); 
const o = await overflow(p); ok(o.length === 0, "config fits " + o.slice(0, 5).join("|")); await p.screenshot({ path: "ph-config.png", timeout: 240000 });
await ev(p, () => window.__meccha.setSettings({ map: "mansion", hideTime: 300, huntTime: 300, checkTime: 30, bots: 3 }));
await p.touchscreen.tap(5, 200); await sleep(500);
ok(await tap("Character"), "touch Character"); await tap("OK");
// joystick
const pos0 = await ev(p, () => window.__meccha.me.pos.toArray());
await p.evaluate(() => { const el = [...document.querySelectorAll("div")].find((d) => d.onpointerdown !== undefined && d.className.includes("rounded-full") && d.getBoundingClientRect().left < 200 && d.getBoundingClientRect().top > 150); window.__joy = !!el; if (!el) return; const r = el.getBoundingClientRect(); const cx = r.x + r.width / 2, cy = r.y + r.height / 2; const o = { pointerId: 7, bubbles: true, pointerType: "touch", isPrimary: true }; el.dispatchEvent(new PointerEvent("pointerdown", { ...o, clientX: cx, clientY: cy })); el.dispatchEvent(new PointerEvent("pointermove", { ...o, clientX: cx, clientY: cy - 60 })); setTimeout(() => el.dispatchEvent(new PointerEvent("pointerup", { ...o, clientX: cx, clientY: cy - 60 })), 2500); });
await sleep(3500); const pos1 = await ev(p, () => window.__meccha.me.pos.toArray());
ok(Math.hypot(pos1[0] - pos0[0], pos1[2] - pos0[2]) > 0.5, "joystick moves " + JSON.stringify([pos0, pos1].map((a) => a.map((v) => +v.toFixed(1)))) + " joy=" + await p.evaluate(() => window.__joy));
// play rounds until hider
for (let round = 0; round < 4; round++) {
  await ev(p, () => { const e = window.__meccha; e.me.pos.set(4, 0, 4); e.me.tpos.copy(e.me.pos); e.startCountdown(); }); await sleep(1000); await endPhase(p);
  await until([p], () => window.__meccha.rs.ph === "hide" && (window.__meccha.me.role === "hunter" || window.__meccha.worldId === "mansion"), null, 300000, "hide");
  const role = await ev(p, () => window.__meccha.me.role); console.log("role", role);
  if (role === "hider") {
    await p.screenshot({ path: "ph-hide.png", timeout: 240000 });
    ok((await overflow(p)).length === 0, "hide HUD fits " + await overflow(p));
    ok(await tap("Paint"), "tap Paint"); ok(await ev(p, () => window.__meccha.hud.paintMode), "paint mode on");
    await p.screenshot({ path: "ph-paint.png", timeout: 240000 }); ok((await overflow(p)).length === 0, "paint panel fits " + (await overflow(p)).slice(0, 5));
    ok(await tap("Done"), "tap Done"); ok(!(await ev(p, () => window.__meccha.hud.paintMode)), "paint off");
    ok(await tap("Pose"), "tap Pose"); await sleep(500); const pb = await p.evaluate(() => [...document.querySelectorAll(".z-30 button")].length); ok(pb > 5, "pose wheel " + pb);
    const c = await p.evaluate(() => { const r = [...document.querySelectorAll(".z-30 button")][3].getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }); await p.touchscreen.tap(c[0], c[1]); await sleep(700);
    ok(await ev(p, () => window.__meccha.me.pose) !== "stand", "pose picked " + await ev(p, () => window.__meccha.me.pose));
    ok(await tap("Clone"), "tap Clone"); await sleep(500); ok(await ev(p, () => window.__meccha.me.clones.length) === 1, "clone placed");
    await tap("Run"); ok(await ev(p, () => window.__meccha.keys.has("ShiftLeft")), "Run toggles shift"); await tap("Run");
    const jc = await tapB("Jump"); await p.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y); el.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 9, bubbles: true, pointerType: "touch" })); }, jc); await sleep(400);
    ok(await ev(p, () => window.__meccha.keys.has("Space")), "Jump hold = Space held"); await p.evaluate(([x, y]) => document.elementFromPoint(x, y).dispatchEvent(new PointerEvent("pointerup", { pointerId: 9, bubbles: true, pointerType: "touch" })), jc); await sleep(300);
    ok(!(await ev(p, () => window.__meccha.keys.has("Space"))), "Jump release");
    ok(await tap("Chat"), "tap Chat"); ok(await p.evaluate(() => !!document.querySelector("input")), "chat input"); await p.keyboard.type("hi"); await p.keyboard.press("Enter"); await sleep(500);
    ok(await ev(p, () => window.__meccha.chat.some((c) => c.m === "hi")), "chat sent");
    await endPhase(p); await until([p], () => window.__meccha.rs.ph === "hunt", null, 60000); await endPhase(p);
    await until([p], () => window.__meccha.rs.ph === "check", null, 60000); await sleep(2000); ok(await tap("Skip"), "tap Skip in check"); await p.screenshot({ path: "ph-check.png", timeout: 240000 }); break;
  } else {
    await endPhase(p); await until([p], () => window.__meccha.rs.ph === "hunt" && window.__meccha.worldId === "mansion", null, 300000, "hunt"); await sleep(1500);
    ok(await tap("FIRE"), "tap FIRE"); await sleep(500); ok(await ev(p, () => window.__meccha.lastShot > 0), "fired");
    await p.screenshot({ path: "ph-hunt.png", timeout: 240000 }); ok((await overflow(p)).length === 0, "hunt HUD fits " + await overflow(p));
    await endPhase(p); await until([p], () => window.__meccha.rs.ph === "check", null, 60000); await endPhase(p); await until([p], () => window.__meccha.rs.ph === "lobby", null, 60000);
  }
}
console.log("BAD", bad.length, bad.join(" ; ")); console.log(errs.slice(0, 10).join("\n")); await b.close();
