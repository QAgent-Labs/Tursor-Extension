import { useCallback, useEffect, useState } from "react";
import { getVsCodeApi } from "../vscodeApi";
import { isBrowserMockRuntime } from "../appRuntime";
import { DEFAULT_BACKEND_PORT } from "../constants/tursorConnection";

export type TursorSetupPhase = "needs_install" | "needs_start" | "ready";

export type TursorCliCheckState = {
  phase: TursorSetupPhase;
  port: number | null;
};

async function probeHealth(port: number): Promise<TursorCliCheckState | null> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 2_500);
  try {
    const res = await fetch(`http://127.0.0.1:${port}/health`, {
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { port?: number };
    const resolved =
      typeof data.port === "number" && data.port > 0 ? data.port : port;
    return { phase: "ready", port: resolved };
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

function checkViaExtensionHost(): Promise<TursorCliCheckState> {
  return new Promise((resolve) => {
    const vscode = getVsCodeApi();
    if (!vscode) {
      resolve({ phase: "needs_install", port: null });
      return;
    }

    let settled = false;
    const finish = (state: TursorCliCheckState) => {
      if (settled) return;
      settled = true;
      resolve(state);
    };

    void probeHealth(DEFAULT_BACKEND_PORT).then((health) => {
      if (health) finish(health);
    });

    const requestId = `cli-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const onMsg = (event: MessageEvent) => {
      const data = event.data as {
        type?: string;
        requestId?: string;
        phase?: TursorSetupPhase;
        port?: number | null;
      };
      if (
        data?.type !== "tursorCliCheckResult" ||
        data.requestId !== requestId
      ) {
        return;
      }
      window.removeEventListener("message", onMsg);
      const phase = data.phase;
      if (
        phase === "needs_install" ||
        phase === "needs_start" ||
        phase === "ready"
      ) {
        finish({
          phase,
          port:
            typeof data.port === "number" && data.port > 0 ? data.port : null,
        });
        return;
      }
      finish({ phase: "needs_install", port: null });
    };

    window.addEventListener("message", onMsg);
    vscode.postMessage({ command: "checkTursorCli", requestId });

    window.setTimeout(() => {
      window.removeEventListener("message", onMsg);
      void probeHealth(DEFAULT_BACKEND_PORT).then((health) => {
        finish(health ?? { phase: "needs_install", port: null });
      });
    }, 4_000);
  });
}

async function resolveCliState(): Promise<TursorCliCheckState> {
  if (isBrowserMockRuntime()) {
    return { phase: "needs_install", port: null };
  }
  return checkViaExtensionHost();
}

/** Runs health check + extension host CLI status when needed. */
export function useTursorCliCheck() {
  const [state, setState] = useState<TursorCliCheckState>({
    phase: "needs_install",
    port: null,
  });
  const [checking, setChecking] = useState(true);

  const applyState = useCallback((next: TursorCliCheckState) => {
    setState(next);
    setChecking(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void resolveCliState().then((next) => {
      if (cancelled) return;
      applyState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [applyState]);

  const refresh = useCallback(async () => {
    setChecking(true);
    const next = await resolveCliState();
    applyState(next);
    return next;
  }, [applyState]);

  return {
    phase: state.phase,
    port: state.port,
    checking,
    refresh,
  };
}
