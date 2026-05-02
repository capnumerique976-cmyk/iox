import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntityType } from '@iox/shared';

/* ─── Mocks ───────────────────────────────────────────────────────── */

const listMock = vi.fn();

vi.mock('@/lib/audit', async () => {
  const actual = await vi.importActual<typeof import('@/lib/audit')>('@/lib/audit');
  return {
    ...actual,
    auditApi: {
      list: (...args: unknown[]) => listMock(...args),
    },
  };
});

vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth');
  return {
    ...actual,
    authStorage: { ...actual.authStorage, getAccessToken: () => 'test-token' },
  };
});

import AuditLogsPage from './page';

/* ─── Fixtures ────────────────────────────────────────────────────── */

const sampleItem = {
  id: 'log-001',
  action: 'CREATE',
  entityType: EntityType.USER,
  entityId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  previousData: null,
  newData: { email: 'test@iox.dev', role: 'SELLER' },
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0',
  notes: 'Creation automatique',
  createdAt: '2026-04-30T14:30:00Z',
  user: {
    id: 'u-1',
    email: 'admin@iox.dev',
    firstName: 'Jean',
    lastName: 'Dupont',
    role: 'ADMIN',
  },
};

const sampleItem2 = {
  ...sampleItem,
  id: 'log-002',
  action: 'UPDATE',
  entityType: EntityType.SELLER_PROFILE,
  entityId: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
  previousData: { status: 'DRAFT' },
  newData: { status: 'PENDING_REVIEW' },
  notes: null,
  user: null,
};

const emptyResponse = {
  data: [],
  meta: { total: 0, page: 1, limit: 50, totalPages: 0 },
};

const populatedResponse = {
  data: [sampleItem, sampleItem2],
  meta: { total: 2, page: 1, limit: 50, totalPages: 1 },
};

/* ─── Tests ───────────────────────────────────────────────────────── */

describe('AuditLogsPage (ADMIN-AUDIT-VIEWER)', () => {
  beforeEach(() => {
    listMock.mockReset();
  });

  it('renders page with mock audit logs', async () => {
    listMock.mockResolvedValue(populatedResponse);

    render(<AuditLogsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('audit-table')).toBeInTheDocument();
    });

    // Verify both rows render
    expect(screen.getByTestId('audit-row-log-001')).toBeInTheDocument();
    expect(screen.getByTestId('audit-row-log-002')).toBeInTheDocument();

    // Verify page header
    expect(screen.getByText("Journal d'audit")).toBeInTheDocument();

    // Verify user name rendering
    expect(screen.getByText('Jean Dupont')).toBeInTheDocument();

    // Verify entity type labels (Utilisateur appears as column header + badge)
    expect(screen.getAllByText('Utilisateur').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Profil vendeur')).toBeInTheDocument();

    // Verify action badges
    expect(screen.getByText('CREATE')).toBeInTheDocument();
    expect(screen.getByText('UPDATE')).toBeInTheDocument();
  });

  it('shows empty state when no logs', async () => {
    listMock.mockResolvedValue(emptyResponse);

    render(<AuditLogsPage />);

    await waitFor(() => {
      expect(screen.getByText("Aucune entree d'audit")).toBeInTheDocument();
    });

    // Table should not render
    expect(screen.queryByTestId('audit-table')).not.toBeInTheDocument();
  });

  it('clicking a row shows detail panel with JSON data', async () => {
    listMock.mockResolvedValue(populatedResponse);
    const user = userEvent.setup();

    render(<AuditLogsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('audit-row-log-001')).toBeInTheDocument();
    });

    // Click the first row
    await user.click(screen.getByTestId('audit-row-log-001'));

    // Detail panel should be visible
    await waitFor(() => {
      expect(screen.getByTestId('audit-detail-panel')).toBeInTheDocument();
    });

    // Should show JSON data for newData
    const newDataPre = screen.getByTestId('audit-detail-newData');
    expect(newDataPre).toHaveTextContent('"email"');
    expect(newDataPre).toHaveTextContent('"test@iox.dev"');

    // Should show user info
    expect(screen.getByText(/admin@iox.dev/)).toBeInTheDocument();

    // Should show IP address
    expect(screen.getByText('192.168.1.1')).toBeInTheDocument();

    // Close the panel
    await user.click(screen.getByTestId('audit-detail-close'));
    await waitFor(() => {
      expect(screen.queryByTestId('audit-detail-panel')).not.toBeInTheDocument();
    });
  });

  it('entityType filter select renders all options', async () => {
    listMock.mockResolvedValue(emptyResponse);

    render(<AuditLogsPage />);

    // Open filters panel
    fireEvent.click(screen.getByTestId('filters-toggle'));

    await waitFor(() => {
      expect(screen.getByTestId('filter-entityType')).toBeInTheDocument();
    });

    const select = screen.getByTestId('filter-entityType') as HTMLSelectElement;
    const options = Array.from(select.options);

    // "Tous" + all EntityType values
    expect(options.length).toBe(Object.values(EntityType).length + 1);

    // First option is "Tous"
    expect(options[0].textContent).toBe('Tous');

    // Verify some specific labels
    const optionLabels = options.map((o) => o.textContent);
    expect(optionLabels).toContain('Utilisateur');
    expect(optionLabels).toContain('Produit');
    expect(optionLabels).toContain('Beneficiaire');
    expect(optionLabels).toContain("Contrat d'approvisionnement");
    expect(optionLabels).toContain('Demande de devis');
  });
});
