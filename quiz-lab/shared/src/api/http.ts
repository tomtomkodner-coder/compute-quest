import { TypedEmitter } from "../emitter";
import { assertAllowedUrl } from "../security";
import type { ApiErrorBody } from "../types";
import type { NetworkEntry } from "./GameAPI";

let counter = 0;
export const nextId = (prefix = "n") => `${prefix}${Date.now().toString(36)}${(counter++).toString(36)}`;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function currentOrigin(): string | undefined {
  const loc = (globalThis as { location?: Location }).location;
  return loc?.origin && loc.origin !== "null" ? loc.origin : undefined;
}

/** Resolve a possibly-relative http(s) base URL. */
export function resolveHttpUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url.replace(/\/+$/, "");
  const origin = currentOrigin() ?? "http://localhost:4000";
  return new URL(url || "/", origin).toString().replace(/\/+$/, "");
}

/** Resolve a possibly-relative ws(s) URL. */
export function resolveWsUrl(url: string): string {
  if (/^wss?:\/\//i.test(url)) return url;
  if (/^https?:\/\//i.test(url)) return url.replace(/^http/i, "ws");
  const origin = currentOrigin() ?? "http://localhost:4000";
  return new URL(url || "/ws", origin).toString().replace(/^http/i, "ws");
}

export interface HttpClientEvents extends Record<string, unknown> {
  network: NetworkEntry;
}

/** fetch wrapper that measures latency and reports every request/response. */
export class HttpClient extends TypedEmitter<HttpClientEvents> {
  private readonly fetchImpl: typeof fetch;

  constructor(
    private baseUrl: string,
    opts: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
  ) {
    super();
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.timeoutMs = opts.timeoutMs ?? 8000;
    assertAllowedUrl(resolveHttpUrl(baseUrl));
  }

  private timeoutMs: number;

  get base(): string {
    return resolveHttpUrl(this.baseUrl);
  }

  async request<T>(
    method: "GET" | "POST",
    path: string,
    opts: { body?: unknown; query?: Record<string, string | undefined>; headers?: Record<string, string> } = {},
  ): Promise<T> {
    const url = new URL(this.base + path);
    for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined) url.searchParams.set(k, v);
    const entry: NetworkEntry = {
      id: nextId("h"),
      kind: "http",
      direction: "out",
      method,
      url: url.toString(),
      startedAt: Date.now(),
      requestBody: opts.body,
    };
    const t0 = now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await this.fetchImpl(url.toString(), {
        method,
        headers: {
          ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(opts.headers ?? {}),
        },
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
      });
      const text = await res.text();
      let data: unknown = undefined;
      try {
        data = text ? JSON.parse(text) : undefined;
      } catch {
        data = text;
      }
      entry.status = res.status;
      entry.ok = res.ok;
      entry.responseBody = data;
      entry.latencyMs = round(now() - t0);
      entry.finishedAt = Date.now();
      this.emit("network", entry);
      if (!res.ok) {
        const body = (data ?? {}) as Partial<ApiErrorBody>;
        throw new ApiError(body.error ?? `HTTP ${res.status}`, res.status, body.code ?? "http_error", body.details);
      }
      return data as T;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      const aborted = (err as Error)?.name === "AbortError";
      entry.error = aborted ? `timeout after ${this.timeoutMs}ms` : String((err as Error)?.message ?? err);
      entry.latencyMs = round(now() - t0);
      entry.finishedAt = Date.now();
      this.emit("network", entry);
      throw new ApiError(entry.error, 0, aborted ? "timeout" : "network_error");
    } finally {
      clearTimeout(timer);
    }
  }
}

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
const round = (n: number) => Math.round(n * 100) / 100;
