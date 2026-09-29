import { PageHeader } from "@/components/shell";
import { CandidateList } from "@/components/candidate-list";
import { SetupNotice } from "@/components/setup-notice";
import { toRows } from "@/lib/view";
import type { CandidateBundle, Role } from "@/lib/types";

export const DASHBOARD_TITLES: Record<Role | "all", string> = { all: "Hiring", PM: "Product Manager", SPM: "Senior Product Manager" };
export interface DashboardViewProps { bundles: CandidateBundle[]; view: Role | "all"; cross: boolean; problem?: { missing?: string[]; message?: string } | null; linkBase?: string }

export function DashboardView({ bundles, view, cross, problem = null }: DashboardViewProps) {
  return (
    <>
      <PageHeader title={DASHBOARD_TITLES[view]} description="Review candidates, compare evidence, and prepare interviews." />
      {problem ? <SetupNotice missing={problem.missing} message={problem.message} /> : <CandidateList rows={toRows(bundles, view, cross)} view={view} cross={cross} totalCandidates={bundles.length} />}
    </>
  );
}
