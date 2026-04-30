'use client';

// PAY-1 phase 1 LOT 2 — Page status + démarrage onboarding seller.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, AlertCircle, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { authStorage } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import {
  paymentsApi,
  SellerStripeAccountStatus,
  type SellerStripeAccountSummary,
} from '@/lib/payments';

const STATUS_LABEL: Record<SellerStripeAccountStatus, string> = {
  PENDING_ONBOARDING: "En attente d'onboarding",
  ONBOARDING_INCOMPLETE: 'Onboarding en cours d\'analyse',
  CHARGES_ENABLED: 'Encaissements activés',
  PAYOUTS_ENABLED: 'Compte entièrement opérationnel',
  RESTRICTED: 'Compte restreint — action requise',
};

const STATUS_CLS: Record<SellerStripeAccountStatus, string> = {
  PENDING_ONBOARDING: 'bg-gray-100 text-gray-700',
  ONBOARDING_INCOMPLETE: 'bg-yellow-100 text-yellow-700',
  CHARGES_ENABLED: 'bg-blue-100 text-blue-700',
  PAYOUTS_ENABLED: 'bg-emerald-100 text-emerald-700',
  RESTRICTED: 'bg-red-100 text-red-700',
};

export default function SellerPaymentsPage() {
  const [account, setAccount] = useState<SellerStripeAccountSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = authStorage.getAccessToken() ?? '';
      const res = await paymentsApi.getAccountStatus(token);
      setAccount(res);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Erreur de chargement';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const token = authStorage.getAccessToken() ?? '';
      const res = await paymentsApi.refreshAccountStatus(token);
      setAccount(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de sync');
    } finally {
      setRefreshing(false);
    }
  };

  const startOnboarding = async () => {
    setError(null);
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
      setError(err instanceof Error ? err.message : 'Erreur démarrage onboarding');
    }
  };

  const status = account?.status ?? SellerStripeAccountStatus.PENDING_ONBOARDING;
  const isFullyOnboarded = status === SellerStripeAccountStatus.PAYOUTS_ENABLED;
  const buttonLabel =
    status === SellerStripeAccountStatus.PENDING_ONBOARDING
      ? "Démarrer l'onboarding"
      : isFullyOnboarded
        ? null
        : "Poursuivre l'onboarding";

  return (
    <div className="space-y-6 p-6" data-testid="seller-payments-page">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paiements & encaissements</h1>
        <p className="mt-1 text-sm text-gray-600">
          Configurez votre compte Stripe Connect pour recevoir les paiements buyers.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          data-testid="seller-payments-error"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800"
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-500" data-testid="seller-payments-loading">
          Chargement…
        </p>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span
                data-testid="seller-payments-status-badge"
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLS[status]}`}
              >
                {STATUS_LABEL[status]}
              </span>
              <h2 className="mt-2 text-lg font-semibold text-gray-900">
                Statut compte Stripe Connect
              </h2>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || status === SellerStripeAccountStatus.PENDING_ONBOARDING}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              data-testid="seller-payments-refresh"
            >
              {refreshing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              Rafraîchir
            </button>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <BadgeFlag label="Encaissements" value={account?.chargesEnabled ?? false} testId="flag-charges" />
            <BadgeFlag label="Versements" value={account?.payoutsEnabled ?? false} testId="flag-payouts" />
            <BadgeFlag label="Détails soumis" value={account?.detailsSubmitted ?? false} testId="flag-details" />
            <BadgeFlag label="Opérationnel" value={isFullyOnboarded} testId="flag-fully" />
          </dl>

          {buttonLabel && (
            <div className="mt-5">
              <button
                type="button"
                onClick={startOnboarding}
                className="inline-flex items-center gap-1 rounded-md bg-premium-accent px-4 py-2 text-sm font-semibold text-white shadow-premium-sm hover:bg-premium-primary"
                data-testid="seller-payments-start"
              >
                <ExternalLink className="h-4 w-4" />
                {buttonLabel}
              </button>
              <p className="mt-2 text-[11px] text-gray-500">
                Vous serez redirigé vers Stripe pour fournir vos informations bancaires
                et compléter le KYC.
              </p>
            </div>
          )}

          {isFullyOnboarded && (
            <div className="mt-5 rounded-md bg-emerald-50 p-3 text-xs text-emerald-800" data-testid="seller-payments-ok">
              <CheckCircle2 className="mr-1 inline h-3 w-3" /> Votre compte est entièrement
              opérationnel. Vous pouvez recevoir des paiements buyers.
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] text-gray-500">
        <Link href="/dashboard" className="text-blue-600 hover:underline">
          ← Retour dashboard
        </Link>
      </p>
    </div>
  );
}

function BadgeFlag({
  label,
  value,
  testId,
}: {
  label: string;
  value: boolean;
  testId: string;
}) {
  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-2" data-testid={testId}>
      <div className="text-[10px] uppercase tracking-wider text-gray-500">{label}</div>
      <div
        className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${
          value ? 'text-emerald-700' : 'text-gray-400'
        }`}
      >
        {value ? (
          <CheckCircle2 className="h-3 w-3" />
        ) : (
          <AlertCircle className="h-3 w-3" />
        )}
        {value ? 'Activé' : 'Non activé'}
      </div>
    </div>
  );
}
