import type { Webview } from "vscode";
import { io, type Socket } from "socket.io-client";

function isAllowedSocketUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return false;
    }
    const h = u.hostname;
    return h === "127.0.0.1" || h === "localhost";
  } catch {
    return false;
  }
}

function post(
  webview: Webview,
  body: Record<string, unknown>,
): void {
  void webview.postMessage({ type: "tursorSocket", ...body });
}

/**
 * Runs Socket.IO in the extension host (Node) so the webview avoids XHR/CORS
 * to vscode-resource / file origins.
 */
export function createTursorSocketHostBridge(webview: Webview): {
  dispose: () => void;
  /** Returns true if the message was consumed (tursorSocket). */
  handleWebviewMessage(message: unknown): boolean;
} {
  let socket: Socket | null = null;

  const disposeSocket = () => {
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }
  };

  const dispose = () => {
    disposeSocket();
  };

  const handleWebviewMessage = (message: unknown): boolean => {
    if (typeof message !== "object" || message === null) {
      return false;
    }
    const m = message as Record<string, unknown>;
    if (m.type !== "tursorSocket" || typeof m.action !== "string") {
      return false;
    }

    if (m.action === "connect") {
      const url = m.url;
      const path = m.path;
      if (typeof url !== "string" || typeof path !== "string") {
        post(webview, {
          event: "connect_error",
          message: "Invalid connect payload (url/path).",
        });
        return true;
      }
      if (!isAllowedSocketUrl(url)) {
        post(webview, {
          event: "connect_error",
          message: "Only http(s)://127.0.0.1 or localhost are allowed.",
        });
        return true;
      }

      disposeSocket();

      const transports = Array.isArray(m.transports)
        ? (m.transports as unknown[]).filter((t): t is string => typeof t === "string")
        : [];
      const t: string[] =
        transports.length > 0 ? [...transports] : ["polling", "websocket"];

      socket = io(url, {
        path,
        transports: t,
      });

      socket.on("connect", () => {
        post(webview, {
          event: "connected",
          socketId: socket?.id ?? null,
          transport: socket?.io?.engine?.transport?.name ?? null,
        });
      });

      socket.on("disconnect", (reason: string) => {
        post(webview, { event: "disconnected", reason: String(reason) });
      });

      socket.on("connect_error", (err: unknown) => {
        const messageText =
          err instanceof Error ? err.message : String(err);
        const detail = err instanceof Error ? err.stack : undefined;
        post(webview, {
          event: "connect_error",
          message: messageText,
          detail,
        });
      });

      socket.on("error", (err: unknown) => {
        const messageText =
          err instanceof Error ? err.message : String(err);
        post(webview, { event: "socket_error", message: messageText });
      });

      socket.on("message", (payload: unknown) => {
        post(webview, { event: "serverMessage", payload });
      });

      return true;
    }

    if (m.action === "emit") {
      const event = m.event;
      if (typeof event !== "string") {
        return true;
      }
      if (!socket?.connected) {
        return true;
      }
      socket.emit(event, m.payload);
      return true;
    }

    if (m.action === "disconnect") {
      disposeSocket();
      post(webview, { event: "disconnected", reason: "client" });
      return true;
    }

    return true;
  };

  return { dispose, handleWebviewMessage };
}
