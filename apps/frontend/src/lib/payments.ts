// PAY-1 phase 1 LOT 2 — Helper API frontend payments.
//
// 3 endpoints onboarding seller : onboarding-link / refresh-status / account-status.

import { ApiError } from './api';
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

function getApiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (raw && raw.trim().length > 0) return raw.replace(/\/$/, '');
  return '/api/v1';
}

async function request<T>(
  path: string,
  init: RequestInit & { token?: string },
): Promise<T> {
  const { token, headers, ...rest } = init;
  const response = await fetch(`${getApiBase()}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {}),
    },
  });
  const text = await response.text();
  const parsed = text.length ? JSON.parse(text) : {};
  if (!response.ok) {
    const err = parsed as { error?: { code?: string; message?: string } };
    throw new ApiError(
      err.error?.code ?? 'UNKNOWN_ERROR',
      err.error?.message ?? `Erreur API (${response.status})`,
      undefined,
      undefined,
      response.status,
    );
  }
  const body = parsed as { data?: T };
  if (body.data === undefined) {
    throw new ApiError('INVALID_RESPONSE', 'Réponse API inattendue.');
  }
  return body.data;
}

export const paymentsApi = {
  /** Démarre ou poursuit l'onboarding Stripe Connect Express. */
  async getOnboardingLink(
    returnUrl: string,
    refreshUrl: string,
    token: string,
  ): Promise<OnboardingLink> {
    return request<OnboardingLink>('/payments/connect/onboarding-link', {
      method: 'POST',
      body: JSON.stringify({ returnUrl, refreshUrl }),
      token,
    });
  },

  /** Sync le status compte depuis Stripe → DB. */
  async refreshAccountStatus(token: string): Promise<SellerStripeAccountSummary> {
    return request<SellerStripeAccountSummary>('/payments/connect/refresh-status', {
      method: 'POST',
      token,
    });
  },

  /** Lecture status (pas d'appel Stripe, lecture DB seule). */
  async getAccountStatus(token: string): Promise<SellerStripeAccountSummary> {
    return request<SellerStripeAccountSummary>('/payments/connect/account-status', {
      method: 'GET',
      token,
    });
  },
};
