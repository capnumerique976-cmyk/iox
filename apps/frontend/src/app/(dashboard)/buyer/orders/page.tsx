'use client';

// BUYER-DASHBOARD-2 — LOT B : page commandes (RFQ gagnées).
//
// Vue filtrée sur les RFQ au statut WON, présentées comme « commandes ».
// L'API `/marketplace/quote-requests?status=WON` autoscope par rôle :
// pour un MARKETPLACE_BUYER elle renvoie uniquement ses propres RFQ.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Package } from 'lucide-react';
import { useAuth } from '@/contexts/auth.context';
import {
  quoteRequestsApi,
  QuoteRequestSummary,
  QuoteRequestListResponse,
} from '@/lib/quote-requests';
import { PageHeader } from '@/components/ui/page-header';

const PAGE_LIMIT = 20;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR');
}

export default function BuyerOrdersPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<QuoteRequestSummary[]>([]);
  const [meta, setMeta] = useState<QuoteRequestListResponse['meta']>({
    total: 0,
    page: 1,
    limit: PAGE_LIMIT,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setErr(null);
    quoteRequestsApi
      .list(token, {
        status: 'WON',
        page: String(page),
        limit: String(PAGE_LIMIT),
      })
      .then((res) => {
        setItems(res.data);
        setMeta(res.meta);
      })
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [token, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6" data-testid="buyer-orders-page">
      <PageHeader
        icon={<Package className="h-5 w-5" aria-hidden />}
        title="Mes commandes"
        subtitle={`${meta.total} commande${meta.total > 1 ? 's' : ''}`}
        actions={
          <Link
            href="/buyer/quote-requests"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:border-emerald-400 hover:bg-emerald-50"
          >
            Voir toutes les demandes
          </Link>
        }
      />

      {err && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {err}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500">Chargement...</div>
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="iox-table-wrap" data-testid="orders-table">
          <table>
            <thead>
              <tr>
                <th>Offre</th>
                <th>Vendeur</th>
                <th>Quantit&eacute;</th>
                <th>Date de cl&ocirc;ture</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((q) => (
                <tr key={q.id} data-testid={`order-row-${q.id}`} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <div className="font-medium text-gray-900">{q.marketplaceOffer.title}</div>
                    {q.marketplaceOffer.marketplaceProduct && (
                      <div className="text-xs text-gray-500">
                        {q.marketplaceOffer.marketplaceProduct.commercialName}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    {q.marketplaceOffer.sellerProfile?.publicDisplayName ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    {q.requestedQuantity
                      ? `${q.requestedQuantity}${q.requestedUnit ? ` ${q.requestedUnit}` : ''}`
                      : '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-500">{formatDate(q.updatedAt)}</td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/buyer/quote-requests/${q.id}`}
                      className="text-emerald-700 hover:text-emerald-800"
                      data-testid={`order-link-${q.id}`}
                    >
                      Voir &rarr;
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm" data-testid="orders-pagination">
          <span className="text-gray-500">
            Page {meta.page} / {meta.totalPages} &mdash; {meta.total} commande{meta.total > 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700 disabled:opacity-50"
            >
              &larr; Pr&eacute;c&eacute;dent
            </button>
            <button
              type="button"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700 disabled:opacity-50"
            >
              Suivant &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-gray-200 bg-white p-10 text-center"
      data-testid="orders-empty"
    >
      <Package className="h-8 w-8 text-emerald-500" />
      <p className="text-sm font-medium text-gray-800">Vous n&apos;avez pas encore de commande.</p>
      <p className="max-w-sm text-xs text-gray-500">
        Vos demandes de devis qui aboutissent (statut &laquo; Gagn&eacute;e &raquo;)
        apparaitront ici comme commandes.
      </p>
      <Link
        href="/marketplace"
        className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        Explorer le catalogue
      </Link>
    </div>
  );
}
