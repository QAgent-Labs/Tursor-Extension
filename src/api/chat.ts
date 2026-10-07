export type CdpRunStatus = "passed" | "failure";

export type SuiteCaseKind = "success" | "failure" | "edge";

export type CdpRunRecord = {
  cdp_step_id: string;
  case_id: string;
  status: CdpRunStatus;
  status_message: string;
  screenshots: string[];
  response_id: string;
  feature: string;
  title: string;
  kind: SuiteCaseKind | "";
};

export type SummaryPlan = {
  id: string;
  title: string;
  response_id: string;
  feature: string;
  kind: SuiteCaseKind | "";
};

export type ConversationSummary = {
  case: string;
  brief_summary: string;
  plans: SummaryPlan[];
  cdp_runs: CdpRunRecord[];
};

export type SuiteCaseView = {
  id: string;
  kind: SuiteCaseKind;
  title: string;
  explanation: string;
};

export type ChatSuite = {
  feature: string;
  cases: SuiteCaseView[];
};

export type ChatTurn = {
  conversationId: string;
  responseId: string;
  reply: string;
  suite: ChatSuite | null;
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
  metadata?: Record<string, unknown>;
  createdAt: string;
};

const emptySummary = (): ConversationSummary => ({
  case: "",
  brief_summary: "",
  plans: [],
  cdp_runs: [],
});

function asKind(value: unknown): SuiteCaseKind | "" {
  if (value === "success" || value === "failure" || value === "edge") {
    return value;
  }
  return "";
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function suiteFromMetadata(metadata: unknown): ChatSuite | null {
  if (!metadata || typeof metadata !== "object") return null;
  const data = metadata as { feature?: unknown; cases?: unknown };
  if (!Array.isArray(data.cases)) return null;
  const cases: SuiteCaseView[] = [];
  for (const item of data.cases) {
    if (!item || typeof item !== "object") continue;
    const row = item as {
      id?: unknown;
      kind?: unknown;
      title?: unknown;
      explanation?: unknown;
    };
    const kind = asKind(row.kind);
    if (!kind || typeof row.id !== "string" || !row.id) continue;
    cases.push({
      id: row.id,
      kind,
      title: asText(row.title) || "Test case",
      explanation: asText(row.explanation),
    });
  }
  if (cases.length === 0) return null;
  return { feature: asText(data.feature), cases };
}

function asSummary(raw: unknown): ConversationSummary {
  if (!raw || typeof raw !== "object") return emptySummary();
  const data = raw as {
    case?: unknown;
    brief_summary?: unknown;
    plans?: unknown;
    cdp_runs?: unknown;
  };
  const plans: SummaryPlan[] = [];
  if (Array.isArray(data.plans)) {
    for (const item of data.plans) {
      if (!item || typeof item !== "object") continue;
      const plan = item as {
        id?: unknown;
        title?: unknown;
        response_id?: unknown;
        feature?: unknown;
        kind?: unknown;
      };
      if (typeof plan.id !== "string" || !plan.id) continue;
      plans.push({
        id: plan.id,
        title: asText(plan.title),
        response_id: asText(plan.response_id),
        feature: asText(plan.feature),
        kind: asKind(plan.kind),
      });
    }
  }
  const cdpRuns: CdpRunRecord[] = [];
  if (Array.isArray(data.cdp_runs)) {
    for (const item of data.cdp_runs) {
      if (!item || typeof item !== "object") continue;
      const run = item as {
        cdp_step_id?: unknown;
        case_id?: unknown;
        status?: unknown;
        status_message?: unknown;
        screenshots?: unknown;
        response_id?: unknown;
        feature?: unknown;
        title?: unknown;
        kind?: unknown;
      };
      if (typeof run.cdp_step_id !== "string" || !run.cdp_step_id) continue;
      if (run.status !== "passed" && run.status !== "failure") continue;
      cdpRuns.push({
        cdp_step_id: run.cdp_step_id,
        case_id:
          typeof run.case_id === "string" && run.case_id
            ? run.case_id
            : run.cdp_step_id,
        status: run.status,
        status_message: asText(run.status_message),
        screenshots: Array.isArray(run.screenshots)
          ? run.screenshots.filter(
              (url): url is string => typeof url === "string" && url.length > 0,
            )
          : [],
        response_id: asText(run.response_id),
        feature: asText(run.feature),
        title: asText(run.title),
        kind: asKind(run.kind),
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

function asSuite(raw: unknown): ChatSuite | null {
  return suiteFromMetadata(raw);
}

function asChatTurn(raw: ChatTurn): ChatTurn {
  return {
    conversationId: raw.conversationId,
    responseId: raw.responseId ?? "",
    reply: raw.reply ?? "",
    suite: asSuite(raw.suite),
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
