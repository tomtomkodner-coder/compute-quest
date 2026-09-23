import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import confetti from "canvas-confetti";
import {
  Volume2, VolumeX, Home, Paintbrush, PaintBucket, Pipette, Eye, Timer, Play, RotateCw,
  X, Check, Undo2, Search, Keyboard,
} from "lucide-react";
import type { Engine, HudState, Mode, Difficulty, Tool } from "@/game/meccha/engine";
import { POSES, SIZES, type SizeId } from "@/game/meccha/character";
import { sfxClick, setMuted as setSoundMuted } from "@/lib/sound";

const SWATCHES = [
  "#f2f2f2", "#212529", "#e63946", "#d62828", "#ffb703", "#fb8500", "#ffd166", "#8ac926",
  "#2a9d8f", "#219ebc", "#3a86ff", "#8338ec", "#ff006e", "#c98f5a", "#6b4226", "#adb5bd",
];

export function MecchaGame() {
  const [screen, setScreen] = useState<"menu" | "game">("menu");
  const [mode, setMode] = useState<Mode>("hide");
  const [size, setSize] = useState<SizeId>("normal");
  const [difficulty, setDifficulty] = useState<Difficulty>(1);
  const [muted, setMuted] = useState(false);
  const [runId, setRunId] = useState(0);

  function toggleMute() {
    const v = !muted;
    setMuted(v);
    setSoundMuted(v);
  }

  if (screen === "game")
    return (
      <GameView
        key={runId}
        mode={mode}
        size={size}
        difficulty={difficulty}
        muted={muted}
        onToggleMute={toggleMute}
        onRestart={() => setRunId((r) => r + 1)}
        onMenu={() => setScreen("menu")}
      />
    );

  return (
    <div className="relative min-h-screen px-4 py-6 sm:py-10">
      <div className="relative z-10 mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="glass rounded-xl px-3 py-2 text-sm font-semibold inline-flex items-center gap-2 hover:scale-105 transition">
            <Home className="w-4 h-4" /> לטריוויה
          </Link>
          <button onClick={toggleMute} className="glass rounded-xl p-2.5 hover:scale-105 transition" aria-label="השתק">
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>
        </div>

        <div className="text-center mb-8">
          <div className="text-6xl sm:text-7xl mb-2 float-slow">🦎🎨</div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-2 text-gradient-shine" dir="ltr">
            MECCHA CHAMELEON
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-lg mx-auto">
            מחבואים בתלת־ממד: צבע/י את הגוף שלך כדי להתמזג עם הבית, בחר/י תנוחה — ואל תזוז/י כשהשומרים עוברים לידך.
          </p>
        </div>

        <section className="glass-strong rounded-3xl p-5 sm:p-6 mb-4">
          <h2 className="font-bold text-lg mb-3">בחר/י תפקיד</h2>
          <div className="grid grid-cols-2 gap-3">
            <RoleCard active={mode === "hide"} onClick={() => setMode("hide")} emoji="🦎" title="זיקית" sub="מתחבאים מהשומרים" />
            <RoleCard active={mode === "seek"} onClick={() => setMode("seek")} emoji="🔨" title="צייד" sub="מוצאים את הזיקיות" />
          </div>
        </section>

        {mode === "hide" && (
          <section className="glass-strong rounded-3xl p-5 sm:p-6 mb-4">
            <h2 className="font-bold text-lg mb-3">גודל הזיקית</h2>
            <div className="grid grid-cols-3 gap-2">
              {SIZES.map((s) => (
                <Chip key={s.id} active={size === s.id} onClick={() => setSize(s.id)}>
                  <span style={{ fontSize: s.id === "petite" ? 16 : s.id === "normal" ? 22 : 28 }}>🦎</span> {s.label}
                </Chip>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">קטן = קל להסתתר. שמנמן = רואים אותך יותר.</p>
          </section>
        )}

        <section className="glass-strong rounded-3xl p-5 sm:p-6 mb-6">
          <h2 className="font-bold text-lg mb-3">רמת קושי</h2>
          <div className="grid grid-cols-3 gap-2">
            {(["קל", "רגיל", "קשה"] as const).map((l, i) => (
              <Chip key={l} active={difficulty === i} onClick={() => setDifficulty(i as Difficulty)}>{l}</Chip>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {mode === "hide"
              ? `${[2, 3, 4][difficulty]} שומרים • ${[1, 2, 3][difficulty]} זיקיות נוספות בצוות שלך`
              : `${[4, 6, 8][difficulty]} זיקיות מוסתרות • 150 שניות`}
          </p>
        </section>

        <div className="text-center">
          <button
            onClick={() => { if (!muted) sfxClick(); setRunId((r) => r + 1); setScreen("game"); }}
            className="btn-primary inline-flex items-center gap-3 px-12 py-4 rounded-2xl text-xl sm:text-2xl"
          >
            <Play className="w-6 h-6 fill-current" /> שחק
          </button>
        </div>

        <details className="glass rounded-3xl p-5 mt-8 text-sm leading-relaxed">
          <summary className="font-bold text-base cursor-pointer">איך משחקים?</summary>
          <div className="mt-3 grid gap-3 text-muted-foreground">
            <p>
              <b className="text-foreground">🦎 זיקית:</b> יש לך דקה של הכנה. מצא/י מקום, פתח/י צביעה (F), דגום/דגמי צבע מהסביבה עם הטפטפת (E)
              וצבע/י את הגוף — אפשר גם למלא חלק שלם בדלי (G). בחר/י תנוחה (1–6) שמתאימה למקום. השומרים משווים את הצבעים שלך
              למה שמאחוריך, שמים לב לצללית — ורואים מיד כל תזוזה. תשרוד/י עד הסוף כדי לנצח!
            </p>
            <p>
              <b className="text-foreground">🔨 צייד:</b> הזיקיות מתחבאות בבית. חפש/י משהו שלא נראה במקום — צבע מוזר, צורה משונה — ולחץ/י עליו כדי
              להנחית פטיש. פספוס עולה 5 שניות.
            </p>
            <p className="flex items-center gap-2"><Keyboard className="w-4 h-4" /> WASD לזוז • רווח לקפוץ • גרירה לסובב מצלמה • גלגלת לזום • V מבט השומר</p>
          </div>
        </details>
      </div>
    </div>
  );
}

function RoleCard({ active, onClick, emoji, title, sub }: { active: boolean; onClick: () => void; emoji: string; title: string; sub: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl p-4 text-center border-2 transition ${active ? "border-[var(--brand)] bg-[var(--brand)]/20 scale-[1.02]" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
    >
      <div className="text-4xl mb-1">{emoji}</div>
      <div className="font-extrabold text-lg">{title}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </button>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-3 py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-1.5 border transition ${
        active ? "bg-[var(--brand)]/30 border-[var(--brand)]" : "bg-white/5 border-white/10 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

// ================= GAME VIEW =================

function GameView({
  mode, size, difficulty, muted, onToggleMute, onRestart, onMenu,
}: {
  mode: Mode; size: SizeId; difficulty: Difficulty; muted: boolean;
  onToggleMute: () => void; onRestart: () => void; onMenu: () => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [hud, setHud] = useState<HudState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    setTouch(window.matchMedia("(pointer: coarse)").matches);
    let alive = true;
    let eng: Engine | null = null;
    import("@/game/meccha/engine")
      .then(({ Engine }) => {
        if (!alive || !mountRef.current) return;
        try {
          eng = new Engine(mountRef.current, { mode, size, difficulty, muted, onHud: setHud });
          engineRef.current = eng;
          if (import.meta.env.DEV) (window as unknown as { __meccha: Engine }).__meccha = eng;
        } catch (e) {
          console.error(e);
          setError("הדפדפן לא הצליח להפעיל תלת־ממד (WebGL).");
        }
      })
      .catch((e) => {
        console.error(e);
        setError("טעינת המשחק נכשלה.");
      });
    return () => {
      alive = false;
      eng?.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { engineRef.current?.setMuted(muted); }, [muted]);

  // הודעות קופצות
  const toastId = hud?.toast?.id;
  useEffect(() => {
    if (!hud?.toast) return;
    setToast(hud.toast.text);
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toastId]);

  const resultWin = hud?.result?.win;
  useEffect(() => {
    if (resultWin) confetti({ particleCount: 140, spread: 90, origin: { y: 0.4 } });
  }, [resultWin]);

  const e = engineRef.current;
  const phaseLabel = !hud ? "" : hud.phase === "prep" ? (mode === "hide" ? "הכנה" : "הזיקיות מתחבאות") : hud.phase === "hunt" ? "ציד!" : "סוף";

  return (
    <div className="fixed inset-0 bg-black select-none" dir="rtl">
      <div ref={mountRef} className="absolute inset-0" />

      {!hud && !error && (
        <div className="absolute inset-0 flex items-center justify-center text-xl font-bold">טוען את הבית... 🦎</div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-lg">{error}</p>
          <button onClick={onMenu} className="btn-primary px-6 py-3 rounded-2xl">חזרה</button>
        </div>
      )}

      {hud && (
        <>
          {/* מסך "עיניים סגורות" לצייד בזמן ההכנה */}
          {mode === "seek" && hud.phase === "prep" && (
            <div className="absolute inset-0 bg-[#0b0c1f] flex flex-col items-center justify-center text-center p-6 z-10">
              <div className="text-7xl mb-4">🙈</div>
              <h2 className="text-3xl font-extrabold mb-2">הזיקיות מתחבאות...</h2>
              <p className="text-6xl font-extrabold tabular-nums text-gradient-shine">{Math.ceil(hud.time)}</p>
            </div>
          )}

          {/* סרגל עליון */}
          <div className="absolute top-0 inset-x-0 p-2 sm:p-3 flex items-start justify-between gap-2 z-20 pointer-events-none">
            <div className="flex gap-2 pointer-events-auto">
              <button onClick={onMenu} className="hud-btn" aria-label="תפריט"><Home className="w-5 h-5" /></button>
              <button onClick={onToggleMute} className="hud-btn" aria-label="השתק">
                {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
              </button>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className={`hud-pill text-lg sm:text-2xl font-extrabold tabular-nums ${hud.phase === "hunt" && hud.time <= 10 ? "text-rose-400 animate-pulse" : ""}`}>
                <Timer className="w-5 h-5" /> {Math.ceil(hud.time)}
                <span className="text-xs sm:text-sm font-semibold opacity-80">{phaseLabel}</span>
              </div>
              <div className="hud-pill text-sm font-bold">🦎 {hud.hidersLeft}/{hud.hidersTotal}</div>
            </div>
            <div className="flex gap-2 pointer-events-auto">
              {hud.phase === "prep" && mode === "hide" && (
                <button onClick={() => e?.skipPrep()} className="hud-btn px-3 text-sm font-bold gap-1"><Check className="w-4 h-4" /> מוכן/ה</button>
              )}
              {mode === "seek" && hud.phase === "hunt" && (
                <button onClick={() => e?.hint()} className="hud-btn px-3 text-sm font-bold gap-1"><Search className="w-4 h-4" /> רמז</button>
              )}
            </div>
          </div>

          {/* מד חשד */}
          {mode === "hide" && hud.phase === "hunt" && (
            <div className="absolute top-28 sm:top-32 left-1/2 -translate-x-1/2 z-20 pointer-events-none w-48">
              <div className="flex items-center gap-2 text-xs font-bold mb-1 justify-center">
                <Eye className="w-4 h-4" /> חשד {hud.frozen && <span className="text-sky-300">🧊 קפוא</span>}
              </div>
              <div className="h-2.5 rounded-full bg-black/50 overflow-hidden border border-white/20">
                <div
                  className="h-full transition-all duration-200"
                  style={{
                    width: `${hud.suspicion * 100}%`,
                    background: hud.suspicion > 0.6 ? "#ff4d6d" : hud.suspicion > 0.3 ? "#ffd60a" : "#4ade80",
                  }}
                />
              </div>
            </div>
          )}

          {/* כוונת לצייד */}
          {mode === "seek" && hud.phase === "hunt" && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none text-white/70 text-2xl">+</div>
          )}

          {/* הודעה */}
          {toast && (
            <div className="absolute top-40 sm:top-44 left-1/2 -translate-x-1/2 z-30 pointer-events-none hud-pill text-sm sm:text-base font-bold animate-pop max-w-[90vw] text-center">
              {toast}
            </div>
          )}

          {/* סרגל כלים תחתון לזיקית */}
          {mode === "hide" && hud.phase !== "end" && (
            <div className="absolute bottom-0 inset-x-0 p-2 sm:p-3 z-20 flex flex-col items-center gap-2 pointer-events-none">
              {hud.paintMode && <PaintPanel hud={hud} engine={e} />}
              <div className="flex flex-wrap justify-center gap-1.5 pointer-events-auto">
                {POSES.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => e?.setPose(p.id)}
                    className={`hud-btn flex-col h-auto py-1.5 px-2 min-w-[52px] ${hud.pose === p.id ? "!bg-[var(--brand)]/60 !border-[var(--brand)]" : ""}`}
                    title={`${p.label} (${i + 1})`}
                  >
                    <span className="text-lg leading-none">{p.emoji}</span>
                    <span className="text-[10px] font-bold">{p.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5 pointer-events-auto">
                <button onClick={() => e?.togglePaint()} className={`hud-btn px-4 gap-1.5 font-bold ${hud.paintMode ? "!bg-emerald-500/60" : ""}`}>
                  <Paintbrush className="w-4 h-4" /> {hud.paintMode ? "סיום צביעה" : "צביעה (F)"}
                </button>
                <button onClick={() => e?.toggleSeekerView()} className={`hud-btn px-4 gap-1.5 font-bold ${hud.seekerView ? "!bg-amber-500/60" : ""}`}>
                  <Eye className="w-4 h-4" /> מבט השומר
                </button>
                {hud.phase === "prep" && (
                  <div className="hud-btn px-2 gap-1">
                    {SIZES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => e?.setPlayerSize(s.id)}
                        className={`rounded-lg px-1.5 py-0.5 text-xs font-bold ${hud.size === s.id ? "bg-[var(--brand)]/60" : ""}`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* שליטה במגע */}
          {touch && hud.phase !== "end" && !hud.paintMode && !(mode === "seek" && hud.phase === "prep") && (
            <>
              <Joystick onChange={(x, y) => e?.setJoystick(x, y)} />
              <button
                onPointerDown={() => e?.jump()}
                className="absolute z-20 left-5 bottom-44 w-16 h-16 rounded-full bg-white/15 border-2 border-white/30 backdrop-blur text-sm font-extrabold"
              >
                קפיצה
              </button>
            </>
          )}

          {!touch && hud.phase !== "end" && (
            <div className="absolute bottom-2 left-3 z-10 text-[11px] text-white/60 pointer-events-none hidden md:block" dir="ltr">
              {mode === "hide" ? "WASD move • Space jump • F paint • E picker • G fill • 1-6 poses • V seeker view • drag = camera" : "WASD move • Space jump • click = hammer • drag = camera"}
            </div>
          )}

          {/* סוף */}
          {hud.phase === "end" && hud.result && (
            <div className="absolute inset-0 z-40 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="glass-strong rounded-3xl p-6 sm:p-8 max-w-md w-full text-center animate-pop">
                <div className="text-6xl mb-2">{hud.result.win ? "🏆" : "💥"}</div>
                <h2 className="text-3xl sm:text-4xl font-extrabold mb-2 text-gradient-shine">{hud.result.title}</h2>
                <p className="text-muted-foreground mb-6">{hud.result.msg}</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={onRestart} className="btn-primary rounded-2xl py-3.5 font-bold inline-flex items-center justify-center gap-2">
                    <RotateCw className="w-5 h-5" /> שוב
                  </button>
                  <button onClick={onMenu} className="glass rounded-2xl py-3.5 font-bold inline-flex items-center justify-center gap-2">
                    <Home className="w-5 h-5" /> תפריט
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PaintPanel({ hud, engine }: { hud: HudState; engine: Engine | null }) {
  const tools: { id: Tool; icon: React.ReactNode; label: string }[] = [
    { id: "brush", icon: <Paintbrush className="w-4 h-4" />, label: "מכחול" },
    { id: "fill", icon: <PaintBucket className="w-4 h-4" />, label: "דלי" },
    { id: "picker", icon: <Pipette className="w-4 h-4" />, label: "טפטפת" },
  ];
  const hint =
    hud.tool === "picker" ? "לחץ/י על משהו בחדר כדי לדגום את הצבע שלו"
      : hud.tool === "fill" ? "לחץ/י על חלק בגוף כדי למלא אותו"
        : "גרור/י על הגוף כדי לצבוע • גרירה בחוץ מסובבת";
  return (
    <div className="pointer-events-auto glass-strong rounded-2xl p-2.5 w-full max-w-md grid gap-2 animate-slide-up">
      <div className="flex items-center gap-1.5">
        {tools.map((t) => (
          <button
            key={t.id}
            onClick={() => engine?.setTool(t.id)}
            className={`flex-1 rounded-xl py-2 text-xs font-bold inline-flex items-center justify-center gap-1 border ${hud.tool === t.id ? "border-[var(--brand)] bg-[var(--brand)]/40" : "border-white/10 bg-white/5"}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
        <label className="relative w-10 h-9 rounded-xl border-2 border-white/40 overflow-hidden shrink-0 cursor-pointer" style={{ background: hud.color }} title="בחירת צבע">
          <input type="color" value={hud.color} onChange={(ev) => engine?.setColor(ev.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
        </label>
        <button onClick={() => engine?.resetBody()} className="rounded-xl p-2 border border-white/10 bg-white/5" title="איפוס לבן">
          <Undo2 className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-8 gap-1">
        {SWATCHES.map((c) => (
          <button
            key={c}
            onClick={() => engine?.setColor(c)}
            className={`h-6 rounded-md border ${hud.color.toLowerCase() === c ? "border-white ring-2 ring-white/60" : "border-white/20"}`}
            style={{ background: c }}
            aria-label={c}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs font-semibold">
        <span>מכחול</span>
        <input
          type="range" min={0.02} max={0.3} step={0.01} value={hud.brush}
          onChange={(ev) => engine?.setBrush(Number(ev.target.value))}
          className="flex-1 accent-[var(--brand)]"
        />
        <button onClick={() => engine?.togglePaint()} className="rounded-lg p-1 bg-white/10" aria-label="סגור"><X className="w-4 h-4" /></button>
      </div>
      <p className="text-[11px] text-muted-foreground text-center">{hint}</p>
    </div>
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
    <div
      ref={base}
      className="absolute z-20 right-5 bottom-40 w-32 h-32 rounded-full bg-white/10 border-2 border-white/25 backdrop-blur"
      style={{ touchAction: "none" }}
      onPointerDown={(ev) => { id.current = ev.pointerId; ev.currentTarget.setPointerCapture(ev.pointerId); move(ev); }}
      onPointerMove={(ev) => { if (id.current === ev.pointerId) move(ev); }}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div
        className="absolute w-14 h-14 rounded-full bg-white/60 left-1/2 top-1/2"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
    </div>
  );
}
