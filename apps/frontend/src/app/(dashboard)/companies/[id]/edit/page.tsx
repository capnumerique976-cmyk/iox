'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, AlertCircle, AlertTriangle } from 'lucide-react';
import { CompanyType } from '@iox/shared';
import { authStorage } from '@/lib/auth';

const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
  [CompanyType.SUPPLIER]: 'Fournisseur',
  [CompanyType.COOPERATIVE]: 'Coopérative',
  [CompanyType.BUYER]: 'Acheteur',
  [CompanyType.PARTNER]: 'Partenaire',
  [CompanyType.INSTITUTIONAL]: 'Institutionnel',
};
const ALL_TYPES = Object.values(CompanyType);

interface FormState {
  name: string;
  types: CompanyType[];
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  vatNumber: string;
  website: string;
  notes: string;
  isActive: boolean;
}

const EMPTY: FormState = {
  name: '',
  types: [],
  email: '',
  phone: '',
  address: '',
  city: '',
  country: 'FR',
  vatNumber: '',
  website: '',
  notes: '',
  isActive: true,
};

export default function EditCompanyPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [companyCode, setCompanyCode] = useState('');

  const loadCompany = useCallback(async () => {
    setFetchLoading(true);
    setFetchError(null);
    try {
      const token = authStorage.getAccessToken();
      const res = await fetch(`/api/v1/companies/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok)
        throw new Error(res.status === 404 ? 'Entreprise introuvable' : 'Erreur serveur');
      const json = await res.json();
      const c = json.data;
      setCompanyCode(c.code);
      setForm({
        name: c.name ?? '',
        types: c.types ?? [],
        email: c.email ?? '',
        phone: c.phone ?? '',
        address: c.address ?? '',
        city: c.city ?? '',
        country: c.country ?? 'FR',
        vatNumber: c.vatNumber ?? '',
        website: c.website ?? '',
        notes: c.notes ?? '',
        isActive: c.isActive ?? true,
      });
    } catch (err) {
      setFetchError((err as Error).message);
    } finally {
      setFetchLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadCompany();
  }, [loadCompany]);

  const set =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
      if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    };

  const toggleType = (type: CompanyType) => {
    setForm((prev) => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter((t) => t !== type)
        : [...prev.types, type],
    }));
    if (errors.types) setErrors((prev) => ({ ...prev, types: undefined }));
  };

  const validate = () => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim() || form.name.trim().length < 2)
      errs.name = 'Le nom doit comporter au moins 2 caractères';
    if (form.types.length === 0) errs.types = 'Sélectionnez au moins un type';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = 'Adresse email invalide';
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
      const res = await fetch(`/api/v1/companies/${params.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          types: form.types,
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          address: form.address.trim() || undefined,
          city: form.city.trim() || undefined,
          country: form.country.trim() || undefined,
          vatNumber: form.vatNumber.trim() || undefined,
          website: form.website.trim() || undefined,
          notes: form.notes.trim() || undefined,
          isActive: form.isActive,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(Array.isArray(err.message) ? err.message.join(', ') : err.message);
      }
      router.push(`/companies/${params.id}`);
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
        <Link href="/companies" className="hover:text-blue-600 flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Entreprises
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link
          href={`/companies/${params.id}`}
          className="hover:text-blue-600 font-mono text-gray-700"
        >
          {companyCode}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-gray-700">Modifier</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Modifier l'entreprise</h1>
        <p className="text-sm text-gray-500 mt-1 font-mono">{companyCode}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-lg border border-gray-200 bg-white p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
            Informations générales
          </h2>

          <Field label="Nom de l'entreprise *" error={errors.name}>
            <input
              type="text"
              value={form.name}
              onChange={set('name')}
              placeholder="Ex. Coopérative des pêcheurs de Mayotte"
              className={inputCls(!!errors.name)}
            />
          </Field>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type(s) d'entreprise *
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleType(t)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    form.types.includes(t)
                      ? 'border-blue-500 bg-blue-600 text-white'
                      : 'border-gray-300 text-gray-600 hover:border-blue-400'
                  }`}
                >
                  {COMPANY_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            {errors.types && <p className="mt-1 text-xs text-red-600">{errors.types}</p>}
          </div>

          {/* Statut actif/inactif */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, isActive: !p.isActive }))}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.isActive ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${form.isActive ? 'translate-x-4.5' : 'translate-x-0.5'}`}
              />
            </button>
            <span className="text-sm text-gray-700">
              {form.isActive ? 'Entreprise active' : 'Entreprise inactive'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Email" error={errors.email}>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="contact@entreprise.com"
                className={inputCls(!!errors.email)}
              />
            </Field>
            <Field label="Téléphone">
              <input
                type="tel"
                value={form.phone}
                onChange={set('phone')}
                placeholder="+262 269 000 000"
                className={inputCls(false)}
              />
            </Field>
            <Field label="Adresse" wide>
              <input
                type="text"
                value={form.address}
                onChange={set('address')}
                placeholder="Rue, numéro…"
                className={inputCls(false)}
              />
            </Field>
            <Field label="Ville">
              <input
                type="text"
                value={form.city}
                onChange={set('city')}
                placeholder="Mamoudzou"
                className={inputCls(false)}
              />
            </Field>
            <Field label="Pays">
              <input
                type="text"
                value={form.country}
                onChange={set('country')}
                placeholder="FR"
                className={inputCls(false)}
              />
            </Field>
            <Field label="N° TVA / SIRET">
              <input
                type="text"
                value={form.vatNumber}
                onChange={set('vatNumber')}
                placeholder="FR12345678901"
                className={inputCls(false)}
              />
            </Field>
            <Field label="Site web" wide>
              <input
                type="url"
                value={form.website}
                onChange={set('website')}
                placeholder="https://…"
                className={inputCls(false)}
              />
            </Field>
            <Field label="Notes internes" wide>
              <textarea
                value={form.notes}
                onChange={set('notes')}
                rows={3}
                placeholder="Remarques, historique de la relation…"
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
            href={`/companies/${params.id}`}
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
