'use client';

// MP-OFFER-EDIT-1 (LOT 2 mandat 14) — Création d'un brouillon d'offre
// marketplace côté seller.
//
// Pattern miroir `seller/marketplace-products/new/page.tsx` (MP-EDIT-PRODUCT.2).
// Form minimaliste : sélection du produit marketplace du seller +
// title + priceMode + (unitPrice/currency conditionnels) + moq +
// availableQuantity. Le `sellerProfileId` est résolu automatiquement
// via `sellerProfilesApi.getMine`. Au submit OK : redirection vers
// `/seller/marketplace-offers/[id]` (page MP-OFFER-VIEW + édition LOT 2).

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { authStorage } from '@/lib/auth';
import {
  marketplaceOffersApi,
  type CreateMarketplaceOfferInput,
  type MarketplacePriceMode,
} from '@/lib/marketplace-offers';
import {
  marketplaceProductsApi,
  type SellerMarketplaceProduct,
} from '@/lib/marketplace-products';
import { sellerProfilesApi } from '@/lib/seller-profiles';
import { PageHeader } from '@/components/ui/page-header';

interface FormState {
  marketplaceProductId: string;
  title: string;
  priceMode: MarketplacePriceMode;
  unitPrice: string; // input contrôlé
  currency: string;
  moq: string;
  availableQuantity: string;
}

const EMPTY: FormState = {
  marketplaceProductId: '',
  title: '',
  priceMode: 'FIXED',
  unitPrice: '',
  currency: 'EUR',
  moq: '',
  availableQuantity: '',
};

function validateClient(form: FormState): string | null {
  if (!form.marketplaceProductId) return 'Sélectionnez un produit marketplace.';
  if (form.title.trim().length < 2)
    return 'Le titre de l’offre doit contenir au moins 2 caractères.';
  if (form.title.length > 255)
    return 'Le titre est limité à 255 caractères.';
  if (form.priceMode !== 'QUOTE_ONLY' && form.unitPrice) {
    const n = Number(form.unitPrice);
    if (Number.isNaN(n) || n < 0) return 'Le prix unitaire doit être un nombre positif.';
  }
  if (form.moq) {
    const n = Number(form.moq);
    if (Number.isNaN(n) || n < 0) return 'Le MOQ doit être un nombre positif.';
  }
  if (form.availableQuantity) {
    const n = Number(form.availableQuantity);
    if (Number.isNaN(n) || n < 0)
      return 'La quantité disponible doit être un nombre positif.';
  }
  return null;
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'no-profile'; message: string }
  | {
      kind: 'ready';
      sellerProfileId: string;
      products: Pick<SellerMarketplaceProduct, 'id' | 'commercialName' | 'slug'>[];
    };

export default function SellerMarketplaceOfferNewPage() {
  const router = useRouter();

  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const loadInitial = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const token = authStorage.getAccessToken() ?? '';
      const me = await sellerProfilesApi.getMine(token);
      const productsRes = await marketplaceProductsApi.listMine(token, {
        page: 1,
        limit: 100,
      });
      setState({
        kind: 'ready',
        sellerProfileId: me.id,
        products: productsRes.data.map((p) => ({
          id: p.id,
          commercialName: p.commercialName,
          slug: p.slug,
        })),
      });
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
    loadInitial();
  }, [loadInitial]);

  const set =
    <K extends keyof FormState>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
      const payload: CreateMarketplaceOfferInput = {
        marketplaceProductId: form.marketplaceProductId,
        sellerProfileId: state.sellerProfileId,
        title: form.title.trim(),
        priceMode: form.priceMode,
      };
      if (form.priceMode !== 'QUOTE_ONLY' && form.unitPrice) {
        payload.unitPrice = Number(form.unitPrice);
      }
      if (form.currency) payload.currency = form.currency.trim().toUpperCase();
      if (form.moq) payload.moq = Number(form.moq);
      if (form.availableQuantity) payload.availableQuantity = Number(form.availableQuantity);
      const created = await marketplaceOffersApi.create(payload, token);
      router.push(`/seller/marketplace-offers/${created.id}`);
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
        title="Nouvelle offre marketplace"
        subtitle="Création d'un brouillon — vous compléterez le détail à l'étape suivante"
        actions={
          <Link
            href="/seller/marketplace-offers"
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-3 w-3" /> Mes offres
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
              pour finaliser votre onboarding avant de créer une offre.
            </p>
          </div>
        </div>
      )}

      {isReady && (
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <Section title="Identité">
            <Field label="Produit marketplace" required>
              <select
                value={form.marketplaceProductId}
                onChange={set('marketplaceProductId')}
                required
                className={selectCls}
                data-testid="field-marketplaceProductId"
              >
                <option value="">— sélectionner —</option>
                {state.products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.commercialName} ({p.slug})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Titre de l’offre" required>
              <input
                type="text"
                value={form.title}
                onChange={set('title')}
                minLength={2}
                maxLength={255}
                required
                className={inputCls}
                data-testid="field-title"
              />
            </Field>
          </Section>

          <Section title="Prix">
            <Field label="Mode tarifaire" required>
              <select
                value={form.priceMode}
                onChange={set('priceMode')}
                required
                className={selectCls}
                data-testid="field-priceMode"
              >
                <option value="FIXED">Prix fixe</option>
                <option value="FROM_PRICE">À partir de</option>
                <option value="QUOTE_ONLY">Sur devis uniquement</option>
              </select>
            </Field>

            {form.priceMode !== 'QUOTE_ONLY' && (
              <Field label="Prix unitaire (optionnel à la création)">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.unitPrice}
                  onChange={set('unitPrice')}
                  className={inputCls}
                  data-testid="field-unitPrice"
                />
              </Field>
            )}

            <Field label="Devise">
              <input
                type="text"
                value={form.currency}
                onChange={set('currency')}
                maxLength={4}
                className={`${inputCls} uppercase`}
                data-testid="field-currency"
              />
            </Field>

            <Field label="MOQ (optionnel)">
              <input
                type="number"
                step="0.001"
                min="0"
                value={form.moq}
                onChange={set('moq')}
                className={inputCls}
                data-testid="field-moq"
              />
            </Field>

            <Field label="Quantité disponible (optionnel)">
              <input
                type="number"
                step="0.001"
                min="0"
                value={form.availableQuantity}
                onChange={set('availableQuantity')}
                className={inputCls}
                data-testid="field-availableQuantity"
              />
            </Field>
          </Section>

          {validationError && (
            <div
              role="alert"
              data-testid="validation-error"
              className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
            >
              <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0" />
              <p>{validationError}</p>
            </div>
          )}

          {submitError && (
            <div
              role="alert"
              data-testid="submit-error"
              className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-900"
            >
              <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0" />
              <p>{submitError}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <Link
              href="/seller/marketplace-offers"
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </Link>
            <button
              type="submit"
              disabled={!canSubmit}
              data-testid="submit-create-offer"
              className="inline-flex items-center gap-1 rounded-md bg-premium-accent px-3 py-1.5 text-xs font-semibold text-white shadow-premium-sm transition hover:bg-premium-primary disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" /> Création…
                </>
              ) : (
                'Créer le brouillon'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

const inputCls =
  'block w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-premium-accent focus:outline-none focus:ring-1 focus:ring-premium-accent';
const selectCls = inputCls;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-premium-sm">
      <h2 className="mb-3 text-sm font-semibold text-gray-900">{title}</h2>
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
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-gray-400">{hint}</span> : null}
    </label>
  );
}
