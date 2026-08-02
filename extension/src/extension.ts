import { spawn, execSync, type ChildProcess } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as vscode from "vscode";
import dotenv from "dotenv";
import {
  createTursorSocketHostBridge,
  type WorkspaceInitPayload,
} from "./tursorSocketHost";

const outDir = __dirname;
const extensionRoot = path.join(outDir, "..");
const repoRoot = path.join(outDir, "../..");
dotenv.config({ path: path.join(extensionRoot, ".env") });
dotenv.config({ path: path.join(repoRoot, ".env"), override: true });

const DEFAULT_BACKEND_PORT = 9090;

/** User-local CLI from install script (`~/.tursor/npm-global/bin`), not system npm -g. */
function tursorCliBinDir(): string {
  return path.join(os.homedir(), ".tursor", "npm-global", "bin");
}

function pathKeyForPlatform(): "Path" | "PATH" {
  return process.platform === "win32" ? "Path" : "PATH";
}

function prependPathSegments(current: string, segments: string[]): string {
  const parts = current.split(path.delimiter).filter(Boolean);
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i];
    if (seg && !parts.includes(seg)) {
      parts.unshift(seg);
    }
  }
  return parts.join(path.delimiter);
}

/** Cached once per extension host session — login shell spawn is very slow in GUI apps. */
let cachedLoginShellPath: string | null | undefined;

/** macOS/Linux GUI apps often lack Homebrew/nvm on PATH — resolve a login-shell PATH when possible. */
function loginShellPath(): string | null {
  if (cachedLoginShellPath !== undefined) {
    return cachedLoginShellPath;
  }
  if (process.platform === "win32") {
    cachedLoginShellPath = null;
    return cachedLoginShellPath;
  }
  const shell = process.env.SHELL?.trim() || "/bin/zsh";
  try {
    cachedLoginShellPath = execSync(`${shell} -lic 'printf %s "$PATH"'`, {
      encoding: "utf8",
      timeout: 3000,
      env: { ...process.env, HOME: os.homedir() },
    }).trim();
  } catch {
    cachedLoginShellPath = null;
  }
  return cachedLoginShellPath;
}

function standardNodeBinDirs(): string[] {
  const home = os.homedir();
  const dirs = [
    "/opt/homebrew/bin",
    "/usr/local/bin",
    path.dirname(process.execPath),
    path.join(home, ".fnm", "current", "bin"),
    path.join(home, ".volta", "bin"),
  ];
  const nvmRoot = path.join(home, ".nvm", "versions", "node");
  try {
    const versions = fs
      .readdirSync(nvmRoot)
      .filter((v) => fs.existsSync(path.join(nvmRoot, v, "bin", "npm")));
    versions.sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true }),
    );
    const latest = versions.at(-1);
    if (latest) {
      dirs.push(path.join(nvmRoot, latest, "bin"));
    }
  } catch {
    /* no nvm */
  }
  return dirs;
}

function findNpmOnPath(pathValue: string): string | null {
  for (const dir of pathValue.split(path.delimiter).filter(Boolean)) {
    const npm =
      process.platform === "win32"
        ? path.join(dir, "npm.cmd")
        : path.join(dir, "npm");
    if (fs.existsSync(npm)) {
      return npm;
    }
  }
  return null;
}

function resolveNpmExecutable(pathValue: string): string | null {
  const fromPath = findNpmOnPath(pathValue);
  if (fromPath) {
    return fromPath;
  }
  for (const dir of standardNodeBinDirs()) {
    const npm =
      process.platform === "win32"
        ? path.join(dir, "npm.cmd")
        : path.join(dir, "npm");
    if (fs.existsSync(npm)) {
      return npm;
    }
  }
  return null;
}

function buildPathWithTursorCli(seed: string): string {
  return prependPathSegments(seed, [
    tursorCliBinDir(),
    ...standardNodeBinDirs(),
  ]);
}

/** Install script sets up its own PATH — avoid blocking on login-shell PATH resolution. */
function envForInstallScript(
  base: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const pathKey = pathKeyForPlatform();
  let nextPath = buildPathWithTursorCli(base[pathKey] ?? "");
  const npm = resolveNpmExecutable(nextPath);
  if (npm) {
    nextPath = prependPathSegments(nextPath, [path.dirname(npm)]);
  }
  const env: NodeJS.ProcessEnv = { ...base, [pathKey]: nextPath };
  if (npm) {
    env.TURSOR_NPM = npm;
  }
  return env;
}

function envWithTursorCliOnPath(
  base: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const pathKey = pathKeyForPlatform();
  let nextPath = buildPathWithTursorCli(base[pathKey] ?? "");
  let npm = resolveNpmExecutable(nextPath);
  const localCli = path.join(tursorCliBinDir(), "tursor");

  if (!npm || !fs.existsSync(localCli)) {
    const loginPath = loginShellPath();
    if (loginPath) {
      nextPath = buildPathWithTursorCli(loginPath);
      npm = resolveNpmExecutable(nextPath) ?? npm;
    }
  }

  if (npm) {
    nextPath = prependPathSegments(nextPath, [path.dirname(npm)]);
  }

  const env: NodeJS.ProcessEnv = { ...base, [pathKey]: nextPath };
  if (npm) {
    env.TURSOR_NPM = npm;
  }
  return env;
}

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

type WebviewToHostMessage =
  | { command: "runInstallScript" }
  | { command: "runTursorStart" }
  | {
      command: "probeTursorStatus";
      requestId: string;
      hintPort?: number | null;
    }
  | { command: "checkTursorCli"; requestId: string }
  | { command: "pickWorkspaceFolder" }
  | { command: "requestDefaultWorkspace" };

type TursorSetupPhase = "needs_install" | "needs_start" | "ready";

type InstallPhase =
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
  port?: number;
};

function isRunInstallMessage(msg: unknown): msg is WebviewToHostMessage {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as WebviewToHostMessage).command === "runInstallScript"
  );
}

function isProbeStatusMessage(
  msg: unknown,
): msg is Extract<WebviewToHostMessage, { command: "probeTursorStatus" }> {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as { command?: string }).command === "probeTursorStatus" &&
    typeof (msg as { requestId?: unknown }).requestId === "string"
  );
}

function isRunTursorStartMessage(msg: unknown): msg is { command: "runTursorStart" } {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as { command?: string }).command === "runTursorStart"
  );
}

function isCheckTursorCliMessage(
  msg: unknown,
): msg is Extract<WebviewToHostMessage, { command: "checkTursorCli" }> {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as { command?: string }).command === "checkTursorCli" &&
    typeof (msg as { requestId?: unknown }).requestId === "string"
  );
}

function isPickWorkspaceMessage(msg: unknown): boolean {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as { command?: string }).command === "pickWorkspaceFolder"
  );
}

function isRequestDefaultWorkspaceMessage(msg: unknown): boolean {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as { command?: string }).command === "requestDefaultWorkspace"
  );
}

async function fetchHealthStatus(
  hintPort: number,
): Promise<{ running: boolean; port: number | null }> {
  try {
    const res = await fetch(`http://127.0.0.1:${hintPort}/health`);
    if (!res.ok) {
      return { running: false, port: null };
    }
    const data = (await res.json()) as { port?: number };
    const port =
      typeof data.port === "number" && data.port > 0 ? data.port : hintPort;
    return { running: true, port };
  } catch {
    return { running: false, port: null };
  }
}

function resolveBackendPortViaCli(
  hintPort?: number | null,
): Promise<{ running: boolean; port: number | null; origin: string | null }> {
  return new Promise((resolve) => {
    const args = ["port", "--json"];
    if (typeof hintPort === "number" && hintPort > 0) {
      args.push("--port", String(hintPort));
    }

    const child = spawn("tursor", args, {
      env: envWithTursorCliOnPath(),
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({ running: false, port: null, origin: null });
    }, 3_000);

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });

    child.on("close", () => {
      clearTimeout(timer);
      try {
        const line = stdout.trim().split("\n").pop() ?? stdout.trim();
        const parsed = JSON.parse(line) as {
          running?: boolean;
          port?: number | null;
          origin?: string | null;
        };
        const port =
          typeof parsed.port === "number" && parsed.port > 0
            ? parsed.port
            : null;
        resolve({
          running: parsed.running === true,
          port,
          origin:
            typeof parsed.origin === "string" && parsed.origin.trim()
              ? parsed.origin.trim()
              : port
                ? `http://127.0.0.1:${port}`
                : null,
        });
      } catch {
        resolve({ running: false, port: null, origin: null });
      }
    });

    child.on("error", () => {
      clearTimeout(timer);
      resolve({ running: false, port: null, origin: null });
    });
  });
}

async function probeTursorStatus(
  hintPort?: number | null,
): Promise<{ running: boolean; port: number | null }> {
  const hint =
    typeof hintPort === "number" && hintPort > 0 ? hintPort : DEFAULT_BACKEND_PORT;
  const health = await fetchHealthStatus(hint);
  if (health.running && health.port) {
    return health;
  }
  const viaCli = await resolveBackendPortViaCli(hintPort);
  if (viaCli.running && viaCli.port) {
    return { running: true, port: viaCli.port };
  }
  return health;
}

function tursorHomeDir(): string {
  return path.join(os.homedir(), ".tursor");
}

function tursorCliPath(): string {
  return path.join(tursorCliBinDir(), "tursor");
}

type TursorStatusJsonResult =
  | { outcome: "cli_missing" }
  | { outcome: "not_running" }
  | { outcome: "running"; port: number };

function parseJsonLineFromCliOutput(stdout: string): Record<string, unknown> | null {
  const lines = stdout.trim().split("\n").filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i]?.trim();
    if (!line?.startsWith("{")) {
      continue;
    }
    try {
      return JSON.parse(line) as Record<string, unknown>;
    } catch {
      /* try previous line */
    }
  }
  return null;
}

function runTursorStatusJson(): Promise<TursorStatusJsonResult> {
  return new Promise((resolve) => {
    const cliPath = tursorCliPath();
    const command = fs.existsSync(cliPath) ? cliPath : "tursor";

    const child = spawn(command, ["status", "--json"], {
      env: envWithTursorCliOnPath(),
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let settled = false;

    const finish = (result: TursorStatusJsonResult) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(result);
    };

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      finish({ outcome: "cli_missing" });
    }, 4_000);

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });

    child.on("error", () => {
      clearTimeout(timer);
      finish({ outcome: "cli_missing" });
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      const parsed = parseJsonLineFromCliOutput(stdout);
      if (parsed && parsed.running === true) {
        const port =
          typeof parsed.port === "number" && parsed.port > 0
            ? parsed.port
            : 9090;
        finish({ outcome: "running", port });
        return;
      }
      if (parsed && parsed.running === false) {
        finish({ outcome: "not_running" });
        return;
      }
      if (code === 0) {
        finish({ outcome: "running", port: 9090 });
        return;
      }
      if (!fs.existsSync(cliPath) && command === "tursor") {
        finish({ outcome: "cli_missing" });
        return;
      }
      finish({ outcome: "not_running" });
    });
  });
}

async function checkTursorSetupState(): Promise<{
  phase: TursorSetupPhase;
  port: number | null;
}> {
  const health = await fetchHealthStatus(DEFAULT_BACKEND_PORT);
  if (health.running && health.port) {
    return { phase: "ready", port: health.port };
  }

  const cliPath = tursorCliPath();
  if (!fs.existsSync(cliPath)) {
    return { phase: "needs_install", port: null };
  }

  const status = await runTursorStatusJson();
  if (status.outcome === "cli_missing") {
    return { phase: "needs_install", port: null };
  }
  if (status.outcome === "running") {
    return { phase: "ready", port: status.port };
  }
  return { phase: "needs_start", port: null };
}

async function pickWorkspaceFolder(webview: vscode.Webview): Promise<void> {
  const picked = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    openLabel: "Select workspace",
  });
  const folder = picked?.[0]?.fsPath;
  if (folder) {
    void webview.postMessage({
      type: "tursorWorkspacePicked",
      workspacePath: folder,
    });
  }
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
      port: typeof raw.port === "number" && raw.port > 0 ? raw.port : undefined,
    };
  } catch {
    return null;
  }
}

function buildWorkspaceInitPayload(): WorkspaceInitPayload | null {
  const folders = vscode.workspace.workspaceFolders;
  const workspacePath = folders?.[0]?.uri.fsPath;
  if (!workspacePath) {
    return null;
  }
  return { type: "workspace_init", workspacePath };
}

const activeSocketBridges = new Set<{ emitWorkspaceInit: () => void }>();
const activePanelWebviews = new Set<vscode.Webview>();

function postEditorWorkspace(webview: vscode.Webview): void {
  const wp = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
  if (!wp) {
    return;
  }
  void webview.postMessage({
    type: "tursorSeedWorkspace",
    workspacePath: wp,
  });
}

function broadcastEditorWorkspace(): void {
  for (const webview of activePanelWebviews) {
    postEditorWorkspace(webview);
  }
}

function broadcastWorkspaceInit(): void {
  for (const bridge of activeSocketBridges) {
    bridge.emitWorkspaceInit();
  }
}

/* ---------------- Backend Communication ---------------- */

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

function runTursorStart(
  webview: vscode.Webview,
  onSpawn: (child: ChildProcess | null) => void,
): void {
  const tursorDir = tursorHomeDir();
  const cliPath = tursorCliPath();
  if (!fs.existsSync(cliPath)) {
    void webview.postMessage({ type: "tursorStartFinished", code: 1 });
    onSpawn(null);
    return;
  }

  const child = spawn(cliPath, ["start"], {
    cwd: tursorDir,
    env: envWithTursorCliOnPath(),
    stdio: ["ignore", "pipe", "pipe"],
  });

  onSpawn(child);

  child.on("close", (code) => {
    void (async () => {
      const exitCode = code ?? 1;
      if (exitCode === 0) {
        const state = await checkTursorSetupState();
        if (state.phase === "ready" && state.port) {
          await webview.postMessage({
            type: "tursorBackendResolved",
            port: state.port,
            origin: `http://127.0.0.1:${state.port}`,
          });
        }
      }
      await webview.postMessage({
        type: "tursorStartFinished",
        code: exitCode,
      });
      onSpawn(null);
    })();
  });

  child.on("error", (err) => {
    console.error("[Tursor] tursor start failed", err);
    void webview.postMessage({ type: "tursorStartFinished", code: 1 });
    onSpawn(null);
  });
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
      "install-tursor.sh is missing from extension",
    );
    void webview.postMessage({ type: "tursorInstallFinished", code: 1 });
    onSpawn(null);
    return;
  }

  void webview.postMessage({
    type: "tursorInstallStatus",
    payload: { phase: "clone_repo", state: "start" },
  });

  const bash = process.platform === "win32" ? "bash" : "/bin/bash";

  const siblingBackend = path.join(repoRoot, "..", "Tursor-Backend");
  const installEnv = envForInstallScript({ ...process.env });
  if (!installEnv.TURSOR_BACKEND_SOURCE?.trim() &&
    fs.existsSync(path.join(siblingBackend, "package.json"))
  ) {
    installEnv.TURSOR_BACKEND_SOURCE = siblingBackend;
  }

  const npmPath = resolveNpmExecutable(
    installEnv[pathKeyForPlatform()] ?? "",
  );
  if (npmPath) {
    installEnv.TURSOR_NPM = npmPath;
  } else {
    void vscode.window.showWarningMessage(
      "Tursor install: npm was not found. Install Node.js or open Cursor from Terminal (so PATH includes npm), then retry setup.",
    );
  }

  installEnv.TURSOR_FORCE_FULL_INSTALL = "1";
  installEnv.TURSOR_CLI_PREFIX = path.join(os.homedir(), ".tursor", "npm-global");

  const bashArgs =
    process.platform === "win32"
      ? [scriptUri.fsPath]
      : ["--noprofile", "--norc", scriptUri.fsPath];

  const child = spawn(bash, bashArgs, {
    env: installEnv,
    stdio: ["ignore", "pipe", "pipe"],
  });

  onSpawn(child);

  let incompleteLine = "";

  const onChunk = (chunk: Buffer) => {
    incompleteLine += chunk.toString("utf8");
    const lines = incompleteLine.split("\n");
    incompleteLine = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.replace(/\r$/, "").trim();
      if (!trimmed.includes(STATUS_PREFIX)) {
        continue;
      }
      const payload = parseStatusLine(trimmed);
      if (!payload) {
        continue;
      }
      void webview.postMessage({
        type: "tursorInstallStatus",
        payload,
      });
    }
  };

  child.stdout?.on("data", onChunk);
  child.stderr?.on("data", onChunk);

  child.on("error", (err) => {
    console.error("[Tursor] install script spawn failed", err);
    void webview.postMessage({
      type: "tursorInstallStatus",
      payload: {
        phase: "clone_repo",
        state: "done",
        ok: false,
        message: err instanceof Error ? err.message : String(err),
      },
    });
    void webview.postMessage({ type: "tursorInstallFinished", code: 1 });
    onSpawn(null);
  });

  child.on("close", (code) => {
    void (async () => {
      if (code === 0) {
        const resolved = await resolveBackendPortViaCli(null);
        if (resolved.running && resolved.port) {
          await webview.postMessage({
            type: "tursorBackendResolved",
            port: resolved.port,
            origin: resolved.origin,
          });
        }
      }
      await webview.postMessage({
        type: "tursorInstallFinished",
        code,
      });
      onSpawn(null);
    })();
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

function openTursorPanel(context: vscode.ExtensionContext): void {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    void vscode.window.showWarningMessage(
      "Tursor: open a folder in Cursor for workspace context and runs. You can still use Setup and pick a workspace in the panel.",
    );
  }

  const panel = vscode.window.createWebviewPanel(
    PANEL_VIEW_TYPE,
    "Tursor",
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, "media", "webview"),
        vscode.Uri.joinPath(context.extensionUri, "media"),
      ],
    },
  );
  panel.iconPath = vscode.Uri.joinPath(
    context.extensionUri,
    "media",
    "icon.png",
  );

  let installChild: ChildProcess | null = null;
  let startChild: ChildProcess | null = null;
  const socketBridge = createTursorSocketHostBridge(panel.webview, {
    getWorkspaceInit: buildWorkspaceInitPayload,
  });
  activeSocketBridges.add(socketBridge);
  activePanelWebviews.add(panel.webview);

  panel.webview.html = getWebviewHtml(context.extensionUri, panel.webview);
  postEditorWorkspace(panel.webview);
  setTimeout(() => socketBridge.syncSocketState(), 300);

  panel.onDidDispose(() => {
    activeSocketBridges.delete(socketBridge);
    activePanelWebviews.delete(panel.webview);
    socketBridge.dispose();
    installChild?.kill("SIGTERM");
    startChild?.kill("SIGTERM");
    installChild = null;
    startChild = null;
  });

  panel.webview.onDidReceiveMessage((message: unknown) => {
    if (socketBridge.handleWebviewMessage(message)) return;

    if (isProbeStatusMessage(message)) {
      const hintPort =
        typeof message.hintPort === "number" && message.hintPort > 0
          ? message.hintPort
          : null;
      void probeTursorStatus(hintPort).then((status) => {
        void panel.webview.postMessage({
          type: "tursorStatusResult",
          requestId: message.requestId,
          status,
        });
      });
      return;
    }

    if (isCheckTursorCliMessage(message)) {
      void checkTursorSetupState().then((result) => {
        void panel.webview.postMessage({
          type: "tursorCliCheckResult",
          requestId: message.requestId,
          phase: result.phase,
          port: result.port,
        });
      });
      return;
    }

    if (isPickWorkspaceMessage(message)) {
      void pickWorkspaceFolder(panel.webview);
      return;
    }

    if (isRequestDefaultWorkspaceMessage(message)) {
      postEditorWorkspace(panel.webview);
      return;
    }

    if (isRunInstallMessage(message)) {
      installChild?.kill("SIGTERM");
      runInstallScript(panel.webview, context.extensionUri, (c) => {
        installChild = c;
      });
      return;
    }

    if (isRunTursorStartMessage(message)) {
      startChild?.kill("SIGTERM");
      runTursorStart(panel.webview, (c) => {
        startChild = c;
      });
      return;
    }

    console.log("[Tursor webview]", message);
  });
}

/* ---------------- Activate ---------------- */

export function activate(context: vscode.ExtensionContext): void {
  const open = vscode.commands.registerCommand("tursor.openPanel", () => {
    try {
      openTursorPanel(context);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      void vscode.window.showErrorMessage(
        `Tursor: failed to open panel (${message})`,
      );
      console.error("[Tursor] openPanel failed", err);
    }
  });

  context.subscriptions.push(open);

  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    return;
  }

  const workspaceListener = vscode.workspace.onDidChangeWorkspaceFolders(() => {
    broadcastWorkspaceInit();
    broadcastEditorWorkspace();
  });

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
}

export function deactivate(): void {}
