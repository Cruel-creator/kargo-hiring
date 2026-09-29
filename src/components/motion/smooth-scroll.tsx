"use client";
import { ReactLenis, useLenis, type LenisRef } from "lenis/react";
import type { LenisOptions } from "lenis";
import { MotionConfig } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { gsap, ScrollTrigger } from "./gsap";

export const LENIS_OPTIONS: LenisOptions = {
  autoRaf: false,             // driven by gsap.ticker below, so ScrollTrigger reads the same frame
  lerp: 0.13,                 // subtle: settles in about 250ms, never floaty
  smoothWheel: true,
  syncTouch: false,           // phones keep native momentum
  wheelMultiplier: 1,
  touchMultiplier: 1,
  anchors: false,             // in-page jumps are explicit (useScrollToTarget); the skip link stays native
  allowNestedScroll: false,   // nested scrollers are declared with data-lenis-prevent*
  stopInertiaOnNavigate: true,
  autoResize: true,
  overscroll: true,
  respectReducedMotion: true, // kept on
};

const syncScrollTrigger = () => ScrollTrigger.update();
const releaseArrival = () => document.documentElement.removeAttribute("data-arrival");

export function SmoothScroll({ children }: { children: ReactNode }) {
  const ref = useRef<LenisRef>(null);
  useEffect(() => {
    // Read the instance lazily on every tick. ReactLenis creates it in its own effect and exposes it
    // through useImperativeHandle, so it is still undefined when this effect first runs.
    const tick = (time: number) => ref.current?.lenis?.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => gsap.ticker.remove(tick);
  }, []);
  return (
    <ReactLenis root ref={ref} options={LENIS_OPTIONS}>
      <MotionConfig reducedMotion="user">
        <ScrollSync />
        {children}
      </MotionConfig>
    </ReactLenis>
  );
}

function ScrollSync() {
  useLenis(syncScrollTrigger); // subscribes as soon as the instance exists
  const path = usePathname();
  const first = useRef(true);
  useEffect(() => {
    const raf = requestAnimationFrame(() => ScrollTrigger.refresh());
    if (first.current) {
      first.current = false;
      const t = window.setTimeout(releaseArrival, 1000); // first arrival is over by 700ms
      return () => { cancelAnimationFrame(raf); clearTimeout(t); };
    }
    releaseArrival(); // any soft navigation: arrivals are over for this session
    return () => cancelAnimationFrame(raf);
  }, [path]);
  useEffect(() => { document.fonts?.ready.then(() => ScrollTrigger.refresh()); }, []);
  return null;
}
