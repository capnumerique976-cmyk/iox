'use client';

import { toast } from 'sonner';
import { notifyError } from '@/lib/notify';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { authStorage } from '@/lib/auth';

interface Product {
  id: string;
  code: string;
  name: string;
  status: string;
}

interface TransformationOp {
  id: string;
  code: string;
  name: string;
  inboundBatch: { product: { id: string; name: string } };
}

interface FormState {
  productId: string;
  transformationOpId: string;
  quantity: string;
  unit: string;
  productionDate: string;
  expiryDate: string;
  storageConditions: string;
  notes: string;
}

const INITIAL: FormState = {
  productId: '',
  transformationOpId: '',
  quantity: '',
  unit: 'kg',
  productionDate: new Date().toISOString().slice(0, 10),
  expiryDate: '',
  storageConditions: '',
  notes: '',
};

const UNITS = ['kg', 'g', 'L', 'mL', 'unité(s)', 'boîte(s)', 'sachet(s)', 'carton(s)'];

export default function NewProductBatchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const prefilledOpId = searchParams.get('transformationOpId') ?? '';
  const prefilledProductId = searchParams.get('productId') ?? '';

  const [form, setForm] = useState<FormState>({
    ...INITIAL,
    transformationOpId: prefilledOpId,
    productId: prefilledProductId,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [ops, setOps] = useState<TransformationOp[]>([]);
  const [prefilledOp, setPrefilledOp] = useState<TransformationOp | null>(null);

  useEffect(() => {
    const token = authStorage.getAccessToken();

    // Load products (COMPLIANT only)
    fetch('/api/v1/products?limit=100&status=COMPLIANT', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((j) => setProducts(j.data?.data ?? []))
      .catch((err) => notifyError(err, 'Chargement des données de référence impossible'));

    // Load transformation ops
    fetch('/api/v1/transformation-operations?limit=100', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((j) => setOps(j.data?.data ?? []))
      .catch((err) => notifyError(err, 'Chargement des données de référence impossible'));

    // If prefilled op, fetch its details to display context
    if (prefilledOpId) {
      fetch(`/api/v1/transformation-operations/${prefilledOpId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((j) => {
          if (j.data) setPrefilledOp(j.data);
        })
        .catch((err) => notifyError(err, 'Chargement des données de référence impossible'));
    }
  }, [prefilledOpId]);

  const set =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
      if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    };

  const validate = () => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.productId) errs.productId = 'Sélectionnez un produit';
    if (!form.quantity || isNaN(Number(form.quantity)) || Number(form.quantity) <= 0)
      errs.quantity = 'La quantité doit être un nombre positif';
    if (!form.unit.trim()) errs.unit = "L'unité est obligatoire";
    if (!form.productionDate) errs.productionDate = 'La date de production est obligatoire';
    if (form.expiryDate && form.expiryDate < form.productionDate)
      errs.expiryDate = 'La DLC ne peut pas être antérieure à la date de production';
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
      const res = await fetch('/api/v1/product-batches', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: form.productId,
          transformationOpId: form.transformationOpId || undefined,
          quantity: Number(form.quantity),
          unit: form.unit.trim(),
          productionDate: form.productionDate,
          expiryDate: form.expiryDate || undefined,
          storageConditions: form.storageConditions.trim() || undefined,
          notes: form.notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(Array.isArray(err.message) ? err.message.join(', ') : err.message);
      }
      const json = await res.json();
      router.push(`/product-batches/${json.data.id}`);
    } catch (err) {
      setGlobalError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <nav className="flex items-center gap-1 text-sm text-gray-500">
        <Link href="/product-batches" className="hover:text-premium-accent flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Lots finis
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-gray-700">Nouveau lot fini</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Créer un lot fini</h1>
        <p className="text-sm text-gray-500 mt-1">
          Seuls les produits au statut <strong>Conforme</strong> peuvent être associés à un lot
          fini.
        </p>
      </div>

      {/* Contexte transformation si pré-rempli */}
      {prefilledOp && (
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 text-sm">
          <p className="font-medium text-purple-800">Issu de l'opération de transformation</p>
          <p className="text-purple-700 mt-1">
            <span className="font-mono">{prefilledOp.code}</span> — {prefilledOp.name}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-lg border border-gray-200 bg-white p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
            Informations du lot
          </h2>
          <div className="grid grid-cols-2 gap-5">
            <Field label="Produit fini *" error={errors.productId} wide>
              <select
                value={form.productId}
                onChange={set('productId')}
                className={inputCls(!!errors.productId)}
              >
                <option value="">— Sélectionner un produit conforme —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Opération de transformation (optionnel)" wide>
              <select
                value={form.transformationOpId}
                onChange={set('transformationOpId')}
                className={inputCls(false)}
                disabled={!!prefilledOpId}
              >
                <option value="">— Aucune (lot créé manuellement) —</option>
                {ops.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.code} — {o.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Quantité *" error={errors.quantity}>
              <input
                type="number"
                value={form.quantity}
                onChange={set('quantity')}
                placeholder="350"
                min={0}
                step="0.001"
                className={inputCls(!!errors.quantity)}
              />
            </Field>

            <Field label="Unité *" error={errors.unit}>
              <select value={form.unit} onChange={set('unit')} className={inputCls(!!errors.unit)}>
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Date de production *" error={errors.productionDate}>
              <input
                type="date"
                value={form.productionDate}
                onChange={set('productionDate')}
                className={inputCls(!!errors.productionDate)}
              />
            </Field>

            <Field label="Date limite de consommation (DLC)" error={errors.expiryDate}>
              <input
                type="date"
                value={form.expiryDate}
                onChange={set('expiryDate')}
                min={form.productionDate}
                className={inputCls(!!errors.expiryDate)}
              />
            </Field>

            <Field label="Conditions de stockage" wide>
              <input
                type="text"
                value={form.storageConditions}
                onChange={set('storageConditions')}
                placeholder="Ex. Conserver entre 0°C et +4°C"
                className={inputCls(false)}
              />
            </Field>

            <Field label="Notes" wide>
              <textarea
                value={form.notes}
                onChange={set('notes')}
                rows={3}
                placeholder="Observations sur le lot…"
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
            href="/product-batches"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-gradient-iox-primary px-6 py-2 text-sm font-medium text-white hover:shadow-premium-md disabled:opacity-50"
          >
            {loading ? 'Enregistrement…' : 'Créer le lot'}
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
