// M58 — Tests page liste demandes de devis vendeur.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QuoteRequestStatus } from '@iox/shared';

vi.mock('lucide-react', () => {
  const icon = (name: string) => {
    const Comp = ({ className }: { className?: string }) => <span data-testid={`icon-${name}`} className={className} />;
    Comp.displayName = name;
    return Comp;
  };
  return {
    MessageSquareQuote: icon('MessageSquareQuote'),
    MessageSquare: icon('MessageSquare'),
    ChevronRight: icon('ChevronRight'),
  };
});

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href: string; children: React.ReactNode } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock('@/contexts/auth.context', () => ({
  useAuth: () => ({ token: 'tok', user: { id: 'seller-1', role: 'MARKETPLACE_SELLER' } }),
}));

const listMock = vi.fn();
vi.mock('@/lib/quote-requests', async () => {
  const actual = await vi.importActual<typeof import('@/lib/quote-requests')>('@/lib/quote-requests');
  return {
    ...actual,
    quoteRequestsApi: {
      ...actual.quoteRequestsApi,
      list: (...args: unknown[]) => listMock(...args),
    },
  };
});

import SellerQuoteRequestsPage from './page';

function makeRfq(id: string, status: QuoteRequestStatus, title = 'Vanille Bourbon') {
  return {
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
      title,
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
    buyerCompany: { id: 'c1', code: 'BUY', name: 'Acheteur SARL', country: 'FR' },
    buyerUser: { id: 'b-1', firstName: 'Bob', lastName: 'Buyer', email: 'b@ex.com' },
    assignedToUser: null,
    _count: { messages: 2 },
  };
}

describe('SellerQuoteRequestsPage (M58)', () => {
  beforeEach(() => listMock.mockReset());
  afterEach(() => vi.clearAllMocks());

  it('affiche empty state si aucune demande', async () => {
    listMock.mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 50, totalPages: 0 } });
    render(<SellerQuoteRequestsPage />);
    expect(await screen.findByTestId('seller-rfq-list-empty')).toBeInTheDocument();
    expect(screen.getByTestId('seller-rfq-list-empty')).toHaveTextContent(/Aucune demande/);
  });

  it('affiche la liste des demandes', async () => {
    listMock.mockResolvedValue({
      data: [makeRfq('q1', QuoteRequestStatus.NEW), makeRfq('q2', QuoteRequestStatus.QUOTED, 'Cannelle Bio')],
      meta: { total: 2, page: 1, limit: 50, totalPages: 1 },
    });
    render(<SellerQuoteRequestsPage />);
    await waitFor(() => expect(screen.getByTestId('seller-rfq-list')).toBeInTheDocument());
    expect(screen.getAllByTestId('seller-rfq-list-item')).toHaveLength(2);
    expect(screen.getByText('Vanille Bourbon')).toBeInTheDocument();
    expect(screen.getByText('Cannelle Bio')).toBeInTheDocument();
  });

  it('affiche le statut de chaque demande', async () => {
    listMock.mockResolvedValue({
      data: [makeRfq('q1', QuoteRequestStatus.QUOTED)],
      meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
    });
    render(<SellerQuoteRequestsPage />);
    await waitFor(() => expect(screen.getByTestId('seller-rfq-list')).toBeInTheDocument());
    expect(screen.getByText('Devisée')).toBeInTheDocument();
  });

  it('lien vers le détail de la demande', async () => {
    listMock.mockResolvedValue({
      data: [makeRfq('q99', QuoteRequestStatus.NEW)],
      meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
    });
    render(<SellerQuoteRequestsPage />);
    await waitFor(() => expect(screen.getByTestId('seller-rfq-list-item')).toBeInTheDocument());
    expect(screen.getByTestId('seller-rfq-list-item').closest('a')).toHaveAttribute(
      'href',
      '/seller/quote-requests/q99',
    );
  });

  it('affiche le nom de la société de l\'acheteur dans la liste', async () => {
    listMock.mockResolvedValue({
      data: [makeRfq('q1', QuoteRequestStatus.NEW)],
      meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
    });
    render(<SellerQuoteRequestsPage />);
    await waitFor(() => expect(screen.getByTestId('seller-rfq-list')).toBeInTheDocument());
    expect(screen.getByText('Acheteur SARL')).toBeInTheDocument();
  });
});
