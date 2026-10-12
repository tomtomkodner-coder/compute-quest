import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { writeFileSync } from "fs";
const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage();
p.on("pageerror", (e) => console.log("ERR", e.message));
await p.goto("http://127.0.0.1:5181/.preview-tmp/app.html");
await p.waitForTimeout(3000);
const res = await p.evaluate(async () => {
  const m = await import("/src/game/meccha/maps/index.ts");
  const out = {};
  for (const id of ["lobby", ...m.MAPS.map((x) => x.id)]) {
    try {
      const w = m.buildMap(id);
      const set = new Set();
      const bd = w.bounds;
      for (let x = bd.minX - 1; x <= bd.maxX + 1; x += 0.5) for (let z = bd.minZ - 1; z <= bd.maxZ + 1; z += 0.5) set.add(w.roomAt(x, z));
      out[id] = { name: w.name, rooms: [...set] };
      w.dispose();
    } catch (e) { out[id] = { err: String(e) }; }
  }
  return out;
});
writeFileSync("rooms.json", JSON.stringify(res, null, 1));
const all = new Set(); for (const v of Object.values(res)) (v.rooms || []).forEach((r) => all.add(r)), v.name && all.add(v.name);
writeFileSync("roomkeys.json", JSON.stringify([...all].sort()));
console.log(all.size);
await b.close();
