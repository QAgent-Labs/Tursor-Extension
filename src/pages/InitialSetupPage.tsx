import { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { AnimatedBackground } from "../components/AnimatedBackground";
import ScriptAnimatedViewer from "../components/ScriptAnimatedWriter";
import TursorHeader from "../components/TursorHeader";
import { SetupRightPanel } from "../components/SetupRightPanel";
import { ConnectRightPanel } from "../components/ConnectRightPanel";
import { SetupStepDots } from "../components/SetupStepDots";
import { useSetupFlow } from "../hooks/useSetupFlow";
import { useConnectFlow } from "../hooks/useConnectFlow";

const SLIDE_EASE = [0.22, 1, 0.36, 1] as const;

export default function InitialSetupPage() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<1 | 2>(() =>
    searchParams.get("step") === "connect" ? 2 : 1,
  );

  const advanceToConnect = useCallback(() => {
    setStep(2);
  }, []);

  const setup = useSetupFlow({ onAdvanceToConnect: advanceToConnect });
  const connect = useConnectFlow({ enabled: step === 2 });

  const activeStep = step;

  return (
    <div className="flex h-[100dvh] w-full max-w-[100vw] flex-col overflow-hidden">
      <AnimatedBackground />
      <div className="z-10 flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <TursorHeader />
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-3 py-4 sm:gap-6 sm:px-5 sm:py-6 lg:flex-row lg:gap-10 lg:py-8">
          <div className="flex min-h-[10rem] w-full min-w-0 max-h-[calc(100dvh-5rem-9rem)] flex-col overflow-hidden sm:max-h-[calc(100dvh-5.25rem-10rem)] lg:h-full lg:max-h-none lg:w-[42%] lg:shrink-0">
            <ScriptAnimatedViewer />
          </div>

          <div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col items-center overflow-hidden lg:w-[58%] lg:min-w-0">
            <div className="relative w-full flex-1 overflow-y-auto">
              <AnimatePresence mode="wait" initial={false}>
                {activeStep === 1 ? (
                  <motion.div
                    key="install"
                    initial={{ opacity: 0, x: 0 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -80 }}
                    transition={{ duration: 0.45, ease: SLIDE_EASE }}
                    className="flex w-full justify-center"
                  >
                    <SetupRightPanel
                      setupBlurb={setup.setupBlurb}
                      primaryLabel={setup.primaryLabel}
                      primaryDisabled={setup.primaryDisabled}
                      primaryDisabledReason={setup.primaryDisabledReason}
                      onPrimaryClick={setup.handlePrimaryClick}
                      showInstallSteps={setup.showInstallSteps}
                      installSession={setup.installSession}
                      steps={setup.steps}
                      installErrorDetail={setup.installErrorDetail}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="connect"
                    initial={{ opacity: 0, x: 80 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 80 }}
                    transition={{ duration: 0.45, ease: SLIDE_EASE }}
                    className="flex w-full justify-center"
                  >
                    <ConnectRightPanel
                      statusTitle={connect.statusTitle}
                      statusMessage={connect.statusMessage}
                      backendFailed={connect.backendFailed}
                      waitingForSocket={connect.waitingForSocket}
                      workspacePath={connect.workspacePath}
                      backendPort={connect.backendPort}
                      frontendPort={connect.frontendPort}
                      onWorkspacePathChange={connect.setWorkspacePath}
                      onBackendPortChange={connect.setBackendPort}
                      onFrontendPortChange={connect.setFrontendPort}
                      onApplyReconnect={connect.handleApplyReconnect}
                      frontendPortError={connect.frontendPortError}
                      checkingFrontend={connect.checkingFrontend}
                      canContinue={connect.canContinue}
                      continueDisabledReason={connect.continueDisabledReasonText}
                      onContinue={() => void connect.handleContinue()}
                      onRetry={connect.handleRetry}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <SetupStepDots activeStep={activeStep} />
          </div>
        </div>
      </div>
    </div>
  );
}
