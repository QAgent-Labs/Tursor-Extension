import type { CdpRunRecord } from "../api/chat";
import type { RunSession } from "../types/runHistory";

export type SuiteCellStatus = "passed" | "failure" | "running";

export type SuiteGroupCell = {
  key: string;
  caseId: string;
  responseId: string;
  feature: string;
  title: string;
  status: SuiteCellStatus;
  screenshots: string[];
};

export type SuiteGroup = {
  key: string;
  heading: string;
  cells: SuiteGroupCell[];
};

function sessionStatus(session: RunSession): SuiteCellStatus {
  if (session.status === "running") return "running";
  if (session.status === "success") return "passed";
  return "failure";
}

function headingFor(feature: string): string {
  const name = feature.trim();
  return name ? `Test suite - ${name}` : "Test suite";
}

export function buildSuiteGroups(
  runs: CdpRunRecord[],
  sessions: RunSession[],
  conversationId: string | null,
): SuiteGroup[] {
  const cells: SuiteGroupCell[] = [];

  const upsert = (cell: SuiteGroupCell) => {
    const index = cells.findIndex((item) => item.caseId === cell.caseId);
    if (index === -1) {
      cells.push(cell);
      return;
    }
    const current = cells[index]!;
    const screenshots =
      cell.status === "running" ||
      cell.screenshots.length >= current.screenshots.length
        ? cell.screenshots
        : current.screenshots;
    cells[index] = {
      ...current,
      ...cell,
      key: current.key,
      title: cell.title || current.title,
      feature: cell.feature || current.feature,
      responseId: cell.responseId || current.responseId,
      screenshots,
      status: cell.status,
    };
  };

  for (const run of runs) {
    const caseId = run.case_id || run.cdp_step_id;
    if (!caseId) continue;
    upsert({
      key: `${run.response_id || "earlier"}:${caseId}`,
      caseId,
      responseId: run.response_id,
      feature: run.feature,
      title: run.title || "Test case",
      status: run.status,
      screenshots: run.screenshots,
    });
  }

  if (conversationId) {
    const latestByCase = new Map<string, RunSession>();
    for (const session of sessions) {
      if (session.conversationId !== conversationId || !session.caseId) continue;
      const previous = latestByCase.get(session.caseId);
      if (!previous || session.startedAt >= previous.startedAt) {
        latestByCase.set(session.caseId, session);
      }
    }
    for (const session of latestByCase.values()) {
      const caseId = session.caseId;
      if (!caseId) continue;
      const existing = cells.some((cell) => cell.caseId === caseId);
      if (
        !existing &&
        session.screenshots.length === 0 &&
        session.status !== "running"
      ) {
        continue;
      }
      upsert({
        key: `${session.responseId || "live"}:${caseId}`,
        caseId,
        responseId: session.responseId ?? "",
        feature: session.feature ?? "",
        title: session.caseTitle || "Test case",
        status: sessionStatus(session),
        screenshots: session.screenshots,
      });
    }
  }

  const groups: SuiteGroup[] = [];
  for (const cell of cells) {
    const key = cell.responseId || "earlier-runs";
    let group = groups.find((item) => item.key === key);
    if (!group) {
      group = { key, heading: headingFor(cell.feature), cells: [] };
      groups.push(group);
    } else if (!group.heading.startsWith("Test suite -") && cell.feature.trim()) {
      group.heading = headingFor(cell.feature);
    }
    group.cells.push(cell);
  }
  return groups;
}
