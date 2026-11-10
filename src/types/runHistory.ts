/** queued: waiting its turn in a group run. */
export type RunSessionStatus = 'queued' | 'running' | 'success' | 'fail';

export type RunSession = {
  id: string;
  startedAt: number;
  screenshots: string[];
  status: RunSessionStatus;
  conversationId?: string | null;
  caseId?: string | null;
  responseId?: string | null;
  feature?: string | null;
  caseTitle?: string | null;
  suiteId?: string | null;
};

export function createRunSessionId(): string {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function shortSessionId(id: string): string {
  const parts = id.split('-');
  return parts[parts.length - 1] ?? id.slice(0, 8);
}
