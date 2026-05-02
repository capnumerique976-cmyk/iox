'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Search, ShoppingBag, Clock, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/auth.context';
import { quoteRequestsApi, QuoteRequestSummary } from '@/lib/quote-requests';
import { UserRole, QuoteRequestStatus } from '@iox/shared';
import { PageHeader } from '@/components/ui/page-header';

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
  const [sortOldest, setSortOldest] = useState(false);

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
    const result = items.filter((it) => {
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
    if (sortOldest) {
      result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    return result;
  }, [items, status, query, sortOldest]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<ShoppingBag className="h-5 w-5" aria-hidden />}
        title={title}
        subtitle={`${items.length} demande${items.length > 1 ? 's' : ''}`}
        actions={
          isBuyer ? (
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-premium-sm transition-all duration-base ease-premium hover:border-premium-accent/40 hover:bg-premium-accent/5 hover:text-premium-accent"
            >
              Parcourir le catalogue →
            </Link>
          ) : undefined
        }
      />

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

      <div className="flex items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une offre, un vendeur, un acheteur…"
            className="w-full rounded-md border border-gray-300 py-2 pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <button
          onClick={() => setSortOldest((v) => !v)}
          className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-2 text-xs font-medium transition-colors ${
            sortOldest
              ? 'border-orange-300 bg-orange-50 text-orange-700'
              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
          }`}
          title="Trier par ancienneté (plus anciennes en premier)"
        >
          <Clock className="h-3.5 w-3.5" />
          Urgentes
        </button>
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
        <div className="iox-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Offre</th>
                <th>Vendeur</th>
                <th>Acheteur</th>
                <th>Quantité</th>
                <th>Statut</th>
                <th>Créée</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
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
                    <div className="flex items-center gap-1.5">
                      <span>{new Date(q.createdAt).toLocaleDateString('fr-FR')}</span>
                      <AgeBadge createdAt={q.createdAt} status={q.status} />
                    </div>
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

/**
 * AgeBadge — affiche l'ancienneté d'une RFQ avec code couleur urgence.
 * Visible uniquement pour les statuts actifs (pas WON/LOST/CANCELLED).
 * - < 3 jours : rien (frais)
 * - 3-7 jours : badge gris "Xj"
 * - 7-14 jours : badge orange "Xj"
 * - > 14 jours : badge rouge "Xj !" (urgent)
 */
function AgeBadge({ createdAt, status }: { createdAt: string; status: QuoteRequestStatus }) {
  const TERMINAL = new Set([QuoteRequestStatus.WON, QuoteRequestStatus.LOST, QuoteRequestStatus.CANCELLED]);
  if (TERMINAL.has(status)) return null;

  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  if (days < 3) return null;

  let className = 'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium';
  let icon = <Clock className="h-2.5 w-2.5" />;

  if (days >= 14) {
    className += ' bg-red-50 text-red-700';
    icon = <AlertTriangle className="h-2.5 w-2.5" />;
  } else if (days >= 7) {
    className += ' bg-orange-50 text-orange-700';
  } else {
    className += ' bg-gray-100 text-gray-600';
  }

  return (
    <span className={className} title={`Créée il y a ${days} jour${days > 1 ? 's' : ''}`}>
      {icon}
      {days}j
    </span>
  );
}
