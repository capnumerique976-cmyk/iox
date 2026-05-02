'use client';

/**
 * LOADING-SKELETON — Dashboard layout loading state.
 *
 * Shown during route transitions within the (dashboard) group.
 * Matches the sidebar + main content area layout.
 * Uses the dark neon theme of the dashboard.
 */
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse p-4 sm:p-6">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-48 rounded bg-white/10" />
          <div className="h-4 w-32 rounded bg-white/5" />
        </div>
        <div className="h-9 w-28 rounded-lg bg-white/5" />
      </div>

      {/* Content area skeleton — generic card grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-white/10" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-3/4 rounded bg-white/10" />
                <div className="h-3 w-1/2 rounded bg-white/5" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-full rounded bg-white/5" />
              <div className="h-3 w-5/6 rounded bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
