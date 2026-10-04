export type ConversationSummary = {
  case: string;
  plans: { id: string; title: string }[];
};

export type ChatTurn = {
  conversationId: string;
  reply: string;
  cdpStepsId: string | null;
  summary: ConversationSummary;
};

export type ConversationListItem = {
  id: string;
  summary: ConversationSummary;
  createdAt: string;
  updatedAt: string;
};

export type StoredMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: { cdpStepsId?: string | null };
  createdAt: string;
};

const emptySummary = (): ConversationSummary => ({ case: "", plans: [] });

function asSummary(raw: unknown): ConversationSummary {
  if (!raw || typeof raw !== "object") return emptySummary();
  const data = raw as { case?: unknown; plans?: unknown };
  const plans = Array.isArray(data.plans)
    ? data.plans.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const plan = item as { id?: unknown; title?: unknown };
        if (typeof plan.id !== "string" || !plan.id) return [];
        return [
          {
            id: plan.id,
            title: typeof plan.title === "string" ? plan.title : "",
          },
        ];
      })
    : [];
  return {
    case: typeof data.case === "string" ? data.case : "",
    plans,
  };
}

async function requestJson<T>(
  origin: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${origin.replace(/\/$/, "")}${path}`, init);
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }
  if (!res.ok) {
    const err = data as { message?: string | string[] };
    const message = Array.isArray(err?.message)
      ? err.message.join(", ")
      : err?.message;
    throw new Error(message || `Request failed (${res.status})`);
  }
  return data as T;
}

async function postJson<T>(
  origin: string,
  path: string,
  body: unknown,
): Promise<T> {
  return requestJson(origin, path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function asChatTurn(raw: ChatTurn): ChatTurn {
  return {
    conversationId: raw.conversationId,
    reply: raw.reply ?? "",
    cdpStepsId: raw.cdpStepsId ?? null,
    summary: asSummary(raw.summary),
  };
}

export function startConversation(
  origin: string,
  workspacePath: string,
): Promise<ChatTurn> {
  return postJson<ChatTurn>(origin, "/chat/intro", { workspacePath }).then(
    asChatTurn,
  );
}

export function sendConversationMessage(
  origin: string,
  input: { conversationId: string; message: string; workspacePath: string },
): Promise<ChatTurn> {
  return postJson<ChatTurn>(origin, "/chat/message", input).then(asChatTurn);
}

export function runCdpPlan(
  origin: string,
  cdpStepsId: string,
): Promise<{ ok: true; cdpStepsId: string }> {
  return postJson(origin, "/chat/run", { cdpStepsId });
}

export function listConversations(
  origin: string,
  workspacePath: string,
): Promise<ConversationListItem[]> {
  const query = new URLSearchParams({ workspacePath });
  return requestJson<{ conversations: ConversationListItem[] }>(
    origin,
    `/chat/conversations?${query.toString()}`,
  ).then((data) =>
    (data.conversations ?? []).map((item) => ({
      ...item,
      summary: asSummary(item.summary),
    })),
  );
}

export function getConversation(
  origin: string,
  conversationId: string,
): Promise<{ summary: ConversationSummary; messages: StoredMessage[] }> {
  return requestJson<{ summary: unknown; messages: StoredMessage[] }>(
    origin,
    `/chat/conversations/${encodeURIComponent(conversationId)}`,
  ).then((data) => ({
    summary: asSummary(data.summary),
    messages: data.messages ?? [],
  }));
}
