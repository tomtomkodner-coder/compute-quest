import { TypedEmitter } from "../emitter";
import type { AnyServerEvent, ClientMessage } from "../events";
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
import type { ConnectionChange, GameAPI, GameAPIConfig, GameAPIEvents, SessionInfo } from "./GameAPI";
import { ApiError, HttpClient, nextId, resolveWsUrl } from "./http";

/** WebSocket close codes used by the Mock Server for unrecoverable situations. */
export const WS_CLOSE_FATAL = new Set([4001, 4004, 4009]);

/**
 * GameAPI implementation for the local Mock Server (REST + WebSocket).
 */
export class MockGameAPI extends TypedEmitter<GameAPIEvents> implements GameAPI {
  readonly kind = "mock" as const;
  private readonly http: HttpClient;
  private readonly WS: typeof WebSocket;
  private ws: WebSocket | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pendingPings = new Map<number, number>();
  private intentionalClose = false;
  private _status: ConnectionStatus = "idle";
  private _session: SessionInfo | null = null;
  private _clockOffsetMs = 0;

  constructor(private readonly config: GameAPIConfig) {
    super();
    this.http = new HttpClient(config.apiUrl, { fetchImpl: config.fetchImpl, timeoutMs: config.requestTimeoutMs });
    this.http.on("network", (entry) => this.emit("network", entry));
    const WS = config.WebSocketImpl ?? (globalThis as { WebSocket?: typeof WebSocket }).WebSocket;
    if (!WS) throw new Error("No WebSocket implementation available");
    this.WS = WS;
    assertAllowedUrl(resolveWsUrl(config.wsUrl));
  }

  get status(): ConnectionStatus {
    return this._status;
  }
  get session(): SessionInfo | null {
    return this._session;
  }
  get clockOffsetMs(): number {
    return this._clockOffsetMs;
  }

  private setStatus(change: ConnectionChange): void {
    this._status = change.status;
    this.emit("connection", change);
  }

  async connect(): Promise<void> {
    this.setStatus({ status: "connecting", detail: `GET ${this.http.base}/health` });
    try {
      const health = await this.http.request<{ ok: boolean; serverTime: number }>("GET", "/health");
      if (typeof health?.serverTime === "number") this._clockOffsetMs = health.serverTime - Date.now();
      this.setStatus({ status: "connected", detail: "server reachable" });
    } catch (err) {
      this.setStatus({ status: "error", detail: (err as Error).message });
      throw err;
    }
  }

  async joinGame(pin: string, username: string): Promise<JoinGameResponse> {
    if (this._status !== "connected") await this.connect();
    const res = await this.http.request<JoinGameResponse>("POST", "/game/join", { body: { pin, username } });
    this._session = { pin: res.pin, playerId: res.playerId, playerToken: res.playerToken, username: res.username };
    this._clockOffsetMs = res.state.serverTime - Date.now();
    await this.openSocket();
    return res;
  }

  private authHeaders(): Record<string, string> {
    if (!this._session) throw new ApiError("Not joined to a game", 0, "not_joined");
    return { "X-Player-Token": this._session.playerToken };
  }

  async getGameState(): Promise<GameState> {
    const s = this.requireSession();
    const state = await this.http.request<GameState>("GET", "/game/state", {
      query: { pin: s.pin },
      headers: this.authHeaders(),
    });
    this._clockOffsetMs = state.serverTime - Date.now();
    return state;
  }

  async getQuestion(): Promise<QuestionView | null> {
    const s = this.requireSession();
    const res = await this.http.request<{ question: QuestionView | null }>("GET", "/game/question", {
      query: { pin: s.pin },
      headers: this.authHeaders(),
    });
    return res.question;
  }

  async submitAnswer(answerId: AnswerId): Promise<AnswerResult> {
    const s = this.requireSession();
    return this.http.request<AnswerResult>("POST", "/game/answer", {
      body: { pin: s.pin, playerToken: s.playerToken, answerId, clientSentAt: Date.now() },
      headers: this.authHeaders(),
    });
  }

  async getResults(): Promise<GameResults> {
    const s = this.requireSession();
    return this.http.request<GameResults>("GET", "/game/results", { query: { pin: s.pin } });
  }

  async disconnect(): Promise<void> {
    this.intentionalClose = true;
    const s = this._session;
    this.closeSocket(1000, "client disconnect");
    if (s) {
      try {
        await this.http.request("POST", "/game/leave", {
          body: { pin: s.pin, playerToken: s.playerToken },
          headers: { "X-Player-Token": s.playerToken },
        });
      } catch {
        // Leaving is best effort (the server may be down, which is often why we disconnect).
      }
    }
    this._session = null;
    this.setStatus({ status: "disconnected", detail: "disconnected by user" });
  }

  async reconnect(): Promise<void> {
    this.requireSession();
    this.setStatus({ status: "reconnecting", detail: "re-opening realtime channel" });
    await this.openSocket();
  }

  /** Developer helper: drop the socket as if the network failed (exercises Auto Reconnect). */
  simulateDrop(): void {
    this.ws?.close(4000, "simulated network drop");
  }

  private requireSession(): SessionInfo {
    if (!this._session) throw new ApiError("Not joined to a game", 0, "not_joined");
    return this._session;
  }

  private openSocket(): Promise<void> {
    const s = this.requireSession();
    this.closeSocket(1000, "replaced");
    this.intentionalClose = false;
    const url = new URL(resolveWsUrl(this.config.wsUrl));
    url.searchParams.set("pin", s.pin);
    url.searchParams.set("playerToken", s.playerToken);
    const safeUrl = url.toString().replace(/playerToken=[^&]+/, "playerToken=***");

    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const ws = new this.WS(url.toString());
      this.ws = ws;
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        ws.close();
        this.setStatus({ status: "error", detail: "WebSocket open timeout" });
        reject(new ApiError("WebSocket open timeout", 0, "ws_timeout"));
      }, this.config.requestTimeoutMs ?? 8000);

      ws.onopen = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        this.emit("network", {
          id: nextId("w"),
          kind: "ws",
          direction: "out",
          url: safeUrl,
          wsType: "open",
          startedAt: Date.now(),
        });
        this.setStatus({ status: "connected", detail: "realtime channel open" });
        this.startPing();
        resolve();
      };

      ws.onmessage = (msg: MessageEvent) => this.handleMessage(String(msg.data), safeUrl);

      ws.onerror = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        this.setStatus({ status: "error", detail: "WebSocket error" });
        reject(new ApiError("WebSocket connection failed", 0, "ws_error"));
      };

      ws.onclose = (ev: CloseEvent) => {
        clearTimeout(timeout);
        if (this.ws !== ws) return; // replaced by a newer socket
        this.stopPing();
        this.ws = null;
        this.emit("network", {
          id: nextId("w"),
          kind: "ws",
          direction: "in",
          url: safeUrl,
          wsType: `close ${ev.code}${ev.reason ? ` (${ev.reason})` : ""}`,
          startedAt: Date.now(),
        });
        if (!settled) {
          settled = true;
          reject(new ApiError(`WebSocket closed (${ev.code})`, 0, "ws_closed"));
        }
        if (this.intentionalClose) return;
        const fatal = WS_CLOSE_FATAL.has(ev.code);
        this.setStatus({
          status: "disconnected",
          detail: `socket closed: ${ev.code}${ev.reason ? ` ${ev.reason}` : ""}`,
          unexpected: true,
          fatal,
        });
      };
    });
  }

  private handleMessage(raw: string, url: string): void {
    let event: AnyServerEvent;
    try {
      event = JSON.parse(raw) as AnyServerEvent;
    } catch {
      return;
    }
    if (typeof event.serverTime === "number") {
      // Smooth the offset estimate a little to avoid jitter.
      const sample = event.serverTime - Date.now();
      this._clockOffsetMs = this._clockOffsetMs === 0 ? sample : this._clockOffsetMs * 0.7 + sample * 0.3;
    }
    let latencyMs: number | undefined;
    if (event.type === "pong") {
      const clientTs = event.payload.clientTs;
      if (clientTs !== undefined && this.pendingPings.has(clientTs)) {
        latencyMs = Date.now() - clientTs;
        this.pendingPings.delete(clientTs);
      }
    }
    this.emit("network", {
      id: nextId("w"),
      kind: "ws",
      direction: "in",
      url,
      wsType: event.type,
      responseBody: event,
      latencyMs,
      startedAt: Date.now(),
    });
    this.emit("event", event);
  }

  private send(msg: ClientMessage): void {
    if (this.ws?.readyState !== 1) return;
    this.ws.send(JSON.stringify(msg));
  }

  private startPing(): void {
    this.stopPing();
    const interval = this.config.pingIntervalMs ?? 10_000;
    if (interval <= 0) return;
    const ping = () => {
      const clientTs = Date.now();
      this.pendingPings.set(clientTs, clientTs);
      if (this.pendingPings.size > 20) this.pendingPings.delete(this.pendingPings.keys().next().value!);
      this.send({ type: "ping", clientTs });
    };
    ping();
    this.pingTimer = setInterval(ping, interval);
  }

  private stopPing(): void {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  private closeSocket(code: number, reason: string): void {
    this.stopPing();
    const ws = this.ws;
    this.ws = null;
    if (ws && ws.readyState <= 1) {
      try {
        ws.close(code, reason);
      } catch {
        /* ignore */
      }
    }
  }
}
