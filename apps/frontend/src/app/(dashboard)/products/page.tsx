'use client';

import { toast } from 'sonner';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search, Package, Filter, Download } from 'lucide-react';
import { ProductStatus, UserRole } from '@iox/shared';
import { StatusBadge, PRODUCT_STATUS_CONFIG } from '@/components/ui/status-badge';
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
    } catch {
      toast.error('Action impossible, réessayez.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produits</h1>
          <p className="text-sm text-gray-500 mt-1">
            {meta ? `${meta.total} produit${meta.total > 1 ? 's' : ''} au total` : 'Chargement…'}
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
              href="/products/new"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Nouveau produit
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
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
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-sm text-gray-500">
            Chargement…
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-48 text-sm text-red-500">{error}</div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
            <Package className="h-10 w-10" />
            <p className="text-sm">Aucun produit trouvé</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Code</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Nom</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Catégorie</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Bénéficiaire</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Statut</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Version</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Lots</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/products/${p.id}`)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
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
