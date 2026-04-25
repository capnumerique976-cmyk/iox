'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  BadgeCheck,
  Ban,
  Check,
  RefreshCw,
  Search,
  Star,
  StarOff,
  Store,
  X,
} from 'lucide-react';
import { ApiError } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import { useAuth } from '@/contexts/auth.context';
import { SellerProfileRow, sellerProfilesApi } from '@/lib/seller-profiles';
import { SellerProfileStatus, UserRole } from '@iox/shared';
import { PageHeader } from '@/components/ui/page-header';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { notifyError, notifySuccess } from '@/lib/notify';

/**
 * Admin — gestion des profils vendeurs marketplace.
 *
 * Permet de :
 * - Lister, filtrer par statut, rechercher.
 * - Approuver / rejeter (avec motif) un profil en PENDING_REVIEW.
 * - Suspendre (avec motif) / réactiver un profil approuvé.
 * - Mettre en avant (feature) / retirer.
 *
 * Les actions destructives (reject / suspend) demandent un motif
 * explicite pour l'auditabilité (imposé côté backend — MinLength 3).
 * Les actions sont désactivées si le user courant n'a pas le rôle
 * ADMIN/QUALITY_MANAGER : le bouton reste visible mais `disabled` avec
 * un `title` expliquant pourquoi.
 */

const STATUS_LABEL: Record<SellerProfileStatus, string> = {
  DRAFT: 'Brouillon',
  PENDING_REVIEW: 'À valider',
  APPROVED: 'Approuvé',
  SUSPENDED: 'Suspendu',
  REJECTED: 'Rejeté',
};

const STATUS_TONE: Record<SellerProfileStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_REVIEW: 'bg-orange-100 text-orange-700',
  APPROVED: 'bg-green-100 text-green-700',
  SUSPENDED: 'bg-red-100 text-red-700',
  REJECTED: 'bg-gray-200 text-gray-600',
};

const DECIDE_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.QUALITY_MANAGER];

export default function AdminSellersPage() {
  const { user } = useAuth();
  const canDecide = !!user && DECIDE_ROLES.includes(user.role);

  const [rows, setRows] = useState<SellerProfileRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<SellerProfileStatus | ''>('');
  const [search, setSearch] = useState('');
  const confirm = useConfirm();

  const load = useCallback(async () => {
    const token = authStorage.getAccessToken() ?? '';
    setLoading(true);
    setError(null);
    try {
      const r = await sellerProfilesApi.list(token, {
        limit: 50,
        status: statusFilter || undefined,
        search: search.trim() || undefined,
      });
      setRows(r.data);
      setTotal(r.meta.total);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (
    row: SellerProfileRow,
    fn: (token: string) => Promise<unknown>,
    successMsg?: string,
  ) => {
    const token = authStorage.getAccessToken() ?? '';
    setActingId(row.id);
    setActionError(null);
    try {
      await fn(token);
      if (successMsg) notifySuccess(successMsg);
      await load();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Action impossible');
      notifyError(e, 'Action impossible');
    } finally {
      setActingId(null);
    }
  };

  /**
   * Reject / suspend : motif obligatoire (min 3 chars côté backend, on
   * remonte à 10 côté UI pour des motifs lisibles). On passe par le
   * dialogue standard (L9-2) au lieu d'une modale ad hoc.
   */
  const requestReject = async (row: SellerProfileRow) => {
    const result = await confirm({
      title: 'Rejeter ce profil vendeur',
      description: `${row.publicDisplayName ?? row.slug} (${row.slug}). Le motif sera communiqué au vendeur.`,
      confirmLabel: 'Rejeter',
      tone: 'danger',
      requireReason: {
        label: 'Motif de rejet (communiqué au vendeur)',
        minLength: 10,
        placeholder: 'Documents manquants, informations incohérentes, …',
      },
    });
    if (!result) return;
    await act(row, (t) => sellerProfilesApi.reject(row.id, result.reason, t), 'Profil rejeté');
  };

  const requestSuspend = async (row: SellerProfileRow) => {
    const result = await confirm({
      title: 'Suspendre ce profil vendeur',
      description: `${row.publicDisplayName ?? row.slug} (${row.slug}). Le profil ne sera plus visible côté acheteurs jusqu'à réactivation.`,
      confirmLabel: 'Suspendre',
      tone: 'danger',
      requireReason: {
        label: 'Motif de suspension (audit interne)',
        minLength: 10,
        placeholder: 'Manquement contractuel, plainte acheteur, …',
      },
    });
    if (!result) return;
    await act(row, (t) => sellerProfilesApi.suspend(row.id, result.reason, t), 'Profil suspendu');
  };

  const counts = useMemo(() => {
    // compteur local visible sur la liste courante (filtres appliqués)
    return rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {});
  }, [rows]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Store className="h-5 w-5" aria-hidden />}
        title="Profils vendeurs marketplace"
        subtitle={`${total} profil${total > 1 ? 's' : ''} · validation, suspension, mise en avant`}
        actions={
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-premium-sm transition-all duration-fast ease-premium hover:border-premium-accent/40 hover:bg-premium-accent/5 hover:text-premium-accent"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Rafraîchir
          </button>
        }
      />

      {/* Filtres + recherche */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom public / slug…"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm shadow-premium-sm transition-all duration-fast ease-premium focus:border-premium-accent/40 focus:outline-none focus:ring-2 focus:ring-premium-accent/30"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as SellerProfileStatus | '')}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-premium-sm transition-all duration-fast ease-premium focus:border-premium-accent/40 focus:outline-none focus:ring-2 focus:ring-premium-accent/30"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABEL).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>

        <div className="ml-auto flex gap-2 text-xs text-gray-500">
          {Object.entries(STATUS_LABEL).map(([k, label]) => (
            <span key={k} className="inline-flex items-center gap-1">
              <span
                className={`inline-block h-2 w-2 rounded-full ${STATUS_TONE[k as SellerProfileStatus].split(' ')[0].replace('bg-', 'bg-')}`}
              />
              {label}: {counts[k] ?? 0}
            </span>
          ))}
        </div>
      </div>

      {error && <Alert onClose={() => setError(null)}>{error}</Alert>}
      {actionError && <Alert onClose={() => setActionError(null)}>{actionError}</Alert>}

      {/* Table */}
      <div className="iox-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Vendeur</th>
              <th>Statut</th>
              <th>Pays / région</th>
              <th>Offres</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                  Chargement…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                  Aucun profil trouvé.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate flex items-center gap-1.5">
                          {r.publicDisplayName ?? '—'}
                          {r.isFeatured && (
                            <Star className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />
                          )}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {r.company?.name ?? r.slug}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs ${STATUS_TONE[r.status]}`}
                    >
                      {STATUS_LABEL[r.status]}
                    </span>
                    {r.rejectionReason && r.status === 'REJECTED' && (
                      <p
                        className="text-[11px] text-gray-400 mt-1 truncate max-w-[180px]"
                        title={r.rejectionReason}
                      >
                        {r.rejectionReason}
                      </p>
                    )}
                    {r.suspensionReason && r.status === 'SUSPENDED' && (
                      <p
                        className="text-[11px] text-gray-400 mt-1 truncate max-w-[180px]"
                        title={r.suspensionReason}
                      >
                        {r.suspensionReason}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {r.country ?? '—'}
                    {r.region ? ` / ${r.region}` : ''}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {r._count
                      ? `${r._count.marketplaceOffers} offres · ${r._count.marketplaceProducts} produits`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1.5 flex-wrap">
                      <Link
                        href={`/marketplace/sellers/${r.slug}`}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 text-gray-700 text-xs px-2 py-1 hover:bg-gray-50"
                      >
                        Voir
                      </Link>

                      {r.status === 'PENDING_REVIEW' && (
                        <>
                          <ActionButton
                            disabled={!canDecide || actingId === r.id}
                            title={
                              canDecide ? 'Approuver ce profil' : 'Action réservée ADMIN/QUALITY'
                            }
                            tone="green"
                            onClick={() =>
                              act(r, (token) => sellerProfilesApi.approve(r.id, token), "Profil approuvé")
                            }
                          >
                            <Check className="h-3 w-3" /> Approuver
                          </ActionButton>
                          <ActionButton
                            disabled={!canDecide || actingId === r.id}
                            title={
                              canDecide ? 'Rejeter ce profil' : 'Action réservée ADMIN/QUALITY'
                            }
                            tone="red"
                            onClick={() => requestReject(r)}
                          >
                            <X className="h-3 w-3" /> Rejeter
                          </ActionButton>
                        </>
                      )}

                      {r.status === 'APPROVED' && (
                        <>
                          <ActionButton
                            disabled={!canDecide || actingId === r.id}
                            title={
                              canDecide ? 'Suspendre ce profil' : 'Action réservée ADMIN/QUALITY'
                            }
                            tone="red"
                            onClick={() => requestSuspend(r)}
                          >
                            <Ban className="h-3 w-3" /> Suspendre
                          </ActionButton>
                          {r.isFeatured ? (
                            <ActionButton
                              disabled={!canDecide || actingId === r.id}
                              tone="yellow"
                              onClick={() =>
                                act(r, (token) => sellerProfilesApi.unfeature(r.id, token), "Profil retiré de la mise en avant")
                              }
                            >
                              <StarOff className="h-3 w-3" /> Retirer
                            </ActionButton>
                          ) : (
                            <ActionButton
                              disabled={!canDecide || actingId === r.id}
                              tone="yellow"
                              onClick={() =>
                                act(r, (token) => sellerProfilesApi.feature(r.id, token), "Profil mis en avant")
                              }
                            >
                              <Star className="h-3 w-3" /> Mettre en avant
                            </ActionButton>
                          )}
                        </>
                      )}

                      {r.status === 'SUSPENDED' && (
                        <ActionButton
                          disabled={!canDecide || actingId === r.id}
                          tone="green"
                          onClick={() =>
                            act(r, (token) => sellerProfilesApi.reinstate(r.id, token), "Profil réactivé")
                          }
                        >
                          <BadgeCheck className="h-3 w-3" /> Réactiver
                        </ActionButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}

/* ─── UI helpers ──────────────────────────────────────────────────── */

function Alert({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-600 flex items-center justify-between">
      <span className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4" /> {children}
      </span>
      <button onClick={onClose} className="text-red-400 hover:text-red-600" aria-label="Fermer">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function ActionButton({
  children,
  disabled,
  title,
  tone,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  title?: string;
  tone: 'green' | 'red' | 'yellow';
  onClick: () => void;
}) {
  const tones: Record<string, string> = {
    green: 'border-green-200 text-green-700 hover:bg-green-50',
    red: 'border-red-200 text-red-700 hover:bg-red-50',
    yellow: 'border-yellow-200 text-yellow-700 hover:bg-yellow-50',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center gap-1 rounded-md border text-xs px-2 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

