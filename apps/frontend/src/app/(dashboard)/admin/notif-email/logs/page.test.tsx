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
const replayLogMock = vi.fn();
vi.mock('@/lib/notif-email', async () => {
  const actual = await vi.importActual<typeof import('@/lib/notif-email')>('@/lib/notif-email');
  return {
    ...actual,
    notifEmailApi: {
      ...actual.notifEmailApi,
      listLogs: (...args: unknown[]) => listLogsMock(...args),
      replayLog: (...args: unknown[]) => replayLogMock(...args),
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
  beforeEach(() => {
    listLogsMock.mockReset();
    replayLogMock.mockReset();
  });
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

  it('clic sur Export CSV appelle /api/v1/notif-email/logs-export.csv avec Authorization', async () => {
    listLogsMock.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () => new Blob(['id,status\n'], { type: 'text/csv' }),
    });
    (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
    // Mock URL et a.click pour le download trick
    const createObjectURL = vi.fn().mockReturnValue('blob:mock');
    const revokeObjectURL = vi.fn();
    (URL as unknown as { createObjectURL: typeof createObjectURL }).createObjectURL = createObjectURL;
    (URL as unknown as { revokeObjectURL: typeof revokeObjectURL }).revokeObjectURL = revokeObjectURL;

    render(<AdminNotifEmailLogsPage />);
    await waitFor(() => expect(listLogsMock).toHaveBeenCalled());
    fireEvent.click(screen.getByTestId('btn-export-csv'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/notif-email/logs-export.csv');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer tok');
    expect(createObjectURL).toHaveBeenCalled();
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

  // MP-NOTIF-3 phase 7 — Replay button tests
  it('affiche le bouton Rejouer pour les logs FAILED', async () => {
    listLogsMock.mockResolvedValue({
      data: [
        {
          ...baseRow,
          id: 'fail-1',
          status: 'FAILED',
          errorCode: 'TRANSPORT_FAILURE',
          errorMessage: 'timeout',
        },
      ],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });
    render(<AdminNotifEmailLogsPage />);
    await waitFor(() => expect(screen.getByTestId('replay-fail-1')).toBeInTheDocument());
    expect(screen.getByText('Rejouer')).toBeInTheDocument();
  });

  it('ne montre PAS le bouton Rejouer pour les logs SENT', async () => {
    listLogsMock.mockResolvedValue({
      data: [baseRow],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });
    render(<AdminNotifEmailLogsPage />);
    await waitFor(() => expect(screen.getByText('Envoyé')).toBeInTheDocument());
    expect(screen.queryByText('Rejouer')).not.toBeInTheDocument();
  });

  it('clic Rejouer appelle POST /notif-email/logs/:id/replay', async () => {
    listLogsMock.mockResolvedValue({
      data: [
        {
          ...baseRow,
          id: 'fail-2',
          status: 'FAILED',
          errorCode: 'TRANSPORT_FAILURE',
        },
      ],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });
    replayLogMock.mockResolvedValue({ originalId: 'fail-2', newLogId: 'new-1', status: 'SENT' });
    render(<AdminNotifEmailLogsPage />);
    await waitFor(() => expect(screen.getByTestId('replay-fail-2')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('replay-fail-2'));
    await waitFor(() => expect(replayLogMock).toHaveBeenCalledWith('fail-2', 'tok'));
  });
});
