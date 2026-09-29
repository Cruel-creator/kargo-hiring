import type { CSSProperties } from "react";
import { cx } from "@/lib/cx";
import type { DisplayStatus } from "@/lib/view";

const STEPS = ["Applied", "Screened", "Review", "Decision", "Contacted"] as const;

/** Index of the step in progress (STEPS.length when everything is done). */
function currentStep(status: DisplayStatus): number {
  switch (status) {
    case "processing":
    case "failed":
      return 1; // being screened, or screening needs attention
    case "review":
      return 2; // waiting on the founder
    case "hold":
      return 3; // a decision is pending
    case "shortlist":
    case "not_shortlisted":
    case "email_ready":
      return 4; // decided; the email has not gone yet
    case "sent":
      return STEPS.length;
  }
}

/**
 * Where this candidate is in the pipeline. Shape, colour and a text label on every step:
 * done is a filled petrol dot, the current step is ringed, future steps are hollow and muted.
 * Draws in on arrival (CSS, see motion-styles).
 */
export function StageTracker({ status, className }: { status: DisplayStatus; className?: string }) {
  const at = currentStep(status);
  const failed = status === "failed";
  return (
    <ol data-stage-tracker aria-label="Hiring stage" className={cx("flex w-full items-start text-label sm:w-auto sm:items-center sm:text-meta", className)}>
      {STEPS.map((label, i) => {
        const state = i < at ? "done" : i === at ? "current" : "todo";
        const s = { "--s": i } as CSSProperties;
        return (
          <li key={label} className="relative flex flex-1 flex-col items-center sm:flex-none sm:flex-row" aria-current={state === "current" ? "step" : undefined}>
            {i > 0 ? (
              <span aria-hidden className="absolute top-[5.5px] right-1/2 block h-px w-full bg-line-strong sm:static sm:mx-2 sm:w-5">
                {i <= at ? <span data-stage-line style={s} className="block h-px w-full bg-accent" /> : null}
              </span>
            ) : null}
            <span className="relative flex flex-col items-center gap-1 sm:flex-row sm:gap-1.5">
              <span aria-hidden data-stage-dot style={s} className="grid size-3 place-items-center rounded-full bg-canvas">
                {state === "done" ? (
                  <span className="size-2 rounded-full bg-accent" />
                ) : state === "current" ? (
                  <span className={cx("grid size-3 place-items-center rounded-full border-[1.5px] bg-canvas", failed ? "border-danger" : "border-accent")}>
                    <span className={cx("size-1 rounded-full", failed ? "bg-danger" : "bg-accent")} />
                  </span>
                ) : (
                  <span className="size-2 rounded-full border border-line-strong bg-canvas" />
                )}
              </span>
              <span
                data-stage-label
                style={s}
                className={cx(
                  "whitespace-nowrap",
                  state === "done" && "text-ink-2",
                  state === "current" && (failed ? "font-medium text-danger" : "font-medium text-ink"),
                  state === "todo" && "text-muted",
                )}
              >
                {label}
                <span className="sr-only">{state === "done" ? ", done" : state === "current" ? (failed ? ", needs attention" : ", in progress") : ", not yet"}</span>
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
