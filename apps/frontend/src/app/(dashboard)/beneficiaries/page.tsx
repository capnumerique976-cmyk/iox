'use client';

import { toast } from 'sonner';
import { notifyError } from '@/lib/notify';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth.context';
import { authStorage } from '@/lib/auth';
import { StatusBadge, BENEFICIARY_STATUS_CONFIG } from '@/components/ui/status-badge';
import { PageHeader } from '@/components/ui/page-header';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Download, Users } from 'lucide-react';
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
    } catch (err) {
      notifyError(err, 'Action impossible, réessayez.');
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
    } catch (err) {
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
      <PageHeader
        icon={<Users className="h-5 w-5" aria-hidden />}
        title="Bénéficiaires"
        subtitle={`${result?.meta.total ?? '—'} bénéficiaires enregistrés`}
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
                href="/beneficiaries/new"
                className="inline-flex items-center rounded-lg bg-gradient-iox-primary px-4 py-2 text-sm font-medium text-white shadow-premium-sm transition-all duration-base ease-premium hover:shadow-premium-md"
              >
                + Nouveau bénéficiaire
              </Link>
            )}
          </>
        }
      />

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 sm:gap-3">
        <input
          type="text"
          placeholder="Rechercher (nom, code, ville, filière)..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="min-w-0 flex-1 basis-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-premium-sm transition-colors duration-fast ease-premium focus:border-premium-accent focus:outline-none focus:ring-2 focus:ring-premium-accent/40 sm:basis-48"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-premium-sm transition-colors duration-fast ease-premium focus:border-premium-accent focus:outline-none focus:ring-2 focus:ring-premium-accent/40"
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
      <div className="iox-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Bénéficiaire</th>
              <th>Statut</th>
              <th>Maturité</th>
              <th>Référent</th>
              <th>Produits / Actions</th>
            </tr>
          </thead>
          <tbody>
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
          <div className="px-4 py-3 border-t border-gray-200">
            <PaginationControls
              page={result.meta.page}
              totalPages={result.meta.totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
