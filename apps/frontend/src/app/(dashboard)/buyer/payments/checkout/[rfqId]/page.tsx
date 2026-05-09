'use client';

// PAY-1 phase 1 LOT 3 — Page buyer checkout pour RFQ WON.
//
// Comportement client component :
//  1. POST /payments/checkout-session → retourne checkoutUrl
//  2. window.location.href = checkoutUrl (redirect Stripe)
//
// Server component plus propre mais le checkout-session crée un Payment row,
// donc client-driven via un bouton "Payer" évite les double-clics ou les
// effets non-intentionnels au pre-fetch.

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CreditCard, AlertCircle, Loader2 } from 'lucide-react';
import { authStorage } from '@/lib/auth';
import { paymentsApi } from '@/lib/payments';

export default function BuyerCheckoutPage() {
  const params = useParams<{ rfqId: string }>();
  const rfqId = params.rfqId;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // amount + offerId à fournir par le user dans une vraie UI ; V1 simplifié,
  // le pré-remplissage côté SSR/client viendra dans une LOT 4 (afficher details RFQ).
  const [amountEuros, setAmountEuros] = useState('');
  const [offerId, setOfferId] = useState('');

  const handlePay = async () => {
    setError(null);
    const amountCents = Math.round(parseFloat(amountEuros) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setError('Montant invalide');
      return;
    }
    if (!offerId) {
      setError("Identifiant de l'offre manquant");
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
          amountCents,
          returnUrl: `${origin}/buyer/payments/return/${rfqId}`,
          cancelUrl: `${origin}/buyer/payments/cancel/${rfqId}`,
        },
        token,
      );
      window.location.href = res.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur création session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6" data-testid="buyer-checkout-page">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payer votre commande</h1>
        <p className="mt-1 text-sm text-gray-600">
          Vous serez redirige vers notre plateforme de paiement securisee pour finaliser votre achat.
        </p>
        <p className="mt-1 text-xs text-gray-500">N° demande : {rfqId}</p>
      </div>

      {error && (
        <p
          role="alert"
          data-testid="buyer-checkout-error"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800"
        >
          <AlertCircle className="mr-1 inline h-3 w-3" />
          {error}
        </p>
      )}

      <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-5">
        <div>
          <label className="block text-xs font-medium text-gray-700">
            Identifiant de l&apos;offre
            <span className="ml-1 font-normal text-gray-500">(fourni par IOX)</span>
          </label>
          <input
            type="text"
            value={offerId}
            onChange={(e) => setOfferId(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm font-mono"
            data-testid="buyer-checkout-offer-id"
            placeholder="Identifiant de l'offre"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">
            Montant total (EUR)
          </label>
          <input
            type="number"
            value={amountEuros}
            onChange={(e) => setAmountEuros(e.target.value)}
            min="0.5"
            step="0.01"
            className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            data-testid="buyer-checkout-amount"
            placeholder="100.00"
          />
        </div>
        <button
          type="button"
          onClick={handlePay}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-premium-accent px-4 py-2 text-sm font-semibold text-white shadow-premium-sm hover:bg-premium-primary disabled:opacity-50"
          data-testid="buyer-checkout-pay"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          Payer via Stripe
        </button>
      </div>

      <Link href="/buyer" className="inline-block text-sm text-blue-600 hover:underline">
        ← Annuler et revenir
      </Link>
    </div>
  );
}
