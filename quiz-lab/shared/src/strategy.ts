import { MAX_POINTS, RECONNECT_BASE_MS, RECONNECT_MAX_MS } from "./constants";
import type { AnswerId, QuestionView } from "./types";

export type Rng = () => number;

export type AnswerStrategy = "correct" | "random" | "probability";

export interface AnswerDecision {
  answerId: AnswerId | null;
  /** Why this answer was chosen (for logs). */
  reason: string;
  /** True when the decision needs a random pick (handled by the Random Answer plugin). */
  needsRandom: boolean;
  /** Answer ids that must be excluded from a random pick. */
  exclude: AnswerId[];
}

/**
 * Decide which answer to pick for a question.
 *
 * - correct:     the correct answer (only known in Test/Debug mode on the Mock Server).
 * - random:      defer to a random pick.
 * - probability: with probability `p` pick the correct answer, otherwise a random wrong one.
 */
export function decideAnswer(
  strategy: AnswerStrategy,
  question: Pick<QuestionView, "answers" | "correctAnswerId">,
  probability = 1,
  rng: Rng = Math.random,
): AnswerDecision {
  const correct = question.correctAnswerId;
  if (strategy === "random") {
    return { answerId: null, reason: "strategy=random", needsRandom: true, exclude: [] };
  }
  if (!correct) {
    return {
      answerId: null,
      reason: "correct answer unknown (server not in debug mode) → random fallback",
      needsRandom: true,
      exclude: [],
    };
  }
  if (strategy === "correct") {
    return { answerId: correct, reason: "strategy=correct", needsRandom: false, exclude: [] };
  }
  const p = clamp(probability, 0, 1);
  const roll = rng();
  if (roll < p) {
    return {
      answerId: correct,
      reason: `strategy=probability hit (roll ${roll.toFixed(3)} < p ${p})`,
      needsRandom: false,
      exclude: [],
    };
  }
  const hasWrong = question.answers.some((a) => a.id !== correct);
  return {
    answerId: null,
    reason: `strategy=probability miss (roll ${roll.toFixed(3)} ≥ p ${p})`,
    needsRandom: true,
    exclude: hasWrong ? [correct] : [],
  };
}

export function pickRandomAnswer(
  answers: ReadonlyArray<{ id: AnswerId }>,
  exclude: ReadonlyArray<AnswerId> = [],
  rng: Rng = Math.random,
): AnswerId | null {
  const pool = answers.filter((a) => !exclude.includes(a.id));
  if (pool.length === 0) return null;
  const idx = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
  return pool[idx]!.id;
}

export interface DelayConfig {
  mode: "fixed" | "random";
  fixedMs: number;
  minMs: number;
  maxMs: number;
}

export function computeDelay(config: DelayConfig, rng: Rng = Math.random): number {
  if (config.mode === "random") {
    const min = Math.max(0, Math.min(config.minMs, config.maxMs));
    const max = Math.max(0, Math.max(config.minMs, config.maxMs));
    return Math.round(min + rng() * (max - min));
  }
  return Math.max(0, Math.round(config.fixedMs));
}

/** Exponential backoff with an upper bound (attempt is 1-based). */
export function backoffDelay(
  attempt: number,
  baseMs = RECONNECT_BASE_MS,
  maxMs = RECONNECT_MAX_MS,
): number {
  const a = Math.max(1, attempt);
  return Math.min(maxMs, baseMs * 2 ** (a - 1));
}

/** Kahoot-like scoring: full points for instant answers, half points at the buzzer. */
export function computePoints(correct: boolean, elapsedMs: number, timeLimitMs: number): number {
  if (!correct || timeLimitMs <= 0) return 0;
  const ratio = clamp(elapsedMs / timeLimitMs, 0, 1);
  return Math.round(MAX_POINTS * (1 - ratio / 2));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Format milliseconds as a human friendly delay label (e.g. 250ms, 1s, 1.5s). */
export function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const s = ms / 1000;
  return `${Number.isInteger(s) ? s : s.toFixed(2).replace(/0$/, "")}s`;
}
