import { cx } from "@/lib/cx";
import type { DisplayStatus } from "@/lib/view";

/** Initials from a display name. Unnamed candidates get no letters (a dashed ring), never invented ones. */
export function initials(name: string | null | undefined): string {
  if (!name || name === "Unnamed candidate") return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/**
 * ATS identity mark: initials on a neutral tint. Shortlisted candidates carry a petrol ring (shape, alongside the
 * status label, never instead of it). Decorative: the name is always printed next to it.
 */
export function Monogram({ name, status, size = "sm", className }: { name: string; status?: DisplayStatus; size?: "sm" | "lg"; className?: string }) {
  const text = initials(name);
  const ring = status === "shortlist";
  return (
    <span
      aria-hidden
      data-monogram
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-[0.01em] select-none",
        size === "lg" ? "size-10 text-sm sm:size-11 sm:text-[15px]" : "size-7 text-[11px]",
        text ? "bg-selected text-ink-2" : "border border-dashed border-line-strong bg-transparent",
        ring && (size === "lg" ? "ring-2 ring-accent ring-offset-2 ring-offset-canvas" : "ring-[1.5px] ring-accent"),
        className,
      )}
    >
      {text}
    </span>
  );
}
