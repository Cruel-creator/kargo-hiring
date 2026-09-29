import type { CSSProperties } from "react";
import AnimatedContent from "@/components/bits/AnimatedContent";
import { PageHeader } from "@/components/shell";
import { WeightRibbon } from "@/components/ui";
import { sumWeights } from "@/lib/scoring";
import { ROLE_LABEL, ROLES, type Role, type RubricCriterion } from "@/lib/types";
import { cx } from "@/lib/cx";
import "./flows.css";

export interface SettingsViewProps { rubrics: Record<Role, RubricCriterion[]> | null; rubricError: string | null; checks: [string, boolean, string][]; redirectTo: string | null }

/** Row arrival: a CSS lift with a small stagger that starts after the ribbon has begun to grow. */
const rowDelay = (i: number) => ({ "--kh-delay": `${160 + i * 45}ms` }) as CSSProperties;

function RubricBlock({ role, rubric }: { role: Role; rubric: RubricCriterion[] }) {
  const total = sumWeights(rubric);
  const ok = total === 100;
  return (
    <>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink">{ROLE_LABEL[role]}</h3>
        <span className={cx("tnum text-meta", ok ? "text-muted" : "font-medium text-danger")}>
          v{rubric[0]?.rubric_version ?? "–"} · weights total {total}%{ok ? "" : ", must equal 100%"}
        </span>
      </div>
      {/* kh-ribbon (flows.css): solid slices that grow in from the left, and figures set beside their names. */}
      <WeightRibbon mode="weights" className="kh-ribbon mb-3" label={`${ROLE_LABEL[role]} rubric weights`} items={rubric.map((c) => ({ id: c.id, name: c.criterion_name, weight: c.weight }))} />
      <ol className="border-t border-line">
        {rubric.map((c, i) => (
          <li key={c.id} className="kh-lift grid grid-cols-[minmax(0,1fr)_3.5rem] gap-x-6 border-b border-line py-3 sm:grid-cols-[16rem_minmax(0,1fr)_3.5rem]" style={rowDelay(i)}>
            <span className="text-sm font-medium text-ink sm:col-start-1 sm:row-start-1">{c.criterion_name}</span>
            <span className="col-span-2 row-start-2 mt-1 text-meta leading-relaxed text-muted sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:mt-0">{c.description}</span>
            <span className="tnum text-right text-sm font-semibold text-ink sm:col-start-3 sm:row-start-1">{c.weight}%</span>
          </li>
        ))}
      </ol>
    </>
  );
}

/** Service state: a dot with a word, never colour alone. */
function ServiceState({ tone, label }: { tone: "ok" | "off" | "warn"; label: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 text-meta font-medium whitespace-nowrap", tone === "ok" ? "text-accent" : tone === "warn" ? "text-warn" : "text-muted")}>
      <span
        aria-hidden
        className={cx("inline-block size-2 shrink-0 rounded-full", tone === "ok" ? "bg-accent" : tone === "warn" ? "bg-warn-dot" : "border border-faint bg-transparent")}
      />
      {label}
    </span>
  );
}

const serviceRow = "grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-0.5 border-b border-line py-3 text-sm sm:grid-cols-[8rem_minmax(0,1fr)_auto]";

/** Presentational Settings page: the rubric and the connected services. Data arrives as props. */
export function SettingsView({ rubrics, rubricError, checks, redirectTo }: SettingsViewProps) {
  return (
    <>
      <PageHeader title="Settings" description="The rubric every CV is scored against, and the services this workspace is connected to." />

      <section aria-labelledby="rubric-title" className="max-w-5xl">
        <h2 id="rubric-title" className="text-name font-semibold tracking-[-0.01em] text-ink">
          Rubric
        </h2>
        <p className="mt-1 max-w-[68ch] text-sm text-muted">
          Stored in the rubric_criteria table and never changed by the AI. To recalibrate with more hiring history, insert a new rubric_version and mark it active.
        </p>
        {rubricError ? <p className="mt-4 max-w-[80ch] text-sm text-danger">{rubricError}</p> : null}
        {rubrics
          ? ROLES.map((role) =>
              role === "SPM" ? (
                <AnimatedContent key={role} className="mt-10">
                  <RubricBlock role={role} rubric={rubrics[role]} />
                </AnimatedContent>
              ) : (
                <div key={role} className="mt-8">
                  <RubricBlock role={role} rubric={rubrics[role]} />
                </div>
              ),
            )
          : null}
      </section>

      <AnimatedContent className="mt-14">
        <section aria-labelledby="services-title" className="max-w-5xl">
          <h2 id="services-title" className="text-name font-semibold tracking-[-0.01em] text-ink">
            Connected services
          </h2>
          <p className="mt-1 text-sm text-muted">Keys are read on the server only and are never shown here or sent to the browser.</p>
          <ul className="mt-4 border-t border-line">
            {checks.map(([name, ok, detail]) => (
              <li key={name} className={serviceRow}>
                <span className="font-medium text-ink">{name}</span>
                <span className="col-start-2 row-start-1 justify-self-end sm:col-start-3">
                  <ServiceState tone={ok ? "ok" : "off"} label={ok ? "Connected" : "Not set"} />
                </span>
                <span className={cx("col-span-2 sm:col-span-1 sm:col-start-2 sm:row-start-1", ok ? "text-ink-2" : "text-muted")}>{detail}</span>
              </li>
            ))}
            {redirectTo ? (
              <li className={serviceRow}>
                <span className="font-medium text-ink">Test mode</span>
                <span className="col-start-2 row-start-1 justify-self-end sm:col-start-3">
                  <ServiceState tone="warn" label="Redirecting" />
                </span>
                <span className="col-span-2 text-ink-2 sm:col-span-1 sm:col-start-2 sm:row-start-1">All email is delivered to {redirectTo} (EMAIL_REDIRECT_TO)</span>
              </li>
            ) : null}
          </ul>
        </section>
      </AnimatedContent>
    </>
  );
}
