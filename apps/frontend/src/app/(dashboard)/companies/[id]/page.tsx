'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  Edit2,
  Mail,
  Phone,
  Globe,
  MapPin,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { CompanyType, UserRole } from '@iox/shared';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAuth } from '@/contexts/auth.context';
import { authStorage } from '@/lib/auth';
import { DocumentsPanel } from '@/components/documents/documents-panel';

const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
  [CompanyType.SUPPLIER]: 'Fournisseur',
  [CompanyType.COOPERATIVE]: 'Coopérative',
  [CompanyType.BUYER]: 'Acheteur',
  [CompanyType.PARTNER]: 'Partenaire',
  [CompanyType.INSTITUTIONAL]: 'Institutionnel',
};

interface CompanyDetail {
  id: string;
  code: string;
  name: string;
  types: CompanyType[];
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  vatNumber?: string;
  website?: string;
  notes?: string;
  isActive: boolean;
  supplyContracts: {
    id: string;
    code: string;
    status: string;
    startDate: string;
    endDate?: string;
  }[];
  documents: { id: string; title: string; status: string }[];
  _count: { supplyContracts: number; inboundBatches: number; documents: number };
  createdAt: string;
  updatedAt: string;
}

const CAN_EDIT = [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.SUPPLY_MANAGER];
type Tab = 'info' | 'contracts' | 'documents';

export default function CompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('info');

  const fetchCompany = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/companies/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok)
        throw new Error(res.status === 404 ? 'Entreprise introuvable' : 'Erreur serveur — réessayez dans quelques instants');
      const json = await res.json();
      setCompany(json.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchCompany();
  }, [fetchCompany]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-500">Chargement…</div>
    );
  if (error || !company)
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertTriangle className="h-8 w-8 text-red-400" />
        <p className="text-sm text-red-600">{error ?? 'Entreprise introuvable'}</p>
        <button onClick={() => router.back()} className="text-sm text-blue-600 hover:underline">
          Retour
        </button>
      </div>
    );

  const canEdit = user && CAN_EDIT.includes(user.role);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <nav className="flex items-center gap-1 text-sm text-gray-500 mb-3">
          <Link href="/companies" className="hover:text-blue-600 flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Entreprises
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-mono text-gray-700">{company.code}</span>
        </nav>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-blue-500 p-3">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {company.types.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                  >
                    {COMPANY_TYPE_LABELS[t]}
                  </span>
                ))}
                <span
                  className={`text-xs font-medium ${company.isActive ? 'text-green-600' : 'text-gray-400'}`}
                >
                  · {company.isActive ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </div>
          </div>
          {canEdit && (
            <Link
              href={`/companies/${company.id}/edit`}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Edit2 className="h-4 w-4" /> Modifier
            </Link>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Contrats actifs', value: company._count.supplyContracts },
          { label: 'Lots reçus', value: company._count.inboundBatches },
          { label: 'Documents', value: company._count.documents },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-0 -mb-px">
          {(
            [
              { key: 'info', label: 'Informations' },
              { key: 'contracts', label: `Contrats (${company._count.supplyContracts})` },
              { key: 'documents', label: `Documents (${company._count.documents})` },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        {activeTab === 'info' && (
          <div className="grid grid-cols-2 gap-6">
            <CField label="Code" value={company.code} mono />
            <CField label="Nom" value={company.name} />
            {company.email && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Email
                </p>
                <a
                  href={`mailto:${company.email}`}
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                >
                  <Mail className="h-4 w-4" />
                  {company.email}
                </a>
              </div>
            )}
            {company.phone && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Téléphone
                </p>
                <a
                  href={`tel:${company.phone}`}
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                >
                  <Phone className="h-4 w-4" />
                  {company.phone}
                </a>
              </div>
            )}
            {company.website && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Site web
                </p>
                <a
                  href={company.website}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                >
                  <Globe className="h-4 w-4" />
                  {company.website}
                </a>
              </div>
            )}
            {(company.address || company.city) && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Adresse
                </p>
                <p className="flex items-start gap-1.5 text-sm text-gray-900">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-400" />
                  <span>
                    {[company.address, company.city, company.country].filter(Boolean).join(', ')}
                  </span>
                </p>
              </div>
            )}
            <CField label="N° TVA / SIRET" value={company.vatNumber} />
            {company.notes && <CField label="Notes" value={company.notes} wide />}
          </div>
        )}

        {activeTab === 'contracts' &&
          (company.supplyContracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400 gap-2">
              <FileText className="h-8 w-8" />
              <p className="text-sm">Aucun contrat pour cette entreprise</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-2 text-left font-medium text-gray-500">Code</th>
                  <th className="pb-2 text-left font-medium text-gray-500">Statut</th>
                  <th className="pb-2 text-left font-medium text-gray-500">Début</th>
                  <th className="pb-2 text-left font-medium text-gray-500">Fin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {company.supplyContracts.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/supply-contracts/${c.id}`)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="py-3 font-mono text-blue-600">{c.code}</td>
                    <td className="py-3">
                      <StatusBadge status={c.status} type="supplyContract" />
                    </td>
                    <td className="py-3 text-gray-600">
                      {new Date(c.startDate).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3 text-gray-600">
                      {c.endDate ? new Date(c.endDate).toLocaleDateString('fr-FR') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
      </div>

      {activeTab === 'documents' && (
        <DocumentsPanel linkedEntityType="COMPANY" linkedEntityId={company.id} />
      )}
    </div>
  );
}

function CField({
  label,
  value,
  mono = false,
  wide = false,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  wide?: boolean;
}) {
  if (!value) return null;
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-sm text-gray-900 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
