'use client';

// PAY-1 phase 1 LOT 2 — Page return Stripe : appelle refresh-status au mount.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { authStorage } from '@/lib/auth';
import {
  paymentsApi,
  SellerStripeAccountStatus,
  type SellerStripeAccountSummary,
} from '@/lib/payments';

export default function SellerPaymentsReturnPage() {
  const [account, setAccount] = useState<SellerStripeAccountSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function sync() {
      try {
        const token = authStorage.getAccessToken() ?? '';
        const res = await paymentsApi.refreshAccountStatus(token);
        if (!cancelled) setAccount(res);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Erreur de sync');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    sync();
    return () => {
      cancelled = true;
    };
  }, []);

  const isReady = account?.status === SellerStripeAccountStatus.PAYOUTS_ENABLED;

  return (
    <div className="space-y-6 p-6" data-testid="seller-payments-return-page">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Retour Stripe</h1>
        <p className="mt-1 text-sm text-gray-600">
          Synchronisation du statut de votre compte…
        </p>
      </div>

      {loading && (
        <p className="flex items-center gap-2 text-sm text-gray-600" data-testid="loading">
          <Loader2 className="h-4 w-4 animate-spin" />
          Synchronisation en cours…
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800"
          data-testid="error"
        >
          <AlertCircle className="mr-1 inline h-3 w-3" />
          {error}
        </p>
      )}

      {!loading && account && (
        <div
          className="rounded-md border border-gray-200 bg-white p-4"
          data-testid="result"
        >
          {isReady ? (
            <p className="flex items-center gap-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Votre compte est opérationnel. Vous pouvez maintenant recevoir des
              paiements.
            </p>
          ) : (
            <p className="flex items-center gap-2 text-sm text-yellow-700">
              <AlertCircle className="h-4 w-4" />
              Onboarding en cours d&apos;analyse Stripe (statut: {account.status}).
            </p>
          )}
        </div>
      )}

      <Link
        href="/seller/payments"
        className="inline-block text-sm text-blue-600 hover:underline"
      >
        ← Retour Paiements
      </Link>
    </div>
  );
}
