export default function Loading() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
      {/* Page header skeleton */}
      <div className="mb-8">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-muted" />
      </div>
      {/* Grid skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex items-start justify-between">
              <div className="h-5 w-32 animate-pulse rounded bg-muted" />
              <div className="h-5 w-12 animate-pulse rounded-full bg-muted" />
            </div>
            <div className="mb-4 space-y-2">
              <div className="h-3 w-full animate-pulse rounded bg-muted" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
            </div>
            <div className="flex items-center justify-between">
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-8 w-20 animate-pulse rounded-lg bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
