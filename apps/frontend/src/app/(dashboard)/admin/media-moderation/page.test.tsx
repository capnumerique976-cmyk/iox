// MP-MEDIA-1 LOT 3 — Tests page admin modération média.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  MarketplaceRelatedEntityType,
  MediaAssetRole,
  MediaAssetType,
  MediaModerationStatus,
} from '@iox/shared';

const listForModerationMock = vi.fn();
const approveMock = vi.fn();
const rejectMock = vi.fn();
const getUrlMock = vi.fn();

vi.mock('@/lib/marketplace-media-assets', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/marketplace-media-assets')
  >('@/lib/marketplace-media-assets');
  return {
    ...actual,
    marketplaceMediaAssetsApi: {
      listForModeration: (...args: unknown[]) => listForModerationMock(...args),
      approve: (...args: unknown[]) => approveMock(...args),
      reject: (...args: unknown[]) => rejectMock(...args),
      getUrl: (...args: unknown[]) => getUrlMock(...args),
    },
  };
});

vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth');
  return {
    ...actual,
    authStorage: { ...actual.authStorage, getAccessToken: () => 'tok' },
  };
});

import MediaModerationPage from './page';

const sampleItem = {
  id: 'm-1',
  relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
  relatedId: 'p-1',
  mediaType: MediaAssetType.IMAGE,
  role: MediaAssetRole.GALLERY,
  storageKey: 'k',
  mimeType: 'image/jpeg',
  sizeBytes: 1024,
  altTextFr: null,
  altTextEn: null,
  sortOrder: 0,
  moderationStatus: MediaModerationStatus.PENDING,
  createdAt: '2026-04-30T08:00:00Z',
  updatedAt: '2026-04-30T08:00:00Z',
};

describe('MediaModerationPage (MP-MEDIA-1 LOT 3)', () => {
  beforeEach(() => {
    listForModerationMock.mockReset();
    approveMock.mockReset();
    rejectMock.mockReset();
    getUrlMock.mockReset();
    getUrlMock.mockResolvedValue({ id: 'm-1', url: 'https://signed/m', expiresIn: 3600 });
    global.URL.createObjectURL = vi.fn(() => 'blob:m');
    global.URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => vi.clearAllMocks());

  it('rend la liste : liste 1 item, table visible', async () => {
    listForModerationMock.mockResolvedValue({
      data: [sampleItem],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });
    render(<MediaModerationPage />);
    await waitFor(() => {
      expect(screen.getByTestId('media-moderation-table')).toBeInTheDocument();
      expect(screen.getByTestId('media-row-m-1')).toBeInTheDocument();
    });
  });

  it('filter status : changer → re-call API avec nouveau status', async () => {
    listForModerationMock.mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });
    render(<MediaModerationPage />);
    await waitFor(() => expect(listForModerationMock).toHaveBeenCalled());
    fireEvent.change(screen.getByTestId('filter-status'), {
      target: { value: MediaModerationStatus.APPROVED },
    });
    await waitFor(() => {
      const lastCall = listForModerationMock.mock.calls.at(-1);
      expect(lastCall?.[0]).toMatchObject({ moderationStatus: MediaModerationStatus.APPROVED });
    });
  });

  it('approve action : ouvre modal puis confirme → appel approve API', async () => {
    listForModerationMock.mockResolvedValue({
      data: [sampleItem],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });
    approveMock.mockResolvedValue({ ...sampleItem, moderationStatus: 'APPROVED' });
    const user = userEvent.setup();
    render(<MediaModerationPage />);
    await waitFor(() => expect(screen.getByTestId('media-row-m-1-view')).toBeInTheDocument());

    await user.click(screen.getByTestId('media-row-m-1-view'));
    await waitFor(() => expect(screen.getByTestId('media-preview-modal')).toBeInTheDocument());
    await user.click(screen.getByTestId('media-preview-approve'));

    await waitFor(() => {
      expect(approveMock).toHaveBeenCalledWith('m-1', 'tok');
    });
  });

  it('reject avec reason : sub-modal + reason valide → appel reject API', async () => {
    listForModerationMock.mockResolvedValue({
      data: [sampleItem],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });
    rejectMock.mockResolvedValue({ ...sampleItem, moderationStatus: 'REJECTED' });
    const user = userEvent.setup();
    render(<MediaModerationPage />);
    await waitFor(() => expect(screen.getByTestId('media-row-m-1-view')).toBeInTheDocument());

    await user.click(screen.getByTestId('media-row-m-1-view'));
    await waitFor(() => expect(screen.getByTestId('media-preview-modal')).toBeInTheDocument());
    await user.click(screen.getByTestId('media-preview-reject'));
    await user.type(screen.getByTestId('media-preview-reject-reason'), 'Image floue');
    await user.click(screen.getByTestId('media-preview-reject-confirm'));

    await waitFor(() => {
      expect(rejectMock).toHaveBeenCalledWith('m-1', { reason: 'Image floue' }, 'tok');
    });
  });

  it('reject : reason < 3 chars → erreur affichée, pas d\'appel API', async () => {
    listForModerationMock.mockResolvedValue({
      data: [sampleItem],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });
    const user = userEvent.setup();
    render(<MediaModerationPage />);
    await waitFor(() => expect(screen.getByTestId('media-row-m-1-view')).toBeInTheDocument());

    await user.click(screen.getByTestId('media-row-m-1-view'));
    await user.click(screen.getByTestId('media-preview-reject'));
    await user.type(screen.getByTestId('media-preview-reject-reason'), 'ab');
    await user.click(screen.getByTestId('media-preview-reject-confirm'));

    await waitFor(() => {
      expect(screen.getByTestId('media-preview-error')).toHaveTextContent(/Motif requis/);
    });
    expect(rejectMock).not.toHaveBeenCalled();
  });
});
