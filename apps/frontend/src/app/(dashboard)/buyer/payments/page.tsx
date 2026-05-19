'use client';

// PAY-BUYER-HUB — Page de synthèse paiements buyer.
//
// Affiche les commandes gagnées (WON) qui peuvent nécessiter un paiement.
// L'action "Payer" redirige vers /buyer/payments/checkout/[rfqId] → Stripe.
// Note : en pilote fermé, Stripe est en mode test (sk_test_).

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CreditCard, Package, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth.context';
import { quoteRequestsApi, type QuoteRequestSummary } from '@/lib/quote-requests';
import { PageHeader } from '@/components/ui/page-header';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR');
}

export default function BuyerPaymentsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<QuoteRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setErr(null);
    quoteRequestsApi
      .list(token, { status: 'WON', limit: '50' })
      .then((res) => setItems(res.data))
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<CreditCard className="h-5 w-5" aria-hidden />}
        title="Mes paiements"
        subtitle="Commandes acceptées pouvant nécessiter un paiement."
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

      {/* Note pilote */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <strong>Mode test</strong> — Les paiements sont traités via Stripe en mode test.
        Aucun montant réel ne sera débité.
      </div>

      {err && (
        <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {err}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg border border-gray-200 bg-white" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <Package className="h-10 w-10 text-gray-300" aria-hidden />
          <p className="font-medium text-gray-600">Aucune commande en attente de paiement</p>
          <p className="text-sm text-gray-400">
            Vos commandes acceptées apparaîtront ici une fois les devis finalisés.
          </p>
          <Link
            href="/buyer/quote-requests"
            className="mt-2 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Voir mes demandes <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      ) : (
        <section className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-700">
              Commandes à régler ({items.length})
            </h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {items.map((rfq) => (
              <li key={rfq.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">
                    {rfq.marketplaceOffer.title}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {rfq.marketplaceOffer.sellerProfile?.publicDisplayName ?? '—'}
                    {' · '}
                    {rfq.requestedQuantity
                      ? `${rfq.requestedQuantity} ${rfq.requestedUnit ?? ''}`
                      : 'Quantité non précisée'}
                    {' · '}
                    Accepté le {formatDate(rfq.updatedAt)}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-3">
                  <Link
                    href={`/buyer/quote-requests/${rfq.id}`}
                    className="text-xs font-medium text-gray-500 hover:text-gray-700"
                  >
                    Détail
                  </Link>
                  <Link
                    href={`/buyer/payments/checkout/${rfq.id}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    Payer
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
