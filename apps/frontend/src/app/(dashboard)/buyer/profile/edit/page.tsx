'use client';

// BUYER-DASHBOARD-3 — Édition self-service du profil buyer.
//
// Form contrôlé pour les champs identité/contact d'une company dont le
// user est membre. Backend PATCH /companies/mine/:id. Validation client
// minimale + propagation des erreurs backend.

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Building2, Save } from 'lucide-react';
import { useAuth } from '@/contexts/auth.context';
import {
  companiesApi,
  CompanySummary,
  UpdateMyCompanyInput,
} from '@/lib/companies';
import { PageHeader } from '@/components/ui/page-header';

const inputCls =
  'block w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

interface FormState {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  vatNumber: string;
  website: string;
  postalCode: string;
  description: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  country: '',
  vatNumber: '',
  website: '',
  postalCode: '',
  description: '',
};

function fromCompany(c: CompanySummary): FormState {
  return {
    name: c.name ?? '',
    email: c.email ?? '',
    phone: c.phone ?? '',
    address: c.address ?? '',
    city: c.city ?? '',
    country: c.country ?? '',
    vatNumber: c.vatNumber ?? '',
    website: c.website ?? '',
    postalCode: c.postalCode ?? '',
    description: c.description ?? '',
  };
}

function buildPayload(initial: FormState, current: FormState): UpdateMyCompanyInput {
  const out: UpdateMyCompanyInput = {};
  for (const k of Object.keys(current) as (keyof FormState)[]) {
    if (initial[k] !== current[k]) {
      out[k] = current[k] as string;
    }
  }
  return out;
}

export default function BuyerProfileEditPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const requestedId = sp.get('id');
  const { token } = useAuth();
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [initial, setInitial] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setErr(null);
    companiesApi
      .findMine(token)
      .then((list) => {
        setCompanies(list);
        const target =
          (requestedId && list.find((c) => c.id === requestedId)) || list[0] || null;
        if (target) {
          setCompanyId(target.id);
          const f = fromCompany(target);
          setForm(f);
          setInitial(f);
        }
      })
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [token, requestedId]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !companyId) return;
    if (form.name.trim().length < 2) {
      setErr('Le nom de l\'entreprise doit contenir au moins 2 caractères.');
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const payload = buildPayload(initial, form);
      if (Object.keys(payload).length === 0) {
        setSaving(false);
        return;
      }
      const updated = await companiesApi.updateMine(companyId, payload, token);
      const f = fromCompany(updated);
      setForm(f);
      setInitial(f);
      router.push('/buyer/profile');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Échec mise à jour');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Link href="/buyer/profile" className="text-sm text-blue-700">
          ← Retour
        </Link>
        <p className="text-sm text-gray-500">Chargement…</p>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <Link href="/buyer/profile" className="text-sm text-blue-700">
          ← Retour
        </Link>
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-600">
          Aucune entreprise rattachée à votre compte. Contactez l&apos;administrateur.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/buyer/profile"
        className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-800"
      >
        <ArrowLeft className="h-3 w-3" />
        Retour au profil
      </Link>

      <PageHeader
        icon={<Building2 className="h-5 w-5" aria-hidden />}
        title="Modifier mon entreprise"
        subtitle={companies.find((c) => c.id === companyId)?.code ?? ''}
      />

      {/* Sélecteur si plusieurs companies */}
      {companies.length > 1 && (
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Entreprise à modifier
          <select
            value={companyId ?? ''}
            onChange={(e) => {
              const id = e.target.value;
              setCompanyId(id);
              const c = companies.find((x) => x.id === id);
              if (c) {
                const f = fromCompany(c);
                setForm(f);
                setInitial(f);
              }
            }}
            className={inputCls}
            data-testid="company-select"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <form onSubmit={onSave} className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nom de l'entreprise" required>
            <input
              type="text"
              value={form.name}
              onChange={set('name')}
              required
              minLength={2}
              className={inputCls}
              data-testid="field-name"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              className={inputCls}
              data-testid="field-email"
            />
          </Field>
          <Field label="Téléphone">
            <input
              type="text"
              value={form.phone}
              onChange={set('phone')}
              className={inputCls}
              data-testid="field-phone"
            />
          </Field>
          <Field label="N° TVA">
            <input
              type="text"
              value={form.vatNumber}
              onChange={set('vatNumber')}
              className={inputCls}
              data-testid="field-vatNumber"
            />
          </Field>
          <Field label="Adresse" wide>
            <input
              type="text"
              value={form.address}
              onChange={set('address')}
              className={inputCls}
              data-testid="field-address"
            />
          </Field>
          <Field label="Ville">
            <input
              type="text"
              value={form.city}
              onChange={set('city')}
              className={inputCls}
              data-testid="field-city"
            />
          </Field>
          <Field label="Pays">
            <input
              type="text"
              value={form.country}
              onChange={set('country')}
              maxLength={2}
              placeholder="FR, MG, YT…"
              className={inputCls}
              data-testid="field-country"
            />
          </Field>
          <Field label="Site web" wide>
            <input
              type="url"
              value={form.website}
              onChange={set('website')}
              placeholder="https://..."
              className={inputCls}
              data-testid="field-website"
            />
          </Field>
          <Field label="Code postal">
            <input
              type="text"
              value={form.postalCode}
              onChange={set('postalCode')}
              className={inputCls}
              data-testid="field-postalCode"
            />
          </Field>
          <Field label="Pr&eacute;sentation" wide>
            <textarea
              value={form.description}
              onChange={set('description')}
              rows={4}
              placeholder="D&eacute;crivez votre entreprise en quelques lignes..."
              className={inputCls}
              data-testid="field-description"
            />
          </Field>
        </div>

        {err && (
          <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            {err}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Link
            href="/buyer/profile"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={!dirty || saving}
            data-testid="btn-save"
            className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-3 w-3" />
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
  wide,
  required,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
  required?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1 text-xs ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}
