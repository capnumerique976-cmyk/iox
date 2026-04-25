'use client';

import { toast } from 'sonner';
import { notifyError } from '@/lib/notify';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search, AlertTriangle, Filter, Download } from 'lucide-react';
import { IncidentStatus, IncidentSeverity, UserRole } from '@iox/shared';
import { useAuth } from '@/contexts/auth.context';
import { authStorage } from '@/lib/auth';
import { PageHeader } from '@/components/ui/page-header';
import { PaginationControls } from '@/components/ui/pagination-controls';

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
      if (!res.ok) throw new Error('Chargement des incidents impossible — vérifiez votre connexion et réessayez.');
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
    } catch (err) {
      notifyError(err, 'Action impossible, réessayez.');
    }
  };

  const canCreate = user && CAN_CREATE.includes(user.role);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<AlertTriangle className="h-5 w-5" aria-hidden />}
        title="Incidents & Non-conformités"
        subtitle={
          meta ? `${meta.total} incident${meta.total > 1 ? 's' : ''} au total` : 'Chargement…'
        }
        actions={
          <>
            <button
              onClick={downloadCsv}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-premium-sm transition-all duration-fast ease-premium hover:border-premium-accent/40 hover:bg-premium-accent/5 hover:text-premium-accent"
            >
              <Download className="h-4 w-4" aria-hidden /> Exporter CSV
            </button>
            {canCreate && (
              <Link
                href="/incidents/new"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-iox-primary px-4 py-2 text-sm font-medium text-white shadow-premium-sm transition-all duration-fast ease-premium hover:shadow-premium-md active-press"
              >
                <Plus className="h-4 w-4" aria-hidden /> Déclarer un incident
              </Link>
            )}
          </>
        }
      />

      {/* Filtres */}
      <div className="rounded-xl border border-gray-200/70 bg-white p-4 shadow-premium-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            fetchIncidents();
          }}
          className="flex flex-wrap gap-3"
        >
          <div className="relative min-w-48 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher code, titre…"
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm shadow-premium-sm transition-all duration-fast ease-premium focus:border-premium-accent/40 focus:outline-none focus:ring-2 focus:ring-premium-accent/30"
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-premium-sm transition-all duration-fast ease-premium focus:border-premium-accent/40 focus:outline-none focus:ring-2 focus:ring-premium-accent/30"
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
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-premium-sm transition-all duration-fast ease-premium focus:border-premium-accent/40 focus:outline-none focus:ring-2 focus:ring-premium-accent/30"
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
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-premium-sm transition-all duration-fast ease-premium hover:border-premium-accent/40 hover:bg-premium-accent/5 hover:text-premium-accent"
          >
            <Filter className="h-4 w-4" aria-hidden /> Filtrer
          </button>
        </form>
      </div>

      {/* Table */}
      {loading ? (
        <div className="rounded-xl border border-gray-200/70 bg-white py-16 text-center text-sm text-gray-400 shadow-premium-sm">
          Chargement…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 py-16 text-center text-sm text-red-600 shadow-premium-sm">
          {error}
        </div>
      ) : incidents.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200/70 bg-white py-16 text-gray-400 shadow-premium-sm">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-premium-accent/10 text-premium-accent">
            <AlertTriangle className="h-6 w-6" aria-hidden />
          </div>
          <p className="text-sm">Aucun incident trouvé</p>
        </div>
      ) : (
        <div className="iox-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Titre</th>
                <th>Sévérité</th>
                <th>Statut</th>
                <th>Date incident</th>
                <th>Docs</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc) => (
                <tr
                  key={inc.id}
                  onClick={() => router.push(`/incidents/${inc.id}`)}
                  className="cursor-pointer"
                >
                  <td className="px-4 py-3 font-mono font-medium text-premium-accent">{inc.code}</td>
                  <td className="px-4 py-3">
                    <p className="line-clamp-1 font-medium text-gray-900">{inc.title}</p>
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
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(inc.incidentDate).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-400">
                    {inc._count.documents > 0 ? inc._count.documents : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && (
        <PaginationControls
          page={meta.page}
          totalPages={meta.totalPages}
          onPageChange={setPage}
          label={`Page ${meta.page} sur ${meta.totalPages} — ${meta.total} résultat${meta.total > 1 ? 's' : ''}`}
        />
      )}
    </div>
  );
}
