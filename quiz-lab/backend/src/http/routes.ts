import { Router, type Request } from "express";
import type { CreateGameRequest, CreateGameResponse, JoinGameResponse } from "@quizlab/shared";
import { GameError } from "../game/errors";
import type { Game } from "../game/Game";
import type { GameStore } from "../game/GameStore";

const str = (v: unknown) => (typeof v === "string" ? v : Array.isArray(v) ? String(v[0] ?? "") : v == null ? "" : String(v));

function pinFrom(req: Request): string {
  return str(req.body?.pin) || str(req.query.pin);
}

function playerToken(req: Request): string {
  return str(req.header("x-player-token")) || str(req.body?.playerToken) || str(req.query.playerToken);
}

function requireHost(req: Request, game: Game): void {
  const token = str(req.header("x-host-token")) || str(req.body?.hostToken);
  if (!token || token !== game.hostToken) {
    throw new GameError("invalid_host_token", "A valid host token is required for this action", 403);
  }
}

export function createRouter(store: GameStore): Router {
  const r = Router();

  r.get("/health", (_req, res) => {
    res.json({ ok: true, serverTime: Date.now(), games: store.list().length, version: "1.0.0" });
  });

  // ------------------------------------------------------------ public game API

  r.post("/game/create", (req, res) => {
    const body = (req.body ?? {}) as CreateGameRequest;
    const game = store.create({
      questions: body.questions,
      questionCount: body.questionCount,
      timeLimitMs: body.timeLimitMs,
      debug: body.debug,
      autoAdvance: body.autoAdvance,
      loop: body.loop,
      autoStartMs: body.autoStartMs,
      shuffle: body.shuffle,
    });
    const response: CreateGameResponse = {
      pin: game.pin,
      hostToken: game.hostToken,
      totalQuestions: game.getState().totalQuestions,
      debug: game.debug,
    };
    res.status(201).json(response);
  });

  r.post("/game/join", (req, res) => {
    const game = store.require(pinFrom(req));
    const { player, token } = game.join(str(req.body?.username));
    const response: JoinGameResponse = {
      pin: game.pin,
      playerId: player.id,
      playerToken: token,
      username: player.username,
      state: game.getState(),
    };
    res.status(201).json(response);
  });

  r.get("/game/state", (req, res) => {
    const game = store.require(pinFrom(req));
    res.json(game.getState());
  });

  r.get("/game/question", (req, res) => {
    const game = store.require(pinFrom(req));
    res.json({ question: game.questionView(), phase: game.phase, serverTime: Date.now() });
  });

  r.post("/game/answer", (req, res) => {
    const game = store.require(pinFrom(req));
    const answerId = str(req.body?.answerId);
    if (!answerId) throw new GameError("invalid_answer", "answerId is required");
    const clientSentAt = Number(req.body?.clientSentAt);
    const result = game.submitAnswer(
      playerToken(req),
      answerId,
      req.body?.questionId ? str(req.body.questionId) : undefined,
      Number.isFinite(clientSentAt) ? clientSentAt : undefined,
    );
    res.json(result);
  });

  r.get("/game/results", (req, res) => {
    const game = store.require(pinFrom(req));
    res.json(game.getResults());
  });

  r.post("/game/leave", (req, res) => {
    const game = store.require(pinFrom(req));
    game.leave(playerToken(req));
    res.json({ ok: true });
  });

  r.get("/games", (_req, res) => {
    res.json({
      games: store.list().map((g) => {
        const s = g.getState();
        return {
          pin: g.pin,
          phase: s.phase,
          players: s.players.length,
          questionIndex: s.questionIndex,
          totalQuestions: s.totalQuestions,
          debug: g.debug,
          createdAt: g.createdAt,
        };
      }),
    });
  });

  // ------------------------------------------------------------ developer / host API

  const host = (path: string, action: (game: Game, req: Request) => void) => {
    r.post(path, (req, res) => {
      const game = store.require(pinFrom(req));
      requireHost(req, game);
      action(game, req);
      res.json(game.getState());
    });
  };

  host("/dev/start", (g) => g.start());
  host("/dev/next", (g, req) => {
    const index = req.body?.index;
    if (index === undefined || index === null || index === "") g.next();
    else g.startQuestion(Number(index));
  });
  host("/dev/end-question", (g) => g.endQuestion());
  host("/dev/timer", (g, req) => g.setRemaining(Number(req.body?.remainingMs)));
  host("/dev/time-limit", (g, req) => g.setDefaultTimeLimit(Number(req.body?.timeLimitMs)));
  host("/dev/correct", (g, req) => g.setCorrectAnswer(str(req.body?.answerId)));
  host("/dev/question", (g, req) => g.addQuestion(req.body?.question ?? {}, req.body?.startNow !== false));
  host("/dev/auto-advance", (g, req) => g.setAutoAdvance(Boolean(req.body?.autoAdvance)));
  host("/dev/end-game", (g) => g.endGame());
  host("/dev/reset", (g) => g.reset());

  r.get("/dev/answer-key", (req, res) => {
    const game = store.require(pinFrom(req));
    const token = str(req.header("x-host-token")) || str(req.query.hostToken);
    if (!token || token !== game.hostToken) {
      throw new GameError("invalid_host_token", "A valid host token is required for this action", 403);
    }
    res.json(game.answerKey());
  });

  return r;
}
