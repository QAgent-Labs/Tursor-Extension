import type { InstallPhase, StepVisualState } from "../types/installStatus";

export function installStepLabel(
  phase: InstallPhase,
  status: StepVisualState,
): string {
  if (phase === "clone_repo") {
    if (status === "pending") return "Backend repository";
    if (status === "running") return "Cloning or updating backend…";
    if (status === "success") return "Backend repository — ready";
    if (status === "failure") return "Backend repository — update failed";
    if (status === "skipped") return "Backend repository — skipped";
  }

  if (phase === "clone_ai_repo") {
    if (status === "pending") return "Tursor-AI repository";
    if (status === "running") return "Cloning or updating Tursor-AI…";
    if (status === "success") return "Tursor-AI repository — ready";
    if (status === "failure") return "Tursor-AI repository — update failed";
    if (status === "skipped") return "Tursor-AI repository — skipped";
  }

  if (phase === "build") {
    if (status === "pending") return "Build backend";
    if (status === "running") return "Installing dependencies and compiling…";
    if (status === "success") return "Build — finished";
    if (status === "failure") return "Build — failed";
    if (status === "skipped") return "Build — skipped";
  }

  if (phase === "ai_setup") {
    if (status === "pending") return "Tursor-AI Python environment";
    if (status === "running") return "Creating venv and installing Python deps…";
    if (status === "success") return "Tursor-AI environment — ready";
    if (status === "failure") return "Tursor-AI environment — failed";
    if (status === "skipped") return "Tursor-AI environment — skipped";
  }

  if (phase === "cli_install") {
    if (status === "pending") return "Tursor CLI on PATH";
    if (status === "running") return "Installing global `tursor` command…";
    if (status === "success") return "Tursor CLI — installed";
    if (status === "failure") return "Tursor CLI — install failed";
    if (status === "skipped") return "Tursor CLI — skipped";
  }

  if (phase === "ai_cli_install") {
    if (status === "pending") return "Tursor-AI CLI on PATH";
    if (status === "running") return "Installing global `tursorAI` command…";
    if (status === "success") return "Tursor-AI CLI — installed";
    if (status === "failure") return "Tursor-AI CLI — install failed";
    if (status === "skipped") return "Tursor-AI CLI — skipped";
  }

  if (phase === "ensure_running") {
    if (status === "pending") return "Backend service";
    if (status === "running") return "Starting backend…";
    if (status === "success") return "Backend service — running";
    if (status === "failure") return "Backend service — failed to start";
    if (status === "skipped") return "Backend service — skipped";
  }

  if (phase === "ensure_ai_running") {
    if (status === "pending") return "Tursor-AI service";
    if (status === "running") return "Starting Tursor-AI…";
    if (status === "success") return "Tursor-AI service — running";
    if (status === "failure") return "Tursor-AI service — failed to start";
    if (status === "skipped") return "Tursor-AI service — skipped";
  }

  return phase;
}
