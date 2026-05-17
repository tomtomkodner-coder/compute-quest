import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import {
  Crown, Trophy, Medal, Zap, Flame, Timer, Volume2, VolumeX,
  Sparkles, Award, RotateCw, Play, Check, X, ChevronLeft,
} from "lucide-react";
import { prepareGame, type PreparedQuestion, LEADERBOARD } from "@/lib/trivia-data";
import {
  sfxClick, sfxCorrect, sfxWrong, sfxWin, sfxTick, startMusic, stopMusic,
} from "@/lib/sound";

type Screen = "start" | "playing" | "end";

const QUESTION_TIME = 20;
const TOTAL = 15;

function levelFromXP(xp: number) {
  const level = Math.floor(xp / 200) + 1;
  const progress = (xp % 200) / 200;
  return { level, progress };
}

export function TriviaGame() {
  const [screen, setScreen] = useState<Screen>("start");
  const [questions, setQuestions] = useState<PreparedQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [xp, setXp] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [muted, setMuted] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const timerRef = useRef<number | null>(null);

  const current = questions[idx];

  useEffect(() => {
    if (screen !== "playing" || locked) return;
    setTimeLeft(QUESTION_TIME);
    timerRef.current = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          handleAnswer(-1);
          return 0;
        }
        if (t <= 5 && !muted) sfxTick();
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, screen]);

  useEffect(() => () => stopMusic(), []);

  function startGame() {
    if (!muted) sfxClick();
    setQuestions(prepareGame().slice(0, TOTAL));
    setIdx(0);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setXp(0);
    setCorrectCount(0);
    setSelected(null);
    setLocked(false);
    setScreen("playing");
    if (!muted) startMusic();
  }

  function handleAnswer(choice: number) {
    if (locked) return;
    setLocked(true);
    if (timerRef.current) clearInterval(timerRef.current);
    setSelected(choice);
    const isCorrect = choice === current.correctIndex;

    if (isCorrect) {
      if (!muted) sfxCorrect();
      const timeBonus = timeLeft * 8;
      const comboBonus = combo * 40;
      const points = 100 + timeBonus + comboBonus;
      setScore((s) => s + points);
      setXp((x) => x + 50 + combo * 15);
      setCombo((c) => {
        const next = c + 1;
        setMaxCombo((m) => Math.max(m, next));
        return next;
      });
      setCorrectCount((c) => c + 1);
      if (combo + 1 >= 3) {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.5 },
          colors: ["#a78bfa", "#60a5fa", "#22d3ee", "#f472b6"],
        });
      }
    } else {
      if (!muted) sfxWrong();
      setCombo(0);
    }

    const willEnd = idx + 1 >= questions.length;
    setTimeout(() => {
      if (willEnd) {
        endGame(isCorrect);
      } else {
        setIdx((i) => i + 1);
        setSelected(null);
        setLocked(false);
      }
    }, 1900);
  }

  function endGame(lastCorrect: boolean) {
    setScreen("end");
    stopMusic();
    const total = correctCount + (lastCorrect ? 1 : 0);
    if (total >= questions.length * 0.6) {
      if (!muted) sfxWin();
      confetti({
        particleCount: 220, spread: 160, origin: { y: 0.35 },
        colors: ["#a78bfa", "#60a5fa", "#22d3ee", "#f472b6", "#fbbf24"],
      });
      setTimeout(() => {
        confetti({ particleCount: 120, angle: 60, spread: 80, origin: { x: 0 } });
        confetti({ particleCount: 120, angle: 120, spread: 80, origin: { x: 1 } });
      }, 450);
    }
  }

  function toggleMute() {
    if (muted) startMusic(); else stopMusic();
    setMuted(!muted);
  }

  if (screen === "start") return <StartScreen onStart={startGame} muted={muted} onToggleMute={toggleMute} />;

  if (screen === "end")
    return (
      <EndScreen
        score={score}
        correct={correctCount}
        total={questions.length}
        maxCombo={maxCombo}
        xp={xp}
        onRestart={startGame}
        onHome={() => setScreen("start")}
        muted={muted}
        onToggleMute={toggleMute}
      />
    );

  const progress = ((idx + (locked ? 1 : 0)) / questions.length) * 100;
  const timePct = (timeLeft / QUESTION_TIME) * 100;
  const { level, progress: lvlProgress } = levelFromXP(xp);

  return (
    <div className="relative min-h-screen">
      <div className="relative z-10 mx-auto max-w-3xl px-4 py-5 sm:py-8">
        {/* Top HUD */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5">
          <HudCard icon={<Zap className="w-4 h-4" />} label="ניקוד" value={score.toLocaleString()} accent="var(--warning)" />
          <HudCard icon={<Flame className={`w-4 h-4 ${combo >= 3 ? "text-pink-400" : ""}`} />} label="קומבו" value={`x${combo}`} accent="var(--brand)" />
          <HudCard icon={<Sparkles className="w-4 h-4" />} label={`רמה ${level}`} value={`${xp} XP`} accent="var(--brand-2)" progress={lvlProgress} />
          <div className="flex items-center gap-2 justify-end sm:justify-center">
            <button
              onClick={toggleMute}
              className="glass rounded-xl px-3 h-11 flex items-center gap-2 text-sm font-medium hover:scale-[1.03] transition"
              aria-label="השתק"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              <span className="hidden sm:inline">{muted ? "מושתק" : "מוזיקה"}</span>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs sm:text-sm mb-2 font-semibold text-muted-foreground">
            <span>שאלה {idx + 1} מתוך {questions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-l from-[var(--brand-2)] to-[var(--brand)] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Timer */}
        <div className="mb-5 flex items-center gap-3">
          <Timer className={`w-5 h-5 shrink-0 ${timeLeft <= 5 ? "text-rose-400" : "text-[var(--brand-2)]"}`} />
          <div className="flex-1 h-2.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ease-linear ${
                timeLeft <= 5
                  ? "bg-gradient-to-l from-rose-400 to-red-500"
                  : "bg-gradient-to-l from-emerald-400 to-teal-400"
              }`}
              style={{ width: `${timePct}%` }}
            />
          </div>
          <span className={`font-bold text-base w-10 text-center tabular-nums ${timeLeft <= 5 ? "text-rose-400" : "text-foreground"}`}>
            {timeLeft}s
          </span>
        </div>

        {/* Question Card */}
        <div key={idx} className="glass-strong rounded-3xl p-6 sm:p-8 mb-5 animate-slide-up shadow-lg">
          <div className="text-xs sm:text-sm font-semibold text-muted-foreground mb-3">
            שאלה {idx + 1}
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold leading-relaxed">
            {current.q}
          </h2>
        </div>

        {/* Answers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {current.options.map((opt, i) => {
            const isPicked = selected === i;
            const isCorrect = locked && i === current.correctIndex;
            const isWrong = locked && isPicked && i !== current.correctIndex;
            const palette = [
              { bg: "from-rose-500/15 to-pink-500/10", border: "border-rose-400/30", chip: "bg-rose-500/90" },
              { bg: "from-sky-500/15 to-cyan-500/10", border: "border-sky-400/30", chip: "bg-sky-500/90" },
              { bg: "from-amber-500/15 to-orange-500/10", border: "border-amber-400/30", chip: "bg-amber-500/90" },
              { bg: "from-emerald-500/15 to-teal-500/10", border: "border-emerald-400/30", chip: "bg-emerald-500/90" },
            ][i];
            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={locked}
                className={`
                  relative group p-4 sm:p-5 rounded-2xl text-right font-semibold text-base sm:text-lg
                  border transition-all duration-300 overflow-hidden
                  bg-gradient-to-br ${palette.bg} backdrop-blur-md
                  ${isCorrect ? "!border-emerald-400 !bg-emerald-500/25 animate-pop scale-[1.02] shadow-[0_0_30px_-5px_rgba(52,211,153,0.6)]" : ""}
                  ${isWrong ? "!border-rose-500 !bg-rose-500/25 animate-shake" : ""}
                  ${!locked ? `${palette.border} hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-lg cursor-pointer` : ""}
                  ${locked && !isCorrect && !isWrong ? "opacity-40" : ""}
                `}
              >
                <div className="relative flex items-center gap-3 justify-between">
                  <span className="flex-1 leading-snug">{opt}</span>
                  <span className={`flex items-center justify-center w-9 h-9 rounded-xl font-bold text-white shrink-0 ${palette.chip} shadow-md`}>
                    {isCorrect ? <Check className="w-5 h-5" /> : isWrong ? <X className="w-5 h-5" /> : ["א", "ב", "ג", "ד"][i]}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Feedback */}
        {locked && (
          <div className="mt-5 text-center animate-slide-up">
            {selected === current.correctIndex ? (
              <p className="text-xl sm:text-2xl font-bold text-emerald-400">
                ✓ תשובה נכונה! +{100 + timeLeft * 8 + Math.max(0, combo - 1) * 40} נקודות
              </p>
            ) : (
              <p className="text-lg sm:text-xl font-bold text-rose-400">
                התשובה הנכונה: <span className="text-foreground">{current.options[current.correctIndex]}</span>
              </p>
            )}
            {current.fact && (
              <p className="mt-2 text-sm sm:text-base text-muted-foreground">💡 {current.fact}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ HUD CARD ============
function HudCard({
  icon, label, value, accent, progress,
}: { icon: React.ReactNode; label: string; value: string; accent: string; progress?: number }) {
  return (
    <div className="glass rounded-2xl px-3 py-2.5 flex flex-col gap-1 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">{label}</span>
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <span className="font-bold text-base sm:text-lg tabular-nums" style={{ color: accent }}>{value}</span>
      {progress !== undefined && (
        <div className="h-1 bg-white/10 rounded-full overflow-hidden mt-0.5">
          <div className="h-full transition-all duration-500" style={{ width: `${progress * 100}%`, background: accent }} />
        </div>
      )}
    </div>
  );
}

// ============ START SCREEN ============
function StartScreen({ onStart, muted, onToggleMute }: { onStart: () => void; muted: boolean; onToggleMute: () => void }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10">
      <div className="relative z-10 max-w-4xl w-full">
        <div className="flex justify-end mb-4">
          <button onClick={onToggleMute} className="glass rounded-xl p-2.5 hover:scale-105 transition" aria-label="השתק">
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>
        </div>

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass mb-5 text-xs sm:text-sm font-semibold animate-slide-up">
            <Sparkles className="w-3.5 h-3.5 text-[var(--brand-2)]" />
            <span>משחק טריוויה • 15 שאלות</span>
          </div>
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold leading-tight mb-4 text-gradient-shine animate-slide-up">
            איך יצרו את המחשב הראשון?
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground mb-1 font-medium animate-slide-up">
            עבודת חקר מאת
          </p>
          <p className="text-lg sm:text-xl font-bold mb-8 animate-slide-up">
            תום, איליי, דור, דניאל ויובל — כיתה ח׳3
          </p>

          <button
            onClick={onStart}
            className="btn-primary inline-flex items-center gap-3 px-10 sm:px-14 py-4 sm:py-5 rounded-2xl text-xl sm:text-2xl animate-pop"
          >
            <Play className="w-6 h-6 fill-current" />
            התחל משחק
          </button>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-8 animate-fade-in">
          {["טיימר לכל שאלה", "ניקוד בזמן אמת", "מערכת קומבו", "XP ורמות", "מותאם למובייל"].map((t) => (
            <span key={t} className="glass px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium">
              {t}
            </span>
          ))}
        </div>

        <Leaderboard />
      </div>
    </div>
  );
}

// ============ END SCREEN ============
function EndScreen({
  score, correct, total, maxCombo, xp, onRestart, onHome, muted, onToggleMute,
}: {
  score: number; correct: number; total: number; maxCombo: number; xp: number;
  onRestart: () => void; onHome: () => void; muted: boolean; onToggleMute: () => void;
}) {
  const pct = (correct / total) * 100;
  const { title, msg, emoji } = useMemo(() => {
    if (pct === 100) return { title: "מושלם!", msg: "ענית נכון על כל השאלות. אגדה!", emoji: "👑" };
    if (pct >= 80) return { title: "מצוין!", msg: "ידע מרשים בהיסטוריה של המחשבים.", emoji: "🏆" };
    if (pct >= 60) return { title: "כל הכבוד!", msg: "תוצאה יפה — עוד קצת ואתה מומחה.", emoji: "⭐" };
    if (pct >= 40) return { title: "לא רע", msg: "יש על מה לבנות. נסה שוב!", emoji: "💪" };
    return { title: "נסה שוב", msg: "כל מאסטר התחיל איפשהו. קדימה!", emoji: "🚀" };
  }, [pct]);

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10">
      <button onClick={onToggleMute} className="absolute top-4 left-4 glass rounded-xl p-2.5 z-20" aria-label="השתק">
        {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
      </button>
      <div className="relative z-10 max-w-2xl w-full text-center">
        <div className="text-7xl sm:text-8xl mb-4 float-slow">{emoji}</div>
        <h1 className="text-4xl sm:text-6xl font-extrabold mb-3 text-gradient-shine">{title}</h1>
        <p className="text-base sm:text-lg text-muted-foreground mb-8">{msg}</p>

        <div className="glass-strong rounded-3xl p-6 sm:p-8 mb-6 soft-glow">
          <div className="text-xs font-semibold text-muted-foreground mb-2">הניקוד הסופי שלך</div>
          <div className="text-5xl sm:text-7xl font-extrabold text-gradient-shine mb-6 tabular-nums">
            {score.toLocaleString()}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <StatBox label="תשובות נכונות" value={`${correct}/${total}`} color="rgb(52,211,153)" />
            <StatBox label="קומבו מקסימלי" value={`x${maxCombo}`} color="rgb(244,114,182)" />
            <StatBox label="XP" value={xp.toString()} color="rgb(96,165,250)" />
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={onRestart} className="btn-primary inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-lg">
            <RotateCw className="w-5 h-5" />
            שחק שוב
          </button>
          <button onClick={onHome} className="glass inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-lg font-semibold hover:scale-[1.03] transition">
            <ChevronLeft className="w-5 h-5" />
            למסך הראשי
          </button>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="glass rounded-2xl p-3 sm:p-4">
      <div className="text-[11px] sm:text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-xl sm:text-2xl font-extrabold tabular-nums" style={{ color }}>{value}</div>
    </div>
  );
}

// ============ LEADERBOARD ============
function Leaderboard() {
  return (
    <div className="glass-strong rounded-3xl p-5 sm:p-7 soft-glow">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          טבלת השיאים
        </h3>
        <span className="text-[11px] glass px-2.5 py-1 rounded-full text-emerald-400 font-semibold">LIVE</span>
      </div>
      <ul className="space-y-2">
        {LEADERBOARD.map((p, i) => {
          const isFirst = i === 0;
          const icon =
            i === 0 ? <Crown className="w-5 h-5 text-amber-400" /> :
            i === 1 ? <Medal className="w-5 h-5 text-slate-300" /> :
            i === 2 ? <Medal className="w-5 h-5 text-orange-400" /> :
            <Award className="w-4 h-4 text-muted-foreground" />;
          return (
            <li
              key={p.name}
              className={`
                flex items-center justify-between gap-3 p-3 rounded-2xl transition-all
                ${isFirst
                  ? "bg-gradient-to-l from-amber-500/15 via-amber-400/10 to-transparent border border-amber-400/30 shadow-[0_0_20px_-5px_rgba(251,191,36,0.4)]"
                  : "bg-white/[0.03] border border-white/5 hover:bg-white/[0.06]"}
              `}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 font-bold text-sm shrink-0">
                  {i + 1}
                </span>
                {icon}
                <span className={`truncate font-semibold ${isFirst ? "text-amber-300" : ""}`}>{p.name}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[10px] sm:text-xs px-2 py-1 rounded-full bg-white/5 text-muted-foreground font-medium hidden sm:inline">
                  {p.level}
                </span>
                <span className="font-bold tabular-nums text-sm sm:text-base">
                  {p.score.toLocaleString()}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
