# Kargo Hiring

An internal screener Arjun uses for the Product Manager and Senior Product Manager roles. It extracts each CV, separates the PII, anonymises the text, scores it against both rubrics, ranks the candidates, and drafts an interview brief and emails. **Arjun makes every decision, and nothing is sent until he clicks Confirm & send.**

```
Upload CV + role → extract text (local) → separate PII → anonymise → privacy gate
→ Gemini: PM rubric ∥ SPM rubric ∥ eligibility  (0–5 per criterion + quoted evidence)
→ server computes weighted scores and ranks → Gemini: 3-sentence brief → Gemini: interview + rejection drafts
→ Arjun: Shortlist / Hold / Not shortlist → edit → Confirm & send → Resend → email_sent = true
```

## 1. File structure

```
supabase/schema.sql              tables, indexes, triggers, RLS, send-claim function, private bucket, rubric v1 seed
src/lib/
  types.ts                       domain types and status enums
  extract.ts                     file validation (extension + magic bytes) and PDF/DOCX/TXT text extraction
  pii.ts                         PII extraction, anonymisation, and the leak gate run before every AI call
  gemini.ts                      Gemini REST client (structured JSON, temperature 0, retry and backoff)
  ai.ts                          prompts, response schemas, and strict validation for scoring, eligibility, brief, email
  scoring.ts                     all score arithmetic: weights check, weighted scores, totals, ranking, strength/concern
  pipeline.ts                    processing state machine with resumable stages
  actions.ts                     Arjun's actions: decision, edit email, contact correction, send (claim → Resend → mark)
  email.ts                       email validation, server-side name insertion, Resend client, idempotency key
  repo.ts / repo-supabase.ts     data-access interface and its Supabase implementation (server only)
  server.ts / http.ts            env and secrets (server only), error mapping
  view.ts                        display model (rows, labels, dates); contains no CV text
src/app/
  page.tsx                       dashboard: All / PM / SPM, status summary, filters, ranked list
  candidates/[id]/page.tsx       review workspace: decision, scores, evidence, brief, email composer, activity
  upload/page.tsx                screen one or many CVs with live progress
  settings/page.tsx              active rubric (weights check) and connected services
  api/upload                     POST multipart: validate → store → schedule the pipeline (after())
  api/candidates/[id]/status     GET  processing state (polled by the UI)
  api/candidates/[id]/retry      POST resume a failed stage, or {rescreen:true}
  api/candidates/[id]/decision   POST shortlist | hold | not_shortlisted | review
  api/candidates/[id]/email      PATCH save edits / mark ready / {reset:true}
  api/candidates/[id]/contact    PATCH correct name, email or phone
  api/candidates/[id]/file       GET  10-minute signed URL to the original CV
  api/send-email                 POST {candidate_id}: the only route that talks to Resend
src/components/                  design system: ui (Button, Input, Select, Segmented, Field, Skeleton, EmptyState),
                                 status (Status, ScoreSegments, ScoreTrack), overlay (Toast, Modal, Drawer), shell,
                                 candidate-list, score-breakdown (+EvidenceBlock), interview-brief, email-composer,
                                 processing-panel, upload-form, candidate-actions
src/app/globals.css              design tokens (colour, type scale, radius, shadow, motion)
tests/                           unit tests plus synthetic CV fixtures; tests/live has the real-Gemini check
```

## 2. Setup

```bash
npm install
cp .env.example .env.local        # fill in the values (section 4)
```

1. Create a Supabase project. In **SQL Editor**, paste all of `supabase/schema.sql` and run it. The last statement should return `PM 100.00` and `SPM 100.00`.
2. In **Project Settings → API**, copy the URL, the anon key and the **service_role** key into `.env.local`.
3. Get a Gemini key from Google AI Studio.
4. In Resend, verify a sending domain (or use `onboarding@resend.dev`, which can only deliver to your own Resend account email) and create an API key.
5. `npm run dev` and open http://localhost:3000.

## 3. Supabase schema

`supabase/schema.sql` is idempotent. It creates:

| Table | Purpose |
|---|---|
| `rubric_criteria` | role, criterion_name, description, weight, score_anchors (jsonb), sort_order, **rubric_version**, **is_active**. Seeded with v1. The `rubric_weight_totals` view shows the sum per role. |
| `candidates` | PII (`candidate_name`, `candidate_email`, `candidate_phone`) kept apart from `anonymised_cv_text`; `role_applied`, `original_file_url` (private storage path), `processing_status` (check-constrained to the 14 states), `error_message`. |
| `candidate_scores` | one row per candidate × role × criterion: score 0–5, evidence, `evidence_verified`, reason, `weighted_score`, plus snapshots of `criterion_name`, `criterion_weight` and `rubric_version`, so old scores stay explainable after a recalibration. Unique on (candidate, role, criterion). |
| `candidate_results` | `pm_score`, `spm_score`, `eligibility_status` (jsonb), `interview_brief` (jsonb), `review_status` (Arjun's), the active email (`email_type`, `email_subject`, `email_body`), both generated drafts, `email_sent`, `sent_at`, `sent_to`, `resend_message_id`. |
| `candidate_events` | audit trail (no PII). |

Also created: foreign keys with `on delete cascade`, indexes on role/status/score, `updated_at` triggers, a **`guard_email_sent` trigger** that makes a sent record immutable, the **`claim_email_send()` function** that lets exactly one sender through, **RLS enabled with no public policies**, and a **private `cvs` bucket**.

**Recalibrating the rubric:** insert rows with `rubric_version = 2`, set `is_active = false` on v1 and `true` on v2. The app refuses to score if a role's active weights do not sum to 100.

## 4. Environment variables

| Variable | Required | Notes |
|---|---|---|
| `SUPABASE_URL` | yes | |
| `SUPABASE_SERVICE_ROLE_KEY` | yes (recommended) | Server only. RLS locks the tables, so the server needs this key. |
| `SUPABASE_ANON_KEY` | fallback | Used only if the service key is missing. With RLS on and no policies, it can't read or write, which is deliberate. |
| `GEMINI_API_KEY` | yes | Sent in the `x-goog-api-key` header, never in the URL. |
| `GEMINI_MODEL` | no | Default `gemini-3.8-flash`. |
| `RESEND_API_KEY` | to send | |
| `HIRING_FROM_EMAIL` | to send | Must be on a domain verified in Resend. |
| `HIRING_FROM_NAME`, `HIRING_SIGNATURE` | no | Default "Arjun Mehta" / "Arjun Mehta\nFounder, Kargo". |
| `EMAIL_REDIRECT_TO` | no | Test mode: every email goes to this address instead of the candidate's (for example the MESA test inbox). The UI shows when it's active. |

No variable is prefixed `NEXT_PUBLIC_`, so none of them can reach the browser bundle. `.env*` files are in `.gitignore`.

## 5. Gemini architecture

- **Only anonymised text reaches Gemini.** Extraction happens locally (`unpdf`, `mammoth`). `pii.ts` removes names, emails, phones, URLs and profile links, addresses (keeping only the city), and labelled personal fields (DOB, gender, marital status, religion, caste, nationality, and so on). It also neutralises gendered pronouns. `findPIILeaks()` then re-checks the exact text before **every** Gemini call. If anything is found, the call is not made and the candidate shows "Privacy check failed".
- **Five structured calls per CV**, all `responseMimeType: application/json` with a `responseSchema`, `temperature: 0`:
  1. PM scoring, 2. SPM scoring, 3. eligibility (these three run in parallel), 4. interview brief, 5. both email drafts.
- **The scoring prompt** contains the role, the full DB rubric (descriptions and 0–5 anchors), the anonymised CV between delimiters marked as untrusted, and the literal rule *"Score only evidence explicitly present in the CV. Do not infer missing evidence."* It also forbids inferring anything from titles, prestige, years alone, certifications or personal characteristics. The criterion name is constrained with an `enum`, so the model can't rename, add or drop criteria.
- **Validation** (`ai.ts`): exactly one entry per criterion; integer 0–5; a score above 0 must include evidence; each quote is checked against the CV (`evidence_verified`, and unverified quotes are flagged in the UI); briefs must be one sentence per field with no redaction markers; emails must use `{{first_name}}` and contain no other placeholders, no mention of scores or AI, no "impressed" without 4+ evidence, and rejections must give no reasons. On an invalid response the prompt is retried once with the reason; after that the stage fails with a clear message.
- **Transport** (`gemini.ts`): retries 429/5xx and network errors with exponential backoff (4 attempts). It does not retry other 4xx responses. There is a 60 s timeout.

## 6. Scoring calculation

All in `src/lib/scoring.ts`, on the server:

```
weighted_score = (criterion_score / 5) * criterion_weight      // e.g. 4/5 × 25 = 20
overall_score  = Σ weighted_score                               // 0–100, rounded to 2 dp
```

- Weights come from the DB and must sum to exactly 100 per role (`validateRubric`), or scoring stops.
- Any total or weighted number returned by Gemini is ignored (a test covers this).
- Ranking: score descending, ties broken by upload time then id, so the order is stable and deterministic.
- "Strength" is the criterion contributing the most points. "Concern" is the criterion losing the most points against its weight. Both are deterministic, not AI.
- The candidate page shows each criterion's score, weight, points, quoted evidence and reason, and the sum line. That answers "why did this candidate get 78?".

## 7. Resend integration

`POST /api/send-email { candidate_id }` → `sendCandidateEmail()`:

1. The candidate exists; the email is not already sent (409); a decision matches the email type; the recipient exists and is valid (400); subject and body exist (400); the API key and sender are configured (500).
2. **Atomic claim**: `claim_email_send()` moves the candidate to `sending` only if it is `ready_for_review` or `send_failed` and `email_sent = false`. Concurrent clicks or duplicate requests get 409, and Resend is never called twice.
3. Resend call with an **Idempotency-Key** derived from the candidate, recipient and content, so an identical retry is deduplicated by Resend too.
4. **Only after Resend returns an id**: a conditional update sets `email_sent = true`, `sent_at`, `sent_to` and `resend_message_id`. The DB trigger then prevents the record changing again.
5. On failure (provider error, 422 invalid recipient, network error or timeout), the candidate goes to `send_failed` with the message shown inline, `email_sent` stays false, and Arjun can retry.

The candidate's first name is inserted server-side from the PII record (`personalise()`). The model only ever writes `{{first_name}}`.

## 8. Local testing

```bash
npm test            # 45 unit tests, no network
npm run typecheck
npm run test:live   # optional: real Gemini on the synthetic fixtures (needs GEMINI_API_KEY)
```

The unit tests cover every case from the brief: (1) strong PM, (2) strong SPM, (3) technical with no PM evidence, (4) strong discovery with weak technical evidence, (5) missing email, (6) missing phone, (7) PII in multiple places (header, profile text, references, labels, links, address), (8) invalid, disguised, empty, oversized and corrupted files plus a real PDF, (9) Gemini 5xx, 429 retry, 400 no-retry, invalid JSON, malformed scores, and resume after failure, (10) Resend 500, 422, network error and missing key, (11) concurrent and repeated sends, and (12) weights of 100%/100% (including the SQL seed), the formula, determinism, and ignoring model totals. Gemini and Resend are faked **only at the network boundary in tests**. The app itself has no mock mode.

**Manual end-to-end checklist** (with real keys, and `EMAIL_REDIRECT_TO` set to your test inbox):

1. Settings shows all four services ticked and both rubrics at 100%.
2. Upload `tests/fixtures/strong-pm.txt` as PM. The progress runs through five steps to "Ready for review".
3. In Supabase → `candidates`: name, email and phone are filled, and `anonymised_cv_text` contains no name, email, phone, LinkedIn or street address.
4. `candidate_scores` has 10 rows (5 PM + 5 SPM), and their `weighted_score` values sum to `candidate_results.pm_score`.
5. Open the candidate. Click **Shortlist**. The draft greets the real first name. Edit it, then **Confirm & send**, then **Send email**.
6. The inbox receives the email. The page shows "Sent · date · time", `email_sent = true` and `sent_at` are set, and Confirm & send is gone.
7. Call `POST /api/send-email` again with the same id. It returns 409 and no second email arrives.

## 9. Deploying to Vercel

1. Push to GitHub. Confirm `.env.local` is **not** committed (`git status` should not list it).
2. In Vercel, choose **Add New → Project → Import**. The framework preset is Next.js and the defaults are fine.
3. **Settings → Environment Variables**: add every variable from section 4 (Production and Preview).
4. **Settings → Deployment Protection**: turn on Vercel Authentication (or password protection) so that only you can open the app. The app has no login of its own by your choice, and it shows PII and can send email.
5. Deploy. Uploads return quickly and screening continues in the background via `after()`. Routes set `maxDuration = 300`, which Fluid compute supports.

## 10. Known limitations

- **No in-app authentication.** Access control relies on Vercel Deployment Protection (your decision). Don't deploy without it.
- **Name detection is heuristic.** It uses a labelled "Name:" line, a name-like line in the header, or the email local-part. If it misses, the leak gate can't know the name either. Check the detected name on the candidate page, and use **Edit details → Re-screen** to strip a corrected name.
- **Scanned or image-only PDFs** are rejected (there's no OCR, which would mean sending the image with PII to a service). Legacy `.doc` is not supported.
- **Evidence verification** is a normalised substring match. A paraphrased quote is flagged "not found word-for-word" rather than rejected.
- **Background processing** uses `after()`. If a function instance dies mid-pipeline, the candidate can stay in an in-progress state. Use Re-screen. A queue (for example Supabase Queues or Inngest) would make this durable.
- **Rate limits:** each CV makes 5 Gemini calls. On the free tier, uploading 60 CVs at once hits 429s. The client uploads files one at a time and the Gemini client backs off, but large batches take a while. Also, **free-tier Gemini data may be used by Google to improve its products**; use a billed key for real candidate data.
- **The v1 rubric descriptions** are written from the criterion names and the case context. Replace them with the wording from your calibrated rubric.txt in `rubric_criteria`.
- **Stale "sending":** if the server crashes after Resend accepts but before the DB write, the candidate stays in `sending` and is intentionally **not** re-sendable. Check Resend's dashboard and fix the row manually.
