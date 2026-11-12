import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Bell, ChevronLeft, ExternalLink, Plus, RefreshCw, Search, Settings2, Trash2, Users } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { checkPairings, getPage, matchName, searchPlayer, type Pairing, type Table } from "@/lib/chess-results";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chess")({
  head: () => ({ meta: [{ title: "השחמט שלי — התראות הגרלה" }, { name: "theme-color", content: "#0b1026" }] }),
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
const colorHe = (c: "w" | "b") => (c === "w" ? "לבן" : "שחור");

// Demo data (from a real run) — open /chess?demo to preview the design without network.
const DEMO_TOUR: Tour = { id: "1477547", name: "Herzliya Championship A 2026" };
const DEMO_STATUS: Status = {
  title: DEMO_TOUR.name,
  latest: 8,
  at: Date.now(),
  pairings: {
    "Kodner Tom": {
      round: 8,
      when: "2026/11/12 at 17:00",
      board: "6",
      color: "b",
      result: "",
      me: { name: "Kodner, Tom", pts: "5", no: "14" },
      opp: { name: "Pahima, Tzah", rating: "1654", pts: "5", fed: "ISR", no: "11" },
    },
  },
};

// ---------- glass primitives ----------
function Glass({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-[28px] border border-white/15 bg-white/[0.07] text-right text-white",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.28),inset_0_-1px_0_rgba(255,255,255,0.05),0_24px_60px_-24px_rgba(0,0,0,0.7)]",
        "backdrop-blur-2xl backdrop-saturate-[1.8]",
        onClick && "w-full transition duration-300 hover:-translate-y-0.5 hover:bg-white/[0.11] active:scale-[0.99]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/[0.10] to-transparent" />
      <div className="relative">{children}</div>
    </Tag>
  );
}

function Pill({ children, onClick, active, className, disabled }: { children: ReactNode; onClick?: () => void; active?: boolean; className?: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium backdrop-blur-xl transition",
        "border-white/15 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] hover:bg-white/20 active:scale-95 disabled:opacity-50",
        active && "border-white/40 bg-white text-slate-900 hover:bg-white",
        className,
      )}
    >
      {children}
    </button>
  );
}

function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/80 ring-1 ring-white/10", className)}>{children}</span>;
}

function Piece({ c, size = 56 }: { c: "w" | "b"; size?: number }) {
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.58 }}
      className={cn(
        "grid shrink-0 place-items-center rounded-full leading-none ring-1",
        c === "w"
          ? "bg-gradient-to-br from-white to-slate-300 text-slate-900 ring-white/70 shadow-[0_8px_30px_-6px_rgba(255,255,255,0.55)]"
          : "bg-gradient-to-br from-slate-700 to-black text-white ring-white/20 shadow-[0_8px_30px_-6px_rgba(0,0,0,0.9)]",
      )}
    >
      ♚
    </div>
  );
}

function Backdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#0b1026]">
      <style>{`@keyframes orb{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(40px,-30px) scale(1.15)}}`}</style>
      <div className="absolute -top-32 -right-24 size-[520px] rounded-full bg-[#4f7cff] opacity-50 blur-[120px]" style={{ animation: "orb 18s ease-in-out infinite" }} />
      <div className="absolute top-1/3 -left-40 size-[480px] rounded-full bg-[#c04dff] opacity-40 blur-[130px]" style={{ animation: "orb 22s ease-in-out infinite reverse" }} />
      <div className="absolute -bottom-40 right-1/4 size-[460px] rounded-full bg-[#14d4c4] opacity-30 blur-[120px]" style={{ animation: "orb 26s ease-in-out infinite" }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08),transparent_60%)]" />
    </div>
  );
}

function Sheet({ title, onClose, children, wide }: { title: ReactNode; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        dir="rtl"
        className={cn(
          "max-h-[88vh] overflow-y-auto rounded-[32px] border-white/20 bg-[#151a3a]/70 p-5 text-white backdrop-blur-3xl backdrop-saturate-150 sm:p-7",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_40px_120px_-20px_rgba(0,0,0,0.8)] [&>button]:left-5 [&>button]:right-auto [&>button]:top-5 [&>button]:text-white",
          wide ? "max-w-5xl" : "max-w-2xl",
        )}
      >
        <DialogTitle className="pl-8 text-xl font-bold tracking-tight">{title}</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  );
}

function Segmented<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: [T, string][] }) {
  return (
    <div className="inline-flex w-fit justify-self-start rounded-full bg-black/25 p-1 ring-1 ring-white/10">
      {items.map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={cn("rounded-full px-4 py-1.5 text-sm transition", value === v ? "bg-white/90 font-semibold text-slate-900 shadow" : "text-white/70 hover:text-white")}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

const Muted = ({ children }: { children: ReactNode }) => <p className="text-sm text-white/60">{children}</p>;
const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="block space-y-1.5 text-xs font-medium text-white/60">
    <span>{label}</span>
    {children}
  </label>
);
const inputCls =
  "w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-white/40 focus:bg-black/30";

// ---------- page ----------
function ChessPage() {
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<{ id: string; p: P; who: string } | null>(null);
  const [viewer, setViewer] = useState<string | null>(null);
  const [panel, setPanel] = useState<"add" | "settings" | null>(null);
  const [demo, setDemo] = useState(false);
  const sRef = useRef(s);
  sRef.current = s;

  useEffect(() => {
    if (new URLSearchParams(location.search).has("demo")) {
      setDemo(true);
      setS({ ...DEFAULTS, tours: [DEMO_TOUR] });
      setStatus({ [DEMO_TOUR.id]: DEMO_STATUS });
    } else setS(load());
  }, []);
  const save = (next: Settings) => {
    setS(next);
    if (demo) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const notify = useCallback((id: string, title: string, p: P) => {
    const head = `סיבוב ${p.round}: אתה ${colorHe(p.color)}`;
    const body = `נגד ${p.opp.name}${p.opp.rating ? ` (${p.opp.rating})` : ""} — ${title}`;
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
    if (!cur.tours.length || new URLSearchParams(location.search).has("demo")) return;
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
    const next = { ...sRef.current, seen, tours };
    setS(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
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
    toast.success("נוסף למעקב");
  };

  const next = s.tours.map((t) => ({ t, p: status[t.id]?.pairings[s.me] })).find((x) => x.p);

  return (
    <div className="min-h-screen bg-[#0b1026] px-4 pb-16 pt-8 text-white antialiased [font-family:-apple-system,'SF_Pro_Display','Heebo_Variable',system-ui,sans-serif]" dir="rtl">
      <Backdrop />
      <Toaster position="top-center" theme="dark" toastOptions={{ className: "!rounded-2xl !border-white/15 !bg-white/10 !backdrop-blur-2xl !text-white" }} />
      <div className="relative z-10 mx-auto max-w-2xl space-y-5">
        <header className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-white/50">{new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}</p>
            <h1 className="text-4xl font-bold tracking-tight">השחמט שלי</h1>
          </div>
          <div className="flex gap-2">
            <Pill
              className="size-11 px-0"
              onClick={async () => {
                if (!("Notification" in window)) return toast.error("הדפדפן לא תומך בהתראות");
                const p = await Notification.requestPermission();
                toast(p === "granted" ? "התראות הופעלו" : "ההתראות חסומות בדפדפן");
              }}
            >
              <Bell className="size-4" />
            </Pill>
            <Pill className="size-11 px-0" onClick={checkAll} disabled={busy}>
              <RefreshCw className={cn("size-4", busy && "animate-spin")} />
            </Pill>
            <Pill className="size-11 px-0" onClick={() => setPanel("settings")}>
              <Settings2 className="size-4" />
            </Pill>
          </div>
        </header>

        {demo && <Chip className="bg-amber-400/20 text-amber-100">מצב תצוגה — נתונים לדוגמה</Chip>}

        {next ? (
          <Hero p={next.p!} title={status[next.t.id]?.title || next.t.name} onClick={() => setDetail({ id: next.t.id, p: next.p!, who: "me" })} />
        ) : (
          <Glass className="p-6">
            <div className="text-5xl">♞</div>
            <h2 className="mt-3 text-2xl font-bold">אין עדיין הגרלה</h2>
            <Muted>{s.tours.length ? "ברגע שתהיה הגרלה לסיבוב חדש תקבל התראה." : "הוסף טורניר כדי להתחיל לעקוב."}</Muted>
            <Pill className="mt-4" active onClick={() => setPanel("add")}>
              <Plus className="size-4" /> הוסף טורניר
            </Pill>
          </Glass>
        )}

        <div className="flex items-center justify-between pt-2">
          <h2 className="text-xl font-bold tracking-tight">טורנירים</h2>
          <Pill onClick={() => setPanel("add")}>
            <Plus className="size-4" /> הוסף
          </Pill>
        </div>

        <div className="space-y-3">
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
        </div>
        <p className="pt-2 text-center text-xs text-white/40">מתעדכן כל {s.every} דק׳ · נתונים מ-chess-results.com</p>
      </div>

      {panel === "add" && <AddSheet s={s} addTour={addTour} onClose={() => setPanel(null)} />}
      {panel === "settings" && <SettingsSheet s={s} save={save} onClose={() => setPanel(null)} />}
      {detail && <DetailSheet {...detail} s={s} onClose={() => setDetail(null)} />}
      {viewer && <Viewer id={viewer} s={s} onClose={() => setViewer(null)} />}
    </div>
  );
}

function Hero({ p, title, onClick }: { p: P; title: string; onClick: () => void }) {
  return (
    <Glass className="p-6 sm:p-7" onClick={onClick}>
      <div className="flex items-center justify-between">
        <Chip className="bg-emerald-400/20 text-emerald-100 ring-emerald-300/30">
          <span className="size-1.5 animate-pulse rounded-full bg-emerald-300" /> המשחק הבא · סיבוב {p.round}
        </Chip>
        <ChevronLeft className="size-5 text-white/40" />
      </div>
      <div className="mt-6 flex items-center gap-4">
        <Piece c={p.color} size={72} />
        <div className="min-w-0">
          <div className="text-sm text-white/60">אתה משחק ב{colorHe(p.color)} נגד</div>
          <div className="truncate text-3xl font-bold tracking-tight">{p.opp.name}</div>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-2">
        {[
          ["דירוג", p.opp.rating || "—"],
          ["נקודות שלו", p.opp.pts || "—"],
          ["לוח", p.board || "—"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
            <div className="text-[11px] text-white/50">{k}</div>
            <div className="text-xl font-semibold tabular-nums">{v}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {p.when && <Chip>🕐 {p.when.replace(" at ", " · ")}</Chip>}
        <Chip>🏆 {title}</Chip>
      </div>
    </Glass>
  );
}

function TourCard(props: { t: Tour; s: Settings; st?: Status; onDetail: (p: P, who: string) => void; onView: () => void; onRemove: () => void }) {
  const { t, s, st } = props;
  const mine = st?.pairings[s.me];
  const friends = s.friends.map((f) => [f, st?.pairings[f]] as const).filter(([, p]) => p);
  return (
    <Glass className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold">{st?.title || t.name}</h3>
          <div className="mt-0.5 text-xs text-white/50">
            {!st ? "טוען..." : st.error ? "שגיאה בטעינה" : `${st.latest ? `סיבוב ${st.latest}` : "טרם הוגרל"} · עודכן ${new Date(st.at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}`}
          </div>
        </div>
        <button onClick={props.onRemove} className="rounded-full p-2 text-white/40 transition hover:bg-white/10 hover:text-white" aria-label="הסר">
          <Trash2 className="size-4" />
        </button>
      </div>

      {st?.error && <p className="mt-3 text-sm text-rose-300">{st.error}</p>}
      {mine && (
        <button onClick={() => props.onDetail(mine, "me")} className="mt-4 flex w-full items-center gap-3 rounded-2xl bg-black/20 p-3 text-right ring-1 ring-white/10 transition hover:bg-black/30">
          <Piece c={mine.color} size={40} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{mine.opp.name}</div>
            <div className="text-xs text-white/55">
              סיבוב {mine.round} · {colorHe(mine.color)}
              {mine.opp.rating && ` · ${mine.opp.rating}`}
              {mine.result && ` · תוצאה ${mine.result}`}
            </div>
          </div>
          <ChevronLeft className="size-4 text-white/40" />
        </button>
      )}
      {friends.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {friends.map(([f, p]) => (
            <button key={f} onClick={() => props.onDetail(p!, f)} className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-right text-sm transition hover:bg-white/10">
              <Users className="size-3.5 text-amber-200" />
              <span className="font-medium text-amber-100">{p!.me.name}</span>
              <span className="text-white/50">({colorHe(p!.color)}) נגד</span>
              <span className="truncate">{p!.opp.name}</span>
            </button>
          ))}
        </div>
      )}
      <div className="mt-4 flex gap-2">
        <Pill onClick={props.onView} className="flex-1">
          כל הטורניר
        </Pill>
        <Pill onClick={() => window.open(CR(t.id, "art=0"), "_blank")} className="px-3">
          <ExternalLink className="size-4" />
        </Pill>
      </div>
    </Glass>
  );
}

function AddSheet({ s, addTour, onClose }: { s: Settings; addTour: (id: string, name?: string) => void; onClose: () => void }) {
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
    <Sheet title="הוספת טורניר" onClose={onClose}>
      <div className="flex gap-2">
        <input className={inputCls} dir="ltr" value={link} onChange={(e) => setLink(e.target.value)} placeholder="chess-results link / ID" />
        <Pill
          active
          onClick={() => {
            const id = link.match(/tnr(\d+)/i)?.[1] ?? link.match(/^\s*(\d+)\s*$/)?.[1];
            if (!id) return toast.error("לא מצאתי מספר טורניר");
            addTour(id);
            setLink("");
          }}
        >
          הוסף
        </Pill>
      </div>
      <Pill onClick={search} disabled={busy} className="w-full py-3">
        <Search className="size-4" /> {busy ? "מחפש..." : `חפש טורנירים של ${s.me}`}
      </Pill>
      {res && !res.length && <Muted>לא נמצאו תוצאות</Muted>}
      <div className="space-y-2">
        {res?.slice(0, 15).map((r) => {
          const on = s.tours.some((t) => t.id === r.id);
          return (
            <div key={r.id + r.snr} className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{r.tournament}</div>
                <div className="truncate text-xs text-white/50">{r.info}</div>
              </div>
              <Pill active={!on} disabled={on} onClick={() => addTour(r.id, r.tournament)} className="px-3 py-1.5">
                {on ? "במעקב" : "עקוב"}
              </Pill>
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}

function SettingsSheet({ s, save, onClose }: { s: Settings; save: (x: Settings) => void; onClose: () => void }) {
  return (
    <Sheet title="הגדרות" onClose={onClose}>
      <Field label="השם שלי (כמו ב-chess-results)">
        <input className={inputCls} value={s.me} onChange={(e) => save({ ...s, me: e.target.value, seen: {} })} />
      </Field>
      <Field label="חברים למעקב (מופרדים בפסיק)">
        <input
          className={inputCls}
          defaultValue={s.friends.join(", ")}
          placeholder="Cohen Dan, Levi Noa"
          onBlur={(e) => save({ ...s, friends: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })}
        />
      </Field>
      <Field label="בדיקה כל (דקות)">
        <input className={inputCls} type="number" min={1} value={s.every} onChange={(e) => save({ ...s, every: Number(e.target.value) || 2 })} />
      </Field>
    </Sheet>
  );
}

function usePage(id: string, art: "0" | "1" | "2" | "9", rd?: number, snr?: number) {
  const [d, setD] = useState<Awaited<ReturnType<typeof getPage>> | null>(null);
  const [err, setErr] = useState<string>();
  useEffect(() => {
    if ((art === "9" && !snr) || location.search.includes("demo")) return;
    setD(null);
    setErr(undefined);
    getPage({ data: { id, art, rd, snr } }).then(setD, (e) => setErr(String(e)));
  }, [id, art, rd, snr]);
  return { d, err };
}

function Loading({ d, err }: { d: unknown; err?: string }) {
  if (err) return <p className="text-sm text-rose-300">{err}</p>;
  if (!d)
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-9 animate-pulse rounded-xl bg-white/10" />
        ))}
      </div>
    );
  return null;
}

function DetailSheet({ id, p, who, s, onClose }: { id: string; p: P; who: string; s: Settings; onClose: () => void }) {
  const [tab, setTab] = useState<"opp" | "me">("opp");
  const side = tab === "opp" ? p.opp : p.me;
  const snr = Number(side.no) || snrOf(side.href);
  const { d, err } = usePage(id, "9", undefined, snr);
  const meLabel = who === "me" ? "אני" : p.me.name;
  return (
    <Sheet title={`סיבוב ${p.round}`} onClose={onClose}>
      <div className="flex items-center justify-between gap-3 rounded-3xl bg-black/20 p-4 ring-1 ring-white/10">
        {[
          { x: p.me, c: p.color, l: meLabel },
          { x: p.opp, c: (p.color === "w" ? "b" : "w") as "w" | "b", l: "יריב" },
        ].map(({ x, c, l }, i) => (
          <div key={i} className={cn("flex min-w-0 flex-1 flex-col items-center gap-2 text-center", i === 1 && "order-3")}>
            <Piece c={c} size={52} />
            <div className="text-[11px] text-white/50">{l}</div>
            <div className="w-full truncate font-semibold">{x.name}</div>
            <div className="flex flex-wrap justify-center gap-1">
              {x.rating && <Chip>{x.rating}</Chip>}
              {x.pts && <Chip>{x.pts} נק׳</Chip>}
              {x.fed && <Chip>{x.fed}</Chip>}
            </div>
          </div>
        ))}
        <div className="order-2 text-2xl font-black text-white/30">VS</div>
      </div>
      <div className="flex flex-wrap gap-2">
        {p.board && <Chip>לוח {p.board}</Chip>}
        {p.when && <Chip>🕐 {p.when.replace(" at ", " · ")}</Chip>}
        {p.result && <Chip>תוצאה {p.result}</Chip>}
      </div>
      <Segmented value={tab} onChange={setTab} items={[["opp", "היריב"], ["me", meLabel]]} />
      {snr ? <Loading d={d} err={err} /> : <Muted>אין דף שחקן</Muted>}
      {d && <Tables tables={d.tables} s={s} />}
      {snr && (
        <a className="inline-flex items-center gap-1 text-sm text-white/60 underline-offset-4 hover:text-white hover:underline" href={CR(id, `art=9&snr=${snr}`)} target="_blank" rel="noreferrer">
          פתח ב-chess-results <ExternalLink className="size-3" />
        </a>
      )}
    </Sheet>
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
  const items: ["0" | "1" | "2" | "9", string][] = [["2", "הגרלות"], ["1", "דירוג"], ["0", "משתתפים"]];
  if (snr) items.push(["9", "שחקן"]);
  return (
    <Sheet title={d?.title || "טורניר"} onClose={onClose} wide>
      <div className="overflow-x-auto">
        <Segmented value={art} onChange={setArt} items={items} />
      </div>
      {(art === "2" || art === "1") && rounds.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[...rounds].reverse().map((r) => (
            <button
              key={r}
              onClick={() => setRd(r)}
              className={cn(
                "size-9 shrink-0 rounded-full text-sm font-semibold ring-1 transition",
                (rd ?? rounds[0]) === r ? "bg-white text-slate-900 ring-white" : "bg-white/5 text-white/70 ring-white/15 hover:bg-white/15",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      )}
      {d?.when && art === "2" && <Chip>🕐 {d.when.replace(" at ", " · ")}</Chip>}
      <Loading d={d} err={err} />
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
    </Sheet>
  );
}

function Tables({ tables, s, onPlayer }: { tables: Table[]; s: Settings; onPlayer?: (snr: number) => void }) {
  if (!tables.length) return <Muted>אין נתונים (אולי עוד לא פורסם)</Muted>;
  return (
    <div className="space-y-4">
      {tables.map((t, ti) => (
        <div key={ti} className="overflow-x-auto rounded-2xl bg-black/20 ring-1 ring-white/10" dir="ltr">
          <table className="w-full text-sm">
            <tbody>
              {t.rows.map((r, ri) => {
                const line = r.map((c) => c.text).join(" ");
                const me = ri > 0 && matchName(line, s.me);
                const friend = ri > 0 && s.friends.some((f) => matchName(line, f));
                return (
                  <tr
                    key={ri}
                    className={cn(
                      "border-b border-white/5 last:border-0",
                      ri === 0 ? "bg-white/10 text-xs font-semibold uppercase tracking-wide text-white/60" : "hover:bg-white/5",
                      me && "bg-sky-400/20 font-semibold text-sky-50",
                      friend && "bg-amber-300/15 text-amber-50",
                    )}
                  >
                    {r.map((c, ci) => {
                      const n = snrOf(c.href);
                      return (
                        <td key={ci} className="whitespace-nowrap px-3 py-2">
                          {c.color && <span className={cn("me-1.5 inline-block size-2.5 rounded-full ring-1 ring-white/40", c.color === "w" ? "bg-white" : "bg-black")} />}
                          {n && onPlayer && /art=9/.test(c.href!) ? (
                            <button className="text-sky-300 hover:underline" onClick={() => onPlayer(n)}>
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
