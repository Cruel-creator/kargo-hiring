import { FOG_STILL } from "@/components/dashboard/fog-still";
import { Skeleton } from "@/components/ui";

/** Mirrors the dashboard geometry (masthead, stage flow, 52px rows) so nothing shifts when data lands. No Vanta here. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading candidates">
      <div className="relative -mx-4 border-b border-line-strong px-4 pt-6 pb-6 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12 lg:pt-7 lg:pb-7">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_clamp(12rem,26%,24rem)] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_clamp(16rem,30%,24rem)] xl:gap-12">
          <div className="min-w-0">
            <Skeleton className="h-3 w-52" />
            <div className="mt-4 flex items-center gap-4">
              <Skeleton className="size-10 shrink-0 rounded-full sm:size-11" />
              <Skeleton className="h-10 w-[460px] max-w-full" />
            </div>
            <Skeleton className="mt-4 h-3.5 w-[360px] max-w-full" />
            <Skeleton className="mt-2.5 h-4 w-[480px] max-w-full" />
            <div className="mt-4 border-l border-line-strong pl-3.5">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="mt-2 h-3.5 w-2/3" />
            </div>
            <Skeleton className="mt-5 h-8.5 w-44" />
          </div>
          <div aria-hidden className="relative hidden lg:-my-7 lg:-mr-12 lg:block">
            <div className="fog absolute inset-0" data-fog="still" style={FOG_STILL} aria-hidden />
          </div>
        </div>
      </div>
      <div className="mt-6 flex overflow-hidden border-y border-line lg:mt-7">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className={i > 0 ? "min-w-[8.5rem] flex-1 border-l border-line px-4 pt-4 pb-2" : "min-w-[8.5rem] flex-1 px-4 pt-4 pb-2"}>
            <Skeleton className="h-1.5 w-full" />
            <Skeleton className="mt-3 h-5 w-24" />
            <Skeleton className="mt-2 h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="mt-4">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex h-[52px] items-center gap-6 border-b border-line">
            <Skeleton className="size-7 shrink-0 rounded-full" />
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="hidden h-3.5 w-36 md:block" />
            <Skeleton className="hidden h-3.5 w-36 lg:block" />
            <Skeleton className="ml-auto h-3.5 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
