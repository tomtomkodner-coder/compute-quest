import { TypedEmitter } from "../emitter";
import type {
  AnswerId,
  CreateGameRequest,
  CreateGameResponse,
  GameResults,
  GameState,
  QuestionDefinition,
} from "../types";
import type { NetworkEntry } from "./GameAPI";
import { HttpClient } from "./http";

export interface GameSummary {
  pin: string;
  phase: GameState["phase"];
  players: number;
  questionIndex: number;
  totalQuestions: number;
  debug: boolean;
  createdAt: number;
}

/**
 * Host / Developer-Mode controls for the Mock Server.
 * All mutating calls require the host token returned by `createGame`.
 */
export class MockHostAPI extends TypedEmitter<{ network: NetworkEntry }> {
  private readonly http: HttpClient;

  constructor(
    apiUrl: string,
    public hostToken = "",
    public pin = "",
    fetchImpl?: typeof fetch,
  ) {
    super();
    this.http = new HttpClient(apiUrl, { fetchImpl });
    this.http.on("network", (e) => this.emit("network", e));
  }

  private headers() {
    return { "X-Host-Token": this.hostToken };
  }

  private host<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
    return this.http.request<T>("POST", path, { body: { pin: this.pin, ...body }, headers: this.headers() });
  }

  async createGame(req: CreateGameRequest = {}): Promise<CreateGameResponse> {
    const res = await this.http.request<CreateGameResponse>("POST", "/game/create", { body: req });
    this.hostToken = res.hostToken;
    this.pin = res.pin;
    return res;
  }

  listGames(): Promise<{ games: GameSummary[] }> {
    return this.http.request("GET", "/games");
  }

  state(): Promise<GameState> {
    return this.http.request("GET", "/game/state", { query: { pin: this.pin }, headers: this.headers() });
  }

  results(): Promise<GameResults> {
    return this.http.request("GET", "/game/results", { query: { pin: this.pin } });
  }

  start(): Promise<GameState> {
    return this.host("/dev/start");
  }
  /** Manually trigger the next question (or a specific index). */
  nextQuestion(index?: number): Promise<GameState> {
    return this.host("/dev/next", index === undefined ? {} : { index });
  }
  endQuestion(): Promise<GameState> {
    return this.host("/dev/end-question");
  }
  /** Change the remaining time of the running question. */
  setTimer(remainingMs: number): Promise<GameState> {
    return this.host("/dev/timer", { remainingMs });
  }
  /** Change the default time limit for upcoming questions. */
  setDefaultTimeLimit(timeLimitMs: number): Promise<GameState> {
    return this.host("/dev/time-limit", { timeLimitMs });
  }
  setCorrectAnswer(answerId: AnswerId): Promise<GameState> {
    return this.host("/dev/correct", { answerId });
  }
  /** Push a custom question. `startNow` starts it immediately, otherwise it is queued next. */
  sendQuestion(question: Omit<QuestionDefinition, "id"> & { id?: string }, startNow = true): Promise<GameState> {
    return this.host("/dev/question", { question, startNow });
  }
  setAutoAdvance(autoAdvance: boolean): Promise<GameState> {
    return this.host("/dev/auto-advance", { autoAdvance });
  }
  endGame(): Promise<GameState> {
    return this.host("/dev/end-game");
  }
  reset(): Promise<GameState> {
    return this.host("/dev/reset");
  }
}
