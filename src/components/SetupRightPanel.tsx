import { motion } from "motion/react";
import { ChevronRight, Download, Play, Zap } from "lucide-react";
import { DisabledReasonTooltip } from "./DisabledReasonTooltip";
import { InstallTimelineSteps } from "./InstallTimelineSteps";
import { TursorPathText } from "./TursorPathText";
import {
  tursorPrimaryButtonClassName,
  tursorPrimaryButtonHalfWrapperClassName,
} from "./tursorButtonClasses";
import type { StepVisualState } from "../types/installStatus";
import type { InstallPhase } from "../types/installStatus";

type Props = {
  setupBlurb: string;
  primaryLabel: string;
  primaryDisabled: boolean;
  primaryDisabledReason: string | null;
  onPrimaryClick: () => void;
  showInstallSteps: boolean;
  installSession: number;
  steps: Record<InstallPhase, StepVisualState>;
  installErrorDetail: string | null;
};

function SetupBlurb({ text }: { text: string }) {
  return (
    <p className="text-sm leading-relaxed text-slate-400 sm:text-base">
      <TursorPathText text={text} />
    </p>
  );
}

function renderLeadingIcon(label: string) {
  const className = "h-4 w-4 shrink-0 opacity-95";
  if (label.includes("Connect")) {
    return <ChevronRight className={className} aria-hidden />;
  }
  if (
    label.includes("Start") ||
    label.includes("Checking") ||
    label.includes("Running")
  ) {
    return <Play className={className} aria-hidden />;
  }
  return <Download className={className} aria-hidden />;
}

export function SetupRightPanel({
  setupBlurb,
  primaryLabel,
  primaryDisabled,
  primaryDisabledReason,
  onPrimaryClick,
  showInstallSteps,
  installSession,
  steps,
  installErrorDetail,
}: Props) {
  return (
    <div className="flex w-full max-w-4xl flex-col">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full rounded-2xl border border-blue-500/20 bg-gradient-to-br from-[#121a2e]/95 to-[#0d1220]/95 p-5 shadow-[0_0_40px_rgba(59,130,246,0.08)] backdrop-blur-xl sm:p-6"
      >
        <div className="mb-6 flex items-start gap-4">
          <div className="shrink-0 rounded-xl border border-blue-500/30 bg-[#1A2B55]/80 p-3 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
            <Zap className="h-6 w-6 text-cyan-400" />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 className="mb-1.5 text-xl font-bold text-white sm:text-2xl">
              One-Click Setup
            </h2>
            <SetupBlurb text={setupBlurb} />
          </div>
        </div>

        <div className="flex justify-center">
          <DisabledReasonTooltip
            disabled={primaryDisabled}
            reason={primaryDisabledReason}
            className={tursorPrimaryButtonHalfWrapperClassName}
          >
            <button
              type="button"
              onClick={onPrimaryClick}
              disabled={primaryDisabled}
              className={`w-full ${tursorPrimaryButtonClassName}`}
            >
              {renderLeadingIcon(primaryLabel)}
              <span className="min-w-0 flex-1 text-center">{primaryLabel}</span>
              <ChevronRight className="h-4 w-4 shrink-0 opacity-95" aria-hidden />
            </button>
          </DisabledReasonTooltip>
        </div>

        {showInstallSteps ? (
          <>
            <InstallTimelineSteps key={installSession} steps={steps} />
            {installErrorDetail ? (
              <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-left text-xs leading-relaxed text-rose-200/90 sm:text-sm">
                {installErrorDetail}
              </p>
            ) : null}
          </>
        ) : null}
      </motion.div>
    </div>
  );
}
