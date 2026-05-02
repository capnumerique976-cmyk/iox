'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Filter,
  Shield,
  X,
} from 'lucide-react';
import { EntityType } from '@iox/shared';
import { authStorage } from '@/lib/auth';
import { auditApi, type AuditLogItem, type AuditLogListResponse, type ListAuditLogsParams } from '@/lib/audit';
import { PageHeader } from '@/components/ui/page-header';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';

/* ─── Entity-type labels (French) ─────────────────────────────────── */

const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  [EntityType.BENEFICIARY]: 'Beneficiaire',
  [EntityType.PRODUCT]: 'Produit',
  [EntityType.INBOUND_BATCH]: 'Lot entrant',
  [EntityType.TRANSFORMATION_OPERATION]: 'Operation de transformation',
  [EntityType.PRODUCT_BATCH]: 'Lot produit',
  [EntityType.MARKET_RELEASE_DECISION]: 'Decision mise en marche',
  [EntityType.SUPPLY_CONTRACT]: "Contrat d'approvisionnement",
  [EntityType.INCIDENT]: 'Incident',
  [EntityType.DISTRIBUTION]: 'Distribution',
  [EntityType.USER]: 'Utilisateur',
  [EntityType.COMPANY]: 'Entreprise',
  [EntityType.SELLER_PROFILE]: 'Profil vendeur',
  [EntityType.MARKETPLACE_PRODUCT]: 'Produit marketplace',
  [EntityType.MARKETPLACE_OFFER]: 'Offre marketplace',
  [EntityType.MARKETPLACE_DOCUMENT]: 'Document marketplace',
  [EntityType.MARKETPLACE_CERTIFICATION]: 'Certification',
  [EntityType.MEDIA_ASSET]: 'Media',
  [EntityType.QUOTE_REQUEST]: 'Demande de devis',
  [EntityType.MARKETPLACE_REVIEW]: 'Avis marketplace',
};

/* ─── Entity-type badge color mapping ─────────────────────────────── */

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const ENTITY_TYPE_VARIANT: Partial<Record<EntityType, BadgeVariant>> = {
  [EntityType.USER]: 'info',
  [EntityType.COMPANY]: 'info',
  [EntityType.BENEFICIARY]: 'success',
  [EntityType.PRODUCT]: 'default',
  [EntityType.INBOUND_BATCH]: 'neutral',
  [EntityType.PRODUCT_BATCH]: 'neutral',
  [EntityType.TRANSFORMATION_OPERATION]: 'neutral',
  [EntityType.MARKET_RELEASE_DECISION]: 'warning',
  [EntityType.SUPPLY_CONTRACT]: 'default',
  [EntityType.INCIDENT]: 'danger',
  [EntityType.DISTRIBUTION]: 'success',
  [EntityType.SELLER_PROFILE]: 'info',
  [EntityType.MARKETPLACE_PRODUCT]: 'default',
  [EntityType.MARKETPLACE_OFFER]: 'warning',
  [EntityType.MARKETPLACE_DOCUMENT]: 'neutral',
  [EntityType.MARKETPLACE_CERTIFICATION]: 'success',
  [EntityType.MEDIA_ASSET]: 'neutral',
  [EntityType.QUOTE_REQUEST]: 'warning',
  [EntityType.MARKETPLACE_REVIEW]: 'info',
};

/* ─── Helpers ─────────────────────────────────────────────────────── */

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function truncateUuid(uuid: string): string {
  if (uuid.length <= 12) return uuid;
  return `${uuid.slice(0, 8)}...`;
}

function userName(user: AuditLogItem['user']): string {
  if (!user) return '-';
  if (user.firstName || user.lastName) {
    return [user.firstName, user.lastName].filter(Boolean).join(' ');
  }
  return user.email;
}

const PAGE_SIZE = 50;

/* ─── Component ───────────────────────────────────────────────────── */

export default function AuditLogsPage() {
  const [data, setData] = useState<AuditLogListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filters
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [userId, setUserId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  // Detail panel
  const [selectedItem, setSelectedItem] = useState<AuditLogItem | null>(null);

  const fetchLogs = useCallback(
    async (params: ListAuditLogsParams) => {
      setLoading(true);
      setError(null);
      try {
        const token = authStorage.getAccessToken() ?? '';
        const result = await auditApi.list(params, token);
        setData(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const doSearch = useCallback(
    (overridePage?: number) => {
      const p = overridePage ?? page;
      const params: ListAuditLogsParams = { page: p, limit: PAGE_SIZE };
      if (entityType) params.entityType = entityType;
      if (action.trim()) params.action = action.trim();
      if (userId.trim()) params.userId = userId.trim();
      if (from) params.from = new Date(from).toISOString();
      if (to) params.to = new Date(to).toISOString();
      fetchLogs(params);
    },
    [page, entityType, action, userId, from, to, fetchLogs],
  );

  useEffect(() => {
    doSearch(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilter = () => {
    setPage(1);
    doSearch(1);
  };

  const handleReset = () => {
    setEntityType('');
    setAction('');
    setUserId('');
    setFrom('');
    setTo('');
    setPage(1);
    fetchLogs({ page: 1, limit: PAGE_SIZE });
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    doSearch(p);
  };

  return (
    <div className="space-y-6" data-testid="audit-logs-page">
      <PageHeader
        icon={<Shield className="h-5 w-5" aria-hidden />}
        title="Journal d'audit"
        subtitle={
          data
            ? `${data.meta.total} entree${data.meta.total !== 1 ? 's' : ''}`
            : 'Chargement...'
        }
      />

      {/* Filters — collapsible */}
      <section className="rounded-xl border border-gray-200 bg-white shadow-premium-sm">
        <button
          type="button"
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="flex w-full items-center justify-between px-5 py-3 text-sm font-semibold text-gray-900"
          data-testid="filters-toggle"
        >
          <span className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" aria-hidden />
            Filtres
          </span>
          {filtersOpen ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>

        {filtersOpen && (
          <div className="border-t border-gray-100 px-5 pb-4 pt-3" data-testid="filters-panel">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {/* Entity type select */}
              <div>
                <label htmlFor="filter-entityType" className="mb-1 block text-xs font-medium text-gray-600">
                  Type d&apos;entite
                </label>
                <select
                  id="filter-entityType"
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-premium-accent focus:outline-none focus:ring-1 focus:ring-premium-accent"
                  data-testid="filter-entityType"
                >
                  <option value="">Tous</option>
                  {Object.values(EntityType).map((et) => (
                    <option key={et} value={et}>
                      {ENTITY_TYPE_LABELS[et] ?? et}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action text */}
              <div>
                <label htmlFor="filter-action" className="mb-1 block text-xs font-medium text-gray-600">
                  Action
                </label>
                <input
                  id="filter-action"
                  type="text"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  placeholder="ex: CREATE, UPDATE..."
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-premium-accent focus:outline-none focus:ring-1 focus:ring-premium-accent"
                  data-testid="filter-action"
                />
              </div>

              {/* User ID */}
              <div>
                <label htmlFor="filter-userId" className="mb-1 block text-xs font-medium text-gray-600">
                  Utilisateur (UUID)
                </label>
                <input
                  id="filter-userId"
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="UUID de l'utilisateur"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-premium-accent focus:outline-none focus:ring-1 focus:ring-premium-accent"
                  data-testid="filter-userId"
                />
              </div>

              {/* Date from */}
              <div>
                <label htmlFor="filter-from" className="mb-1 block text-xs font-medium text-gray-600">
                  Date debut
                </label>
                <input
                  id="filter-from"
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-premium-accent focus:outline-none focus:ring-1 focus:ring-premium-accent"
                  data-testid="filter-from"
                />
              </div>

              {/* Date to */}
              <div>
                <label htmlFor="filter-to" className="mb-1 block text-xs font-medium text-gray-600">
                  Date fin
                </label>
                <input
                  id="filter-to"
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-premium-accent focus:outline-none focus:ring-1 focus:ring-premium-accent"
                  data-testid="filter-to"
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleFilter}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-premium-sm transition-all duration-base ease-premium hover:border-premium-accent/40 hover:bg-premium-accent/5 hover:text-premium-accent"
                data-testid="filter-submit"
              >
                Filtrer
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-500 shadow-premium-sm transition-all duration-base ease-premium hover:border-gray-300 hover:text-gray-700"
                data-testid="filter-reset"
              >
                Reinitialiser
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Error */}
      {error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          data-testid="audit-error"
        >
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-2 animate-pulse" data-testid="audit-loading">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 rounded bg-gray-100" />
          ))}
        </div>
      )}

      {/* Table */}
      {!loading && data && data.data.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-premium-sm">
            <table className="min-w-full text-sm" data-testid="audit-table">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Type entite</th>
                  <th className="px-4 py-3">Entity ID</th>
                  <th className="px-4 py-3">Utilisateur</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="cursor-pointer border-b border-gray-50 transition-colors hover:bg-premium-accent/5"
                    data-testid={`audit-row-${item.id}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="default" size="sm">
                        {item.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={ENTITY_TYPE_VARIANT[item.entityType] ?? 'neutral'}
                        size="sm"
                      >
                        {ENTITY_TYPE_LABELS[item.entityType] ?? item.entityType}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-500" title={item.entityId}>
                      {truncateUuid(item.entityId)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {userName(item.user)}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-gray-500">
                      {item.notes ?? '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <PaginationControls
            page={data.meta.page}
            totalPages={data.meta.totalPages}
            onPageChange={handlePageChange}
            label={`${data.meta.total} entree${data.meta.total !== 1 ? 's' : ''} — page ${data.meta.page} sur ${data.meta.totalPages}`}
          />
        </>
      )}

      {/* Empty state */}
      {!loading && data && data.data.length === 0 && (
        <EmptyState
          icon={<Shield className="h-8 w-8" />}
          title="Aucune entree d'audit"
          description="Aucun log ne correspond aux criteres de recherche."
          data-testid="audit-empty"
        />
      )}

      {/* Detail modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setSelectedItem(null)}
          data-testid="audit-detail-overlay"
        >
          <div
            className="relative mx-4 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            data-testid="audit-detail-panel"
          >
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Fermer"
              data-testid="audit-detail-close"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="mb-4 text-lg font-bold text-gray-900">
              Detail du log d&apos;audit
            </h2>

            <dl className="space-y-3 text-sm">
              <DetailRow label="Action" value={selectedItem.action} />
              <DetailRow
                label="Type entite"
                value={ENTITY_TYPE_LABELS[selectedItem.entityType] ?? selectedItem.entityType}
              />
              <DetailRow label="Entity ID" value={selectedItem.entityId} mono />
              <DetailRow label="Date" value={formatDate(selectedItem.createdAt)} />

              {/* User info */}
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">Utilisateur</dt>
                <dd className="mt-0.5 text-gray-700">
                  {selectedItem.user ? (
                    <span>
                      {userName(selectedItem.user)} ({selectedItem.user.email}) —{' '}
                      <Badge variant="info" size="sm">{selectedItem.user.role}</Badge>
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </dd>
              </div>

              <DetailRow label="Adresse IP" value={selectedItem.ipAddress ?? '-'} />
              <DetailRow label="User Agent" value={selectedItem.userAgent ?? '-'} />
              <DetailRow label="Notes" value={selectedItem.notes ?? '-'} />

              {/* Previous data */}
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Donnees precedentes
                </dt>
                <dd className="mt-1">
                  <pre
                    className="max-h-60 overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-700"
                    data-testid="audit-detail-previousData"
                  >
                    <code>
                      {selectedItem.previousData
                        ? JSON.stringify(selectedItem.previousData, null, 2)
                        : 'null'}
                    </code>
                  </pre>
                </dd>
              </div>

              {/* New data */}
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Nouvelles donnees
                </dt>
                <dd className="mt-1">
                  <pre
                    className="max-h-60 overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-700"
                    data-testid="audit-detail-newData"
                  >
                    <code>
                      {selectedItem.newData
                        ? JSON.stringify(selectedItem.newData, null, 2)
                        : 'null'}
                    </code>
                  </pre>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Detail row helper ───────────────────────────────────────────── */

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</dt>
      <dd className={`mt-0.5 text-gray-700 ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}
