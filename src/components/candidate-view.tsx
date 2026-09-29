import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";
import { HeaderTools } from "./shell";
import { Status } from "./status";
import { ContactDetails, DecisionBar } from "./candidate-actions";
import { ScoreBreakdown } from "./score-breakdown";
import { InterviewBrief } from "./interview-brief";
import { EmailComposer } from "./email-composer";
import { ProcessingPanel } from "./processing-panel";
import { mainConcern } from "@/lib/scoring";
import { ROLE_LABEL, FAILED_STATUSES, IN_PROGRESS_STATUSES, type Candidate, type CandidateBundle, type CandidateEvent, type CandidateResult, type CandidateScore, type Eligibility, type Role, type RubricCriterion } from "@/lib/types";
import { displayStatus, formatDateTime, formatScore, toRows } from "@/lib/view";
import { cx } from "@/lib/cx";
import { personalise } from "@/lib/email";

export interface CandidateViewData {
  candidate: Candidate;
  result: CandidateResult | null;
  scores: CandidateScore[];
  events: CandidateEvent[];
  bundles: CandidateBundle[];
  rubrics: Record<Role, RubricCriterion[]>;
  redirectTo: string | null;
}

/** Presentational review workspace. Data is loaded by the route. */
export function CandidateView({ candidate, result, scores, events, bundles, rubrics, redirectTo }: CandidateViewData) {
  const id = candidate.id;
  const role: Role = candidate.role_applied;
  const bundle = { candidate, result, scores };
  const status = displayStatus(bundle);
  const inProgress = IN_PROGRESS_STATUSES.includes(candidate.processing_status) && candidate.processing_status !== "sending";
  const failed = FAILED_STATUSES.includes(candidate.processing_status) && candidate.processing_status !== "send_failed";
  const screened = !!result && result.pm_score !== null && result.spm_score !== null;
  const rankRow = toRows(bundles, role).find((r) => r.id === id);
  const poolSize = toRows(bundles, role).filter((r) => r.rank !== null).length;
  const applied = role === "PM" ? result?.pm_score : result?.spm_score;
  const concern = mainConcern(scores.filter((s) => s.role === role));
  const canDecide = candidate.processing_status === "ready_for_review" || candidate.processing_status === "send_failed";

  return (
    <div className="pt-6 lg:pt-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link href={`/?role=${role}`} className="inline-flex items-center gap-1.5 rounded-sm text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden /> Candidates
        </Link>
        <div className="hidden sm:block">
          <HeaderTools upload={false} />
        </div>
      </div>

      {/* Identity + Arjun's decision */}
      <header className="flex flex-col gap-5 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-hero font-semibold tracking-[-0.02em] text-ink">{candidate.candidate_name || "Unnamed candidate"}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-muted">
            <span className="font-medium text-ink-2">{ROLE_LABEL[role]}</span>
            <span aria-hidden>·</span>
            <span>Uploaded {formatDateTime(candidate.created_at)}</span>
            {candidate.original_file_url ? (
              <>
                <span aria-hidden>·</span>
                <a href={`/api/candidates/${id}/file`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 rounded-sm text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink">
                  <FileText className="size-3.5" aria-hidden />
                  Original CV
                </a>
              </>
            ) : null}
          </div>
          <ContactDetails id={id} name={candidate.candidate_name} email={candidate.candidate_email} phone={candidate.candidate_phone} locked={!!result?.email_sent} />
        </div>
        <div className="flex flex-col gap-2 lg:items-end">
          <div className="flex items-center gap-2 text-meta text-muted">
            Your decision <span aria-hidden>·</span> <Status status={status} className="text-meta" />
          </div>
          <DecisionBar id={id} current={result?.review_status ?? "review"} emailType={result?.email_type ?? null} disabled={!canDecide || !!result?.email_sent} />
        </div>
      </header>

      {inProgress || failed ? <ProcessingPanel id={id} status={candidate.processing_status} error={candidate.error_message} /> : null}

      {screened && result ? (
        <div className="mt-8 grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(340px,400px)]">
          <div className="min-w-0">
            {/* Overview: typography, not cards */}
            <section aria-labelledby="overview-title">
              <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 id="overview-title" className="text-name font-semibold tracking-[-0.01em] text-ink">
                  AI screening
                </h2>
                <p className="text-meta text-muted">Recommendations for your review. The decision above is yours.</p>
              </div>
              <dl className="grid grid-cols-2 gap-x-10 gap-y-5 sm:grid-cols-[auto_auto_1fr]">
                <div className="col-span-2 sm:col-span-1">
                  <dt className="text-label font-medium text-muted">Overall score · {role} rubric</dt>
                  <dd className="mt-1 flex items-baseline gap-1">
                    <span className="tnum text-score font-semibold tracking-[-0.03em] text-ink">{formatScore(applied ?? null)}</span>
                    <span className="text-sm text-muted">/ 100</span>
                  </dd>
                  <dd className="mt-1 text-meta text-muted">{rankRow?.rank ? `Rank ${rankRow.rank} of ${poolSize} ${role} applicants` : "Not ranked"}</dd>
                </div>
                <ScoreFact label={role === "PM" ? "SPM score" : "PM score"} value={role === "PM" ? result.spm_score : result.pm_score} active={false} />
                <EligibilityFact e={result.eligibility_status} />
              </dl>
              <p className="mt-5 text-meta text-muted">
                Screened from the anonymised CV. Each criterion is scored 0–5 on quoted evidence only; totals are calculated by Kargo, not the model.
              </p>
            </section>

            <ScoreBreakdown
              className="mt-10"
              applied={role}
              scores={scores}
              rubrics={{
                PM: rubrics.PM.map((c) => ({ id: c.id, description: c.description })),
                SPM: rubrics.SPM.map((c) => ({ id: c.id, description: c.description })),
              }}
            />

            <details className="group mt-10 border-t border-line pt-4">
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-sm text-sm font-medium text-ink-2 hover:text-ink">
                Activity
                <span className="text-meta font-normal text-muted group-open:hidden">{events.length} events</span>
              </summary>
              <ol className="mt-3 space-y-1.5">
                {events.map((ev, i) => (
                  <li key={ev.id ?? i} className="grid grid-cols-[150px_1fr] gap-3 text-meta">
                    <span className="tnum text-muted">{ev.created_at ? formatDateTime(ev.created_at) : ""}</span>
                    <span className="text-ink-2">
                      <span className="font-medium">{ev.event.replaceAll("_", " ")}</span>
                      {ev.detail ? <span className="text-muted"> — {ev.detail}</span> : null}
                    </span>
                  </li>
                ))}
              </ol>
            </details>
          </div>

          <aside className="flex min-w-0 flex-col gap-10">
            <InterviewBrief brief={result.interview_brief} concern={concern?.criterion_name ?? null} />
            <EmailComposer
              id={id}
              candidateName={candidate.candidate_name}
              to={candidate.candidate_email}
              redirectTo={redirectTo}
              result={{
                review_status: result.review_status,
                email_type: result.email_type,
                email_subject: result.email_subject,
                email_body: result.email_body,
                email_sent: result.email_sent,
                sent_at: result.sent_at,
                sent_to: result.sent_to,
              }}
              previews={{
                interview: result.draft_interview_body
                  ? { subject: result.draft_interview_subject ?? "", body: personalise(result.draft_interview_body, candidate.candidate_name) }
                  : null,
                rejection: result.draft_rejection_body
                  ? { subject: result.draft_rejection_subject ?? "", body: personalise(result.draft_rejection_body, candidate.candidate_name) }
                  : null,
              }}
              processing={candidate.processing_status}
              error={candidate.processing_status === "send_failed" ? candidate.error_message : null}
            />
          </aside>
        </div>
      ) : !inProgress && !failed ? (
        <p className="mt-8 text-body text-muted">Screening results are not available yet.</p>
      ) : null}
    </div>
  );
}

function ScoreFact({ label, value, active }: { label: string; value: number | null; active: boolean }) {
  return (
    <div>
      <dt className="text-label font-medium text-muted">{label}</dt>
      <dd className={cx("tnum mt-1 text-name font-semibold", active ? "text-ink" : "text-ink-2")}>
        {formatScore(value)}
        <span className="ml-0.5 text-meta font-normal text-muted">/100</span>
      </dd>
      <dd className="text-meta text-muted">{active ? "Applied role" : "Cross-role, for comparison"}</dd>
    </div>
  );
}

function EligibilityFact({ e }: { e: Eligibility | null }) {
  const locationTone = e?.location_status === "Mumbai" || e?.location_status === "Willing to relocate" ? "text-ink" : e?.location_status === "Not aligned" ? "text-danger" : "text-warn";
  return (
    <div>
      <dt className="text-label font-medium text-muted">Eligibility</dt>
      {e ? (
        <>
          <dd className="mt-1 text-sm">
            <span className={cx("font-medium", locationTone)}>{e.location_status}</span>
            <span className="text-ink-2"> · {e.role_match} role match</span>
          </dd>
          <dd className="mt-1 max-w-[44ch] text-meta text-muted">
            <span className="line-clamp-2">&ldquo;{e.location_evidence}&rdquo;</span>
            <span className="mt-0.5 block">Checked separately from the score.</span>
          </dd>
        </>
      ) : (
        <dd className="mt-1 text-sm text-muted">Not evaluated</dd>
      )}
    </div>
  );
}
