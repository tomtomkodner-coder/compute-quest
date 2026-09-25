import { loadEnv, readConfig } from "./config";
import { createQuizServer } from "./server";

loadEnv();
const config = readConfig();
const quiz = createQuizServer(config);

quiz
  .listen()
  .then(({ url }) => {
    console.log(`\n  🧪 Quiz Hack Lab — Mock Server`);
    console.log(`  REST  ${url}  (also under /api)`);
    console.log(`  WS    ${url.replace("http", "ws")}/ws`);
    if (config.demoGame) {
      console.log(`  Demo  PIN ${config.demoPin} · host token "${config.demoHostToken}" · loop=${config.demoLoop}`);
    }
    console.log("");
  })
  .catch((err) => {
    console.error("Failed to start the Mock Server:", err);
    process.exit(1);
  });

const shutdown = () => {
  quiz.close().finally(() => process.exit(0));
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
