import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Bell, ChevronLeft, ExternalLink, Plus, RotateCw, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Drawer } from "vaul";
import { checkPairings, getPage, matchName, searchPlayer, type Pairing, type Table } from "@/lib/chess-results";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chess")({
  head: () => ({ meta: [{ title: "השחמט שלי" }, { name: "theme-color", content: "#0c0e11" }] }),
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
const persist = (s: Settings) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* private mode */
  }
};
const CR = (id: string, q = "") => `https://chess-results.com/tnr${id}.aspx?lan=1&${q}`;
const snrOf = (href?: string) => Number(href?.match(/snr=(\d+)/i)?.[1]) || undefined;
const colorHe = (c: "w" | "b") => (c === "w" ? "לבן" : "שחור");
const fmtWhen = (w?: string) => {
  const m = w?.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\s+at\s+(\d{1,2}:\d{2}))?/);
  if (!m) return w;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return `${d.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}${m[4] ? `, ${m[4]}` : ""}`;
};
const isDemo = () => typeof location !== "undefined" && new URLSearchParams(location.search).has("demo");

// Sample data from a real run. Open /chess?demo to preview without network.
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

/* Design tokens. Glass here is a web approximation (backdrop-filter), not Apple's native Liquid Glass. */
const CSS = `
.cq{--bg:#eceef1;--ink:#0e1013;--muted:rgb(14 16 19/.56);--hair:rgb(14 16 19/.08);--fill:rgb(14 16 19/.05);
--glass:rgb(255 255 255/.58);--sheet:rgb(246 247 249/.86);--edge:rgb(255 255 255/.75);
--lift:inset 0 1px 0 rgb(255 255 255/.9),0 1px 2px rgb(30 40 60/.06),0 24px 48px -28px rgb(30 40 60/.35);
--sq1:#dfe2e7;--sq2:#cfd4db;--accent:#0b7d55;--accent-ink:#fff;--tint:rgb(11 125 85/.12)}
@media (prefers-color-scheme:dark){.cq{--bg:#0c0e11;--ink:#f1f2f4;--muted:rgb(241 242 244/.55);--hair:rgb(255 255 255/.08);--fill:rgb(255 255 255/.06);
--glass:rgb(30 33 38/.52);--sheet:rgb(24 26 30/.88);--edge:rgb(255 255 255/.11);
--lift:inset 0 1px 0 rgb(255 255 255/.09),0 30px 60px -30px rgb(0 0 0/.8);
--sq1:#15181c;--sq2:#1d2126;--accent:#3ccf91;--accent-ink:#04241a;--tint:rgb(60 207 145/.14)}}
.cq{background:var(--bg);color:var(--ink)}
.glass{background:var(--glass);border:1px solid var(--edge);box-shadow:var(--lift);
-webkit-backdrop-filter:blur(30px) saturate(190%);backdrop-filter:blur(30px) saturate(190%)}
@media (prefers-reduced-transparency:reduce){.glass{background:var(--sheet);backdrop-filter:none;-webkit-backdrop-filter:none}}
.board{background:repeating-conic-gradient(var(--sq1) 0 25%,var(--sq2) 0 50%) 0 0/88px 88px;
transform:perspective(900px) rotateX(58deg) scale(2.2);transform-origin:50% 0;
-webkit-mask-image:linear-gradient(to bottom,#000 0%,transparent 70%);mask-image:linear-gradient(to bottom,#000 0%,transparent 70%)}
@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:no-preference){.rise{animation:rise .7s cubic-bezier(.16,1,.3,1) both;animation-delay:calc(var(--i,0)*80ms)}}
.press{transition:transform .2s cubic-bezier(.16,1,.3,1),background-color .2s}.press:active{transform:scale(.97)}
`;
const rise = (i: number) => ({ "--i": i }) as CSSProperties;

// ---------- primitives ----------
function IconButton({ label, onClick, children, disabled }: { label: string; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button aria-label={label} title={label} onClick={onClick} disabled={disabled} className="glass press grid size-11 place-items-center rounded-full disabled:opacity-50">
      {children}
    </button>
  );
}

function Button({ children, onClick, kind = "plain", className, disabled }: { children: ReactNode; onClick?: () => void; kind?: "accent" | "plain"; className?: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "press inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 text-[15px] font-semibold disabled:opacity-50",
        kind === "accent" ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--fill)] hover:bg-[var(--hair)]",
        className,
      )}
    >
      {children}
    </button>
  );
}

function Piece({ c, size }: { c: "w" | "b"; size: number }) {
  return (
    <span
      aria-label={colorHe(c)}
      style={{ width: size, height: size, fontSize: size * 0.6 }}
      className={cn(
        "grid shrink-0 place-items-center rounded-full leading-none",
        c === "w"
          ? "bg-[#f7f7f5] text-[#16181b] shadow-[inset_0_-2px_0_rgb(0_0_0/.08),0_0_0_1px_rgb(0_0_0/.08)]"
          : "bg-[#16181b] text-[#f7f7f5] shadow-[inset_0_1px_0_rgb(255_255_255/.14),0_0_0_1px_rgb(255_255_255/.1)]",
      )}
    >
      ♚
    </span>
  );
}

function Sheet({ title, onClose, children, tall }: { title: string; onClose: () => void; children: ReactNode; tall?: boolean }) {
  return (
    <Drawer.Root open onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/30" />
        <Drawer.Content
          dir="rtl"
          className={cn(
            "cq fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-2xl flex-col rounded-t-[28px] border border-b-0 border-[var(--edge)] !bg-[var(--sheet)] outline-none",
            "shadow-[0_-20px_60px_-20px_rgb(0_0_0/.4)] [-webkit-backdrop-filter:blur(40px)_saturate(180%)] [backdrop-filter:blur(40px)_saturate(180%)]",
            tall ? "h-[92dvh]" : "max-h-[88dvh]",
          )}
        >
          <style>{CSS}</style>
          <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-[var(--hair)]" />
          <div className="flex items-center justify-between px-5 pb-2 pt-3">
            <Drawer.Title className="text-[22px] font-bold tracking-tight">{title}</Drawer.Title>
            <button onClick={onClose} className="press rounded-full bg-[var(--fill)] px-4 py-1.5 text-sm font-semibold">
              סגור
            </button>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function Segmented<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: [T, string][] }) {
  return (
    <div className="flex rounded-full bg-[var(--fill)] p-1">
      {items.map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={cn(
            "flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition",
            value === v ? "bg-[var(--bg)] font-semibold shadow-[0_1px_3px_rgb(0_0_0/.12)]" : "text-[var(--muted)]",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

const Muted = ({ children, className }: { children: ReactNode; className?: string }) => <p className={cn("text-[15px] text-[var(--muted)]", className)}>{children}</p>;
const inputCls =
  "h-11 w-full rounded-full border border-[var(--hair)] bg-[var(--fill)] px-4 text-[15px] text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)]";

// ---------- page ----------
function ChessPage() {
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<{ id: string; p: P; who: string } | null>(null);
  const [viewer, setViewer] = useState<string | null>(null);
  const [panel, setPanel] = useState<"add" | "settings" | null>(null);
  const [demo, setDemo] = useState(false);
  const [today, setToday] = useState("");
  const sRef = useRef(s);
  sRef.current = s;

  useEffect(() => {
    setToday(new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" }));
    setDemo(isDemo());
    if (isDemo()) {
      setS({ ...DEFAULTS, tours: [DEMO_TOUR] });
      setStatus({ [DEMO_TOUR.id]: DEMO_STATUS });
    } else setS(load());
  }, []);
  const save = (next: Settings) => {
    setS(next);
    if (!isDemo()) persist(next);
  };

  const notify = useCallback((id: string, title: string, p: P) => {
    const head = `סיבוב ${p.round}: אתה ${colorHe(p.color)}`;
    const body = `נגד ${p.opp.name}${p.opp.rating ? ` (${p.opp.rating})` : ""}. ${title}`;
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
    if (!cur.tours.length || isDemo()) return;
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
    persist(next);
    setBusy(false);
  }, [notify]);

  useEffect(() => {
    checkAll();
    const h = setInterval(checkAll, Math.max(1, s.every) * 60_000);
    return () => clearInterval(h);
  }, [checkAll, s.every, s.tours.length]);

  const addTour = (id: string, name = `טורניר ${id}`) => {
    if (s.tours.some((t) => t.id === id)) return toast("הטורניר כבר במעקב");
    save({ ...s, tours: [...s.tours, { id, name }] });
    toast.success("נוסף למעקב");
  };

  const next = s.tours.map((t) => ({ t, p: status[t.id]?.pairings[s.me] })).find((x) => x.p);

  return (
    <div className="cq relative min-h-[100dvh] overflow-x-hidden antialiased [font-family:-apple-system,BlinkMacSystemFont,'SF_Pro_Text','Heebo_Variable',sans-serif]" dir="rtl">
      <style>{CSS}</style>
      <div aria-hidden className="board pointer-events-none fixed inset-x-0 top-0 h-[70dvh]" />
      <Toaster
        position="top-center"
        toastOptions={{ className: "!rounded-[20px] !border-[var(--edge)] !bg-[var(--sheet)] !text-[var(--ink)] ![backdrop-filter:blur(30px)]" }}
      />

      <main className="relative mx-auto max-w-xl px-4 pb-16 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <header className="rise flex items-center justify-between gap-3 pb-6" style={rise(0)}>
          <div>
            <p className="text-[13px] font-semibold text-[var(--muted)]">{today || "\u00a0"}</p>
            <h1 className="text-[34px] font-bold leading-tight tracking-tight">השחמט שלי</h1>
          </div>
          <div className="flex gap-2">
            <IconButton
              label="הפעל התראות"
              onClick={async () => {
                if (!("Notification" in window)) return toast.error("הדפדפן לא תומך בהתראות");
                const p = await Notification.requestPermission();
                toast(p === "granted" ? "התראות הופעלו" : "ההתראות חסומות בהגדרות הדפדפן");
              }}
            >
              <Bell className="size-[18px]" strokeWidth={2} />
            </IconButton>
            <IconButton label="רענן" onClick={checkAll} disabled={busy}>
              <RotateCw className={cn("size-[18px]", busy && "animate-spin")} strokeWidth={2} />
            </IconButton>
            <IconButton label="הגדרות" onClick={() => setPanel("settings")}>
              <SlidersHorizontal className="size-[18px]" strokeWidth={2} />
            </IconButton>
          </div>
        </header>

        {next ? (
          <Hero p={next.p!} title={status[next.t.id]?.title || next.t.name} onOpen={() => setDetail({ id: next.t.id, p: next.p!, who: "me" })} />
        ) : (
          <section className="glass rise rounded-[28px] p-6" style={rise(1)}>
            <h2 className="text-2xl font-bold tracking-tight">{s.tours.length ? "אין עדיין הגרלה" : "עוד לא עוקבים אחרי טורניר"}</h2>
            <Muted className="mt-1">{s.tours.length ? "כשתצא הגרלה לסיבוב הבא, היא תופיע כאן." : "מצא את הטורנירים שלך ב-chess-results והתחל לעקוב."}</Muted>
            <Button kind="accent" className="mt-5" onClick={() => setPanel("add")}>
              <Plus className="size-4" strokeWidth={2.5} /> הוסף טורניר
            </Button>
          </section>
        )}

        {s.tours.length > 0 && (
          <section className="rise mt-8" style={rise(2)}>
            <div className="flex items-center justify-between px-1 pb-2">
              <h2 className="text-xl font-bold tracking-tight">טורנירים</h2>
              <button onClick={() => setPanel("add")} className="press text-[15px] font-semibold text-[var(--accent)]">
                הוסף
              </button>
            </div>
            <div className="glass divide-y divide-[var(--hair)] overflow-hidden rounded-[24px]">
              {s.tours.map((t) => (
                <TourRow key={t.id} t={t} s={s} st={status[t.id]} onDetail={(p, who) => setDetail({ id: t.id, p, who })} onView={() => setViewer(t.id)} />
              ))}
            </div>
          </section>
        )}
        <p className="mt-6 text-center text-xs text-[var(--muted)]">
          {demo ? "תצוגה לדוגמה" : `מתעדכן כל ${s.every} דקות`}. נתונים מ-chess-results.com
        </p>
      </main>

      {panel === "add" && <AddSheet s={s} addTour={addTour} onClose={() => setPanel(null)} />}
      {panel === "settings" && (
        <SettingsSheet
          s={s}
          save={save}
          onRemove={(id) => {
            const { [id]: _, ...seen } = s.seen;
            save({ ...s, seen, tours: s.tours.filter((x) => x.id !== id) });
          }}
          onClose={() => setPanel(null)}
        />
      )}
      {detail && <DetailSheet {...detail} s={s} onClose={() => setDetail(null)} />}
      {viewer && <Viewer id={viewer} s={s} onClose={() => setViewer(null)} />}
    </div>
  );
}

function Hero({ p, title, onOpen }: { p: P; title: string; onOpen: () => void }) {
  const stats: [string, string][] = [
    ["דירוג", p.opp.rating || "-"],
    ["נקודות", p.opp.pts || "-"],
    ["לוח", p.board || "-"],
  ];
  return (
    <section className="glass rise rounded-[28px] p-6" style={rise(1)}>
      <p className="text-[13px] font-semibold text-[var(--accent)]">המשחק הבא, סיבוב {p.round}</p>
      <div className="mt-4 flex items-center gap-4">
        <Piece c={p.color} size={64} />
        <div className="min-w-0">
          <p className="text-[15px] text-[var(--muted)]">אתה {colorHe(p.color)}, נגד</p>
          <h2 className="truncate text-[28px] font-bold leading-tight tracking-tight">{p.opp.name}</h2>
        </div>
      </div>
      <dl className="mt-6 grid grid-cols-3 rounded-[20px] [&>div+div]:border-s [&>div+div]:border-[var(--hair)] bg-[var(--fill)] py-3">
        {stats.map(([k, v]) => (
          <div key={k} className="px-4">
            <dt className="text-xs text-[var(--muted)]">{k}</dt>
            <dd className="text-xl font-semibold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 text-[15px]">
        {p.when && <p className="font-semibold">{fmtWhen(p.when)}</p>}
        <p className="truncate text-[var(--muted)]">{title}</p>
      </div>
      <Button kind="accent" className="mt-5 w-full" onClick={onOpen}>
        פרטי היריב
      </Button>
    </section>
  );
}

function TourRow({ t, s, st, onDetail, onView }: { t: Tour; s: Settings; st?: Status; onDetail: (p: P, who: string) => void; onView: () => void }) {
  const mine = st?.pairings[s.me];
  const friends = s.friends.map((f) => [f, st?.pairings[f]] as const).filter(([, p]) => p);
  const sub = !st
    ? "טוען"
    : st.error
      ? "לא הצלחתי לטעון"
      : mine
        ? `סיבוב ${mine.round}: ${colorHe(mine.color)} נגד ${mine.opp.name}${mine.result ? `, ${mine.result}` : ""}`
        : st.latest
          ? `סיבוב ${st.latest}`
          : "טרם הוגרל";
  return (
    <div>
      <button onClick={onView} className="press flex w-full items-center gap-3 px-4 py-3.5 text-right hover:bg-[var(--fill)]">
        {mine ? <Piece c={mine.color} size={36} /> : <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--fill)] text-lg">♞</span>}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px] font-semibold">{st?.title || t.name}</span>
          <span className={cn("block truncate text-[14px]", st?.error ? "text-red-500" : "text-[var(--muted)]")}>{sub}</span>
        </span>
        <ChevronLeft className="size-5 shrink-0 text-[var(--muted)]" />
      </button>
      {friends.map(([f, p]) => (
        <button key={f} onClick={() => onDetail(p!, f)} className="press flex w-full items-center gap-3 py-2.5 pe-4 ps-[3.75rem] text-right text-[14px] hover:bg-[var(--fill)]">
          <Piece c={p!.color} size={22} />
          <span className="min-w-0 flex-1 truncate">
            <b className="font-semibold">{p!.me.name}</b> <span className="text-[var(--muted)]">נגד</span> {p!.opp.name}
          </span>
        </button>
      ))}
    </div>
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
  const add = () => {
    const id = link.match(/tnr(\d+)/i)?.[1] ?? link.match(/^\s*(\d+)\s*$/)?.[1];
    if (!id) return toast.error("לא מצאתי מספר טורניר בקישור");
    addTour(id);
    setLink("");
  };
  return (
    <Sheet title="הוספת טורניר" onClose={onClose}>
      <Button kind="accent" onClick={search} disabled={busy} className="w-full">
        <Search className="size-4" strokeWidth={2.5} /> {busy ? "מחפש" : "חפש את הטורנירים שלי"}
      </Button>
      {res && !res.length && <Muted>לא נמצאו טורנירים עבור {s.me}</Muted>}
      {res && res.length > 0 && (
        <div className="divide-y divide-[var(--hair)] overflow-hidden rounded-[20px] bg-[var(--fill)]">
          {res.slice(0, 15).map((r) => {
            const on = s.tours.some((t) => t.id === r.id);
            return (
              <div key={r.id + r.snr} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-semibold">{r.tournament}</div>
                  <div className="truncate text-[13px] text-[var(--muted)]">{r.player}</div>
                </div>
                <button
                  disabled={on}
                  onClick={() => addTour(r.id, r.tournament)}
                  className="press rounded-full bg-[var(--tint)] px-4 py-1.5 text-sm font-semibold text-[var(--accent)] disabled:bg-transparent disabled:text-[var(--muted)]"
                >
                  {on ? "במעקב" : "עקוב"}
                </button>
              </div>
            );
          })}
        </div>
      )}
      <div className="space-y-2 pt-2">
        <label htmlFor="cr-link" className="block text-[13px] font-semibold text-[var(--muted)]">
          או הדבק קישור מ-chess-results
        </label>
        <div className="flex gap-2">
          <input id="cr-link" className={inputCls} dir="ltr" value={link} onChange={(e) => setLink(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="chess-results.com/tnr123456.aspx" />
          <Button onClick={add}>הוסף</Button>
        </div>
      </div>
    </Sheet>
  );
}

function SettingsSheet({ s, save, onRemove, onClose }: { s: Settings; save: (x: Settings) => void; onRemove: (id: string) => void; onClose: () => void }) {
  return (
    <Sheet title="הגדרות" onClose={onClose}>
      <div className="space-y-2">
        <label htmlFor="me" className="block text-[13px] font-semibold text-[var(--muted)]">
          השם שלי, כמו שהוא כתוב ב-chess-results
        </label>
        <input id="me" className={inputCls} value={s.me} onChange={(e) => save({ ...s, me: e.target.value, seen: {} })} />
      </div>
      <div className="space-y-2">
        <label htmlFor="friends" className="block text-[13px] font-semibold text-[var(--muted)]">
          חברים, מופרדים בפסיק
        </label>
        <input
          id="friends"
          className={inputCls}
          defaultValue={s.friends.join(", ")}
          placeholder="Cohen Dan, Levi Noa"
          onBlur={(e) => save({ ...s, friends: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="every" className="block text-[13px] font-semibold text-[var(--muted)]">
          בדיקה כל כמה דקות
        </label>
        <input id="every" className={inputCls} type="number" min={1} value={s.every} onChange={(e) => save({ ...s, every: Number(e.target.value) || 2 })} />
      </div>
      {s.tours.length > 0 && (
        <div className="space-y-2 pt-2">
          <p className="text-[13px] font-semibold text-[var(--muted)]">טורנירים במעקב</p>
          <div className="divide-y divide-[var(--hair)] overflow-hidden rounded-[20px] bg-[var(--fill)]">
            {s.tours.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1 truncate text-[15px]">{t.name}</span>
                <button aria-label="הסר" onClick={() => onRemove(t.id)} className="press rounded-full p-2 text-red-500 hover:bg-[var(--fill)]">
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Sheet>
  );
}

function usePage(id: string, art: "0" | "1" | "2" | "9", rd?: number, snr?: number) {
  const [d, setD] = useState<Awaited<ReturnType<typeof getPage>> | null>(null);
  const [err, setErr] = useState<string>();
  useEffect(() => {
    if ((art === "9" && !snr) || isDemo()) return;
    setD(null);
    setErr(undefined);
    getPage({ data: { id, art, rd, snr } }).then(setD, (e) => setErr(String(e)));
  }, [id, art, rd, snr]);
  return { d, err };
}

function Loading({ d, err }: { d: unknown; err?: string }) {
  if (err) return <p className="text-[15px] text-red-500">לא הצלחתי לטעון את הדף. נסה שוב בעוד רגע.</p>;
  if (d) return null;
  return (
    <div className="space-y-2" aria-label="טוען">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-10 animate-pulse rounded-[14px] bg-[var(--fill)]" />
      ))}
    </div>
  );
}

function DetailSheet({ id, p, who, s, onClose }: { id: string; p: P; who: string; s: Settings; onClose: () => void }) {
  const [tab, setTab] = useState<"opp" | "me">("opp");
  const side = tab === "opp" ? p.opp : p.me;
  const snr = Number(side.no) || snrOf(side.href);
  const { d, err } = usePage(id, "9", undefined, snr);
  const meLabel = who === "me" ? "אני" : p.me.name;
  const players = [
    { x: p.me, c: p.color, l: meLabel },
    { x: p.opp, c: (p.color === "w" ? "b" : "w") as "w" | "b", l: "יריב" },
  ];
  return (
    <Sheet title={`סיבוב ${p.round}`} onClose={onClose} tall>
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 rounded-[24px] bg-[var(--fill)] px-3 py-5">
        {players.map(({ x, c, l }, i) => (
          <div key={i} className={cn("flex min-w-0 flex-col items-center gap-1.5 text-center", i === 1 && "order-3")}>
            <Piece c={c} size={52} />
            <span className="mt-1 text-xs text-[var(--muted)]">
              {l}, {colorHe(c)}
            </span>
            <span className="w-full truncate text-[16px] font-semibold">{x.name}</span>
            <span className="text-[13px] tabular-nums text-[var(--muted)]">{[x.rating, x.pts && `${x.pts} נק׳`].filter(Boolean).join(", ") || " "}</span>
          </div>
        ))}
        <span className="order-2 self-center pt-2 text-sm font-semibold text-[var(--muted)]">נגד</span>
      </div>
      <Muted>{[p.board && `לוח ${p.board}`, fmtWhen(p.when), p.result && `תוצאה ${p.result}`].filter(Boolean).join(". ")}</Muted>
      <Segmented value={tab} onChange={setTab} items={[["opp", "המשחקים של היריב"], ["me", who === "me" ? "המשחקים שלי" : p.me.name]]} />
      {snr ? isDemo() ? <Muted>בתצוגה לדוגמה אין חיבור ל-chess-results.</Muted> : <Loading d={d} err={err} /> : <Muted>אין דף שחקן בטורניר הזה</Muted>}
      {d && <Tables tables={d.tables} s={s} />}
      {snr && (
        <a className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-[var(--accent)]" href={CR(id, `art=9&snr=${snr}`)} target="_blank" rel="noreferrer">
          פתח ב-chess-results <ExternalLink className="size-4" />
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
    <Sheet title={d?.title || "טורניר"} onClose={onClose} tall>
      <Segmented value={art} onChange={setArt} items={items} />
      {(art === "2" || art === "1") && rounds.length > 0 && (
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          {[...rounds].reverse().map((r) => (
            <button
              key={r}
              onClick={() => setRd(r)}
              className={cn(
                "press h-9 shrink-0 rounded-full px-4 text-sm font-semibold tabular-nums",
                (rd ?? rounds[0]) === r ? "bg-[var(--ink)] text-[var(--bg)]" : "bg-[var(--fill)] text-[var(--muted)]",
              )}
            >
              סיבוב {r}
            </button>
          ))}
        </div>
      )}
      {d?.when && art === "2" && <Muted>{fmtWhen(d.when)}</Muted>}
      {isDemo() ? <Muted>בתצוגה לדוגמה אין חיבור ל-chess-results.</Muted> : <Loading d={d} err={err} />}
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
      <a className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-[var(--accent)]" href={CR(id, "art=0")} target="_blank" rel="noreferrer">
        פתח ב-chess-results <ExternalLink className="size-4" />
      </a>
    </Sheet>
  );
}

function Tables({ tables, s, onPlayer }: { tables: Table[]; s: Settings; onPlayer?: (snr: number) => void }) {
  if (!tables.length) return <Muted>עוד לא פורסם</Muted>;
  return (
    <div className="space-y-4">
      {tables.map((t, ti) => (
        <div key={ti} className="overflow-x-auto rounded-[20px] bg-[var(--fill)]" dir="ltr">
          <table className="w-full text-[14px]">
            <tbody>
              {t.rows.map((r, ri) => {
                const line = r.map((c) => c.text).join(" ");
                const me = ri > 0 && matchName(line, s.me);
                const friend = ri > 0 && s.friends.some((f) => matchName(line, f));
                return (
                  <tr
                    key={ri}
                    className={cn(
                      ri === 0 ? "text-[12px] font-semibold text-[var(--muted)]" : "border-t border-[var(--hair)]",
                      me && "bg-[var(--tint)] font-semibold",
                      friend && "bg-[var(--fill)] font-semibold",
                    )}
                  >
                    {r.map((c, ci) => {
                      const n = snrOf(c.href);
                      return (
                        <td key={ci} className="whitespace-nowrap px-3 py-2.5 tabular-nums">
                          {c.color && <span className={cn("me-1.5 inline-block size-2.5 rounded-full align-middle ring-1 ring-[var(--hair)]", c.color === "w" ? "bg-[#f7f7f5]" : "bg-[#16181b]")} />}
                          {n && onPlayer && /art=9/.test(c.href!) ? (
                            <button className="font-medium text-[var(--accent)]" onClick={() => onPlayer(n)}>
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
