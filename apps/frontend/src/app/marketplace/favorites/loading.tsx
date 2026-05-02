/**
 * LOADING-SKELETON — Favorites page (/marketplace/favorites).
 *
 * Matches the header + favorited items list layout. DS Neon dark surfaces.
 */
export default function FavoritesLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-pulse">
      {/* Header card */}
      <div className="iox-glass-strong rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="h-7 w-36 rounded bg-white/10" />
            <div className="h-4 w-48 rounded bg-white/5" />
          </div>
          <div className="h-8 w-28 rounded-lg bg-white/5" />
        </div>
      </div>

      {/* Favorite items list */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="iox-glass rounded-xl p-4 flex items-center gap-4">
            <div className="h-16 w-16 shrink-0 rounded-lg bg-white/5" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-white/10" />
              <div className="h-3 w-1/2 rounded bg-white/5" />
            </div>
            <div className="h-8 w-8 rounded bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
