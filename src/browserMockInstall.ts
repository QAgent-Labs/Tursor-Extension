import type { InstallHostToWebviewMessage } from "./types/installStatus";

function post(data: InstallHostToWebviewMessage): void {
  window.dispatchEvent(new MessageEvent("message", { data }));
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Simulates extension → webview install messages so SetupPage works in the browser.
 */
export async function runBrowserMockInstall(): Promise<void> {
  const step = 380;

  post({
    type: "tursorInstallStatus",
    payload: { phase: "check_install", state: "start" },
  });
  await delay(step);
  post({
    type: "tursorInstallStatus",
    payload: {
      phase: "check_install",
      state: "done",
      ok: true,
      installed: false,
    },
  });
  await delay(step);

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
      payload: { phase, state: "done", ok: true },
    });
    await delay(step);
  }

  post({ type: "tursorInstallFinished", code: 0 });
}
