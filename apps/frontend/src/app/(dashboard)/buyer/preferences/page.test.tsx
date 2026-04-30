// BUYER-DASHBOARD-4 — tests page /buyer/preferences.
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
const addMock = vi.fn();
const removeMock = vi.fn();
vi.mock('@/lib/notif-email', async () => {
  const actual = await vi.importActual<typeof import('@/lib/notif-email')>('@/lib/notif-email');
  return {
    ...actual,
    myNotifPreferencesApi: {
      list: (...args: unknown[]) => listMock(...args),
      add: (...args: unknown[]) => addMock(...args),
      remove: (...args: unknown[]) => removeMock(...args),
    },
  };
});

import BuyerPreferencesPage from './page';

describe('BuyerPreferencesPage (BUYER-DASHBOARD-4)', () => {
  beforeEach(() => {
    listMock.mockReset();
    addMock.mockReset();
    removeMock.mockReset();
  });
  afterEach(() => vi.clearAllMocks());

  it('rend les 3 types avec status Inscrit par défaut', async () => {
    listMock.mockResolvedValue([]);
    render(<BuyerPreferencesPage />);
    await waitFor(() => expect(screen.getByTestId('pref-row-RFQ_NOTIFICATIONS')).toBeInTheDocument());
    expect(screen.getByTestId('pref-row-TRANSACTIONAL')).toBeInTheDocument();
    expect(screen.getByTestId('pref-row-ALL')).toBeInTheDocument();
    // 3 boutons "Me désinscrire" (par défaut tous inscrits)
    expect(screen.getAllByText('Me désinscrire').length).toBe(3);
  });

  it('affiche Désinscrit si type est dans optedOut', async () => {
    listMock.mockResolvedValue([
      { unsubscribeType: 'RFQ_NOTIFICATIONS', createdAt: '2026-04-25T10:00:00Z' },
    ]);
    render(<BuyerPreferencesPage />);
    await waitFor(() => expect(screen.getByText('Me réinscrire')).toBeInTheDocument());
    const row = screen.getByTestId('pref-row-RFQ_NOTIFICATIONS');
    expect(row.textContent).toContain('Désinscrit');
  });

  it('clic sur "Me désinscrire" appelle add() puis update UI', async () => {
    listMock.mockResolvedValue([]);
    addMock.mockResolvedValue({ id: 'unsub-1' });
    render(<BuyerPreferencesPage />);
    await waitFor(() =>
      expect(screen.getByTestId('btn-toggle-RFQ_NOTIFICATIONS')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('btn-toggle-RFQ_NOTIFICATIONS'));
    await waitFor(() => expect(addMock).toHaveBeenCalledWith('RFQ_NOTIFICATIONS', 'tok'));
    await waitFor(() => {
      const row = screen.getByTestId('pref-row-RFQ_NOTIFICATIONS');
      expect(row.textContent).toContain('Désinscrit');
    });
  });

  it('clic sur "Me réinscrire" appelle remove()', async () => {
    listMock.mockResolvedValue([
      { unsubscribeType: 'TRANSACTIONAL', createdAt: '2026-04-25T10:00:00Z' },
    ]);
    removeMock.mockResolvedValue(undefined);
    render(<BuyerPreferencesPage />);
    await waitFor(() => expect(screen.getByText('Me réinscrire')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('btn-toggle-TRANSACTIONAL'));
    await waitFor(() => expect(removeMock).toHaveBeenCalledWith('TRANSACTIONAL', 'tok'));
  });

  it('affiche erreur si list fail', async () => {
    listMock.mockResolvedValue(undefined as unknown as never);
    listMock.mockImplementationOnce(() =>
      Promise.reject({ name: 'ApiError', message: 'no auth', status: 401 }),
    );
    render(<BuyerPreferencesPage />);
    expect(await screen.findByText('no auth')).toBeInTheDocument();
  });
});
