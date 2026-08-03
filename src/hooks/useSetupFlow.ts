import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  applyInstallStatusPayload,
  createInitialStepMap,
  INSTALL_STEP_ORDER,
  type InstallHostToWebviewMessage,
  type StepVisualState,
} from "../types/installStatus";
import { getVsCodeApi } from "../vscodeApi";
import { isBrowserMockRuntime } from "../appRuntime";
import { runBrowserMockInstall } from "../browserMockInstall";
import { useTursorCliCheck } from "./useTursorCliCheck";
import { useTursorAppConfig } from "../context/useTursorAppConfig";

function persistBackendPort(
  port: number,
  setConfig: (patch: { backendPort: number }) => void,
  setBackendStatus: (status: { running: boolean; port: number | null }) => void,
): void {
  setConfig({ backendPort: port });
  setBackendStatus({ running: true, port });
}

type Options = {
  onAdvanceToConnect?: () => void;
};

export function useSetupFlow(options: Options = {}) {
  const { onAdvanceToConnect } = options;
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

  const goToConnect = useCallback(() => {
    if (onAdvanceToConnect) {
      onAdvanceToConnect();
      return;
    }
    navigate("/initial-setup?step=connect");
  }, [navigate, onAdvanceToConnect]);

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
            setTimeout(() => goToConnect(), 400);
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
          setTimeout(() => goToConnect(), 600);
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
  }, [goToConnect, applyResolvedPort, refreshCliCheck]);

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
      goToConnect();
      return;
    }
    if (phase === "needs_start") {
      runStartFlow();
      return;
    }
    runInstallFlow();
  }, [phase, goToConnect, runInstallFlow, runStartFlow]);

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

  return {
    phase,
    steps: steps as Record<string, StepVisualState>,
    installSession,
    showInstallSteps,
    installErrorDetail,
    actionBusy,
    primaryDisabled,
    primaryDisabledReason,
    primaryLabel,
    setupBlurb,
    handlePrimaryClick,
  };
}
