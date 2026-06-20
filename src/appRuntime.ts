import { env } from "./env";

/**
 * Where the UI is hosted:
 * - `extension`: VS Code / Cursor webview (real `acquireVsCodeApi`, host Socket.IO bridge, install script).
 * - `browser`: Vite dev or static preview — mocks install; Socket.IO runs in-page.
 *
 * Toggle with **`VITE_APP_RUNTIME`** in `.env`: `browser` | `extension`.
 * If unset, **auto**: `extension` when `acquireVsCodeApi` exists, otherwise `browser`.
 */
export type AppRuntimeMode = "extension" | "browser";

export function getAppRuntimeMode(): AppRuntimeMode {
  const forced = env.appRuntime;
  if (forced === "browser" || forced === "extension") {
    return forced;
  }
  const g = globalThis as { acquireVsCodeApi?: () => unknown };
  return typeof g.acquireVsCodeApi === "function" ? "extension" : "browser";
}

export function isBrowserMockRuntime(): boolean {
  return getAppRuntimeMode() === "browser";
}

export function isExtensionRuntime(): boolean {
  return getAppRuntimeMode() === "extension";
}
