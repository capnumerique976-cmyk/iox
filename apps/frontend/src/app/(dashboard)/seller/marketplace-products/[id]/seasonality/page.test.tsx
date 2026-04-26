// FP-4 — Couverture page d'édition saisonnalité seller.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock useParams pour fournir un id stable.
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'mp1' }),
}));

const getByIdMock = vi.fn();
const updateSeasonalityMock = vi.fn();
vi.mock('@/lib/marketplace-products', async () => {
  const actual = await vi.importActual<typeof import('@/lib/marketplace-products')>(
    '@/lib/marketplace-products',
  );
  return {
    ...actual,
    marketplaceProductsApi: {
      ...actual.marketplaceProductsApi,
      getById: (...args: unknown[]) => getByIdMock(...args),
      updateSeasonality: (...args: unknown[]) => updateSeasonalityMock(...args),
    },
  };
});

vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth');
  return {
    ...actual,
    authStorage: { ...actual.authStorage, getAccessToken: () => 'tok' },
  };
});

import SellerProductSeasonalityPage from './page';

const baseProduct = {
  id: 'mp1',
  slug: 'vanille-mayotte-premium',
  commercialName: 'Vanille de Mayotte — Premium',
  publicationStatus: 'DRAFT' as const,
  originCountry: 'YT',
  originRegion: 'Mayotte',
  harvestMonths: ['JUL', 'AUG'] as const,
  availabilityMonths: ['SEP', 'OCT', 'NOV'] as const,
  isYearRound: false,
  updatedAt: '2026-04-26T08:00:00Z',
};

describe('SellerProductSeasonalityPage (FP-4)', () => {
  beforeEach(() => {
    getByIdMock.mockReset();
    updateSeasonalityMock.mockReset();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('hydrate le picker depuis GET /:id et garde Enregistrer désactivé tant que rien ne change', async () => {
    getByIdMock.mockResolvedValue({ ...baseProduct });
    render(<SellerProductSeasonalityPage />);
    await waitFor(() =>
      expect(screen.getByTestId('picker-avail-SEP')).toHaveAttribute('aria-pressed', 'true'),
    );
    expect(screen.getByTestId('picker-harvest-JUL')).toHaveAttribute('aria-pressed', 'true');
    const submit = screen.getByTestId('submit-seasonality') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it("envoie les 3 champs saisonnalité et affiche un succès", async () => {
    getByIdMock.mockResolvedValue({ ...baseProduct });
    updateSeasonalityMock.mockResolvedValue({
      ...baseProduct,
      availabilityMonths: ['SEP', 'OCT', 'NOV', 'DEC'],
    });
    const user = userEvent.setup();
    render(<SellerProductSeasonalityPage />);
    await waitFor(() => expect(screen.getByTestId('picker-avail-SEP')).toBeInTheDocument());

    await user.click(screen.getByTestId('picker-avail-DEC'));

    const submit = screen.getByTestId('submit-seasonality') as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
    await user.click(submit);

    await waitFor(() => expect(updateSeasonalityMock).toHaveBeenCalledTimes(1));
    const [idArg, payload, token] = updateSeasonalityMock.mock.calls[0];
    expect(idArg).toBe('mp1');
    expect(token).toBe('tok');
    expect(payload).toEqual({
      availabilityMonths: ['SEP', 'OCT', 'NOV', 'DEC'],
      harvestMonths: ['JUL', 'AUG'],
      isYearRound: false,
    });
    expect(
      await screen.findByText(/Saisonnalité mise à jour avec succès/i),
    ).toBeInTheDocument();
  });

  it("avertit si statut APPROVED/PUBLISHED et que la saisonnalité est modifiée", async () => {
    getByIdMock.mockResolvedValue({ ...baseProduct, publicationStatus: 'PUBLISHED' });
    const user = userEvent.setup();
    render(<SellerProductSeasonalityPage />);
    await waitFor(() => expect(screen.getByTestId('picker-avail-SEP')).toBeInTheDocument());
    expect(screen.queryByTestId('review-warning')).toBeNull();
    await user.click(screen.getByTestId('picker-avail-JAN'));
    expect(screen.getByTestId('review-warning')).toBeInTheDocument();
  });

  it('valide qu’au moins un mois est sélectionné quand !isYearRound', async () => {
    getByIdMock.mockResolvedValue({
      ...baseProduct,
      availabilityMonths: ['JAN'],
      harvestMonths: [],
    });
    const user = userEvent.setup();
    render(<SellerProductSeasonalityPage />);
    await waitFor(() => expect(screen.getByTestId('picker-avail-JAN')).toBeInTheDocument());
    // Désélectionne le seul mois → état dégénéré
    await user.click(screen.getByTestId('picker-avail-JAN'));
    await user.click(screen.getByTestId('submit-seasonality'));
    expect(screen.getByTestId('picker-error')).toHaveTextContent(/au moins un mois/i);
    expect(updateSeasonalityMock).not.toHaveBeenCalled();
  });

  it('affiche un message dédié pour 403 (produit hors périmètre)', async () => {
    const { ApiError } = await import('@/lib/api');
    getByIdMock.mockRejectedValue(
      new ApiError('FORBIDDEN', 'Accès refusé', undefined, 'rid', 403),
    );
    render(<SellerProductSeasonalityPage />);
    expect(await screen.findByText('Accès refusé')).toBeInTheDocument();
    expect(screen.getByText(/n’est pas rattaché/i)).toBeInTheDocument();
  });
});
