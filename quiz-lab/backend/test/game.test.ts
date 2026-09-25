import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AnyServerEvent, QuestionDefinition } from "@quizlab/shared";
import { Game } from "../src/game/Game";
import { GameError } from "../src/game/errors";
import { GameStore } from "../src/game/GameStore";

const QUESTIONS: QuestionDefinition[] = [
  { id: "q1", text: "1+1?", answers: [{ id: "A", text: "1" }, { id: "B", text: "2" }], correctAnswerId: "B" },
  { id: "q2", text: "2+2?", answers: [{ id: "A", text: "4" }, { id: "B", text: "5" }], correctAnswerId: "A" },
];

function makeGame(opts: Partial<ConstructorParameters<typeof Game>[0]> = {}) {
  const game = new Game({ pin: "111111", questions: QUESTIONS, timeLimitMs: 10_000, revealMs: 1000, ...opts });
  const events: AnyServerEvent[] = [];
  game.on("event", (e) => events.push(e));
  return { game, events, types: () => events.map((e) => e.type) };
}

describe("Game engine", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("supports multiple players and broadcasts player_joined", () => {
    const { game, types } = makeGame();
    game.join("alice");
    game.join("bob");
    expect(game.getState().players.map((p) => p.username)).toEqual(["alice", "bob"]);
    expect(types()).toEqual(["player_joined", "player_joined"]);
  });

  it("validates usernames and rejects duplicates", () => {
    const { game } = makeGame();
    game.join("alice");
    expect(() => game.join("ALICE")).toThrow(/taken/);
    expect(() => game.join("")).toThrow(GameError);
    expect(() => game.join("x".repeat(25))).toThrow(GameError);
  });

  it("runs question → reveal → next → ended with auto-advance", () => {
    const { game, types } = makeGame();
    game.join("alice");
    game.start();
    expect(game.getState().phase).toBe("question");
    vi.advanceTimersByTime(10_000);
    expect(game.getState().phase).toBe("reveal");
    vi.advanceTimersByTime(1000);
    expect(game.getState().questionIndex).toBe(1);
    vi.advanceTimersByTime(10_000 + 1000);
    expect(game.getState().phase).toBe("ended");
    expect(types()).toEqual([
      "player_joined",
      "game_started",
      "question_started",
      "question_ended",
      "question_started",
      "question_ended",
      "game_ended",
    ]);
  });

  it("scores answers by speed and correctness; builds leaderboard", () => {
    const { game } = makeGame({ autoAdvance: false });
    const a = game.join("alice");
    const b = game.join("bob");
    game.start();
    vi.advanceTimersByTime(2000);
    const ra = game.submitAnswer(a.token, "B");
    expect(ra).toMatchObject({ correct: true, points: 900, elapsedMs: 2000, correctAnswerId: "B" });
    const rb = game.submitAnswer(b.token, "A");
    expect(rb).toMatchObject({ correct: false, points: 0 });
    expect(game.leaderboard().map((e) => e.username)).toEqual(["alice", "bob"]);
  });

  it("rejects duplicate, invalid, late and unauthenticated answers", () => {
    const { game } = makeGame({ autoAdvance: false });
    const a = game.join("alice");
    game.join("bob");
    expect(() => game.submitAnswer(a.token, "A")).toThrow(/No question/);
    game.start();
    expect(() => game.submitAnswer("nope", "A")).toThrow(/token/);
    expect(() => game.submitAnswer(a.token, "Z")).toThrow(/does not exist/);
    game.submitAnswer(a.token, "A");
    expect(() => game.submitAnswer(a.token, "B")).toThrow(/already answered/);
    expect(() => game.submitAnswer(a.token, "B", "q2")).toThrow();
  });

  it("ends the question early when every player answered", () => {
    const { game } = makeGame({ autoAdvance: false });
    const a = game.join("alice");
    game.start();
    game.submitAnswer(a.token, "B");
    vi.advanceTimersByTime(1);
    expect(game.getState().phase).toBe("reveal");
  });

  it("hides the correct answer when debug is off (until reveal)", () => {
    const { game } = makeGame({ debug: false, autoAdvance: false });
    game.join("alice");
    game.start();
    expect(game.questionView()?.correctAnswerId).toBeUndefined();
    game.endQuestion();
    expect(game.questionView()?.correctAnswerId).toBe("B");
  });

  it("developer controls: timer, correct answer, custom question", () => {
    const { game, events } = makeGame({ autoAdvance: false });
    const a = game.join("alice");
    game.start();
    game.setRemaining(3000);
    expect(game.getState().remainingMs).toBe(3000);
    game.setCorrectAnswer("A");
    expect(events.at(-1)).toMatchObject({ type: "question_updated", payload: { reason: "correct_answer", correctAnswerId: "A" } });
    expect(game.submitAnswer(a.token, "A").correct).toBe(true);
    vi.advanceTimersByTime(1);
    game.addQuestion({ text: "Custom?", answers: [{ id: "A", text: "x" }, { id: "B", text: "y" }], correctAnswerId: "B", timeLimitMs: 5000 });
    const s = game.getState();
    expect(s.question).toMatchObject({ text: "Custom?", timeLimitMs: 5000, index: 1 });
    expect(s.totalQuestions).toBe(3);
    expect(() => game.addQuestion({ text: "bad", answers: [{ id: "A", text: "x" }], correctAnswerId: "A" })).toThrow();
  });

  it("marks players connected/disconnected and emits player_left / rejoin", () => {
    const { game, events } = makeGame();
    const a = game.join("alice");
    game.setConnected(a.player.id, true);
    game.setConnected(a.player.id, false);
    game.setConnected(a.player.id, true);
    expect(events.slice(1).map((e) => e.type)).toEqual(["player_left", "player_joined"]);
    expect(events.at(-1)).toMatchObject({ payload: { rejoined: true } });
  });

  it("loops back to the lobby and auto-starts", () => {
    const { game } = makeGame({ loop: true, loopDelayMs: 500, autoStartMs: 200 });
    game.join("alice");
    vi.advanceTimersByTime(200);
    expect(game.getState().phase).toBe("question");
    game.endGame();
    expect(game.getState().phase).toBe("ended");
    vi.advanceTimersByTime(500);
    expect(game.getState().phase).toBe("lobby");
    vi.advanceTimersByTime(200);
    expect(game.getState().phase).toBe("question");
  });

  it("GameStore allocates unique 6-digit PINs and enforces limits", () => {
    const store = new GameStore({ maxGames: 2, defaultTimeLimitMs: 20000, revealMs: 1000, maxPlayers: 1 });
    const g1 = store.create();
    const g2 = store.create({ questionCount: 3 });
    expect(g1.pin).toMatch(/^\d{6}$/);
    expect(g1.pin).not.toBe(g2.pin);
    expect(g2.getState().totalQuestions).toBe(3);
    expect(() => store.create()).toThrow(/limit/);
    g1.join("solo");
    expect(() => g1.join("second")).toThrow(/full/);
    store.dispose();
  });
});

describe("disconnect grace period", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("removes players whose socket never comes back, keeps those who reconnect", () => {
    const game = new Game({ pin: "222222", questions: QUESTIONS, disconnectGraceMs: 1000 });
    const events: AnyServerEvent[] = [];
    game.on("event", (e) => events.push(e));
    const a = game.join("alice");
    const b = game.join("bob");
    game.setConnected(a.player.id, true);
    game.setConnected(b.player.id, true);
    game.setConnected(a.player.id, false);
    game.setConnected(b.player.id, false);
    vi.advanceTimersByTime(500);
    game.setConnected(b.player.id, true);
    vi.advanceTimersByTime(600);
    expect(game.getState().players.map((p) => p.username)).toEqual(["bob"]);
    expect(events.at(-1)).toMatchObject({ type: "player_left", payload: { username: "alice", reason: "timeout" } });
    // The username is free again.
    expect(() => game.join("alice")).not.toThrow();
    game.dispose();
  });
});
