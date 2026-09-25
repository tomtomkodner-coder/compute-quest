import { useEffect, useMemo, useRef, useState } from "react";
import type { LogEntry, LogLevel } from "@quizlab/plugins";
import { useT } from "../i18n";
import { lab, useLab } from "../state/lab";
import { IconTrash } from "./Icons";
import { Card, fmtClock, JsonView } from "./ui";

const LEVELS: Array<LogLevel | "all"> = ["all", "debug", "info", "success", "warn", "error"];

export function LogConsole({ tall = false }: { tall?: boolean }) {
  const t = useT();
  const { logs } = useLab();
  const [level, setLevel] = useState<LogLevel | "all">("all");
  const [query, setQuery] = useState("");
  const [paused, setPaused] = useState(false);
  const [frozen, setFrozen] = useState<LogEntry[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const source = paused ? (frozen ?? logs) : logs;
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return source.filter(
      (l) => (level === "all" || l.level === level) && (!q || l.message.toLowerCase().includes(q) || l.source.includes(q)),
    );
  }, [source, level, query]);

  useEffect(() => {
    const el = ref.current;
    if (el && !paused) el.scrollTop = el.scrollHeight;
  }, [visible.length, paused]);

  return (
    <Card
      title={`${t("eventLog")} (${logs.length})`}
      bodyClass=""
      actions={
        <div className="row">
          <input className="input" style={{ width: 150, padding: "4px 8px" }} placeholder={t("filter")} value={query} onChange={(e) => setQuery(e.target.value)} />
          <select className="input" style={{ width: 100, padding: "4px 8px" }} value={level} onChange={(e) => setLevel(e.target.value as LogLevel | "all")}>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l === "all" ? t("all") : l}
              </option>
            ))}
          </select>
          <button
            className="btn sm"
            onClick={() => {
              setFrozen(paused ? null : logs);
              setPaused(!paused);
            }}
          >
            {paused ? t("resume") : t("pause")}
          </button>
          <button className="btn sm ghost" onClick={() => lab.clear("logs")} title={t("clear")}>
            <IconTrash />
          </button>
        </div>
      }
    >
      <div className={`console ${tall ? "tall" : ""}`} ref={ref}>
        {visible.length === 0 && <div className="empty">{t("noData")}</div>}
        {visible.map((l) => (
          <div key={l.id} className={`log-line ${l.level}`}>
            <span className="ts">{fmtClock(l.ts).slice(0, 12)}</span>
            <span className="src">[{l.source}]</span>
            <span className="msg">
              {l.message}
              {l.data !== undefined && (
                <details>
                  <summary>data</summary>
                  <JsonView value={l.data} />
                </details>
              )}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
