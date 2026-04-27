'use client';

// BUYER-DASHBOARD-1 — Liste des RFQ du buyer connecté.
//
// L'API `/marketplace/quote-requests` autoscope par rôle : pour un
// MARKETPLACE_BUYER elle renvoie uniquement ses propres RFQ. On expose
// ici une vue confort dédiée (filtres, pagination 20) sous l'URL
// `/buyer/quote-requests`, distincte du tableau de bord staff.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, Search } from 'lucide-react';
import { QuoteRequestStatus } from '@iox/shared';
import { useAuth } from '@/contexts/auth.context';
import {
  quoteRequestsApi,
  QuoteRequestSummary,
  QuoteRequestListResponse,
} from '@/lib/quote-requests';
import { PageHeader } from '@/components/ui/page-header';

const STATUS_LABELS: Record<QuoteRequestStatus, string> = {
  NEW: 'Nouvelle',
  QUALIFIED: 'Qualifiée',
  QUOTED: 'Devisée',
  NEGOTIATING: 'Négociation',
  WON: 'Gagnée',
  LOST: 'Perdue',
  CANCELLED: 'Annulée',
};

const STATUS_COLORS: Record<QuoteRequestStatus, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  QUALIFIED: 'bg-indigo-100 text-indigo-800',
  QUOTED: 'bg-amber-100 text-amber-800',
  NEGOTIATING: 'bg-orange-100 text-orange-800',
  WON: 'bg-emerald-100 text-emerald-800',
  LOST: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const STATUS_OPTIONS: QuoteRequestStatus[] = [
  QuoteRequestStatus.NEW,
  QuoteRequestStatus.QUALIFIED,
  QuoteRequestStatus.QUOTED,
  QuoteRequestStatus.NEGOTIATING,
  QuoteRequestStatus.WON,
  QuoteRequestStatus.LOST,
  QuoteRequestStatus.CANCELLED,
];

const PAGE_LIMIT = 20;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR');
}

export default function BuyerQuoteRequestsListPage() {
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

  // Filtres (controlled state).
  const [statusFilter, setStatusFilter] = useState<QuoteRequestStatus[]>([]);
  const [sellerQuery, setSellerQuery] = useState('');
  const [createdAtAfter, setCreatedAtAfter] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setErr(null);
    const params: Record<string, string | undefined> = {
      page: String(page),
      limit: String(PAGE_LIMIT),
    };
    if (statusFilter.length > 0) params.status = statusFilter.join(',');
    if (createdAtAfter) params.createdAtAfter = createdAtAfter;
    quoteRequestsApi
      .list(token, params)
      .then((res) => {
        setItems(res.data);
        setMeta(res.meta);
      })
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [token, page, statusFilter, createdAtAfter]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = sellerQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const slug = it.marketplaceOffer.sellerProfile?.slug ?? '';
      const name = it.marketplaceOffer.sellerProfile?.publicDisplayName ?? '';
      return slug.toLowerCase().includes(q) || name.toLowerCase().includes(q);
    });
  }, [items, sellerQuery]);

  const toggleStatus = (s: QuoteRequestStatus) => {
    setPage(1);
    setStatusFilter((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };

  const resetFilters = () => {
    setStatusFilter([]);
    setSellerQuery('');
    setCreatedAtAfter('');
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<ShoppingBag className="h-5 w-5" aria-hidden />}
        title="Mes demandes de devis"
        subtitle={`${meta.total} demande${meta.total > 1 ? 's' : ''}`}
        actions={
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:border-blue-400 hover:bg-blue-50"
          >
            Parcourir le catalogue →
          </Link>
        }
      />

      {/* Filtres */}
      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-700">Statut :</span>
          {STATUS_OPTIONS.map((s) => {
            const active = statusFilter.includes(s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={active}
                onClick={() => toggleStatus(s)}
                className={`rounded-full px-2.5 py-0.5 text-xs ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-gray-600">
            Vendeur (nom ou slug)
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-gray-400" />
              <input
                value={sellerQuery}
                onChange={(e) => setSellerQuery(e.target.value)}
                placeholder="ex. coopérative-x"
                className="w-64 rounded border border-gray-300 py-1.5 pl-7 pr-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-600">
            Créée après
            <input
              type="date"
              value={createdAtAfter}
              onChange={(e) => {
                setPage(1);
                setCreatedAtAfter(e.target.value);
              }}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={resetFilters}
            className="self-end rounded border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {err && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {err}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500">Chargement…</div>
      ) : filtered.length === 0 ? (
        <EmptyState hasAny={meta.total > 0} />
      ) : (
        <div className="iox-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Offre</th>
                <th>Vendeur</th>
                <th>Quantité</th>
                <th>Statut</th>
                <th>Mise à jour</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((q) => (
                <tr key={q.id} className="hover:bg-gray-50">
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
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLORS[q.status]}`}>
                      {STATUS_LABELS[q.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500">{formatDate(q.updatedAt)}</td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/buyer/quote-requests/${q.id}`}
                      className="text-blue-700 hover:text-blue-800"
                    >
                      Voir →
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
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Page {meta.page} / {meta.totalPages} — {meta.total} demande{meta.total > 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700 disabled:opacity-50"
            >
              ← Précédent
            </button>
            <button
              type="button"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700 disabled:opacity-50"
            >
              Suivant →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ hasAny }: { hasAny: boolean }) {
  if (hasAny) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-600">
        Aucune demande ne correspond à vos filtres.
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-gray-200 bg-white p-10 text-center">
      <ShoppingBag className="h-8 w-8 text-blue-500" />
      <p className="text-sm font-medium text-gray-800">Vous n&apos;avez pas encore de demande.</p>
      <p className="max-w-sm text-xs text-gray-500">
        Parcourez le catalogue, choisissez une offre qui vous intéresse et envoyez une demande de
        devis au vendeur en quelques clics.
      </p>
      <Link
        href="/marketplace"
        className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Explorer le catalogue
      </Link>
    </div>
  );
}
