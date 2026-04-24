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
      className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-premium-sm transition-all duration-base ease-premium hover:-translate-y-0.5 hover:shadow-premium-md hover:border-premium-accent/30"
    >
      <div className="relative aspect-[4/3] w-full bg-gray-100">
        {imgUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgUrl}
            alt={card.primaryImage?.altTextFr ?? card.commercialName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400 text-sm">
            Pas d&apos;image
          </div>
        )}
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
            <h3 className="truncate text-base font-semibold text-gray-900 transition-colors duration-base group-hover:text-premium-accent">
              {card.commercialName}
            </h3>
            {card.subtitle && <p className="truncate text-xs text-gray-500">{card.subtitle}</p>}
          </div>
        </div>

        <p className="text-xs text-gray-600">
          <span className="font-medium">{card.seller.publicDisplayName}</span>
          {' · '}
          {card.origin.country}
          {card.origin.region ? ` / ${card.origin.region}` : ''}
        </p>

        {card.category && (
          <span className="inline-flex w-fit rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
            {card.category.nameFr}
          </span>
        )}

        <div className="mt-auto flex items-end justify-between pt-2">
          <div className="text-xs text-gray-600">
            {card.moq != null && (
              <div>
                MOQ : {card.moq}
                {card.defaultUnit ? ` ${card.defaultUnit}` : ''}
              </div>
            )}
            {card.packagingDescription && (
              <div className="truncate text-gray-500">{card.packagingDescription}</div>
            )}
          </div>
          <PriceTag offer={card} />
        </div>
      </div>
    </Link>
  );
}
