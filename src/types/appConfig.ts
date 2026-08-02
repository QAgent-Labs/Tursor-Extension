export type TursorAppConfig = {
  workspacePath: string | null;
  backendPort: number | null;
  frontendPort: number | null;
};

export type TursorBackendStatus = {
  running: boolean;
  port: number | null;
};

export const defaultAppConfig = (): TursorAppConfig => ({
  workspacePath: null,
  backendPort: null,
  frontendPort: null,
});

/** User override, or the editor’s open folder when override is unset. */
export function resolveWorkspacePath(
  config: TursorAppConfig,
  editorWorkspacePath: string | null,
): string | null {
  const override = config.workspacePath?.trim();
  if (override) return override;
  const editor = editorWorkspacePath?.trim();
  return editor || null;
}
