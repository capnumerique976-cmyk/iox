'use client';

// BUYER-DASHBOARD-2 — Cockpit buyer.
//
// Vue agrégée (1 écran) pour utilisateurs MARKETPLACE_BUYER : compteurs
// RFQ par status, raccourcis vers actions principales, accès profil.
// Hors scope cette phase : orders/payments (PAY-2+).

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Bell,
  Package,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth.context';
import { quoteRequestsApi, QuoteRequestSummary } from '@/lib/quote-requests';
import { QuoteRequestStatus, UserRole } from '@iox/shared';
import { PageHeader } from '@/components/ui/page-header';
import { GuidedDashboardHeader } from '@/components/onboarding/guided-dashboard-header';
import { DailyActionsPanel } from '@/components/dashboard/daily-actions-panel';
import { getBuyerDailyActions, type BuyerDailyData } from '@/lib/daily-actions';

const STATUS_LABELS: Record<QuoteRequestStatus, string> = {
  NEW: 'En attente',
  QUALIFIED: 'En cours',
  QUOTED: 'Devis reçu',
  NEGOTIATING: 'Négociation',
  WON: 'Acceptée',
  LOST: 'Non retenue',
  CANCELLED: 'Annulée',
};

const ACTIVE_STATUSES: QuoteRequestStatus[] = [
  QuoteRequestStatus.NEW,
  QuoteRequestStatus.QUALIFIED,
  QuoteRequestStatus.QUOTED,
  QuoteRequestStatus.NEGOTIATING,
];

export default function BuyerCockpitPage() {
  const { user, token } = useAuth();
  const [items, setItems] = useState<QuoteRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setErr(null);
    quoteRequestsApi
      .list(token, { limit: '200' })
      .then((res) => setItems(res.data))
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const counts: Record<QuoteRequestStatus, number> = {
    NEW: 0,
    QUALIFIED: 0,
    QUOTED: 0,
    NEGOTIATING: 0,
    WON: 0,
    LOST: 0,
    CANCELLED: 0,
  };
  for (const it of items) counts[it.status] += 1;
  const totalActive = ACTIVE_STATUSES.reduce((acc, s) => acc + counts[s], 0);
  const totalAll = items.length;

  // M103 — Daily actions (dérivées des RFQ déjà chargées)
  const buyerDailyData = useMemo<BuyerDailyData>(() => ({
    quotedRfq: counts[QuoteRequestStatus.QUOTED],
    activeRfq: ACTIVE_STATUSES.reduce((acc, s) => acc + counts[s], 0),
    totalRfq: items.length,
  }), [counts, items]);

  const buyerDailyActions = useMemo(
    () => (loading ? [] : getBuyerDailyActions(buyerDailyData)),
    [loading, buyerDailyData],
  );

  const isBuyer = user?.role === UserRole.MARKETPLACE_BUYER;
  const greeting = isBuyer
    ? `Bonjour ${user?.firstName ?? ''}`
    : 'Espace acheteur';

  return (
    <div className="flex flex-col gap-6">
      {/* Guided journey header — visible for marketplace buyers */}
      {isBuyer && <GuidedDashboardHeader />}

      {/* M103 — Panneau actions quotidiennes */}
      <DailyActionsPanel
        actions={buyerDailyActions}
        isLoading={loading}
        title="Mes actions"
        emptyMessage="Tout va bien"
        emptyDescription="Aucune action en attente. Explorez le catalogue pour trouver vos prochains fournisseurs."
      />

      <PageHeader
        icon={<Sparkles className="h-5 w-5" aria-hidden />}
        title={greeting}
        subtitle={`${totalActive} demande${totalActive > 1 ? 's' : ''} active${totalActive > 1 ? 's' : ''} sur ${totalAll}`}
        actions={
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-3 w-3" />
            Actualiser
          </button>
        }
      />

      {err && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {err}
        </div>
      )}

      {/* Compteurs RFQ */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
          <ShoppingBag className="h-4 w-4 text-gray-400" aria-hidden />
          Mes demandes de devis
        </h2>
        {loading ? (
          <div className="text-sm text-gray-500">Chargement…</div>
        ) : totalAll === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-blue-200 bg-blue-50 p-6 text-center">
            <p className="text-sm font-medium text-blue-900">Pas encore de demande de devis</p>
            <p className="max-w-sm text-xs text-blue-700">
              Parcourez le catalogue, choisissez une offre et cliquez sur
              &laquo; Demander un devis &raquo; pour contacter un vendeur.
            </p>
            <Link
              href="/marketplace"
              className="mt-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Explorer le catalogue
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {(
              [
                QuoteRequestStatus.NEW,
                QuoteRequestStatus.QUALIFIED,
                QuoteRequestStatus.QUOTED,
                QuoteRequestStatus.NEGOTIATING,
              ] as QuoteRequestStatus[]
            ).map((s) => (
              <Link
                key={s}
                href={`/buyer/quote-requests?status=${s}`}
                data-testid={`rfq-count-${s}`}
                className="flex flex-col gap-1 rounded-lg border border-gray-100 bg-gray-50 p-3 hover:border-blue-300 hover:bg-blue-50"
              >
                <span className="text-xs uppercase tracking-wide text-gray-500">
                  {STATUS_LABELS[s]}
                </span>
                <span className="text-2xl font-bold text-gray-900 tabular-nums">{counts[s]}</span>
              </Link>
            ))}
            <Link
              href="/buyer/orders"
              data-testid="rfq-count-WON"
              className="flex flex-col gap-1 rounded-lg border border-emerald-200 bg-emerald-50 p-3 hover:border-emerald-400 hover:bg-emerald-100"
            >
              <span className="flex items-center gap-1 text-xs uppercase tracking-wide text-emerald-700">
                <Package className="h-3 w-3" aria-hidden />
                Commandes
              </span>
              <span className="text-2xl font-bold text-emerald-900 tabular-nums">{counts.WON}</span>
            </Link>
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <Link
            href="/buyer/quote-requests"
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-900"
          >
            Voir toutes mes demandes
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </section>

      {/* Raccourcis */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/marketplace"
          className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-5 hover:border-blue-300 hover:shadow-sm"
        >
          <ShoppingBag className="h-5 w-5 flex-shrink-0 text-blue-600" aria-hidden />
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Parcourir le catalogue</h3>
            <p className="mt-1 text-xs text-gray-600">
              Trouvez des produits, contactez les vendeurs et negociez vos prix.
            </p>
          </div>
        </Link>
        <Link
          href="/buyer/orders"
          data-testid="link-orders"
          className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-5 hover:border-emerald-300 hover:shadow-sm"
        >
          <Package className="h-5 w-5 flex-shrink-0 text-emerald-600" aria-hidden />
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Mes commandes</h3>
            <p className="mt-1 text-xs text-gray-600">
              Suivez vos demandes de devis gagnées et confirmées.
            </p>
          </div>
        </Link>
        <Link
          href="/buyer/profile"
          className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-5 hover:border-blue-300 hover:shadow-sm"
        >
          <Building2 className="h-5 w-5 flex-shrink-0 text-blue-600" aria-hidden />
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Mon entreprise</h3>
            <p className="mt-1 text-xs text-gray-600">
              Coordonnées, identifiants, paramètres de votre société acheteuse.
            </p>
          </div>
        </Link>
        <Link
          href="/buyer/preferences"
          data-testid="link-preferences"
          className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-5 hover:border-blue-300 hover:shadow-sm"
        >
          <Bell className="h-5 w-5 flex-shrink-0 text-blue-600" aria-hidden />
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Préférences notifications</h3>
            <p className="mt-1 text-xs text-gray-600">
              Choisissez les emails que vous souhaitez recevoir.
            </p>
          </div>
        </Link>
      </section>
    </div>
  );
}
