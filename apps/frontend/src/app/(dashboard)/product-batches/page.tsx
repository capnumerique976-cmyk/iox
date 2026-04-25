'use client';

import { toast } from 'sonner';
import { notifyError } from '@/lib/notify';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search, Package, Filter, Download } from 'lucide-react';
import { UserRole } from '@iox/shared';
import { StatusBadge } from '@/components/ui/status-badge';
import { PageHeader } from '@/components/ui/page-header';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { useAuth } from '@/contexts/auth.context';
import { authStorage } from '@/lib/auth';

interface ProductBatch {
  id: string;
  code: string;
  status: string;
  quantity: number;
  unit: string;
  productionDate: string;
  expiryDate?: string;
  product: { id: string; code: string; name: string };
  transformationOp?: { id: string; code: string } | null;
  _count: { labelValidations: number; marketReleaseDecisions: number; documents: number };
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

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'CREATED', label: 'Créé' },
  { value: 'READY_FOR_VALIDATION', label: 'Prêt à valider' },
  { value: 'AVAILABLE', label: 'Disponible' },
  { value: 'RESERVED', label: 'Réservé' },
  { value: 'SHIPPED', label: 'Expédié' },
  { value: 'BLOCKED', label: 'Bloqué' },
  { value: 'DESTROYED', label: 'Détruit' },
];

export default function ProductBatchesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [page, setPage] = useState(Number(searchParams.get('page') ?? 1));

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/product-batches?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur lors du chargement');
      const json = await res.json();
      setBatches(json.data.data);
      setMeta(json.data.meta);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);
  const canCreate = user && CAN_CREATE.includes(user.role);

  const downloadCsv = async () => {
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/exports/product-batches?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur export');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lots-finis-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      notifyError(err, 'Action impossible, réessayez.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Package className="h-5 w-5" aria-hidden />}
        title="Lots finis"
        subtitle={meta ? `${meta.total} lot${meta.total > 1 ? 's' : ''} au total` : 'Chargement…'}
        actions={
          <>
            <button
              onClick={downloadCsv}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-premium-sm transition-all duration-base ease-premium hover:border-premium-accent/40 hover:bg-premium-accent/5 hover:text-premium-accent"
            >
              <Download className="h-4 w-4" /> Exporter CSV
            </button>
            {canCreate && (
              <Link
                href="/product-batches/new"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-iox-primary px-4 py-2 text-sm font-medium text-white shadow-premium-sm transition-all duration-base ease-premium hover:shadow-premium-md"
              >
                <Plus className="h-4 w-4" /> Nouveau lot fini
              </Link>
            )}
          </>
        }
      />

      <div className="rounded-xl border border-gray-200/70 bg-white p-3 shadow-premium-sm sm:p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            fetchBatches();
          }}
          className="flex flex-wrap gap-2 sm:gap-3"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par code, produit…"
              className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
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

      {loading ? (
        <div className="rounded-xl border border-gray-200/70 bg-white p-12 text-center text-sm text-gray-500 shadow-premium-sm">
          Chargement…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 shadow-premium-sm">
          {error}
        </div>
      ) : batches.length === 0 ? (
        <div className="rounded-xl border border-gray-200/70 bg-white p-12 text-center shadow-premium-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
            <Package className="h-6 w-6 text-gray-400" aria-hidden />
          </div>
          <p className="text-sm font-semibold text-gray-900">Aucun lot fini trouvé</p>
        </div>
      ) : (
        <div className="iox-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Produit</th>
                <th>Statut</th>
                <th>Quantité</th>
                <th>Production</th>
                <th>DLC</th>
                <th>Opération TO</th>
                <th>Docs</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr
                  key={b.id}
                  onClick={() => router.push(`/product-batches/${b.id}`)}
                  className="cursor-pointer"
                >
                  <td className="px-4 py-3 font-mono text-blue-600 font-medium">{b.code}</td>
                  <td className="px-4 py-3 text-gray-900">{b.product.name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={b.status} type="batch" />
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {b.quantity} {b.unit}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(b.productionDate).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-500 text-xs">
                    {b.transformationOp?.code ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{b._count.documents}</td>
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
        />
      )}
    </div>
  );
}
