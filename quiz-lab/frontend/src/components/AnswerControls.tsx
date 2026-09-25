import { DELAY_PRESETS_MS, formatMs, type AnswerStrategy } from "@quizlab/shared";
import { useT } from "../i18n";
import { lab, useSettings } from "../state/lab";
import { Card, CheckRow, NumberInput, Segmented, Switch } from "./ui";

export function AutoAnswerControls({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const s = useSettings();
  const body = (
    <>
      <div className="field">
        <span>{t("strategy")}</span>
        <Segmented<AnswerStrategy>
          value={s.autoAnswer.strategy}
          onChange={(strategy) => lab.updateSettings({ autoAnswer: { strategy } })}
          options={[
            { value: "correct", label: t("strategyCorrect") },
            { value: "random", label: t("strategyRandom") },
            { value: "probability", label: t("strategyProbability") },
          ]}
        />
      </div>
      {s.autoAnswer.strategy === "probability" && (
        <label className="field">
          <span>
            {t("probability")}: <b className="mono">{Math.round(s.autoAnswer.probability * 100)}%</b>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(s.autoAnswer.probability * 100)}
            onChange={(e) => lab.updateSettings({ autoAnswer: { probability: Number(e.target.value) / 100 } })}
          />
        </label>
      )}
      {s.autoAnswer.strategy !== "correct" && !s.plugins["random-answer"] && (
        <div className="warn-box small">Random Answer plugin is off — random picks will be skipped.</div>
      )}
    </>
  );
  if (compact) return body;
  return (
    <Card
      title={t("autoAnswer")}
      actions={<Switch on={s.plugins["auto-answer"]} onChange={(v) => lab.setPluginEnabled("auto-answer", v)} label={t("autoAnswer")} />}
    >
      {body}
    </Card>
  );
}

export function DelayControls({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const s = useSettings();
  const d = s.delay;
  const isPreset = (DELAY_PRESETS_MS as readonly number[]).includes(d.fixedMs);
  const body = (
    <>
      <div className="field">
        <Segmented<"fixed" | "random">
          value={d.mode}
          onChange={(mode) => lab.updateSettings({ delay: { mode } })}
          options={[
            { value: "fixed", label: t("delayFixed") },
            { value: "random", label: t("delayRandom") },
          ]}
        />
      </div>
      {d.mode === "fixed" ? (
        <>
          <div className="field">
            <Segmented<number | "custom">
              value={isPreset ? d.fixedMs : "custom"}
              onChange={(v) => {
                if (v !== "custom") lab.updateSettings({ delay: { fixedMs: v } });
                else lab.updateSettings({ delay: { fixedMs: d.fixedMs === 0 ? 750 : d.fixedMs + 1 } });
              }}
              options={[
                ...DELAY_PRESETS_MS.map((ms) => ({ value: ms as number | "custom", label: <span className="ltr">{formatMs(ms)}</span> })),
                { value: "custom", label: t("custom") },
              ]}
            />
          </div>
          {!isPreset && (
            <label className="field">
              <span>{t("customDelay")}</span>
              <NumberInput value={d.fixedMs} min={0} max={60000} onCommit={(fixedMs) => lab.updateSettings({ delay: { fixedMs } })} />
            </label>
          )}
        </>
      ) : (
        <div className="grid grid-2" style={{ gap: 10 }}>
          <label className="field">
            <span>{t("minDelay")}</span>
            <NumberInput value={d.minMs} min={0} max={60000} onCommit={(minMs) => lab.updateSettings({ delay: { minMs } })} />
          </label>
          <label className="field">
            <span>{t("maxDelay")}</span>
            <NumberInput value={d.maxMs} min={0} max={60000} onCommit={(maxMs) => lab.updateSettings({ delay: { maxMs } })} />
          </label>
        </div>
      )}
    </>
  );
  if (compact) return body;
  return (
    <Card
      title={t("answerDelay")}
      actions={<Switch on={s.plugins["answer-delay"]} onChange={(v) => lab.setPluginEnabled("answer-delay", v)} label={t("answerDelay")} />}
    >
      {body}
    </Card>
  );
}

export function ShowAnswersControls({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const s = useSettings();
  const body = (
    <>
      <CheckRow on={s.plugins["show-correct"]} onChange={(v) => lab.setPluginEnabled("show-correct", v)}>
        {t("showCorrect")}
      </CheckRow>
      <CheckRow on={s.hideCorrectAnswer} onChange={(v) => lab.updateSettings({ hideCorrectAnswer: v })}>
        {t("hideCorrect")}
      </CheckRow>
      {!s.debugMode && <div className="small faint">{t("debugMode")}: {t("off")}</div>}
    </>
  );
  if (compact) return body;
  return <Card title={t("showAnswers")}>{body}</Card>;
}
