'use client';

import { toast } from 'sonner';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronRight,
  AlertTriangle,
  Package,
  FileText,
  ShieldCheck,
  X,
  ChevronDown,
  Plus,
  Upload,
  GitBranch,
} from 'lucide-react';
import { UserRole, PRODUCT_BATCH_STATUS_TRANSITIONS, ProductBatchStatus } from '@iox/shared';
import { StatusBadge } from '@/components/ui/status-badge';
import { useAuth } from '@/contexts/auth.context';
import { authStorage } from '@/lib/auth';
import { DocumentsPanel } from '@/components/documents/documents-panel';
import { TraceabilityPanel } from '@/components/traceability/timeline';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface BatchDetail {
  id: string;
  code: string;
  status: string;
  quantity: number;
  unit: string;
  productionDate: string;
  expiryDate?: string;
  storageConditions?: string;
  notes?: string;
  product: { id: string; code: string; name: string; status: string };
  transformationOp?: { id: string; code: string; name: string } | null;
  labelValidations: {
    id: string;
    isValid: boolean;
    validatedAt?: string;
    notes?: string;
    reservations?: string[];
  }[];
  marketReleaseDecisions: {
    id: string;
    decision: string;
    decidedAt?: string;
    isActive?: boolean;
    notes?: string;
    blockingReason?: string;
    reservations?: string[];
  }[];
  _count: { labelValidations: number; marketReleaseDecisions: number; documents: number };
  createdAt: string;
}

type Tab = 'info' | 'labels' | 'market' | 'docs' | 'trace';

const CAN_CHANGE_STATUS = [UserRole.ADMIN, UserRole.COORDINATOR, UserRole.QUALITY_MANAGER];

/* ------------------------------------------------------------------ */
/*  Status label helpers                                                */
/* ------------------------------------------------------------------ */

const STATUS_LABELS: Record<string, string> = {
  CREATED: 'Créé',
  READY_FOR_VALIDATION: 'Prêt à valider',
  AVAILABLE: 'Disponible',
  RESERVED: 'Réservé',
  SHIPPED: 'Expédié',
  BLOCKED: 'Bloqué',
  DESTROYED: 'Détruit',
};

/* ------------------------------------------------------------------ */
/*  Page Component                                                      */
/* ------------------------------------------------------------------ */

export default function ProductBatchDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('info');

  /* Status modal */
  const [showModal, setShowModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const fetchBatch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/product-batches/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(res.status === 404 ? 'Lot introuvable' : 'Erreur serveur — réessayez dans quelques instants');
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

  const canChangeStatus = user && CAN_CHANGE_STATUS.includes(user.role);
  const canValidate = user && CAN_CHANGE_STATUS.includes(user.role);

  const nextStatuses = batch
    ? (PRODUCT_BATCH_STATUS_TRANSITIONS[batch.status as ProductBatchStatus] ?? [])
    : [];

  const openModal = () => {
    setNewStatus(nextStatuses[0] ?? '');
    setStatusNotes('');
    setStatusError(null);
    setShowModal(true);
  };

  const handleStatusChange = async () => {
    if (!newStatus || !batch) return;
    setStatusLoading(true);
    setStatusError(null);
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/product-batches/${batch.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, notes: statusNotes || undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(Array.isArray(err.message) ? err.message.join(', ') : err.message);
      }
      setShowModal(false);
      fetchBatch();
    } catch (err) {
      setStatusError((err as Error).message);
    } finally {
      setStatusLoading(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Loading / Error states                                           */
  /* ---------------------------------------------------------------- */

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

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-6">
      {/* Breadcrumb + Header */}
      <div>
        <nav className="flex items-center gap-1 text-sm text-gray-500 mb-3">
          <Link href="/product-batches" className="hover:text-blue-600 flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Lots finis
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-mono text-gray-700">{batch.code}</span>
        </nav>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-blue-500 p-3">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{batch.code}</h1>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                {batch.product.name}· {batch.quantity} {batch.unit}
                · <StatusBadge status={batch.status} type="batch" />
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canChangeStatus && (
              <Link
                href={`/product-batches/${params.id}/edit`}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Modifier
              </Link>
            )}
            {canChangeStatus && nextStatuses.length > 0 && (
              <button
                onClick={openModal}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Changer le statut <ChevronDown className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Quantité</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {batch.quantity} <span className="text-sm font-normal text-gray-500">{batch.unit}</span>
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Production</p>
          <p className="text-lg font-semibold text-gray-900 mt-1">
            {new Date(batch.productionDate).toLocaleDateString('fr-FR')}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">DLC</p>
          <p className="text-lg font-semibold text-gray-900 mt-1">
            {batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString('fr-FR') : '—'}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Documents</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{batch._count.documents}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {(
            [
              { key: 'info', label: 'Informations', icon: Package },
              {
                key: 'labels',
                label: `Étiquetage (${batch._count.labelValidations})`,
                icon: FileText,
              },
              {
                key: 'market',
                label: `Mise en marché (${batch._count.marketReleaseDecisions})`,
                icon: ShieldCheck,
              },
              { key: 'docs', label: `Documents (${batch._count.documents})`, icon: Upload },
              { key: 'trace', label: 'Traçabilité', icon: GitBranch },
            ] as { key: Tab; label: string; icon: React.ElementType }[]
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {tab === 'info' && <InfoTab batch={batch} />}
      {tab === 'labels' && (
        <LabelsTab
          validations={batch.labelValidations}
          batchId={batch.id}
          batchStatus={batch.status}
          canValidate={!!canValidate}
          onCreated={fetchBatch}
        />
      )}
      {tab === 'market' && (
        <MarketTab
          decisions={batch.marketReleaseDecisions}
          batchId={batch.id}
          batchStatus={batch.status}
          canDecide={!!canValidate}
          onDecisionCreated={fetchBatch}
        />
      )}
      {tab === 'docs' && (
        <DocumentsPanel linkedEntityType="PRODUCT_BATCH" linkedEntityId={batch.id} />
      )}
      {tab === 'trace' && <TraceabilityPanel batchId={batch.id} />}

      {/* Status Change Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Changer le statut</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Statut actuel</p>
              <StatusBadge status={batch.status} type="batch" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nouveau statut *
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {nextStatuses.map((s: string) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s] ?? s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optionnel)
              </label>
              <textarea
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                rows={3}
                placeholder="Motif, observations…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {statusError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {statusError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleStatusChange}
                disabled={!newStatus || statusLoading}
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

/* ------------------------------------------------------------------ */
/*  Sub-components                                                      */
/* ------------------------------------------------------------------ */

function InfoTab({ batch }: { batch: BatchDetail }) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Produit associé</h3>
        <div className="space-y-2 text-sm">
          <Row label="Code produit">
            <Link
              href={`/products/${batch.product.id}`}
              className="font-mono text-blue-600 hover:underline"
            >
              {batch.product.code}
            </Link>
          </Row>
          <Row label="Nom">{batch.product.name}</Row>
          <Row label="Statut produit">
            <StatusBadge status={batch.product.status} type="product" />
          </Row>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Traçabilité</h3>
        <div className="space-y-2 text-sm">
          {batch.transformationOp ? (
            <Row label="Opération TO">
              <Link
                href={`/transformation-operations/${batch.transformationOp.id}`}
                className="font-mono text-blue-600 hover:underline"
              >
                {batch.transformationOp.code}
              </Link>
            </Row>
          ) : (
            <Row label="Opération TO">
              <span className="text-gray-400">Lot créé manuellement</span>
            </Row>
          )}
          <Row label="Créé le">{new Date(batch.createdAt).toLocaleDateString('fr-FR')}</Row>
        </div>
      </div>

      {(batch.storageConditions || batch.notes) && (
        <div className="col-span-2 rounded-lg border border-gray-200 bg-white p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Informations complémentaires</h3>
          <div className="space-y-3 text-sm">
            {batch.storageConditions && (
              <div>
                <span className="text-gray-500 block mb-1">Conditions de stockage</span>
                <p className="text-gray-900">{batch.storageConditions}</p>
              </div>
            )}
            {batch.notes && (
              <div>
                <span className="text-gray-500 block mb-1">Notes</span>
                <p className="text-gray-900">{batch.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LabelsTab({
  validations,
  batchId,
  batchStatus,
  canValidate,
  onCreated,
}: {
  validations: BatchDetail['labelValidations'];
  batchId: string;
  batchStatus: string;
  canValidate: boolean;
  onCreated: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [isValid, setIsValid] = useState<boolean>(true);
  const [notes, setNotes] = useState('');
  const [reservations, setReservations] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const canAdd = canValidate && !['SHIPPED', 'DESTROYED'].includes(batchStatus);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch('/api/v1/label-validations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productBatchId: batchId,
          isValid,
          notes: notes.trim() || undefined,
          reservations: reservations.trim()
            ? reservations
                .split('\n')
                .map((r) => r.trim())
                .filter(Boolean)
            : [],
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(Array.isArray(err.message) ? err.message.join(', ') : err.message);
      }
      setShowForm(false);
      setNotes('');
      setReservations('');
      onCreated();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Formulaire de création */}
      {canAdd && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 w-full justify-center"
        >
          <Plus className="h-4 w-4" /> Enregistrer une validation d'étiquetage
        </button>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-blue-200 bg-blue-50 p-5 space-y-4"
        >
          <h4 className="text-sm font-semibold text-blue-900">Nouvelle validation d'étiquetage</h4>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Résultat de la validation *</p>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="isValid"
                  checked={isValid}
                  onChange={() => setIsValid(true)}
                  className="text-green-600"
                />
                <span className="text-sm text-gray-700">✅ Étiquetage conforme</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="isValid"
                  checked={!isValid}
                  onChange={() => setIsValid(false)}
                  className="text-red-600"
                />
                <span className="text-sm text-gray-700">❌ Étiquetage non conforme</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Observations, points contrôlés…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {!isValid && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Réserves (une par ligne)
              </label>
              <textarea
                value={reservations}
                onChange={(e) => setReservations(e.target.value)}
                rows={3}
                placeholder={'Mention allergènes manquante\nDate de durabilité incorrecte'}
                className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          )}

          {formError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Enregistrement…' : 'Valider'}
            </button>
          </div>
        </form>
      )}

      {/* Liste des validations */}
      {validations.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="flex flex-col items-center justify-center h-32 text-gray-400 gap-2">
            <FileText className="h-8 w-8" />
            <p className="text-sm">Aucune validation d'étiquetage enregistrée</p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Résultat</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Notes</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Réserves</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {validations.map((v) => (
                <tr key={v.id}>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        v.isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {v.isValid ? '✅ Conforme' : '❌ Non conforme'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {v.validatedAt ? new Date(v.validatedAt).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{v.notes ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {v.reservations && v.reservations.length > 0 ? v.reservations.join(', ') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MarketTab — Checklist 7 conditions + Historique décisions         */
/* ------------------------------------------------------------------ */

interface ChecklistItem {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
}
interface ChecklistResult {
  items: ChecklistItem[];
  allPass: boolean;
  canRelease: boolean;
}

const DECISION_CONFIG: Record<string, { label: string; badgeCls: string; icon: string }> = {
  COMPLIANT: { label: 'Conforme', className: 'bg-green-100 text-green-800', icon: '✅' } as any,
  COMPLIANT_WITH_RESERVATIONS: {
    label: 'Conforme avec réserves',
    badgeCls: 'bg-yellow-100 text-yellow-800',
    icon: '⚠️',
  },
  NON_COMPLIANT: {
    label: 'Non conforme — Bloqué',
    badgeCls: 'bg-red-100 text-red-800',
    icon: '🚫',
  },
};

function MarketTab({
  decisions,
  batchId,
  batchStatus,
  canDecide,
  onDecisionCreated,
}: {
  decisions: BatchDetail['marketReleaseDecisions'];
  batchId: string;
  batchStatus: string;
  canDecide: boolean;
  onDecisionCreated: () => void;
}) {
  const [checklist, setChecklist] = useState<ChecklistResult | null>(null);
  const [clLoading, setClLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [decision, setDecision] = useState<string>('COMPLIANT');
  const [notes, setNotes] = useState('');
  const [blockingReason, setBlockingReason] = useState('');
  const [reservations, setReservations] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const forbiddenStatuses = ['SHIPPED', 'DESTROYED', 'BLOCKED'];
  const canAdd = canDecide && !forbiddenStatuses.includes(batchStatus);

  const loadChecklist = useCallback(async () => {
    setClLoading(true);
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/market-release-decisions/checklist/${batchId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setChecklist(json.data ?? json);
      }
    } catch {
      toast.error('Action impossible, réessayez.');
    } finally {
      setClLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    loadChecklist();
  }, [loadChecklist]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch('/api/v1/market-release-decisions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productBatchId: batchId,
          decision,
          notes: notes.trim() || undefined,
          blockingReason: decision === 'NON_COMPLIANT' ? blockingReason.trim() : undefined,
          reservations:
            decision === 'COMPLIANT_WITH_RESERVATIONS' && reservations.trim()
              ? reservations
                  .split('\n')
                  .map((r) => r.trim())
                  .filter(Boolean)
              : [],
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(Array.isArray(err.message) ? err.message.join('\n') : err.message);
      }
      setShowForm(false);
      setNotes('');
      setBlockingReason('');
      setReservations('');
      onDecisionCreated();
      loadChecklist();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const decisionCfg = (d: string) =>
    DECISION_CONFIG[d] ?? { label: d, badgeCls: 'bg-gray-100 text-gray-700', icon: '?' };

  return (
    <div className="space-y-6">
      {/* ── Checklist des 7 conditions ─────────────────────────────── */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900">
              Checklist des 7 conditions de mise en marché
            </h3>
          </div>
          <button
            onClick={loadChecklist}
            disabled={clLoading}
            className="text-xs text-blue-600 hover:underline disabled:opacity-40"
          >
            {clLoading ? 'Actualisation…' : '↻ Actualiser'}
          </button>
        </div>

        {clLoading && !checklist ? (
          <div className="py-8 text-center text-sm text-gray-500">Évaluation en cours…</div>
        ) : checklist ? (
          <div>
            <ul className="divide-y divide-gray-50">
              {checklist.items.map((item, idx) => (
                <li key={item.id} className="px-5 py-3 flex items-start gap-3">
                  <span className="mt-0.5 flex-shrink-0 text-base">{item.pass ? '✅' : '❌'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-400">C{idx + 1}</span>
                      <p
                        className={`text-sm font-medium ${item.pass ? 'text-gray-800' : 'text-red-700'}`}
                      >
                        {item.label}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div
              className={`px-5 py-3 border-t text-sm font-semibold flex items-center gap-2 ${
                checklist.allPass
                  ? 'bg-green-50 text-green-800 border-green-100'
                  : 'bg-red-50 text-red-800 border-red-100'
              }`}
            >
              {checklist.allPass
                ? '✅ Toutes les conditions sont réunies — mise en marché autorisée'
                : `❌ ${checklist.items.filter((i) => !i.pass).length} condition(s) non remplie(s) — mise en marché bloquée`}
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Formulaire de décision ─────────────────────────────────── */}
      {canAdd && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 w-full justify-center"
        >
          <Plus className="h-4 w-4" /> Enregistrer une décision de mise en marché
        </button>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-blue-200 bg-blue-50 p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-blue-900">
              Nouvelle décision de mise en marché
            </h4>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {!checklist?.canRelease && decision !== 'NON_COMPLIANT' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              ⚠️ Certaines conditions ne sont pas remplies. Seule une décision{' '}
              <strong>NON_COMPLIANT</strong> est possible.
            </div>
          )}

          {/* Décision */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Décision *</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  value: 'COMPLIANT',
                  label: '✅ Conforme',
                  cls: 'border-green-300 bg-green-50 text-green-800',
                },
                {
                  value: 'COMPLIANT_WITH_RESERVATIONS',
                  label: '⚠️ Conforme avec réserves',
                  cls: 'border-yellow-300 bg-yellow-50 text-yellow-800',
                },
                {
                  value: 'NON_COMPLIANT',
                  label: '🚫 Non conforme',
                  cls: 'border-red-300 bg-red-50 text-red-800',
                },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDecision(opt.value)}
                  disabled={opt.value !== 'NON_COMPLIANT' && !checklist?.canRelease}
                  className={`rounded-lg border-2 px-3 py-2 text-xs font-medium transition-all disabled:opacity-40 ${
                    decision === opt.value
                      ? opt.cls + ' ring-2 ring-offset-1 ring-blue-500'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Motif de blocage */}
          {decision === 'NON_COMPLIANT' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motif de blocage <span className="text-red-500">*</span>
              </label>
              <textarea
                value={blockingReason}
                onChange={(e) => setBlockingReason(e.target.value)}
                rows={2}
                required
                placeholder="Ex. Contamination microbiologique détectée lors de l'analyse du lot…"
                className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          )}

          {/* Réserves */}
          {decision === 'COMPLIANT_WITH_RESERVATIONS' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Réserves (une par ligne)
              </label>
              <textarea
                value={reservations}
                onChange={(e) => setReservations(e.target.value)}
                rows={3}
                placeholder={'DLC à vérifier avant distribution\nÉtiquette à corriger dans les 48h'}
                className="w-full rounded-lg border border-yellow-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Observations complémentaires…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 whitespace-pre-line">
              {formError}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Enregistrement…' : 'Valider la décision'}
            </button>
          </div>
        </form>
      )}

      {/* ── Historique des décisions ───────────────────────────────── */}
      {decisions.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Historique des décisions</h4>
          <div className="space-y-3">
            {decisions.map((d) => {
              const cfg = decisionCfg(d.decision);
              return (
                <div
                  key={d.id}
                  className="rounded-lg border border-gray-200 bg-white p-5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${cfg.badgeCls}`}
                    >
                      {cfg.icon} {cfg.label}
                    </span>
                    <div className="text-right text-xs text-gray-400">
                      {d.decidedAt && new Date(d.decidedAt).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  {d.notes && (
                    <div className="text-sm">
                      <span className="text-gray-500 block mb-0.5">Notes</span>
                      <p className="text-gray-800">{d.notes}</p>
                    </div>
                  )}
                  {d.blockingReason && (
                    <div className="text-sm bg-red-50 border border-red-100 rounded p-2">
                      <span className="text-red-600 font-medium block mb-0.5">
                        Motif de blocage
                      </span>
                      <p className="text-red-700">{d.blockingReason}</p>
                    </div>
                  )}
                  {d.reservations && d.reservations.length > 0 && (
                    <div className="text-sm">
                      <span className="text-gray-500 block mb-1">Réserves</span>
                      <ul className="space-y-1">
                        {d.reservations.map((r: string, i: number) => (
                          <li key={i} className="flex items-start gap-1.5 text-gray-700">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-yellow-400 flex-shrink-0" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900">{children}</span>
    </div>
  );
}
