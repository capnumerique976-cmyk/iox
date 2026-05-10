// M57 — Tests page seller compliance.

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

interface SellerComplianceSummary {
  status: 'COMPLETE' | 'ACTION_REQUIRED' | 'PENDING_REVIEW' | 'BLOCKED' | 'INCOMPLETE';
  completionPercentage: number;
  sellerProfileStatus: string;
  sellerProfileRejectionReason: string | null;
  totalDocuments: number;
  verifiedDocuments: number;
  pendingDocuments: number;
  rejectedDocuments: number;
  expiredDocuments: number;
  expiringSoonDocuments: number;
  totalCertifications: number;
  verifiedCertifications: number;
  pendingCertifications: number;
  rejectedCertifications: number;
  expiredCertifications: number;
  expiringSoonCertifications: number;
  pendingReviewItems: number;
  nextAction: string | null;
}

const makeSummary = (overrides: Partial<SellerComplianceSummary> = {}): SellerComplianceSummary => ({
  status: 'COMPLETE',
  completionPercentage: 100,
  sellerProfileStatus: 'APPROVED',
  sellerProfileRejectionReason: null,
  totalDocuments: 3,
  verifiedDocuments: 3,
  pendingDocuments: 0,
  rejectedDocuments: 0,
  expiredDocuments: 0,
  expiringSoonDocuments: 0,
  totalCertifications: 1,
  verifiedCertifications: 1,
  pendingCertifications: 0,
  rejectedCertifications: 0,
  expiredCertifications: 0,
  expiringSoonCertifications: 0,
  pendingReviewItems: 0,
  nextAction: null,
  ...overrides,
});

import SellerCompliancePage from './page';

describe('SellerCompliancePage (M57)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(() => vi.clearAllMocks());

  it('affiche statut COMPLETE en vert', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeSummary()),
    });
    render(<SellerCompliancePage />);
    await waitFor(() =>
      expect(screen.getByTestId('compliance-status-badge')).toHaveTextContent('Conforme'),
    );
  });

  it('affiche nextAction quand documents refusés', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve(
          makeSummary({
            status: 'ACTION_REQUIRED',
            rejectedDocuments: 1,
            nextAction: 'Corrigez les documents refusés.',
          }),
        ),
    });
    render(<SellerCompliancePage />);
    await waitFor(() =>
      expect(screen.getByTestId('compliance-next-action')).toBeInTheDocument(),
    );
  });

  it('affiche empty state quand 0 documents et 0 certifications', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve(
          makeSummary({ totalDocuments: 0, totalCertifications: 0, status: 'INCOMPLETE' }),
        ),
    });
    render(<SellerCompliancePage />);
    await waitFor(() =>
      expect(screen.getByTestId('compliance-empty-state')).toBeInTheDocument(),
    );
  });

  it('affiche erreur si fetch échoue', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
    render(<SellerCompliancePage />);
    await waitFor(() =>
      expect(screen.getByTestId('compliance-error')).toBeInTheDocument(),
    );
  });

  it('affiche le nombre de documents vérifiés', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeSummary()),
    });
    render(<SellerCompliancePage />);
    await waitFor(() =>
      expect(screen.getByTestId('compliance-verified-count')).toHaveTextContent('3'),
    );
  });

  it('affiche la barre de progression', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeSummary()),
    });
    render(<SellerCompliancePage />);
    await waitFor(() =>
      expect(screen.getByTestId('compliance-progress-bar')).toBeInTheDocument(),
    );
  });

  it('affiche le badge statut PENDING_REVIEW', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve(makeSummary({ status: 'PENDING_REVIEW', completionPercentage: 80 })),
    });
    render(<SellerCompliancePage />);
    await waitFor(() =>
      expect(screen.getByTestId('compliance-status-badge')).toHaveTextContent(
        'En cours de vérification',
      ),
    );
  });

  it('affiche le badge statut BLOCKED', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeSummary({ status: 'BLOCKED' })),
    });
    render(<SellerCompliancePage />);
    await waitFor(() =>
      expect(screen.getByTestId('compliance-status-badge')).toHaveTextContent('Bloqué'),
    );
  });

  it('affiche le compteur documents en attente', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve(makeSummary({ pendingDocuments: 2, pendingCertifications: 1 })),
    });
    render(<SellerCompliancePage />);
    await waitFor(() =>
      expect(screen.getByTestId('compliance-pending-count')).toHaveTextContent('3'),
    );
  });

  it('affiche le compteur documents refusés', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve(
          makeSummary({
            rejectedDocuments: 2,
            rejectedCertifications: 1,
            status: 'ACTION_REQUIRED',
          }),
        ),
    });
    render(<SellerCompliancePage />);
    await waitFor(() =>
      expect(screen.getByTestId('compliance-rejected-count')).toHaveTextContent('3'),
    );
  });

  it('nextAction absent quand null', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(makeSummary({ nextAction: null })),
    });
    render(<SellerCompliancePage />);
    await waitFor(() =>
      expect(screen.queryByTestId('compliance-next-action')).not.toBeInTheDocument(),
    );
  });
});
