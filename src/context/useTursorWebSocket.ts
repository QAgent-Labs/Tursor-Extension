import { useContext } from "react";
import {
  TursorWebSocketContext,
  type TursorWebSocketContextValue,
} from "./tursorWebSocketContext";

export function useTursorWebSocket(): TursorWebSocketContextValue {
  const ctx = useContext(TursorWebSocketContext);
  if (!ctx) {
    throw new Error(
      "useTursorWebSocket must be used within TursorWebSocketProvider",
    );
  }
  return ctx;
}
