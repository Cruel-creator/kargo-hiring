import { mainConcern, rank, topStrength } from "./scoring";
import type { CandidateBundle, ProcessingStatus, ReviewStatus, Role } from "./types";
import { FAILED_STATUSES, IN_PROGRESS_STATUSES } from "./types";

/** Display model shared by server pages and client components. Contains no CV text. */

export type DisplayStatus = ReviewStatus | "processing" | "failed";

export interface CandidateRowView {
  id: string;
  name: string;
  email: string | null;
  role: Role;
  score: number | null; // score on the role being viewed
  pmScore: number | null;
  spmScore: number | null;
  rank: number | null; // rank among applicants to `role`, by that role's score
  strength: string | null;
  concern: string | null;
  status: DisplayStatus;
  processing: ProcessingStatus;
  updatedAt: string;
  createdAt: string;
}

export const REVIEW_LABEL: Record<DisplayStatus, string> = {
  review: "Review",
  shortlist: "Shortlisted",
  hold: "Hold",
  not_shortlisted: "Not shortlisted",
  email_ready: "Email ready",
  sent: "Sent",
  processing: "Screening",
  failed: "Needs attention",
};

export const PROCESSING_LABEL: Record<ProcessingStatus, string> = {
  uploaded: "Queued",
  extracting: "Extracting CV",
  extracted: "CV extracted",
  anonymising: "Removing personal information",
  scoring: "Scoring against PM and SPM rubrics",
  generating_brief: "Preparing interview brief",
  generating_email: "Drafting email",
  ready_for_review: "Ready for review",
  sending: "Sending email",
  sent: "Sent",
  extraction_failed: "Couldn't read CV",
  scoring_failed: "Scoring failed",
  generation_failed: "Brief or email failed",
  send_failed: "Send failed",
};

export const PIPELINE_STEPS: { label: string; statuses: ProcessingStatus[] }[] = [
  { label: "Extracting CV", statuses: ["uploaded", "extracting"] },
  { label: "Removing personal information", statuses: ["extracted", "anonymising"] },
  { label: "Scoring against PM and SPM rubrics", statuses: ["scoring"] },
  { label: "Preparing interview brief", statuses: ["generating_brief"] },
  { label: "Drafting email", statuses: ["generating_email"] },
];

export function stepIndex(s: ProcessingStatus): number {
  if (s === "ready_for_review" || s === "sent" || s === "sending" || s === "send_failed") return PIPELINE_STEPS.length;
  if (s === "extraction_failed") return 0;
  if (s === "scoring_failed") return 2;
  if (s === "generation_failed") return 3;
  return Math.max(0, PIPELINE_STEPS.findIndex((st) => st.statuses.includes(s)));
}

export function displayStatus(b: CandidateBundle): DisplayStatus {
  const p = b.candidate.processing_status;
  if (b.result?.email_sent) return "sent";
  if (FAILED_STATUSES.includes(p) && p !== "send_failed") return "failed";
  if (IN_PROGRESS_STATUSES.includes(p) && p !== "sending") return "processing";
  return b.result?.review_status ?? "review";
}

export const roleScore = (b: CandidateBundle, role: Role) => (role === "PM" ? b.result?.pm_score : b.result?.spm_score) ?? null;

export function toRows(bundles: CandidateBundle[], view: Role | "all", includeOtherRole = false): CandidateRowView[] {
  const ranks = new Map<string, number | null>();
  for (const role of ["PM", "SPM"] as Role[]) {
    const pool = bundles.filter((b) => b.candidate.role_applied === role && displayStatus(b) !== "processing" && displayStatus(b) !== "failed");
    for (const r of rank(pool.map((b) => ({ id: b.candidate.id, created_at: b.candidate.created_at, score: roleScore(b, role) })))) {
      ranks.set(`${role}:${r.id}`, r.rank);
    }
  }
  return bundles
    .filter((b) => view === "all" || includeOtherRole || b.candidate.role_applied === view)
    .map((b) => {
      const scoreRole: Role = view === "all" ? b.candidate.role_applied : view;
      const rows = b.scores.filter((s) => s.role === scoreRole);
      const status = displayStatus(b);
      const scored = status !== "processing" && status !== "failed";
      return {
        id: b.candidate.id,
        name: b.candidate.candidate_name || "Unnamed candidate",
        email: b.candidate.candidate_email,
        role: b.candidate.role_applied,
        score: scored ? roleScore(b, scoreRole) : null,
        pmScore: b.result?.pm_score ?? null,
        spmScore: b.result?.spm_score ?? null,
        rank: b.candidate.role_applied === scoreRole ? (ranks.get(`${scoreRole}:${b.candidate.id}`) ?? null) : null,
        strength: scored ? (topStrength(rows)?.criterion_name ?? null) : null,
        concern: scored ? (mainConcern(rows)?.criterion_name ?? null) : null,
        status,
        processing: b.candidate.processing_status,
        updatedAt: b.result?.updated_at && b.result.updated_at > b.candidate.updated_at ? b.result.updated_at : b.candidate.updated_at,
        createdAt: b.candidate.created_at,
      };
    });
}

/** Short labels for criteria in dense contexts. Falls back to the full name for recalibrated rubrics. */
const SHORT: Record<string, string> = {
  "End-to-End Product Ownership": "Product ownership",
  "Customer & Problem Discovery": "Customer discovery",
  "Shipping & Outcome Orientation": "Shipping & outcomes",
  "Operating Without Structure": "Operating without structure",
  "Technical & Systems Fluency": "Technical fluency",
  "Platform / Integration Ownership": "Platform ownership",
  "Independent Product Decision-Making": "Independent decisions",
  "Cross-Functional Influence & Alignment": "Cross-functional influence",
  "Reliability, Data & Systems Thinking": "Reliability & data",
  "Building Product Operating Systems": "Product operating systems",
};
export const shortCriterion = (n: string | null) => (n ? (SHORT[n] ?? n) : null);

const TZ = "Asia/Kolkata";
export function formatDateTime(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: TZ });
  return `${date} · ${time}`;
}
export function formatRelative(iso: string, now = Date.now()) {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const m = Math.round(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: TZ });
}
export const formatScore = (n: number | null) => (n === null ? "—" : Number.isInteger(n) ? String(n) : n.toFixed(1));
