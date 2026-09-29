import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildScoreRows, mainConcern, overallScore, rank, RubricError, sumWeights, topStrength, validateRubric, weightedScore } from "../src/lib/scoring";
import { validateScores } from "../src/lib/ai";
import { rubric } from "./helpers";

describe("12. weight calculation", () => {
  it("PM weights = 100% and SPM weights = 100% (test rubric)", () => {
    expect(sumWeights(rubric("PM"))).toBe(100);
    expect(sumWeights(rubric("SPM"))).toBe(100);
    expect(() => validateRubric("PM", rubric("PM"))).not.toThrow();
    expect(() => validateRubric("SPM", rubric("SPM"))).not.toThrow();
  });

  it("the Supabase seed in schema.sql sums to 100% per role", () => {
    const sql = readFileSync(join(__dirname, "..", "supabase", "schema.sql"), "utf8");
    const rows = [...sql.matchAll(/\('(PM|SPM)',\s*'([^']+)',\s*'(?:[^']|'')*',\s*(\d+(?:\.\d+)?),\s*anchors/g)];
    const totals = { PM: 0, SPM: 0 } as Record<string, number>;
    for (const r of rows) totals[r[1]] += Number(r[3]);
    expect(rows).toHaveLength(10);
    expect(totals).toEqual({ PM: 100, SPM: 100 });
  });

  it("weighted_score = (score / 5) * weight", () => {
    expect(weightedScore(4, 25)).toBe(20);
    expect(weightedScore(3, 20)).toBe(12);
    expect(weightedScore(5, 15)).toBe(15);
    expect(weightedScore(0, 25)).toBe(0);
    expect(weightedScore(1, 15)).toBe(3);
    expect(() => weightedScore(6, 25)).toThrow(RangeError);
    expect(() => weightedScore(2.5, 25)).toThrow(RangeError);
  });

  it("overall = sum of weighted scores, computed server-side and deterministic", () => {
    const inputs = rubric("PM").map((c, i) => ({ criterion_id: c.id, score: [4, 3, 5, 2, 1][i], evidence: "x", evidence_verified: true, reason: "r" }));
    const a = buildScoreRows("c1", "PM", rubric("PM"), inputs);
    const b = buildScoreRows("c1", "PM", rubric("PM"), [...inputs].reverse());
    // 20 + 12 + 20 + 8 + 3
    expect(a.total).toBe(63);
    expect(b.total).toBe(a.total);
    expect(a.rows.map((r) => r.weighted_score)).toEqual([20, 12, 20, 8, 3]);
    for (let i = 0; i < 50; i++) expect(buildScoreRows("c1", "PM", rubric("PM"), inputs).total).toBe(63);
    expect(overallScore([0.1, 0.2])).toBe(0.3);
  });

  it("ignores any total the model returns", () => {
    const raw = {
      total: 99,
      overall_score: 99,
      criteria: rubric("PM").map((c) => ({ criterion: c.criterion_name, score: 1, evidence: "shipped things", reason: "r", weighted_score: 25 })),
    };
    const validated = validateScores(raw, rubric("PM"), "we shipped things");
    const { total, rows } = buildScoreRows("c1", "PM", rubric("PM"), validated);
    expect(total).toBe(20); // 1/5 of 100
    expect(rows.every((r) => r.weighted_score === Number(r.criterion_weight) / 5)).toBe(true);
  });

  it("rejects a rubric whose weights do not sum to 100", () => {
    const bad = rubric("PM").map((c, i) => (i === 0 ? { ...c, weight: 30 } : c));
    expect(() => validateRubric("PM", bad)).toThrow(RubricError);
    expect(() => validateRubric("PM", [])).toThrow(/No active/);
    expect(() => validateRubric("SPM", rubric("PM"))).toThrow(RubricError);
  });

  it("ranks by score desc with a stable tie-break; unscored last", () => {
    const r = rank([
      { id: "b", created_at: "2026-09-02", score: 70 },
      { id: "a", created_at: "2026-09-01", score: 70 },
      { id: "c", created_at: "2026-09-03", score: 82.5 },
      { id: "d", created_at: "2026-09-04", score: null },
    ]);
    expect(r.map((x) => [x.id, x.rank])).toEqual([
      ["c", 1],
      ["a", 2],
      ["b", 3],
      ["d", null],
    ]);
  });

  it("derives strength and concern deterministically from criterion scores", () => {
    const inputs = rubric("PM").map((c, i) => ({ criterion_id: c.id, score: [3, 5, 4, 3, 0][i], evidence: "x", evidence_verified: true, reason: "r" }));
    const { rows } = buildScoreRows("c1", "PM", rubric("PM"), inputs);
    expect(topStrength(rows)?.criterion_name).toBe("Customer & Problem Discovery"); // 20 pts
    expect(mainConcern(rows)?.criterion_name).toBe("Technical & Systems Fluency"); // loses 15 pts
  });
});
