"use client";

import { AlertTriangle, ArrowRight, ChevronLeft, ChevronRight, Upload } from "lucide-react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import Link from "next/link";
import { Fragment, Suspense, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { arrive } from "@/components/motion/arrival";
import { gsap, useGSAP } from "@/components/motion/gsap";
import { barHeight } from "@/components/motion/scroll";
import { SearchBox } from "@/components/shell";
import { ScoreSegments, Status } from "@/components/status";
import { Button, buttonClass } from "@/components/ui";
import type { Role } from "@/lib/types";
import { formatRelative, formatScore, PIPELINE_STEPS, stepIndex, type CandidateRowView } from "@/lib/view";
import type { Entrance } from "./entrance";
import type { NextEvidence } from "./evidence";
import { MastheadFog } from "./masthead-fog";
import { Monogram } from "./monogram";
import type { QueueItem } from "./queue";

interface MastheadProps {
  title: string;
  rows: CandidateRowView[];
  view: Role | "all";
  total: number;
  queue: QueueItem[];
  current: QueueItem | null;
  onPin: (id: string) => void;
  evidence: Record<string, NextEvidence>;
  problem: boolean;
  linkBase: string;
  entrance: Entrance;
}

type Variant = "queue" | "screening" | "clear" | "empty" | "problem";

/** Criterion names sit mid-sentence: lower-case capitalised words, keep acronyms (PM, API) as they are. */
const inSentence = (s: string) => s.replace(/\b([A-Z])(?=[a-z])/g, (c) => c.toLowerCase());

const EASE = [0.22, 1, 0.36, 1] as const;
const swap: Variants = {
  enter: (d: number) => ({ opacity: 0, x: d * 6 }),
  center: { opacity: 1, x: 0 },
  exit: (d: number) => ({ opacity: 0, x: d * -6 }),
};

const PRIMARY_PRESS = "active:scale-[0.98]";

function statusFor(item: QueueItem) {
  const { row, kind } = item;
  if (kind === "review") return <Status status="review" label="Awaiting your decision" />;
  if (kind === "email_ready")
    return row.processing === "send_failed" ? <Status status="failed" label="Send failed" /> : <Status status="email_ready" label="Email ready to send" />;
  if (kind === "reply_owed")
    return row.status === "shortlist" ? (
      <Status status="shortlist" label="Shortlisted · invite not sent" />
    ) : (
      <Status status="not_shortlisted" label="Not shortlisted · reply not sent" />
    );
  return <Status status="hold" label="On hold" />;
}

/**
 * The headline, word by word, each word rising inside its own mask. Total <= 700ms (560ms rise plus <= 140ms stagger).
 * First load of a session: the global arrival CSS runs it from first paint. Client render: an inline animation.
 * Otherwise (later loads, pager swaps) the words are simply there.
 */
function RiseWords({ words, entrance }: { words: { text: string; strong?: boolean }[]; entrance: Entrance }) {
  const step = words.length > 1 ? Math.min(40, 140 / (words.length - 1)) : 0;
  return (
    <>
      {words.map((w, i) => {
        const delay = Math.round(i * step);
        const motionProps =
          entrance === "server"
            ? { "data-arrive": "rise", style: { animationDelay: `${delay}ms` } as CSSProperties }
            : entrance === "client"
              ? { style: { animation: `kh-rise var(--duration-rise) var(--ease-editorial) ${delay}ms backwards` } as CSSProperties }
              : {};
        return (
          <Fragment key={i}>
            {i > 0 ? " " : null}
            <span className="rise-mask inline-block align-bottom">
              <span className={w.strong ? "inline-block font-semibold" : "inline-block"} {...motionProps}>
                {w.text}
              </span>
            </span>
          </Fragment>
        );
      })}
    </>
  );
}

const sentence = (s: string) => s.split(" ").map((text) => ({ text }));

export function Masthead({ title, rows, view, total, queue, current, onPin, evidence, problem, linkBase, entrance }: MastheadProps) {
  const ref = useRef<HTMLElement>(null);
  const [dir, setDir] = useState(1);

  // Paradigm 1: the text column recedes (scrubbed) only while it slides under the sticky bar. The plate does not.
  useGSAP(
    () => {
      const section = ref.current;
      if (!section) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.to("[data-masthead-text]", {
          scale: 0.985,
          opacity: 0.3,
          yPercent: -4,
          transformOrigin: "0% 0%",
          ease: "none",
          scrollTrigger: {
            trigger: section, // the scope element itself: a scoped selector would only search its descendants
            start: () => `top top+=${barHeight()}`,
            end: () => `bottom top+=${barHeight()}`,
            scrub: 0.4,
            invalidateOnRefresh: true,
          },
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  const processing = rows.filter((r) => r.status === "processing");
  const failed = rows.filter((r) => r.status === "failed");
  const variant: Variant = problem ? "problem" : total === 0 ? "empty" : current ? "queue" : processing.length ? "screening" : "clear";

  // Kicker: the machine's part, kept apart from "Your decision".
  let kicker: string | null = null;
  if (variant === "problem") kicker = "Setup needed";
  else if (variant !== "empty" && rows.length) {
    const latest = rows.reduce((a, r) => (r.updatedAt > a ? r.updatedAt : a), rows[0].updatedAt);
    const rel = formatRelative(latest).replace(/^Just now$/, "just now");
    const n = `${rows.length} ${rows.length === 1 ? "candidate" : "candidates"}`;
    kicker = view === "all" ? `${n} · AI scores on each applicant's own rubric · updated ${rel}` : `${n} · ranked by AI score on the ${view} rubric · updated ${rel}`;
  }

  const attention = failed.length ? (
    <>
      {" "}
      {failed.length === 1 ? "1 CV needs attention:" : `${failed.length} CVs need attention:`}{" "}
      <Link href={linkBase + failed[0].id} className="rounded-sm text-ink underline decoration-line-strong underline-offset-4 transition-colors duration-[var(--duration-fast)] hover:decoration-ink-2">
        Open {failed[0].name} to retry
      </Link>
    </>
  ) : null;

  const i = current ? queue.findIndex((q) => q.row.id === current.row.id) : -1;
  const page = (step: 1 | -1) => {
    const next = queue[i + step];
    if (!next) return;
    setDir(step);
    onPin(next.row.id);
  };

  let headline = "";
  let body: ReactNode = null;
  let action: ReactNode = null;

  if (variant === "queue" && current) {
    const { row } = current;
    action = (
      <Link data-next-open href={linkBase + row.id} className={buttonClass("primary", "md", `group ${PRIMARY_PRESS}`)}>
        Open {row.name}
        <ArrowRight className="size-4 transition-transform duration-[var(--duration-base)] group-hover:translate-x-0.5" aria-hidden />
      </Link>
    );
  } else if (variant === "screening") {
    const one = processing.length === 1 ? processing[0] : null;
    headline = "Nothing is waiting on you yet.";
    body = (
      <p data-next-why className="mt-3 max-w-[68ch] text-standfirst text-pretty text-ink-2">
        {one
          ? `${one.name} is being screened, step ${Math.min(stepIndex(one.processing) + 1, PIPELINE_STEPS.length)} of ${PIPELINE_STEPS.length}. The score appears here when it finishes.`
          : `${processing.length} CVs are being screened. Scores appear here as each finishes.`}
        {attention}
      </p>
    );
  } else if (variant === "clear") {
    headline = "Your queue is clear.";
    body = (
      <p data-next-why className="mt-3 max-w-[68ch] text-standfirst text-pretty text-ink-2">
        Every decided candidate has been emailed. Upload a CV to keep screening.{attention}
      </p>
    );
    action = <UploadAction />;
  } else if (variant === "empty") {
    headline = "No candidates yet.";
    body = (
      <p data-next-why className="mt-3 max-w-[68ch] text-standfirst text-pretty text-ink-2">
        Upload a CV to start screening your first candidate. It is scored against both the PM and SPM rubrics, and nothing is sent without your approval.
      </p>
    );
    action = <UploadAction />;
  } else {
    headline = "Nothing to review until the database is connected.";
    body = <p data-next-why className="mt-3 max-w-[68ch] text-standfirst text-pretty text-ink-2">The missing settings are listed below.</p>;
  }

  const pager =
    variant === "queue" && queue.length > 0 ? (
      <div data-pager role="group" aria-label="Queue" className="tnum flex items-center gap-1 text-meta text-ink-2">
        {queue.length > 1 ? (
          <Button size="sm" variant="ghost" aria-label="Previous in queue" aria-controls="next-region" disabled={i <= 0} onClick={() => page(-1)} className="w-7 px-0" icon={<ChevronLeft className="size-4" aria-hidden />} />
        ) : null}
        <span className="px-1">
          {i + 1} of {queue.length} waiting on you
        </span>
        {queue.length > 1 ? (
          <Button size="sm" variant="ghost" aria-label="Next in queue" aria-controls="next-region" disabled={i >= queue.length - 1} onClick={() => page(1)} className="w-7 px-0" icon={<ChevronRight className="size-4" aria-hidden />} />
        ) : null}
      </div>
    ) : null;

  return (
    <section ref={ref} data-masthead aria-labelledby="page-title" className="relative -mx-4 border-b border-line-strong px-4 pt-6 pb-6 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12 lg:pt-7 lg:pb-7">
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_clamp(12rem,26%,24rem)] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_clamp(16rem,30%,24rem)] xl:gap-12">
        <div data-masthead-text className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <h1 id="page-title" className="text-name font-semibold tracking-[-0.01em] text-ink">
              {title}
            </h1>
            {kicker ? (
              <p className="tnum text-meta text-ink-2" suppressHydrationWarning>
                {kicker}
              </p>
            ) : null}
          </div>
          {/* One grid cell holds the live item plus invisible sizers for every other queue item, so paging never moves the action row. */}
          <div id="next-region" aria-live="polite" aria-atomic="true" className="grid">
            <div className="min-w-0 [grid-area:1/1]">
              <AnimatePresence mode="wait" initial={false} custom={dir}>
                <motion.div key={current?.row.id ?? variant} custom={dir} variants={swap} initial="enter" animate="center" exit="exit" transition={{ duration: 0.11, ease: EASE }}>
                  {variant === "queue" && current ? (
                    <QueueCopy item={current} rows={rows} ev={evidence[current.row.id]} live entrance={entrance} />
                  ) : (
                    <>
                      <p data-next-name className="mt-3 max-w-5xl text-display text-balance text-ink [overflow-wrap:anywhere]">
                        <RiseWords words={sentence(headline)} entrance={entrance} />
                      </p>
                      <div {...(entrance === "server" ? arrive("lift", { delay: 30 }) : {})}>{body}</div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
            {variant === "queue" && queue.length > 1
              ? queue.map((q) => (
                  <div key={q.row.id} aria-hidden inert className="pointer-events-none min-w-0 opacity-0 select-none [grid-area:1/1]">
                    <QueueCopy item={q} rows={rows} ev={evidence[q.row.id]} live={false} entrance="none" />
                  </div>
                ))
              : null}
          </div>
          {variant === "queue" && attention ? <p className="mt-3 text-sm text-ink-2">{attention}</p> : null}
          {action || pager ? (
            <div {...arrive("lift", { delay: 30 })} className="mt-[18px] flex flex-wrap items-center justify-between gap-3">
              {action}
              {pager}
            </div>
          ) : null}
          <div className="mt-4 sm:hidden">
            <Suspense>
              <SearchBox className="w-full" />
            </Suspense>
          </div>
        </div>
        <div aria-hidden className="relative hidden lg:-my-7 lg:-mr-12 lg:block">
          <MastheadFog className="absolute inset-0" />
        </div>
      </div>
    </section>
  );
}

/** Headline, status row, why line and quote for one queue item. `live` carries the data hooks and entrance motion; sizers get neither. */
function QueueCopy({ item, rows, ev, live, entrance }: { item: QueueItem; rows: CandidateRowView[]; ev: NextEvidence | undefined; live: boolean; entrance: Entrance }) {
  const { row } = item;
  const pool = rows.filter((r) => r.role === row.role && r.rank !== null).length;
  const hook = (name: string) => (live ? { [`data-next-${name}`]: "" } : {});
  const words = [...row.name.split(" ").map((text) => ({ text, strong: true })), { text: "is" }, { text: "next." }];
  return (
    <>
      <div className="mt-3 flex items-center gap-3.5 sm:gap-4">
        <Monogram name={row.name} status={row.status} size="lg" />
        <p {...hook("name")} className="min-w-0 max-w-5xl text-display text-balance text-ink [overflow-wrap:anywhere]">
          <RiseWords words={words} entrance={live ? entrance : "none"} />
        </p>
      </div>
      <div {...(live && entrance === "server" ? arrive("lift", { delay: 30 }) : {})}>
        {/* Every separator lives inside the following item's nowrap span, so no line ever ends on a dot. */}
        <div {...hook("status")} className="tnum mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-2">
          {statusFor(item)}
          <span className="whitespace-nowrap">
            <span aria-hidden className="mr-2">
              ·
            </span>
            {formatScore(row.score)} on the {row.role} rubric
          </span>
          {row.rank !== null ? (
            <span className="whitespace-nowrap">
              <span aria-hidden className="mr-2">
                ·
              </span>
              rank {row.rank} of {pool} {row.role} applicants
            </span>
          ) : null}
        </div>
        {ev ? (
          <p {...hook("why")} className="mt-1.5 max-w-[68ch] text-standfirst text-pretty text-ink-2">
            Strongest on {inSentence(ev.strength)}
            {/* Two unbreakable clauses: when the line must wrap, it wraps between them and never strands a figure. */}
            <span className="whitespace-nowrap">
              <ScoreSegments score={ev.strengthScore} className="mx-1.5 align-middle" />
              <span className="tnum">{ev.strengthScore}/5</span>
              {ev.concern ? ";" : null}
            </span>
            {ev.concern ? (
              <>
                {" "}
                <span className="whitespace-nowrap">
                  probe {inSentence(ev.concern)} <span className="tnum">{ev.concernScore}/5</span>
                </span>
              </>
            ) : null}
          </p>
        ) : null}
        {ev?.quote ? (
          <figure {...hook("quote")} className="mt-3 max-w-[72ch] border-l border-line-strong pl-3.5">
            <blockquote className="line-clamp-3 text-body text-ink sm:line-clamp-2">“{ev.quote}”</blockquote>
            <figcaption className="mt-1.5 flex flex-wrap items-center gap-x-2 text-meta text-ink-2">
              Evidence from CV <span aria-hidden>·</span>{" "}
              <span className="tnum">
                {formatScore(ev.points)} of {formatScore(ev.weight)} points
              </span>
              {!ev.verified ? (
                <span className="inline-flex items-center gap-1 text-warn">
                  <AlertTriangle className="size-3.5" aria-hidden /> Not found word-for-word in the CV. Check the original.
                </span>
              ) : null}
            </figcaption>
          </figure>
        ) : null}
      </div>
    </>
  );
}

function UploadAction() {
  return (
    <Link data-next-open href="/upload" className={buttonClass("primary", "md", PRIMARY_PRESS)}>
      <Upload className="size-4" aria-hidden />
      Upload CV
    </Link>
  );
}
