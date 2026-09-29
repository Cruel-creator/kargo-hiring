"use client";

import { Check, Pause, X, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cx } from "@/lib/cx";
import type { ReviewStatus } from "@/lib/types";
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
  // "Email ready" keeps the underlying decision visible
  const effective = current === "email_ready" ? (emailType === "interview" ? "shortlist" : emailType === "rejection" ? "not_shortlisted" : null) : current;

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
    <div role="group" aria-label="Your decision" className="flex flex-wrap gap-1.5">
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
              "inline-flex h-8.5 items-center gap-1.5 rounded-md border px-3.5 text-sm font-medium transition-[background-color,border-color,color,transform] duration-[var(--duration-fast)] active:translate-y-px disabled:opacity-45",
              active ? d.on : "border-line-strong bg-surface text-ink-2 hover:border-faint hover:bg-hover hover:text-ink",
            )}
          >
            <Icon className={cx("size-3.5", busy === d.value && "animate-pulse-soft")} strokeWidth={2.25} aria-hidden />
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
      <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
        {email ? <span className="text-ink-2">{email}</span> : <span className="text-warn">No email on file</span>}
        <span aria-hidden className="text-faint">·</span>
        {phone ? <span className="tnum text-ink-2">{phone}</span> : <span className="text-muted">No phone</span>}
        {!locked ? (
          <button type="button" onClick={() => setEditing(true)} className="ml-1 inline-flex items-center gap-1 rounded-sm text-meta text-muted hover:text-ink">
            <Pencil className="size-3" aria-hidden /> Edit details
          </button>
        ) : null}
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
