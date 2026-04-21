import { createContext } from "react";

export type TursorWsStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

/**
 * Global Socket.IO client surface (see `TursorWebSocketProvider`).
 * `send` / server → client `message` events mirror the prior WebSocket JSON shape.
 */
export type TursorWebSocketContextValue = {
  status: TursorWsStatus;
  lastError: string | null;
  /** Start or reuse the global connection (idempotent while already connected). */
  connect: () => void;
  /** Close the global connection. */
  disconnect: () => void;
  /** Emits the `message` event to the server. */
  send: (payload: unknown) => void;
  /** Subscribes to server `message` events (Socket.IO payload only, no DOM `MessageEvent`). */
  subscribe: (listener: (data: unknown) => void) => () => void;
};

export const TursorWebSocketContext =
  createContext<TursorWebSocketContextValue | null>(null);
