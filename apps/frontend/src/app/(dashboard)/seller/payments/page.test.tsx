// PAY-1 phase 1 LOT 2 — Tests page seller payments.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SellerStripeAccountStatus } from '@iox/shared';

const getAccountStatusMock = vi.fn();
const refreshAccountStatusMock = vi.fn();
const getOnboardingLinkMock = vi.fn();

vi.mock('@/lib/payments', async () => {
  const actual = await vi.importActual<typeof import('@/lib/payments')>('@/lib/payments');
  return {
    ...actual,
    paymentsApi: {
      getAccountStatus: (...args: unknown[]) => getAccountStatusMock(...args),
      refreshAccountStatus: (...args: unknown[]) => refreshAccountStatusMock(...args),
      getOnboardingLink: (...args: unknown[]) => getOnboardingLinkMock(...args),
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

import SellerPaymentsPage from './page';

describe('SellerPaymentsPage (PAY-1 LOT 2)', () => {
  beforeEach(() => {
    getAccountStatusMock.mockReset();
    refreshAccountStatusMock.mockReset();
    getOnboardingLinkMock.mockReset();
  });
  afterEach(() => vi.clearAllMocks());

  it('rend status PENDING_ONBOARDING + bouton "Démarrer l\'onboarding"', async () => {
    getAccountStatusMock.mockResolvedValue({
      status: SellerStripeAccountStatus.PENDING_ONBOARDING,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
    });
    render(<SellerPaymentsPage />);
    await waitFor(() => {
      expect(screen.getByTestId('seller-payments-status-badge')).toHaveTextContent(
        /En attente/,
      );
      expect(screen.getByTestId('seller-payments-start')).toHaveTextContent(/Démarrer/);
    });
  });

  it('rend status CHARGES_ENABLED + bouton "Poursuivre"', async () => {
    getAccountStatusMock.mockResolvedValue({
      status: SellerStripeAccountStatus.CHARGES_ENABLED,
      chargesEnabled: true,
      payoutsEnabled: false,
      detailsSubmitted: true,
    });
    render(<SellerPaymentsPage />);
    await waitFor(() => {
      expect(screen.getByTestId('seller-payments-start')).toHaveTextContent(/Poursuivre/);
    });
  });

  it('rend status PAYOUTS_ENABLED + pas de bouton + message OK', async () => {
    getAccountStatusMock.mockResolvedValue({
      status: SellerStripeAccountStatus.PAYOUTS_ENABLED,
      chargesEnabled: true,
      payoutsEnabled: true,
      detailsSubmitted: true,
    });
    render(<SellerPaymentsPage />);
    await waitFor(() => {
      expect(screen.getByTestId('seller-payments-ok')).toBeInTheDocument();
      expect(screen.queryByTestId('seller-payments-start')).not.toBeInTheDocument();
    });
  });

  it('click démarrer → appelle getOnboardingLink avec returnUrl/refreshUrl', async () => {
    getAccountStatusMock.mockResolvedValue({
      status: SellerStripeAccountStatus.PENDING_ONBOARDING,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
    });
    getOnboardingLinkMock.mockResolvedValue({
      url: 'https://stripe.com/onboard/x',
      expiresAt: 123,
    });
    // window.location.href : stub via assign
    const originalLocation = window.location;
    delete (window as unknown as { location?: Location }).location;
    (window as unknown as { location: { href: string; origin: string } }).location = {
      href: '',
      origin: 'https://iox.test',
    };

    const user = userEvent.setup();
    render(<SellerPaymentsPage />);
    await waitFor(() => expect(screen.getByTestId('seller-payments-start')).toBeInTheDocument());
    await user.click(screen.getByTestId('seller-payments-start'));
    await waitFor(() => {
      expect(getOnboardingLinkMock).toHaveBeenCalledWith(
        'https://iox.test/seller/payments/return',
        'https://iox.test/seller/payments/refresh',
        'tok',
      );
    });
    (window as unknown as { location: Location }).location = originalLocation;
  });

  it('click rafraîchir → appelle refreshAccountStatus', async () => {
    getAccountStatusMock.mockResolvedValue({
      status: SellerStripeAccountStatus.CHARGES_ENABLED,
      chargesEnabled: true,
      payoutsEnabled: false,
      detailsSubmitted: true,
    });
    refreshAccountStatusMock.mockResolvedValue({
      status: SellerStripeAccountStatus.PAYOUTS_ENABLED,
      chargesEnabled: true,
      payoutsEnabled: true,
      detailsSubmitted: true,
    });
    const user = userEvent.setup();
    render(<SellerPaymentsPage />);
    await waitFor(() => expect(screen.getByTestId('seller-payments-refresh')).toBeInTheDocument());
    await user.click(screen.getByTestId('seller-payments-refresh'));
    await waitFor(() => {
      expect(refreshAccountStatusMock).toHaveBeenCalled();
      expect(screen.getByTestId('seller-payments-ok')).toBeInTheDocument();
    });
  });
});
