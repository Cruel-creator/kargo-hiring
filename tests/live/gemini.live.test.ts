import { describe, expect, it } from "vitest";
import { createGeminiClient } from "../../src/lib/gemini";
import { evaluateEligibility, generateBrief, generateEmails, scoreAgainstRubric } from "../../src/lib/ai";
import { anonymise, extractPII, findPIILeaks } from "../../src/lib/pii";
import { buildScoreRows, mainConcern } from "../../src/lib/scoring";
import { fixture, rubric } from "../helpers";

/**
 * Real Gemini calls on the synthetic fixtures. Verifies JSON parsing, schema validation
 * and that scores move in the expected direction. Run: GEMINI_API_KEY=... npm run test:live
 */
const key = process.env.GEMINI_API_KEY;
const d = key ? describe : describe.skip;
const gemini = createGeminiClient({ apiKey: key, model: process.env.GEMINI_MODEL });

async function screen(file: string) {
  const text = fixture(file);
  const pii = extractPII(text);
  const cv = anonymise(text, pii);
  expect(findPIILeaks(cv, pii)).toEqual([]);
  const [pm, spm] = await Promise.all([scoreAgainstRubric(gemini, "PM", rubric("PM"), cv), scoreAgainstRubric(gemini, "SPM", rubric("SPM"), cv)]);
  return { cv, pm: buildScoreRows("live", "PM", rubric("PM"), pm), spm: buildScoreRows("live", "SPM", rubric("SPM"), spm) };
}

d("live Gemini", () => {
  it("strong PM outscores the technical-only candidate on the PM rubric", async () => {
    const strong = await screen("strong-pm.txt");
    const tech = await screen("technical-no-pm.txt");
    console.log("PM strong", strong.pm.total, "tech", tech.pm.total);
    expect(strong.pm.total).toBeGreaterThan(tech.pm.total + 25);
    expect(strong.pm.rows.filter((r) => r.score > 0).every((r) => r.evidence.length > 0)).toBe(true);
  });

  it("strong SPM scores higher on SPM than the discovery-focused PM", async () => {
    const spm = await screen("strong-spm.txt");
    const disc = await screen("discovery-weak-tech.txt");
    console.log("SPM strong", spm.spm.total, "discovery", disc.spm.total);
    expect(spm.spm.total).toBeGreaterThan(disc.spm.total);
    expect(disc.pm.rows.find((r) => r.criterion_name === "Customer & Problem Discovery")!.score).toBeGreaterThanOrEqual(3);
  });

  it("eligibility, brief and emails parse and validate", async () => {
    const s = await screen("strong-pm.txt");
    const e = await evaluateEligibility(gemini, "PM", s.cv);
    expect(e.location_status).toBe("Mumbai");
    const brief = await generateBrief(gemini, "PM", s.pm.rows, s.pm.total, mainConcern(s.pm.rows));
    expect(brief.probe.length).toBeGreaterThan(10);
    const emails = await generateEmails(gemini, "PM", s.pm.rows);
    expect(emails.interview.body).toContain("{{first_name}}");
    expect(emails.rejection.body).not.toMatch(/Tanvi|Kulkarni/);
  });
});
