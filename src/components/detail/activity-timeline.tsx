"use client";

import { useRef } from "react";
import type { CandidateEvent } from "@/lib/types";
import { formatDateTime } from "@/lib/view";
import { gsap, ScrollTrigger, useGSAP } from "@/components/motion/gsap";

const label = (e: string) => {
  const s = e.replaceAll("_", " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/**
 * The candidate's pipeline events as a vertical timeline. As it scrolls into view the rail draws down
 * and each event settles in turn (once). Visible by default: only a timeline below the fold at mount
 * gets a from-state, and no text goes under 0.15 opacity. Reduced motion: static.
 */
export function ActivityTimeline({ events, className }: { events: CandidateEvent[]; className?: string }) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const list = root.querySelector<HTMLElement>("ol");
        if (!list || list.getBoundingClientRect().top < window.innerHeight * 0.9) return; // already in view: leave it be
        const rail = root.querySelectorAll("[data-rail]");
        const dots = root.querySelectorAll("[data-dot]");
        const items = root.querySelectorAll("[data-event]");
        gsap.set(rail, { scaleY: 0, transformOrigin: "50% 0%" });
        gsap.set(dots, { scale: 0 });
        gsap.set(items, { opacity: 0.15, y: 8 });
        const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.out" } });
        tl.to(rail, { scaleY: 1, duration: 0.6 / Math.max(1, rail.length), stagger: 0.6 / Math.max(1, rail.length), ease: "none" }, 0.05)
          .to(dots, { scale: 1, duration: 0.24, stagger: 0.6 / Math.max(1, dots.length), ease: "back.out(2)" }, 0.02)
          .to(items, { opacity: 1, y: 0, duration: 0.4, stagger: 0.6 / Math.max(1, items.length) }, 0.04);
        const st = ScrollTrigger.create({ trigger: list, start: "top 88%", once: true, onEnter: () => tl.play() });
        const complete = () => tl.progress(1);
        root.addEventListener("focusin", complete);
        return () => {
          root.removeEventListener("focusin", complete);
          st.kill();
          tl.kill();
          gsap.set([...rail, ...dots, ...items], { clearProps: "opacity,transform" });
        };
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <section ref={ref} aria-labelledby="activity-title" className={className}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 id="activity-title" className="text-name font-semibold tracking-[-0.01em] text-ink">
          Activity
        </h2>
        <p className="tnum text-meta text-muted">{events.length} events</p>
      </div>
      {events.length ? (
        <ol className="relative">
          {events.map((ev, i) => {
            const last = i === events.length - 1;
            return (
              <li key={ev.id ?? i} className="relative grid grid-cols-[11px_minmax(0,1fr)] gap-x-4 pb-4 last:pb-0">
                {/* Rail segment from this dot to the next one. */}
                {!last ? <span data-rail aria-hidden className="absolute top-[10px] -bottom-[10px] left-[5px] w-px bg-accent/45" /> : null}
                <span aria-hidden className="relative mt-[4.5px] flex justify-center">
                  <span data-dot className={last ? "size-[11px] rounded-full border-2 border-accent bg-canvas" : "size-[11px] rounded-full border-2 border-canvas bg-accent"} />
                </span>
                <div data-event className="min-w-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <span className="text-sm font-medium text-ink-2">{label(ev.event)}</span>
                    {ev.created_at ? <time dateTime={ev.created_at} className="tnum text-meta text-muted">{formatDateTime(ev.created_at)}</time> : null}
                  </div>
                  {ev.detail ? <p className="mt-0.5 text-meta text-muted">{ev.detail}</p> : null}
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-meta text-muted">No activity recorded yet.</p>
      )}
    </section>
  );
}
