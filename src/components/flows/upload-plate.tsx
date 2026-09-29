"use client";

import { useEffect, useRef } from "react";
import { Fog } from "@/components/motion/fog";
import "./flows.css";

/** Petrol-tinted paper light for the Upload plate. Palette tokens only (see globals.css). */
const PETROL = {
  baseColor: 0xf7f6f3, // --color-canvas
  lowlightColor: 0xb9d2cd, // --color-accent-line: the depth that makes the tint read
  midtoneColor: 0xe9f1ef, // --color-accent-soft
  highlightColor: 0xb9d2cd, // --color-accent-line
} as const;

type LiveFog = { el?: HTMLElement; options?: Record<string, unknown>; updateUniforms?: () => void };

/**
 * The Upload hero's image slot: the shared Fog (same lifecycle: xl and up, rests after 12s, paused
 * off-screen, never imported under reduced motion, no pointer controls), re-tinted petrol.
 * Fog takes no colour options, so once its plate reports "live" we update that one instance's
 * colour uniforms through Vanta's own options + updateUniforms path. The still (SSR, reduced
 * motion, below xl) is the matching petrol gradient from flows.css. No text ever sits on it.
 */
export function UploadPlate({ className }: { className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const plate = wrap.current?.querySelector<HTMLElement>(".fog");
    if (!plate) return;
    const tint = () => {
      if (plate.dataset.fog !== "live") return;
      const fx = (window as unknown as { VANTA?: { current?: LiveFog } }).VANTA?.current;
      if (!fx?.el || !fx.options || !plate.contains(fx.el)) return; // only ever our own instance
      Object.assign(fx.options, PETROL);
      fx.updateUniforms?.();
    };
    const mo = new MutationObserver(tint);
    mo.observe(plate, { attributes: true, attributeFilter: ["data-fog"] });
    tint();
    return () => mo.disconnect();
  }, []);
  return (
    <div ref={wrap} aria-hidden className={className}>
      <Fog className="kh-fog-petrol absolute inset-0" />
    </div>
  );
}
