import { mainConcern, topStrength } from "@/lib/scoring";
import { shortCriterion } from "@/lib/view";
import type { CandidateBundle } from "@/lib/types";

export interface NextEvidence { strength: string; strengthScore: number; points: number; weight: number; quote: string; verified: boolean; concern: string | null; concernScore: number | null }

/** The strongest criterion's quoted CV evidence for queue candidates only. No other CV text leaves the server. */
export function evidenceFor(bundles: CandidateBundle[], ids: Set<string>): Record<string, NextEvidence> {
  const out: Record<string, NextEvidence> = {};
  for (const b of bundles) {
    if (!ids.has(b.candidate.id)) continue;
    const rows = b.scores.filter((s) => s.role === b.candidate.role_applied);
    const top = topStrength(rows);
    if (!top) continue;
    const low = mainConcern(rows);
    out[b.candidate.id] = {
      strength: shortCriterion(top.criterion_name) ?? top.criterion_name, strengthScore: top.score,
      points: top.weighted_score, weight: top.criterion_weight, quote: top.evidence, verified: top.evidence_verified,
      concern: shortCriterion(low?.criterion_name ?? null), concernScore: low?.score ?? null,
    };
  }
  return out;
}
