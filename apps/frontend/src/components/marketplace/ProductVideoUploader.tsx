'use client';

// MP-MEDIA-1 LOT 2 — Uploader vidéo produit (1 max V1).
//
// Single-file picker accept="video/*". Validation client miroir backend
// (50 MB, MIME whitelist). Preview html5 <video controls> avant upload.
// Si vidéo existante : player + boutons Remplacer (DELETE puis POST) +
// Supprimer.

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Trash2, Upload, Video, X } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import {
  marketplaceMediaAssetsApi,
  validateVideoFile,
  MEDIA_ALLOWED_VIDEO_MIMES,
  type MediaAsset,
} from '@/lib/marketplace-media-assets';
import { MarketplaceRelatedEntityType, MediaAssetRole } from '@iox/shared';

interface Props {
  productId: string;
  /** Vidéo actuelle attachée au produit (max 1 V1) ou `null`. */
  currentVideo: MediaAsset | null;
  onUploaded: () => Promise<void>;
  onDeleted: () => Promise<void>;
  disabled?: boolean;
  testId?: string;
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'preview'; file: File; objectUrl: string }
  | { kind: 'uploading'; file: File; objectUrl: string; progress: number }
  | { kind: 'success' }
  | { kind: 'error'; message: string };

export function ProductVideoUploader({
  productId,
  currentVideo,
  onUploaded,
  onDeleted,
  disabled,
  testId,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [currentUrlError, setCurrentUrlError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const root = testId ?? 'product-video-uploader';

  // Charge URL signée vidéo actuelle.
  useEffect(() => {
    let cancelled = false;
    async function loadCurrent() {
      setCurrentUrl(null);
      setCurrentUrlError(null);
      if (!currentVideo) return;
      try {
        const token = authStorage.getAccessToken() ?? '';
        const res = await marketplaceMediaAssetsApi.getUrl(currentVideo.id, token);
        if (!cancelled) setCurrentUrl(res.url);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Aperçu vidéo indisponible';
        setCurrentUrlError(message);
      }
    }
    loadCurrent();
    return () => {
      cancelled = true;
    };
  }, [currentVideo]);

  // Cleanup objectURL.
  useEffect(() => {
    return () => {
      if (phase.kind === 'preview' || phase.kind === 'uploading') {
        URL.revokeObjectURL(phase.objectUrl);
      }
    };
  }, [phase]);

  const handlePick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFile = useCallback((file: File | undefined) => {
    if (!file) return;
    const result = validateVideoFile(file);
    if (!result.ok) {
      setPhase({ kind: 'error', message: result.error });
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPhase({ kind: 'preview', file, objectUrl });
  }, []);

  const cancelPreview = useCallback(() => {
    if (phase.kind === 'preview' || phase.kind === 'uploading') {
      URL.revokeObjectURL(phase.objectUrl);
    }
    setPhase({ kind: 'idle' });
    if (inputRef.current) inputRef.current.value = '';
  }, [phase]);

  const doUpload = useCallback(async () => {
    if (phase.kind !== 'preview') return;
    const { file, objectUrl } = phase;
    setPhase({ kind: 'uploading', file, objectUrl, progress: 0 });
    try {
      const token = authStorage.getAccessToken() ?? '';

      // Upload en premier — si ça échoue, l'ancienne vidéo reste intacte.
      await marketplaceMediaAssetsApi.upload(
        file,
        {
          relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
          relatedId: productId,
          role: MediaAssetRole.GALLERY,
          // mediaType résolu serveur-side depuis MIME → on n'envoie pas.
        },
        token,
      );

      // Suppression de l'ancienne vidéo APRÈS upload réussi (évite la perte en cas d'échec).
      if (currentVideo) {
        await marketplaceMediaAssetsApi.delete(currentVideo.id, token);
      }

      await onUploaded();
      URL.revokeObjectURL(objectUrl);
      setPhase({ kind: 'success' });
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      URL.revokeObjectURL(objectUrl);
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Échec du téléversement';
      setPhase({ kind: 'error', message });
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [phase, productId, currentVideo, onUploaded]);

  const doDelete = useCallback(async () => {
    if (!currentVideo) return;
    try {
      const token = authStorage.getAccessToken() ?? '';
      await marketplaceMediaAssetsApi.delete(currentVideo.id, token);
      await onDeleted();
      setConfirmingDelete(false);
      setPhase({ kind: 'idle' });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Suppression échouée';
      setPhase({ kind: 'error', message });
      setConfirmingDelete(false);
    }
  }, [currentVideo, onDeleted]);

  const isBusy = phase.kind === 'uploading';
  const previewSrc =
    phase.kind === 'preview' || phase.kind === 'uploading' ? phase.objectUrl : currentUrl;

  return (
    <div className="space-y-3" data-testid={root}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-gray-500" />
          <p className="text-sm font-medium text-gray-700">Vidéo de présentation</p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={MEDIA_ALLOWED_VIDEO_MIMES.join(',')}
          className="hidden"
          data-testid={`${root}-input`}
          onChange={(e) => handleFile(e.target.files?.[0] ?? undefined)}
          disabled={disabled || isBusy}
        />

        <div className="flex items-center gap-2">
          {phase.kind === 'preview' && (
            <>
              <button
                type="button"
                onClick={cancelPreview}
                disabled={disabled || isBusy}
                className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                data-testid={`${root}-cancel`}
              >
                <X className="h-3 w-3" /> Annuler
              </button>
              <button
                type="button"
                onClick={doUpload}
                disabled={disabled}
                className="inline-flex items-center gap-1 rounded-md bg-premium-accent px-2.5 py-1 text-xs font-semibold text-white shadow-premium-sm hover:bg-premium-primary disabled:opacity-50"
                data-testid={`${root}-submit`}
              >
                <Upload className="h-3 w-3" /> Téléverser
              </button>
            </>
          )}
          {(phase.kind === 'idle' || phase.kind === 'success' || phase.kind === 'error') && (
            <>
              <button
                type="button"
                onClick={handlePick}
                disabled={disabled || isBusy}
                className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                data-testid={`${root}-pick`}
              >
                <Video className="h-3 w-3" />
                {currentVideo ? 'Remplacer' : 'Choisir une vidéo'}
              </button>
              {currentVideo && !confirmingDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  disabled={disabled || isBusy}
                  className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                  data-testid={`${root}-delete`}
                >
                  <Trash2 className="h-3 w-3" /> Supprimer
                </button>
              )}
              {currentVideo && confirmingDelete && (
                <>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                    data-testid={`${root}-delete-cancel`}
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={doDelete}
                    className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700"
                    data-testid={`${root}-delete-confirm`}
                  >
                    <Trash2 className="h-3 w-3" /> Confirmer
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div
        className={`overflow-hidden rounded-lg border border-gray-200 ${
          previewSrc ? 'bg-black' : 'bg-gray-50'
        } ${isBusy ? 'opacity-60' : ''}`}
      >
        {previewSrc ? (
          <video
            key={previewSrc}
            src={previewSrc}
            controls
            preload="metadata"
            className="aspect-video w-full"
            data-testid={`${root}-preview`}
          />
        ) : currentUrlError ? (
          <div className="flex aspect-video w-full items-center justify-center px-3 text-center text-xs text-amber-700">
            {currentUrlError}
          </div>
        ) : (
          <div
            className="flex aspect-video w-full flex-col items-center justify-center gap-3 text-center"
            data-testid={`${root}-empty`}
          >
            <Video className="h-8 w-8 text-gray-300" />
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-gray-400">Aucune vidéo de présentation</p>
              <p className="text-[11px] text-gray-400">MP4, WebM, MOV · max 50 Mo</p>
              <p className="text-[11px] text-gray-400">Visible après validation par notre équipe</p>
            </div>
          </div>
        )}
      </div>

      {/* Info fichier sélectionné (preview + upload en cours) */}
      {(phase.kind === 'preview' || phase.kind === 'uploading') && (
        <div
          className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs"
          data-testid={`${root}-file-info`}
        >
          <Video className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
          <span
            className="min-w-0 flex-1 truncate font-medium text-gray-700"
            data-testid={`${root}-file-name`}
          >
            {phase.file.name}
          </span>
          <span className="flex-shrink-0 text-gray-400" data-testid={`${root}-file-size`}>
            {(phase.file.size / (1024 * 1024)).toFixed(1)} Mo
          </span>
        </div>
      )}

      <p className="text-[11px] text-gray-500">
        Formats acceptés : MP4, WebM, MOV · max 50 Mo · La vidéo sera modérée avant affichage
        public.
      </p>

      {phase.kind === 'uploading' && (
        <p
          className="flex items-center gap-1 text-xs text-gray-600"
          data-testid={`${root}-uploading`}
        >
          <Loader2 className="h-3 w-3 animate-spin" /> Téléversement en cours…
        </p>
      )}
      {phase.kind === 'success' && (
        <p
          role="status"
          data-testid={`${root}-success`}
          className="flex items-center gap-1 text-xs text-emerald-700"
        >
          <CheckCircle2 className="h-3 w-3" /> Vidéo téléversée — en attente de modération.
        </p>
      )}
      {phase.kind === 'error' && (
        <p
          role="alert"
          data-testid={`${root}-error`}
          className="flex items-start gap-1 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800"
        >
          <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0" /> {phase.message}
        </p>
      )}
    </div>
  );
}
