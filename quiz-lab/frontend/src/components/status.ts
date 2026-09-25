import type { AnswerStatus } from "@quizlab/plugins";
import type { ConnectionStatus } from "@quizlab/shared";
import type { TKey } from "../i18n";

export const CONNECTION_META: Record<ConnectionStatus, { dot: string; emoji: string; key: TKey }> = {
  idle: { dot: "", emoji: "⚪", key: "statusIdle" },
  connecting: { dot: "yellow", emoji: "🟡", key: "statusConnecting" },
  connected: { dot: "green", emoji: "🟢", key: "statusConnected" },
  reconnecting: { dot: "yellow", emoji: "🟡", key: "statusReconnecting" },
  disconnected: { dot: "red", emoji: "🔴", key: "statusDisconnected" },
  error: { dot: "red", emoji: "🔴", key: "statusError" },
};

export const ANSWER_STATUS_META: Record<AnswerStatus, { key: TKey; tone: string }> = {
  idle: { key: "statusIdleAns", tone: "" },
  waiting: { key: "statusWaiting", tone: "blue" },
  scheduled: { key: "statusScheduled", tone: "accent" },
  sending: { key: "statusSending", tone: "yellow" },
  sent: { key: "statusSent", tone: "green" },
  late: { key: "statusLate", tone: "red" },
  missed: { key: "statusMissed", tone: "red" },
  skipped: { key: "statusSkipped", tone: "yellow" },
  error: { key: "statusErr", tone: "red" },
};
