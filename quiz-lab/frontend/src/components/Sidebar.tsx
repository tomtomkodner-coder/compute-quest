import { useState, type ReactNode } from "react";
import { useT } from "../i18n";
import { lab, useLab, useSettings } from "../state/lab";
import { toast } from "../state/toasts";
import { IconBolt, IconCode, IconDashboard, IconPlug, IconSettings, IconShield } from "./Icons";
import { CONNECTION_META } from "./status";

export type Page = "simple" | "dashboard" | "plugins" | "developer" | "settings";

export function Sidebar({ page, onNavigate }: { page: Page; onNavigate: (p: Page) => void }) {
  const t = useT();
  const state = useLab();
  const settings = useSettings();
  const [busy, setBusy] = useState(false);
  const enabledPlugins = Object.values(settings.plugins).filter(Boolean).length;
  const joined = !!state.session;
  const meta = CONNECTION_META[state.connection];

  const connect = async () => {
    setBusy(true);
    try {
      await lab.connectAndJoin(settings.pin, settings.username);
    } catch (err) {
      toast(`${t("error")}: ${(err as Error).message}`, "error");
    } finally {
      setBusy(false);
    }
  };

  const nav: Array<{ id: Page; label: string; icon: ReactNode; extra?: string }> = [
    { id: "simple", label: t("navSimple"), icon: <IconBolt /> },
    { id: "dashboard", label: t("navDashboard"), icon: <IconDashboard /> },
    { id: "plugins", label: t("navPlugins"), icon: <IconPlug />, extra: `${enabledPlugins}/${lab.listPlugins().length}` },
    ...(settings.debugMode ? [{ id: "developer" as Page, label: t("navDeveloper"), icon: <IconCode /> }] : []),
    { id: "settings", label: t("navSettings"), icon: <IconSettings /> },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo">🧪</div>
        <div>
          <b>{t("appName")}</b>
          <small>{t("appTagline")}</small>
        </div>
      </div>

      <nav className="nav">
        {nav.map((n) => (
          <button key={n.id} className={page === n.id ? "active" : ""} onClick={() => onNavigate(n.id)}>
            {n.icon}
            {n.label}
            {n.extra && <span className="count">{n.extra}</span>}
          </button>
        ))}
      </nav>

      <div>
        <p className="side-section-title">{t("connection")}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (joined) void lab.disconnect();
            else void connect();
          }}
        >
          <label className="field">
            <span>{t("api")}</span>
            <select
              className="input"
              value={settings.apiKind}
              disabled={joined}
              onChange={(e) => lab.updateSettings({ apiKind: e.target.value as "mock" | "official" })}
            >
              <option value="mock">{t("apiMock")}</option>
              <option value="official">{t("apiOfficial")}</option>
            </select>
          </label>
          <label className="field">
            <span>{t("gamePin")}</span>
            <input
              className="input mono ltr"
              inputMode="numeric"
              placeholder="123456"
              value={settings.pin}
              disabled={joined}
              onChange={(e) => lab.updateSettings({ pin: e.target.value })}
            />
          </label>
          <label className="field">
            <span>{t("username")}</span>
            <input
              className="input"
              maxLength={24}
              value={settings.username}
              disabled={joined}
              onChange={(e) => lab.updateSettings({ username: e.target.value })}
            />
          </label>
          <button type="submit" className={`btn block ${joined ? "danger" : "primary"}`} disabled={busy}>
            {busy ? t("connecting") : joined ? t("disconnect") : t("connect")}
          </button>
        </form>

        <div className="row" style={{ marginTop: 12 }}>
          <span className={`dot ${meta.dot}`} />
          <b>{t(meta.key)}</b>
          {state.session && <span className="badge mono ltr">#{state.session.pin}</span>}
        </div>
        {state.connectionDetail && <div className="small faint" style={{ marginTop: 4 }}>{state.connectionDetail}</div>}
        {state.reconnect.attempt > 0 && !state.reconnect.exhausted && (
          <div className="small" style={{ marginTop: 6, color: "var(--yellow)" }}>
            {t("reconnectAttempt")} {state.reconnect.attempt}/{state.reconnect.max}
          </div>
        )}
        {state.reconnect.exhausted && (
          <div className="small" style={{ marginTop: 6, color: "var(--red)" }}>{t("reconnectExhausted")}</div>
        )}
        {settings.apiKind === "official" && <div className="warn-box" style={{ marginTop: 10 }}>{t("officialWarning")}</div>}
      </div>

      <div className="side-footer">
        <IconShield style={{ flex: "none", marginTop: 2 }} />
        <span>{t("safetyNote")}</span>
      </div>
    </aside>
  );
}
