// BUYER-DASHBOARD-2 — tests page /buyer/profile.
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

const findMineMock = vi.fn();
vi.mock('@/lib/companies', async () => {
  const actual = await vi.importActual<typeof import('@/lib/companies')>('@/lib/companies');
  return {
    ...actual,
    companiesApi: {
      ...actual.companiesApi,
      findMine: (...args: unknown[]) => findMineMock(...args),
    },
  };
});

import BuyerProfilePage from './page';

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

describe('BuyerProfilePage (BUYER-DASHBOARD-2)', () => {
  beforeEach(() => findMineMock.mockReset());
  afterEach(() => vi.clearAllMocks());

  it("rend l'identité user", async () => {
    findMineMock.mockResolvedValue([]);
    render(<BuyerProfilePage />);
    expect(await screen.findByText('Bob Buyer')).toBeInTheDocument();
    // buyer@ex.com apparaît dans subtitle PageHeader + dl email du compte
    expect(screen.getAllByText('buyer@ex.com').length).toBeGreaterThan(0);
    // role display changed to human-readable 'Acheteur' in Phase 4
    expect(screen.getByText('Acheteur')).toBeInTheDocument();
  });

  it('rend la company avec coordonnées', async () => {
    findMineMock.mockResolvedValue([sampleCompany]);
    render(<BuyerProfilePage />);
    expect(await screen.findByText('Acme Imports')).toBeInTheDocument();
    expect(screen.getByText('BUY-0001')).toBeInTheDocument();
    expect(screen.getByText('contact@acme.fr')).toBeInTheDocument();
    expect(screen.getByText(/12 rue Saint-Denis/)).toBeInTheDocument();
    expect(screen.getByText('FR12345678901')).toBeInTheDocument();
    expect(screen.getByTestId('buyer-company-c1')).toBeInTheDocument();
  });

  it('affiche état vide si aucune company', async () => {
    findMineMock.mockResolvedValue([]);
    render(<BuyerProfilePage />);
    expect(
      await screen.findByText(/Aucune entreprise rattachée/),
    ).toBeInTheDocument();
  });

  it('affiche les types CompanyType en badges', async () => {
    findMineMock.mockResolvedValue([{ ...sampleCompany, types: ['CLIENT', 'PARTNER'] }]);
    render(<BuyerProfilePage />);
    await waitFor(() => expect(screen.getByText('CLIENT')).toBeInTheDocument());
    expect(screen.getByText('PARTNER')).toBeInTheDocument();
  });

  it('badge Active si isActive=true', async () => {
    findMineMock.mockResolvedValue([sampleCompany]);
    render(<BuyerProfilePage />);
    expect(await screen.findByText('Active')).toBeInTheDocument();
  });

  it('badge Inactive si isActive=false', async () => {
    findMineMock.mockResolvedValue([{ ...sampleCompany, isActive: false }]);
    render(<BuyerProfilePage />);
    expect(await screen.findByText('Inactive')).toBeInTheDocument();
  });
});
