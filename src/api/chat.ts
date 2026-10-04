export type CdpRunStatus = "passed" | "failure";

export type CdpRunRecord = {
  cdp_step_id: string;
  status: CdpRunStatus;
  status_message: string;
  screenshots: string[];
};

export type ConversationSummary = {
  case: string;
  brief_summary: string;
  plans: { id: string; title: string }[];
  cdp_runs: CdpRunRecord[];
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

const emptySummary = (): ConversationSummary => ({
  case: "",
  brief_summary: "",
  plans: [],
  cdp_runs: [],
});

function asSummary(raw: unknown): ConversationSummary {
  if (!raw || typeof raw !== "object") return emptySummary();
  const data = raw as {
    case?: unknown;
    brief_summary?: unknown;
    plans?: unknown;
    cdp_runs?: unknown;
  };
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
  const cdpRuns: CdpRunRecord[] = [];
  if (Array.isArray(data.cdp_runs)) {
    for (const item of data.cdp_runs) {
      if (!item || typeof item !== "object") continue;
      const run = item as {
        cdp_step_id?: unknown;
        status?: unknown;
        status_message?: unknown;
        screenshots?: unknown;
      };
      if (typeof run.cdp_step_id !== "string" || !run.cdp_step_id) continue;
      if (run.status !== "passed" && run.status !== "failure") continue;
      cdpRuns.push({
        cdp_step_id: run.cdp_step_id,
        status: run.status,
        status_message:
          typeof run.status_message === "string" ? run.status_message : "",
        screenshots: Array.isArray(run.screenshots)
          ? run.screenshots.filter(
              (url): url is string => typeof url === "string" && url.length > 0,
            )
          : [],
      });
    }
  }
  return {
    case: typeof data.case === "string" ? data.case : "",
    brief_summary:
      typeof data.brief_summary === "string" ? data.brief_summary : "",
    plans,
    cdp_runs: cdpRuns,
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
  input: { cdpStepsId: string; conversationId: string },
): Promise<{ ok: true; cdpStepsId: string }> {
  return postJson(origin, "/chat/run", input);
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
