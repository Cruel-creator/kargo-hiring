import type { CSSProperties } from "react";

/**
 * The masthead plate's still: the same petrol light as the live FOG, painted by CSS. Shown on the server render,
 * under reduced motion, without WebGL and in the loading skeleton. Server-safe (no "use client").
 * Tones: petrol-grey #93b3ad, accent-soft #e9f1ef, accent-line #b9d2cd.
 */
export const FOG_STILL: CSSProperties = {
  background: [
    "radial-gradient(52% 64% at 72% 70%, rgb(147 179 173 / 0.55), rgb(147 179 173 / 0) 72%)",
    "radial-gradient(46% 56% at 38% 36%, rgb(233 241 239 / 0.95), rgb(233 241 239 / 0) 70%)",
    "radial-gradient(58% 78% at 94% 16%, rgb(185 210 205 / 0.75), rgb(185 210 205 / 0) 74%)",
  ].join(", "),
};
