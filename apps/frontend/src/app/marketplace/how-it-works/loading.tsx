/**
 * LOADING-SKELETON — How-it-works page (/marketplace/how-it-works).
 *
 * Matches the 4-step visual layout + trust section. DS Neon dark surfaces.
 */
export default function HowItWorksLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-12 px-4 py-8 animate-pulse">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <span className="h-3 w-16 rounded bg-white/10" />
        <span className="h-3 w-3 rounded bg-white/5" />
        <span className="h-3 w-32 rounded bg-white/10" />
      </div>

      {/* Hero */}
      <div className="text-center space-y-3">
        <div className="mx-auto h-9 w-72 rounded bg-white/10" />
        <div className="mx-auto h-4 w-96 max-w-full rounded bg-white/5" />
      </div>

      {/* 4 Steps */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="iox-glass rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-white/10" />
              <div className="h-5 w-28 rounded bg-white/10" />
            </div>
            <div className="space-y-2">
              <div className="h-3.5 w-full rounded bg-white/5" />
              <div className="h-3.5 w-4/5 rounded bg-white/5" />
            </div>
          </div>
        ))}
      </div>

      {/* Trust section */}
      <div className="iox-glass-strong rounded-2xl p-8 space-y-4">
        <div className="h-6 w-40 rounded bg-white/10" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-8 w-8 rounded bg-white/5" />
              <div className="h-4 w-24 rounded bg-white/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
