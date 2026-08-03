import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTursorWebSocket } from "../context/useTursorWebSocket";
import { useTursorAppConfig } from "../context/useTursorAppConfig";
import { useTursorStatusProbe } from "./useTursorStatusProbe";
import { configFieldsToPatch } from "../utils/tursorConfigPatch";
import { useTursorConfigDraft } from "./useTursorConfigDraft";
import { probeFrontendPort } from "../utils/probeFrontendPort";
import { buildSessionConfig } from "../workspaceInit";

function continueDisabledReason(
  canContinue: boolean,
  checkingFrontend: boolean,
  probing: boolean,
  waitingForSocket: boolean,
  backendFailed: boolean,
  frontendPortTrimmed: string,
  probeError: string | null,
  lastError: string | null,
): string | null {
  if (canContinue) return null;
  if (checkingFrontend) {
    return "Verifying your test frontend is reachable on that port…";
  }
  if (probing) {
    return "Checking whether the Tursor backend is running…";
  }
  if (waitingForSocket) {
    return "Connecting to the Tursor backend over WebSocket…";
  }
  if (backendFailed) {
    return (
      probeError ?? lastError ?? "Could not connect to the Tursor backend."
    );
  }
  if (!frontendPortTrimmed) {
    return "Enter the port your test frontend runs on (e.g. 5173).";
  }
  return "Waiting for backend connection before you can continue.";
}

type Options = {
  /** When false, skips auto probe/connect (e.g. install step still visible). */
  enabled?: boolean;
};

export function useConnectFlow(options: Options = {}) {
  const enabled = options.enabled ?? true;
  const navigate = useNavigate();
  const { status, connect, lastError, disconnect, send } = useTursorWebSocket();
  const {
    config,
    setConfig,
    editorWorkspacePath,
    resolvedWorkspacePath,
  } = useTursorAppConfig();
  const { probe } = useTursorStatusProbe();
  const [probing, setProbing] = useState(true);
  const [probeError, setProbeError] = useState<string | null>(null);
  const [frontendPortError, setFrontendPortError] = useState<string | null>(
    null,
  );
  const [checkingFrontend, setCheckingFrontend] = useState(false);
  const connectGeneration = useRef(0);
  const probeRef = useRef(probe);
  const connectRef = useRef(connect);
  const disconnectRef = useRef(disconnect);

  useEffect(() => {
    probeRef.current = probe;
    connectRef.current = connect;
    disconnectRef.current = disconnect;
  }, [probe, connect, disconnect]);

  const {
    workspacePath,
    backendPort,
    frontendPort,
    setWorkspacePath,
    setBackendPort,
    setFrontendPort,
    resetDraft,
  } = useTursorConfigDraft(resolvedWorkspacePath, config);

  const startConnectFlow = useCallback(async (gen: number) => {
    setProbing(true);
    setProbeError(null);
    disconnectRef.current();

    const hint = Number.parseInt(backendPort.trim(), 10);
    const result = await probeRef.current(
      Number.isFinite(hint) && hint > 0 ? hint : undefined,
    );
    if (gen !== connectGeneration.current) return;

    setProbing(false);
    if (!result.running || !result.port) {
      setProbeError(
        "Tursor backend is not running. Start it with `tursor start` and try again.",
      );
      return;
    }

    connectRef.current(`http://127.0.0.1:${result.port}`);
  }, [backendPort]);

  const runConnectFlow = useCallback(async () => {
    const gen = ++connectGeneration.current;
    await startConnectFlow(gen);
  }, [startConnectFlow]);

  useEffect(() => {
    if (!enabled) return;

    const gen = ++connectGeneration.current;
    void (async () => {
      await Promise.resolve();
      if (gen !== connectGeneration.current) return;
      await startConnectFlow(gen);
    })();

    return () => {
      connectGeneration.current += 1;
    };
  }, [enabled, startConnectFlow]);

  const waitingForSocket =
    probing ||
    status === "idle" ||
    status === "connecting" ||
    status === "disconnected";

  const backendFailed = !probing && (status === "error" || Boolean(probeError));

  const frontendPortTrimmed = frontendPort.trim();
  const canContinue =
    status === "connected" &&
    !probing &&
    !backendFailed &&
    frontendPortTrimmed.length > 0 &&
    !checkingFrontend;

  const continueDisabledReasonText = continueDisabledReason(
    canContinue,
    checkingFrontend,
    probing,
    waitingForSocket,
    backendFailed,
    frontendPortTrimmed,
    probeError,
    lastError,
  );

  const statusMessage = backendFailed
    ? (probeError ??
      lastError ??
      "Could not reach the Tursor backend over WebSocket.")
    : probing
      ? "Checking Tursor backend status…"
      : waitingForSocket
        ? "Connecting to Tursor backend…"
        : "Backend connected. Enter your test frontend port to continue.";

  const statusTitle = backendFailed
    ? "Connection failed"
    : "Establishing Connection";

  const applyConfigAndReconnect = useCallback(() => {
    setConfig(
      configFieldsToPatch(
        workspacePath,
        editorWorkspacePath,
        backendPort,
        frontendPort,
      ),
    );
    resetDraft();
    setProbeError(null);
    setFrontendPortError(null);
  }, [
    workspacePath,
    editorWorkspacePath,
    backendPort,
    frontendPort,
    setConfig,
    resetDraft,
  ]);

  const handleContinue = useCallback(async () => {
    const port = Number.parseInt(frontendPortTrimmed, 10);
    if (!Number.isFinite(port) || port <= 0) {
      setFrontendPortError("Enter a valid port number.");
      return;
    }

    setCheckingFrontend(true);
    setFrontendPortError(null);
    const alive = await probeFrontendPort(port);
    setCheckingFrontend(false);

    if (!alive) {
      setFrontendPortError(
        `Nothing responded on http://127.0.0.1:${port}. Start your test frontend and try again.`,
      );
      return;
    }

    setConfig(
      configFieldsToPatch(
        workspacePath,
        editorWorkspacePath,
        backendPort,
        frontendPort,
      ),
    );
    resetDraft();

    send(
      buildSessionConfig({
        workspacePath: resolvedWorkspacePath ?? workspacePath,
        frontendPort: port,
      }),
    );

    navigate("/run");
  }, [
    frontendPortTrimmed,
    workspacePath,
    editorWorkspacePath,
    backendPort,
    frontendPort,
    setConfig,
    resetDraft,
    send,
    resolvedWorkspacePath,
    navigate,
  ]);

  const handleApplyReconnect = useCallback(() => {
    applyConfigAndReconnect();
    void runConnectFlow();
  }, [applyConfigAndReconnect, runConnectFlow]);

  const handleRetry = useCallback(() => {
    applyConfigAndReconnect();
    void runConnectFlow();
  }, [applyConfigAndReconnect, runConnectFlow]);

  return {
    workspacePath,
    backendPort,
    frontendPort,
    setWorkspacePath,
    setBackendPort,
    setFrontendPort,
    frontendPortError,
    checkingFrontend,
    canContinue,
    continueDisabledReasonText,
    statusMessage,
    statusTitle,
    backendFailed,
    waitingForSocket,
    probing,
    handleContinue,
    handleRetry,
    handleApplyReconnect,
    applyConfigAndReconnect,
    runConnectFlow,
  };
}
