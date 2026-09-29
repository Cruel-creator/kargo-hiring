import { buildScoreRows } from "@/lib/scoring";
import { formatScore } from "@/lib/view";
import type { CandidateBundle, CandidateEvent, ProcessingStatus, ReviewStatus, Role, RubricCriterion } from "@/lib/types";

/**
 * SYNTHETIC UI PREVIEW DATA, development only (the route 404s in production).
 * Fictional people from tests/fixtures. Totals are computed by the real scoring code.
 */

const anchors = { "0": "No evidence", "1": "Minimal", "2": "Weak", "3": "Moderate", "4": "Strong", "5": "Exceptional" };
const R: Record<Role, [string, number, string][]> = {
  PM: [
    ["End-to-End Product Ownership", 25, "The CV names a product or feature area the candidate personally owned from problem definition through launch and post-launch iteration."],
    ["Customer & Problem Discovery", 20, "The CV shows the candidate went to users directly and that a specific problem or product change came out of it."],
    ["Shipping & Outcome Orientation", 20, "The CV shows work that reached production and reports what happened as a result."],
    ["Operating Without Structure", 20, "The CV shows the candidate delivered in ambiguous, under-resourced settings."],
    ["Technical & Systems Fluency", 15, "The CV shows the candidate worked credibly on technical substance with engineers."],
  ],
  SPM: [
    ["Platform / Integration Ownership", 25, "Ownership of a platform, API, or integration layer used by multiple teams, partners or customers."],
    ["Independent Product Decision-Making", 25, "Significant product calls made and defended without a senior PM above them."],
    ["Cross-Functional Influence & Alignment", 20, "Aligned engineering, sales, operations or customers without formal authority."],
    ["Reliability, Data & Systems Thinking", 15, "Attention to how systems behave in production: SLAs, data quality, monitoring."],
    ["Building Product Operating Systems", 15, "Built the product process others work within."],
  ],
};
export const syntheticRubrics: Record<Role, RubricCriterion[]> = {
  PM: R.PM.map(([n, w, d], i) => ({ id: `pm-${i}`, role: "PM", criterion_name: n, description: d, weight: w, score_anchors: anchors, sort_order: i, rubric_version: 1 })),
  SPM: R.SPM.map(([n, w, d], i) => ({ id: `spm-${i}`, role: "SPM", criterion_name: n, description: d, weight: w, score_anchors: anchors, sort_order: i, rubric_version: 1 })),
};

type S = [number, string, string?];
interface Spec {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: Role;
  pm?: S[];
  spm?: S[];
  review?: ReviewStatus;
  processing?: ProcessingStatus;
  error?: string;
  location?: "Mumbai" | "Willing to relocate" | "Relocation unclear" | "Not aligned";
  match?: "Strong" | "Partial" | "Unclear";
  minutesAgo: number;
  sent?: boolean;
  /** Synthetic interview brief, written for this candidate's own evidence. */
  brief?: { why: string; strongest: string; probe: string };
  /** The line the interview invite opens on. */
  highlight?: string;
  matchEvidence?: string;
}

const specs: Spec[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Tanvi Kulkarni",
    email: "tanvi.kulkarni.pm@example.com",
    phone: "+91 98201 47315",
    role: "PM",
    pm: [
      [5, "Owned the shipment tracking module end to end, from problem definition to launch and two rounds of post-launch iteration.", "Names the owned area, the full arc from problem to iteration, and repeated post-launch work."],
      [4, "Spent two days a month at forwarder offices in Bhiwandi shadowing operations staff; found that 40% of status calls came from missing ETA updates", "Direct, recurring field research that produced a specific finding which shaped the roadmap."],
      [5, "Shipped automated ETA alerts to 120 forwarder accounts; inbound \"where is my shipment\" calls fell 38% in one quarter.", "Shipped to production with a measured outcome at meaningful scale."],
      [4, "First PM hired; there was no product process before me, so I set up weekly planning and a one-page spec format", "Created structure where none existed, and the team still uses it."],
      [2, "Worked with engineers on the carrier API integration design, including polling vs webhook trade-offs", "Mentions a technical trade-off, but not what they decided or why."],
    ],
    spm: [[2, "carrier API integration design", "Worked on one integration; no platform ownership."], [2, "set up weekly planning", "Some process ownership, limited independent product calls."], [1, "the engineering team still uses", "Minimal evidence of alignment across functions."], [1, "retry queue for failed status updates", "Brief reliability detail."], [3, "set up weekly planning and a one-page spec format the engineering team still uses", "Built a process a team adopted."]],
    review: "review",
    location: "Mumbai",
    match: "Strong",
    minutesAgo: 42,
    brief: {
      why: "Scored highly on product ownership and shipping, driven by end-to-end ownership of the tracking module and a measured drop in status calls.",
      strongest: "Shipped automated ETA alerts to 120 forwarder accounts, and inbound \"where is my shipment\" calls fell 38% in one quarter.",
      probe: "The CV mentions polling vs webhook trade-offs but not the decision; ask them to walk through how the carrier integration design was chosen and what they would change.",
    },
    highlight: "Your work on the shipment tracking module stood out, particularly the automated ETA alerts you shipped to forwarder accounts.",
    matchEvidence: "Owned the shipment tracking module end to end",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Siddharth Menon",
    email: "siddharth.menon@example.org",
    phone: "+91 80 4719 2836",
    role: "SPM",
    spm: [
      [5, "Owned the partner integration platform: ERP, customs and 14 carrier integrations consumed by four internal teams and 300+ customers.", "Platform ownership with named consumers and scale."],
      [5, "With no Head of Product, I set the platform roadmap and decided to deprecate the legacy EDI connector", "Independent, consequential call with a measured result."],
      [4, "Aligned sales, customer success and engineering on an integration SLA after a disagreement over custom connector requests", "Resolved a named cross-functional conflict."],
      [4, "failed sync incidents dropped from 30 a month to 6", "Measured reliability improvement."],
      [5, "Built the quarterly planning cadence and PRD review ritual used by all five product teams; hired and mentored two PMs.", "Built an operating system adopted across teams."],
    ],
    pm: [[4, "Owned the rate management feature from discovery through launch.", "Owned a feature end to end."], [1, "discovery", "Mentioned, no activity described."], [3, "support tickets for integrations fell 45%", "Outcome reported."], [3, "With no Head of Product", "Operated without senior structure."], [4, "moving customers to the REST API", "Technical migration driven."]],
    review: "shortlist",
    location: "Willing to relocate",
    match: "Strong",
    minutesAgo: 180,
    brief: {
      why: "Scored highly on platform ownership, independent decisions and product operating systems: owned an integration platform used by four internal teams and 300+ customers, and set its roadmap without a Head of Product.",
      strongest: "Owned the partner integration platform: ERP, customs and 14 carrier integrations consumed by four internal teams and 300+ customers.",
      probe: "The integration SLA is described but not how it held; ask how custom connector requests from sales were handled after it was agreed, and what was turned down.",
    },
    highlight: "Your ownership of the partner integration platform stood out, particularly the call to deprecate the legacy EDI connector.",
    matchEvidence: "Owned the partner integration platform",
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    name: "Ishita Bhattacharya",
    email: "ishita.b@example.com",
    phone: "91-99301-58427",
    role: "PM",
    pm: [[3, "Owned the store onboarding flow from research to launch.", "Owned a flow, limited detail on decisions."], [5, "Ran 60+ interviews with kirana store owners across Thane and Kalyan to understand ordering habits.", "Extensive, specific discovery that led to a change."], [4, "Redesigned the address capture screen based on those findings; failed deliveries dropped 17%.", "Shipped with a measured result."], [2, "Read and tagged 200 support tickets a week to build a monthly problems report for leadership.", "Some self-started structure."], [0, ""]],
    spm: [[0, ""], [1, "Owned the store onboarding flow", "Minimal."], [1, "report for leadership", "Minimal."], [0, ""], [1, "monthly problems report", "Minimal."]],
    review: "email_ready",
    location: "Mumbai",
    match: "Partial",
    minutesAgo: 60 * 26,
    brief: {
      why: "Scored on customer discovery and shipping: 60+ interviews with kirana store owners led to a redesigned address screen and fewer failed deliveries. No evidence of technical work with engineers.",
      strongest: "Redesigned the address capture screen based on those findings; failed deliveries dropped 17%.",
      probe: "The CV shows no technical depth; ask her to walk through how the address capture redesign was built with engineering and which trade-offs she made.",
    },
    highlight: "Your discovery work with kirana store owners stood out, particularly how it led to the address capture redesign.",
    matchEvidence: "Owned the store onboarding flow from research to launch",
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    name: "Farhan Qureshi",
    email: "farhan.q.dev@example.net",
    phone: "99870 31264",
    role: "PM",
    pm: [[0, ""], [0, ""], [0, ""], [0, ""], [3, "Designed PostgreSQL partitioning for the tracking history tables.", "Concrete technical design work."]],
    spm: [[1, "Kafka-based event pipelines", "Built infrastructure, not a product platform."], [0, ""], [0, ""], [3, "On-call lead; wrote runbooks for the ingestion services.", "Operational reliability ownership."], [0, ""]],
    review: "not_shortlisted",
    location: "Relocation unclear",
    match: "Unclear",
    minutesAgo: 60 * 50,
    sent: true,
    brief: {
      why: "Scored low on the PM rubric: the CV describes backend engineering (PostgreSQL partitioning, Kafka pipelines) with no product ownership, discovery or shipped outcomes.",
      strongest: "Designed PostgreSQL partitioning for the tracking history tables.",
      probe: "If there is a conversation, ask whether he has made product calls himself, for example what to build on the tracking data and why.",
    },
    matchEvidence: "Designed PostgreSQL partitioning for the tracking history tables",
  },
  {
    id: "00000000-0000-4000-8000-000000000005",
    name: "Rhea Fernandes",
    email: null,
    phone: "+91 97690 22418",
    role: "PM",
    pm: [[4, "Owned the container booking workflow from problem definition to launch.", "Owned area end to end."], [3, "Visited depots weekly to observe how gate staff handled bookings.", "Direct observation, finding not stated."], [4, "Shipped slot booking for 40 depots; booking time fell from 20 minutes to 4 minutes.", "Shipped with measured outcome."], [0, ""], [0, ""]],
    spm: [[1, "slot booking for 40 depots", "Minimal."], [0, ""], [0, ""], [0, ""], [0, ""]],
    review: "hold",
    location: "Mumbai",
    match: "Strong",
    minutesAgo: 60 * 5,
    brief: {
      why: "Scored on ownership and shipping: owned the container booking workflow and shipped slot booking to 40 depots, cutting booking time from 20 minutes to 4. Nothing on technical work or operating without structure.",
      strongest: "Shipped slot booking for 40 depots; booking time fell from 20 minutes to 4 minutes.",
      probe: "Depot visits are mentioned but not what came of them; ask what she saw at the gates that changed the booking design, and how she worked with engineering on it.",
    },
    highlight: "Your work on the container booking workflow stood out, particularly the slot booking you shipped to 40 depots.",
    matchEvidence: "Owned the container booking workflow",
  },
  { id: "00000000-0000-4000-8000-000000000006", name: "Kabir Sethi", email: "kabir.sethi@example.com", phone: null, role: "PM", processing: "scoring", minutesAgo: 1 },
  { id: "00000000-0000-4000-8000-000000000007", name: "Unnamed candidate", email: null, phone: null, role: "SPM", processing: "extraction_failed", error: "Almost no text could be read. The CV may be a scanned image; upload a text-based PDF or DOCX.", minutesAgo: 8 },
];

const iso = (m: number) => new Date(Date.UTC(2026, 8, 28, 12, 40) - m * 60000).toISOString();

export function syntheticBundles(): CandidateBundle[] {
  return specs.map((s) => {
    const scored = !s.processing;
    const rows = (role: Role, list?: S[]) =>
      list
        ? buildScoreRows(
            s.id,
            role,
            syntheticRubrics[role],
            list.map(([score, evidence, reason], i) => ({
              criterion_id: syntheticRubrics[role][i].id,
              score,
              evidence,
              evidence_verified: !(s.id.endsWith("1") && role === "PM" && i === 4),
              reason: reason ?? (score ? "Evidence supports this score." : "No evidence for this criterion in the CV."),
            })),
          )
        : null;
    const pm = rows("PM", s.pm);
    const spm = rows("SPM", s.spm);
    const type = s.review === "shortlist" ? "interview" : s.review === "not_shortlisted" ? "rejection" : s.review === "email_ready" ? "interview" : null;
    const first = s.name.split(" ")[0];
    const interview = {
      subject: `Kargo — ${s.role === "PM" ? "Product Manager" : "Senior Product Manager"} conversation`,
      body: `Hi ${first},\n\nThank you for applying for the ${s.role === "PM" ? "Product Manager" : "Senior Product Manager"} role at Kargo. ${s.highlight ?? "Your application stood out."}\n\nI'd like to invite you to a 45-minute conversation with me. Could you reply with two or three times that suit you over the next week?\n\nArjun Mehta\nFounder, Kargo`,
    };
    const rejection = {
      subject: "Your application to Kargo",
      body: `Hi ${first},\n\nThank you for applying for the ${s.role === "PM" ? "Product Manager" : "Senior Product Manager"} role at Kargo and for the time you put into your application. We will not be moving forward with your application at this time.\n\nWe wish you the very best in your search.\n\nArjun Mehta\nFounder, Kargo`,
    };
    const active = type === "interview" ? interview : type === "rejection" ? rejection : null;
    return {
      candidate: {
        id: s.id,
        candidate_name: s.name === "Unnamed candidate" ? null : s.name,
        candidate_email: s.email,
        candidate_phone: s.phone,
        role_applied: s.role,
        original_file_url: null,
        original_file_name: "cv.pdf",
        original_file_type: "application/pdf",
        anonymised_cv_text: null,
        processing_status: s.processing ?? (s.sent ? "sent" : "ready_for_review"),
        error_message: s.error ?? null,
        created_at: iso(s.minutesAgo + 30),
        updated_at: iso(s.minutesAgo),
      },
      result: scored
        ? {
            candidate_id: s.id,
            pm_score: pm?.total ?? null,
            spm_score: spm?.total ?? null,
            eligibility_status: {
              location_status: s.location!,
              location_evidence: s.location === "Mumbai" ? "Dadar West, Mumbai" : "open to relocating to Mumbai",
              role_match: s.match!,
              role_match_evidence: s.matchEvidence ?? "",
            },
            interview_brief: s.brief ? { why_scored: s.brief.why, strongest_evidence: s.brief.strongest, probe: s.brief.probe } : null,
            review_status: s.sent ? "sent" : (s.review ?? "review"),
            email_type: type,
            email_subject: active?.subject ?? null,
            email_body: active?.body ?? null,
            draft_interview_subject: interview.subject,
            draft_interview_body: interview.body.replace(`Hi ${first},`, "Hi {{first_name}},").replace("\n\nArjun Mehta\nFounder, Kargo", ""),
            draft_rejection_subject: rejection.subject,
            draft_rejection_body: rejection.body.replace(`Hi ${first},`, "Hi {{first_name}},").replace("\n\nArjun Mehta\nFounder, Kargo", ""),
            email_sent: !!s.sent,
            sent_at: s.sent ? iso(s.minutesAgo - 20) : null,
            sent_to: s.sent ? s.email : null,
            resend_message_id: null,
            updated_at: iso(s.minutesAgo),
          }
        : null,
      scores: [...(pm?.rows ?? []), ...(spm?.rows ?? [])],
    };
  });
}

/** The candidate's own pipeline events, derived from its bundle: times follow its upload, scores are its real totals. */
export function syntheticEvents(b: CandidateBundle): CandidateEvent[] {
  const { candidate: c, result: r } = b;
  const id = c.id;
  const at = (min: number) => new Date(new Date(c.created_at).getTime() + min * 60000).toISOString();
  const out: CandidateEvent[] = [{ candidate_id: id, event: "uploaded", detail: `Applied for ${c.role_applied}`, created_at: at(0) }];
  if (c.processing_status === "extraction_failed") {
    out.push({ candidate_id: id, event: "extraction_failed", detail: c.error_message, created_at: at(1) });
    return out;
  }
  const chars = 3200 + (Number.parseInt(id.slice(-2), 16) % 9) * 263;
  out.push({ candidate_id: id, event: "extracted", detail: `${chars.toLocaleString("en-IN")} characters read`, created_at: at(1) });
  const fields = [c.candidate_name && "name", c.candidate_email && "email", c.candidate_phone && "phone"].filter(Boolean).join(", ");
  out.push({ candidate_id: id, event: "anonymised", detail: `Separated: ${fields || "nothing found"}`, created_at: at(1) });
  if (!r || r.pm_score === null || r.spm_score === null) return out; // still screening
  out.push({ candidate_id: id, event: "scored", detail: `PM ${formatScore(r.pm_score)} · SPM ${formatScore(r.spm_score)} (rubric v1)`, created_at: at(2) });
  if (r.interview_brief) out.push({ candidate_id: id, event: "brief_generated", detail: null, created_at: at(2) });
  out.push({ candidate_id: id, event: "emails_drafted", detail: "Interview and rejection drafts prepared; nothing sent", created_at: at(3) });
  if (r.email_sent && r.sent_at) out.push({ candidate_id: id, event: "email_sent", detail: r.email_type === "rejection" ? "Rejection sent" : "Interview invite sent", created_at: r.sent_at });
  return out;
}
