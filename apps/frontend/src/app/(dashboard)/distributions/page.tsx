'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, Download, Truck, Search } from 'lucide-react';
import { toast } from 'sonner';
import { notifyError } from '@/lib/notify';
import { DistributionStatus, UserRole } from '@iox/shared';
import { useAuth } from '@/contexts/auth.context';
import { authStorage } from '@/lib/auth';
import { PageHeader } from '@/components/ui/page-header';
import { PaginationControls } from '@/components/ui/pagination-controls';

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
      notifyError(err, 'Impossible de charger les distributions');
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
        notifyError(new Error(`HTTP ${res.status}`), 'Export CSV indisponible');
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
      notifyError(err, "Erreur lors de l'export");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Truck className="h-5 w-5" aria-hidden />}
        title="Distributions"
        subtitle="Suivi des remises de lots finis aux bénéficiaires"
        actions={
          <>
            <button
              onClick={downloadCsv}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-premium-sm transition-all duration-fast ease-premium hover:border-premium-accent/40 hover:bg-premium-accent/5 hover:text-premium-accent"
            >
              <Download className="h-4 w-4" aria-hidden /> Exporter CSV
            </button>
            {canWrite && (
              <Link
                href="/distributions/new"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-iox-primary px-4 py-2 text-sm font-medium text-white shadow-premium-sm transition-all duration-fast ease-premium hover:shadow-premium-md active-press"
              >
                <Plus className="h-4 w-4" aria-hidden /> Nouvelle distribution
              </Link>
            )}
          </>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            type="text"
            placeholder="Code, bénéficiaire…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
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
          {Object.values(DistributionStatus).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Object.values(DistributionStatus).map((s) => {
          const count = distributions.filter((d) => d.status === s).length;
          const active = status === s;
          return (
            <button
              key={s}
              onClick={() => {
                setStatus(active ? '' : s);
                setPage(1);
              }}
              className={`rounded-xl border p-3 text-left shadow-premium-sm transition-all duration-fast ease-premium ${
                active
                  ? 'border-premium-accent/60 bg-premium-accent/5'
                  : 'border-gray-200/70 bg-white hover:border-premium-accent/30 hover:shadow-premium-md'
              }`}
            >
              <p className="mb-1 text-xs text-gray-500">{STATUS_LABEL[s]}</p>
              <p className="text-xl font-bold text-gray-900 tabular-nums">{count}</p>
            </button>
          );
        })}
      </div>

      {/* Table */}
      {loading ? (
        <div className="rounded-xl border border-gray-200/70 bg-white py-16 text-center text-sm text-gray-400 shadow-premium-sm">
          Chargement…
        </div>
      ) : distributions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200/70 bg-white py-16 text-gray-400 shadow-premium-sm">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-premium-accent/10 text-premium-accent">
            <Truck className="h-6 w-6" aria-hidden />
          </div>
          <p className="text-sm">Aucune distribution trouvée</p>
          {canWrite && (
            <Link
              href="/distributions/new"
              className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-gradient-iox-primary px-4 py-2 text-sm font-medium text-white shadow-premium-sm transition-all duration-fast ease-premium hover:shadow-premium-md active-press"
            >
              <Plus className="h-4 w-4" aria-hidden /> Créer la première distribution
            </Link>
          )}
        </div>
      ) : (
        <div className="iox-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Bénéficiaire</th>
                <th>Statut</th>
                <th>Date</th>
                <th>Lots</th>
              </tr>
            </thead>
            <tbody>
              {distributions.map((d) => (
                <tr
                  key={d.id}
                  onClick={() => router.push(`/distributions/${d.id}`)}
                  className="cursor-pointer"
                >
                  <td className="px-4 py-3 font-mono font-medium text-premium-accent">{d.code}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{d.beneficiary.name}</span>
                    <span className="ml-1.5 font-mono text-xs text-gray-400">
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
        </div>
      )}

      <PaginationControls
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        label={`${total} distribution${total > 1 ? 's' : ''}`}
      />
    </div>
  );
}
