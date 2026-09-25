import { formatMs } from "@quizlab/shared";
import { useT } from "../i18n";
import { lab, useLab, useSettings } from "../state/lab";
import { SHAPES } from "./Icons";
import { ANSWER_STATUS_META } from "./status";
import { useRemaining } from "./useRemaining";
import { Card, fmtClock } from "./ui";

export function QuestionPanel() {
  const t = useT();
  const state = useLab();
  const settings = useSettings();
  const { remainingMs, fraction, active } = useRemaining(state);
  const q = state.question;
  const phase = state.game?.phase;
  const ans = state.answer;
  const revealed = phase === "reveal" || phase === "ended";
  const showCorrect =
    (settings.debugMode && lab.isPluginEnabled("show-correct") && !settings.hideCorrectAnswer) || revealed;
  const canAnswer = active && ans.status !== "sending" && ans.status !== "sent";
  const statusMeta = ANSWER_STATUS_META[ans.status];
  const dist = state.lastEnded && q && state.lastEnded.questionId === q.id ? state.lastEnded.distribution : null;

  if (!state.session) {
    return (
      <Card title={t("question")}>
        <div className="empty">
          <div className="big">🔌</div>
          {t("notJoined")}
        </div>
      </Card>
    );
  }

  if (!q || phase === "lobby") {
    return (
      <Card title={t("question")}>
        <div className="empty">
          <div className="big">{phase === "ended" ? "🏁" : "⏳"}</div>
          {phase === "lobby" ? t("lobby") : phase === "ended" ? t("gameOver") : t("noQuestion")}
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={
        <span className="ltr">
          {t("question")} {q.index + 1} / {q.total}
        </span>
      }
      actions={
        <div className="row">
          <span className={`badge ${phase === "question" ? "green" : "yellow"}`}>{phase}</span>
          {settings.debugMode && <span className="badge mono ltr">{q.id}</span>}
        </div>
      }
    >
      <div className="q-meta">
        <div className={`timer ${active && remainingMs < 5000 ? "low" : ""}`} style={{ flex: 1 }}>
          <div style={{ width: `${(active ? fraction : 0) * 100}%` }} />
        </div>
        <span className="timer-num ltr">{active ? `${(remainingMs / 1000).toFixed(2)}s` : "0.00s"}</span>
      </div>

      <div className="q-text" dir="auto">
        {q.text}
      </div>

      <div className="answers">
        {q.answers.map((a, i) => {
          const isCorrect = showCorrect && q.correctAnswerId === a.id;
          const isPlanned = ans.status === "scheduled" && ans.answerId === a.id;
          const isSent = (ans.status === "sent" || ans.status === "sending") && ans.answerId === a.id;
          const dim = revealed && q.correctAnswerId && q.correctAnswerId !== a.id;
          return (
            <button
              key={a.id}
              className={`answer a${i % 4} ${isCorrect ? "is-correct" : ""} ${isPlanned ? "is-planned" : ""} ${isSent ? "is-sent" : ""} ${dim ? "dim" : ""}`}
              disabled={!canAnswer}
              onClick={() => void lab.submitAnswer(a.id, "manual")}
              title={canAnswer ? `${t("send")} ${a.id}` : undefined}
            >
              <span className="shape" aria-hidden>
                {SHAPES[i % SHAPES.length]}
              </span>
              <span className="a-id">{a.id}</span>
              <span className="a-text" dir="auto">
                {a.text}
              </span>
              <span className="tags">
                {isCorrect && <span className="badge green">✓ {t("correctTag")}</span>}
                {isPlanned && <span className="badge accent">{t("planned")}</span>}
                {isSent && <span className="badge">{t("sent")}</span>}
                {dist && <span className="badge mono">{dist[a.id] ?? 0}</span>}
              </span>
            </button>
          );
        })}
      </div>

      <div className="answer-status">
        <span className="muted">{t("answerStatus")}:</span>
        <span className={`badge ${statusMeta.tone}`}>{t(statusMeta.key)}</span>
        {ans.answerId && <span className="badge mono">{ans.answerId}</span>}
        {ans.mode && <span className="badge">{ans.mode}</span>}
        {ans.plannedDelayMs !== null && ans.mode === "auto" && (
          <span className="faint ltr">
            {t("plannedDelay")}: {formatMs(ans.plannedDelayMs)}
          </span>
        )}
        {ans.sentAt && (
          <span className="faint ltr mono">
            {t("sentAt")} {fmtClock(ans.sentAt)}
          </span>
        )}
        {ans.result && (
          <span className={ans.result.correct ? "" : ""} style={{ color: ans.result.correct ? "var(--green)" : "var(--red)" }}>
            {ans.result.correct ? `✓ ${t("correct")}` : `✗ ${t("wrong")}`} · +{ans.result.points} {t("points")} · {t("serverElapsed")}{" "}
            <span className="mono ltr">{ans.result.elapsedMs}ms</span>
          </span>
        )}
        {(ans.error || (ans.reason && ans.status !== "sent")) && <span className="faint small">{ans.error ?? ans.reason}</span>}
      </div>
    </Card>
  );
}
