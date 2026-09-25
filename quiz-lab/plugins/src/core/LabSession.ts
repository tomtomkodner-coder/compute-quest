import {
  ApiError,
  type AnswerId,
  type AnyServerEvent,
  type ConnectionChange,
  type GameAPI,
  type GameAPIKind,
  type NetworkEntry,
  type QuestionView,
  type Rng,
} from "@quizlab/shared";
import { PluginManager } from "./PluginManager";
import { mergeSettings, type LabSettings, type PluginId, type SettingsPatch } from "./settings";
import type {
  AnswerPlan,
  AnswerRecord,
  AnswerState,
  LabPlugin,
  LabState,
  LogLevel,
  PluginContext,
  ReconnectState,
} from "./types";

const MAX_LOGS = 500;
const MAX_EVENTS = 500;
const MAX_NETWORK = 300;
const MAX_ANSWERS = 200;

export interface LabSessionOptions {
  settings: LabSettings;
  plugins: LabPlugin[];
  /** Factory so the UI never instantiates an API itself. */
  createApi: (kind: GameAPIKind, settings: LabSettings) => GameAPI;
  rng?: Rng;
  now?: () => number;
}

const idleAnswer = (): AnswerState => ({
  status: "idle",
  answerId: null,
  mode: null,
  plannedDelayMs: null,
  scheduledFor: null,
  sentAt: null,
  result: null,
  error: null,
  reason: null,
});

/**
 * Client-side runtime: owns the GameAPI instance, the observable state consumed by the UI,
 * and the plugin pipeline. The UI only calls LabSession methods and renders `getState()`.
 */
export class LabSession {
  private state: LabState;
  private settings: LabSettings;
  private listeners = new Set<() => void>();
  private _api: GameAPI | null = null;
  private apiUnsubs: Array<() => void> = [];
  private answerTimer: ReturnType<typeof setTimeout> | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private logSeq = 0;
  private eventSeq = 0;
  private readonly plugins: PluginManager;
  private readonly createApi: LabSessionOptions["createApi"];
  private readonly rng: Rng;
  private readonly now: () => number;
  private disposed = false;

  constructor(opts: LabSessionOptions) {
    this.settings = opts.settings;
    this.createApi = opts.createApi;
    this.rng = opts.rng ?? Math.random;
    this.now = opts.now ?? Date.now;
    this.state = {
      connection: "idle",
      connectionDetail: "",
      reconnect: { attempt: 0, max: opts.settings.maxReconnectAttempts, nextRetryAt: null, exhausted: false },
      apiKind: opts.settings.apiKind,
      session: null,
      game: null,
      question: null,
      questionSeenAt: null,
      lastEnded: null,
      leaderboard: [],
      answer: idleAnswer(),
      clockOffsetMs: 0,
      logs: [],
      events: [],
      network: [],
      answers: [],
    };
    this.plugins = new PluginManager(
      opts.plugins,
      (p) => this.makeContext(p),
      (p, hook, err) => this.log("error", "system", `Plugin "${p.name}" failed in ${hook}: ${(err as Error)?.message ?? err}`),
    );
  }

  /** Enable plugins from settings. Call once after subscribing (Auto Join may connect immediately). */
  start(): void {
    this.plugins.sync(this.settings.plugins);
  }

  // ---------------------------------------------------------------- observable store

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getState = (): LabState => this.state;

  getSettings = (): LabSettings => this.settings;

  private set(patch: Partial<LabState>): void {
    if (this.disposed) return;
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l();
  }

  private setAnswer(patch: Partial<AnswerState>): void {
    this.set({ answer: { ...this.state.answer, ...patch } });
  }

  // ---------------------------------------------------------------- settings & plugins

  updateSettings(patch: SettingsPatch): LabSettings {
    const prev = this.settings;
    this.settings = mergeSettings(prev, patch);
    if (prev.maxReconnectAttempts !== this.settings.maxReconnectAttempts) {
      this.set({ reconnect: { ...this.state.reconnect, max: this.settings.maxReconnectAttempts } });
    }
    this.plugins.sync(this.settings.plugins);
    this.plugins.dispatch("onSettingsChange", this.settings, prev);
    for (const l of this.listeners) l();
    return this.settings;
  }

  setPluginEnabled(id: PluginId, enabled: boolean): void {
    this.updateSettings({ plugins: { [id]: enabled } as Record<PluginId, boolean> });
    this.log("info", "system", `Plugin ${id} ${enabled ? "enabled" : "disabled"}`);
  }

  isPluginEnabled(id: PluginId): boolean {
    return this.plugins.isEnabled(id);
  }

  listPlugins(): LabPlugin[] {
    return this.plugins.list();
  }

  get api(): GameAPI | null {
    return this._api;
  }

  // ---------------------------------------------------------------- logging

  log(level: LogLevel, source: LogEntry["source"], message: string, data?: unknown): void {
    const entry: LogEntry = { id: ++this.logSeq, ts: this.now(), level, source, message, data };
    this.set({ logs: [...this.state.logs.slice(-(MAX_LOGS - 1)), entry] });
  }

  clear(what: "logs" | "events" | "network" | "answers"): void {
    this.set({ [what]: [] } as Partial<LabState>);
  }

  // ---------------------------------------------------------------- connection

  private ensureApi(): GameAPI {
    const s = this.settings;
    const current = this._api;
    if (current && current.kind === s.apiKind && this.apiConfigKey === `${s.apiKind}|${s.apiUrl}|${s.wsUrl}`) {
      return current;
    }
    this.teardownApi();
    const api = this.createApi(s.apiKind, s);
    this.apiConfigKey = `${s.apiKind}|${s.apiUrl}|${s.wsUrl}`;
    this._api = api;
    this.apiUnsubs = [
      api.on("connection", (c) => this.onConnection(c)),
      api.on("event", (e) => this.onServerEvent(e)),
      api.on("network", (n) => this.onNetwork(n)),
    ];
    this.set({ apiKind: api.kind });
    return api;
  }

  private apiConfigKey = "";

  private teardownApi(): void {
    for (const off of this.apiUnsubs) off();
    this.apiUnsubs = [];
    this._api = null;
  }

  async connectAndJoin(pin = this.settings.pin, username = this.settings.username): Promise<void> {
    pin = String(pin ?? "").trim();
    username = String(username ?? "").trim();
    if (!pin) throw this.fail("Game PIN is required");
    if (!username) throw this.fail("Username is required");
    if (this.state.session) await this.disconnect(true);
    const api = this.ensureApi();
    this.set({ reconnect: { attempt: 0, max: this.settings.maxReconnectAttempts, nextRetryAt: null, exhausted: false } });
    this.log("info", "system", `Joining game ${pin} as "${username}" (${api.kind} API)…`);
    try {
      const res = await api.joinGame(pin, username);
      this.set({
        session: api.session,
        game: res.state,
        leaderboard: [],
        lastEnded: null,
        clockOffsetMs: api.clockOffsetMs,
      });
      this.log("success", "system", `Joined game ${res.pin} as "${res.username}"`, { playerId: res.playerId });
      if (res.state.question && res.state.phase === "question") this.handleQuestion(res.state.question);
    } catch (err) {
      const message = errorMessage(err);
      this.set({ connection: "error", connectionDetail: `join failed: ${message}` });
      this.log("error", "system", `Join failed: ${message}`, err instanceof ApiError ? { code: err.code } : undefined);
      throw err;
    }
  }

  async rejoin(): Promise<void> {
    const s = this.state.session;
    const pin = s?.pin ?? this.settings.pin;
    const username = s?.username ?? this.settings.username;
    const api = this.ensureApi();
    const res = await api.joinGame(pin, username);
    this.set({ session: api.session, game: res.state, clockOffsetMs: api.clockOffsetMs });
    this.log("success", "system", `Re-joined game ${res.pin} as "${res.username}" (new player id)`);
    if (res.state.question && res.state.phase === "question") this.handleQuestion(res.state.question);
  }

  async reconnect(): Promise<void> {
    const api = this._api;
    if (!api?.session) throw this.fail("Nothing to reconnect: not joined to a game");
    await api.reconnect();
  }

  async disconnect(silent = false): Promise<void> {
    this.cancelScheduledAnswer();
    const api = this._api;
    if (api) {
      try {
        await api.disconnect();
      } catch (err) {
        this.log("warn", "system", `Disconnect error: ${errorMessage(err)}`);
      }
    }
    this.set({
      session: null,
      game: null,
      question: null,
      questionSeenAt: null,
      answer: idleAnswer(),
      reconnect: { ...this.state.reconnect, attempt: 0, nextRetryAt: null },
    });
    if (!silent) this.log("info", "system", "Disconnected");
  }

  /** Developer helper: drop the realtime socket to test Auto Reconnect. */
  simulateDrop(): void {
    const api = this._api as (GameAPI & { simulateDrop?: () => void }) | null;
    if (api?.simulateDrop) {
      this.log("warn", "system", "Simulating network drop…");
      api.simulateDrop();
    } else {
      this.log("warn", "system", "The current API does not support simulated drops");
    }
  }

  async refreshState(): Promise<void> {
    const api = this._api;
    if (!api?.session) return;
    try {
      const game = await api.getGameState();
      this.set({ game, clockOffsetMs: api.clockOffsetMs });
      if (game.phase === "question" && game.question) this.handleQuestion(game.question);
    } catch (err) {
      this.log("warn", "api", `State refresh failed: ${errorMessage(err)}`);
    }
  }

  private scheduleRefresh(delay = 150): void {
    if (this.refreshTimer) return;
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      void this.refreshState();
    }, delay);
  }

  private onConnection(change: ConnectionChange): void {
    this.set({ connection: change.status, connectionDetail: change.detail ?? "" });
    const level: LogLevel =
      change.status === "connected" ? "success" : change.status === "error" || change.unexpected ? "warn" : "info";
    this.log(level, "api", `Connection: ${change.status}${change.detail ? ` — ${change.detail}` : ""}`);
    this.plugins.dispatch("onConnectionChange", change);
  }

  private onNetwork(entry: NetworkEntry): void {
    this.plugins.dispatch("onNetwork", entry);
  }

  /** Report traffic made outside the GameAPI (e.g. Developer-Mode host calls) to the plugins. */
  reportNetwork(entry: NetworkEntry): void {
    this.onNetwork(entry);
  }

  // ---------------------------------------------------------------- realtime events

  private onServerEvent(event: AnyServerEvent): void {
    if (event.type !== "pong") {
      const entry = { id: ++this.eventSeq, receivedAt: this.now(), event };
      this.set({ events: [...this.state.events.slice(-(MAX_EVENTS - 1)), entry] });
    }
    this.set({ clockOffsetMs: this._api?.clockOffsetMs ?? this.state.clockOffsetMs });
    this.plugins.dispatch("onServerEvent", event);

    switch (event.type) {
      case "hello": {
        const game = event.payload.state;
        this.set({ game, reconnect: { ...this.state.reconnect, attempt: 0, nextRetryAt: null, exhausted: false } });
        if (game.phase === "question" && game.question) {
          const me = game.players.find((p) => p.id === this._api?.session?.playerId);
          this.handleQuestion(game.question, me?.answeredCurrent);
        }
        break;
      }
      case "game_started":
        this.set({ lastEnded: null });
        this.scheduleRefresh();
        break;
      case "question_started":
        this.patchGame({ phase: "question", questionIndex: event.payload.question.index, question: event.payload.question });
        this.handleQuestion(event.payload.question);
        break;
      case "question_updated": {
        const q = event.payload.question;
        if (q && this.state.question?.id === q.id) {
          this.set({ question: q });
          this.patchGame({ question: q });
          if (event.payload.reason === "correct_answer") this.replanAnswer(q);
        }
        break;
      }
      case "answer_submitted":
        this.patchGame({ answeredCount: event.payload.answeredCount });
        break;
      case "question_ended": {
        const p = event.payload;
        this.set({ lastEnded: p, leaderboard: p.leaderboard });
        if (this.state.question?.id === p.questionId) {
          this.set({ question: { ...this.state.question, correctAnswerId: p.correctAnswerId } });
        }
        this.patchGame({ phase: "reveal" });
        const status = this.state.answer.status;
        if (status === "waiting" || status === "scheduled") {
          this.cancelScheduledAnswer();
          this.setAnswer({
            status: "missed",
            reason: status === "scheduled" ? "question ended before the delay elapsed" : "no answer sent",
          });
        }
        this.plugins.dispatch("onQuestionEnded", p);
        this.scheduleRefresh();
        break;
      }
      case "game_ended":
        this.cancelScheduledAnswer();
        this.set({ leaderboard: event.payload.leaderboard });
        this.patchGame({ phase: "ended" });
        this.log("info", "system", "Game ended", event.payload.leaderboard.slice(0, 3));
        this.scheduleRefresh();
        break;
      case "game_reset":
        this.cancelScheduledAnswer();
        this.set({
          game: event.payload.state,
          question: null,
          questionSeenAt: null,
          lastEnded: null,
          leaderboard: [],
          answer: idleAnswer(),
        });
        break;
      case "player_joined":
      case "player_left":
        this.scheduleRefresh();
        break;
      default:
        break;
    }
  }

  private patchGame(patch: Partial<NonNullable<LabState["game"]>>): void {
    if (!this.state.game) return;
    this.set({ game: { ...this.state.game, ...patch } });
  }

  // ---------------------------------------------------------------- question & answer pipeline

  private handleQuestion(question: QuestionView, alreadyAnswered = false): void {
    if (this.state.question?.id === question.id && this.state.question.index === question.index && this.state.questionSeenAt) {
      // Same question (e.g. state refresh) — just keep the freshest data.
      this.set({ question: { ...question, correctAnswerId: question.correctAnswerId ?? this.state.question.correctAnswerId } });
      return;
    }
    this.cancelScheduledAnswer();
    this.set({
      question,
      questionSeenAt: this.now(),
      lastEnded: null,
      answer: { ...idleAnswer(), status: alreadyAnswered ? "sent" : "waiting", reason: alreadyAnswered ? "answered before reconnect" : null },
    });
    this.plugins.dispatch("onQuestion", question);
    if (!alreadyAnswered) this.runAutoAnswer(question);
  }

  /** Build an answer plan by running `planAnswer` on every enabled plugin (in order). */
  buildPlan(question: QuestionView): AnswerPlan {
    const plan: AnswerPlan = { answerId: null, needsRandom: false, exclude: [], delayMs: 0, reasons: [], skip: false };
    this.plugins.dispatch("planAnswer", plan, question);
    return plan;
  }

  private runAutoAnswer(question: QuestionView): void {
    if (!this.plugins.isEnabled("auto-answer")) return;
    const plan = this.buildPlan(question);
    if (plan.skip || !plan.answerId) {
      const reason = plan.skip ? plan.reasons.join("; ") || "vetoed by a plugin" : `no answer chosen (${plan.reasons.join("; ") || "enable Random Answer for fallbacks"})`;
      this.setAnswer({ status: "skipped", reason });
      this.log("warn", "auto-answer", `Auto answer skipped: ${reason}`);
      return;
    }
    const remaining = question.endsAt - (this.now() + this.state.clockOffsetMs);
    if (plan.delayMs >= remaining) {
      this.log("warn", "answer-delay", `Delay ${plan.delayMs}ms ≥ remaining ${Math.max(0, Math.round(remaining))}ms — the answer will likely be late`);
    }
    const answerId = plan.answerId;
    this.setAnswer({
      status: "scheduled",
      answerId,
      mode: "auto",
      plannedDelayMs: plan.delayMs,
      scheduledFor: this.now() + plan.delayMs,
      reason: plan.reasons.join("; "),
    });
    this.log("info", "auto-answer", `Planned answer ${answerId} in ${plan.delayMs}ms (${plan.reasons.join("; ")})`);
    const fire = () => {
      this.answerTimer = null;
      if (this.state.question?.id !== question.id || this.state.answer.status !== "scheduled") return;
      void this.submitAnswer(this.state.answer.answerId ?? answerId, "auto");
    };
    if (plan.delayMs <= 0) fire();
    else this.answerTimer = setTimeout(fire, plan.delayMs);
  }

  /** The correct answer changed while an auto answer is pending → recompute the choice, keep the timer. */
  private replanAnswer(question: QuestionView): void {
    if (this.state.answer.status !== "scheduled" || this.state.answer.mode !== "auto") return;
    const plan = this.buildPlan(question);
    if (plan.answerId && plan.answerId !== this.state.answer.answerId) {
      this.log("info", "auto-answer", `Correct answer changed → re-planned ${this.state.answer.answerId} → ${plan.answerId}`);
      this.setAnswer({ answerId: plan.answerId, reason: plan.reasons.join("; ") });
    }
  }

  private cancelScheduledAnswer(): void {
    if (this.answerTimer) clearTimeout(this.answerTimer);
    this.answerTimer = null;
  }

  async submitAnswer(answerId: AnswerId, mode: "auto" | "manual" = "manual"): Promise<void> {
    const api = this._api;
    const question = this.state.question;
    if (!api?.session || !question) {
      this.log("warn", "system", "Cannot answer: no active question");
      return;
    }
    const status = this.state.answer.status;
    if (status === "sending" || status === "sent") {
      this.log("warn", "system", "Already answered this question");
      return;
    }
    if (mode === "manual") this.cancelScheduledAnswer();
    const sentAt = this.now();
    const record: AnswerRecord = {
      questionId: question.id,
      questionIndex: question.index,
      answerId,
      mode,
      questionSeenAt: this.state.questionSeenAt ?? sentAt,
      plannedDelayMs: mode === "auto" ? (this.state.answer.plannedDelayMs ?? 0) : 0,
      sentAt,
    };
    this.setAnswer({ status: "sending", answerId, mode, sentAt, error: null });
    this.plugins.dispatch("onAnswerSent", record);
    try {
      const result = await api.submitAnswer(answerId);
      record.respondedAt = this.now();
      record.roundTripMs = record.respondedAt - sentAt;
      record.serverElapsedMs = result.elapsedMs;
      record.serverReceivedAt = result.receivedAt;
      record.correct = result.correct;
      record.points = result.points;
      this.pushAnswerRecord(record);
      if (this.state.question?.id === question.id) this.setAnswer({ status: "sent", result });
      this.plugins.dispatch("onAnswerResult", result, record);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      record.error = e.message;
      record.respondedAt = this.now();
      record.roundTripMs = record.respondedAt - sentAt;
      this.pushAnswerRecord(record);
      const late = err instanceof ApiError && (err.code === "too_late" || err.code === "no_active_question" || err.code === "stale_question");
      if (this.state.question?.id === question.id) this.setAnswer({ status: late ? "late" : "error", error: e.message });
      this.plugins.dispatch("onAnswerError", e, record);
    }
  }

  private pushAnswerRecord(record: AnswerRecord): void {
    this.set({ answers: [...this.state.answers.slice(-(MAX_ANSWERS - 1)), { ...record }] });
  }

  // ---------------------------------------------------------------- plugin context

  private makeContext(plugin: LabPlugin): PluginContext {
    return {
      id: plugin.id,
      getState: () => this.state,
      getSettings: () => this.settings,
      isEnabled: (id) => this.plugins.isEnabled(id),
      log: (level, message, data) => this.log(level, plugin.id, message, data),
      api: () => this._api,
      rng: this.rng,
      connectAndJoin: (pin, username) => this.connectAndJoin(pin, username),
      reconnect: () => this.reconnect(),
      rejoin: () => this.rejoin(),
      submitAnswer: (answerId, mode = "auto") => this.submitAnswer(answerId, mode),
      setReconnectState: (patch: Partial<ReconnectState>) => this.set({ reconnect: { ...this.state.reconnect, ...patch } }),
      recordNetwork: (entry) => this.set({ network: [...this.state.network.slice(-(MAX_NETWORK - 1)), entry] }),
    };
  }

  private fail(message: string): Error {
    this.log("error", "system", message);
    return new Error(message);
  }

  dispose(): void {
    this.cancelScheduledAnswer();
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    this.plugins.disableAll();
    this.teardownApi();
    this.disposed = true;
    this.listeners.clear();
  }
}

type LogEntry = LabState["logs"][number];

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return `${err.message}${err.code && err.code !== "http_error" ? ` [${err.code}]` : ""}`;
  return err instanceof Error ? err.message : String(err);
}
