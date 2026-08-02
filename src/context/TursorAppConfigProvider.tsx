import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  defaultAppConfig,
  resolveWorkspacePath,
  type TursorAppConfig,
  type TursorBackendStatus,
} from "../types/appConfig";
import { getVsCodeApi } from "../vscodeApi";
import {
  TursorAppConfigContext,
  type TursorAppConfigContextValue,
} from "./tursorAppConfigContext";

const STORAGE_KEY = "tursorAppConfig";

function loadInitialConfig(): TursorAppConfig {
  const base = defaultAppConfig();
  const vscode = getVsCodeApi();
  if (vscode) {
    const saved = vscode.getState() as {
      [STORAGE_KEY]?: TursorAppConfig;
    } | null;
    const fromState = saved?.[STORAGE_KEY];
    if (fromState && typeof fromState === "object") {
      return {
        workspacePath:
          typeof fromState.workspacePath === "string"
            ? fromState.workspacePath
            : base.workspacePath,
        backendPort:
          typeof fromState.backendPort === "number"
            ? fromState.backendPort
            : base.backendPort,
        frontendPort:
          typeof fromState.frontendPort === "number"
            ? fromState.frontendPort
            : base.frontendPort,
      };
    }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<TursorAppConfig>;
      return {
        workspacePath:
          typeof parsed.workspacePath === "string"
            ? parsed.workspacePath
            : base.workspacePath,
        backendPort:
          typeof parsed.backendPort === "number"
            ? parsed.backendPort
            : base.backendPort,
        frontendPort:
          typeof parsed.frontendPort === "number"
            ? parsed.frontendPort
            : base.frontendPort,
      };
    }
  } catch {
    /* ignore */
  }

  return base;
}

function persistConfig(config: TursorAppConfig): void {
  const vscode = getVsCodeApi();
  if (vscode) {
    const prev = (vscode.getState() as Record<string, unknown> | null) ?? {};
    vscode.setState({ ...prev, [STORAGE_KEY]: config });
  } else {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      /* ignore */
    }
  }
}

export function TursorAppConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<TursorAppConfig>(loadInitialConfig);
  const [editorWorkspacePath, setEditorWorkspacePath] = useState<string | null>(
    null,
  );
  const [backendStatus, setBackendStatus] =
    useState<TursorBackendStatus | null>(null);

  useEffect(() => {
    const vscode = getVsCodeApi();
    if (!vscode) return;

    const onMsg = (event: MessageEvent) => {
      const data = event.data as {
        type?: string;
        workspacePath?: string | null;
      };
      if (data?.type !== "tursorSeedWorkspace" || !data.workspacePath) {
        return;
      }
      const path = data.workspacePath.trim();
      if (!path) return;

      setEditorWorkspacePath(path);
    };
    window.addEventListener("message", onMsg);
    vscode.postMessage({ command: "requestDefaultWorkspace" });
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const resolvedWorkspacePath = useMemo(
    () => resolveWorkspacePath(config, editorWorkspacePath),
    [config, editorWorkspacePath],
  );

  const replaceConfig = useCallback((next: TursorAppConfig) => {
    setConfigState(next);
    persistConfig(next);
  }, []);

  const setConfig = useCallback((patch: Partial<TursorAppConfig>) => {
    setConfigState((prev) => {
      const next = { ...prev, ...patch };
      persistConfig(next);
      return next;
    });
  }, []);

  const backendOrigin = useMemo(() => {
    const port = backendStatus?.port ?? config.backendPort;
    if (!port || port <= 0) return null;
    return `http://127.0.0.1:${port}`;
  }, [backendStatus?.port, config.backendPort]);

  const value = useMemo<TursorAppConfigContextValue>(
    () => ({
      config,
      editorWorkspacePath,
      resolvedWorkspacePath,
      backendStatus,
      setConfig,
      replaceConfig,
      setBackendStatus,
      backendOrigin,
    }),
    [
      config,
      editorWorkspacePath,
      resolvedWorkspacePath,
      backendStatus,
      setConfig,
      replaceConfig,
      backendOrigin,
    ],
  );

  return (
    <TursorAppConfigContext.Provider value={value}>
      {children}
    </TursorAppConfigContext.Provider>
  );
}
