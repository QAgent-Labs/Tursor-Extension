import type { TursorAppConfig } from "../types/appConfig";

function parsePortField(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function configFieldsToPatch(
  workspacePath: string | null,
  editorWorkspacePath: string | null,
  backendPort: string,
  frontendPort?: string,
): Partial<TursorAppConfig> {
  const trimmed = workspacePath?.trim() || null;
  const editor = editorWorkspacePath?.trim() || null;
  const workspaceOverride =
    trimmed && editor && trimmed === editor ? null : trimmed;

  const patch: Partial<TursorAppConfig> = {
    workspacePath: workspaceOverride,
    backendPort: parsePortField(backendPort),
  };

  if (frontendPort !== undefined) {
    patch.frontendPort = parsePortField(frontendPort);
  }

  return patch;
}
