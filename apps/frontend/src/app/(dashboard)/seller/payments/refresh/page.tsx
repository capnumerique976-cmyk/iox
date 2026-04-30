'use client';

// PAY-1 phase 1 LOT 2 — Page refresh Stripe : link expiré → regénère + redirige.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, AlertCircle } from 'lucide-react';
import { authStorage } from '@/lib/auth';
import { paymentsApi } from '@/lib/payments';

export default function SellerPaymentsRefreshPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function regen() {
      try {
        const token = authStorage.getAccessToken() ?? '';
        const origin = window.location.origin;
        const link = await paymentsApi.getOnboardingLink(
          `${origin}/seller/payments/return`,
          `${origin}/seller/payments/refresh`,
          token,
        );
        window.location.href = link.url;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Erreur regénération onboarding link',
        );
      }
    }
    regen();
  }, []);

  return (
    <div className="space-y-6 p-6" data-testid="seller-payments-refresh-page">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Lien expiré</h1>
        <p className="mt-1 text-sm text-gray-600">
          Génération d&apos;un nouveau lien d&apos;onboarding…
        </p>
      </div>

      {!error && (
        <p className="flex items-center gap-2 text-sm text-gray-600" data-testid="loading">
          <Loader2 className="h-4 w-4 animate-spin" />
          Redirection en cours…
        </p>
      )}

      {error && (
        <>
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800"
            data-testid="error"
          >
            <AlertCircle className="mr-1 inline h-3 w-3" />
            {error}
          </p>
          <Link href="/seller/payments" className="text-sm text-blue-600 hover:underline">
            ← Retour Paiements
          </Link>
        </>
      )}
    </div>
  );
}
