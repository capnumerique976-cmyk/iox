import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('lucide-react', () => {
  const icon = (name: string) => {
    const Comp = ({ className }: { className?: string }) => <span data-testid={`icon-${name}`} className={className} />;
    Comp.displayName = name;
    return Comp;
  };
  return {
    Users: icon('Users'),
    Store: icon('Store'),
    Package: icon('Package'),
    MessageSquareQuote: icon('MessageSquareQuote'),
    Mail: icon('Mail'),
    TrendingUp: icon('TrendingUp'),
    AlertCircle: icon('AlertCircle'),
    CheckCircle2: icon('CheckCircle2'),
    Clock: icon('Clock'),
  };
});

vi.mock('@/components/ui/page-header', () => ({
  PageHeader: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <header><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</header>
  ),
}));

const mockGet = vi.fn();
vi.mock('@/lib/api', () => ({ api: { get: (...args: unknown[]) => mockGet(...args) } }));

vi.mock('@/contexts/auth.context', () => ({
  useAuth: () => ({
    user: { id: 'admin-1', role: 'ADMIN', firstName: 'Admin', lastName: 'User' },
    token: 'admin-token',
  }),
}));

import AdminKpiPage from './page';

describe('AdminKpiPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/users')) return Promise.resolve({ meta: { total: 42 } });
      if (url.includes('/seller-profiles')) return Promise.resolve({ meta: { total: 8 } });
      if (url.includes('/review-queue/stats')) return Promise.resolve({ publications: 3, media: 1, documents: 2 });
      if (url.includes('/quote-requests')) return Promise.resolve({
        data: [
          { status: 'WON' },
          { status: 'NEW' },
          { status: 'QUALIFIED' },
          { status: 'LOST' },
        ],
        meta: { total: 4 },
      });
      if (url.includes('/logs-stats')) return Promise.resolve({
        byStatus: [
          { status: 'SENT', count: 150 },
          { status: 'FAILED', count: 5 },
        ],
      });
      return Promise.resolve({});
    });
  });

  it('renders page title', async () => {
    render(<AdminKpiPage />);
    expect(screen.getByText('KPIs Plateforme')).toBeInTheDocument();
  });

  it('displays KPI values after loading', async () => {
    render(<AdminKpiPage />);
    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument(); // users
      expect(screen.getByText('8')).toBeInTheDocument(); // sellers
      expect(screen.getByText('6')).toBeInTheDocument(); // review pending (3+1+2)
    });
  });

  it('displays email stats', async () => {
    render(<AdminKpiPage />);
    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument(); // emails sent
      expect(screen.getByText('5')).toBeInTheDocument(); // emails failed
    });
  });

  it('shows conversion rate section', async () => {
    render(<AdminKpiPage />);
    await waitFor(() => {
      expect(screen.getByText('RFQ → WON')).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();
    });
  });
});
