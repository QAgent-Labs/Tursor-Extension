import { spawn, type ChildProcess } from "node:child_process";
import * as fs from "node:fs";
import * as vscode from "vscode";
import { createTursorSocketHostBridge } from "./tursorSocketHost";

const PANEL_VIEW_TYPE = "tursorPanel";
const STATUS_PREFIX = "__TURSOR_STATUS__";

type WebviewToHostMessage = { command: "runInstallScript" };

type InstallPhase =
  | "check_install"
  | "clone_repo"
  | "build"
  | "cli_install"
  | "ensure_running";

type InstallStatusPayload = {
  phase: InstallPhase;
  state: "start" | "done" | "skipped";
  ok?: boolean;
  installed?: boolean;
  message?: string;
  detail?: string;
};

function isRunInstallMessage(msg: unknown): msg is WebviewToHostMessage {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as WebviewToHostMessage).command === "runInstallScript"
  );
}

function parseStatusLine(line: string): InstallStatusPayload | null {
  const idx = line.indexOf(STATUS_PREFIX);
  if (idx === -1) {
    return null;
  }
  const jsonPart = line.slice(idx + STATUS_PREFIX.length).trim();
  try {
    const raw = JSON.parse(jsonPart) as unknown;
    if (!raw || typeof raw !== "object") {
      return null;
    }
    const o = raw as Record<string, unknown>;
    const phase = o.phase;
    const state = o.state;
    if (
      phase !== "check_install" &&
      phase !== "clone_repo" &&
      phase !== "build" &&
      phase !== "cli_install" &&
      phase !== "ensure_running"
    ) {
      return null;
    }
    if (state !== "start" && state !== "done" && state !== "skipped") {
      return null;
    }
    const payload: InstallStatusPayload = { phase, state };
    if (typeof o.ok === "boolean") {
      payload.ok = o.ok;
    }
    if (typeof o.installed === "boolean") {
      payload.installed = o.installed;
    }
    if (typeof o.message === "string") {
      payload.message = o.message;
    }
    if (typeof o.detail === "string") {
      payload.detail = o.detail;
    }
    return payload;
  } catch {
    return null;
  }
}

function runInstallScript(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  onSpawn: (child: ChildProcess | null) => void,
): void {
  const scriptUri = vscode.Uri.joinPath(
    extensionUri,
    "scripts",
    "install-tursor.sh",
  );
  if (!fs.existsSync(scriptUri.fsPath)) {
    void vscode.window.showErrorMessage(
      "install-tursor.sh is missing from this extension. Run npm run build:webview from the repo root, then reload the window.",
    );
    void webview.postMessage({ type: "tursorInstallFinished", code: 1 });
    onSpawn(null);
    return;
  }

  const bash = process.platform === "win32" ? "bash" : "/bin/bash";
  const child = spawn(bash, [scriptUri.fsPath], {
    env: { ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  onSpawn(child);

  let incompleteLine = "";
  const onChunk = (chunk: Buffer) => {
    incompleteLine += chunk.toString("utf8");
    const lines = incompleteLine.split("\n");
    incompleteLine = lines.pop() ?? "";
    for (const line of lines) {
      const payload = parseStatusLine(line);
      if (payload) {
        void webview.postMessage({
          type: "tursorInstallStatus",
          payload,
        });
      }
    }
  };

  child.stdout?.on("data", onChunk);
  child.stderr?.on("data", onChunk);

  child.on("error", (err) => {
    console.error("[Tursor install]", err);
    void webview.postMessage({
      type: "tursorInstallFinished",
      code: 1,
    });
    onSpawn(null);
  });

  child.on("close", (code) => {
    if (incompleteLine.trim()) {
      const payload = parseStatusLine(incompleteLine);
      if (payload) {
        void webview.postMessage({
          type: "tursorInstallStatus",
          payload,
        });
      }
    }
    void webview.postMessage({
      type: "tursorInstallFinished",
      code,
    });
    onSpawn(null);
  });
}

/**
 * Rewrites ./relative asset URLs in the built index.html to vscode-webview: URIs
 * so the UI loads inside the webview sandbox.
 */
function getWebviewHtml(
  extensionUri: vscode.Uri,
  webview: vscode.Webview,
): string {
  const webviewRoot = vscode.Uri.joinPath(extensionUri, "media", "webview");
  const indexPath = vscode.Uri.joinPath(webviewRoot, "index.html");
  let html = fs.readFileSync(indexPath.fsPath, "utf8");

  html = html.replace(
    /(src|href)="(\.\/[^"]+)"/g,
    (_match, attr: string, relPath: string) => {
      const relative = relPath.replace(/^\.\//, "");
      const assetUri = vscode.Uri.joinPath(
        webviewRoot,
        ...relative.split("/").filter(Boolean),
      );
      const webviewUri = webview.asWebviewUri(assetUri).toString();
      return `${attr}="${webviewUri}"`;
    },
  );

  const connectHosts = ["127.0.0.1", "localhost"] as const;
  const connectPorts = [9090, 8080, 3000, 8765, 5173] as const;
  const connectParts: string[] = [webview.cspSource];
  for (const host of connectHosts) {
    for (const port of connectPorts) {
      connectParts.push(`http://${host}:${port}`, `ws://${host}:${port}`);
    }
  }
  const connectSrc = connectParts.join(" ");

  const csp = [
    `default-src 'none'`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `script-src ${webview.cspSource}`,
    `img-src ${webview.cspSource} https: data:`,
    `font-src ${webview.cspSource}`,
    `connect-src ${connectSrc}`,
  ].join("; ");

  html = html.replace(
    "<head>",
    `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}">`,
  );

  return html;
}

export function activate(context: vscode.ExtensionContext): void {
  const open = vscode.commands.registerCommand("tursor.openPanel", () => {
    const column =
      vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;

    const panel = vscode.window.createWebviewPanel(
      PANEL_VIEW_TYPE,
      "Tursor",
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, "media", "webview"),
        ],
      },
    );

    let installChild: ChildProcess | null = null;
    const socketBridge = createTursorSocketHostBridge(panel.webview);

    panel.webview.html = getWebviewHtml(context.extensionUri, panel.webview);

    panel.onDidDispose(() => {
      socketBridge.dispose();
      installChild?.kill("SIGTERM");
      installChild = null;
    });

    panel.webview.onDidReceiveMessage((message: unknown) => {
      if (socketBridge.handleWebviewMessage(message)) {
        return;
      }
      if (isRunInstallMessage(message)) {
        installChild?.kill("SIGTERM");
        installChild = null;
        runInstallScript(panel.webview, context.extensionUri, (c) => {
          installChild = c;
        });
        return;
      }
      console.log("[Tursor webview]", message);
    });
  });

  context.subscriptions.push(open);
}

export function deactivate(): void {}
