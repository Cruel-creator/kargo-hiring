"use client";

import { animate } from "motion/react";
import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { COUNT_HOLD_ATTR } from "@/components/motion/arrival";
import { cx } from "@/lib/cx";
import { formatScore } from "@/lib/view";

const noop = () => () => {};
/** How long a server-rendered page keeps the digits back while it waits for JS to take over. Without JS they simply appear. */
const GUARD_MS = 500;

/**
 * The one big number. It counts up once, on the first view of this candidate in the tab session (~700ms).
 * - The final value is always in the DOM: SSR prints it, and screen readers only ever hear it.
 * - Soft navigation: the count starts before first paint, so the final value never flashes first.
 * - Hard load: the <head> gate (motion/arrival) sets data-count-hold only when a count will run (no session flag,
 *   no #fragment, motion allowed). Only then are the digits held back, for at most GUARD_MS, by CSS. If hydration
 *   lands inside that window the count runs; if not, the final value is already showing and stays static.
 *   Without the attribute (already counted, deep link, reduced motion, no JS) the final value paints at once.
 */
export function ScoreCount({ value, id, className }: { value: number | null; id: string; className?: string }) {
  const hydrating = useSyncExternalStore(noop, () => false, () => true);
  const fromServer = useRef(hydrating).current; // true only for the instance hydrated from server HTML
  // Read once, at hydration: the effect clears the attribute, and a Strict Mode re-run must see the same answer.
  const held = useRef(fromServer && typeof document !== "undefined" && document.documentElement.hasAttribute(COUNT_HOLD_ATTR)).current;
  const [shown, setShown] = useState<number | null>(null); // null: print the final value
  const [counting, setCounting] = useState(false);

  useLayoutEffect(() => {
    document.documentElement.removeAttribute(COUNT_HOLD_ATTR); // decided below: count, or show the final value now
    if (value === null || value <= 0) return;
    const key = `kh:counted:${id}`;
    try {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || sessionStorage.getItem(key)) return;
    } catch {
      return;
    }
    if (fromServer) {
      if (!held) return; // the gate saw no count coming (e.g. a deep link): the final value is already painted
      const fcp = performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? 0;
      if (performance.now() - fcp > GUARD_MS - 80) return; // the digits are already on screen: do not replay them
    }
    setCounting(true);
    setShown(0);
    const controls = animate(0, value, {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setShown(Math.round(v)),
      onComplete: () => {
        setShown(null);
        try {
          sessionStorage.setItem(key, "1");
        } catch {}
      },
    });
    return () => controls.stop();
  }, [value, id, fromServer, held]);

  const final = formatScore(value);
  return (
    <span data-score className={cx("tnum", className)}>
      {/* A ghost of the final value holds the width, so nothing beside the number moves while it counts. */}
      <span aria-hidden className={cx("inline-grid", fromServer && !counting && "[html[data-count-hold]_&]:animate-[kh-fade_1ms_linear_500ms_backwards]")}>
        <span className="invisible col-start-1 row-start-1">{final}</span>
        <span className="col-start-1 row-start-1">{shown === null ? final : shown}</span>
      </span>
      <span className="sr-only">{final}</span>
    </span>
  );
}
