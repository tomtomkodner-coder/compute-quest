# API documentation

Base URL: `http://localhost:4000` — every route is also mounted under `/api`
(the Vite dev server proxies `/api` and `/ws`, so the UI uses relative URLs).

All bodies are JSON. Errors always look like:

```json
{ "error": "Human readable message", "code": "machine_code", "details": {} }
```

| HTTP | Typical `code` values |
|---|---|
| 400 | `invalid_username`, `invalid_answer`, `invalid_question`, `invalid_timer`, `bad_json` |
| 401 | `invalid_player_token` |
| 403 | `invalid_host_token` |
| 404 | `game_not_found`, `not_found` |
| 409 | `username_taken`, `game_full`, `game_ended`, `already_started`, `no_active_question`, `already_answered`, `too_late`, `stale_question` |
| 429 | `rate_limited` (header `Retry-After`) |

Authentication model (Mock Server):

* **Player token** — returned by `/game/join`; send it as `X-Player-Token` (or `playerToken` in the body).
  A player can only act as themselves.
* **Host token** — returned by `/game/create`; send it as `X-Host-Token`. Required for `/dev/*`.
  The demo game's host token is `DEMO_HOST_TOKEN` (default `dev-host-token`).

---

## Player API

### `GET /health`
`{ "ok": true, "serverTime": 1790314383536, "games": 1, "version": "1.0.0" }`

### `POST /game/create`
Create a game. All fields optional.

```json
{
  "questionCount": 10,          // take N questions from the built-in bank
  "questions": [ { "text": "…", "answers": [{"id":"A","text":"…"}, …], "correctAnswerId": "A", "timeLimitMs": 15000 } ],
  "timeLimitMs": 20000,         // default per question (1000–600000)
  "debug": true,                // Test/Debug mode: players receive correctAnswerId
  "autoAdvance": true,          // move to the next question automatically
  "loop": false,                // restart after the game ends
  "autoStartMs": 0,             // auto-start N ms after the first join (0 = manual)
  "shuffle": false
}
```
→ `201 { "pin": "482913", "hostToken": "…", "totalQuestions": 10, "debug": true }`

### `POST /game/join`
`{ "pin": "123456", "username": "tester" }` →
`201 { "pin", "playerId", "playerToken", "username", "state": GameState }`

### `GET /game/state?pin=123456`
Returns `GameState`:

```ts
{
  pin: string; phase: "lobby" | "question" | "reveal" | "ended";
  questionIndex: number;          // 0-based, -1 in lobby
  totalQuestions: number;
  players: { id, username, score, connected, answeredCurrent, correctCount, streak }[];
  question: QuestionView | null;
  remainingMs: number; answeredCount: number;
  debug: boolean; autoAdvance: boolean; serverTime: number; createdAt: number;
}
```

### `GET /game/question?pin=123456`
`{ "question": QuestionView | null, "phase": "question", "serverTime": … }`

```ts
QuestionView = {
  id, index, total, text,
  answers: { id: "A" | "B" | "C" | "D", text }[],
  timeLimitMs, startedAt, endsAt,     // server epoch ms
  correctAnswerId?                    // only in debug games (or after the reveal)
}
```

### `POST /game/answer`
Headers: `X-Player-Token`. Body: `{ "pin": "123456", "answerId": "B", "questionId"?: "q01", "clientSentAt"?: 1790… }`

```json
{ "accepted": true, "questionId": "q01", "answerId": "B", "correct": true, "points": 991,
  "totalScore": 991, "elapsedMs": 356, "receivedAt": 1790314384218, "rank": 1, "correctAnswerId": "B" }
```

Scoring: `round(1000 × (1 − elapsed/timeLimit / 2))` for a correct answer (1000 instant → 500 at the
buzzer), 0 otherwise. One answer per player per question; answers after `endsAt` → `409 too_late`.
When every player has answered, the question ends early.

### `GET /game/results?pin=123456`
`{ pin, phase, totalQuestions, leaderboard: [{ rank, playerId, username, score, correctCount }], questions: [{ id, index, text, correctAnswerId, distribution: {A:0,B:3,…}, answeredCount, correctCount }] }`

### `POST /game/leave`
Headers: `X-Player-Token`. Body: `{ "pin": "123456" }` → `{ "ok": true }`

### `GET /games`
Lists games: `{ games: [{ pin, phase, players, questionIndex, totalQuestions, debug, createdAt }] }`

---

## Developer / host API (Developer Mode)

All `POST`, all require `X-Host-Token`, body always contains `pin`; response is the new `GameState`.

| Route | Body | Effect |
|---|---|---|
| `/dev/start` | – | Lobby → first question |
| `/dev/next` | `index?` | Trigger the next question manually (or a specific index) |
| `/dev/end-question` | – | Close the running question now (reveal) |
| `/dev/timer` | `remainingMs` | Change the time left on the running question |
| `/dev/time-limit` | `timeLimitMs` | Default time limit for upcoming questions |
| `/dev/correct` | `answerId` | Change the correct answer of the current question |
| `/dev/question` | `question`, `startNow` | Insert a custom question after the current one (and start it) |
| `/dev/auto-advance` | `autoAdvance` | Toggle automatic progression |
| `/dev/end-game` | – | End the game (leaderboard) |
| `/dev/reset` | – | Back to lobby, scores cleared, original questions |

---

## WebSocket

`ws://localhost:4000/ws?pin=123456&playerToken=…` (player) · `&hostToken=…` (host) · only `pin` (observer).

Every frame:

```json
{ "type": "question_started", "pin": "123456", "seq": 12, "serverTime": 1790314383862, "payload": { … } }
```

| type | payload |
|---|---|
| `hello` | `{ state: GameState, role, playerId? }` — sent on connect (confirms a (re)connection) |
| `game_started` | `{ totalQuestions }` |
| `question_started` | `{ question: QuestionView }` |
| `question_updated` | `{ questionId, reason: "timer" \| "correct_answer", endsAt?, remainingMs?, correctAnswerId?, question }` |
| `answer_submitted` | `{ questionId, playerId, username, answeredCount, totalPlayers, elapsedMs }` (never reveals *which* answer) |
| `question_ended` | `{ questionId, index, correctAnswerId, distribution, leaderboard, hasNext }` |
| `game_ended` | `{ leaderboard }` |
| `game_reset` | `{ state }` |
| `player_joined` | `{ player, rejoined, playerCount }` |
| `player_left` | `{ playerId, username, reason: "disconnect" \| "leave" \| "timeout", playerCount }` |
| `pong` | `{ clientTs }` — reply to the client's `{ "type": "ping", "clientTs": … }` (RTT measurement) |

Close codes: `4001` invalid token · `4004` game not found · `4009` replaced by a newer connection.
The server pings every 15 s and drops dead sockets.

---

## Client API layer (`shared/src/api`)

```ts
interface GameAPI {
  readonly kind: "mock" | "official";
  readonly status: ConnectionStatus;
  readonly session: SessionInfo | null;
  readonly clockOffsetMs: number;

  connect(): Promise<void>;
  joinGame(pin: string, username: string): Promise<JoinGameResponse>;
  getGameState(): Promise<GameState>;
  getQuestion(): Promise<QuestionView | null>;
  submitAnswer(answerId: AnswerId): Promise<AnswerResult>;
  disconnect(): Promise<void>;

  reconnect(): Promise<void>;        // re-open realtime channel (Auto Reconnect)
  getResults(): Promise<GameResults>;
  on(event: "connection" | "event" | "network", listener): () => void;
}
```

* `MockGameAPI` — talks to this Mock Server (REST + WebSocket). Emits a `NetworkEntry` for every
  request/response/frame, with latency.
* `OfficialGameAPI` — placeholder. Every call throws `NotImplementedError` until implemented.
* `createGameAPI(kind, config)` — the factory used by the UI; switching the *API implementation*
  setting swaps the backend without touching any component.

### Adding a real provider

1. Make sure you have **explicit authorization** and the provider offers a **public, documented** API.
2. Implement each method of `OfficialGameAPI` against the documented endpoints and translate
   responses to the shared types (`GameState`, `QuestionView`, `AnswerResult`).
3. Emit `connection`, `event` (map provider events to `ServerEvent` types) and `network` events.
4. Keep `assertAllowedUrl()` in the constructor. Kahoot hosts are blocked on purpose: Kahoot has no
   public player API and this project does not use private endpoints.
