import Link from "next/link";
import { ButtonLink } from "@/components/ui";
import { cx } from "@/lib/cx";
import "@/components/flows/flows.css";

/** Decorative ledger: three ruled entries and the one that is not there. Neutral bars only, no names, no faces. */
const LEDGER: ({ name: string; score: number; figure: string } | null)[] = [
  { name: "w-[62%]", score: 5, figure: "w-7" },
  { name: "w-[48%]", score: 4, figure: "w-6" },
  null,
  { name: "w-[55%]", score: 2, figure: "w-6" },
];

function Segments({ score }: { score: number }) {
  return (
    <span className="inline-flex gap-[3px]">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={cx("h-1.5 w-3.5 rounded-[2px]", i < score ? (score >= 4 ? "bg-accent-line" : "bg-line-strong") : "bg-line")} />
      ))}
    </span>
  );
}

/** The 404 page body. The root not-found says "Page not found"; the candidate route passes its own copy. */
export function NotFoundView({ title, body }: { title: string; body: string }) {
  return (
    <div className="kh-lift grid max-w-5xl gap-12 pt-16 md:grid-cols-[minmax(0,1fr)_minmax(0,19rem)] md:gap-16 lg:pt-20">
      <div className="border-t border-line pt-8">
        <p className="tnum text-meta text-muted">Error 404 · no record at this address</p>
        <h1 className="mt-3 text-headline text-ink">{title}</h1>
        <p className="mt-2 max-w-[60ch] text-standfirst text-pretty text-ink-2">{body}</p>
        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
          <ButtonLink href="/">Back to candidates</ButtonLink>
          <Link href="/upload" className="rounded-sm text-sm text-ink-2 underline decoration-line-strong underline-offset-4 transition-colors duration-[var(--duration-fast)] hover:text-ink hover:decoration-ink-2">
            Screen a new CV
          </Link>
        </div>
      </div>
      <figure aria-hidden className="border-t border-line-strong pt-4 md:pt-8">
        <ol>
          {LEDGER.map((row, i) =>
            row ? (
              <li key={i} className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto_2rem] items-center gap-3 border-b border-line py-3.5">
                <span className="tnum text-meta text-faint">{i + 1}</span>
                <span className={cx("h-2 rounded-[2px] bg-line-strong", row.name)} />
                <Segments score={row.score} />
                <span className={cx("h-2 justify-self-end rounded-[2px] bg-line", row.figure)} />
              </li>
            ) : (
              <li key={i} className="my-1.5 flex items-center gap-3 rounded-md border border-dashed border-line-strong px-3 py-2.5">
                <span className="tnum text-meta text-faint">{i + 1}</span>
                <span className="text-meta text-muted">Not in the ledger</span>
              </li>
            ),
          )}
        </ol>
      </figure>
    </div>
  );
}
