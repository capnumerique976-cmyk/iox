// BUYER-DASHBOARD-2 — tests cockpit /buyer.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { UserRole, QuoteRequestStatus } from '@iox/shared';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/contexts/auth.context', () => ({
  useAuth: () => ({
    user: {
      id: 'b-1',
      role: UserRole.MARKETPLACE_BUYER,
      email: 'buyer@ex.com',
      firstName: 'Bob',
      lastName: 'Buyer',
    },
    token: 'tok',
    isLoading: false,
  }),
}));

const listMock = vi.fn();
vi.mock('@/lib/quote-requests', async () => {
  const actual = await vi.importActual<typeof import('@/lib/quote-requests')>(
    '@/lib/quote-requests',
  );
  return {
    ...actual,
    quoteRequestsApi: {
      ...actual.quoteRequestsApi,
      list: (...args: unknown[]) => listMock(...args),
    },
  };
});

import BuyerCockpitPage from './page';

const baseRow = (status: QuoteRequestStatus, id = 'q1') => ({
  id,
  status,
  requestedQuantity: 100,
  requestedUnit: 'kg',
  deliveryCountry: 'FR',
  targetMarket: 'EU',
  message: null,
  assignedToUserId: null,
  createdAt: '2026-04-20T00:00:00Z',
  updatedAt: '2026-04-21T00:00:00Z',
  marketplaceOffer: {
    id: 'o1',
    title: 'Vanille',
    priceMode: 'FIXED',
    unitPrice: '420',
    currency: 'EUR',
    moq: 50,
    incoterm: 'FOB',
    leadTimeDays: 14,
    departureLocation: 'Tamatave',
    sellerProfile: { id: 'sp1', slug: 'coop-x', publicDisplayName: 'Coop X' },
    marketplaceProduct: { id: 'mp1', slug: 'vanille', commercialName: 'Vanille' },
  },
  buyerCompany: { id: 'c1', code: 'BUY', name: 'Buyer Co', country: 'FR' },
  buyerUser: { id: 'b-1', firstName: 'Bob', lastName: 'Buyer', email: 'b@ex.com' },
  assignedToUser: null,
});

describe('BuyerCockpitPage (BUYER-DASHBOARD-2)', () => {
  beforeEach(() => listMock.mockReset());
  afterEach(() => vi.clearAllMocks());

  it('rend le greeting avec firstName et compte total', async () => {
    listMock.mockResolvedValue({
      data: [baseRow(QuoteRequestStatus.NEW)],
      meta: { total: 1, page: 1, limit: 200, totalPages: 1 },
    });
    render(<BuyerCockpitPage />);
    expect(await screen.findByText(/Bonjour Bob/)).toBeInTheDocument();
  });

  it('compte les RFQ par status (NEW/QUALIFIED/QUOTED/NEGOTIATING)', async () => {
    listMock.mockResolvedValue({
      data: [
        baseRow(QuoteRequestStatus.NEW, 'q1'),
        baseRow(QuoteRequestStatus.NEW, 'q2'),
        baseRow(QuoteRequestStatus.QUOTED, 'q3'),
      ],
      meta: { total: 3, page: 1, limit: 200, totalPages: 1 },
    });
    render(<BuyerCockpitPage />);
    await waitFor(() => expect(screen.getByTestId('rfq-count-NEW')).toHaveTextContent('2'));
    expect(screen.getByTestId('rfq-count-QUOTED')).toHaveTextContent('1');
    expect(screen.getByTestId('rfq-count-QUALIFIED')).toHaveTextContent('0');
  });

  it('lien "Voir toutes mes demandes" pointe sur /buyer/quote-requests', async () => {
    listMock.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 200, totalPages: 0 },
    });
    render(<BuyerCockpitPage />);
    const link = await screen.findByText(/Voir toutes mes demandes/);
    expect(link.closest('a')?.getAttribute('href')).toBe('/buyer/quote-requests');
  });

  it('raccourcis catalogue + profile', async () => {
    listMock.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 200, totalPages: 0 },
    });
    render(<BuyerCockpitPage />);
    await waitFor(() => expect(screen.getByText('Parcourir le catalogue')).toBeInTheDocument());
    expect(screen.getByText('Mon entreprise')).toBeInTheDocument();
    expect(
      screen.getByText('Parcourir le catalogue').closest('a')?.getAttribute('href'),
    ).toBe('/marketplace');
    expect(screen.getByText('Mon entreprise').closest('a')?.getAttribute('href')).toBe(
      '/buyer/profile',
    );
  });

  it("bouton Actualiser rappelle l'API", async () => {
    listMock.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 200, totalPages: 0 },
    });
    render(<BuyerCockpitPage />);
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByText('Actualiser'));
    await waitFor(() => expect(listMock).toHaveBeenCalledTimes(2));
  });
});
