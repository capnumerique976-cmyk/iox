/**
 * LOADING-SKELETON — Seller detail page (/marketplace/sellers/[slug]).
 *
 * Matches the seller hero (banner + avatar) + info sections layout.
 * Uses shimmer pulse animation consistent with DS Neon dark surfaces.
 */
export default function SellerDetailLoading() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-2">
        <span className="h-3 w-16 rounded bg-white/10" />
        <span className="h-3 w-3 rounded bg-white/5" />
        <span className="h-3 w-36 rounded bg-white/10" />
      </div>

      {/* Hero card */}
      <div className="iox-glass-strong overflow-hidden rounded-2xl">
        {/* Banner */}
        <div className="h-44 w-full bg-gradient-to-r from-white/5 to-white/[0.02]" />
        {/* Avatar + info row */}
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start">
          <div className="-mt-14 h-24 w-24 rounded-2xl border-4 border-[#0A0E1A] bg-white/10" />
          <div className="flex-1 space-y-3">
            <div className="h-7 w-48 rounded bg-white/10" />
            <div className="h-4 w-32 rounded bg-white/5" />
            <div className="h-4 w-full max-w-md rounded bg-white/5" />
          </div>
        </div>
      </div>

      {/* Info sections grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Description / about */}
        <div className="iox-glass rounded-xl p-5 space-y-3">
          <div className="h-5 w-24 rounded bg-white/10" />
          <div className="space-y-2">
            <div className="h-3.5 w-full rounded bg-white/5" />
            <div className="h-3.5 w-5/6 rounded bg-white/5" />
            <div className="h-3.5 w-2/3 rounded bg-white/5" />
          </div>
        </div>

        {/* Capabilities / logistics */}
        <div className="iox-glass rounded-xl p-5 space-y-3">
          <div className="h-5 w-32 rounded bg-white/10" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="h-4 w-4 rounded bg-white/5" />
              <span className="h-3.5 w-36 rounded bg-white/5" />
            </div>
          ))}
        </div>
      </div>

      {/* Products grid */}
      <div className="space-y-4">
        <div className="h-5 w-40 rounded bg-white/10" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="iox-glass rounded-xl overflow-hidden">
              <div className="aspect-[4/3] bg-white/5" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-3/4 rounded bg-white/5" />
                <div className="h-3 w-1/2 rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
