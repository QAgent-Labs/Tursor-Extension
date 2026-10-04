import { FileText, ListChecks, Route } from "lucide-react";
import type { ConversationSummary } from "../api/chat";

type Props = {
  summary: ConversationSummary;
};

export function ConversationSummaryPanel({ summary }: Props) {
  const caseText = summary.case.trim();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-4">
      <section className="rounded-xl border border-slate-800/80 bg-slate-900/60 px-3 py-3">
        <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
          <FileText className="h-4 w-4 text-cyan-300" aria-hidden />
          Case
        </h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">
          {caseText || "No case yet."}
        </p>
      </section>

      <section className="rounded-xl border border-slate-800/80 bg-slate-900/60 px-3 py-3">
        <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
          <ListChecks className="h-4 w-4 text-cyan-300" aria-hidden />
          Plans
        </h2>
        {summary.plans.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No CDP plans yet.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {summary.plans.map((plan, index) => (
              <li
                key={plan.id}
                className="rounded-lg border border-slate-800/80 bg-slate-950/70 px-3 py-2"
              >
                <p className="flex items-start gap-2 text-sm text-slate-200">
                  <Route className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                  <span>
                    {index + 1}. {plan.title || "CDP plan"}
                  </span>
                </p>
                <p className="mt-1 pl-6 font-mono text-[10px] text-slate-500">
                  {plan.id}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
