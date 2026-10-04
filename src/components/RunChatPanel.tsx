import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { motion } from "motion/react";
import { History, MessageSquare, Play, ScrollText, Send, SquarePen, User, Loader2 } from "lucide-react";
import { TursorLogo } from "./TursorLogo";
import { tursorWordmarkTextGradientClassName } from "./tursorWordmarkClasses";
import { ConversationHistoryList } from "./ConversationHistoryList";
import { ConversationSummaryPanel } from "./ConversationSummaryPanel";
import { DisabledReasonTooltip } from "./DisabledReasonTooltip";
import { tursorPrimaryButtonClassName, tursorPrimaryIconButtonClassName, tursorSecondaryIconButtonClassName } from "./tursorButtonClasses";
import {
  getConversation,
  listConversations,
  runCdpPlan,
  sendConversationMessage,
  startConversation,
  type ConversationListItem,
  type ConversationSummary,
} from "../api/chat";
import type { ChatMessage } from "../types/runChat";
import { useTursorWebSocket } from "../context/useTursorWebSocket";

type PanelView = "chat" | "history" | "summary";

const emptySummary: ConversationSummary = { case: "", plans: [] };

type Props = {
  backendOrigin: string | null;
  workspacePath: string | null;
};

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function RunChatPanel({
  backendOrigin,
  workspacePath,
}: Props) {
  const { status } = useTursorWebSocket();
  const listRef = useRef<HTMLDivElement>(null);
  const formId = useId();
  const startedSession = useRef<number | null>(null);

  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [panelView, setPanelView] = useState<PanelView>("chat");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatSession, setChatSession] = useState(0);
  const [summary, setSummary] = useState<ConversationSummary>(emptySummary);
  const [historyItems, setHistoryItems] = useState<ConversationListItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);

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
    if (!connected || !backendOrigin || !workspacePath) {
      return;
    }
    if (startedSession.current === chatSession && conversationId) {
      return;
    }
    startedSession.current = chatSession;
    let cancelled = false;
    setBusy(true);
    void startConversation(backendOrigin, workspacePath)
      .then((turn) => {
        if (cancelled) return;
        setConversationId(turn.conversationId);
        setSummary(turn.summary);
        setMessages([
          {
            id: createId("assistant"),
            role: "assistant",
            text: turn.reply,
            timestamp: Date.now(),
            cdpStepsId: turn.cdpStepsId,
          },
        ]);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const text = err instanceof Error ? err.message : "Could not start chat.";
        setMessages([
          {
            id: createId("err"),
            role: "system",
            text,
            timestamp: Date.now(),
          },
        ]);
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [connected, backendOrigin, workspacePath, chatSession, conversationId]);

  const startNewConversation = () => {
    if (!connected || !backendOrigin || !workspacePath) return;
    setPanelView("chat");
    setDraft("");
    setConversationId(null);
    setSummary(emptySummary);
    setMessages([]);
    setChatSession((n) => n + 1);
  };

  const sendMessage = useCallback(() => {
    const text = draft.trim();
    if (!text || busy) return;

    const id = createId("user");
    setMessages((prev) => [
      ...prev,
      {
        id,
        role: "user",
        text,
        timestamp: Date.now(),
        status: connected && conversationId && backendOrigin && workspacePath ? "sending" : "failed",
      },
    ]);
    setDraft("");

    if (!connected || !conversationId || !backendOrigin || !workspacePath) {
      setMessages((prev) => [
        ...prev,
        {
          id: createId("err"),
          role: "system",
          text: "Chat is not ready. Wait for the welcome message, or reconnect.",
          timestamp: Date.now(),
        },
      ]);
      return;
    }

    setBusy(true);
    void sendConversationMessage(backendOrigin, {
      conversationId,
      message: text,
      workspacePath,
    })
      .then((turn) => {
        setSummary(turn.summary);
        setMessages((prev) => [
          ...prev.map((m) => (m.id === id ? { ...m, status: "sent" as const } : m)),
          {
            id: createId("assistant"),
            role: "assistant" as const,
            text: turn.reply,
            timestamp: Date.now(),
            cdpStepsId: turn.cdpStepsId,
          },
        ]);
      })
      .catch((err: unknown) => {
        const detail = err instanceof Error ? err.message : "Request failed";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === id ? { ...m, status: "failed" as const } : m,
          ).concat({
            id: createId("err"),
            role: "system" as const,
            text: detail,
            timestamp: Date.now(),
          }),
        );
      })
      .finally(() => setBusy(false));
  }, [draft, busy, connected, conversationId, backendOrigin, workspacePath]);

  useEffect(() => {
    if (panelView !== "history" || !backendOrigin || !workspacePath) return;
    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(null);
    void listConversations(backendOrigin, workspacePath)
      .then((items) => {
        if (!cancelled) setHistoryItems(items);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setHistoryError(
          err instanceof Error ? err.message : "Could not load conversations.",
        );
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [panelView, backendOrigin, workspacePath]);

  const openConversation = (id: string) => {
    if (!backendOrigin) return;
    if (id === conversationId) {
      setPanelView("chat");
      return;
    }
    setBusy(true);
    void getConversation(backendOrigin, id)
      .then((data) => {
        startedSession.current = chatSession;
        setConversationId(id);
        setSummary(data.summary);
        setDraft("");
        setMessages(
          data.messages.map((message) => ({
            id: message.id,
            role: message.role,
            text: message.content,
            timestamp: Date.parse(message.createdAt) || Date.now(),
            cdpStepsId:
              typeof message.metadata?.cdpStepsId === "string"
                ? message.metadata.cdpStepsId
                : null,
          })),
        );
        setPanelView("chat");
      })
      .catch((err: unknown) => {
        setHistoryError(
          err instanceof Error ? err.message : "Could not open that conversation.",
        );
      })
      .finally(() => setBusy(false));
  };

  const onRunTest = useCallback(
    (cdpStepsId: string) => {
      if (!backendOrigin || runningId) return;
      setRunningId(cdpStepsId);
      void runCdpPlan(backendOrigin, cdpStepsId)
        .catch((err: unknown) => {
          const detail = err instanceof Error ? err.message : "Could not start the run.";
          setMessages((prev) => [
            ...prev,
            {
              id: createId("err"),
              role: "system",
              text: detail,
              timestamp: Date.now(),
            },
          ]);
        })
        .finally(() => setRunningId(null));
    },
    [backendOrigin, runningId],
  );

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
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={startNewConversation}
            disabled={!connected || !backendOrigin || !workspacePath}
            className={`${tursorSecondaryIconButtonClassName} text-slate-400`}
            aria-label="New conversation"
            title="New conversation"
          >
            <SquarePen className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setPanelView(panelView === "history" ? "chat" : "history");
            }}
            className={`${tursorSecondaryIconButtonClassName} ${
              panelView === "history"
                ? "border-cyan-500/50 text-cyan-300"
                : "text-slate-400"
            }`}
            aria-label={
              panelView === "history" ? "Back to chat" : "Conversation history"
            }
            title={
              panelView === "history" ? "Back to chat" : "Conversation history"
            }
          >
            {panelView === "history" ? (
              <MessageSquare className="h-4 w-4" />
            ) : (
              <History className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {panelView === "history" ? (
        <ConversationHistoryList
          conversations={historyItems}
          currentConversationId={conversationId}
          loading={historyLoading}
          error={historyError}
          onSelect={openConversation}
        />
      ) : (
        <>
          {panelView === "summary" ? (
            <ConversationSummaryPanel summary={summary} />
          ) : (
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
              messages.map((msg) => (
                <ChatBubble
                  key={msg.id}
                  message={msg}
                  running={runningId === msg.cdpStepsId && Boolean(msg.cdpStepsId)}
                  onRunTest={onRunTest}
                />
              ))
            )}
          </div>
          )}

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
                  disabled={!connected || !draft.trim() || busy || !conversationId}
                  className={tursorPrimaryIconButtonClassName}
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </DisabledReasonTooltip>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-slate-600">
              Enter to send · Shift+Enter for new line
            </p>
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() =>
                  setPanelView(panelView === "summary" ? "chat" : "summary")
                }
                className={`${tursorSecondaryIconButtonClassName} ${
                  panelView === "summary"
                    ? "border-cyan-500/50 text-cyan-300"
                    : "text-slate-400"
                }`}
                aria-label={panelView === "summary" ? "Close summary" : "Open summary"}
                title="Summary"
              >
                <ScrollText className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}

function ChatBubble({
  message,
  running,
  onRunTest,
}: {
  message: ChatMessage;
  running: boolean;
  onRunTest: (cdpStepsId: string) => void;
}) {
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
        {message.cdpStepsId ? (
          <button
            type="button"
            onClick={() => onRunTest(message.cdpStepsId!)}
            disabled={running}
            className={`${tursorPrimaryButtonClassName} mt-2`}
          >
            {running ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Play className="h-3.5 w-3.5" aria-hidden />
            )}
            {running ? "Starting…" : "Run Test"}
          </button>
        ) : null}
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
