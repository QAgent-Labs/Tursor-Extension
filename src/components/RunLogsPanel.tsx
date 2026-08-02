import { useEffect, useRef } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { RunLogCategory, RunLogEntry, RunLogLevel } from "../types/runLogs";

type Props = {
  logs: RunLogEntry[];
  onClear?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

const CATEGORY_LABEL: Record<RunLogCategory, string> = {
  connection: "Connection",
  context: "Context",
  cdp: "CDP",
  step: "Step",
  screenshot: "Screenshot",
  chat: "Chat",
  system: "System",
  error: "Error",
};

const CATEGORY_CLASS: Record<RunLogCategory, string> = {
  connection: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  context: "border-violet-500/40 bg-violet-500/10 text-violet-300",
  cdp: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
  step: "border-blue-500/40 bg-blue-500/10 text-blue-300",
  screenshot: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  chat: "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-300",
  system: "border-slate-500/40 bg-slate-500/10 text-slate-300",
  error: "border-red-500/40 bg-red-500/10 text-red-300",
};

const LEVEL_CLASS: Record<RunLogLevel, string> = {
  debug: "text-slate-500",
  info: "text-slate-300",
  warn: "text-amber-300",
  error: "text-red-300",
  success: "text-emerald-300",
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function RunLogsPanel({
  logs,
  onClear,
  collapsed = false,
  onToggleCollapse,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    if (collapsed) return;
    const el = scrollRef.current;
    if (!el || !stickToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [logs, collapsed]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 48;
  };

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggleCollapse}
        className="flex w-full shrink-0 items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-950/60 px-4 py-3 text-left transition-colors hover:bg-slate-900/80"
        aria-expanded={false}
        aria-label="Expand logs panel"
      >
        <span className="text-base font-semibold text-white sm:text-lg">Logs</span>
        <ChevronUp className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
      </button>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-800/80 bg-slate-950/60">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800/80 px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-white sm:text-lg">Logs</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Live backend activity — newest at the bottom.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onClear && logs.length > 0 ? (
            <button
              type="button"
              onClick={onClear}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              Clear
            </button>
          ) : null}
          {onToggleCollapse ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-300 hover:bg-slate-800"
              aria-label="Collapse logs panel"
              aria-expanded
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </header>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-3"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {logs.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Waiting for backend logs…
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {logs.map((entry) => (
              <LogRow key={entry.id} entry={entry} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function LogRow({ entry }: { entry: RunLogEntry }) {
  return (
    <li className="flex gap-2 rounded-lg border border-slate-800/60 bg-slate-900/40 px-3 py-2 text-xs">
      <time
        className="shrink-0 font-mono text-[10px] text-slate-500 tabular-nums"
        dateTime={new Date(entry.timestamp).toISOString()}
      >
        {formatTime(entry.timestamp)}
      </time>
      <span
        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide border ${CATEGORY_CLASS[entry.category]}`}
      >
        {CATEGORY_LABEL[entry.category]}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`break-words whitespace-pre-wrap ${LEVEL_CLASS[entry.level]}`}>
          {entry.message}
        </p>
        {entry.stepId ? (
          <p className="mt-0.5 font-mono text-[10px] text-slate-600">
            step: {entry.stepId}
          </p>
        ) : null}
      </div>
    </li>
  );
}
