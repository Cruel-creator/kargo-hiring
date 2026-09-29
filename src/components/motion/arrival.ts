import type { CSSProperties } from "react";

/**
 * Inline <head> script, run before first paint when motion is allowed.
 * - data-arrival="on": the first-arrival flag, once per tab session.
 * - data-count-hold: set only on a candidate page whose score will count up (no kh:counted:<id> flag yet, no
 *   #fragment deep link). The score digits are held back only under this attribute (see detail/score-count), so
 *   pages where no count runs, and pages without JS, paint the final value at once.
 *   The id is the /candidates/<id> segment; the dev preview's ?c= is a suffix of a synthetic id, hence the suffix match.
 */
export const ARRIVAL_GATE_SCRIPT =
  "try{var d=document.documentElement;if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){" +
  "if(!sessionStorage.getItem('kh:arrived')){d.setAttribute('data-arrival','on');sessionStorage.setItem('kh:arrived','1')}" +
  "var p=location.pathname,m=p.match(/^\\/candidates\\/([^\\/]+)\\/?$/),c=m?decodeURIComponent(m[1]):p==='/dev/preview'?new URLSearchParams(location.search).get('c'):null;" +
  "if(c&&!location.hash){var h=0;for(var i=0;i<sessionStorage.length;i++){var k=sessionStorage.key(i)||'';if(k.indexOf('kh:counted:')===0&&k.slice(-c.length)===c){h=1;break}}" +
  "if(!h)d.setAttribute('data-count-hold','')}}}catch(e){}";

/** True while the head gate holds the score digits for a count (hard load only; cleared once the score decides). */
export const COUNT_HOLD_ATTR = "data-count-hold";

type ArriveKind = "rise" | "lift" | "row";

/** Spread onto the element: {...arrive("lift", { delay: 30 })}. Do not combine with an element's own style prop; wrap instead. */
export function arrive(kind: ArriveKind, o: { delay?: number; index?: number } = {}): { "data-arrive"?: ArriveKind; style?: CSSProperties } {
  if (kind === "row") return (o.index ?? 0) < 8 ? { "data-arrive": "row", style: { "--i": o.index ?? 0 } as CSSProperties } : {};
  return o.delay ? { "data-arrive": kind, style: { "--arrive-delay": `${o.delay}ms` } as CSSProperties } : { "data-arrive": kind };
}
