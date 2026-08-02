import { useCallback, useState } from "react";
import type { TursorAppConfig } from "../types/appConfig";

type DraftOverride = {
  workspacePath?: string | null;
  backendPort?: string;
  frontendPort?: string;
};

/** Local edits layered on context; no sync effects required. */
export function useTursorConfigDraft(
  resolvedWorkspacePath: string | null,
  config: TursorAppConfig,
) {
  const [override, setOverride] = useState<DraftOverride | null>(null);

  const backendPortFromConfig =
    config.backendPort != null ? String(config.backendPort) : "";
  const frontendPortFromConfig =
    config.frontendPort != null ? String(config.frontendPort) : "";

  const workspacePath = override?.workspacePath ?? resolvedWorkspacePath;
  const backendPort = override?.backendPort ?? backendPortFromConfig;
  const frontendPort = override?.frontendPort ?? frontendPortFromConfig;

  const setWorkspacePath = useCallback((path: string) => {
    setOverride((prev) => ({
      ...prev,
      workspacePath: path,
    }));
  }, []);

  const setBackendPort = useCallback((port: string) => {
    setOverride((prev) => ({
      ...prev,
      backendPort: port,
    }));
  }, []);

  const setFrontendPort = useCallback((port: string) => {
    setOverride((prev) => ({
      ...prev,
      frontendPort: port,
    }));
  }, []);

  const resetDraft = useCallback(() => {
    setOverride(null);
  }, []);

  return {
    workspacePath,
    backendPort,
    frontendPort,
    setWorkspacePath,
    setBackendPort,
    setFrontendPort,
    resetDraft,
  };
}
