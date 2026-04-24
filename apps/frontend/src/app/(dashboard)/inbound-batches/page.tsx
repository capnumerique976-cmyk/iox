'use client';

import { toast } from 'sonner';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, Layers, Filter, Download } from 'lucide-react';
import { InboundBatchStatus, UserRole } from '@iox/shared';
import { StatusBadge, INBOUND_BATCH_STATUS_CONFIG } from '@/components/ui/status-badge';
import { useAuth } from '@/contexts/auth.context';
import { authStorage } from '@/lib/auth';

interface InboundBatch {
  id: string;
  code: string;
  status: InboundBatchStatus;
  receivedAt: string;
  quantity: number;
  unit: string;
  origin?: string;
  supplier: { id: string; code: string; name: string };
  product: { id: string; code: string; name: string };
  _count: { transformationOperations: number; documents: number };
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
  UserRole.SUPPLY_MANAGER,
  UserRole.LOGISTICS_MANAGER,
];
const STATUS_OPTIONS = Object.values(InboundBatchStatus);

export default function InboundBatchesPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [batches, setBatches] = useState<InboundBatch[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InboundBatchStatus | ''>('');
  const [page, setPage] = useState(1);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/inbound-batches?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur lors du chargement des lots');
      const json = await res.json();
      setBatches(json.data.data);
      setMeta(json.data.meta);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const canCreate = user && CAN_CREATE.includes(user.role);

  const downloadCsv = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/exports/inbound-batches?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur export');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lots-entrants-${new Date().toISOString().slice(0, 10)}.csv`;
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
          <h1 className="text-2xl font-bold text-gray-900">Lots entrants</h1>
          <p className="text-sm text-gray-500 mt-1">
            {meta ? `${meta.total} lot${meta.total > 1 ? 's' : ''} au total` : 'Chargement…'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadCsv}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" /> Exporter CSV
          </button>
          {canCreate && (
            <Link
              href="/inbound-batches/new"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Nouvelle réception
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
            fetchBatches();
          }}
          className="flex flex-wrap gap-3"
        >
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par code, produit, origine…"
              className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as InboundBatchStatus | '');
              setPage(1);
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tous les statuts</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {INBOUND_BATCH_STATUS_CONFIG[s]?.label ?? s}
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
        ) : batches.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
            <Layers className="h-10 w-10" />
            <p className="text-sm">Aucun lot entrant trouvé</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Code</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Produit</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Fournisseur</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Statut</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Quantité</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Origine</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Reçu le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {batches.map((b) => (
                <tr
                  key={b.id}
                  onClick={() => router.push(`/inbound-batches/${b.id}`)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-blue-600 font-medium">{b.code}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{b.product.name}</div>
                    <div className="text-xs text-gray-400">{b.product.code}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{b.supplier.name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={b.status} type="inboundBatch" />
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-medium">
                    {b.quantity} {b.unit}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{b.origin ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(b.receivedAt).toLocaleDateString('fr-FR')}
                  </td>
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
