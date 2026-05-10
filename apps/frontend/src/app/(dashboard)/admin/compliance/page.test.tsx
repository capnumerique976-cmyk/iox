// M57 — Tests page admin compliance.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth');
  return {
    ...actual,
    authStorage: { ...actual.authStorage, getAccessToken: () => 'tok' },
  };
});

global.fetch = vi.fn();

interface AdminComplianceSummary {
  sellersTotal: number;
  sellersApproved: number;
  sellersPendingReview: number;
  sellersRejected: number;
  sellersSuspended: number;
  documentsPending: number;
  documentsRejected: number;
  documentsExpired: number;
  documentsExpiringSoon: number;
  certificationsPending: number;
  certificationsRejected: number;
  certificationsExpired: number;
  certificationsExpiringSoon: number;
  reviewQueuePending: number;
}

const makeAdminSummary = (
  overrides: Partial<AdminComplianceSummary> = {},
): AdminComplianceSummary => ({
  sellersTotal: 5,
  sellersApproved: 3,
  sellersPendingReview: 1,
  sellersRejected: 1,
  sellersSuspended: 0,
  documentsPending: 2,
  documentsRejected: 1,
  documentsExpired: 0,
  documentsExpiringSoon: 0,
  certificationsPending: 1,
  certificationsRejected: 0,
  certificationsExpired: 0,
  certificationsExpiringSoon: 0,
  reviewQueuePending: 3,
  ...overrides,
});

import AdminCompliancePage from './page';

describe('AdminCompliancePage (M57)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(() => vi.clearAllMocks());

  it('affiche les KPIs admin', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(makeAdminSummary()),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });
    render(<AdminCompliancePage />);
    await waitFor(() =>
      expect(screen.getByTestId('admin-compliance-kpi-approved')).toHaveTextContent('3'),
    );
  });

  it('affiche empty state si 0 sellers', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(makeAdminSummary()),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });
    render(<AdminCompliancePage />);
    await waitFor(() =>
      expect(screen.getByTestId('admin-compliance-empty')).toBeInTheDocument(),
    );
  });

  it('affiche le KPI en attente', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(makeAdminSummary()),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });
    render(<AdminCompliancePage />);
    await waitFor(() =>
      expect(screen.getByTestId('admin-compliance-kpi-pending')).toHaveTextContent('1'),
    );
  });

  it('affiche le tableau si vendors présents', async () => {
    const sellers = [
      {
        sellerProfileId: 'sp-1',
        publicDisplayName: 'Vendeur A',
        sellerProfileStatus: 'APPROVED',
        complianceStatus: 'COMPLETE',
        documentsTotal: 3,
        documentsVerified: 3,
        documentsPending: 0,
        documentsRejected: 0,
        certificationsTotal: 1,
        certificationsVerified: 1,
        certificationsPending: 0,
        certificationsRejected: 0,
      },
    ];
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(makeAdminSummary()),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(sellers),
      });
    render(<AdminCompliancePage />);
    await waitFor(() => {
      expect(screen.getByTestId('admin-compliance-sellers-table')).toBeInTheDocument();
      expect(screen.getByText('Vendeur A')).toBeInTheDocument();
    });
  });

  it('affiche une alerte si documents expirent bientôt', async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve(makeAdminSummary({ documentsExpiringSoon: 2, certificationsExpiringSoon: 1 })),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });
    render(<AdminCompliancePage />);
    await waitFor(() =>
      expect(screen.getByText(/expirent dans moins de 30 jours/)).toBeInTheDocument(),
    );
  });
});
