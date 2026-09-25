import { randomInt } from "node:crypto";
import {
  DEFAULT_QUESTIONS,
  PIN_LENGTH,
  type CreateGameRequest,
  type QuestionDefinition,
} from "@quizlab/shared";
import { GameError } from "./errors";
import { Game, validateQuestion, type GameOptions } from "./Game";

export interface StoreOptions {
  maxGames: number;
  defaultTimeLimitMs: number;
  revealMs: number;
  maxPlayers: number;
  disconnectGraceMs?: number;
  /** Games idle longer than this are removed (ms). */
  idleTtlMs?: number;
}

export class GameStore {
  private games = new Map<string, Game>();
  private listeners = new Set<(game: Game) => void>();
  private sweeper: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly opts: StoreOptions) {
    const ttl = opts.idleTtlMs ?? 60 * 60_000;
    this.sweeper = setInterval(() => this.sweep(ttl), Math.min(ttl, 5 * 60_000));
    this.sweeper.unref?.();
  }

  /** Subscribe to newly created games (used by the WebSocket hub). */
  onCreate(listener: (game: Game) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  create(req: CreateGameRequest & Partial<Pick<GameOptions, "pin" | "hostToken" | "loopDelayMs">> = {}): Game {
    if (this.games.size >= this.opts.maxGames) throw new GameError("too_many_games", "Game limit reached", 503);
    let questions: QuestionDefinition[];
    if (req.questions?.length) {
      if (req.questions.length > 100) throw new GameError("invalid_question", "At most 100 questions per game");
      questions = req.questions.map((q) => validateQuestion(q));
    } else {
      questions = [...DEFAULT_QUESTIONS];
    }
    if (req.shuffle) questions = shuffle(questions);
    if (req.questionCount && req.questionCount > 0) questions = questions.slice(0, Math.floor(req.questionCount));

    let pin = req.pin;
    if (pin) {
      if (this.games.has(pin)) throw new GameError("pin_taken", `PIN ${pin} is already in use`, 409);
    } else {
      pin = this.uniquePin();
    }
    const timeLimitMs = req.timeLimitMs ?? this.opts.defaultTimeLimitMs;
    if (!Number.isFinite(timeLimitMs) || timeLimitMs < 1000 || timeLimitMs > 10 * 60_000) {
      throw new GameError("invalid_timer", "timeLimitMs must be between 1000 and 600000");
    }
    const game = new Game({
      pin,
      hostToken: req.hostToken,
      questions,
      timeLimitMs,
      revealMs: this.opts.revealMs,
      debug: req.debug ?? true,
      autoAdvance: req.autoAdvance ?? true,
      loop: req.loop ?? false,
      loopDelayMs: req.loopDelayMs,
      autoStartMs: req.autoStartMs ?? 0,
      maxPlayers: this.opts.maxPlayers,
      disconnectGraceMs: this.opts.disconnectGraceMs,
    });
    this.games.set(pin, game);
    for (const l of this.listeners) l(game);
    return game;
  }

  get(pin: string | undefined | null): Game | undefined {
    return pin ? this.games.get(String(pin)) : undefined;
  }

  require(pin: string | undefined | null): Game {
    const game = this.get(pin);
    if (!game) throw new GameError("game_not_found", `No game with PIN ${pin ?? "(empty)"}`, 404);
    return game;
  }

  list(): Game[] {
    return [...this.games.values()];
  }

  remove(pin: string): void {
    this.games.get(pin)?.dispose();
    this.games.delete(pin);
  }

  dispose(): void {
    if (this.sweeper) clearInterval(this.sweeper);
    for (const g of this.games.values()) g.dispose();
    this.games.clear();
  }

  private sweep(ttl: number): void {
    const now = Date.now();
    for (const g of this.games.values()) {
      if (g.loop) continue; // looping demo games are permanent
      if (now - g.lastActivity > ttl && g.connectedCount === 0) this.remove(g.pin);
    }
  }

  private uniquePin(): string {
    for (let i = 0; i < 1000; i++) {
      const pin = String(randomInt(10 ** (PIN_LENGTH - 1), 10 ** PIN_LENGTH));
      if (!this.games.has(pin)) return pin;
    }
    throw new GameError("pin_exhausted", "Could not allocate a PIN", 503);
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
