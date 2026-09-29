import type {
  Candidate,
  CandidateBundle,
  CandidateEvent,
  CandidateResult,
  CandidateScore,
  Role,
  RubricCriterion,
} from "./types";

/** Data access boundary. Supabase in production (repo-supabase.ts); in-memory in tests. */
export interface Repo {
  getActiveRubric(role: Role): Promise<RubricCriterion[]>;
  createCandidate(input: Pick<Candidate, "role_applied" | "original_file_name" | "original_file_type">): Promise<Candidate>;
  getCandidate(id: string): Promise<Candidate | null>;
  updateCandidate(id: string, patch: Partial<Omit<Candidate, "id" | "created_at">>): Promise<void>;
  uploadFile(path: string, bytes: Uint8Array, contentType: string): Promise<void>;
  downloadFile(path: string): Promise<Uint8Array>;
  signedFileUrl(path: string): Promise<string | null>;
  replaceScores(candidateId: string, role: Role, rows: CandidateScore[]): Promise<void>;
  getScores(candidateId: string): Promise<CandidateScore[]>;
  getResult(candidateId: string): Promise<CandidateResult | null>;
  upsertResult(candidateId: string, patch: Partial<Omit<CandidateResult, "id" | "candidate_id">>): Promise<void>;
  /** Atomic: exactly one concurrent caller gets true. */
  claimSend(candidateId: string): Promise<boolean>;
  /** Conditional write: only succeeds while email_sent is still false. */
  markSent(candidateId: string, patch: { sent_at: string; sent_to: string; resend_message_id: string }): Promise<boolean>;
  listBundles(): Promise<CandidateBundle[]>;
  addEvent(candidateId: string, event: string, detail?: string | null): Promise<void>;
  listEvents(candidateId: string): Promise<CandidateEvent[]>;
}

export const EMPTY_RESULT: Omit<CandidateResult, "candidate_id"> = {
  pm_score: null,
  spm_score: null,
  eligibility_status: null,
  interview_brief: null,
  review_status: "review",
  email_type: null,
  email_subject: null,
  email_body: null,
  draft_interview_subject: null,
  draft_interview_body: null,
  draft_rejection_subject: null,
  draft_rejection_body: null,
  email_sent: false,
  sent_at: null,
  sent_to: null,
  resend_message_id: null,
};
