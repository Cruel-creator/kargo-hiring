-- Kargo Hiring — Supabase schema (idempotent; safe to re-run)
-- Run in Supabase SQL editor: Dashboard -> SQL -> New query -> paste -> Run.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- rubric_criteria — the rubric lives in the database, not in code or prompts.
-- Calibrate later by inserting a new rubric_version and flipping is_active.
-- ---------------------------------------------------------------------------
create table if not exists rubric_criteria (
  id              uuid primary key default gen_random_uuid(),
  role            text not null check (role in ('PM', 'SPM')),
  criterion_name  text not null,
  description     text not null,
  weight          numeric(5,2) not null check (weight > 0 and weight <= 100),
  score_anchors   jsonb not null,
  sort_order      int not null default 0,
  rubric_version  int not null default 1,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (role, rubric_version, criterion_name)
);
create index if not exists rubric_criteria_active_idx on rubric_criteria (role, is_active, sort_order);
drop trigger if exists rubric_criteria_updated_at on rubric_criteria;
create trigger rubric_criteria_updated_at before update on rubric_criteria
  for each row execute function set_updated_at();

-- Weight check the app also enforces before every scoring call.
create or replace view rubric_weight_totals as
  select role, rubric_version, sum(weight) as total_weight, count(*) as criteria
  from rubric_criteria where is_active group by role, rubric_version;

-- ---------------------------------------------------------------------------
-- candidates — PII lives only in candidate_name / candidate_email / candidate_phone.
-- anonymised_cv_text is the only CV text the AI ever sees.
-- ---------------------------------------------------------------------------
create table if not exists candidates (
  id                  uuid primary key default gen_random_uuid(),
  candidate_name      text,
  candidate_email     text,
  candidate_phone     text,
  role_applied        text not null check (role_applied in ('PM', 'SPM')),
  original_file_url   text,           -- private storage path: cvs/<id>/<file>
  original_file_name  text,
  original_file_type  text,
  anonymised_cv_text  text,
  processing_status   text not null default 'uploaded' check (processing_status in (
    'uploaded','extracting','extracted','anonymising','scoring','generating_brief',
    'generating_email','ready_for_review','sending','sent',
    'extraction_failed','scoring_failed','generation_failed','send_failed')),
  error_message       text,           -- never contains PII
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists candidates_role_idx on candidates (role_applied);
create index if not exists candidates_status_idx on candidates (processing_status);
create index if not exists candidates_created_idx on candidates (created_at desc);
drop trigger if exists candidates_updated_at on candidates;
create trigger candidates_updated_at before update on candidates
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- candidate_scores — one row per candidate x role x criterion. Name, weight and
-- rubric version are snapshotted so old scores stay explainable after recalibration.
-- ---------------------------------------------------------------------------
create table if not exists candidate_scores (
  id                 uuid primary key default gen_random_uuid(),
  candidate_id       uuid not null references candidates(id) on delete cascade,
  role               text not null check (role in ('PM', 'SPM')),
  criterion_id       uuid not null references rubric_criteria(id) on delete restrict,
  criterion_name     text not null,
  criterion_weight   numeric(5,2) not null,
  rubric_version     int not null,
  score              int not null check (score between 0 and 5),
  evidence           text not null default '',
  evidence_verified  boolean not null default false,  -- quote found verbatim in the anonymised CV
  reason             text not null default '',
  weighted_score     numeric(6,2) not null,
  created_at         timestamptz not null default now(),
  unique (candidate_id, role, criterion_id)
);
create index if not exists candidate_scores_candidate_idx on candidate_scores (candidate_id, role);

-- ---------------------------------------------------------------------------
-- candidate_results — one row per candidate.
-- ---------------------------------------------------------------------------
create table if not exists candidate_results (
  id                         uuid primary key default gen_random_uuid(),
  candidate_id               uuid not null unique references candidates(id) on delete cascade,
  pm_score                   numeric(6,2),
  spm_score                  numeric(6,2),
  eligibility_status         jsonb,  -- {location_status, location_evidence, role_match, role_match_evidence}
  interview_brief            jsonb,  -- {why_scored, strongest_evidence, probe}: max 3 sentences
  review_status              text not null default 'review' check (review_status in (
    'review','shortlist','hold','not_shortlisted','email_ready','sent')),
  email_type                 text check (email_type in ('interview','rejection')),
  email_subject              text,
  email_body                 text,
  draft_interview_subject    text,
  draft_interview_body       text,
  draft_rejection_subject    text,
  draft_rejection_body       text,
  email_sent                 boolean not null default false,
  sent_at                    timestamptz,
  sent_to                    text,
  resend_message_id          text,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);
create index if not exists candidate_results_pm_idx on candidate_results (pm_score desc nulls last);
create index if not exists candidate_results_spm_idx on candidate_results (spm_score desc nulls last);
create index if not exists candidate_results_review_idx on candidate_results (review_status);
drop trigger if exists candidate_results_updated_at on candidate_results;
create trigger candidate_results_updated_at before update on candidate_results
  for each row execute function set_updated_at();

-- Once sent, always sent: the flag and timestamp cannot be reverted or rewritten.
create or replace function guard_email_sent() returns trigger
language plpgsql as $$
begin
  if old.email_sent and (not new.email_sent or new.sent_at is distinct from old.sent_at
      or new.email_body is distinct from old.email_body
      or new.email_subject is distinct from old.email_subject) then
    raise exception 'email already sent for candidate %; sent records are immutable', old.candidate_id;
  end if;
  return new;
end $$;
drop trigger if exists candidate_results_guard_sent on candidate_results;
create trigger candidate_results_guard_sent before update on candidate_results
  for each row execute function guard_email_sent();

-- ---------------------------------------------------------------------------
-- candidate_events — audit trail (no PII in detail).
-- ---------------------------------------------------------------------------
create table if not exists candidate_events (
  id            uuid primary key default gen_random_uuid(),
  candidate_id  uuid not null references candidates(id) on delete cascade,
  event         text not null,
  detail        text,
  created_at    timestamptz not null default now()
);
create index if not exists candidate_events_candidate_idx on candidate_events (candidate_id, created_at);

-- ---------------------------------------------------------------------------
-- Atomic send claim — exactly one caller wins; concurrent/duplicate requests get false.
-- ---------------------------------------------------------------------------
create or replace function claim_email_send(p_candidate_id uuid) returns boolean
language plpgsql as $$
declare n int;
begin
  update candidates c set processing_status = 'sending', error_message = null
   where c.id = p_candidate_id
     and c.processing_status in ('ready_for_review', 'send_failed')
     and exists (select 1 from candidate_results r
                  where r.candidate_id = p_candidate_id and r.email_sent = false);
  get diagnostics n = row_count;
  return n = 1;
end $$;

-- ---------------------------------------------------------------------------
-- Row Level Security: on, with no public policies. The server uses the
-- service role key, which bypasses RLS. The anon key alone therefore cannot read PII.
-- ---------------------------------------------------------------------------
alter table rubric_criteria   enable row level security;
alter table candidates        enable row level security;
alter table candidate_scores  enable row level security;
alter table candidate_results enable row level security;
alter table candidate_events  enable row level security;
revoke execute on function claim_email_send(uuid) from public, anon, authenticated;

-- Private bucket for original CV files.
insert into storage.buckets (id, name, public)
values ('cvs', 'cvs', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Rubric v1 seed. Weights: PM = 100, SPM = 100.
-- ---------------------------------------------------------------------------
do $$
declare anchors jsonb := '{
  "0": "No evidence in the CV",
  "1": "Minimal evidence: a passing mention with no specifics",
  "2": "Weak evidence: stated but thin, no concrete outcome or ownership",
  "3": "Moderate evidence: one concrete, specific example",
  "4": "Strong evidence: several concrete examples, or one with clear measurable outcome",
  "5": "Exceptional evidence: repeated, specific, outcome-backed examples at meaningful scale"
}'::jsonb;
begin
  insert into rubric_criteria (role, criterion_name, description, weight, score_anchors, sort_order, rubric_version) values
  ('PM', 'End-to-End Product Ownership',
   'The CV names a product or feature area the candidate personally owned from problem definition through launch and post-launch iteration, and the decisions they made in it. Strong: "owned X", what they decided, what shipped, what changed after. Weak: lists responsibilities, participation, or team membership with no owned area or outcome.',
   25, anchors, 1, 1),
  ('PM', 'Customer & Problem Discovery',
   'The CV shows the candidate went to users directly (interviews, site or warehouse visits, shadowing operations, support tickets, sales calls) and that a specific problem or product change came out of it. Strong: named research activity plus the finding or change it produced. Weak: generic "customer-centric" wording with no activity or finding.',
   20, anchors, 2, 1),
  ('PM', 'Shipping & Outcome Orientation',
   'The CV shows work that reached production and reports what happened as a result: adoption, time saved, error rates, revenue, retention, or another measured outcome. Strong: shipped item plus a number or observable result. Weak: outputs only (roadmaps, PRDs, "worked on") with no shipped result.',
   20, anchors, 3, 1),
  ('PM', 'Operating Without Structure',
   'The CV shows the candidate delivered in ambiguous, under-resourced settings: early-stage or zero-to-one products, first PM in a team, building their own process, covering gaps outside their job. Strong: explicit example of creating structure where none existed. Weak: only large, established teams with defined processes, or no mention.',
   20, anchors, 4, 1),
  ('PM', 'Technical & Systems Fluency',
   'The CV shows the candidate worked credibly on technical substance with engineers: APIs, integrations, data models, system constraints, SQL or analytics, technical trade-offs in specs. Strong: a named technical decision or integration they drove. Weak: tool lists or "worked with engineering" with no technical content.',
   15, anchors, 5, 1),
  ('SPM', 'Platform / Integration Ownership',
   'The CV shows ownership of a platform, API, or integration layer used by multiple teams, partners or customers (for example carrier, ERP, customs or payment integrations). Strong: named platform or integration, its consumers, and its scale or reliability outcomes. Weak: used integrations, or owned a single end-user feature only.',
   25, anchors, 1, 1),
  ('SPM', 'Independent Product Decision-Making',
   'The CV shows significant product calls the candidate made and defended without a senior PM above them: setting direction or roadmap, killing, pivoting or re-scoping work, with stated rationale and result. Strong: decision, rationale and outcome in their own ownership. Weak: executed a roadmap set by others, or decision-making claimed without an example.',
   25, anchors, 2, 1),
  ('SPM', 'Cross-Functional Influence & Alignment',
   'The CV shows the candidate aligned engineering, sales, operations, leadership or customers without formal authority, and resolved a conflict or brought a group to a decision. Strong: named groups, the disagreement or trade-off, and how it was resolved. Weak: "collaborated with stakeholders" with no specific alignment example.',
   20, anchors, 3, 1),
  ('SPM', 'Reliability, Data & Systems Thinking',
   'The CV shows attention to how systems behave in production: SLAs, uptime, data quality, monitoring, instrumentation, incident follow-through, or metrics design. Strong: a named reliability or data improvement with a measured result. Weak: dashboards mentioned in passing, or no production-systems content.',
   15, anchors, 4, 1),
  ('SPM', 'Building Product Operating Systems',
   'The CV shows the candidate built the product process others work within: planning cadence, PRD or review templates, discovery rituals, prioritisation frameworks, or hiring and mentoring PMs. Strong: a process they created that a team adopted. Weak: followed existing processes, or mentions agile/scrum only.',
   15, anchors, 5, 1)
  on conflict (role, rubric_version, criterion_name) do nothing;
end $$;

-- Sanity check: both rows should show total_weight = 100.00
select * from rubric_weight_totals order by role;
