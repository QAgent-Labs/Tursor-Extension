import { env } from "./env";

/**
 * Where the UI is hosted — used only for the install mock (browser) vs real script (extension)
 * and the optional dev runtime badge. All other features use the same code paths.
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
