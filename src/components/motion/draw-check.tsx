"use client";
import { motion } from "motion/react";

/** A check that draws itself only when `play` is true (a state change this session). Otherwise it is static. */
export function DrawCheck({ play = false, className, strokeWidth = 2.25 }: { play?: boolean; className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <motion.path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
        initial={play ? { pathLength: 0 } : false}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}
