'use client';

import { toast } from 'sonner';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, Wrench, Filter, Download } from 'lucide-react';
import { UserRole } from '@iox/shared';
import { useAuth } from '@/contexts/auth.context';
import { authStorage } from '@/lib/auth';
import { PageHeader } from '@/components/ui/page-header';
import { PaginationControls } from '@/components/ui/pagination-controls';

interface TransformationOp {
  id: string;
  code: string;
  name: string;
  operationDate: string;
  site?: string;
  yieldRate?: number;
  inboundBatch: {
    id: string;
    code: string;
    product: { id: string; code: string; name: string };
    supplier: { id: string; name: string };
  };
  _count: { productBatches: number };
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
const CAN_CREATE = [
  UserRole.ADMIN,
  UserRole.COORDINATOR,
  UserRole.QUALITY_MANAGER,
  UserRole.BENEFICIARY_MANAGER,
];

export default function TransformationOperationsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [ops, setOps] = useState<TransformationOp[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchOps = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/transformation-operations?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur lors du chargement');
      const json = await res.json();
      setOps(json.data.data);
      setMeta(json.data.meta);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchOps();
  }, [fetchOps]);
  const canCreate = user && CAN_CREATE.includes(user.role);

  const downloadCsv = async () => {
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch('/api/v1/exports/transformation-operations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transformations-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Action impossible, réessayez.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Wrench className="h-5 w-5" aria-hidden />}
        title="Opérations de transformation"
        subtitle={
          meta ? `${meta.total} opération${meta.total > 1 ? 's' : ''} au total` : 'Chargement…'
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
                href="/transformation-operations/new"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-iox-primary px-4 py-2 text-sm font-medium text-white shadow-premium-sm transition-all duration-fast ease-premium hover:shadow-premium-md active-press"
              >
                <Plus className="h-4 w-4" aria-hidden /> Nouvelle opération
              </Link>
            )}
          </>
        }
      />

      <div className="rounded-xl border border-gray-200/70 bg-white p-4 shadow-premium-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            fetchOps();
          }}
          className="flex flex-wrap gap-3"
        >
          <div className="relative min-w-48 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par code, nom, site…"
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm shadow-premium-sm transition-all duration-fast ease-premium focus:border-premium-accent/40 focus:outline-none focus:ring-2 focus:ring-premium-accent/30"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-premium-sm transition-all duration-fast ease-premium hover:border-premium-accent/40 hover:bg-premium-accent/5 hover:text-premium-accent"
          >
            <Filter className="h-4 w-4" aria-hidden /> Filtrer
          </button>
        </form>
      </div>

      {loading ? (
        <div className="rounded-xl border border-gray-200/70 bg-white py-16 text-center text-sm text-gray-400 shadow-premium-sm">
          Chargement…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 py-16 text-center text-sm text-red-600 shadow-premium-sm">
          {error}
        </div>
      ) : ops.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200/70 bg-white py-16 text-gray-400 shadow-premium-sm">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-premium-accent/10 text-premium-accent">
            <Wrench className="h-6 w-6" aria-hidden />
          </div>
          <p className="text-sm">Aucune opération de transformation</p>
        </div>
      ) : (
        <div className="iox-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Nom</th>
                <th>Produit</th>
                <th>Lot entrant</th>
                <th>Taux</th>
                <th>Site</th>
                <th>Date</th>
                <th>Lots finis</th>
              </tr>
            </thead>
            <tbody>
              {ops.map((op) => (
                <tr
                  key={op.id}
                  onClick={() => router.push(`/transformation-operations/${op.id}`)}
                  className="cursor-pointer"
                >
                  <td className="px-4 py-3 font-mono font-medium text-premium-accent">{op.code}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{op.name}</td>
                  <td className="px-4 py-3 text-gray-600">{op.inboundBatch.product.name}</td>
                  <td className="px-4 py-3 font-mono text-gray-500">{op.inboundBatch.code}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {op.yieldRate != null ? `${op.yieldRate} %` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{op.site ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(op.operationDate).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{op._count.productBatches}</td>
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
          label={`Page ${meta.page} sur ${meta.totalPages}`}
        />
      )}
    </div>
  );
}
