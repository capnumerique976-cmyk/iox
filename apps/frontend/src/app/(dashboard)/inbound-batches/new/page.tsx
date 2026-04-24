'use client';

import { toast } from 'sonner';

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
interface Contract {
  id: string;
  code: string;
  status: string;
  supplier: { id: string; name: string };
}

interface FormState {
  supplierId: string;
  productId: string;
  supplyContractId: string;
  receivedAt: string;
  quantity: string;
  unit: string;
  origin: string;
  notes: string;
}

const INITIAL: FormState = {
  supplierId: '',
  productId: '',
  supplyContractId: '',
  receivedAt: new Date().toISOString().slice(0, 16),
  quantity: '',
  unit: 'kg',
  origin: '',
  notes: '',
};

export default function NewInboundBatchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [form, setForm] = useState<FormState>({
    ...INITIAL,
    supplierId: searchParams.get('supplierId') ?? '',
    supplyContractId: searchParams.get('supplyContractId') ?? '',
    productId: searchParams.get('productId') ?? '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [suppliers, setSuppliers] = useState<Company[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);

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
    fetch('/api/v1/supply-contracts?limit=100&status=ACTIVE', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((j) => setContracts(j.data?.data ?? []))
      .catch(() => toast.error('Chargement des données de référence impossible'));
  }, []);

  // Pré-remplir le fournisseur depuis le contrat sélectionné
  const handleContractChange = (contractId: string) => {
    const contract = contracts.find((c) => c.id === contractId);
    setForm((prev) => ({
      ...prev,
      supplyContractId: contractId,
      supplierId: contract?.supplier?.id ?? prev.supplierId,
    }));
  };

  const set =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
      if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    };

  const validate = () => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.supplierId) errs.supplierId = 'Sélectionnez un fournisseur';
    if (!form.productId) errs.productId = 'Sélectionnez un produit';
    if (!form.receivedAt) errs.receivedAt = 'La date de réception est obligatoire';
    if (!form.quantity || isNaN(Number(form.quantity)) || Number(form.quantity) <= 0)
      errs.quantity = 'La quantité doit être un nombre positif';
    if (!form.unit.trim()) errs.unit = "L'unité est obligatoire";
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
      productId: form.productId,
      supplyContractId: form.supplyContractId || undefined,
      receivedAt: new Date(form.receivedAt).toISOString(),
      quantity: Number(form.quantity),
      unit: form.unit.trim(),
      origin: form.origin.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    try {
      const token = authStorage.getAccessToken();
      const res = await fetch('/api/v1/inbound-batches', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(Array.isArray(err.message) ? err.message.join(', ') : err.message);
      }
      const json = await res.json();
      router.push(`/inbound-batches/${json.data.id}`);
    } catch (err) {
      setGlobalError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const COMMON_UNITS = ['kg', 'g', 'tonne', 'L', 'mL', 'unité', 'boîte', 'caisse', 'palette'];

  return (
    <div className="max-w-2xl space-y-6">
      <nav className="flex items-center gap-1 text-sm text-gray-500">
        <Link href="/inbound-batches" className="hover:text-blue-600 flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Lots entrants
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-gray-700">Nouvelle réception</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Enregistrer une réception</h1>
        <p className="text-sm text-gray-500 mt-1">
          Le lot sera créé au statut <strong>Reçu</strong>. Le contrôle qualité se déclenchera
          ensuite.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-lg border border-gray-200 bg-white p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
            Informations de réception
          </h2>

          <div className="grid grid-cols-2 gap-5">
            {/* Contrat (optionnel — pré-remplit le fournisseur) */}
            <Field label="Contrat d'approvisionnement" wide>
              <select
                value={form.supplyContractId}
                onChange={(e) => handleContractChange(e.target.value)}
                className={inputCls(false)}
              >
                <option value="">— Aucun (réception hors contrat) —</option>
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.supplier?.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Fournisseur *" error={errors.supplierId}>
              <select
                value={form.supplierId}
                onChange={set('supplierId')}
                className={inputCls(!!errors.supplierId)}
              >
                <option value="">— Sélectionner —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Produit *" error={errors.productId}>
              <select
                value={form.productId}
                onChange={set('productId')}
                className={inputCls(!!errors.productId)}
              >
                <option value="">— Sélectionner —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Date et heure de réception *" error={errors.receivedAt}>
              <input
                type="datetime-local"
                value={form.receivedAt}
                onChange={set('receivedAt')}
                className={inputCls(!!errors.receivedAt)}
              />
            </Field>

            <Field label="Quantité *" error={errors.quantity}>
              <input
                type="number"
                value={form.quantity}
                onChange={set('quantity')}
                placeholder="500"
                min={0}
                step="0.01"
                className={inputCls(!!errors.quantity)}
              />
            </Field>

            <Field label="Unité *" error={errors.unit}>
              <div className="flex gap-2">
                <select
                  value={form.unit}
                  onChange={set('unit')}
                  className={`${inputCls(!!errors.unit)} flex-1`}
                >
                  {COMMON_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={form.unit}
                  onChange={set('unit')}
                  placeholder="autre…"
                  className={`${inputCls(false)} w-24`}
                />
              </div>
            </Field>

            <Field label="Origine" wide>
              <input
                type="text"
                value={form.origin}
                onChange={set('origin')}
                placeholder="Ex. Mayotte — Petite-Terre, Madagascar…"
                className={inputCls(false)}
              />
            </Field>

            <Field label="Notes" wide>
              <textarea
                value={form.notes}
                onChange={set('notes')}
                rows={3}
                placeholder="Observations à la réception, conditions de transport…"
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
            href="/inbound-batches"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Enregistrement…' : 'Enregistrer la réception'}
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
