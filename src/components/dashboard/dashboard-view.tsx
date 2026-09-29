import { SetupNotice } from "@/components/setup-notice";
import { toRows } from "@/lib/view";
import type { CandidateBundle, Role } from "@/lib/types";
import { DashboardClient } from "./dashboard-client";
import { evidenceFor } from "./evidence";
import { buildQueue } from "./queue";

export const DASHBOARD_TITLES: Record<Role | "all", string> = { all: "Hiring", PM: "Product Manager", SPM: "Senior Product Manager" };
export interface DashboardViewProps { bundles: CandidateBundle[]; view: Role | "all"; cross: boolean; problem?: { missing?: string[]; message?: string } | null; linkBase?: string }

const FIRST_RUN: [string, string][] = [
  ["Extract and anonymise", "Name, email and phone are separated before anything reaches the AI."],
  ["Score against both rubrics", "Each criterion is scored 0 to 5 on quoted evidence; Kargo calculates the totals."],
  ["You decide and send", "Nothing is sent without your click."],
];

export function DashboardView({ bundles, view, cross, problem = null, linkBase = "/candidates/" }: DashboardViewProps) {
  const rows = toRows(bundles, view, cross);
  const queue = buildQueue(rows, view);
  const evidence = evidenceFor(bundles, new Set(queue.map((q) => q.row.id)));
  return (
    <>
      <DashboardClient title={DASHBOARD_TITLES[view]} rows={rows} view={view} cross={cross} total={bundles.length} evidence={evidence} problem={!!problem} linkBase={linkBase} />
      {problem ? (
        <div className="mt-8">
          <SetupNotice missing={problem.missing} message={problem.message} />
        </div>
      ) : null}
      {bundles.length === 0 && !problem ? (
        <ol aria-label="How screening works" className="mt-8 max-w-3xl border-t border-line">
          {FIRST_RUN.map(([title, body], i) => (
            <li key={title} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3 border-b border-line py-3.5">
              <span className="tnum text-sm text-muted">{i + 1}</span>
              <span>
                <span className="block text-sm font-medium text-ink">{title}</span>
                <span className="block text-meta text-muted">{body}</span>
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </>
  );
}
