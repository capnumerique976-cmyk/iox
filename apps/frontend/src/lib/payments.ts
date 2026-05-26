// PAY-1 phase 1 LOT 2 — Helper API frontend payments.
//
// ADR-0005 — délègue le transport à `api.ts` (auto-idempotency, toast 429,
// x-request-id, ApiError unifié). Aucun `request()` custom ici.
//
// Endpoints couverts :
//  - POST /payments/connect/onboarding-link
//  - POST /payments/connect/refresh-status
//  - GET  /payments/connect/account-status
//  - POST /payments/checkout-session

import { api } from './api';
import { SellerStripeAccountStatus } from '@iox/shared';

export { SellerStripeAccountStatus };

export interface OnboardingLink {
  url: string;
  expiresAt: number;
}

export interface SellerStripeAccountSummary {
  status: SellerStripeAccountStatus;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  stripeAccountId?: string;
  capabilitiesJson?: unknown;
  requirementsJson?: unknown;
  createdAt?: string;
  updatedAt?: string;
}

export interface CheckoutSessionInput {
  quoteRequestId: string;
  marketplaceOfferId: string;
  /** @deprecated M133 — ignoré par le backend, montant verrouillé serveur. */
  amountCents?: number;
  /** @deprecated M133 — ignoré par le backend, devise lue depuis rfq.agreedCurrency. */
  currency?: string;
  returnUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResult {
  paymentId: string;
  sessionId: string;
  checkoutUrl: string;
}

export const paymentsApi = {
  /** Démarre ou poursuit l'onboarding Stripe Connect Express. */
  getOnboardingLink: (
    returnUrl: string,
    refreshUrl: string,
    token: string,
  ): Promise<OnboardingLink> =>
    api.post<OnboardingLink>(
      '/payments/connect/onboarding-link',
      { returnUrl, refreshUrl },
      token,
    ),

  /** Sync le status compte depuis Stripe → DB. */
  refreshAccountStatus: (token: string): Promise<SellerStripeAccountSummary> =>
    api.post<SellerStripeAccountSummary>(
      '/payments/connect/refresh-status',
      {},
      token,
    ),

  /** Lecture status (pas d'appel Stripe, lecture DB seule). */
  getAccountStatus: (token: string): Promise<SellerStripeAccountSummary> =>
    api.get<SellerStripeAccountSummary>(
      '/payments/connect/account-status',
      token,
    ),

  /**
   * PAY-1 LOT 3 — Crée Stripe Checkout Session pour buyer payant RFQ WON.
   * M133 — amountCents retiré : montant lu depuis rfq.agreedAmountCents
   * côté serveur.
   *
   * Idempotency-Key automatique via `api.post` (ADR-0005) — protège
   * contre la double-soumission/replay HTTP.
   */
  createCheckoutSession: (
    input: CheckoutSessionInput,
    token: string,
  ): Promise<CheckoutSessionResult> =>
    api.post<CheckoutSessionResult>('/payments/checkout-session', input, token),
};
