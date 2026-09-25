/**
 * Domain types shared by the Mock Server, the GameAPI layer, the plugins and the UI.
 */

export type AnswerId = "A" | "B" | "C" | "D" | (string & {});

export interface AnswerOption {
  id: AnswerId;
  text: string;
}

/** Question as defined on the server (includes the solution). */
export interface QuestionDefinition {
  id: string;
  text: string;
  answers: AnswerOption[];
  correctAnswerId: AnswerId;
  /** Per-question time limit. Falls back to the game default. */
  timeLimitMs?: number;
}

/** Question as sent to players. `correctAnswerId` is only present when the game runs in debug mode. */
export interface QuestionView {
  id: string;
  /** 0-based index inside the game. */
  index: number;
  total: number;
  text: string;
  answers: AnswerOption[];
  timeLimitMs: number;
  /** Server epoch ms when the question started. */
  startedAt: number;
  /** Server epoch ms when the question closes. */
  endsAt: number;
  /** Only present in Test/Debug mode (the demo server returns it on purpose). */
  correctAnswerId?: AnswerId;
}

export type GamePhase = "lobby" | "question" | "reveal" | "ended";

export interface PlayerPublic {
  id: string;
  username: string;
  score: number;
  connected: boolean;
  answeredCurrent: boolean;
  correctCount: number;
  streak: number;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  username: string;
  score: number;
  correctCount: number;
}

export interface GameState {
  pin: string;
  phase: GamePhase;
  /** 0-based; -1 while in the lobby. */
  questionIndex: number;
  totalQuestions: number;
  players: PlayerPublic[];
  question: QuestionView | null;
  /** Remaining ms of the current question (server computed). */
  remainingMs: number;
  answeredCount: number;
  debug: boolean;
  autoAdvance: boolean;
  serverTime: number;
  createdAt: number;
}

export interface CreateGameRequest {
  /** Custom questions. When omitted the built-in bank is used. */
  questions?: QuestionDefinition[];
  /** Number of questions picked from the built-in bank (default: all). */
  questionCount?: number;
  timeLimitMs?: number;
  /** Test/Debug mode: the server returns the correct answer to players. Default true. */
  debug?: boolean;
  /** Automatically advance through questions. Default true. */
  autoAdvance?: boolean;
  /** Restart automatically after the game ends. Default false. */
  loop?: boolean;
  /** Auto-start N ms after the first player joins (0 = manual start). */
  autoStartMs?: number;
  shuffle?: boolean;
}

export interface CreateGameResponse {
  pin: string;
  hostToken: string;
  totalQuestions: number;
  debug: boolean;
}

export interface JoinGameRequest {
  pin: string;
  username: string;
}

export interface JoinGameResponse {
  pin: string;
  playerId: string;
  playerToken: string;
  username: string;
  state: GameState;
}

export interface SubmitAnswerRequest {
  pin: string;
  playerToken: string;
  answerId: AnswerId;
  questionId?: string;
  /** Client epoch ms when the answer was sent (diagnostics only). */
  clientSentAt?: number;
}

export interface AnswerResult {
  accepted: boolean;
  questionId: string;
  answerId: AnswerId;
  correct: boolean;
  points: number;
  totalScore: number;
  /** ms between question start and server receiving the answer. */
  elapsedMs: number;
  receivedAt: number;
  clientSentAt?: number;
  correctAnswerId?: AnswerId;
  rank?: number;
}

/** Full answer key of a game (host only — Developer Mode / solo games). */
export interface AnswerKey {
  pin: string;
  currentIndex: number;
  questions: Array<{
    index: number;
    id: string;
    text: string;
    answers: AnswerOption[];
    correctAnswerId: AnswerId;
  }>;
}

export interface GameResults {
  pin: string;
  phase: GamePhase;
  totalQuestions: number;
  leaderboard: LeaderboardEntry[];
  questions: Array<{
    id: string;
    index: number;
    text: string;
    correctAnswerId: AnswerId;
    distribution: Record<string, number>;
    answeredCount: number;
    correctCount: number;
  }>;
}

export interface ApiErrorBody {
  error: string;
  code: string;
  details?: unknown;
}

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";
