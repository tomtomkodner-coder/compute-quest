import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "@quizlab/plugins";
import { clearSettings, envDefaults, loadSettings, saveSettings, SETTINGS_KEY } from "../src/state/settingsStorage";

class MemoryStorage {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}

describe("settings persistence (localStorage)", () => {
  it("round-trips settings", () => {
    const storage = new MemoryStorage();
    const defaults = envDefaults({});
    const s = { ...defaults, username: "neo", language: "en" as const, delay: { ...defaults.delay, fixedMs: 500 } };
    saveSettings(storage, s);
    expect(storage.data.has(SETTINGS_KEY)).toBe(true);
    expect(loadSettings(storage, defaults)).toEqual(s);
    clearSettings(storage);
    expect(loadSettings(storage, defaults)).toEqual(defaults);
  });

  it("falls back to defaults on corrupt data", () => {
    const storage = new MemoryStorage();
    storage.setItem(SETTINGS_KEY, "{not json");
    expect(loadSettings(storage, DEFAULT_SETTINGS)).toEqual(DEFAULT_SETTINGS);
  });

  it("applies VITE_* env defaults", () => {
    const d = envDefaults({ VITE_API_URL: "http://localhost:4000", VITE_WS_URL: "ws://localhost:4000/ws", VITE_DEMO_PIN: "654321" });
    expect(d).toMatchObject({ apiUrl: "http://localhost:4000", wsUrl: "ws://localhost:4000/ws", pin: "654321" });
  });
});
