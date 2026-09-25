import { computeDelay, formatMs } from "@quizlab/shared";
import type { LabPlugin } from "../core/types";

/**
 * ANSWER DELAY — waits before the automatic answer is sent.
 * Fixed (0/100/250/500/1000/2000ms or custom) or random between min and max.
 */
export const answerDelayPlugin: LabPlugin = {
  id: "answer-delay",
  name: "Answer Delay",
  description: "Delays automatic answers by a fixed, custom or random (min–max) amount of time.",
  order: 30,
  category: "answer",

  planAnswer(ctx, plan) {
    const cfg = ctx.getSettings().delay;
    plan.delayMs = computeDelay(cfg, ctx.rng);
    plan.reasons.push(
      cfg.mode === "random"
        ? `delay random ${formatMs(cfg.minMs)}–${formatMs(cfg.maxMs)} → ${formatMs(plan.delayMs)}`
        : `delay ${formatMs(plan.delayMs)}`,
    );
  },
};
