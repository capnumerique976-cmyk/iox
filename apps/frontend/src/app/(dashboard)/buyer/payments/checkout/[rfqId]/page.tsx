'use client';

// PAY-1 phase 1 LOT 4 — Page buyer checkout avec pré-remplissage depuis RFQ.
//
// Comportement :
//  1. Au montage, GET /api/v1/marketplace/quote-requests/:rfqId → pré-remplit offerId
//  2. Affiche montant depuis rfq.agreedAmountCents (verrouillé côté serveur — M133)
//  3. POST /payments/checkout-session → retourne checkoutUrl
//  4. window.location.href = checkoutUrl (redirect Stripe)

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CreditCard, AlertCircle, Loader2, Store, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { authStorage } from '@/lib/auth';
import { paymentsApi } from '@/lib/payments';
import { quoteRequestsApi, type QuoteRequestSummary } from '@/lib/quote-requests';

/** Formate un montant en centimes en euros/dollars lisibles (ex: 12345 → "123.45"). */
function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

export default function BuyerCheckoutPage() {
  const params = useParams<{ rfqId: string }>();
  const rfqId = params.rfqId;
  const [loading, setLoading] = useState(false);
  const [rfqLoading, setRfqLoading] = useState(true);
  const [rfqError, setRfqError] = useState<string | null>(null);
  const [rfq, setRfq] = useState<QuoteRequestSummary | null>(null);
  const [offerId, setOfferId] = useState('');

  // Pre-fill depuis le RFQ
  useEffect(() => {
    const fetchRfq = async () => {
      setRfqLoading(true);
      setRfqError(null);
      try {
        const token = authStorage.getAccessToken() ?? '';
        const data = await quoteRequestsApi.get(rfqId, token);
        setRfq(data);
        // Pre-fill offerId uniquement — le montant vient de agreedAmountCents (M133)
        setOfferId(data.marketplaceOffer.id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'RFQ introuvable';
        setRfqError(msg);
      } finally {
        setRfqLoading(false);
      }
    };
    fetchRfq();
  }, [rfqId]);

  const handlePay = async () => {
    // M133 — Le montant est verrouillé côté serveur (rfq.agreedAmountCents).
    // Aucun amountCents transmis depuis le frontend.
    if (!offerId) {
      toast.error('Offre ID manquant');
      return;
    }
    if (!rfq?.agreedAmountCents) {
      toast.error('Le montant convenu n\'a pas encore été défini. Contactez votre coordinateur IOX.');
      return;
    }
    setLoading(true);
    try {
      const token = authStorage.getAccessToken() ?? '';
      const origin = window.location.origin;
      const res = await paymentsApi.createCheckoutSession(
        {
          quoteRequestId: rfqId,
          marketplaceOfferId: offerId,
          returnUrl: `${origin}/buyer/payments/return/${rfqId}`,
          cancelUrl: `${origin}/buyer/payments/cancel/${rfqId}`,
        },
        token,
      );
      window.location.href = res.checkoutUrl;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la création de la session de paiement. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  // État de chargement RFQ
  if (rfqLoading) {
    return (
      <div className="flex items-center justify-center p-12" data-testid="buyer-checkout-page">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Chargement de la demande…</span>
      </div>
    );
  }

  // Erreur RFQ (404 ou autre)
  if (rfqError) {
    return (
      <div className="space-y-4 p-6" data-testid="buyer-checkout-page">
        <Link href="/buyer/payments" className="inline-block text-sm text-blue-600 hover:underline">
          ← Retour aux paiements
        </Link>
        <div
          role="alert"
          data-testid="buyer-checkout-rfq-error"
          className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertCircle className="mr-2 inline h-4 w-4" />
          {rfqError}
        </div>
      </div>
    );
  }

  const productName =
    rfq?.marketplaceOffer?.marketplaceProduct?.commercialName ??
    rfq?.marketplaceOffer?.title ??
    '—';
  const shortOfferId = offerId.length > 8 ? `${offerId.slice(0, 8)}…` : offerId;

  // M133 — montant verrouillé côté serveur : rfq.agreedAmountCents (centimes) + rfq.agreedCurrency
  const agreedCurrency = rfq?.agreedCurrency ?? rfq?.marketplaceOffer.currency ?? 'EUR';
  const amountDisplay = rfq?.agreedAmountCents ? formatCents(rfq.agreedAmountCents) : null;
  const hasNoAmount = rfq && !rfq.agreedAmountCents;

  return (
    <div className="space-y-6 p-6" data-testid="buyer-checkout-page">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paiement de votre commande</h1>
        <p className="mt-1 text-sm text-gray-600">
          Vous serez redirigé vers Stripe pour saisir votre carte bancaire.
        </p>
        <p className="mt-1 text-xs text-gray-500">RFQ : {rfqId}</p>
      </div>

      {/* Alerte montant manquant */}
      {hasNoAmount && (
        <div
          role="alert"
          data-testid="buyer-checkout-no-amount-warning"
          className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
        >
          <AlertCircle className="mr-2 inline h-4 w-4" />
          Le montant convenu n&apos;a pas encore été validé pour cette demande. Veuillez contacter votre coordinateur IOX avant de procéder au paiement.
        </div>
      )}

      {/* Résumé RFQ */}
      {rfq && (
        <div
          className="rounded-lg border border-blue-100 bg-blue-50 p-4"
          data-testid="buyer-checkout-summary"
        >
          <div className="flex items-center gap-2 mb-2">
            <Store className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-900">Résumé de la commande</span>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div>
              <dt className="text-gray-500">Produit</dt>
              <dd className="font-medium text-gray-800">{productName}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Quantité</dt>
              <dd className="font-medium text-gray-800">
                {rfq.requestedQuantity
                  ? `${rfq.requestedQuantity}${rfq.requestedUnit ? ` ${rfq.requestedUnit}` : ''}`
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Offre (ID)</dt>
              <dd className="font-mono font-medium text-gray-800">{shortOfferId}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Montant convenu</dt>
              <dd className="font-semibold text-gray-900">
                {amountDisplay ? `${amountDisplay} ${agreedCurrency}` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Vendeur</dt>
              <dd className="font-medium text-gray-800">{rfq.marketplaceOffer.sellerProfile?.publicDisplayName ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Acheteur</dt>
              <dd className="font-medium text-gray-800">
                {rfq.buyerCompany?.name ?? ([rfq.buyerUser?.firstName, rfq.buyerUser?.lastName].filter(Boolean).join(' ') || '—')}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Statut</dt>
              <dd>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  rfq.status === 'WON' ? 'bg-green-100 text-green-700' :
                  rfq.status === 'QUOTED' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {rfq.status}
                </span>
              </dd>
            </div>
            {rfq.marketplaceOffer.incoterm && (
              <div>
                <dt className="text-gray-500">Incoterm</dt>
                <dd className="font-medium text-gray-800">{rfq.marketplaceOffer.incoterm}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {rfq && amountDisplay && (
        <div
          className="rounded-lg bg-gray-900 p-4 text-center"
          data-testid="buyer-checkout-total"
        >
          <p className="text-xs text-gray-400 uppercase tracking-wide">Total à payer</p>
          <p className="mt-1 text-3xl font-bold text-white">
            {amountDisplay} {agreedCurrency}
          </p>
        </div>
      )}

      <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-5">
        <div>
          <label className="block text-xs font-medium text-gray-700">Offre (ID)</label>
          <input
            type="text"
            value={offerId}
            readOnly
            className="mt-1 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
            data-testid="buyer-checkout-offer-id"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">
            Montant total ({agreedCurrency})
          </label>
          {/* M133 — Montant verrouillé côté serveur (rfq.agreedAmountCents), non modifiable par le buyer. */}
          <p
            className="mt-1 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 select-none"
            data-testid="buyer-checkout-amount"
          >
            {amountDisplay ?? '—'}
          </p>
        </div>
        <button
          type="button"
          onClick={handlePay}
          disabled={loading || !rfq?.agreedAmountCents}
          className="inline-flex items-center gap-2 rounded-md bg-premium-accent px-4 py-2 text-sm font-semibold text-white shadow-premium-sm hover:bg-premium-primary disabled:opacity-50"
          data-testid="buyer-checkout-pay"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          Payer via Stripe
        </button>
        <p
          className="flex items-center justify-center gap-1.5 text-xs text-gray-400 mt-2"
          data-testid="buyer-checkout-security"
        >
          <Lock className="h-3 w-3 flex-shrink-0" />
          Paiement sécurisé par Stripe — vos données bancaires ne transitent pas par IOX.
        </p>
      </div>

      <Link
        href={`/buyer/quote-requests/${rfqId}`}
        className="inline-block text-sm text-blue-600 hover:underline"
        data-testid="buyer-checkout-back-link"
      >
        ← Retour à la demande
      </Link>
    </div>
  );
}
