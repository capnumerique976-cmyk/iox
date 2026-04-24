'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, ShieldCheck, ShieldAlert, ShieldX, Search } from 'lucide-react';
import { MarketReleaseDecision } from '@iox/shared';
import { authStorage } from '@/lib/auth';

interface ProductBatch {
  id: string;
  code: string;
  status: string;
  product?: { id: string; name: string } | null;
}

const ELIGIBLE_STATUSES = ['READY_FOR_VALIDATION', 'CREATED', 'AVAILABLE'];

const DECISIONS = [
  { val: MarketReleaseDecision.COMPLIANT, label: 'Conforme', Icon: ShieldCheck, colorCls: 'green' },
  {
    val: MarketReleaseDecision.COMPLIANT_WITH_RESERVATIONS,
    label: 'Conforme avec réserves',
    Icon: ShieldAlert,
    colorCls: 'yellow',
  },
  {
    val: MarketReleaseDecision.NON_COMPLIANT,
    label: 'Non conforme',
    Icon: ShieldX,
    colorCls: 'red',
  },
] as const;

const COLOR_MAP: Record<string, { border: string; bg: string; text: string }> = {
  green: { border: 'border-green-500', bg: 'bg-green-50', text: 'text-green-700' },
  yellow: { border: 'border-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-700' },
  red: { border: 'border-red-500', bg: 'bg-red-50', text: 'text-red-700' },
};

export default function NewMarketReleaseDecisionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetBatch = searchParams.get('productBatchId') ?? '';

  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [batchSearch, setBatchSearch] = useState('');
  const [batchId, setBatchId] = useState(presetBatch);

  const [decision, setDecision] = useState<MarketReleaseDecision>(MarketReleaseDecision.COMPLIANT);
  const [notes, setNotes] = useState('');
  const [blockingReason, setBlockingReason] = useState('');
  const [reservations, setReservations] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = authStorage.getAccessToken();
    Promise.all(
      ELIGIBLE_STATUSES.map((status) =>
        fetch(`/api/v1/product-batches?limit=100&status=${status}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((r) => (r.ok ? r.json() : { data: { data: [] } }))
          .then((j) => (j.data?.data ?? j.data ?? []) as ProductBatch[])
          .catch(() => [] as ProductBatch[]),
      ),
    ).then((groups) => {
      const seen = new Set<string>();
      setBatches(groups.flat().filter((b) => (seen.has(b.id) ? false : (seen.add(b.id), true))));
    });
  }, []);

  const filtered = useMemo(() => {
    if (!batchSearch.trim()) return batches.slice(0, 50);
    const q = batchSearch.toLowerCase();
    return batches
      .filter(
        (b) =>
          b.code.toLowerCase().includes(q) || (b.product?.name.toLowerCase().includes(q) ?? false),
      )
      .slice(0, 50);
  }, [batches, batchSearch]);

  const selectedBatch = batches.find((b) => b.id === batchId) ?? null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchId) {
      setError('Sélectionnez un lot fini');
      return;
    }
    if (decision === MarketReleaseDecision.NON_COMPLIANT && !blockingReason.trim()) {
      setError('Motif de blocage obligatoire pour un non conforme');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch('/api/v1/market-release-decisions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productBatchId: batchId,
          decision,
          notes: notes.trim() || undefined,
          blockingReason:
            decision === MarketReleaseDecision.NON_COMPLIANT ? blockingReason.trim() : undefined,
          reservations:
            decision === MarketReleaseDecision.COMPLIANT_WITH_RESERVATIONS && reservations.trim()
              ? reservations
                  .split('\n')
                  .map((r) => r.trim())
                  .filter(Boolean)
              : [],
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.message || 'Création impossible');
      }
      router.push('/market-release-decisions');
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/market-release-decisions"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">
          Nouvelle décision de mise sur le marché
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Décision finale de conformité avant libération d'un lot fini.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sélection lot */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Lot fini <span className="text-red-500">*</span>
          </label>
          {selectedBatch ? (
            <div className="flex items-center justify-between rounded-lg border border-blue-300 bg-blue-50 px-3 py-2">
              <div>
                <p className="font-mono text-sm font-medium text-blue-700">{selectedBatch.code}</p>
                <p className="text-xs text-gray-600">
                  {selectedBatch.product?.name ?? '—'} · statut {selectedBatch.status}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBatchId('')}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Changer
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={batchSearch}
                  onChange={(e) => setBatchSearch(e.target.value)}
                  placeholder="Code lot ou produit…"
                  className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400">Aucun lot éligible</div>
                ) : (
                  filtered.map((b) => (
                    <button
                      type="button"
                      key={b.id}
                      onClick={() => setBatchId(b.id)}
                      className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50"
                    >
                      <div>
                        <p className="font-mono text-sm text-blue-700">{b.code}</p>
                        <p className="text-xs text-gray-500">{b.product?.name ?? '—'}</p>
                      </div>
                      <span className="text-xs text-gray-400">{b.status}</span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Décision */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Décision <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {DECISIONS.map(({ val, label, Icon, colorCls }) => {
              const c = COLOR_MAP[colorCls];
              const active = decision === val;
              return (
                <button
                  type="button"
                  key={val}
                  onClick={() => setDecision(val)}
                  className={`flex items-center gap-2 rounded-lg border-2 px-3 py-3 text-sm font-medium transition-colors ${
                    active
                      ? `${c.border} ${c.bg} ${c.text}`
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" /> {label}
                </button>
              );
            })}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Observations libres…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {decision === MarketReleaseDecision.NON_COMPLIANT && (
            <div>
              <label className="block text-sm font-medium text-red-700 mb-1">
                Motif de blocage <span className="text-red-500">*</span>
              </label>
              <textarea
                value={blockingReason}
                onChange={(e) => setBlockingReason(e.target.value)}
                rows={3}
                placeholder="Raison précise justifiant le blocage du lot…"
                className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          )}

          {decision === MarketReleaseDecision.COMPLIANT_WITH_RESERVATIONS && (
            <div>
              <label className="block text-sm font-medium text-yellow-800 mb-1">
                Réserves (une par ligne)
              </label>
              <textarea
                value={reservations}
                onChange={(e) => setReservations(e.target.value)}
                rows={3}
                placeholder={'DLC à vérifier avant distribution\nÉtiquette à corriger dans les 48h'}
                className="w-full rounded-lg border border-yellow-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <Link
            href="/market-release-decisions"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={loading || !batchId}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          >
            {loading ? 'Enregistrement…' : 'Créer la décision'}
          </button>
        </div>
      </form>
    </div>
  );
}
