import { PageHeader } from "@/components/shell";
import { CandidateList } from "@/components/candidate-list";
import { SetupNotice } from "@/components/setup-notice";
import { ConfigError, getRepo, publicMessage } from "@/lib/server";
import { toRows } from "@/lib/view";
import type { CandidateBundle, Role } from "@/lib/types";

export const dynamic = "force-dynamic";

const TITLES: Record<Role | "all", string> = { all: "Hiring", PM: "Product Manager", SPM: "Senior Product Manager" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const view: Role | "all" = sp.role === "PM" || sp.role === "SPM" ? sp.role : "all";
  const cross = sp.cross === "1" && view !== "all";

  let bundles: CandidateBundle[] = [];
  let problem: { missing?: string[]; message?: string } | null = null;
  try {
    bundles = await getRepo().listBundles();
  } catch (e) {
    problem = e instanceof ConfigError ? { missing: e.missing } : { message: publicMessage(e) };
  }

  return (
    <>
      <PageHeader
        title={TITLES[view]}
        description={
          view === "all"
            ? "Review candidates, compare evidence, and prepare interviews."
            : `Ranked by ${view} rubric score. Every score links to the CV evidence behind it.`
        }
      />
      {problem ? (
        <SetupNotice missing={problem.missing} message={problem.message} />
      ) : (
        <CandidateList rows={toRows(bundles, view, cross)} view={view} cross={cross} totalCandidates={bundles.length} />
      )}
    </>
  );
}
