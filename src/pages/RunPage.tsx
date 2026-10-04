import { useEffect, useState } from "react";
import { AnimatedBackground } from "../components/AnimatedBackground";
import { DisabledReasonTooltip } from "../components/DisabledReasonTooltip";
import { Loader2, Play, RotateCw, Settings } from "lucide-react";
import { RunSettingsSheet } from "../components/RunSettingsSheet";
import { RunChatPanel } from "../components/RunChatPanel";
import { RunRightPanel } from "../components/RunRightPanel";
import {
  tursorPrimaryButtonClassName,
  tursorSecondaryIconButtonClassName,
} from "../components/tursorButtonClasses";
import { useRunContextFlow } from "../hooks/useRunContextFlow";
import { useRunLogs } from "../hooks/useRunLogs";
import { useRunSessions } from "../hooks/useRunSessions";
import { useEnsureBackendConnection } from "../hooks/useEnsureBackendConnection";
import { useTursorWebSocket } from "../context/useTursorWebSocket";
import { useTursorAppConfig } from "../context/useTursorAppConfig";

function runButtonDisabledReason(
  connected: boolean,
  isRunning: boolean,
  contextReady: boolean,
  phase: string,
  status: string,
  backendOrigin: string | null,
  frontendPort: number | null | undefined,
  lastError: string | null,
): string | null {
  if (isRunning) {
    return "A run is already in progress.";
  }
  if (phase === "building") {
    return "Code context is being created. Please wait.";
  }
  if (phase === "error" || phase === "missing_config") {
    return "Fix the code context error before starting a run.";
  }
  if (connected) {
    if (!contextReady) {
      return "Waiting for workspace embeddings to finish.";
    }
    if (!frontendPort || frontendPort <= 0) {
      return "Test frontend port is not set. Open Settings or go back to Connect.";
    }
    return null;
  }
  if (status === "connecting") {
    return "Connecting to the Tursor backend…";
  }
  if (!backendOrigin) {
    return "Backend is not configured. Open Settings or go to Connect.";
  }
  if (lastError) {
    return lastError;
  }
  return "Not connected to the Tursor backend. Reconnecting…";
}

export default function RunPage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const {
    sessions,
    currentSessionId,
    screenshots,
    startNewSession,
    appendScreenshot,
    completeCurrentSession,
  } = useRunSessions();
  const { logs, clearLogs } = useRunLogs();
  const { status, lastError } = useTursorWebSocket();
  const { config, backendOrigin, resolvedWorkspacePath } = useTursorAppConfig();

  useEnsureBackendConnection();

  const handleRunStart = () => {
    startNewSession();
    clearLogs();
  };

  const {
    phase,
    errorMessage,
    hasStarted,
    isRunning,
    contextReady,
    startRun,
    retryRun,
    retryContext,
    clearRunningFlag,
  } = useRunContextFlow({
    onScreenshot: appendScreenshot,
    onRunStart: handleRunStart,
    onRunComplete: completeCurrentSession,
  });

  const connected = status === "connected";
  const hasActiveSession = sessions.some((s) => s.status === "running");

  useEffect(() => {
    if (!hasActiveSession) {
      clearRunningFlag();
    }
  }, [hasActiveSession, clearRunningFlag]);

  const handlePrimaryRun = () => {
    if (hasStarted) {
      retryRun();
    } else {
      startRun();
    }
  };

  const runDisabled =
    !connected ||
    isRunning ||
    !contextReady ||
    phase === "building" ||
    !config.frontendPort ||
    config.frontendPort <= 0;
  const runDisabledReason = runButtonDisabledReason(
    connected,
    isRunning,
    contextReady,
    phase,
    status,
    backendOrigin,
    config.frontendPort,
    lastError,
  );

  return (
    <div className="relative flex h-[100dvh] max-h-[100dvh] min-h-0 w-full max-w-[100vw] flex-col overflow-hidden bg-slate-950 text-slate-100">
      <AnimatedBackground />

      <div className="relative z-10 flex h-full min-h-0 min-w-0 flex-1 flex-row">
        <RunChatPanel
          backendOrigin={backendOrigin}
          workspacePath={resolvedWorkspacePath || config.workspacePath}
        />

        <main className="flex min-h-0 min-w-0 flex-1 flex-col p-5 lg:p-6">
          <div className="relative z-20 flex shrink-0 flex-row items-center justify-end gap-2">
            <DisabledReasonTooltip
              disabled={runDisabled}
              reason={runDisabledReason}
            >
              <button
                type="button"
                onClick={handlePrimaryRun}
                disabled={runDisabled}
                className={tursorPrimaryButtonClassName}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Running…
                  </>
                ) : hasStarted ? (
                  <>
                    <RotateCw className="h-4 w-4" />
                    Retry run
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Run tests
                  </>
                )}
              </button>
            </DisabledReasonTooltip>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className={tursorSecondaryIconButtonClassName}
              aria-label="Open settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>

          <div className="relative z-10 flex min-h-0 flex-1 flex-col pt-3">
            <RunRightPanel
              phase={phase}
              errorMessage={errorMessage}
              screenshots={screenshots}
              sessionKey={currentSessionId}
              logs={logs}
              onClearLogs={clearLogs}
              onRetry={retryContext}
              showStartPrompt={
                contextReady &&
                !hasStarted &&
                connected &&
                !isRunning
              }
              isRunning={isRunning}
            />
          </div>
        </main>
      </div>

      <RunSettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
