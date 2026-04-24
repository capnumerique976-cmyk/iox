'use client';

import { toast } from 'sonner';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search, AlertTriangle, Filter, Download } from 'lucide-react';
import { IncidentStatus, IncidentSeverity, UserRole } from '@iox/shared';
import { useAuth } from '@/contexts/auth.context';
import { authStorage } from '@/lib/auth';

/* ------------------------------------------------------------------ */
/*  Types & constantes                                                  */
/* ------------------------------------------------------------------ */

interface Incident {
  id: string;
  code: string;
  title: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  incidentDate: string;
  resolvedAt?: string;
  linkedEntityType?: string;
  linkedEntityId?: string;
  createdAt: string;
  _count: { documents: number };
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const SEVERITY_CLS: Record<IncidentSeverity, string> = {
  [IncidentSeverity.MINOR]: 'bg-yellow-100 text-yellow-700',
  [IncidentSeverity.MAJOR]: 'bg-orange-100 text-orange-700',
  [IncidentSeverity.CRITICAL]: 'bg-red-100 text-red-700',
};
const SEVERITY_LABEL: Record<IncidentSeverity, string> = {
  [IncidentSeverity.MINOR]: 'Mineur',
  [IncidentSeverity.MAJOR]: 'Majeur',
  [IncidentSeverity.CRITICAL]: 'Critique',
};

const STATUS_CLS: Record<IncidentStatus, string> = {
  [IncidentStatus.OPEN]: 'bg-red-100 text-red-700',
  [IncidentStatus.ANALYZING]: 'bg-orange-100 text-orange-700',
  [IncidentStatus.ACTION_IN_PROGRESS]: 'bg-yellow-100 text-yellow-700',
  [IncidentStatus.CONTROLLED]: 'bg-blue-100 text-blue-700',
  [IncidentStatus.CLOSED]: 'bg-gray-100 text-gray-500',
};
const STATUS_LABEL: Record<IncidentStatus, string> = {
  [IncidentStatus.OPEN]: 'Ouvert',
  [IncidentStatus.ANALYZING]: 'En analyse',
  [IncidentStatus.ACTION_IN_PROGRESS]: 'Action en cours',
  [IncidentStatus.CONTROLLED]: 'Maîtrisé',
  [IncidentStatus.CLOSED]: 'Clôturé',
};

const CAN_CREATE = [
  UserRole.ADMIN,
  UserRole.COORDINATOR,
  UserRole.QUALITY_MANAGER,
  UserRole.SUPPLY_MANAGER,
];

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function IncidentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [severity, setSeverity] = useState(searchParams.get('severity') ?? '');
  const [page, setPage] = useState(Number(searchParams.get('page') ?? 1));

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (severity) params.set('severity', severity);

      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/incidents?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur de chargement');
      const json = await res.json();
      setIncidents(json.data?.data ?? json.data ?? []);
      setMeta(json.data?.meta ?? null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, search, status, severity]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const downloadCsv = async () => {
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (severity) params.set('severity', severity);
      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/exports/incidents?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur export');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `incidents-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Action impossible, réessayez.');
    }
  };

  const canCreate = user && CAN_CREATE.includes(user.role);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incidents & Non-conformités</h1>
          <p className="text-sm text-gray-500 mt-1">
            {meta ? `${meta.total} incident${meta.total > 1 ? 's' : ''} au total` : 'Chargement…'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadCsv}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" /> Exporter CSV
          </button>
          {canCreate && (
            <Link
              href="/incidents/new"
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              <Plus className="h-4 w-4" /> Déclarer un incident
            </Link>
          )}
        </div>
      </div>

      {/* Filtres */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            fetchIncidents();
          }}
          className="flex flex-wrap gap-3"
        >
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher code, titre…"
              className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">Tous les statuts</option>
            {Object.values(IncidentStatus).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <select
            value={severity}
            onChange={(e) => {
              setSeverity(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">Toutes sévérités</option>
            {Object.values(IncidentSeverity).map((s) => (
              <option key={s} value={s}>
                {SEVERITY_LABEL[s]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            <Filter className="h-4 w-4" /> Filtrer
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-sm text-gray-500">
            Chargement…
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-48 text-sm text-red-500">{error}</div>
        ) : incidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
            <AlertTriangle className="h-10 w-10" />
            <p className="text-sm">Aucun incident trouvé</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Code</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Titre</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Sévérité</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Statut</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Date incident</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Docs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {incidents.map((inc) => (
                <tr
                  key={inc.id}
                  onClick={() => router.push(`/incidents/${inc.id}`)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-red-600 font-medium">{inc.code}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 line-clamp-1">{inc.title}</p>
                    {inc.linkedEntityType && (
                      <p className="text-xs text-gray-400">
                        {inc.linkedEntityType} · {inc.linkedEntityId}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_CLS[inc.severity]}`}
                    >
                      {SEVERITY_LABEL[inc.severity]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLS[inc.status]}`}
                    >
                      {STATUS_LABEL[inc.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(inc.incidentDate).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs text-center">
                    {inc._count.documents > 0 ? inc._count.documents : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Page {meta.page} sur {meta.totalPages} — {meta.total} résultat
            {meta.total > 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={meta.page <= 1}
              className="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40"
            >
              Précédent
            </button>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={meta.page >= meta.totalPages}
              className="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
