/**
 * Marketplace catalog loading skeleton — shown during RSC streaming.
 * Matches the layout of the catalog page: hero + grid with filter aside.
 */
export default function MarketplaceLoading() {
  return (
    <div className="animate-pulse space-y-6 sm:space-y-8">
      {/* Hero skeleton */}
      <div className="iox-glass-strong rounded-2xl p-5 sm:p-8">
        <div className="max-w-2xl space-y-3">
          <div className="h-5 w-36 rounded-full bg-white/10" />
          <div className="h-9 w-72 rounded-lg bg-white/10" />
          <div className="h-4 w-96 max-w-full rounded bg-white/5" />
          <div className="mt-4 flex gap-3">
            <div className="h-9 w-32 rounded-xl bg-white/5" />
            <div className="h-9 w-28 rounded-xl bg-white/5" />
          </div>
        </div>
      </div>

      {/* Grid: filters aside + product cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr] md:gap-8 lg:grid-cols-[280px_1fr]">
        {/* Filters skeleton */}
        <aside className="hidden md:block">
          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-20 rounded bg-white/10" />
                <div className="h-9 w-full rounded-lg bg-white/5" />
              </div>
            ))}
          </div>
        </aside>

        {/* Product cards skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"
            >
              <div className="aspect-[4/3] w-full bg-white/5" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-16 rounded-full bg-white/10" />
                <div className="h-4 w-3/4 rounded bg-white/10" />
                <div className="h-3 w-1/2 rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
