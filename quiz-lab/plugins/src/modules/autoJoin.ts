import type { LabPlugin, PluginContext } from "../core/types";

function tryJoin(ctx: PluginContext): void {
  const { pin, username } = ctx.getSettings();
  const { connection, session } = ctx.getState();
  if (session || connection === "connecting") return;
  if (!pin || !username) {
    ctx.log("warn", "Auto Join needs a PIN and a username");
    return;
  }
  ctx.log("info", `Auto joining ${pin} as "${username}"…`);
  ctx.connectAndJoin(pin, username).catch(() => {
    /* errors are already logged by the session */
  });
}

/**
 * AUTO JOIN — joins the configured PIN with the configured username as soon as the lab starts
 * (or when the plugin is switched on while disconnected).
 */
export const autoJoinPlugin: LabPlugin = {
  id: "auto-join",
  name: "Auto Join",
  description: "Connects to the configured Game PIN with the configured username on start-up.",
  order: 5,
  category: "connection",

  onEnable(ctx) {
    // Defer so the UI can subscribe first.
    setTimeout(() => tryJoin(ctx), 0);
  },
};
