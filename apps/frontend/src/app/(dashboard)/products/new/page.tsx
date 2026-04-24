'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, AlertCircle } from 'lucide-react';
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
  // Fiche technique
  ingredients: string;
  allergens: string; // comma-separated input
  shelfLife: string;
  storageConditions: string;
  labelingInfo: string;
  nutritionalInfo: string;
  technicalNotes: string;
}

const INITIAL: FormState = {
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

export default function NewProductPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [beneLoading, setBeneLoading] = useState(true);

  // Load beneficiaries for the selector
  useEffect(() => {
    const load = async () => {
      try {
        const token = authStorage.getAccessToken();
        const res = await fetch('/api/v1/beneficiaries?limit=100&status=IN_PROGRESS', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error();
        const json = await res.json();
        setBeneficiaries(json.data.data ?? []);
      } catch {
        // Non-blocking — user can still type manually
      } finally {
        setBeneLoading(false);
      }
    };
    load();
  }, []);

  const set =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
      if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim() || form.name.trim().length < 2)
      newErrors.name = 'Le nom doit comporter au moins 2 caractères';
    if (!form.category.trim()) newErrors.category = 'La catégorie est obligatoire';
    if (!form.beneficiaryId) newErrors.beneficiaryId = 'Veuillez sélectionner un bénéficiaire';
    if (form.productionCapacity && isNaN(Number(form.productionCapacity)))
      newErrors.productionCapacity = 'Doit être un nombre valide';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
      const res = await fetch('/api/v1/products', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        const msg = Array.isArray(err.message) ? err.message.join(', ') : err.message;
        throw new Error(msg ?? 'Erreur lors de la création');
      }

      const json = await res.json();
      router.push(`/products/${json.data.id}`);
    } catch (err) {
      setGlobalError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-gray-500">
        <Link href="/products" className="hover:text-blue-600 flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" />
          Produits
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-gray-700">Nouveau produit</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nouveau produit</h1>
        <p className="text-sm text-gray-500 mt-1">
          Le produit sera créé au statut <strong>Brouillon</strong> et pourra être enrichi.
        </p>
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
                disabled={beneLoading}
                className={inputCls(!!errors.beneficiaryId)}
              >
                <option value="">— {beneLoading ? 'Chargement…' : 'Sélectionner'} —</option>
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

            <FormField label="Origine" error={errors.origin}>
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

        {/* Global error */}
        {globalError && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{globalError}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-6">
          <Link
            href="/products"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Création en cours…' : 'Créer le produit'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---- Sub-components ----
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
  return `w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    hasError ? 'border-red-400 bg-red-50' : 'border-gray-300'
  }`;
}
