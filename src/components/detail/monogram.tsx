import { User } from "lucide-react";
import { cx } from "@/lib/cx";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/** Initials on a neutral tint. No photos. A petrol ring marks a shortlisted candidate. */
export function Monogram({ name, shortlisted, className }: { name: string | null; shortlisted: boolean; className?: string }) {
  const text = name ? initials(name) : "";
  return (
    <span
      aria-hidden
      className={cx(
        "grid shrink-0 place-items-center rounded-full bg-selected font-semibold tracking-[-0.01em] text-ink-2 select-none",
        shortlisted ? "ring-2 ring-accent ring-offset-2 ring-offset-canvas" : "ring-1 ring-inset ring-line-strong",
        className,
      )}
    >
      {text || <User className="size-1/2 text-muted" aria-hidden />}
    </span>
  );
}
