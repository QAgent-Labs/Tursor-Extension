import type { InstallHostToWebviewMessage } from "./types/installStatus";

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

  for (const phase of [
    "clone_repo",
    "build",
    "cli_install",
    "ensure_running",
  ] as const) {
    post({ type: "tursorInstallStatus", payload: { phase, state: "start" } });
    await delay(step);
    post({
      type: "tursorInstallStatus",
      payload: { phase, state: "done", ok: true, port: 9090 },
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
