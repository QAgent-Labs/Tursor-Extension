export type ChatMessageRole = "user" | "assistant" | "system";

export type ChatMessage = {
  id: string;
  role: ChatMessageRole;
  text: string;
  timestamp: number;
  status?: "sending" | "sent" | "failed";
  cdpStepsId?: string | null;
};

export type UserMessageOutbound = {
  type: "user_message";
  id: string;
  text: string;
};

export type ChatInbound = {
  type: "chat";
  id: string;
  role: "assistant";
  text: string;
  replyTo?: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function parseServerChatEvent(data: unknown): ChatInbound | null {
  if (!isRecord(data) || data.type !== "chat") return null;
  if (typeof data.id !== "string" || typeof data.text !== "string") return null;
  if (data.role !== "assistant") return null;
  return {
    type: "chat",
    id: data.id,
    role: "assistant",
    text: data.text,
    replyTo: typeof data.replyTo === "string" ? data.replyTo : undefined,
  };
}

export function parseLogLine(data: unknown): string | null {
  if (!isRecord(data) || data.type !== "log") return null;
  return typeof data.message === "string" ? data.message : null;
}

export function parseStepUpdate(data: unknown): string | null {
  if (!isRecord(data) || data.type !== "step_update") return null;
  const step = typeof data.step === "string" ? data.step : "step";
  return `Running: ${step}`;
}

export function parseComplete(data: unknown): string | null {
  if (!isRecord(data) || data.type !== "complete") return null;
  const s = data.status === "success" ? "success" : "failed";
  return `Run finished (${s}).`;
}

export function parseScreenshotUrl(data: unknown): string | null {
  if (!isRecord(data) || data.type !== "screenshot") return null;
  return typeof data.url === "string" ? data.url : null;
}

export type ContextPanelPhase =
  | "building"
  | "ready"
  | "missing_config"
  | "error"
  | "idle";

export function parseContextBuilding(data: unknown): boolean {
  return isRecord(data) && data.type === "context_building";
}

export function parseContextReady(data: unknown): boolean {
  return isRecord(data) && data.type === "context_ready";
}

export function parseContextError(
  data: unknown,
): { code: string; message: string } | null {
  if (!isRecord(data) || data.type !== "context_error") return null;
  const message = typeof data.message === "string" ? data.message : "Unknown error";
  const code = typeof data.code === "string" ? data.code : "error";
  return { code, message };
}
