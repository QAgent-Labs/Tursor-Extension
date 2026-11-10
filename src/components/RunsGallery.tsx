import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  CheckCircle2,
  FileDown,
  ImageOff,
  Loader2,
  XCircle,
} from "lucide-react";
import { generateReport, type ReportFormat } from "../api/chat";
import { saveReportFile } from "../utils/saveReport";
import { ScreenshotCarousel } from "./ScreenshotCarousel";
import {
  statusPillFailureClass,
  statusPillIconClass,
  statusPillSuccessClass,
} from "./statusPillClasses";
import type { SuiteGroup, SuiteGroupCell } from "../runs/suiteGroups";
import type { RunSessionStatus } from "../types/runHistory";

export type RunsPreview = {
  key: string;
  title: string;
  screenshots: string[];
  status: "passed" | "failure";
};

type Props = {
  backendOrigin: string | null;
  conversationId: string | null;
  groups: SuiteGroup[];
  highlightedCaseId: string | null;
  highlightToken: number;
  liveRunKey: string | null;
  liveCaseId: string | null;
  preview: RunsPreview | null;
  onClosePreview: () => void;
};

function CellStatusPill({ status }: { status: SuiteGroupCell["status"] }) {
  if (status === "passed") {
    return (
      <span className={statusPillSuccessClass}>
        <CheckCircle2 className={statusPillIconClass} aria-hidden />
        Success
      </span>
    );
  }
  if (status === "failure") {
    return (
      <span className={statusPillFailureClass}>
        <XCircle className={statusPillIconClass} aria-hidden />
        Failure
      </span>
    );
  }
  return null;
}

/** Suite-level report: every case in this suite version and all of its runs. */
function SuiteReportButton({
  backendOrigin,
  conversationId,
  suiteId,
}: {
  backendOrigin: string | null;
  conversationId: string | null;
  suiteId: string;
}) {
  const [format, setFormat] = useState<ReportFormat>("md");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!backendOrigin || busy) return;
    setBusy(true);
    try {
      const report = await generateReport(backendOrigin, {
        suiteId,
        conversationId,
        format,
      });
      const saved = await saveReportFile(report);
      const m = report.metrics;
      if (saved.ok) {
        toast.success(
          `Report saved: ${m.passed} passed, ${m.failed} failed of ${m.total}.`,
        );
      } else if (!saved.cancelled) {
        toast.error(saved.error ?? "Could not save the report.");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not create the report.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <label className="sr-only" htmlFor={`report-format-${suiteId}`}>
        Report format
      </label>
      <select
        id={`report-format-${suiteId}`}
        value={format}
        disabled={busy}
        onChange={(event) => setFormat(event.target.value as ReportFormat)}
        className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200"
      >
        <option value="md">Markdown</option>
        <option value="pdf">PDF</option>
      </select>
      <button
        type="button"
        onClick={() => void create()}
        disabled={busy || !backendOrigin}
        className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
        title="Create and download a report for this test suite"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <FileDown className="h-3.5 w-3.5" aria-hidden />
        )}
        {busy ? "Preparing report…" : "Download report"}
      </button>
    </div>
  );
}

function carouselStatus(
  status: SuiteGroupCell["status"] | RunsPreview["status"],
): RunSessionStatus | null {
  if (status === "passed") return "success";
  if (status === "failure") return "fail";
  return null;
}

export function RunsGallery({
  backendOrigin,
  conversationId,
  groups,
  highlightedCaseId,
  highlightToken,
  liveRunKey,
  liveCaseId,
  preview,
  onClosePreview,
}: Props) {
  const [openCaseId, setOpenCaseId] = useState<string | null>(null);
  const [autoOpenedFor, setAutoOpenedFor] = useState<string | null>(null);

  useEffect(() => {
    setOpenCaseId(null);
    setAutoOpenedFor(null);
  }, [conversationId]);

  useEffect(() => {
    if (liveRunKey && liveCaseId && liveRunKey !== autoOpenedFor) {
      setOpenCaseId(liveCaseId);
      setAutoOpenedFor(liveRunKey);
    }
  }, [liveRunKey, liveCaseId, autoOpenedFor]);

  useEffect(() => {
    if (!preview) return;
    setOpenCaseId(null);
  }, [preview]);

  useEffect(() => {
    if (!highlightToken) return;
    setOpenCaseId(null);
    const caseId = highlightedCaseId;
    const frame = requestAnimationFrame(() => {
      if (!caseId) return;
      document.getElementById(`run-cell-${caseId}`)?.scrollIntoView({
        block: "nearest",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [highlightToken, highlightedCaseId]);

  const openCell = groups
    .flatMap((group) => group.cells)
    .find((cell) => cell.caseId === openCaseId);

  const showingPreview = preview != null;
  const showingCell = !showingPreview && openCell != null;
  const openTitle = showingPreview
    ? preview.title
    : showingCell
      ? openCell.title
      : null;
  const openShots = showingPreview
    ? preview.screenshots
    : showingCell
      ? openCell.screenshots
      : [];
  const openStatus = showingPreview
    ? carouselStatus(preview.status)
    : showingCell
      ? carouselStatus(openCell.status)
      : null;
  const openKey = showingPreview
    ? preview.key
    : showingCell
      ? openCell.caseId
      : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="mb-3 shrink-0 text-left">
        <h2 className="text-xl font-semibold text-white sm:text-2xl">Runs</h2>
        <p className="mt-1 text-sm text-slate-500">
          Each cell is a test case from this conversation that has been started.
        </p>
      </header>
      {openKey ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="mb-3 flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (showingPreview) onClosePreview();
                else setOpenCaseId(null);
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-medium text-slate-200 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back
            </button>
            <h3 className="min-w-0 truncate text-base font-medium text-white">
              {openTitle}
            </h3>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <div className="aspect-video max-h-full w-full overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/50">
              <ScreenshotCarousel
                urls={openShots}
                sessionKey={openKey}
                status={openStatus}
              />
            </div>
          </div>
        </div>
      ) : groups.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-700/80 bg-slate-900/40 px-6 text-center">
          <ImageOff className="h-10 w-10 text-slate-600" />
          <p className="text-sm text-slate-500">Runs will appear here</p>
          <p className="max-w-xs text-xs text-slate-600">
            Start a test case from the chat and its screenshots collect in this
            grid.
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-8 pt-3">
          {groups.map((group, index) => (
            <section
              key={group.key}
              className={index === 0 ? "" : "border-t border-slate-800 pt-4"}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="min-w-0 truncate text-sm font-medium text-slate-200">
                  {group.heading}
                </h3>
                {group.suiteId ? (
                  <SuiteReportButton
                    backendOrigin={backendOrigin}
                    conversationId={conversationId}
                    suiteId={group.suiteId}
                  />
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {group.cells.map((cell) => {
                  const shot = cell.screenshots[cell.screenshots.length - 1];
                  const highlighted = highlightedCaseId === cell.caseId;
                  return (
                    <button
                      key={cell.key}
                      id={`run-cell-${cell.caseId}`}
                      type="button"
                      onClick={() => setOpenCaseId(cell.caseId)}
                      className={`relative rounded-xl border bg-slate-900/50 text-left transition duration-200 ease-out ${
                        highlighted
                          ? "z-10 scale-105 border-white ring-2 ring-white"
                          : "border-slate-800/80 hover:z-10 hover:border-white hover:ring-2 hover:ring-white"
                      }`}
                    >
                      <div className="relative aspect-video overflow-hidden rounded-t-xl bg-slate-950">
                        {cell.status === "passed" ||
                        cell.status === "failure" ? (
                          <div className="absolute right-2 top-2 z-10">
                            <CellStatusPill status={cell.status} />
                          </div>
                        ) : null}
                        {shot ? (
                          <img
                            src={shot}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center px-2 text-center text-[11px] text-slate-500">
                            {cell.status === "running"
                              ? "Waiting for screenshots"
                              : cell.status === "queued"
                                ? "Queued"
                                : "No screenshots"}
                          </div>
                        )}
                      </div>
                      <p className="truncate px-2 py-1.5 text-xs text-slate-200">
                        {cell.title}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
