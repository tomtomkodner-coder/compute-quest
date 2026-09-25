import type { LabState } from "@quizlab/plugins";
import { useNow } from "../state/lab";

/** Remaining ms of the current question, corrected for server/client clock offset. */
export function useRemaining(state: LabState): { remainingMs: number; fraction: number; active: boolean } {
  const q = state.question;
  const active = !!q && state.game?.phase === "question";
  const now = useNow(active, 50);
  if (!q) return { remainingMs: 0, fraction: 0, active: false };
  if (!active) return { remainingMs: 0, fraction: 0, active };
  const remainingMs = Math.max(0, q.endsAt - (now + state.clockOffsetMs));
  const total = Math.max(1, q.endsAt - q.startedAt);
  return { remainingMs, fraction: Math.min(1, remainingMs / total), active };
}
