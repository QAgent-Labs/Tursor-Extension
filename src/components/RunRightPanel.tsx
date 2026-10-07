import { useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { RunsGallery, type RunsPreview } from "./RunsGallery";
import { RunLogsPanel } from "./RunLogsPanel";
import { TursorPathText } from "./TursorPathText";
import { tursorSecondaryButtonClassName } from "./tursorButtonClasses";
import type { SuiteGroup } from "../runs/suiteGroups";
import type { ContextPanelPhase } from "../types/runChat";
import type { RunLogEntry } from "../types/runLogs";

type Props = {
  conversationId: string | null;
  phase: ContextPanelPhase;
  errorMessage: string | null;
  groups: SuiteGroup[];
  highlightedCaseId: string | null;
  highlightToken: number;
  liveRunKey: string | null;
  liveCaseId: string | null;
  preview: RunsPreview | null;
  onClosePreview: () => void;
  logs: RunLogEntry[];
  onClearLogs?: () => void;
  onRetry: () => void;
  isRunning?: boolean;
};

export function RunRightPanel({
  conversationId,
  phase,
  errorMessage,
  groups,
  highlightedCaseId,
  highlightToken,
  liveRunKey,
  liveCaseId,
  preview,
  onClosePreview,
  logs,
  onClearLogs,
  onRetry,
  isRunning,
}: Props) {
  const [logsExpanded, setLogsExpanded] = useState(true);
  const isHistoryView = preview != null;
  const isMissing = phase === "missing_config";
  const isError = phase === "error";
  const isBuilding = phase === "building";
  const showErrorOverlay = !isHistoryView && (isMissing || isError);

  const screenshotsSection = (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <RunsGallery
          conversationId={conversationId}
          groups={groups}
          highlightedCaseId={highlightedCaseId}
          highlightToken={highlightToken}
          liveRunKey={liveRunKey}
          liveCaseId={liveCaseId}
          preview={preview}
          onClosePreview={onClosePreview}
        />
        {showErrorOverlay ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-amber-500/30 bg-slate-950/85 px-6 py-8 text-center backdrop-blur-sm">
            <div className="max-w-lg">
              <h3 className="text-lg font-semibold text-white sm:text-xl">
                {isMissing ? (
                  <TursorPathText text=".tursor folder missing in the directory path" />
                ) : (
                  "Run failed"
                )}
              </h3>
              <p className="mt-3 text-sm text-slate-400">
                {isMissing ? (
                  <TursorPathText text="Add `.tursor/config.json` with required `supabase` settings (url, serviceRoleKey, storageBucket), then retry." />
                ) : (
                  (errorMessage ?? "Something went wrong during the run.")
                )}
              </p>
              <button
                type="button"
                onClick={onRetry}
                className={`mt-6 ${tursorSecondaryButtonClassName}`}
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
            </div>
          </div>
        ) : null}
        {isBuilding && groups.length === 0 && !isHistoryView && !showErrorOverlay ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-cyan-500/30 bg-slate-950/85 px-6 py-8 text-center backdrop-blur-sm">
            <div className="max-w-lg">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-400" />
              <h3 className="mt-4 text-lg font-semibold text-white sm:text-xl">
                Creating code context
              </h3>
              <p className="mt-3 text-sm text-slate-400">
                Workspace embeddings are being built. Please wait before running
                tests.
              </p>
            </div>
          </div>
        ) : null}
        {isRunning && !isHistoryView && !showErrorOverlay ? (
          <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-lg border border-cyan-500/30 bg-slate-950/80 px-3 py-1.5 text-xs text-cyan-300">
            CDP run in progress…
          </div>
        ) : null}
      </div>
    </section>
  );

  const logsSection = (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <RunLogsPanel
        logs={logs}
        onClear={onClearLogs}
        collapsed={!logsExpanded}
        onToggleCollapse={() => setLogsExpanded((open) => !open)}
      />
    </section>
  );

  return (
    <div
      className={`grid min-h-0 flex-1 gap-3 overflow-hidden ${
        logsExpanded
          ? "grid-rows-[minmax(0,65fr)_minmax(0,35fr)]"
          : "grid-rows-[minmax(0,1fr)_auto]"
      }`}
    >
      {screenshotsSection}
      {logsSection}
    </div>
  );
}
