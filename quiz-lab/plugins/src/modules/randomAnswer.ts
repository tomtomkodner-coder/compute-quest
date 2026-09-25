import { pickRandomAnswer } from "@quizlab/shared";
import type { LabPlugin } from "../core/types";

/**
 * RANDOM ANSWER — fulfils random picks requested by Auto Answer
 * (strategy=random, probability misses, or when the correct answer is unknown).
 */
export const randomAnswerPlugin: LabPlugin = {
  id: "random-answer",
  name: "Random Answer",
  description: "Provides random picks for the 'random' strategy, probability misses and unknown-answer fallbacks.",
  order: 20,
  category: "answer",

  planAnswer(ctx, plan, question) {
    if (plan.answerId || !plan.needsRandom) return;
    const id = pickRandomAnswer(question.answers, plan.exclude, ctx.rng);
    if (id) {
      plan.answerId = id;
      plan.needsRandom = false;
      plan.reasons.push(`random pick → ${id}${plan.exclude.length ? ` (excluding ${plan.exclude.join(",")})` : ""}`);
    }
  },
};
