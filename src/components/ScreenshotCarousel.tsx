import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { DisabledReasonTooltip } from "./DisabledReasonTooltip";

type Props = {
  urls: string[];
  sessionKey?: string | null;
};

export function ScreenshotCarousel({ urls, sessionKey }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [sessionKey]);

  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, urls.length - 1)));
  }, [urls.length]);

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

  const safeIndex = Math.min(index, urls.length - 1);
  const url = urls[safeIndex];

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className="relative h-full min-h-0 overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/50">
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
              className="rounded-lg border border-slate-700/80 bg-slate-900/90 p-2 text-slate-300 disabled:opacity-40"
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
              className="rounded-lg border border-slate-700/80 bg-slate-900/90 p-2 text-slate-300 disabled:opacity-40"
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
