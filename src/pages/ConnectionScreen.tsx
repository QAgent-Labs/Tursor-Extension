import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatedBackground } from "../components/AnimatedBackground";
import { DisabledReasonTooltip } from "../components/DisabledReasonTooltip";
import { Wifi, Server, Laptop } from "lucide-react";
import { useTursorWebSocket } from "../context/useTursorWebSocket";
import { useTursorAppConfig } from "../context/useTursorAppConfig";
import { useTursorStatusProbe } from "../hooks/useTursorStatusProbe";
import { TursorConfigFields } from "../components/TursorConfigFields";
import { configFieldsToPatch } from "../utils/tursorConfigPatch";
import { useTursorConfigDraft } from "../hooks/useTursorConfigDraft";
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
      probeError ??
      lastError ??
      "Could not connect to the Tursor backend."
    );
  }
  if (!frontendPortTrimmed) {
    return "Enter the port your test frontend runs on (e.g. 5173).";
  }
  return "Waiting for backend connection before you can continue.";
}

export function ConnectingScreen() {
  const navigate = useNavigate();
  const { status, connect, lastError, disconnect, send } = useTursorWebSocket();
  const { config, setConfig, editorWorkspacePath, resolvedWorkspacePath, backendStatus } =
    useTursorAppConfig();
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
  probeRef.current = probe;
  connectRef.current = connect;
  disconnectRef.current = disconnect;

  const {
    workspacePath,
    backendPort,
    frontendPort,
    setWorkspacePath,
    setBackendPort,
    setFrontendPort,
    resetDraft,
  } = useTursorConfigDraft(resolvedWorkspacePath, config);

  const runConnectFlow = useCallback(async () => {
    const gen = ++connectGeneration.current;
    setProbing(true);
    setProbeError(null);
    disconnectRef.current();

    const result = await probeRef.current();
    if (gen !== connectGeneration.current) return;

    setProbing(false);
    if (!result.running || !result.port) {
      setProbeError(
        "Tursor backend is not running. Start it with `tursor start` and try again.",
      );
      return;
    }

    connectRef.current(`http://127.0.0.1:${result.port}`);
  }, []);

  useEffect(() => {
    void runConnectFlow();
    return () => {
      connectGeneration.current += 1;
    };
  }, [runConnectFlow]);

  const waitingForSocket =
    probing ||
    status === "idle" ||
    status === "connecting" ||
    status === "disconnected";

  const backendFailed =
    !probing && (status === "error" || Boolean(probeError));

  const discoveredBackendPort =
    backendStatus?.port != null ? String(backendStatus.port) : backendPort;

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

  const applyConfigAndReconnect = () => {
    setConfig(
      configFieldsToPatch(
        workspacePath,
        editorWorkspacePath,
        discoveredBackendPort,
        frontendPort,
      ),
    );
    resetDraft();
    setProbeError(null);
    setFrontendPortError(null);
  };

  const handleContinue = async () => {
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
        discoveredBackendPort,
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
  };

  return (
    <div className="relative flex min-h-[100dvh] w-full max-w-[100vw] items-center justify-center overflow-x-hidden overflow-y-auto bg-slate-950">
      <AnimatedBackground />

      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 py-8 text-center sm:px-8">
        <div className="mb-10 flex flex-col items-center justify-center gap-10 sm:mb-12 md:flex-row md:gap-8 lg:gap-12">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center"
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-cyan-500/30 blur-2xl" />
              <div className="relative rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800 to-slate-900 p-4 shadow-2xl sm:p-6">
                <Laptop className="h-10 w-10 text-cyan-400 sm:h-12 sm:w-12" />
              </div>
            </div>
            <p className="mt-3 text-xs font-medium text-slate-400 sm:mt-4 sm:text-sm">
              Frontend
            </p>
          </motion.div>

          <div className="relative mx-auto flex h-16 w-full max-w-xs items-center justify-center sm:h-20 sm:w-40 md:mx-0">
            <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2">
              <div className="relative h-full w-full overflow-hidden rounded-full">
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{
                    scaleX: 1,
                    opacity: waitingForSocket ? [0.35, 1, 0.35] : 1,
                  }}
                  transition={{
                    scaleX: { delay: 0.2, duration: 0.75, ease: "easeOut" },
                    opacity: waitingForSocket
                      ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" }
                      : { duration: 0.2 },
                  }}
                  className="absolute inset-0 origin-left rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500"
                />
              </div>
            </div>

            <motion.div className="relative z-10">
              <div
                className={
                  backendFailed
                    ? "rounded-xl border border-red-500/50 bg-red-500/20 p-3 backdrop-blur-sm"
                    : "rounded-xl border border-blue-500/50 bg-blue-500/20 p-3 backdrop-blur-sm"
                }
              >
                <Wifi
                  className={
                    backendFailed
                      ? "h-6 w-6 text-red-400"
                      : waitingForSocket
                        ? "h-6 w-6 text-blue-400"
                        : "h-6 w-6 text-emerald-400"
                  }
                />
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center"
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-purple-500/30 blur-2xl" />
              <div className="relative rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800 to-slate-900 p-4 shadow-2xl sm:p-6">
                <Server className="h-10 w-10 text-purple-400 sm:h-12 sm:w-12" />
              </div>
            </div>
            <p className="mt-3 text-xs font-medium text-slate-400 sm:mt-4 sm:text-sm">
              Backend
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="mb-3 text-2xl font-bold text-white sm:text-3xl">
            {backendFailed ? "Connection failed" : "Establishing Connection"}
          </h2>
          <p className="mx-auto max-w-lg text-sm text-slate-400 sm:text-base">
            {backendFailed
              ? (probeError ??
                lastError ??
                "Could not reach the Tursor backend over WebSocket.")
              : probing
                ? "Checking Tursor backend status…"
                : waitingForSocket
                  ? "Connecting to Tursor backend…"
                  : "Backend connected. Enter your test frontend port to continue."}
          </p>

          <div className="mx-auto mt-5 max-w-md rounded-xl border border-slate-800/80 bg-slate-900/50 px-4 py-4 text-left">
            <TursorConfigFields
              workspacePath={workspacePath}
              backendPort={discoveredBackendPort}
              frontendPort={frontendPort}
              showFrontendPort
              backendPortReadOnly
              onWorkspacePathChange={setWorkspacePath}
              onBackendPortChange={setBackendPort}
              onFrontendPortChange={setFrontendPort}
            />
            {frontendPortError ? (
              <p className="mt-3 text-xs text-red-400">{frontendPortError}</p>
            ) : null}
            <button
              type="button"
              onClick={() => {
                applyConfigAndReconnect();
                void runConnectFlow();
              }}
              className="mt-4 w-full rounded-lg border border-slate-600 bg-slate-800/80 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
            >
              Apply backend settings & reconnect
            </button>
            <DisabledReasonTooltip
              disabled={!canContinue}
              reason={continueDisabledReasonText}
              className="mt-3 w-full"
            >
              <button
                type="button"
                disabled={!canContinue}
                onClick={() => void handleContinue()}
                className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {checkingFrontend
                  ? "Checking frontend port…"
                  : "Continue to Tursor"}
              </button>
            </DisabledReasonTooltip>
          </div>
        </motion.div>

        {backendFailed ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8"
          >
            <button
              type="button"
              onClick={() => {
                applyConfigAndReconnect();
                void runConnectFlow();
              }}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40"
            >
              Retry connection
            </button>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
