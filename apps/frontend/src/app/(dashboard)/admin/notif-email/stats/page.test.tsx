// MP-NOTIF-3 phase 5 — tests page stats /admin/notif-email/stats.
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

vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth');
  return {
    ...actual,
    authStorage: { ...actual.authStorage, getAccessToken: () => 'tok' },
  };
});

const getStatsMock = vi.fn();
vi.mock('@/lib/notif-email', async () => {
  const actual = await vi.importActual<typeof import('@/lib/notif-email')>('@/lib/notif-email');
  return {
    ...actual,
    notifEmailStatsApi: { getStats: (...args: unknown[]) => getStatsMock(...args) },
  };
});

const auditListMock = vi.fn();
vi.mock('@/lib/audit', async () => {
  const actual = await vi.importActual<typeof import('@/lib/audit')>('@/lib/audit');
  return {
    ...actual,
    auditApi: { list: (...args: unknown[]) => auditListMock(...args) },
  };
});

import AdminNotifEmailStatsPage from './page';

describe('AdminNotifEmailStatsPage (MP-NOTIF-3 phase 5)', () => {
  beforeEach(() => {
    getStatsMock.mockReset();
    auditListMock.mockReset();
    auditListMock.mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } });
  });
  afterEach(() => vi.clearAllMocks());

  it('rend les 3 cards status (SENT/FAILED/SKIPPED) avec compteurs', async () => {
    getStatsMock.mockResolvedValue({
      byStatus: [
        { status: 'SENT', count: 10 },
        { status: 'FAILED', count: 2 },
      ],
      byTemplate: [],
      byDay: [],
    });
    render(<AdminNotifEmailStatsPage />);
    await waitFor(() =>
      expect(screen.getByTestId('status-card-SENT')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('status-card-SENT').textContent).toContain('10');
    expect(screen.getByTestId('status-card-FAILED').textContent).toContain('2');
    expect(screen.getByTestId('status-card-SKIPPED').textContent).toContain('0');
  });

  it('rend top 10 templates avec barres de progression', async () => {
    getStatsMock.mockResolvedValue({
      byStatus: [],
      byTemplate: [
        { templateId: 'rfq-message-created', count: 7 },
        { templateId: 'rfq-qualified', count: 3 },
      ],
      byDay: [],
    });
    render(<AdminNotifEmailStatsPage />);
    await waitFor(() =>
      expect(screen.getByTestId('stats-by-template')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('template-row-rfq-message-created').textContent).toContain('7');
    expect(screen.getByTestId('template-row-rfq-qualified').textContent).toContain('3');
  });

  it('rend bar chart 30 jours avec barres par jour', async () => {
    getStatsMock.mockResolvedValue({
      byStatus: [],
      byTemplate: [],
      byDay: [
        { day: '2026-04-25', sent: 5, failed: 1, skipped: 0 },
        { day: '2026-04-26', sent: 5, failed: 0, skipped: 0 },
      ],
    });
    render(<AdminNotifEmailStatsPage />);
    await waitFor(() =>
      expect(screen.getByTestId('day-bar-2026-04-25')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('day-bar-2026-04-26')).toBeInTheDocument();
  });

  it('empty state si byTemplate vide', async () => {
    getStatsMock.mockResolvedValue({ byStatus: [], byTemplate: [], byDay: [] });
    render(<AdminNotifEmailStatsPage />);
    expect(await screen.findByText(/Aucun template utilisé/)).toBeInTheDocument();
    expect(screen.getByText(/Pas d'activité sur 30 jours/)).toBeInTheDocument();
  });

  it('affiche erreur si fetch fail', async () => {
    getStatsMock.mockResolvedValue(undefined as unknown as never);
    getStatsMock.mockImplementationOnce(() =>
      Promise.reject({ name: 'ApiError', message: 'oops', status: 500 }),
    );
    render(<AdminNotifEmailStatsPage />);
    expect(await screen.findByText('oops')).toBeInTheDocument();
  });

  // MP-NOTIF-3 phase 8 — Alertes récentes section
  it('rend la section "Alertes récentes" avec empty state', async () => {
    getStatsMock.mockResolvedValue({ byStatus: [], byTemplate: [], byDay: [] });
    auditListMock.mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } });
    render(<AdminNotifEmailStatsPage />);
    await waitFor(() =>
      expect(screen.getByTestId('alerts-section')).toBeInTheDocument(),
    );
    expect(screen.getByText('Alertes récentes')).toBeInTheDocument();
    expect(screen.getByText('Aucune alerte récente')).toBeInTheDocument();
  });

  it('rend les alertes récentes quand elles existent', async () => {
    getStatsMock.mockResolvedValue({ byStatus: [], byTemplate: [], byDay: [] });
    auditListMock.mockResolvedValue({
      data: [
        {
          id: 'alert-1',
          action: 'NOTIF_EMAIL_ERROR_RATE_HIGH',
          entityType: 'USER',
          entityId: '00000000-0000-0000-0000-000000000000',
          previousData: null,
          newData: null,
          ipAddress: null,
          userAgent: null,
          notes: 'Error rate 50.0% — 5 failed / 10 total in last hour',
          createdAt: '2026-04-30T14:00:00.000Z',
          user: null,
        },
      ],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    });
    render(<AdminNotifEmailStatsPage />);
    await waitFor(() =>
      expect(screen.getByText(/Error rate 50\.0%/)).toBeInTheDocument(),
    );
    expect(screen.queryByText('Aucune alerte récente')).not.toBeInTheDocument();
  });
});
