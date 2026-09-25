import { describe, expect, it } from "vitest";
import { BlockedHostError, createGameAPI, isBlockedHost, MockGameAPI, NotImplementedError, OfficialGameAPI } from "../src";

describe("host guard", () => {
  it("blocks Kahoot-owned hosts", () => {
    expect(isBlockedHost("https://kahoot.it/rest/challenges")).toBe(true);
    expect(isBlockedHost("wss://play.kahoot.it/cometd")).toBe(true);
    expect(isBlockedHost("https://create.kahoot.com")).toBe(true);
    expect(isBlockedHost("http://localhost:4000")).toBe(false);
    expect(isBlockedHost("https://notkahoot.it.example.com")).toBe(false);
  });

  it("MockGameAPI and OfficialGameAPI refuse blocked hosts", () => {
    expect(() => new MockGameAPI({ apiUrl: "https://kahoot.it", wsUrl: "ws://localhost/ws" })).toThrow(BlockedHostError);
    expect(() => new MockGameAPI({ apiUrl: "http://localhost:4000", wsUrl: "wss://kahoot.it/cometd" })).toThrow(BlockedHostError);
    expect(() => new OfficialGameAPI({ apiUrl: "https://play.kahoot.it" })).toThrow(BlockedHostError);
  });
});

describe("OfficialGameAPI placeholder", () => {
  it("implements the GameAPI surface but throws NotImplementedError", async () => {
    const api = createGameAPI("official", { apiUrl: "https://quiz.example.com", wsUrl: "wss://quiz.example.com/ws" });
    expect(api.kind).toBe("official");
    await expect(api.connect()).rejects.toBeInstanceOf(NotImplementedError);
    await expect(api.joinGame("1", "x")).rejects.toBeInstanceOf(NotImplementedError);
    await expect(api.submitAnswer("A")).rejects.toBeInstanceOf(NotImplementedError);
    await expect(api.disconnect()).resolves.toBeUndefined();
  });
});
