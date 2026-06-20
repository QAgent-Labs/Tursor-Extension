/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL for Socket.IO, e.g. `http://127.0.0.1:9090` */
  readonly VITE_TURSOR_SOCKET_URL?: string;
  /** Socket.IO server path, e.g. `/ws` (must match server `path` option). */
  readonly VITE_TURSOR_SOCKET_PATH?: string;
  /**
   * `browser` | `extension` — forces webview vs in-browser mocks.
   * If unset, auto: extension when `acquireVsCodeApi` exists.
   */
  readonly VITE_APP_RUNTIME?: string;
  /** Run page iframe `src` (see `.env.example`). */
  readonly VITE_RUNPAGE_EMBED_URL?: string;
  /** When `true`, dev server shows the runtime mode pill. */
  readonly VITE_SHOW_RUNTIME_DEV_BADGE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
