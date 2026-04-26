'use client';

// MP-EDIT-PRODUCT.2 — Création d'un brouillon produit marketplace par le seller.
//
// Formulaire minimaliste : commercialName + slug (auto-généré, éditable) +
// originCountry + productId (UUID Product MCH, saisie manuelle — l'endpoint
// /products n'est pas ouvert au rôle MARKETPLACE_SELLER, picker visuel à
// venir dans un futur lot).
//
// `sellerProfileId` est résolu automatiquement via GET /marketplace/seller-profiles/me.
// Au submit OK : redirection vers la page détail (MP-EDIT-PRODUCT.1) pour
// compléter les autres champs.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, Loader2, Plus } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import {
  marketplaceProductsApi,
  type CreateMarketplaceProductInput,
} from '@/lib/marketplace-products';
import { sellerProfilesApi } from '@/lib/seller-profiles';
import { PageHeader } from '@/components/ui/page-header';

interface FormState {
  commercialName: string;
  slug: string;
  originCountry: string;
  productId: string;
}

const EMPTY: FormState = {
  commercialName: '',
  slug: '',
  originCountry: '',
  productId: '',
};

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// `slugify` extrait dans `./slugify.ts` (Next.js interdit les exports
// nommés non standard sur les modules Page).
import { slugify } from './slugify';

function validateClient(form: FormState): string | null {
  if (form.commercialName.trim().length < 2)
    return 'Le nom commercial doit contenir au moins 2 caractères.';
  if (form.commercialName.length > 255)
    return 'Le nom commercial est limité à 255 caractères.';
  if (!form.slug || !SLUG_REGEX.test(form.slug))
    return 'Le slug doit être en kebab-case ASCII (lettres, chiffres, tirets uniquement).';
  if (form.originCountry.trim().length === 0) return 'Le pays d’origine est requis.';
  if (form.originCountry.length > 100)
    return 'Le code pays est limité à 100 caractères.';
  if (!UUID_REGEX.test(form.productId.trim()))
    return 'L’identifiant Product MCH doit être un UUID valide.';
  return null;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'no-profile'; message: string }
  | { kind: 'ready'; sellerProfileId: string };

export default function SellerMarketplaceProductNewPage() {
  const router = useRouter();

  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [form, setForm] = useState<FormState>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const token = authStorage.getAccessToken() ?? '';
      const me = await sellerProfilesApi.getMine(token);
      setState({ kind: 'ready', sellerProfileId: me.id });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Profil vendeur introuvable';
      setState({ kind: 'no-profile', message });
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Auto-régénération du slug tant que l'utilisateur n'y a pas touché.
  const onChangeName = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      setForm((f) => ({
        ...f,
        commercialName: next,
        slug: slugTouched ? f.slug : slugify(next),
      }));
      setSubmitError(null);
      setValidationError(null);
    },
    [slugTouched],
  );

  const onChangeSlug = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, slug: e.target.value }));
    setSlugTouched(true);
    setSubmitError(null);
    setValidationError(null);
  }, []);

  const set =
    <K extends keyof FormState>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      setSubmitError(null);
      setValidationError(null);
    };

  const isReady = state.kind === 'ready';
  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(EMPTY), [form]);
  const canSubmit = isReady && !submitting && dirty;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isReady) return;
    const clientError = validateClient(form);
    if (clientError) {
      setValidationError(clientError);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    setValidationError(null);
    try {
      const token = authStorage.getAccessToken() ?? '';
      const payload: CreateMarketplaceProductInput = {
        productId: form.productId.trim(),
        sellerProfileId: state.sellerProfileId,
        commercialName: form.commercialName.trim(),
        slug: form.slug.trim(),
        originCountry: form.originCountry.trim(),
      };
      const created = await marketplaceProductsApi.create(payload, token);
      router.push(`/seller/marketplace-products/${created.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        const details = err.details as unknown;
        if (Array.isArray(details) && details.length > 0) {
          setSubmitError(details.map((d) => String(d)).join(' · '));
        } else {
          setSubmitError(err.message);
        }
      } else if (err instanceof Error) {
        setSubmitError(err.message);
      } else {
        setSubmitError('Échec de la création');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (state.kind === 'loading') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement de votre profil…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Nouveau produit marketplace"
        subtitle="Création d'un brouillon — vous compléterez le détail à l'étape suivante"
        actions={
          <Link
            href="/seller/marketplace-products"
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-3 w-3" /> Mes produits
          </Link>
        }
      />

      {state.kind === 'no-profile' && (
        <div
          role="alert"
          data-testid="no-profile-error"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-medium">{state.message}</p>
            <p className="mt-1 text-xs">
              Aucun profil vendeur n’est rattaché à votre compte. Contactez l’équipe IOX
              pour finaliser votre onboarding avant de créer un produit.
            </p>
          </div>
        </div>
      )}

      {isReady && (
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <Section title="Identité minimale">
            <Field label="Nom commercial" required>
              <input
                type="text"
                value={form.commercialName}
                onChange={onChangeName}
                minLength={2}
                maxLength={255}
                required
                className={inputCls}
                data-testid="field-commercialName"
              />
            </Field>
            <Field
              label="Slug (URL publique)"
              required
              hint="Auto-généré depuis le nom commercial, modifiable. Lettres, chiffres et tirets uniquement."
            >
              <input
                type="text"
                value={form.slug}
                onChange={onChangeSlug}
                pattern={SLUG_REGEX.source}
                required
                className={inputCls}
                data-testid="field-slug"
              />
            </Field>
            <Field label="Pays d’origine" required hint="Code ISO recommandé (YT, FR, …)">
              <input
                type="text"
                value={form.originCountry}
                onChange={set('originCountry')}
                maxLength={100}
                required
                className={inputCls}
                data-testid="field-originCountry"
              />
            </Field>
          </Section>

          <Section title="Lien vers le Product IOX (MCH)">
            <Field
              label="Identifiant Product MCH (UUID)"
              required
              hint="UUID du produit MCH côté traçabilité. Un picker visuel sera ajouté ultérieurement — collez l'UUID en attendant."
            >
              <input
                type="text"
                value={form.productId}
                onChange={set('productId')}
                placeholder="00000000-0000-4000-8000-000000000000"
                required
                className={`${inputCls} font-mono`}
                data-testid="field-productId"
              />
            </Field>
          </Section>

          {validationError && (
            <div
              role="alert"
              data-testid="validation-error"
              className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}
          {submitError && (
            <div
              role="alert"
              data-testid="submit-error"
              className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-premium-sm">
            <p className="text-xs text-gray-500">
              Le brouillon sera créé en statut <strong>DRAFT</strong>. Vous pourrez ensuite
              compléter les autres champs et soumettre à la revue qualité.
            </p>
            <button
              type="submit"
              disabled={!canSubmit}
              data-testid="submit-create"
              className="inline-flex items-center gap-2 rounded-md bg-premium-accent px-3 py-1.5 text-xs font-semibold text-white shadow-premium-sm transition-all duration-fast ease-premium hover:bg-premium-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              {submitting ? 'Création…' : 'Créer le brouillon'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

const inputCls =
  'w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-premium-sm focus:border-premium-accent focus:outline-none focus:ring-1 focus:ring-premium-accent/40';

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
