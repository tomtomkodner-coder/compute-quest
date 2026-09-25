import { CheckRow, Card, NumberInput, Segmented } from "../components/ui";
import { useT } from "../i18n";
import { defaultSettings, lab, useSettings } from "../state/lab";
import { toast } from "../state/toasts";

export function Settings() {
  const t = useT();
  const s = useSettings();
  return (
    <>
      <div className="page-title">
        <div>
          <h1>{t("settings")}</h1>
          <p>{t("settingsIntro")}</p>
        </div>
        <button
          className="btn danger"
          onClick={() => {
            lab.updateSettings(defaultSettings);
            toast(t("saved"));
          }}
        >
          {t("resetDefaults")}
        </button>
      </div>

      <div className="grid grid-2">
        <Card title={t("connection")}>
          <label className="field">
            <span>{t("apiImpl")}</span>
            <select className="input" value={s.apiKind} onChange={(e) => lab.updateSettings({ apiKind: e.target.value as "mock" | "official" })}>
              <option value="mock">MockGameAPI — {t("apiMock")}</option>
              <option value="official">OfficialGameAPI — {t("apiOfficial")}</option>
            </select>
          </label>
          <label className="field">
            <span>{t("apiUrl")}</span>
            <input className="input mono ltr" value={s.apiUrl} onChange={(e) => lab.updateSettings({ apiUrl: e.target.value })} placeholder="/api or http://localhost:4000" />
          </label>
          <label className="field">
            <span>{t("wsUrl")}</span>
            <input className="input mono ltr" value={s.wsUrl} onChange={(e) => lab.updateSettings({ wsUrl: e.target.value })} placeholder="/ws or ws://localhost:4000/ws" />
          </label>
          <label className="field">
            <span>{t("username")}</span>
            <input className="input" maxLength={24} value={s.username} onChange={(e) => lab.updateSettings({ username: e.target.value })} />
          </label>
          <label className="field">
            <span>{t("defaultPin")}</span>
            <input className="input mono ltr" value={s.pin} onChange={(e) => lab.updateSettings({ pin: e.target.value })} />
          </label>
          {s.apiKind === "official" && <div className="warn-box">{t("officialWarning")}</div>}
        </Card>

        <Card title={t("autoAnswer")}>
          <label className="field">
            <span>{t("defaultDelay")}</span>
            <NumberInput value={s.delay.fixedMs} min={0} max={60000} onCommit={(fixedMs) => lab.updateSettings({ delay: { fixedMs } })} />
          </label>
          <CheckRow on={s.plugins["auto-reconnect"]} onChange={(v) => lab.setPluginEnabled("auto-reconnect", v)}>
            {t("autoReconnect")}
          </CheckRow>
          <label className="field" style={{ marginTop: 8 }}>
            <span>{t("maxAttempts")}</span>
            <NumberInput value={s.maxReconnectAttempts} min={1} max={20} onCommit={(v) => lab.updateSettings({ maxReconnectAttempts: v })} />
          </label>
          <CheckRow on={s.debugMode} onChange={(v) => lab.updateSettings({ debugMode: v })}>
            {t("debugMode")}
          </CheckRow>
          <CheckRow on={s.hideCorrectAnswer} onChange={(v) => lab.updateSettings({ hideCorrectAnswer: v })}>
            {t("hideCorrect")}
          </CheckRow>
        </Card>

        <Card title={`${t("theme")} / ${t("language")}`}>
          <div className="field">
            <span>{t("theme")}</span>
            <Segmented
              value={s.theme}
              onChange={(theme) => lab.updateSettings({ theme })}
              options={[
                { value: "dark", label: `🌙 ${t("themeDark")}` },
                { value: "light", label: `☀️ ${t("themeLight")}` },
              ]}
            />
          </div>
          <div className="field">
            <span>{t("language")}</span>
            <Segmented
              value={s.language}
              onChange={(language) => lab.updateSettings({ language })}
              options={[
                { value: "he", label: "עברית (RTL)" },
                { value: "en", label: "English (LTR)" },
              ]}
            />
          </div>
        </Card>

        <Card title="localStorage">
          <pre className="json">{JSON.stringify(s, null, 2)}</pre>
        </Card>
      </div>
    </>
  );
}
