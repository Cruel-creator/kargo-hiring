import { evaluateEligibility, generateBrief, generateEmails, scoreAgainstRubric } from "./ai";
import { detectFileKind, extractText } from "./extract";
import type { GeminiClient } from "./gemini";
import { anonymise, extractPII, findPIILeaks } from "./pii";
import type { Repo } from "./repo";
import { buildScoreRows, mainConcern, validateRubric } from "./scoring";
import type { Candidate, ProcessingStatus, Role } from "./types";
import { personalise } from "./email";

export interface PipelineDeps {
  repo: Repo;
  gemini: GeminiClient;
}

export type Stage = "extract" | "score" | "generate";

class StageError extends Error {
  constructor(
    readonly status: ProcessingStatus,
    message: string,
  ) {
    super(message);
  }
}

const msg = (e: unknown) => (e instanceof Error ? e.message : "Unknown error").slice(0, 400);

/** Where a retry should resume from, given the current state. */
export function retryStage(c: Candidate, hasScores: boolean): Stage | null {
  switch (c.processing_status) {
    case "extraction_failed":
      return "extract";
    case "scoring_failed":
      return c.anonymised_cv_text ? "score" : "extract";
    case "generation_failed":
      return hasScores && c.anonymised_cv_text ? "generate" : c.anonymised_cv_text ? "score" : "extract";
    default:
      return null;
  }
}

export async function runPipeline(candidateId: string, deps: PipelineDeps, from: Stage = "extract"): Promise<ProcessingStatus> {
  const { repo } = deps;
  const set = (processing_status: ProcessingStatus, error_message: string | null = null) =>
    repo.updateCandidate(candidateId, { processing_status, error_message });
  const log = (event: string, detail?: string) => repo.addEvent(candidateId, event, detail ?? null).catch(() => {});

  try {
    let candidate = await repo.getCandidate(candidateId);
    if (!candidate) throw new Error("Candidate not found.");
    await repo.upsertResult(candidateId, {}); // ensure a results row exists

    if (from === "extract") candidate = await stageExtract(candidate, deps, set, log);
    if (from === "extract" || from === "score") await stageScore(candidate, deps, set, log);
    await stageGenerate(candidate.id, deps, set, log);

    await set("ready_for_review");
    await log("ready_for_review", "Ready for Arjun's review");
    return "ready_for_review";
  } catch (e) {
    const status = e instanceof StageError ? e.status : "generation_failed";
    await set(status, msg(e)).catch(() => {});
    await log(status, msg(e));
    return status;
  }
}

type Setter = (s: ProcessingStatus, m?: string | null) => Promise<void>;
type Logger = (event: string, detail?: string) => Promise<void>;

async function stageExtract(candidate: Candidate, { repo }: PipelineDeps, set: Setter, log: Logger): Promise<Candidate> {
  await set("extracting");
  let text: string;
  try {
    if (!candidate.original_file_url) throw new Error("No file stored for this candidate.");
    const bytes = await repo.downloadFile(candidate.original_file_url);
    const kind = detectFileKind(candidate.original_file_name ?? candidate.original_file_url, bytes);
    text = await extractText(kind, bytes);
  } catch (e) {
    throw new StageError("extraction_failed", msg(e));
  }
  await set("extracted");
  await log("extracted", `${text.length} characters read`);

  await set("anonymising");
  const pii = extractPII(text);
  // Manually corrected details (set by Arjun before a retry) win over re-detection.
  const name = candidate.candidate_name ?? pii.candidate_name;
  const email = candidate.candidate_email ?? pii.candidate_email;
  const phone = candidate.candidate_phone ?? pii.candidate_phone;
  const anon = anonymise(text, { candidate_name: name, location_hint: pii.location_hint }, [pii.candidate_name ?? ""]);
  const leaks = findPIILeaks(anon, { candidate_name: name, candidate_email: email, candidate_phone: phone });
  if (leaks.length) {
    throw new StageError(
      "extraction_failed",
      `Privacy check failed (${leaks.join(", ")} still present). Nothing was sent to the AI. Correct the candidate details and retry.`,
    );
  }
  const patch = { candidate_name: name, candidate_email: email, candidate_phone: phone, anonymised_cv_text: anon };
  await repo.updateCandidate(candidate.id, patch);
  await log(
    "anonymised",
    `Separated: ${[name && "name", email && "email", phone && "phone"].filter(Boolean).join(", ") || "no contact details found"}`,
  );
  return { ...candidate, ...patch };
}

async function stageScore(candidate: Candidate, { repo, gemini }: PipelineDeps, set: Setter, log: Logger) {
  await set("scoring");
  try {
    const cv = candidate.anonymised_cv_text;
    if (!cv) throw new Error("No anonymised CV text available.");
    // Defence in depth: re-check the exact text we are about to send.
    const leaks = findPIILeaks(cv, candidate);
    if (leaks.length) throw new Error(`Privacy check failed before scoring (${leaks.join(", ")}). Nothing was sent to the AI.`);

    const [pmRubric, spmRubric] = await Promise.all([repo.getActiveRubric("PM"), repo.getActiveRubric("SPM")]);
    validateRubric("PM", pmRubric);
    validateRubric("SPM", spmRubric);

    const [pm, spm, eligibility] = await Promise.all([
      scoreAgainstRubric(gemini, "PM", pmRubric, cv),
      scoreAgainstRubric(gemini, "SPM", spmRubric, cv),
      evaluateEligibility(gemini, candidate.role_applied, cv),
    ]);
    const pmRows = buildScoreRows(candidate.id, "PM", pmRubric, pm);
    const spmRows = buildScoreRows(candidate.id, "SPM", spmRubric, spm);
    await repo.replaceScores(candidate.id, "PM", pmRows.rows);
    await repo.replaceScores(candidate.id, "SPM", spmRows.rows);
    await repo.upsertResult(candidate.id, { pm_score: pmRows.total, spm_score: spmRows.total, eligibility_status: eligibility });
    await log("scored", `PM ${pmRows.total} · SPM ${spmRows.total} (rubric v${pmRubric[0].rubric_version})`);
  } catch (e) {
    throw new StageError("scoring_failed", msg(e));
  }
}

async function stageGenerate(candidateId: string, { repo, gemini }: PipelineDeps, set: Setter, log: Logger) {
  try {
    const candidate = await repo.getCandidate(candidateId);
    if (!candidate) throw new Error("Candidate not found.");
    const role: Role = candidate.role_applied;
    const rows = (await repo.getScores(candidateId)).filter((s) => s.role === role);
    if (rows.length === 0) throw new Error("No scores found; re-run scoring.");
    const result = await repo.getResult(candidateId);
    const total = role === "PM" ? result?.pm_score : result?.spm_score;

    await set("generating_brief");
    const brief = await generateBrief(gemini, role, rows, Number(total ?? 0), mainConcern(rows));
    await repo.upsertResult(candidateId, { interview_brief: brief });
    await log("brief_generated");

    await set("generating_email");
    const drafts = await generateEmails(gemini, role, rows);
    const patch: Parameters<Repo["upsertResult"]>[1] = {
      draft_interview_subject: drafts.interview.subject,
      draft_interview_body: drafts.interview.body,
      draft_rejection_subject: drafts.rejection.subject,
      draft_rejection_body: drafts.rejection.body,
    };
    // If Arjun already decided, refresh the active draft to match (never after sending).
    if (result && !result.email_sent) {
      const type = result.review_status === "shortlist" ? "interview" : result.review_status === "not_shortlisted" ? "rejection" : null;
      if (type) {
        patch.email_type = type;
        patch.email_subject = drafts[type].subject;
        patch.email_body = personalise(drafts[type].body, candidate.candidate_name);
      }
    }
    await repo.upsertResult(candidateId, patch);
    await log("emails_drafted", "Interview and rejection drafts prepared; nothing sent");
  } catch (e) {
    throw new StageError("generation_failed", msg(e));
  }
}
