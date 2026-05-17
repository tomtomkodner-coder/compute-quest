import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { Crown, Trophy, Medal, Zap, Flame, Timer, Volume2, VolumeX, Cpu, Sparkles, Award, Gamepad2 } from "lucide-react";
import {
  prepareGame,
  type PreparedQuestion,
  LEADERBOARD,
} from "@/lib/trivia-data";
import {
  sfxClick,
  sfxCorrect,
  sfxWrong,
  sfxWin,
  sfxTick,
  startMusic,
  stopMusic,
} from "@/lib/sound";

type Screen = "start" | "playing" | "end";

const QUESTION_TIME = 15;

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

  // Timer logic
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

  useEffect(() => {
    return () => stopMusic();
  }, []);

  function startGame() {
    if (!muted) sfxClick();
    const prepared = prepareGame();
    setQuestions(prepared);
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
      const timeBonus = timeLeft * 10;
      const diffMult = current.difficulty === "קשה" ? 3 : current.difficulty === "בינוני" ? 2 : 1;
      const comboBonus = combo * 50;
      const points = 100 * diffMult + timeBonus + comboBonus;
      setScore((s) => s + points);
      setXp((x) => x + 50 + combo * 10);
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
          origin: { y: 0.6 },
          colors: ["#ff00ff", "#00ffff", "#ffff00", "#ff0080"],
        });
      }
    } else {
      if (!muted) sfxWrong();
      setCombo(0);
    }

    setTimeout(() => {
      if (idx + 1 >= questions.length) {
        endGame();
      } else {
        setIdx((i) => i + 1);
        setSelected(null);
        setLocked(false);
      }
    }, 2200);
  }

  function endGame() {
    setScreen("end");
    stopMusic();
    if (correctCount >= questions.length * 0.6 + (selected === current?.correctIndex ? 1 : 0)) {
      if (!muted) sfxWin();
      confetti({
        particleCount: 200,
        spread: 160,
        origin: { y: 0.4 },
        colors: ["#ff00ff", "#00ffff", "#ffff00", "#ff0080", "#9d00ff"],
      });
      setTimeout(() => {
        confetti({ particleCount: 150, angle: 60, spread: 80, origin: { x: 0 } });
        confetti({ particleCount: 150, angle: 120, spread: 80, origin: { x: 1 } });
      }, 500);
    }
  }

  function toggleMute() {
    if (muted) {
      startMusic();
    } else {
      stopMusic();
    }
    setMuted(!muted);
  }

  // ---------- SCREENS ----------
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
        muted={muted}
        onToggleMute={toggleMute}
      />
    );

  // playing
  const progress = ((idx + (locked ? 1 : 0)) / questions.length) * 100;
  const timePct = (timeLeft / QUESTION_TIME) * 100;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <ScanLine />
      <div className="relative z-10 mx-auto max-w-3xl px-4 py-4 sm:py-6">
        {/* Top HUD */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="glass rounded-xl px-3 py-2 flex items-center gap-2 text-sm">
            <Zap className="w-4 h-4 text-[var(--neon-yellow)]" />
            <span className="font-black text-[var(--neon-yellow)] text-base sm:text-lg">{score.toLocaleString()}</span>
            <span className="text-muted-foreground">נקודות</span>
          </div>
          <div className="glass rounded-xl px-3 py-2 flex items-center gap-2 text-sm">
            <Flame className={`w-4 h-4 ${combo >= 3 ? "text-[var(--neon-pink)] animate-pulse" : "text-muted-foreground"}`} />
            <span className="font-black">{combo}</span>
            <span className="text-muted-foreground">קומבו</span>
          </div>
          <div className="glass rounded-xl px-3 py-2 flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-[var(--neon-cyan)]" />
            <span className="font-black text-[var(--neon-cyan)]">{xp} XP</span>
          </div>
          <button
            onClick={toggleMute}
            className="glass rounded-xl p-2 hover:scale-110 transition"
            aria-label="השתק"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-[var(--neon-green)]" />}
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1 font-bold">
            <span>שאלה {idx + 1} מתוך {questions.length}</span>
            <span className="text-[var(--neon-cyan)]">{current.topic} • {current.difficulty}</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden border border-[var(--neon-purple)]/30">
            <div
              className="h-full bg-gradient-to-r from-[var(--neon-cyan)] via-[var(--neon-purple)] to-[var(--neon-pink)] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Timer */}
        <div className="mb-4 flex items-center gap-3">
          <Timer className={`w-5 h-5 ${timeLeft <= 5 ? "text-[var(--neon-pink)] animate-pulse" : "text-[var(--neon-cyan)]"}`} />
          <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden border border-border">
            <div
              className={`h-full transition-all duration-1000 ease-linear ${
                timeLeft <= 5
                  ? "bg-gradient-to-r from-[var(--neon-pink)] to-destructive"
                  : "bg-gradient-to-r from-[var(--neon-green)] to-[var(--neon-cyan)]"
              }`}
              style={{ width: `${timePct}%` }}
            />
          </div>
          <span className={`font-black text-lg w-8 text-center ${timeLeft <= 5 ? "text-[var(--neon-pink)]" : ""}`}>
            {timeLeft}
          </span>
        </div>

        {/* Question Card */}
        <div key={idx} className="glass neon-glow rounded-3xl p-5 sm:p-8 mb-6 animate-slide-up">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-5 h-5 text-[var(--neon-purple)]" />
            <span className="text-xs font-bold text-muted-foreground tracking-widest">QUESTION_{String(idx + 1).padStart(2, "0")}</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-black leading-tight text-balance">
            {current.q}
          </h2>
        </div>

        {/* Answers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {current.options.map((opt, i) => {
            const isPicked = selected === i;
            const isCorrect = locked && i === current.correctIndex;
            const isWrong = locked && isPicked && i !== current.correctIndex;
            const colors = [
              "from-[var(--neon-pink)] to-[var(--neon-purple)]",
              "from-[var(--neon-cyan)] to-[var(--neon-purple)]",
              "from-[var(--neon-yellow)] to-[var(--neon-pink)]",
              "from-[var(--neon-green)] to-[var(--neon-cyan)]",
            ];
            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={locked}
                className={`
                  relative group p-4 sm:p-5 rounded-2xl text-right font-bold text-base sm:text-lg
                  border-2 transition-all duration-300 overflow-hidden
                  ${isCorrect ? "border-[var(--neon-green)] bg-[var(--neon-green)]/20 animate-pop scale-105" : ""}
                  ${isWrong ? "border-destructive bg-destructive/30 animate-shake" : ""}
                  ${!locked ? "border-[var(--neon-purple)]/40 glass hover:border-[var(--neon-cyan)] hover:scale-[1.03] hover:-translate-y-1 cursor-pointer" : "cursor-not-allowed opacity-80"}
                  ${locked && !isCorrect && !isWrong ? "opacity-40" : ""}
                `}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${colors[i]} opacity-0 group-hover:opacity-20 transition-opacity`} />
                <div className="relative flex items-center gap-3 justify-between">
                  <span>{opt}</span>
                  <span className={`flex items-center justify-center w-8 h-8 rounded-lg font-black bg-gradient-to-br ${colors[i]} text-background shrink-0`}>
                    {["א", "ב", "ג", "ד"][i]}
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
              <p className="text-2xl sm:text-3xl font-black text-[var(--neon-green)] neon-text">
                ✨ נכון! +{100 * (current.difficulty === "קשה" ? 3 : current.difficulty === "בינוני" ? 2 : 1) + timeLeft * 10 + (combo - 1) * 50} ✨
              </p>
            ) : (
              <p className="text-xl sm:text-2xl font-black text-[var(--neon-pink)]">
                💀 לא נכון! התשובה: <span className="text-[var(--neon-cyan)]">{current.options[current.correctIndex]}</span>
              </p>
            )}
            {current.fact && (
              <p className="mt-2 text-sm sm:text-base text-muted-foreground italic">💡 {current.fact}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ START SCREEN ============
function StartScreen({ onStart, muted, onToggleMute }: { onStart: () => void; muted: boolean; onToggleMute: () => void }) {
  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center px-4 py-10">
      <ScanLine />
      <FloatingIcons />
      <div className="relative z-10 max-w-4xl w-full text-center">
        <button onClick={onToggleMute} className="absolute top-0 left-0 glass rounded-xl p-2 hover:scale-110 transition">
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 text-[var(--neon-green)]" />}
        </button>

        <div className="inline-block px-4 py-1 rounded-full glass mb-4 text-xs sm:text-sm font-bold tracking-widest text-[var(--neon-cyan)] animate-slide-up">
          ⚡ CYBER TRIVIA v2.0 ⚡
        </div>
        <h1 className="text-4xl sm:text-7xl font-black leading-tight mb-4 text-gradient-neon animate-slide-up">
          איך יצרו את המחשב הראשון?
        </h1>
        <p className="text-base sm:text-xl text-muted-foreground mb-2 font-bold animate-slide-up">
          תום, איליי, דור ויובל — כיתה ח׳3
        </p>
        <p className="text-sm sm:text-base text-[var(--neon-purple)] mb-8 font-bold animate-slide-up">
          🚀 משחק טריוויה עתידני • 15 שאלות • זמן אמת • קומבו • XP
        </p>

        <button
          onClick={onStart}
          className="btn-neon px-10 sm:px-16 py-5 sm:py-6 rounded-2xl text-2xl sm:text-4xl font-display tracking-wider animate-pop mb-10"
        >
          ▶ START
        </button>

        {/* Stats badges */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {[
            { i: <Cpu className="w-4 h-4" />, t: "Z1 & ENIAC" },
            { i: <Gamepad2 className="w-4 h-4" />, t: "Retro Gaming" },
            { i: <Sparkles className="w-4 h-4" />, t: "VR & Future" },
            { i: <Flame className="w-4 h-4" />, t: "Combo XP" },
          ].map((b, i) => (
            <span key={i} className="glass px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold flex items-center gap-2">
              {b.i} {b.t}
            </span>
          ))}
        </div>

        {/* Leaderboard */}
        <Leaderboard />
      </div>
    </div>
  );
}

// ============ END SCREEN ============
function EndScreen({
  score, correct, total, maxCombo, xp, onRestart, muted, onToggleMute,
}: {
  score: number; correct: number; total: number; maxCombo: number; xp: number;
  onRestart: () => void; muted: boolean; onToggleMute: () => void;
}) {
  const pct = (correct / total) * 100;
  const { title, msg, emoji } = useMemo(() => {
    if (pct === 100) return { title: "אגדה!", msg: "פרפקט! אתה מאסטר של עולם המחשבים 🏆", emoji: "👑" };
    if (pct >= 80) return { title: "מדהים!", msg: "אתה הקר באטל אמיתי! הצוזה היה גאה בך.", emoji: "🚀" };
    if (pct >= 60) return { title: "כל הכבוד!", msg: "ידע רציני בעולם הסייבר!", emoji: "⚡" };
    if (pct >= 40) return { title: "לא רע!", msg: "יש על מה לשפר — נסה שוב!", emoji: "💪" };
    return { title: "אאוץ׳...", msg: "ה-Z1 בוכה. נסה שוב, אתה יכול!", emoji: "💀" };
  }, [pct]);

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center px-4 py-10">
      <ScanLine />
      <button onClick={onToggleMute} className="absolute top-4 left-4 glass rounded-xl p-2 z-20">
        {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 text-[var(--neon-green)]" />}
      </button>
      <div className="relative z-10 max-w-2xl w-full text-center">
        <div className="text-7xl sm:text-9xl mb-4 float-slow">{emoji}</div>
        <h1 className="text-4xl sm:text-7xl font-black mb-3 text-gradient-neon">{title}</h1>
        <p className="text-base sm:text-xl text-muted-foreground mb-8">{msg}</p>

        <div className="glass neon-glow rounded-3xl p-6 sm:p-8 mb-6">
          <div className="text-xs font-bold tracking-widest text-muted-foreground mb-2">FINAL SCORE</div>
          <div className="text-5xl sm:text-7xl font-black text-gradient-neon mb-6">{score.toLocaleString()}</div>
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <StatBox label="תשובות נכונות" value={`${correct}/${total}`} color="var(--neon-green)" />
            <StatBox label="קומבו מקסימלי" value={`x${maxCombo}`} color="var(--neon-pink)" />
            <StatBox label="XP צבור" value={xp.toString()} color="var(--neon-cyan)" />
          </div>
        </div>

        <button onClick={onRestart} className="btn-neon px-10 py-5 rounded-2xl text-2xl font-display tracking-wider">
          🔄 שחק שוב
        </button>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-background/40 rounded-xl p-3 border border-border">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-xl sm:text-2xl font-black" style={{ color }}>{value}</div>
    </div>
  );
}

// ============ LEADERBOARD ============
function Leaderboard() {
  return (
    <div className="glass neon-glow rounded-3xl p-5 sm:p-7 text-right">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl sm:text-2xl font-black flex items-center gap-2 text-gradient-neon">
          <Trophy className="w-6 h-6 text-[var(--neon-yellow)]" />
          טבלת השיאים
        </h3>
        <span className="text-xs glass px-2 py-1 rounded-full text-[var(--neon-green)] font-bold">LIVE</span>
      </div>
      <ul className="space-y-2">
        {LEADERBOARD.map((p, i) => {
          const isFirst = i === 0;
          const icon = i === 0 ? <Crown className="w-5 h-5 text-[var(--neon-yellow)]" />
            : i === 1 ? <Medal className="w-5 h-5 text-[var(--neon-cyan)]" />
            : i === 2 ? <Medal className="w-5 h-5 text-[var(--neon-pink)]" />
            : <Award className="w-4 h-4 text-muted-foreground" />;
          return (
            <li
              key={p.name}
              className={`
                flex items-center justify-between gap-3 p-3 rounded-xl border transition-all
                ${isFirst
                  ? "bg-gradient-to-l from-[var(--neon-yellow)]/20 to-[var(--neon-pink)]/20 border-[var(--neon-yellow)] animate-pop"
                  : "bg-background/30 border-border hover:border-[var(--neon-purple)]/50"}
              `}
            >
              <div className="flex items-center gap-3">
                <span className={`font-black w-8 text-center ${isFirst ? "text-[var(--neon-yellow)] text-xl" : "text-muted-foreground"}`}>
                  #{i + 1}
                </span>
                {icon}
                <span className={`font-bold text-sm sm:text-base ${isFirst ? "text-[var(--neon-yellow)]" : ""}`}>
                  {p.name}
                </span>
              </div>
              <div className="text-left shrink-0">
                <div className={`font-black text-sm sm:text-base ${isFirst ? "text-[var(--neon-yellow)]" : "text-[var(--neon-cyan)]"}`}>
                  {p.score.toLocaleString()}
                </div>
                <div className="text-[10px] text-muted-foreground">{p.level}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ============ DECORATIVE ============
function ScanLine() {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 h-32 z-0 opacity-30"
      style={{
        background: "linear-gradient(180deg, transparent, oklch(0.7 0.25 200 / 0.3), transparent)",
        animation: "scan-line 8s linear infinite",
      }}
    />
  );
}

function FloatingIcons() {
  const icons = [Cpu, Gamepad2, Sparkles, Zap, Trophy];
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {icons.map((Icon, i) => (
        <Icon
          key={i}
          className="absolute opacity-10 text-[var(--neon-purple)] float-slow"
          style={{
            width: `${40 + i * 15}px`,
            height: `${40 + i * 15}px`,
            top: `${10 + i * 18}%`,
            left: `${(i * 23) % 90}%`,
            animationDelay: `${i * 0.7}s`,
          }}
        />
      ))}
    </div>
  );
}
