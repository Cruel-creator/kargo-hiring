export const ROLES = ["PM", "SPM"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  PM: "Product Manager",
  SPM: "Senior Product Manager",
};

export const PROCESSING_STATUSES = [
  "uploaded",
  "extracting",
  "extracted",
  "anonymising",
  "scoring",
  "generating_brief",
  "generating_email",
  "ready_for_review",
  "sending",
  "sent",
  "extraction_failed",
  "scoring_failed",
  "generation_failed",
  "send_failed",
] as const;
export type ProcessingStatus = (typeof PROCESSING_STATUSES)[number];

export const FAILED_STATUSES: ProcessingStatus[] = [
  "extraction_failed",
  "scoring_failed",
  "generation_failed",
  "send_failed",
];
export const IN_PROGRESS_STATUSES: ProcessingStatus[] = [
  "uploaded",
  "extracting",
  "extracted",
  "anonymising",
  "scoring",
  "generating_brief",
  "generating_email",
  "sending",
];

/** Arjun's decision state. Only he changes it. */
export const REVIEW_STATUSES = [
  "review",
  "shortlist",
  "hold",
  "not_shortlisted",
  "email_ready",
  "sent",
] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export type EmailType = "interview" | "rejection";

export type LocationStatus = "Mumbai" | "Willing to relocate" | "Relocation unclear" | "Not aligned";
export type RoleMatch = "Strong" | "Partial" | "Unclear";

export interface Eligibility {
  location_status: LocationStatus;
  location_evidence: string;
  role_match: RoleMatch;
  role_match_evidence: string;
}

export interface InterviewBrief {
  why_scored: string;
  strongest_evidence: string;
  probe: string;
}

export interface RubricCriterion {
  id: string;
  role: Role;
  criterion_name: string;
  description: string;
  weight: number;
  score_anchors: Record<string, string>;
  sort_order: number;
  rubric_version: number;
}

export interface Candidate {
  id: string;
  candidate_name: string | null;
  candidate_email: string | null;
  candidate_phone: string | null;
  role_applied: Role;
  original_file_url: string | null;
  original_file_name: string | null;
  original_file_type: string | null;
  anonymised_cv_text: string | null;
  processing_status: ProcessingStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface CandidateScore {
  id?: string;
  candidate_id: string;
  role: Role;
  criterion_id: string;
  criterion_name: string;
  criterion_weight: number;
  rubric_version: number;
  score: number;
  evidence: string;
  evidence_verified: boolean;
  reason: string;
  weighted_score: number;
  created_at?: string;
}

export interface CandidateResult {
  id?: string;
  candidate_id: string;
  pm_score: number | null;
  spm_score: number | null;
  eligibility_status: Eligibility | null;
  interview_brief: InterviewBrief | null;
  review_status: ReviewStatus;
  email_type: EmailType | null;
  email_subject: string | null;
  email_body: string | null;
  draft_interview_subject: string | null;
  draft_interview_body: string | null;
  draft_rejection_subject: string | null;
  draft_rejection_body: string | null;
  email_sent: boolean;
  sent_at: string | null;
  sent_to: string | null;
  resend_message_id: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CandidateEvent {
  id?: string;
  candidate_id: string;
  event: string;
  detail: string | null;
  created_at?: string;
}

export interface CandidateBundle {
  candidate: Candidate;
  result: CandidateResult | null;
  scores: CandidateScore[];
}
