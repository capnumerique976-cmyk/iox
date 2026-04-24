'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  ChevronRight,
  Edit2,
  AlertTriangle,
  Package,
  Layers,
} from 'lucide-react';
import { DocumentsPanel } from '@/components/documents/documents-panel';
import { SupplyContractStatus, UserRole, SUPPLY_CONTRACT_STATUS_TRANSITIONS } from '@iox/shared';
import { StatusBadge, SUPPLY_CONTRACT_STATUS_CONFIG } from '@/components/ui/status-badge';
import { useAuth } from '@/contexts/auth.context';
import { authStorage } from '@/lib/auth';

interface ContractDetail {
  id: string;
  code: string;
  status: SupplyContractStatus;
  startDate: string;
  endDate?: string;
  volumeCommitted?: number;
  unit?: string;
  paymentTerms?: string;
  notes?: string;
  supplier: { id: string; code: string; name: string; types: string[] };
  products: { id: string; code: string; name: string; status: string }[];
  inboundBatches: {
    id: string;
    code: string;
    status: string;
    receivedAt: string;
    quantity: number;
    unit: string;
  }[];
  documents: { id: string; title: string; status: string }[];
  _count: { inboundBatches: number; documents: number };
  createdAt: string;
  updatedAt: string;
}

const CAN_EDIT = [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.SUPPLY_MANAGER];
const CAN_CHANGE_STATUS = [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.SUPPLY_MANAGER];

type Tab = 'info' | 'batches' | 'products' | 'docs';

export default function ContractDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('info');

  const [statusModal, setStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<SupplyContractStatus | ''>('');
  const [statusReason, setStatusReason] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const fetchContract = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/supply-contracts/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(res.status === 404 ? 'Contrat introuvable' : 'Erreur serveur — réessayez dans quelques instants');
      const json = await res.json();
      setContract(json.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchContract();
  }, [fetchContract]);

  const handleChangeStatus = async () => {
    if (!newStatus || !contract) return;
    setStatusLoading(true);
    setStatusError(null);
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/supply-contracts/${contract.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reason: statusReason || undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Transition invalide');
      }
      setStatusModal(false);
      setNewStatus('');
      setStatusReason('');
      fetchContract();
    } catch (err) {
      setStatusError((err as Error).message);
    } finally {
      setStatusLoading(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-500">Chargement…</div>
    );
  if (error || !contract)
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertTriangle className="h-8 w-8 text-red-400" />
        <p className="text-sm text-red-600">{error ?? 'Contrat introuvable'}</p>
        <button onClick={() => router.back()} className="text-sm text-blue-600 hover:underline">
          Retour
        </button>
      </div>
    );

  const canEdit = user && CAN_EDIT.includes(user.role);
  const canChangeStatus = user && CAN_CHANGE_STATUS.includes(user.role);
  const allowedTransitions = SUPPLY_CONTRACT_STATUS_TRANSITIONS[contract.status] ?? [];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <nav className="flex items-center gap-1 text-sm text-gray-500 mb-3">
          <Link href="/supply-contracts" className="flex items-center gap-1 hover:text-premium-accent">
            <ArrowLeft className="h-3.5 w-3.5" /> Contrats
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-mono text-gray-700">{contract.code}</span>
        </nav>

        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-gradient-iox-primary p-3 shadow-premium-sm">
              <FileText className="h-6 w-6 text-white" aria-hidden />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">{contract.code}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-3">
                <StatusBadge status={contract.status} type="supplyContract" />
                <span className="text-sm text-gray-500">· {contract.supplier.name}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canChangeStatus && allowedTransitions.length > 0 && (
              <button
                onClick={() => setStatusModal(true)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-premium-sm transition-all duration-fast ease-premium hover:border-premium-accent/40 hover:bg-premium-accent/5 hover:text-premium-accent"
              >
                Changer le statut
              </button>
            )}
            {canEdit && (
              <Link
                href={`/supply-contracts/${contract.id}/edit`}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-iox-primary px-4 py-2 text-sm font-medium text-white shadow-premium-sm transition-all duration-fast ease-premium hover:shadow-premium-md active-press"
              >
                <Edit2 className="h-4 w-4" aria-hidden /> Modifier
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Lots entrants', value: contract._count.inboundBatches },
          { label: 'Produits couverts', value: contract.products.length },
          { label: 'Documents', value: contract._count.documents },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-gray-200/70 bg-white p-4 shadow-premium-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex overflow-x-auto">
          {(
            [
              { key: 'info', label: 'Informations' },
              { key: 'batches', label: `Lots reçus (${contract._count.inboundBatches})` },
              { key: 'products', label: `Produits (${contract.products.length})` },
              { key: 'docs', label: `Documents (${contract._count.documents})` },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors duration-fast ease-premium ${
                activeTab === key
                  ? 'border-premium-accent text-premium-accent'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'docs' && (
        <DocumentsPanel linkedEntityType="SUPPLY_CONTRACT" linkedEntityId={contract.id} />
      )}
      <div
        className={`rounded-xl border border-gray-200/70 bg-white p-6 shadow-premium-sm ${activeTab === 'docs' ? 'hidden' : ''}`}
      >
        {activeTab === 'info' && (
          <div className="grid grid-cols-2 gap-6">
            <CField label="Code contrat" value={contract.code} mono />
            <CField
              label="Fournisseur"
              value={`${contract.supplier.name} (${contract.supplier.code})`}
            />
            <CField
              label="Date de début"
              value={new Date(contract.startDate).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            />
            <CField
              label="Date de fin"
              value={
                contract.endDate
                  ? new Date(contract.endDate).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })
                  : undefined
              }
            />
            <CField
              label="Volume engagé"
              value={
                contract.volumeCommitted
                  ? `${contract.volumeCommitted} ${contract.unit ?? ''}`
                  : undefined
              }
            />
            <CField label="Conditions de paiement" value={contract.paymentTerms} />
            {contract.notes && <CField label="Notes" value={contract.notes} wide />}
          </div>
        )}

        {activeTab === 'batches' &&
          (contract.inboundBatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400 gap-2">
              <Layers className="h-8 w-8" />
              <p className="text-sm">Aucun lot reçu sur ce contrat</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-2 text-left font-medium text-gray-500">Code</th>
                  <th className="pb-2 text-left font-medium text-gray-500">Statut</th>
                  <th className="pb-2 text-left font-medium text-gray-500">Quantité</th>
                  <th className="pb-2 text-left font-medium text-gray-500">Reçu le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {contract.inboundBatches.map((b) => (
                  <tr
                    key={b.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/inbound-batches/${b.id}`)}
                  >
                    <td className="py-3 font-mono text-premium-accent">{b.code}</td>
                    <td className="py-3">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-600">
                      {b.quantity} {b.unit}
                    </td>
                    <td className="py-3 text-gray-600">
                      {new Date(b.receivedAt).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}

        {activeTab === 'products' &&
          (contract.products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400 gap-2">
              <Package className="h-8 w-8" />
              <p className="text-sm">Aucun produit associé à ce contrat</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-2 text-left font-medium text-gray-500">Code</th>
                  <th className="pb-2 text-left font-medium text-gray-500">Nom</th>
                  <th className="pb-2 text-left font-medium text-gray-500">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {contract.products.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/products/${p.id}`)}
                  >
                    <td className="py-3 font-mono text-premium-accent">{p.code}</td>
                    <td className="py-3 text-gray-900">{p.name}</td>
                    <td className="py-3">
                      <StatusBadge status={p.status} type="product" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
      </div>

      {/* Status modal */}
      {statusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Changer le statut</h2>
            <p className="text-sm text-gray-500">
              Statut actuel : <StatusBadge status={contract.status} type="supplyContract" />
            </p>
            <div className="grid gap-2">
              {allowedTransitions.map((s) => {
                const c = SUPPLY_CONTRACT_STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    onClick={() => setNewStatus(s)}
                    className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-left text-sm transition-colors duration-fast ease-premium ${
                      newStatus === s
                        ? 'border-premium-accent/60 bg-premium-accent/5'
                        : 'border-gray-200 hover:border-premium-accent/30'
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${c?.dot ?? 'bg-gray-400'}`} />
                    <span className="font-medium text-gray-900">{c?.label ?? s}</span>
                  </button>
                );
              })}
            </div>
            <textarea
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              rows={2}
              placeholder="Motif du changement (optionnel)…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {statusError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{statusError}</p>
            )}
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => {
                  setStatusModal(false);
                  setNewStatus('');
                  setStatusReason('');
                  setStatusError(null);
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleChangeStatus}
                disabled={!newStatus || statusLoading}
                className="rounded-lg bg-gradient-iox-primary px-4 py-2 text-sm font-medium text-white shadow-premium-sm transition-all duration-fast ease-premium hover:shadow-premium-md active-press disabled:opacity-50"
              >
                {statusLoading ? 'Enregistrement…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
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
