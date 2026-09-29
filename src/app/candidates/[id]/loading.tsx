import { Skeleton } from "@/components/ui";

/** Mirrors the candidate page geometry (back link, editorial header, body grid) so nothing shifts on arrival. */
export default function Loading() {
  return (
    <div className="pt-6 lg:pt-8" aria-busy="true" aria-label="Loading candidate">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3.5 w-full sm:w-[460px]" />
      </div>
      <div className="grid gap-x-16 gap-y-5 border-b border-line-strong pb-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="flex min-w-0 items-start gap-4 sm:gap-5">
          <Skeleton className="mt-0.5 size-11 shrink-0 rounded-full sm:size-14" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-10 w-[360px] max-w-full" />
            <Skeleton className="mt-4 h-4 w-96 max-w-full" />
            <Skeleton className="mt-3 h-4 w-72 max-w-full" />
          </div>
        </div>
        <div className="hidden gap-1.5 lg:flex">
          <Skeleton className="h-8.5 w-24" />
          <Skeleton className="h-8.5 w-24" />
          <Skeleton className="h-8.5 w-24" />
        </div>
      </div>
      <div className="mt-8 grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(340px,400px)]">
        <div className="min-w-0">
          <Skeleton className="h-5 w-28" />
          <div className="mt-5 flex gap-10">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-9 w-40" />
          </div>
          <Skeleton className="mt-6 h-2 w-full" />
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="mt-6 border-b border-line pb-6">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="mt-3 h-3.5 w-full" />
              <Skeleton className="mt-2 h-3.5 w-2/3" />
            </div>
          ))}
        </div>
        <div>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-4 h-20 w-full" />
          <Skeleton className="mt-8 h-64 w-full" />
        </div>
      </div>
    </div>
  );
}
