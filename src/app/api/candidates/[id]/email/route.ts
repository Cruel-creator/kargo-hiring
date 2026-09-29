import { resetEmail, saveEmail } from "@/lib/actions";
import { handleError, idParam, json, readJson } from "@/lib/http";
import { getRepo } from "@/lib/server";

export const runtime = "nodejs";

/** Save Arjun's edits to the active draft. {reset:true} restores the generated draft. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = await idParam(params);
    const body = await readJson<{ subject?: string; body?: string; markReady?: boolean; reset?: boolean }>(req);
    const repo = getRepo();
    if (body.reset) await resetEmail(repo, id);
    else await saveEmail(repo, id, { subject: String(body.subject ?? ""), body: String(body.body ?? ""), markReady: !!body.markReady });
    const r = await repo.getResult(id);
    return json({ ok: true, email_subject: r?.email_subject, email_body: r?.email_body, review_status: r?.review_status });
  } catch (e) {
    return handleError(e, "email");
  }
}
