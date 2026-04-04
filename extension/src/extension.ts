import * as fs from "node:fs";
import * as vscode from "vscode";

const PANEL_VIEW_TYPE = "tursorPanel";

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

  const csp = [
    `default-src 'none'`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `script-src ${webview.cspSource}`,
    `img-src ${webview.cspSource} https: data:`,
    `font-src ${webview.cspSource}`,
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

    panel.webview.html = getWebviewHtml(context.extensionUri, panel.webview);

    panel.webview.onDidReceiveMessage((message: unknown) => {
      // Extension host (Node) ← webview: use this to run install scripts, stream logs, etc.
      console.log("[Tursor webview]", message);
    });
  });

  context.subscriptions.push(open);
}

export function deactivate(): void {}
