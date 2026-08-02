import type { TursorWsStatus } from "../context/tursorWebSocketContext";

export function backendConnectionStatusLabel(status: TursorWsStatus): string {
  if (status === "connected") return "Backend connected";
  if (status === "connecting") return "Connecting…";
  return "Backend offline";
}

export function backendConnectionStatusClass(status: TursorWsStatus): string {
  if (status === "connected") return "text-emerald-400";
  if (status === "connecting") return "text-amber-400";
  return "text-slate-500";
}

export function frontendUrlFromPort(port: number | null | undefined): string | null {
  if (!port || port <= 0) return null;
  return `http://127.0.0.1:${port}`;
}
