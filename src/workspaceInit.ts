import type {
  RevalidateContextMessage,
  SessionConfigMessage,
  StartContextMessage,
  StartCdpMessage,
  WorkspaceInitMessage,
} from "./types/workspaceInit";

export type WorkspaceInitSources = {
  workspacePath?: string | null;
  frontendPort?: number | null;
};

/** Build `workspace_init` from app context values only. */
export function buildWorkspaceInit(
  sources: WorkspaceInitSources,
): WorkspaceInitMessage | null {
  const workspacePath = (sources.workspacePath?.trim() ?? "").trim();
  if (!workspacePath) return null;
  const msg: WorkspaceInitMessage = { type: "workspace_init", workspacePath };
  if (sources.frontendPort != null && sources.frontendPort > 0) {
    msg.frontendPort = sources.frontendPort;
  }
  return msg;
}

export function emitWorkspaceInit(
  emit: (payload: WorkspaceInitMessage) => void,
  sources: WorkspaceInitSources,
): void {
  const init = buildWorkspaceInit(sources);
  if (init) emit(init);
}

export function buildSessionConfig(
  sources: WorkspaceInitSources,
): SessionConfigMessage {
  const msg: SessionConfigMessage = { type: "session_config" };
  const wp = sources.workspacePath?.trim();
  if (wp) msg.workspacePath = wp;
  if (sources.frontendPort != null && sources.frontendPort > 0) {
    msg.frontendPort = sources.frontendPort;
  }
  return msg;
}

export function startContextMessage(): StartContextMessage {
  return { type: "start_context" };
}

export function revalidateContextMessage(): RevalidateContextMessage {
  return { type: "revalidate_context" };
}

export function startCdpMessage(): StartCdpMessage {
  return { type: "start_cdp" };
}
