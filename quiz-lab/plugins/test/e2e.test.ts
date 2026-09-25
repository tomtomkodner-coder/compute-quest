import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createGameAPI, MockHostAPI } from "@quizlab/shared";
import { startTestServer, waitFor } from "../../backend/test/helpers";
import { BUILTIN_PLUGINS, DEFAULT_SETTINGS, LabSession, mergeSettings } from "../src";

let ctx: Awaited<ReturnType<typeof startTestServer>>;
beforeAll(async () => {
  ctx = await startTestServer();
});
afterAll(async () => {
  await ctx.quiz.close();
});

function makeSession(patch = {}) {
  const settings = mergeSettings(DEFAULT_SETTINGS, { apiUrl: ctx.url, wsUrl: ctx.wsUrl, ...patch });
  const session = new LabSession({
    settings,
    plugins: BUILTIN_PLUGINS,
    createApi: (kind, s) => createGameAPI(kind, { apiUrl: s.apiUrl, wsUrl: s.wsUrl, pingIntervalMs: 0 }),
  });
  session.start();
  return session;
}

describe("end-to-end: LabSession ↔ MockGameAPI ↔ Mock Server", () => {
  it("auto-answers every question correctly and tops the leaderboard", async () => {
    const host = new MockHostAPI(ctx.url);
    await host.createGame({ questionCount: 3, timeLimitMs: 4000, autoAdvance: true });
    const session = makeSession({ delay: { mode: "fixed", fixedMs: 50 } });
    await session.connectAndJoin(host.pin, "bot-e2e");
    await host.start();
    await waitFor(() => session.getState().game?.phase === "ended", 8000);
    const answers = session.getState().answers;
    expect(answers).toHaveLength(3);
    expect(answers.every((a) => a.correct)).toBe(true);
    expect(answers.every((a) => (a.serverElapsedMs ?? 0) >= 50)).toBe(true);
    expect(session.getState().leaderboard[0]?.username).toBe("bot-e2e");
    // Network debugger recorded the HTTP traffic + ws frames.
    const net = session.getState().network;
    expect(net.some((n) => n.kind === "http" && n.url.includes("/game/answer"))).toBe(true);
    expect(net.some((n) => n.kind === "ws")).toBe(true);
    await session.disconnect();
    session.dispose();
  });

  it("recovers from a dropped socket via Auto Reconnect", async () => {
    const session = makeSession();
    await session.connectAndJoin("123456", `rc-${Date.now()}`);
    await waitFor(() => session.getState().events.some((e) => e.event.type === "hello"));
    session.simulateDrop();
    await waitFor(() => session.getState().reconnect.attempt === 1);
    await waitFor(() => session.getState().reconnect.attempt === 0 && session.getState().connection === "connected", 5000);
    expect(session.getState().events.filter((e) => e.event.type === "hello").length).toBe(2);
    await session.disconnect();
    session.dispose();
  });
});
