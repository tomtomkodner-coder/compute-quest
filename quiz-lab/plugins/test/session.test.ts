import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@quizlab/shared";
import {
  BUILTIN_PLUGINS,
  DEFAULT_SETTINGS,
  LabSession,
  mergeSettings,
  PluginManager,
  sanitizeSettings,
  type LabPlugin,
  type SettingsPatch,
} from "../src";
import { FakeGameAPI, makeQuestion } from "./fakeApi";

function setup(patch: SettingsPatch = {}, rngValues: number[] = [0.1]) {
  const api = new FakeGameAPI();
  let i = 0;
  const session = new LabSession({
    settings: mergeSettings({ ...DEFAULT_SETTINGS, plugins: { ...DEFAULT_SETTINGS.plugins, "auto-join": false } }, patch),
    plugins: BUILTIN_PLUGINS,
    createApi: () => api,
    rng: () => rngValues[i++ % rngValues.length]!,
  });
  session.start();
  return { api, session };
}

describe("LabSession answer pipeline", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("auto-answers the correct answer after the configured delay", async () => {
    const { api, session } = setup({ delay: { mode: "fixed", fixedMs: 250 } });
    await session.connectAndJoin("123456", "tester");
    api.push("question_started", { question: makeQuestion() });
    expect(session.getState().answer).toMatchObject({ status: "scheduled", answerId: "C", plannedDelayMs: 250 });
    await vi.advanceTimersByTimeAsync(249);
    expect(api.submitted).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(api.submitted).toEqual(["C"]);
    expect(session.getState().answer.status).toBe("sent");
    expect(session.getState().answers[0]).toMatchObject({ answerId: "C", mode: "auto", plannedDelayMs: 250, correct: true });
  });

  it("answers instantly when Answer Delay is disabled", async () => {
    const { api, session } = setup({ plugins: { "answer-delay": false }, delay: { fixedMs: 2000 } });
    await session.connectAndJoin();
    api.push("question_started", { question: makeQuestion() });
    await vi.advanceTimersByTimeAsync(0);
    expect(api.submitted).toEqual(["C"]);
  });

  it("strategy=random uses the Random Answer plugin", async () => {
    const { api, session } = setup({ autoAnswer: { strategy: "random" }, plugins: { "answer-delay": false } }, [0.3]);
    await session.connectAndJoin();
    api.push("question_started", { question: makeQuestion() });
    await vi.advanceTimersByTimeAsync(0);
    expect(api.submitted).toEqual(["B"]); // floor(0.3 * 4) = 1 → B
  });

  it("probability miss picks a wrong answer", async () => {
    const { api, session } = setup({ autoAnswer: { strategy: "probability", probability: 0.5 }, plugins: { "answer-delay": false } }, [0.9, 0]);
    await session.connectAndJoin();
    api.push("question_started", { question: makeQuestion() });
    await vi.advanceTimersByTimeAsync(0);
    expect(api.submitted).toEqual(["A"]);
    expect(api.submitted[0]).not.toBe("C");
  });

  it("skips when a random pick is needed but Random Answer is disabled", async () => {
    const { api, session } = setup({ autoAnswer: { strategy: "random" }, plugins: { "random-answer": false } });
    await session.connectAndJoin();
    api.push("question_started", { question: makeQuestion() });
    await vi.advanceTimersByTimeAsync(5000);
    expect(api.submitted).toEqual([]);
    expect(session.getState().answer.status).toBe("skipped");
  });

  it("does nothing automatically when Auto Answer is off; manual answers still work", async () => {
    const { api, session } = setup({ plugins: { "auto-answer": false } });
    await session.connectAndJoin();
    api.push("question_started", { question: makeQuestion() });
    await vi.advanceTimersByTimeAsync(5000);
    expect(api.submitted).toEqual([]);
    expect(session.getState().answer.status).toBe("waiting");
    await session.submitAnswer("A");
    expect(api.submitted).toEqual(["A"]);
    expect(session.getState().answer).toMatchObject({ status: "sent", mode: "manual" });
  });

  it("cancels a scheduled answer when the question ends first", async () => {
    const { api, session } = setup({ delay: { fixedMs: 2000 } });
    await session.connectAndJoin();
    const q = makeQuestion();
    api.push("question_started", { question: q });
    api.push("question_ended", { questionId: q.id, index: 0, correctAnswerId: "C", distribution: {}, leaderboard: [], hasNext: true });
    await vi.advanceTimersByTimeAsync(3000);
    expect(api.submitted).toEqual([]);
    expect(session.getState().answer.status).toBe("missed");
  });

  it("re-plans when the correct answer changes before sending", async () => {
    const { api, session } = setup({ delay: { fixedMs: 1000 } });
    await session.connectAndJoin();
    const q = makeQuestion();
    api.push("question_started", { question: q });
    api.push("question_updated", { questionId: q.id, reason: "correct_answer", correctAnswerId: "A", question: { ...q, correctAnswerId: "A" } });
    await vi.advanceTimersByTimeAsync(1000);
    expect(api.submitted).toEqual(["A"]);
  });

  it("marks late answers", async () => {
    const { api, session } = setup({ plugins: { "answer-delay": false } });
    api.answerError = new ApiError("Time is up", 409, "too_late");
    await session.connectAndJoin();
    api.push("question_started", { question: makeQuestion() });
    await vi.advanceTimersByTimeAsync(0);
    expect(session.getState().answer.status).toBe("late");
  });

  it("does not re-answer after reconnecting mid-question", async () => {
    const { api, session } = setup({ plugins: { "answer-delay": false } });
    await session.connectAndJoin();
    const q = makeQuestion({ id: "qX" });
    const state = {
      pin: "123456", phase: "question" as const, questionIndex: 0, totalQuestions: 3, question: q, remainingMs: 1000,
      answeredCount: 1, debug: true, autoAdvance: true, serverTime: Date.now(), createdAt: Date.now(),
      players: [{ id: "p1", username: "tester", score: 0, connected: true, answeredCurrent: true, correctCount: 0, streak: 0 }],
    };
    api.push("hello", { state, role: "player", playerId: "p1" });
    await vi.advanceTimersByTimeAsync(0);
    expect(api.submitted).toEqual([]);
    expect(session.getState().answer.status).toBe("sent");
  });

  it("logs questions and responses through the logger plugins", async () => {
    const { api, session } = setup({ plugins: { "answer-delay": false } });
    await session.connectAndJoin();
    api.push("question_started", { question: makeQuestion() });
    await vi.advanceTimersByTimeAsync(0);
    const sources = session.getState().logs.map((l) => l.source);
    expect(sources).toContain("question-logger");
    expect(sources).toContain("response-logger");
    expect(sources).toContain("auto-answer");
  });
});

describe("Auto Reconnect", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("reconnects with backoff and resets on hello", async () => {
    const { api, session } = setup();
    await session.connectAndJoin();
    api.drop();
    expect(session.getState().reconnect).toMatchObject({ attempt: 1 });
    await vi.advanceTimersByTimeAsync(500);
    expect(api.reconnectCalls).toBe(1);
    expect(session.getState().reconnect).toMatchObject({ attempt: 0, exhausted: false });
  });

  it("stops after maxReconnectAttempts (no infinite loop)", async () => {
    const { api, session } = setup({ maxReconnectAttempts: 3 });
    await session.connectAndJoin();
    api.failReconnect = true;
    api.drop();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(api.reconnectCalls).toBe(3);
    expect(session.getState().reconnect.exhausted).toBe(true);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(api.reconnectCalls).toBe(3);
  });

  it("re-joins when the session is gone (fatal close)", async () => {
    const { api, session } = setup();
    await session.connectAndJoin();
    expect(api.joinCalls).toBe(1);
    api.drop(true);
    await vi.advanceTimersByTimeAsync(500);
    expect(api.joinCalls).toBe(2);
  });

  it("does nothing when disabled", async () => {
    const { api, session } = setup({ plugins: { "auto-reconnect": false } });
    await session.connectAndJoin();
    api.drop();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(api.reconnectCalls).toBe(0);
  });
});

describe("Auto Join", () => {
  it("joins on start when enabled", async () => {
    const api = new FakeGameAPI();
    const session = new LabSession({
      settings: mergeSettings(DEFAULT_SETTINGS, { plugins: { "auto-join": true }, pin: "123456", username: "auto" }),
      plugins: BUILTIN_PLUGINS,
      createApi: () => api,
    });
    session.start();
    await new Promise((r) => setTimeout(r, 10));
    expect(api.joinCalls).toBe(1);
    expect(session.getState().session?.username).toBe("auto");
    session.dispose();
  });
});

describe("PluginManager", () => {
  it("calls hooks in order, isolates failures, and toggles plugins", () => {
    const calls: string[] = [];
    const mk = (id: string, order: number, fail = false): LabPlugin =>
      ({
        id,
        name: id,
        description: "",
        order,
        category: "debug",
        onEnable: () => calls.push(`enable:${id}`),
        onDisable: () => calls.push(`disable:${id}`),
        onQuestion: () => {
          if (fail) throw new Error("boom");
          calls.push(`q:${id}`);
        },
      }) as unknown as LabPlugin;
    const errors: string[] = [];
    const pm = new PluginManager(
      [mk("second", 2), mk("first", 1), mk("broken", 0, true)],
      (p) => ({ id: p.id }) as never,
      (p, hook) => errors.push(`${p.id}:${hook}`),
    );
    pm.sync({ first: true, second: true, broken: true } as never);
    pm.dispatch("onQuestion", makeQuestion());
    expect(calls.filter((c) => c.startsWith("q:"))).toEqual(["q:first", "q:second"]);
    expect(errors).toEqual(["broken:onQuestion"]);
    pm.setEnabled("first" as never, false);
    expect(calls).toContain("disable:first");
    calls.length = 0;
    pm.dispatch("onQuestion", makeQuestion());
    expect(calls).toEqual(["q:second"]);
  });

  it("rejects duplicate plugin ids", () => {
    const p = BUILTIN_PLUGINS[0]!;
    expect(() => new PluginManager([p, p], () => ({}) as never)).toThrow(/Duplicate/);
  });
});

describe("settings", () => {
  it("sanitizes untrusted input", () => {
    const s = sanitizeSettings({
      apiKind: "evil",
      pin: "12a34",
      autoAnswer: { strategy: "nope", probability: 7 },
      delay: { fixedMs: -100, mode: "random" },
      maxReconnectAttempts: 1000,
      plugins: { "auto-join": true, bogus: true },
      theme: "neon",
    });
    expect(s.apiKind).toBe("mock");
    expect(s.pin).toBe("1234");
    expect(s.autoAnswer).toEqual({ strategy: "correct", probability: 1 });
    expect(s.delay.fixedMs).toBe(0);
    expect(s.delay.mode).toBe("random");
    expect(s.maxReconnectAttempts).toBe(20);
    expect(s.plugins["auto-join"]).toBe(true);
    expect((s.plugins as Record<string, boolean>).bogus).toBeUndefined();
    expect(s.theme).toBe("dark");
  });

  it("default plugin state matches the spec", () => {
    expect(DEFAULT_SETTINGS.plugins).toEqual({
      "auto-answer": true,
      "answer-delay": true,
      "random-answer": true,
      "show-correct": true,
      "auto-join": false,
      "auto-reconnect": true,
      "question-logger": true,
      "response-logger": true,
      "network-debugger": true,
    });
  });
});
