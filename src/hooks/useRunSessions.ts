import { useCallback, useEffect, useState } from 'react';
import { getVsCodeApi } from '../vscodeApi';
import {
  createRunSessionId,
  type RunSession,
  type RunSessionStatus,
} from '../types/runHistory';

const STORAGE_KEY = 'tursorRunSessions';

type StoredState = {
  sessions: RunSession[];
  currentSessionId: string | null;
};

function loadStoredState(): StoredState {
  const empty: StoredState = { sessions: [], currentSessionId: null };

  const vscode = getVsCodeApi();
  if (vscode) {
    const saved = vscode.getState() as { [STORAGE_KEY]?: StoredState } | null;
    const state = saved?.[STORAGE_KEY];
    if (state && Array.isArray(state.sessions)) {
      return {
        sessions: state.sessions,
        currentSessionId: state.currentSessionId ?? null,
      };
    }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredState;
      if (Array.isArray(parsed.sessions)) {
        return {
          sessions: parsed.sessions,
          currentSessionId: parsed.currentSessionId ?? null,
        };
      }
    }
  } catch {
    /* ignore */
  }

  return empty;
}

function persistState(state: StoredState): void {
  const vscode = getVsCodeApi();
  if (vscode) {
    const prev = (vscode.getState() as Record<string, unknown> | null) ?? {};
    vscode.setState({ ...prev, [STORAGE_KEY]: state });
  } else {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }
}

/** Local run sessions — one per Start/Retry; screenshots appended per session. */
export function useRunSessions() {
  const [sessions, setSessions] = useState<RunSession[]>(
    () => loadStoredState().sessions,
  );
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(
    () => loadStoredState().currentSessionId,
  );

  useEffect(() => {
    persistState({ sessions, currentSessionId });
  }, [sessions, currentSessionId]);

  const currentSession =
    sessions.find((s) => s.id === currentSessionId) ?? null;
  const screenshots = currentSession?.screenshots ?? [];

  const startNewSession = useCallback(
    (
      conversationId?: string | null,
      caseMeta?: {
        caseId?: string | null;
        responseId?: string | null;
        feature?: string | null;
        caseTitle?: string | null;
      },
    ) => {
      const id = createRunSessionId();
      const session: RunSession = {
        id,
        startedAt: Date.now(),
        screenshots: [],
        status: 'running',
        conversationId: conversationId ?? null,
        caseId: caseMeta?.caseId ?? null,
        responseId: caseMeta?.responseId ?? null,
        feature: caseMeta?.feature ?? null,
        caseTitle: caseMeta?.caseTitle ?? null,
      };
      setSessions((prev) => {
        const closed = prev.map((s) =>
          s.status === 'running' ? { ...s, status: 'fail' as const } : s,
        );
        return [session, ...closed];
      });
      setCurrentSessionId(id);
      return id;
    },
    [],
  );

  const appendScreenshot = useCallback((url: string) => {
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.status === 'running');
      if (idx === -1) return prev;
      const next = [...prev];
      const session = next[idx]!;
      next[idx] = {
        ...session,
        screenshots: [...session.screenshots, url],
      };
      return next;
    });
  }, []);

  const attachRun = useCallback(
    (runId: string, conversationId: string | null) => {
      setSessions((prev) => {
        const idx = prev.findIndex((s) => s.status === 'running');
        if (idx === -1) {
          return [
            {
              id: runId,
              startedAt: Date.now(),
              screenshots: [],
              status: 'running' as const,
              conversationId,
            },
            ...prev,
          ];
        }
        const next = [...prev];
        const session = next[idx]!;
        next[idx] = {
          ...session,
          id: runId,
          conversationId: conversationId ?? session.conversationId ?? null,
        };
        return next;
      });
      setCurrentSessionId(runId);
    },
    [],
  );

  const completeCurrentSession = useCallback((status: RunSessionStatus) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.status === 'running' || s.status === 'queued' ? { ...s, status } : s,
      ),
    );
  }, []);

  /** A group run: one session per case, the first running and the rest queued. */
  const queueCaseSessions = useCallback(
    (
      conversationId: string,
      cases: Array<{
        caseId: string;
        responseId: string;
        feature: string;
        caseTitle: string;
        suiteId: string;
      }>,
    ) => {
      const now = Date.now();
      const queued: RunSession[] = cases.map((item, index) => ({
        id: createRunSessionId(),
        startedAt: now + index,
        screenshots: [],
        status: index === 0 ? 'running' : 'queued',
        conversationId,
        caseId: item.caseId,
        responseId: item.responseId,
        feature: item.feature,
        caseTitle: item.caseTitle,
        suiteId: item.suiteId || null,
      }));
      setSessions((prev) => {
        const closed = prev.map((s) =>
          s.status === 'running' || s.status === 'queued'
            ? { ...s, status: 'fail' as const }
            : s,
        );
        return [...queued, ...closed];
      });
      setCurrentSessionId(queued[0]?.id ?? null);
    },
    [],
  );

  /** The backend started this case: it becomes the running session. */
  const activateCase = useCallback(
    (caseId: string, runId: string, conversationId: string | null) => {
      setSessions((prev) => {
        const idx = prev.findIndex(
          (s) =>
            s.caseId === caseId &&
            (s.status === 'queued' || s.status === 'running'),
        );
        if (idx === -1) {
          return [
            {
              id: runId,
              startedAt: Date.now(),
              screenshots: [],
              status: 'running' as const,
              conversationId,
              caseId,
            },
            ...prev,
          ];
        }
        const next = [...prev];
        next[idx] = {
          ...next[idx]!,
          id: runId,
          status: 'running',
          startedAt: Date.now(),
        };
        return next;
      });
      setCurrentSessionId(runId);
    },
    [],
  );

  const completeCase = useCallback(
    (caseId: string, status: RunSessionStatus) => {
      setSessions((prev) => {
        const idx = prev.findIndex(
          (s) => s.caseId === caseId && s.status === 'running',
        );
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = { ...next[idx]!, status };
        return next;
      });
    },
    [],
  );

  return {
    sessions,
    currentSessionId,
    currentSession,
    screenshots,
    startNewSession,
    appendScreenshot,
    attachRun,
    completeCurrentSession,
    queueCaseSessions,
    activateCase,
    completeCase,
  };
}
