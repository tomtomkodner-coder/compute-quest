import fs from "fs";
const src = ["src/components/MecchaGame.tsx", "src/components/MecchaMenu.tsx", "src/game/meccha/engine.ts"].map((f) => fs.readFileSync(f, "utf8")).join("\n");
const keys = new Set([...src.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)+)"/g)].map((m) => m[1]));
// labels passed through components that call t(label)
for (const m of src.matchAll(/(?:label|n|title)[=:]\s*"([A-Z][^"]{1,80})"/g)) keys.add(m[1]);
const L = fs.readFileSync("src/game/meccha/i18n-langs.ts", "utf8");
const langs = {}; let cur = null;
for (const line of L.split("\n")) { const h = line.match(/^  (\w+): \{/); if (h) { cur = h[1]; langs[cur] = new Set(); continue; } const k = line.match(/^    "((?:[^"\\]|\\.)+)":/); if (k && cur) langs[cur].add(k[1]); }
const extra = new Set([...L.matchAll(/^  "((?:[^"\\]|\\.)+)": \{/gm)].map((m) => m[1]));
for (const k of ["found", "safe"]) keys.add(k);
const miss = {};
for (const k of keys) if (!extra.has(k)) for (const [l, s] of Object.entries(langs)) if (!s.has(k)) (miss[k] ??= []).push(l);
for (const [k, ls] of Object.entries(miss)) console.log(JSON.stringify(k), ls.length === 11 ? "ALL" : ls.join(","));
