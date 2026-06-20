import { spawn, type ChildProcess } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { createTursorSocketHostBridge } from "./tursorSocketHost";

const outDir = __dirname;
const extensionRoot = path.join(outDir, "..");
const repoRoot = path.join(outDir, "../..");
dotenv.config({ path: path.join(extensionRoot, ".env") });
dotenv.config({ path: path.join(repoRoot, ".env"), override: true });

function backendHttpOrigin(): string {
  const raw = process.env.VITE_TURSOR_SOCKET_URL?.trim();
  if (!raw) return "";
  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
}

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
  if (idx === -1) return null;

  const jsonPart = line.slice(idx + STATUS_PREFIX.length).trim();

  try {
    const raw = JSON.parse(jsonPart) as Record<string, unknown>;

    if (!raw || typeof raw !== "object") return null;

    const phase = raw.phase;
    const state = raw.state;

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

    return {
      phase,
      state,
      ok: raw.ok as boolean | undefined,
      installed: raw.installed as boolean | undefined,
      message: raw.message as string | undefined,
      detail: raw.detail as string | undefined,
    };
  } catch {
    return null;
  }
}

/* ---------------- Backend Communication ---------------- */

async function sendRootToBackend(rootPath: string) {
  const origin = backendHttpOrigin();
  if (!origin) {
    console.warn(
      "[Tursor] VITE_TURSOR_SOCKET_URL missing in .env — skipping context/init",
    );
    return;
  }
  try {
    await fetch(`${origin}/context/init`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ rootPath }),
    });

    console.log("[Tursor] Root path sent:", rootPath);
  } catch (err) {
    console.error("[Tursor] Failed to send root path", err);
  }
}

async function notifyFileChange(path: string) {
  const origin = backendHttpOrigin();
  if (!origin) {
    return;
  }
  try {
    await fetch(`${origin}/context/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path }),
    });

    console.log("[Tursor] File change sent:", path);
  } catch (err) {
    console.error("[Tursor] Failed to notify file change", err);
  }
}

/* ---------------- Helpers ---------------- */

function shouldIgnore(path: string): boolean {
  return (
    path.includes("node_modules") ||
    path.includes(".git") ||
    path.includes("dist") ||
    path.includes(".next") ||
    path.includes("build")
  );
}

/* ---------------- Install Script Runner ---------------- */

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
      "install-tursor.sh is missing from extension",
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

  child.on("close", (code) => {
    void webview.postMessage({
      type: "tursorInstallFinished",
      code,
    });
    onSpawn(null);
  });
}

/* ---------------- Webview HTML ---------------- */

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
      const assetUri = vscode.Uri.joinPath(webviewRoot, ...relative.split("/"));
      return `${attr}="${webview.asWebviewUri(assetUri)}"`;
    },
  );

  const csp = `
    default-src 'none';
    style-src ${webview.cspSource} 'unsafe-inline';
    script-src ${webview.cspSource};
    img-src ${webview.cspSource} https: data:;
    font-src ${webview.cspSource};
    connect-src ${webview.cspSource} http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*;
    frame-src https: http: data: blob: ${webview.cspSource};
  `;

  html = html.replace(
    "<head>",
    `<head><meta http-equiv="Content-Security-Policy" content="${csp}">`,
  );

  return html;
}

/* ---------------- Activate ---------------- */

export function activate(context: vscode.ExtensionContext): void {
  const folders = vscode.workspace.workspaceFolders;

  if (!folders || folders.length === 0) {
    vscode.window.showErrorMessage("No workspace folder opened");
    return;
  }

  let rootPath = folders[0].uri.fsPath;
  sendRootToBackend(rootPath);

  /* ---- Watch workspace changes ---- */
  const workspaceListener = vscode.workspace.onDidChangeWorkspaceFolders(() => {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) return;

    rootPath = folders[0].uri.fsPath;
    sendRootToBackend(rootPath);
  });

  /* ---- File watcher with debounce ---- */
  const watcher = vscode.workspace.createFileSystemWatcher("**/*");

  const debounceMap = new Map<string, NodeJS.Timeout>();

  function notifyFileChangeDebounced(path: string) {
    if (shouldIgnore(path)) return;

    if (debounceMap.has(path)) {
      clearTimeout(debounceMap.get(path)!);
    }

    const timeout = setTimeout(() => {
      notifyFileChange(path);
      debounceMap.delete(path);
    }, 300);

    debounceMap.set(path, timeout);
  }

  watcher.onDidChange((uri) => notifyFileChangeDebounced(uri.fsPath));
  watcher.onDidCreate((uri) => notifyFileChangeDebounced(uri.fsPath));
  watcher.onDidDelete((uri) => notifyFileChangeDebounced(uri.fsPath));

  context.subscriptions.push(watcher, workspaceListener);

  /* ---- Command: Open Panel ---- */
  const open = vscode.commands.registerCommand("tursor.openPanel", () => {
    const panel = vscode.window.createWebviewPanel(
      PANEL_VIEW_TYPE,
      "Tursor",
      vscode.ViewColumn.One,
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
      if (socketBridge.handleWebviewMessage(message)) return;

      if (isRunInstallMessage(message)) {
        installChild?.kill("SIGTERM");
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
