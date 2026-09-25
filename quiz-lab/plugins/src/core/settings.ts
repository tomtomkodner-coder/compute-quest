import {
  clamp,
  DEFAULT_MAX_RECONNECT_ATTEMPTS,
  type AnswerStrategy,
  type DelayConfig,
  type GameAPIKind,
} from "@quizlab/shared";

export const PLUGIN_IDS = [
  "auto-answer",
  "answer-delay",
  "random-answer",
  "show-correct",
  "auto-join",
  "auto-reconnect",
  "question-logger",
  "response-logger",
  "network-debugger",
] as const;

export type PluginId = (typeof PLUGIN_IDS)[number];

export interface LabSettings {
  apiKind: GameAPIKind;
  apiUrl: string;
  wsUrl: string;
  pin: string;
  username: string;
  autoAnswer: { strategy: AnswerStrategy; probability: number };
  /** `fixedMs` doubles as the "default delay" setting. */
  delay: DelayConfig;
  maxReconnectAttempts: number;
  debugMode: boolean;
  hideCorrectAnswer: boolean;
  theme: "dark" | "light";
  language: "he" | "en";
  plugins: Record<PluginId, boolean>;
  /** Developer Mode host token for the Mock Server. */
  hostToken: string;
}

export const DEFAULT_PLUGIN_STATE: Record<PluginId, boolean> = {
  "auto-answer": true,
  "answer-delay": true,
  "random-answer": true,
  "show-correct": true,
  "auto-join": false,
  "auto-reconnect": true,
  "question-logger": true,
  "response-logger": true,
  "network-debugger": true,
};

export const DEFAULT_SETTINGS: LabSettings = {
  apiKind: "mock",
  apiUrl: "/api",
  wsUrl: "/ws",
  pin: "123456",
  username: "tester",
  autoAnswer: { strategy: "correct", probability: 0.75 },
  delay: { mode: "fixed", fixedMs: 250, minMs: 100, maxMs: 1000 },
  maxReconnectAttempts: DEFAULT_MAX_RECONNECT_ATTEMPTS,
  debugMode: true,
  hideCorrectAnswer: false,
  theme: "dark",
  language: "he",
  plugins: { ...DEFAULT_PLUGIN_STATE },
  hostToken: "dev-host-token",
};

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

const pick = <T extends string>(v: unknown, allowed: readonly T[], d: T): T =>
  allowed.includes(v as T) ? (v as T) : d;
const num = (v: unknown, d: number, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) ? clamp(v, min, max) : d;
const text = (v: unknown, d: string, max = 500) => (typeof v === "string" ? v.slice(0, max) : d);

/** Merge untrusted input (localStorage, forms) onto defaults, validating every field. */
export function sanitizeSettings(input: unknown, base: LabSettings = DEFAULT_SETTINGS): LabSettings {
  const i = (input && typeof input === "object" ? input : {}) as DeepPartial<LabSettings>;
  const plugins = { ...base.plugins };
  for (const id of PLUGIN_IDS) {
    const v = (i.plugins as Record<string, unknown> | undefined)?.[id];
    if (typeof v === "boolean") plugins[id] = v;
  }
  return {
    apiKind: pick(i.apiKind, ["mock", "official"] as const, base.apiKind),
    apiUrl: text(i.apiUrl, base.apiUrl).trim() || base.apiUrl,
    wsUrl: text(i.wsUrl, base.wsUrl).trim() || base.wsUrl,
    pin: text(i.pin, base.pin, 12).replace(/\D/g, ""),
    username: text(i.username, base.username, 24),
    autoAnswer: {
      strategy: pick(i.autoAnswer?.strategy, ["correct", "random", "probability"] as const, base.autoAnswer.strategy),
      probability: num(i.autoAnswer?.probability, base.autoAnswer.probability, 0, 1),
    },
    delay: {
      mode: pick(i.delay?.mode, ["fixed", "random"] as const, base.delay.mode),
      fixedMs: num(i.delay?.fixedMs, base.delay.fixedMs, 0, 60_000),
      minMs: num(i.delay?.minMs, base.delay.minMs, 0, 60_000),
      maxMs: num(i.delay?.maxMs, base.delay.maxMs, 0, 60_000),
    },
    maxReconnectAttempts: Math.round(num(i.maxReconnectAttempts, base.maxReconnectAttempts, 1, 20)),
    debugMode: typeof i.debugMode === "boolean" ? i.debugMode : base.debugMode,
    hideCorrectAnswer: typeof i.hideCorrectAnswer === "boolean" ? i.hideCorrectAnswer : base.hideCorrectAnswer,
    theme: pick(i.theme, ["dark", "light"] as const, base.theme),
    language: pick(i.language, ["he", "en"] as const, base.language),
    plugins,
    hostToken: text(i.hostToken, base.hostToken, 200),
  };
}

export function mergeSettings(current: LabSettings, patch: DeepPartial<LabSettings>): LabSettings {
  return sanitizeSettings(
    {
      ...current,
      ...patch,
      autoAnswer: { ...current.autoAnswer, ...(patch.autoAnswer ?? {}) },
      delay: { ...current.delay, ...(patch.delay ?? {}) },
      plugins: { ...current.plugins, ...(patch.plugins ?? {}) },
    },
    current,
  );
}

export type SettingsPatch = DeepPartial<LabSettings>;
