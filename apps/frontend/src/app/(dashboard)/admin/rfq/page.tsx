'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, RefreshCw, Search, ShoppingBag } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/contexts/auth.context';
import { quoteRequestsApi, QuoteRequestSummary } from '@/lib/quote-requests';
import { QuoteRequestStatus } from '@iox/shared';
import { PageHeader } from '@/components/ui/page-header';

/**
 * Admin — supervision des demandes de devis marketplace.
 *
 * Vue pilotage transverse pour ADMIN / COORDINATOR / QUALITY_MANAGER.
 *
 * - Filtre par statut.
 * - Recherche locale (offer.title, buyer company, buyer user).
 * - Lien direct vers la fiche existante `/quote-requests/[id]`
 *   (détail + messages + notes internes y sont déjà gérés).
 *
 * Ne duplique pas la fiche détail : l'existant est complet et
 * maintient la source unique de vérité côté `/quote-requests`.
 */

const STATUS_LABEL: Record<QuoteRequestStatus, string> = {
  NEW: 'Nouvelle',
  QUALIFIED: 'Qualifiée',
  QUOTED: 'Devisée',
  NEGOTIATING: 'Négociation',
  WON: 'Gagnée',
  LOST: 'Perdue',
  CANCELLED: 'Annulée',
};

const STATUS_TONE: Record<QuoteRequestStatus, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  QUALIFIED: 'bg-indigo-100 text-indigo-800',
  QUOTED: 'bg-amber-100 text-amber-800',
  NEGOTIATING: 'bg-orange-100 text-orange-800',
  WON: 'bg-emerald-100 text-emerald-800',
  LOST: 'bg-gray-100 text-gray-700',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

export default function AdminRfqPage() {
  const { token } = useAuth();

  const [items, setItems] = useState<QuoteRequestSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<QuoteRequestStatus | ''>('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const r = await quoteRequestsApi.list(
        token,
        statusFilter ? { status: statusFilter, limit: '100' } : { limit: '100' },
      );
      setItems(r.data);
      setTotal(r.meta.total);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return items;
    return items.filter((q) => {
      const offer = q.marketplaceOffer?.title?.toLowerCase() ?? '';
      const product = q.marketplaceOffer?.marketplaceProduct?.commercialName?.toLowerCase() ?? '';
      const buyer = q.buyerCompany?.name?.toLowerCase() ?? '';
      const buyerUser =
        `${q.buyerUser?.firstName ?? ''} ${q.buyerUser?.lastName ?? ''}`.toLowerCase();
      return offer.includes(s) || product.includes(s) || buyer.includes(s) || buyerUser.includes(s);
    });
  }, [items, search]);

  const counts = useMemo(() => {
    return items.reduce<Record<string, number>>((acc, q) => {
      acc[q.status] = (acc[q.status] ?? 0) + 1;
      return acc;
    }, {});
  }, [items]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ShoppingBag className="h-5 w-5" aria-hidden />}
        title="Supervision demandes de devis"
        subtitle={`${total} demande${total > 1 ? 's' : ''} · filtrage et accès direct à la fiche négociation`}
        actions={
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-premium-sm transition-all duration-base ease-premium hover:border-premium-accent/40 hover:bg-premium-accent/5 hover:text-premium-accent"
          >
            <RefreshCw className="h-4 w-4" />
            Rafraîchir
          </button>
        }
      />

      {/* Filtres + recherche */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (offre, acheteur, produit)…"
            className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-premium-accent/30"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as QuoteRequestStatus | '')}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-premium-accent/30"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABEL).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Compteurs de statut (vue filtrée courante) */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(STATUS_LABEL).map(([k, label]) => (
          <span
            key={k}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_TONE[k as QuoteRequestStatus]}`}
          >
            {label} <strong className="tabular-nums">{counts[k] ?? 0}</strong>
          </span>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* Liste */}
      <div className="iox-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Offre</th>
              <th>Acheteur</th>
              <th>Quantité</th>
              <th>Statut</th>
              <th>Créée</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  Chargement…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  Aucune demande ne correspond aux filtres.
                </td>
              </tr>
            ) : (
              filtered.map((q) => (
                <tr key={q.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 truncate max-w-[260px]">
                      {q.marketplaceOffer.title}
                    </p>
                    <p className="text-xs text-gray-400 truncate max-w-[260px]">
                      {q.marketplaceOffer.sellerProfile?.publicDisplayName ?? '—'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 truncate max-w-[200px]">
                      {q.buyerCompany?.name ?? '—'}
                    </p>
                    <p className="text-xs text-gray-400 truncate max-w-[200px]">
                      {q.buyerUser ? `${q.buyerUser.firstName} ${q.buyerUser.lastName}` : '—'}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {q.requestedQuantity ?? '—'}
                    {q.requestedUnit ? ` ${q.requestedUnit}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[q.status]}`}
                    >
                      {STATUS_LABEL[q.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(q.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/quote-requests/${q.id}`}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-200 text-gray-700 text-xs px-2 py-1 hover:bg-gray-50"
                    >
                      Ouvrir <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
