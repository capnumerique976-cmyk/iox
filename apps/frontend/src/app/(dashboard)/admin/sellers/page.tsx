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

type ModalState =
  | { kind: 'none' }
  | { kind: 'reject'; row: SellerProfileRow }
  | { kind: 'suspend'; row: SellerProfileRow };

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
  const [modal, setModal] = useState<ModalState>({ kind: 'none' });

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

  const act = async (row: SellerProfileRow, fn: (token: string) => Promise<unknown>) => {
    const token = authStorage.getAccessToken() ?? '';
    setActingId(row.id);
    setActionError(null);
    try {
      await fn(token);
      await load();
      setModal({ kind: 'none' });
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Action impossible');
    } finally {
      setActingId(null);
    }
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
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Store className="h-6 w-6 text-indigo-500" />
            Profils vendeurs marketplace
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} profil{total > 1 ? 's' : ''} · validation, suspension, mise en avant
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          Rafraîchir
        </button>
      </header>

      {/* Filtres + recherche */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom public / slug…"
            className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as SellerProfileStatus | '')}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Vendeur</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Statut</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Pays / région</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Offres</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
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
                              act(r, (token) => sellerProfilesApi.approve(r.id, token))
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
                            onClick={() => setModal({ kind: 'reject', row: r })}
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
                            onClick={() => setModal({ kind: 'suspend', row: r })}
                          >
                            <Ban className="h-3 w-3" /> Suspendre
                          </ActionButton>
                          {r.isFeatured ? (
                            <ActionButton
                              disabled={!canDecide || actingId === r.id}
                              tone="yellow"
                              onClick={() =>
                                act(r, (token) => sellerProfilesApi.unfeature(r.id, token))
                              }
                            >
                              <StarOff className="h-3 w-3" /> Retirer
                            </ActionButton>
                          ) : (
                            <ActionButton
                              disabled={!canDecide || actingId === r.id}
                              tone="yellow"
                              onClick={() =>
                                act(r, (token) => sellerProfilesApi.feature(r.id, token))
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
                            act(r, (token) => sellerProfilesApi.reinstate(r.id, token))
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

      {/* Modal motif obligatoire */}
      {modal.kind !== 'none' && (
        <ReasonModal
          title={modal.kind === 'reject' ? 'Rejeter le profil' : 'Suspendre le profil'}
          label={
            modal.kind === 'reject'
              ? 'Motif de rejet (communiqué au vendeur)'
              : 'Motif de suspension (audit interne)'
          }
          confirmLabel={modal.kind === 'reject' ? 'Rejeter' : 'Suspendre'}
          onCancel={() => setModal({ kind: 'none' })}
          onConfirm={(reason) => {
            if (modal.kind === 'reject') {
              return act(modal.row, (token) =>
                sellerProfilesApi.reject(modal.row.id, reason, token),
              );
            }
            return act(modal.row, (token) =>
              sellerProfilesApi.suspend(modal.row.id, reason, token),
            );
          }}
          loading={actingId === modal.row.id}
        />
      )}
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

function ReasonModal({
  title,
  label,
  confirmLabel,
  onCancel,
  onConfirm,
  loading,
}: {
  title: string;
  label: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState('');
  const valid = reason.trim().length >= 3;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <label className="block text-sm text-gray-700">
          {label}
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            minLength={3}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Motif (min. 3 caractères)…"
          />
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            disabled={!valid || loading}
            onClick={() => onConfirm(reason.trim())}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Envoi…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
