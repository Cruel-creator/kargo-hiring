import { sendCandidateEmail } from "@/lib/actions";
import { fail, handleError, json, readJson, UUID_RE } from "@/lib/http";
import { emailEnv, getRepo } from "@/lib/server";

export const runtime = "nodejs";

/**
 * POST /api/send-email  { candidate_id }
 * Server-only Resend call. Validates candidate, recipient, subject/body and duplicate state,
 * claims the send atomically, and marks email_sent only after Resend accepts the message.
 */
export async function POST(req: Request) {
  try {
    const { candidate_id } = await readJson<{ candidate_id?: string }>(req);
    if (!candidate_id || !UUID_RE.test(candidate_id)) return fail("candidate_id is required.", 400, "bad_id");
    const out = await sendCandidateEmail(getRepo(), candidate_id, emailEnv());
    return json({ ok: true, ...out });
  } catch (e) {
    return handleError(e, "send-email");
  }
}
