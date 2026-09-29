"use client";

import { Check, Pause, X, Pencil } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { cx } from "@/lib/cx";
import type { ReviewStatus } from "@/lib/types";
import { SEP, SEP_ROW } from "./detail/sep";
import { DrawCheck } from "./motion/draw-check";
import { useToast } from "./overlay";
import { Button, Field, Input } from "./ui";

export async function api<T = unknown>(url: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init.json !== undefined ? { "content-type": "application/json", ...init.headers } : init.headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status}).`);
  return data as T;
}

const DECISIONS = [
  { value: "shortlist", label: "Shortlist", icon: Check, on: "bg-accent text-white border-accent hover:bg-accent-hover" },
  { value: "hold", label: "Hold", icon: Pause, on: "bg-warn-soft text-warn border-warn-dot/60" },
  { value: "not_shortlisted", label: "Not shortlist", icon: X, on: "bg-selected text-ink border-line-strong" },
] as const;

export function DecisionBar({ id, current, emailType, disabled }: { id: string; current: ReviewStatus; emailType: "interview" | "rejection" | null; disabled: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  // "Email ready" and "Sent" keep the underlying decision visible
  const effective = current === "email_ready" || current === "sent" ? (emailType === "interview" ? "shortlist" : emailType === "rejection" ? "not_shortlisted" : null) : current;
  // The chosen button morphs: its fill eases in and its icon becomes a check that draws, only when the
  // decision changes in this session. On load the chosen state is static.
  const prev = useRef(effective);
  useEffect(() => {
    prev.current = effective;
  });
  const changed = prev.current !== effective;

  const decide = (value: string) => {
    const next = effective === value ? "review" : value; // clicking the active decision undoes it
    setBusy(value);
    start(async () => {
      try {
        await api(`/api/candidates/${id}/decision`, { method: "POST", json: { decision: next } });
        router.refresh();
      } catch (e) {
        toast("error", e instanceof Error ? e.message : "Could not save the decision.");
      } finally {
        setBusy(null);
      }
    });
  };

  return (
    <div id="decision" role="group" aria-label="Your decision" className="flex flex-wrap gap-1.5">
      {DECISIONS.map((d) => {
        const active = effective === d.value;
        const Icon = d.icon;
        return (
          <button
            key={d.value}
            type="button"
            aria-pressed={active}
            disabled={disabled || pending}
            onClick={() => decide(d.value)}
            className={cx(
              "inline-flex h-8.5 items-center gap-1.5 rounded-md border px-3.5 text-sm font-medium transition-[background-color,border-color,color,transform] duration-[var(--duration-base)] ease-[var(--ease-out)] active:translate-y-px",
              // Locked (not merely saving): hover fill and muted text, never opacity. A locked active
              // decision keeps a quiet selected fill so the record still shows what was decided.
              disabled
                ? active
                  ? "border-line-strong bg-selected text-ink-2"
                  : "disabled:border-line disabled:bg-hover disabled:text-muted"
                : active
                  ? d.on
                  : "border-line-strong bg-surface text-ink-2 hover:border-faint hover:bg-hover hover:text-ink",
            )}
          >
            <span className={cx("relative grid size-3.5 place-items-center", busy === d.value && "animate-pulse-soft")} aria-hidden>
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  key={active ? "chosen" : "icon"}
                  className="absolute inset-0 grid place-items-center"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                >
                  {active ? <DrawCheck play={changed} className="size-3.5" strokeWidth={2.5} /> : <Icon className="size-3.5" strokeWidth={2.25} />}
                </motion.span>
              </AnimatePresence>
            </span>
            {d.label}
          </button>
        );
      })}
    </div>
  );
}

export function ContactDetails({ id, name, email, phone, locked }: { id: string; name: string | null; email: string | null; phone: string | null; locked: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: name ?? "", email: email ?? "", phone: phone ?? "" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [rescreen, setRescreen] = useState(false);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await api(`/api/candidates/${id}/contact`, { method: "PATCH", json: form });
      if (rescreen) await api(`/api/candidates/${id}/retry`, { method: "POST", json: { rescreen: true } });
      toast("ok", rescreen ? "Details saved. Re-screening with the corrected name." : "Candidate details saved.");
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      // Every item carries its separator on its left, inside a 20px gutter. The row is shifted 20px left and
      // clipped, so the item that starts any line has its dot clipped away: no line starts or ends on a "·".
      <div className="mt-2.5 overflow-x-clip text-sm">
        <div className={SEP_ROW}>
          <span className={cx(SEP, "min-w-0 [overflow-wrap:anywhere]", email ? "text-ink-2" : "text-warn")}>{email ?? "No email on file"}</span>
          <span className={cx(SEP, "whitespace-nowrap", phone ? "tnum text-ink-2" : "text-muted")}>{phone ?? "No phone"}</span>
          {!locked ? (
            <span className="pl-5">
              <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1 rounded-sm text-meta text-muted transition-colors duration-[var(--duration-fast)] hover:text-ink">
                <Pencil className="size-3" aria-hidden /> Edit details
              </button>
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <form
      className="mt-4 grid max-w-2xl animate-rise gap-3 sm:grid-cols-3"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <Field label="Name" htmlFor="c-name">
        <Input id="c-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="off" />
      </Field>
      <Field label="Email" htmlFor="c-email">
        <Input id="c-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="off" aria-invalid={!!error || undefined} />
      </Field>
      <Field label="Phone" htmlFor="c-phone">
        <Input id="c-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="off" />
      </Field>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
        <Button type="submit" variant="primary" size="sm" loading={saving}>
          Save details
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
          Cancel
        </Button>
        {form.name.trim() !== (name ?? "") ? (
          <label className="flex items-center gap-2 text-meta text-ink-2">
            <input type="checkbox" checked={rescreen} onChange={(e) => setRescreen(e.target.checked)} className="size-3.5 accent-[var(--color-accent)]" />
            Re-screen so the corrected name is also removed from the CV text
          </label>
        ) : null}
        {error ? (
          <p className="text-meta text-danger sm:basis-full" role="alert">
            {error}
          </p>
        ) : (
          <p className="text-meta text-muted sm:basis-full">Stored separately from the CV. Never sent to the AI.</p>
        )}
      </div>
    </form>
  );
}
