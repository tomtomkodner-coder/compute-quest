import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Volume2, VolumeX, Home, Copy, X, Pipette, Send, Settings as Gear, Search } from "lucide-react";
import type { Engine, HudState, Settings } from "@/game/meccha/engine";
import type { PoseId, SizeId, BodyType } from "@/game/meccha/character";
import type { Net } from "@/game/meccha/net";
import { setMuted as setSoundMuted, setVolume as setSoundVolume, sfxClick } from "@/lib/sound";
import { t, getLang, setLang, onLang, isRtl, type Lang } from "@/game/meccha/i18n";

/** מרנדר מחדש כשמחליפים שפה */
function useLang() {
  const [, force] = useState(0);
  useEffect(() => onLang(() => force((x) => x + 1)), []);
  return getLang();
}

function LangToggle({ dark }: { dark?: boolean }) {
  const l = useLang();
  const b = (v: Lang, n: string) => (
    <button key={v} onClick={() => setLang(v)} className={`px-2.5 py-1 rounded-lg text-xs font-black ${l === v ? (dark ? "bg-white text-black" : "bg-black text-white") : dark ? "text-white/80" : "text-black/70"}`}>{n}</button>
  );
  return <div className={`inline-flex gap-1 rounded-xl p-1 ${dark ? "bg-black/40" : "bg-black/10"}`} aria-label="Language">{b("en", "English")}{b("he", "עברית")}</div>;
}

// מחרוזות הממשק לקוחות מהגרסה האנגלית של המשחק המקורי (בלי תרגומים מומצאים)
const FONT = `"M PLUS Rounded 1c", "Nunito", system-ui, sans-serif`;
const SERIF = `"Noto Serif", "Times New Roman", serif`;
const OUTLINE = "0 2px 0 #000, 0 -1px 0 #000, 1px 0 0 #000, -1px 0 0 #000, 0 0 6px rgba(0,0,0,.6)";
const PLAYER_COLORS = ["#ff006e", "#3a86ff", "#ffbe0b", "#8338ec", "#fb5607", "#06d6a0", "#ef476f", "#118ab2"];
const MAP_LIST = [
  { id: "mansion", name: "Hide-and-Seek Mansion" },
  { id: "country", name: "Indoor Country" },
  { id: "sewer", name: "Sewer" },
  { id: "backrooms", name: "Backrooms" },
  { id: "penguin", name: "Penguin Hotel" },
  { id: "sugarland", name: "Sugarland" },
  { id: "osaka", name: "Osaka" },
  { id: "egypt", name: "Egypt" },
  { id: "deathburger", name: "Death Burger" },
  { id: "greece", name: "Greece" },
  { id: "deepsea", name: "Deep Sea" },
  { id: "mall", name: "Shopping Mall" },
  { id: "kyoto", name: "Kyoto" },
  { id: "museum", name: "Art Museum" },
];
const MODES: { id: Settings["mode"]; name: string; desc: string }[] = [
  { id: "normal", name: "Basic", desc: "Players split into two teams: hunters and runners.\nHide until the end to win" },
  { id: "infection", name: "Infection", desc: "If you get caught, you become a hunter.\nHide until the end to win" },
  { id: "double", name: "Double", desc: "Everyone hides, then everyone hunts. Most finds wins." },
  { id: "rcr", name: "Reverse Chicken Race", desc: "Hunters see what every chameleon looks like. First to find scores; most points wins." },
];
// סדר התנוחות זהה ל־POSES במנוע (3 עמודים בגלגל)
const ALL_POSES: PoseId[] = [
  "stand", "sit", "lie", "spread", "lump", "cactus", "surrender", "side", "crosslegged", "bridge", "onehand", "bend",
  "tpose", "hips", "handstand", "banzai", "zazen", "airplane", "thinker", "bolt", "glico", "kneel", "prone", "curl",
  "squat", "run", "salute", "armscross", "point", "wave", "hugknees", "flamingo", "fly", "dab", "lean",
];
const POSE_PAGES: PoseId[][] = [ALL_POSES.slice(0, 12), ALL_POSES.slice(12, 24), ALL_POSES.slice(24)];
const SIZE_LIST: { id: SizeId; name: string }[] = [{ id: "normal", name: "Normal" }, { id: "petit", name: "Petit Chameleon" }];
const BODY_LIST: { id: BodyType; name: string }[] = [{ id: "normal", name: "Normal" }, { id: "cube", name: "Cube" }, { id: "plump", name: "Plump" }];

function loadName() {
  try { return localStorage.getItem("meccha_name") || ""; } catch { return ""; }
}
function saveName(n: string) {
  try { localStorage.setItem("meccha_name", n); } catch { /* ignore */ }
}
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

type Conn = { kind: "local" } | { kind: "room" } | { kind: "p2p"; code: string; host: boolean };

export function MecchaGame() {
  useLang();
  const [screen, setScreen] = useState<"menu" | "game">("menu");
  const [name, setName] = useState("");
  const [color, setColor] = useState(PLAYER_COLORS[0]);
  const [muted, setMuted] = useState(false);
  const [conn, setConn] = useState<Conn>({ kind: "local" });
  const [roomNet, setRoomNet] = useState<Net | null | undefined>(undefined);
  const [joinCode, setJoinCode] = useState("");
  const [search, setSearch] = useState(false);
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    setName(loadName() || `Player${Math.floor(Math.random() * 900 + 100)}`);
    setColor(PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)]);
    let alive = true;
    import("@/game/meccha/net")
      .then(({ tryRoomNet }) => tryRoomNet())
      .then((n) => { if (alive) setRoomNet(n); })
      .catch(() => { if (alive) setRoomNet(null); });
    return () => { alive = false; };
  }, []);

  function toggleMute() {
    setMuted((m) => { setSoundMuted(!m); return !m; });
  }
  function go(c: Conn) {
    saveName(name.trim() || "Player");
    setConn(c);
    setRunId((r) => r + 1);
    setScreen("game");
  }

  if (screen === "game")
    return (
      <GameView key={runId} conn={conn} roomNet={roomNet ?? null} name={name.trim().slice(0, 14) || "Player"} color={color}
        muted={muted} onToggleMute={toggleMute} onExit={() => setScreen("menu")} />
    );

  const btn = "w-full rounded-2xl py-3.5 text-lg font-extrabold transition hover:scale-[1.02] active:scale-95 border-[3px] border-black shadow-[0_4px_0_#000]";
  return (
    <div onClickCapture={(ev) => { if ((ev.target as HTMLElement).closest?.("button")) sfxClick(); }} className="relative min-h-screen overflow-hidden" dir="ltr" style={{ fontFamily: FONT, background: "radial-gradient(circle at 30% 20%, #ffe36e 0, #ff9f1c 35%, #ff4d6d 70%, #7b2cbf 100%)" }}>
      <div className="absolute inset-0 opacity-25 pointer-events-none" style={{ backgroundImage: "radial-gradient(#fff 2px, transparent 2px)", backgroundSize: "26px 26px" }} />
      <div className="relative z-10 mx-auto max-w-md px-4 py-6 text-black" dir={isRtl() ? "rtl" : "ltr"}>
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="rounded-xl bg-black/30 text-white px-3 py-2 text-sm font-bold inline-flex items-center gap-2"><Home className="w-4 h-4" /> {t("Home")}</Link>
          <div className="flex items-center gap-2">
            <LangToggle dark />
            <button onClick={toggleMute} className="rounded-xl bg-black/30 text-white p-2.5" aria-label="Mute">
              {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <div className="text-center mb-7 select-none">
          <div className="text-[44px] sm:text-[56px] leading-[0.95] font-black text-white tracking-tight" style={{ textShadow: "0 5px 0 #000, 3px 0 0 #000, -3px 0 0 #000, 0 -3px 0 #000" }}>
            MECCHA<br /><span style={{ color: "#8ef56b" }}>CHAMELEON</span>
          </div>
        </div>

        <div className="rounded-3xl bg-white/90 border-[3px] border-black p-4 mb-4 grid gap-3 shadow-[0_6px_0_#000]">
          <label className="grid gap-1">
            <span className="font-extrabold text-sm">{t("Name")}</span>
            <input id="meccha-name" value={name} maxLength={14} onChange={(e) => setName(e.target.value)}
              className="bg-white border-2 border-black rounded-xl px-3 py-2 text-base font-bold outline-none" />
          </label>
          <div className="flex gap-1.5 justify-center">
            {PLAYER_COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)} aria-label={c}
                className={`w-8 h-8 rounded-full border-[3px] ${color === c ? "border-black scale-110" : "border-white"}`} style={{ background: c }} />
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          {roomNet && <button onClick={() => go({ kind: "room" })} className={`${btn} bg-[#8ef56b]`}>{t("Join This Page's Server")}</button>}
          <button onClick={async () => { const { randomCode } = await import("@/game/meccha/net"); go({ kind: "p2p", code: randomCode(), host: true }); }}
            className={`${btn} bg-[#ffd23f]`}>{t("Create Server")}</button>
          {!search ? (
            <button onClick={() => setSearch(true)} className={`${btn} bg-[#4cc9f0]`}>{t("Search Server")}</button>
          ) : (
            <div className="flex gap-2">
              <input id="meccha-code" autoFocus value={joinCode} placeholder={t("CODE")} dir="ltr"
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))}
                className="flex-1 min-w-0 bg-white border-[3px] border-black rounded-2xl px-3 text-2xl tracking-[0.3em] text-center font-black outline-none" />
              <button disabled={joinCode.length !== 5} onClick={() => go({ kind: "p2p", code: joinCode, host: false })}
                className={`${btn} !w-auto px-5 bg-[#4cc9f0] disabled:opacity-40`}>{t("Join")}</button>
            </div>
          )}
          <button onClick={() => go({ kind: "local" })} className={`${btn} bg-white`}>{t("Practice (Solo + Bots)")}</button>
          {roomNet === undefined && <p className="text-xs text-white/80 text-center">{t("Checking for a shared server…")}</p>}
        </div>

        <details className="mt-5 rounded-2xl bg-black/35 text-white p-4 text-sm leading-relaxed">
          <summary className="font-extrabold cursor-pointer">{t("Controls")}</summary>
          <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[13px]">
            {[
              ["WASD", "Move"], ["Mouse", "Camera (click to lock)"], ["Shift", "Sprint"], ["Space", "Jump / Climb (jump into a wall, hold Space)"],
              ["Ctrl", "Crouch / climb down"], ["F", "Paint mode"], ["Hold Space", "Eyedropper (paint mode)"], ["Right drag", "Brush size"],
              ["V", "Shadow on/off (paint mode)"], ["Hold R", "Pose wheel"], ["Q / X", "Place clone / remove clones"], ["1", "Whistle"],
              ["2", "Nameplates"], ["3", "See-through"], ["5 / 4", "Free camera / move free camera"], ["LMB / RMB", "Hunter: shoot / FPS-TPS"],
              ["G", "Like (answer check)"], ["Y", "Vote to skip"], ["T", "Chat"], ["E", "Interact (PLAY)"], ["Esc", "Settings"],
            ].map(([k, v]) => (<Fragment key={k}><b dir="ltr">{k}</b><span>{t(v)}</span></Fragment>))}
          </div>
        </details>
      </div>
    </div>
  );
}

// ================= GAME =================

function GameView({ conn, roomNet, name, color, muted, onToggleMute, onExit }: {
  conn: Conn; roomNet: Net | null; name: string; color: string; muted: boolean; onToggleMute: () => void; onExit: () => void;
}) {
  useLang();
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [hud, setHud] = useState<HudState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [poseMenu, setPoseMenu] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [charOpen, setCharOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [touch, setTouch] = useState(false);
  const [icons, setIcons] = useState<Record<string, string>>({});
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [missedOpen, setMissedOpen] = useState(false);
  const poseHover = useRef<PoseId | null>(null);

  useEffect(() => {
    setTouch(window.matchMedia("(pointer: coarse)").matches);
    let alive = true;
    let eng: Engine | null = null;
    (async () => {
      try {
        const netMod = await import("@/game/meccha/net");
        let net: Net;
        if (conn.kind === "room" && roomNet) net = roomNet;
        else if (conn.kind === "p2p") net = await netMod.createP2PNet(conn.code, conn.host);
        else net = netMod.createLocalNet();
        const { Engine } = await import("@/game/meccha/engine");
        await Promise.all([(await import("@/game/meccha/character")).loadCharacterModels(), (await import("@/game/meccha/paintings")).loadPaintings()]);
        if (!alive || !mountRef.current) { if (net.kind === "p2p") net.close(); return; }
        eng = new Engine(mountRef.current, net, { name, color, muted, defaultBots: net.kind === "local" ? 3 : 0, onHud: setHud });
        eng.onPoseMenu = (open) => {
          if (open) { poseHover.current = null; setPoseMenu(true); return; }
          if (poseHover.current) eng?.setPose(poseHover.current); // משחררים R = בוחרים
          setPoseMenu(false);
        };
        eng.onOptions = () => setOptionsOpen((v) => !v);
        eng.onInteract = () => setSettingsOpen(true);
        eng.onChatKey = () => setChatOpen(true);
        eng.onTab = () => setMissedOpen((v) => !v);
        engineRef.current = eng;
        try {
          const num = (k: string) => { const v = localStorage.getItem(k); return v === null ? null : Number(v); };
          const sens = num("meccha_sens"); if (sens !== null) eng.setSensitivity(sens);
          const vol = num("meccha_vol"); if (vol !== null) setSoundVolume(vol);
          const sh = num("meccha_shadow"); if (sh !== null) eng.setShadowQuality(sh as 0 | 1 | 2);
          if (num("meccha_perf") === 1) eng.setPerformance(true);
        } catch { /* ignore */ }
        try { setIcons(eng.poseIcons()); } catch { /* אין אייקונים */ }
        if (import.meta.env.DEV) (window as unknown as { __meccha: Engine }).__meccha = eng;
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : "Failed to start (WebGL or connection).");
      }
    })();
    return () => {
      alive = false;
      eng?.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { engineRef.current?.setMuted(muted); }, [muted]);

  const toastId = hud?.toast?.id;
  useEffect(() => {
    if (!hud?.toast) return;
    setToast(hud.toast.text);
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toastId]);

  const phase = hud?.phase;
  const [announce, setAnnounce] = useState<string | null>(null);
  useEffect(() => {
    if (phase !== "hunt") return;
    setAnnounce(t("Search Start!"));
    const tm = window.setTimeout(() => setAnnounce(null), 2600);
    return () => window.clearTimeout(tm);
  }, [phase]);
  useEffect(() => {
    if (phase !== "lobby") setSettingsOpen(false);
    if (phase === "countdown") setCharOpen(true);
    if (phase !== "lobby" && phase !== "countdown") setCharOpen(false);
    if (phase === "check" || phase === "countdown") setPoseMenu(false);
  }, [phase]);

  const e = engineRef.current;
  const overlayOpen = settingsOpen || charOpen || chatOpen || optionsOpen;
  const hider = !!hud && hud.alive && hud.myRole === "hider" && hud.phase !== "check";
  const hunter = !!hud && hud.myRole === "hunter" && (hud.phase === "hide" || hud.phase === "hunt");
  const phaseTitle = !hud ? "" : {
    lobby: t("LOBBY"), countdown: t("GET READY"), hide: hud.myRole === "hunter" ? t("HUNTER WAIT TIME") : t("HIDE!"), hunt: t("SEARCH TIME"), check: t("ANSWER CHECK"),
  }[hud.phase];

  return (
    <div className="fixed inset-0 bg-black select-none overflow-hidden text-white" dir="ltr" style={{ fontFamily: FONT }}
      onClickCapture={(ev) => { if ((ev.target as HTMLElement).closest?.("button")) sfxClick(); }}>
      <div ref={mountRef} className="absolute inset-0" />

      {error && (
        <div className="absolute inset-0 z-50 grid place-items-center bg-black/80 p-6">
          <div className="rounded-2xl bg-white text-black p-5 max-w-sm text-center font-bold">
            <p className="mb-3">{error}</p>
            <button onClick={onExit} className="rounded-xl bg-black text-white px-4 py-2">{t("Back")}</button>
          </div>
        </div>
      )}
      {!hud && !error && <div className="absolute inset-0 grid place-items-center text-2xl font-black" style={{ textShadow: OUTLINE }}>{t("Loading…")}</div>}

      {hud && (
        <>
          {/* למעלה באמצע (כמו במשחק): זיקיות לבנות · שעון חול ירוק · ציידים אדומים, מתחת מספר השניות ותווית השלב */}
          {hud.phase !== "lobby" && <TopHud hud={hud} />}
          {hud.phase === "lobby" && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 text-sm font-bold tracking-wide pointer-events-none" style={{ textShadow: OUTLINE }}>{t("Lobby")}</div>
          )}

          {/* שמאל למעלה: בלובי בלבד — יציאה, קוד, שחקנים */}
          <div className="absolute top-2 left-2 z-20 flex flex-col gap-1.5 items-start">
            {(hud.phase === "lobby" || touch) && (
              <div className="flex gap-1.5">
                <button onClick={onExit} className="hud-btn rounded-xl bg-black/50 px-2.5 py-1.5 text-xs font-bold"><X className="w-4 h-4 inline" /> {t("Leave")}</button>
                <button onClick={() => setOptionsOpen(true)} className="hud-btn rounded-xl bg-black/50 p-1.5" aria-label="Settings"><Gear className="w-4 h-4" /></button>
              </div>
            )}
            {hud.code && hud.phase === "lobby" && (
              <button onClick={() => navigator.clipboard?.writeText(hud.code!).catch(() => {})} className="hud-btn rounded-xl bg-black/50 px-2.5 py-1 text-xs font-bold inline-flex items-center gap-1">
                {t("Code:")} <span className="tracking-widest text-sm text-[#ffd23f]">{hud.code}</span> <Copy className="w-3 h-3" />
              </button>
            )}
            {hud.phase === "lobby" && (
              <div className="rounded-xl bg-black/40 px-2 py-1.5 text-[11px] font-bold grid gap-0.5 max-w-[190px]">
                {hud.players.map((p) => (
                  <div key={p.id} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-black" style={{ background: p.color }} />
                    <span className="truncate">{p.name}{p.me ? ` ${t("(You)")}` : ""}</span>
                    {p.host && <span className="text-[#ffd23f]">★</span>}
                    {p.onPad && !p.bot && <span className="text-[#ff4d4d]">HUNTER</span>}
                  </div>
                ))}
              </div>
            )}
            {!hud.connected && <div className="rounded bg-red-600 px-2 py-0.5 text-xs font-bold">{t("Disconnected")}</div>}
          </div>

          {/* שמאל: לשונית "Missed-Spot Ranking" */}
          {hud.settings.missed && (hud.phase === "hide" || hud.phase === "hunt") && !hud.paintMode && <MissedTab hud={hud} open={missedOpen} setOpen={setMissedOpen} />}

          {/* ימין: רשימת המקשים עם האייקונים, כמו במשחק */}
          {!touch && !hud.paintMode && (hud.phase === "hide" || hud.phase === "hunt" || hud.phase === "check") && <KeyColumn hud={hud} hider={hider} hunter={hunter} />}

          {/* ימין למטה: שם מצב המשחק בירוק + ההסבר */}
          {(hud.phase === "hide" || hud.phase === "hunt") && !hud.paintMode && <ModeText mode={hud.settings.mode} />}

          {/* למטה באמצע: צ'יפים של מקשים (Climb / Detach · Move Down · Move Up) */}
          {!touch && (hud.phase === "hide" || hud.phase === "hunt") && !hud.paintMode && hud.alive && <BottomChips hud={hud} hider={hider} />}

          {/* תחמושת / מציאות (צייד) */}
          {hunter && (hud.settings.ammoLimit || hud.phase === "hunt") && (
            <div className="absolute bottom-24 right-4 z-20 flex flex-col items-end gap-1 font-bold pointer-events-none" style={{ textShadow: OUTLINE }}>
              {hud.phase === "hunt" && <div className="flex items-center gap-1 text-xl"><Search className="w-6 h-6 text-[#ff3b3b]" strokeWidth={3} /> {hud.finds}</div>}
              {hud.settings.ammoLimit && <div className="text-lg">{t("Ammo")}: {hud.ammo}</div>}
            </div>
          )}
          {hud.freeLook && <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 text-xs font-bold text-[#4cc9f0] pointer-events-none" style={{ textShadow: OUTLINE }}>{t("FREE CAMERA")} {hud.freeCam ? t("· moving (4)") : t("· 4 to move")}</div>}

          {/* "Search Start!" */}
          {announce && <div className="absolute top-[13%] left-1/2 -translate-x-1/2 z-30 text-5xl font-medium pointer-events-none whitespace-nowrap" style={{ fontFamily: SERIF, textShadow: "0 0 3px #000, 0 2px 10px rgba(0,0,0,.9), 0 0 18px rgba(0,0,0,.6)" }}>{announce}</div>}

          {/* היהלומים הירוקים: זמינות השכפולים */}
          {hider && (hud.phase === "hide" || hud.phase === "hunt") && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-2 pointer-events-none">
              {hud.cloneSlots.map((v, i) => (
                <svg key={i} width="26" height="30" viewBox="0 0 26 30" aria-label={v >= 1 ? "clone ready" : "clone cooldown"}>
                  <defs><clipPath id={`cd${i}`}><rect x="0" y={30 - 30 * v} width="26" height="30" /></clipPath></defs>
                  <path d="M13 1 L25 15 L13 29 L1 15 Z" fill="rgba(0,0,0,.45)" stroke="#000" strokeWidth="1.5" />
                  <path d="M13 1 L25 15 L13 29 L1 15 Z" fill={v >= 1 ? "#3ee07a" : "#1f8f4c"} stroke="#000" strokeWidth="1.5" clipPath={`url(#cd${i})`} />
                </svg>
              ))}
            </div>
          )}

          {/* 逆算チキンレース: הציידים רואים את כל הזיקיות */}
          {hunter && hud.portraits.length > 0 && (
            <div className="absolute left-2 top-1/2 -translate-y-1/2 z-20 grid grid-cols-2 gap-1.5 pointer-events-none">
              {hud.portraits.map((q) => (
                <div key={q.id} className={`rounded-lg overflow-hidden border-2 ${q.found ? "border-[#5a8dff] opacity-50" : "border-white"}`}>
                  <img src={q.url} alt="" className="w-16 h-16 block" />
                  <div className="text-[9px] font-bold bg-black/60 px-1 truncate w-16">{q.name}</div>
                </div>
              ))}
            </div>
          )}

          {/* מצב לובי */}
          {hud.phase === "lobby" && !overlayOpen && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-none">
              {hud.nearPlay ? (
                <div className="rounded-2xl bg-black/60 px-4 py-2 text-lg font-black pointer-events-auto cursor-pointer" onClick={() => setSettingsOpen(true)}>
                  <Key k="E" /> {hud.isHost ? t("Game Settings / Start") : t("Game Settings")}
                </div>
              ) : (
                <div className="text-sm font-bold text-center" style={{ textShadow: OUTLINE }}>
                  {t("Walk to")} <b className="text-[#ffd23f]">PLAY</b> {t("and press")} <Key k="E" /> · {t("Stand on the red")} <b className="text-[#ff4d4d]">HUNTER</b> {t("pad to be a hunter")}
                </div>
              )}
              {hud.onPad && <div className="text-xl font-black text-[#ff4d4d]" style={{ textShadow: OUTLINE }}>{t("You will be a HUNTER")}</div>}
              <div className="flex gap-2 pointer-events-auto">
                <button onClick={() => setSettingsOpen(true)} className="rounded-xl bg-[#ffd23f] text-black px-3 py-1.5 text-sm font-black border-2 border-black">{t("Settings")}</button>
                <button onClick={() => setCharOpen(true)} className="rounded-xl bg-white text-black px-3 py-1.5 text-sm font-black border-2 border-black">{t("Character")}</button>
              </div>
            </div>
          )}

          {hud.phase === "hide" && hud.myRole === "hunter" && (
            <Banner>{t("Wait in the lobby until the chameleons finish hiding · F paint · RMB third person")}</Banner>
          )}
          {hud.spectating !== null && hud.phase !== "check" && !hud.freeLook && (
            <div className="absolute bottom-3 left-4 z-20 pointer-events-none" style={{ textShadow: "0 2px 6px rgba(0,0,0,.7)" }}>
              <div className="text-[11px] font-bold opacity-80">{t("click next · 4 move · Shift fast · Space up · Ctrl down")}</div>
              <div className="text-4xl" style={{ fontFamily: SERIF }}>{t("Spectating")}</div>
              {hud.spectating && <div className="text-lg -mt-1 text-center">{hud.spectating}</div>}
            </div>
          )}

          {/* צייד: כוונת */}
          {hunter && hud.alive && !hud.paintMode && (
            <div className="absolute inset-0 z-10 pointer-events-none grid place-items-center">
              <svg width="44" height="44" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="11" fill="none" stroke="#fff" strokeWidth="2.4" />
                <circle cx="22" cy="22" r="11" fill="none" stroke="#000" strokeWidth="0.8" />
                <circle cx="22" cy="22" r="2" fill="#fff" stroke="#000" strokeWidth="0.6" />
              </svg>
              {hud.tps && <div className="absolute top-[58%] text-xs font-bold" style={{ textShadow: OUTLINE }}>TPS</div>}
            </div>
          )}
          {hud.phase === "check" && !overlayOpen && (
            <div className="absolute inset-0 z-10 pointer-events-none grid place-items-center">
              <div className="w-2 h-2 rounded-full bg-white border border-black" />
            </div>
          )}

          {/* בדיקת תשובות */}
          {hud.phase === "check" && <CheckPanel hud={hud} onLike={() => e?.giveLike()} />}

          {/* מגע: ביטול נעילה */}
          {hud.locked && !hud.paintMode && hud.phase !== "check" && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 text-[11px] font-bold opacity-80" style={{ textShadow: OUTLINE }}>{t("Esc to release the mouse")}</div>
          )}

          {/* בלובי: כפתור השתקה בפינה הימנית התחתונה (כמו במשחק) */}
          {hud.phase === "lobby" && !overlayOpen && (
            <button onClick={onToggleMute} className="absolute bottom-3 right-3 z-30 rounded-full bg-black/55 border-2 border-white/70 p-2.5" aria-label={muted ? t("Unmute") : t("Mute")}>
              {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          )}

          {hud.paintMode && <PaintPanel hud={hud} engine={e} touch={touch} />}
          {poseMenu && <PoseWheel icons={icons} current={hud.pose} hover={poseHover} onPick={(p) => e?.setPose(p)} onClose={() => setPoseMenu(false)} touch={touch} />}
          {optionsOpen && <OptionsPanel engine={e} muted={muted} onToggleMute={onToggleMute} onClose={() => setOptionsOpen(false)} onLeave={onExit} />}
          {settingsOpen && <SettingsPanel hud={hud} engine={e} onClose={() => setSettingsOpen(false)} />}
          {charOpen && <CharPanel hud={hud} engine={e} onClose={() => setCharOpen(false)} />}

          {/* צ'אט */}
          <div className="absolute left-2 bottom-2 z-20 w-[min(320px,60vw)] grid gap-0.5 text-[12px] font-bold">
            {hud.chat.filter((c) => chatOpen || Date.now() - c.t < 12000).map((c) => (
              <div key={c.id} className="rounded bg-black/40 px-1.5 py-0.5 break-words">
                {c.name && <span style={{ color: c.color }}>{c.name}: </span>}<span className={c.name ? "" : "opacity-70"}>{c.m}</span>
              </div>
            ))}
            {chatOpen && <ChatInput onSend={(m) => e?.sendChat(m)} onClose={() => setChatOpen(false)} />}
          </div>

          {toast && <div className="absolute top-28 left-1/2 -translate-x-1/2 z-30 rounded-2xl bg-black/70 px-4 py-2 text-lg font-black">{toast}</div>}

          {touch && <TouchControls hud={hud} engine={e} onPose={() => setPoseMenu((v) => !v)} onChat={() => setChatOpen(true)} />}
        </>
      )}
    </div>
  );
}

/** פיקטוגרמת שחקן (כמו האייקונים למעלה במשחק) */
function Person({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <svg width={size * 0.55} height={size} viewBox="0 0 11 20" aria-hidden>
      <circle cx="5.5" cy="2.6" r="2.3" fill={color} />
      <path d="M2.2 5.6 h6.6 a1.2 1.2 0 0 1 1.2 1.2 v5.4 a.9 .9 0 0 1 -1.8 0 v-4.4 h-.3 v11.2 a1.1 1.1 0 0 1 -2.2 0 v-6.4 h-.4 v6.4 a1.1 1.1 0 0 1 -2.2 0 v-11.2 h-.3 v4.4 a.9 .9 0 0 1 -1.8 0 v-5.4 a1.2 1.2 0 0 1 1.2 -1.2 z" fill={color} />
    </svg>
  );
}

function Hourglass({ frac }: { frac: number }) {
  const f = Math.max(0, Math.min(1, frac));
  const top = 12 * f, bot = 12 * (1 - f);
  return (
    <svg width="24" height="32" viewBox="0 0 24 32" aria-hidden style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,.7))" }}>
      <defs>
        <clipPath id="hgT"><rect x="0" y={3.5 + (12 - top)} width="24" height={top} /></clipPath>
        <clipPath id="hgB"><rect x="0" y={28.5 - bot} width="24" height={bot} /></clipPath>
      </defs>
      <path d="M5 3.5 h14 c0 6.5-5 8.5-5.8 12.5 c.8 4 5.8 6 5.8 12.5 h-14 c0-6.5 5-8.5 5.8-12.5 c-.8-4-5.8-6-5.8-12.5 z" fill="#2fd05a" clipPath="url(#hgT)" />
      <path d="M5 3.5 h14 c0 6.5-5 8.5-5.8 12.5 c.8 4 5.8 6 5.8 12.5 h-14 c0-6.5 5-8.5 5.8-12.5 c-.8-4-5.8-6-5.8-12.5 z" fill="#2fd05a" clipPath="url(#hgB)" />
      <path d="M5 3.5 h14 c0 6.5-5 8.5-5.8 12.5 c.8 4 5.8 6 5.8 12.5 h-14 c0-6.5 5-8.5 5.8-12.5 c-.8-4-5.8-6-5.8-12.5 z" fill="none" stroke="#fff" strokeWidth="1.6" />
      <rect x="2.5" y="1" width="19" height="3" rx="1.2" fill="#fff" />
      <rect x="2.5" y="28" width="19" height="3" rx="1.2" fill="#fff" />
    </svg>
  );
}

const PHASE_LEN: Record<string, (s: Settings) => number> = { hide: (s) => s.hideTime, hunt: (s) => s.huntTime, check: (s) => s.checkTime, countdown: () => 15 };

function TopHud({ hud }: { hud: HudState }) {
  const hunters = hud.players.filter((p) => p.role === "hunter").length;
  const left = hud.hiderIcons.filter((h) => !h.found).length;
  const total = PHASE_LEN[hud.phase]?.(hud.settings) ?? 1;
  const label = { countdown: "Until Search Starts", hide: "Until Search Starts", hunt: "Search Time", check: "Answer Check", lobby: "" }[hud.phase];
  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none" style={{ textShadow: "0 1px 3px rgba(0,0,0,.8)" }}>
      <div className="flex items-end gap-1.5">
        <div className="flex gap-[3px] items-end">{Array.from({ length: left }, (_, i) => <Person key={i} color="#fff" />)}</div>
        <Hourglass frac={hud.time / Math.max(1, total)} />
        <div className="flex gap-[3px] items-end">{Array.from({ length: hunters }, (_, i) => <Person key={i} color="#e8262c" />)}</div>
      </div>
      <div className={`text-[22px] leading-none mt-0.5 tabular-nums font-light ${hud.phase === "hunt" && hud.time <= 10 ? "text-[#ff4d4d]" : ""}`}>{Math.max(0, Math.ceil(hud.time))}</div>
      <div className="text-[12px] leading-tight">{t(label)}</div>
      {hud.room && hud.room !== hud.mapName && hud.phase !== "countdown" && <div className="text-[11px] opacity-80 mt-0.5">{t(hud.room)}</div>}
    </div>
  );
}

function KeyBox({ k, on, color }: { k: string; on?: boolean; color?: string }) {
  return <span className="inline-grid place-items-center min-w-[16px] h-[16px] px-[3px] rounded-[3px] text-[10px] font-black leading-none text-black" style={{ background: color ?? (on ? "#27c93f" : "#fff") }}>{k}</span>;
}

/** אייקוני הרשימה בימין — ציור פשוט בסגנון המשחק */
function Ico({ kind }: { kind: "chat" | "bell" | "pose" | "paint" | "lock" }) {
  const c = "#fff";
  if (kind === "bell") return <svg width="22" height="22" viewBox="0 0 24 24"><path d="M12 3a6 6 0 0 0-6 6v4l-2 3h16l-2-3V9a6 6 0 0 0-6-6zm-2 15a2 2 0 0 0 4 0z" fill="#ffc21a" /></svg>;
  if (kind === "chat") return <svg width="16" height="16" viewBox="0 0 24 24"><path d="M3 5h18v11H9l-5 4v-4H3z" fill={c} /></svg>;
  if (kind === "pose") return <svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" fill="none" stroke={c} strokeWidth="1.8" /><circle cx="13" cy="6.5" r="1.8" fill={c} /><path d="M7 11l4-2 3 1 3-2M11 9l-1 5 3 2-1 4M10 14l-3 3" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (kind === "paint") return <svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" fill="none" stroke={c} strokeWidth="1.8" /><path d="M12 20V11M12 11l-4-6M12 11l4-6M12 11V4" stroke={c} strokeWidth="1.8" strokeLinecap="round" /></svg>;
  return <svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 3v4M12 7a2 2 0 1 0 0.01 0M12 9v11M6 14a6 6 0 0 0 12 0M4 14h4M16 14h4" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" /></svg>;
}

function KeyColumn({ hud, hider, hunter }: { hud: HudState; hider: boolean; hunter: boolean }) {
  const row = (key: React.ReactNode, label: string, icon?: React.ReactNode) => (
    <div className="flex items-center justify-end gap-1.5">
      <div className="flex flex-col items-end">{key}<span className="text-[9px] leading-tight mt-[1px]">{t(label)}</span></div>
      {icon && <span className="w-6 grid place-items-center">{icon}</span>}
    </div>
  );
  return (
    <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 grid gap-2 pointer-events-none" style={{ textShadow: "0 1px 2px rgba(0,0,0,.9)" }}>
      <div className="flex items-center justify-end gap-1"><Ico kind="chat" /><KeyBox k="T" /></div>
      {hider && row(<KeyBox k="1" color="#ffc21a" />, "Taunt", <Ico kind="bell" />)}
      {hider && row(<KeyBox k="R" />, "Pose", <Ico kind="pose" />)}
      {(hider || hunter) && row(<KeyBox k="F" />, "Paint Mode", <Ico kind="paint" />)}
      {hider && row(<KeyBox k="RMB" />, "Rotation Lock", <Ico kind="lock" />)}
      {row(<KeyBox k="2" on={hud.nameplates} />, "Toggle Nameplate Display")}
      {row(<KeyBox k="3" on={hud.xray} />, "Toggle X-Ray Rendering")}
      {hider && row(<KeyBox k="5" color={hud.freeLook ? "#27c93f" : "#ff7ad9"} />, "Switch to Free Camera")}
      {hud.phase === "hide" && row(<KeyBox k="Y" on={hud.votes.mine} />, `Skip (${hud.votes.have}/${hud.votes.need})`)}
      {hunter && hud.phase === "hunt" && hud.settings.hunterTps && row(<KeyBox k="RMB" />, "FPS / TPS")}
    </div>
  );
}

function ModeText({ mode }: { mode: Settings["mode"] }) {
  const m = MODES.find((x) => x.id === mode) ?? MODES[0];
  return (
    <div className="absolute bottom-3 right-4 z-10 text-center pointer-events-none" style={{ textShadow: "0 1px 3px rgba(0,0,0,.9)" }}>
      <div className="text-[17px] font-bold text-[#3ee03a] leading-tight">{t(m.name)}</div>
      {t(m.desc).split("\n").map((l, i) => <div key={i} className="text-[12px] leading-snug">{l}</div>)}
    </div>
  );
}

function BottomChips({ hud, hider }: { hud: HudState; hider: boolean }) {
  const chip = (k: string, label: string, color: string) => (
    <div className="flex flex-col items-center gap-[2px]">
      <span className="rounded-[3px] px-1.5 h-[14px] grid place-items-center text-[8px] font-black text-black" style={{ background: color }}>{k}</span>
      <span className="text-[9px]">{t(label)}</span>
    </div>
  );
  return (
    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 flex gap-3 pointer-events-none" style={{ textShadow: "0 1px 2px rgba(0,0,0,.9)" }}>
      {hud.attached ? <>{chip("SHIFT", "Detach", "#27c93f")}{chip("CTRL", "Move Down", "#fff")}{chip("SPACE", "Move Up", "#fff")}</>
        : <>{hider && chip("CTRL", hud.crouch ? "Stand Up" : "Crouch", "#ffc21a")}{chip("SPACE", "Climb", "#4ee6e6")}{hider && chip("Q", "Clone", "#4ee6e6")}</>}
    </div>
  );
}

function MissedTab({ hud, open, setOpen }: { hud: HudState; open: boolean; setOpen: (f: (v: boolean) => boolean) => void }) {
  return (
    <div className="absolute left-0 top-[40%] z-20" style={{ textShadow: "0 1px 2px rgba(0,0,0,.9)" }}>
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1.5 bg-black/30 rounded-r px-2 py-1 text-[12px]">
        <span className="rounded-sm bg-white text-black text-[8px] font-black px-1 h-3 grid place-items-center">Tab</span>{t("Missed-Spot Ranking")}
      </button>
      {open && (
        <div className="bg-black/45 rounded-r px-2 py-1.5 min-w-[170px] text-[11px]">
          {hud.ranking.length === 0 && <div className="opacity-70">—</div>}
          {hud.ranking.map((r, i) => (
            <div key={r.id} className={`flex items-center gap-1.5 ${r.me ? "text-[#ffd23f]" : ""}`}>
              <span className="w-3 opacity-70">{i + 1}</span>
              <span className="truncate max-w-[100px]">{r.name}</span>
              <span className="ml-auto tabular-nums">{r.pts}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Key({ k }: { k: string }) {
  return <span className="inline-block min-w-[20px] px-1 rounded-md bg-white text-black text-center border-b-[3px] border-black/60 font-black text-[11px] leading-[18px]" style={{ textShadow: "none" }}>{k}</span>;
}

function Banner({ children }: { children: React.ReactNode }) {
  return <div className="absolute top-[108px] left-1/2 -translate-x-1/2 z-20 rounded-xl bg-black/55 px-3 py-1.5 text-sm font-bold text-center pointer-events-none">{children}</div>;
}

function Panel({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-black/40 p-3" onPointerDown={(ev) => { if (ev.target === ev.currentTarget) onClose(); }}>
      <div dir={isRtl() ? "rtl" : "ltr"} className={`w-full ${wide ? "max-w-lg" : "max-w-sm"} max-h-[92vh] overflow-auto rounded-3xl bg-white text-black border-[3px] border-black shadow-[0_6px_0_#000] p-4`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-black">{title}</h2>
          <button onClick={onClose} className="rounded-full bg-black text-white p-1" aria-label="Close"><X className="w-4 h-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Opt<T extends string | number | boolean>({ label, value, options, onChange, disabled }: {
  label: string; value: T; options: { v: T; n: string }[]; onChange: (v: T) => void; disabled?: boolean;
}) {
  const i = Math.max(0, options.findIndex((o) => o.v === value));
  const step = (d: number) => onChange(options[(i + d + options.length) % options.length].v);
  return (
    <div className="flex items-center justify-between gap-2 py-1 border-b border-black/10">
      <span className="text-sm font-bold">{t(label)}</span>
      <div className="flex items-center gap-1">
        <button disabled={disabled} onClick={() => step(isRtl() ? 1 : -1)} className="w-7 h-7 rounded-lg bg-black text-white font-black disabled:opacity-30">‹</button>
        <span className="min-w-[128px] text-center text-sm font-black truncate" dir="ltr">{t(options[i]?.n ?? "")}</span>
        <button disabled={disabled} onClick={() => step(isRtl() ? -1 : 1)} className="w-7 h-7 rounded-lg bg-black text-white font-black disabled:opacity-30">›</button>
      </div>
    </div>
  );
}

const secs = (list: number[]) => list.map((v) => ({ v, n: v >= 60 ? `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}` : isRtl() ? `${v} שנ׳` : `${v}s` }));
const nums = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => ({ v: a + i, n: String(a + i) }));
const onOff = [{ v: true, n: "ON" }, { v: false, n: "OFF" }];

function SettingsPanel({ hud, engine, onClose }: { hud: HudState; engine: Engine | null; onClose: () => void }) {
  const s = hud.settings;
  const dis = !hud.isHost;
  const set = (p: Partial<Settings>) => engine?.setSettings(p);
  const solo = hud.net === "local";
  const col = "rounded-2xl border-[3px] border-black bg-white p-3 min-h-0 overflow-auto";
  const h = "text-sm font-black mb-2";
  return (
    <div className="absolute inset-0 z-40 bg-black/50 p-2 sm:p-4 grid place-items-center" onPointerDown={(ev) => { if (ev.target === ev.currentTarget) onClose(); }}>
      <div dir={isRtl() ? "rtl" : "ltr"} className="relative w-full max-w-5xl h-full max-h-[640px] rounded-3xl bg-[#ffe7a3] text-black border-[3px] border-black shadow-[0_6px_0_#000] p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black">{t("Configure Map")}</h2>
          <button onClick={onClose} className="rounded-full bg-black text-white p-1" aria-label="Close"><X className="w-4 h-4" /></button>
        </div>
        {dis && <p className="text-xs font-bold text-black/60 -mt-1">{t("Only the host can change the settings.")}</p>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 flex-1 min-h-0 overflow-auto md:overflow-hidden">
          {/* מפה */}
          <div className={col}>
            <div className={h}>{t("Map")}</div>
            <button disabled={dis} onClick={() => set({ map: "random" })}
              className={`w-full text-start rounded-xl border-2 px-2 py-1.5 mb-1 text-sm font-black ${s.map === "random" ? "border-black bg-[#ffd23f]" : "border-black/15"}`}>🎲 {t("Random")}</button>
            {MAP_LIST.map((m) => (
              <div key={m.id} className={`flex items-center gap-1.5 rounded-xl border-2 px-2 py-1 mb-1 ${s.map === m.id ? "border-black bg-[#4cc9f0]" : "border-black/15"}`}>
                <button disabled={dis} onClick={() => set({ map: m.id })} className="flex-1 text-start text-sm font-bold truncate">{t(m.name)}</button>
                <label className="flex items-center gap-1 text-[10px] font-bold text-black/60" title={t("Include in Random")}>
                  <input type="checkbox" disabled={dis} checked={s.pool.includes(m.id)}
                    onChange={(ev) => set({ pool: ev.target.checked ? [...s.pool, m.id] : s.pool.filter((x) => x !== m.id) })} /> {t("random")}
                </label>
              </div>
            ))}
          </div>
          {/* מצב + פילטרים */}
          <div className={col}>
            <div className={h}>{t("Game Mode")}</div>
            {MODES.map((m) => (
              <button key={m.id} disabled={dis} onClick={() => set({ mode: m.id })}
                className={`w-full text-start rounded-xl border-2 px-2 py-1.5 mb-1 ${s.mode === m.id ? "border-black bg-[#8ef56b]" : "border-black/15"}`}>
                <div className="text-sm font-black">{t(m.name)}</div>
                <div className="text-[11px] font-bold text-black/60 leading-tight">{t(m.desc)}</div>
              </button>
            ))}
            <div className={`${h} mt-3`}>{t("Filters")}</div>
            {([["mono", "Monochrome"], ["horror", "Horror"], ["mosaic", "Mosaic"]] as const).map(([k, n]) => (
              <label key={k} className="flex items-center gap-2 rounded-xl border-2 border-black/15 px-2 py-1.5 mb-1 text-sm font-bold">
                <input type="checkbox" disabled={dis} checked={s.filters[k]} onChange={(ev) => set({ filters: { ...s.filters, [k]: ev.target.checked } })} /> {t(n)}
              </label>
            ))}
          </div>
          {/* חוקים */}
          <div className={col}>
            <div className={h}>{t("Rules")}</div>
            <Opt label="Number of Hunters" value={s.hunters} disabled={dis || s.mode === "double"} options={nums(1, 6)} onChange={(v) => set({ hunters: v })} />
            <Opt label="Hunter Wait Time" value={s.hideTime} disabled={dis} options={secs([30, 45, 60, 75, 90, 120, 150, 180, 200, 240, 300])} onChange={(v) => set({ hideTime: v })} />
            <Opt label="Search Time" value={s.huntTime} disabled={dis} options={secs([60, 90, 120, 150, 180, 200, 240, 300, 420, 600])} onChange={(v) => set({ huntTime: v })} />
            <Opt label="Answer Check Time" value={s.checkTime} disabled={dis} options={secs([15, 30, 45, 60, 90])} onChange={(v) => set({ checkTime: v })} />
            <Opt label="Forced Taunt" value={s.whistle} disabled={dis} options={[{ v: 0, n: "OFF" }, ...secs([5, 10, 15, 20, 30, 45, 60, 90, 120])]} onChange={(v) => set({ whistle: v })} />
            <Opt label="Missed-Points Ranking for Hunters" value={s.missed} disabled={dis} options={onOff} onChange={(v) => set({ missed: v })} />
            <Opt label="Ammo Limit" value={s.ammoLimit} disabled={dis} options={onOff} onChange={(v) => set({ ammoLimit: v })} />
            {s.ammoLimit && <Opt label="Ammo" value={s.ammo} disabled={dis} options={nums(1, 99)} onChange={(v) => set({ ammo: v })} />}
            <Opt label="Allow Petit Chameleon" value={s.allowPetit} disabled={dis} options={onOff} onChange={(v) => set({ allowPetit: v })} />
            <Opt label="Hunter TPS" value={s.hunterTps} disabled={dis} options={onOff} onChange={(v) => set({ hunterTps: v })} />
            {solo && (
              <>
                <div className="text-[11px] font-black mt-3 text-black/60">{t("Practice (solo only)")}</div>
                <Opt label="Bots" value={s.bots} disabled={dis} options={nums(1, 8)} onChange={(v) => set({ bots: v })} />
                <Opt label="Bot Level" value={s.difficulty} disabled={dis} options={[{ v: 0 as const, n: "Easy" }, { v: 1 as const, n: "Normal" }, { v: 2 as const, n: "Hard" }]} onChange={(v) => set({ difficulty: v })} />
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {hud.isHost && (
            <button onClick={() => { engine?.startCountdown(); onClose(); }} className="rounded-2xl bg-[#8ef56b] border-[3px] border-black shadow-[0_4px_0_#000] px-8 py-2.5 text-xl font-black">
              {t("Start")}
            </button>
          )}
          <span className="text-xs font-bold text-black/60">{t("{n} players", { n: hud.players.length })} · {s.map === "random" ? t("Random map") : t(MAP_LIST.find((m) => m.id === s.map)?.name ?? "")}</span>
        </div>
      </div>
    </div>
  );
}

function CharPanel({ hud, engine, onClose }: { hud: HudState; engine: Engine | null; onClose: () => void }) {
  const mapName = t(hud.settings.map === "random" ? "Random" : MAP_LIST.find((m) => m.id === hud.settings.map)?.name ?? "");
  return (
    <Panel title={hud.phase === "countdown" ? t("Starting in {n}", { n: hud.time }) : t("Character")} onClose={onClose}>
      {hud.phase === "countdown" && <p className="text-sm font-bold mb-2">{t("Map:")} <b>{mapName}</b></p>}
      <p className="text-sm font-black mb-1.5">{t("Size")}</p>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {SIZE_LIST.map((z) => {
          const off = z.id === "petit" && !hud.settings.allowPetit;
          return (
            <button key={z.id} disabled={off} onClick={() => engine?.setMySize(z.id)}
              className={`rounded-xl border-[3px] py-2 text-sm font-black disabled:opacity-30 ${hud.size === z.id ? "border-black bg-[#4cc9f0]" : "border-black/20"}`}>{t(z.name)}{z.id === "petit" ? " ×0.5" : ""}</button>
          );
        })}
      </div>
      <p className="text-sm font-black mb-1.5">{t("Body Type")}</p>
      <div className="grid grid-cols-3 gap-2">
        {BODY_LIST.map((b) => (
          <button key={b.id} onClick={() => engine?.setMyBody(b.id)}
            className={`rounded-xl border-[3px] py-2 font-black ${hud.bodyType === b.id ? "border-black bg-[#ffd23f]" : "border-black/20"}`}>{t(b.name)}</button>
        ))}
      </div>
      <button onClick={onClose} className="mt-4 w-full rounded-2xl bg-black text-white py-2.5 font-black">{t("OK")}</button>
    </Panel>
  );
}

function OptionsPanel({ engine, muted, onToggleMute, onClose, onLeave }: { engine: Engine | null; muted: boolean; onToggleMute: () => void; onClose: () => void; onLeave: () => void }) {
  const load = (k: string, d: number) => { try { const v = Number(localStorage.getItem(k)); return Number.isFinite(v) && localStorage.getItem(k) !== null ? v : d; } catch { return d; } };
  const [sens, setSens] = useState(() => load("meccha_sens", 1));
  const [vol, setVol] = useState(() => load("meccha_vol", 1));
  const [shadow, setShadow] = useState(() => load("meccha_shadow", 2) as 0 | 1 | 2);
  const [perf, setPerf] = useState(() => load("meccha_perf", 0) === 1);
  const save = (k: string, v: number) => { try { localStorage.setItem(k, String(v)); } catch { /* ignore */ } };
  return (
    <Panel title={t("Settings")} onClose={onClose}>
      <div className="flex items-center justify-between mb-3"><span className="text-sm font-bold">{t("Language")}</span><LangToggle /></div>
      <Slider id="o-sens" label={t("Mouse Sensitivity")} value={sens} min={0.2} max={3} step={0.05} onChange={(v) => { setSens(v); save("meccha_sens", v); engine?.setSensitivity(v); }} />
      <div className="h-2" />
      <Slider id="o-vol" label={t("Volume")} value={vol} min={0} max={1} step={0.05} onChange={(v) => { setVol(v); save("meccha_vol", v); setSoundVolume(v); }} />
      <label className="flex items-center gap-2 mt-3 text-sm font-bold"><input type="checkbox" checked={muted} onChange={onToggleMute} /> {t("Mute")}</label>
      <Opt label="Shadow Quality" value={shadow} options={[{ v: 0 as const, n: "Off" }, { v: 1 as const, n: "Low" }, { v: 2 as const, n: "High" }]} onChange={(v) => { setShadow(v); save("meccha_shadow", v); engine?.setShadowQuality(v); }} />
      <Opt label="Performance Mode" value={perf} options={onOff} onChange={(v) => { setPerf(v); save("meccha_perf", v ? 1 : 0); engine?.setPerformance(v); }} />
      <div className="flex gap-2 mt-4">
        <button onClick={onClose} className="flex-1 rounded-2xl bg-black text-white py-2.5 font-black">{t("Back to Game")}</button>
        <button onClick={onLeave} className="rounded-2xl border-[3px] border-black px-4 py-2 font-black">{t("Leave")}</button>
      </div>
    </Panel>
  );
}

function CheckPanel({ hud, onLike }: { hud: HudState; onLike: () => void }) {
  const res = hud.results ?? [];
  const winText = hud.win === "hiders" ? t("HIDERS WIN") : hud.win === "hunters" ? t("HUNTERS WIN") : res.find((r) => r.id === hud.win)?.n ? t("{n} WINS", { n: res.find((r) => r.id === hud.win)!.n }) : "";
  return (
    <>
      <div className="absolute top-[92px] left-1/2 -translate-x-1/2 z-20 text-center pointer-events-none">
        <div className="text-3xl font-black text-[#ffd23f]" style={{ textShadow: OUTLINE }}>{winText}</div>
        <div className="text-xs font-bold" style={{ textShadow: OUTLINE }}>
          <span className="text-[#ff5a5a]">■ {t("Red")}</span> {t("= not found")} · <span className="text-[#5a8dff]">■ {t("Blue")}</span> {t("= found")}
        </div>
      </div>
      <div className="absolute right-2 top-24 z-20 w-56 rounded-2xl bg-black/55 p-2 text-xs font-bold grid gap-0.5">
        <div className="text-center font-black mb-0.5">{t(hud.settings.mode === "double" ? "Finds" : hud.settings.missed ? "Missed Points" : "Results")}</div>
        {res.map((r, i) => (
          <div key={r.id} className="flex items-center gap-1.5">
            <span className="w-4 opacity-70">{i + 1}</span>
            <span className="w-2.5 h-2.5 rounded-full border border-black" style={{ background: r.c }} />
            <span className="truncate" style={{ color: r.r === "hunter" ? "#ffb703" : undefined }}>{r.n}</span>
            {r.r === "hider" && hud.settings.mode !== "double" && <span className={r.found ? "text-[#5a8dff]" : "text-[#ff5a5a]"}>{t(r.found ? "found" : "safe")}</span>}
            <span className="ml-auto tabular-nums">{r.p}</span>
          </div>
        ))}
      </div>
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5">
        {hud.likeTarget && !hud.likedThisRound && (
          <button onClick={onLike} className="rounded-2xl bg-black/60 px-4 py-2 text-lg font-black"><Key k="G" /> 👍 {hud.likeTarget}</button>
        )}
        {hud.likedThisRound && <div className="text-sm font-bold" style={{ textShadow: OUTLINE }}>👍 {t("Sent")}</div>}
        <div className="text-xs font-bold" style={{ textShadow: OUTLINE }}>
          <Key k="Y" /> {t("Skip")} ({hud.votes.have}/{hud.votes.need}) · {t("WASD / Space / Ctrl free camera")}
        </div>
      </div>
    </>
  );
}

function ChatInput({ onSend, onClose }: { onSend: (m: string) => void; onClose: () => void }) {
  const [v, setV] = useState("");
  return (
    <form className="flex gap-1 mt-0.5" onSubmit={(ev) => { ev.preventDefault(); if (v.trim()) onSend(v); setV(""); onClose(); }}>
      <input id="meccha-chat" autoFocus value={v} maxLength={120} onChange={(ev) => setV(ev.target.value)}
        onKeyDown={(ev) => { if (ev.key === "Escape") onClose(); ev.stopPropagation(); }} onBlur={() => { if (!v) onClose(); }}
        className="flex-1 min-w-0 rounded-lg bg-black/70 border border-white/40 px-2 py-1 text-white outline-none" placeholder={t("Chat")} dir="auto" />
      <button className="rounded-lg bg-white text-black px-2" aria-label="Send"><Send className="w-4 h-4" /></button>
    </form>
  );
}

// ---------- גלגל תנוחות ----------

function PoseWheel({ icons, current, hover, onPick, onClose, touch }: { icons: Record<string, string>; current: PoseId; hover: { current: PoseId | null }; onPick: (p: PoseId) => void; onClose: () => void; touch: boolean }) {
  const [page, setPage] = useState(Math.max(0, POSE_PAGES.findIndex((pg) => pg.includes(current))));
  const [hl, setHl] = useState<PoseId | null>(null);
  const list = POSE_PAGES[page];
  const R = 150;
  const S = R * 2 + 100;
  const fit = typeof window === "undefined" ? 1 : Math.min(1, (window.innerHeight - 16) / S, (window.innerWidth - 16) / S);
  const pick = (p: PoseId) => { hover.current = p; setHl(p); };
  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-black/20" onPointerDown={(ev) => { if (ev.target === ev.currentTarget) onClose(); }}>
      <div className="relative" style={{ width: S, height: S, transform: `scale(${fit})` }}>
        <div className="absolute rounded-full bg-black/45 border-4 border-white/60" style={{ inset: 50 }} />
        {list.map((p, i) => {
          const a = (i / list.length) * Math.PI * 2 - Math.PI / 2;
          const x = S / 2 + Math.cos(a) * R, y = S / 2 + Math.sin(a) * R;
          const on = (hl ?? current) === p;
          return (
            <button key={p} onPointerEnter={() => { if (!touch) pick(p); }} onClick={() => { pick(p); onPick(p); if (touch) onClose(); }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 w-[72px] h-[72px] rounded-full border-4 grid place-items-center overflow-hidden transition-transform ${on ? "bg-[#4cc9f0] border-[#0b5f8a] scale-110" : "bg-white/90 border-black/60"}`}
              style={{ left: x, top: y }} aria-label={p}>
              {icons[p] ? <img src={icons[p]} alt="" className="w-[66px] h-[66px] pointer-events-none" draggable={false} /> : null}
            </button>
          );
        })}
        {/* לוחצים על המרכז כדי לעבור עמוד */}
        <button onClick={() => { setPage((page + 1) % POSE_PAGES.length); setHl(null); hover.current = null; }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-black/60 border-4 border-white/70 font-black text-lg" aria-label="Next page">
          {page + 1}/{POSE_PAGES.length}
        </button>
      </div>
    </div>
  );
}

// ---------- פאנל צביעה ----------

function hsvToHex(h: number, s: number, v: number) {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  const to = (x: number) => Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, "0");
  return `#${to(f(5))}${to(f(3))}${to(f(1))}`;
}
function hexToHsv(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return { h, s: max ? d / max : 0, v: max };
}
const rgbOf = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const hex2 = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");

function ColorWheel({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const hsv = useMemo(() => hexToHsv(color), [color]);
  const S = 132;
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const g = c.getContext("2d")!;
    const img = g.createImageData(S, S);
    const R = S / 2;
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const dx = x - R, dy = y - R;
        const d = Math.hypot(dx, dy);
        const i = (y * S + x) * 4;
        if (d > R) { img.data[i + 3] = 0; continue; }
        const [r, gg, b] = rgbOf(hsvToHex(((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360, d / R, hsv.v));
        img.data[i] = r; img.data[i + 1] = gg; img.data[i + 2] = b; img.data[i + 3] = 255;
      }
    g.putImageData(img, 0, 0);
  }, [hsv.v]);
  function pick(ev: React.PointerEvent<HTMLCanvasElement>) {
    const r = ev.currentTarget.getBoundingClientRect();
    const dx = ((ev.clientX - r.left) / r.width) * S - S / 2;
    const dy = ((ev.clientY - r.top) / r.height) * S - S / 2;
    const s = Math.min(1, Math.hypot(dx, dy) / (S / 2));
    onChange(hsvToHex(((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360, s, hsv.v || 1));
  }
  const mx = 50 + Math.cos((hsv.h * Math.PI) / 180) * hsv.s * 50;
  const my = 50 + Math.sin((hsv.h * Math.PI) / 180) * hsv.s * 50;
  return (
    <div className="relative w-[112px] h-[112px] shrink-0">
      <canvas ref={ref} width={S} height={S} className="w-full h-full rounded-full cursor-crosshair touch-none"
        onPointerDown={(ev) => { ev.currentTarget.setPointerCapture(ev.pointerId); pick(ev); }}
        onPointerMove={(ev) => { if (ev.buttons) pick(ev); }} />
      <span className="absolute w-3.5 h-3.5 rounded-full border-2 border-white shadow pointer-events-none -translate-x-1/2 -translate-y-1/2" style={{ left: `${mx}%`, top: `${my}%`, background: color }} />
    </div>
  );
}

function Slider({ id, label, value, min, max, step, onChange, bg }: { id: string; label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; bg?: string }) {
  return (
    <label htmlFor={id} className="grid grid-cols-[62px_1fr_34px] items-center gap-1.5 text-[11px] font-bold">
      <span>{label}</span>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(ev) => onChange(Number(ev.target.value))}
        className="w-full h-2 rounded-full appearance-none accent-black" style={{ background: bg ?? "#ddd" }} />
      <span className="tabular-nums text-right">{step < 1 ? value.toFixed(2) : Math.round(value)}</span>
    </label>
  );
}

/** פס גרירה בסגנון בוחר הצבעים של המשחק (Unreal): פס צבעוני + שדה מספרי */
function Bar({ label, value, bg, onChange, max = 1, digits = 3 }: { label: string; value: number; bg: string; onChange: (v: number) => void; max?: number; digits?: number }) {
  const set = (ev: React.PointerEvent<HTMLDivElement>) => {
    const r = ev.currentTarget.getBoundingClientRect();
    onChange(Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) * max);
  };
  return (
    <div className="flex items-center gap-1">
      {label && <span className="w-2.5 text-[9px] opacity-80">{label}</span>}
      <div className="relative flex-1 h-[11px] rounded-[2px] cursor-ew-resize touch-none" style={{ background: bg }}
        onPointerDown={(ev) => { ev.currentTarget.setPointerCapture(ev.pointerId); set(ev); }} onPointerMove={(ev) => { if (ev.buttons) set(ev); }}>
        <span className="absolute top-[-1px] bottom-[-1px] w-[3px] bg-white border border-black -translate-x-1/2 pointer-events-none" style={{ left: `${(value / max) * 100}%` }} />
      </div>
      <input value={value.toFixed(digits)} onChange={(ev) => { const v = Number(ev.target.value); if (!Number.isNaN(v)) onChange(Math.max(0, Math.min(max, v))); }}
        className="w-[46px] bg-black/60 border border-white/15 rounded-[2px] px-1 text-[9px] tabular-nums outline-none" />
    </div>
  );
}

/** פס אנכי (בהירות / שקיפות) ליד הגלגל */
function VBar({ value, bg, onChange }: { value: number; bg: string; onChange: (v: number) => void }) {
  const set = (ev: React.PointerEvent<HTMLDivElement>) => {
    const r = ev.currentTarget.getBoundingClientRect();
    onChange(Math.max(0, Math.min(1, 1 - (ev.clientY - r.top) / r.height)));
  };
  return (
    <div className="relative w-[13px] h-[104px] cursor-ns-resize touch-none border border-white/20" style={{ background: bg }}
      onPointerDown={(ev) => { ev.currentTarget.setPointerCapture(ev.pointerId); set(ev); }} onPointerMove={(ev) => { if (ev.buttons) set(ev); }}>
      <span className="absolute left-[-2px] right-[-2px] h-[3px] bg-white border border-black -translate-y-1/2 pointer-events-none" style={{ top: `${(1 - value) * 100}%` }} />
    </div>
  );
}

const CHECKER = "repeating-conic-gradient(#999 0% 25%, #ddd 0% 50%) 50% / 8px 8px";

function PaintPanel({ hud, engine, touch }: { hud: HudState; engine: Engine | null; touch: boolean }) {
  const [srgb, setSrgb] = useState(true);
  const col = hud.pickPreview && hud.picking ? hud.pickPreview : hud.color;
  const hsv = hexToHsv(hud.color);
  const [r, g, b] = rgbOf(hud.color).map((x) => x / 255);
  const set = (color: string) => engine?.setBrush({ color });
  const setRgb = (i: number, v: number) => { const c = [r, g, b]; c[i] = v; set(`#${c.map((x) => hex2(x * 255)).join("")}`); };
  const [hexText, setHexText] = useState(hud.color);
  useEffect(() => setHexText(hud.color.slice(1).toUpperCase() + "FF"), [hud.color]);
  const hues = "linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)";
  const pal = Array.from({ length: 32 }, (_, i) => hud.history[i] ?? null);
  const preview = (c: string) => (srgb ? c : `color-mix(in srgb, ${c} 80%, #000)`);
  return (
    <div dir="ltr" className={`absolute z-20 left-0 ${touch ? "top-0" : "top-0"} flex text-white text-[10px]`} style={{ textShadow: "none" }}>
      {/* לשוניות הכלים בשמאל (פלטה / מכחולים) */}
      <div className="flex flex-col gap-1.5 pt-[190px] pl-1">
        <span className="w-9 h-9 rounded bg-white/90 grid place-items-center text-lg">🎨</span>
        <span className="w-9 h-9 rounded bg-white/70 grid place-items-center text-lg">🖌️</span>
      </div>
      <div className="flex flex-col gap-2 p-2">
        <div className="w-[250px] rounded bg-[#151515]/85 p-2 grid gap-1.5 max-h-[calc(100dvh-120px)] overflow-auto">
          <div className="flex gap-1.5 items-start">
            <ColorWheel color={hud.color} onChange={set} />
            <VBar value={hsv.v} bg={`linear-gradient(${hsvToHex(hsv.h, hsv.s, 1)},#000)`} onChange={(v) => set(hsvToHex(hsv.h, hsv.s, v))} />
            <VBar value={hud.alpha} bg={`linear-gradient(${hud.color},transparent), ${CHECKER}`} onChange={(v) => engine?.setBrush({ alpha: v })} />
            <div className="grid gap-1 flex-1">
              <div className="h-[34px] border border-white/20 grid">
                <div style={{ background: preview(col) }} />
                <div style={{ background: preview(hud.history[1] ?? hud.color) }} />
              </div>
              <label className="flex items-center gap-1 text-[9px]"><input type="checkbox" checked={srgb} onChange={(e) => setSrgb(e.target.checked)} className="w-2.5 h-2.5" /> {t("sRGB Preview")}</label>
              <button onPointerDown={() => engine?.setPicking(!hud.picking)} className={`h-6 w-7 rounded grid place-items-center ${hud.picking ? "bg-[#ffd23f] text-black" : "bg-white/10"}`} aria-label={t("3D Eyedropper")}><Pipette className="w-3.5 h-3.5" /></button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-[3px]">
            <Bar label="R" value={r} bg={`linear-gradient(90deg,#000,#f00)`} onChange={(v) => setRgb(0, v)} />
            <Bar label="H" value={hsv.h} max={360} digits={1} bg={hues} onChange={(v) => set(hsvToHex(v, hsv.s, hsv.v))} />
            <Bar label="G" value={g} bg={`linear-gradient(90deg,#000,#0f0)`} onChange={(v) => setRgb(1, v)} />
            <Bar label="S" value={hsv.s} bg={`linear-gradient(90deg,#fff,${hsvToHex(hsv.h, 1, 1)})`} onChange={(v) => set(hsvToHex(hsv.h, v, hsv.v))} />
            <Bar label="B" value={b} bg={`linear-gradient(90deg,#000,#00f)`} onChange={(v) => setRgb(2, v)} />
            <Bar label="V" value={hsv.v} bg={`linear-gradient(90deg,#000,${hsvToHex(hsv.h, hsv.s, 1)})`} onChange={(v) => set(hsvToHex(hsv.h, hsv.s, v))} />
            <Bar label="A" value={hud.alpha} bg={`linear-gradient(90deg,transparent,${hud.color}), ${CHECKER}`} onChange={(v) => engine?.setBrush({ alpha: v })} />
            <div className="flex items-center gap-1">
              <span className="text-[9px] opacity-80 whitespace-nowrap">Hex sRGB</span>
              <input value={hexText} onChange={(ev) => { const v = ev.target.value.replace(/[^0-9a-f]/gi, "").slice(0, 8); setHexText(v); if (v.length >= 6) set("#" + v.slice(0, 6).toLowerCase()); }}
                className="w-full bg-black/60 border border-white/15 rounded-[2px] px-1 text-[9px] uppercase outline-none" />
            </div>
          </div>
          {/* היסטוריית הצבעים */}
          <div className="flex gap-1 items-start">
            <span className="text-[11px] opacity-80 mt-[1px]">🕘</span>
            <div className="grid grid-cols-16 gap-[2px] flex-1" style={{ gridTemplateColumns: "repeat(16, minmax(0, 1fr))" }}>
              {pal.map((c, i) => (
                <button key={i} disabled={!c} onClick={() => c && set(c)} className={`aspect-square rounded-[1px] ${c === hud.color ? "outline outline-1 outline-white" : ""}`} style={{ background: c ?? "rgba(255,255,255,.07)" }} aria-label={c ?? "empty"} />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Bar label="" value={hud.metal} bg="linear-gradient(90deg,#333,#bbb)" onChange={(v) => engine?.setBrush({ metal: v })} />
            <Bar label="" value={hud.rough} bg="linear-gradient(90deg,#bbb,#333)" onChange={(v) => engine?.setBrush({ rough: v })} />
            <span className="-mt-1 text-[9px] opacity-80">{t("Metallic")}</span>
            <span className="-mt-1 text-[9px] opacity-80">{t("Roughness")}</span>
            <Bar label="" value={hud.emis} bg="linear-gradient(90deg,#222,#ffe9a8)" onChange={(v) => engine?.setBrush({ emis: v })} />
            <span />
            <span className="-mt-1 text-[9px] opacity-80">{t("Emissive")}</span>
          </div>
          <label className="flex items-center gap-1 text-[9px]"><input type="checkbox" checked={engine?.overwritePick ?? true} onChange={(e) => engine?.setOverwritePick(e.target.checked)} className="w-2.5 h-2.5" /> {t("Overwrite color picker on sample")}</label>
          <button onPointerDown={() => engine?.setPicking(!hud.picking)} className={`rounded py-1.5 font-bold flex items-center justify-center gap-1.5 ${hud.picking ? "bg-[#ffd23f] text-black" : "bg-white/10"}`}>
            <span className="w-3.5 h-3.5 bg-white rounded-[2px]" /> {t("3D Eyedropper")}
          </button>
        </div>
        {/* מדריך המקשים מתחת ללוח, כמו במשחק */}
        {!touch && (
          <div className="w-[160px] rounded bg-[#151515]/70 p-1.5 grid gap-1.5 text-[9px]">
            <div className="flex items-center gap-1.5"><Pipette className="w-4 h-4" /><KeyBox k="SPACE" color="#ffc21a" /><span>{t("3D Eyedropper (Hold)")}</span></div>
            <div className="flex items-center gap-1.5"><span className="w-4 text-center">◎</span><KeyBox k="RMB" /><span>{t("Brush Size")}</span></div>
            <div className="flex items-center gap-1.5"><span className="w-4 text-center">☀</span><KeyBox k="V" on={hud.shadow} /><span>{t(hud.shadow ? "Shadow" : "Shadow OFF")}</span></div>
            <div className="flex items-center gap-1.5"><span className="w-4 text-center">⟲</span><KeyBox k="MMB" /><span>{t("Rotate Camera")}</span></div>
            <div className="flex items-center gap-1.5"><span className="w-4 text-center">⌕</span><KeyBox k="Wheel" /><span>{t("Zoom")}</span></div>
            <div className="flex items-center gap-1.5"><span className="w-4 text-center">✕</span><KeyBox k="F" /><span>{t("Paint Mode")}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- מגע ----------

function TouchControls({ hud, engine, onPose, onChat }: { hud: HudState; engine: Engine | null; onPose: () => void; onChat: () => void }) {
  const hider = hud.alive && hud.myRole === "hider" && hud.phase !== "check";
  const hunter = hud.myRole === "hunter" && hud.phase === "hunt" && hud.alive;
  const b = "w-14 h-14 rounded-full bg-white/80 text-black border-[3px] border-black font-black text-xs active:scale-90";
  return (
    <>
      {!hud.paintMode && <Joystick onChange={(x, y) => engine?.setJoystick(x, y)} />}
      <div className="absolute right-3 bottom-4 z-20 grid grid-cols-3 gap-2 items-end">
        {hunter && <button className={`${b} !w-20 !h-20 !bg-[#ff4d4d] col-span-3 justify-self-end`} onPointerDown={() => engine?.fire()}>{t("FIRE")}</button>}
        {hider && <button className={b} onClick={() => engine?.togglePaint()}>{t(hud.paintMode ? "Done" : "Paint")}</button>}
        {hider && !hud.paintMode && <button className={b} onClick={onPose}>{t("Pose")}</button>}
        {hider && !hud.paintMode && <button className={b} onClick={() => engine?.placeClone()}>{t("Clone")}</button>}
        {hider && !hud.paintMode && <button className={b} onClick={() => engine?.whistle()}>♪</button>}
        {hud.attached && <button className={b} onClick={() => engine?.detach()}>{t("Leave")}</button>}
        {!hud.paintMode && <button className={`${b} !bg-[#8ef56b]`} onClick={() => engine?.jump()}>{t("Jump")}</button>}
        {hud.phase === "check" && <button className={b} onClick={() => engine?.giveLike()}>👍</button>}
        {(hud.phase === "hide" || hud.phase === "check") && <button className={b} onClick={() => engine?.voteSkip()}>{t("Skip")}</button>}
        {hud.spectating !== null && <button className={b} onClick={() => engine?.cycleSpectate()}>{t("Next")}</button>}
        <button className={b} onClick={onChat}>{t("Chat")}</button>
      </div>
    </>
  );
}

function Joystick({ onChange }: { onChange: (x: number, y: number) => void }) {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const base = useRef<HTMLDivElement>(null);
  const id = useRef<number | null>(null);
  const R = 48;
  function move(ev: React.PointerEvent) {
    const r = base.current!.getBoundingClientRect();
    let x = ev.clientX - (r.left + r.width / 2);
    let y = ev.clientY - (r.top + r.height / 2);
    const d = Math.hypot(x, y);
    if (d > R) { x = (x / d) * R; y = (y / d) * R; }
    setKnob({ x, y });
    onChange(x / R, -y / R);
  }
  function end() {
    id.current = null;
    setKnob({ x: 0, y: 0 });
    onChange(0, 0);
  }
  return (
    <div ref={base} className="absolute z-20 left-6 bottom-24 w-32 h-32 rounded-full bg-white/15 border-[3px] border-white/40" style={{ touchAction: "none" }}
      onPointerDown={(ev) => { id.current = ev.pointerId; ev.currentTarget.setPointerCapture(ev.pointerId); move(ev); }}
      onPointerMove={(ev) => { if (id.current === ev.pointerId) move(ev); }}
      onPointerUp={end} onPointerCancel={end}>
      <div className="absolute w-14 h-14 rounded-full bg-white/70 border-2 border-black left-1/2 top-1/2" style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }} />
    </div>
  );
}
