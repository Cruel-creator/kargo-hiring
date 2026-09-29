# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS, Supabase (Postgres + Storage), Gemini API, Resend, deployed on Vercel. Pinned by the user.

## Users

One user: Arjun Mehta, founder of Kargo (Series A logistics SaaS, Mumbai). No HR function; he is the hiring manager for every role. He reviews CVs on a laptop late at night in ~45-minute windows between other work. Phone use is secondary (read and send), desktop is primary.

## Product Purpose

Internal screener for two open roles, Product Manager and Senior Product Manager. Sixty applications, eleven weeks, zero offers. The tool extracts each CV, strips PII, scores it against both calibrated rubrics, ranks candidates, drafts a three-sentence interview brief and an email, and lets Arjun decide and send. Success is an offer to the right person before year end, and no applicant left without a reply.

## Positioning

Rubrics come from the patterns in Arjun's own best hires, not the job spec. Every score is auditable to criterion, weight, quoted evidence and reason. The system recommends; Arjun decides; nothing is sent without his click.

## Operating Context

Upload a CV (PDF/DOCX/TXT) and pick the applied role. The pipeline runs automatically through visible processing states. Arjun scans the ranked table per role, opens a candidate, reads score, eligibility, evidence and probe, sets Shortlist / Hold / Not Shortlist, edits the draft if needed, and clicks Confirm & Send (Resend).

## Capabilities and Constraints

- PII (name, email, phone, address, links) never goes to Gemini. The name is reinserted into email server-side.
- Weighted totals are computed server-side; Gemini only scores criteria 0-5 with evidence.
- Eligibility (location, role match) is kept separate from the 100-point score.
- No automatic rejection, no automatic send, no AI hire/reject verdict.
- Access protection: Vercel Deployment Protection (user decision); no in-app auth.

## Brand Commitments

Name shown in the header: "Kargo Hiring". The user asked for a minimal, clean, fast, professional look: no gradients, decorative illustrations, large empty cards, excessive color, unnecessary animation or AI gimmicks. The first view must show score, rank, evidence, concern, probe, email and status.

## Evidence on Hand

Case pre-read, execution plan, and components map (user's Downloads). The v1 rubric names and weights come from the user's brief. No real CVs in the repo; test fixtures are synthetic and labelled as such.

## Product Principles

1. Human decides: every outbound action is one explicit click by Arjun.
2. No black-box score: every number traces to quoted CV evidence.
3. Absence of evidence scores zero and is never read as a negative trait.
4. Privacy by construction: the AI only ever sees the anonymised CV.
5. Speed of judgement: the answer to "who next, and why" is visible without scrolling.
