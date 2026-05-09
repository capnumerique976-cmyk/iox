// B2 — Tests MarketplaceBell component.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

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

vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth');
  return {
    ...actual,
    authStorage: { ...actual.authStorage, getAccessToken: () => 'tok' },
  };
});

const fetchMock = vi.fn();
global.fetch = fetchMock;

import { MarketplaceBell } from './marketplace-bell';

function makeAlerts(overrides: Record<string, number> = {}) {
  return {
    total: 0,
    newRfqs: 0,
    newQuotes: 0,
    pendingPayment: 0,
    pendingActions: 0,
    ...overrides,
  };
}

describe('MarketplaceBell (B2)', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });
  afterEach(() => vi.clearAllMocks());

  it('renders without badge when total=0', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => makeAlerts({ total: 0 }),
    });
    render(<MarketplaceBell />);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/dashboard/marketplace-alerts',
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer tok' }) }),
      );
    });
    expect(screen.queryByTestId('marketplace-bell-badge')).not.toBeInTheDocument();
    expect(screen.getByTestId('marketplace-bell-btn')).toBeInTheDocument();
  });

  it('shows badge count when total > 0', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => makeAlerts({ total: 3, newRfqs: 2, pendingPayment: 1 }),
    });
    render(<MarketplaceBell />);
    await waitFor(() => {
      expect(screen.getByTestId('marketplace-bell-badge')).toBeInTheDocument();
    });
    expect(screen.getByTestId('marketplace-bell-badge')).toHaveTextContent('3');
  });
});
