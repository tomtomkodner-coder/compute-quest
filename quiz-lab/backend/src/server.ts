import { existsSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { resolve } from "node:path";
import express from "express";
import type { ServerConfig } from "./config";
import { GameStore } from "./game/GameStore";
import { cors, errorHandler, rateLimit, requestLogger } from "./http/middleware";
import { createRouter } from "./http/routes";
import { WsHub } from "./ws/hub";

export interface QuizServer {
  app: express.Express;
  server: Server;
  store: GameStore;
  hub: WsHub;
  listen(port?: number, host?: string): Promise<{ port: number; url: string }>;
  close(): Promise<void>;
}

export function createQuizServer(config: ServerConfig): QuizServer {
  const store = new GameStore({
    maxGames: config.maxGames,
    defaultTimeLimitMs: config.defaultTimeLimitMs,
    revealMs: config.revealMs,
    maxPlayers: config.maxPlayersPerGame,
    disconnectGraceMs: config.disconnectGraceMs,
  });

  if (config.demoGame) {
    store.create({
      pin: config.demoPin,
      hostToken: config.demoHostToken,
      debug: true,
      autoAdvance: true,
      loop: config.demoLoop,
      autoStartMs: config.demoAutoStartMs,
    });
  }

  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", "loopback");
  app.use(requestLogger(config.logRequests));
  app.use(cors(config.corsOrigins));
  app.use(express.json({ limit: "100kb" }));
  app.use(rateLimit(config.rateLimitPerMin));

  const router = createRouter(store);
  app.use("/api", router);
  app.use("/", router);

  // Production: serve the built frontend if it exists (npm run build && npm start).
  if (existsSync(config.staticDir)) {
    app.use(express.static(config.staticDir));
    app.get(/^\/(?!api\/|ws).*/, (_req, res) => res.sendFile(resolve(config.staticDir, "index.html")));
  }

  app.use((_req, res) => res.status(404).json({ error: "Not found", code: "not_found" }));
  app.use(errorHandler);

  const server = createServer(app);
  const hub = new WsHub(server, store);

  return {
    app,
    server,
    store,
    hub,
    listen(port = config.port, host = config.host) {
      return new Promise((resolveListen, reject) => {
        server.once("error", reject);
        server.listen(port, host, () => {
          const addr = server.address();
          const actual = typeof addr === "object" && addr ? addr.port : port;
          resolveListen({ port: actual, url: `http://localhost:${actual}` });
        });
      });
    },
    close() {
      hub.close();
      store.dispose();
      return new Promise((r) => {
        server.closeAllConnections?.();
        server.close(() => r());
      });
    },
  };
}
