"use client";

import { Check, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import { FAILED_STATUSES, type ProcessingStatus } from "@/lib/types";
import { PIPELINE_STEPS, stepIndex } from "@/lib/view";
import { api } from "./candidate-actions";
import { Button } from "./ui";

const FAILURE_COPY: Partial<Record<ProcessingStatus, string>> = {
  extraction_failed: "We couldn't process this CV.",
  scoring_failed: "Scoring didn't finish.",
  generation_failed: "The brief or email draft didn't finish.",
};

/** Calm step sequence. Polls status while running; offers Retry on failure. */
export function ProcessingSteps({ status }: { status: ProcessingStatus }) {
  const current = stepIndex(status);
  const failed = FAILED_STATUSES.includes(status);
  return (
    <ol className="flex flex-col gap-2.5" aria-label="Screening progress">
      {PIPELINE_STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current && !failed;
        const broke = i === current && failed;
        return (
          <li key={s.label} className="flex items-center gap-2.5 text-sm" aria-current={active ? "step" : undefined}>
            <span
              className={cx(
                "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-[var(--duration-base)]",
                done && "border-accent bg-accent text-white",
                active && "border-accent",
                broke && "border-danger",
                !done && !active && !broke && "border-line-strong",
              )}
              aria-hidden
            >
              {done ? <Check className="size-2.5" strokeWidth={3} /> : active ? <span className="size-1.5 animate-pulse-soft rounded-full bg-accent" /> : null}
            </span>
            <span className={cx(done ? "text-ink-2" : active ? "font-medium text-ink" : broke ? "font-medium text-danger" : "text-muted")}>
              {s.label}
              <span className="sr-only">{done ? " (done)" : active ? " (in progress)" : broke ? " (failed)" : ""}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function useStatusPoll(id: string, initial: ProcessingStatus, onChange?: (s: ProcessingStatus, err: string | null) => void) {
  const [status, setStatus] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const cb = useRef(onChange);
  cb.current = onChange;
  useEffect(() => setStatus(initial), [initial]);
  useEffect(() => {
    const running = !FAILED_STATUSES.includes(status) && status !== "ready_for_review" && status !== "sent";
    if (!running) return;
    const t = setInterval(async () => {
      try {
        const s = await api<{ processing_status: ProcessingStatus; error_message: string | null }>(`/api/candidates/${id}/status`);
        if (s.processing_status !== status) {
          setStatus(s.processing_status);
          setError(s.error_message);
          cb.current?.(s.processing_status, s.error_message);
        }
      } catch {
        /* transient; keep polling */
      }
    }, 2000);
    return () => clearInterval(t);
  }, [id, status]);
  return { status, error };
}

export function ProcessingPanel({ id, status: initial, error: initialError }: { id: string; status: ProcessingStatus; error: string | null }) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const { status, error } = useStatusPoll(id, initial, (s) => {
    if (s === "ready_for_review" || FAILED_STATUSES.includes(s)) router.refresh();
  });
  const failed = FAILED_STATUSES.includes(status);
  const message = error ?? initialError;

  const retry = async () => {
    setRetrying(true);
    setRetryError(null);
    try {
      await api(`/api/candidates/${id}/retry`, { method: "POST", json: {} });
      router.refresh();
    } catch (e) {
      setRetryError(e instanceof Error ? e.message : "Retry failed.");
    } finally {
      setRetrying(false);
    }
  };

  return (
    <section className="mt-8 grid gap-6 rounded-lg border border-line bg-surface px-6 py-6 sm:grid-cols-[minmax(0,1fr)_auto]" aria-live="polite">
      <div>
        <h2 className="text-name font-semibold text-ink">{failed ? FAILURE_COPY[status] : "Screening this CV"}</h2>
        <p className="mt-1 max-w-[60ch] text-body text-muted">
          {failed
            ? (message ?? "Something went wrong.")
            : "Personal details are separated before anything reaches the AI. This usually takes under a minute; you can leave this page."}
        </p>
        {failed ? (
          <div className="mt-4 flex items-center gap-3">
            <Button variant="secondary" onClick={retry} loading={retrying} icon={<RotateCcw className="size-3.5" aria-hidden />}>
              Retry
            </Button>
            {retryError ? <p className="text-meta text-danger">{retryError}</p> : null}
          </div>
        ) : null}
      </div>
      <ProcessingSteps status={status} />
    </section>
  );
}
