// BUYER-DASHBOARD-2 LOT B — tests /buyer/orders.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

import BuyerOrdersPage from './page';

const wonRow = (id = 'q1') => ({
  id,
  status: QuoteRequestStatus.WON,
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
});

describe('BuyerOrdersPage (BUYER-DASHBOARD-2 LOT B)', () => {
  beforeEach(() => listMock.mockReset());
  afterEach(() => vi.clearAllMocks());

  it('renders orders list with mock data', async () => {
    listMock.mockResolvedValue({
      data: [wonRow('q1'), wonRow('q2')],
      meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
    });
    render(<BuyerOrdersPage />);
    expect(await screen.findByTestId('orders-table')).toBeInTheDocument();
    expect(screen.getByTestId('order-row-q1')).toBeInTheDocument();
    expect(screen.getByTestId('order-row-q2')).toBeInTheDocument();
    expect(screen.getAllByText('Vanille Bourbon')).toHaveLength(2);
    expect(screen.getAllByText('Coop X')).toHaveLength(2);
  });

  it('shows empty state when no orders', async () => {
    listMock.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });
    render(<BuyerOrdersPage />);
    expect(await screen.findByTestId('orders-empty')).toBeInTheDocument();
  });

  it('calls API with status=WON filter', async () => {
    listMock.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });
    render(<BuyerOrdersPage />);
    await waitFor(() =>
      expect(listMock).toHaveBeenCalledWith('tok', {
        status: 'WON',
        page: '1',
        limit: '20',
      }),
    );
  });
});
