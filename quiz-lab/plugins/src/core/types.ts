import type {
  AnswerId,
  AnswerResult,
  AnyServerEvent,
  ConnectionChange,
  ConnectionStatus,
  GameAPI,
  GameState,
  LeaderboardEntry,
  NetworkEntry,
  QuestionView,
  Rng,
  ServerEventPayloads,
  SessionInfo,
} from "@quizlab/shared";
import type { LabSettings, PluginId } from "./settings";

export type AnswerStatus =
  | "idle"
  | "waiting"
  | "scheduled"
  | "sending"
  | "sent"
  | "late"
  | "missed"
  | "skipped"
  | "error";

export type LogLevel = "debug" | "info" | "success" | "warn" | "error";

export interface LogEntry {
  id: number;
  ts: number;
  level: LogLevel;
  source: PluginId | "system" | "api";
  message: string;
  data?: unknown;
}

export interface EventEntry {
  id: number;
  receivedAt: number;
  event: AnyServerEvent;
}

export interface AnswerRecord {
  questionId: string;
  questionIndex: number;
  answerId: AnswerId;
  mode: "auto" | "manual";
  /** Client epoch ms when the question was first seen. */
  questionSeenAt: number;
  plannedDelayMs: number;
  sentAt: number;
  /** Client epoch ms when the HTTP response arrived. */
  respondedAt?: number;
  roundTripMs?: number;
  /** Server-measured time from question start to answer receipt. */
  serverElapsedMs?: number;
  serverReceivedAt?: number;
  correct?: boolean;
  points?: number;
  error?: string;
}

export interface AnswerState {
  status: AnswerStatus;
  answerId: AnswerId | null;
  mode: "auto" | "manual" | null;
  plannedDelayMs: number | null;
  scheduledFor: number | null;
  sentAt: number | null;
  result: AnswerResult | null;
  error: string | null;
  reason: string | null;
}

export interface ReconnectState {
  attempt: number;
  max: number;
  nextRetryAt: number | null;
  exhausted: boolean;
}

export interface LabState {
  connection: ConnectionStatus;
  connectionDetail: string;
  reconnect: ReconnectState;
  apiKind: "mock" | "official";
  session: SessionInfo | null;
  game: GameState | null;
  question: QuestionView | null;
  questionSeenAt: number | null;
  lastEnded: ServerEventPayloads["question_ended"] | null;
  leaderboard: LeaderboardEntry[];
  answer: AnswerState;
  clockOffsetMs: number;
  logs: LogEntry[];
  events: EventEntry[];
  network: NetworkEntry[];
  answers: AnswerRecord[];
}

export interface AnswerPlan {
  answerId: AnswerId | null;
  needsRandom: boolean;
  exclude: AnswerId[];
  delayMs: number;
  reasons: string[];
  /** A plugin may veto the automatic answer. */
  skip: boolean;
}

/** What a plugin is allowed to do. Plugins never touch the UI or the network directly. */
export interface PluginContext {
  readonly id: PluginId;
  getState(): LabState;
  getSettings(): LabSettings;
  isEnabled(id: PluginId): boolean;
  log(level: LogLevel, message: string, data?: unknown): void;
  api(): GameAPI | null;
  rng: Rng;
  /** Join (or re-join) using the configured PIN/username. */
  connectAndJoin(pin?: string, username?: string): Promise<void>;
  /** Re-open the realtime channel of the current session. */
  reconnect(): Promise<void>;
  /** Join again with the same PIN/username (new player) — used when the old session is gone. */
  rejoin(): Promise<void>;
  submitAnswer(answerId: AnswerId, mode?: "auto" | "manual"): Promise<void>;
  setReconnectState(patch: Partial<ReconnectState>): void;
  recordNetwork(entry: NetworkEntry): void;
}

export interface LabPlugin {
  id: PluginId;
  name: string;
  description: string;
  /** Lower runs first in the answer pipeline. */
  order: number;
  category: "answer" | "connection" | "debug" | "ui";

  onEnable?(ctx: PluginContext): void;
  onDisable?(ctx: PluginContext): void;
  onSettingsChange?(ctx: PluginContext, next: LabSettings, prev: LabSettings): void;
  onConnectionChange?(ctx: PluginContext, change: ConnectionChange): void;
  onServerEvent?(ctx: PluginContext, event: AnyServerEvent): void;
  onQuestion?(ctx: PluginContext, question: QuestionView): void;
  /** Answer pipeline (only runs while Auto Answer is enabled). Mutate `plan`. */
  planAnswer?(ctx: PluginContext, plan: AnswerPlan, question: QuestionView): void;
  onAnswerSent?(ctx: PluginContext, record: AnswerRecord): void;
  onAnswerResult?(ctx: PluginContext, result: AnswerResult, record: AnswerRecord): void;
  onAnswerError?(ctx: PluginContext, error: Error, record: AnswerRecord): void;
  onQuestionEnded?(ctx: PluginContext, payload: ServerEventPayloads["question_ended"]): void;
  onNetwork?(ctx: PluginContext, entry: NetworkEntry): void;
}
