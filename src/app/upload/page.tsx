import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { UploadPlate } from "@/components/flows/upload-plate";
import { PageHeader } from "@/components/shell";
import { UploadForm } from "@/components/upload-form";
import { PIPELINE_STEPS } from "@/lib/view";

export const metadata: Metadata = { title: "Screen a candidate" };

const row = "kh-lift grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3 border-b border-line py-3 text-sm";
const delay = (i: number) => ({ "--kh-delay": `${120 + i * 50}ms` }) as CSSProperties;

export default function UploadPage() {
  return (
    <>
      {/* Hero band: the editorial split. Text on the left, the petrol fog plate in the image slot on the right (never under text). */}
      <section className="relative -mx-4 mb-10 border-b border-line px-4 sm:-mx-8 sm:px-8 lg:-mx-12 lg:mb-12 lg:px-12">
        <div className="md:grid md:min-h-48 md:grid-cols-[minmax(0,1fr)_clamp(14rem,38%,30rem)] md:gap-10 xl:gap-16">
          <PageHeader title="Screen a candidate" description="Upload a CV and choose the role they applied for. Screening runs automatically; you decide what happens next." />
          <UploadPlate className="relative hidden md:-mr-8 md:block lg:-mr-12" />
        </div>
      </section>
      <div className="grid gap-12 xl:grid-cols-[minmax(0,48rem)_minmax(0,1fr)] xl:gap-16">
        <UploadForm />
        <aside aria-labelledby="next-steps" className="hidden xl:block">
          <h2 id="next-steps" className="text-name font-semibold tracking-[-0.01em] text-ink">
            What happens next
          </h2>
          <ol className="mt-3 border-t border-line">
            {PIPELINE_STEPS.map((s, i) => (
              <li key={s.label} className={row} style={delay(i)}>
                <span className="tnum text-muted">{i + 1}</span>
                <span className="text-ink-2">{s.label}</span>
              </li>
            ))}
            <li className={row} style={delay(PIPELINE_STEPS.length)}>
              <span className="tnum text-muted">{PIPELINE_STEPS.length + 1}</span>
              <span className="text-ink-2">Ready for your review. Nothing is sent without your click.</span>
            </li>
          </ol>
        </aside>
      </div>
    </>
  );
}
