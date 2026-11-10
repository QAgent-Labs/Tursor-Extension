import type { GeneratedReport } from '../api/chat';
import { getVsCodeApi } from '../vscodeApi';

export type SaveReportResult =
  | { ok: true; path: string | null }
  | { ok: false; cancelled: boolean; error: string | null };

function downloadInBrowser(report: GeneratedReport): SaveReportResult {
  const bytes =
    report.encoding === 'base64'
      ? Uint8Array.from(atob(report.content), (char) => char.charCodeAt(0))
      : new TextEncoder().encode(report.content);
  const url = URL.createObjectURL(
    new Blob([bytes], { type: report.contentType }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = report.filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  return { ok: true, path: null };
}

/** In VS Code the host opens a Save dialog; in the browser it is a normal download. */
export function saveReportFile(
  report: GeneratedReport,
): Promise<SaveReportResult> {
  const vscode = getVsCodeApi();
  if (!vscode) {
    return Promise.resolve(downloadInBrowser(report));
  }
  const requestId = `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return new Promise((resolve) => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as {
        type?: string;
        requestId?: string;
        ok?: boolean;
        path?: string | null;
        cancelled?: boolean;
        error?: string | null;
      };
      if (data?.type !== 'tursorReportSaved' || data.requestId !== requestId) {
        return;
      }
      window.removeEventListener('message', onMessage);
      resolve(
        data.ok
          ? { ok: true, path: data.path ?? null }
          : {
              ok: false,
              cancelled: data.cancelled === true,
              error: data.error ?? null,
            },
      );
    };
    window.addEventListener('message', onMessage);
    vscode.postMessage({
      command: 'saveReport',
      requestId,
      filename: report.filename,
      encoding: report.encoding,
      content: report.content,
    });
  });
}
