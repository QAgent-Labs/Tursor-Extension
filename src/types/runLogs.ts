export type RunLogCategory =
  | "connection"
  | "context"
  | "cdp"
  | "step"
  | "screenshot"
  | "chat"
  | "system"
  | "error";

export type RunLogLevel = "debug" | "info" | "warn" | "error" | "success";

export type RunLogEntry = {
  id: string;
  category: RunLogCategory;
  level: RunLogLevel;
  message: string;
  timestamp: number;
  stepId?: string;
  meta?: Record<string, unknown>;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

const LOG_CATEGORIES = new Set<RunLogCategory>([
  "connection",
  "context",
  "cdp",
  "step",
  "screenshot",
  "chat",
  "system",
  "error",
]);

const LOG_LEVELS = new Set<RunLogLevel>([
  "debug",
  "info",
  "warn",
  "error",
  "success",
]);

let logIdCounter = 0;

function nextLogId(): string {
  logIdCounter += 1;
  return `log-${Date.now()}-${logIdCounter}`;
}

function parseTimestamp(raw: unknown): number {
  if (typeof raw === "string") {
    const ms = Date.parse(raw);
    if (Number.isFinite(ms)) return ms;
  }
  return Date.now();
}

export function parseRunLogEvent(data: unknown): RunLogEntry | null {
  if (!isRecord(data) || data.type !== "log") return null;
  if (typeof data.message !== "string") return null;

  const categoryRaw = data.category;
  const category =
    typeof categoryRaw === "string" && LOG_CATEGORIES.has(categoryRaw as RunLogCategory)
      ? (categoryRaw as RunLogCategory)
      : "system";

  const levelRaw = data.level;
  const level =
    typeof levelRaw === "string" && LOG_LEVELS.has(levelRaw as RunLogLevel)
      ? (levelRaw as RunLogLevel)
      : "info";

  const stepId =
    typeof data.stepId === "string" && data.stepId.trim()
      ? data.stepId
      : undefined;

  const meta =
    isRecord(data.meta) && Object.keys(data.meta).length > 0
      ? (data.meta as Record<string, unknown>)
      : undefined;

  return {
    id: nextLogId(),
    category,
    level,
    message: data.message,
    timestamp: parseTimestamp(data.timestamp),
    stepId,
    meta,
  };
}
