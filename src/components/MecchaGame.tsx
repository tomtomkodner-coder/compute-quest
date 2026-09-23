import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import confetti from "canvas-confetti";
import {
  Volume2, VolumeX, Home, Paintbrush, PaintBucket, Pipette, Eye, Timer, Play, Users, Crown, Bot, Copy,
  Undo2, Eraser, X, RotateCcw, RotateCw, Music, Crosshair, Heart, Target, LogIn, Plus, Wifi, Trophy,
} from "lucide-react";
import type { Engine, HudState, Settings, Tool } from "@/game/meccha/engine";
import { POSES, SIZES, type SizeId } from "@/game/meccha/character";
import type { Net } from "@/game/meccha/net";
import { setMuted as setSoundMuted } from "@/lib/sound";

const PLAYER_COLORS = ["#ff006e", "#3a86ff", "#ffbe0b", "#8338ec", "#fb5607", "#06d6a0", "#ef476f", "#118ab2"];
const SWATCHES = [
  "#f2f2f2", "#212529", "#6c757d", "#e63946", "#9d0208", "#ffb703", "#fb8500", "#ffd166",
  "#8ac926", "#2d6a4f", "#2a9d8f", "#219ebc", "#3a86ff", "#8338ec", "#ff006e", "#c98f5a",
  "#6f4518", "#f3e9d2", "#caf0f8", "#1b4332",
];
const MODE_LABEL: Record<Settings["mode"], string> = { normal: "רגיל", infection: "השד המתרבה", double: "כפול (2 ציידים)" };

function loadName() {
  try { return localStorage.getItem("meccha_name") || ""; } catch { return ""; }
}
function saveName(n: string) {
  try { localStorage.setItem("meccha_name", n); } catch { /* ignore */ }
}

type Conn = { kind: "local" } | { kind: "room" } | { kind: "p2p"; code: string; host: boolean };

export function MecchaGame() {
  const [screen, setScreen] = useState<"menu" | "game">("menu");
  const [name, setName] = useState("");
  const [color, setColor] = useState(PLAYER_COLORS[0]);
  const [muted, setMuted] = useState(false);
  const [conn, setConn] = useState<Conn>({ kind: "local" });
  const [roomNet, setRoomNet] = useState<Net | null | undefined>(undefined);
  const [joinCode, setJoinCode] = useState("");
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    setName(loadName() || `שחקן ${Math.floor(Math.random() * 90 + 10)}`);
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
    saveName(name.trim() || "שחקן");
    setConn(c);
    setRunId((r) => r + 1);
    setScreen("game");
  }

  if (screen === "game")
    return (
      <GameView
        key={runId}
        conn={conn}
        roomNet={roomNet ?? null}
        name={name.trim().slice(0, 14) || "שחקן"}
        color={color}
        muted={muted}
        onToggleMute={toggleMute}
        onExit={() => setScreen("menu")}
      />
    );

  return (
    <div className="relative min-h-screen px-4 py-6 sm:py-10" dir="rtl">
      <div className="relative z-10 mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="glass rounded-xl px-3 py-2 text-sm font-semibold inline-flex items-center gap-2 hover:scale-105 transition">
            <Home className="w-4 h-4" /> לטריוויה
          </Link>
          <button onClick={toggleMute} className="glass rounded-xl p-2.5 hover:scale-105 transition" aria-label="השתקה">
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>
        </div>

        <div className="text-center mb-8">
          <div className="text-6xl sm:text-7xl mb-2 float-slow">🦎🔫🎨</div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-1 text-gradient-shine" dir="ltr">MECCHA CHAMELEON</h1>
          <p className="text-lg font-bold mb-2">מֶצ'ה זיקית — מחבואים עם צבעים</p>
          <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto">
            זיקיות צובעות את עצמן כדי להיעלם בתוך האחוזה. ציידים עם רובי צבע מחפשים אותן — וכל פספוס עולה להם בחיים.
          </p>
        </div>

        <section className="glass-strong rounded-3xl p-5 sm:p-6 mb-4 grid gap-3">
          <label className="grid gap-1.5">
            <span className="font-bold">השם שלך</span>
            <input
              id="meccha-name"
              value={name}
              maxLength={14}
              onChange={(e) => setName(e.target.value)}
              className="bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-base outline-none focus:border-[var(--brand)]"
            />
          </label>
          <div className="grid gap-1.5">
            <span className="font-bold">הצבע שלך (לשם ולרובה)</span>
            <div className="flex flex-wrap gap-2">
              {PLAYER_COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)} aria-label={c}
                  className={`w-9 h-9 rounded-full border-2 ${color === c ? "border-white scale-110" : "border-white/20"}`} style={{ background: c }} />
              ))}
            </div>
          </div>
        </section>

        <section className="glass-strong rounded-3xl p-5 sm:p-6 mb-4 grid gap-3">
          <h2 className="font-bold text-lg flex items-center gap-2"><Users className="w-5 h-5" /> בחרו איך לשחק</h2>
          {roomNet && (
            <button onClick={() => go({ kind: "room" })} className="btn-primary rounded-2xl py-4 text-lg inline-flex items-center justify-center gap-2">
              <Wifi className="w-5 h-5" /> מרובה משתתפים — כל מי שפתח את הדף
            </button>
          )}
          <button onClick={() => go({ kind: "local" })} className={`${roomNet ? "glass" : "btn-primary"} rounded-2xl py-4 text-lg font-bold inline-flex items-center justify-center gap-2`}>
            <Bot className="w-5 h-5" /> לבד עם בוטים
          </button>
          {!roomNet && (
            <>
              <button
                onClick={async () => { const { randomCode } = await import("@/game/meccha/net"); go({ kind: "p2p", code: randomCode(), host: true }); }}
                className="glass rounded-2xl py-3.5 font-bold inline-flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" /> צור חדר אונליין עם קוד
              </button>
              <div className="flex gap-2">
                <input
                  id="meccha-code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))}
                  placeholder="קוד חדר"
                  dir="ltr"
                  className="flex-1 min-w-0 bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-lg tracking-[0.3em] text-center font-bold outline-none focus:border-[var(--brand)]"
                />
                <button
                  disabled={joinCode.length !== 5}
                  onClick={() => go({ kind: "p2p", code: joinCode, host: false })}
                  className="glass rounded-xl px-4 font-bold inline-flex items-center gap-2 disabled:opacity-40"
                >
                  <LogIn className="w-5 h-5" /> הצטרפות
                </button>
              </div>
            </>
          )}
          {roomNet === undefined && <p className="text-xs text-muted-foreground text-center">בודק אם יש חדר משותף...</p>}
        </section>

        <details className="glass rounded-3xl p-5 text-sm leading-relaxed">
          <summary className="font-bold text-base cursor-pointer">חוקים ומקשים</summary>
          <div className="mt-3 grid gap-3 text-muted-foreground">
            <p><b className="text-foreground">🦎 זיקית:</b> בשלב ההכנה מסתובבים באחוזה, פותחים צביעה (F), דוגמים צבעים עם הטפטפת (רווח) וצובעים את הגוף במכחול או בדלי. בוחרים תנוחה (R) — ואז קופאים. כל תזוזה מסגירה אתכם. זיקית שנמצאת מול צייד ולא נתפסת צוברת "נקודות החמצה".</p>
            <p><b className="text-foreground">🔫 צייד:</b> מחכים בחדר הנעול עד שהשער נפתח, ואז יורים ברובה הצבע על כל מה שנראה חשוד. כל פספוס מוריד 20 חיים. אפשר להפעיל הגבלת תחמושת: פספוס ‎-1, פגיעה ‎+1.</p>
            <p><b className="text-foreground">מצבים:</b> רגיל • השד המתרבה (מי שנתפס הופך לצייד) • כפול (שני ציידים).</p>
            <p dir="ltr" className="text-left">WASD move • Mouse look (click to lock, Esc to release) • Space jump / eyedropper • F paint • R poses • Z/C rotate body • Ctrl crouch • 1 whistle • Right-drag brush size • Ctrl+Z undo • Spectator: Space next, Q/E down/up</p>
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
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [hud, setHud] = useState<HudState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [poseMenu, setPoseMenu] = useState(false);
  const [touch, setTouch] = useState(false);
  const [lobbyOpen, setLobbyOpen] = useState(true);

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
        if (!alive || !mountRef.current) { if (net.kind === "p2p") net.close(); return; }
        eng = new Engine(mountRef.current, net, { name, color, muted, defaultBots: net.kind === "local" ? 4 : 2, onHud: setHud });
        eng.onPoseMenu = () => setPoseMenu((v) => !v);
        engineRef.current = eng;
        if (import.meta.env.DEV) (window as unknown as { __meccha: Engine }).__meccha = eng;
      } catch (e) {
        console.error(e);
        setError(e instanceof Error && /[֐-׿]/.test(e.message) ? e.message : "לא הצלחנו להפעיל את המשחק (תלת־ממד או חיבור).");
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
  useEffect(() => {
    setLobbyOpen(phase === "lobby");
    if (phase !== "hide" && phase !== "lobby") setPoseMenu(false);
  }, [phase]);

  const won = !!hud && hud.phase === "results" && ((hud.win === "hiders" && hud.myRole === "hider") || (hud.win === "hunters" && hud.myRole === "hunter"));
  useEffect(() => {
    if (won) confetti({ particleCount: 150, spread: 90, origin: { y: 0.35 } });
  }, [won]);

  const e = engineRef.current;
  const isHider = !!hud && hud.myRole === "hider" && hud.alive && (hud.phase === "lobby" || hud.phase === "hide" || hud.phase === "hunt");
  const isHunter = !!hud && hud.myRole === "hunter" && hud.phase !== "lobby";
  const phaseLabel = !hud ? "" : { lobby: "לובי", hide: "שלב ההכנה", hunt: "הציד!", results: "תוצאות" }[hud.phase];

  return (
    <div className="fixed inset-0 bg-black select-none overflow-hidden" dir="rtl">
      <div ref={mountRef} className="absolute inset-0" />

      {!hud && !error && <div className="absolute inset-0 flex items-center justify-center text-xl font-bold">{conn.kind === "p2p" ? "מתחבר לחדר..." : "טוען את האחוזה..."} 🦎</div>}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center bg-[#0b0c1f]">
          <p className="text-lg">{error}</p>
          <button onClick={onExit} className="btn-primary px-6 py-3 rounded-2xl">חזרה לתפריט</button>
        </div>
      )}

      {hud && (
        <>
          {isHunter && hud.phase === "hide" && (
            <div className="absolute inset-0 z-10 bg-[#07080f]/95 flex flex-col items-center justify-center text-center p-6">
              <div className="text-6xl mb-3">🔒</div>
              <h2 className="text-2xl sm:text-3xl font-extrabold mb-1">חדר הציידים נעול</h2>
              <p className="text-muted-foreground mb-3">הזיקיות מתחבאות וצובעות את עצמן...</p>
              <p className="text-7xl font-extrabold tabular-nums text-gradient-shine">{hud.time}</p>
            </div>
          )}

          <HitFlash t={hud.hitFlash} />

          <div className="absolute top-0 inset-x-0 p-2 sm:p-3 flex items-start justify-between gap-2 z-20 pointer-events-none" style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}>
            <div className="flex gap-1.5 pointer-events-auto">
              <button onClick={onExit} className="hud-btn" aria-label="יציאה"><Home className="w-5 h-5" /></button>
              <button onClick={onToggleMute} className="hud-btn" aria-label="השתקה">{muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}</button>
              <button onClick={() => setLobbyOpen((v) => !v)} className="hud-btn gap-1 px-2" aria-label="שחקנים"><Users className="w-4 h-4" /><span className="text-xs font-bold">{hud.players.length}</span></button>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className={`hud-pill text-lg sm:text-2xl font-extrabold tabular-nums ${hud.phase === "hunt" && hud.time <= 10 ? "text-rose-400 animate-pulse" : ""}`}>
                {hud.phase !== "lobby" && <><Timer className="w-5 h-5" /> {Math.floor(hud.time / 60)}:{String(hud.time % 60).padStart(2, "0")}</>}
                <span className="text-xs sm:text-sm font-bold opacity-85">{phaseLabel}</span>
              </div>
              {hud.phase !== "lobby" && (
                <div className="hud-pill text-xs sm:text-sm font-bold gap-3">
                  <span>🦎 {hud.hidersLeft}</span>
                  <span>🔫 {hud.huntersLeft}</span>
                  <span className="opacity-70">{hud.room}</span>
                </div>
              )}
            </div>
            <div className="flex gap-1.5 pointer-events-auto">
              {hud.net !== "local" && (
                <span className={`hud-btn px-2 text-xs font-bold gap-1 ${hud.connected ? "" : "text-rose-300"}`}>
                  <Wifi className="w-4 h-4" /> <span dir="ltr">{hud.code ?? "חי"}</span>
                </span>
              )}
            </div>
          </div>

          {hud.phase === "lobby" && lobbyOpen && <LobbyPanel hud={hud} engine={e} onClose={() => setLobbyOpen(false)} />}
          {hud.phase === "lobby" && !lobbyOpen && (
            <button onClick={() => setLobbyOpen(true)} className="absolute z-20 top-20 left-1/2 -translate-x-1/2 btn-primary px-5 py-2.5 rounded-2xl font-bold">
              {hud.isHost ? "לובי / התחל סיבוב" : "לובי"}
            </button>
          )}
          {hud.phase !== "lobby" && hud.phase !== "results" && lobbyOpen && <PlayersMini hud={hud} onClose={() => setLobbyOpen(false)} />}

          {hud.myRole === "hider" && hud.alive && hud.phase === "hunt" && (
            <div className="absolute top-24 sm:top-28 left-1/2 -translate-x-1/2 z-20 pointer-events-none hud-pill text-xs sm:text-sm font-bold">
              <Eye className="w-4 h-4" /> נקודות החמצה: {hud.pts} {hud.frozen && <span className="text-sky-300">🧊 קפוא</span>}
            </div>
          )}

          {isHunter && hud.phase === "hunt" && hud.alive && (
            <>
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
                <Crosshair className="w-8 h-8 text-white drop-shadow-[0_0_4px_rgba(0,0,0,0.9)]" strokeWidth={1.6} />
              </div>
              <div className="absolute bottom-4 inset-x-0 z-20 flex flex-col items-center gap-2 pointer-events-none" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
                <div className="hud-pill gap-3 font-bold">
                  <span className="flex items-center gap-1.5"><Heart className="w-4 h-4 text-rose-400" /> {hud.hp}</span>
                  <div className="w-32 h-2.5 rounded-full bg-black/50 overflow-hidden border border-white/20">
                    <div className="h-full transition-all" style={{ width: `${hud.hp}%`, background: hud.hp > 40 ? "#4ade80" : "#ff4d6d" }} />
                  </div>
                  {hud.settings.ammoLimit && <span className="flex items-center gap-1"><Target className="w-4 h-4" /> {hud.ammo}</span>}
                </div>
                {!touch && !hud.locked && <div className="hud-pill text-xs">לחצו על המסך כדי לכוון עם העכבר • לחיצה = ירייה • Esc לשחרור</div>}
              </div>
              {touch && (
                <button onPointerDown={() => e?.fire()} className="absolute z-20 left-6 bottom-28 w-24 h-24 rounded-full bg-rose-500/70 border-4 border-white/40 font-extrabold text-lg" aria-label="ירי">
                  ירי 🔫
                </button>
              )}
            </>
          )}

          {hud.spectating && hud.phase !== "results" && (
            <div className="absolute bottom-6 inset-x-0 z-20 flex justify-center pointer-events-none">
              <div className="hud-pill gap-3 pointer-events-auto">
                <Eye className="w-4 h-4" /> צופה: {hud.spectating}
                <button onClick={() => e?.cycleSpectate()} className="rounded-lg bg-white/15 px-2 py-0.5 text-xs font-bold">הבא</button>
              </div>
            </div>
          )}

          {isHider && !poseMenu && !(hud.phase === "lobby" && lobbyOpen) && (
            <div className="absolute bottom-0 inset-x-0 p-2 sm:p-3 z-20 flex flex-col items-center gap-2 pointer-events-none" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
              {hud.paintMode && <PaintPanel hud={hud} engine={e} />}
              <div className="flex flex-wrap justify-center gap-1.5 pointer-events-auto">
                <button onClick={() => e?.togglePaint()} className={`hud-btn px-3 gap-1.5 font-bold ${hud.paintMode ? "!bg-emerald-500/60" : ""}`}>
                  <Paintbrush className="w-4 h-4" /> {hud.paintMode ? "סיום" : <>צביעה<span className="hidden md:inline"> (F)</span></>}
                </button>
                <button onClick={() => setPoseMenu(true)} className="hud-btn px-3 gap-1.5 font-bold">
                  {POSES.find((p) => p.id === hud.pose)?.emoji} תנוחה<span className="hidden md:inline"> (R)</span>
                </button>
                <button onClick={() => e?.rotateBody(-1)} className="hud-btn" aria-label="סיבוב ימינה"><RotateCw className="w-4 h-4" /></button>
                <button onClick={() => e?.rotateBody(1)} className="hud-btn" aria-label="סיבוב שמאלה"><RotateCcw className="w-4 h-4" /></button>
                <button onClick={() => e?.whistle()} className="hud-btn" aria-label="שריקה"><Music className="w-4 h-4" /></button>
                {hud.phase !== "hunt" && (
                  <div className="hud-btn px-1.5 gap-0.5">
                    {SIZES.map((s) => (
                      <button key={s.id} onClick={() => e?.setMySize(s.id)} className={`rounded-lg px-1.5 py-0.5 text-xs font-bold ${hud.size === s.id ? "bg-[var(--brand)]/70" : ""}`}>{s.label}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {isHider && poseMenu && <PoseWheel current={hud.pose} onPick={(p) => { e?.setPose(p); setPoseMenu(false); }} onClose={() => setPoseMenu(false)} />}

          {touch && !hud.paintMode && !poseMenu && !(isHunter && hud.phase === "hide") && !(hud.phase === "lobby" && lobbyOpen) && (
            <>
              <Joystick onChange={(x, y) => e?.setJoystick(x, y)} />
              <button onPointerDown={() => e?.jump()} className="absolute z-20 left-6 bottom-56 w-16 h-16 rounded-full bg-white/15 border-2 border-white/30 backdrop-blur text-sm font-extrabold">קפיצה</button>
            </>
          )}

          {toast && (
            <div className="absolute top-32 sm:top-36 left-1/2 -translate-x-1/2 z-30 pointer-events-none hud-pill text-sm sm:text-base font-bold animate-pop max-w-[90vw] text-center !whitespace-normal">
              {toast}
            </div>
          )}

          {hud.phase === "results" && <Results hud={hud} />}
        </>
      )}
    </div>
  );
}

function HitFlash({ t }: { t: number }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!t) return;
    setOn(true);
    const x = window.setTimeout(() => setOn(false), 250);
    return () => window.clearTimeout(x);
  }, [t]);
  return <div className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-200 ${on ? "opacity-100" : "opacity-0"}`} style={{ boxShadow: "inset 0 0 120px 30px rgba(255,0,60,0.55)" }} />;
}

// ---------- לובי ----------

function LobbyPanel({ hud, engine, onClose }: { hud: HudState; engine: Engine | null; onClose: () => void }) {
  const s = hud.settings;
  const set = (p: Partial<Settings>) => engine?.setSettings(p);
  const humans = hud.players.filter((p) => !p.bot);
  const bots = hud.players.filter((p) => p.bot);
  const [copied, setCopied] = useState(false);
  return (
    <div className="absolute z-20 inset-x-0 top-16 sm:top-20 bottom-0 overflow-y-auto px-3 pb-6 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-xl glass-strong rounded-3xl p-4 sm:p-5 grid gap-4 animate-slide-up">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-extrabold">לובי — אחוזת המחבואים</h2>
          <button onClick={onClose} className="rounded-lg px-2.5 py-1.5 bg-white/10 text-xs font-bold inline-flex items-center gap-1" aria-label="סגירה">
            <X className="w-4 h-4" /> להסתובב בבית
          </button>
        </div>

        {hud.net === "p2p" && hud.code && (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center justify-between gap-2">
            <div>
              <div className="text-xs text-muted-foreground">קוד החדר — שלחו לחברים</div>
              <div className="text-3xl font-extrabold tracking-[0.3em]" dir="ltr">{hud.code}</div>
            </div>
            <button
              onClick={() => { navigator.clipboard?.writeText(hud.code!).then(() => setCopied(true)).catch(() => {}); }}
              className="glass rounded-xl px-3 py-2 text-sm font-bold inline-flex items-center gap-1.5"
            >
              <Copy className="w-4 h-4" /> {copied ? "הועתק" : "העתקה"}
            </button>
          </div>
        )}
        {hud.net === "room" && (
          <p className="text-sm text-muted-foreground">כל מי שפותח את הדף הזה נכנס ללובי. שתפו את הקישור כדי לשחק ביחד.</p>
        )}

        <div>
          <h3 className="font-bold mb-2 flex items-center gap-2"><Users className="w-4 h-4" /> שחקנים ({humans.length}) {bots.length > 0 && <span className="text-muted-foreground text-sm">+ {bots.length} בוטים</span>}</h3>
          <div className="grid grid-cols-2 gap-1.5">
            {hud.players.map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-xl bg-white/5 px-2.5 py-1.5 text-sm min-w-0">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: p.color }} />
                <span className="truncate flex-1">{p.name}{p.me && " (אני)"}</span>
                {p.host && <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />}
                {p.bot && <Bot className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                {!p.bot && p.pref !== "any" && <span className="text-xs">{p.pref === "hunter" ? "🔫" : "🦎"}</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <h3 className="font-bold">אני רוצה להיות</h3>
          <div className="grid grid-cols-3 gap-1.5">
            {([["any", "🎲 אקראי"], ["hider", "🦎 זיקית"], ["hunter", "🔫 צייד"]] as const).map(([v, l]) => (
              <Chip key={v} active={hud.pref === v} onClick={() => engine?.setPref(v)}>{l}</Chip>
            ))}
          </div>
          <h3 className="font-bold">גודל גוף</h3>
          <div className="grid grid-cols-3 gap-1.5">
            {SIZES.map((z) => <Chip key={z.id} active={hud.size === z.id} onClick={() => engine?.setMySize(z.id as SizeId)}>{z.label}</Chip>)}
          </div>
          <p className="text-xs text-muted-foreground">בזמן ההמתנה אפשר להסתובב בבית ולהתאמן בצביעה (F) ובתנוחות (R).</p>
        </div>

        <div className="grid gap-2">
          <h3 className="font-bold flex items-center gap-2">הגדרות משחק {!hud.isHost && <span className="text-xs text-muted-foreground font-normal">(רק המארח משנה)</span>}</h3>
          <fieldset disabled={!hud.isHost} className="grid gap-2 disabled:opacity-70">
            <Row label="מצב">
              {(Object.keys(MODE_LABEL) as Settings["mode"][]).map((m) => <Chip key={m} active={s.mode === m} onClick={() => set({ mode: m })}>{MODE_LABEL[m]}</Chip>)}
            </Row>
            <Row label="זמן הכנה">
              {[30, 60, 90, 120].map((v) => <Chip key={v} active={s.hideTime === v} onClick={() => set({ hideTime: v })}>{v}ש׳</Chip>)}
            </Row>
            <Row label="זמן ציד">
              {[120, 180, 240, 300].map((v) => <Chip key={v} active={s.huntTime === v} onClick={() => set({ huntTime: v })}>{v / 60} דק׳</Chip>)}
            </Row>
            {s.mode !== "double" && (
              <Row label="ציידים">
                {[1, 2, 3].map((v) => <Chip key={v} active={s.hunters === v} onClick={() => set({ hunters: v })}>{v}</Chip>)}
              </Row>
            )}
            <Row label="בוטים">
              {[0, 1, 2, 3, 4, 6, 8].map((v) => <Chip key={v} active={s.bots === v} onClick={() => set({ bots: v })}>{v}</Chip>)}
            </Row>
            <Row label="רמת בוטים">
              {(["קל", "רגיל", "קשה"] as const).map((l, i) => <Chip key={l} active={s.difficulty === i} onClick={() => set({ difficulty: i as 0 | 1 | 2 })}>{l}</Chip>)}
            </Row>
            <Row label="תחמושת">
              <Chip active={!s.ammoLimit} onClick={() => set({ ammoLimit: false })}>ללא הגבלה</Chip>
              {[3, 5, 10].map((v) => <Chip key={v} active={s.ammoLimit && s.ammo === v} onClick={() => set({ ammoLimit: true, ammo: v })}>{v}</Chip>)}
            </Row>
            <Row label="שריקה כפויה">
              {[0, 20, 40].map((v) => <Chip key={v} active={s.whistle === v} onClick={() => set({ whistle: v })}>{v ? `כל ${v}ש׳` : "כבוי"}</Chip>)}
            </Row>
          </fieldset>
        </div>

        {hud.isHost ? (
          <button onClick={() => engine?.startRound()} className="btn-primary rounded-2xl py-4 text-xl inline-flex items-center justify-center gap-2">
            <Play className="w-6 h-6 fill-current" /> התחל סיבוב
          </button>
        ) : (
          <div className="rounded-2xl bg-white/5 py-3 text-center font-bold">מחכים שהמארח יתחיל ⏳</div>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[84px_1fr] items-center gap-2">
      <span className="text-sm font-semibold">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`rounded-xl px-2.5 py-1.5 text-sm font-semibold border transition ${active ? "bg-[var(--brand)]/40 border-[var(--brand)]" : "bg-white/5 border-white/10 hover:bg-white/10"}`}>
      {children}
    </button>
  );
}

function PlayersMini({ hud, onClose }: { hud: HudState; onClose: () => void }) {
  const sorted = [...hud.players].sort((a, b) => (a.role === b.role ? 0 : a.role === "hunter" ? -1 : 1));
  return (
    <div className="absolute z-20 top-16 right-2 w-56 glass-strong rounded-2xl p-2.5 text-xs grid gap-1 max-h-[45vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-sm">שחקנים</span>
        <button onClick={onClose} className="rounded p-0.5 bg-white/10" aria-label="סגירה"><X className="w-3.5 h-3.5" /></button>
      </div>
      {sorted.map((p) => (
        <div key={p.id} className={`flex items-center gap-1.5 ${p.alive ? "" : "opacity-45 line-through"}`}>
          <span>{p.role === "hunter" ? "🔫" : p.role === "hider" ? "🦎" : "👀"}</span>
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="truncate flex-1">{p.name}{p.me && " (אני)"}</span>
          {p.role === "hunter" && <span className="tabular-nums">❤️{p.hp}</span>}
        </div>
      ))}
    </div>
  );
}

// ---------- צביעה ----------

function hsvToHex(h: number, s: number, v: number) {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  const to = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
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
        const hex = hsvToHex(((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360, d / R, hsv.v);
        img.data[i] = parseInt(hex.slice(1, 3), 16);
        img.data[i + 1] = parseInt(hex.slice(3, 5), 16);
        img.data[i + 2] = parseInt(hex.slice(5, 7), 16);
        img.data[i + 3] = 255;
      }
    g.putImageData(img, 0, 0);
  }, [hsv.v]);
  function pick(ev: React.PointerEvent<HTMLCanvasElement>) {
    const r = ev.currentTarget.getBoundingClientRect();
    const dx = ((ev.clientX - r.left) / r.width) * S - S / 2;
    const dy = ((ev.clientY - r.top) / r.height) * S - S / 2;
    const s = Math.min(1, Math.hypot(dx, dy) / (S / 2));
    onChange(hsvToHex(((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360, s, hsv.v));
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

function Slider({ id, label, value, min, max, step, onChange }: { id: string; label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <label htmlFor={id} className="grid grid-cols-[58px_1fr_34px] items-center gap-1.5 text-[11px] font-semibold">
      <span>{label}</span>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(ev) => onChange(Number(ev.target.value))} className="accent-[var(--brand)] w-full" />
      <span className="tabular-nums text-left" dir="ltr">{value.toFixed(step < 1 ? 2 : 0)}</span>
    </label>
  );
}

function PaintPanel({ hud, engine }: { hud: HudState; engine: Engine | null }) {
  const hsv = hexToHsv(hud.color);
  const recent = engine?.recentColors() ?? [];
  const tools: { id: Tool; icon: React.ReactNode; label: string }[] = [
    { id: "brush", icon: <Paintbrush className="w-4 h-4" />, label: "מכחול" },
    { id: "fill", icon: <PaintBucket className="w-4 h-4" />, label: "דלי" },
    { id: "picker", icon: <Pipette className="w-4 h-4" />, label: "טפטפת" },
  ];
  const hint = hud.tool === "picker" ? "לחצו על משהו בבית כדי לדגום את הצבע שלו" : hud.tool === "fill" ? "לחצו על חלק בגוף כדי למלא אותו" : "גררו על הגוף כדי לצבוע • גרירה בחוץ מסובבת • גרירה ימנית = גודל מכחול";
  return (
    <div className="pointer-events-auto glass-strong rounded-2xl p-2.5 w-full max-w-lg grid gap-2 animate-slide-up max-h-[52vh] overflow-y-auto">
      <div className="flex items-center gap-1.5">
        {tools.map((t) => (
          <button key={t.id} onClick={() => engine?.setTool(t.id)}
            className={`flex-1 rounded-xl py-2 text-xs font-bold inline-flex items-center justify-center gap-1 border ${hud.tool === t.id ? "border-[var(--brand)] bg-[var(--brand)]/40" : "border-white/10 bg-white/5"}`}>
            {t.icon} {t.label}
          </button>
        ))}
        <button disabled={!hud.canUndo} onClick={() => engine?.undo()} className="rounded-xl p-2 border border-white/10 bg-white/5 disabled:opacity-35" title="ביטול (Ctrl+Z)"><Undo2 className="w-4 h-4" /></button>
        <button onClick={() => engine?.clearPaint()} className="rounded-xl p-2 border border-white/10 bg-white/5" title="ניקוי"><Eraser className="w-4 h-4" /></button>
        <button onClick={() => engine?.togglePaint()} className="rounded-xl p-2 bg-white/10" aria-label="סגירה"><X className="w-4 h-4" /></button>
      </div>
      <div className="flex gap-2.5 items-start">
        <ColorWheel color={hud.color} onChange={(c) => engine?.setColor(c)} />
        <div className="flex-1 grid gap-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="w-8 h-8 rounded-lg border-2 border-white/40 shrink-0" style={{ background: hud.color }} />
            <input id="meccha-hex" dir="ltr" defaultValue={hud.color} key={hud.color}
              onBlur={(ev) => engine?.setColor(ev.target.value.trim())}
              onKeyDown={(ev) => { if (ev.key === "Enter") engine?.setColor((ev.target as HTMLInputElement).value.trim()); }}
              className="w-24 bg-white/5 border border-white/15 rounded-lg px-2 py-1 text-xs font-mono" />
          </div>
          <Slider id="hsv-h" label="גוון" value={Math.round(hsv.h)} min={0} max={359} step={1} onChange={(v) => engine?.setColor(hsvToHex(v, hsv.s, hsv.v))} />
          <Slider id="hsv-s" label="רוויה" value={hsv.s} min={0} max={1} step={0.01} onChange={(v) => engine?.setColor(hsvToHex(hsv.h, v, hsv.v))} />
          <Slider id="hsv-v" label="בהירות" value={hsv.v} min={0} max={1} step={0.01} onChange={(v) => engine?.setColor(hsvToHex(hsv.h, hsv.s, v))} />
          <Slider id="metal" label="מתכתיות" value={hud.metal} min={0} max={1} step={0.05} onChange={(v) => engine?.setMetal(v)} />
          <Slider id="rough" label="חספוס" value={hud.rough} min={0} max={1} step={0.05} onChange={(v) => engine?.setRough(v)} />
          <Slider id="brush" label="מכחול" value={hud.brush} min={0.02} max={0.4} step={0.01} onChange={(v) => engine?.setBrush(v)} />
        </div>
      </div>
      <div className="grid grid-cols-10 gap-1">
        {[...recent, ...SWATCHES.filter((c) => !recent.includes(c))].slice(0, 20).map((c) => (
          <button key={c} onClick={() => engine?.setColor(c)} aria-label={c}
            className={`h-6 rounded-md border ${hud.color.toLowerCase() === c ? "border-white ring-2 ring-white/60" : "border-white/20"}`} style={{ background: c }} />
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground text-center">{hint}</p>
    </div>
  );
}

function PoseWheel({ current, onPick, onClose }: { current: string; onPick: (p: (typeof POSES)[number]["id"]) => void; onClose: () => void }) {
  const R = 112;
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/35" onClick={onClose}>
      <div className="relative w-[290px] h-[290px] rounded-full glass-strong" onClick={(ev) => ev.stopPropagation()}>
        <div className="absolute inset-0 flex items-center justify-center text-sm font-bold pointer-events-none">בחרו תנוחה</div>
        {POSES.map((p, i) => {
          const a = (i / POSES.length) * Math.PI * 2 - Math.PI / 2;
          return (
            <button key={p.id} onClick={() => onPick(p.id)}
              className={`absolute w-16 h-16 -translate-x-1/2 -translate-y-1/2 rounded-full flex flex-col items-center justify-center border-2 transition hover:scale-110 ${current === p.id ? "bg-[var(--brand)]/70 border-white" : "bg-black/40 border-white/20"}`}
              style={{ left: 145 + Math.cos(a) * R, top: 145 + Math.sin(a) * R }}>
              <span className="text-xl leading-none">{p.emoji}</span>
              <span className="text-[10px] font-bold">{p.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- תוצאות ----------

function Results({ hud }: { hud: HudState }) {
  const rows = hud.results ?? [];
  return (
    <div className="absolute inset-0 z-40 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-strong rounded-3xl p-5 sm:p-7 max-w-md w-full text-center animate-pop max-h-[90vh] overflow-y-auto">
        <div className="text-6xl mb-1">{hud.win === "hiders" ? "🦎" : "🔫"}</div>
        <h2 className="text-3xl sm:text-4xl font-extrabold mb-1 text-gradient-shine">{hud.win === "hiders" ? "הזיקיות ניצחו!" : "הציידים ניצחו!"}</h2>
        <p className="text-muted-foreground mb-4">{hud.why}</p>
        <h3 className="font-bold mb-2 flex items-center justify-center gap-2"><Trophy className="w-4 h-4 text-amber-300" /> דירוג נקודות החמצה</h3>
        <ol className="grid gap-1.5 text-right mb-4">
          {rows.map((r, i) => (
            <li key={r.id} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm">
              <span className="w-5 text-center font-bold">{i === 0 && r.p > 0 ? "👑" : i + 1}</span>
              <span className="w-3 h-3 rounded-full" style={{ background: r.c }} />
              <span className="flex-1 truncate">{r.n}{r.b && " 🤖"}</span>
              <span>{r.r === "hunter" ? "🔫" : "🦎"}</span>
              <span className={`text-xs ${r.a ? "text-emerald-300" : "text-rose-300"}`}>{r.r === "hider" ? (r.a ? "שרד/ה" : "נתפס/ה") : r.a ? "בחיים" : "נפל/ה"}</span>
              <span className="font-extrabold tabular-nums w-8 text-left">{r.p}</span>
            </li>
          ))}
        </ol>
        <p className="text-xs text-muted-foreground">חוזרים ללובי בעוד {hud.time} שניות...</p>
      </div>
    </div>
  );
}

// ---------- ג'ויסטיק ----------

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
    <div ref={base} className="absolute z-20 right-6 bottom-28 w-32 h-32 rounded-full bg-white/10 border-2 border-white/25 backdrop-blur" style={{ touchAction: "none" }}
      onPointerDown={(ev) => { id.current = ev.pointerId; ev.currentTarget.setPointerCapture(ev.pointerId); move(ev); }}
      onPointerMove={(ev) => { if (id.current === ev.pointerId) move(ev); }}
      onPointerUp={end} onPointerCancel={end}>
      <div className="absolute w-14 h-14 rounded-full bg-white/60 left-1/2 top-1/2" style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }} />
    </div>
  );
}
