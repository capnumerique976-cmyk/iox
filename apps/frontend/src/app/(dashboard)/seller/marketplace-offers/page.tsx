'use client';

// MP-OFFER-VIEW (LOT 1 mandat 14) — Index minimaliste des offres
// marketplace du vendeur connecté.
//
// Pattern miroir de `seller/marketplace-products/page.tsx`. Le bouton
// "Nouvelle offre" est désactivé dans ce LOT (création introduite par
// MP-OFFER-EDIT-1, LOT 2). Pas de filtres, pas de pagination élaborée :
// on montre la première page (limite 50) triée par updatedAt côté backend.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, Eye, Loader2, Plus } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import {
  marketplaceOffersApi,
  type MarketplaceOfferDetail,
} from '@/lib/marketplace-offers';
import { PageHeader } from '@/components/ui/page-header';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; rows: MarketplaceOfferDetail[] };

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
  IN_REVIEW: 'bg-amber-50 text-amber-800 border-amber-200',
  APPROVED: 'bg-sky-50 text-sky-800 border-sky-200',
  PUBLISHED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-800 border-red-200',
  SUSPENDED: 'bg-orange-50 text-orange-800 border-orange-200',
  ARCHIVED: 'bg-gray-50 text-gray-500 border-gray-200',
};

function formatPrice(o: MarketplaceOfferDetail): string {
  if (o.priceMode === 'QUOTE_ONLY') return 'Sur devis';
  if (o.unitPrice == null) return '—';
  const n = typeof o.unitPrice === 'string' ? Number(o.unitPrice) : o.unitPrice;
  const cur = o.currency ?? '';
  const prefix = o.priceMode === 'FROM_PRICE' ? 'À partir de ' : '';
  return `${prefix}${n.toLocaleString('fr-FR')} ${cur}`.trim();
}

export default function SellerMarketplaceOffersPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const token = authStorage.getAccessToken() ?? '';
      const res = await marketplaceOffersApi.listMine(token, { page: 1, limit: 50 });
      setState({ kind: 'ready', rows: res.data });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Liste indisponible';
      setState({ kind: 'error', message });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Mes offres"
        subtitle="Lecture seule — édition à venir"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/seller/marketplace-offers/new"
              data-testid="link-new-offer"
              className="inline-flex items-center gap-1 rounded-md bg-premium-accent px-2.5 py-1.5 text-xs font-semibold text-white shadow-premium-sm hover:bg-premium-primary"
            >
              <Plus className="h-3 w-3" /> Nouvelle offre
            </Link>
            <Link
              href="/seller/dashboard"
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft className="h-3 w-3" /> Cockpit vendeur
            </Link>
          </div>
        }
      />

      {state.kind === 'loading' && (
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement de vos offres…
        </div>
      )}

      {state.kind === 'error' && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>{state.message}</p>
        </div>
      )}

      {state.kind === 'ready' && state.rows.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
          Aucune offre marketplace pour l’instant. La création d’offres sera
          disponible au prochain lot — en attendant, vos offres seedées
          apparaîtront ici dès leur attachement.
        </div>
      )}

      {state.kind === 'ready' && state.rows.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-premium-sm">
          <table className="w-full text-sm" data-testid="seller-offers-list">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">Offre</th>
                <th className="px-4 py-2 text-left">Produit</th>
                <th className="px-4 py-2 text-left">Prix</th>
                <th className="px-4 py-2 text-left">Statut</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {state.rows.map((o) => (
                <tr key={o.id} data-testid={`seller-offer-row-${o.id}`}>
                  <td className="px-4 py-2">
                    <div className="font-medium text-gray-900">{o.title}</div>
                    {o.shortDescription ? (
                      <div className="line-clamp-1 text-[11px] text-gray-400">
                        {o.shortDescription}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    {o.marketplaceProduct?.commercialName ?? o.marketplaceProductId}
                  </td>
                  <td className="px-4 py-2 text-gray-700">{formatPrice(o)}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        STATUS_BADGE[o.publicationStatus] ?? STATUS_BADGE.DRAFT
                      }`}
                    >
                      {o.publicationStatus}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/seller/marketplace-offers/${o.id}`}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
                      data-testid={`seller-offer-detail-${o.id}`}
                    >
                      <Eye className="h-3 w-3" /> Détails
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
