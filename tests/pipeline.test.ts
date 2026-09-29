import { describe, expect, it } from "vitest";
import { runPipeline, retryStage } from "../src/lib/pipeline";
import { setDecision } from "../src/lib/actions";
import { mainConcern, topStrength } from "../src/lib/scoring";
import { createGeminiClient, GeminiError } from "../src/lib/gemini";
import { SCORING_RULE } from "../src/lib/ai";
import type { Role } from "../src/lib/types";
import { fakeGemini, fixture, memoryRepo, okBrief, okEligibility, okEmails, scoresFrom } from "./helpers";

async function setup(file: string, role: Role, gemini: ReturnType<typeof fakeGemini>) {
  const mem = memoryRepo();
  const c = await mem.repo.createCandidate({ role_applied: role, original_file_name: file, original_file_type: "text/plain" });
  const path = `${c.id}/${file}`;
  await mem.repo.uploadFile(path, new TextEncoder().encode(fixture(file)), "text/plain");
  await mem.repo.updateCandidate(c.id, { original_file_url: path });
  const status = await runPipeline(c.id, { repo: mem.repo, gemini: gemini.client });
  return { mem, id: c.id, status };
}

function assertNoPiiInPrompts(calls: { prompt: string; system: string }[], pii: string[]) {
  for (const call of calls) for (const v of pii) expect(call.prompt + call.system).not.toContain(v);
}

describe("1. strong PM candidate", () => {
  it("scores high on PM, stores traceable rows, drafts both emails, sends no PII to Gemini", async () => {
    const g = fakeGemini({
      "PM scoring": scoresFrom("PM", {
        "End-to-End Product Ownership": [5, "Owned the shipment tracking module end to end, from problem definition to launch and two rounds of post-launch iteration."],
        "Customer & Problem Discovery": [5, "Spent two days a month at forwarder offices in Bhiwandi shadowing operations staff"],
        "Shipping & Outcome Orientation": [5, "inbound \"where is my shipment\" calls fell 38% in one quarter"],
        "Operating Without Structure": [4, "First PM hired; there was no product process before me"],
        "Technical & Systems Fluency": [4, "carrier API integration design, including polling vs webhook trade-offs"],
      }),
      "SPM scoring": scoresFrom("SPM", { "Platform / Integration Ownership": [2, "carrier API integration design"] }),
      eligibility: okEligibility,
      "interview brief": okBrief,
      "email drafts": okEmails,
    });
    const { mem, id, status } = await setup("strong-pm.txt", "PM", g);
    expect(status).toBe("ready_for_review");

    const c = (await mem.repo.getCandidate(id))!;
    expect(c.candidate_name).toBe("Tanvi Kulkarni");
    expect(c.candidate_email).toBe("tanvi.kulkarni.pm@example.com");
    expect(c.candidate_phone).toBe("+91 98201 47315");

    const r = (await mem.repo.getResult(id))!;
    expect(r.pm_score).toBe(25 + 20 + 20 + 16 + 12); // 93
    expect(r.spm_score).toBe(10);
    expect(r.review_status).toBe("review"); // no AI decision
    expect(r.email_type).toBeNull(); // nothing queued until Arjun decides
    expect(r.email_sent).toBe(false);
    expect(r.draft_interview_body).toContain("{{first_name}}");

    const rows = (await mem.repo.getScores(id)).filter((s) => s.role === "PM");
    expect(rows).toHaveLength(5);
    expect(rows.every((s) => s.evidence_verified)).toBe(true);
    expect(topStrength(rows)?.criterion_name).toBe("End-to-End Product Ownership");

    // Every Gemini call is PII-free and the scoring prompt carries the required rule.
    assertNoPiiInPrompts(g.calls, ["Tanvi", "Kulkarni", "tanvi.kulkarni.pm@example.com", "98201 47315", "linkedin.com", "Gokhale Road"]);
    expect(g.calls.find((x) => x.label === "PM scoring")!.prompt).toContain(SCORING_RULE);
    expect(g.calls.find((x) => x.label === "PM scoring")!.prompt).toContain("End-to-End Product Ownership");

    // Name is inserted server-side only when Arjun decides.
    await setDecision(mem.repo, id, "shortlist");
    const after = (await mem.repo.getResult(id))!;
    expect(after.email_type).toBe("interview");
    expect(after.email_body).toMatch(/^Hi Tanvi,/);
    expect(after.email_body).not.toContain("{{first_name}}");
  });
});

describe("2. strong SPM candidate", () => {
  it("scores high on SPM and keeps both role scores", async () => {
    const g = fakeGemini({
      "PM scoring": scoresFrom("PM", { "End-to-End Product Ownership": [3, "Owned the rate management feature from discovery through launch."] }),
      "SPM scoring": scoresFrom("SPM", {
        "Platform / Integration Ownership": [5, "Owned the partner integration platform: ERP, customs and 14 carrier integrations"],
        "Independent Product Decision-Making": [5, "With no Head of Product, I set the platform roadmap and decided to deprecate the legacy EDI connector"],
        "Cross-Functional Influence & Alignment": [4, "Aligned sales, customer success and engineering on an integration SLA"],
        "Reliability, Data & Systems Thinking": [4, "failed sync incidents dropped from 30 a month to 6"],
        "Building Product Operating Systems": [5, "Built the quarterly planning cadence and PRD review ritual used by all five product teams"],
      }),
      eligibility: () => ({ location_status: "Willing to relocate", location_evidence: "open to relocating to Mumbai", role_match: "Strong", role_match_evidence: "Owned the partner integration platform" }),
      "interview brief": okBrief,
      "email drafts": okEmails,
    });
    const { mem, id, status } = await setup("strong-spm.txt", "SPM", g);
    expect(status).toBe("ready_for_review");
    const r = (await mem.repo.getResult(id))!;
    expect(r.spm_score).toBe(25 + 25 + 16 + 12 + 15); // 93
    expect(r.pm_score).toBe(15);
    expect(r.eligibility_status?.location_status).toBe("Willing to relocate");
    // The brief is generated from the SPM rows because the candidate applied for SPM.
    expect(g.calls.find((c) => c.label === "interview brief")!.prompt).toContain("Platform / Integration Ownership");
    assertNoPiiInPrompts(g.calls, ["Siddharth", "Menon", "siddharth.menon@example.org", "4719 2836"]);
  });
});

describe("3. technical candidate without PM evidence", () => {
  it("scores 0 where there is no evidence and has no top strength", async () => {
    const g = fakeGemini({
      "PM scoring": scoresFrom("PM", { "Technical & Systems Fluency": [3, "Designed PostgreSQL partitioning for the tracking history tables."] }),
      "SPM scoring": scoresFrom("SPM", { "Reliability, Data & Systems Thinking": [3, "On-call lead; wrote runbooks for the ingestion services."] }),
      eligibility: () => ({ location_status: "Relocation unclear", location_evidence: "Location: Pune", role_match: "Unclear", role_match_evidence: "Not stated in CV" }),
      "interview brief": okBrief,
      "email drafts": okEmails,
    });
    const { mem, id } = await setup("technical-no-pm.txt", "PM", g);
    const r = (await mem.repo.getResult(id))!;
    expect(r.pm_score).toBe(9);
    const rows = (await mem.repo.getScores(id)).filter((s) => s.role === "PM");
    expect(rows.filter((s) => s.score === 0)).toHaveLength(4);
    expect(rows.filter((s) => s.score === 0).every((s) => s.evidence === "")).toBe(true);
    expect(topStrength(rows)?.criterion_name).toBe("Technical & Systems Fluency");
    expect(mainConcern(rows)?.criterion_name).toBe("End-to-End Product Ownership");
  });
});

describe("4. PM with strong discovery, weak technical evidence", () => {
  it("flags technical fluency as the main concern and asks the brief to probe it", async () => {
    const g = fakeGemini({
      "PM scoring": scoresFrom("PM", {
        "End-to-End Product Ownership": [3, "Owned the store onboarding flow from research to launch."],
        "Customer & Problem Discovery": [5, "Ran 60+ interviews with kirana store owners across Thane and Kalyan"],
        "Shipping & Outcome Orientation": [4, "failed deliveries dropped 17%"],
        "Operating Without Structure": [2, "Read and tagged 200 support tickets a week to build a monthly problems report for leadership."],
      }),
      "SPM scoring": scoresFrom("SPM", {}),
      eligibility: okEligibility,
      "interview brief": okBrief,
      "email drafts": okEmails,
    });
    const { mem, id } = await setup("discovery-weak-tech.txt", "PM", g);
    const rows = (await mem.repo.getScores(id)).filter((s) => s.role === "PM");
    expect(topStrength(rows)?.criterion_name).toBe("Customer & Problem Discovery");
    expect(mainConcern(rows)?.criterion_name).toBe("Technical & Systems Fluency"); // loses all 15 points
    expect(g.calls.find((c) => c.label === "interview brief")!.prompt).toMatch(/WEAKEST OR LEAST CERTAIN AREA.*Technical & Systems Fluency/);
    expect(rows.find((s) => s.criterion_name === "Technical & Systems Fluency")!.score).toBe(0);
  });
});

const allOk = () =>
  fakeGemini({
    "PM scoring": scoresFrom("PM", { "End-to-End Product Ownership": [4, "Owned the container booking workflow from problem definition to launch."] }),
    "SPM scoring": scoresFrom("SPM", {}),
    eligibility: okEligibility,
    "interview brief": okBrief,
    "email drafts": okEmails,
  });

describe("5/6. missing contact details", () => {
  it("5. missing email: screening completes, email stays null", async () => {
    const { mem, id, status } = await setup("missing-email.txt", "PM", allOk());
    expect(status).toBe("ready_for_review");
    const c = (await mem.repo.getCandidate(id))!;
    expect(c.candidate_email).toBeNull();
    expect(c.candidate_phone).toBe("+91 97690 22418");
    expect(c.candidate_name).toBe("Rhea Fernandes");
  });

  it("6. missing phone: screening completes, phone stays null", async () => {
    const g = fakeGemini({
      "PM scoring": scoresFrom("PM", { "End-to-End Product Ownership": [3, "Owned the invoice reconciliation screen for 60 transporter accounts."] }),
      "SPM scoring": scoresFrom("SPM", {}),
      eligibility: okEligibility,
      "interview brief": okBrief,
      "email drafts": okEmails,
    });
    const { mem, id, status } = await setup("missing-phone.txt", "PM", g);
    expect(status).toBe("ready_for_review");
    const c = (await mem.repo.getCandidate(id))!;
    expect(c.candidate_phone).toBeNull();
    expect(c.candidate_email).toBe("kabir.sethi@example.com");
  });
});

describe("9. Gemini failure", () => {
  it("marks scoring_failed with a clear message, then retry resumes from scoring", async () => {
    let fail = true;
    const g = fakeGemini({
      "PM scoring": () => {
        if (fail) throw new GeminiError("Gemini PM scoring request failed (503): overloaded", true);
        return scoresFrom("PM", {})();
      },
      "SPM scoring": scoresFrom("SPM", {}),
      eligibility: okEligibility,
      "interview brief": okBrief,
      "email drafts": okEmails,
    });
    const { mem, id, status } = await setup("strong-pm.txt", "PM", g);
    expect(status).toBe("scoring_failed");
    const c = (await mem.repo.getCandidate(id))!;
    expect(c.error_message).toMatch(/503/);
    expect(c.anonymised_cv_text).toBeTruthy(); // extraction survived
    expect(retryStage(c, false)).toBe("score");

    fail = false;
    expect(await runPipeline(id, { repo: mem.repo, gemini: g.client }, "score")).toBe("ready_for_review");
    expect((await mem.repo.getResult(id))!.pm_score).toBe(0);
  });

  it("rejects malformed model output (score out of range, missing criterion) after one corrective retry", async () => {
    const g = fakeGemini({
      "PM scoring": () => ({ criteria: [{ criterion: "End-to-End Product Ownership", score: 9, evidence: "x", reason: "y" }] }),
      "SPM scoring": scoresFrom("SPM", {}),
      eligibility: okEligibility,
    });
    const { status, mem, id } = await setup("strong-pm.txt", "PM", g);
    expect(status).toBe("scoring_failed");
    expect((await mem.repo.getCandidate(id))!.error_message).toMatch(/Invalid score|Missing criteria/);
    expect(g.calls.filter((c) => c.label === "PM scoring")).toHaveLength(2);
    expect(g.calls.filter((c) => c.label === "PM scoring")[1].prompt).toContain("previous response was rejected");
  });

  it("generation failure marks generation_failed and retry resumes at generation", async () => {
    let fail = true;
    const g = fakeGemini({
      "PM scoring": scoresFrom("PM", {}),
      "SPM scoring": scoresFrom("SPM", {}),
      eligibility: okEligibility,
      "interview brief": okBrief,
      "email drafts": () => {
        if (fail) throw new GeminiError("Gemini email drafts request failed (500)", true);
        return okEmails();
      },
    });
    const { status, mem, id } = await setup("strong-pm.txt", "PM", g);
    expect(status).toBe("generation_failed");
    fail = false;
    const c = (await mem.repo.getCandidate(id))!;
    expect(retryStage(c, true)).toBe("generate");
    expect(await runPipeline(id, { repo: mem.repo, gemini: g.client }, "generate")).toBe("ready_for_review");
    expect(g.calls.filter((x) => x.label === "PM scoring")).toHaveLength(1); // not re-scored
  });

  it("client retries 429/5xx, never retries 4xx, and never puts the key in the URL", async () => {
    const seen: { url: string; key: string | null }[] = [];
    let n = 0;
    const fetchImpl = (async (url: string, init: RequestInit) => {
      seen.push({ url, key: new Headers(init.headers).get("x-goog-api-key") });
      n++;
      if (n === 1) return new Response(JSON.stringify({ error: { message: "rate" } }), { status: 429 });
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] }), { status: 200 });
    }) as unknown as typeof fetch;
    const client = createGeminiClient({ apiKey: "test-key", fetchImpl, baseDelayMs: 1 });
    expect(await client.generateJson({ system: "s", prompt: "p", schema: {}, label: "t" })).toEqual({ ok: true });
    expect(seen).toHaveLength(2);
    expect(seen.every((s) => !s.url.includes("test-key") && s.key === "test-key")).toBe(true);

    let calls = 0;
    const bad = createGeminiClient({
      apiKey: "k",
      baseDelayMs: 1,
      fetchImpl: (async () => {
        calls++;
        return new Response(JSON.stringify({ error: { message: "API key not valid" } }), { status: 400 });
      }) as unknown as typeof fetch,
    });
    await expect(bad.generateJson({ system: "s", prompt: "p", schema: {}, label: "t" })).rejects.toThrow(/400/);
    expect(calls).toBe(1);

    const invalidJson = createGeminiClient({
      apiKey: "k",
      baseDelayMs: 1,
      maxAttempts: 2,
      fetchImpl: (async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "not json" }] } }] }))) as unknown as typeof fetch,
    });
    await expect(invalidJson.generateJson({ system: "s", prompt: "p", schema: {}, label: "t" })).rejects.toThrow(/invalid JSON/);

    await expect(createGeminiClient({ apiKey: undefined }).generateJson({ system: "", prompt: "", schema: {}, label: "t" })).rejects.toThrow(/GEMINI_API_KEY/);
  });

  it("parses fenced JSON responses", async () => {
    const client = createGeminiClient({
      apiKey: "k",
      fetchImpl: (async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '```json\n{"a":1}\n```' }] } }] }))) as unknown as typeof fetch,
    });
    expect(await client.generateJson({ system: "", prompt: "", schema: {}, label: "t" })).toEqual({ a: 1 });
  });
});
