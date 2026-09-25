import { formatMs } from "@quizlab/shared";
import { useT } from "../i18n";
import { useLab, useSettings } from "../state/lab";
import { ANSWER_STATUS_META, CONNECTION_META } from "./status";
import { useRemaining } from "./useRemaining";

function Tile({ label, value, sub, hl }: { label: string; value: React.ReactNode; sub?: React.ReactNode; hl?: string }) {
  return (
    <div className={`tile ${hl ? `hl-${hl}` : ""}`}>
      <div className="tile-label">{label}</div>
      <div className="tile-value">{value}</div>
      {sub !== undefined && <div className="tile-sub">{sub}</div>}
    </div>
  );
}

export function StatusTiles() {
  const t = useT();
  const state = useLab();
  const settings = useSettings();
  const { remainingMs, active } = useRemaining(state);
  const conn = CONNECTION_META[state.connection];
  const q = state.question;
  const game = state.game;
  const auto = settings.plugins["auto-answer"];
  const delayOn = settings.plugins["answer-delay"];
  const { delay } = settings;
  const ans = state.answer;
  const statusMeta = ANSWER_STATUS_META[ans.status];
  const result = ans.result;

  const strategyLabel =
    settings.autoAnswer.strategy === "correct"
      ? t("strategyCorrect")
      : settings.autoAnswer.strategy === "random"
        ? t("strategyRandom")
        : `${t("strategyProbability")} ${Math.round(settings.autoAnswer.probability * 100)}%`;

  return (
    <div className="tiles">
      <Tile
        label={t("tileConnection")}
        value={
          <>
            <span aria-hidden>{conn.emoji}</span> {t(conn.key)}
          </>
        }
        sub={state.reconnect.attempt > 0 ? `${t("reconnectAttempt")} ${state.reconnect.attempt}/${state.reconnect.max}` : state.apiKind === "mock" ? "MockGameAPI" : "OfficialGameAPI"}
      />
      <Tile
        label={t("tileGame")}
        value={<span className="mono ltr">PIN: {state.session?.pin ?? settings.pin ?? "—"}</span>}
        sub={game ? `${game.phase} · ${game.players.length} ${t("players")}` : "—"}
      />
      <Tile
        label={t("tileQuestion")}
        value={<span className="ltr">{q ? `${q.index + 1} / ${q.total}` : game ? `– / ${game.totalQuestions}` : "—"}</span>}
        sub={game?.phase === "question" ? `${t("answered")}: ${game.answeredCount}/${game.players.length}` : undefined}
      />
      <Tile
        label={t("tileTime")}
        value={<span className="mono ltr">{active ? `${(remainingMs / 1000).toFixed(2)}s` : "—"}</span>}
        hl={active && remainingMs < 5000 ? "red" : undefined}
        sub={q ? `${t("timeLimit")}: ${Math.round(q.timeLimitMs / 1000)}` : undefined}
      />
      <Tile
        label={t("tileAnswer")}
        value={<span className="mono">{ans.answerId ?? "—"}</span>}
        hl={result ? (result.correct ? "green" : "red") : undefined}
        sub={result ? `${result.correct ? `✓ ${t("correct")}` : `✗ ${t("wrong")}`} · +${result.points} ${t("points")}` : ans.mode ?? undefined}
      />
      <Tile label={t("tileMode")} value={auto ? t("modeAuto") : t("modeManual")} hl={auto ? "accent" : undefined} sub={auto ? strategyLabel : undefined} />
      <Tile
        label={t("tileDelay")}
        value={
          <span className="mono ltr">
            {!delayOn ? "0ms" : delay.mode === "random" ? `${formatMs(delay.minMs)}–${formatMs(delay.maxMs)}` : formatMs(delay.fixedMs)}
          </span>
        }
        sub={!delayOn ? t("off") : delay.mode === "random" ? t("delayRandom") : t("delayFixed")}
      />
      <Tile
        label={t("tileStatus")}
        value={t(statusMeta.key)}
        hl={statusMeta.tone === "green" ? "green" : statusMeta.tone === "red" ? "red" : statusMeta.tone === "yellow" ? "yellow" : statusMeta.tone === "accent" ? "accent" : undefined}
        sub={ans.reason ?? ans.error ?? undefined}
      />
    </div>
  );
}
