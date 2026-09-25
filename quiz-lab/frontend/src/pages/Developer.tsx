import { useEffect, useMemo, useState } from "react";
import { MockHostAPI, type NetworkEntry } from "@quizlab/shared";
import { IconTrash } from "../components/Icons";
import { Card, CheckRow, fmtClock, JsonView } from "../components/ui";
import { useT } from "../i18n";
import { lab, useLab, useSettings } from "../state/lab";
import { toast } from "../state/toasts";

type Tab = "ws" | "http" | "answers" | "latency";

function useHostApi() {
  const s = useSettings();
  const host = useMemo(() => {
    const h = new MockHostAPI(s.apiUrl);
    h.on("network", (e) => lab.reportNetwork(e));
    return h;
  }, [s.apiUrl]);
  return host;
}

function HostControls() {
  const t = useT();
  const s = useSettings();
  const state = useLab();
  const host = useHostApi();
  const [pin, setPin] = useState(state.session?.pin ?? s.pin);
  const [busy, setBusy] = useState(false);
  const [timerSec, setTimerSec] = useState(10);
  const [defaultSec, setDefaultSec] = useState(20);
  const [create, setCreate] = useState({ questionCount: 20, timeLimitSec: 20, debug: true, autoAdvance: true });
  const [custom, setCustom] = useState({ text: "", answers: ["", "", "", ""], correct: "A", timeLimitSec: 20, startNow: true });

  useEffect(() => {
    if (state.session?.pin) setPin(state.session.pin);
  }, [state.session?.pin]);

  const run = async (label: string, fn: () => Promise<unknown>) => {
    host.pin = pin;
    host.hostToken = s.hostToken;
    setBusy(true);
    try {
      await fn();
      lab.log("info", "system", `[dev] ${label} ✓`);
    } catch (err) {
      toast(`${label}: ${(err as Error).message}`, "error");
      lab.log("error", "system", `[dev] ${label} failed: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const createGame = (join: boolean) =>
    run(t("createGame"), async () => {
      const res = await host.createGame({
        questionCount: create.questionCount,
        timeLimitMs: create.timeLimitSec * 1000,
        debug: create.debug,
        autoAdvance: create.autoAdvance,
      });
      setPin(res.pin);
      lab.updateSettings({ hostToken: res.hostToken, pin: res.pin });
      toast(`PIN ${res.pin}`);
      if (join) await lab.connectAndJoin(res.pin, s.username);
    });

  const q = state.question;
  const answerIds = q?.answers.map((a) => a.id) ?? ["A", "B", "C", "D"];

  return (
    <div className="grid grid-2">
      <Card title={t("hostControls")}>
        <div className="grid grid-2" style={{ gap: 10 }}>
          <label className="field">
            <span>{t("targetPin")}</span>
            <input className="input mono ltr" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
          </label>
          <label className="field">
            <span>{t("hostToken")}</span>
            <input className="input mono ltr" value={s.hostToken} onChange={(e) => lab.updateSettings({ hostToken: e.target.value })} />
          </label>
        </div>
        <div className="row" style={{ marginBottom: 12 }}>
          <button className="btn" disabled={busy} onClick={() => run(t("start"), () => host.start())}>▶ {t("start")}</button>
          <button className="btn primary" disabled={busy} onClick={() => run(t("nextQuestion"), () => host.nextQuestion())}>⏭ {t("nextQuestion")}</button>
          <button className="btn" disabled={busy} onClick={() => run(t("endQuestion"), () => host.endQuestion())}>⏹ {t("endQuestion")}</button>
          <button className="btn" disabled={busy} onClick={() => run(t("endGame"), () => host.endGame())}>🏁 {t("endGame")}</button>
          <button className="btn danger" disabled={busy} onClick={() => run(t("reset"), () => host.reset())}>↺ {t("reset")}</button>
        </div>
        <CheckRow on={state.game?.autoAdvance ?? true} onChange={(v) => run(t("autoAdvance"), () => host.setAutoAdvance(v))}>
          {t("autoAdvance")}
        </CheckRow>

        <div className="field" style={{ marginTop: 8 }}>
          <span>{t("setTimer")}</span>
          <div className="row">
            <input className="input mono" style={{ width: 100 }} type="number" min={0} value={timerSec} onChange={(e) => setTimerSec(Number(e.target.value))} />
            <span className="muted">{t("seconds")}</span>
            <button className="btn" disabled={busy} onClick={() => run(t("setTimer"), () => host.setTimer(timerSec * 1000))}>⏱ {t("setTimer")}</button>
          </div>
        </div>
        <div className="field">
          <span>{t("setDefaultTimer")}</span>
          <div className="row">
            <input className="input mono" style={{ width: 100 }} type="number" min={1} value={defaultSec} onChange={(e) => setDefaultSec(Number(e.target.value))} />
            <span className="muted">{t("seconds")}</span>
            <button className="btn" disabled={busy} onClick={() => run(t("setDefaultTimer"), () => host.setDefaultTimeLimit(defaultSec * 1000))}>{t("setDefaultTimer")}</button>
          </div>
        </div>
        <div className="field">
          <span>
            {t("changeCorrect")} {q && <span className="faint">(Q{q.index + 1} · {q.correctAnswerId ?? "?"})</span>}
          </span>
          <div className="row">
            {answerIds.map((id) => (
              <button key={id} className={`btn ${q?.correctAnswerId === id ? "primary" : ""}`} disabled={busy} onClick={() => run(`${t("changeCorrect")} → ${id}`, () => host.setCorrectAnswer(id))}>
                {id}
              </button>
            ))}
          </div>
        </div>
        <div className="row" style={{ marginTop: 6 }}>
          <button className="btn" disabled={!state.session} onClick={() => lab.simulateDrop()}>📡 {t("simulateDrop")}</button>
        </div>
      </Card>

      <div className="stack">
        <Card title={t("createGame")}>
          <div className="grid grid-2" style={{ gap: 10 }}>
            <label className="field">
              <span>{t("questionsCount")}</span>
              <input className="input mono" type="number" min={1} max={20} value={create.questionCount} onChange={(e) => setCreate({ ...create, questionCount: Number(e.target.value) })} />
            </label>
            <label className="field">
              <span>{t("timeLimit")}</span>
              <input className="input mono" type="number" min={1} value={create.timeLimitSec} onChange={(e) => setCreate({ ...create, timeLimitSec: Number(e.target.value) })} />
            </label>
          </div>
          <CheckRow on={create.debug} onChange={(debug) => setCreate({ ...create, debug })}>{t("debugGame")}</CheckRow>
          <CheckRow on={create.autoAdvance} onChange={(autoAdvance) => setCreate({ ...create, autoAdvance })}>{t("autoAdvance")}</CheckRow>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn" disabled={busy} onClick={() => createGame(false)}>{t("createGame")}</button>
            <button className="btn primary" disabled={busy} onClick={() => createGame(true)}>{t("createAndJoin")}</button>
          </div>
        </Card>

        <Card title={t("sendQuestion")}>
          <label className="field">
            <span>{t("questionText")}</span>
            <textarea className="input" dir="auto" value={custom.text} onChange={(e) => setCustom({ ...custom, text: e.target.value })} />
          </label>
          <div className="grid grid-2" style={{ gap: 8 }}>
            {custom.answers.map((a, i) => (
              <label key={i} className="field">
                <span>
                  {t("answerLabel")} {"ABCD"[i]}
                </span>
                <input
                  className="input"
                  dir="auto"
                  value={a}
                  onChange={(e) => setCustom({ ...custom, answers: custom.answers.map((x, j) => (j === i ? e.target.value : x)) })}
                />
              </label>
            ))}
          </div>
          <div className="row">
            <label className="field" style={{ marginBottom: 0 }}>
              <span>{t("correctAnswer")}</span>
              <select className="input" value={custom.correct} onChange={(e) => setCustom({ ...custom, correct: e.target.value })}>
                {["A", "B", "C", "D"].map((id) => (
                  <option key={id}>{id}</option>
                ))}
              </select>
            </label>
            <label className="field" style={{ marginBottom: 0, width: 110 }}>
              <span>{t("timeLimit")}</span>
              <input className="input mono" type="number" min={1} value={custom.timeLimitSec} onChange={(e) => setCustom({ ...custom, timeLimitSec: Number(e.target.value) })} />
            </label>
          </div>
          <CheckRow on={custom.startNow} onChange={(startNow) => setCustom({ ...custom, startNow })}>{t("startNow")}</CheckRow>
          <button
            className="btn primary"
            disabled={busy || !custom.text.trim() || custom.answers.filter((a) => a.trim()).length < 2}
            onClick={() =>
              run(t("sendQuestion"), () => {
                const answers = custom.answers
                  .map((text, i) => ({ id: "ABCD"[i]!, text: text.trim() }))
                  .filter((a) => a.text);
                return host.sendQuestion(
                  { text: custom.text.trim(), answers, correctAnswerId: custom.correct, timeLimitMs: custom.timeLimitSec * 1000 },
                  custom.startNow,
                );
              })
            }
          >
            {t("send")}
          </button>
        </Card>
      </div>
    </div>
  );
}

function WsEvents() {
  const t = useT();
  const { events, clockOffsetMs } = useLab();
  const [type, setType] = useState("all");
  const types = useMemo(() => ["all", ...new Set(events.map((e) => e.event.type))], [events]);
  const rows = [...events].reverse().filter((e) => type === "all" || e.event.type === type);
  return (
    <>
      <div className="row" style={{ padding: 10 }}>
        <select className="input" style={{ width: 200 }} value={type} onChange={(e) => setType(e.target.value)}>
          {types.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <div style={{ flex: 1 }} />
        <button className="btn sm ghost" onClick={() => lab.clear("events")}>
          <IconTrash /> {t("clear")}
        </button>
      </div>
      <div className="table-wrap">
        <table className="table ltr">
          <thead>
            <tr>
              <th>#seq</th>
              <th>type</th>
              <th>server time</th>
              <th>received</th>
              <th>one-way ≈</th>
              <th>payload</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">{t("noData")}</td>
              </tr>
            )}
            {rows.map((e) => (
              <tr key={e.id}>
                <td className="mono">{e.event.seq}</td>
                <td>
                  <span className="badge accent">{e.event.type}</span>
                </td>
                <td className="mono">{fmtClock(e.event.serverTime)}</td>
                <td className="mono">{fmtClock(e.receivedAt)}</td>
                <td className="mono">{Math.max(0, Math.round(e.receivedAt + clockOffsetMs - e.event.serverTime))}ms</td>
                <td>
                  <details>
                    <summary className="faint">JSON</summary>
                    <JsonView value={e.event.payload} />
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function NetworkTable() {
  const t = useT();
  const { network } = useLab();
  const s = useSettings();
  const [kind, setKind] = useState<"all" | "http" | "ws">("http");
  const [open, setOpen] = useState<string | null>(null);
  const rows = [...network].reverse().filter((n) => kind === "all" || n.kind === kind);
  if (!s.plugins["network-debugger"]) {
    return <div className="empty">Network Debugger plugin is disabled.</div>;
  }
  return (
    <>
      <div className="row" style={{ padding: 10 }}>
        <select className="input" style={{ width: 140 }} value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          <option value="all">all</option>
          <option value="http">HTTP</option>
          <option value="ws">WebSocket</option>
        </select>
        <div style={{ flex: 1 }} />
        <button className="btn sm ghost" onClick={() => lab.clear("network")}>
          <IconTrash /> {t("clear")}
        </button>
      </div>
      <div className="table-wrap">
        <table className="table ltr">
          <thead>
            <tr>
              <th>{t("time")}</th>
              <th>kind</th>
              <th>{t("method")}</th>
              <th>{t("url")}</th>
              <th>{t("status")}</th>
              <th>{t("latency")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">{t("noData")}</td>
              </tr>
            )}
            {rows.map((n) => (
              <NetworkRow key={n.id} n={n} open={open === n.id} onToggle={() => setOpen(open === n.id ? null : n.id)} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function NetworkRow({ n, open, onToggle }: { n: NetworkEntry; open: boolean; onToggle: () => void }) {
  const t = useT();
  let path = n.url;
  try {
    const u = new URL(n.url);
    path = u.pathname + u.search;
  } catch {
    /* keep raw */
  }
  const tone = n.error || (n.status ?? 0) >= 400 ? "red" : n.status ? "green" : "";
  return (
    <>
      <tr className="clickable" onClick={onToggle}>
        <td className="mono">{fmtClock(n.startedAt)}</td>
        <td>{n.kind}</td>
        <td className="mono">{n.method ?? (n.direction === "in" ? "⬇" : "⬆")}</td>
        <td className="mono" style={{ maxWidth: 380, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {n.wsType ? <span className="badge accent" style={{ marginRight: 6 }}>{n.wsType}</span> : null}
          {path}
        </td>
        <td>{n.status ? <span className={`badge ${tone}`}>{n.status}</span> : n.error ? <span className="badge red">ERR</span> : "—"}</td>
        <td className="mono">{n.latencyMs !== undefined ? `${n.latencyMs}ms` : "—"}</td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6}>
            <div className="grid grid-2" style={{ gap: 10 }}>
              <div>
                <div className="small faint">{t("request")}</div>
                <JsonView value={n.requestBody ?? null} />
              </div>
              <div>
                <div className="small faint">{t("response")}</div>
                <JsonView value={n.error ? { error: n.error } : (n.responseBody ?? null)} />
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function AnswerTimings() {
  const t = useT();
  const { answers } = useLab();
  const rows = [...answers].reverse();
  return (
    <div className="table-wrap">
      <table className="table ltr">
        <thead>
          <tr>
            <th>Q</th>
            <th>{t("answerLabel")}</th>
            <th>mode</th>
            <th>{t("seenAt")}</th>
            <th>{t("plannedDelay")}</th>
            <th>{t("sentAt")}</th>
            <th>seen→sent</th>
            <th>{t("serverElapsed")}</th>
            <th>{t("rtt")}</th>
            <th>{t("result")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={10} className="muted">{t("noData")}</td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr key={`${r.questionId}-${i}`}>
              <td className="mono">{r.questionIndex + 1}</td>
              <td className="mono">{r.answerId}</td>
              <td>{r.mode}</td>
              <td className="mono">{fmtClock(r.questionSeenAt)}</td>
              <td className="mono">{r.plannedDelayMs}ms</td>
              <td className="mono">{fmtClock(r.sentAt)}</td>
              <td className="mono">{r.sentAt - r.questionSeenAt}ms</td>
              <td className="mono">{r.serverElapsedMs !== undefined ? `${r.serverElapsedMs}ms` : "—"}</td>
              <td className="mono">{r.roundTripMs !== undefined ? `${r.roundTripMs}ms` : "—"}</td>
              <td>
                {r.error ? (
                  <span className="badge red" title={r.error}>ERR</span>
                ) : r.correct ? (
                  <span className="badge green">✓ +{r.points}</span>
                ) : (
                  <span className="badge red">✗ 0</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function stats(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]!;
  return { avg, min: sorted[0]!, max: sorted[sorted.length - 1]!, p95, n: values.length };
}

function Latency() {
  const t = useT();
  const { network, clockOffsetMs } = useLab();
  const http = network.filter((n) => n.kind === "http" && n.latencyMs !== undefined).map((n) => n.latencyMs!);
  const ws = network.filter((n) => n.kind === "ws" && n.wsType === "pong" && n.latencyMs !== undefined).map((n) => n.latencyMs!);
  const sh = stats(http);
  const sw = stats(ws);
  const last = http.slice(-60);
  const peak = Math.max(1, ...last);
  const Row = ({ label, s }: { label: string; s: ReturnType<typeof stats> }) => (
    <tr>
      <td>{label}</td>
      <td className="mono">{s ? s.n : 0}</td>
      <td className="mono">{s ? `${s.avg.toFixed(1)}ms` : "—"}</td>
      <td className="mono">{s ? `${s.min.toFixed(1)}ms` : "—"}</td>
      <td className="mono">{s ? `${s.p95.toFixed(1)}ms` : "—"}</td>
      <td className="mono">{s ? `${s.max.toFixed(1)}ms` : "—"}</td>
    </tr>
  );
  return (
    <div className="card-body">
      <table className="table ltr" style={{ marginBottom: 16 }}>
        <thead>
          <tr>
            <th />
            <th>n</th>
            <th>{t("avg")}</th>
            <th>{t("min")}</th>
            <th>p95</th>
            <th>{t("max")}</th>
          </tr>
        </thead>
        <tbody>
          <Row label={t("httpLatency")} s={sh} />
          <Row label={t("wsRtt")} s={sw} />
        </tbody>
      </table>
      <div className="small faint" style={{ marginBottom: 6 }}>
        {t("httpLatency")} — last {last.length}
      </div>
      <div className="bars">
        {last.map((v, i) => (
          <div key={i} style={{ height: `${(v / peak) * 100}%` }} title={`${v}ms`} />
        ))}
      </div>
      <p className="small muted" style={{ marginTop: 12 }}>
        {t("clockOffset")}: <span className="mono ltr">{Math.round(clockOffsetMs)}ms</span>
      </p>
    </div>
  );
}

export function Developer() {
  const t = useT();
  const state = useLab();
  const [tab, setTab] = useState<Tab>("ws");
  return (
    <>
      <div className="page-title">
        <div>
          <h1>{t("developer")}</h1>
        </div>
      </div>
      <HostControls />
      <section className="card" style={{ marginTop: 16 }}>
        <div className="tabs">
          {(
            [
              ["ws", t("wsEvents"), state.events.length],
              ["http", t("apiRequests"), state.network.length],
              ["answers", t("answerTimings"), state.answers.length],
              ["latency", t("latency"), null],
            ] as Array<[Tab, string, number | null]>
          ).map(([id, label, n]) => (
            <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>
              <bdi>{label}</bdi>
              {n !== null && <span className="n">{n}</span>}
            </button>
          ))}
        </div>
        {tab === "ws" && <WsEvents />}
        {tab === "http" && <NetworkTable />}
        {tab === "answers" && <AnswerTimings />}
        {tab === "latency" && <Latency />}
      </section>
    </>
  );
}
