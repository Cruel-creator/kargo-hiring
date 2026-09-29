"use client";
import { useLenis } from "lenis/react";
import { useCallback } from "react";

export function barHeight(): number {
  return document.getElementById("app-bar")?.getBoundingClientRect().height ?? 56;
}
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
/** Jump to an in-page target under the sticky bar. Focus moves first (preventScroll), then Lenis scrolls. */
export function useScrollToTarget() {
  const lenis = useLenis();
  return useCallback(
    (target: string | HTMLElement, opts: { focus?: string | HTMLElement; gap?: number } = {}) => {
      const el = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
      if (!el) return;
      const f = opts.focus ? (typeof opts.focus === "string" ? document.querySelector<HTMLElement>(opts.focus) : opts.focus) : el;
      f?.focus({ preventScroll: true });
      const offset = -(barHeight() + (opts.gap ?? 24));
      if (lenis) lenis.scrollTo(el, { offset, duration: 0.7, immediate: prefersReducedMotion() });
      else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset });
    },
    [lenis],
  );
}
