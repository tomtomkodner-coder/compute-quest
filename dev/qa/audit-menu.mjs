import { launch, ctxFor, watch, errs, toMenu, sleep, URL } from "./lib.mjs";
const b = await launch(); const ctx = await ctxFor(b, { viewport: { width: 1280, height: 720 } });
const p = await ctx.newPage(); watch(p, "M");
const bad = []; const ok = (c, m) => { if (!c) { bad.push(m); console.log("FAIL", m); } };
const txt = () => p.evaluate(() => document.body.innerText);
const btn = (t) => p.evaluate((t) => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === t); if (!b) return false; b.click(); return true; }, t);
await toMenu(p);
ok(await p.evaluate(() => localStorage.getItem("meccha_lang2")) === null, "first visit lang set?");
// languages
const langs = ["日本語", "English", "簡体中文", "繁體中文", "Português (Brasil)", "Español", "Français", "한국어", "عربي", "Italiano", "Deutsch", "Россия", "עברית"];
const seenCreate = new Set();
for (const l of process.env.QUICK ? [] : langs) {
  ok(await btn(l), "lang button " + l);
  await sleep(300);
  const first = await p.evaluate(() => [...document.querySelectorAll("button")].map((b) => b.textContent.trim()).slice(0, 4).join("/"));
  const code = await p.evaluate(() => localStorage.getItem("meccha_lang2"));
  console.log("lang", l, code, first);
  seenCreate.add(first);
}
if (!process.env.QUICK) ok(seenCreate.size >= 12, "languages change menu text: " + seenCreate.size);
await btn("English"); await sleep(300);
// MAPS / Credits
await p.click("text=MAPS"); await sleep(500); const mapsTxt = await txt(); ok(/Mansion|School|Osaka/i.test(mapsTxt), "MAPS screen shows maps");
await p.keyboard.press("Escape"); await sleep(400); ok((await txt()).includes("Create Server"), "MAPS Esc back");
await p.click("text=MAPS"); await sleep(300); await btn("EscBack"); await sleep(300); ok((await txt()).includes("Create Server"), "MAPS Back button");
await p.click("text=Credits"); await sleep(400); console.log("credits:", (await txt()).slice(0, 120).replace(/\s+/g, " "));
await btn("EscBack"); await sleep(300); ok((await txt()).includes("Create Server"), "Credits back");
// Create server screen
await btn("Create Server"); await sleep(400);
const chipBg = (n) => p.evaluate((n) => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === n); return b && getComputedStyle(b).backgroundColor; }, n);
const before = await chipBg("Europe"); await btn("Europe"); await sleep(200); ok(before !== await chipBg("Europe"), "region chip toggles");
const tb = await chipBg("Japan"); await btn("Japan"); await sleep(200); ok(tb !== await chipBg("Japan"), "tag chip toggles");
await btn("Japan"); await sleep(200); ok(tb === await chipBg("Japan"), "tag chip untoggles");
ok(await btn("Refresh Mod Download Status"), "refresh mods is a button");
console.log("create results:", (await txt()).split("Your Server")[1]?.slice(0, 120).replace(/\s+/g, " "));
await p.keyboard.press("Escape"); await sleep(300); ok((await txt()).includes("Find Server"), "create Esc back");
// Find server
await btn("Find Server"); await sleep(400);
await btn("Search Server"); await sleep(1500); console.log("find after Search Server (empty):", (await txt()).split("Search Results")[1]?.slice(0, 150).replace(/\s+/g, " "));
await p.fill("input >> nth=1", "zzznope"); await btn("Search Server"); await sleep(1500); console.log("find nope:", (await txt()).split("Search Results")[1]?.slice(0, 150).replace(/\s+/g, " "));
await btn("Search Public Servers"); await sleep(1500); console.log("public:", (await txt()).split("Search Results")[1]?.slice(0, 150).replace(/\s+/g, " "));
await btn("EscBack"); await sleep(300);
// Settings
await btn("Settings"); await sleep(400);
const tabs = ["User Management", "Friends List", "Sound", "Graphics", "General Game Settings", "FAQ"];
for (const t of tabs) { ok(await btn(t), "tab " + t); await sleep(200); const x = await txt(); console.log("tab", t, x.split(t).pop().slice(0, 90).replace(/\s+/g, " ")); }
const tabColor = () => p.evaluate(() => [...document.querySelectorAll("button")].find((b) => getComputedStyle(b).color === "rgb(93, 255, 93)")?.textContent);
await btn("Graphics"); await sleep(200); await p.keyboard.press("KeyE"); await sleep(200); ok(await tabColor() === "General Game Settings", "E next tab " + await tabColor());
await p.keyboard.press("KeyQ"); await p.keyboard.press("KeyQ"); await sleep(200); ok(await tabColor() === "Sound", "Q prev tab " + await tabColor());
// graphics arrows: click every › once, check localStorage changes
await btn("Graphics"); await sleep(200);
const g0 = await p.evaluate(() => localStorage.getItem("meccha_gfx"));
const nArrows = await p.evaluate(() => [...document.querySelectorAll("button")].filter((b) => b.textContent.trim() === "›").length);
console.log("graphics › arrows", nArrows);
for (let i = 0; i < nArrows; i++) {
  const r = await p.evaluate((i) => { const bs = [...document.querySelectorAll("button")].filter((b) => b.textContent.trim() === "›"); const row = bs[i].parentElement.parentElement; const before = row.innerText; bs[i].click(); return [before.replace(/\s+/g, " ").slice(0, 60)]; }, i);
  await sleep(150);
  const after = await p.evaluate((i) => { const bs = [...document.querySelectorAll("button")].filter((b) => b.textContent.trim() === "›"); return bs[i].parentElement.parentElement.innerText.replace(/\s+/g, " ").slice(0, 60); }, i);
  ok(r[0] !== after, "graphics choice changes: " + r[0]); console.log("  ", r[0], "=>", after);
}
const g1 = await p.evaluate(() => localStorage.getItem("meccha_gfx")); console.log("gfx", g0, "=>", g1);
// sliders: set via native setter
async function slide(idx, v) { return p.evaluate(([i, v]) => { const el = document.querySelectorAll("input[type=range]")[i]; const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, String(v)); el.dispatchEvent(new Event("input", { bubbles: true })); return document.querySelectorAll("input[type=range]").length; }, [idx, v]); }
console.log("graphics sliders", await slide(0, 40), await slide(1, 90)); await sleep(200);
console.log("gfx after sliders", await p.evaluate(() => localStorage.getItem("meccha_gfx")));
await btn("Sound"); await sleep(200); await slide(0, 0.5); await slide(1, 0.3); await slide(2, 0.7); await sleep(200);
const mb = await p.evaluate(() => localStorage.getItem("meccha_mute"));
await p.evaluate(() => { const bs = [...document.querySelectorAll("button")].filter((b) => b.textContent.trim() === "›"); bs[bs.length - 1].click(); }); await sleep(200);
console.log("sound ls", await p.evaluate(() => ["meccha_vol", "meccha_bgm", "meccha_se", "meccha_mute"].map((k) => localStorage.getItem(k))), "mute before", mb);
await btn("General Game Settings"); await sleep(200); await slide(0, 2); await slide(1, 95); await sleep(200);
console.log("general ls", await p.evaluate(() => [localStorage.getItem("meccha_sens"), JSON.parse(localStorage.getItem("meccha_gfx")).fov]));
// language via settings arrow
await p.evaluate(() => { const bs = [...document.querySelectorAll("button")].filter((b) => b.textContent.trim() === "›"); bs[bs.length - 1].click(); }); await sleep(300);
console.log("lang after settings ›", await p.evaluate(() => localStorage.getItem("meccha_lang2")), (await txt()).slice(0, 80).replace(/\s+/g, " "));
await p.evaluate(() => { const bs = [...document.querySelectorAll("button")].filter((b) => b.textContent.trim() === "‹"); bs[bs.length - 1].click(); }); await sleep(300);
// reload: persisted?
await p.reload(); await p.waitForSelector("text=Create Server"); await btn("Settings"); await sleep(400);
await btn("Sound"); await sleep(200);
console.log("after reload sound:", (await txt()).split("Sound").pop().slice(0, 160).replace(/\s+/g, " "));
await btn("General Game Settings"); await sleep(200);
console.log("after reload general:", (await txt()).split("General Game Settings").pop().slice(0, 160).replace(/\s+/g, " "));
await btn("Graphics"); await sleep(200);
console.log("after reload graphics:", (await txt()).split("FAQ").pop().slice(0, 400).replace(/\s+/g, " "));
await p.keyboard.press("Escape"); await sleep(300); ok((await txt()).includes("Find Server"), "settings Esc back");
console.log("BAD", bad.length, bad.join(" ; "));
console.log(errs.slice(0, 10).join("\n")); await b.close();
