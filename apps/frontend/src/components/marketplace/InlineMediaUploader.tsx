'use client';

// FP-3.1 — Uploader image inline (logo / bannière seller).
//
// Composant contrôlé par l'ID média courant (`currentMediaId`) et un
// callback `onUploaded(mediaId, role)` que le parent utilise pour patcher
// l'entité (ex. SellerProfile.logoMediaId).
//
// Validation client miroir backend (MIME + 5 Mo). Preview locale via
// `URL.createObjectURL` avant upload, preview du média actuel via une URL
// signée (`getUrl`). Le navigateur révoque les blob URLs au démontage.

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, ImageIcon, Loader2, Upload, X } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import {
  marketplaceMediaAssetsApi,
  validateImageFile,
  MEDIA_ALLOWED_IMAGE_MIMES,
  type MediaAsset,
  type UploadMediaAssetMeta,
} from '@/lib/marketplace-media-assets';
import {
  MediaAssetRole,
  MediaAssetType,
  type MarketplaceRelatedEntityType,
} from '@iox/shared';

interface Props {
  relatedType: MarketplaceRelatedEntityType;
  relatedId: string;
  role: MediaAssetRole;
  /** ID du média actuellement référencé par l'entité parente (logoMediaId par ex.). */
  currentMediaId: string | null;
  label: string;
  /** Texte d'aide affiché sous l'input. */
  helpText?: string;
  /** Ratio CSS de la preview (ex. "aspect-square", "aspect-[3/1]"). */
  previewClassName?: string;
  altTextFr?: string;
  disabled?: boolean;
  /** Le parent reçoit l'id du nouveau média et patche l'entité. */
  onUploaded: (mediaId: string, role: MediaAssetRole) => Promise<void> | void;
  /** Test id racine, optionnel — sinon dérivé du role. */
  testId?: string;
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'preview'; file: File; objectUrl: string }
  | { kind: 'uploading'; file: File; objectUrl: string }
  | { kind: 'success'; uploaded: MediaAsset }
  | { kind: 'error'; message: string };

export function InlineMediaUploader({
  relatedType,
  relatedId,
  role,
  currentMediaId,
  label,
  helpText,
  previewClassName,
  altTextFr,
  disabled,
  onUploaded,
  testId,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [currentUrlError, setCurrentUrlError] = useState<string | null>(null);
  const root = testId ?? `media-uploader-${role.toLowerCase()}`;

  // Charge l'URL signée du média courant pour la preview "actuel".
  useEffect(() => {
    let cancelled = false;
    async function loadCurrent() {
      setCurrentUrl(null);
      setCurrentUrlError(null);
      if (!currentMediaId) return;
      try {
        const token = authStorage.getAccessToken() ?? '';
        const res = await marketplaceMediaAssetsApi.getUrl(currentMediaId, token);
        if (!cancelled) setCurrentUrl(res.url);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Aperçu indisponible';
        setCurrentUrlError(message);
      }
    }
    loadCurrent();
    return () => {
      cancelled = true;
    };
  }, [currentMediaId]);

  // Révoque toujours l'objectURL de la phase "preview"/"uploading".
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
    const err = validateImageFile(file);
    if (err) {
      setPhase({ kind: 'error', message: err });
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
    setPhase({ kind: 'uploading', file, objectUrl });
    try {
      const token = authStorage.getAccessToken() ?? '';
      const meta: UploadMediaAssetMeta = {
        relatedType,
        relatedId,
        role,
        mediaType: MediaAssetType.IMAGE,
        ...(altTextFr ? { altTextFr } : {}),
      };
      const uploaded = await marketplaceMediaAssetsApi.upload(file, meta, token);
      // Notifie le parent (PATCH /me) avant de basculer en "success" pour
      // refléter que l'entité est bien mise à jour.
      await onUploaded(uploaded.id, role);
      URL.revokeObjectURL(objectUrl);
      setPhase({ kind: 'success', uploaded });
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
  }, [phase, relatedType, relatedId, role, altTextFr, onUploaded]);

  const isBusy = phase.kind === 'uploading';
  const previewSrc =
    phase.kind === 'preview' || phase.kind === 'uploading' ? phase.objectUrl : currentUrl;

  return (
    <div className="space-y-2" data-testid={root}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-gray-700">{label}</p>
        <input
          ref={inputRef}
          type="file"
          accept={MEDIA_ALLOWED_IMAGE_MIMES.join(',')}
          className="hidden"
          data-testid={`${root}-input`}
          onChange={(e) => handleFile(e.target.files?.[0] ?? undefined)}
          disabled={disabled || isBusy}
        />
        <div className="flex items-center gap-1">
          {phase.kind === 'preview' && (
            <button
              type="button"
              onClick={cancelPreview}
              disabled={disabled || isBusy}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              data-testid={`${root}-cancel`}
            >
              <X className="h-3 w-3" /> Annuler
            </button>
          )}
          {phase.kind === 'preview' && (
            <button
              type="button"
              onClick={doUpload}
              disabled={disabled}
              className="inline-flex items-center gap-1 rounded-md bg-premium-accent px-2.5 py-1 text-xs font-semibold text-white shadow-premium-sm hover:bg-premium-primary disabled:opacity-50"
              data-testid={`${root}-submit`}
            >
              <Upload className="h-3 w-3" /> Téléverser
            </button>
          )}
          {(phase.kind === 'idle' || phase.kind === 'success' || phase.kind === 'error') && (
            <button
              type="button"
              onClick={handlePick}
              disabled={disabled || isBusy}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              data-testid={`${root}-pick`}
            >
              <ImageIcon className="h-3 w-3" />{' '}
              {currentMediaId || phase.kind === 'success' ? 'Remplacer' : 'Choisir un fichier'}
            </button>
          )}
        </div>
      </div>

      <div
        className={`flex items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 ${previewClassName ?? 'aspect-square'} ${isBusy ? 'opacity-60' : ''}`}
      >
        {previewSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewSrc}
            alt={altTextFr ?? label}
            className="h-full w-full object-cover"
            data-testid={`${root}-preview`}
          />
        ) : currentUrlError ? (
          <span className="px-3 text-center text-xs text-amber-700">{currentUrlError}</span>
        ) : (
          <span className="flex flex-col items-center gap-1 text-xs text-gray-400">
            <ImageIcon className="h-6 w-6" />
            Aucun média
          </span>
        )}
      </div>

      {helpText && <p className="text-[11px] text-gray-500">{helpText}</p>}

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
          <CheckCircle2 className="h-3 w-3" /> Image téléversée et associée — en attente de
          modération.
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
