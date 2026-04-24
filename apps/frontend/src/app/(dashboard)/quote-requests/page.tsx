'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Search, ShoppingBag } from 'lucide-react';
import { useAuth } from '@/contexts/auth.context';
import { quoteRequestsApi, QuoteRequestSummary } from '@/lib/quote-requests';
import { UserRole, QuoteRequestStatus } from '@iox/shared';

/**
 * Liste RFQ V2 — enrichissements (rétro-compatibles V1) :
 * - fetch unique `status=''` + ventilation client-side pour afficher le
 *   compteur de chaque statut dans les tabs (1 appel au lieu de 7).
 * - recherche locale sur offre / vendeur / acheteur / marché.
 * - badges de messages non lus par ligne (via `_count.messages`).
 * - empty states contextuels selon le rôle (buyer vs seller vs staff).
 */

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

const STATUS_ORDER: QuoteRequestStatus[] = [
  QuoteRequestStatus.NEW,
  QuoteRequestStatus.QUALIFIED,
  QuoteRequestStatus.QUOTED,
  QuoteRequestStatus.NEGOTIATING,
  QuoteRequestStatus.WON,
  QuoteRequestStatus.LOST,
  QuoteRequestStatus.CANCELLED,
];

export default function QuoteRequestsListPage() {
  const { user, token } = useAuth();
  const [items, setItems] = useState<QuoteRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState<QuoteRequestStatus | ''>('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setErr(null);
    quoteRequestsApi
      .list(token, { limit: '200' })
      .then((res) => setItems(res.data))
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const isBuyer = user?.role === UserRole.MARKETPLACE_BUYER;
  const isSeller = user?.role === UserRole.MARKETPLACE_SELLER;
  const title = isBuyer ? 'Mes demandes de devis' : 'Demandes de devis';

  const countsByStatus = useMemo(() => {
    const acc: Record<QuoteRequestStatus, number> = {
      NEW: 0,
      QUALIFIED: 0,
      QUOTED: 0,
      NEGOTIATING: 0,
      WON: 0,
      LOST: 0,
      CANCELLED: 0,
    };
    for (const q of items) acc[q.status] += 1;
    return acc;
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (status && it.status !== status) return false;
      if (!q) return true;
      const hay = [
        it.marketplaceOffer.title,
        it.marketplaceOffer.sellerProfile?.publicDisplayName,
        it.marketplaceOffer.marketplaceProduct?.commercialName,
        it.buyerCompany?.name,
        it.targetMarket,
        it.deliveryCountry,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, status, query]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {isBuyer && (
          <Link href="/marketplace" className="text-sm text-blue-700 hover:text-blue-800">
            Parcourir le catalogue →
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          onClick={() => setStatus('')}
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${
            status === '' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Tous
          <span className={`tabular-nums ${status === '' ? 'text-blue-100' : 'text-gray-500'}`}>
            ({items.length})
          </span>
        </button>
        {STATUS_ORDER.map((s) => {
          const n = countsByStatus[s];
          if (n === 0 && status !== s) return null; // cache les tabs vides sauf si sélectionné
          return (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${
                status === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {STATUS_LABELS[s]}
              <span className={`tabular-nums ${status === s ? 'text-blue-100' : 'text-gray-500'}`}>
                ({n})
              </span>
            </button>
          );
        })}
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher une offre, un vendeur, un acheteur…"
          className="w-full rounded-md border border-gray-300 py-2 pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {err}
        </div>
      )}
      {loading ? (
        <div className="text-sm text-gray-500">Chargement…</div>
      ) : filtered.length === 0 ? (
        <EmptyState isBuyer={isBuyer} isSeller={isSeller} hasAny={items.length > 0} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">Offre</th>
                <th className="px-4 py-2 text-left">Vendeur</th>
                <th className="px-4 py-2 text-left">Acheteur</th>
                <th className="px-4 py-2 text-left">Quantité</th>
                <th className="px-4 py-2 text-left">Statut</th>
                <th className="px-4 py-2 text-left">Créée</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((q) => (
                <tr key={q.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-900">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{q.marketplaceOffer.title}</span>
                      {q._count && q._count.messages > 0 && (
                        <span
                          title={`${q._count.messages} message(s)`}
                          className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700"
                        >
                          <MessageSquare className="h-3 w-3" />
                          {q._count.messages}
                        </span>
                      )}
                    </div>
                    {q.marketplaceOffer.marketplaceProduct && (
                      <div className="text-xs text-gray-500">
                        {q.marketplaceOffer.marketplaceProduct.commercialName}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    {q.marketplaceOffer.sellerProfile?.publicDisplayName ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-700">{q.buyerCompany?.name ?? '—'}</td>
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
                  <td className="px-4 py-2 text-gray-500">
                    {new Date(q.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/quote-requests/${q.id}`}
                      className="text-blue-700 hover:text-blue-800"
                    >
                      Ouvrir →
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

function EmptyState({
  isBuyer,
  isSeller,
  hasAny,
}: {
  isBuyer: boolean;
  isSeller: boolean;
  hasAny: boolean;
}) {
  if (hasAny) {
    // Des items existent mais aucun ne correspond aux filtres / recherche.
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-600">
        Aucune demande ne correspond à vos filtres.
      </div>
    );
  }
  if (isBuyer) {
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
  if (isSeller) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-gray-200 bg-white p-10 text-center">
        <ShoppingBag className="h-8 w-8 text-emerald-500" />
        <p className="text-sm font-medium text-gray-800">Aucune demande reçue pour le moment.</p>
        <p className="max-w-sm text-xs text-gray-500">
          Dès qu&apos;un acheteur soumet une demande sur l&apos;une de vos offres publiées, elle
          apparaît ici. Assurez-vous que vos offres sont publiées et attractives.
        </p>
        <Link
          href="/seller/dashboard"
          className="mt-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Ouvrir le cockpit vendeur
        </Link>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-600">
      Aucune demande de devis.
    </div>
  );
}
