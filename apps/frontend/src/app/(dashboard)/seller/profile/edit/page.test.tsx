// FP-3 — Couverture du formulaire d'auto-édition seller.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/link (réseau pas nécessaire ici).
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock du client API : on contrôle ce que retournent getMine/updateMine.
const getMineMock = vi.fn();
const updateMineMock = vi.fn();
vi.mock('@/lib/seller-profiles', async () => {
  const actual = await vi.importActual<typeof import('@/lib/seller-profiles')>(
    '@/lib/seller-profiles',
  );
  return {
    ...actual,
    sellerProfilesApi: {
      ...actual.sellerProfilesApi,
      getMine: (...args: unknown[]) => getMineMock(...args),
      updateMine: (...args: unknown[]) => updateMineMock(...args),
    },
  };
});

// Mock du token d'auth.
vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth');
  return {
    ...actual,
    authStorage: { ...actual.authStorage, getAccessToken: () => 'tok' },
  };
});

import SellerProfileEditPage from './page';

const baseProfile = {
  id: 'sp1',
  slug: 's',
  status: 'APPROVED' as const,
  publicDisplayName: 'Coopérative X',
  country: 'YT',
  region: 'Mayotte',
  cityOrZone: 'Mamoudzou',
  descriptionShort: 'Pitch court',
  descriptionLong: 'Long.',
  story: 'Une histoire.',
  languages: ['FR', 'EN'],
  salesEmail: 'sales@x.test',
  salesPhone: '+262 …',
  website: 'https://x.test',
  supportedIncoterms: ['FOB'],
  destinationsServed: ['FR'],
  averageLeadTimeDays: 14,
  logoMediaId: null,
  bannerMediaId: null,
  rejectionReason: null,
};

describe('SellerProfileEditPage (FP-3)', () => {
  beforeEach(() => {
    getMineMock.mockReset();
    updateMineMock.mockReset();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("hydrate le formulaire à partir de GET /me et garde Enregistrer désactivé tant que rien ne change", async () => {
    getMineMock.mockResolvedValue({ ...baseProfile });
    render(<SellerProfileEditPage />);
    const display = await screen.findByTestId('field-publicDisplayName');
    expect((display as HTMLInputElement).value).toBe('Coopérative X');
    const submit = screen.getByTestId('submit-update-mine') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    // Bandeau APPROVED affiché
    expect(screen.getByText(/revue qualité/i)).toBeInTheDocument();
  });

  it('envoie uniquement les champs modifiés et affiche un succès', async () => {
    getMineMock.mockResolvedValue({ ...baseProfile });
    updateMineMock.mockResolvedValue({
      ...baseProfile,
      descriptionShort: 'Nouveau pitch',
      status: 'PENDING_REVIEW',
    });

    const user = userEvent.setup();
    render(<SellerProfileEditPage />);
    const display = await screen.findByTestId('field-publicDisplayName');
    expect(display).toBeInTheDocument();

    // Modifier descriptionShort
    const short = screen.getAllByRole('textbox').find((el) =>
      (el as HTMLTextAreaElement | HTMLInputElement).value === 'Pitch court',
    );
    expect(short).toBeDefined();
    await user.clear(short!);
    await user.type(short!, 'Nouveau pitch');

    const submit = screen.getByTestId('submit-update-mine') as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
    await user.click(submit);

    await waitFor(() => expect(updateMineMock).toHaveBeenCalledTimes(1));
    const [payload, token] = updateMineMock.mock.calls[0];
    expect(token).toBe('tok');
    // On n'envoie QUE le champ modifié
    expect(payload).toEqual({ descriptionShort: 'Nouveau pitch' });

    expect(await screen.findByText(/Profil mis à jour avec succès/i)).toBeInTheDocument();
  });

  it("affiche un message d'aide si /me renvoie 404", async () => {
    const { ApiError } = await import('@/lib/api');
    getMineMock.mockRejectedValue(new ApiError('NOT_FOUND', 'Aucun profil', undefined, 'rid', 404));
    render(<SellerProfileEditPage />);
    // Le titre du message d'erreur (premier <p>) est le `state.message` brut
    expect(await screen.findByText('Aucun profil')).toBeInTheDocument();
    // L'aide contextuelle 404 est rendue
    expect(screen.getByText(/onboarding/i)).toBeInTheDocument();
  });
});
