"use client";

import { useRef, type ReactNode } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/components/motion/gsap";

/**
 * Gentle staggered rise (8px, 400ms) for the [data-reveal] blocks inside, as they scroll in.
 * - Server HTML and no-JS: fully visible. Only blocks below the fold at mount get a from-state, and it
 *   is never below 0.15 opacity, so nothing is ever invisible.
 * - Blocks already on screen at mount never move. Focus inside a block completes it at once.
 * - Reduced motion: nothing runs.
 */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const below = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]")).filter(
          (el) => el.getClientRects().length > 0 && el.getBoundingClientRect().top > window.innerHeight,
        );
        if (!below.length) return;
        gsap.set(below, { opacity: 0.15, y: 8 });
        const show = (els: Element[]) => gsap.to(els, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out", stagger: 0.07, overwrite: true, clearProps: "opacity,transform" });
        const triggers = ScrollTrigger.batch(below, { start: "top 92%", once: true, onEnter: show });
        const onFocus = (e: FocusEvent) => {
          const el = (e.target as HTMLElement).closest<HTMLElement>("[data-reveal]");
          if (el && below.includes(el)) gsap.set(el, { clearProps: "opacity,transform" });
        };
        root.addEventListener("focusin", onFocus);
        return () => {
          root.removeEventListener("focusin", onFocus);
          triggers.forEach((t) => t.kill());
          gsap.set(below, { clearProps: "opacity,transform" });
        };
      });
      return () => mm.revert();
    },
    { scope: ref },
  );
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
