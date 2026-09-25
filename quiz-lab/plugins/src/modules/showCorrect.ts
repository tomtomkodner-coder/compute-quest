import type { LabPlugin } from "../core/types";

/**
 * SHOW CORRECT ANSWER — lets the UI highlight the correct option in Test/Debug mode.
 * The UI checks `isPluginEnabled("show-correct") && debugMode && !hideCorrectAnswer`.
 */
export const showCorrectPlugin: LabPlugin = {
  id: "show-correct",
  name: "Show Correct Answer",
  description: "Highlights the correct option when the server exposes it (Test/Debug mode only).",
  order: 40,
  category: "ui",

  onQuestion(ctx, question) {
    const s = ctx.getSettings();
    if (!s.debugMode || s.hideCorrectAnswer) return;
    if (question.correctAnswerId) ctx.log("debug", `Correct answer for Q${question.index + 1}: ${question.correctAnswerId}`);
    else ctx.log("debug", `Server did not expose the correct answer for Q${question.index + 1} (debug mode off?)`);
  },
};
