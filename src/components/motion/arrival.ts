import type { CSSProperties } from "react";

/** Inline <head> script. It sets the first-arrival flag once per tab session when motion is allowed. */
export const ARRIVAL_GATE_SCRIPT =
  "try{var d=document.documentElement;if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches&&!sessionStorage.getItem('kh:arrived')){d.setAttribute('data-arrival','on');sessionStorage.setItem('kh:arrived','1')}}catch(e){}";

type ArriveKind = "rise" | "lift" | "row";

/** Spread onto the element: {...arrive("lift", { delay: 30 })}. Do not combine with an element's own style prop; wrap instead. */
export function arrive(kind: ArriveKind, o: { delay?: number; index?: number } = {}): { "data-arrive"?: ArriveKind; style?: CSSProperties } {
  if (kind === "row") return (o.index ?? 0) < 8 ? { "data-arrive": "row", style: { "--i": o.index ?? 0 } as CSSProperties } : {};
  return o.delay ? { "data-arrive": kind, style: { "--arrive-delay": `${o.delay}ms` } as CSSProperties } : { "data-arrive": kind };
}
