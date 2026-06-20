import { AnimatedBackground } from "../components/AnimatedBackground";
import { useTursorWebSocket } from "../context/useTursorWebSocket";
import { motion } from "motion/react";
import { TursorLogo } from "../components/TursorLogo";
import { tursorWordmarkTextGradientClassName } from "../components/tursorWordmarkClasses";
import { getRunpageEmbedUrl } from "../env";
import {
  ArrowLeft,
  ArrowRight,
  Globe,
  Lock,
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
  Send,
  User,
} from "lucide-react";

/**
 * Main Tursor run surface: assistant rail, embedded “browser” preview, status + screenshots dock.
 */
export default function RunPage() {
  const { status } = useTursorWebSocket();
  const embedUrl = getRunpageEmbedUrl();

  return (
    <div className="relative flex h-[100dvh] max-h-[100dvh] min-h-0 w-full max-w-[100vw] flex-col overflow-hidden bg-slate-950 text-slate-100">
      <AnimatedBackground />

      <div className="relative z-10 flex h-full min-h-0 min-w-0 flex-1 flex-col items-stretch lg:flex-row">
        <aside className="order-1 flex min-h-0 w-full flex-1 flex-col self-stretch border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md lg:order-none lg:h-full lg:w-[30%] lg:flex-none lg:shrink-0 lg:border-b-0 lg:border-r lg:border-slate-800/80">
          <div className="flex items-center gap-3 px-4 py-4">
            <TursorLogo className="h-10 w-10 shrink-0 object-contain" />
            <div className="min-w-0 flex-1">
              <h1
                className={`min-w-0 truncate text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl ${tursorWordmarkTextGradientClassName}`}
              >
                Tursor
              </h1>
              <p className="truncate text-xs text-slate-500">Mock session</p>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-4">
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="ml-auto max-w-[92%] break-words rounded-2xl rounded-br-md bg-slate-800/90 px-3 py-2 text-sm text-slate-200 ring-1 ring-slate-700/60"
            >
              Run tests on the checkout flow and summarize failures.
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mr-auto flex max-w-[92%] gap-2.5 break-words rounded-2xl rounded-bl-md bg-gradient-to-br from-cyan-950/80 to-slate-900/90 px-3 py-2 text-sm text-slate-200 ring-1 ring-cyan-500/25"
            >
              <TursorLogo className="mt-0.5 h-5 w-5 shrink-0 object-contain" />
              <span className="min-w-0 break-words">
                I’ll drive the in-app browser, capture screenshots, and report
                status here. Say when to start.
              </span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="ml-auto max-w-[92%] break-words rounded-2xl rounded-br-md bg-slate-800/90 px-3 py-2 text-sm text-slate-200 ring-1 ring-slate-700/60"
            >
              Start with the staging build.
            </motion.div>
          </div>

          <div className="border-t border-slate-800/80 p-3">
            <div className="flex items-end gap-2 rounded-xl bg-slate-900/80 p-2 ring-1 ring-slate-700/50">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800">
                <User className="h-4 w-4 text-slate-400" />
              </div>
              <div className="min-h-[2.5rem] flex-1 rounded-lg bg-slate-950/60 px-2 py-2 text-left text-sm text-slate-500">
                Message…
              </div>
              <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-600 text-white shadow shadow-cyan-500/20"
                aria-label="Send (mock)"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Right ~70% — browser chrome + iframe (75% height) + dock (25%) */}
        <main className="order-2 flex min-h-0 w-full flex-1 flex-col self-stretch bg-slate-950/40 lg:order-none lg:min-w-0">
          {/* Top 75% — tab / toolbar / page */}
          <section className="flex min-h-0 flex-[3] flex-col border-b border-slate-800/80">
            {/* Tab strip */}
            <div className="flex shrink-0 flex-wrap items-end gap-0.5 bg-slate-900/90 px-2 pt-2">
              <div className="flex max-w-[220px] items-center gap-2 rounded-t-lg bg-slate-800/95 px-3 py-2 text-xs text-slate-200 ring-1 ring-b-0 ring-slate-700/80">
                <Globe className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate">Preview</span>
                <button
                  type="button"
                  className="ml-1 rounded p-0.5 text-slate-500 hover:bg-slate-700/80 hover:text-slate-300"
                  aria-label="Close tab (mock)"
                >
                  ×
                </button>
              </div>
              <div className="mb-1 flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-800/80">
                +
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-slate-800/80 bg-slate-900/95 px-2 py-1.5">
              <button
                type="button"
                className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                aria-label="Back (mock)"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                aria-label="Forward (mock)"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                aria-label="Reload (mock)"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <div className="mx-1 flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-slate-950/70 px-2 py-1.5 ring-1 ring-slate-700/60">
                <Lock className="h-3.5 w-3.5 shrink-0 text-emerald-500/80" />
                <span className="truncate font-mono text-xs text-slate-400">
                  {embedUrl}
                </span>
              </div>
              <button
                type="button"
                className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                aria-label="Menu (mock)"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>

            {/* Page surface */}
            <div className="relative min-h-0 flex-1 bg-white">
              <iframe
                title="Embedded preview"
                src={embedUrl}
                className="h-full w-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            </div>
          </section>

          {/* Bottom 25% — Status | Screenshots (50% / 50%) */}
          <section className="flex min-h-0 min-h-[7rem] flex-[1] shrink-0 flex-col divide-y divide-slate-800/80 bg-slate-950/90 sm:min-h-[8rem] sm:flex-row sm:divide-x sm:divide-y-0">
            <div className="flex min-h-0 min-w-0 w-full flex-col sm:w-1/2">
              <div className="shrink-0 border-b border-slate-800/80 px-3 py-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Status
                </h2>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-sm text-slate-400">
                <p className="mb-2">
                  Socket:{" "}
                  <span className="font-medium text-emerald-400/90">
                    {status}
                  </span>
                </p>
                <p className="text-xs leading-relaxed text-slate-500">
                  Live agent status and step output will show here.
                </p>
              </div>
            </div>
            <div className="flex min-h-0 min-w-0 w-full flex-col sm:w-1/2">
              <div className="shrink-0 border-b border-slate-800/80 px-3 py-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Screenshots
                </h2>
              </div>
              <div className="flex min-h-0 flex-1 flex-wrap items-center justify-center gap-2 p-2 sm:flex-nowrap">
                <div className="flex aspect-video w-[42%] max-w-[140px] items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-900/50 text-[10px] text-slate-600">
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Empty
                </div>
                <div className="flex aspect-video w-[42%] max-w-[140px] items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-900/50 text-[10px] text-slate-600">
                  Empty
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
