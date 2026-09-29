import { notFound } from "next/navigation";
import { CandidateView } from "@/components/candidate-view";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { SettingsView } from "@/components/flows/settings-view";
import type { Role } from "@/lib/types";
import { syntheticBundles, syntheticEvents, syntheticRubrics } from "./synthetic";

export const dynamic = "force-dynamic";

const PREVIEW_CHECKS: [string, boolean, string][] = [
  ["Supabase", false, "Not configured"],
  ["Gemini", false, "GEMINI_API_KEY not set"],
  ["Resend", false, "RESEND_API_KEY not set. Sending is disabled."],
  ["Sender", false, "HIRING_FROM_EMAIL not set"],
];

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
        <CandidateView {...b} events={syntheticEvents(b)} bundles={bundles} rubrics={syntheticRubrics} redirectTo={null} />
      </>
    );
  }
  if (sp.page === "settings") {
    return (
      <>
        {banner}
        <SettingsView rubrics={syntheticRubrics} rubricError={null} checks={PREVIEW_CHECKS} redirectTo="founder@example.com" />
      </>
    );
  }
  const view: Role | "all" = sp.role === "PM" || sp.role === "SPM" ? sp.role : "all";
  const cross = sp.cross === "1" && view !== "all";
  return (<>{banner}<DashboardView bundles={sp.empty ? [] : bundles} view={view} cross={cross} linkBase="/dev/preview?c=" /></>);
}
