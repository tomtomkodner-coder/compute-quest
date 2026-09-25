# Plugins

Every feature of the lab is an independent module in `plugins/src/modules/`. Plugins are toggled
on the **Plugins** page (state persisted in `localStorage` under `settings.plugins`).

```
[✓] Auto Answer        auto-answer       order 10  answer
[✓] Answer Delay       answer-delay      order 30  answer
[✓] Random Answer      random-answer     order 20  answer
[✓] Show Correct Answer show-correct     order 40  ui
[ ] Auto Join          auto-join         order 5   connection
[✓] Auto Reconnect     auto-reconnect    order 6   connection
[✓] Question Logger    question-logger   order 50  debug
[✓] Response Logger    response-logger   order 60  debug
[✓] Network Debugger   network-debugger  order 70  debug
```

## Built-in plugins

| Plugin | What it does | Settings |
|---|---|---|
| **Auto Answer** | Runs the answer pipeline for every new question. Strategies: `correct` (uses `correctAnswerId`, which the Mock Server exposes only in Test/Debug games), `random`, `probability` (correct with probability *p*, otherwise a random wrong answer). Unknown correct answer → random fallback. | `autoAnswer.strategy`, `autoAnswer.probability` |
| **Random Answer** | Fulfils random picks requested by Auto Answer (`needsRandom`), honouring exclusions. If disabled, random picks are skipped (status `SKIPPED`). | – |
| **Answer Delay** | Sets `plan.delayMs`: fixed (0 / 100 / 250 / 500 / 1000 / 2000 ms or custom) or random between min/max. Disabled → 0 ms. Warns when the delay exceeds the remaining time. | `delay.mode`, `delay.fixedMs`, `delay.minMs`, `delay.maxMs` |
| **Show Correct Answer** | Lets the UI highlight the correct option (only when Debug mode is on and *Hide correct answer* is off). Logs the correct answer per question. | `hideCorrectAnswer`, `debugMode` |
| **Auto Join** | Joins the configured PIN + username when the lab starts or the plugin is enabled while disconnected. | `pin`, `username` |
| **Auto Reconnect** | On unexpected disconnects: exponential backoff (500 ms → 8 s), hard limit `maxReconnectAttempts` (1–20, default 5). Fatal closes (session gone) → re-join. Confirms success only on the server `hello`. | `maxReconnectAttempts` |
| **Question Logger** | Logs new questions (with answers), timer/correct-answer changes and each question's distribution. | – |
| **Response Logger** | Logs each submission with seen→sent time, verdict, points, server-elapsed and RTT. | – |
| **Network Debugger** | Records every HTTP request/response and WebSocket frame (with latency) for the Developer panel; logs HTTP errors. Disabled → nothing is recorded. | – |

## Writing a plugin

```ts
// plugins/src/modules/streakAlert.ts
import type { LabPlugin } from "../core/types";

export const streakAlertPlugin: LabPlugin = {
  id: "streak-alert",            // add the id to PLUGIN_IDS + DEFAULT_PLUGIN_STATE in core/settings.ts
  name: "Streak Alert",
  description: "Warns after 3 wrong answers in a row.",
  order: 80,
  category: "debug",

  onAnswerResult(ctx, result) {
    const wrong = ctx.getState().answers.slice(-3).filter((a) => a.correct === false).length;
    if (wrong === 3) ctx.log("warn", "Three wrong answers in a row!");
  },
};
```

Then register it in `BUILTIN_PLUGINS` (`plugins/src/index.ts`). It appears automatically on the
Plugins page.

### Hooks

| Hook | When |
|---|---|
| `onEnable(ctx)` / `onDisable(ctx)` | Plugin toggled (also on start-up for enabled plugins) |
| `onSettingsChange(ctx, next, prev)` | Any setting changed |
| `onConnectionChange(ctx, change)` | `idle / connecting / connected / reconnecting / disconnected / error` (+ `unexpected`, `fatal`) |
| `onServerEvent(ctx, event)` | Every WebSocket event |
| `onQuestion(ctx, question)` | A *new* question was detected |
| `planAnswer(ctx, plan, question)` | Answer pipeline (only while Auto Answer is enabled). Mutate `plan.answerId`, `plan.delayMs`, `plan.skip`, `plan.reasons` |
| `onAnswerSent / onAnswerResult / onAnswerError` | Around each submission (auto or manual) |
| `onQuestionEnded(ctx, payload)` | Reveal (correct answer, distribution, leaderboard) |
| `onNetwork(ctx, entry)` | Every HTTP request/response and WS frame |

### Context (`PluginContext`)

`getState()`, `getSettings()`, `isEnabled(id)`, `log(level, msg, data?)`, `api()`, `rng`,
`connectAndJoin()`, `reconnect()`, `rejoin()`, `submitAnswer()`, `setReconnectState()`, `recordNetwork()`.

Rules: plugins never touch the DOM or call `fetch` directly — they go through the context, so they
work with any `GameAPI` implementation. An exception inside a plugin is caught and logged; other
plugins keep running.
