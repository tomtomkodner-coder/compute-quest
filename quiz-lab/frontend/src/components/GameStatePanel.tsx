import { useT } from "../i18n";
import { useLab } from "../state/lab";
import { Card } from "./ui";

export function GameStatePanel() {
  const t = useT();
  const state = useLab();
  const game = state.game;
  const me = state.session?.playerId;
  const board =
    state.leaderboard.length > 0
      ? state.leaderboard
      : [...(game?.players ?? [])]
          .sort((a, b) => b.score - a.score)
          .map((p, i) => ({ rank: i + 1, playerId: p.id, username: p.username, score: p.score, correctCount: p.correctCount }));
  const connectedById = new Map(game?.players.map((p) => [p.id, p.connected]) ?? []);

  return (
    <Card title={t("gameState")}>
      {game ? (
        <>
          <dl className="kv">
            <dt>{t("phase")}</dt>
            <dd>
              <span className="badge accent">{game.phase}</span>
            </dd>
            <dt>{t("gamePin")}</dt>
            <dd className="mono ltr">{game.pin}</dd>
            <dt>{t("question")}</dt>
            <dd className="ltr">
              {game.questionIndex + 1 > 0 ? game.questionIndex + 1 : "–"} / {game.totalQuestions}
            </dd>
            <dt>{t("players")}</dt>
            <dd>{game.players.length}</dd>
            <dt>{t("answered")}</dt>
            <dd>
              {game.answeredCount}/{game.players.length}
            </dd>
            <dt>Debug</dt>
            <dd>{game.debug ? "✓" : "✗"}</dd>
            <dt>{t("autoAdvance")}</dt>
            <dd>{game.autoAdvance ? "✓" : "✗"}</dd>
          </dl>
          <h3 className="side-section-title" style={{ marginTop: 16 }}>
            {t("leaderboard")}
          </h3>
          <ol className="lb">
            {board.slice(0, 10).map((e) => (
              <li key={e.playerId} className={e.playerId === me ? "me" : ""}>
                <span className="rank">{e.rank}</span>
                <span className={`dot ${connectedById.get(e.playerId) === false ? "red" : "green"}`} />
                <span dir="auto">{e.username}</span>
                {e.playerId === me && <span className="badge accent">{t("you")}</span>}
                <span className="score">{e.score}</span>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <div className="empty">—</div>
      )}
    </Card>
  );
}
