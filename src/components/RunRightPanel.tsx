import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { ScreenshotCarousel } from "./ScreenshotCarousel";
import { RunLogsPanel } from "./RunLogsPanel";
import { shortSessionId } from "../types/runHistory";
import type { ContextPanelPhase } from "../types/runChat";
import type { RunLogEntry } from "../types/runLogs";

type Props = {
  phase: ContextPanelPhase;
  errorMessage: string | null;
  screenshots: string[];
  sessionKey?: string | null;
  historySessionId?: string | null;
  logs: RunLogEntry[];
  onClearLogs?: () => void;
  onRetry: () => void;
  showStartPrompt?: boolean;
  isRunning?: boolean;
};

export function RunRightPanel({
  phase,
  errorMessage,
  screenshots,
  sessionKey,
  historySessionId,
  logs,
  onClearLogs,
  onRetry,
  showStartPrompt,
  isRunning,
}: Props) {
  const [logsExpanded, setLogsExpanded] = useState(true);
  const isHistoryView = Boolean(historySessionId);

  const screenshotsSection = (
    <section
      className={`flex min-h-0 flex-col ${logsExpanded ? "flex-[65]" : "flex-1"}`}
    >
      <header className="mb-3 shrink-0 text-left">
        <h2 className="text-xl font-semibold text-white sm:text-2xl">
          Screenshots
        </h2>
        {isHistoryView && historySessionId ? (
          <p className="mt-1 text-sm text-amber-300/90">
            History · Session{" "}
            <span className="font-mono font-medium text-amber-200">
              #{shortSessionId(historySessionId)}
            </span>
          </p>
        ) : (
          <p className="mt-1 text-sm text-slate-500">
            Live captures from the agent run in order — use arrows to browse.
          </p>
        )}
      </header>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="flex h-full w-full items-center justify-center">
          <div className="aspect-video max-h-full w-full max-w-full overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/50">
            <ScreenshotCarousel urls={screenshots} sessionKey={sessionKey} />
          </div>
        </div>
        {showStartPrompt && !isHistoryView ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-dashed border-cyan-500/30 bg-slate-950/70 backdrop-blur-sm">
            <p className="max-w-xs px-4 text-center text-sm text-slate-300">
              Press{" "}
              <span className="font-semibold text-cyan-400">Start run</span>{" "}
              above to launch CDP against your test frontend.
            </p>
          </div>
        ) : null}
        {isRunning && !showStartPrompt && !isHistoryView ? (
          <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-lg border border-cyan-500/30 bg-slate-950/80 px-3 py-1.5 text-xs text-cyan-300">
            CDP run in progress…
          </div>
        ) : null}
      </div>
    </section>
  );

  const logsSection = (
    <section
      className={`flex min-h-0 flex-col ${logsExpanded ? "flex-[35]" : "shrink-0"}`}
    >
      <RunLogsPanel
        logs={logs}
        onClear={onClearLogs}
        collapsed={!logsExpanded}
        onToggleCollapse={() => setLogsExpanded((open) => !open)}
      />
    </section>
  );

  if (phase === "missing_config" || phase === "error") {
    const isMissing = phase === "missing_config";
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex shrink-0 flex-col items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/5 px-6 py-8 text-center">
          <h3 className="text-lg font-semibold text-white sm:text-xl">
            {isMissing
              ? ".tursor folder missing in the directory path"
              : "Run failed"}
          </h3>
          <p className="mt-3 max-w-lg text-sm text-slate-400">
            {isMissing
              ? "Add `.tursor/config.json` with required `supabase` settings (url, serviceRoleKey, storageBucket), then retry."
              : (errorMessage ?? "Something went wrong during the run.")}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
        {logsSection}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {screenshotsSection}
      {logsSection}
    </div>
  );
}
