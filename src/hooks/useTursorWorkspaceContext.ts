import { useCallback, useEffect, useState } from "react";
import { fetchCurrentContext } from "../api/tursorContext";
import type { TursorWsStatus } from "../context/tursorWebSocketContext";
import type { TursorCurrentContext } from "../types/workspaceInit";
import { useTursorAppConfig } from "../context/useTursorAppConfig";

function applyContextResult(
  result: TursorCurrentContext | null,
  setContext: (value: TursorCurrentContext | null) => void,
  setError: (value: string | null) => void,
): void {
  if (result) {
    setContext(result);
    setError(null);
    return;
  }
  setContext(null);
  setError("Could not load workspace context from the backend.");
}

/**
 * Loads `GET /context/current` on mount, when the socket connects, and via `refresh()`.
 */
export function useTursorWorkspaceContext(wsStatus: TursorWsStatus) {
  const { backendOrigin } = useTursorAppConfig();
  const [context, setContext] = useState<TursorCurrentContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await fetchCurrentContext(backendOrigin);
    applyContextResult(result, setContext, setError);
    setLoading(false);
  }, [backendOrigin]);

  useEffect(() => {
    let cancelled = false;
    void fetchCurrentContext(backendOrigin).then((result) => {
      if (cancelled) return;
      applyContextResult(result, setContext, setError);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [backendOrigin]);

  useEffect(() => {
    if (wsStatus !== "connected") return;
    let cancelled = false;
    void fetchCurrentContext(backendOrigin).then((result) => {
      if (cancelled) return;
      applyContextResult(result, setContext, setError);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [wsStatus, backendOrigin]);

  return { context, loading, error, refresh };
}
