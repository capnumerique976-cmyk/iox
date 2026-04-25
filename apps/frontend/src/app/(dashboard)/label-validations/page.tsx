'use client';

import { toast } from 'sonner';
import { notifyError } from '@/lib/notify';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Tag, Search, Filter, CheckCircle2, XCircle, Eye, Download, Plus } from 'lucide-react';
import { authStorage } from '@/lib/auth';
import { useAuth } from '@/contexts/auth.context';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { UserRole } from '@iox/shared';

const CAN_CREATE: UserRole[] = [
  UserRole.ADMIN,
  UserRole.COORDINATOR,
  UserRole.QUALITY_MANAGER,
  UserRole.BENEFICIARY_MANAGER,
];

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface LabelValidation {
  id: string;
  isValid: boolean;
  notes?: string | null;
  reservations: string[];
  validatedAt?: string | null;
  createdAt: string;
  productBatch?: {
    id: string;
    code: string;
    status: string;
    product?: { id: string; name: string } | null;
  } | null;
  validatedBy?: { id: string; firstName: string; lastName: string } | null;
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/* ------------------------------------------------------------------ */
/*  Constantes                                                          */
/* ------------------------------------------------------------------ */

const BATCH_STATUS_CLS: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-700',
  SHIPPED: 'bg-blue-100 text-blue-700',
  BLOCKED: 'bg-red-100 text-red-700',
  READY_FOR_VALIDATION: 'bg-yellow-100 text-yellow-700',
  CREATED: 'bg-gray-100 text-gray-600',
  RESERVED: 'bg-purple-100 text-purple-700',
  DESTROYED: 'bg-red-50 text-red-400',
};

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function LabelValidationsPage() {
  const { user } = useAuth();
  const canCreate = user ? CAN_CREATE.includes(user.role) : false;

  const [validations, setValidations] = useState<LabelValidation[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [isValid, setIsValid] = useState(''); // '' | 'true' | 'false'
  const [page, setPage] = useState(1);

  /* stats locales */
  const [stats, setStats] = useState<{ total: number; valid: number; invalid: number } | null>(
    null,
  );

  const fetchStats = useCallback(async () => {
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch('/api/v1/label-validations?limit=1', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const j = await res.json();
      const total = j.data?.meta?.total ?? 0;

      const [rv, ri] = await Promise.all([
        fetch('/api/v1/label-validations?limit=1&isValid=true', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/v1/label-validations?limit=1&isValid=false', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const valid = rv.ok ? ((await rv.json()).data?.meta?.total ?? 0) : 0;
      const invalid = ri.ok ? ((await ri.json()).data?.meta?.total ?? 0) : 0;
      setStats({ total, valid, invalid });
    } catch (err) {
      notifyError(err, 'Action impossible, réessayez.');
    }
  }, []);

  const fetchValidations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (isValid !== '') params.set('isValid', isValid);

      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/label-validations?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Chargement des validations label impossible — réessayez dans un instant.');
      const json = await res.json();
      setValidations(json.data?.data ?? json.data ?? []);
      setMeta(json.data?.meta ?? null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, isValid]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);
  useEffect(() => {
    fetchValidations();
  }, [fetchValidations]);

  const downloadCsv = async () => {
    try {
      const token = authStorage.getAccessToken();
      const params = new URLSearchParams();
      if (isValid !== '') params.set('isValid', isValid);
      const res = await fetch(`/api/v1/exports/label-validations?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `validations-etiquetage-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      notifyError(err, 'Action impossible, réessayez.');
    }
  };

  /* Filtre local par code lot / produit */
  const filtered = search.trim()
    ? validations.filter(
        (v) =>
          v.productBatch?.code.toLowerCase().includes(search.toLowerCase()) ||
          v.productBatch?.product?.name.toLowerCase().includes(search.toLowerCase()),
      )
    : validations;

  const passRate = stats && stats.total > 0 ? Math.round((stats.valid / stats.total) * 100) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Validations d'étiquetage</h1>
          <p className="text-sm text-gray-500 mt-1">
            {meta ? `${meta.total} validation${meta.total > 1 ? 's' : ''} au total` : 'Chargement…'}
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
              href="/label-validations/new"
              className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              <Plus className="h-4 w-4" /> Nouvelle validation
            </Link>
          )}
        </div>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-3">
            <div className="rounded-lg p-2.5 bg-gray-100">
              <Tag className="h-5 w-5 text-gray-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
            <div className="rounded-lg p-2.5 bg-green-100">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-green-600">Conformes</p>
              <p className="text-2xl font-bold text-green-700">{stats.valid}</p>
              {passRate !== null && (
                <p className="text-xs text-green-600">{passRate}% de réussite</p>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center gap-3">
            <div className="rounded-lg p-2.5 bg-red-100">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-red-500">Non conformes</p>
              <p className="text-2xl font-bold text-red-600">{stats.invalid}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrer par code lot ou produit…"
              className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            {[
              { val: '', label: 'Toutes' },
              { val: 'true', label: '✓ Conformes' },
              { val: 'false', label: '✗ Non conformes' },
            ].map(({ val, label }) => (
              <button
                key={val}
                onClick={() => {
                  setIsValid(val);
                  setPage(1);
                }}
                className={`px-4 py-2 font-medium transition-colors ${
                  isValid === val ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              setSearch('');
              setIsValid('');
              setPage(1);
            }}
            className="inline-flex items-center gap-2 rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            <Filter className="h-4 w-4" /> Réinitialiser
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-sm text-gray-500">
            Chargement…
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-48 text-sm text-red-500">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
            <Tag className="h-10 w-10" />
            <p className="text-sm">Aucune validation trouvée</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 w-10">Résultat</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Lot fini</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Produit</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Statut lot</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Validé par</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Réserves</th>
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                  {/* Résultat */}
                  <td className="px-4 py-3 text-center">
                    {v.isValid ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                    )}
                  </td>

                  {/* Lot fini */}
                  <td className="px-4 py-3">
                    {v.productBatch ? (
                      <Link
                        href={`/product-batches/${v.productBatch.id}`}
                        className="font-mono text-purple-600 hover:underline font-medium"
                      >
                        {v.productBatch.code}
                      </Link>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>

                  {/* Produit */}
                  <td className="px-4 py-3 text-gray-700">
                    {v.productBatch?.product?.name ?? <span className="text-gray-400">—</span>}
                  </td>

                  {/* Statut lot */}
                  <td className="px-4 py-3">
                    {v.productBatch?.status && (
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${BATCH_STATUS_CLS[v.productBatch.status] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {v.productBatch.status.replace(/_/g, ' ')}
                      </span>
                    )}
                  </td>

                  {/* Validé par */}
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {v.validatedBy ? (
                      `${v.validatedBy.firstName} ${v.validatedBy.lastName}`
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {new Date(v.validatedAt ?? v.createdAt).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>

                  {/* Réserves */}
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-48">
                    {v.reservations?.length > 0 ? (
                      <span className="line-clamp-1 text-orange-600">
                        {v.reservations.join(', ')}
                      </span>
                    ) : v.notes ? (
                      <span className="line-clamp-1 text-gray-400">{v.notes}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>

                  {/* Lien lot */}
                  <td className="px-4 py-3 text-right">
                    {v.productBatch && (
                      <Link
                        href={`/product-batches/${v.productBatch.id}`}
                        className="text-gray-300 hover:text-gray-500 transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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

      {/* Tip */}
      <p className="text-xs text-gray-400">
        Les validations s'ajoutent depuis la fiche d'un lot fini (onglet Étiquetage). Cette page
        offre une vue transversale de toutes les validations.
      </p>
    </div>
  );
}
