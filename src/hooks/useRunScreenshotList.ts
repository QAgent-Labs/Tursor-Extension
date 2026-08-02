import { useCallback, useEffect, useState } from "react";
import { getVsCodeApi } from "../vscodeApi";

const STORAGE_KEY = "tursorRunScreenshotUrls";

function loadStoredUrls(): string[] {
  const vscode = getVsCodeApi();
  if (vscode) {
    const saved = vscode.getState() as {
      [STORAGE_KEY]?: string[];
    } | null;
    const urls = saved?.[STORAGE_KEY];
    if (Array.isArray(urls)) {
      return urls.filter((u): u is string => typeof u === "string");
    }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((u): u is string => typeof u === "string");
      }
    }
  } catch {
    /* ignore */
  }
  return [];
}

function persistUrls(urls: string[]): void {
  const vscode = getVsCodeApi();
  if (vscode) {
    const prev = (vscode.getState() as Record<string, unknown> | null) ?? {};
    vscode.setState({ ...prev, [STORAGE_KEY]: urls });
  } else {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(urls));
    } catch {
      /* ignore */
    }
  }
}

/** Append-only screenshot URLs; persisted in webview / localStorage. */
export function useRunScreenshotList() {
  const [screenshots, setScreenshots] = useState<string[]>(loadStoredUrls);

  useEffect(() => {
    persistUrls(screenshots);
  }, [screenshots]);

  const appendScreenshot = useCallback((url: string) => {
    setScreenshots((prev) => [...prev, url]);
  }, []);

  const clearScreenshots = useCallback(() => {
    setScreenshots([]);
  }, []);

  return { screenshots, appendScreenshot, clearScreenshots };
}
