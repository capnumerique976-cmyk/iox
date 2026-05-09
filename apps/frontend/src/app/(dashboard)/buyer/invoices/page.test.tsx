// PAY-2 — tests buyer invoices page.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { UserRole } from '@iox/shared';

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
vi.mock('@/lib/invoices', () => ({
  invoicesApi: {
    list: (...args: unknown[]) => listMock(...args),
  },
}));

import BuyerInvoicesPage from './page';

const sampleInvoice = (id: string, status: 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELED' = 'PAID') => ({
  id,
  paymentId: `pay-${id}`,
  sellerProfileId: 'sp1',
  buyerCompanyId: 'c1',
  invoiceNumber: `INV-${id.toUpperCase()}`,
  amountCents: 42000,
  currency: 'EUR',
  status,
  pdfStorageKey: null,
  issuedAt: '2026-05-01T10:00:00Z',
  createdAt: '2026-05-01T09:00:00Z',
  updatedAt: '2026-05-01T10:00:00Z',
});

describe('BuyerInvoicesPage (PAY-2)', () => {
  beforeEach(() => listMock.mockReset());
  afterEach(() => vi.clearAllMocks());

  it('renders invoice list with mock data', async () => {
    const inv2 = { ...sampleInvoice('i2', 'ISSUED'), amountCents: 15050 };
    listMock.mockResolvedValue({
      data: [sampleInvoice('i1'), inv2],
      meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
    });
    render(<BuyerInvoicesPage />);

    expect(await screen.findByTestId('buyer-invoices-page')).toBeInTheDocument();
    expect(screen.getByTestId('invoices-table')).toBeInTheDocument();
    // dual layout: mobile card + desktop table both render in jsdom
    expect(screen.getAllByTestId('invoice-row-i1')[0]).toBeInTheDocument();
    expect(screen.getAllByTestId('invoice-row-i2')[0]).toBeInTheDocument();
    expect(screen.getAllByText('INV-I1')[0]).toBeInTheDocument();
    expect(screen.getAllByText('420.00 €')[0]).toBeInTheDocument();
    expect(screen.getAllByText('150.50 €')[0]).toBeInTheDocument();
    expect(screen.getAllByTestId('invoice-status-i1')[0]).toHaveTextContent('Payee');
    expect(screen.getAllByTestId('invoice-status-i2')[0]).toHaveTextContent('Emise');
  });

  it('shows empty state when no invoices', async () => {
    listMock.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });
    render(<BuyerInvoicesPage />);

    expect(await screen.findByTestId('invoices-empty')).toBeInTheDocument();
    expect(screen.getByText(/Aucune facture/)).toBeInTheDocument();
  });
});
