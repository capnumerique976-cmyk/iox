// PAY-1 phase 1 LOT 3 — Test buyer checkout page.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const createCheckoutSessionMock = vi.fn();

vi.mock('@/lib/payments', async () => {
  const actual = await vi.importActual<typeof import('@/lib/payments')>('@/lib/payments');
  return {
    ...actual,
    paymentsApi: {
      createCheckoutSession: (...args: unknown[]) => createCheckoutSessionMock(...args),
    },
  };
});

vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth');
  return {
    ...actual,
    authStorage: { ...actual.authStorage, getAccessToken: () => 'tok' },
  };
});

vi.mock('next/navigation', () => ({
  useParams: () => ({ rfqId: 'rfq-test-1' }),
}));

import BuyerCheckoutPage from './page';

describe('BuyerCheckoutPage (PAY-1 LOT 3)', () => {
  beforeEach(() => {
    createCheckoutSessionMock.mockReset();
  });
  afterEach(() => vi.clearAllMocks());

  it('rend bouton Payer + champs montant/offerId', () => {
    render(<BuyerCheckoutPage />);
    expect(screen.getByTestId('buyer-checkout-pay')).toBeInTheDocument();
    expect(screen.getByTestId('buyer-checkout-amount')).toBeInTheDocument();
    expect(screen.getByTestId('buyer-checkout-offer-id')).toBeInTheDocument();
  });

  it('click Payer sans champs → erreur affichée', async () => {
    const user = userEvent.setup();
    render(<BuyerCheckoutPage />);
    await user.click(screen.getByTestId('buyer-checkout-pay'));
    await waitFor(() => {
      expect(screen.getByTestId('buyer-checkout-error')).toBeInTheDocument();
    });
    expect(createCheckoutSessionMock).not.toHaveBeenCalled();
  });

  it('click Payer avec champs OK → appelle API + redirect Stripe', async () => {
    createCheckoutSessionMock.mockResolvedValue({
      paymentId: 'pay1',
      sessionId: 'cs_x',
      checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_x',
    });
    // Stub window.location
    const originalLocation = window.location;
    delete (window as unknown as { location?: Location }).location;
    (window as unknown as { location: { href: string; origin: string } }).location = {
      href: '',
      origin: 'https://iox.test',
    };

    const user = userEvent.setup();
    render(<BuyerCheckoutPage />);
    await user.type(screen.getByTestId('buyer-checkout-offer-id'), 'offer-1');
    await user.type(screen.getByTestId('buyer-checkout-amount'), '100');
    await user.click(screen.getByTestId('buyer-checkout-pay'));

    await waitFor(() => {
      expect(createCheckoutSessionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          quoteRequestId: 'rfq-test-1',
          marketplaceOfferId: 'offer-1',
          amountCents: 10000,
        }),
        'tok',
      );
    });
    (window as unknown as { location: Location }).location = originalLocation;
  });
});
