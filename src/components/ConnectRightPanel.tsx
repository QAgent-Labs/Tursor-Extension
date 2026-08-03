import { motion } from "motion/react";
import { ConnectIllustration } from "./ConnectIllustration";
import { ConnectConfigGrid } from "./ConnectConfigGrid";
import { tursorSecondaryButtonClassName } from "./tursorButtonClasses";

type Props = {
  statusTitle: string;
  statusMessage: string;
  backendFailed: boolean;
  waitingForSocket: boolean;
  workspacePath: string | null;
  backendPort: string;
  frontendPort: string;
  onWorkspacePathChange: (path: string) => void;
  onBackendPortChange: (value: string) => void;
  onFrontendPortChange: (value: string) => void;
  onApplyReconnect: () => void;
  frontendPortError: string | null;
  checkingFrontend: boolean;
  canContinue: boolean;
  continueDisabledReason: string | null;
  onContinue: () => void;
  onRetry: () => void;
};

export function ConnectRightPanel({
  statusTitle,
  statusMessage,
  backendFailed,
  waitingForSocket,
  workspacePath,
  backendPort,
  frontendPort,
  onWorkspacePathChange,
  onBackendPortChange,
  onFrontendPortChange,
  onApplyReconnect,
  frontendPortError,
  checkingFrontend,
  canContinue,
  continueDisabledReason,
  onContinue,
  onRetry,
}: Props) {
  return (
    <div className="flex w-full max-w-3xl flex-col">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-5 shadow-2xl backdrop-blur-xl sm:p-8"
      >
        <ConnectIllustration
          waitingForSocket={waitingForSocket}
          backendFailed={backendFailed}
        />

        <h2 className="mb-2 text-center text-xl font-bold text-white sm:text-2xl">
          {statusTitle}
        </h2>
        <p className="mx-auto mb-6 max-w-lg text-center text-sm text-slate-400 sm:text-base">
          {statusMessage}
        </p>

        <ConnectConfigGrid
          workspacePath={workspacePath}
          backendPort={backendPort}
          frontendPort={frontendPort}
          onWorkspacePathChange={onWorkspacePathChange}
          onBackendPortChange={onBackendPortChange}
          onFrontendPortChange={onFrontendPortChange}
          onApplyReconnect={onApplyReconnect}
          frontendPortError={frontendPortError}
          checkingFrontend={checkingFrontend}
          canContinue={canContinue}
          continueDisabledReason={continueDisabledReason}
          onContinue={onContinue}
        />

        {backendFailed ? (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={onRetry}
              className={tursorSecondaryButtonClassName}
            >
              Retry connection
            </button>
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}
