"use client";

import { useEffect, useRef, useSyncExternalStore, type RefObject } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/components/motion/gsap";

/*
 * Dashboard entrances: the pipeline draw-in, the ranked rows' rise, score tracks filling and numbers counting up.
 *
 * Nothing is ever hidden by JS on server-painted content. There are three paths:
 * 1. First document load of a session (html[data-arrival="on"], set by the head script before first paint):
 *    pure CSS keyframes below, running from first paint and completing on their own even if JS never loads.
 * 2. Client render (a soft navigation to the dashboard): nothing has been painted yet, so GSAP sets the from-state
 *    in a layout effect and plays it.
 * 3. A later hard load in the same session: server-painted content is left alone.
 * Rows below the fold rise with ScrollTrigger.batch as they enter, in every path. They are never pre-hidden:
 * the from-state is applied at the moment a row's top crosses the viewport's bottom edge.
 * Under reduced motion none of this runs (GSAP sits in matchMedia; the global rule zeroes CSS durations).
 */

const noop = () => () => {};

/** "server" when this tree was hydrated from HTML the browser already painted; "client" when a soft navigation rendered it. */
export function useFirstPaint(): "server" | "client" {
  const client = useSyncExternalStore(noop, () => true, () => false);
  const first = useRef<"server" | "client">(client ? "client" : "server");
  return first.current;
}

export type Entrance = "server" | "client" | "none";

/**
 * The dashboard's entrance, decided once when it mounts: "server" or "client" on its first render, then "none",
 * so view switches and poll refreshes (which re-render or re-key children) never replay it.
 */
export function useEntrance(): Entrance {
  const hydrated = useFirstPaint();
  // A client render can still land on painted content: React client-renders a streamed Suspense boundary that
  // received a context update (Lenis mounting) before it hydrated. The server's masthead is then still in the DOM.
  const paint = useRef<"server" | "client" | null>(null);
  if (paint.current === null) paint.current = hydrated === "client" && typeof document !== "undefined" && document.querySelector("[data-masthead]") ? "server" : hydrated;
  const entered = useRef(false);
  useEffect(() => {
    entered.current = true;
  }, []);
  // Read during render on purpose: false only for the mounting render.
  return entered.current ? "none" : paint.current;
}

export const arrivalOn = () => document.documentElement.getAttribute("data-arrival") === "on";

export const EASE_OUT = "power2.out";

/** Server-painted first arrival: JS may take over the count-ups only while the CSS still holds the digits back. */
export const canTakeOverCounts = () => arrivalOn() && performance.now() < 850;

const CSS = `
@keyframes kh-row-in { from { opacity: 0; transform: translateY(8px); } }
@keyframes kh-fill { from { transform: scaleX(0); } }
[data-fill] { transform-origin: 0 50%; }
/* Digits wait for the count-up; if JS is late or absent they fade in at their final value on their own. */
:root[data-arrival="on"] [data-count] > span > [aria-hidden] { animation: kh-fade 200ms ease-out 900ms backwards; }
:root[data-arrival="on"] [data-enter="row"] { animation: kh-row-in 400ms cubic-bezier(0.22, 1, 0.36, 1) calc(140ms + var(--i, 0) * 40ms) backwards; }
:root[data-arrival="on"] [data-enter="stage"] [data-fill] { animation: kh-fill 360ms cubic-bezier(0.16, 1, 0.3, 1) calc(60ms + var(--i, 0) * 60ms) backwards; }
:root[data-arrival="on"] [data-enter="row"] [data-fill] { animation: kh-fill 600ms cubic-bezier(0.16, 1, 0.3, 1) calc(220ms + var(--i, 0) * 40ms) backwards; }
`;

/** Rendered once by the dashboard. React hoists and de-duplicates it into <head>, so it is in the server HTML. */
export function EntranceStyles() {
  return (
    <style href="kh-dashboard-entrance" precedence="default">
      {CSS}
    </style>
  );
}

/**
 * Ranked rows: a staggered rise (y 8px to 0, 40ms stagger, 400ms, ease-out), score tracks filling and scores
 * counting up. In-view rows play at mount on a client render; rows below the fold play as they enter.
 */
export function useRowEntrance(scope: RefObject<HTMLElement | null>, selector: string, entrance: Entrance, rowsKey: string) {
  useGSAP(
    () => {
      const el = scope.current;
      // A new row set (view switch, filter, search) reverts any pending rise, and by then entrance is "none",
      // so nothing replays: the rows are simply there.
      if (!el || entrance === "none") return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const rows = Array.from(el.querySelectorAll<HTMLElement>(selector));
        if (!rows.length || !el.getClientRects().length) return; // the other layout (table vs stack) is display:none
        const vh = window.innerHeight;
        const inView = rows.filter((r) => r.getBoundingClientRect().top < vh);
        const below = rows.filter((r) => r.getBoundingClientRect().top >= vh);
        const play = (batch: Element[], base = 0) => {
          if (!batch.length) return;
          gsap.fromTo(batch, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4, ease: EASE_OUT, stagger: 0.04, delay: base, clearProps: "opacity,transform" });
          batch.forEach((r, i) => {
            const fills = r.querySelectorAll("[data-fill]");
            if (fills.length) gsap.fromTo(fills, { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: "expo.out", delay: base + 0.08 + i * 0.04, clearProps: "transform" });
            r.querySelectorAll("[data-count]").forEach((c) => countIn(c, base + i * 0.04, 0.6));
          });
        };
        if (entrance === "client") play(inView, 0.1);
        else if (canTakeOverCounts()) inView.forEach((r, i) => r.querySelectorAll("[data-count]").forEach((c) => countIn(c, 0.14 + i * 0.04, 0.6)));
        if (below.length) ScrollTrigger.batch(below, { start: "top bottom", once: true, interval: 0.06, onEnter: (b) => play(b) });
      });
      return () => mm.revert();
    },
    { scope, dependencies: [rowsKey], revertOnUpdate: true },
  );
}

/**
 * Count a CountUp's visible digits up from 0, in place, once. The final value stays in the DOM (the sr-only copy
 * and data-count), and React's text node is reused, so a later poll update still lands.
 */
export function countIn(host: Element, delay = 0, duration = 0.6): gsap.core.Tween | null {
  const el = host as HTMLElement;
  const node = el.querySelector("[aria-hidden]")?.firstChild;
  const final = Number(el.dataset.count);
  if (!node || !Number.isFinite(final)) return null;
  (node.parentElement as HTMLElement).style.animation = "none"; // take over from the CSS wait
  if (final === 0) return null;
  const o = { v: 0 };
  node.nodeValue = "0";
  return gsap.to(o, {
    v: final,
    duration,
    delay,
    ease: EASE_OUT,
    onUpdate: () => {
      node.nodeValue = String(Math.round(o.v));
    },
    onComplete: () => {
      node.nodeValue = String(Number(el.dataset.count));
    },
  });
}
