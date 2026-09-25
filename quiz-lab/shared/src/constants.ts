export const DEFAULT_TIME_LIMIT_MS = 20_000;
export const DEFAULT_REVEAL_MS = 4_000;
export const MAX_POINTS = 1000;
export const USERNAME_MIN = 1;
export const USERNAME_MAX = 24;
export const PIN_LENGTH = 6;
export const ANSWER_IDS = ["A", "B", "C", "D"] as const;

export const DELAY_PRESETS_MS = [0, 100, 250, 500, 1000, 2000] as const;

export const DEFAULT_MAX_RECONNECT_ATTEMPTS = 5;
export const RECONNECT_BASE_MS = 500;
export const RECONNECT_MAX_MS = 8_000;
