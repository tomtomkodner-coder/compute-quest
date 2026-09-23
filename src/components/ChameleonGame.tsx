import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import confetti from "canvas-confetti";
import {
  Play, Plus, X, Eye, EyeOff, Timer, Undo2, Check, Volume2, VolumeX,
  Home, RotateCw, Trophy, Download, Users, Shuffle, Pencil, ChevronLeft,
} from "lucide-react";
import {
  CATEGORIES, PLAYER_COLORS, MIN_PLAYERS, MAX_PLAYERS,
  randomInt, loadPlayers, savePlayers, type Category,
} from "@/lib/chameleon-data";
import {
  sfxClick, sfxCorrect, sfxWrong, sfxWin, sfxTick, sfxSkip, setMuted as setSoundMuted,
} from "@/lib/sound";

type Phase = "setup" | "reveal" | "draw" | "vote" | "caught" | "result" | "scores";

interface Stroke {
  color: string;
  size: number;
  points: [number, number][]; // מנורמל 0..1 — לא תלוי בגודל המסך
}

interface Round {
  category: Category;
  secretIndex: number;
  chameleon: number;
  order: number[]; // סדר הציור
}

const TURN_TIMES = [
  { value: 10, label: "10 שנ׳" },
  { value: 20, label: "20 שנ׳" },
  { value: 40, label: "40 שנ׳" },
  { value: 0, label: "ללא הגבלה" },
];

const BRUSHES = [
  { size: 0.006, label: "דק" },
  { size: 0.012, label: "רגיל" },
  { size: 0.024, label: "עבה" },
];

export function ChameleonGame() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [players, setPlayers] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState<string>("random");
  const [turnTime, setTurnTime] = useState(20);
  const [laps, setLaps] = useState(1);
  const [oneStroke, setOneStroke] = useState(false);
  const [muted, setMutedState] = useState(false);

  const [round, setRound] = useState<Round | null>(null);
  const [revealIdx, setRevealIdx] = useState(0);
  const [turn, setTurn] = useState(0); // אינדקס בתוך order*laps
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [accused, setAccused] = useState<number | null>(null);
  const [guess, setGuess] = useState<number | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [roundNo, setRoundNo] = useState(0);
  const [finalImage, setFinalImage] = useState<string | null>(null);

  useEffect(() => {
    const saved = loadPlayers();
    setPlayers(saved.length ? saved : ["", "", ""]);
  }, []);

  const sfx = useCallback((fn: () => void) => { if (!muted) fn(); }, [muted]);

  function toggleMute() {
    const v = !muted;
    setMutedState(v);
    setSoundMuted(v);
  }

  const cleanPlayers = players.map((p) => p.trim()).filter(Boolean);
  const canStart = cleanPlayers.length >= MIN_PLAYERS &&
    new Set(cleanPlayers).size === cleanPlayers.length;

  function startRound(list = cleanPlayers, keepScores = true) {
    const category = categoryId === "random"
      ? CATEGORIES[randomInt(CATEGORIES.length)]
      : CATEGORIES.find((c) => c.id === categoryId) ?? CATEGORIES[0];
    const n = list.length;
    const chameleon = randomInt(n);
    // מתחילים משחקן אקראי, אבל לא מהזיקית — כדי שיהיה לה רמז אחד לפחות
    let first = randomInt(n);
    if (first === chameleon) first = (first + 1) % n;
    const order = Array.from({ length: n }, (_, i) => (first + i) % n);
    setRound({ category, secretIndex: randomInt(category.words.length), chameleon, order });
    setRevealIdx(0);
    setTurn(0);
    setStrokes([]);
    setAccused(null);
    setGuess(null);
    setFinalImage(null);
    if (!keepScores || scores.length !== n) setScores(Array(n).fill(0));
    setRoundNo((r) => (keepScores ? r + 1 : 1));
    setPhase("reveal");
  }

  function beginGame() {
    if (!canStart) return;
    sfx(sfxClick);
    setPlayers(cleanPlayers);
    savePlayers(cleanPlayers);
    setScores(Array(cleanPlayers.length).fill(0));
    startRound(cleanPlayers, false);
  }

  function finishAccusation(who: number) {
    if (!round) return;
    setAccused(who);
    if (who === round.chameleon) {
      sfx(sfxCorrect);
      setPhase("caught");
    } else {
      sfx(sfxWrong);
      // הזיקית ברחה — 2 נקודות לזיקית
      setScores((s) => s.map((v, i) => (i === round.chameleon ? v + 2 : v)));
      setPhase("result");
    }
  }

  function finishGuess(i: number) {
    if (!round) return;
    setGuess(i);
    if (i === round.secretIndex) {
      sfx(sfxWrong);
      setScores((s) => s.map((v, idx) => (idx === round.chameleon ? v + 1 : v)));
    } else {
      sfx(sfxWin);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors: PLAYER_COLORS });
      setScores((s) => s.map((v, idx) => (idx === round.chameleon ? v : v + 2)));
    }
    setPhase("result");
  }

  // ============ SCREENS ============
  const topBar = (
    <div className="flex items-center justify-between mb-4 gap-2">
      <Link
        to="/"
        onClick={() => sfx(sfxClick)}
        className="glass rounded-xl px-3 py-2 text-sm font-semibold inline-flex items-center gap-2 hover:scale-105 transition"
      >
        <Home className="w-4 h-4" />
        <span className="hidden sm:inline">לטריוויה</span>
      </Link>
      {phase !== "setup" && round && (
        <span className="glass rounded-xl px-3 py-2 text-sm font-semibold">
          סיבוב {roundNo} • {round.category.emoji} {round.category.name}
        </span>
      )}
      <button onClick={toggleMute} className="glass rounded-xl p-2.5 hover:scale-105 transition" aria-label="השתק">
        {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
      </button>
    </div>
  );

  const shell = (children: React.ReactNode, wide = false) => (
    <div className="relative min-h-screen px-4 py-5 sm:py-8">
      <div className={`relative z-10 mx-auto w-full ${wide ? "max-w-5xl" : "max-w-2xl"}`}>
        {topBar}
        {children}
      </div>
    </div>
  );

  // ---------- SETUP ----------
  if (phase === "setup") {
    return shell(
      <>
        <div className="text-center mb-8">
          <div className="text-6xl sm:text-7xl mb-3 float-slow">🦎</div>
          <h1 className="text-4xl sm:text-6xl font-extrabold mb-3 text-gradient-shine animate-slide-up">
            הזיקית המציירת
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-lg mx-auto animate-slide-up">
            כולם יודעים מה המילה הסודית — חוץ מהזיקית. כל אחד מוסיף משהו לציור,
            ובסוף מנסים לגלות מי מזייף. משחק לטלפון אחד שמעבירים בין החברים!
          </p>
        </div>

        <section className="glass-strong rounded-3xl p-5 sm:p-6 mb-4 animate-slide-up">
          <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--brand-2)]" />
            שחקנים ({cleanPlayers.length}/{MAX_PLAYERS})
          </h2>
          <div className="grid gap-2">
            {players.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full shrink-0" style={{ background: PLAYER_COLORS[i] }} />
                <input
                  value={p}
                  maxLength={14}
                  onChange={(e) => setPlayers((l) => l.map((x, j) => (j === i ? e.target.value : x)))}
                  placeholder={`שחקן ${i + 1}`}
                  className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-base outline-none focus:border-[var(--brand)]"
                />
                <button
                  onClick={() => setPlayers((l) => l.filter((_, j) => j !== i))}
                  disabled={players.length <= MIN_PLAYERS}
                  className="glass rounded-xl p-2.5 disabled:opacity-30"
                  aria-label="הסר שחקן"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          {players.length < MAX_PLAYERS && (
            <button
              onClick={() => { sfx(sfxClick); setPlayers((l) => [...l, ""]); }}
              className="mt-3 w-full glass rounded-xl py-2.5 font-semibold inline-flex items-center justify-center gap-2 hover:scale-[1.01] transition"
            >
              <Plus className="w-4 h-4" /> הוסף שחקן
            </button>
          )}
          {cleanPlayers.length >= MIN_PLAYERS && new Set(cleanPlayers).size !== cleanPlayers.length && (
            <p className="text-rose-300 text-sm mt-2">יש שני שחקנים עם אותו שם</p>
          )}
        </section>

        <section className="glass-strong rounded-3xl p-5 sm:p-6 mb-4 animate-slide-up">
          <h2 className="font-bold text-lg mb-3">קטגוריה</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Chip active={categoryId === "random"} onClick={() => setCategoryId("random")}>
              <Shuffle className="w-4 h-4" /> אקראי
            </Chip>
            {CATEGORIES.map((c) => (
              <Chip key={c.id} active={categoryId === c.id} onClick={() => setCategoryId(c.id)}>
                {c.emoji} {c.name}
              </Chip>
            ))}
          </div>
        </section>

        <section className="glass-strong rounded-3xl p-5 sm:p-6 mb-6 animate-slide-up grid gap-4">
          <div>
            <h2 className="font-bold text-lg mb-2">זמן ציור לכל תור</h2>
            <div className="grid grid-cols-4 gap-2">
              {TURN_TIMES.map((t) => (
                <Chip key={t.value} active={turnTime === t.value} onClick={() => setTurnTime(t.value)}>
                  {t.label}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <h2 className="font-bold text-lg mb-2">כמה סבבי ציור?</h2>
            <div className="grid grid-cols-2 gap-2">
              <Chip active={laps === 1} onClick={() => setLaps(1)}>סבב אחד</Chip>
              <Chip active={laps === 2} onClick={() => setLaps(2)}>שני סבבים</Chip>
            </div>
          </div>
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span>
              <span className="font-bold block">קו אחד בלבד</span>
              <span className="text-sm text-muted-foreground">כל שחקן מצייר קו אחד בלי להרים את האצבע</span>
            </span>
            <input
              type="checkbox"
              checked={oneStroke}
              onChange={(e) => setOneStroke(e.target.checked)}
              className="w-6 h-6 accent-[var(--brand)]"
            />
          </label>
        </section>

        <div className="text-center">
          <button
            onClick={beginGame}
            disabled={!canStart}
            className="btn-primary inline-flex items-center gap-3 px-10 sm:px-14 py-4 rounded-2xl text-xl sm:text-2xl disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play className="w-6 h-6 fill-current" /> התחל משחק
          </button>
          {!canStart && (
            <p className="text-sm text-muted-foreground mt-3">צריך לפחות {MIN_PLAYERS} שחקנים עם שמות שונים</p>
          )}
        </div>

        <HowToPlay />
      </>,
    );
  }

  if (!round) return null;
  const n = players.length;
  const secretWord = round.category.words[round.secretIndex];

  // ---------- REVEAL ----------
  if (phase === "reveal") {
    return shell(
      <RevealCard
        key={revealIdx}
        playerName={players[revealIdx]}
        color={PLAYER_COLORS[revealIdx]}
        index={revealIdx}
        total={n}
        isChameleon={revealIdx === round.chameleon}
        category={round.category}
        secretIndex={round.secretIndex}
        onShow={() => sfx(sfxSkip)}
        onNext={() => {
          sfx(sfxClick);
          if (revealIdx + 1 < n) setRevealIdx(revealIdx + 1);
          else setPhase("draw");
        }}
      />,
    );
  }

  // ---------- DRAW ----------
  if (phase === "draw") {
    const totalTurns = n * laps;
    const drawer = round.order[turn % n];
    return shell(
      <DrawPhase
        key={turn}
        players={players}
        drawer={drawer}
        turn={turn}
        totalTurns={totalTurns}
        lap={Math.floor(turn / n) + 1}
        laps={laps}
        turnTime={turnTime}
        oneStroke={oneStroke}
        category={round.category}
        strokes={strokes}
        setStrokes={setStrokes}
        muted={muted}
        onDone={(image) => {
          sfx(sfxSkip);
          if (turn + 1 < totalTurns) setTurn(turn + 1);
          else {
            setFinalImage(image);
            sfx(sfxWin);
            setPhase("vote");
          }
        }}
      />,
      true,
    );
  }

  // ---------- VOTE ----------
  if (phase === "vote") {
    return shell(
      <div className="animate-slide-up">
        <div className="glass-strong rounded-3xl p-5 sm:p-6 mb-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">🕵️ מי הזיקית?</h2>
          <p className="text-muted-foreground">
            תסתכלו על הציור, תתווכחו ותצביעו ביחד. מי שקיבל הכי הרבה קולות — לחצו עליו.
          </p>
        </div>
        {finalImage && (
          <img src={finalImage} alt="הציור המשותף" className="w-full max-w-md mx-auto rounded-3xl border border-white/10 mb-4" />
        )}
        <Legend players={players} />
        <div className="grid grid-cols-2 gap-2 mt-4">
          {players.map((p, i) => (
            <button
              key={i}
              onClick={() => finishAccusation(i)}
              className="glass rounded-2xl py-4 px-3 font-bold text-lg flex items-center justify-center gap-2 hover:scale-[1.03] transition border-2"
              style={{ borderColor: PLAYER_COLORS[i] }}
            >
              <span className="w-3 h-3 rounded-full" style={{ background: PLAYER_COLORS[i] }} />
              {p}
            </button>
          ))}
        </div>
      </div>,
    );
  }

  // ---------- CAUGHT: הזיקית מנחשת ----------
  if (phase === "caught") {
    return shell(
      <div className="animate-slide-up">
        <div className="glass-strong rounded-3xl p-5 sm:p-6 mb-4 text-center">
          <div className="text-5xl mb-2 animate-pop">🦎</div>
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            תפסתם את {players[round.chameleon]}!
          </h2>
          <p className="text-muted-foreground">
            אבל רגע... אם הזיקית תנחש את המילה הסודית היא עדיין מצליחה לברוח.
            <br />
            <b className="text-foreground">{players[round.chameleon]}</b>, מה המילה?
          </p>
        </div>
        <WordGrid category={round.category} onPick={finishGuess} />
      </div>,
    );
  }

  // ---------- RESULT ----------
  if (phase === "result") {
    const caught = accused === round.chameleon;
    const guessedRight = caught && guess === round.secretIndex;
    const chameleonWins = !caught || guessedRight;
    return shell(
      <div className="animate-slide-up text-center">
        <div className="glass-strong rounded-3xl p-6 sm:p-8 mb-4">
          <div className="text-6xl mb-3 animate-pop">{chameleonWins ? "🦎" : "🎉"}</div>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-3 text-gradient-shine">
            {chameleonWins ? "הזיקית ניצחה!" : "הזיקית נתפסה!"}
          </h2>
          <p className="text-lg mb-4">
            {!caught && <>האשמתם את <b>{players[accused ?? 0]}</b>, אבל הזיקית הייתה <b>{players[round.chameleon]}</b>. (+2 לזיקית)</>}
            {guessedRight && <><b>{players[round.chameleon]}</b> נתפס/ה אבל ניחש/ה נכון את המילה! (+1 לזיקית)</>}
            {caught && !guessedRight && <><b>{players[round.chameleon]}</b> נתפס/ה וניחש/ה לא נכון. (+2 לכל השאר)</>}
          </p>
          <div className="inline-block rounded-2xl bg-white/5 border border-white/10 px-5 py-3">
            <span className="text-sm text-muted-foreground block">המילה הסודית הייתה</span>
            <span className="text-2xl font-extrabold">{secretWord}</span>
          </div>
        </div>
        {finalImage && (
          <div className="mb-4">
            <img src={finalImage} alt="הציור המשותף" className="w-full max-w-sm mx-auto rounded-3xl border border-white/10 mb-2" />
            <a
              href={finalImage}
              download={`chameleon-${secretWord}.png`}
              className="glass rounded-xl px-4 py-2 text-sm font-semibold inline-flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> שמור את הציור
            </a>
          </div>
        )}
        <button
          onClick={() => { sfx(sfxClick); setPhase("scores"); }}
          className="btn-primary inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl text-lg"
        >
          <Trophy className="w-5 h-5" /> לטבלת הניקוד
        </button>
      </div>,
    );
  }

  // ---------- SCORES ----------
  const ranking = players.map((p, i) => ({ p, i, s: scores[i] ?? 0 })).sort((a, b) => b.s - a.s);
  return shell(
    <div className="animate-slide-up">
      <div className="glass-strong rounded-3xl p-5 sm:p-6 mb-4">
        <h2 className="text-2xl font-extrabold mb-4 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-400" /> ניקוד אחרי {roundNo} סיבובים
        </h2>
        <ol className="grid gap-2">
          {ranking.map((r, k) => (
            <li key={r.i} className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3">
              <span className="w-6 text-center font-bold text-muted-foreground">{k === 0 && r.s > 0 ? "👑" : k + 1}</span>
              <span className="w-3 h-3 rounded-full" style={{ background: PLAYER_COLORS[r.i] }} />
              <span className="flex-1 font-semibold">{r.p}</span>
              <span className="font-extrabold tabular-nums">{r.s}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        <button
          onClick={() => { sfx(sfxClick); startRound(players, true); }}
          className="btn-primary rounded-2xl py-4 text-lg inline-flex items-center justify-center gap-2"
        >
          <RotateCw className="w-5 h-5" /> סיבוב נוסף
        </button>
        <button
          onClick={() => { sfx(sfxClick); setPhase("setup"); setRound(null); }}
          className="glass rounded-2xl py-4 text-lg font-semibold inline-flex items-center justify-center gap-2"
        >
          <Pencil className="w-5 h-5" /> שינוי שחקנים / הגדרות
        </button>
      </div>
    </div>,
  );
}

// ============ PIECES ============

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-3 py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-1.5 border transition ${
        active
          ? "bg-[var(--brand)]/30 border-[var(--brand)] shadow-[0_0_20px_-6px_var(--brand)]"
          : "bg-white/5 border-white/10 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function HowToPlay() {
  return (
    <details className="glass rounded-3xl p-5 mt-8 text-sm leading-relaxed">
      <summary className="font-bold text-base cursor-pointer">איך משחקים?</summary>
      <ol className="list-decimal pr-5 mt-3 grid gap-1.5 text-muted-foreground">
        <li>מעבירים את הטלפון — כל שחקן רואה בסתר את המילה הסודית. שחקן אחד הוא הזיקית 🦎 ורואה רק את הקטגוריה.</li>
        <li>כל שחקן בתורו מוסיף משהו לציור המשותף, בצבע שלו. לא לצייר ברור מדי — שהזיקית לא תנחש!</li>
        <li>הזיקית צריכה לצייר משהו משכנע כדי לא להיחשף.</li>
        <li>בסוף מתווכחים ומצביעים מי הזיקית.</li>
        <li>לא תפסתם? הזיקית מקבלת 2 נקודות. תפסתם? הזיקית מנסה לנחש את המילה — צדקה: נקודה לזיקית, טעתה: 2 נקודות לכל השאר.</li>
      </ol>
    </details>
  );
}

function WordGrid({
  category, highlight, onPick,
}: {
  category: Category; highlight?: number; onPick?: (i: number) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
      {category.words.map((w, i) => {
        const hit = highlight === i;
        const cls = `rounded-xl px-1 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-center border leading-tight ${
          hit
            ? "bg-emerald-500/30 border-emerald-400 text-white scale-105 shadow-[0_0_20px_-4px_rgba(52,211,153,0.8)]"
            : "bg-white/5 border-white/10"
        }`;
        return onPick ? (
          <button key={i} onClick={() => onPick(i)} className={`${cls} hover:bg-white/15 hover:scale-105 transition`}>
            {w}
          </button>
        ) : (
          <div key={i} className={cls}>{w}</div>
        );
      })}
    </div>
  );
}

function RevealCard({
  playerName, color, index, total, isChameleon, category, secretIndex, onShow, onNext,
}: {
  playerName: string; color: string; index: number; total: number; isChameleon: boolean;
  category: Category; secretIndex: number; onShow: () => void; onNext: () => void;
}) {
  const [shown, setShown] = useState(false);
  return (
    <div className="animate-slide-up">
      <p className="text-center text-sm text-muted-foreground mb-2">כרטיס {index + 1} מתוך {total}</p>
      {!shown ? (
        <div className="glass-strong rounded-3xl p-8 text-center">
          <div className="text-5xl mb-4">📱</div>
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
            העבירו את הטלפון ל־<span style={{ color }}>{playerName}</span>
          </h2>
          <p className="text-muted-foreground mb-6">רק {playerName} מסתכל/ת על המסך!</p>
          <button
            onClick={() => { onShow(); setShown(true); }}
            className="btn-primary inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-lg"
          >
            <Eye className="w-5 h-5" /> הצג לי את הכרטיס
          </button>
        </div>
      ) : (
        <div className="glass-strong rounded-3xl p-5 sm:p-6 text-center animate-pop">
          {isChameleon ? (
            <>
              <div className="text-6xl mb-2">🦎</div>
              <h2 className="text-3xl font-extrabold mb-1 text-emerald-300">את/ה הזיקית!</h2>
              <p className="text-muted-foreground mb-4">
                אין לך מילה. המילה היא אחת מאלה — צייר/י משהו משכנע ונסה/י לנחש מהציורים של האחרים.
              </p>
            </>
          ) : (
            <>
              <p className="text-muted-foreground mb-1">המילה הסודית</p>
              <h2 className="text-4xl font-extrabold mb-4 text-gradient-shine">{category.words[secretIndex]}</h2>
            </>
          )}
          <p className="font-semibold mb-2">{category.emoji} {category.name}</p>
          <WordGrid category={category} highlight={isChameleon ? undefined : secretIndex} />
          <button
            onClick={onNext}
            className="mt-6 glass rounded-2xl px-6 py-3.5 font-bold inline-flex items-center gap-2 hover:scale-105 transition"
          >
            <EyeOff className="w-5 h-5" />
            {index + 1 < total ? "הסתרתי — לשחקן הבא" : "הסתרתי — מתחילים לצייר!"}
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function Legend({ players }: { players: string[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-sm">
      {players.map((p, i) => (
        <span key={i} className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full" style={{ background: PLAYER_COLORS[i] }} />
          {p}
        </span>
      ))}
    </div>
  );
}

function DrawPhase({
  players, drawer, turn, totalTurns, lap, laps, turnTime, oneStroke, category,
  strokes, setStrokes, muted, onDone,
}: {
  players: string[]; drawer: number; turn: number; totalTurns: number; lap: number; laps: number;
  turnTime: number; oneStroke: boolean; category: Category;
  strokes: Stroke[]; setStrokes: React.Dispatch<React.SetStateAction<Stroke[]>>;
  muted: boolean; onDone: (image: string) => void;
}) {
  const color = PLAYER_COLORS[drawer];
  const [ready, setReady] = useState(false); // מסך "תורך" לפני שמתחילים
  const [brush, setBrush] = useState(1);
  const [timeLeft, setTimeLeft] = useState(turnTime);
  const [myStrokes, setMyStrokes] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef<Stroke | null>(null);
  const doneRef = useRef(false);
  const strokesRef = useRef(strokes);
  strokesRef.current = strokes;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const locked = !ready || (oneStroke && myStrokes >= 1 && !drawingRef.current);

  const redraw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const g = c.getContext("2d");
    if (!g) return;
    const w = c.width;
    g.clearRect(0, 0, w, w);
    g.fillStyle = "#0e1026";
    g.fillRect(0, 0, w, w);
    g.lineCap = "round";
    g.lineJoin = "round";
    const all = drawingRef.current ? [...strokesRef.current, drawingRef.current] : strokesRef.current;
    for (const s of all) {
      g.strokeStyle = s.color;
      g.fillStyle = s.color;
      g.lineWidth = s.size * w;
      const pts = s.points;
      if (pts.length === 1) {
        g.beginPath();
        g.arc(pts[0][0] * w, pts[0][1] * w, (s.size * w) / 2, 0, Math.PI * 2);
        g.fill();
        continue;
      }
      g.beginPath();
      g.moveTo(pts[0][0] * w, pts[0][1] * w);
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = ((pts[i][0] + pts[i + 1][0]) / 2) * w;
        const my = ((pts[i][1] + pts[i + 1][1]) / 2) * w;
        g.quadraticCurveTo(pts[i][0] * w, pts[i][1] * w, mx, my);
      }
      const last = pts[pts.length - 1];
      g.lineTo(last[0] * w, last[1] * w);
      g.stroke();
    }
  }, []);

  // התאמת רזולוציית הקנבס לגודל שלו על המסך
  useLayoutEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const fit = () => {
      const size = Math.round(c.getBoundingClientRect().width * (window.devicePixelRatio || 1));
      if (size > 0 && c.width !== size) {
        c.width = size;
        c.height = size;
      }
      redraw();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(c);
    return () => ro.disconnect();
  }, [redraw]);

  useEffect(() => { redraw(); }, [strokes, redraw]);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    if (drawingRef.current) {
      const s = drawingRef.current;
      drawingRef.current = null;
      strokesRef.current = [...strokesRef.current, s];
      setStrokes(strokesRef.current);
      redraw();
    }
    onDoneRef.current(canvasRef.current?.toDataURL("image/png") ?? "");
  }, [redraw, setStrokes]);

  // טיימר
  useEffect(() => {
    if (!ready || turnTime === 0) return;
    const id = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          window.clearInterval(id);
          window.setTimeout(finish, 0);
          return 0;
        }
        if (t <= 4 && !muted) sfxTick();
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [ready, turnTime, finish, muted]);

  function pos(e: React.PointerEvent<HTMLCanvasElement>): [number, number] {
    const r = e.currentTarget.getBoundingClientRect();
    return [
      Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    ];
  }

  function onDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (locked || doneRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = { color, size: BRUSHES[brush].size, points: [pos(e)] };
    redraw();
  }
  function onMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const s = drawingRef.current;
    if (!s) return;
    const p = pos(e);
    const last = s.points[s.points.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 0.002) return;
    s.points.push(p);
    redraw();
  }
  function onUp() {
    const s = drawingRef.current;
    if (!s) return;
    drawingRef.current = null;
    strokesRef.current = [...strokesRef.current, s];
    setStrokes(strokesRef.current);
    setMyStrokes((k) => k + 1);
  }

  function undo() {
    if (myStrokes === 0) return;
    setStrokes((l) => l.slice(0, -1));
    setMyStrokes((k) => k - 1);
  }

  const timePct = turnTime ? (timeLeft / turnTime) * 100 : 100;

  return (
    <div className="grid lg:grid-cols-[1fr_280px] gap-4 items-start">
      <div className="relative">
        <canvas
          ref={canvasRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="w-full aspect-square rounded-3xl border-4 block select-none"
          style={{ touchAction: "none", borderColor: color, cursor: locked ? "not-allowed" : "crosshair" }}
        />
        {!ready && (
          <div className="absolute inset-0 rounded-3xl bg-[#0b0c1f]/85 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6">
            <p className="text-muted-foreground mb-1">תור {turn + 1} מתוך {totalTurns}{laps > 1 ? ` • סבב ${lap}` : ""}</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-2">
              התור של <span style={{ color }}>{players[drawer]}</span>
            </h2>
            <p className="text-muted-foreground mb-6">
              {oneStroke ? "קו אחד בלבד — בלי להרים את האצבע!" : "הוסיפו משהו קטן לציור — לא לחשוף יותר מדי 😉"}
            </p>
            <button
              onClick={() => { if (!muted) sfxClick(); setReady(true); }}
              className="btn-primary inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-lg"
            >
              <Pencil className="w-5 h-5" /> אני מוכן/ה!
            </button>
          </div>
        )}
      </div>

      <aside className="grid gap-3">
        <div className="glass-strong rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-4 h-4 rounded-full" style={{ background: color }} />
            <span className="font-bold text-lg flex-1">{players[drawer]}</span>
            <span className="text-xs text-muted-foreground">{turn + 1}/{totalTurns}</span>
          </div>
          <p className="text-sm text-muted-foreground mb-3">{category.emoji} {category.name}</p>
          {turnTime > 0 && (
            <div className="flex items-center gap-2">
              <Timer className={`w-5 h-5 ${timeLeft <= 4 ? "text-rose-400" : "text-[var(--brand-2)]"}`} />
              <div className="flex-1 h-2.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ease-linear ${timeLeft <= 4 ? "bg-rose-500" : "bg-gradient-to-l from-emerald-400 to-teal-400"}`}
                  style={{ width: `${timePct}%` }}
                />
              </div>
              <span className="font-bold w-9 text-center tabular-nums">{timeLeft}</span>
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-3 grid grid-cols-3 gap-2">
          {BRUSHES.map((b, i) => (
            <button
              key={i}
              onClick={() => setBrush(i)}
              className={`rounded-xl py-2 flex flex-col items-center gap-1 text-xs font-semibold border ${brush === i ? "border-[var(--brand)] bg-[var(--brand)]/20" : "border-white/10 bg-white/5"}`}
            >
              <span className="rounded-full" style={{ background: color, width: 6 + i * 6, height: 6 + i * 6 }} />
              {b.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={undo}
            disabled={!ready || myStrokes === 0}
            className="glass rounded-2xl py-3 font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <Undo2 className="w-4 h-4" /> בטל
          </button>
          <button
            onClick={finish}
            disabled={!ready}
            className={`btn-primary rounded-2xl py-3 inline-flex items-center justify-center gap-2 disabled:opacity-40 ${oneStroke && myStrokes > 0 ? "animate-pop" : ""}`}
          >
            <Check className="w-4 h-4" /> סיימתי
          </button>
        </div>

        <div className="glass rounded-2xl p-3">
          <Legend players={players} />
        </div>
      </aside>
    </div>
  );
}
