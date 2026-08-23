import { useCallback, useEffect, useRef, useState } from "react";
import { useTursorAppConfig } from "../context/useTursorAppConfig";
import { useTursorWebSocket } from "../context/useTursorWebSocket";
import {
  buildSessionConfig,
  startCdpMessage,
  startContextMessage,
} from "../workspaceInit";
import {
  parseContextBuilding,
  parseContextError,
  parseContextReady,
  parseScreenshotUrl,
  type ContextPanelPhase,
} from "../types/runChat";

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
  const [phase, setPhase] = useState<ContextPanelPhase>("building");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const contextRequestedRef = useRef(false);

  const startCdpRun = useCallback(() => {
    if (phase !== "ready") {
      setErrorMessage("Code context is still being created. Please wait.");
      return false;
    }

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
    setHasStarted(true);
    setIsRunning(true);
    return true;
  }, [
    phase,
    status,
    send,
    resolvedWorkspacePath,
    config.frontendPort,
    onRunStart,
  ]);

  useEffect(() => {
    if (status !== "connected" || contextRequestedRef.current) {
      return;
    }

    contextRequestedRef.current = true;
    setPhase("building");
    setErrorMessage(null);
    send(
      buildSessionConfig({
        workspacePath: resolvedWorkspacePath,
        frontendPort: config.frontendPort,
      }),
    );
    send(startContextMessage());
  }, [
    status,
    send,
    resolvedWorkspacePath,
    config.frontendPort,
  ]);

  useEffect(() => {
    return subscribe((data) => {
      if (parseContextBuilding(data)) {
        setPhase("building");
        setErrorMessage(null);
        return;
      }

      const err = parseContextError(data);
      if (err) {
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
        const runStatus = (data as { status?: string }).status;
        onRunComplete?.(runStatus === "success" ? "success" : "fail");
      }
    });
  }, [subscribe, onScreenshot, onRunComplete]);

  const retryRun = useCallback(() => {
    startCdpRun();
  }, [startCdpRun]);

  const retryContext = useCallback(() => {
    setPhase("building");
    setErrorMessage(null);
    contextRequestedRef.current = true;
    send(
      buildSessionConfig({
        workspacePath: resolvedWorkspacePath,
        frontendPort: config.frontendPort,
      }),
    );
    send(startContextMessage());
  }, [send, resolvedWorkspacePath, config.frontendPort]);

  const clearRunningFlag = useCallback(() => {
    setIsRunning(false);
  }, []);

  return {
    phase,
    errorMessage,
    hasStarted,
    isRunning,
    contextReady: phase === "ready",
    startRun: startCdpRun,
    retryRun,
    retryContext,
    clearRunningFlag,
  };
}
