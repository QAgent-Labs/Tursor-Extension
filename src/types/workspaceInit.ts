/** Sent over Socket.IO `message` when the UI connects to the backend. */
export type WorkspaceInitMessage = {
  type: "workspace_init";
  workspacePath: string;
  frontendPort?: number;
};

export type SessionConfigMessage = {
  type: "session_config";
  workspacePath?: string;
  frontendPort?: number;
};

export type StartContextMessage = {
  type: "start_context";
};

export type RevalidateContextMessage = {
  type: "revalidate_context";
};

export type StartCdpMessage = {
  type: "start_cdp";
};

export type TursorCurrentContext = {
  workspacePath: string | null;
  frontendPort: number | null;
  connected: boolean;
  contextReady: boolean;
};
