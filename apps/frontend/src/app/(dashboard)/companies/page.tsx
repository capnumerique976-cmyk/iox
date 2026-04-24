'use client';

import { toast } from 'sonner';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, Building2, Filter, CheckCircle, XCircle, Download } from 'lucide-react';
import { CompanyType, UserRole } from '@iox/shared';
import { useAuth } from '@/contexts/auth.context';
import { authStorage } from '@/lib/auth';

interface Company {
  id: string;
  code: string;
  name: string;
  types: CompanyType[];
  email?: string;
  phone?: string;
  city?: string;
  country?: string;
  isActive: boolean;
  _count: { supplyContracts: number; inboundBatches: number; documents: number };
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const CAN_CREATE = [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.SUPPLY_MANAGER];

const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
  [CompanyType.SUPPLIER]: 'Fournisseur',
  [CompanyType.COOPERATIVE]: 'Coopérative',
  [CompanyType.BUYER]: 'Acheteur',
  [CompanyType.PARTNER]: 'Partenaire',
  [CompanyType.INSTITUTIONAL]: 'Institutionnel',
};

const TYPE_OPTIONS = Object.values(CompanyType);

export default function CompaniesPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<CompanyType | ''>('');
  const [page, setPage] = useState(1);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (typeFilter) params.set('type', typeFilter);

      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/companies?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur lors du chargement des entreprises');
      const json = await res.json();
      setCompanies(json.data.data);
      setMeta(json.data.meta);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const canCreate = user && CAN_CREATE.includes(user.role);

  const downloadCsv = async () => {
    try {
      const token = authStorage.getAccessToken();
      const params = new URLSearchParams();
      if (typeFilter) params.set('type', typeFilter);
      const res = await fetch(`/api/v1/exports/companies?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `entreprises-${new Date().toISOString().slice(0, 10)}.csv`;
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
          <h1 className="text-2xl font-bold text-gray-900">Entreprises partenaires</h1>
          <p className="text-sm text-gray-500 mt-1">
            {meta ? `${meta.total} entreprise${meta.total > 1 ? 's' : ''} au total` : 'Chargement…'}
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
              href="/companies/new"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Nouvelle entreprise
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
            fetchCompanies();
          }}
          className="flex flex-wrap gap-3"
        >
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, code, ville…"
              className="w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as CompanyType | '');
              setPage(1);
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tous les types</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {COMPANY_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
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
        ) : companies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
            <Building2 className="h-10 w-10" />
            <p className="text-sm">Aucune entreprise trouvée</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Code</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Nom</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Types</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Localisation</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Contrats</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {companies.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/companies/${c.id}`)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-blue-600 font-medium">{c.code}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{c.name}</div>
                    {c.email && <div className="text-xs text-gray-400">{c.email}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.types.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs text-blue-700"
                        >
                          {COMPANY_TYPE_LABELS[t]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {[c.city, c.country].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{c._count.supplyContracts}</td>
                  <td className="px-4 py-3">
                    {c.isActive ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700">
                        <CheckCircle className="h-3.5 w-3.5" /> Actif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <XCircle className="h-3.5 w-3.5" /> Inactif
                      </span>
                    )}
                  </td>
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
