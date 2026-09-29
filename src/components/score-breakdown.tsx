"use client";

import { AlertTriangle, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import { evidenceStrength, overallScore } from "@/lib/scoring";
import type { CandidateScore, Role } from "@/lib/types";
import { formatScore } from "@/lib/view";
import { gsap, ScrollTrigger, useGSAP } from "./motion/gsap";
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

  // The score-composition ribbon asks for a criterion: show the applied rubric with that row open.
  useEffect(() => {
    const on = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      setRole(applied);
      setOpen((p) => new Set(p).add(id));
    };
    window.addEventListener("kh:criterion", on);
    return () => window.removeEventListener("kh:criterion", on);
  }, [applied]);

  // Each criterion's segments fill left to right as its row scrolls into view (once). Rows already on
  // screen at mount, no-JS and reduced motion all show the filled state; only JS applies the from-state.
  const list = useRef<HTMLOListElement>(null);
  useGSAP(
    () => {
      const ol = list.current;
      if (!ol) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const kills: (() => void)[] = [];
        ol.querySelectorAll<HTMLElement>(":scope > li").forEach((row) => {
          const segs = row.querySelectorAll<HTMLElement>("[data-segments] > span");
          if (!segs.length || !segs[0].getClientRects().length || row.getBoundingClientRect().top < window.innerHeight) return;
          gsap.set(segs, { scaleX: 0, transformOrigin: "0% 50%" });
          const st = ScrollTrigger.create({
            trigger: row,
            start: "top 88%",
            once: true,
            onEnter: () => gsap.to(segs, { scaleX: 1, duration: 0.3, stagger: 0.06, ease: "power2.out", clearProps: "transform" }),
          });
          kills.push(() => {
            st.kill();
            gsap.set(segs, { clearProps: "transform" });
          });
        });
        return () => kills.forEach((k) => k());
      });
      return () => mm.revert();
    },
    { scope: list },
  );

  // A rubric switch or an expanded row changes the page height: re-measure every scroll trigger below.
  const measured = useRef(false);
  useEffect(() => {
    if (!measured.current) {
      measured.current = true;
      return;
    }
    const raf = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(raf);
  }, [role, open]);

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

      <ol ref={list} className="border-t border-line">
        {rows.map((r, i) => {
          const isOpen = open.has(r.criterion_id);
          const panelId = `crit-${r.criterion_id}`;
          return (
            // Keyed by slot, so a rubric switch reuses the nodes and the segments refill in place.
            <li key={`slot-${i}`} id={`row-${r.criterion_id}`} className="border-b border-line">
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
          {/* The total swaps with a short fade on a rubric switch. It never counts. */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={role} className="inline-block" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.08 }}>
              {formatScore(total)}
            </motion.span>
          </AnimatePresence>{" "}
          <span className="font-normal text-muted">/ 100</span>
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
        <div data-reveal>
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
