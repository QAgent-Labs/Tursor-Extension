import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  Search,
} from "lucide-react";
import type {
  RunLogCategory,
  RunLogEntry,
  RunLogLevel,
} from "../types/runLogs";
import {
  tursorSecondaryButtonClassName,
  tursorSecondaryIconButtonClassName,
} from "./tursorButtonClasses";

type Props = {
  logs: RunLogEntry[];
  onClear?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

type SourceFilter = "all" | "backend" | "ai";

/** One row in the list: a trace's lines together, a lone line, or a run divider. */
type LogItem =
  | { kind: "trace"; key: string; entries: RunLogEntry[] }
  | { kind: "line"; key: string; entry: RunLogEntry }
  | { kind: "divider"; key: string; entry: RunLogEntry };

const CATEGORY_LABEL: Record<RunLogCategory, string> = {
  connection: "Connection",
  context: "Context",
  flowmap: "Flow map",
  intent: "Intent",
  retrieval: "Retrieval",
  llm: "LLM",
  suite: "Suite",
  prd: "PRD",
  report: "Report",
  cdp: "Run",
  step: "Step",
  screenshot: "Screenshot",
  chat: "Chat",
  system: "System",
  error: "Error",
};

const CATEGORY_CLASS: Record<RunLogCategory, string> = {
  connection: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  context: "border-violet-500/40 bg-violet-500/10 text-violet-300",
  flowmap: "border-indigo-500/40 bg-indigo-500/10 text-indigo-300",
  intent: "border-pink-500/40 bg-pink-500/10 text-pink-300",
  retrieval: "border-teal-500/40 bg-teal-500/10 text-teal-300",
  llm: "border-orange-500/40 bg-orange-500/10 text-orange-300",
  suite: "border-lime-500/40 bg-lime-500/10 text-lime-300",
  prd: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
  report: "border-rose-500/40 bg-rose-500/10 text-rose-300",
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

const TRACE_KIND_LABEL: Record<string, string> = {
  chat: "Chat",
  context: "Context",
  run: "Run",
  report: "Report",
  system: "System",
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

function worstLevel(entries: RunLogEntry[]): RunLogLevel {
  if (entries.some((entry) => entry.level === "error")) return "error";
  if (entries.some((entry) => entry.level === "warn")) return "warn";
  if (entries.some((entry) => entry.level === "success")) return "success";
  return "info";
}

/** Lines of one trace stay together even when another trace logs in between. */
function buildItems(entries: RunLogEntry[]): LogItem[] {
  const items: LogItem[] = [];
  const traces = new Map<string, RunLogEntry[]>();
  for (const entry of entries) {
    if (entry.source === "divider") {
      items.push({ kind: "divider", key: entry.id, entry });
      continue;
    }
    if (!entry.traceId) {
      items.push({ kind: "line", key: entry.id, entry });
      continue;
    }
    const group = traces.get(entry.traceId);
    if (group) {
      group.push(entry);
    } else {
      const fresh = [entry];
      traces.set(entry.traceId, fresh);
      items.push({ kind: "trace", key: entry.traceId, entries: fresh });
    }
  }
  return items;
}

function logLine(entry: RunLogEntry): string {
  const source = entry.source === "ai" ? "AI" : "BE";
  const duration =
    entry.durationMs != null ? ` (${formatDuration(entry.durationMs)})` : "";
  const trace = entry.traceLabel ? ` [${entry.traceLabel}]` : "";
  return `${new Date(entry.timestamp).toISOString()} ${source} ${entry.level.toUpperCase()} ${CATEGORY_LABEL[entry.category]}${trace}: ${entry.message}${duration}`;
}

export function RunLogsPanel({
  logs,
  onClear,
  collapsed = false,
  onToggleCollapse,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const [source, setSource] = useState<SourceFilter>("all");
  const [category, setCategory] = useState<RunLogCategory | "all">("all");
  const [showDebug, setShowDebug] = useState(false);
  const [query, setQuery] = useState("");
  const [openState, setOpenState] = useState<Record<string, boolean>>({});

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return logs.filter((entry) => {
      if (entry.source === "divider") return true;
      if (!showDebug && entry.level === "debug") return false;
      if (source !== "all" && entry.source !== source) return false;
      if (category !== "all" && entry.category !== category) return false;
      if (needle) {
        const haystack =
          `${entry.message} ${entry.traceLabel ?? ""} ${entry.meta ? JSON.stringify(entry.meta) : ""}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [logs, showDebug, source, category, query]);

  const items = useMemo(() => buildItems(visible), [visible]);
  const traceKeys = items
    .filter((item) => item.kind === "trace")
    .map((item) => item.key);
  // The two newest traces start open; older ones start folded.
  const openByDefault = new Set(traceKeys.slice(-2));
  const isOpen = (key: string) => openState[key] ?? openByDefault.has(key);

  const categoriesSeen = useMemo(
    () =>
      [
        ...new Set(
          logs
            .filter((entry) => entry.source !== "divider")
            .map((entry) => entry.category),
        ),
      ].sort(),
    [logs],
  );
  const debugCount = logs.filter((entry) => entry.level === "debug").length;

  useEffect(() => {
    if (collapsed) return;
    const el = scrollRef.current;
    if (!el || !stickToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [visible, collapsed]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 48;
  };

  const copyVisible = async () => {
    const text = visible
      .map((entry) =>
        entry.source === "divider"
          ? `---- ${entry.message} ${new Date(entry.timestamp).toISOString()} ----`
          : logLine(entry),
      )
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Copied ${visible.length} log lines.`);
    } catch {
      toast.error("Could not copy the logs.");
    }
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
        <span className="text-base font-semibold text-white sm:text-lg">
          Logs
        </span>
        <ChevronUp className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
      </button>
    );
  }

  const chipClass = (active: boolean) =>
    `rounded-md border px-2 py-0.5 text-[11px] font-medium ${
      active
        ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-200"
        : "border-slate-700 text-slate-400 hover:text-slate-200"
    }`;

  return (
    <section className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-800/80 bg-slate-950/60">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800/80 px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-white sm:text-lg">
            Logs
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {visible.length > 0 ? (
            <button
              type="button"
              onClick={() => void copyVisible()}
              className={tursorSecondaryIconButtonClassName}
              aria-label="Copy visible logs"
              title="Copy visible logs"
            >
              <Copy className="h-4 w-4" />
            </button>
          ) : null}
          {onClear && logs.length > 0 ? (
            <button
              type="button"
              onClick={onClear}
              className={tursorSecondaryButtonClassName}
            >
              Clear
            </button>
          ) : null}
          {onToggleCollapse ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              className={tursorSecondaryIconButtonClassName}
              aria-label="Collapse logs panel"
              aria-expanded
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </header>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-800/60 px-3 py-2">
        <div
          className="flex items-center gap-1"
          role="group"
          aria-label="Source"
        >
          {(["all", "backend", "ai"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setSource(value)}
              className={chipClass(source === value)}
              aria-pressed={source === value}
            >
              {value === "all" ? "All" : value === "backend" ? "Backend" : "AI"}
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="log-category">
          Category
        </label>
        <select
          id="log-category"
          value={category}
          onChange={(event) =>
            setCategory(event.target.value as RunLogCategory | "all")
          }
          className="rounded-md border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[11px] text-slate-200"
        >
          <option value="all">All categories</option>
          {categoriesSeen.map((value) => (
            <option key={value} value={value}>
              {CATEGORY_LABEL[value]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowDebug((value) => !value)}
          className={chipClass(showDebug)}
          aria-pressed={showDebug}
          title="Show debug-level lines"
        >
          Debug{debugCount > 0 ? ` (${debugCount})` : ""}
        </button>
        <div className="relative ml-auto min-w-[8rem] flex-1 sm:max-w-[14rem]">
          <Search
            className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500"
            aria-hidden
          />
          <label className="sr-only" htmlFor="log-search">
            Search logs
          </label>
          <input
            id="log-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search logs"
            className="w-full rounded-md border border-slate-700 bg-slate-900 py-0.5 pl-6 pr-2 text-[11px] text-slate-200 placeholder:text-slate-600"
          />
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 select-text overflow-y-auto px-3 py-3"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {logs.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Waiting for logs…
          </p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No lines match these filters.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((item) =>
              item.kind === "divider" ? (
                <RunDivider key={item.key} entry={item.entry} />
              ) : item.kind === "line" ? (
                <LogRow key={item.key} entry={item.entry} />
              ) : (
                <TraceGroup
                  key={item.key}
                  entries={item.entries}
                  open={isOpen(item.key)}
                  onToggle={() =>
                    setOpenState((current) => ({
                      ...current,
                      [item.key]: !isOpen(item.key),
                    }))
                  }
                />
              ),
            )}
          </ul>
        )}
      </div>
    </section>
  );
}

function RunDivider({ entry }: { entry: RunLogEntry }) {
  return (
    <li className="flex items-center gap-2 py-1 text-[10px] uppercase tracking-wide text-slate-500">
      <span className="h-px flex-1 bg-slate-700/80" aria-hidden />
      <span>
        {entry.message} · {formatTime(entry.timestamp)}
      </span>
      <span className="h-px flex-1 bg-slate-700/80" aria-hidden />
    </li>
  );
}

function TraceGroup({
  entries,
  open,
  onToggle,
}: {
  entries: RunLogEntry[];
  open: boolean;
  onToggle: () => void;
}) {
  const first = entries[0]!;
  const last = entries[entries.length - 1]!;
  const level = worstLevel(entries);
  const elapsed = last.timestamp - first.timestamp;
  const kind = TRACE_KIND_LABEL[first.traceKind ?? ""] ?? "Activity";
  const aiLines = entries.filter((entry) => entry.source === "ai").length;
  const border =
    level === "error"
      ? "border-red-500/40"
      : level === "warn"
        ? "border-amber-500/40"
        : "border-slate-800/80";
  return (
    <li className={`rounded-xl border ${border} bg-slate-900/30`}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs"
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        )}
        <span className="shrink-0 rounded border border-slate-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
          {kind}
        </span>
        <span className={`min-w-0 flex-1 truncate ${LEVEL_CLASS[level]}`}>
          {first.traceLabel ?? first.message}
        </span>
        <span className="shrink-0 font-mono text-[10px] text-slate-500 tabular-nums">
          {formatTime(first.timestamp)} · {formatDuration(elapsed)} ·{" "}
          {entries.length} line{entries.length === 1 ? "" : "s"}
          {aiLines > 0 ? ` · ${aiLines} AI` : ""}
        </span>
      </button>
      {open ? (
        <ul className="flex flex-col gap-1.5 border-t border-slate-800/60 px-2 py-2">
          {entries.map((entry) => (
            <LogRow key={entry.id} entry={entry} compact />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function LogRow({
  entry,
  compact = false,
}: {
  entry: RunLogEntry;
  compact?: boolean;
}) {
  const [showMeta, setShowMeta] = useState(false);
  const hasMeta = entry.meta != null && Object.keys(entry.meta).length > 0;
  return (
    <li
      className={`flex items-start gap-2 rounded-lg border border-slate-800/60 px-3 py-2 text-xs ${
        compact ? "bg-slate-950/40" : "bg-slate-900/40"
      }`}
    >
      <time
        className="mt-0.5 shrink-0 font-mono text-[10px] text-slate-500 tabular-nums"
        dateTime={new Date(entry.timestamp).toISOString()}
      >
        {formatTime(entry.timestamp)}
      </time>
      <span
        className={`mt-px inline-flex shrink-0 items-center rounded px-1 py-0.5 text-[9px] font-bold leading-none ${
          entry.source === "ai"
            ? "bg-orange-500/20 text-orange-200"
            : "bg-sky-500/20 text-sky-200"
        }`}
        title={entry.source === "ai" ? "Tursor-AI" : "Backend"}
      >
        {entry.source === "ai" ? "AI" : "BE"}
      </span>
      <span
        className={`inline-flex min-h-[1.25rem] shrink-0 items-center justify-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide ${CATEGORY_CLASS[entry.category]}`}
      >
        {CATEGORY_LABEL[entry.category]}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`break-words whitespace-pre-wrap ${LEVEL_CLASS[entry.level]}`}
        >
          {entry.message}
          {entry.durationMs != null ? (
            <span className="ml-1.5 font-mono text-[10px] text-slate-500">
              {formatDuration(entry.durationMs)}
            </span>
          ) : null}
        </p>
        {entry.stepId ? (
          <p className="mt-0.5 font-mono text-[10px] text-slate-600">
            step: {entry.stepId}
          </p>
        ) : null}
        {hasMeta ? (
          <>
            <button
              type="button"
              onClick={() => setShowMeta((value) => !value)}
              className="mt-1 text-[10px] text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
              aria-expanded={showMeta}
            >
              {showMeta ? "Hide details" : "Details"}
            </button>
            {showMeta ? (
              <pre className="mt-1 max-h-48 overflow-auto rounded bg-slate-950/80 p-2 font-mono text-[10px] text-slate-400">
                {JSON.stringify(entry.meta, null, 2)}
              </pre>
            ) : null}
          </>
        ) : null}
      </div>
    </li>
  );
}
