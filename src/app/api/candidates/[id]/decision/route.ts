import { setDecision, type Decision } from "@/lib/actions";
import { fail, handleError, idParam, json, readJson } from "@/lib/http";
import { getRepo } from "@/lib/server";

export const runtime = "nodejs";
const DECISIONS: Decision[] = ["shortlist", "hold", "not_shortlisted", "review"];

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = await idParam(params);
    const { decision } = await readJson<{ decision?: Decision }>(req);
    if (!decision || !DECISIONS.includes(decision)) return fail("Unknown decision.", 400, "bad_decision");
    const repo = getRepo();
    const c = await repo.getCandidate(id);
    if (!c) return fail("Candidate not found.", 404, "not_found");
    if (c.processing_status !== "ready_for_review" && c.processing_status !== "send_failed") {
      return fail("Wait for screening to finish before deciding.", 409, "not_ready");
    }
    await setDecision(repo, id, decision);
    return json({ ok: true, review_status: decision });
  } catch (e) {
    return handleError(e, "decision");
  }
}
