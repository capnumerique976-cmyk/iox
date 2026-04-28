// BUYER-DASHBOARD-1 — tests page liste /buyer/quote-requests.
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
    user: { id: 'b-1', role: UserRole.MARKETPLACE_BUYER, email: 'buyer@ex.com' },
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

import BuyerQuoteRequestsListPage from './page';

const baseRow = {
  id: 'q1',
  status: QuoteRequestStatus.NEW,
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
    title: 'Vanille Bourbon',
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
};

describe('BuyerQuoteRequestsListPage (BUYER-DASHBOARD-1)', () => {
  beforeEach(() => listMock.mockReset());
  afterEach(() => vi.clearAllMocks());

  it('rend les lignes avec lien vers le détail buyer', async () => {
    listMock.mockResolvedValue({
      data: [baseRow],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });
    render(<BuyerQuoteRequestsListPage />);
    await waitFor(() => expect(screen.getByText('Vanille Bourbon')).toBeInTheDocument());
    expect(screen.getByText('Coop X')).toBeInTheDocument();
    const link = screen.getByText(/Voir →/).closest('a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/buyer/quote-requests/q1');
  });

  it('affiche un empty state si aucune demande', async () => {
    listMock.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });
    render(<BuyerQuoteRequestsListPage />);
    expect(
      await screen.findByText(/Vous n'avez pas encore de demande/i),
    ).toBeInTheDocument();
  });

  it('toggle filter status repasse status=NEW dans l\'appel API', async () => {
    listMock.mockResolvedValue({
      data: [baseRow],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });
    render(<BuyerQuoteRequestsListPage />);
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    listMock.mockClear();
    fireEvent.click(screen.getAllByText('Nouvelle')[0]);
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    const lastCall = listMock.mock.calls[listMock.mock.calls.length - 1];
    expect(lastCall[1].status).toBe('NEW');
  });

  it('filtre client-side par vendeur (search slug)', async () => {
    listMock.mockResolvedValue({
      data: [
        baseRow,
        {
          ...baseRow,
          id: 'q2',
          marketplaceOffer: {
            ...baseRow.marketplaceOffer,
            sellerProfile: { id: 'sp2', slug: 'autre', publicDisplayName: 'Autre Coop' },
          },
        },
      ],
      meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
    });
    render(<BuyerQuoteRequestsListPage />);
    await waitFor(() => expect(screen.getByText('Coop X')).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText(/coopérative/i), {
      target: { value: 'coop-x' },
    });
    expect(screen.getByText('Coop X')).toBeInTheDocument();
    expect(screen.queryByText('Autre Coop')).not.toBeInTheDocument();
  });
});
