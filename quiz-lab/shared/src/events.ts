import type {
  AnswerId,
  GameState,
  LeaderboardEntry,
  PlayerPublic,
  QuestionView,
} from "./types";

/** Realtime events pushed by the Mock Server over WebSocket. */
export const SERVER_EVENT_TYPES = [
  "hello",
  "game_started",
  "question_started",
  "question_updated",
  "answer_submitted",
  "question_ended",
  "game_ended",
  "game_reset",
  "player_joined",
  "player_left",
  "pong",
] as const;

export type ServerEventType = (typeof SERVER_EVENT_TYPES)[number];

export interface ServerEventPayloads {
  hello: { state: GameState; role: "player" | "host" | "observer"; playerId?: string };
  game_started: { totalQuestions: number };
  question_started: { question: QuestionView };
  question_updated: {
    questionId: string;
    endsAt?: number;
    remainingMs?: number;
    correctAnswerId?: AnswerId;
    reason: "timer" | "correct_answer" | "text";
    question?: QuestionView;
  };
  answer_submitted: {
    questionId: string;
    playerId: string;
    username: string;
    answeredCount: number;
    totalPlayers: number;
    elapsedMs: number;
  };
  question_ended: {
    questionId: string;
    index: number;
    correctAnswerId: AnswerId;
    distribution: Record<string, number>;
    leaderboard: LeaderboardEntry[];
    hasNext: boolean;
  };
  game_ended: { leaderboard: LeaderboardEntry[] };
  game_reset: { state: GameState };
  player_joined: { player: PlayerPublic; rejoined: boolean; playerCount: number };
  player_left: {
    playerId: string;
    username: string;
    reason: "disconnect" | "leave" | "timeout";
    playerCount: number;
  };
  pong: { clientTs?: number };
}

export interface ServerEvent<T extends ServerEventType = ServerEventType> {
  type: T;
  pin: string;
  /** Monotonic per-game sequence number. */
  seq: number;
  /** Server epoch ms. */
  serverTime: number;
  payload: ServerEventPayloads[T];
}

export type AnyServerEvent = {
  [K in ServerEventType]: ServerEvent<K>;
}[ServerEventType];

/** Messages a client may send over the socket. */
export type ClientMessage = { type: "ping"; clientTs: number };
