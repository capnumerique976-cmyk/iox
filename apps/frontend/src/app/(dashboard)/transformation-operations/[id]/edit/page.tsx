'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, AlertCircle, Save } from 'lucide-react';
import { authStorage } from '@/lib/auth';

export default function EditTransformationOpPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Context (read-only) */
  const [code, setCode] = useState('');
  const [productName, setProductName] = useState('');

  const [form, setForm] = useState({
    name: '',
    description: '',
    operationDate: '',
    site: '',
    yieldRate: '',
    operatorNotes: '',
  });

  /* ── Chargement ──────────────────────────────────────────────────── */

  useEffect(() => {
    const token = authStorage.getAccessToken();
    fetch(`/api/v1/transformation-operations/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((json) => {
        const op = json.data ?? json;
        setCode(op.code ?? '');
        setProductName(op.inboundBatch?.product?.name ?? '');
        setForm({
          name: op.name ?? '',
          description: op.description ?? '',
          operationDate: op.operationDate ? op.operationDate.slice(0, 10) : '',
          site: op.site ?? '',
          yieldRate: op.yieldRate != null ? String(op.yieldRate) : '',
          operatorNotes: op.operatorNotes ?? '',
        });
      })
      .catch(() => setError("Impossible de charger l'opération"))
      .finally(() => setLoading(false));
  }, [id]);

  /* ── Helpers ─────────────────────────────────────────────────────── */

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  /* ── Soumission ──────────────────────────────────────────────────── */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Le nom est obligatoire');
      return;
    }
    if (!form.operationDate) {
      setError("La date d'opération est obligatoire");
      return;
    }

    const body: Record<string, unknown> = {
      name: form.name.trim(),
      operationDate: form.operationDate,
      description: form.description.trim() || null,
      site: form.site.trim() || null,
      operatorNotes: form.operatorNotes.trim() || null,
    };
    if (form.yieldRate !== '') {
      const yr = parseFloat(form.yieldRate);
      if (!isNaN(yr) && yr >= 0 && yr <= 100) body.yieldRate = yr;
      else {
        setError('Le taux de transformation doit être compris entre 0 et 100');
        return;
      }
    } else {
      body.yieldRate = null;
    }

    setSaving(true);
    setError(null);
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/transformation-operations/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(Array.isArray(err.message) ? err.message.join(', ') : err.message);
      }
      router.push(`/transformation-operations/${id}`);
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
        <Link
          href="/transformation-operations"
          className="hover:text-blue-600 flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Transformations
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/transformation-operations/${id}`} className="hover:text-blue-600 font-mono">
          {code}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-gray-700">Modifier</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Modifier l'opération</h1>
        {productName && <p className="text-sm text-gray-500 mt-1">{productName}</p>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1 — Informations générales */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
            Informations générales
          </h2>
          <div className="grid grid-cols-2 gap-5">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de l'opération *
              </label>
              <input
                required
                value={form.name}
                onChange={set('name')}
                placeholder="Cuisson et mise en conserve"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date d'opération *
              </label>
              <input
                type="date"
                required
                value={form.operationDate}
                onChange={set('operationDate')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site / atelier</label>
              <input
                value={form.site}
                onChange={set('site')}
                placeholder="Atelier MCH — Mamoudzou"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={set('description')}
                rows={3}
                placeholder="Décrivez les étapes ou spécificités de l'opération…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>
        </section>

        {/* Section 2 — Rendement & notes */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
            Rendement &amp; notes opérateur
          </h2>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Taux de transformation
                <span className="ml-1 font-normal text-gray-400">(0 – 100 %)</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={form.yieldRate}
                  onChange={set('yieldRate')}
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="Ex. 72.5"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  %
                </span>
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes opérateur
              </label>
              <textarea
                value={form.operatorNotes}
                onChange={set('operatorNotes')}
                rows={3}
                placeholder="Observations pendant l'opération, incidents mineurs, ajustements…"
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
            href={`/transformation-operations/${id}`}
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
