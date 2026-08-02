import { useCallback, useEffect, useRef, useState } from "react";
import { useTursorWebSocket } from "../context/useTursorWebSocket";
import { parseRunLogEvent, type RunLogEntry } from "../types/runLogs";
import { parseStepUpdate } from "../types/runChat";

const MAX_LOG_ENTRIES = 500;

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
          category: "step",
          level: "info",
          message: step,
          timestamp: Date.now(),
        });
      }
    });
  }, [subscribe, appendLog]);

  return { logs, clearLogs };
}
