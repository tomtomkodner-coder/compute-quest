// Checks chess-results.com for new pairings of PLAYER and pushes them to ntfy.
// Run by .github/workflows/chess-alert.yml. State is kept in STATE_FILE between runs.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const PLAYER = process.env.PLAYER || "Kodner Tom";
const FRIENDS = (process.env.FRIENDS || "").split(",").map((s) => s.trim()).filter(Boolean);
const EXTRA = (process.env.TOURNAMENTS || "").split(",").map((s) => s.trim()).filter(Boolean);
const TOPIC = process.env.NTFY_TOPIC;
const STATE_FILE = process.env.STATE_FILE || "chess-state.json";
const BASE = "https://chess-results.com/";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

// ---------- parsing ----------
const ENT = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const decode = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) =>
    e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ENT[e] ?? m));
const strip = (h) => decode(h.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
const tokens = (s) => s.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);
const matchName = (text, q) => tokens(q).every((x) => tokens(text).includes(x));

function parseTables(html) {
  const out = [];
  for (const t of html.matchAll(/<table[^>]*class="[^"]*CRs\d[^"]*"[^>]*>([\s\S]*?)<\/table>/gi)) {
    const rows = [];
    for (const r of t[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = [...r[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((c) => ({
        text: strip(c[1]),
        href: decode(c[1].match(/<a[^>]*href="([^"]+)"/i)?.[1] ?? ""),
      }));
      if (cells.length) rows.push(cells);
    }
    if (rows.length > 1) out.push(rows);
  }
  return out;
}
const title = (html) => strip(html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1] ?? "");
const rounds = (html) => {
  const s = new Set();
  for (const m of html.matchAll(/href="([^"]*tnr\d+\.aspx\?[^"]*)"/gi)) {
    const p = new URLSearchParams(decode(m[1]).split("?")[1]);
    if (p.get("art") === "2" && +p.get("rd") > 0) s.add(+p.get("rd"));
  }
  return [...s].sort((a, b) => b - a);
};
const when = (html) => strip(html).match(/Round\s+\d+\s+on\s+([0-9/.\-]+(?:\s+at\s+[0-9:]+)?)/i)?.[1];

function findPairing(rows, q) {
  const h = rows[0].map((c) => c.text.toLowerCase());
  const res = h.findIndex((x) => /result|res\.|erg/.test(x));
  if (res < 0) return null;
  const side = (r, from, to) => {
    const pick = (re) => { for (let i = from; i < to; i++) if (re.test(h[i] ?? "")) return r[i]; };
    const n = pick(/name|white|black/) ?? r.slice(from, to).find((c) => /art=9/.test(c.href));
    return { name: n?.text ?? "", href: n?.href, rating: pick(/rtg|elo|rating/)?.text, pts: pick(/pts|pkt|points/)?.text, no: pick(/^(no|nr|snr)\.?$/)?.text };
  };
  for (const r of rows.slice(1)) {
    if (r.length <= res) continue;
    const w = side(r, 0, res), b = side(r, res + 1, r.length);
    const mw = matchName(w.name, q);
    if (mw || matchName(b.name, q))
      return { board: r[0]?.text, white: mw, me: mw ? w : b, opp: mw ? b : w, result: r[res]?.text?.replace(/^-$/, "") };
  }
  return null;
}

// ---------- fetching ----------
async function get(path, init) {
  const r = await fetch(new URL(path, BASE), { headers: HEADERS, ...init });
  if (!r.ok) throw new Error(`${r.status} ${path}`);
  return r;
}
const tnr = (id, q) => `tnr${id}.aspx?lan=1&zeilen=99999&${q}`;

async function findTournaments() {
  const [last, ...first] = PLAYER.replace(",", " ").split(/\s+/);
  const r1 = await get("SpielerSuche.aspx?lan=1");
  const html = await r1.text();
  const cookie = (r1.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
  const form = new URLSearchParams();
  for (const m of html.matchAll(/<input[^>]*>/gi)) {
    const a = (k) => m[0].match(new RegExp(`${k}="([^"]*)"`, "i"))?.[1];
    const name = a("name"), type = (a("type") ?? "text").toLowerCase();
    if (!name) continue;
    if (/nachname/i.test(name)) form.set(name, last);
    else if (/vorname/i.test(name)) form.set(name, first.join(" "));
    else if (type === "hidden") form.set(name, decode(a("value") ?? ""));
    else if (type === "submit" && /such/i.test(name)) form.set(name, decode(a("value") ?? "Search"));
  }
  for (const m of html.matchAll(/<select[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/select>/gi))
    form.set(m[1], (m[2].match(/<option[^>]*selected[^>]*value="([^"]*)"/i) ?? m[2].match(/value="([^"]*)"/i))?.[1] ?? "");
  const action = decode(html.match(/<form[^>]*action="([^"]*)"/i)?.[1] ?? "SpielerSuche.aspx?lan=1");
  const r2 = await fetch(new URL(action, r1.url), {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "application/x-www-form-urlencoded", ...(cookie && { Cookie: cookie }) },
    body: form,
  });
  const ids = new Map();
  for (const t of parseTables(await r2.text()))
    for (const row of t) {
      const l = row.find((c) => /tnr\d+\.aspx/i.test(c.href));
      if (l) ids.set(l.href.match(/tnr(\d+)/i)[1], l.text);
    }
  // newest tournaments have the highest ids
  return [...ids.keys()].sort((a, b) => b - a).slice(0, 5);
}

async function check(id) {
  const home = await (await get(tnr(id, "art=0"))).text();
  const names = [PLAYER, ...FRIENDS];
  const found = {};
  for (const rd of rounds(home).slice(0, 3)) {
    const html = await (await get(tnr(id, `art=2&rd=${rd}`))).text();
    const tables = parseTables(html);
    for (const n of names)
      if (!found[n]) for (const t of tables) { const p = findPairing(t, n); if (p) { found[n] = { ...p, round: rd, when: when(html) }; break; } }
    if (names.every((n) => found[n])) break;
  }
  return { name: title(home), found };
}

// ---------- notify ----------
async function push(msg) {
  if (!TOPIC) return console.log("[no NTFY_TOPIC]", msg);
  const r = await fetch("https://ntfy.sh/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic: TOPIC, ...msg }) });
  console.log("ntfy", r.status, msg.title);
}
const color = (w) => (w ? "⚪ לבן" : "⚫ שחור");
const link = (id, href) => (href ? new URL(href, BASE).href : `${BASE}${tnr(id, "art=0")}`);

const primed = existsSync(STATE_FILE);
const state = existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, "utf8")) : {};
let ids = EXTRA;
try {
  ids = [...new Set([...(await findTournaments()), ...EXTRA])];
} catch (e) {
  console.error("search failed:", e.message);
}
console.log("tournaments:", ids.join(", ") || "none");

for (const id of ids) {
  try {
    const { name, found } = await check(id);
    const p = found[PLAYER];
    const tUrl = `${BASE}${tnr(id, "art=0")}`;
    if (!state[id]) {
      // first run ever: remember current status silently
      state[id] = primed ? { round: 0, result: "" } : { round: p?.round ?? 0, result: p?.result ?? "" };
      if (primed) await push({ title: `🏆 טורניר חדש: ${name}`, message: p ? `סיבוב ${p.round} הוגרל` : "נמצאת ברשימת המשתתפים", click: tUrl, tags: ["trophy"] });
    }
    const prev = state[id];
    if (p && p.round > (prev?.round ?? 0)) {
      const friends = FRIENDS.map((f) => found[f]).filter((x) => x?.round === p.round)
        .map((x) => `👥 ${x.me.name} ${color(x.white)} נגד ${x.opp.name}`);
      await push({
        title: `♟️ סיבוב ${p.round}: אתה ${color(p.white)}`,
        message: [
          `נגד ${p.opp.name}${p.opp.rating ? ` (${p.opp.rating})` : ""}${p.opp.pts ? ` · ${p.opp.pts} נק'` : ""}`,
          [p.board && `לוח ${p.board}`, p.when, p.me.pts && `לך ${p.me.pts} נק'`].filter(Boolean).join(" · "),
          name,
          ...friends,
        ].filter(Boolean).join("\n"),
        click: link(id, p.opp.href),
        tags: ["chess_pawn"],
        priority: 4,
        actions: [
          { action: "view", label: "היריב", url: link(id, p.opp.href) },
          { action: "view", label: "ההגרלה", url: `${BASE}${tnr(id, `art=2&rd=${p.round}`)}` },
          { action: "view", label: "דירוג", url: `${BASE}${tnr(id, "art=1")}` },
        ],
      });
      state[id] = { round: p.round, result: p.result ?? "" };
    } else if (p && p.round === prev?.round && p.result && p.result !== prev.result) {
      await push({ title: `📊 תוצאה סיבוב ${p.round}: ${p.result}`, message: `נגד ${p.opp.name} · ${name}`, click: `${BASE}${tnr(id, "art=1")}`, tags: ["bar_chart"] });
      state[id] = { ...prev, result: p.result };
    }
  } catch (e) {
    console.error(id, e.message);
  }
}
writeFileSync(STATE_FILE, JSON.stringify(state, null, 1));
