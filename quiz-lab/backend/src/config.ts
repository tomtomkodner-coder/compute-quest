import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = resolve(here, "../..");

/** Load quiz-lab/.env (if present) without extra dependencies (Node ≥ 21.7). */
export function loadEnv(): void {
  for (const file of [resolve(PROJECT_ROOT, ".env"), resolve(here, "../.env")]) {
    if (existsSync(file)) {
      try {
        process.loadEnvFile(file);
      } catch {
        /* ignore malformed env files */
      }
    }
  }
}

const num = (v: string | undefined, d: number) => {
  const n = Number(v);
  return v !== undefined && v !== "" && Number.isFinite(n) ? n : d;
};
const bool = (v: string | undefined, d: boolean) => (v === undefined || v === "" ? d : /^(1|true|yes|on)$/i.test(v));

export interface ServerConfig {
  port: number;
  host: string;
  corsOrigins: string[];
  demoGame: boolean;
  demoPin: string;
  demoHostToken: string;
  demoLoop: boolean;
  demoAutoStartMs: number;
  defaultTimeLimitMs: number;
  revealMs: number;
  maxPlayersPerGame: number;
  maxGames: number;
  rateLimitPerMin: number;
  disconnectGraceMs: number;
  /** Directory with the built frontend (served in production mode, if present). */
  staticDir: string;
  logRequests: boolean;
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  return {
    port: num(env.PORT, 4000),
    host: env.HOST || "0.0.0.0",
    corsOrigins: (env.CORS_ORIGINS ?? "http://localhost:5173,http://127.0.0.1:5173")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    demoGame: bool(env.DEMO_GAME, true),
    demoPin: env.DEMO_PIN || "123456",
    demoHostToken: env.DEMO_HOST_TOKEN || "dev-host-token",
    demoLoop: bool(env.DEMO_LOOP, true),
    demoAutoStartMs: num(env.DEMO_AUTOSTART_MS, 3000),
    defaultTimeLimitMs: num(env.DEFAULT_TIME_LIMIT_MS, 20_000),
    revealMs: num(env.REVEAL_MS, 4_000),
    maxPlayersPerGame: num(env.MAX_PLAYERS_PER_GAME, 50),
    maxGames: num(env.MAX_GAMES, 100),
    rateLimitPerMin: num(env.RATE_LIMIT_PER_MIN, 1200),
    disconnectGraceMs: num(env.PLAYER_DISCONNECT_GRACE_MS, 30_000),
    staticDir: resolve(PROJECT_ROOT, "frontend/dist"),
    logRequests: bool(env.LOG_REQUESTS, env.NODE_ENV !== "test"),
  };
}
