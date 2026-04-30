'use client';

// MP-MEDIA-1 LOT 3 — Page admin modération média.
//
// Liste paginée des MediaAsset filtrés par status / relatedType / mediaType.
// Click sur un row → ouvre MediaPreviewModal avec actions approve/reject.

import { useCallback, useEffect, useState } from 'react';
import { Image as ImageIcon, Video as VideoIcon, Filter } from 'lucide-react';
import { authStorage } from '@/lib/auth';
import {
  marketplaceMediaAssetsApi,
  type MediaAsset,
} from '@/lib/marketplace-media-assets';
import {
  MarketplaceRelatedEntityType,
  MediaAssetType,
  MediaModerationStatus,
} from '@iox/shared';
import { MediaPreviewModal } from '@/components/admin/MediaPreviewModal';

const STATUS_CLS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

const ENTITY_LABEL: Record<string, string> = {
  SELLER_PROFILE: 'Profil vendeur',
  MARKETPLACE_PRODUCT: 'Produit',
  MARKETPLACE_OFFER: 'Offre',
  PRODUCT_BATCH: 'Lot',
};

export default function MediaModerationPage() {
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtres
  const [statusFilter, setStatusFilter] = useState<MediaModerationStatus>(
    MediaModerationStatus.PENDING,
  );
  const [relatedTypeFilter, setRelatedTypeFilter] = useState<
    MarketplaceRelatedEntityType | ''
  >('');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<MediaAssetType | ''>('');

  const [previewMedia, setPreviewMedia] = useState<MediaAsset | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = authStorage.getAccessToken() ?? '';
      const res = await marketplaceMediaAssetsApi.listForModeration(
        {
          moderationStatus: statusFilter,
          relatedType: relatedTypeFilter || undefined,
          mediaType: mediaTypeFilter || undefined,
          page,
          limit: 20,
        },
        token,
      );
      setItems(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, relatedTypeFilter, mediaTypeFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6 p-6" data-testid="media-moderation-page">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Modération média</h1>
        <p className="mt-1 text-sm text-gray-600">
          {total} média{total > 1 ? 's' : ''} — filtrer puis approuver ou rejeter.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <Filter className="h-4 w-4 text-gray-400" />
        <div className="flex flex-col">
          <label className="text-[11px] font-medium text-gray-500">Statut</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as MediaModerationStatus);
              setPage(1);
            }}
            className="rounded-md border border-gray-200 px-2 py-1 text-xs"
            data-testid="filter-status"
          >
            <option value={MediaModerationStatus.PENDING}>En attente</option>
            <option value={MediaModerationStatus.APPROVED}>Approuvés</option>
            <option value={MediaModerationStatus.REJECTED}>Rejetés</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-[11px] font-medium text-gray-500">Type entité</label>
          <select
            value={relatedTypeFilter}
            onChange={(e) => {
              setRelatedTypeFilter(e.target.value as MarketplaceRelatedEntityType | '');
              setPage(1);
            }}
            className="rounded-md border border-gray-200 px-2 py-1 text-xs"
            data-testid="filter-relatedtype"
          >
            <option value="">Tous</option>
            <option value={MarketplaceRelatedEntityType.SELLER_PROFILE}>Profil vendeur</option>
            <option value={MarketplaceRelatedEntityType.MARKETPLACE_PRODUCT}>Produit</option>
            <option value={MarketplaceRelatedEntityType.MARKETPLACE_OFFER}>Offre</option>
            <option value={MarketplaceRelatedEntityType.PRODUCT_BATCH}>Lot</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-[11px] font-medium text-gray-500">Type média</label>
          <select
            value={mediaTypeFilter}
            onChange={(e) => {
              setMediaTypeFilter(e.target.value as MediaAssetType | '');
              setPage(1);
            }}
            className="rounded-md border border-gray-200 px-2 py-1 text-xs"
            data-testid="filter-mediatype"
          >
            <option value="">Tous</option>
            <option value={MediaAssetType.IMAGE}>Image</option>
            <option value={MediaAssetType.VIDEO}>Vidéo</option>
            <option value={MediaAssetType.ILLUSTRATION}>Illustration</option>
          </select>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          data-testid="media-moderation-error"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800"
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-500" data-testid="media-moderation-loading">
          Chargement…
        </p>
      ) : items.length === 0 ? (
        <p
          className="rounded-md border border-gray-200 bg-white p-6 text-center text-sm text-gray-500"
          data-testid="media-moderation-empty"
        >
          Aucun média ne correspond aux filtres.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm" data-testid="media-moderation-table">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Rôle</th>
                <th className="px-3 py-2 text-left">Entité</th>
                <th className="px-3 py-2 text-left">ID parent</th>
                <th className="px-3 py-2 text-left">Créé le</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50" data-testid={`media-row-${m.id}`}>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1 text-xs">
                      {m.mediaType === 'VIDEO' ? (
                        <VideoIcon className="h-3 w-3 text-purple-600" />
                      ) : (
                        <ImageIcon className="h-3 w-3 text-blue-600" />
                      )}
                      {m.mediaType}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600">{m.role}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">
                    {ENTITY_LABEL[m.relatedType] ?? m.relatedType}
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px] text-gray-500">{m.relatedId}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">
                    {new Date(m.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLS[m.moderationStatus] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {m.moderationStatus}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setPreviewMedia(m)}
                      className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                      data-testid={`media-row-${m.id}-view`}
                    >
                      Voir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs disabled:opacity-50"
            data-testid="pagination-prev"
          >
            Précédent
          </button>
          <span className="text-xs text-gray-500">
            Page {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs disabled:opacity-50"
            data-testid="pagination-next"
          >
            Suivant
          </button>
        </div>
      )}

      {previewMedia && (
        <MediaPreviewModal
          media={previewMedia}
          onClose={() => setPreviewMedia(null)}
          onApproved={async () => {
            await load();
          }}
          onRejected={async () => {
            await load();
          }}
        />
      )}
    </div>
  );
}
