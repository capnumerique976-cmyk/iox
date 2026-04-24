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
import { PageHeader } from '@/components/ui/page-header';
import { PaginationControls } from '@/components/ui/pagination-controls';

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
      <PageHeader
        icon={<FileText className="h-5 w-5" aria-hidden />}
        title="Contrats d'approvisionnement"
        subtitle={
          meta ? `${meta.total} contrat${meta.total > 1 ? 's' : ''} au total` : 'Chargement…'
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
                href="/supply-contracts/new"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-iox-primary px-4 py-2 text-sm font-medium text-white shadow-premium-sm transition-all duration-fast ease-premium hover:shadow-premium-md active-press"
              >
                <Plus className="h-4 w-4" aria-hidden /> Nouveau contrat
              </Link>
            )}
          </>
        }
      />

      {/* Filters */}
      <div className="rounded-xl border border-gray-200/70 bg-white p-4 shadow-premium-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            fetchContracts();
          }}
          className="flex flex-wrap gap-3"
        >
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par code ou fournisseur…"
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm shadow-premium-sm transition-all duration-fast ease-premium focus:border-premium-accent/40 focus:outline-none focus:ring-2 focus:ring-premium-accent/30"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as SupplyContractStatus | '');
              setPage(1);
            }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-premium-sm transition-all duration-fast ease-premium focus:border-premium-accent/40 focus:outline-none focus:ring-2 focus:ring-premium-accent/30"
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
      ) : contracts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200/70 bg-white py-16 text-gray-400 shadow-premium-sm">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-premium-accent/10 text-premium-accent">
            <FileText className="h-6 w-6" aria-hidden />
          </div>
          <p className="text-sm">Aucun contrat trouvé</p>
        </div>
      ) : (
        <div className="iox-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Fournisseur</th>
                <th>Statut</th>
                <th>Début</th>
                <th>Fin</th>
                <th>Volume engagé</th>
                <th>Lots reçus</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/supply-contracts/${c.id}`)}
                  className="cursor-pointer"
                >
                  <td className="px-4 py-3 font-mono font-medium text-premium-accent">{c.code}</td>
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
