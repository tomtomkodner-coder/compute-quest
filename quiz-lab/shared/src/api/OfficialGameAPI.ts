import { TypedEmitter } from "../emitter";
import { assertAllowedUrl } from "../security";
import type {
  AnswerId,
  AnswerResult,
  ConnectionStatus,
  GameResults,
  GameState,
  JoinGameResponse,
  QuestionView,
} from "../types";
import type { GameAPI, GameAPIEvents, SessionInfo } from "./GameAPI";

export interface OfficialGameAPIConfig {
  /** Base URL of a public / officially documented quiz API you are authorized to use. */
  apiUrl: string;
  wsUrl?: string;
  /** Credential issued to you by the API provider (never scraped or borrowed). */
  apiKey?: string;
}

export class NotImplementedError extends Error {
  constructor(method: string) {
    super(
      `OfficialGameAPI.${method}() is a placeholder. Implement it against a public/official API ` +
        `you are authorized to use (see docs/API.md → "Adding a real provider").`,
    );
    this.name = "NotImplementedError";
  }
}

/**
 * Placeholder for a future integration with a public, officially documented and authorized API.
 *
 * It intentionally contains no reverse-engineered protocol. Kahoot-owned hosts are refused
 * (see `security.ts`); Kahoot does not offer a public player API, and this project does not use
 * private endpoints.
 *
 * To integrate a real provider: map each method to the provider's documented endpoint,
 * translate the responses into the shared types (GameState, QuestionView, AnswerResult...)
 * and emit `connection` / `event` / `network` events like MockGameAPI does.
 */
export class OfficialGameAPI extends TypedEmitter<GameAPIEvents> implements GameAPI {
  readonly kind = "official" as const;
  readonly session: SessionInfo | null = null;
  readonly clockOffsetMs = 0;
  private _status: ConnectionStatus = "idle";

  constructor(private readonly config: OfficialGameAPIConfig) {
    super();
    assertAllowedUrl(config.apiUrl);
    if (config.wsUrl) assertAllowedUrl(config.wsUrl);
  }

  get status(): ConnectionStatus {
    return this._status;
  }

  private notImplemented(method: string): never {
    this._status = "error";
    const err = new NotImplementedError(method);
    this.emit("connection", { status: "error", detail: err.message, fatal: true });
    throw err;
  }

  async connect(): Promise<void> {
    this.notImplemented("connect");
  }
  async joinGame(_pin: string, _username: string): Promise<JoinGameResponse> {
    this.notImplemented("joinGame");
  }
  async getGameState(): Promise<GameState> {
    this.notImplemented("getGameState");
  }
  async getQuestion(): Promise<QuestionView | null> {
    this.notImplemented("getQuestion");
  }
  async submitAnswer(_answerId: AnswerId): Promise<AnswerResult> {
    this.notImplemented("submitAnswer");
  }
  async disconnect(): Promise<void> {
    this._status = "disconnected";
    this.emit("connection", { status: "disconnected", detail: "disconnected by user" });
  }
  async reconnect(): Promise<void> {
    this.notImplemented("reconnect");
  }
  async getResults(): Promise<GameResults> {
    this.notImplemented("getResults");
  }
}
