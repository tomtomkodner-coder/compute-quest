import { randomBytes, randomUUID } from "node:crypto";
import {
  computePoints,
  DEFAULT_REVEAL_MS,
  DEFAULT_TIME_LIMIT_MS,
  TypedEmitter,
  USERNAME_MAX,
  USERNAME_MIN,
  type AnswerId,
  type AnswerResult,
  type AnyServerEvent,
  type GamePhase,
  type GameResults,
  type GameState,
  type LeaderboardEntry,
  type PlayerPublic,
  type QuestionDefinition,
  type QuestionView,
  type ServerEventPayloads,
  type ServerEventType,
} from "@quizlab/shared";
import { GameError } from "./errors";

export interface GameOptions {
  pin: string;
  hostToken?: string;
  questions: QuestionDefinition[];
  timeLimitMs?: number;
  revealMs?: number;
  debug?: boolean;
  autoAdvance?: boolean;
  loop?: boolean;
  /** Delay before the game restarts when `loop` is on. */
  loopDelayMs?: number;
  autoStartMs?: number;
  maxPlayers?: number;
  /** Remove players whose socket dropped and did not come back within this time (0 = never). */
  disconnectGraceMs?: number;
  now?: () => number;
}

interface Player {
  id: string;
  token: string;
  username: string;
  score: number;
  correctCount: number;
  streak: number;
  connected: boolean;
  hadSocket: boolean;
  joinedAt: number;
  reapTimer: ReturnType<typeof setTimeout> | null;
}

interface StoredAnswer {
  answerId: AnswerId;
  correct: boolean;
  points: number;
  elapsedMs: number;
  receivedAt: number;
}

type GameEvents = { event: AnyServerEvent } & Record<string, unknown>;

export const newToken = () => randomBytes(18).toString("base64url");

/**
 * Authoritative, in-memory quiz game (lobby → question → reveal → … → ended).
 * All timing is done on the server; clients only receive state and events.
 */
export class Game extends TypedEmitter<GameEvents> {
  readonly pin: string;
  readonly hostToken: string;
  readonly createdAt: number;
  readonly debug: boolean;
  autoAdvance: boolean;
  readonly loop: boolean;

  private questions: QuestionDefinition[];
  private readonly originalQuestions: QuestionDefinition[];
  private timeLimitMs: number;
  private readonly revealMs: number;
  private readonly loopDelayMs: number;
  private readonly autoStartMs: number;
  private readonly maxPlayers: number;
  private readonly disconnectGraceMs: number;
  private readonly now: () => number;

  phase: GamePhase = "lobby";
  currentIndex = -1;
  private questionStartedAt = 0;
  private questionEndsAt = 0;
  private players = new Map<string, Player>();
  private tokens = new Map<string, string>();
  private answers = new Map<number, Map<string, StoredAnswer>>();
  private questionTimer: ReturnType<typeof setTimeout> | null = null;
  private advanceTimer: ReturnType<typeof setTimeout> | null = null;
  private autoStartTimer: ReturnType<typeof setTimeout> | null = null;
  private seq = 0;
  lastActivity: number;

  constructor(opts: GameOptions) {
    super();
    if (!opts.questions.length) throw new GameError("no_questions", "A game needs at least one question");
    this.now = opts.now ?? Date.now;
    this.pin = opts.pin;
    this.hostToken = opts.hostToken ?? newToken();
    this.questions = opts.questions.map(cloneQuestion);
    this.originalQuestions = opts.questions.map(cloneQuestion);
    this.timeLimitMs = opts.timeLimitMs ?? DEFAULT_TIME_LIMIT_MS;
    this.revealMs = opts.revealMs ?? DEFAULT_REVEAL_MS;
    this.debug = opts.debug ?? true;
    this.autoAdvance = opts.autoAdvance ?? true;
    this.loop = opts.loop ?? false;
    this.loopDelayMs = opts.loopDelayMs ?? 8_000;
    this.autoStartMs = opts.autoStartMs ?? 0;
    this.maxPlayers = opts.maxPlayers ?? 50;
    this.disconnectGraceMs = opts.disconnectGraceMs ?? 30_000;
    this.createdAt = this.now();
    this.lastActivity = this.createdAt;
  }

  // ------------------------------------------------------------------ players

  join(rawUsername: string): { player: PlayerPublic; token: string } {
    const username = String(rawUsername ?? "").trim();
    if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
      throw new GameError("invalid_username", `Username must be ${USERNAME_MIN}-${USERNAME_MAX} characters`);
    }
    if (this.phase === "ended") throw new GameError("game_ended", "This game has ended", 409);
    if (this.players.size >= this.maxPlayers) throw new GameError("game_full", "The game is full", 409);
    const taken = [...this.players.values()].some((p) => p.username.toLowerCase() === username.toLowerCase());
    if (taken) throw new GameError("username_taken", "Username already taken in this game", 409);

    const player: Player = {
      id: randomUUID(),
      token: newToken(),
      username,
      score: 0,
      correctCount: 0,
      streak: 0,
      connected: false,
      hadSocket: false,
      joinedAt: this.now(),
      reapTimer: null,
    };
    this.players.set(player.id, player);
    this.tokens.set(player.token, player.id);
    this.touch();
    this.broadcast("player_joined", { player: this.publicPlayer(player), rejoined: false, playerCount: this.players.size });

    if (this.phase === "lobby" && this.autoStartMs > 0 && !this.autoStartTimer) {
      this.autoStartTimer = setTimeout(() => {
        this.autoStartTimer = null;
        if (this.phase === "lobby" && this.players.size > 0) this.start();
      }, this.autoStartMs);
    }
    return { player: this.publicPlayer(player), token: player.token };
  }

  playerByToken(token: string | undefined | null): Player | undefined {
    if (!token) return undefined;
    const id = this.tokens.get(token);
    return id ? this.players.get(id) : undefined;
  }

  requirePlayer(token: string | undefined | null): Player {
    const player = this.playerByToken(token);
    if (!player) throw new GameError("invalid_player_token", "Unknown or expired player token", 401);
    return player;
  }

  /** Called by the WebSocket layer when a player's socket opens/closes. */
  setConnected(playerId: string, connected: boolean): void {
    const player = this.players.get(playerId);
    if (!player || player.connected === connected) return;
    const rejoin = connected && player.hadSocket;
    player.connected = connected;
    if (connected) player.hadSocket = true;
    if (player.reapTimer) clearTimeout(player.reapTimer);
    player.reapTimer = null;
    if (!connected && this.disconnectGraceMs > 0) {
      // Free the slot/username if the player never comes back (closed tab, crashed client…).
      player.reapTimer = setTimeout(() => {
        player.reapTimer = null;
        if (!player.connected && this.players.get(player.id) === player) this.removePlayer(player, "timeout");
      }, this.disconnectGraceMs);
    }
    this.touch();
    if (connected) {
      if (rejoin) {
        this.broadcast("player_joined", { player: this.publicPlayer(player), rejoined: true, playerCount: this.players.size });
      }
    } else {
      this.broadcast("player_left", {
        playerId: player.id,
        username: player.username,
        reason: "disconnect",
        playerCount: this.players.size,
      });
    }
  }

  leave(token: string): void {
    this.removePlayer(this.requirePlayer(token), "leave");
  }

  private removePlayer(player: Player, reason: "leave" | "timeout"): void {
    if (player.reapTimer) clearTimeout(player.reapTimer);
    this.players.delete(player.id);
    this.tokens.delete(player.token);
    for (const map of this.answers.values()) map.delete(player.id);
    this.touch();
    this.broadcast("player_left", {
      playerId: player.id,
      username: player.username,
      reason,
      playerCount: this.players.size,
    });
    this.maybeEndEarly();
  }

  // ------------------------------------------------------------------ flow

  start(): void {
    if (this.phase !== "lobby") throw new GameError("already_started", "Game already started", 409);
    this.clearTimer("autoStartTimer");
    this.broadcast("game_started", { totalQuestions: this.questions.length });
    this.startQuestion(0);
  }

  startQuestion(index: number): void {
    if (index < 0 || index >= this.questions.length) {
      throw new GameError("invalid_index", `Question index must be 0-${this.questions.length - 1}`);
    }
    if (this.phase === "ended") throw new GameError("game_ended", "This game has ended", 409);
    this.clearTimer("autoStartTimer");
    this.clearTimer("advanceTimer");
    this.clearTimer("questionTimer");
    this.currentIndex = index;
    this.phase = "question";
    const q = this.questions[index]!;
    const limit = q.timeLimitMs ?? this.timeLimitMs;
    this.questionStartedAt = this.now();
    this.questionEndsAt = this.questionStartedAt + limit;
    this.answers.set(index, new Map());
    this.scheduleQuestionEnd();
    this.touch();
    this.broadcast("question_started", { question: this.questionView()! });
  }

  /** Start the next question (manual trigger). */
  next(): void {
    if (this.phase === "lobby") return this.start();
    const nextIndex = this.currentIndex + 1;
    if (nextIndex >= this.questions.length) return this.endGame();
    this.startQuestion(nextIndex);
  }

  endQuestion(): void {
    if (this.phase !== "question") throw new GameError("no_active_question", "No question is running", 409);
    this.clearTimer("questionTimer");
    const q = this.questions[this.currentIndex]!;
    const answers = this.answers.get(this.currentIndex) ?? new Map<string, StoredAnswer>();
    // Players who did not answer lose their streak.
    for (const p of this.players.values()) if (!answers.has(p.id)) p.streak = 0;
    this.phase = "reveal";
    const hasNext = this.currentIndex + 1 < this.questions.length;
    this.touch();
    this.broadcast("question_ended", {
      questionId: q.id,
      index: this.currentIndex,
      correctAnswerId: q.correctAnswerId,
      distribution: distribution(q, answers),
      leaderboard: this.leaderboard(),
      hasNext,
    });
    if (this.autoAdvance) {
      this.advanceTimer = setTimeout(() => {
        this.advanceTimer = null;
        if (this.phase !== "reveal") return;
        if (hasNext) this.startQuestion(this.currentIndex + 1);
        else this.endGame();
      }, this.revealMs);
    }
  }

  endGame(): void {
    if (this.phase === "ended") return;
    if (this.phase === "question") this.endQuestion();
    this.clearAllTimers();
    this.phase = "ended";
    this.touch();
    this.broadcast("game_ended", { leaderboard: this.leaderboard() });
    if (this.loop) {
      this.advanceTimer = setTimeout(() => {
        this.advanceTimer = null;
        this.reset();
      }, this.loopDelayMs);
    }
  }

  /** Back to the lobby with the original questions; players stay but scores are cleared. */
  reset(): void {
    this.clearAllTimers();
    this.phase = "lobby";
    this.currentIndex = -1;
    this.questions = this.originalQuestions.map(cloneQuestion);
    this.answers.clear();
    for (const p of this.players.values()) {
      p.score = 0;
      p.correctCount = 0;
      p.streak = 0;
    }
    this.touch();
    this.broadcast("game_reset", { state: this.getState() });
    if (this.autoStartMs > 0 && this.players.size > 0) {
      this.autoStartTimer = setTimeout(() => {
        this.autoStartTimer = null;
        if (this.phase === "lobby" && this.players.size > 0) this.start();
      }, this.autoStartMs);
    }
  }

  // ------------------------------------------------------------------ answers

  submitAnswer(token: string, answerId: AnswerId, questionId?: string, clientSentAt?: number): AnswerResult {
    const player = this.requirePlayer(token);
    if (this.phase !== "question") throw new GameError("no_active_question", "No question is accepting answers", 409);
    const q = this.questions[this.currentIndex]!;
    if (questionId && questionId !== q.id) {
      throw new GameError("stale_question", "Answer is for a question that is no longer active", 409);
    }
    if (!q.answers.some((a) => a.id === answerId)) {
      throw new GameError("invalid_answer", `Answer "${answerId}" does not exist for this question`);
    }
    const receivedAt = this.now();
    if (receivedAt > this.questionEndsAt) throw new GameError("too_late", "Time is up for this question", 409);
    const answers = this.answers.get(this.currentIndex)!;
    if (answers.has(player.id)) throw new GameError("already_answered", "You already answered this question", 409);

    const elapsedMs = receivedAt - this.questionStartedAt;
    const limit = this.questionEndsAt - this.questionStartedAt;
    const correct = answerId === q.correctAnswerId;
    const points = computePoints(correct, elapsedMs, limit);
    answers.set(player.id, { answerId, correct, points, elapsedMs, receivedAt });
    player.score += points;
    if (correct) {
      player.correctCount += 1;
      player.streak += 1;
    } else {
      player.streak = 0;
    }
    this.touch();
    this.broadcast("answer_submitted", {
      questionId: q.id,
      playerId: player.id,
      username: player.username,
      answeredCount: answers.size,
      totalPlayers: this.players.size,
      elapsedMs,
    });
    const rank = this.leaderboard().find((e) => e.playerId === player.id)?.rank;
    const result: AnswerResult = {
      accepted: true,
      questionId: q.id,
      answerId,
      correct,
      points,
      totalScore: player.score,
      elapsedMs,
      receivedAt,
      clientSentAt,
      rank,
      ...(this.debug ? { correctAnswerId: q.correctAnswerId } : {}),
    };
    this.maybeEndEarly();
    return result;
  }

  private maybeEndEarly(): void {
    if (this.phase !== "question" || this.players.size === 0) return;
    const answers = this.answers.get(this.currentIndex);
    if (answers && answers.size >= this.players.size) {
      // Let the HTTP response be sent before the question_ended broadcast.
      setTimeout(() => {
        if (this.phase === "question" && (this.answers.get(this.currentIndex)?.size ?? 0) >= this.players.size) {
          this.endQuestion();
        }
      }, 0);
    }
  }

  // ------------------------------------------------------------------ developer controls

  setRemaining(remainingMs: number): void {
    if (this.phase !== "question") throw new GameError("no_active_question", "No question is running", 409);
    const ms = Math.max(0, Math.min(10 * 60_000, Math.round(Number(remainingMs))));
    if (!Number.isFinite(ms)) throw new GameError("invalid_timer", "remainingMs must be a number");
    this.questionEndsAt = this.now() + ms;
    this.scheduleQuestionEnd();
    this.broadcast("question_updated", {
      questionId: this.questions[this.currentIndex]!.id,
      endsAt: this.questionEndsAt,
      remainingMs: ms,
      reason: "timer",
      question: this.questionView()!,
    });
  }

  setDefaultTimeLimit(timeLimitMs: number): void {
    const ms = Math.round(Number(timeLimitMs));
    if (!Number.isFinite(ms) || ms < 1000 || ms > 10 * 60_000) {
      throw new GameError("invalid_timer", "timeLimitMs must be between 1000 and 600000");
    }
    this.timeLimitMs = ms;
    for (let i = this.currentIndex + 1; i < this.questions.length; i++) delete this.questions[i]!.timeLimitMs;
  }

  setCorrectAnswer(answerId: AnswerId): void {
    const index = this.phase === "lobby" ? 0 : this.currentIndex;
    const q = this.questions[index];
    if (!q) throw new GameError("no_question", "No question to modify");
    if (!q.answers.some((a) => a.id === answerId)) throw new GameError("invalid_answer", `Unknown answer "${answerId}"`);
    q.correctAnswerId = answerId;
    if (this.phase === "question") {
      this.broadcast("question_updated", {
        questionId: q.id,
        reason: "correct_answer",
        ...(this.debug ? { correctAnswerId: answerId } : {}),
        question: this.questionView()!,
      });
    }
  }

  /** Insert a custom question right after the current one (optionally start it now). */
  addQuestion(def: Omit<QuestionDefinition, "id"> & { id?: string }, startNow = true): void {
    const question = validateQuestion(def);
    const insertAt = this.currentIndex + 1;
    this.questions.splice(insertAt, 0, question);
    if (this.phase === "ended") {
      // Sending a question after the end re-opens the game.
      this.phase = "reveal";
      startNow = true;
    }
    if (startNow) this.startQuestion(insertAt);
  }

  setAutoAdvance(value: boolean): void {
    this.autoAdvance = value;
    if (!value) this.clearTimer("advanceTimer");
  }

  // ------------------------------------------------------------------ views

  questionView(): QuestionView | null {
    if (this.phase !== "question" && this.phase !== "reveal") return null;
    const q = this.questions[this.currentIndex];
    if (!q) return null;
    const includeCorrect = this.debug || this.phase === "reveal";
    return {
      id: q.id,
      index: this.currentIndex,
      total: this.questions.length,
      text: q.text,
      answers: q.answers.map((a) => ({ ...a })),
      timeLimitMs: this.questionEndsAt - this.questionStartedAt,
      startedAt: this.questionStartedAt,
      endsAt: this.questionEndsAt,
      ...(includeCorrect ? { correctAnswerId: q.correctAnswerId } : {}),
    };
  }

  getState(): GameState {
    const now = this.now();
    const answers = this.currentIndex >= 0 ? this.answers.get(this.currentIndex) : undefined;
    return {
      pin: this.pin,
      phase: this.phase,
      questionIndex: this.currentIndex,
      totalQuestions: this.questions.length,
      players: [...this.players.values()].map((p) => this.publicPlayer(p)),
      question: this.questionView(),
      remainingMs: this.phase === "question" ? Math.max(0, this.questionEndsAt - now) : 0,
      answeredCount: answers?.size ?? 0,
      debug: this.debug,
      autoAdvance: this.autoAdvance,
      serverTime: now,
      createdAt: this.createdAt,
    };
  }

  leaderboard(): LeaderboardEntry[] {
    return [...this.players.values()]
      .sort((a, b) => b.score - a.score || b.correctCount - a.correctCount || a.joinedAt - b.joinedAt)
      .map((p, i) => ({ rank: i + 1, playerId: p.id, username: p.username, score: p.score, correctCount: p.correctCount }));
  }

  getResults(): GameResults {
    const finished = this.phase === "question" ? this.currentIndex : this.currentIndex + 1;
    return {
      pin: this.pin,
      phase: this.phase,
      totalQuestions: this.questions.length,
      leaderboard: this.leaderboard(),
      questions: this.questions.slice(0, Math.max(0, finished)).map((q, index) => {
        const answers = this.answers.get(index) ?? new Map<string, StoredAnswer>();
        return {
          id: q.id,
          index,
          text: q.text,
          correctAnswerId: q.correctAnswerId,
          distribution: distribution(q, answers),
          answeredCount: answers.size,
          correctCount: [...answers.values()].filter((a) => a.correct).length,
        };
      }),
    };
  }

  get playerCount(): number {
    return this.players.size;
  }
  get connectedCount(): number {
    return [...this.players.values()].filter((p) => p.connected).length;
  }

  dispose(): void {
    this.clearAllTimers();
    for (const p of this.players.values()) if (p.reapTimer) clearTimeout(p.reapTimer);
    this.removeAllListeners();
  }

  // ------------------------------------------------------------------ internals

  private publicPlayer(p: Player): PlayerPublic {
    const answers = this.currentIndex >= 0 ? this.answers.get(this.currentIndex) : undefined;
    return {
      id: p.id,
      username: p.username,
      score: p.score,
      connected: p.connected,
      answeredCurrent: this.phase === "question" && !!answers?.has(p.id),
      correctCount: p.correctCount,
      streak: p.streak,
    };
  }

  private scheduleQuestionEnd(): void {
    this.clearTimer("questionTimer");
    const delay = Math.max(0, this.questionEndsAt - this.now());
    this.questionTimer = setTimeout(() => {
      this.questionTimer = null;
      if (this.phase === "question") this.endQuestion();
    }, delay);
  }

  private broadcast<T extends ServerEventType>(type: T, payload: ServerEventPayloads[T]): void {
    const event = { type, pin: this.pin, seq: ++this.seq, serverTime: this.now(), payload } as AnyServerEvent;
    this.emit("event", event);
  }

  /** Build a one-off event (e.g. hello/pong) with the current sequence number, without broadcasting it. */
  makeEvent<T extends ServerEventType>(type: T, payload: ServerEventPayloads[T]): AnyServerEvent {
    return { type, pin: this.pin, seq: this.seq, serverTime: this.now(), payload } as AnyServerEvent;
  }

  private touch(): void {
    this.lastActivity = this.now();
  }

  private clearTimer(name: "questionTimer" | "advanceTimer" | "autoStartTimer"): void {
    const t = this[name];
    if (t) clearTimeout(t);
    this[name] = null;
  }

  private clearAllTimers(): void {
    this.clearTimer("questionTimer");
    this.clearTimer("advanceTimer");
    this.clearTimer("autoStartTimer");
  }
}

function cloneQuestion(q: QuestionDefinition): QuestionDefinition {
  return { ...q, answers: q.answers.map((a) => ({ ...a })) };
}

function distribution(q: QuestionDefinition, answers: Map<string, StoredAnswer>): Record<string, number> {
  const dist: Record<string, number> = Object.fromEntries(q.answers.map((a) => [a.id, 0]));
  for (const a of answers.values()) dist[a.answerId] = (dist[a.answerId] ?? 0) + 1;
  return dist;
}

let customCounter = 0;

export function validateQuestion(def: Partial<QuestionDefinition>): QuestionDefinition {
  const text = String(def?.text ?? "").trim();
  if (!text || text.length > 500) throw new GameError("invalid_question", "Question text must be 1-500 characters");
  if (!Array.isArray(def.answers) || def.answers.length < 2 || def.answers.length > 6) {
    throw new GameError("invalid_question", "A question needs 2-6 answers");
  }
  const answers = def.answers.map((a, i) => {
    const id = String(a?.id ?? "ABCDEF"[i]).trim();
    const t = String(a?.text ?? "").trim();
    if (!id || !t || t.length > 200) throw new GameError("invalid_question", `Answer ${i + 1} is invalid`);
    return { id, text: t };
  });
  if (new Set(answers.map((a) => a.id)).size !== answers.length) {
    throw new GameError("invalid_question", "Answer ids must be unique");
  }
  const correct = String(def.correctAnswerId ?? "");
  if (!answers.some((a) => a.id === correct)) {
    throw new GameError("invalid_question", "correctAnswerId must match one of the answers");
  }
  let timeLimitMs: number | undefined;
  if (def.timeLimitMs !== undefined && def.timeLimitMs !== null) {
    timeLimitMs = Math.round(Number(def.timeLimitMs));
    if (!Number.isFinite(timeLimitMs) || timeLimitMs < 1000 || timeLimitMs > 10 * 60_000) {
      throw new GameError("invalid_question", "timeLimitMs must be between 1000 and 600000");
    }
  }
  return {
    id: def.id ? String(def.id) : `custom-${Date.now().toString(36)}-${customCounter++}`,
    text,
    answers,
    correctAnswerId: correct,
    ...(timeLimitMs ? { timeLimitMs } : {}),
  };
}
