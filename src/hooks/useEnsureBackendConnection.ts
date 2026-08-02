import { useEffect, useRef } from "react";
import { useTursorAppConfig } from "../context/useTursorAppConfig";
import { useTursorWebSocket } from "../context/useTursorWebSocket";
import { getVsCodeApi } from "../vscodeApi";

/**
 * Keeps the Run page connected: syncs extension-host socket state on mount,
 * then connects when we know the backend origin but the webview status is stale.
 */
export function useEnsureBackendConnection(): void {
  const { backendOrigin } = useTursorAppConfig();
  const { status, connect } = useTursorWebSocket();
  const generation = useRef(0);

  useEffect(() => {
    const vscode = getVsCodeApi();
    vscode?.postMessage({ type: "tursorSocket", action: "sync" });
  }, []);

  useEffect(() => {
    if (!backendOrigin) return;
    if (status === "connected" || status === "connecting") return;

    const gen = ++generation.current;
    getVsCodeApi()?.postMessage({ type: "tursorSocket", action: "sync" });

    const timer = window.setTimeout(() => {
      if (gen !== generation.current) return;
      connect(backendOrigin);
    }, 150);

    return () => {
      generation.current += 1;
      window.clearTimeout(timer);
    };
  }, [backendOrigin, status, connect]);
}
