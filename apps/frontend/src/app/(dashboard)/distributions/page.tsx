'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, Download, Truck, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { DistributionStatus, UserRole } from '@iox/shared';
import { useAuth } from '@/contexts/auth.context';
import { authStorage } from '@/lib/auth';

/* ── Config statuts ──────────────────────────────────────────────────── */
const STATUS_CLS: Record<DistributionStatus, string> = {
  [DistributionStatus.PLANNED]: 'bg-blue-100 text-blue-700',
  [DistributionStatus.IN_PROGRESS]: 'bg-yellow-100 text-yellow-700',
  [DistributionStatus.COMPLETED]: 'bg-green-100 text-green-700',
  [DistributionStatus.CANCELLED]: 'bg-red-100 text-red-500',
};
const STATUS_LABEL: Record<DistributionStatus, string> = {
  [DistributionStatus.PLANNED]: 'Planifiée',
  [DistributionStatus.IN_PROGRESS]: 'En cours',
  [DistributionStatus.COMPLETED]: 'Complétée',
  [DistributionStatus.CANCELLED]: 'Annulée',
};

const CAN_WRITE = [
  UserRole.ADMIN,
  UserRole.COORDINATOR,
  UserRole.LOGISTICS_MANAGER,
  UserRole.BENEFICIARY_MANAGER,
];

interface Distribution {
  id: string;
  code: string;
  status: DistributionStatus;
  distributionDate: string;
  beneficiary: { id: string; code: string; name: string };
  _count: { lines: number };
}

export default function DistributionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const canWrite = user && CAN_WRITE.includes(user.role);

  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [page, setPage] = useState(Number(searchParams.get('page') ?? 1));

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = authStorage.getAccessToken();
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      const res = await fetch(`/api/v1/distributions?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setDistributions(json.data?.data ?? json.data ?? []);
      setTotal(json.data?.meta?.total ?? json.data?.total ?? 0);
    } catch (err) {
      toast.error('Impossible de charger les distributions', {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const downloadCsv = async () => {
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch('/api/v1/exports/distributions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        toast.error('Export CSV indisponible');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `distributions-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export CSV généré');
    } catch (err) {
      toast.error("Erreur lors de l'export", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Distributions</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Suivi des remises de lots finis aux bénéficiaires
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadCsv}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" /> Exporter CSV
          </button>
          {canWrite && (
            <Link
              href="/distributions/new"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Nouvelle distribution
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Code, bénéficiaire…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tous les statuts</option>
          {Object.values(DistributionStatus).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.values(DistributionStatus).map((s) => {
          const count = distributions.filter((d) => d.status === s).length;
          return (
            <button
              key={s}
              onClick={() => {
                setStatus(status === s ? '' : s);
                setPage(1);
              }}
              className={`rounded-lg border-2 p-3 text-left transition-colors ${
                status === s
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <p className="text-xs text-gray-500 mb-1">{STATUS_LABEL[s]}</p>
              <p className="text-xl font-bold text-gray-900">{count}</p>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">Chargement…</div>
        ) : distributions.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
            <Truck className="h-10 w-10" />
            <p className="text-sm">Aucune distribution trouvée</p>
            {canWrite && (
              <Link
                href="/distributions/new"
                className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" /> Créer la première distribution
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Code</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Bénéficiaire</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Statut</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Lots</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {distributions.map((d) => (
                <tr
                  key={d.id}
                  onClick={() => router.push(`/distributions/${d.id}`)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-4 py-3 font-mono text-blue-600 font-medium">{d.code}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{d.beneficiary.name}</span>
                    <span className="ml-1.5 text-xs text-gray-400 font-mono">
                      {d.beneficiary.code}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLS[d.status]}`}
                    >
                      {STATUS_LABEL[d.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(d.distributionDate).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {d._count.lines} lot{d._count.lines > 1 ? 's' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            {total} distribution{total > 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40"
            >
              ← Préc.
            </button>
            <button
              disabled={page * 20 >= total}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40"
            >
              Suiv. →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
