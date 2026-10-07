import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, ChevronLeft, ChevronRight, ImageOff, XCircle } from "lucide-react";
import { DisabledReasonTooltip } from "./DisabledReasonTooltip";
import { tursorSecondaryIconButtonClassName } from "./tursorButtonClasses";
import type { RunSessionStatus } from "../types/runHistory";

type InnerProps = {
  urls: string[];
  status?: RunSessionStatus | null;
};

function RunStatusPill({ status }: { status: RunSessionStatus }) {
  if (status === "success") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-black shadow-lg shadow-black/30">
        <CheckCircle2 className="h-3.5 w-3.5 text-black" aria-hidden />
        Success
      </span>
    );
  }
  if (status === "fail") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/15 px-2.5 py-1 text-[11px] font-medium text-black shadow-lg shadow-black/30">
        <XCircle className="h-3.5 w-3.5 text-black" aria-hidden />
        Failure
      </span>
    );
  }
  return null;
}

function ScreenshotCarouselInner({ urls, status }: InnerProps) {
  const [index, setIndex] = useState(0);
  const previousLength = useRef(urls.length);
  const safeIndex = Math.min(index, Math.max(0, urls.length - 1));
  const url = urls[safeIndex]!;

  useEffect(() => {
    if (urls.length > previousLength.current) {
      setIndex(urls.length - 1);
    }
    previousLength.current = urls.length;
  }, [urls.length]);

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className="relative h-full min-h-0 overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/50">
        {status === "success" || status === "fail" ? (
          <div className="absolute right-3 top-3 z-20">
            <RunStatusPill status={status} />
          </div>
        ) : null}
        <AnimatePresence mode="wait">
          <motion.img
            key={url}
            src={url}
            alt={`Screenshot ${safeIndex + 1} of ${urls.length}`}
            className="h-full w-full object-contain bg-slate-950"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />
        </AnimatePresence>
      </div>

      {urls.length > 1 ? (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-slate-950/90 to-transparent px-3 pb-3 pt-8">
          <DisabledReasonTooltip
            disabled={safeIndex === 0}
            reason={safeIndex === 0 ? "Already at the first screenshot." : null}
          >
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={safeIndex === 0}
              className={`${tursorSecondaryIconButtonClassName} disabled:opacity-40`}
              aria-label="Previous screenshot"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </DisabledReasonTooltip>
          <span className="text-xs text-slate-300">
            {safeIndex + 1} / {urls.length}
          </span>
          <DisabledReasonTooltip
            disabled={safeIndex >= urls.length - 1}
            reason={
              safeIndex >= urls.length - 1
                ? "Already at the last screenshot."
                : null
            }
          >
            <button
              type="button"
              onClick={() =>
                setIndex((i) => Math.min(urls.length - 1, i + 1))
              }
              disabled={safeIndex >= urls.length - 1}
              className={`${tursorSecondaryIconButtonClassName} disabled:opacity-40`}
              aria-label="Next screenshot"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </DisabledReasonTooltip>
        </div>
      ) : null}
    </div>
  );
}

type Props = {
  urls: string[];
  sessionKey?: string | null;
  status?: RunSessionStatus | null;
};

export function ScreenshotCarousel({ urls, sessionKey, status }: Props) {
  if (urls.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-700/80 bg-slate-900/40 px-6 text-center">
        <ImageOff className="h-10 w-10 text-slate-600" />
        <p className="text-sm text-slate-500">Screenshots will appear here</p>
        <p className="max-w-xs text-xs text-slate-600">
          When the agent captures steps, they show in this carousel.
        </p>
      </div>
    );
  }

  return (
    <ScreenshotCarouselInner
      key={sessionKey ?? "default"}
      urls={urls}
      status={status}
    />
  );
}
