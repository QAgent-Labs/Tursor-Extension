import { MessageSquare } from "lucide-react";
import type { ConversationListItem } from "../api/chat";

type Props = {
  conversations: ConversationListItem[];
  currentConversationId: string | null;
  loading: boolean;
  error: string | null;
  onSelect: (conversationId: string) => void;
};

function formatUpdatedAt(iso: string): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "";
  return new Date(time).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function labelFor(item: ConversationListItem): string {
  const text = item.summary.case.trim();
  return text || "New conversation";
}

export function ConversationHistoryList({
  conversations,
  currentConversationId,
  loading,
  error,
  onSelect,
}: Props) {
  if (loading && conversations.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-xs text-slate-500">
        Loading conversations…
      </p>
    );
  }

  if (error && conversations.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-xs text-red-300">{error}</p>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <MessageSquare className="mb-3 h-10 w-10 text-slate-600" aria-hidden />
        <p className="text-sm text-slate-400">No conversations yet</p>
      </div>
    );
  }

  return (
    <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-4">
      {conversations.map((item) => {
        const isCurrent = item.id === currentConversationId;
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                isCurrent
                  ? "border-cyan-500/50 bg-cyan-950/40 ring-1 ring-cyan-500/30"
                  : "border-slate-800/80 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900/80"
              }`}
            >
              <div className="flex items-start gap-2">
                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm text-slate-200">
                    {labelFor(item)}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {formatUpdatedAt(item.updatedAt)}
                    {item.summary.plans.length > 0
                      ? ` · ${item.summary.plans.length} plan${item.summary.plans.length === 1 ? "" : "s"}`
                      : ""}
                  </p>
                  {isCurrent ? (
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-cyan-400/90">
                      Current
                    </p>
                  ) : null}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
