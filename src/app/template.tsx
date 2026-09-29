import type { ReactNode } from "react";

/**
 * A quiet route transition: each navigation remounts this wrapper and its content lifts in (opacity 0 to 1,
 * 6px, 250ms, ease-out). Pure CSS on server-rendered content, so it needs no JS and cannot leave anything hidden;
 * the global reduced-motion rule reduces it to nothing. `backwards` fill: no transform remains afterwards,
 * so sticky and fixed descendants behave normally once it ends.
 */
export default function Template({ children }: { children: ReactNode }) {
  return <div style={{ animation: "kh-lift 250ms var(--ease-out) backwards" }}>{children}</div>;
}
