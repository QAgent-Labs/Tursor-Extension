export type RunSessionStatus = "running" | "success" | "fail";

export type RunSession = {
  id: string;
  startedAt: number;
  screenshots: string[];
  status: RunSessionStatus;
};

export function createRunSessionId(): string {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function shortSessionId(id: string): string {
  const parts = id.split("-");
  return parts[parts.length - 1] ?? id.slice(0, 8);
}
