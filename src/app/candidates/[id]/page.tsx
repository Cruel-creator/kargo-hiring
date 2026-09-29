import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SetupNotice } from "@/components/setup-notice";
import { CandidateView } from "@/components/candidate-view";
import { ConfigError, emailEnv, getRepo, publicMessage } from "@/lib/server";
import { UUID_RE } from "@/lib/http";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Candidate" };

export default async function CandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  let data;
  try {
    const repo = getRepo();
    const [candidate, result, scores, events, bundles, pmRubric, spmRubric] = await Promise.all([
      repo.getCandidate(id),
      repo.getResult(id),
      repo.getScores(id),
      repo.listEvents(id),
      repo.listBundles(),
      repo.getActiveRubric("PM"),
      repo.getActiveRubric("SPM"),
    ]);
    if (!candidate) notFound();
    data = { candidate, result, scores, events, bundles, rubrics: { PM: pmRubric, SPM: spmRubric } };
  } catch (e) {
    if (e instanceof ConfigError) return <SetupNotice missing={e.missing} />;
    if (e && typeof e === "object" && "digest" in e) throw e; // let notFound() through
    return <SetupNotice message={publicMessage(e)} />;
  }

  return <CandidateView {...data} redirectTo={emailEnv().redirectTo} />;
}
