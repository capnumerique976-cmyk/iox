// MP-MEDIA-1 LOT 1 — tests ProductGalleryUploader.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MarketplaceRelatedEntityType, MediaAssetRole, MediaAssetType, MediaModerationStatus } from '@iox/shared';

vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth');
  return {
    ...actual,
    authStorage: { ...actual.authStorage, getAccessToken: () => 'tok' },
  };
});

const uploadMock = vi.fn();
const reorderMock = vi.fn();
const deleteMock = vi.fn();
const getUrlMock = vi.fn();

vi.mock('@/lib/marketplace-media-assets', async () => {
  const actual = await vi.importActual<typeof import('@/lib/marketplace-media-assets')>(
    '@/lib/marketplace-media-assets',
  );
  return {
    ...actual,
    marketplaceMediaAssetsApi: {
      ...actual.marketplaceMediaAssetsApi,
      upload: (...args: unknown[]) => uploadMock(...args),
      reorder: (...args: unknown[]) => reorderMock(...args),
      delete: (...args: unknown[]) => deleteMock(...args),
      getUrl: (...args: unknown[]) => getUrlMock(...args),
    },
  };
});

const confirmMock = vi.fn();
vi.mock('@/components/ui/confirm-dialog', () => ({
  useConfirm: () => confirmMock,
}));

import { ProductGalleryUploader } from './ProductGalleryUploader';

const sampleMedia = (id: string, sortOrder: number) => ({
  id,
  relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
  relatedId: 'p1',
  mediaType: MediaAssetType.IMAGE,
  role: MediaAssetRole.GALLERY,
  storageKey: `key-${id}`,
  mimeType: 'image/jpeg',
  sizeBytes: 1024,
  altTextFr: null,
  altTextEn: null,
  sortOrder,
  moderationStatus: MediaModerationStatus.APPROVED,
  createdAt: '2026-04-30T00:00:00Z',
  updatedAt: '2026-04-30T00:00:00Z',
});

describe('ProductGalleryUploader (MP-MEDIA-1 LOT 1)', () => {
  beforeEach(() => {
    uploadMock.mockReset();
    reorderMock.mockReset();
    deleteMock.mockReset();
    getUrlMock.mockReset();
    confirmMock.mockReset();
    getUrlMock.mockResolvedValue({ id: 'x', url: 'https://signed/x', expiresIn: 3600 });
  });
  afterEach(() => vi.clearAllMocks());

  it('rend l\'empty state quand aucune photo', async () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    render(
      <ProductGalleryUploader
        productId="p1"
        sellerProfileId="sp1"
        existingMedia={[]}
        onChange={onChange}
      />,
    );
    expect(await screen.findByText(/Aucune photo de galerie/)).toBeInTheDocument();
    expect(screen.getByTestId('product-gallery-uploader-add-btn')).toBeEnabled();
  });

  it('upload 2 fichiers en parallèle (< 3) + appelle onChange', async () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    uploadMock.mockResolvedValue({ id: 'media-new', sortOrder: 0 });
    render(
      <ProductGalleryUploader
        productId="p1"
        sellerProfileId="sp1"
        existingMedia={[]}
        onChange={onChange}
      />,
    );
    const input = screen.getByTestId('product-gallery-uploader-input') as HTMLInputElement;
    const file1 = new File(['xxx'], 'a.jpg', { type: 'image/jpeg' });
    const file2 = new File(['xxx'], 'b.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [file1, file2] } });
    await waitFor(() => expect(uploadMock).toHaveBeenCalledTimes(2));
    expect(onChange).toHaveBeenCalled();
  });

  it('rejette MIME invalide', async () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    render(
      <ProductGalleryUploader
        productId="p1"
        sellerProfileId="sp1"
        existingMedia={[]}
        onChange={onChange}
      />,
    );
    const input = screen.getByTestId('product-gallery-uploader-input') as HTMLInputElement;
    const bad = new File(['xxx'], 'bad.gif', { type: 'image/gif' });
    fireEvent.change(input, { target: { files: [bad] } });
    expect(await screen.findByTestId('product-gallery-uploader-error')).toHaveTextContent(
      /Format non supporté/,
    );
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('reorder via drag & drop appelle reorder() avec nouveau sortOrder', async () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    reorderMock.mockResolvedValue({ count: 2 });
    render(
      <ProductGalleryUploader
        productId="p1"
        sellerProfileId="sp1"
        existingMedia={[sampleMedia('m1', 0), sampleMedia('m2', 1)]}
        onChange={onChange}
      />,
    );
    await waitFor(() =>
      expect(screen.getByTestId('product-gallery-uploader-tile-m1')).toBeInTheDocument(),
    );
    const tile1 = screen.getByTestId('product-gallery-uploader-tile-m1');
    const tile2 = screen.getByTestId('product-gallery-uploader-tile-m2');
    // Simulate drag m1 onto m2 (dragstart, dragover, drop).
    const dataTransfer = {
      effectAllowed: '',
      dropEffect: '',
      setData: vi.fn(),
      getData: vi.fn(),
    };
    fireEvent.dragStart(tile1, { dataTransfer });
    fireEvent.dragOver(tile2, { dataTransfer });
    fireEvent.drop(tile2, { dataTransfer });
    await waitFor(() => expect(reorderMock).toHaveBeenCalled());
    // m2 doit être en position 0, m1 en position 1
    const items = reorderMock.mock.calls[0][0] as Array<{ id: string; sortOrder: number }>;
    expect(items.find((i) => i.id === 'm2')?.sortOrder).toBe(0);
    expect(items.find((i) => i.id === 'm1')?.sortOrder).toBe(1);
  });

  it('delete appelle confirm puis api.delete + onChange', async () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    confirmMock.mockResolvedValue(true);
    deleteMock.mockResolvedValue(undefined);
    render(
      <ProductGalleryUploader
        productId="p1"
        sellerProfileId="sp1"
        existingMedia={[sampleMedia('m1', 0)]}
        onChange={onChange}
      />,
    );
    await waitFor(() =>
      expect(screen.getByTestId('product-gallery-uploader-tile-m1')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByTestId('product-gallery-uploader-delete-m1'));
    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith('m1', 'tok'));
    expect(onChange).toHaveBeenCalled();
  });

  it('cap UI atteinte (20 photos) → erreur si tentative ajout', async () => {
    const onChange = vi.fn().mockResolvedValue(undefined);
    const items = Array.from({ length: 20 }, (_, i) => sampleMedia(`m${i}`, i));
    render(
      <ProductGalleryUploader
        productId="p1"
        sellerProfileId="sp1"
        existingMedia={items}
        onChange={onChange}
      />,
    );
    await waitFor(() =>
      expect(screen.getByTestId('product-gallery-uploader-grid')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('product-gallery-uploader-add-btn')).toBeDisabled();
  });
});
