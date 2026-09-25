import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MockGameAPI, MockHostAPI, type AnyServerEvent } from "@quizlab/shared";
import { startTestServer, waitFor } from "./helpers";

let ctx: Awaited<ReturnType<typeof startTestServer>>;

beforeAll(async () => {
  ctx = await startTestServer();
});
afterAll(async () => {
  await ctx.quiz.close();
});

const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(ctx.url + path, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });

describe("REST API", () => {
  it("GET /health", async () => {
    const res = await fetch(`${ctx.url}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
  });

  it("routes are also mounted under /api", async () => {
    const res = await fetch(`${ctx.url}/api/game/state?pin=123456`);
    expect(res.status).toBe(200);
    expect((await res.json()).pin).toBe("123456");
  });

  it("create → join → state → question → answer → results", async () => {
    const created = await (await post("/game/create", { questionCount: 2, timeLimitMs: 5000, autoAdvance: false })).json();
    expect(created).toMatchObject({ totalQuestions: 2, debug: true });
    const joined = await (await post("/game/join", { pin: created.pin, username: "alice" })).json();
    expect(joined.playerToken).toBeTruthy();

    const start = await post("/dev/start", { pin: created.pin }, { "X-Host-Token": created.hostToken });
    expect(start.status).toBe(200);

    const { question } = await (await fetch(`${ctx.url}/game/question?pin=${created.pin}`)).json();
    expect(question.index).toBe(0);
    expect(question.correctAnswerId).toBeTruthy();

    const ans = await post("/game/answer", { pin: created.pin, answerId: question.correctAnswerId }, { "X-Player-Token": joined.playerToken });
    const result = await ans.json();
    expect(result).toMatchObject({ accepted: true, correct: true });
    expect(result.points).toBeGreaterThan(900);

    const results = await (await fetch(`${ctx.url}/game/results?pin=${created.pin}`)).json();
    expect(results.leaderboard[0]).toMatchObject({ username: "alice", rank: 1 });
  });

  it("returns structured errors", async () => {
    const r1 = await post("/game/join", { pin: "000000", username: "x" });
    expect(r1.status).toBe(404);
    expect(await r1.json()).toMatchObject({ code: "game_not_found" });

    const r2 = await post("/dev/start", { pin: "123456" }, { "X-Host-Token": "wrong" });
    expect(r2.status).toBe(403);

    const r3 = await post("/game/answer", { pin: "123456", answerId: "A" }, { "X-Player-Token": "bogus" });
    expect(r3.status).toBe(401);

    const r4 = await fetch(`${ctx.url}/game/join`, { method: "POST", headers: { "content-type": "application/json" }, body: "{bad" });
    expect(r4.status).toBe(400);
  });
});

describe("MockGameAPI + WebSocket events", () => {
  it("receives the full event flow and submits answers", async () => {
    const host = new MockHostAPI(ctx.url);
    await host.createGame({ questionCount: 2, timeLimitMs: 3000, autoAdvance: false });

    const api = new MockGameAPI({ apiUrl: ctx.url, wsUrl: ctx.wsUrl, pingIntervalMs: 0 });
    const other = new MockGameAPI({ apiUrl: ctx.url, wsUrl: ctx.wsUrl, pingIntervalMs: 0 });
    const events: AnyServerEvent[] = [];
    api.on("event", (e) => events.push(e));
    const statuses: string[] = [];
    api.on("connection", (c) => statuses.push(c.status));

    await api.connect();
    const joined = await api.joinGame(host.pin, "p1");
    expect(joined.username).toBe("p1");
    await waitFor(() => events.some((e) => e.type === "hello"));
    await other.joinGame(host.pin, "p2");
    await waitFor(() => events.some((e) => e.type === "player_joined" && e.payload.player.username === "p2"));

    await host.start();
    await waitFor(() => events.some((e) => e.type === "question_started"));
    const q = await api.getQuestion();
    expect(q?.correctAnswerId).toBeTruthy();

    await host.setTimer(2000);
    await waitFor(() => events.some((e) => e.type === "question_updated"));

    const result = await api.submitAnswer(q!.correctAnswerId!);
    expect(result.correct).toBe(true);
    await waitFor(() => events.some((e) => e.type === "answer_submitted"));

    await other.submitAnswer("A").catch(() => undefined);
    await waitFor(() => events.some((e) => e.type === "question_ended"));

    await other.disconnect();
    await waitFor(() => events.some((e) => e.type === "player_left"));

    await host.endGame();
    await waitFor(() => events.some((e) => e.type === "game_ended"));

    const types = new Set(events.map((e) => e.type));
    for (const t of ["hello", "game_started", "question_started", "question_updated", "answer_submitted", "question_ended", "player_joined", "player_left", "game_ended"]) {
      expect(types.has(t as AnyServerEvent["type"])).toBe(true);
    }
    expect(statuses).toContain("connected");
    await api.disconnect();
  });

  it("reports an unexpected drop and can reconnect with the same session", async () => {
    const api = new MockGameAPI({ apiUrl: ctx.url, wsUrl: ctx.wsUrl, pingIntervalMs: 0 });
    const changes: Array<{ status: string; unexpected?: boolean }> = [];
    api.on("connection", (c) => changes.push(c));
    const hellos: AnyServerEvent[] = [];
    api.on("event", (e) => e.type === "hello" && hellos.push(e));
    await api.joinGame("123456", `drop-${Date.now()}`);
    await waitFor(() => hellos.length === 1);
    api.simulateDrop();
    await waitFor(() => changes.some((c) => c.status === "disconnected" && c.unexpected));
    await api.reconnect();
    await waitFor(() => hellos.length === 2);
    expect(api.status).toBe("connected");
    await api.disconnect();
  });

  it("flags invalid tokens as fatal", async () => {
    const api = new MockGameAPI({ apiUrl: ctx.url, wsUrl: ctx.wsUrl, pingIntervalMs: 0 });
    const changes: Array<{ status: string; fatal?: boolean }> = [];
    api.on("connection", (c) => changes.push(c));
    await api.joinGame("123456", `fatal-${Date.now()}`);
    // Remove the player on the server, then force a reconnect with the stale token.
    const game = ctx.quiz.store.get("123456")!;
    game.leave(api.session!.playerToken);
    await api.reconnect().catch(() => undefined);
    await waitFor(() => changes.some((c) => c.fatal === true));
  });
});
