import { cn } from "@/lib/utils"

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-muted", className)} />
}

export function StoreSkeleton({ template = "modern" }: { template?: string }) {
  return (
    <div className="min-h-screen bg-background">
      {template === "modern" && <ModernSkeleton />}
      {template === "express" && <ExpressSkeleton />}
      {template === "delivery" && <DeliverySkeleton />}
      {template === "premium" && <PremiumSkeleton />}
    </div>
  )
}

function ModernSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonBlock className="h-52 w-full md:h-72 rounded-none" />
      <div className="mx-auto max-w-6xl px-4">
        <div className="-mt-16 flex flex-col items-center sm:flex-row sm:items-end gap-3 sm:gap-5">
          <SkeletonBlock className="size-32 shrink-0 rounded-full sm:size-36" />
          <div className="space-y-2 text-center sm:text-left">
            <SkeletonBlock className="h-5 w-48" />
            <SkeletonBlock className="h-3 w-32" />
          </div>
        </div>
        <div className="mt-6 flex gap-4">
          <SkeletonBlock className="h-10 w-full max-w-md" />
          <SkeletonBlock className="h-10 w-40" />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <SkeletonBlock className="aspect-square w-full" />
              <SkeletonBlock className="h-3 w-3/4" />
              <SkeletonBlock className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ExpressSkeleton() {
  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-30 border-b border-border bg-background/95">
        <div className="mx-auto max-w-7xl flex items-center gap-3 px-4 py-3">
          <SkeletonBlock className="size-10 rounded-lg" />
          <SkeletonBlock className="h-10 flex-1 max-w-xl rounded-xl" />
          <SkeletonBlock className="size-10 rounded-full" />
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-2 flex gap-2">
          <SkeletonBlock className="h-8 w-20 rounded-full" />
          <SkeletonBlock className="h-8 w-24 rounded-full" />
          <SkeletonBlock className="h-8 w-20 rounded-full" />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <SkeletonBlock className="aspect-square w-full" />
            <SkeletonBlock className="h-3 w-3/4" />
            <SkeletonBlock className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  )
}

function DeliverySkeleton() {
  return (
    <div className="space-y-4">
      <SkeletonBlock className="h-64 w-full rounded-none sm:h-80" />
      <div className="mx-auto max-w-6xl px-4">
        <SkeletonBlock className="h-12 w-full rounded-xl -mt-6" />
        <div className="mt-6 flex gap-2">
          <SkeletonBlock className="h-8 w-20 rounded-full" />
          <SkeletonBlock className="h-8 w-24 rounded-full" />
          <SkeletonBlock className="h-8 w-28 rounded-full" />
        </div>
        <div className="mt-6 space-y-8">
          {Array.from({ length: 2 }).map((_, s) => (
            <div key={s}>
              <SkeletonBlock className="h-5 w-32 mb-4" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <SkeletonBlock className="aspect-square w-full" />
                    <SkeletonBlock className="h-3 w-3/4" />
                    <SkeletonBlock className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PremiumSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonBlock className="h-screen w-full rounded-none" />
      <div className="mx-auto max-w-7xl px-6 space-y-8">
        <div className="text-center space-y-3">
          <SkeletonBlock className="h-3 w-24 mx-auto" />
          <SkeletonBlock className="h-8 w-48 mx-auto" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={i} className="aspect-[4/3] w-full rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <SkeletonBlock className="aspect-square w-full" />
              <SkeletonBlock className="h-3 w-3/4" />
              <SkeletonBlock className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
