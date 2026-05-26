// ADR-0005 — Test que paymentsApi utilise api.ts (transport unifié)
// et bénéficie donc de l'idempotency automatique, toast 429, etc.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const apiPostMock = vi.fn();
const apiGetMock = vi.fn();

vi.mock('./api', () => ({
  api: {
    post: (...args: unknown[]) => apiPostMock(...args),
    get: (...args: unknown[]) => apiGetMock(...args),
  },
}));

import { paymentsApi } from './payments';

describe('paymentsApi — ADR-0005 délégation à api.ts', () => {
  beforeEach(() => {
    apiPostMock.mockReset();
    apiGetMock.mockReset();
  });

  it('getOnboardingLink → api.post avec path + body + token', async () => {
    apiPostMock.mockResolvedValue({ url: 'https://stripe', expiresAt: 1 });
    await paymentsApi.getOnboardingLink(
      'https://r',
      'https://refresh',
      'tok',
    );
    expect(apiPostMock).toHaveBeenCalledWith(
      '/payments/connect/onboarding-link',
      { returnUrl: 'https://r', refreshUrl: 'https://refresh' },
      'tok',
    );
  });

  it('refreshAccountStatus → api.post (mutation, body vide)', async () => {
    apiPostMock.mockResolvedValue({ status: 'CHARGES_ENABLED' });
    await paymentsApi.refreshAccountStatus('tok');
    expect(apiPostMock).toHaveBeenCalledWith(
      '/payments/connect/refresh-status',
      {},
      'tok',
    );
  });

  it('getAccountStatus → api.get (lecture)', async () => {
    apiGetMock.mockResolvedValue({ status: 'PENDING_ONBOARDING' });
    await paymentsApi.getAccountStatus('tok');
    expect(apiGetMock).toHaveBeenCalledWith(
      '/payments/connect/account-status',
      'tok',
    );
  });

  it('createCheckoutSession → api.post avec input + token', async () => {
    apiPostMock.mockResolvedValue({
      paymentId: 'p1',
      sessionId: 'cs_1',
      checkoutUrl: 'https://checkout',
    });
    const input = {
      quoteRequestId: 'rfq1',
      marketplaceOfferId: 'off1',
      returnUrl: 'https://r',
      cancelUrl: 'https://c',
    };
    await paymentsApi.createCheckoutSession(input, 'tok');
    expect(apiPostMock).toHaveBeenCalledWith(
      '/payments/checkout-session',
      input,
      'tok',
    );
  });
});
