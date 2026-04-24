'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { DistributionStatus, UserRole } from '@iox/shared';
import { useAuth } from '@/contexts/auth.context';
import { authStorage } from '@/lib/auth';

const CAN_WRITE = [
  UserRole.ADMIN,
  UserRole.COORDINATOR,
  UserRole.LOGISTICS_MANAGER,
  UserRole.BENEFICIARY_MANAGER,
];

interface DistributionContext {
  code: string;
  status: DistributionStatus;
  beneficiaryName: string;
}

export default function DistributionEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [ctx, setCtx] = useState<DistributionContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* form fields */
  const [distributionDate, setDistributionDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const token = authStorage.getAccessToken();
        const res = await fetch(`/api/v1/distributions/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Distribution introuvable');
        const json = await res.json();
        const d = json.data ?? json;

        setCtx({
          code: d.code,
          status: d.status,
          beneficiaryName: d.beneficiary?.name ?? '',
        });
        setDistributionDate(d.distributionDate ? d.distributionDate.slice(0, 10) : '');
        setNotes(d.notes ?? '');
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params.id]);

  const canWrite = user && CAN_WRITE.includes(user.role);
  /* Only PLANNED distributions can be edited */
  const isEditable = ctx?.status === DistributionStatus.PLANNED;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!distributionDate) {
      setError('La date de distribution est requise');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/distributions/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ distributionDate, notes: notes || undefined }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message ?? 'Erreur lors de la mise à jour');
      }
      router.push(`/distributions/${params.id}`);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-500">Chargement…</div>
    );
  }

  if (!canWrite || !isEditable) {
    return (
      <div className="space-y-4">
        <Link
          href={`/distributions/${params.id}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à la distribution
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {!canWrite
            ? "Vous n'avez pas les droits pour modifier cette distribution."
            : `Cette distribution est au statut « ${ctx?.status} » et ne peut plus être modifiée.`}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/distributions" className="hover:text-gray-700">
          Distributions
        </Link>
        <span>/</span>
        <Link href={`/distributions/${params.id}`} className="hover:text-gray-700 font-mono">
          {ctx?.code}
        </Link>
        <span>/</span>
        <span className="text-gray-900">Modifier</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Modifier la distribution</h1>
        <p className="text-sm text-gray-500 mt-1">
          {ctx?.beneficiaryName} — <span className="font-mono">{ctx?.code}</span>
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Infos distribution */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Informations
          </h2>

          {/* Date de distribution */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de distribution <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={distributionDate}
              onChange={(e) => setDistributionDate(e.target.value)}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-premium-accent/30"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Observations, conditions particulières…"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-premium-accent/30 resize-none"
            />
          </div>
        </div>

        {/* Info — lignes non modifiables */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">
          Les lignes de distribution (lots alloués) ne sont pas modifiables après création. Pour
          ajuster les lots, annulez la distribution et créez-en une nouvelle.
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Link
            href={`/distributions/${params.id}`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" /> Annuler
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-iox-primary px-4 py-2 text-sm font-medium text-white hover:shadow-premium-md disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
}
