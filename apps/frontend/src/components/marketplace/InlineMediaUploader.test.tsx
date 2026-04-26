// FP-3.1 — Tests InlineMediaUploader.
//
// On mocke marketplace-media-assets pour piloter upload/getUrl, ainsi que
// authStorage. URL.createObjectURL n'existe pas en jsdom : on le stub.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  MarketplaceRelatedEntityType,
  MediaAssetRole,
  MediaAssetType,
  MediaModerationStatus,
} from '@iox/shared';

const uploadMock = vi.fn();
const getUrlMock = vi.fn();

vi.mock('@/lib/marketplace-media-assets', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/marketplace-media-assets')
  >('@/lib/marketplace-media-assets');
  return {
    ...actual,
    marketplaceMediaAssetsApi: {
      upload: (...args: unknown[]) => uploadMock(...args),
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

import { InlineMediaUploader } from './InlineMediaUploader';

const sampleAsset = {
  id: 'media-1',
  relatedType: MarketplaceRelatedEntityType.SELLER_PROFILE,
  relatedId: 'sp-1',
  mediaType: MediaAssetType.IMAGE,
  role: MediaAssetRole.LOGO,
  storageKey: 'storage/key',
  mimeType: 'image/png',
  sizeBytes: 1024,
  altTextFr: null,
  altTextEn: null,
  sortOrder: 0,
  moderationStatus: MediaModerationStatus.PENDING,
  createdAt: '2026-04-26T08:00:00Z',
  updatedAt: '2026-04-26T08:00:00Z',
};

function makeFile(name: string, type: string, size: number): File {
  const f = new File([new Uint8Array(size)], name, { type });
  return f;
}

function renderUploader(
  props?: Partial<React.ComponentProps<typeof InlineMediaUploader>>,
) {
  const onUploaded = props?.onUploaded ?? vi.fn();
  const r = render(
    <InlineMediaUploader
      relatedType={MarketplaceRelatedEntityType.SELLER_PROFILE}
      relatedId="sp-1"
      role={MediaAssetRole.LOGO}
      currentMediaId={null}
      label="Logo vendeur"
      {...props}
      onUploaded={onUploaded}
    />,
  );
  return { ...r, onUploaded };
}

describe('InlineMediaUploader (FP-3.1)', () => {
  beforeEach(() => {
    uploadMock.mockReset();
    getUrlMock.mockReset();
    // jsdom n'a pas createObjectURL/revokeObjectURL.
    global.URL.createObjectURL = vi.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => vi.clearAllMocks());

  it('rend l’état vide et le bouton "Choisir un fichier" quand pas de média actuel', () => {
    renderUploader();
    expect(screen.getByTestId('media-uploader-logo')).toBeInTheDocument();
    expect(screen.getByTestId('media-uploader-logo-pick')).toHaveTextContent(
      /Choisir un fichier/,
    );
    expect(screen.getByText(/Aucun média/)).toBeInTheDocument();
  });

  it('charge l’URL signée du média courant et l’affiche en preview', async () => {
    getUrlMock.mockResolvedValue({ id: 'media-1', url: 'https://cdn/test.png', expiresIn: 600 });
    renderUploader({ currentMediaId: 'media-1' });
    await waitFor(() => expect(getUrlMock).toHaveBeenCalledWith('media-1', 'tok'));
    const img = await screen.findByTestId('media-uploader-logo-preview');
    expect(img).toHaveAttribute('src', 'https://cdn/test.png');
    // Bouton devient "Remplacer".
    expect(screen.getByTestId('media-uploader-logo-pick')).toHaveTextContent(/Remplacer/);
  });

  it('rejette un MIME non supporté côté client (pas d’appel upload)', async () => {
    renderUploader();
    const input = screen.getByTestId('media-uploader-logo-input') as HTMLInputElement;
    // userEvent.upload applique `accept` et drop silencieusement le PDF.
    // On contourne via fireEvent pour tester explicitement validateImageFile.
    fireEvent.change(input, {
      target: { files: [makeFile('doc.pdf', 'application/pdf', 1024)] },
    });
    expect(await screen.findByTestId('media-uploader-logo-error')).toHaveTextContent(
      /Format non supporté/,
    );
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('rejette un fichier > 5 Mo côté client', async () => {
    const user = userEvent.setup();
    renderUploader();
    const input = screen.getByTestId('media-uploader-logo-input') as HTMLInputElement;
    await user.upload(input, makeFile('big.png', 'image/png', 6 * 1024 * 1024));
    expect(await screen.findByTestId('media-uploader-logo-error')).toHaveTextContent(
      /trop volumineux/,
    );
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('upload OK appelle onUploaded(mediaId, role) puis bascule en succès', async () => {
    const user = userEvent.setup();
    uploadMock.mockResolvedValue(sampleAsset);
    const onUploaded = vi.fn().mockResolvedValue(undefined);
    renderUploader({ onUploaded });
    const input = screen.getByTestId('media-uploader-logo-input') as HTMLInputElement;
    await user.upload(input, makeFile('logo.png', 'image/png', 1024));
    // Preview state
    expect(await screen.findByTestId('media-uploader-logo-submit')).toBeInTheDocument();
    await user.click(screen.getByTestId('media-uploader-logo-submit'));
    await waitFor(() => expect(uploadMock).toHaveBeenCalledTimes(1));
    expect(onUploaded).toHaveBeenCalledWith('media-1', MediaAssetRole.LOGO);
    expect(await screen.findByTestId('media-uploader-logo-success')).toBeInTheDocument();
  });

  it('affiche l’erreur serveur quand l’upload échoue', async () => {
    const user = userEvent.setup();
    const { ApiError } = await import('@/lib/api');
    uploadMock.mockRejectedValue(
      new ApiError('PAYLOAD_TOO_LARGE', 'Fichier trop volumineux côté serveur', undefined, 'rid', 413),
    );
    renderUploader();
    const input = screen.getByTestId('media-uploader-logo-input') as HTMLInputElement;
    await user.upload(input, makeFile('logo.png', 'image/png', 1024));
    await user.click(await screen.findByTestId('media-uploader-logo-submit'));
    expect(await screen.findByTestId('media-uploader-logo-error')).toHaveTextContent(
      /trop volumineux côté serveur/,
    );
  });

  it('le bouton Annuler revient à l’état idle après une preview', async () => {
    const user = userEvent.setup();
    renderUploader();
    const input = screen.getByTestId('media-uploader-logo-input') as HTMLInputElement;
    await user.upload(input, makeFile('logo.png', 'image/png', 1024));
    await user.click(await screen.findByTestId('media-uploader-logo-cancel'));
    expect(screen.queryByTestId('media-uploader-logo-submit')).not.toBeInTheDocument();
    expect(screen.getByTestId('media-uploader-logo-pick')).toBeInTheDocument();
  });
});
