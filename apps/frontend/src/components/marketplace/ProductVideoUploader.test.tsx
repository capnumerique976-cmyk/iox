// MP-MEDIA-1 LOT 2 — Tests ProductVideoUploader.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  MarketplaceRelatedEntityType,
  MediaAssetRole,
  MediaAssetType,
  MediaModerationStatus,
} from '@iox/shared';

const uploadMock = vi.fn();
const getUrlMock = vi.fn();
const deleteMock = vi.fn();

vi.mock('@/lib/marketplace-media-assets', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/marketplace-media-assets')
  >('@/lib/marketplace-media-assets');
  return {
    ...actual,
    marketplaceMediaAssetsApi: {
      upload: (...args: unknown[]) => uploadMock(...args),
      getUrl: (...args: unknown[]) => getUrlMock(...args),
      delete: (...args: unknown[]) => deleteMock(...args),
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

import { ProductVideoUploader } from './ProductVideoUploader';

const sampleVideo = {
  id: 'vid-1',
  relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
  relatedId: 'p-1',
  mediaType: MediaAssetType.VIDEO,
  role: MediaAssetRole.GALLERY,
  storageKey: 'k',
  mimeType: 'video/mp4',
  sizeBytes: 1024 * 1024,
  altTextFr: null,
  altTextEn: null,
  sortOrder: 0,
  moderationStatus: MediaModerationStatus.APPROVED,
  createdAt: '2026-04-30T08:00:00Z',
  updatedAt: '2026-04-30T08:00:00Z',
};

function makeVideoFile(name = 'demo.mp4', type = 'video/mp4', size = 1024 * 1024): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe('ProductVideoUploader (MP-MEDIA-1 LOT 2)', () => {
  beforeEach(() => {
    uploadMock.mockReset();
    getUrlMock.mockReset();
    deleteMock.mockReset();
    global.URL.createObjectURL = vi.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => vi.clearAllMocks());

  it('rend l\'état vide et le bouton "Choisir une vidéo"', () => {
    render(
      <ProductVideoUploader
        productId="p-1"
        currentVideo={null}
        onUploaded={vi.fn()}
        onDeleted={vi.fn()}
      />,
    );
    expect(screen.getByTestId('product-video-uploader')).toBeInTheDocument();
    expect(screen.getByTestId('product-video-uploader-pick')).toHaveTextContent(
      /Choisir une vidéo/,
    );
    expect(screen.getByText(/Aucune vidéo/)).toBeInTheDocument();
  });

  it('preview après sélection mp4 valide', async () => {
    const user = userEvent.setup();
    render(
      <ProductVideoUploader
        productId="p-1"
        currentVideo={null}
        onUploaded={vi.fn()}
        onDeleted={vi.fn()}
      />,
    );
    const input = screen.getByTestId('product-video-uploader-input') as HTMLInputElement;
    await user.upload(input, makeVideoFile());
    await waitFor(() => {
      expect(screen.getByTestId('product-video-uploader-preview')).toBeInTheDocument();
      expect(screen.getByTestId('product-video-uploader-submit')).toBeInTheDocument();
    });
  });

  it('upload OK : appelle upload + onUploaded → état success', async () => {
    const user = userEvent.setup();
    const onUploaded = vi.fn().mockResolvedValue(undefined);
    uploadMock.mockResolvedValue(sampleVideo);

    render(
      <ProductVideoUploader
        productId="p-1"
        currentVideo={null}
        onUploaded={onUploaded}
        onDeleted={vi.fn()}
      />,
    );
    const input = screen.getByTestId('product-video-uploader-input') as HTMLInputElement;
    await user.upload(input, makeVideoFile());
    await user.click(screen.getByTestId('product-video-uploader-submit'));
    await waitFor(() => {
      expect(screen.getByTestId('product-video-uploader-success')).toBeInTheDocument();
    });
    expect(uploadMock).toHaveBeenCalledTimes(1);
    expect(onUploaded).toHaveBeenCalledTimes(1);
  });

  it('refuse MIME non whitelisté (avi) → état error sans upload', async () => {
    render(
      <ProductVideoUploader
        productId="p-1"
        currentVideo={null}
        onUploaded={vi.fn()}
        onDeleted={vi.fn()}
      />,
    );
    const input = screen.getByTestId('product-video-uploader-input') as HTMLInputElement;
    const bad = new File([new Uint8Array(1024)], 'bad.avi', { type: 'video/x-msvideo' });
    fireEvent.change(input, { target: { files: [bad] } });
    await waitFor(() => {
      expect(screen.getByTestId('product-video-uploader-error')).toHaveTextContent(
        /Format vidéo non supporté/,
      );
    });
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('refuse fichier > 50 Mo → état error sans upload', async () => {
    const user = userEvent.setup();
    render(
      <ProductVideoUploader
        productId="p-1"
        currentVideo={null}
        onUploaded={vi.fn()}
        onDeleted={vi.fn()}
      />,
    );
    const input = screen.getByTestId('product-video-uploader-input') as HTMLInputElement;
    // Fake size over the cap. user.upload uses File.size which we set explicitly.
    const big = new File([new Uint8Array(1024)], 'big.mp4', { type: 'video/mp4' });
    Object.defineProperty(big, 'size', { value: 51 * 1024 * 1024 });
    fireEvent.change(input, { target: { files: [big] } });
    await waitFor(() => {
      expect(screen.getByTestId('product-video-uploader-error')).toHaveTextContent(
        /Vidéo trop volumineuse/,
      );
    });
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('vidéo existante : bouton Remplacer + Supprimer + flux confirm delete', async () => {
    const user = userEvent.setup();
    getUrlMock.mockResolvedValue({ id: 'vid-1', url: 'https://signed/vid', expiresIn: 3600 });
    deleteMock.mockResolvedValue(undefined);
    const onDeleted = vi.fn().mockResolvedValue(undefined);

    render(
      <ProductVideoUploader
        productId="p-1"
        currentVideo={sampleVideo}
        onUploaded={vi.fn()}
        onDeleted={onDeleted}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('product-video-uploader-pick')).toHaveTextContent(/Remplacer/);
    });
    expect(screen.getByTestId('product-video-uploader-delete')).toBeInTheDocument();

    await user.click(screen.getByTestId('product-video-uploader-delete'));
    await user.click(screen.getByTestId('product-video-uploader-delete-confirm'));

    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalledWith('vid-1', 'tok');
      expect(onDeleted).toHaveBeenCalledTimes(1);
    });
  });
});
