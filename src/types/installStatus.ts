export type InstallPhase =
  | "clone_repo"
  | "clone_ai_repo"
  | "build"
  | "ai_setup"
  | "cli_install"
  | "ai_cli_install"
  | "ensure_running"
  | "ensure_ai_running";

/** Single source of truth for step order (install script phases). */
export const INSTALL_STEP_ORDER: readonly InstallPhase[] = [
  "clone_repo",
  "clone_ai_repo",
  "build",
  "ai_setup",
  "cli_install",
  "ai_cli_install",
  "ensure_running",
  "ensure_ai_running",
] as const;

export const BACKEND_INSTALL_STEPS: readonly InstallPhase[] = [
  "clone_repo",
  "build",
  "cli_install",
  "ensure_running",
] as const;

export const AI_INSTALL_STEPS: readonly InstallPhase[] = [
  "clone_ai_repo",
  "ai_setup",
  "ai_cli_install",
  "ensure_ai_running",
] as const;

export type StepVisualState =
  | "pending"
  | "running"
  | "success"
  | "failure"
  | "skipped";

export function createInitialStepMap(): Record<InstallPhase, StepVisualState> {
  return {
    clone_repo: "pending",
    clone_ai_repo: "pending",
    build: "pending",
    ai_setup: "pending",
    cli_install: "pending",
    ai_cli_install: "pending",
    ensure_running: "pending",
    ensure_ai_running: "pending",
  };
}

export function isTerminalStepState(status: StepVisualState): boolean {
  return (
    status === "success" ||
    status === "failure" ||
    status === "skipped"
  );
}

/**
 * Progressive stack: show steps 0..i where i is the first non-terminal step,
 * or all steps when every step is terminal (run complete).
 */
export function getVisiblePhasesForTrack(
  steps: Record<InstallPhase, StepVisualState>,
  trackOrder: readonly InstallPhase[],
): InstallPhase[] {
  const firstOpen = trackOrder.findIndex((p) => !isTerminalStepState(steps[p]));
  if (firstOpen === -1) {
    return [...trackOrder];
  }
  return trackOrder.slice(0, firstOpen + 1);
}

export function getVisiblePhasesForStack(
  steps: Record<InstallPhase, StepVisualState>,
): InstallPhase[] {
  return getVisiblePhasesForTrack(steps, INSTALL_STEP_ORDER);
}

export type InstallStatusPayload = {
  phase: InstallPhase;
  state: "start" | "done" | "skipped";
  ok?: boolean;
  installed?: boolean;
  message?: string;
  detail?: string;
  /** Backend HTTP port from `tursor port` after ensure_running */
  port?: number;
  /** Tursor-AI HTTP port from `tursorAI port` after ensure_ai_running */
  aiPort?: number;
};

export function applyInstallStatusPayload(
  prev: Record<InstallPhase, StepVisualState>,
  p: InstallStatusPayload,
): Record<InstallPhase, StepVisualState> {
  const next = { ...prev };
  if (p.state === "start") {
    next[p.phase] = "running";
  } else if (p.state === "skipped") {
    next[p.phase] = "skipped";
  } else if (p.state === "done") {
    next[p.phase] = p.ok ? "success" : "failure";
  }
  return next;
}

export type InstallHostToWebviewMessage =
  | { type: "tursorInstallStatus"; payload: InstallStatusPayload }
  | { type: "tursorInstallFinished"; code: number | null }
  | { type: "tursorStartFinished"; code: number | null }
  | {
      type: "tursorBackendResolved";
      port: number;
      origin: string | null;
    };
