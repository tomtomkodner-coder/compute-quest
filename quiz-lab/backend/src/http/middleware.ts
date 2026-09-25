import type { NextFunction, Request, Response } from "express";
import type { ApiErrorBody } from "@quizlab/shared";
import { GameError } from "../game/errors";

export function cors(origins: string[]) {
  const allowAll = origins.includes("*");
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (origin && (allowAll || origins.includes(origin))) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Player-Token, X-Host-Token");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    }
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  };
}

/** Simple fixed-window rate limiter per IP. The lab's client never tries to get around it. */
export function rateLimit(perMinute: number) {
  const hits = new Map<string, { count: number; windowStart: number }>();
  const timer = setInterval(() => {
    const cutoff = Date.now() - 60_000;
    for (const [ip, h] of hits) if (h.windowStart < cutoff) hits.delete(ip);
  }, 60_000);
  timer.unref?.();
  return (req: Request, res: Response, next: NextFunction) => {
    if (perMinute <= 0) return next();
    const ip = req.ip ?? "unknown";
    const now = Date.now();
    let h = hits.get(ip);
    if (!h || now - h.windowStart >= 60_000) {
      h = { count: 0, windowStart: now };
      hits.set(ip, h);
    }
    h.count++;
    res.setHeader("X-RateLimit-Limit", String(perMinute));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, perMinute - h.count)));
    if (h.count > perMinute) {
      const retry = Math.ceil((h.windowStart + 60_000 - now) / 1000);
      res.setHeader("Retry-After", String(retry));
      const body: ApiErrorBody = { error: "Too many requests", code: "rate_limited", details: { retryAfterSec: retry } };
      res.status(429).json(body);
      return;
    }
    next();
  };
}

export function requestLogger(enabled: boolean) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!enabled) return next();
    const start = process.hrtime.bigint();
    res.on("finish", () => {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      console.log(`${req.method.padEnd(4)} ${res.statusCode} ${req.originalUrl} ${ms.toFixed(1)}ms`);
    });
    next();
  };
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof GameError) {
    const body: ApiErrorBody = { error: err.message, code: err.code, details: err.details };
    res.status(err.status).json(body);
    return;
  }
  const e = err as { type?: string; status?: number; message?: string };
  if (e?.type === "entity.parse.failed") {
    res.status(400).json({ error: "Malformed JSON body", code: "bad_json" } satisfies ApiErrorBody);
    return;
  }
  if (e?.status === 413) {
    res.status(413).json({ error: "Body too large", code: "payload_too_large" } satisfies ApiErrorBody);
    return;
  }
  console.error("[server] unhandled error", err);
  res.status(500).json({ error: "Internal server error", code: "internal" } satisfies ApiErrorBody);
}
