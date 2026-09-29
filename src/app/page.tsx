import { DashboardView } from "@/components/dashboard/dashboard-view";
import { ConfigError, getRepo, publicMessage } from "@/lib/server";
import type { CandidateBundle, Role } from "@/lib/types";

export const dynamic = "force-dynamic";

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

  return <DashboardView bundles={bundles} view={view} cross={cross} problem={problem} />;
}
