import { CheckCircle2, CircleDashed, ImageIcon, XCircle } from "lucide-react";
import { shortSessionId, type RunSession } from "../types/runHistory";

type Props = {
  sessions: RunSession[];
  currentSessionId: string | null;
  selectedSessionId?: string | null;
  onSelectSession: (sessionId: string) => void;
};

function formatStartedAt(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function StatusBadge({ status }: { status: RunSession["status"] }) {
  if (status === "success") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
        <CheckCircle2 className="h-3 w-3" aria-hidden />
        Passed
      </span>
    );
  }
  if (status === "fail") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-300">
        <XCircle className="h-3 w-3" aria-hidden />
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-300">
      <CircleDashed className="h-3 w-3 animate-spin" aria-hidden />
      Running
    </span>
  );
}

export function RunSessionHistoryList({
  sessions,
  currentSessionId,
  selectedSessionId,
  onSelectSession,
}: Props) {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <ImageIcon className="mb-3 h-10 w-10 text-slate-600" aria-hidden />
        <p className="text-sm text-slate-400">No test runs yet</p>
        <p className="mt-1 max-w-xs text-xs text-slate-600">
          Each Start or Retry creates a session. Screenshots from that run appear
          here.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-4">
      {sessions.map((session) => {
        const isActive = session.id === currentSessionId;
        const isSelected = session.id === selectedSessionId;
        const thumb = session.screenshots[0];

        return (
          <li key={session.id}>
            <button
              type="button"
              onClick={() => onSelectSession(session.id)}
              className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                isSelected
                  ? "border-cyan-500/50 bg-cyan-950/40 ring-1 ring-cyan-500/30"
                  : isActive
                    ? "border-cyan-500/40 bg-cyan-950/30 ring-1 ring-cyan-500/20"
                    : "border-slate-800/80 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900/80"
              }`}
            >
              <div className="flex gap-3">
                <div className="relative h-14 w-[6.5rem] shrink-0 overflow-hidden rounded-lg border border-slate-800/80 bg-slate-950">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageIcon className="h-5 w-5 text-slate-600" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-200">
                      #{shortSessionId(session.id)}
                    </span>
                    <StatusBadge status={session.status} />
                    {isActive ? (
                      <span className="text-[10px] uppercase tracking-wide text-cyan-400/90">
                        Current
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {formatStartedAt(session.startedAt)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {session.screenshots.length}{" "}
                    {session.screenshots.length === 1
                      ? "screenshot"
                      : "screenshots"}
                  </p>
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
