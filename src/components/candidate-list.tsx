"use client";

import { ArrowUpRight, Upload } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { cx } from "@/lib/cx";
import { ROLE_LABEL, type Role } from "@/lib/types";
import { formatRelative, formatScore, PIPELINE_STEPS, PROCESSING_LABEL, REVIEW_LABEL, shortCriterion, stepIndex, type CandidateRowView, type DisplayStatus } from "@/lib/view";
import { ScoreTrack, Status } from "./status";
import { Button, ButtonLink, EmptyState, Select } from "./ui";

type Filter = "all" | "review" | "shortlist" | "hold" | "email_ready" | "sent" | "not_shortlisted" | "processing" | "failed";

const SUMMARY: { key: Filter; label: string }[] = [
  { key: "all", label: "Candidates" },
  { key: "review", label: "Pending review" },
  { key: "shortlist", label: "Shortlisted" },
  { key: "hold", label: "Hold" },
  { key: "email_ready", label: "Email ready" },
  { key: "sent", label: "Sent" },
];

export function CandidateList({ rows, view, cross, totalCandidates }: { rows: CandidateRowView[]; view: Role | "all"; cross: boolean; totalCandidates: number }) {
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

  if (totalCandidates === 0) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState
          title="No candidates yet"
          body="Upload a CV to start screening your first candidate. It is scored against both the PM and SPM rubrics, and nothing is sent without your approval."
          action={
            <ButtonLink href="/upload" variant="primary" icon={<Upload className="size-4" aria-hidden />}>
              Upload CV
            </ButtonLink>
          }
        />
      </div>
    );
  }

  const extra = (["processing", "failed", "not_shortlisted"] as Filter[]).filter((k) => counts[k]);
  const otherRole = view === "PM" ? "SPM" : "PM";

  return (
    <section aria-label="Candidates">
      {/* Summary doubles as the status filter */}
      <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
        <div role="group" aria-label="Filter by status" className="-mx-1 flex gap-x-1 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
          {[...SUMMARY, ...extra.map((k) => ({ key: k, label: REVIEW_LABEL[k as DisplayStatus] }))].map((s) => {
            const active = status === s.key;
            return (
              <button
                key={s.key}
                type="button"
                aria-pressed={active}
                onClick={() => set("status", s.key)}
                className={cx(
                  "group flex shrink-0 flex-col items-start rounded-md px-3 py-2 text-left transition-colors duration-[var(--duration-fast)]",
                  active ? "bg-surface ring-1 ring-line shadow-[var(--shadow-raise)]" : "hover:bg-hover",
                )}
              >
                <span className={cx("tnum text-name font-semibold", active ? "text-ink" : "text-ink-2")}>{counts[s.key] ?? 0}</span>
                <span className={cx("text-meta", active ? "text-ink-2" : "text-muted")}>{s.label}</span>
              </button>
            );
          })}
        </div>

        <div className="grid shrink-0 grid-cols-2 items-center gap-2 pb-1 sm:flex sm:flex-wrap [&>*:first-child]:col-span-2 sm:[&>*:first-child]:col-span-1">
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
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="No candidates match"
          body={q ? `Nothing matches “${params.get("q")}” with the current filters.` : "Try a different status or score filter."}
          action={
            <Button variant="secondary" onClick={() => router.replace(view === "all" ? "/" : `/?role=${view}`, { scroll: false })}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <CandidateTable rows={visible} view={view} />
          <CandidateStack rows={visible} view={view} />
        </>
      )}
      <p className="mt-4 text-meta text-muted">
        {view === "all" ? "Scores are for the role each person applied to. Open a role to see its ranking." : `Scores are ${view} rubric scores; rank is among ${view} applicants.`} Scores are recommendations. Decisions are yours.
      </p>
    </section>
  );
}

function ScoreCell({ row }: { row: CandidateRowView }) {
  if (row.status === "processing") return <span className="skeleton inline-block h-3 w-12" aria-label="Scoring in progress" />;
  if (row.status === "failed") return <span className="text-sm text-muted">—</span>;
  return (
    <span className="flex items-center gap-2.5">
      <span className="tnum w-8 text-right text-[15px] font-semibold text-ink">{formatScore(row.score)}</span>
      <ScoreTrack value={row.score} className="hidden xl:block" />
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

function CandidateTable({ rows, view }: { rows: CandidateRowView[]; view: Role | "all" }) {
  const router = useRouter();
  const th = "px-3 py-2.5 text-left text-label font-medium text-muted whitespace-nowrap";
  return (
    <div className="mt-5 hidden md:block">
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
              <th scope="col" className={cx(th, "hidden lg:table-cell")}>
                Applied role
              </th>
            ) : null}
            <th scope="col" className={cx(th, "w-24")}>
              Score
            </th>
            <th scope="col" className={th}>
              Strength
            </th>
            <th scope="col" className={cx(th, "hidden lg:table-cell")}>
              Concern
            </th>
            <th scope="col" className={th}>
              Status
            </th>
            <th scope="col" className={cx(th, "hidden text-right xl:table-cell")}>
              Updated
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              onClick={(e) => {
                if (!(e.target as HTMLElement).closest("a")) router.push(`/candidates/${r.id}`);
              }}
              className="group cursor-pointer transition-colors duration-[var(--duration-fast)] hover:bg-surface [&>td]:border-t [&>td]:border-line"
            >
              {view !== "all" ? <td className="tnum py-3.5 pr-3 pl-2 text-right text-sm text-muted">{r.rank ?? "—"}</td> : null}
              <td className={cx("py-3.5 pr-3", view === "all" ? "pl-2" : "pl-3")}>
                <Link href={`/candidates/${r.id}`} className="inline-flex items-center gap-1 rounded-sm text-body font-medium whitespace-nowrap text-ink decoration-line-strong underline-offset-4 group-hover:underline">
                  {r.name}
                  <ArrowUpRight className="size-3.5 text-faint opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                </Link>
                {view !== "all" && r.role !== view ? <span className="ml-2 text-meta text-muted">applied {r.role}</span> : null}
                {view === "all" ? <span className="block text-meta text-muted lg:hidden">{ROLE_LABEL[r.role]}</span> : null}
              </td>
              {view === "all" ? <td className="hidden px-3 py-3.5 text-sm whitespace-nowrap text-ink-2 lg:table-cell">{ROLE_LABEL[r.role]}</td> : null}
              <td className="px-3 py-3.5">
                <ScoreCell row={r} />
              </td>
              <td className="max-w-52 truncate px-3 py-3.5 text-sm text-ink-2">{shortCriterion(r.strength) ?? <span className="text-muted">—</span>}</td>
              <td className="hidden max-w-52 truncate px-3 py-3.5 text-sm text-ink-2 lg:table-cell">{shortCriterion(r.concern) ?? <span className="text-muted">—</span>}</td>
              <td className="px-3 py-3.5">
                <StatusCell row={r} />
              </td>
              <td className="tnum hidden px-3 py-3.5 text-right text-meta whitespace-nowrap text-muted xl:table-cell">{formatRelative(r.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CandidateStack({ rows, view }: { rows: CandidateRowView[]; view: Role | "all" }) {
  return (
    <ul className="mt-4 divide-y divide-line border-t border-line md:hidden">
      {rows.map((r) => (
        <li key={r.id}>
          <Link href={`/candidates/${r.id}`} className="flex items-start gap-3 py-3.5 active:bg-hover">
            {view !== "all" ? <span className="tnum w-5 pt-0.5 text-right text-sm text-muted">{r.rank ?? "—"}</span> : null}
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-3">
                <span className="truncate text-body font-medium text-ink">{r.name}</span>
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
      ))}
    </ul>
  );
}
