'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Eye, Clock } from 'lucide-react';
import { UserRole } from '@iox/shared';
import { useAuth } from '@/contexts/auth.context';
import { authStorage } from '@/lib/auth';
import { PaginationControls } from '@/components/ui/pagination-controls';

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  previousData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  notes?: string;
  createdAt: string;
  user?: { id: string; email: string; firstName: string; lastName: string; role: string };
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ENTITY_LABELS: Record<string, string> = {
  BENEFICIARY: 'Bénéficiaire',
  PRODUCT: 'Produit',
  INBOUND_BATCH: 'Lot entrant',
  TRANSFORMATION_OPERATION: 'Transformation',
  PRODUCT_BATCH: 'Lot fini',
  MARKET_RELEASE_DECISION: 'Mise en marché',
  SUPPLY_CONTRACT: 'Contrat',
  INCIDENT: 'Incident',
  DISTRIBUTION: 'Distribution',
  USER: 'Utilisateur',
  COMPANY: 'Entreprise',
  MEMBERSHIP: 'Rattachement',
  SELLER_PROFILE: 'Profil vendeur',
  MARKETPLACE_PRODUCT: 'Produit marketplace',
  MARKETPLACE_OFFER: 'Offre marketplace',
  MARKETPLACE_REVIEW: 'Revue marketplace',
  MARKETPLACE_DOCUMENT: 'Document marketplace',
  MEDIA_ASSET: 'Média',
  QUOTE_REQUEST: 'Demande de devis',
};

const ACTION_VARIANT: Record<string, string> = {
  CREATED: 'bg-blue-100 text-blue-700',
  UPDATED: 'bg-yellow-100 text-yellow-700',
  DELETED: 'bg-red-100 text-red-700',
  STATUS_CHANGED: 'bg-purple-100 text-purple-700',
  UPLOADED: 'bg-green-100 text-green-700',
};

function getActionVariant(action: string) {
  const key = Object.keys(ACTION_VARIANT).find((k) => action.includes(k));
  return key ? ACTION_VARIANT[key] : 'bg-gray-100 text-gray-600';
}

const ALLOWED_ROLES = [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.AUDITOR];

export default function AuditLogsPage() {
  const { user } = useAuth();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  // Selected log for detail
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (search) params.set('action', search);
      if (entityType) params.set('entityType', entityType);
      if (entityId) params.set('entityId', entityId.trim());
      if (from) params.set('from', new Date(from).toISOString());
      if (to) params.set('to', new Date(to + 'T23:59:59').toISOString());

      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/traceability/audit-logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur lors du chargement des logs');
      const json = await res.json();
      setLogs(json.data?.data ?? json.data ?? []);
      setMeta(json.data?.meta ?? null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, search, entityType, entityId, from, to]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-500">
        Accès réservé aux administrateurs et auditeurs.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Journal d'audit</h1>
        <p className="text-sm text-gray-500 mt-1">
          {meta ? `${meta.total} entrée${meta.total > 1 ? 's' : ''} au total` : 'Chargement…'}
        </p>
      </div>

      {/* Filtres */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            fetchLogs();
          }}
          className="flex flex-wrap gap-3"
        >
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrer par action…"
              className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Toutes les entités</option>
            {Object.entries(ENTITY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            placeholder="ID entité (UUID)"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-mono w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Filtrer par identifiant exact de l'entité"
          />
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Depuis"
            title="Depuis"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Jusqu'au"
            title="Jusqu'au"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            <Filter className="h-4 w-4" /> Filtrer
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table */}
        <div className="lg:col-span-2 rounded-lg border border-gray-200 bg-white overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-sm text-gray-500">
              Chargement…
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-48 text-sm text-red-500">
              {error}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
              <Clock className="h-10 w-10" />
              <p className="text-sm">Aucune entrée d'audit</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Action</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Entité</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Acteur</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelected(log)}
                    className={`cursor-pointer transition-colors ${
                      selected?.id === log.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getActionVariant(log.action)}`}
                      >
                        {log.action.replace(/_/g, ' ').toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {ENTITY_LABELS[log.entityType] ?? log.entityType}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {log.user ? `${log.user.firstName} ${log.user.lastName}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <Eye className="h-3.5 w-3.5 text-gray-300" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Détail log sélectionné */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2 min-h-48">
              <Eye className="h-8 w-8" />
              <p className="text-sm text-center">Cliquer sur une entrée pour voir le détail</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getActionVariant(selected.action)}`}
                >
                  {selected.action}
                </span>
                <button
                  onClick={() => setSelected(null)}
                  className="text-gray-400 text-xs hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2 text-sm">
                <DetailRow label="Entité">
                  {ENTITY_LABELS[selected.entityType] ?? selected.entityType}
                </DetailRow>
                <DetailRow label="ID entité">
                  <button
                    type="button"
                    onClick={() => {
                      setEntityId(selected.entityId);
                      setPage(1);
                    }}
                    className="font-mono text-xs text-blue-600 hover:text-blue-800 hover:underline text-right"
                    title="Filtrer sur cet identifiant"
                  >
                    {selected.entityId}
                  </button>
                </DetailRow>
                <DetailRow label="Acteur">
                  {selected.user
                    ? `${selected.user.firstName} ${selected.user.lastName} (${selected.user.role})`
                    : '—'}
                </DetailRow>
                <DetailRow label="Date">
                  {new Date(selected.createdAt).toLocaleString('fr-FR')}
                </DetailRow>
              </div>

              {selected.previousData && Object.keys(selected.previousData).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Avant
                  </p>
                  <pre className="rounded-lg bg-red-50 border border-red-100 p-3 text-xs text-red-800 overflow-auto max-h-32">
                    {JSON.stringify(selected.previousData, null, 2)}
                  </pre>
                </div>
              )}

              {selected.newData && Object.keys(selected.newData).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Après
                  </p>
                  <pre className="rounded-lg bg-green-50 border border-green-100 p-3 text-xs text-green-800 overflow-auto max-h-32">
                    {JSON.stringify(selected.newData, null, 2)}
                  </pre>
                </div>
              )}

              {selected.notes && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Notes
                  </p>
                  <p className="text-sm text-gray-700">{selected.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {meta && (
        <PaginationControls
          page={meta.page}
          totalPages={meta.totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-gray-500 flex-shrink-0">{label}</span>
      <span className="text-gray-900 text-right">{children}</span>
    </div>
  );
}
