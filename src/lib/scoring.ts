import type { Role, RubricCriterion, CandidateScore } from "./types";

/**
 * All score arithmetic lives here and runs on the server.
 * Gemini returns per-criterion 0–5 scores only; totals are never taken from the model.
 */

export const MAX_CRITERION_SCORE = 5;
const WEIGHT_TOLERANCE = 0.001;

export class RubricError extends Error {}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function sumWeights(criteria: Pick<RubricCriterion, "weight">[]): number {
  return round2(criteria.reduce((acc, c) => acc + Number(c.weight), 0));
}

/** Throws unless the rubric for a role is non-empty and its weights sum to exactly 100. */
export function validateRubric(role: Role, criteria: RubricCriterion[]): void {
  if (criteria.length === 0) throw new RubricError(`No active ${role} rubric criteria found.`);
  if (criteria.some((c) => c.role !== role)) throw new RubricError(`Rubric for ${role} contains criteria for another role.`);
  const names = new Set(criteria.map((c) => normaliseName(c.criterion_name)));
  if (names.size !== criteria.length) throw new RubricError(`${role} rubric has duplicate criterion names.`);
  for (const c of criteria) {
    const w = Number(c.weight);
    if (!Number.isFinite(w) || w <= 0 || w > 100) throw new RubricError(`${role} criterion "${c.criterion_name}" has invalid weight ${c.weight}.`);
  }
  const total = sumWeights(criteria);
  if (Math.abs(total - 100) > WEIGHT_TOLERANCE) {
    throw new RubricError(`${role} rubric weights sum to ${total}%, expected 100%.`);
  }
}

/** weighted_score = (criterion_score / 5) * criterion_weight */
export function weightedScore(score: number, weight: number): number {
  if (!Number.isInteger(score) || score < 0 || score > MAX_CRITERION_SCORE) {
    throw new RangeError(`Criterion score must be an integer 0–5, got ${score}.`);
  }
  return round2((score / MAX_CRITERION_SCORE) * Number(weight));
}

/** overall_score = sum(weighted_scores) */
export function overallScore(weighted: number[]): number {
  return round2(weighted.reduce((a, b) => a + b, 0));
}

export interface ScoredCriterionInput {
  criterion_id: string;
  score: number;
  evidence: string;
  evidence_verified: boolean;
  reason: string;
}

/** Joins model scores to the DB rubric and computes every weighted number server-side. */
export function buildScoreRows(
  candidateId: string,
  role: Role,
  criteria: RubricCriterion[],
  inputs: ScoredCriterionInput[],
): { rows: CandidateScore[]; total: number } {
  validateRubric(role, criteria);
  const byId = new Map(inputs.map((i) => [i.criterion_id, i]));
  const rows = [...criteria]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => {
      const input = byId.get(c.id);
      if (!input) throw new RubricError(`Missing score for ${role} criterion "${c.criterion_name}".`);
      return {
        candidate_id: candidateId,
        role,
        criterion_id: c.id,
        criterion_name: c.criterion_name,
        criterion_weight: Number(c.weight),
        rubric_version: c.rubric_version,
        score: input.score,
        evidence: input.evidence,
        evidence_verified: input.evidence_verified,
        reason: input.reason,
        weighted_score: weightedScore(input.score, Number(c.weight)),
      } satisfies CandidateScore;
    });
  return { rows, total: overallScore(rows.map((r) => r.weighted_score)) };
}

export function normaliseName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Criterion contributing the most points. Null when nothing scored above 0. */
export function topStrength(scores: CandidateScore[]): CandidateScore | null {
  const positive = scores.filter((s) => s.score > 0);
  if (positive.length === 0) return null;
  return [...positive].sort(
    (a, b) => b.weighted_score - a.weighted_score || b.score - a.score || a.criterion_name.localeCompare(b.criterion_name),
  )[0];
}

/** Criterion losing the most points against its weight. Null only if every criterion scored 5. */
export function mainConcern(scores: CandidateScore[]): CandidateScore | null {
  const lost = (s: CandidateScore) => s.criterion_weight - s.weighted_score;
  const weak = scores.filter((s) => s.score < MAX_CRITERION_SCORE);
  if (weak.length === 0) return null;
  return [...weak].sort((a, b) => lost(b) - lost(a) || a.score - b.score || a.criterion_name.localeCompare(b.criterion_name))[0];
}

export interface Rankable {
  id: string;
  created_at: string;
  score: number | null;
}

/** Score descending; ties broken by earliest upload then id, so ranking is stable. Unscored rows get rank null. */
export function rank<T extends Rankable>(items: T[]): (T & { rank: number | null })[] {
  const scored = items
    .filter((i) => i.score !== null && Number.isFinite(i.score))
    .sort((a, b) => (b.score as number) - (a.score as number) || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
    .map((i, idx) => ({ ...i, rank: idx + 1 }));
  const unscored = items.filter((i) => i.score === null || !Number.isFinite(i.score)).map((i) => ({ ...i, rank: null }));
  return [...scored, ...unscored];
}

export function evidenceStrength(score: number): string {
  return ["No evidence", "Minimal evidence", "Weak evidence", "Moderate evidence", "Strong evidence", "Exceptional evidence"][score] ?? "—";
}
