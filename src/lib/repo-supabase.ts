import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Repo } from "./repo";
import type { Candidate, CandidateBundle, CandidateEvent, CandidateResult, CandidateScore, Role, RubricCriterion } from "./types";

const BUCKET = "cvs";

export class DatabaseError extends Error {}

function check<T>(res: { data: T; error: { message: string; code?: string } | null }, what: string): T {
  if (res.error) throw new DatabaseError(`Database error while ${what}: ${res.error.message}`);
  return res.data;
}

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

function toScore(r: Record<string, unknown>): CandidateScore {
  return {
    ...(r as unknown as CandidateScore),
    criterion_weight: Number(r.criterion_weight),
    weighted_score: Number(r.weighted_score),
    score: Number(r.score),
  };
}
function toResult(r: Record<string, unknown> | null): CandidateResult | null {
  if (!r) return null;
  return { ...(r as unknown as CandidateResult), pm_score: num(r.pm_score), spm_score: num(r.spm_score) };
}

export function createSupabaseRepo(url: string, key: string): Repo {
  const db: SupabaseClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "kargo-hiring" } },
  });

  return {
    async getActiveRubric(role: Role) {
      const data = check(
        await db.from("rubric_criteria").select("*").eq("role", role).eq("is_active", true).order("sort_order"),
        "loading rubric",
      );
      return (data ?? []).map((r) => ({ ...r, weight: Number(r.weight) })) as RubricCriterion[];
    },

    async createCandidate(input) {
      const data = check(
        await db.from("candidates").insert({ ...input, processing_status: "uploaded" }).select("*").single(),
        "creating candidate",
      );
      return data as Candidate;
    },

    async getCandidate(id) {
      const data = check(await db.from("candidates").select("*").eq("id", id).maybeSingle(), "loading candidate");
      return (data as Candidate) ?? null;
    },

    async updateCandidate(id, patch) {
      check(await db.from("candidates").update(patch).eq("id", id), "updating candidate");
    },

    async uploadFile(path, bytes, contentType) {
      const { error } = await db.storage.from(BUCKET).upload(path, bytes, { contentType, upsert: false });
      if (error) throw new DatabaseError(`Storage upload failed: ${error.message}`);
    },

    async downloadFile(path) {
      const { data, error } = await db.storage.from(BUCKET).download(path);
      if (error || !data) throw new DatabaseError(`Storage download failed: ${error?.message ?? "no data"}`);
      return new Uint8Array(await data.arrayBuffer());
    },

    async signedFileUrl(path) {
      const { data } = await db.storage.from(BUCKET).createSignedUrl(path, 60 * 10);
      return data?.signedUrl ?? null;
    },

    async replaceScores(candidateId, role, rows) {
      check(await db.from("candidate_scores").delete().eq("candidate_id", candidateId).eq("role", role), "clearing scores");
      if (rows.length) {
        check(
          await db.from("candidate_scores").insert(rows.map(({ id: _id, created_at: _c, ...r }) => r)),
          "saving scores",
        );
      }
    },

    async getScores(candidateId) {
      const data = check(
        await db.from("candidate_scores").select("*").eq("candidate_id", candidateId).order("created_at"),
        "loading scores",
      );
      return (data ?? []).map(toScore);
    },

    async getResult(candidateId) {
      const data = check(await db.from("candidate_results").select("*").eq("candidate_id", candidateId).maybeSingle(), "loading result");
      return toResult(data);
    },

    async upsertResult(candidateId, patch) {
      check(
        await db.from("candidate_results").upsert({ candidate_id: candidateId, ...patch }, { onConflict: "candidate_id" }),
        "saving result",
      );
    },

    async claimSend(candidateId) {
      const data = check(await db.rpc("claim_email_send", { p_candidate_id: candidateId }), "claiming send");
      return data === true;
    },

    async markSent(candidateId, patch) {
      const data = check(
        await db
          .from("candidate_results")
          .update({ ...patch, email_sent: true, review_status: "sent" })
          .eq("candidate_id", candidateId)
          .eq("email_sent", false)
          .select("id"),
        "recording sent email",
      );
      return (data ?? []).length === 1;
    },

    async listBundles() {
      const [cands, results, scores] = await Promise.all([
        db
          .from("candidates")
          .select(
            "id,candidate_name,candidate_email,candidate_phone,role_applied,original_file_url,original_file_name,original_file_type,processing_status,error_message,created_at,updated_at",
          )
          .order("created_at", { ascending: false }),
        db.from("candidate_results").select("*"),
        db.from("candidate_scores").select("*"),
      ]);
      const cs = check(cands, "listing candidates") as Candidate[];
      const rs = (check(results, "listing results") ?? []).map((r) => toResult(r)!) as CandidateResult[];
      const ss = (check(scores, "listing scores") ?? []).map(toScore);
      const rByC = new Map(rs.map((r) => [r.candidate_id, r]));
      const sByC = new Map<string, CandidateScore[]>();
      for (const s of ss) sByC.set(s.candidate_id, [...(sByC.get(s.candidate_id) ?? []), s]);
      return cs.map<CandidateBundle>((c) => ({
        candidate: { ...c, anonymised_cv_text: null },
        result: rByC.get(c.id) ?? null,
        scores: sByC.get(c.id) ?? [],
      }));
    },

    async addEvent(candidateId, event, detail = null) {
      // Audit logging must never break the pipeline.
      await db.from("candidate_events").insert({ candidate_id: candidateId, event, detail });
    },

    async listEvents(candidateId) {
      const data = check(
        await db.from("candidate_events").select("*").eq("candidate_id", candidateId).order("created_at"),
        "loading events",
      );
      return (data ?? []) as CandidateEvent[];
    },
  };
}
