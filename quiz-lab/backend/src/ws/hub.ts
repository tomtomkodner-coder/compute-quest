import type { IncomingMessage, Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import type { AnyServerEvent, ClientMessage } from "@quizlab/shared";
import type { Game } from "../game/Game";
import type { GameStore } from "../game/GameStore";

interface Client {
  ws: WebSocket;
  pin: string;
  role: "player" | "host" | "observer";
  playerId?: string;
  alive: boolean;
}

const WS_PATHS = new Set(["/ws", "/api/ws"]);

/**
 * WebSocket hub: one room per game PIN. Every game event is fanned out to the room.
 * Close codes: 4001 invalid token · 4004 game not found · 4009 replaced by a newer connection.
 */
export class WsHub {
  private wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });
  private rooms = new Map<string, Set<Client>>();
  private playerSockets = new Map<string, Client>();
  private heartbeat: ReturnType<typeof setInterval>;
  private unsubs: Array<() => void> = [];

  constructor(
    server: Server,
    private readonly store: GameStore,
    heartbeatMs = 15_000,
  ) {
    for (const g of store.list()) this.attach(g);
    this.unsubs.push(store.onCreate((g) => this.attach(g)));

    server.on("upgrade", (req, socket, head) => {
      const url = new URL(req.url ?? "/", "http://localhost");
      if (!WS_PATHS.has(url.pathname)) {
        socket.destroy();
        return;
      }
      this.wss.handleUpgrade(req, socket, head, (ws) => this.onConnection(ws, req, url));
    });

    this.heartbeat = setInterval(() => {
      for (const room of this.rooms.values()) {
        for (const c of room) {
          if (!c.alive) {
            c.ws.terminate();
            continue;
          }
          c.alive = false;
          try {
            c.ws.ping();
          } catch {
            /* ignore */
          }
        }
      }
    }, heartbeatMs);
    this.heartbeat.unref?.();
  }

  private attach(game: Game): void {
    const off = game.on("event", (event) => this.broadcast(game.pin, event));
    this.unsubs.push(off);
  }

  private onConnection(ws: WebSocket, _req: IncomingMessage, url: URL): void {
    const pin = url.searchParams.get("pin") ?? "";
    const game = this.store.get(pin);
    if (!game) {
      ws.close(4004, "game not found");
      return;
    }
    const playerToken = url.searchParams.get("playerToken");
    const hostToken = url.searchParams.get("hostToken");
    let client: Client;
    if (playerToken) {
      const player = game.playerByToken(playerToken);
      if (!player) {
        ws.close(4001, "invalid player token");
        return;
      }
      const previous = this.playerSockets.get(player.id);
      if (previous && previous.ws !== ws) {
        this.detach(previous, false);
        previous.ws.close(4009, "replaced by a newer connection");
      }
      client = { ws, pin, role: "player", playerId: player.id, alive: true };
      this.playerSockets.set(player.id, client);
    } else if (hostToken) {
      if (hostToken !== game.hostToken) {
        ws.close(4001, "invalid host token");
        return;
      }
      client = { ws, pin, role: "host", alive: true };
    } else {
      client = { ws, pin, role: "observer", alive: true };
    }

    let room = this.rooms.get(pin);
    if (!room) {
      room = new Set();
      this.rooms.set(pin, room);
    }
    room.add(client);

    ws.on("pong", () => (client.alive = true));
    ws.on("message", (data) => {
      client.alive = true;
      let msg: ClientMessage;
      try {
        msg = JSON.parse(String(data));
      } catch {
        return;
      }
      if (msg?.type === "ping") {
        const g = this.store.get(pin);
        if (g) this.send(client, g.makeEvent("pong", { clientTs: Number(msg.clientTs) || undefined }));
      }
    });
    ws.on("close", () => this.detach(client, true));
    ws.on("error", () => this.detach(client, true));

    if (client.playerId) game.setConnected(client.playerId, true);
    this.send(client, game.makeEvent("hello", { state: game.getState(), role: client.role, playerId: client.playerId }));
  }

  private detach(client: Client, markDisconnected: boolean): void {
    const room = this.rooms.get(client.pin);
    if (!room?.delete(client)) return;
    if (room.size === 0) this.rooms.delete(client.pin);
    if (client.playerId && this.playerSockets.get(client.playerId) === client) {
      this.playerSockets.delete(client.playerId);
      if (markDisconnected) this.store.get(client.pin)?.setConnected(client.playerId, false);
    }
  }

  private send(client: Client, event: AnyServerEvent): void {
    if (client.ws.readyState === client.ws.OPEN) client.ws.send(JSON.stringify(event));
  }

  broadcast(pin: string, event: AnyServerEvent): void {
    const room = this.rooms.get(pin);
    if (!room) return;
    const data = JSON.stringify(event);
    for (const c of room) if (c.ws.readyState === c.ws.OPEN) c.ws.send(data);
  }

  roomSize(pin: string): number {
    return this.rooms.get(pin)?.size ?? 0;
  }

  close(): void {
    clearInterval(this.heartbeat);
    for (const off of this.unsubs) off();
    for (const room of this.rooms.values()) for (const c of room) c.ws.terminate();
    this.rooms.clear();
    this.wss.close();
  }
}
