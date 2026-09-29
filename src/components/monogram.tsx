import { User } from "lucide-react";
import { cx } from "@/lib/cx";
import type { EmailType } from "@/lib/types";
import type { DisplayStatus } from "@/lib/view";

/** Initials from a display name. Unnamed candidates get no letters, never invented ones. */
export function initials(name: string | null | undefined): string {
  if (!name || name === "Unnamed candidate") return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/** Shortlisted for the ring: the decision is shortlist, or an interview invite is ready or sent. */
export function isShortlisted(status: DisplayStatus, emailType: EmailType | null | undefined): boolean {
  return status === "shortlist" || ((status === "email_ready" || status === "sent") && emailType === "interview");
}

const SIZE = {
  sm: "size-7 text-[11px]",
  lg: "size-10 text-sm sm:size-11 sm:text-[15px]",
  xl: "size-11 text-sm sm:size-14 sm:text-base",
} as const;

/**
 * ATS identity mark, one component for the dashboard and the detail page. Initials on a neutral tint, no photos.
 * Shortlisted candidates carry a petrol ring drawn inside the circle (an inset shadow), so the mark's box never
 * grows and nothing beside it moves. The ring is shape, alongside the status label, never instead of it.
 * Unnamed candidates: a dashed outline with a person glyph. Decorative: the name is always printed next to it.
 */
export function Monogram({ name, shortlisted = false, size = "sm", className }: { name: string | null | undefined; shortlisted?: boolean; size?: keyof typeof SIZE; className?: string }) {
  const text = initials(name);
  return (
    <span
      aria-hidden
      data-monogram
      className={cx(
        "inline-grid shrink-0 place-items-center rounded-full font-semibold tracking-[0.01em] select-none",
        SIZE[size],
        text ? "bg-selected text-ink-2" : "border border-dashed border-line-strong bg-transparent text-muted",
        shortlisted &&
          (size === "sm"
            ? "shadow-[inset_0_0_0_1.5px_var(--color-accent)]"
            : "shadow-[inset_0_0_0_2px_var(--color-accent),inset_0_0_0_4px_var(--color-canvas)]"),
        className,
      )}
    >
      {text || <User className="size-1/2" strokeWidth={1.75} aria-hidden />}
    </span>
  );
}
