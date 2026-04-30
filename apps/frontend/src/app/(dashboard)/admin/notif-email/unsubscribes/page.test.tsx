// MP-NOTIF-3 phase 4 — tests page admin /admin/notif-email/unsubscribes.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth');
  return {
    ...actual,
    authStorage: { ...actual.authStorage, getAccessToken: () => 'tok' },
  };
});

const listUnsubscribesMock = vi.fn();
vi.mock('@/lib/notif-email', async () => {
  const actual = await vi.importActual<typeof import('@/lib/notif-email')>('@/lib/notif-email');
  return {
    ...actual,
    notifEmailApi: {
      ...actual.notifEmailApi,
      listUnsubscribes: (...args: unknown[]) => listUnsubscribesMock(...args),
    },
  };
});

import AdminNotifEmailUnsubscribesPage from './page';

const baseRow = {
  id: 'unsub-1',
  email: 'buyer@ex.com',
  unsubscribeType: 'RFQ_NOTIFICATIONS' as const,
  userId: 'u-1',
  reason: 'opt-out',
  createdAt: '2026-04-25T10:00:00.000Z',
};

describe('AdminNotifEmailUnsubscribesPage (MP-NOTIF-3 phase 4)', () => {
  beforeEach(() => listUnsubscribesMock.mockReset());
  afterEach(() => vi.clearAllMocks());

  it('rend les lignes avec email + type + user + raison', async () => {
    listUnsubscribesMock.mockResolvedValue({
      data: [baseRow],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });
    render(<AdminNotifEmailUnsubscribesPage />);
    await waitFor(() => expect(screen.getByText('buyer@ex.com')).toBeInTheDocument());
    // "Notifs RFQ" apparaît aussi dans le <option> du filtre — getAll
    expect(screen.getAllByText('Notifs RFQ').length).toBeGreaterThan(0);
    expect(screen.getByText('u-1')).toBeInTheDocument();
    expect(screen.getByText('opt-out')).toBeInTheDocument();
    expect(screen.getByTestId('unsub-row-unsub-1')).toBeInTheDocument();
  });

  it('affiche un état vide si aucune désinscription', async () => {
    listUnsubscribesMock.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });
    render(<AdminNotifEmailUnsubscribesPage />);
    expect(
      await screen.findByText(/Aucune désinscription enregistrée/),
    ).toBeInTheDocument();
  });

  it("passe le filtre type ALL dans l'appel API", async () => {
    listUnsubscribesMock.mockResolvedValue({
      data: [{ ...baseRow, unsubscribeType: 'ALL' }],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });
    render(<AdminNotifEmailUnsubscribesPage />);
    await waitFor(() => expect(listUnsubscribesMock).toHaveBeenCalled());
    listUnsubscribesMock.mockClear();
    fireEvent.change(screen.getByDisplayValue('— Tous —'), { target: { value: 'ALL' } });
    await waitFor(() => expect(listUnsubscribesMock).toHaveBeenCalled());
    expect(listUnsubscribesMock.mock.calls[0][0].type).toBe('ALL');
  });

  it("passe le filtre email contains", async () => {
    listUnsubscribesMock.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });
    render(<AdminNotifEmailUnsubscribesPage />);
    await waitFor(() => expect(listUnsubscribesMock).toHaveBeenCalled());
    listUnsubscribesMock.mockClear();
    fireEvent.change(screen.getByPlaceholderText(/@gmail.com/), {
      target: { value: '@buyer' },
    });
    await waitFor(() => expect(listUnsubscribesMock).toHaveBeenCalled());
    expect(listUnsubscribesMock.mock.calls[0][0].email).toBe('@buyer');
  });
});
