import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Status } from "./status";
import { ContactDetails, DecisionBar } from "./candidate-actions";
import { ScoreBreakdown } from "./score-breakdown";
import { InterviewBrief } from "./interview-brief";
import { EmailComposer } from "./email-composer";
import { ProcessingPanel } from "./processing-panel";
import { WeightRibbon } from "./ui";
import { arrive } from "./motion/arrival";
import { ActivityTimeline } from "./detail/activity-timeline";
import { JumpLink } from "./detail/jump-link";
import { Monogram } from "./monogram";
import { DetailMotionStyles } from "./detail/motion-styles";
import { Reveal } from "./detail/reveal";
import { RunningHead } from "./detail/running-head";
import { ScoreCount } from "./detail/score-count";
import { StageTracker } from "./detail/stage-tracker";
import { StickyAside } from "./detail/sticky-aside";
import { SEP, SEP_ROW } from "./detail/sep";
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
  const name = candidate.candidate_name || "Unnamed candidate";
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
  const order = new Map(rubrics[role].map((c, i) => [c.id, i]));
  const appliedRows = scores.filter((s) => s.role === role).sort((a, b) => (order.get(a.criterion_id) ?? 99) - (order.get(b.criterion_id) ?? 99));
  const shortlisted = !!result && (result.review_status === "shortlist" || (result.email_type === "interview" && (result.review_status === "email_ready" || result.email_sent)));

  return (
    <div className="pt-6 lg:pt-8">
      <DetailMotionStyles />
      {/* Back link, and where this candidate is in the pipeline. */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <Link href={`/?role=${role}`} className="inline-flex items-center gap-1.5 rounded-sm text-sm text-ink-2 transition-colors duration-[var(--duration-fast)] hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden /> {ROLE_LABEL[role]} candidates
        </Link>
        <StageTracker status={status} emailType={result?.email_type ?? null} />
      </div>

      {/* Identity on the left, the founder's decision on the right. No arrival: the name is visible on every open. */}
      <header id="identity" className="grid gap-x-16 gap-y-5 border-b border-line-strong pb-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="flex min-w-0 items-start gap-4 sm:gap-5">
          <Monogram name={candidate.candidate_name} shortlisted={shortlisted} size="xl" className="mt-0.5" />
          <div className="min-w-0">
            <h1 className="max-w-5xl text-display text-balance text-ink [overflow-wrap:anywhere]">{name}</h1>
            {/* Separators never start or end a line (see detail/sep). */}
            <div className="mt-2 overflow-x-clip text-sm text-muted">
              <div className={SEP_ROW}>
                <span className={cx(SEP, "font-medium text-ink-2")}>{ROLE_LABEL[role]}</span>
                <span className={cx(SEP, "whitespace-nowrap")}>
                  Uploaded <span className="tnum">{formatDateTime(candidate.created_at)}</span>
                </span>
                {candidate.original_file_url ? (
                  <span className={cx(SEP, "whitespace-nowrap")}>
                    <a href={`/api/candidates/${id}/file`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 rounded-sm text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink">
                      <FileText className="size-3.5" aria-hidden />
                      Original CV
                    </a>
                  </span>
                ) : null}
              </div>
            </div>
            <ContactDetails id={id} name={candidate.candidate_name} email={candidate.candidate_email} phone={candidate.candidate_phone} locked={!!result?.email_sent} />
          </div>
        </div>
        <div className="flex flex-col gap-2 lg:items-end">
          <div className="flex items-center gap-2 text-meta text-muted">
            Your decision <span aria-hidden>·</span> <Status status={status} className="text-meta" />
          </div>
          <DecisionBar id={id} current={result?.review_status ?? "review"} emailType={result?.email_type ?? null} disabled={!canDecide || !!result?.email_sent} />
          <NextStep result={result} />
        </div>
      </header>

      <RunningHead name={name} score={applied} role={role} status={status} />

      {inProgress || failed ? <ProcessingPanel id={id} status={candidate.processing_status} error={candidate.error_message} /> : null}

      {screened && result ? (
        <div className="mt-8 grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(340px,400px)]">
          <div className="min-w-0" {...arrive("lift")}>
            <Reveal>
              {/* AI screening: typography, not cards. Kept apart from the decision above. */}
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
                      <ScoreCount value={applied ?? null} id={id} className="text-score font-semibold tracking-[-0.03em] text-ink" />
                      <span className="text-sm text-muted">/ 100</span>
                    </dd>
                    <dd data-rank className="tnum mt-1 text-meta text-muted">
                      {rankRow?.rank ? `Rank ${rankRow.rank} of ${poolSize} ${role} ${poolSize === 1 ? "applicant" : "applicants"}` : "Not ranked"}
                    </dd>
                  </div>
                  <ScoreFact label={role === "PM" ? "SPM score" : "PM score"} value={role === "PM" ? result.spm_score : result.pm_score} active={false} />
                  <EligibilityFact e={result.eligibility_status} />
                </dl>

                {/* Every point of the total, traced to its row and its quoted evidence. */}
                <p className="mt-6 text-label font-medium text-muted">Score composition · {role} rubric</p>
                <div data-ribbon-arrive>
                  <WeightRibbon
                    // Name over figure: at detail width the slices are too narrow to share one line without truncating both.
                    className="tnum mt-2 [&_a>span+span]:flex-col [&_a>span+span]:items-start [&_a>span+span]:gap-0 [&_a>span+span>span]:max-w-full"
                    label={`Score composition, ${role} rubric`}
                    items={appliedRows.map((r) => ({ id: r.criterion_id, name: r.criterion_name, weight: r.criterion_weight, points: r.weighted_score, score: r.score }))}
                  />
                </div>

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

              <ActivityTimeline events={events} className="mt-8 border-t border-line pt-6" />
            </Reveal>
          </div>

          <StickyAside data-aside className="flex min-w-0 flex-col">
            <div {...arrive("lift", { delay: 30 })}>
              <Reveal className="flex flex-col gap-8">
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
              </Reveal>
            </div>
          </StickyAside>
        </div>
      ) : !inProgress && !failed ? (
        <p className="mt-8 text-body text-muted">Screening results are not available yet.</p>
      ) : null}
    </div>
  );
}

const TYPE_LABEL = { interview: "Interview invite", rejection: "Rejection" } as const;

/** One line under the decision: what the decision has set in motion, and where to act on it. */
function NextStep({ result }: { result: CandidateResult | null }) {
  if (!result) return null;
  const review = (
    <JumpLink to="#email-title" className="rounded-sm text-ink underline decoration-line-strong underline-offset-4 transition-colors duration-[var(--duration-fast)] hover:decoration-ink-2">
      Review email
    </JumpLink>
  );
  let line: ReactNode = null;
  if (result.email_sent) line = result.sent_at ? <span className="tnum">Sent {formatDateTime(result.sent_at)}</span> : "Sent";
  else if (result.review_status === "email_ready" && result.email_type) line = <>{TYPE_LABEL[result.email_type]} ready to send <span aria-hidden>·</span> {review}</>;
  else if (result.review_status === "shortlist") line = <>Interview invite drafted <span aria-hidden>·</span> {review}</>;
  else if (result.review_status === "not_shortlisted") line = <>Rejection drafted <span aria-hidden>·</span> {review}</>;
  if (!line) return null;
  return <p data-next-step className="text-meta text-ink-2">{line}</p>;
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
