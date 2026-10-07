import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatedBackground } from "../components/AnimatedBackground";
import { Settings } from "lucide-react";
import { RunSettingsSheet } from "../components/RunSettingsSheet";
import { RunChatPanel } from "../components/RunChatPanel";
import type { HistoryRunSelection } from "../components/ConversationHistoryList";
import { RunRightPanel } from "../components/RunRightPanel";
import type { ConversationSummary } from "../api/chat";
import { buildSuiteGroups } from "../runs/suiteGroups";
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
  const [conversationSummary, setConversationSummary] =
    useState<ConversationSummary | null>(null);
  const [highlight, setHighlight] = useState<{
    caseId: string;
    token: number;
  } | null>(null);
  const {
    sessions,
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
      setHighlight(null);
    }
    activeConversationRef.current = conversationId;
    setActiveConversationId(conversationId);
  }, []);

  const handleRunStart = useCallback(
    (conversationId?: string | null) => {
      startNewSession(conversationId);
      clearLogs();
      setShotPreview(null);
      setHighlight(null);
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

  const beginCaseRun = useCallback(
    (run: {
      conversationId: string;
      caseId: string;
      responseId: string;
      feature: string;
      title: string;
    }) => {
      startNewSession(run.conversationId, {
        caseId: run.caseId,
        responseId: run.responseId,
        feature: run.feature,
        caseTitle: run.title,
      });
      clearLogs();
      setShotPreview(null);
      setHighlight(null);
      markRunStarted();
    },
    [startNewSession, clearLogs, markRunStarted],
  );

  const viewCase = useCallback((caseId: string) => {
    setShotPreview(null);
    setHighlight({ caseId, token: Date.now() });
  }, []);

  useEffect(() => {
    if (!highlight) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const cell = document.getElementById(`run-cell-${highlight.caseId}`);
      if (cell?.contains(target)) return;
      setHighlight(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [highlight]);

  const failChatRun = useCallback(() => {
    completeCurrentSession("fail");
  }, [completeCurrentSession]);

  const hasActiveSession = sessions.some((s) => s.status === "running");

  useEffect(() => {
    if (!hasActiveSession) {
      clearRunningFlag();
    }
  }, [hasActiveSession, clearRunningFlag]);

  const liveSession =
    sessions.find(
      (session) =>
        session.status === "running" &&
        session.conversationId === activeConversationId &&
        session.caseId,
    ) ?? null;
  const groups = buildSuiteGroups(
    conversationSummary?.cdp_runs ?? [],
    sessions,
    activeConversationId,
  );

  return (
    <div className="relative flex h-[100dvh] max-h-[100dvh] min-h-0 w-full max-w-[100vw] select-none flex-col overflow-hidden bg-slate-950 text-slate-100">
      <AnimatedBackground />

      <div className="relative z-10 flex h-full min-h-0 min-w-0 flex-1 flex-row">
        <RunChatPanel
          backendOrigin={backendOrigin}
          workspacePath={resolvedWorkspacePath || config.workspacePath}
          runs={sessions}
          selectedRunId={shotPreview?.key ?? null}
          onConversationChange={handleConversationChange}
          onSummaryChange={setConversationSummary}
          onRunCase={beginCaseRun}
          onViewCase={viewCase}
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
              conversationId={activeConversationId}
              phase={phase}
              errorMessage={errorMessage}
              groups={groups}
              highlightedCaseId={highlight?.caseId ?? null}
              highlightToken={highlight?.token ?? 0}
              liveRunKey={
                liveSession?.caseId
                  ? `${liveSession.caseId}:${liveSession.startedAt}`
                  : null
              }
              liveCaseId={liveSession?.caseId ?? null}
              preview={
                shotPreview
                  ? {
                      key: shotPreview.key,
                      title: shotPreview.title || "Test case",
                      screenshots: shotPreview.screenshots,
                      status: shotPreview.status,
                    }
                  : null
              }
              onClosePreview={() => setShotPreview(null)}
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
