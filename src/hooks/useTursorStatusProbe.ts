import { useCallback } from "react";
import type { TursorBackendStatus } from "../types/appConfig";
import { DEFAULT_BACKEND_PORT } from "../constants/tursorConnection";
import { getVsCodeApi } from "../vscodeApi";
import { useTursorAppConfig } from "../context/useTursorAppConfig";

function parseHealthPort(body: unknown, hintPort: number): number {
  if (
    typeof body === "object" &&
    body !== null &&
    typeof (body as { port?: unknown }).port === "number"
  ) {
    const p = (body as { port: number }).port;
    if (p > 0) return p;
  }
  return hintPort;
}

async function probeViaHttp(
  hintPort: number,
): Promise<TursorBackendStatus> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 2_500);
  try {
    const res = await fetch(`http://127.0.0.1:${hintPort}/health`, {
      signal: controller.signal,
    });
    if (!res.ok) {
      return { running: false, port: null };
    }
    const data = (await res.json()) as unknown;
    const port = parseHealthPort(data, hintPort);
    return { running: true, port };
  } catch {
    return { running: false, port: null };
  } finally {
    window.clearTimeout(timer);
  }
}

function probeViaExtensionHost(
  hintPort: number | null,
): Promise<TursorBackendStatus> {
  return new Promise((resolve) => {
    const hint =
      typeof hintPort === "number" && hintPort > 0
        ? hintPort
        : DEFAULT_BACKEND_PORT;

    let settled = false;
    const finish = (status: TursorBackendStatus) => {
      if (settled) return;
      settled = true;
      resolve(status);
    };

    void probeViaHttp(hint).then((httpStatus) => {
      if (httpStatus.running) {
        finish(httpStatus);
      }
    });

    const vscode = getVsCodeApi();
    if (!vscode) {
      void probeViaHttp(hint).then(finish);
      return;
    }

    const requestId = `probe-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const onMsg = (event: MessageEvent) => {
      const data = event.data as {
        type?: string;
        requestId?: string;
        status?: TursorBackendStatus;
      };
      if (
        data?.type !== "tursorStatusResult" ||
        data.requestId !== requestId ||
        !data.status
      ) {
        return;
      }
      window.removeEventListener("message", onMsg);
      finish(data.status);
    };

    window.addEventListener("message", onMsg);
    vscode.postMessage({
      command: "probeTursorStatus",
      requestId,
      hintPort: hint,
    });

    window.setTimeout(() => {
      window.removeEventListener("message", onMsg);
      void probeViaHttp(hint).then(finish);
    }, 3_500);
  });
}

/**
 * Resolves running Tursor backend via /health (fast) then extension host CLI fallback.
 */
export function useTursorStatusProbe() {
  const { config, setBackendStatus, setConfig } = useTursorAppConfig();

  const probe = useCallback(async (hintPort?: number): Promise<TursorBackendStatus> => {
    const hint =
      hintPort && hintPort > 0
        ? hintPort
        : config.backendPort && config.backendPort > 0
          ? config.backendPort
          : DEFAULT_BACKEND_PORT;
    const status = await probeViaExtensionHost(hint);
    setBackendStatus(status);
    if (status.running && status.port) {
      setConfig({ backendPort: status.port });
    }
    return status;
  }, [config.backendPort, setBackendStatus, setConfig]);

  return { probe };
}
