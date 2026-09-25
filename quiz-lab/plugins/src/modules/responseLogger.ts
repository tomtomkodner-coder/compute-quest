import type { LabPlugin } from "../core/types";

/** RESPONSE LOGGER — logs every submitted answer with timings and the server's verdict. */
export const responseLoggerPlugin: LabPlugin = {
  id: "response-logger",
  name: "Response Logger",
  description: "Logs answer submissions, server verdicts, points and timing (RTT, server elapsed).",
  order: 60,
  category: "debug",

  onAnswerSent(ctx, r) {
    ctx.log("debug", `→ Sending ${r.answerId} (${r.mode}) for Q${r.questionIndex + 1}, ${r.sentAt - r.questionSeenAt}ms after the question appeared`);
  },

  onAnswerResult(ctx, result, r) {
    ctx.log(
      result.correct ? "success" : "warn",
      `← ${result.correct ? "Correct" : "Wrong"} ${result.answerId} · +${result.points} pts (total ${result.totalScore}) · server elapsed ${result.elapsedMs}ms · RTT ${r.roundTripMs}ms`,
      result,
    );
  },

  onAnswerError(ctx, err, r) {
    ctx.log("error", `← Answer ${r.answerId} rejected: ${err.message}`);
  },
};
