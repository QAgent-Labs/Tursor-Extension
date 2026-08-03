import { motion } from "motion/react";
import { Fragment, useCallback, useMemo, useRef } from "react";
import { Check, Loader2, Minus, X } from "lucide-react";
import {
  getVisiblePhasesForStack,
  isTerminalStepState,
  type InstallPhase,
  type StepVisualState,
} from "../types/installStatus";
import { installStepLabel } from "../utils/installStepLabels";

function stepLabel(phase: InstallPhase, status: StepVisualState): string {
  return installStepLabel(phase, status);
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

function VerticalDashConnector({ onComplete }: { onComplete: () => void }) {
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
}: {
  phase: InstallPhase;
  status: StepVisualState;
  isActiveRow: boolean;
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
      <span
        className={`min-w-0 flex-1 break-words text-left text-sm ${stepLabelClass(status)}`}
      >
        {stepLabel(phase, status)}
      </span>
    </div>
  );
}

export function InstallStatusSteps({
  steps,
}: {
  steps: Record<InstallPhase, StepVisualState>;
}) {
  const target = useMemo(() => getVisiblePhasesForStack(steps), [steps]);
  const targetLen = target.length;

  const safeRevealed = useMemo(() => {
    if (targetLen === 0) return 1;
    let revealed = 1;
    for (let i = 0; i < targetLen - 1; i++) {
      const phase = target[i];
      if (!phase || !isTerminalStepState(steps[phase])) {
        break;
      }
      revealed = i + 2;
    }
    return Math.min(revealed, targetLen);
  }, [target, steps, targetLen]);

  const displayed = useMemo(
    () => target.slice(0, safeRevealed),
    [target, safeRevealed],
  );

  const needsConnector = targetLen > safeRevealed;

  const onConnectorComplete = useCallback(() => {
    /* Step reveal is driven by useEffect when a phase reaches a terminal state. */
  }, []);

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
