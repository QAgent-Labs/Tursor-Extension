import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { AnimatedBackground } from "../components/AnimatedBackground";
import { DisabledReasonTooltip } from "../components/DisabledReasonTooltip";
import { InstallStatusSteps } from "../components/InstallStatusSteps";
import ScriptAnimatedViewer from "../components/ScriptAnimatedWriter";
import TursorHeader from "../components/TursorHeader";
import {
  applyInstallStatusPayload,
  createInitialStepMap,
  INSTALL_STEP_ORDER,
  type InstallHostToWebviewMessage,
} from "../types/installStatus";
import { getVsCodeApi } from "../vscodeApi";
import { isBrowserMockRuntime } from "../appRuntime";
import { runBrowserMockInstall } from "../browserMockInstall";
import { Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { useTursorCliCheck } from "../hooks/useTursorCliCheck";
import { useTursorAppConfig } from "../context/useTursorAppConfig";

function persistBackendPort(
  port: number,
  setConfig: (patch: { backendPort: number }) => void,
  setBackendStatus: (status: { running: boolean; port: number | null }) => void,
): void {
  setConfig({ backendPort: port });
  setBackendStatus({ running: true, port });
}

export default function SetupPage() {
  const navigate = useNavigate();
  const { setConfig, setBackendStatus } = useTursorAppConfig();
  const { phase, checking: checkingCli, refresh: refreshCliCheck } =
    useTursorCliCheck();
  const [installRunning, setInstallRunning] = useState(false);
  const [startRunning, setStartRunning] = useState(false);
  const [installSession, setInstallSession] = useState(0);
  const [showInstallSteps, setShowInstallSteps] = useState(false);
  const [steps, setSteps] = useState(createInitialStepMap);
  const [installErrorDetail, setInstallErrorDetail] = useState<string | null>(
    null,
  );

  const applyResolvedPort = useCallback(
    (port: number) => {
      persistBackendPort(port, setConfig, setBackendStatus);
    },
    [setConfig, setBackendStatus],
  );

  useEffect(() => {
    const onMsg = (event: MessageEvent) => {
      const data = event.data as InstallHostToWebviewMessage | undefined;
      if (!data || typeof data !== "object" || !("type" in data)) {
        return;
      }
      if (data.type === "tursorInstallStatus") {
        const p = data.payload;
        if (
          p.phase === "ensure_running" &&
          p.state === "done" &&
          p.ok === true &&
          typeof p.port === "number" &&
          p.port > 0
        ) {
          applyResolvedPort(p.port);
        }
        if (p.state === "done" && p.ok === false && p.message) {
          setInstallErrorDetail(p.message);
        }
        setSteps((s) => applyInstallStatusPayload(s, p));
      }
      if (data.type === "tursorBackendResolved") {
        if (typeof data.port === "number" && data.port > 0) {
          applyResolvedPort(data.port);
        }
      }
      if (data.type === "tursorStartFinished") {
        setStartRunning(false);
        void refreshCliCheck().then((next) => {
          if (data.code === 0 && next.phase === "ready") {
            toast.success("Tursor is running. Redirecting…");
            setTimeout(() => navigate("/connect"), 400);
            return;
          }
          if (data.code !== 0) {
            toast.error("Could not start Tursor. Try Install Tursor instead.");
          }
        });
      }
      if (data.type === "tursorInstallFinished") {
        setInstallRunning(false);
        if (data.code === 0) {
          void refreshCliCheck();
          toast.success("Redirecting…");
          setTimeout(() => {
            navigate("/connect");
          }, 600);
        } else {
          setSteps((s) => {
            const next = { ...s };
            for (const p of INSTALL_STEP_ORDER) {
              if (next[p] === "running") {
                next[p] = "failure";
              }
            }
            return next;
          });
          toast.error(
            "Installation did not finish successfully. Check the steps above and try again.",
          );
        }
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [navigate, applyResolvedPort, refreshCliCheck]);

  const runInstallFlow = useCallback(() => {
    if (isBrowserMockRuntime()) {
      setInstallSession((s) => s + 1);
      setShowInstallSteps(true);
      setSteps(createInitialStepMap());
      setInstallErrorDetail(null);
      setInstallRunning(true);
      void runBrowserMockInstall();
      return;
    }

    const vscode = getVsCodeApi();
    if (vscode) {
      setInstallSession((s) => s + 1);
      setShowInstallSteps(true);
      setSteps({ ...createInitialStepMap(), clone_repo: "running" });
      setInstallErrorDetail(null);
      setInstallRunning(true);
      vscode.postMessage({ command: "runInstallScript" });
      return;
    }

    void window.alert(
      "Open this UI from the extension (Tursor: Open panel) to run the install script.",
    );
  }, []);

  const runStartFlow = useCallback(() => {
    const vscode = getVsCodeApi();
    if (!vscode) {
      void window.alert(
        "Open this UI from the extension (Tursor: Open panel) to start Tursor.",
      );
      return;
    }
    setInstallErrorDetail(null);
    setStartRunning(true);
    vscode.postMessage({ command: "runTursorStart" });
  }, []);

  const handlePrimaryClick = useCallback(() => {
    if (phase === "ready") {
      navigate("/connect");
      return;
    }
    if (phase === "needs_start") {
      runStartFlow();
      return;
    }
    runInstallFlow();
  }, [phase, navigate, runInstallFlow, runStartFlow]);

  const actionBusy = installRunning || startRunning;
  const primaryDisabled = actionBusy || checkingCli;

  const primaryDisabledReason = checkingCli
    ? "Checking whether Tursor is installed and running…"
    : actionBusy
      ? phase === "needs_start"
        ? "Starting the Tursor backend…"
        : "Setup is in progress…"
      : null;

  const primaryLabel = checkingCli
    ? "Checking Tursor status…"
    : actionBusy
      ? phase === "needs_start"
        ? "Starting Tursor…"
        : "Running setup…"
      : phase === "ready"
        ? "Connect to Tursor"
        : phase === "needs_start"
          ? "Start Tursor"
          : "Install Tursor";

  const setupBlurb =
    phase === "ready"
      ? "Tursor backend is running. Connect to your workspace."
      : phase === "needs_start"
        ? "Tursor is installed but not running. Start the backend to continue."
        : "Install the Tursor backend under ~/.tursor to get started.";

  return (
    <div className="flex min-h-[100dvh] w-full max-w-[100vw] flex-col">
      <AnimatedBackground />
      <div className="z-10 flex min-h-[100dvh] flex-1 flex-col">
        <TursorHeader />
        <div className="flex min-h-0 flex-1 flex-col gap-6 px-3 py-4 sm:gap-8 sm:px-5 sm:py-6 lg:flex-row lg:gap-10 lg:py-8">
          <div className="flex min-h-[12rem] w-full min-w-0 flex-col overflow-hidden lg:min-h-0 lg:w-[42%] lg:shrink-0">
            <ScriptAnimatedViewer />
          </div>
          <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col items-center overflow-y-auto lg:w-[58%] lg:min-w-0 lg:py-0">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="mb-6 w-full max-w-3xl rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5 shadow-2xl backdrop-blur-xl sm:mb-8 sm:p-8"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <Zap className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h2 className="mb-2 text-xl font-semibold text-white sm:text-2xl">
                    One-Click Setup
                  </h2>
                  <p className="text-sm text-slate-400 sm:text-base">
                    {setupBlurb}
                  </p>
                </div>
              </div>

              <DisabledReasonTooltip
                disabled={primaryDisabled}
                reason={primaryDisabledReason}
                className="w-full"
              >
                <motion.button
                  type="button"
                  onClick={handlePrimaryClick}
                  disabled={primaryDisabled}
                  whileHover={{ scale: primaryDisabled ? 1 : 1.02 }}
                  whileTap={{ scale: primaryDisabled ? 1 : 0.98 }}
                  className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-500/30 transition-all duration-300 hover:shadow-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50 sm:py-4 sm:text-lg"
                >
                  {primaryLabel}
                </motion.button>
              </DisabledReasonTooltip>

              {showInstallSteps ? (
                <>
                  <InstallStatusSteps
                    key={installSession}
                    steps={steps}
                  />
                  {installErrorDetail ? (
                    <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-left text-xs leading-relaxed text-rose-200/90 sm:text-sm">
                      {installErrorDetail}
                    </p>
                  ) : null}
                </>
              ) : null}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
