import { createContext } from "react";
import type { TursorAppConfig, TursorBackendStatus } from "../types/appConfig";

export type TursorAppConfigContextValue = {
  config: TursorAppConfig;
  editorWorkspacePath: string | null;
  resolvedWorkspacePath: string | null;
  backendStatus: TursorBackendStatus | null;
  setConfig: (patch: Partial<TursorAppConfig>) => void;
  replaceConfig: (next: TursorAppConfig) => void;
  setBackendStatus: (status: TursorBackendStatus | null) => void;
  backendOrigin: string | null;
};

export const TursorAppConfigContext =
  createContext<TursorAppConfigContextValue | null>(null);
