// שימוש: node shot.mjs <mapId> [--views=pos:x,y,z,yaw,pitch;...] [--w=1100 --h=620]
// מצלם: preview (אם הוגדר), מבט־על חתוך (בלי תקרה), 6 מבטים בגובה העיניים, ומדפיס נתוני ביצועים ונגישות.
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import fs from "fs";
import path from "path";
const map = process.argv[2];
if (!map) { console.log("usage: node shot.mjs <mapId> [--views=x,y,z,yaw,pitch;...]"); process.exit(1); }
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split("=").slice(1).join("=");
const W = +arg("w", 1100), H = +arg("h", 620);
const out = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "shots", map);
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: W, height: H } });
const errs = [];
p.on("pageerror", (e) => errs.push("PAGEERR " + e.message));
p.on("console", (m) => (m.type() === "error" || m.type() === "warning") && !/CERT|GPU stall|WebGL/.test(m.text()) && errs.push(m.text()));
await p.goto("http://127.0.0.1:5180/.preview-tmp/harness.html");
await p.waitForFunction(() => window.__meccha, null, { timeout: 90000 });
const info = await p.evaluate((map) => {
  const e = window.__meccha;
  e.hostUpdate = () => {};
  e.onRS = () => {};
  e.rs.map = map;
  const t0 = performance.now();
  e.loadWorld(map);
  const buildMs = Math.round(performance.now() - t0);
  e.rs.ph = "hunt"; // כדי שהמצלמה החופשית תעבוד
  e.freeCam = true;
  e.nameplates = false;
  for (const pl of e.players.values()) pl.ch.root.visible = false;
  let tris = 0, meshes = 0;
  e.world.group.traverse((o) => { if (o.isMesh) { meshes++; const g = o.geometry; const n = g.index ? g.index.count / 3 : g.attributes.position.count / 3; tris += n * (o.isInstancedMesh ? o.count : 1); } });
  const w = e.world, nav = e.nav;
  const hs = w.hunterSpawns[0];
  let free = 0, reach = 0;
  for (let x = w.bounds.minX + 1; x < w.bounds.maxX; x += 2) for (let z = w.bounds.minZ + 1; z < w.bounds.maxZ; z += 2) { if (!nav.free(x, z)) continue; free++; if (nav.find(hs.x, hs.z, x, z)) reach++; }
  const hideOk = w.hiderSpawns.filter((s) => nav.free(s.x, s.z)).length;
  return { name: w.name, buildMs, meshes, tris: Math.round(tris), obstacles: w.obstacles.length, surfaces: w.surfaces.length, bounds: w.bounds, free, reach, hunterSpawn: [hs.x, hs.z], hiderSpawnsFree: `${hideOk}/${w.hiderSpawns.length}`, rooms: w.rooms?.length, preview: w.preview ?? null, hdri: w.lighting.hdri ?? null };
}, map);
console.log(JSON.stringify(info));
await p.waitForTimeout(2500); // HDR נטען
const setCam = (x, y, z, yaw, pitch, clip) => p.evaluate(([x, y, z, yaw, pitch, clip]) => {
  const e = window.__meccha;
  e.specPos.set(x, y, z); e.camYaw = yaw; e.camPitch = pitch; e.specTarget = null;
}, [x, y, z, yaw, pitch, clip]);
async function snap(name) { await p.waitForTimeout(1500); await p.screenshot({ path: path.join(out, name + ".png"), timeout: 240000 }); console.log("saved", path.join(out, name + ".png")); }
const custom = arg("views", "");
if (custom) {
  let i = 0;
  for (const v of custom.split(";")) { const [x, y, z, yaw, pitch] = v.split(",").map(Number); await setCam(x, y, z, yaw, pitch, false); await snap(`custom-${i++}`); }
} else {
  if (info.preview) {
    await p.evaluate((pv) => { const e = window.__meccha; const [x, y, z] = pv.pos; const [lx, ly, lz] = pv.look; const dx = lx - x, dy = ly - y, dz = lz - z; e.specPos.set(x, y, z); e.camYaw = Math.atan2(-dx, -dz); e.camPitch = -Math.atan2(dy, Math.hypot(dx, dz)); }, info.preview);
    await snap("preview");
  }
  // מבט־על חתוך: מסתירים כל מה שמעל 3.2 מ' (תקרות) כדי לראות את התכנית
  await p.evaluate(() => {
    const e = window.__meccha;
    const PlaneC = e.ray.ray.origin.constructor; // Vector3
    e.__hidden = [];
    e.world.group.traverse((o) => { if (o.isMesh) { o.geometry.computeBoundingBox?.(); const bb = o.geometry.boundingBox; if (bb) { const minY = bb.min.y * o.scale.y + o.getWorldPosition(new PlaneC()).y; if (minY > 3.0) { o.visible = false; e.__hidden.push(o); } } } });
    const b = e.world.bounds; const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2; const span = Math.max(b.maxX - b.minX, b.maxZ - b.minZ);
    e.specPos.set(cx, span * 1.05, cz + span * 0.18); e.camYaw = 0; e.camPitch = 1.35;
  });
  await snap("overview");
  await p.evaluate(() => { const e = window.__meccha; for (const o of e.__hidden) o.visible = true; });
  const views = await p.evaluate(() => {
    const e = window.__meccha, nav = e.nav, w = e.world;
    let a = 12345; const rnd = () => (a = (a * 16807) % 2147483647) / 2147483647;
    const out = [];
    const pts = [w.hunterSpawns[0], ...w.hiderSpawns.filter((_, i) => i % 9 === 0)].map((v) => [v.x, v.z]);
    while (pts.length < 8) pts.push(nav.randomFree(rnd));
    for (const [x, z] of pts.slice(0, 8)) {
      // מסתכלים לכיוון הנקודה הפנויה הרחוקה ביותר שנראית
      let best = null, bd = 0;
      for (let k = 0; k < 40; k++) { const [tx, tz] = nav.randomFree(rnd); const d = Math.hypot(tx - x, tz - z); if (d > bd && d < 18) { bd = d; best = [tx, tz]; } }
      const [tx, tz] = best ?? [x + 1, z];
      out.push([x, 1.55, z, Math.atan2(-(tx - x), -(tz - z)), 0.08]);
    }
    return out;
  });
  let i = 0;
  for (const v of views) { await setCam(...v, false); await snap(`eye-${i++}`); }
}
const perf = await p.evaluate(() => { const e = window.__meccha; e.renderer.info.autoReset = false; e.renderer.info.reset(); e.renderer.setRenderTarget(null); e.renderer.render(e.scene, e.camera); const r = e.renderer.info.render; const o = { calls: r.calls, triangles: r.triangles, textures: e.renderer.info.memory.textures }; e.renderer.info.autoReset = true; return o; });
console.log("render", JSON.stringify(perf));
if (errs.length) console.log("ERRORS:\n" + [...new Set(errs)].slice(0, 15).join("\n"));
await b.close();
