// BUYER-DASHBOARD-3 — tests page édition profil buyer.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

const pushMock = vi.fn();
const sp = new Map<string, string>();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({ get: (k: string) => sp.get(k) ?? null }),
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

const findMineMock = vi.fn();
const updateMineMock = vi.fn();
vi.mock('@/lib/companies', async () => {
  const actual = await vi.importActual<typeof import('@/lib/companies')>('@/lib/companies');
  return {
    ...actual,
    companiesApi: {
      ...actual.companiesApi,
      findMine: (...args: unknown[]) => findMineMock(...args),
      updateMine: (...args: unknown[]) => updateMineMock(...args),
    },
  };
});

import BuyerProfileEditPage from './page';

const sampleCompany = {
  id: 'c1',
  code: 'BUY-0001',
  name: 'Acme Imports',
  types: ['CLIENT'],
  email: 'contact@acme.fr',
  phone: '+33 1 23 45 67 89',
  address: '12 rue Saint-Denis',
  city: 'Paris',
  country: 'FR',
  vatNumber: 'FR12345678901',
  website: 'https://acme.fr',
  isActive: true,
  createdAt: '2026-01-15T00:00:00Z',
  updatedAt: '2026-04-25T00:00:00Z',
};

describe('BuyerProfileEditPage (BUYER-DASHBOARD-3)', () => {
  beforeEach(() => {
    findMineMock.mockReset();
    updateMineMock.mockReset();
    pushMock.mockReset();
    sp.clear();
  });
  afterEach(() => vi.clearAllMocks());

  it('charge la company + pre-remplit le form', async () => {
    findMineMock.mockResolvedValue([sampleCompany]);
    render(<BuyerProfileEditPage />);
    await waitFor(() =>
      expect((screen.getByTestId('field-name') as HTMLInputElement).value).toBe('Acme Imports'),
    );
    expect((screen.getByTestId('field-email') as HTMLInputElement).value).toBe('contact@acme.fr');
    expect((screen.getByTestId('field-vatNumber') as HTMLInputElement).value).toBe(
      'FR12345678901',
    );
  });

  it('Save désactivé tant que pas dirty', async () => {
    findMineMock.mockResolvedValue([sampleCompany]);
    render(<BuyerProfileEditPage />);
    const saveBtn = (await screen.findByTestId('btn-save')) as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  it("modif puis save envoie le diff via updateMine + redirige vers /buyer/profile", async () => {
    findMineMock.mockResolvedValue([sampleCompany]);
    updateMineMock.mockResolvedValue({ ...sampleCompany, phone: '+33 9 99 99 99 99' });
    render(<BuyerProfileEditPage />);
    await waitFor(() =>
      expect((screen.getByTestId('field-phone') as HTMLInputElement).value).toBe(
        '+33 1 23 45 67 89',
      ),
    );
    fireEvent.change(screen.getByTestId('field-phone'), {
      target: { value: '+33 9 99 99 99 99' },
    });
    fireEvent.click(screen.getByTestId('btn-save'));
    await waitFor(() => expect(updateMineMock).toHaveBeenCalled());
    expect(updateMineMock.mock.calls[0][0]).toBe('c1');
    expect(updateMineMock.mock.calls[0][1]).toEqual({ phone: '+33 9 99 99 99 99' });
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/buyer/profile'));
  });

  it('validation client : name < 2 chars affiche erreur', async () => {
    findMineMock.mockResolvedValue([sampleCompany]);
    render(<BuyerProfileEditPage />);
    await waitFor(() =>
      expect((screen.getByTestId('field-name') as HTMLInputElement).value).toBe('Acme Imports'),
    );
    fireEvent.change(screen.getByTestId('field-name'), { target: { value: 'A' } });
    fireEvent.click(screen.getByTestId('btn-save'));
    expect(await screen.findByText(/au moins 2 caractères/)).toBeInTheDocument();
    expect(updateMineMock).not.toHaveBeenCalled();
  });

  it('multi-companies : sélecteur visible si > 1', async () => {
    const c2 = { ...sampleCompany, id: 'c2', code: 'BUY-0002', name: 'Autre Co' };
    findMineMock.mockResolvedValue([sampleCompany, c2]);
    render(<BuyerProfileEditPage />);
    expect(await screen.findByTestId('company-select')).toBeInTheDocument();
  });

  it('empty state si aucune company', async () => {
    findMineMock.mockResolvedValue([]);
    render(<BuyerProfileEditPage />);
    expect(
      await screen.findByText(/Aucune entreprise rattachée/),
    ).toBeInTheDocument();
  });
});
