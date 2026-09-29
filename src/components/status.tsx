import { Check } from "lucide-react";
import { cx } from "@/lib/cx";
import { REVIEW_LABEL, type DisplayStatus } from "@/lib/view";

/**
 * Status = shape + colour + always a text label. Never colour alone.
 * hollow ring: waiting on Arjun · filled dot: decided · check: sent · pulsing: screening
 */
const DOT: Record<DisplayStatus, string> = {
  review: "border border-muted bg-transparent",
  processing: "bg-faint animate-pulse-soft",
  failed: "bg-danger",
  shortlist: "bg-accent",
  hold: "bg-warn-dot",
  not_shortlisted: "bg-muted",
  email_ready: "border-[1.5px] border-accent bg-accent-soft",
  sent: "",
};

const TEXT: Record<DisplayStatus, string> = {
  review: "text-ink-2",
  processing: "text-muted",
  failed: "text-danger",
  shortlist: "text-accent",
  hold: "text-warn",
  not_shortlisted: "text-muted",
  email_ready: "text-accent",
  sent: "text-accent",
};

export function Status({ status, label, className }: { status: DisplayStatus; label?: string; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 text-sm font-medium whitespace-nowrap", TEXT[status], className)}>
      {status === "sent" ? (
        <Check className="size-3.5" strokeWidth={2.25} aria-hidden />
      ) : (
        <span className={cx("inline-block size-2 shrink-0 rounded-full", DOT[status])} aria-hidden />
      )}
      {label ?? REVIEW_LABEL[status]}
    </span>
  );
}

/** Five-segment bar: one segment per rubric point. Always paired with the number. */
export function ScoreSegments({ score, max = 5, className }: { score: number; max?: number; className?: string }) {
  return (
    <span className={cx("inline-flex gap-[3px]", className)} aria-hidden>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={cx("h-1.5 w-4 rounded-[2px]", i < score ? (score >= 4 ? "bg-accent" : "bg-ink-2") : "bg-line")} />
      ))}
    </span>
  );
}

/** Thin 0–100 track for the overall score in the list. Subtle; the number carries the meaning. */
export function ScoreTrack({ value, className }: { value: number | null; className?: string }) {
  return (
    <span className={cx("relative block h-[3px] w-14 overflow-hidden rounded-full bg-line", className)} aria-hidden>
      {value !== null ? <span className="absolute inset-y-0 left-0 rounded-full bg-ink-2" style={{ width: `${Math.max(2, Math.min(100, value))}%` }} /> : null}
    </span>
  );
}
