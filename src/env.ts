/** Reads Vite-injected `VITE_*` vars from the project root `.env` (next to `package.json`). */
function s(key: keyof ImportMetaEnv): string | undefined {
  const v = import.meta.env[key];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

export const env = {
  appRuntime: s("VITE_APP_RUNTIME"),
  tursorSocketUrl: s("VITE_TURSOR_SOCKET_URL"),
  tursorSocketPath: s("VITE_TURSOR_SOCKET_PATH"),
  runpageEmbedUrl: s("VITE_RUNPAGE_EMBED_URL"),
  workspacePath: s("VITE_WORKSPACE_PATH"),
  showRuntimeDevBadge: s("VITE_SHOW_RUNTIME_DEV_BADGE") === "true",
} as const;

/** Iframe `src` when `VITE_RUNPAGE_EMBED_URL` is unset (avoids invalid empty `src`). */
export function getRunpageEmbedUrl(): string {
  return env.runpageEmbedUrl ?? "about:blank";
}
