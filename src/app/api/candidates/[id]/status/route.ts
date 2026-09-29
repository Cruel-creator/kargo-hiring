import { fail, handleError, idParam, json } from "@/lib/http";
import { getRepo } from "@/lib/server";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = await idParam(params);
    const c = await getRepo().getCandidate(id);
    if (!c) return fail("Candidate not found.", 404, "not_found");
    return json({ id: c.id, processing_status: c.processing_status, error_message: c.error_message, updated_at: c.updated_at });
  } catch (e) {
    return handleError(e, "status");
  }
}
