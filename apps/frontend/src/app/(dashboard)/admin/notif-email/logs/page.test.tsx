// MP-NOTIF-3 — tests page admin /admin/notif-email/logs.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth');
  return {
    ...actual,
    authStorage: { ...actual.authStorage, getAccessToken: () => 'tok' },
  };
});

const listLogsMock = vi.fn();
vi.mock('@/lib/notif-email', async () => {
  const actual = await vi.importActual<typeof import('@/lib/notif-email')>('@/lib/notif-email');
  return {
    ...actual,
    notifEmailApi: {
      ...actual.notifEmailApi,
      listLogs: (...args: unknown[]) => listLogsMock(...args),
    },
  };
});

import AdminNotifEmailLogsPage from './page';

const baseRow = {
  id: 'log-1',
  transport: 'mock',
  templateId: 'rfq-message-created',
  recipientEmail: 'buyer@ex.com',
  recipientUserId: 'u-1',
  subject: 'Nouveau message — Vanille',
  status: 'SENT' as const,
  errorCode: null,
  errorMessage: null,
  providerMessageId: 'mid-1',
  metadataJson: null,
  createdAt: '2026-04-25T10:00:00.000Z',
};

describe('AdminNotifEmailLogsPage (MP-NOTIF-3)', () => {
  beforeEach(() => listLogsMock.mockReset());
  afterEach(() => vi.clearAllMocks());

  it('rend les lignes avec statut + sujet + template', async () => {
    listLogsMock.mockResolvedValue({
      data: [baseRow],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });
    render(<AdminNotifEmailLogsPage />);
    await waitFor(() =>
      expect(screen.getByText('Nouveau message — Vanille')).toBeInTheDocument(),
    );
    expect(screen.getByText('rfq-message-created')).toBeInTheDocument();
    expect(screen.getByText('Envoyé')).toBeInTheDocument();
  });

  it('affiche un état vide si aucun log', async () => {
    listLogsMock.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });
    render(<AdminNotifEmailLogsPage />);
    expect(await screen.findByText(/Aucun email correspondant/)).toBeInTheDocument();
  });

  it('passe le filtre status FAILED dans l\'appel API', async () => {
    listLogsMock.mockResolvedValue({
      data: [{ ...baseRow, status: 'FAILED', errorCode: 'TRANSPORT_FAILURE' }],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });
    render(<AdminNotifEmailLogsPage />);
    await waitFor(() => expect(listLogsMock).toHaveBeenCalled());
    listLogsMock.mockClear();
    fireEvent.change(screen.getByDisplayValue('— Tous —'), { target: { value: 'FAILED' } });
    await waitFor(() => expect(listLogsMock).toHaveBeenCalled());
    expect(listLogsMock.mock.calls[0][0].status).toBe('FAILED');
  });

  it('affiche le code d\'erreur quand status FAILED', async () => {
    listLogsMock.mockResolvedValue({
      data: [
        {
          ...baseRow,
          status: 'FAILED',
          errorCode: 'TRANSPORT_FAILURE',
          errorMessage: 'Resend rate limit',
        },
      ],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });
    render(<AdminNotifEmailLogsPage />);
    await waitFor(() => expect(screen.getByText('Échec')).toBeInTheDocument());
    expect(screen.getByText('TRANSPORT_FAILURE')).toBeInTheDocument();
  });
});
