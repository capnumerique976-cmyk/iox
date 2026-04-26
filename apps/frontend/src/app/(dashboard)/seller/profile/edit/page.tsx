'use client';

// FP-3 — Auto-édition du profil vendeur par le seller connecté.
//
// Charge GET /marketplace/seller-profiles/me et soumet PATCH /me. Le DTO
// backend bloque déjà les champs interdits (slug, legalName, status,
// isFeatured) via le ValidationPipe whitelist+forbidNonWhitelisted, donc
// on n'expose que les champs auto-éditables ici.
//
// Choix conservateurs documentés :
//  - Avatar (logo) et bannière (cover) sont en lecture seule : pas
//    d'uploader dans ce lot, l'IDs MediaAsset s'affiche pour info, le
//    téléversement passe par les écrans existants /seller/documents.
//  - `slug` et `legalName` ne sont pas modifiables ici (réservés staff).
//  - Modifier un champ vitrine sur un profil APPROVED le repasse en
//    PENDING_REVIEW côté backend → l'UI prévient l'utilisateur.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, CheckCircle2, Loader2, Save, Info } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import {
  sellerProfilesApi,
  type MySellerProfile,
  type UpdateMySellerProfileInput,
} from '@/lib/seller-profiles';
import { PageHeader } from '@/components/ui/page-header';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string; status?: number }
  | { kind: 'ready'; profile: MySellerProfile };

interface FormState {
  publicDisplayName: string;
  country: string;
  region: string;
  cityOrZone: string;
  descriptionShort: string;
  descriptionLong: string;
  story: string;
  languagesCsv: string;
  salesEmail: string;
  salesPhone: string;
  website: string;
  supportedIncotermsCsv: string;
  destinationsServedCsv: string;
  averageLeadTimeDays: string; // string pour input contrôlé
}

const EMPTY: FormState = {
  publicDisplayName: '',
  country: '',
  region: '',
  cityOrZone: '',
  descriptionShort: '',
  descriptionLong: '',
  story: '',
  languagesCsv: '',
  salesEmail: '',
  salesPhone: '',
  website: '',
  supportedIncotermsCsv: '',
  destinationsServedCsv: '',
  averageLeadTimeDays: '',
};

function csvToArr(csv: string): string[] {
  return csv
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function arrToCsv(arr: string[] | null | undefined): string {
  return arr && arr.length > 0 ? arr.join(', ') : '';
}

function fromProfile(p: MySellerProfile): FormState {
  return {
    publicDisplayName: p.publicDisplayName ?? '',
    country: p.country ?? '',
    region: p.region ?? '',
    cityOrZone: p.cityOrZone ?? '',
    descriptionShort: p.descriptionShort ?? '',
    descriptionLong: p.descriptionLong ?? '',
    story: p.story ?? '',
    languagesCsv: arrToCsv(p.languages),
    salesEmail: p.salesEmail ?? '',
    salesPhone: p.salesPhone ?? '',
    website: p.website ?? '',
    supportedIncotermsCsv: arrToCsv(p.supportedIncoterms),
    destinationsServedCsv: arrToCsv(p.destinationsServed),
    averageLeadTimeDays:
      p.averageLeadTimeDays != null && Number.isFinite(p.averageLeadTimeDays)
        ? String(p.averageLeadTimeDays)
        : '',
  };
}

/**
 * Construit le payload PATCH en n'envoyant QUE les champs modifiés.
 * Les champs vidés sont envoyés en `''` ou `[]` — le backend acceptera
 * la valeur (champs nullable côté Prisma). On évite d'envoyer `null`
 * pour ne pas heurter la whitelist class-validator.
 */
function buildPayload(initial: FormState, current: FormState): UpdateMySellerProfileInput {
  const out: UpdateMySellerProfileInput = {};
  if (current.publicDisplayName !== initial.publicDisplayName)
    out.publicDisplayName = current.publicDisplayName.trim();
  if (current.country !== initial.country) out.country = current.country.trim();
  if (current.region !== initial.region) out.region = current.region.trim();
  if (current.cityOrZone !== initial.cityOrZone) out.cityOrZone = current.cityOrZone.trim();
  if (current.descriptionShort !== initial.descriptionShort)
    out.descriptionShort = current.descriptionShort;
  if (current.descriptionLong !== initial.descriptionLong)
    out.descriptionLong = current.descriptionLong;
  if (current.story !== initial.story) out.story = current.story;
  if (current.languagesCsv !== initial.languagesCsv)
    out.languages = csvToArr(current.languagesCsv);
  if (current.salesEmail !== initial.salesEmail) out.salesEmail = current.salesEmail.trim();
  if (current.salesPhone !== initial.salesPhone) out.salesPhone = current.salesPhone.trim();
  if (current.website !== initial.website) out.website = current.website.trim();
  if (current.supportedIncotermsCsv !== initial.supportedIncotermsCsv)
    out.supportedIncoterms = csvToArr(current.supportedIncotermsCsv);
  if (current.destinationsServedCsv !== initial.destinationsServedCsv)
    out.destinationsServed = csvToArr(current.destinationsServedCsv);
  if (current.averageLeadTimeDays !== initial.averageLeadTimeDays) {
    const n = Number.parseInt(current.averageLeadTimeDays, 10);
    if (Number.isFinite(n) && n >= 0) out.averageLeadTimeDays = n;
  }
  return out;
}

/** Validation client minimale, miroir des règles backend. */
function validateClient(form: FormState): string | null {
  if (form.publicDisplayName.trim().length < 2 || form.publicDisplayName.length > 80) {
    return 'Le nom public doit contenir entre 2 et 80 caractères.';
  }
  if (form.descriptionShort.length > 280) return 'La description courte est limitée à 280 caractères.';
  if (form.descriptionLong.length > 2000) return 'La description longue est limitée à 2000 caractères.';
  if (form.story.length > 4000) return 'L’histoire est limitée à 4000 caractères.';
  if (form.salesPhone.length > 30) return 'Le téléphone est limité à 30 caractères.';
  if (form.salesEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.salesEmail)) {
    return 'Email commercial invalide.';
  }
  if (form.website && !/^https?:\/\//i.test(form.website)) {
    return 'L’URL du site doit commencer par http:// ou https://.';
  }
  if (form.averageLeadTimeDays && Number.parseInt(form.averageLeadTimeDays, 10) < 0) {
    return 'Le délai moyen ne peut pas être négatif.';
  }
  return null;
}

export default function SellerProfileEditPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [initial, setInitial] = useState<FormState>(EMPTY);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    setSubmitError(null);
    setSuccess(false);
    try {
      const token = authStorage.getAccessToken() ?? '';
      const profile = await sellerProfilesApi.getMine(token);
      const next = fromProfile(profile);
      setInitial(next);
      setForm(next);
      setState({ kind: 'ready', profile });
    } catch (err) {
      const status = err instanceof ApiError ? err.status : undefined;
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Profil indisponible';
      setState({ kind: 'error', message, status });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = useMemo(() => {
    return JSON.stringify(initial) !== JSON.stringify(form);
  }, [initial, form]);

  const set =
    <K extends keyof FormState>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      setSuccess(false);
      setSubmitError(null);
    };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dirty) return;
    const clientError = validateClient(form);
    if (clientError) {
      setSubmitError(clientError);
      return;
    }
    const payload = buildPayload(initial, form);
    if (Object.keys(payload).length === 0) return;
    setSaving(true);
    setSubmitError(null);
    setSuccess(false);
    try {
      const token = authStorage.getAccessToken() ?? '';
      const updated = await sellerProfilesApi.updateMine(payload, token);
      const next = fromProfile(updated);
      setInitial(next);
      setForm(next);
      setState({ kind: 'ready', profile: updated });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3500);
    } catch (err) {
      if (err instanceof ApiError) {
        // Le backend renvoie soit un message string, soit un tableau (class-validator).
        const details = err.details as unknown;
        if (Array.isArray(details) && details.length > 0) {
          setSubmitError(details.map((d) => String(d)).join(' · '));
        } else {
          setSubmitError(err.message);
        }
      } else if (err instanceof Error) {
        setSubmitError(err.message);
      } else {
        setSubmitError('Échec de la mise à jour');
      }
    } finally {
      setSaving(false);
    }
  }

  if (state.kind === 'loading') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement de votre profil…
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="space-y-3">
        <PageHeader title="Édition de mon profil vendeur" />
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-medium">{state.message}</p>
            {state.status === 404 && (
              <p className="mt-1 text-xs">
                Aucun profil vendeur n’est rattaché à votre compte. Contactez l’équipe IOX pour
                finaliser votre onboarding.
              </p>
            )}
            {state.status === 409 && (
              <p className="mt-1 text-xs">
                Plusieurs profils vendeurs sont rattachés à votre compte. Utilisez la console
                administrative pour les éditer individuellement.
              </p>
            )}
          </div>
        </div>
        <Link
          href="/seller/dashboard"
          className="inline-flex items-center gap-1 text-xs text-gray-600 hover:underline"
        >
          <ArrowLeft className="h-3 w-3" /> Retour au cockpit vendeur
        </Link>
      </div>
    );
  }

  const profile = state.profile;
  const isApproved = profile.status === 'APPROVED';

  return (
    <div className="space-y-5">
      <PageHeader
        title="Édition de mon profil vendeur"
        subtitle={`Statut actuel : ${profile.status}`}
        actions={
          <Link
            href="/seller/dashboard"
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-3 w-3" /> Cockpit vendeur
          </Link>
        }
      />

      {isApproved && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>
            Votre profil est actuellement <strong>approuvé et publié</strong>. Modifier le nom
            public, les descriptions, l’histoire ou le logo/bannière repassera votre fiche en
            <strong> revue qualité</strong> avant nouvelle publication.
          </p>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <Section title="Identité publique">
          <Field label="Nom public" required>
            <input
              type="text"
              value={form.publicDisplayName}
              onChange={set('publicDisplayName')}
              minLength={2}
              maxLength={80}
              required
              className={inputCls}
              data-testid="field-publicDisplayName"
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Pays (ISO 2 lettres)">
              <input
                type="text"
                value={form.country}
                onChange={set('country')}
                maxLength={80}
                className={inputCls}
              />
            </Field>
            <Field label="Région">
              <input
                type="text"
                value={form.region}
                onChange={set('region')}
                maxLength={80}
                className={inputCls}
              />
            </Field>
            <Field label="Ville / zone">
              <input
                type="text"
                value={form.cityOrZone}
                onChange={set('cityOrZone')}
                maxLength={120}
                className={inputCls}
              />
            </Field>
          </div>
        </Section>

        <Section title="Récit & descriptions">
          <Field
            label="Description courte"
            hint={`${form.descriptionShort.length} / 280`}
          >
            <textarea
              value={form.descriptionShort}
              onChange={set('descriptionShort')}
              maxLength={280}
              rows={2}
              className={textareaCls}
            />
          </Field>
          <Field label="Description détaillée" hint={`${form.descriptionLong.length} / 2000`}>
            <textarea
              value={form.descriptionLong}
              onChange={set('descriptionLong')}
              maxLength={2000}
              rows={5}
              className={textareaCls}
            />
          </Field>
          <Field label="Histoire / story" hint={`${form.story.length} / 4000`}>
            <textarea
              value={form.story}
              onChange={set('story')}
              maxLength={4000}
              rows={6}
              className={textareaCls}
            />
          </Field>
        </Section>

        <Section title="Contact commercial">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Email commercial">
              <input
                type="email"
                value={form.salesEmail}
                onChange={set('salesEmail')}
                maxLength={160}
                className={inputCls}
              />
            </Field>
            <Field label="Téléphone">
              <input
                type="text"
                value={form.salesPhone}
                onChange={set('salesPhone')}
                maxLength={30}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Site web (https)">
            <input
              type="url"
              value={form.website}
              onChange={set('website')}
              maxLength={255}
              placeholder="https://…"
              className={inputCls}
            />
          </Field>
        </Section>

        <Section title="Capacités export">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field
              label="Langues parlées"
              hint="Codes courts séparés par des virgules (FR, EN, AR…)"
            >
              <input
                type="text"
                value={form.languagesCsv}
                onChange={set('languagesCsv')}
                className={inputCls}
              />
            </Field>
            <Field
              label="Délai moyen (jours)"
              hint="Entier ≥ 0"
            >
              <input
                type="number"
                min={0}
                value={form.averageLeadTimeDays}
                onChange={set('averageLeadTimeDays')}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Incoterms supportés" hint="Ex : FOB, CIF, EXW">
              <input
                type="text"
                value={form.supportedIncotermsCsv}
                onChange={set('supportedIncotermsCsv')}
                className={inputCls}
              />
            </Field>
            <Field label="Destinations servies" hint="Codes pays ISO (FR, DE, RE…)">
              <input
                type="text"
                value={form.destinationsServedCsv}
                onChange={set('destinationsServedCsv')}
                className={inputCls}
              />
            </Field>
          </div>
        </Section>

        <Section title="Médias (lecture seule pour l’instant)">
          <p className="text-xs text-gray-500">
            Le téléversement d’un nouveau logo ou d’une nouvelle bannière n’est pas encore
            disponible depuis cet écran. Utilisez la section <em>Documents marketplace</em> pour
            uploader les fichiers, puis revenez ici si nécessaire.
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Logo (MediaAsset ID)">
              <input
                type="text"
                value={profile.logoMediaId ?? ''}
                readOnly
                disabled
                className={`${inputCls} bg-gray-50 text-gray-500`}
              />
            </Field>
            <Field label="Bannière (MediaAsset ID)">
              <input
                type="text"
                value={profile.bannerMediaId ?? ''}
                readOnly
                disabled
                className={`${inputCls} bg-gray-50 text-gray-500`}
              />
            </Field>
          </div>
        </Section>

        {submitError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{submitError}</span>
          </div>
        )}
        {success && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"
          >
            <CheckCircle2 className="h-4 w-4" /> Profil mis à jour avec succès.
          </div>
        )}

        <div className="sticky bottom-2 flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white/95 p-3 shadow-premium-sm backdrop-blur">
          <p className="text-xs text-gray-500">
            {dirty ? 'Modifications non enregistrées.' : 'Aucune modification.'}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setForm(initial);
                setSubmitError(null);
                setSuccess(false);
              }}
              disabled={!dirty || saving}
              className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Réinitialiser
            </button>
            <button
              type="submit"
              disabled={!dirty || saving}
              data-testid="submit-update-mine"
              className="inline-flex items-center gap-2 rounded-md bg-premium-accent px-3 py-1.5 text-xs font-semibold text-white shadow-premium-sm transition-all duration-fast ease-premium hover:bg-premium-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

/* ─── UI helpers ──────────────────────────────────────────────────────────── */

const inputCls =
  'w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-premium-sm focus:border-premium-accent focus:outline-none focus:ring-1 focus:ring-premium-accent/40';
const textareaCls = `${inputCls} font-normal leading-relaxed`;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-gray-200/70 bg-white p-4 shadow-premium-sm">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-gray-400">{hint}</span>}
    </label>
  );
}
