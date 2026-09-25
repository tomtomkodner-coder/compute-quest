import { readConfig } from "../src/config";
import { createQuizServer, type QuizServer } from "../src/server";

export async function startTestServer(env: Record<string, string> = {}): Promise<{ quiz: QuizServer; url: string; wsUrl: string }> {
  const config = readConfig({
    NODE_ENV: "test",
    LOG_REQUESTS: "false",
    DEMO_GAME: "true",
    DEMO_PIN: "123456",
    DEMO_HOST_TOKEN: "test-host",
    DEMO_LOOP: "false",
    DEMO_AUTOSTART_MS: "0",
    REVEAL_MS: "200",
    RATE_LIMIT_PER_MIN: "0",
    ...env,
  });
  config.staticDir = "/nonexistent";
  const quiz = createQuizServer(config);
  const { url } = await quiz.listen(0, "127.0.0.1");
  return { quiz, url, wsUrl: `${url.replace("http", "ws")}/ws` };
}

export const waitFor = async (cond: () => boolean, timeoutMs = 3000, stepMs = 10) => {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) throw new Error("waitFor timed out");
    await new Promise((r) => setTimeout(r, stepMs));
  }
};
