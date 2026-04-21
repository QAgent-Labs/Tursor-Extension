/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL for Socket.IO, e.g. `http://127.0.0.1:9090` */
  readonly VITE_TURSOR_SOCKET_URL?: string;
  /** Socket.IO server path, e.g. `/ws` (must match server `path` option). */
  readonly VITE_TURSOR_SOCKET_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
