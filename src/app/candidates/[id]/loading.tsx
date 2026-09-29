import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="pt-6 lg:pt-8" aria-busy="true" aria-label="Loading candidate">
      <Skeleton className="h-4 w-24" />
      <div className="mt-8 border-b border-line pb-6">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      </div>
      <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <div className="flex gap-10">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-16" />
            <Skeleton className="h-10 w-16" />
          </div>
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
