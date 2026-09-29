import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="pt-8 lg:pt-10" aria-busy="true" aria-label="Loading candidates">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="mt-2.5 h-4 w-80 max-w-full" />
      <div className="mt-10 flex gap-6 border-b border-line pb-4">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i}>
            <Skeleton className="h-5 w-8" />
            <Skeleton className="mt-1.5 h-3 w-20" />
          </div>
        ))}
      </div>
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className="flex items-center gap-6 border-b border-line py-4">
          <Skeleton className="h-3.5 w-5" />
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="hidden h-3.5 w-36 md:block" />
          <Skeleton className="hidden h-3.5 w-36 lg:block" />
          <Skeleton className="ml-auto h-3.5 w-20" />
        </div>
      ))}
    </div>
  );
}
