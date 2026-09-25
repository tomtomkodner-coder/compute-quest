import type { LabPlugin } from "../core/types";

/** QUESTION LOGGER — logs every new question, timer updates and the reveal. */
export const questionLoggerPlugin: LabPlugin = {
  id: "question-logger",
  name: "Question Logger",
  description: "Logs new questions, timer / answer changes and each question's results.",
  order: 50,
  category: "debug",

  onQuestion(ctx, q) {
    ctx.log("info", `❓ Q${q.index + 1}/${q.total}: ${q.text}`, {
      answers: q.answers.map((a) => `${a.id}) ${a.text}`),
      timeLimitMs: q.timeLimitMs,
    });
  },

  onServerEvent(ctx, event) {
    if (event.type === "question_updated") {
      const p = event.payload;
      if (p.reason === "timer") ctx.log("info", `⏱ Timer changed → ${Math.round((p.remainingMs ?? 0) / 100) / 10}s left`);
      if (p.reason === "correct_answer") ctx.log("info", `✏️ Correct answer changed${p.correctAnswerId ? ` → ${p.correctAnswerId}` : ""}`);
    }
  },

  onQuestionEnded(ctx, p) {
    const dist = Object.entries(p.distribution)
      .map(([k, v]) => `${k}:${v}`)
      .join(" ");
    ctx.log("info", `✅ Q${p.index + 1} ended — correct ${p.correctAnswerId} · distribution ${dist}`);
  },
};
