'use client';

// MP-MEDIA-1 LOT 3 — Modal preview média (admin moderation).
//
// Affiche image full ou vidéo player + métadonnées + actions approve/reject.
// Reject déclenche sous-modal avec textarea reason obligatoire (>=3 chars).

import { useEffect, useState } from 'react';
import { CheckCircle2, X, XCircle } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import {
  marketplaceMediaAssetsApi,
  type MediaAsset,
} from '@/lib/marketplace-media-assets';

interface Props {
  media: MediaAsset;
  onClose: () => void;
  onApproved: () => Promise<void>;
  onRejected: () => Promise<void>;
}

export function MediaPreviewModal({ media, onClose, onApproved, onRejected }: Props) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const token = authStorage.getAccessToken() ?? '';
        const res = await marketplaceMediaAssetsApi.getUrl(media.id, token);
        if (!cancelled) setSignedUrl(res.url);
      } catch (err) {
        if (cancelled) return;
        setUrlError(
          err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'URL indisponible',
        );
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [media.id]);

  const handleApprove = async () => {
    setBusy(true);
    setActionError(null);
    try {
      const token = authStorage.getAccessToken() ?? '';
      await marketplaceMediaAssetsApi.approve(media.id, token);
      await onApproved();
      onClose();
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Erreur approve',
      );
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (reason.trim().length < 3) {
      setActionError('Motif requis (3 caractères minimum).');
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      const token = authStorage.getAccessToken() ?? '';
      await marketplaceMediaAssetsApi.reject(media.id, { reason: reason.trim() }, token);
      await onRejected();
      onClose();
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Erreur reject',
      );
    } finally {
      setBusy(false);
    }
  };

  const isVideo = media.mediaType === 'VIDEO';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      data-testid="media-preview-modal"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-3xl rounded-lg bg-white shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full bg-white p-1 text-gray-500 hover:bg-gray-100"
          data-testid="media-preview-close"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="bg-black">
          {urlError && (
            <div className="flex aspect-video items-center justify-center px-3 text-center text-sm text-amber-200">
              {urlError}
            </div>
          )}
          {!urlError && signedUrl && isVideo && (
            <video
              src={signedUrl}
              controls
              preload="metadata"
              className="aspect-video w-full"
              data-testid="media-preview-video"
            />
          )}
          {!urlError && signedUrl && !isVideo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={signedUrl}
              alt={media.altTextFr ?? 'Média à modérer'}
              className="max-h-[70vh] w-full object-contain"
              data-testid="media-preview-image"
            />
          )}
        </div>

        <div className="space-y-3 p-4">
          <dl className="grid grid-cols-2 gap-2 text-xs text-gray-700">
            <div>
              <dt className="font-medium text-gray-500">Type</dt>
              <dd>{media.mediaType}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">MIME</dt>
              <dd>{media.mimeType}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Taille</dt>
              <dd>{(media.sizeBytes / 1024).toFixed(1)} ko</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Rôle</dt>
              <dd>{media.role}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Entité</dt>
              <dd>{media.relatedType}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">ID parent</dt>
              <dd className="truncate font-mono text-[10px]">{media.relatedId}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Status</dt>
              <dd>{media.moderationStatus}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Créé le</dt>
              <dd>{new Date(media.createdAt).toLocaleString('fr-FR')}</dd>
            </div>
          </dl>

          {actionError && (
            <p
              role="alert"
              data-testid="media-preview-error"
              className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800"
            >
              {actionError}
            </p>
          )}

          {!showReject && (
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReject(true)}
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                data-testid="media-preview-reject"
              >
                <XCircle className="h-4 w-4" /> Rejeter
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                data-testid="media-preview-approve"
              >
                <CheckCircle2 className="h-4 w-4" /> Approuver
              </button>
            </div>
          )}

          {showReject && (
            <div className="space-y-2 rounded-md border border-red-200 bg-red-50 p-3">
              <label className="block text-xs font-medium text-red-900">
                Motif de rejet (obligatoire, ≥ 3 caractères)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={500}
                className="w-full rounded-md border border-red-200 bg-white p-2 text-xs"
                data-testid="media-preview-reject-reason"
                placeholder="Image floue, résolution insuffisante…"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowReject(false);
                    setReason('');
                    setActionError(null);
                  }}
                  disabled={busy}
                  className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  data-testid="media-preview-reject-cancel"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={busy}
                  className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  data-testid="media-preview-reject-confirm"
                >
                  Confirmer le rejet
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
