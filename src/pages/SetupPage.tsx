import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { AnimatedBackground } from "../components/AnimatedBackground";
import { InstallStatusSteps } from "../components/InstallStatusSteps";
import ScriptAnimatedViewer from "../components/ScriptAnimatedWriter";
import TursorHeader from "../components/TursorHeader";
import {
  applyInstallStatusPayload,
  createInitialStepMap,
  type InstallHostToWebviewMessage,
} from "../types/installStatus";
import { getVsCodeApi } from "../vscodeApi";
import { isBrowserMockRuntime } from "../appRuntime";
import { runBrowserMockInstall } from "../browserMockInstall";
import { Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function SetupPage() {
  const navigate = useNavigate();
  const [installRunning, setInstallRunning] = useState(false);
  const [installSession, setInstallSession] = useState(0);
  const [showInstallSteps, setShowInstallSteps] = useState(false);
  const [steps, setSteps] = useState(createInitialStepMap);
  const [checkInstallCliPresent, setCheckInstallCliPresent] = useState<
    boolean | undefined
  >(undefined);

  useEffect(() => {
    const onMsg = (event: MessageEvent) => {
      const data = event.data as InstallHostToWebviewMessage | undefined;
      if (!data || typeof data !== "object" || !("type" in data)) {
        return;
      }
      if (data.type === "tursorInstallStatus") {
        const p = data.payload;
        if (
          p.phase === "check_install" &&
          p.state === "done" &&
          typeof p.installed === "boolean"
        ) {
          setCheckInstallCliPresent(p.installed);
        }
        setSteps((s) => applyInstallStatusPayload(s, p));
      }
      if (data.type === "tursorInstallFinished") {
        setInstallRunning(false);
        if (data.code === 0) {
          toast.success("Redirecting…");
          setTimeout(() => {
            navigate("/connect");
          }, 3500);
        } else {
          toast.error(
            "Installation did not finish successfully. Check the steps above and try again.",
          );
        }
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [navigate]);

  const handleInstallClick = useCallback(() => {
    if (isBrowserMockRuntime()) {
      setInstallSession((s) => s + 1);
      setShowInstallSteps(true);
      setSteps(createInitialStepMap());
      setCheckInstallCliPresent(undefined);
      setInstallRunning(true);
      void runBrowserMockInstall();
      return;
    }

    const vscode = getVsCodeApi();
    if (vscode) {
      setInstallSession((s) => s + 1);
      setShowInstallSteps(true);
      setSteps(createInitialStepMap());
      setCheckInstallCliPresent(undefined);
      setInstallRunning(true);
      vscode.postMessage({ command: "runInstallScript" });
      return;
    }

    void window.alert(
      "Open this UI from the extension (Tursor: Open panel) to run the install script.",
    );
  }, []);

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
                    Automatically install and start the Tursor backend
                  </p>
                </div>
              </div>

              <motion.button
                type="button"
                onClick={handleInstallClick}
                disabled={installRunning}
                whileHover={{ scale: installRunning ? 1 : 1.02 }}
                whileTap={{ scale: installRunning ? 1 : 0.98 }}
                className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-500/30 transition-all duration-300 hover:shadow-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50 sm:py-4 sm:text-lg"
              >
                {installRunning ? "Running setup…" : "Install & Start Tursor"}
              </motion.button>

              {showInstallSteps ? (
                <InstallStatusSteps
                  key={installSession}
                  steps={steps}
                  checkInstallCliPresent={checkInstallCliPresent}
                />
              ) : null}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
