import { describe, expect, it } from "vitest";
import { ActionError, saveEmail, sendCandidateEmail, setDecision, updateContact } from "../src/lib/actions";
import { isValidEmail, personalise } from "../src/lib/email";
import { validateEmailDrafts } from "../src/lib/ai";
import { memoryRepo, okEmails } from "./helpers";

async function readyCandidate(opts: { email?: string | null; decision?: "shortlist" | "not_shortlisted" | null } = {}) {
  const mem = memoryRepo();
  const c = await mem.repo.createCandidate({ role_applied: "PM", original_file_name: "cv.txt", original_file_type: "text/plain" });
  await mem.repo.updateCandidate(c.id, {
    candidate_name: "Tanvi Kulkarni",
    candidate_email: opts.email === undefined ? "tanvi@example.com" : opts.email,
    processing_status: "ready_for_review",
  });
  const d = okEmails();
  await mem.repo.upsertResult(c.id, {
    pm_score: 82,
    draft_interview_subject: d.interview.subject,
    draft_interview_body: d.interview.body,
    draft_rejection_subject: d.rejection.subject,
    draft_rejection_body: d.rejection.body,
  });
  if (opts.decision !== null) await setDecision(mem.repo, c.id, opts.decision ?? "shortlist");
  return { mem, id: c.id };
}

type Call = { url: string; body: Record<string, unknown>; headers: Headers };
function resendFake(respond: (n: number) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init.body)), headers: new Headers(init.headers) });
    return respond(calls.length);
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}
const ok = () => new Response(JSON.stringify({ id: "re_123" }), { status: 200 });
const env = (fetchImpl: typeof fetch) => ({ apiKey: "re_test", from: "hiring@kargo.example", fromName: "Arjun Mehta", fetchImpl });

describe("happy path", () => {
  it("sends via Resend and only then marks email_sent with sent_at", async () => {
    const { mem, id } = await readyCandidate();
    const r = resendFake(() => ok());
    const out = await sendCandidateEmail(mem.repo, id, { ...env(r.fetchImpl), now: () => new Date("2026-09-28T13:12:00Z") });
    expect(out.resend_message_id).toBe("re_123");
    expect(r.calls).toHaveLength(1);
    expect(r.calls[0].url).toBe("https://api.resend.com/emails");
    expect(r.calls[0].headers.get("authorization")).toBe("Bearer re_test");
    expect(r.calls[0].headers.get("idempotency-key")).toMatch(/^kargo-/);
    expect(r.calls[0].body.to).toEqual(["tanvi@example.com"]);
    expect(String(r.calls[0].body.text)).toMatch(/^Hi Tanvi,/);
    const res = (await mem.repo.getResult(id))!;
    expect(res.email_sent).toBe(true);
    expect(res.sent_at).toBe("2026-09-28T13:12:00.000Z");
    expect(res.review_status).toBe("sent");
    expect((await mem.repo.getCandidate(id))!.processing_status).toBe("sent");
  });

  it("EMAIL_REDIRECT_TO sends to the test inbox instead of the candidate", async () => {
    const { mem, id } = await readyCandidate();
    const r = resendFake(() => ok());
    const out = await sendCandidateEmail(mem.repo, id, { ...env(r.fetchImpl), redirectTo: "mesa-test@example.com" });
    expect(r.calls[0].body.to).toEqual(["mesa-test@example.com"]);
    expect(out.redirected).toBe(true);
  });
});

describe("5. missing / invalid email", () => {
  it("blocks sending with no email and never calls Resend", async () => {
    const { mem, id } = await readyCandidate({ email: null });
    const r = resendFake(() => ok());
    await expect(sendCandidateEmail(mem.repo, id, env(r.fetchImpl))).rejects.toMatchObject({ status: 400, code: "missing_email" });
    expect(r.calls).toHaveLength(0);
    expect((await mem.repo.getResult(id))!.email_sent).toBe(false);
  });

  it("blocks an invalid address, and validates corrections", async () => {
    const { mem, id } = await readyCandidate({ email: "tanvi@@example" });
    const r = resendFake(() => ok());
    await expect(sendCandidateEmail(mem.repo, id, env(r.fetchImpl))).rejects.toMatchObject({ code: "invalid_email" });
    await expect(updateContact(mem.repo, id, { email: "not-an-email" })).rejects.toBeInstanceOf(ActionError);
    await updateContact(mem.repo, id, { email: "tanvi.k@example.com" });
    await sendCandidateEmail(mem.repo, id, env(r.fetchImpl));
    expect(r.calls[0].body.to).toEqual(["tanvi.k@example.com"]);
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("a b@c.com")).toBe(false);
  });
});

describe("10. Resend failure", () => {
  it("provider error: send_failed, email_sent stays false, retry allowed", async () => {
    const { mem, id } = await readyCandidate();
    const r = resendFake((n) => (n === 1 ? new Response(JSON.stringify({ name: "application_error", message: "Internal error" }), { status: 500 }) : ok()));
    await expect(sendCandidateEmail(mem.repo, id, env(r.fetchImpl))).rejects.toMatchObject({ status: 502 });
    expect((await mem.repo.getResult(id))!.email_sent).toBe(false);
    const c = (await mem.repo.getCandidate(id))!;
    expect(c.processing_status).toBe("send_failed");
    expect(c.error_message).toMatch(/Internal error/);
    await sendCandidateEmail(mem.repo, id, env(r.fetchImpl));
    expect((await mem.repo.getResult(id))!.email_sent).toBe(true);
  });

  it("network error is reported and nothing is marked sent", async () => {
    const { mem, id } = await readyCandidate();
    const fetchImpl = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    await expect(sendCandidateEmail(mem.repo, id, env(fetchImpl))).rejects.toMatchObject({ code: "network", status: 503 });
    expect((await mem.repo.getResult(id))!.email_sent).toBe(false);
  });

  it("missing API key or sender fails fast without claiming", async () => {
    const { mem, id } = await readyCandidate();
    await expect(sendCandidateEmail(mem.repo, id, { apiKey: undefined, from: "hiring@kargo.example" })).rejects.toMatchObject({ code: "config", status: 500 });
    await expect(sendCandidateEmail(mem.repo, id, { apiKey: "k", from: undefined })).rejects.toMatchObject({ code: "config" });
    expect((await mem.repo.getCandidate(id))!.processing_status).toBe("ready_for_review");
  });

  it("Resend 422 on recipient maps to invalid_email", async () => {
    const { mem, id } = await readyCandidate();
    const r = resendFake(() => new Response(JSON.stringify({ name: "validation_error", message: "Invalid `to` field." }), { status: 422 }));
    await expect(sendCandidateEmail(mem.repo, id, env(r.fetchImpl))).rejects.toMatchObject({ code: "invalid_email", status: 400 });
  });
});

describe("11. duplicate send", () => {
  it("concurrent clicks result in exactly one Resend call", async () => {
    const { mem, id } = await readyCandidate();
    const r = resendFake(async () => {
      await new Promise((res) => setTimeout(res, 20));
      return ok();
    });
    const results = await Promise.allSettled([1, 2, 3].map(() => sendCandidateEmail(mem.repo, id, env(r.fetchImpl))));
    expect(results.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((x) => x.status === "rejected").every((x) => (x as PromiseRejectedResult).reason.code === "duplicate")).toBe(true);
    expect(r.calls).toHaveLength(1);
  });

  it("after sending, further sends, edits and decisions are blocked", async () => {
    const { mem, id } = await readyCandidate();
    const r = resendFake(() => ok());
    await sendCandidateEmail(mem.repo, id, env(r.fetchImpl));
    await expect(sendCandidateEmail(mem.repo, id, env(r.fetchImpl))).rejects.toMatchObject({ status: 409, code: "duplicate" });
    await expect(saveEmail(mem.repo, id, { subject: "x", body: "y", markReady: false })).rejects.toMatchObject({ code: "already_sent" });
    await expect(setDecision(mem.repo, id, "not_shortlisted")).rejects.toMatchObject({ code: "already_sent" });
    expect(r.calls).toHaveLength(1);
  });
});

describe("human approval", () => {
  it("nothing can be sent before Arjun decides", async () => {
    const { mem, id } = await readyCandidate({ decision: null });
    const r = resendFake(() => ok());
    await expect(sendCandidateEmail(mem.repo, id, env(r.fetchImpl))).rejects.toMatchObject({ code: "no_decision" });
    await setDecision(mem.repo, id, "hold");
    await expect(sendCandidateEmail(mem.repo, id, env(r.fetchImpl))).rejects.toMatchObject({ code: "no_decision" });
    expect(r.calls).toHaveLength(0);
  });

  it("Not Shortlist selects the rejection draft; edits are kept and validated", async () => {
    const { mem, id } = await readyCandidate({ decision: "not_shortlisted" });
    let res = (await mem.repo.getResult(id))!;
    expect(res.email_type).toBe("rejection");
    await expect(saveEmail(mem.repo, id, { subject: "", body: "b", markReady: true })).rejects.toMatchObject({ code: "missing_subject" });
    await expect(saveEmail(mem.repo, id, { subject: "s", body: "Hi {{first_name}}", markReady: true })).rejects.toMatchObject({ code: "placeholder" });
    await saveEmail(mem.repo, id, { subject: "Your Kargo application", body: "Hi Tanvi,\n\nThank you.", markReady: true });
    res = (await mem.repo.getResult(id))!;
    expect(res.review_status).toBe("email_ready");
    const r = resendFake(() => ok());
    await sendCandidateEmail(mem.repo, id, env(r.fetchImpl));
    expect(r.calls[0].body.subject).toBe("Your Kargo application");
  });

  it("name insertion falls back to a neutral greeting when no name is stored", () => {
    expect(personalise("Hi {{first_name}},\n\nThanks.", null, "")).toBe("Hi there,\n\nThanks.");
    expect(personalise("Hi {{first_name}},", "Dr. Kavya Iyer", "Arjun")).toBe("Hi Kavya,\n\nArjun");
  });

  it("email validation rejects fabricated praise, reasons and placeholders", () => {
    const base = okEmails();
    expect(() => validateEmailDrafts({ ...base, interview: { ...base.interview, body: "Hi {{first_name}}, we were impressed by your experience." } }, false)).toThrow(/impressed/);
    expect(() => validateEmailDrafts({ ...base, rejection: { ...base.rejection, body: "Hi {{first_name}}, you lack platform experience." } }, true)).toThrow(/neutral/);
    expect(() => validateEmailDrafts({ ...base, interview: { ...base.interview, body: "Hi [NAME], thanks" } }, true)).toThrow();
    expect(() => validateEmailDrafts({ ...base, interview: { ...base.interview, body: "Hi {{first_name}}, your score was 82." } }, true)).toThrow(/scoring/);
    expect(validateEmailDrafts(base, false)).toEqual(base);
  });
});
