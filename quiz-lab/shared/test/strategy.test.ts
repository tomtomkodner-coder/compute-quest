import { describe, expect, it } from "vitest";
import {
  backoffDelay,
  computeDelay,
  computePoints,
  decideAnswer,
  formatMs,
  pickRandomAnswer,
  type QuestionView,
} from "../src";

const answers = [{ id: "A", text: "a" }, { id: "B", text: "b" }, { id: "C", text: "c" }, { id: "D", text: "d" }];
const q = (correctAnswerId?: string) => ({ answers, correctAnswerId }) as Pick<QuestionView, "answers" | "correctAnswerId">;
const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length]!;
};

describe("decideAnswer", () => {
  it("returns the correct answer with strategy=correct", () => {
    expect(decideAnswer("correct", q("C"))).toMatchObject({ answerId: "C", needsRandom: false });
  });

  it("defers to random with strategy=random", () => {
    expect(decideAnswer("random", q("C"))).toMatchObject({ answerId: null, needsRandom: true, exclude: [] });
  });

  it("falls back to random when the correct answer is unknown", () => {
    const d = decideAnswer("correct", q(undefined));
    expect(d.needsRandom).toBe(true);
    expect(d.reason).toMatch(/unknown/);
  });

  it("probability hit picks correct, miss excludes correct", () => {
    expect(decideAnswer("probability", q("B"), 0.7, seq(0.5))).toMatchObject({ answerId: "B" });
    expect(decideAnswer("probability", q("B"), 0.7, seq(0.9))).toMatchObject({ answerId: null, needsRandom: true, exclude: ["B"] });
  });

  it("probability=1 always correct, probability=0 never", () => {
    for (let i = 0; i < 20; i++) {
      expect(decideAnswer("probability", q("A"), 1).answerId).toBe("A");
      expect(decideAnswer("probability", q("A"), 0).answerId).toBeNull();
    }
  });
});

describe("pickRandomAnswer", () => {
  it("picks from the pool honouring exclusions", () => {
    expect(pickRandomAnswer(answers, [], seq(0))).toBe("A");
    expect(pickRandomAnswer(answers, [], seq(0.999))).toBe("D");
    for (let i = 0; i < 50; i++) expect(pickRandomAnswer(answers, ["B"])).not.toBe("B");
  });
  it("returns null for an empty pool", () => {
    expect(pickRandomAnswer([{ id: "A" }], ["A"])).toBeNull();
  });
});

describe("computeDelay", () => {
  it("fixed delay", () => {
    expect(computeDelay({ mode: "fixed", fixedMs: 250, minMs: 0, maxMs: 0 })).toBe(250);
    expect(computeDelay({ mode: "fixed", fixedMs: -5, minMs: 0, maxMs: 0 })).toBe(0);
  });
  it("random delay stays within bounds (and tolerates swapped bounds)", () => {
    for (let i = 0; i < 100; i++) {
      const d = computeDelay({ mode: "random", fixedMs: 0, minMs: 100, maxMs: 500 });
      expect(d).toBeGreaterThanOrEqual(100);
      expect(d).toBeLessThanOrEqual(500);
    }
    expect(computeDelay({ mode: "random", fixedMs: 0, minMs: 500, maxMs: 100 }, seq(0))).toBe(100);
  });
});

describe("misc", () => {
  it("backoff grows exponentially and is capped", () => {
    expect([1, 2, 3, 4].map((a) => backoffDelay(a, 500, 8000))).toEqual([500, 1000, 2000, 4000]);
    expect(backoffDelay(10, 500, 8000)).toBe(8000);
  });
  it("scoring: 1000 instant, 500 at buzzer, 0 when wrong", () => {
    expect(computePoints(true, 0, 20000)).toBe(1000);
    expect(computePoints(true, 20000, 20000)).toBe(500);
    expect(computePoints(true, 10000, 20000)).toBe(750);
    expect(computePoints(false, 0, 20000)).toBe(0);
  });
  it("formatMs", () => {
    expect(formatMs(250)).toBe("250ms");
    expect(formatMs(1000)).toBe("1s");
    expect(formatMs(1500)).toBe("1.5s");
  });
});
