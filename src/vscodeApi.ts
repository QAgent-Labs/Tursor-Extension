import { isBrowserMockRuntime } from "./appRuntime";
import { ensureHostSocketBridgeTap } from "./vscodeHostSocketBridge";

/**
 * VS Code / Cursor injects `acquireVsCodeApi` into the webview once.
 * Use postMessage / onDidReceiveMessage in extension.ts to talk to Node (run shell, files, etc.).
 *
 * In **browser** runtime (`VITE_APP_RUNTIME` in `.env`, or auto-detected), returns `null` so the app uses
 * mocks / in-page Socket.IO instead of the extension host.
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
  if (isBrowserMockRuntime()) {
    cached ??= null;
    return null;
  }

  if (cached !== undefined) {
    if (cached) ensureHostSocketBridgeTap();
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
  if (cached) ensureHostSocketBridgeTap();
  return cached;
}
