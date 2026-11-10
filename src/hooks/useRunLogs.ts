import { useCallback, useEffect, useRef, useState } from "react";
import { useTursorWebSocket } from "../context/useTursorWebSocket";
import {
  dividerEntry,
  parseRunLogEvent,
  type RunLogEntry,
} from "../types/runLogs";
import { parseStepUpdate } from "../types/runChat";

const MAX_LOG_ENTRIES = 1000;

export function useRunLogs() {
  const { subscribe } = useTursorWebSocket();
  const [logs, setLogs] = useState<RunLogEntry[]>([]);
  const logsRef = useRef<RunLogEntry[]>([]);

  const appendLog = useCallback((entry: RunLogEntry) => {
    logsRef.current = [...logsRef.current, entry].slice(-MAX_LOG_ENTRIES);
    setLogs(logsRef.current);
  }, []);

  const clearLogs = useCallback(() => {
    logsRef.current = [];
    setLogs([]);
  }, []);

  /** Mark where a run starts instead of wiping earlier lines. */
  const addDivider = useCallback(
    (label: string) => appendLog(dividerEntry(label)),
    [appendLog],
  );

  useEffect(() => {
    return subscribe((data) => {
      const entry = parseRunLogEvent(data);
      if (entry) {
        appendLog(entry);
        return;
      }

      const step = parseStepUpdate(data);
      if (step) {
        appendLog({
          id: `step-${Date.now()}`,
          source: "backend",
          category: "step",
          level: "info",
          message: step,
          timestamp: Date.now(),
        });
      }
    });
  }, [subscribe, appendLog]);

  return { logs, clearLogs, addDivider };
}
