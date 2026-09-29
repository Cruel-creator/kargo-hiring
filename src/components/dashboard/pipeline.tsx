"use client";

import { ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import CountUp from "@/components/bits/CountUp";
import { gsap, useGSAP } from "@/components/motion/gsap";
import { cx } from "@/lib/cx";
import { canTakeOverCounts, countIn, type Entrance } from "./entrance";

export type Filter = "all" | "review" | "shortlist" | "hold" | "email_ready" | "sent" | "not_shortlisted" | "processing" | "failed";

interface Bucket { key: Filter; label: (n: number) => string; fill: string; tone: string }
interface Stage { key: Filter; label: string; fill: string; sub: Bucket | null }

/**
 * The ATS stage flow. Every existing status filter lives here: each stage filters by its main status and carries
 * the status that sits beside it in the flow (failed screening, on hold, not shortlisted, email ready to send).
 * Tracks are proportional to the pool (Applied is the whole pool); a stage's track stacks its main and side counts.
 */
const STAGES: Stage[] = [
  { key: "all", label: "Applied", fill: "bg-faint", sub: null },
  { key: "processing", label: "Screening", fill: "bg-muted", sub: { key: "failed", label: (n) => (n === 1 ? "needs attention" : "need attention"), fill: "bg-danger", tone: "bg-danger" } },
  { key: "review", label: "Review", fill: "bg-ink-2", sub: { key: "hold", label: () => "on hold", fill: "bg-warn-dot", tone: "bg-warn-dot" } },
  { key: "shortlist", label: "Shortlisted", fill: "bg-accent", sub: { key: "not_shortlisted", label: () => "not shortlisted", fill: "bg-line-strong", tone: "bg-muted" } },
  { key: "sent", label: "Contacted", fill: "bg-accent-hover", sub: { key: "email_ready", label: () => "ready to send", fill: "bg-accent-line", tone: "bg-accent-line" } },
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
      aria-label="Filter by status"
      data-lenis-prevent-horizontal
      data-scroll-y="page"
      data-overflow={ov}
      className="relative -mx-1 flex overflow-x-auto border-y border-line px-1 [scrollbar-width:none] data-[overflow=end]:[mask-image:linear-gradient(to_right,#000_calc(100%-32px),transparent)]"
    >
      {STAGES.map((s, i) => {
        const main = s.key === "all" ? total : (counts[s.key] ?? 0);
        const side = s.sub ? (counts[s.sub.key] ?? 0) : 0;
        const on = active === s.key;
        const subOn = !!s.sub && active === s.sub.key;
        const pct = (n: number) => (total ? `${(n / total) * 100}%` : "0%");
        return (
          <div
            key={s.key}
            className={cx(
              "relative flex min-w-[8.5rem] flex-1 flex-col transition-shadow duration-[var(--duration-fast)]",
              i > 0 && "border-l border-line",
              (on || subOn) && "shadow-[inset_0_-2px_0_var(--color-ink)]",
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
                {side > 0 && s.sub ? <span data-fill className={cx("h-full", main > 0 && "ml-[2px]", s.sub.fill)} style={{ width: pct(side) }} /> : null}
              </span>
              <span className="mt-2.5 flex items-baseline gap-2">
                <span data-count={main}>
                  <CountUp to={main} className={cx("text-figure font-semibold transition-colors duration-[var(--duration-fast)]", on ? "text-ink" : "text-ink-2 group-hover:text-ink")} />
                </span>
                <span className={cx("text-meta whitespace-nowrap transition-colors duration-[var(--duration-fast)]", on ? "font-medium text-ink" : "text-muted group-hover:text-ink-2")}>{s.label}</span>
              </span>
            </button>
            {s.sub && side > 0 ? (
              <button
                type="button"
                aria-pressed={subOn}
                onClick={() => onPick(s.sub!.key)}
                className={cx(
                  "tnum mx-4 mb-2 inline-flex items-center gap-1.5 self-start rounded-sm text-meta whitespace-nowrap transition-colors duration-[var(--duration-fast)]",
                  subOn ? "font-medium text-ink" : "text-ink-2 hover:text-ink",
                )}
              >
                <span aria-hidden className={cx("inline-block size-1.5 rounded-full", s.sub.tone)} />
                {side} {s.sub.label(side)}
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
