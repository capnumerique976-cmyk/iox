'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronRight,
  Truck,
  AlertTriangle,
  Package,
  CheckCircle2,
  XCircle,
  Pencil,
} from 'lucide-react';
import { DistributionStatus, DISTRIBUTION_STATUS_TRANSITIONS, UserRole } from '@iox/shared';
import { useAuth } from '@/contexts/auth.context';
import { authStorage } from '@/lib/auth';

/* ── Status config ───────────────────────────────────────────────────── */
const STATUS_CLS: Record<DistributionStatus, string> = {
  [DistributionStatus.PLANNED]: 'bg-blue-100 text-blue-700',
  [DistributionStatus.IN_PROGRESS]: 'bg-yellow-100 text-yellow-700',
  [DistributionStatus.COMPLETED]: 'bg-green-100 text-green-700',
  [DistributionStatus.CANCELLED]: 'bg-red-100 text-red-500',
};
const STATUS_LABEL: Record<DistributionStatus, string> = {
  [DistributionStatus.PLANNED]: 'Planifiée',
  [DistributionStatus.IN_PROGRESS]: 'En cours',
  [DistributionStatus.COMPLETED]: 'Complétée',
  [DistributionStatus.CANCELLED]: 'Annulée',
};

const NEXT_BTN: Partial<Record<DistributionStatus, { label: string; cls: string }>> = {
  [DistributionStatus.IN_PROGRESS]: {
    label: 'Démarrer',
    cls: 'bg-yellow-500 hover:bg-yellow-600 text-white',
  },
  [DistributionStatus.COMPLETED]: {
    label: 'Compléter',
    cls: 'bg-green-600 hover:bg-green-700 text-white',
  },
  [DistributionStatus.CANCELLED]: {
    label: 'Annuler',
    cls: 'border border-red-300 text-red-600 hover:bg-red-50',
  },
};

const CAN_WRITE = [
  UserRole.ADMIN,
  UserRole.COORDINATOR,
  UserRole.LOGISTICS_MANAGER,
  UserRole.BENEFICIARY_MANAGER,
];

interface DistributionDetail {
  id: string;
  code: string;
  status: DistributionStatus;
  distributionDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  beneficiary: { id: string; code: string; name: string; city?: string };
  lines: {
    id: string;
    quantity: number;
    unit: string;
    notes?: string;
    productBatch: {
      id: string;
      code: string;
      status: string;
      quantity: number;
      unit: string;
      product: { id: string; code: string; name: string };
    };
  }[];
  _count: { lines: number };
}

export default function DistributionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [dist, setDist] = useState<DistributionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modal, setModal] = useState(false);
  const [nextStatus, setNextStatus] = useState<DistributionStatus | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const canWrite = user && CAN_WRITE.includes(user.role);

  const fetchDist = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/distributions/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok)
        throw new Error(res.status === 404 ? 'Distribution introuvable' : 'Erreur serveur — réessayez dans quelques instants');
      const json = await res.json();
      setDist(json.data ?? json);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchDist();
  }, [fetchDist]);

  const openModal = (status: DistributionStatus) => {
    setNextStatus(status);
    setReason('');
    setModalError(null);
    setModal(true);
  };

  const handleStatusChange = async () => {
    if (!nextStatus || !dist) return;
    setSaving(true);
    setModalError(null);
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/distributions/${dist.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, notes: reason || undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? 'Erreur');
      }
      setModal(false);
      fetchDist();
    } catch (err) {
      setModalError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-500">Chargement…</div>
    );
  if (error || !dist)
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertTriangle className="h-8 w-8 text-red-400" />
        <p className="text-sm text-red-600">{error ?? 'Distribution introuvable'}</p>
        <button onClick={() => router.back()} className="text-sm text-premium-accent hover:underline">
          Retour
        </button>
      </div>
    );

  const allowedTransitions = DISTRIBUTION_STATUS_TRANSITIONS[dist.status] ?? [];
  const totalQty = dist.lines.reduce((s, l) => s + Number(l.quantity), 0);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <nav className="flex items-center gap-1 text-sm text-gray-500 mb-3">
          <Link href="/distributions" className="hover:text-premium-accent flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Distributions
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-mono text-gray-700">{dist.code}</span>
        </nav>

        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div
              className={`rounded-xl p-3 shadow-premium-sm ${
                dist.status === DistributionStatus.COMPLETED
                  ? 'bg-green-500'
                  : dist.status === DistributionStatus.CANCELLED
                    ? 'bg-red-400'
                    : dist.status === DistributionStatus.IN_PROGRESS
                      ? 'bg-yellow-500'
                      : 'bg-gradient-iox-primary'
              }`}
            >
              <Truck className="h-6 w-6 text-white" aria-hidden />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">{dist.code}</h1>
              <div className="flex items-center gap-3 mt-1.5">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLS[dist.status]}`}
                >
                  {STATUS_LABEL[dist.status]}
                </span>
                <span className="text-sm text-gray-500">· {dist.beneficiary.name}</span>
                <span className="text-sm text-gray-400">
                  ·{' '}
                  {new Date(dist.distributionDate).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>

          {canWrite && (
            <div className="flex flex-wrap items-center gap-2">
              {dist.status === DistributionStatus.PLANNED && (
                <Link
                  href={`/distributions/${params.id}/edit`}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-premium-sm transition-all duration-fast ease-premium hover:border-premium-accent/40 hover:bg-premium-accent/5 hover:text-premium-accent"
                >
                  <Pencil className="h-4 w-4" aria-hidden /> Modifier
                </Link>
              )}
              {allowedTransitions.map((s) => {
                const btn = NEXT_BTN[s];
                return (
                  <button
                    key={s}
                    onClick={() => openModal(s)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${btn?.cls ?? 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                  >
                    {btn?.label ?? STATUS_LABEL[s]}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bannière COMPLETED */}
      {dist.status === DistributionStatus.COMPLETED && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-800 font-medium">
            Distribution complétée — les lots distribués ont été passés au statut{' '}
            <strong>Expédié</strong>.
          </p>
        </div>
      )}

      {/* Bannière CANCELLED */}
      {dist.status === DistributionStatus.CANCELLED && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-center gap-3">
          <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">Distribution annulée.</p>
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200/70 bg-white p-4 shadow-premium-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Lots distribués
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{dist._count.lines}</p>
        </div>
        <div className="rounded-xl border border-gray-200/70 bg-white p-4 shadow-premium-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Quantité totale
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {totalQty.toLocaleString('fr-FR')}
            {dist.lines[0] && (
              <span className="text-sm font-normal text-gray-500 ml-1">{dist.lines[0].unit}</span>
            )}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200/70 bg-white p-4 shadow-premium-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Bénéficiaire</p>
          <Link
            href={`/beneficiaries/${dist.beneficiary.id}`}
            className="text-base font-semibold text-premium-accent hover:underline mt-1 block"
          >
            {dist.beneficiary.name}
          </Link>
          {dist.beneficiary.city && (
            <p className="text-xs text-gray-400">{dist.beneficiary.city}</p>
          )}
        </div>
      </div>

      {/* Notes */}
      {dist.notes && (
        <div className="rounded-xl border border-gray-200/70 bg-white p-5 shadow-premium-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Notes</p>
          <p className="text-sm text-gray-800">{dist.notes}</p>
        </div>
      )}

      {/* Lignes de distribution */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Détail des lots distribués</h3>
        {dist.lines.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200/70 bg-white py-12 text-gray-400 shadow-premium-sm">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-premium-accent/10 text-premium-accent">
              <Package className="h-5 w-5" aria-hidden />
            </div>
            <p className="text-sm">Aucune ligne</p>
          </div>
        ) : (
          <div className="iox-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Lot fini</th>
                  <th>Produit</th>
                  <th>Quantité distribuée</th>
                  <th>Stock lot</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {dist.lines.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/product-batches/${line.productBatch.id}`}
                        className="font-mono text-premium-accent hover:underline font-medium"
                      >
                        {line.productBatch.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-900">{line.productBatch.product.name}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {Number(line.quantity).toLocaleString('fr-FR')} {line.unit}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {Number(line.productBatch.quantity).toLocaleString('fr-FR')}{' '}
                      {line.productBatch.unit}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{line.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-100">
                <tr>
                  <td colSpan={2} className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                    Total
                  </td>
                  <td className="px-4 py-2 font-bold text-gray-900">
                    {totalQty.toLocaleString('fr-FR')} {dist.lines[0]?.unit ?? ''}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Méta */}
      <div className="text-xs text-gray-400 flex gap-4">
        <span>Créée le {new Date(dist.createdAt).toLocaleDateString('fr-FR')}</span>
        <span>Mise à jour le {new Date(dist.updatedAt).toLocaleDateString('fr-FR')}</span>
      </div>

      {/* Modal de changement de statut */}
      {modal && nextStatus && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {nextStatus === DistributionStatus.COMPLETED
                ? '✅ Confirmer la distribution'
                : nextStatus === DistributionStatus.CANCELLED
                  ? '⚠️ Annuler la distribution'
                  : '▶ Démarrer la distribution'}
            </h2>
            {nextStatus === DistributionStatus.COMPLETED && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                En complétant cette distribution, tous les lots associés seront automatiquement
                passés au statut <strong>Expédié</strong>.
              </div>
            )}
            {nextStatus === DistributionStatus.CANCELLED && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                L'annulation est irréversible. Les lots redeviendront disponibles.
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motif / commentaire (optionnel)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-premium-sm focus:border-premium-accent/40 focus:outline-none focus:ring-2 focus:ring-premium-accent/30"
              />
            </div>
            {modalError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{modalError}</p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setModal(false)}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-premium-sm transition-all duration-fast ease-premium hover:border-premium-accent/40 hover:bg-premium-accent/5 hover:text-premium-accent"
              >
                Annuler
              </button>
              <button
                onClick={handleStatusChange}
                disabled={saving}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                  nextStatus === DistributionStatus.CANCELLED
                    ? 'bg-red-600 hover:bg-red-700'
                    : nextStatus === DistributionStatus.COMPLETED
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {saving ? 'Enregistrement…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
