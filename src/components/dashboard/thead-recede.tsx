"use client";

import { useEffect, useState, type RefObject } from "react";
import GradualBlur from "@/components/bits/GradualBlur";
import { ScrollTrigger } from "@/components/motion/gsap";
import { barHeight } from "@/components/motion/scroll";
import { cx } from "@/lib/cx";

/** The one backdrop blur in the app: a 24px recede under the sticky table head, shown only while the head is stuck. A state, not an animation. */
export function TheadRecede({ wrap }: { wrap: RefObject<HTMLDivElement | null> }) {
  const [box, setBox] = useState<{ top: number; left: number; width: number } | null>(null);
  const [on, setOn] = useState(false);
  // A passive effect, not a layout effect: this component renders inside `wrap`, whose ref is attached only after
  // its children's layout effects have run.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const headH = () => el.querySelector("thead")?.getBoundingClientRect().height ?? 36;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setBox({ top: barHeight() + headH(), left: r.left, width: r.width });
    };
    const st = ScrollTrigger.create({
      trigger: el,
      start: () => `top top+=${barHeight()}`, // the head is stuck
      end: () => `bottom top+=${barHeight() + headH() + 24}`,
      onToggle: (s) => setOn(s.isActive),
      onRefresh: measure,
      invalidateOnRefresh: true,
    });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    measure();
    setOn(st.isActive);
    return () => {
      st.kill();
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [wrap]);
  if (!box || box.width === 0) return null;
  return (
    <div
      aria-hidden
      className={cx("pointer-events-none fixed z-20 h-6 transition-opacity duration-[var(--duration-base)]", on ? "opacity-100" : "opacity-0")}
      style={{ top: box.top, left: box.left, width: box.width }}
    >
      <GradualBlur position="top" height="1.5rem" strength={1} divCount={3} curve="ease-out" />
    </div>
  );
}
