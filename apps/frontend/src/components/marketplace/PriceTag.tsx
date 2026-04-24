import type { CatalogCard, ProductOffer } from '@/lib/marketplace/types';

export function PriceTag({
  offer,
}: {
  offer: Pick<CatalogCard | ProductOffer, 'priceMode' | 'unitPrice' | 'currency'>;
}) {
  if (offer.priceMode === 'QUOTE_ONLY' || offer.unitPrice == null) {
    return <span className="text-sm font-medium text-blue-700">Sur devis</span>;
  }
  const prefix = offer.priceMode === 'FROM_PRICE' ? 'À partir de ' : '';
  const currency = offer.currency ?? 'EUR';
  return (
    <span className="text-sm font-semibold text-gray-900">
      {prefix}
      {offer.unitPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {currency}
    </span>
  );
}
