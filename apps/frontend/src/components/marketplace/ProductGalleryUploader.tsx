'use client';

// MP-MEDIA-1 LOT 1 — Composant galerie images produit (seller).
//
// Fonctionnalités :
//  - Tuiles avec thumbnail (URL signée via getUrl) + sortOrder visible.
//  - Bouton "Ajouter des photos" : <input type="file" multiple>.
//  - Validation client (MIME jpeg/png/webp + 5 MB par image).
//  - Upload : parallèle si < 3 fichiers, sinon séquentiel.
//  - Drag & drop natif HTML5 pour réordonner. PATCH /reorder après drop.
//  - Bouton suppression par tuile + confirm dialog.
//  - Cap UI 20 images par produit (MEDIA_GALLERY_MAX_PER_PRODUCT_UI).

import { useCallback, useEffect, useRef, useState } from 'react';
import { GripVertical, Loader2, Plus, Trash2, AlertCircle } from 'lucide-react';
import { authStorage } from '@/lib/auth';
import {
  marketplaceMediaAssetsApi,
  validateImageFile,
  MediaAssetRole,
  MediaAssetType,
  MEDIA_GALLERY_MAX_PER_PRODUCT_UI,
  type MediaAsset,
} from '@/lib/marketplace-media-assets';
import { MarketplaceRelatedEntityType } from '@iox/shared';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface Props {
  productId: string;
  sellerProfileId: string;
  existingMedia: MediaAsset[];
  onChange: () => Promise<void>;
  disabled?: boolean;
  testId?: string;
}

type UploadState =
  | { kind: 'idle' }
  | { kind: 'uploading'; count: number; total: number }
  | { kind: 'reordering' }
  | { kind: 'error'; message: string };

export function ProductGalleryUploader({
  productId,
  sellerProfileId,
  existingMedia,
  onChange,
  disabled = false,
  testId = 'product-gallery-uploader',
}: Props) {
  const confirm = useConfirm();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [state, setState] = useState<UploadState>({ kind: 'idle' });
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});
  const [orderedItems, setOrderedItems] = useState<MediaAsset[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Sync local order avec prop (tri par sortOrder asc).
  useEffect(() => {
    const sorted = [...existingMedia].sort((a, b) => a.sortOrder - b.sortOrder);
    setOrderedItems(sorted);
  }, [existingMedia]);

  // Charge URLs signées pour les thumbs.
  useEffect(() => {
    let cancelled = false;
    const token = authStorage.getAccessToken() ?? '';
    Promise.all(
      orderedItems.map(async (m) => {
        if (thumbUrls[m.id]) return null;
        try {
          const r = await marketplaceMediaAssetsApi.getUrl(m.id, token);
          return [m.id, r.url] as const;
        } catch {
          return [m.id, ''] as const;
        }
      }),
    ).then((entries) => {
      if (cancelled) return;
      const next: Record<string, string> = {};
      for (const e of entries) {
        if (e && e[1]) next[e[0]] = e[1];
      }
      if (Object.keys(next).length > 0) {
        setThumbUrls((prev) => ({ ...prev, ...next }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [orderedItems, thumbUrls]);

  const onPickFiles = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const onFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ''; // reset input
    if (files.length === 0) return;

    // Cap UI : refuse si on dépasserait MEDIA_GALLERY_MAX_PER_PRODUCT_UI.
    if (orderedItems.length + files.length > MEDIA_GALLERY_MAX_PER_PRODUCT_UI) {
      setState({
        kind: 'error',
        message: `Limite atteinte : ${MEDIA_GALLERY_MAX_PER_PRODUCT_UI} photos max par produit.`,
      });
      return;
    }

    // Validation client de chaque fichier.
    for (const f of files) {
      const err = validateImageFile(f);
      if (err) {
        setState({ kind: 'error', message: `${f.name} — ${err}` });
        return;
      }
    }

    setState({ kind: 'uploading', count: 0, total: files.length });
    const token = authStorage.getAccessToken() ?? '';
    const baseSortOrder = orderedItems.length;

    try {
      // Parallèle si < 3 fichiers, sinon séquentiel pour limiter charge réseau.
      if (files.length < 3) {
        await Promise.all(
          files.map((f, i) =>
            marketplaceMediaAssetsApi.upload(
              f,
              {
                relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
                relatedId: productId,
                role: MediaAssetRole.GALLERY,
                mediaType: MediaAssetType.IMAGE,
                sortOrder: baseSortOrder + i,
              },
              token,
            ),
          ),
        );
        setState({ kind: 'uploading', count: files.length, total: files.length });
      } else {
        for (let i = 0; i < files.length; i++) {
          await marketplaceMediaAssetsApi.upload(
            files[i],
            {
              relatedType: MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT,
              relatedId: productId,
              role: MediaAssetRole.GALLERY,
              mediaType: MediaAssetType.IMAGE,
              sortOrder: baseSortOrder + i,
            },
            token,
          );
          setState({ kind: 'uploading', count: i + 1, total: files.length });
        }
      }
      await onChange();
      setState({ kind: 'idle' });
    } catch (e) {
      setState({
        kind: 'error',
        message: e instanceof Error ? e.message : 'Échec de l\'upload',
      });
    }
  };

  const onDragStart = (id: string) => (ev: React.DragEvent) => {
    if (disabled) return;
    setDraggedId(id);
    ev.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (ev: React.DragEvent) => {
    if (disabled || !draggedId) return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (targetId: string) => async (ev: React.DragEvent) => {
    ev.preventDefault();
    if (disabled || !draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }
    const fromIdx = orderedItems.findIndex((m) => m.id === draggedId);
    const toIdx = orderedItems.findIndex((m) => m.id === targetId);
    if (fromIdx < 0 || toIdx < 0) {
      setDraggedId(null);
      return;
    }
    const next = [...orderedItems];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setOrderedItems(next);
    setDraggedId(null);
    setState({ kind: 'reordering' });

    const token = authStorage.getAccessToken() ?? '';
    try {
      await marketplaceMediaAssetsApi.reorder(
        next.map((m, i) => ({ id: m.id, sortOrder: i })),
        token,
      );
      await onChange();
      setState({ kind: 'idle' });
    } catch (e) {
      setState({
        kind: 'error',
        message: e instanceof Error ? e.message : 'Reorder échoué',
      });
    }
  };

  const onDelete = async (id: string) => {
    if (disabled) return;
    const ok = await confirm({
      title: 'Supprimer cette image ?',
      description: 'Cette action est définitive. La photo sera retirée du produit et du stockage.',
      confirmLabel: 'Supprimer',
      tone: 'danger',
    });
    if (!ok) return;
    const token = authStorage.getAccessToken() ?? '';
    try {
      await marketplaceMediaAssetsApi.delete(id, token);
      await onChange();
      setState({ kind: 'idle' });
    } catch (e) {
      setState({
        kind: 'error',
        message: e instanceof Error ? e.message : 'Suppression échouée',
      });
    }
  };

  // Cap UI atteinte → désactive bouton ajouter.
  const capReached = orderedItems.length >= MEDIA_GALLERY_MAX_PER_PRODUCT_UI;

  // Suppress unused warning (sellerProfileId est exposé pour ownership futur).
  void sellerProfileId;

  return (
    <div data-testid={testId} className="flex flex-col gap-3">
      {orderedItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
          Aucune photo de galerie. Ajoutez plusieurs vues du produit pour
          enrichir la fiche.
        </div>
      ) : (
        <div
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
          data-testid={`${testId}-grid`}
        >
          {orderedItems.map((m, idx) => {
            const url = thumbUrls[m.id];
            return (
              <div
                key={m.id}
                draggable={!disabled}
                onDragStart={onDragStart(m.id)}
                onDragOver={onDragOver}
                onDrop={onDrop(m.id)}
                data-testid={`${testId}-tile-${m.id}`}
                className={`group relative overflow-hidden rounded-lg border border-gray-200 bg-white ${
                  draggedId === m.id ? 'opacity-50' : ''
                }`}
              >
                <div className="relative aspect-square w-full bg-gray-100">
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={url}
                      alt={m.altTextFr ?? `Photo ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                      Chargement…
                    </div>
                  )}
                </div>
                <div className="absolute left-1 top-1 inline-flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-mono text-white backdrop-blur-sm">
                  <GripVertical className="h-3 w-3" aria-hidden />
                  {idx + 1}
                </div>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => onDelete(m.id)}
                    data-testid={`${testId}-delete-${m.id}`}
                    className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/90 text-red-700 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:bg-red-50"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={onFilesSelected}
          className="hidden"
          data-testid={`${testId}-input`}
          disabled={disabled || capReached}
        />
        <button
          type="button"
          onClick={onPickFiles}
          disabled={disabled || capReached || state.kind === 'uploading' || state.kind === 'reordering'}
          data-testid={`${testId}-add-btn`}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state.kind === 'uploading' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          {state.kind === 'uploading'
            ? `Upload ${state.count}/${state.total}…`
            : 'Ajouter des photos'}
        </button>
        <span className="text-xs text-gray-400">
          {orderedItems.length}/{MEDIA_GALLERY_MAX_PER_PRODUCT_UI} photos · max 5 Mo · JPEG/PNG/WebP
        </span>
      </div>

      {state.kind === 'error' && (
        <div
          role="alert"
          data-testid={`${testId}-error`}
          className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800"
        >
          <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0" />
          <p>{state.message}</p>
        </div>
      )}
    </div>
  );
}
