import { DEFAULT_SETTINGS, sanitizeSettings, type LabSettings } from "@quizlab/plugins";

export const SETTINGS_KEY = "quizlab.settings.v1";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function envDefaults(env: Record<string, string | undefined> = {}): LabSettings {
  return sanitizeSettings({
    ...DEFAULT_SETTINGS,
    apiUrl: env.VITE_API_URL || DEFAULT_SETTINGS.apiUrl,
    wsUrl: env.VITE_WS_URL || DEFAULT_SETTINGS.wsUrl,
    pin: env.VITE_DEMO_PIN || DEFAULT_SETTINGS.pin,
    hostToken: env.VITE_DEMO_HOST_TOKEN || DEFAULT_SETTINGS.hostToken,
  });
}

export function loadSettings(storage: StorageLike | undefined, defaults: LabSettings): LabSettings {
  if (!storage) return defaults;
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    if (!raw) return defaults;
    return sanitizeSettings(JSON.parse(raw), defaults);
  } catch {
    return defaults;
  }
}

export function saveSettings(storage: StorageLike | undefined, settings: LabSettings): void {
  if (!storage) return;
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* quota exceeded or storage disabled — settings just won't persist */
  }
}

export function clearSettings(storage: StorageLike | undefined): void {
  try {
    storage?.removeItem(SETTINGS_KEY);
  } catch {
    /* ignore */
  }
}
