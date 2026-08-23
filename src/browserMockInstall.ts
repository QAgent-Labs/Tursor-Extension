import type { InstallHostToWebviewMessage } from "./types/installStatus";
import { INSTALL_STEP_ORDER } from "./types/installStatus";

function post(data: InstallHostToWebviewMessage): void {
  window.dispatchEvent(new MessageEvent("message", { data }));
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Simulates extension → webview install messages so InitialSetupPage works in the browser.
 */
export async function runBrowserMockInstall(): Promise<void> {
  const step = 380;

  for (const phase of INSTALL_STEP_ORDER) {
    post({ type: "tursorInstallStatus", payload: { phase, state: "start" } });
    await delay(step);
    post({
      type: "tursorInstallStatus",
      payload: {
        phase,
        state: "done",
        ok: true,
        port: phase === "ensure_running" ? 9090 : undefined,
        aiPort: phase === "ensure_ai_running" ? 8000 : undefined,
      },
    });
    await delay(step);
  }

  post({ type: "tursorInstallFinished", code: 0 });
  post({
    type: "tursorBackendResolved",
    port: 9090,
    origin: "http://127.0.0.1:9090",
  });
}
