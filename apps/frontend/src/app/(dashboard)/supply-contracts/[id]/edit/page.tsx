'use client';

import { toast } from 'sonner';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, AlertCircle, AlertTriangle } from 'lucide-react';
import { authStorage } from '@/lib/auth';

interface Company {
  id: string;
  code: string;
  name: string;
}
interface Product {
  id: string;
  code: string;
  name: string;
}

interface FormState {
  supplierId: string;
  startDate: string;
  endDate: string;
  volumeCommitted: string;
  unit: string;
  paymentTerms: string;
  notes: string;
  productIds: string[];
}

const EMPTY: FormState = {
  supplierId: '',
  startDate: '',
  endDate: '',
  volumeCommitted: '',
  unit: '',
  paymentTerms: '',
  notes: '',
  productIds: [],
};

export default function EditSupplyContractPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [contractCode, setContractCode] = useState('');
  const [suppliers, setSuppliers] = useState<Company[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Load suppliers + products
  useEffect(() => {
    const token = authStorage.getAccessToken();
    fetch('/api/v1/companies?limit=100&isActive=true', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((j) => setSuppliers(j.data?.data ?? []))
      .catch(() => toast.error('Chargement des données de référence impossible'));
    fetch('/api/v1/products?limit=100', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((j) => setProducts(j.data?.data ?? []))
      .catch(() => toast.error('Chargement des données de référence impossible'));
  }, []);

  const loadContract = useCallback(async () => {
    setFetchLoading(true);
    setFetchError(null);
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/supply-contracts/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(res.status === 404 ? 'Contrat introuvable' : 'Erreur serveur');
      const json = await res.json();
      const c = json.data;
      setContractCode(c.code);
      setForm({
        supplierId: c.supplier?.id ?? '',
        startDate: c.startDate ? c.startDate.slice(0, 10) : '',
        endDate: c.endDate ? c.endDate.slice(0, 10) : '',
        volumeCommitted: c.volumeCommitted != null ? String(c.volumeCommitted) : '',
        unit: c.unit ?? '',
        paymentTerms: c.paymentTerms ?? '',
        notes: c.notes ?? '',
        productIds: Array.isArray(c.products) ? c.products.map((p: Product) => p.id) : [],
      });
    } catch (err) {
      setFetchError((err as Error).message);
    } finally {
      setFetchLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadContract();
  }, [loadContract]);

  const set =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
      if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    };

  const toggleProduct = (id: string) => {
    setForm((prev) => ({
      ...prev,
      productIds: prev.productIds.includes(id)
        ? prev.productIds.filter((p) => p !== id)
        : [...prev.productIds, id],
    }));
  };

  const validate = () => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.supplierId) errs.supplierId = 'Sélectionnez un fournisseur';
    if (!form.startDate) errs.startDate = 'La date de début est obligatoire';
    if (form.endDate && form.startDate && form.endDate < form.startDate)
      errs.endDate = 'La date de fin doit être postérieure à la date de début';
    if (form.volumeCommitted && isNaN(Number(form.volumeCommitted)))
      errs.volumeCommitted = 'Doit être un nombre valide';
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
      const res = await fetch(`/api/v1/supply-contracts/${params.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: form.supplierId,
          startDate: form.startDate,
          endDate: form.endDate || undefined,
          volumeCommitted: form.volumeCommitted ? Number(form.volumeCommitted) : undefined,
          unit: form.unit.trim() || undefined,
          paymentTerms: form.paymentTerms.trim() || undefined,
          notes: form.notes.trim() || undefined,
          productIds: form.productIds.length > 0 ? form.productIds : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(Array.isArray(err.message) ? err.message.join(', ') : err.message);
      }
      router.push(`/supply-contracts/${params.id}`);
    } catch (err) {
      setGlobalError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading)
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-500">Chargement…</div>
    );
  if (fetchError)
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertTriangle className="h-8 w-8 text-red-400" />
        <p className="text-sm text-red-600">{fetchError}</p>
        <button onClick={() => router.back()} className="text-sm text-blue-600 hover:underline">
          Retour
        </button>
      </div>
    );

  return (
    <div className="max-w-2xl space-y-6">
      <nav className="flex items-center gap-1 text-sm text-gray-500">
        <Link href="/supply-contracts" className="hover:text-blue-600 flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Contrats
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link
          href={`/supply-contracts/${params.id}`}
          className="hover:text-blue-600 font-mono text-gray-700"
        >
          {contractCode}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-gray-700">Modifier</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Modifier le contrat</h1>
        <p className="text-sm text-gray-500 mt-1 font-mono">{contractCode}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-lg border border-gray-200 bg-white p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
            Paramètres du contrat
          </h2>
          <div className="grid grid-cols-2 gap-5">
            <Field label="Fournisseur *" error={errors.supplierId} wide>
              <select
                value={form.supplierId}
                onChange={set('supplierId')}
                className={inputCls(!!errors.supplierId)}
              >
                <option value="">— Sélectionner un fournisseur —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date de début *" error={errors.startDate}>
              <input
                type="date"
                value={form.startDate}
                onChange={set('startDate')}
                className={inputCls(!!errors.startDate)}
              />
            </Field>
            <Field label="Date de fin" error={errors.endDate}>
              <input
                type="date"
                value={form.endDate}
                onChange={set('endDate')}
                className={inputCls(!!errors.endDate)}
              />
            </Field>
            <Field label="Volume engagé" error={errors.volumeCommitted}>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={form.volumeCommitted}
                  onChange={set('volumeCommitted')}
                  placeholder="5000"
                  min={0}
                  className={`${inputCls(!!errors.volumeCommitted)} flex-1`}
                />
                <input
                  type="text"
                  value={form.unit}
                  onChange={set('unit')}
                  placeholder="kg"
                  className={`${inputCls(false)} w-20`}
                />
              </div>
            </Field>
            <Field label="Conditions de paiement" wide>
              <input
                type="text"
                value={form.paymentTerms}
                onChange={set('paymentTerms')}
                placeholder="Ex. 30 jours net fin de mois"
                className={inputCls(false)}
              />
            </Field>
            <Field label="Notes" wide>
              <textarea
                value={form.notes}
                onChange={set('notes')}
                rows={3}
                placeholder="Remarques, clauses particulières…"
                className={inputCls(false)}
              />
            </Field>
          </div>
        </section>

        {/* Produits couverts */}
        {products.length > 0 && (
          <section className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
            <div className="border-b border-gray-100 pb-3">
              <h2 className="text-base font-semibold text-gray-900">Produits couverts</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Sélectionnez les produits associés à ce contrat.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {products.map((p) => (
                <label
                  key={p.id}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                    form.productIds.includes(p.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.productIds.includes(p.id)}
                    onChange={() => toggleProduct(p.id)}
                    className="rounded text-blue-600"
                  />
                  <span className="text-xs">
                    <span className="font-mono text-blue-600">{p.code}</span>
                    <span className="ml-1.5 text-gray-700">{p.name}</span>
                  </span>
                </label>
              ))}
            </div>
            {form.productIds.length > 0 && (
              <p className="text-xs text-blue-600">
                {form.productIds.length} produit{form.productIds.length > 1 ? 's' : ''} sélectionné
                {form.productIds.length > 1 ? 's' : ''}
              </p>
            )}
          </section>
        )}

        {globalError && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{globalError}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pb-6">
          <Link
            href={`/supply-contracts/${params.id}`}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Enregistrement…' : 'Enregistrer les modifications'}
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

function inputCls(hasError: boolean) {
  return `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    hasError ? 'border-red-400 bg-red-50' : 'border-gray-300'
  }`;
}
