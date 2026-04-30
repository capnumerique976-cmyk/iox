// MP-NOTIF-3 phase 3 — tests page détail /admin/notif-email/logs/[id].
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

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

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'log-1' }),
}));

vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth');
  return {
    ...actual,
    authStorage: { ...actual.authStorage, getAccessToken: () => 'tok' },
  };
});

const getLogByIdMock = vi.fn();
vi.mock('@/lib/notif-email', async () => {
  const actual = await vi.importActual<typeof import('@/lib/notif-email')>('@/lib/notif-email');
  return {
    ...actual,
    notifEmailApi: {
      ...actual.notifEmailApi,
      getLogById: (...args: unknown[]) => getLogByIdMock(...args),
    },
  };
});

import AdminNotifEmailLogDetailPage from './page';

const sampleLog = {
  id: 'log-1',
  transport: 'mock',
  templateId: 'rfq-message-created',
  recipientEmail: 'buyer@ex.com',
  recipientUserId: 'u-1',
  subject: 'Nouveau message — Vanille',
  status: 'SENT' as const,
  errorCode: null,
  errorMessage: null,
  providerMessageId: 'mid-12345',
  metadataJson: { sourceEntity: 'QuoteRequest', sourceId: 'q-99' },
  createdAt: '2026-04-25T10:00:00.000Z',
};

describe('AdminNotifEmailLogDetailPage (MP-NOTIF-3 phase 3)', () => {
  beforeEach(() => getLogByIdMock.mockReset());
  afterEach(() => vi.clearAllMocks());

  it('rend le résumé avec status + template + recipient + sujet', async () => {
    getLogByIdMock.mockResolvedValue(sampleLog);
    render(<AdminNotifEmailLogDetailPage />);
    await waitFor(() => expect(screen.getByTestId('log-summary')).toBeInTheDocument());
    expect(screen.getByText('Envoyé')).toBeInTheDocument();
    expect(screen.getByText('rfq-message-created')).toBeInTheDocument();
    expect(screen.getByText('buyer@ex.com')).toBeInTheDocument();
    expect(screen.getByText('Nouveau message — Vanille')).toBeInTheDocument();
    expect(screen.getByText('mid-12345')).toBeInTheDocument();
  });

  it("rend la section erreur quand status FAILED + errorCode présent", async () => {
    getLogByIdMock.mockResolvedValue({
      ...sampleLog,
      status: 'FAILED',
      errorCode: 'TRANSPORT_FAILURE',
      errorMessage: 'Resend rate limit',
    });
    render(<AdminNotifEmailLogDetailPage />);
    await waitFor(() => expect(screen.getByTestId('log-error')).toBeInTheDocument());
    expect(screen.getByText('TRANSPORT_FAILURE')).toBeInTheDocument();
    expect(screen.getByText('Resend rate limit')).toBeInTheDocument();
  });

  it('rend metadataJson dans <pre>', async () => {
    getLogByIdMock.mockResolvedValue(sampleLog);
    render(<AdminNotifEmailLogDetailPage />);
    const meta = await screen.findByTestId('log-metadata');
    expect(meta.textContent).toContain('QuoteRequest');
    expect(meta.textContent).toContain('q-99');
  });

  it('affiche message si metadataJson null', async () => {
    getLogByIdMock.mockResolvedValue({ ...sampleLog, metadataJson: null });
    render(<AdminNotifEmailLogDetailPage />);
    await waitFor(() => expect(screen.getByTestId('log-metadata')).toBeInTheDocument());
    expect(screen.getByText(/Pas de metadata/)).toBeInTheDocument();
  });

  it('affiche erreur si fetch échoue (404)', async () => {
    // On reject avec un objet "ApiError-like" (pas Error native) pour
    // éviter l'unhandledRejection du harness vitest/jsdom.
    getLogByIdMock.mockResolvedValue(undefined as unknown as never);
    getLogByIdMock.mockImplementationOnce(() =>
      Promise.reject({ name: 'ApiError', message: 'Log not found', status: 404 }),
    );
    render(<AdminNotifEmailLogDetailPage />);
    expect(await screen.findByText('Log not found')).toBeInTheDocument();
  });
});
