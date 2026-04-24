import Link from 'next/link';
import type { CatalogCard } from '@/lib/marketplace/types';
import { ReadinessBadge } from './ReadinessBadge';
import { PriceTag } from './PriceTag';
import { FavoriteButton } from './FavoriteButton';

export function ProductCard({ card }: { card: CatalogCard }) {
  const imgUrl = card.primaryImage?.publicUrl ?? null;
  return (
    <Link
      href={`/marketplace/products/${card.productSlug}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[rgba(18,22,31,0.7)] shadow-lg shadow-black/20 backdrop-blur-xl transition-all duration-base ease-premium hover:-translate-y-1 hover:border-[#00D4FF]/50 hover:shadow-glow-cyan-sm"
    >
      {/* Gradient accent top line au hover */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-iox-neon opacity-0 transition-opacity duration-base group-hover:opacity-100"
      />
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-[#0A0E1A] via-[#12161F] to-[#1A1F2E]">
        {imgUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgUrl}
            alt={card.primaryImage?.altTextFr ?? card.commercialName}
            className="h-full w-full object-cover transition-transform duration-500 ease-premium group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-white/30">
            Pas d&apos;image
          </div>
        )}
        {/* Gradient overlay bas pour lisibilité badges */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"
        />
        <div className="absolute left-2 top-2">
          <ReadinessBadge status={card.exportReadinessStatus} />
        </div>
        <div className="absolute right-2 top-2">
          <FavoriteButton productSlug={card.productSlug} commercialName={card.commercialName} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-white transition-colors duration-base group-hover:text-[#00D4FF]">
              {card.commercialName}
            </h3>
            {card.subtitle && (
              <p className="truncate text-xs text-white/50">{card.subtitle}</p>
            )}
          </div>
        </div>

        <p className="text-xs text-white/60">
          <span className="font-medium text-white/80">{card.seller.publicDisplayName}</span>
          {' · '}
          {card.origin.country}
          {card.origin.region ? ` / ${card.origin.region}` : ''}
        </p>

        {card.category && (
          <span className="inline-flex w-fit rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/60">
            {card.category.nameFr}
          </span>
        )}

        <div className="mt-auto flex items-end justify-between pt-2">
          <div className="text-xs text-white/60">
            {card.moq != null && (
              <div>
                MOQ : <span className="text-white/80">{card.moq}</span>
                {card.defaultUnit ? ` ${card.defaultUnit}` : ''}
              </div>
            )}
            {card.packagingDescription && (
              <div className="truncate text-white/40">{card.packagingDescription}</div>
            )}
          </div>
          <PriceTag offer={card} />
        </div>
      </div>
    </Link>
  );
}
