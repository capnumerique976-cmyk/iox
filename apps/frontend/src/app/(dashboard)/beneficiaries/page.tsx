'use client';

import { toast } from 'sonner';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth.context';
import { authStorage } from '@/lib/auth';
import { StatusBadge, BENEFICIARY_STATUS_CONFIG } from '@/components/ui/status-badge';
import { Download } from 'lucide-react';
import { UserRole } from '@iox/shared';

interface Beneficiary {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  sector: string | null;
  city: string | null;
  referent: { firstName: string; lastName: string } | null;
  diagnostic: { maturityLevel: string | null } | null;
  _count: { actions: number; products: number };
}

interface PageData {
  data: Beneficiary[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const MATURITY_LABEL: Record<string, string> = {
  LOW: 'Faible',
  MEDIUM: 'Moyen',
  HIGH: 'Fort',
};

export default function BeneficiariesPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [result, setResult] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canCreate =
    user &&
    [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.BENEFICIARY_MANAGER].includes(user.role);

  const downloadCsv = async () => {
    try {
      const token = authStorage.getAccessToken();
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/v1/exports/beneficiaries?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `beneficiaires-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Action impossible, réessayez.');
    }
  };

  const load = useCallback(async (p: number, s: string, status: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (s) params.set('search', s);
      if (status) params.set('status', status);
      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/beneficiaries?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setResult(json.data ?? json);
    } catch {
      setError('Impossible de charger les bénéficiaires');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page, search, statusFilter);
  }, [load, page, search, statusFilter]);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bénéficiaires</h1>
          <p className="text-sm text-gray-500 mt-1">
            {result?.meta.total ?? '—'} bénéficiaires enregistrés
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
              href="/beneficiaries/new"
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors"
            >
              + Nouveau bénéficiaire
            </Link>
          )}
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Rechercher (nom, code, ville, filière)..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="flex-1 min-w-48 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(BENEFICIARY_STATUS_CONFIG).map(([key, { label }]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>}

      {/* Tableau */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Bénéficiaire</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Maturité</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Référent</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Produits / Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                  Chargement...
                </td>
              </tr>
            ) : !result?.data.length ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                  Aucun bénéficiaire
                </td>
              </tr>
            ) : (
              result.data.map((b) => {
                const statusCfg = BENEFICIARY_STATUS_CONFIG[b.status];
                return (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{b.code}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/beneficiaries/${b.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600"
                      >
                        {b.name}
                      </Link>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {b.type}
                        {b.sector ? ` · ${b.sector}` : ''}
                        {b.city ? ` · ${b.city}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={statusCfg?.label ?? b.status}
                        variant={statusCfg?.variant ?? 'gray'}
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {b.diagnostic?.maturityLevel ? (
                        (MATURITY_LABEL[b.diagnostic.maturityLevel] ?? b.diagnostic.maturityLevel)
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {b.referent ? (
                        `${b.referent.firstName} ${b.referent.lastName}`
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      <span className="mr-2">
                        {b._count.products} produit{b._count.products !== 1 ? 's' : ''}
                      </span>
                      <span>
                        {b._count.actions} action{b._count.actions !== 1 ? 's' : ''}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {result && result.meta.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Page {result.meta.page} / {result.meta.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 text-xs border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50"
              >
                Précédent
              </button>
              <button
                disabled={page === result.meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 text-xs border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
