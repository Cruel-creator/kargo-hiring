import type { Repo } from "./repo";
import type { CandidateResult, EmailType } from "./types";
import { idempotencyKey, isValidEmail, personalise, ResendError, sendViaResend } from "./email";

/** Arjun's actions. Each returns {ok} or a user-facing error with an HTTP status. */

export class ActionError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
  }
}

export type Decision = "shortlist" | "hold" | "not_shortlisted" | "review";

const typeFor = (d: Decision): EmailType | null => (d === "shortlist" ? "interview" : d === "not_shortlisted" ? "rejection" : null);

async function load(repo: Repo, id: string) {
  const candidate = await repo.getCandidate(id);
  if (!candidate) throw new ActionError("Candidate not found.", 404, "not_found");
  const result = await repo.getResult(id);
  return { candidate, result };
}

function assertNotSent(result: CandidateResult | null) {
  if (result?.email_sent) throw new ActionError("An email has already been sent to this candidate; the record is locked.", 409, "already_sent");
}

export async function setDecision(repo: Repo, id: string, decision: Decision) {
  const { candidate, result } = await load(repo, id);
  assertNotSent(result);
  if (!result) throw new ActionError("This candidate has not been screened yet.", 409, "not_ready");
  const type = typeFor(decision);
  const patch: Partial<CandidateResult> = { review_status: decision };
  if (type) {
    const keepEdits = result.email_type === type && result.email_body;
    if (!keepEdits) {
      const subject = type === "interview" ? result.draft_interview_subject : result.draft_rejection_subject;
      const body = type === "interview" ? result.draft_interview_body : result.draft_rejection_body;
      patch.email_type = type;
      patch.email_subject = subject;
      patch.email_body = body ? personalise(body, candidate.candidate_name) : null;
    }
  } else {
    patch.email_type = null; // Hold / back to review: no email is queued
  }
  await repo.upsertResult(id, patch);
  await repo.addEvent(id, "decision", `Arjun set status to ${decision}`).catch(() => {});
}

export async function saveEmail(repo: Repo, id: string, input: { subject: string; body: string; markReady: boolean }) {
  const { result } = await load(repo, id);
  assertNotSent(result);
  if (!result?.email_type) throw new ActionError("Choose Shortlist or Not Shortlist before editing the email.", 409, "no_decision");
  const subject = input.subject.trim();
  const body = input.body.trim();
  if (!subject) throw new ActionError("Subject cannot be empty.", 400, "missing_subject");
  if (!body) throw new ActionError("Body cannot be empty.", 400, "missing_body");
  if (subject.length > 200) throw new ActionError("Subject is too long.", 400, "subject_too_long");
  if (body.length > 10_000) throw new ActionError("Body is too long.", 400, "body_too_long");
  if (/\{\{[^}]*\}\}|\[(?:CANDIDATE|NAME|EMAIL|PHONE)\]/.test(body)) throw new ActionError("The body still contains a placeholder.", 400, "placeholder");
  await repo.upsertResult(id, { email_subject: subject, email_body: body, ...(input.markReady ? { review_status: "email_ready" } : {}) });
  await repo.addEvent(id, input.markReady ? "email_ready" : "email_edited", "Draft edited by Arjun").catch(() => {});
}

export async function resetEmail(repo: Repo, id: string) {
  const { candidate, result } = await load(repo, id);
  assertNotSent(result);
  if (!result?.email_type) throw new ActionError("No decision has been made yet.", 409, "no_decision");
  const t = result.email_type;
  const body = t === "interview" ? result.draft_interview_body : result.draft_rejection_body;
  await repo.upsertResult(id, {
    email_subject: t === "interview" ? result.draft_interview_subject : result.draft_rejection_subject,
    email_body: body ? personalise(body, candidate.candidate_name) : null,
  });
}

export async function updateContact(repo: Repo, id: string, input: { name?: string | null; email?: string | null; phone?: string | null }) {
  const { result } = await load(repo, id);
  assertNotSent(result);
  const clean = (v: string | null | undefined) => (v === undefined ? undefined : v?.trim() ? v.trim() : null);
  const email = clean(input.email);
  if (email && !isValidEmail(email)) throw new ActionError("That email address is not valid.", 400, "invalid_email");
  const name = clean(input.name);
  if (name && name.length > 100) throw new ActionError("Name is too long.", 400, "invalid_name");
  const phone = clean(input.phone);
  await repo.updateCandidate(id, {
    ...(name !== undefined ? { candidate_name: name } : {}),
    ...(email !== undefined ? { candidate_email: email } : {}),
    ...(phone !== undefined ? { candidate_phone: phone } : {}),
  });
  await repo.addEvent(id, "contact_updated", "Candidate details corrected by Arjun").catch(() => {});
}

export interface SendEnv {
  apiKey: string | undefined;
  from: string | undefined;
  fromName?: string;
  redirectTo?: string | null;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

/**
 * Confirm & Send. Order matters:
 * validate → atomic claim (dedupe) → Resend → only then mark email_sent + sent_at.
 */
export async function sendCandidateEmail(repo: Repo, id: string, env: SendEnv) {
  const { candidate, result } = await load(repo, id);
  if (!result) throw new ActionError("This candidate has no email draft.", 409, "not_ready");
  if (result.email_sent) {
    throw new ActionError(`Already sent${result.sent_at ? ` on ${new Date(result.sent_at).toUTCString()}` : ""}. Duplicate send blocked.`, 409, "duplicate");
  }
  if (!candidate.candidate_email) throw new ActionError("No email address on file for this candidate. Add one first.", 400, "missing_email");
  if (!isValidEmail(candidate.candidate_email)) throw new ActionError("The candidate's email address is invalid. Correct it first.", 400, "invalid_email");
  const decisionOk =
    (result.email_type === "interview" && (result.review_status === "shortlist" || result.review_status === "email_ready")) ||
    (result.email_type === "rejection" && (result.review_status === "not_shortlisted" || result.review_status === "email_ready"));
  if (!decisionOk) throw new ActionError("Make a decision (Shortlist or Not Shortlist) before sending.", 409, "no_decision");
  if (!result.email_subject?.trim()) throw new ActionError("The email subject is empty.", 400, "missing_subject");
  if (!result.email_body?.trim()) throw new ActionError("The email body is empty.", 400, "missing_body");
  if (!env.apiKey) throw new ActionError("RESEND_API_KEY is not configured on the server.", 500, "config");
  if (!env.from || !isValidEmail(env.from)) throw new ActionError("HIRING_FROM_EMAIL is missing or invalid.", 500, "config");

  const claimed = await repo.claimSend(id);
  if (!claimed) throw new ActionError("This email is already being sent or has been sent. Duplicate send blocked.", 409, "duplicate");

  const to = env.redirectTo && isValidEmail(env.redirectTo) ? env.redirectTo : candidate.candidate_email;
  const subject = result.email_subject.trim();
  const text = result.email_body.trim();

  let resendId: string;
  try {
    const out = await sendViaResend({
      apiKey: env.apiKey,
      from: env.from,
      fromName: env.fromName,
      to,
      subject,
      text,
      idempotencyKey: await idempotencyKey(id, to, subject, text),
      fetchImpl: env.fetchImpl,
    });
    resendId = out.id;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Send failed.";
    await repo.updateCandidate(id, { processing_status: "send_failed", error_message: message });
    await repo.addEvent(id, "send_failed", message).catch(() => {});
    const status = e instanceof ResendError ? e.status : 502;
    throw new ActionError(message, status, e instanceof ResendError ? e.kind : "provider");
  }

  const sentAt = (env.now?.() ?? new Date()).toISOString();
  const recorded = await repo.markSent(id, { sent_at: sentAt, sent_to: to, resend_message_id: resendId });
  await repo.updateCandidate(id, { processing_status: "sent", error_message: null });
  await repo.addEvent(id, "sent", `${result.email_type} email sent via Resend (${resendId})`).catch(() => {});
  if (!recorded) throw new ActionError("Email was sent, but the record was already marked sent.", 409, "duplicate");
  return { sent_at: sentAt, resend_message_id: resendId, redirected: to !== candidate.candidate_email };
}
