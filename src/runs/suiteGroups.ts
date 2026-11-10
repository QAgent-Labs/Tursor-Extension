import type { CdpRunRecord, SummaryPlan } from '../api/chat';
import type { RunSession } from '../types/runHistory';

export type SuiteCellStatus = 'passed' | 'failure' | 'running' | 'queued';

export type SuiteGroupCell = {
  key: string;
  caseId: string;
  responseId: string;
  suiteId: string;
  feature: string;
  title: string;
  status: SuiteCellStatus;
  screenshots: string[];
};

export type SuiteGroup = {
  key: string;
  heading: string;
  /** Set for versioned suites; reports are generated per suite id. */
  suiteId: string;
  version: number;
  cells: SuiteGroupCell[];
};

function sessionStatus(session: RunSession): SuiteCellStatus {
  if (session.status === 'running') return 'running';
  if (session.status === 'queued') return 'queued';
  if (session.status === 'success') return 'passed';
  return 'failure';
}

function headingFor(feature: string, version: number): string {
  const name = feature.trim();
  const base = name ? `Test suite - ${name}` : 'Test suite';
  return version > 0 ? `${base} · v${version}` : base;
}

export function buildSuiteGroups(
  runs: CdpRunRecord[],
  sessions: RunSession[],
  conversationId: string | null,
  plans: SummaryPlan[] = [],
): SuiteGroup[] {
  const planFor = (caseId: string) => plans.find((plan) => plan.id === caseId);
  const cells: SuiteGroupCell[] = [];

  const upsert = (cell: SuiteGroupCell) => {
    const index = cells.findIndex((item) => item.caseId === cell.caseId);
    if (index === -1) {
      cells.push(cell);
      return;
    }
    const current = cells[index]!;
    const screenshots =
      cell.status === 'running' ||
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
      suiteId: cell.suiteId || current.suiteId,
      screenshots,
      status: cell.status,
    };
  };

  for (const run of runs) {
    const caseId = run.case_id || run.cdp_step_id;
    if (!caseId) continue;
    upsert({
      key: `${run.response_id || 'earlier'}:${caseId}`,
      caseId,
      responseId: run.response_id,
      suiteId: run.suite_id || planFor(caseId)?.suite_id || '',
      feature: run.feature,
      title: run.title || 'Test case',
      status: run.status,
      screenshots: run.screenshots,
    });
  }

  if (conversationId) {
    const latestByCase = new Map<string, RunSession>();
    for (const session of sessions) {
      if (session.conversationId !== conversationId || !session.caseId)
        continue;
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
        session.status !== 'running' &&
        session.status !== 'queued'
      ) {
        continue;
      }
      upsert({
        key: `${session.responseId || 'live'}:${caseId}`,
        caseId,
        responseId: session.responseId ?? '',
        suiteId: session.suiteId || planFor(caseId)?.suite_id || '',
        feature: session.feature ?? '',
        title: session.caseTitle || 'Test case',
        status: sessionStatus(session),
        screenshots: session.screenshots,
      });
    }
  }

  const groups: SuiteGroup[] = [];
  for (const cell of cells) {
    const key = cell.suiteId || cell.responseId || 'earlier-runs';
    const version = cell.suiteId
      ? (plans.find((plan) => plan.suite_id === cell.suiteId)?.version ?? 0)
      : 0;
    let group = groups.find((item) => item.key === key);
    if (!group) {
      group = {
        key,
        heading: headingFor(cell.feature, version),
        suiteId: cell.suiteId,
        version,
        cells: [],
      };
      groups.push(group);
    } else if (
      !group.heading.startsWith('Test suite -') &&
      cell.feature.trim()
    ) {
      group.heading = headingFor(cell.feature, version);
    }
    group.cells.push(cell);
  }
  return groups;
}
