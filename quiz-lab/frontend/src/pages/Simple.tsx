import { useEffect, useMemo, useState } from "react";
import { MockHostAPI, type AnswerKey } from "@quizlab/shared";
import { SHAPES } from "../components/Icons";
import { QuestionPanel } from "../components/QuestionPanel";
import { Card, NumberInput, Segmented } from "../components/ui";
import { useT } from "../i18n";
import { lab, useLab, useSettings } from "../state/lab";
import { toast } from "../state/toasts";

/** Minimal "one player, two buttons" page: Auto Answer (instant / after N s) + show all answers. */
export function Simple() {
  const t = useT();
  const s = useSettings();
  const state = useLab();
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState<AnswerKey | null>(null);
  const [showKey, setShowKey] = useState(false);

  const host = useMemo(() => {
    const h = new MockHostAPI(s.apiUrl);
    h.on("network", (e) => lab.reportNetwork(e));
    return h;
  }, [s.apiUrl]);

  const autoOn = s.plugins["auto-answer"];
  const instant = !s.plugins["answer-delay"] || (s.delay.mode === "fixed" && s.delay.fixedMs === 0);
  const seconds = Math.max(1, Math.round((s.delay.fixedMs || 3000) / 1000));
  const revealing = s.plugins["show-correct"] && !s.hideCorrectAnswer && s.debugMode;
  const pin = state.session?.pin ?? s.pin;

  const loadKey = async () => {
    host.pin = pin;
    host.hostToken = s.hostToken;
    try {
      setKey(await host.answerKey());
    } catch {
      setKey(null);
      toast(t("answerKeyError"), "error");
    }
  };

  // Keep the answer key in sync while it is shown (custom questions, new game…).
  useEffect(() => {
    if (showKey && state.session) void loadKey();
  }, [showKey, state.session?.pin, state.game?.totalQuestions, state.game?.questionIndex]);

  const toggleAuto = () => {
    lab.updateSettings({
      plugins: { "auto-answer": !autoOn, "random-answer": true },
      autoAnswer: { strategy: "correct" },
      debugMode: true,
    });
  };

  const setTiming = (mode: "instant" | "delay", secs = seconds) => {
    if (mode === "instant") lab.updateSettings({ plugins: { "answer-delay": false } });
    else lab.updateSettings({ plugins: { "answer-delay": true }, delay: { mode: "fixed", fixedMs: secs * 1000 } });
  };

  const toggleAnswers = () => {
    const next = !(showKey && revealing);
    setShowKey(next);
    lab.updateSettings({ plugins: { "show-correct": next }, hideCorrectAnswer: !next, debugMode: true });
  };

  const soloGame = async () => {
    setBusy(true);
    try {
      const res = await host.createGame({ debug: true, autoAdvance: true, autoStartMs: 1500, timeLimitMs: 20000 });
      lab.updateSettings({ hostToken: res.hostToken, pin: res.pin });
      await lab.connectAndJoin(res.pin, s.username || "me");
    } catch (err) {
      toast(`${t("error")}: ${(err as Error).message}`, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-title">
        <div>
          <h1>{t("navSimple")}</h1>
          <p>{t("simpleIntro")}</p>
        </div>
        <div className="row">
          <button className="btn" disabled={busy} onClick={soloGame} title={t("soloHint")}>
            🎮 {t("soloGame")}
          </button>
        </div>
      </div>

      <div className="simple-actions">
        <button className={`big-btn ${autoOn ? "on" : ""}`} onClick={toggleAuto}>
          <span className="big-emoji">⚡</span>
          {autoOn ? t("autoAnswerOn") : t("autoAnswerOff")}
        </button>
        <button className={`big-btn ${showKey && revealing ? "on" : ""}`} onClick={toggleAnswers}>
          <span className="big-emoji">👁</span>
          {showKey && revealing ? t("hideAllAnswers") : t("showAllAnswers")}
        </button>
      </div>

      <Card title={t("whenToAnswer")} className="simple-timing">
        <div className="row">
          <Segmented<"instant" | "delay">
            value={instant ? "instant" : "delay"}
            onChange={(v) => setTiming(v)}
            options={[
              { value: "instant", label: `🚀 ${t("instantly")}` },
              { value: "delay", label: `⏱ ${t("afterSeconds")}` },
            ]}
          />
          {!instant && (
            <div className="row">
              <div style={{ width: 90 }}>
                <NumberInput value={seconds} min={1} max={60} onCommit={(v) => setTiming("delay", v)} />
              </div>
              <span className="muted">{t("seconds")}</span>
            </div>
          )}
        </div>
      </Card>

      <div className="stack" style={{ marginTop: 16 }}>
        <QuestionPanel />

        {showKey && key && (
          <Card title={`${t("answerKey")} · PIN ${key.pin}`} bodyClass="">
            <div className="table-wrap">
              <table className="table">
                <tbody>
                  {key.questions.map((q) => {
                    const i = q.answers.findIndex((a) => a.id === q.correctAnswerId);
                    const correct = q.answers[i];
                    return (
                      <tr key={`${q.id}-${q.index}`} className={q.index === key.currentIndex ? "key-current" : ""}>
                        <td className="mono" style={{ width: 40 }}>{q.index + 1}</td>
                        <td dir="auto">{q.text}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <span className={`key-answer a${i % 4}`}>
                            {SHAPES[i % SHAPES.length]} {q.correctAnswerId}
                          </span>{" "}
                          <b dir="auto">{correct?.text}</b>
                          {q.index === key.currentIndex && <span className="badge accent" style={{ marginInlineStart: 8 }}>{t("current")}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
