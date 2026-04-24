'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Layers,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ClipboardList,
  Wrench,
  FileText,
} from 'lucide-react';
import { DocumentsPanel } from '@/components/documents/documents-panel';
import { InboundBatchStatus, UserRole, INBOUND_BATCH_STATUS_TRANSITIONS } from '@iox/shared';
import { StatusBadge, INBOUND_BATCH_STATUS_CONFIG } from '@/components/ui/status-badge';
import { useAuth } from '@/contexts/auth.context';
import { authStorage } from '@/lib/auth';

interface BatchDetail {
  id: string;
  code: string;
  status: InboundBatchStatus;
  receivedAt: string;
  quantity: number;
  unit: string;
  origin?: string;
  notes?: string;
  controlNotes?: string;
  controlledAt?: string;
  supplier: { id: string; code: string; name: string };
  product: { id: string; code: string; name: string; status: string };
  supplyContract: { id: string; code: string; status: string } | null;
  transformationOperations: {
    id: string;
    code: string;
    name: string;
    operationDate: string;
    yieldRate?: number;
  }[];
  documents: { id: string; title: string; status: string }[];
  _count: { transformationOperations: number; documents: number };
  createdAt: string;
  updatedAt: string;
}

const CAN_CHANGE_STATUS = [
  UserRole.ADMIN,
  UserRole.COORDINATOR,
  UserRole.QUALITY_MANAGER,
  UserRole.SUPPLY_MANAGER,
];

type Tab = 'info' | 'control' | 'transforms' | 'docs';

export default function InboundBatchDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('info');

  const [statusModal, setStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<InboundBatchStatus | ''>('');
  const [controlNotes, setControlNotes] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const fetchBatch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/inbound-batches/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(res.status === 404 ? 'Lot introuvable' : 'Erreur serveur');
      const json = await res.json();
      setBatch(json.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchBatch();
  }, [fetchBatch]);

  const handleChangeStatus = async () => {
    if (!newStatus || !batch) return;
    setStatusLoading(true);
    setStatusError(null);
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/inbound-batches/${batch.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, controlNotes: controlNotes || undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Transition invalide');
      }
      setStatusModal(false);
      setNewStatus('');
      setControlNotes('');
      fetchBatch();
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
  if (error || !batch)
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertTriangle className="h-8 w-8 text-red-400" />
        <p className="text-sm text-red-600">{error ?? 'Lot introuvable'}</p>
        <button onClick={() => router.back()} className="text-sm text-blue-600 hover:underline">
          Retour
        </button>
      </div>
    );

  const canChangeStatus = user && CAN_CHANGE_STATUS.includes(user.role);
  const allowedTransitions = INBOUND_BATCH_STATUS_TRANSITIONS[batch.status] ?? [];
  const isTerminal = allowedTransitions.length === 0;

  const statusIcon =
    batch.status === InboundBatchStatus.ACCEPTED ? (
      <CheckCircle2 className="h-6 w-6 text-white" />
    ) : batch.status === InboundBatchStatus.REJECTED ? (
      <XCircle className="h-6 w-6 text-white" />
    ) : (
      <Layers className="h-6 w-6 text-white" />
    );

  const iconBg = INBOUND_BATCH_STATUS_CONFIG[batch.status]?.iconBg ?? 'bg-blue-500';

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <nav className="flex items-center gap-1 text-sm text-gray-500 mb-3">
          <Link href="/inbound-batches" className="hover:text-blue-600 flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Lots entrants
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-mono text-gray-700">{batch.code}</span>
        </nav>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`rounded-xl p-3 ${iconBg}`}>{statusIcon}</div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{batch.code}</h1>
              <div className="flex items-center gap-3 mt-1.5">
                <StatusBadge status={batch.status} type="inboundBatch" />
                <span className="text-sm text-gray-500">· {batch.product.name}</span>
                <span className="text-sm text-gray-400">· {batch.supplier.name}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/inbound-batches/${params.id}/edit`}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Modifier
            </Link>
            {canChangeStatus && !isTerminal && (
              <button
                onClick={() => setStatusModal(true)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Changer le statut
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Quantité reçue
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {batch.quantity}{' '}
            <span className="text-base font-normal text-gray-500">{batch.unit}</span>
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Transformations
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {batch._count.transformationOperations}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reçu le</p>
          <p className="text-lg font-semibold text-gray-900 mt-1">
            {new Date(batch.receivedAt).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          {(
            [
              { key: 'info', label: 'Informations', icon: Layers },
              { key: 'control', label: 'Contrôle qualité', icon: ClipboardList },
              {
                key: 'transforms',
                label: `Transformations (${batch._count.transformationOperations})`,
                icon: Wrench,
              },
              { key: 'docs', label: `Documents (${batch._count.documents})`, icon: FileText },
            ] as { key: Tab; label: string; icon: React.ElementType }[]
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        {activeTab === 'info' && (
          <div className="grid grid-cols-2 gap-6">
            <CField label="Code lot" value={batch.code} mono />
            <CField
              label="Statut"
              value={INBOUND_BATCH_STATUS_CONFIG[batch.status]?.label ?? batch.status}
            />
            <CField label="Produit" value={`${batch.product.name} (${batch.product.code})`} />
            <CField label="Fournisseur" value={`${batch.supplier.name} (${batch.supplier.code})`} />
            {batch.supplyContract && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Contrat lié
                </p>
                <Link
                  href={`/supply-contracts/${batch.supplyContract.id}`}
                  className="text-sm text-blue-600 hover:underline font-mono"
                >
                  {batch.supplyContract.code}
                </Link>
              </div>
            )}
            <CField label="Quantité" value={`${batch.quantity} ${batch.unit}`} />
            <CField label="Origine" value={batch.origin} />
            <CField
              label="Date de réception"
              value={new Date(batch.receivedAt).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            />
            {batch.notes && <CField label="Notes" value={batch.notes} wide />}
          </div>
        )}

        {activeTab === 'control' && (
          <div className="space-y-4">
            {!batch.controlledAt ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400 gap-2">
                <ClipboardList className="h-8 w-8" />
                <p className="text-sm">Aucun contrôle qualité enregistré</p>
                {canChangeStatus && allowedTransitions.includes(InboundBatchStatus.IN_CONTROL) && (
                  <button
                    onClick={() => {
                      setNewStatus(InboundBatchStatus.IN_CONTROL);
                      setStatusModal(true);
                    }}
                    className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Démarrer le contrôle
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                <CField
                  label="Contrôlé le"
                  value={new Date(batch.controlledAt).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                />
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Décision
                  </p>
                  <StatusBadge status={batch.status} type="inboundBatch" />
                </div>
                {batch.controlNotes && (
                  <CField label="Notes de contrôle" value={batch.controlNotes} wide />
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'transforms' &&
          (batch.transformationOperations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400 gap-2">
              <Wrench className="h-8 w-8" />
              <p className="text-sm">Aucune opération de transformation sur ce lot</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-2 text-left font-medium text-gray-500">Code</th>
                  <th className="pb-2 text-left font-medium text-gray-500">Nom</th>
                  <th className="pb-2 text-left font-medium text-gray-500">
                    Taux de transformation
                  </th>
                  <th className="pb-2 text-left font-medium text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {batch.transformationOperations.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/transformation-operations/${t.id}`)}
                  >
                    <td className="py-3 font-mono text-blue-600">{t.code}</td>
                    <td className="py-3 text-gray-900">{t.name}</td>
                    <td className="py-3 text-gray-600">
                      {t.yieldRate != null ? `${t.yieldRate} %` : '—'}
                    </td>
                    <td className="py-3 text-gray-500">
                      {new Date(t.operationDate).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
      </div>

      {activeTab === 'docs' && (
        <DocumentsPanel linkedEntityType="INBOUND_BATCH" linkedEntityId={batch.id} />
      )}

      {/* Status modal */}
      {statusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Changer le statut du lot</h2>
            <p className="text-sm text-gray-500">
              Statut actuel : <StatusBadge status={batch.status} type="inboundBatch" />
            </p>
            <div className="grid gap-2">
              {allowedTransitions.map((s) => {
                const c = INBOUND_BATCH_STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    onClick={() => setNewStatus(s)}
                    className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-sm text-left transition-colors ${
                      newStatus === s
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${c?.dot ?? 'bg-gray-400'}`} />
                    <span className="font-medium text-gray-900">{c?.label ?? s}</span>
                  </button>
                );
              })}
            </div>

            {/* Notes de contrôle — obligatoires pour ACCEPTED / REJECTED */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes de contrôle qualité
                {(newStatus === InboundBatchStatus.ACCEPTED ||
                  newStatus === InboundBatchStatus.REJECTED) && (
                  <span className="ml-1 text-red-500">*</span>
                )}
              </label>
              <textarea
                value={controlNotes}
                onChange={(e) => setControlNotes(e.target.value)}
                rows={3}
                placeholder="Observations, résultats analytiques, non-conformités éventuelles…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {statusError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{statusError}</p>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => {
                  setStatusModal(false);
                  setNewStatus('');
                  setControlNotes('');
                  setStatusError(null);
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleChangeStatus}
                disabled={
                  !newStatus ||
                  statusLoading ||
                  ((newStatus === InboundBatchStatus.ACCEPTED ||
                    newStatus === InboundBatchStatus.REJECTED) &&
                    !controlNotes.trim())
                }
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
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
