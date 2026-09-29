import { after } from "next/server";
import { fail, handleError, idParam, json } from "@/lib/http";
import { retryStage, runPipeline, type Stage } from "@/lib/pipeline";
import { getGemini, getRepo } from "@/lib/server";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Retry a failed stage, or {rescreen:true} to re-run the whole screen (e.g. after correcting the name). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = await idParam(params);
    const body = (await req.json().catch(() => ({}))) as { rescreen?: boolean };
    const repo = getRepo();
    const c = await repo.getCandidate(id);
    if (!c) return fail("Candidate not found.", 404, "not_found");
    const result = await repo.getResult(id);
    if (result?.email_sent) return fail("An email has already been sent; this candidate is locked.", 409, "already_sent");

    let stage: Stage | null;
    if (body.rescreen) {
      if (c.processing_status !== "ready_for_review" && !retryStage(c, true)) {
        return fail("Screening is already in progress.", 409, "busy");
      }
      stage = "extract";
    } else {
      stage = retryStage(c, (await repo.getScores(id)).length > 0);
      if (!stage) return fail("Nothing to retry for this candidate.", 409, "not_failed");
    }
    await repo.updateCandidate(id, { processing_status: "uploaded", error_message: null });
    await repo.addEvent(id, "retry", body.rescreen ? "Full re-screen requested" : `Retry from ${stage}`).catch(() => {});
    const gemini = getGemini();
    const from = stage;
    after(() => runPipeline(id, { repo, gemini }, from).then(() => undefined));
    return json({ id, processing_status: "uploaded", from }, 202);
  } catch (e) {
    return handleError(e, "retry");
  }
}
