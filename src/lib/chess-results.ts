import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ---------- HTML helpers (no DOM on Cloudflare Workers, so regex-based) ----------
const BASE = "https://chess-results.com/";
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  Accept: "text/html,application/xhtml+xml",
};

export type Cell = { text: string; href?: string; color?: "w" | "b" };
export type Table = { rows: Cell[][] };
export type Side = { name: string; href?: string; rating?: string; pts?: string; no?: string; fed?: string };
export type Pairing = { board?: string; color: "w" | "b"; me: Side; opp: Side; result?: string };

const ENT: Record<string, string> = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const decode = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) =>
    e[0] === "#"
      ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10))
      : (ENT[e] ?? m),
  );
const strip = (h: string) =>
  decode(h.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, ""))
    .replace(/\s+/g, " ")
    .trim();

export function parseTables(html: string): Table[] {
  const out: Table[] = [];
  for (const t of html.matchAll(/<table[^>]*class="[^"]*CRs\d[^"]*"[^>]*>([\s\S]*?)<\/table>/gi)) {
    const rows: Cell[][] = [];
    for (const r of t[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells: Cell[] = [];
      for (const c of r[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)) {
        const href = c[1].match(/<a[^>]*href="([^"]+)"/i)?.[1];
        const color = /Farbew/i.test(c[0]) ? "w" : /Farbes/i.test(c[0]) ? "b" : undefined;
        cells.push({ text: strip(c[1]), ...(href && { href: decode(href) }), ...(color && { color }) });
      }
      if (cells.length) rows.push(cells);
    }
    if (rows.length > 1) out.push({ rows });
  }
  return out;
}

const pageTitle = (html: string) => strip(html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1] ?? "");

function roundsOf(html: string): number[] {
  const set = new Set<number>();
  for (const m of html.matchAll(/href="([^"]*tnr\d+\.aspx\?[^"]*)"/gi)) {
    const p = new URLSearchParams(decode(m[1]).split("?")[1]);
    if (p.get("art") === "2" && Number(p.get("rd")) > 0) set.add(Number(p.get("rd")));
  }
  return [...set].sort((a, b) => b - a);
}

const roundWhen = (html: string) => {
  const m = strip(html).match(/Round\s+\d+\s+on\s+([0-9/.\-]+(?:\s+at\s+[0-9:]+)?)/i);
  return m?.[1];
};

async function get(path: string) {
  const res = await fetch(new URL(path, BASE), { headers: HEADERS, redirect: "follow" });
  if (!res.ok) throw new Error(`chess-results החזיר ${res.status}`);
  return res.text();
}
const tnr = (id: string, q: string) => `tnr${id}.aspx?lan=1&zeilen=99999&${q}`;

const tokens = (s: string) => s.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);
export const matchName = (text: string, q: string) => {
  const t = tokens(text);
  const qt = tokens(q);
  return qt.length > 0 && qt.every((x) => t.includes(x));
};

function findPairing(table: Table, q: string): Pairing | null {
  const [head, ...body] = table.rows;
  const h = head.map((c) => c.text.toLowerCase());
  const resIdx = h.findIndex((x) => /result|res\.|erg/.test(x));
  if (resIdx < 0) return null;
  const side = (cells: Cell[], from: number, to: number): Side => {
    const pick = (re: RegExp) => {
      for (let i = from; i < to; i++) if (re.test(h[i] ?? "")) return cells[i];
    };
    const n = pick(/name|white|black|weiß|schwarz/) ?? cells.slice(from, to).find((c) => /art=9/.test(c.href ?? ""));
    return {
      name: n?.text ?? "",
      href: n?.href,
      rating: pick(/rtg|elo|rating/)?.text,
      pts: pick(/pts|pkt|points/)?.text,
      no: pick(/^(no|nr|snr)\.?$/)?.text,
      fed: pick(/^fed|land/)?.text,
    };
  };
  for (const r of body) {
    if (r.length <= resIdx) continue;
    const w = side(r, 0, resIdx);
    const b = side(r, resIdx + 1, r.length);
    const mw = matchName(w.name, q);
    if (mw || matchName(b.name, q))
      return { board: r[0]?.text, color: mw ? "w" : "b", me: mw ? w : b, opp: mw ? b : w, result: r[resIdx]?.text };
  }
  return null;
}

// ---------- Server functions ----------
const idSchema = z.string().regex(/^\d+$/);

/** Latest drawn round for each of the given names in a tournament. */
export const checkPairings = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: idSchema, names: z.array(z.string().min(2)).max(20) }))
  .handler(async ({ data }) => {
    const home = await get(tnr(data.id, "art=0"));
    let rds = roundsOf(home);
    if (!rds.length) {
      const cur = await get(tnr(data.id, "art=2"));
      rds = roundsOf(cur);
    }
    const found: Record<string, Pairing & { round: number; when?: string }> = {};
    let latest = 0;
    for (const rd of rds.slice(0, 3)) {
      const html = await get(tnr(data.id, `art=2&rd=${rd}`));
      const tables = parseTables(html);
      for (const n of data.names) {
        if (found[n]) continue;
        for (const t of tables) {
          const p = findPairing(t, n);
          if (p) {
            found[n] = { ...p, round: rd, when: roundWhen(html) };
            latest ||= rd;
            break;
          }
        }
      }
      if (data.names.every((n) => found[n])) break;
    }
    return { title: pageTitle(home), rounds: rds.length ? rds[0] : 0, latest, pairings: found };
  });

/** Generic tournament page: art=0 start list, 1 standings, 2 pairings (rd), 9 player (snr). */
export const getPage = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      id: idSchema,
      art: z.enum(["0", "1", "2", "4", "9"]),
      rd: z.number().int().positive().optional(),
      snr: z.number().int().positive().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const q = `art=${data.art}${data.rd ? `&rd=${data.rd}` : ""}${data.snr ? `&snr=${data.snr}` : ""}`;
    const html = await get(tnr(data.id, q));
    return { title: pageTitle(html), rounds: roundsOf(html), when: roundWhen(html), tables: parseTables(html) };
  });

/** Player search (ASP.NET form postback). */
export const searchPlayer = createServerFn({ method: "GET" })
  .inputValidator(z.object({ last: z.string().min(2), first: z.string().optional() }))
  .handler(async ({ data }) => {
    const url = new URL("SpielerSuche.aspx?lan=1", BASE);
    const r1 = await fetch(url, { headers: HEADERS });
    const html = await r1.text();
    const cookie = (r1.headers.getSetCookie?.() ?? [r1.headers.get("set-cookie") ?? ""])
      .map((c) => c.split(";")[0])
      .filter(Boolean)
      .join("; ");
    const form = new URLSearchParams();
    for (const m of html.matchAll(/<input[^>]*>/gi)) {
      const attr = (a: string) => m[0].match(new RegExp(`${a}="([^"]*)"`, "i"))?.[1];
      const name = attr("name");
      const type = (attr("type") ?? "text").toLowerCase();
      if (!name) continue;
      if (/nachname/i.test(name)) form.set(name, data.last);
      else if (/vorname/i.test(name)) form.set(name, data.first ?? "");
      else if (type === "hidden") form.set(name, decode(attr("value") ?? ""));
      else if (type === "submit" && /such/i.test(name)) form.set(name, decode(attr("value") ?? "Search"));
    }
    for (const m of html.matchAll(/<select[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/select>/gi)) {
      const sel = m[2].match(/<option[^>]*selected[^>]*value="([^"]*)"/i) ?? m[2].match(/<option[^>]*value="([^"]*)"/i);
      form.set(m[1], sel?.[1] ?? "");
    }
    const action = decode(html.match(/<form[^>]*action="([^"]*)"/i)?.[1] ?? "SpielerSuche.aspx?lan=1");
    const r2 = await fetch(new URL(action, r1.url || url), {
      method: "POST",
      headers: { ...HEADERS, "Content-Type": "application/x-www-form-urlencoded", ...(cookie && { Cookie: cookie }) },
      body: form,
    });
    const res = await r2.text();
    const out: { id: string; snr?: number; tournament: string; player: string; info: string }[] = [];
    for (const t of parseTables(res))
      for (const row of t.rows) {
        const link = row.find((c) => /tnr\d+\.aspx/i.test(c.href ?? ""));
        if (!link?.href) continue;
        const id = link.href.match(/tnr(\d+)/i)![1];
        const snr = Number(link.href.match(/snr=(\d+)/i)?.[1]) || undefined;
        const player = row.find((c) => matchName(c.text, data.last))?.text ?? "";
        out.push({ id, snr, tournament: link.text, player, info: row.map((c) => c.text).filter(Boolean).join(" · ") });
      }
    return out.sort((a, b) => Number(b.id) - Number(a.id));
  });
