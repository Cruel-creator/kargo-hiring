import type { CSSProperties } from "react";
import { cx } from "@/lib/cx";
import type { EmailType } from "@/lib/types";
import type { DisplayStatus } from "@/lib/view";

type State = "done" | "current" | "todo";
interface Step {
  label: string;
  state: State;
  /** danger: screening failed. closed: the not-shortlisted end, drawn neutral, never petrol. */
  tone?: "danger" | "closed";
  sr: string;
}

const done = (label: string): Step => ({ label, state: "done", sr: "done" });
const todo = (label: string): Step => ({ label, state: "todo", sr: "not yet" });

/**
 * The steps for one candidate, from real fields only: the display status (which already folds in
 * processing_status and email_sent) and the email type on the result.
 * - Contacted is done only once an interview invite has actually been sent; a drafted or ready invite keeps
 *   Decision as the current step.
 * - A not-shortlisted candidate ends on a neutral "Not shortlisted" step, with no Contacted step after it.
 */
function stepsFor(status: DisplayStatus, emailType: EmailType | null): Step[] {
  const rejection = status === "not_shortlisted" || ((status === "email_ready" || status === "sent") && emailType === "rejection");
  if (rejection) {
    const sent = status === "sent";
    return [
      done("Applied"),
      done("Screened"),
      done("Review"),
      { label: "Not shortlisted", state: sent ? "done" : "current", tone: "closed", sr: sent ? "closed, rejection sent" : "rejection not sent yet" },
    ];
  }
  switch (status) {
    case "processing":
      return [done("Applied"), { label: "Screening", state: "current", sr: "in progress" }, todo("Review"), todo("Decision"), todo("Contacted")];
    case "failed":
      return [done("Applied"), { label: "Screening failed", state: "current", tone: "danger", sr: "needs attention" }, todo("Review"), todo("Decision"), todo("Contacted")];
    case "review":
      return [done("Applied"), done("Screened"), { label: "Review", state: "current", sr: "waiting on your decision" }, todo("Decision"), todo("Contacted")];
    case "hold":
      return [done("Applied"), done("Screened"), done("Review"), { label: "On hold", state: "current", sr: "decision pending" }, todo("Contacted")];
    case "shortlist":
      return [done("Applied"), done("Screened"), done("Review"), { label: "Invite drafted", state: "current", sr: "shortlisted, invite not sent" }, todo("Contacted")];
    case "email_ready":
      return [done("Applied"), done("Screened"), done("Review"), { label: "Invite ready", state: "current", sr: "shortlisted, invite ready to send" }, todo("Contacted")];
    case "sent":
    default:
      return [done("Applied"), done("Screened"), done("Review"), done("Shortlisted"), { label: "Contacted", state: "done", sr: "invite sent" }];
  }
}

/**
 * Where this candidate is in the pipeline. Shape, colour and a text label on every step:
 * done is a filled petrol dot, the current step is ringed, future steps are hollow and muted.
 * The not-shortlisted end is a neutral grey dot: closed, not a success. Draws in on arrival (CSS, see motion-styles).
 */
export function StageTracker({ status, emailType = null, className }: { status: DisplayStatus; emailType?: EmailType | null; className?: string }) {
  const steps = stepsFor(status, emailType);
  return (
    <ol data-stage-tracker aria-label="Hiring stage" className={cx("flex w-full items-start text-label sm:w-auto sm:items-center sm:text-meta", className)}>
      {steps.map((step, i) => {
        const { state, tone } = step;
        const s = { "--s": i } as CSSProperties;
        const reached = state !== "todo";
        return (
          <li key={step.label} className="relative flex flex-1 flex-col items-center sm:flex-none sm:flex-row" aria-current={state === "current" ? "step" : undefined}>
            {i > 0 ? (
              <span aria-hidden className="absolute top-[5.5px] right-1/2 block h-px w-full bg-line-strong sm:static sm:mx-2 sm:w-5">
                {reached ? <span data-stage-line style={s} className={cx("block h-px w-full", tone === "closed" ? "bg-muted" : "bg-accent")} /> : null}
              </span>
            ) : null}
            <span className="relative flex flex-col items-center gap-1 sm:flex-row sm:gap-1.5">
              <span aria-hidden data-stage-dot style={s} className="grid size-3 place-items-center rounded-full bg-canvas">
                {state === "done" ? (
                  <span className={cx("size-2 rounded-full", tone === "closed" ? "bg-muted" : "bg-accent")} />
                ) : state === "current" ? (
                  <span className={cx("grid size-3 place-items-center rounded-full border-[1.5px] bg-canvas", tone === "danger" ? "border-danger" : tone === "closed" ? "border-muted" : "border-accent")}>
                    <span className={cx("size-1 rounded-full", tone === "danger" ? "bg-danger" : tone === "closed" ? "bg-muted" : "bg-accent")} />
                  </span>
                ) : (
                  <span className="size-2 rounded-full border border-line-strong bg-canvas" />
                )}
              </span>
              <span
                data-stage-label
                style={s}
                className={cx(
                  "text-center leading-tight sm:whitespace-nowrap sm:leading-[inherit]",
                  state === "done" && (tone === "closed" ? "font-medium text-ink-2" : "text-ink-2"),
                  state === "current" && (tone === "danger" ? "font-medium text-danger" : "font-medium text-ink"),
                  state === "todo" && "text-muted",
                )}
              >
                {step.label}
                <span className="sr-only">, {step.sr}</span>
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
