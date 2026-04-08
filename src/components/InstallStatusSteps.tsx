import { motion } from "motion/react";
import { Fragment, useCallback, useMemo, useRef, useState } from "react";
import { Check, Loader2, Minus, X } from "lucide-react";
import {
  getVisiblePhasesForStack,
  isTerminalStepState,
  type InstallPhase,
  type StepVisualState,
} from "../types/installStatus";

function stepLabel(
  phase: InstallPhase,
  status: StepVisualState,
  checkInstallCliPresent: boolean | undefined,
): string {
  if (phase === "check_install") {
    if (status === "pending") return "Tursor CLI check";
    if (status === "running") return "Tursor CLI check…";
    if (status === "success") {
      if (checkInstallCliPresent === true) {
        return "Tursor CLI check — already installed";
      }
      if (checkInstallCliPresent === false) {
        return "Tursor CLI check — not found; installing next";
      }
      return "Tursor CLI check — complete";
    }
    if (status === "failure") return "Tursor CLI check — couldn’t verify";
    if (status === "skipped") return "Tursor CLI check — skipped";
  }

  if (phase === "clone_repo") {
    if (status === "pending") return "Backend repository";
    if (status === "running") return "Cloning or updating backend…";
    if (status === "success") return "Backend repository — ready";
    if (status === "failure") return "Backend repository — update failed";
    if (status === "skipped") return "Backend repository — skipped";
  }

  if (phase === "build") {
    if (status === "pending") return "Build backend";
    if (status === "running") return "Installing dependencies and compiling…";
    if (status === "success") return "Build — finished";
    if (status === "failure") return "Build — failed";
    if (status === "skipped") return "Build — skipped";
  }

  if (phase === "cli_install") {
    if (status === "pending") return "Tursor CLI on PATH";
    if (status === "running") return "Installing global `tursor` command…";
    if (status === "success") return "Tursor CLI — installed";
    if (status === "failure") return "Tursor CLI — install failed";
    if (status === "skipped") return "Tursor CLI — skipped";
  }

  if (phase === "ensure_running") {
    if (status === "pending") return "Backend service";
    if (status === "running") return "Starting backend…";
    if (status === "success") return "Backend service — running";
    if (status === "failure") return "Backend service — failed to start";
    if (status === "skipped") return "Backend service — skipped";
  }

  return phase;
}

const DASH_STAGGER_SEC = 0.14;
const DASH_DURATION_SEC = 0.22;

function StepIcon({ status }: { status: StepVisualState }) {
  if (status === "running") {
    return <Loader2 className="h-5 w-5 shrink-0 animate-spin text-cyan-400" />;
  }
  if (status === "success") {
    return (
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 ring-1 ring-emerald-500/40">
        <Check className="h-4 w-4 text-emerald-400" strokeWidth={2.5} />
      </div>
    );
  }
  if (status === "failure") {
    return (
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/20 ring-1 ring-rose-500/40">
        <X className="h-4 w-4 text-rose-400" strokeWidth={2.5} />
      </div>
    );
  }
  if (status === "skipped") {
    return (
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-600/30 ring-1 ring-slate-500/40">
        <Minus className="h-4 w-4 text-slate-400" strokeWidth={2.5} />
      </div>
    );
  }
  return (
    <div className="h-5 w-5 shrink-0 rounded-full border border-slate-600/60 bg-slate-800/50" />
  );
}

function stepLabelClass(status: StepVisualState) {
  if (status === "pending") return "text-slate-500";
  if (status === "skipped") return "text-slate-400";
  return "text-slate-200";
}

const DASH_BAR_CLASS =
  "h-1 w-0.75 items-left rounded-full bg-gradient-to-r from-slate-500/40 via-cyan-400/60 to-slate-500/40";

/** Stays visible between two step cards after the animated handoff completes. */
function PersistentDashLine() {
  return (
    <div className="flex flex-col items-left gap-1.5 py-1 pl-5.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className={DASH_BAR_CLASS} />
      ))}
    </div>
  );
}

function VerticalDashConnector({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const firedRef = useRef(false);

  const handleLastDashComplete = useCallback(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    onComplete();
  }, [onComplete]);

  return (
    <div className="flex flex-col items-left gap-1.5 py-1 pl-5.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={DASH_BAR_CLASS}
          initial={{ opacity: 0, scaleX: 0.2 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{
            duration: DASH_DURATION_SEC,
            delay: i * DASH_STAGGER_SEC,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{ originX: 0.5 }}
          onAnimationComplete={() => {
            if (i === 2) {
              handleLastDashComplete();
            }
          }}
        />
      ))}
    </div>
  );
}

function StepRow({
  phase,
  status,
  isActiveRow,
  checkInstallCliPresent,
}: {
  phase: InstallPhase;
  status: StepVisualState;
  isActiveRow: boolean;
  checkInstallCliPresent: boolean | undefined;
}) {
  return (
    <div
      role="listitem"
      className={
        isActiveRow
          ? "flex items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-900/50 px-3 py-2.5 ring-1 ring-cyan-500/10"
          : "flex items-center gap-3 rounded-xl border border-slate-700/30 bg-slate-900/25 px-3 py-2 opacity-85"
      }
    >
      <StepIcon status={status} />
      <span className={`text-sm ${stepLabelClass(status)}`}>
        {stepLabel(phase, status, checkInstallCliPresent)}
      </span>
    </div>
  );
}

export function InstallStatusSteps({
  steps,
  checkInstallCliPresent,
}: {
  steps: Record<InstallPhase, StepVisualState>;
  /** Set from install script `check_install` payload `installed` when done. */
  checkInstallCliPresent?: boolean;
}) {
  const target = useMemo(() => getVisiblePhasesForStack(steps), [steps]);
  const [revealedCount, setRevealedCount] = useState(1);
  const handledConnectorRef = useRef<string | null>(null);

  const targetLen = target.length;

  const safeRevealed = Math.min(revealedCount, Math.max(1, targetLen || 1));

  const displayed = useMemo(
    () => target.slice(0, safeRevealed),
    [target, safeRevealed],
  );

  const needsConnector = targetLen > safeRevealed;

  const onConnectorComplete = useCallback(() => {
    const nextPhase = target[safeRevealed];
    const id = `${safeRevealed}-${nextPhase ?? "end"}`;
    if (handledConnectorRef.current === id) return;
    handledConnectorRef.current = id;
    setRevealedCount((r) => {
      const cap = getVisiblePhasesForStack(steps).length;
      return Math.min(r + 1, cap);
    });
  }, [safeRevealed, target, steps]);

  const connectorInstanceKey = `${safeRevealed}-${target[safeRevealed] ?? ""}`;

  return (
    <div className="mt-6 flex min-h-[3rem] flex-col gap-0" role="list">
      {displayed.map((phase, idx) => {
        const status = steps[phase];
        const isLastDisplayed = idx === displayed.length - 1;
        const isLastInTarget = phase === target[targetLen - 1];
        const isActiveRow =
          isLastDisplayed &&
          isLastInTarget &&
          !isTerminalStepState(status) &&
          !needsConnector;

        return (
          <Fragment key={phase}>
            <div role="listitem">
              <StepRow
                phase={phase}
                status={status}
                isActiveRow={isActiveRow}
                checkInstallCliPresent={checkInstallCliPresent}
              />
            </div>
            {idx < displayed.length - 1 ? <PersistentDashLine /> : null}
          </Fragment>
        );
      })}
      {needsConnector ? (
        <VerticalDashConnector
          key={connectorInstanceKey}
          onComplete={onConnectorComplete}
        />
      ) : null}
    </div>
  );
}
