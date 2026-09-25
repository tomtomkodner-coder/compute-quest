import type { LabPlugin } from "./core/types";
import { answerDelayPlugin } from "./modules/answerDelay";
import { autoAnswerPlugin } from "./modules/autoAnswer";
import { autoJoinPlugin } from "./modules/autoJoin";
import { autoReconnectPlugin } from "./modules/autoReconnect";
import { networkDebuggerPlugin } from "./modules/networkDebugger";
import { questionLoggerPlugin } from "./modules/questionLogger";
import { randomAnswerPlugin } from "./modules/randomAnswer";
import { responseLoggerPlugin } from "./modules/responseLogger";
import { showCorrectPlugin } from "./modules/showCorrect";

export * from "./core/types";
export * from "./core/settings";
export * from "./core/PluginManager";
export * from "./core/LabSession";
export {
  answerDelayPlugin,
  autoAnswerPlugin,
  autoJoinPlugin,
  autoReconnectPlugin,
  networkDebuggerPlugin,
  questionLoggerPlugin,
  randomAnswerPlugin,
  responseLoggerPlugin,
  showCorrectPlugin,
};

/** All built-in plugins. Add your own module here (see docs/PLUGINS.md). */
export const BUILTIN_PLUGINS: LabPlugin[] = [
  autoJoinPlugin,
  autoReconnectPlugin,
  autoAnswerPlugin,
  randomAnswerPlugin,
  answerDelayPlugin,
  showCorrectPlugin,
  questionLoggerPlugin,
  responseLoggerPlugin,
  networkDebuggerPlugin,
];
