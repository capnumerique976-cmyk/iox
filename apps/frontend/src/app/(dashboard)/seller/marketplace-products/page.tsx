'use client';

// FP-4 — Index minimaliste des produits marketplace du vendeur connecté.
// Sert de tremplin vers les écrans d'édition (saisonnalité dans ce lot,
// d'autres champs ultérieurement). Pas de filtres, pas de pagination
// élaborée : on montre la première page (limite 50) triée par date de mise
// à jour côté backend.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, Award, Calendar, Loader2, Pencil, Plus } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import {
  marketplaceProductsApi,
  type SellerMarketplaceProduct,
} from '@/lib/marketplace-products';
import { PageHeader } from '@/components/ui/page-header';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; rows: SellerMarketplaceProduct[] };

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
  IN_REVIEW: 'bg-amber-50 text-amber-800 border-amber-200',
  APPROVED: 'bg-sky-50 text-sky-800 border-sky-200',
  PUBLISHED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-800 border-red-200',
  SUSPENDED: 'bg-orange-50 text-orange-800 border-orange-200',
  ARCHIVED: 'bg-gray-50 text-gray-500 border-gray-200',
};

export default function SellerMarketplaceProductsPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const token = authStorage.getAccessToken() ?? '';
      const res = await marketplaceProductsApi.listMine(token, { page: 1, limit: 50 });
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
        title="Mes produits marketplace"
        subtitle="Édition saisonnalité et contenu vitrine"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/seller/marketplace-products/new"
              data-testid="link-new-product"
              className="inline-flex items-center gap-1 rounded-md bg-premium-accent px-2.5 py-1.5 text-xs font-semibold text-white shadow-premium-sm hover:bg-premium-primary"
            >
              <Plus className="h-3 w-3" /> Nouveau produit
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
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement de vos produits…
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
          Aucun produit marketplace pour l’instant. Contactez l’équipe IOX pour démarrer
          votre catalogue.
        </div>
      )}

      {state.kind === 'ready' && state.rows.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-premium-sm">
          <table className="w-full text-sm" data-testid="seller-mp-list">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">Produit</th>
                <th className="px-4 py-2 text-left">Origine</th>
                <th className="px-4 py-2 text-left">Statut</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {state.rows.map((p) => (
                <tr key={p.id} data-testid={`seller-mp-row-${p.id}`}>
                  <td className="px-4 py-2">
                    <div className="font-medium text-gray-900">{p.commercialName}</div>
                    <div className="text-[11px] text-gray-400">{p.slug}</div>
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    {p.originCountry}
                    {p.originRegion ? ` · ${p.originRegion}` : ''}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        STATUS_BADGE[p.publicationStatus] ?? STATUS_BADGE.DRAFT
                      }`}
                    >
                      {p.publicationStatus}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Link
                        href={`/seller/marketplace-products/${p.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
                        data-testid={`seller-mp-detail-${p.id}`}
                      >
                        <Pencil className="h-3 w-3" /> Détails
                      </Link>
                      <Link
                        href={`/seller/marketplace-products/${p.id}/seasonality`}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
                        data-testid={`seller-mp-seasonality-${p.id}`}
                      >
                        <Calendar className="h-3 w-3" /> Saisonnalité
                      </Link>
                      <Link
                        href={`/seller/marketplace-products/${p.id}/certifications`}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
                        data-testid={`seller-mp-certifications-${p.id}`}
                      >
                        <Award className="h-3 w-3" /> Certifications
                      </Link>
                    </div>
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
