import type { LabPlugin } from "../core/types";

/** NETWORK DEBUGGER — records HTTP requests/responses and WebSocket frames with latency. */
export const networkDebuggerPlugin: LabPlugin = {
  id: "network-debugger",
  name: "Network Debugger",
  description: "Records API requests, responses, WebSocket frames and latency for the Developer panel.",
  order: 70,
  category: "debug",

  onNetwork(ctx, entry) {
    ctx.recordNetwork(entry);
    if (entry.kind === "http" && (entry.error || (entry.status ?? 0) >= 400)) {
      ctx.log("warn", `${entry.method} ${new URL(entry.url).pathname} → ${entry.status ?? "ERR"} ${entry.error ?? ""} (${entry.latencyMs}ms)`);
    }
  },
};
