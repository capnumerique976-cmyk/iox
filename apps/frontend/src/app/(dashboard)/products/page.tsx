'use client';

import { toast } from 'sonner';
import { notifyError } from '@/lib/notify';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search, Package, Filter, Download } from 'lucide-react';
import { ProductStatus, UserRole } from '@iox/shared';
import { StatusBadge, PRODUCT_STATUS_CONFIG } from '@/components/ui/status-badge';
import { PageHeader } from '@/components/ui/page-header';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { useAuth } from '@/contexts/auth.context';
import { authStorage } from '@/lib/auth';

interface Product {
  id: string;
  code: string;
  name: string;
  commercialName?: string;
  category: string;
  status: ProductStatus;
  version: number;
  beneficiary: { id: string; code: string; name: string };
  _count: { productBatches: number; documents: number };
  createdAt: string;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const CAN_CREATE = [
  UserRole.ADMIN,
  UserRole.COORDINATOR,
  UserRole.BENEFICIARY_MANAGER,
  UserRole.QUALITY_MANAGER,
];
const STATUS_OPTIONS = Object.values(ProductStatus);

export default function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [statusFilter, setStatusFilter] = useState<ProductStatus | ''>(
    (searchParams.get('status') as ProductStatus) ?? '',
  );
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') ?? '');
  const [page, setPage] = useState(Number(searchParams.get('page') ?? 1));

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (categoryFilter) params.set('category', categoryFilter);

      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/products?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur lors du chargement des produits');
      const json = await res.json();
      setProducts(json.data.data);
      setMeta(json.data.meta);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, categoryFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const canCreate = user && CAN_CREATE.includes(user.role);

  const downloadCsv = async () => {
    try {
      const token = authStorage.getAccessToken();
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (categoryFilter) params.set('category', categoryFilter);
      const res = await fetch(`/api/v1/exports/products?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `produits-${new Date().toISOString().slice(0, 10)}.csv`;
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
        title="Produits"
        subtitle={
          meta ? `${meta.total} produit${meta.total > 1 ? 's' : ''} au total` : 'Chargement…'
        }
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
                href="/products/new"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-iox-primary px-4 py-2 text-sm font-medium text-white shadow-premium-sm transition-all duration-base ease-premium hover:shadow-premium-md"
              >
                <Plus className="h-4 w-4" /> Nouveau produit
              </Link>
            )}
          </>
        }
      />

      {/* Filters */}
      <div className="rounded-xl border border-gray-200/70 bg-white p-3 shadow-premium-sm sm:p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, code, catégorie…"
              className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as ProductStatus | '');
              setPage(1);
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tous les statuts</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {PRODUCT_STATUS_CONFIG[s]?.label ?? s}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            placeholder="Filtrer par catégorie"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            <Filter className="h-4 w-4" />
            Filtrer
          </button>
        </form>
      </div>

      {/* Table */}
      {loading ? (
        <div className="rounded-xl border border-gray-200/70 bg-white p-12 text-center text-sm text-gray-500 shadow-premium-sm">
          Chargement…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 shadow-premium-sm">
          {error}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-gray-200/70 bg-white p-12 text-center shadow-premium-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
            <Package className="h-6 w-6 text-gray-400" aria-hidden />
          </div>
          <p className="text-sm font-semibold text-gray-900">Aucun produit trouvé</p>
        </div>
      ) : (
        <div className="iox-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Nom</th>
                <th>Catégorie</th>
                <th>Bénéficiaire</th>
                <th>Statut</th>
                <th>Version</th>
                <th>Lots</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/products/${p.id}`)}
                  className="cursor-pointer"
                >
                  <td className="px-4 py-3 font-mono text-blue-600 font-medium">{p.code}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{p.name}</div>
                    {p.commercialName && (
                      <div className="text-xs text-gray-400">{p.commercialName}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{p.category}</td>
                  <td className="px-4 py-3">
                    <span className="text-gray-900">{p.beneficiary.name}</span>
                    <span className="ml-1 text-xs text-gray-400">({p.beneficiary.code})</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} type="product" />
                  </td>
                  <td className="px-4 py-3 text-gray-500">v{p.version}</td>
                  <td className="px-4 py-3 text-gray-500">{p._count.productBatches}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {meta && (
        <PaginationControls
          page={meta.page}
          totalPages={meta.totalPages}
          onPageChange={setPage}
          label={
            <>
              Page {meta.page} sur {meta.totalPages} — {meta.total} résultat
              {meta.total > 1 ? 's' : ''}
            </>
          }
        />
      )}
    </div>
  );
}
