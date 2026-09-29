"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cx } from "@/lib/cx";
import type { Role } from "@/lib/types";
import { formatScore, type DisplayStatus } from "@/lib/view";
import { ScrollTrigger, useGSAP } from "@/components/motion/gsap";
import { barHeight } from "@/components/motion/scroll";
import { Status } from "@/components/status";
import { JumpLink } from "./jump-link";

/**
 * Name, score and status in the sticky bar once the identity header has scrolled under it.
 * Display only: it carries no decision buttons. A toggled state (200ms crossfade), never a scrub.
 */
export function RunningHead({ name, score, role, status }: { name: string; score: number | null | undefined; role: Role; status: DisplayStatus }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => setTarget(document.getElementById("bar-slot")), []);

  useGSAP(() => {
    const st = ScrollTrigger.create({
      trigger: "#identity",
      start: () => `bottom top+=${barHeight()}`,
      onEnter: () => setShown(true),
      onLeaveBack: () => setShown(false),
      invalidateOnRefresh: true,
    });
    return () => st.kill();
  });

  if (!target) return null;
  return createPortal(
    <div
      data-running-head
      inert={!shown}
      aria-hidden={!shown}
      className={cx(
        "hidden min-w-0 items-center gap-2 text-sm transition-opacity duration-[var(--duration-base)] ease-[var(--ease-out)] md:flex",
        shown ? "opacity-100" : "opacity-0",
      )}
    >
      <span className="truncate font-medium text-ink">{name}</span>
      {score !== null && score !== undefined ? (
        <>
          <span aria-hidden className="text-faint">
            ·
          </span>
          <span className="tnum shrink-0 text-ink-2">
            {formatScore(score)} {role}
          </span>
        </>
      ) : null}
      <Status status={status} className="shrink-0" />
      <JumpLink
        to="#decision"
        focus="#decision button"
        className="ml-2 inline-flex shrink-0 items-center gap-1 rounded-sm text-meta text-ink-2 underline decoration-line-strong underline-offset-4 transition-colors duration-[var(--duration-fast)] hover:text-ink"
      >
        Your decision <ArrowUp className="size-3" aria-hidden />
      </JumpLink>
    </div>,
    target,
  );
}
