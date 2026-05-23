// PAY-1 phase 1 LOT 4 — Test buyer checkout page (avec pré-remplissage RFQ).

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

const getMock = vi.fn();
vi.mock('@/lib/quote-requests', async () => {
  const actual = await vi.importActual<typeof import('@/lib/quote-requests')>('@/lib/quote-requests');
  return {
    ...actual,
    quoteRequestsApi: {
      ...actual.quoteRequestsApi,
      get: (...args: unknown[]) => getMock(...args),
    },
  };
});

import BuyerCheckoutPage from './page';

function makeRfq(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rfq-test-1',
    status: 'WON',
    requestedQuantity: 100,
    requestedUnit: 'kg',
    deliveryCountry: 'FR',
    targetMarket: 'EU',
    message: null,
    assignedToUserId: null,
    createdAt: '2026-04-20T00:00:00Z',
    updatedAt: '2026-04-21T00:00:00Z',
    marketplaceOffer: {
      id: 'offer-prefill-1',
      title: 'Vanille Bourbon Premium',
      priceMode: 'FIXED',
      unitPrice: '5.00',
      currency: 'EUR',
      moq: 50,
      incoterm: 'FOB',
      leadTimeDays: 14,
      departureLocation: 'Tamatave',
      sellerProfile: { id: 'sp1', slug: 'coop-x', publicDisplayName: 'Coop X' },
      marketplaceProduct: { id: 'mp1', slug: 'vanille', commercialName: 'Vanille Bourbon' },
    },
    buyerCompany: { id: 'c1', code: 'BUY', name: 'Buyer Co', country: 'FR' },
    buyerUser: { id: 'b-1', firstName: 'Bob', lastName: 'Buyer', email: 'b@ex.com' },
    assignedToUser: null,
    // M133 — montant verrouillé côté serveur (500 EUR = 50000 centimes)
    agreedAmountCents: 50000,
    agreedCurrency: 'EUR',
    ...overrides,
  };
}

describe('BuyerCheckoutPage (PAY-1 LOT 4)', () => {
  beforeEach(() => {
    createCheckoutSessionMock.mockReset();
    getMock.mockReset();
  });
  afterEach(() => vi.clearAllMocks());

  it('rend bouton Payer + champs montant/offerId', async () => {
    getMock.mockResolvedValue(makeRfq());
    render(<BuyerCheckoutPage />);
    await waitFor(() => expect(screen.getByTestId('buyer-checkout-pay')).toBeInTheDocument());
    expect(screen.getByTestId('buyer-checkout-amount')).toBeInTheDocument();
    expect(screen.getByTestId('buyer-checkout-offer-id')).toBeInTheDocument();
  });

  it('M133 — click Payer sans montant affiché → API appelée (serveur valide le montant)', async () => {
    // M133 — Le montant n'est plus validé côté client.
    // Même sans unitPrice, le frontend appelle l'API ; c'est le serveur (agreedAmountCents)
    // qui valide et retourne 400 si non verrouillé.
    const apiError = new Error('Le montant payable n\'a pas été verrouillé');
    createCheckoutSessionMock.mockRejectedValue(apiError);
    getMock.mockResolvedValue(makeRfq({ marketplaceOffer: { id: 'o1', title: 'T', priceMode: 'FIXED', unitPrice: null, currency: null, moq: null, incoterm: null, leadTimeDays: null, departureLocation: null, sellerProfile: null, marketplaceProduct: null } }));
    const user = userEvent.setup();
    render(<BuyerCheckoutPage />);
    await waitFor(() => expect(screen.getByTestId('buyer-checkout-pay')).toBeInTheDocument());
    // Le montant est affiché en lecture seule (p, non éditable)
    const amountDisplay = screen.getByTestId('buyer-checkout-amount');
    expect(amountDisplay.tagName.toLowerCase()).toBe('p');
    await user.click(screen.getByTestId('buyer-checkout-pay'));
    // M133 — l'API EST appelée (guard côté serveur, pas client)
    await waitFor(() => {
      expect(createCheckoutSessionMock).toHaveBeenCalledWith(
        expect.objectContaining({ quoteRequestId: 'rfq-test-1', marketplaceOfferId: 'o1' }),
        'tok',
      );
    });
  });

  it('click Payer avec champs OK → appelle API + redirect Stripe', async () => {
    getMock.mockResolvedValue(makeRfq());
    createCheckoutSessionMock.mockResolvedValue({
      paymentId: 'pay1',
      sessionId: 'cs_x',
      checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_x',
    });
    const originalLocation = window.location;
    delete (window as unknown as { location?: Location }).location;
    (window as unknown as { location: { href: string; origin: string } }).location = {
      href: '',
      origin: 'https://iox.test',
    };

    const user = userEvent.setup();
    render(<BuyerCheckoutPage />);
    await waitFor(() => expect(screen.getByTestId('buyer-checkout-pay')).toBeInTheDocument());
    await user.click(screen.getByTestId('buyer-checkout-pay'));

    await waitFor(() => {
      expect(createCheckoutSessionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          quoteRequestId: 'rfq-test-1',
          marketplaceOfferId: 'offer-prefill-1',
        }),
        'tok',
      );
    });
    (window as unknown as { location: Location }).location = originalLocation;
  });

  it('pré-remplit offerId et montant depuis le RFQ fetché', async () => {
    getMock.mockResolvedValue(makeRfq());
    render(<BuyerCheckoutPage />);
    await waitFor(() => {
      const offerInput = screen.getByTestId('buyer-checkout-offer-id') as HTMLInputElement;
      expect(offerInput.value).toBe('offer-prefill-1');
    });
    // Le montant est affiché en read-only (p, non éditable par le buyer)
    const amountDisplay = screen.getByTestId('buyer-checkout-amount');
    // 5.00 * 100 = 500.00
    expect(amountDisplay.textContent).toBe('500.00');
  });

  it('affiche un état d\'erreur si le fetch RFQ échoue (404)', async () => {
    getMock.mockRejectedValue(new Error('RFQ introuvable'));
    render(<BuyerCheckoutPage />);
    await waitFor(() => {
      expect(screen.getByTestId('buyer-checkout-rfq-error')).toBeInTheDocument();
    });
    expect(screen.getByTestId('buyer-checkout-rfq-error')).toHaveTextContent('RFQ introuvable');
  });

  it('affiche le résumé avec nom produit, quantité et ID offre', async () => {
    getMock.mockResolvedValue(makeRfq());
    render(<BuyerCheckoutPage />);
    await waitFor(() => {
      expect(screen.getByTestId('buyer-checkout-summary')).toBeInTheDocument();
    });
    expect(screen.getByTestId('buyer-checkout-summary')).toHaveTextContent('Vanille Bourbon');
    expect(screen.getByTestId('buyer-checkout-summary')).toHaveTextContent('100');
  });

  it('affiche le nom du vendeur dans le résumé', async () => {
    getMock.mockResolvedValue(makeRfq());
    render(<BuyerCheckoutPage />);
    await waitFor(() => expect(screen.getByTestId('buyer-checkout-summary')).toBeInTheDocument());
    expect(screen.getByTestId('buyer-checkout-summary')).toHaveTextContent('Coop X');
  });

  it('affiche le montant total proéminent', async () => {
    getMock.mockResolvedValue(makeRfq());
    render(<BuyerCheckoutPage />);
    await waitFor(() => expect(screen.getByTestId('buyer-checkout-total')).toBeInTheDocument());
    expect(screen.getByTestId('buyer-checkout-total')).toHaveTextContent('500.00');
  });

  it('affiche le bandeau sécurité Stripe', async () => {
    getMock.mockResolvedValue(makeRfq());
    render(<BuyerCheckoutPage />);
    await waitFor(() => expect(screen.getByTestId('buyer-checkout-security')).toBeInTheDocument());
    expect(screen.getByTestId('buyer-checkout-security')).toHaveTextContent('Stripe');
  });

  it('createCheckoutSession retourne 400 "Stripe non configuré" → alert "Paiement temporairement indisponible" affiché', async () => {
    getMock.mockResolvedValue(makeRfq());
    createCheckoutSessionMock.mockRejectedValue(
      new Error('Stripe non configuré côté serveur. Contacter l\'admin.'),
    );
    const user = userEvent.setup();
    render(<BuyerCheckoutPage />);
    await waitFor(() => expect(screen.getByTestId('buyer-checkout-pay')).toBeInTheDocument());
    await user.click(screen.getByTestId('buyer-checkout-pay'));
    await waitFor(() => {
      expect(screen.getByTestId('stripe-not-configured-alert')).toBeInTheDocument();
    });
    expect(screen.getByTestId('stripe-not-configured-alert')).toHaveTextContent(
      'Paiement temporairement indisponible',
    );
  });

  it('lien retour pointe vers la demande RFQ', async () => {
    getMock.mockResolvedValue(makeRfq());
    render(<BuyerCheckoutPage />);
    await waitFor(() => expect(screen.getByTestId('buyer-checkout-back-link')).toBeInTheDocument());
    expect(screen.getByTestId('buyer-checkout-back-link')).toHaveAttribute(
      'href',
      '/buyer/quote-requests/rfq-test-1',
    );
  });
});
