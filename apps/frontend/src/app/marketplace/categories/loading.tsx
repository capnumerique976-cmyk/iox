/**
 * LOADING-SKELETON — Categories page (/marketplace/categories).
 *
 * Matches the hero + category grid layout. DS Neon dark surfaces.
 */
export default function CategoriesLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <span className="h-3 w-16 rounded bg-white/10" />
        <span className="h-3 w-3 rounded bg-white/5" />
        <span className="h-3 w-24 rounded bg-white/10" />
      </div>

      {/* Hero */}
      <div className="iox-glass-strong rounded-2xl p-6 sm:p-8">
        <div className="h-8 w-52 rounded bg-white/10" />
        <div className="mt-3 h-4 w-80 rounded bg-white/5" />
      </div>

      {/* Category grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="iox-glass rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-white/10" />
              <div className="h-5 w-32 rounded bg-white/10" />
            </div>
            <div className="space-y-1.5 pl-[52px]">
              <div className="h-3 w-24 rounded bg-white/5" />
              <div className="h-3 w-20 rounded bg-white/5" />
              <div className="h-3 w-28 rounded bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
