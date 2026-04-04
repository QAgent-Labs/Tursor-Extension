/**
 * VS Code / Cursor injects `acquireVsCodeApi` into the webview once.
 * Use postMessage / onDidReceiveMessage in extension.ts to talk to Node (run shell, files, etc.).
 */
export interface VsCodeApi {
  postMessage(data: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

type GlobalWithVsCode = typeof globalThis & {
  acquireVsCodeApi?: () => VsCodeApi;
};

let cached: VsCodeApi | null | undefined;

export function getVsCodeApi(): VsCodeApi | null {
  if (cached !== undefined) {
    return cached;
  }
  const g = globalThis as GlobalWithVsCode;
  if (typeof g.acquireVsCodeApi === "function") {
    try {
      cached = g.acquireVsCodeApi();
    } catch {
      cached = null;
    }
  } else {
    cached = null;
  }
  return cached;
}
