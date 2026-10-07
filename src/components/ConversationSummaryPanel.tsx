import { useState } from "react";
import { FileText, ListChecks, Route } from "lucide-react";
import type { CdpRunRecord, ConversationSummary, SummaryPlan } from "../api/chat";
import { FormattedAiText } from "./FormattedAiText";

type Props = {
  summary: ConversationSummary;
};

function ClampText({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const truncated = text.length > 100;

  return (
    <div className="mt-2 text-sm text-slate-200">
      {open || !truncated ? (
        <FormattedAiText text={text} className="text-sm text-slate-200" />
      ) : (
        <span className="[&>div]:inline [&>div>p]:inline">
          <FormattedAiText
            text={text.slice(0, 100).trimEnd()}
            className="text-sm text-slate-200"
          />
          ...{" "}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="font-medium text-cyan-300 hover:text-cyan-200"
          >
            see more
          </button>
        </span>
      )}
      {open && truncated ? (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-1 block text-xs font-medium text-cyan-300 hover:text-cyan-200"
        >
          see less
        </button>
      ) : null}
    </div>
  );
}

function SummaryField({
  label,
  text,
  empty,
}: {
  label: string;
  text: string;
  empty: string;
}) {
  return (
    <section>
      <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
        <FileText className="h-4 w-4 text-cyan-300" aria-hidden />
        {label}
      </h2>
      {text ? (
        <ClampText text={text} />
      ) : (
        <p className="mt-2 text-sm text-slate-500">{empty}</p>
      )}
    </section>
  );
}

function suiteHeading(feature: string): string {
  const name = feature.trim();
  return name ? `Test suite - ${name}` : "Test suite";
}

function groupSuites<T extends { response_id: string; feature: string }>(
  items: T[],
): { key: string; heading: string; items: T[] }[] {
  const groups: { key: string; heading: string; items: T[] }[] = [];
  for (const item of items) {
    const key = item.response_id || "earlier";
    let group = groups.find((entry) => entry.key === key);
    if (!group) {
      group = { key, heading: suiteHeading(item.feature), items: [] };
      groups.push(group);
    } else if (item.feature.trim() && group.heading === "Test suite") {
      group.heading = suiteHeading(item.feature);
    }
    group.items.push(item);
  }
  return groups;
}

function PlanCard({ plan, index }: { plan: SummaryPlan; index: number }) {
  return (
    <li className="rounded-lg border border-slate-800/80 bg-slate-950/70 px-3 py-2">
      <p className="flex items-start gap-2 text-sm text-slate-200">
        <Route className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        <span>
          {index + 1}. {plan.title || "CDP plan"}
        </span>
      </p>
      <p className="mt-1 pl-6 font-mono text-[10px] text-slate-500">{plan.id}</p>
    </li>
  );
}

function RunCard({ run }: { run: CdpRunRecord }) {
  return (
    <li className="rounded-lg border border-slate-800/80 bg-slate-950/70 px-3 py-2">
      <p className="text-sm text-slate-200">
        {run.title ? `${run.title} · ` : ""}
        {run.status === "passed" ? "Passed" : "Failed"}
      </p>
      {run.status_message.trim() ? (
        <p className="mt-1 whitespace-pre-wrap text-xs text-slate-400">
          {run.status_message}
        </p>
      ) : null}
      <p className="mt-1 font-mono text-[10px] text-slate-500">
        {run.case_id || run.cdp_step_id}
      </p>
    </li>
  );
}

export function ConversationSummaryPanel({ summary }: Props) {
  const brief = summary.brief_summary.trim();
  const caseText = summary.case.trim();

  return (
    <div className="flex min-h-0 flex-1 select-text flex-col gap-5 overflow-y-auto px-3 py-4">
      <SummaryField label="Brief" text={brief} empty="No brief summary yet." />
      <SummaryField label="Detailed" text={caseText} empty="No detailed summary yet." />

      <section>
        <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
          <ListChecks className="h-4 w-4 text-cyan-300" aria-hidden />
          Plans
        </h2>
        {summary.plans.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No CDP plans yet.</p>
        ) : (
          <div className="mt-2 flex flex-col gap-4">
            {groupSuites(summary.plans).map((group) => (
              <div key={group.key}>
                <h3 className="text-sm font-medium text-slate-200">{group.heading}</h3>
                <ul className="mt-2 flex flex-col gap-2">
                  {group.items.map((plan, index) => (
                    <PlanCard key={plan.id} plan={plan} index={index} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
          <ListChecks className="h-4 w-4 text-cyan-300" aria-hidden />
          Runs
        </h2>
        {summary.cdp_runs.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No CDP runs yet.</p>
        ) : (
          <div className="mt-2 flex flex-col gap-4">
            {groupSuites(summary.cdp_runs).map((group) => (
              <div key={group.key}>
                <h3 className="text-sm font-medium text-slate-200">{group.heading}</h3>
                <ul className="mt-2 flex flex-col gap-2">
                  {group.items.map((run, index) => (
                    <RunCard key={`${run.case_id || run.cdp_step_id}-${index}`} run={run} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
