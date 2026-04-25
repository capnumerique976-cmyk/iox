'use client';

import { toast } from 'sonner';
import { notifyError } from '@/lib/notify';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, AlertCircle, Plus, Trash2, Search } from 'lucide-react';
import { authStorage } from '@/lib/auth';

interface Beneficiary {
  id: string;
  code: string;
  name: string;
}
interface ProductBatch {
  id: string;
  code: string;
  status: string;
  quantity: number;
  unit: string;
  product: { name: string };
}

interface LineForm {
  productBatchId: string;
  quantity: string;
  unit: string;
  notes: string;
  _batch?: ProductBatch;
}

export default function NewDistributionPage() {
  const router = useRouter();

  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [availableBatches, setAvailableBatches] = useState<ProductBatch[]>([]);
  const [batchSearch, setBatchSearch] = useState('');

  const [beneficiaryId, setBeneficiaryId] = useState('');
  const [distributionDate, setDistributionDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineForm[]>([]);

  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = authStorage.getAccessToken();
    fetch('/api/v1/beneficiaries?limit=100&status=IN_PROGRESS', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((j) => setBeneficiaries(j.data?.data ?? []))
      .catch((err) => notifyError(err, 'Chargement des données de référence impossible'));

    fetch('/api/v1/product-batches?limit=100&status=AVAILABLE', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((j) => setAvailableBatches(j.data?.data ?? []))
      .catch((err) => notifyError(err, 'Chargement des données de référence impossible'));
  }, []);

  const filteredBatches = availableBatches.filter(
    (b) =>
      !lines.some((l) => l.productBatchId === b.id) &&
      (batchSearch === '' ||
        b.code.toLowerCase().includes(batchSearch.toLowerCase()) ||
        b.product.name.toLowerCase().includes(batchSearch.toLowerCase())),
  );

  const addLine = (batch: ProductBatch) => {
    setLines((prev) => [
      ...prev,
      {
        productBatchId: batch.id,
        quantity: String(batch.quantity),
        unit: batch.unit,
        notes: '',
        _batch: batch,
      },
    ]);
  };

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, field: keyof LineForm, value: string) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!beneficiaryId) {
      setGlobalError('Sélectionnez un bénéficiaire');
      return;
    }
    if (lines.length === 0) {
      setGlobalError('Ajoutez au moins un lot');
      return;
    }
    for (const l of lines) {
      if (!l.quantity || isNaN(Number(l.quantity)) || Number(l.quantity) <= 0) {
        setGlobalError(`Quantité invalide pour le lot ${l._batch?.code}`);
        return;
      }
    }
    setLoading(true);
    setGlobalError(null);
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch('/api/v1/distributions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beneficiaryId,
          distributionDate,
          notes: notes.trim() || undefined,
          lines: lines.map((l) => ({
            productBatchId: l.productBatchId,
            quantity: Number(l.quantity),
            unit: l.unit,
            notes: l.notes.trim() || undefined,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(Array.isArray(err.message) ? err.message.join(', ') : err.message);
      }
      const json = await res.json();
      router.push(`/distributions/${json.id ?? json.data?.id}`);
    } catch (err) {
      setGlobalError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <nav className="flex items-center gap-1 text-sm text-gray-500">
        <Link href="/distributions" className="hover:text-premium-accent flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Distributions
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-gray-700">Nouvelle distribution</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nouvelle distribution</h1>
        <p className="text-sm text-gray-500 mt-1">
          Associez des lots finis disponibles à un bénéficiaire.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1 — Infos générales */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
            Informations générales
          </h2>
          <div className="grid grid-cols-2 gap-5">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Bénéficiaire *</label>
              <select
                value={beneficiaryId}
                onChange={(e) => setBeneficiaryId(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-premium-accent/30 ${!beneficiaryId ? 'border-gray-300' : 'border-gray-300'}`}
              >
                <option value="">— Sélectionner un bénéficiaire —</option>
                {beneficiaries.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de distribution *
              </label>
              <input
                type="date"
                value={distributionDate}
                onChange={(e) => setDistributionDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-premium-accent/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Remarques éventuelles…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-premium-accent/30"
              />
            </div>
          </div>
        </section>

        {/* Section 2 — Lots à distribuer */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 space-y-5">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="text-base font-semibold text-gray-900">Lots finis à distribuer</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Seuls les lots avec le statut <strong>Disponible</strong> peuvent être sélectionnés.
            </p>
          </div>

          {/* Lignes sélectionnées */}
          {lines.length > 0 && (
            <div className="space-y-3">
              {lines.map((line, idx) => (
                <div key={idx} className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="font-mono text-sm font-semibold text-blue-700">
                        {line._batch?.code}
                      </span>
                      <span className="ml-2 text-sm text-gray-600">
                        {line._batch?.product.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Quantité distribuée *
                        <span className="ml-1 font-normal text-gray-400">
                          (disponible : {line._batch?.quantity} {line._batch?.unit})
                        </span>
                      </label>
                      <input
                        type="number"
                        value={line.quantity}
                        onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                        min={0.01}
                        step={0.01}
                        className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-premium-accent/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Unité</label>
                      <input
                        type="text"
                        value={line.unit}
                        onChange={(e) => updateLine(idx, 'unit', e.target.value)}
                        className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-premium-accent/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                      <input
                        type="text"
                        value={line.notes}
                        onChange={(e) => updateLine(idx, 'notes', e.target.value)}
                        placeholder="Optionnel"
                        className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-premium-accent/30"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Picker de lots */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-medium text-gray-700">Ajouter un lot</h3>
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  value={batchSearch}
                  onChange={(e) => setBatchSearch(e.target.value)}
                  placeholder="Rechercher…"
                  className="w-full rounded-lg border border-gray-300 pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-premium-accent/30"
                />
              </div>
            </div>
            {filteredBatches.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                {availableBatches.length === 0 ? 'Aucun lot disponible' : 'Aucun lot correspondant'}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {filteredBatches.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => addLine(b)}
                    className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5 text-left hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  >
                    <div>
                      <p className="font-mono text-xs font-semibold text-premium-accent">{b.code}</p>
                      <p className="text-xs text-gray-600 truncate">{b.product.name}</p>
                    </div>
                    <div className="text-right ml-2">
                      <p className="text-xs font-medium text-gray-700">
                        {Number(b.quantity).toLocaleString('fr-FR')} {b.unit}
                      </p>
                      <Plus className="h-3.5 w-3.5 text-blue-500 ml-auto" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {globalError && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{globalError}</p>
          </div>
        )}

        <div className="flex items-center justify-between pb-6">
          <p className="text-sm text-gray-500">
            {lines.length > 0
              ? `${lines.length} lot${lines.length > 1 ? 's' : ''} sélectionné${lines.length > 1 ? 's' : ''}`
              : 'Aucun lot sélectionné'}
          </p>
          <div className="flex gap-3">
            <Link
              href="/distributions"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </Link>
            <button
              type="submit"
              disabled={loading || lines.length === 0 || !beneficiaryId}
              className="rounded-lg bg-gradient-iox-primary px-6 py-2 text-sm font-medium text-white hover:shadow-premium-md disabled:opacity-50"
            >
              {loading ? 'Création…' : 'Créer la distribution'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
