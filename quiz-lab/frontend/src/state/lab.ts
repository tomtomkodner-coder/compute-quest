import { useEffect, useState, useSyncExternalStore } from "react";
import { BUILTIN_PLUGINS, LabSession, type LabSettings, type LabState } from "@quizlab/plugins";
import { createGameAPI, resolveHttpUrl } from "@quizlab/shared";
import { envDefaults, loadSettings, saveSettings } from "./settingsStorage";

const storage = typeof window !== "undefined" ? window.localStorage : undefined;
export const defaultSettings = envDefaults(import.meta.env as Record<string, string | undefined>);

/** The single client runtime. Components talk to it — never to the GameAPI directly. */
export const lab = new LabSession({
  settings: loadSettings(storage, defaultSettings),
  plugins: BUILTIN_PLUGINS,
  createApi: (kind, s) => createGameAPI(kind, { apiUrl: s.apiUrl, wsUrl: s.wsUrl, pingIntervalMs: 5000 }),
});

// Persist settings to localStorage whenever they change.
let lastSaved = lab.getSettings();
lab.subscribe(() => {
  const s = lab.getSettings();
  if (s !== lastSaved) {
    lastSaved = s;
    saveSettings(storage, s);
  }
});

// Leave the game when the tab closes/reloads so the username is freed immediately.
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    const api = lab.api;
    const session = api?.session;
    if (!session || api?.kind !== "mock") return;
    try {
      void fetch(`${resolveHttpUrl(lab.getSettings().apiUrl)}/game/leave`, {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json", "X-Player-Token": session.playerToken },
        body: JSON.stringify({ pin: session.pin }),
      });
    } catch {
      /* best effort */
    }
  });
}

export function useLab(): LabState {
  return useSyncExternalStore(lab.subscribe, lab.getState, lab.getState);
}

export function useSettings(): LabSettings {
  return useSyncExternalStore(lab.subscribe, lab.getSettings, lab.getSettings);
}

/** Re-render every `interval` ms while `active` (used for timers). */
export function useNow(active: boolean, interval = 50): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [active, interval]);
  return now;
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => lab.dispose());
}
