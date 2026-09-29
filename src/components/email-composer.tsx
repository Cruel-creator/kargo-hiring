"use client";

import { AlertCircle, Eye, PenLine, RotateCcw, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import { DrawCheck } from "./motion/draw-check";
import type { EmailType, ProcessingStatus, ReviewStatus } from "@/lib/types";
import { formatDateTime } from "@/lib/view";
import { api } from "./candidate-actions";
import { Modal, useToast } from "./overlay";
import { Button, Input, Segmented, Textarea } from "./ui";

interface ResultSlice {
  review_status: ReviewStatus;
  email_type: EmailType | null;
  email_subject: string | null;
  email_body: string | null;
  email_sent: boolean;
  sent_at: string | null;
  sent_to: string | null;
}

const TYPE_LABEL: Record<EmailType, string> = { interview: "Interview invite", rejection: "Rejection" };

export function EmailComposer({
  id,
  candidateName,
  to,
  redirectTo,
  result,
  previews,
  processing,
  error,
}: {
  id: string;
  candidateName: string | null;
  to: string | null;
  redirectTo: string | null;
  result: ResultSlice;
  previews: Record<EmailType, { subject: string; body: string } | null>;
  processing: ProcessingStatus;
  error: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const decided = result.email_type;
  const [previewType, setPreviewType] = useState<EmailType>("interview");
  const shownType: EmailType = decided ?? previewType;
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [subject, setSubject] = useState(result.email_subject ?? "");
  const [body, setBody] = useState(result.email_body ?? "");
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(error);
  // A sent record loads with a static check; sending in this session draws it once.
  const wasSent = useRef(result.email_sent);
  useEffect(() => {
    wasSent.current = result.email_sent;
  });

  useEffect(() => {
    setSubject(result.email_subject ?? "");
    setBody(result.email_body ?? "");
    setMode("preview");
  }, [result.email_subject, result.email_body, result.email_type]);
  useEffect(() => setSendError(error), [error]);

  const dirty = !!decided && (subject !== (result.email_subject ?? "") || body !== (result.email_body ?? ""));
  const sent = result.email_sent;
  const busy = processing === "sending" || sending;
  const view = decided ? { subject: result.email_subject ?? "", body: result.email_body ?? "" } : previews[shownType];

  const save = async (markReady: boolean) => {
    setSaving(true);
    try {
      await api(`/api/candidates/${id}/email`, { method: "PATCH", json: { subject, body, markReady } });
      toast("ok", markReady ? "Email marked ready." : "Draft saved.");
      router.refresh();
      return true;
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Could not save the draft.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setSaving(true);
    try {
      await api(`/api/candidates/${id}/email`, { method: "PATCH", json: { reset: true } });
      toast("ok", "Restored the generated draft.");
      router.refresh();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Could not reset the draft.");
    } finally {
      setSaving(false);
    }
  };

  const send = async () => {
    setSending(true);
    setSendError(null);
    try {
      if (dirty && !(await save(false))) return;
      await api(`/api/send-email`, { method: "POST", json: { candidate_id: id } });
      setConfirm(false);
      toast("ok", `${TYPE_LABEL[shownType]} sent to ${candidateName ?? "the candidate"}.`);
      router.refresh();
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Send failed.");
      setConfirm(false);
      router.refresh();
    } finally {
      setSending(false);
    }
  };

  const blocker = !to ? "Add an email address for this candidate before sending." : null;

  return (
    <section aria-labelledby="email-title">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="email-title" tabIndex={-1} className="rounded-sm text-name font-semibold tracking-[-0.01em] text-ink outline-none">
          Email draft
        </h2>
        {!sent ? (
          <Segmented
            size="sm"
            label="Email type"
            value={shownType}
            onChange={setPreviewType}
            options={(["interview", "rejection"] as EmailType[]).map((t) => ({
              value: t,
              label: TYPE_LABEL[t],
              disabled: !!decided && decided !== t,
              title: decided && decided !== t ? "Change your decision to switch email type" : undefined,
            }))}
          />
        ) : null}
      </div>

      {sent ? (
        <p className="mb-3 flex flex-wrap items-center gap-x-2 text-sm">
          <span className="inline-flex items-center gap-1.5 font-medium text-accent">
            <DrawCheck play={result.email_sent && !wasSent.current} className="size-4" /> Sent
          </span>
          <span className="tnum text-muted">{result.sent_at ? formatDateTime(result.sent_at) : ""}</span>
          <span className="text-muted">to {result.sent_to}</span>
        </p>
      ) : null}

      <div className={cx("rounded-lg border bg-surface", mode === "edit" ? "border-accent-line" : "border-line")}>
        <div data-email-to className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center border-b border-line px-4 py-2.5 text-sm">
          <span className="text-label font-medium text-muted">To</span>
          <span className={cx("truncate", to ? "text-ink" : "text-warn")}>
            {to ?? "No email on file"}
            {to && redirectTo ? <span className="ml-1.5 text-meta text-muted">(test mode → {redirectTo})</span> : null}
          </span>
        </div>
        {mode === "edit" && decided && !sent ? (
          <div className="flex flex-col gap-3 p-4">
            <div data-email-subject>
              <label htmlFor="email-subject" className="sr-only">
                Subject
              </label>
              <Input id="email-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
            </div>
            <label htmlFor="email-body" className="sr-only">
              Body
            </label>
            <Textarea id="email-body" value={body} onChange={(e) => setBody(e.target.value)} rows={12} />
          </div>
        ) : (
          <div className="px-4 py-3.5">
            <div data-email-subject className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-baseline pb-3 text-sm">
              <span className="text-label font-medium text-muted">Subject</span>
              <span className="font-medium text-ink">{view?.subject || <span className="text-muted">No draft</span>}</span>
            </div>
            <div className="text-body whitespace-pre-wrap text-ink-2">{view?.body || "No draft has been generated."}</div>
          </div>
        )}
      </div>

      {sendError && !sent ? (
        <p className="mt-3 flex items-start gap-2 text-sm text-danger" role="alert">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {sendError} <span className="text-muted">Nothing was marked as sent. You can try again.</span>
          </span>
        </p>
      ) : null}
      {blocker && decided && !sent ? <p className="mt-3 text-meta text-warn">{blocker}</p> : null}
      {/* Undecided: the note sits where the send actions will appear, so the draft itself stays within the fold. */}
      {!decided && !sent ? <p className="mt-3 text-meta text-muted">Preview only. Choose Shortlist or Not Shortlist to queue the matching email.</p> : null}

      {decided && !sent ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {mode === "preview" ? (
              <Button size="sm" variant="ghost" onClick={() => setMode("edit")} icon={<PenLine className="size-3.5" aria-hidden />}>
                Edit
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setMode("preview")} icon={<Eye className="size-3.5" aria-hidden />}>
                Preview
              </Button>
            )}
            {mode === "edit" ? (
              <Button size="sm" variant="ghost" onClick={reset} disabled={saving} icon={<RotateCcw className="size-3.5" aria-hidden />}>
                Reset
              </Button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {dirty ? (
              <Button size="md" variant="secondary" loading={saving} onClick={() => save(false)}>
                Save
              </Button>
            ) : result.review_status !== "email_ready" ? (
              <Button size="md" variant="secondary" loading={saving} onClick={() => save(true)}>
                Mark ready
              </Button>
            ) : null}
            <Button variant="primary" onClick={() => setConfirm(true)} disabled={!!blocker || busy || !subject.trim() || !body.trim()} loading={busy} icon={<Send className="size-3.5" aria-hidden />}>
              {busy ? "Sending" : "Confirm & send"}
            </Button>
          </div>
        </div>
      ) : null}

      <Modal
        open={confirm}
        onClose={() => !sending && setConfirm(false)}
        title={`Send ${TYPE_LABEL[shownType].toLowerCase()}?`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)} disabled={sending}>
              Cancel
            </Button>
            <Button variant="primary" onClick={send} loading={sending} icon={<Send className="size-3.5" aria-hidden />}>
              Send email
            </Button>
          </>
        }
      >
        <dl className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-y-2 text-sm">
          <dt className="text-muted">To</dt>
          <dd className="text-ink">
            {candidateName ? `${candidateName} · ` : ""}
            {to}
            {redirectTo ? <span className="block text-meta text-muted">Test mode: delivered to {redirectTo}</span> : null}
          </dd>
          <dt className="text-muted">Subject</dt>
          <dd className="text-ink">{subject}</dd>
        </dl>
        <p className="mt-4 text-meta text-muted">
          {dirty ? "Your edits will be saved first. " : ""}This sends one email through Resend. It can't be unsent, and the record locks once it's delivered.
        </p>
      </Modal>
    </section>
  );
}
