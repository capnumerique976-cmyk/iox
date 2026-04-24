'use client';

import { toast } from 'sonner';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ShieldCheck, ShieldAlert, ShieldX, Filter, Search, Download, Plus } from 'lucide-react';
import { MarketReleaseDecision, UserRole } from '@iox/shared';
import { authStorage } from '@/lib/auth';
import { useAuth } from '@/contexts/auth.context';

const CAN_CREATE: UserRole[] = [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.QUALITY_MANAGER];

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface Decision {
  id: string;
  decision: MarketReleaseDecision;
  isActive: boolean;
  decidedAt?: string;
  notes?: string;
  blockingReason?: string;
  reservations: string[];
  createdAt: string;
  productBatch?: {
    id: string;
    code: string;
    status: string;
    product?: { id: string; name: string } | null;
  } | null;
  validatedBy?: { id: string; firstName: string; lastName: string } | null;
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/* ------------------------------------------------------------------ */
/*  Config                                                              */
/* ------------------------------------------------------------------ */

const DECISION_CONFIG: Record<
  MarketReleaseDecision,
  {
    label: string;
    badgeCls: string;
    rowCls: string;
    Icon: React.ComponentType<{ className?: string }>;
  }
> = {
  [MarketReleaseDecision.COMPLIANT]: {
    label: 'Conforme',
    badgeCls: 'bg-green-100 text-green-700 border-green-200',
    rowCls: 'border-l-2 border-green-400',
    Icon: ShieldCheck,
  },
  [MarketReleaseDecision.COMPLIANT_WITH_RESERVATIONS]: {
    label: 'Conforme avec réserves',
    badgeCls: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    rowCls: 'border-l-2 border-yellow-400',
    Icon: ShieldAlert,
  },
  [MarketReleaseDecision.NON_COMPLIANT]: {
    label: 'Non conforme',
    badgeCls: 'bg-red-100 text-red-700 border-red-200',
    rowCls: 'border-l-2 border-red-400',
    Icon: ShieldX,
  },
};

const DECISION_OPTIONS = Object.values(MarketReleaseDecision);

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function MarketReleaseDecisionsPage() {
  const { user } = useAuth();
  const canCreate = user ? CAN_CREATE.includes(user.role) : false;

  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [decisionFilter, setDecisionFilter] = useState<MarketReleaseDecision | ''>('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [page, setPage] = useState(1);

  /* KPIs */
  const [kpis, setKpis] = useState<{
    total: number;
    compliant: number;
    withReserves: number;
    nonCompliant: number;
    active: number;
  } | null>(null);

  const fetchDecisions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (decisionFilter) params.set('decision', decisionFilter);

      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/market-release-decisions?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur de chargement');
      const json = await res.json();
      setDecisions(json.data?.data ?? json.data ?? []);
      setMeta(json.data?.meta ?? null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, decisionFilter]);

  const fetchKpis = useCallback(async () => {
    try {
      const token = authStorage.getAccessToken();
      const [rAll, rC, rCR, rNC, rActive] = await Promise.all([
        fetch('/api/v1/market-release-decisions?limit=1', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/v1/market-release-decisions?limit=1&decision=COMPLIANT', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/v1/market-release-decisions?limit=1&decision=COMPLIANT_WITH_RESERVATIONS', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/v1/market-release-decisions?limit=1&decision=NON_COMPLIANT', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/v1/market-release-decisions?limit=1&isActive=true', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const [jAll, jC, jCR, jNC, jActive] = await Promise.all(
        [rAll, rC, rCR, rNC, rActive].map((r) => r.json()),
      );
      setKpis({
        total: jAll.data?.meta?.total ?? 0,
        compliant: jC.data?.meta?.total ?? 0,
        withReserves: jCR.data?.meta?.total ?? 0,
        nonCompliant: jNC.data?.meta?.total ?? 0,
        active: jActive.data?.meta?.total ?? 0,
      });
    } catch {
      toast.error('Action impossible, réessayez.');
    }
  }, []);

  useEffect(() => {
    fetchDecisions();
  }, [fetchDecisions]);
  useEffect(() => {
    fetchKpis();
  }, [fetchKpis]);

  /* Filtre local (recherche par code lot / produit) */
  const filtered = search.trim()
    ? decisions.filter(
        (d) =>
          d.productBatch?.code.toLowerCase().includes(search.toLowerCase()) ||
          d.productBatch?.product?.name.toLowerCase().includes(search.toLowerCase()),
      )
    : decisions;

  const displayed = activeOnly ? filtered.filter((d) => d.isActive) : filtered;

  /* Export CSV */
  const downloadCsv = async () => {
    try {
      const token = authStorage.getAccessToken();
      const params = new URLSearchParams();
      if (decisionFilter) params.set('decision', decisionFilter);
      const res = await fetch(`/api/v1/exports/market-decisions?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `decisions-marche-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Action impossible, réessayez.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Décisions de mise en marché</h1>
          <p className="text-sm text-gray-500 mt-1">
            {meta ? `${meta.total} décision${meta.total > 1 ? 's' : ''} au total` : 'Chargement…'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadCsv}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" /> Exporter CSV
          </button>
          {canCreate && (
            <Link
              href="/market-release-decisions/new"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Nouvelle décision
            </Link>
          )}
        </div>
      </div>

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              <span className="text-xs text-green-600 font-medium">Conformes</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{kpis.compliant}</p>
          </div>
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="h-4 w-4 text-yellow-600" />
              <span className="text-xs text-yellow-700 font-medium">Avec réserves</span>
            </div>
            <p className="text-2xl font-bold text-yellow-700">{kpis.withReserves}</p>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2 mb-1">
              <ShieldX className="h-4 w-4 text-red-500" />
              <span className="text-xs text-red-600 font-medium">Non conformes</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{kpis.nonCompliant}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-500 font-medium">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-700">{kpis.total}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {kpis.active} active{kpis.active > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrer par code lot ou produit…"
              className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={decisionFilter}
            onChange={(e) => {
              setDecisionFilter(e.target.value as MarketReleaseDecision | '');
              setPage(1);
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Toutes les décisions</option>
            {DECISION_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {DECISION_CONFIG[d].label}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 select-none">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="rounded"
            />
            Décisions actives uniquement
          </label>
          <button
            onClick={() => {
              setDecisionFilter('');
              setSearch('');
              setActiveOnly(false);
              setPage(1);
            }}
            className="inline-flex items-center gap-2 rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            <Filter className="h-4 w-4" /> Réinitialiser
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-sm text-gray-500">
            Chargement…
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-48 text-sm text-red-500">{error}</div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
            <ShieldCheck className="h-10 w-10" />
            <p className="text-sm">Aucune décision trouvée</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 w-10">Décision</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Lot fini</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Produit</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Statut lot</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Active</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Validé par</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Détail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayed.map((d) => {
                const cfg = DECISION_CONFIG[d.decision];
                const { Icon } = cfg;
                return (
                  <tr key={d.id} className={`hover:bg-gray-50 transition-colors ${cfg.rowCls}`}>
                    {/* Décision */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.badgeCls}`}
                      >
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                    </td>

                    {/* Lot fini */}
                    <td className="px-4 py-3">
                      {d.productBatch ? (
                        <Link
                          href={`/product-batches/${d.productBatch.id}`}
                          className="font-mono text-blue-600 hover:underline font-medium"
                        >
                          {d.productBatch.code}
                        </Link>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Produit */}
                    <td className="px-4 py-3 text-gray-700 max-w-40 truncate">
                      {d.productBatch?.product?.name ?? <span className="text-gray-400">—</span>}
                    </td>

                    {/* Statut lot */}
                    <td className="px-4 py-3">
                      {d.productBatch?.status && (
                        <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          {d.productBatch.status.replace(/_/g, ' ')}
                        </span>
                      )}
                    </td>

                    {/* Active */}
                    <td className="px-4 py-3">
                      {d.isActive ? (
                        <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                          Oui
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>

                    {/* Validé par */}
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {d.validatedBy ? (
                        `${d.validatedBy.firstName} ${d.validatedBy.lastName}`
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(d.decidedAt ?? d.createdAt).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    {/* Détail */}
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-48">
                      {d.decision === MarketReleaseDecision.NON_COMPLIANT && d.blockingReason ? (
                        <span className="text-red-600 line-clamp-1">{d.blockingReason}</span>
                      ) : d.reservations?.length > 0 ? (
                        <span className="text-yellow-700 line-clamp-1">
                          {d.reservations.join(', ')}
                        </span>
                      ) : d.notes ? (
                        <span className="text-gray-400 line-clamp-1">{d.notes}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
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

      {/* Tip */}
      <p className="text-xs text-gray-400">
        Les décisions de mise en marché se créent depuis la fiche d'un lot fini (onglet Mise en
        marché). Cette page offre une vue transversale de toutes les décisions.
      </p>
    </div>
  );
}
