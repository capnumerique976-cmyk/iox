/**
 * Sellers directory loading skeleton — shown during RSC streaming.
 */
export default function SellersLoading() {
  return (
    <div className="animate-pulse space-y-6 sm:space-y-8">
      {/* Hero skeleton */}
      <div className="iox-glass-strong rounded-2xl p-5 sm:p-8">
        <div className="max-w-2xl space-y-3">
          <div className="h-5 w-40 rounded-full bg-white/10" />
          <div className="h-9 w-64 rounded-lg bg-white/10" />
          <div className="h-4 w-80 max-w-full rounded bg-white/5" />
          <div className="mt-4 h-9 w-36 rounded-xl bg-white/5" />
        </div>
      </div>

      {/* Grid: filters + seller cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr] md:gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="hidden md:block">
          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-20 rounded bg-white/10" />
                <div className="h-9 w-full rounded-lg bg-white/5" />
              </div>
            ))}
          </div>
        </aside>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-5"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-white/10" />
                  <div className="h-3 w-1/2 rounded bg-white/5" />
                </div>
              </div>
              <div className="mt-4 space-y-1.5">
                <div className="h-3 w-full rounded bg-white/5" />
                <div className="h-3 w-2/3 rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
