import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { History, MessageSquare, Play, ScrollText, Send, SquarePen, Loader2, X } from "lucide-react";
import { TursorLogo } from "./TursorLogo";
import { tursorWordmarkTextGradientClassName } from "./tursorWordmarkClasses";
import {
  ConversationHistoryList,
  type HistoryRunSelection,
} from "./ConversationHistoryList";
import { ConversationSummaryPanel } from "./ConversationSummaryPanel";
import { FormattedAiText } from "./FormattedAiText";
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
import type { RunSession } from "../types/runHistory";
import { useTursorWebSocket } from "../context/useTursorWebSocket";

type PanelView = "chat" | "history";

const THINKING_PHRASES = ["Thinking", "Checking the code", "Writing a reply"];

const emptySummary: ConversationSummary = {
  case: "",
  brief_summary: "",
  plans: [],
  cdp_runs: [],
};

type Props = {
  backendOrigin: string | null;
  workspacePath: string | null;
  runs: RunSession[];
  selectedRunId: string | null;
  onSelectRun: (run: HistoryRunSelection) => void;
  onConversationChange?: (conversationId: string | null) => void;
  onRunStart: (conversationId: string | null) => void;
  onRunFailed: () => void;
};

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function RunChatPanel({
  backendOrigin,
  workspacePath,
  runs,
  selectedRunId,
  onSelectRun,
  onConversationChange,
  onRunStart,
  onRunFailed,
}: Props) {
  const { status, subscribe } = useTursorWebSocket();
  const listRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);
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
  const [historyTick, setHistoryTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);

  const connected = status === "connected";

  useEffect(() => {
    onConversationChange?.(conversationId);
  }, [conversationId, onConversationChange]);

  useEffect(() => {
    return subscribe((data) => {
      if (!data || typeof data !== "object") return;
      if ((data as { type?: string }).type !== "complete") return;
      setHistoryTick((tick) => tick + 1);
      if (!backendOrigin || !conversationId) return;
      void getConversation(backendOrigin, conversationId)
        .then((loaded) => setSummary(loaded.summary))
        .catch(() => undefined);
    });
  }, [subscribe, backendOrigin, conversationId]);

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, busy, scrollToBottom]);

  useEffect(() => {
    const el = draftRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft]);

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
        status:
          connected && conversationId && backendOrigin && workspacePath
            ? undefined
            : "failed",
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
  }, [panelView, backendOrigin, workspacePath, historyTick]);

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
      if (!backendOrigin || runningId || !conversationId) return;
      onRunStart(conversationId);
      setRunningId(cdpStepsId);
      void runCdpPlan(backendOrigin, { cdpStepsId, conversationId })
        .catch((err: unknown) => {
          onRunFailed();
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
    [backendOrigin, runningId, conversationId, onRunStart, onRunFailed],
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
    <aside className="relative flex h-full min-h-0 w-[33%] min-w-0 shrink-0 flex-col border-r border-slate-800/80 bg-slate-950/85 pl-2.5 backdrop-blur-md">
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
            className={`${tursorSecondaryIconButtonClassName} !text-white`}
            aria-label="Start conversation"
            title="Start conversation"
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
          runs={runs}
          selectedRunId={selectedRunId}
          loading={historyLoading}
          error={historyError}
          onBack={() => setPanelView("chat")}
          onSelect={openConversation}
          onSelectRun={onSelectRun}
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
            {messages.length === 0 && !busy ? (
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
            {busy ? <ThinkingBubble /> : null}
          </div>

          <div className="border-t border-slate-800/80 p-3">
            <div className="flex items-center gap-2 rounded-xl bg-slate-900/80 p-2 ring-1 ring-slate-700/50">
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
                  ref={draftRef}
                  id={formId}
                  rows={4}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={
                    connected
                      ? "Describe a test run…"
                      : "Reconnect to send messages"
                  }
                  disabled={!connected}
                  className="max-h-[7.8rem] min-h-[6.5rem] w-full flex-1 resize-none select-text overflow-y-auto rounded-lg bg-slate-950/60 px-2 py-2 text-sm text-slate-200 placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </DisabledReasonTooltip>
              <div className="flex shrink-0 flex-col items-center gap-2">
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
                <button
                  type="button"
                  onClick={() => setSummaryOpen(true)}
                  className={`${tursorSecondaryIconButtonClassName} text-slate-300`}
                  aria-label="Open summary"
                  title="Summary"
                >
                  <ScrollText className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-slate-600">
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </>
      )}
      <SummaryModal
        open={summaryOpen}
        summary={summary}
        onClose={() => setSummaryOpen(false)}
      />
    </aside>
  );
}

function ThinkingBubble() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % THINKING_PHRASES.length);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const phrase = THINKING_PHRASES[index];

  return (
    <div className="mr-auto flex max-w-[92%] gap-2">
      <TursorLogo className="mt-0.5 h-5 w-5 shrink-0 object-contain" />
      <div className="flex items-center gap-2.5 px-1 py-1 text-sm text-slate-300">
        <span className="flex items-end gap-1" aria-hidden>
          {[0, 1, 2].map((dot) => (
            <motion.span
              key={dot}
              className="h-1.5 w-1.5 rounded-full bg-cyan-300"
              animate={{ y: [0, -5, 0], opacity: [0.35, 1, 0.35] }}
              transition={{
                duration: 0.9,
                repeat: Infinity,
                delay: dot * 0.15,
                ease: "easeInOut",
              }}
            />
          ))}
        </span>
        <span className="relative h-5 min-w-[9.5rem] overflow-hidden">
          <AnimatePresence initial={false}>
            <motion.span
              key={phrase}
              className="absolute inset-x-0 top-0 block leading-5"
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -16, opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
            >
              {phrase}
            </motion.span>
          </AnimatePresence>
        </span>
        <span className="sr-only">{phrase}</span>
      </div>
    </div>
  );
}

function SummaryModal({
  open,
  summary,
  onClose,
}: {
  open: boolean;
  summary: ConversationSummary;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="absolute inset-0 z-30 flex items-center justify-center p-4">
          <motion.button
            type="button"
            aria-label="Close summary"
            className="absolute inset-0 bg-black/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-labelledby="chat-summary-title"
            className="relative z-10 flex max-h-[min(32rem,85%)] w-[calc(100%-0.5rem)] min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950/95 shadow-2xl shadow-black/50 backdrop-blur-xl"
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 360 }}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-800/80 px-4 py-3">
              <h2 id="chat-summary-title" className="text-lg font-semibold text-white">
                Summary
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <ConversationSummaryPanel summary={summary} />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
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
        className="mx-auto max-w-[95%] select-text rounded-lg border border-slate-800/80 bg-slate-900/50 px-3 py-1.5 text-center text-xs text-slate-400"
      >
        {message.text}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2 ${isUser ? "ml-auto max-w-[83%] flex-row-reverse" : "mr-auto max-w-[92%]"}`}
    >
      {!isUser ? (
        <TursorLogo className="mt-0.5 h-5 w-5 shrink-0 object-contain" />
      ) : null}
      <div
        className={`min-w-0 select-text break-words rounded-2xl px-3 py-2 text-sm ${
          isUser
            ? "rounded-br-md bg-slate-800/90 text-slate-200 ring-1 ring-slate-700/60"
            : "rounded-bl-md bg-gradient-to-br from-cyan-950/80 to-slate-900/90 text-slate-200 ring-1 ring-cyan-500/25"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.text}</p>
        ) : (
          <FormattedAiText text={message.text} />
        )}
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
        {message.status === "failed" ? (
          <p className="mt-1 text-[10px] text-red-400/90">Failed to send</p>
        ) : null}
      </div>
    </motion.div>
  );
}
