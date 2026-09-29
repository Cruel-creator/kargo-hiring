import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell";
import { CandidateList } from "@/components/candidate-list";
import { CandidateView } from "@/components/candidate-view";
import { toRows } from "@/lib/view";
import type { Role } from "@/lib/types";
import { syntheticBundles, syntheticEvents, syntheticRubrics } from "./synthetic";

export const dynamic = "force-dynamic";

/** Development-only visual harness with synthetic data. Never served in production. */
export default async function Preview({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const sp = await searchParams;
  const bundles = syntheticBundles();
  const banner = <p className="mt-4 rounded-md border border-dashed border-line-strong px-3 py-1.5 text-meta text-muted">Synthetic preview data · development only</p>;

  if (sp.c) {
    const b = bundles.find((x) => x.candidate.id.endsWith(sp.c!)) ?? bundles[0];
    return (
      <>
        {banner}
        <CandidateView {...b} events={syntheticEvents(b.candidate.id)} bundles={bundles} rubrics={syntheticRubrics} redirectTo={null} />
      </>
    );
  }
  const view: Role | "all" = sp.role === "PM" || sp.role === "SPM" ? sp.role : "all";
  return (
    <>
      {banner}
      <PageHeader title={view === "all" ? "Hiring" : view} description="Review candidates, compare evidence, and prepare interviews." />
      <CandidateList rows={toRows(bundles, view, sp.cross === "1")} view={view} cross={sp.cross === "1"} totalCandidates={sp.empty ? 0 : bundles.length} />
    </>
  );
}
