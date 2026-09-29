"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import type { InterviewBrief as Brief } from "@/lib/types";
import { useToast } from "./overlay";
import { Button } from "./ui";

export function InterviewBrief({ brief, concern }: { brief: Brief | null; concern: string | null }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  if (!brief) {
    return (
      <section aria-labelledby="brief-title">
        <h2 id="brief-title" className="text-name font-semibold text-ink">
          Interview brief
        </h2>
        <p className="mt-2 text-body text-muted">The brief has not been generated yet.</p>
      </section>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${brief.why_scored} ${brief.strongest_evidence}\n\nProbe: ${brief.probe}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast("error", "Copy failed. Select the text and copy it manually.");
    }
  };

  return (
    <section aria-labelledby="brief-title">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="brief-title" className="text-name font-semibold tracking-[-0.01em] text-ink">
          Interview brief
        </h2>
        <Button size="sm" variant="ghost" onClick={copy} icon={copied ? <Check className="size-3.5 text-accent" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}>
          {copied ? "Copied" : "Copy brief"}
        </Button>
      </div>

      <dl className="space-y-3.5">
        <div data-reveal>
          <dt className="text-label font-medium text-muted">Why they stand out</dt>
          <dd className="mt-0.5 text-body text-ink">{brief.why_scored}</dd>
        </div>
        <div data-reveal>
          <dt className="text-label font-medium text-muted">Strongest evidence</dt>
          <dd className="mt-1 border-l border-line-strong pl-3.5 text-body text-ink-2">{brief.strongest_evidence}</dd>
        </div>
        <div data-probe data-reveal className="rounded-lg bg-accent-soft px-4 py-3.5">
          <dt className="flex items-center justify-between gap-2 text-label font-semibold text-accent">
            What to probe
            {concern ? <span className="font-normal text-accent/80">{concern}</span> : null}
          </dt>
          <dd className="mt-1 text-body font-medium text-ink">{brief.probe}</dd>
        </div>
      </dl>
    </section>
  );
}
