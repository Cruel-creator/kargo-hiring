"use client";
import { useEffect, useRef } from "react";
import { cx } from "@/lib/cx";
import { barHeight } from "@/components/motion/scroll";
import { FOG_STILL } from "./fog-still";

/**
 * The dashboard's one Vanta FOG: the image slot of the masthead's editorial split. Petrol-tinted, visibly alive,
 * never behind text, no pointer input of any kind. Runs while it is on screen; pauses off-screen and on a hidden tab.
 * Under reduced motion, below lg or without WebGL, the static petrol still below is shown and three is never imported.
 */

type VantaEffect = {
  req: number; prevNow?: number; el: HTMLElement; options: Record<string, unknown>;
  renderer: { dispose(): void; forceContextLoss(): void } | null;
  animationLoop(): number; resize(): void; destroy(): void;
};
type VantaFactory = (opts: Record<string, unknown>) => VantaEffect;

/** Petrol family. Mirrors src/app/globals.css: canvas #f7f6f3, accent-soft #e9f1ef, accent-line #b9d2cd; the lowlight is a derived petrol-grey. */
export const MASTHEAD_FOG = {
  canvas: 0xf7f6f3,
  accentSoft: 0xe9f1ef,
  accentLine: 0xb9d2cd,
  petrolGrey: 0x93b3ad,
} as const;

export const MASTHEAD_FOG_OPTIONS = {
  mouseControls: false, // hard rule: nothing follows the pointer
  touchControls: false,
  gyroControls: false,
  minHeight: 120,
  minWidth: 200,
  baseColor: MASTHEAD_FOG.canvas,
  lowlightColor: MASTHEAD_FOG.petrolGrey,
  midtoneColor: MASTHEAD_FOG.accentSoft,
  highlightColor: MASTHEAD_FOG.accentLine,
  blurFactor: 0.62,
  zoom: 0.85,
  speed: 0.6,
  scale: 2, // half resolution; the blur hides it
  scaleMobile: 3,
} as const;


const expose = (fx: VantaEffect | null) => {
  if (process.env.NODE_ENV !== "production") (window as unknown as { __khFog?: VantaEffect | null }).__khFog = fx;
};

/** after:hidden: the plate skips the foundation grain overlay, whose 160px tile seams show over the petrol mist. */
export function MastheadFog({ className, minViewport = 1024 }: { className?: string; minViewport?: number }) {
  const plate = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null); // dedicated empty host: Vanta's prepareEl never touches real content

  useEffect(() => {
    const el = host.current;
    const box = plate.current;
    if (!el || !box) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const wide = window.matchMedia(`(min-width: ${minViewport}px)`);
    let fx: VantaEffect | null = null;
    let cancelled = false, loading = false, onScreen = true;

    const state = (s: "still" | "live" | "off") => { box.dataset.fog = s; };
    const pause = () => { if (fx?.req) { cancelAnimationFrame(fx.req); fx.req = 0; } };
    const play = () => {
      if (!fx || fx.req || !onScreen || document.hidden) return;
      fx.prevNow = performance.now(); // no jump on resume
      fx.animationLoop();
    };
    const stop = () => {
      pause();
      if (fx) {
        const r = fx.renderer; // destroy() nulls it; vanta 0.5.24 never disposes the renderer itself
        fx.destroy();
        r?.dispose();
        r?.forceContextLoss();
        fx = null;
      }
      state("still");
      expose(null);
    };
    const start = async () => {
      if (fx || loading || reduce.matches || !wide.matches) return;
      loading = true;
      try {
        const [THREE, mod] = await Promise.all([import("three"), import("vanta/dist/vanta.fog.min")]);
        if (cancelled || reduce.matches || !wide.matches) return;
        const m = mod as unknown as { default?: { default?: unknown } | unknown };
        const FOG = [(m.default as { default?: unknown } | undefined)?.default, m.default, mod].find((f) => typeof f === "function") as VantaFactory | undefined;
        if (!FOG) throw new Error("FOG factory not found");
        fx = FOG({ el, THREE, ...MASTHEAD_FOG_OPTIONS }); // the constructor starts its own rAF loop
        state("live");
        expose(fx);
        if (!onScreen || document.hidden) pause();
      } catch {
        state("off"); // no WebGL: the still stays
      } finally {
        loading = false;
      }
    };

    const io = new IntersectionObserver(
      ([e]) => { onScreen = e.isIntersecting; if (onScreen) play(); else pause(); },
      { rootMargin: `-${Math.round(barHeight())}px 0px 0px 0px`, threshold: 0 }, // hidden under the bar counts as off-screen
    );
    const ro = new ResizeObserver(() => fx?.resize()); // masthead height changes without a window resize
    const onVis = () => (document.hidden ? pause() : play());
    const onMedia = () => (reduce.matches || !wide.matches ? stop() : void start());

    io.observe(el);
    ro.observe(el);
    document.addEventListener("visibilitychange", onVis);
    reduce.addEventListener("change", onMedia);
    wide.addEventListener("change", onMedia);
    void start();

    return () => {
      cancelled = true; // guards the Strict Mode double mount and unmount-before-import
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      reduce.removeEventListener("change", onMedia);
      wide.removeEventListener("change", onMedia);
      stop();
    };
  }, [minViewport]);

  return (
    <div ref={plate} aria-hidden data-fog="still" className={cx("fog after:hidden", className)} style={FOG_STILL}>
      <div ref={host} className="absolute inset-0" />
    </div>
  );
}
