export default function StoreLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground animate-pulse">
      {/* 1. Banner Skeleton */}
      <div className="h-52 w-full bg-slate-200 md:h-72" />

      {/* 2. Logo + Info Skeleton */}
      <div className="mx-auto max-w-6xl px-4">
        <div className="relative -mt-16 flex flex-col items-center sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="flex flex-col items-center sm:flex-row sm:items-end gap-3 sm:gap-5">
            {/* Circular logo */}
            <div className="size-32 rounded-full border-4 border-background bg-slate-300 sm:size-36" />
            
            {/* Info details */}
            <div className="space-y-2 text-center sm:text-left pb-2">
              <div className="h-6 w-48 rounded bg-slate-300 mx-auto sm:mx-0" />
              <div className="h-4 w-36 rounded bg-slate-200 mx-auto sm:mx-0" />
              <div className="h-3.5 w-24 rounded bg-slate-200 mx-auto sm:mx-0" />
            </div>
          </div>
          
          {/* Button skeleton */}
          <div className="h-9 w-24 rounded-full bg-slate-300" />
        </div>
      </div>

      {/* 3. Navigation Skeleton */}
      <div className="mx-auto max-w-6xl px-4 mt-8">
        <hr className="border-slate-100" />
        <div className="flex items-center justify-between py-4">
          <div className="flex gap-2">
            <div className="size-9 rounded-full bg-slate-200" />
            <div className="size-9 rounded-full bg-slate-200" />
          </div>
          <div className="flex gap-4">
            <div className="h-4 w-16 rounded bg-slate-300" />
            <div className="h-4 w-20 rounded bg-slate-200" />
            <div className="h-4 w-20 rounded bg-slate-200" />
          </div>
        </div>
        <hr className="border-slate-100" />
      </div>

      {/* 4. Products Grid Skeleton */}
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex flex-col overflow-hidden rounded-xl border border-slate-100 bg-card p-3 space-y-3">
              {/* Product Image */}
              <div className="aspect-square w-full rounded-lg bg-slate-200" />
              {/* Title */}
              <div className="h-4 w-3/4 rounded bg-slate-300" />
              {/* Pricing */}
              <div className="space-y-1.5 pt-1">
                <div className="h-5 w-1/3 rounded bg-slate-300" />
                <div className="h-3 w-1/2 rounded bg-slate-200" />
              </div>
              {/* Button */}
              <div className="h-9 w-full rounded-lg bg-slate-200 pt-1" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
