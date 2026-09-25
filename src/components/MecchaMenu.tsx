// מסכי הפתיחה, כמו במשחק המקורי (לפי צילומי המסך):
// 1. מסך טעינה — תמונת המפתח ופס התקדמות בעיצוב שלה
// 2. תפריט ראשי — קיר לבנים צבעוני, Create Server / Find Server / Settings / Quit game, שורת שפות, MAPS
// 3. Create Server / Find Server — שם שחקן, שם שרת, סיסמה, תגיות אזור ושרת, תוצאות חיפוש, Downloaded Mods
// 4. Settings — לשוניות User Management / Friends List / Sound / Graphics / General Game Settings / FAQ
import { useEffect, useRef, useState } from "react";
import type { Engine } from "@/game/meccha/engine";
import { KEY_ART, MENU_BG } from "@/game/meccha/menuart";
import { THUMBS } from "@/game/meccha/thumbs";
import { t, getLang, setLang, onLang } from "@/game/meccha/i18n";
import { setVolume, setBgmVolume, setSeVolume, setMuted as setSoundMuted } from "@/lib/sound";

const GREEN = "#3ddc4a";
const U = (n: number) => `calc(var(--u) * ${n})`;

function useLangTick() {
  const [, f] = useState(0);
  useEffect(() => onLang(() => f((x) => x + 1)), []);
}

/** קופסת 16:9 שממלאת את המסך (cover); כל המידות ביחידות של 1080p כמו בצילום */
function Stage({ bg, dim = 0, children }: { bg: string; dim?: number; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 overflow-hidden bg-black select-none">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: "max(100vw, 177.78vh)", height: "max(56.25vw, 100vh)", ["--u" as string]: "calc(max(56.25vw, 100vh) / 1080)", backgroundImage: `url(${bg})`, backgroundSize: "100% 100%" }}>
        {dim > 0 && <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${dim})` }} />}
        {children}
      </div>
    </div>
  );
}

// ---------- 1. מסך טעינה ----------
export function Splash({ ready, onDone }: { ready: Promise<unknown>; onDone: () => void }) {
  const [p, setP] = useState(0);
  const done = useRef(false);
  useEffect(() => {
    let ok = false;
    ready.then(() => { ok = true; }, () => { ok = true; });
    const t0 = performance.now();
    let raf = 0;
    const tick = () => {
      const el = (performance.now() - t0) / 1000;
      // מתקדם מהר בכוונה; נעצר ב־92% עד שהכל נטען; לכל היותר 10 שניות
      const target = ok ? 100 : Math.min(92, 100 * (1 - Math.exp(-el / 1.3)));
      setP((v) => Math.max(v, v + (target - v) * (ok ? 0.35 : 0.12)));
      if ((ok && el > 2.2) || el > 10) {
        setP(100);
        if (!done.current) { done.current = true; window.setTimeout(onDone, 250); }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready, onDone]);
  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none">
      <img src={KEY_ART} alt="" className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-60" />
      <img src={KEY_ART} alt="MECCHA CHAMELEON" className="absolute inset-0 w-full h-full object-contain" />
      <div className="absolute left-1/2 -translate-x-1/2 bottom-[7%] w-[min(760px,80vw)]">
        <div className="h-5 rounded-full border-[3px] border-white/90 bg-black/55 overflow-hidden shadow-[0_4px_18px_rgba(0,0,0,.6)]">
          <div className="h-full rounded-full transition-[width] duration-100"
            style={{ width: `${p}%`, backgroundImage: "linear-gradient(90deg,#ff3d7f,#ffb700,#7cf23a,#3ec7ff,#b04dff,#ff3d7f)", backgroundSize: "200% 100%", animation: "mcLoad 1.2s linear infinite" }} />
        </div>
        <div className="mt-2 text-center text-white font-bold tracking-wider text-[18px]" style={{ textShadow: "0 2px 6px #000" }}>Now Loading… {Math.floor(p)}%</div>
      </div>
      <style>{`@keyframes mcLoad{from{background-position:0 0}to{background-position:200% 0}}`}</style>
    </div>
  );
}

// ---------- כפתור בסגנון המשחק: קופסה כהה עם מסגרת ירוקה ----------
function GBtn({ x, y, w, h, fs = 32, children, onClick, active, dim }: { x: number; y: number; w: number; h: number; fs?: number; children: React.ReactNode; onClick?: () => void; active?: boolean; dim?: boolean }) {
  return (
    <button onClick={onClick} className={`group absolute grid place-items-center font-bold transition-colors ${dim ? "opacity-45 cursor-default" : ""}`}
      style={{ left: U(x), top: U(y), width: U(w), height: U(h), fontSize: U(fs), borderWidth: U(3), borderColor: GREEN, background: "linear-gradient(#2c2c2c,#121212)", color: active ? "#5dff5d" : "#fff", boxShadow: `inset 0 0 ${U(6)} rgba(0,0,0,.6)` }}>
      <span className="group-hover:text-[#5dff5d]">{children}</span>
    </button>
  );
}

const LANGS: [string, number, number, number, string | null][] = [
  // שם, x, y, רוחב, קוד שפה נתמך
  ["日本語", 145, 946, 115, null], ["English", 273, 946, 134, "en"], ["簡体中文", 421, 946, 145, null], ["繁體中文", 580, 946, 145, null],
  ["Português (Brasil)", 739, 946, 286, null], ["Español", 1039, 946, 138, null], ["Français", 1191, 946, 150, null],
  ["한국어", 145, 1021, 102, null], ["عربي", 259, 1021, 76, null], ["Italiano", 348, 1021, 138, null], ["Deutsch", 500, 1021, 145, null], ["Россия", 658, 1021, 128, null],
  ["עברית", 800, 1021, 112, "he"],
];

// ---------- 2. תפריט ראשי ----------
export function MainMenu({ onCreate, onFind, onSettings, onQuit, onMaps, onCredits }: { onCreate: () => void; onFind: () => void; onSettings: () => void; onQuit: () => void; onMaps: () => void; onCredits: () => void }) {
  useLangTick();
  const lang = getLang();
  return (
    <Stage bg={MENU_BG}>
      <GBtn x={147} y={554} w={293} h={62} onClick={onCreate}>{t("Create Server")}</GBtn>
      <GBtn x={147} y={649} w={293} h={62} onClick={onFind}>{t("Find Server")}</GBtn>
      <GBtn x={147} y={743} w={293} h={62} onClick={onSettings}>{t("Settings")}</GBtn>
      <GBtn x={147} y={838} w={293} h={62} onClick={onQuit}>{t("Quit game")}</GBtn>
      {LANGS.map(([n, x, y, w, code]) => (
        <GBtn key={n} x={x} y={y} w={w} h={55} fs={29} active={code === lang} dim={!code} onClick={code ? () => setLang(code as "en" | "he") : undefined}>{n}</GBtn>
      ))}
      {/* MAPS */}
      <button onClick={onMaps} className="absolute grid place-items-center hover:brightness-125" style={{ left: U(1493), top: U(783), width: U(148), height: U(133), background: "#111", borderRadius: U(4) }}>
        <svg viewBox="0 0 64 44" style={{ width: U(110) }} aria-hidden>
          <path d="M2 6 L20 2 L44 8 L62 4 L62 40 L44 44 L20 38 L2 42 Z" fill={GREEN} />
          <path d="M20 2 L20 38 M44 8 L44 44" stroke="#0a3a10" strokeWidth="3" />
          <path d="M26 30 L34 18 L40 30 Z" fill="#0a3a10" /><circle cx="52" cy="14" r="3" fill="#0a3a10" />
        </svg>
        <span className="font-black leading-none" style={{ color: GREEN, fontSize: U(30), marginTop: U(-8) }}>MAPS</span>
      </button>
      {/* קרדיטים */}
      <button onClick={onCredits} className="absolute grid place-items-center font-bold text-white hover:text-[#5dff5d]"
        style={{ left: U(1478), top: U(940), width: U(398), height: U(121), fontSize: U(38), background: "linear-gradient(#2c2c2c,#121212)", border: `${U(3)} solid ${GREEN}` }}>
        {t("Credits")}
      </button>
    </Stage>
  );
}

// ---------- 3. Create Server / Find Server ----------
const REGIONS = ["Not Specified", "Asia", "Africa", "Oceania", "Europe", "Middle East", "North America", "South America"];
const SERVER_TAGS = ["Japan", "South Korea", "China", "Taiwan", "Hong Kong", "India", "United States", "Canada", "Mexico", "Brazil", "Argentina", "United Kingdom",
  "Italy", "Netherlands", "Sweden", "Spain", "Germany", "Norway", "Finland", "France", "Poland", "Russia", "United Arab Emirates", "Saudi Arabia", "South Africa",
  "Turkey", "Antarctica", "Arctic Continent", "Casual Fun", "Everyone Welcome", "Painting Masters Only", "Double Mode Main", "Infection Mode Main", "Basic Mode Main", "Beginners Welcome"];

export interface ServerForm { name: string; server: string; password: string; region: string; tags: string[] }
/** שם השרת הוא גם הכתובת שלו (כמו במשחק: מחפשים שרת לפי שם + סיסמה) */
export const serverKey = (n: string) => n.trim().toLowerCase().replace(/[^a-z0-9א-ת]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

function Field({ label, value, max, onChange, type }: { label: string; value: string; max: number; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block" style={{ marginBottom: U(26) }}>
      <div className="font-bold text-white" style={{ fontSize: U(30) }}>{t(label)}</div>
      <div className="relative" style={{ marginTop: U(8) }}>
        <input value={value} type={type} maxLength={max} onChange={(e) => onChange(e.target.value)} className="w-full text-center text-white outline-none bg-white/15 focus:bg-white/25"
          style={{ height: U(58), fontSize: U(34) }} />
        <span className="absolute font-bold" style={{ right: U(8), top: U(-30), fontSize: U(20), color: GREEN }}>{value.length}/{max}</span>
      </div>
    </label>
  );
}
function Chip({ n, on, onClick }: { n: string; on: boolean; onClick: () => void }) {
  return <button onClick={onClick} className="text-white hover:brightness-125" style={{ fontSize: U(19), padding: `${U(5)} ${U(12)}`, margin: U(3), background: on ? "#23b34a" : "#2c3a33", border: `${U(1)} solid rgba(255,255,255,.08)` }}>{t(n)}</button>;
}

export function ServerScreen({ mode, form, setForm, results, onPrimary, onPublic, onOffline, onBack }: {
  mode: "create" | "find"; form: ServerForm; setForm: (f: ServerForm) => void;
  results: { id: string; name: string; players: string; tags: string[]; join: () => void }[];
  onPrimary: () => void; onPublic: () => void; onOffline: () => void; onBack: () => void;
}) {
  useLangTick();
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onBack(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onBack]);
  const tog = (tag: string) => setForm({ ...form, tags: form.tags.includes(tag) ? form.tags.filter((x) => x !== tag) : [...form.tags, tag] });
  return (
    <Stage bg={MENU_BG} dim={0.25}>
      {/* שמאל: שדות */}
      <div className="absolute" style={{ left: U(90), top: U(90), width: U(560) }}>
        <Field label="Enter the name to display in-game" value={form.name} max={30} onChange={(v) => setForm({ ...form, name: v })} />
        <Field label="Enter Server Name" value={form.server} max={25} onChange={(v) => setForm({ ...form, server: v })} />
        <Field label="Enter Password" value={form.password} max={25} onChange={(v) => setForm({ ...form, password: v })} />
      </div>
      <div className="absolute bg-white" style={{ left: U(680), top: U(60), width: U(4), height: U(690) }} />
      {/* אמצע: תגיות */}
      <div className="absolute" style={{ left: U(700), top: U(64), width: U(560) }}>
        <div className="font-bold text-white" style={{ fontSize: U(26), marginBottom: U(4) }}>{t("Region Tag")}</div>
        <div className="flex flex-wrap">{REGIONS.map((r) => <Chip key={r} n={r} on={form.region === r} onClick={() => setForm({ ...form, region: r })} />)}</div>
        <div className="font-bold text-white" style={{ fontSize: U(26), margin: `${U(10)} 0 ${U(4)}` }}>{t("Server Tag")}</div>
        <div className="flex flex-wrap">{SERVER_TAGS.map((r) => <Chip key={r} n={r} on={form.tags.includes(r)} onClick={() => tog(r)} />)}</div>
      </div>
      {/* ימין: תוצאות */}
      <div className="absolute" style={{ left: U(1290), top: U(64), width: U(560), height: U(690) }}>
        <div className="font-bold text-white" style={{ fontSize: U(30), marginBottom: U(8) }}>{t(mode === "find" ? "Search Results" : "Your Server")}</div>
        <div className="overflow-auto" style={{ height: U(640) }}>
          {results.map((r) => (
            <div key={r.id} style={{ marginBottom: U(12), padding: U(12), background: "linear-gradient(90deg,#ff2d6f,#ff8a1f 30%,#ffd21f 55%,#6fe23a 80%,#22c24a)" }}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-white truncate" style={{ fontSize: U(34), textShadow: "0 2px 3px rgba(0,0,0,.4)" }}>{r.name}</span>
                <span className="flex items-center" style={{ gap: U(14) }}>
                  <span className="font-bold text-white" style={{ fontSize: U(30) }}>{r.players}</span>
                  <button onClick={r.join} className="bg-black text-white font-bold hover:text-[#5dff5d]" style={{ fontSize: U(32), padding: `${U(2)} ${U(16)}` }}>{t("Join")}</button>
                </span>
              </div>
              <div className="flex flex-wrap" style={{ marginTop: U(6) }}>
                {r.tags.map((tg) => <span key={tg} className="text-white" style={{ fontSize: U(18), padding: `${U(3)} ${U(10)}`, margin: U(3), background: tg.includes("Mode") || tg.includes("Welcome") || tg.includes("Fun") ? "#1fa84a" : "#1b8fc4" }}>{t(tg)}</span>)}
              </div>
            </div>
          ))}
          {!results.length && <div className="text-white/70" style={{ fontSize: U(24) }}>{t(mode === "find" ? "No servers found" : "Enter a server name, choose tags and create it")}</div>}
        </div>
      </div>
      {/* פס פעולה ראשי */}
      <button onClick={onPrimary} className="absolute font-bold text-white hover:text-[#5dff5d]" style={{ left: U(90), top: U(770), width: U(1760), height: U(62), fontSize: U(34), background: "linear-gradient(#1f1f1f,#0d0d0d)", border: `${U(3)} solid ${GREEN}` }}>
        {t(mode === "create" ? "Create Server" : "Search Server")}
      </button>
      {mode === "find" && (
        <button onClick={onPublic} className="absolute font-bold hover:brightness-125" style={{ left: U(90), top: U(840), width: U(1760), height: U(52), fontSize: U(30), color: "#5dff5d", background: "#101010", border: `${U(2)} solid #555` }}>
          {t("Search Public Servers")}
        </button>
      )}
      {/* Downloaded Mods */}
      <div className="absolute" style={{ left: U(90), top: U(mode === "find" ? 905 : 850), width: U(1760), height: U(mode === "find" ? 120 : 175), background: "linear-gradient(90deg,#b0158a,#e0158a)" }}>
        <div className="font-bold text-white" style={{ fontSize: U(26), padding: U(10) }}>{t("Downloaded Mods")}</div>
        <div className="absolute text-center text-white" style={{ left: 0, right: 0, bottom: U(8), fontSize: U(20) }}>
          <span className="inline-block bg-[#ff2fa8]" style={{ padding: `${U(3)} ${U(40)}` }}>{t("Refresh Mod Download Status")}</span>
        </div>
      </div>
      {mode === "create" && (
        <button onClick={onOffline} className="absolute text-white/80 hover:text-white underline" style={{ right: U(70), bottom: U(14), fontSize: U(22) }}>{t("Play Offline (with Bots)")}</button>
      )}
      <button onClick={onBack} className="absolute flex items-center text-white" style={{ left: U(40), bottom: U(14), gap: U(8), fontSize: U(24) }}>
        <span className="bg-white text-black font-bold rounded" style={{ fontSize: U(16), padding: `${U(1)} ${U(6)}` }}>Esc</span>{t("Back")}
      </button>
    </Stage>
  );
}

// ---------- גלריית MAPS ----------
export function MapsScreen({ maps, onBack }: { maps: { id: string; name: string }[]; onBack: () => void }) {
  useLangTick();
  return (
    <Stage bg={MENU_BG} dim={0.55}>
      <div className="absolute overflow-auto grid grid-cols-4" style={{ left: U(90), top: U(70), right: U(90), bottom: U(80), gap: U(18) }}>
        {maps.map((m) => (
          <div key={m.id} className="bg-black/60" style={{ border: `${U(3)} solid ${GREEN}` }}>
            <div className="bg-[#222] aspect-[16/10] grid place-items-center overflow-hidden">
              {THUMBS[m.id] ? <img src={THUMBS[m.id]} alt="" className="w-full h-full object-cover" /> : <span className="font-black" style={{ color: GREEN, fontSize: U(80) }}>?</span>}
            </div>
            <div className="font-bold text-white text-center" style={{ fontSize: U(26), padding: U(8) }}>{t(m.name)}</div>
          </div>
        ))}
      </div>
      <button onClick={onBack} className="absolute flex items-center text-white" style={{ left: U(40), bottom: U(20), gap: U(8), fontSize: U(24) }}>
        <span className="bg-white text-black font-bold rounded" style={{ fontSize: U(16), padding: `${U(1)} ${U(6)}` }}>Esc</span>{t("Back")}
      </button>
    </Stage>
  );
}

// ---------- 4. Settings ----------
const LEVELS = ["Off", "Low", "Medium", "High", "Highest"];
const RES = [[0, "Native"], [720, "1280x720"], [900, "1600x900"], [1080, "1920x1080"], [1440, "2560x1440"], [2160, "3840x2160"]] as const;
type Gfx = Engine["gfx"];
export const DEFAULT_GFX: Gfx = { res: 0, shadow: 4, texture: 4, gi: 4, effects: 4, aa: 3, shading: 4, reflection: 4, motionBlur: 0, fpsLimit: 60, fov: 70 };
export function loadGfx(): Gfx { try { return { ...DEFAULT_GFX, ...JSON.parse(localStorage.getItem("meccha_gfx") || "{}") }; } catch { return { ...DEFAULT_GFX }; } }
const num = (k: string, d: number) => { try { const v = localStorage.getItem(k); return v === null ? d : Number(v); } catch { return d; } };
const save = (k: string, v: number | string) => { try { localStorage.setItem(k, String(v)); } catch { /* ignore */ } };
/** מחילים את ההגדרות השמורות (בפתיחת המשחק) */
export function applySavedSettings(engine: Engine | null) {
  setVolume(num("meccha_vol", 1));
  setBgmVolume(num("meccha_bgm", 0.8));
  setSeVolume(num("meccha_se", 1));
  if (engine) { engine.setSensitivity(num("meccha_sens", 1)); engine.setGraphics(loadGfx()); }
}

function SRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between" style={{ height: U(62), padding: `0 ${U(26)}`, marginBottom: U(6), background: "linear-gradient(#141414,#0b0b0b)", borderTop: `${U(2)} solid rgba(61,220,74,.5)`, borderBottom: `${U(2)} solid rgba(61,220,74,.5)` }}>
      <span className="font-bold text-white" style={{ fontSize: U(32) }}>{t(label)}</span>
      {children}
    </div>
  );
}
function SChoice({ label, value, options, onChange }: { label: string; value: number; options: string[]; onChange: (i: number) => void }) {
  const arrow = "grid place-items-center text-white bg-[#1a1a1a] border border-white/20 hover:bg-white/15";
  return (
    <SRow label={label}>
      <div className="flex items-center" style={{ gap: U(10), width: U(560) }}>
        <button className={arrow} style={{ width: U(42), height: U(46), fontSize: U(30) }} onClick={() => onChange((value + options.length - 1) % options.length)}>‹</button>
        <div className="flex-1 text-center">
          <div className="font-bold text-white" style={{ fontSize: U(32) }}>{t(options[value] ?? "")}</div>
          <div className="flex" style={{ gap: U(4), marginTop: U(2) }}>{options.map((_, i) => <span key={i} className="flex-1" style={{ height: U(4), background: i === value ? "#fff" : "rgba(255,255,255,.25)" }} />)}</div>
        </div>
        <button className={arrow} style={{ width: U(42), height: U(46), fontSize: U(30) }} onClick={() => onChange((value + 1) % options.length)}>›</button>
      </div>
    </SRow>
  );
}
function SSlider({ label, value, min, max, step, text, onChange }: { label: string; value: number; min: number; max: number; step: number; text: string; onChange: (v: number) => void }) {
  return (
    <SRow label={label}>
      <div className="flex items-center" style={{ gap: U(30), width: U(700) }}>
        <span className="font-bold text-white text-right" style={{ fontSize: U(30), width: U(120) }}>{text}</span>
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="flex-1 accent-white" />
      </div>
    </SRow>
  );
}

const TABS = ["User Management", "Friends List", "Sound", "Graphics", "General Game Settings", "FAQ"] as const;

export function SettingsScreen({ engine, inGame, muted, onToggleMute, onClose, onReturnTitle, players }: {
  engine: Engine | null; inGame: boolean; muted: boolean; onToggleMute: () => void; onClose: () => void; onReturnTitle?: () => void;
  players?: { id: string; name: string; me: boolean }[];
}) {
  useLangTick();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Graphics");
  const [g, setG] = useState<Gfx>(loadGfx);
  const [vol, setVol] = useState(() => num("meccha_vol", 1));
  const [bgm, setBgm] = useState(() => num("meccha_bgm", 0.8));
  const [se, setSe] = useState(() => num("meccha_se", 1));
  const [sens, setSens] = useState(() => num("meccha_sens", 1));
  const [fullscreen, setFs] = useState(() => (typeof document !== "undefined" && !!document.fullscreenElement ? 2 : 0));
  const upd = (p: Partial<Gfx>) => { const n = { ...g, ...p }; setG(n); save("meccha_gfx", JSON.stringify(n)); engine?.setGraphics(p); };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
      const i = TABS.indexOf(tab);
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.code === "KeyQ") { e.stopPropagation(); setTab(TABS[(i + TABS.length - 1) % TABS.length]); }
      if (e.code === "KeyE") { e.stopPropagation(); setTab(TABS[(i + 1) % TABS.length]); }
    };
    window.addEventListener("keydown", k, true);
    return () => window.removeEventListener("keydown", k, true);
  }, [tab, onClose]);
  const resIdx = Math.max(0, RES.findIndex(([h]) => h === g.res));
  const body = (
    <>
      <div className="absolute flex flex-col" style={{ left: U(45), top: U(40), width: U(305), gap: U(14) }}>
        <span className="bg-white text-black font-bold rounded self-start" style={{ fontSize: U(18), padding: `${U(1)} ${U(7)}` }}>Q</span>
        {TABS.map((tb) => (
          <button key={tb} onClick={() => setTab(tb)} className="font-bold hover:text-[#5dff5d]"
            style={{ height: U(52), fontSize: U(tb.length > 16 ? 25 : 28), color: tab === tb ? "#5dff5d" : "#fff", background: "linear-gradient(#262626,#0f0f0f)", border: `${U(3)} solid ${GREEN}` }}>{t(tb)}</button>
        ))}
        <span className="bg-white text-black font-bold rounded self-start" style={{ fontSize: U(18), padding: `${U(1)} ${U(7)}` }}>E</span>
      </div>
      {inGame && onReturnTitle && (
        <button onClick={onReturnTitle} className="absolute font-bold hover:brightness-125" style={{ left: U(45), bottom: U(62), width: U(305), height: U(52), fontSize: U(28), color: "#5dff5d", background: "linear-gradient(#262626,#0f0f0f)", border: `${U(3)} solid ${GREEN}` }}>{t("Return to Title")}</button>
      )}
      <button onClick={onClose} className="absolute flex items-center text-white" style={{ left: U(48), bottom: U(14), gap: U(8), fontSize: U(24) }}>
        <span className="bg-white text-black font-bold rounded" style={{ fontSize: U(16), padding: `${U(1)} ${U(6)}` }}>Esc</span>{t("Back")}
      </button>
      <div className="absolute overflow-auto" style={{ left: U(385), top: U(40), right: U(60), bottom: U(40) }}>
        {tab === "Graphics" && (
          <>
            <SChoice label="Resolution" value={resIdx} options={RES.map(([, n]) => n)} onChange={(i) => setG({ ...g, res: RES[i][0] })} />
            <SChoice label="Screen mode" value={fullscreen} options={["Windowed", "Window full screen", "Full screen"]} onChange={setFs} />
            <button onClick={() => { upd({ res: g.res }); if (fullscreen > 0) document.documentElement.requestFullscreen?.().catch(() => {}); else if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); }}
              className="w-full font-bold text-white hover:text-[#5dff5d]" style={{ height: U(52), fontSize: U(30), marginBottom: U(6), background: "#101010", border: `${U(3)} solid ${GREEN}` }}>{t("Apply Resolution/Screen Mode")}</button>
            <SSlider label="Motion Blur" value={g.motionBlur} min={0} max={100} step={5} text={`${g.motionBlur} %`} onChange={(v) => upd({ motionBlur: v })} />
            <SSlider label="Frame Rate Limit" value={g.fpsLimit || 241} min={30} max={241} step={1} text={g.fpsLimit ? `${g.fpsLimit}fps` : t("Unlimited")} onChange={(v) => upd({ fpsLimit: v > 240 ? 0 : v })} />
            <SChoice label="VSync" value={g.fpsLimit ? 1 : 0} options={["OFF", "ON"]} onChange={(i) => upd({ fpsLimit: i ? 60 : 0 })} />
            <SChoice label="Shadow quality" value={g.shadow} options={LEVELS} onChange={(i) => upd({ shadow: i })} />
            <SChoice label="Texture quality" value={g.texture} options={LEVELS} onChange={(i) => upd({ texture: i })} />
            <SChoice label="Global Illumination" value={g.gi} options={LEVELS} onChange={(i) => upd({ gi: i })} />
            <SChoice label="Effects Quality" value={g.effects} options={LEVELS} onChange={(i) => upd({ effects: i })} />
            <SChoice label="Anti-aliasing" value={g.aa} options={LEVELS} onChange={(i) => upd({ aa: i })} />
            <SChoice label="Shading" value={g.shading} options={LEVELS} onChange={(i) => upd({ shading: i })} />
            <SChoice label="Reflection" value={g.reflection} options={LEVELS} onChange={(i) => upd({ reflection: i })} />
          </>
        )}
        {tab === "Sound" && (
          <>
            <SSlider label="Master Volume" value={vol} min={0} max={1} step={0.05} text={`${Math.round(vol * 100)} %`} onChange={(v) => { setVol(v); save("meccha_vol", v); setVolume(v); }} />
            <SSlider label="BGM Volume" value={bgm} min={0} max={1} step={0.05} text={`${Math.round(bgm * 100)} %`} onChange={(v) => { setBgm(v); save("meccha_bgm", v); setBgmVolume(v); }} />
            <SSlider label="Sound Effect Volume" value={se} min={0} max={1} step={0.05} text={`${Math.round(se * 100)} %`} onChange={(v) => { setSe(v); save("meccha_se", v); setSeVolume(v); }} />
            <SChoice label="Mute" value={muted ? 1 : 0} options={["OFF", "ON"]} onChange={() => { setSoundMuted(!muted); onToggleMute(); }} />
          </>
        )}
        {tab === "General Game Settings" && (
          <>
            <SSlider label="Mouse Sensitivity" value={sens} min={0.2} max={3} step={0.05} text={sens.toFixed(2)} onChange={(v) => { setSens(v); save("meccha_sens", v); engine?.setSensitivity(v); }} />
            <SSlider label="Field of View" value={g.fov} min={50} max={110} step={1} text={g.fov.toFixed(1)} onChange={(v) => upd({ fov: v })} />
            <SChoice label="Language" value={getLang() === "he" ? 1 : 0} options={["English", "עברית"]} onChange={(i) => setLang(i ? "he" : "en")} />
          </>
        )}
        {tab === "User Management" && (
          <>
            {(players ?? []).map((p) => <SRow key={p.id} label={p.name + (p.me ? ` ${t("(You)")}` : "")}><span className="text-white/60" style={{ fontSize: U(24) }}>{p.me ? "" : t("Player")}</span></SRow>)}
            {!players?.length && <div className="text-white/70" style={{ fontSize: U(26) }}>{t("Join a server to manage players.")}</div>}
          </>
        )}
        {tab === "Friends List" && <div className="text-white/70" style={{ fontSize: U(26) }}>{t("No friends online.")}</div>}
        {tab === "FAQ" && (
          <div className="text-white" style={{ fontSize: U(24), lineHeight: 1.5 }}>
            {[
              ["How do I become a hunter?", "Stand on the red HUNTER platform in the lobby when the game starts."],
              ["How do I start a game?", "The host stands in front of the PLAY canvas in the lobby and presses E."],
              ["How do I paint?", "Press F to open Paint Mode. Hold Space to use the 3D Eyedropper, right-drag to change the brush size."],
              ["How do I pose?", "Hold R to open the pose wheel and release on a pose."],
              ["How do clones work?", "Press Q to place a clone of yourself (up to two), X removes them."],
              ["Controls", "WASD move · Shift sprint / detach · Space jump & climb · Ctrl crouch · 1 taunt · 2 nameplates · 3 X-ray · 5 free camera · T chat · Tab ranking · Esc settings"],
            ].map(([q, a]) => <div key={q} style={{ marginBottom: U(14) }}><div className="font-bold" style={{ color: "#5dff5d" }}>{t(q)}</div><div>{t(a)}</div></div>)}
          </div>
        )}
      </div>
    </>
  );
  if (inGame) return <div className="fixed inset-0 z-50 overflow-hidden" style={{ background: "rgba(0,0,0,.35)" }}><div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: "min(100vw, 177.78vh)", height: "min(56.25vw, 100vh)", ["--u" as string]: "calc(min(56.25vw, 100vh) / 1080)" }}>{body}</div></div>;
  return <Stage bg={MENU_BG} dim={0.35}>{body}</Stage>;
}

// ---------- קרדיטים ----------
export function CreditsScreen({ onBack }: { onBack: () => void }) {
  useLangTick();
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onBack(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onBack]);
  return (
    <Stage bg={MENU_BG} dim={0.6}>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center" style={{ gap: U(18) }}>
        <div className="font-bold" style={{ fontSize: U(40), color: "#5dff5d" }}>{t("Credits")}</div>
        <div style={{ fontSize: U(30), opacity: 0.8 }}>{t("Created by")}</div>
        <div className="font-black" style={{ fontSize: U(96), textShadow: "0 4px 14px rgba(0,0,0,.7)", background: "linear-gradient(90deg,#ff3d7f,#ffb700,#7cf23a,#3ec7ff,#b04dff)", WebkitBackgroundClip: "text", color: "transparent" }}>Tom Kodner</div>
      </div>
      <button onClick={onBack} className="absolute flex items-center text-white" style={{ left: U(40), bottom: U(20), gap: U(8), fontSize: U(24) }}>
        <span className="bg-white text-black font-bold rounded" style={{ fontSize: U(16), padding: `${U(1)} ${U(6)}` }}>Esc</span>{t("Back")}
      </button>
    </Stage>
  );
}
