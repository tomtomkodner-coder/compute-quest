import type { LabPlugin, PluginId } from "@quizlab/plugins";
import { AutoAnswerControls, DelayControls, ShowAnswersControls } from "../components/AnswerControls";
import { NumberInput, Switch } from "../components/ui";
import { useT } from "../i18n";
import { lab, useSettings } from "../state/lab";

const CATEGORY_TONE: Record<LabPlugin["category"], string> = {
  answer: "accent",
  connection: "blue",
  debug: "yellow",
  ui: "green",
};

function PluginExtras({ id }: { id: PluginId }) {
  const t = useT();
  const s = useSettings();
  switch (id) {
    case "auto-answer":
      return <AutoAnswerControls compact />;
    case "answer-delay":
      return <DelayControls compact />;
    case "show-correct":
      return <ShowAnswersControls compact />;
    case "auto-reconnect":
      return (
        <label className="field">
          <span>{t("maxAttempts")}</span>
          <NumberInput value={s.maxReconnectAttempts} min={1} max={20} onCommit={(v) => lab.updateSettings({ maxReconnectAttempts: v })} />
        </label>
      );
    case "auto-join":
      return (
        <div className="small muted ltr mono">
          PIN {s.pin || "—"} · {s.username || "—"}
        </div>
      );
    default:
      return null;
  }
}

export function Plugins() {
  const t = useT();
  const s = useSettings();
  const plugins = lab.listPlugins();
  return (
    <>
      <div className="page-title">
        <div>
          <h1>{t("plugins")}</h1>
          <p>{t("pluginsIntro")}</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <pre className="check-list">
          {plugins.map((p) => `[${s.plugins[p.id] ? "✓" : " "}] ${p.name}`).join("\n")}
        </pre>
      </div>

      <div className="plugin-grid">
        {plugins.map((p) => (
          <section key={p.id} className="card plugin-card">
            <div className="card-head">
              <h3>{p.name}</h3>
              <span className={`badge ${CATEGORY_TONE[p.category]}`}>{p.category}</span>
              <div className="spacer" />
              <span className={`small ${s.plugins[p.id] ? "" : "faint"}`}>{s.plugins[p.id] ? t("enabled") : t("disabled")}</span>
              <Switch on={s.plugins[p.id]} onChange={(v) => lab.setPluginEnabled(p.id, v)} label={p.name} />
            </div>
            <div className="card-body">
              <p className="muted" style={{ marginTop: 0 }}>
                {p.description}
              </p>
              <div className="small faint mono ltr" style={{ marginBottom: 10 }}>
                id: {p.id} · {t("order")}: {p.order}
              </div>
              <PluginExtras id={p.id} />
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
