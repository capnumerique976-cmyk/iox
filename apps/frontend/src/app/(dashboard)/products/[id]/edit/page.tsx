'use client';

import { toast } from 'sonner';
import { notifyError } from '@/lib/notify';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, AlertCircle, AlertTriangle } from 'lucide-react';
import { authStorage } from '@/lib/auth';

interface Beneficiary {
  id: string;
  code: string;
  name: string;
}

interface FormState {
  name: string;
  commercialName: string;
  category: string;
  description: string;
  beneficiaryId: string;
  origin: string;
  transformationSite: string;
  packagingSpec: string;
  productionCapacity: string;
  unit: string;
  ingredients: string;
  allergens: string;
  shelfLife: string;
  storageConditions: string;
  labelingInfo: string;
  nutritionalInfo: string;
  technicalNotes: string;
}

const EMPTY: FormState = {
  name: '',
  commercialName: '',
  category: '',
  description: '',
  beneficiaryId: '',
  origin: '',
  transformationSite: '',
  packagingSpec: '',
  productionCapacity: '',
  unit: '',
  ingredients: '',
  allergens: '',
  shelfLife: '',
  storageConditions: '',
  labelingInfo: '',
  nutritionalInfo: '',
  technicalNotes: '',
};

const CATEGORIES = [
  'conserve',
  'épice',
  'poisson',
  'artisanat',
  'cosmétique',
  'fruit & légume',
  'boisson',
  'confiserie',
  'autre',
];

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [productCode, setProductCode] = useState('');

  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);

  // Load beneficiaries for selector
  useEffect(() => {
    const token = authStorage.getAccessToken();
    fetch('/api/v1/beneficiaries?limit=100', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((j) => setBeneficiaries(j.data?.data ?? []))
      .catch((err) => notifyError(err, 'Chargement des données de référence impossible'));
  }, []);

  const loadProduct = useCallback(async () => {
    setFetchLoading(true);
    setFetchError(null);
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/products/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(res.status === 404 ? 'Produit introuvable' : 'Erreur serveur — réessayez dans quelques instants');
      const json = await res.json();
      const p = json.data;
      setProductCode(p.code);
      setForm({
        name: p.name ?? '',
        commercialName: p.commercialName ?? '',
        category: p.category ?? '',
        description: p.description ?? '',
        beneficiaryId: p.beneficiary?.id ?? '',
        origin: p.origin ?? '',
        transformationSite: p.transformationSite ?? '',
        packagingSpec: p.packagingSpec ?? '',
        productionCapacity: p.productionCapacity != null ? String(p.productionCapacity) : '',
        unit: p.unit ?? '',
        ingredients: p.ingredients ?? '',
        allergens: Array.isArray(p.allergens) ? p.allergens.join(', ') : '',
        shelfLife: p.shelfLife ?? '',
        storageConditions: p.storageConditions ?? '',
        labelingInfo: p.labelingInfo ?? '',
        nutritionalInfo: p.nutritionalInfo ?? '',
        technicalNotes: p.technicalNotes ?? '',
      });
    } catch (err) {
      setFetchError((err as Error).message);
    } finally {
      setFetchLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const set =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
      if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim() || form.name.trim().length < 2)
      errs.name = 'Le nom doit comporter au moins 2 caractères';
    if (!form.category.trim()) errs.category = 'La catégorie est obligatoire';
    if (!form.beneficiaryId) errs.beneficiaryId = 'Veuillez sélectionner un bénéficiaire';
    if (form.productionCapacity && isNaN(Number(form.productionCapacity)))
      errs.productionCapacity = 'Doit être un nombre valide';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setGlobalError(null);

    const allergens = form.allergens
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);
    const payload = {
      name: form.name.trim(),
      commercialName: form.commercialName.trim() || undefined,
      category: form.category.trim(),
      description: form.description.trim() || undefined,
      beneficiaryId: form.beneficiaryId,
      origin: form.origin.trim() || undefined,
      transformationSite: form.transformationSite.trim() || undefined,
      packagingSpec: form.packagingSpec.trim() || undefined,
      productionCapacity: form.productionCapacity ? Number(form.productionCapacity) : undefined,
      unit: form.unit.trim() || undefined,
      ingredients: form.ingredients.trim() || undefined,
      allergens: allergens.length > 0 ? allergens : undefined,
      shelfLife: form.shelfLife.trim() || undefined,
      storageConditions: form.storageConditions.trim() || undefined,
      labelingInfo: form.labelingInfo.trim() || undefined,
      nutritionalInfo: form.nutritionalInfo.trim() || undefined,
      technicalNotes: form.technicalNotes.trim() || undefined,
    };

    try {
      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/products/${params.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(Array.isArray(err.message) ? err.message.join(', ') : err.message);
      }
      router.push(`/products/${params.id}`);
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
        <button onClick={() => router.back()} className="text-sm text-premium-accent hover:underline">
          Retour
        </button>
      </div>
    );

  return (
    <div className="max-w-3xl space-y-6">
      <nav className="flex items-center gap-1 text-sm text-gray-500">
        <Link href="/products" className="hover:text-premium-accent flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Produits
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link
          href={`/products/${params.id}`}
          className="hover:text-premium-accent font-mono text-gray-700"
        >
          {productCode}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-gray-700">Modifier</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Modifier le produit</h1>
        <p className="text-sm text-gray-500 mt-1 font-mono">{productCode}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1 — Informations générales */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
            Informations générales
          </h2>
          <div className="grid grid-cols-2 gap-5">
            <FormField label="Nom du produit *" error={errors.name} wide>
              <input
                type="text"
                value={form.name}
                onChange={set('name')}
                placeholder="Ex. Rougail de mangue"
                className={inputCls(!!errors.name)}
              />
            </FormField>
            <FormField label="Nom commercial" error={errors.commercialName}>
              <input
                type="text"
                value={form.commercialName}
                onChange={set('commercialName')}
                placeholder="Ex. Rougail Bio Mayotte"
                className={inputCls(false)}
              />
            </FormField>
            <FormField label="Catégorie *" error={errors.category}>
              <select
                value={form.category}
                onChange={set('category')}
                className={inputCls(!!errors.category)}
              >
                <option value="">— Choisir une catégorie —</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Bénéficiaire propriétaire *" error={errors.beneficiaryId}>
              <select
                value={form.beneficiaryId}
                onChange={set('beneficiaryId')}
                className={inputCls(!!errors.beneficiaryId)}
              >
                <option value="">— Sélectionner —</option>
                {beneficiaries.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Description" wide>
              <textarea
                value={form.description}
                onChange={set('description')}
                rows={3}
                placeholder="Description libre du produit…"
                className={inputCls(false)}
              />
            </FormField>
            <FormField label="Origine">
              <input
                type="text"
                value={form.origin}
                onChange={set('origin')}
                placeholder="Ex. Mangues de Madagascar"
                className={inputCls(false)}
              />
            </FormField>
            <FormField label="Site de transformation">
              <input
                type="text"
                value={form.transformationSite}
                onChange={set('transformationSite')}
                placeholder="Ex. Atelier MCH — Mamoudzou"
                className={inputCls(false)}
              />
            </FormField>
            <FormField label="Emballage / Conditionnement">
              <input
                type="text"
                value={form.packagingSpec}
                onChange={set('packagingSpec')}
                placeholder="Ex. Pot verre 200g"
                className={inputCls(false)}
              />
            </FormField>
            <FormField label="Capacité de production" error={errors.productionCapacity}>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={form.productionCapacity}
                  onChange={set('productionCapacity')}
                  placeholder="500"
                  min={0}
                  className={`${inputCls(!!errors.productionCapacity)} flex-1`}
                />
                <input
                  type="text"
                  value={form.unit}
                  onChange={set('unit')}
                  placeholder="unité"
                  className={`${inputCls(false)} w-24`}
                />
              </div>
            </FormField>
          </div>
        </section>

        {/* Section 2 — Fiche technique */}
        <section className="rounded-lg border border-gray-200 bg-white p-6 space-y-5">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="text-base font-semibold text-gray-900">Fiche technique</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Toute modification de l'emballage, étiquetage ou ingrédients incrémentera
              automatiquement la version.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <FormField label="Ingrédients" wide>
              <textarea
                value={form.ingredients}
                onChange={set('ingredients')}
                rows={3}
                placeholder="Liste des ingrédients dans l'ordre décroissant de poids…"
                className={inputCls(false)}
              />
            </FormField>
            <FormField label="Allergènes" hint="Séparés par des virgules" wide>
              <input
                type="text"
                value={form.allergens}
                onChange={set('allergens')}
                placeholder="gluten, sulfites, crustacés…"
                className={inputCls(false)}
              />
            </FormField>
            <FormField label="Durée de conservation (DLC / DLUO)">
              <input
                type="text"
                value={form.shelfLife}
                onChange={set('shelfLife')}
                placeholder="Ex. 18 mois"
                className={inputCls(false)}
              />
            </FormField>
            <FormField label="Conditions de stockage">
              <input
                type="text"
                value={form.storageConditions}
                onChange={set('storageConditions')}
                placeholder="Ex. Conserver à l'abri de la lumière"
                className={inputCls(false)}
              />
            </FormField>
            <FormField label="Informations d'étiquetage" wide>
              <textarea
                value={form.labelingInfo}
                onChange={set('labelingInfo')}
                rows={2}
                placeholder="Mentions obligatoires, certifications, labels…"
                className={inputCls(false)}
              />
            </FormField>
            <FormField label="Informations nutritionnelles" wide>
              <textarea
                value={form.nutritionalInfo}
                onChange={set('nutritionalInfo')}
                rows={2}
                placeholder="Tableau de valeurs nutritionnelles (pour 100g)…"
                className={inputCls(false)}
              />
            </FormField>
            <FormField label="Notes techniques" wide>
              <textarea
                value={form.technicalNotes}
                onChange={set('technicalNotes')}
                rows={2}
                placeholder="Remarques internes, contraintes réglementaires…"
                className={inputCls(false)}
              />
            </FormField>
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
            href={`/products/${params.id}`}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-gradient-iox-primary px-6 py-2 text-sm font-medium text-white hover:shadow-premium-md disabled:opacity-50"
          >
            {loading ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </button>
        </div>
      </form>
    </div>
  );
}

function FormField({
  label,
  hint,
  error,
  wide = false,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {hint && <span className="ml-1 text-xs font-normal text-gray-400">— {hint}</span>}
      </label>
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
