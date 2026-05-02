import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Mock lucide-react icons to avoid forwardRef render issues in jsdom
vi.mock('lucide-react', () => {
  const icon = (name: string) => {
    const Comp = ({ className }: { className?: string }) => <span data-testid={`icon-${name}`} className={className} />;
    Comp.displayName = name;
    return Comp;
  };
  return {
    BarChart3: icon('BarChart3'),
    TrendingUp: icon('TrendingUp'),
    Target: icon('Target'),
    Package: icon('Package'),
    MessageSquareQuote: icon('MessageSquareQuote'),
    Trophy: icon('Trophy'),
    ArrowRight: icon('ArrowRight'),
  };
});

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock('@/components/ui/page-header', () => ({
  PageHeader: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <header><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</header>
  ),
}));

import SellerAnalyticsPage from './page';

// Mock auth
vi.mock('@/contexts/auth.context', () => ({
  useAuth: () => ({
    user: { id: 'u1', firstName: 'Test', lastName: 'Seller', role: 'MARKETPLACE_SELLER' },
    token: 'test-token',
  }),
}));

// Mock quote requests API
const mockList = vi.fn();
vi.mock('@/lib/quote-requests', () => ({
  quoteRequestsApi: { list: (...args: unknown[]) => mockList(...args) },
  QuoteRequestSummary: {},
}));

// Re-export enum
vi.mock('@iox/shared', () => ({
  QuoteRequestStatus: {
    NEW: 'NEW',
    QUALIFIED: 'QUALIFIED',
    QUOTED: 'QUOTED',
    NEGOTIATING: 'NEGOTIATING',
    WON: 'WON',
    LOST: 'LOST',
    CANCELLED: 'CANCELLED',
  },
}));

const mockRfqs = [
  {
    id: '1',
    status: 'WON',
    createdAt: '2026-04-15T10:00:00Z',
    marketplaceOffer: {
      id: 'o1',
      title: 'Vanille',
      marketplaceProduct: { id: 'p1', slug: 'vanille', commercialName: 'Vanille Bourbon' },
      sellerProfile: { id: 's1', slug: 'seller-1', publicDisplayName: 'Seller 1' },
    },
    buyerCompany: { id: 'c1', code: 'BUY1', name: 'Buyer Corp', country: 'FR' },
  },
  {
    id: '2',
    status: 'QUALIFIED',
    createdAt: '2026-04-20T10:00:00Z',
    marketplaceOffer: {
      id: 'o1',
      title: 'Vanille',
      marketplaceProduct: { id: 'p1', slug: 'vanille', commercialName: 'Vanille Bourbon' },
      sellerProfile: { id: 's1', slug: 'seller-1', publicDisplayName: 'Seller 1' },
    },
    buyerCompany: { id: 'c2', code: 'BUY2', name: 'Buyer 2', country: 'FR' },
  },
  {
    id: '3',
    status: 'NEW',
    createdAt: '2026-05-01T10:00:00Z',
    marketplaceOffer: {
      id: 'o2',
      title: 'Ylang',
      marketplaceProduct: { id: 'p2', slug: 'ylang', commercialName: 'Ylang-Ylang' },
      sellerProfile: { id: 's1', slug: 'seller-1', publicDisplayName: 'Seller 1' },
    },
    buyerCompany: { id: 'c3', code: 'BUY3', name: 'Buyer 3', country: 'FR' },
  },
];

describe('SellerAnalyticsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ data: mockRfqs, meta: { total: 3, page: 1, limit: 500, totalPages: 1 } });
  });

  it('renders KPI cards with correct values', async () => {
    render(<SellerAnalyticsPage />);
    await waitFor(() => {
      expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1); // Total RFQ
      expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1); // WON
      expect(screen.getByText('33%')).toBeInTheDocument(); // Conversion rate
    });
  });

  it('renders top products section', async () => {
    render(<SellerAnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText('Vanille Bourbon')).toBeInTheDocument();
      expect(screen.getByText('Ylang-Ylang')).toBeInTheDocument();
    });
  });

  it('renders funnel chart', async () => {
    render(<SellerAnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText('Reçues')).toBeInTheDocument();
      expect(screen.getByText('Qualifiées')).toBeInTheDocument();
      expect(screen.getByText('Devisées')).toBeInTheDocument();
      // "Gagnées" appears both in KPI card and funnel
      expect(screen.getAllByText(/Gagnée/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('handles empty state', async () => {
    mockList.mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 500, totalPages: 0 } });
    render(<SellerAnalyticsPage />);
    await waitFor(() => {
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });
});
