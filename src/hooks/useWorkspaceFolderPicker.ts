import { useEffect } from "react";
import { getVsCodeApi } from "../vscodeApi";

export function useWorkspaceFolderPicker(
  onPicked: (path: string) => void,
): () => void {
  useEffect(() => {
    const onMsg = (event: MessageEvent) => {
      const data = event.data as {
        type?: string;
        workspacePath?: string;
      };
      if (data?.type === "tursorWorkspacePicked" && data.workspacePath) {
        onPicked(data.workspacePath);
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [onPicked]);

  return () => {
    const vscode = getVsCodeApi();
    if (!vscode) {
      return;
    }
    vscode.postMessage({ command: "pickWorkspaceFolder" });
  };
}
