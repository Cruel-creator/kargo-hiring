"use client";

import { useLenis } from "lenis/react";
import type { ReactNode } from "react";
import { barHeight, prefersReducedMotion } from "@/components/motion/scroll";

/**
 * An in-page link that moves focus to its target and lands it 24px under the sticky bar.
 * Without JS it is a plain anchor.
 *
 * The scroll position is computed here and handed to Lenis as a number: given an element, Lenis
 * also subtracts the root's scroll-padding-top and the target's scroll-margin-top, which would
 * double-count the bar and park the target about 110px too low.
 */
export function JumpLink({ to, focus, className, children }: { to: string; focus?: string; className?: string; children: ReactNode }) {
  const lenis = useLenis();
  return (
    <a
      href={to}
      className={className}
      onClick={(e) => {
        const el = document.querySelector<HTMLElement>(to);
        if (!el) return;
        e.preventDefault();
        document.querySelector<HTMLElement>(focus ?? to)?.focus({ preventScroll: true });
        const top = Math.max(0, el.getBoundingClientRect().top + window.scrollY - barHeight() - 24);
        if (lenis) lenis.scrollTo(top, { duration: 0.7, immediate: prefersReducedMotion() });
        else window.scrollTo({ top });
      }}
    >
      {children}
    </a>
  );
}
