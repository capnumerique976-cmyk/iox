/**
 * LOADING-SKELETON — Product detail page (/marketplace/products/[slug]).
 *
 * Matches the two-column layout: left gallery + right info panel.
 * Uses shimmer pulse animation consistent with DS Neon dark surfaces.
 */
export default function ProductDetailLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-2">
        <span className="h-3 w-16 rounded bg-white/10" />
        <span className="h-3 w-3 rounded bg-white/5" />
        <span className="h-3 w-24 rounded bg-white/10" />
        <span className="h-3 w-3 rounded bg-white/5" />
        <span className="h-3 w-32 rounded bg-white/10" />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_1fr]">
        {/* Gallery placeholder */}
        <div className="space-y-3">
          <div className="aspect-[4/3] w-full rounded-2xl bg-white/5" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 w-16 rounded-lg bg-white/5" />
            ))}
          </div>
        </div>

        {/* Info panel */}
        <div className="space-y-6">
          {/* Title + seller */}
          <div className="space-y-3">
            <div className="h-7 w-3/4 rounded bg-white/10" />
            <div className="h-4 w-1/3 rounded bg-white/5" />
          </div>

          {/* Price block */}
          <div className="iox-glass rounded-xl p-5 space-y-3">
            <div className="h-8 w-28 rounded bg-white/10" />
            <div className="h-4 w-40 rounded bg-white/5" />
            <div className="h-10 w-full rounded-lg bg-white/5" />
          </div>

          {/* Description block */}
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-white/5" />
            <div className="h-4 w-5/6 rounded bg-white/5" />
            <div className="h-4 w-2/3 rounded bg-white/5" />
          </div>

          {/* Specs table */}
          <div className="iox-glass rounded-xl p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <span className="h-3.5 w-24 rounded bg-white/5" />
                <span className="h-3.5 w-32 rounded bg-white/10" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Other products row */}
      <div className="space-y-4">
        <div className="h-5 w-48 rounded bg-white/10" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-square rounded-xl bg-white/5" />
              <div className="h-3.5 w-3/4 rounded bg-white/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
