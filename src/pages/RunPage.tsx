import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatedBackground } from "../components/AnimatedBackground";
import { Settings } from "lucide-react";
import { RunSettingsSheet } from "../components/RunSettingsSheet";
import { RunChatPanel } from "../components/RunChatPanel";
import type { HistoryRunSelection } from "../components/ConversationHistoryList";
import { RunRightPanel } from "../components/RunRightPanel";
import { tursorSecondaryIconButtonClassName } from "../components/tursorButtonClasses";
import { useRunContextFlow } from "../hooks/useRunContextFlow";
import { useRunLogs } from "../hooks/useRunLogs";
import { useRunSessions } from "../hooks/useRunSessions";
import { useEnsureBackendConnection } from "../hooks/useEnsureBackendConnection";
import { useTursorAppConfig } from "../context/useTursorAppConfig";

export default function RunPage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [shotPreview, setShotPreview] = useState<HistoryRunSelection | null>(
    null,
  );
  const {
    sessions,
    currentSessionId,
    startNewSession,
    appendScreenshot,
    attachRun,
    completeCurrentSession,
  } = useRunSessions();
  const { logs, clearLogs } = useRunLogs();
  const { config, backendOrigin, resolvedWorkspacePath } = useTursorAppConfig();

  useEnsureBackendConnection();

  const activeConversationRef = useRef<string | null>(null);
  const handleConversationChange = useCallback((conversationId: string | null) => {
    if (activeConversationRef.current !== conversationId) {
      setShotPreview(null);
    }
    activeConversationRef.current = conversationId;
    setActiveConversationId(conversationId);
  }, []);

  const handleRunStart = useCallback(
    (conversationId?: string | null) => {
      startNewSession(conversationId);
      clearLogs();
      setShotPreview(null);
    },
    [startNewSession, clearLogs],
  );

  const handleCdpStarted = useCallback(
    (runId: string, conversationId: string | null) => {
      attachRun(runId, conversationId);
      setShotPreview(null);
    },
    [attachRun],
  );

  const {
    phase,
    errorMessage,
    isRunning,
    markRunStarted,
    retryContext,
    clearRunningFlag,
  } = useRunContextFlow({
    onScreenshot: appendScreenshot,
    onRunStart: handleRunStart,
    onCdpStarted: handleCdpStarted,
    onRunComplete: completeCurrentSession,
  });

  const prepareChatRun = useCallback(
    (conversationId: string | null) => {
      handleRunStart(conversationId);
      markRunStarted();
    },
    [handleRunStart, markRunStarted],
  );

  const failChatRun = useCallback(() => {
    completeCurrentSession("fail");
  }, [completeCurrentSession]);

  const hasActiveSession = sessions.some((s) => s.status === "running");

  useEffect(() => {
    if (!hasActiveSession) {
      clearRunningFlag();
    }
  }, [hasActiveSession, clearRunningFlag]);

  const homeRun =
    sessions
      .filter((session) => session.conversationId === activeConversationId)
      .sort((a, b) => b.startedAt - a.startedAt)[0] ?? null;
  const isHistoryView = shotPreview != null;
  const displayScreenshots = shotPreview?.screenshots ?? homeRun?.screenshots ?? [];
  const displaySessionKey = shotPreview?.key ?? homeRun?.id ?? currentSessionId;
  const displayStatus =
    shotPreview == null
      ? (homeRun?.status ?? null)
      : shotPreview.status === "passed"
        ? "success"
        : "fail";

  return (
    <div className="relative flex h-[100dvh] max-h-[100dvh] min-h-0 w-full max-w-[100vw] select-none flex-col overflow-hidden bg-slate-950 text-slate-100">
      <AnimatedBackground />

      <div className="relative z-10 flex h-full min-h-0 min-w-0 flex-1 flex-row">
        <RunChatPanel
          backendOrigin={backendOrigin}
          workspacePath={resolvedWorkspacePath || config.workspacePath}
          runs={sessions}
          selectedRunId={shotPreview?.key ?? null}
          onSelectRun={setShotPreview}
          onConversationChange={handleConversationChange}
          onRunStart={prepareChatRun}
          onRunFailed={failChatRun}
        />

        <main className="flex min-h-0 min-w-0 flex-1 flex-col p-5 lg:p-6">
          <div className="relative z-20 flex shrink-0 flex-row items-center justify-end gap-2">
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
              screenshots={displayScreenshots}
              sessionKey={displaySessionKey}
              runStatus={displayStatus}
              historySessionId={isHistoryView ? shotPreview.key : null}
              logs={logs}
              onClearLogs={clearLogs}
              onRetry={retryContext}
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
