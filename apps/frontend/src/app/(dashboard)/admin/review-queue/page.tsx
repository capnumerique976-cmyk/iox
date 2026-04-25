'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/auth.context';
import { authStorage } from '@/lib/auth';
import { notifyError, notifySuccess } from '@/lib/notify';
import { useConfirm } from '@/components/ui/confirm-dialog';
import {
  UserRole,
  MarketplaceRelatedEntityType,
  MarketplaceReviewStatus,
  MarketplaceReviewType,
} from '@iox/shared';
import { ClipboardList, Check, X, Filter, ImageIcon } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { PaginationControls } from '@/components/ui/pagination-controls';

interface ReviewItem {
  id: string;
  entityType: MarketplaceRelatedEntityType;
  entityId: string;
  reviewType: MarketplaceReviewType;
  status: MarketplaceReviewStatus;
  reviewReason: string | null;
  reviewedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedByUser?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
}

interface PendingCounts {
  total: number;
  byType: { publication: number; media: number; document: number };
}

interface MediaPreview {
  id: string;
  url: string;
  mimeType?: string;
  role?: string;
  altTextFr?: string | null;
}

const STATUS_CLS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

const TYPE_CLS: Record<string, string> = {
  PUBLICATION: 'bg-blue-100 text-blue-700',
  MEDIA: 'bg-purple-100 text-purple-700',
  DOCUMENT: 'bg-indigo-100 text-indigo-700',
};

const ENTITY_LABEL: Record<string, string> = {
  SELLER_PROFILE: 'Profil vendeur',
  MARKETPLACE_PRODUCT: 'Produit marketplace',
  MARKETPLACE_OFFER: 'Offre marketplace',
  PRODUCT_BATCH: 'Lot produit',
};

const DECIDE_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.QUALITY_MANAGER];

export default function ReviewQueuePage() {
  const { user } = useAuth();

  const [items, setItems] = useState<ReviewItem[]>([]);
  const [counts, setCounts] = useState<PendingCounts>({
    total: 0,
    byType: { publication: 0, media: 0, document: 0 },
  });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<MarketplaceReviewStatus | ''>(
    MarketplaceReviewStatus.PENDING,
  );
  const [typeFilter, setTypeFilter] = useState<MarketplaceReviewType | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const confirm = useConfirm();
  const [mediaPreviews, setMediaPreviews] = useState<Record<string, MediaPreview | null>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkProgress, setBulkProgress] = useState<{ total: number; done: number } | null>(null);

  const canDecide = !!user && DECIDE_ROLES.includes(user.role);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = authStorage.getAccessToken();
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('reviewType', typeFilter);

      const [resList, resCounts] = await Promise.all([
        fetch(`/api/v1/marketplace/review-queue?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/v1/marketplace/review-queue/stats/pending', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (!resList.ok) throw new Error();
      const json = await resList.json();
      // Le backend enveloppe toutes les réponses dans { success, data, timestamp }.
      // Pour les endpoints paginés, `data` contient lui-même { data: [...], meta: {...} }.
      const payload = json?.data ?? json;
      setItems(Array.isArray(payload?.data) ? payload.data : []);
      setTotal(payload?.meta?.total ?? 0);
      setTotalPages(payload?.meta?.totalPages ?? 1);
      if (resCounts.ok) {
        const countsJson = await resCounts.json();
        const countsPayload = countsJson?.data ?? countsJson;
        if (countsPayload && typeof countsPayload === 'object') {
          setCounts({
            total: countsPayload.total ?? 0,
            byType: {
              publication: countsPayload.byType?.publication ?? 0,
              media: countsPayload.byType?.media ?? 0,
              document: countsPayload.byType?.document ?? 0,
            },
          });
        }
      }
    } catch {
      setError('Impossible de charger la file de revue');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, typeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  // Prefetch media previews : pour chaque item MEDIA, on récupère l'asset + URL signée
  useEffect(() => {
    const mediaItems = items.filter((i) => i.reviewType === MarketplaceReviewType.MEDIA);
    const missing = mediaItems.filter((i) => mediaPreviews[i.entityId] === undefined);
    if (missing.length === 0) return;

    const token = authStorage.getAccessToken();
    missing.forEach(async (it) => {
      try {
        const [resAsset, resUrl] = await Promise.all([
          fetch(`/api/v1/media-assets/${it.entityId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/v1/media-assets/${it.entityId}/url`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        if (!resAsset.ok || !resUrl.ok) {
          setMediaPreviews((p) => ({ ...p, [it.entityId]: null }));
          return;
        }
        const assetRaw = await resAsset.json();
        const urlRaw = await resUrl.json();
        const asset = assetRaw?.data ?? assetRaw;
        const urlJson = urlRaw?.data ?? urlRaw;
        setMediaPreviews((p) => ({
          ...p,
          [it.entityId]: {
            id: asset.id,
            url: urlJson.url,
            mimeType: asset.mimeType,
            role: asset.role,
            altTextFr: asset.altTextFr,
          },
        }));
      } catch {
        setMediaPreviews((p) => ({ ...p, [it.entityId]: null }));
      }
    });
  }, [items, mediaPreviews]);

  const approve = async (item: ReviewItem) => {
    setActionError(null);
    try {
      const token = authStorage.getAccessToken();
      // MEDIA    : /media-assets/:id/approve (met à jour moderationStatus + convergence queue)
      // DOCUMENT : /marketplace/documents/:id/verify (verificationStatus → VERIFIED + convergence queue)
      // PUBLICATION : endpoint queue générique (workflow métier en parallèle)
      const url =
        item.reviewType === MarketplaceReviewType.MEDIA
          ? `/api/v1/media-assets/${item.entityId}/approve`
          : item.reviewType === MarketplaceReviewType.DOCUMENT
            ? `/api/v1/marketplace/documents/${item.entityId}/verify`
            : `/api/v1/marketplace/review-queue/${item.id}/approve`;
      const res = await fetch(url, {
        method: item.reviewType === MarketplaceReviewType.MEDIA ? 'PATCH' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? 'Erreur');
      }
      notifySuccess('Élément approuvé');
      load();
    } catch (e) {
      setActionError((e as Error).message);
      notifyError(e, "Approbation impossible");
    }
  };

  const bulkApprove = async () => {
    setActionError(null);
    const targets = items.filter(
      (i) => selected.has(i.id) && i.status === MarketplaceReviewStatus.PENDING,
    );
    if (targets.length === 0) return;
    setBulkProgress({ total: targets.length, done: 0 });
    let failed = 0;
    for (const item of targets) {
      try {
        const token = authStorage.getAccessToken();
        const url =
          item.reviewType === MarketplaceReviewType.MEDIA
            ? `/api/v1/media-assets/${item.entityId}/approve`
            : item.reviewType === MarketplaceReviewType.DOCUMENT
              ? `/api/v1/marketplace/documents/${item.entityId}/verify`
              : `/api/v1/marketplace/review-queue/${item.id}/approve`;
        const res = await fetch(url, {
          method: item.reviewType === MarketplaceReviewType.MEDIA ? 'PATCH' : 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        if (!res.ok) failed += 1;
      } catch {
        failed += 1;
      }
      setBulkProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
    }
    setBulkProgress(null);
    setSelected(new Set());
    if (failed > 0) {
      const msg = `${failed} approbation(s) ont échoué. Les autres ont été appliquées.`;
      setActionError(msg);
      notifyError(new Error(msg), 'Approbation en lot partielle');
    } else if (targets.length > 0) {
      notifySuccess(`${targets.length} élément(s) approuvé(s)`);
    }
    load();
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllPending = () => {
    const pendingIds = items
      .filter((i) => i.status === MarketplaceReviewStatus.PENDING)
      .map((i) => i.id);
    setSelected((prev) => {
      const allSelected = pendingIds.every((id) => prev.has(id));
      return allSelected ? new Set() : new Set(pendingIds);
    });
  };

  const reject = async (item: ReviewItem) => {
    const result = await confirm({
      title: "Rejeter cet item de revue",
      description: `${ENTITY_LABEL[item.entityType] ?? item.entityType} · ${item.reviewType}. Le motif sera transmis au vendeur — soyez précis et actionnable.`,
      confirmLabel: 'Confirmer le rejet',
      tone: 'danger',
      requireReason: {
        label: 'Motif du rejet',
        minLength: 10,
        placeholder: "Expliquer pourquoi cet item est rejeté…",
      },
    });
    if (!result) return;
    setActionError(null);
    try {
      const token = authStorage.getAccessToken();
      const url =
        item.reviewType === MarketplaceReviewType.MEDIA
          ? `/api/v1/media-assets/${item.entityId}/reject`
          : item.reviewType === MarketplaceReviewType.DOCUMENT
            ? `/api/v1/marketplace/documents/${item.entityId}/reject`
            : `/api/v1/marketplace/review-queue/${item.id}/reject`;
      const res = await fetch(url, {
        method: item.reviewType === MarketplaceReviewType.MEDIA ? 'PATCH' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: result.reason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? 'Erreur');
      }
      notifySuccess('Élément rejeté');
      load();
    } catch (e) {
      setActionError((e as Error).message);
      notifyError(e, 'Rejet impossible');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ClipboardList className="h-5 w-5" aria-hidden />}
        title="File de revue marketplace"
        subtitle={`${counts.total} en attente · Publications ${counts.byType.publication} · Médias ${counts.byType.media} · Documents ${counts.byType.document}`}
      />

      {actionError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-600 flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filtres */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="h-4 w-4 text-gray-400" />
        <select
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value as MarketplaceReviewStatus | '');
          }}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-premium-accent/30"
        >
          <option value="">Tous statuts</option>
          <option value={MarketplaceReviewStatus.PENDING}>En attente</option>
          <option value={MarketplaceReviewStatus.APPROVED}>Approuvés</option>
          <option value={MarketplaceReviewStatus.REJECTED}>Rejetés</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => {
            setPage(1);
            setTypeFilter(e.target.value as MarketplaceReviewType | '');
          }}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-premium-accent/30"
        >
          <option value="">Tous types</option>
          <option value={MarketplaceReviewType.PUBLICATION}>Publication</option>
          <option value={MarketplaceReviewType.MEDIA}>Média</option>
          <option value={MarketplaceReviewType.DOCUMENT}>Document</option>
        </select>

        {canDecide && selected.size > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-500">{selected.size} sélectionné(s)</span>
            <button
              type="button"
              onClick={bulkApprove}
              disabled={bulkProgress !== null}
              className="inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              {bulkProgress
                ? `Approbation… (${bulkProgress.done}/${bulkProgress.total})`
                : `Approuver la sélection (${selected.size})`}
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              Effacer
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <div className="iox-table-wrap">
        <table>
          <thead>
            <tr>
              {canDecide && (
                <th className="px-3 py-3 w-8">
                  <input
                    type="checkbox"
                    aria-label="Tout sélectionner"
                    checked={
                      items.filter((i) => i.status === MarketplaceReviewStatus.PENDING).length >
                        0 &&
                      items
                        .filter((i) => i.status === MarketplaceReviewStatus.PENDING)
                        .every((i) => selected.has(i.id))
                    }
                    onChange={toggleAllPending}
                  />
                </th>
              )}
              <th className="px-4 py-3 text-left font-medium text-gray-500 w-24">Aperçu</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Entité</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Statut</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Motif</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Revu par</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Créé</th>
              {canDecide && (
                <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={canDecide ? 9 : 8} className="px-4 py-12 text-center text-gray-400">
                  Chargement…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={canDecide ? 9 : 8} className="px-4 py-12 text-center text-gray-400">
                  Aucun item
                </td>
              </tr>
            ) : (
              items.map((it) => {
                const preview =
                  it.reviewType === MarketplaceReviewType.MEDIA ? mediaPreviews[it.entityId] : null;
                const isPending = it.status === MarketplaceReviewStatus.PENDING;
                return (
                  <tr key={it.id} className="hover:bg-gray-50">
                    {canDecide && (
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Sélectionner ${it.id}`}
                          disabled={!isPending}
                          checked={selected.has(it.id)}
                          onChange={() => toggleOne(it.id)}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      {it.reviewType === MarketplaceReviewType.MEDIA ? (
                        preview ? (
                          <a
                            href={preview.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block h-14 w-14 rounded border border-gray-200 overflow-hidden bg-gray-50 relative"
                          >
                            <Image
                              src={preview.url}
                              alt={preview.altTextFr ?? 'aperçu'}
                              fill
                              sizes="56px"
                              style={{ objectFit: 'cover' }}
                              unoptimized
                            />
                          </a>
                        ) : preview === null ? (
                          <div className="h-14 w-14 rounded border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-300">
                            <ImageIcon className="h-5 w-5" />
                          </div>
                        ) : (
                          <div className="h-14 w-14 rounded border border-gray-200 bg-gray-100 animate-pulse" />
                        )
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {ENTITY_LABEL[it.entityType] ?? it.entityType}
                      </p>
                      <p className="text-xs text-gray-400 font-mono">{it.entityId.slice(0, 8)}…</p>
                      {preview?.role && (
                        <p className="text-xs text-purple-500 mt-0.5">{preview.role}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_CLS[it.reviewType] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {it.reviewType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLS[it.status] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {it.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                      {it.reviewReason ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {it.reviewedByUser ? (
                        `${it.reviewedByUser.firstName} ${it.reviewedByUser.lastName}`
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(it.createdAt).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    {canDecide && (
                      <td className="px-4 py-3 text-right">
                        {it.status === MarketplaceReviewStatus.PENDING ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => approve(it)}
                              className="inline-flex items-center gap-1 rounded-md border border-green-200 bg-green-50 px-2 py-1 text-xs text-green-700 hover:bg-green-100"
                            >
                              <Check className="h-3 w-3" /> Approuver
                            </button>
                            <button
                              onClick={() => reject(it)}
                              className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
                            >
                              <X className="h-3 w-3" /> Rejeter
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">Traité</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <div className="px-4 py-3 border-t border-gray-100">
          <PaginationControls
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            label={
              <>
                Page {page} sur {totalPages} · {total} items
              </>
            }
          />
        </div>
      </div>

    </div>
  );
}
