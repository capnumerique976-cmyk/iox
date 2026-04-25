'use client';

import { toast } from 'sonner';
import { notifyError } from '@/lib/notify';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, AlertCircle } from 'lucide-react';
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

const INITIAL: FormState = {
  supplierId: '',
  startDate: '',
  endDate: '',
  volumeCommitted: '',
  unit: '',
  paymentTerms: '',
  notes: '',
  productIds: [],
};

export default function NewSupplyContractPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [form, setForm] = useState<FormState>({
    ...INITIAL,
    supplierId: searchParams.get('supplierId') ?? '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [suppliers, setSuppliers] = useState<Company[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const token = authStorage.getAccessToken();
    // Load active suppliers
    fetch('/api/v1/companies?limit=100&isActive=true', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((j) => setSuppliers(j.data?.data ?? []))
      .catch((err) => notifyError(err, 'Chargement des données de référence impossible'));
    // Load available products
    fetch('/api/v1/products?limit=100', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((j) => setProducts(j.data?.data ?? []))
      .catch((err) => notifyError(err, 'Chargement des données de référence impossible'));
  }, []);

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

    const payload = {
      supplierId: form.supplierId,
      startDate: form.startDate,
      endDate: form.endDate || undefined,
      volumeCommitted: form.volumeCommitted ? Number(form.volumeCommitted) : undefined,
      unit: form.unit.trim() || undefined,
      paymentTerms: form.paymentTerms.trim() || undefined,
      notes: form.notes.trim() || undefined,
      productIds: form.productIds.length > 0 ? form.productIds : undefined,
    };

    try {
      const token = authStorage.getAccessToken();
      const res = await fetch('/api/v1/supply-contracts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(Array.isArray(err.message) ? err.message.join(', ') : err.message);
      }
      const json = await res.json();
      router.push(`/supply-contracts/${json.data.id}`);
    } catch (err) {
      setGlobalError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <nav className="flex items-center gap-1 text-sm text-gray-500">
        <Link href="/supply-contracts" className="hover:text-premium-accent flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Contrats
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-gray-700">Nouveau contrat</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nouveau contrat d'approvisionnement</h1>
        <p className="text-sm text-gray-500 mt-1">
          Le contrat sera créé au statut <strong>Brouillon</strong>.
        </p>
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
                Sélectionnez les produits associés à ce contrat (optionnel).
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {products.map((p) => (
                <label
                  key={p.id}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                    form.productIds.includes(p.id)
                      ? 'border-premium-accent/60 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.productIds.includes(p.id)}
                    onChange={() => toggleProduct(p.id)}
                    className="rounded text-premium-accent"
                  />
                  <span className="text-xs">
                    <span className="font-mono text-premium-accent">{p.code}</span>
                    <span className="ml-1.5 text-gray-700">{p.name}</span>
                  </span>
                </label>
              ))}
            </div>
            {form.productIds.length > 0 && (
              <p className="text-xs text-premium-accent">
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
            href="/supply-contracts"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-gradient-iox-primary px-6 py-2 text-sm font-medium text-white hover:shadow-premium-md disabled:opacity-50"
          >
            {loading ? 'Création…' : 'Créer le contrat'}
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
  return `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-premium-accent/30 ${
    hasError ? 'border-red-400 bg-red-50' : 'border-gray-300'
  }`;
}
