"use client";
import { useEffect, useRef } from "react";
import { cx } from "@/lib/cx";
import { PALETTE_HEX } from "./palette";
import { barHeight } from "./scroll";

type VantaEffect = {
  req: number; prevNow?: number; el: HTMLElement; options: Record<string, unknown>;
  renderer: { dispose(): void; forceContextLoss(): void } | null;
  animationLoop(): number; resize(): void; destroy(): void;
};
type VantaFactory = (opts: Record<string, unknown>) => VantaEffect;

export const FOG_OPTIONS = {
  mouseControls: false,          // hard rule: nothing follows the pointer
  touchControls: false,
  gyroControls: false,
  minHeight: 120,
  minWidth: 200,
  baseColor: PALETTE_HEX.canvas,         // --color-canvas
  lowlightColor: PALETTE_HEX.lineStrong, // --color-line-strong: the depth that makes it perceptible
  midtoneColor: PALETTE_HEX.selected,    // --color-selected
  highlightColor: PALETTE_HEX.surface,   // --color-surface
  blurFactor: 0.7,
  zoom: 0.7,
  speed: 0.35,                   // <= 0.4
  scale: 2,                      // half resolution; the blur hides it
  scaleMobile: 3,                // >= 2
} as const;
const REST_MS = 12_000;          // comes to rest after 12s: a still while he reads

const expose = (fx: VantaEffect | null) => {
  if (process.env.NODE_ENV !== "production") (window as unknown as { __khFog?: VantaEffect | null }).__khFog = fx;
};

export function Fog({ className, minViewport = 1280 }: { className?: string; minViewport?: number }) {
  const plate = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null); // dedicated empty host: Vanta's prepareEl never touches real content

  useEffect(() => {
    const el = host.current;
    const box = plate.current;
    if (!el || !box) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const wide = window.matchMedia(`(min-width: ${minViewport}px)`);
    let fx: VantaEffect | null = null;
    let cancelled = false, loading = false, onScreen = true, rest = 0;

    const state = (s: "still" | "live" | "off") => { box.dataset.fog = s; };
    const pause = () => { window.clearTimeout(rest); if (fx?.req) { cancelAnimationFrame(fx.req); fx.req = 0; } };
    const play = () => {
      if (!fx || fx.req || !onScreen || document.hidden) return;
      fx.prevNow = performance.now(); // no jump on resume
      fx.animationLoop();
      window.clearTimeout(rest);
      rest = window.setTimeout(pause, REST_MS);
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
      if (fx || loading || reduce.matches || !wide.matches) return; // reduced motion or below xl: never import three
      loading = true;
      try {
        const [THREE, mod] = await Promise.all([import("three"), import("vanta/dist/vanta.fog.min")]);
        if (cancelled || reduce.matches || !wide.matches) return;
        const m = mod as unknown as { default?: { default?: unknown } | unknown };
        const FOG = [(m.default as { default?: unknown } | undefined)?.default, m.default, mod].find(
          (f) => typeof f === "function",
        ) as VantaFactory | undefined; // UMD bundle: the factory can sit at any of these depths
        if (!FOG) throw new Error("FOG factory not found");
        fx = FOG({ el, THREE, ...FOG_OPTIONS }); // the constructor starts its own rAF loop
        state("live");
        expose(fx);
        window.clearTimeout(rest);
        rest = window.setTimeout(pause, REST_MS);
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
    <div ref={plate} aria-hidden data-fog="still" className={cx("fog", className)}>
      <div ref={host} className="absolute inset-0" />
    </div>
  );
}
