'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, AlertCircle, Save } from 'lucide-react';
import { authStorage } from '@/lib/auth';

export default function EditInboundBatchPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Read-only context info */
  const [code, setCode] = useState('');
  const [productName, setProductName] = useState('');
  const [supplierName, setSupplierName] = useState('');

  const [form, setForm] = useState({
    quantity: '',
    unit: '',
    origin: '',
    notes: '',
  });

  /* ── Chargement initial ───────────────────────────────────────────── */

  useEffect(() => {
    const token = authStorage.getAccessToken();
    fetch(`/api/v1/inbound-batches/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((json) => {
        const b = json.data ?? json;
        setCode(b.code ?? '');
        setProductName(b.product?.name ?? '');
        setSupplierName(b.supplier?.name ?? '');
        setForm({
          quantity: b.quantity != null ? String(b.quantity) : '',
          unit: b.unit ?? '',
          origin: b.origin ?? '',
          notes: b.notes ?? '',
        });
      })
      .catch(() => setError('Impossible de charger le lot'))
      .finally(() => setLoading(false));
  }, [id]);

  /* ── Helpers ─────────────────────────────────────────────────────── */

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  /* ── Soumission ──────────────────────────────────────────────────── */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(form.quantity);
    if (isNaN(qty) || qty <= 0) {
      setError('La quantité doit être un nombre positif');
      return;
    }
    if (!form.unit.trim()) {
      setError("L'unité est obligatoire");
      return;
    }

    setSaving(true);
    setError(null);
    const body: Record<string, unknown> = {
      quantity: qty,
      unit: form.unit.trim(),
      origin: form.origin.trim() || null,
      notes: form.notes.trim() || null,
    };

    try {
      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/inbound-batches/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(Array.isArray(err.message) ? err.message.join(', ') : err.message);
      }
      router.push(`/inbound-batches/${id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  /* ── Rendu ───────────────────────────────────────────────────────── */

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">Chargement…</div>
    );

  return (
    <div className="max-w-2xl space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-gray-500">
        <Link href="/inbound-batches" className="hover:text-blue-600 flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Lots entrants
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/inbound-batches/${id}`} className="hover:text-blue-600 font-mono">
          {code}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-gray-700">Modifier</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Modifier le lot entrant</h1>
        <p className="text-sm text-gray-500 mt-1">
          {productName && <span className="font-medium">{productName}</span>}
          {supplierName && <span className="text-gray-400"> · {supplierName}</span>}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-lg border border-gray-200 bg-white p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
            Quantité &amp; provenance
          </h2>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantité *</label>
              <input
                type="number"
                value={form.quantity}
                onChange={set('quantity')}
                step="0.001"
                min="0.001"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unité *</label>
              <input
                value={form.unit}
                onChange={set('unit')}
                required
                placeholder="kg, tonne, litre…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Origine</label>
              <input
                value={form.origin}
                onChange={set('origin')}
                placeholder="Ex. Mayotte — Petite-Terre"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={set('notes')}
                rows={3}
                placeholder="Remarques sur la réception, l'état du lot…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>
        </section>

        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pb-6">
          <Link
            href={`/inbound-batches/${id}`}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </button>
        </div>
      </form>
    </div>
  );
}
