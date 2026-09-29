import type { Role } from "@/lib/types";
import type { CandidateRowView } from "@/lib/view";

export type QueueKind = "review" | "email_ready" | "reply_owed" | "hold";
export interface QueueItem { row: CandidateRowView; kind: QueueKind }

const oldest = (a: CandidateRowView, b: CandidateRowView) => a.updatedAt.localeCompare(b.updatedAt);

/** Everything waiting on the founder, in the order he should act. Cross-role applicants (the cross=1 comparison rows) are excluded. */
export function buildQueue(rows: CandidateRowView[], view: Role | "all"): QueueItem[] {
  const own = rows.filter((r) => (view === "all" || r.role === view) && r.processing !== "sending");
  const take = (kind: QueueKind, keep: (r: CandidateRowView) => boolean, sort: (a: CandidateRowView, b: CandidateRowView) => number) =>
    own.filter(keep).sort(sort).map((row) => ({ row, kind }));
  return [
    ...take("review", (r) => r.status === "review" && r.score !== null, (a, b) => (b.score ?? 0) - (a.score ?? 0) || a.createdAt.localeCompare(b.createdAt)),
    ...take("email_ready", (r) => r.status === "email_ready", oldest),
    ...take("reply_owed", (r) => r.status === "shortlist" || r.status === "not_shortlisted", oldest), // displayStatus returns "sent" once emailed
    ...take("hold", (r) => r.status === "hold", oldest),
  ];
}
