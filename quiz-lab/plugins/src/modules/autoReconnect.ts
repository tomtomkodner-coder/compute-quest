import { backoffDelay, formatMs } from "@quizlab/shared";
import type { LabPlugin, PluginContext } from "../core/types";

interface ReconnectRuntime {
  timer: ReturnType<typeof setTimeout> | null;
  attempt: number;
  mode: "reconnect" | "rejoin";
}

/** Per-session runtime state (keyed by the plugin context, so sessions never share it). */
const runtimes = new WeakMap<PluginContext, ReconnectRuntime>();

function rt(ctx: PluginContext): ReconnectRuntime {
  let r = runtimes.get(ctx);
  if (!r) {
    r = { timer: null, attempt: 0, mode: "reconnect" };
    runtimes.set(ctx, r);
  }
  return r;
}

function reset(ctx: PluginContext): void {
  const runtime = rt(ctx);
  if (runtime.timer) clearTimeout(runtime.timer);
  runtime.timer = null;
  runtime.attempt = 0;
  runtime.mode = "reconnect";
  ctx.setReconnectState({ attempt: 0, nextRetryAt: null, exhausted: false });
}

function schedule(ctx: PluginContext, mode: "reconnect" | "rejoin"): void {
  const runtime = rt(ctx);
  if (runtime.timer) return; // an attempt is already pending
  const max = ctx.getSettings().maxReconnectAttempts;
  if (runtime.attempt >= max) {
    ctx.setReconnectState({ nextRetryAt: null, exhausted: true });
    ctx.log("error", `Giving up after ${runtime.attempt} attempts (limit ${max}). Press Connect to try again.`);
    return;
  }
  runtime.attempt += 1;
  runtime.mode = mode;
  const delay = backoffDelay(runtime.attempt);
  const attempt = runtime.attempt;
  ctx.setReconnectState({ attempt, max, nextRetryAt: Date.now() + delay, exhausted: false });
  ctx.log("warn", `${mode === "rejoin" ? "Re-join" : "Reconnect"} attempt ${attempt}/${max} in ${formatMs(delay)}`);
  runtime.timer = setTimeout(async () => {
    runtime.timer = null;
    ctx.setReconnectState({ nextRetryAt: null });
    try {
      if (mode === "rejoin") await ctx.rejoin();
      else await ctx.reconnect();
      // Success is confirmed by the server's `hello` event (see onServerEvent).
    } catch (err) {
      ctx.log("warn", `Attempt ${attempt} failed: ${(err as Error)?.message ?? err}`);
      const fatalJoin = (err as { status?: number })?.status === 404;
      if (fatalJoin) {
        ctx.setReconnectState({ exhausted: true });
        ctx.log("error", "The game no longer exists — stopping.");
        return;
      }
      schedule(ctx, mode);
    }
  }, delay);
}

/**
 * AUTO RECONNECT — when the connection drops unexpectedly, retry with exponential backoff.
 * Attempts are capped (settings.maxReconnectAttempts) to avoid an endless loop. If the server
 * no longer knows the session (e.g. it restarted), it re-joins the same PIN with the same username.
 */
export const autoReconnectPlugin: LabPlugin = {
  id: "auto-reconnect",
  name: "Auto Reconnect",
  description: "Retries dropped connections with exponential backoff and a hard attempt limit.",
  order: 6,
  category: "connection",

  onEnable(ctx) {
    reset(ctx);
  },

  onDisable(ctx) {
    reset(ctx);
  },

  onConnectionChange(ctx, change) {
    if (!change.unexpected) {
      // A user-initiated disconnect cancels any pending attempt.
      if (change.status === "disconnected") reset(ctx);
      return;
    }
    if (!ctx.getState().session && !ctx.api()?.session) return;
    schedule(ctx, change.fatal ? "rejoin" : rt(ctx).mode);
  },

  onServerEvent(ctx, event) {
    const runtime = rt(ctx);
    if (event.type === "hello" && (runtime.attempt > 0 || runtime.timer)) {
      ctx.log("success", `Reconnected after ${runtime.attempt} attempt(s)`);
      reset(ctx);
    }
  },
};
