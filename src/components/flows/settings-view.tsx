import { Check, Minus } from "lucide-react";
import { PageHeader } from "@/components/shell";
import { sumWeights } from "@/lib/scoring";
import { ROLE_LABEL, ROLES, type Role, type RubricCriterion } from "@/lib/types";
import { cx } from "@/lib/cx";

export interface SettingsViewProps { rubrics: Record<Role, RubricCriterion[]> | null; rubricError: string | null; checks: [string, boolean, string][]; redirectTo: string | null }

/** Presentational Settings page: the rubric and the connected services. Data arrives as props. */
export function SettingsView({ rubrics, rubricError, checks, redirectTo }: SettingsViewProps) {
  return (
    <>
      <PageHeader title="Settings" description="The rubric every CV is scored against, and the services this workspace is connected to." />

      <section aria-labelledby="rubric-title" className="max-w-4xl">
        <h2 id="rubric-title" className="text-name font-semibold text-ink">
          Rubric
        </h2>
        <p className="mt-1 max-w-[68ch] text-sm text-muted">
          Stored in the rubric_criteria table and never changed by the AI. To recalibrate with more hiring history, insert a new rubric_version and mark it active.
        </p>
        {rubricError ? <p className="mt-4 text-sm text-danger">{rubricError}</p> : null}
        {rubrics
          ? ROLES.map((role) => {
              const rubric = rubrics[role];
              const total = sumWeights(rubric);
              const ok = total === 100;
              return (
                <div key={role} className="mt-8">
                  <div className="mb-2 flex items-baseline justify-between gap-3">
                    <h3 className="text-sm font-semibold text-ink">{ROLE_LABEL[role]}</h3>
                    <span className={cx("tnum text-meta", ok ? "text-muted" : "font-medium text-danger")}>
                      v{rubric[0]?.rubric_version ?? "–"} · weights total {total}%{ok ? "" : ", must equal 100%"}
                    </span>
                  </div>
                  <ol className="border-t border-line">
                    {rubric.map((c) => (
                      <li key={c.id} className="grid grid-cols-[minmax(0,1fr)_3.5rem] gap-x-6 border-b border-line py-3 sm:grid-cols-[16rem_minmax(0,1fr)_3.5rem]">
                        <span className="text-sm font-medium text-ink">{c.criterion_name}</span>
                        <span className="col-span-2 row-start-2 mt-1 text-meta leading-relaxed text-muted sm:col-span-1 sm:row-start-1 sm:mt-0">{c.description}</span>
                        <span className="tnum text-right text-sm font-semibold text-ink sm:col-start-3 sm:row-start-1">{c.weight}%</span>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })
          : null}
      </section>

      <section aria-labelledby="services-title" className="mt-12 max-w-4xl">
        <h2 id="services-title" className="text-name font-semibold text-ink">
          Connected services
        </h2>
        <p className="mt-1 text-sm text-muted">Keys are read on the server only and are never shown here or sent to the browser.</p>
        <ul className="mt-4 border-t border-line">
          {checks.map(([name, ok, detail]) => (
            <li key={name} className="grid grid-cols-[1.25rem_7rem_minmax(0,1fr)] items-center gap-3 border-b border-line py-3 text-sm">
              {ok ? <Check className="size-4 text-accent" aria-label="Configured" /> : <Minus className="size-4 text-muted" aria-label="Not configured" />}
              <span className="font-medium text-ink">{name}</span>
              <span className={ok ? "text-ink-2" : "text-muted"}>{detail}</span>
            </li>
          ))}
          {redirectTo ? (
            <li className="grid grid-cols-[1.25rem_7rem_minmax(0,1fr)] items-center gap-3 border-b border-line py-3 text-sm">
              <span />
              <span className="font-medium text-warn">Test mode</span>
              <span className="text-ink-2">All email is delivered to {redirectTo} (EMAIL_REDIRECT_TO)</span>
            </li>
          ) : null}
        </ul>
      </section>
    </>
  );
}
