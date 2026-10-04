import { useState, type ReactNode } from "react";
import { ArrowLeft, CheckCircle2, ChevronDown, CircleDashed, XCircle } from "lucide-react";
import type { CdpRunRecord, ConversationListItem } from "../api/chat";
import type { RunSession } from "../types/runHistory";
import { FormattedAiText } from "./FormattedAiText";

export type HistoryRunSelection = {
  key: string;
  screenshots: string[];
  status: "passed" | "failure";
};

type Props = {
  conversations: ConversationListItem[];
  currentConversationId: string | null;
  runs: RunSession[];
  selectedRunId: string | null;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onSelect: (conversationId: string) => void;
  onSelectRun: (run: HistoryRunSelection) => void;
};

function localRunsFor(
  conversationId: string,
  runs: RunSession[],
  isCurrent: boolean,
): RunSession[] {
  const matched = runs
    .filter((run) => run.conversationId === conversationId)
    .sort((a, b) => a.startedAt - b.startedAt);
  if (matched.length > 0 || !isCurrent) {
    return matched;
  }
  return runs
    .filter((run) => !run.conversationId && run.screenshots.length > 0)
    .sort((a, b) => a.startedAt - b.startedAt);
}

function screenshotsFor(
  run: CdpRunRecord,
  local: RunSession[],
  cursor: { index: number },
): string[] {
  if (run.screenshots.length > 0) {
    return run.screenshots;
  }
  const session = local[cursor.index];
  if (!session) {
    return [];
  }
  cursor.index += 1;
  return session.screenshots;
}

function StatusPill({ status }: { status: RunSession["status"] }) {
  if (status === "success") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
        <CheckCircle2 className="h-3 w-3" aria-hidden />
        Passed
      </span>
    );
  }
  if (status === "fail") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-300">
        <XCircle className="h-3 w-3" aria-hidden />
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-300">
      <CircleDashed className="h-3 w-3 animate-spin" aria-hidden />
      Running
    </span>
  );
}

export function ConversationHistoryList({
  conversations,
  currentConversationId,
  runs,
  selectedRunId,
  loading,
  error,
  onBack,
  onSelect,
  onSelectRun,
}: Props) {
  const [openIds, setOpenIds] = useState<string[]>([]);

  let body: ReactNode;
  if (loading && conversations.length === 0) {
    body = (
      <p className="px-3 py-8 text-center text-xs text-slate-500">
        Loading conversations…
      </p>
    );
  } else if (error && conversations.length === 0) {
    body = (
      <p className="px-3 py-8 text-center text-xs text-red-300">{error}</p>
    );
  } else if (conversations.length === 0) {
    body = (
      <p className="px-3 py-8 text-center text-sm text-slate-400">
        No conversations yet
      </p>
    );
  } else {
    body = (
    <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-4">
      {conversations.map((item) => {
        const isCurrent = item.id === currentConversationId;
        const open = openIds.includes(item.id);
        const localRuns = localRunsFor(item.id, runs, isCurrent);
        const savedRuns = item.summary.cdp_runs;
        const shotCursor = { index: 0 };
        const visibleRuns = savedRuns.map((run, index) => ({
          key: `${item.id}:${index}:${run.cdp_step_id}`,
          cdpStepId: run.cdp_step_id,
          status: run.status,
          statusMessage: run.status_message,
          screenshots: screenshotsFor(run, localRuns, shotCursor),
        }));
        const summary =
          item.summary.brief_summary.trim() ||
          item.summary.case.trim() ||
          "New conversation";
        const when = Date.parse(item.updatedAt);

        return (
          <li
            key={item.id}
            className={`rounded-xl border ${
              isCurrent
                ? "border-cyan-500/50 bg-cyan-950/40"
                : "border-slate-800/80 bg-slate-900/50"
            }`}
          >
            <div className="flex items-start gap-2 px-3 py-3">
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="line-clamp-3 text-sm text-slate-200">
                  <FormattedAiText text={summary} />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {Number.isNaN(when) ? "" : new Date(when).toLocaleString()}
                </p>
                {isCurrent ? (
                  <span className="mt-2 inline-flex rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-cyan-300">
                    Current
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={() =>
                  setOpenIds((ids) =>
                    ids.includes(item.id)
                      ? ids.filter((id) => id !== item.id)
                      : [...ids, item.id],
                  )
                }
                className="mt-0.5 shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                aria-label={open ? "Hide runs" : "Show runs"}
                title={open ? "Hide runs" : "Show runs"}
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
                />
              </button>
            </div>

            {open ? (
              <ul className="flex flex-col gap-2 border-t border-slate-800/80 px-3 py-3">
                {visibleRuns.length === 0 ? (
                  <li className="text-xs text-slate-500">No runs yet</li>
                ) : (
                  visibleRuns.map((run) => {
                    const selected = run.key === selectedRunId;
                    return (
                      <li key={run.key}>
                        <button
                          type="button"
                          onClick={() =>
                            onSelectRun({
                              key: run.key,
                              screenshots: run.screenshots,
                              status: run.status,
                            })
                          }
                          className={`w-full rounded-lg border px-3 py-2 text-left ${
                            selected
                              ? "border-cyan-500/50 bg-cyan-950/50"
                              : "border-slate-800/80 bg-slate-950/70 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm text-slate-200">
                              {run.status === "passed" ? "Passed" : "Failed"}
                            </p>
                            <StatusPill
                              status={run.status === "passed" ? "success" : "fail"}
                            />
                          </div>
                          {run.statusMessage.trim() ? (
                            <p className="mt-1 whitespace-pre-wrap text-xs text-slate-400">
                              {run.statusMessage}
                            </p>
                          ) : null}
                          <p className="mt-1 truncate font-mono text-[10px] text-slate-500">
                            {run.cdpStepId}
                          </p>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex w-fit items-center gap-1.5 pb-2 pl-1 pr-3 pt-3 text-sm font-medium text-slate-200 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back
      </button>
      {body}
    </div>
  );
}
