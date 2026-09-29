"use client";

import { ArrowRight, FileText, Upload, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import { FAILED_STATUSES, ROLE_LABEL, type ProcessingStatus, type Role } from "@/lib/types";
import { PROCESSING_LABEL } from "@/lib/view";
import "./flows/flows.css";
import { DrawCheck } from "./motion/draw-check";
import { ProcessingSteps, useStatusPoll } from "./processing-panel";
import { Status } from "./status";
import { Button, Segmented } from "./ui";

const MAX = 5 * 1024 * 1024;
const OK_EXT = ["pdf", "docx", "txt"];

type Item = { key: string; file: File; state: "waiting" | "uploading" | "uploaded" | "rejected"; id?: string; error?: string };

function localCheck(f: File): string | null {
  const ext = f.name.toLowerCase().split(".").pop() ?? "";
  if (ext === "doc") return "Legacy .doc isn't supported. Save it as PDF or DOCX.";
  if (!OK_EXT.includes(ext)) return "Unsupported file. Use PDF or DOCX.";
  if (f.size === 0) return "This file is empty.";
  if (f.size > MAX) return "Larger than 5 MB.";
  return null;
}

const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export function UploadForm() {
  const [files, setFiles] = useState<File[]>([]);
  const [role, setRole] = useState<Role | "">("");
  const [drag, setDrag] = useState(false);
  const [items, setItems] = useState<Item[] | null>(null);
  const [roleError, setRoleError] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  // Count of files the last drop or pick added; drives a short "accepted" state on the dropzone.
  const [accepted, setAccepted] = useState(0);
  const acceptTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(acceptTimer.current), []);

  const add = (list: FileList | null) => {
    if (!list) return;
    const names = new Set(files.map((f) => f.name + f.size));
    const fresh = Array.from(list).filter((f) => !names.has(f.name + f.size));
    const next = [...files, ...fresh].slice(0, 25);
    setFiles(next);
    const added = next.length - files.length;
    if (added > 0) {
      setAccepted(added);
      window.clearTimeout(acceptTimer.current);
      acceptTimer.current = window.setTimeout(() => setAccepted(0), 1400);
    }
  };

  const start = async () => {
    if (!role) {
      setRoleError(true);
      return;
    }
    const queue: Item[] = files.map((f, i) => {
      const err = localCheck(f);
      return { key: `${i}-${f.name}`, file: f, state: err ? "rejected" : "waiting", error: err ?? undefined };
    });
    setItems(queue);
    // Sequential uploads keep Gemini traffic steady; screening continues server-side.
    for (const it of queue) {
      if (it.state === "rejected") continue;
      setItems((cur) => cur!.map((x) => (x.key === it.key ? { ...x, state: "uploading" } : x)));
      try {
        const fd = new FormData();
        fd.set("file", it.file);
        fd.set("role", role);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? `Upload failed (${res.status}).`);
        setItems((cur) => cur!.map((x) => (x.key === it.key ? { ...x, state: "uploaded", id: data.id } : x)));
      } catch (e) {
        setItems((cur) => cur!.map((x) => (x.key === it.key ? { ...x, state: "rejected", error: e instanceof Error ? e.message : "Upload failed." } : x)));
      }
    }
  };

  if (items) {
    return (
      <div className="max-w-3xl">
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {items.map((it) => (
            <UploadRow key={it.key} item={it} role={role as Role} single={items.length === 1} />
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              setItems(null);
              setFiles([]);
            }}
          >
            Screen another
          </Button>
          <Link href={`/?role=${role}`} className="rounded-sm text-sm text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink">
            Go to {ROLE_LABEL[role as Role]} candidates
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      className="flex max-w-3xl flex-col gap-7"
      onSubmit={(e) => {
        e.preventDefault();
        void start();
      }}
    >
      <div className="flex flex-col gap-2">
        <span id="cv-label" className="text-sm font-medium text-ink">
          CV
        </span>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            add(e.dataTransfer.files);
          }}
          data-drag={drag || undefined}
          data-accepted={accepted ? "" : undefined}
          className={cx(
            // The dashed edge is an SVG stroke so it can march: on hover or while dragging only, never idle.
            "kh-drop group relative flex flex-col items-start gap-3 rounded-lg border-dashed px-6 py-10 transition-[background-color] duration-[var(--duration-base)] ease-[var(--ease-out)] sm:flex-row sm:items-center sm:justify-between",
            drag || accepted ? "bg-accent-soft" : "bg-surface",
          )}
        >
          <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible">
            <rect
              x="0.5"
              y="0.5"
              rx="9.5"
              strokeWidth="1"
              style={{ width: "calc(100% - 1px)", height: "calc(100% - 1px)" }}
              className={cx("kh-dash fill-none", drag || accepted ? "stroke-accent" : "stroke-line-strong group-hover:stroke-faint")}
            />
          </svg>
          <div className="relative flex items-center gap-3.5">
            <span
              className={cx(
                "flex size-9 items-center justify-center rounded-md transition-[transform,background-color,color,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-editorial)]",
                accepted ? "bg-accent text-white" : drag ? "-translate-y-1 bg-surface text-accent shadow-[var(--shadow-raise)] ring-1 ring-accent-line" : "bg-rail text-ink-2",
              )}
            >
              {accepted ? <DrawCheck key={accepted} play className="size-4" strokeWidth={2.25} /> : <Upload className="size-4" aria-hidden />}
            </span>
            <div>
              <p className="text-body font-medium text-ink">Drop CVs here</p>
              <p className="tnum text-meta text-muted">
                {/* One line from sm; below it breaks after "each" so no line ever ends or starts on a separator. */}
                PDF, DOCX or TXT · <span className="whitespace-nowrap">up to 5 MB each</span>
                <span className="hidden sm:inline"> · </span>
                <br className="sm:hidden" />
                <span className="whitespace-nowrap">up to 25 at once</span>
              </p>
            </div>
          </div>
          <Button variant="secondary" onClick={() => input.current?.click()} aria-describedby="cv-label" className="relative">
            Browse files
          </Button>
          <p className="sr-only" aria-live="polite">
            {accepted ? `${accepted} ${accepted === 1 ? "file" : "files"} added` : ""}
          </p>
          <input ref={input} type="file" multiple accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" className="sr-only" onChange={(e) => add(e.target.files)} tabIndex={-1} aria-hidden />
        </div>
        {files.length ? (
          <ul className="mt-1 flex flex-col">
            {files.map((f) => {
              const err = localCheck(f);
              return (
                <li key={f.name + f.size} className="kh-lift flex items-center gap-2.5 border-b border-line py-2 text-sm last:border-b-0">
                  <FileText className="size-4 shrink-0 text-muted" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-ink">{f.name}</span>
                  {err ? <span className="text-meta text-danger">{err}</span> : <span className="tnum text-meta text-muted">{kb(f.size)}</span>}
                  <button type="button" onClick={() => setFiles((p) => p.filter((x) => x !== f))} className="rounded-sm p-1 text-muted hover:bg-hover hover:text-ink" aria-label={`Remove ${f.name}`}>
                    <X className="size-3.5" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink">Applied role</span>
        <Segmented
          label="Applied role"
          value={role as Role}
          onChange={(v) => {
            setRole(v);
            setRoleError(false);
          }}
          options={[
            { value: "PM", label: "Product Manager" },
            { value: "SPM", label: "Senior Product Manager" },
          ]}
          className="self-start"
        />
        {roleError ? (
          <p className="text-meta text-danger" role="alert">
            Choose the role the candidate applied for.
          </p>
        ) : (
          <p className="text-meta text-muted">Every CV is scored against both rubrics; this decides which score leads.</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-5">
        <Button type="submit" variant="primary" disabled={files.length === 0}>
          {files.length > 1 ? `Screen ${files.length} candidates` : "Screen candidate"}
        </Button>
        <p className="text-meta text-muted">Name, email and phone are stored separately and never sent to the AI.</p>
      </div>
    </form>
  );
}

function UploadRow({ item, role, single }: { item: Item; role: Role; single: boolean }) {
  return (
    <li className="px-5 py-4">
      <div className="flex items-center gap-3">
        <FileText className="size-4 shrink-0 text-muted" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{item.file.name}</span>
        <span className="text-meta text-muted">{ROLE_LABEL[role]}</span>
      </div>
      <div className="mt-3 pl-7">
        {item.state === "waiting" ? <Status status="processing" label="Waiting to upload" /> : null}
        {item.state === "uploading" ? <Status status="processing" label="Uploading" /> : null}
        {item.state === "rejected" ? (
          <p className="text-sm text-danger" role="alert">
            {item.error}
          </p>
        ) : null}
        {item.state === "uploaded" && item.id ? <Tracked id={item.id} single={single} /> : null}
      </div>
    </li>
  );
}

function Tracked({ id, single }: { id: string; single: boolean }) {
  const { status, error } = useStatusPoll(id, "uploaded");
  const failed = FAILED_STATUSES.includes(status);
  const done = status === "ready_for_review";
  return (
    <div className="flex flex-col gap-3">
      {single && !done ? <ProcessingSteps status={status as ProcessingStatus} /> : null}
      {!single && !done && !failed ? <Status status="processing" label={PROCESSING_LABEL[status]} /> : null}
      {failed ? (
        <p className="text-sm text-danger">
          We couldn&apos;t finish screening this CV. {error ?? ""} <span className="text-muted">Open the candidate to retry.</span>
        </p>
      ) : null}
      {done || failed ? (
        <Link href={`/candidates/${id}`} className="inline-flex items-center gap-1 self-start rounded-sm text-sm font-medium text-accent hover:text-accent-hover">
          {done ? "Ready for review. Open candidate" : "Open candidate"} <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}
