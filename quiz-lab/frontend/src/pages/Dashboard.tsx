import { AutoAnswerControls, DelayControls, ShowAnswersControls } from "../components/AnswerControls";
import { GameStatePanel } from "../components/GameStatePanel";
import { LogConsole } from "../components/LogConsole";
import { QuestionPanel } from "../components/QuestionPanel";
import { StatusTiles } from "../components/StatusTiles";
import { useT } from "../i18n";

export function Dashboard() {
  const t = useT();
  return (
    <>
      <div className="page-title">
        <div>
          <h1>{t("navDashboard")}</h1>
        </div>
      </div>
      <StatusTiles />
      <div className="grid grid-main">
        <div className="stack">
          <QuestionPanel />
          <LogConsole />
        </div>
        <div className="stack">
          <AutoAnswerControls />
          <DelayControls />
          <ShowAnswersControls />
          <GameStatePanel />
        </div>
      </div>
    </>
  );
}
