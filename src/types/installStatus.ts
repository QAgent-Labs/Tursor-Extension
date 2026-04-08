export type InstallPhase =
  | "check_install"
  | "clone_repo"
  | "build"
  | "cli_install"
  | "ensure_running";

/** Single source of truth for step order (UI stack + install script phases). */
export const INSTALL_STEP_ORDER: readonly InstallPhase[] = [
  "check_install",
  "clone_repo",
  "build",
  "cli_install",
  "ensure_running",
] as const;

export type StepVisualState =
  | "pending"
  | "running"
  | "success"
  | "failure"
  | "skipped";

export function createInitialStepMap(): Record<InstallPhase, StepVisualState> {
  return {
    check_install: "pending",
    clone_repo: "pending",
    build: "pending",
    cli_install: "pending",
    ensure_running: "pending",
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
export function getVisiblePhasesForStack(
  steps: Record<InstallPhase, StepVisualState>,
): InstallPhase[] {
  const firstOpen = INSTALL_STEP_ORDER.findIndex(
    (p) => !isTerminalStepState(steps[p]),
  );
  if (firstOpen === -1) {
    return [...INSTALL_STEP_ORDER];
  }
  return INSTALL_STEP_ORDER.slice(0, firstOpen + 1);
}

export type InstallStatusPayload = {
  phase: InstallPhase;
  state: "start" | "done" | "skipped";
  ok?: boolean;
  installed?: boolean;
  message?: string;
  detail?: string;
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
  | { type: "tursorInstallFinished"; code: number | null };
