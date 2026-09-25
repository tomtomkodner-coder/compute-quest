import type { GameAPI, GameAPIConfig } from "./GameAPI";
import { MockGameAPI } from "./MockGameAPI";
import { OfficialGameAPI } from "./OfficialGameAPI";

export type GameAPIKind = "mock" | "official";

/** Create a GameAPI implementation by name — the only place the UI decides which backend to use. */
export function createGameAPI(kind: GameAPIKind, config: GameAPIConfig & { apiKey?: string }): GameAPI {
  switch (kind) {
    case "official":
      return new OfficialGameAPI({ apiUrl: config.apiUrl, wsUrl: config.wsUrl, apiKey: config.apiKey });
    case "mock":
    default:
      return new MockGameAPI(config);
  }
}
