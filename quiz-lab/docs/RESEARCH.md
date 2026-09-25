# GitHub research, licenses & choice of base

Research performed before writing any code (September 2026) using GitHub search
(`kahoot client`, `kahoot clone socket.io`, `kahoot alternative open source quiz`, …) and the
licence files of the candidate repositories.

## Candidates

| Repository | What it is | Stack | Licence | Usable here? |
|---|---|---|---|---|
| [mawoka-myblock/ClassQuiz](https://github.com/mawoka-myblock/ClassQuiz) (~720★) | Full open-source Kahoot alternative (host + players) | FastAPI · SvelteKit · Socket.IO · Redis/Postgres | **MPL-2.0** | ✅ As an **architecture reference** (server-authoritative game state, realtime events, per-question timers). Code not copied: different language/stack, and MPL-2.0 is file-level copyleft. |
| [theusaf/kahoot.js-updated](https://github.com/theusaf/kahoot.js-updated) (archived) | Node client library for **Kahoot's private player protocol** (CometD + challenge solving) | Node.js | MIT | ❌ Licence is fine, but the code exists to talk to Kahoot's private, undocumented endpoints — explicitly out of scope. Only its *idea* of an event-driven client API (`QuestionStart`, `QuestionEnd`, …) inspired our `GameAPI` events. No code used. |
| [0u44/Kitty-Tools](https://github.com/0u44/Kitty-Tools) (~480★) | "Kahoot cheating client" | Python | CC0-1.0 | ❌ Purpose is cheating on real Kahoot games. Rejected regardless of the permissive licence. |
| Jack06WS/Hacked-Kahoot-Client, Doob123123/KahootCheat | Hacked/cheat clients | JS | "Other" / none | ❌ Unclear licence + cheating purpose. |
| [r-argentina-programa/kahoot-clone](https://github.com/r-argentina-programa/kahoot-clone), EdwinGonzalez23/Kahoot_Clone, KevZ1209/kahoot-clone | Small React/Express/Socket.IO Kahoot clones | Node · React · Socket.IO | **No licence file** | ❌ "All rights reserved" by default — cannot copy. Used only to confirm the common REST + realtime room pattern. |
| [Cereal38/rhova](https://github.com/Cereal38/rhova) | Open-source Kahoot alternative | Next.js · TS | MIT | ⚠️ Permissive, but a full SaaS product (auth, DB) — far more than a lab needs. Reference only. |
| [hermonochy/QuizMaster](https://github.com/hermonochy/QuizMaster) | Desktop quiz app | Python · pygame | GPL-3.0 | ❌ Different platform; GPL would force the whole project to GPL. |

### Public / official APIs

* **Kahoot** has no public, documented *player* API. Its player protocol is private; using it would
  require reverse engineering and bypassing its challenge — **not done**. The lab actively refuses
  Kahoot hosts (`shared/src/security.ts`).
* **Open Trivia DB** (`opentdb.com`, CC BY-SA 4.0 data) is a public question API, but it only serves
  questions (no game/session layer) and was not reachable from the build environment, so the Mock
  Server ships with its own original 20-question bank. `OfficialGameAPI` is the extension point for a
  real, authorized provider later.

## Architecture comparison

| Aspect | ClassQuiz | kahoot.js | Small clones | **This project** |
|---|---|---|---|---|
| Game authority | Server | Kahoot servers | Server | Server (`backend/src/game/Game.ts`) |
| Transport | REST + Socket.IO | CometD long-poll/WS | Socket.IO only | REST for commands + plain WebSocket for events |
| Client abstraction | UI talks to API directly | Library object with events | UI ↔ socket | `GameAPI` interface → `MockGameAPI` / `OfficialGameAPI` |
| Extensibility | Monolith | — | — | Independent plugin modules with ordered hooks |
| Timers | Server | Server | Mixed | Server-side, clients correct for clock offset |

## Decision

No repository was suitable to fork: the permissively licensed ones either target Kahoot's private
API or are full products, and the small clones have no licence. The project is therefore
**written from scratch** in TypeScript, adopting:

* ClassQuiz's *architecture* (server-authoritative state machine, realtime room per game PIN,
  REST for mutations) — idea only, no code.
* kahoot.js's *developer ergonomics* (a client object that emits game events) — idea only.
* `express` (MIT) and `ws` (MIT) as the only runtime server dependencies; `react` (MIT) + `vite`
  (MIT) for the UI; `vitest` (MIT) for tests.

Why REST + raw WebSocket instead of Socket.IO: fewer dependencies, the protocol is visible and easy
to inspect in the Network Debugger, and Node 22 ships a native `WebSocket` client, so the same
`MockGameAPI` runs in the browser and in Node tests.
