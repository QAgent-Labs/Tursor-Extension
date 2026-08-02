import { useCallback, useEffect, useState } from "react";
import { useTursorAppConfig } from "../context/useTursorAppConfig";
import { useTursorWebSocket } from "../context/useTursorWebSocket";
import {
  buildSessionConfig,
  startCdpMessage,
} from "../workspaceInit";
import {
  parseContextError,
  parseContextReady,
  parseScreenshotUrl,
  type ContextPanelPhase,
} from "../types/runChat";

function isTursorAiDisabledError(err: { code: string; message: string }): boolean {
  return (
    err.code === "tursor_ai_validate" ||
    /tursor-ai not reachable/i.test(err.message)
  );
}

type RunFlowOptions = {
  onScreenshot: (url: string) => void;
  onRunStart?: () => void;
  onRunComplete?: (status: "success" | "fail") => void;
};

export function useRunContextFlow({
  onScreenshot,
  onRunStart,
  onRunComplete,
}: RunFlowOptions) {
  const { config, resolvedWorkspacePath } = useTursorAppConfig();
  const { status, send, subscribe } = useTursorWebSocket();
  const [phase, setPhase] = useState<ContextPanelPhase>("ready");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const startCdpRun = useCallback(() => {
    if (status !== "connected") {
      setErrorMessage("Not connected to the backend. Go to Connect first.");
      setPhase("error");
      return false;
    }

    const frontendPort = config.frontendPort;
    if (!frontendPort || frontendPort <= 0) {
      setErrorMessage(
        "Test frontend port is not set. Go back to Connect and enter your dev server port.",
      );
      setPhase("error");
      return false;
    }

    onRunStart?.();
    send(
      buildSessionConfig({
        workspacePath: resolvedWorkspacePath,
        frontendPort,
      }),
    );
    send(startCdpMessage());
    setErrorMessage(null);
    setPhase("ready");
    setHasStarted(true);
    setIsRunning(true);
    return true;
  }, [status, send, resolvedWorkspacePath, config.frontendPort, onRunStart]);

  useEffect(() => {
    return subscribe((data) => {
      const err = parseContextError(data);
      if (err) {
        if (isTursorAiDisabledError(err)) {
          return;
        }
        setErrorMessage(err.message);
        setPhase(
          err.code === "missing_tursor_config" ? "missing_config" : "error",
        );
        setIsRunning(false);
        onRunComplete?.("fail");
        return;
      }
      if (parseContextReady(data)) {
        setPhase("ready");
        setErrorMessage(null);
        return;
      }
      const shot = parseScreenshotUrl(data);
      if (shot) {
        onScreenshot(shot);
      }
      if (
        typeof data === "object" &&
        data !== null &&
        (data as { type?: string }).type === "complete"
      ) {
        setIsRunning(false);
        const status = (data as { status?: string }).status;
        onRunComplete?.(status === "success" ? "success" : "fail");
      }
    });
  }, [subscribe, onScreenshot, onRunComplete]);

  const retryRun = useCallback(() => {
    startCdpRun();
  }, [startCdpRun]);

  const clearRunningFlag = useCallback(() => {
    setIsRunning(false);
  }, []);

  return {
    phase,
    errorMessage,
    hasStarted,
    isRunning,
    startRun: startCdpRun,
    retryRun,
    clearRunningFlag,
  };
}
