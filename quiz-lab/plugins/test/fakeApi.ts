import {
  ApiError,
  TypedEmitter,
  type AnswerId,
  type AnswerResult,
  type AnyServerEvent,
  type ConnectionStatus,
  type GameAPI,
  type GameAPIEvents,
  type GameResults,
  type GameState,
  type JoinGameResponse,
  type QuestionView,
  type SessionInfo,
} from "@quizlab/shared";

export function makeQuestion(overrides: Partial<QuestionView> = {}): QuestionView {
  const now = Date.now();
  return {
    id: "q1",
    index: 0,
    total: 3,
    text: "Test?",
    answers: [
      { id: "A", text: "a" },
      { id: "B", text: "b" },
      { id: "C", text: "c" },
      { id: "D", text: "d" },
    ],
    timeLimitMs: 20_000,
    startedAt: now,
    endsAt: now + 20_000,
    correctAnswerId: "C",
    ...overrides,
  };
}

export function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    pin: "123456",
    phase: "lobby",
    questionIndex: -1,
    totalQuestions: 3,
    players: [],
    question: null,
    remainingMs: 0,
    answeredCount: 0,
    debug: true,
    autoAdvance: true,
    serverTime: Date.now(),
    createdAt: Date.now(),
    ...overrides,
  };
}

/** In-memory GameAPI used to test the LabSession + plugins without a server. */
export class FakeGameAPI extends TypedEmitter<GameAPIEvents> implements GameAPI {
  readonly kind = "mock" as const;
  status: ConnectionStatus = "idle";
  session: SessionInfo | null = null;
  clockOffsetMs = 0;
  submitted: AnswerId[] = [];
  reconnectCalls = 0;
  joinCalls = 0;
  failReconnect = false;
  answerError: ApiError | null = null;
  private seq = 0;

  async connect() {
    this.setStatus("connected");
  }
  async joinGame(pin: string, username: string): Promise<JoinGameResponse> {
    this.joinCalls++;
    this.session = { pin, username, playerId: `p${this.joinCalls}`, playerToken: `t${this.joinCalls}` };
    this.setStatus("connected");
    return { pin, username, playerId: this.session.playerId, playerToken: this.session.playerToken, state: makeState({ pin }) };
  }
  async getGameState() {
    return makeState();
  }
  async getQuestion() {
    return null;
  }
  async submitAnswer(answerId: AnswerId): Promise<AnswerResult> {
    if (this.answerError) throw this.answerError;
    this.submitted.push(answerId);
    return { accepted: true, questionId: "q1", answerId, correct: answerId === "C", points: answerId === "C" ? 950 : 0, totalScore: 950, elapsedMs: 100, receivedAt: Date.now() };
  }
  async disconnect() {
    this.session = null;
    this.setStatus("disconnected");
  }
  async reconnect() {
    this.reconnectCalls++;
    if (this.failReconnect) {
      this.emit("connection", { status: "disconnected", unexpected: true, detail: "still down" });
      throw new Error("still down");
    }
    this.setStatus("connected");
    this.push("hello", { state: makeState(), role: "player" });
  }
  async getResults(): Promise<GameResults> {
    return { pin: "123456", phase: "lobby", totalQuestions: 0, leaderboard: [], questions: [] };
  }

  setStatus(status: ConnectionStatus, extra: Partial<GameAPIEvents["connection"]> = {}) {
    this.status = status;
    this.emit("connection", { status, ...extra });
  }

  push<T extends AnyServerEvent["type"]>(type: T, payload: Extract<AnyServerEvent, { type: T }>["payload"]) {
    this.emit("event", { type, payload, pin: "123456", seq: ++this.seq, serverTime: Date.now() } as AnyServerEvent);
  }

  drop(fatal = false) {
    this.setStatus("disconnected", { unexpected: true, fatal });
  }
}
