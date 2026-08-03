import { Fragment, useCallback, useMemo, useRef } from "react";
import { motion } from "motion/react";
import { Check, FolderGit2, Hammer, Loader2, Terminal, Server } from "lucide-react";
import {
  getVisiblePhasesForStack,
  isTerminalStepState,
  type InstallPhase,
  type StepVisualState,
} from "../types/installStatus";
import { installStepLabel } from "../utils/installStepLabels";

const PHASE_ICONS: Record<InstallPhase, typeof FolderGit2> = {
  clone_repo: FolderGit2,
  build: Hammer,
  cli_install: Terminal,
  ensure_running: Server,
};

const RAIL_WIDTH = "w-6";
const NODE_SIZE = "h-3 w-3";
const ROW_HEIGHT = "min-h-[3.25rem]";

const DASH_STAGGER_SEC = 0.14;
const DASH_DURATION_SEC = 0.22;

function nodeGlowClass(status: StepVisualState, isActive: boolean): string {
  if (status === "running" || isActive) {
    return "bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.7)] ring-cyan-400/60";
  }
  if (status === "success") {
    return "bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.55)] ring-violet-400/50";
  }
  if (status === "failure") {
    return "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)] ring-rose-400/50";
  }
  if (status === "skipped") {
    return "bg-slate-500 ring-slate-400/40";
  }
  return "bg-slate-700 ring-slate-600/50";
}

function railSegmentClass(status: StepVisualState): string {
  if (status === "success") return "bg-gradient-to-b from-violet-500/70 to-blue-500/50";
  if (status === "running") return "bg-gradient-to-b from-cyan-400/80 to-violet-500/40";
  return "bg-slate-700/50";
}

function StatusIndicator({ status }: { status: StepVisualState }) {
  if (status === "running") {
    return <Loader2 className="h-5 w-5 shrink-0 animate-spin text-cyan-400" />;
  }
  if (status === "success") {
    return (
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 ring-1 ring-emerald-500/40">
        <Check className="h-3.5 w-3.5 text-emerald-400" strokeWidth={2.5} />
      </div>
    );
  }
  if (status === "failure" || status === "skipped") {
    return <div className="h-5 w-5 shrink-0 rounded-full bg-slate-700/40 ring-1 ring-slate-600/40" />;
  }
  return <div className="h-5 w-5 shrink-0 rounded-full border border-slate-600/50 bg-slate-800/40" />;
}

function VerticalDashConnector({ onComplete }: { onComplete: () => void }) {
  const firedRef = useRef(false);
  const handleLastDashComplete = useCallback(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    onComplete();
  }, [onComplete]);

  return (
    <div className={`flex ${RAIL_WIDTH} shrink-0 flex-col items-center py-1`} aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="h-1 w-0.5 rounded-full bg-gradient-to-b from-slate-600/40 via-cyan-400/50 to-slate-600/40"
          initial={{ opacity: 0, scaleY: 0.2 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{
            duration: DASH_DURATION_SEC,
            delay: i * DASH_STAGGER_SEC,
            ease: [0.22, 1, 0.36, 1],
          }}
          style={{ originY: 0 }}
          onAnimationComplete={() => {
            if (i === 2) handleLastDashComplete();
          }}
        />
      ))}
    </div>
  );
}

function TimelineRow({
  phase,
  status,
  isActiveRow,
  hasLineBelow,
  showPendingConnector,
}: {
  phase: InstallPhase;
  status: StepVisualState;
  isActiveRow: boolean;
  hasLineBelow: boolean;
  showPendingConnector: boolean;
}) {
  const Icon = PHASE_ICONS[phase];
  const label = installStepLabel(phase, status);

  return (
    <div className="flex gap-3">
      <div className={`flex ${RAIL_WIDTH} shrink-0 flex-col items-center`}>
        <div className={`flex ${ROW_HEIGHT} items-center justify-center`}>
          <div
            className={`${NODE_SIZE} shrink-0 rounded-full ring-2 ${nodeGlowClass(status, isActiveRow)}`}
          />
        </div>

        {hasLineBelow ? (
          <div className={`w-0.5 flex-1 min-h-3 ${railSegmentClass(status)}`} />
        ) : showPendingConnector ? (
          <VerticalDashConnector onComplete={() => {}} />
        ) : null}
      </div>

      <div
        className={
          isActiveRow
            ? `flex ${ROW_HEIGHT} flex-1 items-center gap-3 rounded-xl border border-cyan-500/20 bg-slate-900/60 px-3 py-2.5 ring-1 ring-cyan-500/10`
            : `flex ${ROW_HEIGHT} flex-1 items-center gap-3 rounded-xl border border-slate-700/30 bg-slate-900/30 px-3 py-2.5`
        }
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-600/40 bg-slate-800/80">
          <Icon className="h-4 w-4 text-slate-300" />
        </div>
        <span
          className={`min-w-0 flex-1 text-left text-sm ${
            status === "pending" ? "text-slate-500" : "text-slate-200"
          }`}
        >
          {label}
        </span>
        <StatusIndicator status={status} />
      </div>
    </div>
  );
}

export function InstallTimelineSteps({
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
      if (!phase || !isTerminalStepState(steps[phase])) break;
      revealed = i + 2;
    }
    return Math.min(revealed, targetLen);
  }, [target, steps, targetLen]);

  const displayed = useMemo(
    () => target.slice(0, safeRevealed),
    [target, safeRevealed],
  );

  const needsConnector = targetLen > safeRevealed;

  return (
    <div className="mt-6 flex min-h-[3rem] flex-col" role="list">
      {displayed.map((phase, idx) => {
        const status = steps[phase];
        const isLastDisplayed = idx === displayed.length - 1;
        const isLastInTarget = phase === target[targetLen - 1];
        const isActiveRow =
          isLastDisplayed &&
          isLastInTarget &&
          !isTerminalStepState(status) &&
          !needsConnector;

        const hasLineBelow = idx < displayed.length - 1;
        const showPendingConnector = isLastDisplayed && needsConnector;

        return (
          <Fragment key={phase}>
            <TimelineRow
              phase={phase}
              status={status}
              isActiveRow={isActiveRow}
              hasLineBelow={hasLineBelow}
              showPendingConnector={showPendingConnector}
            />
          </Fragment>
        );
      })}
    </div>
  );
}
