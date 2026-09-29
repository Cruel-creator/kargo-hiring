"use client";

import { AlertTriangle, ChevronDown } from "lucide-react";
import { useState } from "react";
import { cx } from "@/lib/cx";
import { evidenceStrength, overallScore } from "@/lib/scoring";
import type { CandidateScore, Role } from "@/lib/types";
import { formatScore } from "@/lib/view";
import { ScoreSegments } from "./status";
import { Segmented } from "./ui";

type RubricInfo = Record<Role, { id: string; description: string }[]>;

export function ScoreBreakdown({ applied, scores, rubrics, className }: { applied: Role; scores: CandidateScore[]; rubrics: RubricInfo; className?: string }) {
  const [role, setRole] = useState<Role>(applied);
  const order = new Map(rubrics[role].map((c, i) => [c.id, i]));
  const desc = new Map(rubrics[role].map((c) => [c.id, c.description]));
  const rows = scores.filter((s) => s.role === role).sort((a, b) => (order.get(a.criterion_id) ?? 99) - (order.get(b.criterion_id) ?? 99));
  const [open, setOpen] = useState<Set<string>>(() => new Set(scores.map((s) => s.criterion_id)));
  const allOpen = rows.every((r) => open.has(r.criterion_id));
  const total = overallScore(rows.map((r) => r.weighted_score));

  const toggle = (id: string) =>
    setOpen((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <section aria-labelledby="breakdown-title" className={className}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h2 id="breakdown-title" className="text-name font-semibold tracking-[-0.01em] text-ink">
          Score breakdown
        </h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(allOpen ? new Set() : new Set(rows.map((r) => r.criterion_id)))}
            className="rounded-sm text-meta text-muted hover:text-ink"
          >
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
          <Segmented
            size="sm"
            label="Rubric"
            value={role}
            onChange={setRole}
            options={[
              { value: "PM", label: applied === "PM" ? "PM rubric" : "PM rubric (cross-role)" },
              { value: "SPM", label: applied === "SPM" ? "SPM rubric" : "SPM rubric (cross-role)" },
            ]}
          />
        </div>
      </div>

      <ol className="border-t border-line">
        {rows.map((r) => {
          const isOpen = open.has(r.criterion_id);
          const panelId = `crit-${r.criterion_id}`;
          return (
            <li key={r.criterion_id} className="border-b border-line">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(r.criterion_id)}
                className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 py-3.5 text-left sm:grid-cols-[minmax(0,1fr)_auto_3.5rem_5.5rem_1rem]"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">{r.criterion_name}</span>
                  <span className={cx("block text-meta", r.score >= 4 ? "text-accent" : r.score === 0 ? "text-muted" : "text-ink-2")}>{evidenceStrength(r.score)}</span>
                </span>
                <ScoreSegments score={r.score} className="hidden sm:inline-flex" />
                <span className="tnum text-right text-sm font-semibold text-ink" aria-label={`${r.score} out of 5`}>
                  {r.score}
                  <span className="font-normal text-muted"> / 5</span>
                </span>
                <span className="tnum col-span-1 text-right text-meta text-muted sm:col-span-1" aria-label={`${formatScore(r.weighted_score)} of ${r.criterion_weight} points`}>
                  <span className="font-medium text-ink-2">{formatScore(r.weighted_score)}</span> / {formatScore(r.criterion_weight)} pts
                </span>
                <ChevronDown className={cx("hidden size-4 text-muted transition-transform duration-[var(--duration-base)] sm:block", isOpen && "rotate-180")} aria-hidden />
              </button>
              <div id={panelId} hidden={!isOpen} className="pb-5">
                <EvidenceBlock evidence={r.evidence} verified={r.evidence_verified} reason={r.reason} />
                {desc.get(r.criterion_id) ? (
                  <details className="mt-3 text-meta">
                    <summary className="cursor-pointer rounded-sm text-muted hover:text-ink">What a strong candidate shows · weight {formatScore(r.criterion_weight)}%</summary>
                    <p className="mt-1.5 max-w-[70ch] leading-relaxed text-muted">{desc.get(r.criterion_id)}</p>
                  </details>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="flex items-baseline justify-between py-3 text-sm">
        <span className="text-muted">Total · sum of weighted contributions</span>
        <span className="tnum font-semibold text-ink">
          {formatScore(total)} <span className="font-normal text-muted">/ 100</span>
        </span>
      </div>
    </section>
  );
}

export function EvidenceBlock({ evidence, verified, reason }: { evidence: string; verified: boolean; reason: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-x-4">
      <p className="text-label font-medium text-muted sm:pt-0.5">Evidence from CV</p>
      {evidence ? (
        <div>
          <blockquote className="max-w-[68ch] border-l border-line-strong pl-3.5 text-body text-ink-2">{evidence}</blockquote>
          {!verified ? (
            <p className="mt-1.5 flex items-center gap-1.5 text-meta text-warn">
              <AlertTriangle className="size-3.5" aria-hidden />
              This quote was not found word-for-word in the CV. Check the original before relying on it.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="border-l border-transparent pl-3.5 text-body text-muted">No evidence for this criterion in the CV. Scored 0; this is not a judgement about the candidate.</p>
      )}
      <p className="text-label font-medium text-muted sm:pt-0.5">Why this score</p>
      <p className="max-w-[68ch] border-l border-transparent pl-3.5 text-body text-ink">{reason}</p>
    </div>
  );
}
