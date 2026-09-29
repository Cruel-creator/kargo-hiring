import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Repo } from "../src/lib/repo";
import { EMPTY_RESULT } from "../src/lib/repo";
import type { GeminiClient } from "../src/lib/gemini";
import type { Candidate, CandidateEvent, CandidateResult, CandidateScore, Role, RubricCriterion } from "../src/lib/types";

export const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", name), "utf8");

const anchors = { "0": "none", "1": "minimal", "2": "weak", "3": "moderate", "4": "strong", "5": "exceptional" };

/** Mirrors the v1 seed in supabase/schema.sql. */
export const RUBRIC_V1: Record<Role, [string, number][]> = {
  PM: [
    ["End-to-End Product Ownership", 25],
    ["Customer & Problem Discovery", 20],
    ["Shipping & Outcome Orientation", 20],
    ["Operating Without Structure", 20],
    ["Technical & Systems Fluency", 15],
  ],
  SPM: [
    ["Platform / Integration Ownership", 25],
    ["Independent Product Decision-Making", 25],
    ["Cross-Functional Influence & Alignment", 20],
    ["Reliability, Data & Systems Thinking", 15],
    ["Building Product Operating Systems", 15],
  ],
};

export function rubric(role: Role): RubricCriterion[] {
  return RUBRIC_V1[role].map(([name, weight], i) => ({
    id: `${role}-${i + 1}`,
    role,
    criterion_name: name,
    description: `${name} description`,
    weight,
    score_anchors: anchors,
    sort_order: i + 1,
    rubric_version: 1,
  }));
}

/** In-memory Repo with the same semantics as Supabase, including the atomic send claim. */
export function memoryRepo(files: Record<string, Uint8Array> = {}) {
  const candidates = new Map<string, Candidate>();
  const results = new Map<string, CandidateResult>();
  let scores: CandidateScore[] = [];
  const events: CandidateEvent[] = [];
  const rubrics: Record<Role, RubricCriterion[]> = { PM: rubric("PM"), SPM: rubric("SPM") };
  let n = 0;

  const repo: Repo = {
    async getActiveRubric(role) {
      return rubrics[role];
    },
    async createCandidate(input) {
      const id = `cand-${++n}`;
      const now = new Date(Date.UTC(2026, 8, 28, 10, n)).toISOString();
      const c: Candidate = {
        id,
        candidate_name: null,
        candidate_email: null,
        candidate_phone: null,
        original_file_url: null,
        anonymised_cv_text: null,
        processing_status: "uploaded",
        error_message: null,
        created_at: now,
        updated_at: now,
        ...input,
      };
      candidates.set(id, c);
      return c;
    },
    async getCandidate(id) {
      const c = candidates.get(id);
      return c ? { ...c } : null;
    },
    async updateCandidate(id, patch) {
      const c = candidates.get(id);
      if (c) candidates.set(id, { ...c, ...patch });
    },
    async uploadFile(path, bytes) {
      files[path] = bytes;
    },
    async downloadFile(path) {
      const f = files[path];
      if (!f) throw new Error("Storage download failed: not found");
      return f;
    },
    async signedFileUrl() {
      return null;
    },
    async replaceScores(candidateId, role, rows) {
      scores = scores.filter((s) => !(s.candidate_id === candidateId && s.role === role)).concat(rows);
    },
    async getScores(candidateId) {
      return scores.filter((s) => s.candidate_id === candidateId);
    },
    async getResult(candidateId) {
      const r = results.get(candidateId);
      return r ? { ...r } : null;
    },
    async upsertResult(candidateId, patch) {
      const cur = results.get(candidateId) ?? { ...EMPTY_RESULT, candidate_id: candidateId };
      if (cur.email_sent && (patch.email_body !== undefined || patch.email_subject !== undefined || patch.email_sent === false)) {
        throw new Error("email already sent; sent records are immutable");
      }
      results.set(candidateId, { ...cur, ...patch });
    },
    async claimSend(candidateId) {
      const c = candidates.get(candidateId);
      const r = results.get(candidateId);
      if (!c || !r || r.email_sent) return false;
      if (c.processing_status !== "ready_for_review" && c.processing_status !== "send_failed") return false;
      candidates.set(candidateId, { ...c, processing_status: "sending", error_message: null });
      return true;
    },
    async markSent(candidateId, patch) {
      const r = results.get(candidateId);
      if (!r || r.email_sent) return false;
      results.set(candidateId, { ...r, ...patch, email_sent: true, review_status: "sent" });
      return true;
    },
    async listBundles() {
      return [...candidates.values()].map((c) => ({
        candidate: c,
        result: results.get(c.id) ?? null,
        scores: scores.filter((s) => s.candidate_id === c.id),
      }));
    },
    async addEvent(candidate_id, event, detail = null) {
      events.push({ candidate_id, event, detail });
    },
    async listEvents(candidateId) {
      return events.filter((e) => e.candidate_id === candidateId);
    },
  };
  return { repo, files, rubrics, events, candidates, results };
}

type Handler = (args: { system: string; prompt: string; label: string }) => unknown;

/** Fake Gemini for unit tests: routes by request label. Records every prompt sent. */
export function fakeGemini(handlers: Partial<Record<"PM scoring" | "SPM scoring" | "eligibility" | "interview brief" | "email drafts", Handler>>) {
  const calls: { label: string; system: string; prompt: string }[] = [];
  const client: GeminiClient = {
    async generateJson<T>({ system, prompt, label }: { system: string; prompt: string; label: string }) {
      calls.push({ label, system, prompt });
      const h = handlers[label as keyof typeof handlers];
      if (!h) throw new Error(`no fake for ${label}`);
      return (await h({ system, prompt, label })) as T;
    },
  };
  return { client, calls };
}

export const okEligibility = () => ({
  location_status: "Mumbai",
  location_evidence: "Location: Mumbai",
  role_match: "Strong",
  role_match_evidence: "Owned the shipment tracking module",
});
export const okBrief = () => ({
  why_scored: "The candidate scored well on ownership and shipping.",
  strongest_evidence: "They owned the shipment tracking module end to end.",
  probe: "Ask how they validated problems directly with customers.",
});
export const okEmails = () => ({
  interview: {
    subject: "Kargo — Product Manager conversation",
    body: "Hi {{first_name}},\n\nThanks for applying for the Product Manager role at Kargo. Could you share two or three times next week for a 45-minute conversation with me?",
  },
  rejection: {
    subject: "Your application to Kargo",
    body: "Hi {{first_name}},\n\nThank you for applying for the Product Manager role at Kargo. We will not be moving forward with your application at this time. We wish you the very best.",
  },
});

/** Builds a scoring response that quotes the given CV lines verbatim. */
export function scoresFrom(role: Role, map: Record<string, [number, string]>) {
  return () => ({
    criteria: RUBRIC_V1[role].map(([name]) => {
      const [score, evidence] = map[name] ?? [0, ""];
      return { criterion: name, score, evidence, reason: score ? `Evidence supports a ${score}.` : "No evidence for this criterion in the CV." };
    }),
  });
}
