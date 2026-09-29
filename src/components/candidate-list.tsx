"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import CountUp from "@/components/bits/CountUp";
import { ScrollTrigger } from "@/components/motion/gsap";
import { useRowEntrance, type Entrance } from "@/components/dashboard/entrance";
import { Monogram } from "@/components/dashboard/monogram";
import { Pipeline, type Filter } from "@/components/dashboard/pipeline";
import { TheadRecede } from "@/components/dashboard/thead-recede";
import { cx } from "@/lib/cx";
import { ROLE_LABEL, type Role } from "@/lib/types";
import { formatRelative, formatScore, PIPELINE_STEPS, PROCESSING_LABEL, shortCriterion, stepIndex, type CandidateRowView } from "@/lib/view";
import { Status } from "./status";
import { Button, EmptyState, Select } from "./ui";

export function CandidateList({
  rows,
  view,
  cross,
  totalCandidates,
  nextId,
  linkBase = "/candidates/",
  entrance = "none",
}: {
  rows: CandidateRowView[];
  view: Role | "all";
  cross: boolean;
  totalCandidates: number;
  nextId: string | null;
  linkBase?: string;
  entrance?: Entrance;
}) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const q = (params.get("q") ?? "").trim().toLowerCase();
  const status = (params.get("status") ?? "all") as Filter;
  const min = Number(params.get("min") ?? 0);
  const sort = params.get("sort") === "newest" ? "newest" : "score";
  const roleFilter = (params.get("r") ?? "all") as Role | "all";

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === "" || value === "all" || value === "0") next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.replace(`${path}${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  // Keep in-flight screenings fresh without a manual reload.
  const busy = rows.some((r) => r.status === "processing" || r.processing === "sending");
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(t);
  }, [busy, router]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const out = rows.filter(
      (r) =>
        (status === "all" || r.status === status) &&
        (roleFilter === "all" || r.role === roleFilter) &&
        (!min || (r.score ?? -1) >= min) &&
        (!q || r.name.toLowerCase().includes(q) || (r.email ?? "").toLowerCase().includes(q) || (r.strength ?? "").toLowerCase().includes(q)),
    );
    return out.sort((a, b) =>
      sort === "newest"
        ? b.createdAt.localeCompare(a.createdAt)
        : (b.score ?? -1) - (a.score ?? -1) || a.createdAt.localeCompare(b.createdAt),
    );
  }, [rows, status, roleFilter, min, q, sort]);

  // Row set changed (filter, search, poll): trigger positions below the list moved.
  const visibleKey = visible.map((r) => r.id).join(",");
  useEffect(() => {
    ScrollTrigger.refresh();
  }, [visibleKey]);

  if (totalCandidates === 0) return null; // the masthead owns the empty state

  const otherRole = view === "PM" ? "SPM" : "PM";

  return (
    <section aria-label="Candidates" className="mt-6 lg:mt-7">
      {/* Keyed by view: a view switch remounts the stage flow, so its counts never tick on a view change. */}
      <Pipeline key={`${view}:${cross}`} counts={counts} active={status} onPick={(k) => set("status", k)} entrance={entrance} />

      <div className="mt-4 grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap [&>*:first-child]:col-span-2 sm:[&>*:first-child]:col-span-1">
        {view === "all" ? (
          <Select aria-label="Filter by applied role" value={roleFilter} onChange={(e) => set("r", e.target.value)} className="w-full sm:w-auto">
            <option value="all">All roles</option>
            <option value="PM">Product Manager</option>
            <option value="SPM">Senior Product Manager</option>
          </Select>
        ) : (
          <label className="flex h-8 items-center gap-2 rounded-md px-1 text-sm text-ink-2">
            <input type="checkbox" checked={cross} onChange={(e) => set("cross", e.target.checked ? "1" : null)} className="size-3.5 accent-[var(--color-accent)]" />
            Include {otherRole} applicants
          </label>
        )}
        <Select aria-label="Minimum score" value={String(min)} onChange={(e) => set("min", e.target.value)} className="w-full sm:w-auto">
          <option value="0">Any score</option>
          <option value="80">80 and above</option>
          <option value="65">65 and above</option>
          <option value="50">50 and above</option>
        </Select>
        <Select aria-label="Sort" value={sort} onChange={(e) => set("sort", e.target.value === "score" ? null : e.target.value)} className="w-full sm:w-auto">
          <option value="score">Highest score</option>
          <option value="newest">Newest</option>
        </Select>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="No candidates match"
          body={q ? `Nothing matches “${params.get("q")}” with the current filters.` : "Try a different status or score filter."}
          action={
            <Button variant="secondary" onClick={() => router.replace(view === "all" ? path : `${path}?role=${view}`, { scroll: false })}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <CandidateTable rows={visible} view={view} nextId={nextId} linkBase={linkBase} entrance={entrance} />
          <CandidateStack rows={visible} view={view} nextId={nextId} linkBase={linkBase} entrance={entrance} />
        </>
      )}
      <p className="mt-4 text-meta text-muted">
        {view === "all" ? "Scores are for the role each person applied to. Open a role to see its ranking." : `Scores are ${view} rubric scores; rank is among ${view} applicants.`} Scores are recommendations. Decisions are yours.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ Cells */

/** First-arrival CSS hook for the first 8 rows (see entrance.tsx); later rows rise with ScrollTrigger.batch. */
const enterRow = (i: number) => (i < 8 ? { "data-enter": "row", style: { "--i": i } as CSSProperties } : {});

function ScoreCell({ row, track = false }: { row: CandidateRowView; track?: boolean }) {
  if (row.status === "processing") return <span className="skeleton inline-block h-3 w-12" aria-label="Scoring in progress" />;
  if (row.status === "failed") return <span className="text-sm text-muted">—</span>;
  const n = row.score;
  return (
    <span className="flex items-center gap-2.5">
      {n !== null && Number.isInteger(n) ? (
        <span data-count={n} className="relative w-8 text-right">
          <CountUp to={n} className="text-[15px] font-semibold text-ink" />
        </span>
      ) : (
        <span className="tnum w-8 text-right text-[15px] font-semibold text-ink">{formatScore(n)}</span>
      )}
      {track ? (
        <span className="relative hidden h-[3px] w-14 overflow-hidden rounded-full bg-line @min-[60rem]:block" aria-hidden>
          {n !== null ? <span data-fill className="absolute inset-y-0 left-0 rounded-full bg-ink-2" style={{ width: `${Math.max(2, Math.min(100, n))}%` }} /> : null}
        </span>
      ) : null}
    </span>
  );
}

function StatusCell({ row }: { row: CandidateRowView }) {
  if (row.status === "processing")
    return (
      <span title={PROCESSING_LABEL[row.processing]}>
        <Status status="processing" label={`Screening ${Math.min(stepIndex(row.processing) + 1, PIPELINE_STEPS.length)}/${PIPELINE_STEPS.length}`} />
      </span>
    );
  if (row.processing === "sending") return <Status status="processing" label="Sending" />;
  if (row.processing === "send_failed") return <Status status="failed" label="Send failed" />;
  return <Status status={row.status} />;
}

/** A criterion cell that truncates instead of widening the table: it contributes no min-content width, then fills its column. */
function Criterion({ name }: { name: string | null }) {
  const label = shortCriterion(name);
  if (!label) return <span className="text-muted">—</span>;
  return (
    <span className="block w-0 min-w-full truncate" title={name ?? undefined}>
      {label}
    </span>
  );
}

/** Every row reserves the word's width, so the column never re-flows when the pager moves the marker. */
function NextMark({ shown }: { shown: boolean }) {
  return shown ? (
    <span className="ml-2 text-meta font-medium text-ink-2">Next</span>
  ) : (
    <span aria-hidden inert className="ml-2 text-meta font-medium opacity-0 select-none">
      Next
    </span>
  );
}

/* ------------------------------------------------------------------ Table (md and up) */

function CandidateTable({ rows, view, nextId, linkBase, entrance }: { rows: CandidateRowView[]; view: Role | "all"; nextId: string | null; linkBase: string; entrance: Entrance }) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  useRowEntrance(wrapRef, "tbody tr", entrance, rows.map((r) => r.id).join(","));
  const th = "paper sticky top-[var(--bar-h)] z-10 px-2.5 py-2.5 text-left text-label font-medium text-muted whitespace-nowrap shadow-[inset_0_-1px_0_var(--color-line)]";
  const td = "px-2.5 py-3";
  return (
    <div ref={wrapRef} className="relative mt-4 hidden md:block">
      {/* Columns drop by the table's own width (the sidebar takes 232px from the viewport), so nothing is ever clipped.
          The container is an inner wrapper: containment would otherwise capture TheadRecede's fixed overlay. */}
      <div className="@container">
        <table className="w-full border-separate border-spacing-0">
          <caption className="sr-only">Candidates ranked by score</caption>
          <thead>
            <tr>
              {view !== "all" ? (
                <th scope="col" className={cx(th, "w-10 pl-2 text-right")}>
                  <abbr title="Rank" className="no-underline">
                    #
                  </abbr>
                </th>
              ) : null}
              <th scope="col" className={cx(th, view === "all" && "pl-2")}>
                Candidate
              </th>
              {view === "all" ? (
                <th scope="col" className={cx(th, "hidden @min-[52rem]:table-cell")}>
                  Applied role
                </th>
              ) : null}
              <th scope="col" className={cx(th, "w-24")}>
                Score
              </th>
              <th scope="col" className={cx(th, "w-[28%]")}>
                Strength
              </th>
              <th scope="col" className={cx(th, "hidden w-[32%] @min-[52rem]:table-cell")}>
                Concern
              </th>
              <th scope="col" className={th}>
                Status
              </th>
              <th scope="col" className={cx(th, "hidden text-right @min-[60rem]:table-cell")}>
                Updated
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const next = r.id === nextId;
              return (
                <tr
                  key={r.id}
                  {...enterRow(i)}
                  onClick={(e) => {
                    if (!(e.target as HTMLElement).closest("a")) router.push(`${linkBase}${r.id}`);
                  }}
                  className={cx(
                    "group cursor-pointer transition-[background-color,transform,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-out)]",
                    "hover:-translate-y-0.5 hover:bg-surface hover:shadow-[0_10px_20px_-16px_rgb(38_33_24/0.45)] focus-within:bg-surface",
                    "[&>td]:border-t [&>td]:border-line [&:first-child>td]:border-t-0",
                  )}
                >
                  {view !== "all" ? (
                    <td className={cx("tnum py-3 pr-2.5 pl-2 text-right text-sm text-muted", next && "shadow-[inset_2px_0_0_var(--color-ink)]")}>{r.rank ?? "—"}</td>
                  ) : null}
                  <td className={cx("py-3 pr-2.5", view === "all" ? "pl-2" : "pl-2.5", view === "all" && next && "shadow-[inset_2px_0_0_var(--color-ink)]")}>
                    <span className="flex items-center gap-2.5">
                      <Monogram name={r.name} status={r.status} />
                      <span className="min-w-0">
                        <span className="flex items-baseline whitespace-nowrap">
                          <Link
                            href={`${linkBase}${r.id}`}
                            className="inline-flex items-center gap-1 rounded-sm text-body font-medium text-ink decoration-line-strong underline-offset-4 group-hover:underline"
                          >
                            {r.name}
                            <ArrowUpRight
                              className="size-3.5 -translate-x-1 text-ink-2 opacity-0 transition-[opacity,transform] duration-[var(--duration-base)] ease-[var(--ease-out)] group-focus-within:translate-x-0 group-focus-within:opacity-100 group-hover:translate-x-0 group-hover:opacity-100"
                              aria-hidden
                            />
                          </Link>
                          <NextMark shown={next} />
                          {view !== "all" && r.role !== view ? <span className="ml-2 text-meta text-muted">applied {r.role}</span> : null}
                        </span>
                        {view === "all" ? <span className="block text-meta text-muted @min-[52rem]:hidden">{ROLE_LABEL[r.role]}</span> : null}
                      </span>
                    </span>
                  </td>
                  {view === "all" ? (
                    <td className={cx(td, "hidden text-sm whitespace-nowrap text-ink-2 @min-[52rem]:table-cell")}>
                      {/* Short code while the table is narrow, so the evidence columns keep their words. */}
                      <abbr title={ROLE_LABEL[r.role]} className="no-underline @min-[72rem]:hidden">
                        {r.role}
                      </abbr>
                      <span className="hidden @min-[72rem]:inline">{ROLE_LABEL[r.role]}</span>
                    </td>
                  ) : null}
                  <td className={td}>
                    <ScoreCell row={r} track />
                  </td>
                  <td className={cx(td, "text-sm text-ink-2")}>
                    <Criterion name={r.strength} />
                  </td>
                  <td className={cx(td, "hidden text-sm text-ink-2 @min-[52rem]:table-cell")}>
                    <Criterion name={r.concern} />
                  </td>
                  <td className={td}>
                    <StatusCell row={r} />
                  </td>
                  <td className={cx(td, "tnum hidden text-right text-meta whitespace-nowrap text-muted @min-[60rem]:table-cell")}>{formatRelative(r.updatedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <TheadRecede wrap={wrapRef} />
    </div>
  );
}

/* ------------------------------------------------------------------ Stacked rows (below md) */

function CandidateStack({ rows, view, nextId, linkBase, entrance }: { rows: CandidateRowView[]; view: Role | "all"; nextId: string | null; linkBase: string; entrance: Entrance }) {
  const ref = useRef<HTMLUListElement>(null);
  useRowEntrance(ref, ":scope > li", entrance, rows.map((r) => r.id).join(","));
  return (
    <ul ref={ref} className="mt-4 divide-y divide-line border-t border-line md:hidden">
      {rows.map((r, i) => {
        const next = r.id === nextId;
        return (
          <li key={r.id} {...enterRow(i)} className={cx(next && "shadow-[inset_2px_0_0_var(--color-ink)]")}>
            <Link href={`${linkBase}${r.id}`} className={cx("flex items-start gap-3 py-3.5 transition-colors duration-[var(--duration-fast)] active:bg-hover", next && "pl-3")}>
              {view !== "all" ? <span className="tnum w-5 pt-1.5 text-right text-sm text-muted">{r.rank ?? "—"}</span> : null}
              <Monogram name={r.name} status={r.status} className="mt-px" />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-baseline">
                    <span className="truncate text-body font-medium text-ink">{r.name}</span>
                    {next ? <span className="ml-2 shrink-0 text-meta font-medium text-ink-2">Next</span> : null}
                  </span>
                  <ScoreCell row={r} />
                </span>
                <span className="mt-0.5 block text-meta text-muted">
                  {view === "all" || r.role !== view ? ROLE_LABEL[r.role] : null}
                  {(view === "all" || r.role !== view) && r.strength ? " · " : null}
                  {shortCriterion(r.strength)}
                </span>
                <span className="mt-1.5 block">
                  <StatusCell row={r} />
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
