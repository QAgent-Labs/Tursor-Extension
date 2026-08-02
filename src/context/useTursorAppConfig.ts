import { useContext } from "react";
import { TursorAppConfigContext } from "./tursorAppConfigContext";

export function useTursorAppConfig() {
  const ctx = useContext(TursorAppConfigContext);
  if (!ctx) {
    throw new Error("useTursorAppConfig must be used within TursorAppConfigProvider");
  }
  return ctx;
}
