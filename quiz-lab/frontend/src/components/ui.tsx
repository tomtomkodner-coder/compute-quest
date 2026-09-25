import { useState, type ReactNode } from "react";

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`switch ${on ? "on" : ""}`}
      onClick={() => onChange(!on)}
    />
  );
}

export function CheckRow({ on, onChange, children }: { on: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="check-row" onClick={(e) => { e.preventDefault(); onChange(!on); }}>
      <Switch on={on} onChange={onChange} />
      <span>{children}</span>
    </label>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: ReactNode }>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="seg" role="radiogroup">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={o.value === value ? "on" : ""}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Card({
  title,
  actions,
  children,
  bodyClass = "card-body",
  className = "",
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  bodyClass?: string;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {title !== undefined && (
        <div className="card-head">
          <h2>{title}</h2>
          <div className="spacer" />
          {actions}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

export function JsonView({ value }: { value: unknown }) {
  let text: string;
  try {
    text = JSON.stringify(value, null, 2) ?? "undefined";
  } catch {
    text = String(value);
  }
  return <pre className="json">{text}</pre>;
}

/** Numeric input that commits on blur/Enter (keeps typing smooth). */
export function NumberInput({
  value,
  onCommit,
  min,
  max,
  step,
  className = "input mono",
}: {
  value: number;
  onCommit: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const n = Number(draft);
    if (Number.isFinite(n)) onCommit(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n)));
    setDraft(null);
  };
  return (
    <input
      className={className}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      step={step}
      value={draft ?? String(value)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && commit()}
    />
  );
}

export function fmtClock(ts: number | null | undefined): string {
  if (!ts) return "—";
  const d = new Date(ts);
  const p = (n: number, l = 2) => String(n).padStart(l, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}
