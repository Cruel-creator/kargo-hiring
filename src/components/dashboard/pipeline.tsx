"use client";

import { ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import CountUp from "@/components/bits/CountUp";
import { gsap, useGSAP } from "@/components/motion/gsap";
import { cx } from "@/lib/cx";
import type { EmailType } from "@/lib/types";
import type { CandidateRowView, DisplayStatus } from "@/lib/view";
import { canTakeOverCounts, countIn, type Entrance } from "./entrance";

export type StageKey = "all" | "screening" | "reviewing" | "decided" | "contacted";
export type SideKey = "failed" | "hold" | "not_shortlisted";
/** Stage and side keys drive the flow. Any plain display status (?status=review) still filters by that status alone. */
export type Filter = StageKey | SideKey | DisplayStatus;

interface Position { stage: Exclude<StageKey, "all">; side: SideKey | null }

/**
 * Where a candidate sits in the flow. Every candidate is in exactly one stage, so the stages add up to Applied.
 * A side is a subset of its stage: failed screening, on hold, not shortlisted (including a sent rejection).
 * Contacted means an interview invite has actually gone; a drafted or ready-to-send invite is still Decided.
 */
export function positionOf(row: CandidateRowView, emailType: EmailType | null | undefined): Position {
  switch (row.status) {
    case "processing":
      return { stage: "screening", side: null };
    case "failed":
      return { stage: "screening", side: "failed" };
    case "review":
      return { stage: "reviewing", side: null };
    case "hold":
      return { stage: "reviewing", side: "hold" };
    case "shortlist":
      return { stage: "decided", side: null };
    case "not_shortlisted":
      return { stage: "decided", side: "not_shortlisted" };
    case "email_ready":
      return emailType === "rejection" ? { stage: "decided", side: "not_shortlisted" } : { stage: "decided", side: null };
    case "sent":
      return emailType === "rejection" ? { stage: "decided", side: "not_shortlisted" } : { stage: "contacted", side: null };
  }
}

const STAGE_KEYS = new Set<string>(["screening", "reviewing", "decided", "contacted"]);
const SIDE_KEYS = new Set<string>(["failed", "hold", "not_shortlisted"]);

export function matchesFilter(row: CandidateRowView, filter: Filter, emailType: EmailType | null | undefined): boolean {
  if (filter === "all") return true;
  const p = positionOf(row, emailType);
  if (STAGE_KEYS.has(filter)) return p.stage === filter;
  if (SIDE_KEYS.has(filter)) return p.side === filter;
  return row.status === filter;
}

/** Counts per stage (including its side) and per side, plus `all`. */
export function stageCounts(rows: CandidateRowView[], emailTypes: Record<string, EmailType>): Record<string, number> {
  const c: Record<string, number> = { all: rows.length };
  for (const r of rows) {
    const p = positionOf(r, emailTypes[r.id]);
    c[p.stage] = (c[p.stage] ?? 0) + 1;
    if (p.side) c[p.side] = (c[p.side] ?? 0) + 1;
  }
  return c;
}

interface Side { key: SideKey; label: (n: number) => string; fill: string; tone: string }
interface Stage { key: StageKey; label: string; fill: string; side: Side | null }

/**
 * The ATS stage flow. Each stage's number is everyone in it, side included, so the four stages after Applied
 * reconcile with the total. The track draws the same number: the main part, then the side part beside it.
 * Only Contacted (an invite actually sent) is drawn in the darkest petrol; the not-shortlisted side is neutral.
 */
const STAGES: Stage[] = [
  { key: "all", label: "Applied", fill: "bg-faint", side: null },
  { key: "screening", label: "Screening", fill: "bg-muted", side: { key: "failed", label: (n) => (n === 1 ? "needs attention" : "need attention"), fill: "bg-danger", tone: "bg-danger" } },
  { key: "reviewing", label: "Review", fill: "bg-ink-2", side: { key: "hold", label: () => "on hold", fill: "bg-warn-dot", tone: "bg-warn-dot" } },
  { key: "decided", label: "Decided", fill: "bg-accent", side: { key: "not_shortlisted", label: () => "not shortlisted", fill: "bg-line-strong", tone: "bg-muted" } },
  { key: "contacted", label: "Contacted", fill: "bg-accent-hover", side: null },
];

export function Pipeline({ counts, active, onPick, entrance }: { counts: Record<string, number>; active: Filter; onPick: (k: Filter) => void; entrance: Entrance }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ov, setOv] = useState<"end" | "none">("none");
  const total = counts.all ?? 0;

  // Right-edge fade while the track overflows (phones). A scroll listener on the strip itself, never the pointer.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setOv(el.scrollWidth > el.clientWidth + 1 && el.scrollLeft + el.clientWidth < el.scrollWidth - 1 ? "end" : "none");
    const ro = new ResizeObserver(check);
    ro.observe(el);
    el.addEventListener("scroll", check, { passive: true });
    check();
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", check);
    };
  }, []);

  // Draw-in: fills sweep left to right (~600ms in all), counts climb from 0. See entrance.tsx for the three paths.
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const counters = Array.from(el.querySelectorAll("[data-count]"));
        if (entrance === "client") {
          gsap.fromTo(el.querySelectorAll("[data-fill]"), { scaleX: 0 }, { scaleX: 1, duration: 0.36, ease: "expo.out", stagger: 0.06, clearProps: "transform" });
          counters.forEach((c, i) => countIn(c, i * 0.06, 0.5));
        } else if (entrance === "server" && canTakeOverCounts()) {
          counters.forEach((c, i) => countIn(c, 0.06 + i * 0.06, 0.5)); // the CSS draws the fills
        }
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div
      ref={ref}
      data-ledger
      data-enter="stage"
      role="group"
      aria-label="Filter by stage"
      data-lenis-prevent-horizontal
      data-scroll-y="page"
      data-overflow={ov}
      className="relative -mx-1 flex overflow-x-auto border-y border-line px-1 [scrollbar-width:none] data-[overflow=end]:[mask-image:linear-gradient(to_right,#000_calc(100%-32px),transparent)]"
    >
      {STAGES.map((s, i) => {
        const count = s.key === "all" ? total : (counts[s.key] ?? 0); // the stage number includes its side
        const side = s.side ? Math.min(count, counts[s.side.key] ?? 0) : 0;
        const main = count - side;
        const on = active === s.key;
        const sideOn = !!s.side && active === s.side.key;
        const pct = (n: number) => (total ? `${(n / total) * 100}%` : "0%");
        return (
          <div
            key={s.key}
            className={cx(
              "relative flex min-w-[8.5rem] flex-1 flex-col transition-shadow duration-[var(--duration-fast)]",
              i > 0 && "border-l border-line",
              (on || sideOn) && "shadow-[inset_0_-2px_0_var(--color-ink)]",
            )}
          >
            {i > 0 ? (
              <span aria-hidden className="paper absolute top-[13px] -left-[8px] z-[1] flex size-4 items-center justify-center rounded-full text-faint">
                <ChevronRight className="size-3" strokeWidth={2.25} />
              </span>
            ) : null}
            <button
              type="button"
              aria-pressed={on}
              onClick={() => onPick(s.key)}
              className="tnum group flex flex-col items-stretch px-4 pt-4 pb-1 text-left"
            >
              <span className="flex h-1.5 overflow-hidden rounded-[2px] bg-line" style={{ "--i": i } as CSSProperties}>
                {main > 0 ? <span data-fill className={cx("h-full", s.fill)} style={{ width: pct(main) }} /> : null}
                {side > 0 && s.side ? <span data-fill className={cx("h-full", main > 0 && "ml-[2px]", s.side.fill)} style={{ width: pct(side) }} /> : null}
              </span>
              <span className="mt-2.5 flex items-baseline gap-2">
                <span data-count={count}>
                  <CountUp to={count} className={cx("text-figure font-semibold transition-colors duration-[var(--duration-fast)]", on ? "text-ink" : "text-ink-2 group-hover:text-ink")} />
                </span>
                <span className={cx("text-meta whitespace-nowrap transition-colors duration-[var(--duration-fast)]", on ? "font-medium text-ink" : "text-muted group-hover:text-ink-2")}>{s.label}</span>
              </span>
            </button>
            {s.side && side > 0 ? (
              <button
                type="button"
                aria-pressed={sideOn}
                aria-label={`${side} ${s.side.label(side)}, of ${count} in ${s.label}`}
                onClick={() => onPick(s.side!.key)}
                className={cx(
                  // Narrow cells (tablet widths) let the side line take a second line rather than run into the next stage.
                  "tnum mx-4 mb-2 self-start rounded-sm text-left text-meta text-pretty transition-colors duration-[var(--duration-fast)]",
                  sideOn ? "font-medium text-ink" : "text-ink-2 hover:text-ink",
                )}
              >
                <span aria-hidden className={cx("mr-1.5 inline-block size-1.5 rounded-full align-middle", s.side.tone)} />
                incl. {side} <span className="whitespace-nowrap">{s.side.label(side)}</span>
              </button>
            ) : (
              <span aria-hidden className="mx-4 mb-2 block h-[var(--text-meta--line-height)]" />
            )}
          </div>
        );
      })}
    </div>
  );
}
