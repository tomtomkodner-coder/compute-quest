import type { AnyServerEvent } from "../events";
import type {
  AnswerId,
  AnswerResult,
  ConnectionStatus,
  GameResults,
  GameState,
  JoinGameResponse,
  QuestionView,
} from "../types";

/** A single request/response (HTTP) or frame (WebSocket), used by the Network Debugger. */
export interface NetworkEntry {
  id: string;
  kind: "http" | "ws";
  direction: "out" | "in";
  url: string;
  method?: string;
  status?: number;
  ok?: boolean;
  /** Round trip for HTTP, RTT for ws ping/pong. */
  latencyMs?: number;
  startedAt: number;
  finishedAt?: number;
  requestBody?: unknown;
  responseBody?: unknown;
  error?: string;
  /** For ws frames: the event type. */
  wsType?: string;
}

export interface ConnectionChange {
  status: ConnectionStatus;
  detail?: string;
  /** True when the connection dropped without the user asking for it. */
  unexpected?: boolean;
  /** True when reconnecting cannot succeed (e.g. the game no longer exists). */
  fatal?: boolean;
}

export interface GameAPIEvents extends Record<string, unknown> {
  connection: ConnectionChange;
  event: AnyServerEvent;
  network: NetworkEntry;
}

export interface SessionInfo {
  pin: string;
  playerId: string;
  playerToken: string;
  username: string;
}

/**
 * The abstraction the whole app talks to. The UI never calls fetch/WebSocket directly,
 * so a different backend can be plugged in by providing another implementation.
 */
export interface GameAPI {
  readonly kind: "mock" | "official";
  readonly status: ConnectionStatus;
  readonly session: SessionInfo | null;
  /** serverTime - clientTime, estimated from realtime frames (ms). */
  readonly clockOffsetMs: number;

  /** Establish connectivity with the server (health check). */
  connect(): Promise<void>;
  /** Join a game as a player and subscribe to its realtime events. */
  joinGame(pin: string, username: string): Promise<JoinGameResponse>;
  getGameState(): Promise<GameState>;
  getQuestion(): Promise<QuestionView | null>;
  submitAnswer(answerId: AnswerId): Promise<AnswerResult>;
  /** Leave the game and close all connections. */
  disconnect(): Promise<void>;

  /** Re-open the realtime channel for the existing session (used by Auto Reconnect). */
  reconnect(): Promise<void>;
  getResults(): Promise<GameResults>;

  on<K extends keyof GameAPIEvents>(event: K, listener: (payload: GameAPIEvents[K]) => void): () => void;
}

export interface GameAPIConfig {
  /** Base URL of the REST API. May be relative (resolved against window.location). */
  apiUrl: string;
  /** WebSocket URL. May be relative (resolved against window.location). */
  wsUrl: string;
  fetchImpl?: typeof fetch;
  WebSocketImpl?: typeof WebSocket;
  /** Interval for ws ping/latency measurement. 0 disables. */
  pingIntervalMs?: number;
  requestTimeoutMs?: number;
}
