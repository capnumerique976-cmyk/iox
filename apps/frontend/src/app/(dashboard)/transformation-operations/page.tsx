'use client';

import { toast } from 'sonner';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, Wrench, Filter, Download } from 'lucide-react';
import { UserRole } from '@iox/shared';
import { useAuth } from '@/contexts/auth.context';
import { authStorage } from '@/lib/auth';

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Opérations de transformation</h1>
          <p className="text-sm text-gray-500 mt-1">
            {meta ? `${meta.total} opération${meta.total > 1 ? 's' : ''} au total` : 'Chargement…'}
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
              href="/transformation-operations/new"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Nouvelle opération
            </Link>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            fetchOps();
          }}
          className="flex gap-3"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par code, nom, site…"
              className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            <Filter className="h-4 w-4" /> Filtrer
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-sm text-gray-500">
            Chargement…
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-48 text-sm text-red-500">{error}</div>
        ) : ops.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
            <Wrench className="h-10 w-10" />
            <p className="text-sm">Aucune opération de transformation</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Code</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Nom</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Produit</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Lot entrant</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Taux</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Site</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Lots finis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ops.map((op) => (
                <tr
                  key={op.id}
                  onClick={() => router.push(`/transformation-operations/${op.id}`)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-blue-600 font-medium">{op.code}</td>
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
        )}
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Page {meta.page} sur {meta.totalPages}
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
