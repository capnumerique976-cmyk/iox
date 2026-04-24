'use client';

import { toast } from 'sonner';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, FileText, Filter, Download } from 'lucide-react';
import { SupplyContractStatus, UserRole } from '@iox/shared';
import { StatusBadge, SUPPLY_CONTRACT_STATUS_CONFIG } from '@/components/ui/status-badge';
import { useAuth } from '@/contexts/auth.context';
import { authStorage } from '@/lib/auth';

interface SupplyContract {
  id: string;
  code: string;
  status: SupplyContractStatus;
  startDate: string;
  endDate?: string;
  volumeCommitted?: number;
  unit?: string;
  supplier: { id: string; code: string; name: string };
  _count: { inboundBatches: number; documents: number };
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const CAN_CREATE = [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.SUPPLY_MANAGER];
const STATUS_OPTIONS = Object.values(SupplyContractStatus);

export default function SupplyContractsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [contracts, setContracts] = useState<SupplyContract[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SupplyContractStatus | ''>('');
  const [page, setPage] = useState(1);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/supply-contracts?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur lors du chargement des contrats');
      const json = await res.json();
      setContracts(json.data.data);
      setMeta(json.data.meta);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const canCreate = user && CAN_CREATE.includes(user.role);

  const downloadCsv = async () => {
    try {
      const token = authStorage.getAccessToken();
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/v1/exports/supply-contracts?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contrats-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Action impossible, réessayez.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contrats d'approvisionnement</h1>
          <p className="text-sm text-gray-500 mt-1">
            {meta ? `${meta.total} contrat${meta.total > 1 ? 's' : ''} au total` : 'Chargement…'}
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
              href="/supply-contracts/new"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Nouveau contrat
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            fetchContracts();
          }}
          className="flex flex-wrap gap-3"
        >
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par code ou fournisseur…"
              className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as SupplyContractStatus | '');
              setPage(1);
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tous les statuts</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {SUPPLY_CONTRACT_STATUS_CONFIG[s]?.label ?? s}
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
        ) : contracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
            <FileText className="h-10 w-10" />
            <p className="text-sm">Aucun contrat trouvé</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Code</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Fournisseur</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Statut</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Début</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Fin</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Volume engagé</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Lots reçus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contracts.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/supply-contracts/${c.id}`)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-blue-600 font-medium">{c.code}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{c.supplier.name}</div>
                    <div className="text-xs text-gray-400">{c.supplier.code}</div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} type="supplyContract" />
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(c.startDate).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.endDate ? new Date(c.endDate).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {c.volumeCommitted ? `${c.volumeCommitted} ${c.unit ?? ''}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{c._count.inboundBatches}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
