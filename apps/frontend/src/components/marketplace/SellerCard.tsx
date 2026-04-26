import Link from 'next/link';
import { Star, MapPin, Package } from 'lucide-react';
import type { PublicSeller } from '@/lib/marketplace/types';

/**
 * MP-S-INDEX — Carte cliquable de l'annuaire public seller.
 *
 * Style aligné avec `ProductCard` (DS Neon, glass cards). Pas d'image média
 * réelle pour l'instant : on utilise `logoMediaId`/`bannerMediaId` comme
 * indicateurs binaires (présent/absent) — la route signée des médias publics
 * n'étant pas encore appelable depuis cette page (hors-scope MP-S-INDEX).
 * Quand un media URL helper public sera disponible, on hydrate.
 */
export function SellerCard({ seller }: { seller: PublicSeller }) {
  const initials = computeInitials(seller.publicDisplayName);
  const incoterms = readStringList(seller.supportedIncoterms);
  const firstIncoterm = incoterms[0] ?? null;
  const cityLine = [seller.cityOrZone, seller.region].filter(Boolean).join(', ');

  return (
    <Link
      href={`/marketplace/sellers/${seller.slug}`}
      data-testid={`seller-card-${seller.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[rgba(18,22,31,0.7)] shadow-lg shadow-black/20 backdrop-blur-xl transition-all duration-base ease-premium hover:-translate-y-1 hover:border-[#00D4FF]/50 hover:shadow-glow-cyan-sm"
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-iox-neon opacity-0 transition-opacity duration-base group-hover:opacity-100"
      />

      {/* Bannière (placeholder gradient — l'URL signée du média public n'est
          pas encore exposée par l'API publique, hors-scope MP-S-INDEX). */}
      <div className="relative aspect-[16/7] w-full overflow-hidden bg-gradient-to-br from-[#0A0E1A] via-[#12161F] to-[#1A1F2E]">
        {seller.bannerMediaId ? (
          <span
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,212,255,0.18),_transparent_60%)]"
          />
        ) : null}
        {seller.isFeatured ? (
          <span
            data-testid="seller-card-featured-badge"
            className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-[#00F5A0]/40 bg-[#00F5A0]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#00F5A0] backdrop-blur"
          >
            <Star className="h-3 w-3" aria-hidden /> Vedette
          </span>
        ) : null}
      </div>

      {/* Logo / initiales en superposition */}
      <div className="relative -mt-7 px-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-[#0A0E1A] text-base font-bold text-white shadow-lg shadow-black/40">
          {seller.logoMediaId ? (
            <span
              aria-hidden
              className="iox-text-gradient-neon text-base font-bold"
              data-testid="seller-card-logo-indicator"
            >
              {initials}
            </span>
          ) : (
            <span aria-hidden>{initials}</span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4 pt-3">
        <h3 className="truncate text-base font-semibold text-white transition-colors duration-base group-hover:text-[#00D4FF]">
          {seller.publicDisplayName}
        </h3>

        <div className="flex items-center gap-1.5 text-xs text-white/60">
          <MapPin className="h-3.5 w-3.5 text-white/40" aria-hidden />
          <span className="truncate">
            {cityLine ? `${cityLine} · ${seller.country}` : seller.country}
          </span>
        </div>

        {seller.descriptionShort ? (
          <p className="line-clamp-2 text-xs text-white/55">{seller.descriptionShort}</p>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-white/70">
            <Package className="h-3 w-3 text-[#00D4FF]" aria-hidden />
            {seller.publishedProductsCount} produit
            {seller.publishedProductsCount > 1 ? 's' : ''} publié
            {seller.publishedProductsCount > 1 ? 's' : ''}
          </span>
          {firstIncoterm ? (
            <span className="rounded-full border border-[#7B61FF]/30 bg-[#7B61FF]/10 px-2 py-0.5 text-[11px] font-medium uppercase text-[#B8A9FF]">
              {firstIncoterm}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

/** Calcule les initiales (2 caractères max) à partir d'un nom commercial. */
function computeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Lit prudemment une liste de chaînes depuis un champ `unknown` JSON. */
function readStringList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string');
}
