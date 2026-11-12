import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, ExternalLink, RefreshCw, Search, Trash2, Trophy } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  checkPairings,
  getPage,
  matchName,
  searchPlayer,
  type Pairing,
  type Table,
} from "@/lib/chess-results";

export const Route = createFileRoute("/chess")({
  head: () => ({ meta: [{ title: "התראות הגרלה — Chess-Results" }] }),
  component: ChessPage,
});

type P = Pairing & { round: number; when?: string };
type Tour = { id: string; name: string };
type Settings = { me: string; friends: string[]; tours: Tour[]; seen: Record<string, number>; every: number };
type Status = { title: string; latest: number; pairings: Record<string, P>; error?: string; at: number };

const DEFAULTS: Settings = { me: "Kodner Tom", friends: [], tours: [], seen: {}, every: 2 };
const KEY = "cr-settings";
const load = (): Settings => {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return DEFAULTS;
  }
};
const CR = (id: string, q = "") => `https://chess-results.com/tnr${id}.aspx?lan=1&${q}`;
const snrOf = (href?: string) => Number(href?.match(/snr=(\d+)/i)?.[1]) || undefined;
const colorHe = (c: "w" | "b") => (c === "w" ? "⚪ לבן" : "⚫ שחור");

function ChessPage() {
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<{ id: string; p: P; who: string } | null>(null);
  const [viewer, setViewer] = useState<string | null>(null);
  const sRef = useRef(s);
  sRef.current = s;

  useEffect(() => setS(load()), []);
  const save = (next: Settings) => {
    setS(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const notify = useCallback((id: string, title: string, p: P) => {
    const head = `סיבוב ${p.round}: אתה ${colorHe(p.color)}`;
    const body = `נגד ${p.opp.name}${p.opp.rating ? ` (${p.opp.rating})` : ""}${p.opp.pts ? ` · ${p.opp.pts} נק'` : ""} — ${title}`;
    const open = () => setDetail({ id, p, who: "me" });
    toast(head, { description: body, duration: 30000, action: { label: "פרטים", onClick: open } });
    if ("Notification" in window && Notification.permission === "granted") {
      const n = new Notification(head, { body, tag: `${id}-${p.round}` });
      n.onclick = () => {
        window.focus();
        open();
      };
    }
  }, []);

  const checkAll = useCallback(async () => {
    const cur = sRef.current;
    if (!cur.tours.length) return;
    setBusy(true);
    const seen = { ...cur.seen };
    const tours = [...cur.tours];
    await Promise.all(
      cur.tours.map(async (t, i) => {
        try {
          const r = await checkPairings({ data: { id: t.id, names: [cur.me, ...cur.friends] } });
          setStatus((x) => ({ ...x, [t.id]: { ...r, at: Date.now() } }));
          if (r.title && r.title !== t.name) tours[i] = { ...t, name: r.title };
          const mine = r.pairings[cur.me];
          if (mine && mine.round > (seen[t.id] ?? 0)) {
            if (seen[t.id] !== undefined) notify(t.id, r.title, mine);
            seen[t.id] = mine.round;
          } else if (seen[t.id] === undefined) seen[t.id] = mine?.round ?? 0;
        } catch (e) {
          setStatus((x) => ({ ...x, [t.id]: { title: t.name, latest: 0, pairings: {}, error: String(e), at: Date.now() } }));
        }
      }),
    );
    save({ ...sRef.current, seen, tours });
    setBusy(false);
  }, [notify]);

  useEffect(() => {
    checkAll();
    const h = setInterval(checkAll, Math.max(1, s.every) * 60_000);
    return () => clearInterval(h);
  }, [checkAll, s.every, s.tours.length]);

  const addTour = (id: string, name = `טורניר ${id}`) => {
    if (s.tours.some((t) => t.id === id)) return toast("כבר במעקב");
    save({ ...s, tours: [...s.tours, { id, name }] });
  };

  return (
    <div className="min-h-screen bg-background p-4 text-foreground" dir="rtl">
      <Toaster position="top-center" richColors />
      <div className="mx-auto max-w-3xl space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Trophy className="size-6" /> התראות הגרלה
          </h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!("Notification" in window)) return toast.error("הדפדפן לא תומך בהתראות");
                const p = await Notification.requestPermission();
                toast(p === "granted" ? "התראות הופעלו ✅" : "ההתראות חסומות בדפדפן");
              }}
            >
              <Bell /> הפעל התראות
            </Button>
            <Button size="sm" onClick={checkAll} disabled={busy}>
              <RefreshCw className={busy ? "animate-spin" : ""} /> בדוק עכשיו
            </Button>
          </div>
        </header>

        <SettingsCard s={s} save={save} />
        <FindCard s={s} addTour={addTour} />

        {s.tours.map((t) => (
          <TourCard
            key={t.id}
            t={t}
            s={s}
            st={status[t.id]}
            onDetail={(p, who) => setDetail({ id: t.id, p, who })}
            onView={() => setViewer(t.id)}
            onRemove={() => {
              const { [t.id]: _, ...seen } = s.seen;
              save({ ...s, seen, tours: s.tours.filter((x) => x.id !== t.id) });
            }}
          />
        ))}
        <p className="text-center text-xs text-muted-foreground">
          הבדיקה רצה כל {s.every} דק' כל עוד הדף פתוח (אפשר גם בלשונית ברקע).
        </p>
      </div>

      {detail && <DetailDialog {...detail} s={s} onClose={() => setDetail(null)} />}
      {viewer && <Viewer id={viewer} s={s} onClose={() => setViewer(null)} />}
    </div>
  );
}

function SettingsCard({ s, save }: { s: Settings; save: (x: Settings) => void }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">הגדרות</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-3">
        <label className="text-sm">
          השם שלי (כמו ב-chess-results)
          <Input value={s.me} onChange={(e) => save({ ...s, me: e.target.value, seen: {} })} />
        </label>
        <label className="text-sm">
          חברים (מופרדים בפסיק)
          <Input
            key={s.friends.join(",")}
            defaultValue={s.friends.join(", ")}
            placeholder="Cohen Dan, Levi Noa"
            onBlur={(e) => save({ ...s, friends: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })}
          />
        </label>
        <label className="text-sm">
          בדיקה כל (דקות)
          <Input type="number" min={1} value={s.every} onChange={(e) => save({ ...s, every: Number(e.target.value) || 2 })} />
        </label>
      </CardContent>
    </Card>
  );
}

function FindCard({ s, addTour }: { s: Settings; addTour: (id: string, name?: string) => void }) {
  const [res, setRes] = useState<Awaited<ReturnType<typeof searchPlayer>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState("");
  const search = async () => {
    const [last, ...first] = s.me.replace(",", " ").split(/\s+/);
    setBusy(true);
    try {
      setRes(await searchPlayer({ data: { last, first: first.join(" ") } }));
    } catch (e) {
      toast.error(`החיפוש נכשל: ${e}`);
    }
    setBusy(false);
  };
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">הוספת טורניר</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex gap-2">
          <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="קישור מ-chess-results או מספר טורניר" dir="ltr" />
          <Button
            onClick={() => {
              const id = link.match(/tnr(\d+)/i)?.[1] ?? link.match(/^\s*(\d+)\s*$/)?.[1];
              if (!id) return toast.error("לא מצאתי מספר טורניר");
              addTour(id);
              setLink("");
            }}
          >
            הוסף
          </Button>
        </div>
        <Button variant="secondary" className="w-full" onClick={search} disabled={busy}>
          <Search /> {busy ? "מחפש..." : `חפש טורנירים של ${s.me}`}
        </Button>
        {res && !res.length && <p className="text-sm text-muted-foreground">לא נמצאו תוצאות</p>}
        {res?.slice(0, 15).map((r) => (
          <div key={r.id + r.snr} className="flex items-center justify-between gap-2 rounded border p-2 text-sm">
            <div className="min-w-0">
              <div className="truncate font-medium">{r.tournament}</div>
              <div className="truncate text-xs text-muted-foreground">{r.info}</div>
            </div>
            <Button size="sm" variant="outline" onClick={() => addTour(r.id, r.tournament)} disabled={s.tours.some((t) => t.id === r.id)}>
              עקוב
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TourCard(props: {
  t: Tour;
  s: Settings;
  st?: Status;
  onDetail: (p: P, who: string) => void;
  onView: () => void;
  onRemove: () => void;
}) {
  const { t, s, st } = props;
  const mine = st?.pairings[s.me];
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2 pb-2">
        <CardTitle className="text-base">{st?.title || t.name}</CardTitle>
        <div className="flex shrink-0 gap-1">
          <Button size="sm" variant="outline" onClick={props.onView}>
            כל הטורניר
          </Button>
          <Button size="icon" variant="ghost" onClick={props.onRemove} aria-label="הסר">
            <Trash2 />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {!st && <p className="text-sm text-muted-foreground">טוען...</p>}
        {st?.error && <p className="text-sm text-destructive">{st.error}</p>}
        {st && !st.error && !mine && <p className="text-sm text-muted-foreground">עדיין אין הגרלה שבה מופיע {s.me}</p>}
        {mine && (
          <button
            onClick={() => props.onDetail(mine, "me")}
            className="w-full rounded-lg border-2 border-primary/40 p-3 text-right transition hover:bg-accent"
          >
            <div className="text-sm text-muted-foreground">
              סיבוב {mine.round}
              {mine.when && ` · ${mine.when}`}
              {mine.board && ` · לוח ${mine.board}`}
            </div>
            <div className="text-lg font-bold">
              אתה {colorHe(mine.color)} נגד {mine.opp.name}
            </div>
            <div className="text-sm text-muted-foreground">
              {[mine.opp.rating && `דירוג ${mine.opp.rating}`, mine.opp.pts && `${mine.opp.pts} נק'`, mine.opp.fed]
                .filter(Boolean)
                .join(" · ")}
              {mine.result && mine.result !== "-" && ` · תוצאה: ${mine.result}`} — לחץ לפרטים
            </div>
          </button>
        )}
        {s.friends
          .map((f) => [f, st?.pairings[f]] as const)
          .filter(([, p]) => p)
          .map(([f, p]) => (
            <button key={f} onClick={() => props.onDetail(p!, f)} className="block w-full rounded border p-2 text-right text-sm hover:bg-accent">
              👥 <b>{p!.me.name}</b> ({colorHe(p!.color)}) נגד {p!.opp.name}
              {p!.opp.rating && ` (${p!.opp.rating})`} · סיבוב {p!.round}
            </button>
          ))}
      </CardContent>
    </Card>
  );
}

function usePage(id: string, art: "0" | "1" | "2" | "9", rd?: number, snr?: number) {
  const [d, setD] = useState<Awaited<ReturnType<typeof getPage>> | null>(null);
  const [err, setErr] = useState<string>();
  useEffect(() => {
    if (art === "9" && !snr) return;
    setD(null);
    setErr(undefined);
    getPage({ data: { id, art, rd, snr } }).then(setD, (e) => setErr(String(e)));
  }, [id, art, rd, snr]);
  return { d, err };
}

function DetailDialog({ id, p, who, s, onClose }: { id: string; p: P; who: string; s: Settings; onClose: () => void }) {
  const [tab, setTab] = useState<"opp" | "me">("opp");
  const snr = Number((tab === "opp" ? p.opp : p.me).no) || snrOf((tab === "opp" ? p.opp : p.me).href);
  const { d, err } = usePage(id, "9", undefined, snr);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>
            סיבוב {p.round}: {who === "me" ? "אתה" : p.me.name} {colorHe(p.color)} נגד {p.opp.name}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[p.me, p.opp].map((x, i) => (
            <div key={i} className="rounded border p-2">
              <div className="font-bold">{x.name}</div>
              {x.rating && <div>דירוג: {x.rating}</div>}
              {x.pts && <div>נקודות: {x.pts}</div>}
              {x.fed && <div>מדינה: {x.fed}</div>}
              {x.no && <div>מס' התחלתי: {x.no}</div>}
            </div>
          ))}
        </div>
        <div className="text-sm text-muted-foreground">
          {p.when && `מועד: ${p.when} · `}
          {p.board && `לוח ${p.board}`}
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as "opp" | "me")}>
          <TabsList>
            <TabsTrigger value="opp">היריב</TabsTrigger>
            <TabsTrigger value="me">{who === "me" ? "אני" : p.me.name}</TabsTrigger>
          </TabsList>
        </Tabs>
        {!snr && <p className="text-sm text-muted-foreground">אין דף שחקן</p>}
        {err && <p className="text-sm text-destructive">{err}</p>}
        {snr && !d && !err && <p className="text-sm">טוען...</p>}
        {d && <Tables tables={d.tables} s={s} />}
        {snr && (
          <a className="inline-flex items-center gap-1 text-sm underline" href={CR(id, `art=9&snr=${snr}`)} target="_blank" rel="noreferrer">
            פתח ב-chess-results <ExternalLink className="size-3" />
          </a>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Viewer({ id, s, onClose }: { id: string; s: Settings; onClose: () => void }) {
  const [art, setArt] = useState<"0" | "1" | "2" | "9">("2");
  const [rd, setRd] = useState<number>();
  const [snr, setSnr] = useState<number>();
  const { d, err } = usePage(id, art, art === "2" || art === "1" ? rd : undefined, art === "9" ? snr : undefined);
  const [rounds, setRounds] = useState<number[]>([]);
  useEffect(() => {
    if (d?.rounds.length) setRounds(d.rounds);
  }, [d]);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{d?.title || "טורניר"}</DialogTitle>
        </DialogHeader>
        <Tabs value={art} onValueChange={(v) => setArt(v as typeof art)}>
          <TabsList>
            <TabsTrigger value="2">הגרלות</TabsTrigger>
            <TabsTrigger value="1">דירוג</TabsTrigger>
            <TabsTrigger value="0">משתתפים</TabsTrigger>
            {snr && <TabsTrigger value="9">שחקן</TabsTrigger>}
          </TabsList>
        </Tabs>
        {(art === "2" || art === "1") && rounds.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {[...rounds].reverse().map((r) => (
              <Button key={r} size="sm" variant={(rd ?? rounds[0]) === r ? "default" : "outline"} onClick={() => setRd(r)}>
                {r}
              </Button>
            ))}
          </div>
        )}
        {d?.when && art === "2" && <p className="text-sm text-muted-foreground">{d.when}</p>}
        {err && <p className="text-sm text-destructive">{err}</p>}
        {!d && !err && <p className="text-sm">טוען...</p>}
        {d && (
          <Tables
            tables={d.tables}
            s={s}
            onPlayer={(n) => {
              setSnr(n);
              setArt("9");
            }}
          />
        )}
        <a className="inline-flex items-center gap-1 text-sm underline" href={CR(id, "art=0")} target="_blank" rel="noreferrer">
          פתח ב-chess-results <ExternalLink className="size-3" />
        </a>
      </DialogContent>
    </Dialog>
  );
}

function Tables({ tables, s, onPlayer }: { tables: Table[]; s: Settings; onPlayer?: (snr: number) => void }) {
  if (!tables.length) return <p className="text-sm text-muted-foreground">אין נתונים (אולי עוד לא פורסם)</p>;
  return (
    <div className="space-y-4">
      {tables.map((t, ti) => (
        <div key={ti} className="overflow-x-auto rounded border" dir="ltr">
          <table className="w-full text-sm">
            <tbody>
              {t.rows.map((r, ri) => {
                const line = r.map((c) => c.text).join(" ");
                const me = ri > 0 && matchName(line, s.me);
                const friend = ri > 0 && s.friends.some((f) => matchName(line, f));
                return (
                  <tr
                    key={ri}
                    className={
                      ri === 0 ? "bg-muted font-semibold" : me ? "bg-primary/20 font-bold" : friend ? "bg-amber-400/20" : "even:bg-muted/40"
                    }
                  >
                    {r.map((c, ci) => {
                      const n = snrOf(c.href);
                      return (
                        <td key={ci} className="whitespace-nowrap px-2 py-1">
                          {c.color && (c.color === "w" ? "⚪ " : "⚫ ")}
                          {n && onPlayer && /art=9/.test(c.href!) ? (
                            <button className="text-primary underline-offset-2 hover:underline" onClick={() => onPlayer(n)}>
                              {c.text}
                            </button>
                          ) : (
                            c.text
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
