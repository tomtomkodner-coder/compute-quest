import { decideAnswer } from "@quizlab/shared";
import type { LabPlugin } from "../core/types";

/**
 * AUTO ANSWER — chooses an answer automatically for every new question.
 * Strategies: correct · random · probability (settings.autoAnswer).
 * The correct answer is only known when the Mock Server runs in Test/Debug mode.
 */
export const autoAnswerPlugin: LabPlugin = {
  id: "auto-answer",
  name: "Auto Answer",
  description: "Automatically picks an answer for each new question (correct / random / probability).",
  order: 10,
  category: "answer",

  onEnable(ctx) {
    const { strategy, probability } = ctx.getSettings().autoAnswer;
    ctx.log("info", `Auto Answer on (strategy=${strategy}${strategy === "probability" ? `, p=${probability}` : ""})`);
  },

  planAnswer(ctx, plan, question) {
    const { strategy, probability } = ctx.getSettings().autoAnswer;
    const decision = decideAnswer(strategy, question, probability, ctx.rng);
    plan.answerId = decision.answerId;
    plan.needsRandom = decision.needsRandom;
    plan.exclude = decision.exclude;
    plan.reasons.push(decision.reason);
  },
};
