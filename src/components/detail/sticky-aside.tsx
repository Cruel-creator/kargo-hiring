"use client";

import { useEffect, useRef, type HTMLAttributes } from "react";
import { cx } from "@/lib/cx";
import { barHeight } from "@/components/motion/scroll";

/**
 * CSS-sticky aside (no GSAP pin). If it fits, it sticks 24px under the bar; if it is taller than the
 * viewport, it sticks when its bottom is 24px from the viewport bottom.
 */
export function StickyAside({ children, className, ...rest }: HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = () => el.style.setProperty("--aside-top", `${Math.min(barHeight() + 24, window.innerHeight - el.offsetHeight - 24)}px`);
    const ro = new ResizeObserver(set); // edit mode, decisions and drafts change its height
    ro.observe(el);
    window.addEventListener("resize", set);
    set();
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", set);
    };
  }, []);
  return (
    <aside ref={ref} {...rest} className={cx("lg:sticky lg:self-start lg:top-[var(--aside-top,5rem)]", className)}>
      {children}
    </aside>
  );
}
