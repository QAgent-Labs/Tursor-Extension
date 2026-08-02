import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { motion } from "motion/react";
import { History, MessageSquare, Send, User, Loader2 } from "lucide-react";
import { TursorLogo } from "./TursorLogo";
import { tursorWordmarkTextGradientClassName } from "./tursorWordmarkClasses";
import { RunSessionHistoryList } from "./RunSessionHistoryList";
import { DisabledReasonTooltip } from "./DisabledReasonTooltip";
import { useTursorWebSocket } from "../context/useTursorWebSocket";
import type { ChatMessage } from "../types/runChat";
import { parseServerChatEvent } from "../types/runChat";
import type { RunSession } from "../types/runHistory";

type PanelView = "chat" | "history";

type Props = {
  sessions: RunSession[];
  currentSessionId: string | null;
  historyPreviewSessionId: string | null;
  onHistoryPreviewChange: (sessionId: string | null) => void;
};

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function RunChatPanel({
  sessions,
  currentSessionId,
  historyPreviewSessionId,
  onHistoryPreviewChange,
}: Props) {
  const { status, send, subscribe } = useTursorWebSocket();
  const listRef = useRef<HTMLDivElement>(null);
  const formId = useId();

  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [panelView, setPanelView] = useState<PanelView>("chat");

  const connected = status === "connected";

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    return subscribe((data) => {
      const chat = parseServerChatEvent(data);
      if (chat) {
        setMessages((prev) => {
          const next = prev.filter((m) => m.id !== chat.id);
          if (chat.replyTo) {
            const idx = next.findIndex((m) => m.id === chat.replyTo);
            if (idx !== -1) {
              next[idx] = { ...next[idx], status: "sent" };
            }
          }
          return [
            ...next,
            {
              id: chat.id,
              role: "assistant",
              text: chat.text,
              timestamp: Date.now(),
            },
          ];
        });
      }
    });
  }, [subscribe]);

  const sendMessage = useCallback(() => {
    const text = draft.trim();
    if (!text) return;

    const id = createId("user");
    setMessages((prev) => [
      ...prev,
      {
        id,
        role: "user",
        text,
        timestamp: Date.now(),
        status: connected ? "sending" : "failed",
      },
    ]);
    setDraft("");

    if (!connected) {
      setMessages((prev) => [
        ...prev,
        {
          id: createId("err"),
          role: "system",
          text: "Not connected to the backend. Open Settings and reconnect.",
          timestamp: Date.now(),
        },
      ]);
      return;
    }

    send({ type: "user_message", id, text });
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: "sent" as const } : m)),
    );
  }, [draft, connected, send]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const connectionLabel =
    status === "connected"
      ? "Connected"
      : status === "connecting"
        ? "Connecting…"
        : status === "error"
          ? "Error"
          : "Offline";

  return (
    <aside className="flex h-full min-h-0 w-[30%] min-w-0 shrink-0 flex-col border-r border-slate-800/80 bg-slate-950/85 backdrop-blur-md">
      <div className="flex items-center gap-3 border-b border-slate-800/60 px-4 py-4">
        <TursorLogo className="h-10 w-10 shrink-0 object-contain" />
        <div className="min-w-0 flex-1">
          <h1
            className={`min-w-0 truncate text-2xl font-bold leading-tight ${tursorWordmarkTextGradientClassName}`}
          >
            Tursor
          </h1>
          <p className="flex items-center gap-1.5 truncate text-xs text-slate-500">
            <span
              className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                connected
                  ? "bg-emerald-400"
                  : status === "connecting"
                    ? "bg-amber-400 animate-pulse"
                    : "bg-slate-500"
              }`}
              aria-hidden
            />
            {connectionLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (panelView === "history") {
              onHistoryPreviewChange(null);
              setPanelView("chat");
            } else {
              setPanelView("history");
            }
          }}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
            panelView === "history"
              ? "border-cyan-500/50 bg-cyan-950/50 text-cyan-300"
              : "border-slate-700/80 bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          }`}
          aria-label={
            panelView === "history" ? "Back to chat" : "View test run history"
          }
          title={
            panelView === "history" ? "Back to chat" : "Test run history"
          }
        >
          {panelView === "history" ? (
            <MessageSquare className="h-4 w-4" />
          ) : (
            <History className="h-4 w-4" />
          )}
        </button>
      </div>

      {panelView === "history" ? (
        <RunSessionHistoryList
          sessions={sessions}
          currentSessionId={currentSessionId}
          selectedSessionId={historyPreviewSessionId}
          onSelectSession={(sessionId) => {
            if (sessionId === currentSessionId) {
              onHistoryPreviewChange(null);
              return;
            }
            onHistoryPreviewChange(sessionId);
          }}
        />
      ) : (
        <>
          <div
            ref={listRef}
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-4"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
          >
            {messages.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-600">
                Chat is for test instructions. Logs and screenshots appear on the
                right.
              </p>
            ) : (
              messages.map((msg) => <ChatBubble key={msg.id} message={msg} />)
            )}
          </div>

          <div className="border-t border-slate-800/80 p-3">
            <div className="flex items-end gap-2 rounded-xl bg-slate-900/80 p-2 ring-1 ring-slate-700/50">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800">
                <User className="h-4 w-4 text-slate-400" />
              </div>
              <label htmlFor={formId} className="sr-only">
                Message Tursor
              </label>
              <DisabledReasonTooltip
                disabled={!connected}
                reason={
                  !connected
                    ? "Not connected to the backend. Open Settings to reconnect."
                    : null
                }
                className="min-w-0 flex-1"
              >
                <textarea
                  id={formId}
                  rows={1}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={
                    connected
                      ? "Describe a test run…"
                      : "Reconnect to send messages"
                  }
                  disabled={!connected}
                  className="max-h-32 min-h-[2.5rem] w-full flex-1 resize-none rounded-lg bg-slate-950/60 px-2 py-2 text-sm text-slate-200 placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </DisabledReasonTooltip>
              <DisabledReasonTooltip
                disabled={!connected || !draft.trim()}
                reason={
                  !connected
                    ? "Not connected to the backend."
                    : !draft.trim()
                      ? "Enter a message to send."
                      : null
                }
              >
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={!connected || !draft.trim()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-600 text-white shadow shadow-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </DisabledReasonTooltip>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-slate-600">
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </>
      )}
    </aside>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-[95%] rounded-lg border border-slate-800/80 bg-slate-900/50 px-3 py-1.5 text-center text-xs text-slate-400"
      >
        {message.text}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex max-w-[92%] gap-2 ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
    >
      {!isUser ? (
        <TursorLogo className="mt-0.5 h-5 w-5 shrink-0 object-contain" />
      ) : null}
      <div
        className={`min-w-0 break-words rounded-2xl px-3 py-2 text-sm ${
          isUser
            ? "rounded-br-md bg-slate-800/90 text-slate-200 ring-1 ring-slate-700/60"
            : "rounded-bl-md bg-gradient-to-br from-cyan-950/80 to-slate-900/90 text-slate-200 ring-1 ring-cyan-500/25"
        }`}
      >
        <p className="whitespace-pre-wrap">{message.text}</p>
        {message.status === "sending" ? (
          <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            Sending…
          </p>
        ) : null}
        {message.status === "failed" ? (
          <p className="mt-1 text-[10px] text-red-400/90">Failed to send</p>
        ) : null}
      </div>
    </motion.div>
  );
}
