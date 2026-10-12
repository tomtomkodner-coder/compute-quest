// node cpuprof.mjs <mapId>: CPU profile of loadWorld, top self-time functions + total-time of map functions
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
const map = process.argv[2];
const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 400, height: 300 } });
await p.goto("http://127.0.0.1:5180/.preview-tmp/harness.html");
await p.waitForFunction(() => window.__meccha, null, { timeout: 120000 });
await p.evaluate((map) => { const e = window.__meccha; e.hostUpdate = () => {}; e.onRS = () => {}; e.rs.map = map; e.loadWorld(map); e.loadWorld("lobby"); }, map);
const c = await p.context().newCDPSession(p);
await c.send("Profiler.enable"); await c.send("Profiler.setSamplingInterval", { interval: 200 }); await c.send("Profiler.start");
const ms = await p.evaluate((map) => { const t0 = performance.now(); window.__meccha.loadWorld(map); return performance.now() - t0; }, map);
const { profile } = await c.send("Profiler.stop");
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const self = new Map();
const dt = profile.timeDeltas; const counts = new Map();
profile.samples.forEach((s, i) => counts.set(s, (counts.get(s) || 0) + (dt[i] || 0)));
const parent = new Map(); for (const n of profile.nodes) for (const ch of n.children || []) parent.set(ch, n.id);
const tot = new Map();
for (const [id, t] of counts) {
  const n = byId.get(id); const key = `${n.callFrame.functionName || "(anon)"} ${n.callFrame.url.split("/").pop()}:${n.callFrame.lineNumber + 1}`;
  self.set(key, (self.get(key) || 0) + t);
  const seen = new Set(); let cur = id;
  while (cur != null) { const nn = byId.get(cur); const kk = `${nn.callFrame.functionName || "(anon)"} ${nn.callFrame.url.split("/").pop()}:${nn.callFrame.lineNumber + 1}`; if (!seen.has(kk)) { seen.add(kk); tot.set(kk, (tot.get(kk) || 0) + t); } cur = parent.get(cur); }
}
console.log("build ms", Math.round(ms));
console.log("SELF", [...self].sort((a, b) => b[1] - a[1]).slice(0, 18).map(([k, v]) => `${(v / 1000).toFixed(0)} ${k}`).join("\n"));
console.log("TOTAL (map files)", [...tot].filter(([k]) => /sakura|pool|textures|kit|nav/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, v]) => `${(v / 1000).toFixed(0)} ${k}`).join("\n"));
await b.close();
