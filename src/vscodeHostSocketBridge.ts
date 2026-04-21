/**
 * VS Code posts webview messages before child useEffects run; we tap `window`
 * as soon as `acquireVsCodeApi` succeeds and route events via a handler ref
 * updated every Provider render.
 */

export type TursorSocketHostToWebview =
  | {
      type: "tursorSocket";
      event: "connected";
      socketId?: string | null;
      transport?: string | null;
    }
  | {
      type: "tursorSocket";
      event: "connect_error";
      message: string;
      detail?: string;
    }
  | { type: "tursorSocket"; event: "disconnected"; reason?: string }
  | {
      type: "tursorSocket";
      event: "socket_error";
      message: string;
    }
  | { type: "tursorSocket"; event: "serverMessage"; payload: unknown };

export function isTursorSocketHostMessage(
  data: unknown,
): data is TursorSocketHostToWebview {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return d.type === "tursorSocket" && typeof d.event === "string";
}

let tapAttached = false;
let handler: ((msg: TursorSocketHostToWebview) => void) | null = null;

export function setHostSocketBridgeHandler(
  h: ((msg: TursorSocketHostToWebview) => void) | null,
): void {
  handler = h;
}

/** Call once when the webview API exists (before any child connect() effects). */
export function ensureHostSocketBridgeTap(): void {
  if (typeof window === "undefined" || tapAttached) return;
  tapAttached = true;
  window.addEventListener("message", (event: MessageEvent) => {
    const data = event.data;
    if (!isTursorSocketHostMessage(data)) return;
    handler?.(data);
  });
}
