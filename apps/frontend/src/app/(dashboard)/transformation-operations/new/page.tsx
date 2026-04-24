'use client';

import { toast } from 'sonner';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { authStorage } from '@/lib/auth';

interface InboundBatch {
  id: string;
  code: string;
  quantity: number;
  unit: string;
  product: { name: string };
  supplier: { name: string };
}

interface FormState {
  inboundBatchId: string;
  name: string;
  description: string;
  operationDate: string;
  site: string;
  yieldRate: string;
  operatorNotes: string;
}

const INITIAL: FormState = {
  inboundBatchId: '',
  name: '',
  description: '',
  operationDate: new Date().toISOString().slice(0, 16),
  site: '',
  yieldRate: '',
  operatorNotes: '',
};

export default function NewTransformationOpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState<FormState>({
    ...INITIAL,
    inboundBatchId: searchParams.get('inboundBatchId') ?? '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState<InboundBatch[]>([]);

  useEffect(() => {
    const token = authStorage.getAccessToken();
    fetch('/api/v1/inbound-batches?limit=100&status=ACCEPTED', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((j) => setBatches(j.data?.data ?? []))
      .catch(() => toast.error('Chargement des données de référence impossible'));
  }, []);

  const set =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
      if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    };

  const validate = () => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.inboundBatchId) errs.inboundBatchId = 'Sélectionnez un lot entrant ACCEPTED';
    if (!form.name.trim() || form.name.trim().length < 2)
      errs.name = 'Le nom doit comporter au moins 2 caractères';
    if (!form.operationDate) errs.operationDate = "La date d'opération est obligatoire";
    if (
      form.yieldRate &&
      (isNaN(Number(form.yieldRate)) || Number(form.yieldRate) < 0 || Number(form.yieldRate) > 100)
    )
      errs.yieldRate = 'Le taux doit être compris entre 0 et 100';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setGlobalError(null);
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch('/api/v1/transformation-operations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inboundBatchId: form.inboundBatchId,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          operationDate: new Date(form.operationDate).toISOString(),
          site: form.site.trim() || undefined,
          yieldRate: form.yieldRate ? Number(form.yieldRate) : undefined,
          operatorNotes: form.operatorNotes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(Array.isArray(err.message) ? err.message.join(', ') : err.message);
      }
      const json = await res.json();
      router.push(`/transformation-operations/${json.data.id}`);
    } catch (err) {
      setGlobalError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <nav className="flex items-center gap-1 text-sm text-gray-500">
        <Link
          href="/transformation-operations"
          className="hover:text-premium-accent flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Transformations
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-gray-700">Nouvelle opération</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nouvelle opération de transformation</h1>
        <p className="text-sm text-gray-500 mt-1">
          Seuls les lots entrants <strong>Acceptés</strong> peuvent être transformés.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-lg border border-gray-200 bg-white p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
            Paramètres de l'opération
          </h2>
          <div className="grid grid-cols-2 gap-5">
            <Field label="Lot entrant source (ACCEPTED) *" error={errors.inboundBatchId} wide>
              <select
                value={form.inboundBatchId}
                onChange={set('inboundBatchId')}
                className={inputCls(!!errors.inboundBatchId)}
              >
                <option value="">— Sélectionner un lot accepté —</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} — {b.product.name} — {b.quantity} {b.unit} ({b.supplier.name})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nom de l'opération *" error={errors.name} wide>
              <input
                type="text"
                value={form.name}
                onChange={set('name')}
                placeholder="Ex. Cuisson et mise en conserve"
                className={inputCls(!!errors.name)}
              />
            </Field>
            <Field label="Description">
              <input
                type="text"
                value={form.description}
                onChange={set('description')}
                placeholder="Détails du procédé…"
                className={inputCls(false)}
              />
            </Field>
            <Field label="Date d'opération *" error={errors.operationDate}>
              <input
                type="datetime-local"
                value={form.operationDate}
                onChange={set('operationDate')}
                className={inputCls(!!errors.operationDate)}
              />
            </Field>
            <Field label="Site de transformation">
              <input
                type="text"
                value={form.site}
                onChange={set('site')}
                placeholder="Ex. Atelier MCH — Mamoudzou"
                className={inputCls(false)}
              />
            </Field>
            <Field label="Taux de transformation (%)" error={errors.yieldRate}>
              <input
                type="number"
                value={form.yieldRate}
                onChange={set('yieldRate')}
                placeholder="72.5"
                min={0}
                max={100}
                step="0.1"
                className={inputCls(!!errors.yieldRate)}
              />
            </Field>
            <Field label="Notes de l'opérateur" wide>
              <textarea
                value={form.operatorNotes}
                onChange={set('operatorNotes')}
                rows={3}
                placeholder="Observations, incidents, paramètres process…"
                className={inputCls(false)}
              />
            </Field>
          </div>
        </section>

        {globalError && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{globalError}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pb-6">
          <Link
            href="/transformation-operations"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-gradient-iox-primary px-6 py-2 text-sm font-medium text-white hover:shadow-premium-md disabled:opacity-50"
          >
            {loading ? 'Enregistrement…' : "Créer l'opération"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  error,
  wide = false,
  children,
}: {
  label: string;
  error?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
function inputCls(e: boolean) {
  return `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-premium-accent/30 ${e ? 'border-red-400 bg-red-50' : 'border-gray-300'}`;
}
